# Implementation Plan — Story 00000067, Three- and four-ship fleets

## What this story does

Today a player picks **five or six** ships on the start screen before a game
begins. This story adds **four** and **three**, so the Ships group offers
**6, 5, 4, 3** — four choices, the same shape the Rounds and Clock groups
already have. **Six stays the default and stays the standard game**, and the
five- and six-a-side layouts are untouched.

Each new size gets a starting layout, and the four-a-side layout uses four
squares no layout has used before — **C1, C15, M1 and M15** — which takes the
ruleset's fixed starting squares from **fourteen to eighteen**.

Nothing else about how the game is played changes. No node rule, no combat
rule, no movement rule, no energy rule. A small fleet runs the same rules with
less to spend.

`story.md` in this folder is the owner's full statement of the change,
including why the smaller games are interesting and how the two layouts were
derived. This plan does not repeat that reasoning: it says how to get there,
in what order, and records the decisions this plan makes, because code in this
repository deliberately carries no design history (`CONTRIBUTING.md`,
"Comments").

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say. Do not mix them (`CLAUDE.md`, Vocabulary).
- **Move** means the movement action specifically — one ship changing squares.
  It is never a synonym for a ply or a turn.
- **Fleet size** is the number of ships **one side** has, so a four-a-side game
  has eight ships on the board. Rules text and the changelog always say which,
  the way §4's existing headings do ("Six a side (12 ships)").
- **Starting square** is a fixed square a ship may begin on. It is an ordinary
  square in every other way.

## Settled decisions — do not reopen

These come from `story.md` and from the project's standing instructions. A step
that finds one inconvenient should escalate, not re-decide.

- **S1.** The fleet sizes become **6, 5, 4, 3**, in that order on the start
  screen (largest first). **Six is the default and the standard game.**
- **S2.** Three a side — **green H15, O6, A6; red O10, H1, A10.**
- **S3.** Four a side — **green C15, M15, O6, A6; red O10, M1, C1, A10.**
- **S4.** The five- and six-a-side layouts do not change: same squares, same
  colours, same order, same ship ids.
- **S5.** The ruleset's fixed starting squares go from fourteen to **eighteen**,
  the four new ones being **C1, C15, M1, M15**.
- **S6.** The most ships a side can ever have stays **six**, so nothing sized
  against that bound changes.
- **S7.** This is a gameplay change: `rules.md` gets a version bump, a single
  `changelog.md` entry, and it lands in its **own commit ahead of the code**
  (`CLAUDE.md`). A later rules edit on this branch folds into that same entry —
  there is never a second version bump on one branch. **Tagging stays on hold**:
  bump and write the entry, do not run `/tag-rules`.
- **S8.** Fold in the documentation correction to §3.1's board diagram, which
  is missing the planet at **I12**. The code (`src/rules/planets.ts`) is right
  and the diagram is a transcription slip; it needs no bump of its own beyond
  the one this story already makes.
- **S9.** Per `CLAUDE.md`: **no plan steps for testing accessibility**, and no
  review fixtures or manual test scripts. Where an existing automated test has
  a straightforward path to being updated, update it; where it does not, this
  story does not owe it one. Anything knowingly lost goes as a note in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.
- **S10.** No new rule is written for the two effects the smaller fleets make
  common — the relief that frees a side whose every ship is trapped (§8.6 step
  7), and the double refuelling rate for a player's only charging ship (§3.1).
  Both already work as written; they simply bite more often.

## Design decisions made while planning

Everything below is a decision this plan makes, with the alternatives rejected.
A step that needs to know "why is it done this way" should find the answer here.

### D1 — `FleetSize` stays a literal union, widened to `3 | 4 | 5 | 6`

`src/rules/fleet.ts` exports `FleetSize`, `FLEET_SIZES`, `DEFAULT_FLEET_SIZE`
and the type guard `isFleetSize`. The union widens and `FLEET_SIZES` becomes
`[6, 5, 4, 3]`; nothing about the shape changes. Every consumer
(`useAppScreen.ts`, `StartScreen.tsx`, `session.ts`, `gameState.ts`) already
speaks in terms of these exports and needs no change of its own.

