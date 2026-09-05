# Base Control — Rules

**Rules version: 0.21**

This document is the single source of truth for how Base Control is played.
The app implements what is written here; where the two disagree, this document
is right and the app has a bug.

---

## 1. Overview

Base Control is a two-player game played on a square board. Each player
commands a fleet of five, six or seven ships and competes to occupy the
board's contested nodes, collecting **energy** for every turn they hold one.
The player with the most energy when the game ends is the winner.

Ships are never destroyed. A fight has no winner — both ships involved are
pushed back to a bay on the edge of the board, carrying exactly what they
carried before the fight, and rejoin the game from there.

A ship carries **power**, which is what lets it move. Holding a node drains
it, so the longer a ship holds one, the harder it becomes to move and to
leave. A ship holding a node cannot be attacked while it holds it. A node
that has burned out still costs its owner energy every turn — but it now
gives power back, so it is where a ship pays energy for the recovery a bay
gives free of charge.

The board is not a fixed map with lights moving across it: nodes are born,
burn out and are replaced somewhere else, so the map itself redraws as the
game runs, and the squares worth racing for change over the course of a
game, not just which of them are lit.

The game has five random elements: the opening board itself, which node is
charged next, where a new node appears when one ends, which bays the two
ships in a fight are pushed back to, and how fast a node burns. No two games
start on the same board, and neither player has seen this one before.

---

## 2. Words used in these rules

**Turn** — everything one player does before play passes to their opponent. A
turn is one action.

**Round** — one turn for each player. The game lasts for the number of
rounds chosen before play begins — 30, 45, 60 or 90 — and 30 is the
standard game (section 9).

**Action** — what a player does on their turn: move a ship, or attack with a
ship.

**Power** — what a ship carries and what lets it move: how far it can go, and
what a node takes from it while it stands there.

**Node** — a position on the board that comes into being, runs through three
states — **inactive**, **charged** and **depleted** — and then ends. The
instant a node ends, a new inactive node appears somewhere else on the board
(section 3.2). The board aims to keep four nodes charged at any moment,
though it may fall short.

**Capacity** — how much a node has to give before it is spent. Every node
starts with the same 60.

**Drain** — how much of a node's capacity has been spent. It rises every
turn, faster while a ship is standing on the node.

**Pressure** — how long a node has been waiting to be charged. The longer it
waits, the likelier the board is to pick it.

---

## 3. The board

The board is 15 x 15 squares. Columns are lettered **A** to **O** from left to
right; rows are numbered **1** to **15** from bottom to top. A square is named
by its column and row, so **H8** is the centre of the board and **A1** is the
bottom-left corner.

### 3.1 Bays

Fourteen squares on the outer edge of the board are **bays**. They sit every
fourth square around the edge, and none of them is a corner:

| Edge   | Bays             |
| ------ | ---------------- |
| Top    | D15, H15, L15    |
| Right  | O14, O10, O6, O2 |
| Bottom | D1, H1, L1       |
| Left   | A2, A6, A10, A14 |

A bay is an ordinary square in every way except two:

- A ship standing in a bay cannot attack and cannot be attacked.
- A ship standing in a bay **at the end of its owner's turn** gains one power,
  to the maximum of 4 (section 4.1). Flying over an empty bay does nothing —
  only standing in one at the end of the turn counts — and arriving in one
  does nothing by itself either; the first point comes at the end of that
  turn like any other. A bay is where a ship goes to recover, at a point per
  turn.

Bays are not owned. Either player's ships may use any bay.

Together with the bay table above, this diagram shows the board's fixed
squares. It does not show any node, because a node's square is not fixed —
where nodes stand changes as the game runs (section 3.2):

