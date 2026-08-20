# Implementation Plan — 00000020 Visual touch-ups

This plan turns [`story.md`](./story.md) into an ordered sequence of steps. Each
step is implemented, verified and committed on its own, by an agent that has
read only `story.md`, this plan, and its own step. Everything a step needs is
stated here — including the reasoning behind every decision, because the code
does not carry design history (CONTRIBUTING.md, "Comments").

## What this story changes

Six independent visual changes, none of which touches how the game is played:

1. **New site artwork** — `SiteMarker` is redrawn: a small centred circle plus
   a bay-style border for depleted, dormant and active; a clipped radial glow
   filling the square for charged.
2. **No row or column labels** — the lettered and numbered strips around the
   board go away, and `.board-frame` becomes a plain 15 x 15.
3. **Faster stranded flash** — the "owes an action" blink drops from 1s to
   0.25s.
4. **Unlit shield arcs** — a ship draws all four arcs; the ones it does not
   have are grey.
5. **One containing box** — `.app__cabinet` grows to hold the title, the HUD
   and the board, and the HUD loses its own separately-coloured panel.
6. **Full-box game over screen** — the game-over panel replaces the cabinet's
   contents rather than covering them, and waits for the last turn's score
   count-up to settle before it appears.

Item 6 is the only one with real behaviour behind it (the wait), so it gets a
scaffolding step of its own before the visible change.

Eleven steps:

1. A temporary review fixture, so every later step can be looked at by eye.
2. The site artwork.
3. The row and column labels go.
4. The blink speeds up.
5. Unlit shield arcs.
6. One containing box.
7. The score count-up is lifted out of `ScoreDisplay` (no visible change).
8. The full-box game-over screen, gated on the count-up settling.
9. Manual gate: the owner looks at the whole thing.
10. The temporary fixture is removed.
11. `README.md`.

## Sources of truth

- **The rules do not change.** `doc/ruleset/rules.md` stays at whatever version
  it is on; **no step may edit `doc/ruleset/rules.md`, `doc/ruleset/changelog.md`
  or `RULES_VERSION`**, and no step may change what a move, an attack, an
  end-of-turn or a score _is_. This story is pixels only. If a step turns up
  something that looks like a rules question, **stop and raise it with the
  owner**; do not settle it in code. (D1.)
- **Vocabulary** (CLAUDE.md). `rules.md`, the UI and `README.md` say **turn**
  and **node**; code, tests and this plan say **ply** and **hub**. A **site** is
  a fixed board position where a hub can appear; the same word everywhere. A
  **move** is the movement action only, never a synonym for a turn.
- **Conventions** ([`CONTRIBUTING.md`](../../../CONTRIBUTING.md)): comments say
  what a module does and carry no design history; logic stays out of components
  and lives in plain modules with plain unit tests; DOM tests follow the jsdom
  recipe (`// @vitest-environment jsdom` as the file's first line, a per-file
  `import "@testing-library/jest-dom/vitest";`, `cleanup` in `afterEach`, axe
  runs with `color-contrast` disabled).
- **Toolchain**, all run from the dev container at the repository root:
  `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`,
  `npm run build`, `npm run dev` (Vite, forwarded to the host on port 5273).

## Explicitly out of scope

From `story.md`, and binding on every step:

- **Accessibility work of any kind.** Existing accessible names, hidden
  sentences, `aria-hidden` markings, focus handling and the live region are left
  as they are. They may only be touched where this story makes one **factually
  wrong** (for example a comment claiming labels are drawn on screen when they
  no longer are), and then only to correct the fact — not to redesign the
  wording. Every existing axe check must keep passing.
- **Any rules, ruleset or gameplay change** (see D1).
- **Rebalancing, new HUD content, new cues, new animations.** Nothing is added
  to the screen that the story does not ask for.
- **Tagging.** Tagging is on hold until the game plays (CLAUDE.md), and this
  story is not a rules change in any case.

## Decisions

**D1 — No rules change, no version bump.** Nothing here alters how the game is
played: artwork, labels, an animation duration, a colour, box layout, and when a
panel appears. `rules.md`, `changelog.md` and `RULES_VERSION` are untouched, and
`src/rules/` is untouched except where a rules module is merely _read_. The
plan guide's "rules step first" requirement therefore does not apply.

**D2 — The new site artwork is knowingly colour-only for three of the four
states.** The current marker deliberately differs by line treatment as well as
hue (dashed / solid / double / dotted), and `SiteMarker.test.tsx` asserts that
in a test called "differs by more than colour". `story.md` replaces that with
three states that share one shape and differ only in colour, plus a fourth
(charged) that is unmistakably different. That test is therefore rewritten, not
worked around: the story is explicit, a site's state still reaches assistive
technology through the square's accessible name (`squareLabel.ts`), and
accessibility is deferred to a later story. This is a deliberate regression of a
non-colour cue and should be on the accessibility story's list. Rejected:
keeping a dash pattern or stroke-weight difference on top of the new artwork —
it contradicts "the same border attributes … differing only in colour".

**D3 — The border is a real CSS border on the marker element.** `story.md` says
the three bordered states use "the same border attributes as the bay borders",
which in `BoardSquare.css` is `border: 2px solid var(--bay-border)`. The
simplest way to be literally the same is a CSS `border: 2px solid <state
colour>` on `.site-marker`, which fills its square as a grid item, with the
global `box-sizing: border-box` keeping it inside the square. No site square is
ever a bay square (`SITES` in `src/rules/sites.ts` and `BAYS` in
`src/rules/bays.ts` share none), so a site border never doubles up with a bay
border. Rejected: a stroked `<rect>` inside the SVG viewBox — it needs
half-stroke inset arithmetic, scales with the viewBox rather than with the
screen, and is not "the same border attributes".

**D4 — Charged's glow is a CSS radial gradient on the marker element, not an
SVG gradient.** A CSS `radial-gradient(circle farthest-corner at 50% 50%, …)`
is a circle reaching the square's corners — larger than the square in both
axes — and the element's own box clips it, which is exactly what `story.md`
describes. It also stays entirely in the stylesheet, where this file already
keeps colour. Rejected: an SVG `<radialGradient>` in `<defs>` — it needs a
unique `id` per rendered instance (up to five charged sites on screen at once),
which means threading `useId()` through a component that currently has no state
at all, and risks duplicate-id findings in the axe checks.

