# Story 00000013 — A planet in every bay

## Summary

Give each of the fourteen bays a planet to sit in front of. Purely thematic:
the bays are where ships start and where beaten ships return to, and right now
they are flat coloured tiles. This story makes each one a place.

Nothing about the game changes. No rule reads a planet, no planet moves, and
which planet sits in which bay never varies from game to game. This is
artwork.

### A note on words

This is a planning document, so it says **ply** for what the rules and the UI
call a **turn**. **Bay** is the same word everywhere. A planet is not a
**site** and not a **hub/node** — those are the interior squares that carry
influence, and nothing in this story touches them.

## Background & references

The rules are owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), **version 0.6**. The only
section this story touches is:

- **§3.1 Bays** — which fourteen squares are bays.

It touches that section only to know where to draw. **This story does not
change the ruleset**: no rule is added, changed or reworded, so there is no
version bump, no changelog entry, and no tag.

### What is already in place

- `src/rules/bays.ts` holds `BAYS` (the fourteen squares, §3.1 order) and
  `isBay`. `Board.tsx` already passes `isBay` down to each square.
- `BoardSquare.css` gives a bay a distinct fill and a heavier border:
  `background: var(--bay-fill)` (`#223463`) and `border: 2px solid
var(--bay-border)` (`#5fd0e8`), both defined on `.board` in `Board.css`.
- `SiteMarker.tsx` and `ShipIcon.tsx` establish the convention this story
  follows: decorative SVG artwork in a **100 x 100 viewBox** centred on the
  square, stacked in `BoardSquare`'s single-cell grid, `aria-hidden`, with
  the meaning carried instead by the square's accessible name from
  `squareLabel.ts`.