Rejected — **dropping the union for a plain `number` validated at the door**.
It would lose the compile-time guarantee that a `FleetSize` indexes
`LAYOUTS_BY_FLEET_SIZE`, which is what makes "add a size" a change the compiler
walks you through.

Rejected — **deriving `FleetSize` from the keys of `LAYOUTS_BY_FLEET_SIZE`**.
Cleaner on paper, but it inverts the file's current reading order (the sizes
are stated first, the layouts second) for no gain in a file this small.

### D2 — Layout order is clockwise from H15, and that order fixes the ship ids

`startingFleet` numbers ids `green-1…green-N` / `red-1…red-N` in the order the
layout list is written, and the existing lists are written **clockwise round
the perimeter, beginning at the first occupied starting square at or after
H15** (going right along the top edge, down the right edge, right-to-left along
the bottom, up the left edge, then back along the top). Six a side begins at
L15 because H15 is empty; five a side begins at H15 because it is occupied.

The new layouts follow the same convention, which fixes both the list order and
the ids:

- **Three a side** (H15 is occupied, so the list begins there):
  H15 green, O10 red, O6 green, H1 red, A6 green, A10 red.
  Ids: green-1 H15, green-2 O6, green-3 A6; red-1 O10, red-2 H1, red-3 A10.
- **Four a side** (H15 is empty; the first occupied square clockwise from it is
  M15): M15 green, O10 red, O6 green, M1 red, C1 red, A6 green, A10 red,
  C15 green.
  Ids: green-1 M15, green-2 O6, green-3 A6, green-4 C15; red-1 O10, red-2 M1,
  red-3 C1, red-4 A10.

Rejected — **listing each layout edge by edge the way §4's tables do** (top
left-to-right, then right, then bottom, then left). It would break the
convention the two existing lists follow and would give ids that jump about the
board. The rules document's tables are for a human reading a board; the code's
list is a ring walk.

### D3 — The validation message is built from `FLEET_SIZES`, not hand-written

`startingGameState` in `src/rules/gameState.ts` throws
`RangeError("startingGameState: fleetSize must be 5 or 6, got …")`. That
sentence is now wrong, and it is wrong in exactly the way that will happen again
the next time a size is added or removed. Build the list of valid sizes into
the message from `FLEET_SIZES` so it cannot drift. This is a developer-facing
error, not player-facing text, so its wording is free — "must be one of 6, 5, 4,
3" is fine.

Rejected — **hand-writing "must be 3, 4, 5 or 6"**. Correct today and stale the
next time the list moves; the file already imports `FLEET_SIZES`' neighbours
from `fleet.ts`, so deriving costs nothing.

### D4 — No CSS work for the fourth Ships choice

`StartScreen.tsx` renders the Ships group by mapping `FLEET_SIZES`, so a fourth
radio appears with no component change. `.start-screen__choices` is a wrapping,
centred flex row shared by all three groups, and the Rounds (30/45/60/90) and
Clock (Unlimited/6s/4s/2s) groups already carry four choices through it today,
so four ship choices need no new rule. The manual step confirms it on screen,
including at a narrow window; if it turns out to need a tweak, that is a CSS
change inside `src/start/StartScreen.css` and nothing else.

### D5 — `MAX_SHIPS_PER_SIDE` keeps its value and its definition

It is `Math.max(...FLEET_SIZES)`, so it stays 6 as the list grows downward, and
that is the intent: it is the bound that must hold across every fleet size, not
the current game's size. Do not change it and do not add a minimum counterpart —
nothing in the codebase is sized against the smallest fleet.

One tidy is in scope while the file is open: the constant's doc comment points
at `energy.ts` as its consumer, and `energy.ts` no longer references it (the
only reader today is its own test). Reword the comment so it explains the bound
without naming a module that does not use it. Do not chase the constant further
than that.

### D6 — The fleet tests keep transcribing the layouts by hand

