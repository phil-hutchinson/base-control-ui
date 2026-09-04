# Accessibility tech debt

While the game is pre-release, stories do not spend work keeping accessibility
intact through a change of any kind — visual, gameplay, or otherwise (see the
accessibility section of `CLAUDE.md`). Where a change costs an accessible
behaviour, the cost is accepted and recorded here rather than paid, so the
eventual accessibility story picks it up deliberately.

This is the single ledger for those notes, and it grows a section per story
that adds to it. **It is not an audit** of the app's accessibility — nothing
here was found by looking for problems, and nothing is listed that a story did
not knowingly accept.

## From story 20 — visual touch-ups

Sources: `doc/plan/00000020-visual-touch-ups/implementation-plan.md` decisions
D2 and D10, and comments 1 and 9 of its `peer-review.md`, both closed as won't
fix by the owner.

### 1. The game-over announcement can go unspoken

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

### 2. No `<h1>` while the game-over panel is up

The panel's heading stays an `<h2>`, exactly as before, but it used to sit over
a page whose title provided the `<h1>`. Now the panel replaces the whole
cabinet, so at game over the document has no top-level heading at all.

Where: `src/hud/GameOverPanel.tsx`, `src/App.tsx`.

### 3. Three site states differ by colour alone

The site marker used to differ by line treatment as well as hue — dashed,
solid, double, dotted. The new artwork gives depleted, dormant and active the
same shape and border and distinguishes them only by colour; charged is
unmistakably different. This is a deliberate regression of a non-colour cue.

It is mitigated but not resolved: a site's state still reaches assistive
technology through the square's accessible name (`src/board/squareLabel.ts`),
so a screen-reader user is unaffected. The loss falls on a sighted player who
cannot separate grey, white and orange-yellow.

Where: `src/board/SiteMarker.tsx`, `src/board/SiteMarker.css`.

### 4. The final "+N" energy overlay is cut short

The floating "+N" runs for 1.2s, but on the final turn the board is replaced
after roughly 0.6s, when the score count-up settles. The last one is therefore
truncated. Recorded with the other two D10 consequences as
accessibility-adjacent: it shortens the time available to notice the game's
last scoring event.

Where: `src/board/EnergyOverlay.tsx`, `src/App.tsx`.

### 5. The assembled game-over page has no axe check

`App.test.tsx` runs axe only against a game in progress, and
`GameOverPanel.test.tsx` checks the panel in isolation. Nothing checks the
full-cabinet game-over page — which is the one state issue 2 above describes,
so the gap hides a consequence the story already accepted.

Adding this check will likely fail on the missing `<h1>` until issue 2 is
fixed, so the two belong together.

Where: `src/App.test.tsx`.

### Considered, not an issue

The unlit shield arcs added by this story distinguish present from missing
shielding by colour (ship colour against grey), but the square's accessible
name states the ship's shield count in words, including zero, so the
information does not depend on seeing the ring.

## From story 23 — update node visual

Source: `doc/plan/00000023-update-node-visual/implementation-plan.md` decision
D14, and `doc/plan/00000023-update-node-visual/story.md`, "Out of scope".

### 1. Charged and dormant are now the same shape, differing by colour alone

Item 3 above, from story 20, described depleted, dormant and active sharing
one shape and border, distinguished only by colour, with charged
"unmistakably different." This story redraws all four states with new
artwork instead of resolving that: charged and depleted (renamed dormant by
story 27) have become the same shape — a wide circle filling the square, one
gold-and-wheat, the other grey-and-white — differing only by colour. The
colour-alone gap moves to a different pair of states rather than closing.

As before, a site's state still reaches assistive technology through the
square's accessible name (`src/board/squareLabel.ts`), unchanged by this
story, so a screen-reader user is unaffected.

Where: `src/board/SiteMarker.tsx`, `src/board/SiteMarker.css`.

### 2. The charged/dormant distinction is gameplay-relevant, not just visual

A charged node pays energy to the player standing on it at the end of their
turn; a dormant node pays nothing. Now that the two share one shape, telling
them apart rests entirely on gold-and-wheat against grey-and-white — colours
that are hard or impossible to separate without colour vision. A player who
cannot make that separation can lose track of which nodes are still worth
holding, not merely see a less distinct board.

