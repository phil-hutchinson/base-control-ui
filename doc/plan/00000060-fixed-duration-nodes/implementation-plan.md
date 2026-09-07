# Implementation Plan — Story 00000060, A node's countdown starts when you step on it

## What this story does

Today a node's life is a pair of random clocks. A charged node carries a
capacity of 60 and a drain that rises at the end of every turn by a drawn
amount — slowly while nobody stands on it, more than twice as fast while
somebody does — and it goes depleted when the drain reaches capacity. A
depleted node then subtracts a drawn recovery each turn and retires after
about ten. Nodes therefore expire whether or not the players ever touch
them, and how long any node has left is a hidden number.

This story replaces both clocks with **one fixed countdown that only runs
while a ship is standing on the node**, and puts the number on the board:

- A charged node **nobody has stepped on has no countdown at all** and will
  sit at its baseline for the rest of the game.
- **A ship stepping on starts a countdown of 11 plies**, which lands on six
  of that player's own turn ends. A **black number** in the middle of the
  square counts those turns down from 6 to 1.
- **Leaving a charged node depletes it immediately**, as the move resolves.
- A depleted node that **traps** a ship carries an 11-ply countdown and a
  **white number** counting the trapped player's own turns from 5 down; a
  depleted node **left behind by a ship walking off** carries a 2-ply
  countdown and no number. Both simply retire when their countdown runs out.
- **A ship can no longer stand on an uncharged node**: a move may not end on
  an inactive node any more than on a depleted one, and §3.2's fallback is
  narrowed so no node can ever appear under a ship.
- Capacity, both drain tables, the opening drain table and the recovery table
  are **deleted**, and with them two of the game's random elements. Two rules
  added by story 63 — the fourth node placed directly already charged, and the
  relief's random tie-break — become unreachable and are deleted too.

