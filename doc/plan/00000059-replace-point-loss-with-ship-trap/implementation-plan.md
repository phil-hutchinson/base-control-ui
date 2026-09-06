# Implementation Plan — Story 00000059, A depleted node traps the ship on it

## What this story does

Today a depleted node takes **energy** off the player whose ship stands on it,
every turn, for nothing in return. That penalty goes, entirely, and is
replaced by a positional one:

- **Nothing in the game subtracts energy any more.** §8.4 keeps its collection
  half and loses its payment half; a score only ever rises.
- **A ship caught on a node when it burns out is trapped.** It cannot move and
  it cannot attack until the node retires — about ten turns later, on the
  ordinary recovery clock.
- **A move may not end on a depleted node.** Flying over one is still free.
  This is what keeps the trap simple: a ship can only ever be trapped by a
  node burning out underneath it, never by walking into one.
- **A trapped ship cannot be attacked either.** Standing on a node takes a
  ship out of combat in both directions, exactly as a charged node already
  does. A trapped ship still blocks enemy movement, so it holds its square,
  but nothing an opponent can do dislodges or frees it.
- **An all-trapped player gets relief.** A new §8.6 step 7 ends one node early
  so a player whose every ship is trapped is not made to pass for ten turns.
- **The HUD's depleted pip row goes**, along with everything derived from its
  height.

`story.md` in this folder is the full statement of the change and the owner's
reasoning about what it does to the game. This plan does not repeat it: it
says how to get there, in what order, and records the design reasoning,
because code in this repository deliberately carries no design history
(`CONTRIBUTING.md`, "Comments").

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say. Do not mix them (`CLAUDE.md`, Vocabulary).
- **Move** means the movement action specifically — one ship changing
  squares. It is never a synonym for a ply or a turn.
- **Action** is one move or one attack. `ACTIONS_PER_PLY` is currently 1.
- **Node** is the word everywhere; a node is `inactive`, `charged` or
  `depleted`.
- **Trapped** is this story's new word, and it is the **same word everywhere**
  — `rules.md`, the UI, code, tests — exactly like "node". Do not invent
  synonyms ("stuck", "held", "caught") in identifiers or in player-facing
  text. ("Caught" may appear as ordinary prose inside a sentence, but the
  state is called trapped.)
- A ship is trapped **iff** it stands on a node whose state is `depleted`.
  There is no fourth node state and nothing is stored on the node or the ship.

## Settled decisions — do not reopen

These were settled by the owner before planning began, in `story.md` and in
the planning brief. A step that finds one inconvenient should escalate, not
re-decide.

- **S1.** A trapped ship can neither move **nor** attack. This is the owner's
  decision, not a default.
- **S2.** A move may **not** end on a depleted node, and flying over one is
  still free. This replaces the story's original idea that a ship wandering
  onto a depleted node becomes trapped. Its consequence is load-bearing: a
  ship can only ever become trapped in §8.6 **step 3**, so the whole trap
  lives inside the end-of-turn sequence, and §8.6's closing invariant — _a
  node's state never changes while an action resolves_ — survives intact.
  **No step may introduce a mid-action node state change.**
- **S3.** The all-trapped relief is a new §8.6 **step 7**, running after step
  6, applied for each side in turn with the side that just moved first.
- **S4.** The HUD's depleted pip row is **removed entirely**, not repurposed.
- **S5.** The energy penalty is removed entirely; nothing subtracts energy any
  more.
- **S6.** The rules edit is version **0.24 → 0.25**, with exactly **one**
  changelog entry covering the whole story, in its **own commit ahead of the
  code** (`CLAUDE.md`). A later rules edit on this branch folds into the same
  0.25 entry — there is never a second version bump on one branch. Tagging
  stays on hold: bump and write the entry, do **not** run `/tag-rules`.
- **S7.** A trapped ship **cannot be attacked**, any more than it can attack.
  Being on a node takes a ship out of combat in both directions, exactly as a
  charged node already does — so this story adds a real protection rule, on
  both sides of combat. The consequence the owner accepted: an opponent can no
  longer dislodge or free a trapped ship at all, so a trap runs its clock out
  or the relief (S3) ends it. Nothing in this plan may say a trapped ship is
  an ordinary target, or that attacking one frees it.
- **S8.** The node clocks, the energy table, fleet sizes, planets, rounds, the
  clock and combat's returns are **untouched**. Nothing here is rebalanced to
  compensate for the penalty's removal; scores running higher is expected.
- **S9.** **Nothing new is drawn, on the node or on the ship.** No new mark,
  no new `ShipCondition`, no artwork change anywhere — the owner's decision.
  A trapped ship already reads: it sits on a grey depleted node, and on its
  owner's turn the existing `no-action` condition already dampens it and draws
  its bar, because a trapped ship genuinely has no legal action.
- **S10.** Per `CLAUDE.md`: no plan steps for testing accessibility, no review
  fixtures, no manual test scripts. The owner drives manual testing himself,
  so the one manual step says what to look at in `npm run dev` and nothing is
  built to support it.

## Design decisions made while planning

Everything below is a decision this plan makes, with the alternatives that
were rejected. A step that needs to know "why is it done this way" should find
the answer here.

### D1 — `src/rules/trap.ts` is a leaf module; the relief's choice lives in `src/rules/relief.ts`

The story asks for one module, `trap.ts`, holding both the trap's predicates
and the relief's choice. Those two cannot live together without an **import
cycle**:

- `movement.ts` must ask "is this ship trapped", so it imports the predicate;
- the relief's choice must ask "would this ship have a legal move if freed",
  so it imports `legalDestinations` from `movement.ts`.

Put both in `trap.ts` and `trap.ts` ↔ `movement.ts` import each other. The
plan therefore splits them:

- **`src/rules/trap.ts`** — a **leaf**: it imports only `board.ts`,
  `fleet.ts` and `gameState.ts`. It answers who is trapped and which nodes are
  doing the trapping.
- **`src/rules/relief.ts`** — §8.6 step 7's **choice**: imports `trap.ts` and
  `movement.ts`, exports one function `endOfTurn.ts` calls.

The layering is then strictly one-way: `trap` ← `movement` ← `relief` ←
`endOfTurn`. `chargeDraw.ts` is the precedent for a step of §8.6 owning a
module of its own, so a second small module is in keeping with the codebase
rather than an exception to it.

This is a **documented deviation** from `story.md`'s "a new `src/rules/trap.ts`
owns the trap and nothing else … the relief's choice … exposed as one function
`endOfTurn.ts` calls". The story's substance is kept — the trap is not spread
through the rules layer, and `endOfTurn.ts` calls exactly one function for the
relief — only the file boundary moves.

