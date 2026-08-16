# Implementation Plan — 00000001 Draw the starting board

This plan turns [`story.md`](./story.md) into an ordered sequence of steps.
Each step is implemented, verified and committed on its own, by an agent that
has read only `story.md`, this plan, and its own step. Everything a step needs
is stated here.

## What this story builds

A static picture of the opening position: a 15 x 15 board drawn with row 15 at
the top and row 1 at the bottom, the fourteen bay squares marked, and the
fourteen starting ships (seven green, seven red) sitting one per bay. The board
is a WAI-ARIA grid, so it is reachable by Tab, navigable with the arrow keys,
and every square announces where it is, whether it is a bay, and which ship
stands on it.

Nothing moves. There is no turn, no node, no attack, no shield, and activating
a square does nothing.

## Sources of truth

- **The rules.** [`doc/ruleset/rules.md`](../../ruleset/rules.md), **version
  0.1**. The sections implemented here are §3 (the board), §3.1 (bays) and §4
  (ships and the starting fleet). Rule content in `src/` implements that
  document and never restates or extends it. **This story does not change the
  rules**: no version bump, no changelog entry, no `/tag-rules` run.
- **The conventions.** [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) —
  especially "Testing" (Vitest is `node` by default; DOM tests opt in per file
  with a `// @vitest-environment jsdom` docblock on the first line) and
  "Comments" (comments say what the code does; **no story numbers, no plan-step
  references, no design history in code** — that material belongs here).
- **The reference port.** A read-only snapshot of another project lives at
  `.local/reference/capture-the-flag-ui/`. Its accessible grid
  (`src/board/grid/AccessibleGrid.tsx`, `gridNavigation.ts`,
  `gridNavigation.test.ts`, `AccessibleGrid.css`) is ported here in Steps 2 and 3. That folder is gitignored, lint-ignored and excluded from the test run; it
  is a source to copy **from**, never something to import at runtime.

## Where the code goes

New files, all under `src/`:

| Path                                | Holds                                                           |
| ----------------------------------- | --------------------------------------------------------------- |
| `src/rules/rulesVersion.ts`         | the single `RULES_VERSION` constant                             |
| `src/rules/board.ts`                | board size, column/row names, the square type and its naming    |
| `src/rules/bays.ts`                 | the fourteen bay squares (§3.1)                                 |
| `src/rules/fleet.ts`                | the two sides and the starting fleet (§4)                       |
| `src/board/grid/gridNavigation.ts`  | ported pure arrow-key navigation math                           |
| `src/board/grid/AccessibleGrid.tsx` | ported generic WAI-ARIA grid component (+ `AccessibleGrid.css`) |
| `src/board/boardView.ts`            | board square ↔ grid row/column index mapping                    |
| `src/board/squareLabel.ts`          | the wording of a square's accessible name                       |
| `src/board/Board.tsx`               | the board component (+ `Board.css`)                             |
| `src/board/ShipIcon.tsx`            | the decorative ship artwork                                     |

Tests live beside the code they cover, as `*.test.ts` / `*.test.tsx`.

The split between `src/rules/` and `src/board/` is deliberate: `src/rules/`
holds only things `rules.md` states, so a reader checking the app against the
document has one folder to read; `src/board/` holds presentation, which the
rules document says nothing about (screen orientation, wording, artwork).

## Decisions taken at plan time

The story left four questions open. All four are settled here, with the
reasoning, because the code will not carry it.

### 1. The accessible grid is ported **trimmed**, not as-is

The reference component carries three features this story has no consumer for:
`initialFocus` (with its `resolveInitialFocus` helper), Enter/Space/click
**activation** (`onActivate`, the `actionable` flag, the per-cell `onClick`),
and a polite **live region** driven by an `announcement` prop.

**Decision: drop all three.** The port brings across exactly: `role="grid"` /
`role="row"` / `role="gridcell"` structure, a per-cell accessible name, roving
tabindex (exactly one cell at `tabIndex=0`, the rest `-1`), arrow-key
navigation through the pure `nextFocusPosition`, the effect that moves real DOM
focus only when focus is already inside the grid, the `focusable` flag and its
skip policy, and the keyboard focus-ring CSS.

Reasoning:

- Everything shipped is exercised by this story's tests. Untested,
  unreachable props are exactly the kind of code a peer review cannot judge and
  a later reader cannot safely change.
- The trimmed features are not lost. `.local/reference/.../grid/` is a
  permanent snapshot, so reinstating `onActivate` or `resolveInitialFocus` when
  movement arrives is a copy, not a redesign.
- Dropping activation removes the reference's
  `jsx-a11y/click-events-have-key-events` suppression entirely, leaving at most
  one lint suppression in the ported component instead of two.
- With `initialFocus` gone, the grid's initial tab stop is whatever
  `firstFocusablePosition` finds in row-major order — the top-left cell, which
  on this board is **A15**. That is a sensible place for a keyboard user to
  start (it matches reading order) and needs no extra machinery.

