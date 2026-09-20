# Story 00000091 — Nodes reach the edge

## Summary

The outer edge of the board is dead space. Planets sit one or more squares
in and the fighting has moved inward with them, so rows 1 and 15 and
columns A and O are used for nothing except a rotator, when that option is
on (section 3.3). Meanwhile ships move further than they used to, so a
corner of the board is reachable now in a way it was not when the edge was
closed — at a fuel cost the player pays to get there.

This story opens the outer edge to **one** of a refill's three inactive
nodes.

Today a refill draws from a pool that widens once, **after the first
draw**: the first square uses all six of section 3.2's constraints, and the
second and third lift constraint 4 — "not one square in from the outer
edge" — while constraint 3, the outer edge itself, stays closed to every
ordinary draw.

After this story the pool widens once, **after the second draw**, and the
widening lifts constraints 3 and 4 **together**:

- the **first and second** squares are drawn from the strict pool, all six
  constraints, the 11 × 11 interior C3–M13;
- the **third** square is drawn from a pool with both edge constraints
  gone — the whole board, less planets, their neighbours, the squares
  already taken and their neighbours.

So a refilled trio has two nodes in the interior and one that may be
anywhere, including A1.

## What changes

- **The widening moves one draw later**: draws 1 and 2 are strict, draw 3
  is open. Draw 2 loses access to the one-square-in ring it has today.
- **The widened pool becomes the whole board.** Both edge constraints come
  off at once, instead of constraint 4 alone. On an empty board it grows
  from 79 squares to about **117**, of which about 38 are on the outer edge
  itself. The exact number is asserted by a test and `rules.md` states what
  the test asserts.
- **Section 3.2 stops promising the outer edge is closed.** The sentence
  "Constraint 3 is never lifted for these ordinary draws" becomes false and
  goes.
- **A node can appear in a corner.** A1, A15, O1 and O15 are all legal for
  a third draw — none of them is adjacent to a planet.

## What does not change

- **The six constraints themselves**, their wording, or the strict pool
  they define. 51 legal squares on an empty board, exactly as now.
- **The opening deal's charged squares.** They are drawn from the strict pool,
  uniformly, exactly as before, and are unchanged for a given seed.
- **Owner decision at the plan gate: the opening deal's inactive trio now
  draws strict / strict / strict too**, a deliberate exception in section 8.1
  rather than a side effect of this story's change to the refill procedure —
  so the opening board stays entirely inside the interior C3–M13 and a game
  never opens with a node on the rim. The trio a given seed deals therefore
  does differ from before: the previous rules drew that trio strict /
  one-ring / one-ring, because the old widening came after the first draw, so
  going to all-strict tightens the second and third squares inward rather
  than loosening them. The opening board changes for a given seed; it does
  not stay put.
- **The seed.** A refill still consumes exactly four steps in the same
  order — three squares then the priority permutation — so no game gets
  longer or shorter in seed terms and `seededReplay.test.ts`'s
  same-seed-same-game guarantees hold as written.
- **The weighting formula**, the priority draw, the queue's size, rotation,
  charging, countdowns, energy, and the fallback — which already ignores
  pool width and already permits the edge.
- **Rotators** (section 3.3). They were never bound by section 3.2 and
  still are not.
- **Any start-screen option.** This is not a choice; it is how placement
  works now.

## Effect on the game

Simulated against the real weighting over 20,000 refills with four charged
nodes on an otherwise empty board — indicative only, not the measured
figures that go in the documents — the third node lands on the outer edge
about **61%** of the time, on the one-square-in ring about **26%**, and in
the interior about **13%**. It spreads along the edge rather than piling
into the corners: a literal corner about **10%** of third draws, which is
roughly what an even spread over the 38 edge squares would give.

That is a strong pull, and it is the weighting doing it rather than the
pool size — edge squares are the farthest from everything, so the formula
favours them the moment they are legal. It is worth knowing that a third
node will usually be on the rim, not occasionally.

The trade the option-1 shape buys is that the other two nodes stay in the
interior. A player always has two nodes worth contesting near the middle
and one that costs fuel to reach, so going for the far one is a decision
rather than the only game available. Drawing the second square from the
widened pool as well — the shape this story rejected — would have put two
of the three on the perimeter and hollowed the middle out.

## In scope

### 1. The rules edit, first and on its own

`doc/ruleset/rules.md` goes from **0.36** to **0.37**, with a changelog
entry, in its own commit ahead of the code. This is a gameplay change — a
square that could not hold a node now can — so it is a tag candidate;
tagging stays on hold (`CLAUDE.md`).

- **§3.2, the widening paragraph** is rewritten: the pool widens after the
  **second** draw, not the first; the widening lifts constraints **3 and
  4** together; the first two draws use all six. The claim that the outer
  edge stays closed however far the pool widens is deleted, not softened.
  The empty-board pool sizes become 51 and **the measured widened number**.
- **§3.2's other paragraphs** — the six constraints, the C3–M13 interior
  arithmetic, the fallback, the weighting formula — are left alone. Check
  each for a sentence that assumes the edge is closed and correct only what
  is now wrong.
- **§8.2, the refill procedure paragraph** names which pool each draw uses
  and must be corrected to the new split.
