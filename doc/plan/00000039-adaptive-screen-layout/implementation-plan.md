# Implementation plan — 00000039 Adaptive screen layout

## What this story is

The in-game screen stops being one fixed column and starts using the shape of
the window it is given. It becomes **three regions**, always in this DOM
order:

1. **Info** — the `h1` title and the HUD (both scores with their pips, the
   round counter, the turn indicator).
2. **Play area** — the board.
3. **Reserved** — empty but for the word `RESERVED`; a placeholder for a later
   story.

In a **taller-than-wide** window they stack top to bottom, as today. In a
**wider-than-tall** window they sit side by side — info left, play area
middle, reserved right — and the info region's own contents restack into a
column (title, green side, round, red side, turn indicator).

The board is always a square of side `S`, sized so it fills the window's short
dimension whenever the long dimension has room for both side regions, and
gives way only as far as it must otherwise. Writing `W` x `H` for the room
inside the cabinet's frame, `P` for one side region's extent and `g` for the
gap between regions:

- **Taller than wide:** `S = min(W, H - 2(P + g))`
- **Wider than tall:** `S = min(H, W - 2(P + g))`

Both side regions have the same extent `P`, so the board is exactly centred on
both axes; the three regions are centred as a group, so on an oblong window
all the leftover room goes to the two far edges and none of it comes between
the board and the panels.

The second half of the story is a bug: **the board does not grow to fill the
window in Chromium** the way it does in Firefox. That is fixed here too, in a
separate phase behind an owner gate.

**No rules change.** `doc/ruleset/rules.md`, `doc/ruleset/changelog.md` and
`RULES_VERSION` are untouched by this story; nothing in this plan edits them,
and nothing is tagged.

### Vocabulary reminder for a cold reader (`CLAUDE.md`)

**Node** is the player-facing word for a charged site; code says **hub**.
**Turn** is the player-facing word for what code calls a **ply**. Neither
matters much here — this is a layout story and no rule logic is touched — but
the words appear in the HUD's text, which this story must not change.

Throughout this plan, **portrait** means a window taller than it is wide and
**landscape** means wider than tall, matching the CSS `orientation` media
feature. The story's "taller than wide" and "wider than tall" are the same two
cases.

### Settled decisions that are not to be re-opened

1. **Two phases with an owner gate between them.** Phase 1 is the layout
   (steps 1-3). The gate is step 4. Phase 2 is Chromium (steps 5-6). **No
   phase-2 step may be started until step 4 is `committed`.** See "The gate"
   below.
2. **No test script, fixture page, harness, screenshot tool or manual-test
   document is to be written.** The owner drives manual testing himself by
   running the app. A manual step says `npm run dev` and lists what to look
   at, and nothing more is built for it.
3. **No plan step tests accessibility** (`CLAUDE.md`, accessibility during
   pre-release). Existing automated tests are updated where the path is
   straightforward. Where a change costs an accessible behaviour, the cost is
   accepted and recorded in
   `doc/plan/00000021-accessibility-tech-debt/known-issues.md` **as part of
   the step that causes it**.
4. **The ruleset is untouched.** No version bump, no changelog entry, no
   `RULES_VERSION` change, no tag.
5. **The start screen and the game-over panel do not change.** They go on
   filling the cabinet exactly as they do today. This story touches the
   in-game screen only.
6. **The sizing formula in the story's section 4 is the specification.** It is
   implemented, not re-derived or improved on.

---

## The gate

Between step 3 and step 5 the plan stops.

**Step 4 is the gate.** The owner resizes a real Firefox window and says
whether the layout is right. Until step 4's `Status:` reads `committed`, no
work on steps 5 or 6 may begin, and no step may reach ahead into the Chromium
problem "while it is in there anyway".

Anything the owner finds wrong at the gate comes back as a fix to the step
that owns it (step 1, 2 or 3), re-verified, and the gate is run again. It does
not become a new step tacked on the end.

The split is deliberate. Phase 1 is checked in the browser that already
behaves, so a fault found at the gate is a fault in the layout and nothing
else; phase 2 then has exactly one variable in it.

---

## Where the work lands

