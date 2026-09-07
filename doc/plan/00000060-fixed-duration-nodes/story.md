# Story 00000060 — A node's countdown starts when you step on it

## Summary

Today a charged node burns down on its own. It carries a capacity of 60 and a
drain that rises every turn by a randomly drawn amount — slowly while nobody
is on it, more than twice as fast while somebody is — and it goes depleted
when the drain reaches capacity. A depleted node then recovers at another
drawn rate over about ten turns. How long any node has left is a hidden
number, guessable only from how far its glow has travelled, and nodes expire
whether the players use them or not.

This story replaces both clocks with a **fixed countdown that only runs while
a ship is standing on the node**, and puts the number on the board.

- **A charged node has no countdown until a ship enters it.** On charging it
  sits at a baseline — the minimum ball, no number — and it will sit there
  for the rest of the game if nobody comes. Nothing about it is random any
  more, because there is nothing left to draw.
- **From the moment a ship steps on, the node lasts 11 plies** — six of that
  player's turns. Then it depletes, trapping the ship if it is still there.
- **A black number in the middle counts the holder's own turns**: 6 on entry,
  down to 1, and the ball grows towards its maximum as the number falls.
- **Leaving a charged node depletes it at once.** The node does not revert to
  a slower burn and wait for someone else; it ends, and a fresh node charges
  in its place at the end of the turn.
- **A depleted node that traps a ship lasts 11 plies too**, with a white
  number that works the same way, and the trapped ship is freed at the end of
  the opponent's turn — so it is ready to move on its owner's very next one.
- **A depleted node left behind by a ship walking off lasts 2 plies**, with no
  number. It blocks landing for the rest of that turn and the whole of the
  opponent's turn, and then it is gone.
- **A ship can no longer stand on an inactive node.** A move may not end on
  one, exactly as it may not end on a depleted node, and no node ever appears
  under a ship. Only a **charged** node is somewhere a ship can be.

Capacity, both drain tables, the opening drain table and the recovery table
all go. **How fast a node burns stops being one of the game's random
elements**, and node turnover stops being something that happens to the
players and becomes something they cause.

## No ship on an uncharged node

**A move may not end on an inactive node.** Flying over one is still free, in
the same sentence of §6 that already bars landing on a depleted node — the
two uncharged states now read identically, and only a charged node is a
square a ship may occupy.

**And no node ever appears under a ship.** §3.2's constraint 2 already says a
new node's square must hold no ship, so this is nearly true today; the one
hole is §3.2's fallback, which relaxes *every* constraint at once and would
happily drop a node onto an occupied square. The fallback is narrowed to
relax spacing only: it still never places a node on a planet, on another
node, or **on a ship**. It has never been observed to fire, and it stays a
guarantee that placement cannot fail rather than something a player expects
to see; narrowing it costs nothing, because the squares it draws from
outnumber the ships on the board many times over.

Between the two, **a node can never charge beneath a ship**. That was going
to be a follow-up story; it is folded in here because leaving it out would
mean building a whole second way for a countdown to start — one that starts
at a turn end instead of in the middle of one, lands its eleven plies on five
of the holder's turns instead of six, and opens its number at 5 or 6
depending on whose ship is camped there — and then deleting it a story later.
Every line of that is throw-away, and two of this story's simplifications
(below) depend on it not existing.

What this removes from the rules:

- §8.2's "charging does not look at occupancy" paragraph, and the ship that
  was holding a node from the moment it lit up.
- §8.5's whole treatment of standing on an inactive node: that it is allowed
  and ordinary, that a ship may camp there for the rest of the game, that
  such a ship is an ordinary target, and that a refill may sweep the node out
  from under it. The section is left describing the depleted node alone, and
  is retitled to say so.
- The one reason a player had to sit still: parking on the inactive node with
  three rings and waiting for it to light up underneath them.

The rings are no less worth reading for it. A player who can see which node
charges next, and the turn after that, now positions **beside** it and steps
on the turn after it lights — which is a plan about timing rather than a
plan about squatting.

## The countdown

