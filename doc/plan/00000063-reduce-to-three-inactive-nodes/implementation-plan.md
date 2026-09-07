# Implementation Plan — Story 00000063, Three inactive nodes and a visible queue

## What this story does

Today the board carries twelve nodes — four charged, eight inactive — and the
end-of-turn charge draw picks among the inactive ones at random, weighted by a
hidden number called **pressure**. Nothing about the choice is visible.

This story replaces that with a **queue of three**:

- **Exactly three inactive nodes at all times**, each carrying a **priority**
  of 1, 2 or 3 — one each, never a repeat.
- **Priority is visible**: one, two or three rings on the inactive node's
  artwork, more rings meaning higher priority.
- **Charging is deterministic**: the shortfall against four charged is filled
  from the queue top-down — the 3 first, then the 2, then the 1. No draw, no
  weighting.
- **Priorities rotate every turn** — 1→2, 2→3, 3→1 — but only on a turn where
  the queue survives.
- **A charge sweeps the queue**: on any turn one or more nodes charge, whatever
  inactive nodes remain are discarded and three fresh ones are drawn, spread
  apart by a distance weighting, and dealt priorities 1, 2 and 3 at random.
- **A fourth charged node can be placed directly**, out of nowhere, on the one
  turn all four charged nodes run out at once — the queue of three cannot cover
  a shortfall of four.
- **Pressure is gone in every form**, and so is one-out-one-in replacement: a
  retiring node simply leaves.
- **The opening board deals seven nodes** — four charged, three inactive.

`story.md` in this folder is the full statement of the change and the owner's
reasoning about what it does to the game, including the alternatives the owner
measured and dropped (the outer-edge third draw, the distance cap). This plan
does not repeat that reasoning: it says how to get there, in what order, and
records the design decisions this plan makes, because code in this repository
deliberately carries no design history (`CONTRIBUTING.md`, "Comments").

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI and
  `README.md` say. Do not mix them (`CLAUDE.md`, Vocabulary).
- **Move** means the movement action specifically — one ship changing squares.
  It is never a synonym for a ply or a turn.
- **Node** is the word everywhere; a node is `inactive`, `charged` or
  `depleted`.
- **Priority** is this story's new word, and it is the **same word everywhere**
  — `rules.md`, the UI, code, tests. Do not invent synonyms ("rank", "order",
  "queue position", "level") in identifiers or in player-facing text.
- **Queue** is the informal collective noun for the three inactive nodes. It is
  fine in prose and in comments; it is **not** a stored object — there is no
  queue data structure, only three node entries in `state.nodes` that happen to
  be inactive.
- **Refill** is the word for the whole "sweep the survivors and draw three new
  ones" operation. **Rotate** is the word for the priority shift on a turn with
  no charge. **Sweep** is the discard half of a refill.

## Settled decisions — do not reopen

These were settled by the owner before planning began, in `story.md` and in the
planning brief. A step that finds one inconvenient should escalate, not
re-decide.

- **S1.** Exactly **three** inactive nodes, carrying priorities 1, 2 and 3, one
  each, never a repeat.
- **S2.** Charging is **deterministic and top-down** by priority. No weighting,
  no draw, no tie-break — there can be no tie.
- **S3.** Rotation is 1→2, 2→3, 3→1, applied at the **end** of a turn, **after**
  that turn's charge, and **only** on a turn where nothing charged. A refilled
  trio is never rotated in the same turn it was dealt.
- **S4.** **Any** charge — one node or four — sweeps the queue and refills it.
  There is never a partial queue and never a queue of stale survivors.
- **S5.** New inactive nodes are drawn one at a time from a pool that **widens
  once**: the first draw uses §3.2's strict pool (both edge exclusions); the
  second and third lift only constraint 4 ("not one square in from the edge").
  The **outer edge is never open** to an ordinary draw. Every other §3.2
  constraint stays in force for all three.
- **S6.** The draw is weighted, not uniform. For a candidate square `s`, with
  `C` the squares holding charged nodes and `N` the squares already chosen for
  new inactive nodes in this same refill:

  ```
  w(s) = 1 + ( sum over c in C of d(s,c) ) * ( product over n in N of d(s,n) )
  ```

  `d` is **Chebyshev** distance, and the product over an empty `N` is 1.
  Depleted and inactive nodes carry no weight; they still block through §3.2's
  constraints. Do not add a distance cap — the owner measured one and dropped
  it (`story.md`, "A distance cap was considered and dropped").

- **S7.** The **four-at-once** case: three come from the queue, the fourth is
  placed directly as a **charged** node at zero drain, at a square drawn
  **uniformly** (no weighting) from the **widened** pool. It never spends a turn
  inactive and never had a priority.
- **S8.** **Pressure is deleted entirely** — the value, the cap of 50, the gain
  of 1 a turn, the opening pressure table, and the weighting of the charge draw
  by it. `nodeCyclePosition`'s inactive branch goes with it.
- **S9.** **A retiring node is not replaced.** It leaves and nothing appears in
  its place. The "a replacement never appears on the square its predecessor just
  left" rule goes too, having nothing left to govern.
- **S10.** The opening board deals **seven** nodes: four charged from the
  unchanged opening drain table, then three inactive by exactly the refill
  procedure. The opening pressure table is deleted and nothing replaces it.
- **S11.** The rules edit is version **0.25 → 0.26**, with exactly **one**
  changelog entry covering the whole story, in its **own commit ahead of the
  code** (`CLAUDE.md`). A later rules edit on this branch folds into that same
  0.26 entry — there is never a second version bump on one branch. Tagging stays
  on hold: bump and write the entry, do **not** run `/tag-rules`.
- **S12.** Determinism: every draw comes from the seeded stream via
  `src/rules/random.ts`, and the **draw order is fixed and stated** (D4 below),
  because a recorded game replays by replaying the seed. `Math.random` is banned
  by lint in game code.
- **S13.** Combat, movement, energy, the trap, the relief, power and planets are
  untouched. Node capacity stays 60, the two drain tables and the recovery table
  are unchanged, the opening drain table is unchanged, `TARGET_CHARGED_NODES`
  stays 4. Charged and depleted **artwork** is unchanged; only the inactive
  node's is redrawn.
- **S14.** Per `CLAUDE.md`: **no plan steps for testing accessibility**, no
  review fixtures, no manual test scripts. Where an existing automated test has
  a straightforward path to being updated, update it; where it does not, this
  story does not owe it one. Anything knowingly lost goes as a note in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Design decisions made while planning

Everything below is a decision this plan makes, with the alternatives rejected.
A step that needs to know "why is it done this way" should find the answer here.

### D1 — Priority is carried in `NodeStatus.level`

`NodeStatus` in `src/rules/gameState.ts` stays exactly two fields — `state` and
`level` — and for an **inactive** node `level` **is** its priority, 1, 2 or 3.
Its documentation table gains the new meaning:

| State    | `level` is           | Starts at                   | Moves at end of turn               | Changes state at |
| -------- | -------------------- | --------------------------- | ---------------------------------- | ---------------- |
| Inactive | priority (1, 2 or 3) | dealt at random by a refill | rotates 1→2, 2→3, 3→1, or is swept | charged top-down |
| Charged  | drain                | 0                           | + the drain draw                   | ≥ capacity       |
| Depleted | the drain to recover | the drain it carried        | − the recovery draw                | ≤ 0              |

Introduce an exported type `NodePriority = 1 | 2 | 3` so the three legal values
are named once, and use it in every signature that carries a priority in or out
(`refillQueue`'s result, `NodeMarker`'s prop, the rotation helper). Inside
`NodeStatus.level` it is still a plain `number` — widening `level` to a union
would break every charged and depleted use of the same field.

Rejected — **making `NodeStatus` a discriminated union**
(`{state:"inactive"; priority: NodePriority}` versus
`{state:"charged"|"depleted"; level:number}`). It is the more type-safe shape,
and it would make "read a priority off a charged node" a compile error. It was
rejected on cost: fifteen test files build node maps through a local helper
typed `Record<string, readonly [NodeState, number]>`, and every one of them
would need a new shape, in a story that already touches most of them. The
type-safety gain is small in practice — the only production reads of `.level`
are `endOfTurn.ts` (charged, then depleted, each already narrowed by state),
`relief.ts` (depleted only, already filtered) and the charging order (inactive
only) — and a union can be revisited later as its own refactor with no rules
change attached.

Rejected — **an extra optional `priority` field alongside `level`**. It leaves
an inactive node carrying a meaningless `level` and a charged node carrying an
absent `priority`: two half-used fields where the existing design deliberately
has one whose meaning depends on the state it is attached to.

To keep the wart from biting, `nodeQueue.ts` (D2) exports a named reader for
"the priority of this inactive node" and a named comparator for "highest
priority first", so no call site outside that module writes `.level` when it
means priority.

### D2 — A new leaf module `src/rules/nodeQueue.ts`

The refill procedure is needed by two callers that must not import each other:
`nodes.ts`'s opening deal and `endOfTurn.ts`'s step 5. It goes in a new module,
`src/rules/nodeQueue.ts`, which owns everything about the queue and knows
nothing about `GameState`:

- `NodePriority`, and the constant for how many inactive nodes the board carries
  (`INACTIVE_NODE_COUNT = 3`) and the top priority (`TOP_NODE_PRIORITY = 3`);
- the **refill**: given the squares that already hold a node, the squares that
  hold **charged** nodes, the squares ships occupy and a seed, it returns three
  `{ square, priority }` entries and the next seed;
- the **rotation** of one priority (1→2, 2→3, 3→1);
- the ordering "highest priority first" over a set of inactive nodes.

It imports only `board.ts`, `nodePlacement.ts` and `random.ts`, so the layering
stays one-way: `board`/`random` ← `nodePlacement` ← `nodeQueue` ← `nodes` /
`charging` / `endOfTurn`. `chargeDraw.ts` and `relief.ts` are the precedent for
one §8.6 step owning a module of its own.

Rejected — **putting the refill in `nodes.ts`**. `nodes.ts` already owns the
state tables and the opening deal; adding the pools, the weighting caller and
the priority permutation table would make it the story's dumping ground.

### D3 — `chargeDraw.ts` is renamed `charging.ts`

There is no draw left in it for the ordinary case: the queue charges top-down.
Keeping the name `chargeDraw` would make the module lie about the rule it
implements, which is the one thing the rules layer is not allowed to do. Rename
`src/rules/chargeDraw.ts` → `src/rules/charging.ts`, `runChargeDraw` →
`runCharging`, `ChargeDrawResult` → `ChargingResult`, and
`chargeDraw.test.ts` → `charging.test.ts`. The `NodeChargedEffect` type keeps
its name and its `"node-charged"` tag. Three import sites move
(`endOfTurn.ts`, `openingBoard.test.ts`, the renamed test).

### D4 — The draw order, fixed and stated

A recorded game replays by replaying the seed, so every consumer of the stream
and its order is fixed here and must be restated in the code's own comments
(this is what `src/rules/seededReplay.test.ts` guards).

**The refill procedure** — 4 seed steps, always, in this order:

1. **First square**: one weighted draw (`drawWeightedIndex`) over the **strict**
   pool — all six §3.2 constraints — with S6's weights.
2. **Second square**: one weighted draw over the **widened** pool — §3.2 with
   constraint 4 lifted — computed against a board that already includes the
   first square, so the adjacency constraint and the weighting both see it.
3. **Third square**: the same again, seeing the first two.
4. **The priorities**: one `drawIndex(seed, 6)` selecting one of the six
   permutations of (1, 2, 3) from an explicit, source-ordered table, applied to
   the three squares **in the order they were drawn**. The table is in
   lexicographic order: (1,2,3), (1,3,2), (2,1,3), (2,3,1), (3,1,2), (3,2,1).

Rejected — **a Fisher–Yates shuffle of the three priorities**. It costs two seed
steps rather than one, and its result depends on the loop direction, so the
draw order would be an implementation detail rather than a stated rule. An
index into a written-out permutation table is one step, is trivially uniform,
and can be asserted against directly in a test.

**The opening deal** (`dealOpeningBoard`) — 12 seed steps, in this order:

1. Four charged squares, one at a time, each drawn **uniformly** (`drawIndex`)
   from the strict pool recomputed against the squares placed so far. Unchanged
   from today.
2. Four opening-drain draws, walking those four squares in **board order**
   (`ALL_SQUARES` order), one `drawTableAmount` each from
   `OPENING_DRAIN_TABLE`. Unchanged table.
3. The refill procedure above, placing the three inactive nodes: 4 more steps.

That is 4 + 4 + 4 = **12** steps, down from today's 24. Note the ordering change
from today: today the deal draws all twelve squares and then all twelve levels;
now the four charged squares and their drains are settled before the inactive
trio is drawn, because the trio's weighting is a function of where the charged
nodes are. A given seed therefore deals a completely different board from today,
which is expected and is not a regression.

**End of turn, step 4 (charging)**: charging from the queue consumes **no**
randomness. The direct fourth placement (S7), when it fires, consumes exactly
one `drawIndex` over the widened pool, after the three queue charges.

**End of turn, step 5**: a refill consumes 4 steps; a rotation consumes **none**.

### D5 — The pools: one function, one parameter

`legalNodePool` in `src/rules/nodePlacement.ts` gains a way to ask for the
widened pool, as a named option rather than a second function, so the two pools
read as the same rule differing in one constant: the number of edge rings
excluded, 2 (strict) or 1 (widened). Keep `EXCLUDED_EDGE_RINGS` as the strict
value and add the widened one beside it, both documented against §3.2's
constraints 3 and 4.

Everything else about the function is unchanged, including the fallback: if
nothing satisfies the constraints, the pool is every square that holds no node
and is not a planet. The fallback is **not** widened or narrowed by this option
— it is already the whole relaxation at once.