**Rejected:** porting as-is "because it will be needed later". It would ship
three unverifiable code paths to save one small copy later, and the
`initialFocus` prop's contract (initial-only, never steals focus on mount) is
subtle enough that it should arrive with the story that actually needs it.

The `focusable` flag **is** kept even though every board square is focusable,
because it is half of `nextFocusPosition`'s tested contract (the skip policy)
and the component test can exercise it directly with a fixture grid.

### 2. Accessible-name wording

**Decision:** a square's accessible name is comma-separated segments, in a
fixed order, with nothing said about actions (there are none):

1. the square name, always — `H8`, `A1`, `O15`;
2. `bay`, only if the square is one of the fourteen bays;
3. `<side> ship`, only if a ship stands there — `green ship` or `red ship`.

So: `H8` · `D15, bay` · `H15, bay, green ship` · `O2, bay, red ship`.

Reasoning:

- **Position first** is what a keyboard user arrowing across the board needs
  most; screen readers read the whole name on every focus change, so the first
  word must be the one that orients you.
- **Nothing is said about empty ordinary squares.** Adding "empty" to 211 of
  225 squares would triple the length of the most common announcement to convey
  nothing that silence does not.
- **Lowercase `green` / `red`**, matching how §4 names the sides, and matching
  the player-facing register the project asks for.
- The name carries no verb ("press to…") because there is nothing to press.
  When activation arrives, the wording changes with it.

The grid as a whole is named **"Base Control board"** via `aria-label`, so a
screen reader announces the container as a grid with a meaningful name.

### 3. The two sides get a **visible** non-colour cue now

`src/index.css` already says the two side colours "are always paired with a
non-colour cue rather than carrying meaning alone".

**Decision: give each side a distinct ship silhouette** — the green and red
ships are drawn as two visibly different shapes, not the same shape in two
colours. The pass condition is concrete: with colour removed (greyscale), the
two fleets must still be told apart at the board's normal on-screen size. This
is checked by hand in Step 12.

Reasoning:

- Shape reads instantly at ~30–40px, needs no text, and does not compete for
  space with the shield count that will later sit on the ship (Appendix A item
  2 — out of scope here, but the artwork should leave a corner free for it).
- The accessible name alone is **not** sufficient: it serves a screen-reader
  user, not a colour-blind sighted player, who is precisely the person
  `index.css` is warning about.

**Rejected:** a letter (G/R) on each ship — it would collide with the shield
badge later and looks like a label rather than a ship. **Rejected:** solid fill
vs. outline — it works, but reads as "selected vs. not" in a game that will
soon need a real selection state.

### 4. The board gets **visible** column letters and row numbers

**Decision:** draw A–O along the bottom edge and 1–15 up the left edge, outside
the `role="grid"` element, marked `aria-hidden="true"`.

Reasoning:

- The story's own visual gate asks a human to confirm "A1 is bottom-left and
  O15 top-right" and that fourteen named bays are in the right places.
  Counting unlabelled squares to check that is slow and error-prone.
- The next decision the owner has to make is **site positions** (§3.2, Appendix
  A item 1), which the story says is to be settled _by looking at a drawn
  board_. Reading coordinates off the picture is the whole point of drawing it.
- They are `aria-hidden` because every square's accessible name already carries
  its coordinates; announcing a separate row of letters would be noise.
- They sit **outside** the grid element because an ARIA `grid` may only own
  `row`/`rowgroup` children — putting labels inside would be a structural
  violation and would drag them into arrow-key navigation.

**Rejected:** real `columnheader` / `rowheader` cells inside the grid. That is
the "correct" ARIA answer for a data table, but here it makes the header cells
part of the navigable grid (or requires extra machinery to exclude them) for a
benefit the per-square name already delivers.

## Other design notes that apply across steps

- **Row inversion lives in one tested function.** The rules number rows 1–15
  bottom-to-top; the grid renders top-to-bottom, so board row 15 is grid row
  index 0. That arithmetic belongs in `src/board/boardView.ts` and nowhere
  else (Step 7).
- **Rule data is written literally and checked structurally.** The bay list and
  the starting fleet are transcribed from `rules.md` in the same order the
  document states them, so a reader can compare line by line — and then tests
  assert the _properties_ the document claims (fourteen bays, none on a corner,
  all on the outer edge, one every fourth square; seven ships a side, one per
  bay, the two fleets a half-turn rotation of each other). A typo in a
  hand-transcribed list is exactly what those property tests exist to catch.
- **`Math.random` is banned by lint** and nothing here is random anyway.
- **Comment style.** The reference files open with long headers citing story
  numbers and plan steps. Those must be rewritten to short headers saying what
  the module does. Carrying the reference's design history into this repository
  is a review failure.
- **Lint suppressions.** Add only suppressions the linter actually demands, and
  give each a one-line reason in project style. The composite-widget
  `role="grid"` with a `onKeyDown` and no `tabIndex` is expected to need
  `jsx-a11y/interactive-supports-focus`.
