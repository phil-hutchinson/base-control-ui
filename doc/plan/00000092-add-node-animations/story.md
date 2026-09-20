# Story 00000092 — The board moves

## Summary

Everything on this board changes by snapping. A node that has been sitting
as a ring of gold for three rounds becomes a charged node between one frame
and the next; a charged node that runs out becomes a grey depleted one the
same way; the rotators stand perfectly still while a ship lands on one of
them and takes it off the board. Nothing is wrong with any of it — the board
is always drawing the truth — but a player watching a turn resolve has to
work out what just changed by comparing the board to their memory of it a
second ago.

This story gives the three biggest of those changes a moment of movement, so
the eye follows them instead of reconstructing them:

- **A node lights up.** When a node goes from inactive to charged, the
  waiting rings give way to a bright core, and the core opens out into the
  full charged node.
- **A node burns out.** When a charged node runs out and goes depleted, the
  gold simply travels to grey rather than being replaced by it.
- **The rotators turn.** Under the **dedicated** rotation setting, when a
  ship lands on a rotator and spends it, every rotator still on the board
  turns a third of a circle clockwise — the recycling mark actually
  recycling.

This is a presentation story and nothing else. **No rule changes**, so
`rules.md` is untouched, `RULES_VERSION` does not move, and there is no
changelog entry. Nothing about which moves are legal, what anything costs,
what charges next or how the game is scored is different afterwards. A game
recorded before this story and replayed after it plays out identically; the
only difference is what the watcher sees while it does.

## What changes

### 1. A node lights up: inactive → charged

Today a node that charges (the `node-charged` effect, `src/rules/charging.ts`)
simply swaps artwork: the concentric gold rings `NodeMarker` draws for an
inactive node are replaced, in one frame, by the charged node's radial
gradient.

Instead it plays as **one animation in two phases**, over a single total
duration:

**Phase 1 — the flip, the first 60% of the duration.** A straight opacity
cross-fade from the rings to phase 2's starting picture. The rings that fade
out are **whichever rings were actually there** — the node's own priority,
one, two or three of them, as the board was drawing it the instant before it
charged. They fade out; phase 2's starting picture fades in over the top.
Nothing moves and nothing changes size during this phase; it is opacity
only.

**Phase 2 — the opening, the last 40% of the duration.** The picture is the
charged node exactly as the board would draw it fresh — a newly charged node
at the start of its own cycle — but seen through a **round mask** small
enough that only the bright core of the gradient shows: a ball of light,
not yet a node. Over this phase the mask grows until it no longer crops
anything, and the full charged node is standing there.

So the sequence a player sees is: rings, rings dissolving into a small
bright ball, ball opening out into the charged node. The end of the
animation is the ordinary charged artwork the board already draws, with
nothing left over.

The mask's starting radius is **a starting value for the owner's eye, not a
measured result** — the same footing as the ring radii and the countdown's
font size already sit on. It wants to be about the size of the gradient's
gold core.

### 2. A node burns out: charged → depleted

Today a charged node whose countdown runs out (the `node-ran-out` effect,
`src/rules/endOfTurn.ts`) is replaced by the depleted artwork in one frame.

Instead the marker **slides** from one to the other: the colours travel
smoothly from their charged values to their depleted values over a single
duration. No masking, no fading, no two phases — just the one picture
becoming the other. The colours that travel are:

- **The inner colour**, gold `#DAA520` → grey `#808080`.
- **The outer colour**, wheat `#F5DEB3` → white `#FFFFFF`.
- **The countdown number's colour**, black on charged → white on depleted,
  where a number is drawn on both sides of the change.

**The middle gradient stop's offset does not travel — it snaps.** An SVG
gradient stop's offset is not a CSS property, so travelling it would mean
redrawing the square on every frame from JavaScript, and it buys nothing:
a charged node with no countdown can never run out (only a running countdown
reaches zero), so at this transition the charged node's offset and the
depleted node's starting offset always agree, and the snap is a snap between
two identical values. Should the two artworks ever come to differ in offset,
radius or opacity, that difference will snap rather than travel, and making
it travel is a later story's problem, not a gap this one is leaving.

