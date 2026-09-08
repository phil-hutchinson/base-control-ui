# Base Control — Rules

**Rules version: 0.27**

This document is the single source of truth for how Base Control is played.
The app implements what is written here; where the two disagree, this document
is right and the app has a bug.

---

## 1. Overview

Base Control is a two-player game played on a square board. Each player
commands a fleet of five or six ships and competes to occupy the board's
contested nodes, collecting **energy** for every turn they hold one. The
player with the most energy when the game ends is the winner.

Ships are never destroyed. A fight has no winner — both ships involved are
pushed back to a planet, carrying exactly what they carried before the
fight, and rejoin the game from there.

A ship carries **power**, a reserve it spends to move and refills only on
planets. A ship holding a node cannot be attacked while it holds it. A node
that has burned out traps the ship standing on it until it retires.

The board is not a fixed map with lights moving across it: nodes are born,
run out and leave, and whenever one charges the whole set of nodes still
waiting is swept away and a fresh set drawn elsewhere, so the map itself
redraws as the game runs, and the squares worth racing for change over the
course of a game, not just which of them are lit. That redrawing happens
only because the players use the nodes on the board — a node nobody stands
on never changes at all (section 8.3).

The game has three random elements that shape every game — the opening
board itself, where the three new nodes appear when the waiting set is
refilled and which of them gets which priority, and which planet the two
ships in a fight are pushed back to. No two games start on the same board,
and neither player has seen this one before.

---

## 2. Words used in these rules

**Turn** — everything one player does before play passes to their opponent. A
turn is one action.

**Round** — one turn for each player. The game lasts for the number of
rounds chosen before play begins — 30, 45, 60 or 90 — and 30 is the
standard game (section 9).

**Action** — what a player does on their turn: move a ship, or attack with a
ship.

**Power** — what a ship carries and spends to move: how far it can go. It is
refilled only on planets.

**Trapped** — a ship on a depleted node, which cannot move and cannot attack
until the node under it retires.

**Node** — a position on the board that comes into being, runs through three
states — **inactive**, **charged** and **depleted** — and then ends and
simply leaves the board. The board always carries **four** charged nodes and
**three** inactive ones, plus however many happen to be depleted at the
time (section 8.1).

**Priority** — a number, 1, 2 or 3, carried by each of the three inactive
nodes at once, one each, never a repeat. The inactive node with the highest
priority is the one that charges next (section 8.2).

**Countdown** — how many turns of life a charged or depleted node has left,
spent one at the end of every turn, either player's. A charged node carries
a countdown only while a ship stands on it (section 8.3).

---

## 3. The board

The board is 15 x 15 squares. Columns are lettered **A** to **O** from left to
right; rows are numbered **1** to **15** from bottom to top. A square is named
by its column and row, so **H8** is the centre of the board and **A1** is the
bottom-left corner.

### 3.1 Planets

Twelve squares away from the board's outer edge are **planets** — six base
squares plus their 180-degree rotation about the board's centre:

| Base     | B3  | D6  | G4  | J2  | K6  | N4  |
| -------- | --- | --- | --- | --- | --- | --- |
| Rotation | N13 | L10 | I12 | F14 | E10 | B12 |

Each player's half of the board carries exactly the rotation of the other's
planets, so neither side begins nearer better ground.

A planet is an ordinary square in every way except two:

- A ship standing on a planet cannot attack and cannot be attacked.
- A ship standing on a planet **at the end of its owner's turn** gains one
  power, or **two** if it is the only one of that player's ships charging, up
  to the maximum of 6 (section 4.1). A ship already at 6 is not charging: it
  gains nothing and does not stop another ship taking the double rate. Flying
  over an empty planet does nothing — only standing on one at the end of the
  turn counts — and arriving on one does nothing by itself either; the first
  point comes at the end of that turn like any other. A planet is where a
  ship goes to recover.

Planets are not owned. Either player's ships may use any planet.