**D5 — Every state renders the same SVG shape: one centred circle.** The
component keeps its 100 x 100 viewBox and its single `<circle>`, and the four
states differ only in what CSS does with them. For charged, the circle sits at
the centre of its own glow in the same colour, so the two read as one disc
spreading outwards; drawing it there rather than special-casing charged keeps
the component uniform and keeps the state difference in one place (the
stylesheet). Rejected: rendering a different element type or no SVG at all for
charged — a second shape of markup for one state, for no visible gain.

**D6 — Exact colours and radii are tuned by eye at the manual gate (Step 9).**
The plan gives starting values that satisfy the story; they are starting
values, not requirements. The one thing to watch is that the orange-yellow does
not read as the focus-ring amber (`--focus-ring`, `#ffb703` in `src/index.css`),
which appears as an outline on the focused square.

**D7 — The labels are removed, not hidden.** The strips leave the DOM and the
stylesheet together; `.board-frame` goes from sixteen tracks per axis to
fifteen. Two consequences a cold reader will otherwise trip over: `--square`
is one **fifteenth** of the container's smaller dimension rather than one
sixteenth, and the grid-line numbers that place `.board` (in `Board.css`) and
`.energy-overlay` (in `EnergyOverlay.css`) shift from `2 / 17` to `1 / 16`.
Square _names_ are untouched: `COLUMN_LETTERS` and `squareName` stay exactly as
they are, and every square's accessible name still carries its coordinates.

**D8 — Unlit arcs come from a pure function, not from the component.**
`src/board/shieldArcs.ts` already owns "which positions are lit"; it gains the
complementary "which are not", with its own unit tests, per CONTRIBUTING.md's
preference for keeping logic out of components. The component renders all four
positions in `ARC_FILL_ORDER` and marks each one lit or unlit with a modifier
class, which is both what CSS needs for colour and what a jsdom test can see.

**D9 — The score count-up is lifted out of `ScoreDisplay` and owned by
`App`.** `story.md` requires the final scores to wait until the last turn's
energy has finished rolling up on the HUD, so something above both the HUD and
the game-over panel has to know whether the roll has settled. The count-up state
moves into a new hook, `useDisplayedEnergy`, in `src/hud/`: it wraps the
existing `useCountUp` for both sides and reports the displayed totals plus a
single `settled` flag. `App` calls it, passes the displayed totals down through
`Hud` to `ScoreDisplay`, and uses `settled` to decide when the game-over screen
takes over. Three side benefits: there is exactly one animation clock for a
number that is shown in two places; the roll keeps running correctly even as the
HUD is about to be unmounted (the state lives above it); and under
`prefers-reduced-motion` the count-up jumps instantly, so `settled` is true
immediately and the game-over screen appears with no artificial delay.
Rejected: a fixed `COUNT_UP_DURATION_MS` timer in `App` — it duplicates the
duration in a second place, guesses wrong under reduced motion, and drifts the
moment the roll stops being linear. Rejected: a second, parallel `useCountUp`
in `App` purely to observe settling — two clocks for one number, with nothing
holding them in step. Rejected: putting the wait inside `GameOverPanel` — the
panel cannot see what the HUD is displaying, so it would have to re-derive it.

**D10 — The game-over screen replaces the cabinet's contents; it no longer
covers them.** `story.md` asks for the title, HUD and board to be "switched
off", so `App` renders either the game or the panel, and `GameOverPanel.css`
drops `position: absolute`, `inset: 0` and `z-index` (they existed only to cover
a board that could overflow its box, and there is nothing left behind the panel
to cover). Three accepted consequences, all accessibility-adjacent and all
deferred to the later accessibility story rather than solved here:

- The board's live region unmounts with the board, so the spoken "The game is
  over after N rounds. …" announcement is only reliably heard when the last turn
  scored energy and the board stays up for the count-up. The panel is still
  focused when it appears and still carries the result as a visually hidden
  sentence, so the result is never silently lost.
- While the panel is up there is no `<h1>` on the page; the panel's heading
  stays an `<h2>`, exactly as today.
- The energy overlay's floating "+N" runs for 1.2s but the board goes away after
  roughly 0.6s on the final turn, so the last one is cut short. Waiting for the
  overlay instead of the count-up would contradict the story, which names the
  count-up.

**D11 — A temporary review fixture, added first and removed at the end.** None
of what this story changes can be seen from the real opening position in a
reasonable time: no site is charged or depleted at the start, no ship has
shields, no ship is stranded, and the game runs a hundred rounds. Stories
00000009, 00000011 and 00000012 all used the same device — a hand-built
position in `src/game/`, wired into `App.tsx` with a one-import, one-call
change, deleted before the story ships. It goes in **first** so that every
implementing step can also glance at its own work in the dev server, not only
the gate. Its one cost is that `src/App.test.tsx`'s three opening-position
assertions have to follow it there (Step 1) and back (Step 10); both steps say
so explicitly, so it is not an undocumented deviation when it happens.

---

### Step 1 — A temporary review fixture

Status: committed

Notes: Added `src/game/reviewFixture.ts` built from
`startingGameState(20260820, 3)` overridden per the spec (H8/E5/K5/K11
charged, D8 depleted, E11 left active, five ships repositioned with
shields, energy 4/1, ply 5, green to move, return position index drifted
four times), and wired it into `src/App.tsx` in place of
`startingGameState(freshSeed())` — one import, one call. Updated the three
named `src/App.test.tsx` assertions to the fixture's HUD values. Verified
the position's arithmetic (five active-or-charged sites, the named charged
and depleted sites, `strandedShipIds` returning exactly `green-3`, game not
over, round 3 of 3, two charged nodes held per side) with a throwaway test
file, then deleted it. `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` all pass; the only
`format:check` warning is the pre-existing one on `story.md`, unrelated to
this step. `grep -rn "reviewFixture" src` shows only the module itself and
its one call site in `App.tsx`. No deviation from the step as written.

Add `src/game/reviewFixture.ts`, a **temporary** module holding a hand-built
position, and have `src/App.tsx` build its opening session from it instead of
from `startingGameState(freshSeed())` — a change of one import and one call.
**Step 10 deletes it.** See D11 for why it exists.

The module header must say plainly that this is **not a position reachable by
play** and that it exists only so the app can be checked by eye. It must not
mention this plan, its steps, or the story.

#### The position