The `exclude` parameter (the square a retiring node just left) is **deleted** in
Step 4, when its only caller goes with S9's rule.

On an empty board with no ships, the strict pool is **51** squares and the
widened pool is **79** (verified against the planet geometry while planning).
With four charged nodes and twelve ships on the board, `story.md` measured the
three refill draws picking from roughly 33, 53 and 49 squares.

Rejected — **two separately-written pool functions**. The constraints would be
duplicated and could drift; §3.2 states one list with one constraint lifted, and
the code should read the same way.

### D6 — The weighting lives in `nodePlacement.ts`, next to the pool

`nodePlacement.ts` gains the weighted draw: given a pool, the squares holding
charged nodes and the squares already chosen in this refill, it produces S6's
weight for each candidate and draws one index via `drawWeightedIndex`. It also
keeps a uniform draw for the two callers that need one (the opening deal's four
charged squares, and S7's direct placement).

`chebyshevDistance(a, b)` is added to `src/rules/board.ts`, because it is a fact
about the board and nothing else — the greater of the column difference and the
row difference. `src/rules/fullGame.test.ts` already carries a private copy;
that copy may be repointed at the shared one opportunistically, but doing so is
not required by any step.

The weight can never be zero or degenerate: §3.2 bars a candidate from any
square adjacent to a node already placed, so every candidate sits at Chebyshev
distance ≥ 2 from each already-placed new node, and the leading `1` keeps the
total positive even when there are no charged nodes at all (which makes the draw
uniform — the degenerate case worth a unit test).

### D7 — The end-of-turn sequence keeps seven steps; step 5 changes meaning

§8.6's shape does not change. Only step 5's content and step 6/7's tail do:

1. power (unchanged)
2. energy (unchanged)
3. drain, deplete, trap (unchanged)
4. **charge**: fill the shortfall against four from the queue, top-down by
   priority; if the shortfall exceeds the queue, place the extra as a charged
   node directly (S7)
5. **refill or rotate**: if anything charged in step 4, sweep the surviving
   inactive nodes and draw three new ones with priorities dealt at random;
   otherwise rotate the three surviving priorities
6. **recover and retire**: unchanged clock, but a retiring node is **not**
   replaced (S9)
7. relief: unchanged, except that the node it ends is not replaced either (S9)

Step 5 stays where the pressure step was, i.e. **before** recovery. That means a
refill's pool sees a depleted node that is about to retire in step 6 as a
blocker. That is deliberate and is the smaller of two evils: moving the refill
after step 6 would let a node retire and its square be reused by a new node
inside a single end-of-turn sequence, which is exactly the collapse §8.6's
ordering commentary has always argued against.

The old ordering rationale in §8.6 ("step 6 is last so a replacement spends a
whole turn visibly inactive") loses its subject, since step 6 no longer creates
anything. It is replaced by the equivalent statement about the refill: a node
placed by step 5 is inactive for the whole of the next turn and can first be
charged at the end of it. §8.6's closing invariant — a node's state changes only
in this sequence, never while an action resolves — is unchanged and must survive
intact.

**Two invariants hold after every end-of-turn sequence**, and both are worth
asserting directly in tests: exactly **four** charged nodes, and exactly
**three** inactive nodes. The first is new — under the old rules a shortfall was
a legal outcome; under these rules the queue plus the direct fourth always
covers a shortfall, which can never exceed four. The second follows from a
refill always dealing three and nothing else ever creating or destroying an
inactive node.

### D8 — Effects: three changes, and rotation is silent

`EndOfTurnEffect` in `src/rules/endOfTurn.ts` changes as follows.

- **`NodeChargedEffect`** (`"node-charged"`) — unchanged. A queue node charged.
- **New `NodeAppearedChargedEffect`** (`"node-appeared-charged"`) — S7's direct
  placement, carrying the square. A separate type rather than a flag on
  `node-charged`, because it is genuinely a different event: one moves a node
  the players have been watching, the other creates a node out of nothing at a
  drawn square. A separate type also makes the exhaustive switch in
  `src/board/announcements.ts` a compile error until it is worded.
- **`NodeReplacedEffect` becomes `NodeRetiredEffect`** (`"node-retired"`),
  carrying only the retiring square. `ship-freed` still follows it immediately
  when the retiring node had a ship on it, exactly as today, and `node-relief`
  still precedes it when the relief caused it.
- **New `QueueRefilledEffect`** (`"queue-refilled"`) — the sweep and the three
  new nodes as one event, carrying the discarded inactive squares in board order
  and the three new `{ square, priority }` entries in draw order. One effect
  rather than five, because a refill is one thing that happened: the queue you
  were reading is gone and here is the new one.
- **Rotation raises no effect at all.** It happens every turn a charge does not,
  it changes nothing about where anything is, and it is fully visible on the
  board. An effect for it would put a clause in almost every turn's
  announcement for no information.

Effect order within step 5: the `queue-refilled` effect is emitted once, after
the refill is applied.

### D9 — The announcements

`src/board/announcements.ts` gains and changes clauses. Wording is the
implementer's to polish within these constraints (player-facing text, non
technical, `CLAUDE.md` "Intended audience"):

- `node-retired` — says the node at that square is gone. It must **not** say
  anything appeared in its place.
- `node-appeared-charged` — says a new node appeared already charged at that
  square. It should read as unusual, because it is.
- `queue-refilled` — one sentence naming the three new squares, saying the
  nodes that were waiting are gone, and naming which of the three charges next
  (the priority-3 one). Naming the next one is the point of the whole story and
  is the one part of the rings a listener cannot see.

### D10 — The rings

`src/board/NodeMarker.tsx` draws an inactive node as **`priority` concentric
rings**, and nothing else — no disc behind them. Charged and depleted artwork is
untouched (S13).

- The rings are strokes, not fills, in the existing inactive gold `#DAA520`.
- Starting values in the marker's 100-unit `viewBox`: radii 18, 28 and 38, stroke
  width 5. Priority _p_ draws the innermost _p_ rings, so a priority-1 node is
  one small ring and a priority-3 node is three rings growing outward: the node
  visibly fills up as its turn approaches.
- These numbers are a starting point for the owner's eye (Step 8), not a
  measured result. If the owner asks for different values, that is a change to
  the constants and their test, nothing more.

`NodeMarker` takes a new optional `priority?: NodePriority` prop, used for the
inactive state only, alongside the existing `cyclePosition` used for charged and
depleted only. `nodeCyclePosition` in `src/rules/nodes.ts` is narrowed to accept
only `"charged" | "depleted"` (S8), and `src/board/Board.tsx` computes it only
for those two states and passes the priority for the third.

Rejected — **keeping the inactive disc behind the rings**. Three rings over a
disc reads as one busy blob at board scale, and the disc's whole reason for
existing was to show pressure travelling, which no longer exists.

Rejected — **encoding priority as size or colour of a single disc**. `CLAUDE.md`
records that small visual states must be presence, not degree: a tester cannot
reliably tell "slightly bigger" from "slightly smaller", but can count rings.

### D11 — Accessibility

The rings are new information that the square's accessible name does not carry:
`squareLabel` says "inactive node" and will not say which one charges next.
Per `CLAUDE.md`'s pre-release stance this is **knowingly accepted**, not fixed
here, and is recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` in Step 6. The
`queue-refilled` announcement (D9) does name the next node, so a listener is not
left with nothing; what is lost is the ability to read the queue at any moment
between refills.

No step adds or updates an accessibility test (S14). Existing tests that break
for mechanical reasons — an import that no longer exists, a node fixture that no
longer type-checks — are updated in the step that breaks them.

### D12 — Which existing tests are rewritten, and where

Named here so no step is surprised by them.

- **`src/rules/nodePool.test.ts`** — its bounds guard Appendix B's old claims:
  twelve nodes always, an inactive pool that stays populated, no node waiting
  unboundedly long. None of those describe anything any more. Step 4 **deletes**
  the assertions that have lost their subject, so the suite stays green; Step 7
  rebuilds the file as the new model's long-run guard, with freshly measured
  bounds. This is deliberately two touches on one file: Step 4 must not be
  blocked on measuring a new economy, and Step 7's measurements must be taken
  against the finished behaviour, including the direct fourth placement.
- **`src/rules/openingBoard.test.ts`** — its "first charge draw favours the
  nodes dealt the most pressure" block is deleted in Step 4 and replaced by the
  deterministic statement: the first charge of a game charges the priority-3
  node. Its "runs to completion" and "dealt deep runs out sooner" blocks survive
  with count adjustments.
- **`src/rules/chargeDraw.test.ts`** — renamed `charging.test.ts` (D3); its
  pressure-weighting block is deleted and replaced by top-down ordering tests.
- **`src/rules/seededReplay.test.ts`** — records the `node-replaced` sequence;
  repoint it at `node-retired` and add the `queue-refilled` sequence, since that
  is now the story's biggest consumer of the stream. This is the guard S12
  exists for.
- **`src/rules/endOfTurn.test.ts`, `ply.test.ts`, `camping.test.ts`,
  `nodes.test.ts`, `gameState.test.ts`, `fullGame.test.ts`,
  `src/board/Board.test.tsx`, `src/board/announcements.test.ts`** — mechanical
  updates for deleted constants, the renamed effect and the new node counts.
  `Board.test.tsx`'s "two inactive nodes at different pressures" test is deleted
  in Step 4 and its replacement — two inactive nodes at different priorities
  drawing different numbers of rings — arrives in Step 6.

---

## Steps

### Step 1 — Rules 0.25 → 0.26: the queue replaces pressure

Status: committed

Notes: Edited §1, §2, §3.2, §8.1, §8.2, §8.5, §8.6 and rewrote Appendix B from
scratch as specified; bumped the version line to 0.26, `RULES_VERSION` to
match, and added one changelog entry at the top covering the whole story's
gameplay change (tagging left on hold, no tag created). Two additional
sentences outside the listed sections also named the retired mechanisms and
were reworded to keep the document internally consistent and to satisfy this
step's own grep checks: §7.1's "the same assurance section 8.2 gives for the
charge draw" now points at where the queue's new nodes appear, and Appendix
B's "even less likely to fire than it was at twelve nodes" now says "than it
was at the old twelve-node count" so it no longer matches the banned
`"twelve nodes"` string while still making the same point. No other
deviation from the plan; `npm run format:check` required a Prettier pass on
`rules.md` (pre-existing wrapping), applied cleanly. Ran `npm test`,
`npm run typecheck`, `npm run lint` and `npm run format:check`, all green —
no source code changed yet, so the full suite (986 tests) is unaffected;
`rulesVersion.test.ts` confirms the 0.26 version and changelog entry agree.

Edit `doc/ruleset/rules.md` so that no sentence in it says a node carries
pressure, that the charge draw is random or weighted, that the board carries
twelve nodes, that a retiring node is replaced, or that the board may run short
of four charged. Bump the document's version line to **0.26**, bump
`RULES_VERSION` in `src/rules/rulesVersion.ts` to the same string, and add one
`doc/ruleset/changelog.md` entry at the top (newest first) covering the whole
story, in the style of the existing entries, marked as a gameplay change with
tagging on hold. This is its own commit, ahead of every code change (S11). Do
**not** tag.

The sections to edit, with what each must say afterwards:

- **§1, the overview.** It currently counts "five random elements … plus a
  sixth, rarer one". Recount: the game's random elements are now the **opening
  board itself**, **where the three new nodes appear when the queue is refilled
  and which of them gets which priority**, **which planet the two ships in a
  fight are pushed back to**, and **how fast a node burns** — four — plus the
  same rarer fifth, the relief's tie-break. "Which node is charged next" is
  **not** one of them any more, and "where a new node appears when one ends"
  changes meaning, because nothing appears when a node ends. Also update §1's
  paragraph about the board redrawing itself: it is still true, but it is
  refills rather than one-out-one-in replacement that redraw it.
- **§2, the word list.** **Delete the `Pressure` entry entirely.** Add
  **`Priority`** — a number, 1, 2 or 3, carried by each of the three inactive
  nodes; the highest charges next. Rewrite the **`Node`** entry: it must no
  longer say "the instant a node ends, a new inactive node appears somewhere
  else", and no longer say the board may fall short of four charged. It should
  say the board always carries four charged nodes and three inactive ones, plus
  however many are recovering.
- **§3.2, where a node can appear.** Keep the six constraints and the fallback
  exactly as they are, and keep the count of 51 legal squares. Add:
  - that a **refill** draws from a pool that **widens once**: the first of the
    three draws uses all six constraints; the second and third lift constraint 4
    only, and nothing else. Give the widened pool's own count on an empty board:
    **79** squares. State plainly that the outer edge (constraint 3) is never
    lifted for an ordinary draw.
  - the **weighting** (S6), written out as the formula with `d` defined as
    Chebyshev distance — the greater of the column difference and the row
    difference — and with the reasons `story.md` gives: the product is what
    spreads the trio, Chebyshev is closer than taxicab to how far apart squares
    actually play, depleted nodes carry no weight, and the leading 1 is a
    positivity guarantee rather than a fairness floor.
  - **Delete** the paragraph "A replacement never appears on the square the node
    it replaces just left" (S9).
  - Note that S7's direct charged placement draws **uniformly** from the widened
    pool.
- **§8.1, the three states.** The **inactive** bullet gains the priority: an
  inactive node is one of exactly three waiting in turn, carrying a priority of
  1, 2 or 3. The cycle sentence "the instant a node ends, a new inactive node
  appears somewhere else" **goes** — a node cycles inactive → charged →
  depleted → ends, and nothing follows it. The "aims to keep four charged …
  though it may fall short" paragraph becomes: the board fills the shortfall
  against four every turn, from the queue and, if the queue cannot cover it,
  with one node placed directly (forward reference to §8.2). Rewrite **the
  opening board**: seven nodes, four charged at squares drawn uniformly under
  §3.2 and part-drained from the unchanged opening drain table, then three
  inactive placed by §8.2's refill procedure with priorities 1, 2 and 3 dealt at
  random. **Delete the opening pressure table** and the paragraph that
  interprets it.
- **§8.2, charging a node.** Rewrite around the queue. It must state: the three
  inactive nodes hold priorities 1, 2 and 3, one each, never a repeat; the
  shortfall against four is filled top-down, 3 then 2 then 1, with no draw; if
  the shortfall is four, the fourth is placed directly as a charged node at zero
  drain, uniformly from the widened pool (S7), and that node never spends a turn
  inactive and never had a priority; priorities rotate 1→2, 2→3, 3→1 at the end
  of a turn on which nothing charged; any turn one or more nodes charge, the
  surviving inactive nodes are discarded and three new ones are drawn by the
  refill procedure, with priorities dealt at random and no rotation applied.
  Delete every sentence about pressure and about running short. The **recovery
  table is unchanged**, and the retirement sentence loses its replacement half:
  a node that recovers to zero or below retires and simply leaves the board.
- **§8.5, standing on a node that is not charged.** Two things need care: the
  sentence "waiting on one for the charge draw is free" and the sentence "an
  inactive node is eligible for the charge draw whether or not a ship is
  standing on it" both name a draw that no longer exists — reword them around
  the queue (a ship may camp on an inactive node and its priority rises as
  normal; occupancy changes nothing). Add that an inactive node discarded by a
  refill simply leaves, and a ship standing on it is untouched and finds itself
  on an ordinary square — an inactive node never traps.
- **§8.6, end-of-turn order.** Steps 1–3 unchanged. **Step 4** becomes the
  top-down charge plus the direct fourth. **Step 5** becomes "refill or rotate"
  per D7. **Step 6** keeps its recovery clock and loses "and is replaced": a
  node that reaches zero or below retires and leaves; any ship trapped on it is
  freed. **Step 7** likewise: the relief ends a node, it is not replaced.
  Rewrite the commentary paragraphs: the old "step 6 is last so a replacement
  spends a whole turn inactive" argument loses its subject and is replaced by
  the same argument about step 5's refill; the old "step 5 sits after the charge
  draw so a node is drawn at the pressure it held all turn" paragraph is
  replaced by S3's reason — the arrangement of rings a player looks at during
  their turn is exactly the arrangement that governs the charge at the end of
  it. Keep step 7's "runs last of all" paragraph and the closing invariant that
  a node's state changes only in this sequence.
- **Appendix B — rewritten from scratch.** Do not patch it; its whole argument
  rests on twelve nodes and a pressure cap of 50 against a target of four
  charged, and none of those numbers survives. The new appendix should make the
  new sizing argument:
  - the board carries **four charged and three inactive at all times**, plus
    however many are recovering — roughly one or two — so about **seven to nine
    nodes**, breathing rather than fixed;
  - a node lives roughly twenty turns charged and about ten depleted, so with
    four charged at a time a node charges roughly every **five** turns; a queue
    therefore survives a handful of turns and rotates once or twice before a
    charge sweeps it;
  - **an inactive node never waits more than three turns to reach the front** of
    the queue, and never waits unboundedly, because a queue that is not charged
    from is swept;
  - **the board is never short of four charged**, because three from the queue
    plus one placed directly covers the largest possible shortfall;
  - the pools: **51** squares strict and **79** widened on an empty board, and
    roughly **33, 53 and 49** for the three draws of a refill on a played board;
  - the spread the weighting buys, from `story.md`'s simulation: the trio's
    smallest pairwise gap averages **5.08** squares against **3.98** unweighted,
    with about **1.23** of the three nodes one square in from the edge and
    **0.24** in a corner region, against 0.94 and 0.15 unweighted;
  - §3.2's fallback is even less likely to fire than at twelve nodes, since
    there are fewer nodes and a wider pool; it stays in the rules because it is
    what makes placement total;
  - what the app guards: the queue is always exactly three with priorities 1, 2
    and 3; the board is always at four charged after a turn; every new node is
    legal at the moment it appears; and the trio comes out measurably more
    spread than an unweighted draw would.
  - Close with the same honesty the current appendix has: these counts are
    first guesses to be play-tested and retuned.

Nothing else in the document changes. §3.1, §4, §5, §6, §7, §8.3, §8.4, §9, §10
and Appendix A are untouched (S13).

Depends on: nothing — this is the first step, and it is what every later step
implements.

Verification (automated): Run `npm test` and confirm `rulesVersion.test.ts`
passes — it asserts `RULES_VERSION` matches the version line in `rules.md` and
that the changelog has a `## 0.26 ` entry. (Other tests still pass, because no
code has changed yet.) Then confirm by search that the document no longer
carries the retired claims: `grep -ni "pressure" doc/ruleset/rules.md` finds
nothing; `grep -n "twelve nodes" doc/ruleset/rules.md` finds nothing;
`grep -ni "charge draw" doc/ruleset/rules.md` finds nothing; and
`grep -ni "replace" doc/ruleset/rules.md` finds no surviving sentence saying a
retiring node is replaced. Confirm `grep -ni "priority" doc/ruleset/rules.md`
finds hits in §1, §2, §3.2, §8.1, §8.2, §8.6 and Appendix B. Run
`npm run format:check`.