This diagram shows the board's fixed squares: the twelve planets, and the
fourteen starting squares (section 4) where ships begin — fleet size decides
which of the fourteen are used. A starting square is otherwise an ordinary
square: it gives nothing and protects nothing. The diagram does not show any
node, because a node's square is not fixed — where nodes stand changes as
the game runs (section 3.2):

```
     A B C D E F G H I J K L M N O
 15  . . . S . . . S . . . S . . .
 14  S . . . . P . . . . . . . . S
 13  . . . . . . . . . . . . . P .
 12  . P . . . . . . . . . . . . .
 11  . . . . . . . . . . . . . . .
 10  S . . . P . . . . . . P . . S
  9  . . . . . . . . . . . . . . .
  8  . . . . . . . . . . . . . . .
  7  . . . . . . . . . . . . . . .
  6  S . . P . . . . . . P . . . S
  5  . . . . . . . . . . . . . . .
  4  . . . . . . P . . . . . . P .
  3  . P . . . . . . . . . . . . .
  2  S . . . . . . . . P . . . . S
  1  . . . S . . . S . . . S . . .

P  planet          S  a starting square (fleet size decides which are used)
```

### 3.2 Where a node can appear

There are no fixed positions on the board any more. A node's square is drawn
when the node appears, and it stays there for exactly as long as that node
lasts.

A square is a legal place for a new node when **all** of these hold:

1. it holds no node already;
2. no ship is standing on it;
3. it is not on the outer edge of the board — not row 1 or 15, not column A
   or O;
4. it is not one square in from the outer edge — not row 2 or 14, not
   column B or N;
5. it is not orthogonally or diagonally adjacent to another node;
6. it is not a planet, and is not orthogonally or diagonally adjacent to a
   planet (section 3.1).

Constraints 3 and 4 leave the 11 × 11 interior **C3–M13** — 121 squares. Six
of the twelve planets fall inside that interior; constraint 6 removes those
six and their neighbours, leaving **51** legal squares, of which up to
eighteen mutually non-adjacent nodes fit with room to spare.

**The fallback.** If no square satisfies all six constraints, the new node
is placed uniformly among the squares that hold no node, hold no ship, and
are not a planet — constraints 1, 2 and the planet half of 6 stay in force;
only spacing relaxes, all at once rather than one constraint dropped at a
time, and it exists so that placement can never fail. Between this fallback
and constraint 2 above, a node can never appear beneath a ship, however the
draw is made. It was not observed to fire even once in simulation — neither
at the opening deal, with the board otherwise empty or with every ship
scattered through the interior blocking squares of their own, nor at a
mid-game refill — so it is better read as the guarantee that placement
always succeeds than as something a player should expect to see.

**Refilling the three inactive nodes draws from a pool that widens once**
(section 8.2). A refill draws three squares, one at a time: the first uses
all six constraints above; the second and third lift constraint 4 only —
"not one square in from the outer edge" — and nothing else. Constraint 3 is
never lifted for these ordinary draws: the outer edge itself stays closed to
a new node however far the pool widens. On an empty board the strict pool
holds the 51 squares above, and the widened pool holds **79**.

**The draw is weighted, not uniform.** For a candidate square `s`, with `C`
the squares holding **charged** nodes and `N` the squares already chosen for
new inactive nodes in the same refill:

    w(s) = 1 + ( sum over c in C of d(s,c) ) * ( product over n in N of d(s,n) )

where `d` is **Chebyshev distance** — the greater of the column difference
and the row difference between two squares — and the product over an empty
`N` is 1, so the first square of a refill is weighted by distance from the
charged nodes alone. Distance from the charged nodes sets a square's base
appeal, and each inactive node already placed in the same refill multiplies
it down: a square close to _any_ already-placed node collapses towards the
floor, because the product follows the nearest one rather than averaging
across all of them — that is what spreads the three new nodes apart from
each other, rather than merely pushing the group outward together.
Chebyshev distance is used rather than taxicab distance because it is the
closer of the two to how far apart squares actually play — a diagonal step
is a single move (section 6), which taxicab distance charges as two. A
depleted node carries no weight at all, though it still blocks its own
square and its neighbours through constraint 5. The leading 1 is a
positivity guarantee, not a fairness floor: it keeps the total weight
positive and makes the draw uniform on the rare board with no charged nodes
at all, but it buys a poorly placed square no meaningful chance otherwise.