- A bay is never a site (`squareLabel.ts`: "a square is never both a bay and a
  site"), so a planet never has to share its square with a `SiteMarker`.
- A bay square may already carry a §7.1 **return-position cue**: small corner
  triangles in the bay's own cyan, drawn all game regardless of selection —
  solid ones closing the corners of the bay a beaten ship would land in, a
  stroked diagonal alone for return position 1. They sit in the same 100 x 100
  viewBox, with a leg of 22 units along each edge from each corner.

## In scope

1. **A planet in each of the fourteen bays.** Drawn behind anything else in
   the square, in the same 100 x 100 viewBox the other square artwork uses, so
   it scales with the board.
2. **Each planet is visibly its own.** Distinctness comes from more than hue:
   rings of varying width and tilt, one or more moons, size, and surface
   treatment — banding, a lighter limb, mottling, a terminator. A planet may
   read as close to a single colour, but **never as a flat disc of one flat
   colour**; even the plainest one carries some shading or texture. The story
   deliberately does not specify the fourteen designs — see _Verification_.
3. **The bay tile itself loses its special colouring.** A bay keeps its
   heavier cyan border, which is what marks it out as a bay; it drops the
   distinct `--bay-fill` background and sits on the ordinary square
   background, so the planet is the thing the eye finds inside the square
   rather than competing with a coloured tile.
4. **A planet gets out of the way of a ship.** While a ship stands in the bay
   its planet is not drawn at all, so the two silhouettes never overlap into
   mush. The planet returns when the bay empties.
5. **Which planet sits in which bay is fixed.** A static table keyed by bay
   square, identical in every game and every render, so a recorded game
   replays looking exactly as it did.

## Design decisions & constraints

- **Decoration is never information.** The planets are `aria-hidden` and add
  nothing to any square's accessible name: a screen-reader user hears "bay"
  exactly as they do today. `squareLabel.ts` and its tests should come out of
  this story unchanged, and that is worth asserting rather than assuming.
- **An empty opening board is accepted.** All fourteen ships begin in bays
  (§4), so on the opening screen no planet is visible at all; the artwork
  appears only as the fleets move out. The owner has decided this is fine and
  prefers it to dampening a planet behind a ship, so a bay with an occupant
  draws no planet — not a faded one.
- **No randomness.** `Math.random` is banned in `src/` by lint, and a planet
  that varied per game would make two recordings of the same game look
  different. The planet table is static data.
- **Data out of the component.** Per CONTRIBUTING.md, the per-planet
  specifications and the bay → planet mapping belong in a plain module with
  plain unit tests; the component renders whatever the table hands it, and the
  fourteen designs are data, not fourteen hand-written components.
- **The artwork must not outshine the game.** Ships, site markers, the
  interaction accent and the focus ring all have to stay the most legible
  things on the board. Planets sit lower in contrast than any of them, and
  their palette should stay clear of the two side colours (`--color-green`,
  `--color-red`), the site accent, the bay cyan and the focus-ring amber, so a
  planet is never mistaken for a game-state cue.
- **The corners belong to the return cues.** Those cues are game information
  and a planet is decoration, so the decoration gives way: a planet stays
  centred and within a radius that leaves the four corner regions clear.
  Confirm this by eye on a bay actually carrying a cue rather than by
  arithmetic alone, and do not build anything that assumes the corners are
  free.
- **Colour carries no meaning at all here**, which is the one freedom this
  story has that the rest of the board does not — but it also means no
  planet's colour may imply a side or a state.
- **Still artwork.** No animation: nothing rotates, orbits or pulses. If any
  motion is ever wanted it must be gated behind `prefers-reduced-motion`, and
  this story is not the place to start.
- **The board must survive losing the bay fill.** Removing the tile colour
  leaves the border doing the work of marking a bay. If that turns out to read
  poorly on an _occupied_ bay — where the planet is hidden and the square is
  then just a bordered tile with a ship on it — the fix belongs in this story,
  not a later one.

## Out of scope

- **Any game effect whatsoever.** No planet is a site, none can be occupied,
  charged, attacked or scored; no rule mentions them.
- **The ruleset.** No change to `rules.md`, so no version bump, no changelog
  entry, no tag.
- **Artwork anywhere but the fourteen bays.** Ordinary squares, sites, ships,
  shields and the board frame are all untouched. In particular this story does
  **not** restyle `ShipIcon` or `SiteMarker`.
- **The §7.1 return-position cues.** Already on the board; this story draws
  around them and does not restyle them.
- **A background starfield, nebulae, or any other board-wide scenery.** If the
  planets make the rest of the board look bare, that is a later story.

## How this story is staged

The owner is drawing these planets with the assistant rather than receiving
fourteen finished ones, so the artwork is deliberately split across five
steps — **1, then 3, then 3, then 3, then 4** — each ending at a manual gate
where the owner looks at the board and says what to change. Expect the early
gates to send work back; that is the point of them, and a step is not finished
because it renders, only because it looks right.

**Which bays a step's planets go into is decided at its gate, not fixed
here.** No planet has any relationship to the bay it sits in, so there is
nothing to plan: the owner picks as we go, with the board in front of them.

The supporting work — the component, the data table, the tile-colour change,
the tests — sits wherever the plan needs it, ordinarily landing with or before
the first planet, and the plan is free to add steps of its own for anything
this story needs that is not a planet.

## Verification

Automated (must be green before sign-off): `npm run typecheck`, `npm run
lint`, `npm test`, `npm run format:check`, `npm run build`.

Automated tests should cover, at minimum: the table has exactly fourteen
entries, one for every square in `BAYS` and none for any other square; the
mapping is deterministic; every planet is distinguishable from every other by
its specification, not merely by colour; the artwork is `aria-hidden`; square
accessible names are unchanged from today; and a bay with a ship in it renders
no planet.

**Manual gates** — the plan should schedule these, and they are the substance
of this story rather than a formality:

1. **The look, iterated with the owner.** `npm run dev`, open the board, and
   work through the fourteen designs together. The owner expects several
   rounds here: the story fixes the intent, not the pixels. Note that this
   worktree runs alongside the main checkout, so the dev server needs a port
   of its own (`npm run dev -- --port 5373`).
2. **A ship arriving and leaving.** Move a ship out of its bay and back, and
   confirm the planet appears and disappears cleanly and that neither state
   looks like a rendering fault.
3. **Bays still read as bays** at the smallest board size, with the tile
   colour gone.
4. **Screen reader.** Moving across a bay announces exactly what it announces
   today, with no mention of a planet.

## Open items to resolve at plan time

- How the fourteen designs are parameterised: how many features (rings, moons,
  banding, limb shading) and how much each varies, balancing distinctness
  against a table nobody wants to hand-tune fourteen times.
- Whether planets need a size floor to stay legible at the 40px square
  minimum, or whether the smaller ones simply become dots.
- Whether the bay border needs any adjustment once the fill is gone.