Rejected — **keeping both in `trap.ts` and accepting the cycle.** ES modules
tolerate it for hoisted function declarations and the bundler would cope, but a
cycle between two rule modules is a real design smell in a layer whose whole
value is that it reads like the document.

Rejected — **having `movement.ts` not import `trap.ts`**, checking
`nodeStateAt(state, ship.square) === "depleted"` inline instead (the way
`combat.ts` already checks for a charged node). It breaks the cycle just as
well, but it leaves the word "trapped" defined in two places, and this story's
whole point is that being trapped is one named idea.

### D2 — `depletedNodesOccupiedBy` moves to `trap.ts` as `trappingNodesFor`

The function is no longer an energy question — nothing is priced any more — it
is the trap's question: _which nodes are holding a ship of this side_. It moves
out of `energy.ts` into `trap.ts` and is renamed `trappingNodesFor(state,
side)`, returning the depleted nodes that side's ships stand on, **in board
order** (`nodeSquares` order, i.e. `ALL_SQUARES` order). The board order is
load-bearing: the relief's tie-break is defined on it (D6).

The move happens in Step 3, which repoints the function's two remaining
callers (`scoreSentence` in `announcements.ts`, and `ScoreDisplay.tsx`). Both
of those callers are themselves deleted in Step 4. That is deliberate: it costs
two import lines and keeps every commit free of a dead export, which the
story's verification asks for.

### D3 — The trap's predicates

`trap.ts` exports exactly four things, and no more:

- **is this ship trapped** — the ship's square carries a node whose state is
  `depleted`. A direct lookup; no walk of the node set.
- **the trapping nodes for a side** — D2's moved function.
- **the trapped ships of a side** — the ships standing on those nodes, in the
  same board order.
- **is every ship of this side trapped** — the count of trapped ships equals
  the count of that side's ships.

"Every ship" means every ship of that side, full stop: `actedThisPly` is not
consulted, because the question §8.6 step 7 asks is about the side's next
turn, not the ply that just ended.

A ship on a planet is never trapped, because the node draw excludes planets
and their neighbours (§3.2). So "all trapped" also means "none refuelling".
Do not add a planet check; it would be an unreachable branch.

### D4 — Two new move refusals, named apart and checked in the document's order

`MoveRefusalReason` gains **`"ship-trapped"`** and
**`"destination-depleted-node"`**. They are distinct from each other and from
`destination-occupied` and `out-of-range`, because `RejectionReason` in
`src/game/session.ts` is the union of the move and attack reasons and
`rejectionSentence` in `src/board/announcements.ts` switches over it
exhaustively with no `default` — so a shared literal would force one sentence
to cover two different refusals. The existing `out-of-range` /
`target-out-of-range` pair is the precedent.

Check order in `moveRefusalReason`, from the most fundamental to the most
specific, matching the function's existing shape:

1. `game-over`
2. `not-your-ship`
3. `ship-already-acted`
4. **`ship-trapped`** ← with the other facts about the ship itself
5. `out-of-range`
6. `cannot-afford`
7. `path-blocked`
8. `destination-occupied`
9. **`destination-depleted-node`** ← with the other facts about the square

`destination-occupied` is checked **before** `destination-depleted-node`, and
the two genuinely can co-occur: an enemy ship trapped on a depleted node is
both. Occupancy wins because a ship in the way is the more immediate fact and
the one a player is already used to hearing.

Because the announcement switch is exhaustive, the step that adds these
reasons must add their wording in the same step or the build will not
typecheck. That is why Steps 5 and 6 each carry their own sentences.

### D5 — Two new attack refusals, each beside its charged-node counterpart

A depleted node protects exactly as a charged node does (S7), so `combat.ts`
gains **both** halves of the pair, each sitting immediately beside the
charged-node check it mirrors, for the same kind of reason:

- **`"attacker-on-depleted-node"`**, checked immediately after
  `attacker-on-charged-node` — a fact about the square the attacker stands on;
- **`"target-on-depleted-node"`**, checked immediately after
  `target-on-charged-node` — a fact about the square the target stands on.

`legalTargets` mirrors both: it returns nothing for a trapped attacker (its
early return gains the depleted case beside the charged one), and it excludes
every square holding a ship on a depleted node, exactly as it already excludes
ships on charged nodes and on planets.

The two reasons are separate string literals, for D4's reason: `RejectionReason`
in `src/game/session.ts` is the union of the move and attack reasons and
`rejectionSentence` switches over it exhaustively, so each refusal needs a
sentence of its own — "that ship is trapped and cannot attack" and "that ship
is trapped on a depleted node and cannot be attacked" are different sentences
to a player. The existing `attacker-on-charged-node` /
`target-on-charged-node` pair is the precedent in every respect.

`actions.ts` needs **no change**: `sideToMoveHasLegalAction` and
`shipHasLegalAction` are built on `legalDestinations` and `legalTargets`,
which both already answer nothing for a trapped ship once Steps 5 and 6 land.
Step 6 proves that with tests rather than adding a third trap check. Do not
add one.

### D6 — The relief's "would have a legal move if freed" test is a hypothetical state, not a flag

`relief.ts` answers the question by building a **hypothetical `GameState`** and
calling the real `legalDestinations` on it. The hypothetical is the state as
it will actually be if that node ends:

- the candidate node's entry **removed** from `state.nodes`, so the ship's own
  square is an ordinary square;
- every **other** node left exactly as it is, so every other depleted node is
  still barred as a destination;
- every ship left exactly where it is, so friendly and enemy ships still block
  as they will;
- `sideToMove` set to the side being tested and `actedThisPly` emptied,
  because the question is "would this ship have a move **on its own turn**",
  and step 7 runs for the side that did _not_ just move as well as the one
  that did.

Nothing else is changed, nothing is written back, and no randomness is drawn.

Rejected — **a parameter on `legalDestinations` or on the destination filter**
that says "ignore the trap for this ship". It puts a knob in §6's module that
exists only for §8.6, and it still would not model the node's _square_ becoming
ordinary; it would only silence the ship-side check.

Rejected — **re-deriving the reachable squares inside `relief.ts`**. That is
the second copy of §6 the story explicitly forbids.

**Game-over caveat, decided here so no step rediscovers it.**
`legalDestinations` answers nothing once `isGameOver` is true. During
`runEndOfTurn` the ply counter has not advanced yet, so on the final ply the
game is not yet over and the test behaves normally. The one case where it does
bite is a state where both sides are already out of time (§10), where the game
is over and nothing further will be played — a relief that does not fire there
changes nothing observable and consumes no seed. **Do not special-case it**;
state it in the function's comment and move on.