```
     A B C D E F G H I J K L M N O
 15  . . . # . . . # . . . # . . .
 14  # . . . . . . . . . . . . . #
 13  . . . . . . . . . . . . . . .
 12  . . . . . . . . . . . . . . .
 11  . . . . . . . . . . . . . . .
 10  # . . . . . . . . . . . . . #
  9  . . . . . . . . . . . . . . .
  8  . . . . . . . . . . . . . . .
  7  . . . . . . . . . . . . . . .
  6  # . . . . . . . . . . . . . #
  5  . . . . . . . . . . . . . . .
  4  . . . . . . . . . . . . . . .
  3  . . . . . . . . . . . . . . .
  2  # . . . . . . . . . . . . . #
  1  . . . # . . . # . . . # . . .

#  bay
```

### 3.2 Where a node can appear

There are no fixed positions on the board any more. A node's square is drawn
when the node appears, and it stays there for exactly as long as that node
lasts — when the node ends, a new one is drawn a square of its own,
somewhere else.

A square is a legal place for a new node when **all** of these hold:

1. it holds no node already;
2. no ship is standing on it;
3. it is not on the outer edge of the board — not row 1 or 15, not column A
   or O;
4. it is not one square in from the outer edge — not row 2 or 14, not
   column B or N;
5. it is not orthogonally or diagonally adjacent to another node.

Constraints 3 and 4 leave the 11 × 11 interior **C3–M13** — 121 squares —
which holds fifteen mutually non-adjacent nodes very comfortably.

**The fallback.** If no square satisfies all five constraints, the new node
is placed uniformly among the squares that hold no node and are not a bay.
This is the whole of the relaxation, applied all at once rather than one
constraint dropped at a time, and it exists so that placement can never
fail — it is not expected to be needed given how much room the interior
leaves.

**A replacement never appears on the square the node it replaces just
left.** The retiring node's own square is excluded from the draw, so a node
that ends always ends somewhere visibly different from where the next one
starts.

---

## 4. Ships

Each player has **five, six or seven** ships — the same number for both
players, chosen before play begins; **seven is the standard game**. One
player is **green**, the other **red**. Green takes the first turn.

The bays never change (section 3.1): there are always fourteen, in the same
places. What changes with fleet size is which of them hold a ship at the
start, and — at five a side — the colours on the left and right edges.

**Seven a side (14 ships).** Every bay holds one ship, and the two fleets
alternate around the edge. Starting clockwise from H15:

> H15 green, L15 red, O14 green, O10 red, O6 green, O2 red, L1 green,
> H1 red, D1 green, A2 red, A6 green, A10 red, A14 green, D15 red.

**Six a side (12 ships).** The middle bay of the top edge and of the bottom
edge — **H15 and H1** — start empty. Every other bay holds exactly the ship
and the colour it holds in the seven-ship game; nothing is recoloured.

| Edge   | Bays, left to right / top to bottom  |
| ------ | ------------------------------------ |
| Top    | D15 red, **H15 empty**, L15 red      |
| Right  | O14 green, O10 red, O6 green, O2 red |
| Bottom | D1 green, **H1 empty**, L1 green     |
| Left   | A14 green, A10 red, A6 green, A2 red |

Green: O14, O6, D1, L1, A14, A6. Red: D15, L15, O10, O2, A10, A2.

**Five a side (10 ships).** The top and bottom bay of each four-bay edge —
**O14, O2, A14 and A2** — start empty, and the colours on those two edges are
**reversed** from the seven-ship game. The three-bay edges are untouched, so
the top still reads red-green-red and the bottom still reads green-red-green.

| Edge   | Bays, left to right / top to bottom                    |
| ------ | ------------------------------------------------------ |
| Top    | D15 red, H15 green, L15 red                            |
| Right  | **O14 empty**, O10 **green**, O6 **red**, **O2 empty** |
| Bottom | D1 green, H1 red, L1 green                             |
| Left   | **A14 empty**, A10 **green**, A6 **red**, **A2 empty** |

Green: H15, O10, A10, D1, L1. Red: D15, L15, O6, A6, H1.