---

## 4. Ships

Each player has **five or six** ships — the same number for both players,
chosen before play begins; **six is the standard game**. One player is
**green**, the other **red**. Green takes the first turn.

A ship starts on a **starting square** (section 3.1) — an ordinary square in
every way, occupied or not. Which starting squares are used, and which
colour stands on each, depends on the fleet size:

**Six a side (12 ships).**

| Edge   | Left to right / top to bottom        |
| ------ | ------------------------------------ |
| Top    | D15 red, L15 red                     |
| Right  | O14 green, O10 red, O6 green, O2 red |
| Bottom | D1 green, L1 green                   |
| Left   | A14 green, A10 red, A6 green, A2 red |

Green: O14, O6, D1, L1, A14, A6. Red: D15, L15, O10, O2, A10, A2.

**Five a side (10 ships).**

| Edge   | Left to right / top to bottom |
| ------ | ----------------------------- |
| Top    | D15 red, H15 green, L15 red   |
| Right  | O10 green, O6 red             |
| Bottom | D1 green, H1 red, L1 green    |
| Left   | A10 green, A6 red             |

Green: H15, O10, A10, D1, L1. Red: D15, L15, O6, A6, H1.

Both layouts are exact half-turn rotations of one another — each player's
starting fleet is the rotation of the other's — so neither side begins with
better ground.

Every ship starts at full power (6).

### 4.1 Power

A ship carries between 0 and 6 power. Power is what it spends to move: every
move has a price in section 6's table, and a ship may take any move it can
afford.

A ship **gains power** at the end of its owner's turn standing on a
**planet** — one, or two if it is the only one of that player's ships
charging (section 3.1) — up to the maximum of 6. Nothing else changes a
ship's power: a **charged** node does not reduce it, a **depleted** node does
not refill it, an **inactive** node does neither, and a fight leaves the
defender's power alone (section 7). A ship at 0 power is not destroyed and is
not stuck: the one-square orthogonal move is free, and a planet will refill
it.

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
allows, and a ship holding a node has no attack available to it at all. A
**trapped** ship (section 8.5) offers no action at all, so a player whose
ships are all trapped would otherwise pass; section 8.6 step 7 exists to
prevent that. The rule is here so the game can never deadlock.

A turn also passes when the player to move is out of time (section 10). That
is the second, and only other, reason a turn can pass.

---

## 6. Movement

A ship moves one or two squares: orthogonally, diagonally, or in an **L** —
one orthogonal step and one diagonal step, in either order. What it may do
depends on what it can pay: every move has a price, out of the power it
carries, and a ship may take any move it can afford, and is free to take a
cheaper one and spend less.

| Move                                                            | Cost |
| --------------------------------------------------------------- | ---- |
| one square orthogonally                                         | 0    |
| one square diagonally                                           | 1    |
| two squares orthogonally                                        | 2    |
| the L — one orthogonal step and one diagonal step, either order | 2    |

A ship with 2 power or more can reach all twenty of the squares the four
shapes give; a ship with 1 power reaches the eight orthogonal and diagonal
single steps; a ship with 0 power reaches the four orthogonal single steps —
and since that move is free, a ship can always make it, however empty its
tank.

**The path must be clear of enemy ships.** Every square a move passes over
must be free of an **enemy** ship — a ship flies over its own side freely —
and the square it lands on must be empty of any ship, of either side: a ship
can never land on a square another ship occupies, friendly or enemy. Nor may
it land on a node that is not **charged** — an **inactive** node and a
**depleted** node are both closed to landing, and read identically here:
flying **over** either is still free, exactly like flying over any other
square, but a move may not end on one. Only a charged node is a square a
ship may occupy. The L
passes over two squares, its two corners: the one it turns through
orthogonally and the one it turns through diagonally — for example, the L
from H8 to J9 turns through I8 (the orthogonal corner) and I9 (the diagonal
corner). An enemy ship on **either** corner blocks the L; only one of the two
need be occupied. A **trapped** ship (section 8.5) has no move at all.

