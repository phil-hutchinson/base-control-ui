# Base Control — Rules

**Rules version: 0.25**

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
burn out and are replaced somewhere else, so the map itself redraws as the
game runs, and the squares worth racing for change over the course of a
game, not just which of them are lit.

The game has five random elements that shape every game — the opening
board itself, which node is charged next, where a new node appears when one
ends, which planet the two ships in a fight are pushed back to, and how fast
a node burns — plus a sixth, rarer one: when a trapped player's relief finds
two nodes tied for the least remaining life, which of them ends first
(section 8.6). No two games start on the same board, and neither player has
seen this one before.

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
lasts — when the node ends, a new one is drawn a square of its own,
somewhere else.

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
is placed uniformly among the squares that hold no node and are not a
planet. This is the whole of the relaxation, applied all at once rather than
one constraint dropped at a time, and it exists so that placement can never
fail. At twelve nodes it was not observed to fire even once in simulation —
neither at the opening deal, with the board otherwise empty or with all
twelve ships scattered through the interior blocking squares of their own,
nor at a mid-game replacement — so it is better read as the guarantee that
placement always succeeds than as something a player should expect to see.

**A replacement never appears on the square the node it replaces just
left.** The retiring node's own square is excluded from the draw, so a node
that ends always ends somewhere visibly different from where the next one
starts.

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
ship's power: a **charged** node does not drain it, a **depleted** node does
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
it land on a **depleted node**: flying **over** one is still free, exactly
like flying over any other square, but a move may not end there. The L
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
attacked. Only a ship on an **inactive** node — or on no node at all — is an
ordinary target, and fights and is fought exactly like a ship on any other
square (section 8.5).

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
same assurance section 8.2 gives for the charge draw.

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

- **Inactive** — eligible to be charged, producing nothing, and costing
  nothing.
- **Charged** — producing energy: a ship standing on it collects (section
  8.4) and can neither attack nor be attacked (section 7). It takes nothing
  from the ship holding it.
- **Depleted** — recovering after running out. Not eligible to be charged,
  producing nothing, and **trapping** any ship standing on it: that ship
  cannot move, and can neither attack nor be attacked (section 7), until the
  node retires.

A node cycles inactive → charged → depleted → **ends**. The instant a node
ends, a new inactive node appears somewhere else on the board (section 3.2).

The board **aims** to keep four nodes charged at all times: at the end of
every turn it charges as many inactive nodes as it takes to bring the
charged count back to four (section 8.2). If there are not enough inactive
nodes, it charges what it can and simply runs short until the next turn.

**The opening board is dealt.** The game opens with **twelve** nodes, at
twelve squares drawn under section 3.2:

- **Four of the twelve are charged**, at squares drawn at random with every
  legal square equally likely and no two the same. No square is privileged;
  the centre is not guaranteed.
- **Each of the four starts part-drained**, at a drain drawn from the opening
  drain table below — never more than 40, two-thirds of the capacity of 60
  (section 8.3), so every dealt node has enough life left to be worth racing
  for.
- **The other eight start inactive**, at a pressure drawn from the opening
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
until the next turn — with twelve nodes on the board and a target of four,
this is now the uncommon case rather than the likely one. Charged nodes
still run out on schedule whether or not the board is at its four.

The draw does not look at occupancy: a node with a ship standing on it can be
charged like any other. That ship is holding a node from that moment — it
collects (section 8.4) at the end of its owner's next turn, exactly
as if it had moved onto a node.

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
ship left standing on it is trapped there (section 8.5). A ship that leaves
a node does not end it — the node simply reverts to the slower empty rate
and burns on. An empty node lasts about 28 turns; a held one
lasts about 13, and those two figures now bracket every node's life.

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

### 8.5 Standing on a node that is not charged

Standing on an **inactive** node is allowed and ordinary. A ship may end a
move on one, and may stay there for the rest of the game if its owner likes —
nothing about it obliges the owner to move it, or anything else, on a later
turn.

A **depleted** node is different, and a ship is never there by choice: a move
may not end on one (section 6), so the only way a ship comes to be standing
on a depleted node is being caught there the instant the node it was holding
runs out beneath it (section 8.3). That ship is **trapped**: it cannot move,
and can neither attack nor be attacked (section 7), for as long as the node
stays depleted. It is released the moment the node retires — at which point
its square is no longer a node at all, but an ordinary square, and it is an
ordinary ship, free to move or attack like any other.

The two are not the same. An **inactive** node pays nothing and costs
nothing, so waiting on one for the charge draw is free. A **depleted** node
pays nothing and takes something harder to spare from the ship trapped on
it: its freedom. A **charged** node, by contrast, pays energy to the ship
holding it and takes nothing from it (section 8.1). None of the three states
touches a ship's power (section 4.1) at all — only a planet does.

Only an **inactive** node leaves a ship as an ordinary target: a ship
standing on one can be attacked like any other ship, and may attack like any
other ship (section 7). A ship trapped on a depleted node is out of combat in
both directions, exactly as a charged node's holder is, though it did not
choose to be.

