# Implementation plan — 00000023 Update node visual

## What this story is

New artwork for the four site states of `rules.md` §8.1, replacing the markers
story 20 drew, plus one new behaviour: a charged or depleted site's artwork
shows how far through its clock it is. Purely visual. **No rules change** — no
`rules.md` edit, no `changelog.md` entry, no `RULES_VERSION` bump. The plan
therefore has no rules step.

The artwork itself is fixed by
[`node-artwork.md`](node-artwork.md) in this folder: every colour, radius,
gradient stop and opacity comes from there and is **not** adjusted to taste.
Read that document before starting step 2; it is short and it is the
specification.

Commit `ccdae24`, which precedes this plan, is owner groundwork this story
relies on rather than a deliverable of it: it adds the "Accessibility during
pre-release" section to `CLAUDE.md` and re-scopes story 21's
`known-issues.md` from a story-20 record into the running ledger that
section points at.

## Where the work lands

| File                                                                      | What happens to it                                                    |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/rules/sites.ts`                                                      | Gains the cycle-position calculation, next to the clock constants     |
| `src/rules/sites.test.ts`                                                 | Gains unit tests for it                                               |
| `src/board/SiteMarker.tsx`                                                | Redrawn from the six samples                                          |
| `src/board/SiteMarker.css`                                                | Loses the state colours and the 2px border; keeps only the box layout |
| `src/board/BoardSquare.tsx`                                               | Threads two new values through to `SiteMarker`                        |
| `src/board/BoardSquare.css`                                               | One stale comment about the marker's borders                          |
| `src/board/Board.tsx`                                                     | Reads the fuller site status and computes the cycle position          |
| `src/board/SiteMarker.test.tsx`, `BoardSquare.test.tsx`, `Board.test.tsx` | Updated                                                               |
| `doc/plan/00000021-accessibility-tech-debt/known-issues.md`               | Gains a section for this story                                        |

## Design decisions and reasoning

This section is the design record for the story. The code does not carry design
history (see `CONTRIBUTING.md`, "Comments"), so anything a future reader needs
to know about **why** is written here.

### D1 — The cycle position is calculated in `src/rules/sites.ts`, not in a component

`CONTRIBUTING.md` states a preference for keeping logic out of components. The
cycle position is derived from the two clock constants and reads the same
`enteredOnPly`/`plyNumber` pair the two existing predicates read, so it belongs
beside them in `sites.ts`, with plain unit tests. Putting the arithmetic in
`SiteMarker.tsx` would have hidden it behind a jsdom render.

### D2 — The new function takes primitives, not a `SiteStatus`

`src/rules/gameState.ts` imports `src/rules/sites.ts`; the dependency runs one
way only, and `sites.ts` must not import `gameState.ts`. The `SiteStatus`
interface (`{ state, enteredOnPly }`) lives in `gameState.ts`, so the new
function cannot accept one. It takes the site state, the ply it entered that
state, and the current ply as separate values — the same shape as
`hasChargedNodeFinished` and `hasDepletedSiteFinishedCooling`, which take
`(enteredOnPly, plyNumber)` for the same reason.

### D3 — `sites.ts` returns a 0-to-1 proportion; `SiteMarker.tsx` owns the gradient offsets

Splitting it this way puts the rules-derived quantity ("how far through its
clock is this site?") in the rules module and the artistic mapping ("which
gradient offset does that look like?") in the artwork. It also handles the
direction reversal cleanly: charged travels 25% → 50% while depleted travels
50% → 25%, and that reversal is a fact about the pictures, not about the
clocks. Both states therefore report progress the same way — 0 on the first
turn the site is seen in that state, 1 on its last — and `SiteMarker` maps 0
and 1 to different ends of the range for each.

Rejected: having `sites.ts` return the gradient percentage directly. That would
put `25` and `50` — pure artwork numbers with no meaning in the rules — into a
rules module.

### D4 — Nine positions, calculated, not tabulated

The story is explicit: this must not be a lookup table of nine pre-computed
appearances. The site-state rules are expected to keep changing, and a
calculation absorbs a changed `CHARGED_LIFE_PLIES` or `DEPLETED_COOLDOWN_PLIES`
where a table would have to be rewritten. Both formulas are expressed in terms
of the constants, never in terms of the literal 9.

### D5 — This is not an animation

The artwork changes **only** when the ply number changes. No CSS `transition`,
no `@keyframes`, no easing, no `requestAnimationFrame`, no timers, nothing
time-driven of any kind is added by this story. A node simply looks slightly
different on each turn of its life. Anything that moves on its own is a defect
against this story, not a nice touch.

### D6 — Deriving the arithmetic from the existing predicates

The two clocks are **not** symmetrical, and the plan's formulas must agree with
the predicates already in `sites.ts` rather than being re-derived from scratch.
The reasoning, which the step-1 implementer should re-check rather than take on
trust:

**Charged.** A site becomes charged _during_ a ply — `src/rules/nodes.ts` sets
`{ state: "charged", enteredOnPly: state.plyNumber }` when a ship flies over or
lands on an active site, mid-ply. `hasChargedNodeFinished(e, p)` is
`p - e + 1 >= CHARGED_LIFE_PLIES`, and `src/rules/endOfTurn.ts` step 4 turns the
node depleted at the _end_ of the first ply for which that holds — the end of
ply `e + CHARGED_LIFE_PLIES - 1`. So the node is on screen as charged during
plies `e` through `e + CHARGED_LIFE_PLIES - 1` inclusive: nine turns, the first
of which is the turn it woke. That is exactly what the constant's doc comment
means by "counting the turn it was woken on".

Elapsed displayed turns are therefore `p - e`, running 0 through
`CHARGED_LIFE_PLIES - 1`, and progress is `(p - e) / (CHARGED_LIFE_PLIES - 1)`.

**Depleted.** A site becomes depleted at the _end_ of a ply
(`endOfTurn.ts` step 4, with `enteredOnPly` set to that ply), but it was charged
for the whole of that ply, so it is never seen depleted during ply `e` itself.
`hasDepletedSiteFinishedCooling(e, p)` is `p - e >= DEPLETED_COOLDOWN_PLIES`,
and `endOfTurn.ts` step 3 returns it to dormant at the end of the first ply for
which that holds — the end of ply `e + DEPLETED_COOLDOWN_PLIES`. So it is on
screen as depleted during plies `e + 1` through `e + DEPLETED_COOLDOWN_PLIES`
inclusive: again nine turns. The cooldown "not counting the turn it depleted
on" is precisely why the window starts at `e + 1`.

Elapsed displayed turns are therefore `p - e - 1`, running 0 through
`DEPLETED_COOLDOWN_PLIES - 1`, and progress is
`(p - e - 1) / (DEPLETED_COOLDOWN_PLIES - 1)`.

**One exception to the charged window.** The nine-turn window above holds for
the ordinary path, where `chargeSites` charges a site mid-ply. A site woken
_charged_ by the replacement draw is different: `drawReplacements`
(`src/rules/nodes.ts`) wakes an occupied site straight into charged (rules.md
§8.5's final paragraph), and it runs from `endOfTurn.ts` step 5, so
`enteredOnPly` is the ply that has just ended. Such a node is first seen during
ply `e + 1` and still depletes at the end of ply `e + CHARGED_LIFE_PLIES - 1`,
so it is on screen for eight turns, not nine, and its first displayed position
is one eighth along rather than zero.

That is the correct outcome and needs no special case: the node really does
have one turn less of life, and the artwork tracks life remaining. But it means
**a test must not assert that every charged node shows the full travel from 0
to 1**, or that the start-of-cycle appearance is always reached. Test the
formula against entry ply and current ply, not against how a node came to be
charged.

**The single asymmetry** — charged counting from `e`, depleted from `e + 1` —
mirrors exactly the `+ 1` that appears in `hasChargedNodeFinished` and not in
`hasDepletedSiteFinishedCooling`. If a future change moves one of those
predicates, the matching formula moves with it.

Both windows are nine turns wide, so both divide by eight and step by one
eighth per turn. One eighth and its multiples are exactly representable in
binary floating point, so no rounding is needed anywhere in this story.

### D7 — Clamping, and the denominator guard

Progress is clamped to the range 0 to 1. Two situations need it: hand-built
game states in tests that put a site outside its expected window, and the
early-cooling path in `src/rules/nodes.ts` (`drawReplacements` cools a depleted
site ahead of time when no dormant site is available to draw). Clamping means
the artwork always lands somewhere on the intended travel rather than running
off the end of it.

If a clock constant is ever reduced to 1 or less, the denominator is zero.
Guard that case and report progress 0 (a one-turn clock is entirely its own
first turn).

The branch is unreachable today, since both `CHARGED_LIFE_PLIES` and
`DEPLETED_COOLDOWN_PLIES` exceed 1, and it is knowingly untested for that
reason. It stays rather than being deleted because removing it would let a
future one-turn clock constant produce `NaN` from the division, which the
surrounding clamp does not catch.

### D8 — Gradient ids carry the square's name

SVG ids are document-global. Seventeen sites are drawn into one document, so
the samples' single-letter ids (`i`, `h`, `f`, `e`, `d`, `d2`) would collide and
every site would pick up whichever gradient was defined last. The story
specifies ids that include the site's square — `site-H8-fill` — so `SiteMarker`
needs to know its square's name, which means threading it Board → BoardSquare →
SiteMarker.

Rejected: React's `useId()`, which also produces document-unique ids and would
need no prop threading. The story asks for square-based names, and a readable
`site-H8-fill` is far easier to inspect in dev tools and to assert in a test
than an opaque `:r7:`. The prop-threading cost is a handful of lines plus
mechanical test updates.

### D9 — `squareName` is a required prop on `BoardSquare`, not an optional one

Making it optional would mean `Board` could silently stop passing it and every
site would share one id again — the exact bug D8 exists to prevent. Required
makes that a compile error. The cost is adding the prop to the 29 `BoardSquare`
renders in `src/board/BoardSquare.test.tsx`, which is mechanical.

### D10 — The artwork lives in the TSX, not split across the CSS

Today `SiteMarker.tsx` sets geometry and `SiteMarker.css` sets every colour.
The new artwork is a radial gradient whose middle stop offset is computed per
render, so the offsets must be in the TSX regardless. SVG `stop-color` and
`stop-opacity` _can_ be set from a stylesheet, but doing so would scatter one
picture across two files, with the colours in one and the offsets in the other,
for no gain. So: `SiteMarker.tsx` owns the whole gradient — radius, stops,
colours and opacities — and `SiteMarker.css` keeps only the element's box
(`display`, `width`, `height`).

### D11 — The `site-marker--<state>` modifier class stays

After this story no CSS rule selects on it, but it stays on the `<svg>`: it
names the state in the DOM inspector, and the existing tests in
`SiteMarker.test.tsx` and `Board.test.tsx` use it as their hook. Removing it
would cost test churn for nothing.

### D12 — Only the marker's own border goes

`.site-marker` currently carries `border: 2px solid transparent` plus a
state-coloured `border-color`. All of that goes. The ordinary 1px grid border
on `.board-square` (in `src/board/BoardSquare.css`) is untouched, and so is the
2px bay border on `.board-square--bay`. This story does not change square
borders anywhere else.

### D13 — The dropped clip path

The charged and depleted samples wrapped their circle in a `clipPath`. It is
dropped, for the reason given at the end of `node-artwork.md`: its clip circle
(`r="100"` at the centre) contains the whole 0–100 viewBox, whose farthest
corner is only about 70.7 away, so it could never have had any effect. What
actually crops the `r="70"` circle to the square is the outer `<svg>` element,
which clips to its viewport by default. Do not add a clip path back, and do not
add `overflow` rules to compensate for its absence.

### D14 — Accessibility

Per the "Accessibility during pre-release" section of `CLAUDE.md`, this story
does not spend work preserving accessible behaviour and **adds no step and no
test for accessibility**. The existing `aria-hidden`/no-title/no-desc test and
the existing axe run in `SiteMarker.test.tsx` are kept and updated where the
path is straightforward; nothing new is added. The one consequence is recorded
as a note in the tech-debt ledger (step 5). A site's state still reaches
assistive technology through the square's accessible name
(`src/board/squareLabel.ts`), which this story does not touch.

---

## Step 1 — The cycle-position calculation in `src/rules/sites.ts`

Status: committed

Add one exported function to `src/rules/sites.ts`, alongside
`CHARGED_LIFE_PLIES`, `DEPLETED_COOLDOWN_PLIES`, `hasChargedNodeFinished` and
`hasDepletedSiteFinishedCooling`. Given a site state, the ply on which the site
entered that state, and the ply now being played, it reports how far through
that state's clock the site is, as a proportion from 0 to 1 — 0 on the first
turn the site is seen in that state, 1 on the last. Dormant and active have no
clock, so for those it reports nothing at all rather than a number.

Take the arithmetic, and the reasoning behind it, from decision **D6** above,
and the clamping and zero-denominator rules from **D7**. Express both formulas
in terms of the two constants, never the literal 9 (**D4**). Do not import
anything from `src/rules/gameState.ts` — see **D2** for why that import is not
available.

Give the function a doc comment in the style of the two predicates beside it:
what it reports, and the one-line reason the charged window starts on the ply
the site entered while the depleted window starts on the ply after. Do not write
story numbers, plan references or rejected alternatives into the code
(`CONTRIBUTING.md`, "Comments").

Add unit tests to `src/rules/sites.test.ts`, in the existing
`describe("the site clocks (rules.md §8.3, §8.6)")` block or a new sibling
block. Cover:

- charged reports 0 on the ply it was charged, and 1 on the last ply
  `hasChargedNodeFinished` says it is still running;
- depleted reports 0 on the ply _after_ the one it depleted, and 1 on the last
  ply `hasDepletedSiteFinishedCooling` says it is still cooling;
- the two windows each hold nine distinct values, strictly increasing;
- the boundaries agree with the two existing predicates — write the test so it
  calls `hasChargedNodeFinished` / `hasDepletedSiteFinishedCooling` rather than
  hard-coding ply numbers, so the two cannot drift apart;
- values outside the window are clamped to 0 or 1;
- dormant and active report nothing.

Depends on: nothing. This is the bottom of the stack — pure logic with no
consumers yet.

Verification (automated): `npm run typecheck`, `npm run lint` and
`npm test` all pass, with the new `sites.test.ts` cases among them.

Notes: Added `siteCyclePosition(state, enteredOnPly, plyNumber)` to
`src/rules/sites.ts`, taking primitives per D2 and returning `undefined` for
dormant/active. Re-checked D6's reasoning against `nodes.ts`
(`wakeTouchedSites` sets `enteredOnPly: state.plyNumber` mid-ply;
`drawReplacements`'s charged-on-wake path runs from `endOfTurn.ts` step 5, so
`enteredOnPly` is the ply that just ended) and `endOfTurn.ts` (step 3 cools
depleted sites with `enteredOnPly: plyNumber` at end-of-ply, step 4 depletes
finished charged sites the same way) and agree with it: charged's window is
`p - e` over `CHARGED_LIFE_PLIES - 1` because the site is seen from the ply it
entered, while depleted's is `p - e - 1` over `DEPLETED_COOLDOWN_PLIES - 1`
because the site is never seen depleted on the ply it entered that state (it
was still charged for the whole of that ply). Added tests to a new
`describe("the site cycle position (rules.md §8.3, §8.6)")` block in
`sites.test.ts`, deriving window boundaries from `hasChargedNodeFinished` /
`hasDepletedSiteFinishedCooling` rather than hard-coded ply numbers, per D6's
instruction not to assert every charged node reaches the full 0-to-1 travel.
No deviations from the plan.

---

## Step 2 — Redraw the four states from the samples

Status: committed

Redraw `src/board/SiteMarker.tsx` and `src/board/SiteMarker.css` from the six
SVG samples in [`node-artwork.md`](node-artwork.md), and thread the square's
name down to the marker so each site's gradient gets its own id. The cycle
position is **not** wired up in this step: charged and depleted use their
start-of-cycle middle stop as a fixed value (25% for charged, 50% for depleted).
Step 3 makes that value move.

What to build:

- **`SiteMarker.tsx`.** Each of the four states draws one circle centred at
  (50, 50) in the existing `viewBox="0 0 100 100"`, filled with a radial
  gradient defined in the marker's own `<defs>`. Radii, gradient stops, colours
  and opacities come from `node-artwork.md` exactly as written there —
  dormant `r=12` with two stops, active `r=24` with two stops, charged and
  depleted `r=70` with three stops. Do not adjust them to taste. Drop the
  `clipPath` (**D13**). Keep the `aria-hidden="true"` attribute, the absence of
  `<title>` and `<desc>`, the `site-marker` class and the
  `site-marker--<state>` modifier class (**D11**).

  Two practical notes for a cold reader: in JSX the SVG stop attributes are
  written camelCase (`stopColor`, `stopOpacity`, `gradientUnits`) while ARIA
  attributes stay hyphenated; and the gradient's `r="60%"` is as supplied and is
  not the circle's radius.

  Express the per-state artwork as one small table of four state descriptors
  keyed by `SiteState`, so a state that gains or loses a property is a compile
  error rather than a silent gap — the same shape as `ARC_QUADRANT` in
  `src/board/ShipIcon.tsx`. This is a table of four _states_, which is fine; it
  is a table of nine _cycle positions_ that the story forbids (**D4**).

- **A new required `squareName` prop** on `SiteMarker`, used to build the
  gradient's id in the form `site-H8-fill` (**D8**). The circle's `fill`
  references it.

- **`BoardSquare.tsx`.** Add a required `squareName` prop (**D9**) and pass it
  through to `SiteMarker`. Nothing else about `BoardSquare` changes.

- **`Board.tsx`.** Pass the square's name — already in scope as `name` at the
  point `BoardSquare` is constructed — to `BoardSquare`.

- **`SiteMarker.css`.** Reduce to the element's box only: `display: block`,
  `width: 100%`, `height: 100%`. Remove the `border` declaration and every
  `border-color`, the `--site-lit` and `--site-glow` custom properties, all four
  state colour rules and the charged `background: radial-gradient(...)`. Replace
  the file's header comment, which describes the old artwork, with one
  describing the new arrangement (**D10**: the TSX owns the picture, this file
  owns the box). See **D12** for what is deliberately _not_ removed.

- **`BoardSquare.css`.** The comment above `.board-square__mark` refers to "the
  site marker's amber and grey/white borders" as one of the colours the
  interaction accent is kept distinct from. Those borders no longer exist;
  update the sentence so it names the marker's gold and grey/white artwork
  instead.

Test updates:

- **`SiteMarker.test.tsx`.** Keep the existing modifier-class test, the
  decorative test (`aria-hidden`, no `<title>`/`<desc>`, no text) and the axe
  run as they are. Update the "exactly one centred circle" test, which still
  holds but whose radius now varies by state, and add assertions that each
  state draws the radius, stop offsets, stop colours and stop opacities
  `node-artwork.md` specifies, and that the circle's fill references a gradient
  id built from the `squareName` prop. Do **not** add new accessibility tests
  (**D14**).
- **`BoardSquare.test.tsx`.** Add the now-required `squareName` prop to all 29
  `<BoardSquare .../>` renders. Mechanical; no assertions change.
- **`Board.test.tsx`.** Existing `.site-marker` queries continue to pass. Add
  one test that renders the starting board and asserts the seventeen gradient
  ids are all distinct — the guard against the collision D8 describes.

Depends on: nothing from step 1. Step 3 depends on this step for the gradient
structure it will vary.

Verification (automated): `npm run typecheck`, `npm run lint` and `npm test`
all pass, including the updated `SiteMarker.test.tsx` assertions for all four
states' geometry and gradient stops and the new distinct-ids test in
`Board.test.tsx`.

Notes: Redrew `SiteMarker.tsx` around a `SITE_ARTWORK` table (`Record<SiteState,
...>`) holding each state's radius and gradient stops, transcribed from
`node-artwork.md`; charged and depleted use their fixed start-of-cycle middle
stop (25% / 50%) as instructed, ready for step 3 to make it move. Added the
required `squareName` prop to `SiteMarker` and `BoardSquare` and threaded
`name` through from `Board.tsx`, and reduced `SiteMarker.css` to the element's
box per D10, leaving `.site-marker--<state>` in place per D11 and removing
only the marker's own border per D12. Updated the `.board-square__mark`
comment in `BoardSquare.css` per the step's wording change. Updated
`SiteMarker.test.tsx` (added per-state radius/stop/gradient-id assertions,
kept the existing modifier-class, decorative and axe tests), mechanically
added `squareName` to all 29 `BoardSquare` renders in `BoardSquare.test.tsx`
via a scripted find/replace plus a Prettier pass, and added a
`Board.test.tsx` test asserting the seventeen rendered gradient ids are all
distinct. No deviations from the plan. `npm run typecheck`, `npm run lint`,
`npm test` (676 tests) and `npm run format:check` all pass.

---

## Step 3 — Make the middle stop follow the site's position in its cycle

Status: committed

Wire step 1's calculation into step 2's artwork, so a charged node's middle
gradient stop sits at 25% on the turn it wakes and travels outward to 50% on its
last turn, and a depleted site's sits at 50% on its first cooling turn and
travels back inward to 25% on its last.

What to build:

- **`Board.tsx`.** Switch from `siteStateAt` to `siteStatusAt` (both are
  exported from `src/rules/gameState.ts`; `siteStatusAt` returns
  `{ state, enteredOnPly }`). Derive the site state from the status for the
  existing `siteState` prop and the accessible name, and call step 1's function
  with the status and `session.state.plyNumber` to get the cycle position. Pass
  the result to `BoardSquare`. Everything needed is already in scope at that
  point in the grid-building callback. `siteStateAt` stays exported — other
  rules modules use it — so nothing becomes dead code.

- **`BoardSquare.tsx`.** Add an optional `cyclePosition` prop and pass it
  through to `SiteMarker`. Optional, because dormant and active sites have no
  cycle position and because it keeps the existing `BoardSquare` test renders
  valid.

- **`SiteMarker.tsx`.** Accept the optional cycle position and map it to the
  middle stop's offset: charged runs 25% → 50% as it goes 0 → 1, depleted runs
  50% → 25%. When it is absent, use the start-of-cycle offset for the state, so
  the marker is never in an undefined-looking place. Keep the two range ends as
  named constants rather than literals buried in the markup, and do not round —
  with a nine-turn clock every step is an exact eighth (**D6**). Dormant and
  active have no middle stop and ignore the value entirely.

  **This is not an animation** (**D5**): the offset is recomputed on render
  because the ply number changed, and nothing else. Add no transition, no
  keyframes, no easing, no timer.

Test updates:

- **`SiteMarker.test.tsx`.** Assert the middle stop offset for charged at cycle
  position 0, 0.5 and 1, and for depleted at the same three, showing the two
  travel in opposite directions and meet in the middle; and assert that with no
  cycle position given each falls back to its start-of-cycle offset.
- **`Board.test.tsx`.** Add an end-to-end check that the wiring reads the right
  plies: build a game state with a charged site whose `enteredOnPly` is a known
  ply and assert the rendered middle stop is at the start-of-cycle offset when
  `plyNumber` equals that ply and at the end-of-cycle offset on its last charged
  ply; then the same for a depleted site, remembering that its window starts the
  ply _after_ `enteredOnPly` (**D6**). `Board.test.tsx` already builds custom
  states with an explicit `siteStates` map, so follow the existing pattern
  there. Derive the last ply of each window from `CHARGED_LIFE_PLIES` /
  `DEPLETED_COOLDOWN_PLIES` rather than hard-coding it.

Depends on: Step 1 (the calculation) and Step 2 (the gradient the offset lives
in, and the props already threaded to `SiteMarker`).

Verification (automated): `npm run typecheck`, `npm run lint` and `npm test`
all pass, including the new offset assertions in `SiteMarker.test.tsx` and the
new ply-driven assertions in `Board.test.tsx`.

Notes: `Board.tsx` now calls `siteStatusAt` and passes `siteStatus.state` as
`siteState` and `siteCyclePosition(siteStatus.state, siteStatus.enteredOnPly,
session.state.plyNumber)` as the new `cyclePosition` prop, threaded through
`BoardSquare` (an optional prop, per the plan, so existing `BoardSquare` test
renders stay valid) to `SiteMarker`. `SiteMarker.tsx` replaced the fixed
`SITE_ARTWORK` table from step 2 with a `siteArtwork(state, cyclePosition)`
function — an exhaustive `switch` over `SiteState` with no `default`, which
`strict` TypeScript still rejects at compile time if a case is dropped,
preserving the compile-safety property the table gave — because charged's
and depleted's middle stop is now a value computed from `cyclePosition`
rather than a literal; the other three stops and both states' radii are
unchanged literals. The two range ends (25/50 for charged, 50/25 for
depleted) are named constants (`CHARGED_START_OFFSET_PERCENT` etc.) read by
one small `middleStopOffsetPercent` helper that linearly interpolates and
returns the start value when `cyclePosition` is `undefined`; no rounding, so
the eighth-turn steps stay exact per D6. Added `SiteMarker.test.tsx` cases
asserting the middle stop at cycle positions 0, 0.5 and 1 for both charged
and depleted (opposite directions, meeting at 37.5% in the middle) and the
start-of-cycle fallback with no `cyclePosition` given; added a
`Board.test.tsx` describe block with a hand-built single-site state asserting
the rendered offset at the first and last ply of each window, deriving the
last plies from `CHARGED_LIFE_PLIES`/`DEPLETED_COOLDOWN_PLIES` and the
depleted window's `enteredOnPly + 1` start per D6, rather than hard-coding
ply numbers. No deviations from the plan. `npm run typecheck`, `npm run
lint`, `npm test` (688 tests) and `npm run format:check` all pass.

---

## Step 4 — Look at it

Status: committed

No code. This is the owner's visual gate on a story whose whole point is how
the board looks.

Depends on: Steps 2 and 3 (the artwork and its cycle behaviour must both be in
place).

Verification (manual): Run `npm run dev`, open the app, and check:

- The starting board shows five small gold-edged discs where the active sites
  are and twelve smaller pale-centred ones on the dormant sites, and no site
  square has a coloured border of its own — just the ordinary thin grid line
  every square has.
- Bay squares still have their cyan border, unchanged.
- Fly a ship onto a site and confirm it becomes a large gold glow filling the
  square, cropped by the square's edges but not quite reaching the corners.
- Play on and watch that node across its nine turns: its appearance should
  shift slightly each turn and be **static within a turn** — nothing fading,
  sliding or pulsing between turns. Compare the first turn against the last;
  the difference should be visible but subtle.
- When it runs out, the square turns grey and white in the same shape, and
  travels back the other way over its cooldown.
- A ship standing on a site is still drawn on top of the marker and is still
  legible against the charged and depleted artwork.

Notes: Checked by the owner and passed — the artwork, the removed site border,
the untouched bay borders and the per-turn travel all behave as intended.

The owner noted one thing for **a future story, deliberately not addressed
here**: the ships will want restyling so the nodes read more clearly beneath
them. That is a change to ship artwork, which this story puts out of scope, and
it is not a defect in what this story delivered.

---

## Step 5 — Record the accessibility consequence

Status: committed

Append a new section to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, headed for this
story and matching the structure of the existing "From story 20 — visual
touch-ups" section (a story heading, then numbered items, each ending with a
"Where:" line naming the files).

Record the one consequence the story identifies: item 3 of the story-20 section
says three site states differ by colour alone. This story changes that picture
rather than resolving it — dormant and active now differ from each other in size
as well as hue, but charged and depleted become the same shape in two different
colours (gold-and-wheat against grey-and-white). Say so plainly, note that a
site's state still reaches assistive technology through the square's accessible
name (`src/board/squareLabel.ts`, unchanged by this story), and give the files
as `src/board/SiteMarker.tsx` and `src/board/SiteMarker.css`. Do not edit or
delete the story-20 items; that section is the record of what story 20 accepted.

Nothing else goes in this file. It is a ledger of knowingly accepted costs, not
an audit, so do not add anything the story did not accept (`CLAUDE.md`,
"Accessibility during pre-release").

Depends on: Steps 2 and 3, whose change is what the note describes.

Verification (automated): `npm run format:check` passes (Prettier formats
Markdown in this repository), and the file contains the new section with the
story-20 section intact above it.

Notes: Appended a "From story 23 — update node visual" section to
`known-issues.md`, `###`-level and numbered from 1 within the new section,
matching the story-20 section's structure. Split the consequence into two
items rather than one: item 1 covers the artwork change (dormant/active gain
a size distinction so that pair is resolved, but charged/depleted become the
same shape differing only by colour, moving story 20's item 3 gap to a
different pair of states) and item 2 covers the removal of the marker's own
2px state-coloured border. Both name `src/board/SiteMarker.tsx` and
`src/board/SiteMarker.css` on their `Where:` line and note that a site's
state still reaches assistive technology via the unchanged
`src/board/squareLabel.ts`. Did not touch the story-20 section or preamble.
One deviation from the plan: split the single consequence the plan described
into the two items above, rather than recording it as one. `npm run
format:check`, `npm run typecheck`, `npm run lint` and `npm test` (688 tests)
all pass.

---

## Step 6 — README check

Status: committed

Confirm `README.md` is still accurate given this story. Run the
`/update-readme` command, which reviews the current branch diff and updates the
README if warranted.

The expected outcome is **no change**: the README describes how the game is
played — nodes lighting up, paying energy, running out after nine turns — and
never describes the markers' colours or shapes, and this story changes no rule
and no wording. If `/update-readme` proposes an edit anyway, apply it only if it
reflects something this story actually changed.

Depends on: all previous steps, so the diff it reviews is complete.

Verification (automated): `/update-readme` reports no change needed, or its
change is applied and `npm run format:check` passes.

Notes: Reviewed the branch diff against `README.md`. Almost all of it stands:
the story changes no rule, no setup step and no project status, and the README
never described the markers' colours or shapes.

One clause was added, against the plan's expectation of no change. The story
gives a player information they could not previously read off the board — how
much life a charged node has left — and the status paragraph is where the
README lists what the app now lets a player do. The sentence "A node runs out
after nine turns" gained "its glow shifts a little on each of them, so you can
see roughly how much life it has left". The surrounding paragraph was rewrapped
to keep the line width even, so the diff is wider than the edit; a word-by-word
comparison confirms that clause is the only change.

Verification (automated): `npm run format:check` passes.
