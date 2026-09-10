# Implementation Plan — Story 00000077, A three-node game

## What this story does

Version 0.30 turned the charged-node count into a choice made before play
begins: **five or four**, five the standard game, carried on the game state
and chosen in the start screen's second option group. This story adds a
**third** choice — **three** — placed **last**, so the group reads **5 4 3**.
Five stays the default and the standard game; nothing about the five- or
four-node game changes.

Because 0.30 did the plumbing properly, the count is already a property of
`GameState`, already dealt against, already charged against, already
validated and already rendered from an array. So most of this story is a
widened type and a third array entry. What is **not** automatic:

- `doc/ruleset/rules.md` states the choice as "five or four" in several
  places, and Appendix B quotes **measured** figures at those two counts
  only.
- `src/rules/nodePool.test.ts` — the app's only long-run instrument for
  Appendix B — is parameterised over the offered counts, so a third count
  starts running the moment the array grows. One of its tuned bounds,
  `MINIMUM_TOTAL_NODES = 7`, is **unsound at three charged by construction**
  (three charged plus three inactive is six nodes), so it must be fixed
  before the count widens.
- A handful of tests name the counts by hand: they assert the array equals
  `[5, 4]`, that `3` is **rejected** as a count, and that `startingGameState`
  **throws** for 3.
- Two component tests query a radio by the accessible name `"3"` without
  scoping it to a group. Once the Charged nodes group also offers a `3`, that
  query matches two elements and fails.
- `src/guide/guideCopy.ts` still says "There are always four charged nodes",
  which has been wrong since 0.30 and gets wronger here.

`story.md` in this folder is the owner's full statement of the change. This
plan does not repeat its argument; it says how to get there, in what order,
and records the decisions, because code in this repository deliberately
carries no design history (`CONTRIBUTING.md`, "Comments").

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say. Do not mix them (`CLAUDE.md`, Vocabulary).
- **Node** is the word everywhere — code, tests and player-facing text.
- **Action** is one of the two things a player does in a ply; **move** is the
  movement action specifically and is never a synonym for a ply or a turn.
- **Charged-node count** is this story's subject. `README.md`'s player voice
  says "lit"; the rules, the code and the start screen say "charged".

## Settled decisions — do not reopen

These come from `story.md` and from the discussion while it was written. A
step that finds one inconvenient should escalate, not re-decide.

- **S1.** The offered counts become **5, 4 and 3, in that order** — largest
  first, so the leftmost choice is still the default game. **Two, six and a
  free number stay out of scope**, and nothing is built to make them easy
  later.
- **S2.** **Five stays the default** everywhere a default is reached for: the
  rules document's standard game, the start screen's initial selection, and
  the count `startingGameState` falls back to. The standard game is
  therefore byte-for-byte unchanged, including the seed-step count of its
  opening deal — `src/rules/seededReplay.test.ts`'s recorded expectations
  must pass **exactly as recorded**, and any temptation to re-record them is
  a sign something went wrong.
- **S3.** **Three inactive nodes stay three** at every count, with the same
  priorities, rotation, sweep and refill. Appendix B's argument for the
  queue's size never depended on the target: at most one countdown starts
  per turn, so at most one node expires, plus at most one a player walks
  off — a shortfall of never more than two, which three inactive nodes cover
  whether the board fills towards five, four or three.
- **S4.** Nothing is **re-tuned** against three: not the countdown lengths,
  not the placement weighting or constraints, not the pool rules, not the
  game lengths, not the fleet sizes. Appendix B is **re-measured, not
  re-fitted**.
- **S5.** A three-node game deals **six** nodes — three charged at baseline
  with no countdown, three inactive at priorities 1, 2 and 3, nothing
  depleted — consuming **seven** seed steps (3 + 4).
- **S6.** The **pip row** stays `min(the side's ship count, the game's
charged-node count)`, unchanged from 0.30. At three charged it is three
  pips at any fleet size. Nothing is re-scaled and nothing is drawn in the
  space a shorter row leaves.
- **S7.** This is a **gameplay change**: `doc/ruleset/rules.md` bumps
  **0.30 → 0.31**, with a `doc/ruleset/changelog.md` entry and
  `RULES_VERSION` in `src/rules/rulesVersion.ts` updated to match, in its
  own commit **ahead of** the code. There is **one** version bump on this
  branch: the later rules edit this plan schedules (Appendix B's figures at
  three, Step 8) folds into the same 0.31 entry, never a second bump.
  **Tagging stays on hold** (`CLAUDE.md`) — bump and write the entry, do not
  run `/tag-rules`.
