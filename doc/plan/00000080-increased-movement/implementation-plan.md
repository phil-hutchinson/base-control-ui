# Implementation Plan — Story 00000080, A third unit of fuel buys a longer move

## What this story does

Today §6's table prices four shapes at 0, 1, 2 and 2, and a ship's reach is
**twenty** squares. Nothing costs more than 2, so a full tank buys repeats,
never a move a half-empty ship could not make.

This story adds three shapes, all priced at **3**:

| Move                                                     | Cost |
| -------------------------------------------------------- | ---- |
| three squares orthogonally — offsets (±3, 0) and (0, ±3) | 3    |
| two squares diagonally — offsets (±2, ±2)                | 3    |
| the **long knight** — offsets (±3, ±1) and (±1, ±3)      | 3    |

Sixteen new destinations, so reach goes from **twenty to thirty-six**. Attacks
follow automatically: §7 already gives an attack "the same shapes, priced the
same way", and `combat.ts` reads `movement.ts`'s tables rather than carrying a
copy, so no attack-specific work is planned and none is wanted.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions, because code in this repository deliberately
carries no design history (`CONTRIBUTING.md`, "Comments").

## Baseline on this branch

Branch `feat/80-increased-movement`, clean at the start of planning.

- `npm test` — **64 test files, 1184 tests, all green**.
- `npm run typecheck` and `npm run lint` — clean.
- `npm run format:check` — **three pre-existing warnings**:
  `doc/plan/00000069-retire-actions/story.md`,
  `doc/plan/00000080-increased-movement/story.md` and
  `src/board/planetArt.ts`. These are not this story's to fix and must not be
  "tidied" in passing. (The new `implementation-plan.md` itself may also want
  formatting; run `npx prettier --write` on **it** only if it is flagged, and
  leave the other three alone.)

The test count will **rise** over this story as new geometry is pinned.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say (`CLAUDE.md`, Vocabulary). Do not mix them.
- **Move** is the movement action specifically, never a synonym for a turn.
- **Long knight** is the story's and the rules' name for the (3, 1) leap.
  `rules.md` §6 introduces it once and then uses it; code and tests use the
  same words.
- **Node** is the word everywhere.

## Settled decisions — do not reopen

These come from `story.md` and the discussion around it. A step that finds one
inconvenient escalates to the owner rather than re-deciding.

- **S1. All three new shapes cost 3.** Not 3, 3 and 4; not a cheaper diagonal.
  The reach becomes exactly thirty-six.
- **S2. The long knight is blocked by an enemy on any of five squares.** For
  H8 to K9 those are **I8, J8, K8, I9 and J9** — the union of every way of
  walking the shape out of single steps whose first step is along the long
  axis. **H9 is deliberately not one of them**: stepping across before
  starting the run is not a way of walking this shape.
- **S3. Attacks follow movement range, with no cap of their own.** A ship with
  3 power can strike anywhere in the thirty-six, paying 3, and still has
  budget left if it carries more. No attack-specific range rule, no separate
  attack price.
- **S4. The rules edit is its own commit, ahead of the code.** `rules.md`
  0.32 → 0.33, `RULES_VERSION` to match, one `changelog.md` entry. **One
  version bump for the whole branch**: if a later step finds more wording to
  correct in `rules.md`, it folds into 0.33's entry and does not add a second
  bump.
- **S5. Nothing is retuned.** Countdown lengths, node counts, the 0–6 tank,
  the charge rate, fleet sizes, rounds, the clock and §3.2's node spacing all
  keep their values. Whether the game wants a shorter tank or a longer
  countdown at this reach is a later story's question, answered on evidence.
- **S6. No new refusal reason.** A shape a ship cannot pay for is still
  `cannot-afford` (`cannot-afford-target` for an attack); a square no shape
  reaches is still `out-of-range` (`target-out-of-range`).
- **S7. Tagging stays on hold** even though this is a gameplay change
  (`CLAUDE.md`). Bump the version, write the changelog entry, do not tag.
- **S8. No accessibility repair steps, no review fixtures, no manual test
  scripts** (`CLAUDE.md`, pre-release stance). Where an existing automated
  test has a straightforward path to being updated, update it. Nothing is
  expected to cost an accessible behaviour here; if a step knowingly does,
  it adds a note to
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather than
  doing the repair.

## Decisions this plan makes

### D1. The geometry stays in one place

`src/rules/movement.ts` is the only implementation of §6, and stays so.
`REACH_OPTIONS` gains three rows; every consumer (`reachFrom`,
`shapeReaching`, `moveRefusalReason`, `legalDestinations`, `combat.ts`,
`canMoveOrAttack.ts`, `ply.ts`, `relief.ts`, `Board.tsx`, `session.ts`,
`movementCosts.ts`) reads those tables and needs **no** change. This was
checked by prototyping the change during planning: with the three rows added,
`npm run typecheck` was clean and **only five test files** reacted at all
(see D8). If a step nonetheless finds a source file outside `movement.ts` that
must change to know about a shape, that is a shape assumption that has leaked —
record it in the step's `Notes:` in as many words.

