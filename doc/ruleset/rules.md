# Base Control — Rules

**Rules version: 0.11**

This document is the single source of truth for how Base Control is played.
The app implements what is written here; where the two disagree, this document
is right and the app has a bug.

---

## 1. Overview

Base Control is a two-player game played on a square board. Each player
commands a fleet of seven ships and competes to occupy the board's contested
nodes, collecting **energy** for every turn they hold one. The player with
the most energy when the game ends is the winner.

Ships are never destroyed. A ship that loses a fight is pushed back to a bay on
the edge of the board and rejoins the game from there.

A ship carries **shields**, which make it stronger in a fight but slower to
move. Shields are gained by sitting on a node and spent by winning fights, so a
ship's strength and its speed pull permanently against each other.

The game has two random elements: which site is charged next, and which bay
a beaten ship is pushed back to.

---

## 2. Words used in these rules

**Turn** — everything one player does before play passes to their opponent. A
turn is one action.

**Round** — one turn for each player. The game lasts 100 rounds.

**Action** — what a player does on their turn: move a ship, or attack with a
ship.

**Site** — one of the fixed positions on the board where a node can appear.
Sites never move; which of them is in play changes during the game.

**Node** — a site that is charged: the one a ship stands on to collect
energy. The board aims to keep five sites charged at any moment, though it
may fall short.

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

Each player has seven ships — one player **green**, the other **red**. Green
takes the first turn.

At the start of the game every bay holds one ship, and the two fleets alternate
around the edge. Starting clockwise from H15:

> H15 green, L15 red, O14 green, O10 red, O6 green, O2 red, L1 green,
> H1 red, D1 green, A2 red, A6 green, A10 red, A14 green, D15 red.

Because the bays are spaced evenly and there are fourteen of them, each
player's starting fleet is exactly the half-turn rotation of the other's, so
neither side begins with better ground.

Every ship starts with 0 shields.

### 4.1 Shields

A ship carries between 0 and 4 shields. Shields do two things, in opposite
directions: they decide who wins a fight (section 7), and each one a ship
carries takes away part of its movement (section 6) — and with it, part of
its attack range, since an attack travels exactly as far as a move
(section 7).

A ship gains **one shield** at the end of its owner's turn if it is standing on
a node, up to the maximum of 4. A ship reduced to 0 shields is not destroyed —
it is simply at its fastest and its weakest.

---

## 5. Turns and actions

Green takes the first turn, and the players alternate. On a turn a player takes
**one action**. Each action is either:

- **Move** one ship, or
- **Attack** with one ship.

A player must take as many of their turn's actions as are available. If a
player has no legal action at all, their turn passes. This should be
uncommon — a player always has seven ships — but an attack reaches only as
far as the attacker's shields allow, so an action is not always available;
the rule is here so the game can never deadlock.

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
onto its target. Winning a fight can still move the winning ship — see
section 7's advance, which is not a move.

A ship may not **end** a move on a site that is not charged (section 8.5). It
may fly over one freely.

---

## 7. Combat

A ship may attack an enemy ship within its **movement range** (section 6) —
the same distances, the same straight lines, and on the same terms: every
square the attack passes over must be empty, of either side's ships. The
target square is of course occupied, by the enemy ship, and the site it
stands on does not matter — a ship stranded on a site that is not charged
(section 8.5) can still be attacked. At the two extremes: a ship with 4
shields reaches only one square orthogonally and cannot strike a diagonal at
all, while a ship carrying no shields reaches three squares orthogonally.
Attacking is always the attacking player's choice; ships never fight
automatically. A ship may attack an enemy stronger than itself.

Neither ship may be in a bay: a ship in a bay cannot attack, and cannot be
attacked.

The ship with **more shields wins**. The loser is returned to a bay
(section 7.1) with 0 shields. The winner survives, but the fight costs it
shields — **one more than the loser was carrying**:

> winner's remaining shields = winner's shields − (loser's shields + 1)

So a 4-shield ship that beats a 2-shield ship comes out of it with 1, and even
beating an unshielded ship costs a shield.

**The winner advances.** Only an attacking winner does — a winning defender
holds its ground. The attacker advances along the line it
attacked down, to the furthest square, working back from the square the
loser has left, that it may legally end on. "May legally end on" is section
6's restriction and nothing else — not a site that is not charged
(section 8.5). The winner also cannot cross a square another ship occupies:
if the beaten ship's bay (section 7.1) lies on the lane, it blocks the
advance there, and the winner stops short of it. In the ordinary case that is
simply the loser's own square, and the winner takes it. If no square on the
lane is one it may legally end on, the winner holds its ground instead.

If both ships carry **the same number of shields**, both are returned to bays
with 0 shields. The attacker is placed first, then the defender, and both
squares are left empty.

Because a fight always costs the winner more shields than the loser was
carrying, attacking a nearly-equal opponent leaves the winner badly exposed.
Attacking a much weaker ship is cheap.

And because the winner advances, driving an enemy off a node and taking it
can now be a single action: a won fight can take a node outright. Heavy
shields buy strength at the cost of reach, so the ship most likely to win a
fight is the one least able to start one at a distance.

### 7.1 Returning to a bay

A returning ship goes to a bay chosen **at random** from the bays that are
**empty at that moment**, every empty bay equally likely.

The choice is genuinely random, and neither player can see it coming — the
same assurance section 8.2 gives for the charge draw.

A returning ship is placed **immediately**, as part of resolving the fight,
before anything else happens. When both ships return, the attacker is placed
first, and the defender's bay is then drawn from the bays still empty. Which
ship is placed first makes no difference to the odds, but fixing the order is
what lets a recorded game replay exactly.

There is always somewhere to go: a ship being returned was by definition on the
board and not in a bay, so at least one bay is empty. The same argument covers
the case above, where two ships return from one fight: both were by
definition on the board and not in a bay, so at least two bays are empty, and
the attacker's placement can never leave the defender without one.

### 7.2 Returning by choice

A ship may also go back to a bay deliberately. This is not a special action —
it is an ordinary move that ends on an empty bay, and like any move it must
be within the ship's range and have a clear path. The ship loses all its
shields on arrival (section 3.1).

---

## 8. Nodes

### 8.1 The three states of a site

Every site is always in exactly one of three states:

- **Active** — eligible to be charged, but producing nothing. A ship may not
  end a move here.
- **Charged** — producing energy. A ship may end a move here, collect from
  it (section 8.4) and gain shields on it (section 4.1).
- **Dormant** — cooling down after running out. Not eligible to be charged. A
  ship may not end a move here.

A site cycles active → charged → dormant → active.

The board **aims** to keep five sites charged at all times: at the end of
every turn it charges as many active sites as it takes to bring the charged
count back to five (section 8.2). If there are not enough active sites, it
charges what it can and simply runs short until the next turn.

**At the start of the game**, five sites are charged: **H8**, **E5**, **K5**,
**E11** and **K11**. The other twelve are active. Nothing is dormant at the
start.

Their clocks are **staggered**, so they do not all run out on the same turn:

| Site | Runs out at the end of turn |
| ---- | --------------------------- |
| K5   | 2                           |
| E11  | 4                           |
| K11  | 5                           |
| E5   | 7                           |
| H8   | 9                           |

Five nodes charged together would run out together, be replaced together, and
leave the whole board pulsing in lockstep for the rest of the game — nothing
in the cycle would ever break that up on its own. Staggering the opening five
spreads their expiries once, and because each replacement's clock starts when
its predecessor runs out, that spread then holds for the whole game with no
further rule. This staggered opening is expected to be revisited by a later
story.

### 8.2 Charging a site

At the end of every turn, as many **active** sites as it takes to bring the
charged count back to five are chosen at random, one at a time, each equally
likely. If fewer than that are active, fewer are charged and the board runs
below five until the next turn. Charged nodes still run out on schedule
whether or not the board is at its five.

The choice is genuinely random, and neither player can see it coming.

A dormant site cools down for **nine turns** and then goes active, where it
becomes eligible to be charged.

### 8.3 How long a node lives

A site charged at the end of turn N is charged for turns **N+1 to N+9** —
nine turns during which a ship can stand on it and collect energy.

A node appears at the same moment for both players, and neither is any closer
to it in time than the other. A player who reaches it on the first of its
nine turns and holds it for all of them collects from it **five times**.

A node runs its clock down whether or not any ship is standing on it.

### 8.4 Energy

At the end of each player's turn, that player collects energy for the
charged nodes they are **standing on**. A node counts only if one of that
player's ships is on it at that moment — flying across a node and moving on
collects nothing.

| Charged nodes held | Energy |
| ------------------ | ------ |
| 0                  | 0      |
| 1                  | 1      |
| 2                  | 3      |
| 3                  | 6      |
| 4                  | 10     |
| 5                  | 15     |

### 8.5 Active and dormant sites

A ship may not **end a move** on an active or a dormant site, though it may
fly over either freely.

The one way a ship ends up on a dormant site is by holding a node until its
clock runs out underneath it. That ship is **stranded**, and on their next
turn its owner must spend an action moving it clear. A ship still standing
there nine turns later, when the site finishes cooling down and goes active,
is equally stuck — section 6 forbids ending a move on either state — and stays
stranded on the same terms.

That is a restriction on what an action may be, not a penalty on top of one:
while any ship still owes an action, each action of the turn must free one.
A player frees as many stranded ships as their turn has actions; the rest
wait for a later turn.

If a stranded ship has no legal move at all, the requirement is simply waived —
the player is not obliged to attack blockers or shuffle friendly ships out of
the way, and the ship may sit where it is.

This is the tail cost of holding a node. Nodes charged on the same turn run
out on the same turn, so a player holding several of them owes an action for
each ship left standing on the site it ran out under.

### 8.6 End-of-turn order

Everything that happens at the end of a turn happens in this order:

1. Each of the moving player's ships standing on a charged node gains a
   shield.
2. The moving player collects energy (section 8.4).
3. Charged nodes that have finished their nine turns become dormant,
   stranding any ship left on them.
4. As many active sites as it takes to bring the board back to five charged
   are charged (section 8.2).
5. Dormant sites that have finished cooling down become active.

A turn that passes because no legal action was available (section 5) is still
a turn: this sequence runs for it in full, just as it would for a turn in
which an action was taken. The clocks still tick, and a ship of the passing
player standing on a charged node still gains its shield.

Step 5 is last **deliberately**. It is what makes a site spend at least one
whole turn active before it can be charged: a site that finishes cooling at
the end of turn N goes active only after that turn's charge draw (step 4), so
it is active for the whole of turn N+1 and is first eligible in turn N+1's
draw. Running the steps in any other order would let a site go dormant →
active → charged inside a single end-of-turn sequence, and it would never be
visibly active at all.

---

## 9. Ending the game

The game ends after **100 rounds** — 100 turns each. The player with the most
energy wins. Equal energy is a draw.

---

## Appendix A — Open items

Nothing is currently outstanding. The rules are expected to keep changing as
the game is built, so this appendix will list open items again when there are
any.

---

## Appendix B — Sizing the site pool

A charged node lasts nine turns and a dormant one cools down for nine turns,
so a site is unavailable for eighteen turns from the moment it is charged.
The board aims to keep five sites charged at all times, so at the fastest
possible rate it charges a site roughly every 1.8 turns, and roughly five
sites sit dormant at any moment. That leaves about ten of the seventeen-site
pool committed, and about **seven** active.

Running short of five charged is now a **legal outcome**, not a failure the
pool must be sized to prevent — section 8.2 charges as many active sites as
it can and simply falls short when it has to. What the pool size still buys
is **randomness**: if only one or two sites are active when the charge draw
runs, the "random" choice is nearly forced and players can predict it. Sizing
the pool so that several sites are always active is what keeps section 8.2
honest, and seventeen sites leaving roughly seven active is the margin this
depends on.

Whenever the nine-turn figures or the target of five charged sites change,
this arithmetic has to be redone. The app guards this with a test that the
active pool stays comfortably above one over a long run, not that it never
empties.