**A charged node has a countdown if and only if a ship is standing on it.**
That single sentence is the whole rule; everything below follows from it.

A countdown is a number of **plies**, and one ply is spent at the end of every
turn. A countdown that starts in the middle of a turn spends its first ply at
the end of that same turn; a countdown that starts at a turn end spends its
first ply at the end of the next whole turn. When the last ply is spent, the
node changes state.

A charged node's countdown is set to **11 plies**, and it starts exactly one
way: **a ship moves onto the node**. That always happens in the middle of the
moving player's turn, so that turn's end is the first of the eleven plies,
and the eleven land on six of that player's turn ends — the turn they walked
on and the five after it. There is no second way in, which is what makes "11
plies" and "six of your turns" the same statement rather than two that have
to be reconciled.

Because a move is one action and a turn is one action, **at most one
countdown starts per turn** — a fact two later sections lean on.

## The number

A charged node carrying a countdown shows a **black number in the middle**:
how many of the **holder's own turns** the node still has left in it. It
never reads 0 — the node ends first — and in the one case where the holder's
last turn passes before the node's last ply does, the 1 simply stays up.

Green walks a ship onto a charged node:

| When                     | Number | What happened                              |
| ------------------------ | ------ | ------------------------------------------ |
| green's turn, on arrival | **6**  | countdown set to 11 plies                  |
| end of green's turn      | **5**  | green collects; first ply spent            |
| end of red's turn        | 5      | second ply spent                           |
| end of green's turn      | **4**  | green collects; third ply spent            |
| …                        |        |                                            |
| end of green's turn      | **1**  | ninth ply spent                            |
| end of red's turn        | 1      | tenth ply spent                            |
| end of green's turn      | —      | green collects a sixth time, then the node depletes and the ship is trapped |

The number falls only at the end of the holder's own turns, so each value
except the first is up for a full round, and a player looking at the board
during their turn is reading the number that governs the end of it. Green
collects energy six times from a node held to the very end — the sixth
collection is the last thing that happens before the trap closes, because
energy is collected in step 2 of the end-of-turn order and depletion happens
in step 3.

Both players read the same number the same way: it always counts the turns of
whoever is standing there, so to the player who is not holding it, it says
how many of the opponent's turns that node has left.

## The ball

The charged artwork already travels as a node ages — the middle gradient stop
moves outward, so the ball appears to grow — and it keeps doing exactly that,
driven by the countdown instead of by drain.

- **No countdown: the minimum.** A charged node nobody has stepped on is
  drawn at the start of its cycle and stays there indefinitely.
- **It grows one step per ply**, at every turn end, so it creeps up during the
  opponent's turn as well as the holder's and the number lags behind it.
- **Maximum at one ply left.** The last ply is the biggest the ball ever gets.

Eleven steps rather than six is deliberate: the number already carries the
precise answer, so the ball is free to move more often and give the board a
sense of something running down between turns.

## Leaving ends the node

**A ship that leaves a charged node depletes it immediately** — as the move
resolves, not at the end of the turn. The square becomes a depleted node on
the spot, so nothing may land there for the rest of that turn (§6), and the
node that was there is over: it does not go back to sitting at baseline
waiting for the next visitor.

Two consequences are the point of the rule:

- **You cannot hand a node back.** Stepping off is spending it, so a holder's
  choice is between staying and being trapped, and leaving and losing the
  node entirely. There is no third option where you step away, let it cool,
  and come back.
- **The opponent cannot inherit it.** A node you leave is not there to be
  taken.

Leaving also forfeits that turn's energy from it, since energy counts the
nodes a player is standing on when their turn ends.

The shortfall this creates is filled at the **end of the turn**, by the same
step 4 that fills a shortfall from an expiry, out of the three inactive nodes
in priority order. Nothing charges in the middle of a turn.

This is a knowing exception to §8.6's closing invariant that a node's state
changes only in the end-of-turn sequence, never while an action is resolving
— an invariant story 59 went out of its way to preserve when it banned moves
that end on a depleted node. It has to give here, because "leaving ends it"
and "the node's state changes only at the end of the turn" cannot both be
true. The invariant is reworded rather than dropped: a node's state changes
only in the end-of-turn sequence, **except** that a charged node depletes the
instant its holder leaves it.