- **DOM test recipe** (verified against this repository's installed toolchain
  while writing this plan):
  - first line `// @vitest-environment jsdom`;
  - `import "@testing-library/jest-dom/vitest";` at the top of each DOM test
    file. No `setupFiles` entry is needed in `vite.config.ts`, and none should
    be added: a global setup file would also load into the `node`-environment
    pure tests. (Importing jest-dom from a `node`-environment file was checked
    and is harmless, but per-file imports keep the dependency visible.)
  - axe is used directly: `import axe from "axe-core"` and `axe.run(container)`.
    Disable the `color-contrast` rule in the axe options — jsdom has no layout
    or canvas, so that rule cannot produce a meaningful result and instead
    prints a `HTMLCanvasElement.prototype.getContext` "not implemented" error
    to stderr on every run.
- **`npm test` currently exits 1** with "No test files found". Step 1 retires
  that; from Step 1 onward the suite must be green.
- **Every step is finished with** `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run format:check` (run `npm run format` to fix), plus the
  step's own verification below.

---

## Step 1 — Prove the DOM test wiring with an App smoke test

Status: committed

Notes: Added `src/App.test.tsx` per the DOM test recipe (jsdom docblock,
per-file `jest-dom` import, `axe-core` run with `color-contrast` disabled),
covering the level-1 heading and no accessibility violations; no
`vite.config.ts` change was needed. One thing not called out by the plan:
because `vite.config.ts` does not set `test.globals: true`, Testing Library's
automatic `afterEach` cleanup never registers, so the second test's render
stayed mounted alongside the first and axe flagged a duplicate `<main>`
landmark. Fixed by explicitly importing `cleanup` from
`@testing-library/react` and running it in an `afterEach` in the test file
itself (no global setup file added, consistent with the plan's per-file
approach). `npm test` now runs one file, two tests, and no longer exits 1
with "No test files found".

Add the repository's first test: a jsdom component test for the existing
placeholder `src/App.tsx` that renders it with Testing Library, asserts its
level-1 heading is present, and asserts axe-core reports no violations.

This exists to prove the four pieces of test infrastructure the bootstrap
shipped but never exercised — jsdom, `@testing-library/react`,
`@testing-library/jest-dom`, and `axe-core` — before any of them is relied on
to verify real behaviour. Use the DOM test recipe in "Other design notes"
above. Do **not** add a `setupFiles` entry to `vite.config.ts`; the recipe was
checked against the installed toolchain and per-file imports are sufficient.

Do not change `App.tsx` in this step. The test keeps its value after Step 9
replaces the placeholder's body, because what it really asserts is "the app
shell renders and is free of static accessibility violations".

Depends on: nothing.

Verification (automated): `npm test` passes with one test file — and, notably,
no longer exits 1 with "No test files found". `npm run lint` and
`npm run typecheck` stay clean.

---

## Step 2 — Port the pure grid navigation module

Status: committed

Notes: Ported `gridNavigation.ts` and its test to `src/board/grid/`,
keeping `ArrowKey`, `GridPosition`, `nextFocusPosition` and
`firstFocusablePosition` and dropping `resolveInitialFocus`,
`ResolveInitialFocusArgs`, and the test cases covering them, per plan
decision 1. Rewrote the module header and every doc comment to drop story
numbers and references to the reference project's own board/pieces, keeping
only what-it-does explanations. No behavioural deviation from the plan;
`npm run typecheck`, `npm run lint`, `npm test` and `npm run format:check`
all pass.

Port `.local/reference/capture-the-flag-ui/src/board/grid/gridNavigation.ts`
and its test to `src/board/grid/`, trimmed and re-commented:

- Keep `ArrowKey`, `GridPosition`, `nextFocusPosition` (arrow-key stepping with
  the skip-over-non-focusable policy and edge clamping, no wraparound) and
  `firstFocusablePosition`.
- **Drop** `resolveInitialFocus` and `ResolveInitialFocusArgs` entirely, per
  plan decision 1, along with the parts of the ported test file that cover
  them.
- Rewrite every comment: say what the module and each export do, and delete all
  story numbers, plan-step references and mentions of the other project's
  pieces, lakes, phases and boards.

The module stays generic 2-D grid geometry in screen order (row 0 topmost,
column 0 leftmost). It must know nothing about ships, sides, bays, or board
orientation — that is what makes it testable in the default `node` environment
and reusable.

Depends on: nothing (it is pure and imports nothing).

Verification (automated): `npm test` — the ported navigation tests pass:
one-step movement in all four directions, clamping at every edge and corner,
skipping a single non-focusable cell, skipping a run of them, not moving when
nothing focusable remains in that direction, and `firstFocusablePosition`'s
row-major scan including the "nothing focusable" case.

---

## Step 3 — Port the accessible grid component

Status: committed

Notes: Ported `AccessibleGrid.tsx`/`.css` to `src/board/grid/` per decision 1