**A bay left empty at the start is an ordinary empty bay in every way.** It
is not removed from the board and it is not reserved: either player may move
into it, and section 7.1's random return may send a beaten ship to it, exactly
as it would to any other empty bay.

The bays are spaced evenly, and each layout leaves its empty bays in
half-turn-opposite pairs — none at seven a side, H15 and H1 at six, O14/O2
and A14/A2 at five, with the colours flipping to match. So in all three
layouts each player's starting fleet is exactly the half-turn rotation of
the other's, and neither side begins with better ground.

Every ship starts at full power (4).

### 4.1 Power

A ship carries between 0 and 4 power. Power is what lets it move: each point
unlocks a further option in section 6's table, and with it a further option
for its attack range (section 7). It does nothing in a fight.

A ship **loses one power** at the end of its owner's turn standing on a
**charged node** — the node is drawing on the ship as it pays out — down to
the minimum of 0. It **gains one power** at the end of its owner's turn
standing on a **depleted** node or **in a bay**, up to the maximum of 4. An
**inactive** node does neither. A fight never changes a ship's power (section
7). A ship at 0 power is not destroyed and is not stuck: it still has one
square orthogonally, and a bay will refill it.

---

## 5. Turns and actions

Green takes the first turn, and the players alternate. On a turn a player takes
**one action**. Each action is either:

- **Move** one ship, or
- **Attack** with one ship.

A player must take as many of their turn's actions as are available. If a
player has no legal action at all, their turn passes. This should be
uncommon — a player always has at least five ships — but an action is not
always available: an attack reaches only as far as the attacker's power
allows, and a ship holding a node has no attack available to it at all. The
rule is here so the game can never deadlock.

A turn also passes when the player to move is out of time (section 10). That
is the second, and only other, reason a turn can pass.

---

## 6. Movement

A ship moves in a **straight line**, orthogonally or diagonally. How far it may
go depends on how much power it is carrying: each point unlocks a further
option, and the options accumulate as power rises.

| Power | Movement                                   |
| ----- | ------------------------------------------ |
| 0     | one square orthogonally                    |
| 1     | the above, plus one square diagonally      |
| 2     | the above, plus two squares orthogonally   |
| 3     | the above, plus two squares diagonally     |
| 4     | the above, plus three squares orthogonally |

So a ship at full power has twenty squares it can reach, and a ship at 0
power has four.

**The path must be clear.** Every square the ship passes over, and the square it
lands on, must be empty. Ships never fly over one another, and a ship can never
land on a square another ship occupies — neither a friendly ship nor an enemy
one.

Moving and attacking are entirely separate: a ship never attacks by moving
onto its target.

---

## 7. Combat

A ship may attack an enemy ship within its **movement range** (section 6) —
the same distances, the same straight lines, and on the same terms: every
square the attack passes over must be empty, of either side's ships. The
target square is of course occupied, by the enemy ship. At the two extremes:
a ship at 0 power reaches only one square orthogonally and cannot strike a
diagonal at all, while a ship at full power reaches three squares
orthogonally. Attacking is always the attacking player's choice; ships never
fight automatically.

Neither ship may be in a bay: a ship in a bay cannot attack, and cannot be
attacked. And neither ship may be standing on a **charged node**: a ship
holding a node cannot attack, and cannot be attacked. This is not only
protection — a ship holding a node has given up striking out while it stands
there. It applies to charged nodes alone: a ship standing on an **inactive**
or a **depleted** node is an ordinary target, and fights and is fought
exactly like a ship on any other square (section 8.5).

**There is no winner.** Both ships — the attacker and the ship it attacked —
are returned to bays (section 7.1), and both squares are left empty, but each
ship arrives carrying the power it had.

An attack is a **trade**: a player spends their own ship's position — not its
power — to take away their opponent's. It is worth making when the enemy ship
stands better than the attacker's own — beside a node, in the way, deep in
the attacker's own half — and not worth making otherwise.

