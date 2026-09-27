# Base Control — Steal

_This document is part of the Base Control ruleset, versioned by
[rules.md](rules.md). It carries no version number of its own. It holds the
node rules of the **steal** playstyle; everything else about the game is
[rules.md](rules.md)'s._

## 1. What steal is

Steal is one of the four **node playstyles** (rules.md §8.2). It replaces
rules.md section 8's node rules entirely, and changes nothing else about the
game. The charged-node choice (rules.md §8.1) still sets how many nodes the
game has — five, four or three — it just no longer means how many are
charged at any one moment, because that number rises and falls as the two
players take and lose nodes.

## 2. A node is a signal with two squares

Under steal, a node is not a single square that comes into being, runs down
and ends. Each node is dealt a **signal** of its own, and always occupies
exactly **two squares** on the board — its squares carry that signal, which
is the only thing tying them together. The app shows each signal as a
colour, so a node's two squares always look alike. Under the advanced
planet bonus setting, a node may carry a third square, its **extra**
prospective square (section 10).

A node is always in exactly one of two configurations, or a third when it
carries an extra (section 10):

|                                    | Charged squares | Prospective squares |
| ---------------------------------- | --------------- | ------------------- |
| **Open** — how every node is dealt | 0               | 2                   |
| **Held**                           | 1               | 1                   |
| **Open**, carrying an extra        | 0               | 3                   |
| **Held**, carrying an extra        | 1               | 2                   |

A **charged** square works exactly as rules.md describes a charged node
working: a ship standing on it collects energy (rules.md §8.4) and can
neither attack nor be attacked (rules.md §7). A **prospective** square
produces nothing and protects nothing; it shows three rings, the same three
rings an inactive node shows under the other playstyles, in the node's
colour.

Every node is dealt **Open**. The opening board therefore carries no charged
square at all: nobody scores until a ship reaches one.

## 3. Claiming a node

A ship **lands on a prospective square** — of any node, whether that node is
unheld, held by the opponent, or held by the landing ship's own side. This
is the only way into a node: a charged square always has its holder standing
on it, so it can never be landed on.

1. That square becomes the node's **charged** square, with the landing ship
   on it.
2. If the node already had a charged square, that square **becomes ordinary
   board on the spot**. A ship standing there — of either side — is left on
   an ordinary square, free to move on its own next turn like any other.
3. The node's other square, whichever it was, is discarded, and **one fresh
   prospective square is drawn** for the node (section 6).

The node is Held afterwards, wherever it stood before. This one rule covers
three things at once: claiming a node nobody held, taking a node away from
the opponent, and a holder relocating its own node out of reach — which
costs the holder a whole turn and a move, and leaves the node's new
prospective square drawn afresh, exactly as taking it from an opponent
would. Under the advanced planet bonus setting, a node with an extra
prospective square is claimed a little differently (section 10).

## 4. Leaving a node

A ship **moves off a charged square**, without landing on that same node's
own prospective square:

1. The vacated square becomes ordinary board, leaving nothing behind.
2. The node draws **a second prospective square** (section 6).

Under the advanced planet bonus setting, a node's extra prospective square,
if it has one, survives leaving alongside this second square (section 10).

The node is Open afterwards: the next ship to reach either of its two
prospective squares takes it.

## 5. When one move does both

A ship may leave one node's charged square and land on a different node's
prospective square in the same move. **Leaving comes first**: the node left
behind draws its second prospective square, and only then is the node landed
on claimed and given its fresh one. A ship's own node's prospective square is
the one exception — landing there is a **relocation**, not a leaving, and the
claim rule of section 3 alone applies, drawing one fresh prospective square.

## 6. Where a prospective node is drawn

A prospective square is legal wherever rules.md §3.2 allows a node, with
constraints 3 and 4 both lifted — the same widened pool the third square of
a rules.md §8.2 refill draws from today, fallback included. A prospective
square may therefore appear anywhere that holds no node, holds no ship, is
not adjacent to a node, and is not a planet or beside one — the outer edge
and the corners included. The one exception is the opening deal's second
square, which section 7 draws from the **strict** pool instead, wherever the
board leaves room.

