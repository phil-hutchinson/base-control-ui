# Base Control — Rules

**Rules version: 0.16**

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
pushed back to a bay on the edge of the board, stripped of their shields, and
rejoin the game from there.

A ship carries **shields**, which slow it down and do nothing else. Shields
are gained by sitting on a node, so the longer a ship holds one, the harder it
becomes to move and to leave. A ship holding a node cannot be attacked while
it holds it. A site that has burned out is a bad place to leave a ship: it
costs its owner energy and a shield every turn.

The game has three random elements: which site is charged next, which bays
the two ships in a fight are pushed back to, and how fast a node burns.

---

## 2. Words used in these rules

**Turn** — everything one player does before play passes to their opponent. A
turn is one action.

**Round** — one turn for each player. The game lasts for the number of
rounds chosen before play begins — 30, 50, 75 or 100 — and 30 is the
standard game (section 9).

**Action** — what a player does on their turn: move a ship, or attack with a
ship.

**Site** — one of the fixed positions on the board where a node can appear.
Sites never move; which of them is in play changes during the game.

**Node** — a site that is charged: the one a ship stands on to collect
energy. The board aims to keep five sites charged at any moment, though it
may fall short.

**Capacity** — how much a node has to give before it is spent. Every node
starts with the same 60.

**Drain** — how much of a node's capacity has been spent. It rises every
turn, faster while a ship is standing on the node.

**Pressure** — how long a site has been waiting to be charged. The longer it
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
- A ship that **ends a move** in a bay loses all its shields. Flying over an
  empty bay does nothing.

Bays are not owned. Either player's ships may use any bay.

### 3.2 Sites

There are **seventeen** sites. Every one is in the interior of the board —
never on the outer edge — and their positions are fixed for the whole game and
the same in every game:

| Row | Sites         |
| --- | ------------- |
| 2   | F2, J2        |
| 4   | B4, H4, N4    |
| 5   | E5, K5        |
| 8   | D8, H8, L8    |
| 11  | E11, K11      |
| 12  | B12, H12, N12 |
| 14  | F14, J14      |

Together with the bay table in section 3.1, this diagram is the whole board:

```
     A B C D E F G H I J K L M N O
 15  . . . # . . . # . . . # . . .
 14  # . . . . O . . . O . . . . #
 13  . . . . . . . . . . . . . . .
 12  . O . . . . . O . . . . . O .
 11  . . . . O . . . . . O . . . .
 10  # . . . . . . . . . . . . . #
  9  . . . . . . . . . . . . . . .
  8  . . . O . . . O . . . O . . .
  7  . . . . . . . . . . . . . . .
  6  # . . . . . . . . . . . . . #
  5  . . . . O . . . . . O . . . .
  4  . O . . . . . O . . . . . O .
  3  . . . . . . . . . . . . . . .
  2  # . . . . O . . . O . . . . #
  1  . . . # . . . # . . . # . . .

#  bay      O  site
```

**Symmetry.** The layout is a mirror image across column H and across row 8,
so a 180° rotation also maps it onto itself. It is deliberately **not**
symmetric across the diagonals: the fourteen bays cannot be diagonally
symmetric either — spacing fourteen bays every fourth square around a
56-square perimeter puts three on each horizontal edge and four on each
vertical — and the sites are placed partly by reference to the bays, so
requiring diagonal symmetry would fight the thing they are keyed to.

**Spacing.** No single legal move touches two or more sites — a property that
existed so that one move could never charge two nodes at once. As of version
0.11, nothing a ship does charges a site (section 8.2), so the property no
longer binds anything. The seventeen positions above still happen to satisfy
it, but that is now incidental rather than required: a future story that
revisits the layout is free to place sites closer together without breaking
any rule.

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

Every ship starts with 0 shields.

### 4.1 Shields

A ship carries between 0 and 4 shields. A shield is the weight a ship picks
up by holding a node: each one it carries takes away part of its movement
(section 6) — and with it, part of its attack range, since an attack travels
exactly as far as a move (section 7). It does nothing in a fight.