## Two kinds of depleted node

Depleted nodes now arrive by two different roads and last for different
lengths of time. Both block landing, and both simply retire and leave the
board when their countdown runs out.

### The trap — 11 plies, a white number

A node that runs out under the ship holding it depletes with that ship still
on it, trapped exactly as it is today (§8.5). Its countdown is set to **11
plies**, starting at a turn end, and it shows a **white number** read the
same way as the black one: how many of the trapped player's own turns the
node still has left.

Because this countdown starts at a turn end rather than in the middle of one,
its eleven plies cover **five** of the trapped player's turns rather than six,
and the node retires at the end of the **opponent's** turn:

| When                    | Number | What happened                              |
| ----------------------- | ------ | ------------------------------------------ |
| end of green's turn     | **5**  | the node depletes, green's ship is trapped |
| end of red's turn       | 5      | first ply spent                            |
| end of green's turn     | **4**  | second ply spent — one trapped turn gone   |
| …                       |        |                                            |
| end of green's turn     | **1**  | eighth ply spent                           |
| end of red's turn       | 1      | ninth ply spent                            |
| end of green's turn     | 1      | tenth ply spent — green's last trapped turn |
| end of red's turn       | —      | eleventh ply spent: the node retires and the ship is free |

So the white number counts the turns green will spend stuck, and green's ship
is released just before green's turn, ready to move immediately rather than
sitting free but idle through the opponent's turn. A node held to the end and
then sat out therefore costs its player eleven of their own turns on that
square: six charged and paying, five trapped and paying nothing.

The **relief** rule (§8.6 step 7) is unchanged and still applies: a player
whose every ship is trapped has one of them freed early.

### The exit — 2 plies, no number

A node depleted by its holder walking away has no ship on it and nothing to
trap. Its countdown is **2 plies**, starting in the middle of the leaving
player's turn: it spends its first ply at the end of that turn and its second
at the end of the opponent's, and then retires. It carries **no number** and
is drawn at the start of the depleted artwork's cycle for both plies — there
is not enough life there to be worth measuring, and a two-step travel would
not be readable anyway.

Not spawning one at all was considered. Two plies of a grey circle is nearly
nothing: it blocks two turns' worth of landings on one square and then
vanishes. It is kept because the node should be seen to end where it was
rather than blinking out of existence the moment a ship steps off, and
because it lines up with the trap — every charged node in the game is
followed by a depleted one, and only the length differs.

## Two rules that die with camping

Story 63 added two rules that exist for cases this story makes unreachable,
and both are **deleted**:

- **The fourth node placed directly, already charged** — §8.2's
  "if the shortfall is four" paragraph, the second half of §8.6 step 4, and
  §3.2's closing paragraph about the one node drawn uniformly from the
  widened pool.
- **The random tie-break in the relief step** — §8.6 step 7's choice among
  depleted nodes tied on least remaining life.

Both fall to the same argument, and the argument only works because a ship
can no longer be on an inactive node. **At most one countdown starts per
turn**, because the only way to start one is to move onto a charged node and
a turn is one action. Countdowns are all the same length, so countdowns that
start on different plies expire on different plies: **at most one node
expires per turn.** Add the at most one node a player can walk off in the
same turn and the shortfall against four charged is **never more than two** —
comfortably inside the three inactive nodes the queue always holds. And since
every trap starts at the expiry that caused it, no two of a player's ships
are ever trapped on the same turn, so their nodes' remaining lives are always
distinct and nothing can tie.

Had camping survived, neither deletion would be safe: up to three inactive
nodes can charge at one turn end, so three countdowns could start together
under three camped ships and expire together, and a shortfall of four would
be reachable — rare beyond reasonable expectation, but reachable, and the
same route would produce tied traps. Removing camping is what turns "very
unlikely" into "cannot happen", which is the difference between keeping a
rule and deleting it.

