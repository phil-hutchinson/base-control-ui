# Implementation Plan — Story 00000056, Four charged nodes

## What this story does

The board currently aims to keep **five** of its fifteen nodes charged, and
section 8.4's energy table is priced to match: five nodes held pays 15, and a
side standing on five or more depleted nodes pays 15 back. This story takes
the target down to **four** — at the opening deal and at every end-of-turn
charge draw — and takes both ends of the table down with it, so **10 is the
most a turn can pay and 10 is the most a turn can cost**.

Nothing else about a node changes: same fifteen nodes on the board, same
capacity, same drain, recovery and pressure tables, same birth-wait-charge-
drain-deplete-retire life. Only the number lit at once, the table's top row,
and the two rows of score pips move.

`story.md` in this folder is the full statement of the change. This plan does
not repeat it; it says how to get there, in order, and records the design
reasoning, because code in this repository deliberately carries no design
history (`CONTRIBUTING.md`, "Comments").

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say. Do not mix them (`CLAUDE.md`, Vocabulary).
- **Node** is the word everywhere — code, tests, player-facing text. "Hub"
  and "site" are retired words; do not reintroduce them.
- A **node** runs `inactive → charged → depleted` and then retires, at which
  point a new inactive node appears somewhere else.

## Settled decisions — do not reopen

These were agreed with the owner before planning began. A step that finds one
inconvenient should escalate, not re-decide.

- **S1.** The node pool stays at **fifteen**. `NODE_COUNT` is not touched, and
  nothing retunes the inactive pool, `PRESSURE_CAP` (50), `NODE_CAPACITY`
  (60), or any of the weighted tables (the two opening tables, the two drain
  tables, the recovery table). More gameplay changes are coming in later
  stories; this one moves the charged target and the energy table only.
- **S2.** The score pips **keep their current size**. Only their count changes
  — five to four, in both rows. `--region-extent` is not re-derived, and
  nothing in the info column is re-scaled. `App.css`'s now-stale sizing
  comment is corrected **in prose only**.
- **S3.** No review fixtures and no manual test scripts. The owner drives the
  manual testing himself, so the manual step says what to look at in
  `npm run dev` and nothing is built to support it.
- **S4.** The rules edit is version **0.20 → 0.21**, with a `changelog.md`
  entry, in its **own commit ahead of the code** (`CLAUDE.md`). Tagging stays
  on hold — bump and write the changelog entry, do **not** run `/tag-rules`.
- **S5.** The energy curve is the existing one **truncated**, not reshaped:
  `0, 1, 3, 6, 10`. Whether four charged nodes should pay a different shape is
  a play-testing question for a later story.

## Design decisions made while planning

Everything below is a decision this plan makes, with the alternatives that
were rejected. A step that needs to know "why is it done this way" should find
the answer here.

### D1 — `MAX_DEPLETED_NODES_PRICED` stays derived from the table's length

`src/rules/energy.ts` defines `MAX_DEPLETED_NODES_PRICED` as
`ENERGY_BY_NODES_HELD.length - 1`. Deleting the table's last entry therefore
moves the collection ceiling and the penalty cap **together**, in one edit,
which is exactly the property §8.4 claims: "the most a turn can pay and the
most a turn can cost are the same number". That derivation must **stay
derived**. Do not replace it with a literal `4`, and do not add a second
constant beside it.

Rejected: writing the cap down as its own constant "so it can be read at a
glance". That is how the two ends of §8.4 would silently drift apart the next
time the table moves — which is the failure this derivation was written to
prevent.

### D2 — The charged pip row is sized from `TARGET_CHARGED_NODES`, the depleted row from `MAX_DEPLETED_NODES_PRICED`

`ScoreDisplay.tsx` currently carries a local `NODES_IN_PLAY = 5` for the
charged row while the depleted row already reads
`MAX_DEPLETED_NODES_PRICED`. The local literal is deleted and the charged row
reads `TARGET_CHARGED_NODES` from `src/rules/nodes.ts`. It is the only place
in the codebase that restates the target instead of deriving it, and removing
it means the next retune of the target is one edit rather than two.

The two rows keep **two different sources** even though both now come out at 4. They are genuinely different numbers that happen to coincide: the charged
row is bounded by how many nodes the board ever lights at once (§8.1, §8.2),
the depleted row by how many depleted nodes the table ever prices (§8.4). A
future story that moves one without the other would find a single shared
constant actively wrong.

Rejected: one shared constant for both rows (conflates two independent rules);
keeping `NODES_IN_PLAY` and changing its value to 4 (leaves the duplicate the
story exists to remove).

### D3 — The penalty announcement interpolates the cap as a numeral

`energyPenaltyClause` in `src/board/announcements.ts` currently spells the cap
into the sentence: "…, five of which are penalised". The wording must instead
come from `MAX_DEPLETED_NODES_PRICED`, so it cannot drift from the cap it
describes.