Two things follow about nodes. A ship that reaches a node first cannot be
driven off it, so nodes are contested by arriving rather than by force. And a
holder who chooses to leave gives the node up **still lit** (section 8.3), so
the square it vacates is worth racing for.

### 7.1 Returning to a bay

A returning ship goes to a bay chosen **at random** from the bays that are
**empty at that moment**, every empty bay equally likely.

The choice is genuinely random, and neither player can see it coming — the
same assurance section 8.2 gives for the charge draw.

A returning ship is placed **immediately**, as part of resolving the fight,
before anything else happens. Every fight returns two ships: the attacker is
placed first, and the defender's bay is then drawn from the bays still empty.
Which ship is placed first makes no difference to the odds, but fixing the
order is what lets a recorded game replay exactly.

There is always somewhere to go: both ships in a fight were by definition on
the board and not in a bay, so at least two bays are empty, and the
attacker's placement can never leave the defender without one.

### 7.2 Returning by choice

A ship may also go back to a bay deliberately. This is not a special action —
it is an ordinary move that ends on an empty bay, and like any move it must
be within the ship's range and have a clear path. What it gets there is
recovery at a point per turn (section 3.1, section 4.1), not an instant
refill.

---

## 8. Nodes

### 8.1 The three states of a node

Every node is always in exactly one of three states:

- **Inactive** — eligible to be charged, producing nothing, and costing
  nothing.
- **Charged** — producing energy: a ship standing on it collects (section
  8.4) and the node takes power from it (section 4.1) as it pays out, and can
  neither attack nor be attacked (section 7).
- **Depleted** — recovering after running out. Not eligible to be charged,
  producing nothing, and costing the player whose ship stands on it: energy
  (section 8.4), while giving power back (section 4.1), at the end of each of
  that player's turns.

A node cycles inactive → charged → depleted → **ends**. The instant a node
ends, a new inactive node appears somewhere else on the board (section 3.2).

The board **aims** to keep four nodes charged at all times: at the end of
every turn it charges as many inactive nodes as it takes to bring the
charged count back to four (section 8.2). If there are not enough inactive
nodes, it charges what it can and simply runs short until the next turn.

**The opening board is dealt.** The game opens with **fifteen** nodes, at
fifteen squares drawn under section 3.2:

- **Four of the fifteen are charged**, at squares drawn at random with every
  legal square equally likely and no two the same. No square is privileged;
  the centre is not guaranteed.
- **Each of the four starts part-drained**, at a drain drawn from the opening
  drain table below — never more than 40, two-thirds of the capacity of 60
  (section 8.3), so every dealt node has enough life left to be worth racing
  for.
- **Every other node starts inactive**, at a pressure drawn from the opening
  pressure table below, rather than at 1 (section 8.2).
- **Nothing is depleted at the start.**

| Drain | 0   | 5   | 10  | 15  | 20  | 25  | 30  | 35  | 40  | Average |
| ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- |
| Share | 20% | 18% | 15% | 12% | 10% | 8%  | 7%  | 6%  | 4%  | 14      |

An average opening node has 46 of its capacity left: about 22 turns if
nobody ever reaches it, about 10 if a ship arrives and holds it from the
first turn. The most-used opening node has 20 left.

| Pressure | 1   | 5   | 10  | 15  | 20  | 25  | 30  | 40  | 50  | Average |
| -------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- |
| Share    | 24% | 20% | 16% | 12% | 9%  | 7%  | 5%  | 4%  | 3%  | 12.79   |

Most nodes have waited only a little, but the tail means a game can open
with one or two nodes already close to the cap of 50, which are the nodes
the first charge draw will favour.

Nothing needs to spread their expiries out by hand. The four now open at
different ages as well as draining at independently drawn rates, so they are
spread apart from the first turn rather than spreading within the first
few.

### 8.2 Charging a node