`story.md` in this folder is the full statement of the change and the owner's
reasoning about what it does to the game, including the alternatives the owner
considered and dropped (not spawning a depleted node at all when a holder walks
off; leaving the camping ban to a later story). This plan does not repeat that
reasoning: it says how to get there, in what order, and records the design
decisions **this plan** makes, because code in this repository deliberately
carries no design history (`CONTRIBUTING.md`, "Comments").

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say (`CLAUDE.md`, Vocabulary). They mean the same thing
  here: one player's single action. **Do not mix them.** This story is full
  of chances to get it wrong — the story text says "11 plies", so
  `rules.md` must say **11 turns** (counting both players' turns), while the
  code says `PLIES`.
- **Move** means the movement action specifically — one ship changing
  squares. It is never a synonym for a ply or a turn.
- **Countdown** is this story's new word, and it is the **same word
  everywhere** — `rules.md`, the UI, code, tests, comments. Do **not** call
  it a clock: §10 already owns "clock" for the optional per-player chess
  clock, and the document cannot have that word mean two things. Do not
  invent synonyms ("timer", "life", "fuse", "duration") in identifiers or in
  player-facing text.
- **Node** is the word everywhere; a node is `inactive`, `charged` or
  `depleted`.
- The **trap** is a depleted node with a ship caught on it. The **exit** node
  is this plan's word for the depleted node a holder leaves behind by walking
  off; it is fine in comments and tests, and it is **not** a stored kind — see
  D3.
- **Baseline** is the state of a charged node with no countdown: no number,
  minimum ball.

## Settled decisions — do not reopen

Settled by the owner in `story.md` and the planning brief. A step that finds
one inconvenient should escalate, not re-decide.

- **S1.** A charged node has a countdown **if and only if** a ship is standing
  on it. It starts exactly one way: a ship **moves onto** the node. There is
  no second way in.
- **S2.** The charged countdown is **11 plies**, starting mid-turn, so its
  first ply is spent at the end of that same turn and the eleven land on
  **six** of the holder's own turn ends.
- **S3.** A ship that **leaves** a charged node depletes it **immediately**,
  as the move resolves — not at the end of the turn. It never reverts to a
  slower burn and it is never inherited by the opponent.
- **S4.** A depleted node that **traps** a ship gets an **11-ply** countdown
  starting at a turn end, so it covers **five** of the trapped player's turns
  and retires at the end of the **opponent's** turn.
- **S5.** A depleted node **left behind** by a ship walking off gets a
  **2-ply** countdown, no number, and is drawn at the start of the depleted
  artwork's cycle for both plies.
- **S6.** A move may **not** end on an **inactive** node, exactly as it may
  not end on a depleted one. Flying over either is still free.
- **S7.** **No node ever appears under a ship.** §3.2's fallback is narrowed
  to relax spacing only: it still never places a node on a planet, on another
  node, or on a ship.
- **S8.** The charged node's number is **black**; the trap's is **white**;
  both count the **holder's own turns**, and neither ever reads 0. The exit
  node carries no number.
- **S9.** The ball grows **one step per ply** at every turn end, from the
  minimum at 11 plies left to the maximum at 1 ply left. A charged node with
  no countdown sits at the minimum indefinitely.
- **S10.** **Deleted outright:** `NODE_CAPACITY`, `OPENING_DRAIN_TABLE`,
  `EMPTY_NODE_DRAIN_TABLE`, `HELD_NODE_DRAIN_TABLE`,
  `DEPLETED_RECOVERY_TABLE`, the fourth-node-placed-directly rule and its
  effect, and the relief step's random tie-break. Nothing replaces any of
  them.
- **S11.** The queue is **untouched**: three inactive nodes at priorities 1,
  2 and 3, charging top-down, rotating on a turn that charges nothing, swept
  and refilled on a turn that charges something, by the same weighted
  placement from the same widening pool. Combat, movement costs, energy,
  power, planets, the trap and the relief keep their current rules.
- **S12.** The rules edit is version **0.26 → 0.27**, with exactly **one**
  changelog entry covering the whole story, in its **own commit ahead of the
  code**. A later rules edit on this branch — including Appendix B's
  remeasured figures in Step 7 — folds into that same 0.27 entry; there is
  never a second version bump on one branch. Tagging stays on hold: bump and
  write the entry, do **not** run `/tag-rules`.
- **S13.** Determinism: every remaining draw comes from the seeded stream via
  `src/rules/random.ts`, and the draw order stays fixed and stated, because a
  recorded game replays by replaying the seed. `Math.random` is banned by
  lint in game code.
- **S14.** Per `CLAUDE.md`: **no plan steps for testing accessibility**, no
  review fixtures, no manual test scripts. Where an existing automated test
  has a straightforward path to being updated, update it; where it does not,
  this story does not owe it one. Anything knowingly lost goes as a note in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Design decisions made while planning

Everything below is a decision **this plan** makes, with the alternatives
rejected. A step that needs to know "why is it done this way" should find the
answer here.

### D1 — `NodeStatus.level` carries plies remaining

`NodeStatus` in `src/rules/gameState.ts` stays exactly two fields — `state`
and `level` — and `level`'s meaning per state becomes:

| State    | `level` is           | Set to                                                | At the end of a ply             | Changes state at |
| -------- | -------------------- | ----------------------------------------------------- | ------------------------------- | ---------------- |
| Inactive | priority (1, 2 or 3) | dealt at random by a refill                           | rotates 1→2, 2→3, 3→1, or swept | charged (§8.2)   |
| Charged  | plies remaining      | **0** on charging or dealing; 11 when a ship steps on | −1, but only if above 0         | depleted at 0    |
| Depleted | plies remaining      | 11 (trap) or 2 (exit)                                 | −1                              | retires at 0     |

**`level === 0` on a charged node means "no countdown"**, and it is
unambiguous: a countdown that reaches 0 depletes the node inside the same
step, so a charged node never sits at 0 with a countdown that has run out.

Rejected: a separate optional `pliesRemaining` field alongside `level`. It
would leave `level` with nothing to mean for two of the three states, and
every existing test fixture builds a `NodeStatus` by hand.

Rejected: renaming `level` to something countdown-flavoured. It still carries
a priority for an inactive node, so no single better name exists, and the
rename would touch every test fixture in the repository for no behavioural
gain. The field's doc comment in `gameState.ts` — the table above — is the
place that carries the meaning, and it must be rewritten in Step 4.

### D2 — A new leaf module `src/rules/countdown.ts`

The countdown's constants and its pure arithmetic live in a new module,
`src/rules/countdown.ts`, in the style of `nodeQueue.ts` and `trap.ts`: a
leaf that knows about a node's `state` and `level` and nothing about
`GameState`. It owns:

- `CHARGED_COUNTDOWN_PLIES` (11), `TRAP_COUNTDOWN_PLIES` (11) and
  `EXIT_COUNTDOWN_PLIES` (2).
- Spending one ply of a countdown.
- **The number** a node shows, or nothing (D4).
- **The cycle position** the artwork is drawn at (D5) — moved here from
  `nodes.ts`, because it is now derived from the countdown rather than from
  drain.

Two constants both equal to 11 is deliberate, not duplication: they answer
different questions (six of the holder's turns; five of the trapped player's
turns) and either could be retuned alone. Say so in the module comment.

Rejected: putting all of this in `nodes.ts`. `nodes.ts` loses capacity, four
tables and `drawTableAmount` in this story and is left holding the node
states and the opening deal; adding the countdown there would mix the deal
with the model. A leaf module also keeps `endOfTurn.ts`, `ply.ts` and
`src/board/` importing one small thing rather than reaching into the deal's
module.

Import direction is one-way and must stay that way: `nodes.ts` ←
`countdown.ts` ← (`endOfTurn.ts`, `ply.ts`, `Board.tsx`). `nodes.ts` must not
import `countdown.ts`.

### D3 — Trap and exit are told apart by ship presence, not by a stored kind

The two kinds of depleted node need to be distinguished for **display only**
— the trap shows a white number and travels through the depleted artwork's
cycle; the exit shows no number and stays at the start of that cycle (S5,
S8). Their countdown values overlap (a trap passes through 2 and 1 on its way
out), so the length cannot tell them apart.

They are told apart by **whether a ship is standing on the square**, which
is exact:

- A trap is created only by a node running out under a ship, that ship cannot
  move (§8.5) and cannot be attacked (§7), and the node retires the instant
  the ship would be freed — so a trap always has its ship.
- An exit node has no ship on it by construction, and after this story
  nothing may ever land on a depleted node.

`src/board/Board.tsx` already computes each square's occupant, so it has the
fact to hand.

Rejected: storing the countdown's initial length (or a `kind`) on the node.
It doubles the node's state to serve one visual distinction that is already
derivable, and every hand-built fixture would have to set it.

The trade-off is recorded here because it is a genuine coupling: if a future
story ever lets a ship land on a depleted node, or lets a trapped ship be
removed, this derivation breaks. Step 7 adds a long-run invariant assertion
that pins the premise (D9).

### D4 — The number: the holder's own turns still to come

The number is derived from the plies remaining. It differs between the two
countdowns because they start at different moments — the charged countdown
starts mid-turn, the trap's at a turn end — so the holder's turn ends fall on
opposite parities:

| Plies left | 11  | 10  | 9   | 8   | 7   | 6   | 5   | 4   | 3   | 2   | 1   | 0        |
| ---------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | -------- |
| Charged    | 6   | 5   | 5   | 4   | 4   | 3   | 3   | 2   | 2   | 1   | 1   | depletes |
| Trap       | 5   | 5   | 4   | 4   | 3   | 3   | 2   | 2   | 1   | 1   | 1   | retires  |

Read as arithmetic: charged is `ceil(plies / 2)`; trap is `floor(plies / 2)`,
floored at 1 so it never reads 0 on the last ply (the story's trap table
keeps the 1 up for the tenth ply). A charged node at 0 plies and an exit node
show **no** number at all.

These two rows are exactly the story's two tables and must be pinned by a
unit test, row for row, in Step 2.

### D5 — The ball: one step per ply, over eleven

`nodeCyclePosition` is rewritten against plies remaining and moved to
`countdown.ts` (D2). It returns a position in [0, 1] where 0 is the start of
the state's artwork cycle and 1 the end:

- **Charged, no countdown** → 0. The minimum, indefinitely (S9).
- **Charged, `p` plies left** → `(11 − p) / 10`. So 0 on the ply a ship steps
  on, and 1 with one ply left — the biggest the ball ever gets.
- **Depleted trap, `p` plies left** → `(11 − p) / 10`, the same travel, so the
  grey ball winds down across the trap's eleven plies.
- **Depleted exit** → 0 for both of its plies (S5).

The artwork itself — the gradient stops, the colours, the radii in
`NodeMarker.tsx` — is **unchanged**. Only what drives the middle stop
changes.

### D6 — Where the countdown starts and ends: inside `applyMove`

`src/rules/ply.ts`'s `applyMove` gains two node changes, applied as the move
resolves, in this order:

1. If the square the ship **left** carries a **charged** node, that node
   becomes **depleted** with `EXIT_COUNTDOWN_PLIES` (S3). It does not matter
   whether it had a countdown.
2. If the square the ship **arrived on** carries a **charged** node with no
   countdown, its countdown is set to `CHARGED_COUNTDOWN_PLIES` (S1, S2). A
   charged node that already carries one is left alone — it cannot happen,
   since such a node always has its holder standing on it and an occupied
   square is not a legal destination, but the guard states the rule that a
   countdown never restarts.

This is a **knowing exception** to the invariant that a node's state changes
only in the end-of-turn sequence — the story says so explicitly, and §8.6's
closing paragraph is reworded for it in Step 1. Two consequences for the
code:

- `ply.ts`'s attack invariant check, which asserts no node's `state` or
  `level` differs across a fight, **stays exactly as it is**: neither
  combatant can be standing on a charged node (§7 keeps a node's holder and a
  trapped ship out of combat in both directions), so an attack still cannot
  change a node. Its doc comment, which says "No action changes a node's
  state, full stop", must be reworded to name the move as the one exception.
- `applyMove`'s own doc comment, which currently says "If the square the ship
  left was a charged node, it stays charged — leaving a node does not end it",
  says the opposite of the new rule and must be rewritten.

Rejected: doing the departure in the end-of-turn sequence. The story is
explicit that the square must stop being landable **for the rest of that
turn**, which only an immediate change gives.

### D7 — A `node-spent` move effect, and its announcement

Depleting a node mid-turn is a state change a player must be told about, and
every other node event in this codebase is reported as an effect. `ply.ts`
gains a `NodeSpentEffect` (`type: "node-spent"`, carrying the square) as a
member of `MoveEffect`, pushed **before** the end-of-action effects so the
order reads: the move, the node it spent, then the ply's end.

`src/board/announcements.ts` speaks it in the `moved` sentence, between the
move sentence and the action-ending clauses, worded plainly — e.g. "The node
at H8 ended when the ship left it." It is **not** an `EndOfTurnEffect` and
does not belong in `endOfTurnClauses`.

Rejected: no effect at all, letting the board redraw speak for itself. It
would be the only node state change in the game that reports nothing, and the
live region would be silent about a node the player just destroyed.

### D8 — One widened move refusal, not two

`MoveRefusalReason`'s `destination-depleted-node` is **renamed**
`destination-uncharged-node` and fires for a destination whose node state is
`depleted` **or** `inactive` (S6). One reason, not two, because §6 states both
in one sentence and refuses them for the same reason; a split would imply a
distinction the rules do not make.

The player-facing wording in `announcements.ts` widens with it, and must name
neither state specifically, since the reason does not carry which one it was —
something like "H8 holds a node that is not charged — a ship may fly over one,
but cannot land on it."

If the owner later wants state-specific wording, the follow-up is to pass the
node's state to the message, not to split the refusal reason. Do not do that
here.

### D9 — What replaces the deleted rules' safety nets

Two deletions (S10) remove code that existed for cases that can no longer
arise. Neither is replaced by a throw:

- **The direct fourth charged node.** `runCharging` charges
  `min(shortfall, inactive nodes available)` and stops. The shortfall can
  never exceed two — at most one countdown starts per turn, so at most one
  node expires per turn, plus at most one node walked off in the same turn —
  and three inactive nodes always cover two. Step 7 pins this with a long-run
  assertion rather than a runtime throw, because a throw mid-game would turn
  a rules bug into a broken app.
- **The relief's random tie-break.** `reliefSquare` takes the candidate with
  the lowest `level`; on a tie it takes the **first in board order**, which is
  the order `trappingNodesFor` already returns. A tie cannot happen (every
  trap begins at the expiry that caused it, at most one per ply, and all
  countdowns are the same length), so this is a deterministic tidy-up of an
  unreachable case, not a rule. `reliefSquare` stops consuming the seed
  entirely and its signature loses the seed it returns — or keeps returning
  it unchanged; either is acceptable, but if the seed argument goes,
  `endOfTurn.ts`'s step 7 must stop threading it, and the comment there about
  step 7 being "the only step past this point that still draws from the
  seeded stream" must go, since **nothing** in the end-of-turn sequence draws
  from the stream any more except step 5's refill.

Long-run invariants worth asserting once the model is in (Step 7):

1. A charged node with a countdown always has a ship standing on it.
2. At most one `node-ran-out` effect per ply.
3. At most two `node-charged` effects per ply, and the board is back at four
   charged at the end of every ply.

### D10 — What the seeded stream still contains

After this story the stream has exactly three consumers, and the story's §1
recount depends on the list being right:

1. The opening deal's four charged squares (`drawNodeSquare`, 4 steps) and
   its one refill (4 steps) — **8 steps**, down from 12, since the four
   opening drain draws are gone.
2. Every queue refill during play — 4 steps each.
3. Every fight's two planet returns.

Nothing else draws: charging draws nothing, the end-of-turn countdowns draw
nothing, retirement draws nothing, the relief draws nothing. `nodes.test.ts`
asserts the deal advances the seed by 12 and must be changed to 8.

`drawUniformSquare` in `nodePlacement.ts` loses its only production caller
with the direct-fourth placement. Delete it, and its tests, unless the
long-run test still needs it as a comparison draw (it currently uses it for
the unweighted control in the spread measurement — check before deleting).

### D11 — The number is drawn above the ship

`BoardSquare` is a single-cell grid whose children stack in DOM order, so the
countdown number goes in as a **new element after `ShipModel`** — a node that
carries a number always has a ship on it, and the number must not disappear
under it.

A new component `src/board/NodeCountdown.tsx` (plus `NodeCountdown.css`)
draws one SVG `<text>` centred in the same 0–100 viewBox `NodeMarker` and
`ShipModel` use, so it scales with the square exactly as they do. It is
`aria-hidden` and carries no title or description, exactly like the other two
(D12 covers what that costs). Black on a charged node, white on a trap.

Starting values for the owner's eye, not a measured result: font-size around
44 units, bold, `text-anchor: middle` with a central baseline. The ship art
deliberately leaves a clear band across the middle of the square (`ShipModel`
puts its gauge at the top and its hull low), so a centred number should read;
Step 8 is where the owner judges it.

No collision with the interaction markings is possible: the destination disc
is drawn only on an empty square, the target ring only on an attackable ship
(never a node holder or a trapped ship), and the selected brackets sit at the
corners.

### D12 — Accessibility

Per S14, nothing is added to the accessible name and no new announcement is
written for the countdown. One note goes in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, under a new
"From story 60" heading, covering:

- The two countdown numbers are visible-only. A square's accessible name
  still says just "charged node" / "depleted node", so a listener cannot read
  how long a node has left, nor tell a trap from a two-ply exit node.
- Nothing is announced when a countdown **starts** (a ship stepping onto a
  charged node) or as it falls; the only spoken node events remain the
  end-of-turn ones plus the new `node-spent` clause (D7).
- Inactive nodes are no longer landable, so the set of squares a keyboard
  user can move to is smaller; the widened refusal message (D8) is what says
  why, and it names no state.

Where: `src/board/squareLabel.ts`, `src/board/NodeCountdown.tsx`,
`src/board/announcements.ts`.

### D13 — Which existing tests are rewritten, and where

Named here so no step has to rediscover the list.

- **Step 3** (movement): `movement.test.ts` (three
  `destination-depleted-node` sites plus new inactive-destination cover),
  `session.test.ts` ("applies a move ending on an inactive node" now expects
  a refusal; the renamed reason), `announcements.test.ts` (the refusal
  wording), `camping.test.ts` (its depleted-destination case),
  `nodePlacement.test.ts` (the fallback's new ship exclusion).
- **Step 4** (the model): `nodes.test.ts` (capacity, the four table blocks,
  the opening-drain assertions and the 12-step seed count all go; the deal's
  charged nodes are now dealt at 0), `endOfTurn.test.ts` (step 3 "drain"
  becomes step 3 "the charged countdown"; "lifetimes"; step 6 "retirement";
  the trap block), `camping.test.ts` (largely rewritten — the "a node charges
  under a parked ship" and "an inactive node grants and takes nothing" blocks
  describe situations that can no longer occur), `openingBoard.test.ts`
  (delete "a node dealt deep into its life runs out sooner than one dealt
  fresh" outright; the first-charge test survives with `NODE_CAPACITY`
  replaced by a countdown value), `ply.test.ts`, `trap.test.ts`,
  `fullGame.test.ts` (its policy comment mentions seeking inactive nodes,
  which are no longer landable), `seededReplay.test.ts` (D14),
  `nodePool.test.ts` (D14), `gameState.test.ts`, `session.test.ts`.
- **Step 5** (deletions): `charging.test.ts`'s eight direct-fourth sites,
  `relief.test.ts`'s tie-break tests, `endOfTurn.test.ts` and
  `announcements.test.ts`'s `node-appeared-charged` sites,
  `nodePool.test.ts`'s direct-fourth handling.
- **Step 6** (the board): `Board.test.tsx` ("the node cycle position reaching
  the marker"), `NodeMarker.test.tsx`, `BoardSquare.test.tsx`, plus new cover
  for `NodeCountdown`.

### D14 — Keeping the two long-run tests non-vacuous

Both of the repository's long-run tests are built on the assumption that
nodes expire by themselves. After this story they do not, and each needs a
**driver** or it silently stops testing anything:

- **`seededReplay.test.ts`** plays real games with an attack-first policy.
  Its policy gains a second preference: after attacks and before the
  fall-through move, **take a move onto a charged node if any eligible ship
  has one**. That is deterministic, draws no randomness, and produces both
  countdown starts (a ship stepping on) and departures (the fall-through move
  walking a holder off later). Its "the run is not vacuous" floors for
  charges, retirements and refills must then be **re-measured by running the
  test** and set with margin below what was measured, exactly as the existing
  comment does.
- **`nodePool.test.ts`** drives `runEndOfTurn` directly with no ship
  activity, to measure placement legality and spread over hundreds of plies.
  It gains a documented stand-in for a ship stepping on: **at the start of
  each ply, give a countdown to at most one charged node that has none**. At
  most **one** per ply matters — it mirrors "at most one countdown starts per
  turn" and is what keeps expiries staggered, so the shortfall never exceeds
  what the queue can cover. Say in the file's header comment that this stands
  in for a ship, and that it is why the file cannot assert D9's invariant 1
  (its synthetic countdowns have no ship); that invariant belongs to a
  ship-driven run instead.

## Steps

### Step 1 — Rules 0.26 → 0.27: the countdown replaces both clocks

Status: committed

Notes: Rewrote sections 1, 2, 3.2, 6, 8.1, 8.2, 8.3 (rebuilt from scratch),
8.5 (retitled to "Standing on a depleted node"), 8.6 and Appendix B per the
step's instructions; bumped `RULES_VERSION` to "0.27" and added one
changelog entry covering the whole story. One incidental fix beyond the
listed sections: §4.1 said a charged node "does not drain" a ship's power —
reworded to "does not reduce" so the banned word `drain` doesn't survive
in the document at all, even in this unrelated sense (the step's
verification greps for the bare word). Ran `npx prettier --write` on
`rules.md` afterwards to fix table column alignment; `format:check` and the
full suite (`npm test`, `npm run typecheck`, `npm run lint`) are all green,
and the grep checklist in the step's verification (`capacity`, `Drain`,
`drain`, `recovery table`, `already charged`, `at random, with every tied`,
`inactive node is allowed`) has no remaining matches.

Edit `doc/ruleset/rules.md` so that no sentence in it says a node carries a
capacity or a drain, that a node ages without a ship on it, that a depleted
node recovers at a drawn rate, that a ship may stand on an inactive node,
that a fourth node can appear already charged, or that the relief breaks a
tie at random. Bump the document's version line to **0.27**, bump
`RULES_VERSION` in `src/rules/rulesVersion.ts` to the same string, and add
**one** `doc/ruleset/changelog.md` entry at the top (newest first) covering
the whole story, in the style of the existing entries, marked as a gameplay
change with tagging on hold. This is its own commit, ahead of every code
change (S12). Do **not** tag.

Remember the vocabulary translation: `story.md` counts in **plies**;
`rules.md` counts in **turns**, which are the same thing, so the document says
a countdown is **11 turns**, spent one at the end of every turn whoever's it
was, landing on **six** of the holder's own turns.

The sections to edit, with what each must say afterwards:

- **§1, the overview.** Recount the random elements: there are now **three** —
  the opening board itself, where the three new nodes appear when the queue is
  refilled and which of them gets which priority, and which planet a beaten
  ship goes to. Delete "how fast a node burns" from the list, and delete the
  whole "plus two rarer ones" clause (the fourth charged node and the relief's
  tie-break). The paragraph about the map redrawing itself stays true, but it
  should now say the redrawing is driven by the players using nodes.
- **§2, the word list.** **Delete `Capacity` and `Drain` entirely.** Add
  **`Countdown`**: how many turns of life a node has left, spent one at the
  end of every turn, either player's; a charged node has one only while a ship
  stands on it. Keep `Trapped` as it is.
- **§3.2, where a node can appear.** Keep the six constraints, the pools, the
  weighting and the counts. Rewrite **the fallback** paragraph: it relaxes
  **spacing only** — it still never places a node on a planet, on another
  node, or **on a ship** (S7). Say plainly that between constraint 2 and this,
  a node can never appear beneath a ship. **Delete** the closing paragraph
  about the one node drawn uniformly from the widened pool (S10).
- **§6, movement.** The landing sentence widens: a move may not end on a node
  that is **not charged** — inactive or depleted, the two read identically —
  while flying **over** either is still free. Only a charged node is a square
  a ship may occupy.
- **§8.1, the three states.** The **charged** bullet gains the countdown: it
  has one only while a ship stands on it. The **depleted** bullet says the
  node counts down and retires. **The opening board**: four charged nodes are
  dealt **at baseline, with no countdown**, exactly like any node charged
  during play. **Delete the opening drain table**, its "each of the four
  starts part-drained" bullet, the "an average opening node has 46 of its
  capacity left" paragraph and the "nothing needs to spread their expiries
  out" paragraph — there are no expiries to spread until the players make
  some.
- **§8.2, charging a node.** **Delete** the "charging does not look at
  occupancy" paragraph (a node can no longer charge under a ship) and the "if
  the shortfall is four" paragraph (S10). **Delete** the depleted-recovery
  paragraph and its table; a depleted node's life is §8.3's business now.
  Everything about the queue, the rotation, the sweep and the refill procedure
  stays exactly as it is (S11).
- **§8.3, how long a node lives.** **Rewritten from scratch**, not edited. It
  must state, in this order: that a countdown is a number of turns and one is
  spent at the end of every turn; that a countdown starting in the middle of a
  turn spends its first turn at the end of that same turn, and one starting at
  a turn end spends its first at the end of the next whole turn; that a
  charged node has a countdown **if and only if** a ship stands on it, set to
  **11 turns** the moment a ship moves onto it, which is six of that player's
  own turns; that because a turn is one action, **at most one countdown starts
  per turn**; that the node shows a **black number** counting the holder's own
  turns, 6 down to 1, never 0; that a ship **leaving** a charged node depletes
  it **immediately** (with both consequences the story names — you cannot hand
  a node back, and the opponent cannot inherit it — and that the shortfall is
  filled at the end of the turn like any other); and that a depleted node
  comes in two lengths: **11 turns with a white number** when it traps a ship,
  **2 turns with no number** when its holder walked off, both simply retiring
  when the countdown runs out. Reproduce the story's two tables (the charged
  hold and the trap) as the document's own worked examples.
- **§8.5.** **Retitle** to name the depleted node alone — e.g. "Standing on a
  depleted node" — and **delete** everything about standing on an inactive
  node: that it is allowed, that a ship may camp there for the rest of the
  game, that such a ship is an ordinary target, and that a refill may sweep
  the node out from under it. What remains is the trap, the release on
  retirement, and the trade of one protection for another.
- **§8.6, end-of-turn order.** Step 3 becomes: every charged node **carrying a
  countdown** spends one turn of it; any that runs out goes depleted and traps
  the ship standing on it. Step 4 loses its "if the shortfall is four" clause.
  Step 6 becomes: every depleted node **that was already depleted when this
  sequence began** — which includes one depleted this turn by its holder
  walking off, and excludes one that only went depleted in step 3 above —
  spends one turn of its countdown, and retires at zero. Step 7 loses its
  tie-break sentence. Rewrite the "two clocks are symmetric" paragraph around
  the countdown. Reword the closing invariant to carry the exception: a node's
  state changes only in this sequence, **except** that a charged node depletes
  the instant its holder leaves it. Keep step 2 (energy) before step 3
  (depletion) and say why: it is what gives a holder its sixth collection.
- **Appendix B.** Rewrite the lifetime and turnover passages: a charged node
  lasts **11 turns** once someone steps on it and **forever** if nobody does;
  a depleted node lasts 11 turns as a trap or 2 as an exit; turnover happens
  only because players use nodes. Rewrite "the board is never short of four
  charged" around the queue **alone**: at most one countdown starts per turn,
  so at most one node expires per turn; add the at most one node a player can
  walk off in the same turn, and the shortfall is **never more than two** —
  inside the three the queue always holds. Delete the "a charge about every
  eight turns" cadence claim and the sentences that rest on the drain model.
  The measured pool-size and spread figures may stand for now; Step 7
  remeasures them and folds any correction into this same 0.27 version (S12).

Depends on: nothing. It comes first because every later step implements this
document.

Verification (automated): `npm test` — `rulesVersion.test.ts` checks the
document's version, `RULES_VERSION` and the changelog entry agree. Then
`npm run format:check`. Then grep `doc/ruleset/rules.md` and confirm **no**
match survives for: `capacity`, `Drain`, `drain`, `recovery table`,
`already charged`, `at random, with every tied`, and `inactive node is
allowed`. The rest of the suite is untouched by this step — no source code
changes here — so it must stay green as it stands.

### Step 2 — `src/rules/countdown.ts`: the constants and the arithmetic

Status: pending

Add the new leaf module described in D2, with unit tests, wired to nothing
yet. It holds the three constants, the spend-one-ply operation, the number a
node shows (D4) and the artwork cycle position (D5). It takes a node's state,
its plies remaining and — for the two display functions — whether a ship is
standing on the square (D3), and it imports nothing but the `NodeState` type.

Leave `nodeCyclePosition` in `nodes.ts` in place and untouched for now: this
step only adds. Step 4 deletes the old one and repoints its callers.

Depends on: Step 1 (the rules this implements).

Verification (automated): `npm test`. The new `countdown.test.ts` must pin,
row for row, both rows of D4's table — all eleven ply values for the charged
node and all eleven for the trap — plus: a charged node at 0 plies shows no
number; an exit node shows no number whatever its plies; the cycle position
is 0 for a charged node with no countdown, 0 at 11 plies, 1 at 1 ply, and
rises by exactly one tenth per ply; a depleted node with a ship travels the
same way; a depleted node with no ship is 0 at both of its plies; and every
position returned is inside [0, 1].

### Step 3 — No ship on an uncharged node, and no node under a ship

Status: pending

Two independent restrictions, neither of which needs the countdown:

1. In `src/rules/movement.ts`, rename `MoveRefusalReason`'s
   `destination-depleted-node` to `destination-uncharged-node` and refuse a
   destination whose node state is `depleted` **or** `inactive` (D8, S6).
   Flying over either stays free — the path check is unchanged. Update the
   refusal message in `src/board/announcements.ts` to wording that covers both
   states without naming either (D8).
2. In `src/rules/nodePlacement.ts`, narrow `legalNodePool`'s **fallback** so
   it excludes squares holding a ship, as well as squares holding a node and
   planets (S7). The `RangeError` when even the fallback is empty stays, with
   its message updated to name the new condition.

Update the tests D13 lists for this step. `session.test.ts`'s "applies a move
ending on an inactive node" becomes a refusal case; the fixture that made room
for it (five charged nodes) can be simplified or left as it is.

Depends on: Step 1 (§6 and §3.2 as written there). Independent of Step 2.

Verification (automated): `npm test`. New or updated tests must show: a move
onto an inactive node is refused as `destination-uncharged-node`, and the ship
does not move; a move onto a depleted node is refused the same way; a move
that **passes over** an inactive node and lands on an empty ordinary square is
still legal; `legalDestinations` excludes both kinds of uncharged node; the
refusal message reads correctly for both; and `legalNodePool`'s fallback,
driven directly with a board contrived so the strict pool is empty, never
returns a square a ship stands on.

### Step 4 — The countdown replaces drain and recovery, end to end

Status: pending

The story's central change, and the largest step in this plan. It is one step
because the model change is atomic: the moment the drain tables stop running
the economy, nothing else can drive it, so the countdown's every part has to
land together for the suite to be meaningful. Work through it in this order.

**The state model.** Rewrite `NodeStatus`'s doc comment in
`src/rules/gameState.ts` to D1's table. No field changes.

**`src/rules/nodes.ts`.** Delete `NODE_CAPACITY`, `OPENING_DRAIN_TABLE`,
`EMPTY_NODE_DRAIN_TABLE`, `HELD_NODE_DRAIN_TABLE`, `DEPLETED_RECOVERY_TABLE`,
`WeightedAmount`, `drawTableAmount` and `nodeCyclePosition` (the last moved to
`countdown.ts` in Step 2 — repoint `Board.tsx` and its tests). `dealOpeningBoard`
deals its four charged nodes at **level 0** and no longer draws for them, so
the deal is **8** seed steps, not 12 (D10); rewrite its doc comment's draw
order accordingly. `TARGET_CHARGED_NODES` and `NodeState` stay.

**`src/rules/endOfTurn.ts`.**

- Step 3 becomes: every charged node whose level is above 0 spends one ply. A
  node reaching 0 goes **depleted** with `TRAP_COUNTDOWN_PLIES`, emitting
  `node-ran-out` and then `ship-trapped` for the ship standing on it, exactly
  as now. Nothing draws from the seed.
- Step 6 becomes: every node in the entry-time `depletedBeforePly` snapshot
  spends one ply of its countdown and retires at 0. **The snapshot's
  justification changes and its comment must be rewritten**: it is no longer
  true that "no action changes a node's state", and the snapshot is now
  load-bearing in a new way — it is taken after the ply's action resolved, so
  an exit node created by that action **is** in it and spends its first ply at
  the end of that same turn (which is exactly what S5 requires), while a trap
  created in step 3 below is **not** in it and first spends a ply at the end of
  the next turn (which is what S4 requires).
- The module header comment describes drain, recovery and the seed
  consumption of step 7; rewrite it around the countdown.

**`src/rules/ply.ts`.** `applyMove` starts and ends countdowns per D6, and
emits the `node-spent` effect per D7. Rewrite the two doc comments D6 names.

**`src/board/announcements.ts`.** Speak `node-spent` in the `moved` sentence
per D7.

**Tests.** Update everything D13 lists for this step, and give the two
long-run tests their drivers per D14 — including re-measuring
`seededReplay.test.ts`'s floors by running it. New integration cover to add,
driven through the public API (`applyMove`, `runEndOfTurn`) rather than by
poking state:

- A ship walks onto a charged node and holds it to the end: the number/level
  sequence matches D4's charged row, energy is collected **six** times, and
  the ship is trapped at the sixth collection's own turn end.
- A ship walks onto a charged node and walks off two turns later: the node it
  left is depleted **immediately** (before the end of the turn), a
  `node-spent` effect is emitted, that turn's energy from it is forfeited, a
  new node charges at the end of that turn, and the exit node retires at the
  end of the opponent's next turn — two plies, no more.
- A trap runs its eleven plies: the trapped player gets exactly **five**
  trapped turns, and the ship is freed at the end of the **opponent's** turn.
- A charged node nobody steps on never changes at all across many plies.
- A move from one charged node to another in the same action: the origin
  becomes an exit node and the destination starts an 11-ply countdown.

Depends on: Step 2 (the constants and arithmetic), Step 3 (a ship can no
longer be standing on an inactive node, which several of the rewritten
camping tests rely on).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`. The
new integration cover above is the proof; the suite as a whole is the
regression net. Also grep `src/` and confirm no surviving reference to
`NODE_CAPACITY`, `DRAIN_TABLE`, `DEPLETED_RECOVERY_TABLE` or `drawTableAmount`.

### Step 5 — Delete the two rules that die with camping

Status: pending

Both deletions are safe only because Steps 3 and 4 landed (D9, and the
story's argument in "Two rules that die with camping").

- **The fourth node placed directly.** In `src/rules/charging.ts`, delete the
  `NodeAppearedChargedEffect` type and the whole direct-placement branch;
  charging fills the shortfall from the queue and stops. Remove the effect
  from `EndOfTurnEffect` in `endOfTurn.ts`, from `endOfTurnClauses` in
  `announcements.ts`, and from the tests D13 lists. Delete
  `drawUniformSquare` from `nodePlacement.ts` if nothing else uses it (D10 —
  check `nodePool.test.ts` first).
- **The relief's random tie-break.** In `src/rules/relief.ts`, take the
  lowest-level candidate and, on a tie, the first in board order; delete the
  `drawIndex` import and the random draw. Update `endOfTurn.ts`'s step 7 so it
  no longer threads a seed through the relief, and rewrite both modules'
  comments about step 7 being a seed consumer — after this step **nothing**
  in the end-of-turn sequence draws from the stream except step 5's refill.

Depends on: Step 4 (the countdown is what makes both cases unreachable).

Verification (automated): `npm test`. Updated tests must show: a shortfall of
two is filled from the queue and leaves the board at four charged; the relief
still ends the node with the least remaining life and frees its ship, with no
seed movement at all; and `state.randomSeed` is **unchanged** across an
end-of-turn sequence in which nothing charges — the sharpest single check
that the stream has stopped moving outside refills and fights.

### Step 6 — The board draws the countdown: the number and the ball

Status: pending

Add `src/board/NodeCountdown.tsx` and `NodeCountdown.css` per D11, thread the
number through `BoardSquare` and `Board`, and repoint the cycle position at
`countdown.ts` (D5).

- `Board.tsx` computes, per square: the cycle position from the node's status
  and whether a ship stands there, and the countdown number (or nothing) the
  same way. Its occupant lookup already exists; reorder the local computations
  if needed so the ship is known before the node's display values.
- `BoardSquare.tsx` renders the countdown **after** `ShipModel` and before the
  interaction markings.
- `NodeMarker.tsx` is otherwise **unchanged** — same radii, same gradient
  stops, same colours; only the value driving the middle stop changes, and it
  changes at the caller.

Add the accessibility note to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` per D12, under a
new "From story 60" heading, in the style of the existing entries.

Depends on: Step 4 (the levels the board reads mean plies remaining), Step 2
(the display functions).

Verification (automated): `npm test`. Component tests must show: a charged
node with a countdown draws the number D4's table gives, in black; a charged
node without one draws no number and the minimum ball; a depleted node with a
ship draws its number in white and travels the depleted cycle; a depleted node
with no ship draws no number and sits at the start of the cycle; the number is
rendered **after** the ship in the square's DOM order; and the countdown
element is `aria-hidden` with no accessible text, like the other artwork.

### Step 7 — The long-run economy and Appendix B's figures

Status: pending

With the model in and the deletions done, measure it and pin the invariants
the deletions rest on.

- Finish `nodePool.test.ts`'s rebuild around D14's driver: keep the placement
  legality and spread measurements (they are about §3.2, which is unchanged),
  and either delete the "how often the queue is swept" cadence test or restate
  it against the driver's own known cadence — a cadence figure is no longer a
  property of the game, only of how hard the driver pushes it.
- Add D9's invariant assertions. Invariants 2 and 3 (at most one expiry per
  ply; at most two charges per ply and back to four charged by the end of
  every ply) belong wherever the driver runs longest. Invariant 1 (a charged
  node with a countdown always has a ship on it) belongs in a **ship-driven**
  run — `seededReplay.test.ts` or `fullGame.test.ts` — because
  `nodePool.test.ts`'s synthetic countdowns have no ships.
