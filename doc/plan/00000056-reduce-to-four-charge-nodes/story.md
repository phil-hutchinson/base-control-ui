# Story 00000056 — Four charged nodes

## Summary

The board aims to keep **five** nodes charged, and section 8.4's table is
priced to match: five held nodes pay 15, and a side standing on five or more
depleted nodes pays 15 back. This story takes the target down to **four**,
at the opening deal and for every charge draw thereafter, and takes both
ends of the table down with it: **10 is the most a turn can pay, and 10 is
the most a turn can cost.**

Nothing else about a node changes. It is born, waits inactive, is charged,
drains, goes depleted, recovers and retires exactly as it does today, at the
same capacity, the same drain and recovery tables, and the same fifteen
nodes on the board at all times. Only the number of them lit at once moves.

What changes:

- **The board aims to keep four nodes charged**, not five (§2, §8.1, §8.2,
  §8.6 step 4).
- **The opening deal is four charged and eleven inactive**, not five and
  ten. Nothing starts depleted, as now.
- **The energy table stops at four.** The `5 → 15` row is deleted, so the
  most a side collects in a turn is the 10 it gets for holding all four.
- **The depleted penalty is capped at four**, not five, so five, six or
  seven depleted nodes all cost the same 10. The symmetry section 8.4
  claims — the most a turn can cost equals the most it can pay — is
  preserved at the new number rather than broken.
- **The score pips become four per row**, both rows, at their current size.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version
0.20**. This story takes it to **0.21** — a gameplay change, so it earns a
changelog entry and a version bump (tagging remains on hold, per
`CLAUDE.md`).

Planning documents say **ply** for the rules' and the UI's **turn**
(`CLAUDE.md`, Vocabulary).

What exists today:

- **`src/rules/nodes.ts`** — `TARGET_CHARGED_NODES` (5), `NODE_COUNT` (15),
  and `dealOpeningBoard`, whose documented draw order deals
  `TARGET_CHARGED_NODES` charged squares, then
  `NODE_COUNT - TARGET_CHARGED_NODES` inactive ones, then one level for each
  of the fifteen in board order.
- **`src/rules/chargeDraw.ts`** — the pressure-weighted draw, which already
  computes its own shortfall from `TARGET_CHARGED_NODES` and already stops
  short when the inactive pool empties.
- **`src/rules/energy.ts`** — `ENERGY_BY_NODES_HELD` (`[0, 1, 3, 6, 10, 15]`)
  and `MAX_DEPLETED_NODES_PRICED`, which is derived from the table's length
  rather than written down separately.
- **`src/hud/ScoreDisplay.tsx`** — a local `NODES_IN_PLAY = 5` for the
  charged pip row, and `MAX_DEPLETED_NODES_PRICED` for the depleted row.
- **`src/board/announcements.ts`** — `energyPenaltyClause`, which says
  "…, five of which are penalised" in words when a side is over the cap.
- **`src/App.css`** — a sizing comment naming the five-pip row as the widest
  thing in the info column.
- **`README.md`** — describes an opening board with five lit nodes and a
  board kept topped up to five.

### The two things that follow from the number, and are not bookkeeping

**The pool arithmetic changes shape (Appendix B).** With fifteen nodes and
four charged: a node lives about 20 turns charged and about 10 depleted, so
the average inactive wait goes from about 30 turns to about **45**, and the
steady state from roughly 5 charged / 2½ depleted / 7½ inactive to roughly
**4 charged / 2 depleted / 9 inactive**. A node now charges about every
**five** turns rather than every four.

Two consequences worth writing into Appendix B rather than leaving implicit:

- **Running short of the target becomes uncommon again.** Section 8.2 and
  Appendix B currently say a shortfall is "the likelier case rather than an
  edge case", because the fifteen-node pool was thin against a target of
  five. Against a target of four, with about nine nodes inactive at any
  moment, it is not. Those sentences must be re-stated honestly, not
  renumbered — the fallback stays legal and stays implemented, but the
  rules should stop advertising it as the common case.
- **The pressure cap now sits at about the average wait.** The cap is 50
  against a wait that was 30; it is now 50 against a wait of about 45, so a
  larger share of the inactive pool will be sitting at or near the cap,
  which flattens the weighting back towards uniform at the top end. This is
  a number to play-test, not to retune in this story — but Appendix B's
  "what to check first" paragraph should name it.