Moving and attacking are entirely separate: a ship never attacks by moving
onto its target.

---

## 7. Combat

A ship may attack an enemy ship within its **movement range** (section 6) —
the same shapes, priced the same way, so an attack reaches whatever the
attacker can currently **afford**, the L included. The attack **costs** that
price: the attacker pays it out of its own reserve as the attack resolves,
and arrives on its planet already having paid (section 7.1). The defender
pays nothing. Every square the attack passes over must be free of an
**enemy** ship, exactly as a move requires (section 6); the target square is
of course occupied, by the enemy ship it strikes. At the two extremes: a
ship at 0 power strikes only one square orthogonally and nothing else, while
a ship with 2 power or more strikes anywhere in the twenty. Attacking is
always the attacking player's choice; ships never fight automatically.

Neither ship may be on a planet: a ship on a planet cannot attack, and
cannot be attacked. And neither ship may be standing on a node that is
**charged** or **depleted**: a ship on either can neither attack nor be
attacked. Any other ship is an ordinary target, and fights and is fought
exactly like a ship on any other square.

The two protections are not the same bargain. A ship holding a **charged**
node has given up striking out while it stands there, but it chose its
position and may leave whenever it likes. A **trapped** ship on a
**depleted** node has neither choice: it cannot leave, and cannot attack,
until the node retires (section 8.5).

**There is no winner.** Both ships — the attacker and the ship it attacked —
are returned to planets (section 7.1), and both squares are left empty. The
defender arrives carrying the power it had; the attacker arrives having
already paid the cost of the shot.

An attack is a **trade**: a player spends their own ship's position **and**
the power the shot cost, to take away their opponent's position. It is worth
making when the enemy ship stands better than the attacker's own — beside a
node, in the way, deep in the attacker's own half — and not worth making
otherwise.

Two things follow about nodes. A ship that reaches a node first cannot be
driven off it, so nodes are contested by arriving rather than by force. And a
holder who chooses to leave gives the node up **still lit** (section 8.3), so
the square it vacates is worth racing for.

### 7.1 Returning to a planet

A returning ship goes to a planet chosen **at random** from the planets
**empty at that moment**, every empty planet equally likely.

The choice is genuinely random, and neither player can see it coming — the
same assurance section 8.2 gives for where the queue's new nodes appear.

A returning ship is placed **immediately**, as part of resolving the fight,
before anything else happens. Every fight returns two ships: the attacker is
placed first, and the defender's planet is then drawn from the planets still
empty. Which ship is placed first makes no difference to the odds, but
fixing the order is what lets a recorded game replay exactly.

There is always somewhere to go: with twelve ships and twelve planets, the
two ships in a fight were by definition not on planets, so at most ten
planets are occupied and at least two are free — enough for the attacker's
placement, and the defender's after it, to each find an empty one.

### 7.2 Returning by choice

A ship may also go back to a planet deliberately. This is not a special
action — it is an ordinary move that ends on an empty planet, and like any
move it must be within the ship's range, and it must be a shape the ship can
afford, and have a clear path. What it gets there is recovery at the section
3.1 rate — one power a turn, or two if it is the only one of its owner's
ships charging — not an instant refill.

---

## 8. Nodes

### 8.1 The three states of a node

Every node is always in exactly one of three states:

- **Inactive** — one of exactly three nodes waiting to be charged, each
  carrying a **priority** of 1, 2 or 3, one each, never a repeat (section
  8.2). Producing nothing, and costing nothing.
- **Charged** — producing energy: a ship standing on it collects (section
  8.4) and can neither attack nor be attacked (section 7). It takes nothing
  from the ship holding it, and carries a **countdown** only while a ship is
  standing on it (section 8.3).
- **Depleted** — counting down towards retirement. Not eligible to be
  charged, producing nothing, and **trapping** any ship standing on it: that
  ship cannot move, and can neither attack nor be attacked (section 7), until
  the node retires.

