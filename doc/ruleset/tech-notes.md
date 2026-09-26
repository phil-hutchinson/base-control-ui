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

**Under the continuous rotation setting, an inactive node never waits more
than three turns to reach the front of the queue.** Rotation alone carries a
node from priority 1 to priority 3 in two turns, and it is swept before it
can wait any longer than that: a queue that goes unrotated for a whole cycle
without a charge has, by definition, had its 3 sitting at the front the
entire time, available to charge every turn. There is no version of
continuous rotation under which a node waits unboundedly. This bound is a
property of rotation happening automatically, though: under the planet and
dedicated settings (rules.md section 8.2) the priorities only move when a
player triggers it, so a node can in principle wait indefinitely if neither
player ever lands on what would rotate it.

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
holds **117** (rules.md section 3.2). On a played board — closer to the top
of the node count above than the bottom, and a dozen ships on it — a
refill's three draws pick from roughly **20**, **16** and **50** squares
respectively at five charged, roughly **24**, **20** and **56** at four,
and roughly **29**, **25** and **65** at three. The first and second draws
now come from the same strict pool, so the second is a little smaller than
the first — one more square, and the neighbours it excludes, are already
spoken for — and the third jumps sharply once it drops both edge
constraints together for the widened pool. The pools narrow as the charged
count rises, exactly as expected from carrying more nodes on the board at
once.

Both the node count above and the pool sizes here come from a stand-in for
play that starts a new countdown somewhere on the board every single turn
and never moves a ship. No real game turns nodes over that fast — a
countdown only starts when a player actually spends a turn's move landing
on a node — so these numbers are a ceiling: a real game's node count runs
lower than the ranges above, and its pools run larger than the figures
just given, not smaller, at any of the three counts.

The weighting earns its keep: measured over several hundred turns of actual
play across a handful of seeds, the smallest pairwise gap within a freshly
refilled trio averages **4.71** squares against **3.73** for an unweighted
draw from the same pools at five charged — an advantage of about **0.98**
squares — **4.85** against **3.82** at four, an advantage of about
**1.03**, and **4.79** against **3.61** at three, an advantage of about
**1.18**, all computed over the same runs.

At four charged, over those same runs, a freshly refilled trio's three
squares land on the outer edge an average of **0.61** times, one square in
from it **0.26** times, and inside a corner region **0.36** times — against
**0.39**, **0.32** and **0.21** respectively for an unweighted draw from
the same pools. (The corner region is the 3 × 3 block at each of the
board's four corners — A1–C3, M1–O3, A13–C15 and M13–O15, 36 squares in
all. This document's earlier corner figure, 0.14, came from a simulation
whose corner definition was never recorded, so it is not compared against
here. The three categories overlap rather than partition a trio: a square
inside the corner region may also be on the outer edge, one ring in, or two
rings in from it — the corner block's own innermost square, such as C3,
sits two rings in — so the three counts do not sum to the trio's size, and
the corner figure can exceed the one-ring figure.) The weighting does
**not** keep the third draw off the rim: an edge
square is farther from everything else on the board than an interior one
is, so the formula favours it, and a freshly refilled trio lands on the
outer edge, and in a corner, _more_ often under the weighting than an
unweighted draw from the same pools would — only the one-ring-in figure
moves the other way. These figures are measured **at four charged only**
and have not been re-measured at the other counts; the third draw's pool is
the one that moves most with the charged count — the pool-size paragraph
above puts it at **50** squares at five charged and **65** at three — so
these figures may move more than the others do, and are left as measured
rather than guessed at.

`rules.md` section 3.2's fallback, which places a node without regard to
spacing, remains unlikely to fire: the third draw's pool is now the whole
board rather than the ring-lifted one, so it is wider than before, not
narrower. The second draw lost that same ring and so runs narrower than it
used to — the narrowest pool this run measured across all three draws and
counts was the second's, down to **4** squares at five charged — but even
that narrowest pool never actually ran dry. Across every placement in every
run the app's own long-run test drives — every opening deal and every
refill, several hundred turns deep across a handful of seeds, at all three
charged counts — it has never once fired. It stays in the rules because it
is what makes placement total, not because it is expected to be seen.