A ship gains **one shield** at the end of its owner's turn if it is standing on
a node, up to the maximum of 4. It **loses one shield** at the end of its
owner's turn if it is standing on a **dormant** site, down to the minimum
of 0. An **active** site does neither. Shields are stripped entirely when a
ship returns to a bay, whether that return is forced by a fight (section 7.1)
or chosen (section 7.2, section 3.1). A ship reduced to 0 shields is not
destroyed — it is simply at its fastest.

---

## 5. Turns and actions

Green takes the first turn, and the players alternate. On a turn a player takes
**one action**. Each action is either:

- **Move** one ship, or
- **Attack** with one ship.

A player must take as many of their turn's actions as are available. If a
player has no legal action at all, their turn passes. This should be
uncommon — a player always has at least five ships — but an action is not
always available: an attack reaches only as far as the attacker's shields
allow, and a ship holding a node has no attack available to it at all. The
rule is here so the game can never deadlock.

---

## 6. Movement

A ship moves in a **straight line**, orthogonally or diagonally. How far it may
go depends on how many shields it is carrying: each shield a ship sheds unlocks
a further option, and the options accumulate.

| Shields | Movement                                   |
| ------- | ------------------------------------------ |
| 4       | one square orthogonally                    |
| 3       | the above, plus one square diagonally      |
| 2       | the above, plus two squares orthogonally   |
| 1       | the above, plus two squares diagonally     |
| 0       | the above, plus three squares orthogonally |

So a ship with 4 shields has four squares it can reach, and a ship with none
has twenty.

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
a ship with 4 shields reaches only one square orthogonally and cannot strike
a diagonal at all, while a ship carrying no shields reaches three squares
orthogonally. Attacking is always the attacking player's choice; ships never
fight automatically.

Neither ship may be in a bay: a ship in a bay cannot attack, and cannot be
attacked. And neither ship may be standing on a **charged node**: a ship
holding a node cannot attack, and cannot be attacked. This is not only
protection — a ship holding a node has given up striking out while it stands
there. It applies to charged sites alone: a ship standing on an **active** or
a **dormant** site is an ordinary target, and fights and is fought exactly
like a ship on any other square (section 8.5).

**There is no winner.** Both ships — the attacker and the ship it attacked —
are returned to bays (section 7.1) stripped of every shield they carried, and
both squares are left empty. Shields do not enter into it: a 4-shield ship
and an unshielded one come out of a fight identically.

An attack is a **trade**: a player spends their own ship's position and
shields to take away their opponent's. It is worth making when the enemy ship
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
be within the ship's range and have a clear path. The ship loses all its
shields on arrival (section 3.1).

---

## 8. Nodes

### 8.1 The three states of a site

Every site is always in exactly one of three states:

- **Active** — eligible to be charged, producing nothing, and costing
  nothing.
- **Charged** — producing energy: a ship standing on it collects (section
  8.4) and gains shields (section 4.1), and can neither attack nor be
  attacked (section 7).
- **Dormant** — recovering after running out. Not eligible to be charged,
  producing nothing, and costing the player whose ship stands on it: energy
  (section 8.4) and a shield (section 4.1), at the end of each of that
  player's turns.

A site cycles active → charged → dormant → active.

The board **aims** to keep five sites charged at all times: at the end of
every turn it charges as many active sites as it takes to bring the charged
count back to five (section 8.2). If there are not enough active sites, it
charges what it can and simply runs short until the next turn.

**At the start of the game**, five sites are charged: **H8**, **E5**, **K5**,
**E11** and **K11**, all at drain 0 (section 8.3). The other twelve are
active. Nothing is dormant at the start.

Nothing needs to spread their expiries out by hand. Each of the five drains
at an independently drawn rate and is reached by ships at different turns, so
they spread apart on their own within the first few turns.

### 8.2 Charging a site

At the end of every turn, as many **active** sites as it takes to bring the
charged count back to five are chosen at random, one at a time. If fewer than
that are active, fewer are charged and the board runs below five until the
next turn. Charged nodes still run out on schedule whether or not the board
is at its five.

The draw does not look at occupancy: a site with a ship standing on it can be
charged like any other. That ship is holding a node from that moment — it
collects (section 8.4) and starts gaining shields (section 4.1) at the end of
its owner's next turn, exactly as if it had moved onto a node.