- dropped `initialFocus`/`resolveInitialFocus`, `onActivate`/`actionable`,
  per-cell `onClick`, Enter/Space handling, and the live region plus its
  `display: contents` wrapper (the wrapper element and its CSS rule went with
  it, since nothing needs `display: contents` on a single child now). One
  deviation not flagged by the plan: the reference component also carried an
  `accessible-grid__cell--focused` modifier class that no CSS in the reference
  project ever referenced (grepped the whole reference `src/`) - dropped it as
  dead code rather than porting an unused hook, consistent with the "everything
  shipped is exercised by tests" reasoning in decision 1. Added
  `AccessibleGrid.test.tsx` (jsdom) against a small 2x3 fixture grid (one
  non-focusable cell to exercise the skip policy) covering: grid/row/gridcell
  roles and accessible names; exactly one tab stop with the rest at -1 and the
  non-focusable cell carrying no `tabIndex` at all; one-cell arrow movement and
  edge clamping; skipping the non-focusable cell; `user-event.tab()` reaching
  the grid in a single stop (before/grid/after); mounting not stealing focus;
  and axe reporting no violations with `color-contrast` disabled per the DOM
  test recipe. `npm run typecheck`, `npm run lint`, `npm test` (25 tests, 3
  files, all green) and `npm run format:check` all pass; needed no new lint
  suppression beyond the expected `jsx-a11y/interactive-supports-focus` on the
  grid container (dropping activation removed the reference's second
  suppression, as decision 1 anticipated).

Port `AccessibleGrid.tsx` and `AccessibleGrid.css` to `src/board/grid/`,
trimmed per plan decision 1. What the ported component must do:

- Render a `role="grid"` container carrying an `aria-label` from a `label`
  prop, containing one `role="row"` per row, each containing `role="gridcell"`
  cells.
- Take a rectangular 2-D array of cell descriptors, each with rendered content,
  an accessible name, and a `focusable` flag. The accessible name goes on the
  cell as `aria-label`.
- Implement roving tabindex: exactly one focusable cell has `tabIndex=0` at a
  time and every other focusable cell has `-1`, so the whole grid is a single
  tab stop.
- Handle arrow keys on the container, delegating the arithmetic to Step 2's
  `nextFocusPosition`, and `preventDefault` so the page does not scroll.
- Move real DOM focus to follow the roving target **only when focus is already
  inside the grid**, so mounting the component never steals focus from the
  page.
- Re-seed the roving target if the descriptors change shape and the previously
  targeted cell has stopped being focusable.
- Carry no activation, no `initialFocus`, and no live region.

The CSS keeps: `.accessible-grid` as a bare `display: grid` box with **no**
board geometry (the consumer supplies `grid-template-*` and square sizing
through its own `className` on the same element), `display: contents` on the
row wrappers so the ARIA-required row divs do not break CSS Grid layout, and
the high-contrast keyboard focus ring drawn as a `:focus-visible` overlay
pseudo-element with the UA outline suppressed. Keep the reference's reasoning
for the overlay approach (a consumer's positioned, background-painting cell
content paints over a negatively-offset outline) as a short "what/why" comment;
drop the story archaeology. With the live region gone, the wrapper element it
required goes too.

Test it as a jsdom component test against a small fixture grid built in the
test file (not the real board — that does not exist yet), covering: the grid
and cell roles and names are exposed; exactly one cell is tabbable at a time;
arrow keys move focus one cell and clamp at the edges; a non-focusable cell is
skipped; `user-event`'s `tab()` reaches the grid in one stop; mounting does not
steal focus; and axe reports no violations.

Depends on: Step 1 (the DOM test recipe, proven), Step 2 (`nextFocusPosition`).

Verification (automated): `npm test` — the component test above passes, and
`npm run lint` is clean (with at most one justified `jsx-a11y` suppression,
each carrying a short reason).

---

## Step 4 — `RULES_VERSION`

Status: committed

