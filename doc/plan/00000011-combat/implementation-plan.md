# Implementation Plan — 00000011 Combat

This plan turns [`story.md`](./story.md) into an ordered sequence of steps. Each
step is implemented, verified and committed on its own, by an agent that has
read only `story.md`, this plan, and its own step. Everything a step needs is
stated here — including the reasoning behind every decision, because the code
does not carry design history (CONTRIBUTING.md, "Comments").

## What this story builds

Ships fight. An **attack** becomes the second kind of action (§5), a fight is
decided by shield count (§7), the winner burns shields, and the loser is
returned to a bay at 0 shields under §7.1's rotating **return position** — which
finally fills **step 6** of the end-of-turn sequence, left as a documented empty
slot by story 00000009.

Three consequences ripple outwards:

- The **§5 pass guard** stops being move-only: a side with no legal move but a
  legal attack does not pass.
- **"Already moved" stops meaning "spent".** A ship that has moved may still
  attack, so it must stay selectable and must stop being drawn as finished.
- The **board** grows two new cue families: an attack target (with the fight's
  predicted outcome in its accessible name), and the return position and its
  live receptacle in the bays.

**One rules edit** (Step 1) lands first, in its own commit: version **0.6**,
closing Appendix A item 1 (starting shields are 0) and extending §7.1's "there
is always somewhere to go" paragraph to the mutual return. Neither change alters
how the game is played.

Nothing scores. §8.4 influence stays out and §8.7's step 2 remains an empty
slot; §9's hundred rounds, game records, undo and any engine all stay out. See
`story.md`'s "Out of scope".

## Sources of truth