Where a component exists on only one side of the change — the countdown
number appearing or disappearing outright, because a node ran out with no
ship on it — it is not a component that can travel, and it may simply appear
or disappear as it does today.

### 3. The rotators turn: a spent rotator turns the rest

Under the **dedicated** setting only (rules.md §3.3, §8.2), a ship that
lands on a rotator spends it: the rotator leaves the board at once, and the
waiting nodes rotate a step. The board already raises exactly the signal
this needs — a `queue-rotated` effect carrying `trigger: "rotator"` and the
square landed on (`src/rules/ply.ts`).

When that happens, **every rotator still on the board turns 120° clockwise**
over a single duration. Because the mark is three arcs evenly spaced around
a circle, a third of a turn lands it exactly back on itself: the rotators
finish looking precisely as they started, and what the player sees is the
turn, not a new arrangement. That is the intent, not an accident to design
around.

The rotator the ship landed on is **not** turned. It is being spent — it
leaves the board at that instant — and a mark that spins as it vanishes is a
different effect from the one this story wants. It simply goes, as it does
today.

If the board has no other rotators left, nothing turns and nothing needs to
be drawn; a lone rotator being spent looks exactly as it does now.

## What does not change

- **The rules.** No rule, number, legal move or outcome is different.
  `rules.md` is not edited, `RULES_VERSION` does not move, and there is no
  changelog entry.
- **The artwork itself.** Every one of these animations begins and ends on a
  picture the board already draws. No colour, radius, gradient, ring count
  or mark is redesigned here; the only new geometry in the story is the
  charge animation's growing mask, which exists only while it is running.
- **The game state and its events.** Nothing in `src/rules/` gains a new
  rule or a new effect type. If the view needs to know something the effects
  do not currently carry — the priority a node held the instant before it
  charged is the known example — that is a reporting detail to solve in the
  plan, not a rules change.
- **Every other state change on the board.** Ships still move by snapping
  from square to square, nodes still retire without ceremony, planets and
  the countdown still behave exactly as they do. Those are their own
  stories if they are ever wanted.
- **The live region.** Announcements say what they say today, at the moment
  they say it today. They are not delayed to match an animation and not
  written to describe one; a screen-reader user learns what happened from
  the sentence, as now.

## In scope

### 1. A node lights up

The two-phase charge animation described above, playing whenever a node goes
from inactive to charged **during play**.

It does **not** play at the opening deal. The nodes that are charged when the
board first appears were never inactive on screen, so there are no rings for
them to have come from; they are simply there, as now. The animation is for a
node the player has been watching wait.

### 2. A node burns out

The straight slide from charged to depleted described above, playing whenever
a charged node runs out.

### 3. The rotators turn

The 120° clockwise turn of every remaining rotator, playing whenever a
`queue-rotated` effect with `trigger: "rotator"` is raised.

Note the interaction with the refill: the rotation happens the moment the
ship lands, mid-turn, while the whole rotator set is replaced later, after
the end-of-turn refill of the inactive nodes. **When both happen on the same
turn, nothing turns.** The board draws once, after the whole turn has
resolved, so by the time anything reaches the screen the marks standing there
are the fresh set — and spinning those would be spinning marks that were
never part of the rotation, for no reason a player could read. The fresh set
simply appears, still, as it does today. This is uncommon: it needs a ship to
land on a rotator on a turn that also ends with something charging.

### 4. Durations

Each of the three has a duration. They are **starting values for the owner's
eye**, chosen by the implementation, stated as named constants near the
animation that uses them, and expected to be adjusted once the owner has
watched them. The charge animation's is split 60% / 40% between its two
phases; the other two are single figures. As a starting point: roughly
three-quarters of a second for the charge, half a second for the burnout,
and half a second for the rotator turn — all of them to be moved if they
feel wrong on the board.

### 5. An interrupted animation still lands correctly

An animation is driven by the session's last event, the same way the
settlement overlay already is, which means the next event replaces it: a node
charges, the other player clicks a ship, and the charge animation stops part
way through. **That is accepted.** What is not accepted is the board being
left wrong because of it. Whatever an animation was travelling towards must
be exactly what is standing on the board once it is over, however it ended —
cut short, never started, or run to completion. The end state is the
requirement; the motion is the decoration on top of it.

