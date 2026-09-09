# Implementation Plan — Story 00000050, Quick Guide

## What this story does

The start screen gains a **Quick Guide** button, sitting between the game
title and the Ships option group. Pressing it replaces the start screen with
a new, third screen: a scrollable **guide** made of five short sections, each
a paragraph of copy followed by one diagram, plus a **Back** button that
returns to the start screen with the three options (Ships, Rounds, Clock)
exactly as they were left and no game started.

The five diagrams are **rendered from the app's own components** — every
square in them is a real `BoardSquare` with hand-written props — so a future
restyle of ship or node art redraws the guide for free. Nothing in the guide
is interactive, nothing animates, and no game state is involved anywhere.

`story.md` in this folder is the owner's full statement of the story,
including the exact copy, the contents of each diagram, and the reasoning
behind the vocabulary exception. This plan does not repeat that argument; it
says how to build it, in what order, and records the decisions the plan
itself makes — code in this repository deliberately carries no design history
(`CONTRIBUTING.md`, "Comments"), so this document is the only place they are
written down.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say (`CLAUDE.md`, Vocabulary). The guide's copy is
  player-facing and says **turn**.
- **Node** is the word everywhere for a board position running `inactive` →
  `charged` → `depleted` → ends.
- **Move** means the movement action specifically, one ship changing squares.
  It is never a synonym for a ply or a turn.
- The guide's own copy says **points** and **fuel** where the rest of the app
  says **energy** and **power**. That is deliberate — see S1 below. Code
  identifiers, comments and class names in `src/` keep the app's words
  (`power`, `energy`); only the strings a player reads use the guide's.

## Settled decisions — do not reopen

These come from `story.md` and from the owner's discussion while writing it.
A step that finds one inconvenient should escalate, not re-decide.

- **S1. The guide's copy is final.** It is quoted in `story.md` and must be
  reproduced character for character, including the words **points** and
  **fuel** (rather than energy and power) and the US spelling **REFUELING**.
  Nothing outside the guide's own copy is renamed: not `rules.md`, not
  `README.md`, not the HUD, not the game-over panel. This is a decided
  exception, recorded so nobody "fixes" it later without asking.

  **Two corrections the owner has since made to the quoted copy**, and the
  only two — everything else stands exactly as `story.md` quotes it:

  - "as follow:" becomes **"as follows:"**
  - "If a players has" becomes **"If a player has"**

  `story.md`'s quoted copy is corrected to match as part of Step 1, so the
  story and the shipped text do not disagree.

- **S2. Combat is deliberately absent** from the guide — attacking, what a
  fight costs, where the two ships go, and the protection a node or a planet
  gives are all left for the player to meet in the game. Do not add a sixth
  section.
- **S3. Diagrams are rendered from the app's own components.** No static SVG
  or PNG assets, no screenshots. `src/board/BoardSquare.tsx` is the piece to
  build on. `src/board/Board.tsx` is **not** reusable (it is bound to a
  `Session`, is a full 15 × 15, and is an interactive `role="grid"`), and nor
  is `src/board/EnergyOverlay.tsx` (also takes a `Session`), so the "+3" in
  diagram 1 is the guide's own drawing, made to match the overlay's
  appearance.
- **S4. Every ship in every diagram is green**, whatever it is doing, so
  colour never reads as meaning something it does not. The guide never draws
  a red ship.
- **S5. No rules change.** The guide states what the ruleset already says, so
  `doc/ruleset/rules.md` keeps version **0.29**, `RULES_VERSION` in
  `src/rules/rulesVersion.ts` does not move, and there is **no**
  `doc/ruleset/changelog.md` entry. If a step believes the guide's copy
  contradicts `rules.md`, stop and escalate — do not edit either document.
- **S6. Navigation.** `src/useAppScreen.ts`'s `Screen` union gains a third
  value for the guide alongside `"start"` and `"game"`. The guide is
  reachable **only** from the start screen and returns **only** to the start
  screen. The three options stay where they already are, so opening and
  closing the guide leaves them untouched. No game is started, dispatched to
  or disturbed. There is no route to the guide from a game in progress and no
  Play button on the guide.
- **S7. No interactivity, no animation, no square names on screen.** The
  diagrams are pictures in a page: no clickable squares, no selection marks,
  no worked example the reader plays through, and nothing that moves — the
  arrows carry the before-and-after.