**Nothing about the node pool itself is changed.** Fifteen nodes stays
fifteen. Shrinking the pool to keep the old inactive-to-charged ratio is a
separate retune with its own play-testing, and this story does not make it.

## In scope

### 1. The rules edit, first and on its own

Version 0.20 → 0.21, with a changelog entry, in its own commit ahead of the
code.

**§2 — the Node entry.** "The board aims to keep five nodes charged at any
moment, though it may fall short" → four.

**§8.1 — the aim and the deal.** The board aims to keep **four** charged.
The opening board is still fifteen nodes, now **four charged** and **eleven
inactive**; "each of the five starts part-drained" and "the five now open at
different ages" become four. Nothing starts depleted, unchanged. Both
opening tables are unchanged.

**§8.2 — the charge draw.** Back to four, in both the opening sentence and
the shortfall sentence, with the shortfall sentence re-stated per the
section above: charging fewer than the target remains legal and remains
implemented, but is no longer described as the likelier case.

**§8.4 — the table, both ways round.** The `5 → 15` row is deleted, leaving
`0, 1, 3, 6, 10`. The paragraph beneath it is rewritten around the new
numbers: up to **eleven** of the fifteen nodes can be depleted at once,
since at most four are ever charged; the depleted count is **capped at
four** before it is priced, so five, six or seven depleted nodes cost the
same 10 that four do; and the most a turn can pay and the most it can cost
are both **10**. The worked netting example (three charged for 6, two
depleted for 3, net +3) is unaffected and stays as it is.

**§8.6 step 4** — back to four.

**Appendix B** — rewritten around four charged: the arithmetic above, the
larger inactive pool, the honest statement of how often a shortfall now
happens, and the pressure cap against a ~45-turn average wait as the first
thing to check when these numbers are retuned. The counts stay first
guesses to be play-tested.

### 2. The constants

- `TARGET_CHARGED_NODES` 5 → 4. `chargeDraw.ts` needs no change: it reads
  the constant and computes its own shortfall.
- `ENERGY_BY_NODES_HELD` loses its last entry. `MAX_DEPLETED_NODES_PRICED`
  is derived from the table's length, so it becomes 4 without being edited
  — the derivation is the reason the two ends of §8.4 cannot drift apart,
  and it should stay derived.
- `energyForNodesHeld`'s `RangeError` bound moves from 5 to 4 by the same
  derivation. That is correct: the board never charges a fifth node, so a
  fifth held node is a caller bug exactly as a sixth was.
- `energyForDepletedNodes` keeps its `MAX_SHIPS_PER_SIDE` guard, which
  bounds what is genuinely impossible rather than what is merely capped.
- `dealOpeningBoard`'s doc comment: four charged, eleven inactive. The draw
  order and its shape are unchanged, and the deal still takes 30 seed steps
  — 4 + 11 + 15 — but the fifth square drawn is now an inactive node whose
  level comes from the pressure table, so a given seed deals a different
  board than it did.

### 3. What the player sees

- **The pip rows become four wide**, both of them, at their current size and
  spacing — the owner's judgement is that the pips are already a good size,
  so nothing here is re-scaled to fill the space the fifth pip leaves.
- **`ScoreDisplay.tsx`'s local `NODES_IN_PLAY = 5` is deleted** and the
  charged row is sized from `TARGET_CHARGED_NODES` instead. It is the one
  literal in the codebase that restates the target rather than deriving it,
  and this story is the reason to remove it: the next retune should be one
  edit, not two.
- **`SCORE_DIGITS` stays at 4**, but its comment is now wrong: the ceiling
  is 10 a turn, so the longest game (90 rounds) tops out around 900. Four
  digits stays for the arcade readout's fixed width, for that reason rather
  than the old one.
- **`announcements.ts`** says "four of which are penalised", derived from
  `MAX_DEPLETED_NODES_PRICED` rather than spelled into the sentence, so the
  wording cannot drift from the cap it describes.
- **`App.css`'s sizing comment** no longer holds: a four-pip row draws about
  `0.61P` rather than `0.77P`, so the widest thing in the info column
  becomes the title and the turn indicator's longest wording, at roughly
  `0.72P` each. The comment is corrected. **`--region-extent` itself is not
  re-derived** — the column got narrower content, not wider, so no layout
  breaks; taking `P` down to match is a visual retune and belongs to a
  visual story.