The draw is weighted. For a candidate square `s`, with `a` the node's
**anchor** — its charged square when it has one, and its remaining
prospective square when it does not (section 10 gives the anchor of a node
that carries an extra prospective square, which this does not cover) — and
with `S` every square belonging to any **other** node, charged or
prospective alike:

    w(s) = d(s, a) + min over x in S of d(s, x)

where `d` is Chebyshev distance, as rules.md §3.2 defines it. When `S` is
empty — only the very first node of the opening deal — the second term is 0.

**A square on the outer edge has its weight halved** — row 1 or 15, column A
or O. `d(s, a)` is never below 2 in the ordinary pool, because an adjacent
square is illegal there, and never below 1 even in rules.md §3.2's own
fallback, so `w` is always positive without needing a positivity floor of
the kind that formula carries.

The first term is the control, and it can range up to 14: it pushes a
node's new prospective square a long way from the node itself, so a steal
is a real relocation rather than a shuffle. The second term, ranging about
2 to 5, is deliberately the smaller of the two — a prop-up for a square in
an otherwise empty region of the board, expected to be irrelevant most of
the time.

## 7. The opening deal

The opening board carries no charged square: every node is dealt Open.

Each node's **first** prospective square is drawn the way rules.md §8.1
deals the opening board's charged squares — uniformly at random from rules.md
§3.2's **strict** pool, one node at a time, every legal square equally
likely, each draw seeing the squares already placed. Once every node's first
square is down, each node's **second** prospective square is drawn by
section 6's weighted rule — the same anchor, the same nudge away from every
other node — but over rules.md §3.2's **strict** pool instead of section 6's
widened one: this is the one exception to section 6, and it keeps the
opening deal's prospective squares off the board's two outermost rows and
columns wherever the board leaves room. Only when the strict pool is empty does the second square fall
back to section 6's widened pool, and only when that too is empty to §3.2's
own fallback, exactly as section 6 already provides. Every draw made once
play is under way — a claim's or an abandon's fresh square — is unaffected,
and keeps drawing from section 6's widened pool. No rotators are laid down
under steal.

## 8. What rules.md section 8 does not do under steal

Under steal, none of the following happen:

- **Priorities, rotation, the queue and refills** (rules.md §8.2). There is
  no priority 1, 2 or 3 on any node, nothing rotates, and no refill of three
  inactive nodes ever happens. Planets and rotators rotate nothing.
- **Rotators** (rules.md §3.3). None are ever laid down.
- **Countdowns and their numbers** (rules.md §8.3). A held node has no
  countdown, shows no number, and never depletes beneath the ship holding
  it.
- **The depleted state, traps and relief** (rules.md §8.1, §8.3, §8.5, §8.6
  step 7). No node is ever depleted, so no ship is ever trapped, nothing
  needs relieving, and no square on the board is ever closed to landing.
- **End-of-turn charging and its shortfall** (rules.md §8.1, §8.6 steps 3–5).
  Nothing charges at the end of a turn, because charging is something a ship
  does by arriving somewhere, not something the board does for it.

Of the end-of-turn order (rules.md §8.6), only **step 1 (power)** and
**step 2 (energy)** run. Energy (rules.md §8.4) is unchanged under steal,
except as section 9 provides, and is still priced by the charged nodes a
player is standing on when their turn ends. Nothing else in rules.md
changes.

## 9. Player-matching nodes

Before play begins, a choice is made, the same for both players and fixed
for the game's lifetime: **off, double or required**. This document names
no default.

With **double** or **required**, two of the game's nodes are matched to the
players, one each, for the whole game: of the nodes the opening deal deals
(section 7), the second-to-last is red's and the last is green's. The match
is fixed: it does not follow whoever holds the node. A matched node is
claimed, left, stolen, relocated and dealt exactly as any other node
(sections 3–7) — either player may take either matched node, and taking the
opponent's is a legitimate way to deny it to them.

**Double.** At the end of a player's turn, their own node, if one of their
ships stands on it, counts as **two** nodes held. The opponent's matched
node counts as one, like any other. The turn is then priced by the chosen
scoring (rules.md §8.4) on that count — for example, red holding its own
node and one other counts three nodes held, and collects **6** under bonus
scoring, **3** under simple.