- Re-measure Appendix B's figures against the new economy and correct
  `doc/ruleset/rules.md` in place where they are wrong: the node counts the
  board runs at, the pool sizes a refill draws from, and the spread figures.
  Any such correction folds into the **same 0.27 version and changelog entry**
  (S12) — do not bump again and do not add a second entry.

Depends on: Steps 4 and 5 (the economy and the deletions must both be final
before anything is measured).

Verification (automated): `npm test`. The long-run tests must still exercise
many refills — a floor on the refill count, as the file already does, is what
proves the driver works — and every invariant above must hold across every
seed the file runs.

### Step 8 — The owner plays a game and reads the numbers

Status: pending

The one manual gate. Everything is implemented; this is the owner's eye on
what a test cannot judge: whether the two numbers are readable and whether a
board that only turns over when the players use it plays well.

Run `npm run dev` in the dev container and open the app. Play a game — five a
side and thirty rounds reaches the interesting moments quickly — and look at:

1. **The black number.** Step a ship onto a charged node. Does it open at 6?
   Is it legible over the ship at a normal window size, in both portrait and
   landscape? Does it fall by one at the end of each of your own turns and
   stay put through your opponent's?
2. **The ball.** Does it visibly grow at every turn end — including the
   opponent's — and reach its biggest with one turn left? Is the growth
   readable at all, or too small to see between steps?