- **The rules.** [`doc/ruleset/rules.md`](../../ruleset/rules.md), at **version
  0.5** when this plan was written and **0.6** from Step 1 onwards. The sections
  implemented here are **§3.1** (a ship in a bay cannot attack and cannot be
  attacked), **§4.1** (the shield arithmetic), **§5** (an action is a move or an
  attack; the move cap; the pass), **§7** (combat), **§7.1** (returning to a
  bay), and **§8.7 step 6** (the return position's drift). Where the app and the
  document disagree, the document is right.
- **This story changes the rules exactly once** — Step 1. No other step may
  touch `doc/ruleset/rules.md`, `doc/ruleset/changelog.md` or `RULES_VERSION`.
  If a later step turns up what looks like another rules ambiguity, **stop and
  raise it with the owner**; do not settle it in code.
- **No rules tag.** Tagging is on hold until the game plays (CLAUDE.md), and
  neither 0.6 change affects play in any case. Bump the version and write the
  changelog entry; do not run `/tag-rules`.
- **The conventions.** [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) — in
  particular:
  - the **DOM test recipe**: `// @vitest-environment jsdom` as the file's first
    line, a per-file `import "@testing-library/jest-dom/vitest";`, `cleanup` in
    an `afterEach`, and axe run with the `color-contrast` rule disabled (jsdom
    has no layout or canvas);
  - **keep logic out of components** — every rule, every derived predicate and
    every piece of player-facing wording belongs in a plain module with plain
    unit tests;
  - **`Math.random` is banned by lint**; nothing in this story is random anyway;
  - **comment style**: a short module header saying what the module is for, and
    inline comments only where the code is not self-evident. **No story numbers,
    no plan-step references, no design history in code** — a peer review treats
    that as a finding when it leaks into `src/`.
- **The vocabulary** (CLAUDE.md). Code, tests and this plan say **ply** and
  **hub/site**; player-facing text — accessible names, live-region sentences,
  `README.md` — says **turn** and **node**. **Move** means one ship changing
  squares and never means a ply; this story is the first in which "action" is
  genuinely wider than "move", and the two must never be conflated.

## What is already in place

- `src/rules/board.ts` — `Square` (`{ column, row }`), `squareAt`, `squareName`,
  `squareFromName`, `isOnBoard`, `COLUMN_LETTERS`, `BOARD_SIZE` (15).
- `src/rules/bays.ts` — `BAYS`, the fourteen bay squares **in the order §3.1's
  table lists them** (top, right, bottom, left), and `isBay(square)`. That order
  is _not_ §7.1's clockwise ring; Step 2 adds the ring.
- `src/rules/fleet.ts` — `Side`, `ShipId`, `FleetEntry`, and `STARTING_FLEET`:
  the fourteen ships in §4's **clockwise** listing from H15, all on 0 shields.
- `src/rules/shields.ts` — `ShieldCount` (0–4), `MIN_SHIELDS`, `MAX_SHIELDS`,
  `isShieldCount`.
- `src/rules/gameState.ts` — `Ship` (`id`, `side`, `square`, `shields`),
  `SiteStatus` (`state`, `enteredOnPly`), `GameState` (`ships`, `siteStates`,
  `sideToMove`, `actionsRemaining`, `movedThisPly`, `plyNumber`, `randomSeed`),
  `ACTIONS_PER_PLY` (2), `startingGameState(seed)`, `shipsBySquare(state)`,
  `siteStateAt`, `siteStatusAt`. **There is no return position.**
- `src/rules/moveLegality.ts` — §6 alone: `reachFrom(origin, shields)`,
  `MoveRefusalReason`, `findShip`, `sixOnlyMoveRefusalReason`,
  `sixOnlyLegalDestinations`. Deliberately unaware of §8.5, so `stranded.ts` can
  use it without circularity.
- `src/rules/movement.ts` — the public §6 API layered with §8.5:
  `moveRefusalReason`, `legalDestinations`, `sideToMoveHasLegalMove` (the §5
  pass guard's predicate, move-only and §6-only).
- `src/rules/stranded.ts` — §8.5: `strandedShipIds(state)` (side to move, not
  yet moved, on a dormant or depleted site, **and with a legal §6 move** — the
  waiver), `strandedObligationBinds(state)`.
- `src/rules/nodes.ts` — §8.2 `wakeTouchedSites`, §8.6 `drawReplacements`,
  `SiteChargedEffect`, `SiteWokenEffect`, `SiteCooledEffect`.
- `src/rules/endOfTurn.ts` — §8.7's six steps in order, `EndOfTurnEffect`.
  **Steps 2 (influence) and 6 (return position) are documented empty slots.**
- `src/rules/ply.ts` — `applyMove(state, shipId, destination)` returning
  `{ outcome: "applied", state, effects }` or `{ outcome: "refused", reason }`;
  `applyPassGuard(state)`; `MoveEffect` (`shields-reset`, `SiteChargedEffect`,
  `PlyEndedEffect`, `PassEffect`); `otherSide`. Applying a move is the only
  thing in the app that has ever spent an action.
- `src/game/session.ts` — `Session` (`state`, `selectedShipId`, `lastEvent`),
  `SessionIntent` (`activate` / `dismiss`), `SessionEvent` (`selected`,
  `selection-cleared`, `moved`, `PassEffect`, `rejected`), `RejectionReason`
  (`MoveRefusalReason | "nothing-to-select"`), `createSession`,
  `sessionReducer`.
- `src/board/announcements.ts` — `announcementFor(event)` and
  `turnIndicatorText(state)`. **All** player-facing wording lives here.
- `src/board/squareLabel.ts` — `squareLabel(descriptor)` building a
  comma-separated accessible name; `SquareMark` (`"selected" | "destination"`),
  one exclusive slot; `ShipCondition` (`"already-moved" | "no-action" |
"owes-action"`), one exclusive slot.
- `src/board/BoardSquare.tsx` / `.css` — the stacked square contents: site
  marker, ship icon, the destination disc / selected brackets, and the three
  condition marks (solid bar, hollow bar, chevron) at the square's **bottom**
  edge. `already-moved` and `no-action` both dampen the ship to
  `--dampened-opacity` (0.45); `owes-action` blinks between full and dampened,
  with the blink switched off under `prefers-reduced-motion`.
- `src/board/Board.tsx` — builds 225 cell descriptors from the session on every
  change, deriving each ship's condition and each square's mark.
- `src/board/grid/AccessibleGrid.tsx` — the ARIA grid, roving tabindex, arrow
  navigation, Enter/Space activation, Escape dismissal, and the live region.
  **Every board cell is `focusable: true` unconditionally.**
- Tests live beside the code they cover; pure rules tests run in the default
  `node` environment.

## Where the code goes

| Path                         | Change                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `doc/ruleset/rules.md`       | Appendix A closed, §4's TBD gone, §7.1's bay-availability paragraph; version → 0.6   |
| `doc/ruleset/changelog.md`   | the 0.6 entry (Step 1 only)                                                          |
| `src/rules/rulesVersion.ts`  | `RULES_VERSION` → `"0.6"` (Step 1 only)                                              |
| `src/rules/bays.ts`          | `CLOCKWISE_BAYS`, the start index, and the pure return-position arithmetic           |
| `src/rules/gameState.ts`     | `returnPositionIndex` on `GameState`, set in `startingGameState`                     |
| `src/rules/endOfTurn.ts`     | step 6 filled in: the return position drifts one bay counter-clockwise               |
| `src/rules/combat.ts`        | **new** — §7 and §7.1: adjacency, refusals, targets, the fight's arithmetic, the bay |
| `src/rules/ply.ts`           | the shared end-of-action tail, then `applyAttack`                                    |
| `src/rules/actions.ts`       | **new** — §5's "an action is a move or an attack": the two action-level predicates   |
| `src/game/session.ts`        | the attack gesture, widened selectability, the new event and rejection reasons       |
| `src/board/announcements.ts` | a sentence for each fight outcome and each new refusal; the selection counts         |
| `src/board/squareLabel.ts`   | `hasMoved` split out of `ShipCondition`; the target mark, its outcome, the bay cues  |
| `src/board/BoardSquare.tsx`  | the target ring, the corner triangles, the re-placed already-moved bar               |
| `src/board/BoardSquare.css`  | the new marks' styling; dampening driven by `no-action` alone                        |
| `src/board/Board.tsx`        | targets, the predicted outcome, the two bay cues, and the reshaped condition         |
| `src/game/reviewFixture.ts`  | **new and temporary** — the position the manual gates are taken from (Steps 13, 17)  |
| `README.md`                  | the status paragraph and the "one detail left open" sentence (Step 19)               |

## Decisions taken at plan time

`story.md` closes with seven open items and leaves several shapes to be settled
here. All of them are decided below, with the reasoning and the rejected
alternatives, because nothing else in the repository will record them.

### 1. The rules edit comes first, and it is the only one

Two changes, neither of which alters how the game is played:

- **Appendix A item 1 is closed by the owner's decision: every ship starts with
  0 shields.** The number in §4 is already 0; only the "(TBD)" marking, the
  appendix's table and item, and the introduction's sentence about undecided
  details go. **The Appendix A heading stays**, carrying one line saying nothing
  is currently outstanding. Deleting the appendix outright would renumber
  Appendix B and break its cross-reference in §8.7 and in every planning
  document that cites it — and the rules are expected to change often, so the
  appendix will fill again.
- **§7.1's "there is always somewhere to go" paragraph is extended to the mutual
  return.** Today it argues one empty bay for one returning ship. The case
  immediately above it in the document is two ships returning from one fight, so
  the paragraph should carry the same argument for two: both were by definition
  off-bay, so at most twelve of the fourteen bays are occupied.

Rejected: folding either into a later code step. CLAUDE.md requires a rules
change to be its own commit with a changelog entry and a matching
`RULES_VERSION`, ahead of the code that depends on it, and the plan guide says
the same.

### 2. Two bay orderings, one asserted against the other

`BAYS` stays exactly as it is: §3.1's table order (top, right, bottom, left),
which `isBay` and the board's bay drawing depend on. Step 2 adds
**`CLOCKWISE_BAYS`**, the §7.1 ring: H15, L15, O14, O10, O6, O2, L1, H1, D1, A2,
A6, A10, A14, D15 — the same order §4 lists the starting fleet in.

A test asserts `CLOCKWISE_BAYS` equals `STARTING_FLEET.map((entry) =>
entry.square)` square for square, and that it is a permutation of `BAYS`, so
neither ordering can be quietly edited into disagreement. The test imports both
modules; **`bays.ts` itself must not import `fleet.ts`** — the ring is board
geometry, not fleet data, and the dependency belongs only in the test.

Rejected: re-ordering `BAYS` into the ring and deriving §3.1's table order from
it. §3.1's order is what the document prints, and the existing bay tests read
against it; two named constants are clearer than one constant and a sort.

### 3. The return position is an index in the state; the receptacle is derived

`GameState` gains **`returnPositionIndex`**: an index into `CLOCKWISE_BAYS`,
starting at H15's index (0). Return position 1 is `CLOCKWISE_BAYS[index]`;
positions 2, 3, 4 … are the following entries, wrapping — clockwise, as §7.1
says. The end-of-turn drift is therefore `(index - 1 + 14) % 14`: **one bay
counter-clockwise** is one step _backwards_ along a clockwise ring.

Which bay a beaten ship actually lands in — **the receptacle** — is never
stored. It is the first _empty_ bay counting from position 1, recomputed from
current occupancy at the point of use, because occupancy changes **inside** a
ply: a ship moving out of a bay as the first action changes the answer for the
second. Storing it would be a cached derivation that goes stale mid-ply, which
is exactly the case the owner called out.

Rejected: storing the position-1 _square_ rather than an index (the drift stops
being arithmetic and becomes a lookup), and storing the receptacle (stale).

### 4. §7 gets one module, `combat.ts`, with the §8.5 split inside it

`src/rules/combat.ts` is the **only** implementation of §7 and §7.1 in the app,
for the reason `movement.ts` is the only implementation of §6: a future engine
must find one answer to "what are the legal actions", not two.

It mirrors the existing §6 split, but inside a single file rather than across
two, because §7 is small and there is no circularity forcing a split:

- a **§7-only layer** — refusals and targets judged by §7 and §3.1 alone, with
  no awareness of §8.5's obligation (`sevenOnlyAttackRefusalReason`,
  `sevenOnlyLegalTargets`);
- the **public layer** — `attackRefusalReason` and `legalTargets`, which apply
  §8.5 on top.

The §7-only layer exists for the same reason `moveLegality.ts` does: the §5 pass
guard must be able to ask "is any action legal here" without §8.5's answer
depending on the question (decision 11).

### 5. Attack range is a written-out table of eight neighbours

`combat.ts` holds the eight offsets as a literal, filtered to the board. It must
**not** be derived from `reachFrom`: §7's second paragraph exists precisely to
deny any link between attack range and §6's movement table — a 4-shield ship
strikes all eight neighbours while it can only step one square orthogonally.
Deriving one from the other would silently couple them, and the coupling would
survive every test that only ever checked a 0-shield ship.

### 6. §8.5's obligation refuses **every** attack, including the stranded ship's own

While any ship owes an action, each action in turn must free one, and an attack
never frees anything. So `attackRefusalReason` returns `"another-ship-stranded"`
whenever `strandedShipIds(state)` is non-empty — **unconditionally**, unlike
`moveRefusalReason`, which excuses the owed ships themselves
(`!owed.includes(shipId)`). This asymmetry is deliberate and is the single
easiest thing in this story to implement wrongly: a stranded ship's own attack
is refused too, because attacking would not free it.

The reason string is reused rather than invented, exactly as `story.md` asks, so
the player hears the same sentence whichever action they tried.

§8.5's waiver is untouched: `strandedShipIds` stays **move**-only, so a stranded
ship with no legal move is still excused even if it has a legal target. Only a
move frees a ship, so only a move can make the obligation binding.

### 7. `attackRefusalReason` takes a square, and is total

`attackRefusalReason(state, attackerShipId, targetSquare)` mirrors
`moveRefusalReason(state, shipId, destination)` — square in, structured reason
or `undefined` out — and `legalTargets(state, shipId)` returns **squares**,
mirroring `legalDestinations`. The board and the session speak in squares; being
able to ask the rules layer about a square is the shape the whole UI is built
on.

The cost is that the function must answer for an **empty** square, so
`AttackRefusalReason` carries `"no-target-there"` even though the session never
produces it (activating an empty square is a move attempt, never a failed
attack — `story.md` item 7). The same is true of `"target-is-friendly"`:
activating a friendly ship re-selects it. Both stay in the union so the function
is total, both get wording in `announcements.ts` so the exhaustive switch there
compiles and is tested, and both are documented as reachable only by a direct
call from the rules layer.

Rejected: taking a target **ship id** instead, which removes the empty case.
It would force every caller to resolve a square to a ship before asking a
legality question, breaking the symmetry with `moveRefusalReason`, and it would
put the "is there even a ship here" branch into the session instead of the rules
layer.

The full union:

`"not-your-ship" | "another-ship-stranded" | "attacker-in-bay" |
"target-in-bay" | "no-target-there" | "target-is-friendly" |
"target-not-adjacent"`

checked in that order — whose ship it is, then §8.5 (an objection to the ship,
not the square), then the attacker's own bay, then everything about the target.
`"attacker-in-bay"` and `"target-in-bay"` are separate reasons, checked
separately, so the refusal can say which — `story.md` item 2 requires this.

Note there is deliberately **no** "ship already attacked" reason: §5 caps moves
per ship per ply and caps nothing else.

### 8. The fight is one effect object, not several

`applyAttack` reports the whole fight as a single `FightResolvedEffect`
carrying: the outcome (`"attacker-won" | "defender-won" | "mutual-return"`),
both ships' ids, sides, squares and shield counts **before** the fight, the
winner's id and remaining shields when there is a winner, and a `returns` list
of `{ shipId, side, from, to }` — one entry for a decided fight, two (attacker
first) for a mutual return.

`story.md`'s last open item asks how the effects should be shaped so
`announcements.ts` can group them the way it groups shield gains. This is the
answer: one fight is one fact, so it is one effect and one sentence. Grouping
several small effects (a shields-spent here, a ship-returned there) by scanning
is exactly the fragility the shield-gain grouping already has to work around,
and it gets worse when two ships return at once.

The end-of-action effects (`PlyEndedEffect`, `PassEffect`) are appended after
it, unchanged, so the announcement's "how the ply ended" clause is shared with
moves verbatim.

### 9. The shared end-of-action tail stays in `ply.ts`

`applyMove` and `applyAttack` both: spend one action; if the ply's second action
was spent, run `runEndOfTurn`, advance the ply number, swap sides, clear
`movedThisPly` and emit `ply-ended`; then run `applyPassGuard` and emit
`ply-passed` if it fired. Step 6 extracts that as a private helper in `ply.ts`,
taking the state after the action's own effects plus the id of a ship to add to
`movedThisPly` — **present for a move, absent for an attack**.

It stays in `ply.ts` rather than moving to a new module: it is the ply's own
bookkeeping, both callers live in `ply.ts`, and moving it would leave `ply.ts`
importing a module that exists only for it. `ply.ts` grows, but it grows around
one shared tail rather than two copies.

The extraction is its own step, before `applyAttack` exists, so it is verified
as a **pure refactor** — every existing `ply.ts` test passing unchanged.

### 10. The invariants §7 guarantees are asserted in code, not only in tests

`applyAttack` checks, after building the resulting state, and throws if any
fails:

- the **winner's square is unchanged**, and no ship except the returning one(s)
  changed square (§7: "neither ship moves");
- the winner's remaining shields are a valid `ShieldCount` — `winner − (loser +
1)` cannot be negative because the winner is by definition the ship with more
  shields, so `winner ≥ loser + 1`. This is an invariant to assert, not a case
  to clamp: a clamp would hide the bug that produced it;
- the fleet is still **seven ships a side**;
- **no site changed state or clock.** §8.2 wakes a site when a ship _touches_ it
  and nobody moves in a fight, so a fight is inert with respect to nodes —
  `story.md` asks for this asserted, not assumed.

These are bug detectors on a cheap operation, in the style `ply.ts` already uses
(`throw new RangeError(...)` for a missing ship). Tests cover the same
properties from outside, so a broken assertion cannot pass silently.

### 11. A legal action is a move or an attack: `src/rules/actions.ts`

A new, small module holds §5's action-level view, which is genuinely neither
§6's nor §7's:

- `sideToMoveHasLegalAction(state)` — replaces `sideToMoveHasLegalMove` inside
  `applyPassGuard`;
- `shipHasLegalAction(state, shipId)` — whether a particular ship has any legal
  move or any legal target, used by the session (selectability) and the board
  (the `no-action` condition).

It lives in its own module rather than in `movement.ts` (which would have to
import `combat.ts`, and whose name would then be a lie) or in `ply.ts` (which is
already substantial and is about _applying_ actions, not enumerating them). It
is also the natural seam a future engine would widen into "all legal actions for
the side to move".

**Non-circularity.** `sideToMoveHasLegalAction` is built from the §6-only and
§7-only layers, ignoring §8.5, exactly as `sideToMoveHasLegalMove` already
ignores it. The existing note in `movement.ts` explains why that is safe, and it
extends unchanged: the obligation only ever binds when at least one ship has a
legal §6 move, so a side that is obliged always has an action available.

**A behaviour change with a blast radius.** The existing pass-guard test in
`src/rules/ply.test.ts` ("passes the ply when the side to move has no legal
move") uses green-1 on A1 with 4 shields, boxed in by red ships on B1 and A2 —
which under the new guard has a **legal attack on B1** and must no longer pass.
That position becomes the story's "no legal move but a legal attack does not
pass" test, and the pass test gets a new position: a green ship **in a bay**
(where §3.1 forbids it to attack) with every square it could reach occupied —
for example green-1 on **A2** with 4 shields and red ships on **A1**, **A3** and
**B2**. Step 8 must expect to rewrite tests, not only code.

### 12. `movedThisPly` keeps its name and its meaning

Attacking does **not** add a ship to `movedThisPly`. §5 caps moves per ship per
ply and caps nothing else, so the list stays a list of moves. Renaming it to
`actedThisPly` would be actively wrong, and would quietly reintroduce a cap the
rules do not have.

A ship returned to a bay by a fight is likewise **not** "moved": if it belongs
to the side to move it may still be moved as the ply's second action (which is
what makes a mutual-loss opening survivable), and it is no longer stranded,
because a bay is not a site.

### 13. `ShipCondition` shrinks; "has moved" becomes an independent fact

Today `ShipCondition` is one exclusive slot of three: `owes-action`,
`already-moved`, `no-action`. Two of the three dampen the ship, because when it
was written a ship that had moved had nothing left to do. Under §5 that is false
— so:

- **`ShipCondition` becomes `"owes-action" | "no-action"`**, still one exclusive
  slot, still the thing that drives the artwork's fade and blink.
- **`hasMoved` becomes a separate boolean** on the square-label descriptor and
  on `BoardSquare`'s props, orthogonal to the condition and able to accompany
  either of them (in practice only `no-action`, since a ship that has moved is
  excluded from `strandedShipIds`).
- **`no-action` now means no legal move _and_ no legal target** — it is derived
  through `shipHasLegalAction`, so a ship that has moved and can still attack
  carries no condition at all and is drawn at full strength.
- **Dampening is driven by `no-action` alone.** Having moved stops contributing
  to it.

Rejected: a set of conditions (over-general — only one _fade-driving_ condition
can apply at a time, and a set makes the exclusivity that does exist
unenforceable), and keeping three exclusive values while special-casing the fade
(the derivation would then contradict the type).

**The artwork consequence** the story flags as an open item: a ship can now be
both moved and out of actions, so the solid "already moved" bar and the hollow
"no action" bar would collide at the square's bottom edge. The **already-moved
bar moves to the square's top edge**, keeping its shape and colour; the hollow
bar and the chevron stay at the bottom. Two bars at opposite edges read as two
facts; two bars in one place read as a rendering bug. Whether the solid bar
still reads correctly beside an **undampened** ship — a combination it was never
drawn against — is a manual gate (Step 15), not something jsdom can answer.

### 14. `SquareMark` stays one exclusive slot and gains `"target"`; the bay cues get their own field

`SquareMark` becomes `"selected" | "destination" | "target"`, still one slot,
because the three genuinely cannot co-occur: the selected ship's own square is
neither a destination nor a target; a destination must be **empty**, and a
target must hold an **enemy ship**.

The return cues are different — a bay can be position 1, a legal destination and
the receptacle at once — so they get a **field of their own**, `returnCue`, a
three-valued union: `"return-position" | "receptacle" |
"return-position-and-receptacle"`.

The third value settles the coincidence case (`story.md`'s open item): when
position 1 is empty it is also the receptacle. **The solid mark wins in the
artwork** — an outline drawn under a solid triangle of the same geometry is
invisible anyway, so drawing both would be pretending. **The accessible name
says both**, which is why the union has a third value rather than the artwork
silently dropping one. The manual gate (Step 15) is where the choice is checked
on screen.

Rejected: making `mark` a set. It would make the exclusivity that really does
hold unenforceable, and every consumer would gain a loop where a switch is
correct.

### 15. The wording of the predicted outcome in a target's accessible name

Settled by the owner: a target square's name **names the outcome**. The phrasing
is decided here, subject to being short enough to sit at the end of an already
long name and unambiguous read on its own. The `"target"` mark's wording and the
outcome are one segment pair:

| Outcome       | Wording                                            |
| ------------- | -------------------------------------------------- |
| attacker wins | `can attack here, your ship would win`             |
| defender wins | `can attack here, your ship would lose`            |
| mutual return | `can attack here, both ships would return to bays` |

"your ship" resolves the ambiguity of a bare "would win" heard on its own: the
listener is the player whose ship is selected. The shield **cost** is
deliberately left out — both ships' shield counts are already spoken, the name
is long enough, and the live region states the cost once the fight happens.

This is **not** the outcome-first design that was set aside: the artwork stays a
plain cue, and the spoken name only saves a listener arithmetic a sighted player
does by reading two shield rings. Whether it is genuinely useful that late in a
long name is the last check of the screen-reader gate (Step 16).

### 16. The wording of the return cues, and where they sit in the name

| Cue                              | Wording                                         |
| -------------------------------- | ----------------------------------------------- |
| `return-position`                | `return position 1`                             |
| `receptacle`                     | `next bay for a beaten ship`                    |
| `return-position-and-receptacle` | `return position 1, next bay for a beaten ship` |

"return position 1" is the document's own phrase (§7.1), so the rulebook and the
app agree. The cue is placed **immediately after the `bay` segment**, because it
is a fact about that bay rather than about the current selection — so a listener
tabbing along the edge hears it early: _"L1, bay, return position 1, red ship, 0
shields"_. The selection marks stay last, where they are today.

### 17. The new artwork

- **A target** is a large hollow ring centred on the square, in the existing
  `--interaction-accent`: it belongs to the same "you are choosing an action"
  layer as the destination disc and the selection brackets, and it must read
  around a ship icon rather than under one. Against the destination's small
  **solid** disc it is distinct by shape and size, so it survives greyscale.
- **The return cues** are four corner triangles, exactly as the owner specified:
  each drawn as **one new line** across the corner, with the square's existing
  border forming the triangle's other two sides — filled for position 1, a
  stroked line only for the receptacle. They are **not** part of the interaction
  layer: they are on screen all game regardless of selection, so they take the
  **bay** accent rather than the interaction accent, reading as part of the
  bay's own furniture. Triangles are unlike every existing mark (disc, brackets,
  bars, chevron), so the greyscale distinction holds.

All SVG stays `aria-hidden` with no `title` or `desc`; every meaning reaches
assistive technology through the accessible name (CONTRIBUTING.md).

### 18. Focus after an attack stays on the activated square

`story.md` asks for this to be decided rather than inherited. Decision: **focus
stays where the player put it** — the activated square — and no focus code
changes. This works today because `AccessibleGrid` marks every board cell
`focusable: true` unconditionally, so the roving-tabindex target never becomes
invalid when a square empties, and the effect that repairs an invalid target
never fires. The square's accessible name simply updates to describe an empty
square (or an empty square that is now a legal destination for the selected
ship, when the attacker survives and the selection is cleared).

Rejected: following the beaten ship to its bay. It would throw focus across the
board, away from the fight the player is conducting, in the one part of the game
where things happen to a player's ship against their will; the live region
already says which bay the ship went to.

Step 9 must nevertheless **test** this rather than assume it: a jsdom test that
activates an enemy square by keyboard and asserts focus is still on that cell
afterwards.

### 19. §8.7 step 6 produces no effect and no announcement

The drift is silent: it happens at the end of every ply, including a passed one,
and announcing it would add a clause to the live region **every single turn**
for a fact that both bay cues already carry on the board and in the bays'
accessible names. `EndOfTurnEffect` therefore gains nothing.

Rejected: a `return-position-moved` effect. It would be pure noise in the one
channel a screen-reader user cannot skim.

### 20. The selection announcement counts moves **and** targets

`SelectedEvent` gains `targetCount` beside `destinationCount`, because "0 moves
available" would now be actively misleading for a ship that has moved and can
still attack. The sentence:

- both non-zero: `2 moves and 1 target available.`
- moves only: `2 moves available.`
- targets only: `1 target available.`
- neither: `No actions available.`

with singular forms at 1. A ship with neither is still selectable when it has
not moved (unchanged behaviour — a pinned ship selects and says so).

### 21. A temporary fixture for the manual gates

Fighting cannot be reached quickly from the starting position: every ship starts
in a bay on 0 shields, and shields only arrive by sitting on a node for several
rounds, so a hand-played route to a 4-shield ship standing next to a 0-shield
enemy on a charged node is many minutes of clicking. Step 13 therefore adds
`src/game/reviewFixture.ts` — a hand-built position, not reachable by play —
and points `App.tsx` at it; **Step 17 deletes it**, exactly as story 00000009
did with its own fixture. No automated test may depend on it.

### 22. What is deliberately not done

- **No confirmation step.** The owner's decision: attacking is one activation,
  like moving. The board carries what a player needs before committing — the
  target's shield count is already in its accessible name, the predicted outcome
  now is too, and the return cues say where a beaten ship lands.
- **No undo**, no record, no engine, no score, no restyle of the shield arcs or
  site markers. See `story.md`'s "Out of scope".
- **The secondary receptacle is not shown.** A player working out where the
  second of two mutually beaten ships lands counts on from the first.

## Conventions every step follows

- **Every step is finished with** `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run format:check` (run `npm run format` to fix) and, for any
  step touching `src/`, `npm run build` — plus the step's own verification.
- **The dev server** runs at `http://localhost:5273` (`npm run dev`).
- **Tests live beside the code they cover**, and pure rules tests run in the
  default `node` environment. Only component tests opt into jsdom, using the
  recipe in CONTRIBUTING.md.