- **S8.** **No backwards compatibility** for games recorded under 0.30
  (`CLAUDE.md`).
- **S9.** Per `CLAUDE.md`'s pre-release stance: **no plan steps for testing
  accessibility**, and **no review fixtures or manual test scripts** — the
  owner drives manual testing himself. Where an existing automated test has
  a straightforward path to being updated, update it. Anything knowingly
  lost goes as a note in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`; none is
  expected here.
- **S10.** The Quick Guide gets **one corrected sentence**, not a rewrite.

## Decisions this plan makes

- **D1. `nodePool.test.ts`'s total-node floor becomes per-count, derived
  rather than measured.** Today `MINIMUM_TOTAL_NODES` is a single module
  constant, `7`, whose comment already says it is "the board's structural
  floor at four charged — four charged nodes plus three inactive". That
  reasoning generalises exactly: the floor is the count under test plus
  `INACTIVE_NODE_COUNT` (already imported by that file from `nodeQueue.ts`),
  because the board is always back at its own count by the end of a turn and
  the queue is always exactly three. At five that is 8, at four 7, at three
  6 — and a planning run confirmed the measured minima are exactly those
  numbers at all three counts (see D3's figures), so nothing loosens.
  _Rejected:_ lowering the single constant to `6`. It would keep the file
  green but would stop the test noticing a five-charged board that dropped
  to seven total nodes — a real bug — for the sake of one fewer expression.
  _Rejected:_ a per-count table of measured minima. The floor is exact by
  construction; a table would be fitting where arithmetic will do (S4).
- **D2. `MAXIMUM_TOTAL_NODES` stays a single `14`.** It is a margin, not a
  structure: it exists to catch a runaway, not to describe a count. At three
  charged the measured maximum is 9, so 14 is loose there — the comment must
  **say** that it is a shared ceiling with generous margin above all three
  ranges, so no later reader mistakes 14 for a figure measured at three.
  Tightening it per count would be re-fitting, which S4 puts out of scope.
- **D3. The other four tuned bounds are not re-tuned.** All were re-measured
  at three during planning, with temporary instrumentation on this very
  test, over its own `SEEDS` (five seeds) and `PLIES_TO_RUN` (500 plies
  each). The figures, which Step 7 will re-take and confirm:
  - total node count at three charged: min **6**, max **9**, mean **8.93**
    (five: 8 / 13 / 12.88; four: 7 / 11 / 10.91);
  - refill pool sizes at three charged (strict first draw, widened second,
    widened third): means **29.83 / 44.17 / 40.29**, minima 15 / 31 / 28
    (five: 21.31 / 31.72 / 28.48; four: 25.20 / 37.61 / 34.05);
  - the trio's mean smallest pairwise gap at three charged: **4.883**
    weighted against **3.705** unweighted, an advantage of **1.178**, over
    675 refills — clearing `MINIMUM_MEAN_REFILL_GAP` (4) and
    `MINIMUM_SPREAD_ADVANTAGE` (0.5) comfortably;
  - mean plies between refills at three charged: **3.704** (2500 plies, 675
    refills), inside the band `MINIMUM_MEAN_PLIES_BETWEEN_REFILLS` (1.5) to
    `MAXIMUM_MEAN_PLIES_BETWEEN_REFILLS` (5), but **nearer the ceiling than
    either other count** (2.222 at five, 2.778 at four) because there are
    fewer charged nodes for the file's stand-in driver to keep counting
    down. That is the one bound worth calling out in a comment.
  - §3.2's **fallback never fired** at any count: the smallest pool measured
    at any draw at three charged was 15, never zero.
    A planning run of the whole suite with the count widened and D1 applied
    showed **no** long-run failure at three. If Step 7's re-measurement
    nonetheless lands a figure outside a bound, widen **the bound** — with
    the measured figure and the reason in its comment — and never the game
    (S4); if the miss is large enough that widening looks like fitting,
    escalate to the owner rather than deciding alone.
- **D4. The type widens to `3 | 4 | 5` and the array becomes `[5, 4, 3]`,
  with the existing comment left as it stands.** The comment says the array
  is "largest first, so the leftmost choice is the default game", which is
  still exactly true. `DEFAULT_CHARGED_NODE_COUNT` stays `5`.
- **D5. Appendix B is written in two passes on one version bump.** Step 1
  cannot state figures measured at three charged, because no code deals
  three charged until Step 3. So Step 1 rewrites Appendix B's **prose** to
  the three-way choice and leaves its measured figures attributed to five
  and four — true statements about a board the app still produces — and
  Step 8 adds the three-charged figures once Step 7 has taken them. One
  entry in `changelog.md`, one version, two commits (S7). The transient
  state committed after Step 1 is a document that offers three but has not
  yet measured it; that is honest, and it is fixed inside the same story.
- **D6. The `"3"` radio ambiguity is fixed in the tests, not in the UI.**
  Ships offers 6, 5, 4, 3 and Charged nodes will offer 5, 4, 3, so a
  screen-wide `getByRole("radio", { name: "3" })` will match two elements.
  Two existing tests do that (named in Step 3) and must scope their query to
  the group they mean, the way their neighbours already do with `within(...)`.
  No production change: each radio sits inside a `group` with an accessible
  name ("Ships", "Charged nodes"), so the pairing of group and value is
  what a user or assistive technology hears; only the tests were being
  loose. This is not an accessibility loss and does not belong in
  `known-issues.md`.
- **D7. The corrected Quick Guide sentence names the three numbers.** The
  recommended replacement for "There are always four charged nodes." is:
  **"The board always has the number of charged nodes chosen at the start:
  five, four or three."** One sentence, plain voice, no explanation of the
  option (S10). The implementer may adjust the wording, but it must stay one
  sentence, must not use the word "ply", and `guideCopy.test.ts` must be
  updated to assert the paragraph exactly as shipped.
  _Note for the reviewer:_ the rest of that paragraph is **not** stale, and
  must be left alone. "Gains 6 points if it stays on the node until it
  becomes depleted" matches section 8.3's own table, where the holder
  collects a sixth time in the instant the node depletes; "trapped for 5
  turns" is the 11-turn depleted countdown expressed in the trapped
  player's own turns, which is how the guide counts throughout. Both were
  checked against rules.md 0.30 at the plan-approval gate, after an earlier
  draft of this plan wrongly called them stale. Only the charged-node
  sentence changes.
- **D8. The production files 0.30 touched are expected to need no change at
  all** — `gameState.ts`, `session.ts`, `useAppScreen.ts`, `StartScreen.tsx`,
  `ScoreDisplay.tsx` all derive from the type or the array. If one turns out
  to need an edit, that means a count was hard-coded somewhere 0.30 missed:
  make the edit and **record it in that step's Notes**, because it is a
  finding, not routine work.

## Step sequence at a glance

1. `rules.md` 0.30 → 0.31 — three joins the choice (docs, own commit).
2. The long-run total-node floor becomes per-count (no behaviour change).
3. Three joins the offered counts, and the hand-written counts follow.
4. Rules-layer coverage at three charged.
5. The chosen 3 reaches the game, end to end.
6. The Quick Guide's stale sentence.
7. The economy measured at three, and the test's comments re-stated.
8. Appendix B re-stated at three (same 0.31, no second bump).
9. The owner plays a three-node game (manual gate).
10. `README.md` and the final sweep.

---

### Step 1 — `rules.md` 0.30 → 0.31: three joins the choice

Status: committed

Notes: Bumped `doc/ruleset/rules.md` to 0.31 and `RULES_VERSION` in
`src/rules/rulesVersion.ts` to match. Widened every "five or four" mention
(§2's Node entry, §8.1's choice sentence and opening-board sentence, §8.2's
queue-size sentence, and Appendix B's opening sentence, "never short"
paragraph and "What the app guards" paragraph) to the three-way "five, four
or three". Left Appendix B's measured figures attributed to five and four
only, per D5 — no figure claims three charged yet, since no code deals
three charged until Step 3; those figures land in Step 8 alongside the same
0.31 changelog entry, extended rather than duplicated. Added one
`## 0.31` entry to `doc/ruleset/changelog.md`, newest first, in the shape
the 0.30 entry uses, noting tagging stays on hold. `npm run typecheck`,
`npm run lint` and `npm test` all pass (1151 tests, including
`rulesVersion.test.ts` against the new 0.31 string); `npm run format:check`
reports only a pre-existing, unrelated warning on `src/board/planetArt.ts`
that this step did not touch. No deviation from the plan.

