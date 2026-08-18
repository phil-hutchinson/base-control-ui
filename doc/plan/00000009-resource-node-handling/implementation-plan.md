# Implementation Plan — 00000009 Nodes: waking, charging, depleting

This plan turns [`story.md`](./story.md) into an ordered sequence of steps. Each
step is implemented, verified and committed on its own, by an agent that has
read only `story.md`, this plan, and its own step. Everything a step needs is
stated here.

## What this story builds

The board starts changing on its own. A ship touching an **active** site
charges it (§8.2); a charged node pays the moving player's ships a shield at
the end of their turn (§8.7 step 1, §4.1); a charged node runs out after nine
turns and goes **depleted** (§8.3); a fresh **dormant** site is drawn at random
to replace it (§8.6); a depleted site cools for nine turns and returns to the
dormant pool; and a ship left standing on a dead site is **stranded** and owes
its owner an action (§8.5).

Three pieces of machinery arrive to make that possible: a **seeded random
generator** (so a recorded game replays exactly), a **ply counter**, and the
**§8.7 end-of-turn sequence** — replacing today's bare side-swap.

The board gains two things the player can see: the node states now actually
change while they watch, and the ship-marking layer learns to say **"this ship
has no action available"** and **"this ship owes an action"**.

**One rule changes** (Step 1): §8.5 currently calls only a ship on a _depleted_
site stranded, and this story extends that to a ship on a _dormant_ site as
well. That is a rules edit, a version bump to **0.4**, and a changelog entry,
in their own commit, ahead of everything that depends on it.