A node cycles inactive → charged → depleted → **ends**, and simply leaves
the board.

The board keeps **four** nodes charged at all times: at the end of every
turn, whatever shortfall there is against four is filled from the three
inactive nodes, highest priority first. The shortfall is always filled on
the turn it appears — the board is never left short of four charged
(Appendix B).

**The opening board is dealt.** The game opens with **seven** nodes:

- **Four are charged**, at squares drawn under section 3.2, at random, with
  every legal square equally likely and no two the same. No square is
  privileged; the centre is not guaranteed.
- **Each of the four starts at baseline**, with no countdown, exactly like
  any node charged during play — nothing about a freshly charged node is
  random, and it will sit there for the rest of the game if no ship reaches
  it.
- **The other three start inactive**, placed by the same refill procedure
  that fills the queue during play (section 8.2), and dealt priorities 1, 2
  and 3 at random.
- **Nothing is depleted at the start.**

### 8.2 Charging a node

At any moment the board carries exactly three **inactive** nodes, holding
priorities 1, 2 and 3 — one each, never a repeat (section 8.1).

At the end of every turn, whatever shortfall there is against four charged
is filled from the three inactive nodes, in descending order of priority —
the 3 first, then the 2, then the 1, as many as the shortfall calls for.
There is no draw and no weighting: a player who can see the priorities knows
which node charges before it happens. A charged node starts at **baseline**,
with no countdown (section 8.3) — no node ever appears under a ship (section
3.2), so a newly charged node never has one standing on it already.

**Priorities rotate at the end of every turn on which nothing charged**: 1
becomes 2, 2 becomes 3, and 3 becomes 1. The nodes themselves do not move —
only their priorities change — so over three such turns each of the three
takes its turn at the front.

**Any turn on which one or more nodes charge, the three inactive nodes are
replaced together.** Whichever of the three did not charge are discarded —
they leave the board exactly as a node that ends does — and three new
inactive nodes are drawn by the refill procedure below, with priorities 1, 2
and 3 dealt to them at random. A freshly refilled trio is never rotated in
the same turn it was dealt; rotation only happens to a trio that survives a
turn untouched.

**The refill procedure** draws three squares one at a time, from the pool
that widens once (section 3.2): the first square is drawn from the strict
pool, and the second and third from the widened pool, each draw seeing the
squares already chosen so that the three new nodes are never adjacent to
each other. Each square is drawn by the weighted formula in section 3.2,
which favours squares far from the charged nodes and from the other new
nodes as they are placed. The three priorities 1, 2 and 3 are then dealt to
the three squares in random order.

A depleted node's own countdown, and when it retires, is section 8.3's
business.

### 8.3 How long a node lives

A node's life is governed by its **countdown**: a number of turns, with one
turn spent at the end of every turn, either player's. A countdown that
starts in the middle of a turn spends its first turn at the end of that same
turn; a countdown that starts at a turn end spends its first turn at the end
of the next whole turn. When the last turn is spent, the node changes state.

**A charged node has a countdown if and only if a ship is standing on it.**
Nothing about it is random: it is set to **11 turns** the moment a ship
**moves onto** the node, which is the only way in — there is no second way
for a charged node's countdown to start. That always happens in the middle
of the moving player's turn, so that turn's end is the first of the eleven,
and the eleven land on **six** of that player's own turn ends: the turn they
moved onto it and the five after. A charged node nobody has stepped on
carries no countdown at all and sits at its **baseline** for the rest of the
game if nobody comes.

Because a move is one action and a turn is one action, **at most one
countdown can start per turn** (Appendix B).

A charged node carrying a countdown shows a **black number**: how many of
the **holder's own turns** the node still has left. It counts down from 6 to
1 and never reads 0 — the node changes state first. Both players read it the
same way: it always counts the turns of whoever is standing there, so to the
player who is not holding it, it says how many of the opponent's turns that
node has left.