- **The rules layer never composes a sentence** and never imports from
  `src/board/` or `src/game/`.
- **Artwork stays decorative**: every SVG is `aria-hidden`. All meaning reaches
  assistive technology through the accessible name and the live region.
- **jsdom has no layout.** Nothing about legibility, greyscale, overlap or
  animation can be asserted in a DOM test — those are the manual gates.
- **Existing tests may need new positions, not weaker assertions.** Where this
  story changes behaviour (the pass guard, the ship conditions, the session's
  selectability), rewrite the position under test so it still tests what it
  meant to; never delete an assertion to make it pass.
- **Every step starts at `Status: pending`** and is updated by the
  implementation pipeline, with a `Notes:` line recording what was done and any
  deviation and why.

---

## Step 1 — Rules: starting shields settled, and two ships always have somewhere to go (version 0.6)

Status: committed

Notes: Edited `doc/ruleset/rules.md` (version bumped to 0.6, "0 shields (TBD)"
lost its TBD, the introduction's "some details are still being settled"
paragraph removed, Appendix A's table/item/closing sentence replaced with a
single "nothing is currently outstanding" line while keeping its heading and
Appendix B's numbering and cross-reference, and §7.1's "there is always
somewhere to go" paragraph extended to the mutual-return case), added the 0.6
entry to `doc/ruleset/changelog.md` stating plainly that neither change is a
tagging candidate and that tagging is on hold regardless, and bumped
`RULES_VERSION` to `"0.6"` in `src/rules/rulesVersion.ts`. `README.md` was
deliberately left untouched per the step's instruction (Step 19 handles it).
No deviation from the plan.

Edit `doc/ruleset/rules.md`, bump its version to **0.6**, record the change in
`doc/ruleset/changelog.md`, and set `RULES_VERSION` to match. This is the only
rules change in the story and it lands before any code depends on it. Neither
change alters how the game is played, so there is no tagging candidate here —
and tagging is on hold in any case (CLAUDE.md).

What to change, and nothing else:

1. **§4's starting shields lose their TBD.** The sentence "Every ship starts
   with **0 shields (TBD)**" becomes a plain statement that every ship starts
   with 0 shields. The number does not change; only its provisional marking
   goes. This is the owner's decision, closing Appendix A item 1.
2. **The introduction's paragraph about undecided details goes.** The paragraph
   near the top beginning "Some details are still being settled…" and pointing
   at Appendix A and the TBD marks has nothing left to point at, and no **TBD**
   remains anywhere in the document once change 1 lands. Check this by
   searching the file for "TBD" after editing.
3. **Appendix A keeps its heading and loses its contents.** Delete the table,
   the item, and the closing sentence about the item waiting on the early
   stories; leave the `## Appendix A — Open items` heading in place, carrying a
   single line saying nothing is currently outstanding and that the appendix
   will list open items again as the rules move. **Do not delete or renumber the
   appendix**: §8.7 links to Appendix B, as do earlier planning documents, and
   removing Appendix A would break every one of those references.
4. **§7.1's last paragraph covers the mutual return.** Today it argues that
   there is always somewhere to go because a returning ship was by definition on
   the board and not in a bay, so at least one bay is empty. Extend the same
   argument to the case described immediately above it: when **two** ships
   return from one fight, both were off-bay, so at least two bays are empty and
   the attacker's placement can never leave the defender without one. Keep the
   existing sentence; add the second case to it.
5. **The version line** at the top of `rules.md`: `0.5` → `0.6`.
6. **`doc/ruleset/changelog.md`**: a new `## 0.6` entry at the top (newest
   first), with a heading naming both changes. It must say that Appendix A item
   1 is closed with every ship starting on 0 shields — the number the document
   already carried, so **nothing about how the game is played changes** — that
   the appendix keeps its heading so Appendix B is not renumbered, and that
   §7.1's availability argument now covers two ships returning from one fight,
   which is a restatement of an argument the section already made rather than a
   new rule. State plainly that neither change is a tagging candidate, and that
   tagging is on hold regardless.
7. **`src/rules/rulesVersion.ts`**: `RULES_VERSION` → `"0.6"`.

Do **not** touch `README.md` in this step, even though its "one detail is
deliberately left open" sentence becomes false here: the README is checked and
updated as a whole in Step 19, when the rest of what it describes is also true.
Step 19 names this sentence explicitly so it cannot be missed.

Do **not** implement any of §7 here. No code in `src/rules/` implements combat
yet; Steps 4–7 do.

Depends on: nothing (first step).

Verification (automated): `npm test` — `src/rules/rulesVersion.test.ts` passes,
which is the guard that the constant and the document agree; every other test
passes unchanged. `npm run format:check` passes (prettier formats markdown too).
Also confirm by reading that: searching `rules.md` for "TBD" finds nothing; the
Appendix A heading is still present with Appendix B unchanged after it; §8.7's
Appendix B link still resolves; and the changelog's 0.6 entry sits above 0.5.

---

## Step 2 — The clockwise bay ring

Status: committed

Notes: Added `CLOCKWISE_BAYS`, `STARTING_RETURN_POSITION_INDEX`,
`driftReturnPositionIndex` and `bayNumberingFrom` to `src/rules/bays.ts`, all
pure functions of an index with no import of `fleet.ts` or `gameState.ts`.
Added the tests specified in `src/rules/bays.test.ts`, including the guard
that `CLOCKWISE_BAYS` matches `STARTING_FLEET`'s squares in order (the test
file imports `fleet.ts`, `bays.ts` itself does not). No deviation from the
plan.