`src/rules/fleet.test.ts` deliberately holds its own copy of §4's layouts, the
list of all starting squares, and the per-size list of starting squares that
stay empty, so the test is an independent transcription of the rules document
rather than a restatement of the code. Extend all three to the new sizes rather
than deriving any of them.

The per-size empty lists get long (ten squares at four a side, twelve at three
a side), and it is tempting to compute them as "the eighteen minus the ones this
layout occupies". Rejected: derived that way, the assertion becomes true by
construction and stops catching a layout that puts a ship on the wrong square.
The verbosity is the price of the check.

### D7 — Two rules sentences the story makes untrue are corrected in the same edit

Neither is called out in `story.md`, but both are statements the document makes
about fleet sizes, and both become false at three and four a side. They are
consistency repairs to sentences the story's own change invalidates, not new
rules:

- **§5** says a player always has "at least five ships" while explaining why a
  turn passing is uncommon. It becomes "at least three ships"; the rest of the
  sentence, including the "should be uncommon" framing, stands.
- **§7.1** justifies "there is always somewhere to go" for a beaten ship with
  "with twelve ships and twelve planets … at most ten planets are occupied".
  The argument holds a fortiori with fewer ships but is stated as though twelve
  is the count; make the count a ceiling ("with at most twelve ships and twelve
  planets"). Do not restructure the argument.

Left alone deliberately: Appendix B's "a dozen ships on it", which describes the
setup of the stand-in run the sizing figures were measured from, not a claim
about every game.

### D8 — Step order: document, then rules layer, then plumbing, then screen

The rules document is what the code implements, so it goes first and alone
(S7). `fleet.ts` is a leaf module — it imports only `board.ts` and `power.ts` —
so the layouts can land and be tested before anything downstream knows the new
sizes exist. `gameState.ts`'s guard and the end-to-end games come next, and the
start screen last, because it needs nothing but a longer `FLEET_SIZES` and is
where the owner's eye is the right verification.

## Steps

### Step 1 — Rules 0.27 → 0.28: fleets of three to six

Status: committed

Notes: Edited `doc/ruleset/rules.md` (overview, §3.1 count/diagram/caption,
§4 fleet sentence and two new layout tables, §5 and §7.1 per D7), bumped the
version to 0.28, added the `changelog.md` entry, and set `RULES_VERSION` in
`src/rules/rulesVersion.ts` to "0.28". Ran `npx prettier --write` on
`rules.md` after inserting the new layout tables so their column widths
match the existing tables' style; no wording changed as a result. Verified
by script that the §3.1 diagram now contains exactly twelve `P` marks
matching the planets table and eighteen `S` marks matching the fourteen
existing plus C1/C15/M1/M15, and that both new layouts' green squares are
the half-turn rotation of their red squares. No deviation from the plan.

Edit `doc/ruleset/rules.md`. There is no code in this step.

1. **Section 1**, the overview: "a fleet of five or six ships" becomes a fleet
   of three to six ships. Keep the sentence's shape and its non-technical
   voice.
2. **Section 3.1**, the fixed-squares paragraph and diagram:
   - the count of starting squares goes from **fourteen** to **eighteen**, in
     both places the paragraph says it ("the fourteen starting squares" and
     "which of the fourteen are used");
   - the diagram gains four `S` marks — **C15 and M15 on row 15, C1 and M1 on
     row 1**;
   - the diagram gains the missing planet **`I12`** (S8): row 12 currently
     shows only `B12`, and the surrounding text, `src/rules/planets.ts` and the
     stated rotation of `G4` all say there is a planet at I12 as well. After
     the fix the diagram must show **twelve** `P` marks;
   - the caption line under the diagram keeps its wording (it names no count).
3. **Section 4**, the fleet paragraph and layout tables:
   - "Each player has **five or six** ships" becomes three, four, five or six,
     with "**six is the standard game**" untouched;
   - add two new layout blocks in the same format as the existing ones —
     heading, per-edge table, and the "Green: … Red: …" summary line. Put them
     **after** the existing six- and five-a-side blocks, so the four blocks read
     6, 5, 4, 3 and match the start screen's order;
   - **Four a side (8 ships)** — top: C15 green, M15 green; right: O10 red, O6
     green; bottom: C1 red, M1 red; left: A10 red, A6 green. Green: C15, M15,
     O6, A6. Red: O10, M1, C1, A10.
   - **Three a side (6 ships)** — top: H15 green; right: O10 red, O6 green;
     bottom: H1 red; left: A10 red, A6 green. Green: H15, O6, A6. Red: O10, H1,
     A10.
   - the sentence after the tables currently begins "Both layouts are exact
     half-turn rotations of one another"; it must now cover all four.
4. **Section 5** and **section 7.1**: the two consistency repairs described in
   D7 above.
5. Bump the version line at the top of `rules.md` from **0.27** to **0.28**.
6. Add one `doc/ruleset/changelog.md` entry at the top, newest first, in the
   house style of the existing entries: a `## 0.28 — <short title>` heading, the
   "This is a gameplay change. Tagging stays on hold…" note the recent entries
   carry, and bullets covering: the two new fleet sizes and their layouts; the
   four new starting squares and the count going to eighteen; six remaining the
   standard game and five and six being unchanged; the §5 and §7.1 wording
   repairs; and the §3.1 diagram's missing planet as a documentation
   correction, not a rules change.
7. Update `RULES_VERSION` in `src/rules/rulesVersion.ts` to `"0.28"`.

Do not touch any other source file in this step.

Depends on: nothing. It comes first because everything after it implements this
document (`CLAUDE.md`, "The rules live here").

Verification (automated): Run `npm test`. `src/rules/rulesVersion.test.ts`
asserts that `RULES_VERSION` equals the version in `rules.md` and that
`changelog.md` has an entry for it; both must pass. The rest of the suite must
still be green, since no behaviour changed. Then confirm by eye that §3.1's
diagram contains exactly twelve `P` marks and eighteen `S` marks, and that each
new layout's green ships are the half-turn rotation (column index `i → 14 − i`,
row `r → 16 − r`) of that layout's red ships.

