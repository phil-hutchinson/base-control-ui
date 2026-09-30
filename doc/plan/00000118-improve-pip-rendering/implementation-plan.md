# Implementation Plan — Story 00000118, Improve pip rendering

## What this story does

Redraws the HUD's score pips (`src/hud/ScoreDisplay.tsx`,
`src/hud/ScoreDisplay.css`) as small inline SVGs in place of CSS-styled
`<span>`s, so their circles and the Required option's crosses come out
smooth. Nothing about which pips a row has, or how they light, changes.

`story.md` in this folder is the owner's statement of the change.

## Process

This story is small enough that the owner asked for it to be implemented
inline in the main session rather than through the `/implement-story`
agent pipeline. The deliverables are unchanged: this plan, per-step
Status and Notes, one commit per step, and a peer review by the
`peer-review` agent in its own context.

## Decisions

- **Why SVG.** A pip was an `em`-sized box turned into a circle by
  `border-radius: 50%` with a 1px border, and the Required cross was two
  1px hard-stop `linear-gradient` diagonals in its background. At the sizes
  the pip row draws, both snap to whole device pixels: the circle comes out
  jagged, and the gradient lines thin out or break up depending on where
  the pip lands. The board's own circles (`NodeMarker.tsx`) are SVG and
  render smoothly, so the pips follow them.
- **The `<svg>` takes over the pip `<span>`'s class and style.** The pip
  element keeps `score-display__pip` and its `--lit` / `--x` modifiers, and
  still carries `--pip-fill` as an inline custom property. Every existing
  selector in `ScoreDisplay.test.tsx` and `App.test.tsx` therefore keeps
  working, and the colour logic in `pipFills` is untouched.
- **Colours stay in the stylesheet.** The circle and lines take their fill
  and stroke from CSS (`--pip-fill`, `--color-node-charged`,
  `--color-text-bright`) rather than from presentation attributes, so the
  palette tokens remain the single place pip colours come from, as before.
- **A fixed 2px weight.** Outline and cross lines keep a fixed pixel
  weight at every size, using `vector-effect: non-scaling-stroke`. A
  stroke scaled in viewBox units would thicken in landscape, where the row
  grows with the digits. Step 1 kept the old border's 1px. At sign-off the
  owner doubled it to 2px (Step 3), because 1px still read as too thin.
- **The cross ends on the circle's rim.** Each diagonal runs between the
  two points where it meets the circle, so no clip path is needed. A clip
  path would need a document-unique id for every pip.
- **The cross is drawn under the outline.** In Step 1 the lines came
  after the circle, so their ends painted over the white outline where the
  two met. At sign-off the owner asked for the cross to sit inside the
  circle instead. The lines now come first in the SVG, and the circle's
  outline covers their ends (Step 3).
- **The glow becomes `filter: drop-shadow`.** `box-shadow` on an `<svg>`
  follows its square box, not the circle, so the lit pip's glow moves to a
  drop-shadow filter of the same colour.
- **Accessibility**: the pip row is already `aria-hidden`. This story costs
  no accessible behaviour, so nothing is recorded in the ledger.
- **No ruleset change.** The story only changes how pips are drawn: no
  version bump and no changelog entry.

## Steps

### Step 1 — Draw pips as SVG

Status: committed

Notes: Implemented as planned, with a 10-unit viewBox and a circle of
radius 4.5. The two tests that read `--pip-fill` off a pip now type the
element as `SVGElement`. Typecheck, lint and the full suite (92 files, 2055
tests) pass. The owner did the manual check at sign-off (see Step 3).

- `src/hud/ScoreDisplay.tsx`: each pip becomes an `<svg>` with a small
  square viewBox. It carries the class and style the `<span>` had, and
  holds one circle, plus the two rim-to-rim diagonal lines for a crossed
  pip only.
- `src/hud/ScoreDisplay.css`: the pip rule keeps its `0.6em` size and
  becomes a block-level svg. The border, border-radius, background and
  gradients go. The circle's stroke and fill, the lit fill and glow, and
  the cross lines' stroke are styled as described under Decisions. The
  comments on the rewritten rules say how a pip is now drawn. The
  long-row and landscape sizing rules are unchanged: they scale the row's
  font-size, which the svg's `em` size follows.
- Tests: add an assertion to `ScoreDisplay.test.tsx` that a crossed pip
  draws two lines and an uncrossed one draws none. Otherwise the existing
  selectors should pass unchanged.

Depends on: nothing.

Verification (automated): `npm run typecheck`, `npm run lint` and the full
`npm test` pass.

Verification (manual): the owner runs a steal game with Required and
Double on, and checks that unlit, lit and crossed pips look smooth in
portrait and landscape, including the six-pip row.

### Step 2 — README check

Status: committed

Notes: `README.md` does not mention pips or how the HUD is drawn, so it
needs no update. Checked directly rather than through `/update-readme`,
since the diff touches only the pip drawing.

Run `/update-readme`. The README is not expected to describe how pips are
drawn, so no update is expected.

Depends on: Step 1.

Verification (automated): the README either needs no change or is updated
to match.

### Step 3 — Sign-off tweaks

Status: committed

Notes: Implemented as listed. Typecheck, lint and the full suite (92
files, 2055 tests) pass. The owner checked the result in the app and signed it off.

Changes the owner asked for at sign-off, after the peer review:

- Double the outline and cross stroke weight to 2px (`ScoreDisplay.css`).
- Draw the cross's lines before the circle, so the outline covers their
  ends (`ScoreDisplay.tsx`).
- While that markup is rewritten, apply peer-review items 3 and 4. Name
  the viewBox size and centre, and build the two diagonals from one list.
  In the crossed-pip test, assert directly that uncrossed pips draw no
  lines.
- Answer peer-review items 1 and 2 in comments: why the drop-shadow blur
  value was halved, and that the radius does not keep the outline inside
  the box.

Depends on: Step 1. It follows the README check only because it came
after the review. It changes nothing the README describes.

Verification (automated): `npm run typecheck`, `npm run lint` and the full
`npm test` pass.

Verification (manual): the owner checks the thicker outline and cross,
and that the cross no longer paints over the outline.