Update `doc/ruleset/rules.md` so the charged-node count reads as a **three-way**
choice everywhere it is named, bump the document to **0.31**, bump
`RULES_VERSION` in `src/rules/rulesVersion.ts` to match, and add **one**
`doc/ruleset/changelog.md` entry for 0.31, newest first, in the shape the
0.30 entry uses. This is a gameplay change; note in the entry that tagging
stays on hold (S7). This step is **its own commit, ahead of all code**.

Places that name the counts today, found by reading, not only by grep:

- **§2, the Node entry** — "five or four, chosen before play begins" becomes
  the three-way phrasing.
- **§8.1** — where the choice is defined. Five, four **or three**, five the
  standard game; the opening board is **eight** nodes at five, **seven** at
  four, **six** at three. The bullets below it are already phrased against
  "the chosen number" and need no change beyond that count list.
- **§8.2** — the sentence stating that the queue's size is unrelated to the
  chosen target names the counts ("whether the board is filling towards five
  charged or towards four") and must name three too. The shortfall wording
  around it is already against the chosen number.
- **§8.3, §8.4, §8.6 step 4, §9, §10** — read each; they are already phrased
  against the chosen number, so correct only anything that names the two
  counts. §8.4's "hold three, collect three" is an example of holding three
  nodes, not a statement of the count, and stays.
- **Appendix B** — the **prose** becomes three-way now; the **measured
  figures stay as they are**, attributed to five and four (D5). Specifically:
  - the opening sentence's "five or four" becomes the three-way list;
  - the "never short" paragraph's "whether the board is filling towards five
    charged or towards four" names three too;
  - "What the app guards" says "the opening deal's eight, seven or six" and
    that the guards run at **all three** counts (they will, from Step 3);
  - the node-count range, the pool sizes, the spread figures, the mean turns
    between refills and the fallback paragraph keep their present numbers
    and are left explicitly attributed to five and four charged, with three
    **not yet measured** — do **not** invent a figure at three here.
  - The edge and corner figures are already flagged as measured at four
    charged only; that flag **stands as written** and does not grow a third
    caveat (`story.md`, In scope, Appendix B).

Do not change any other rule, number or section while in the document.

Depends on: nothing.

Verification (automated): Run `npm test` — `src/rules/rulesVersion.test.ts`
asserts the constant matches the document, so a mismatched bump fails there.
Then run `npm run format:check`. Finally confirm by reading: no section of
`rules.md` offers only five or four; `doc/ruleset/changelog.md` has exactly
one `## 0.31` heading and still exactly one `## 0.30`; and no figure in
Appendix B claims to be measured at three charged.

---

### Step 2 — The long-run total-node floor becomes per-count

Status: committed

Notes: In `src/rules/nodePool.test.ts`, removed the module-level
`MINIMUM_TOTAL_NODES` constant and replaced it with `minimumTotalNodes`,
computed inside the `describe.each(CHARGED_NODE_COUNTS)` block as
`chargedNodeCount + INACTIVE_NODE_COUNT`, used by the "keeps the board's
total node count within a sane, measured band" assertion. Rewrote the
comment above `MAXIMUM_TOTAL_NODES` (the only constant left there) to keep
the measured-range prose, explain that the lower bound is now derived per
count rather than fixed, and re-state `MAXIMUM_TOTAL_NODES` as a shared
ceiling that exists to catch a runaway rather than describe any one count's
measured range (D1, D2). No behaviour change: at five and four charged the
derived floor is still 8 and 7, matching the removed constant's values at
those counts, so the suite is green exactly as before. `npm run typecheck`,
`npm run lint` and `npm test` all pass (1151 tests, same count as Step 1);
`npm run format:check` reports only the same pre-existing, unrelated
warning on `src/board/planetArt.ts` noted in Step 1. No deviation from the
plan.

In `src/rules/nodePool.test.ts`, replace the module-level
`MINIMUM_TOTAL_NODES = 7` with a floor derived **per count** inside the
file's `describe.each(CHARGED_NODE_COUNTS)` block: the count under test plus
`INACTIVE_NODE_COUNT` (already imported in that file from `nodeQueue.ts`).
Rewrite the constant's doc comment to say the floor is structural — the
board is back at its own charged-node count by the end of every turn, plus
exactly three inactive, nothing else guaranteed — so it is exact by
construction at **every** count rather than a measured margin (D1). Leave
`MAXIMUM_TOTAL_NODES` at 14 and extend its comment to say it is a shared
ceiling with margin above every count's measured range (D2).

Nothing else in the file changes, and no behaviour changes: at the two
counts the array currently offers, the derived floor is 8 and 7, and the
measured minima are exactly 8 and 7.

Why it comes here: `MINIMUM_TOTAL_NODES = 7` is unsound at three charged by
construction, and this file runs automatically at every count in
`CHARGED_NODE_COUNTS`. Fixing the bound **before** the array grows keeps
Step 3 free of tuning judgement and keeps every commit green.

Depends on: nothing in this plan (it is deliberately ahead of Step 3).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green, with
`src/rules/nodePool.test.ts` still passing at five and four. The floor
tightening from 7 to 8 at five charged is the point: if that pass goes red,
stop and escalate, because it would mean the board does drop below its own
count plus three at some ply.

---

### Step 3 — Three joins the offered counts

Status: committed

Notes: Done inline by the orchestrator rather than by an agent, at the
owner's instruction that small steps do not warrant a dispatch.
`ChargedNodeCount` is `3 | 4 | 5`, `CHARGED_NODE_COUNTS` is `[5, 4, 3]`,
`DEFAULT_CHARGED_NODE_COUNT` unchanged at 5. `dealOpeningBoard`'s and
`startingGameState`'s doc comments gained the third count (six nodes,
seven seed steps). Exactly the five predicted test failures needed
fixing, and no others: `nodes.test.ts`'s array and its accept/reject
lists (3 moved to accepted, 2 took its place among the rejects),
`gameState.test.ts`'s RangeError list (same swap), and the two
screen-wide `radio` name "3" queries in `StartScreen.test.tsx` and
`App.test.tsx`, both scoped with `within(...)` on the Ships group (D6).
No production file outside `nodes.ts` needed a logic change, as D8
predicted. The suite went from 1151 to 1203 tests — the 52 new ones are
the already-parameterised suites now running at three charged, including
the long-run economy, which passed at three with no retuning.

