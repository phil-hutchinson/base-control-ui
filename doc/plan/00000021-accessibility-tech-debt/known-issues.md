# Accessibility tech debt from story 20

Story 00000020 (visual touch-ups) put accessibility changes out of scope, so
where a visual change cost an accessible behaviour, the cost was accepted and
recorded rather than paid. This document lists what that story **knowingly**
introduced, so the accessibility story picks it up deliberately. It is not an
audit of the app's accessibility — nothing here was found by looking for
problems, and nothing outside story 20 is included.

Sources: `doc/plan/00000020-visual-touch-ups/implementation-plan.md` decisions
D2 and D10, and comments 1 and 9 of its `peer-review.md`, both closed as won't
fix by the owner.

## 1. The game-over announcement can go unspoken

`App` renders either the game or the game-over panel, so ending the game
unmounts the board — and with it the grid's `role="status"` live region — in
the same commit that writes "The game is over after N rounds. …" into that
region. When the last turn scores energy the board stays up for the count-up
and the sentence is spoken; when it scores nothing, the region very likely
goes away before the announcement is read.

The result is not silently lost: the panel takes focus when it appears and
carries the result as a visually hidden sentence. But the live-region
announcement this story left in place is now unreliable.

Where: `src/App.tsx` (the game-over either/or), `src/board/grid/AccessibleGrid`
(the live region). Suggested direction from the review: hoist a live region
into `App`, outside the swapped subtree.

## 2. No `<h1>` while the game-over panel is up

The panel's heading stays an `<h2>`, exactly as before, but it used to sit over
a page whose title provided the `<h1>`. Now the panel replaces the whole
cabinet, so at game over the document has no top-level heading at all.

Where: `src/hud/GameOverPanel.tsx`, `src/App.tsx`.

## 3. Three site states differ by colour alone

The site marker used to differ by line treatment as well as hue — dashed,
solid, double, dotted. The new artwork gives depleted, dormant and active the
same shape and border and distinguishes them only by colour; charged is
unmistakably different. This is a deliberate regression of a non-colour cue.

It is mitigated but not resolved: a site's state still reaches assistive
technology through the square's accessible name (`src/board/squareLabel.ts`),
so a screen-reader user is unaffected. The loss falls on a sighted player who
cannot separate grey, white and orange-yellow.

Where: `src/board/SiteMarker.tsx`, `src/board/SiteMarker.css`.

## 4. The final "+N" energy overlay is cut short

The floating "+N" runs for 1.2s, but on the final turn the board is replaced
after roughly 0.6s, when the score count-up settles. The last one is therefore
truncated. Recorded with the other two D10 consequences as
accessibility-adjacent: it shortens the time available to notice the game's
last scoring event.

Where: `src/board/EnergyOverlay.tsx`, `src/App.tsx`.

## 5. The assembled game-over page has no axe check

`App.test.tsx` runs axe only against a game in progress, and
`GameOverPanel.test.tsx` checks the panel in isolation. Nothing checks the
full-cabinet game-over page — which is the one state issue 2 above describes,
so the gap hides a consequence the story already accepted.

Adding this check will likely fail on the missing `<h1>` until issue 2 is
fixed, so the two belong together.

Where: `src/App.test.tsx`.

## Considered, not an issue

The unlit shield arcs added by this story distinguish present from missing
shielding by colour (ship colour against grey), but the square's accessible
name states the ship's shield count in words, including zero, so the
information does not depend on seeing the ring.
