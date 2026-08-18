# Base Control — Rules

**Rules version: 0.5**

This document is the single source of truth for how Base Control is played.
The app implements what is written here; where the two disagree, this document
is right and the app has a bug.

Some details are still being settled. Anything not yet decided is listed in
[Appendix A](#appendix-a--open-items), and marked **TBD** where it appears in
the text.

---

## 1. Overview

Base Control is a two-player game played on a square board. Each player
commands a fleet of seven ships and competes to occupy the board's contested
nodes, collecting **influence** for every turn they hold one. The player with
the most influence when the game ends is the winner.

Ships are never destroyed. A ship that loses a fight is pushed back to a bay on
the edge of the board and rejoins the game from there.

A ship carries **shields**, which make it stronger in a fight but slower to
move. Shields are gained by sitting on a node and spent by winning fights, so a
ship's strength and its speed pull permanently against each other.

The game has one random element: which node site wakes up next.

---

## 2. Words used in these rules

**Turn** — everything one player does before play passes to their opponent. A
turn is two actions.

**Round** — one turn for each player. The game lasts 100 rounds.

**Action** — one of the two things a player does on their turn: move a ship, or
attack with a ship.

**Site** — one of the fixed positions on the board where a node can appear.
Sites never move; which of them is in play changes during the game.

**Node** — a site that is in play: one that is active or charged. Exactly
five sites are active or charged at any moment.

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

**Spacing.** No single legal move may touch two sites. The square a move
starts from does not count towards this: a ship can only ever be standing on
a site that is already charged or depleted, since section 6 forbids ending a
move on a dormant or depleted site and section 8.5 makes a site that wakes
underneath a ship charged immediately — so a move can never wake the square
it departs from. This is the property any layout of sites must satisfy; the
seventeen listed above already satisfy it.

Under the movement ranges in section 6 as they stand today, this works out as
a derived numeric requirement: sites must be at least **three** squares apart
on an orthogonal line and at least **two** apart on a diagonal. Those numbers
are not the rule — the property above is — and they must be recomputed if the
movement ranges in section 6 ever change.

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

Every ship starts with **0 shields (TBD)**.

### 4.1 Shields

A ship carries between 0 and 4 shields. Shields do two things, in opposite
directions: they decide who wins a fight (section 7), and each one a ship
carries takes away part of its movement (section 6).

A ship gains **one shield** at the end of its owner's turn if it is standing on
a node, up to the maximum of 4. A ship reduced to 0 shields is not destroyed —
it is simply at its fastest and its weakest.

---

## 5. Turns and actions

Green takes the first turn, and the players alternate. On a turn a player takes
**two actions**. Each action is either:

- **Move** one ship, or
- **Attack** with one ship.

A ship may be moved **at most once per turn**. There is no other restriction: a
player may move two different ships, move a ship and attack with it (in either
order), attack with two different ships, or attack twice with the same ship.

A player must take both actions if two are available, and one if only one is.
If a player has no legal action at all, their turn passes. In practice this
should never happen — a player always has seven ships, and attacking is legal
even when it is a losing move — but the rule is here so the game can never
deadlock.

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

Moving and attacking are entirely separate. A ship never attacks by moving onto
its target, and never moves as a result of attacking (section 7).

A ship may not **end** a move on a dormant or depleted site (section 8.5). It
may fly over one freely.

---

## 7. Combat

A ship may attack an enemy ship standing next to it — any of the eight
surrounding squares, diagonals included. Attacking is always the attacking
player's choice; ships never fight automatically. A ship may attack an enemy
stronger than itself.

An attack reaches further than a heavily shielded ship can move. A ship with 4
shields can only step one square orthogonally, but it can still strike any of
the eight squares around it.

Neither ship may be in a bay: a ship in a bay cannot attack, and cannot be
attacked.

The ship with **more shields wins**. The loser is returned to a bay
(section 7.1) with 0 shields. The winner survives, but the fight costs it
shields — **one more than the loser was carrying**:

> winner's remaining shields = winner's shields − (loser's shields + 1)

So a 4-shield ship that beats a 2-shield ship comes out of it with 1, and even
beating an unshielded ship costs a shield.

**Neither ship moves.** The winner holds its ground — it does not advance onto
the square the loser has left, and that square is simply empty afterwards.
Winning a fight clears ground; it does not take it.

If both ships carry **the same number of shields**, both are returned to bays
with 0 shields. The attacker is placed first, then the defender, and both
squares are left empty.

Because a fight always costs the winner more shields than the loser was
carrying, attacking a nearly-equal opponent leaves the winner badly exposed.
Attacking a much weaker ship is cheap.

And because the winner stays put, driving an enemy off a hub does not put you
on it. Claiming the square takes a second action. Whether the attacking ship
can be the one to claim it depends on where it struck from — an attack reaches
all eight neighbours, but a heavily shielded ship cannot move diagonally to
follow it up. The shields burned in the fight may be exactly what unlocks the
move it needs.

### 7.1 Returning to a bay

Bays are numbered fresh each turn. One bay is **return position 1** for the
current turn; the rest are numbered 2, 3, 4 and so on, counting **clockwise**
around the board. A returning ship goes to the **first empty bay** in that
order.

On the first turn of the game, return position 1 is **H15**. At the end of
every turn it moves **one bay counter-clockwise**, so it works its way around
the board and returns to where it started every seven rounds.

A returning ship is placed **immediately**, as part of resolving the fight, so
it is already in its bay before the attacking player's second action. When both
ships return, the attacker is placed first and the defender then takes the next
empty bay.

There is always somewhere to go: a ship being returned was by definition on the
board and not in a bay, so at least one bay is empty.

### 7.2 Returning by choice

A ship may also go back to a bay deliberately. This is not a special action —
it is an ordinary move that ends on an empty bay, and like any move it must
be within the ship's range and have a clear path. The ship loses all its
shields on arrival (section 3.1).

---

## 8. Nodes

### 8.1 The four states of a site

Every site is always in exactly one of four states:

- **Dormant** — not in play.
- **Active** — in play, but nothing has reached it yet.
- **Charged** — in play and producing influence.
- **Depleted** — finished, and cooling down before it can be used again.

Exactly **five** sites are active or charged at any moment. A site cycles
dormant → active → charged → depleted → dormant.

**At the start of the game**, five sites are active: **H8**, **E5**, **K5**,
**E11** and **K11**. The other twelve are dormant. Nothing is charged or
depleted at the start: a site only becomes charged when a ship touches it
(section 8.2), and its nine-turn clock only starts on the turn it was woken
(section 8.3) — a charged site at the start of the game would have no waker
and no clock start.

### 8.2 Waking a node

A site that is **active** becomes **charged** the moment a ship touches it —
either by landing on it or by flying over it during a move. It does not
matter which player's ship, and the ship does not have to stop.

This means a node can be woken by a ship that has no intention of holding it.
Waking a node starts its clock whether or not anyone benefits.

### 8.3 How long a node lives

A charged node stays charged for **nine turns**, counting the turn on which
it was woken.

That number is chosen so that a player who wakes a node and then sits on it
collects influence from it **five times** — and so that when it finally runs
out, it is the _opponent_ who takes the next turn and so sees the replacement
node first.

A node runs its clock down whether or not any ship is standing on it.

Note the consequence: the clock belongs to whoever woke the node. A player who
takes a node their opponent woke can only ever collect from it four times.

### 8.4 Influence

At the end of each player's turn, that player collects influence for the
charged nodes they are **standing on**. A node counts only if one of that
player's ships is on it at that moment — flying across a node and moving on
collects nothing.

| Charged nodes held | Influence |
| ------------------ | --------- |
| 0                  | 0         |
| 1                  | 1         |
| 2                  | 3         |
| 3                  | 5         |
| 4                  | 7         |
| 5                  | 9         |

### 8.5 Depleted and dormant sites

A ship may not **end a move** on a dormant or depleted site, though it may
fly over one.

The one way a ship ends up on a depleted site is by holding a node until its
clock runs out underneath it. That ship is **stranded**, and on their next
turn its owner must spend an action moving it clear. A ship still standing
there nine turns later, when the site finishes cooling down and goes dormant,
is equally stuck — section 6 forbids ending a move on either state — and stays
stranded on the same terms.

That is a restriction on what an action may be, not a penalty on top of one.
The freeing move is the **first action** of the turn: while any ship still
owes one, each action in turn must free one, and only once none remain does
the rest of the turn belong to the player. With one ship stranded, the first
action frees it and the rest of the turn is the player's: they may attack with
the ship they have just freed, move a different ship, or do anything else
that is legal. With two ships stranded, both actions go to clearing them.
With three or more, the player clears two of their choice and the rest wait
for the following turn.

If a stranded ship has no legal move at all, the requirement is simply waived —
the player is not obliged to attack blockers or shuffle friendly ships out of
the way, and the ship may sit where it is.

This is the tail cost of holding a node. A player who wakes several nodes on
the same turn will find them all running out on the same turn, and will owe an
action for each ship left standing on a dormant or depleted site.

If a site somehow wakes underneath a ship — only possible when that ship has
been unable to move off it — it becomes charged immediately and its clock
starts at once.

### 8.6 Waking a replacement

When a charged node runs out, one **dormant** site is chosen at random and
wakes, so that five sites are always active or charged.

The choice is genuinely random, and neither player can see it coming.

A depleted site cools down for **nine turns** and then goes back to dormant,
where it becomes eligible to be chosen again.

### 8.7 End-of-turn order

Everything that happens at the end of a turn happens in this order:

1. Each of the moving player's ships standing on a charged node gains a
   shield.
2. The moving player collects influence (section 8.4).
3. Sites that have finished cooling down go from depleted to dormant.
4. Charged nodes that have finished their nine turns become depleted.
5. A replacement site wakes for each node that just ran out.
6. The bay return position moves one bay counter-clockwise (section 7.1).

A turn that passes because no legal action was available (section 5) is still
a turn: this sequence runs for it in full, just as it would for a turn in
which both actions were taken. The clocks still tick, and a ship of the
passing player standing on a charged node still gains its shield.

Steps 3 and 5 are in that order deliberately: sites are returned to the
dormant pool _before_ the pool is drawn from, which is what keeps a
replacement always available.

Should the dormant pool ever be empty when a replacement is needed, the site
that has been depleted longest goes back to dormant first. This is a safety
net that a correctly sized board never needs; see [Appendix B](#appendix-b--sizing-the-site-pool).

---

## 9. Ending the game

The game ends after **100 rounds** — 100 turns each. The player with the most
influence wins. Equal influence is a draw.

---

## Appendix A — Open items

These are the parts of the game not yet settled. Each will be decided in its
own story.

| #   | Item                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Starting shields.** Currently 0 for every ship. Likely to vary by starting bay; if it does, bays a half-turn apart must match, or the opening stops being symmetric. |

It is best settled once there is a board on screen to look at, so it waits on
the early stories rather than blocking them.

---

## Appendix B — Sizing the site pool

A charged node lasts nine turns and a depleted one cools down for nine turns,
so a site is unavailable for eighteen turns from the moment it is woken. Five
sites are active or charged at all times, so at the fastest possible rate the
board consumes a replacement every 1.8 turns, and roughly five sites sit
depleted at any moment. That leaves about ten of the seventeen-site pool
committed, and about **seven** dormant.

The pool therefore needs to be comfortably larger than the ten sites
committed at any moment — but the binding constraint is not safety, it is
randomness. If only one site is dormant when a replacement is needed, the
"random" choice is forced and players can predict it. Sizing the pool so that
several sites are always dormant is what keeps section 8.6 honest, and
seventeen sites leaving roughly seven dormant is the margin this depends on.

Whenever the nine-turn figures or the number of nodes change, this arithmetic
has to be redone. The app must guard this: a test should play out adversarial
waking patterns and assert the dormant pool never runs dry.