Notes: Added `src/rules/rulesVersion.ts` exporting `RULES_VERSION = "0.1"` and
`src/rules/rulesVersion.test.ts`, which reads `doc/ruleset/rules.md` off disk
(path resolved via `import.meta.url`), extracts the version from its
`**Rules version: …**` line with a regex, and asserts it equals
`RULES_VERSION`. Verified the guard actually guards by temporarily bumping the
version line in `rules.md` to `0.2`, confirming the test fails naming both
`0.1` and `0.2`, then reverting (not committed). No deviation from the plan.
`npm run typecheck`, `npm run lint`, and `npm test` (26 tests, 4 files) are all
green. `npm run format:check` reports a pre-existing formatting issue in this
plan file (`implementation-plan.md` itself, unrelated to Step 4's new files,
present before this step's edits) — left untouched as out of scope for this
step.

Add `src/rules/rulesVersion.ts` exporting the single `RULES_VERSION` constant,
whose value is the version `doc/ruleset/rules.md` currently carries: **`0.1`**
(a string — the rules number it `0.1`, and `0.10` must not be able to collapse
into `0.1`).

Add a test that reads `doc/ruleset/rules.md` off disk, extracts the version
from its `**Rules version: …**` line, and asserts it equals `RULES_VERSION`.
This is the guard CLAUDE.md requires so the document and the code cannot drift.
Resolve the document's path relative to the test file (via `import.meta.url`)
rather than the process working directory. Reading files with `node:*` imports
is banned everywhere except test files, where `eslint.config.js` explicitly
allows it.

Depends on: Step 1 (a working test run).

Verification (automated): `npm test` — the version test passes. Then
temporarily edit the version line in `rules.md` (or the constant), re-run, see
the test fail with a message naming both values, and revert. This confirms the
guard actually guards; do not commit the temporary edit.

---

## Step 5 — Board geometry and square names (§3)

Status: committed

Notes: Added `src/rules/board.ts` with `BOARD_SIZE`, `COLUMN_LETTERS` (A-O),
`ROW_NUMBERS` (1-15), a `Square` type storing only `{ column, row }` (no
stored name), `squareAt`/`squareFromName` for building/parsing (both routing
through `isOnBoard` so out-of-range input is rejected rather than clamped),
`squareName` deriving the name string, and `ALL_SQUARES` (225 squares,
row-major). Added `src/rules/board.test.ts` covering board size, the 225-square
list with no duplicates, the corners and centre §3 names explicitly, a
round-trip over all 225 squares, and bounds rejection (out-of-range column,
row 0, row 16, and malformed name strings). No deviation from the plan.
`npm run typecheck`, `npm run lint`, `npm test` (5 files, 38 tests) and
`npm run format:check` all pass.

Add `src/rules/board.ts` implementing §3 only: the board is 15 x 15; columns
are lettered A–O left to right; rows are numbered 1–15 bottom to top; a square
is named column-letter then row-number.

It should provide the board size, the ordered column letters and row numbers, a
square type, the means to build a square from a column/row pair and to render
one as its name, the reverse (parse a name), a membership/bounds check, and the
list of all 225 squares. Choose the square representation yourself; whatever it
is, the name must be derived, never stored twice.

No bays, no ships, no screen orientation here — those are Steps 6 and 7.

Depends on: Step 1 (a working test run).

Verification (automated): `npm test` — unit tests assert there are exactly 225
squares and 15 columns and rows; the corners are `A1`, `A15`, `O1`, `O15` and
the centre is `H8` (the two squares §3 names explicitly); naming round-trips
for every one of the 225 squares; and out-of-range columns and rows are
rejected rather than silently clamped.

---

## Step 6 — Bays and the starting fleet (§3.1, §4)

Status: committed

Notes: Added `src/rules/bays.ts` (`BAYS`, `isBay`) and `src/rules/fleet.ts`
(`Side`, `FleetEntry`, `STARTING_FLEET`, `startingSideAt`), both hand-transcribed
from §3.1/§4 in the document's own order, built on `squareAt`/`squareName` from
Step 5. Added `src/rules/bays.test.ts`, which derives the 56-square clockwise
perimeter ring inside the test and asserts the fourteen bays fall exactly four
apart around it (with the wraparound gap checked too), plus the corner/edge/
count properties. Added `src/rules/fleet.test.ts` asserting seven ships a
side, one ship per bay with no bay doubled up, side alternation around the
clockwise ring (including the wraparound), the 180°-rotation property
(column index → 14 − index, row → 16 − row) mapping every ship onto an
opposite-side ship, and a literal check against §4's transcribed order as a
line-by-line sanity check. No deviation from the plan. `npm run typecheck`,
`npm run lint`, `npm test` (7 files, 50 tests) and `npm run format:check` all
pass.

Add the rule data this story renders:

- `src/rules/bays.ts` — the fourteen bays from §3.1, transcribed in the order
  the document's table lists them (top D15 H15 L15; right O14 O10 O6 O2; bottom
  D1 H1 L1; left A2 A6 A10 A14), plus a way to ask whether a given square is a
  bay.
- `src/rules/fleet.ts` — the two sides (green and red) and the starting fleet
  from §4, transcribed in the clockwise order §4 states it, starting at H15:
  H15 green, L15 red, O14 green, O10 red, O6 green, O2 red, L1 green, H1 red,
  D1 green, A2 red, A6 green, A10 red, A14 green, D15 red. Provide a way to ask
  which side (if any) starts on a given square.

Both lists are written out by hand so a reader can check them against the
document line by line; the tests then assert the properties the document claims
about them. That pairing is the point of this step — see "Other design notes".

Depends on: Step 5 (the square type and naming).

Verification (automated): `npm test` — tests assert, for the bays: there are
exactly fourteen; every one lies on the outer edge; none is a corner; and they
are spaced every fourth square around the edge (derive the ring of 56 perimeter
squares in clockwise order inside the test, then assert the bays fall at
positions exactly four apart). And for the fleet: fourteen ships, seven a side;
every ship stands on a bay and every bay holds exactly one ship; sides alternate
around the clockwise ring; and the two fleets are a **half-turn rotation** of
each other — for every ship, the square rotated 180° about the board centre
(column index → 14 − index, row → 16 − row) holds a ship of the other side.
That last one is why the opening is fair, and is the property a transcription
typo would silently break.

---

## Step 7 — Board square ↔ grid index mapping

Status: committed