- **`README.md`** describes four lit nodes at the deal and a board topped up
  to four, in the player's words. Run `/update-readme` for the rest of the
  diff.

Per the accessibility section of `CLAUDE.md`, existing automated tests are
updated where the path is straightforward and no plan step is added for
testing accessibility. Nothing in this change is expected to cost an
accessible behaviour — the score sentence is generated from the same counts
and stays true — but if the plan finds one, it is recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather than
paid.

### 4. The tests

Most of the suite derives from the constants and needs nothing. The ones
that do not:

- **`nodes.test.ts`** — `expect(TARGET_CHARGED_NODES).toBe(5)` → 4; the deal
  is four charged and eleven inactive.
- **`energy.test.ts`** — the table cases lose the `[5, 15]` rows; "throws
  for a count above five" becomes above four; the clamp cases assert that
  five, six and seven depleted nodes all price at 10.
- **`ScoreDisplay.test.tsx`** — four pips in each row, and the tests that
  name "five pips" renamed with them.
- **`announcements.test.ts`** — the over-cap penalty sentence says four.
- **`nodePool.test.ts`** — derives from `TARGET_CHARGED_NODES` throughout,
  including `MAXIMUM_EXPIRIES_IN_ONE_PLY`, so it should need no edit; the
  long-run guards (the pool stays populated, expiries stay spread, no node
  waits unboundedly to be charged) must still pass with a target of four,
  and if a threshold in them was tuned against five it is retuned here.
- **`openingBoard.test.ts`**, **`fullGame.test.ts`** — must still run to
  completion with the new target.
- **`seededReplay.test.ts`** — recorded expectations are **regenerated**,
  not worked around. The property guarded — the same seed produces the same
  game — is exactly as true afterwards; only the numbers move.
- **`rulesVersion.test.ts`** — holds `RULES_VERSION` at 0.21.

## Out of scope

- **Changing the node pool.** Fifteen nodes stays fifteen; the inactive pool
  simply gets larger. Re-sizing it against the new target is a later retune.
- **Retuning any other number.** `NODE_CAPACITY` (60), `PRESSURE_CAP` (50),
  the five weighted tables and the opening deal's two tables are untouched,
  including where this story's arithmetic makes one of them worth a look
  (the pressure cap against the longer wait). Appendix B is written to be
  checked later, not defended now.
- **Re-shaping the energy curve.** `0, 1, 3, 6, 10` is the existing curve
  truncated, not a new one. Whether four charged nodes should pay a
  different shape is a balance question for play-testing.
- **Re-scaling the pips or the info column** now that the rows are narrower.
  The pips keep their size; `--region-extent` keeps its value.
- **Anything about combat, movement, power, the clock, fleet size, the
  number of rounds, or where a node may appear.**
- **A migration path for games recorded under 0.20.** There is no backwards
  compatibility (`CLAUDE.md`).

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.21, and the changelog has an
  entry. No section of `rules.md` still says the board aims for five charged
  nodes, and §8.4's table ends at four.
- A dealt board has fifteen nodes: four charged, eleven inactive, none
  depleted.
- The charge draw tops the board up to four and never above it, over a
  long run and whatever the seed.
- The charge draw still runs short — legally, without error — when no
  inactive node is available, and recovers to four once one appears.
- `energyForNodesHeld` prices 0–4 as 0, 1, 3, 6, 10, and throws for 5.
- `energyForDepletedNodes` prices 0–4 the same way and prices 5, 6 and 7 all
  at 10, without throwing.
- A turn's largest possible collection and its largest possible penalty are
  both 10.
- Each score cell draws four charged pips and four depleted pips, lit and on
  by the counts as before, and the charged row's length comes from
  `TARGET_CHARGED_NODES`.
- The over-cap penalty announcement says four, and says it from the constant.
- The same opening seed and the same sequence of actions produce the same
  game every time, with `seededReplay.test.ts`'s expectations regenerated.
- `fullGame.test.ts`, `openingBoard.test.ts` and `nodePool.test.ts` pass.
- `README.md` describes four lit nodes and no longer describes five.