**Only a move, never an attack.** §8.6 step 7 as written considers only
whether the freed ship would have a legal **move**. A freed ship with no move
but an available attack is conceivable and is deliberately not counted: the
relief exists to give a boxed-in player somewhere to go, the free
one-square orthogonal move is the always-affordable action, and the rule is
simpler to read and to implement as written. §5's pass rule already covers a
player who genuinely has nothing.

### D7 — The relief picks the lowest `level`, ties broken by board order

A depleted node's `level` **counts down** towards zero (see `NodeStatus` in
`gameState.ts`), so _least remaining life_ is the **lowest** level. Walking the
candidates in board order and keeping a strict "is this one lower than the best
so far" comparison gives the earliest-in-board-order winner on a tie for free;
do it that way rather than sorting, and say so in a comment, because the
tie-break is a rule (§8.6 step 7), not an incidental of the implementation.

### D8 — Three new end-of-turn effects, each a separate fact

`EndOfTurnEffect` gains:

- **`ship-trapped`** — carrying the ship id, its side and its square. Pushed
  in step 3 immediately **after** the `node-ran-out` effect for the same node,
  when a ship is standing there. The node's event first, its consequence
  second.
- **`ship-freed`** — the same shape, pushed immediately **after** the
  `node-replaced` effect when the retiring node had a ship on it. Emitted for
  an ordinary step-6 retirement and for a step-7 relief alike, because it is
  the same fact either way.
- **`node-relief`** — carrying the **side** being relieved and the square of
  the node that is ending early. Pushed **before** that node's
  `node-replaced`, so a listener hears the cause, then the map change, then
  the freed ship.

`EnergyPenaltyEffect` is deleted from the union.

Rejected — **reconstructing "a ship was caught" in the announcement layer**
from `node-ran-out` plus a board lookup. The board the announcement can see is
the board _after_ the whole sequence; the ship that was caught is a fact the
step that caught it knows and nothing downstream should have to re-derive.

Rejected — **a flag on `NodeReplacedEffect`** (`reason: "recovered" |
"relief"`) instead of a `node-relief` effect. It saves an effect but loses the
side being relieved, forcing the wording layer to infer it from the freed
ship, and it makes one effect mean two different things. Three flat effects
read better in a flat list.

### D9 — Step 6's retire-and-replace body is factored out, unexported

The block that retires a node and replaces it — remove the entry **before**
the replacement pool is built, draw a square excluding the vacated one, write
the replacement at `STARTING_PRESSURE`, emit `node-replaced`, and (new) emit
`ship-freed` — becomes one **module-private** helper in `endOfTurn.ts`, called
by step 6's zero-or-below branch and by step 7. Its existing comments about
why the entry is removed first and why only the current square is excluded
move with it verbatim; they are the record of a subtle §3.2 interaction.

It stays unexported: `relief.ts` needs the _choice_, not the _application_,
and exporting it would create the `endOfTurn` ↔ `relief` cycle D1 exists to
avoid.

### D10 — Step 7 runs in a fixed side order because it consumes seed

Step 7 draws a replacement square when it fires, so it consumes the seeded
stream (`CLAUDE.md`: the game's randomness is seeded and a record must replay
exactly). It therefore runs for `state.sideToMove` — the side that just
played — and then for the other side, always in that order, never in a
data-dependent one. At most one node ends per side per ply: freeing one ship
means that side is no longer all-trapped, so the question is asked once per
side, not in a loop.

Freeing a ship of one side cannot un-trap the other side, so the order affects
only the seed stream. That is exactly why it must be fixed.

Step 7 is **last** deliberately: it must see the depleted set as it stands
after both step 3's new arrivals and step 6's retirements.

### D11 — `useCountUp`'s falling-target branch stays, and its comment is corrected

The story asks the plan to decide whether the not-animated case for a
**falling** target is now dead code. **It is not dead**, and the reason is
worth writing down because it is not obvious: `useDisplayedEnergy` is called in
`App.tsx` **above** the start-screen/game switch, so it is not unmounted when a
finished game returns to the start screen. Pressing PLAY again dispatches
`new-game`, both totals reset to 0, and the hook's displayed value falls from
the previous game's total.

So: **keep the branch.** Correct the comments in `useCountUp.ts` and
`useDisplayedEnergy.ts` so they no longer imply that play can lower a total —
under §8.4 a score only rises — and say instead that the only falling target is
a new game resetting the totals, which snaps rather than rolling backwards.
`ScoreDisplay.tsx`'s `SCORE_DIGITS` comment ("the most a turn can pay or cost
is 10") must lose its "or cost" half; the ceiling of 10 a turn and the ~900
top-out for a 90-round game are unchanged.

### D12 — The board gains nothing, and that is a decision, not an omission

No new mark, no new `ShipCondition` value, no artwork change, no dampening
change: `src/board/Board.tsx`, `src/board/BoardSquare.tsx`,
`src/board/BoardSquare.css` and `src/board/squareLabel.ts` are **not touched
for the trap at all** (S9). This is the owner's decision, and the plan records
the reasoning so a later reader does not read it as something forgotten:

- A trapped ship already reads on the board. It is sitting on a **grey
  depleted node**, which is drawn today and shows its remaining life through
  its own gradient — so a player can already see both that the ship is caught
  and roughly how long for.
- On its owner's turn it also already carries the existing **`no-action`**
  condition: the dampened ship and the hollow bar. That is not a coincidence
  to be checked by eye — it follows from Steps 5 and 6. `Board.tsx` computes
  the condition from `shipHasLegalAction`, which is
  `legalDestinations(...).length > 0 || legalTargets(...).length > 0`. Once
  Step 5 makes `legalDestinations` empty for a trapped ship and Step 6 makes
  `legalTargets` empty for one, `shipHasLegalAction` is false for every
  trapped ship, so `no-action` appears for it with no new code. **Step 6's
  verification pins exactly this**, and it is the reason nothing new is
  needed.
- The **square label** is likewise unchanged: it already names the depleted
  node under the ship, and the existing condition segment already speaks for a
  trapped ship of the side to move.

What this knowingly costs: a trapped ship of the side **not** to move carries
no condition at all, because `no-action` is computed for the side to move
only. An opponent reads the trap off the grey node under the ship rather than
off the ship. That is accepted — and since a trapped ship can no longer be
attacked (S7), there is no attack decision that depends on spotting it.

Rejected — **a `trapped` member on `ShipCondition` with a mark of its own,
drawn for both sides.** It was in an earlier draft of this plan and the owner
removed it: it is new artwork, new wording and new tests to say something the
board already says twice over.

