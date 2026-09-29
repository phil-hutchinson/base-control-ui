# Story 00000117 — A Node scramble animation

## Summary

When a ship claims a **Node scramble** bonus, the waiting squares on the
board change colour all at once, with nothing to show it happening. A player
who looks away for a moment can miss that the nodes have been shuffled.

Instead, each waiting square whose colour changes now **sweeps** from its
old colour to its new one. The sweep starts at **12 o'clock** and travels
**clockwise** around the square's rings, like a clock hand, until the whole
square shows its new colour.

This is a change to how a scramble looks, not to what it does.

## What changes

- **Every waiting square the scramble recolours** plays the sweep. The new
  colour is painted around the rings from the top, clockwise, over the old
  one, and when the sweep has gone all the way round the square is left
  exactly as it would have been drawn without the animation.
- **All three rings of a square sweep together**, as one hand going round.
- **Every recoloured square sweeps at the same time**, so the whole board
  changes together, as it does today, just no longer in an instant.
- **A waiting square that keeps its colour** does not animate. A scramble
  tries to give every square a different colour, but sometimes cannot; a
  square left the same colour shows nothing.
- **The sweep is short** — a starting value for the owner's eye, around
  half a second to a second, tuned during manual testing.
- **A player who has asked their device for reduced motion** sees the
  colours change at once, as today.
- **A new move cuts the sweep short**, as with the board's other
  animations: the squares jump to their finished colours.

## What does not change

- **The ruleset.** Node scramble shuffles exactly as steal.md §10 describes.
  No rules-version bump and no changelog entry.
- **What a scramble does** — which squares take which colours, and the
  seeded draws behind it, so a recorded game replays identically.
- **Charged squares**, which a scramble never touches, and every other
  board animation.
- **The announcement** a scramble makes, the planet bonus panel, and the
  Quick Guide.

## Verification

- Claiming a Node scramble sweeps every recoloured waiting square from its
  old colour to its new one, starting at 12 o'clock and going clockwise.
- A waiting square whose colour the scramble did not change does not
  animate.
- When the sweep ends, the board looks exactly as it does today after a
  scramble.
- With reduced motion requested, the colours change at once.
