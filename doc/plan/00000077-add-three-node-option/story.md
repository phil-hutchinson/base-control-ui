# Story 00000077 — A three-node game

## Summary

The charged-node count became a choice in version 0.30 — **five or four**,
five the standard game. This story adds a third choice, **three**, placed
**last** in the group so the start screen reads **5 4 3**. Five stays the
default and the standard game; nothing about the five- or four-node game
changes.

This is a small story. The count is already a property of the game state,
already dealt against, already charged against, already validated and
already rendered from an array — so the code change is mostly a widened
type and a third entry. What is not automatic is the rules document and the
long-run economy test, both of which currently state their numbers at "five
or four" and have one bound fitted to a board that never carries fewer than
seven nodes.

## What changes

- **Three joins the offered counts**, last: `5`, `4`, `3`. Five remains the
  default everywhere a default is reached for, so the standard game is
  untouched.
- **A three-node game deals six nodes** — three charged at baseline with no
  countdown, three inactive at priorities 1, 2 and 3, nothing depleted —
  and the deal consumes **seven** seed steps (3 + 4).
- **The board fills towards three**, by the same end-of-turn shortfall from
  the same three inactive nodes.
- **A side's pip row is three** at three charged, whatever the fleet size,
  because it is already the smaller of the fleet size and the charged
  count. No display rule changes.

## What does not change

- **Three inactive nodes**, always, at every count. Appendix B's argument
  for the queue's size never mentioned the target: at most one countdown
  starts per turn, so at most one node expires, plus at most one a player
  walks off — a shortfall of never more than two, which three inactive
  nodes cover whether the board fills towards five, four or three.
- **Where a node may appear** (§3.2), **how long it lives** (§8.3), and
  **energy** (§8.4): one per charged node held. A player standing on all
  three collects three.
- **Fleet size, rounds, the clock, movement, combat, power, planets, the
  trap and its relief.** None of them consult this number.
- **The default game.** Five charged, and therefore the same opening deal
  from a given seed as before — `seededReplay.test.ts`'s recorded
  expectations are untouched, because the default's seed-step count is
  unchanged.
- **The start screen's layout and styling.** A third radio joins a group
  that already renders from an array; nothing is re-sized or re-spaced.

## Effect on the game

Three lit nodes on a board of three to six ships a side is the tightest
game the options can produce: at six a side, a fleet can hold every node on
the board and still have ships spare to fight with, so contact should be
constant and a node rarely sits unclaimed. The pools a refill draws from
widen slightly, since two fewer squares and their neighbours are blocked at
any moment, and the node count Appendix B watches breathes lower. Whether
that makes a better game or a scrappier one is what the option exists to
find out. Nothing else is retuned against it.

## In scope

### 1. The rules edit, first and on its own

`doc/ruleset/rules.md` goes from **0.30** to **0.31**, with a changelog
entry, in its own commit ahead of the code. This is a gameplay change (a
legal choice that did not exist before), so it would be a tag candidate;
tagging stays on hold (`CLAUDE.md`).

Every place the document says "five or four" becomes the three-way choice,
phrased the way §8.1 already phrases it:

- **§2, the Node entry** — the chosen number, five, four or three.
- **§8.1** — where the choice is defined: five, four or three, five the
  standard game. The opening board is **eight** nodes at five, **seven** at
  four, **six** at three.
- **§8.2** — the shortfall wording is already against the chosen number; the
  sentence saying the queue's size is unrelated to the target names the
  counts and must name three too.
- **§8.3, §8.4, §8.6 step 4, §9, §10** — already phrased against the chosen
  number; check each and correct only what names the two counts.
- **Appendix B** — the counts it names become three, and its **measured**
  figures are extended: the node-count range and mean, the mean turns
  between refills, the refill pool sizes, and the trio's mean smallest gap
  against an unweighted draw, all **re-measured at three charged** from the
  app's own long-run test. **No figure may be left claiming a number the
  board no longer produces, and none may be invented** — a figure that
  cannot be read off the existing test is re-stated as the approximation it
  is. The edge and corner figures are already flagged as measured at four
  charged only; that flag stands as written rather than growing a third
  caveat.

### 2. The count itself

- `nodes.ts`: `ChargedNodeCount` becomes `3 | 4 | 5`, `CHARGED_NODE_COUNTS`
  becomes `[5, 4, 3]`. `DEFAULT_CHARGED_NODE_COUNT` stays **5**. The
  comment on the array — largest first, leftmost the default — still holds
  and needs no rewrite.
- `dealOpeningBoard`'s doc comment gains the third count: six nodes, seven
  seed steps.
