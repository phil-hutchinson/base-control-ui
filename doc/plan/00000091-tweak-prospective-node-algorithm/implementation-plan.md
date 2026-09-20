# Implementation Plan — Story 00000091, Nodes reach the edge

## What this story does

A refill of the three inactive nodes draws three squares, one at a time.
Today the pool those draws come from widens **once, after the first draw**,
and the widening lifts only section 3.2's constraint 4 ("not one square in
from the outer edge"); constraint 3 (the outer edge itself) stays closed to
every ordinary draw.

After this story the pool widens once, **after the second draw**, and the
widening lifts constraints **3 and 4 together**:

- the **first and second** squares come from the strict pool — all six
  constraints, the 11 × 11 interior C3–M13, 51 squares on an empty board;
- the **third** square comes from a pool with both edge constraints gone —
  the whole board, less planets and their neighbours, less ships, less the
  squares already holding a node and their neighbours. **117** squares on an
  empty board, **38** of them on the outer edge.

So every refilled trio keeps two nodes in the interior and one that may be
anywhere, including a corner such as A1.

**The opening deal is an exception, by the owner's decision at the plan gate
(D6).** It places its inactive trio through the same refill procedure, so
without a deliberate carve-out this change would deal a rim node before the
first turn. It must not: the deal draws all three of its inactive squares
from the strict pool, and a game opens with every node — charged and
inactive — inside C3–M13. That is a second rules change for 0.37, in §8.1,
folded into the same version bump and the same changelog entry (S1).

This is a **gameplay change**: a square that could not hold a node now can.
It therefore starts with a rules edit (0.36 → 0.37) in its own commit, ahead
of the code, and the change is a tag candidate — but **tagging stays on
hold** (`CLAUDE.md`), so no step tags anything.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions and the rejected alternatives, because code in this
repository deliberately carries no design history (`CONTRIBUTING.md`,
"Comments").

## Baseline on this branch

Branch `feat/91-tweak-prospective-node-algorithm`, clean at the start of
planning (`story.md` already committed, commit `c4b7269`).

- `npm test` — **73 test files, 1453 tests, all green**.
- `npm run typecheck`, `npm run lint`, `npm run format:check` — all clean,
  with **no** pre-existing warnings anywhere in the repository.

Because `format:check` is clean today, any warning it reports during this
story belongs to this story and must be fixed (`npx prettier --write` on the
file concerned) before the step is committed.

The test count should **rise slightly** over this story (Step 2 adds cases).
No step may lower it.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say (`CLAUDE.md`, Vocabulary). Do not mix them.
- **Node** is the word everywhere: a position that runs `inactive` →
  `charged` → `depleted` and then ends. An inactive node carries a
  **priority** (1–3).
- **Refill** is the procedure that replaces the whole inactive trio at once
  (rules.md §8.2). Its three draws are called the **first**, **second** and
  **third** draw throughout this plan, and that order is also the order they
  consume the seed in.
- **Strict pool** — `legalNodePool`'s default, all six of §3.2's
  constraints. **Widened pool** — `legalNodePool(..., "widened")`. After this
  story the widened pool is the whole board less planets, planet neighbours,
  ships, occupied node squares and their neighbours. The code keeps the word
  "widened" (D2); this plan sometimes describes it as "the whole board", but
  that is prose, not a name.

## Settled decisions — do not reopen

These come from `story.md` and from the owner's instructions at planning
time. A step that finds one inconvenient escalates to the owner rather than
re-deciding.

- **S1. One rules-version bump on this branch.** `rules.md` goes 0.36 →
  0.37 in Step 1, with a single `doc/ruleset/changelog.md` entry and a
  matching `RULES_VERSION`. If a later step needs another rules edit, it
  folds into that same 0.37 entry — **no second version bump, no second
  changelog entry**.
- **S2. No tagging.** Tagging is on hold until the game plays (`CLAUDE.md`).
  The changelog entry may say the version is a tag candidate; nothing in
  this story runs `/tag-rules` or creates a tag.
- **S3. The shape is fixed: strict, strict, open.** Widening the second draw
  as well, and a three-tier strict/one-ring/open ramp, were both considered
  and rejected (D1). Do not revisit either.
- **S3a. The opening deal stays rim-free** — strict / strict / strict, a
  §8.1 exception to §8.2's procedure (D6). Owner decision at the plan gate;
  freezing the deal at 0.36's exact behaviour was offered and rejected. Do
  not revisit.
- **S4. The six constraints, the weighting formula, the priority draw, the
  queue's size, rotation, charging, countdowns, energy and the fallback are
  untouched.** Only *which pool each of the three draws uses* changes.
- **S5. The seed arithmetic does not move.** A refill still consumes exactly
  four seed steps, in the same order: three squares, then the priority
  permutation. The opening deal still consumes `chargedNodeCount + 4`.
- **S6. No start-screen option, no UI work, no board furniture.** A node on
  the edge draws the way every other node draws.
- **S7. No review fixtures and no manual test scripts.** The owner drives
  manual testing himself from `npm run dev`. Any measurement instrumentation
  a step needs is temporary, is removed before the step is committed, and is
  never a committed script (D4).