Nothing scores. §8.4 influence stays out (§8.7's step 2 is a documented empty
slot), combat stays out (so is §8.7's step 6), and the ply counter is not read
by any end-of-game check. See `story.md`'s "Out of scope".

## Sources of truth

- **The rules.** [`doc/ruleset/rules.md`](../../ruleset/rules.md), at **version
  0.3** when this plan was written and **0.4** from Step 1 onwards. The
  sections implemented here are **§4.1** (the shield gained for standing on a
  node, capped at 4), **§8.1** (the four states and the five-sites invariant),
  **§8.2** (waking on touch), **§8.3** (the nine-turn life), **§8.5**
  (stranded ships), **§8.6** (the random replacement and the nine-turn
  cooldown), **§8.7** (the end-of-turn order and the empty-pool safety net) and
  **Appendix B** (the guard test the document asks the app for). Where the app
  and the document disagree, the document is right.
- **This story changes exactly one rule** — the §8.5 clarification in Step 1.
  No other step may touch `doc/ruleset/rules.md`, `doc/ruleset/changelog.md` or
  `RULES_VERSION`. If a later step turns up what looks like another rules
  ambiguity, **stop and raise it with the owner**; do not settle it in code.
- **No rules tag.** Tagging is on hold until the game plays (CLAUDE.md). Bump
  the version and write the changelog entry; do not run `/tag-rules`.
- **The conventions.** [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) — in
  particular:
  - the **DOM test recipe**: `// @vitest-environment jsdom` as the file's first
    line, a per-file `import "@testing-library/jest-dom/vitest";`, `cleanup` in
    an `afterEach`, and axe run with the `color-contrast` rule disabled (jsdom
    has no layout or canvas);
  - **keep logic out of components** — every rule, every derived predicate and
    every piece of player-facing wording belongs in a plain module with plain
    unit tests;
  - **`Math.random` is banned by lint** (`no-restricted-properties`). The
    seeded generator this story adds is the only randomness in the app.
  - **Comment style**: short module headers saying what a module is for. **No
    story numbers, no plan-step references, no design history in code** — that
    material belongs in this document, and a peer review treats it as a finding
    when it leaks into `src/`.
- **The vocabulary** (CLAUDE.md). Code, tests and this plan say **ply** and
  **hub/site**; player-facing text — accessible names, live-region sentences,
  `README.md` — says **turn** and **node**. **Move** means one ship changing
  squares and never means a ply.

## What is already in place

- `src/rules/board.ts` — `Square` (`{ column, row }`), `squareAt`,
  `squareName`, `squareFromName`, `COLUMN_LETTERS`, `BOARD_SIZE` (15).
- `src/rules/sites.ts` — the seventeen `SITES` in §3.2 order, the
  `SiteState` union (`"dormant" | "active" | "charged" | "depleted"`), the five
  `STARTING_ACTIVE_SITES`, and `startingSiteState(square)`.
- `src/rules/fleet.ts` — `Side`, `ShipId`, `FleetEntry`, the fourteen-ship
  `STARTING_FLEET` (ids `green-1`…`green-7`, `red-1`…`red-7`).
- `src/rules/shields.ts` — `ShieldCount` (0–4), `MIN_SHIELDS`, `MAX_SHIELDS`,
  `isShieldCount`. Nothing in the app gains or loses a shield except the bay
  reset.
- `src/rules/gameState.ts` — `Ship` (`id`, `side`, `square`, `shields`),
  `GameState` (`ships`, `siteStates` as a square-name-keyed
  `Record<string, SiteState>`, `sideToMove`, `actionsRemaining`,
  `movedThisPly`), `ACTIONS_PER_PLY` (2), `startingGameState()`,
  `shipsBySquare(state)` and `siteStateAt(state, square)`. **No ply counter and
  no seed.**
- `src/rules/movement.ts` — §6 in full: `reachFrom(origin, shields)` returning
  `{ destination, passedOver }` entries, `MoveRefusalReason` (a plain string
  union), `moveRefusalReason(state, shipId, destination)`,
  `legalDestinations(state, shipId)` and `sideToMoveHasLegalMove(state)`. The
  ban on **ending** a move on a dormant or depleted site lives here; `reachFrom`
  already reports the squares a move **passes over**, which is what §8.2's
  fly-over wake needs.
- `src/rules/ply.ts` — `applyMove(state, shipId, destination)` returning
  `{ outcome: "applied", state, effects }` or `{ outcome: "refused", reason }`;
  `applyPassGuard(state)`; the `MoveEffect` union (`shields-reset`,
  `ply-ended`, `ply-passed`); `PassEffect`. Applying a move is the only thing
  that changes the game state today, and swapping sides is the only thing that
  happens at the end of a ply.
- `src/game/session.ts` — `Session` (`state`, `selectedShipId`, `lastEvent`),
  `SessionIntent` (`activate` / `dismiss`), the `SessionEvent` union
  (`selected`, `selection-cleared`, `moved`, `PassEffect`, `rejected`),
  `createSession(state)` and the pure `sessionReducer`.
- `src/board/announcements.ts` — `announcementFor(event)` (the live region's
  sentence) and `turnIndicatorText(state)`. All player-facing wording lives
  here; the rules layer never builds a sentence.
- `src/board/squareLabel.ts` — `squareLabel({ square, isBay, siteState,
occupant, mark })`, building a comma-separated accessible name, and
  `SquareMark` (`"selected" | "destination" | "already-moved"`), a single
  mutually-exclusive slot.
- `src/board/BoardSquare.tsx` / `.css` — the stacked square contents: site
  marker, ship, and one of three markings (destination disc, selected
  brackets, spent bar). A ship that has already moved is drawn at
  `--spent-opacity` (0.45) **and** barred, so "spent" is never a lightness
  accident.
- `src/board/SiteMarker.tsx` — all four site states already drawn
  distinguishably (dashed / solid / double / dotted rings, so they read in
  greyscale). **This story does not restyle it.**
- `src/board/Board.tsx` — builds the 225 cell descriptors from the session on
  every change, deciding each square's mark and accessible name.
- Tests live beside the code they cover. `src/rules/siteSpacing.test.ts`
  already asserts the §3.2 property that **no single legal move can touch two
  sites**.

## Where the code goes

| Path                         | Change                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `doc/ruleset/rules.md`       | §8.5: a ship on a **dormant** site is stranded too; version → 0.4 (Step 1 only)     |
| `doc/ruleset/changelog.md`   | the 0.4 entry (Step 1 only)                                                         |
| `src/rules/rulesVersion.ts`  | `RULES_VERSION` → `"0.4"` (Step 1 only)                                             |
| `src/rules/random.ts`        | **new** — the seeded `mulberry32` step and a uniform index draw                     |
| `src/rules/sites.ts`         | the nine-ply clock constants and the pure elapsed/finished helpers                  |
| `src/rules/gameState.ts`     | `SiteStatus` (state + the ply it was entered on), `plyNumber`, `randomSeed`         |
| `src/rules/nodes.ts`         | **new** — §8.2 waking on touch, and §8.6's draw from the dormant pool               |
| `src/rules/endOfTurn.ts`     | **new** — §8.7's six steps, in order, and the `EndOfTurnEffect` union               |
| `src/rules/ply.ts`           | runs the end-of-turn sequence at a ply's end and on a pass; counts plies            |
| `src/rules/stranded.ts`      | **new** — §8.5's owed-action rule: who owes, and whether the obligation binds       |
| `src/rules/movement.ts`      | a new refusal reason for the owed action, and the split that avoids recursion       |
| `src/game/seed.ts`           | **new** — where the app's opening seed comes from (outside the rules layer)         |
| `src/game/session.ts`        | carries the new effects through to the board unchanged in shape                     |
| `src/board/announcements.ts` | wording for every new effect and for the new refusal                                |
| `src/board/squareLabel.ts`   | two slots: the selection mark, and the ship's condition                             |
| `src/board/BoardSquare.tsx`  | the generalised dampened shade, three ship-condition marks, the blink               |
| `src/board/BoardSquare.css`  | the dampened shade, the blink keyframes, the reduced-motion switch                  |
| `src/board/Board.tsx`        | works out each ship's condition and passes it to the square and the label           |
| `src/game/reviewFixture.ts`  | **new and temporary** — the position the manual gates are taken from (Steps 12, 16) |
| `README.md`                  | the status paragraph, which currently says nodes never wake (Step 18)               |

## Decisions taken at plan time

`story.md` closes with seven open items and defers several shapes to "a running
board". All of them are settled here, with the reasoning, because the code will
not carry it.

### 1. The rules edit comes first, and it is the only one

§8.5 says the one way a ship ends up on a dead site is by holding a node until
its clock runs out, which puts it on a **depleted** site — but nine turns later
that same site cools down to **dormant** underneath a ship that has not moved,
and §6 forbids ending a move on either. The owner has ruled that the ship is
equally stuck in both states and owes an action in both. That is a change to
how the game is played, so it is a rules edit with a version bump and a
changelog entry, in its own commit, before any code depends on it (CLAUDE.md,
and the implementation-plan guide's "Check the rules document").

Rejected: implementing the dormant case in code and calling it an
interpretation of the existing §8.5. The document is the source of truth; code
that carries a rule the document does not state is a bug by definition.

### 2. `mulberry32`, written here, threaded through the state

`src/rules/random.ts` holds a ten-line, pure implementation of the published
`mulberry32` step: **a seed in, a `[value, nextSeed]` pair out**, with the value
a float in `[0, 1)` and the seed a 32-bit unsigned integer. `GameState` carries
the current seed as one number.

- **Written, not depended on.** The project has no runtime dependency beyond
  React, and a ten-line well-known generator is quicker to unit-test than a
  package is to justify. Its statistical quality is far beyond what choosing
  one of seven sites needs.
- **Pure, not stateful.** A generator object would make `GameState`
  non-serialisable and would drop a hidden mutable into a rules layer that is
  otherwise plain readonly data. Threading the seed also means every state in a
  game record is complete on its own.
- **Seeds are normalised to 32-bit unsigned** on the way out (`>>> 0`), so the
  number stored in state is always a plain non-negative integer that survives a
  round trip through JSON.
- A second export draws a **uniform index** in `[0, count)` from a seed,
  returning `[index, nextSeed]`, so callers never re-derive `Math.floor(value *
count)` and the bounds check lives in one place.

### 3. The opening seed comes from `crypto`, outside the rules layer

`src/game/seed.ts` exports a function returning a fresh 32-bit seed from
`crypto.getRandomValues`. It lives in `src/game/`, **not** `src/rules/`, and
nothing in `src/rules/` ever calls it: the rules layer is a pure function of the
state it is given, which is what lets a future engine, a replay, or a test drive
it deterministically.

`startingGameState` takes the seed as a **required argument**. Rejected
alternatives: a default fixed seed (every game would open identically, and the
bug would be invisible), and `Date.now()` (coarse, correlated between two
players opening the app at once, and no cheaper than `crypto`). `Math.random`
is banned by lint precisely so this decision has to be made deliberately.
Every test passes an explicit seed.

### 4. Site clocks are stored as the ply the site entered its state

`GameState.siteStates` changes from `Record<string, SiteState>` to
`Record<string, SiteStatus>`, where a `SiteStatus` is the site's state **plus
the ply number on which it entered that state** (`enteredOnPly`, `0` for the
states the sites start the game in). The remaining life of a charged node and
the remaining cooldown of a depleted site are **derived** from that number and
the current ply, never stored.

Reasoning, against the alternative of per-site countdowns decremented each ply:

- One clock (`plyNumber`) instead of up to seventeen, so no counter can drift
  out of step with the state it belongs to.
- The empty-pool safety net needs "the site depleted longest", which is a
  direct minimum over `enteredOnPly`; with countdowns it is an inverted
  comparison that reads backwards.
- Displaying a countdown later (deliberately not done now — decision 14) is a
  pure derivation from data already present.
- The invariant "a charged or depleted site has a clock; an active or dormant
  one does not" becomes structural rather than a paired-record convention,
  because the state and its clock are the same object.

`enteredOnPly` is recorded for all four states, not just the two with clocks:
it is uniform, it is never wrong, and "how long has this site been like this"
is a sensible question for any state. Only the charged and depleted derivations
consult it.

`siteStateAt(state, square)` keeps its present signature (`SiteState |
undefined`), so `movement.ts` and `Board.tsx` do not change; a new
`siteStatusAt` returns the pair for the code that needs the clock.

### 5. The clock arithmetic, stated once

Plies are numbered from **1** and green takes the odd ones. `plyNumber` is the
ply currently being played.

- A site woken during ply _N_ becomes charged with `enteredOnPly = N`. It is
  charged for plies _N_ … _N+8_ — **nine turns counting the turn it was woken**
  (§8.3). At end-of-turn step 4 on ply _P_ it depletes when
  `P - enteredOnPly + 1 >= 9`.
- It becomes depleted with `enteredOnPly = N+8`. **The cooldown does not count
  the ply on which it depleted**: at end-of-turn step 3 on ply _Q_ it goes
  dormant when `Q - enteredOnPly >= 9`, so it is dormant again during step 3 of
  ply _N+17_ — in time to be drawn by step 5 of that same ply, which is the
  ordering §8.7 calls out deliberately.
- Total: **eighteen plies unavailable from the moment of waking**, which is the
  figure Appendix B's sizing arithmetic rests on.

Both properties §8.3 names fall out of this and are tested as such: a player
who wakes a node on ply _N_ and sits on it collects on plies _N_, _N+2_, _N+4_,
_N+6_, _N+8_ — **five times** — and _N+8_ is the waker's own ply, so the
replacement wakes at the end of it and the **opponent moves next**.

The two nines live in `src/rules/sites.ts` as named constants beside the state
union, with the two pure "has it finished" predicates, so §8.3 and §8.6 are
transcribed in one place and every other module asks rather than counts.

### 6. A ply counter, incremented at every ply end — including a pass

`GameState` gains `plyNumber`, starting at 1. It increments when a ply ends:
when the second action is spent, and when the §5 pass guard fires. The invariant
"green moves on odd plies" follows automatically and is tested.

**A passed ply is still a turn**, so the end-of-turn sequence runs for it: the
clocks tick, and the passing player's ships on charged nodes gain their shield
at step 1. This is a judgement call on a case that barely occurs (the passing
player would need a pinned ship on a charged node), and it is settled this way
because §8.3 says the clock runs down "whether or not any ship is standing on
it" and §8.7 attaches the sequence to the end of a turn, not to the spending of
an action. It is flagged as the one place the document is silent.

Note the existing shape: `applyPassGuard` runs after **every** move, not only
at a ply's end, so a player whose second action has no legal move forfeits it
and their ply ends there — which now also runs the end-of-turn sequence. That
is correct and pre-existing; do not change it. The guard still passes at most
once, never bouncing back.

### 7. Module layout: the sequence gets its own home, `ply.ts` stays thin

- `src/rules/random.ts` — the generator. Knows nothing about the game.
- `src/rules/sites.ts` — the clock constants and derivations (existing module).
- `src/rules/nodes.ts` — **§8.2 waking on touch** and **§8.6's draw**: the two
  site-state transitions that are not the plain passage of time. Pure functions
  from a state (plus a path, or plus a count) to a new state and effects.
- `src/rules/endOfTurn.ts` — **§8.7's six steps in order**, with steps 2
  (influence) and 6 (bay return) present as documented empty slots naming the
  story that will fill them. The order is load-bearing and the document is
  explicit about why; a four-step sequence that later has to be re-derived is
  exactly what this avoids.
- `src/rules/stranded.ts` — §8.5's owed-action rule.
- `src/rules/ply.ts` — unchanged in role: apply a move, spend an action, call
  the sequence when the ply ends, pass when there is nothing legal.

### 8. Structured effects, and how they reach the wording

Nothing in `src/rules/` ever builds a sentence. Every new event is a structured
effect; `src/board/announcements.ts` decides the words.

- **`src/rules/nodes.ts`** exports a `site-charged` effect for §8.2: the square,
  the ship and side that touched it, and whether it was reached by landing on it
  or by flying over it (the two need different sentences).
- **`src/rules/endOfTurn.ts`** exports an `EndOfTurnEffect` union:
  `shield-gained` (ship, side, square, the resulting count), `site-cooled`
  (step 3), `node-ran-out` (step 4), `ship-stranded` (a ship standing on a node
  that just ran out), and `site-woken` (step 5: the square and whether it woke
  **active** or, because a ship was standing on it, **charged**).
- **The two ply-ending effects nest their sequence.** `ply-ended` and
  `ply-passed` each carry the `EndOfTurnEffect[]` produced by the sequence that
  ran with them. This keeps `applyMove`'s effect list chronological and
  unambiguous even in the case where one move ends a ply **and** the side
  passed to has no legal move (two sequences in one move), and it means
  `PassEffect` — which is also a standalone `SessionEvent` — carries everything
  needed to announce itself. Rejected: one flat list, which loses which
  sequence an effect belonged to.
- **`site-cooled` is modelled but not spoken.** A depleted site quietly
  returning to the dormant pool is a board change, not a player event, and up
  to five can happen in one ply; announcing them would bury the events that
  matter. The square's accessible name still reports the new state. This is a
  wording judgement the owner can revisit cheaply — the effect exists.
- **Shield gains are grouped in the wording.** All of a sequence's
  `shield-gained` effects are produced together at step 1, and the sentence
  names the squares once rather than repeating a clause per ship.
- **The empty-pool safety net emits no special effect.** The site it forces
  back to dormant emits the ordinary `site-cooled`, because that is what
  happened to it. The Appendix B guard (Step 7) detects the net by watching the
  size of the dormant pool, not by watching for an effect.

### 9. Waking happens inside the move, not at the end of the ply

§8.2 says "the moment a ship touches it". `applyMove` charges every **active**
site among the destination and the squares passed over, immediately, before the
ply is examined for its end. Deferring it to §8.7 would give a different game:
a node woken by a fly-over would not be charged in time to pay its waker a
shield on the same turn, and §8.3's five-collections figure would be wrong.

A ship that lands on an active site therefore charges it **and gains its first
shield from it at the end of that same ply**.

Only an `active` site is affected. Touching a charged, depleted or dormant site
does nothing (dormant and depleted cannot be landed on at all, but they can be
flown over). The §3.2 spacing property means no single legal move can touch two
sites — `siteSpacing.test.ts` asserts it — but the code loops over the whole
path anyway rather than assuming it, because that assumption belongs to the
site layout, not to this module.

### 10. The replacement draw

At step 5, one draw is made **for each node that ran out at step 4**, in the
order those nodes are listed:

- The pool is every **dormant** site, in `SITES` order, so the draw is a
  function of the seed alone and not of object-key ordering.
- The index is drawn uniformly from `src/rules/random.ts`, and the seed
  advances with each draw, so several draws in one ply are **without
  replacement** (each drawn site leaves the pool before the next draw).
- A drawn site becomes **active** — unless a ship is standing on it, in which
  case §8.5's final paragraph applies and it becomes **charged** immediately,
  with `enteredOnPly` set to the current ply so its nine turns start at once.
- **The safety net.** Should the pool be empty when a draw is needed, the site
  that has been depleted longest (the smallest `enteredOnPly`; ties broken by
  `SITES` order, so the outcome is deterministic) goes back to dormant first,
  and the draw then proceeds. §8.7 calls this a safety net a correctly sized
  board never needs, and Step 7 exists to prove that.

The five-sites invariant (§8.1) is the post-condition of the whole sequence and
is asserted directly.

### 11. §8.5's owed action is a rule, in the rules layer

`src/rules/stranded.ts` answers two questions about the side to move:

- **Which ships owe an action**: the moving side's ships that are standing on a
  **dormant or depleted** site, have **not yet moved this ply**, and have **at
  least one legal move**. A stranded ship with no legal move at all drops out —
  §8.5 waives the requirement rather than obliging the player to shuffle
  blockers aside.
- **Whether the obligation binds right now**: it does when that count is **at
  least `actionsRemaining`**. This yields §8.5's stated cases exactly — one
  stranded ship leaves the first action free and forces the second; two force
  both; three or more mean the player clears two of their choice and the rest
  wait.

Both are recomputed at **each action**, not fixed at the start of the ply, so a
stranded ship whose only legal move disappears mid-ply correctly stops binding.

`moveRefusalReason` gains a reason for moving a ship other than an owed one
while the obligation binds. It is checked **immediately after
`ship-already-moved`** and before anything about the destination, because the
objection is to the _ship_, not the square: a player who picks the wrong ship
should be told that, not "out of range".

**The recursion trap — read this before implementing Step 8.** The owed set
asks whether a ship has a legal move, which today means calling
`legalDestinations` → `moveRefusalReason` → the owed set → … . Break the cycle
by splitting `moveRefusalReason` into the existing §6 checks (which know
nothing about §8.5) and a wrapper that adds the owed-action check;
`stranded.ts` uses the §6-only half. The public `moveRefusalReason` and
`legalDestinations` keep their present names and meanings, so `Board.tsx` and
`session.ts` automatically respect the obligation.

`sideToMoveHasLegalMove` (the §5 pass guard) keeps using the §6-only half. Its
answer cannot change: the obligation only binds when at least one ship with a
legal move exists, so a side that can move can still move. Tested explicitly.

**Selection is not refused.** A player may still select a ship that cannot
move — the session already allows selecting a pinned ship and announces "0
moves available" — and the refusal arrives when they try to move it. Putting a
rule into the selection path would move §8.5 out of the rules layer, and the
board's blinking mark (decision 13) is what tells the player which ship to pick
_before_ they pick wrongly.

**The refusal wording carries no square.** `MoveRefusalReason` is a plain
string union today and stays one, so the sentence cannot name which ship is
stranded. That is acceptable because the board marks the ship, and it keeps the
rules layer free of wording data.

### 12. The accessible name gets two slots, not a third mark

`SquareMark` holds one mutually-exclusive slot today, and this story needs a
ship condition that can coexist with it: a stranded ship can be the selected
one, and a pinned ship with no destinations can be selected too. So the
descriptor splits in two:

- **`SquareMark`** — the selection layer: `"selected" | "destination"`. Still
  mutually exclusive; both are about the current selection.
- **`ShipCondition`** — the ship's own status for the side to move:
  `"already-moved" | "no-action" | "owes-action"`. Mutually exclusive with each
  other, independent of the mark.

The accessible name keeps its existing order and gains the condition just
before the mark: square, bay-or-site, ship, shields, **condition**, mark.
Wording (players' vocabulary, so "turn" and "node"): "already moved this turn",
"no action available this turn", "stranded, must move this turn". Exact phrasing
is the implementer's to finish, in the tests, within those constraints.

### 13. The dampened shade means "no legal action available"

The fade currently says "this ship has already moved this ply". It generalises
to **"this ship has no legal action available"**, which folds in three cases:
the ship has already moved, the obligation binds elsewhere in the fleet, and
the ship is pinned by other ships with nowhere legal to go.

- **The wording is deliberately "action", not "move".** Today they mean the
  same thing, because every action is a move — §7 does not exist yet. They part
  company the moment combat arrives: a ship that has already moved may still
  have an attack available and must **not** be dampened. Defining the shade
  this way now is what stops the combat story having to re-derive it. When
  attacks land, the predicate becomes "no legal move **and** no legal attack";
  nothing else about this layer should need to change.
- **Only the side to move is ever dampened.** An opponent's ship has no action
  available on this ply by definition; dampening all seven would be absurd and
  would make the shade meaningless. The fade says "not this one **of yours**".
- **A ship that owes an action blinks** between the full and dampened shades,
  **from the start of the ply**, not from the moment the obligation binds —
  with one stranded ship the first action is genuinely free, and warning the
  player before they spend it is the whole point. It carries a **static mark**
  as well, and the blink is dropped entirely under `prefers-reduced-motion`
  (the app has no other animation, this one persists until the player acts —
  well past the five seconds WCAG 2.2.2 concerns itself with — so it needs both
  an alternative and an off switch). No state in this app is ever carried by
  motion alone.
- **The rest of the fleet dampens only when the obligation actually binds.**
  This falls out for free: once the obligation binds, `legalDestinations`
  returns nothing for a non-owed ship, so the same "no legal action" predicate
  covers it. Dampening them earlier would contradict §8.5, which leaves the
  first action free when one ship is stranded.

### 14. The three ship-condition marks, and the blink's shape

The mark layer must keep the _reason_ distinguishable, in shape rather than in
colour, so it survives greyscale — the standard `BoardSquare` already holds
itself to. Starting shapes, all in the existing `0 0 100 100` viewBox, to be
settled by eye at the Step 14 gate:

- **already moved** — the existing solid bar near the bottom edge. Unchanged.
- **no action available** — the same bar, **hollow** (outlined, unfilled). Same
  family, different reason: both say "not this one", and the difference is why.
- **owes an action** — a **chevron pointing at the ship** near the bottom edge,
  in the interaction accent, reading as "this one" rather than "not this one".

The blink: the ship icon's opacity alternating between full and the dampened
value, **~1.4 s per cycle, ease-in-out, travelling the full distance between
the two shades**, and `animation: none` with the ship at full opacity under
`@media (prefers-reduced-motion: reduce)`. Fast enough to read as a summons,
slow enough to sit with for a whole ply. Rate, easing and travel are all to be
adjusted against the running board at Step 14 and the final values recorded in
that step's Notes — jsdom has no layout or animation, so no test can settle
them.

### 15. No countdown is displayed

Neither charged nor depleted sites show how many turns they have left. The
owner has ruled this out for now: a player can count turns, and the board is
busy enough. This is a display decision only — the numbers are derivable from
state (decision 4), so showing them later is a small change. `SiteMarker` is
not restyled by this story at all.

### 16. A temporary fixture carries the manual gates, and is removed afterwards

Watching a node cycle from the real starting position means playing a dozen
plies before anything interesting happens, and every gate would have to repeat
it. Step 12 installs `src/game/reviewFixture.ts` — a hand-built position with a
node one ply from running out, ships placed to wake sites by landing and by
flying over, and a pinned ship to show the generalised shade on an ordinary
turn — and Step 16 deletes it. The same pattern story 00000004 used.

**No automated test may depend on the fixture.** Every test builds its own
position, so Step 16 takes nothing with it.

## Conventions every step follows

- **Every step is finished with** `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run format:check` (run `npm run format` to fix) and, for any
  step touching `src/`, `npm run build` — plus the step's own verification.
- **The dev server** runs at `http://localhost:5273` (`npm run dev`).
  `vite.config.ts` sets `server.watch.usePolling`, so edits are picked up
  without a restart.
- **Tests live beside the code they cover**, and pure rules tests run in the
  default `node` environment. Only component tests opt into jsdom.
- **The rules layer never composes a sentence**, never reaches for ambient
  randomness, and never imports from `src/board/` or `src/game/`.
- **Artwork stays decorative**: every SVG is `aria-hidden` with no `title` or
  `desc`. All meaning reaches assistive technology through the square's
  accessible name and the live region.
- **jsdom has no layout.** Nothing about legibility, greyscale, animation
  timing or overlap can be asserted in a DOM test. Those are the manual gates;
  do not invent a test that pretends otherwise.
- **Every step starts at `Status: pending`** and is updated by the
  implementation pipeline, with a `Notes:` line recording what was done and any
  deviation and why.

---

## Step 1 — Rules: a ship on a dormant site is stranded too (version 0.4)

Status: committed

Notes: Extended §8.5's stranded-ship paragraph and its "owe an action" summary
paragraph to say "dormant or depleted site"/"either state", left §6 and the
rest of §8.5 (the waiver and final paragraphs) untouched, bumped the version
line to 0.4, added a `## 0.4` changelog entry, and set `RULES_VERSION` to
"0.4". No deviation from the plan; `npm run typecheck`, `npm run lint`,
`npm test` and `npm run format:check` all pass.

Edit `doc/ruleset/rules.md` §8.5 so that a ship standing on a **dormant** site
is stranded on exactly the same terms as one on a depleted site, then bump the
version and record the change. This is the only rules change in the story, and
it lands before any code depends on it.

What to change:

1. **§8.5.** Today its second paragraph says the one way a ship ends up on a
   depleted site is by holding a node until its clock runs out, and that such a
   ship is stranded. Extend it: a ship that is still standing there nine turns
   later, when the site finishes cooling down and goes dormant, is **equally
   stuck** — §6 forbids ending a move on either state — and is stranded on the
   same terms. Every later sentence in the section that says "depleted site"
   while describing the stranded ship's obligation (including the paragraph
   about owing an action for each ship left standing on one) must say "dormant
   or depleted site". Keep the existing waiver paragraph (a stranded ship with
   no legal move is excused) and the final paragraph (a site waking underneath
   a ship becomes charged at once) intact — they already cover both states.
2. **Do not touch §6.** Its ban on ending a move on a dormant or depleted site
   stays absolute: there is no escape hatch for a pinned ship, by the owner's
   decision. §8.5's existing waiver is the whole of the relief a stuck ship
   gets.
3. **Version line** at the top of `rules.md`: `0.3` → `0.4`.
4. **`doc/ruleset/changelog.md`**: a new `## 0.4` entry at the top (newest
   first), saying that a ship on a dormant site is now stranded on the same
   terms as one on a depleted site, and why — a node that runs out under a ship
   goes dormant nine turns later without the ship having moved, and the ship is
   equally unable to end a move where it stands. Note that this **does** change
   how the game is played (it extends the obligation), so it would be a tagging
   candidate — but tagging is on hold until the game plays, so no tag is made.
5. **`src/rules/rulesVersion.ts`**: `RULES_VERSION` → `"0.4"`.

Nothing else changes. No code in `src/rules/` implements §8.5 yet; Step 8 does.

Depends on: nothing (first step).

Verification (automated): `npm test` — `src/rules/rulesVersion.test.ts` passes,
which is the guard that the constant and the document agree; every other test
passes unchanged. `npm run format:check` passes (prettier formats markdown
too). Also confirm by reading that §8.5 now names both states everywhere it
describes the obligation, that §6 is untouched, and that the changelog entry
sits above 0.3.

---

## Step 2 — The seeded random generator

Status: committed

Notes: Added `src/rules/random.ts` with `mulberry32` (seed in, `[value,
nextSeed]` out, matching the published algorithm but returning the advanced
seed instead of closing over it) and `drawIndex` (seed and count in, `[index,
nextSeed]` out, throwing `RangeError` for a non-positive-integer count). Added
`src/rules/random.test.ts` covering determinism, a golden five-pair sequence
generated once from the implementation and recorded as literals, range over
5,000 steps, uniformity over 7 buckets at 70,000 samples with a fixed seed,
and the index draw's bounds/RangeError cases. No deviation from the plan;
`npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check` and
`npm run build` all pass.

Add `src/rules/random.ts`: a pure, seeded generator, the only source of
randomness the app will ever have (`Math.random` is banned by lint). Two
exports:

- **The generator step** — `mulberry32` as published, restructured so that the
  advanced seed is **returned** rather than kept in a closure: a seed in, a
  `[value, nextSeed]` pair out, where `value` is a float in `[0, 1)` and
  `nextSeed` is a 32-bit unsigned integer (normalise with `>>> 0` so the number
  stored in a state is always a plain non-negative integer).
- **A uniform index draw** — a seed and a count in, an `[index, nextSeed]` pair
  out, with `index` an integer in `[0, count)`. Throw a `RangeError` for a
  count that is not a positive integer, so a caller can never silently draw
  from an empty pool.

The module header says what it is (the seeded source recorded games replay
from) and names the algorithm. It imports nothing from the rest of the app and
knows nothing about the game.

See plan decisions 2 and 3 for why the generator is written here rather than
depended on, and why it is pure.

Depends on: Step 1 only in ordering (the rules commit lands first); no code
dependency.

Verification (automated): `npm test` — a new `src/rules/random.test.ts`
covering:

1. **Determinism.** The same seed produces the same value and the same next
   seed, every time, and two independent walks of ten values from one seed
   agree element for element.
2. **A golden sequence.** For one fixed seed, the first five `[value, nextSeed]`
   pairs are asserted against literals recorded in the test. This is the test
   that makes a recorded game replayable: it locks the generator's output so a
   later refactor cannot silently change it. Generate the literals from the
   implementation once and write them down.
3. **Range.** Over a few thousand steps, every value is `>= 0` and `< 1`, and
   every seed is a non-negative integer below 2^32.
4. **Uniformity.** Drawing a large sample (of the order of 70,000) of indices
   over 7 buckets — the size of a realistic dormant pool — leaves every bucket
   within a few percent of an equal share. Use a fixed seed so the assertion is
   deterministic and can never flake.
5. **The index draw.** Indices are always in range; a count of 1 always returns
   0; a count of 0, a negative count and a fractional count each throw
   `RangeError`.

---

## Step 3 — The state carries a seed, a ply number and site clocks

Status: committed

Notes: Added `CHARGED_LIFE_PLIES`/`DEPLETED_COOLDOWN_PLIES` and
`hasChargedNodeFinished`/`hasDepletedSiteFinishedCooling` to `sites.ts`,
transcribing plan decision 5's arithmetic directly. Added `SiteStatus` to
`gameState.ts`, changed `siteStates` to `Record<string, SiteStatus>`, added
`plyNumber` and `randomSeed`, made `startingGameState` take the seed as a
required argument (`enteredOnPly: 0` for every starting site), kept
`siteStateAt`'s signature unchanged and added `siteStatusAt`. Added
`src/game/seed.ts` (`freshSeed()`, via `crypto.getRandomValues`) and switched
`App.tsx` to a true lazy `useReducer` initialiser (`useReducer(reducer,
undefined, createStartingSession)`) so the seed is drawn exactly once — the
previous `useReducer(reducer, startingGameState(), createSession)` form would
have evaluated `startingGameState()` as a plain argument expression on every
render, which is fine functionally but would have redrawn (and discarded) a
seed each render, and would no longer type-check once the seed became
required. Updated every test the plan named
(`gameState.test.ts`, `sites.test.ts`, `ply.test.ts`, `session.test.ts`,
`announcements.test.ts`, `Board.test.tsx`, `TurnIndicator.test.tsx`)
mechanically, passing a literal seed and wrapping literal `siteStates` maps
in a small per-file `{state, enteredOnPly: 0}` helper. One deviation: the
plan's file list omitted `src/rules/movement.test.ts`, which also builds
`GameState` literals with `siteStates` directly (via its own `buildState`
helper) and needed the identical mechanical update to keep the build
type-checking; updated it the same way, without changing any assertion.
`npm run typecheck`, `npm run lint`, `npm test` (267 tests, including
`App.test.tsx` confirming `crypto` works under jsdom), `npm run format:check`
and `npm run build` all pass.

Give `GameState` the three things the node cycle needs, and give the app a
seed to open with.

In `src/rules/sites.ts`:

- Add the two nine-ply constants from §8.3 and §8.6 (how long a charged node
  lives, and how long a depleted site cools), named for what they are.
- Add the two pure derivations, taking the ply a site entered its state and the
  current ply: whether a charged node has finished its nine turns
  (`ply - enteredOnPly + 1 >= 9` — the charged clock **counts the ply it was
  woken on**), and whether a depleted site has finished cooling
  (`ply - enteredOnPly >= 9` — the cooldown **does not count the ply it
  depleted on**). Plan decision 5 works the arithmetic through; transcribe it,
  do not re-derive it.

In `src/rules/gameState.ts`:

- Add a `SiteStatus` type: a `SiteState` plus `enteredOnPly`, the ply number on
  which the site entered that state.
- Change `siteStates` from `Record<string, SiteState>` to
  `Record<string, SiteStatus>`.
- Add `plyNumber` (the ply being played, starting at 1) and `randomSeed` (the
  32-bit seed the next draw will use).
- `startingGameState` takes the **seed as a required argument** and builds every
  site's status with `enteredOnPly: 0` (no site entered its state during a ply;
  the number is never consulted for active or dormant sites), `plyNumber: 1` and
  the given seed.
