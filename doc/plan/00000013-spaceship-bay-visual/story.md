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
- `SiteMarker.tsx` and `ShipModel.tsx` establish the convention this story
  follows: decorative SVG artwork in a **100 x 100 viewBox** centred on the
  square, stacked in `BoardSquare`'s single-cell grid, `aria-hidden`, with
  the meaning carried instead by the square's accessible name from
  `squareLabel.ts`.
- **Artwork already stacks under a ship and reads fine.** `.board-square` is a
  single-cell grid whose children all take `grid-area: 1 / 1` and stack in DOM
  order, marker beneath ship. A ship standing on a site sits over the site
  marker's circular artwork today without either becoming unreadable, which is
  the precedent a planet under a ship follows.
- A bay is never a site (`squareLabel.ts`: "a square is never both a bay and a
  site"), so a planet never shares its square with a `SiteMarker` — only ever
  with a ship.

## In scope

1. **A planet in each of the fourteen bays.** Drawn behind anything else in
   the square, in the same 100 x 100 viewBox the other square artwork uses, so
   it scales with the board.
2. **Each planet is visibly its own.** Distinctness comes from more than hue:
   rings of varying width and tilt, one or more moons, size, and surface
   treatment — banding, a lighter limb, mottling, a terminator. No planet is a
   flat disc of one flat colour; even the plainest carries shading or texture.
   The fourteen designs are not described here because they already exist —
   see _Where the artwork comes from_.
3. **The bay tile loses every marking it has.** Both the distinct
   `--bay-fill` background and the heavier cyan border go: a bay square is
   styled exactly like an ordinary square, with the same background and the
   same thin grid border. **The planet becomes the only thing that marks a
   bay** — nothing in the tile itself does.
4. **A planet is always drawn, ship or no ship.** A planet is drawn beneath
   the ship standing on it and both stay readable, exactly as a ship on a site
   sits over the site marker today. Nothing is hidden, faded or moved aside
   when a bay is occupied, so a bay looks like itself all game and the opening
   board — all fourteen ships in their bays (§4) — shows all fourteen planets
   from the first screen.
5. **Which planet sits in which bay is fixed.** A static table keyed by bay
   square, identical in every game and every render, so a recorded game
   replays looking exactly as it did.
6. **Similar planets are spread around the board.** The fourteen bays form a
   ring around the edge of the board, and the arrangement deliberately spaces
   like with like: ringed planets apart from other ringed planets, planets
   with moons apart from other planets with moons, cratered apart from
   cratered, and a colour scheme apart from its nearest relative. Two planets
   that resemble each other should never sit in neighbouring bays, and ideally
   sit as near to opposite each other as the ring allows.
7. **The artwork is drawn already, and is ported rather than invented.** The
   fourteen planets exist as hand-drawn SVGs in `.local/eg_planets.html`. This
   story moves them into the app essentially unchanged — it is a port, not a
   design exercise.
8. **The SVGs are cleaned up on the way in.** The ids in the source gallery
   were named ad hoc (`p1`, `p6b-sheen`, `p12blur`, `p5ringWhole`), one id is
   defined twice, and there is commented-out and dead material. All of it is
   standardised to one scheme and one place, and the dead material is dropped.
   Nothing about how a planet _looks_ changes in the process.

## Design decisions & constraints

- **Decoration is never information.** The planets are `aria-hidden` and add
  nothing to any square's accessible name: a screen-reader user hears "bay"
  exactly as they do today. `squareLabel.ts` and its tests should come out of
  this story unchanged, and that is worth asserting rather than assuming.
- **A planet and a ship share the square, and neither is dimmed.** The earlier
  intent was to hide a planet under a ship; the ship models landed since have
  made that unnecessary, so the planet stays. Both are drawn at full strength —
  no fading, no dampening, no shrinking one to make room. If a particular
  planet turns out to fight the ship on top of it, the answer is to redraw that
  planet at its gate, not to add a rule about occupancy.
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
  `--color-red`), the site accent, the interaction accent and the focus-ring
  amber, so a planet is never mistaken for a game-state cue. The bay cyan is
  no longer among them — it leaves the board with the bay border.
- **Nothing constrains where a planet sits in its square.** The square is the
  planet's to use: no safe radius, no reserved corners, no clearance rule, no
  size floor, and nothing in the code that enforces any of them. A planet may
  run to the edges or sit small in the middle. **Whether it looks right is
  settled by eye at the manual gates**, which is the only check this needs —
  so do not write a test, a lint rule or a geometry helper that polices it.
- **Colour carries no meaning at all here**, which is the one freedom this
  story has that the rest of the board does not — but it also means no
  planet's colour may imply a side or a state.
- **Still artwork.** No animation: nothing rotates, orbits or pulses. If any
  motion is ever wanted it must be gated behind `prefers-reduced-motion`, and
  this story is not the place to start.