The choice is genuinely random, and neither player can see it coming — but it
is no longer an equal chance for every active site. An active site carries
**pressure**: it goes active at **1** and gains **1** at the end of every
turn it stays active, up to a maximum of **50**. Each active site's chance of
being drawn is its pressure as a share of the total pressure of all active
sites, so a site that has been waiting a long time is more likely to be
picked than one that has just cycled. Because pressure is never less than 1,
no active site can ever be excluded outright.

A dormant site **recovers** instead of simply cooling down. A node goes
dormant at its capacity, or a little past it — the drain draw that tips it
over may overshoot — and at the end of every turn subtracts an amount drawn
at random:

| Recovery | 4   | 5   | 6   | 7   | 8   | Average |
| -------- | --- | --- | --- | --- | --- | ------- |
| Dormant  | 10% | 25% | 30% | 25% | 10% | 6       |

When it reaches zero or below, it goes active, at 1 pressure, where it
becomes eligible to be charged. Recovery always starts from about the same
level, so it always takes about ten turns.

### 8.3 How long a node lives

A charged node has a **capacity** of 60 units and a **drain** that starts at
0 and rises at the end of every turn by an amount drawn at random. Which
distribution it draws from depends on whether a ship is standing on it at
that moment — either player's ship; it makes no difference whose:

| Node  | 1   | 2   | 3   | 4   | 5   | 6   | Average |
| ----- | --- | --- | --- | --- | --- | --- | ------- |
| Empty | 20% | 50% | 30% | —   | —   | —   | 2.1     |
| Held  | —   | —   | 10% | 40% | 30% | 20% | 4.6     |

A node runs its drain up whether or not any ship is standing on it — it just
runs up more than twice as fast when one is.

A node ends **one** way: when its drain reaches or passes capacity, it is
spent, and it goes dormant at the end of that turn and simply stops paying. A
ship left standing on it stays where it is (section 8.5). A ship that leaves
a node does not end it — the node simply reverts to the slower empty rate
and burns on. An empty node lasts about 28 turns; a held one
lasts about 13, and those two figures now bracket every node's life.

### 8.4 Energy

At the end of each player's turn, that player collects energy for the
charged nodes they are **standing on**, and then pays for the dormant sites
they are **standing on**. A site counts for either half only if one of that
player's ships is on it at that moment — flying across a node or a
dormant site and moving on neither collects nor costs anything.

| Sites counted | Energy |
| ------------- | ------ |
| 0             | 0      |
| 1             | 1      |
| 2             | 3      |
| 3             | 6      |
| 4             | 10     |
| 5             | 15     |

The charged nodes a player holds are priced off this table exactly as
before. Unlike charged nodes there is no limit on how many sites are dormant
at once — up to twelve of the seventeen can be, since at most five are
ever charged — so the dormant count is **capped at five** before it is
priced: six or seven dormant sites cost the same 15 that five do. The most a
turn can pay is 15, so the most a turn can cost is now exactly 15 too —
neither half of this section can outrun the other.

The two halves are applied in that order — collect, then pay — and
they are **not netted**. Holding nodes and sitting on dormant ones are
separately priced, and both are priced steeply: a player holding three
charged nodes while standing on two dormant sites collects 6 and then pays
3, for a net of **+3**, not the +1 that a net count of one node held would
have paid.

**A player's total energy never falls below zero.** Where a turn's penalty
is larger than the energy the player has, their total lands on 0 rather
than going negative.

### 8.5 Standing on a site that is not charged

Standing on an active or a dormant site is allowed and ordinary. A ship may
end a move on either, and may stay there for the rest of the game if its
owner likes — nothing about it obliges the owner to move it, or anything
else, on a later turn.

The two are no longer the same. An **active** site pays nothing and costs
nothing, so waiting on one for the charge draw is free. A **dormant** site
pays nothing and **costs**: an energy penalty (section 8.4) and a shield
(section 4.1) at the end of each of the owner's turns.

Neither an active nor a dormant site offers what a charged node offers: a
ship standing on one can be attacked like any other ship, and may attack
like any other ship (section 7).