Build it from `startingGameState(<fixed literal seed>, 3)` and override, rather
than hand-writing all seventeen site entries — fewer places to get it wrong.
`startingGameState(seed, lengthInRounds)` lives in `src/rules/gameState.ts`;
`STARTING_RETURN_POSITION_INDEX` and `driftReturnPositionIndex` in
`src/rules/bays.ts`.

- **Three rounds** (six plies), at **ply 5**, **green to move**, one action
  remaining (`ACTIONS_PER_PLY` is 1), nothing acted yet this ply. Green takes
  odd plies, so ply 5 is green's last turn and the round counter must read
  **3/3**.
- **Sites**: **H8, E5, K5 and K11 charged**, each entered on ply 4; **E11
  active**; **D8 depleted**, entered on ply 4; the other twelve dormant. That is
  five active-or-charged, as §8.1 requires, and neither the charged clock (nine
  plies from the ply it was woken on) nor the depleted cooldown (nine plies
  after) can fire before the game ends at ply 6.
- **Ships**: green-1 on **H8** with 2 shields, green-2 on **E5** with 4 shields,
  green-3 on **D8** with 1 shield, red-1 on **K5** with 3 shields, red-2 on
  **K11** with 0 shields; the remaining nine ships stay in their starting bays
  with no shields.
- **Energy so far**: green 4, red 1 — non-zero, unequal, small enough to read
  at a glance and small enough that the roll at the end is visible.
- **The return position index** drifted forward from
  `STARTING_RETURN_POSITION_INDEX` by the four plies already played, computed
  with `driftReturnPositionIndex` rather than written as a literal.

`plyNumber`, `sideToMove` and `actionsRemaining` must agree, and the return
index must be drifted, or the board's own cues look wrong for reasons that have
nothing to do with this story.

#### What the position is for

- All four site states are on screen at once (Step 2's artwork), including a
  depleted one, which a real game takes eighteen plies to produce.
- Ships at 0, 1, 2, 3 and 4 shields are on screen at once (Step 5's arcs).
- Green-3 stands on a depleted site with legal moves, so it is **stranded**: it
  blinks, and green's single action must free it (Step 4's faster blink).
- Green's turn ends with green holding two charged nodes, collecting 3 and
  rolling 4 → 7. Red's turn then ends with red holding two, collecting 3 and
  rolling 1 → 4 — and that same end-of-turn ends the game, which is exactly the
  case Step 8's wait exists for.
- The whole ending is two actions away, so it can be reached in seconds and
  re-reached after every reload. "Play again" then starts a fresh three-round
  game from the true opening position.

#### Constraints, all load-bearing

- It lives in `src/game/`, **never** `src/rules/`.
- **No automated test may depend on it.** Every test builds its own position.
- Keep it a plain data module: no route, no query parameter, no
  `import.meta.env` branch.
- `src/App.test.tsx` asserts the opening position's HUD values — currently
  `"Green: 0 energy, no nodes held."`, `"Red: 0 energy, no nodes held."` and
  `"1/100"`. With the fixture in place those are false, so update those three
  assertions to the fixture's values (`"Green: 4 energy, 2 nodes held."`,
  `"Red: 1 energy, 2 nodes held."`, `"3/3"`). Do not weaken or delete them, and
  do not add any further dependency on the fixture. Step 10 restores them.
  `"Green to play"` and the "no result panel while the game is in progress"
  assertion stay true either way.

Depends on: nothing.

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` all pass, with no test
changed beyond the three `src/App.test.tsx` assertions named above. Verify the
position's own arithmetic with a **throwaway** test file, deleted before
finishing: exactly five sites are active-or-charged; H8, E5, K5, K11 are
charged and D8 depleted; `strandedShipIds` (from `src/rules/stranded.ts`)
returns exactly `green-3`; the game is not over; `currentRound` reads 3 of 3;
and `chargedNodesHeldBy` returns two squares for each side. Confirm by
inspection that nothing outside `src/game/reviewFixture.ts` and its one call
site in `src/App.tsx` mentions it.

---

### Step 2 — The new site artwork

Status: committed

Notes: Rewrote `SiteMarker.tsx` to a single centred `<circle r={12}>` filled
with `currentColor` for all four states, dropping the ring-spec table and the
per-state multi-circle rendering. `SiteMarker.css` now carries a shared
`2px solid transparent` border on `.site-marker`, overridden per state:
depleted/dormant/active set both `color` and `border-color` (grey, white,
`#ffbe3d`), and charged drops the border entirely and paints a
`radial-gradient(circle farthest-corner at 50% 50%, #ffbe3d 0%, #ffbe3d 20%,
#fff3c4 100%)` background instead. The unused `--site-accent` custom property
is gone. Replaced the "differs by more than colour" geometry test with an
`it.each` asserting one centred circle per state in the shared viewBox, per
D2; the modifier-class, decorative and axe tests are untouched.
`src/board/Board.test.tsx`'s site tests needed no change, confirming the
component's contract (class list, single `aria-hidden` SVG, no title/desc)
held. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`
(651 tests, 40 files) and `npm run build` all pass. No deviation from the
step as written; exact colours/radius are starting values per D6, to be
judged by eye at Step 9.

Redraw `src/board/SiteMarker.tsx` and `src/board/SiteMarker.css` to
`story.md`'s four states, following D2–D6. The component's contract does not
change: it still takes a `SiteState`, still renders a single `aria-hidden` SVG
whose class list is `site-marker site-marker--<state>`, still carries no
`<title>` or `<desc>`, and is still stacked beneath any ship on the same square
by `BoardSquare`.

**The component** keeps its 100 x 100 viewBox centred at (50, 50) — the same
one `ShipIcon` and `BoardSquare`'s markings use — and draws **one** centred
circle filled with `currentColor` for every state (D5). Everything the old
component carried for the ring states goes: the ring spec table, the multiple
`<circle>` elements, the stroke widths and dash arrays, and the separate fill
circle. A small circle is roughly a quarter of the square across; radius 12 in
viewBox units is a good starting value (D6).

**The stylesheet** carries the four states' appearance:

- `.site-marker` keeps `display: block; width: 100%; height: 100%` so it fills
  its square, and gains the shared border declaration.
- **Depleted** — grey circle, grey border. `var(--color-text-dim)` is the
  starting value for the grey.
- **Dormant** — white circle, white border. `var(--color-text-bright)` is the
  starting value.
- **Active** — orange-yellow circle, orange-yellow border. Starting value
  `#ffbe3d`, kept clear of the focus-ring amber (D6).