§1's two **rarer random elements** go with them, leaving three: the opening
board, where refilled nodes appear and which priority each gets, and which
planet a beaten ship goes to. Appendix B's "the board is never short of four
charged" argument is rewritten around the queue alone.

## What else goes away

- **Capacity**, and the number 60 with it.
- **Both drain tables** — empty and held — and the whole idea of a node
  ageing faster because somebody is on it. A node now ages *only* because
  somebody is on it.
- **The opening drain table.** The four charged nodes of the opening board
  are dealt at baseline, with no countdown, exactly like any node charged
  during play. Nothing needs to spread their expiries out, because they have
  none until the players make some.
- **The recovery table**, and the drawn ten-turn recovery it produced.
- **"How fast a node burns"** from §1's list of the game's random elements.
- **Capacity and Drain** as entries in §2's vocabulary.

`NODE_CAPACITY`, `OPENING_DRAIN_TABLE`, `EMPTY_NODE_DRAIN_TABLE`,
`HELD_NODE_DRAIN_TABLE` and `DEPLETED_RECOVERY_TABLE` all go with them;
`nodeCyclePosition` is rewritten against remaining plies; and movement's
`destination-depleted-node` refusal widens to cover both uncharged states.
`camping.test.ts` is largely rewritten — half of what it covers is now
illegal.

## What does not change

The queue is untouched: three inactive nodes carrying priorities 1, 2 and 3,
charging top-down, rotating on a turn that charges nothing, and swept and
refilled on a turn that charges something, by the same weighted placement
from the same widening pool. Combat, movement costs, energy, power, planets,
the trap and the relief all keep their current rules.

## What this does to the game

- **Nodes only turn over because players use them.** A board both players
  ignore never changes. The charge that follows every depletion, and the
  refill that follows every charge, are all downstream of somebody stepping
  on something — so the map redraws at the pace the players set.
- **The hidden number becomes a visible one.** Holding a node to the end has
  been a guess read off a glow; it is now an arithmetic problem with the
  answer printed on the square. The trap stops being a punishment for not
  reading the artwork closely enough and becomes a decision: six turns of
  income, or five turns of income and a ship that walks away free.
- **Leaving is a real move.** It ends the node, denies it to the opponent,
  forfeits that turn's energy, and starts a new node charging somewhere else
  — which sweeps the queue and redraws the three inactive nodes. A player
  can now use their own departure to reshuffle the board.
- **Every node is worth the same.** There are no lucky long nodes and no
  nodes that burn out under you after four turns; six turns is six turns, so
  the race is about position and timing rather than about which node the draw
  was kind to.
- **Uncharged nodes are terrain.** Three inactive and however many depleted
  are now squares a ship can fly over but not stop on. Ships have a little
  less room to land, being boxed in is a little easier, and the board reads
  as a map with obstacles on it rather than a grid with lights on it.

## Notes

- This is a gameplay change: `doc/ruleset/rules.md` needs a version bump to
  **0.27**, a changelog entry, and edits to sections 1, 2, 3.2, 6, 8.1, 8.2,
  8.3, 8.5 and 8.6, plus Appendix B, whose lifetime and turnover figures — a
  node lasting roughly thirty turns charged and ten depleted, a charge about
  every eight turns — all rest on the drain model and need remeasuring
  against the new one.
- One version bump for the whole branch: the camping change and the countdown
  change are one ruleset version and one changelog entry, not two.
- §8.3 "How long a node lives" is rewritten around the countdown rather than
  edited, and §8.5 is retitled and reduced to the depleted node.
- §8.6's step order needs care: energy (step 2) before depletion (step 3) is
  what gives a holder its sixth collection, and the closing invariant needs
  the wording change described under "Leaving ends the node".
- The word **countdown** is used rather than "clock" on purpose: §10 already
  owns "clock" for the optional per-player chess clock, and a rules document
  holding both cannot have the word mean two things.
- The two numbers are new content on the board, and banning a landing square
  changes what keyboard navigation can reach. The pre-release accessibility
  stance applies: anything lost is recorded in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather than
  fixed here.