### D2. The offsets are data, not derived

The long knight's eight offsets and their passed-over squares are **written
down as a table**, matching how `L_OFFSETS` is written today and for the same
reason: the table can be read against §6 at a glance. A test pins the sign
rule that generates it (Step 5), so a transcription slip is caught without the
production code having to compute anything. Rejected: generating the offsets
from a sign rule in production code — it reads worse against the rules
document and moves the thing under test out of sight.

### D3. The L's corner pair generalises to a list of passed-over offsets

`LOffset` today carries a fixed `orthogonalCorner` and `diagonalCorner`. The
long knight needs five. The pair becomes a **list of passed-over offsets** on
a single "leap" option kind, and both tables — the L's (two each) and the long
knight's (five each) — use it.

- The `kind` discriminator is internal (`ReachOption` and its variants are not
  exported and nothing outside `movement.ts` reads `kind`), so one shared
  `"leap"` kind is simpler than two near-identical branches. Rejected: a
  second `kind` per shape, which would duplicate the branch in
  `allShapesFrom` for no gain.
- **Order within `passedOver` is preserved for the L** — orthogonal corner
  first, then diagonal corner — because `movement.test.ts` and
  `combat.test.ts` both assert that order today, and it reads the way §6
  describes the L.
- **The long knight's order is defined as**: the three squares of the run
  along the long axis, near to far, then the two offset squares, near to far.
  For H8 to K9 that is I8, J8, K8, I9, J9. Nothing in production code depends
  on the order — blocking treats `passedOver` as a set — so this is for
  readability and for tests to pin.
- The existing invariant guard stays: if a destination is on the board but one
  of its passed-over squares is not, that is a bug and throws. It still holds
  for the long knight, because every passed-over offset lies inside the
  rectangle spanned by the origin and the destination. Generalise the
  message's wording from "an L's corner" to a leap's passed-over square.

### D4. The straight option's distance widens to 1 | 2 | 3

`StraightReachOption.distance` is the literal union `1 | 2` today; it becomes
`1 | 2 | 3`. Rejected: widening it to `number`, which would let a typo add a
shape §6 does not have. Nothing plans for a distance beyond 3 — S5 and the
story's "out of scope" both rule out a 4-cost shape — so the union stays
tight.

### D5. Why the long knight's five include K8 and exclude H9

Worth writing down because it looks asymmetric. The five are the union of the
four single-step walks of the shape **whose first step is along the long
axis**:

| Route                                      | Passes over |
| ------------------------------------------ | ----------- |
| three orthogonal, then one across          | I8, J8, K8  |
| two orthogonal, then a diagonal            | I8, J8      |
| one orthogonal, a diagonal, one orthogonal | I8, J9      |
| a diagonal, then two orthogonal            | I9, J9      |

K8 is in because the first route turns through it; H9 is out because "step
across, then run" is not a way of walking this shape — the shape is three
forward with a one-square offset, so every route begins by going forward. A
consequence worth noticing: an enemy on **K8** blocks H8 to K9 even though K8
is not between the origin and the destination in any straight-line sense.
That is deliberate, and Step 5 pins it.

### D6. Sign rule for the long knight's table

For a destination offset (dc, dr) with |dc| = 3: let `s` be the sign of `dc`;
the five passed-over offsets are (s, 0), (2s, 0), (3s, 0), (s, dr), (2s, dr).
For |dr| = 3 the same with the axes swapped: let `s` be the sign of `dr`; the
five are (0, s), (0, 2s), (0, 3s), (dc, s), (dc, 2s). In full, the table the
implementer transcribes:

| Destination offset | Passed-over offsets                           |
| ------------------ | --------------------------------------------- |
| (3, 1)             | (1, 0), (2, 0), (3, 0), (1, 1), (2, 1)        |
| (3, -1)            | (1, 0), (2, 0), (3, 0), (1, -1), (2, -1)      |
| (-3, 1)            | (-1, 0), (-2, 0), (-3, 0), (-1, 1), (-2, 1)   |
| (-3, -1)           | (-1, 0), (-2, 0), (-3, 0), (-1, -1), (-2, -1) |
| (1, 3)             | (0, 1), (0, 2), (0, 3), (1, 1), (1, 2)        |
| (-1, 3)            | (0, 1), (0, 2), (0, 3), (-1, 1), (-1, 2)      |
| (1, -3)            | (0, -1), (0, -2), (0, -3), (1, -1), (1, -2)   |
| (-1, -3)           | (0, -1), (0, -2), (0, -3), (-1, -1), (-1, -2) |