### D13 — `EnergyOverlay` loses its negative half (a gap in the story)

`story.md` does not mention `src/board/EnergyOverlay.tsx`, but it draws a
"−N" and a contracting pulse for every `energy-penalty` effect. With the effect
gone, its negative path, its `--negative` CSS rules, the `energy-overlay-sink`
and `energy-overlay-pulse-contract` keyframes and the `--negative` entries in
the reduced-motion block are all unreachable and are removed. Since only one
kind of settlement remains, the `kind` field and the `--positive`/`--negative`
class modifiers go with it and the overlay draws a "+N" and an expanding pulse,
full stop. No rule may survive that only a penalty could have matched.

### D14 — What the announcements say

Removed: `energyPenaltyClause`, `depletedNodesOccupiedPhrase`, the
`energy-penalty` case, the `MAX_DEPLETED_NODES_PRICED` import, and
`scoreSentence`'s depleted clause (which becomes "Green: 24 energy, 3 nodes
held.").

Added — wording is the implementer's to polish, but each must be its own
sentence and must not read like any of the others:

- a node ran out **and caught a ship**: e.g. "The green ship at H8 is trapped
  there until the node retires."
- a node retired **and freed one**: e.g. "The green ship at H8 is free again."
- a node **ended early** to relieve an all-trapped player: e.g. "Every red
  ship was trapped, so the node at H8 ended early."
- move refused, ship trapped: e.g. "That ship is trapped on a depleted node
  and cannot move until the node goes."
- move refused, depleted destination: e.g. "H8 is a depleted node — a ship may
  fly over one, but cannot land on it."
- attack refused, attacker trapped: e.g. "A ship trapped on a depleted node
  cannot attack."
- attack refused, target trapped: e.g. "A ship trapped on a depleted node
  cannot be attacked." It must not read like the attacker's sentence — a
  player needs to know which of the two ships the refusal is about, exactly as
  `attacker-on-charged-node` and `target-on-charged-node` already read
  differently.

Player-facing text says **depleted node** (the word `rules.md` and the square
labels already use), not "burned-out node". Player-facing text is written for a
non-technical reader (`CLAUDE.md`).

---

## Steps

### Step 1 — Rules 0.24 → 0.25: the penalty goes, the trap arrives

Status: committed

Notes: Edited `doc/ruleset/rules.md` per the plan — §1's overview, §2's word
list, §5's pass rule, §6's landing sentence, §7's protection sentence and its
new "not the same bargain" paragraph, §8.1's depleted bullet, §8.3's "stays
where it is" sentence, §8.4 (collection half only), §8.5 (fully rewritten
around the trap rather than a choice) and §8.6 (seven steps, plus the new
"step 7 runs last of all" paragraph and the closing invariant extended to
step 7). Bumped `RULES_VERSION` in `src/rules/rulesVersion.ts` to `"0.25"` and
added one changelog entry at the top of `doc/ruleset/changelog.md`, marked as
a gameplay change with tagging on hold. No deviation from the plan.

Edit `doc/ruleset/rules.md` so that no sentence in it says a depleted node
costs energy, that a player's energy can fall, or that a ship may end a move on
a depleted node. Bump the document's version line to **0.25**, bump
`RULES_VERSION` in `src/rules/rulesVersion.ts` to the same string, and add one
`doc/ruleset/changelog.md` entry at the top (newest first) covering the whole
story, in the style of the existing entries, marked as a gameplay change with
tagging on hold. This is its own commit, ahead of every code change (S6). Do
**not** tag.

The sections to edit, with what each must say afterwards:

- **§1, the overview.** The sentence "A node that has burned out still costs
  its owner energy every turn and gives nothing back" becomes the trap: a node
  that has burned out traps the ship standing on it until it retires. Nothing
  else in §1 changes.
- **§2, the word list.** Add **Trapped** — a ship on a depleted node, which
  cannot move and cannot attack until the node under it retires. Place it with
  the other ship-related words, in the list's existing style.
- **§5, the pass rule.** Note that a trapped ship offers no action, so a
  player whose ships are all trapped would pass — which is what §8.6 step 7
  exists to prevent. Keep the existing "this should be uncommon" framing.
- **§6, the landing sentence.** The sentence that already says a move must
  land on a square empty of any ship also says it may not land on a
  **depleted** node, and says in the same breath that flying **over** one is
  still allowed. Add that a trapped ship has no move at all.
- **§7.** The current sentence — "a ship standing on an **inactive** or a
  **depleted** node is an ordinary target, and fights and is fought exactly
  like a ship on any other square" — is wrong in half and must split. §7's
  **protection sentence stops being about charged nodes alone and becomes
  about nodes**: a ship standing on a node that is charged **or** depleted can
  neither attack nor be attacked, and only a ship on an **inactive** node — or
  on no node at all — fights and is fought like a ship on any other square.
  Say that the two protections are **not the same bargain**: a charged-node
  holder chose its position and may leave whenever it likes, having given up
  striking out while it stands there; a trapped ship has neither choice. Do
  not leave any sentence in §7 saying a ship on a depleted node is an ordinary
  target.
- **§8.1, the depleted bullet.** A depleted node produces nothing, is not
  eligible to be charged, and **traps any ship standing on it** — that ship
  cannot move, and can neither attack nor be attacked (§7), until the node
  retires. It no longer costs anything. Keep it parallel with the charged
  bullet, which already says the ship holding a charged node "can neither
  attack nor be attacked"; the two now differ in what the node pays and in
  whether the ship may leave, not in whether it is out of combat.
- **§8.3.** "A ship left standing on it stays where it is (section 8.5)"
  becomes "a ship left standing on it is trapped there (section 8.5)".
- **§8.4, rewritten to its collection half.** At the end of each player's
  turn, that player collects energy for the charged nodes they are standing
  on, priced off the table. **The table is unchanged.** Delete the
  depleted-count paragraph, the cap at four, the collect-then-pay ordering, the
  "not netted" worked example and "a player's total energy never falls below
  zero" — nothing subtracts energy any more.
- **§8.5, rewritten.** It can no longer be about a choice, because a ship
  cannot choose a depleted square. An **inactive** node is still free to stand
  on and free to wait on. A **depleted** node is somewhere a ship is
  **caught**, not somewhere it goes: the ship that held the node when it
  burned out stays put, cannot move, can neither attack nor be attacked, and
  is released when the node retires — at which point its square is an ordinary
  square and it is an ordinary ship. Watch for §8.5's paragraph that currently
  says "neither an inactive nor a depleted node offers what a charged node
  offers: a ship standing on one can be attacked like any other ship, and may
  attack like any other ship (section 7)" — that is now true of an **inactive**
  node only, and the depleted half of it must go. The paragraph about a holder
  losing its protection the instant a node runs out needs care: the holder does
  **not** lose its protection any more — it stops being protected as a node's
  holder and becomes protected as a trapped ship, in the same instant, so what
  it loses is its freedom and its income, not its safety. Rewrite it to say
  that, rather than deleting it.
