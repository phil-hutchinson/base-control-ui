# Base Control — Technical notes

This document is development notes for Base Control, not part of the
ruleset a player reads: measured figures, the argument behind the queue's
size, and what the app's long-run tests guard. For the rules themselves, see
[rules.md](rules.md).

---

## Open items

Nothing is currently outstanding. The rules are expected to keep changing as
the game is built, so this section will list open items again when there are
any.

---

## Sizing the queue

The board carries the **chosen number** of charged nodes — five, four or
three — and **three** inactive ones at all times, plus however many happen
to be depleted and counting down. Measured over several hundred turns of
sustained play, that count breathes between **eight** and **thirteen** at
five charged (mean **12.88**), between **seven** and **eleven** at four
(mean **10.91**) and between **six** and **nine** at three (mean **8.93**)
— a charged node's own countdown and the depleted node it can leave behind
each run most of a dozen turns, so several are often alive together, and
the total sits nearer the top of its range more often than the bottom —
rather than fixed at a count the way the twelve-node board once was. A
board carrying one more charged node throughout breathes higher, as
expected, not lower.

A node's life is no longer a mix of drawn rates: a charged node lasts
**11 turns** once a ship steps on it, and **forever** if nobody does — a
board both players ignore never changes. A depleted node lasts 11 turns as a
**trap**, or 2 turns as an **exit**, and then retires either way. Turnover —
a node charging, a node depleting, a refill sweeping the queue — happens
only because the players use the nodes on the board (rules.md section 8.3);
it is not a clock the game runs on its own. Measured over the same runs, a
refill sweeps the queue on average every **2.22** turns at five charged,
every **2.78** at four and every **3.70** at three — turnover slows as the
charged count drops, because there are fewer charged nodes for the
stand-in driver described below to keep counting down.

**An inactive node never waits more than three turns to reach the front of
the queue.** Rotation alone carries a node from priority 1 to priority 3 in
two turns, and it is swept before it can wait any longer than that: a queue
that goes unrotated for a whole cycle without a charge has, by definition,
had its 3 sitting at the front the entire time, available to charge every
turn. There is no version of this rule under which a node waits
unboundedly.

**The board is never short of the chosen number of charged nodes.** Because
a turn is one move or one attack, **at most one countdown can start per
turn** — so, since every countdown is the same length, **at most one node
expires per turn**. Add the one node a player can leave behind by walking
off in the same turn, and the shortfall against the chosen number is
**never more than two** — comfortably inside what the three inactive
nodes always cover, whether the board is filling towards five charged,
towards four or towards three. This argument never depended on the target,
which is exactly why the queue does not need to grow with it. Every
shortfall is filled on the turn it appears.

On an empty board the strict pool holds **51** squares and the widened pool
holds **79** (rules.md section 3.2). On a played board — closer to the top
of the node count above than the bottom, and a dozen ships on it — a
refill's three draws pick from roughly **21**, **32** and **29** squares
respectively at five charged, roughly **25**, **38** and **34** at four,
and roughly **30**, **44** and **40** at three, the pool widening as each
draw lifts the one-square-in constraint and narrowing again as ships and
the nodes already placed this refill block squares of their own. The
pools narrow as the charged count rises, exactly as expected from carrying
more nodes on the board at once.

Both the node count above and the pool sizes here come from a stand-in for
play that starts a new countdown somewhere on the board every single turn
and never moves a ship. No real game turns nodes over that fast — a
countdown only starts when a player actually spends a turn's move landing
on a node — so these numbers are a ceiling: a real game's node count runs
lower than the ranges above, and its pools run larger than the figures
just given, not smaller, at any of the three counts.

The weighting earns its keep: measured over several hundred turns of actual
play across a handful of seeds, the smallest pairwise gap within a freshly
refilled trio averages **4.88** squares against **3.72** for an unweighted
draw from the same pools at five charged — an advantage of about **1.15**
squares — **4.79** against **3.71** at four, an advantage of about
**1.08**, and **4.88** against **3.71** at three, an advantage of about
**1.18**, all computed over the same runs. About **1.11** of the three
land one square in from the edge and **0.14** in a corner region, against
**0.83** and **0.07** unweighted — the widening does push the second and
third draws outward, but the weighting keeps them from crowding the rim.
These edge and corner figures are measured **at four charged only** and
have not been re-measured at the other counts; since the pools move only
slightly either way, the figures are expected to move only slightly too,
so they are left as measured rather than guessed at.

Section 3.2's fallback, which places a node without regard to spacing, is
even less likely to fire than it was at the old twelve-node count: there are
fewer nodes to place at once and a wider pool to place them in. Across
every placement in every run the app's own long-run test drives — every
opening deal and every refill, several hundred turns deep across a handful
of seeds, at all three charged counts — it has never once fired. It stays
in the rules because it is what makes placement total, not because it is
expected to be seen.

**What the app guards:** that the queue is always exactly three nodes
carrying priorities 1, 2 and 3, one each; that the board is always back at
the chosen number of charged nodes by the end of every turn; that every
node placed — the opening deal's eight, seven or six and a refill's three —
is legal, under the right pool, at the moment it appears; and that a
freshly refilled trio comes out measurably more spread than an unweighted
draw from the same pools would. These guards run at all three charged
counts.

These counts — the node count's range, the pool sizes and the spread
figures above — are first guesses to be play-tested and retuned like every
other number in this document, and are now measured at all three charged
counts. The edge and corner figures remain measured at four charged only,
and are expected to move only slightly once they are measured at the
other counts.
