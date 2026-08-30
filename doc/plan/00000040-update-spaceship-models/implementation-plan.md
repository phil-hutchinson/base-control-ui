# Implementation plan — 00000040 Update spaceship models

## What this story is

The ships get new artwork, and nothing else changes.

Today a ship on the board is drawn by `src/board/ShipIcon.tsx` as a flat
two-tone silhouette — a green dart or a red hexagon, one `<path>` each —
ringed by four quarter-circle shield arcs whose geometry comes from
`src/board/shieldArcs.ts`.

After this story a ship is drawn as a fully modelled craft:

- **Green** — a swept-wing craft with three turbojets, silver with green trim.
- **Red** — a thick disk with one oversized engine and two command pods,
  silver with red trim.

Both are seen from the front and slightly above, both are drawn in the same
`0 0 100 100` viewBox the current icon uses, so they drop into a board square
exactly as it does.

The four-arc ring is **deleted**. In its place each model carries a **shield
gauge**: a row of four small overhead ship icons across the **top** of the
square, one per shield the ship could carry (shields run 0–4, `rules.md` §4.1
and `src/rules/shields.ts`). A lit icon is filled in the player's colour and
carries a thick bar just below it; an unlit icon drops both the fill and the
bar and is left as a hollow outline. Icons light left to right.

The same two models also appear on the **start screen** as decoration — green
left of the title/options/PLAY column, red right of it — at about triple their
board size, with **no** gauge.

**No rules change.** `doc/ruleset/rules.md`, `doc/ruleset/changelog.md` and
`RULES_VERSION` are untouched by this story. Nothing in this plan edits them
and nothing is tagged.

---

## Where the artwork comes from — read this first

The finished artwork was authored outside the app and handed over in
**`.local/eg_spaceship.html`**. That folder is **git-ignored**: the file is not
part of the repository, will not survive a fresh clone, and no future reader of
this plan can be assumed to have it.

Step 1 lifts the artwork out of that file into the app. Everything after
step 1 works from what step 1 committed and never needs the file again.

**If `.local/eg_spaceship.html` is missing when step 1 runs, stop and escalate
to the owner. Do not invent, redraw, or approximate the artwork.**

What the file contains — two `<svg width="60" height="60" viewBox="0 0 100
100">` blocks on a `#151c31` background (which is exactly `--color-space-raised`,
the board square's own background, so the art was drawn against the surface it
will sit on):

**Green ship block**

| Source `id` | Kind             | What it is                                       |
| ----------- | ---------------- | ------------------------------------------------ |
| `s2front`   | `linearGradient` | engine-housing front face                        |
| `s2deck`    | `linearGradient` | top deck                                         |
| `s2wing`    | `linearGradient` | wings                                            |
| `s2rim`     | `linearGradient` | jet rim                                          |
| `s2pod`     | `radialGradient` | crew pod dome                                    |
| `s2bore`    | `radialGradient` | jet bore                                         |
| `s2glow`    | `radialGradient` | jet glow, and the ground wash under the ship     |
| `s2nav`     | `radialGradient` | nav lights and pod beacon                        |
| `s2pwrShip` | `<g>`            | gauge-icon geometry (hull+wings path, crew path) |
| `s2jet`     | `<g>`            | one turbojet, `<use>`d three times by the hull   |
| `ship`      | `<g>`            | the whole green hull                             |
| `shipGauge` | `<g>`            | a worked example of the gauge at 3 of 4          |

**Red ship block**

| Source `id`   | Kind             | What it is                                      |
| ------------- | ---------------- | ----------------------------------------------- |
| `s3face`      | `radialGradient` | disk top face                                   |
| `s3rim`       | `linearGradient` | disk rim and turbine face                       |
| `s3nacelle`   | `linearGradient` | engine barrel                                   |
| `s3bore`      | `radialGradient` | turbine bore                                    |
| `s3eglow`     | `radialGradient` | engine glow, and the ground wash under the ship |
| `s3nav`       | `radialGradient` | nav lights and pod beacons                      |
| `s3pod`       | `radialGradient` | command pod domes                               |
| `s3pwrShip`   | `<g>`            | gauge-icon geometry (disk circle + engine rod)  |
| `s3ship`      | `<g>`            | the whole red hull                              |
| `s3shipGauge` | `<g>`            | a worked example of the gauge at 3 of 4         |

The two `…Gauge` groups in the file are **examples**, not something to lift
verbatim: the gauge is redrawn per ship from the shield count, so only the
`…pwrShip` icon geometry is shared. The gauge's own numbers are tabled in
"Gauge data" below so a later step never has to open the file.

### Gauge data (lifted from the source file, so it need not be reopened)

Four slots in one row, each a `<g>` with `transform="translate(X, 3)"`, X
running **10, 33, 56, 79** left to right (a 23-unit pitch) in the 0–100
viewBox. Every slot draws, in this order:

1. a **separator underlay** `<use>` of the side's gauge-icon geometry, with
   `fill` and `stroke` both `#151c31` at `stroke-width="3.4"` — this is what
   keeps neighbouring icons visually apart;
2. the **icon** `<use>` at `stroke-width="1.5"`, whose `fill` and `stroke`
   depend on lit/unlit (table below);
3. **only when lit**, two coincident bars at `y = 25`, from `x = 2.5` to
   `x = 13.5`, `stroke-linecap="round"` — first `#151c31` at
   `stroke-width="8"`, then the side's bar colour at `stroke-width="6"`.

The enclosing gauge `<g>` carries `stroke-linejoin="round"`.

| Side  | Lit fill  | Icon outline | Bar colour | Unlit fill | Unlit outline |
| ----- | --------- | ------------ | ---------- | ---------- | ------------- |
| green | `#4fbf72` | `#7dffab`    | `#4fbf72`  | `#151c31`  | `#4fbf72`     |
| red   | `#e00000` | `#ff8f8f`    | `#e00000`  | `#151c31`  | `#e00000`     |

---

## Vocabulary reminder for a cold reader (`CLAUDE.md`)

- **Ply** is the code word for what the UI calls a **turn**.
- **Hub** is the code word for what the UI calls a **node**; **site** is the
  fixed board position a hub can appear at.
- **Move** means one ship changing squares — never a whole turn.

None of this matters much here: this is a drawing story and no rule logic is
touched. It is repeated only so the words in the files being edited read
correctly.

---

## Settled decisions that are not to be re-opened

These were decided by the owner before planning. An implementer who disagrees
should raise it, not act on it.

1. **The models go in exactly as supplied.** Geometry, gradients, stroke
   colours and gauge layout are taken as given. They are ported, not
   redesigned, not tidied, not "improved".
2. **The palette mismatch is knowingly out of scope.** The models' greens and
   reds are brighter and more saturated than the `--color-green` /
   `--color-red` tokens used by the HUD, score pips and selection marks. That
   clash is accepted for this story. Do **not** retune either the models or
   the tokens; whether to do so is judged later, from the running app.
3. **The bottom-anchored composition is correct.** The hull sits low in the
   viewBox and the gauge runs across the top. That is deliberate — it leaves
   the middle of the square clear so the site/node marker underneath stays
   readable. Do **not** re-centre the hull or "fix" the vertical placement.
4. **On a window too narrow to flank the centre column, the two start-screen
   ships restack below the column, side by side.** They are not hidden and not
   shrunk to fit.
5. **No test script, fixture page, harness, screenshot tool or manual-test
   document is written.** The owner drives manual testing himself by running
   `npm run dev`. A manual step says what to run and what to look at, and
   nothing more is built for it.
6. **No plan step tests accessibility** (`CLAUDE.md`, accessibility during
   pre-release). Existing automated tests are updated where the path is
   straightforward. Where a change knowingly costs an accessible behaviour,
   the cost is accepted and recorded in
   `doc/plan/00000021-accessibility-tech-debt/known-issues.md` **as part of the
   step that causes it** — see D12, which explains why this story is not
   expected to owe an entry.
7. **The ruleset is untouched.** No version bump, no changelog entry, no
   `RULES_VERSION` change, no tag.

---

## Where the work lands

| File                                                         | What happens to it                                                               |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `src/ships/shipArt.ts` (new)                                 | Sprite id names and the per-side gauge palette/geometry (step 1)                 |
| `src/ships/ShipDefs.tsx`, `.css` (new)                       | The hidden sprite: both models' defs, mounted once (step 1)                      |
| `src/ships/ShipDefs.test.tsx` (new)                          | Ids unique and self-consistent inside the sprite (step 1)                        |
| `src/App.tsx`                                                | Mounts `<ShipDefs />` once, above both screens (step 1)                          |
| `src/App.test.tsx`                                           | One sprite on both screens (step 1); document-wide id uniqueness (steps 4, 6)    |
| `src/ships/shieldGauge.ts`, `.test.ts` (new)                 | Which of the four gauge slots are lit at a shield count (step 2)                 |
| `src/ships/ShipModel.tsx`, `.css`, `.test.tsx` (new)         | One ship, drawn from `<use>` references, gauge optional (step 3)                 |
| `src/board/BoardSquare.tsx`                                  | Renders `ShipModel` instead of `ShipIcon` (step 4)                               |
| `src/board/BoardSquare.css`                                  | The dampening selector moves from `.ship-icon` to `.ship-model` (step 4)         |
| `src/board/ShipIcon.tsx`, `.css`, `.test.tsx`                | **Deleted** (step 4)                                                             |
| `src/board/shieldArcs.ts`, `.test.ts`                        | **Deleted** (step 4)                                                             |
| `src/board/Board.test.tsx`, `src/board/BoardSquare.test.tsx` | Selectors move off `.ship-icon` / arcs onto `.ship-model` / gauge slots (step 4) |
| `src/start/StartScreen.tsx`, `.css`, `.test.tsx`             | The two flanking ships and the three-area layout (step 6)                        |
| `README.md`                                                  | Checked, updated only if this story falsified something in it (step 8)           |

