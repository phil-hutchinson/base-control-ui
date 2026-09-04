# Implementation Plan — Story 00000054, Nodes that move around the board

## What this story does

Today the board carries seventeen **sites** at seventeen fixed squares, and
each site cycles `active → charged → dormant → active` in place, for ever.
This story makes a node **mortal and mobile**: a node runs `inactive →
charged → depleted` once and then **ends**, and at the instant it ends one
new inactive node appears somewhere else on the board, at a square drawn at
random from the squares where a node may legally appear. The board opens
with **fifteen** nodes (five charged, ten inactive) at fifteen drawn squares
and carries exactly fifteen from the first turn to the last.

Two vocabulary decisions ride along, both settled with the owner and both a
consequence of the change:

- The word **"site" is retired**. With no fixed positions left it describes
  nothing. Code, tests and `rules.md` all say **node**.
- The three states are renamed to the words that describe them:
  **inactive → charged → depleted**, replacing `active → charged → dormant`.

`story.md` in this folder is the full statement of the change. This plan
does not repeat it; it says how to get there, in order, and records the
design reasoning, because the code in this repository deliberately carries
no design history (`CONTRIBUTING.md`, "Comments").

## Settled decisions — do not reopen

These were agreed with the owner before planning began. A step that finds
them inconvenient should escalate, not re-decide.

- **D1.** A new node may not appear orthogonally or diagonally adjacent to
  an existing node.
- **D2.** The replacement node appears at the instant the depleted phase
  ends (recovery reaches zero or below) — one out, one in, so the board
  always holds exactly fifteen nodes.
- **D3.** "Site" is retired everywhere in `src/` and `rules.md`, and
  `CLAUDE.md`'s **Site** and **Hub** vocabulary entries go with it.
- **D4.** The three states are `inactive`, `charged`, `depleted`.
- **D5.** No number is retuned by this story. `NODE_CAPACITY` (60),
  `PRESSURE_CAP` (50), `TARGET_CHARGED_NODES` (5), the five weighted tables,
  and the new counts (15 nodes, 10 of them inactive at the deal) are first
  guesses to be play-tested later.
- **D6.** Tagging stays on hold (`CLAUDE.md`). Bump the version and write
  the changelog entry; do **not** run `/tag-rules`.
- **D6a.** The planet-adjacency constraint from story.md's first draft is
  **out of scope** — it excludes nothing under the current geometry, and a
  constraint that cannot bite is not written pre-emptively. See **D7**.
- **D6b.** Historical planning documents and past changelog entries are
  **not** rewritten into the new vocabulary. See **D12**, and Step 11, which
  makes that a standing project rule.

## Design decisions made while planning

Everything below is a decision this plan makes, with the alternatives that
were rejected. A step that needs to know "why is it done this way" should
find the answer here.

### D7 — The planet-adjacency constraint is deliberately not implemented

story.md's first draft carried a sixth constraint: "not orthogonally or
diagonally adjacent to a planet". It is **not part of this story**, by the
owner's decision at the plan-approval gate, and nothing in this plan states
it, checks it, or tests it.

The reason it cannot bite. Planets are the app's artwork
(`src/board/PlanetDefs.tsx`); `src/board/planetPlacement.ts` puts exactly
one planet in each of the fourteen bays and nowhere else. Every bay is on
row 1 or 15 or column A or O, so every square touching a bay lies inside
rows 1–2/14–15 or columns A–B/N–O — which constraints 3 and 4 remove
already. The constraint would exclude no square that the ring exclusions do
not exclude first.

The owner's rule for this: **a constraint that cannot bite is not written
pre-emptively.** It belongs to the future story that makes it real — one
that moves the bays off the edge, puts planets somewhere other than bays, or
reduces the ring depth. That story states it in `rules.md`, implements it,
and tests it, at the point where a test can actually fail.

There is a second reason the wording would have needed care, which that
future story inherits: `rules.md` has never mentioned planets, and
`src/rules/` must not import from `src/board/`. Whoever writes it will have
to choose between stating it in terms of bays (the same fourteen squares
today) and introducing a planet concept to the ruleset. Nothing here
prejudges that.

Rejected: implementing it anyway with a test that cannot fail (a green test
that proves nothing, and a predicate a later reader would rightly call dead
code); implementing it without a test (worse).

### D20 — `nodePlacement.ts` stays a pure geometry module

Found after Step 5, which introduced a three-module import cycle:
`nodes.ts` → `nodePlacement.ts` → `gameState.ts` → `nodes.ts`. It compiles
and runs, because every cross-reference is used inside a function body
rather than at module-init time, but it is a defect and it is cheap to
remove.

The cycle has exactly one cause: `drawNodeSquareForState`, the convenience
wrapper that takes a `GameState`, which is the only reason
`nodePlacement.ts` imports `gameState.ts` at all. As of Step 5 it has **no
consumer**.

So Step 6 deletes the wrapper and its `gameState` import, and the
end-of-turn caller builds the two arguments itself — it holds the state, and
`nodeSquares(state)` and `state.ships.map(...)` are one line each. That
leaves `nodePlacement.ts` depending only on `board`, `bays` and `random`: a
pure geometry module that knows what a legal square is and nothing about a
game in progress, which is what **D13** was reaching for when it kept a
`GameState` out of the pool builder's signature.

