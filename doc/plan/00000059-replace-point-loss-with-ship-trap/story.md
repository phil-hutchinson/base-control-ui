# Story 00000059 — A depleted node traps the ship on it

## Summary

A depleted node stops taking energy off its owner and starts taking something
harder to spare: the **ship**. A ship caught on a node when it burns out is
**trapped** there until the node retires, and can do nothing at all in the
meantime.

**The energy penalty goes, entirely.**

- §8.4 loses its second half. A player collects for the charged nodes they
  hold and pays nothing, ever. The cap-at-four paragraph, the
  collect-then-pay-and-do-not-net paragraph and the
  never-falls-below-zero paragraph all go with it.
- Nothing in the game subtracts energy any more. A score only rises.

**A depleted node traps.**

- When a charged node runs out with a ship standing on it, that ship is
  **trapped**: it cannot move and it cannot attack, for as long as the node
  stays depleted.
- The trap ends when the node retires — about ten turns later, on the
  ordinary recovery clock (§8.2). The ship is then standing on an ordinary
  square and is free again.
- A trapped ship **cannot be attacked**, any more than it can attack. Being
  on a node takes a ship out of combat in both directions, exactly as a
  charged node already does. It still blocks enemy movement, so it holds its
  square — but nothing an opponent can do will dislodge it, and nothing frees
  it early except the node retiring or the relief below.

**A move may not end on a depleted node.**

- This is new, and it is what keeps the trap simple. A ship can only ever be
  trapped by a node burning out underneath it — never by walking into one.
- Flying **over** a depleted node is still free. Only landing is barred, in
  the same sentence of §6 that already bars landing on an occupied square.