- **§8.6, now seven steps.** Step 2 keeps its collection and loses its
  payment. Step 3 says a ship standing on a node that goes depleted is trapped
  there (§8.5) rather than that it stays and starts paying. A new **step 7**
  runs after step 6: for each player in turn — the player who just moved
  first — if every one of that player's ships is trapped, then among the
  depleted nodes carrying those ships, consider only those whose ship would
  have a legal move if freed; the one with the **least remaining life** ends
  at once, retiring and being replaced exactly as step 6 retires and replaces,
  and its ship is free. If two are tied on remaining life the earlier in board
  order ends. If no such node exists, nothing happens.
- **§8.6's closing paragraphs.** Extend them to say why step 7 is last — it
  must see the board's depleted set as it stands after both step 3's new
  arrivals and step 6's retirements. Leave standing the statement that a
  node's state changes only in this sequence and never as part of resolving an
  action; it is now true of step 7 as well (S2).

Nothing else in the document changes. §3.1, §3.2, §4, §8.2, §8.3's tables, §9,
§10 and both appendices are untouched (S8).

Depends on: nothing — this is the first step, and it is what every later step
implements.

Verification (automated): Run `npm test` and confirm `rulesVersion.test.ts`
passes — it asserts `RULES_VERSION` matches the version line in `rules.md` and
that the changelog has a `## 0.25 ` entry. Then confirm by search that the
document no longer carries the retired claims: `grep -n "penalt" doc/ruleset/rules.md`
finds nothing; `grep -n "falls below zero" doc/ruleset/rules.md` finds nothing;
`grep -ni "depleted" doc/ruleset/rules.md` finds no surviving sentence in which
a depleted node costs, charges or is paid for. Confirm `grep -n "trapped"
doc/ruleset/rules.md` finds hits in §1, §2, §5, §6, §7, §8.1, §8.3, §8.5 and
§8.6. Run `npm run format:check`.

### Step 2 — The energy penalty goes, end to end

Status: committed

Notes: Implemented as planned, with one deviation. `MAX_DEPLETED_NODES_PRICED`
is **not** deleted from `src/rules/energy.ts` in this step, contrary to the
plan's file list: `src/hud/ScoreDisplay.tsx` still imports it to size the
depleted-pip row, and that row is not removed until Step 4, so deleting the
constant here would break the build for one step. It is kept, with its doc
comment rewritten to describe it as sizing the HUD row rather than pricing a
penalty, and a note that it survives only for the row's own sizing; Step 4's
own removal of the row is the point at which it actually goes. Everything
else — the `endOfTurn.ts` step 2 penalty block, `EnergyPenaltyEffect`,
`energyForDepletedNodes`, `energyPenaltyClause`, and `EnergyOverlay`'s
negative-settlement path — is deleted exactly as planned. Also fixed one test
in `endOfTurn.test.ts` ("costs the side that passes nothing while standing on
a depleted node") whose original replacement assertion (`endOfTurn` equals
`[]`) did not account for the node's own level-0 retirement firing in the
same sequence — changed to assert no `energy-collected`/`power-gained`
effect and an unchanged total, which is what the test is actually about.
`npm run format` was run at the end to satisfy Prettier on the touched test
files.

Delete everything that takes energy away from a player. Nothing in the game
subtracts energy after this step.

- **`src/rules/endOfTurn.ts`** — delete step 2's second half whole: the
  `depletedNodesOccupiedBy` / `energyForDepletedNodes` / floor /
  `EnergyPenaltyEffect` block and its comment. Delete the
  `EnergyPenaltyEffect` interface and remove it from the `EndOfTurnEffect`
  union. Step 2 becomes the collection alone; update its comment to say so.
- **`src/rules/energy.ts`** — delete `energyForDepletedNodes` and
  `MAX_DEPLETED_NODES_PRICED`, and drop any import left unused (e.g.
  `MAX_SHIPS_PER_SIDE`). Rewrite the module header and the
  `ENERGY_BY_NODES_HELD` comment: the table prices one direction now, not two.
  **Leave `depletedNodesOccupiedBy` where it is** — Step 3 moves it.
- **`src/board/announcements.ts`** — delete `energyPenaltyClause`, the
  `energy-penalty` case in `endOfTurnClauses`, the `EnergyPenaltyEffect`
  import and the `MAX_DEPLETED_NODES_PRICED` import. Correct
  `endOfTurnClauses`'s doc comment, which currently describes a turn that
  "collects and then pays". `depletedNodesOccupiedPhrase` and
  `scoreSentence` stay for now; Step 4 removes them.
- **`src/board/EnergyOverlay.tsx` and `.css`** — per D13: remove the negative
  settlement path, the `kind` field, the sign branch and the
  `--positive`/`--negative` class modifiers; remove the `--negative` rules,
  the `energy-overlay-sink` and `energy-overlay-pulse-contract` keyframes and
  the `--negative` selectors in the reduced-motion block.

Tests to update in the same step: `energy.test.ts` (the penalty half's tests go
with the functions), `endOfTurn.test.ts`, `announcements.test.ts`,
`EnergyOverlay.test.tsx`, `recovery.test.ts`, `fullGame.test.ts` (its
`EnergyPenaltyEffect` plumbing and the expected-total arithmetic: a side's
final energy is now exactly the sum of its collections) and
`camping.test.ts` (strip its penalty assertions so the file is green; Step 10
rewrites it properly around the trap).

Add to `endOfTurn.test.ts` a test that pins the new invariant directly:
running the sequence on a state where a side stands on several depleted nodes
leaves both sides' totals unchanged or higher, and produces no effect that
lowers a total.