Add §7.1's bay ring and its pure arithmetic to `src/rules/bays.ts`, alongside
the existing `BAYS` and `isBay`, which do not change.

What to add:

- **`CLOCKWISE_BAYS`** — the fourteen bays in the clockwise ring §7.1 numbers
  around: **H15, L15, O14, O10, O6, O2, L1, H1, D1, A2, A6, A10, A14, D15**.
  This is the order §4 lists the starting fleet in. `BAYS` stays in §3.1's table
  order (top, right, bottom, left) and is _not_ this ring.
- **The start index** — a named constant for return position 1 on ply 1, which
  §7.1 fixes at **H15**: index 0 in the ring. Name it for what it means (the
  starting return position), not for its value.
- **The drift** — a pure function taking a ring index and returning the index
  one bay **counter-clockwise**, i.e. one step _backwards_ along the ring,
  wrapping: `(index - 1 + 14) % 14`. §8.7 step 6 calls this; nothing else
  computes it.
- **The numbering order** — a pure function taking a ring index (position 1) and
  returning all fourteen bays in §7.1's numbering order: position 1 first, then
  2, 3, 4 … **clockwise**, wrapping around the ring. Step 5 uses it to find the
  first empty bay.

`bays.ts` must **not** import `fleet.ts`, `gameState.ts` or anything else: the
ring is board geometry. Everything here is a pure function of an index.

Tests (in `src/rules/bays.test.ts`, beside the existing ones):

- `CLOCKWISE_BAYS` has fourteen entries and is a permutation of `BAYS` — same
  set of squares, different order.
- **It matches §4's starting fleet square for square**: the test imports
  `STARTING_FLEET` and asserts `CLOCKWISE_BAYS` equals its squares in order.
  This is the guard that keeps the two orderings from drifting apart, and it is
  the reason `bays.ts` itself must not depend on `fleet.ts`.
- Consecutive ring entries are genuinely adjacent bays around the perimeter:
  reuse or mirror the existing `perimeterRing()` helper in that file and assert
  that each step from one ring entry to the next moves **four** squares along
  the 56-square perimeter in a consistent direction, wrapping once.
- The drift function: from H15's index it gives D15's; applied fourteen times it
  returns to the start; it never leaves the range 0–13.
- The numbering order: fourteen entries, no repeats, position 1 first, position
  2 the next bay clockwise, and starting from the last ring entry it wraps to
  the first.

Depends on: Step 1 (the rules edit is committed first; no code dependency).

Verification (automated): `npm test` — the new `bays.test.ts` cases pass,
including the assertion that the ring matches `STARTING_FLEET`, and every
existing bay test still passes unchanged.

---

## Step 3 — The state carries the return position, and §8.7 step 6 drifts it

Status: pending

Put §7.1's return position into the game state and fill in the end-of-turn step
that moves it.

What to change:

- **`src/rules/gameState.ts`** — `GameState` gains **`returnPositionIndex`**, an
  index into `CLOCKWISE_BAYS` naming return position 1 for the ply being played.
  `startingGameState` sets it to the start index from Step 2 (H15).
  Document on the field that it is an index into the ring, that position 1 is
  `CLOCKWISE_BAYS[returnPositionIndex]`, and that the bay a beaten ship actually
  lands in is derived from occupancy elsewhere and never stored.
- **`src/rules/endOfTurn.ts`** — step 6 stops being an empty slot. The comment
  saying it awaits the combat story goes; the step drifts
  `returnPositionIndex` one bay counter-clockwise using Step 2's function. It
  runs unconditionally, at the very end of the sequence, after step 5.
  **No effect is emitted** (decision 19): the drift is silent, and
  `EndOfTurnEffect` is unchanged.

Because `runEndOfTurn` already runs for a passed ply as well as a completed one,
the drift automatically happens on a passed ply too — which is what §8.7
requires. No change in `ply.ts` is needed for that.

Tests:

- `src/rules/gameState.test.ts`: a starting state's `returnPositionIndex` names
  **H15**.
- `src/rules/endOfTurn.test.ts`: one call to `runEndOfTurn` moves the position
  one bay **counter-clockwise** (H15 → D15); fourteen calls return it to H15; it
  is the only field the step changes.
- `src/rules/ply.test.ts`: the position is unchanged **between** the two actions
  of a ply and changes when the ply ends; a **passed** ply (through
  `applyPassGuard`) also drifts it. Reuse the existing pass position for now —
  Step 8 replaces it.

Other tests that build a `GameState` by hand will need the new field; most build
on `startingGameState` and spread, so the blast radius should be small. Add the
field, do not make it optional.

Depends on: Step 2 (the ring and the drift arithmetic).

Verification (automated): `npm test` — the new cases pass and the whole suite is
green; `npm run typecheck` proves every construction site of `GameState` has
been updated.

---

## Step 4 — `combat.ts`: who may attack whom (§7, §3.1, §8.5)

Status: pending

Create `src/rules/combat.ts`, the **only** implementation of §7 in the app, and
give it the legality half: adjacency, the refusal reasons, and the legal
targets. Nothing in this step changes a game state.

What to implement:

- **Adjacency.** The eight surrounding squares — diagonals included — written
  out as a literal offset table and filtered to the board. It must **not** be
  derived from `reachFrom` or from §6's range table in any way: §7's second
  paragraph exists to deny that link, and a 4-shield ship strikes all eight
  neighbours while it can only step one square orthogonally. Say so in the
  module header.
- **`AttackRefusalReason`** — the structured union, never a sentence:

  `"not-your-ship" | "another-ship-stranded" | "attacker-in-bay" |
"target-in-bay" | "no-target-there" | "target-is-friendly" |
"target-not-adjacent"`