- **S8. No accessibility work items and no accessibility tests.**
  (`CLAUDE.md`, "Accessibility during pre-release".) Nothing in this story is
  expected to cost an accessible behaviour; if a step knowingly does, it
  records a note in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md` and moves on.
- **S9. Measured figures are measured, never invented.** Every number that
  goes into `doc/ruleset/tech-notes.md` in Step 3 is read off the app's own
  long-run test run described there. **The simulation numbers in `story.md`'s
  *Effect on the game* section (61% / 26% / 13% / 10%) are context for the
  decision and must not be copied into any document.** If a figure cannot be
  measured, the document says so plainly rather than estimating it.

## Decisions this plan makes

### D1. Why strict / strict / open, and what was rejected

The widening exists so a refilled trio is not packed into the middle of the
board. Three shapes were on the table:

1. **Widen after the first draw, lift constraints 3 and 4 together** — draws
   2 and 3 both open. Rejected: two of the three new nodes land on or near
   the perimeter (the weighting favours edge squares strongly, because they
   are the farthest from everything), which hollows out the middle of the
   board and leaves a player with only one node worth contesting near the
   centre.
2. **A three-tier ramp** — strict, then one-ring, then open. Rejected for the
   same outcome as (1) plus a third concept to explain in the rules and a
   third pool width in the code, for a difference a player could not see.
3. **Widen after the second draw, lift 3 and 4 together** — *chosen*. Two
   interior nodes and one that may be anywhere. Going for the far one costs
   fuel and is therefore a decision, not the only game available.

The weighting is deliberately **not** re-tuned to hold the third node off the
rim or push it there harder. The story wants to find out whether a rim node
is worth going for; re-tuning before that question is answered would answer
it with arithmetic instead of play.

### D2. Keep the names `NodePoolWidth`, `"widened"` and `WIDENED_EXCLUDED_EDGE_RINGS`

`story.md` permits a rename if the implementer finds `"widened"` actively
misleading, provided the plan says so and the rename happens everywhere in
one step. **This plan decides: keep the names.** `"widened"` describes the
relationship between the two pools — it is the wider of the two — and that is
still exactly what it is; `WIDENED_EXCLUDED_EDGE_RINGS` still says what it
counts, it now counts zero. A rename would churn one source file and four
test files for no behavioural gain, and the meaning belongs in the doc
comments, which Step 2 rewrites. The rejected alternative was renaming
`"widened"` to `"open"`.

### D3. The change is two edits that must land together

`WIDENED_EXCLUDED_EDGE_RINGS` going 1 → 0 and `refillQueue` moving the second
draw to the strict pool are separate edits in separate files, but they are
one behaviour. Landing only the first would briefly put **two** nodes of
every trio on the open board — exactly the shape D1 rejected — and would turn
several existing tests red. So Step 2 makes both edits, and updates every
test that asserts the old split, as a single green step. The tests are in the
same step for the same reason: the assertions they carry ("never the outer
edge") are the old rule, and a step is not allowed to leave the suite red.

### D4. How the tech-notes figures get re-measured

`doc/ruleset/tech-notes.md` quotes figures that come from the app's own
long-run test, `src/rules/nodePool.test.ts`: it drives `runEndOfTurn` from a
real opening position across 5 seeds × 500 plies at each of the three charged
counts, with no ship ever moving, and reconstructs exactly what
`legalNodePool` saw at each refill draw. Changing which pool a draw uses
changes the squares drawn, which changes the board, which moves every one of
those figures a little. They must therefore all be re-read, not adjusted by
eye.

The method (Step 3): **temporarily** add `console.log` reporting to
`src/rules/nodePool.test.ts` — inside the runs it already performs, so no new
driver and no new script is written — run
`npx vitest run src/rules/nodePool.test.ts`, read the numbers off that one
run, remove the instrumentation, and record the numbers both in the step's
`Notes:` and in the document. This follows the precedent set by story
00000072 Step 8, which measured the same family of figures the same way and
committed nothing temporary. It also respects S7: this is instrumentation the
implementing agent runs once, not a script the owner is expected to keep.

The edge and corner figures are the awkward case. Nothing in the codebase
computes them today — `nodePool.test.ts` checks legality by re-deriving the
constraints, not by classifying where a draw landed — and the definition of
"corner region" behind the document's current 0.14 was never recorded (it
came from a standalone simulation written during story 00000063 and long
since deleted).

**Owner decision at the plan gate: the corner region is the 3 × 3 block at
each of the board's four corners** — A1–C3, M1–O3, A13–C15 and M13–O15, 36
squares in all. Step 3 measures against that definition, **states it in
`tech-notes.md` beside the figure** so a future reader can reproduce it, and
**does not present the new figure as a before/after against the old 0.14**,
because the old figure's region was never recorded and the two are not known
to be measuring the same thing. Say that in the document in a clause, so the
absence of a comparison reads as deliberate rather than as an oversight.

### D5. Which figure is quoted at which charged count

The document's existing convention is kept exactly:

- **Per-draw pool sizes**, **total node count band**, **mean plies between
  refills**, and **weighted vs. unweighted mean smallest pairwise gap**:
  quoted at **all three** charged counts (five, four and three), as now.
- **Edge / one-ring-in / corner per-trio counts**: quoted at **four charged
  only**, as now, and labelled as such in the document.

Every figure in the document must say which count it was measured at, and no
figure may be left claiming a number the board no longer produces.

### D6. The opening deal keeps its board rim-free, and draws all three inactive squares from the strict pool

**Owner decision at the plan gate.** The deal does not inherit this story's
strict/strict/open split.

`dealOpeningBoard` (`src/rules/nodes.ts`) draws the charged squares first,
one at a time from the strict pool, and then places the three inactive nodes
with **one call to `refillQueue`**. So without a deliberate choice here, this
story's change would reach the opening board too and deal a rim node before
the first turn. The owner's decision is that it must not: **the board a game
opens on stays clear of the outer edge.**

The deal therefore draws its inactive trio **strict / strict / strict** — all
three inside the 11 × 11 interior C3–M13, alongside the charged squares.

Two consequences the implementer must not lose:

- **This is a rules change in its own right**, and a second one for 0.37.
  §8.1 today says the other three "start inactive, placed by the same refill
  procedure", which will no longer be true. Step 1 states the deal's own pool
  explicitly. Per S1 it folds into the single 0.37 bump and the single
  changelog entry; it does not earn a second version.
- **The opening board still differs from 0.36 for a given seed.** 0.36's deal
  drew its trio strict / one-ring / one-ring, because the old widening came
  after the first draw. Going to all-strict tightens draws 2 and 3 rather
  than loosening them. So `story.md`'s "the board a given seed deals is the
  board it dealt before" is still wrong and Step 5 still corrects it — the
  charged squares are unchanged, the inactive trio moves inward.

The alternative — freezing the deal at 0.36's exact behaviour — was put to
the owner and rejected: it would have required keeping the one-ring pool
alive as a third named width used by nothing but the deal, and the story
rules a third pool width out of scope.

The replay guarantee is untouched either way: `seededReplay.test.ts` compares
runs against each other rather than against recorded squares, and the deal
still consumes `chargedNodeCount + 4` seed steps. "The same seed deals the
same opening board and plays the same game" holds as a statement about this
build, not as a comparison with builds before 0.37. There is no backwards
compatibility for games recorded under 0.36 (`CLAUDE.md`).

### D7. `seededReplay.test.ts` is expected to pass untouched

It asserts the seed arithmetic (a refill consumes four steps; the deal
consumes `chargedNodeCount + 4`) and same-seed-same-game properties, never a
literal square. Neither moves here. **If it does need editing, stop and
record why in the step's Notes** — it would mean a recorded literal is in
there that this story did not expect, which the owner should hear about.

### D8. The UI tests are expected to pass untouched

`Board.test.tsx` replaces the dealt nodes with a board it states itself;
`session.test.ts`, `Hud.test.tsx`, `RoundCounter.test.tsx`,
`TurnIndicator.test.tsx` and `boardAnimations.test.ts` compare
`startingGameState` against itself. None pins a dealt square. If one turns
red, that is a genuine finding and goes in the step's Notes.

## Facts the implementer will need

Confirmed against this branch while planning:

- `legalNodePool([], [])` (strict) → **51** squares, and that is unchanged by
  this story.
- `legalNodePool([], [], "widened")` → **79** today, **117** after the
  change; **38** of those 117 are on the outer edge. The 117 is exactly "all
  225 squares, less the 12 planets and every square adjacent to one".
- **A1, A8 and H1** are all in the new widened pool and none is in the strict
  pool. All four corners (A1, A15, O1, O15) are legal for a third draw: none
  is adjacent to a planet.
- Source files that change: `src/rules/nodePlacement.ts`,
  `src/rules/nodeQueue.ts`.
- Test files that change: `src/rules/nodePlacement.test.ts`,
  `src/rules/nodeQueue.test.ts`, `src/rules/nodePool.test.ts`,
  `src/rules/nodes.test.ts`.
- Documents that change: `doc/ruleset/rules.md`, `doc/ruleset/changelog.md`,
  `doc/ruleset/tech-notes.md`, `src/rules/rulesVersion.ts`, and (Step 5)
  possibly `README.md` and this folder's `story.md`.
- `src/guide/guideCopy.ts` (the in-app quick guide) says nothing about where
  a node can appear, so it needs no change. Step 5 confirms that.

---

## Step 1 — Rules 0.37: the widening moves one draw later and opens the edge

Status: committed

Notes: Rewrote §3.2's widening paragraph (widens after the second draw, not
the first; lifts constraints 3 and 4 together; 51/117 empty-board sizes, 38
of the 117 on the outer edge; the "never lifted" sentence deleted); corrected
§8.2's refill-procedure paragraph to strict/strict/widened and added a
sentence naming the opening deal as the one exception; rewrote §8.1's
opening-deal bullets so the charged squares are named as drawn from the
strict pool and the inactive trio is now strict/strict/strict, explicitly
kept clear of the outer edge. §3.3's rotator paragraph needed no change — it
never claimed the edge belonged to rotators alone. No other sentence in the
document claimed a node can't reach the edge. Added one `## 0.37` changelog
entry covering both rules changes. Bumped `RULES_VERSION` to `"0.37"`. No
code in `src/` touched other than `rulesVersion.ts`.
Verification: `npm test` — 73 files, 1453 tests, all green (unchanged count,
as expected since no code changed); `rulesVersion.test.ts` passes;
`grep -n "never lifted" doc/ruleset/rules.md` finds nothing;
`grep -c "^## 0.37" doc/ruleset/changelog.md` is 1;
`grep -n "117" doc/ruleset/rules.md` finds the new widened-pool size;
`grep -n "79" doc/ruleset/rules.md` finds nothing; `npm run typecheck`,
`npm run lint` and `npm run format:check` all clean. Not committed — left for
the orchestrator per the agent instructions.