### Step 2 — `fleet.ts`: the three- and four-a-side layouts

Status: committed

Notes: Widened `FleetSize` to `3 | 4 | 5 | 6`, `FLEET_SIZES` to `[6, 5, 4,
3]`, added `FOUR_A_SIDE_LAYOUT` and `THREE_A_SIDE_LAYOUT` in the clockwise
order D2 fixes, registered both in `LAYOUTS_BY_FLEET_SIZE`, updated the
file's header and `FleetSize`'s doc comment, and reworded
`MAX_SHIPS_PER_SIDE`'s comment per D5 (dropped the stale `energy.ts`
reference). Extended `fleet.test.ts` per D6: hand-transcribed both new
layouts and their own `LAYOUTS_BY_FLEET_SIZE`, grew `ALL_STARTING_SQUARES`
to eighteen, extended `EMPTY_STARTING_SQUARES_BY_FLEET_SIZE` to all four
sizes (five and six a side gained C1/C15/M1/M15 to their empty lists), and
added alternation tests: three a side alternates perfectly including the
wraparound, and four a side has exactly two same-side neighbour pairs, at
`M1`/`C1` (red, bottom) and the wraparound `C15`/`M15` (green, top). No
deviation from the plan. `npm test` shows one pre-existing failure in
`gameState.test.ts` ("throws a RangeError for a fleet size of 4"), which is
expected and explicitly Step 3's job to fix (4 is now a valid size).

Widen the fleet sizes and add the two layouts in `src/rules/fleet.ts`:

- `FleetSize` becomes `3 | 4 | 5 | 6`.
- `FLEET_SIZES` becomes `[6, 5, 4, 3]` — largest first, so the leftmost start
  screen choice stays the default game. Its doc comment already says this and
  needs no change beyond staying true.
- `DEFAULT_FLEET_SIZE` stays `6`.
- Add two layout constants alongside `SIX_A_SIDE_LAYOUT` and
  `FIVE_A_SIDE_LAYOUT`, written in the clockwise order fixed by D2 above:
  - four a side — M15 green, O10 red, O6 green, M1 red, C1 red, A6 green,
    A10 red, C15 green;
  - three a side — H15 green, O10 red, O6 green, H1 red, A6 green, A10 red.