- **S8. Pre-release accessibility stance** (`CLAUDE.md`): this story does not
  spend work keeping accessibility intact, and **no plan step tests
  accessibility**. Where an existing automated test has a straightforward
  path to being updated, update it. Anything knowingly given up is recorded
  as a note in `doc/plan/00000021-accessibility-tech-debt/known-issues.md`
  (Step 5 writes this story's note).
- **S9. No review fixtures and no manual test scripts.** The owner drives
  manual testing himself, in a real browser. Step 8 is the single manual
  gate; nothing else in this plan builds a harness, a demo page or a script
  for it.
- **S10. No new dependencies.** Everything here is React, TypeScript and CSS
  already in the project (`CONTRIBUTING.md`, Dependencies).

## What already exists, and what the guide may lean on

The implementer does not have to go looking. This is the inventory as the
branch stands.

**`src/board/BoardSquare.tsx`** — a plain `<div className="board-square">`
holding, in this stacking order: a planet drawing, a node marker, a ship, the
node's countdown number, a selection mark, an already-acted bar and a
condition bar. It takes `isPlanet`, `squareName`, `planet`, `nodeState`,
`cyclePosition`, `priority`, `countdownNumber`, `occupant`, `hasActed`,
`condition` and `mark`. It has no session, no state and no interactivity, and
every SVG inside it is `aria-hidden`. Note that `squareName` is **required**
even though nothing draws it: `src/board/NodeMarker.tsx` builds a
document-global gradient id from it (see D6). The guide uses only
`isPlanet`, `squareName`, `planet`, `nodeState`, `cyclePosition`, `priority`,
`countdownNumber` and `occupant`; it never sets `mark`, `hasActed` or
`condition` (S7).

**`src/board/BoardSquare.css`** — `.board-square` is a single-cell CSS grid
at `width: 100%; height: 100%`, so it fills whatever grid track it is placed
in. The guide sizes its own tracks; it does not need `Board.css`.

**`src/ships/ShipDefs.tsx`** — the hidden ship sprite, mounted **once by
`src/App.tsx`** outside the screen switch, so a `<use>` from `ShipModel`
resolves on any screen. The guide needs to do nothing for ships.

**`src/board/PlanetDefs.tsx`** — the hidden planet sprite, mounted **inside
`Board`**, not by `App`. The guide's refuelling diagram draws a planet, so
the guide screen must mount `PlanetDefs` itself (D12). The guide screen and
the board are never on screen at the same time, so there is no risk of two
copies.

**`src/board/planetArt.ts`** — `PLANET_ART`, the twelve planet drawings, each
with the ids `Planet` needs. Indexable directly for a fixed choice.

**`src/rules/countdown.ts`** — `countdownNumber(state, pliesRemaining,
hasShip)` and `nodeCyclePosition(state, pliesRemaining, hasShip)`, the two
functions `Board` itself uses to turn a node's plies remaining into the
number it shows and the position of its artwork. The guide uses them the same
way (D7).

**`src/rules/movement.ts`** — `allShapesFrom(origin)` returns every one of
§6's twenty shapes from a square on an otherwise empty board, each with its
`destination` and its `cost`. The movement diagram's numbers are derived from
this (D8).

**`src/rules/nodeQueue.ts`** — `NodePriority` (1 | 2 | 3), the ring count an
inactive node draws.

**`src/rules/fleet.ts`** / **`src/rules/power.ts`** — `Side` (`"green"` |
`"red"`) and `PowerLevel` (0–6).

**`src/useAppScreen.ts`** — holds `screen`, the three options, `handlePlay`
(dispatches `new-game` and switches to the game screen) and
`handleReturnToStart` (switches to the start screen and changes nothing
else). `src/useAppScreen.test.tsx` covers it directly with `renderHook`.

**`src/App.tsx`** — renders `<ShipDefs />` and one `.app__cabinet`, whose
single child is the start screen, the game-over panel or the in-game screen.

**`src/start/StartScreen.tsx`** — title (`h1`), three `<fieldset>` option
groups, and the `Play` button (DOM text `Play`, drawn uppercase by
`text-transform` in `StartScreen.css`). Fully controlled; holds no state.

**Style tokens** live in `src/index.css` (`--color-space`,
`--color-space-raised`, `--color-text-bright`, `--color-text-dim`,
`--color-green`, `--font-arcade`, `--glow-text`, `--focus-ring`,
`--color-node-charged`). `src/hud/GameOverPanel.css`'s
`.game-over-panel__button` is the house's quiet-button treatment; the start
screen's `.start-screen__play` is the loud one.

**Test conventions** are in `CONTRIBUTING.md`, "Testing": jsdom tests open
with the `// @vitest-environment jsdom` docblock on line 1, import
`@testing-library/jest-dom/vitest`, and call `cleanup` in `afterEach`. Pure
modules are tested in the default node environment with no docblock. Existing
board tests assert artwork through `container.querySelector` on class names
(`.ship-model--green`, `.node-marker--charged`, `.node-countdown`), because
the SVGs are `aria-hidden`; the guide's tests follow the same idiom.

## Design reasoning and rejected alternatives

- **D1. A new `src/guide/` folder owns everything.** The guide is a screen of
  its own, like `src/start/`, with its own components and its own stylesheets
  imported by the components that use them. Rejected: putting the diagrams in
  `src/board/`, which would mix a page's illustrations into the module that
  owns the playable board and invite someone to reuse a diagram there.
- **D2. The copy lives in a plain module (`src/guide/guideCopy.ts`), not
  inline in JSX.** `CONTRIBUTING.md` prefers wording to sit in plain modules
  with plain tests, and the vocabulary exception (S1) needs exactly one place
  a reader can check. It also lets a pure test assert the exception holds —
  that the copy says "points" and "fuel" and never "energy" or "power" — so a
  well-meaning later edit that "corrects" the vocabulary fails the suite and
  has to be a deliberate act. Rejected: strings inline in `GuideScreen.tsx`,
  which scatters the exception across five paragraphs.
- **D3. Headings are stored uppercase, exactly as `story.md` quotes them.**
  The house style draws headings uppercase with CSS `text-transform`, but
  `text-transform` does not change the DOM text, so a test (and a screen
  reader) would read "Quick Guide" while the copy says "QUICK GUIDE". Storing
  them uppercase keeps the DOM text verbatim and makes the CSS transform a
  harmless no-op. Rejected: title-case strings plus `text-transform`, which
  quietly makes "verbatim" untrue.
- **D4. One generic diagram component plus five thin diagram components.**
  All five diagrams are the same object — a small fixed grid of squares, some
  arrows, and the occasional number or note — so one `GuideDiagram` owns the
  grid, the sizing token and the arrow/note drawing, and each of the five is
  a short component naming its own cells. Rejected: five bespoke components
  with five stylesheets (five places to fix a sizing bug), and rejected:
  generalising `Board` to serve both (it is session-bound and interactive;
  prising that apart is a large change for a page of pictures).
- **D5. The diagram grid has four kinds of cell content**, which is all five
  diagrams need: a `BoardSquare`; a number drawn **over** a square (the
  movement costs); a standalone note with no square under it (the "+3"); and
  an arrow. A cell may also be left empty, which is how the movement
  diagram's four corners are handled (D9).
- **D6. Diagram squares get synthetic, unique `squareName`s.**
  `NodeMarker` builds its radial-gradient id as `node-<squareName>-fill`, and
  SVG ids are document-global; the guide draws several nodes into one page at
  once. Names like `guide-scoring-1` keep every id unique and cannot be
  mistaken for board coordinates — which are never shown on the guide anyway
  (S7). Rejected: reusing real square names such as `H8`, which would read as
  a claim about where these things happen.
- **D7. Node countdowns are derived, not typed in.** Each node cell states
  the **plies remaining** it is drawn at, and the diagram asks
  `countdownNumber` and `nodeCyclePosition` (`src/rules/countdown.ts`) for
  the number and the artwork position, exactly as `Board` does. The number
  the reader sees and the gradient behind it therefore agree, and both track
  any future change to how a countdown is displayed. Rejected: passing
  `countdownNumber={3}` with a hand-picked `cyclePosition`, which is two
  numbers that can drift apart and away from the board.
- **D8. Movement costs are derived from the rules layer.** The movement
  diagram asks `allShapesFrom` (`src/rules/movement.ts`) for every shape from
  a **central** square (far enough from every edge that nothing is clipped),
  and places each entry's cost on the cell at that destination's offset. §6's
  table changed as recently as story 00000058; a diagram that transcribes
  0/1/2 by hand would go stale silently, and this one cannot. The cost
  pattern is symmetric in all eight directions, so which way the board's rows
  run does not matter to the picture. Rejected: hard-coding the twenty
  numbers.
- **D9. The four corners of the movement diagram are left undrawn** — no
  square, no number, nothing. `story.md` allows either, and an empty cell
  makes the reachable region read as a **shape**, whereas an ordinary drawn
  square with no number invites the reading "free". Rejected: drawing them
  bare.
- **D10. The "+3" is the guide's own static drawing.** It copies
  `EnergyOverlay.css`'s look for a green settlement — `--color-green`,
  `--font-arcade`, bold, a `text-shadow` glow — without the float animation
  (S7) and without the absolute positioning, which only makes sense against a
  board-sized box. Rejected: rendering `EnergyOverlay`, which requires a
  `Session` and a fabricated last event, i.e. inventing game state to draw a
  picture.
- **D11. Arrows are inline SVG drawn by the guide**, in the dim text colour
  and sized to the diagram's square, rather than a text glyph (which depends
  on the font stack and sits on a text baseline) or an image asset (S3).
