# Story 00000054 — Nodes that move around the board

## Summary

Today the board has seventeen sites, in the same seventeen squares in every
game, and each of them cycles for ever: inactive → charged → depleted →
inactive, in place, over and over. A player who has played twice already
knows every square worth racing for before the first turn is taken.

This story ends the cycle and makes nodes **mortal and mobile**. A node's
life runs once — inactive, then charged, then depleted — and when its
depleted spell ends it is **gone**. In its place, one new inactive node
appears somewhere else on the board, chosen at random from the squares where
a node may legally appear. Over a long game the board slowly redraws itself:
the map at turn 60 is not the map at turn 1, and no map is the same twice.

What changes:

- **There are no fixed sites any more.** Section 3.2's table of seventeen
  squares, and the site concept behind it, are deleted. A node's position is
  drawn when it appears and lasts as long as the node does.
- **The board opens with fifteen nodes** — five charged, ten inactive — at
  fifteen randomly drawn squares, instead of seventeen fixed ones.
- **A depleted node retires** when its recovery reaches zero, rather than
  going inactive in place, and exactly one new inactive node appears
  elsewhere at pressure 1. One out, one in: the board carries fifteen nodes
  from the first turn to the last.
- **Where a node may appear is constrained**, so the board never becomes
  unplayable or absurd: not under a ship, not on the outer edge or one
  square in from it, and not beside another node.
- **A shortfall of charged nodes stays legal.** If the charge draw finds no
  inactive node to charge, the board simply runs below five until one
  appears. This is already the rule; it is restated because the inactive
  pool is now smaller and the case will come up more often.

Two vocabulary decisions ride along with it, both settled with the owner and
both a consequence of the change rather than a separate tidy-up:

- **"Site" is retired.** With no fixed positions left, the word describes
  nothing. Code, tests, plans and `rules.md` all say **node** — which
  `CLAUDE.md` currently reserves for player-facing text, with **hub** as the
  code word.
- **The three states are renamed** to the words that describe them:
  **inactive → charged → depleted**, replacing active → charged → dormant.
  "Active" for a node that is doing nothing was the confusing one, and this
  story is the moment to fix it, since it is already rewriting §8 and every
  file that names a state.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version
0.19**. This story takes it to **0.20** — a gameplay change, so it earns a
changelog entry and a version bump (tagging remains on hold, per
`CLAUDE.md`).

Planning documents say **ply** for the rules' and the UI's **turn**
(`CLAUDE.md`, Vocabulary).

What exists today:

- **`src/rules/sites.ts`** — `SITES` (the seventeen squares), `SiteState`,
  `NODE_CAPACITY` (60), `PRESSURE_CAP` (50), `STARTING_PRESSURE` (1),
  `TARGET_CHARGED_SITES` (5), the five `WeightedAmount` tables,
  `drawTableAmount`, `dealOpeningBoard` and `siteCyclePosition`.
- **`src/rules/gameState.ts`** — `SiteStatus` (`state` plus `level`),
  `GameState.siteStates` keyed by square name, `siteStateAt`,
  `siteStatusAt`, `dormantSiteNames`, `startingGameState`.
- **`src/rules/endOfTurn.ts`** — §8.6's six steps, three of which walk
  `SITES` in its declared order (drain, pressure, recovery), and the
  `node-ran-out` and `site-went-active` effects.
- **`src/rules/chargeDraw.ts`** — the pressure-weighted draw over the
  inactive pool, which already stops short when the pool empties, and the
  `site-charged` effect.
- **`src/rules/energy.ts`** — `chargedNodesHeldBy` and
  `dormantSitesOccupiedBy`, both filtering `SITES`, and
  `MAX_DORMANT_SITES_PRICED`.
- **`src/rules/random.ts`** — `mulberry32`, `drawIndex`,
  `drawWeightedIndex`.
- **`src/rules/bays.ts`** — `BAYS` (fourteen edge squares) and `isBay`.
- **`src/board/Board.tsx`** — already renders per square by asking
  `siteStatusAt`, so it does not know the site list exists.
