# Implementation Plan — 00000004 Plies, actions and movement

This plan turns [`story.md`](./story.md) into an ordered sequence of steps. Each
step is implemented, verified and committed on its own, by an agent that has
read only `story.md`, this plan, and its own step. Everything a step needs is
stated here.

## What this story builds

The game starts moving. A **game state** appears — where every ship is, what
state every site is in, which side is to move, how many of its two actions are
left, and which ships have already moved this ply — and the board becomes a
picture of that state instead of a fixed constant built once at module load.

**Movement** (`rules.md` §6) is implemented in full: the range table by shield
count, straight lines only, the clear path, the board's edges, the ban on
ending a move on a dormant or depleted site, and §3.1's shield reset for a ship
that ends a move in a bay. **Plies and actions** (§5) follow: green first,
alternating, two actions a ply, each ship movable at most once per ply, and the
pass when no action is legal.

The player selects one of their ships and a destination, by keyboard or by
mouse. `AccessibleGrid` gains **cell activation** and a **live region** to make
that possible, without learning what a ship is.

**No rule changes.** `doc/ruleset/rules.md` stays at **0.3**, `RULES_VERSION`
stays `"0.3"`, and `doc/ruleset/changelog.md` gains no entry. There is no
rules step in this plan and none should be added. If implementing §6 turns up
a genuine ambiguity in the document, stop and raise it with the owner — that
is a rules change, not something to settle in code.

Nothing else from §7, §8 or §9 arrives: no combat, no site transitions, no
influence, no shield gain, no round counter, no game end, no game records, no
undo. See `story.md`'s "Out of scope" for the full list, which this plan does
not repeat.

Because the real starting position (fourteen ships in bays, all on 0 shields,
five active sites and twelve dormant) can demonstrate exactly one of the five
movement ranges and neither site restriction, the plan installs a **temporary
fixture** late (Step 14), runs every manual gate that needs it (Steps 15–17),
and **deletes it in Step 18**.

## Sources of truth

- **The rules.** [`doc/ruleset/rules.md`](../../ruleset/rules.md), **version
  0.3**. The sections implemented here are **§5** (turns and actions), **§6**
  (movement), **§3.1** (the bay's shield reset), **§7.2** (returning to a bay
  by choice, which is just an ordinary move onto a bay) and **§8.5**'s
  restriction as restated in §6 (no ending a move on a dormant or depleted
  site). Where the app and the document disagree, the document is right.
- **The conventions.** [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) — in
  particular:
  - the **DOM test recipe**: `// @vitest-environment jsdom` as the file's
    first line, a per-file `import "@testing-library/jest-dom/vitest";`,
    `cleanup` in an `afterEach`, and axe run with the `color-contrast` rule
    disabled (jsdom has no layout or canvas);
  - **keep logic out of components** — the reach calculation, the blocking
    check, the site restriction, the bay reset, the action count, the change of
    turn, the selection grammar and every piece of player-facing wording all
    belong in plain modules with plain unit tests;
  - **Comments**: comments say _what_ the code does. **No story numbers, no
    plan-step or plan-decision references, no design history in code.** All of
    that belongs in this document.
- **The previous plans**, for house style and for decisions this story builds
  on: [`00000001-draw-starting-board`](../00000001-draw-starting-board/implementation-plan.md)
  (the `src/rules/` / `src/board/` split, accessible-name wording, decorative
  `aria-hidden` artwork), [`00000003-set-site-positions`](../00000003-set-site-positions/implementation-plan.md)
  (site states and their artwork; the temporary-fixture pattern) and
  [`00000006-shields`](../00000006-shields/implementation-plan.md) (shield
  counts, arc artwork, container-sized squares).

## What is already in place

| Path                                | Holds                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/rules/rulesVersion.ts`         | `RULES_VERSION` (`"0.3"`), pinned to `rules.md` by `rulesVersion.test.ts`                                                       |
| `src/rules/board.ts`                | `BOARD_SIZE`, `COLUMN_LETTERS`, `ROW_NUMBERS`, `Square`, `squareAt`, `squareName`, `squareFromName`, `isOnBoard`, `ALL_SQUARES` |
| `src/rules/bays.ts`                 | `BAYS`, `isBay` (§3.1)                                                                                                          |
| `src/rules/shields.ts`              | `ShieldCount` (0–4), `MIN_SHIELDS`, `MAX_SHIELDS`, `isShieldCount` (§4.1)                                                       |
| `src/rules/fleet.ts`                | `Side`, `FleetEntry` (`square`, `side`, `shields`), `STARTING_FLEET` (fourteen ships, all on 0 shields), `startingShipAt`       |
| `src/rules/sites.ts`                | `SITES` (seventeen), `SiteState` (`dormant`/`active`/`charged`/`depleted`), `STARTING_ACTIVE_SITES`, `startingSiteState`        |
| `src/rules/siteSpacing.test.ts`     | the "no legal move touches two sites" sweep — **with its own private copy of §6's ranges**                                      |
| `src/board/boardView.ts`            | `gridPositionForSquare` / `squareForGridPosition` (board row 15 is grid row 0)                                                  |
| `src/board/squareLabel.ts`          | the accessible-name wording, built from a `SquareLabelDescriptor`                                                               |
| `src/board/Board.tsx` / `.css`      | the board; builds `BOARD_ROWS` **once at module load** from `isBay`, `startingSiteState` and `startingShipAt`                   |
| `src/board/ShipIcon.tsx` / `.css`   | the two ship silhouettes plus the shield arc ring, decorative and `aria-hidden`                                                 |
| `src/board/SiteMarker.tsx` / `.css` | the four site appearances, decorative and `aria-hidden`                                                                         |
| `src/board/shieldArcs.ts`           | shield count → which arcs are lit                                                                                               |
| `src/board/grid/AccessibleGrid.tsx` | the piece-agnostic WAI-ARIA grid: roles, roving tabindex, arrow keys. **No cell activation. No live region.**                   |
| `src/board/grid/gridNavigation.ts`  | `nextFocusPosition`, `firstFocusablePosition`                                                                                   |
| `src/App.tsx` / `App.css`           | the shell: a title above `.app__board`, which is a `container-type: size` box the board measures itself against                 |
| `src/index.css`                     | the palette, plus the standing note that colour is never the only cue                                                           |

## Where the code goes

| Path                                   | Change                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/rules/fleet.ts`                   | `ShipId`; `FleetEntry` gains `id`; `startingShipAt` is deleted in Step 10           |
| `src/rules/movement.ts`                | **new** — §6: the reach table, then legality (occupancy, site restriction, reasons) |
| `src/rules/gameState.ts`               | **new** — `Ship`, `GameState`, `startingGameState`, the ship-by-square index        |
| `src/rules/ply.ts`                     | **new** — §5: applying a move, the action count, the change of ply, the pass guard  |
| `src/rules/siteSpacing.test.ts`        | stops carrying its own copy of §6's ranges; uses `movement.ts`                      |
| `src/game/session.ts`                  | **new** — the selection grammar: intents in, new session plus one event out         |
| `src/game/reviewFixture.ts`            | **new in Step 14, deleted in Step 18** — the temporary hand-testing position        |
| `src/board/announcements.ts`           | **new** — player-facing wording for events and for the turn indicator               |
| `src/board/squareLabel.ts`             | the accessible name gains one optional "mark" segment                               |
| `src/board/BoardSquare.tsx` / `.css`   | **new** — one square's stacked contents: site marker, ship, interaction markings    |
| `src/board/TurnIndicator.tsx` / `.css` | **new** — "Green's turn — 2 actions left"                                           |
| `src/board/Board.tsx`                  | renders from a session passed in as a prop, not from a module-level constant        |
| `src/board/grid/AccessibleGrid.tsx`    | cell activation (click, Enter, Space), Escape dismissal, and a live region          |
| `src/board/grid/AccessibleGrid.css`    | the visually-hidden live region                                                     |
| `src/App.tsx` / `App.css`              | owns the session reducer; hosts the turn indicator above the board                  |

Tests live beside the code they cover. The folder split is the one story
00000001 established and story 00000003 restated: **`src/rules/` holds only
what `rules.md` states**, so the app can be read against the document one
folder at a time. `src/board/` holds presentation and wording, about which the
document says nothing. This story adds a third folder, `src/game/` — see
decision 1.

---

## Decisions taken at plan time

`story.md` lists eleven open items under "Open items to resolve at plan time".
All are settled here, with the reasoning and the rejected alternatives, because
the code will not carry any of it.

### 1. The game state lives in `src/rules/`; the React side holds a **session** in a `useReducer`, in a new `src/game/` folder

**Decision.** Three layers, three folders:

- **`src/rules/`** — `gameState.ts` (the state's shape and the starting
  position), `movement.ts` (§6) and `ply.ts` (§5). Pure, framework-free, no
  React import anywhere. This is where every rule lives.
- **`src/game/session.ts`** — the **session**: the game state plus the things
  that are true of the player's interaction rather than of the game (which ship
  is selected, and the last thing that happened). It exports an initial-session
  builder and a **pure reducer** taking a session and an intent and returning a
  new session. It imports from `src/rules/` and from nothing else. No React
  import; it is a plain module with plain unit tests.
- **`src/App.tsx`** — calls `useReducer` with that reducer and passes the
  session down as props.

Reasoning:

- The game state _is_ what `rules.md` §5 describes, so it belongs in the rules
  layer. The **selection** is not: a game record would never record it, and
  nothing in the document mentions it. Mixing the two would put a UI concept
  inside the layer that is supposed to be readable against the document.
- A **reducer** rather than `useState`, because every change is "an intent
  arrives, a new whole state results" — exactly a reducer's shape — and because
  a pure reducer function can be unit-tested in the fast `node` environment
  with no DOM at all. That is CONTRIBUTING.md's stated preference, and it means
  the selection grammar (decision 6) is covered by cheap tests rather than by
  driving a rendered board.