- **Charged** — the same orange-yellow circle at the centre, with a CSS
  `radial-gradient` behind it running from that colour out to a whitish-yellow
  (starting value `#fff3c4`) at the gradient circle's outer edge, and **no
  border**. Use `circle farthest-corner at 50% 50%` so the gradient circle
  reaches the square's corners and is clipped by the element's own box (D4), and
  hold the centre colour solid for the first stop or so, so the small disc reads
  as the source of the glow rather than as a separate mark.
- The three bordered states use the **same border attributes as a bay's**
  (`2px solid`, matching `.board-square--bay` in `BoardSquare.css`), differing
  only in colour (D3).
- The old violet `--site-accent` custom property has no remaining user and goes.
  Any new colours it is replaced by live in this file, as `--site-accent` did,
  because only this file needs them.

**Comments.** `SiteMarker.tsx`'s module header and `SiteMarker.css`'s header
both describe the old ring artwork and its greyscale reasoning; rewrite them to
describe what the file now does. Keep the note that the marker is decorative and
that a screen reader gets the site and its state from the square's accessible
name. Do not write design history into either file (CONTRIBUTING.md) — the
reasoning belongs in this plan.

**Tests** (`src/board/SiteMarker.test.tsx`). Keep the state-modifier-class test,
the decorative test and the axe test as they are. Replace the "differs by more
than colour" geometry test — the new artwork does not differ by geometry for
three of the four states (D2) — with a structural test of what jsdom can
actually see: every state renders exactly one centred circle in the shared
viewBox. Do not invent assertions about CSS colours or borders; jsdom does not
apply the imported stylesheet, and the appearance is Step 9's business.

Depends on: Step 1 (the fixture puts all four states on screen at once, so the
implementer can glance at the result; nothing in the code depends on it).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` all pass, with
`src/board/SiteMarker.test.tsx` asserting the four modifier classes, one circle
per state, the decorative markings, and no axe violations. `src/board/Board.test.tsx`'s
site tests (which assert which squares carry a marker, and in which state) must
pass **unchanged** — if one needs editing, the component's contract has been
changed and it should not have been. The appearance itself is checked by eye at
Step 9.

---

### Step 3 — No row or column labels

Status: committed

Notes: Removed the row/column label elements, the `board-frame__corner`
spacer, `DISPLAY_ROW_NUMBERS` and the now-unused `COLUMN_LETTERS` import from
`Board.tsx`, and rewrote its doc comment; `.board-frame` in `Board.css` is now
fifteen tracks per axis with `--square: max(40px, 6.6667cqmin)`, `.board`
placed at `1 / 16` for both axes, and the four label rules deleted;
`.energy-overlay` in `EnergyOverlay.css` moved to `grid-column: 1 / 16` to
match. Replaced the "draws visible column letters and row numbers" test with
one asserting `.board-frame` holds only the grid and the energy overlay (by
child count and by querying `.board`/`.energy-overlay`, deliberately not the
removed `board-frame__*` class names, so `grep -rn "board-frame__" src`
stays clean per the step's own verification), that the grid is still 15 rows
and 225 cells with no column/row headers, and that A1 and O15 still carry
their plain accessible names. One deviation from the plan's literal test
prose: it suggested asserting a cell name "starts `A1,`" / "starts `O15,`",
but on the starting position those two corner squares are ordinary empty
squares whose accessible name is the bare square name with no trailing
comma (`squareLabel.ts`: "ordinary empty squares are named by their square
name alone") — so the test asserts the exact names `"A1"` and `"O15"`
instead, which still proves square names survive the label removal.
`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (651
tests, 40 files) and `npm run build` all pass; `grep -rn "board-frame__" src`
returns nothing. The board's new size and centring are for Step 9's manual
gate.

Drop the lettered and numbered strips from the board and shrink `.board-frame`
to a plain 15 x 15 of playing squares (D7).

**`src/board/Board.tsx`** — remove the `board-frame__row-labels` and
`board-frame__column-labels` elements and the `board-frame__corner` spacer, the
`DISPLAY_ROW_NUMBERS` constant that fed the row strip, and the now-unused
`COLUMN_LETTERS` import (`BOARD_SIZE`, `squareName` and `squareForGridPosition`
are all still used elsewhere in the file — check before deleting an import).
What remains inside `.board-frame` is the `AccessibleGrid` and the
`EnergyOverlay`, in that order. The component's doc comment describes the
visible labels and why they are `aria-hidden`; rewrite it so it describes the
board as it now is, keeping the sentence about the energy overlay sitting
outside `role="grid"` (a grid may only own rows), which is still true and still
the reason that element is where it is.

**`src/board/Board.css`** — `.board-frame` becomes fifteen tracks in each axis,
so `--square` becomes one **fifteenth** of the container's smaller dimension
(`max(40px, 6.6667cqmin)`, keeping the existing 40px legibility floor), and
`.board`'s placement becomes `grid-column: 1 / 16; grid-row: 1 / 16`. Delete the
`.board-frame__row-labels`, `.board-frame__corner`, `.board-frame__column-labels`
and `.board-frame__label` rules. Update the file's header comment, which
currently explains the label tracks and their alignment.

**`src/board/EnergyOverlay.css`** — `.energy-overlay` is placed in the same grid
area as `.board`, so its `grid-column` moves from `2 / 17` to `1 / 16` as well.
Missing this is the failure mode of this step: the overlay silently drifts one
square right and one square's width too wide, and only shows up when energy is
collected.

**Nothing about square names changes.** `COLUMN_LETTERS`, `squareName`,
`squareLabel` and every accessible name stay exactly as they are; A–O and 1–15
still name squares in the rules and in accessible names. They are simply no
longer drawn.