The site's own cycle carries on underneath the ship. A dormant site recovers
and goes active on schedule regardless of what is standing on it, and an
active site is eligible for the charge draw whether or not a ship is
standing on it (section 8.2).

When a node runs out under the ship holding it (section 8.3), the ship
loses its protection at that same instant — it stops being a node, and so
stops being a refuge (section 7) — even though it does not start costing
anything straight away: the holder pays from the end of its owner's next
turn unless it leaves before then. The ship stays or leaves, exactly as its
owner prefers, and leaving now costs the node nothing.

### 8.6 End-of-turn order

Everything that happens at the end of a turn happens in this order:

1. Each of the moving player's ships standing on a charged node gains a
   shield, and each standing on a dormant site loses one (section 4.1).
2. The moving player collects energy for the charged nodes they hold and
   then pays for the dormant sites they occupy (section 8.4).
3. Every charged node adds its drain (section 8.3); any that reaches capacity
   goes dormant, and any ship standing on it keeps standing there, collecting
   nothing and, from the end of its owner's next turn, paying for it
   (section 8.4).
4. As many active sites as it takes to bring the board back to five charged
   are charged, drawn by pressure (section 8.2).
5. Every site still active gains a point of pressure, to the cap of 50
   (section 8.2).
6. Every site that was dormant **before this turn began** subtracts its
   recovery (section 8.2); any that reaches zero or below goes active, at 1
   pressure.

A turn that passes because no legal action was available (section 5) is still
a turn: this sequence runs for it in full, just as it would for a turn in
which an action was taken. The clocks still tick, and a ship of the passing
player standing on a charged node still gains its shield and one standing on
a dormant site still loses one; the passing player still collects and still
pays exactly as they would if they had acted.

Step 6 is last **deliberately**, for the same reason as before: it is what
makes a site spend at least one whole turn active before it can be charged. A
site that finishes recovering at the end of turn N goes active only after
that turn's charge draw has already run (step 4), so it is active for the
whole of turn N+1 and is first eligible in turn N+1's draw, at 1 pressure.
Running the steps in any other order would let a site go dormant → active →
charged inside a single end-of-turn sequence, and it would never be visibly
active at all.

Step 5 sits **after** the charge draw for the matching reason: a site is
drawn at the pressure it has held all turn, so its first appearance in a
draw is at weight 1, not 2.

The two clocks are symmetric about the turn a state is entered. A node
charged in step 4 of turn N first drains in step 3 of turn N+1, and a node
that goes dormant in step 3 of turn N first recovers in step 6 of turn N+1,
which is what step 6's "dormant before this turn began" is for: a node must
not drain or recover on the very turn it entered its new state.

A site's state changes only in this sequence, and never as part of resolving
an action.

---

## 9. Ending the game

The game ends after the number of rounds chosen before play begins —
**30, 50, 75 or 100 rounds**, that many turns each — with **30** the
standard game. The player with the most energy wins. Equal energy is a draw.

---

## Appendix A — Open items

Nothing is currently outstanding. The rules are expected to keep changing as
the game is built, so this appendix will list open items again when there are
any.

---

## Appendix B — Sizing the site pool

A node's life is now a mix of empty and held turns rather than a fixed
count, but the mix works out to roughly **twenty** turns, so the board
charges a site about every four turns. Recovery runs about ten turns, so
roughly two or three of the seventeen sites sit dormant at any moment, and
about nine or ten are active — the pool is comfortable.

Running short of five charged remains a **legal outcome**, not a failure the
pool must be sized to prevent — section 8.2 charges as many active sites as
it can and simply falls short when it has to. What the pool size still buys
is **randomness**: if only one or two sites are active when the charge draw
runs, the choice is nearly forced and players can predict it.

What is now worth checking is different from before: the **pressure cap
against the average wait**. A site waits something like forty turns between
cycles, against a cap of 50, so most of the pool sits below the cap and
pressure discriminates across the whole of it. A cap far below the average
wait would flatten the weighting back towards uniform — that is what to
check first whenever these numbers are retuned.

The app guards this with a test that the active pool stays comfortably
populated over a long run, that expiries stay spread rather than arriving
together, and that no site waits unboundedly long between cycles.