Rejected: leaving the cycle (it entrenches the moment Step 6 wires the
wrapper in); moving the wrapper to `gameState.ts` (it is end-of-turn's
concern, not the state shape's).

### D19 — Fixtures may not use an off-list square as an isolation trick

Found while implementing Step 3, which blocked on it.

Seven pre-existing tests in `src/rules/ply.test.ts` and
`src/game/session.test.ts` hand-build a state with a single node on a square
**outside** the seventeen — `E6`, `I8`, `K8` — with comments citing §3.2 to
explain that the square is therefore "immune" to drain, recovery and the
charge draw. That immunity was never a rule. It was an artefact of the
engine walking a fixed seventeen-square list, and it dies the moment
iteration comes from the state — which is the whole point of Step 3, and of
this story.

So the fixtures are wrong, not the change, and they are repaired here rather
than worked around. **`nodeSquares` is not given a filter to preserve the
trick**; that would contradict D8 and reintroduce the fixed list under
another name.

What those tests actually claim is §8.2's rule that **nothing a ship does
changes a node's state** — a claim about the action, not about the board's
own per-turn clock, which runs regardless. The repair states the board each
test wants:

- **Give the fixture five charged nodes.** With the board already at
  `TARGET_CHARGED_NODES`, the charge draw finds no shortfall, consumes no
  seed, and cannot charge the node under test. Without this, a lone inactive
  node is charged at the end of the very ply the test is exercising.
- **An inactive node under test sits at `PRESSURE_CAP`.** Step 5 skips a
  node already at the cap, so with no charge draw firing the node is
  genuinely untouched by the whole sequence, and the test's existing
  deep-equality assertion survives unchanged.
- **A depleted node under test cannot be made inert** — recovery always
  subtracts. Assert its `state` rather than its whole status, and give it a
  level far enough above the recovery table's maximum of 8 that it cannot
  retire mid-test.
- **A whole-record equality assertion is no longer expressible** and must
  not be faked. The five charged nodes drain every ply. Narrow it to the
  node under test, or to the set of node squares and each node's `state`,
  which is what "the move touched nothing" actually means.

Prefer fixture squares that are legal under §3.2 — inside C3–M13, no two
adjacent — so the fixture does not model a board the game could never deal.
Nothing enforces this on a hand-built state, and it is hygiene rather than a
requirement.

This is a genuine change to what seven pre-existing tests assert, made
deliberately and recorded here because the peer review will otherwise read
it as a weakened test.

### D8 — Board order comes from `ALL_SQUARES`, never from `Object.keys`

`GameState.nodes` is a square-name-keyed record. Once the node set changes
during a game, `Object.keys` order records **the history of which square was
written when** — deterministic, but a property of how the game got here
rather than of the board. Three end-of-turn steps and the charge draw
iterate the nodes and consume the seeded random stream as they go, so their
order is part of what a recorded game replays. Keying that to insertion
history would be fragile in a way that is very hard to notice.

Instead a helper `nodeSquares(state)` walks `ALL_SQUARES` (already row-major:
row 1 first, column A first within a row) and keeps the squares that
currently hold a node. It costs one pass over 225 squares per call, which is
nothing next to the work already done per ply.

A load-bearing fact for Step 3: the existing `SITES` constant is already in
exactly that order (F2, J2, B4, H4, N4, E5, K5, D8, H8, L8, E11, K11, B12,
H12, N12, F14, J14 — rows ascending, columns ascending within a row), and
until Step 5 the deal writes nodes on exactly those squares. So swapping the
fixed-list walks for `nodeSquares(state)` is **bit-for-bit behaviour
preserving**, including the seeded stream. That is what makes Step 3 safe
and cheaply verifiable.

### D9 — The rename is one step, not several

The rename is roughly 1,180 occurrences of "site" across 49 files, plus the
state words. It is nonetheless **one step**, for three reasons:

1. **The type graph is one connected component.** `SiteState` is imported by
   the rules layer, the board layer, the HUD and about thirty test files. No
   partition of the rename by module leaves the tree compiling in between,
   and the guide requires every step to be independently compilable.
2. **Splitting by word family means two passes over the same 49 files.**
   Renaming the state words first and the module/identifier words second
   doubles the review surface and the merge churn for no extra safety —
   and the two families are entangled anyway (`site-went-active` is both a
   "site" word and an "active" word).
3. **The whole rename has exactly one verification point**: the suite passes
   with no behavioural diff, and the words are gone. The guide says to split
   a step when it has more than one verification point; this one does not.

The mitigation for its size is that it is purely mechanical and that Step 3
onwards each carry small, independently checkable diffs, so the behavioural
history after it stays readable — which is the reason the story asked for it
as its own commit in the first place.

### D10 — `SITES` is renamed in Step 2 and deleted in Step 5

`SITES` cannot simply be deleted during the rename: the deal, the charge
draw, the energy filters and three end-of-turn steps all still walk it at
that point. But leaving a symbol named `SITES` in place would blunt the
rename step's one crisp verification ("`src/` no longer contains the word
site").

So Step 2 renames it `FIXED_NODE_SQUARES` — an honest description of what it
still is, the seventeen fixed squares nodes currently occupy — and Step 5
deletes it when node positions become drawn rather than fixed. The temporary
name costs one identifier rename; it buys a clean grep at the step where the
grep matters most.

### D11 — `site-went-active` is renamed mechanically, then replaced

`site-went-active` is deleted by Step 6, which replaces it with
`node-replaced`. Step 2 nonetheless renames it to `node-went-inactive`,
mechanically, along with everything else. Inventing an intermediate name is
mild churn, but the alternative — carving one identifier out of an otherwise
uniform mechanical pass — is worse: it leaves the word "site" in `src/` and
breaks Step 2's verification, and it makes the rename step's rule ("every
occurrence, no exceptions") into a rule with an exception a cold reader has
to remember.

### D12 — Historical planning documents are not rewritten

`doc/plan/**` holds about thirty implementation plans and stories written
under the old vocabulary. They are a **dated record of decisions made at the
time**; rewriting them would falsify that record and produce a
several-thousand-line diff no reader benefits from. The story's own
Verification section names only `rules.md` and `src/`, and that is the scope
this plan takes.

Likewise `doc/ruleset/changelog.md`: existing entries stay exactly as
written (they describe the document as it was under those versions); only
the new 0.20 entry uses the new words.

From this story on, new planning documents say "node".

The owner's decision at the plan-approval gate goes further than this story:
not rewriting historical planning documents is to become a standing project
rule rather than a judgement call made afresh each time. **Step 11** writes
it into `CONTRIBUTING.md`.

### D13 — The pool builder does not take a `GameState`

The opening deal needs the legal pool before a `GameState` exists —
`dealOpeningBoard` returns the node record that `startingGameState` then
assembles into a state. Making the builder take a `GameState` would force
the deal to fabricate a throwaway one.

So the builder takes the two things it actually needs — the nodes placed so
far, and the squares ships stand on — plus an optional square to exclude. A
thin convenience wrapper over a `GameState` serves the end-of-turn caller,
which does have one.

Consequence: `startingGameState` builds the fleet **before** dealing and
passes the ships' squares into `dealOpeningBoard`, whose signature therefore
changes. Building the fleet consumes no randomness, so the seeded stream is
unaffected. `startingGameState`'s own signature is unchanged, as the story
requires.

At the deal every ship is in a bay, and every bay is on the outer edge, so
the ship constraint excludes nothing there. It is applied uniformly anyway
rather than special-cased — a special case would have to be revisited the
first time an opening position puts a ship somewhere else.

### D14 — The fallback keeps the excluded square excluded

story.md's fallback relaxes the six constraints down to "holds no node, and
is not a bay". It does **not** relax the excluded-square argument: a
replacement never appears on the square the retiring node just left, in the
fallback as everywhere else, because story.md's Verification states that
property unconditionally. Keeping one square out of a pool of roughly two
hundred cannot make the fallback fail.

Bays stay excluded even in the fallback, so `squareLabel.ts` keeps its
invariant that a square is never both a bay and a node.

The fallback is base-covered only, per the owner: one test that it fires and
returns a legal-under-relaxation square. It is not expected to happen. The
interior is 121 squares; the densest packing of mutually non-adjacent
squares in an 11 × 11 area is 36, and greedy random placement of only 15
jams far short of that.

If even the fallback pool is empty — which needs every one of the 211
non-bay squares to hold a node — throw a `RangeError` with a clear message
rather than letting `drawIndex` throw its generic one.

### D15 — A retiring node bars only its own square, not its neighbours

The order inside a retirement is: remove the retiring node's entry, then
build the pool (with its square excluded), then draw, then write the new
node. Because the retiring node is gone before the pool is built, the
adjacency constraint does not see it, so a replacement **may** land next to
the square just vacated. That is correct: the node has ended, and constraint
6 is about nodes that exist. Only the vacated square itself is barred, which
is what makes a replacement always visibly somewhere else.

### D16 — Two retirements in one sequence are handled one after the other

They are processed in board order, each fully completed (remove, draw,
write) before the next begins, so the second placement sees the first
replacement already on the board and cannot land adjacent to it.

For this to be safe, step 6 must iterate an **ordered list captured at
function entry** — the squares that were depleted before the ply began — and
not a live walk of the current board, which would otherwise visit
replacements added during the loop. Step 3 introduces that snapshot while
the change is still provably a no-op; see its Notes on why that is the safe
moment.

### D17 — Nothing is animated, and the board needs no rendering change

`Board.tsx` already asks `nodeStatusAt` per square and draws nothing where
there is no node, so a node appearing at one square and disappearing from
another needs no new rendering. A transition is a visual story, not this
one.

### D18 — `seededReplay.test.ts` has no recorded numbers to regenerate

story.md says its "recorded expectations are regenerated". Reading the file:
it records nothing. It plays the same seed twice and asserts the two runs
match, plays a different seed and asserts they differ, and asserts three
loose non-vacuity floors (at least 10 fights, 10 bay returns, 10 charge
draws over a forty-round game). Nothing pins a literal board or level.

So there is nothing to regenerate. What Step 8 does instead is re-confirm
the non-vacuity floors still clear with margin under fifteen mortal nodes,
re-confirm the two chosen seeds still diverge, extend the recorded
per-game trace to include the `node-replaced` sequence (a new consumer of
the seeded stream), and correct the file's header comment.

---

## Steps

### Step 1 — Rules 0.19 → 0.20

Status: committed

Notes: Rewrote `doc/ruleset/rules.md` per the step's instructions (§1, §2, §3
diagram, §3.2, §8.1, §8.2, §8.6 step 6, and Appendix B; §8.3–8.5, §9 and §10
vocabulary-only), bumped `RULES_VERSION` to `"0.20"` in
`src/rules/rulesVersion.ts`, and added the `## 0.20` changelog entry ahead of
`## 0.19` in `doc/ruleset/changelog.md`, marked as a gameplay change with
tagging on hold. One small addition beyond the step's checklist, within its
spirit: §8.5 gained one sentence stating that a ship standing on a node that
retires keeps its square and power but the square becomes ordinary from that
instant — the step's own §8.2 and §8.6 rewrites imply this but the story's
Step 6 preview (camping.test.ts note) relies on it being an explicit rule, so
it was stated now rather than left for the code step to infer. `npm test`
(898 tests, including `rulesVersion.test.ts`), `npm run typecheck`,
`npm run lint` and `npm run format:check` all pass; grep confirms no "site"
or "dormant" and no word-boundary "active" remain in `rules.md`.

Rewrite `doc/ruleset/rules.md` for mortal, mobile nodes and the new
vocabulary; bump its version line to **0.20**; bump `RULES_VERSION` in
`src/rules/rulesVersion.ts` to `"0.20"`; add a `## 0.20 — …` entry at the
top of `doc/ruleset/changelog.md`, marked as a gameplay change with tagging
on hold.

This step touches **only** those three files. No code in `src/` implements
the new rules yet, and that is expected and correct: `CLAUDE.md` requires
the ruleset to move first, in its own commit, because the document is what
the later steps implement. Only `rulesVersion.test.ts` reads `rules.md`, and
it checks the version and the changelog entry, nothing else — so the suite
stays green through this step.

What changes in `rules.md`:

- **§1 Overview.** The game's random elements go from **four to five**,
  gaining where a new node appears. Add one sentence on the change of
  character: the board is not a fixed map with lights moving across it, it
  is a map that redraws itself as the game runs. Rework the "A site that has
  burned out…" sentence into the new words.
- **§2 Words used in these rules.** Delete the **Site** entry. Redefine
  **Node**: not "a site that is charged" but the thing itself — a position
  on the board that runs through three states and then ends. Name the three
  states here: **inactive**, **charged**, **depleted**. **Pressure** loses
  its reference to a site.
- **§3 board diagram.** Keep the bays, drop the site marks and the `O site`
  legend. An example board is not the board any more and the diagram must
  not imply one.
- **§3.2.** Retitle to say what it now covers — where a node can appear.
  Delete the table of seventeen squares, the **Symmetry** paragraph and the
  **Spacing** paragraph outright. State instead: a node's position is drawn
  when it appears and lasts exactly as long as that node; and the five
  constraints, all of which must hold —
  1. the square holds no node already;
  2. no ship is standing on it;
  3. it is not on the outer edge (not row 1 or 15, not column A or O);
  4. it is not one square in from the outer edge (not row 2 or 14, not
     column B or N);
  5. it is not orthogonally or diagonally adjacent to another node.

  Do **not** add a planet or bay adjacency constraint: it is out of scope
  for this story (**D7**).

  Then: constraints 3 and 4 leave the 11 × 11 interior **C3–M13**, 121
  squares, which holds fifteen mutually non-adjacent nodes very
  comfortably. Then the **fallback**: if no square satisfies all five, the
  node is placed uniformly among the squares that hold no node and are not
  a bay — the whole relaxation at once, not one constraint at a time — so
  placement can never fail. Then: a replacement never appears on the square
  the retiring node just left.

- **§8.1.** Retitle for the three states of a **node**. Fifteen nodes, not
  seventeen sites: five charged at a drain drawn from the opening drain
  table, ten inactive at a pressure drawn from the opening pressure table,
  all fifteen squares drawn under §3.2. Nothing starts depleted — keep that
  sentence. Both tables are **unchanged**; their surrounding prose changes
  ("every other site" becomes the other ten). Rewrite the cycle sentence: a
  node cycles inactive → charged → depleted → **ends**, and its ending puts
  a new inactive node somewhere else on the board.
- **§8.2.** Recovery becomes **retirement**. The paragraph that has a
  depleted node "go active, at 1 pressure" instead has it leave the board,
  replaced at that same instant by one new inactive node at pressure 1, at a
  square drawn under §3.2. The charging paragraph keeps its "if fewer than
  five are inactive, fewer are charged and the board runs below five" and
  now says plainly that this is the likelier case, because the inactive pool
  is smaller than it was.
- **§8.6 step 6.** Restate: every node that was depleted before this turn
  began subtracts its recovery, and any that reaches zero or below retires
  and is replaced. Keep the paragraph explaining why step 6 sits last, with
  its wording adjusted: a node that appears after the charge draw has
  already run is inactive for the whole of the next turn and first eligible
  in that turn's draw, at pressure 1. Adjust the two-clocks paragraph the
  same way.
- **§8.3, §8.4, §8.5, §9, §10.** Vocabulary only. No rule moves, no section
  is renumbered.
- **Appendix B.** Retitle for the node pool and rewrite around fifteen
  mortal nodes: a node lives roughly 20 turns charged and roughly 10 turns
  depleted, so for five to be charged at any moment the average inactive
  wait is about 30 turns — 5 charged, about 2½ depleted, about 7½ inactive,
  and a node still charges about every four turns. Say why the pool is still
  comfortable; say that running short of five stays a **legal outcome**
  rather than a failure; and say what to check first when the numbers are
  retuned — now the pressure cap of 50 against a 30-turn average wait (it
  now sits _above_ the average, which sharpens the weighting rather than
  flattening it), and the size of the inactive pool against the target of
  five charged.

After the edit, `rules.md` must contain no "site" and no "dormant", and no
"active" used as a state name. Watch that "inactive" contains "active" — use
a word-boundary grep.

The changelog entry lists the gameplay changes (mortal nodes, drawn
positions, fifteen not seventeen, the six constraints and the fallback, the
retirement-and-replacement rule, the fifth random element) and, separately,
the vocabulary changes, and repeats that these counts are first guesses to
be play-tested (D5).

Depends on: nothing.

Verification (automated): Run `npm test` — `rulesVersion.test.ts` must pass,
proving `RULES_VERSION` is `"0.20"`, that `rules.md` states 0.20, and that
the changelog has a `## 0.20 ` entry; the rest of the suite must still pass
untouched. Then run `npm run format:check` (prettier formats markdown too).
Then confirm by grep that `doc/ruleset/rules.md` contains no case-insensitive
match for `site` or `dormant`, and no word-boundary match for `active` that
is not part of `inactive`; and that it does contain the six constraints, the
fallback, the fifteen-node opening and the five random elements.

---

### Step 2 — The vocabulary pass: site → node, active/dormant → inactive/depleted

Status: committed

Notes: Renamed `sites.ts`/`sites.test.ts`/`sitePool.test.ts` to
`nodes.ts`/`nodes.test.ts`/`nodePool.test.ts` and `SiteMarker.tsx`/`.css`/
`.test.tsx` to `NodeMarker.tsx`/`.css`/`.test.tsx` with `git mv`, then applied
the identifier, state-literal, class-name and wording renames listed in the
step across all 49 affected files (`SITES` → `FIXED_NODE_SQUARES` per D10,
`site-went-active` → `node-went-inactive` per D11), plus every other
site/dormant/active identifier the plan's "at minimum" list did not spell
out but the mechanical pass reached (e.g. `ACTIVE_SITE_SQUARES` →
`INACTIVE_NODE_SQUARES` in `Board.test.tsx`, `MINIMUM_ACTIVE_SITES` →
`MINIMUM_INACTIVE_NODES` and `MINIMUM_CHARGES_PER_SITE` →
`MINIMUM_CHARGES_PER_NODE` in `nodePool.test.ts`, `dormantOccupied`/
`dormantSquares`/`dormantCount`/`meanDormant`/`meanActive`/
`distanceToNearestChargedOrActive`/`wentActive`/`activeNames` and similar
local names). Edited `CLAUDE.md`: deleted the **Site** and **Hub** entries,
added a **Node** entry per the step's wording, keeping the search-tree-node
disambiguation sentence. Two deviations beyond a literal find-and-replace,
both required to keep the result true rather than merely grep-clean:
(1) `src/board/NodeMarker.tsx`'s comment about
`doc/plan/00000023-update-node-visual/node-artwork.md` quotes that
(unrewritten, per D12) document's own pre-0.11 section headings "Dormant"
and "Active" — a blind rename would have quoted headings the document does
not contain, so those three quoted occurrences were left as `"Dormant"`/
`"Active"` and the surrounding prose rewritten to explain the new
mismatch (the doc's "Charged"/"Depleted" headings now coincidentally match
the code's state names; "Dormant"/"Active" still name neither); (2) two
comments that relied on the old site/node distinction to make sense —
`announcements.ts`'s `endOfTurnClauses` doc comment ("an active site is not
a node") and `fullGame.test.ts`'s `distanceToNearestChargedOrInactive` doc
comment ("a node or a site that might become one") — were reworded rather
than mechanically substituted, since a literal substitution produced
self-contradictory sentences once "site" and "node" became the same word.
Also reflowed a handful of comments (the `NodeStatus` state table in
`gameState.ts`, one paragraph each in `energy.ts` and `chargeDraw.ts`) whose
wrapping the longer identifiers broke, and fixed one derived word form
("dormancy" in `nodes.ts`, not caught by the word-boundary rename) to
"depleted spell". `npm run typecheck`, `npm run lint`, `npm run format:check`
and `npm test` (898 tests, unchanged count and unchanged assertions —
only identifiers, class names and wording moved) all pass. Grep confirms no
case-insensitive `site` or `dormant` remains in `src/` outside the
false positives the step names (`opposite`, `composite`,
`AccessibleGrid.tsx`'s `activeElement`/`interactive-supports-focus`) plus
the three deliberate historical-heading quotes in `NodeMarker.tsx` noted
above (a false positive the step's list did not anticipate, since it predates
the mechanical pass finding it); no word-boundary `"active"` string literal
or `--active` class remains. `git diff` reviewed file by file: every hunk is
a name, a string or a comment — no condition, arithmetic, draw order or
control flow differs.

A single mechanical rename across `src/`, with **no behavioural change at
all**, plus the `CLAUDE.md` vocabulary edit that goes with it. See D9 for why
this is one step rather than several, D10 for the `SITES` handling, D11 for
`site-went-active`, and D12 for what is deliberately left alone.

Rename, at minimum:

- `src/rules/sites.ts` → `src/rules/nodes.ts`. `SiteState` → `NodeState`,
  with members `"inactive" | "charged" | "depleted"`.
  `TARGET_CHARGED_SITES` → `TARGET_CHARGED_NODES`. `DORMANT_RECOVERY_TABLE`
  → `DEPLETED_RECOVERY_TABLE`. `siteCyclePosition` → `nodeCyclePosition`
  (semantics unchanged: charged reports drain against capacity, depleted
  reports remaining drain against capacity, inactive reports pressure
  against the cap from 1 up). `SITES` → `FIXED_NODE_SQUARES` (D10).
- `src/rules/gameState.ts`: `SiteStatus` → `NodeStatus`;
  `GameState.siteStates` → `GameState.nodes`; `siteStateAt` →
  `nodeStateAt`; `siteStatusAt` → `nodeStatusAt`; `dormantSiteNames` →
  `depletedNodeNames`.
- `src/rules/energy.ts`: `dormantSitesOccupiedBy` →
  `depletedNodesOccupiedBy`; `MAX_DORMANT_SITES_PRICED` →
  `MAX_DEPLETED_NODES_PRICED`; `energyForDormantSites` →
  `energyForDepletedNodes`.
- Effects: `SiteChargedEffect` / `"site-charged"` → `NodeChargedEffect` /
  `"node-charged"`; `SiteWentActiveEffect` / `"site-went-active"` →
  `NodeWentInactiveEffect` / `"node-went-inactive"` (D11).
- `src/board/SiteMarker.tsx` and `.css` → `NodeMarker.tsx` / `.css`; the
  CSS block `.site-marker` and its `--active` / `--charged` / `--dormant`
  modifiers → `.node-marker` with `--inactive` / `--charged` / `--depleted`.
- The SVG gradient ids the marker mints, currently `site-<square>-fill`,
  become `node-<square>-fill` — and the comments in `src/ships/shipArt.ts`
  and `src/board/planetArt.ts` that name that id prefix must follow, since
  they exist to warn about id collisions.
- `src/board/squareLabel.ts`: the descriptor field `siteState` →
  `nodeState`, and the wording it produces from `"<state> site"` to
  `"<state> node"` — so a square now reads "H8, inactive node, …",
  "H8, depleted node, …". Its module comment's "a square is never both a
  bay and a site" becomes "…never both a bay and a node".
- `src/board/announcements.ts`: `dormantSitesOccupiedPhrase` →
  `depletedNodesOccupiedPhrase`, wording "standing on 2 dormant sites" →
  "standing on 2 depleted nodes"; `energyPenaltyClause`'s "the dormant site
  at H8" / "3 dormant sites at …" → "the depleted node at H8" / "3 depleted
  nodes at …".
- Every hand-built board in the tests: `siteStates: {…}` → `nodes: {…}`,
  and every `state: "active"` / `"dormant"` literal → `"inactive"` /
  `"depleted"`.
- Test file renames: `sites.test.ts` → `nodes.test.ts`, `sitePool.test.ts`
  → `nodePool.test.ts`, `SiteMarker.test.tsx` → `NodeMarker.test.tsx`.
- Comments and doc comments throughout `src/`, including `ply.ts`'s
  fight-invariant message ("no action changes a node's state").

Also edit `CLAUDE.md`'s **Vocabulary** section: delete the **Site** entry and
the **Hub** entry, add a **Node** entry saying what a node is now (a position
on the board that runs inactive → charged → depleted and then ends; the same
word in code, tests and player-facing text), and keep one sentence of the
reason the old split existed — a future engine brings its own search-tree
"node", and whatever disambiguates the two will have to be chosen then. Note
in the same place that this is a knowing trade: a board with no fixed
positions has no honest use for either old word.

Do **not** touch: `doc/plan/**`, the existing entries of
`doc/ruleset/changelog.md` (D12), or `CONTRIBUTING.md` (its two "site" hits
are about web hosting, not the game).

Known false positives to leave alone when grepping: "composite" (in
`src/board/grid/AccessibleGrid.tsx`), "opposite", "visited", "activate" /
"activation" / "deactivate" (grid interaction wording), and CSS's `:active`
pseudo-class if any is present.

Depends on: Step 1 (the ruleset is the authority for the words; renaming the
code first would leave `src/` implementing words the document does not use).

Verification (automated): Run `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test`. The whole suite must pass with the
same tests as before — the only test edits allowed in this step are
identifier, state-literal, class-name and expected-wording updates. Then
confirm by grep that `src/` contains no case-insensitive match for `site` or
`dormant` outside the false-positive list above, and no word-boundary
`"active"` string literal or `--active` class used as a node state. Finally,
read `git diff` and confirm there is no logic change anywhere: no condition,
no arithmetic, no draw order and no control flow differs.

---

### Step 3 — Iterate the board in board order, from the state

Status: committed

Notes: A first attempt implemented `nodeSquares` and converted every call
site as specified, and blocked at `npm test` with 7 pre-existing tests
failing in `src/rules/ply.test.ts` and `src/game/session.test.ts`. The
diagnosis was right and is now **D19**: those fixtures used an off-list
square as an isolation trick, which this step deliberately removes. The
agent correctly refused both available workarounds — editing tests the step
forbade it to touch, and filtering `nodeSquares` against D8 — and escalated.
The step now carries the fixture repair explicitly.

Second attempt: verified the first attempt's `nodeSquares`, call-site and
step-6-snapshot changes were already correct against the plan and D8/D16,
made no changes to them, and repaired the seven fixtures per D19. In
`ply.test.ts`: the two lone-depleted-node tests (E6) got a level of 40 (well
above the recovery table's maximum of 8) and their assertions narrowed from
whole-record equality to the node's square set plus its `state`; the
lone-charged-node test (K8) had its assertion narrowed to `state` only,
since drain now always moves its level; the two flown-over-inactive tests
(I8) gained five charged filler nodes (C3, F3, C6, F6, C9 — mutually
non-adjacent interior squares) so the charge draw has no shortfall, plus set
I8 to `PRESSURE_CAP` so the pressure step also skips it, which let their
existing deep-equality assertions survive unchanged; and the multi-move-plus-fight
test raised I8's level from 0 to 50 (matching H8) and narrowed its assertion
to `state`, with the header comment rewritten to explain the board the test
now states instead of the retired immunity trick. In `session.test.ts`, the
one failing case (`H9` landed on directly, inactive with the default level 0) was crashing `drawWeightedIndex` on a zero-weight singleton pool; fixed
with the same five filler charged squares, which is sufficient there since
the test only compares two independently-computed states for equality and
asserts nothing about node values. No other test was edited, and the rest of
the suite (895 tests, unchanged) was re-run to confirm the iteration-order
change moved nothing else. Final count: 902 tests passing, `npm run
typecheck`, `npm run lint` and `npm run format:check` all clean. No
deviation from the plan or from D19 beyond the specific squares and levels
chosen, which D19 left to the implementer.

Add `nodeSquares(state)` to `src/rules/gameState.ts`, beside `nodeStatusAt`:
every square that currently holds a node, in board order, built by walking
`ALL_SQUARES` (from `src/rules/board.ts`, already row-major) and keeping the
squares present in `state.nodes`. See **D8** for why board order and not
`Object.keys`.

Then replace every walk of the fixed square list with it:

- `src/rules/endOfTurn.ts` — step 3 (drain), step 5 (pressure), step 6
  (recovery).
- `src/rules/chargeDraw.ts` — both the charged count and the inactive pool.
- `src/rules/energy.ts` — `chargedNodesHeldBy` and
  `depletedNodesOccupiedBy` (their doc comments say "in `SITES` order";
  they now say "in board order").

Restructure step 6 of `runEndOfTurn` at the same time, per **D16**: instead
of capturing a `Set` of names at entry and filtering a live walk, capture at
entry an **ordered array** of the squares that were depleted before the ply
began (board order), and iterate that array, re-reading each square's
current status as it goes and skipping any that is no longer depleted. This
is a no-op today — nothing is added to or removed from the board during the
sequence — and it is the structure Step 6 requires once replacements are
written mid-loop. Doing it now, while it is provably equivalent, is the safe
moment; doing it inside Step 6 would mix a restructure with a behaviour
change.

For the same reason, steps 3 and 5 each take their ordered snapshot once at
the top of the step rather than recomputing inside the loop.

After this step, `FIXED_NODE_SQUARES` is used only by `dealOpeningBoard` and
by tests. It is deleted in Step 5.

**This step is bit-for-bit behaviour preserving**, and that is the point of
it. `FIXED_NODE_SQUARES` is already in exactly the order `nodeSquares` will
produce (D8), and until Step 5 the deal writes nodes on exactly those
seventeen squares, so every draw happens in the same order from the same
seed and every game replays identically.

Depends on: Step 2 (the names it uses).

Verification (automated): Run `npm test`. Every test must pass. Apart from
the seven fixtures D19 names, no test may be edited — in particular
`src/rules/seededReplay.test.ts`, `src/rules/nodePool.test.ts`,
`src/rules/openingBoard.test.ts` and `src/rules/fullGame.test.ts`, all of
which would break on any change to draw order. Add unit tests for
`nodeSquares` in `src/rules/gameState.test.ts`: it returns board order for a
hand-built board; it returns only squares present in `state.nodes`; it
returns an empty list for an empty board; and — the property D8 exists for —
building the same board with its record keys inserted in scrambled order
produces the same result.

**Repair the fixtures this step invalidates (D19).** Seven tests in
`src/rules/ply.test.ts` and `src/game/session.test.ts` place a node on a
square outside the seventeen to make it immune to the end-of-turn sequence.
That immunity is an artefact this step deliberately removes. Repair them as
D19 sets out — five charged nodes to suppress the charge draw, an inactive
node under test at `PRESSURE_CAP`, `state`-level assertions where a level
must move — and do not add a filter to `nodeSquares` to keep them passing.

These seven are the **only** tests this step may touch, and only in the ways
D19 describes. Any other test that starts failing means the iteration order
moved, which is a real regression: stop and report it rather than editing
the test.

---

### Step 4 — `nodePlacement.ts`: where a node may appear, and drawing one

Status: committed

Notes: Added `src/rules/nodePlacement.ts` exporting `legalNodePool`
(occupied node squares, ship squares and an optional excluded square in,
the legal pool in board order out, falling back to every non-bay
unoccupied square when the ordinary pool is empty, and throwing a
`RangeError` if even that is empty), `drawNodeSquare` (the same inputs plus
a seed, drawing uniformly via `drawIndex`), and `drawNodeSquareForState`
(the thin `GameState` convenience wrapper per D13, reading `nodeSquares`,
`state.ships` and `state.randomSeed`). The ring exclusion is expressed as
`EXCLUDED_EDGE_RINGS = 2` and a `distanceFromEdge` helper rather than four
literal comparisons; adjacency is Chebyshev distance 1 via a column-index
lookup. No planet/bay-adjacency constraint was added (D7). Added
`src/rules/nodePlacement.test.ts` covering the empty-board pool (exactly
C3–M13), board ordering, each of the five constraints biting alone
(node-occupied, ship-occupied, outer edge, one in from edge, orthogonal and
diagonal adjacency), the excluded square being absent from both the
ordinary and fallback pools, the fallback firing with base cover only (one
test, per the owner), the `RangeError` when even the fallback is empty, and
the draw's uniformity/determinism/seed-advancement/exclusion, plus the
`GameState` wrapper matching the equivalent direct call. Nothing outside
the two new files was touched; the full suite (919 tests, 902 pre-existing
plus 17 new) passes unchanged, alongside `npm run typecheck`,
`npm run lint` and `npm run format:check`. No deviation from the plan.

Add `src/rules/nodePlacement.ts` — a new module beside `nodes.ts`, not
inside it, because it is about the board's geometry rather than about a
node's clock. It exports two things and is wired into nothing yet.

**The legal pool.** The squares a new node may occupy. Built by walking
`ALL_SQUARES` in board order and applying §3.2's six constraints, so the
pool's order never depends on how the game got here:

1. the square holds no node already;
2. no ship stands on it;
3. it is not on the outer edge (row 1 or 15, column A or O);
4. it is not one square in from the edge (row 2 or 14, column B or N);
5. it is not orthogonally or diagonally adjacent to a square that holds a
   node.

There is no planet or bay adjacency constraint — out of scope, **D7**. Do
not add one, and do not treat its absence as an oversight.

Plus an optional square to exclude — the retiring node's own (**D15**).

Constraints 3 and 4 leave the interior C3–M13, 121 squares. Express the ring
depth as a named constant rather than four literal comparisons.

**The fallback.** If the pool is empty, build it instead from the squares
that hold no node and are not a bay, still honouring the excluded square
(**D14**). This is the whole relaxation at once. If even that is empty,
throw a `RangeError` naming the situation.

**The draw.** A seed and the inputs in, a square and the next seed out,
using `drawIndex` over the pool. **Uniform** — a new node has no pressure to
weight by, exactly as the opening deal's charged draw is uniform today — and
exactly one seed step per draw. `Math.random` is banned in game code
(`CLAUDE.md`, and eslint enforces it); every draw comes from the seed.

**Inputs, not a `GameState`.** Per **D13**, the builder takes the nodes
placed so far and the squares ships occupy, so the opening deal can use it
before a state exists. Add a thin convenience over a `GameState` for the
end-of-turn caller.

Add `src/rules/nodePlacement.test.ts` covering:

- the pool on an empty board is exactly the 121 squares C3–M13;
- **each constraint bites on its own**, with a state built so that it is the
  only thing excluding the square under test: a square holding a node; a
  square under a ship; a square on the outer edge; a square one in from the
  edge; a square orthogonally adjacent to a node, and one diagonally
  adjacent to a node;
- the excluded square is absent from the pool, and absent from the fallback
  pool too;
- the pool is in board order;
- the draw returns a member of the pool, advances the seed exactly once, and
  returns the same square for the same seed and inputs;
- **base cover for the fallback**: with a node on every one of the 121
  interior squares the ordinary pool is empty, so the fallback fires and
  returns a square that holds no node and is not a bay. One test; the owner
  has said explicitly this path is not worth building a scenario generator
  around.

Depends on: Step 3 (`nodeSquares` and the state shape), Step 2 (the names).

Verification (automated): Run `npm test` and confirm
`src/rules/nodePlacement.test.ts` passes with every case above, and that the
rest of the suite is untouched — nothing consumes this module yet, so
nothing else may change.

---

### Step 5 — Deal fifteen nodes at drawn squares

Status: committed

Notes: Rewrote `dealOpeningBoard` to `(shipSquares, seed) => [nodes, nextSeed]`
per D13, deleted `FIXED_NODE_SQUARES`, and added `NODE_COUNT = 15`. The deal
draws 5 charged squares one at a time via `legalNodePool`/`drawIndex`
(recomputing the pool against the squares placed so far each time), then 10
inactive squares the same way, then walks the fifteen dealt squares in board
order (via `ALL_SQUARES`) for one `drawTableAmount` call each — 5 + 10 + 15 =
30 seed steps, as specified. `nodes.ts` now imports `legalNodePool` from
`nodePlacement.ts`, which itself imports `nodeSquares`/`GameState` from
`gameState.ts`, which imports `dealOpeningBoard` from `nodes.ts` — a
three-module import cycle — but every cross-reference is used only inside a
function body, never at module-init time, so it compiles and runs correctly
(confirmed by `npm run typecheck` and the full suite); this was not
mentioned by the plan and is recorded here as a fact worth knowing rather
than a deviation, since nothing about the module's shape changed to cause
it. `startingGameState` now builds the fleet before dealing and passes
`ships.map(ship => ship.square)` into `dealOpeningBoard`, unchanged in its
own signature. Updated the doc comments the step named: `nodes.ts`'s module
comment and `dealOpeningBoard`'s own doc, `OPENING_PRESSURE_TABLE`'s "twelve
sites" to "ten nodes", `startingGameState`'s "five of the seventeen … 22
steps" to "five of the fifteen … 30 steps", `energy.ts`'s "twelve of the
seventeen" bound comment to "ten of the fifteen", and
`seededReplay.test.ts`'s header ("22 steps — five node draws and seventeen
level draws" to "30 steps — fifteen square draws and fifteen level draws").
`chargeDraw.ts`'s module comment already said "in board order" from Step 3
and needed no change, unlike what the step's checklist implied.

Repaired every test the signature and count change broke. In
`nodes.test.ts`: deleted the "nodes" describe block (fixed seventeen-square
count, mirror symmetries, bay-disjointness, the §3.2 table match) — this
coverage is genuinely gone, not weakened, since there is no fixed list left
to assert any of that about. Rewrote "dealing the opening board" around
fifteen/five/ten, added a new "every dealt square is legal under §3.2 …
over many seeds" test (interior membership, off-ship, no two adjacent),
dropped the old per-square "close to 5/17" charge-share assertion (no
longer meaningful once squares are drawn) in favour of keeping the
level-frequency assertion, and added a new "spreads across the whole legal
interior" test with bounds measured over 3,000 deals (45,000 placements: all
121 interior squares seen at least once; each quadrant's share ~0.206-0.210,
the unclaimed centre row/column ~0.167) — asserted with generous margin
(quadrant share between 0.15 and 0.3, at least 110/121 squares seen).
Reduced the level-frequency test from 20,000 to 3,000 deals, noted in a new
comment, because each deal now costs a `legalNodePool` scan per placement
rather than a constant-array lookup and 20,000 deals timed out the default
5s test budget; 3,000 deals still gives tens of thousands of level draws,
plenty for the existing 3% margin. In `gameState.test.ts`,
`openingBoard.test.ts`, `fullGame.test.ts`, `energy.test.ts`,
`endOfTurn.test.ts` and `nodePool.test.ts`: updated every `dealOpeningBoard`
call site to the new two-argument form (passing `startingFleet(7)`'s
squares, or an empty/explicit ship list where the test builds its own
state), replaced every `FIXED_NODE_SQUARES` read with `nodeSquares(state)` (where a
real dealt/live state is at hand — `fullGame.test.ts`'s greedy policy,
`nodePool.test.ts`'s counters, `openingBoard.test.ts`'s run-to-completion
test), `Object.keys(state.nodes)` (`endOfTurn.test.ts`'s lockstep guard,
`openingBoard.test.ts`'s charge-draw-favours-pressure test), or `ALL_SQUARES`
(where the test only wanted "board order" as a fact about the board, not
about a particular deal — `energy.test.ts`'s two ordering assertions), updated
17-node/12-inactive counts to 15/10, and replaced
`fullGame.test.ts`'s `FIXED_NODE_SQUARES.slice(0, 5)` regression fixture with
five explicit interior squares (`C3`, `F3`, `C6`, `F6`, `C9`) per the step's
instruction. `gameState.test.ts`'s "agrees with nodeStatusAt" test, which
hardcoded H8/F2/K5, now iterates `nodeSquares(state)` instead, since those
three squares are no longer guaranteed to hold anything. `nodePool.test.ts`
was repaired minimally as instructed (not polished ahead of Step 8):
`countInState` now reads `nodeSquares(state)` instead of the fixed list, and
`runEconomy`/`chargeStats` were restructured to capture the dealt board's own
node names once at the top of a run (since retirement/replacement has not
landed yet, a run's node squares are still fixed for its whole length) rather
than assume a module-level constant list; its stale "seventeen"-based doc
comments were deliberately left for Step 8, per the step's own instruction
not to invest in polishing this file now. `Board.test.tsx`'s
`STATED_NODE_STATES` fixture (an arbitrary hand-built board, already
independent of `FIXED_NODE_SQUARES`) needed only its comment corrected to
stop citing a §3.2 table that no longer exists; its one direct
`FIXED_NODE_SQUARES` read (the gradient-id-count test) and the "nodes on the
starting board" block's separately hardcoded seventeen-square list were both
replaced with `Object.keys(STATED_NODE_STATES)`, so the tests now state the
board's shape from the fixture itself rather than from a second, drifting
copy of it.

`npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
(915 tests, down from 919 before this step: the "nodes" describe block's six
tests describing the fixed seventeen-square list were deleted outright as
coverage that no longer applies, and two tests were added to "dealing the
opening board" — "every dealt square is legal under §3.2 … over many seeds"
and "spreads across the whole legal interior" — for a net of four fewer)
all pass. No deviation from the plan beyond the specifics above, all of
which were left to the implementer's judgement by the step's own wording
("Repair, in this step, whatever this step breaks").

Rewrite `dealOpeningBoard` in `src/rules/nodes.ts` to deal **fifteen nodes**
at drawn squares instead of seventeen statuses at fixed ones, and delete
`FIXED_NODE_SQUARES` (**D10**).

Add a `NODE_COUNT` constant of **15** to `nodes.ts`. The charged count stays
`TARGET_CHARGED_NODES` (5); the inactive count (10) is derived, not a second
constant that can drift.

**The draw order is fixed and must stay fixed**, because it is what lets a
recorded game replay:

1. **Five charged squares**, drawn one at a time from the legal pool, the
   pool recomputed before each draw so each placement respects the ones
   before it.
2. **Ten inactive squares**, drawn the same way, from the pool the five have
   already narrowed.
3. **One level for each of the fifteen**, walking them in **board order**
   (not charged-then-inactive): one `drawTableAmount` call each, from the
   opening drain table if that node is charged and the opening pressure
   table if it is inactive.

That is **30 seed steps** before green's first turn, where the old deal took 22.

Per **D13**, `dealOpeningBoard` takes the ships' squares, and
`startingGameState` builds the fleet before dealing so it can pass them.
`startingGameState`'s own signature is unchanged, and it still stores the
advanced seed.

Update the doc comments this invalidates: `OPENING_PRESSURE_TABLE`'s "twelve
sites", `startingGameState`'s "five of the seventeen … 22 steps",
`energy.ts`'s "twelve of the seventeen … can be depleted at once" bound
comment, `chargeDraw.ts`'s module comment, and `seededReplay.test.ts`'s
header (22 → 30 steps; five square draws and seventeen level draws → fifteen
square draws and fifteen level draws).

**Repair, in this step, whatever this step breaks.** Known:

- `src/rules/nodes.test.ts` — delete the tests of a fixed seventeen-square
  list (the count, the mirror symmetries, the disjointness from bays, the
  row-by-row table match); they described a constant that no longer exists.
  Replace the deal block per the verification below.
- `src/rules/openingBoard.test.ts` — its "charges every one of the seventeen
  sites at least once" assertion is not true of a board whose squares
  change. Replace it with something that is: over the run every node the
  deal charged eventually runs out, at least one depleted node completes
  recovery, the board ends at five charged, and the charge draw charged a
  healthy number of distinct squares.
- `src/board/Board.test.tsx` — its hand-transcribed seventeen-site board and
  its "draws a marker on exactly the seventeen sites from §3.2" test must
  become a board the test states for itself.
- `src/rules/fullGame.test.ts` — the "five depleted nodes" regression test
  builds its board from `FIXED_NODE_SQUARES.slice(0, 5)`; give it five
  hand-named interior squares instead.
- `src/rules/nodePool.test.ts` — repair **minimally** to keep the suite
  green (its counts and its per-square expectations). It is rewritten
  properly in Step 8; do not invest in polishing it here.

Depends on: Step 4 (the pool and the draw), Step 3 (the board-order walks
that let the rest of the engine cope with nodes on arbitrary squares).

Verification (automated): Run `npm test`. New tests in
`src/rules/nodes.test.ts` must show:

- a dealt board has exactly **fifteen** nodes: five charged, ten inactive,
  none depleted;
- **every dealt square is legal under §3.2** — inside C3–M13, not under a
  ship, no two adjacent to each other — checked across many seeds;
- charged levels all come from the opening drain table and inactive levels
  all from the opening pressure table, and no dealt charged node exceeds
  two-thirds of capacity;
- the same seed deals the same board and the same next seed; a different
  seed deals a different board;
- the deal advances the seed by exactly **30** steps, and
  `startingGameState`'s resulting state carries the advanced seed;
- over many deals the fifteen positions **spread across the whole legal
  interior** rather than favouring a region: nearly all of the 121 interior
  squares are used at least once, and each quadrant of the interior takes a
  reasonable share. Measure the actual figures first and set the bounds with
  generous margin, as the existing long-run tests in this repository do —
  the adjacency rule gives squares near the interior's edge slightly more
  chance than squares in its middle, so this must not be asserted as strict
  uniformity.

`npm run typecheck`, `npm run lint` and `npm run format:check` must also
pass.

---

### Step 6 — Retirement and replacement

Status: committed

Notes: `runEndOfTurn`'s step 6 now removes a retiring node's entry from
`state.nodes` before building the replacement pool (D15), draws the
replacement via `nodePlacement.drawNodeSquare` excluding the retiring
square, and writes the new entry at `inactive`/`STARTING_PRESSURE`; two
retirements in the same sequence are handled one after another against the
board-order snapshot Step 3 introduced (D16), each complete before the next
begins, confirmed by a dedicated test. `node-went-inactive` is replaced by
`node-replaced` (`retiredSquare` + `newSquare`) throughout
`src/rules/endOfTurn.ts` and `src/board/announcements.ts` (still producing
no clause, per the step — Step 7's job). Per D20, deleted
`drawNodeSquareForState` and the `gameState`/`GameState` import from
`src/rules/nodePlacement.ts`; `endOfTurn.ts` now calls `drawNodeSquare`
directly with `nodeSquares(workingState)` and the ships' squares.
`nodePlacement.ts` imports only `board`, `bays` and `random`; `madge
--circular` over `src/` shows only the pre-existing, unrelated
`gameLength.ts` <-> `gameState.ts` cycle, confirming the
`nodes.ts` -> `nodePlacement.ts` -> `gameState.ts` -> `nodes.ts` cycle is
gone. Repaired the tests this step's own change invalidates:
`src/rules/endOfTurn.test.ts` (the recovery-completion block rewritten
around retirement/replacement, plus new tests for legality of the
replacement square, node count staying at fifteen, two retirements in one
sequence being neither adjacent to each other nor to a survivor in board
order, and the two-clock timing across a retirement), `src/rules/camping.test.ts`
(the depleted-node-outlasts-recovery scenario rewritten as
retire-and-replace, with the new case the step asked for — a ship on a
retiring node keeps its square and power and stops paying the depleted-node
penalty once the square is ordinary), `src/rules/nodePlacement.test.ts`
(deleted the `drawNodeSquareForState` describe block), and
`src/rules/openingBoard.test.ts` ("recovers a depleted node to inactive"
restated as "retires and replaces a depleted node"; its "every dealt node
charged at least once" check was quietly wrong for the five nodes the deal
opened already charged, since they retire and vanish without ever raising
a `node-charged` effect of their own — fixed to credit them from the
already-captured opening-charged set instead of only from observed
effects, which is what "charged at least once" actually means once a
square's identity does not survive a retirement).

One further repair beyond the step's own list, needed once retirement
actually reshuffles the board over a long run:
`src/rules/nodePool.test.ts`'s "bounds how long any node can wait between
charges" tracked wait times **per fixed square** across the whole run — a
premise this step genuinely removes, not weakens, since a square's identity
no longer persists across a retirement. Restated as what is now true: the
wait is tracked per node **life** (from appearing inactive, whether dealt or
replaced, to being charged), carrying the same numeric bound forward
unchanged, plus a coarse total-charges floor in place of the old
per-square-charged-twice check (Step 8 is where this file gets its proper
long-run rewrite; this is a minimal, honest repair, not that rewrite).
`src/rules/nodePool.test.ts` and `src/rules/openingBoard.test.ts` were not
in the step's own "known" list but broke for the reasons above once the
lifecycle change was real rather than theoretical.

`npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
(917 tests, unchanged count from Step 5 net of the deletions and additions
described above) all pass. No deviation from the plan's rule content;
the deviations above are all test-repair judgement calls the step and D19's
sibling reasoning left to the implementer.

Change §8.6 step 6 in `src/rules/endOfTurn.ts` so that a depleted node whose
recovery reaches zero or below **leaves the board** and is replaced by one
new inactive node elsewhere, rather than going inactive in place.

For each square in the ordered list of nodes depleted before the ply began
(the snapshot Step 3 introduced), in board order:

- draw the recovery amount exactly as today, from
  `DEPLETED_RECOVERY_TABLE`, advancing the seed;
- if the level stays above zero, write it back as today;
- otherwise: **remove** the entry from `state.nodes`; **draw** a replacement
  square with `nodePlacement`'s draw, passing the retiring square as the
  square to exclude (**D14**, **D15**), advancing the seed; and **write** a
  new entry at that square with state `inactive` and level
  `STARTING_PRESSURE`.

Two retirements in one sequence are handled one after the other, each
complete before the next begins, so the second placement sees the first
replacement (**D16**).

Replace the `node-went-inactive` effect with a **`node-replaced`** effect
carrying **both** squares — the one that ended and the one that appeared.
They are one event, and the announcement (Step 7) reads better as one clause.
`node-ran-out` (charged → depleted) is unchanged, as is every other step of
the sequence: nothing about drain, pressure, energy, power or the charge
draw moves.

To keep `src/board/announcements.ts` compiling and its tests passing,
`node-replaced` gets a `case` in `endOfTurnClauses`'s switch that produces
**no clause**, exactly as `site-went-active` did. Step 7 gives it one. This
keeps the state change and the wording as two separately verifiable steps.

**Repair, in this step, whatever this step breaks.** Known:

- `src/rules/endOfTurn.test.ts` — the recovery-completion cases.
- `src/rules/camping.test.ts` — "a ship on a depleted node outlasts
  recovery, then a charge" no longer describes what happens: the node the
  ship is camped on now vanishes from under it. Rewrite it as the new
  behaviour, and add the case it exposes: a ship standing on a retiring
  node keeps its power, its square and its legality, and simply stops paying
  the depleted-node energy penalty, because the square is now ordinary.
- `src/rules/openingBoard.test.ts` — "recovers a depleted node to inactive"
  becomes "retires and replaces a depleted node".
- `src/rules/nodePool.test.ts` — minimal repair only; Step 8 rewrites it.

**Break the import cycle (D20).** Delete `drawNodeSquareForState` and the
`gameState` import from `src/rules/nodePlacement.ts`, and have the
end-of-turn caller pass `nodeSquares(state)` and the ships' squares to
`drawNodeSquare` directly. This removes the
`nodes.ts` → `nodePlacement.ts` → `gameState.ts` → `nodes.ts` cycle Step 5
introduced, and leaves `nodePlacement.ts` importing only `board`, `bays`
and `random`. Confirm no module under `src/rules/` imports `gameState.ts`
from `nodePlacement.ts` afterwards.

Depends on: Step 5 (nodes already live at drawn squares), Step 4 (the draw),
Step 3 (the ordered snapshot).

Verification (automated): Run `npm test`. New tests, driven through
`runEndOfTurn` on hand-built states, must show:

- a depleted node whose recovery reaches zero is **gone** from
  `state.nodes`, and exactly one new inactive node at pressure
  `STARTING_PRESSURE` exists that did not exist before;
- the replacement's square is legal under §3.2 given the board at that
  moment, and is **never** the retiring node's own square;
- the node count is unchanged across the retirement — fifteen before,
  fifteen after;
- two nodes retiring in the same end-of-turn sequence produce two
  replacements, and the second is adjacent neither to the first nor to any
  surviving node;
- a `node-replaced` effect is emitted carrying both squares, in the position
  in the effect list where step 6 runs;
- a node that appears in step 6 of turn N is **first eligible in turn N+1's
  charge draw, at pressure 1** — it is not charged by turn N's draw (which
  has already run) and is not given a pressure point by turn N's step 5;
- a node charged in step 4 of turn N still first drains in step 3 of turn
  N+1 (unchanged, but re-assert it: step 6 now writes to the node record
  mid-sequence);
- a ship standing on the retiring node is untouched — same square, same
  power — and pays no further depleted-node penalty.

---

### Step 7 — The end-of-turn announcement says a replacement

Status: committed

Notes: Added a `case "node-replaced"` clause to `endOfTurnClauses` in
`src/board/announcements.ts` producing
`"The node at <retiredSquare> is gone, and a new node appeared at
<newSquare>."`, and reworded the switch's doc comment (previously explaining
why `node-replaced` produced no clause yet) to explain why it now speaks,
alongside `node-charged`. Renamed and rewrote the "says nothing at all for a
node being replaced yet" test to assert the new sentence, added a second
test for two `node-replaced` effects in one sequence producing two clauses in
effect order, added a third test asserting a `node-replaced` clause follows a
`node-charged` clause when both are present, and extended the existing "full
end-of-turn sequence" test's fixture and expectation with a `node-replaced`
effect after `node-ran-out`. No deviation: the suggested wording was used
verbatim, since it read fine next to the neighbouring clauses; clause
position is driven entirely by the order effects appear in the `effects`
array (as with every other clause), so the switch's own case ordering carries
no behavioural weight and was placed after `node-charged` for readability
only. `npm run typecheck`, `npm run lint`, `npm run format:check` all clean;
`npm test` — 919 tests (up from 917), all passing.

Give `node-replaced` a clause in `src/board/announcements.ts`'s
`endOfTurnClauses`, naming both halves in one sentence — the node that ended
and the square the new one appeared at.

Why it speaks when its predecessor did not: `site-went-active` produced no
clause because an inactive site was an invisible bookkeeping change. A node
appearing at a new square is a visible change to the map and to where the
next race will be, so it speaks. Update the doc comment on
`endOfTurnClauses` that currently explains the old silence.

Suggested wording, in the players' vocabulary ("turn" and "node", never
"ply"), to be settled by the implementer if it reads badly next to the
neighbouring clauses:

> The node at D8 is gone, and a new node appeared at K11.

It must not repeat "ran out" — `node-ran-out` already says that, for the
earlier moment when the node went from charged to depleted.

Depends on: Step 6 (the effect and its two squares).

Verification (automated): Run `npm test` with new cases in
`src/board/announcements.test.ts`: a sequence carrying one `node-replaced`
produces exactly one clause naming both squares; a sequence carrying two
produces two clauses, in the order the effects arrived; the clause sits in
the sequence's clause order where step 6 runs, after the charge-draw clause;
and a sequence carrying none is unchanged.

---

### Step 8 — The long-run invariants

Status: committed

Notes: Rewrote `src/rules/nodePool.test.ts` (13 → 32 tests) around fifteen
mortal nodes. `runEconomy` now also records each ply's node count and its
ordered `node-replaced` effects (both squares), which feeds four new
hard-invariant checks alongside the recalibrated statistical ones: the
board holds exactly fifteen nodes at every ply; every appearance — the
deal's fifteen (checked pairwise against each other and the fleet via
`legalNodePool`) and every replacement (checked by rebuilding the board
exactly as `endOfTurn.ts` does — retiring square removed, then the pool
drawn — and confirming the written square was a member, and that it is
never a bay); the charged count never exceeds five and is back at five by
the run's end (a shortfall is tolerated, not asserted against, per the
step); and a new "spreads across the whole legal interior" test over the
set of squares ever occupied (deal plus every replacement across all
seeds), mirroring `nodes.test.ts`'s deal-spread test but for the churning
board. Every numeric bound was re-measured rather than carried over,
using this file's own `runEconomy` at `PLIES_TO_RUN = 500` over `SEEDS`
(five literal seeds, chosen — per the step's runtime guidance — over more
plies rather than more seeds, since a replacement now costs a pool scan):
measured minimum inactive count 5 (floor set to 3, down from 4), measured
maximum multi-expiry share 2.4% (bound kept at 10%), measured maximum
expiries in one ply 3 (bound kept at `TARGET_CHARGED_NODES - 1`), measured
maximum wait-between-charges 162 turns for these seeds and up to 257 in an
ad hoc forty-seed/800-ply sweep (bound kept at 400), measured minimum
total charges 85 (floor kept at 40), measured distinct interior squares
occupied 116 of 121 (floor set to 100), and the steady-state means
(~1.88 depleted, ~8.12 inactive) rewritten with new bounds (0.5–4 and
6–10) replacing the stale seventeen-site-era "two or three depleted, nine
or ten inactive" wording and numbers. The economy matches Appendix B's
prediction well: charged never fell below or above five in any run
measured (three seeds up to 500 plies, five seeds up to 500 plies, ten and
forty seeds up to 800 plies, tens of thousands of ply-samples total), so
"reaches five and recovers after a shortfall" is written to tolerate a
shortfall without the long run ever actually needing to exercise one — no
economy defect was found; every invariant the story asks for held with
comfortable margin in measurement. Extended `src/rules/seededReplay.test.ts`
per D18: added a `replacedNodes` field to `PlayedGame` (both squares of
every `node-replaced` effect, in order, via a new `replacedNodes` helper
mirroring `chargedSquares`), included it in the same-seed equality check,
the different-seed divergence check, and the non-vacuity floor (measured 10
replacements for seed 20260819 over forty rounds; floor set to 5), and
corrected the header comment to describe this new consumer of the seeded
stream. Confirmed `fullGame.test.ts` and `openingBoard.test.ts` still pass
unchanged (not part of this step's edits — both already updated in Steps 5
and 6). `npm run typecheck`, `npm run lint`, `npm run format:check` and
`npm test` (938 tests, up from 919: +19 in `nodePool.test.ts`, unchanged
count in `seededReplay.test.ts`) all pass; full suite runtime ~59s, this
step's two files together run in about 5s. No deviation from the plan
beyond the specific bound values and seed/ply counts, which the step left
to the implementer's measurement.

Rewrite `src/rules/nodePool.test.ts` around fifteen mortal nodes. The
existing file drives `runEndOfTurn` for 500 plies from a dealt board over
several seeds with no ship activity, and asserts a steady state Appendix B
predicted for seventeen immortal sites. Most of what it asserts no longer
means anything: "every one of the seventeen sites is charged at least twice"
is about squares, and squares no longer persist.

What it should assert instead, over the same several-hundred-ply, several-seed
run:

- the board holds **exactly fifteen** nodes at every ply, whatever the seed;
- every node's square is **legal under §3.2 at the moment it appears** —
  both the fifteen the deal placed and every replacement — checked against
  the board as it stood at that moment;
- no square ever holds both a node and a bay;
- the **inactive pool stays populated**: Appendix B now predicts about 7½
  inactive, 5 charged and about 2½ depleted. Set a floor well below the
  prediction, measured with margin, so this fails only if the economy
  actually collapses;
- the board reaches five charged and **recovers to five** after a shortfall;
  a shortfall itself is legal and must not be asserted against;
- expiries stay spread rather than arriving together — keep the existing
  multi-expiry share and single-ply maximum bounds, re-measured for fifteen
  nodes;
- **no node waits unboundedly long** between appearing and being charged
  (measured per node, from its appearance, not per square) — this replaces
  the old per-square "charged at least twice" bound;
- the set of squares occupied over the run is **genuinely spread** across
  the legal interior rather than clustering in a region.

Also in this step (see **D18**): update `src/rules/seededReplay.test.ts` —
re-confirm its three non-vacuity floors still clear with margin under
fifteen mortal nodes and raise or lower them if the measured figures say so;
re-confirm the two chosen seeds still diverge, picking another pair if not;
extend the per-game trace it compares to include the sequence of
`node-replaced` effects, since the placement draw is a new consumer of the
seeded stream and should be shown to replay; and correct the file's header
comment.

Confirm `src/rules/fullGame.test.ts` and `src/rules/openingBoard.test.ts`
still run to completion and still assert things that are true of a board
whose squares change.

Measure before you assert. Every bound in these files should be a measured
figure with generous margin, and the comment above it should say what was
measured, as the current file's comments do.

Depends on: Step 6 (the full lifecycle must exist before it can be run for
hundreds of plies), Step 5 (the deal).

Verification (automated): Run `npm test`. `nodePool.test.ts`,
`seededReplay.test.ts`, `openingBoard.test.ts` and `fullGame.test.ts` all
pass, and the full suite passes. Each bound's comment states the measured
figure it leaves margin above or below.

---

### Step 9 — Play it

Status: committed

Notes: Verified by the owner in the running app. Checks 1, 2, 3 and 5 all
pass by eye: fifteen markers at the opening, five charged and ten inactive,
none outside C3-M13, none touching another and none in a bay; a different
board every game, spread across the interior; a node observed ending and a
new one appearing elsewhere, with the vacated square reading as ordinary;
and still fifteen after several retirements. Check 4, the wording of the
replacement announcement, was deliberately not judged — the announcement
reaches only the live region, which makes it assistive-technology surface,
and `CLAUDE.md` defers that work pre-release. The clause's tense
inconsistency with its sibling clauses is therefore knowingly accepted and
goes to the accessibility ledger in Step 10, not fixed here.

The owner runs the app and looks at the board. Nothing to implement; this is
the gate where the change is judged by eye rather than by assertion.

Depends on: Step 7 (the announcement is part of what is being judged).

Verification (manual): Run `npm run dev` and open the app.

1. **The opening board.** Start a new game. Count the node markers: there
   should be **fifteen**, five gold (charged) and ten dim (inactive). None
   on the outer two rings of squares — nothing outside the block from C3 to
   M13. None touching another, orthogonally or diagonally. None in a bay.
   (A node next to a bay, and so next to its planet, is not possible under
   the ring rules and is not separately forbidden — see D7.)
2. **A different board every time.** Start several new games. The fifteen
   squares should differ every time, and over a handful of games the nodes
   should appear all over the interior rather than favouring one region.
3. **A node ending and a new one appearing.** Play on. A node takes roughly
   twenty turns to run out and then roughly ten more to finish its depleted
   spell, so expect to play **about thirty turns** before the first
   retirement — moving one ship back and forth is enough. Watch for the
   announcement saying a node is gone and a new one has appeared elsewhere.
   Confirm on the board that the marker vanished from the first square, that
   a dim inactive marker appeared at the second, and that the square the
   node left now reads as an ordinary empty square.
4. **The announcement.** Confirm the replacement reads as one sentence
   naming both squares, and that it sits sensibly among the other
   end-of-turn sentences.
5. **The board stays at fifteen.** After several retirements, count again:
   still fifteen markers.

---

### Step 10 — README, the accessibility ledger, and the closing sweep

Status: committed

Notes: Rewrote `README.md`'s "Nodes do not last" paragraph and the Status
block in the player's terms — fifteen nodes, five charged, a depleted node
disappearing and a new inactive one being born elsewhere at a random square,
the vacated square going back to being ordinary, and the map at the end of a
long game not matching the one it opened on — reflowing both blocks by hand
since prettier's default `proseWrap: preserve` does not rewrap markdown
prose. Added one section to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, "From story 54",
recording the `node-replaced` clause's present/past tense mismatch as
knowingly accepted per the owner's Step 9 decision, with the consistent
alternative noted. Judged the story's other named candidate — a square's
accessible name silently changing while nobody is on it — and found nothing
to record: the transition is not silent, it is narrated by the same
end-of-turn live-region mechanism that already narrates `node-charged` and
`node-ran-out` (pre-existing, unaffected by this story), so this story adds
no new class of loss beyond what the ledger already covers. One deviation
beyond the three named tasks: the closing grep sweep turned up a genuine,
unlisted "site" occurrence in `src/rules/nodePool.test.ts`'s module comment
("the old seventeen fixed sites", "the seventeen-site board"), left behind by
Step 8, plus a `CONTRIBUTING.md`-violating "Since story 54" reference in the
same comment; both were rewritten in place (no rule or behaviour change,
comment only) since D3 and the sweep's own grep requirement are
unconditional and this was squarely within Step 10's remit to confirm and
fix. `npm test` (938 tests), `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm run build` all pass; the grep sweep confirms
no "site" or "dormant" and no word-boundary "active" (as a node state) in
`rules.md` or `src/` outside the documented false positives, no "site" or
"seventeen" in `README.md`, and `RULES_VERSION` "0.20" matching `rules.md`
and the changelog.

Three closing tasks.

**`README.md`.** It currently describes a board of seventeen fixed sites
that light and go dark in place. Rewrite it in the player's terms: nodes are
born, used up and replaced somewhere else, the map you finish on is not the
map you started on, and the board carries fifteen nodes with five of them
charged. Run `/update-readme` for the rest of the diff — it reviews the
branch diff and updates the README where warranted. Player-facing text is
written for a non-technical reader (`CLAUDE.md`); it says "turn" and "node",
never "ply", "site" or "hub".

**The accessibility ledger.** Per `CLAUDE.md`, this story does not spend
work keeping accessibility intact, and no step of this plan tests
accessibility. If any step of this story cost an accessible behaviour, add a
`## From story 54 — …` section to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` saying what was
lost, where, and a suggested direction. The likeliest candidate named by the
story is a square's accessible name changing while nobody is on it — a
square that held a node silently becoming ordinary, and an ordinary square
silently becoming a node, with only the end-of-turn announcement naming
either. If nothing was actually lost, **add nothing**: that document is not
an audit, and nothing goes in it that a story did not knowingly accept.

**The closing sweep.** Confirm the story's whole-repository verification
holds.

Depends on: Steps 1–8 (it checks their combined result).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint`, `npm run format:check` and `npm run build` — all clean. Then
confirm by grep that neither `doc/ruleset/rules.md` nor `src/` contains a
case-insensitive match for `site` or `dormant` (outside Step 2's listed
false positives), nor a word-boundary `active` used as a node state; that
`README.md` contains no "site" and no "seventeen"; and that
`RULES_VERSION` is `"0.20"` with a matching `rules.md` version and changelog
entry. The owner reads the `README.md` diff at final sign-off.

---

### Step 11 — Record the historical-documents policy in `CONTRIBUTING.md`

Status: committed

Notes: Added a new `## Historical planning documents are not rewritten`
section to `CONTRIBUTING.md`, placed between `## Comments` and
`## Dependencies` — the existing "Comments" section already points design
history at `doc/plan/`, making it the right neighbourhood. States the rule,
the narrow factual-error/should-never-have-been-committed exception, that a
new document is the normal way to correct the record, the owner-approval
requirement for an actual rewrite, and that `rules.md`, `README.md` and
`CLAUDE.md` are living documents not covered by it. No code touched. `npm run
typecheck`, `npm run lint`, `npm run format:check` and `npm test` (938 tests)
all pass. No deviation from the plan.

Add a short subsection to `CONTRIBUTING.md` stating that **historical
planning documents are not rewritten**: once a story's `story.md`,
`implementation-plan.md` and `peer-review.md` are committed, and once a
`doc/ruleset/changelog.md` entry is written, they are a dated record of what
was decided and why at that time. Later stories do not edit them to match
new vocabulary, new architecture or new rules — doing so falsifies the
record and produces large diffs no reader benefits from. A story that
believes it genuinely needs to rewrite one must get the owner's **explicit
approval** first; it is an exceptional act, not routine tidying.

Include what a reader needs to apply it: that the exception exists for cases
like a factual error or something that should never have been committed, not
for vocabulary drift; that the way to correct the record is normally a new
document rather than an edit to an old one; and that `rules.md`, `README.md`
and `CLAUDE.md` are **not** covered by this — they are living documents that
every story is expected to keep current.

Place it near the existing conventions rather than inventing a new top-level
area; the section under which the repository already describes how work is
documented is the right neighbourhood. Wording is for a contributor, not a
player.

This step is **independent of the rest of the story** — it touches no code
and no story document, and it would be equally true if story 54 had never
been written. It is here because the owner asked for it while approving this
plan (**D12**), and it is last so that it cannot interfere with the
behavioural steps or with Step 10's sweep.

Depends on: nothing. Do not let it block or reorder any earlier step.

Verification (automated): Run `npm run format:check` and confirm
`CONTRIBUTING.md` is clean (run `npm run format` if not). Confirm by reading
that the new subsection states the rule, the owner-approval exception, and
the documents it does not cover, and that it contradicts nothing already in
`CONTRIBUTING.md` or `CLAUDE.md`.