**Tests** (`src/board/Board.test.tsx`) — the test named "draws visible column
letters and row numbers, hidden from the accessibility tree" (it queries
`.board-frame__row-labels` and `.board-frame__column-labels`) is now false.
Replace it with one asserting the opposite where it matters: neither label
element exists in the rendered DOM, the grid is still 15 rows and 225 cells with
no `columnheader` or `rowheader`, and a square's accessible name still carries
its coordinates (assert a cell whose name starts `A1,` and one whose name starts
`O15,`, so the story's "square names are unaffected" is actually covered). No
other test in the file should need to change.

Depends on: Step 1 (fixture only, for a look).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` all pass, with the
replacement `Board.test.tsx` case above. Additionally
`grep -rn "board-frame__" src` returns nothing at all. The board's new size and
centring are checked by eye at Step 9.

---

### Step 4 — The stranded flash speeds up

Status: committed

Notes: Changed the `animation` duration on `.board-square--owes-action .ship-icon`
in `src/board/BoardSquare.css` from `1s` to `0.25s`; nothing else in the
declaration changed. `npm run typecheck`, `npm run lint`, `npm run format:check`,
`npm test` (651 tests, 40 files) and `npm run build` all pass.
`grep -n "board-square-owes-action-blink" -A 1 src/board/BoardSquare.css` shows
the 0.25s duration, and a grep for the old `1s ease-in-out infinite alternate`
value returns nothing. No deviation from the step as written; the speed itself
is for Step 9's manual gate.

In `src/board/BoardSquare.css`, the `board-square-owes-action-blink` animation
on `.board-square--owes-action .ship-icon` runs for `1s`; make it `0.25s`.
Nothing else in the declaration changes — it stays `ease-in-out infinite
alternate`, so a full dark-to-light-to-dark cycle is 0.5s. The
`prefers-reduced-motion` block that switches the animation off entirely, and the
chevron mark that carries the same meaning without motion, both stay exactly as
they are.

This is a one-value change and there is nothing else to do in it. It is a step
of its own rather than folded into a neighbour because it is the whole of
`story.md` item 3 and needs its own line in the record.

Depends on: Step 1 (the fixture is the only quick way to see a blinking ship —
green-3 on the depleted D8 owes green's action).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` all pass — no test
asserts the duration, because jsdom does not apply stylesheets. Additionally
`grep -n "board-square-owes-action-blink" -A 1 src/board/BoardSquare.css` shows
the 0.25s duration and no other occurrence of the old value. The speed itself is
judged by eye at Step 9; this is the one step whose real verification is
entirely deferred there, and that is deliberate — a CSS duration has no runtime
surface a test can reach.

---

### Step 5 — Unlit shield arcs

Status: committed

Notes: Added `unlitArcPositions` to `src/board/shieldArcs.ts` (the
`ARC_FILL_ORDER` complement of `litArcPositions`), with new cases in
`shieldArcs.test.ts` covering both ends and the "lit + unlit = ARC_FILL_ORDER
with no overlap" property. `ShipIcon.tsx` now maps over `ARC_FILL_ORDER`
unconditionally, computing an unlit set from `unlitArcPositions(shields)` and
giving every arc `ship-icon__arc` plus `ship-icon__arc--lit` or
`--unlit`, dropping the inline `stroke="currentColor"` so CSS controls it.
`ShipIcon.css` adds a `--unlit-arc-colour: #5a6480` custom property on
`.ship-icon` (starting value per D6) and the two modifier-class stroke
rules; lit arcs still resolve to `currentColor`, i.e. the side colour.
Updated `ShipIcon.test.tsx`'s fill-order test and its `alongside
squareLabel` block to assert four arcs always render, with exactly the
first `shields` of them carrying the lit class in `EXPECTED_ARC_ORDER`
order and the rest unlit; the quadrant, silhouette, aria-hidden and axe
tests were untouched, as expected. One deviation beyond the step's own
file list: `src/board/Board.test.tsx`'s pre-existing "draws exactly as
many shield arcs as the starting fleet carries" test asserted a bare count
of `[data-arc-position]` elements equal to the fleet's total shields, which
is now always `56` (14 ships × 4 arcs) regardless of shields carried;
renamed it to "...as many lit shield arcs as the starting fleet carries,
four arcs per ship" and split the assertion into a fixed total (`14 * 4`)
and a `.ship-icon__arc--lit` count equal to the fleet's shield total. This
file was not named in the step's own file list but broke as a direct,
foreseeable consequence of always rendering four arcs; the fix only
changes the assertion's selector, not its intent. `npm run typecheck`,
`npm run lint`, `npm run format:check`, `npm test` (655 tests, 40 files)
and `npm run build` all pass. The grey's exact shade is a starting value
per D6, to be judged by eye at Step 9.

A ship draws all four shield arcs: the ones it has in the ship's own colour, the
ones it does not in grey, so the ring shows how much shielding is missing as
well as how much is present.

**`src/board/shieldArcs.ts`** — alongside `litArcPositions`, add the
complementary function returning the positions a ship at that shield count does
**not** have, in the same `ARC_FILL_ORDER` order (D8). Keep it a pure function
of the shield count, with no knowledge of colour or of the component. Add its
cases to `src/board/shieldArcs.test.ts`, including the two ends (a 0-shield ship
has all four unlit, a 4-shield ship has none) and the property that lit and
unlit together are exactly `ARC_FILL_ORDER`, with no overlap.

**`src/board/ShipIcon.tsx`** — render all four arcs, in `ARC_FILL_ORDER` order,
each keeping its existing `data-arc-position` attribute and its existing
geometry (the arc path maths, `RING_RADIUS`, `RING_STROKE_WIDTH`,
`ARC_GAP_DEGREES` and the quadrant table are unchanged). Each arc also carries a
modifier class marking it lit or unlit — `ship-icon__arc` plus
`ship-icon__arc--lit` / `ship-icon__arc--unlit` — and takes its stroke from CSS
rather than from the `currentColor` literal the lit arcs use today, so the two
kinds can differ. The hull is untouched. The SVG stays `aria-hidden` with no
`<title>`/`<desc>`: the shield count is spoken by the square's accessible name,
which is unchanged, and a grey arc adds no information a screen reader needs.

**`src/board/ShipIcon.css`** — lit arcs take `currentColor` (the side colour
already set by `.ship-icon--green` / `--red`); unlit arcs take a grey held in a
custom property in this file. Starting value: a mid grey around `#5a6480` (D6) —
it must stay visible against both the ordinary square fill
(`--color-space-raised`) and a bay's fill (`--bay-fill`), while never being
mistaken for a lit arc of either side. The whole-icon opacity rules in
`BoardSquare.css` (the dampened ship and the owes-action blink) apply to the
`.ship-icon` element and so continue to cover both kinds of arc without change.

**Tests** (`src/board/ShipIcon.test.tsx`) — the file currently asserts that a
ship renders exactly `shields` elements matching `[data-arc-position]`, in two
places (the top-level fill-order test and the `alongside squareLabel` block).
Both are now wrong in the same way: there are always four. Update them to assert
that four arcs are drawn in fill order, that exactly the first `shields` of them
carry the lit modifier class, and that the rest carry the unlit one — keeping
the existing `EXPECTED_ARC_ORDER` table, which is deliberately hand-written
rather than derived from `shieldArcs.ts`. The quadrant test, the two-silhouettes
test, the aria-hidden test and the axe test all stay; the quadrant test may need
its selector narrowed to the lit arcs, or not, depending on how it queries.

Depends on: Step 1 (the fixture shows 0-, 1-, 2-, 3- and 4-shield ships at once).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` all pass, with
`src/board/shieldArcs.test.ts` covering the new function at every shield count
and `src/board/ShipIcon.test.tsx` asserting four arcs with the right lit/unlit
split at every shield count for both sides. The colours are judged by eye at
Step 9.

---

### Step 6 — One containing box

Status: committed

Notes: Moved `<h1 className="app__title">` and `<Hud />` inside
`.app__cabinet`, above `.app__board`, in `src/App.tsx`. In `App.css`,
`.app__cabinet` is now a column (`flex-direction: column; align-items:
center`) holding the title, the HUD and the board area, keeping its border,
radius, background, box-shadow, `flex: 1; min-height: 0; width: 100%` and
its responsive padding; `position: relative` stays, since `GameOverPanel`
still positions itself absolutely against it until Step 8. `.app__board`'s
rules are unchanged; only its doc comment was reworded to say the resolved
height now comes from the cabinet once the title and HUD above have taken
their share. `Hud.css`'s `.hud` dropped its `border` and `background-color`
and the padding that inset content from that panel's own edge, keeping its
column layout, `gap` and the `margin: 0 0 1.5rem` that separates it from the
board below (the title's own `margin-bottom` already separates it from the
HUD above). `npm run typecheck`, `npm run lint`, `npm run format:check`,
`npm test` (655 tests, 40 files, no test file touched) and `npm run build`
all pass. No deviation from the step as written; the look itself is for
Step 9's manual gate.

`.app__cabinet` grows to hold everything — the title, the HUD strip and the
board — instead of the board alone, and the HUD loses its own separately
coloured panel now that it sits inside the same box.

**`src/App.tsx`** — move the `<h1 className="app__title">` and the `<Hud />`
inside `.app__cabinet`, above `.app__board`, so the cabinet's children are the
title, the HUD and the board area (plus the game-over panel, whose wiring is
unchanged in this step). `<main className="app">` keeps its role as the page
background and outer padding.

**`src/App.css`**:

- `.app__cabinet` becomes a column: title, HUD, then the board area, centred
  horizontally. It keeps its border, radius, raised background, inset/outer
  shadows and responsive padding — that padding is the bezel, and it is now the
  bezel around the whole console rather than around the screen alone. It keeps
  `flex: 1; min-height: 0; width: 100%` so the board area below the title and
  HUD still resolves to a real height.
- `.app__board` keeps `container-type: size` and its `flex: 1; min-height: 0`,
  which is what lets `.board-frame` measure `--square` against the room it
  actually has. This is the fragile part of the step: if the board area stops
  having a resolved height, `cqmin` collapses and the board falls back to its
  40px floor. Check the board still grows to fill a tall window.
- `.app` keeps the marquee radial-gradient background and its padding, and stays
  a centred column.
- The comment on `.app__cabinet` describes it as the bezel around
  `.app__board` and explains the `position: relative` anchoring for the
  game-over panel. Update it to describe the box as it now is. Leave
  `position: relative` in place for this step — the panel still relies on it
  until Step 8 changes how the panel is rendered.

**`src/hud/Hud.css`** — `.hud` drops its own surface: the `border` and the
`background-color` go, since the cabinet behind it now supplies both. Keep its
column layout, its gap and enough vertical space to separate it from the title
above and the board below; the horizontal padding that only existed to inset
content from its own panel edge can go with the panel.

No component's props, markup semantics or accessible names change in this step.

Depends on: Step 1 (fixture only, for a look). Independent of Steps 2–5.

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` all pass, with **no test
changed** — `src/App.test.tsx`'s heading, HUD and axe assertions are all about
structure and accessible text, none of which this step touches, so an edit
there means something has been changed that should not have been. The look is
judged by eye at Step 9.

---

### Step 7 — The score count-up moves up to `App`

Status: committed

Notes: Added `src/hud/useDisplayedEnergy.ts`, wrapping two fixed `useCountUp`
calls (one per side) and returning `{ displayed, settled }`, where `settled`
is `green === energy.green && red === energy.red`. `ScoreDisplay.tsx` no
longer calls `useCountUp` and instead takes `displayedTotal: number` as a
prop, unchanged otherwise (the hidden sentence still reads `state.energy[side]`
via `scoreSentence`). `Hud.tsx` takes a new `displayedEnergy: EnergyTotals`
prop and passes each side's value to its `ScoreDisplay`. `App.tsx` calls
`useDisplayedEnergy(session.state.energy)` and passes `displayed` to `<Hud />`;
`settled` is destructured out but left unused, per the step's own guidance not
to invent a use for it yet. Added `src/hud/useDisplayedEnergy.test.tsx`
(`renderHook`) covering the three cases named in the step: a fresh render is
settled at the targets; a rising target leaves `settled: false` with the old
value on the very next render and settles on the new target within a 2000ms
`waitFor` (well beyond the 600ms roll); a falling target snaps instantly and
stays settled. Updated `ScoreDisplay.test.tsx` to pass `displayedTotal` on
every render and sharpened the two "counts up" cases into "draws the digits
from the displayed total, not the state's true total" and "carries the
state's true total in the hidden sentence even while the displayed total is
still rolling". Updated `Hud.test.tsx` to pass `displayedEnergy={state.energy}`
on every render, with no assertions changed. Updated `GameOverPanel.test.tsx`'s
`Harness` to call `useDisplayedEnergy` and pass its `displayed` totals to
`<Hud />`, mirroring `App.tsx`; no assertion in that file changed. `npm run
typecheck`, `npm run lint`, `npm run format:check` (after one `prettier
--write` pass on the two files it flagged), `npm test` (41 files, 658 tests)
and `npm run build` all pass. No deviation from the step as written.

Scaffolding for Step 8, with **no visible change**: lift the score count-up out
of `ScoreDisplay` so that the app has one place that knows both displayed totals
and whether they have finished rolling (D9).

**New: `src/hud/useDisplayedEnergy.ts`** — a hook taking the game's
`EnergyTotals` (from `src/rules/gameState.ts`; it is a readonly record of side
to number) and returning the totals to draw plus a `settled` flag saying whether
both sides have reached their targets. It wraps the existing `useCountUp` (one
call per side — two fixed calls, never a loop, so the hook rules hold) and adds
nothing to the arithmetic: `useCountUp` and `countUp.ts` are unchanged, and
`countUp.ts` stays the only place the duration and the easing live. `settled` is
plainly "each displayed value equals its target", which is true on a fresh
render, true again once a roll finishes, and true immediately under
`prefers-reduced-motion` (where `useCountUp` jumps) and on a falling target
(where it snaps).

**`src/hud/ScoreDisplay.tsx`** — stops calling `useCountUp` and takes the number
to draw as a prop instead. Everything else about it is unchanged, and in
particular its visually hidden sentence keeps coming from `scoreSentence(state,
side)` with the **true** total, not the displayed one.

**`src/hud/Hud.tsx`** — takes the displayed totals and passes each side's to its
`ScoreDisplay`. It gains no state and no animation of its own.

**`src/App.tsx`** — calls `useDisplayedEnergy(session.state.energy)` and passes
the displayed totals to `<Hud />`. The `settled` flag is **not used yet**; Step
8 is where it starts gating anything. If leaving it unread is awkward, take it
in Step 8 rather than inventing a use for it here.

**Tests**:

- New `src/hud/useDisplayedEnergy.test.tsx` (jsdom, `renderHook`): a fresh
  render returns the targets and `settled: true`; raising one side's target
  leaves `settled` false with the old value still displayed on the very next
  render, and then — awaited with a generous timeout, since a roll takes 600ms —
  settles exactly on the new target with `settled: true`; a target below what is
  displayed snaps instantly and stays settled.
- `src/hud/ScoreDisplay.test.tsx` — every render now passes the displayed total.
  Its two "counts up" cases become a sharper pair: the digits show the value
  passed in, while the hidden sentence shows the state's true total, which is
  the invariant that matters now that they can differ.
- `src/hud/Hud.test.tsx` — pass the displayed totals; assertions unchanged.
- `src/hud/GameOverPanel.test.tsx` — its `Harness` renders `<Hud />` and is
  described in a comment as a stand-in for `App.tsx`'s wiring, so it must mirror
  this change: call the hook and pass the totals down. No assertion in that file
  changes in this step.

Depends on: Step 6 (touches `App.tsx`'s render tree; sequencing them avoids two
steps editing the same lines).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` all pass, with the new
`useDisplayedEnergy` test covering the three cases above. The suite proves the
lift is behaviour-neutral: no assertion about what is on screen changes, only
where the number comes from.

---

### Step 8 — The full-box game-over screen

Status: committed

Notes: `src/App.tsx` now renders, inside `.app__cabinet`, either the title +
`Hud` + board or the `GameOverPanel`, gated on
`isGameOver(session.state) && settled` (destructuring `settled` out of
`useDisplayedEnergy`, resolving Step 7's unused binding as that step
anticipated). `src/hud/GameOverPanel.css` dropped `position: absolute`,
`inset: 0` and `z-index`, and `.game-over-panel` now takes `flex: 1;
min-height: 0; width: 100%` so it fills the cabinet in the game's place;
its background moved from `--color-space` to `--color-space-raised` (the
cabinet's own surface), per the story's "the box is the screen" option.
`src/App.css` dropped `.app__cabinet`'s `position: relative` and reworded
its comment paragraph accordingly; confirmed nothing else in `App.css` or
`EnergyOverlay.css` depended on it (`.energy-overlay` establishes its own
containing block). `src/hud/GameOverPanel.tsx` is unchanged. In
`GameOverPanel.test.tsx`, the `Harness` now mirrors `App.tsx`'s either/or
render exactly (including reading `settled`); the original combined case
was split into "is absent while the game is in progress, and appears once
the last action ends it" (keeping the absent/present and hidden
result-sentence assertions, using the pre-existing unscored `nearEndState`)
and a new "holds the panel back while the last turn's score rolls…" case
built on a new `scoringNearEndState` (red-1 parked on a charged H8, red-2
making the ending move elsewhere), which asserts the dialog is absent and
the grid/live-region are present immediately after the move, then awaits
the dialog and asserts the settled total (7), the grid gone, and one HUD
hidden sentence gone. `npm run typecheck`, `npm run lint`, `npm run
format:check` (after one `prettier --write` pass on the test file), `npm
test` (41 files, 659 tests) and `npm run build` all pass. No deviation from
the step as written.

When the game ends, the game-over screen takes over the whole cabinet box, and
it waits for the last turn's count-up to settle first (D10).

**`src/App.tsx`** — inside `.app__cabinet`, render **either** the game (title,
HUD, board) **or** the `GameOverPanel`. The panel takes over when the game is
over **and** the displayed totals have settled — that is, `isGameOver(state)`
and the `settled` flag from `useDisplayedEnergy` (Step 7). Until it settles, the
game stays on screen and the HUD's digits roll: this is what the story means by
"the panel waits for the count-up to settle, then shows the settled totals".
When the last turn scores nothing, `settled` is already true and the panel
appears at once, exactly as it does today. "Play again" is unchanged: a fresh
seed at the finished game's own length, which resets the totals to zero (a
falling target, so `useCountUp` snaps and nothing rolls backwards).

**`src/hud/GameOverPanel.tsx`** — no change to what it renders. It still shows
`GAME_OVER_HEADING`, both final totals from `state.energy`, the visually hidden
`resultSentence`, and the "Play again" button; it is still a labelled `dialog`
that focuses itself when it appears. Because `App` only mounts it once the roll
has settled, `state.energy` **is** the settled total, and the panel needs to
know nothing about the count-up.

**`src/hud/GameOverPanel.css`** — the panel is no longer an overlay: drop
`position: absolute`, `inset: 0` and `z-index`, and instead have it fill the
cabinet (stretch to the box's width and take the remaining height) while keeping
its centred column layout, its padding, its focus outline and its background. Its
background may now simply be the cabinet's own surface rather than
`--color-space`, if that reads better as "the box is the screen"; that is a
judgement for the gate.

**`src/App.css`** — `.app__cabinet`'s `position: relative` existed only to
anchor the absolutely positioned panel over the board and bezel; with nothing
behind the panel to cover, it and the paragraph of comment explaining it go.
Confirm nothing else in the file or in `EnergyOverlay.css` depends on it (the
energy overlay establishes its own containing block).

**Tests** (`src/hud/GameOverPanel.test.tsx`) — the direct-render tests of the
panel are unaffected. The `Harness` block must mirror `App`'s new wiring: it
already renders `Hud`, `Board` and the panel, so make it render either the
first two or the panel, on the same condition `App` uses.

- The existing "is absent while the game is in progress, appears once the last
  action ends it, and the live region announces the result" case ends a game in
  which nothing is scored, so the panel now appears in the same commit that
  unmounts the board — and with it the live region the test asserts on. Split
  the coverage rather than dropping it: this case keeps its "absent, then
  present" assertions and checks the panel's own hidden result sentence, and the
  live-region assertion moves to the new case below, where the board is still
  mounted while the roll runs.
- New case: a final action that **scores**. Build a one-round game at ply 2 with
  red to move, one action remaining; a charged site with a red ship standing on
  it that does not move, and a second red ship on an ordinary square that makes
  the ending move; some starting energy so the roll is visible. Assert that
  immediately after the move the dialog is **absent**, the board and HUD are
  still on screen, and the live region carries the game-over announcement; then
  await the dialog (with a timeout comfortably beyond the 600ms roll) and assert
  it shows the **settled** total — the pre-move total plus what the last turn
  paid — and that the grid and the HUD's hidden score sentences are gone.
- The "play again" case keeps working: it ends the same unscored game, so the
  panel is immediate there too.

`src/App.test.tsx` needs no change: its game is in progress throughout.

Depends on: Step 7 (the `settled` flag) and Step 6 (the cabinet the panel now
fills).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` all pass, with the two
`GameOverPanel.test.tsx` cases above proving both halves of the behaviour: an
unscored last turn shows the panel at once, and a scored one holds it back until
the roll settles and then shows the settled totals with the game gone from the
box. The look of the full-box screen is judged by eye at Step 9.

---

### Step 9 — Manual gate: the whole look

Status: pending

A manual gate. The pipeline stops here and hands the running app to the
repository owner. Nothing is implemented in this step.

Run `npm run dev` in the dev container and open the app. It starts from the
temporary review fixture (Step 1): a three-round game at round 3, green to play,
with all four site states, ships at every shield count, and one stranded green
ship.

What to look for, item by item:

1. **Site artwork** — a depleted site (D8) is a small grey circle with a grey
   border; the dormant sites are small white circles with white borders; the
   active site (E11) is a small orange-yellow circle with a matching border;
   the charged sites (H8, E5, K5, K11) are a glow spreading from an
   orange-yellow centre out to whitish-yellow, filling almost all of the square
   with no border. A ship standing on a bordered site still leaves its border
   visible. The orange-yellow is not mistakable for the amber focus ring — press
   Tab into the board and move around with the arrow keys to compare.
2. **No labels** — no letters below the board, no numbers beside it; the board
   is a plain 15 x 15, sized and centred sensibly in its box. Resize the window
   tall and narrow, then short and wide: the board should still grow to fill the
   room and stay centred, and the floating "+N" and the pulse that appear when
   energy is collected should land on the right squares.
3. **Stranded flash** — green-3 on D8 blinks noticeably faster than before (a
   quarter-second each way). It should read as urgent, not as a flicker.
4. **Shield arcs** — every ship shows a full ring of four arcs: red-2 on K11 (no
   shields) is all grey; green-2 on E5 (four shields) is all colour; the others
   are part-and-part, with the missing positions clearly grey and clearly not
   mistakable for the other side's colour.
5. **One box** — the title, the HUD strip and the board sit inside a single
   bezelled box; the HUD no longer has a panel of its own around it.
6. **Game over** — take green's action (it must free the stranded ship: try
   moving another ship first and see it refused), watch green's score roll 4 →
   7, then take red's action. Red's score rolls 1 → 4 **while the board and HUD
   are still on screen**, and only when it settles does the game-over screen
   take over the whole box, showing "Game over", Green 7, Red 4 and "Play
   again". The title, HUD and board are gone, not merely covered. Press "Play
   again": a fresh three-round game starts from the true opening position.