Depends on: Step 1 (the document this implements). Nothing later depends on
this beyond a clean base, but every later step is easier for it.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` all pass. Then
`grep -rn "energy-penalty\|EnergyPenaltyEffect\|energyForDepletedNodes\|MAX_DEPLETED_NODES_PRICED" src/`
finds nothing.

### Step 3 — `src/rules/trap.ts`: who is trapped

Status: pending

Create `src/rules/trap.ts` — the trap's predicates and nothing else (D1, D3).
It must import only `board.ts`, `fleet.ts` and `gameState.ts`; it must **not**
import `movement.ts`, `combat.ts` or `endOfTurn.ts`, or the layering breaks.

It exports:

- whether a given ship is trapped — its square carries a node whose state is
  `depleted` (a direct status lookup, not a walk);
- **`trappingNodesFor(state, side)`** — the depleted nodes that side's ships
  stand on, in board order. This is `depletedNodesOccupiedBy` **moved** out of
  `energy.ts` and renamed (D2); delete it from `energy.ts`, move its tests from
  `energy.test.ts` to the new `trap.test.ts`, and rewrite its doc comment
  around the trap rather than around pricing;
- the trapped ships of a side, in the same board order;
- whether **every** ship of a side is trapped (D3: all of that side's ships;
  `actedThisPly` is not consulted).

Repoint the two remaining callers of the moved function — `scoreSentence` in
`src/board/announcements.ts` and `src/hud/ScoreDisplay.tsx` — at the new name.
Both call sites are deleted in Step 4; repointing them here is what keeps every
commit free of a dead export.

The module header should state the one fact the whole story rests on: a ship is
trapped exactly when it stands on a depleted node, there is no fourth node
state, nothing is stored, and (S2) a ship can only ever come to be there by a
node burning out underneath it.

Write `src/rules/trap.test.ts` covering: a ship on a depleted node is trapped;
a ship on a charged, inactive or ordinary square is not; a ship on a planet is
not (and cannot be, §3.2 — assert it against a hand-built state anyway, as
documentation); the trapping nodes come back in board order and exclude the
other side's; all-trapped is true only when every ship of the side is on a
depleted node, and false when one is free, on a planet, or on an inactive node.

Depends on: Step 2 (`energy.ts` is already down to its collection half, so the
move is a move and not a merge).

Verification (automated): `npm test` — `trap.test.ts` passes and the whole
suite stays green. `grep -rn "depletedNodesOccupiedBy" src/` finds nothing.

### Step 4 — The HUD loses the depleted pip row

Status: pending

The second pip row measured the penalty; with the penalty gone it measures
nothing, so it goes entirely (S4), together with everything derived from its
height.

- **`src/hud/ScoreDisplay.tsx`** — remove the depleted pip row, its `--empty`
  variant, the trapping-nodes call and the now-unused imports. A score cell is
  its name, its digits and the charged-node pip row. Update the module header
  ("two rows of pips") and the `SCORE_DIGITS` comment per D11.
- **`src/hud/ScoreDisplay.css`** — remove every `depleted-pip` rule, including
  the `--empty` block and the depleted selectors in the shared and landscape
  rules. Update the comment that explains why a pip fills with the colour of
  the kind of node it counts, which no longer has two kinds.
- **`src/board/announcements.ts`** — delete `depletedNodesOccupiedPhrase` and
  `scoreSentence`'s depleted clause. The sentence becomes, e.g., "Green: 24
  energy, 3 nodes held." Update `announcements.test.ts`.
- **`src/App.css`** — the portrait `--region-extent` derivation counts "two
  0.6rem pip rows + three 0.25rem internal gaps". Recompute it for **one** pip
  row and **two** gaps and write the new arithmetic into the comment: the score
  cell becomes roughly 4.475rem at the clamps' minima and 6.35rem at their
  maxima (was 5.325 / 7.2), so the info region's total becomes roughly 9.7rem
  to 15.0rem (was 10.6 / 15.8). Bring `--region-extent`'s clamp down to track
  the new range with the same small headroom it has today (today: floor
  10.75rem against a 10.6rem minimum, cap 16rem against a 15.8rem maximum),
  and scale the `vw` term in the same proportion. The landscape
  `--region-extent` is **width**-driven, not height-driven, and the removed row
  was no wider than the one that remains — leave it alone, and say why in the
  comment if it is not already clear.
- **`src/index.css`** — check the `--color-node-depleted` token's comment,
  which explains itself as what the HUD's pips agree with; the token is still
  used by the board's node artwork, so keep the token and correct the comment
  if it now overstates.
- **`src/hud/useCountUp.ts` and `useDisplayedEnergy.ts`** — per D11, keep the
  falling-target branch and correct both comments: play never lowers a total
  now, and the only falling target is a new game resetting both totals to 0,
  which snaps rather than rolling backwards.

Update `ScoreDisplay.test.tsx` and `Hud.test.tsx` for the row that is gone.

Depends on: Step 3 (the trapping-nodes function has moved; this deletes its
last two callers).

Verification (automated): `npm test` passes, including `ScoreDisplay.test.tsx`,
`Hud.test.tsx` and `announcements.test.ts`. `grep -rn "depleted-pip\|depletedOccupied\|depletedNodesOccupiedPhrase" src/`
finds nothing. The HUD's visual proportions are checked by the owner in Step
13, not here.

### Step 5 — A trapped ship cannot move, and no move ends on a depleted node

Status: pending

In `src/rules/movement.ts`, implement §6's new landing rule and §8.5's trap on
the movement side, per D4.

- Add `"ship-trapped"` and `"destination-depleted-node"` to
  `MoveRefusalReason`.
- `moveRefusalReason` checks the trap with the other facts about the ship —
  after `ship-already-acted`, before `out-of-range` — using `trap.ts`'s
  predicate. It checks the depleted destination with the other facts about the
  square, **after** `destination-occupied`.
- `legalDestinations` returns nothing for a trapped ship, as an early return
  beside the existing side and already-acted early returns. Depleted
  destinations need no extra filtering there — the function already filters on
  `moveRefusalReason` — but say so in the comment so a reader does not go
  looking for a second filter.
- `sideToMoveHasLegalMove` needs no change; it is built on
  `legalDestinations`.
- Update the module header: reach, a clear path, an empty destination **and a
  destination that is not a depleted node** are the whole of the restriction,
  and a trapped ship has no move at all.

In `src/board/announcements.ts`, add the two refusal sentences (D14). The
switch is exhaustive with no `default`, so this is required for the build to
typecheck, not optional polish.

Tests — `movement.test.ts`: a trapped ship has no legal destinations and its
refusal names the trap, not range or blocking; a depleted node is refused as a
destination with its own reason; a depleted node **occupied by a ship** is
refused as `destination-occupied` (D4's precedence); a depleted node may still
be **flown over**, both as the middle square of a two-square orthogonal move
and as either corner of an L; an inactive node and a charged node are still
legal destinations. `announcements.test.ts`: the two new sentences.

Depends on: Step 3 (`trap.ts`'s predicate).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`
pass, with the new `movement.test.ts` cases green.

### Step 6 — A trapped ship cannot attack, and cannot be attacked

Status: pending