Checked against the story's worked example: from H8, (3, 1) is K9 and its five
are I8, J8, K8, I9, J9, with H9 (offset (0, 1)) absent.

### D7. The thirty-six destinations are pairwise distinct

None of the sixteen new offsets collides with any of the twenty old ones, so
no destination is reachable by two shapes at two prices and `shapeReaching`'s
"first match wins" is never ambiguous. Step 5 pins the distinctness explicitly
so a future shape that does collide fails loudly rather than depending on row
order in `REACH_OPTIONS`.

### D8. What the wider reach actually breaks (measured, not guessed)

The change was prototyped during planning and the whole suite run. Typecheck
was clean and **seven tests in five files** failed — nothing else moved:

- `src/rules/movement.test.ts` — the §6 table test (20 vs 36), and "never
  reaches two squares diagonally or three squares orthogonally", which is now
  a statement of the opposite of the rules.
- `src/rules/combat.test.ts` — "refuses target-out-of-range for a target
  beyond the reach" uses H8 → H11, which is now a real shape (three
  orthogonally) and answers `cannot-afford-target`; and the reach-matching
  test's per-power count expectation (`20` for every power of 2 and up).
- `src/guide/movementCosts.test.ts` — "returns exactly twenty offsets", and
  "has no offset for the centre or the four (±2, ±2) corners", which are now
  reachable at 3.
- `src/guide/guideDiagrams.test.tsx` — the movement diagram's cell counts.

Everything else passed untouched, including `fullGame.test.ts`, `ply.test.ts`,
`session.test.ts`, `Board.test.tsx`, `camping.test.ts`, `relief.test.ts` and
`seededReplay.test.ts`. Step 4 is sized to that list.

### D9. `seededReplay.test.ts` passes, but its recorded figures go stale

This was the story's flagged risk, and the prototype answers it: the test
asserts **no hard-coded squares**. It plays a game with a deterministic
policy, replays it from the same seed and compares run against run, plus
floors (at least 1 fight, 2 planet returns, 4 charges, 4 retirements, 4
refills) and a different-seed divergence check. All of that still passes with
the wider reach.

What does go stale is the **measured commentary** in that file — "4 fights (8
planet returns) ... 18 charges, 17 retirements and 16 refills for this seed
over forty rounds". The wider reach changes the course of the game, so those
numbers are simply wrong afterwards. Under the planning prototype the same
seed produced **5 fights, 10 planet returns, 21 charges, 20 retirements and 20
refills**. Step 8 re-measures against the real implementation and writes what
it measures — it does **not** copy those numbers on trust, and it does not
quietly leave the old ones in place. The floors stay where they are unless a
measurement falls below one, in which case the step stops and escalates rather
than lowering a floor to fit.

### D10. `recovery.test.ts` keeps passing but stops being true

`src/rules/recovery.test.ts` asserts that a 2-power ship's reach is twenty
squares — still true — under a comment saying that is "already the full
twenty-square range, since the dearest shape costs 2; a further refill would
buy it a deeper budget to spend, not a longer reach". That reasoning dies with
this story: a further refill now buys a longer reach. The assertion passes, so
no test catches it; Step 8 fixes it at the assumption, extending the check to
show 2 power reaching twenty of the thirty-six and 3 power reaching all
thirty-six.

### D11. The guide's movement diagram derives its own size

`MovementDiagram` hard-codes `MOVEMENT_GRID_OFFSETS = [-2, -1, 0, 1, 2]` while
taking its costs from `movementCostOffsets()`. Half derived, half transcribed:
the costs cannot drift from §6 but the grid can, and this story is exactly the
change that would leave it behind (the prototype showed the 5 x 5 grid
silently gaining four 3s in its corners while still claiming twenty-one
squares).

The grid's extent becomes **derived from the offsets** — the largest absolute
row or column offset among them, mirrored either side of the ship. Today that
is 2, so the diagram stays 5 x 5 and nothing visible changes; once the three
shapes land it is 3, so the diagram becomes 7 x 7 for free. Rejected:
hard-coding `[-3, ..., 3]`, which keeps the same drift in place one story
later. This is why Step 3 exists ahead of Step 4 — scaffolding first, then the
behaviour that uses it.

### D12. Announcement wording

Three refusal sentences in `src/board/announcements.ts` recite the old table.
They are rewritten against the new one, each staying a single sentence that is
worth hearing aloud. The plan's wording, which Step 7 may tighten (recording
any change in its `Notes:`):

- `cannot-afford`: "<square> costs more power than the selected ship has. A
  step up, down, left or right is free; a diagonal step costs 1; two squares or
  an L cost 2; three squares, two diagonally, or three and one across cost 3."
- `target-out-of-range`: "<square> is not one of the shapes a ship can attack
  from here — up to three squares orthogonally, up to two diagonally, an L, or
  three and one across — whatever power it carries."