3. **Holding to the end.** Hold a node all six turns. Do you collect on the
   sixth turn and get trapped in the same instant? Does the number switch to a
   white 5 as it does?
4. **The white number and the release.** Does the trapped ship free up just
   before your turn, ready to move immediately, after five turns stuck?
5. **Leaving.** Step off a held node. Does it go grey **at once**, mid-turn?
   Does a new node charge at the end of that turn, sweeping the queue? Is the
   two-turn grey node's brief life confusing, or does it read as the node
   ending where it stood?
6. **Uncharged nodes as terrain.** Try to move onto an inactive node: the
   square should offer no destination marking, and clicking it should say
   something sensible. Does the board feel too boxed-in with three inactive
   and however many depleted squares closed off?
7. **A quiet board.** Play a few turns without touching any node. Does the
   board correctly do nothing at all — no charge, no refill, no expiry?
8. **The whole feel.** Nodes now turn over only because players use them, and
   every node is worth the same six turns. Is that better? This is the story's
   central bet and the owner's call.

Depends on: Step 7 (everything is in and the suite is green).

Verification (manual): the owner confirms points 1–8, or names what to change.
A change requested here is a small follow-up edit — most likely to D11's font
size or colours in `NodeCountdown.tsx`, or to D7's or D8's wording in
`announcements.ts` — re-verified by `npm test` and by the owner's second look.
If the owner asks for a **rules** change here, it folds into the same 0.27
entry (S12).