Edit `doc/ruleset/rules.md` from version **0.36** to **0.37**, update the
`RULES_VERSION` constant in `src/rules/rulesVersion.ts` to match, and add one
`doc/ruleset/changelog.md` entry. **No code behaviour changes in this step** —
the document is what Step 2 implements. This step is its own commit.

What the document must say afterwards:

- **§3.2, the widening paragraph** (currently "Refilling the three inactive
  nodes draws from a pool that widens once") is rewritten so that:
  - the pool widens once, **after the second draw**, not the first;
  - the **first and second** squares use all six constraints;
  - the **third** square is drawn from a pool with constraints **3 and 4
    lifted together** — the whole board, less planets and their neighbours,
    less ships, less the squares already holding a node and their
    neighbours;
  - the empty-board sizes are stated: the strict pool holds the **51**
    squares above, the widened pool **117**, of which **38** are on the outer
    edge itself;
  - it is stated plainly that a new node can therefore appear on the outer
    edge, corners included (A1, A15, O1, O15 are all legal for a third
    draw) — this is the player-visible point of the change and should not be
    left to be inferred;
  - **the sentence "Constraint 3 is never lifted for these ordinary draws:
    the outer edge itself stays closed to a new node however far the pool
    widens" is deleted, not softened.**
- **§3.2's other paragraphs are left alone** — the six constraints and their
  wording, the C3–M13 interior arithmetic (51 squares), the fallback
  paragraph, and the weighting formula. Read each once for a sentence that
  assumes the edge is closed and correct **only** what is now wrong.
- **§8.2, the refill-procedure paragraph** ("The refill procedure draws three
  squares one at a time, from the pool that widens once (section 3.2): the
  first square is drawn from the strict pool, and the second and third from
  the widened pool…") is corrected to the new split: first and second from
  the strict pool, third from the widened one. §3.2 and §8.2 must agree, and
  §8.1's exception for the deal (below) must not contradict either.
- **§8.1's opening-deal bullets** carry a **second rules change** for 0.37
  (D6, owner decision): **the opening board stays clear of the outer edge.**
  - Say explicitly that the opening deal's charged squares come from the
    **strict** pool. That much is a clarification of existing behaviour, now
    that §3.2 describes two pools sharply.
  - §8.1 today says the other three "start inactive, placed by the same
    refill procedure". That becomes false, because §8.2's procedure now
    opens its third draw to the edge. Rewrite it: the deal places its three
    inactive nodes by §8.2's procedure **but draws all three squares from
    the strict pool**, so every square on the opening board — charged and
    inactive alike — lies inside the interior C3–M13. State the reason in
    the player's terms: a game does not open with a node out on the rim.
  - Make sure §8.2 and §8.1 cannot be read as contradicting each other. §8.2
    describes the refill during play; §8.1 says how the deal differs from
    it. Whichever section carries the exception, the other must point at it.
  - Per S1 this folds into the **same** 0.37 bump and the **same** changelog
    entry — no second version, no second entry — but the changelog entry must
    name it as its own change, because it is one.
- **§3.3** still correctly says §3.2's constraints do not apply to a rotator.
  Re-read the surrounding contrast ("it may stand on the outer edge, and it
  may stand beside a planet or a node") and adjust only if it now reads as
  though the edge belonged to rotators alone. A rotator and a node sharing
  the edge is fine and needs no new rule.
- **Sweep the whole document** for any other sentence telling a player a node
  never appears on the edge (`grep -ni "outer edge" doc/ruleset/rules.md` and
  `grep -ni "interior" doc/ruleset/rules.md` are enough; §1, §2 and §7.1 were
  checked while planning and carry no such claim).
- **`doc/ruleset/changelog.md`** gets exactly one `## 0.37` entry, newest
  first, in the style of the existing entries, covering **both** changes:
  what changed in §3.2 and §8.2 and that a node can now appear on the outer
  edge including a corner; **and** that §8.1's opening deal now draws all
  three of its inactive squares from the strict pool, so the opening board
  stays inside the interior. Say that the six constraints and the weighting
  are unchanged, and that this is a gameplay change and so a tag candidate
  with tagging on hold. Per S1, every later rules edit on this branch folds
  into this entry.
- **`src/rules/rulesVersion.ts`** → `"0.37"`.

Do **not** touch `doc/ruleset/tech-notes.md` in this step. Its figures are
re-measured in Step 3, after the code behaves the new way; changing them here
would mean writing numbers nobody has measured yet (S9).

Depends on: nothing. It is the first step, and it is what Steps 2 and 3
implement.

Verification (automated): Run `npm test` and confirm
`src/rules/rulesVersion.test.ts` passes — it asserts `RULES_VERSION` matches
the version line in `rules.md` and that the changelog has an entry for that
version — and that the rest of the suite is still green (no code has changed,
so the count should stay at 1453). Then confirm by search:
`grep -n "never lifted" doc/ruleset/rules.md` finds nothing;
`grep -c "^## 0.37" doc/ruleset/changelog.md` is exactly 1 (and
`grep -c "^## 0." doc/ruleset/changelog.md` has risen by exactly 1);
`grep -n "117" doc/ruleset/rules.md` finds the new widened-pool size; and
`grep -n "79" doc/ruleset/rules.md` no longer finds the old one. Run
`npm run typecheck`, `npm run lint` and `npm run format:check`.

---

## Step 2 — The pool, the draw, and every test that asserted the old split

Status: committed

Notes: `WIDENED_EXCLUDED_EDGE_RINGS` set to 0 and its doc comment, `NodePoolWidth`'s
and `legalNodePool`'s doc comments rewritten in `nodePlacement.ts` (S4: no
behaviour change there beyond the constant). `refillQueue` (`nodeQueue.ts`)
rewritten so the first two draws use the strict pool (the second recomputed
against the board plus the first square) and only the third uses the pool
`thirdSquarePoolWidth` names, defaulting to `"widened"` so `endOfTurn.ts`'s
call site is untouched; the module header's four-step list and the
function's own doc comment corrected to match, with the new parameter
documented with its §8.1 reason. `dealOpeningBoard` (`nodes.ts`) passes
`"strict"` for that parameter (D6) and its doc comment says so. Updated all
four named test files per the plan: `nodePlacement.test.ts`'s widened pool
now asserts 117 (derived from `PLANETS` geometry, not a bare length), gains
the A1/A8-vs-corner companion case, and the old "never on the outer edge, in
either pool" case is now "excludes the outer edge from the strict pool"
alone; `nodeQueue.test.ts`'s edge assertion is split to the first two
squares, the pool-provenance test now checks strict/strict/widened, and the
"lands one ring in" test is retargeted at the third draw and made positive
about the outer edge too; `nodePool.test.ts`'s `requiredRings` for
`"widened"` is 0, the "never the outer edge" test is renamed and rewritten
to strict/strict/widened with a new outer-edge-reached counter asserted
`>0`, and the opening-deal legality check is tightened from `"widened"` to
`"strict"` per D6 with the comment rewritten to give the §8.1 reason instead
of the old "draw order isn't recoverable" one; `nodes.test.ts`'s dealt-board
test now asserts `INTERIOR_NAMES.has(name)` for every dealt square
(charged and inactive alike), renamed, with its explanatory comment
corrected to say the deal holds all three draws strict while a refill
during play does not.

Two deviations beyond the plan's explicit checklist, both needed to land
this step green (D3's "single green step" rule):

- `nodePool.test.ts`'s "spread the weighting buys" test builds its own
  unweighted comparison draw by re-deriving the same three pools a real
  refill sees; that reconstruction still drew its second square from the
  widened pool. Corrected it to strict, alongside the renamed test, so the
  comparison actually mirrors what `refillQueue` now does — not called out
  by name in the plan's `nodePool.test.ts` bullets, but the same test the
  bullets do cover.
- `nodeQueue.test.ts`'s `MINIMUM_SPREAD_ADVANTAGE`-style floor (the mean
  smallest pairwise gap, previously bounded at 4.5) measured 4.23775 for its
  fixed seed and trial count after the change — expected, since the second
  draw no longer has the widened pool's extra room to spread from the
  first. Per the step's closing rule, lowered the bound to 3.75, a margin
  below the new figure comparable to the old bound's margin below its
  original 5.08, and recorded the new figure in the comment. This is a
  finding for Step 3, which re-measures the tech-notes.md figures properly.
- `camping.test.ts` (outside the plan's four named test files) had one test
  hard-code a fixed-seed board where a mid-game refill (triggered when its
  manually-built queue's sole inactive node charges) draws a fresh trio.
  With the pool split changed, that refill's third draw landed on D3 for
  this seed, where the test had a later move go — collateral from a literal
  square baked into a fixed-seed scenario, not a rule assertion about pool
  width. Retargeted that move to D4 (already used by the following, unaffected
  test) with a one-line comment explaining why. Not named in the plan, but
  the same D3 (this plan's, not the square's) reasoning applies: the step
  must land green as a whole.

Verification: `npm run typecheck`, `npm run lint`, `npm run format:check` —
all clean. `npm test` — 73 files, **1454** tests, all green (baseline 1453,
risen by one as the plan expects). `nodePlacement.test.ts` (26 tests): widened
pool 117, contains A1 and A8, strict pool still 51 and a subset.
`nodeQueue.test.ts` (19 tests): third square reaches the outer edge over the
seed sweep; still exactly four seed steps per refill. `nodePool.test.ts` (99
tests): passes at all three charged counts, first two squares of every refill
legal under all six constraints, third legal under the remaining four, at
least one third square on the outer edge across the run, fallback never
fires. `nodes.test.ts` (34 tests): every dealt square, inactive included,
inside C3-M13 at all three charged counts. `seededReplay.test.ts` (5 tests):
passed **unchanged**, no edit needed (D7). No test outside `src/rules/`
needed an edit (D8) — confirmed by `git status --short` showing only
`src/rules/` files touched.

Implement rules 0.37 in `src/rules/`. Both source edits and all four test
files land together, for the reason D3 gives.

**`src/rules/nodePlacement.ts`**

- `WIDENED_EXCLUDED_EDGE_RINGS` goes from **1** to **0**. Keep the constant
  and its name (D2); rewrite its doc comment to say that the widened pool
  lifts constraints **3 and 4 together**, so no ring around the edge is
  excluded at all and the outer edge is open.
- Rewrite the `NodePoolWidth` doc comment: `"strict"` excludes the outer edge
  and the ring one square in; `"widened"` excludes neither, and is used for
  the **third** square of a refill (rules.md §8.2).
- Rewrite `legalNodePool`'s doc comment where it describes constraints 3 and
  4 and where it describes the fallback's relaxation: constraint 4 is no
  longer "dropped for the widened pool" on its own — constraints 3 and 4 are
  both dropped, for the third draw only. The fallback paragraph's contrast
  with "the ordinary pool" now holds only against the **strict** pool, since
  the widened pool already permits the edge; correct that sentence and leave
  the fallback's behaviour exactly as it is.
- **Nothing else in this file changes.** The weighting formula, the uniform
  draw and the fallback are untouched (S4).

**`src/rules/nodeQueue.ts`**

- `refillQueue` draws the **second** square from the **strict** pool
  (recomputed against the board including the first square, so both the
  adjacency constraint and the weighting see it) and only the **third** from
  the widened pool (recomputed against the board including the first two).
  The current code runs the second and third through one two-iteration loop
  over the widened pool; after the change the two draws use different pool
  widths, so express them however reads best — what must not change is that
  each draw recomputes its pool against the squares drawn so far, uses
  `drawWeightedNodeSquare` with the same arguments it does today, and
  advances the seed exactly once.
- The **module header's numbered list of the four seed steps** says which
  pool each draw uses. Correct items 2 and 3 **in this same step**, not
  afterwards. The list's order and count do not change: three squares, then
  the priority permutation (S5).
- Correct `refillQueue`'s own doc comment, which says the pool "widens after
  the first".
- **`refillQueue` gains a way for the opening deal to keep every draw
  strict** (D6, owner decision). The deal must draw its trio strict / strict
  / strict; a refill during play draws strict / strict / widened. Give
  `refillQueue` an optional parameter for this — the exact shape is the
  implementer's call (an optional `NodePoolWidth` for the third draw, or an
  explicit "interior only" flag), but it must **default to the play
  behaviour** so `endOfTurn.ts`'s call site is untouched, and it must be
  documented in the module header and the function's doc comment with the
  §8.1 reason, not just the mechanism.
- **The seed arithmetic is identical on both paths** (S5): four steps, three
  squares then the priority permutation, whichever pools were used. The
  parameter changes *which square is drawn*, never *how many draws happen*.

**`src/rules/nodes.ts`**

- `dealOpeningBoard` passes the new parameter so its inactive trio is drawn
  entirely from the strict pool (D6). Nothing else in the function changes —
  same call order, same seed threading, same `chargedNodeCount + 4` steps.
- The module header's numbered draw-order list, item 2, currently says the
  trio is placed "by one call to `refillQueue` (§8.2) … the same procedure a
  later charge's refill uses". Correct it: the deal uses that procedure but
  holds all three draws to the strict pool, so the opening board is entirely
  inside C3–M13 and never on the outer edge (rules.md §8.1).

**`src/rules/nodePlacement.test.ts`**

- The widened pool's empty-board size becomes **117** (from 79). Keep the
  strict-superset check and the strict pool's 51. Prefer deriving the
  expected set from `PLANETS` geometry the way this file already derives
  `LEGAL_SQUARES_ON_EMPTY_BOARD`, so the assertion restates §3.2 rather than
  `legalNodePool`'s implementation; a bare length assertion alone is weaker
  than what the file does today.
- The case "contains a square one ring in from the edge that the strict pool
  excludes" (B8) **stands**. Give it a companion: the widened pool contains
  **A8** (an outer-edge square clear of every planet) and **A1** (a corner),
  and the strict pool excludes both.
- The case "never includes a square on the outer edge, in either pool" is now
  false for the widened pool. Rewrite it so it asserts the **strict** pool
  excludes the outer edge, and rename it to say so.
- The fallback cases are unaffected (they use the strict default) and should
  not be touched.

**`src/rules/nodeQueue.test.ts`**

- "deals three distinct squares, none adjacent to each other, to a charged
  node or to a planet, and none on the outer edge, over many seeds" — the
  edge claim now applies to the **first two** squares only. Split the edge
  assertion accordingly and rename the test; every other assertion in it
  (distinctness, non-adjacency, planets) still applies to all three.
- "draws the first square from the strict pool, and the second and third from
  the widened pool computed against the squares drawn so far" — becomes
  strict, strict, widened, with the pools still recomputed against the
  squares drawn so far. Rename it to match.
- "lands the second or third square one ring in from the edge at least once
  over several thousand seeds — the point of widening the pool" — the second
  square can no longer leave the interior. Retarget it at the **third**
  square, and make it the positive statement of the new rule: over several
  thousand seeds the third square lands on the **outer edge** at least once
  (and, if it reads well, one ring in at least once too). Rename it.
- The spread test's floor (mean smallest pairwise gap above 4.5) and the
  four-seed-step test must both still pass. If the spread figure moves,
  follow the rule in the closing paragraph of this step.

**`src/rules/nodePool.test.ts`**

- `satisfiesOrdinaryPoolConstraints`'s `requiredRings` for `"widened"`
  becomes **0** (strict stays 2). Update the helper's doc comment.
- "draws every refill's three squares from the right pool, never the outer
  edge, and never the fallback" — the name now asserts the opposite of the
  rule for the third draw. **Rename it and change its body together**: first
  square checked against `"strict"`, second against `"strict"` (this is the
  change), third against `"widened"`; the loop that asserts no new node is on
  the outer edge applies to the **first two** squares only.
- Add, to that same test (it already walks every refill of the run, so this
  costs no extra economy runs), a count of how many refills put their **third**
  square on the outer edge across the whole run, asserted to be **greater
  than zero**. That is the cheap permanent guard that the edge is genuinely
  reachable in real play, and it is what the renamed test is for.
- The opening-deal legality test checks the dealt trio against `"widened"`,
  with a comment explaining that draw order is not recoverable from a
  finished state. **That check can now be tightened to `"strict"`** (D6):
  the deal draws all three inactive squares from the strict pool, so draw
  order no longer matters — every dealt square satisfies all six
  constraints. Tighten the assertion and rewrite the comment to give the new
  reason (§8.1's exception), rather than the old one about draw order.
- **Do not touch this file's tuned constants or their comments in this
  step** — they are Step 3's, after measurement.

**`src/rules/nodes.test.ts`**

- "deals every square legal under §3.2 — the charged squares inside C3-M13,
  none on the outer edge, …" now **under**-claims rather than over-claims
  (D6). The deal draws its whole trio from the strict pool, so **every**
  dealt square — charged and inactive alike — is inside C3–M13, not merely
  off the outer edge. Strengthen the test: assert `INTERIOR_NAMES.has(name)`
  for every dealt square, not only the charged ones. Keep the outer-edge
  loop (it is implied by the interior check, but it states the rule a player
  reads in §8.1 and is worth keeping explicit), keep the ship and adjacency
  assertions, and rename the test to promise the stronger rule.
- Rewrite the explanatory comment above it. It currently says the inactive
  trio's second and third squares "are drawn from the widened pool (§8.2's
  refill procedure), which may land one ring in from the edge — outside the
  interior, but never on the outer edge itself." That is now wrong in both
  directions: the deal holds all three draws to the strict pool (§8.1), so
  nothing dealt leaves the interior, while a refill **during play** can put
  its third node on the edge. Say both, and say which section governs which.

**If a tuned bound elsewhere in the suite fails** (for example
`MINIMUM_SPREAD_ADVANTAGE` or `nodeQueue.test.ts`'s 4.5 floor), do **not**
quietly loosen it. Record the measured value, adjust the bound only as far as
keeping a comparable margin requires, and say so in the step's `Notes:` — a
bound that genuinely moved is a finding about the change, and Step 3 will
quote the new figure.

Depends on: Step 1 (the rules document this step implements).

Verification (automated): Run `npm run typecheck`, `npm run lint`,
`npm test` and `npm run format:check` — all clean, with the whole suite green
and the test count no lower than 1453. Specifically confirm:

- `npm test -- src/rules/nodePlacement.test.ts` shows the widened pool at
  **117** squares, containing A1 and A8, with the strict pool still 51 and
  still a subset;
- `npm test -- src/rules/nodeQueue.test.ts` shows the third square reaching
  the outer edge over the seed sweep, and still exactly four seed steps per
  refill;
- `npm test -- src/rules/nodePool.test.ts` passes at all three charged
  counts, with the first two squares of every refill legal under all six
  constraints, the third legal under the remaining four, at least one third
  square on the outer edge across the run, and the fallback never firing;
- `npm test -- src/rules/nodes.test.ts` shows every dealt square, inactive
  ones included, inside C3–M13 at all three charged counts (D6);
- `npm test -- src/rules/seededReplay.test.ts` passes **unchanged** (D7) —
  if it needed an edit, say why in the Notes;
- no test outside `src/rules/` needed an edit (D8) — if one did, say why in
  the Notes.

---

## Step 3 — Re-measure, and rewrite `tech-notes.md`'s figures

Status: pending

`doc/ruleset/tech-notes.md`'s "Sizing the queue" section quotes measured
figures that come from the long-run runs in `src/rules/nodePool.test.ts`.
Step 2 changed which squares those runs place, so the figures must be read
again. **Every number written in this step is a number this step measured
(S9).** The `story.md` *Effect on the game* percentages are context only and
must not appear in any document.

**How to measure (D4).** Temporarily add `console.log` reporting to
`src/rules/nodePool.test.ts` — inside the runs the file already performs, so
no new driver, no new committed script — and run
`npx vitest run src/rules/nodePool.test.ts`. That one run covers
`CHARGED_NODE_COUNTS` = 5, 4 and 3, over the file's own `SEEDS` (5 seeds) ×
`PLIES_TO_RUN` (500 plies each), with the same pool reconstruction and the
same unweighted comparison draw the file already builds. Read every figure
off **that** run, then remove the instrumentation before committing.

**Figures to take, and the count each is quoted at (D5):**

At **all three** charged counts (five, four, three):

1. **Per-draw pool sizes** — the mean size of the pool each of the three
   draws actually saw, reconstructed the new way: strict for the first,
   strict against the board plus the first square for the second, widened
   against the board plus the first two for the third. (Min and max are worth
   noting in the step's Notes as the fallback evidence below, even though the
   document quotes means.)
2. **Total node count** — min, max and mean.
3. **Mean plies between refills.**
4. **Mean smallest pairwise gap within a freshly refilled trio, weighted and
   unweighted, and the advantage between them.**

At **four charged only**:

5. **Per-trio counts of where a refill's three squares land** — how many of
   the three sit on the **outer edge**, how many **one ring in**, and how
   many in the **corner region** — for both the weighted draw and the
   unweighted comparison draw. **The corner region is the 3 × 3 block at each
   board corner — A1–C3, M1–O3, A13–C15, M13–O15, 36 squares** (owner
   decision at the plan gate, D4). State that definition in the document
   beside the figure, so a future reader can reproduce it. The document's current
   0.14 came from a simulation whose corner definition was never recorded, so
   **do not present the new figure as a before/after against it.**

**What to rewrite in `doc/ruleset/tech-notes.md`:**

- The empty-board pool sizes: strict **51**, widened **117** (the widened
  number is the one `nodePlacement.test.ts` asserts after Step 2).
- The per-draw pool-size paragraph, at all three counts — and its narrative,
  which currently explains the sizes as "the pool widening as each draw lifts
  the one-square-in constraint". That is no longer what happens: the second
  draw is the *same* pool as the first minus the first square and its
  neighbours, so it is smaller, and the third jumps to the whole board.
  Say what the numbers actually show.
- The node-count band and the refill cadence, at all three counts.
- The weighting paragraph's weighted/unweighted gaps and advantages, at all
  three counts, and the edge / one-ring / corner sentence at four charged —
  which must now also account for the outer edge itself being reachable. The
  claim "the weighting keeps them from crowding the rim" is very likely no
  longer true of the third draw; say what was measured, not what used to be
  believed.
- The **fallback paragraph**: re-check its claim that the fallback has never
  fired against the new runs. A wider third-draw pool makes firing less
  likely, not more, and the minimum pool size measured in (1) is the
  evidence — but the sentence must be true as written, at all three counts.
- The **"What the app guards"** paragraph and the closing paragraph: bring
  them in line with what the suite now guards after Step 2, including the new
  guard that a refill's third square does reach the outer edge.
- The **"Open items"** section needs nothing unless the measurement turns up
  something the owner should decide on; if it does, add it there rather than
  burying it in prose.

**Also in this step:** `src/rules/nodePool.test.ts`'s tuned constants
(`MINIMUM_MEAN_REFILL_GAP`, `MINIMUM_SPREAD_ADVANTAGE`,
`MINIMUM_MEAN_PLIES_BETWEEN_REFILLS`, `MAXIMUM_MEAN_PLIES_BETWEEN_REFILLS`,
`MAXIMUM_TOTAL_NODES`) carry doc comments quoting the same measured figures.
Update those comments to the numbers measured here. Re-tune a **bound** only
if the measurement no longer clears it with comparable margin, and say so
explicitly in the Notes if you do — figures are re-read, bounds are not
re-fitted to flatter the result.

`rules.md` is **not** edited in this step unless a figure it states (51, 117)
turns out to disagree with the measurement, in which case correct it there
too and fold the correction into the **existing 0.37 changelog entry** — no
second version bump, no second entry (S1).

Depends on: Step 2 (the figures cannot be measured until the code behaves the
new way).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all clean, with the instrumentation removed
(confirm with `grep -n "console" src/rules/nodePool.test.ts`, which must find
nothing). Then confirm, figure by figure, that **every** number in
`tech-notes.md`'s "Sizing the queue" section appears in this step's `Notes:`
as something this run measured, and that each says which charged count it was
measured at. Confirm `grep -n "79" doc/ruleset/tech-notes.md` no longer finds
the old widened-pool size, and that `grep -n "1.11\|0.14\|0.83\|0.07"` finds
nothing left over from the old edge and corner figures unless the new
measurement genuinely produced the same number. Confirm
`grep -c "^## 0.37" doc/ruleset/changelog.md` is still exactly 1.

---

## Step 4 — The owner plays it

Status: pending

The pipeline pauses here for the owner. This is the question the story exists
to ask, and no automated test can answer it.

Depends on: Steps 1–3 (the game must behave the new way, and the documents
must match it, before the owner judges the result).

Verification (manual): Run `npm run dev` and start a game from the start
screen (the defaults — five charged nodes, continuous rotation — are fine;
combat on or off does not matter here). Play until several refills have
happened; landing a ship on a charged node and letting its countdown run is
the quickest way to force one. Then confirm:

1. **The board you are dealt has nothing on the rim.** Before anyone moves,
   every node — lit and waiting alike — should be inside the interior, two
   squares in from every side (D6). A node on the edge of the opening board
   means the deal's carve-out is broken and is grounds to stop.
2. **A waiting node appears on the outer edge within a few refills** — row 1
   or 15, or column A or O — often enough to notice rather than as a rarity.
   A corner (A1, A15, O1, O15) should turn up eventually, though not
   necessarily in one sitting.
3. **An edge node draws like any other node.** Its priority rings, its
   charged artwork, its countdown numeral and the charge and burnout
   animations all render correctly hard against the board's edge, with
   nothing clipped, overlapping the board frame, or pushed off-screen — check
   a corner square specifically, and check at least one edge node all the way
   through inactive → charged → depleted.
4. **The board still has a middle worth playing for.** Two of every trio
   should be in the interior; a trio with two or three nodes on the rim would
   mean the draw split is wrong and is grounds to stop and escalate.
5. **The story's own question:** is a third node out on the rim worth going
   for, at the fuel it costs to reach, or do both players ignore it and let it
   expire? Record the impression — it is what the next story on this area
   will be built from.

The owner reports pass or fail. Nothing in this step is scripted, and no
review fixture or debug affordance is to be added to make it easier (S7).

---

## Step 5 — `README.md`, the document sweep, and the story's own record

Status: pending

The wrap-up step.

- Run the `/update-readme` command, which reviews the branch diff and updates
  `README.md` if warranted. `README.md` today tells a player that new nodes
  "appear elsewhere, spread apart from the lit nodes and from each other" and
  that "a node is never drawn on a planet, and all but never right next to
  one". Neither sentence is made false by this story, so an update is
  **optional**; if the change reads as worth a player knowing, a short clause
  saying one of the three fresh nodes can land anywhere, the board's very
  edge included, belongs in that same paragraph. Keep the README's
  non-technical voice and its word **turn** (never "ply").
- Confirm `src/guide/guideCopy.ts` (the in-app quick guide) needs no change:
  it describes the three ring indicators and how rotation works, and says
  nothing about where a node may appear. If that has changed since planning,
  update it.
- Correct `story.md` in this folder per D6, so the story records what was
  actually built. Its *What does not change* bullet claims the opening deal
  "draws its charged nodes from the strict pool, uniformly, and never touches
  the widened one, so the board a given seed deals is the board it dealt
  before". Rewrite that bullet in place to what is true after the owner's
  decision:
  - the deal's **charged** squares are drawn from the strict pool as before
    and are unchanged for a given seed;
  - the deal's **inactive trio** is now drawn strict / strict / strict, so
    the opening board is entirely inside C3–M13 and a game never opens with
    a node on the rim — a deliberate exception in §8.1, not a side effect;
  - but the trio a given seed deals **does** differ from 0.36, because that
    version drew its second and third squares from the one-ring pool. The
    opening board tightened inward; it did not stay put.
  Also correct the matching line in the story's *Verification* list ("the
  same seed still deals the same opening board and the same game as it did
  before this change"), and add the rim-free opening deal to the story's
  *In scope* section, since it is work the story now contains and did not
  originally describe. Do not reformat the rest of the file.
- Confirm nothing in this story knowingly cost an accessible behaviour; if
  something did, add a note to
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md` (S8). Nothing
  is expected here — no UI code changes in this story.
- Confirm the rules artefacts are consistent one last time: `rules.md` at
  0.37, `RULES_VERSION` at `"0.37"`, exactly one `## 0.37` changelog entry,
  and **no tag created** (S2).

Depends on: Steps 1–4 (the README and the story record describe the finished
change; the owner's Step 4 findings may be worth a word in neither, but the
step runs after them so nothing is described before it exists).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all clean. Confirm
`grep -n "Rules version" doc/ruleset/rules.md` reads 0.37,
`grep -n "RULES_VERSION" src/rules/rulesVersion.ts` reads `"0.37"`,
`grep -c "^## 0.37" doc/ruleset/changelog.md` is 1, and `git tag --list
"rules-*"` shows no tag created by this story. Confirm
`git status` is clean once the step is committed.