Notes: Added `src/board/boardView.ts` with `gridPositionForSquare` and
`squareForGridPosition`, built on `BOARD_SIZE`/`COLUMN_LETTERS`/`squareAt` from
`src/rules/board.ts` and the `GridPosition` type from the ported grid module.
Row inversion is `gridRow = BOARD_SIZE - square.row`; column maps straight
through via `COLUMN_LETTERS.indexOf`. Added `src/board/boardView.test.ts`
covering the four corners, the H8 centre, a round trip over all 225 squares
(asserting every grid index pair is hit exactly once), and a named spot-check
of the corners/centre by square name. No deviation from the plan. `npm run
typecheck`, `npm run lint`, `npm test` (8 files, 54 tests) and `npm run
format:check` all pass.

Add `src/board/boardView.ts` holding the single piece of arithmetic that turns
a rule-space square into a screen-space grid position and back: board row 15 is
grid row index 0 (rows are drawn top-to-bottom, numbered bottom-to-top), while
column A is grid column index 0 (columns are drawn and lettered in the same
direction).

This is view code, which is why it sits in `src/board/` rather than
`src/rules/` — `rules.md` says nothing about which way up a board is drawn. It
uses the `GridPosition` type from the ported grid module so the board and the
grid speak the same coordinate language.

Depends on: Step 2 (`GridPosition`), Step 5 (the square type).

Verification (automated): `npm test` — tests assert the four corners map as
expected (A15 → row 0 column 0, O15 → row 0 column 14, A1 → row 14 column 0,
O1 → row 14 column 14) and H8 maps to the centre (row 7, column 7); and a
round-trip over all 225 squares returns the original square, with the grid
positions covering every index pair exactly once.

---

## Step 8 — Accessible-name wording for a square

Status: committed

Notes: Added `src/board/squareLabel.ts` exporting `squareLabel(square, isBay,
occupant)`, taking a `Square`, a bay flag and an optional `Side` (from
`src/rules/fleet.ts`) and joining `squareName`, `"bay"` and `` `${side} ship` ``
with `", "` per plan decision 2. Added `src/board/squareLabel.test.ts` covering
all five cases named in the step's verification (ordinary empty, empty bay,
occupied bay for each side, occupied ordinary square). No deviation from the
plan. `npm run typecheck`, `npm run lint`, `npm test` (9 files, 59 tests) and
`npm run format:check` all pass.

Add `src/board/squareLabel.ts`: given a square, whether it is a bay, and which
side's ship (if any) stands on it, produce the accessible name, exactly as
decided in plan decision 2 — comma-separated segments, square name first, then
`bay` if it is one, then `green ship` / `red ship` if occupied. An empty
ordinary square is named by its square name alone.

Wording lives in a plain module with plain unit tests, not inside a component:
CONTRIBUTING.md asks for exactly that, and it means the wording can be reviewed
and changed without touching rendering.

Depends on: Step 5 (the square type), Step 6 (the side type).

Verification (automated): `npm test` — tests cover all four combinations with
their exact expected strings: an ordinary empty square (`H8`), an empty bay
(`D15, bay`), an occupied bay for each side (`H15, bay, green ship` and
`D15, bay, red ship`), and (for completeness of the contract) an occupied
ordinary square.

---

## Step 9 — Draw the board: squares and bays

Status: committed

Notes: Added `src/board/Board.tsx`, walking the 15 x 15 grid index space via
`squareForGridPosition`, marking bays via `isBay`, and labelling every cell
via `squareLabel(square, bay, undefined)` (no occupant — ships arrive in Step
10). Rendered through `AccessibleGrid` with label `Base Control board`.
`Board.css` sizes the grid from `--square: clamp(24px, 4vmin, 42px)` and gives
bay squares a distinct fill/border (`--bay-fill`/`--bay-border`, a cyan-toned
accent chosen to stay clear of both the amber default focus ring and the
green/red ship colours reserved for Step 10) against ordinary squares, which
get a plain 1px grid-line border. Wired `Board` into `src/App.tsx` in place of
the placeholder tagline, keeping the `<h1>`; removed the now-unused
`.app__tagline` rule from `App.css` and dropped `.app`'s vertical centring (it
now aligns from the top) so a tall viewport shows the whole board rather than
vertically centring it off the top edge. Added `src/board/Board.test.tsx`
covering exactly the step's verification list (225 gridcells in 15 rows, A15
first/O1 last in DOM order, H8/A1/O15 named, all fourteen bays named with
`bay` and no others, axe clean). No deviation from the plan. `npm run
typecheck`, `npm run lint`, `npm test` (10 files, 64 tests), `npm run
format:check` and `npm run build` all pass; the existing `App` smoke test
still passes unchanged.

Add `src/board/Board.tsx` and `Board.css`, and put the board on screen:

- Build the grid's 15 rows of 15 cell descriptors by walking grid indices and
  mapping each to its square through Step 7, taking each cell's accessible name
  from Step 8 (with **no** occupant yet — ships arrive in Step 10) and marking
  every cell focusable.
- Render them through the ported `AccessibleGrid` with the label
  `Base Control board`.