**Required.** At the end of a player's turn, if none of their ships stands
on their own node, they collect **no** node energy that turn, however many
other nodes they hold. If one does, they collect exactly what rules.md
§8.4 gives, their own node counting once, like any other.

**Planet bonuses** (rules.md §3.4) are unaffected by either setting:
required withholds node energy only, and a bonus planet pays on landing
whether or not a player holds their own node. Nothing here ever subtracts
energy; required withholds a turn's node energy, and never takes any away.
Under the advanced planet bonus setting, this section's choice also sizes
the **point amounts** a points bonus pays (section 10).

The app shows the two matched nodes in the players' own colours, in the
same manner that section 2 already notes for a signal.

With **off**, none of this section applies, and no node is matched.

## 10. Advanced planet bonuses

**Advanced** is one of the four values of the planet bonus setting
(rules.md §3.4) — off, 2 points, 3 points or advanced — offered only under
the steal playstyle. Under it there are no per-player planets: the board
always carries exactly **two bonuses**, on two different planets, always of
**two different kinds**, and **either player** claims one by landing a ship
on it. A bonus is only ever placed on an **empty** planet, so a bonus
planet is always empty.

**The six kinds.** Each bonus is one of six kinds, dealt by weight:

| Bonus            | Weight | What it does                                                      |
| ---------------- | -----: | ----------------------------------------------------------------- |
| Small points     |     30 | Pays energy — the smallest of the three amounts                   |
| Medium points    |     40 | Pays energy — the middle amount                                   |
| Large points     |     20 | Pays energy — the largest amount                                  |
| Fuel             |     16 | One power to every one of the claimer's ships that is not full    |
| Additional nodes |     10 | Every node gains one extra prospective square                     |
| Node scramble    |     10 | Every node's ordinary prospective squares are cleared and redrawn |

**The opening deal.** After everything the opening board already deals
(section 7), two different planets are drawn at random, every planet
equally likely — every planet is empty at the start, since no starting
square is a planet (rules.md §3.1). The first bonus's kind is then drawn by
weight from the kinds available, and the second's is drawn the same way
from the kinds left over.

**Claiming.** A ship that **lands** on a bonus planet claims that bonus for
its own side. Landing means what it means everywhere else: a move that ends
there, a deliberate return (rules.md §7.2), or a ship placed there by a
fight (rules.md §7.1). Flying over the planet does not count. A claim
resolves at once, in this order:

1. **The bonus takes effect** for the claiming side, as set out below.
2. **The other bonus stays on its planet but changes kind.** It is redrawn
   by weight from the kinds available, excluding the kind it was.
3. **A new bonus appears** on a planet drawn at random from the planets
   that are empty at that moment and do not carry the other bonus, every
   such planet equally likely. Its kind is drawn by weight from the kinds
   available, excluding the other bonus's new kind.

"Available" is checked at the moment of each draw, so it reflects what step
1 has just done — this matters for Additional nodes, which is not
available once every node already has its extra prospective square.

A move that **leaves** a charged square and **lands** on a bonus planet in
the same move resolves the leave (section 4) first, exactly as section 5
already orders a leave ahead of a claim: a Node scramble claimed on such a
move therefore sees the left node already Open.

**Fighting for a bonus.** In a fight (rules.md §7), the attacker is placed
first and its claim, if any, resolves in full — including any redraw of the
other bonus and any new bonus that appears — before the defender's planet
is drawn from the planets still empty. The defender may land on either
bonus, including the one that has only just appeared, and if so it claims
that bonus for the defender's side. While the attacker's claim resolves,
the defender is still standing on the square it was attacked on, since it
has not yet been placed, so any square drawn by that claim (Additional
nodes or Node scramble) treats that square as occupied.

A claim is instant. It is not part of the end-of-turn order (rules.md
§8.6), exactly like the classic planet bonus. A bonus planet is otherwise
an ordinary planet: it protects its ship and recharges it at the end of
the turn as rules.md §3.1 says. Claiming a Fuel bonus does not change that
end-of-turn recovery.

**Point bonuses** pay the claiming side energy at once. The amount depends
on the game's node count, its scoring (rules.md §8.4) and its
player-matching setting (section 9), so that a bonus stays in proportion to
how fast nodes pay in that game:

| Nodes | Player-matching | Simple scoring (S / M / L) | Bonus scoring (S / M / L) |
| ----: | --------------- | -------------------------- | ------------------------- |
|     3 | off             | 2 / 3 / 5                  | 3 / 5 / 8                 |
|     3 | double          | 2 / 4 / 6                  | 5 / 8 / 12                |
|     3 | required        | 1 / 2 / 4                  | 2 / 4 / 6                 |
|     4 | off             | 2 / 4 / 6                  | 4 / 6 / 10                |
|     4 | double          | 3 / 5 / 8                  | 6 / 10 / 15               |
|     4 | required        | 2 / 3 / 5                  | 3 / 5 / 8                 |
|     5 | off             | 3 / 5 / 8                  | 5 / 8 / 12                |
|     5 | double          | 3 / 6 / 10                 | 6 / 10 / 15               |
|     5 | required        | 2 / 4 / 6                  | 4 / 6 / 10                |

The table roughly follows a pattern: double plays like one node more, since
a player's own node counts as two, and required plays like one node fewer,
since income stops whenever the player loses their own node. Under bonus
scoring, double pays more than that pattern alone would predict.

**Fuel** gives one power to each of the claiming side's ships below the
maximum of 6 (rules.md §4.1), wherever those ships are on the board. The
claiming ship is included, and it still recovers on the planet at the end
of the turn as usual. A ship already at 6 gains nothing.

**Additional nodes** gives **one extra prospective square** to every node
that does not already have one. A node that already has an extra gets
nothing, so a node never has more than one extra. Each new square is drawn
by section 6's weighted rule, one node at a time in the order the nodes
were dealt. This kind is **not available**, and so never dealt, while every
node already has its extra.

A node with an extra square behaves as follows:

- **Held**, it has one charged square and two prospective squares. **Open**,
  it has three prospective squares.
- **Landing on any of its prospective squares claims it** (section 3). All
  of the node's other squares go — the old charged square if it had one,
  and every other prospective square, the extra included. Then **one**
  fresh prospective square is drawn, as usual. The extra is used up, and
  the node goes back to the usual two squares.
- **Leaving it** (section 4) works as it does everywhere else. The charged
  square becomes ordinary board and the node draws its usual second
  prospective square. The extra **survives**, so the node is now Open with
  three prospective squares. The extra lasts until the node is next
  claimed.

**Node scramble** clears every node's ordinary prospective squares and
draws replacements. Charged squares, and the ships on them, are not
touched, and **extra prospective squares survive** the scramble where they
stand. The replacements are drawn one node at a time in the order the
nodes were dealt, each by section 6's weighted rule. A held node, or an
Open node with an extra, uses its charged square or its extra as its
anchor as usual. An Open node with nothing left draws its first square at
random from section 6's widened pool, every square equally likely, and its
second by the weighted rule. Each draw takes account of the squares already
drawn before it.

**The anchor of a node with an extra.** Section 6 defines a node's anchor
as its charged square when it has one, and its remaining prospective
square when it does not — which assumes a node has at most one other
square. A node with an extra prospective square may have more than one, so
its anchor is: its charged square if it is Held; otherwise its extra, if
it has one; otherwise its ordinary prospective square. When a node has two
ordinary prospective squares and no extra — which only Additional nodes
placing a square on an Open node reaches — the anchor term of section 6's
weight is the distance to the **nearer** of the two. The other-node term
(`S` in section 6) is unchanged: every square of every other node, extras
included.

**Every draw uses the game's seeded random stream**, so a recorded game
replays exactly: the opening planets and kinds, every redraw of the other
bonus's kind, every new bonus's planet and kind, and every square that
Additional nodes or Node scramble places.

**Why five is the limit.** With five ships a side there are at most ten
ships on twelve planets. When a ship claims a bonus, it stands on one
planet and the other bonus holds a second. That leaves ten planets for at
most nine other ships, so a free planet always exists for the new bonus.
The same holds in a fight: once the attacker's claim has resolved, the
defender still finds an empty planet, and so does any bonus the defender's
landing then places. Six a side has no such guarantee — which is why
rules.md §4 no longer offers it, under any playstyle.
