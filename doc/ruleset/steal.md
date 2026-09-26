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
colour, so a node's two squares always look alike.

A node is always in exactly one of two configurations:

|                                    | Charged squares | Prospective squares |
| ---------------------------------- | --------------- | ------------------- |
| **Open** — how every node is dealt | 0               | 2                   |
| **Held**                           | 1               | 1                   |

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
would.

## 4. Leaving a node

A ship **moves off a charged square**, without landing on that same node's
own prospective square:

1. The vacated square becomes ordinary board, leaving nothing behind.
2. The node draws **a second prospective square** (section 6).

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
prospective square when it does not — and with `S` every square belonging to
any **other** node, charged or prospective alike:

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
and is still priced by the charged nodes a player is standing on when their
turn ends. Nothing else in rules.md changes.