- Keep `siteStateAt` returning `SiteState | undefined` exactly as now, so
  `movement.ts` and `Board.tsx` need no change, and add `siteStatusAt` for the
  code that needs the clock.

In `src/game/seed.ts` (new) and `src/App.tsx`:

- Export a function returning a fresh 32-bit seed from `crypto.getRandomValues`.
  It lives outside `src/rules/` deliberately (plan decision 3) — no module under
  `src/rules/` may import it.
- `App.tsx` draws the seed **once**, in the reducer's lazy initialiser, so a
  re-render never re-seeds the game in progress.

Every existing test that builds a `siteStates` map or calls
`startingGameState()` needs updating (`src/rules/gameState.test.ts`,
`src/rules/ply.test.ts`, `src/game/session.test.ts`,
`src/board/announcements.test.ts`, `src/board/Board.test.tsx`,
`src/board/TurnIndicator.test.tsx`). Update them mechanically — pass a literal
seed, and give each site status a ply — without changing what they assert.

See plan decisions 3, 4 and 5.

Depends on: Step 2 (nothing calls the generator yet, but the seed field is
meaningless without it).

Verification (automated): `npm test` — extend `src/rules/gameState.test.ts` and
`src/rules/sites.test.ts`:

1. `startingGameState(seed)` returns `plyNumber` 1, the given seed, and
   seventeen site statuses — five active, twelve dormant, none charged or
   depleted, every one with `enteredOnPly` 0. The existing starting-position
   assertions (fourteen ships, green to move, two actions) still pass.