- **No React context.** The tree is `App → Board → AccessibleGrid`, two levels;
  context would add indirection with no consumer that benefits, and would force
  every component test to wrap its render in a provider.
- **A new `src/game/` folder** rather than putting `session.ts` in
  `src/board/`, because it is not presentation: it decides what a player's
  action _means_, and a future story that adds a second board view or a replay
  control would use it unchanged. It is also where the temporary fixture goes
  (decision 10), which must not live in `src/rules/`.

**Rejected:** holding the game state inside `Board.tsx` with `useState`. The
turn indicator sits _outside_ the board (decision 9), so the state has to live
above both; and `.app__board` is a `container-type: size` box the board
measures itself against, so putting chrome inside it would change the board's
size (see story 00000006's decision 7).

**Every state value is plain readonly data** — objects and arrays, no classes,
no methods, no `Map` or `Set` in the stored shape. Two reasons: a test can
construct any position it needs directly (several tests in this plan do exactly
that), and a later story can serialise a state or a move without a conversion
layer. `Map`s are built as **derived indexes** at the point of use
(decision 3), never stored.

### 2. Ships get stable identifiers now

**Decision.** Add a `ShipId` to `src/rules/fleet.ts` and a required, readonly
`id` field to `FleetEntry`, so `STARTING_FLEET` names all fourteen ships. The
ids are literal strings assigned in `STARTING_FLEET`'s existing clockwise order
from H15: `"green-1"` … `"green-7"` and `"red-1"` … `"red-7"`, numbered in the
order each side's ships appear in that list.

Reasoning:

- A square stops being an identity the moment a ship moves, and this story is
  the moment ships move. "Which ships have moved this ply" cannot be tracked by
  square without re-deriving it after every move, and combat (which returns a
  ship to a bay) would break that scheme outright in the next story.
- **Readable literal ids**, not opaque generated ones, because a future game
  record is meant to be human-inspectable and replayable, and because a failing
  test that says `green-3` is diagnosable where one that says `id-7f2a` is not.
- The ids are **transcription data**, in the same spirit as the rest of
  `STARTING_FLEET`: written out literally, then checked by tests (fourteen
  distinct ids, seven per side, numbered in list order).

**Rejected:** a `Ship` class with identity, or a symbol/branded id. Both fight
the "plain readonly data" rule in decision 1 and neither serialises.

**Consequence for `startingShipAt`.** Once `Board.tsx` renders from the game
state (Step 10) nothing in production calls `startingShipAt` any more, and this
repository has already had a peer review push back on an exported function with
no production consumer. Step 10 therefore **deletes** it; `fleet.test.ts`'s
rotational-symmetry test builds its own square-keyed map locally instead.
(Rejected: keeping it "for tests", which is precisely the pattern that was
rejected before.)

### 3. Ships are stored as a list; occupancy is a derived index

**Decision.** `GameState` stores `ships` as a readonly array of `Ship`
(`id`, `side`, `square`, `shields`), in a stable order — the `STARTING_FLEET`
order. Occupancy is **not** stored. `gameState.ts` exports a helper that builds
a square-name-keyed index of that array, and each movement calculation builds
the index once at its start.

Reasoning:

- Two stored copies of the same fact must be kept in step by every transition;
  one of them will eventually not be. A derived index cannot drift.
- The cost is nothing: fourteen ships, one pass, once per legal-move
  calculation — which happens on a selection, not on a keystroke.
- The list is the shape that serialises, and it keeps a ship's facts in one
  place.

The path check ("is this square occupied") therefore asks the index, which is a
map lookup, not a linear scan of the list. That is the whole reason the index
exists; do not scan the array inside the path loop.

### 4. Site states become stored state now

**Decision.** `GameState` carries the state of every site, keyed by square
name, initialised from `startingSiteState`. `startingSiteState` stays exactly
as it is — it remains the transcription of §8.1's starting arrangement, and it
is what the starting state is built from. Nothing in this story ever changes a
stored site state.

Reasoning:

- The legal-move check must ask **the state** what a site is, not a
  starting-position function. If it asked `startingSiteState`, then the first
  story that wakes a site would find the movement rules quietly consulting the
  opening board.
- The fixture needs four states on the board (a real starting board has two),
  and with states stored that is one entry in the fixture's state rather than a
  second source of truth swapped in behind the board.
- §8's transitions, when they arrive, need somewhere to write. This is it.

**Rejected:** leaving site states derived and passing an override map into the
movement functions. That is the same data with an extra parameter threaded
through every call site, and it makes "what state is this site in" answerable
in two different ways.

### 5. Reach is a transcription of §6's table; legality filters it

**Decision.** `src/rules/movement.ts` holds both halves of §6, in two clearly
separated parts:

1. **Reach** — a pure function of a square and a shield count, knowing only
   the board's edges. It is driven by a literal table transcribed from §6:
   five entries, each naming the shield count at which the option unlocks, the
   direction kind (orthogonal or diagonal) and the distance —

   | Unlocked at shields | Directions | Distance |
   | ------------------- | ---------- | -------- |
   | 4                   | orthogonal | 1        |
   | 3                   | diagonal   | 1        |
   | 2                   | orthogonal | 2        |
   | 1                   | diagonal   | 2        |
   | 0                   | orthogonal | 3        |

   A ship carrying _s_ shields gets every option whose "unlocked at" figure is
   **at least** _s_ — which is exactly how §6's table accumulates downward, and
   is why the table above can be read line by line against the document. Each
   reach entry names the **destination** and the squares the ship **passes
   over** (the origin and the destination excluded), so callers never
   re-derive a path. Entries that would leave the board are omitted.

2. **Legality** — a function of a game state and a ship id returning the
   squares that ship may legally move to: reach, filtered by "every
   passed-over square and the destination is unoccupied" (using the index from
   decision 3, either side's ships blocking equally) and by "the destination is
   not a dormant or depleted site".

Reasoning:

- The table read as directions-and-distances is what §6 actually says. A
  generated set of offsets per shield count would be the same information with
  the document's structure dissolved into it, and a reviewer could not check it
  against the page.
- Separating reach from legality makes the table testable on its own, against
  an empty board, which is the one place the exact counts 4/8/12/16/20 can be
  asserted without occupancy muddying them.
- **One module, not two.** Both halves are §6; splitting them across files
  would put half of one rules section in each. The reach half is exported in
  its own right because `siteSpacing.test.ts` needs it (decision 11).

**Two traps §6 sets, called out because they are easy to get wrong:** three
squares **diagonally** is never legal at any shield count, and the counts above
are the shape of the reach _before_ edges, ships and sites cut them down.

**Rejected:** expressing reach as a per-shield-count set of `(dx, dy)` offsets.
It hides which line of the document each offset came from, and it loses the
passed-over squares, which the blocking check and the site-spacing sweep both
need.

### 6. One legal-move function, and a matching "why not" function

**Decision.** There is exactly one implementation of §6 (decision 5). The
highlight the player sees, the check that a chosen destination is allowed, and
§5's deadlock guard all call it. In addition, `movement.ts` exports a function
that answers, for a state, a ship and a chosen square, **why** the move is not
allowed — as a structured reason, never as a sentence. The reasons are:

| Reason                      | Means                                              |
| --------------------------- | -------------------------------------------------- |
| `not-your-ship`             | the ship belongs to the side not to move           |
| `ship-already-moved`        | that ship has already moved this ply               |
| `out-of-range`              | the square is not in the ship's §6 reach at all    |
| `path-blocked`              | a ship stands on a square the move would pass over |
| `destination-occupied`      | a ship stands on the destination                   |
| `destination-dormant-site`  | the destination is a dormant site                  |
| `destination-depleted-site` | the destination is a depleted site                 |

Reasoning: `story.md` requires that a rejected input says why, in plain
language, to sighted and screen-reader players alike. Deriving the sentence
from a structured reason keeps the wording in `src/board/` (decision 8) and the
judgement in the rules layer, and lets both be tested separately.

**The two must not drift**, so a test asserts the invariant directly: for a
handful of states, over **every** square on the board, the square appears in
the legal-destination list **if and only if** the reason function returns "no
reason". That test is the thing standing between "the version the player can
see" and "the version the game enforces" diverging.

### 7. The interaction grammar

**Decision.** Selection is a two-step interaction — pick a ship, pick a square
— identical from the keyboard and the mouse. There is no drag-and-drop (it
would need a parallel accessible path anyway).

| Situation                                          | Activating a square does                          |
| -------------------------------------------------- | ------------------------------------------------- |
| nothing selected, own ship that has not moved      | selects it                                        |
| nothing selected, own ship that has already moved  | rejects: `ship-already-moved`                     |
| nothing selected, opponent's ship                  | rejects: `not-your-ship`                          |
| nothing selected, empty square                     | rejects: nothing to select there                  |
| ship selected, a legal destination                 | moves the ship, clears the selection              |
| ship selected, its own square                      | **cancels** the selection                         |
| ship selected, another own ship that has not moved | **switches** the selection to that ship           |
| ship selected, any other square                    | rejects, with the specific reason from decision 6 |

Keys: **Enter** and **Space** activate the focused cell; **Escape** cancels a
selection from anywhere in the grid. Arrow keys keep doing exactly what they do
today (move focus, never select). A pointer **click** on a cell activates it.

Reasoning:

- **Activating the selected ship's own square cancels** rather than being
  inert: its square can never be a legal destination, so "activate again to put
  it back" is the only useful meaning, and it is the toggle players expect. An
  inert square would leave Escape as the only way to cancel, which is
  discoverable to nobody.
- **Activating a second friendly ship switches** rather than rejecting: an
  occupied square can never be a legal destination either, so switching is
  again the only useful meaning, and it saves a cancel-then-select round trip
  that players would otherwise perform constantly.
- **Space as well as Enter**, because the cell is behaving as a button and both
  are the expected keys; Space must have its default prevented so the page does
  not scroll.
- **Escape**, because a composite widget that can enter a mode must offer the
  standard way out of it.

### 8. Announcements: one polite live region, counted destinations, wording in a plain module

**Decision.**

- **One** live region, rendered by `AccessibleGrid` as `role="status"` (which
  carries polite, atomic live semantics), visually hidden, holding one sentence
  or two. `AccessibleGrid` takes the text as a prop and **never composes it**.
- **The wording lives in `src/board/announcements.ts`**, beside
  `squareLabel.ts`, as a pure function from a structured event to a string.
  The session reducer (decision 1) emits the structured event; the board turns
  it into English. The same module holds the turn indicator's sentence
  (decision 9), since both are player-facing wording about the game's state.
- **On selection, the destinations are counted, not enumerated**: "Green ship
  at G7 selected. 20 moves available." A player explores the destinations by
  arrowing over them, and each one says so in its own accessible name
  (decision 9's mark segment).
- **Polite, not assertive**, for everything including rejections.

The wording, to be adjusted only at the screen-reader gate (Step 17):

| Event                | Announcement                                                                 |
| -------------------- | ---------------------------------------------------------------------------- |
| selected             | `Green ship at G7 selected. 20 moves available.` (`1 move available` at one) |
| selection cleared    | `Selection cleared.`                                                         |
| moved, ply continues | `Green ship moved from G7 to H8. Green has 1 action left.`                   |
| moved, ply ends      | `Green ship moved from G7 to H8. Red's turn, 2 actions left.`                |
| moved into a bay     | `… moved from A11 into the A10 bay and lost its shields. …`                  |
| ply passed (§5)      | `Red has no legal move, so the turn passes. Green's turn, 2 actions left.`   |
| rejection            | one sentence per reason, **naming the square** — see below                   |

Rejection sentences, in the players' vocabulary (never "ply", never a reason
code):

| Reason                      | Sentence                                                 |
| --------------------------- | -------------------------------------------------------- |
| `not-your-ship`             | `That is your opponent's ship. Choose one of your own.`  |
| `ship-already-moved`        | `That ship has already moved this turn. Choose another.` |
| nothing to select           | `No ship on G4. Choose one of your own ships.`           |
| `out-of-range`              | `J7 is out of range for the selected ship.`              |
| `path-blocked`              | `Another ship is in the way of C8.`                      |
| `destination-occupied`      | `C7 is occupied.`                                        |
| `destination-dormant-site`  | `D8 is a dormant site — a ship cannot stop there.`       |
| `destination-depleted-site` | `H4 is a depleted site — a ship cannot stop there.`      |

Reasoning:

- **Counted, not enumerated**: twenty square names read aloud after every
  selection would be unusable, and the information is available square by
  square where a player actually needs it.
- **Polite, not assertive**: every announcement here follows a deliberate
  keypress or click, so a polite region is spoken promptly anyway; assertive
  interrupts whatever the reader is saying, which for a rejection would talk
  over the square's own name. **Rejected:** a second, assertive region for
  rejections — two regions risk double-speaking the same change and give the
  reader no consistent place to look.
- **Every rejection names the square**, which both helps the player and means
  two rejections in a row rarely produce identical text. (Identical consecutive
  text is not reliably re-announced by screen readers. The plan does not
  engineer around that — no invisible counters or zero-width padding — but
  Step 17 watches for it and records what was heard.)

### 9. Three new square markings, and where the turn indicator sits

**The markings.** Three states join bays, four site states, two ship colours
and the shield arcs on the same 40px-and-up square. Each gets its own **shape
primitive**, so none is distinguishable by colour alone and none can be
mistaken for another:

| State                 | Drawn as                                                                              |
| --------------------- | ------------------------------------------------------------------------------------- |
| legal destination     | a small **solid disc** in the centre of the square                                    |
| selected ship         | four short **corner brackets** inset from the square's corners                        |
| already moved (spent) | the ship drawn at reduced opacity, plus a short **bar** near the square's bottom edge |

Reasoning:

- A **legal destination is always an empty square** — it can never hold a ship,
  by §6 — so a centred disc can never collide with a ship or its arcs. It can
  sit on an active or charged site, but the site rings are at radius 47 and 39
  of a 100-unit viewBox while the disc is small and central, so the two never
  touch.
- **Corners are free.** The site markers are circular and the ships are
  centred; story 00000003 rejected corner brackets for _sites_ only because a
  shield count was then expected in the corners, and story 00000006 put the
  shields in a ring instead. The corners are therefore genuinely available, and
  brackets are the one primitive that reads as "this thing is picked up"
  without covering anything.
- **Selected and spent can never coexist** (a ship that has moved cannot be
  selected), so their markings may share the same region of the square without
  ever being drawn together.
- **Opacity alone is not enough** for spent — it is a lightness cue, which does
  survive greyscale, but at a glance a dimmed ship reads as "further away", not
  "used". The bar makes it deliberate.
- **Not confusable with a bay or the focus ring**, both of which are full
  square borders at the square's edge: brackets are inset, short, and only at
  the corners. The amber `--focus-ring` colour must not be reused for any of
  the three.

Ring radius, bracket length and inset, disc radius, bar size and the spent
opacity are **named constants in one place** in `BoardSquare.tsx`, tunable at
Step 15's manual gate, exactly as story 00000006 handled the arc geometry.

**The turn indicator** sits **above** the board, between the title and
`.app__board`, as ordinary text ("Green's turn — 2 actions left").

Reasoning: story 00000006 deliberately left the board sizing itself from
`.app__board` with no slots reserved for chrome, and `.app__board` is a
`container-type: size` box — anything placed _inside_ it changes the board's
computed square size. A block above costs height only, which the board already
absorbs by shrinking, and it needs no new layout mode at narrow widths (it
wraps to two lines and the board shrinks a little). A panel _beside_ the board
would need a second layout at narrow widths and would take width the board
wants; that is speculative layout this story does not need.

The indicator is **not** a live region. The change of turn is announced through
the board's one live region (decision 8); making the indicator a second live
region would announce every turn change twice.

### 10. The fixture is one module and one call site

**Decision.** `src/game/reviewFixture.ts` exports a single builder returning a
complete `GameState`. `App.tsx` calls it in place of `startingGameState()` at
exactly one place. Step 18 deletes the file and restores that one call. There
is no route, no query parameter, no `import.meta.env` branch, and nothing else
in the codebase refers to it — the same reasoning story 00000003's decision 2
recorded: a dev-only mechanism would be infrastructure outliving the thing it
serves, and it ships in the static bundle either way.

**The fixture must never live in `src/rules/`**, and no test under
`src/rules/` may import it. **No automated test anywhere may depend on it** —
Step 18 deletes it and would take that coverage with it. This is why `Board`
takes its session as a **prop** (decision 1): every board test builds the
position it needs directly, so installing the fixture changes no test at all.
`App.test.tsx` must keep asserting only the shell (its heading and axe), never
a fixture position.

**The arrangement.** Not a legal game state — the module header must say so.
Site states (five in play, which at least keeps it plausible-looking):

| State    | Sites                                      |
| -------- | ------------------------------------------ |
| charged  | H8, K11                                    |
| active   | E5, K5, E11                                |
| depleted | H4, H12                                    |
| dormant  | F2, J2, B4, N4, D8, L8, B12, N12, F14, J14 |

Ships — seven green, seven red, **none in a bay** (so all fourteen bays are
empty and any of them can be moved into), and none standing on a site:

| Side  | Square | Shields | What it is there for                                                           |
| ----- | ------ | ------- | ------------------------------------------------------------------------------ |
| green | G7     | 0       | the 0-shield range: exactly **20** destinations, all clear                     |
| green | I6     | 1       | the 1-shield range: exactly **16**                                             |
| green | I10    | 2       | the 2-shield range: exactly **12**                                             |
| green | M6     | 3       | the 3-shield range: exactly **8**                                              |
| green | M10    | 4       | the 4-shield range: exactly **4**                                              |
| green | C5     | 0       | the blocking demonstration's mover                                             |
| green | C7     | 0       | friendly blocker, two squares north of C5                                      |
| red   | C3     | 0       | enemy blocker, two squares south of C5                                         |
| red   | H3     | 0       | depleted site H4 one north: cannot land, can fly over to H5/H6                 |
| red   | A11    | 2       | bays: A10 one south (lands, shields reset); A9 two south (flies over, keeps)   |
| red   | B13    | 0       | dormant site B12 one south: cannot land; B11 two south flies over it           |
| red   | G13    | 4       | a heavily shielded red ship, four clear destinations                           |
| red   | K7     | 1       | red's own site cases: L8 dormant excluded, K5 active offered two squares south |
| red   | N9     | 3       | enemy blocker case for red (M10 diagonally), and the O10 bay one diagonal step |

Why these, in detail — each is a manual gate made **one move away**:

- **The five ranges (gate 1)** are all on **green**, because green moves first
  and selecting an opponent's ship is rejected: a tester must be able to
  inspect all five ranges without playing a move (selecting and cancelling
  costs no action). Each ladder ship's reach was checked square by square
  against this fixture: no other ship stands on any of those squares, and no
  dormant or depleted site falls inside them, so the counts really are
  20/16/12/8/4. Column G, I and M and rows 3, 6, 7, 9, 10 and 13 carry no sites
  at all, which is what makes clean reaches possible; G7's reach does include
  the charged H8 and the active E5, which are legal destinations and so do not
  reduce the count.
- **Blocking (gate 2)** is one line through C5: two north is the friendly C7
  (landing blocked) and three north is C8 (passing over C7 blocked); two south
  is the enemy C3 and three south is C2, blocked the same way. Its east line
  (D5, E5, F5) is clear and shows a two- and three-square move still working,
  and its west line runs off the board after two squares, so the same ship also
  shows the edge clipping.
- **Sites (gate 3)**: H3 cannot land on the depleted H4 but may fly over it to
  H5 or H6; B13 cannot land on the dormant B12 but may fly over it to B11; C5's
  diagonal B4 is dormant and excluded; K7 shows L8 excluded and the active K5
  offered; G7 offers the charged H8 and the active E5. Moving G7 onto H8 also
  puts a ship on a charged site, so the gate can confirm the site's appearance
  does not change and the marker still reads under a ship.
- **Bays (gate 4)**: A11 does both halves with one ship — one square south is
  the empty A10 bay (arrives with no arcs), two squares south is A9 and passes
  **over** A10 (keeps its two shields). Note that a fly-over of a bay is only
  possible along an edge, since bays sit on the outer edge four squares apart;
  A11→A9 is the shortest such move and needs at most two shields, which is why
  that ship carries exactly two. N9 gives a second, diagonal bay landing at
  O10 from three shields.
- **A shielded ship on the edge, but never in a bay.** `story.md` requires that
  shielded ships not sit in bays, because §3.1 makes that position impossible.
  A11 is an ordinary edge square, not a bay: a two-shield ship there is a
  position a real game can produce (it moved there from the interior), so it
  honours the constraint's purpose. Every other shielded ship (I6, I10, M6,
  M10, G13, N9) is in the board's interior.