**What the app guards:** that the queue is always exactly three nodes
carrying priorities 1, 2 and 3, one each; that the board is always back at
the chosen number of charged nodes by the end of every turn; that every
node placed — the opening deal's eight, seven or six and a refill's three —
is legal, under the right pool, at the moment it appears, with the opening
deal's whole inactive trio held to the strict pool alone (rules.md §8.1);
that a refill's third square does land on the outer edge at least once
across the run; and that a freshly refilled trio comes out measurably more
spread than an unweighted draw from the same pools would. These guards run
at all three charged counts.

These counts — the node count's range, the pool sizes and the spread
figures above — are first guesses to be play-tested and retuned like every
other number in the rules, and are now measured at all three charged
counts. The edge, one-ring and corner figures remain measured at four
charged only, and are expected to move only slightly once they are
measured at the other counts.

---

## Placing prospective nodes under steal

Steal (0.39, [steal.md](steal.md) §6, §7) weights every prospective square's
partner by distance from the node's own anchor plus a small nudge away from
every other node, and halves that weight on the outer edge. Every draw made
once play is under way — a claim's or an abandon's fresh square — comes from
the same widened pool a refill's third square uses, constraints 3 and 4 both
lifted. The opening deal's second square is the one exception (added at Step
12, from the owner's own play, after rings kept turning up on the board's
edge and corners while the middle sat empty): it is drawn by the same
weighted rule, but over the **strict** pool first, falling back to the
widened pool — and, from there, to §3.2's own fallback — only where the
board leaves no strict square. `story.md`'s own table quoted figures measured
before the draw existed, over an idealised board, and then again once the
opening deal drew its second square from the widened pool; both are
superseded by the tables below, measured against the real code (an
improvised script, not committed — see
`doc/plan/00000101-add-node-steal-play-variant`, implementation-plan.md,
Steps 6 and 12).

**The opening deal**, over **20,000 simulated deals per node count**, at the
app's default fleet of **five ships a side**:

|                                             | 3 nodes | 4 nodes | 5 nodes |
| ------------------------------------------- | ------- | ------- | ------- |
| Deals needing the strict pool's fallback    | 0       | 0       | 0       |
| Mean distance between a node's two squares  | 5.47    | 5.52    | 5.53    |
| Second square in the outer two rows/columns | 0%      | 0%      | 0%      |

The outer-two-rings share is zero by construction wherever the strict pool
has room, which the fallback count shows is everywhere this script tried,
including the worst case for available squares — the largest fleet, six
ships a side, and the most nodes, five, checked the same way over a further
20,000 deals: the strict pool was never once empty for a second square
there either. The mean distance moves only slightly from Step 6's own
widened-pool figures (6.73, 6.82, 6.91), since the strict pool is a large
majority of the widened one and the weighting formula is unchanged — the
distance the opening deal produces was never really about which pool it
drew from, only the outer-edge share was, and that share is now zero at the
opening rather than roughly a quarter.

**Mid-game draws** — every claim's and every abandon's fresh square, which
still draw from the widened pool exactly as before — over ten seeded
40-round-plus games at five nodes, the default fleet:

|                                | Figure |
| ------------------------------ | ------ |
| Mean distance from the anchor  | 7.88   |
| Fresh square on the outer edge | 27%    |

This is close to Step 6's own combined figure (mean distance around 6.9,
edge share around a quarter) but a little higher on both: a mid-game draw's
occupied board — nodes and ships scattered from a live game rather than an
empty one — pushes candidates further out on average than an opening deal
does. Without the outer-edge halving the edge share would be expected to
roughly double, as Step 6 found; this run does not re-check that, since the
halving itself is unchanged from Step 6's measurement.

`story.md`'s placement table has been corrected in place to the figures
above, per this project's rule that the story records what was actually
built.

**The fallback never fires.** Across every deal and every game these scripts
ran, and separately confirmed by re-implementing §3.2's ordinary constraints
independently of `legalNodePool` (so a bug in that function could not hide a
fallback firing from the count), no square anywhere needed §3.2's own
fallback — at the opening or mid-game, at the default fleet or the largest
one. The fallback firing mid-game was never observed either.

**What the app guards:** `src/rules/stealPlacement.test.ts` keeps the
opening deal's mean distance within a generous band around the re-measured
figure at all three node counts, at the default fleet, and separately
proves that no opening square, first or second, ever lands in the outer two
rings, at every node count and every fleet size; it keeps the mid-game
draws' mean distance and outer-edge share within a band around their own
re-measured figures; and, at the largest fleet and five nodes, it confirms
§3.2's own fallback never fires, both across a batch of opening deals and
across a batch of whole games' worth of claims and abandons.