The number is interpolated as a **numeral** — "4 of which are penalised" —
because the same clause already writes its other counts as numerals ("6
depleted nodes at …"), so the sentence stays internally consistent and the
change costs nothing. Screen-reader output is unaffected either way: a
standalone numeral in this position is read as the number.

Rejected: a spelled-number lookup table ("four", "five", …) to preserve the
current word. That adds a table that must be kept in step with a constant it
cannot bound, for a cosmetic gain in a sentence that already mixes numerals
into its prose.

Note the sentence's shape does not change: every occupied depleted node is
still named, and only the count of those that are _priced_ is capped. Nothing
is ranked or selected.

### D4 — `chargeDraw.ts` needs no source change; its **test fixtures** do

`runChargeDraw` computes its own shortfall from `TARGET_CHARGED_NODES` and
already stops short when the inactive pool empties, so the module is correct
at four with no edit. Its tests are not: several fixtures build "four charged
plus one inactive" precisely to force a shortfall of exactly one, and at a
target of four those boards are already full and the draw does nothing.

Measured during planning (target flipped to 4, whole suite run, then
reverted), these nine tests fail and must be re-fixtured or renamed:

- `src/rules/chargeDraw.test.ts` — five tests: two in "the shortfall", one in
  "running short" ("climbs back to five…"), two in "weighted by pressure".
  Their fixtures need one fewer charged node so the intended shortfall
  survives; titles and comments saying "five" become "four".
- `src/rules/endOfTurn.test.ts` — "loses a point of power only for the moving
  side's ships standing on a charged node", whose board is one short of five
  so that K5 is charged deterministically.
- `src/rules/gameState.test.ts` — "deals the board … five charged, ten
  inactive, none depleted" (literal counts and title).
- `src/rules/camping.test.ts` — "charges with no move of the camping ship's
  own…", whose fixture is again four charged plus one inactive.
- `src/rules/nodes.test.ts` — `expect(TARGET_CHARGED_NODES).toBe(5)`.

The fix in every fixture case is to **drop one charged node** so the board is
still exactly one short of the (new) target, preserving the deterministic
single-candidate draw each test was built around. Do not instead add an extra
inactive node — that would make the draw a choice among several and the test's
expectation seed-dependent.

### D5 — `seededReplay.test.ts` has no golden values to regenerate

`story.md` says the recorded expectations in `src/rules/seededReplay.test.ts`
are "regenerated". Inspection shows there is nothing to regenerate: the file
plays the same seed twice and compares the two runs to each other, and plays
two different seeds and asserts they differ. No board, sequence or final state
is written down in the file. Measured during planning at a target of four, all
three of its tests pass unchanged.

What the file _does_ carry is a set of "the run is not vacuous" floors, and
one of them gets tight at four:

| Assertion (seed 20260819, 40 rounds) | Floor | Measured at target 5 | Measured at target 4 |
| ------------------------------------ | ----- | -------------------- | -------------------- |
| `fightCount`                         | 10    | —                    | 12                   |
| `bayReturns.length`                  | 10    | —                    | 24                   |
| `chargedNodes.length`                | 10    | —                    | **11**               |
| `replacedNodes.length`               | 5     | 10 (per its comment) | 8                    |

A board that lights four nodes instead of five charges fewer of them over a
fixed forty rounds, so `chargedNodes` now clears its floor by one. Step 3
re-measures and **lowers that floor with the new measurement written into its
comment**, and refreshes the `replacedNodes` comment, which currently quotes a
figure measured under the old target.

Rejected: leaving the floor at 10 because it passes today. A not-vacuous guard
one below its threshold is a false alarm waiting for the next unrelated
change, and its comment would be quoting a measurement that is no longer true.

### D6 — The long-run guards are re-measured, not re-derived

`src/rules/nodePool.test.ts` derives its bounds from `TARGET_CHARGED_NODES`
where it can and hard-codes the rest, and each hard-coded bound's comment
quotes the figure that was measured when it was chosen. Measured during
planning at a target of four, over the file's own five seeds at 500 plies,
**every one of its 32 tests still passes** — but four of those comments now
quote figures that were measured under a target of five, and one test's title
and arithmetic describe a steady state that no longer exists.

Figures measured during planning (target 4, `SEEDS`, `PLIES_TO_RUN`):

| Quantity                              | Bound in file | Old measurement | New measurement |
| ------------------------------------- | ------------- | --------------- | --------------- |
| Lowest instantaneous inactive count   | ≥ 3           | 5               | 7–8             |
| Multi-expiry share of plies           | < 0.1         | ≤ 2.4%          | ≤ 1.4%          |
| Most expiries in one ply              | ≤ TARGET − 1  | 3               | 2               |
| Longest wait between charges (turns)  | < 400         | 162             | 238             |
| Total charges over the run            | ≥ 40          | 85              | 68–69           |
| Distinct interior squares seen        | > 100         | 116             | 114             |
| Steady-state mean depleted / inactive | 0.5–4 / 6–10  | 1.88 / 8.12     | **1.45 / 9.55** |

Two consequences the implementer must act on:

- The **steady-state test** ("keeps roughly five charged, two or three
  depleted and seven or eight inactive") is now wrong in its title, its
  arithmetic comment and its upper bound on inactive, which at 10 sits 0.45
  above the measured 9.55. Retitle it around four charged, redo the arithmetic
  in the comment for a target of four, and widen the inactive bound so the
  measurement is not sitting on the fence.
- The **longest-wait** comment quotes both a five-seed figure (162) and a
  by-hand forty-seed sweep (257) taken under the old target. Restate it with
  the figure actually re-measured now (238 over the file's seeds), and either
  re-run a broader sweep and quote it, or say plainly that no broader sweep
  was re-run. **Do not carry forward a measurement that was not made.**

The bounds themselves are otherwise left where they are: they were chosen as
loose sanity checks with generous margin, and the new measurements are still
comfortably inside them.

Rejected: tightening every bound to hug the new measurements (turns loose
economy guards into brittle ones); leaving the comments alone because the
tests pass (the comments are the only record of what the bounds mean, and a
stale one is worse than none).

### D7 — The steady state Appendix B should state

The arithmetic behind the numbers Appendix B is rewritten around in Step 1, so
the implementer does not have to re-derive it:

- A node lives about **20 turns charged** and about **10 turns depleted** (the
  existing figures, unchanged).
- With four of fifteen charged at any moment, a whole life runs about
  20 × 15 / 4 ≈ **75 turns**, of which about 45 are spent waiting inactive.
- Steady state: roughly **4 charged, 2 depleted, 9 inactive** of the fifteen,
  against the old 5 / 2½ / 7½.
- Fifteen nodes each charging once per ~75 turns means the board charges a
  node about every **five** turns, against about every four before.
- The **pressure cap of 50 now sits at about the average wait of 45**, where
  it used to sit well above a wait of 30. More of the inactive pool will
  therefore be sitting at or near the cap, which flattens the weighting back
  towards uniform at the top end. Appendix B names this as the first thing to
  check when these numbers are next retuned — it is **not** retuned here (S1).
- Running short of the target becomes **uncommon again**. §8.2 and Appendix B
  currently advertise a shortfall as "the likelier case rather than an edge
  case", because a fifteen-node pool was thin against a target of five. With
  about nine nodes inactive at any moment it is not. The fallback stays legal
  and stays implemented; the document simply stops describing it as the common
  case.

`nodePool.test.ts`'s own steady-state comment is deliberately _different_ from
Appendix B and must stay so: that file drives the economy with **no ships**,
so every charged node drains at the empty rate and lives about 29 turns rather
than 20, which is why it measures ~1.45 depleted and ~9.55 inactive against
Appendix B's 2 and 9. That gap confirms the model rather than contradicting
it. Do not "correct" Appendix B to match the test, and do not delete the
comment that explains the difference — update its arithmetic for the new
target and keep its point.

### D8 — Order: the rules document first, then the constants, then what the player sees

`CLAUDE.md` requires the rules edit to be its own commit ahead of the code, so
Step 1 is the document. After that the order is bottom-up by dependency: the
target constant and the fixtures that assumed five (Step 2), then the long-run
guards that measure the economy the new target produces (Step 3), then the
energy table (Step 4), then the two places that put the table's cap into words
and pixels (Steps 5 and 6). Steps 2 and 4 are independent of each other, but
splitting them keeps each step to one verification point and keeps the failing
test list for each small and legible.

### D9 — `SCORE_DIGITS` stays at 4, for a new reason

`ScoreDisplay.tsx` keeps a four-digit arcade readout, but its comment ("a
hundred-round game pays at most 15 × 100 = 1500") stops being the reason. The
ceiling is now 10 a turn, and the longest game is 90 rounds, so a total tops
out around 900. Four digits stays because a fixed-width arcade readout should
not reflow as the total grows — write that as the reason. Do not shrink it to
three: a three-digit field would be flush against the maximum and would reflow
on the first four-digit total if any future story raises the ceiling again.

### D10 — Accessibility

Per `CLAUDE.md`, existing automated tests are updated where the path is
straightforward, and **no step is added for testing accessibility**. Nothing
here is expected to cost an accessible behaviour: the score sentence is
generated from the same live counts and stays true, and the penalty
announcement keeps naming every occupied depleted node. If a step nevertheless
finds an accessible behaviour being lost, it is **recorded** in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, not repaired.

## Steps

### Step 1 — Rules 0.20 → 0.21: four charged, and a table that stops at four

Status: committed

Notes: Edited §2, §8.1, §8.2, §8.4, §8.6 step 4 and Appendix B in
`doc/ruleset/rules.md` to four charged nodes, per D7's arithmetic for
Appendix B; bumped the version to 0.21; bumped `RULES_VERSION` in
`src/rules/rulesVersion.ts` to match; added a "0.21 — four charged nodes, not
five" entry at the top of `doc/ruleset/changelog.md`, marked as a gameplay
change, tagging left on hold. `npm run typecheck`, `npm run lint`, `npm test`
(939 tests, all still passing since no constant moved yet) and
`npm run format:check` all pass. `grep -n "five" doc/ruleset/rules.md` shows
only fleet-size, random-element-count, spawn-constraint and Appendix B's own
new prose comparing the old and new waits — no surviving claim that the
board aims for five charged, and §8.4's table ends at 4. No deviation from
the plan.

Edit `doc/ruleset/rules.md` so that no section still says the board aims for
five charged nodes, and §8.4's table ends at four. Bump the document's version
to **0.21**, bump `RULES_VERSION` in `src/rules/rulesVersion.ts` to the same
string, and add a `doc/ruleset/changelog.md` entry at the top (newest first)
describing this as a gameplay change, in the style of the existing entries.
This is its own commit, ahead of every code change (S4). Do **not** tag.

The sections to edit, with what each must say afterwards:

- **§2, the Node entry** — "The board aims to keep **four** nodes charged at
  any moment, though it may fall short."
- **§8.1, the aim and the deal** — the board aims to keep four charged; the
  opening board is still fifteen nodes, now **four charged and eleven
  inactive**; "each of the five starts part-drained" and "the five now open at
  different ages" become four. Nothing starts depleted, unchanged. **Both
  opening tables (drain and pressure) are unchanged** — do not touch their
  numbers or their averages.
- **§8.2, the charge draw** — four, in both the opening sentence and the
  shortfall sentence. Re-state the shortfall sentence per D7: charging fewer
  than the target remains legal and remains implemented, but is no longer
  described as the likelier case.
- **§8.4, the table both ways round** — delete the `5 → 15` row, leaving
  `0, 1, 3, 6, 10`. Rewrite the paragraph beneath it around the new numbers:
  up to **eleven** of the fifteen nodes can be depleted at once, since at most
  four are ever charged; the depleted count is **capped at four** before it is
  priced, so five, six or seven depleted nodes cost the same **10** that four
  do; and the most a turn can pay and the most it can cost are both **10**.
  The worked netting example (three charged for 6, two depleted for 3, net +3)
  is unaffected — leave it exactly as it is.
- **§8.6 step 4** — "bring the board back to **four** charged".
- **Appendix B** — rewritten around four charged, using the arithmetic set out
  in **D7** above: the larger inactive pool, the honest statement of how often
  a shortfall now happens, and the pressure cap against a ~45-turn average
  wait as the first thing to check when these numbers are retuned. The counts
  stay described as first guesses to be play-tested. Keep the closing
  paragraphs about the app's long-run guard test and the opening deal starting
  the board near the steady state.

Nothing else in the document changes. In particular §3.2 (where a node may
appear), §8.3 (drain and capacity) and §8.5 are untouched, and the five random
elements listed in §1 stay five.

Depends on: nothing — this is the first step, and it is what every later step
implements.

Verification (automated): Run `npm test` and confirm `rulesVersion.test.ts`
passes (it asserts `RULES_VERSION` matches the version in `rules.md`). Then
confirm by search that no remaining sentence in `rules.md` says the board aims
for five charged nodes and that §8.4's table has no `5` row — for example
`grep -n "five" doc/ruleset/rules.md`, checking each surviving hit is about
something else (fleet size, the five random elements, §3.2's five
constraints). Run `npm run format:check`.

### Step 2 — `TARGET_CHARGED_NODES` becomes 4, and the fixtures that assumed five

Status: committed

Notes: Changed `TARGET_CHARGED_NODES` to 4 in `src/rules/nodes.ts`, and
updated the comments naming five/ten there (`OPENING_DRAIN_TABLE`,
`OPENING_PRESSURE_TABLE`, `dealOpeningBoard`'s doc comment, adding the
sentence that the deal's shape is unchanged but a given seed now deals a
different board since the fifth square drawn takes its level from the
pressure table). Updated the "five of the fifteen" comment in
`gameState.ts` and the "back to five charged" comment in `endOfTurn.ts`'s
step 4 (its step 2 comment, which also says five, is left for Step 4 as the
plan specifies). `chargeDraw.ts` needed no change, confirmed by inspection.
Fixed exactly the nine fixtures/titles D4 identified, in each case by
dropping one charged node to preserve a deterministic one-short-of-target
draw, per D4: `nodes.test.ts` (constant assertion and the deal test's
title), `gameState.test.ts` (title and counts), `camping.test.ts` (dropped
L8), `chargeDraw.test.ts` (five tests: two "the shortfall" fixtures, one
"running short" fixture — reduced from three newly-inactive nodes to two so
the shortfall of 2 is still consumed exactly — and two "weighted by
pressure" fixtures), and `endOfTurn.test.ts` (dropped H12 from the fixture
entirely rather than merely renaming, since with only 3 remaining charged
squares needed the ship at H12 no longer sits on a node; adjusted its
expected power, the sliced effects list down to one power-loss instead of
two, and the energy-collected amount/squares to match holding two nodes
instead of three — a fixture change beyond a title/count edit, but still
within "drop one charged node" and required to keep the test internally
consistent). `npm run typecheck`, `npm run lint`, `npm test` (939 tests, all
passing) and `npm run format:check` all pass. No deviation from the plan's
intent; the endOfTurn.test.ts fixture needed slightly more rework than a
one-line count change because the dropped node had ship-power and
energy-collection assertions riding on it.

Follow-up sweep: the first pass left several fixtures built with five
charged nodes that passed at a target of four only because five sits
_above_ the new target rather than _at_ it, which no longer matches what
their titles and comments claimed ("already at five" / "at its target of
five" / "no shortfall"). Fixed by dropping one charged node from each so
the fixture again sits exactly at or one short of the new target of four,
and corrected the accompanying prose to say four:
`chargeDraw.test.ts` ("charges nothing … when four are already charged",
formerly five, at line ~98; and the "nothing to do" describe block's
"already at four" test, formerly five, at line ~295); `camping.test.ts`
(both "already at its target of five charged nodes" comments, now four,
dropping `D8` from each of the two fixtures they describe);
`ply.test.ts` (two fixtures and their "five charged nodes elsewhere hold
the board at its target" / "as above" comments, now four, dropping `C9`
from each); and `endOfTurn.test.ts`'s step-5 pressure tests ("gains a point
of pressure…" and "stops at the pressure cap…"), which isolated step 5 with
five charged nodes and one comment claiming so — dropped `D8` from both and
retitled the comment to four. Also retitled
`endOfTurn.test.ts`'s "does not run all five opening nodes out on the same
ply" to four — its body already reads the opening squares from state
rather than a fixed list, so no logic changed. Hardened
`chargeDraw.test.ts`'s "running short" test against future drift by
importing `TARGET_CHARGED_NODES` and asserting the charged counts against
it instead of the literal `4`/`5` it held before. Swept the rest of
`src/rules/*.test.ts` for "five" and for un-labelled blocks of four-or-more
`"charged"` node entries; the remaining hits are fleet-size ("five-a-side"),
the five random-element/spawn-constraint mentions, `energy.test.ts` and the
two `endOfTurn.test.ts` energy-table cases (Step 4's), and
`openingBoard.test.ts`/`nodePool.test.ts` (Step 3's), all correctly left
alone. `npm run typecheck`, `npm run lint`, `npm test` (939 tests) and
`npm run format:check` all pass after this sweep. No deviation beyond what
this note records; the sweep was requested after the initial pass missed
these because they were not among D4's nine measured failures (they still
passed, just for the wrong reason).

Change `TARGET_CHARGED_NODES` in `src/rules/nodes.ts` from 5 to 4, and bring
the prose and the fixtures that assumed five into line.

Source changes:

- `src/rules/nodes.ts` — the constant; `OPENING_DRAIN_TABLE`'s comment ("drawn
  once for each of the five nodes the opening deal charges") and
  `OPENING_PRESSURE_TABLE`'s ("each of the ten nodes the opening deal leaves
  inactive") become four and eleven; `dealOpeningBoard`'s doc comment becomes
  four charged and eleven inactive, with its numbered draw order otherwise
  unchanged — same three phases, same order, still **30 seed steps**
  (4 + 11 + 15). Note in that comment that the deal's shape has not changed
  even though a given seed now deals a different board, because the fifth
  square drawn is now an inactive node taking its level from the pressure
  table rather than the drain table.
- `src/rules/gameState.ts` — `startingGameState`'s doc comment ("five of the
  fifteen nodes charged") becomes four.
- `src/rules/endOfTurn.ts` — step 4's inline comment ("bring the board back to
  five charged") becomes four.
- `src/rules/chargeDraw.ts` — **no source change** (D4). Read its module
  comment and confirm it says nothing that names five; it should not.

Test changes — exactly the nine failures listed in **D4**, in
`chargeDraw.test.ts`, `endOfTurn.test.ts`, `gameState.test.ts`,
`camping.test.ts` and `nodes.test.ts`. Fix each fixture by dropping one
charged node so the board stays exactly one (or the intended number) short of
the new target, and update the titles and comments that say "five" or "ten".
Do not weaken an assertion to make it pass.

Do not touch `NODE_COUNT` (S1), the energy table (Step 4), or anything in
`src/hud/` (Step 6).

Depends on: Step 1 — the document is what this implements, and it must already
say four.

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check`. All must pass. In particular
`nodes.test.ts`'s deal test must show fifteen nodes, four charged and eleven
inactive (it derives both counts from the constants, so only its title needs
editing), and `openingBoard.test.ts`, `fullGame.test.ts`, `nodePool.test.ts`
and `seededReplay.test.ts` must still pass unchanged — measured during
planning, they do.

### Step 3 — Re-measure the long-run guards and restate what they claim

Status: committed

Notes: Re-measured every figure myself with a temporary local test file
(deleted before finishing, per S3) rather than editing the real test files
with throwaway `console.log`s, since that let the harness be reused across
both files without repeated edit/revert cycles; the method (add a log,
`npx vitest run`, record, delete) is the one the step describes. Measured
values matched D5/D6's planning table almost exactly: `nodePool.test.ts`
over `SEEDS`/`PLIES_TO_RUN` — lowest instantaneous inactive 7 (comment now
says so, was "5"; Appendix B's own predicted figure in that comment moved
from "7½" to "9" per D7), multi-expiry share ≤1.4% (per-seed maximum,
matching the `it.each` the assertion actually runs under; was "2.4%"),
worst same-ply expiries 2 (was "3"), longest wait 238 turns (was "162",
with the old comment's separate "forty seeds, 800 turns" figure of 257
dropped and replaced with an explicit statement that no broader sweep was
re-run at this target, per D6's "do not carry forward a measurement that
was not made"), total charges 68-69 across the five seeds (was "85"),
distinct interior squares seen 114 (was "116"). Retitled and rewrote the
steady-state test around four charged/one-or-two depleted/nine-or-ten
inactive (measured meanDepleted ~1.45, meanInactive ~9.55 for seed
20260819), redid its arithmetic comment for a life of 15/4 × 29 ≈ 109 turns
(≈1.4 depleted, ≈9.6 inactive), and widened its inactive upper bound from
10 to 11 so the measured 9.55 is not sitting against it, per D6/D7 — its
point (this file's no-ship economy differs from Appendix B for a stated
reason) is unchanged. Retitled the "never exceeds five/back at five"
test to four; no logic change, it already derives from the constant.
`seededReplay.test.ts`: re-measured seed 20260819 over 40 rounds —
fightCount 12, bayReturns 24, chargedNodes 11, replacedNodes 8, all
matching D5's table. Lowered `chargedNodes.length`'s floor from 10 to 8
(measured 11, so the old floor cleared it by only one) with the
measurement written into a new comment beside it, and refreshed the
`replacedNodes` comment from its old-target figure of 10 to the
new-target figure of 8; its floor of 5 is unchanged, per the plan.
`openingBoard.test.ts`: retitled "tops the board back up to five" to
four, and corrected the inline comment "the five dealt already charged are
excluded" to four — and, since it sits in the same sentence and was
already stale, also corrected that comment's "ten dealt-inactive nodes" to
eleven (`NODE_COUNT - TARGET_CHARGED_NODES` is now 11), which the plan's
bullet for this file did not call out individually but which is the same
kind of prose fix on the same line. `npm run typecheck`, `npm run lint`,
`npm test` (939 tests, all passing, including `nodePool.test.ts`,
`seededReplay.test.ts`, `openingBoard.test.ts` and `fullGame.test.ts`) and
`npm run format:check` all pass. No other deviation from the plan.

The economy tests all pass at a target of four, but several of them describe a
board that keeps five charged and quote figures measured under that target.
Bring their prose and their fenced bounds back into honesty, per **D5** and
**D6**, which carry the measurements taken during planning.

- `src/rules/nodePool.test.ts` — update the module header (it says "five of
  them charged") and the comments on `MINIMUM_INACTIVE_NODES`,
  `MAXIMUM_MULTI_EXPIRY_SHARE`, `MAXIMUM_EXPIRIES_IN_ONE_PLY`,
  `MAXIMUM_TURNS_BETWEEN_CHARGES`, `MINIMUM_TOTAL_CHARGES` and
  `MINIMUM_DISTINCT_SQUARES_SEEN` with figures **you re-measure yourself** on
  this branch (D6's table is the planning measurement; confirm it). Retitle
  and rewrite the steady-state test around four charged, redoing its
  arithmetic comment for the new target and keeping its point that this file's
  no-ship run sits away from Appendix B's figures for a stated reason (D7).
  Widen its inactive upper bound so the measured ~9.55 is not sitting against
  it. Retitle "never exceeds five charged, and is back at five by the end of
  the run" around four; it derives from the constant and needs no logic
  change.
- `src/rules/seededReplay.test.ts` — re-measure the four "not vacuous" counts
  and lower `chargedNodes.length`'s floor from 10, which the new run clears by
  one, writing the re-measured figure into a comment beside it. Refresh the
  `replacedNodes` comment, which quotes a figure measured under the old
  target. The three properties themselves are unchanged: the same seed still
  replays exactly, and different seeds still diverge.
- `src/rules/openingBoard.test.ts` — its assertions derive from
  `TARGET_CHARGED_NODES`, but its test title ("tops the board back up to
  five") and an inline comment ("the five dealt already charged are excluded")
  say five. Correct both.

How to re-measure: temporarily add a `console.log` of the quantity beside the
assertion, run the file with `npx vitest run <path>`, record the figure, and
remove the log before committing. No script or fixture is added to the
repository (S3).

Depends on: Step 2 — these figures can only be measured once the target is
actually four.

Verification (automated): Run `npm test` and confirm the whole suite passes,
including `nodePool.test.ts`, `seededReplay.test.ts`, `openingBoard.test.ts`
and `fullGame.test.ts`. Record the re-measured figures in the step's `Notes:`
line so a later reader can see what the bounds were set against.

### Step 4 — The energy table stops at four

Status: committed

Notes: Deleted `ENERGY_BY_NODES_HELD`'s last entry (`15`) in
`src/rules/energy.ts`, leaving `[0, 1, 3, 6, 10]`; left
`MAX_DEPLETED_NODES_PRICED`, `energyForNodesHeld`'s bound and
`energyForDepletedNodes`'s `MAX_SHIPS_PER_SIDE` guard as pure derivations
with no logic change, per D1, and rewrote the three doc comments plus
`MAX_DEPLETED_NODES_PRICED`'s own comment for the new numbers (10 as the
cap each way, 0–4 for `energyForNodesHeld`, up to eleven depleted nodes
possible with five/six/seven all pricing at 10 for
`energyForDepletedNodes`). Updated `endOfTurn.ts`'s step 2 comment ("the
table price is clamped to a count of five" → four). Updated
`energy.test.ts` per the step's exact spec: dropped both `[5, 15]` rows,
moved the "throws for a count above five" case to throw at 5 (was 6),
changed the clamp `it.each` from `[6, 7]` to `[5, 6, 7]` all pricing at 10,
and updated the two prose-only tests referencing "five"/15 to "four"/10.
Updated `endOfTurn.test.ts`'s two named tests: the collection-table case
list drops its `[5, 15]` row and its title's "five" ("prices one, two,
three and four…"), and the clamp test is restated as "prices five, six and
seven depleted nodes the same as four" — expanded from a single six-node
fixture to an `it.each`-style loop over 5/6/7 depleted nodes (new fixture
squares `E11` added to the five prior ones) so all three clamped counts are
exercised, each asserting a penalty of 10 and a resulting total of 90; this
is slightly more than the plan's parenthetical literally names ("becomes
five, six and seven at 10") but is what asserting all three values
requires. `npm run typecheck`, `npm run lint` and `npm run format:check`
all pass.

**Deviation to flag, not fixed here:** `npm test` on the full suite shows 2
failing tests, both in `src/hud/ScoreDisplay.test.tsx` ("renders five
depleted pips, none on when the side stands on nothing depleted" and
"lights all five depleted pips when the side stands on six depleted
nodes"), not in the two files this step's own text names. The cause is
that `ScoreDisplay.tsx`'s depleted pip row already reads
`MAX_DEPLETED_NODES_PRICED` (confirmed by inspection: no source change was
needed there), so this step's constant change alone moves that row's
length from 5 to 4, independent of the charged row and of
`NODES_IN_PLAY`. The plan's own Step 6 already lists exactly these two
tests for renaming/re-counting to four ("the tests that name 'five pips' /
'five depleted pips' … renamed to four"), and Step 6 depends on Step 4 for
this reason. Since "do not start later steps, even if they seem trivial"
governs, `ScoreDisplay.test.tsx` was left untouched here rather than
absorbing part of Step 6's scope; `energy.test.ts` and `endOfTurn.test.ts`
are green, matching what this step's text names, but the plan's claim that
those are "the only failures this change produces" should be read as "the
only failures in the files this step names" — it does not hold for the
whole suite until Step 6 lands.

**Resolved by the orchestrator before committing:** rather than commit a red
suite, the two depleted-pip tests named above were renamed to four and their
expected counts moved from 5 to 4 here, since it is this step's constant
change that moves them. Nothing else in `ScoreDisplay.test.tsx` and nothing
in `ScoreDisplay.tsx` was touched; the charged pip row, `NODES_IN_PLAY`,
`SCORE_DIGITS` and the two CSS sizing comments remain Step 6's work. The
whole suite is green at this commit (938 tests), with `npm run typecheck`,
`npm run lint` and `npm run format:check` also passing.

In `src/rules/energy.ts`, delete `ENERGY_BY_NODES_HELD`'s last entry, leaving
`[0, 1, 3, 6, 10]`. Change nothing else about how the module computes: in
particular `MAX_DEPLETED_NODES_PRICED` stays derived from the table's length
(**D1**) and becomes 4 without being edited, `energyForNodesHeld`'s
`RangeError` bound moves from 5 to 4 by the same derivation, and
`energyForDepletedNodes` keeps its `MAX_SHIPS_PER_SIDE` guard — that guard
bounds what is genuinely impossible (a side has seven ships), not what is
merely capped.

The comments in the module do need rewriting, because they quote the old
numbers:

- `MAX_DEPLETED_NODES_PRICED` — the most a turn can pay is now **10** (four
  charged nodes), so the most a turn can cost is capped at 10 too.
- `energyForNodesHeld` — throws outside **0–4**; the board never charges more
  than four nodes at once (§8.1, §8.2), so a fifth held node is a caller bug
  exactly as a sixth was.
- `energyForDepletedNodes` — up to **eleven** of the fifteen nodes can be
  depleted at once, and **five, six or seven** depleted nodes all cost the
  same as four.

Also update `src/rules/endOfTurn.ts`'s step 2 comment, which says the table
price is clamped to a count of five.

Tests to update: `src/rules/energy.test.ts` (drop the `[5, 15]` rows from both
tables of cases; "throws for a count above five" becomes above four and
asserts the throw at 5; the clamp cases assert **five, six and seven** all
price at 10 without throwing, and that 8 still throws) and
`src/rules/endOfTurn.test.ts` (the "prices one, two, three, four and five
depleted nodes off the collection table" case list, and "prices six and seven
depleted nodes the same as five", which becomes five, six and seven at 10).
Measured during planning, those are the only failures this change produces.

Depends on: Step 1 for the document. Independent of Steps 2 and 3, but
sequenced after them so each step's failing-test list stays small (**D8**).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check`. `energy.test.ts` must show 0–4 priced as
0, 1, 3, 6, 10; a throw at 5 for `energyForNodesHeld`; 5, 6 and 7 all priced
at 10 by `energyForDepletedNodes` without throwing; and a throw at 8. The
largest possible collection and the largest possible penalty in a turn are
both 10.

### Step 5 — The over-cap announcement says its cap from the constant

Status: committed

Notes: Replaced the spelled "five of which are penalised" in
`energyPenaltyClause` (`src/board/announcements.ts`) with an interpolation of
`MAX_DEPLETED_NODES_PRICED`, per D3, using the constant already imported for
the comparison above; updated the function's doc comment, which also spelled
out "five", to reference the constant instead while keeping its point that
every occupied node is still named and only the counting is capped. Updated
`announcements.test.ts`'s over-cap case: retitled to "four", changed the
fixture's `amount` from 15 to 10 so the example is a reachable board state,
and updated the expected sentence to "lost 10 energy … 4 of which are
penalised". `npm run typecheck`, `npm run lint`, `npm test` (938 tests, all
passing) and `npm run format:check` all pass. No deviation from the plan.

In `src/board/announcements.ts`, `energyPenaltyClause` spells the cap into the
sentence: "…, five of which are penalised". Replace the spelled word with the
value of `MAX_DEPLETED_NODES_PRICED`, interpolated as a numeral (**D3**), so
the sentence reads "…, 4 of which are penalised" today and cannot drift from
the cap in future. The module already imports the constant for the comparison
immediately above; use the same one.

Update the function's doc comment, which also says five, and keep its point:
every occupied depleted node is still named, and the cap only stops the
counting — nothing is ranked or selected.

Update `src/board/announcements.test.ts`'s over-cap case ("names every
depleted node occupied and says five are penalised once the cap is passed"):
its title, its expected sentence, and the fixture's penalty `amount`, which
should be **10** so the example is a board state the game can actually
produce.

Depends on: Step 4 — `MAX_DEPLETED_NODES_PRICED` must already be 4, or the
sentence this step writes would still say five.

Verification (automated): Run `npm test` and confirm
`announcements.test.ts` passes with the over-cap sentence reading "… 4 of
which are penalised", and that no other announcement test's expected wording
had to change.

### Step 6 — Four pips a row, from the constants, and the sizing comments corrected

Status: committed

Notes: Deleted the local `NODES_IN_PLAY = 5` in `src/hud/ScoreDisplay.tsx`
and sized the charged pip row from `TARGET_CHARGED_NODES` (imported from
`src/rules/nodes.ts`); the depleted row is unchanged, still reading
`MAX_DEPLETED_NODES_PRICED`, per D2. Kept `SCORE_DIGITS` at 4 and rewrote
its comment per D9: the ceiling is 10 a turn, the longest game (90 rounds)
tops out around 900, and four digits stays for the arcade readout's fixed
width. Corrected the two sizing comments in prose only, per S2:
`ScoreDisplay.css`'s note that the digits' font-size "makes the five-pip
row the widest thing in the column" now points to `App.css` for what is
widest instead of naming a row that no longer exists; `App.css`'s
landscape sizing note now says a four-pip row draws about `0.61P`, that the
title and turn indicator's longest wording (`~0.72P` each) are now the
widest things in the column, and explicitly that `--region-extent` is not
re-derived because the column got narrower content, not wider — no other
length in the file was touched. Updated `ScoreDisplay.test.tsx`'s one
remaining "five pips" test (title and `toHaveLength`) to four; the two
depleted-pip tests the plan's bullet also named were already renamed and
re-counted in Step 4, and were left untouched here as the plan instructs.
`npm run typecheck`, `npm run lint`, `npm test` (938 tests, all passing)
and `npm run format:check` all pass. No deviation from the plan.

In `src/hud/ScoreDisplay.tsx`:

- Delete the local `NODES_IN_PLAY = 5` and size the charged pip row from
  `TARGET_CHARGED_NODES` (imported from `src/rules/nodes.ts`). The depleted
  row keeps reading `MAX_DEPLETED_NODES_PRICED` — the two rows keep two
  sources on purpose (**D2**).
- Keep `SCORE_DIGITS` at 4 and rewrite its comment for the reason given in
  **D9**: the ceiling is now 10 a turn, so the longest game (90 rounds) tops
  out around 900; four digits stays for the arcade readout's fixed width.

The pips keep their current size and spacing; nothing is re-scaled (S2). Two
comments describing the old five-pip geometry are corrected **in prose only**:

- `src/hud/ScoreDisplay.css` — the note that giving the pip rows the digits'
  font size "makes the five-pip row the widest thing in the column".
- `src/App.css` — the landscape sizing note that "the widest thing in the
  column is the five-pip row, which draws about `0.77P` across". A four-pip
  row draws about **`0.61P`**, so the widest things in the info column become
  the title and the turn indicator's longest wording at roughly `0.72P` each.
  Say so, and say explicitly that `--region-extent` is deliberately **not**
  re-derived: the column got narrower content, not wider, so no layout breaks,
  and taking `P` down to match is a visual retune belonging to a visual story.
  Do not change `--region-extent`'s value or any other length.

Update `src/hud/ScoreDisplay.test.tsx`: four pips in each row, and the test
that names "five pips" renamed to four. The two depleted-pip tests this
bullet also named were already renamed and re-counted in Step 4, whose
constant change broke them; leave them as they are. The lit-and-on
behaviour is unchanged: a pip lights per charged node held, a depleted pip
comes on per depleted node occupied, and the row saturates at its length.

Depends on: Step 4 (the depleted row already reads
`MAX_DEPLETED_NODES_PRICED`, which must already be 4) and Step 2 (the charged
row now reads `TARGET_CHARGED_NODES`, which must already be 4).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check`. `ScoreDisplay.test.tsx` must show four
`.score-display__pip` and four `.score-display__depleted-pip` elements per
cell, with lighting driven by the counts as before, and the hidden score
sentence unchanged in form.

### Step 7 — Play it

Status: pending

No code change. The owner runs the app and confirms the change is what four
charged nodes should look and feel like.

Depends on: Steps 1–6 — this is the first point at which the whole change is
visible in the running app.

Verification (manual): Run `npm run dev` and open the app in a browser. Start
a new game and confirm:

- The opening board shows **fifteen** nodes with exactly **four lit**; the
  rest are unlit and visibly at different sizes/warmths, and none looks
  depleted.
- Each score cell draws **four** charged pips and **four** depleted pips, at
  the same size as before, and the info column still looks right — nothing
  clipped, nothing obviously off-centre — in both a landscape and a portrait
  window.
- Playing on: as nodes run out, the board tops itself back up to **four** lit
  and never shows a fifth.
- Holding nodes pays off the new table — holding all four pays **10** in a
  turn, and the score readout's four-digit field does not reflow.
- Standing on several depleted nodes costs at most **10** in a turn, and the
  announcement for an over-cap turn names every depleted node the side is on
  and says "4 of which are penalised".
- Nothing else about a node has changed: it still grows and brightens while it
  waits, still drains faster while a ship sits on it, still retires and
  reappears elsewhere.

If anything here looks wrong, stop and report it rather than adjusting sizes
or bounds — S1 and S2 put those changes outside this story.

### Step 8 — README, the accessibility ledger, and the closing sweep

Status: pending

Bring the player-facing README into line and close the story out.

- `README.md` — the "how it plays" passage currently says the opening board
  has "five of them already lit", "the ten that are not yet lit", and that the
  board "keeps itself topped up to five lit nodes". Those become **four**,
  **eleven** and **four**, in the player's words and the surrounding voice.
  Then run `/update-readme`, which reviews the branch diff and updates
  `README.md` if anything else warrants it. The README does not quote the
  energy table, so no number from §8.4 needs to appear there; do not add one.
- `doc/plan/00000021-accessibility-tech-debt/known-issues.md` — check whether
  any step in this story knowingly cost an accessible behaviour. None is
  expected: the score sentence is generated from the same live counts, the
  penalty announcement still names every occupied depleted node, and no
  keyboard or focus behaviour is touched (**D10**). If nothing was lost, add
  nothing and say so in the step's Notes.
- Sweep the branch for anything left saying five charged nodes or a ceiling of
  15 — for example `grep -rn "five" src/ README.md` and
  `grep -rn "15" src/hud src/board/announcements.ts` — and confirm every
  surviving hit is about something else (fleet size, the 15 × 15 board, the
  opening tables' amounts).

Depends on: Steps 1–7 — the README describes the finished behaviour, and the
sweep is only meaningful once every code change is in.

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm run build`; all must pass clean. The README's
wording is reviewed by the owner at the story's final sign-off gate, not by a
command.