- The original story had ships wandering onto an empty depleted node and being
  trapped there. That is dropped by the owner's decision: nobody would ever
  choose it, so the rule bought nothing, and banning entry means a node's
  state can still change **only** in the end-of-turn sequence and never while
  an action is resolving (§8.6's closing invariant, which survives intact).

**The all-trapped relief.**

- If every one of a player's ships is trapped, that player has no action at
  all, and the game frees one of them rather than making them pass for ten
  turns.
- Among that player's trapped ships, consider only those that **would have a
  legal move** if freed. The node under the one whose node has the **least
  remaining life** ends at once — it retires and is replaced elsewhere,
  exactly as an ordinary retirement is — and its ship is free.
- If no trapped ship would have a legal move even once freed, nothing ends.
  The player is boxed in by ships and edges, not by the trap, and §5's
  existing pass rule already covers that.

**The HUD's depleted pip row goes.**

- The second pip row measured the energy penalty. With the penalty gone it
  measures nothing, so the row, its CSS and the layout arithmetic that counts
  it are removed. A score cell becomes its name, its digits and the
  charged-node pip row.

### What this does to the game

The pressure this replaces was a slow leak; the pressure it introduces is a
cliff. **Holding a charged node to the very end now costs you the ship for
about ten turns** — half of a standard game's rounds. A holder has to read
the node's remaining life off its glow and leave before it burns out, which
is the first time in this game that leaving a node has been urgent rather
than merely allowed.

Two consequences are deliberate:

- **Camping is punished positionally, not economically.** A player who parks
  on a node and never looks up loses a sixth of their fleet for a long stretch
  instead of dribbling energy away. Losing a ship's position matters more the
  fewer ships you have, so the five-a-side game feels this harder than the
  six.
- **Depleted squares become terrain.** Up to eight of the twelve nodes can be
  depleted at once, and none of them can be landed on, so the board carries a
  shifting set of squares that are simply not destinations. That narrows
  movement in the late midgame in a way nothing has before.

If either proves wrong it is a balance story of its own.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.24**.
This story takes it to **0.25**, in one version bump with one changelog entry
covering the whole story — the penalty's removal, the trap, the landing ban
and the relief step are one change and the document cannot describe any of
them alone. It is a gameplay change; tagging remains on hold per `CLAUDE.md`.
Later rules edits on this branch fold into that same bump rather than adding a
second one.

Planning documents say **ply** for the rules' and the UI's **turn**
(`CLAUDE.md`, Vocabulary). **Trapped** is a new word and is the same word
everywhere — rules, UI, code and tests — like **node**.

What exists today:

- **`doc/ruleset/rules.md`** — §1's overview sentence that a burned-out node
  still costs its owner energy; §2's word list; §5's pass rule; §6's landing
  sentence; §7's "a ship standing on an inactive or a depleted node is an
  ordinary target" sentence; §8.1's depleted-state description; §8.3's "a ship
  left standing on it stays where it is"; §8.4 in full; §8.5 in full; §8.6
  step 2's pay half and the six-step list itself.
- **`src/rules/energy.ts`** — `ENERGY_BY_NODES_HELD`,
  `MAX_DEPLETED_NODES_PRICED`, `energyForNodesHeld`, `chargedNodesHeldBy`,
  `depletedNodesOccupiedBy`, `energyForDepletedNodes`.
- **`src/rules/endOfTurn.ts`** — `EnergyPenaltyEffect`, step 2's second half,
  step 3's transition to depleted with `NodeRanOutEffect`, and step 6's
  retire-and-replace block, which is the machinery the relief step reuses.
- **`src/rules/movement.ts`** — `MoveRefusalReason`, `moveRefusalReason`,
  `legalDestinations`, `sideToMoveHasLegalMove`.
- **`src/rules/combat.ts`** — `AttackRefusalReason` (which already carries
  `attacker-on-charged-node`, the precedent for refusing an attack because of
  the square the attacker stands on), `attackRefusalReason`, `legalTargets`.
- **`src/rules/actions.ts`** — `sideToMoveHasLegalAction`,
  `shipHasLegalAction`; **`src/rules/ply.ts`**'s pass guard reads the first.
- **`src/board/announcements.ts`** — `depletedNodesOccupiedPhrase`, the
  penalty sentence and its `MAX_DEPLETED_NODES_PRICED` clause, the
  `energy-penalty` effect case, and `scoreSentence`.
- **`src/hud/ScoreDisplay.tsx`** and **`.css`** — the `depleted-pips` row and
  its `--empty` variant; **`Hud.tsx`**, **`App.css`** and **`src/index.css`**
  carry layout arithmetic and comments that count two pip rows.
- **`src/hud/useCountUp.ts`**, **`useDisplayedEnergy.ts`** — the roll, which
  documents a not-animated case for a **falling** target.
- **`src/board/Board.tsx`**, **`BoardSquare.tsx`** — `ShipCondition`, today
  the single value `no-action`, computed for the side to move only, drawn as
  a dampened ship plus `NoActionMark`.
- **`src/board/squareLabel.ts`** — the node-state and condition segments.
- **`src/rules/camping.test.ts`** — integration cover for a ship that stays
  on a node that is not charged, which is exactly the behaviour this story
  reverses.
- **`README.md`** — the overview paragraph and the two quoted passages, all
  three of which say a depleted node costs its owner energy.

Four facts shape the work and should not be rediscovered:

- **Banning entry makes the trap a pure end-of-turn phenomenon.** A ship can
  become trapped only in §8.6 step 3, and can be freed only in step 6. So
  every question the trap raises is answered inside `runEndOfTurn`, and
  §8.6's closing invariant — a node's state never changes while an action is
  resolving — needs no exception.
- **Step 6 already does everything the relief needs.** Retiring a node,
  removing its entry before the replacement pool is built, excluding the
  vacated square from the draw, and emitting `NodeReplacedEffect` are all
  written once in step 6. The relief is the same block under a different
  trigger, and the plan should factor it out rather than copy it.
- **A ship on a planet is never trapped**, because the node draw excludes
  planets and their neighbours (§3.2). All-trapped therefore means every ship
  of that side is on a depleted node, with none refuelling.
- **`depletedNodesOccupiedBy` survives its module.** It is no longer an
  energy question at all — it is the trap's — so it moves rather than being
  deleted.

## In scope

### 1. The rules edit, first and on its own

Version 0.24 → 0.25, with one changelog entry covering the whole story, in its
own commit ahead of the code.

**§8.4 loses its penalty half.** The section becomes: at the end of each
player's turn, that player collects energy for the charged nodes they are
standing on, priced off the table. The table stays exactly as it is. The
depleted-count paragraph, the cap at four, the collect-then-pay ordering, the
"not netted" worked example and "a player's total energy never falls below
zero" all go, because nothing subtracts energy any more.

**§8.1's depleted description** stops costing energy and starts trapping: a
depleted node produces nothing, is not eligible to be charged, and **traps any
ship standing on it** — that ship cannot move and cannot attack until the node
retires.

**§2 gains "Trapped"**: a ship on a depleted node, which cannot move and
cannot attack until the node under it retires.

**§6 gains the landing ban.** The sentence that already says a move must land
on a square empty of any ship also says it may not land on a **depleted
node**. Flying over one is explicitly still allowed, in the same breath, so
the distinction cannot be missed. A trapped ship has no move at all.

**§7 is corrected.** Its current sentence — that a ship on an inactive or a
depleted node is an ordinary target and fights and is fought like any other —
splits. A ship on an **inactive** node is unchanged. A ship on a **depleted**
node can **neither attack nor be attacked**. §7's existing protection
sentence therefore stops being about charged nodes alone and becomes about
nodes: a ship standing on a node that is charged or depleted is out of combat
in both directions, and only a ship on an inactive node — or on no node at
all — fights and is fought. The two protections are not the same bargain,
and §7 says so: a charged-node holder has chosen its position and may leave
whenever it likes, while a trapped ship has neither choice.

**§8.3's "a ship left standing on it stays where it is"** becomes "a ship left
standing on it is trapped there", pointing at §8.5.

**§8.5 is rewritten.** It can no longer be about a choice, because a ship
cannot choose a depleted square. An **inactive** node is still free to stand
on and free to wait on. A **depleted** node is somewhere a ship is **caught**,
not somewhere it goes: the ship that held the node when it burned out stays
put, cannot move, cannot attack, and is released when the node retires — at
which point its square is an ordinary square and it is an ordinary ship. The
paragraph about a holder losing its protection the instant a node runs out
stays and gains its new consequence: the ship does not merely lose its refuge,
it loses its freedom, and it cannot leave.

**§8.6 becomes seven steps.** Step 2 keeps its collection and loses its
payment. A new **step 7** runs after step 6, and says: for each player in
turn — the player who just moved first — if every one of that player's ships
is trapped, then among the depleted nodes carrying those ships, consider only
those whose ship would have a legal move if freed; the one with the **least
remaining life** ends at once, retiring and being replaced exactly as step 6
retires and replaces, and its ship is free. If two are tied on remaining life
the earlier in board order ends. If no such node exists, nothing happens.
§8.6's closing paragraphs are extended to say why step 7 is last — it must see
the board's depleted set as it stands after both step 3's new arrivals and
step 6's retirements — and its statement that a node's state changes only in
this sequence is left standing, now true of step 7 as well.

**§1 and §5 follow.** §1's sentence about a burned-out node costing energy
becomes the trap. §5's pass rule notes that a trapped ship offers no action,
so a player whose ships are all trapped would pass — which is what step 7
exists to prevent.

After this edit no sentence in `rules.md`, `README.md` or `src/` says that a
depleted node costs energy, that a player's energy can fall, or that a ship
may end a move on a depleted node.

### 2. The trap, as a rules module

A new **`src/rules/trap.ts`** owns the trap and nothing else:

- `isShipTrapped(state, shipId)` — the ship stands on a node whose state is
  `depleted`.
- `trappedShips(state, side)` and the all-trapped question the relief needs.
- `depletedNodesOccupiedBy` moves here from `energy.ts`, since it is now the
  trap's question and not an energy one. It may be renamed to say so.
- The relief's choice: the candidate nodes, the would-have-a-legal-move
  filter, the least-remaining-life pick and the board-order tie-break, exposed
  as one function `endOfTurn.ts` calls. `level` counts **down** while
  depleted, so least remaining life is the **lowest** level.

The would-have-a-legal-move test must ask the question as it will be after
the node ends: the ship untrapped, its own square an ordinary square, and
every **other** depleted node still barred as a destination. The plan should
decide whether that is a hypothetical state passed to `legalDestinations` or
a parameter on the destination filter, and say why — but it must not be a
second copy of §6.

### 3. Movement, attacks and actions

**`movement.ts`.** Two new `MoveRefusalReason` values: one for a ship that is
trapped, and one for a destination that is a depleted node. Both are distinct
from `destination-occupied` and from `out-of-range`, so a player is told the
real reason. `moveRefusalReason` checks the trap early — with the other
reasons about the ship itself, before anything about the destination — and
checks the depleted destination with the other destination reasons.
`legalDestinations` answers with nothing for a trapped ship and filters
depleted squares out for every other ship. `sideToMoveHasLegalMove` follows
for free.

**`combat.ts`.** A new `AttackRefusalReason` for an attacker on a depleted
node, sitting immediately after `attacker-on-charged-node` in the same
check order and for the same kind of reason. **No** target-side reason is
added: a ship on a depleted node stays a legal target. `legalTargets` answers
with nothing for a trapped ship.

**`actions.ts`.** `sideToMoveHasLegalAction` and `shipHasLegalAction` need no
change of their own — both are built on `legalDestinations` and
`legalTargets`, which now already answer nothing for a trapped ship. The plan
should confirm this rather than add a third trap check.

### 4. The end-of-turn sequence

**`endOfTurn.ts`.**

- Step 2's penalty half goes: the `depletedNodesOccupiedBy` /
  `energyForDepletedNodes` / floor / `EnergyPenaltyEffect` block is deleted
  whole, and `EnergyPenaltyEffect` is removed from the `EndOfTurnEffect`
  union.
- Step 3 gains a **`ShipTrappedEffect`** alongside `NodeRanOutEffect` when the
  node that ran out had a ship on it, naming the ship, its side and its
  square — the announcement needs to say a ship was caught, and reconstructing
  it from `node-ran-out` plus a board lookup is the wrong shape.
- Step 6 gains a **`ShipFreedEffect`** when a retiring node had a ship on it,
  the mirror of the above. It is emitted for an ordinary retirement and for
  the relief alike.
- Step 6's retire-and-replace body is factored out so step 7 calls the same
  code: remove the entry, draw a replacement excluding the vacated square,
  write it at `STARTING_PRESSURE`, emit `NodeReplacedEffect`.
- A new **step 7** applies the relief for each side, the side that just moved
  first, emitting a **`NodeReliefEffect`** (or a flag on the replacement
  effect — the plan chooses) so the announcement can explain why a node ended
  early. At most one node ends per side per ply: freeing one ship means that
  side is no longer all-trapped.

Step 7 draws a replacement square, so it **consumes seed** when it fires.
That is correct and recorded, but it is the reason step 7 must run in a fixed
side order.

### 5. What the player sees and hears

**The HUD.** `ScoreDisplay.tsx` loses the depleted pip row entirely, along
with its `--empty` variant and its `MAX_DEPLETED_NODES_PRICED` import.
`ScoreDisplay.css`, `Hud.tsx`, `App.css` and `src/index.css` lose the
depleted-pip rules and the sizing arithmetic and comments that count two pip
rows — the score cell is one row shorter and everything derived from its
height follows.

`useCountUp`'s not-animated case for a **falling** target becomes
unreachable, since no total ever falls. The plan decides whether to delete it
or keep it as a guard, and says why; whichever it picks, the comment must not
go on describing a case the game can no longer produce.

**The board gains nothing.** No new mark, no new `ShipCondition`, no change
to how a ship or a node is drawn — this is the owner's decision. A trapped
ship already reads: it sits on a grey depleted node, and on its owner's turn
the existing `no-action` condition dampens it and draws its bar, because a
trapped ship genuinely has no legal action. That machinery costs this story
nothing and is left exactly as it is.

**Announcements.** The penalty sentence, `depletedNodesOccupiedPhrase`, the
`energy-penalty` case and `scoreSentence`'s depleted clause all go. New
clauses say that a node ran out and caught a ship, that a node retired and
freed one, and that a node ended early to free a player whose ships were all
trapped. The two new move refusals and the two new attack refusals — one for
a trapped attacker, one for a trapped target — each get wording of their own,
distinct from being out of range or blocked, and distinct from each other: a
player must be able to tell which of the two ships a refusal is about.

**The square label** is unchanged: it already names the depleted node under
the ship, and the existing no-action condition segment already appears for a
trapped ship of the side to move.

Per `CLAUDE.md`, accessibility repair is not this story's work; anything this
change knowingly costs goes as a note in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, and no test is
added for accessibility.

### 6. `README.md`, tests and the version

`README.md` is player-facing (`CLAUDE.md`, Intended audience). Its overview
paragraph and both quoted passages say a depleted node costs its owner energy;
they become the trap, and the passage about a score's two pip rows follows the
HUD.

Tests follow the change:

- `energy.test.ts` — the penalty half's tests go with the functions.
- A new `trap.test.ts` — who is trapped, the relief's candidate filter, the
  least-remaining-life pick and the board-order tie-break, and the case where
  no candidate qualifies.
- `movement.test.ts` — a trapped ship has no destinations and is refused with
  the trap reason; a depleted node is refused as a destination with its own
  reason; a depleted node may still be **flown over**.
- `combat.test.ts` — a trapped ship cannot attack and is refused with the new
  reason; a trapped ship is refused as a **target** with its own reason, and
  never appears in `legalTargets`.
- `endOfTurn.test.ts` — no penalty is ever taken; a node running out under a
  ship reports it trapped; a node retiring under a ship reports it freed; step
  7 fires when a side's every ship is trapped, ends the lowest-level qualifying
  node, replaces it and frees its ship; step 7 does nothing when a trapped
  ship would have no move anyway; step 7 does nothing when one ship is still
  free.
- `camping.test.ts` — rewritten around the reversal: staying on a charged node
  to the end now costs the ship its freedom, and leaving in time does not.
- `actions.test.ts`, `ply.test.ts` — a side whose every ship is trapped passes
  if step 7 could not free one, and the pass guard still cannot loop.
- `ScoreDisplay.test.tsx`, `announcements.test.ts`, `squareLabel.test.ts`,
  `Board.test.tsx`, `BoardSquare.test.tsx`, `Hud.test.tsx` — the row that is
  gone, the mark that is new, and the wording.
- `fullGame.test.ts`, `seededReplay.test.ts` — re-recorded, with the
  same-seed, same-actions, same-game premise intact.
- `rulesVersion.test.ts` — `RULES_VERSION` is `0.25` and the changelog has an
  entry for it.

## Out of scope

- **The node clocks are untouched.** Capacity, both drain tables, the recovery
  table, pressure, the charge draw, the opening deal and node placement all
  stay exactly as they are. In particular the recovery table is **not**
  retuned to make the trap shorter or longer — ten turns is what the existing
  clock gives, and whether that is the right sentence is a balance story.
- **The energy table is not rebalanced** to compensate for the penalty's
  removal. Scores will run higher; that is expected and accepted.
- **No way for an opponent to break a trap.** A trapped ship cannot be
  attacked, so an enemy cannot free it, dislodge it or take its square. The
  trap runs its clock out, or the relief ends it.
- **No new node state.** A trapped ship is a fact about a ship standing on a
  `depleted` node, not a fourth state, and nothing is stored on the node.
- **Nothing new is drawn, on the node or the ship.** A depleted node already
  reads as grey and already shows its remaining life through its gradient, and
  a trapped ship already reads as having no action on its owner's turn. No new
  mark, condition or artwork is added anywhere.
- **Fleet sizes, planets, rounds, the clock and combat's returns** are
  untouched.
- **No warning before a node burns out.** A player reads the node's glow, as
  they do today. A countdown, a flashing node or a confirmation before the
  last turn on a dying node would each be a story of its own.

## Verification

The rules and the version:

- `RULES_VERSION` agrees with `rules.md` at 0.25 and the changelog has one
  entry covering the story. No wording in `rules.md`, `README.md` or `src/`
  says a depleted node costs energy, that energy can fall, or that a ship may
  land on a depleted node.

Energy:

- No sequence of play reduces either side's total. A player standing on six
  depleted nodes pays nothing.
- A player holding three charged nodes collects 6 whatever else their ships
  are standing on.

The trap:

- A ship holding a charged node that runs out is trapped from that instant: it
  has no legal destination and no legal target, and both refusals name the
  trap rather than range or blocking.
- The same ship is free the moment the node retires, and its square is then an
  ordinary square.
- A ship may fly over a depleted node but may not land on one, and the refusal
  says so.
- A trapped ship still blocks an enemy's path, and cannot be attacked: it is
  refused as a target with its own reason, and an enemy holding it in range
  is offered no attack on it.
- A ship on an **inactive** node is unaffected in every way.

The relief:

- With every one of a side's ships on depleted nodes, the end-of-turn sequence
  ends exactly one node — the lowest-level one whose ship would have a move —
  replaces it elsewhere, and frees that ship, and the announcement says why.
- Ties on remaining life are broken by board order, deterministically.
- With one ship of that side still free, nothing is ended.
- With every ship trapped but no trapped ship able to move even if freed,
  nothing is ended and the turn passes under §5.
- The relief fires for the side that did not just move, as well as for the
  side that did.

What the player sees:

- The score cell has one pip row, for charged nodes held, and the HUD is
  correspondingly shorter with nothing misaligned at any window size.
- Nothing new is drawn on the board. A trapped ship of the side to move
  reads as having no action through the existing condition; selecting it
  offers no destination and no target.
- **Manual check by the owner**: the HUD's new proportions look right in
  portrait and landscape, and the announcements read correctly as a node runs
  out under a ship and again when it retires.

Whole build:

- `fullGame.test.ts` plays a complete game and `seededReplay.test.ts` replays
  the same seed to the same game.
- Typecheck, lint, `format:check` and the full test suite pass, with no dead
  exports or CSS left behind by the removed penalty and pip row.