- Register both in `LAYOUTS_BY_FLEET_SIZE`.
- Give each constant a doc comment in the style of the existing two: which
  rules section it comes from, how many of the eighteen starting squares it
  occupies, and where the clockwise list starts and why.
- Update the file's header comment and `FleetSize`'s doc comment, which both
  say "five or six".
- Apply D5's small comment tidy on `MAX_SHIPS_PER_SIDE`. Its value and
  definition do not change.

Then extend `src/rules/fleet.test.ts`, keeping its hand-transcribed style (D6):

- the `FLEET_SIZES` test expects `[6, 5, 4, 3]`; `MAX_SHIPS_PER_SIDE` still
  expects 6;
- add transcriptions of the two new layouts and register them in the test's own
  `LAYOUTS_BY_FLEET_SIZE`;
- extend `ALL_STARTING_SQUARES` to the eighteen, and rename or re-comment it so
  it no longer says "fourteen";
- extend `EMPTY_STARTING_SQUARES_BY_FLEET_SIZE` to all four sizes. The six- and
  five-a-side entries **grow**, because C1, C15, M1 and M15 are starting squares
  they leave empty;
- the existing `describe.each(FLEET_SIZES)` block then covers the new sizes for
  free: layout order, ship count per side, ids numbered 1..N per side, full
  power, and the half-turn rotation check;
- extend the alternation block: three a side alternates **perfectly** around
  the ring including the wraparound, exactly as five a side does; four a side
  has exactly **two** breaks, and they are the two same-colour neighbours on
  the top edge (C15 and M15, both green) and on the bottom edge (M1 and C1,
  both red). Assert the count and the location, not just the count.

Depends on: Step 1 (the layouts and the eighteen starting squares are what
`rules.md` now states; this step transcribes them).

Verification (automated): Run `npm test`. `src/rules/fleet.test.ts` must pass
with the new sizes included in every `describe.each` case — in particular the
half-turn rotation test and the per-size starting-square test — and the new
alternation assertions must pass. Also run `npm run typecheck`.

### Step 3 — The rest of the rules layer accepts three and four a side

Status: committed

Notes: Rebuilt `startingGameState`'s `RangeError` message from `FLEET_SIZES`
per D3 (`src/rules/gameState.ts`). In `gameState.test.ts`, changed the
full-power test to iterate `FLEET_SIZES` instead of `[6, 5]`, changed the
same-seed test to compare `Math.min(...FLEET_SIZES)` against
`Math.max(...FLEET_SIZES)`, and replaced the invalid-size table
`[4, 7, 8, 6.5]` with `[2, 7, 8, 6.5]` since 4 is now valid. Added
three-a-side and four-a-side cases to `fullGame.test.ts`'s "smaller fleets
play end to end" block, same seed (20260819) and round count (30) as the
neighbouring five- and six-a-side cases, asserting ship count (6 and 8),
final ply, and that each side's energy equals what it collected. Confirmed
`src/game/session.test.ts` still passes with no edit.

Deviation: the plan states `session.test.ts`'s fleet-size case "already runs
… over `FLEET_SIZES`", but it is actually `it.each<FleetSize>([6, 5])` — a
hardcoded pair, not the exported list. Per the plan's explicit instruction
for this file ("confirm it passes rather than changing it"), it was left
alone; it still passes, but it does not exercise fleet sizes 3 or 4 at the
session layer. Flagging this in case a later step (4, which touches the
start screen and its session wiring) wants that coverage.

Nothing downstream of `fleet.ts` hardcodes the sizes except one error message
and a handful of tests. Bring them along:

- `src/rules/gameState.ts`: `startingGameState`'s `RangeError` message says
  "fleetSize must be 5 or 6". Rebuild it from `FLEET_SIZES` per D3.
