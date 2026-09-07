# Story 00000063 — Three inactive nodes, and a priority you can read

## Summary

Today the board carries twelve nodes, eight of them inactive, and the charge
draw picks among them at random, weighted by a hidden number called pressure.
A player watching the board cannot tell which node is next, cannot tell which
was close, and has nothing to plan around: the map is busy, and the one thing
about it that matters is invisible.

This story replaces that with **three inactive nodes and a visible queue**.
Each of the three carries a **priority** — drawn on the board as one, two or
three rings, more rings meaning higher priority — and the node that charges
next is simply the one with three rings. Nothing is drawn for it. Every
turn the priorities **rotate**, one step: the single ring becomes a double,
the double becomes a triple, the triple drops back to a single. So the three
nodes take it in turn to be next, and a player looking at the board can see
not only which node charges if one charges now, but which charges the turn
after, and the turn after that.

Randomness moves out of _which_ node charges and into _where the next three
appear_. Whenever a charge happens, the surviving inactive nodes are swept
off the board and three fresh ones are drawn, spread deliberately apart from
the charged nodes and from each other, and dealt priorities 1, 2 and 3 in
random order. The queue you have been reading for the last few turns is
gone, and a new one starts.

What changes:

- **Eight inactive nodes become three**, each with a priority of 1, 2 or 3 —
  never two the same.
- **Priority is visible**: one, two or three rings on the node's artwork.
- **Charging is deterministic.** The highest priority charges first; if the
  board needs two, the top two charge, and so on down.
- **Priorities rotate on every turn that nothing charges** — 1→2, 2→3, 3→1 —
  so which node is next depends on which turn the charge lands on.
- **A charge sweeps the queue.** Any turn one or more nodes charge, whatever
  inactive nodes remain are discarded and three new ones are drawn.
- **New nodes are drawn spread out**, by a distance weighting, from a pool
  that widens once after the first draw. No new node ever lands on the
  board's outer edge.
- **Pressure is gone**, along with the opening pressure table and the
  end-of-turn pressure step. Priority replaces it entirely.
- **A retiring node is not replaced.** It simply leaves.

## The queue

Exactly three nodes are inactive at any moment, holding priorities 1, 2 and
3 — one each, never a repeat.

**The board charges top-down.** At the end of every turn the board still aims
to keep four nodes charged (section 8.2). Whatever the shortfall is, it is
filled from the queue in descending priority: the 3 first, then the 2, then
the 1. There is no draw and no weighting; a player who can see the rings
knows the answer before it happens.

**Priorities rotate each turn.** 1 becomes 2, 2 becomes 3, and 3 becomes 1.
The nodes do not move — only their rings change — so over three turns each
of the three takes a turn at the front.

**What the player saw is what charges.** The rotation happens at the _end_ of
a turn, after that turn's charge. So the arrangement of rings a player looks
at while taking their turn is exactly the arrangement that governs the charge
at the end of it; the rotation they then see is the next player's to plan
against.

## Refilling the queue

**Any turn one or more nodes charge, the whole queue is replaced.** The
inactive nodes that were not charged are discarded — they leave the board
like any other node that ends — and three new inactive nodes are drawn.
There is never a partial queue and never a queue of stale survivors: it is
three new nodes or the same three as last turn.

On a turn where a charge happens, the new trio's priorities are dealt at
random, so no rotation is applied to them: a freshly dealt random order
rotated one step is just a different random order. Rotation is what happens
to a queue that **survives** a turn.

**Where the three go.** They are drawn one at a time, from a pool that
widens once:

1. **The first** is drawn from the squares that satisfy every constraint in
   section 3.2 as it stands today — including both edge exclusions, so it
   lands in the 11 x 11 interior.
2. **The second and third** are drawn from that pool with the "not one
   square in from the edge" constraint lifted, and nothing else changed.

The outer edge itself is **never** open to a new node. Section 3.2's other
constraints stay in force for all three draws: no square that already holds
a node, no square under a ship, nothing adjacent to a node, and nothing on
or beside a planet. Each draw sees the ones before it, so the three are
never adjacent to each other.

An earlier version of this story let the third draw relax all the way to the
outer edge. It was dropped: opening the outer ring adds 37 squares that are
mostly corners and walls, and since the weighting rewards distance, that is
where the third node kept going — about half of all third nodes landed on
the very edge. Stopping at one ring in keeps the widening that the draw
wants without handing it the board's rim.

**How the square is chosen.** Not uniformly — the draw is weighted to
separate new nodes from the charged nodes and from each other. For a
candidate square s, with C the squares holding charged nodes and N the
squares already chosen for new inactive nodes in this same refill:

    w(s) = 1 + ( sum over c in C of d(s,c) ) * ( product over n in N of d(s,n) )

where d is **Chebyshev distance** — the greater of the column difference and
the row difference — and the product over an empty N is 1, so the first draw
of a refill is weighted by distance from the charged nodes alone.

Distance from the charged nodes sets a square's base appeal, and each
inactive node already placed this refill multiplies it. The product is the
point: under a sum, being close to one placed node can be bought off by
being far from another, and the two trade against each other. Under a
product they cannot — being close to _any_ placed node collapses the whole
weight, because the product follows the nearest one. That is what spreads
the trio rather than merely pushing it outward.

