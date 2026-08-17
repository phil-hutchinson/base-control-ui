# Implementation Plan — 00000006 Shields

This plan turns [`story.md`](./story.md) into an ordered sequence of steps. Each
step is implemented, verified and committed on its own, by an agent that has
read only `story.md`, this plan, and its own step. Everything a step needs is
stated here.

## What this story builds

Every ship carries a **shield count** in the game state, constrained to the 0–4
range `rules.md` §4.1 states. That count is drawn on the board as up to four
90° arcs in a ring around the ship's hull, and spoken as part of the occupied
square's accessible name. To make room for the ring, the ship silhouette
shrinks and the board's squares get bigger: the square-size **minimum rises**,
the **maximum is removed**, and squares are sized from the space the board's
container actually has rather than from viewport units.

Nothing gains or loses a shield. Every ship starts on 0 and stays there. There
is still no movement, no combat, no node, and no turn.

Because a board of fourteen 0-shield ships shows no arcs at all, the plan
**temporarily** gives the starting fleet varying counts so the visuals can be
judged by eye, and the **last substantive step removes them again**. That
sequencing is load-bearing: the manual "does it look right" gate must run while
the temporary counts are still in place.

## Sources of truth

- **The rules.** [`doc/ruleset/rules.md`](../../ruleset/rules.md), **version
  0.1**. The only section implemented here is **§4.1**, and only its first
  sentence: _a ship carries between 0 and 4 shields_. Everything else §4.1 says
  (gaining a shield on a node) and everything else shields touch (§5/§6
  movement, §7 combat, §3.1 bay reset) is out of scope, because each needs
  machinery that does not exist yet.
- **This story does not change the rules.** `doc/ruleset/rules.md` and
  `doc/ruleset/changelog.md` must be **untouched** by this branch.
  `RULES_VERSION` stays `"0.1"`, `src/rules/rulesVersion.test.ts` keeps passing
  unchanged, and there is no `/tag-rules` run. Appendix A item 2 (starting
  shields) stays deliberately open — the story records why at length; do not
  close it.
- **The conventions.** [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) —
  especially "Testing" (Vitest runs in the `node` environment by default; a DOM
  test opts in per file with `// @vitest-environment jsdom` on the first line, a
  per-file `import "@testing-library/jest-dom/vitest";`, `cleanup` in an
  `afterEach`, and axe run with `color-contrast` disabled) and "Comments"
  (comments say **what** the code does; **no story numbers, no plan-step
  references, no design history in code** — that material belongs here).
- **The existing code**, summarised in "What is already in place" below.

## What is already in place

- `src/rules/fleet.ts` — `Side` (`"green" | "red"`), `FleetEntry`
  (`{ square, side }`), the fourteen-entry `STARTING_FLEET` transcribed in §4's
  clockwise order from H15, and `startingSideAt(square)` returning
  `Side | undefined` via a name-keyed lookup map.
- `src/board/ShipIcon.tsx` — a decorative inline SVG in a `100 x 100` viewBox.
  Two `<path>` silhouettes (green: a pointed dart with a rear notch; red: a
  rounded hexagon), filled with `currentColor` and outlined in
  `var(--color-space)`. The `<svg>` is `aria-hidden="true"` and carries no
  `title`/`desc`. Its comments say the artwork fills "roughly 70%" of the
  viewBox with "every corner left clear for a future shield count" — **both
  statements are superseded by this story** (the arcs are a ring, not corners)
  and must be rewritten, not left to rot.
- `src/board/ShipIcon.css` — `.ship-icon` fills its square; `.ship-icon--green`
  / `.ship-icon--red` set `color` from `--color-green` / `--color-red`.
- `src/board/squareLabel.ts` — builds a square's accessible name as
  comma-separated segments: square name, then `bay`, then `green ship` /
  `red ship`.
- `src/board/Board.tsx` — builds all 225 cell descriptors once at module load,
  calling `isBay`, `startingSideAt` and `squareLabel`, and rendering
  `<ShipIcon side={occupant} />` inside each occupied square.
- `src/board/Board.css` — `.board-frame` is a 16 × 16 CSS-grid frame (one label
  track plus fifteen board tracks in each axis), with every track sized from a
  single `--square: clamp(24px, 4vmin, 42px)` custom property.
- `src/App.css` — `.app` is a column flex box with `min-height: 100vh`;
  `.app__board` is a centring flex box holding the board.
- `src/index.css` — the palette, plus the standing note that the two side
  colours "are always paired with a non-colour cue rather than carrying meaning
  alone".

## Where the code goes