| When                     | Number | What happened                                                               |
| ------------------------ | ------ | --------------------------------------------------------------------------- |
| green's turn, on arrival | 6      | countdown set to 11 turns                                                   |
| end of green's turn      | 5      | green collects; first turn spent                                            |
| end of red's turn        | 5      | second turn spent                                                           |
| end of green's turn      | 4      | green collects; third turn spent                                            |
| …                        |        |                                                                             |
| end of green's turn      | 1      | ninth turn spent                                                            |
| end of red's turn        | 1      | tenth turn spent                                                            |
| end of green's turn      | —      | green collects a sixth time, then the node depletes and the ship is trapped |

Energy is collected in step 2 of the end-of-turn order (section 8.6) and
depletion happens in step 3, so a node held to the very end pays its holder
a sixth time in the same instant it traps them.

**A ship that leaves a charged node depletes it immediately** — as the move
resolves, not at the end of the turn. The square becomes a depleted node on
the spot: nothing may land there for the rest of that turn (section 6), and
the node does not revert to waiting for the next visitor — it is over. You
cannot hand a node back: a holder's choice is between staying and being
trapped, or leaving and losing the node entirely, with no third option of
stepping away and coming back later. Nor can the opponent inherit it — a
node you leave is not there to be taken. Leaving also forfeits that turn's
energy from it, since energy counts the nodes a player is standing on when
their turn ends. The shortfall this creates is filled at the **end of the
turn**, exactly like any other shortfall against four charged (section
8.2) — nothing charges in the middle of a turn.

A depleted node comes in two lengths, depending on how it was created:

- **A node that runs out under its holder** traps that ship (section 8.5)
  and carries an **11-turn** countdown starting at that turn's end, so it
  covers **five** of the trapped player's own turns and retires at the end
  of the **opponent's** turn. It shows a **white number**, read the same way
  as the black one — the trapped player's own turns still to come, counting
  down from 5 to 1, never 0.

  | When                | Number | What happened                                              |
  | ------------------- | ------ | ---------------------------------------------------------- |
  | end of green's turn | 5      | the node depletes, green's ship is trapped                 |
  | end of red's turn   | 5      | first turn spent                                           |
  | end of green's turn | 4      | second turn spent — one trapped turn gone                  |
  | …                   |        |                                                            |
  | end of green's turn | 1      | eighth turn spent                                          |
  | end of red's turn   | 1      | ninth turn spent                                           |
  | end of green's turn | 1      | tenth turn spent — green's last trapped turn               |
  | end of red's turn   | —      | eleventh turn spent: the node retires and the ship is free |

  The trapped ship is released just before its owner's own turn, ready to
  move immediately rather than sitting free but idle through the opponent's
  turn.

- **A node left behind by its holder walking off** has no ship to trap and
  carries a **2-turn** countdown starting in the middle of the leaving
  player's turn: it spends its first turn at that turn's end and its second
  at the end of the opponent's, and then retires. It carries **no number**.

Both kinds of depleted node simply **retire** when their countdown runs out:
they leave the board and nothing appears in their place.

### 8.4 Energy

At the end of each player's turn, that player collects energy for the
charged nodes they are **standing on**, priced off the table below. A node
counts only if one of that player's ships is on it at that moment — flying
across a charged node and moving on collects nothing.

| Nodes counted | Energy |
| ------------- | ------ |
| 0             | 0      |
| 1             | 1      |
| 2             | 3      |
| 3             | 6      |
| 4             | 10     |

Nothing in the game subtracts energy. A player's total only ever rises.

### 8.5 Standing on a depleted node

A ship is never on a **depleted** node by choice: a move may not end on one
(section 6), so the only way a ship comes to be standing on a depleted node
is being caught there the instant the node it was holding runs out beneath
it (section 8.3). That ship is **trapped**: it cannot move, and can neither
attack nor be attacked (section 7), for as long as the node stays depleted.
It is released the moment the node retires — at which point its square is no
longer a node at all, but an ordinary square, and it is an ordinary ship,
free to move or attack like any other.

A **depleted** node pays nothing and takes something harder to spare from
the ship trapped on it: its freedom. A **charged** node, by contrast, pays
energy to the ship holding it and takes nothing from it (section 8.1).
Neither state touches a ship's power (section 4.1) at all — only a planet
does.