Deliberately **not** touched:

- **`src/board/SiteMarker.*`, `EnergyOverlay.*`, `Board.tsx`, `src/board/grid/*`.**
  Nothing about the site marker, the energy overlay, the grid or its keyboard
  handling changes.
- **The square markings in `BoardSquare.tsx`** — destination disc, target
  ring, selected brackets, already-acted bar, no-action bar — keep their
  current geometry and colours. See D10 for the one place the new gauge
  overlaps them and why it is not fixed here.
- **`src/board/squareLabel.ts`.** A square's accessible name still carries the
  side and the shield count in words, exactly as today.
- **Every module under `src/rules/` and `src/game/`.** No game logic is
  involved.
- **`doc/ruleset/`.**
- **This story's own `story.md`.** If `npm run format:check` complains about
  it, as it has on earlier stories' files, it is not this story's to fix.

---

## Design decisions and reasoning

This section is the design record. Code in this repository does not carry
design history (`CONTRIBUTING.md`, "Comments"), so anything a future reader
needs to know about **why** is written here and nowhere else.

### D1 — One shared sprite of `<defs>`, `<use>`d per ship — not per-instance ids

This is the story's section 2, and the central decision of the plan.

The artwork leans hard on `id`: eight gradients plus a turbojet group and a
gauge-icon group for the green ship, seven gradients plus a gauge-icon group
for the red one. Up to fourteen ships are on the board at once. Copying the
whole artwork per ship would repeat every one of those ids fourteen times in
one document, which is invalid HTML and leaves gradient resolution up to the
browser's tie-breaking.

**Chosen: declare everything once, share it.** A single `ShipDefs` component
renders one hidden `<svg>` containing a `<defs>` block with, for each side:
every gradient, the green ship's turbojet group, the side's whole hull as one
group, and the side's gauge-icon geometry as one group. It is mounted **once**,
at the app root in `App.tsx`, above both the start screen and the game, so it
exists whichever screen is showing. Every ship — on the board and on the start
screen — then renders a small `<svg viewBox="0 0 100 100">` containing a
`<use>` reference to its side's hull group, plus (on the board) four gauge
slots that `<use>` the side's gauge-icon geometry.

Why this and not the alternatives:

- **Per-instance unique ids (e.g. React's `useId`, or ids suffixed with the
  square's name the way `SiteMarker` does).** Rejected on DOM weight first:
  each model is roughly 60–90 SVG elements, so fourteen ships would put well
  over a thousand nodes of pure artwork into the document and into React's
  reconciliation on every board render, versus fourteen `<use>` elements.
  Secondarily, `useId`'s generated values are not chosen with URL fragment
  references in mind and would need sanitising before appearing inside
  `url(#…)`, which is an extra moving part for no gain. The one thing this
  route buys — the ability to vary the art per instance — is not needed,
  because the hull is identical for every ship of a side.
- **An external sprite file referenced as `<use href="/ships.svg#hull">`.**
  Rejected: cross-document `<use>` is not supported in Chromium or WebKit, only
  Firefox. It would also add a network fetch to an app that deliberately makes
  none.
- **Inlining the art per ship and hoping the duplicate ids resolve.**
  Rejected: it is invalid, and "which gradient wins" is exactly the kind of
  unpredictability the story forbids.

**Why `SiteMarker` stays on per-instance ids and is not converted.** Its
gradient stops are _computed per render_ from the site's cycle position, so its
gradient genuinely differs per instance and cannot be shared. The ships' art is
static. The two components differ for a real reason, not by accident; a reader
noticing the inconsistency should read this paragraph and stop worrying.

**The gauge is deliberately only half shared.** The four-icon _shape_ comes
from the sprite; each ship's four _slots_ — their fills, outlines and bars —
are drawn in the ship's own `<svg>`, because they depend on the ship's shield
count. That keeps the per-ship DOM to about a dozen elements while letting each
ship show a different number lit.

### D2 — Hiding the sprite: an out-of-flow zero-size `<svg>`, not `display: none`

`ShipDefs` renders `<svg aria-hidden="true">` styled `position: absolute;
width: 0; height: 0; overflow: hidden`, with all content inside `<defs>`.

`display: none` is the obvious way to hide it and is the wrong one: engines
have historically failed to resolve `<use>` references into a `display: none`
subtree, and the failure mode is "every ship is invisible", which is
expensive to diagnose. The zero-size absolutely-positioned form is the
long-standing SVG-sprite idiom and takes the element out of `.app`'s flex
column so it disturbs no layout.

Content inside `<defs>` is never rendered directly but is always referenceable,
which is what makes one `<svg>` able to serve both screens.

### D3 — The shared art lives in a new `src/ships/` folder

Three places need it: `src/App.tsx` (mounts the sprite), `src/board/` (ships on
the board) and `src/start/` (ships on the start screen). Putting it under
`src/board/` would make the start screen import from the board, which is
backwards — the start screen has no board. `src/ships/` is a peer of `board`,
`hud`, `start`, `game` and `rules`, and reads as what it is: how a ship is
drawn, wherever a ship is drawn.

Rejected: keeping the files in `src/board/` "because that is where `ShipIcon`
was". The old component was board-only; the new one is not.

### D4 — `ShipIcon` and `shieldArcs` are deleted, not wrapped

`ShipIcon` exists to draw a hull and a ring of arcs. The ring is gone and the
hull is now a `<use>`, so nothing of it survives; keeping it as a thin wrapper
around `ShipModel` would leave a component whose only job is to rename another
one. `shieldArcs.ts` exists solely to name the four arc positions and their
fill order; with no arcs there is nothing for it to name.

Their replacement pair is `src/ships/ShipModel.tsx` (the drawing) and
`src/ships/shieldGauge.ts` (which of the four slots are lit at a given shield
count). The split mirrors the old one and follows `CONTRIBUTING.md`'s
preference for keeping logic out of components: the lit/unlit ordering gets a
plain unit test in the fast `node` environment, and the component test only has
to check that the component draws what the module says.

The CSS class name changes with the component: `.ship-icon` becomes
`.ship-model`, with `.ship-model--green` / `.ship-model--red` modifiers.
`BoardSquare.css`'s dampening rule and several board tests select on the old
name and move with it (step 4).

### D5 — Component tests can assert structure only; jsdom does not render `<use>`

jsdom has no SVG rendering: it will not resolve a `<use>`, will not apply a
gradient, and reports no geometry. Every automated check in this plan is
therefore **structural** — which elements exist, what `href` and `data-*`
values they carry, how many gauge slots are lit — and never "it looks right".

That is the whole reason steps 5 and 7 are manual gates. Appearance is checked
by the owner in a real browser, and only there.

### D6 — Start-screen ships are sized from `--play-size`, at exactly one fifth of it

The story asks for "about triple the size they draw at on the board, measured
against the current viewport — so roughly three board squares across".

`src/App.css` already defines `--play-size` on `:root`: the side of the board's
square play area, computed directly from the viewport (and floored at
`--board-floor`, which is fifteen times `--board-square-floor`). The board is
fifteen squares across, so one board square is always exactly
`--play-size / 15`, and three of them are `--play-size / 5`.

So `StartScreen.css` derives its own token from `--play-size / 5`. Nothing is
hard-coded, nothing has to be kept in step with the board's sizing, and the
ships track the window exactly as the board would. `--play-size` is a `:root`
token, so it is available on the start screen even though no board is on
screen.

Rejected: a fixed `rem` size, or a `vw`-based clamp of its own — both would
drift out of step with the board the moment `App.css`'s sizing changes, and
neither delivers "three board squares" at any particular window size.

### D7 — The start screen becomes a three-area CSS grid with one width breakpoint

`.start-screen` is today a centred flex **column** holding the title, two
option fieldsets and the PLAY button, and is a `flex: 1` child of
`.app__cabinet`.

It becomes a **grid** with three children in DOM order: green ship, the
existing column (moved wholesale into a new `.start-screen__column` element
that inherits today's column flex rules), red ship. Named grid areas place
them:

- **Wide enough:** one row, `"green column red"`, side tracks `1fr` so the
  column stays centred in the screen, `align-items: center` so the ships are
  vertically centred against it.
- **Too narrow:** two rows, `"column column"` over `"green red"`, so the pair
  drops below the column and sits side by side — the restack the story
  requires (settled decision 4). The ships keep their size; nothing shrinks.

Why grid and not flex: `flex-wrap` on a row of [ship, column, ship] wraps into
_three_ stacked rows, ship above column above ship. It cannot produce "both
ships below, side by side" without reordering the DOM. Grid areas express the
required arrangement directly and leave the DOM alone.

The switch is a plain `@media (max-width: …)` query on the viewport — not a
container query (`.start-screen` cannot query itself, and making the cabinet a
size container is the exact mechanism story 39's D2 deliberately avoided) and
not a JavaScript resize listener.

**Choosing the breakpoint.** The column's widest item is the PLAY button
(`clamp(1.5rem, 3vw, 2rem)` type with `3em` side padding, so roughly 18rem at
its maximum); each ship is `--play-size / 5`, which is about 7.5rem when the
board is at its 600px floor and grows from there; add the grid gaps and the
cabinet frame's inset and the row needs roughly **40rem** before it is
comfortable. **`48rem` is the starting point**; the implementer checks it by
hand and the owner tunes it at step 7's gate. It is a tuning number, not a
specification.

**Note on order:** in the stacked arrangement the column is visually first but
second in the DOM. This costs nothing, because the ships are `aria-hidden`
decoration and are not in the reading order at all.

### D8 — The ships on the start screen are decoration and carry no gauge

`ShipModel` takes an optional shield count. **Given** one, it draws the gauge;
**omitted**, it draws the hull alone. The start screen omits it — there is no
game, so there are no shields to show, and the story asks for the gauge to be
left off entirely.

Making presence-of-gauge follow presence-of-the-prop, rather than adding a
separate `showGauge` flag, keeps the two impossible states (a gauge with no
count, a count with no gauge) unrepresentable.

The start-screen ships are `aria-hidden`, not focusable, and have no click
handler: they are wallpaper. Each sits inside a small wrapper element that
carries the grid area and the size; `ShipModel` fills its wrapper the same way
it fills a board square.

### D9 — The gauge sits at the top of the square, on purpose

The gauge occupies roughly the top quarter of the viewBox (icons from y≈3 to
y≈21, lit bars at y=25) and the hull sits from y≈61 downward. The clear band
between them is what lets a charged or dormant site's marker — drawn _beneath_
the ship in the same square — stay readable through the middle of the square.
This is settled decision 3: do not re-centre anything.

### D10 — The gauge overlaps two existing square markings, and this story does not move them

Worth knowing before anyone reports it as a bug in step 5:

- The **already-acted bar** (`BoardSquare.tsx`) is drawn from x=35 to x=65 at
  y=8..13, over the ship. Gauge slots 2 and 3 occupy roughly x=33..48 and
  x=56..71 at y=3..21. They overlap.
- The **selected-ship brackets** have their top arms at y=9 running x=9..29 and
  x=71..91, which clips the corners of gauge slots 1 and 4.

The story's section 1 says every existing marking "keeps working unchanged",
and settled decision 1 says the art goes in as supplied — so this plan changes
neither. The overlap is put in front of the owner explicitly at step 5's manual
gate. If he wants it resolved, the fix (moving the already-acted bar down, or
moving the gauge) is a change to step 4 re-verified at the gate, or a follow-up
story — not something an implementer decides unilaterally.

### D11 — The gauge's separator colour is the board square's background, and does not match a bay

The gauge's dark separator underlay is `#151c31`, which is exactly
`--color-space-raised`, the ordinary board square's background. Bay squares are
filled `#223463` (`--bay-fill`, `Board.css`), so on a bay the separator will
read as a dark outline against a lighter blue rather than disappearing into the
background.

The literal `#151c31` from the artwork is kept rather than substituted with
`var(--color-space-raised)`: the models go in as supplied (settled decision 1),
and the two happen to be the same value today. This is listed here so step 5's
gate looks at a ship sitting in a bay deliberately, and so nobody later
"discovers" the mismatch and treats it as a defect.

### D12 — What this story owes the accessibility ledger: nothing, and here is why

`CLAUDE.md` requires that any accessible behaviour a pre-release change
knowingly costs is recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`. Weighing this
story against that:

- **The two sides still differ in shape, not only colour.** A swept-wing
  three-engine craft and a single-engine disk are as distinguishable in
  greyscale as the old dart and hexagon were.
- **Lit and unlit gauge icons still differ by more than colour** — a lit icon
  is filled and carries a bar, an unlit one is a hollow outline.
- **The square's accessible name is unchanged.** `squareLabel.ts` still speaks
  the side and the shield count in words, which is how the information actually
  reaches assistive technology; the artwork stays `aria-hidden` on both
  screens, as it is today.
- **Deleting `ShipIcon.test.tsx` removes an axe run**, but ships are covered in
  situ by the axe runs already in `Board.test.tsx` and `App.test.tsx`, so no
  coverage is lost in practice.

So **no entry is expected**. If an implementer nonetheless finds they have
given something up, they add the note to `known-issues.md` in the same step,
under a "From story 40" heading, and say so in that step's `Notes:`.

Per `CLAUDE.md`, no step in this plan exists to test accessibility, and no new
axe run is added.

---

## Step 1 — Lift the artwork into a shared, hidden sprite

Status: committed

Create `src/ships/` and, in it:

- **`shipArt.ts`** — the single place the sprite's `id` names are written down,
  keyed by side (hull group, gauge-icon group), together with the per-side
  gauge palette and slot geometry from the "Gauge data" table above. Both the
  sprite and, later, `ShipModel` read the ids from here, so a rename cannot
  half-happen. Give every id a `ship-` prefix (for example `ship-green-hull`,
  `ship-red-gauge-icon`, `ship-green-grad-wing`) so they cannot collide with
  `SiteMarker`'s `site-<square>-fill` ids or with anything a later story adds.
- **`ShipDefs.tsx` / `ShipDefs.css`** — one component rendering a single hidden
  `<svg aria-hidden="true">` whose entire content is a `<defs>` block holding,
  for both sides: every gradient, the green ship's turbojet group, each side's
  hull as one group, and each side's gauge-icon geometry as one group. Hide it
  per **D2** — `position: absolute; width: 0; height: 0; overflow: hidden`,
  **not** `display: none`.

Port the artwork from `.local/eg_spaceship.html` **verbatim**: same paths, same
gradient stops, same stroke colours and widths, same opacities, same element
order. The **only** permitted edits are (a) renaming every `id` to its
prefixed form and updating every `url(#…)` and `href="#…"` reference to match,
including the green hull's three internal `<use>` references to the turbojet,
and (b) whatever SVG-attribute-to-JSX-prop conversion React requires. Do not
lift the file's two example gauge groups — the gauge is drawn per ship in
step 3.

**If `.local/eg_spaceship.html` is not present, stop and escalate to the owner
rather than approximating the artwork.**

Then mount it: `src/App.tsx` renders `<ShipDefs />` once, inside `<main
className="app">` and above the cabinet, so it is present on the start screen
and on the game screen alike, and is never mounted twice.

Nothing uses the sprite yet — this step is scaffolding only, and the board
still draws the old `ShipIcon`.

Depends on: nothing.

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass, plus:

- a new `src/ships/ShipDefs.test.tsx` that renders `ShipDefs` and asserts
  (i) every `id` in the rendered subtree is **unique**, (ii) every `id` named
  by `shipArt.ts` is present, and (iii) every internal reference — each
  `href="#…"` and each `url(#…)` inside a `fill` or `stroke` — points at an id
  that the sprite actually defines, so a missed rename fails the build rather
  than silently drawing a black ship;
- an addition to `src/App.test.tsx` asserting exactly one sprite element is
  rendered, both on the start screen and after PLAY, and that it is
  `aria-hidden`.

**Notes:** Added `src/ships/shipArt.ts` (sprite ids plus the gauge palette
and slot geometry, all prefixed `ship-`), `src/ships/ShipDefs.tsx`/`.css`
(the single hidden `<svg>` of `<defs>`, ported verbatim from
`.local/eg_spaceship.html` apart from the required id renames and
JSX-attribute conversion — the two example gauge groups were left out per
the step's instruction, since step 3 draws the gauge from
`shipArt.ts`/`shieldGauge.ts` instead) and `src/ships/ShipDefs.test.tsx`
(id-uniqueness, every named id present, every `href`/`url(#…)` reference
resolving). Mounted `<ShipDefs />` once in `src/App.tsx`, above
`.app__cabinet`, and added an `App.test.tsx` case asserting exactly one
`.ship-defs` sprite is present, `aria-hidden`, on both the start screen and
after PLAY. Verified element-for-element against the source file (path,
circle, ellipse, line, rect, gradient, stop, use and g counts) that nothing
beyond the two example gauge groups was dropped. No deviation from the
plan. `npm run typecheck`, `npm run lint`, `npm run format:check` and
`npm test` all pass (768 tests, including 3 new in `ShipDefs.test.tsx` and
the new `App.test.tsx` case).

---

## Step 2 — The gauge's lit/unlit rule as a plain module

Status: pending

Add `src/ships/shieldGauge.ts` and `src/ships/shieldGauge.test.ts`: given a
`ShieldCount` (0–4, from `src/rules/shields.ts`), produce the four gauge slots
in fixed left-to-right order, each marked lit or unlit, with the first
`shields` of them lit. Export the slot count as a named constant rather than
leaving `4` loose in the component.

This is the replacement for `src/board/shieldArcs.ts` (which is deleted in
step 4, while `ShipIcon` still needs it). Keep it small: it is presentation
ordering, not a rule, and it must not restate anything from `rules.md`.

Depends on: nothing (it is independent of step 1; it is placed here so step 3
can draw a gauge without inventing the ordering).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` pass, and `shieldGauge.test.ts` covers
all five counts — 0 lights none, 4 lights all, and the intermediate counts
light a left-to-right prefix — asserting the returned length is always four.

---

## Step 3 — `ShipModel`: one ship drawn from the sprite, gauge optional

Status: pending

Add `src/ships/ShipModel.tsx` and `src/ships/ShipModel.css`.

The component takes a `side` and an **optional** `ShieldCount`, and renders one
`<svg viewBox="0 0 100 100" aria-hidden="true">` carrying the classes
`ship-model` and `ship-model--<side>`, containing:

1. a `<use>` reference to that side's hull group id from `shipArt.ts`;
2. **only when a shield count is given**, a gauge group holding four slots
   built from `shieldGauge.ts` and the gauge data in `shipArt.ts` — each slot
   translated to its x offset, drawing the separator underlay `<use>`, the icon
   `<use>`, and, when lit, the two bars (see "Gauge data" above for every
   number and colour).

Give each slot a `data-gauge-slot` index and a `data-gauge-lit` flag, so tests
can assert what is drawn without rendering (D5).

`ShipModel.css` sets only the element's box — `display: block; width: 100%;
height: 100%` — exactly as `ShipIcon.css` and `SiteMarker.css` do, so the model
fills whatever square or wrapper it is put in. **Do not set `fill` or `stroke`
in CSS**: the artwork's colours arrive as attributes, and the gauge icons rely
on the `<use>` element's own `fill`/`stroke` being inherited into the
referenced geometry, which a stylesheet rule would override.

Nothing renders `ShipModel` yet; the board still draws `ShipIcon`.

Depends on: Step 1 (the sprite ids exist and are exported from `shipArt.ts`)
and Step 2 (the lit/unlit ordering).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` pass, plus a new
`src/ships/ShipModel.test.tsx` asserting:

- for each side, the hull `<use>` references that side's id and the two sides
  reference **different** ids;
- at each shield count 0–4, exactly four `data-gauge-slot` elements appear, in
  index order, with exactly `shields` of them `data-gauge-lit`, and the lit
  ones being the leftmost;
- lit slots draw the bars and unlit slots draw none;
- with no shield count given, no gauge element is rendered at all;
- the `<svg>` is `aria-hidden` and carries no `<title>` or `<desc>`;
- the gauge count agrees with the words in `squareLabel.ts` for the same
  occupant — carried over from the deleted `ShipIcon.test.tsx`, which held the
  equivalent check for arcs.

---

## Step 4 — The board draws the new model; the old icon and arcs are deleted

Status: pending

Switch the board over:

- `src/board/BoardSquare.tsx` renders `ShipModel` (side and shield count from
  the occupant) in place of `ShipIcon`. Nothing else in that file changes:
  the site marker still renders before the ship, and the destination, target,
  selected, already-acted and no-action marks still render after it, in the
  same order and with the same geometry (see D10).
- `src/board/BoardSquare.css`'s dampening rule selects `.ship-model` instead of
  `.ship-icon`; its comment is updated to match, and the dampening behaviour is
  otherwise unchanged.
- **Delete** `src/board/ShipIcon.tsx`, `ShipIcon.css`, `ShipIcon.test.tsx`,
  `src/board/shieldArcs.ts` and `shieldArcs.test.ts`.
- Update the tests that select on the removed names:
  - `src/board/BoardSquare.test.tsx` — `.ship-icon` becomes `.ship-model` in
    the "no ship on an empty square" and "marker beneath ship" assertions.
  - `src/board/Board.test.tsx` — the "different silhouettes per side"
    assertion compares the two sides' hull `<use>` references instead of two
    `<path d>` values, and the "lit arcs match the starting fleet" assertion
    becomes the same count over `data-gauge-slot` / `data-gauge-lit`
    (`STARTING_FLEET.length * 4` slots, and one lit slot per shield carried).
    The `.ship-icon--green` selectors become `.ship-model--green`.

Then add the check the story's section 2 actually asks for: an assertion in
`src/App.test.tsx` that, with a game in progress and the full fleets on the
board, **no `id` value appears twice anywhere in the rendered document** —
collect every element carrying an `id` and compare the count with the number of
distinct values.

Depends on: Step 3 (`ShipModel` exists and is tested) and Step 1 (the sprite is
mounted by `App`, so the board's `<use>` references resolve in a browser).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass, with no remaining reference
anywhere in `src/` to `ShipIcon`, `shieldArcs`, `ship-icon` or
`data-arc-position`, and the new document-wide id-uniqueness assertion passing
on a board holding both full fleets.

---

## Step 5 — Manual gate: the board

Status: pending

Run `npm run dev` and open the app in a browser (Firefox is the reference
engine used by earlier stories; a second engine is welcome but not required).
Press PLAY and look at the board.

What to check:

1. **Both models draw at all**, in every square that holds a ship, with their
   gradients, trim colours and engine detail present — not black, not blank,
   not a single flat shape. A blank or black ship means a `<use>` or `url(#…)`
   reference is not resolving.
2. **Fourteen ships at once** all draw correctly and identically per side — the
   whole point of the shared sprite (D1).
3. **The shield gauge tracks the shield count.** Play a few turns so ships pick
   up and lose shields; confirm the number of lit icons matches, that they fill
   left to right, that lit icons carry their bar and unlit ones are hollow
   outlines, and that a ship at 0 shields shows four hollow icons.
4. **The site marker underneath stays readable** through the clear middle band
   of the square (D9), for charged, dormant and active sites.
5. **Every existing marking still reads**: the destination disc, the target
   ring, the selected brackets, the already-acted bar at the top, the no-action
   bar at the bottom, and the dampened (faded) treatment for a ship with no
   legal action.
6. **The gauge/marking overlap (D10)** — look specifically at a ship that has
   already acted this turn, and at the selected ship, and say whether the
   already-acted bar across gauge slots 2–3, and the bracket corners clipping
   slots 1 and 4, are acceptable as they stand. This plan changes neither; the
   decision is the owner's.
7. **A ship sitting in a bay (D11)** — the gauge's dark separator does not
   match the bay's lighter fill. Confirm it is acceptable.
8. **The palette clash is expected, not a defect** (settled decision 2): the
   models' greens and reds are brighter than the HUD's pips and the blue
   interaction marks. Note any reaction for a possible later story; do not fix
   it here.

Verification (manual): the owner runs the app and confirms points 1–5, and
gives a verdict on 6, 7 and 8. Anything wrong in 1–5 comes back as a fix to
step 1, 3 or 4 and the gate is run again; it does not become a new step tacked
on the end. Record the owner's verdict on 6, 7 and 8 in this step's `Notes:`.

---

## Step 6 — The two models flank the start screen

Status: pending

Rework `src/start/StartScreen.tsx` and `StartScreen.css` per **D6**, **D7** and
**D8**:

- The existing title, the two option fieldsets and the PLAY button move
  wholesale into a new `.start-screen__column` element, which takes over
  today's `.start-screen` column rules (flex column, centred, `gap`, padding,
  `text-align`). **No control, label, heading or handler changes** — the
  radios, their groups, their names and the PLAY button behave exactly as they
  do now.
- `.start-screen` becomes the grid described in D7, with three children in DOM
  order: a green ship wrapper, the column, a red ship wrapper. Each wrapper is
  sized from a token derived as `--play-size / 5` (D6) and holds a
  `ShipModel` for its side **with no shield count**, so no gauge is drawn.
- Wide layout: one row, `"green column red"`, ships vertically centred against
  the column. Narrow layout, behind a single `@media (max-width: …)` query
  starting at `48rem` and tuned at step 7: two rows, `"column column"` above
  `"green red"`, ships side by side at unchanged size.
- The ships are decoration: `aria-hidden`, not focusable, no handlers,
  `pointer-events: none` on their wrappers so a stray click cannot land on
  them.

Update `src/start/StartScreen.test.tsx` with structural assertions only: two
`ship-model` elements are present, one green and one red, both `aria-hidden`,
and **neither draws a gauge** (no `data-gauge-slot` elements anywhere on the
start screen). Every existing assertion about the heading, the two radio
groups, the checked values, the change handlers and the PLAY button must still
pass untouched — if one breaks, the markup was changed more than this step
allows.

Extend the id-uniqueness assertion added in step 4 to cover the start screen as
well, so both screens are proved free of duplicate ids.

Depends on: Step 3 (`ShipModel` draws a gaugeless ship) and Step 1 (the sprite
is mounted by `App` above both screens, so the start screen's `<use>`
references resolve).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass, including the new structural
assertions and the unchanged existing `StartScreen` tests.

---

## Step 7 — Manual gate: the start screen

Status: pending

Run `npm run dev` and look at the start screen (the app opens on it; the
game-over panel's button returns to it).

What to check:

1. **Both ships draw**, green on the left of the column and red on the right,
   with their gradients and trim — and **no shield gauge** on either.
2. **They are roughly vertically centred** against the title/options/PLAY
   column.
3. **They are about three board squares across.** Press PLAY, note how big one
   board square is, come back, and compare.
4. **Resize the window narrower.** At the breakpoint the pair drops **below**
   the column and sits **side by side**, at the same size — not hidden, not
   shrunk, not stacked one above the other. Report if the switch happens too
   early or too late; the breakpoint is a tuning number (D7) and is adjusted in
   step 6.
5. **Resize wider and taller.** The ships grow with the window the way the
   board does, stay clear of the column, and nothing overlaps the PLAY button
   or the option rows.
6. **The controls still work**: both option groups still select, keyboard focus
   still reaches them, and PLAY still starts a game.
7. **Nothing happens when a ship is clicked**, and tabbing never lands on one.

Verification (manual): the owner runs the app, resizes the window through the
breakpoint in both directions, and confirms points 1–7. Anything wrong comes
back as a fix to step 6, re-verified here.

---

## Step 8 — README check

Status: pending

Confirm `README.md` is still accurate given this story's changes, and update it
if it is not. The `/update-readme` command automates this: it reviews the
current branch diff and updates `README.md` if warranted.

What to weigh: the README is written for a player and describes what the app is
and how a game goes — fleet size, nodes, energy, shields, combat, rounds, the
start screen and its choices. It does not describe what a ship looks like, and
this story changes no rule, adds no control and alters no wording. The likely
correct outcome is therefore **no change**, and this step's `Notes:` should say
so and why. Do not invent a paragraph about the artwork for the sake of having
edited something.

Depends on: Step 7 (the story's visible behaviour is final).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` pass, and — if the README was edited —
every claim in the changed paragraphs is something a player can actually see in
the running app.