| Path                          | Change                                                                    |
| ----------------------------- | ------------------------------------------------------------------------- |
| `src/rules/shields.ts`        | **new** — §4.1's 0–4 shield count: the type, its bounds, and a guard      |
| `src/rules/fleet.ts`          | `FleetEntry` gains `shields`; `startingSideAt` becomes `startingShipAt`   |
| `src/board/shieldArcs.ts`     | **new** — the pure count → which-arcs-are-lit mapping                     |
| `src/board/ShipIcon.tsx`      | draws the arc ring; the hull shrinks to make room                         |
| `src/board/ShipIcon.css`      | comment refresh; no new rules expected                                    |
| `src/board/ShipIcon.test.tsx` | **new** — renders a ship at each count 0–4                                |
| `src/board/squareLabel.ts`    | the accessible name gains a shield-count segment                          |
| `src/board/Board.tsx`         | passes the occupant's shield count to icon and label                      |
| `src/board/Board.css`         | square sizing: bigger minimum, no maximum, sized from the container       |
| `src/App.css`                 | makes `.app__board` a size container the board can measure itself against |

Tests live beside the code they cover. The split between `src/rules/` and
`src/board/` is the one story 00000001 established: `src/rules/` holds only what
`rules.md` states, so the app can be read against the document one folder at a
time; `src/board/` holds presentation, about which the document says nothing.
That is why the **0–4 bound** is a rules concern and **which arc lights for
which count** is not.

## Decisions taken at plan time

The story left six questions open. All six are settled here, with the
reasoning, because the code will not carry it.

### 1. Shields ride on `FleetEntry`; there is no `Ship` type yet

**Decision.** Add a required, readonly `shields` field to the existing
`FleetEntry`, typed as a new `ShieldCount` from `src/rules/shields.ts`. Do
**not** introduce a `Ship` entity, an identity/id, or any mutable ship state.

Reasoning:

- Nothing in this story mutates a ship. A `Ship` type earns its place when
  something needs to follow one ship across squares and turns — that is the
  movement story, and it will want an identity, a current square and a mutable
  shield count all at once. Introducing a hollow version of it now would fix a
  shape before the code that has to live with it exists.
- `FleetEntry` is already the record of "one ship, at the start of the game".
  A shield count is exactly that kind of fact, so it belongs on the same record.
- Making the field **required** rather than optional means a future entry cannot
  silently omit it, and no code has to decide what a missing count means.

**Rejected:** a parallel `SHIELDS_BY_SQUARE` map beside `STARTING_FLEET`. It
splits one ship's facts across two literals that must be kept in step by hand,
which is precisely the transcription hazard the fleet tests exist to catch.

**Consequence for the lookup.** `startingSideAt(square): Side | undefined` can
no longer serve the board, which now needs both facts. Replace it with
`startingShipAt(square): FleetEntry | undefined` and delete the old function
rather than keeping both — two lookups over the same map, one a strict subset of
the other, is an invitation to use the wrong one.

### 2. The 0–4 bound lives in `src/rules/`, the arc order in `src/board/`

**Decision.** `src/rules/shields.ts` owns §4.1's range: a `ShieldCount` type
that admits only 0, 1, 2, 3 and 4, named minimum/maximum constants, and a
runtime guard that tells whether an arbitrary number is a valid count.
`src/board/shieldArcs.ts` owns the presentation question — given a count, which
of the four arc positions are lit, in what order.

Reasoning:

- The bound is a rule and a future rules change could move it; the arc order is
  a drawing decision `rules.md` says nothing about. Keeping them in separate
  folders keeps "read `src/rules/` against the document" a workable review.
- A literal union type makes an out-of-range count a **compile** error at every
  call site, which is stronger than any test. The runtime guard exists for the
  edges where a number arrives from outside the type system (a future game
  record loader), and it gives the range something to unit-test today.

**Rejected:** a plain `number` with a validating constructor. It pushes every
check to runtime and would let `shields: 7` compile.

### 3. Which arcs light is a tested pure function, not conditionals in the icon

**Decision.** `src/board/shieldArcs.ts` exports the four arc positions
(`"top-right"`, `"bottom-right"`, `"bottom-left"`, `"top-left"` — that is both
the clockwise-from-top-right screen order and the fill order) and a pure
function from a `ShieldCount` to the ordered list of lit positions. `ShipIcon`
calls it and renders what it returns.

Reasoning: CONTRIBUTING.md explicitly asks for logic to be kept out of
components. This mapping is a total function of one small integer with five
inputs — it can be tested exhaustively in the fast `node` environment, whereas
the same rules expressed as JSX conditionals could only be checked through a
rendered DOM.

### 4. The arcs are drawn **inside** `ShipIcon`'s existing viewBox

**Decision.** `ShipIcon` takes a `shields` prop alongside `side` and draws the
ring inside its existing `100 x 100` viewBox, above (after) the hull path. No
sibling element, no second SVG, no change to the square's markup.

Reasoning:

- Hull and ring must stay concentric and scale together at every square size.
  Inside one viewBox that is free; as two elements it needs matching absolute
  positioning maintained in two places.
- The square's cell content stays a single decorative, `aria-hidden` element, so
  nothing about the accessibility tree changes shape — the count is carried by
  the square's name (decision 6), exactly as the ship already is.
- The whole ring is `currentColor`, so the existing `.ship-icon--green` /
  `.ship-icon--red` colour rules serve the arcs with no new CSS.