Where: `src/board/SiteMarker.tsx`, `src/board/SiteMarker.css`.

## From story 29 — variable node durations

Source: `doc/plan/00000029-variable-node-durations/implementation-plan.md`
decisions D13 and D17, step 6.

### 1. An active site's pressure is visible only in its artwork

An active site now carries pressure (rules.md §8.2), and the marker's size and
warmth travel from a small pale disc at pressure 1 to today's larger gold disc
at the cap. That travel is the only place the number appears: the square's
accessible name still says "active site" and nothing more, so a screen-reader
user cannot tell a freshly cycled site from one that has waited a long time.
This joins the charged and dormant cycle position, which already does not
reach assistive technology.

Where: `src/board/SiteMarker.tsx`, `src/board/squareLabel.ts`.

## From story 35 — a start screen, a new name, and two options

Source: comment 12 of `doc/plan/00000035-splash-screen-and-options/peer-review.md`.

### 1. Neither new screen swap moves focus

This story adds two whole-screen swaps — PLAY, and the game-over panel's
button back to the start screen — and neither moves focus. A keyboard or
screen-reader user lands wherever focus already was (often the document
root) each time, rather than at the screen that just appeared.

Where: `src/App.tsx`, `src/useAppScreen.ts`.

## From story 39 — adaptive screen layout

Source: `doc/plan/00000039-adaptive-screen-layout/implementation-plan.md`
decision D9.

### 1. The reserved placeholder is stray text with no context

**Resolved by story 48.** Story 48 removed the `RESERVED` placeholder and
gave the region's contents `aria-hidden`, which is exactly what this entry
asked the later story to do.

The reserved region's only content is the bare word `RESERVED`, added as
placeholder text so a later story can see the region is there, is the right
size, and is in the right place. It carries no role, no accessible name and
no `aria-hidden` — a screen reader passing through the document reads it out
with nothing saying what it is or why it is there. This is deliberate: giving
it `aria-hidden` would be a considered accessibility act on a placeholder,
and pre-release stories do not spend work here (`CLAUDE.md`). The later story
that fills the region should replace this placeholder rather than build
around it.

Where: `src/App.tsx`, `src/App.css`.

## From story 48 — an optional clock

Source: `doc/plan/00000048-add-optional-timer/implementation-plan.md`
decision D18.

### 1. The clock readings are not announced

Below fifteen seconds a clock's reading changes ten times a second; a value
changing that fast cannot go through a live region without drowning out
everything else the game announces. The readings are decorative text only,
readable by sight but not spoken.

Where: `src/clock/ClockRegion.tsx`.

### 2. No warning reaches a screen-reader user that their time is running out

A clock at zero flashes, but the flash is a visual cue only — nothing tells a
screen-reader user their clock is low or has run out, short of the pass
sentence once it actually happens (see below).

Where: `src/clock/ClockRegion.tsx`, `src/clock/ClockRegion.css`.

### 3. A chained pass loses its first sentence

When an out-of-time pass is immediately followed by the opponent having no
legal action, the session records only the last pass effect as `lastEvent`
(D7), so only the second sentence is spoken. The out-of-time pass itself
**is** announced whenever it stands alone, since it goes through the existing
pass sentence.

Where: `src/game/session.ts`.

## From story 54 — nodes that move around the board

Source: `doc/plan/00000054-random-node-spawn/implementation-plan.md`, Step 9's
notes, and the owner's decision at that manual gate.

### 1. The replacement clause mixes present and past tense

The end-of-turn announcement's new `node-replaced` clause reads "The node at
D8 is gone, and a new node appeared at K11." Its sibling clauses are past
tense — "The node at H8 ran out." and "A new node charged at H8." — so this
one mixes present and past.

The owner deliberately did not judge the wording at the Step 9 gate: the
announcement reaches only the live region, which makes it assistive-technology
surface, and `CLAUDE.md` defers that work pre-release. The wording is
therefore knowingly accepted as written. The consistent alternative, for
whoever picks this up: "The node at D8 ended, and a new node appeared at
K11."

Where: `src/board/announcements.ts`.