- `gameState.ts`, `session.ts`, `useAppScreen.ts`, `StartScreen.tsx`,
  `ScoreDisplay.tsx` all derive from the type or the array and are expected
  to need **no change at all**. Anything that turns out to need one is
  worth a note in the plan: it means a count was hard-coded somewhere the
  0.30 story missed.

### 3. What the player sees

- **The Charged nodes group offers `5 4 3`**, in that order, with 5 checked
  at first, rendered by the same `OptionChoice` as the rest.
- **The Quick Guide's NODE LIFECYCLE paragraph is corrected.** It reads
  "There are always four charged nodes", which has been wrong since 0.30
  and gets wronger here. It becomes the chosen number, in the guide's plain
  voice — the guide is a first read, not a rules reference, so one short
  sentence, not an explanation of the option.
- **`README.md`** describes three as a choice: the fleet-size sentence's
  companion ("five or four, five to start") and the opening-board sentence
  ("eight nodes in all, or seven at four"). Run `/update-readme` for the
  rest of the diff.

### 4. The tests

The suite is already parameterised over `CHARGED_NODE_COUNTS`, so most of
it picks three up by itself. What needs attention:

- **`nodePool.test.ts`** — `describe.each` now runs a third count.
  `MINIMUM_TOTAL_NODES` is **7**, which a three-charged board breaks by
  construction (three charged plus three inactive is six), so the bounds
  must be widened or made per-count; the plan chooses which. The refill
  band and the spread floors are re-checked at three and retuned only if
  one of them was fitted to a busier board. This test is also where
  Appendix B's re-measured figures are read off.
- **`nodes.test.ts`, `charging.test.ts`, `openingBoard.test.ts`,
  `fullGame.test.ts`** — must pass at three as well as five and four; where
  they enumerate the counts by hand, they enumerate three too.
- **`gameState.test.ts`** — 3 is accepted, the default is still 5, and an
  off-list count still throws.
- **`StartScreen.test.tsx`** — the group offers 5, 4 and 3 in that order,
  with 5 checked by default, and choosing 3 calls the handler with 3.
- **`useAppScreen.test.tsx`, `session.test.ts`, `App.test.tsx`** — a chosen
  3 reaches `new-game` and produces a three-charged game.
- **`ScoreDisplay.test.tsx`** — three pips at three charged whatever the
  fleet size.
- **`guideCopy.test.ts`** — the corrected NODE LIFECYCLE wording.

Per `CLAUDE.md`'s pre-release stance: no plan steps for testing
accessibility, no review fixtures, no manual test scripts. Anything
knowingly lost goes in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Out of scope

- **Any count other than five, four and three.** Two, six and a free number
  are not offered, and nothing is built to make them easy later.
- **Changing the default.** Five stays the standard game.
- **Re-tuning anything against three charged**: countdown lengths, the
  weighting, the pool constraints, the game lengths and the fleet sizes all
  keep their values. Appendix B is re-measured, not re-fitted.
- **Growing or shrinking the inactive queue.** Three inactive stays three.
- **Re-scaling the pips or the info column** for a shorter row, or drawing
  anything in the space it leaves — a row of three is three pips and
  nothing else.
- **A rewrite of the Quick Guide.** One stale sentence is corrected.
- **Backwards compatibility** for games recorded under 0.30 (`CLAUDE.md`).

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.31**, and the changelog has
  one entry for it.
- No section of `rules.md` offers only five or four; every mention of the
  count offers all three, and no Appendix B figure states a number the
  board no longer produces.
- The start screen's Charged nodes group reads **5 4 3**, with 5 checked,
  and the four groups are still in the order Ships, Charged nodes, Rounds,
  Clock.
- Starting a game with 3 deals **six** nodes — three charged at baseline,
  three inactive at priorities 1, 2 and 3, nothing depleted — and every
  square is legal under §3.2.
- The board returns to three by the end of every turn over a long run,
  whatever the seed, and is never charged above it; the queue is always
  exactly three inactive nodes carrying 1, 2 and 3.
- A side standing on three charged nodes collects three energy in a turn,
  and draws three pips at any fleet size.
- Returning to the start screen after a three-node game leaves 3 selected.
- The default game is unchanged: the same seed deals the same board it did
  at 0.30, and `seededReplay.test.ts` passes with its expectations as
  recorded.
- The Quick Guide no longer says the board always has four charged nodes.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- The rules edit is one commit, ahead of the code, and there is **one**
  version bump on this branch however many later rules edits it needs.
- Manual check worth making once it runs: a three-node, six-ship game, to
  see whether the board plays as tight as it reads.