- **Shields 0–4 all appear**, and 2, 3 and 4 appear on both sides, so the arc
  ring can be checked on green and red without a second look.

**Resetting the fixture.** The state lives only in memory, so **reloading the
page returns the fixture to the position above**. Every manual gate below
assumes a fresh reload before it starts.

**The fixture must not survive the branch.** If the pipeline is resumed
mid-story, the check is `src/game/reviewFixture.ts`: if the file exists,
Step 18 has not run.

### 11. `siteSpacing.test.ts` stops carrying its own copy of §6

**Decision.** As soon as `src/rules/movement.ts` exists (Step 2), the sweep in
`src/rules/siteSpacing.test.ts` deletes its private `ORTHOGONAL_LENGTHS` /
`DIAGONAL_LENGTHS` / direction tables and its `allMoves` helper, and enumerates
moves from the real reach function at **0 shields** instead — the worst case,
since §6's options accumulate as shields are shed.

This is why the reach half of §6 is **occupancy-free** (decision 5): the sweep
deliberately ignores blocking ships, which considers strictly more squares than
any real move could reach, in the conservative direction. It also needs each
entry's passed-over squares, which reach already supplies.

The sweep's own logic is untouched: it still collects the squares a move passes
over and lands on **excluding the origin** (a ship can only ever stand on a
site that is already charged or depleted, so a move can never wake the square
it departs from), still discards nothing else, and still asserts that no move
touches two sites, naming origin, direction, length and sites on failure.