- **The board must survive losing both bay markings.** With the fill and the
  border both gone there is no fallback: the planet alone says "bay", under a
  ship as well as in an empty square. If that turns out to read poorly in play,
  the fix belongs in this story, not a later one — but the fix is to make the
  planets carry it, not to quietly put a bay marking back.
- **`--bay-fill` and `--bay-border` should not survive the change.** If the
  two custom properties and the `.board-square--bay` rule are left behind with
  nothing reading them, the next person to touch the board finds dead styling
  that looks load-bearing. They go, along with the `Board.css` comment that
  explains them.

## Out of scope

- **Any game effect whatsoever.** No planet is a site, none can be occupied,
  charged, attacked or scored; no rule mentions them.
- **The ruleset.** No change to `rules.md`, so no version bump, no changelog
  entry, no tag.
- **Artwork anywhere but the fourteen bays.** Ordinary squares, sites, ships
  and the board frame are all untouched. In particular this story does **not**
  restyle `ShipModel` or `SiteMarker` — if a planet and the ship over it fight,
  the planet is what changes.
- **A background starfield, nebulae, or any other board-wide scenery.** If the
  planets make the rest of the board look bare, that is a later story.

## Where the artwork comes from

The fourteen planets are already drawn, in `.local/eg_planets.html` — a plain
HTML gallery of fourteen 100 x 100 SVGs shown on the board's own background
colour. That file is the source this story ports from.

**`.local/` is gitignored, so the artwork is not in the repository at all.**
Getting it under version control is part of this story rather than a
side-effect of it: until the port lands, the only copy of fourteen hand-drawn
planets is an untracked file in a working directory.

This is the path story 00000040 took for the ship models, and the plan should
follow that precedent rather than invent a new one: `.local/eg_spaceship.html`
was ported into `src/ships/`, the ids were renamed to a scheme owned by a
single module (`shipArt.ts`), and the header comment on `ShipDefs.tsx` records
where the artwork came from and that the port is otherwise verbatim.

Because the artwork already exists, this story is **not** the drawing exercise
the board-visual stories before it were. There is no reason to stage the
planets across several gates for the owner to redraw between: they are ported,
and then looked at.

## Verification

Automated (must be green before sign-off): `npm run typecheck`, `npm run
lint`, `npm test`, `npm run format:check`, `npm run build`.

Automated tests should cover, at minimum: the table has exactly fourteen
entries, one for every square in `BAYS` and none for any other square; the
mapping is deterministic; every planet is distinguishable from every other by
its specification, not merely by colour; the artwork is `aria-hidden`; square
accessible names are unchanged from today; and a bay renders its planet whether
or not a ship stands in it.

The **spread** is testable too, and should be tested, because it is the one
part of the arrangement a later edit could silently undo: no two bays adjacent
around the ring may hold planets sharing a trait — a ring, a moon, craters, or
a colour family. Every id the artwork defines must also be unique across the
whole board, since all fourteen planets are in one document at once.

Nothing tests where a planet sits inside its square or how large it is — see
_Design decisions_; that is the eye's job, not a test's.

**Manual gates** — the plan should schedule these, and they are the substance
of this story rather than a formality:

1. **The port is faithful.** `npm run dev`, open the board, and check the
   fourteen planets against `.local/eg_planets.html` side by side: each one
   should look like the drawing it came from. This is a fidelity check, not a
   design round — a planet that renders differently from its source is a port
   bug. Note that this worktree runs alongside the main checkout, so the dev
   server needs a port of its own (`npm run dev -- --port 5373`).
2. **A ship standing on a planet.** With a ship in its bay, confirm the ship
   still reads cleanly against the planet behind it and that the planet is
   still recognisably a planet — for every bay, since the fourteen designs
   differ. This gate also covers how far each planet spreads within its
   square: whether it crowds the grid lines or its neighbours is judged here,
   by eye, and nowhere else.
3. **Bays still read as bays** at the smallest board size, with both the tile
   colour and the heavier border gone and the planet doing all the work.
4. **The spread reads as spread.** Stand back from the whole board and confirm
   the ring of fourteen looks varied all the way round — no run of similar
   planets, no corner that has gone all one colour. A test can only check the
   traits the data declares; whether the board _looks_ mixed is this gate's
   call, and the arrangement is the owner's to reorder here.
5. **Screen reader.** Moving across a bay announces exactly what it announces
   today, with no mention of a planet.

## Open items to resolve at plan time

- How the fourteen designs are parameterised: how many features (rings, moons,
  banding, limb shading) and how much each varies, balancing distinctness
  against a table nobody wants to hand-tune fourteen times.
- How much of a planet a ship may reasonably cover before the design under it
  stops being worth drawing — a question for the first gate, with a ship
  parked on the first planet, not one to answer in advance.
