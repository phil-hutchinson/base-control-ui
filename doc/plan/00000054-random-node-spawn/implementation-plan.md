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

Status: pending

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

Status: pending

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

Verification (automated): Run `npm test`. The entire existing suite must
pass **unchanged**, with no test edited — in particular
`src/rules/seededReplay.test.ts`, `src/rules/nodePool.test.ts`,
`src/rules/openingBoard.test.ts` and `src/rules/fullGame.test.ts`, all of
which would break on any change to draw order. Add unit tests for
`nodeSquares` in `src/rules/gameState.test.ts`: it returns board order for a
hand-built board; it returns only squares present in `state.nodes`; it
returns an empty list for an empty board; and — the property D8 exists for —
building the same board with its record keys inserted in scrambled order
produces the same result.

---

### Step 4 — `nodePlacement.ts`: where a node may appear, and drawing one

Status: pending

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

Status: pending

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

Status: pending

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

Status: pending

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

Status: pending

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

Status: pending

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

Status: pending

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

Status: pending

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