### 6. Reduced motion

Each animation gets a `prefers-reduced-motion: reduce` branch, following the
precedent `EnergyOverlay.css` and `ClockRegion.css` already set: with reduced
motion the board goes straight to the end state — the charged node, the
depleted node, the rotators as they were — with no travel, no growing mask
and no turn. Nothing in this story is the only channel for any information,
so removing the motion removes nothing but the motion.

### 7. The tests

The automated suite should cover what is worth asserting and no more.
Animations are a poor fit for assertions about appearance over time, and
this story does not ask for any. What it does ask for:

- The charge animation runs when a node charges during play and does **not**
  run at the opening deal.
- The burnout animation runs when a node runs out.
- The rotator turn runs on a rotator-triggered `queue-rotated` effect,
  applies to the remaining rotators, and does not apply to the spent square.
- Whatever mechanism carries the outgoing ring count into the charge
  animation reports the priority the node actually held.
- The rotator turn does **not** run on a turn that also replaced the rotator
  set.
- The board's end state is correct regardless of whether an animation ran,
  was interrupted, or never started — the property scope item 5 asks for.

Existing tests over `NodeMarker`, `RotatorMarker`, `BoardSquare` and `Board`
must keep passing; where an animation's plumbing makes one of them
straightforwardly need updating, update it.

## Out of scope

- **Any rules change.** If something here seems to want one, it is wrong.
- **Animating anything else**: ship movement, a node retiring, a node being
  spent, a fight, a settlement (which has its own overlay animation
  already), planets, the HUD or the clock.
- **Redesigning the node or rotator artwork.** These animations move between
  the pictures that exist.
- **Replaying animations backwards.** Stepping back through the game with
  browser navigation (story 88) does not run any of these in reverse, and
  does not need to re-run them forwards; the board arrives at the state it
  is showing.
- **Accessibility repair.** Per `CLAUDE.md`, any accessible behaviour this
  story costs is recorded in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather than
  repaired. The reduced-motion branches above are in scope because they are
  cheap and follow an established precedent, not because the story is taking
  accessibility work on.

## Verification

Manual, on `npm run dev`, by the owner, since every item here is something
to look at:

1. Start a game and play until a waiting node charges. The rings dissolve
   into a small bright ball, and the ball opens out into the charged node.
   Watch it happen for nodes holding one, two and three rings — the rings
   that fade are the ones that were there.
2. Let a charged node run out. The gold travels to grey rather than being
   swapped for it, and the countdown number, where there is one on both
   sides, travels with it.
3. Start a game with **dedicated** rotation and land a ship on a rotator.
   The spent rotator goes; every other rotator turns a third of a circle
   clockwise and ends up looking exactly as it started.
4. Do the same on a board where the spent rotator is the only one left:
   nothing turns, nothing flickers.
5. Turn on the system's reduce-motion setting and repeat 1–3: each change
   happens instantly, and the board is correct afterwards.
6. Watch a turn in which a ship lands on a rotator **and** the rotator set
   is replaced. Nothing turns, the fresh set appears still, and nothing is
   left drawn mid-animation.
7. Interrupt an animation — let a node charge, then immediately click a ship
   — and confirm the board is left in the correct end state. This is the one
   that matters: an animation may be cut short, but what it was travelling
   towards must always be what is standing there afterwards.

Plus the usual `npm run typecheck`, `npm run lint` and `npm test`.

## Notes

- `node-charged` (`src/rules/charging.ts`) currently carries only the square.
  The charge animation needs the priority the node held the instant before
  it charged, to know how many rings to fade out. Whether that arrives by
  the effect carrying it or by the view remembering the board it was last
  drawing is an implementation decision — but it is the one wrinkle in this
  story that is not purely a matter of CSS, and it is worth settling early.
- `queue-rotated` already carries everything the rotator turn needs.
- The three-fold symmetry of the rotator mark is what makes a 120° turn land
  back on itself. `RotatorMarker.tsx` draws `ARC_COUNT = 3` arcs evenly
  spaced; if that ever becomes some other number, the turn angle has to
  follow it, so the angle should be derived from the arc count rather than
  written as a bare 120.