- **`src/board/SiteMarker.tsx`**, **`src/board/squareLabel.ts`**,
  **`src/board/announcements.ts`** — the artwork, the accessible name, and
  the spoken end-of-turn clauses, all keyed off `SiteState`.
- **`src/rules/sitePool.test.ts`**, **`src/rules/openingBoard.test.ts`**,
  **`src/rules/recovery.test.ts`**, **`src/rules/camping.test.ts`**,
  **`src/rules/fullGame.test.ts`**, **`src/rules/seededReplay.test.ts`** —
  the long-run and integration cover this story disturbs most.

### Where a node may appear

The rule, in the order the constraints were agreed. A square is a legal
place for a new node when **all** of these hold:

1. It holds no node already.
2. No ship is standing on it.
3. It is not on the outer edge of the board — not row 1 or 15, not column A
   or O.
4. It is not one square in from the outer edge — not row 2 or 14, not
   column B or N.
5. It is not orthogonally or diagonally adjacent to another node.

Constraints 3 and 4 leave the 11 × 11 interior **C3–M13**: 121 squares.

Constraint 5 is the one that does the work, and 121 squares hold it
comfortably: the most nodes that can be packed into an 11 × 11 area with
none touching another is 36, and the board only ever wants 15.

**A sixth constraint was considered and deliberately left out.** The story
was first written with "not orthogonally or diagonally adjacent to a
planet" in the list. It excludes nothing: every planet sits on a bay
(`PlanetDefs.tsx` draws the fourteen bays' planets), every bay is on the
outer edge, and so every square touching one is already inside the two
excluded rings. The owner's decision at the plan-approval gate is that a
rule which cannot bite is not written pre-emptively — it belongs to the
future story that moves the bays, the planets or the ring depth and thereby
makes it real. So `rules.md` does not state it and the code does not check
it, and neither carries a test for it.

**The fallback.** If no square satisfies all five, the new node is placed
uniformly among the squares that hold no node and are not a bay. That is
the whole of the relaxation — the constraints are not dropped one at a time
— and it exists so that placement can never fail rather than because it is
expected to happen. Bays stay excluded even here, so `squareLabel.ts` keeps
its invariant that a square is never both a bay and a node. Per the owner:
**base cover only** for this path; it is not worth building a scenario
generator around.

**A replacement never appears on the square it just left.** The retiring
node's own square is excluded from that draw, so a node that ends always
ends somewhere visibly different from where the next one starts.

### The shape of the pool

Fifteen nodes, five of them charged. A node lives roughly 20 turns charged
(Appendix B's mixed empty/held figure) and roughly 10 turns depleted, so for
five to be charged at any moment the average inactive wait works out at
about 30 turns: 5 charged, about 2½ depleted, about 7½ inactive. A node
still charges about every four turns, exactly as now.

The inactive pool is therefore a little thinner than the nine or ten of the
seventeen-site board, and the pressure cap of 50 now sits above the average
wait of 30 rather than below it, which sharpens the weighting rather than
flattening it. Both are first guesses to be play-tested, like every other
number in section 8 — this story does not retune them.

## In scope

### 1. The rules edit, first and on its own

Version 0.19 → 0.20, with a changelog entry, in its own commit ahead of the
code.

**§2 — the vocabulary.** The **Site** entry is deleted. **Node** is
redefined: not "a site that is charged", but the thing itself — a position
on the board that runs through three states and then ends. **Pressure**
loses its reference to a site. The three states are named here as
**inactive**, **charged** and **depleted**.

**§3.2 — the seventeen sites go.** The table, the symmetry paragraph and
the spacing paragraph are deleted outright. The section is retitled and
restated as _where a node can appear_: the six constraints above, the
fallback, and the fact that a node's position is drawn rather than fixed and
lasts only as long as that node. The board diagram in §3 keeps the bays and
loses the sites — an example board is not the board any more, and the
diagram should not imply one.

**§8.1 — the opening board.** Fifteen nodes, not seventeen sites: five
charged at a drain drawn from the opening drain table, ten inactive at a
pressure drawn from the opening pressure table, all fifteen squares drawn
under §3.2's rule. Nothing starts depleted; that sentence stays. Both
tables are unchanged.

**§8.1's three states** are renamed and the cycle sentence is rewritten:
a node cycles inactive → charged → depleted → **ends**, and its ending puts
a new inactive node somewhere else on the board.

**§8.2 — recovery becomes retirement.** The paragraph that has a depleted
site "go active, at 1 pressure" when its recovery reaches zero instead has
it leave the board, replaced at that same instant by one new inactive node
at pressure 1, at a square drawn under §3.2. The charging paragraph keeps
its "if fewer than five are inactive, fewer are charged and the board runs
below five" — it is now the likelier case and should say so plainly.

**§8.6 step 6** is restated to match: every node that was depleted before
this turn began subtracts its recovery, and any that reaches zero or below
retires and is replaced. The reason step 6 sits last is unchanged and its
paragraph survives with its wording adjusted: a node that appears after the
charge draw has already run is inactive for the whole of the next turn and
first eligible in that turn's draw, at pressure 1.

**§1 — the game's random elements go from four to five**, gaining where a
new node appears. The overview is also where the change of character
belongs in one sentence: the board is not a fixed map with lights moving
across it, it is a map that redraws itself as the game runs.

**§8.3, §8.4, §8.5, §9, §10** change only in vocabulary — site → node,
active → inactive, dormant → depleted. No rule in them moves and no section
is renumbered.

**Appendix B** is rewritten around fifteen mortal nodes: the arithmetic
above, why the pool is still comfortable, why running short of five stays a
legal outcome rather than a failure, and what to check first when the
numbers are retuned — now the pressure cap against a 30-turn average wait,
and the size of the inactive pool against the target of five charged.

### 2. The vocabulary pass

A mechanical rename across `src/`, best done as its own step and its own
commit so that the behavioural diff after it is readable. Roughly 1,180
occurrences of "site" across 49 files today.

- `sites.ts` → `nodes.ts`; `SiteState` → `NodeState`, with members
  `"inactive" | "charged" | "depleted"`; `SiteStatus` → `NodeStatus`;
  `siteCyclePosition` → `nodeCyclePosition`; `TARGET_CHARGED_SITES` →
  `TARGET_CHARGED_NODES`; `DORMANT_RECOVERY_TABLE` →
  `DEPLETED_RECOVERY_TABLE`. `SITES` is deleted, not renamed.
- `GameState.siteStates` → `GameState.nodes`; `siteStateAt` →
  `nodeStateAt`; `siteStatusAt` → `nodeStatusAt`; `dormantSiteNames` →
  `depletedNodeNames`.
- `dormantSitesOccupiedBy` → `depletedNodesOccupiedBy`;
  `MAX_DORMANT_SITES_PRICED` → `MAX_DEPLETED_NODES_PRICED`.
- `SiteMarker.tsx`/`.css` → `NodeMarker.tsx`/`.css`; `squareLabel.ts`'s
  `siteState` → `nodeState`, and its wording from "<state> site" to
  "<state> node".
- Effects: `site-charged` → `node-charged`. `site-went-active` is not
  renamed but replaced — see step 4.
- Test file names follow: `sites.test.ts` → `nodes.test.ts`,
  `sitePool.test.ts` → `nodePool.test.ts`.

`CLAUDE.md`'s Vocabulary section is edited in the same pass: the **Site**
entry goes, and the **Hub** entry goes with it — the code says "node" now,
in both halves of the split it described. The reason that split existed is
worth keeping as a sentence: a future engine brings its own search-tree
"node", and whatever disambiguates them then will have to be chosen then.
This is a knowing trade, made because a board with no fixed positions has no
honest use for either word.

### 3. Placing a node

A new module — `src/rules/nodePlacement.ts` is the natural home, beside
`nodes.ts` rather than inside it — holding two things:

- **The legal pool**: the squares a new node may occupy, given the current
  state and an optional square to exclude (the retiring node's own). Built
  by walking `ALL_SQUARES` in board order and applying the six constraints,
  so the pool's order never depends on how the game got here. Empty pool →
  the fallback pool, built the same way.
- **The draw**: a seed and a state in, a square and the next seed out, using
  `drawIndex` over that pool. Uniform: a new node has no pressure to weight
  by, exactly as the opening deal's charged draw is uniform today.

Nothing here uses `Math.random` — banned in game code (`CLAUDE.md`), and
this story is not the exception. Every placement comes from
`state.randomSeed`.

**Iteration order.** With the node set no longer a constant array, every
place that walked `SITES` needs a canonical order to walk instead: board
order, from `ALL_SQUARES`, filtered to the squares that currently hold a
node. A small helper — `nodeSquares(state)` — belongs next to
`nodeStatusAt` in `gameState.ts`. `Object.keys(state.nodes)` is **not** the
answer: it is deterministic, but its order records the history of which
squares were written when, which is a fragile thing for the drain and
recovery draws to depend on.

### 4. The lifecycle change

**§8.6 step 6** grows the retirement. For each node depleted before the ply
began, in board order, the recovery draw runs as it does today; when the
level reaches zero or below the node's entry is **removed** from
`state.nodes`, a replacement square is drawn (excluding the retiring
square), and a new entry is written at that square with state `inactive`
and level `STARTING_PRESSURE`. Two nodes retiring in the same sequence are
handled one after the other in board order, so the second placement sees the
first replacement and cannot land beside it.

The `site-went-active` effect is replaced by a **`node-replaced`** effect
carrying both squares — the one that ended and the one that appeared —
because they are one event and the announcement reads better as one clause.
`node-ran-out` (charged → depleted) is unchanged.

Every other step of §8.6 changes only in what it iterates over. Nothing
about drain, pressure, energy, power or the charge draw moves.

### 5. The opening deal

`dealOpeningBoard` deals fifteen nodes instead of seventeen statuses. The
draw order is fixed and must stay fixed, because it is what lets a recorded
game replay:

1. **Five charged squares**, drawn one at a time from the legal pool, each
   draw recomputing the pool so the next placement respects the ones before
   it.
2. **Ten inactive squares**, drawn the same way, from the pool the five have
   already narrowed.
3. **One level for each of the fifteen**, walking them in board order: the
   opening drain table for a charged node, the opening pressure table for an
   inactive one. One `drawTableAmount` call each.

That is 30 seed steps before green's first turn, where the current deal
takes 22. Ships are in their bays at the deal, so constraint 2 is vacuous
there, but it is applied uniformly rather than special-cased.

`startingGameState` keeps its signature and stores the advanced seed, as it
does today.

### 6. What the player sees

The board already draws whatever `nodeStatusAt` reports for a square and
nothing for a square with no node, so a node appearing or disappearing needs
no new rendering: the marker simply stops being drawn at one square and
starts being drawn at another. No transition or animation is asked for here.

The end-of-turn announcement gains one clause for `node-replaced` — the
node that ended and where the new one appeared, in one sentence — where
`site-went-active` produced none. That silence was justified by an inactive
site being an invisible bookkeeping change; a node appearing in a new square
is a visible change to the map and to where the next race will be, so it
speaks.

`README.md` describes a board of seventeen fixed sites and needs rewriting
in the player's terms: nodes are born, used up and replaced somewhere else,
and the map you finish on is not the map you started on. Run
`/update-readme` for the rest of the diff.

Per the accessibility section of `CLAUDE.md`, existing automated tests are
updated where the path is straightforward, and no plan step is added for
testing accessibility. If the plan finds an accessible behaviour this change
costs — the likeliest candidate is a square's accessible name changing while
nobody is on it — the cost is accepted and recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather than
paid.

### 7. The tests that assumed a fixed board

The plan should treat this as a bulk of the work, not as fallout.

- **Tests that name a site square** — camping, movement, energy,
  announcements, board rendering — mostly build the position they want
  explicitly and only need the rename. Any that rely on H8 (or any square)
  being a site by default must state the board they want instead.
- **`nodes.test.ts`** (was `sites.test.ts`) covers the deal's new shape:
  fifteen nodes, five charged and ten inactive, nothing depleted, every
  square legal under §3.2, the same seed dealing the same board, different
  seeds dealing different ones.
- **A new `nodePlacement.test.ts`** covers the constraints one at a time —
  a square under a ship, on the edge, one in from the edge and beside a
  node are each excluded — plus base cover for the fallback,
  and the rule that a replacement never lands on the square it left.
- **`nodePool.test.ts`** (was `sitePool.test.ts`) keeps its long-run
  guard and gains the invariants this story introduces: the board holds
  exactly fifteen nodes at every turn of a several-hundred-turn run, every
  node's square is legal under §3.2 the moment it appears, no node waits
  unboundedly long to be charged, and the set of occupied squares over a
  long run is genuinely spread rather than clustering.
- **`recovery.test.ts`** changes meaning: recovery now ends in retirement
  and replacement, not in going inactive in place.
- **`seededReplay.test.ts`**'s recorded expectations are **regenerated**,
  not worked around. The property being guarded — the same seed produces
  the same game — is exactly as true afterwards; only the numbers move.
- **`fullGame.test.ts`** and **`openingBoard.test.ts`** must still run to
  completion, the latter with its "charges every one of the seventeen
  sites" assertion replaced by something true of a board whose squares
  change.
- **`rulesVersion.test.ts`** holds `RULES_VERSION` at 0.20.

## Out of scope

- **Retuning any number.** `NODE_CAPACITY` (60), `PRESSURE_CAP` (50),
  `TARGET_CHARGED_NODES` (5), the five tables, and the new counts — 15
  nodes, 10 of them inactive at the deal — are first guesses to be
  play-tested. The pool arithmetic in Appendix B is written to be checked
  later, not to be defended now.
- **Balance between the two sides.** Placement is unconstrained beyond
  §3.2's six rules: nodes can cluster in one half of the board, at the deal
  or after it. Accepted, for the same reason story 44 accepted it — the
  fleets are symmetric around the whole edge, and the map redraws itself
  over the game. A mirrored or balanced placement is a possible later story.
- **Animating a node appearing or disappearing.** The marker changes
  square between renders. A transition is a visual story, not this one.
- **Any change to combat, movement, power, energy, the clock, scoring or
  the end of the game.** They change in vocabulary only.
- **Game recording and replay**, beyond keeping the property that a seeded
  game replays exactly. The recorded expectations move because the draw
  order does.
- **Choosing or showing the seed.** It still comes from
  `src/game/seed.ts`.
- **A migration path for saved games or older rulesets.** There is no
  backwards compatibility (`CLAUDE.md`): the rules are rewritten in place.

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.20, and the changelog has an
  entry. `rules.md` contains no "site" and no "dormant"; neither does
  `src/`.
- A dealt board has exactly fifteen nodes: five charged, ten inactive,
  none depleted.
- Every node's square, at the deal and at every appearance thereafter, is
  legal under §3.2 — off the two outer rings, not under a ship, not beside
  another node.
- Each constraint is shown to bite on its own, with a state built to make
  it the only thing excluding a square.
- With no legal square available, the fallback places the node anyway, and
  never in a bay (base cover only).
- A replacement never appears on the square the retiring node just left.
- The same seed deals the same board every time; a different seed deals a
  different one. Over many seeds, node positions spread across the whole
  legal interior rather than favouring a region.
- The deal advances the seed by its 30 steps, and the state it produces
  carries the advanced seed.
- A depleted node whose recovery reaches zero is gone from `state.nodes`,
  and exactly one new inactive node at pressure 1 exists that did not
  exist before.
- The board holds exactly fifteen nodes at every turn of a several-hundred
  turn run, whatever the seed.
- Two nodes retiring in the same end-of-turn sequence produce two
  replacements, neither adjacent to the other.
- The charge draw still tops the board up to five, and still runs short —
  legally, without error — when no inactive node is available; the board
  recovers to five once one appears.
- A node charged in step 4 of turn N first drains in step 3 of turn N+1,
  and a node that appears in step 6 of turn N is first eligible in turn
  N+1's draw, at pressure 1.
- The same opening seed and the same sequence of actions produce the same
  game every time, with `seededReplay.test.ts`'s expectations regenerated.
- The board renders a node appearing at a new square and disappearing from
  its old one, and a square that no longer holds a node reads as an
  ordinary empty square.
- The end-of-turn announcement says both halves of a replacement in one
  clause.
- `fullGame.test.ts`, `openingBoard.test.ts` and `nodePool.test.ts` pass.