Reasoning: story 00000003's plan encoded the ranges in the test file precisely
because there was no movement module to borrow them from, and said so in a
comment. There is one now, and two copies of §6 in one repository is the drift
this story's "one legal-move function" rule exists to prevent. The comment
saying "there is no movement module in src/rules/ yet" must go with it.

---

## Other design notes that apply across steps

- **Never mutate a state.** Every transition returns a new value. Beyond being
  the safe default, it is what lets a later story replay a game from a list of
  small move values. This story builds no recording, serialisation or undo; it
  only declines to make them hard.
- **Nothing in this story is random**, so no seeded generator is needed and the
  `Math.random` lint ban is unaffected.
- **The app deliberately lags the document in one place.** §8.5 requires a
  player whose ship is stranded on a depleted site to spend an action moving it
  clear. That is out of scope here, so the app permits a ply the rules would
  not. `rules.md` stays right; the gap closes in the story that brings site
  states to life. Do not implement it, and do not add a rule to the document
  saying otherwise.
- **`AccessibleGrid` stays piece-agnostic.** It gains activation, dismissal and
  a live region because those are grid-widget concerns. It must never learn
  what a ship, a side, a bay or a legal move is, and it must never compose an
  announcement.
- **Artwork stays decorative**: every SVG the board draws is `aria-hidden` with
  no `title` or `desc`. All meaning reaches assistive technology through the
  square's accessible name and the live region.
- **jsdom has no layout.** Nothing about square sizes, marking legibility,
  greyscale or overlap can be asserted in a DOM test. Those are the manual
  gates; do not invent a test that pretends otherwise.
- **Comment style.** Short module headers saying what a module is for. No story
  numbers, no plan-step references, no rejected alternatives in code — a peer
  review treats those as a finding.
- **Every step is finished with** `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run format:check` (run `npm run format` to fix) and, for any
  step touching `src/`, `npm run build` — plus the step's own verification.
- **The dev server** runs on `http://localhost:5273` (`npm run dev`).
  `vite.config.ts` sets `server.watch.usePolling`, so edits are picked up
  without a restart on this branch.

---

## Step 1 — Stable ship identifiers

Status: committed

Notes: Added `ShipId` and a required `id` field to `FleetEntry` in
`src/rules/fleet.ts`, and gave each `STARTING_FLEET` entry its literal id in
the existing clockwise order. Added the id-focused assertions to
`fleet.test.ts` (distinct ids, seven per side numbered 1-7 with no gaps, ids
ascending in list order per side, and the H15/L15 spot-check). No deviation
from the plan.

Give every ship a stable identity, so the rest of the story can follow one ship
across squares and plies. In `src/rules/fleet.ts`:

- Add an exported `ShipId` type (a string alias is enough) and a required,
  readonly `id` field to `FleetEntry`.
- Give each of the fourteen `STARTING_FLEET` entries a literal id, assigned in
  the list's existing clockwise-from-H15 order: the green entries are
  `"green-1"` … `"green-7"` in the order they appear, and the red entries
  `"red-1"` … `"red-7"` likewise. So H15 is `green-1`, L15 is `red-1`, O14 is
  `green-2`, O10 is `red-2`, and so on.

Nothing else changes: `startingShipAt` keeps working, `Board.tsx` keeps
rendering exactly what it renders today, and no accessible name moves.

See plan decision 2 for why identity arrives now and why the ids are readable
literals rather than generated values.

Depends on: nothing (first step).

Verification (automated): `npm test` — new assertions in
`src/rules/fleet.test.ts`: there are fourteen distinct ids; exactly seven are
green-sided and seven red-sided; each side's ids are `1`–`7` with no gaps; and
the ids appear in `STARTING_FLEET` in ascending order within each side (a
spot-check that H15 is `green-1` and L15 is `red-1` is worth writing
literally). The existing fleet, board and component tests must pass unchanged.
Also `npm run typecheck`, `npm run lint`, `npm run format:check`,
`npm run build`.

---

## Step 2 — §6's reach table

Status: committed

Notes: Added `src/rules/movement.ts` with `reachFrom(origin, shields)`, driven
by the five-row `REACH_OPTIONS` table transcribed directly from plan
decision 5, and `src/rules/movement.test.ts` covering the exact H8 sets at
each shield count, the downward-accumulation superset property, the
three-diagonal-squares exclusion, edge/corner clipping, and the
passed-over-squares ordering. `src/rules/siteSpacing.test.ts` was
reconciled per decision 11: its private `ORTHOGONAL_LENGTHS` /
`DIAGONAL_LENGTHS` / direction-table constants and hand-rolled path walk are
gone, and `allMoves` now derives each move's direction, length and touched
squares from `reachFrom(origin, 0)`, keeping the same `Move` shape and
failure-message format as before. No deviation from the plan.

Add `src/rules/movement.ts` with the **reach** half of §6 only: a pure function
of a square and a `ShieldCount` returning every square that ship could move to
on an otherwise empty board, together with the squares each move passes over.

- Drive it from a literal table transcribed from §6, one row per option, each
  naming the shield count at which the option unlocks, whether it is orthogonal
  or diagonal, and the distance — the table in plan decision 5. A ship with _s_
  shields gets every option whose unlock figure is **at least** _s_, which is
  how §6's rows accumulate downward.
- Each returned entry names the **destination** and the squares **passed over**
  (excluding both the origin and the destination), in order. Callers must never
  have to re-derive a path.
- Moves that would leave the board are omitted entirely — a partly-off-board
  move is not a short move.
- The module knows nothing about ships, occupancy, sites or whose turn it is.
  Legality arrives in Step 4, in this same module.

Then **reconcile `src/rules/siteSpacing.test.ts`** (plan decision 11): delete
its private `ORTHOGONAL_LENGTHS`, `DIAGONAL_LENGTHS`, direction tables and
`allMoves` helper, and enumerate the sweep's moves from this new reach function
at **0 shields** (the worst case — every move available with shields is also
available at 0). Keep everything else about the sweep exactly as it is,
including the exclusion of the origin square and the failure message naming
origin, direction, length and sites. Remove the comment saying there is no
movement module yet.

Two things §6 makes easy to get wrong, restated because this is the step that
must get them right: **three squares diagonally is never legal at any shield
count**, and the counts 4/8/12/16/20 are the shape of the reach before any
filtering.

Depends on: nothing in this story (it needs only `src/rules/board.ts` and
`src/rules/shields.ts`), but it comes early because everything else in the
rules layer is built on it.

Verification (automated): `npm test` — a new `src/rules/movement.test.ts` (pure
logic, so the default `node` environment, no jsdom docblock) asserting:

1. From an unobstructed centre square such as **H8**, the reach at each shield
   count is the **exact set** of squares §6 gives — 4 at four shields, 8 at
   three, 12 at two, 16 at one, 20 at none — compared as sets of square names,
   not merely counted.
2. Each count's set is a **superset** of the next higher count's, since §6
   accumulates.
3. **No square three steps diagonally** (for example K11 or E5 from H8) appears
   at any shield count.