**Rejected:** a separate `ShieldArcs` component file. Nothing else will render
a shield ring without a ship under it, so it would be a file to satisfy a
symmetry rather than a consumer.

**The superseded comments.** `ShipIcon.tsx`'s "roughly 70% … every corner left
clear for a future shield count" and `ShipIcon.css`'s matching note both
describe a reservation this story replaces. Rewrite them to say what is now
true: the hull is scaled down to sit inside the shield ring, and the ring
occupies the outer band of the viewBox.

### 5. Arc geometry is expressed as named constants and tuned at a manual gate

**Decision.** Ring radius, stroke thickness, the angular gap between adjacent
arcs, and the hull's shrink factor are four named constants in one place in
`ShipIcon.tsx`. The hull shrinks by wrapping the **existing, unchanged** path
strings in a group with a scale transform about the viewBox centre, rather than
by rewriting the path coordinates.

Starting values, to be adjusted at Step 7's manual gate:

| Constant                  | Start | Meaning                                             |
| ------------------------- | ----- | --------------------------------------------------- |
| ring radius               | 42    | viewBox units from centre (50,50) to the arc centre |
| ring stroke width         | 8     | so the ring spans radius 38–46 of a 50-unit half    |
| gap between adjacent arcs | 14°   | each arc therefore sweeps 76° of its 90° quadrant   |
| hull scale                | 0.72  | applied about (50,50) to the current silhouettes    |

Reasoning:

- These four numbers are interdependent — a thicker stroke needs a smaller hull,
  a wider gap needs a longer visible arc to still read as a quarter — and the
  test that matters is whether four arcs read as four at a real square size on a
  real screen. That is an eye's judgement, so the plan schedules one, and gives
  the eye a single knob per dimension to turn.
- Scaling the existing paths keeps the two silhouettes exactly as story 00000001
  tuned them (they are the non-colour cue that keeps the sides tellable apart in
  greyscale), and makes "how far the hull shrinks" one number instead of a
  dozen re-derived coordinates.
- With radius 46 at the ring's outer edge, the ring stops 4 viewBox units (4% of
  a square) short of the square's edge, so it cannot bleed into a neighbour.
- Arc ends are **butt** caps, not round: round caps extend each arc by half the
  stroke width at both ends, quietly eating the gap the story requires to stay
  visible.

**Rejected:** drawing the unlit positions faintly. The story rules it out
explicitly — the squares are busy, and the count is a mechanic a player learns
in one game.

### 6. Accessible-name wording: the count comes last, and zero is spoken

**Decision.** The shield count becomes a fourth segment, after the ship:

- `H15, bay, green ship, 0 shields`
- `H15, bay, green ship, 1 shield`
- `H15, bay, green ship, 3 shields`

Singular only at 1. Zero is stated as `0 shields`. Unoccupied squares are
unchanged: `H8`, `D15, bay`.

Reasoning:

- **Last**, because a screen-reader user arrowing across the board needs
  position first and the most volatile fact last; the existing order already
  runs stable-to-specific (where → what kind of square → who is on it), and the
  count continues that line.
- **Spoken even at zero**, because the ear takes one square at a time. A silent
  zero is indistinguishable from an app that does not report shields at all,
  which is exactly why the spoken form and the drawn form differ here (the
  drawn form omits unlit arcs, because the eye has the whole board for context).
- **`0 shields` rather than `no shields`**, so the count always lands in the
  same slot in the same shape and a listener comparing two ships hears two
  numbers. "No shields" reads more naturally in isolation but breaks that
  parallel; it is the rejected alternative, recorded here in case the manual
  screen-reader gate changes the owner's mind.

**Signature change.** `squareLabel`'s third parameter changes from
`Side | undefined` to an optional occupant object carrying both the side and the
shield count (a shape `FleetEntry` already satisfies structurally). A fourth
parameter would make "shields but no side" expressible, which is not a state
that exists.

### 7. Square size comes from a **size container**, with a floor and no ceiling

**Decision.** Replace `--square: clamp(24px, 4vmin, 42px)` with a value derived
from the board's own container: make `.app__board` a **size container**
(`container-type: size`) and size the square as the larger of a fixed minimum
and one sixteenth of the container's smaller dimension (`cqmin`). One sixteenth
because `.board-frame` is sixteen tracks wide and sixteen tall — fifteen board
tracks plus one label track in each axis.

- **Minimum: 40px**, set by the owner at plan approval. That makes the board
  proper 15 × 40 = **600px**, and the whole frame 16 × 40 = **640px**, since
  `.board-frame` carries one label track in each axis on top of the fifteen
  board tracks. The container therefore needs **640px** in each axis before the
  board stops shrinking. Confirm or adjust at Step 2's manual gate.
- **No maximum.** On a large display the board simply gets large, as the story
  asks.