### Step 2 — The two pools, Chebyshev distance and the weighted draw

Status: committed

Notes: Added `chebyshevDistance` to `src/rules/board.ts`. Gave `legalNodePool`
a fourth parameter, `poolWidth: NodePoolWidth = "strict"` (a named
`"strict" | "widened"` union rather than a boolean), leaving `exclude` in its
existing third position untouched per the step's instruction; added
`WIDENED_EXCLUDED_EDGE_RINGS = 1` beside the existing `EXCLUDED_EDGE_RINGS = 2`,
both documented against §3.2's constraints 3 and 4. Added `drawUniformSquare`
(a pool-and-seed uniform draw, for the opening deal's charged squares and
Step 5's direct fourth placement) and `drawWeightedNodeSquare` plus a private
`nodeSquareWeight` implementing S6's formula exactly, both in
`nodePlacement.ts` beside the pool per D6. New tests in `board.test.ts`
(chebyshevDistance) and `nodePlacement.test.ts` (widened pool size and
superset relationship, edge exclusion, uniform draw, and the weighted draw —
including a deterministic formula cross-check against `drawWeightedIndex` for
the already-placed-node case, plus statistical checks for the no-charged-node
uniform case and the one-charged-node far-vs-near case). No deviation from
the plan. `npm test` (1000 tests, up from 986, all green), `npm run
typecheck`, `npm run lint` and `npm run format:check` all pass; the one
format warning (`doc/plan/00000063-reduce-to-three-inactive-nodes/story.md`)
predates this branch and is untouched by this step.

Purely additive plumbing in the placement layer, with no behaviour change for
any existing caller. Nothing in this step is called by the game yet.

- Add `chebyshevDistance(a, b)` to `src/rules/board.ts` — the greater of the
  absolute column-index difference and the absolute row difference (D6).
- In `src/rules/nodePlacement.ts`, give `legalNodePool` a way to ask for the
  **widened** pool (D5): the same six constraints with constraint 4 ("not one
  square in from the edge") lifted, and nothing else changed. The strict pool
  must remain the default so every existing caller behaves exactly as before.
  Document both edge-ring constants against §3.2's constraints 3 and 4.
- Add a **distance-weighted draw** to `nodePlacement.ts` (D6): given the pool,
  the squares holding **charged** nodes, the squares already chosen in this
  refill, and a seed, it computes S6's weight for each candidate and draws one
  index through `drawWeightedIndex`, advancing the seed exactly once.
- Add a **uniform draw over a given pool** if the existing `drawNodeSquare`
  cannot serve both the strict and widened cases cleanly; S7's direct placement
  and the opening deal's four charged squares both need one.

Leave `drawNodeSquare`'s `exclude` parameter alone in this step — its caller is
removed in Step 4.

Depends on: Step 1 (the pools and the weighting are §3.2 as amended).

Verification (automated): Run `npm test`; every existing test must still pass
unchanged, which is what proves the strict pool's behaviour did not move. New
unit tests in `src/rules/board.test.ts` and `src/rules/nodePlacement.test.ts`
must show:

- `chebyshevDistance` is symmetric, zero on the same square, 1 for a diagonal
  neighbour, and equals the larger of the two axis differences on a spread pair;
- the strict pool on an empty board with no ships is **51** squares and the
  widened pool is **79**, with the widened pool a strict superset of the strict
  one, and neither containing a square on row 1 or 15 or column A or O;
- the widened pool contains squares one ring in from the edge (for example a
  square on row 2 that is not a planet or planet-adjacent) and the strict pool
  does not;
- the weighted draw with **no** charged nodes and **no** already-placed nodes is
  uniform (every weight equal), and over a few thousand seeded trials produces a
  roughly flat distribution over a small hand-built pool;
- the weighted draw with one charged node picks far-away squares far more often
  than adjacent-ish ones, at a ratio consistent with the stated formula computed
  by hand for a small hand-built pool;
- the weighted draw with an already-placed new node collapses the weight of
  squares near it — a directly computed weight for two or three named squares,
  compared against the formula, is the clearest form of this assertion;
- the draw advances the seed exactly once.

Also run `npm run typecheck`, `npm run lint` and `npm run format:check`.

### Step 3 — `src/rules/nodeQueue.ts`: the refill procedure and the rotation

Status: pending

Add the new leaf module described in D2. It knows nothing about `GameState` and
is not called by anything yet.

It must export:

- `NodePriority` (the union 1 | 2 | 3), `INACTIVE_NODE_COUNT` (3) and
  `TOP_NODE_PRIORITY` (3);
- the **permutation table** of the six orderings of (1, 2, 3), written out in
  lexicographic order (D4), exported so a test can assert the exact table rather
  than a shuffle;
- the **refill**: squares already holding a node, squares holding **charged**
  nodes, squares ships occupy, and a seed in; three `{ square, priority }`
  entries and the next seed out. Its four seed steps and their order are D4's
  and must be restated in the module's own comment, because a recorded game
  replays by replaying the seed;
- the **rotation** of one priority: 1→2, 2→3, 3→1;
- an ordering helper: given inactive nodes with their priorities, the order they
  charge in — highest priority first (D1's named comparator, so no caller
  outside this module reads `.level` meaning priority).

Depends on: Step 2 (the pools and the weighted draw).

Verification (automated): New `src/rules/nodeQueue.test.ts` must show, on hand
built inputs and on the real board:

- a refill returns exactly three squares, all distinct, none adjacent to each
  other, none adjacent to an existing node, none on a planet or beside one, none
  on a ship, and **none on the outer edge**;
- the first square is always a member of the strict pool; the second and third
  are members of the widened pool (and may be one ring in from the edge — over
  many seeds, at least one of them is, which is the point of the widening);
- the three priorities are always exactly {1, 2, 3} with no repeat, and over
  several thousand seeded refills each of the six permutations comes up roughly
  a sixth of the time;
- a refill advances the seed exactly **four** steps (assert the resulting seed
  equals four hand-applied `mulberry32` steps from the input seed, or equivalently
  that the same seed replays the same trio);
- the same seed produces the same trio, in the same order, with the same
  priorities;
- the trio is measurably more spread than an unweighted draw from the same
  pools: over a few thousand refills against a fixed four-charged board, the mean
  smallest pairwise Chebyshev gap is above 4.5 (`story.md` measured 5.08 weighted
  against 3.98 unweighted; the bound leaves margin);
- rotation maps 1→2, 2→3, 3→1 and is a cycle of length 3;
- the ordering helper puts priority 3 first, then 2, then 1.

Also run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`.

### Step 4 — The queue replaces pressure, end to end

Status: pending

The cutover. These four changes must land together, because the invariant
"exactly three inactive nodes at all times" is what makes each of them correct;
splitting them would leave the game in a state no version of the rules
describes.

**a. The opening deal** (`src/rules/nodes.ts`). `dealOpeningBoard` deals seven
nodes in D4's order: four charged squares uniformly from the strict pool, four
opening drains in board order, then one refill for the inactive trio. Delete
`OPENING_PRESSURE_TABLE`, `PRESSURE_CAP`, `STARTING_PRESSURE` and `NODE_COUNT`
(the node count is no longer fixed; `TARGET_CHARGED_NODES` and
`INACTIVE_NODE_COUNT` are what remain). Narrow `nodeCyclePosition` to
`"charged" | "depleted"` (S8) and delete its inactive branch. Update the module
header comment, including the stated seed-step count (24 → 12).

**b. Charging** (`src/rules/chargeDraw.ts` → `src/rules/charging.ts`, D3).
`runCharging` computes the shortfall against `TARGET_CHARGED_NODES` exactly as
today, then charges inactive nodes **top-down by priority** — no draw, no
weighting, no seed movement — setting each to `{ state: "charged", level: 0 }`.
If the shortfall exceeds the queue, leave it unfilled **for this step only** and
say so in a comment referencing Step 5; Step 5 adds the direct fourth placement.
Delete the pressure weighting and its commentary.

**c. Refill or rotate** (`src/rules/endOfTurn.ts`, step 5). If step 4 produced
any `node-charged` effect, sweep: delete every remaining `inactive` entry from
`state.nodes`, then apply one refill (Step 3's function) against the board as it
now stands, writing the three new nodes at their dealt priorities, and emit one
`queue-refilled` effect (D8). Otherwise, rotate: every inactive node's priority
moves 1→2, 2→3, 3→1, with no effect emitted and no seed movement.

**d. Retirement stops replacing** (`src/rules/endOfTurn.ts`, steps 6 and 7, S9).
`retireAndReplaceNode` becomes `retireNode`: it removes the node's entry, emits
`node-retired`, then `ship-freed` if a ship was trapped there, and draws
nothing. Delete `drawNodeSquare`'s `exclude` parameter and its supporting
documentation in `nodePlacement.ts`, since retirement was its only caller.

**Then repoint everything that referenced what is gone:**

- `src/rules/gameState.ts` — `NodeStatus`'s documentation table (D1) and
  `startingGameState`'s doc comment (seven nodes, twelve seed steps).
- `src/board/announcements.ts` — `node-retired` and `queue-refilled` clauses per
  D9. (The `node-appeared-charged` clause arrives in Step 5.)
- `src/board/Board.tsx` — compute `cyclePosition` only for charged and depleted
  nodes and pass `undefined` for inactive. An inactive node will therefore draw
  the existing marker's start-of-cycle disc until Step 6 replaces it with rings;
  that interim appearance is expected and is not a defect to work around.
- The test files listed in D12. Specifically: delete `Board.test.tsx`'s "two
  inactive nodes at different pressures" test (its replacement arrives in Step
  6); delete `openingBoard.test.ts`'s pressure-weighting block and replace it
  with the deterministic statement that the first charge of a game charges the
  priority-3 node; delete from `nodePool.test.ts` every assertion whose subject
  has gone — the fixed node count, the "inactive pool stays populated" floor,
  the "no node waits unboundedly" bound and their constants — leaving the file
  green but thin until Step 7 rebuilds it; repoint `seededReplay.test.ts` at
  `node-retired` and add the `queue-refilled` sequence to what it compares.

New behaviour to cover with tests in this step:

- a dealt board has exactly four charged and three inactive nodes, none
  depleted, and the three inactive levels are exactly {1, 2, 3};
- the same seed deals the same board; a different seed deals a different one;
- charging with a shortfall of one charges the priority-3 node and no other;
  with a shortfall of two, the 3 and the 2; with three, all three, in that
  order;
- charging consumes **no** randomness (the seed is unchanged across a charge
  that draws nothing else);
- a turn on which nothing charges rotates all three priorities and emits no
  effect;
- a turn on which something charges emits exactly one `queue-refilled`, leaves
  exactly three inactive nodes with priorities {1, 2, 3}, and none of them is a
  survivor of the previous queue (their squares are all new, unless a new draw
  legitimately lands on a swept square — assert on the discarded set being
  emptied rather than on square identity);
- a ship standing on an inactive node that is swept keeps its square and its
  power and is not trapped;
- a depleted node that recovers to zero retires, emits `node-retired` and no
  replacement effect, frees any trapped ship, and the board's node count falls
  by one;
- after a full end-of-turn sequence run from a real starting position over many
  plies, the board carries exactly three inactive nodes at every ply.

Depends on: Step 3 (the refill and the rotation), Step 2 (the pools).

Verification (automated): Run `npm test` — the whole suite green, including the
updated integration files. Run `npm run typecheck`, `npm run lint`,
`npm run format:check`. Then confirm by search that pressure is gone from the
code: `grep -rni "pressure" src` finds nothing.

### Step 5 — Four at once: the fourth charged node placed directly

Status: pending

Close the one shortfall the queue cannot cover (S7). In
`src/rules/charging.ts`, after the three queue charges, if the shortfall is
still positive, place **one** node directly as `{ state: "charged", level: 0 }`
at a square drawn **uniformly** — no weighting — from the **widened** pool
(§3.2 with constraint 4 lifted), consuming exactly one seed step, and emit a
`node-appeared-charged` effect (D8). The shortfall can never exceed four and the
queue always holds three, so at most one such node is ever placed in a turn:
say so in the code's comment, and do not write a loop that suggests otherwise.

Add the `node-appeared-charged` clause to `src/board/announcements.ts` (D9);
the exhaustive switch will not compile without it.

Depends on: Step 4 (charging from the queue, and the widened pool in use).

Verification (automated): New tests in `charging.test.ts` and
`endOfTurn.test.ts` must show:

- a board with **zero** charged nodes and a full queue ends the sequence with
  four charged: three from the queue, in priority order, and one
  `node-appeared-charged`;
- the directly placed node starts at drain 0, is legal under §3.2's widened pool
  at the moment it appears, and is never on the outer edge;
- the placement consumes exactly one seed step, and the same seed places it on
  the same square;
- a shortfall of three or fewer never produces a `node-appeared-charged` effect;
- after the sequence, the board holds exactly four charged and exactly three
  inactive nodes — the refill in step 5 sees the directly placed node as a
  charged node for its weighting, so all four repel the new trio;
- the announcement for `node-appeared-charged` reads correctly
  (`announcements.test.ts`).

Also run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`.

### Step 6 — The rings: an inactive node's priority is drawn

Status: pending

Redraw the inactive node as rings (D10). Charged and depleted artwork is
untouched (S13).

- `src/board/NodeMarker.tsx` takes a new optional `priority?: NodePriority` prop
  and, for the inactive state, draws `priority` concentric stroked rings —
  starting values: radii 18, 28, 38, stroke width 5, colour `#DAA520` — and no
  disc. Delete the inactive disc's interpolation constants and helpers if
  nothing else uses them; `hexLerp`, `lerpNumber` and the inactive colour
  constants exist only for the pressure travel that S8 deleted. Keep
  `middleStopOffsetPercent` and everything the charged and depleted artwork
  uses.
- `src/board/BoardSquare.tsx` passes the prop through.
- `src/board/Board.tsx` reads the inactive node's priority off its `NodeStatus`
  (D1's named reader) and passes it.
- Update `NodeMarker.css` only if the rings need a box change; they should not.
- Update `NodeMarker.test.tsx`: a priority-1 node draws one circle, priority 2
  draws two, priority 3 draws three, at the stated radii; the charged and
  depleted cases are unchanged; an inactive marker with no priority given
  degrades to something harmless rather than throwing (choose one ring and say
  so in the test's name).
- Add back to `Board.test.tsx` the test deleted in Step 4, in its new form: two
  inactive nodes at different priorities render visibly different markers —
  different numbers of circles.
- Add a note to `doc/plan/00000021-accessibility-tech-debt/known-issues.md`
  recording D11's accepted loss: an inactive node's priority is conveyed by ring
  count only; the square's accessible name still says only "inactive node", so a
  screen-reader user cannot read the queue between refills. Follow the file's
  existing entry format.

Depends on: Step 4 (`NodeStatus.level` carries a priority; `Board.tsx` already
passes `undefined` for inactive `cyclePosition`).

Verification (automated): Run `npm test` — `NodeMarker.test.tsx` and
`Board.test.tsx` green with the new assertions. Run `npm run typecheck`,
`npm run lint`, `npm run format:check`. The owner's eye on how the rings
actually look is Step 8; this step proves only that the right number of rings is
drawn for the right priority.

### Step 7 — The long-run economy, rebuilt

Status: pending

Rewrite `src/rules/nodePool.test.ts` as the new model's guard (D12). Step 4 left
it thin; this step makes it earn its place again, with bounds measured against
the finished behaviour and recorded in comments beside each constant, exactly as
the current file does.

The file drives `runEndOfTurn` from real starting positions over several hundred
plies across a handful of seeds, with no ship activity, and must assert:

- **exactly three inactive nodes at every ply**, always holding priorities
  {1, 2, 3};
- **exactly four charged nodes after every ply** — the shortfall is always
  filled, so the old "running short is legal" allowance is gone;
- the node count breathes but stays in a sane band (four charged, three
  inactive, plus a small number depleted) — measure the observed range and set
  the bound around it;
- **every node placed — the deal's seven and every refill's three and every
  direct fourth — is legal at the moment it appears**, checked by reconstructing
  the board as the code built it and confirming membership of the right pool
  (strict for a refill's first draw, widened for the second, third and the
  direct placement);
- **no node ever lands on the outer edge** (row 1 or 15, column A or O);
- §3.2's **fallback never fires** over the run — assert it directly by checking
  that the ordinary pool was non-empty at every placement, and record the
  finding in the file's comment for Appendix B's benefit;
- the **spread** the weighting buys: over the run, the mean smallest pairwise
  Chebyshev gap within a freshly dealt trio is above a floor set below the
  measured value, and materially above what an unweighted draw from the same
  pools produces (compute the unweighted comparison in the test so the claim is
  self-contained);
- how often a refill happens — roughly every five turns per Appendix B — within
  generous bounds;
- rotation actually cycles: over a stretch of turns with no charge, each of the
  three nodes takes its turn at priority 3.

Delete the constants and helpers that no longer have a subject
(`MINIMUM_INACTIVE_NODES`, `MAXIMUM_TURNS_BETWEEN_CHARGES`, `nodeWaitStats`, the
node-count assertions) if Step 4 has not already, and rewrite the file's header
comment to describe what it now guards.

Cross-check Appendix B: if the measured figures differ materially from the
numbers Step 1 wrote into it (the ~5 turn charge cadence, the spread figures,
the pool sizes, the claim about the fallback), **correct Appendix B in this
step** and fold the correction into the same 0.26 changelog entry — one version
bump per branch (S11). Do not add a second version or a second entry.

Depends on: Step 5 (the economy is not complete until the direct fourth
placement exists).

Verification (automated): Run `npm test`; `nodePool.test.ts` green with the new
assertions and its measured bounds recorded in comments. Run `npm run typecheck`,
`npm run lint`, `npm run format:check`. If Appendix B was corrected, confirm
`rulesVersion.test.ts` still passes and that the changelog still has exactly one
`## 0.26 ` entry.

### Step 8 — The owner plays a game and reads the board

Status: pending

The one manual gate. Everything is implemented; this is the owner's eye on the
things a test cannot judge: whether the queue is actually **readable** at board
scale, and whether the game feels right with three nodes instead of eight.

Run `npm run dev` in the dev container and open the app. Play a game — a short
one, five a side and thirty rounds, reaches the interesting moments quickly —
and look at:

1. **The rings.** Can you tell one, two and three rings apart at a glance, at a
   normal window size, in both portrait and landscape? Is a priority-1 node too
   faint to notice at all? Say what to change about the radii, the stroke width
   or the colour if not (D10's numbers are a starting point, not a result).
2. **The rotation.** On a turn where nothing charges, watch the three nodes
   change rings — the single becoming a double, the double a triple, the triple
   dropping back. Does it read as a queue moving, or as three unrelated things
   flickering?
3. **The sweep.** On a turn where a node charges, watch the whole queue vanish
   and three new nodes appear elsewhere. Is the change legible, or does the map
   feel like it jumped?
4. **The spread.** Do the three new nodes actually land apart from each other
   and from the charged nodes, or do they clump? Do they crowd the edges?
5. **The announcements.** Read the live region or the console as a node charges,
   as the queue refills, and — if you see one — as a fourth node appears already
   charged: the wording should tell a player which node charges next.
6. **Three instead of eight.** Does the board feel emptier than it should, or
   more legible? This is the story's central bet and the owner's call.

Depends on: Step 7 (everything is in and the suite is green).

Verification (manual): the owner confirms points 1–6, or names what to change. A
change requested here is a small follow-up edit — most likely to D10's constants
in `NodeMarker.tsx` or to D9's wording in `announcements.ts` — re-verified by
`npm test` and by the owner's second look. If the owner asks for a **rules**
change here, it folds into the same 0.26 entry (S11).

### Step 9 — `README.md`, the comment sweep, and the final check

Status: pending

`README.md` describes the node economy in detail and most of that description is
now wrong. At minimum these claims must go or change:

- "it carries twelve nodes, at twelve squares drawn at random" (the opening
  board is seven);
- "The board always carries twelve nodes this way";
- "the board keeps itself topped up to four lit nodes, lighting new ones at
  random as older ones run out — and a node that has been waiting longer is more
  likely to be picked next, which shows in how it looks";
- "a node's glow" as a pressure indicator;
- "once it is gone for good — and in that same instant a brand new node is born
  somewhere else" (a retiring node is replaced by nothing);
- "a node is never drawn on the square the one it replaced just left".

What replaces them: the board always shows four lit nodes and three waiting
ones; each waiting node carries one, two or three rings, and the one with three
rings is the one that lights next; the rings shift every turn, so a player can
read not just what lights next but what lights the turn after; when a node
lights, the whole waiting set is swept away and three new ones appear elsewhere,
spread apart; a node that finishes recovering simply leaves, and nothing takes
its place. Keep the README's voice — it is written for a player, not a developer
(`CLAUDE.md`, "Intended audience").

The `/update-readme` command automates the review: it reads the branch diff and
updates `README.md` where warranted. Run it, then read the result and fix
anything it missed against the list above.

In the same step, sweep the code for comments that still describe the old model
— `src/rules/nodes.ts`'s header, `src/rules/endOfTurn.ts`'s header,
`src/rules/nodePlacement.ts`'s doc comments, `src/board/NodeMarker.tsx`'s
artwork commentary and its references to `node-artwork.md`'s "Dormant"/"Active"
sections, `src/rules/random.ts`'s reference to "the pressure-weighted charge
draw", and `src/rules/seededReplay.test.ts`'s header history. Comments in this
repository carry the rules, so a stale one is a defect.

Finally, confirm the whole story landed: no `PRESSURE` constant, no
`node-replaced` effect, no `chargeDraw` module, no mention of pressure anywhere
in `src/`, `README.md` or `doc/ruleset/`.

Depends on: Step 8 (the owner's changes, if any, are in).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check`, and `npm run build` — all green. Then confirm by search:
`grep -rni "pressure" src README.md doc/ruleset` finds nothing;
`grep -rn "node-replaced\|chargeDraw\|NODE_COUNT" src` finds nothing;
`grep -rn "twelve nodes" README.md src doc` finds nothing outside this plan
folder and `doc/plan/`'s older stories. Read `README.md` end to end once and
confirm no sentence in it contradicts `rules.md` 0.26.