At the end of every turn, as many **inactive** nodes as it takes to bring the
charged count back to four are chosen at random, one at a time. If fewer
than that are inactive, fewer are charged and the board runs below four
until the next turn — with fifteen nodes on the board and a target of four,
this is now the uncommon case rather than the likely one. Charged nodes
still run out on schedule whether or not the board is at its four.

The draw does not look at occupancy: a node with a ship standing on it can be
charged like any other. That ship is holding a node from that moment — it
collects (section 8.4) and starts losing power (section 4.1) at the end of
its owner's next turn, exactly as if it had moved onto a node.

The choice is genuinely random, and neither player can see it coming — but it
is no longer an equal chance for every inactive node. An inactive node
carries **pressure**: it goes inactive at **1** and gains **1** at the end of
every turn it stays inactive, up to a maximum of **50** — except at the start
of the game, where the opening deal gives each inactive node a pressure of
its own (section 8.1). Each inactive node's chance of being drawn is its
pressure as a share of the total pressure of all inactive nodes, so a node
that has been waiting a long time is more likely to be picked than one that
has just cycled. Because pressure is never less than 1, no inactive node can
ever be excluded outright.

A depleted node **recovers** instead of simply cooling down. A node goes
depleted at its capacity, or a little past it — the drain draw that tips it
over may overshoot — and at the end of every turn subtracts an amount drawn
at random:

| Recovery | 4   | 5   | 6   | 7   | 8   | Average |
| -------- | --- | --- | --- | --- | --- | ------- |
| Depleted | 10% | 25% | 30% | 25% | 10% | 6       |

When it reaches zero or below, the node **retires**: it leaves the board, and
at that same instant a new inactive node appears somewhere else, at 1
pressure, drawn under section 3.2 and never on the square the retiring node
just left. Recovery always starts from about the same level, so retirement
always comes about ten turns after a node goes depleted.

### 8.3 How long a node lives

A charged node has a **capacity** of 60 units and a **drain** that starts at 0
and rises at the end of every turn by an amount drawn at random — except at
the start of the game, where the opening deal starts each charged node already
part-drained (section 8.1). Which distribution it draws from depends on
whether a ship is standing on it at that moment — either player's ship; it
makes no difference whose:

| Node  | 1   | 2   | 3   | 4   | 5   | 6   | Average |
| ----- | --- | --- | --- | --- | --- | --- | ------- |
| Empty | 20% | 50% | 30% | —   | —   | —   | 2.1     |
| Held  | —   | —   | 10% | 40% | 30% | 20% | 4.6     |

A node runs its drain up whether or not any ship is standing on it — it just
runs up more than twice as fast when one is.

A node ends **one** way: when its drain reaches or passes capacity, it is
spent, and it goes depleted at the end of that turn and simply stops paying. A
ship left standing on it stays where it is (section 8.5). A ship that leaves
a node does not end it — the node simply reverts to the slower empty rate
and burns on. An empty node lasts about 28 turns; a held one
lasts about 13, and those two figures now bracket every node's life.

### 8.4 Energy

At the end of each player's turn, that player collects energy for the
charged nodes they are **standing on**, and then pays for the depleted
nodes they are **standing on**. A node counts for either half only if one of
that player's ships is on it at that moment — flying across a charged node or
a depleted node and moving on neither collects nor costs anything.

| Nodes counted | Energy |
| ------------- | ------ |
| 0             | 0      |
| 1             | 1      |
| 2             | 3      |
| 3             | 6      |
| 4             | 10     |

The charged nodes a player holds are priced off this table exactly as
before. Unlike charged nodes there is no limit on how many nodes are
depleted at once — up to eleven of the fifteen can be, since at most four are
ever charged — so the depleted count is **capped at four** before it is
priced: five, six or seven depleted nodes cost the same 10 that four do. The
most a turn can pay is 10, so the most a turn can cost is now exactly 10 too —
neither half of this section can outrun the other.