4. Reach is clipped by the board's edges: from the corner **A1** and from an
   edge square such as **A8**, every entry is on the board and the counts are
   below the unobstructed figures.
5. A three-square orthogonal entry names **two** passed-over squares in order,
   a two-square entry names one, and a one-square entry names none.

Plus: `src/rules/siteSpacing.test.ts` still passes with no private range table
left in it, and a search of that file finds no direction or length constants.

---

## Step 3 — The game state and its starting position

Status: committed

Notes: Added `src/rules/gameState.ts` with `Ship`, `GameState`,
`startingGameState`, `shipsBySquare` and `siteStateAt`, and
`src/rules/gameState.test.ts` covering the five listed assertions. Site
states are stored as a plain `Record<string, SiteState>` keyed by square
name (built once from `startingSiteState` in the builder) rather than a
`Map`, since decision 1 bans a stored `Map`/`Set` and a plain object is
still ordinary readonly JSON-serialisable data; `siteStateAt` and the
builder are the only things that touch it directly. No other deviation from
the plan.

Add `src/rules/gameState.ts`: the shape of a game in progress, and the position
it starts from. No transitions in this step.

- A `Ship` — id, side, current square, shield count.
- A `GameState` holding: the ships as a readonly array in `STARTING_FLEET`
  order; the state of every site keyed by square name; the side to move; how
  many of the ply's two actions remain; and the ids of the ships that have
  already moved this ply (a readonly array — it never holds more than two
  entries).
- A builder for the starting state: the fourteen ships from `STARTING_FLEET`,
  every site's state from `startingSiteState`, **green** to move, **two**
  actions remaining, nothing moved.
- A helper that builds a square-name-keyed index of the ships (plan decision 3)
  and a helper answering a square's site state from a state (`undefined` when
  the square is not a site).

Everything is plain readonly data — no classes, no methods, no stored `Map` or
`Set` — so a test can construct any position it needs directly. Later steps
depend on that heavily.

See plan decisions 1, 3 and 4 for why the state lives in `src/rules/`, why
occupancy is derived rather than stored, and why site states are stored now
even though nothing changes them.

Depends on: Step 1 (ship ids).

Verification (automated): `npm test` — a new `src/rules/gameState.test.ts`
asserting of the starting state:

1. Fourteen ships, whose ids, sides, squares and shield counts match
   `STARTING_FLEET` entry for entry.
2. Green is to move, two actions remain, and no ship is marked as having moved.
3. Every one of the seventeen sites has a state, five of them `active`
   (`H8`, `E5`, `K5`, `E11`, `K11`) and twelve `dormant`, with nothing charged
   or depleted; a non-site square has no state.
4. The ship index finds a ship on each of the fourteen bay squares and none on
   an ordinary square such as `H8`.
5. Building the starting state twice produces equal but independent values
   (nothing shared and mutable is handed out).

---

## Step 4 — Legal destinations, and why a move is refused

Status: committed

Notes: Added `legalDestinations`, `moveRefusalReason` (with the `MoveRefusalReason`
union), `eligibleShips` and `sideToMoveHasLegalMove` to `src/rules/movement.ts`,
built on `reachFrom`, `shipsBySquare` and `siteStateAt`. `legalDestinations`
filters reach by occupancy (destination and every passed-over square, either
side) and by the destination's site state; `moveRefusalReason` checks the same
facts independently, in the specified order, so the two are two separate
implementations rather than one calling the other, which is what the drift
test in `movement.test.ts` is for. Extended `movement.test.ts` with blocking
(friendly and enemy), clear multi-square paths, the site restriction (dormant,
depleted, active, charged), whose-turn/already-moved, an if-and-only-if sweep
of `ALL_SQUARES` against `moveRefusalReason` over three constructed states
(a friendly-blocker state, an enemy-blocker state, and a site-restriction
state), a case for each of the seven reasons, and small tests for the two new
helpers. All states are built directly as literal `GameState` values via
local `ship`/`buildState` test helpers, never via `startingGameState` or any
fixture. No deviation from the plan.

Extend `src/rules/movement.ts` with the **legality** half of §6, on top of
Step 2's reach:

- A function of a game state and a ship id returning the squares that ship may
  legally move to: reach for its shield count, filtered so that every
  passed-over square **and** the destination is unoccupied (a friendly ship
  blocks exactly as an enemy one does), and the destination is not a **dormant
  or depleted** site. Flying over a dormant or depleted site is unaffected; an
  active or charged site is a perfectly legal destination.
- A companion function answering **why** a given square is not a legal
  destination for a given ship, returning one of the structured reasons in plan
  decision 6 (`not-your-ship`, `ship-already-moved`, `out-of-range`,
  `path-blocked`, `destination-occupied`, `destination-dormant-site`,
  `destination-depleted-site`) or nothing at all when the move is legal. It
  returns a **reason, never a sentence** — the wording lives in `src/board/`
  (Step 7).
- Small helpers §5 will need in Step 5 and the UI will need later: which of a
  side's ships are eligible to move this ply (its side is to move and the ship
  has not already moved), and whether a given side has any legal move at all.

Order the reasons so the most fundamental is reported first: whose ship it is,
then whether it has already moved, then range, then the path, then the
destination square itself.

This is the **only** implementation of §6 in the codebase (plan decision 6).
The board's highlighting, the check on a chosen destination and §5's deadlock
guard all call these functions; do not write a second version anywhere.

Depends on: Step 2 (reach), Step 3 (the state and the ship index).

Verification (automated): `npm test` — extend `src/rules/movement.test.ts`,
building each position **directly** as a game-state value (never via the
starting position, and never via any fixture):

1. **Blocking, friendly and enemy alike**, at two and at three squares: with a
   blocker two squares away in a line, neither the blocker's square nor the
   square three away is legal, while the square one away still is. Assert it
   for a friendly blocker and for an enemy blocker, and confirm the two give
   identical results.
2. **A clear path of two and of three squares still works.**
3. **The site restriction**: a dormant site and a depleted site are both absent
   from the destinations; a longer move that **passes over** either is present;
   an **active** and a **charged** site are both present.
4. **Whose turn and already-moved**: a ship of the side not to move has no
   legal destinations and reports `not-your-ship`; a ship marked as having
   moved this ply reports `ship-already-moved`.
5. **The two functions agree** — for at least three different constructed
   states, over **every** square on the board, a square is in the legal
   destination list **exactly when** the reason function returns nothing. This
   test is what keeps what the player sees and what the game enforces from
   drifting apart.
6. Each reason is produced by at least one constructed case, with the expected
   reason and not merely "some reason".

---

## Step 5 — Applying a move: actions, plies, the bay reset and the pass

Status: committed

