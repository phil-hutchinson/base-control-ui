# Base Control — Rules

**Rules version: 0.12**

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

The game has three random elements: which site is charged next, which bay a
beaten ship is pushed back to, and how fast a node burns.

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

When the loser's own square is a charged node, the winner's advance onto it
means **the node changes hands intact**: the attacker takes the square the
instant the fight resolves, so the node is never left unoccupied and keeps
the drain it already had (section 8.7). A drawn fight and a blocked advance
leave the node empty instead — see section 8.7 for both.

If both ships carry **the same number of shields**, both are returned to bays
with 0 shields. The attacker is placed first, then the defender, and both
squares are left empty. If either was a charged node, it is left unoccupied
and goes dormant (section 8.7).

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
**E11** and **K11**, all at drain 0 (section 8.3). The other twelve are
active. Nothing is dormant at the start.

Nothing needs to spread their expiries out by hand. Each of the five drains
at an independently drawn rate, is reached by ships at different turns, and
can be ended early by a ship stepping off it (section 8.7), so they spread
apart on their own within the first few turns.

### 8.2 Charging a site

At the end of every turn, as many **active** sites as it takes to bring the
charged count back to five are chosen at random, one at a time. If fewer than
that are active, fewer are charged and the board runs below five until the
next turn. Charged nodes still run out on schedule whether or not the board
is at its five.

The choice is genuinely random, and neither player can see it coming — but it
is no longer an equal chance for every active site. An active site carries
**pressure**: it goes active at **1** and gains **1** at the end of every
turn it stays active, up to a maximum of **50**. Each active site's chance of
being drawn is its pressure as a share of the total pressure of all active
sites, so a site that has been waiting a long time is more likely to be
picked than one that has just cycled. Because pressure is never less than 1,
no active site can ever be excluded outright.

A dormant site **recovers** instead of simply cooling down. It goes dormant
carrying whatever drain it had (section 8.3), and at the end of every turn
subtracts an amount drawn at random:

| Recovery | 4   | 5   | 6   | 7   | 8   | Average |
| -------- | --- | --- | --- | --- | --- | ------- |
| Dormant  | 10% | 25% | 30% | 25% | 10% | 6       |

When it reaches zero or below, it goes active, at 1 pressure, where it
becomes eligible to be charged. From a full 60 that takes about ten turns; a
node ended early comes back sooner, in proportion to how much of it was
left when it went dormant.

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

When drain reaches or passes capacity, the node is spent: it goes dormant at
the end of that turn, stranding any ship left on it exactly as before
(section 8.5). An empty node lasts about 28 turns; a held one lasts about 13.
Holding a node is what uses it up. Section 8.7 covers the other way a node
ends: leaving it.

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
capacity runs out underneath it (section 8.3) — leaving a node ends it too
(section 8.7), but the ship that left is by definition no longer on it. A
ship left standing on a node that ran out under it is **stranded**, and on
their next turn its owner must spend an action moving it clear. A site
finishes recovering and goes active about ten turns after a full node ran
out, sooner if it was ended early (section 8.2). A ship still standing there
when that happens is equally stuck — section 6 forbids ending a move on
either state — and stays stranded on the same terms.

That is a restriction on what an action may be, not a penalty on top of one:
while any ship still owes an action, each action of the turn must free one.
A player frees as many stranded ships as their turn has actions; the rest
wait for a later turn.

If a stranded ship has no legal move at all, the requirement is simply waived —
the player is not obliged to attack blockers or shuffle friendly ships out of
the way, and the ship may sit where it is.

This is the tail cost of holding a node. Nodes drain at independently drawn
rates, so a player holding several of them pays for them one at a time as
each runs out under its own ship, rather than all at once.

### 8.6 End-of-turn order

Everything that happens at the end of a turn happens in this order:

1. Each of the moving player's ships standing on a charged node gains a
   shield.
2. The moving player collects energy (section 8.4).
3. Every charged node adds its drain (section 8.3); any that reaches capacity
   goes dormant, stranding any ship left on it.
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
player standing on a charged node still gains its shield.

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
that goes dormant in step 3 of turn N — or mid-turn, by the vacating rule
(section 8.7) — first recovers in step 6 of turn N+1, which is what step 6's
"dormant before this turn began" is for: a node must not drain or recover on
the very turn it entered its new state.

### 8.7 Leaving a node ends it

**A charged node that is occupied goes dormant the moment it becomes
unoccupied.** It happens immediately, as part of resolving the action that
vacates it, not at the end of the turn, and the node carries its drain into
dormancy exactly as if it had reached capacity on its own.

The consequences follow from that one sentence:

- A ship that **moves off** a node ends it. Holding a node and then leaving
  is a choice to spend it.
- A ship **pushed off** a node after losing a fight it started ends it too.
- A **drawn fight** over a node ends it: both ships go to bays (section 7),
  so the node is left empty.
- A **defender beaten on a node does not end it.** The attacker advances onto
  the square as part of resolving the fight (section 7), so the node is
  never unoccupied, and it stays charged with its drain untouched. This is
  the case the rule is shaped around: a node changes hands intact.
- If the attacker's **advance is blocked** — section 7's case where the
  beaten ship's own return bay lands on the lane — the node **is** left
  empty, and it goes dormant like any other.

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