- **D12. The guide screen mounts `PlanetDefs` and picks a fixed planet.**
  `PlanetDefs` is currently mounted only inside `Board`, so without this the
  refuelling diagram's `<use>` would resolve to nothing. The drawing is a
  fixed entry of `PLANET_ART`, the same one in both frames of diagram 3 — it
  is one planet, before and after. It must be chosen deterministically:
  `Math.random` is banned (`CLAUDE.md`) and there is no seed on this screen.
- **D13. The fuel levels drawn are 5, 3 and 1 in diagram 1; 6 in diagram 2;
  4 then 6 in diagram 3; and one unchanged value in diagram 4.** A ship at
  **0** power draws no gauge marks at all and is indistinguishable from a
  ship drawn with no power level given (`ShipModel.tsx`), so the guide never
  draws one — "three different amounts of fuel" has to be visible as three
  different gauges. Diagram 4's ship keeps the same fuel in both frames
  because a node never touches a ship's power (rules.md §8.5), and showing it
  change would teach a rule that does not exist.
- **D14. A Back button at the top of the guide and a second at the bottom**
  (owner's decision at the plan gate). The guide is five sections of
  scrolling: a button at the top alone makes a reader who has read to the end
  scroll back up to leave, and one at the bottom alone is invisible until
  they have scrolled past everything. Both buttons carry the DOM text `Back`
  and call the same callback. The duplicate accessible name is the knowing
  cost, and is covered by the pre-release accessibility stance rather than
  worked around here. Rejected: top-only, and bottom-only.
- **D15. The guide scrolls inside the cabinet.** Like `.start-screen` and
  `.game-over-panel`, the guide is the cabinet's single `flex: 1` child; it
  adds `min-height: 0` and `overflow-y: auto` so the frame stays put and the
  content scrolls within it. Rejected: letting `.app__cabinet` grow and the
  whole page scroll, which would drag the arcade frame off the top of the
  window.
- **D16. The Quick Guide button is quieter than PLAY.** PLAY must stay the
  loudest thing on the start screen, so the guide button takes the outlined
  treatment (`.game-over-panel__button`'s idiom, expressed in
  `StartScreen.css` as its own class). Its DOM text is `Quick Guide`, drawn
  uppercase by CSS exactly as `Play` is.
- **D17. Leaving the guide reuses `handleReturnToStart`.** That action
  already means "show the start screen and change nothing else", which is
  precisely what Back does, and it is already covered by
  `useAppScreen.test.tsx`. Only the open action (`handleOpenGuide`) is new.
  Rejected: a second, identical `handleCloseGuide`, which would be a synonym
  a future reader has to check for a difference that is not there.
- **D18. The diagrams are decorative for assistive technology.** Each
  diagram is marked `aria-hidden`, as every drawing inside `BoardSquare`
  already is; the paragraph above it carries the meaning in words. This is a
  knowing loss — the "+3", the movement costs and the countdown numbers are
  not readable by a screen reader — and it is recorded in the accessibility
  ledger (S8) rather than solved here. Rejected: inventing `role="img"`
  labels, which would be new player-facing copy the owner did not write.
- **D19. One sizing token, `--guide-square`, drives every diagram.** It is a
  `clamp()` keyed to the viewport so the diagrams read on a phone and on a
  desktop window alike. The binding constraint is the node-selection diagram:
  seven tracks (four nodes and three arrows) must fit inside a 360 px-wide
  window with the cabinet's padding, which puts the clamp's floor at roughly
  2.25 rem. Rejected: `Board.css`'s container-query `--square`, which is
  measured against `.app__play`'s size container and does not exist here.

## Steps

### Step 1 — The guide's copy, in one module

Status: pending

Create `src/guide/guideCopy.ts`: the guide's page title and its five
sections' text, exactly as quoted in `story.md`, and nothing else (D2). No
JSX, no React import — this is a plain data module tested in the default node
environment.

- The page title is `QUICK GUIDE` (uppercase, D3).
- Section 1 has **no heading of its own** — the page title serves it. Its
  paragraph is: "The object of the game is to have the most points at the end
  of the game. At the end of each turn, gain one point for each spaceship you
  have in a charged node."
- The remaining four sections each have an uppercase heading and a paragraph:
  `MOVEMENT`, `REFUELING`, `NODE LIFECYCLE`, `NEW CHARGED NODE SELECTION`,
  with the paragraphs quoted in `story.md` under "The guide's text".
- Reproduce the copy from `story.md` exactly (S1), keeping **points**,
  **fuel** and the US spelling of `REFUELING`, with S1's two owner
  corrections applied: "as follows:" and "If a player has". Change nothing
  else — do not otherwise tidy the grammar or the wording.
- Apply the same two corrections to the quoted copy in
  `doc/plan/00000050-how-to-play-instructions/story.md`, so the story records
  what was actually shipped.
- Shape the module so `GuideScreen` can render the sections in order and pair
  each with its diagram — an ordered export for the four headed sections plus
  a separately named intro paragraph, or five named constants; the choice is
  the implementer's, as long as the order the guide reads in is expressed in
  the module and not re-stated in the component.
- Write a short module header comment saying what the module is and naming
  the vocabulary exception as deliberate, pointing at `story.md` in this
  folder for the reasoning (`CONTRIBUTING.md`, "Comments": what, not
  history).

Add `src/guide/guideCopy.test.ts` (node environment, no jsdom docblock):

- The five paragraphs and four headings match the copy above, character for
  character.
- The vocabulary exception holds: taken together, the copy contains "points"
  and "fuel" and contains neither "energy" nor "power" (case-insensitive).
  This is the test that stops a later "fix" being silent (D2).
- The sections are in the story's order.

Depends on: nothing.

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all green, with the new
`src/guide/guideCopy.test.ts` cases passing. Then read the five paragraphs in
the module side by side with `story.md`'s block quote and confirm they are
identical, slips included.

### Step 2 — `GuideDiagram`: the grid every diagram is drawn on

Status: pending

Create `src/guide/GuideDiagram.tsx` and `src/guide/GuideDiagram.css`: the one
component all five diagrams are built from (D4). It is presentational, takes
no session, has no state and no event handlers (S7).

What it must be able to draw, placed on a small fixed grid of a caller-given
number of columns:

- **A square** — a `BoardSquare` from `src/board/BoardSquare.tsx` with props
  the caller supplies.
- **A number over a square** — a large numeral drawn on top of a square, in
  the guide's own bright text colour (this is the movement diagram's cost;
  it must **not** reuse `countdownNumber`, whose colour is tied to node state
  and would be black-on-dark here).