- `src/rules/gameState.test.ts`:
  - the "starts every ship at full power whatever the fleet size" test iterates
    a hardcoded `[6, 5]`; iterate `FLEET_SIZES` instead;
  - the "deals the same board for the same seed whatever the fleet size" test
    compares five against six; make it compare the smallest against the largest
    so it exercises the widest gap;
  - the invalid-size table is `it.each([4, 7, 8, 6.5])` and **4 is now valid**.
    Replace it with sizes that are still invalid, including the new boundary
    below the minimum — 2, 7, 8 and 6.5.
- `src/rules/fullGame.test.ts`: its "smaller fleets play end to end" block plays
  a five- and a six-a-side game through `playFullGame`. Add a three-a-side and a
  four-a-side game the same way, asserting the ship count (6 and 8), that the
  game reaches its end at the expected ply, and that each side's final energy
  equals what it was recorded collecting. Keep the same seed and round count the
  neighbouring cases use so runtime stays comparable.
- `src/game/session.test.ts` already runs its fleet-size case over
  `FLEET_SIZES`, so it picks up the new sizes with no edit; confirm it passes
  rather than changing it.

Do not add a rule, a guard or a special case anywhere for small fleets. The
point of this step is that there is nothing to add — the existing rules run
unchanged with fewer ships, and these tests are the evidence.

Depends on: Step 2 (the layouts must exist before a game can be dealt with
them).

Verification (automated): Run `npm test`. The whole suite must be green,
including the two new full games in `fullGame.test.ts`, which play a three- and
a four-a-side game to its final ply without the pass guard deadlocking or the
policy choosing an illegal action. Run `npm run typecheck` and `npm run lint`.

### Step 4 — The start screen offers 6, 5, 4, 3

Status: committed

Notes: No component or CSS change was needed (D4 held). Added a
`StartScreen.test.tsx` case mirroring the "5" case for clicking "3", and two
`App.test.tsx` cases for choosing 3 (six ship cells) and 4 (eight ship
cells) then pressing PLAY. Confirmed no accessible-name collision: the
Rounds group's labels (30/45/60/90) and the Clock group's (Unlimited/6s/4s/2s)
share nothing with "3" or "4".

Correction of the plan's mistaken premise, directed by the orchestrator:
Step 3's own Notes flagged that `session.test.ts`'s fleet-size case was
`it.each<FleetSize>([6, 5])`, not already iterating `FLEET_SIZES` as this
step's plan text assumed. Per the orchestrator's direction, changed it to
`it.each<FleetSize>(FLEET_SIZES)` (adding the `FLEET_SIZES` import) so the
session layer now exercises all four sizes; the case's body and assertions
were left untouched.

`src/start/StartScreen.tsx` maps `FLEET_SIZES` to render the Ships group, so
the two extra radios appear with no component change and no CSS change (D4).
This step is about proving the whole path works, from the radio to a dealt
board:

- `src/start/StartScreen.test.tsx`: the group test already loops `FLEET_SIZES`
  and so covers all four values. Add a case that clicking the "3" radio calls
  the ships change handler exactly once with `3` and calls none of the other
  handlers, mirroring the existing "5" case.
- `src/App.test.tsx`: there is an existing "pressing PLAY after choosing 5 ships
  deals a five-a-side game" test that counts ship cells. Add the same for 3
  (six ship cells) and for 4 (eight ship cells).
- Check for accessible-name collisions while doing it: the Rounds group's labels
  are 30/45/60/90 and the Clock group's are Unlimited/6s/4s/2s, so the new "3"
  and "4" labels stay unique across the screen and `getByRole("radio", { name:
"3" })` remains unambiguous. If any query does become ambiguous, scope it to
  its group with `within`, as the group tests already do.
- If the component or its CSS turns out to need a change after all, make it here
  and record it in this step's Notes.