| File                                                                | What happens to it                                                            |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/App.tsx`                                                       | The in-game branch gains a screen wrapper and three region elements (step 1)  |
| `src/App.css`                                                       | Region layout, frame tokens, the `S` formula, both orientations (steps 1-3)   |
| `src/index.css`                                                     | Two shared tokens for the board's floor (step 2)                              |
| `src/board/Board.css`                                               | Reads the floor token instead of the literal `40px`; comment updated (step 2) |
| `src/hud/Hud.css`                                                   | Loses its bottom margin (step 2); restacks its row in landscape (step 3)      |
| `src/hud/ScoreDisplay.css`, `RoundCounter.css`, `TurnIndicator.css` | Landscape-only overrides for type sized from the window's width (step 3)      |
| `src/App.test.tsx`                                                  | Structural assertions for the three regions (step 1)                          |
| `doc/plan/00000021-accessibility-tech-debt/known-issues.md`         | A story-39 section for the reserved placeholder's stray text (step 1)         |
| `README.md`                                                         | Checked, updated only if the story changed something it describes (step 7)    |

Deliberately **not** touched:

- **`src/start/StartScreen.tsx` / `.css` and `src/hud/GameOverPanel.tsx` /
  `.css`.** Out of scope; they keep filling the cabinet as they do.
- **`src/board/Board.tsx`, `BoardSquare.*`, `SiteMarker.*`, `ShipIcon.*`,
  `EnergyOverlay.*`, `src/board/grid/*`.** Nothing is redrawn; only the room
  the board is given changes.
- **`src/hud/Hud.tsx`, `ScoreDisplay.tsx`, `RoundCounter.tsx`,
  `TurnIndicator.tsx`.** The HUD's markup and text are unchanged: same
  numbers, same pips, same words, same colours. Only CSS moves.
- **Every module under `src/rules/` and `src/game/`, and every one of their
  tests.** No game logic is involved.
- **`doc/ruleset/`.**
- **This story's own `story.md`.** If `npm run format:check` reports a
  pre-existing complaint about it, as it has on earlier stories' files, it is
  not this story's to fix.

---

## Design decisions and reasoning

This section is the design record. Code in this repository does not carry
design history (`CONTRIBUTING.md`, "Comments"), so anything a future reader
needs to know about **why** is written here and nowhere else.

### D1 — The three regions get their own wrapper inside the cabinet

`.app__cabinet` is shared by three screens: the start screen, the game-over
panel, and the game itself. It is a column flex box, and both other screens
are `flex: 1` children of it that fill it. If the cabinet itself became a row
in landscape, those two screens would change with it — which the story puts
out of scope.

So the in-game branch of `App` gains **one new wrapper element** (suggested
class `.app__screen`) that is the layout container for the three regions, and
is itself a single `flex: 1` child of the cabinet, exactly like
`.start-screen` and `.game-over-panel`. The cabinet's own rules do not change
at all. Inside the wrapper sit three region elements:

- `.app__info` — wraps the existing `h1` and `<Hud />`.
- `.app__play` — today's `.app__board`, renamed for what it is. It keeps its
  job of being the box the board measures itself against.
- `.app__reserved` — new, holds the word `RESERVED`.

Rejected: reusing `.app__cabinet` as the layout container (breaks the other
two screens), and rendering the regions as siblings of the cabinet (the story
requires the cabinet to span the window with the regions inside it).

The `h1` and the `Hud` are **moved into** the info wrapper, not duplicated and
not reordered. No element is rendered twice and nothing is moved in the DOM to
achieve a layout, in either orientation — that is a hard requirement of the
story's section 1.

### D2 — Orientation is a viewport media query — not a container query, not JavaScript

`@media (orientation: landscape)` is the whole switch. Three alternatives were
considered:

- **A JavaScript resize listener** setting a class or a state value. Rejected
  outright: the story requires that nothing depend on a device class, a user
  agent, or a resize listener if CSS can express it, and CSS expresses this
  exactly.
- **A container query on the cabinet** (`@container (orientation: landscape)`).
  It would key the layout to the cabinet's own box rather than the window,
  which is arguably more correct. Rejected because it needs the cabinet to be
  a **size** container, and a size container needing a definite height down a
  flex chain is precisely the thing Chromium and Firefox disagree about
  (story section 6). The layout must not be built on the disputed mechanism.
- **`@media (min-aspect-ratio: 1/1)`.** Equivalent in effect; `orientation` is
  the more readable spelling of the same test.

Note the edge case: per the media-queries specification, an exactly square
window counts as **portrait**, so the stacked layout is what a square window
gets. The story does not care which side of the boundary a square window falls
on; this is recorded only so a future reader is not surprised.

### D3 — The board's size is computed from the window, not inherited down the flex chain

Today `.app__board`'s size arrives through a chain of `flex: 1` items rooted
in `min-height: 100vh`, and `Board.css` measures `100cqmin` against it. This
plan replaces that chain: `S` is computed **directly**, as a CSS `min()` /
`max()` expression over viewport units, and written to a custom property
(suggested `--play-size`) that gives `.app__play` an explicit `width` and
`height`.

This is the single most important decision in the plan, and it follows from
the story's own arithmetic rather than from the Chromium bug: `S` is specified
as an expression in `W`, `H`, `P` and `g`, and the mirrored side regions mean
`S` cannot simply be "whatever is left over" — a flex-grown board would grow
to fill the space the reserved region is supposed to hold. The flex boxes in
the new layout do **centring only**; no size flows down them.

**This overlaps phase 2 on purpose, and that is not a mistake.** The story's
section 6 offers "computing the play area's size from the window directly,
rather than inheriting it down a flex chain" as the likely fix for Chromium.
Building phase 1 on the flex chain we already believe is wrong, only to tear it
out in phase 2, would be worse than useless. So phase 1 may well fix Chromium
as a side effect. If it does, phase 2 is a short confirm-and-close rather than
a hunt — which is a good outcome, not a reason to have planned it differently.
The gate is still honoured: nobody looks at Chromium, or changes anything for
it, before step 4 passes.

`W` and `H` are the room **inside the cabinet's frame**, so both are a
viewport dimension less twice the frame's thickness (see D4).

### D4 — The frame's thickness becomes named tokens so `W` and `H` are computed in one place

`W` and `H` need the exact inset from the window edge to the cabinet's
interior: `.app`'s padding, plus `.app__cabinet`'s border, plus the cabinet's
own padding — currently `1.5rem`, `2px` and `clamp(0.75rem, 2vw, 1.5rem)`.
Writing those numbers a second time inside the `S` expression would create two
places that must agree and no way to notice when they stop.

So `App.css` gets custom properties for the three components and one sum
(suggested `--app-padding`, `--cabinet-border`, `--cabinet-padding`,
`--frame-inset`), the existing rules are rewritten to use the components, and
the `S` expression uses the sum. Nothing about the frame's appearance changes:
the values are the ones already there.

`H` uses `100vh`, the same unit `.app`'s `min-height` already uses, so the two
cannot disagree. `100dvh` was considered and rejected as scope creep — it
matters on phones, which the story puts out of scope — but it is the obvious
thing to try if phase 2 turns up a mobile-browser discrepancy.

**Known caveat, to be looked at during the gate:** `100vw` includes the
classic scrollbar gutter in some engines. That only bites when the page is
already scrolling, which only happens below the board's floor (D6) — a state
the story accepts as degraded. If it shows up as a horizontal scrollbar at
ordinary sizes, the fix is to key `W` to the cabinet's own resolved width
instead.

### D5 — `P` is one length expression per orientation, and it is kept as tight as the content allows

The story requires `P` to be "a single value per orientation, shared by both
side regions, sized so the info region's contents fit it comfortably at any
window size the game is meant to be played at". Both side regions are given
that extent rigidly (`flex: 0 0 var(--region-extent)` or the grid equivalent),
because the reserved region must mirror the info region exactly for the board
to be centred — a content-sized info region and a mirrored reserved region
cannot both be true.

`P` therefore has to be chosen, and the plan states the method rather than
handing over a magic number:

**Portrait (`P` is a height).** The info region stacks the title, the HUD row
and the turn indicator. Every one of those is sized by a `clamp()` whose
middle term is keyed to viewport **width**, and all of them have a fixed `rem`
maximum, so the content's height is bounded but does vary with window width:

- title `clamp(1.5rem, 4vw, 3.5rem)` at `line-height: 1.5`, plus its `1rem`
  bottom margin;
- the tallest HUD row cell, `ScoreDisplay`: name `clamp(0.75rem, 1.5vw, 1rem)`,
  digits `clamp(1.5rem, 4vw, 2.5rem)`, two rows of five `0.6em` pips, `0.25rem`
  gaps;
- the HUD's `0.5rem` gap and the turn indicator
  `clamp(1rem, 2.5vw, 1.25rem)`.

At the clamp maxima that comes to roughly **16rem**; at a narrow portrait
window it is nearer **11rem**. A fixed 16rem would waste around 5rem twice
over on an ordinary portrait window, which comes straight off the board. So
portrait `P` should be a **single clamp expression that tracks the same
viewport-width scale as the content it holds** — something of the shape
`clamp(11rem, 26vw, 16rem)` is the expected starting point. The implementer
should re-derive it from the actual rules rather than trusting these figures,
and the owner tunes it at the gate.

**Landscape (`P` is a width).** Here the content is re-sized (D8) so that
nothing in the info column is keyed to window width, which makes landscape `P`
a plain fixed `rem`. It must hold the widest thing in the column — the title,
a row of five pips with its gaps, the score digits, and the turn indicator's
longest wording ("Green to play") — with room to breathe. Around **12rem** is
the expected starting point.

**The failure mode to watch, and the reason to keep `P` tight:** the board
never shrinks below `15 x 40px = 600px` (D6). Because the mirrored reserved
region costs the long axis a second `P + g`, an over-generous `P` pushes `S`
under the floor at window sizes that used to be comfortable — a near-square
1100x1000 window has about 1000px of interior on its long axis, so `P = 12rem`
leaves `S = 584px` and hits the floor, while `P = 10rem` leaves `648px` and
does not. Near-square windows are the case to check at the gate, in both
orientations.

`g` is likewise one token (suggested `--region-gap`), used both as the layout
container's `gap` and in the `S` expression, so the two cannot drift. `1rem`
is a sensible start.

### D6 — The board's 40px floor becomes a shared token; `S` carries the floor too

`Board.css` floors a square at `40px` (`max(40px, calc(100cqmin / 15))`), which
is what makes a too-small window overflow and scroll rather than draw an
illegible board. The story keeps that behaviour exactly.

With `S` now computed, the floor has to appear in two places: on `--play-size`
(so the play region reserves 600px of room and the group overflows) and in
`Board.css` (so a square is 40px). Rather than write `40px` twice, `index.css`
gains two `:root` tokens — the square floor, and the board floor derived from
it as fifteen squares — used by `Board.css` and `App.css` respectively.
`index.css` is where the app's shared tokens already live; a component
stylesheet defining `:root` tokens for another one would be worse.

**`.app__play` keeps `container-type: size` and `Board.css` keeps
`100cqmin`.** The container is now definitely sized — its `width` and `height`
are explicit lengths — so the mechanism that was in doubt no longer depends on
anything ambiguous. Keeping it means `Board` still measures itself against
whatever box it is put in, which keeps the component self-contained.

The alternative, dropping the container query and having `Board.css` read
`--play-size` directly, is deliberately **held in reserve for phase 2**: if
Chromium still disagrees after step 5, that is the first thing to try, because
it removes container queries from the picture entirely.

### D7 — The info region's internal restack lives in `Hud.css`, and changes no DOM

In landscape the info region reads: title, green side, round, red side, turn
indicator. That is already the DOM order — `Hud` renders `.hud__row`
(ScoreDisplay green, RoundCounter, ScoreDisplay red) and then `TurnIndicator`
beneath it. So the restack is one declaration: in landscape, `.hud__row`
becomes a column. **No markup changes, in `Hud.tsx` or anywhere else.**

That rule lives in `Hud.css`, not `App.css`, following the convention already
set by `.game-over-panel__heading` and `.start-screen__title`: a component's
stylesheet owns its own classes, and reaching across files into another
block's class is what makes a change in one place break another. A viewport
media query inside `Hud.css` is safe because the HUD is only ever rendered on
the in-game screen.

Because the DOM does not change, the reading order for assistive technology
does not change between orientations either. That is worth stating: it is the
reason this story does not owe the accessibility ledger an entry for the
restack.

`.hud`'s `margin: 0 0 1.5rem` is **removed** in step 2. The space between the
info region and the play area is now `g`, owned by the layout container; a
margin hanging off the bottom of the HUD would add to it invisibly and make
`P`'s derivation wrong.

### D8 — In landscape, the info column's type stops being keyed to the window's width

The story names the title: "its current `4vw` term grows with the window width
and would not [hold up in a narrow column]". The same is true of every other
size in the info region — the score digits are `clamp(1.5rem, 4vw, 2.5rem)`,
the names and the round label `1.5vw`, the round value and the turn indicator
`2.5vw`, and `.hud__row`'s gap `clamp(1.5rem, 6vw, 4rem)`, which in a column
becomes a 4rem **vertical** gap on a wide monitor. A column of fixed width
`P` cannot take type sized from a window that is four times wider than it.

So in landscape only, those sizes are overridden with fixed `rem` values
chosen to fit the column, and the row gap becomes a small fixed gap. Portrait
keeps today's expressions untouched, so the stacked layout looks as it does
now.

The title's landscape size must fit "GREED" (the on-screen name, from
`src/gameName.ts`) inside `P`, allowing for `letter-spacing: 0.12em` and
uppercase monospace: at 3.5rem the word is roughly 12.6rem wide, which is why
it cannot simply keep its portrait maximum. Around 2rem is the expected
starting point.

Considered and rejected: making the info region an `inline-size` container and
sizing its type in `cqw`, so the type would fit any `P` by construction. It is
the more elegant answer, and it survives `P` being re-tuned. It was rejected
for this story as one concept more than the problem needs — `P` is a constant
the implementer chooses and the owner tunes once, and fixed sizes are easier
to reason about at the gate. It is a good first move if a later story makes
`P` variable.

### D9 — The reserved region is a bare element with a word, and nothing else

Section 5 is emphatic: it draws `RESERVED` and nothing else, has no border or
panel styling beyond what it needs to be visible, no accessible name, no
landmark role, "nothing for a later story to have to undo".

So: a plain `div` with the text, styled only enough to be legible (the dim
text colour and a modest arcade-ish size are enough), centred in its region. No
`role`, no `aria-*`, no `data-*`, no border. Its whole purpose is to prove the
region is there, is the right size, and is in the right place.

**Accessibility cost, knowingly accepted (step 1 records it):** the word
`RESERVED` is plain text in the document, so a screen reader will read it out
as it passes, with no context saying what it is or why it is there. Adding
`aria-hidden` would suppress that, but it is a deliberate accessibility act on
a placeholder, and `CLAUDE.md` says pre-release stories do not spend work
here. The cost goes in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` instead, so the
later story that fills the region picks it up.

### D10 — Centring uses `safe center` on the axis that can overflow

The three regions are centred as a group with `justify-content: center` on the
layout container's main axis, which is what puts the leftover room at the two
far edges. But plain `center` in a flex container overflows in **both**
directions when the content is bigger than the box, and the leading overflow
is unreachable by scrolling — which is exactly the below-the-floor case the
story wants to "overflow and scroll as it does today". Today `.app__board`
avoids it with `align-items: flex-start`.

`justify-content: safe center` centres when there is room and falls back to
start alignment when there is not, which is the behaviour wanted. It is
supported by current Firefox and Chromium. If it proves troublesome, plain
`center` is acceptable and the degradation is confined to windows already too
small for the board's floor — but it should be tried first.

### D11 — Automated verification of a layout is structural only; the layout itself is the owner's

Tests here run under vitest with jsdom. **jsdom has no layout engine** — it
computes no sizes and no positions — and the CSS files are imported for Vite's
benefit and are not applied to the test document at all. No automated test in
this repository can confirm a single size, position, orientation or
`min()` result. Writing one that appeared to would be worse than writing none.

What automated tests **can** do, and what step 1 adds to `src/App.test.tsx`:

- the three region elements are rendered, once each, in the DOM order info,
  play, reserved;
- the `h1` and the HUD's contents are inside the info region;
- the board's `grid` is inside the play region;
- the reserved region holds the word `RESERVED` and neither of the other two
  holds anything unexpected;
- the start screen and the game-over panel still render no in-game regions;
- the existing axe checks still pass.

Those assertions have to reach for **class names** via `container.querySelector`,
because a region wrapper has no role, name or text of its own to find it by.
That is a coupling between test and stylesheet naming, and it is accepted
deliberately: it is the only handle jsdom offers, and there is precedent in
`src/board/BoardSquare.test.tsx`, which queries `.board-square__mark--*`
classes for the same reason.

Steps 2 and 3 are CSS-only and therefore carry **no new automated tests at
all**. Their automated verification is that the whole suite, the type check,
the linter and the formatter stay green — which proves they broke nothing, not
that they work. The proof that they work is step 4, the gate. This is stated
plainly rather than dressed up, and it is why the gate exists.

### D12 — Phase 2 is deliberately loosely specified

Steps 5 and 6 are written short on purpose. Only the owner can see what a
browser actually draws, so phase 2 proceeds in short cycles of change, look,
and adjust, and a plan that pretended to know the answer in advance would just
be wrong in a more confident voice. Step 5 is a look; step 6 is whatever step 5
shows is needed, with the likely candidates listed as leads rather than
instructions. If step 5 finds Chromium already correct, step 6 is closed as
not needed and its Notes say so.

---

## What the app looks like after each step

| After step | The app behaves like this                                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1          | Looks as it does today, plus the word `RESERVED` under the board. No sizing change; nothing responds to shape.                                                                                                   |
| 2          | Correct in portrait: three regions, mirrored, board centred and sized by the formula. **Wrong in landscape** — the portrait formula applies, so a wide window gets a small board. Knowingly so; step 3 fixes it. |
| 3          | Correct in both orientations. Phase 1 complete.                                                                                                                                                                  |
| 4          | Unchanged (the gate is an inspection).                                                                                                                                                                           |
| 5          | Unchanged (the Chromium look is an inspection).                                                                                                                                                                  |
| 6          | Firefox and Chromium agree.                                                                                                                                                                                      |
| 7          | Unchanged; the README is confirmed accurate.                                                                                                                                                                     |

The landscape gap after step 2 is the one knowingly broken intermediate state
in this plan. It exists because splitting scaffolding from behaviour and
portrait from landscape gives three steps that are each small enough to
diagnose, and because the alternative — one enormous CSS step — would mean any
fault found at the gate has the whole story as its suspect list.

---

# Phase 1 — the layout

## Step 1 — Three regions in the DOM

Status: pending

Restructure the in-game screen in `src/App.tsx` into a screen wrapper holding
three region elements, and add the reserved placeholder. **Appearance stays as
close to today's as this restructuring allows** — no sizing formula, no
orientation handling, and no media query in this step.

What to do:

- In `App.tsx`, in the branch that renders the game (the one currently
  producing a fragment with `<h1 className="app__title">`, `<Hud />` and
  `<div className="app__board">`), wrap all of it in one screen element
  (suggested class `app__screen`) containing, in this order:
  1. an info element (suggested class `app__info`) wrapping the existing `h1`
     and `<Hud />` **unchanged**;
  2. the play element — today's `<div className="app__board">`, renamed to
     `app__play`, still containing `<Board />`;
  3. a reserved element (suggested class `app__reserved`) whose only content
     is the text `RESERVED`. No `role`, no `aria-*`, no border — see D9.
- In `src/App.css`, rename the `.app__board` rule to `.app__play` (keeping its
  `container-type: size` and its current flex properties for now), add a
  `.app__screen` rule that makes the wrapper a single `flex: 1; min-height: 0;
width: 100%` column child of the cabinet — the same shape as
  `.start-screen` and `.game-over-panel`, so the cabinet's own rules need no
  change — and add minimal rules for `.app__info` and `.app__reserved` so the
  screen still reads as it does today with the placeholder beneath the board.
  Update the file's comments, which currently describe `.app__board` and the
  flex chain, to describe what is actually there now.
- In `src/board/Board.css`, update the header comment's reference to
  `.app__board` to the new class name. No behaviour change in that file.
- In `src/App.test.tsx`, add the structural assertions listed in D11. Use
  `container.querySelector` on the region class names, and state in a comment
  why (jsdom has no layout; a region wrapper has no role or name to find it
  by). The existing tests, including both axe checks, stay and must still
  pass.
- In `doc/plan/00000021-accessibility-tech-debt/known-issues.md`, add a
  `## From story 39 — adaptive screen layout` section recording the accepted
  cost from D9: the reserved placeholder puts the bare word `RESERVED` into
  the document as stray text with no context, read out by a screen reader as
  it passes, and the region deliberately carries no role, name or hidden
  attribute for a later story to undo. Follow the file's existing house style
  — a source line naming this plan's D9, a short description, and a "Where"
  line naming `src/App.tsx` and `src/App.css`.

Why it comes here: every later step needs these three elements to exist and to
be findable. Separating the markup change from the sizing change means the
gate has a much smaller suspect list, and it lets the structural tests land
before any CSS that cannot be tested.

Out of scope for this step: the sizing formula, `P`, `g`, the frame tokens,
media queries, and anything in `Hud.css` or the other HUD stylesheets.

Depends on: nothing.

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass, with the new structural
assertions in `src/App.test.tsx` passing and both existing axe checks still
clean.

## Step 2 — Sizing: the board is computed from the window (portrait)

Status: pending

Give the layout its arithmetic, for the stacked (portrait) case only.

What to do:

- In `src/index.css`, add two `:root` tokens: the square floor (`40px`, the
  value `Board.css` currently hard-codes) and the board floor derived from it
  as fifteen squares. Comment them as the one place the floor is stated.
- In `src/board/Board.css`, replace the literal `40px` in `--square` with the
  square-floor token. Nothing else in that file changes.
- In `src/App.css`, add tokens for the frame's three components and their sum
  (D4), and rewrite `.app`'s padding and `.app__cabinet`'s border and padding
  to use them, with the same values as today so the frame looks identical.
- Add tokens for the side-region extent `P` and the region gap `g`. Derive `P`
  for portrait as D5 describes — from the info region's own content at the
  maxima of its `clamp()`s — and write the derivation into the CSS comment so
  the number is not a mystery.
- Compute the play area's size into a custom property as
  `max(<board floor>, min(W, H - 2(P + g)))` where `W` and `H` are `100vw` and
  `100vh` less twice the frame inset. Give `.app__play` that value as both its
  `width` and its `height`, and keep `container-type: size` on it (D6), so
  `Board.css`'s `100cqmin` now measures a definitely-sized box.
- Give `.app__info` and `.app__reserved` the extent `P` rigidly (they must not
  grow or shrink), and make `.app__screen` a column flex container with `gap:
g`, centring the group on the main axis with `safe center` (D10) and its
  items on the cross axis.
- Remove `.hud`'s `margin: 0 0 1.5rem` in `src/hud/Hud.css` (D7) — the gap
  between regions is now `g`.

Why it comes here: it is the story's section 4 for one orientation, and it
must exist before the landscape override can be written as an override. It
depends on step 1 for the elements it sizes.

Out of scope for this step: media queries and anything landscape. After this
step a wide window is knowingly wrong (see the table above); do not add a
landscape rule "while you are in there".

Depends on: Step 1 (the three region elements and their classes).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass unchanged — no test moves in
this step. Per D11, that proves nothing was broken, not that the sizing is
right; the sizing is checked by the owner at step 4. If the implementer wants
a sanity check while working, `npm run dev` in a tall window should show the
board centred with equal empty room above the info region and below the
reserved one — but that observation is not the step's gate and does not pause
the pipeline.

## Step 3 — Landscape: three columns, and an info region that reads down

Status: pending

Add the wider-than-tall arrangement as an override on step 2's rules.

What to do:

- In `src/App.css`, add an `@media (orientation: landscape)` block (D2) that:
  - turns `.app__screen` into a row, keeping the same gap, the same
    `safe center` main-axis centring and cross-axis centring, so the group
    still sits in the middle with the leftover room at the far left and far
    right;
  - switches `P` to its landscape value (a fixed `rem`, per D5 and D8) and
    gives the two side regions that **width**, with their height left to
    their content and centred against the play area;
  - switches the play-area size expression to `max(<board floor>, min(H, W -
2(P + g)))`.
- In `src/hud/Hud.css`, in a landscape media query, make `.hud__row` a column
  and give it a small fixed gap in place of `clamp(1.5rem, 6vw, 4rem)` (D7,
  D8). The DOM does not change; the resulting order is title, green side,
  round, red side, turn indicator.
- In `src/App.css` (title) and `src/hud/ScoreDisplay.css`,
  `src/hud/RoundCounter.css` and `src/hud/TurnIndicator.css`, add
  landscape-only overrides replacing each `vw`-keyed size with a fixed `rem`
  size that fits a column of width `P` (D8). Each override lives in its own
  component's stylesheet, never in `App.css` reaching across. Portrait keeps
  today's expressions.
- Check the numbers against each other before finishing: the widest thing in
  the info column at its landscape size must fit inside `P` with room to
  spare, and `P` must be small enough that a near-square window does not push
  `S` under the 600px floor (D5).

Why it comes here: it is the second half of the story's section 4, written as
an override of the portrait defaults so there is exactly one place each value
is stated for each orientation. It completes phase 1.

Out of scope for this step: the start screen, the game-over panel, the board's
own artwork, and anything about Chromium.

Depends on: Step 2 (the tokens, the size expression and the region rules it
overrides).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass unchanged — again structural
only, per D11. The layout is checked by the owner at step 4, which comes next
and must not be skipped.

## Step 4 — GATE: the owner signs off the layout in Firefox

Status: pending

**This is the story's phase gate.** Implementation stops here. No work on step
5 or step 6 may begin until this step's Status reads `committed`.

The owner runs `npm run dev`, opens the app in **Firefox**, starts a game, and
resizes the window through the shapes below. Nothing is built for this check —
no fixture page, no script, no harness (settled decision 2).

What to look at:

1. **Tall window.** Three regions stacked: info at the top (title on its own
   line, then green side | round | red side in a row, then the turn indicator
   underneath — as today), the board beneath it, and `RESERVED` at the bottom.
2. **Wide window.** Three regions side by side: info on the left, board in the
   middle, `RESERVED` on the right. The info region reads down the column —
   title, green side, round, red side, turn indicator — with nothing wrapped,
   clipped or overflowing its column, and the title legible and in proportion.
3. **The board fills the short dimension.** On a clearly oblong window in
   either orientation, the board is as tall (landscape) or as wide (portrait)
   as the room inside the cabinet allows.
4. **The board is centred on both axes**, in both orientations — the reserved
   region is visibly the same size as the info region, so the board sits in
   the middle of the window rather than being pushed off-centre.
5. **The regions stay close to the board on an oblong window.** On a very wide
   window the info column sits just to the left of the board and the reserved
   column just to its right, with the empty space out at the far left and far
   right — not opened up between the board and the panels. The same, top and
   bottom, on a very tall window.
6. **Near-square windows.** Dragging the window towards square, the board
   shrinks a little below the short dimension so the two side regions still
   fit, rather than overlapping them or vanishing. Check both sides of the
   square boundary.
7. **Live re-layout.** Dragging a window from tall to wide and back flips the
   arrangement as it crosses, with no reload and no jump in what is on screen
   other than the layout itself.
8. **The cabinet spans the window.** The leftover space at the far edges is
   empty cabinet interior — the raised panel colour inside the frame — not
   page background.
9. **Nothing else moved.** The HUD shows the same numbers, pips, words and
   colours as before. The start screen and the game-over panel look and behave
   exactly as they did.
10. **Small windows still degrade the way they did.** A window too small for a
    600px board overflows and scrolls, with the top-left of the content
    reachable, rather than being clipped out of reach.

Depends on: Step 3 (phase 1 is complete).

Verification (manual): the owner confirms each of the ten observations above
in a running Firefox window and says so. Anything wrong comes back as a fix to
the step that owns it — step 1 for structure, step 2 for portrait sizing, step
3 for landscape — re-verified, and this gate is run again. Tuning `P`, `g` or
the landscape type sizes is expected here and is a change to step 2 or step 3,
recorded in that step's Notes.

---

# Phase 2 — Chromium

**Do not begin either step below until step 4 reads `committed`.**

## Step 5 — Look at the layout in Chromium and record what differs

Status: pending

With the layout signed off in Firefox, the owner runs `npm run dev` and opens
the same app in **Chromium**, going through the same ten observations from step
4, and records what differs.

The specific thing being looked for is the story's section 6: in Firefox the
board grows to fill the room it is given; in Chromium it has been settling at a
size of its own choosing, ignoring the rest of the window, with only browser
zoom changing it. Phase 1 replaced the flex-inherited sizing chain with a size
computed directly from the window (D3), which is the story's own suggested
lead, so **Chromium may already be correct**. That is a legitimate and good
outcome.

The step's whole output is an answer, written into its Notes: either
"Chromium matches Firefox on all ten observations" — in which case step 6 is
closed as not needed — or a specific list of what Chromium draws differently,
at what window sizes, which is what step 6 then works from.

No code changes in this step.

Depends on: Step 4 (the gate has passed and the Firefox layout is the agreed
reference).

Verification (manual): the owner reports what Chromium shows against each of
step 4's ten observations. There is nothing to run beyond `npm run dev`.

## Step 6 — Make Chromium and Firefox agree

Status: pending

**The shape of this step depends on what step 5 shows, and it is expected to be
conversational rather than a clean run** (D12): short cycles of change, look
and adjust, driven by what the owner sees, until both browsers draw the same
thing and the sizing rules of the story's section 4 hold in both. If step 5
found no difference, this step is closed as not needed with a Notes line
saying so.

Leads, in the order worth trying — these are candidates, not instructions:

1. **Drop the container query from the board's sizing.** `.app__play` still
   has `container-type: size` and `Board.css` still measures `100cqmin`
   against it (D6). Having `--play-size` reach `Board.css` directly as a
   custom property, and dropping `container-type` altogether, removes
   container queries from the picture entirely. This is the reserved fallback
   named in D6 and the first thing to try.
2. **The viewport unit.** `100vh` versus `100dvh`/`100svh`, and `100vw`'s
   scrollbar gutter (D4) — engines differ on both, and either can show up as a
   size that is slightly wrong or as an unexpected scrollbar.
3. **The cabinet's own height chain.** `.app`'s `min-height: 100vh` with a
   `flex: 1` cabinet is still what makes the cabinet span the window. It no
   longer feeds the board's size, but if the two engines disagree about the
   cabinet's height the empty interior at the far edges will differ. Giving
   the cabinet a definite height instead of a stretched one is the fix if so.
4. **Rounding.** Sub-pixel differences in `min()`/`max()` results can leave a
   one-pixel row or column visible in one engine and not the other. Cosmetic,
   but worth naming so it is not mistaken for the real bug.

Whatever is changed must leave Firefox as the owner signed it off at step 4 —
both browsers end up in the same place, and that place is the one already
approved. Re-check Firefox after every change.

Depends on: Step 5 (its findings are this step's specification).

Verification (manual): the owner runs `npm run dev` and confirms all ten of
step 4's observations in **both** Chromium and Firefox, and that the board
grows to fill the window in both. Any residual difference the owner decides to
live with is recorded in this step's Notes rather than left implicit.

---

## Step 7 — README check

Status: pending

Confirm `README.md` is still accurate given this story's changes, and update it
if it is not. The `/update-readme` command automates this: it reviews the
current branch diff and updates `README.md` if warranted.

What to weigh: the README is written for a player and describes what the app
is and how a game goes, not how the screen is laid out. This story adds no
feature, changes no rule and adds no control — the most it does is make the
screen use the window's shape, and put a placeholder panel on screen. If the
README says nothing that this story falsified, the correct outcome is **no
change**, and the step's Notes say so and why. Do not invent a paragraph about
window sizes for the sake of having edited something.

Depends on: Step 6 (the story's visible behaviour is final).

Verification (automated): `npm run format:check`, `npm run lint` and
`npm test` pass, and — if the README was edited — every claim in the changed
paragraphs is something a player can actually see in the running app.