A node's own cycle carries on underneath the ship. A depleted node recovers
towards retirement on schedule regardless of what is standing on it, and an
inactive node is eligible for the charge draw whether or not a ship is
standing on it (section 8.2). If the node underneath a ship retires, the
ship is untouched — it keeps its square and its power — but the square it
stands on is no longer a node at all, so from that instant it is an
ordinary square, and any ship trapped there is free.

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
3. Every charged node adds its drain (section 8.3); any that reaches capacity
   goes depleted, and any ship standing on it is **trapped** there (section
   8.5).
4. As many inactive nodes as it takes to bring the board back to four
   charged are charged, drawn by pressure (section 8.2).
5. Every node still inactive gains a point of pressure, to the cap of 50
   (section 8.2).
6. Every node that was depleted **before this turn began** subtracts its
   recovery (section 8.2); any that reaches zero or below **retires and is
   replaced**: it leaves the board, and a new inactive node appears
   somewhere else, at 1 pressure, drawn under section 3.2. Any ship that was
   trapped on it is freed.
7. For each player in turn — the player who just moved, then their
   opponent — if **every** one of that player's ships is trapped, the game
   grants relief rather than leaving them to pass turn after turn: among the
   depleted nodes carrying those ships, only those whose ship **would have a
   legal move if freed** are considered, and the one among those with the
   **least remaining life** ends at once — retiring and being replaced
   exactly as step 6 retires and replaces — and its ship is freed. If two or
   more qualifying nodes are tied on remaining life, one of them is chosen at
   random, with every tied node equally likely. If no depleted node under
   that player's ships qualifies, nothing happens, and that player's turn
   passes under section 5.

A turn that passes because no legal action was available (section 5) is still
a turn: this sequence runs for it in full, just as it would for a turn in
which an action was taken. The node clocks still tick, and a ship of the
passing player standing on a planet still gains power at the section 3.1
rate; the passing player still collects exactly as they would if they had
acted.

Step 6 is last among the ordinary steps **deliberately**, for the same
reason as before: it is what makes a node spend at least one whole turn
inactive before it can be charged. A node that appears — whether from the
opening deal or as a replacement in step 6 — is inactive for the whole of
the next turn and is first eligible in that next turn's draw, at 1 pressure.
A node that finishes recovering and is replaced at the end of turn N
produces a new node that is inactive for the whole of turn N+1, first
eligible in turn N+1's charge draw. Running the steps in any other order
would let a node retire, be replaced and be charged inside a single
end-of-turn sequence, and the replacement would never be visibly inactive at
all.

Step 5 sits **after** the charge draw for the matching reason: a node is
drawn at the pressure it has held all turn, so its first appearance in a
draw is at weight 1, not 2.

Step 7 runs **last of all**, after step 6, because it must see the board's
depleted set exactly as it stands once both step 3's new arrivals and step
6's retirements have happened — a node cannot be judged a candidate for
relief, or judged to have the least remaining life, on a picture of the
board that is still one step out of date.

The two clocks are symmetric about the turn a state is entered. A node
charged in step 4 of turn N first drains in step 3 of turn N+1, and a node
that goes depleted in step 3 of turn N first counts towards recovery in
step 6 of turn N+1, which is what step 6's "depleted before this turn began"
is for: a node must not drain or recover on the very turn it entered its new
state.

A node's state changes only in this sequence, and never as part of resolving
an action. A node's ending and its replacement's appearance are likewise
both part of this sequence, at step 6 or step 7, never part of resolving an
action.

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

The board carries **twelve** nodes at all times: one out, one in, whenever a
node retires. A node's life is a mix of empty and held turns rather than a
fixed count, but the mix works out to roughly **twenty** turns charged, and
recovery runs about **ten** more turns depleted before retirement — thirty
turns from birth to death. For four of the twelve to be charged at any
moment, a whole life runs about 20 × 12 / 4 ≈ **sixty** turns, of which
about **thirty** are spent waiting inactive: roughly 4 charged, 2 depleted
and 6 inactive at any moment, so a node charges about every **five** turns.

Running short of four charged remains a **legal outcome**, not a failure the
pool must be sized to prevent — section 8.2 charges as many inactive nodes
as it can and simply falls short when it has to. With roughly six of the
twelve nodes inactive at any moment, against a target of only four, this
stays the **uncommon** case rather than the likely one: the pool is
comfortable enough that the charge draw usually finds all the inactive
nodes it needs.

The pressure cap of 50 sits comfortably above the average inactive wait of
about thirty turns — the relationship it was originally set against — so
weighting by pressure still sharpens meaningfully rather than flattening
back towards uniform at the top end. What is worth checking first when
these numbers are next retuned is that relationship, and the size of the
inactive pool against the target of four charged.

These counts — twelve nodes, four charged, eight inactive at the deal — are
first guesses to be play-tested and retuned like every other number in this
document.

Section 3.2's fallback, which places a node without regard to spacing, was
not observed to fire at all at twelve nodes — not at the opening deal, and
not at a mid-game replacement. It stays in the rules because it is what
makes placement total, not because it is expected. It is the first thing
that would start firing if the node count rose against this pool: fifteen
nodes would reach it on roughly a fifth of deals, and a third of them with
every ship scattered through the interior.

The app guards this with a test that the inactive pool stays comfortably
populated over a long run, that expiries stay spread rather than arriving
together, and that no node waits unboundedly long between appearing and
being charged.

The opening deal (section 8.1) starts the board closer to this steady state
than an unweighted opening did, so the first twenty turns are no longer an
unrepresentative settling-in period.
