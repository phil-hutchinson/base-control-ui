# Implementation Plan — Story 00000117, A Node scramble animation

## What this story does

When a Node scramble bonus is claimed (steal.md §10), every prospective
square whose signal the shuffle changed plays a short sweep: its rings are
repainted from the old signal's colour to the new one, starting at 12
o'clock and travelling clockwise. Squares the shuffle left on the same
signal do not animate. What a scramble does is unchanged.

`story.md` in this folder is the owner's statement of the change.

## Process

This story is small enough that the owner asked for it to be implemented
inline in the main session rather than through the `/implement-story`
agent pipeline. The deliverables are unchanged: this plan, per-step
Status and Notes, one commit per step, and a peer review by the
`peer-review` agent in its own context.

## Decisions

- **The rules layer reports what a scramble recoloured.** Today a scramble's
  `activity-bonus-claimed` effect says nothing about the shuffle ("the new
  node map already shows it"), and a `Session` keeps only the state after
  the event, so the board has no way to know a square's old signal. The
  shuffle already knows each square's signal before and after, so
  `shuffleProspectiveSignals` returns the squares whose signal changed,
  each with its old and new signal, and that list travels up through
  `ActivityBonusClaimOutcome` into `ActivityBonusClaimedEffect` as a new
  field (empty for every other kind), the same way `addedSquares` already
  does for Additional nodes. This is descriptive only: no draw, no seed
  step and no resulting state changes, so recorded games replay exactly.
  Only changed squares are listed, since only they animate; a square that
  kept its signal is not a "recolour".
- **The board compares against the state it is about to draw.**
  `boardAnimations` walks the event's top-level effects for scramble
  claims and, per square, takes the old signal from the **first** claim
  that recoloured it — a fight can in principle carry two claims (attacker
  then defender), and the sweep should start from what was on screen
  before the event. It then animates the square only if the current state
  still shows it prospective with a **different** signal. That makes the
  animation always end on exactly what the board would draw anyway, even
  if a second scramble in the same fight put a square back on its old
  signal (no animation — nothing visibly changed).
- **A square the event itself made prospective does not sweep.** One move
  can abandon a node and then claim a Node scramble (steal.md §10 resolves
  the leave first), and a fight can carry an Additional nodes claim before
  a scramble; the fresh square is then shuffled, but it was empty on screen
  before the event, so there is no old colour to sweep from. It appears in
  its final colour, like any other newly drawn square. Found in peer review
  (#1).
- **A new square-animation kind, `node-recolor`**, alongside `node-charge`,
  `node-burnout` and `rotator-turn`, carrying the old signal and the side
  it was matched to (`matchedSideForSignal` on the current state — the
  matching setting and node count do not change in a game). It carries the
  old matched side itself because `NodeMarker`'s `matchedSide` prop is the
  *current* signal's. It never collides with the other kinds: a scramble
  recolours only prospective squares, while charge and burnout play on
  charged and depleted squares, and rotators do not exist under steal. The
  existing entry wins if one ever did, which keeps the rule "one animation
  per square" without ranking.
- **How the sweep is drawn.** While `recolorAnimation` is given, a
  prospective `NodeMarker` draws the old-colour rings underneath and the
  new-colour rings on top. Each top ring is dashed to exactly its own
  circumference and its dash offset animates from the full circumference
  down to zero, so the ring is revealed along its own path. An SVG circle's
  path starts at 3 o'clock and runs clockwise on screen, so the top rings
  are rotated a quarter turn back about the marker's centre to start at 12.
  The circumference is computed per radius in the component (passed as a
  CSS custom property) rather than using `pathLength`, which has had uneven
  support on `<circle>`. All three rings share one duration and easing, so
  they sweep together as one hand.
- **The underlay must disappear when the sweep ends.** Two strokes of the
  same radius and width do not cover each other perfectly: anti-aliased
  edges would leave a faint fringe of the old colour for as long as the
  last event stands. Following the file's existing idiom (the charge
  animation's outgoing rings), the underlay's base style is invisible and
  its keyframes hold it visible until the very end; with reduced motion,
  animations are off, so the underlay is simply never seen and the new
  rings are drawn whole — the colours change at once, as the story asks.
- **A new move cuts it short** for free: animations derive from
  `session.lastEvent`, and the sweep's SVG is keyed on `runId` like the
  other animations.
- **Duration** is a starting value for the owner's eye (the story says half
  a second to a second); 700ms, a linear sweep so the hand moves at a
  steady clock-like pace. Tuned in Step 3.
- **No ruleset change**, no version bump, no changelog entry. No Quick Guide
  change: its diagrams are static.
- **Accessibility**: reduced motion keeps today's instant change, and the
  announcement is untouched, so nothing is recorded in the accessibility
  ledger.

## Steps

### Step 1 — Report the squares a scramble recoloured

Status: committed

Notes: Implemented as planned; the list's element type is `RecoloredSquare`
in `steal.ts`. The seven effect literals in `announcements.test.ts` gained an
empty `recoloredSquares`. Typecheck, lint, format check and the full suite
(92 files, 2045 tests) pass.

- `src/rules/steal.ts`: `shuffleProspectiveSignals` also returns the
  prospective squares whose signal changed, each with its old and new
  signal, in board order. Update its doc comment and the result type.
- `src/rules/activityBonus.ts`: `ActivityBonusClaimOutcome` gains the same
  list (empty for every kind but Node scramble); `resolveActivityBonusClaim`
  fills it from the shuffle. Update the outcome's doc comment, which today
  says a scramble's changes are not reported.
- `src/rules/ply.ts`: `ActivityBonusClaimedEffect` gains the field and
  `claimActivityBonus` copies it across. Update the effect's doc comment
  likewise.
- Tests: in the steal tests, assert the reported list matches exactly the
  squares whose signal differs between the node maps before and after, with
  the right old and new signals, and never lists an unchanged square; in the
  activity-bonus claim tests, assert a scramble claim's outcome carries the
  list and every other kind's is empty. Fix any existing expectations that
  build an `ActivityBonusClaimedEffect` or outcome literal.

Depends on: nothing.

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and the full `npm test` pass, including the seeded
replay tests unchanged (the shuffle's draws are untouched).

### Step 2 — Derive and draw the recolour sweep

Status: committed

Notes: Implemented as planned. The swept rings carry their circumference
both as `stroke-dasharray` and as the `--node-recolor-ring-length` custom
property the keyframe starts from; `--node-recolor-duration` (700ms) sits on
`.node-marker` beside the charge duration. The underlay's keyframe holds it
at full opacity to 99%. Typecheck, lint, format check and the full suite
(92 files, 2053 tests) pass.

- `src/board/boardAnimations.ts`: add the `node-recolor` animation type
  (old signal, old matched side, `runId`) to `SquareAnimation`, and derive
  it from the event's scramble claims as described under Decisions. Only
  `moved` and `attacked` events carry claims.
- `src/board/BoardSquare.tsx`: pick the `node-recolor` entry out of
  `animation` and pass it to `NodeMarker`.
- `src/board/NodeMarker.tsx`: a `recolorAnimation` prop, ignored unless
  the state is prospective; when given, draw the old-colour underlay rings
  and the swept new-colour rings as described under Decisions, keyed on
  `runId`. Extend the file header's animation paragraph.
- `src/board/NodeMarker.css`: the sweep and underlay classes, the duration
  custom property on `.node-marker`, their keyframes, and both classes in
  the reduced-motion block.
- Tests: `boardAnimations.test.ts` — a scramble claim yields `node-recolor`
  on exactly the changed squares with their old signals, none on unchanged
  squares, none for other kinds; the first claim's old signal wins when two
  claims recolour the same square, and a square back on its old signal
  gets none. `NodeMarker.test.tsx` — a prospective marker with
  `recolorAnimation` draws underlay rings in the old colour and swept rings
  in the new colour, and without it the markup is unchanged.

Depends on: Step 1 (the effect carries the recoloured squares).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and the full `npm test` pass, including the new
tests above.

### Step 3 — Owner's check of the sweep

Status: pending

The owner plays a steal game with planet effects on and claims a Node
scramble, and adjusts the duration if it looks too fast or slow.

Depends on: Step 2.

Verification (manual): On claiming a Node scramble, every waiting square
that changes colour sweeps from its old colour to its new one, starting at
12 o'clock and going clockwise, all together; squares that keep their
colour do not move; once finished, the board looks as it did after a
scramble before this story, with no fringe of the old colour.

### Step 4 — README check

Status: committed

Notes: Done ahead of Step 3, which waits on the owner. `README.md` mentions
neither animations nor Node scramble, so it needs no change.

Review `README.md` against the branch diff. Expected: no change — the
README does not describe board animations.

Depends on: Step 2.

Verification (automated): `grep -n -i -E "animat|scramble" README.md`
shows nothing the story contradicts.