In `src/rules/combat.ts`, per D5:

- Add `"attacker-on-depleted-node"` to `AttackRefusalReason`, immediately
  after `attacker-on-charged-node`, and `"target-on-depleted-node"`
  immediately after `target-on-charged-node`.
- `attackRefusalReason` checks each immediately after its charged-node
  counterpart, for the same kind of reason and in the same position in the
  existing order: everything about the attacker before anything about the
  target, and both before range, affordability and path — so a trapped target
  within reach is refused as protected, not as out of range.
- `legalTargets` adds the attacker-side condition to its early return, and
  filters ships on depleted nodes out of the targets it offers.
- Update the doc comments, which enumerate the check order.

In `src/board/announcements.ts`, add the attack refusal's sentence (D14).

`src/rules/actions.ts` is **not changed** (D5). Prove it in
`actions.test.ts`: `shipHasLegalAction` is false for a trapped ship, and
`sideToMoveHasLegalAction` is false for a side whose every eligible ship is
trapped — both without a third trap check existing anywhere in that module.

Tests — `combat.test.ts`: a trapped ship cannot attack and the refusal names
the attacker-side reason; `legalTargets` is empty for a trapped ship; a
trapped **enemy** ship is refused as a target with the target-side reason and
never appears in an attacker's `legalTargets`, even from a square that reaches
it and can afford the shot; a ship on an **inactive** node is unaffected in
both directions.

Depends on: Step 3 (`trap.ts`'s predicate) and Step 5 (which established the
refusal-plus-wording-in-one-step pattern; the announcement switch is
exhaustive).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`
pass, with the new `combat.test.ts` and `actions.test.ts` cases green.

### Step 7 — `src/rules/relief.ts`: choosing the node the relief ends

Status: pending

Create `src/rules/relief.ts` implementing §8.6 step 7's **choice** and nothing
else (D1). It exports one function: given a state and a side, the square of the
node that should end at once, or nothing.

The algorithm, exactly as §8.6 step 7 states it:

1. If not every ship of that side is trapped, there is no relief. Answer
   nothing.
2. The candidates are the depleted nodes carrying that side's ships, in board
   order (`trap.ts`'s trapping-nodes function).
3. Keep only the candidates whose ship **would have a legal move if freed**,
   tested against a hypothetical state built exactly as D6 describes: the
   candidate node's entry removed, everything else — every other node, every
   ship — untouched, `sideToMove` set to that side and `actedThisPly` emptied,
   then `legalDestinations` from `movement.ts`. Do not re-derive §6.
4. Among those, pick the **lowest** `level` — a depleted node's level counts
   down, so lowest is least remaining life — walking in board order with a
   strict comparison so a tie keeps the earlier square (D7).
5. If none qualifies, answer nothing.

The function draws no randomness, writes nothing back and mutates nothing. Its
comment must carry D6's game-over caveat and D6's "a move, never an attack"
note, since both are decisions a reader would otherwise question.

Write `src/rules/relief.test.ts` covering: no relief when one ship of the side
is still free; no relief when every ship is trapped but no trapped ship would
have a legal move even once freed (box them in with ships and edges); the
lowest-level qualifying node is chosen when several qualify; a lower-level
candidate that would **not** have a move is skipped in favour of a
higher-level one that would; a tie on level picks the earlier square in board
order; other depleted nodes are still barred as destinations inside the
hypothetical (a ship whose only reachable squares are other depleted nodes does
not qualify); the state passed in is not modified.

Depends on: Steps 3 and 5 (the predicates, and a `legalDestinations` that
already bars depleted destinations — without Step 5 the hypothetical would give
the wrong answer).

Verification (automated): `npm test` — `relief.test.ts` passes and the suite
stays green.

### Step 8 — A node that runs out traps; a node that retires frees

Status: pending

In `src/rules/endOfTurn.ts`, per D8 and D9:

- Add the **`ship-trapped`** effect (ship id, side, square) to the
  `EndOfTurnEffect` union, and push it in **step 3** immediately after the
  `node-ran-out` effect when a ship of either side stands on the node that
  just went depleted.
- Add the **`ship-freed`** effect (same shape) and push it immediately after
  `node-replaced` when the retiring node had a ship on it.
- Factor step 6's retire-and-replace body into one module-private helper
  (D9) — remove the entry, draw a replacement excluding the vacated square,
  write it at `STARTING_PRESSURE`, emit `node-replaced`, then emit
  `ship-freed` if a ship is there — carrying its existing comments across
  verbatim. Step 6 calls it; Step 9 of this plan gives it a second caller.
- Ship lookups: `runEndOfTurn` captures an occupancy index at entry and uses it
  for step 3's drain table. Ships never move during the sequence, so squares,
  ids and sides on that index stay correct; only `power` goes stale (step 1
  rewrites the ship objects). Use it, and note in a comment that it is safe for
  identity and square and must not be read for power.
- Update the module header and step 3's comment: a ship left standing on a node
  that runs out is now **trapped** there (§8.5), not merely left in place.

In `src/board/announcements.ts`, add the two clauses (D14). The
`endOfTurnClauses` switch is exhaustive, so this is required to typecheck.

Tests — `endOfTurn.test.ts`: a node running out under a ship reports
`node-ran-out` then `ship-trapped`, naming the ship, its side and its square;
a node running out with **no** ship on it reports no `ship-trapped`; a node
retiring under a ship reports `node-replaced` then `ship-freed`, and the ship
keeps its square and its power; a node retiring with no ship on it reports no
`ship-freed`; the ship trapped in step 3 is **not** freed in the same sequence
(step 6 only touches nodes depleted before the ply began).
`announcements.test.ts`: both new clauses.

Depends on: Step 3 (`trap.ts`, for the trapped-ships lookup where it is
convenient) and Step 2 (step 2's second half is already gone).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`
pass, with the new `endOfTurn.test.ts` cases green.

### Step 9 — §8.6 step 7: the all-trapped relief

Status: pending

In `src/rules/endOfTurn.ts`, add **step 7** after step 6, per S3, D8 and D10.

- Add the **`node-relief`** effect (the side being relieved, the square of the
  node ending early) to the `EndOfTurnEffect` union.
- Step 7 runs for `state.sideToMove` — the side that just played — and then
  for the other side, in that fixed order, once each. For each side, ask
  `relief.ts` for the node to end; if there is one, push `node-relief`, then
  call Step 8's retire-and-replace helper, which emits `node-replaced` and
  `ship-freed`.
- Comment why the order is fixed (it consumes the seeded stream when it fires,
  D10), why at most one node ends per side per ply (freeing one ship means the
  side is no longer all-trapped), and why step 7 is last (it must see the
  depleted set after both step 3's arrivals and step 6's retirements).