Widen the offered counts, and update the tests that name them by hand so the
suite stays green.

In `src/rules/nodes.ts`:

- `ChargedNodeCount` becomes `3 | 4 | 5`.
- `CHARGED_NODE_COUNTS` becomes `[5, 4, 3]` (D4). Its comment already says
  largest first, leftmost the default; leave it.
- `DEFAULT_CHARGED_NODE_COUNT` stays `5` (S2).
- `dealOpeningBoard`'s doc comment gains the third count: **six** nodes at
  three charged, and `chargedNodeCount + 4` seed steps — nine at five, eight
  at four, **seven** at three (S5).

In `src/rules/gameState.ts`: check the doc comment on
`startingGameState` that spells out the seed-step count ("nine at five
charged, eight at four") and extend it the same way. No logic there changes;
the validation already tests against the array (D8).

Then the tests that assert the old pair — a planning run of the full suite
found **exactly these five failures**, and no others:

- `src/rules/nodes.test.ts` — the array equals `[5, 4]` (becomes
  `[5, 4, 3]`), and `isChargedNodeCount` **rejects 3** (3 moves to the
  accepted list; the rejected list keeps its non-counts, e.g. 2, 6, 0, 4.5,
  NaN).
- `src/rules/gameState.test.ts` — `startingGameState` **throws a RangeError
  for a charged-node count of 3** (3 leaves that list; keep an out-of-list
  whole number such as 2 or 6 in it, plus the non-integer cases).
- `src/start/StartScreen.test.tsx` — "calls the ships change handler … when
  3 is chosen" queries `screen.getByRole("radio", { name: "3" })` and now
  matches two radios. Scope it with `within(screen.getByRole("group", { name:
"Ships" }))`, matching the style its neighbours already use (D6).
- `src/App.test.tsx` — "pressing PLAY after choosing 3 ships deals a
  three-a-side game" has the same ambiguity and takes the same fix (D6).

Everything parameterised over `CHARGED_NODE_COUNTS` — `nodes.test.ts`'s
opening-deal block, `openingBoard.test.ts`, `fullGame.test.ts`,
`nodePool.test.ts` — starts exercising three by itself in this step. That is
intended: the step's verification is that they all pass at three with no
retuning.

Depends on: Step 1 (the document that authorises the third count) and
Step 2 (the sound total-node floor).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green. In particular the
long-run suites (`nodePool.test.ts`, `openingBoard.test.ts`,
`fullGame.test.ts`) now run a third pass at three charged and must pass with
their bounds unchanged from Step 2, and `src/rules/seededReplay.test.ts`
must pass with its recorded expectations untouched (S2) — if it goes red,
the default was disturbed and the step is wrong. Record in Notes whether any
production file beyond `nodes.ts` and the two doc comments named above
needed a change, and what it was (D8), and note the suite's runtime if the
third long-run pass makes it noticeably slower than before.

---

### Step 4 — Rules-layer coverage at three charged

Status: committed

Notes: Done inline by the orchestrator. `gameState.test.ts` gained a case
asserting a count of three deals six nodes — three charged, three
inactive, none depleted — and `charging.test.ts` gained two: nothing
charges when three are already charged, and the shortfall is measured
against three. `nodes.test.ts`, `openingBoard.test.ts` and
`fullGame.test.ts` needed **nothing**: all three already reach every
offered count through `describe.each(CHARGED_NODE_COUNTS)` (two such
blocks each in `openingBoard.test.ts` and `fullGame.test.ts`). Suite
1203 → 1206, the three cases added. No `src/` production change.

Add the coverage that proves the rules layer treats three as a first-class
count, rather than merely not crashing on it.

- `src/rules/gameState.test.ts` — `startingGameState` accepts a
  `chargedNodeCount` of **3**, records it on the state, and deals **six**
  nodes: three charged, three inactive, none depleted (S5). Mirror the shape
  of the existing "takes a given charged-node count …" test rather than
  inventing a new one, and keep the existing default-is-five assertions
  intact.
- `src/rules/charging.test.ts` — this file builds states by hand and names
  counts in its cases (it has "charges nothing when four are already
  charged" and "… when five are already charged"). Add the three-charged
  case: the end-of-turn shortfall is measured against three, and nothing
  charges when three are already charged.
- Read `src/rules/nodes.test.ts`, `src/rules/openingBoard.test.ts` and
  `src/rules/fullGame.test.ts` and confirm each already reaches three
  through `describe.each(CHARGED_NODE_COUNTS)` or an equivalent loop. Where
  one of them enumerates counts by hand instead, enumerate three too. Note
  in the step's Notes which files needed nothing.

Nothing in `src/` changes in this step; it is test coverage only.

Depends on: Step 3 (a count the rules layer accepts).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green, with the new
three-charged cases present and passing. Confirm the test count rose by the
cases added.

---

### Step 5 — The chosen 3 reaches the game, end to end

Status: committed

Notes: Done inline by the orchestrator. Five new cases plus two
extensions: `StartScreen.test.tsx` asserts the group's values in order
(`["5", "4", "3"]` — the existing tests looped over the array and would
have passed on membership alone) and that choosing 3 calls only
`onChargedNodeCountChange`, with 3; `useAppScreen.test.tsx` carries 3
into the `new-game` intent and keeps it across a return to start;
`session.test.ts` deals a three-charged board from an intent carrying 3;
`App.test.tsx` presses PLAY on 3 and counts three charged gridcells;
`ScoreDisplay.test.tsx`'s pip-row test gained six-ships-three-nodes and
three-ships-three-nodes, both three pips. **No production change was
needed anywhere**, as D8 predicted. Suite 1206 → 1211.

Prove the whole path from the start screen to a three-charged board, in
tests. Expect **no production change** (D8); if one is needed, make it and
say so in Notes.

- `src/start/StartScreen.test.tsx` — the Charged nodes group offers **5, 4
  and 3, in that order**, with **5 checked** by default (the existing
  "renders the charged nodes group …" tests loop over
  `CHARGED_NODE_COUNTS`, so check they still assert order and not just
  membership; add an explicit order assertion if they do not). Choosing 3
  calls `onChargedNodeCountChange` exactly once with **3** and calls no other
  handler — the sibling test for 4 shows the shape. Keep the four groups in
  the order Ships, Charged nodes, Rounds, Clock.
- `src/useAppScreen.test.tsx` — setting the charged-node count to 3 and
  pressing play dispatches a `new-game` intent carrying
  `chargedNodeCount: 3`, and returning to the start screen leaves 3 selected
  (the existing "returning to start … changes none of the options" test is
  the model).
- `src/game/session.test.ts` — a `new-game` intent carrying 3 produces a
  session whose state has `chargedNodeCount: 3` and three charged nodes.
- `src/App.test.tsx` — pressing PLAY after choosing 3 in the **Charged
  nodes** group shows a board with three charged nodes; scope every radio
  query to its group (D6). The existing four-charged test is the model.
- `src/hud/ScoreDisplay.test.tsx` — a side draws **three** pips at three
  charged whatever the fleet size (add three-charged cases to the existing
  "draws a row as long as the smaller of …" test), none lit when the side
  holds none (S6).

Depends on: Step 3 (the widened count) and Step 4 (the rules layer proven at
three).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green, with the new cases
present and passing.

---

### Step 6 — The Quick Guide's stale sentence

Status: pending

In `src/guide/guideCopy.ts`, replace the NODE LIFECYCLE paragraph's first
sentence, "There are always four charged nodes.", with the corrected one —
recommended wording in D7: "The board always has the number of charged nodes
chosen at the start: five, four or three." Leave the rest of that paragraph
exactly as it is (S10, D7) and leave every other section alone. Update the
matching assertion in `src/guide/guideCopy.test.ts` so it asserts the
paragraph exactly as shipped.

Depends on: Step 1 (the document the sentence now agrees with). It is
independent of Steps 3–5, but is placed after them so the player-facing copy
lands once the option it describes actually exists.

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green, with
`guideCopy.test.ts` asserting the new sentence. Confirm by grep that the
string "always four charged nodes" no longer appears anywhere under `src/`.

---

### Step 7 — The economy measured at three, and the test's comments re-stated

Status: pending

Take the measurements Appendix B needs at **three charged**, from
`src/rules/nodePool.test.ts` — the app's only long-run instrument — and
bring that file's tuned-constant comments up to date at all three counts.

- Measure, with **temporary** instrumentation on that file (log and remove;
  nothing temporary is committed, and no script is added to the repo — S9),
  over its own `SEEDS` and `PLIES_TO_RUN`, at three charged:
  - the board's total node count: minimum, maximum and mean;
  - the three refill draws' pool sizes (the file's "spread the weighting
    buys" test already builds exactly those pools for its unweighted
    comparison, so instrument there rather than recomputing them);
  - the weighted and unweighted mean smallest pairwise gap, and the number
    of refills the figures are pooled over;
  - the mean plies between refills;
  - whether §3.2's fallback ever fired — the minimum pool size at any draw
    answers this without separate instrumentation, since the fallback only
    fires on an empty pool.
- **Record every number in this step's Notes.** Step 8 is written from them
  and must not invent any.
- Re-state the comments on `MINIMUM_MEAN_REFILL_GAP`,
  `MINIMUM_SPREAD_ADVANTAGE`, `MINIMUM_MEAN_PLIES_BETWEEN_REFILLS` /
  `MAXIMUM_MEAN_PLIES_BETWEEN_REFILLS` and `MAXIMUM_TOTAL_NODES` so each
  names the figure measured at **each** of the three counts, keeping the
  margin philosophy the current comments describe. Say explicitly that the
  refill cadence at three charged sits nearest the band's ceiling, and why
  (fewer charged nodes for the file's stand-in driver to count down).
- Also update the file's **header** comment, which says the run happens "at
  **both** offered charged-node counts", and the tuned-constant comments
  that contrast "five charged" with "four".
- **Do not re-tune a bound unless a measurement is actually outside it**
  (S4, D3). A planning run found all four bounds clear at three; if yours
  does not, widen the bound with its measured figure and the reason recorded
  in the comment, and if the miss is large, escalate rather than fitting.

Depends on: Step 3 (the test running at three charged) and Step 2 (its sound
floor).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green, with no temporary
instrumentation left in the tree (`git diff` shows comment and, if needed,
bound changes only). The step is **not done** until every measured figure
listed above is written into its Notes.

---

### Step 8 — Appendix B re-stated at three (same 0.31, no second bump)

Status: pending

Extend Appendix B in `doc/ruleset/rules.md` with the figures Step 7
recorded. **Same version, same changelog entry**: extend the 0.31 entry in
place if it needs a line about the re-measurement, and do **not** bump the
version again or add a second entry (S7, D5).

- Every figure Appendix B quotes that varies with the count now states three
  as well: the node count's range and mean, the mean turns between refills,
  the three refill pool sizes, and the trio's mean smallest gap weighted
  against unweighted.
- **No figure may be left claiming a number the board no longer produces,
  and none may be invented.** Anything Step 7 could not read off the test is
  re-stated as the approximation it is, naming the counts it was measured at.
- The **edge and corner** figures stay flagged as measured **at four charged
  only**, exactly as written; they do not grow a third caveat
  (`story.md`, In scope).
- The paragraph explaining that these figures are a **ceiling**, produced by
  a stand-in driver that starts a countdown every turn, stays and still
  applies at all three counts.
- The fallback paragraph and "What the app guards" say the guards ran and
  the fallback never fired at **all three** counts.
- The **"never short"** and **queue-sizing** arguments were made three-way in
  Step 1; re-read them and leave them alone if they still read true.

Depends on: Step 7 (the measurements) and Step 1 (the rest of the appendix's
prose).

Verification (automated): Run `npm test` (`rulesVersion.test.ts` still agrees
at 0.31) and `npm run format:check`. Then confirm by reading that every
figure in Appendix B either appears in Step 7's Notes or is explicitly
labelled as an approximation measured at a named count, and confirm by grep
that `doc/ruleset/changelog.md` has exactly one `## 0.31` heading.

---

### Step 9 — The owner plays a three-node game

Status: pending

The owner runs the app (`npm run dev` in the dev container) and plays. This
is the story's gate: the plan pauses here.

Checks, from `story.md`'s Verification list plus the manual check its Notes
asks for:

1. The start screen's **Charged nodes** group reads **5 4 3**, in that
   order, with **5** checked, and the four groups are still in the order
   Ships, Charged nodes, Rounds, Clock. Nothing is re-sized or re-spaced by
   the third radio.
2. Choosing **3** and pressing PLAY deals **six** nodes: three charged, none
   of them carrying a countdown, and three waiting nodes showing one, two
   and three rings. Nothing looks depleted at the start.
3. Playing on, the board comes back to **three** charged by the end of every
   turn and never shows more than three, and there are always exactly three
   waiting nodes.
4. A side standing on three charged nodes collects **three** energy for that
   turn and shows **three** pips — and the pip row is three at **six** ships
   a side as well as three.
5. **Play a three-node, six-ship game** through enough turns to judge it:
   does the board play as tight as the story reads — constant contact, a
   node rarely left unclaimed? This is the judgement the option exists to
   support; note the impression even if nothing is wrong.
6. Returning to the start screen after a three-node game leaves **3**
   selected, and the other three choices as they were.
7. The **default game is unchanged**: starting with the defaults still deals
   five charged and three waiting.
8. The Quick Guide's NODE LIFECYCLE paragraph no longer says the board
   always has four charged nodes.

Depends on: Steps 3, 5 and 6 (the option, its path through the app, and the
guide copy).

Verification (manual): The owner performs points 1–8 and confirms, or names
what is wrong. Anything wrong is fixed in this step and re-checked, unless it
turns out to be a rules question, which goes back to the owner.

---

### Step 10 — `README.md` and the final sweep

Status: pending

Bring `README.md` up to date and make the story's last read-through.

- Run the `/update-readme` command, which reviews the branch diff and
  updates `README.md` where warranted.
- Whatever that produces, these two sentences must end up describing three
  as a choice, in the README's player voice ("lit", not "charged"):
  - the options sentence — "a choice of how many nodes are lit at once (five
    or four, five to start)" becomes the three-way list, five still to
    start;
  - the opening-board sentence — "it opens with five lit nodes, or four if
    you chose four, and three still waiting — eight nodes in all, or seven
    at four" becomes the three-way version, six nodes in all at three.
- Read the branch's diff once more for prose that still says "five or four":
  `src/` comments, the two doc comments Step 3 touched, `rules.md`, the
  changelog, `README.md`.
- Confirm nothing was knowingly given up that belongs in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`; none is
  expected (D6, S9). If `story.md` ended up describing something differently
  from what was built, correct `story.md` in place.

Depends on: every previous step.

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green. Then confirm by grep
that no file in `README.md`, `doc/ruleset/` or `src/` offers the count as
"five or four", and that `doc/ruleset/changelog.md` still has exactly one
`## 0.31` entry.