- **A §7-only layer** (`sevenOnlyAttackRefusalReason`,
  `sevenOnlyLegalTargets`) — everything except §8.5's obligation: whose ship it
  is, the attacker's bay, whether there is an enemy ship on the target square,
  the target's bay, and adjacency. This layer exists so Step 8's pass guard can
  ask "is any action legal" without circularity, exactly as
  `sixOnlyMoveRefusalReason` does for §6.
- **The public layer** — `attackRefusalReason(state, shipId, targetSquare)` and
  `legalTargets(state, shipId)`, which apply §8.5 on top of the §7-only layer
  and are what the session and the board call.

The order the reasons are checked in, most fundamental first: whose ship it is;
then §8.5 (an objection to the ship, not the square); then the attacker's own
bay; then the target — no ship there, a friendly ship, a ship in a bay, not
adjacent.

Two things that are easy to get wrong and are load-bearing:

- **§8.5 refuses every attack, including the stranded ship's own.** Where
  `moveRefusalReason` excuses the ships that owe (`!owed.includes(shipId)`),
  `attackRefusalReason` refuses whenever `strandedShipIds(state)` is non-empty,
  with **no** exception for the attacker — an attack never frees anything, and
  §8.5 says each action in turn must free a ship while any still owes. The
  reason string is the existing `"another-ship-stranded"`, deliberately shared
  with moves so the player hears one sentence.
- **Having moved does not block an attack.** `movedThisPly` is not consulted
  anywhere in this module. §5 caps moves per ship per ply and caps nothing else,
  so a ship may attack twice, or move and then attack, or attack and then move.

Tests (`src/rules/combat.test.ts`):

- All eight neighbours of an interior square are targets when they hold enemy
  ships; a ship two squares away is not (`"target-not-adjacent"`).
- A **4-shield** ship can strike diagonally though `legalDestinations` shows it
  cannot move that way; a **0-shield** ship's three-square orthogonal reach
  grants it no extra attack range. These two assert the independence of §7 from
  §6 directly.
- Edge and corner squares yield five and three neighbours — nothing off-board.
- The bay exclusion, both ways and **distinguishably**: an attacker in a bay is
  refused `"attacker-in-bay"`; a target in a bay is refused `"target-in-bay"`.
- A friendly target is `"target-is-friendly"`; an empty target square is
  `"no-target-there"`; an enemy ship attacking is `"not-your-ship"`.
- §8.5: with one ship owing an action, **every** attack is refused
  `"another-ship-stranded"` — including one by the owing ship itself — and
  `legalTargets` is empty for every ship; once the freeing move is made,
  attacks are legal again, including with the ship just freed. A stranded ship
  whose obligation is **waived** (it has no legal move) leaves attacks legal for
  the whole side.
- A ship that has already moved still has its targets.

Depends on: Step 1 (rules at 0.6). No dependency on Steps 2–3.

Verification (automated): `npm test` — `src/rules/combat.test.ts` passes and
nothing else changes behaviour, since no existing module imports `combat.ts`
yet.

---

## Step 5 — `combat.ts`: the fight's arithmetic and §7.1's landing bay

Status: pending

Add to `src/rules/combat.ts` the two derivations a fight needs before anything
can be applied: who wins and what it costs, and which bay a beaten ship goes to.
Still no state changes.

**The fight's arithmetic.** A pure function of two shield counts returning the
outcome, in the three shapes the code must distinguish:

| Attacker vs defender | Outcome                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| more shields         | Attacker wins. Defender returns at 0. Attacker keeps `a − (d + 1)`.     |
| fewer shields        | **Defender** wins. Attacker returns at 0. Defender keeps `d − (a + 1)`. |
| equal                | Both return at 0, attacker placed first.                                |

The middle row is the one most easily implemented backwards: §7 explicitly
permits attacking a stronger enemy, so a player may spend an action to strip an
opponent's shields at the cost of sending their own ship home. That is a real
tactic, not an error case.

The winner's remaining shields are always a valid `ShieldCount`: the winner has
strictly more shields, so `winner ≥ loser + 1` and the result is in 0–3. The
function asserts that rather than clamping — a clamp would hide the bug that
produced it.

**§7.1's placement.** Two derivations, both from the current state:

- **Position 1's square** — `CLOCKWISE_BAYS[state.returnPositionIndex]`.
- **The receptacle** — the **first empty** bay in Step 2's numbering order
  starting at position 1, judged against **current occupancy** (`shipsBySquare`).
  It is recomputed at every point of use and never stored, because occupancy
  changes inside a ply: a ship moving out of a bay as the first action changes
  where a ship beaten by the second action lands. It throws if all fourteen bays
  are occupied — §7.1 guarantees that cannot happen, so it is a bug detector,
  not a case.

There is **no** separate "second receptacle" function. The mutual-return case is
handled by placing the attacker, then asking the same function again against the
state that already contains it — which is also what keeps the two answers
consistent with any other occupancy change.

Tests (`src/rules/combat.test.ts`):

- **Every combination of 0–4 against 0–4** asserted against `winner − (loser +
1)`: the right ship wins, the right ship returns, the winner's remaining
  shields are a valid `ShieldCount`, and equal counts give a mutual return.
