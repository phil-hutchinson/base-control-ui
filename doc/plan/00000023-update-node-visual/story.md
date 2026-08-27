# Story 00000023 — Update node visual

## Summary

New artwork for the four site states, replacing the markers story 20 drew.
Purely visual: no rule changes, no gameplay changes, and no change to
`rules.md` or `RULES_VERSION`.

The artwork is supplied as six SVG samples, transcribed into
[`node-artwork.md`](node-artwork.md) alongside this story. That document is
the reference for every colour, radius and gradient stop below; this one says
what to do with them.

## In scope

### 1. New site artwork

`SiteMarker.tsx` / `SiteMarker.css` are redrawn from the six samples. Each of
the four states of rules.md §8.1 gets one:

- **Dormant** — a small solid circle, pale centre to gold edge.
- **Active** — the same at twice the radius, gold throughout, fading outward.
- **Charged** — a gold circle wider than the square, cropped to it, going to
  pale wheat at the edge.
- **Depleted** — the charged shape in grey and white.

The samples are used as they stand, but for the one removal noted at the
bottom of this story. Their geometry, gradient stops and opacities are not
adjusted to taste.

### 2. A node's position in its cycle shows in its artwork

Charged and depleted are the two states with a clock on them —
`CHARGED_LIFE_PLIES` and `DEPLETED_COOLDOWN_PLIES` in `src/rules/sites.ts`.
How far through that clock a node is shows in the artwork: charged looks like
the first charged sample on the turn it wakes and like the second on its last
turn, and depleted travels the same road in the opposite direction.

One exception: a site woken already-charged by the replacement draw is first
seen one step along its cycle and shows for eight turns rather than nine, so
it never displays the start-of-cycle appearance.

Between those ends it takes intermediate positions — one per turn, following
the proportion of the clock still to run. **This is not an animation.**
Nothing transitions, eases or moves on its own; a node simply looks slightly
different on each turn of its life, and changes only when the turn does.

The one thing that varies is the middle gradient stop's offset (25%–50%, see
`node-artwork.md`). It is **calculated** from the node's state, the turn it
entered that state, and the current turn. It is not a table of nine
pre-computed appearances: the rules around site states are expected to keep
changing, and a calculation absorbs a changed clock length where a table would
have to be rewritten.

Following the project's preference for logic outside components, the
calculation belongs in a plain module with plain unit tests — `sites.ts` is
the natural home, next to the clock constants and the two predicates that
already read them. `siteStatusAt` in `src/rules/gameState.ts` already returns
the `enteredOnPly` the calculation needs, so `Board.tsx` has everything to
hand.

### 3. Site squares lose their special border

The state-coloured 2px border on `.site-marker` goes completely. A site square
keeps the ordinary 1px border every square on the grid has — what goes is the
extra border that marked it out as a site.

Bay borders are not touched by this story.

### 4. Element ids are named and made unique

The samples' ids (`i`, `h`, `f`, `e`, `d`, `d2`) are replaced with meaningful
names that include the site's square, so that seventeen sites drawn into one
document cannot collide. See `node-artwork.md`.

## Out of scope

- **Accessibility.** Per the accessibility section of `CLAUDE.md`, this story
  does not spend work preserving accessible behaviour, and adds no plan step
  for testing it. Existing automated tests are updated where the path is
  straightforward.

  One consequence to record in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`: item 3 there
  notes that three site states differ by colour alone. This story changes that
  picture rather than resolving it — dormant and active now differ from each
  other in size as well as hue, but charged and depleted become the same shape
  in two different colours. The site's state still reaches assistive technology
  through the square's accessible name (`src/board/squareLabel.ts`), which is
  unchanged.

- **Bay borders**, and the square borders of the grid generally.
- **Transitions and animation** of any kind, per section 2 above.
- **Ship, HUD and frame artwork.**

## Notes

- The `clipPath` wrapping the charged and depleted circles is **dropped**. It
  could never have had an effect — its clip region contains the whole viewBox
  — and the viewBox already crops the artwork to the square. See the closing
  note of `node-artwork.md`. This is the only departure from using the samples
  as supplied.
