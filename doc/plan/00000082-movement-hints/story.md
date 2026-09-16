# Story 00000082 — The board prices the move

## Summary

Selecting a ship today draws three things at once: four corner brackets
around the ship itself, a small solid disc on every square it may move to,
and a hollow ring around every ship it may attack. The brackets are the
weakest of the three. They sit inset from the square's edges, directly over
the artwork of the ship they are meant to point at, and they say something
the destination marks already say louder — the board has lit up, so
something is selected, and the marks fan out from exactly one square.

This story **removes the brackets** and spends the space they were taking on
something the board has never shown: **what a move costs**.

Section 6 prices every one of the thirty-six shapes at 0, 1, 2 or 3 power,
and section 7 charges a shot the price of the shape it is struck down. A
player can work a price out — count the squares, recall the table — but the
board has never said it. Today the only way to learn that the L you were
eyeing costs 2 and the diagonal-two beside it costs 3 is to know the table by
heart. After this story the marks carry their own price:

- **A free move keeps today's mark.** Zero-cost squares — the four
  orthogonal single steps — draw the small solid disc exactly as they do
  now, and a zero-cost attack draws the hollow ring exactly as it does now.
- **A move that costs fuel draws that much fuel.** The bar from the ship's
  own fuel gauge, stacked: one bar for 1, two for 2, three for 3 — `-`, `=`,
  `≡`. On a destination square the bars stand in place of the disc; on a
  target square they sit inside the ring, which stays, because the ring is
  what tells an attack from a move.

Nothing about how the game is played changes. No rule moves, no number
moves, `rules.md` is untouched and the version is not bumped. This is the
board learning to say out loud what section 6 has said all along.

## What changes

### The selected ship's own square is no longer marked

The four corner brackets go, and with them the geometry and the drawing that
produce them. A selected ship is drawn exactly as an unselected one.

The accessible name keeps the word. The square of a selected ship still
reads `… selected` — that name is a screen reader's only cue, and it costs
nothing to leave standing once the drawing is gone. What disappears is the
picture, not the mark.

**The accepted edge case.** A ship with no legal destination and no legal
target — a pinned ship — will, when selected, look exactly as it did before
it was selected. That ship already draws dampened with a hollow bar at the
bottom edge, but that bar means *pinned*, not *selected*, so for that one
ship the selection becomes invisible. This is knowingly accepted: it is the
one ship on the board for which selecting is pointless, and every other
selection lights up squares in a fan around exactly one origin.

### A destination square draws its price

| Cost | What the square draws                     |
| ---- | ----------------------------------------- |
| 0    | the small solid disc, unchanged           |
| 1    | one fuel bar                              |
| 2    | two fuel bars, stacked                    |
| 3    | three fuel bars, stacked                  |

The bars are the **same mark the power gauge draws on a ship's hull** — the
same bar geometry, the same dark underlay beneath it — so a player who has
read their own gauge is reading a familiar shape, not learning a second
notation for the same substance.

They are drawn in the **interaction accent**, the blue the disc and the ring
are already drawn in, not in the side's colour. The selection markings are
one layer — *you are choosing a move* — kept deliberately clear of the side
colours, the node marker's gold and the focus ring's amber, and the fuel bar
joins that layer rather than breaking it. The shape does the recognising;
the colour says which layer it belongs to.

The count comes from the move's own cost, not from a fixed list of three, so
a later change to section 6's table that prices a shape at 4 draws four bars
without this drawing being revisited.

### A target square draws its price too

Attacks are priced from the same table, so they are marked the same way: the
hollow ring is always drawn, and one, two or three fuel bars are drawn
inside it when the shot costs that much. A zero-cost shot is a bare ring,
exactly as today.

The bars sit inside the ring, over the enemy ship, in the same place the
destination bars sit. The mark layer already draws over ships.

### The costs have to reach the board

`legalDestinations` and `legalTargets` currently hand back squares with the
cost thrown away, and `SquareMark` is a bare string. Getting a price to the
square that draws it means the cost travelling with the mark. How is the
plan's business; that it arrives from the rules layer rather than being
recomputed in the view is not.

### The accessible names gain the price

The bars are decorative, so a square's name is the only place the cost can
reach a screen reader: a destination reads its cost, and so does a target.
Without this the story would simply be invisible to a screen reader, which
is a different thing from an accessible behaviour degrading — it is a new
thing arriving unreadable.

## What does not change

- **No rule changes.** Section 6's shapes and prices, section 7's charge for
  a shot, what is legal and what is not: all untouched. `rules.md` is not
  edited and `RULES_VERSION` is not bumped.
- **The disc and the ring keep their shapes and their meanings.** A
  zero-cost destination and a zero-cost attack look exactly as they do
  today.
- **The pinned-ship marking stays.** Dampened hull, hollow bar at the bottom
  edge, unchanged — it is a ship's own condition, not part of the selection
  layer.
- **The Quick Guide keeps its digits.** The guide's movement diagram prints
  each reachable square's cost as `0`, `1`, `2`, `3` in a compact grid, and
  goes on doing so. It is a reference table, where a digit reads faster than
  a stack of bars; the bars live on the board.
- **Nothing about selection behaviour.** What can be selected, what
  activating a square does, what is announced when a ship is selected: all
  as now.

## Done when

- Selecting a ship draws no brackets on its own square, and its artwork is
  unobstructed.
- Selecting a fully fuelled ship in open board shows discs on its four
  orthogonal neighbours, one bar on each diagonal neighbour, two bars on
  each two-orthogonal and each L square, and three bars on each
  three-orthogonal, diagonal-two and long-knight square.
- A ship at 2 power shows no three-bar squares at all, because it cannot
  afford one.
- A ship at 0 power shows only discs.
- An enemy ship one orthogonal step away is ringed with no bars; one an L
  away is ringed with two bars inside the ring.
- A pinned ship, selected, lights nothing — the accepted edge case.
- A screen reader reading a marked square hears what the move or the shot
  costs.
- The full suite, typecheck and lint are green.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary), and **power** for the UI's **fuel**: `rules.md`
  and the code say power, the guide and the game's own screens say fuel.
  This story's marks are fuel to a player and cost-in-power to the code.
- No rules version bump on this branch: nothing here changes how the game is
  played.
- Manual checks worth making once it runs: three bars inside a target ring
  over an enemy ship, at the smallest square size the adaptive layout
  produces — the ring is 64 units across in a 100-unit square and three
  stacked bars have to live inside it without touching it or each other.