2. `siteStateAt` returns the same answers it did before for a state built with
   statuses, and `siteStatusAt` returns the clock alongside.
3. The charged derivation: a node woken on ply _N_ has **not** finished on plies
   _N_ … _N+7_ and **has** finished on ply _N+8_ and beyond.
4. The cooldown derivation: a site depleted on ply _M_ has **not** finished on
   plies _M_ … _M+8_ and **has** finished on ply _M+9_ and beyond. Spot-check the
   combination the story works through: woken on ply 1, depletes at end of ply
   9, dormant again at ply 18.
5. `src/App.test.tsx` still passes: the app renders with a seed drawn from
   `crypto`, in jsdom, without touching `Math.random`.

---

## Step 4 — §8.2: a ship touching an active site charges it

Status: committed

Notes: Added `src/rules/nodes.ts` with `wakeTouchedSites(state, ship, path)`,
looping over `path.passedOver` (flown-over) then `path.destination`
(landed-on), charging only `active` sites and leaving any other state
untouched; returns the original `state` object unchanged when nothing was
touched. Wired it into `applyMove` in `src/rules/ply.ts`: after computing the
moved-ship array, it re-derives the matching `reachFrom` entry from the
ship's original square and shields (`moveRefusalReason` already found one
internally but does not expose it, so this re-derives it rather than
threading a new return value through the public refusal API), builds the
post-move state, runs the wake, and folds the `site-charged` effects into the
move's effect list ahead of `ply-ended`/`ply-passed`. Extended `MoveEffect` to
include `SiteChargedEffect`. Added `src/rules/nodes.test.ts` (unit tests on
`wakeTouchedSites` directly) and new cases in `src/rules/ply.test.ts`
(integration through `applyMove`), covering all seven verification points.
One small test-helper deviation: `ply.test.ts`'s `buildState`/`siteStatuses`
helpers gained an optional `plyNumber` and an optional `[SiteState, number]`
tuple form for `siteStates` entries, needed to test that an already-charged
site's `enteredOnPly` is left alone rather than reset — a mechanical,
backward-compatible extension of existing test scaffolding, not a plan
deviation. `npm run typecheck`, `npm run lint`, `npm test` (279 tests),
`npm run format:check` and `npm run build` all pass.

Add `src/rules/nodes.ts` with the §8.2 wake, and call it from `applyMove`.

- A pure function taking a state, the squares a move **touched** (its
  destination and everything it passed over) and the ship that made the move,
  and returning a new state in which every **active** site among those squares
  is now **charged** with `enteredOnPly` set to the state's current
  `plyNumber` — plus one `site-charged` effect per site woken, carrying the
  square, the ship id, the side, and whether the site was **landed on** or
  **flown over** (the two get different sentences at Step 9).
- Sites in any other state are untouched: touching a charged, depleted or
  dormant site does nothing.
- Loop over the whole path. The §3.2 spacing property means at most one site
  can be touched by a legal move, and `src/rules/siteSpacing.test.ts` asserts
  it, but that is a fact about the site layout and this module does not assume
  it.

In `src/rules/ply.ts`: after a legal move has been applied to the state (so the
ship is already on its destination), run the wake over the destination and the
entry's `passedOver` squares, and add its effects to the move's effect list
before any ply-ending effect. `moveRefusalReason` has already found the
matching `reachFrom` entry; the path is available there.

Waking must happen **inside the move**, not at the end of the ply — plan
decision 9 explains what deferring it would break.

Depends on: Step 3 (the site status carries the ply a site entered its state).

Verification (automated): `npm test` — a new `src/rules/nodes.test.ts` and new
cases in `src/rules/ply.test.ts`:

1. A ship **landing** on an active site leaves it charged, with `enteredOnPly`
   equal to the ply the move was made on, and reports one `site-charged` effect
   marked as a landing.
2. A ship **flying over** an active site (a two- or three-square move whose
   path crosses it) leaves it charged and the ship on its destination, with the
   effect marked as a fly-over. The ship does not stop.
3. **Either side's ship** wakes a site: the same move made by a red ship
   charges it identically.
4. A site that is already **charged** is unchanged by being touched again — in
   particular `enteredOnPly` does not move, so the clock is not restarted.
5. **Dormant and depleted** sites flown over are unchanged, and no effect is
   reported.
6. A move touching **no** site reports no `site-charged` effect and leaves
   `siteStates` deeply unchanged.
7. The move itself is unaffected: the ship arrives, one action is spent, and
   the existing `applyMove` tests pass unchanged.

---

## Step 5 — §8.6: drawing a replacement from the dormant pool

Status: committed

Notes: Added `drawReplacements(state, count)` to `src/rules/nodes.ts`,
built on a private `drawOneReplacement` (one draw: pool = `SITES` filtered to
`dormant`, index via `drawIndex`, wakes `active` unless `shipsBySquare` shows
an occupant, in which case `charged`) called `count` times in a loop, each
iteration folding the advanced-seed state and effects into the next. The
empty-pool safety net is a private `cooldownLongestDepletedSite`, scanning
`SITES` order and keeping the strictly-smallest `enteredOnPly` so ties
resolve to the earliest `SITES` entry, called before the draw when the pool
is empty; it throws when no depleted site exists either. Declared
`SiteWokenEffect` and `SiteCooledEffect` (plus `ReplacementDrawResult`) in
`nodes.ts` per the task's instruction, since `endOfTurn.ts` does not exist
yet — `SiteCooledEffect` is the one Step 6 must reuse (import it from
`nodes.ts`) rather than re-declare for its own step-3 cooling effect, so the
union in `EndOfTurnEffect` has one `site-cooled` shape, not two. Extended
`src/rules/nodes.test.ts` (`buildState` gained an optional `randomSeed`) with
a `describe("drawReplacements", …)` block covering the seven verification
points, including a golden seed-0/seed-1 pair and pool sizes computed by
hand from the algorithm to make the assertions concrete rather than only
structural. No deviation from the plan. `npm run typecheck`, `npm run lint`,
`npm test` (287 tests), `npm run format:check` and `npm run build` all pass.

Add the replacement draw to `src/rules/nodes.ts`, as a pure function. **Nothing
calls it yet** — Step 6 wires it into the sequence. This step is scaffolding
with its own tests, deliberately separated from the behaviour that uses it.

The function takes a state and how many replacements are needed, and returns
the new state, the effects, and the advanced seed (carried in the state):

- The **pool** is every dormant site, collected in `SITES` order so the outcome
  depends on the seed alone and never on object-key ordering.
- Each replacement is drawn with the uniform index draw from
  `src/rules/random.ts`, advancing the seed each time, so several draws in one
  ply are **without replacement**.
- A drawn site becomes **active**, with `enteredOnPly` set to the current ply —
  **unless a ship is standing on it**, in which case §8.5's final paragraph
  applies: it becomes **charged** immediately with its clock starting on the
  current ply. Use `shipsBySquare` to decide.
- Each draw reports a `site-woken` effect carrying the square and which of the
  two states it woke into.
- **The safety net.** If the pool is empty when a draw is needed, the site that
  has been **depleted longest** (smallest `enteredOnPly`, ties broken by `SITES`
  order so the result is deterministic) goes back to dormant first — reporting
  the ordinary `site-cooled` effect, because that is what happened to it — and
  the draw then proceeds. If there is no depleted site either, the board is in
  an impossible state; throw rather than return a silently wrong one.

See plan decision 10.

Depends on: Step 2 (the generator) and Step 3 (the seed and clocks in state).

Verification (automated): `npm test` — extend `src/rules/nodes.test.ts`:

1. A single draw turns exactly one dormant site active, leaves every other
   site's status untouched, advances the seed, and reports one `site-woken`
   effect.
2. The draw is **reproducible**: the same state and seed draw the same site
   every time, and two different seeds are shown to be capable of drawing
   different sites.
3. Over many seeds, the drawn site is **always dormant** beforehand — never
   active, charged or depleted.