Also worth a glance while there: the board still refuses clicks once the game is
over (there is nothing to click, since the board is gone), and keyboard focus
lands on the game-over panel when it appears.

If the owner asks for tuning — a colour, a radius, a gradient falloff, a
spacing — the pipeline adds a refinement step after this one and re-gates it,
rather than folding the changes into this step's record.

Depends on: Steps 1–8 (everything being looked at).

Verification (manual): the owner works through the six items above and confirms
each, or reports what does not look right.

---

### Step 10 — Remove the temporary fixture

Status: pending

Delete `src/game/reviewFixture.ts` and restore `src/App.tsx`'s starting session
to `createSession(startingGameState(freshSeed()))` — the inverse of Step 1's
one-import, one-call change. Every game the app starts is again a fresh seed at
the ruleset's own hundred rounds.

Restore the three `src/App.test.tsx` assertions Step 1 moved to the fixture's
values, back to the true opening position: `"Green: 0 energy, no nodes held."`,
`"Red: 0 energy, no nodes held."` and `"1/100"`. This is expected, was planned
in Step 1, and is not a deviation.

Depends on: Step 9 (the gate the fixture existed for).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` all pass, with **no test
changed beyond the three `App.test.tsx` assertions named above** — that is the
proof nothing came to depend on the fixture. `grep -rn "reviewFixture" src`
returns nothing. Open the app once and confirm it starts from the true opening
position: both scores 0, the counter at 1/100, every ship in a bay with an
all-grey shield ring, five active sites and no charged or depleted ones.

---

### Step 11 — README check

Status: pending

Run the `/update-readme` command (`.claude/commands/update-readme.md`), which
reviews the branch diff and updates `README.md` where a player or a new reader
would need to know.

An update is **not** expected here: `README.md` describes how the game is
played and links to the rules, and this story changes none of that. Read it with
the diff in hand and confirm — the two places worth checking are the screenshot
or board description near the top (does it describe letters and numbers around
the board, or the old site artwork?) and the closing paragraph about the score
and the "Play again" button, which is still accurate. If nothing needs changing,
say so in the Notes; do not invent an edit.

Depends on: Steps 2–8 (the diff `/update-readme` reads) and Step 10 (so the diff
does not describe the temporary fixture).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` and `npm run build` all pass, and
`README.md` is either unchanged with a Notes line explaining why, or changed
with a Notes line saying what and why.