- Beating a 0-shield ship costs exactly one shield; a 4-shield ship beating a
  2-shield ship comes out on 1 (§7's own worked example).
- Position 1 is H15 in a starting state.
- The receptacle is position 1 when position 1 is empty; the next bay clockwise
  when position 1 is occupied; the one after that when both are; and it wraps
  around the end of the ring.
- **The receptacle is live**: taking a state, moving a ship out of the bay that
  would otherwise be first, and asking again gives that bay.

Depends on: Steps 2, 3 and 4 (the ring, the state field, the module).

Verification (automated): `npm test` — the new cases pass; nothing else changes.

---

## Step 6 — Extract the shared end-of-action tail in `ply.ts`

Status: pending

A pure refactor, with no behaviour change, so `applyAttack` can share it in Step
7 rather than duplicate it.

`applyMove` currently ends with a block that: decrements `actionsRemaining`;
either records the ship in `movedThisPly` (when actions remain) or runs
`runEndOfTurn`, advances the ply number, swaps the side to move, clears
`movedThisPly` and pushes a `ply-ended` effect; then runs `applyPassGuard` and
pushes a `ply-passed` effect if it fired. Extract that as a private helper in
`ply.ts`, taking the state after the action's own effects, the effects list so
far, and **optionally** the id of a ship to add to `movedThisPly` — present for
a move, absent for an attack (attacking never marks a ship as moved: §5 caps
moves per ship per ply and caps nothing else).

Also introduce a shared effect type for the two end-of-action effects
(`PlyEndedEffect | PassEffect`) so `MoveEffect` and Step 7's attack effect union
can both include it by name rather than by repetition.

Nothing else changes: not the order of effects, not the shape of
`ApplyMoveResult`, not `applyPassGuard`, not a single test.

It stays in `ply.ts` rather than moving to a new module: it is the ply's own
bookkeeping and both callers live here.

Depends on: nothing beyond the current `ply.ts`; scheduled here so Step 7 has
one tail to call.

Verification (automated): `npm test` — the whole suite passes **with no test
file modified**, `src/rules/ply.test.ts` in particular. That is the proof this
step changed nothing observable. `npm run typecheck` and `npm run lint` pass.

---

## Step 7 — `applyAttack`: resolving a fight

Status: pending

Add `applyAttack(state, shipId, targetSquare)` to `src/rules/ply.ts`, beside
`applyMove` and sharing Step 6's tail. It is the only thing in the app that
resolves a fight.

What it does:

1. **Refuses** through `attackRefusalReason` (Step 4), returning the same
   `{ outcome: "refused", reason }` shape `applyMove` uses, with the reason
   structured and never a sentence.
2. **Resolves** through Step 5's arithmetic, producing a new state in which:
   - the winner, if any, keeps `winner − (loser + 1)` shields and **does not
     move** — §7 is explicit that winning a fight clears ground, it does not take
     it;
   - the beaten ship (or both, on a mutual return) stands in a bay with **0**
     shields, placed **immediately**, so it is already there before the next
     action;
   - on a mutual return the **attacker is placed first**, then the defender takes
     the next empty bay — computed by asking Step 5's receptacle function again
     against the state that already contains the attacker;
   - **no site changes state or clock**, and no `site-charged` effect is
     produced: §8.2 wakes a site when a ship _touches_ it and nobody moves in a
     fight. A charged node the loser is driven off stays charged with its clock
     running;
   - **`movedThisPly` is untouched** by the attack itself.
3. **Reports** a single `FightResolvedEffect` (decision 8) carrying the outcome
   (`"attacker-won" | "defender-won" | "mutual-return"`), both ships' ids, sides,
   squares and pre-fight shield counts, the winner's id and remaining shields
   where there is one, and the list of returns (`shipId`, `side`, `from`, `to`),
   attacker first when there are two. One fight is one fact, so it is one effect
   and — in Step 9 — one sentence.
4. **Finishes** through Step 6's shared tail, with no ship id to mark as moved:
   spend the action, end the ply if that was the second, run the end-of-turn
   sequence, then the pass guard.
5. **Asserts**, and throws on violation (decision 10): the winner's square is
   unchanged; no ship other than the returning one(s) changed square; the
   winner's shields are a valid `ShieldCount`; there are still seven ships a
   side; and `siteStates` is unchanged by the fight itself (compare before the
   end-of-turn tail runs — the end-of-turn sequence legitimately changes sites).

Tests (`src/rules/ply.test.ts`):

- **All three outcomes**: attacker stronger, attacker weaker (the defender wins
  and pays), and equal (both return, attacker's bay first).
- **What it costs**: beating a 0-shield ship costs one shield; a winner reduced
  to 0 standing on a charged node **gains one back** at the end of the ply
  (end-of-turn step 1 still runs).
- **Neither ship moves**: the winner is on the same square afterwards, the
  loser's square is empty, and driving an enemy off a charged node leaves the
  node charged with its clock unchanged.
- **A fight touches no site**: `siteStates` is identical after an attack that
  does not end a ply, in all three outcomes.
- **The fleet is constant**: seven a side after a sequence of fights.
- **Return placement**: the first empty bay from position 1; the next one when
  position 1 is occupied; on a mutual return the attacker takes the first and
  the defender the next; both arrive at **0 shields**.
- **The receptacle is live**: move a ship out of a bay as the first action, then
  win a fight with the second, and the beaten ship lands in the bay just vacated.
- **The return position does not drift between the two actions of a ply**, and
  does drift when the ply ends.
- **Action permissions** (§5): attack twice with one ship (win the first so it
  survives to strike a second neighbour); attack then move with one ship; move
  then attack with one ship; attack with two different ships; and the move cap
  still holds at one move per ship per ply.
- **Un-stranding by force**: a ship stranded on a depleted site that is beaten in
  a fight is in a bay afterwards and owes nothing on its owner's next turn.
- **A ship returned to a bay is not marked as moved** and may be moved as the
  ply's second action by the side to move.
- Refusals come back structured, with the reason `attackRefusalReason` gives.

Depends on: Steps 5 (the arithmetic and the bay) and 6 (the shared tail).

Verification (automated): `npm test` — the new `ply.test.ts` cases pass and
every existing one is unchanged and green.

---

## Step 8 — A legal action is a move or an attack: the pass guard follows

Status: pending

Add `src/rules/actions.ts`, §5's action-level view, and point the pass guard at
it.

What to implement:

- **`sideToMoveHasLegalAction(state)`** — whether the side to move has any legal
  move with any eligible ship **or** any legal target with any of its ships.
  Built from the **§6-only** and **§7-only** layers, ignoring §8.5, exactly as
  `sideToMoveHasLegalMove` already ignores it: the obligation only binds when at
  least one ship has a legal §6 move, so a side that is obliged always has an
  action. Keep that reasoning in the module header, as `movement.ts` does today.
- **`shipHasLegalAction(state, shipId)`** — whether a particular ship has any
  legal move or any legal target, judged by the **public** layers (so §8.5
  applies). Used by the session for selectability and by the board for the
  `no-action` condition.
- **`applyPassGuard`** in `ply.ts` calls `sideToMoveHasLegalAction` instead of
  `sideToMoveHasLegalMove`. Nothing else about the guard changes: it still runs
  after every action, still passes at most once, still runs the full end-of-turn
  sequence for the passed ply.
- **`sideToMoveHasLegalMove`** stays exported from `movement.ts` — it is §6's
  own question and the new predicate is built on it.

`actions.ts` imports `movement.ts` and `combat.ts` and is imported by `ply.ts`,
`session.ts` and `Board.tsx`. Check for import cycles as you go: nothing in
`movement.ts`, `combat.ts`, `stranded.ts` or `moveLegality.ts` may import
`actions.ts`.

**Expect to rewrite existing tests, not weaken them.** The pass-guard test in
`src/rules/ply.test.ts` puts green-1 on **A1** with 4 shields, boxed in by red
ships on **B1** and **A2**. Under the new guard that side has a legal attack on
B1 and must **not** pass. Turn that position into the story's new test — _a side
with no legal move but a legal attack does not pass_ — and give the pass test a
position with neither: a green ship **in a bay**, where §3.1 forbids it to
attack, with every square it can reach occupied. For example green-1 on **A2**
(a bay) with 4 shields and red ships on **A1**, **A3** and **B2**: at 4 shields
it may only step one square orthogonally, all three such squares are occupied,
and being in a bay it cannot attack. Confirm the arithmetic when you write it.

Tests:

- `src/rules/actions.test.ts`: a side with a move but no target has an action; a
  side with a target but no move has an action; a side with neither has none; a
  ship that has moved and has a target has an action, while one that has moved
  with no target does not; a ship held back by §8.5's obligation has no action of
  its own while the obligation binds.
- `src/rules/ply.test.ts`: the pass guard **does not** pass a side whose only
  legal action is an attack; it **does** pass a side with neither, and that
  passed ply still runs the full end-of-turn sequence (shield gains, clocks, and
  the return position's drift).

Depends on: Steps 4 and 7 (the §7 layers exist and attacks can be applied, so a
non-passing side genuinely has something to do).

Verification (automated): `npm test` — the new `actions.test.ts` passes, the
rewritten pass tests pass, and the rest of the suite is green.

---

## Step 9 — The attack gesture, and the words for it

Status: pending

Teach the session that activating an enemy ship is an attack, widen which ships
may be selected, and write the wording for everything new.

**Why the session and the wording are one step.** `announcementFor` switches
exhaustively over the session's event union and over `RejectionReason`, with a
declared `string` return type, so adding an event or a reason without adding its
sentence does not compile. The two files change together or not at all.

### `src/game/session.ts`

- **`AttackedEvent`** — a new session event mirroring `MovedEvent`: the attacking
  ship's id and side, the square it attacked **from**, the square it attacked,
  everything `applyAttack` reported, and the resulting `actionsRemaining`.
- **`RejectionReason`** widens to `MoveRefusalReason | AttackRefusalReason |
"nothing-to-select"`. The two unions share `"not-your-ship"` and
  `"another-ship-stranded"`, which is deliberate: one reason, one sentence,
  whichever action was tried.
- **`SelectedEvent` gains `targetCount`** beside `destinationCount`, because
  "0 moves available" would now be misleading for a ship that has moved and can
  still attack.
- **The gesture**, with a ship already selected:
  - activating the selected ship's **own** square still clears the selection;
  - activating a square holding a **friendly** ship still **re-selects** it —
    but the eligibility test widens from "has not moved this ply" to **"has a
    legal action"** (`shipHasLegalAction`, Step 8). A ship that has moved and
    still has a target therefore becomes selectable. A friendly ship that has
    moved and has **no** legal action is rejected `"ship-already-moved"`, as
    today;
  - activating a square holding an **enemy** ship is an **attack**: call
    `applyAttack` and emit `attacked`, or emit `rejected` with the structured
    attack reason;
  - activating an **empty** square is a **move**, accepted or refused on move
    legality exactly as today. There is no "no target here" rejection: an empty
    square is a move attempt, not a failed attack.
- **With no ship selected**, the same widened eligibility: a friendly ship is
  selectable when it has a legal action; one that has moved and has none is
  rejected `"ship-already-moved"`. A ship that has _not_ moved but has no legal
  action (pinned, or held back by §8.5) still selects and reports zero of
  everything, as it does today.
- After an attack the selection is **cleared**, exactly as after a move.

### `src/board/announcements.ts`

The players' vocabulary throughout: "turn" and "node", never "ply" or "hub".
Sentences are composed from the single `FightResolvedEffect`, so one fight is
one sentence; the "how the ply ended" clause is the **same** helper a move uses
(`ply-ended` / `ply-passed` / actions remaining), which should be generalised
from `MovedEvent` to either event rather than copied.

The three outcomes, using this wording (square names and counts substituted):

- **Attacker won** — `Green ship at J4 attacked the red ship at K5 and won. The
beaten ship returned to the D1 bay with no shields. The fight cost 1 shield,
leaving the winner on 3.`
- **Defender won** — `Green ship at G9 attacked the red ship at H9 and lost. The
beaten ship returned to the D1 bay with no shields. The fight cost the
defender 2 shields, leaving it on 1.`
- **Mutual return** — `Green ship at C6 attacked the red ship at C7 and both
were beaten. The attacker returned to the D1 bay and the defender to the A2
bay, both with no shields.`

Singular and plural both handled ("1 shield" / "2 shields"). The losing-attacker
sentence must read plainly as a thing the player chose to do — §7 permits
attacking a stronger enemy and it is a real tactic — not as an error.

The new refusals:

- `attacker-in-bay` — `A ship in a bay cannot attack. Move it out first.`
- `target-in-bay` — `A ship in a bay cannot be attacked.`
- `target-not-adjacent` — `<square> is out of attack range. An attack reaches
only the eight squares around a ship.`
- `target-is-friendly` — `That is your own ship, not a target.`
- `no-target-there` — `There is no ship on <square> to attack.`
- `another-ship-stranded` and `not-your-ship` keep their existing sentences,
  shared with moves.

`target-is-friendly` and `no-target-there` are not reachable through the board's
gesture (a friendly ship re-selects, an empty square is a move) — they exist
because the rules layer's refusal function is total. They are still worded and
still tested; note that in the module, briefly, without design history.

The selection sentence reports both counts (decision 20): `2 moves and 1 target
available.` / `2 moves available.` / `1 target available.` / `No actions
available.`, singular at 1.

### Tests

- `src/game/session.test.ts`: activating an empty square is still a move;
  activating an **adjacent** enemy attacks and produces an `attacked` event with
  the fight's effects; activating a **distant** enemy is rejected as out of
  attack range — **not** as a blocked or occupied move, which is the regression
  this test exists to catch; activating a friendly ship re-selects it, including
  one that has moved and can still attack; a ship that has moved with no target
  is rejected; the selection is cleared after an attack.
- `src/board/announcements.test.ts`: a sentence for each of the three outcomes,
  each new refusal, and each of the four selection-count shapes; a fight that
  ends the ply carries the same ending clause a move does; a fight that ends the
  ply and leaves the other side with nothing to do carries the pass clause.
- `src/board/Board.test.tsx` (jsdom): **focus after an attack** — with a ship
  selected, activate an adjacent enemy square by keyboard and confirm focus is
  still on that cell afterwards and its accessible name now describes an empty
  square. This is decision 18, tested rather than assumed.

Depends on: Steps 7 and 8 (`applyAttack` and `shipHasLegalAction`).

Verification (automated): `npm test` — the session, announcement and board tests
above pass, and the existing move, selection and rejection tests still pass
unchanged.

---

## Step 10 — "Already moved" stops meaning "spent"

Status: pending

A ship that has moved is a valid choice for the second action **if and only if
it has a legal attack target** (§5). The board must match the rule.

### The shape change (decision 13)

- **`ShipCondition`** in `src/board/squareLabel.ts` shrinks to `"owes-action" |
"no-action"` — still one exclusive slot, still what drives the artwork's fade
  and blink.
- **`hasMoved`** becomes a separate boolean on `SquareLabelDescriptor` and on
  `BoardSquareProps`, orthogonal to the condition and able to accompany it.
- The accessible name keeps saying **"already moved this turn"** — it is a real
  fact a player needs when planning the rest of the turn — but it is now an
  independent segment that can be followed by a condition. A ship that has moved
  and has no target reads as both: `H8, green ship, 2 shields, already moved
this turn, no action available this turn`.
- Segment order in the name: square, bay/site, ship, shields, **already moved**,
  condition, mark. (The bay cues are inserted in Step 12; the mark's outcome in
  Step 11.)

### The derivation (`src/board/Board.tsx`)

- `owes-action` still wins when the ship is in `strandedShipIds`.
- `no-action` now means **`shipHasLegalAction` is false** — no legal move _and_
  no legal target (Step 8's predicate).
- `hasMoved` is simply `state.movedThisPly.includes(ship.id)`, passed
  independently.
- Conditions still apply to the **side to move only**; an opponent's ship never
  carries one.

### The artwork (`src/board/BoardSquare.tsx`, `.css`)

- **Dampening is driven by `no-action` alone.** Having moved no longer fades a
  ship. `owes-action` keeps its blink and its chevron; `no-action` keeps its
  hollow bar and its fade.
- **The "already moved" solid bar moves to the square's top edge**, keeping its
  shape, size and colour, and is drawn whenever `hasMoved` is true, whatever the
  condition. It has to move because a ship can now be _both_ moved and out of
  actions, and two bars at the bottom edge would overlap into something that
  reads as a rendering bug. Two bars at opposite edges read as two facts.

### Tests

- `src/board/squareLabel.test.ts`: `hasMoved` alone; `hasMoved` with
  `no-action`; `hasMoved` with neither; the condition alone; and the segment
  order above.
- `src/board/BoardSquare.test.tsx`: the already-moved bar renders from
  `hasMoved` and **does not** dampen the square; `no-action` dampens; both
  together render both marks and dampen; `owes-action` still blinks and is not
  dampened.
- `src/board/Board.test.tsx`: a ship that has moved but has a legal target is
  **not** dampened and reads as "already moved this turn" with no condition; a
  ship with neither a move nor a target reads as both moved and out of actions;
  a pinned ship that has not moved still reads "no action available this turn".
  Existing tests in this file that assume "already moved" implies dampened must
  be **rewritten to the new rule**, not deleted.
- axe passes on the rendered board, as the existing DOM tests already assert.

Depends on: Step 8 (`shipHasLegalAction`). Independent of Steps 11 and 12.

Verification (automated): `npm test` — the tests above pass and the whole suite
is green. Whether the solid bar still reads well beside an **undampened** ship,
a combination it was never drawn against, is checked by eye in Step 15.

---

## Step 11 — Attack cues on the board, with the predicted outcome

Status: pending

With a ship selected, mark its legal targets distinctly from its legal
destinations, and name the outcome an attack there would have.

### The mark

`SquareMark` becomes `"selected" | "destination" | "target"` — still **one
exclusive slot**, because the three cannot co-occur: the selected ship's own
square is neither a destination nor a target, a destination must be empty, and a
target must hold an enemy ship. A test should assert that exclusivity holds on a
real position rather than only asserting the type.

`src/board/Board.tsx` derives the selected ship's `legalTargets` (Step 4)
alongside its `legalDestinations`, and marks those squares `"target"`.

### The artwork (`src/board/BoardSquare.tsx`, `.css`)

A large **hollow ring** centred on the square, in the existing
`--interaction-accent`, drawn over the enemy ship icon. It belongs to the same
"you are choosing an action" layer as the destination disc and the selection
brackets, and it is distinct from the destination's small **solid** disc by both
shape and size, so the distinction survives greyscale. `aria-hidden`, like every
other mark.

### The name (`src/board/squareLabel.ts`)

A target square's accessible name **names the outcome** (the owner's decision).
The descriptor gains an optional predicted-outcome field, used only when the
mark is `"target"`, and the wording is:

| Outcome       | Wording                                            |
| ------------- | -------------------------------------------------- |
| attacker wins | `can attack here, your ship would win`             |
| defender wins | `can attack here, your ship would lose`            |
| mutual return | `can attack here, both ships would return to bays` |

"your ship" is what makes it unambiguous heard on its own: the listener is the
player whose ship is selected. The shield **cost** is deliberately left out —
both ships' shield counts are already spoken, and the name is long enough.

`Board.tsx` computes the outcome with the pure arithmetic from Step 5 (the
selected ship's shields against the target's), so no arithmetic lives in the
component.

### Tests

- `src/board/squareLabel.test.ts`: each of the three outcome wordings; the
  outcome appears **only** with the `"target"` mark and never on a destination
  or a selected square.
- `src/board/Board.test.tsx`: with a ship selected next to an enemy, the enemy's
  square carries the target wording and the destinations carry theirs; a ship
  that has moved and has a target shows **targets and no destinations**; every
  combination of 0–4 against 0–4 produces the right one of the three wordings
  (drive this from the arithmetic, in a loop, rather than 25 hand-written
  cases); with nothing selected, no square carries a target mark.
- `src/board/BoardSquare.test.tsx`: the target ring renders for the `"target"`
  mark and for no other, and is distinct in the DOM from the destination disc.

Depends on: Steps 4 and 5 (targets and the arithmetic), Step 10 (the descriptor
has already been reshaped, so this step adds one field rather than two).

Verification (automated): `npm test` — the tests above pass; axe still passes on
the board.

---

## Step 12 — The return position and its receptacle on the board

Status: pending

Show, all game, where a beaten ship would go.

### The cues (decision 14)

A new field on `SquareLabelDescriptor` and `BoardSquareProps`, **independent of
`mark`** because a bay can be position 1, a legal destination and the receptacle
at once:

`"return-position" | "receptacle" | "return-position-and-receptacle"`

`src/board/Board.tsx` derives both from the session state on every render, using
Step 5's functions: position 1 from `returnPositionIndex`, and the receptacle
from current occupancy — so it is **recomputed after every action**, which is
the point: moving a ship out of a bay changes it mid-turn. Position 1 is marked
whether or not it is empty; when it is empty it is also the receptacle, which is
the third value.

### The artwork

Four corner triangles, as the owner specified: each drawn as **one new line**
across the corner of the square, with the square's existing border forming the
triangle's other two sides — **filled** for position 1, the **line alone** for
the receptacle. Where both apply, the **solid mark wins**: an outline under a
solid triangle of the same geometry is invisible, so drawing both would be
pretence. The accessible name says both regardless.

They take the **bay** accent, not the interaction accent: they are on screen all
game regardless of selection, so they read as part of the bay's own furniture
rather than as part of the "you are choosing an action" layer. Triangles are
unlike every existing mark (disc, ring, brackets, bars, chevron), so the
greyscale distinction holds. `aria-hidden`, like every other mark.

### The name

Placed **immediately after the `bay` segment**, since it is a fact about the bay
rather than about the current selection:

| Cue                              | Wording                                         |
| -------------------------------- | ----------------------------------------------- |
| `return-position`                | `return position 1`                             |
| `receptacle`                     | `next bay for a beaten ship`                    |
| `return-position-and-receptacle` | `return position 1, next bay for a beaten ship` |

So an occupied position 1 reads `L1, bay, return position 1, red ship, 0
shields`. "return position 1" is §7.1's own phrase, so the rulebook and the app
agree.

### Tests

- `src/board/squareLabel.test.ts`: each of the three wordings, in the right
  place in the name, including alongside an occupant and alongside a selection
  mark.
- `src/board/Board.test.tsx`: on a starting position, **H15** carries the
  return-position wording; the receptacle wording is on the first empty bay
  clockwise from it; after a ply, position 1 has moved one bay
  counter-clockwise; occupying position 1 puts the receptacle wording on a
  different square; and moving a ship **out** of a bay mid-ply moves the
  receptacle wording onto it.
- `src/board/BoardSquare.test.tsx`: the filled triangles render for
  `return-position` and for the combined value, the stroked ones for
  `receptacle`, four corners each, and none of them for a square with no cue.

Depends on: Steps 3 and 5 (the state field and the two derivations); Step 10
(the descriptor's shape).

Verification (automated): `npm test` — the tests above pass; axe still passes.
How the two triangle treatments look on screen, and whether the coincidence case
reads properly, is checked by eye in Step 15.

---

## Step 13 — A temporary position for the manual gates

Status: pending

Add `src/game/reviewFixture.ts`, a **temporary** module holding a hand-built
position, and have `src/App.tsx` build its initial session from it instead of
from `startingGameState(freshSeed())` — a change of one import and one call.
**Step 17 deletes it.**

Why: fighting cannot be reached quickly from the starting position. Every ship
starts in a bay on 0 shields, and shields only arrive by holding a node for
several rounds, so a hand-played route to the positions the gates need is many
minutes of clicking, repeated after every reload. Story 00000009 used the same
device for the same reason.

The module header must say plainly that this is **not a position reachable by
play** and that it exists only so the board can be checked by eye. It must not
mention this plan, its steps, or the story.

### The position

**Ply 9, green to move, two actions remaining, nothing moved.** (Green takes
odd plies. Ply 9 puts return position 1 on **L1** — the ring starts at H15 on
ply 1 and drifts one bay counter-clockwise per ply.)

Seed: any fixed literal, e.g. `20260818`, so a reload replays the same draws.

**Sites** — five active or charged, as §8.1 requires: **K5 charged with
`enteredOnPly` 5** (so it has plenty of life left and no clock fires during a
gate); **E5, H8, E11, K11 active**; the other twelve dormant with `enteredOnPly` 0.

**Green** — `green-1` **J4** with **4 shields**; `green-2` **G9** with **1**;
`green-3` **C6** with **2**; `green-4` **A6** (bay) with 0; `green-5` **H1**
(bay) with 0; `green-6` **O6** (bay) with 0; `green-7` **D15** (bay) with 0.

**Red** — `red-1` **O10** (bay) with 0; `red-2` **K5** with **0** (standing on
the charged node); `red-3` **H9** with **3**; `red-4` **L1** (bay) with 0;
`red-5` **C7** with **2**; `red-6` **A10** (bay) with 0; `red-7` **A14** (bay)
with 0.

### What the position is for

- **A fight green wins** — `green-1` (J4, 4) attacks `red-2` (K5, 0)
  **diagonally**: green wins, pays 1 shield, ends on 3; `red-2` goes home.
- **Taking the node in two actions** — with 3 shields `green-1` may now step one
  square **diagonally** onto the vacated, still-charged **K5**, which it could
  not do at 4. The shields burned in the fight are exactly what unlocks the
  follow-up, which is the case §7's closing paragraph describes.
- **A fight green loses on purpose** — `green-2` (G9, 1) attacks `red-3` (H9,
  3): the defender wins, keeps 1, and the attacker goes home.
- **A mutual return** — `green-3` (C6, 2) attacks `red-5` (C7, 2): both go home
  at 0, attacker's bay first.
- **The return cues split apart** — return position 1 is **L1**, which `red-4`
  occupies, so the receptacle is a different bay: L1 → H1 (`green-5`) → **D1**,
  the first empty one.
- **The receptacle moves mid-turn** — moving `green-5` out of the **H1** bay
  (for example to H2) makes H1 the first empty bay, so the outline marker jumps
  there between the turn's two actions.
- **A ship that has moved can still attack** — `green-1` may step **J4 → J5**
  (one square orthogonally, all a 4-shield ship has), which keeps it adjacent to
  `red-2` on K5, and must then still be selectable and show a target.

Verify this arithmetic before finishing, with a throwaway script deleted
immediately afterwards: the three attacking pairs are legal targets; `green-1`
has no diagonal destination at 4 shields and does have one at 3; J4 → J5 is
legal and leaves K5 adjacent; `green-5` has a legal destination out of H1; the
receptacle in this position is D1; no green ship is stranded. Record any square
that had to move, and why, in this step's Notes.

### Constraints, all load-bearing

- It lives in `src/game/`, **never** `src/rules/`.
- **No automated test anywhere may depend on it.** Every test builds its own
  position; `src/App.test.tsx` in particular must keep asserting only the shell.
  If an existing test breaks when the fixture goes in, that test was reading the
  app's initial position and must be rewritten to build its own — otherwise Step
  17 would take the coverage with it.
- Keep it a plain data module: no route, no query parameter, no
  `import.meta.env` branch.

Depends on: Steps 9–12 (everything the gates look at is built).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm run build` all pass **with no test changed to
accommodate the fixture**. Confirm by inspection that nothing outside
`src/game/reviewFixture.ts` and the one call site in `src/App.tsx` mentions it.

---

## Step 14 — Manual gate: fights, all three ways, and taking a node

Status: pending

No code. `story.md`'s manual gates 1 and 2, taken against the Step 13 fixture.

Depends on: Step 13.

Verification (manual): run `npm run dev` and open `http://localhost:5273`.
**Reload before each check** — the fixture resets on reload, and actions already
taken do not undo. Confirm all of:

1. **A fight won.** Select green **J4** (4 shields) and activate red **K5** (0
   shields, on the charged node). The green ship **holds its ground** — it does
   not advance — the red ship is gone from K5, it is standing in the **D1** bay
   with no shields, and the green ship is now on **3** shields (the fight cost
   one more than the loser was carrying).
2. **The node is not taken by winning.** K5 is empty and **still charged**, its
   clock unchanged. Nothing was claimed by the fight.
3. **Taking the node with the second action.** Still in the same turn, select
   the green ship on J4 again and move it **diagonally** onto **K5**. It was
   unable to move diagonally before the fight, at 4 shields, and can now, at 3 —
   the burned shields are what unlocked it. (If it is not offered as a
   destination, that is a failure of this gate, not a quirk.)
4. **A fight lost on purpose.** Reload. Select green **G9** (1 shield) and
   activate red **H9** (3 shields). The **attacker** is beaten and goes to a bay
   at 0; the **defender** stays where it is and drops to 1 shield. Confirm the
   board and the announcement read as a deliberate trade, not as a bug — this is
   the outcome most easily implemented backwards.
5. **A draw.** Reload. Select green **C6** (2 shields) and activate red **C7**
   (2 shields). Both ships go home at 0 shields, the attacker placed first
   (**D1**), the defender in the next empty bay (**A2**), and both squares are
   left empty.
6. **A beaten ship is not spent.** After the mutual return, the green ship now
   sitting in its bay can still be selected and moved as the turn's second
   action.

If a check fails, record what was seen in this step's Notes before any fix.

---

## Step 15 — Manual gate: the cues, on screen

Status: pending

No code. `story.md`'s manual gates 3 and 4, taken against the Step 13 fixture.

Depends on: Step 13. (Independent of Step 14; take them in either order.)

Verification (manual): run `npm run dev`, open `http://localhost:5273`, and
confirm:

1. **Position 1 is marked all game.** The **L1** bay carries the solid corner
   triangles from the moment the board loads, whether or not a ship is standing
   on it, and with nothing selected.
2. **The receptacle is somewhere else.** Because L1 and H1 are occupied, the
   **outline** triangles are on **D1**. The two treatments are tellable apart at
   a glance, including in greyscale (browser devtools greyscale emulation or the
   OS colour filter).
3. **The receptacle is live.** Move green **H1** out of its bay as the turn's
   first action. The outline triangles move to **H1** immediately, mid-turn,
   without waiting for the turn to end.
4. **The drift.** Play a few turns (any legal actions will do) and confirm the
   solid triangles move **one bay counter-clockwise** at the end of every turn —
   L1 → O2 → O6 and so on — including at the end of a turn in which nothing much
   happened.
5. **The coincidence case.** Play on until position 1 lands on an **empty** bay.
   It is then also the receptacle: confirm the solid mark alone is what is drawn,
   that it does not look broken or ambiguous, and that the square still reads
   sensibly. If drawing both would genuinely be clearer, that is a finding for
   the Notes, not a licence to redesign here.
6. **Destinations and targets, told apart.** Select green **J4**, which is next
   to red **K5**. The four destination discs and the one target ring are
   distinguishable **at a glance** and in greyscale; nothing suggests you could
   move onto the enemy's square.
7. **A ship that has moved.** Move green **J4** one square north to **J5**, then
   select it again. It **selects normally**, shows its target on K5 and **no
   destinations**, and is drawn at full strength — not faded. Its "already
   moved" bar is visible at the top of its square and reads as a fact about the
   ship rather than as damage.
8. **Moved and out of actions together.** Find or make a ship that has moved and
   has no target (any bay ship that has moved will do). It is faded, and carries
   **both** marks — the solid bar at the top, the hollow bar at the bottom —
   without them colliding.

If a check fails, record what was seen in this step's Notes before any fix.

---

## Step 16 — Manual gate: screen reader

Status: pending

No code. `story.md`'s manual gate 5, taken against the Step 13 fixture with a
real screen reader (not the accessibility tree inspector — this gate exists to
hear the wording read aloud).

Depends on: Step 13.

Verification (manual): with the dev server running and a screen reader on,
confirm:

1. **The live region reads all three outcomes** — a win, a loss and a mutual
   return — each naming who struck whom, **which bay** the beaten ship went to,
   and **what the fight cost** in shields, in wording that makes sense heard
   rather than read.
2. **The losing attack** is unmistakably a thing the player did, not an error.
3. **The new refusals explain themselves**: attacking from a bay, attacking a
   ship in a bay, attacking out of range, and attacking while a ship owes an
   action. (For the last one, a stranded ship is easiest to reach by playing on
   until K5's node runs out under a ship.)
4. **The return marks are audible**: tab to **L1** and hear "return position 1";
   tab to the receptacle bay and hear "next bay for a beaten ship"; when the two
   coincide, hear **both**.
5. **The predicted outcome earns its place.** Select a ship next to an enemy and
   tab across its targets. The square's name ends with "can attack here, your
   ship would win" (or lose, or both return). Judge honestly whether that is
   genuinely useful **spoken at the end of an already long name**, or whether a
   listener has stopped waiting by then. If it does not earn its place, record
   that in the Notes as a finding — a shorter phrasing, a different position in
   the name, or dropping it — rather than changing it here.

If a check fails, record what was heard in this step's Notes before any fix.

---

## Step 17 — Remove the fixture

Status: pending

Delete `src/game/reviewFixture.ts` and return `src/App.tsx` to building its
initial session from `startingGameState(...)` with a seed drawn from
`src/game/seed.ts`. Nothing else changes.

After this the app opens on the real starting position again: fourteen ships in
their bays on 0 shields, five active sites and twelve dormant, green to move on
ply 1 with two actions — and return position 1 on **H15**, as §7.1 fixes it for
the first turn.

Do **not** remove or weaken any test added by Steps 1–12. None depends on the
fixture, and together they are the only coverage of everything the starting
position cannot show quickly.

Depends on: Steps 14, 15 and 16 — every gate that needs the fixture has been
taken.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm run build` all pass, and:

1. A repository-wide search for `reviewFixture` and for its exported name
   returns nothing outside `doc/`.
2. A test asserts the shipped starting position still includes return position 1
   at **H15** (from Step 3).

---

## Step 18 — Manual gate: the shipped board

Status: pending

No code. A short last look at what a player will actually open, with the fixture
gone.

Depends on: Step 17.

Verification (manual): run `npm run dev`, open `http://localhost:5273`, and
confirm:

1. The real starting position is on screen: fourteen ships one per bay with no
   shields, five active sites and twelve dormant, "Green's turn — 2 actions
   left".
2. **H15 carries the solid return-position triangles**, and — because H15 holds
   a ship at the start — the outline receptacle triangles are on the first empty
   bay clockwise from it.
3. A game plays from it: select a ship, move it, and confirm nothing of the
   fixture or of the pre-story board is out of place.
4. Two ships can be manoeuvred into contact and a fight fought from the real
   starting position, at 0 shields on both sides — a mutual return — without
   anything reading oddly.

---

## Step 19 — README check

Status: pending

`README.md` currently tells the player, in as many words, that "there is still
no fighting", and its rules paragraph says "one detail is deliberately left
open, and is listed at the end of the rulebook". **Both are now false.** Update
it

**Owner's decision: the README is updated only here, at the end.** Step 1
invalidates the Appendix A sentence and it stays wrong until this step, which
is accepted deliberately. The README is a player-facing document, not a working
document for this pipeline, and it should be written once the final fallout of
every decision taken along the way is known — not patched step by step to keep
an unshipped branch internally tidy. A review finding that Step 1 left the
README stale is answered by this paragraph.

Update it — the `/update-readme` command reviews the branch diff and does this — so it
says what the app now does:

- ships can **fight**: an attack is one of the two things a ship can do on a
  turn, the ship with more shields wins, winning burns shields, and the beaten
  ship is pushed back to a bay with none;
- the bay a beaten ship returns to **moves around the board** as the game goes
  on, and the board shows where it is;
- a ship that has already moved can still attack.

Keep it truthful about what is still missing: **nothing is scored yet** and the
game does not end.

Fix the rules paragraph too: Appendix A no longer lists an open item (Step 1
closed the last one), so the sentence claiming one detail is left open must go
or be rewritten. The README carries no rules version number, so the 0.6 bump
itself needs no change there — check that this is still true rather than
assuming it.

Player-facing text: "turn" and "node", written for a non-technical reader; never
"ply" or "hub".

Depends on: Steps 1–17 (everything the README would describe is built and the
fixture is gone).

Verification (automated): `npm run format:check` passes (prettier formats
markdown), and `npm run typecheck`, `npm run lint`, `npm test` and
`npm run build` are all green. Confirm by reading that the status paragraph
describes the app as it now behaves, claims nothing the app does not do, and
that no sentence still points at an open item in Appendix A.
