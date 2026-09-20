# Implementation Plan — Story 00000092, The board moves

## What this story does

Three changes on the board happen today between one frame and the next. This
story gives each of them a moment of movement, and changes nothing else:

1. **A node lights up** — inactive → charged. Its waiting rings cross-fade
   into a small bright ball, and the ball opens out into the ordinary charged
   node. One animation, two phases, 60% / 40% of a single duration.
2. **A node burns out** — charged → depleted. The colours travel from their
   charged values to their depleted values over one duration. The middle
   gradient stop's offset snaps, and `story.md` §2 explains why that costs
   nothing (D6). No fade, no mask, no phases.
3. **The rotators turn** — under the **dedicated** rotation setting, when a
   ship lands on a rotator and spends it, every rotator _still on the board_
   turns a third of a circle clockwise, landing back on itself.

**All three are CSS animations.** Nothing in this story re-renders a square
from a timer, and no new animation infrastructure is added.

This is a **presentation story**. `doc/ruleset/rules.md` is not edited,
`RULES_VERSION` does not move, and there is **no changelog entry**. No step in
this plan adds, removes or reinterprets a rule; nothing in `src/rules/` gains
a new rule or a new effect type. A game recorded before this story replays
identically after it. If a step seems to want a rules change, it is wrong —
stop and escalate.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions and the rejected alternatives, because code in this
repository deliberately carries no design history (`CONTRIBUTING.md`,
"Comments").

## Baseline on this branch

Branch `feat/92-add-node-animations`, clean at the start of planning
(`story.md` already committed).