- `cannot-afford-target`: "The selected ship does not have the power to strike
  <square>. An orthogonal step is free, a diagonal costs 1, two squares or an L
  cost 2, and three squares, two diagonally, or three and one across cost 3."

**The announcements do not say "long knight."** That name is the rules
document's, and `rules.md` introduces and uses it; the spoken UI **describes
the shape instead** — "three and one across" — so a player who has never read
the rules is not sent to look a term up (owner's decision). This is the same
split the guide already makes, where the diagram shows costs and never names a
shape. The sentences stay full recitals of the table: complete, at the price of
length. They do not try to teach blocking; neither does the table they
describe.

### D13. What is **not** touched

- `GuideDiagram` itself — seven columns is already the widest diagram (node
  selection) and the stylesheet already shrinks squares to fit a narrow
  window.
- The guide's MOVEMENT paragraph — "For longer moves, fuel is required, as
  follows:" still reads true.
- `doc/ruleset/tech-notes.md` — its queue-sizing argument and measured node
  figures make no claim about reach, so nothing in it becomes false. (Its
  measured spacing between freshly drawn nodes, around 4.9 squares, now sits
  inside a single move's reach; that is an observation for a future tuning
  story, not work for this one — S5.)
- §3.2's node spacing, the tank, the charge rate, and every other tuned
  number.

## Step sequence at a glance

1. `rules.md` 0.32 → 0.33, `RULES_VERSION`, changelog — **its own commit,
   ahead of the code**.
2. Generalise the L's corner pair into a list of passed-over offsets — no new
   shapes, no behaviour change.
3. The guide's movement diagram derives its grid extent — no visible change
   yet.
4. Add the three shapes, and repair the five test files the wider reach
   invalidates.
5. Pin the new geometry in `movement.test.ts`.
6. Pin attacks at the new range in `combat.test.ts`.
7. Rewrite the three refusal announcements.
8. Re-measure `seededReplay.test.ts`'s recorded figures and sweep the stale
   two-square prose.
9. `README.md` and the guide copy.
10. The owner plays with the longer reach and reads the guide. **Manual.**

---

### Step 1 — `rules.md` 0.32 → 0.33: three shapes join §6

Status: pending

Update `doc/ruleset/rules.md` so §6's table has **seven** rows, bump the
document to **0.33**, bump `RULES_VERSION` in `src/rules/rulesVersion.ts` to
match, and add **one** `doc/ruleset/changelog.md` entry for 0.33, newest
first, in the shape the 0.32 entry uses. This step is **its own commit, ahead
of all code changes** — the document is what every later step implements.

**§6, "Movement":**

- **The opening sentence** no longer says a ship moves one or two squares. It
  moves **one, two or three** squares, in the shapes the table gives. Three,
  not four: the sentence counts **where the ship ends up**, which is what a
  player measures on the board, and the long knight lands three files from its
  origin even though its walk is four steps (owner's decision, recorded in
  `story.md`). Keep the sentence a statement of distance and shape and leave
  the prices to the table, exactly as it reads today.
- **The table** gains three rows, all costing **3**: three squares
  orthogonally; two squares diagonally; and the **long knight** — three
  squares orthogonally and one square to either side. Introduce the name
  "long knight" here, once, in the table row and/or the sentence beneath, and
  use it unqualified afterwards.
- **The power walkthrough paragraph** is rewritten: a ship with 0 power
  reaches the four free orthogonal steps; 1 power the eight single steps; 2
  power the twenty; and **3 power or more all thirty-six**. Keep the existing
  closing observation that the free orthogonal step means a ship can always
  move, however empty its tank.
- **The path paragraph** gains the new shapes' passed-over squares. Three
  squares orthogonally passes over the **two** squares between origin and
  destination; two squares diagonally passes over the **one** between; the
  **long knight passes over five**, and an enemy on any one of them blocks it,
  in the same spirit as the L being blocked from either corner. Work the
  example the way the L's corners are worked today: the long knight from **H8
  to K9** passes over **I8, J8, K8, I9 and J9**, and say plainly that **H9 is
  not one of them** — the shape is three forward with a one-square offset, so
  every way of walking it begins by going forward (D5). Prose only; `rules.md`
  uses a diagram only for the board itself, and the L's explanation sets the
  style to follow.

**§7, "Combat":** the two worked extremes are restated against the new table —
a ship at 0 power still strikes only one square orthogonally, while a ship
with **3 power or more strikes anywhere in the thirty-six** (and keep a clear
statement of the middle: 2 power still strikes anywhere in the twenty). The
"the L included" aside widens to name the new shapes too. Nothing else in §7
changes: an attack still costs what the shape costs, still needs a path clear
of enemy ships, and still has no range rule of its own (S3).

**The sections to check, and leave alone if they are still true:**

- **§2** — the _Power_ entry ("what a ship carries and spends to move: how far
  it can go") and the _Turn_ entry name no distance; §2 has no _Move_ entry at
  all. Expected to need nothing; confirm and say so in `Notes:`.
- **§4.1** — names §6's table rather than numbers, and its "a ship at 0 power
  is not destroyed and is not stuck" reasoning still holds. Expected to need
  nothing.
- **§5** — "an attack reaches only as far as the attacker's power allows" is
  still true.
- **§8.5** and **§3.1/§3.2** — check for any wording that assumes a two-square
  reach; none is expected.

**Changelog.** One `## 0.33` entry: three shapes join §6's table at 3 power —
three squares orthogonally, two squares diagonally, and the long knight — so
reach goes from twenty squares to thirty-six and attack range follows §6 as it
always has; the long knight is blocked by an enemy on any of the five squares
it passes over. State plainly that **this is a gameplay change** (moves that
were illegal are now legal) and therefore a tag candidate, and that **tagging
stays on hold** (`CLAUDE.md`). State that nothing else is retuned (S5).

Depends on: nothing. It is first because it is the document the rest of the
story implements (S4).

Verification (automated): `npm test` — `src/rules/rulesVersion.test.ts`
asserts `RULES_VERSION` equals the version in `rules.md` and that
`changelog.md` carries an entry for it, so a half-done bump fails here; the
other 1183 tests must still pass, since no behaviour has changed yet. Then
`npm run typecheck`, `npm run lint`, and `npm run format:check` (only the
three pre-existing warnings from the baseline). Finally grep `rules.md` for
"one or two squares" and for "the twenty": the only surviving mentions of
twenty must be the ones that correctly describe what **2 power** reaches, and
§6's table must have seven move rows.

---

### Step 2 — Generalise the L's corner pair into a list of passed-over offsets

Status: pending

In `src/rules/movement.ts` only, replace the L offset record's fixed
`orthogonalCorner` / `diagonalCorner` pair with a **list of passed-over
offsets**, on a single leap-shaped reach option (D3). **No new shapes, no new
rows in `REACH_OPTIONS`, no behaviour change at all**: this is the scaffolding
Step 4 needs, kept separate from it deliberately.

- The L's table keeps its eight rows and each row keeps both of its corners,
  **orthogonal corner first**, so the `passedOver` order every existing test
  asserts is unchanged.
- `allShapesFrom`'s branch for this option kind builds `passedOver` by mapping
  the offsets in order, instead of naming two corners.
- The invariant guard stays and its message generalises: a passed-over square
  that leaves the board while its destination did not is still a `RangeError`
  (D3).
- Comments: the record's doc comment stops describing exactly two corners and
  describes a shape's passed-over squares as offsets from the origin, keeping
  the worked L example (H8 to J9 turning through I8 and I9) because it is what
  makes the table readable against §6. `ReachEntry`'s comment keeps its
  sentence about the L's two corners — it is still true.

Do **not** rename anything outside `movement.ts`; nothing outside it sees
these types.

Depends on: Step 1 (the rules document is what the geometry implements;
nothing in this step's code depends on 0.33's new rows yet).

Verification (automated): `npm test` must report **64 files and 1184 tests,
all green — the same counts as the baseline**, because nothing observable
changed. In particular `src/rules/movement.test.ts`'s "puts both corners in
passedOver, orthogonal corner first, exactly as §6 names them" and
`src/rules/combat.test.ts`'s equivalent must pass **untouched**; if either
needs editing, the refactor changed behaviour and the step is wrong. Then
`npm run typecheck` and `npm run lint`.

---

### Step 3 — The movement diagram derives its own grid extent

Status: pending

In `src/guide/guideDiagrams.tsx`, stop hard-coding the movement diagram's
5 x 5 grid. Derive its extent from `movementCostOffsets()`: the largest
absolute column-or-row offset among them, mirrored either side of the ship,
gives the run of offsets the grid iterates over (D11). Everything else about
`MovementDiagram` stays — the ship at full power in the centre with no number,
a number cell for every reachable offset, an empty cell for every unreachable
one, and `GuideDiagram`'s `columns` prop set to the run's length.

Today the largest offset is 2, so the diagram is still 5 x 5 with twenty
numbers and four blank corners, and **nothing about the rendered output
changes**. After Step 4 it becomes 7 x 7 with no further edit here.

Update the component's doc comment to say the grid's size follows §6's reach
rather than naming 5 x 5.

Depends on: Step 2 (only for ordering; this step is independent of the
geometry work and is placed here so the behaviour change in Step 4 lands
against a grid that already tracks the rules).

Verification (automated): `npm test` — `src/guide/guideDiagrams.test.tsx`'s
movement diagram test must pass **unchanged**, still finding twenty-one board
squares, twenty numbers (four 0s, four 1s, twelve 2s), twenty-five cells and
four blanks. If that test needs editing, this step has changed behaviour it
was not supposed to change. Then `npm run typecheck` and `npm run lint`.

---

### Step 4 — Add the three shapes, and repair the tests the wider reach invalidates

Status: pending

This is the behavioural heart of the story. In `src/rules/movement.ts`:

- Widen the straight option's `distance` to the literal union `1 | 2 | 3`
  (D4).
- Add the two straight rows to `REACH_OPTIONS`: **three squares orthogonally
  at cost 3** and **two squares diagonally at cost 3**. The existing
  straight-walk loop already collects the intermediate squares into
  `passedOver` and clips at the board edge, so no new logic is needed for
  either.
- Add a **long knight** table of eight offsets with five passed-over offsets
  each, transcribed from D6's table, and a third new `REACH_OPTIONS` row using
  it at cost 3. Give the table a doc comment in the same voice as the L's:
  what the shape is, that it is written as data so it can be read against §6
  at a glance, that `movement.test.ts` pins the sign rule, the H8-to-K9 worked
  example naming I8, J8, K8, I9, J9, and the reason **H9 is not among them**
  (D5).
- Update the module's stale prose: the file header's "a ship moves one or two
  squares, orthogonally, diagonally or in an L", `allShapesFrom`'s "every one
  of §6's twenty shapes", and `shapeReaching`'s "not one of the twenty shapes
  at all". All become the thirty-six, naming the new shapes where the old
  sentence named the old ones.
- Update `src/guide/movementCosts.ts`'s doc comment, which describes the
  twenty offsets and says the four (±2, ±2) corners are not reachable — they
  now cost 3. The **code** in that module needs no change.

Then repair, at the assumption rather than by papering over, exactly the tests
the change invalidates (D8 lists them, measured on a prototype):

- `src/rules/movement.test.ts` — the §6 table test gains the sixteen new
  destinations from H8 (K8, E8, H11, H5; J10, J6, F10, F6; K9, K7, E9, E7,
  I11, G11, I5, G5) and asserts 4 / 8 / 20 / 36 at powers 0 / 1 / 2 / 3 and
  up. "Never reaches two squares diagonally or three squares orthogonally"
  now states the opposite of the rules: replace it with the honest version —
  no shape reaches the **twelve** offsets (±2, ±3), (±3, ±2) and (±3, ±3) at
  any power level.
- `src/rules/combat.test.ts` — "refuses target-out-of-range for a target
  beyond the reach" uses H8 → H11, which is now three squares orthogonally;
  move the target to a square **no** shape reaches (for example J11, offset
  (2, 3), or H12) so the test still tests what its title says. The
  reach-matching test's per-power count expectation becomes 4 / 8 / 20 / 36.
- `src/guide/movementCosts.test.ts` — thirty-six offsets, not twenty; the
  four (±2, ±2) corners now cost 3 rather than being absent; add the sixteen
  new offsets' costs and assert the **twelve** genuinely unreachable offsets
  are absent alongside the centre. The "does not change with the origin
  chosen" test should keep passing untouched.
- `src/guide/guideDiagrams.test.tsx` — the diagram is now 7 x 7 (Step 3 makes
  this automatic): **forty-nine** cells, **thirty-seven** board squares (one
  centre ship plus thirty-six numbers), **twelve** blank cells, and numbers
  totalling thirty-six — four 0s, four 1s, twelve 2s and **sixteen 3s**.
  Update the test's inline comment arithmetic to match.

Deeper coverage of the new shapes is Step 5's and Step 6's job; this step does
the minimum that leaves the suite honest and green.

Depends on: Step 1 (the rules this implements), Step 2 (the passed-over list
the long knight needs) and Step 3 (the diagram grid that grows on its own).

Verification (automated): `npm test` — the whole suite green, with the five
files above updated and **no others needing changes**. If any other file
fails, stop and record in `Notes:` which one and why, because that is a shape
assumption that leaked out of `movement.ts` (D1). Confirm the headline numbers
directly from the updated tests' output: from H8 on an empty board a ship at 6
power has **thirty-six** legal destinations, at 2 power twenty, at 1 eight, at
0 four. Then `npm run typecheck` and `npm run lint`.

---

### Step 5 — Pin the new geometry in `movement.test.ts`

Status: pending

Extend `src/rules/movement.test.ts` so the new shapes are pinned as tightly as
the L is. All of these are additions; keep the existing describe blocks'
voice and structure, and put the long knight's cases in a describe of their
own, next to the L's.

- **The sign rule (D2, D6).** Pin that the long knight's eight offsets are
  exactly (±3, ±1) and (±1, ±3), and that each one's five passed-over offsets
  follow the rule in D6 — three steps along the long axis, then the first two
  of those shifted one square along the short axis. This is the test that
  makes writing the table by hand safe.
- **Passed-over squares per shape.** From H8: the three-orthogonal move to K8
  passes over I8 and J8; the two-square diagonal to J10 passes over I9; the
  long knight to K9 passes over exactly I8, J8, K8, I9, J9, **in that order**
  (D3), and **not** H9.
- **Blocking.** With an enemy ship on any **one** of I8, J8, K8, I9 or J9,
  `moveRefusalReason` refuses H8 → K9 with `path-blocked` — five cases, each
  independent. With an enemy on **H9** the same move is legal. With a
  **friendly** ship on any of the five it is legal too (a ship flies over its
  own side). Do the same for at least one of the two new straight shapes: an
  enemy on I8 or J8 blocks H8 → K8, a friendly one does not.
- **Affordability (S6).** At 2 power, K8, J10 and K9 are each refused with
  **`cannot-afford`, not `out-of-range`**; at 3 power each is legal. At 3
  power the ship still reaches everything a 2-power ship reached.
- **Counts and distinctness.** Thirty-six destinations from a central square
  at 3 power and above, and the thirty-six destinations are **pairwise
  distinct**, so no square is reachable by two shapes at two prices (D7).
- **Edge clipping.** The existing clipping test loops over every power level
  and should already cover the new shapes; confirm it does, and if the
  invariant guard in `allShapesFrom` can be provoked from a corner or edge
  square, that is a bug in the long knight's table, not a test to weaken.

Depends on: Step 4 (the shapes must exist).

Verification (automated): `npm test` — the whole suite green with a higher
test count than Step 4 left it at, and every new case above present and
passing. Then `npm run typecheck` and `npm run lint`.

---

### Step 6 — Pin attacks at the new range in `combat.test.ts`

Status: pending

`combat.ts` is expected to need **no change**: attack range is §6's range and
it reads `movement.ts`'s lookups (D1, S3). This step proves that with tests
rather than assuming it.

Add to `src/rules/combat.test.ts`:

- A green ship at **3 power** attacking an enemy at **long-knight range** (for
  example H8 striking K9) is legal, and the attack applied through
  `applyAttack` leaves the attacker on a planet at **0 power**, the defender
  carrying the power it had, both squares empty (§7, §7.1).
- The **same attack at 2 power** is refused with `cannot-afford-target` — not
  `target-out-of-range` (S6).
- The same attack is refused with `attack-path-blocked` when a **third, enemy**
  ship stands on one of the long knight's five passed-over squares; pick one
  of the five that is not on the straight line between the two, **K8**, since
  that is the case most likely to be got wrong (D5). A **friendly** ship on
  the same square does not block it.
- An attack at **three squares orthogonally** at 3 power is legal, and at 2
  power is refused with `cannot-afford-target`.

If `combat.ts` turns out to need a change to make any of these pass, make the
change and record in `Notes:` that a shape assumption had leaked into §7's
implementation (D1) — that is a finding the peer review should see.

Depends on: Step 4 (the shapes) and Step 5 (movement-side blocking is pinned
first, so a failure here is about combat, not geometry).

Verification (automated): `npm test` — whole suite green, with the new combat
cases passing. Then `npm run typecheck` and `npm run lint`.

---

### Step 7 — Rewrite the three refusal announcements

Status: pending

Three sentences in `src/board/announcements.ts` recite §6's old table and are
now wrong: the `cannot-afford` move refusal, the `target-out-of-range` attack
refusal, and the `cannot-afford-target` attack refusal. Rewrite all three
against the seven-row table, using D12's wording (which Step 7 may tighten,
recording any change in `Notes:`), and update the three matching assertions in
`src/board/announcements.test.ts`.

Constraints on the wording:

- One sentence each, short enough to be worth hearing read aloud.
- Name the price of every shape the sentence mentions. Use §6's words for the
  shapes it shares with the rules, but **do not say "long knight"** — describe
  that shape as "three and one across" instead (D12, owner's decision). The
  name belongs to `rules.md`; the spoken UI describes the shape.
- Player-facing voice, non-technical (`CLAUDE.md`, "Intended audience").
- Do not start teaching blocking or paths here; these sentences are about
  price and reach.

Per `CLAUDE.md`, live-region wording is covered by the automated suite and is
not something the owner checks by hand, so no manual verification is attached
to this step.

Depends on: Steps 1 and 4 (the table these sentences describe must be both
written and implemented before they are reworded).

Verification (automated): `npm test` — `src/board/announcements.test.ts` green
against the new wording, and the whole suite green. Then `npm run typecheck`,
`npm run lint`, and a grep of `src/` for "two squares or an L cost 2" and "two
squares orthogonally, or an L" returning nothing.

---

### Step 8 — Re-measure the seeded replay's figures, and sweep the stale two-square prose

Status: pending

Two jobs, both about statements that are now false even though no test fails
(D9, D10).

**`src/rules/seededReplay.test.ts`.** The test itself is expected to pass
untouched — it scripts no squares, replaying the same seed twice and comparing
run against run — but its comments record measured figures for the seed
(`20260819`, forty rounds) that the wider reach changes. Re-measure against
the real implementation: temporarily log the fight count, planet returns,
charges, retirements and refills from the "not vacuous" test, run that file
alone, then remove the logging and write the measured numbers into the
comment, saying they were re-measured at the wider reach of 0.33 and that the
earlier figures were measured before it. Record the measured numbers in the
step's `Notes:` as well, so the change is visible in the plan and not just in
a diff. For reference, the planning prototype produced **5 fights, 10 planet
returns, 21 charges, 20 retirements and 20 refills** — treat that as a sanity
check on your own measurement, not as a value to copy. Leave the floors (1
fight, 2 returns, 4 charges, 4 retirements, 4 refills) exactly where they are;
if a measurement comes in below one of them, **stop and escalate to the
owner** rather than lowering it. The different-seed divergence test is
expected to keep passing; if the two seeds happen to coincide under the new
reach, pick another pair and say so in `Notes:`.

**The prose sweep.** Fix, at the assumption:

- `src/rules/recovery.test.ts` — the comment claiming a 2-power ship is
  "already the full twenty-square range, since the dearest shape costs 2" and
  that a further refill "would buy it a deeper budget to spend, not a longer
  reach". Both halves are now false. Rewrite the comment and extend the check:
  a 2-power ship reaches **twenty** of the thirty-six, and a 3-power ship
  reaches **all thirty-six** — the story's point that a third unit of fuel buys
  reach, not just repeats.
- Grep `src/` and `doc/` (excluding `doc/plan/` and `doc/ruleset/changelog.md`,
  which are history and are never rewritten) for "twenty", "two squares", "one
  or two squares" and "the dearest shape", and fix any remaining statement
  that the reach is twenty or that nothing costs more than 2. Statements that
  correctly describe what **2 power** reaches stay.

Depends on: Steps 4 to 7 (the geometry and all wording are final, so a figure
measured here stays true for the rest of the story).

Verification (automated): `npm test` — whole suite green, `seededReplay.test.ts`
included, with the temporary logging removed. Then `npm run typecheck`,
`npm run lint`, and the grep sweep above returning only correct statements.

---

### Step 9 — `README.md` and the guide copy

Status: pending

`README.md`'s movement sentence names the four old shapes and their prices
("two squares in a line, or a new L-shaped move that turns a corner, cost 2").
Add the three new shapes at 3 and say what the reach now is, in the README's
player-facing voice. Then run `/update-readme`, which reviews the branch diff
and updates anything else the README describes that this story changed — the
attack paragraph in particular, since attack range follows movement range and
a ship can now be struck from three squares away.

Also check `src/guide/guideCopy.ts`'s MOVEMENT paragraph: the story expects it
to need **no** change ("For longer moves, fuel is required, as follows:" still
reads true, and the diagram beneath carries the costs). Confirm that and say
so in `Notes:` rather than silently leaving it.

Depends on: Steps 1 to 8 (the README describes the finished behaviour).

Verification (automated): `npm test` and `npm run lint` green;
`npm run format:check` reporting only the three pre-existing warnings from the
baseline; and a read of `README.md` confirming it names all seven shapes with
their prices, states the reach as thirty-six, and no longer implies two
squares is the longest move.

---

### Step 10 — The owner plays with the longer reach

Status: pending

The story's manual checks, gathered in one place. Nothing to implement; the
owner runs the app (`npm run dev`) and looks.

Depends on: every previous step.

Verification (manual):

- **The Quick Guide's movement diagram.** Open the guide. The movement
  diagram is **7 x 7**, with the ship at the centre, sixteen squares reading
  **3**, twelve squares blank (the four corners and the eight squares beside
  them), and the old twenty numbers unchanged. The page is taller and scrolls;
  the diagram still fits the window without a horizontal scrollbar, including
  at a narrow window width.
- **The board.** Select a ship with 3 or more power and confirm the
  highlighted destinations include the long moves — three squares in a line,
  two diagonally, and the long knight — and that a ship at 2 power shows only
  the old twenty. Stand an enemy ship in the way of a long knight and confirm
  the destination drops out of the highlighting.
- **A full game.** Play a game through with the wider reach and confirm
  nothing feels broken: turns resolve, ships that spend 3 land empty, and the
  game ends normally.
- **The two judgement calls the story asks for** (these are the owner's read
  on the game, not pass/fail conditions): does a node that goes charged
  mid-board now get contested by both sides rather than conceded, and does the
  longer attack reach make parking beside a node too dangerous to be worth it?
  Whatever the answer, it is evidence for a later tuning story, not work for
  this one (S5).