When a node runs out under the ship holding it (section 8.3), the ship does
not simply lose its protection — it trades one kind of protection for
another, in the same instant. It stops being protected as a node's holder,
free to leave whenever it likes, and becomes protected as a **trapped** ship,
unable to leave at all. What it loses is its freedom and its income, not its
safety: it stays exactly where it is until the node retires, however long
that takes.

### 8.6 End-of-turn order

Everything that happens at the end of a turn happens in this order:

1. Each of the moving player's ships standing on a planet gains power — one,
   or two if it is the only one of that player's ships charging (section
   3.1) — up to the maximum of 6 (section 4.1).
2. The moving player collects energy for the charged nodes they hold
   (section 8.4).
3. Every charged node **carrying a countdown** spends one turn of it; any
   that runs out goes depleted, with an 11-turn countdown, and traps the
   ship standing on it (section 8.5).
4. Whatever shortfall there is against four charged is filled from the three
   inactive nodes, highest priority first.
5. If step 4 charged anything, the three inactive nodes are replaced
   together: whichever did not charge are discarded, and three new ones are
   drawn and dealt priorities 1, 2 and 3 at random (section 8.2). Otherwise,
   the three inactive nodes' priorities rotate: 1 becomes 2, 2 becomes 3, and
   3 becomes 1.
6. Every node **that was already depleted when this sequence began** — which
   includes a node depleted this turn by its holder walking off, and
   excludes a node only just depleted by step 3 above — spends one turn of
   its countdown; any that reaches zero **retires**: it leaves the board and
   nothing appears in its place. Any ship that was trapped on it is freed.
7. For each player in turn — the player who just moved, then their
   opponent — if **every** one of that player's ships is trapped, the game
   grants relief rather than leaving them to pass turn after turn: among the
   depleted nodes carrying those ships, only those whose ship **would have a
   legal move if freed** are considered, and the one among those with the
   **least remaining life** ends at once — retiring exactly as step 6
   retires a node, with nothing appearing in its place — and its ship is
   freed. If no depleted node under that player's ships qualifies, nothing
   happens, and that player's turn passes under section 5.

A turn that passes because no legal action was available (section 5) is still
a turn: this sequence runs for it in full, just as it would for a turn in
which an action was taken. Countdowns still tick, and a ship of the passing
player standing on a planet still gains power at the section 3.1 rate; the
passing player still collects exactly as they would if they had acted.

Step 5 sits **before** step 6 **deliberately**. A node placed by a refill
is inactive for the whole of the next turn and can first be charged at the
end of it, never sooner. Running the steps in the other order would let a
node retire in step 6 and have its very square reused by that same turn's
refill, collapsing a whole turn's wait into none — exactly the kind of
same-turn collapse this sequence exists to avoid.

Charging in step 4 from the priorities already on the board, rather than
from a fresh draw, is what makes the queue worth reading: the arrangement of
priorities a player looks at while taking their turn is exactly the
arrangement that governs the charge at the end of it, and the rotation or
refill in step 5 that follows is the next player's to plan against.

Step 2 sits **before** step 3 **deliberately**: energy is collected, then
depletion is checked, which is why a node held to the very end of its
countdown pays its holder a sixth time in the same instant it traps them
(section 8.3).

Step 7 runs **last of all**, after step 6, because it must see the board's
depleted set exactly as it stands once both step 3's new arrivals and step
6's retirements have happened — a node cannot be judged a candidate for
relief, or judged to have the least remaining life, on a picture of the
board that is still one step out of date.

A trap's countdown is symmetric about the turn it is entered: a node that
goes depleted in step 3 of turn N first spends a turn of its own countdown
in step 6 of turn N+1, never in the same turn it was created — which is what
step 6's "already depleted when this sequence began" is for. An exit node is
the one deliberate exception: created mid-turn by its holder walking off, it
is already depleted by the time this sequence runs, so step 6 catches it and
spends its first turn on the very turn it was created — exactly what section
8.3 requires of it.