- **Too small to honour the minimum: the page scrolls.** An illegible board is
  worse than a scrollbar, and a genuinely small-screen layout is a separate
  design problem this story does not open. `.app__board` therefore aligns the
  board to its **start**, not its centre, in the block axis: centred content
  that overflows a box is clipped off the top where scrolling cannot reach it.

Reasoning:

- `4vmin` cannot know what else is on the page. It is already slightly wrong
  (the title takes vertical space the board is not told about) and would be
  properly wrong the moment a score tracker sits beside the board. Container
  units ask the right question — "how much room have I actually been given?" —
  and keep asking it correctly after later chrome arrives.
- It needs no JavaScript, no `ResizeObserver`, and no layout-measuring render
  pass, so it cannot desynchronise or flash.
- Container queries and container query units are supported by every current
  major browser, so this stays within the project's "modern libraries and
  approaches" remit with no dependency added.

**No speculative layout.** This story adds no panel, slot or placeholder for
chrome that has not been designed. The board fills the space it is given today;
a future story that introduces a score tracker decides its own layout.

**Known risk to check at the gate.** `container-type: size` requires the
container's size to be determined from outside, so `.app__board` must be a flex
item with a resolved height (`flex: 1` plus `min-height: 0` inside the existing
`min-height: 100vh` column). If the size container proves troublesome in
practice, the fallback — recorded here so it is not re-derived — is
`container-type: inline-size` on the same element with the board's height
constrained by an explicit `aspect-ratio: 1` wrapper. Prefer the size container;
take the fallback only if the gate shows a real problem, and record the switch
in the step's Notes.

### 8. The temporary fixture is nothing but literal values in `STARTING_FLEET`

**Decision.** The temporary counts are written as ordinary `shields:` values on
the fourteen `STARTING_FLEET` entries in `src/rules/fleet.ts`. There is no
fixture module, no environment flag, no dev-only branch, and nothing anywhere
else in the codebase refers to the fixture. Removing it (Step 9) is editing one
column of one literal back to zeros.

The values, in `STARTING_FLEET`'s existing order (H15 first, clockwise):

| #   | Square | Side  | Temporary shields |
| --- | ------ | ----- | ----------------- |
| 1   | H15    | green | 0                 |
| 2   | L15    | red   | 1                 |
| 3   | O14    | green | 2                 |
| 4   | O10    | red   | 3                 |
| 5   | O6     | green | 4                 |
| 6   | O2     | red   | 0                 |
| 7   | L1     | green | 1                 |
| 8   | H1     | red   | 2                 |
| 9   | D1     | green | 3                 |
| 10  | A2     | red   | 4                 |
| 11  | A6     | green | 0                 |
| 12  | A10    | red   | 1                 |
| 13  | A14    | green | 2                 |
| 14  | D15    | red   | 3                 |

This is the position's index modulo five, which happens to show **every count
from 0 to 4 on both sides** — so the gate can check green and red arcs at every
count without a second look. It deliberately is **not** the mirrored assignment
the story's background drafts and rejects (4/2/1/0 by bay): that one never shows
a 3, and reusing it would blur the line between a throwaway fixture and a
starting-shields proposal the owner has already turned down.

**Automated coverage must not depend on these values.** Every count from 0 to 4
is exercised by rendering a ship directly at that count (Steps 4 and 6). No test
asserts a specific ship's temporary count, because Step 9 deletes them and would
take the coverage with it. The one thing tests do assert about the fleet while
the fixture is in place is that every count is **within** the 0–4 range; the
"every ship starts on 0" assertion is added by Step 9, together with the revert.

**The fixture must not survive the branch.** Step 9 is not optional. If the
pipeline is resumed mid-story, the surest check is `STARTING_FLEET` itself: any
non-zero `shields` value in it means Step 9 has not run.

## Other design notes that apply across steps

- **The board's data is built once at module load** in `Board.tsx`
  (`BOARD_ROWS`), because the starting position is fixed. Keep it that way;
  nothing in this story makes it dynamic.
- **The ship artwork stays decorative**: `aria-hidden="true"` on the `<svg>`,
  no `title`, no `desc`, no text. All meaning reaches assistive technology
  through the square's accessible name. The arcs are part of the artwork and
  inherit this.
- **Give each arc a stable test hook.** Render each arc with a data attribute
  naming its position (e.g. a `data-*` attribute carrying `top-right`), so
  component tests can assert _which_ arcs are drawn and _in what order_ without
  matching generated path geometry. Path `d` strings are the part most likely to
  be re-tuned at the manual gate; tests must not be brittle against that.
- **Colour is never the count.** The arcs are the ship's own colour, so colour
  keeps its single job of telling the sides apart (alongside hull shape) and
  never has to carry the count too. Which positions are lit is the whole signal,
  and it survives greyscale.
- **jsdom has no layout.** Nothing about square sizes, overflow, arc spacing or
  visual legibility can be asserted in a DOM test. Those are precisely the
  manual gates; do not invent a test that pretends otherwise.
- **Comment style.** Short headers saying what a module does. No story numbers,
  no plan-step references, no rejected alternatives in code — a peer review
  treats those as a finding.
