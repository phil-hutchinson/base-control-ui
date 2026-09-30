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
- **Keep the 1px weight.** Outline and cross lines keep today's 1px weight
  at every size, using `vector-effect: non-scaling-stroke`. The owner
  judged the look right and the rendering wrong, so the weight stays. A
  stroke scaled in viewBox units would thicken in landscape, where the row
  grows with the digits.
- **The cross ends on the circle's rim.** Each diagonal runs between the
  two points where it meets the circle, so no clip path is needed. A clip
  path would need a document-unique id for every pip.
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
tests) pass. The manual check is left to the owner at sign-off.

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

Status: pending

Run `/update-readme`. The README is not expected to describe how pips are
drawn, so no update is expected.

Depends on: Step 1.

Verification (automated): the README either needs no change or is updated
to match.