A node's state changes only in this sequence, and never as part of resolving
an action — **except** that a charged node depletes the instant its holder
leaves it (section 8.3), which is why such a node is already depleted by the
time this sequence begins and is caught by step 6 rather than step 3. A
node's ending, and any refill that follows it, are otherwise both part of
this sequence, never part of resolving an action.

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

## Appendix B — Sizing the queue

The board carries **four** charged nodes and **three** inactive ones at all
times, plus however many happen to be depleted and counting down. Measured
over several hundred turns of sustained play, that count breathes between
**seven** and **eleven** — a charged node's own countdown and the depleted
node it can leave behind each run most of a dozen turns, so several are
often alive together, and the total sits nearer the top of that range more
often than the bottom — rather than fixed at a count the way the
twelve-node board once was.

A node's life is no longer a mix of drawn rates: a charged node lasts
**11 turns** once a ship steps on it, and **forever** if nobody does — a
board both players ignore never changes. A depleted node lasts 11 turns as a
**trap**, or 2 turns as an **exit**, and then retires either way. Turnover —
a node charging, a node depleting, a refill sweeping the queue — happens
only because the players use the nodes on the board (section 8.3); it is not
a clock the game runs on its own.

**An inactive node never waits more than three turns to reach the front of
the queue.** Rotation alone carries a node from priority 1 to priority 3 in
two turns, and it is swept before it can wait any longer than that: a queue
that goes unrotated for a whole cycle without a charge has, by definition,
had its 3 sitting at the front the entire time, available to charge every
turn. There is no version of this rule under which a node waits
unboundedly.

**The board is never short of four charged.** Because a move is one action
and a turn is one action, **at most one countdown can start per turn** —
so, since every countdown is the same length, **at most one node expires
per turn**. Add the one node a player can leave behind by walking off in the
same turn, and the shortfall against four charged is **never more than
two** — comfortably inside what the three inactive nodes always cover.
Every shortfall is filled on the turn it appears.

On an empty board the strict pool holds **51** squares and the widened pool
holds **79** (section 3.2). On a played board — closer to eleven nodes down
than seven, and a dozen ships on it — a refill's three draws pick from
roughly **25**, **38** and **34** squares respectively, the pool widening as
each draw lifts the one-square-in constraint and narrowing again as ships
and the nodes already placed this refill block squares of their own.

Both the node count above and the pool sizes here come from a stand-in for
play that starts a new countdown somewhere on the board every single turn
and never moves a ship. No real game turns nodes over that fast — a
countdown only starts when a player actually spends a turn's move landing
on a node — so these numbers are a ceiling: a real game's node count runs
lower than seven to eleven, and its pools run larger than 25, 38 and 34,
not smaller.

The weighting earns its keep: measured over several hundred turns of actual
play across a handful of seeds, the smallest pairwise gap within a freshly
refilled trio averages **4.78** squares, against **3.78** for an unweighted
draw from the same pools, computed the same run. About **1.11** of the three
land one square in from the edge and **0.14** in a corner region, against
**0.83** and **0.07** unweighted — the widening does push the second and
third draws outward, but the weighting keeps them from crowding the rim.

Section 3.2's fallback, which places a node without regard to spacing, is
even less likely to fire than it was at the old twelve-node count: there are
fewer nodes to place at once and a wider pool to place them in. Across
every placement in every run the app's own long-run test drives — every
opening deal and every refill, several hundred turns deep across a handful
of seeds — it has never once fired. It stays in the rules because it is
what makes placement total, not because it is expected to be seen.

**What the app guards:** that the queue is always exactly three nodes
carrying priorities 1, 2 and 3, one each; that the board is always back at
four charged by the end of every turn; that every node placed — the
opening deal's seven and a refill's three — is legal, under the right
pool, at the moment it appears; and that a freshly refilled trio comes out
measurably more spread than an unweighted draw from the same pools would.

These counts — the node count breathing between seven and eleven, the pool
sizes and the spread figures above — are first guesses to be play-tested and
retuned like every other number in this document.