Notes: Added `src/rules/ply.ts` with `applyMove` (returning `{ outcome:
"applied", state, effects }` or `{ outcome: "refused", reason }` — refusals
are returned, not thrown, per the plan, so Step 6's session reducer can
pattern-match on `outcome` the same way it will on `moveRefusalReason`) and a
separately exported `applyPassGuard`, called both internally after every
applied move and directly (it is the only way to exercise the "state already
has no legal move before any move is attempted" case §5 requires, and the
plan's own termination test needs to call it without an actual move). The
guard performs at most one pass per call — since only two sides exist, a
single check-and-maybe-pass is enough to cover both real call sites and
provably terminates, satisfying the "must not pass forever" requirement
without a bounded-loop counter. `ACTIONS_PER_PLY` was added to
`src/rules/gameState.ts` (not `ply.ts`) and consumed by both it and
`ply.ts`: `gameState.ts` already held the literal, and `ply.ts` importing
from `gameState.ts` (already a value dependency of `movement.ts`, which
`ply.ts` also imports from) keeps the module graph acyclic, where the
reverse direction would have made `gameState.ts` and `ply.ts` mutually
dependent. `src/rules/ply.test.ts` covers all nine listed cases, building
every state directly; states with a fully-idle side (no ships, or a single
already-moved ship and no ships of the other side) are used deliberately in
a couple of tests to exercise the guard, and the tests assert only the
fields those cases don't disturb. No other deviation from the plan.

Add `src/rules/ply.ts`, implementing §5 and §3.1's reset:

- **Applying a move**: given a state, a ship id and a destination, return
  either a refusal carrying the structured reason from Step 4, or a new state
  in which the ship stands on the destination, the square it left is empty, the
  ship is marked as having moved this ply, one action is spent, and — per
  §3.1 — the ship's shields are **0** if the destination is a bay. Nothing else
  about the state changes: no other ship moves, no site state changes, no shield
  count changes for any other reason.
- **The ply**: when the second action is spent, play passes to the other side,
  the action count resets to two, and the moved-this-ply marks clear. A ship
  that has moved is therefore eligible again next ply, and with no combat every
  full ply moves two different ships.
- **The pass guard (§5)**: after every applied move, if the side now to move
  has no legal move with any eligible ship, its ply passes — the marks clear,
  the actions reset and the other side is to move. This covers both the start
  of a ply and the case where a player's first action leaves them no legal
  second one, which §5 handles with the same sentence ("must take both actions
  if two are available, and one if only one is"). The guard must terminate: if
  **neither** side has a legal move it stops rather than passing for ever, and
  returns the state as it stands.
- Alongside the result, return the **effects** the UI needs to describe what
  happened: that the move ended in a bay and stripped the ship's shields, that
  the ply ended and whose turn it now is, and that a ply was passed for want of
  a legal move. Structured values, not sentences.

Refusals are **returned, not thrown**: an illegal destination is an expected
player action, and the caller needs the reason to explain it.

Depends on: Step 4 (legality and the reasons), Step 3 (the state).

Verification (automated): `npm test` — a new `src/rules/ply.test.ts`, again
building positions directly:

1. **The move happens and nothing else does**: the ship arrives, its old square
   is empty, every other ship is untouched, and no site state changes.
2. **The bay reset**: a ship with shields that ends its move on a bay arrives
   with 0; the same ship making a longer move that only **passes over** an
   empty bay keeps its shields.
3. **An illegal destination is refused**, with the reason from Step 4, and the
   returned state is the one that went in — unchanged, with no action spent.
4. **Green has the first ply** (from the starting state).
5. **Two actions, then the turn passes**: after one move the same side is to
   move with one action left; after the second, the other side is to move with
   two, and the moved-this-ply marks are clear.
6. **A ship that has moved cannot move again this ply**, and can move again on
   its side's next ply.
7. **A ship of the side not to move cannot be moved.**
8. **The pass**: from a constructed state in which the side to move has no
   legal move with any eligible ship (for example a lone four-shield ship
   hemmed in at a corner by two enemy ships), the ply passes to the other side
   with two actions and clear marks, and the effect saying so is reported.
9. **Termination**: from a state with no ships at all, the guard returns rather
   than passing back and forth for ever.

---

## Step 6 — The session: selection, intents and events

Status: pending

Add `src/game/session.ts`: the layer between a player's input and the rules.

- A **session** value: the game state, the id of the selected ship if any, and
  the last thing that happened, as a **structured event** (never a sentence).
- A builder taking a starting game state and returning the initial session,
  with nothing selected and no event. It takes the state as an argument rather
  than calling the starting-state builder itself — that is the seam the
  temporary fixture uses in Step 14 and gives up in Step 18.
- A **pure reducer** taking a session and an intent and returning a new
  session. Two intents are enough: activating a square, and dismissing
  (cancelling) whatever is selected.
- The grammar is exactly plan decision 7's table: activating an own, unmoved
  ship selects it; activating the selected ship's own square cancels;
  activating another own, unmoved ship switches the selection; activating a
  legal destination applies the move (via Step 5) and clears the selection;
  everything else is a rejection carrying the specific reason. Activating an
  empty square with nothing selected is its own rejection ("nothing to select
  there").
- The events the reducer emits cover: a ship selected (with **how many**
  destinations it has, so the announcement can count them — plan decision 8),
  a selection cleared, a move made (carrying the side, the from and to squares,
  and Step 5's effects), a ply passed, and a rejection (carrying the reason and
  the square involved).

No React import. No wording. No DOM. This module is where the whole
interaction grammar is decided, so it can be tested exhaustively in the fast
`node` environment rather than by driving a rendered board.

Depends on: Step 5 (applying a move), Step 4 (legality and reasons), Step 3
(the state).

Verification (automated): `npm test` — a new `src/game/session.test.ts` walking
plan decision 7's table, from positions built directly:

1. Activating an own unmoved ship selects it and reports the destination count.
2. Activating the selected ship's own square clears the selection.
3. Activating a different own unmoved ship switches the selection to it (the
   selection is the second ship; no move is made; no action is spent).
4. Activating a legal destination moves the ship, clears the selection, and
   reports the move — and the resulting game state is exactly what applying the
   move directly would have produced.
5. Activating an enemy ship, an own already-moved ship, an occupied square, an
   out-of-range square, a blocked square, a dormant site and a depleted site
   each produce a rejection with the **specific** expected reason, and leave
   both the game state and the selection untouched.
6. Activating an empty square with nothing selected produces the
   nothing-to-select rejection.
7. The dismiss intent clears a selection, and is harmless when nothing is
   selected.
8. Two actions in sequence pass the turn, and the event says so.

---

## Step 7 — Player-facing wording

Status: pending

Add `src/board/announcements.ts`: pure functions turning Step 6's structured
events into English, and a game state into the turn indicator's sentence. It
sits beside `squareLabel.ts` because it does the same job — player-facing
wording, kept out of components so it can be unit-tested (CONTRIBUTING.md asks
for exactly that).

Write the wording exactly as plan decision 8 tables it, including:

- Selection counts destinations rather than listing them, with the singular at
  one (`1 move available`).
- A move names the side, the square left and the square reached, and adds the
  bay clause when the move ended in a bay and stripped shields.
- A move that ends the ply adds whose turn it now is and how many actions they
  have; a move that does not adds how many actions the mover has left.
- A passed ply says the side had no legal move and whose turn it is now.
- Every rejection is one plain sentence **naming the square**, never a reason
  code and never the word "ply".
- The turn indicator's sentence is `Green's turn — 2 actions left`, with the
  singular at one action.

The players' vocabulary throughout: **turn**, not ply; **node** would be wrong
here too — the squares are **sites**, which is the word `rules.md`, the UI and
the code all share.

Depends on: Step 6 (the events it renders).

Verification (automated): `npm test` — a new
`src/board/announcements.test.ts` asserting the **exact string** for: a
selection with many destinations and one with a single destination; a move
mid-ply; a move that ends the ply; a move that ends in a bay; a passed ply;
each of the eight rejection reasons; a selection cleared; and the turn
indicator's sentence at two actions and at one. Exact strings are the point
here — this is wording, and a test that only checks a substring would let the
wording rot.

---

## Step 8 — `AccessibleGrid` learns to activate a cell

Status: pending

Extend `src/board/grid/AccessibleGrid.tsx` with cell activation, in its
existing piece-agnostic spirit — it must not learn what a ship, a side or a
move is:

- A new optional `onActivate` prop, called with the grid position of the cell
  the player activated.
- **Pointer**: clicking a focusable cell activates it. (Focusable cells already
  carry a `tabIndex`, so a click focuses them and the existing `onFocus`
  handler keeps the roving target in sync.)
- **Keyboard**: **Enter** and **Space** activate the focused cell. Space must
  have its default prevented so the page does not scroll. Arrow keys keep
  behaving exactly as they do today.
- A new optional `onDismiss` prop, called when **Escape** is pressed anywhere
  in the grid. "Activate" and "dismiss" are generic composite-widget
  vocabulary — a listbox or a menu would use the same words — so this adds no
  game knowledge to the component.
- A grid with neither prop supplied must behave exactly as it does today.

`eslint-plugin-jsx-a11y` may object to a click handler on the cell element. If
it does, add a **narrow** disable comment for that one rule on that one line,
explaining the WAI-ARIA grid pattern in the same style as the existing
`interactive-supports-focus` disable already in this file. Do not widen the
lint configuration.

Depends on: nothing in this story (the component is generic), but it comes
before the board is wired up so the grid's own tests cover it on its own
fixture.

Verification (automated): `npm test` — extend
`src/board/grid/AccessibleGrid.test.tsx` (jsdom; follow CONTRIBUTING.md's
recipe) using the file's existing 2×3 fixture:

1. Clicking a focusable cell calls `onActivate` once with that cell's position.
2. Pressing **Enter** on the focused cell calls `onActivate` with the focused
   position; pressing **Space** does the same.
3. Space does not scroll — assert the keydown event had its default prevented.
4. Arrow keys do **not** call `onActivate`, and still move focus as before.
5. **Escape** calls `onDismiss`; no other key does.
6. A grid rendered without either prop still passes every existing test, and
   pressing Enter on it does not throw.
7. axe reports no violations (with `color-contrast` disabled).

---

## Step 9 — `AccessibleGrid` gains a live region

Status: pending

Give `AccessibleGrid` an optional `announcement` prop and render it into a
visually hidden live region, `role="status"` (which already carries polite,
atomic live semantics — do not also add an assertive region). The component
**receives** the text and never composes it.

The structural constraint that makes this fiddly, stated so it is not
rediscovered: **a `role="grid"` element may only own rows**, so the live region
must be a sibling of the grid element, not a child. But `.board-frame` places
`.board` as one of its own grid items (`grid-column: 2 / 17`), so the element
carrying the consumer's `className` must remain the frame's grid item. The
approach to take: render a wrapper around the grid element and the region, give
the wrapper `display: contents` so it disappears from layout and the grid
element stays the frame's item, and make the region visually hidden with the
standard absolutely-positioned clipped pattern so it occupies no grid track.

If that proves troublesome in practice, the recorded fallback is to have the
region rendered by the consumer instead and drop the prop — but take it only if
the wrapper genuinely fails, and record the switch and the reason in this step's
Notes, because `story.md` asks for the region to live in the grid.

Add the region's CSS to `src/board/grid/AccessibleGrid.css`.

Depends on: Step 8 (the same component; keeping the two changes in separate
commits keeps the DOM-structure risk isolated from the activation behaviour).

Verification (automated): `npm test` —

1. In `AccessibleGrid.test.tsx`: with an `announcement` supplied, an element
   with `role="status"` exists and contains that text; changing the prop
   changes the text; with no `announcement` the region is empty (or absent) and
   announces nothing.
2. The region is **outside** the `role="grid"` element — assert the grid does
   not contain it.
3. axe reports no violations, with and without an announcement. (This is the
   check that would catch a live region illegally parented inside the grid.)
4. In `src/board/Board.test.tsx`: the board still renders 225 gridcells in 15
   rows and axe still passes, confirming the wrapper did not disturb the
   board's structure.

Also run `npm run build`, and note in the step's Notes that the board's visual
layout is confirmed by eye at Step 15's gate — jsdom cannot see it.

---

## Step 10 — The board renders from a game state

Status: pending

This is the structural change the story is named for: the board stops being a
picture built once at module load and becomes a picture of a state that moves.

- `src/App.tsx` holds the session with `useReducer`, initialised from Step 6's
  builder over `startingGameState()`, and passes the session down.
- `src/board/Board.tsx` takes the session as a **prop** and builds its 225 cell
  descriptors from it on each render (memoised on the session), replacing the
  module-level `BOARD_ROWS` constant. Each square's occupant now comes from the
  state's ships and each square's site state from the state's site states —
  not from `startingShipAt` and `startingSiteState`.
- Extract `src/board/BoardSquare.tsx` (plus a `.css` file) for one square's
  contents: the site marker beneath the ship, in the same stacking order
  `Board.css` already establishes. This is groundwork for Step 11's markings,
  and it also gives the ship-over-site layering the automated guard story
  00000003 deferred for want of a reachable state — one now exists.
- **Delete `startingShipAt`** from `src/rules/fleet.ts`, which now has no
  production consumer (plan decision 2). `fleet.test.ts`'s rotational-symmetry
  test builds its own square-keyed map locally instead.
- No interaction yet: no activation is wired, nothing is selectable, and the
  board on screen must look **exactly** as it does today.

Watch one thing: the descriptors are a fresh array on every render, so
`AccessibleGrid`'s effect that re-checks the roving-tabindex target runs each
render. It only calls `setFocused` when the focused cell has stopped being
focusable, and every board cell is always focusable, so there is no loop — but
confirm it, because a render loop here would be silent in production and
obvious only as a hot CPU.

Depends on: Step 3 (the state), Step 6 (the session), Step 9 (the grid's final
shape, so the board is wired to it once).

Verification (automated): `npm test` —

1. `src/board/Board.test.tsx` is updated to render `<Board>` with a session
   built directly from the starting game state, and every existing assertion
   still passes **unchanged in expectation**: 225 cells in 15 rows, A15 first
   and O1 last, the fourteen bays named and marked, seventeen site markers with
   five active and twelve dormant, the fourteen ships in their bays with their
   accessible names, and axe clean.
2. A new test renders the board from a **hand-built** state with a ship
   somewhere other than a bay — say a green ship on H8 — and asserts that
   square's accessible name and its ship artwork, proving the board reads the
   state rather than the starting position.
3. A `BoardSquare` test asserts that when a square holds both a site and a
   ship, both are rendered and the site marker precedes the ship in DOM order
   (the layering guard).
4. `src/App.test.tsx` still passes: the heading renders and axe is clean.
5. A repository search finds no remaining reference to `startingShipAt`.

Also `npm run build`.

---

## Step 11 — Drawing selection, destinations and spent ships

Status: pending

Give the board the three new markings from plan decision 9, and say them in the
accessible names.

- `src/board/BoardSquare.tsx` / `.css` gain: a small **solid disc** for a legal
  destination, four inset **corner brackets** for the selected ship's square,
  and, for a ship that has already moved this ply, the ship drawn at reduced
  opacity plus a short **bar** near the square's bottom edge. Express the
  geometry (disc radius, bracket length and inset, bar size, spent opacity) as
  **named constants in one place**, to be tuned at Step 15's gate.
- None of the three may use the amber `--focus-ring` colour, and none may be a
  full square border — that vocabulary belongs to bays and to the focus ring.
  The markings must survive greyscale on their shape alone.
- `src/board/squareLabel.ts` gains **one** optional field on its descriptor: a
  mark, one of "selected", "already moved" or "destination". The three are
  mutually exclusive in practice — a destination is always empty, and a ship
  that has moved can never be selected — so one field, not three flags. The
  segment goes **last**, after the shield count:
  - `G7, green ship, 0 shields, selected`
  - `M10, green ship, 4 shields, already moved this turn`
  - `H8, charged site, can move here`
    "can move here" rather than "legal destination": it is the players'
    vocabulary and it reads as English aloud.
- `Board.tsx` derives each square's mark from the session — the selected ship's
  square, the selected ship's legal destinations (from Step 4's one function,
  never a second calculation), and the ships marked as having moved this ply.

Nothing is wired to input yet; the markings are exercised by rendering the
board from a session that already has a selection. That is deliberate — it
keeps this step free of forward dependencies on Step 12.

Depends on: Step 10 (the board renders from a session), Step 4 (legal
destinations), Step 6 (the session carries the selection).

Verification (automated): `npm test` —

1. `src/board/squareLabel.test.ts`: exact expected strings for each of the
   three marks, on a plain square, on a bay, on a site and on an occupied
   square; and unchanged names when no mark is given.
2. `src/board/Board.test.tsx`: rendered from a hand-built session with a ship
   selected, the selected ship's square carries the selected marking and its
   name ends `selected`; exactly the squares Step 4 calls legal carry the
   destination marking and are named `can move here`; a ship marked as having
   moved carries the spent marking and is named `already moved this turn`; and
   with **nothing** selected, no square carries any of the three.
3. axe reports no violations on the board **mid-selection** as well as at rest.
4. `npm run build` succeeds.

The markings' legibility, greyscale survival and non-collision with sites,
bays, ships and the focus ring are **not** testable in jsdom; they are Step 15's
gate.

---

## Step 12 — Wiring the interaction end to end

Status: pending

Connect input to the session and the session's events to the live region:

- `Board.tsx` passes `onActivate` to `AccessibleGrid`, maps the grid position
  to a square with `squareForGridPosition`, and dispatches the activate intent;
  it passes `onDismiss` and dispatches the dismiss intent.
- `Board.tsx` renders the session's last event through
  `src/board/announcements.ts` and passes the resulting sentence to
  `AccessibleGrid`'s `announcement` prop. The board composes no wording of its
  own.
- Focus must stay where the player put it: after a move, DOM focus remains on
  the cell that was activated. The 225 cells are stable across renders, so this
  should follow from the existing roving-tabindex behaviour — confirm it rather
  than assume it.

After this step the game is playable: select, review, commit, cancel, switch,
and the turn passes after two actions.

Depends on: Step 8 (activation), Step 9 (the live region), Step 11 (the
markings the player reviews), Step 6 (the grammar), Step 7 (the wording).

Verification (automated): `npm test` — new interaction tests in
`src/board/Board.test.tsx` (jsdom, with `@testing-library/user-event`), each
driven **twice**, once by keyboard and once by pointer, asserting both reach
the same state:

1. **Select**: activating an own unmoved ship marks it selected, marks its
   destinations, and announces the selection with a destination count.
2. **Cancel**: activating the selected ship's square again clears every
   marking and announces it; **Escape** does the same.
3. **Switch**: activating a second own unmoved ship moves the selection and the
   destination markings to it.
4. **Move**: activating a legal destination moves the ship — the destination
   square is now named with the ship and the origin square is not — and
   announces the move.
5. **Reject**: activating an enemy ship, an already-moved ship and an
   out-of-reach square each leave the board unchanged and announce the specific
   reason.
6. **Focus**: after a move made by keyboard, focus is on the destination cell
   and `document.activeElement` is inside the grid.
7. axe reports no violations at rest and mid-selection.

Also `npm run build`.

---

## Step 13 — The turn indicator

Status: pending

Add `src/board/TurnIndicator.tsx` (plus its `.css`) and render it in
`src/App.tsx` **between the title and `.app__board`** — never inside
`.app__board`, which is a `container-type: size` box the board measures itself
against, so content placed inside it would change the board's square size.

- Its sentence comes from `src/board/announcements.ts` (Step 7):
  `Green's turn — 2 actions left`, singular at one action. It composes no
  wording itself.
- Players' vocabulary: **turn**, never "ply".
- It is **not** a live region (plan decision 9): the change of turn already
  reaches a screen reader through the board's one live region, and a second
  region would announce it twice.
- No round counter and no score — there is nothing to count or score yet.
- Add only the layout this needs. Do not reintroduce a viewport-derived board
  size, do not reserve slots for chrome that does not exist, and do not stop
  the board filling the space it is given.

Depends on: Step 10 (the session lives in `App`), Step 7 (the wording).

Verification (automated): `npm test` —

1. A new `src/board/TurnIndicator.test.tsx` renders it for green with two
   actions, green with one, and red with two, asserting the exact text, and
   asserting the element is **not** a live region (no `role="status"`,
   `role="alert"` or `aria-live`).
2. `src/App.test.tsx`: the indicator's text appears on the page, and axe is
   still clean.
3. `npm run build` succeeds.

Its placement and behaviour at narrow widths are judged by eye at Step 16.

---

## Step 14 — The temporary fixture

Status: pending

Add `src/game/reviewFixture.ts`, a **temporary** module holding the position
tabled in plan decision 10, and have `src/App.tsx` build its initial session
from it instead of from `startingGameState()` — a change of one import and one
call. **Step 18 deletes it.**

The module's header must say plainly that the arrangement is **not a legal game
state** (nothing is charged or depleted at turn zero and every ship starts in a
bay) and that it exists only so the manual gates have something to look at.

Copy the site states and the fourteen ships from plan decision 10 exactly:

- charged **H8**, **K11**; active **E5**, **K5**, **E11**; depleted **H4**,
  **H12**; the other ten sites dormant.
- green: **G7**/0, **I6**/1, **I10**/2, **M6**/3, **M10**/4, **C5**/0,
  **C7**/0.
- red: **C3**/0, **H3**/0, **A11**/2, **B13**/0, **G13**/4, **K7**/1,
  **N9**/3.

Constraints, all load-bearing:

- **It lives in `src/game/`, never `src/rules/`.** No test under `src/rules/`
  may reference it.
- **No automated test anywhere may depend on it.** Every test builds its own
  position; `App.test.tsx` in particular must keep asserting only the shell
  (its heading, the turn indicator's presence, axe) and never a fixture
  position. If any existing test breaks when the fixture goes in, that test was
  reading the app's initial position and must be rewritten to build its own —
  otherwise Step 18 would take the coverage with it.
- Keep it a plain data module: no route, no query parameter, no
  `import.meta.env` branch.

Depends on: Step 12 (the game is playable, so there is something to look at)
and Step 13 (the indicator is on screen). It comes **after** every automated
step deliberately: all the coverage that must survive Step 18 is already in
place, so nothing can quietly come to rest on the fixture.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm run build` all pass **with no test changed to
accommodate the fixture**. Confirm by inspection that no file outside
`src/game/reviewFixture.ts` and the one call site in `src/App.tsx` mentions it.
The gates that use it are Steps 15–17.

---

## Step 15 — Manual gate: movement (ranges, blocking, sites, bays)

Status: pending

No code. `story.md`'s manual gates 1–4, taken with the fixture in place — the
only moment the board can show all five ranges, all four site states, and a
shielded ship that can reach a bay. This is also where the marking geometry
from Step 11 (disc radius, bracket length and inset, bar size, spent opacity)
is settled: adjust the constants against the running board until the gate
passes, and record the final values and why they moved in this step's Notes.

Depends on: Step 14 (the fixture).

Verification (manual): run `npm run dev`, open `http://localhost:5273`, and
**reload the page before each check** (the fixture resets on reload; moves you
have already made do not undo). Confirm all of:

**1. The five ranges.** Select each green ladder ship in turn and count the
highlighted destinations against §6:

| Ship          | Shields | Expected destinations                                             |
| ------------- | ------- | ----------------------------------------------------------------- |
| green **M10** | 4       | **4** — M9, M11, L10, N10                                         |
| green **M6**  | 3       | **8** — the four orthogonal neighbours and the four diagonal ones |
| green **I10** | 2       | **12**                                                            |
| green **I6**  | 1       | **16**                                                            |
| green **G7**  | 0       | **20**                                                            |

and confirm **no three-square diagonal** is ever offered — from G7, K11, E3,
E11 and K3 must all be unhighlighted.

**2. Blocking.** Select green **C5**. Two squares north (C7, friendly) and two
south (C3, enemy) are **not** offered, and neither is three north (C8) or three
south (C2), because the path is blocked. One north (C6) and one south (C4)
**are** offered, as are the two- and three-square moves east (E5, F5) with a
clear path. Confirm a friendly ship and an enemy ship block identically.

**3. Sites.** Select red **H3** (you will need to play green's two actions
first, then it is red's turn): the depleted **H4** is not offered, while H5
(two squares, over H4) and H6 (three squares, over H4 and H5) are — and making
that move works. Select red **B13**: the dormant **B12** is not offered while
B11 (over it) is. Select green **G7**: the charged **H8** and the active **E5**
**are** offered, and moving onto H8 works. Confirm **no site's appearance
changes** when a ship crosses it or lands on it, and that the site marker still
reads clearly under the ship standing on it.

**4. Bays.** Select red **A11** (two shields, two arcs drawn). Moving one
square south into the empty **A10** bay puts it there with **no shield arcs at
all**. Reload, select A11 again, and move two squares south to **A9**, flying
**over** the A10 bay: it arrives still carrying its two arcs.

**5. The markings.** Throughout: the selected ship, the legal destinations and
any already-moved ship are each tellable at a glance, from each other and from
a bay, a site in each of its four states, the ships and the shield arcs; the
markings do not obscure a ship or a site marker; and with colour removed
(browser devtools greyscale emulation or the OS colour filter) all three are
still readable. The keyboard focus ring is still unmistakable on top of every
combination.

If a check fails, record what was seen in this step's Notes before any fix.

---

## Step 16 — Manual gate: plies, rejections and keyboard-only play

Status: pending

No code. `story.md`'s manual gates 5–7, with the fixture still in place.

Depends on: Step 15 (the board reads correctly, so what is being judged here is
the interaction).

Verification (manual): with `npm run dev` running at
`http://localhost:5273`, reloaded fresh, confirm all of:

**5. Plies.** Green moves first. Two moves pass the turn to red, and two more
pass it back. A ship that has moved cannot be moved again in the same turn —
selecting it is refused, and it is visibly marked as spent — but can be moved
again on its side's next turn, when the spent markings have cleared. The turn
indicator agrees with the board throughout, counts down 2 → 1 → 2 as actions
are spent, and says **"turn"**, never "ply".

**6. Rejected input.** Each of these gives a clear explanation in plain
language, and nothing on the board changes: activating an opponent's ship;
activating one of your own ships that has already moved this turn; with a ship
selected, activating a square it cannot reach; activating a square whose path
is blocked; activating the dormant **B12** or the depleted **H4** as a
destination; and activating an empty square with nothing selected.

**7. Keyboard only.** Play a full turn for **each** side without touching the
mouse: Tab into the board, arrow to a ship, press **Enter** to select, arrow
over the highlighted destinations to review them, press **Space** or **Enter**
to commit, and use **Escape** and a second activation on the selected ship to
cancel. Focus never goes missing — after every move, the focus ring is still
visible and on a sensible square — and the board is still a single tab stop
with arrow navigation clamping at the edges.

**8. Layout.** The turn indicator sits above the board and reads clearly; the
board still fills the room it is given, still stays square, and narrowing the
window does not clip the board or push it off the top of the page.

If a check fails, record what was seen in this step's Notes before any fix.

---

## Step 17 — Manual gate: screen reader

Status: pending

No code. `story.md`'s manual gate 8, taken while the fixture is in place so a
full range of shield counts, all four site states and both sides can actually
be heard.

Depends on: Steps 15 and 16 (the board and the interaction are settled).

Verification (manual): with `npm run dev` running at `http://localhost:5273`
and a screen reader active (VoiceOver on macOS, NVDA on Windows, or Orca on
Linux), confirm all of:

1. Arrowing across the board announces each square as before — square name,
   bay or site state, ship, shield count — and now also announces
   **"selected"** on the selected ship's square, **"can move here"** on each
   legal destination, and **"already moved this turn"** on a spent ship.
2. Selecting a ship is announced, and the announcement **counts** the available
   moves rather than listing them.
3. A move is announced, naming the side and the two squares; a move into a bay
   also says the ship lost its shields.
4. The change of turn is announced.
5. Each rejection is announced in plain language, names the square, and never
   uses a technical word or the word "ply".
6. Nothing repeats itself into noise: arrowing across many highlighted
   destinations does not produce a torrent, and the live region does not
   re-read the whole board. If two identical rejections in a row are not
   re-announced, note it — plan decision 8 accepts that rather than engineering
   around it, but the owner should judge whether it is a problem.
7. The wording makes sense read aloud at speed; nothing extraneous is announced
   from the ship, site or marking artwork.

The pass condition is intelligibility, not an exact string. If any wording
grates aloud, change it in `src/board/announcements.ts` or
`src/board/squareLabel.ts`, update their tests to match, and record the change
and the reason in this step's Notes.

---

## Step 18 — Remove the temporary fixture

Status: pending

Delete `src/game/reviewFixture.ts` and return `src/App.tsx` to building its
initial session from `startingGameState()`. Nothing else changes.

After this step the app opens on the real starting position: fourteen ships in
their bays, all on 0 shields, five active sites and twelve dormant, nothing
charged or depleted, green to move with two actions.

Do **not** remove or weaken any test added by Steps 1–13. None of them depends
on the fixture, and after this step they are the only coverage of everything
the starting position cannot show — four of the five movement ranges, both site
restrictions and the bay reset.

Depends on: Steps 15, 16 and 17 — every gate that needs the fixture has been
taken. A revert scheduled earlier would leave nothing to look at.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm run build` all pass, and:

1. A repository-wide search for `reviewFixture` (and for the module's exported
   name) returns nothing outside `doc/`.
2. Tests assert the shipped starting position: `STARTING_FLEET` is fourteen
   ships, all on 0 shields, on the fourteen bay squares `rules.md` §4 names;
   the starting game state has five active sites and twelve dormant with
   nothing charged or depleted; green is to move with two actions.
3. `src/rules/rulesVersion.test.ts` passes with `RULES_VERSION` unchanged at
   `"0.3"`.

---

## Step 19 — Manual gate: the board after the revert

Status: pending

No code. `story.md`'s manual gate 9: a last look at what a player will actually
open.

Depends on: Step 18 (the fixture is gone).

Verification (manual): run `npm run dev`, open `http://localhost:5273`, and
confirm:

1. Fourteen ships sit one per bay in §4's clockwise pattern from H15, with
   **no shield arcs anywhere**.
2. Seventeen sites are marked: **H8**, **E5**, **K5**, **E11** and **K11**
   active, the other twelve dormant, nothing charged or depleted.
3. The turn indicator says it is green's turn with two actions left.
4. A game can still be played from here: selecting a green ship in a bay offers
   its twenty destinations (clipped by the board's edge, since every bay is on
   it), a move works, two moves pass the turn to red, and the indicator keeps
   up.
5. No leftover fixture artefact is anywhere on screen, and nothing else about
   the board has changed from before this story — bays still marked, edge
   labels still aligned, sizing still behaving.

---

## Step 20 — README check

Status: pending

Review `README.md` against what this story changed and update it if it is now
inaccurate. The `/update-readme` command does this from the branch diff.

The specific thing to weigh: the status callout currently ends "**There are no
turns, and no way to move or fight.**" Both halves are now wrong — there are
turns, and ships move. Rewrite it for a non-technical player in the players'
vocabulary ("turn", "node", "site"): the app now plays turns and moves ships,
green first, two moves a turn — but there is still no fighting, nodes never
wake or run down, no shields are gained and nothing is scored.

Also confirm what this story deliberately did **not** touch:
`doc/ruleset/rules.md` and `doc/ruleset/changelog.md` must be untouched by this
branch, and `RULES_VERSION` must still be `"0.3"`.

Depends on: Step 19 (the story's behaviour is confirmed).

Verification (automated): `npm run typecheck`, `npm run lint`, `npm test`,
`npm run format:check` and `npm run build` all pass;
`git diff main --name-only -- doc/ruleset/` returns nothing;
`src/rules/rulesVersion.test.ts` passes with `RULES_VERSION` at `"0.3"`; and
`git diff main --stat` shows the expected shape of the change — `src/rules/`
gaining `movement.ts`, `gameState.ts` and `ply.ts`, a new `src/game/` folder
with `session.ts` and **no** `reviewFixture.ts`, `src/board/` gaining
`announcements.ts`, `BoardSquare.tsx` and `TurnIndicator.tsx`, and no change
under `doc/ruleset/`.