- **A standalone note** — text with no square under it, in the settlement
  look described in D10 (this is diagram 1's "+3").
- **An arrow** — a right-pointing arrow drawn as inline SVG in the dim text
  colour, filling its cell the way a square fills its own (D11).
- **Nothing** — a cell may be left empty (D9).

Design points to honour:

- Sizing lives here, in one token (`--guide-square`, D19), used for both the
  column tracks and the row height. Give it a `clamp()` whose floor keeps
  seven tracks inside a 360 px-wide window and whose ceiling keeps a diagram
  comfortably smaller than the board on a desktop window. The exact numbers
  are the implementer's to choose and the owner's to judge in Step 8.
- The diagram's outer element is `aria-hidden` (D18) and carries no role.
- Every square the caller gives must receive a `squareName`; the component
  does not invent one (D6).
- Nothing here knows what the five diagrams contain — that is Step 4.

Add `src/guide/GuideDiagram.test.tsx` (jsdom, per `CONTRIBUTING.md`'s
recipe), driving the component with a small made-up cell list rather than any
of the real five:

- A square cell renders a `.board-square`, and its props reach it (e.g. a
  charged node cell renders `.node-marker--charged`).
- A cost number renders its numeral and is not a `.node-countdown`.
- A note renders its text with no `.board-square` under it.
- An arrow cell renders the arrow drawing.
- An empty cell renders no square.
- The diagram's outer element is `aria-hidden`.

Depends on: nothing in this story (it uses only `BoardSquare`, which already
exists). Step 4 builds the five diagrams on it.

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all green, including the new
`GuideDiagram.test.tsx` cases.

### Step 3 — Derive the movement diagram's costs from the rules

Status: pending

Create a small pure module in `src/guide/` (for example
`movementCosts.ts`) that answers the one question the movement diagram asks:
for a ship on the centre of a 5 × 5 patch, which of the twenty-four
surrounding cells can it reach in one move, and what does each cost (D8)?

- Ask `allShapesFrom` (`src/rules/movement.ts`) for the shapes from a
  **central** board square — one at least two files and two ranks from every
  edge, so nothing is clipped — and convert each entry's destination into an
  offset from that origin (column index difference and row difference).
- Return one entry per reachable offset carrying its cost. If two shapes ever
  reached the same offset, keep the cheaper; today they cannot, but the
  diagram must not depend on that.
- The module knows nothing about grids, CSS or React — it is offsets and
  costs, tested in the node environment.

Add its test (node environment, no jsdom docblock):

- Exactly twenty offsets are returned.
- The four orthogonal neighbours cost 0, the four diagonal neighbours cost 1,
  and the twelve two-step squares — four straight and eight L-shaped — cost 2.
- The four corner offsets (±2, ±2) are **absent**, and so is the centre
  itself.
- The result does not change with the origin chosen, as long as it is
  central: assert the same twenty offsets from a second central square.

Depends on: nothing. Step 4 consumes it.

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all green, with the new cases passing. The
counts (4 × 0, 4 × 1, 12 × 2, corners absent) are the check that this
matches `rules.md` §6.

### Step 4 — The five diagrams

Status: pending

Create the five diagram components in `src/guide/` (one file exporting all
five is fine; name each after its section). Each is a thin component handing
`GuideDiagram` a fixed list of cells. No state, no props that vary, no
randomness.

Rules that apply to all five: every ship is **green** (S4); every ship uses
`occupant` on a `BoardSquare`; every node square uses `nodeState` plus, where
a countdown shows, a **plies-remaining** figure passed through
`countdownNumber` and `nodeCyclePosition` (D7); every square gets a unique
synthetic `squareName` (D6); no square carries `mark`, `hasActed` or
`condition` (S7).

1. **Scoring** — a single row of four cells: three charged nodes, each with a
   green ship on it, showing countdowns **3**, **1** and **2**, with the
   three ships at **three different fuel levels** — 5, 3 and 1 (D13) — then a
   note cell reading **+3** in the settlement look (D10). Choose each node's
   plies-remaining so that `countdownNumber` yields 3, 1 and 2 respectively
   (an even number of plies, twice the number shown, does this).
2. **Movement** — a 5 × 5 grid. The centre cell holds a green ship at full
   fuel (**6**) on a plain empty square, with no number. Every other cell is
   filled from Step 3's module: a plain empty square with the cost drawn over
   it. The four corner cells are left empty (D9).
3. **Refuelling** — three cells: a planet square with a green ship at **4**
   fuel; an arrow; the same planet square with the same green ship at **6**
   fuel. Both frames use the same fixed `PLANET_ART` entry, passed as both
   `isPlanet` and `planet` (D12).
4. **Node lifecycle** — three cells: a **charged** node with a green ship on
   it showing **1**; an arrow; the same square as a **depleted** node with
   the same ship still on it, showing its trapped count of **5**. Both
   numbers come from plies-remaining through `countdownNumber` (a trap's
   number is `floor(plies / 2)`, so eleven plies reads 5; a charged node's is
   `ceil(plies / 2)`, so two plies reads 1). The ship's fuel is the same in
   both frames (D13).
5. **Node selection** — seven cells: four **inactive** nodes with priorities
   **3**, **1**, **2**, **3**, separated by three arrows — one indicator
   through a full rotation. `NodeMarker` draws one ring per priority, so this
   reads three rings → one → two → three.

Add a test file for the diagrams (jsdom). Per diagram, assert what a reader
is promised:

- Scoring: three `.node-marker--charged`, countdown texts `3`, `1`, `2` in
  that order, three `.ship-model--green` whose lit gauge-slot counts differ
  (`ShipModel` marks lit slots with `data-gauge-lit`), and the text `+3`.
- Movement: twenty-one squares drawn (twenty plus the centre), the centre
  holding a green ship with six lit gauge slots and no number; the numbers
  present are four `0`s, four `1`s and twelve `2`s; the four corner cells
  hold no square.
- Refuelling: two planet squares (`.board-square--planet`), each with a green
  ship, the first with four lit gauge slots and the second with six, and one
  arrow between them.
- Node lifecycle: a `.node-marker--charged` whose countdown reads `1` and a
  `.node-marker--depleted` whose countdown reads `5`, a green ship in both,
  and one arrow.
- Node selection: four `.node-marker--inactive` drawing 3, 1, 2 and 3 rings
  in that order (count the `<circle>` elements), and three arrows.
- Across all five diagrams: **no** `.ship-model--red` anywhere (S4).

Depends on: Step 2 (the grid component) and Step 3 (the movement costs).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all green, with the new diagram cases passing.

### Step 5 — The guide screen

Status: pending

Create `src/guide/GuideScreen.tsx` and `src/guide/GuideScreen.css`: the page
itself, assembled from Step 1's copy and Step 4's diagrams. It takes one prop
— a callback for the Back button — and nothing else. It holds no state, reads
no session and dispatches nothing (S6).

Structure, top to bottom:

- A **Back** button (DOM text `Back`), at the top of the page, styled on
  `.game-over-panel__button`'s quiet idiom but as the guide's own class in
  `GuideScreen.css` (a component's stylesheet owns its own classes — see the
  note at the top of `StartScreen.css`). A **second Back button** closes the
  page after the last diagram (D14), identical in text, class and callback.
- An `h1` carrying the page title `QUICK GUIDE`.
- Section 1: its paragraph, then the scoring diagram.
- Four sections, each an `h2` with the section heading, then the paragraph,
  then the diagram: movement, refuelling, node lifecycle, node selection.
- `PlanetDefs`, mounted once so the refuelling diagram's planet resolves
  (D12). It draws nothing and is hidden by its own stylesheet.

Styling:

- Follow the start screen's look: the arcade font and letter-spacing for
  headings, `--color-text-bright` / `--color-text-dim` for text, headings
  drawn uppercase (a no-op over the already-uppercase copy, D3).
- The guide is the cabinet's single `flex: 1` child with `min-height: 0` and
  `overflow-y: auto`, so it scrolls inside the frame (D15).
- Paragraphs get a comfortable reading measure (a `max-width` in `ch` or
  `rem`) and stay centred in the cabinet; each diagram sits under its
  paragraph with room around it.
- It must read at the window sizes story 00000039's layout covers, in both
  orientations. jsdom cannot check any of this — Step 8 is where it is
  judged.

Add `src/guide/GuideScreen.test.tsx` (jsdom):

- The `h1` is `QUICK GUIDE`, and the four `h2`s appear in the story's order.
- All five paragraphs render, taken from the copy module rather than
  retyped in the test.
- Five diagrams render (count the diagram root elements), one under each
  section.
- **Two** Back buttons render, one before the `QUICK GUIDE` heading and one
  after the last diagram (D14), and **each** calls the callback exactly once
  when clicked, with `userEvent`.
- Nothing on the page is a `grid` role, a `gridcell`, or a `radio` — the
  guide is not the board and not the start screen (S7).

Finally, record this story's knowingly accepted accessibility loss (S8, D18)
in `doc/plan/00000021-accessibility-tech-debt/known-issues.md`: append a
`## From story 50 — the quick guide's diagrams are decorative` section in the
house style of the entries already there (what is lost, what mitigates it,
and a `Where:` line naming `src/guide/`). The mitigation is that every
diagram's meaning is stated in the paragraph above it; what is lost is the
"+3", the movement costs and the countdown numbers as readable content.

Depends on: Steps 1 and 4 (copy and diagrams).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all green, with the new `GuideScreen.test.tsx`
cases passing. Then confirm the new known-issues section is present and reads
in the file's existing style.

### Step 6 — A third screen in `useAppScreen`

Status: pending

Widen `src/useAppScreen.ts`'s `Screen` union with a third value for the guide
(`"guide"`), and add one action that opens it (S6, D17).

- The new action switches the screen to the guide and does nothing else — no
  dispatch, no option changes, no seed.
- **Do not** add a close action: `handleReturnToStart` already means "show
  the start screen and change nothing else", which is exactly what Back does
  (D17). Say so in the hook's doc comment, so a reader does not go looking
  for the missing symmetry.
- Update the module's header and the `Screen` doc comment, which currently
  say the union is "the start screen, or a game in progress".

Extend `src/useAppScreen.test.tsx`:

- Opening the guide sets `screen` to the guide value, leaves the three
  options at whatever they were, and never calls `dispatch`.
- Options set before opening the guide survive it: set Ships, Rounds and
  Clock away from their defaults, open the guide, return to start, and assert
  all three are unchanged and `dispatch` was never called.
- The existing PLAY and return-to-start cases stay green untouched.

Depends on: nothing (it is independent of Steps 1–5, but is listed here
because Step 7 needs both it and the guide screen).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all green, with the new hook cases passing.

### Step 7 — The Quick Guide button and the app's screen switch

Status: pending

Wire the two ends together: the start screen gets its button, and `App`
learns to show the guide.

- `src/start/StartScreen.tsx` takes a new callback prop and renders a
  **Quick Guide** button (DOM text `Quick Guide`) **below the title and above
  the Ships fieldset**. Style it in `StartScreen.css` as its own class, in
  the quiet outlined treatment, deliberately less loud than `PLAY` (D16),
  with the same `:focus-visible` ring idiom the file already uses.
- `src/App.tsx` reads the new screen value and the new action from
  `useAppScreen`, passes the open action to `StartScreen`, and renders
  `GuideScreen` with `handleReturnToStart` as its Back callback when the
  screen is the guide. The start / game-over / in-game branches keep their
  current behaviour; the guide is a fourth branch of the same switch, inside
  the same `.app__cabinet`.
- Nothing else changes: no new state, no effect, no focus management beyond
  what the browser does by default.

Tests:

- `src/start/StartScreen.test.tsx`: the button exists with the accessible
  name `Quick Guide`, it calls its callback when clicked, and it changes none
  of the three options; it sits before the Ships group in DOM order.
- `src/App.test.tsx`: from a fresh app, change Ships and Rounds away from
  their defaults, press **Quick Guide**, and confirm the guide appears (its
  `QUICK GUIDE` heading is present, the option radios and PLAY are gone, and
  no `grid` is rendered); then press **Back** and confirm the start screen is
  back with Ships and Rounds still at the values chosen, and that no board
  ever appeared. The file already spies on `Board` via `vi.mock`, so a
  render-count assertion is available if it reads more clearly than the
  absence of a `grid` role.

Depends on: Step 5 (the guide screen exists) and Step 6 (the screen value and
the open action exist).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all green, with the new start-screen and app
cases passing.

### Step 8 — Owner reads the guide in a browser

Status: pending

Nothing is implemented in this step. The guide is a page of pictures, and
jsdom has no layout, so this is the gate where it is judged (S9 — no fixture,
no script; the owner drives it).

Start the app with `npm run dev` and confirm:

1. The start screen shows a **Quick Guide** button between the title and the
   Ships group, quieter than PLAY, and pressing it shows the guide.
2. Pressing **Back** returns to the start screen with Ships, Rounds and Clock
   still set exactly the way they were left, and no game started.
3. The five sections appear in order — the intro, MOVEMENT, REFUELING, NODE
   LIFECYCLE, NEW CHARGED NODE SELECTION — with the copy from `story.md` and
   a diagram under each.
4. Every ship drawn anywhere in the guide is **green**.
5. Diagram 1: three charged nodes reading **3**, **1**, **2**, three ships at
   three visibly different fuel levels, and a **+3** that looks like the
   settlement number the board draws.
6. Diagram 2: the centre ship is at full fuel; the four orthogonal neighbours
   read **0**, the four diagonals read **1**, the twelve reachable two-step
   squares read **2**, and the four corners are blank.
7. Diagram 3: four fuel becoming six on a planet, with the planet drawn.
   Diagram 4: a charged node at **1** becoming a depleted node at **5** with
   the ship still on it. Diagram 5: three rings → one → two → three.
8. The guide reads correctly on a phone-sized window and on a desktop one, in
   both portrait and landscape — the diagrams fit without horizontal
   scrolling, the text has a comfortable measure, and the cabinet frame stays
   put while the guide scrolls inside it.
9. Nothing on the guide is clickable except Back, and nothing animates.

Depends on: Steps 1–7 (the whole feature must be in place).

Verification (manual): The owner performs points 1–9 and confirms, or names
what to change. If something visual is knowingly given up here, record it as
a note in `doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather
than fixing it (`CLAUDE.md`, pre-release stance).

### Step 9 — `README.md`, the ruleset check, and the final sweep

Status: pending

- `README.md`'s status note describes what opening the app shows: the game's
  name, the three choices and a PLAY button. It is now missing the Quick
  Guide button, so update that paragraph in the README's non-technical,
  player-facing voice: the start screen also offers a quick guide, which
  explains scoring, movement, refuelling and how nodes come and go, and
  returns to the start screen with the choices untouched. Say that it is a
  first read, not a full rules reference, and do **not** describe the
  guide's diagrams square by square.
- Running `/update-readme` is the intended route: it reviews the branch diff
  and rewrites what the change has made stale. Check its output against the
  paragraph above rather than trusting it blind, and keep the file's existing
  hand-wrapped line width.
- Confirm the ruleset did not move (S5): `doc/ruleset/rules.md` still reads
  **Rules version: 0.29**, `RULES_VERSION` in `src/rules/rulesVersion.ts` is
  still `"0.29"`, and `doc/ruleset/changelog.md` has **no** new entry. If any
  of the three has changed on this branch, that is a mistake to undo, not to
  document.
- Sweep the branch diff for prose the change has left stale, and for the
  vocabulary exception leaking outside the guide: search `src/` for `fuel`
  and `points` and confirm every hit is inside `src/guide/` (the copy) or a
  pre-existing unrelated use. The guide's own copy is exempt (S1); nothing
  else may have adopted its words.
- Confirm the accessibility note written in Step 5 is present in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`, plus anything
  Step 8 added.

Depends on: Steps 1–8 (the README describes finished behaviour, and the sweep
needs the code final).

Verification (automated): Run `npm test`, `npm run typecheck`, `npm run lint`
and `npm run format:check` — all green. Then confirm: `README.md` mentions
the Quick Guide button; `git diff main --stat` shows no change to
`doc/ruleset/rules.md`, `doc/ruleset/changelog.md` or
`src/rules/rulesVersion.ts`; and the `fuel` / `points` search returns hits
only under `src/guide/`.