- Style it in `Board.css`: a square-cell grid sized from a single `--square`
  custom property (a `clamp()` on a viewport unit) so the whole 15 x 15 board
  fits on a normal desktop viewport without scrolling and stays square at any
  size; bay squares visibly distinct from ordinary squares (a different fill
  plus a border treatment, not a barely-different shade); ordinary squares
  distinguishable from each other by a grid line. Use the existing palette in
  `src/index.css` and add any new custom properties there if a colour is needed
  in more than one file.
- Wire it into `src/App.tsx` in place of the placeholder tagline. **Keep the
  `<h1>Base Control</h1>`** — the page needs a heading for structure and the
  board should not float unlabelled on a bare page — and remove the
  placeholder paragraph. Adjust `src/App.css` so the board is centred and not
  cropped.

Depends on: Step 3 (`AccessibleGrid`), Step 7 (index mapping), Step 8
(wording).

Verification (automated): `npm test` — a jsdom component test asserts the grid
exposes 225 gridcells in 15 rows; the first cell in DOM order is named `A15`
and the last `O1`; a spot-check of named cells (`H8`, `A1`, `O15`) is present;
every one of the fourteen bay squares from §3.1 is named with `bay` and no
other square is; and axe reports no violations. The existing App smoke test
from Step 1 must still pass.

---

## Step 10 — Draw the ships

Status: committed