- Update the module header, which enumerates §8.6's ordering choices.

In `src/board/announcements.ts`, add the `node-relief` clause (D14), which must
read as the cause of the replacement that follows it.

Tests — `endOfTurn.test.ts`: with every ship of a side on depleted nodes and at
least one that would have a move if freed, the sequence ends exactly one node —
the lowest-level qualifying one — replaces it elsewhere, and emits
`node-relief`, `node-replaced` and `ship-freed` in that order; the freed ship
then has legal destinations; nothing is ended when one ship of that side is
still free; nothing is ended when every ship is trapped but none would have a
move if freed, and the seed is untouched in that case; the relief fires for the
side that did **not** just move as well as for the side that did; with **both**
sides all-trapped, both are relieved and the side that just moved is relieved
first (assert the effect order); a state where the relief cannot fire consumes
no more seed than the same state without it.
`announcements.test.ts`: the relief clause.

Depends on: Step 7 (the choice) and Step 8 (the factored retire-and-replace and
the `ship-freed` effect).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`
pass, with the new `endOfTurn.test.ts` cases green.

### Step 10 — Integration cover: camping, passing, and a whole game

Status: pending

Rewrite and extend the integration-level tests so the story's behaviour is
proven through the public rules API — `applyMove`, `applyAttack`,
`applyPassGuard` and the effects an action carries — rather than only through
`runEndOfTurn`.

- **`src/rules/camping.test.ts`** — rewrite around the reversal. Today it
  covers a ship that stays on a node that is not charged and owes nothing.
  Now: holding a charged node to the very end costs the ship its freedom — the
  ship is trapped from the instant the node runs out, has no legal destination
  and no legal target, and both refusals name the trap rather than range or
  blocking; the same ship is free the moment the node retires, and its square
  is then an ordinary square it can leave from; leaving in time costs nothing
  and the node burns on (the existing §8.3 behaviour, kept); a ship on an
  **inactive** node is unaffected in every way. Update the file header, which
  describes the old contract.
- **`src/rules/ply.test.ts`** — a trapped ship cannot be attacked: an enemy
  that reaches it and can afford the shot is offered no attack on it, and
  `applyAttack` refuses one; a trapped ship still blocks an enemy's path
  through its square; a side whose
  every ship is trapped and whom step 7 could not relieve passes under §5, and
  the pass guard still cannot loop (the existing game-over early return is
  untouched).
- **`src/rules/fullGame.test.ts`** and **`src/rules/seededReplay.test.ts`** —
  re-run and re-record as needed. Neither carries golden values, but both
  assert properties that this story moves: a side's final energy is the sum of
  its collections alone, and the same seed with the same actions still produces
  the same game — now including step 7's replacement draws, which consume the
  same stream. If either file's policy can now choose an illegal move, it is
  because it is not reading `legalDestinations`; fix the policy, not the rules.

Depends on: Steps 5, 6 and 9 (everything the trap does must exist before it
can be proven end to end).

Verification (automated): `npm test` passes in full, including the rewritten
`camping.test.ts`, and `seededReplay.test.ts`'s same-seed/same-actions
equality assertions still hold.

### Step 11 — `README.md`, the accessibility ledger, and the sweep

Status: pending

- **`README.md`** is player-facing (`CLAUDE.md`, Intended audience). Its
  overview paragraph and both quoted passages say a depleted node costs its
  owner energy; they become the trap: a ship caught on a node when it burns out
  cannot move or attack until the node retires, about ten turns later, and a
  ship may fly over a depleted node but cannot land on one. The passage saying
  the app shows "how many depleted nodes they are sitting on" follows the HUD
  and goes. The sentence that a turn "can pay you and charge you at once" goes:
  a score only rises now. Mention, in the same register as the rest, that a
  player whose every ship is trapped has one node ended early so they are not
  stuck passing. The `/update-readme` command reviews the branch diff and does
  this; use it if convenient, but the result must be checked by hand against
  the list above.
- **`doc/plan/00000021-accessibility-tech-debt/known-issues.md`** — review
  whether this story knowingly cost an accessible behaviour. Where it did, add
  a section for story 59 in the file's existing style. Where it did not, **add
  nothing**: that document is not an audit, and nothing goes in it that a story
  did not knowingly accept. (Note for the implementer: nothing is added to the square's
  accessible name for the trap, so the trapped state reaches assistive
  technology only through the depleted node already named there, the existing
  no-action condition on the side to move, and the live region's new
  sentences. Judge whether that is a knowingly accepted cost and note it if
  so.)
- **The sweep.** No sentence in `rules.md`, `README.md` or `src/` may still say
  that a depleted node costs energy, that a player's energy can fall, or that a
  ship may end a move on a depleted node. No dead export and no dead CSS may be
  left behind by the removed penalty and pip row.

Depends on: every step before it — this is the check that the change is
complete.

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass. Then the sweep:
`grep -rni "penalt" src/ README.md doc/ruleset/rules.md` finds nothing;
`grep -rn "depleted" README.md` finds only sentences about the trap and about a
node's life; `grep -rn "depleted-pip\|energy-penalty" src/` finds nothing;
`npm run build` succeeds.

### Step 12 — The owner looks at the HUD and hears the announcements

Status: pending

The one manual gate. Everything is implemented; this is the owner's eye on the
two things a test cannot judge. Nothing new is drawn on the board (S9), so
there is no mark to judge — what is left is the HUD's changed proportions and
the wording the game speaks.

Run `npm run dev` in the dev container and open the app. Play until a node
burns out under a ship (a short game — five a side, thirty rounds — reaches one
quickly; park a ship on a charged node and keep playing elsewhere), then look
at:

1. **The HUD's new proportions** with one pip row instead of two, in portrait
   and landscape, at a few window sizes including a narrow one: nothing
   misaligned, nothing cramped, the board not visibly smaller or larger than it
   should be.
2. **The announcements**, read from the live region or the console as a node
   runs out under a ship and again when it retires: "trapped", "free again"
   and, if a relief fires, the sentence explaining why a node ended early.
3. **That a trapped ship reads as trapped without a mark** (S9). On its
   owner's turn it should already be dampened and carry its no-action bar,
   and selecting it should offer no destination and no target. If it does not
   read, that is a finding for the owner to raise here — not a mark this plan
   adds on its own.

Depends on: Step 11 (everything is in and the build is clean).

Verification (manual): the owner confirms points 1–3, or names what to change.
A change requested here is a small follow-up edit to Step 4's files,
re-verified by `npm test` and by the owner's second look.