Depends on: Steps 2 and 3 (choosing 3 on the screen must deal a legal
three-a-side game, which is Step 3's guarantee).

Verification (automated): Run `npm test`. `StartScreen.test.tsx` must show four
Ships radios with six checked by default and the "3" click handled, and
`App.test.tsx` must show six ship cells after choosing 3 and pressing PLAY, and
eight after choosing 4.

### Step 5 — The owner plays the small games

Status: committed

No code. The owner runs the app (`npm run dev`) and checks the story's intent
landed. Nothing in this step is implemented by an agent; it is the pause point
where the owner either signs off or names what to change.

The owner confirms:

1. The start screen's **Ships** row reads **6 5 4 3**, with **6** selected when
   the app opens, and sits on one line looking like the Rounds and Clock rows
   below it.
2. Narrowing the browser window (or a phone-sized viewport) does not make the
   Ships row wrap or overflow more awkwardly than the Rounds and Clock rows do.
3. Choosing **3** and pressing PLAY deals **six** ships: green on **H15, O6,
   A6**, red on **O10, H1, A10**.
4. Choosing **4** and pressing PLAY deals **eight** ships: green on **C15, M15,
   O6, A6**, red on **O10, M1, C1, A10**.
5. Choosing **5** or **6** deals exactly what it dealt before this story.
6. A few turns of a three-a-side game play normally: selecting a ship,
   moving, attacking, the HUD's counts and the end-of-turn sequence all behave,
   and nothing on screen assumes a bigger fleet.

Depends on: Step 4 (the screen must offer the choices before they can be
played).

Verification (manual): The owner performs points 1–6 and confirms, or names
what to change. If something visual is knowingly given up here, record it as a
note in `doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather than
fixing it (`CLAUDE.md`, pre-release stance); no note is expected.

### Step 6 — `README.md`, the comment sweep, and the final check

Status: committed

Notes: Edited `README.md`'s three stale spots directly (did not run
`/update-readme`, since the changes were small and well scoped): the opening
paragraph now reads "a fleet of three, four, five or six ships", the status
block's ships choice reads "six, five, four or three, six to start", and the
same block's starting-squares count reads "eighteen" instead of "fourteen".
Rewrapped only the touched lines rather than the whole status paragraph, to
keep the diff minimal. Swept `src/` and `doc/` for "five or six", "5 or 6",
"fourteen" and "at least five": found and fixed two stale doc comments in
`src/rules/fleet.ts` (`SIX_A_SIDE_LAYOUT` and `FIVE_A_SIDE_LAYOUT` still said
"fourteen starting squares", now "eighteen") and one in
`src/ships/ShipDefs.tsx` ("up to fourteen ships are on the board at once",
stale since the seven-a-side removal in story 53, now "up to twelve", matching
`MAX_SHIPS_PER_SIDE * 2`). Left two other "fourteen" hits alone,
`src/rules/ply.test.ts` (two comments) and `src/rules/fullGame.test.ts` (one):
both are about the twelve planets or the already-removed seven-a-side size,
pre-existing staleness unrelated to this story's starting-square count, so
fixing them would be out of this step's scope. All four checks (`npm test` —
1047 passed, `npm run typecheck`, `npm run lint`, `npm run format:check`) are
green.

Bring the player-facing README and any stale in-code prose into line:

- `README.md`'s opening paragraph says "a fleet of five or six ships … with six
  the standard game";
- its status block describes the start screen's ships choice as "six or five,
  six to start";
- the same block says a smaller fleet "starts from fewer of the board's
  fourteen starting squares".

All three need updating, in the README's non-technical, player-facing voice
(`CLAUDE.md`, "Intended audience"). Running `/update-readme` is the intended
route: it reviews the branch diff and rewrites what the change has made stale.
Check its output against the three places above rather than trusting it blind.

Then sweep the source for prose left behind by the story: search for "five or
six", "5 or 6", "fourteen" and "at least five" across `src/` and `doc/` (other
than `doc/ruleset/changelog.md`, whose historical entries are a record and are
never rewritten, and other stories' plan folders, which are likewise history).
Fix any comment that now describes the code wrongly.

Depends on: Steps 1–5 (the README describes the finished behaviour, and the
sweep needs the code to be final).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all green. Then confirm the search terms above
return no stale hit outside `doc/ruleset/changelog.md` and other stories' plan
folders, and that `README.md` names the four ship choices with six as the
standard game and says eighteen starting squares.