- `npm test` — **72 test files, 1414 tests, all green**.
- `npm run typecheck` and `npm run lint` — clean.
- `npm run format:check` — **four pre-existing warnings**:
  `doc/plan/00000069-retire-actions/story.md`,
  `doc/plan/00000090-add-prospective-node-rotation-options/story.md`,
  `doc/plan/00000092-add-node-animations/story.md` and
  `src/board/planetArt.ts`. None is this story's to fix, and none is to be
  "tidied" in passing — in particular **do not reformat this story's own
  `story.md`**. (This `implementation-plan.md` is prettier-formatted; if a
  step's edit flags it, run `npx prettier --write` on **it** only.)

The test count will **rise** over this story. No step may lower it.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say (`CLAUDE.md`, Vocabulary). Do not mix them.
- **Move** is the movement action specifically — one ship changing squares —
  never a synonym for a turn or a ply.
- **Node** is the word everywhere: a position that runs `inactive` →
  `charged` → `depleted` and then ends. An inactive node carries a
  **priority** (1–3), drawn as that many concentric rings.
- A **rotator** is not a node (rules.md §3.3): it never enters that cycle and
  does not live in `state.nodes`. It exists only under the **dedicated**
  node-rotation setting.
- **Charge**, in this plan, always means a node going inactive → charged. It
  never means a ship's power (`power-gained`), which this story does not
  touch.

## Settled decisions — do not reopen

These come from `story.md` and the owner's decisions at the plan-approval
gate. A step that finds one inconvenient escalates to the owner rather than
re-deciding.

- **S1. Presentation only.** No rules change, no `RULES_VERSION` bump, no
  changelog entry, no new effect _type_, no new rule module. The one change
  inside `src/rules/` is a new **field** on an existing effect (D1), which is
  a reporting detail, not a rule.
- **S2. The three triggers are the ones already in the code.** The
  `node-charged` effect (`src/rules/charging.ts`), the `node-ran-out` effect
  (`src/rules/endOfTurn.ts`), and the `queue-rotated` effect carrying
  `trigger: "rotator"` (`src/rules/ply.ts`). No new signal is invented.
- **S3. Every animation begins and ends on artwork the board already draws.**
  No colour, radius, gradient, ring count or mark is redesigned. The only new
  geometry in the whole story is the charge animation's growing mask, which
  exists only while it is running.
- **S4. Durations and the mask's starting radius are starting values for the
  owner's eye, not measured results** — the same footing as the ring radii
  (`NodeMarker.tsx`) and the countdown's font size (`NodeCountdown.tsx`)
  already sit on. They are named constants the owner adjusts at Step 6's
  manual gate. Do not derive them, and do not argue about them in review.
- **S5. CSS only.** The owner decided at the plan-approval gate that all three
  animations are CSS, accepting the middle gradient stop's snap (D4, D6).
  Nothing in this story may re-render a square per frame, and no
  `requestAnimationFrame` loop, animation hook or `src/motion/` folder is to
  be created (D12).
- **S6. The charge animation does not play at the opening deal.** The nodes
  that are charged when the board first appears were never inactive on screen.
  This falls out for free (D2) and is asserted, not implemented.
- **S7. The end state is the requirement; the motion is decoration on top of
  it** (`story.md`, In scope §5). An animation cut short by the next event is
  accepted. A board left wrong because of it is not, and that property is
  tested (D5).
- **S8. Reduced motion goes straight to the end state.** Every animation gets
  a `prefers-reduced-motion: reduce` branch, following `EnergyOverlay.css` and
  `ClockRegion.css`. Nothing here is the only channel for any information.
- **S9. No review fixtures and no manual test scripts.** The owner drives
  manual testing himself from `npm run dev`. Do not add a demo page, a debug
  route or a "press this key to replay the animation" affordance.
- **S10. No accessibility work items.** The reduced-motion branches are in
  scope as implementation, but this story does not take on accessibility
  repair, and no step tests accessibility beyond keeping the existing axe
  assertions passing (`CLAUDE.md`, "Accessibility during pre-release").
- **S11. Announcements are untouched.** `announcements.ts` says what it says
  today, when it says it today. Nothing is delayed to match an animation, and
  no live-region wording appears in any manual verification.

## Decisions this plan makes

### D1. `node-charged` carries the priority the node held; the view does not remember the board

The charge animation's phase 1 must fade out **the rings that were actually
there** — one, two or three, per the node's own priority the instant before it
charged. The board cannot read that off the state afterwards: once the node is
charged its status is `{ state: "charged", level: 0 }` and the priority is
gone.

**Decision: `NodeChargedEffect` (`src/rules/charging.ts`) gains a
`priority: NodePriority` field**, filled from the priority `runCharging`
already computed when it ordered the queue.

Why, and what was rejected:

- The effect list is already a **reporting layer** that describes what
  happened in terms the state no longer holds — `energy-collected` carries the
  amount and the squares it was collected from, `queue-refilled` carries the
  discarded squares and the new draw. A charging node's outgoing priority is
  exactly that kind of fact, and the charging step is the only place that
  knows it for certain.
- **Rejected: the board view remembers the board it last drew** (a ref holding
  the previous node statuses, diffed each render). It puts derived game state
  inside a component, which `CONTRIBUTING.md` steers against; it is wrong
  whenever the previous render is not the previous ply (a remount, a screen
  change through story 88's browser navigation, a new game), because the diff
  then compares against an unrelated board; it cannot tell "charged this ply"
  from "was already charged and something else re-rendered"; and it is not
  testable as a pure function.
- This is **not a rules change**: `rules.md` says nothing about effect
  payloads, no legal move, cost, outcome or seed draw changes, and
  `RULES_VERSION` does not move. There is no game-record format to keep stable
  — nothing in the repository serialises effects today.

### D2. Animations are derived from `session.lastEvent`, exactly as `EnergyOverlay` derives settlements

`EnergyOverlay.tsx` is this codebase's precedent for a transient,
event-driven board animation: it is a pure function of `session.lastEvent`
with no timers and no state of its own, and it keys its elements on
`session.state.plyNumber` so a fresh event restarts the animation. This story
follows it.

Consequences, both accepted by the owner:

- **The opening deal animates nothing** (S6). The board's opening charged
  nodes come from `startingGameState`, not from a `node-charged` effect, so
  there is nothing to animate — no code, just an assertion.
- **A new event cuts a running animation short.** If the other player selects
  a ship 200 ms after a node charges, the board re-renders without the
  animation and the board snaps to the finished artwork. **Rejected:** an
  animation queue owning its own timers and surviving later events — real
  machinery, and a board still playing the previous turn's animation while the
  next player is already moving is worse, not better. What the owner requires
  instead is that the board is always left in the correct end state, which D5
  delivers by construction and Steps 3–5 assert.

### D3. One pure module decides what is animating; the components stay dumb

`src/board/boardAnimations.ts` (new) owns the whole question "given this
session, what — if anything — is animating right now, and on which squares".
It exports a `SquareAnimation` union and a pure function from a `Session` to a
map of square name → animation. `Board.tsx` looks each square up by name and
passes at most one optional `animation` prop down to `BoardSquare`, which
routes it to `NodeMarker`, `NodeCountdown` or `RotatorMarker`.

This is the CONTRIBUTING preference ("prefer to keep logic **out** of
components") and it is what makes the story's six listed test points testable
without asserting anything about appearance over time.

### D4. All three animations are CSS, and what that costs

The charge and the rotator turn move only **opacity** and **transform**. The
burnout moves **`stop-color`** on the gradient's stops and **`fill`** on the
countdown number — both of which are ordinary animatable CSS properties, even
though they are usually written as SVG presentation attributes. So all three
are `@keyframes` in the marker's own stylesheet, in the shape
`EnergyOverlay.css` already sets.

The one thing CSS cannot reach is a gradient stop's **`offset`**: it is not a
CSS property (the CSS name `offset` is the motion-path shorthand). D6 shows
that this costs nothing at this transition, which is why the owner chose CSS.

Rejected alternatives for the burnout:

- **Interpolating the artwork's numbers in JavaScript** with
  `requestAnimationFrame` (the shape `src/hud/useCountUp.ts` uses for a
  rolling score), re-rendering the square each frame. This was the plan's
  first recommendation and the owner rejected it: it buys only the stop
  offset, which cannot differ here (D6), in exchange for per-frame re-renders,
  a new hook, a new pure-arithmetic module and a second reduced-motion
  mechanism. **Do not reintroduce it**, and do not create `src/motion/`
  (D12).
- **Cross-fading two stacked markers** (charged over depleted). The artwork's
  middle stop is drawn at opacity 0.7, so stacking composites two _translucent_
  pictures and the board shows through the overlap — a visible artifact, not a
  travel. `story.md` also rules out fading for this animation outright.
- **SMIL `<animate>` elements.** They do reach the attribute, but
  `prefers-reduced-motion` cannot be expressed over them in CSS, restarting
  them is fiddly, and there is no SMIL anywhere in this repository.
- **Redrawing the node as a CSS `radial-gradient` on an HTML element** with
  `@property`-registered custom properties. That redraws the artwork in a
  different technology to make an animation convenient — S3 puts it out of
  scope.

### D5. Base styles are the end state; keyframes supply the beginning — and that is what guarantees the end state

Every animation in this story is written so that the element's **base** style
is the picture the board must be left with, and the `@keyframes` supply only
the starting picture. Concretely:

- the outgoing rings sit at `opacity: 0` in the base style, and the keyframe
  takes them `1 → 0`;
- the incoming charged artwork sits at `opacity: 1`, and the keyframe takes it
  `0 → 1`;
- the charge mask circle sits at full size, and the keyframe starts it small;
- the burnout's gradient stops carry their **depleted** colours, and the
  keyframe starts them at the charged colours; likewise the countdown's
  `fill`;
- the rotator sits unturned, and the keyframe takes it
  `0 → 360/ARC_COUNT` degrees, which lands back on itself.

This is **load-bearing**, not tidiness. It buys three things at once:

1. **The owner's end-state requirement** (S7, `story.md` In scope §5). However
   an animation ends — run out, cut short by the next event, or never started
   — the element's computed style is its base style, which is the correct
   final artwork. No `animation-fill-mode` games, no cleanup, nothing to get
   wrong.
2. **Reduced motion for free**: the branch is nothing but `animation: none`,
   with no second set of "motion-safe alternative" rules to keep in step.
3. **A cheap test.** Rendering a square with an animation and then re-rendering
   it without one must produce exactly the markup the square has when nothing
   animated at all. Each of Steps 3, 4 and 5 asserts this for its own
   animation; that is the automated half of `story.md`'s test list item 6, and
   manual check 7 is the other half.

Implementation note: the neat way to say "end on the base value" in CSS is a
keyframe block with only a `from` (or `0%`) rule — the missing `to` is an
implicit keyframe resolving to the element's own base value. If a base value
that comes from an SVG **presentation attribute** does not resolve that way in
a browser, set that property in the stylesheet or in the element's `style`
instead of as an attribute; do not switch the animation's direction to
compensate, because that would break guarantee 1.

### D6. The burnout travels colours only, and the offset snap costs nothing

**What travels:** the inner colour (gold `#DAA520` → grey `#808080`), the
outer colour (wheat `#F5DEB3` → white `#FFFFFF`), and the countdown number's
colour (black → white) where a number is drawn on both sides of the change.

**What snaps:** the middle gradient stop's offset — and at this transition it
snaps between two identical values, so nothing is visible. The proof, which
the implementer should not have to re-derive:

- A charged node's countdown only ever runs out by spending its last ply.
  `endOfTurn.ts` step 3 skips any charged node whose `level <= 0`
  (`continue`), so a charged node carrying **no** countdown can never raise
  `node-ran-out`.
- Therefore the node was at `level` 1 the instant before, which
  `nodeCyclePosition` puts at cycle position 1 — the **end** of the charged
  cycle, middle stop at 50%.
- The depleted node it becomes is a trap starting its own cycle at position 0
  — middle stop at 50% as well.

The stop opacities (1, 0.7, 1) and the radius (70) are the same on both sides
too, so the colours really are the whole of the difference. Should the two
artworks ever come to differ in offset, radius or opacity, that difference
will snap rather than travel; making it travel is a later story's problem, and
`story.md` §2 says so explicitly.

**Where the "from" colours come from:** they are the charged artwork's own
stop colours, which `NodeMarker.tsx` already computes from its artwork table —
never re-typed into a stylesheet. Thread them into the CSS as custom
properties on the stops (precedent: `BoardSquare.tsx`'s `--dampened-opacity`),
and let the implicit `to` resolve to the depleted values the marker is already
drawing (D5).

### D7. The countdown's colour travels in CSS too, and one duration serves both pieces

The burnout is drawn by two sibling components — `NodeMarker` (the gradient)
and `NodeCountdown` (the number) — and they must travel over the same
duration. Since both are CSS animations there is no clock to share, only a
number:

- declare the burnout's duration **once**, as a custom property on
  `.board-square` in `BoardSquare.css`, where the two pieces meet, with a
  comment saying it is the burnout's single duration; both stylesheets
  reference it. One number, one place for the owner to tune (D11);
- `NodeCountdown` gets its "from" colour the same way the stops do — threaded
  in by `BoardSquare`, which is already where the black/white choice is made,
  so the colours stay decided in one place;
- `NodeCountdown`'s existing `color` prop (`"black" | "white"`) does **not**
  need to change type; the travel is a second, optional input saying "this
  number is burning out, start from this colour".

The **number itself** may change outright as the node flips (a charged node
showing 1 becomes a trap showing 5). Only the colour travels — a number is not
a component that can travel, exactly as `story.md` says of components that
exist on only one side of a change.

### D8. The rotator's turn angle is derived from the arc count

`RotatorMarker.tsx` draws `ARC_COUNT` arcs evenly spaced, and it is that
three-fold symmetry that makes a third of a turn land back on itself. The turn
angle is therefore computed as `360 / ARC_COUNT` in the component and threaded
into the stylesheet as a CSS custom property, never written as a bare `120deg`
in CSS. Precedent for threading a TS-owned number into CSS:
`BoardSquare.tsx`'s `--dampened-opacity`.

### D9. When the same ply also replaced the rotator set, nothing turns

Under dedicated, a ply can both spend a rotator (rotating the queue mid-ply)
and, at the end of that same ply, refill the queue — which redraws the
**whole** rotator set from the seed (`endOfTurn.ts` step 5, reported as
`queue-refilled` with a non-empty `newRotators`).

The board renders **once**, after the whole ply has resolved, so by the time
anything is drawn the marks on screen are the fresh set. Turning them would
spin marks that were never part of the rotation — and because a third of a
turn lands back on itself, the player would see a fresh set spin for no reason
at all. `story.md`, In scope §3, states this outcome directly: **when both
happen on the same turn, nothing turns.**

**Decision: if the same event carries a `queue-refilled` effect whose
`newRotators` is non-empty, no rotator turn is produced for that event.** It
is uncommon in play — it needs a ship to land on a rotator on a ply that also
ends with something charging. **Rejected:** animating the outgoing set as an
overlay so both the turn and the deal can be seen — a second board layer for
one rare frame, far past what this story is worth.

### D10. The spent rotator is excluded explicitly

`ply.ts` already removes the landed-on rotator from `state.rotators` as it is
spent, so it is not drawn afterwards and could not animate. The animation map
is nevertheless built by **excluding the effect's own square by name** from
the remaining rotators, and the pure test asserts the spent square is absent —
the story asks for that assertion, and it should not rest on a second module's
behaviour holding still.

### D11. Where the four tunable numbers live

All four are S4 starting values, sited next to the animation that uses them:

| Number                                                | Home                                             | Starting value |
| ----------------------------------------------------- | ------------------------------------------------ | -------------- |
| Charge duration (split 60/40 in keyframe percentages) | `--node-charge-duration` in `NodeMarker.css`     | `750ms`        |
| Charge mask's starting radius                         | `CHARGE_MASK_START_RADIUS` in `NodeMarker.tsx`   | `20`           |
| Burnout duration                                      | `--node-burnout-duration` in `BoardSquare.css`   | `500ms`        |
| Rotator turn duration                                 | `--rotator-turn-duration` in `RotatorMarker.css` | `500ms`        |

Three of the four are CSS custom properties declared beside (or, for the
burnout, just above) the keyframes that use them — as named a constant as a TS
one, and now that every animation is CSS there is no reason for a duration to
live anywhere else. The burnout's sits on `.board-square` because two children
share it (D7). The mask radius stays in TS because it is geometry in the
marker's own 0–100 viewBox, where `INACTIVE_RING_RADII` already lives.

Grounding for the mask radius, so the owner is tuning from somewhere rather
than nowhere: the charged gradient's gold core runs out to its 25% stop, which
in the marker's own units sits at roughly 21, so about 20 shows the core and
little else. Easing: `ease-out` throughout, matching `EnergyOverlay.css`. All
of it is the owner's to change at Step 6.

### D12. No new motion infrastructure, and no drive-by refactor

Because every animation is CSS (S5), this story needs **no** animation hook,
**no** `requestAnimationFrame`, **no** pure progress-arithmetic module and
**no** `src/motion/` folder. `src/hud/useCountUp.ts` keeps its own private
reduced-motion predicate exactly as it is: extracting it would be unrelated
cleanup this story does not need, and the story's own reduced-motion branches
are CSS media queries that need no predicate at all.

The only new module in the whole story is `src/board/boardAnimations.ts` (D3).

### D13. What is **not** touched

`doc/ruleset/rules.md`, `doc/ruleset/changelog.md`, `RULES_VERSION`,
`announcements.ts`, `squareLabel.ts`, the live region, the HUD, the clock, the
guide, the start screen, ship movement, planets, node retirement, node
spending, fights, and the settlement overlay (which has its own animation
already).

**No accessibility ledger entry is expected from this story.** Nothing
accessible is given up: every marker is already `aria-hidden`, every
announcement is unchanged, nothing is conveyed by motion alone, and each
animation has a reduced-motion branch. If a step nonetheless finds itself
trading an accessible behaviour away, record it in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` under a "From
story 92" heading rather than repairing it — and say so in that step's Notes.

## Step sequence at a glance

1. `node-charged` carries the priority the node held. _Automated._
2. `boardAnimations.ts`: one pure function from a session to what is
   animating. _Automated._
3. The charge animation, and the prop that carries every animation down to a
   square. _Automated._
4. The burnout animation. _Automated._
5. The rotator turn. _Automated._
6. The owner watches all three and tunes the four numbers. **Manual.**
7. `README.md`, and a final check that no rules artefact moved. _Automated._

---

### Step 1 — `node-charged` carries the priority the node held

Status: pending

Add a `priority` field to `NodeChargedEffect` in `src/rules/charging.ts`,
typed `NodePriority` (from `src/rules/nodeQueue.ts`), carrying the priority
the inactive node held the instant before it charged (D1). `runCharging`
already computes that priority when it orders the queue by priority
descending, so the value is in hand at the point the effect is pushed; nothing
else about the function changes — no new state, no seed movement, no change to
which node charges.

Update the effect's doc comment to say what the field is for: it reports the
priority the node held, which the state no longer carries once the node is
charged. Do **not** write story numbers or plan references into the code
(`CONTRIBUTING.md`, "Comments").

Every other module that already handles this effect keeps working unchanged —
`src/rules/endOfTurn.ts` only forwards it, and `src/board/announcements.ts`
only reads its square. Confirm both, and change neither.

Update the tests that assert whole `node-charged` effect objects, which will
now be missing a field: `src/rules/charging.test.ts` (several) and
`src/rules/camping.test.ts`. Search the suite for `"node-charged"` to be sure
none is missed.

Add to `src/rules/charging.test.ts` an assertion that the reported priority is
the one the node actually held: with a queue holding priorities 1, 2 and 3 and
a shortfall of two, the effects come out priority 3 first, then priority 2,
each naming its own square (`story.md` test list item 4).

Depends on: nothing — this is the bottom of the stack, and Step 2 consumes the
new field.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` all
green, with the test count up on the 1414 baseline and no existing test
weakened.

### Step 2 — `boardAnimations.ts`: one pure function from a session to what is animating

Status: pending

Add `src/board/boardAnimations.ts`, a pure module with no React in it,
exporting:

- a `SquareAnimation` discriminated union with three members — a **node
  charge** (carrying the outgoing priority from Step 1), a **node burnout**,
  and a **rotator turn** — each also carrying a `runId` number, used later as
  a React key so an animation restarts rather than continuing when a new one
  begins on the same square (D2, `EnergyOverlay.tsx`'s precedent of keying on
  `state.plyNumber`; use `session.state.plyNumber` for it);
- a function taking a `Session` and returning a read-only map of **square name
  → `SquareAnimation`** (square names as `squareName()` produces them, which
  is how `Board.tsx` already indexes squares).

What it reads, and where those effects sit — follow `EnergyOverlay.tsx`'s
`settlementsForEvent`/`endOfPlySettlements` shape, which already solves
exactly this walk:

- A `moved` or `attacked` event's `effects` list holds the ply-closing effect,
  and **both** a `ply-ended` and a nested `ply-passed` can be present in one
  event (the pass guard firing for the other side); each carries its own
  `endOfTurn` list. A top-level `ply-passed` event carries an `endOfTurn` list
  directly. Walk all of them.
- From those end-of-turn lists: `node-charged` → a charge animation on that
  square, carrying the effect's priority; `node-ran-out` → a burnout animation
  on that square.
- From the event's **top-level** effects: a `queue-rotated` effect with
  `trigger: "rotator"` → a rotator turn on **every square in
  `session.state.rotators` except the effect's own square** (D10). A
  `queue-rotated` with `trigger: "planet"` is ignored — there are no rotators
  on the board under that setting.
- **Suppression (D9):** if any of the walked end-of-turn lists holds a
  `queue-refilled` effect whose `newRotators` is non-empty, no rotator turn is
  produced at all for that event. Node charges and burnouts in the same event
  are unaffected.
- Any other event (`selected`, `selection-cleared`, `rejected`) and an absent
  `lastEvent` produce an empty map.

Add `src/board/boardAnimations.test.ts` (plain `node` environment — no DOM
needed) covering: a charge with its reported priority; two charges in one
event; a burnout; an event with both; the rotator turn naming exactly the
remaining rotators and **not** the spent square; a `planet`-triggered
`queue-rotated` producing nothing; the suppression when the same event
refilled the rotator set (`story.md` test list item 5); an empty map for a
`selected` event and for a session with no last event; and, for S6, an empty
map for a freshly created opening session (`createSession` over a starting
game state).

Depends on: Step 1 (the priority field is what the charge entry carries).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` all
green, with the new test file covering each bullet above.

### Step 3 — The charge animation, and the prop that carries every animation down to a square

Status: pending

This step introduces the plumbing all three animations use, and the first
animation to travel it.

**Plumbing.** `Board.tsx` computes the animation map once per render (inside
the existing `useMemo`, which already depends on `session`) and looks each
square up by name, passing an optional `animation` prop to `BoardSquare`.
`BoardSquare` takes that one optional prop and routes it: a node charge or
burnout to `NodeMarker` (and, for the burnout, `NodeCountdown` — Step 4), a
rotator turn to `RotatorMarker` (Step 5). Update `BoardSquare.tsx`'s header
comment, which itemises a square's contents.

**The charge animation** (`NodeMarker.tsx` + `NodeMarker.css`). When a charged
marker is handed a charge animation it draws, in one SVG, two things instead
of one:

- the **outgoing rings** — the same concentric rings it already draws for an
  inactive node, at the priority the animation carries, so one, two or three
  rings fade out exactly as the board was drawing them;
- the **ordinary charged artwork** it would draw anyway, wrapped in a group
  masked by a circle.

The animation is one duration (D11) split in keyframe percentages: over the
first 60% the rings go `opacity 1 → 0` while the masked artwork goes
`opacity 0 → 1`, with nothing moving or changing size; over the last 40% the
mask circle grows from `CHARGE_MASK_START_RADIUS` to covering the whole
marker, and nothing else changes. Base styles are the end state and the
keyframes supply the start (D5), so `@media (prefers-reduced-motion: reduce)`
is `animation: none` on all three animated pieces and leaves the finished
charged node.

Implementation notes the implementer should not have to rediscover:

- The mask is easiest as a circle at the artwork's full radius scaled down by
  the keyframe (`transform-box: fill-box; transform-origin: center`), so the
  starting scale is `CHARGE_MASK_START_RADIUS / radius` — thread it in as a
  custom property, since the radius is TS's (D8's precedent).
- SVG ids are document-global and up to 225 markers share a document; the mask
  id must carry the square's name, exactly as the gradient id already does.
- Give the mask an explicit user-space region covering the whole `0 0 100 100`
  viewBox rather than relying on the default bounding-box region, or the
  artwork will be cropped at the edges.
- Key the animated subtree on the animation's `runId` so a later charge on the
  same square restarts rather than continuing.
- A newly charged node never carries a countdown and never has a ship on it,
  so this animation has no interaction with `NodeCountdown` or `ShipModel`.
- Add a modifier class while the animation is running (for example
  `node-marker--charging`) purely as a query hook for tests; `BoardSquare.tsx`
  already has a commented precedent for a class no stylesheet reads.

Tests — extend `src/board/NodeMarker.test.tsx`:

- a charged marker given a charge animation at priority 2 draws two rings
  alongside its gradient and the mask; at priority 3, three rings;
- the same marker without an animation draws no rings, and the ordinary states
  are unchanged (keep the existing axe assertion passing);
- **end state (D5, S7):** a marker rendered with a charge animation and then
  re-rendered without one produces exactly the markup of a marker that never
  had one — the interruption case.

And `src/board/Board.test.tsx`: a session whose `lastEvent` carries a
`node-charged` effect puts the charging markup on that square and nowhere
else; an opening session has none anywhere (S6, `story.md` test list item 1).

Depends on: Step 2 (the map and the `SquareAnimation` type).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` all
green. How it actually looks is Step 6's business, not this step's.

### Step 4 — The burnout animation

Status: pending

All CSS (D4). When a square carries a burnout animation:

- **`NodeMarker`** draws the depleted artwork it would draw anyway, and adds a
  modifier class (for example `node-marker--burning-out`, also the tests'
  query hook). Its gradient stops carry the depleted colours as their base
  values and a `from`-only keyframe starts each one at the **charged**
  artwork's colour for that stop, threaded in as a custom property from the
  artwork table the component already has (D6, D5). Nothing else about the
  gradient animates: the offsets, opacities and radius are identical on both
  sides, which is exactly why the snap is invisible (D6) — do not add
  keyframes for them.
- **`NodeCountdown`** animates its `fill` the same way, from the charged
  colour to its ordinary depleted one, where a number is drawn on both sides
  of the change (D7). Where a number appears or disappears outright it simply
  does so, as today.
- The duration is one custom property declared on `.board-square` in
  `BoardSquare.css` and referenced by both stylesheets (D7, D11), and
  `BoardSquare` is what tells the two children they are burning out.

The reduced-motion branch is `animation: none` in both stylesheets, which
leaves the depleted artwork standing (D5).

Tests:

- `src/board/BoardSquare.test.tsx`: a depleted square given a burnout
  animation carries the marker's burnout class, still draws its depleted
  countdown number, and passes the countdown its travel colour; given none,
  the square renders exactly as it does today (`story.md` test list item 2).
- **End state (D5, S7):** a burning-out square re-rendered without the
  animation produces exactly the markup of a square that never had one.
- `src/board/Board.test.tsx`: a session whose `lastEvent` carries a
  `node-ran-out` effect marks that square as burning out and no other.

Do not try to assert intermediate colours: jsdom runs no animations, and
`story.md` asks for no assertions about appearance over time.

Depends on: Step 3 (the `animation` prop reaching a square, and the routing in
`BoardSquare`).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` all
green, with every existing depleted-node assertion in `NodeMarker.test.tsx`,
`BoardSquare.test.tsx`, `NodeCountdown.test.tsx` and `Board.test.tsx` passing
unchanged.

### Step 5 — The rotator turn

Status: pending

`RotatorMarker.tsx` gains one optional prop saying it is turning.
`RotatorMarker.css` gains the keyframes: a clockwise rotation of
`360 / ARC_COUNT` degrees over `--rotator-turn-duration`, about the mark's own
centre, with the angle threaded in from the component as a custom property so
it follows the arc count and is never a bare `120deg` (D8). Base style is the
unturned mark and the keyframe supplies the rotation (D5), so the
reduced-motion branch is `animation: none` and the mark simply stands still.
`BoardSquare` routes a rotator-turn animation to the marker and keys it on the
animation's `runId` so consecutive turns restart.

Nothing else is needed for the two cases the story calls out: the **spent**
rotator is already gone from the board and is excluded from the map anyway
(D10), and a board whose spent rotator was the **only** one produces an empty
set of turning squares, so nothing is drawn and nothing flickers.

Tests:

- `src/board/BoardSquare.test.tsx`: a rotator square given the turn animation
  carries the turning class and a turn angle of a third of a circle; without
  it, neither. **End state (D5, S7):** re-rendering it without the animation
  produces exactly the markup of a rotator that never turned.
- `src/board/Board.test.tsx`: a dedicated-setting session whose `lastEvent`
  carries a `queue-rotated` effect with `trigger: "rotator"` turns every
  rotator still on the board and none elsewhere (`story.md` test list item 3);
  a session whose same event also refilled the rotator set turns none (D9,
  `story.md` test list item 5, alongside Step 2's pure test of the same rule).

Depends on: Step 3 (the `animation` prop reaching a square) and Step 2 (the
rotator entries in the map).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` all
green.

### Step 6 — The owner watches all three, and tunes the four numbers

Status: pending

No code is written before this gate; the work here is watching, then adjusting
the S4 starting values if they feel wrong, and re-running the checks after any
adjustment.

Verification (manual): run `npm run dev` and, from the start screen:

1. Start a game and play until a waiting node charges. The rings dissolve into
   a small bright ball, and the ball opens out into the charged node. Watch it
   for nodes holding one, two and three rings — the rings that fade are the
   ones that were there.
2. Let a charged node run out. The gold travels to grey rather than being
   swapped for it, and the countdown number, where there is one on both sides,
   travels with it.
3. Start a game with **dedicated** rotation and land a ship on a rotator. The
   spent rotator goes; every other rotator turns a third of a circle clockwise
   and ends up looking exactly as it started.
4. Do the same on a board where the spent rotator is the only one left:
   nothing turns, nothing flickers.
5. Turn on the system's reduce-motion setting and repeat 1–3: each change
   happens instantly, and the board is correct afterwards.
6. Watch a turn in which a ship lands on a rotator **and** the rotator set is
   replaced. Nothing turns, the fresh set appears still, and nothing is left
   drawn mid-animation (D9).
7. Interrupt an animation — let a node charge, then immediately click a ship —
   and confirm the board is left in the correct end state. This is the one
   that matters (S7): an animation may be cut short, but what it was
   travelling towards must always be what is standing there afterwards.

The four numbers to adjust, if any of them feels wrong, are in D11's table:
`--node-charge-duration` and `CHARGE_MASK_START_RADIUS` (`NodeMarker.css`,
`NodeMarker.tsx`), `--node-burnout-duration` (`BoardSquare.css`) and
`--rotator-turn-duration` (`RotatorMarker.css`). Record in this step's Notes
what was changed and to what.

Depends on: Steps 3, 4 and 5 (all three animations).

### Step 7 — `README.md`, and a final check that no rules artefact moved

Status: pending

Run `/update-readme`, which reviews the branch diff and updates `README.md` if
warranted. `README.md` is player-facing and describes how the game is played;
this story changes nothing about that, so the expected outcome is "no change
needed" — but check rather than assume, and record the conclusion in this
step's Notes.

In the same step, confirm the story's own guarantees hold by inspecting the
branch diff against `main`: **no change** to `doc/ruleset/rules.md`,
`doc/ruleset/changelog.md` or `src/rules/rulesVersion.ts`; no change anywhere
in `src/rules/` beyond the `priority` field added in Step 1 and its doc
comment; no `requestAnimationFrame`, animation hook or `src/motion/` folder
anywhere in the diff (S5, D12); and `src/hud/useCountUp.ts` untouched. Confirm
too that no accessible behaviour was traded away, so
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` needs no "From
story 92" entry (D13); if an earlier step did record one, say so here instead.

Depends on: every previous step.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all green (`format:check` showing only the four
baseline warnings), plus the diff inspection above.