### Step 9 — `README.md`, the comment sweep, and the final check

Status: pending

`README.md` describes the old model in detail and is wrong in several places
after this story — the "standing on one burns it down faster than leaving it
alone, but walking away costs it nothing" paragraph, the "a node someone
abandons stays lit" claim, the opening deal's part-drained nodes, the "glow
shifts as it burns down so you can see roughly how much life it has left"
description, the ten-turn recovery, the camping sentence about a ship parking
on a waiting node, and the "a node appears somewhere else already lit" line.
Rewrite them in the README's own voice ("lit", "waiting", "rings") around the
countdown, the number, leaving ending a node, and the two lengths of grey
node. Run `/update-readme` if it is available in the session; otherwise do the
same review by hand against the branch diff.

Then sweep the comments that this story falsified but no step had to touch,
and fix any that survive. Known candidates: `src/rules/trap.ts`'s header (a
ship comes to be on a depleted node only by one route — still true, but the
route's wording mentions §6 barring landing on a depleted node),
`src/rules/nodePlacement.ts`'s fallback comment, `src/rules/random.ts`'s
header if it enumerates the game's draws, `src/rules/seededReplay.test.ts`'s
header (its 0.12/0.18/0.20/0.26 narrative about what dominates the stream is
now wrong), `src/rules/nodePool.test.ts`'s header, and any comment naming
"drain", "capacity", "recovery" or "pressure".

Finish with the full check.

Depends on: Step 8 (no point documenting a game the owner may still ask to
change).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm run build` — all green. Then grep the whole
repository outside `doc/plan/` and `doc/ruleset/changelog.md` for `drain`,
`capacity`, `recovery` and `camp`, and confirm every surviving match is
either about a ship recovering power on a planet (§4.1, which is unrelated
and unchanged) or deliberately historical.