- **Every step is finished with** `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run format:check` (run `npm run format` to fix) and, for
  steps that touch rendering or CSS, `npm run build` — plus the step's own
  verification below.
- **The dev server** runs on `http://localhost:5273` (`npm run dev`).

---

## Step 1 — A shield count in the game state

Status: committed

Notes: Added `src/rules/shields.ts` (`ShieldCount`, `MIN_SHIELDS`,
`MAX_SHIELDS`, `isShieldCount`) and `src/rules/shields.test.ts`. Gave
`FleetEntry` a required `shields: ShieldCount` field, set all fourteen
`STARTING_FLEET` entries to `shields: 0`, and replaced `startingSideAt` with
`startingShipAt` (deleting the old function) in `src/rules/fleet.ts`. Updated
`src/board/Board.tsx` and `src/board/Board.test.tsx` for the rename, passing
only `occupant?.side` onward so rendered output and accessible names are
unchanged. Added a range assertion over `STARTING_FLEET` and renamed
`startingSideAt` call sites in `src/rules/fleet.test.ts`. No deviations from
the plan. `npm run typecheck`, `npm run lint`, `npm test` (76 tests) and
`npm run format:check` all pass.

Add `src/rules/shields.ts`: §4.1's shield count as a type admitting only 0, 1,
2, 3 and 4, named constants for the minimum (0) and maximum (4), and a runtime
guard answering whether an arbitrary number is a valid count. The module header
should say it implements §4.1's range and nothing else — no gaining, no losing,
no combat or movement effects, all of which are other stories.

Then extend `src/rules/fleet.ts`:

- `FleetEntry` gains a required, readonly `shields` field of that type.
- Every one of the fourteen `STARTING_FLEET` entries gets `shields: 0`. **All
  zeros** — the temporary varying values arrive in Step 7 and leave in Step 9.
- Replace `startingSideAt(square): Side | undefined` with
  `startingShipAt(square): FleetEntry | undefined`, keyed the same way (the
  existing name-keyed map). Delete the old function; do not keep both.
- Update `src/board/Board.tsx` and `src/board/Board.test.tsx` for the rename.
  Board.tsx keeps passing only the side onward for now (`occupant?.side` into
  both `squareLabel` and `ShipIcon`) — this step changes **no** rendered output
  and **no** accessible name. Wording changes in Step 5, artwork in Step 4.

See plan decisions 1 and 2 for why shields ride on `FleetEntry` rather than a
new `Ship` type, and why the 0–4 bound lives in `src/rules/` while the arc order
does not.

Depends on: nothing (first step).

Verification (automated): `npm test` — new unit tests in
`src/rules/shields.test.ts` show the guard accepting 0, 1, 2, 3 and 4 and
rejecting −1, 5, and a non-integer such as 1.5; and a new test in
`src/rules/fleet.test.ts` shows every entry in `STARTING_FLEET` carries a count
the guard accepts. The existing fleet, board and `Board` component tests must
pass **unchanged in expectation** (the rename aside): the accessible names, the
225 cells and the fourteen ships are all exactly as before. Also
`npm run typecheck`, `npm run lint`, `npm run format:check`.

---

## Step 2 — Size the board from its container

Status: committed

Notes: Replaced `--square: clamp(24px, 4vmin, 42px)` in `src/board/Board.css`
with `max(40px, 6.25cqmin)` (one sixteenth of `.app__board`'s smaller
dimension, floored at 40px), and rewrote the header comment accordingly. Made
`.app__board` in `src/App.css` a size container (`container-type: size`) with
`flex: 1` and `min-height: 0` to resolve a height from the `.app` column,
`width: 100%`, `justify-content: center` for horizontal centring, and
`align-items: flex-start` so an oversized board overflows downward into
scrollable space rather than being clipped at the top. Used the size
container as planned — no fallback needed. `npm run typecheck`, `npm run
lint`, `npm test` (76 tests), `npm run format:check` and `npm run build` all
pass. Kept the 40px floor as specified; did not adjust it. This step's
verification is manual and is left for the owner to check with `npm run dev`.

Change how a square's size is decided, per plan decision 7. In
`src/board/Board.css`, `--square` stops being `clamp(24px, 4vmin, 42px)` and
becomes the larger of a **40px minimum** and one sixteenth of the board
container's smaller dimension, measured in container query units. Sixteen
because `.board-frame` lays out sixteen tracks in each axis (fifteen board
tracks plus one label track). There is **no maximum**.

In `src/App.css`, make `.app__board` the size container that measurement reads
from: give it `container-type: size`, a resolved height as a flex item of the
existing `min-height: 100vh` column (`flex: 1` with `min-height: 0`), full
width, horizontal centring, and **start** alignment in the block axis so that a
board too large for the container overflows downward into scrollable space
rather than being clipped off the top.

Also update `Board.css`'s header comment, which currently explains the
`clamp()`-on-a-viewport-unit choice: say instead that the square is sized from
the board's container so the board fills the room it is actually given, with a
floor for legibility and no ceiling.