The two halves are applied in that order — collect, then pay — and
they are **not netted**. Holding nodes and sitting on depleted ones are
separately priced, and both are priced steeply: a player holding three
charged nodes while standing on two depleted nodes collects 6 and then pays
3, for a net of **+3**, not the +1 that a net count of one node held would
have paid.

**A player's total energy never falls below zero.** Where a turn's penalty
is larger than the energy the player has, their total lands on 0 rather
than going negative.

### 8.5 Standing on a node that is not charged

Standing on an inactive or a depleted node is allowed and ordinary. A ship
may end a move on either, and may stay there for the rest of the game if its
owner likes — nothing about it obliges the owner to move it, or anything
else, on a later turn.

The two are not the same. An **inactive** node pays nothing and costs
nothing, so waiting on one for the charge draw is free, and it neither takes
nor gives power. A **depleted** node pays nothing and **costs**: an energy
penalty (section 8.4) at the end of each of the owner's turns — but it gives
power back (section 4.1). A **charged** node, by contrast, takes power from
the ship holding it as it pays out (section 8.1).

Neither an inactive nor a depleted node offers what a charged node offers: a
ship standing on one can be attacked like any other ship, and may attack
like any other ship (section 7).

A node's own cycle carries on underneath the ship. A depleted node recovers
towards retirement on schedule regardless of what is standing on it, and an
inactive node is eligible for the charge draw whether or not a ship is
standing on it (section 8.2). If the node underneath a ship retires, the
ship is untouched — it keeps its square and its power — but the square it
stands on is no longer a node at all, so from that instant it is an
ordinary square: it costs nothing further, and gives no power back.

When a node runs out under the ship holding it (section 8.3), the ship
loses its protection at that same instant — it stops being a node, and so
stops being a refuge (section 7) — even though it does not start costing
anything straight away: the holder pays from the end of its owner's next
turn unless it leaves before then. The ship stays or leaves, exactly as its
owner prefers, and leaving now costs the node nothing.

### 8.6 End-of-turn order

Everything that happens at the end of a turn happens in this order:

1. Each of the moving player's ships standing on a charged node loses a
   point of power, and each standing on a depleted node or in a bay gains
   one (section 4.1).
2. The moving player collects energy for the charged nodes they hold and
   then pays for the depleted nodes they occupy (section 8.4).
3. Every charged node adds its drain (section 8.3); any that reaches capacity
   goes depleted, and any ship standing on it keeps standing there, collecting
   nothing and, from the end of its owner's next turn, paying for it
   (section 8.4).
4. As many inactive nodes as it takes to bring the board back to four
   charged are charged, drawn by pressure (section 8.2).
5. Every node still inactive gains a point of pressure, to the cap of 50
   (section 8.2).
6. Every node that was depleted **before this turn began** subtracts its
   recovery (section 8.2); any that reaches zero or below **retires and is
   replaced**: it leaves the board, and a new inactive node appears
   somewhere else, at 1 pressure, drawn under section 3.2.

A turn that passes because no legal action was available (section 5) is still
a turn: this sequence runs for it in full, just as it would for a turn in
which an action was taken. The node clocks still tick, and a ship of the
passing player standing on a charged node still loses its point of power and
one standing on a depleted node or in a bay still gains one; the passing
player still collects and still pays exactly as they would if they had
acted.

Step 6 is last **deliberately**, for the same reason as before: it is what
makes a node spend at least one whole turn inactive before it can be
charged. A node that appears — whether from the opening deal or as a
replacement in step 6 — is inactive for the whole of the next turn and is
first eligible in that next turn's draw, at 1 pressure. A node that finishes
recovering and is replaced at the end of turn N produces a new node that is
inactive for the whole of turn N+1, first eligible in turn N+1's charge
draw. Running the steps in any other order would let a node retire, be
replaced and be charged inside a single end-of-turn sequence, and the
replacement would never be visibly inactive at all.