4. **Without replacement**: asking for three replacements at once yields three
   distinct sites.
5. **Charged, not active, under a ship**: with a ship standing on the only
   dormant site, the draw wakes it **charged** with `enteredOnPly` at the
   current ply, and reports the effect as such.
6. **The safety net**: from a state with no dormant sites at all, a draw first
   returns the longest-depleted site to dormant (asserted by its
   `enteredOnPly`, with a tie resolved by `SITES` order) and then wakes a site;
   the result is still exactly one new active site.
7. An impossible pool (no dormant and no depleted sites) throws.

---

## Step 6 — §8.7: the end-of-turn sequence

Status: committed

Notes: Added `src/rules/endOfTurn.ts` exporting `EndOfTurnEffect` (new
`ShieldGainedEffect`, `NodeRanOutEffect`, `ShipStrandedEffect`, plus the
reused `SiteCooledEffect`/`SiteWokenEffect` from `nodes.ts`) and
`runEndOfTurn(state)`, implementing all six §8.7 steps in order over `SITES`
order for determinism; steps 2 and 6 are comment-only stubs naming §8.4 and
§7.1. Wired into `src/rules/ply.ts`: added `PlyEndedEffect` (named type,
replacing the former inline `ply-ended` member) and grew both it and
`PassEffect` with `side` and `endOfTurn: readonly EndOfTurnEffect[]`; the
second-action branch of `applyMove` and `applyPassGuard` both now call
`runEndOfTurn` before incrementing `plyNumber` and swapping `sideToMove`,
exactly as specified — including for a pass, per the owner-confirmed
decision 6. `src/game/session.ts` needed no change and still type-checks;
`createSession`'s starting-pass test was extended with a `plyNumber` check.
Fixed mechanical fallout from the widened effect shapes in
`src/board/announcements.test.ts`, `src/game/session.test.ts` and existing
`src/rules/ply.test.ts` literals (added `side`/`endOfTurn: []`), without
touching `announcements.ts` itself (its field access is a subset of the
grown shape and needed no change; new wording is a later step). Added
`src/rules/endOfTurn.test.ts` (6 tests) and additions to `src/rules/ply.test.ts`
(2 tests) covering all eight of the step's verification points, including a
full independent-per-ply sweep for §8.3's "five grant opportunities" and a
chained 17-call simulation for the eighteen-ply round trip plus the
step-3-then-step-5 same-ply draw. No deviation from the plan.
`npm run typecheck`, `npm run lint`, `npm test` (295 tests), `npm run
format:check` and `npm run build` all pass.

Add `src/rules/endOfTurn.ts`: the six steps of §8.7, in the document's order,
run once at the end of a ply. Wire it into `src/rules/ply.ts`.

The module exports the `EndOfTurnEffect` union (plan decision 8) and one
function taking a state and returning the new state and the effects. It reads
`state.sideToMove` as **the moving player** and `state.plyNumber` as the ply
that has just been played, so it must run **before** the side swaps and before
the ply number increments.

The six steps, all present, in order:

1. **Shield gain.** Each of the **moving player's** ships standing on a
   **charged** node gains one shield, capped at 4 (§4.1). Only the moving side —
   so a ship parked on a node gains one shield per **round**, not per ply. An
   **active** site grants nothing. Report a `shield-gained` effect only when the
   count actually rises (a ship already on 4 reports nothing).
2. **Influence** — deliberately empty. A comment names §8.4 and says it awaits
   its own story. No total is kept anywhere.
3. **Cooling.** Every depleted site that has finished its nine plies (the
   derivation from Step 3) goes **dormant**, reporting `site-cooled`.
4. **Running out.** Every charged node that has finished its nine plies goes
   **depleted**, with `enteredOnPly` set to the current ply, reporting
   `node-ran-out` — and, for each such site with a ship standing on it, a
   `ship-stranded` effect naming the ship, its side and the square.
5. **Replacement.** One draw from Step 5 for **each** node that ran out at step
   4, so five sites are active or charged again.
6. **Bay return position** — deliberately empty. A comment names §7.1 and says
   it awaits the combat story.

Steps 3 and 5 must stay in that order: a site freed at step 3 is drawable at
step 5 in the **same** ply, which is what keeps a replacement always available
(§8.7 says so explicitly).

In `src/rules/ply.ts`:

- Change the `ply-ended` effect to carry the side that just played, the side
  now to move, and the `EndOfTurnEffect[]` from the sequence that ran with it.
  Do the same for `ply-passed` (`PassEffect`), which is also a standalone
  session event and must be able to announce itself.
- When the second action is spent: run the sequence, **then** increment
  `plyNumber`, swap `sideToMove`, reset `actionsRemaining` and clear
  `movedThisPly`.
- In `applyPassGuard`: a pass ends a ply too, so run the sequence for the
  passing side and increment `plyNumber` the same way. The guard still fires at
  most once and is still checked only for the side to move (plan decision 6).
- `src/game/session.ts` needs no logic change, but the `PassEffect` shape it
  re-exports as a `SessionEvent` has grown; check it still type-checks and that
  `createSession` still reports a starting pass correctly.

See plan decisions 5, 6, 7 and 8.

Depends on: Step 5 (the draw) and Step 4 (something can become charged in the
first place).

Verification (automated): `npm test` — a new `src/rules/endOfTurn.test.ts` plus
additions to `src/rules/ply.test.ts`. Build states directly; do not try to
drive everything through moves.

1. **The shield grant.** Only the moving side's ships gain; a ship of the other
   side on a charged node gains nothing this ply and gains on its own ply; a
   ship on an **active** site gains nothing; a ship already on 4 stays on 4 and
   reports no effect; a ship not on a site gains nothing.
2. **§8.3's first property.** A player who wakes a node on ply _N_ and sits on
   it gains a shield on exactly five of their own plies (_N_, _N+2_, _N+4_,
   _N+6_, _N+8_) — capped at 4, so assert the **five grant opportunities**, e.g.
   by counting `shield-gained` effects with the cap raised out of the way in a
   state built for it, or by counting the plies on which the ship was eligible.
   Whichever form is chosen, the assertion must be about the number five that
   §8.3 names.
3. **§8.3's second property.** The node depletes at the end of the **waker's**
   ply _N+8_, so the replacement wakes at the same moment and the **opponent**
   is to move next.
4. **The eighteen-ply round trip.** A site woken on ply _N_ is charged through
   _N+8_, depleted from the end of _N+8_ through _N+16_, dormant again at step 3
   of ply _N+17_, and **eligible for that same ply's step 5 draw**.
5. **The order.** A ship standing on a node that runs out this ply still gains
   its shield at step 1 **before** being stranded at step 4. A site freed at
   step 3 can be the site drawn at step 5 of the same ply (construct the state
   so it is the only dormant candidate).
6. **The invariant.** After the sequence, exactly five sites are active or
   charged, in every case tested.
7. **Ply counting.** `plyNumber` starts at 1 and increments once per ply end,
   including on a pass; green is to move on every odd ply and red on every even
   one, checked over a run of plies.
8. **The pass.** A side with no legal move at all still passes, and the pass now
   runs the sequence and increments the ply. Existing `applyMove` and pass-guard
   tests pass with their effect assertions updated for the nested shape.

---

## Step 7 — The Appendix B guard: the dormant pool never runs dry

Status: committed