Scope discipline: change **only** how the board sizes itself. Do not add
panels, placeholders or layout slots for chrome that does not exist, and leave
`.app__title` alone.

Depends on: nothing in this story (it touches only CSS), but it comes before the
arc work so the arcs are drawn and tuned at the square sizes they will ship at.

Verification (manual): jsdom has no layout, so this cannot be tested
automatically. Run `npm run dev`, open `http://localhost:5273`, and confirm:

1. The board is square and the fifteen columns of squares line up with the A–O
   letters and 1–15 numbers around its edges, as before.
2. Resizing the window **grows and shrinks** the board continuously. Making the
   window very wide but short shrinks the board to fit the height; very tall but
   narrow shrinks it to fit the width. Whichever edge comes first wins.
3. There is **no upper limit**: maximised on the largest display available, the
   board keeps growing rather than stopping at a fixed size.
4. At ordinary desktop sizes there are no scrollbars, no clipping, and no part
   of the board hidden behind the title.
5. Shrinking the window far enough that the 40px floor takes over produces a
   scrollable page whose whole board can be reached by scrolling — nothing is
   cut off at the top or left where scrolling cannot reach it.

If 40px feels too small or needlessly large once seen, adjust it and record the
final value and the reason in this step's Notes. Also run `npm run build` and
confirm it succeeds.

---

## Step 3 — The shields-to-arcs mapping

Status: committed

Notes: Added `src/board/shieldArcs.ts` exporting `ArcPosition`,
`ARC_FILL_ORDER` (the four positions in fill order) and the pure function
`litArcPositions(shields)`, which returns `ARC_FILL_ORDER.slice(0, shields)`.
Added `src/board/shieldArcs.test.ts` covering every count 0–4 against the
tabled order plus a loop asserting the returned length always equals the
count. No JSX, geometry or colour, as required. No deviations from the plan.
`npm run typecheck`, `npm run lint`, `npm test` (82 tests) and
`npm run format:check` all pass.

Add `src/board/shieldArcs.ts`: the four arc positions and a pure function from a
shield count to the ordered list of lit positions. The fill order is fixed and
clockwise from the top right — `top-right`, `bottom-right`, `bottom-left`,
`top-left` — so a count of _n_ lights the first _n_ of that list, and 0 lights
none.

This is presentation, not a rule (plan decision 2), which is why it lives in
`src/board/`. It is a pure function of one small integer (plan decision 3) and
must contain no JSX, no geometry and no colour — only which positions are lit
and in what order. Geometry arrives in Step 4.

Depends on: Step 1 (the shield count type).

Verification (automated): `npm test` — unit tests in
`src/board/shieldArcs.test.ts` covering **every** count from 0 to 4 against the
table in `story.md`: 0 → nothing; 1 → top-right; 2 → top-right, bottom-right;
3 → those plus bottom-left; 4 → all four ending with top-left. Assert the
returned **order**, not just membership, since the order is the documented fill
order. Add a test that the result length always equals the count.

---

## Step 4 — Draw the arc ring

Status: pending

Give `ShipIcon` a required `shields` prop and draw the ring, per plan decisions
4 and 5:

- Inside the existing `100 x 100` viewBox, centred on (50,50), draw one stroked
  arc per lit position returned by Step 3's mapping. Stroke `currentColor` (so
  the arcs are the ship's own colour through the existing
  `.ship-icon--green` / `.ship-icon--red` rules), no fill, butt line caps.
- Each arc occupies its own quadrant, shortened at **both** ends so adjacent
  arcs are separated by a clearly visible gap and four arcs never close into a
  ring.
- Express radius, stroke width, the gap angle and the hull scale as four named
  constants in one place, starting at the values in plan decision 5 (42, 8, 14°,
  0.72). They are tuned at Step 7's gate.
- Shrink the hull by wrapping the two **unchanged** silhouette path strings in a
  group scaled about the viewBox centre. Do not re-derive the path coordinates —
  the silhouettes are the non-colour cue that keeps the two sides apart in
  greyscale.
- Give each arc element a data attribute naming its position, as a stable test
  hook that survives geometry re-tuning.
- Rewrite the now-false comments in `ShipIcon.tsx` and `ShipIcon.css` that
  reserve "every corner" for a shield count and describe a 70% hull. Say what is
  true now. No story numbers or plan references in code.
- `Board.tsx` passes the occupant's shield count into `ShipIcon`. With the
  starting fleet all on 0 (until Step 7), the board still shows no arcs at all —
  that is expected here.

The `<svg>` stays `aria-hidden="true"` with no `title` or `desc`: the arcs are
artwork, and the count reaches assistive technology through the square's name in
Step 5.

Depends on: Step 1 (the count on the fleet entry), Step 3 (the mapping), Step 2
(squares are already at their shipping sizes, so the geometry is tuned once).