Step 5 sits **after** the charge draw for the matching reason: a node is
drawn at the pressure it has held all turn, so its first appearance in a
draw is at weight 1, not 2.

The two clocks are symmetric about the turn a state is entered. A node
charged in step 4 of turn N first drains in step 3 of turn N+1, and a node
that goes depleted in step 3 of turn N first counts towards recovery in
step 6 of turn N+1, which is what step 6's "depleted before this turn began"
is for: a node must not drain or recover on the very turn it entered its new
state.

A node's state changes only in this sequence, and never as part of resolving
an action. A node's ending and its replacement's appearance are likewise
both part of this sequence, at step 6, never part of resolving an action.

---

## 9. Ending the game

The game ends after the number of rounds chosen before play begins —
**30, 45, 60 or 90 rounds**, that many turns each — with **30** the
standard game. It also ends immediately, before its rounds are up, the
moment both players have run out of time (section 10). Either way, the
player with the most energy wins, and equal energy is a draw.

---

## 10. The clock

Alongside the fleet size and the number of rounds, a player chooses a
**clock** before play begins: no clock, or 6, 4 or 2 seconds a turn, with no
clock the standard game.

Each player's clock starts with a budget: their seconds a turn multiplied by
the number of turns the chosen length gives them. The whole game is
budgeted, not each turn, so a player may spend their time however they like
across their turns — there is no per-turn limit and no increment.

Green's clock starts the moment play begins. Only the player whose turn it
is is counting; the clock changes hands the instant the turn does.

A player whose clock reaches zero passes every remaining turn. Those turns
are still turns — section 8.6 runs in full for them — and their opponent
goes on playing normally.

When both players' clocks have reached zero, the game ends immediately
(section 9).

Running out of time is **not** a loss. Energy decides the game however it
ends.

---

## Appendix A — Open items

Nothing is currently outstanding. The rules are expected to keep changing as
the game is built, so this appendix will list open items again when there are
any.

---

## Appendix B — Sizing the node pool

The board carries **fifteen** nodes at all times: one out, one in, whenever a
node retires. A node's life is a mix of empty and held turns rather than a
fixed count, but the mix works out to roughly **twenty** turns charged, and
recovery runs about **ten** more turns depleted before retirement — thirty
turns from birth to death. For four of the fifteen to be charged at any
moment, a whole life runs about 20 × 15 / 4 ≈ **seventy-five** turns, of
which about **forty-five** are spent waiting inactive: roughly 4 charged, 2
depleted and 9 inactive at any moment, so a node now charges about every
**five** turns, rather than every four — the pool is looser than it was
against a target of five, with more of the fifteen sitting inactive at any
moment.

Running short of four charged remains a **legal outcome**, not a failure the
pool must be sized to prevent — section 8.2 charges as many inactive nodes
as it can and simply falls short when it has to. But with roughly nine of
the fifteen nodes inactive at any moment, against a target of only four,
this is now the **uncommon** case rather than the likely one: the pool is
comfortable enough that the charge draw usually finds all the inactive
nodes it needs.

What is worth checking first when these numbers are next retuned is the
**pressure cap against the average wait**. A node now waits something like
forty-five turns between cycles, against a cap of 50 — the cap sits only a
little above the average wait, so a larger share of the inactive pool sits
at or near the cap at any moment, which flattens the weighting back towards
uniform at the top end rather than sharpening it. That, and the size of the
inactive pool against the target of four charged, are what to check first
whenever these numbers are retuned.

These counts — fifteen nodes, four charged, eleven inactive at the deal —
are first guesses to be play-tested and retuned like every other number in
this document.

The app guards this with a test that the inactive pool stays comfortably
populated over a long run, that expiries stay spread rather than arriving
together, and that no node waits unboundedly long between appearing and
being charged.

The opening deal (section 8.1) starts the board closer to this steady state
than an unweighted opening did, so the first twenty turns are no longer an
unrepresentative settling-in period.
</content>