Chebyshev is used rather than taxicab because it is the closer of the two to
how far apart squares actually play — a diagonal step is a single move
(section 6), which taxicab charges as two.

The product can never be zero or degenerate. Section 3.2 already bars a new
node from any square adjacent to an existing one, so every candidate sits at
Chebyshev distance 2 or more from every node already placed; the product
bottoms out at 2 for the second draw and 4 for the third. The leading 1 is a
positivity guarantee — it keeps the total weight positive, and makes the
draw uniform in the degenerate case of no charged nodes at all — but it is
not a fairness floor, and buys a poorly placed square no meaningful chance.

Depleted nodes carry no weight at all — they still block their own square
and its neighbours through the adjacency constraint, but they do not repel.

Simulated over 20,000 dealt boards under the pools above, the trio's
smallest pairwise gap averages 5.08 squares, against 3.98 for an unweighted
draw from the same pools — so the weighting is doing the work it exists for.
Roughly 1.23 of the three nodes sit one square in from the edge and 0.24 in
a corner region, against 0.94 and 0.15 unweighted. The three draws pick from
pools of roughly 33, 53 and 49 squares.

**These figures were later superseded.** They come from a standalone
simulation of the placement rules written while this story was being
settled, which dealt its four charged nodes uniformly from the strict pool.
The finished game places them by refill instead, and Step 7 measured the real
thing over several hundred turns of play: a spread of **4.78** against
**3.78** unweighted, **1.11** of the three nodes one ring in from the edge
and **0.14** in a corner, and pools of roughly **32**, **47** and **43**
squares. The conclusions above all survive the correction — the weighting
still buys about a square of spread, and the edge tilt is still mostly the
ladder — but Appendix B of the ruleset carries the numbers to trust.

**A distance cap was considered and dropped.** An earlier version of this
story capped d at 8, so that squares 8 or more apart counted as equally far
and the weight stopped rising towards the walls. It was measured and then
rejected as not worth its complication: once the second and third draws were
stopped one ring in from the edge, the ladder was already doing the work the
cap was meant to do, and the cap moved the numbers only slightly (1.16
ring-one nodes per trio against 1.23, at the cost of a slightly tighter
spread). An uncapped Chebyshev distance is one fewer number in the rules and
one fewer thing to explain, and the board does not drift into the corners
without it.

**Then priorities are dealt** — 1, 2 and 3 to the three new nodes, in random
order.

## Four at once

There are three inactive nodes and the board wants four charged, so one case
needs its own answer: all four charged nodes running out on the same turn.

Three of the four come from the queue as usual. **The fourth is placed
directly as a charged node**, at a square drawn uniformly — no distance
weighting — from the same widened pool the second and third inactive draws
use: every section 3.2 constraint except "not one square in from the edge".
It starts at zero drain, exactly as a node charged from the queue does.

This node never spends a turn inactive and never had a priority. It is the
one place in the game where a charged node appears out of nowhere, and it
exists so that a board wiped clean of charged nodes fills back up in one
turn rather than starving.

## The opening board

The game now opens with **seven** nodes rather than twelve: four charged and
three inactive.

The four charged are dealt as they are today — squares drawn uniformly from
section 3.2's strict pool, each starting part-drained from the opening drain
table. The three inactive are then placed by exactly the refill procedure
above: the widening pools, the distance weighting, and priorities 1, 2 and 3
dealt at random.

The **opening pressure table is deleted**. Nothing replaces it: an inactive
node has no number any more beyond its priority.

## What goes away

- **Pressure**, in every form: the value an inactive node carried, the cap of
  50, the gain of 1 at the end of each turn, the opening pressure table, and
  the weighting of the charge draw by it. The end-of-turn pressure step goes
  with it.
- **The one-out-one-in replacement.** A depleted node that finishes
  recovering now simply leaves the board; nothing appears in its place.
  Inactive nodes are created only by a refill. The rule that a replacement
  may never appear on the square its predecessor just left goes too, having
  nothing left to govern.
- **Running short of four charged**, as a routine outcome. Between the queue
  and the direct fourth placement, every shortfall is filled on the turn it
  appears.
- **The twelve-node board.** The node count now breathes: always four charged
  and three inactive, plus however many happen to be depleted.

## What does not change

Combat, movement, energy, the trap, the relief, power and planets are all
untouched. A charged node still has a capacity of 60 and drains from the
same two tables; a depleted node still recovers from the same table over
about ten turns, still traps the ship standing on it, and is still freed when
it ends. The charged and depleted artwork is unchanged — only the inactive
node's is redrawn, as rings.

## Notes

- This is a gameplay change, so `doc/ruleset/rules.md` needs a version bump,
  a changelog entry, and edits to sections 3.2, 8.1, 8.2 and 8.6, plus
  Appendix B, whose whole sizing argument rests on the twelve-node pool and
  the pressure cap.
- Section 1 counts the game's random elements; that count changes, since
  which node charges is no longer one of them.
- The accessibility of the new rings is out of scope per the project's
  pre-release stance; anything lost is recorded in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.