Verification (automated): `npm test` — a new jsdom test file
`src/board/ShipIcon.test.tsx` follows the CONTRIBUTING.md DOM recipe and renders
`ShipIcon` **directly at each count 0, 1, 2, 3 and 4** for at least one side,
asserting the number of arc elements equals the count and that their position
attributes appear in the documented fill order. Note deliberately that this does
**not** go through the starting fleet: the fixture in Step 7 is deleted in Step
9, so coverage must not lean on it. Also assert both sides still render their
distinct hull paths, that the `<svg>` remains `aria-hidden` with no
`title`/`desc` even with arcs present, and that axe (with `color-contrast`
disabled) reports no violations. Existing `Board` tests must still pass. Run
`npm run build` too.

---

## Step 5 — Speak the shield count

Status: pending

Extend the accessible name, per plan decision 6. In
`src/board/squareLabel.ts`, the occupant parameter changes from a bare side to
an optional object carrying both the side and the shield count (a shape
`FleetEntry` already satisfies), and the name gains a final segment:

- `0 shields`, `1 shield`, `2 shields`, `3 shields`, `4 shields` — singular only
  at 1, and **stated even at zero**.
- The segment comes last, after the `green ship` / `red ship` segment.
- Unoccupied squares are untouched: `H8`, `D15, bay`.

Update the module header to describe the new segment order. Update
`src/board/Board.tsx` to pass the whole occupant through instead of just its
side.

Depends on: Step 1 (the count is on the fleet entry).

Verification (automated): `npm test` — unit tests in
`src/board/squareLabel.test.ts` assert the exact strings for: an occupied bay at
0 (`H15, bay, green ship, 0 shields`), at 1 (singular — `H15, bay, green ship, 1
shield`), and at a middle count such as 3; an occupied ordinary square, for
contract completeness; and unchanged names for an empty ordinary square (`H8`)
and an empty bay (`D15, bay`). `src/board/Board.test.tsx` is updated so its
literal expected names carry the new segment, and its "every square's name" loop
and its axe check still pass. Also `npm run typecheck` and `npm run build`.

---

## Step 6 — Show the whole 0–4 range in a component test

Status: pending

Add a component test that renders a **board square's worth** of ship at each
count and checks the two halves of this story meet correctly: the drawn arcs and
the spoken name agree, at every count from 0 to 4, for both sides.

This is a test-only step. If the assertions it needs are already fully covered
by Steps 4 and 5 (arcs at each count from `ShipIcon.test.tsx`, wording from
`squareLabel.test.ts`), the gap it must close is the **combination** — a
rendered element that both draws _n_ arcs and is named "… _n_ shields". Add it
where it reads best: either as a small fixture render in `Board.test.tsx` that
builds a cell from an occupant of each count, or as an added case in
`ShipIcon.test.tsx` paired with the label module. Do not doctor
`STARTING_FLEET` to achieve it — that fixture does not survive the story.

The purpose is explicit in `story.md`: coverage must survive the fixture's
removal. After Step 9, this step's tests are the only thing standing between a
regression and the 1–4 arc visuals nobody can see on the default board.

Depends on: Step 4 (arcs), Step 5 (wording).

Verification (automated): `npm test` — for each count 0, 1, 2, 3 and 4 and for
both sides, the rendered result draws exactly that many arcs in the documented
order and carries an accessible name ending in the matching shield segment.
Confirm by inspection that no assertion in the suite depends on any particular
ship's shield count in `STARTING_FLEET`.

---

## Step 7 — Temporary fixture, and the manual gate on the arcs

Status: pending

**Two things, one verification: the fixture exists only to feed the gate.**

First, set the fourteen `STARTING_FLEET` entries in `src/rules/fleet.ts` to the
temporary counts tabled in plan decision 8 (in the existing order from H15:
0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3). Write them as plain literal values —
no fixture module, no flag, no dev-only branch. Nothing else in the codebase may
reference them. **These are temporary and Step 9 removes them.**

Then run the story's central manual gate. This step is where the arc geometry
from Step 4 is actually settled: radius, stroke width, gap angle and hull scale
may all be adjusted here against the running board until the gate passes.
Record the final four values, and why they moved, in this step's Notes.

Depends on: Step 4 (arcs are drawn), Step 5 (names are spoken), Step 2 (squares
are at shipping sizes), Step 6 (coverage that will outlive the fixture is
already in place, so tuning cannot silently break it).

Verification (manual): run `npm run dev`, open `http://localhost:5273`, and
confirm all of:

1. Arcs appear in the tabled positions and fill order — one arc is top-right,
   two are top-right and bottom-right, three add bottom-left, four add top-left.
   With the fixture above, walk the bays clockwise from H15 and check the
   sequence 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3 reads correctly.
2. The gaps between adjacent arcs are **clearly visible**, and a full set of
   four unmistakably reads as four separate quarter-circles rather than a closed
   ring.
3. The arcs are unmistakably the ship's own colour, on both sides.
4. Ships and arcs stay legible at the **smallest** supported square size (shrink
   the window until the minimum from Step 2 takes over), and no arc touches or
   overlaps a neighbouring square at any size.