Notes: Added `src/rules/sitePool.test.ts`, driving `runEndOfTurn` directly
(states built and advanced by hand — `plyNumber` incremented and `sideToMove`
swapped by the test, never through `applyMove`) over 200 plies, five seeds
(1, 12345, 987654321, 42, 999983) and the three named patterns: charging every
active site the instant it appears (theoretical maximum), charging at most
two per ply (achievable maximum), and a staggered pattern that lets active
sites sit untouched for three plies and then charges all of them at once
(clustering several nodes' nine-turn clocks onto the same ply). At every ply
the test asserts, independently of the implementation's own safety net, that
the dormant pool plus the sites finishing cooldown this ply is never smaller
than the number of nodes running out this ply (the hard Appendix B assertion),
that exactly five sites are active or charged, that every site has a valid
state with a defined `enteredOnPly` no later than the ply just played, and it
tracks the smallest dormant-pool size seen. Observed minimum dormant-pool
size across all three patterns and all five seeds: **7**, comfortably above
the softer floor of 2 the step asks to guard, and consistent with Appendix
B's own estimate of "roughly seven" dormant sites at any moment — no finding
to raise. No deviation from the plan. `npm run typecheck`, `npm run lint`,
`npm test` (298 tests, ~1.2s for the three new tests), `npm run format:check`
and `npm run build` all pass.

A test-only step. Appendix B explicitly asks the app for this guard, and it is
the check that the nine-turn figures and the seventeen-site pool are still
consistent with each other.

Add a test (in `src/rules/endOfTurn.test.ts` or a dedicated
`src/rules/sitePool.test.ts`) that drives the end-of-turn sequence over a long
run — of the order of 200 plies — under **adversarial waking patterns**, with
several different seeds, and asserts at **every** ply:

- Exactly **five** sites are active or charged (§8.1's invariant).
- The dormant pool is **never empty** when a replacement is needed — the hard
  assertion Appendix B asks for.
- Every site is in exactly one of the four states, and every charged or
  depleted site has an `enteredOnPly` no later than the current ply.

Patterns to run:

1. **The theoretical maximum**: every active site is charged the instant it
   appears, every ply. No real game can do this — a move touches at most one
   site and a ply has two actions — but it is a strict upper bound on the rate
   at which the board consumes the pool.
2. **The achievable maximum**: at most two sites woken per ply, which is what a
   real game can actually sustain.
3. **A staggered pattern** that deliberately clusters several run-outs into the
   same ply (wake several sites on one ply, so they all run out together and
   several draws happen at once).

Also record the **minimum dormant-pool size** observed and assert it stays at
**two or more**. Appendix B's real concern is not safety but randomness: with
only one dormant site the "random" choice is forced and players can predict it.
If this softer assertion fails while the hard one passes, that is a **finding
for the owner about the pool sizing**, not something to fix in code — record it
in this step's Notes and raise it.

The test drives states directly (build a state, wake sites, run the sequence,
advance) rather than through `applyMove`; it is about the site economy, not
about movement.

Depends on: Step 6 (the sequence exists and is correct for a single ply).

Verification (automated): `npm test` — the new long-run test passes for every
seed and pattern, and the suite still runs quickly (keep the run to a few
seconds; reduce the number of seeds rather than the number of plies if it
drags).

---

## Step 8 — §8.5: the action a stranded ship owes

Status: committed

Notes: Split `movement.ts`'s `moveRefusalReason` into a private §6-only
`sixOnlyMoveRefusalReason` (today's checks, verbatim) and a public wrapper
that checks ownership, then already-moved, then §8.5's obligation (via a
freshly recomputed `strandedShipIds(state)` from the new `stranded.ts`),
before delegating destination checks to the §6-only half; added a private
§6-only `sixOnlyLegalDestinations`, exported (as `stranded.ts` needs it) and
used by `sideToMoveHasLegalMove` in place of the old call through the public
`legalDestinations`. Added `MoveRefusalReason`'s new
`"another-ship-stranded"` value, checked immediately after
`ship-already-moved`. Added `src/rules/stranded.ts` with `strandedShipIds`
and `strandedObligationBinds`, both pure and recomputed on demand, exactly as
specified. `stranded.ts` imports `sixOnlyLegalDestinations` from
`movement.ts` and `movement.ts` imports `strandedShipIds` from
`stranded.ts` — a deliberate circular module import (not a call-graph
cycle: `moveRefusalReason` → `strandedShipIds` → `sixOnlyLegalDestinations`
→ `sixOnlyMoveRefusalReason`, which never calls back into `stranded.ts`),
which TypeScript, eslint and Vitest all handle without complaint since
neither module evaluates the other's exports at module-init time. One
unavoidable ripple: adding the new `MoveRefusalReason` value made
`announcements.ts`'s `rejectionSentence` switch non-exhaustive, so a
placeholder sentence ("A stranded ship must be moved clear this turn.
Choose one of those instead.") was added there to keep the build green;
this is a minimal fix to an otherwise out-of-scope file, left for Step 9 to
finalise the wording and add its own test coverage — not a deviation from
this step's own scope, which the plan already anticipates would ripple
("checked immediately after ship-already-moved" implies the union changes).
Added `src/rules/stranded.test.ts` (15 tests) covering all ten of the
step's verification points, and extended `src/rules/movement.test.ts` (17
tests, up from 13) with a stranded case folded into the existing
cross-check and reason-table tests, plus a new `describe` block for
`legalDestinations` against the obligation and an explicit "does not blow
the stack" sweep. Full suite (317 tests) completes in the low tens of
seconds with no hang, confirming the recursion trap was avoided. No
deviation from the plan otherwise. `npm run typecheck`, `npm run lint`,
`npm test`, `npm run format:check` and `npm run build` all pass.

Implement the stranded rule in the rules layer, as a restriction on what an
action may be, so it reaches the player through the same refusal machinery
every other illegal move uses.

In `src/rules/movement.ts`, first make room:

- Split the existing `moveRefusalReason` into the **§6-only** checks it
  performs today and a wrapper that adds the new §8.5 check. Everything under
  `src/rules/` that needs "can this ship move at all" without consulting §8.5
  uses the §6-only half. **This split is what prevents infinite recursion** —
  plan decision 11 spells the cycle out; read it before writing anything.
- Add one new value to `MoveRefusalReason` for "another of your ships is
  stranded and this action must free one". Check it **immediately after
  `ship-already-moved`** and before any check about the destination, so a
  player who picks the wrong ship is told that rather than "out of range".
- `sideToMoveHasLegalMove` (the §5 pass guard) keeps using the §6-only half.

Add `src/rules/stranded.ts`:

- **Who owes an action**: the ships of the side to move that are standing on a
  **dormant or depleted** site (both, per Step 1's rules edit), have **not yet
  moved this ply**, and have **at least one legal move** under the §6-only
  checks. A stranded ship with no legal move drops out — §8.5 waives the
  requirement.
- **Whether the obligation binds**: it does when that count is **at least**
  `actionsRemaining`.
- Both are recomputed on demand from the state, never cached, so they are
  correct at each action of the ply.

`legalDestinations` and the public `moveRefusalReason` keep their names and
meanings, so `src/game/session.ts` and `src/board/Board.tsx` respect the
obligation without changing. **Selection is not refused** — a player may still
select a ship that cannot move, and hears "0 moves available" (plan decision
11).

Depends on: Step 1 (the rules edit that puts dormant sites in scope) and Step 6
(so ships actually become stranded in play; the tests here build states
directly).

Verification (automated): `npm test` — a new `src/rules/stranded.test.ts` and
additions to `src/rules/movement.test.ts`:

1. **One stranded ship**: at two actions remaining the obligation does not bind
   and any legal move is allowed; after one action is spent it binds, and moving
   any other ship is refused with the new reason while moving the stranded ship
   is allowed.
2. **Two stranded ships**: the obligation binds on both actions; both must be
   moves of stranded ships.
3. **Three stranded ships**: both actions must free stranded ships, the player
   chooses which two, and the third is still stranded next ply.
4. **The waiver**: a stranded ship boxed in with no legal move at all is not
   counted, so a single such ship leaves the player entirely free; and a state
   whose only stranded ship is immobile behaves exactly like a state with none.
5. **Both dead states count**: a ship on a **dormant** site owes an action on
   the same terms as one on a **depleted** site (this is Step 1's rules
   change).
6. **Only the side to move**: the opponent's stranded ships never restrict the
   moving player.
7. **A stranded ship that has already moved** this ply does not keep binding
   the second action.
8. **Refusal ordering**: moving a non-owed ship to an out-of-range square while
   the obligation binds reports the **stranded** reason, not `out-of-range`.
9. **The §5 pass still fires** when the side to move has no legal move at all,
   stranded ships or not, and the obligation never causes a pass on its own.
10. No recursion: the whole suite completes (a stack overflow here is the
    failure mode the split prevents).

---

## Step 9 — The words for everything that now happens

Status: committed

Notes: Rewrote `moveSentence` to fold a move's own `site-charged` effect into
"what the move was" (landing: "… and charged the node."; flying over: "…,
flying over X and charging the node."), and factored the ply-ending logic in
`moveEndingClause` and the standalone `ply-passed` case around a shared
`endOfTurnClauses`/`passSentence` pair so both draw their clauses from the
nested `EndOfTurnEffect[]` in the same order the sequence produced them.
`endOfTurnClauses` groups every `shield-gained` effect into one clause via
`shieldGainedClause` (naming the square and new count for one ship, "ships at
X and Y each gained a shield" for several, with any ship reaching the cap of
4 named separately), speaks `node-ran-out`, `ship-stranded` and `site-woken`
(with the `wokeInto: "charged"` case naming why), and silently drops
`site-cooled`. Finalised Step 8's placeholder `another-ship-stranded`
refusal sentence as-is ("A stranded ship must be moved clear this turn.
Choose one of those instead.") — it already explained the obligation without
a square, so no wording change was needed, only its test coverage, added to
the existing `cases` table. Added a `joinWithAnd` list-formatting helper. No
deviation from the plan; wording choices (e.g. "and charged the node" vs. a
separate sentence) were made freely within the plan's constraints since it
left exact phrasing to the implementer. `npm run typecheck`, `npm run lint`,
`npm test` (332 tests, 36 in `announcements.test.ts`), `npm run format:check`
and `npm run build` all pass. Confirmed by grep that no player-facing
sentence in `announcements.ts` contains "ply" or "hub" (the only matches are
the `ACTIONS_PER_PLY` identifier and internal effect-type discriminants).

Give the live region a sentence for each new event, in
`src/board/announcements.ts`. Wording is players' vocabulary throughout —
**"turn"**, **"node"**, never "ply" or "hub" — and reads sensibly aloud.

Cover:

- **A site charging**, both by landing on it and by flying over it, and by
  either side ("Red flew over E5 and charged the node" reads differently from
  "Green moved onto E5 and charged the node"). The story calls out the
  opponent's fly-over specifically: it must be clear that the other player did
  it.
- **A node running out**, naming the square.
- **A replacement waking**, naming the square — and the rarer case where it
  wakes **charged** because a ship was standing on it.
- **A ship becoming stranded**, naming the square, and saying that it must be
  moved clear next turn.
- **Shields gained**, grouped into one clause per end-of-turn sequence rather
  than one per ship (plan decision 8), naming the squares and, where it reads
  naturally, the new count. A ship reaching the cap of 4 is worth saying.
- **`site-cooled` says nothing** — deliberately (plan decision 8). Handle the
  effect and produce no clause.
- **The new refusal**, for a player who tries to move something else while an
  action is owed: it must explain the obligation rather than merely refusing.
  It cannot name the square (the reason carries no data — plan decision 11), so
  it names the situation: a stranded ship must be moved clear this turn.

Structure: the sentence for a `moved` event stays "what the move was" followed
by the ending clause, with the end-of-turn clauses drawn from the effects
nested inside `ply-ended` / `ply-passed`, in the order the sequence produced
them. A `ply-passed` event announced on its own carries its own sequence's
clauses the same way.

Keep the existing sentences for moves, selections, the bay reset and the
existing refusals unchanged.

Depends on: Steps 4, 6 and 8 (every effect and reason that needs a sentence
exists).

Verification (automated): `npm test` — extend `src/board/announcements.test.ts`
with a case per new effect and per new refusal, asserting the exact sentences:
landing wake, fly-over wake by the opponent, node ran out, replacement woken
active, replacement woken charged under a ship, ship stranded, one shield
gained, several shields gained in one sequence (one clause), a shield reaching
the cap, a cooled site producing no clause, and the owed-action refusal.
Confirm no sentence contains "ply", "hub", or a square-less vagueness where a
square is available.

---

## Step 10 — The accessible name says what a ship's condition is

Status: committed

Notes: `SquareMark` narrowed to `"selected" | "destination"`; added
`ShipCondition` (`"already-moved" | "no-action" | "owes-action"`) as its own
optional field on `SquareLabelDescriptor`, with the name's segment order now
square, bay-or-site, ship, shields, condition, mark, and the wording exactly
as the plan states. `Board.tsx` gained a `shipCondition` helper computing the
condition per plan decision 13's precedence (owed, from `strandedShipIds`,
regardless of whether the obligation currently binds; then already-moved;
then no legal destination via the public `legalDestinations`, which already
folds in both pinning and the bound obligation; else none), applied only to
ships of `state.sideToMove`, and the selection-mark branch lost its
`already-moved` case. `BoardSquare.tsx` needed a minimal accommodation to
keep building: it gained an optional `condition` prop and now reads
`condition === "already-moved"` everywhere it previously read
`mark === "already-moved"` (the dampened class, the `--spent-opacity` style,
and drawing the existing solid bar), so the app still renders the "already
moved" case exactly as before; it does not yet draw anything for `no-action`
or `owes-action` — that generalisation, the hollow bar, the chevron and the
blink are Step 11's job. Extended `squareLabel.test.ts` with cases for each
condition's wording and for a condition combined with a mark, and added a new
`Board.test.tsx` "ship conditions" describe block (five tests, hand-built
minimal `GameState` literals rather than the starting fleet) covering all
seven of the step's verification points: wording before the obligation
binds, condition-then-mark ordering, dampening the rest of the moving side
once the obligation binds while leaving the owed ship alone, opponent ships
never carrying a condition, and a pinned ship (4 shields, boxed on its four
orthogonal neighbours) reading "no action available this turn" with nothing
stranded anywhere. Updated `BoardSquare.test.tsx`'s existing already-moved
case to pass `condition` instead of `mark`. No deviation from the plan.
`npm run typecheck`, `npm run lint`, `npm test` (340 tests), `npm run
format:check` and `npm run build` all pass.

Split the square label's single mark slot into two (plan decision 12) and teach
`Board.tsx` to work out each ship's condition.

In `src/board/squareLabel.ts`:

- `SquareMark` narrows to the selection layer: `"selected" | "destination"`.
- A new `ShipCondition` — `"already-moved" | "no-action" | "owes-action"` —
  becomes a separate, optional field on the descriptor, so a ship can be both
  selected and stranded, or selected and unable to move.
- The name's segment order becomes: square, bay-or-site, ship, shields,
  **condition**, mark. Wording in the players' vocabulary: "already moved this
  turn" (unchanged), "no action available this turn", "stranded, must move this
  turn".

In `src/board/Board.tsx`, for each ship **of the side to move** (never the
opponent's — plan decision 13):

- If it is in the owed set from `src/rules/stranded.ts`, its condition is
  `owes-action` — **from the start of the ply**, whether or not the obligation
  currently binds.
- Otherwise, if it has already moved this ply, `already-moved`.
- Otherwise, if it has no legal destination at all — which now covers both a
  pinned ship and a ship held back because the obligation binds elsewhere —
  `no-action`.
- Otherwise no condition.

The selection mark is decided exactly as it is today, minus `already-moved`.

Depends on: Step 8 (the owed set, and `legalDestinations` respecting the
obligation).

Verification (automated): `npm test` — extend `src/board/squareLabel.test.ts`
and `src/board/Board.test.tsx`:

1. Each condition's wording appears in the name, and a square with **both** a
   condition and a mark reads with both, in the stated order.
2. A stranded ship's square is named "stranded, must move this turn" from the
   **first** action of the ply, before the obligation binds.
3. When the obligation binds, every other ship of the moving side is named "no
   action available this turn", and the owed ship is not.
4. A ship that has already moved still reads "already moved this turn", not
   "no action available".
5. A pinned ship of the moving side (no legal destination, nothing stranded
   anywhere) reads "no action available this turn".
6. **No opponent ship ever carries a condition**, in any of the above.
7. The existing selection and destination naming is unchanged.

---

## Step 11 — The board shows the obligation

Status: committed

Notes: Renamed the dampened shade's class from `board-square--already-moved`
to `board-square--dampened` (applied for `already-moved` and `no-action`
alike) and its custom property from `--spent-opacity` to
`--dampened-opacity`; the constant is now set whenever any condition is
present, since the blinking ship needs the same value as its blink target.
Renamed `SpentMark` to `AlreadyMovedMark` and added `NoActionMark` (the same
bottom-edge bar, hollow: `fill="none"` with a stroke) and `OwesActionMark` (a
bottom-edge chevron pointing up at the ship, in the default interaction
accent, via a stroked `path`). Added `board-square--owes-action` as its own
modifier class (kept separate from `--dampened`, since an owed ship blinks
rather than sitting statically faded) with a `board-square-owes-action-blink`
keyframe animation (1.4s, ease-in-out, infinite, alternate, opacity 1 to
`--dampened-opacity`) targeting `.ship-icon`, switched off under
`@media (prefers-reduced-motion: reduce)` with the ship forced back to full
opacity so the chevron carries the meaning alone. All three marks stay in the
existing `0 0 100 100` mark layer and render alongside the selection marks
unchanged. Extended `BoardSquare.test.tsx` with cases for each of the five
verification points (the three marks render and are distinguishable by
element/attribute shape rather than only by class name; the dampened class
applies to `already-moved`/`no-action` and not `owes-action`, which gets its
own class instead; a condition mark and a selection mark render together; no
condition renders exactly what the component rendered before this step
existed; and an axe pass, `color-contrast` disabled, across every condition
with every mark aria-hidden). No deviation from the plan; the geometry,
blink rate and easing are exactly the provisional values plan decision 14
names, left for the Step 14 manual gate to adjust by eye. `npm run
typecheck`, `npm run lint`, `npm test` (346 tests), `npm run format:check`
and `npm run build` all pass.

Draw what Step 10 named. In `src/board/BoardSquare.tsx` and
`BoardSquare.css`:

- **Generalise the dampened shade** from "already moved" to any ship carrying a
  condition of `already-moved` or `no-action`: the ship icon is drawn at the
  existing 0.45 opacity. Rename the class and the CSS custom property away from
  "spent" to something that says "dampened", since it no longer means only
  "moved".
- **Three static condition marks**, distinguished by shape so they survive
  greyscale (plan decision 14): the existing solid bar for `already-moved`, the
  same bar **hollow** for `no-action`, and a **chevron pointing at the ship**
  for `owes-action`. Keep them in the same mark layer and viewBox as the
  existing markings, and keep the selection markings (disc, brackets) working
  on top: a square can carry a condition mark **and** a selection mark at once.
- **The blink** for `owes-action`: the ship icon's opacity alternating between
  full and the dampened value, about a 1.4 s cycle, ease-in-out, infinite,
  alternating. Under `@media (prefers-reduced-motion: reduce)` the animation is
  off and the ship draws at **full** opacity, with the chevron carrying the
  meaning alone.
- Every mark stays `aria-hidden`; all meaning reaches assistive technology
  through Step 10's accessible name.

The exact geometry, blink rate and travel are provisional and are settled by
eye at Step 14; record any change there.

Depends on: Step 10 (the condition reaching the component).

Verification (automated): `npm test` — extend `src/board/BoardSquare.test.tsx`:

1. Each of the three conditions renders its own mark, and the three marks are
   distinguishable from one another in the DOM (different elements/classes,
   not merely different colours).
2. The dampened class is applied for `already-moved` and `no-action` and
   **not** for `owes-action` (which blinks instead).
3. A square can render a condition mark and a selection mark together.
4. Squares with no condition render exactly what they render today.
5. Static accessibility (axe, `color-contrast` disabled) is clean, and no mark
   is exposed to the accessibility tree.

Note that jsdom cannot see animation, layout or greyscale; the blink, the
legibility of the three shapes and the reduced-motion switch are Step 14.

---

## Step 12 — A temporary position for the manual gates

Status: committed

Notes: Added `src/game/reviewFixture.ts` exporting `reviewFixtureGameState()`,
built directly from the position given in this step (ply 9, green to move,
two actions free, nothing moved; K5 charged with `enteredOnPly: 1`, E5/H8/E11/
K11 active, the remaining twelve `SITES` dormant; seed `20260818`; the exact
ship placements and shields given). Switched `src/App.tsx`'s lazy reducer
initialiser from `createSession(startingGameState(freshSeed()))` to
`createSession(reviewFixtureGameState())` — one import swapped for another,
one call changed, nothing else touched. Verified the required arithmetic with
a throwaway script run via `npx tsx` from a scratch file under `src/game/`
(deleted immediately after): `legalDestinations` confirms green-2's H6→H8 is
legal and lands on H8 (active); red-2's K9→K12 is legal and passes over K11
(active); green-4 at A1/4 shields has zero legal destinations (boxed in by
green-5 on A2 and red-1 on B1, off-board the other two ways); and green-1 at
K5 has 8 legal destinations at 3 shields and 4 at 4 shields. No square needed
to move — the position as specified in this step's arithmetic held exactly.
Module header states plainly that the position is not reachable by play and
that the module is temporary; reworded two more mentions of "manual gate" in
the file's doc comments (CONTRIBUTING.md bans plan-step references in code
comments, and "manual gate" is this plan's term for the gate steps) to speak
of "checking the board by eye" instead — a wording deviation only, the
content is unchanged. `grep -rl reviewFixture src` shows only the fixture
module and its one call site in `App.tsx`; no test anywhere references it,
and `src/App.test.tsx` still asserts only the shell (heading, turn-indicator
text, axe) unchanged. `npm run typecheck`, `npm run lint`, `npm test` (346
tests, none modified), `npm run format:check` and `npm run build` all pass.

Add `src/game/reviewFixture.ts`, a **temporary** module holding a hand-built
position, and have `src/App.tsx` build its initial session from it instead of
from `startingGameState(...)` — a change of one import and one call.
**Step 16 deletes it.**

The module header must say plainly that this is **not a position reachable by
play** (it is a mid-game arrangement written by hand) and that it exists only
so the manual gates have something to look at.

The position, chosen so that every gate is reachable within a ply or two:

- **`plyNumber` 9**, green to move, two actions remaining, nothing moved.
  (Green takes odd plies.)
- **Sites**: **K5 charged with `enteredOnPly` 1** — so it has one ply of life
  left and runs out at the end of ply 9; **E5, H8, E11, K11 active**; the other
  twelve dormant with `enteredOnPly` 0. That is five active-or-charged, as §8.1
  requires.
- **Seed**: any fixed literal, so reloading the page replays the same draws and
  a gate can be repeated.
- **Green ships**: `green-1` on **K5** with **3 shields** (the node holder — it
  takes its fourth shield at the end of ply 9 and is stranded from ply 11);
  `green-2` on **H6** with 0 (two squares north lands on the active **H8** and
  wakes it); `green-3` on **C7** with 0 (a free ship for burning actions);
  `green-4` on **A1** with **4 shields**, boxed in by `green-5` on **A2** and
  `red-1` on **B1** — with 4 shields it may only step one square orthogonally,
  so it is pinned and shows the "no action available" shade on an ordinary
  turn; `green-6` on **D1** and `green-7` on **A14**, spare.
- **Red ships**: `red-1` on **B1** (the blocker above); `red-2` on **K9** with 0
  (three squares north to **K12** flies **over** the active **K11** and wakes
  it without stopping); `red-3` **O10**, `red-4` **O2**, `red-5` **H1**,
  `red-6` **L15**, `red-7` **D15**, spare.

Verify the arithmetic before finishing: green-2's H6→H8 must be legal and land
on an active site; red-2's K9→K12 must be legal and pass over K11; green-4 must
have **zero** legal destinations; green-1 must have legal destinations both at
3 and at 4 shields (so it can be freed once stranded). Use a throwaway check and
delete it; record any square that had to move, and why, in this step's Notes.

Constraints, all load-bearing:

- **It lives in `src/game/`, never `src/rules/`.** No test under `src/rules/`
  may reference it.
- **No automated test anywhere may depend on it.** Every test builds its own
  position; `src/App.test.tsx` in particular must keep asserting only the shell
  and never a fixture position. If an existing test breaks when the fixture goes
  in, that test was reading the app's initial position and must be rewritten to
  build its own — otherwise Step 16 would take the coverage with it.
- Keep it a plain data module: no route, no query parameter, no
  `import.meta.env` branch.

Depends on: Steps 4–11 (everything the gates look at is built, and all the
coverage that must survive Step 16 is already in place).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm run build` all pass **with no test changed to
accommodate the fixture**. Confirm by inspection that nothing outside
`src/game/reviewFixture.ts` and the one call site in `src/App.tsx` mentions it.
The gates that use it are Steps 13–15.

---

## Step 13 — Manual gate: a node's whole life

Status: committed

Notes: Taken by the owner against the Step 12 fixture over an extended
session. All six checks passed: a site charges the moment a ship lands on it,
the run-out pays the holder its fourth shield and wakes a replacement in the
same instant with the opponent to move next, a fly-over charges without the
ship stopping, a shield arrives once per round up to four, the node runs out
on the ninth turn, and the four site appearances stay tellable apart while
changing. Two findings, neither about this step's own checks: the owner ruled
that a single stranded ship should owe the **first** action of the turn rather
than leaving it free (Steps 13a and 13b), and asked for the blink to run 25%
faster (settled at Step 14).

No code. `story.md`'s manual gates 1 and 2, taken against the Step 12 fixture.

Depends on: Step 12.

Verification (manual): run `npm run dev` and open `http://localhost:5273`.
Reload before each check — the fixture resets on reload, and moves already made
do not undo. Confirm all of:

1. **Charging by landing.** Move green **H6** two squares north onto the active
   **H8**. The site's marker changes to the charged appearance **immediately**,
   as the move lands — not at the end of the turn.
2. **The run-out, the shield, and who moves next.** Spend green's second action
   on a ship that is not on a node (green **C7** will do). At the end of the
   turn: the ship on **K5** takes its **fourth** shield (four arcs), **K5**
   changes to the depleted appearance, a **new site wakes somewhere else** at
   the same moment, and it is **red's** turn — the opponent sees the
   replacement first, which is the property §8.3 is built around.
3. **Charging by fly-over, by the opponent.** As red, move **K9** three squares
   north to **K12**. It passes over the active **K11**, which charges, and the
   ship ends on K12 without stopping. Confirm this reads clearly as something
   the opponent did.
4. **A shield per round, not per turn.** Leave the ship that took **H8** where
   it is and play on. It gains one shield at the end of each of **green's**
   turns and none at the end of red's, up to **four** and no further.
5. **Nine turns.** Counting the turn it was woken as the first, the node on
   **H8** runs out at the end of the **ninth** turn — and, because green woke
   it on a green turn, it runs out at the end of a **green** turn with red to
   move next.
6. **The board still reads.** The four site appearances stay tellable apart
   while they are actually changing, including under a ship and in greyscale
   (browser devtools greyscale emulation or the OS colour filter). If a
   distinction does not carry, that is a **finding for a later story**, not a
   licence to restyle `SiteMarker` here — record it in the Notes.

If a check fails, record what was seen in this step's Notes before any fix.

---

## Step 13a — Rules: the freeing move is the first action (version 0.5)

Status: pending

A finding from the Step 13 gate. §8.5 says a stranded ship's owner "must spend
an action moving it clear" but never says **which** action, and this plan's
decision 11 read the silence one way: the obligation binds only once the
number of ships owing an action reaches the number of actions left, so a
single stranded ship left the first action free and forced the second. Watching
it play, the owner has ruled the other way — **the freeing move is the first
action of the turn**, and what remains of the turn is then the player's.

That reading is the better fit for §8.5's own wording. The section already says
"the move is ordinary in every other respect, and **the rest of the turn**
belongs to the player", which describes a turn whose obligation is discharged
first and whose remainder is free — not one that stays free until the last
action forces it. But the document does not say so outright, and code may not
carry a rule the document does not state, so this is a rules edit.

What to change:

1. **§8.5.** In the paragraph that turns the obligation into a restriction on
   what an action may be, say plainly that the freeing move is the **first**
   action of the turn, and that while any ship still owes one, each action in
   turn must free one. Keep the existing consequences intact and make them
   read as results of that rule: with one stranded ship the rest of the turn
   is the player's; with two, both actions go to clearing them; with three or
   more, the player clears two of their choice and the rest wait. Keep the
   waiver paragraph (a stranded ship with no legal move is excused) and the
   final paragraph (a site waking underneath a ship) untouched.
2. **Do not touch §6**, and do not revisit Step 1's dormant-site change — it
   stands exactly as it is.
3. **Version line** at the top of `rules.md`: `0.4` → `0.5`.
4. **`doc/ruleset/changelog.md`**: a new `## 0.5` entry at the top, saying the
   freeing move is now the first action of the turn rather than any action,
   and why — a turn that only forces the obligation at its last action lets a
   player put off a move they have no choice about, which reads as a free turn
   right up until it is not. Note that this **does** change how the game is
   played and so would be a tagging candidate, but tagging is on hold until
   the game plays, so no tag is made.
5. **`src/rules/rulesVersion.ts`**: `RULES_VERSION` → `"0.5"`.

Nothing else changes; Step 13b changes the code.

**This supersedes** `story.md`'s in-scope item 8 and this plan's decision 11 on
the binding condition only. Everything else in both — who owes an action, the
waiver for a ship with no legal move, the refusal reason and its ordering, and
the marks on the board — is unaffected.

Depends on: Step 13 (the gate that produced the finding).

Verification (automated): `npm test` — `src/rules/rulesVersion.test.ts` passes,
which is the guard that the constant and the document agree; every other test
passes unchanged, because no code implements the new reading yet.
`npm run format:check` passes. Also confirm by reading that §8.5 now states
which action the obligation takes, that its three consequences still read
correctly under the new rule, and that the changelog entry sits above 0.4.

---

## Step 13b — The obligation binds from the first action

Status: pending

Implement Step 13a's rule. The change is small and almost entirely a
subtraction.

- **`src/rules/stranded.ts`.** The binding condition becomes simply **whether
  any ship owes an action at all**, rather than a comparison against
  `actionsRemaining`, which drops out of the module entirely. The owed set
  itself is unchanged: the side to move's ships standing on a dormant or
  depleted site, not yet moved this ply, with at least one legal move.
- **`src/rules/movement.ts`.** The refusal check keeps its place —
  immediately after `ship-already-moved`, before anything about the
  destination — and keeps its reason. Only the condition it tests changes, in
  step with `stranded.ts`. If the binding rule is currently spelled out inline
  there rather than asked of `stranded.ts`, this is the moment to have one
  module own it, so the rule cannot be changed in one place and not the other.
- **Nothing in `src/board/` changes.** The `owes-action` condition is already
  computed from the owed set rather than from whether the obligation binds, so
  the owed ship still blinks from the start of the ply; and the rest of the
  fleet still dampens exactly when it has no legal destination, which under
  the new rule is now from the first action rather than the second. The
  visible consequence is intended and is what the Step 14 gate looks at.

The cases the new rule yields, all of which are tests: one stranded ship must
be freed by the first action and the second is then free; two must be freed by
both; three or more mean two are freed, the player's choice, and the rest wait
for the next turn; a stranded ship with no legal move is still waived and binds
nothing.

Depends on: Step 13a (the rules edit the code implements).

Verification (automated): `npm test` — update `src/rules/stranded.test.ts` and
the relevant cases in `src/rules/movement.test.ts` and
`src/board/Board.test.tsx`:

1. **One stranded ship** now binds the **first** action: with both actions
   remaining, moving any other ship is refused with the stranded reason, and
   moving the stranded ship is allowed. Once it has moved, nothing owes an
   action and the second action is free — assert both halves, since the second
   is the whole of what the player gets back.
2. **Two stranded ships** bind both actions, as before.
3. **Three stranded ships** bind both actions, the player chooses which two,
   and the third is still stranded next ply, as before.
4. **The waiver** is unchanged: a stranded ship with no legal move at all is
   not counted, and a state whose only stranded ship is immobile behaves
   exactly like a state with none.
5. **Only the side to move** is restricted, as before.
6. **A stranded ship that has already moved** this ply does not keep binding
   the second action.
7. **The §5 pass still fires** when the side to move has no legal move at all.
8. **The board follows**: with one stranded ship and both actions remaining,
   every other ship of the moving side is now named "no action available this
   turn" from the **first** action, while the stranded ship is named
   "stranded, must move this turn". This is the assertion that changes in
   `Board.test.tsx`.
9. `actionsRemaining` is no longer consulted by the stranded rule — confirm by
   reading that it appears nowhere in `stranded.ts`.

---

## Step 14 — Manual gate: being stranded, and reading the obligation

Status: pending

No code, except adjustments to the blink and mark geometry from Step 11, which
this gate exists to settle. `story.md`'s manual gates 3 and 4.

Depends on: Steps 13a and 13b (the obligation now binds from the first action,
which is what checks 1 and 2 below look at), and Step 13 (the same fixture, and
a node that has run out).

Verification (manual): run `npm run dev`, open `http://localhost:5273`, and play
to the point where **K5** has run out under green's ship (spend green's two
actions on ply 9, then red's on ply 10). Then confirm:

1. **The obligation is visible and binding from the first action.** At the
   **start** of green's turn, the stranded ship on K5 **blinks** between the
   full and dampened shades and carries its own static mark, and the rest of
   green's fleet is **already dampened** — under Step 13a's rule the first
   action is the one that owes the move, not the second.
2. **The refusal explains itself.** Trying to move any other ship while the
   obligation stands says why (the sentence is in the live region; a sighted
   player sees the refusal as the board declining to act). Moving the stranded
   ship clear works; the **rest of the turn is then genuinely free**, with the
   fleet undampened and the second action spendable on anything legal.
3. **The blink is legible without being punishing.** Fast enough to read as a
   summons, slow enough to sit with for a whole turn. The owner found the
   Step 11 value (1.4 s) subtle enough not to yell but not quite noticeable
   enough, and asked for **25% faster**; it is set to **1.1 s** for this gate.
   Confirm that reads right, adjust further against the running board if not,
   and **record the final values** in this step's Notes.
4. **Reduced motion.** Turn on the system's reduce-motion preference (or
   emulate it in browser devtools). The blink **stops**, the ship draws at full
   strength, and the obligation is still obvious from the static mark alone.
5. **The three conditions are tellable apart.** A ship that has already moved,
   a ship with no action available, and a ship that owes an action each read
   differently at a glance — and still do with colour removed.
6. **The generalised shade on an ordinary turn.** The pinned ship on **A1**
   reads as unmovable for the whole game. Confirm this is honest rather than
   confusing; if it is not, record the objection in the Notes as a finding for
   the owner rather than changing the definition of the shade here.

If a check fails, record what was seen in this step's Notes before any fix.

---

## Step 15 — Manual gate: screen reader

Status: pending

No code. `story.md`'s manual gate 5.

Depends on: Steps 13 and 14 (the same session, played the same way).

Verification (manual): with a screen reader running (VoiceOver, NVDA or Orca)
and `npm run dev` at `http://localhost:5273`, play through the same sequence and
confirm:

1. The live region announces, in wording that makes sense read aloud: a site
   **charging** (by landing and by fly-over, and by the opponent), a node
   **running out**, the **replacement** waking somewhere new, a ship becoming
   **stranded**, and **shields gained** — the last as one grouped clause, not a
   burst of near-identical sentences.
2. The refusal for moving the wrong ship while an action is owed **explains the
   obligation**, not merely that the move was refused.
3. Every square's accessible name still reports its state correctly as the
   board changes: a site that charges, runs out, cools and wakes reports each
   state in turn, and a ship's square reports "already moved this turn", "no
   action available this turn" or "stranded, must move this turn" as
   appropriate — including alongside "selected".
4. The announcements are not so long or so frequent that a turn becomes
   tiresome to listen to. If they are, record what to cut in the Notes.
5. Nothing says "ply", "hub", or a rules-internal word.

If a check fails, record what was heard in this step's Notes before any fix.

---

## Step 16 — Remove the fixture

Status: pending

Delete `src/game/reviewFixture.ts` and return `src/App.tsx` to building its
initial session from `startingGameState(...)` with a seed drawn from
`src/game/seed.ts`. Nothing else changes.

After this the app opens on the real starting position: fourteen ships in their
bays on 0 shields, five active sites and twelve dormant, nothing charged or
depleted, green to move on ply 1 with two actions — and now a fresh random seed
each time the page loads.

Do **not** remove or weaken any test added by Steps 1–11. None depends on the
fixture, and they are the only coverage of everything the starting position
cannot show quickly.

Depends on: Steps 13, 14 and 15 — every gate that needs the fixture has been
taken.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm run build` all pass, and:

1. A repository-wide search for `reviewFixture` and for its exported name
   returns nothing outside `doc/`.
2. Tests assert the shipped starting position: fourteen ships on their bays with
   no shields, five active and twelve dormant sites with nothing charged or
   depleted, green to move on ply 1 with two actions.
3. `src/rules/rulesVersion.test.ts` passes with `RULES_VERSION` at `"0.4"`.

---

## Step 17 — Manual gate: the shipped board

Status: pending

No code. A short last look at what a player will actually open, with the
fixture gone.

Depends on: Step 16.

Verification (manual): run `npm run dev`, open `http://localhost:5273`, and
confirm:

1. The real starting position is on screen: fourteen ships one per bay with no
   shields, five active sites (H8, E5, K5, E11, K11) and twelve dormant,
   nothing charged or depleted, "Green's turn — 2 actions left".
2. A game plays from it: move a ship toward a site, reach it, and watch it
   charge. Nothing of the fixture or of the pre-story board is out of place.
3. Reloading the page gives a **different** replacement draw when a node next
   runs out — the seed is fresh each load. (Confirming this properly takes a
   long game; it is enough to confirm the app opens without error and the
   sequence runs. If the seed is worth checking directly, add a temporary
   log — and remove it.)

---

## Step 18 — README check

Status: pending

`README.md`'s status paragraph currently tells the player, in as many words,
that "nodes never wake or run down, no shields are gained, and nothing is
scored yet". Two thirds of that is now false. Update it — the `/update-readme`
command reviews the branch diff and does this — so it says what the app now
does: nodes wake when a ship touches them, pay a shield a turn to the player
sitting on them, run out after nine turns and are replaced somewhere else at
random, and a ship left standing on a dead node must be moved clear. Keep it
truthful about what is still missing: **no fighting and no score**.

Check the rest of the README while there: the rules link and changelog link are
still correct, the "one detail is deliberately left open" sentence still matches
Appendix A (it should — this story closes nothing in Appendix A), and the
description of the game still reads true.

Player-facing text: "turn" and "node", written for a non-technical reader.

Depends on: Step 16 (the app is in its shipped shape).

Verification (automated): `npm run format:check` passes (prettier formats
markdown), and `npm run typecheck`, `npm run lint`, `npm test` and
`npm run build` are all green. Confirm by reading that the status paragraph
describes the app as it now behaves and claims nothing the app does not do.