Notes: Added `src/board/ShipIcon.tsx`: two inline-SVG silhouettes in a
100 x 100 viewBox, coloured via `currentColor` and a `.ship-icon--green` /
`.ship-icon--red` class setting `color` from `--color-green` / `--color-red`
(added to `Board.css`, since the plan's file table lists no separate CSS file
for `ShipIcon.tsx`). Green is a four-point dart/kite with a concave notch at
the rear (`M50,15 L85,79 L50,61 L15,79 Z`); red is a rounded-corner hexagon
(`M50,15 L80.3,32.5 L80.3,67.5 L50,85 L19.7,67.5 L19.7,32.5 Z`) — outlines
that differ by shape, not just colour, and both bounded within roughly 70% of
the 100-unit square with every corner left clear for a future shield count.
The `<svg>` carries `aria-hidden="true"` and no `title`/`desc`. Wired
`startingSideAt` into `Board.tsx` so each cell's descriptor now passes the
real occupant into `squareLabel` and renders `<ShipIcon side={occupant} />`
when one is present. Extended `Board.test.tsx` (no separate `ShipIcon.test`
file, per the plan's file table) with: every one of the fourteen starting
squares named exactly `<square>, bay, <side> ship` against `STARTING_FLEET`,
with no other square in the grid also matching `/ship$/`; the occupied cell's
accessible name matching the label string exactly with the SVG confirmed
`aria-hidden` and free of `title`/`desc`; and updated the pre-existing "every
bay named with 'bay'" test to expect the ship-carrying label now that every
bay is occupied at game start. No deviation from the plan otherwise.
`npm run typecheck`, `npm run lint`, `npm test` (10 files, 66 tests),
`npm run format:check` and `npm run build` all pass.

Add `src/board/ShipIcon.tsx` and place the fourteen starting ships:

- Two distinct inline-SVG silhouettes, one per side, per plan decision 3. They
  must differ in outline shape — not only in colour — and stay tellable apart
  in greyscale at the board's on-screen size. Colour them from the existing
  `--color-green` / `--color-red` custom properties in `src/index.css`.
- The artwork is decorative: `aria-hidden` on the SVG, and no `title`/`desc`
  inside it. All meaning is carried by the square's accessible name, which this
  step extends by passing the occupying side into Step 8's wording, so an
  occupied bay now announces e.g. `H15, bay, green ship`.
- Size the glyph to roughly 70% of the square, centred, leaving a free corner
  for the shield count a later story will add. Do not draw a shield count now —
  shields are out of scope and the starting value is still TBD.

Depends on: Step 6 (the starting fleet), Step 9 (the drawn board).

Verification (automated): `npm test` — a jsdom component test asserts the
fourteen bays that hold ships are named accordingly (`H15, bay, green ship`
through `D15, bay, red ship`, all fourteen checked against §4's list); no other
square names a ship; the artwork is hidden from the accessibility tree (the
accessible name of an occupied cell is exactly the label string, with no stray
text from the SVG); and axe still reports no violations.

---

## Step 11 — Visible column letters and row numbers

Status: committed

Notes: Wrapped `AccessibleGrid` in a new `.board-frame` container in
`Board.tsx`/`Board.css`: a row of `aria-hidden` row-number labels (15 down to
1, top to bottom) to its left and a row of `aria-hidden` column-letter labels
(A-O) below it, both laid out as CSS grid tracks sized from the same
`--square` custom property (moved up from `.board` to `.board-frame` so both
the grid and the labels inherit it). The labels sit as sibling `<div>`s outside
the `role="grid"` element, per decision 4, styled in `--color-text-dim`. Added
a test to `Board.test.tsx` asserting the grid still exposes 225 gridcells in
15 rows with no `columnheader`/`rowheader` roles introduced, that the label
text (`15…1`, `A…O`) is present in the DOM via `textContent`, and that the two
label containers carry `aria-hidden="true"` (the DOM mechanism that removes
them from the accessibility tree — Testing Library's `byText` queries don't
themselves filter on `aria-hidden`, so asserting the attribute directly is the
correct check rather than a `queryByText` non-match). The pre-existing axe
test now also covers the frame with labels present. No deviation from the
plan. `npm run typecheck`, `npm run lint`, `npm test` (10 files, 67 tests),
`npm run format:check` and `npm run build` all pass.

Add the coordinate labels decided in plan decision 4: A–O along the bottom edge
of the board and 1–15 up the left edge, aligned with the grid tracks.

They must sit **outside** the `role="grid"` element (an ARIA grid may only own
rows), and be `aria-hidden="true"` so they add nothing to what a screen reader
reads. Align them by laying the board area out with the same `--square` size
used by the grid tracks, so the labels track the board at every viewport size.
Style them in the dim text colour so they read as chrome, not as board content.

Depends on: Step 9 (the board and its `--square` sizing).

Verification (automated): `npm test` — a jsdom component test asserts the grid
still exposes exactly 225 gridcells (the labels did not become cells), that the
label text is present in the DOM but absent from the accessibility tree, and
that axe still reports no violations.

---

## Step 12 — Manual gate: it looks right

Status: pending

No code. This is the story's first manual gate: the pipeline pauses here for
the owner.

Depends on: Step 11 (the board is fully drawn).

Verification (manual): run `npm run dev` and open `http://localhost:5273`, then
confirm all of:

1. The board is square, legible, and fits in the window without scrolling.
2. **A1 is bottom-left and O15 is top-right** — read off the visible edge
   labels, with the letters running A–O left to right along the bottom and the
   numbers running 1–15 bottom to top up the left side.
3. All fourteen bays are exactly where §3.1 says (top D15, H15, L15; right O14,
   O10, O6, O2; bottom D1, H1, L1; left A2, A6, A10, A14), and are obviously
   different from ordinary squares at a glance.
4. Fourteen ships sit one per bay in §4's clockwise pattern from H15 (H15
   green, L15 red, O14 green, O10 red, O6 green, O2 red, L1 green, H1 red, D1
   green, A2 red, A6 green, A10 red, A14 green, D15 red), and the two sides are
   clearly distinguishable.
5. **The greyscale check** (plan decision 3): with colour removed — browser
   devtools' greyscale emulation, or the OS colour filter — the two fleets are
   still tellable apart by shape alone.

Also run `npm run build` and confirm it succeeds; the app must stay a
static, front-end-only bundle.

---

## Step 13 — Manual gate: keyboard and screen reader

Status: pending

No code. The story's remaining two manual gates, taken in one pause since both
need the finished board and a person driving it.

Depends on: Step 12 (the board looks right).

Verification (manual): with `npm run dev` running at `http://localhost:5273`:

**Gate 2 — keyboard.**

1. From a fresh page load, pressing Tab reaches the board (the first square,
   A15, takes focus). The board is **one** tab stop: pressing Tab again leaves
   the board entirely rather than walking through 225 squares.
2. The arrow keys move focus one square at a time in the expected direction,
   and the page does not scroll while doing so.
3. Focus clamps at the edges — pressing Up on row 15, or Left on column A,
   leaves focus where it is and does not wrap around.
4. The focused square is unmistakably visible at a glance, including when the
   focused square is a bay and when it holds a ship.

**Gate 3 — screen reader.** With a screen reader running (VoiceOver on macOS,
NVDA on Windows, or Orca on Linux):

1. Entering the board announces it as a grid named "Base Control board".
2. Arrowing across squares announces each square's position, whether it is a
   bay, and which ship stands there — e.g. "H8", "D15, bay", "H15, bay, green
   ship".
3. The wording makes sense read aloud at speed, and nothing extraneous is
   announced from the ship artwork or the visible edge labels.

The pass condition is intelligibility, not an exact string: each screen reader
adds its own role and position announcements around the name. If a gate fails,
record what was heard or seen in the step's Notes before any fix.

---

## Step 14 — README check

Status: pending

Review `README.md` against what this story changed and update it if it is now
inaccurate. The `/update-readme` command does this from the branch diff.

The specific thing to look at: the README currently says "**Status:** early
development. The app does not play the game yet. … there is nothing to play
here for now." That is still true — nothing here is playable — but the app is
no longer a bare welcome screen, and a reader may reasonably be told that
opening it now shows the board in its opening position. Decide, in a sentence
or two written for a non-technical player, and either update the status note or
record in the step's Notes that no change was needed and why.

Nothing else this story adds is player-facing documentation: the rules did not
change, so `doc/ruleset/rules.md` and `doc/ruleset/changelog.md` must be
untouched by this branch.

Depends on: Step 13 (the story's behaviour is confirmed).

Verification (automated): `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm test` and `npm run build` all pass, and
`git diff main --stat` shows no changes under `doc/ruleset/`.