5. Every count from 0 to 4 is present on **both** sides — the fixture guarantees
   it — and each is countable at a glance without effort.
6. The greyscale check still passes: with colour removed (browser devtools'
   greyscale emulation or the OS colour filter), the two fleets are still
   tellable apart by hull shape, and the counts are still readable.

The automated suite must also stay green (`npm test`, `npm run typecheck`,
`npm run lint`, `npm run format:check`, `npm run build`) — no test may have been
made to pass by the temporary counts.

---

## Step 8 — Manual gate: screen reader

Status: pending

No code. The story's screen-reader gate, taken while the temporary counts are
still in place so a range of counts can actually be heard.

Depends on: Step 7 (the fixture is on the board and the visuals are settled).

Verification (manual): with `npm run dev` running at `http://localhost:5273` and
a screen reader active (VoiceOver on macOS, NVDA on Windows, or Orca on Linux):

1. Arrowing across occupied squares announces the shield count as part of the
   square's name, after the ship — e.g. "H15, bay, green ship, 0 shields",
   "L15, bay, red ship, 1 shield".
2. The **singular** is used at 1 and the plural everywhere else, and the wording
   makes sense read aloud at speed.
3. A ship with **no** shields still announces a count ("0 shields"), so a
   listener can tell it apart from an app that says nothing about shields.
4. Empty squares are unchanged: "H8", "D15, bay" — no shield segment.
5. Nothing extraneous is announced from the arc artwork.

The pass condition is intelligibility, not an exact string: each screen reader
wraps its own role and position announcements around the name. If the wording
grates aloud — in particular if "0 shields" would be better as "no shields" (the
alternative recorded in plan decision 6) — change it here, update
`squareLabel`'s tests to match, and record the change and the reason in this
step's Notes.

---

## Step 9 — Remove the temporary fixture

Status: pending

Return every entry in `STARTING_FLEET` to `shields: 0`, undoing Step 7's
temporary values and nothing else. This is the state the story ships: every ship
starts the game on 0 shields, and Appendix A item 2 stays open.

Add the assertion that locks it in: a test in `src/rules/fleet.test.ts` that
**every** entry in the starting fleet carries exactly 0 shields. Keep the
range test from Step 1 as well — the two say different things (one that the
value is legal, one that it is the intended opening).

Nothing else changes. In particular, do not remove or weaken any test added by
Steps 3, 4, 5 or 6: those exercise counts 1–4 directly and are the only
remaining coverage of the arc visuals once no ship on the default board has any.

Depends on: Step 7 (which added the fixture) and Step 8 (the last gate that
needed it). Both manual gates must have passed before this runs — a revert
scheduled earlier would leave nothing to look at.

Verification (automated): `npm test` — the new all-zeros test passes, and every
test covering counts 1 to 4 still passes because none of them ever depended on
the fleet. Confirm by search that no `shields:` value anywhere in
`src/rules/fleet.ts` is non-zero. Also `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm run build`.

---

## Step 10 — Manual gate: the board after the revert

Status: pending

No code. A last look, confirming the shipped state is the intended one.

Depends on: Step 9 (the fixture is gone).

Verification (manual): run `npm run dev`, open `http://localhost:5273`, and
confirm:

1. Fourteen ships sit one per bay in §4's clockwise pattern from H15, exactly as
   before this story.
2. **No arcs are drawn anywhere** — every ship is on 0 shields.
3. The ships are visibly smaller than before (the hull shrank to make room for a
   ring that is currently empty), but still clearly two distinguishable
   silhouettes, and still legible at the smallest square size.
4. Nothing else about the board has changed: bays are still marked, the edge
   labels still align with the tracks, sizing still behaves as Step 2 left it,
   and there is no leftover debug or fixture artefact on screen.

---

## Step 11 — README check

Status: pending

Review `README.md` against what this story changed and update it if it is now
inaccurate. The `/update-readme` command does this from the branch diff.

What to weigh, in a sentence or two written for a non-technical player: the app
now draws a shield count on every ship, but every ship starts on none, and
nothing can gain or lose one yet — so a player opening the app sees no arcs.
Whether that is worth saying at all is the judgement here. If the README already
describes the app as not yet playable, it may well need no change; record that
conclusion and the reason in this step's Notes if so.

Also confirm what this story deliberately did **not** touch: the rules did not
change, so `doc/ruleset/rules.md` and `doc/ruleset/changelog.md` must be
untouched by this branch, and `RULES_VERSION` must still be `"0.1"`.

Depends on: Step 10 (the story's behaviour is confirmed).

Verification (automated): `npm run typecheck`, `npm run lint`, `npm test`,
`npm run format:check` and `npm run build` all pass, `git diff main --stat`
shows **no** changes under `doc/ruleset/`, and `src/rules/rulesVersion.test.ts`
passes with `RULES_VERSION` unchanged at `"0.1"`.
