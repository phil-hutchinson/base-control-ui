# Implementation Plan — Story 00000111, Planet resources: new weights, and an in-place Node scramble

## What this story does

Two changes to planet resources (steal.md §10), under stable and race
alike:

1. **New kind weights.** Fuel's weight becomes **needs-based**: 10, plus
   one per point of power missing across every ship on the board (both
   sides; a ship's missing power is 6 minus its power), the addition capped
   at 30 — so 10 to 40. It is measured at the moment of each kind draw.
   Additional nodes and Node scramble go from 10 to **15**. The three
   points kinds keep 30 / 40 / 20.
2. **Node scramble shuffles in place.** Prospective squares no longer move:
   their **signals** are shuffled between the nodes, red and green first
   when player-matching is on, by a fixed, fully drawn placement procedure.
   To make that possible, a node's **extra** stops being a marked square
   and becomes a **count** (one more prospective square than usual), and a
   node's **anchor** is simplified to "its charged square if Held, else the
   nearest of its prospective squares".

The ruleset goes 0.42 → **0.43**. The Quick Guide's PLANET RESOURCES
closing list and the Node scramble claim announcement change wording.
`README.md` is expected to need no change.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what
order, and records the decisions and rejected alternatives, because code in
this repository deliberately carries no design history (`CONTRIBUTING.md`,
"Comments").

## Baseline on this branch

Branch `feat/111-tweak-planet-resources`, clean at the start of planning
(`story.md` already committed).

- `npm test` — **90 test files, 1969 tests, all green** (about two minutes
  in the container).
- `npm run typecheck`, `npm run lint` and `npm run format:check` are
  expected clean. Every step must leave them that way; if a step's own edit
  trips `format:check`, run `npx prettier --write` on the files that step
  touched (this plan file included, if an edit to it flags).

## How this plan is run

Steps 1–3 and 5 are verified automatically. The one manual gate is
**Step 4**, where the owner reads the Quick Guide copy and plays the
finished feature against the story's Verification list; every check the
owner would otherwise have paused for is collected there. A step that
cannot be made green is marked `blocked` with the reason in its Notes —
never pushed through with a weakened test.

If a step ends up building something different from what `story.md` says,
correct `story.md` in place to what was actually built (and say so in the
step's Notes); do not leave a stale statement in it.

No accessibility work is planned (`CLAUDE.md`, "Accessibility during
pre-release"). None of these steps is expected to cost an accessible
behaviour; if one does, record it in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` and say so in
the step's Notes. Live-region (announcement) wording is covered by the
automated suite and is kept out of the manual check. No review fixtures and
no manual test scripts are planned.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what the ruleset, the
  UI, the Quick Guide and `README.md` say (`CLAUDE.md`, Vocabulary).
  **Move** means one ship changing squares, never a ply or a turn.
- **Planet resources** is the player-facing name of the setting (off /
  stable / race); in code and tests it is **activity** —
  `planetActivity`, "activity bonus", `activityBonus.ts`. The split is
  deliberate; do not "fix" it either way.
- **Signal** — what ties a steal node's squares together (steal.md §2); the
  app shows it as a colour. **Prospective square** — a square a node waits
  on; the Quick Guide and announcements call it a **waiting square**.
- **Power** in code and the ruleset is **fuel** in the Quick Guide and in
  `story.md`'s wording of the Fuel weight ("missing fuel" = 6 − power).
- **Held** / **Open** — a node with / without a charged square (steal.md
  §2).
- **Matched signals** — under player-matching (double or required), red's
  signal is `nodeCount − 2` and green's is `nodeCount − 1`
  (`matchedSignalForSide` in `src/rules/steal.ts`).

## Settled decisions — from the story, do not reopen

A step that finds one of these inconvenient marks itself `blocked` and
escalates rather than re-deciding.

- **S1. Weights.** Small 30, Medium 40, Large 20, Fuel `10 + min(30,
  missing)`, Additional nodes 15, Node scramble 15. `missing` is the sum,
  over **every ship of both sides**, of `6 − power`.
- **S2. When Fuel's weight is measured.** At each kind draw, from every
  ship's power as it stands at that instant: after the move's cost is paid,
  after any leave resolves, after the claimed bonus's own effect (a Fuel
  just paid included), and **before** the end-of-turn recovery, which
  never counts. In a fight, the attacker's claim sees the attacker's power
  after paying for the shot and the defender's power as it stands; the
  defender's claim sees everything the attacker's claim already did. At the
  opening deal every ship is full, so Fuel's weight is 10. The existing
  claim order (steal.md §10) already runs in exactly this sequence; the
  code change is only that the kind draw reads the ships.
- **S3. Scramble scope.** Only prospective squares take part, extras
  included. Charged squares and the ships on them are untouched. No square
  is added, removed or drawn anew; each node keeps exactly as many
  prospective squares as it had (a Held node stays Held, an Open node Open).
- **S4. Scramble procedure.** Take every prospective square's signal off
  it. Place the signals back one at a time: first, if player-matching is
  on, the red and green signals; then the rest (with player-matching off,
  only this phase, taking every signal). Each placement draws a signal
  among those still unplaced in the current phase, **weighted by how many
  of each are still unplaced**; then draws a square uniformly among the
  still-empty squares **whose pre-shuffle signal is different from the
  drawn one**, or, if there is none, among every still-empty square.
  **Every placement draws both**, even when there is only one option. All
  draws come from the game's seeded stream.
- **S5. The extra is a count.** A node carries an extra when it has one
  more prospective square than usual — three when Open, two when Held.
  Claiming, leaving and Additional nodes behave exactly as before in terms
  of counts: a claim leaves one fresh square (the extra is used up), a
  leave keeps the extra (Open with three), Additional nodes skips a node
  that already carries its extra.
- **S6. The anchor.** A node's anchor for steal.md §6's weighted draw is
  its charged square if it is Held, otherwise the **nearest** of its
  prospective squares (for each candidate square, the anchor term is the
  distance to the nearest of them). The one play difference: a Held node
  carrying an extra that is left now draws its second square pushed away
  from the nearer of its two remaining prospective squares, not from "the
  extra" alone. Accepted by the owner.
- **S7. Wording.** Quick Guide PLANET RESOURCES: the closing list says a
  scramble swaps the colours of every node's waiting squares (in place of
  "every node's waiting squares redrawn"). Claim announcement: the waiting
  squares were shuffled between the nodes (in place of "redrawn"). The
  bonus panel, symbols, captions and hover glow do not change; no new
  visual marks a scramble.
- **S8. Ruleset.** One bump, 0.42 → 0.43, one changelog entry, its own
  commit ahead of the code. No tagging. Any later rules edit on this branch
  folds into this same bump and entry.

## Design decisions — made by this plan

### D1. Fuel's weight reads the ships at each draw

`drawActivityBonusKind` (in `src/rules/activityBonus.ts`) gains a `ships`
argument (read-only, only `power` is used) and computes Fuel's weight from
it on every call. A small exported pure helper — suggested name
`fuelWeight(ships)` — returns `10 + min(30, Σ(6 − power))`, using
`MAX_POWER` from `src/rules/power.ts` for the 6; the base 10 and the cap 30
are named constants beside `ACTIVITY_BONUS_WEIGHTS`, whose `fuel` entry
goes away (the table keeps the five fixed weights; Fuel's comes from the
helper). Exporting the helper makes the formula directly testable without
statistical sampling.

- `dealActivityBonuses` also takes `ships`; `startingGameState` in
  `src/rules/gameState.ts` passes the starting fleet it has just built.
  Every ship starts full, so the opening weight is 10 by consequence rather
  than by a special case — the rule in steal.md is "measured at each draw",
  and the opening is not an exception to it.
- `resolveActivityBonusClaim` passes its local `ships` — the value **after**
  the claimed kind's own effect — to both of its kind draws (survivor under
  race, new bonus). That value already reflects the move's cost and any
  leave (`ply.ts` applies both before calling `claimActivityBonus`), and
  end-of-turn recovery runs later, in `runEndOfTurn`. So S2 is met without
  touching `ply.ts`'s ordering. The step's tests prove it rather than
  assume it.
- **Rejected:** passing a precomputed "missing power" number instead of the
  ships. It would push the rule's arithmetic into every caller and let a
  caller measure at the wrong moment; passing the ships keeps the rule in
  one place.
- **Rejected:** a separate `fuelWeight` argument threaded from `ply.ts`.
  Same objection, and `ply.ts` has no business knowing the weight table.

The seeded stream changes for any game with planet resources on (the kind
draws' weights change); this is expected, and no "prove the stream is
unchanged" test is wanted. The seed-step **count** of every draw is
unchanged (one step per kind draw).

### D2. The extra as a count: `NodeStatus.extra` is removed

`NodeStatus.extra` (in `src/rules/gameState.ts`) is deleted, with its doc
paragraph rewritten to say steal node squares carry only `state`, `level`
and `signal`. A new exported helper in `src/rules/steal.ts` — suggested
name `nodeCarriesExtra(nodes, signal)` — answers "does this signal carry
an extra?" by count: more than one prospective square when Held, more than
two when Open. `everyNodeHasExtra` and `addExtraProspectiveSquares` switch
to it; the square Additional nodes adds is an ordinary prospective square
with no marker.

- **Why remove rather than keep the flag:** once signals move between
  squares, a flag on a square would travel with the wrong node or be
  duplicated; the story settles (S5) that no square is the extra. Keeping a
  flag the rules no longer mention would be a rule the ruleset does not
  state (`CLAUDE.md`).
- **Rejected:** moving the flag to a per-signal record on `GameState`. The
  count is fully derivable from `nodes`, exactly as fleet size is from
  `ships`; a stored copy could drift.
- `claimNode` already discards every square of the signal but the claimed
  one, so it needs no logic change — only its doc comment loses the word
  "extra" as a square. `abandonNode` needs no logic change either: it
  deletes the vacated square and anchors per `nodeAnchor`, which D3
  changes.
- Nothing serializes `extra` (no record format, session or address code
  reads it; checked at planning time with a repository-wide search), so its
  removal is contained to rules code and tests.

### D3. `nodeAnchor` simplified

`nodeAnchor` in `src/rules/steal.ts` returns the charged square if the
signal has one; otherwise **all** its prospective squares (throwing, as
today, if the signal has no squares). `stealProspectiveWeight` in
`src/rules/nodePlacement.ts` already takes the minimum distance over the
anchor list, so "nearest" needs no change there — only its doc comment and
`drawStealProspectiveSquare`'s, which today describe the multi-anchor case
as special to Additional nodes. The "extra first" branch goes away.

Callers and what they now see: `abandonNode` (one remaining prospective
square, or two when the node carried an extra — the S6 behaviour change);
`addExtraProspectiveSquares` (charged square when Held; both prospective
squares when Open — unchanged). `claimNode` and the opening deal pass their
anchor explicitly and do not call `nodeAnchor`.

### D4. The shuffle: one pure function in `steal.ts`

`scrambleProspectiveSquares` is replaced by a new pure function in
`src/rules/steal.ts` — suggested name `shuffleProspectiveSignals` — taking
the node map, the node count, the player-matching setting and a seed, and
returning the new node map and the next seed. It needs no ship squares
(nothing is drawn from the board's pool). Its fixed order, which is what
makes a record replay, is stated in the module header comment and is:

1. `P` = every prospective square, in `ALL_SQUARES` (board) order, each
   remembered with its pre-shuffle signal. Unplaced count per signal = how
   many squares of `P` carried it.
2. Phases: with player-matching on, phase 1 is `[red's matched signal,
   green's matched signal]` in ascending signal order, phase 2 is every
   other signal of the game in ascending order; with it off, one phase of
   every signal `0 … nodeCount − 1` ascending.
3. While the current phase has an unplaced signal: one
   `drawWeightedIndex` step over the phase's signals in phase order, weight
   = unplaced count (0 is legal and never drawn); then one `drawIndex` step
   over the candidate squares — the still-empty squares of `P` in board
   order whose pre-shuffle signal differs from the drawn one, or, if that
   list is empty, every still-empty square of `P` in board order. The drawn
   square takes the drawn signal (state `prospective`, level 0).
4. Exactly `2 × |P|` seed steps, always.

Properties this guarantees, which the tests check: the key set of the node
map is unchanged; every charged entry is identical; every signal keeps its
count of prospective squares; with player-matching on, the very first
placement is red or green and always has a different-signal square to go to
(there are at least three nodes, each with at least one prospective
square), so at least one square changes to red or green.

- **Why weighted-by-remaining for the signal draw:** it is what the rule
  says (S4); it makes each unplaced signal instance equally likely to go
  next.
- **Why board order and ascending signal order:** any fixed order would do;
  these are the orders the rest of `steal.ts` already uses, so a reader of
  a replay has one convention to learn.
- **Rejected (by the owner, recorded in story.md):** a shuffle that
  maximises how many squares change colour — it often leaves only one or
  two outcomes, making the scramble predictable. Also rejected: skipping a
  draw when only one option exists — it would make the seed-step count
  depend on the board, complicating replay reasoning for no gain.
- **Rejected:** keeping the name `scrambleProspectiveSquares`. The old name
  describes redrawing squares, which no longer happens.

### D5. The claim outcome and effect lose `removedSquares`

`ActivityBonusClaimOutcome` (`activityBonus.ts`) and
`ActivityBonusClaimedEffect` (`src/rules/ply.ts`) carry `removedSquares`
only for Node scramble; after this story it would always be empty, so it is
**removed** from both, and `addedSquares` is documented as Additional
nodes' only. No consumer reads `removedSquares` outside tests (checked at
planning time: `announcements.ts`, `EnergyOverlay.tsx` and
`boardAnimations.ts` do not). The board recolours by itself: `Board.tsx`
colours each square from its current `signal`, so no view code changes.

- **Rejected:** adding a `recolouredSquares` list to the effect. Nothing
  would consume it — a scramble visual is out of scope — and an unused
  field is noise. A future visual story can add it.

`assertFightInvariants` in `ply.ts` already skips its node-equality check
whenever planet resources is on; only its comment, which says a scramble
adds and removes squares, is updated.

### D6. Where the tests land

- Weight formula and draw distribution: `src/rules/activityBonus.test.ts`.
- "Measured after cost / Fuel, before recovery", at `applyMove` and
  `applyAttack` level: `src/rules/activityBonusClaim.test.ts`.
- Extra-by-count, anchor, shuffle properties and seed-step count:
  `src/rules/steal.test.ts`.
- Whole-game invariants (count-based extras) and replay:
  `src/rules/fullGame.test.ts`, `src/rules/seededReplay.test.ts` (existing
  tests; the replay tests compare two runs of the same seed, so they need
  no new expected values).

## Step sequence at a glance

| Step | What                                                         | Verification |
| ---- | ------------------------------------------------------------ | ------------ |
| 1    | Ruleset 0.43: steal.md §§4, 6, 10, rules.md §1, changelog    | automated    |
| 2    | Needs-based Fuel weight, 15/15 for the node kinds            | automated    |
| 3    | Extra as a count, simplified anchor, in-place Node scramble  | automated    |
| 4    | Quick Guide wording, README check, owner plays the story     | manual       |

Steps 2 and 3 are independent of each other in code (different functions,
overlapping only in `activityBonus.ts`'s claim function and its test file)
and could run in either order; weights come first because they are the
smaller change and their tests do not depend on the node model.

---

### Step 1 — The ruleset goes to 0.43

Status: committed

Notes: steal.md §§2, 3, 4, 6, 10 and rules.md §1 rewritten per S1–S6, version 0.43 in rules.md and `RULES_VERSION`, one changelog entry. §6 now also states that a multi-square anchor's `d(s, a)` is the distance to the nearest, matching §10's anchor paragraph; the "Available" paragraph was extended to cover Fuel's weight (the full statement lives in a new "Fuel's weight" paragraph after the kinds table). Inspection: `## 0.43` appears once in changelog.md; the only "redrawn" left in steal.md is the race redraw of a bonus's kind, and "its extra, if it has one" is gone.

Edit `doc/ruleset/steal.md` and `doc/ruleset/rules.md`; bump the version
line in `rules.md` to **0.43** and `RULES_VERSION` in
`src/rules/rulesVersion.ts` to `"0.43"`; add **one** entry at the top of
`doc/ruleset/changelog.md`, e.g. `## 0.43 — planet resources: needs-based
Fuel, and Node scramble shuffles in place`, in the shape of the 0.42 entry
(opening line saying it is a gameplay change and would be a tag candidate,
tagging on hold; bullets for each change; the list of sections touched;
"Nothing else changes"). This is a rules-only commit: no other code
changes.

Player-facing text: `steal.md` and `rules.md` are read by players, so write
plainly. Name no default and never call anything "standard". Use "turn",
not "ply".

**steal.md §10 (Planet resources):**

- **The six kinds table.** Weights per S1. Fuel's weight cell reads along
  the lines of "10 + missing fuel, up to 40" (keep it short; the paragraph
  below explains it). Node scramble's "What it does" cell becomes along the
  lines of "The signals on every node's prospective squares are shuffled
  between the nodes". Keep the table's column layout: the existing point
  table test regex in `src/rules/activityBonus.test.ts` only matches the
  point table's rows, so the kinds table is free to change, but do not
  alter the point table.
- **Fuel's weight** paragraph directly after the table: 10, plus one for
  every point of power missing across every ship on the board, of both
  players (a ship's missing power being 6 minus its power), the addition
  capped at 30, so 10 to 40. Measured at the moment of each kind draw, from
  the ships' power as it stands then. State the consequences for a claim
  (after the move's cost and any leave, after the claimed bonus's own
  effect — a Fuel just paid included — and before the end-of-turn recovery,
  which never counts), for a fight (the attacker's claim sees its power
  after the shot; the defender's claim sees everything the attacker's claim
  did), and for the opening deal (every ship full, so 10). Use "power" (the
  ruleset's word), not "fuel", for the ships' quantity; the bonus's name
  stays "Fuel".
- The existing **"Available" is checked at the moment of each draw**
  paragraph: extend it to say Fuel's weight is likewise measured then (or
  fold it into the paragraph above — one statement, not two that could
  disagree).
- **Fighting for a bonus**: the sentence "any square drawn by that claim
  (Additional nodes or Node scramble) treats that square as occupied" names
  Additional nodes only.
- **Additional nodes**: define "carries an extra" by count — a node carries
  an extra when it has one more prospective square than usual, three when
  Open and two when Held; no particular square is the extra. Keep what it
  does and when it is unavailable. The "A node with an extra square behaves
  as follows" bullets are reworded by count (claim: every other square
  goes, one fresh square is drawn, the node is back to the usual two; leave:
  the node keeps its extra, so it is Open with three prospective squares,
  until next claimed) without changing behaviour.
- **Node scramble** paragraph rewritten per S3 and S4: only prospective
  squares take part, extras included; charged squares and their ships
  untouched; squares stay put and each node keeps its count (Held stays
  Held, Open stays Open); the two-phase placement with the weighted signal
  draw and the "different pre-shuffle signal, else any empty square" square
  draw; every placement is drawn even with one option; all from the seeded
  stream. Include the story's note that the shuffle does not promise every
  square or node changes, and why (it keeps the scramble unpredictable,
  while always moving at least one red or green square when player-matching
  is on) — short, player-facing.
- **The anchor paragraph** ("The anchor of a node with an extra") is
  replaced by the simplified rule (S6): the charged square when Held,
  otherwise the nearest of its prospective squares — the anchor term being
  the distance from the candidate square to the nearest of them. Keep the
  sentence that the other-node term `S` is unchanged (every square of every
  other node).
- **Seeded draws** list: replace "every square that Additional nodes or
  Node scramble places" with every square Additional nodes places and every
  draw of a Node scramble's shuffle (a signal and a square for each
  placement).

**steal.md §6:** the anchor definition drops its parenthetical carve-out
("which this does not cover") and gives the simplified definition —
charged square when Held, otherwise the nearest of its prospective squares
(which, without an extra, is simply its one remaining square) — pointing to
§10 for the extra. §6 and §10 must say the same thing.

**steal.md §4:** the sentence saying a node's "extra prospective square …
survives leaving alongside this second square" is reworded so it does not
single out a square — e.g. a node carrying an extra (section 10) still
carries it after leaving. This section is not named in `story.md`'s list,
but the story's own principle ("no rule was ever meant to single out which
of a node's squares is its extra") requires it; mention it in the
changelog's sections list. Check §§2–3 for any other wording that names a
particular square as "the extra" and adjust likewise; the §2 table
(counts) is already correct.

**rules.md §1** (random-elements paragraph): "and, for two of the six
kinds, which squares change on the board" becomes wording that covers both
— where Additional nodes places its squares, and how a Node scramble
shuffles the waiting squares' signals (steal.md §10). Nothing else in
rules.md changes beyond the version line.

Depends on: nothing. Comes first because the ruleset is what Steps 2–3
implement (`CLAUDE.md`, "Rules versioning").

Verification (automated): full `npm test` green — in particular
`src/rules/rulesVersion.test.ts` (version agrees at 0.43, changelog has a
`## 0.43 ` entry) and the point-table mirror test in
`src/rules/activityBonus.test.ts` (point table untouched). `npm run
typecheck`, `npm run lint` and `npm run format:check` clean. Inspection,
recorded in Notes: `## 0.43` appears exactly once in `changelog.md`; a
search of `steal.md` for "redrawn" and for "its extra, if it has one" finds
no stale scramble or anchor wording; the §6 and §10 anchor definitions
agree.

---

### Step 2 — Needs-based Fuel weight, and 15 for the node kinds

Status: committed

Notes: `fuelWeight(ships)` (with `FUEL_BASE_WEIGHT` / `FUEL_MISSING_POWER_CAP`) added in `activityBonus.ts`; `drawActivityBonusKind` and `dealActivityBonuses` take the ships (before `excludedKinds` / `seed` respectively), `startingGameState` passes its fleet, and the claim passes its post-effect ships to both kind draws. Tests as planned; the ply-level fight test gives its state a three-signal node map so a defender landing on a freshly dealt Additional nodes bonus has nodes to act on. No replay seed or run length needed changing.

Implement D1 in `src/rules/activityBonus.ts`:

- Weights: Additional nodes and Node scramble 15; Fuel removed from the
  fixed table and computed by an exported `fuelWeight(ships)` helper
  (`10 + min(30, Σ(MAX_POWER − power))` over every ship given), with the
  base and cap as named constants.
- `drawActivityBonusKind` takes the ships and uses `fuelWeight` for Fuel's
  entry (still zeroed when Fuel is excluded). Still a single
  `drawWeightedIndex` call over all six kinds in table order — exactly one
  seed step.
- `dealActivityBonuses` takes the ships and passes them to both kind draws;
  `startingGameState` (`src/rules/gameState.ts`) passes its freshly built
  fleet.
- `resolveActivityBonusClaim` passes its post-effect `ships` to both kind
  draws.
- Update the module header comment and the doc comments of the functions
  touched so they state the new weights and "Fuel's weight is measured from
  the ships at each draw". No design history in comments (`CONTRIBUTING.md`).

Tests:

- `src/rules/activityBonus.test.ts`:
  - `fuelWeight`: full fleets → 10; a known small shortfall (e.g. 7 missing
    across both sides) → 17; exactly 30 missing → 40; more than 30 missing
    → 40; ships of **both** sides count; an empty list → 10.
  - The frequency test: with full ships (or none), expected shares are
    30/40/20/10/15/15 out of **130**. Add a second sample with ships far
    below full (≥ 30 missing) where Fuel's expected share is 40/155.
  - Existing calls to `drawActivityBonusKind` / `dealActivityBonuses` gain
    a ships argument.
  - The opening deal: `dealActivityBonuses` with a full starting fleet
    gives exactly what it gives with an empty ship list (both weight 10) —
    and a matching assertion in `src/rules/gameState.test.ts`'s existing
    "deals exactly the pair …" test, whose call gains the fleet.
  - `resolveActivityBonusClaim` of a **Fuel** bonus: the survivor (race) and
    new-bonus kinds equal what `drawActivityBonusKind` gives, chaining the
    seed as the header describes, from the **post-Fuel** ships. Make the
    test discriminating: pick (by a search inside the test over seeds, or
    fixed after a one-off search) a case where the pre-Fuel ships would
    have drawn a different kind, and assert that too.
- `src/rules/activityBonusClaim.test.ts` (ply level):
  - A costly move (e.g. a diagonal, which costs power per rules.md §6) onto
    a points bonus planet: the new bonus's kind (and, under race, the
    survivor's) equals the draw made from the ships' power **after** the
    move's cost and **before** end-of-turn recovery; discriminating as
    above against the post-recovery power (the ship recovers on the planet
    at end of turn).
  - A fight under planet resources (combat on) where the attacker lands on
    a bonus: its claim's kind draws use the attacker's power after paying
    for the shot; the defender's power is as it stood.
  - The existing seed-chain test around the stable claim (it calls
    `drawActivityBonusKind`) gains the ships.
- `src/rules/seededReplay.test.ts` and `src/rules/fullGame.test.ts` need no
  new expectations; if a "not vacuous" check (e.g. "bonus claims of every
  kind") fails because the changed stream no longer produces some kind with
  the current seed or length, change the seed or lengthen the run, and say
  so in Notes. Do not weaken the check.

Depends on: Step 1 (steal.md §10 states the weights this implements).
Independent of Step 3.

Verification (automated): full `npm test`, `npm run typecheck`,
`npm run lint`, `npm run format:check` all clean, with the tests above
present and passing.

---

### Step 3 — Extra as a count, simplified anchor, and the in-place Node scramble

Status: pending

One step because the three changes cannot be separated cleanly: the
in-place shuffle moves signals between squares, which breaks any per-square
extra marker (D2), and removing the marker changes the anchor (D3); doing
them one at a time would mean temporarily rewriting the old scramble around
a count it was never designed for.

**Rules code:**

- `src/rules/gameState.ts`: remove `NodeStatus.extra` and rewrite its doc
  paragraph (D2).
- `src/rules/steal.ts`:
  - Add `nodeCarriesExtra` (D2); `everyNodeHasExtra` and
    `addExtraProspectiveSquares` use it; Additional nodes' new square is an
    ordinary prospective entry.
  - Simplify `nodeAnchor` (D3).
  - Replace `scrambleProspectiveSquares` with `shuffleProspectiveSignals`
    (D4), including its seed-step order in the module header comment, which
    also drops the old scramble's step description and the extra-anchored
    wording in `abandonNode`'s and `claimNode`'s doc comments.
- `src/rules/nodePlacement.ts`: doc comments of `stealProspectiveWeight`
  and `drawStealProspectiveSquare` describe the anchor list as "the charged
  square, or every prospective square of the node (nearest counts)" rather
  than as an Additional-nodes special case. No logic change.
- `src/rules/activityBonus.ts`: the Node scramble branch calls
  `shuffleProspectiveSignals` with `state.playerMatching`; remove
  `removedSquares` from `ActivityBonusClaimOutcome` (D5); update the header
  comment's seed-step list (a scramble claim's own draws are now
  `2 × (number of prospective squares)`).
- `src/rules/ply.ts`: remove `removedSquares` from
  `ActivityBonusClaimedEffect` and from `claimActivityBonus`; update the
  effect's doc comment and `assertFightInvariants`' comment (D5).
- `src/board/announcements.ts`: the Node scramble detail becomes "every
  node's waiting squares were shuffled between the nodes." (S7); update the
  doc comment of `activityBonusClaimedDetail`.

**Tests:**

- `src/rules/steal.test.ts`:
  - `nodeAnchor`: Held (with one or two prospective squares) → the charged
    square; Open with one, two or three prospective squares → all of them;
    throws with none. Remove the extra-flag cases.
  - `nodeCarriesExtra` / `everyNodeHasExtra`: by count, Held with 1 vs 2,
    Open with 2 vs 3.
  - `addExtraProspectiveSquares`: adapt to count (a node already carrying
    an extra — by count — is skipped; afterwards every node carries one).
  - `abandonNode` of a Held node carrying an extra: ends Open with three
    prospective squares, and its draw is anchored on both remaining
    prospective squares (reproduce the draw with
    `drawStealProspectiveSquare` and both anchors, and assert equality).
  - `shuffleProspectiveSignals`, replacing the scramble tests: the node
    map's key set is unchanged; every charged entry is identical; each
    signal's prospective count is unchanged (so Held/Open unchanged);
    exactly `2 × |P|` seed steps (step `mulberry32` that many times from the
    input seed and compare); same seed → same result, different seeds →
    some different result; with player-matching on (double and required),
    over a few hundred seeds, at least one square that was not red's or
    green's signal before now carries one of them — every time; a
    fallback-forcing board (one signal owning most prospective squares,
    e.g. an Open node carrying an extra with three squares plus two Held
    nodes with one each) shuffles without throwing and keeps every
    invariant over many seeds; with player-matching off, the function works
    for 3, 4 and 5 nodes.
- `src/rules/activityBonus.test.ts`: the `everyNodeWithExtra` helper builds
  three prospective squares per signal instead of flagging one; the
  Additional nodes and Node scramble `resolveActivityBonusClaim` tests
  assert the new behaviour (scramble: same key set, charged untouched,
  counts preserved; `outcome.addedSquares` empty); remove `removedSquares`
  assertions.
- `src/rules/activityBonusClaim.test.ts`: the "redraws every node's
  ordinary prospective squares …" test becomes the in-place property at
  `applyMove` level (same squares, charged and ships untouched, counts
  preserved); the leave-then-scramble test asserts the left node's
  prospective squares take part in the shuffle; the "node whose extra
  survives both the leave and the scramble" test asserts by count; the
  fight test that treats the defender's square as occupied stays for
  Additional nodes; remove `extra: true` from fixtures.
- `src/rules/fullGame.test.ts`: `assertStealNodeInvariants` becomes
  count-based — per signal, at most one charged square; prospective count
  is 1–2 when Held and 2–3 when Open; no `extra` field.
- `src/board/Board.test.tsx`: the three-square test drops its `extra`
  line (it still checks three rings in the signal's colour).
- `src/board/announcements.test.ts`: remove `removedSquares` from
  fixtures; the Node scramble expectation reads "… every node's waiting
  squares were shuffled between the nodes. Red's turn."
- Replay tests: as Step 2 — adjust a seed or run length only if a
  non-vacuity check fails, and record it.

Depends on: Step 1 (steal.md §§4, 6, 10 state the rules). Does not depend
on Step 2, though if Step 2 is committed its ships argument is already in
the claim function this step edits.

Verification (automated): full `npm test`, `npm run typecheck`,
`npm run lint`, `npm run format:check` all clean. A repository-wide search
for `extra:`/`.extra` in `src/` finds nothing but unrelated words, and for
`removedSquares` and `scrambleProspectiveSquares` finds nothing; recorded
in Notes.

---

### Step 4 — The Quick Guide's wording, and the owner plays the finished story

Status: pending

In `src/guide/guideCopy.ts`, the PLANET RESOURCES paragraph's closing list
replaces "or every node's waiting squares redrawn." with wording that says
a scramble swaps the colours of every node's waiting squares — e.g. "or the
colours of every node's waiting squares swapped around." Keep the Guide's
vocabulary (points, fuel, spaceships, waiting squares). Update the verbatim
expectation in `src/guide/guideCopy.test.ts`. The section's diagram and
heading do not change. If the owner rewords it during the check below, use
the owner's words verbatim and note it.

Also check `README.md` against this branch (the `/update-readme` job,
folded in here at the owner's request): it already calls a scramble "a
shuffle of every node's waiting squares" and states no kind weights, so no
change is expected — confirm that a search for "redrawn" or any weight
figure finds nothing, and record in Notes whether README changed.

Depends on: Steps 2 and 3 (the owner plays the finished feature here).

Verification (manual — the pipeline pauses here). First run full
`npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`
(all clean). Then the owner runs `npm run dev` in the container and:

1. Opens the Quick Guide and reads the PLANET RESOURCES section: the
   closing list describes a scramble as swapping the waiting squares'
   colours, and nothing else in the section changed.
2. Starts a STEAL game with planet resources RACE and player-matching
   REQUIRED (or DOUBLE), and plays until a Node scramble bonus is claimed
   (it is now weight 15 of about 130+, so it turns up within a few claims).
   Before claiming, notes the waiting squares on the board. After the
   claim: **every waiting square is still lit in the same place**, none
   has vanished or appeared elsewhere; their **colours have changed**; at
   least one square now shows red or green that did not before; each
   colour has the same number of waiting squares as before; **charged
   squares and the ships on them are unchanged**.
3. If an Additional nodes bonus has been claimed earlier in the game, a
   scramble afterwards keeps each node's three (or, held, two) waiting
   squares — the counts per colour are preserved.
4. Plays on through a few claims with the fleets full at the start and
   then low: Fuel is rarely on offer early, and turns up more often once
   ships have spent power. (A feel check only; the automated tests pin the
   weights.)
5. Repeats step 2 once with STABLE: the scramble behaves the same.
6. Confirms the bonus panel, its symbols, captions and hover glow look as
   before.

Announcement wording is not part of this check (covered by the automated
suite). Record the owner's outcome in Notes.