- **§8.1's opening deal** carries a second rules change, owner decision at
  the plan gate: its inactive trio draws strict / strict / strict, not the
  strict / strict / widened split the refill procedure now uses during play,
  so the board a game opens on stays entirely inside the interior C3–M13 and
  never carries a rim node before the first turn. This folds into the same
  0.37 bump and the same changelog entry as the rest of the rules edit — it
  is not a second version.
- **§3.3** says section 3.2's constraints do not apply to a rotator, which
  is still true; check the surrounding contrast still reads correctly now
  that a node can share the edge with one.
- Sweep the document for any other place that tells a player a node never
  appears on the edge.

### 2. The pool and the draw

- **`nodePlacement.ts`**: `WIDENED_EXCLUDED_EDGE_RINGS` goes from 1 to
  **0**. The doc comments on `NodePoolWidth`, both constants and
  `legalNodePool` describe the new meaning — `"widened"` now means the
  whole board, and constraint 3 is lifted with constraint 4, not kept.
  Keep the two names as they are; a rename is churn unless the implementer
  finds `"widened"` actively misleading, in which case the plan says so and
  renames it everywhere in one step.
- **`nodeQueue.ts`**: `refillQueue` draws the **second** square from the
  strict pool and only the **third** from the widened one. The module
  header's numbered list of the four seed steps says which pool each draw
  uses and must be corrected with the code, not after it.

### 3. The measured figures

`doc/ruleset/tech-notes.md` states per-draw pool sizes at each charged
count, and states that about **1.11** of a trio lands one square in from
the edge and **0.14** in a corner region, measured at four charged. The
third draw's pool changes completely, so:

- **Re-measure** the per-draw pool sizes and the edge and corner figures
  from the app's own long-run test, at the counts each figure is currently
  quoted at, and say which count they were measured at exactly as the
  document does now.
- **No figure may be left claiming a number the board no longer produces,
  and none may be invented.** The simulation numbers in this story's
  *Effect on the game* are context for the decision, not figures to copy in.
- The spread advantage over an unweighted draw is re-read off the same runs
  if the test reports it differently; it is not re-fitted.
- The fallback paragraph's claim that it has never fired is re-checked
  against the new pools — a wider pool makes it less likely, not more, but
  the sentence should be true as written.

### 4. The tests

- **`nodePlacement.test.ts`** — the widened pool's empty-board size changes
  from 79; assert the new number and keep the strict-superset check. The
  "contains a square one ring in from the edge" case stands, and gains a
  companion: the widened pool contains an outer-edge square the strict pool
  excludes (A8 is clear of every planet, and so is the corner A1), and the
  strict pool still excludes both.
- **`nodePool.test.ts`** — `requiredRings` for the widened pool becomes 0,
  and the long-run assertion that a refill's three squares come from the
  right pool follows the new split: strict, strict, open. The test named
  "...never the outer edge..." is now asserting the opposite for the third
  draw and needs its name and its body changed together. This is also where
  the re-measured figures for tech-notes are read off.
- **`nodeQueue.test.ts`** — the second square is drawn from the strict pool
  and the third from the widened one; the four seed steps are unchanged in
  count and order.
- **`seededReplay.test.ts`** — expected to pass unchanged: it compares runs
  against each other rather than against recorded squares, and the seed
  arithmetic does not move. If anything in it does need changing, that is
  worth a note in the plan, because it means a recorded literal is in there
  that this story did not expect.

Per `CLAUDE.md`'s pre-release stance: no plan steps for testing
accessibility, no review fixtures, no manual test scripts. Anything
knowingly lost goes in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Out of scope

- **Opening the edge to the first or second draw**, or to the opening
  deal's charged nodes. Two interior nodes per trio is the point of the
  shape chosen.
- **A third pool width.** The A/B/C ramp — strict, one-ring, open across
  the three draws — was considered and rejected: it puts two of three nodes
  on the perimeter.
- **Re-tuning the weighting** to hold the third node off the rim, or to
  push it there harder. The formula keeps its shape and its constant.
- **Making this a start-screen choice.**
- **Anything about rotators, planets or ship movement**, including whether
  the fuel cost of reaching a corner is the right one.
- **Board furniture, art or a UI hint** for a node on the edge. It draws
  the way every other node draws.
- **Backwards compatibility** for games recorded under 0.36 (`CLAUDE.md`).

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.37**, and the changelog has
  one entry for it.
- No part of `rules.md` states that a new node cannot appear on the outer
  edge, and §3.2 and §8.2 agree on which draw uses which pool.
- The strict pool is still exactly 51 squares on an empty board; the
  widened pool is the number the test asserts, contains every strict
  square, and contains A1, A8 and H1.
- Over a long run at every charged count, a refill's first two squares are
  legal under all six constraints, the third is legal under the four that
  remain, and the fallback never fires.
- A refill still consumes exactly four seed steps. A given seed's opening
  board keeps the same charged squares as before this change, but its
  inactive trio now differs, drawn strict / strict / strict instead of
  strict / one-ring / one-ring, so that every square the board opens on —
  charged and inactive alike — lies inside the interior.
- No figure in `tech-notes.md` states a number the board no longer
  produces, and each figure says which charged count it was measured at.
- Playing a game, a node appears on the outer edge often enough to notice
  within a few refills.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- The rules edit is one commit, ahead of the code, and there is **one**
  version bump on this branch however many later rules edits it needs.
- Manual check worth making once it runs: whether a third node on the rim
  is worth going for, or whether both players ignore it and it simply
  expires. That is the question this story exists to ask.
