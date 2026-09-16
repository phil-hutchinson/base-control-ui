# Implementation Plan — Story 00000082, The board prices the move

## What this story does

Selecting a ship today draws three markings: four corner brackets on the
selected ship's own square, a small solid disc on every legal destination, and
a hollow ring around every legal target. This story **deletes the brackets**
and makes the other two markings **say what the move costs**:

- A **zero-cost** destination keeps today's small solid disc; a zero-cost
  target keeps today's bare hollow ring.
- A destination that costs 1, 2 or 3 power draws **that many fuel bars**,
  stacked, in place of the disc — the same bar the ship's own power gauge
  draws on its hull, dark underlay and all.
- A target that costs 1, 2 or 3 power keeps its ring **and** draws the same
  stack of bars inside it, over the enemy ship. The ring stays because the
  ring is what tells an attack from a move.

The bars are drawn in the existing interaction accent (`--interaction-accent`,
the blue the disc and ring already use), **not** in the side's colour: the
selection markings are one layer, and shape — not colour — is what tells the
members of that layer apart.

The cost must reach the square **from the rules layer**. Today
`legalDestinations` and `legalTargets` throw the cost away and hand back bare
squares; this plan adds cost-carrying siblings and leaves the bare-square
functions in place for their many other callers.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions — code in this repository deliberately carries no
design history (`CONTRIBUTING.md`, "Comments"), so this document is the only
place the reasoning is written down.

## Baseline on this branch

Branch `feat/82-movement-hints`, clean at the start of planning (`story.md`
already committed).

- `npm test` — **66 test files, 1278 tests, all green**.
- `npm run typecheck` and `npm run lint` — clean.
- `npx prettier --check .` — **two pre-existing warnings**:
  `doc/plan/00000069-retire-actions/story.md` and `src/board/planetArt.ts`.
  Both predate this branch; neither is this story's to fix, and neither should
  be "tidied" in passing. (This story's own `story.md` was flagged during
  planning and has since been formatted and committed, so it is no longer in
  the list.) If this `implementation-plan.md` is itself flagged, run
  `npx prettier --write doc/plan/00000082-movement-hints/implementation-plan.md`
  on it alone.

The test count should **rise** over this story. No step may lower it.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say (`CLAUDE.md`, Vocabulary).
- **Move** means the movement action specifically — one ship changing
  squares. It is never a synonym for a ply or a turn.
- **Power** is the code's and `rules.md`'s word; **fuel** is what the guide
  and the game's screens say. The marking this story draws is a _fuel bar_ to
  a player and a _cost in power_ to the code. The board square's accessible
  name already says "power 4 of 6", so the cost clause this story adds to that
  same sentence says **power** too (D3) — do not introduce "fuel" into
  `squareLabel.ts`.
- **Node** is the word everywhere.

## Settled decisions — do not reopen

These come from `story.md` and the discussion around it. A step that finds one
inconvenient escalates to the owner rather than re-deciding it.

- **S1. This is a UI-only story.** No rule changes at all. `doc/ruleset/rules.md`
  is **not** edited, `RULES_VERSION` is **not** bumped, and no `changelog.md`
  entry is written. §6's shapes and prices and §7's charge for a shot are
  exactly as they are; the board simply starts showing what they already say.
  There is deliberately **no** rules step at the head of this plan.
- **S2. The brackets go entirely** — the drawing, its geometry constants and
  its helper. A selected ship is drawn exactly as an unselected one.
- **S3. The `"selected"` mark itself stays** in the type and in the accessible
  name: the square of a selected ship still reads `…, selected`. Only the
  picture disappears.
- **S4. The pinned ship's invisible selection is accepted.** A ship with no
  legal destination and no legal target looks, when selected, exactly as it did
  before. Recorded, not repaired (Step 2, D8).
- **S5. A zero-cost move and a zero-cost attack look exactly as they do
  today** — the disc and the bare ring, unchanged shapes and unchanged sizes.
- **S6. The bar count comes from the move's own cost**, not from a hardcoded
  maximum of three (D5).
- **S7. The bars are the interaction accent**, never the side's colour, and
  they carry the hull gauge's dark underlay (D6).
- **S8. The pinned-ship condition marking is untouched** — dampened hull,
  hollow bar at the bottom edge. It is a ship's own condition, not part of the
  selection layer, and a square can still carry a condition and a selection
  mark at once.
- **S9. The Quick Guide keeps its digits.** `src/guide/guideDiagrams.tsx` and
  `src/guide/movementCosts.ts` are **out of scope** and must not be touched:
  the guide is a reference table where a digit reads faster than a stack of
  bars.
- **S10. Selection behaviour does not change** — what can be selected, what
  activating a square does, and what `announcements.ts` says when a ship is
  selected are all exactly as now. No step edits `src/game/session.ts` or
  `src/board/announcements.ts`.
- **S11. The cost arrives from the rules layer**, computed once where §6 is
  implemented, and is never recomputed in the view (D1).
- **S12. No accessibility repair steps, no review fixtures, no manual test
  scripts** (`CLAUDE.md`, pre-release stance; owner's standing preferences).
  Where an existing automated test has a straightforward path to being
  updated, update it. Manual verification never asks the owner to check
  live-region or announcement wording — the automated suite covers that.
  Adding the cost to the accessible names (D3) is **not** accessibility repair
  work: it is new content arriving, and the name is the only place a screen
  reader can learn a price the bars state visually.

## Decisions this plan makes

### D1. The cost travels as new cost-carrying rules functions, beside the existing square-only ones

`src/rules/movement.ts` gains **`legalMoves(state, shipId): readonly ReachEntry[]`**
and `src/rules/combat.ts` gains **`legalAttacks(state, shipId): readonly ReachEntry[]`**.
Each returns the same set of squares its existing sibling returns, but as the
full `ReachEntry` the module already builds — `destination`, `passedOver`,
`cost`. `legalDestinations` and `legalTargets` become thin projections of the
new functions (`.map(entry => entry.destination)`), so there is exactly one
place in each module that decides what is legal.

Rejected alternatives, with reasons:

- **Widening `legalDestinations` / `legalTargets` to return entries.** Roughly
  forty call sites across `src/rules`, `src/game` and the test suite consume
  these as bare squares (`toContainEqual(squareFromName("E8"))`,
  `.map(squareName)`, `.length`), and almost none of them wants a cost.
  Widening would spread this UI story across a dozen rules test files for no
  gain and would make the story's diff unreadable at review.
- **Recomputing the cost in the view** with `shapeReaching(origin, square)`.
  Cheap to write, and explicitly refused by `story.md`: the view would carry a
  second path into §6's table and could, after some future rules change,
  disagree with the very list of squares it was handed. The rules layer
  computes the cost as part of deciding legality; it should hand it over
  rather than throw it away and let the caller find it again.
- **A new narrow `{ square, cost }` type in the rules layer.** `ReachEntry`
  already exists, already carries the cost, and is already the unit
  `reachFrom`, `allShapesFrom` and `attackReach` speak in. A second, nearly
  identical type would need its own name, doc comment and conversions. The
  _view_ narrows the entry to what it needs (D10); the rules layer does not
  need a narrower type to hand it over.

A note for the implementer: `ReachEntry`'s field is called `destination` even
in `legalAttacks`, where the square holds the ship being shot at. That is
already true of `attackReach`, which returns a `ReachEntry` for a target
square, so this is consistent with the module as it stands, and combat's
doc comments already explain that attack range _is_ movement range.

**One shape per square.** §6's thirty-six shapes give every reachable square
exactly one shape, so "the cost of moving to that square" is unambiguous and
no tie needs breaking. Step 1 pins that with a test, so a future §6 that broke
it would fail loudly here instead of silently letting the board draw whichever
price came first.

### D2. `SquareMark` becomes a discriminated union that carries the cost

`src/board/squareLabel.ts`'s `SquareMark` stops being the string union
`"selected" | "destination" | "target"` and becomes a union of objects
discriminated by a `kind` field: the selected mark carries nothing else, and
the destination and target marks each carry a `cost: PowerLevel`.

Rejected: keeping the string and adding a separate optional `cost` alongside it
on `BoardSquareProps` and `SquareLabelDescriptor`. It is a smaller diff, but it
makes two impossible states representable — a selected square with a cost, and
a destination with no cost — and both would have to be handled defensively at
every point of use. The union makes the compiler carry that rule instead, which
is the same reason `BoardSquare` already keeps "a gauge with no level" and "a
level with no gauge" unrepresentable (`ShipModel.tsx`'s header comment).

`PowerLevel` (0–6, `src/rules/power.ts`) is the type of the cost, matching
`ReachEntry.cost`. The plan does **not** introduce a narrower `0 | 1 | 2 | 3`
cost type: §6's table is free to price a shape at 4 later, and the drawing is
built to follow it (S6).

The union stays exclusive — a square carries at most one mark, for the reason
the existing doc comment gives (the selected ship's own square is neither a
destination nor a target; a destination is empty; a target holds an enemy
ship). `Board.tsx`'s existing precedence (selected, else destination, else
target) is unchanged.

### D3. The accessible names state the cost, always, in power

The wording:

| Mark        | Name segment                                                         |
| ----------- | -------------------------------------------------------------------- |
| selected    | `selected` (unchanged)                                               |
| destination | `can move here, costs N power`                                       |
| target      | `can attack here, costs N power, both ships would return to planets` |

So `G7, can move here, costs 1 power` and
`H9, red ship, power 4 of 6, can attack here, costs 2 power, both ships would return to planets`.

Three sub-decisions, each with its rejected alternative:

- **The cost is stated even when it is zero** (`costs 0 power`), rather than
  omitted or replaced by "free". This follows the precedent already written
  into `squareLabel.ts`'s header comment for the power level: the level is
  stated even at zero "so a listener hearing one square at a time can tell a
  drained ship apart from an app that never reports power at all". The same
  argument applies exactly: a listener who hears no cost clause cannot tell a
  free move from an app that does not price moves. "Free" was considered and
  rejected for the same reason plus one more — it makes the zero case parse
  differently from every other, for a listener who is comparing squares.
- **The cost sits immediately after the mark phrase**, not at the end of the
  sentence. For a target that means it is read _before_ the "both ships would
  return to planets" outcome clause. The cost is part of what the mark _is_;
  the outcome clause is a longer explanation of what activating the square
  does, and burying the price behind it would make every target square's price
  the last thing heard.
- **The word is "power", not "fuel"**, because the clause joins a sentence
  that already says "power 4 of 6". Mixing the two vocabularies inside one
  spoken sentence would be worse than either choice on its own.

Wording lives in `squareLabel.ts` as it does today; `MARK_WORDING`'s
`Record<SquareMark, string>` shape cannot survive the union, so it becomes a
function from a mark to its phrase. No other module composes these phrases.

### D4. The bars are drawn inside the existing mark SVG — one mark element per square

A marked square keeps rendering **exactly one** `.board-square__mark` element
(plus the separate condition mark when the ship is pinned, exactly as today).
The destination mark's SVG draws either the disc or the bar stack; the target
mark's SVG draws the ring, plus the bar stack when the cost is non-zero. The
class names `board-square__mark--destination` and `board-square__mark--target`
are unchanged and keep their meanings, so `BoardSquare.css`'s single
`.board-square__mark` colour rule keeps applying and the existing test that
asserts a target square carries exactly one mark keeps passing unchanged.

Rejected: a third mark element (`board-square__mark--cost`) stacked over the
disc/ring by the square's single-cell grid. It would work, but it splits one
marking across two elements, breaks the "exactly one mark" invariant the tests
and the header comment both state, and gives the destination case an element
whose partner (the disc) is absent.

Each bar renders as a group carrying a `data-cost-bar` index attribute,
mirroring `ShipModel`'s `data-gauge-slot`, so tests can count bars without
depending on how many `<line>` elements one bar happens to be made of.

### D5. The stack's geometry: the gauge's own bar, the gauge's own row spacing, centred

The bars reuse `src/ships/shipArt.ts`'s exported gauge geometry —
`GAUGE_BAR_LENGTH` (18), `GAUGE_BAR_STROKE_WIDTH` (6),
`GAUGE_BAR_UNDERLAY_STROKE_WIDTH` (11) and `GAUGE_UNDERLAY_COLOR` — imported
into `BoardSquare.tsx`. `shipArt.ts` itself needs **no change**; `BoardSquare`
already imports from `src/ships` (`ShipModel`), so this is not a new
dependency direction. Drawing a bar twice, coincident — dark underlay first,
then the coloured stroke on top, both round-capped — is what makes it read as
the same object as the hull gauge's bar, so the drawing must keep that double
stroke rather than simplify to one line.

A new constant in `BoardSquare.tsx`, beside the other mark geometry, gives the
**vertical spacing between stacked bars: 16 units**, which is the hull gauge's
own row spacing (`GAUGE_SLOT_POSITIONS`' two rows sit at y 10 and y 26). It is
written down as its own named constant with a comment saying where the number
comes from, rather than derived from `GAUGE_SLOT_POSITIONS` at runtime: the
derivation would be clever, would break silently if the gauge were ever
re-laid-out into one row, and buys nothing.

The stack is **centred on the square's centre** (50, 50) in the same 0–100
viewBox everything else in the square uses, with the bars generated from the
count: one bar sits at y 50; two at 42 and 58; three at 34, 50 and 66. Centring
is what puts the bars where the disc is, and what puts them concentric inside
the ring.

**The three-bar fit inside the ring, worked out here so the step does not have
to guess.** The ring's radius is 32 with a stroke of 6, so its inner edge is at
radius 29. The outermost point of a three-bar stack is the round cap at the end
of the top bar: its centre is at (41, 34), 18.4 units from the square's centre,
plus half the underlay stroke (5.5) — about 24 units, leaving roughly 5 units
of clear space inside the ring. Four bars at the same spacing would reach about
31 units and start to touch the ring; if §6 ever prices a shape at 4 that is
the moment to revisit the spacing. The drawing will still render — the count
drives the stack, so nothing breaks — it will simply be tight, and that is a
knowing, recorded limit rather than a bug. Deliberately **not** done now:
shrinking the spacing automatically as the count grows, which is machinery for
a case the rules do not produce.

### D6. The bars' colour: the interaction accent on top, the gauge's dark underlay beneath

The coloured stroke is `currentColor`, which `.board-square__mark` sets to
`var(--interaction-accent)` — the same blue as the disc and the ring. The
underlay stays `GAUGE_UNDERLAY_COLOR`, the hull gauge's near-black, which is
what keeps the bars legible where they sit over an enemy ship's artwork inside
a target ring.

Rejected: the side's gauge colour (`GAUGE_PALETTE`). It would tie the bar to
"whose ship" when the bar is saying "what this costs you", and it would break
the one-accent selection layer that `BoardSquare.css`'s comment describes.
Shape does the recognising — a player who reads their own gauge recognises the
bar — and colour says which layer the mark belongs to.

### D7. The brackets' removal takes its whole apparatus with it

Step 2 deletes, from `BoardSquare.tsx`: `SelectedMark`, `bracketPath`,
`BracketCorner`, `BRACKET_CORNERS`, `SELECTED_BRACKET_INSET`,
`SELECTED_BRACKET_LENGTH`, `SELECTED_STROKE_WIDTH` and the
`mark === "selected"` render branch. No CSS rule targets
`board-square__mark--selected`, so no stylesheet rule is orphaned, but
`BoardSquare.css`'s comment above `.board-square__mark` lists "(destination,
selected, and the ship condition)" and must be corrected. `BoardSquare.tsx`'s
header comment describes "one of three selection markings" and must be
corrected too — both are load-bearing prose about what the module draws.

### D8. The one accepted cost is recorded in the accessibility ledger

Selecting a **pinned** ship — one that can neither move nor attack — now
produces no visible change anywhere on the board (S4). Every other selection
lights a fan of marks around exactly one origin, so the origin is still
obvious; the pinned ship is the one case with nothing to fan. A screen-reader
user is unaffected, because the square still reads `…, selected`. The loss
falls on a sighted player, and it is recorded as a note under a new "From
story 82" section in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` as part of Step 2 —
the step that causes it. That document is a ledger of knowingly accepted costs,
not an audit; nothing else from this story goes in it.

### D9. `Board.tsx` builds cost maps, keyed by square name

`Board.tsx` currently builds two `Set`s of square names from `legalDestinations`
and `legalTargets`. It will instead build two `Map<string, PowerLevel>`s from
`legalMoves` and `legalAttacks`, keyed by `squareName(entry.destination)` with
the entry's `cost` as the value, and read the cost out when it constructs the
mark. Keying by square name (not by `Square` object identity) is what the
component already does everywhere, because `Square` values are compared by
name throughout the codebase.

The `useMemo` and its dependencies, the grid walk, the precedence between the
three marks, and the target's extra `&& ship` guard are all unchanged.

### D10. Step order: rules first, brackets second, type third, drawing fourth

The brackets' removal (Step 2) is sequenced early and on its own because it is
independent of everything else and is one of the story's "done when" bullets in
its own right; putting it after the type change would mix a deletion into a
diff about costs. The type change (Step 3) lands before the drawing (Step 4) so
that the drawing step has the cost in hand and changes nothing but pixels: at
the end of Step 3 the board reads the new names aloud while still drawing
today's disc and ring, which is a deliberately verifiable halfway point.

## Steps

### Step 1 — The rules layer hands over the cost

Status: committed

Notes: Implemented exactly as specified — `legalMoves` and `legalAttacks`
were built by moving the bodies of `legalDestinations` and `legalTargets`
into the new functions unchanged (returning `ReachEntry[]` instead of
`Square[]`), and the old names became one-line `.map(entry => entry.destination)`
projections. `reachFrom`, `allShapesFrom`, `shapeReaching`, `attackReach`,
`moveRefusalReason` and `attackRefusalReason` were untouched. Added the
specified tests to `movement.test.ts` (a `legalMoves` describe block pricing
every §6 shape, agreement with `legalDestinations` in a rich position and two
empty ones, and a 2-power ship never offering a cost-3 entry; an
`allShapesFrom` describe block pinning "one shape per square") and to
`combat.test.ts` (a `legalAttacks` describe block pricing an orthogonal
neighbour at 0 and an L-square enemy at 2, and agreement with `legalTargets`
in the same position) — no existing test expectation in `src/rules/` or
`src/game/` was edited, only new `it` blocks added. `npm run typecheck`,
`npm run lint` and `npm test` are all green (66 files, 1284 tests, up from
1278 by exactly the 6 new cases added). No deviation from the plan.

Add `legalMoves(state, shipId)` to `src/rules/movement.ts` and
`legalAttacks(state, shipId)` to `src/rules/combat.ts`, each returning the
module's existing `ReachEntry` values — `destination`, `passedOver`, `cost` —
for exactly the squares its existing sibling already returns (D1).

Implementation shape, so the two functions cannot drift from the squares they
must agree with: move each existing function's body into the new one, keeping
every guard exactly as it is (`isGameOver`, the side-to-move check, the trapped
check, the planet/charged-node checks in combat, and the final
`moveRefusalReason` / `attackRefusalReason` filter — filtering on
`entry.destination`), and then redefine `legalDestinations` and `legalTargets`
as `legalMoves(...)` / `legalAttacks(...)` mapped to their `destination`. Their
exported signatures, names and behaviour must not change: every existing caller
and test keeps working untouched. Give each new function a doc comment in the
style of its neighbours, citing rules.md §6 for movement and §6/§7 for combat,
and say in `legalDestinations`' and `legalTargets`' comments that they are the
square-only projections of the new functions.

`combat.ts` already imports from `movement.ts`; no new import direction is
created.

Do not change `reachFrom`, `allShapesFrom`, `shapeReaching`, `attackReach`,
`moveRefusalReason` or `attackRefusalReason`.

**Tests** (extend `src/rules/movement.test.ts` and `src/rules/combat.test.ts`;
follow each file's existing state-building helpers):

- `legalMoves` on an open board for a full-power ship prices every §6 shape as
  §6's table does: an orthogonal single step 0; a diagonal single step 1; two
  orthogonal and the L 2; three orthogonal, two diagonal and the long knight 3.
  Name the squares explicitly from a known origin rather than looping over the
  table, so the test would catch a table that changed under it.
- `legalMoves(...).map(entry => entry.destination)` equals `legalDestinations(...)`
  for at least one rich position, and both are empty in a position where the
  existing tests already expect emptiness (a trapped ship, or the wrong side to
  move).
- A ship at 2 power yields no entry with `cost` 3 from `legalMoves`.
- `legalAttacks` gives an enemy one orthogonal step away `cost` 0 and an enemy
  an L away `cost` 2, and `legalAttacks(...).map(entry => entry.destination)`
  equals `legalTargets(...)` in the same position.
- **One shape per square**: `allShapesFrom` from a centre square produces no
  two entries with the same destination square name (D1). This pins the
  assumption the whole story rests on — that a destination has exactly one
  price.

Depends on: nothing. This is the first step.

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
all green, with the new cases present and **no existing expectation in
`src/rules/` or `src/game/` edited** — if one had to change, the refactor was
not behaviour-preserving, and that must be recorded in `Notes:` and escalated.

### Step 2 — The selected ship's square loses its brackets

Status: committed

Notes: Deleted `SelectedMark`, `bracketPath`, `BracketCorner`,
`BRACKET_CORNERS`, `SELECTED_BRACKET_INSET`, `SELECTED_BRACKET_LENGTH`,
`SELECTED_STROKE_WIDTH` and the `mark === "selected"` render branch from
`BoardSquare.tsx`; corrected its header comment and `BoardSquare.css`'s
comment above `.board-square__mark` per D7. `SquareMark` and `MARK_WORDING`
were left untouched (S3). Reworked the two `BoardSquare.test.tsx` cases as
specified: "renders no mark at all when marked as selected" replaces the old
selected-mark assertion, and the condition-plus-selection case now asserts a
pinned, selected square renders the condition mark and exactly one mark
overall. Added the "From story 82" section to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` recording the
pinned-ship accepted cost (D8). `npm run typecheck`, `npm run lint` and
`npm test` are all green (66 files, 1284 tests — unchanged from Step 1, since
this step reworks two existing cases rather than adding new ones), and
`grep -ri bracket src/` returns nothing. No deviation from the plan.

Remove the corner-bracket drawing and its whole apparatus from
`src/board/BoardSquare.tsx` (D7): the `SelectedMark` component, the
`mark === "selected"` render branch, `bracketPath`, the `BracketCorner`
interface, `BRACKET_CORNERS`, and the `SELECTED_BRACKET_INSET`,
`SELECTED_BRACKET_LENGTH` and `SELECTED_STROKE_WIDTH` constants. Nothing else
in the square changes: the destination disc, the target ring, the condition
bar, the dampening and the stacking order all stay exactly as they are.

`SquareMark` keeps its `"selected"` member and `squareLabel` keeps the word
(S3) — a selected square still reads `…, selected`. `Board.tsx` keeps marking
the selected ship's square. Only the picture goes.

Correct the two prose descriptions that now misdescribe the module:
`BoardSquare.tsx`'s header comment ("one of three selection markings — …") and
`BoardSquare.css`'s comment above `.board-square__mark` (which lists
"destination, selected, and the ship condition").

Record the accepted cost (D8): add a new final section to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, headed for story
82 in the shape the existing sections use (a "From story 82 — …" heading naming
this plan as its source, then a numbered note). The note says that selecting a
**pinned** ship — one that can neither move nor attack — now produces no
visible change at all, since the brackets were the only marking that square
carried and the ship's dampened hull and bottom-edge bar mean _pinned_, not
_selected_; that a screen-reader user is unaffected because the square still
reads `…, selected`; and where it lives (`src/board/BoardSquare.tsx`,
`src/board/Board.tsx`).

**Tests** in `src/board/BoardSquare.test.tsx`: replace the "renders the
selected mark when marked as selected" case with one asserting the opposite —
a square marked selected renders **no** `.board-square__mark` element at all —
and rework "renders a condition mark and a selection mark together" so it
asserts that a pinned, selected square draws the condition mark and nothing
else. Leave the axe case's `mark="selected"` prop alone; it still exercises a
pinned square with a condition mark, and its "every mark is `aria-hidden`" loop
is vacuous-but-harmless for the selection mark now.

`src/board/Board.test.tsx`'s accessible-name expectations for selected squares
are unaffected and must not be touched.

Depends on: Step 1 only for ordering (Step 1 is committed first); no code
dependency.

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
green, with `grep -ri bracket src/` returning nothing.

### Step 3 — The mark carries its cost, and the names say it

Status: committed

Notes: Implemented exactly as specified. `SquareMark` in `squareLabel.ts`
became the discriminated union from D2, `MARK_WORDING`'s `Record` became the
`markWording` function producing exactly D3's wording (cost stated even at
zero, ahead of the target's outcome clause, in "power"), and the module's
header comment and the type's doc comment were updated to explain why.
`Board.tsx` was reworked per D9: `destinationCosts` and `targetCosts` are now
`Map<string, PowerLevel>`s built from `legalMoves` and `legalAttacks`, read
with `.get(name)!` when building the mark object (the same non-null-assertion
style already used elsewhere in the codebase, e.g. `trap.ts`), with precedence,
`useMemo` and the target's `&& ship` guard all unchanged. `BoardSquare.tsx`'s
two render branches switched from `mark === "destination"` to
`mark?.kind === "destination"` (and likewise for `"target"`); nothing else in
that file changed, so the board still draws today's disc and ring regardless
of cost, as the step requires. Updated existing expectations in
`squareLabel.test.ts`, `Board.test.tsx`, `App.test.tsx`,
`GameOverPanel.test.tsx` and `BoardSquare.test.tsx` to the object form and the
new wording (working out each scenario's real §6 cost from its squares rather
than guessing), and added the specified new cases: two zero-cost cases in
`squareLabel.test.ts` (a free destination and a free target), and two new
cases in `Board.test.tsx` — a full-power ship's four shape tiers (orthogonal
0, diagonal 1, L 2, long knight 3) and an L-away target's cost sitting ahead
of the "both ships would return to planets" clause. `npm run typecheck`,
`npm run lint` and `npm test` are all green (66 files, 1288 tests, up from
1284 by the 4 new cases). No deviation from the plan.

Change `SquareMark` in `src/board/squareLabel.ts` into the cost-carrying
discriminated union (D2): a `kind` of `"selected"`, `"destination"` or
`"target"`, with the latter two each carrying a `cost` of type `PowerLevel`
(imported from `src/rules/power.ts`, already imported there for `MAX_POWER`).
Update the type's doc comment to say what the cost is (rules.md §6's price for
the shape that reaches the square, and §7's charge for the shot) and to keep
its existing explanation of why the three are exclusive.

Replace `MARK_WORDING`'s `Record` with a function from a mark to its phrase,
producing exactly the wording in D3:

- selected → `selected`
- destination → `can move here, costs N power`
- target → `can attack here, costs N power, both ships would return to planets`

with the cost stated even when it is 0. Record in the module's header comment
that the cost is stated at zero for the same reason the power level is.

`src/board/Board.tsx` (D9): replace the two `Set`s of square names with two
`Map<string, PowerLevel>`s built from Step 1's `legalMoves` and `legalAttacks`,
and build the mark object from the map's value. Precedence between the three
marks is unchanged, as are the `useMemo`, its dependencies and the target's
`&& ship` guard.

`src/board/BoardSquare.tsx`: the `mark` prop keeps its type and its name; the
render branches switch from comparing the mark to a string to reading
`mark.kind`. **This step changes nothing about what is drawn** — the
destination still draws its disc and the target still draws its bare ring,
whatever the cost. The drawing arrives in Step 4.

**Tests to update** (they assert accessible names that now carry a cost):

- `src/board/squareLabel.test.ts` — the destination and target cases; pass a
  cost in each, and add a case for a zero-cost destination and a zero-cost
  target so the `costs 0 power` decision is pinned.
- `src/board/Board.test.tsx` — the `can move here$` regexes and the exact
  target-name strings (roughly lines 660–1000 and 1320–1490).
- `src/App.test.tsx` — the target-name assertions around lines 300–320.
- `src/hud/GameOverPanel.test.tsx` — the `can move here$` regexes around lines
  230–300.
- `src/board/BoardSquare.test.tsx` — every `mark="destination"` / `mark="target"`
  prop becomes the object form.

**Tests to add** in `src/board/Board.test.tsx`: with a full-power ship selected
in the open board, its four orthogonal neighbours read `costs 0 power`, a
diagonal neighbour reads `costs 1 power`, an L square reads `costs 2 power`,
and a long-knight square reads `costs 3 power`; and with an enemy an L away
(combat on), the target square's name carries `costs 2 power` in the D3 order,
ahead of the "both ships would return to planets" clause.

Depends on: Step 1 (the cost-carrying rules functions) and Step 2 (so the
selected mark's object form has no drawing left to update).

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
green, with the new name cases present and the updated ones asserting the exact
D3 wording.

### Step 4 — A priced mark draws fuel bars

Status: committed

Notes: Implemented exactly as specified. `BoardSquare.tsx` imports
`GAUGE_BAR_LENGTH`, `GAUGE_BAR_STROKE_WIDTH`, `GAUGE_BAR_UNDERLAY_STROKE_WIDTH`
and `GAUGE_UNDERLAY_COLOR` from `shipArt.ts` (unedited), adds the named
`COST_BAR_ROW_SPACING = 16` constant with a comment citing
`GAUGE_SLOT_POSITIONS`' two rows, and a `costBarPositions(count)` helper
generating y positions centred on 50 for any count (S6). A new
`CostBarStack` component draws each bar as a `<g data-cost-bar={index}>`
holding the gauge's double stroke (dark underlay, then `currentColor` on
top, both round-capped via a wrapping `strokeLinecap="round"` group).
`DestinationMark` now takes `cost: PowerLevel` and draws the disc at cost 0
or the stack otherwise; `TargetMark` takes the same prop, always draws the
ring, and adds the stack inside it when cost is non-zero. Both remain a
single `.board-square__mark` SVG per square (D4), and `BoardSquare.tsx`'s
render call sites and header comment were updated accordingly.
`BoardSquare.css` needed no change — `currentColor` already resolves
through the existing `.board-square__mark` rule's `color:
var(--interaction-accent)`. Added the five specified test cases to
`BoardSquare.test.tsx` (disc-vs-bars by cost, ring-plus-bars at every cost,
the bar's two-stroke geometry asserted against the imported gauge
constants, centring/symmetry with the three-bar stack's outermost reach
kept inside the target ring's inner edge, and an uncapped four-bar case
built directly). `npm run typecheck`, `npm run lint` and `npm test` are all
green (66 files, 1293 tests, up from 1288 by exactly the 5 new cases). No
deviation from the plan.

Draw the stack of fuel bars in `src/board/BoardSquare.tsx` (D4, D5, D6):

- A destination mark with cost 0 draws today's disc, unchanged. With cost N > 0
  it draws N bars instead of the disc.
- A target mark always draws today's ring, unchanged. With cost N > 0 it also
  draws N bars inside the ring.
- Both use the same bar stack, in the same place: centred on the square's
  centre in the 0–100 viewBox, spaced 16 units apart (the hull gauge's own row
  spacing, written as a named constant beside the other mark geometry with a
  comment saying where the number comes from), positions generated from the
  count rather than from a fixed list (S6).
- Each bar is the hull gauge's bar: `GAUGE_BAR_LENGTH` long, drawn twice and
  coincident — `GAUGE_UNDERLAY_COLOR` at `GAUGE_BAR_UNDERLAY_STROKE_WIDTH`
  first, then `currentColor` at `GAUGE_BAR_STROKE_WIDTH` on top — round-capped,
  all four imported from `src/ships/shipArt.ts`, which is not itself edited.
  `currentColor` resolves to `--interaction-accent` through the existing
  `.board-square__mark` rule, so no new CSS colour is introduced; check whether
  `BoardSquare.css` needs any rule at all (it should not) and say so in
  `Notes:` either way.
- Each bar renders inside a group carrying a `data-cost-bar` index, mirroring
  `ShipModel`'s `data-gauge-slot`.
- A marked square still renders exactly **one** `.board-square__mark` element,
  keeping its `--destination` / `--target` class and its `aria-hidden`.

Update `BoardSquare.tsx`'s header comment and the `DestinationMark` /
`TargetMark` doc comments to describe what the marks now draw, including why
the ring is always drawn (it is what tells an attack from a move) and why the
bars are the accent colour rather than the side's.

**Tests** in `src/board/BoardSquare.test.tsx`:

- A destination at cost 0 draws a circle and no `[data-cost-bar]`; at cost 1, 2
  and 3 it draws that many `[data-cost-bar]` groups and no circle.
- A target draws its ring at every cost (0 through 3), and that many
  `[data-cost-bar]` groups alongside it.
- A bar's two strokes are the gauge's: the underlay's `stroke` is
  `GAUGE_UNDERLAY_COLOR` at the gauge's underlay width, and the top stroke is
  `currentColor` at the gauge's bar width — assert against the constants
  imported from `src/ships/shipArt.ts` rather than against literals, so the
  test follows the gauge if the gauge moves.
- The stack is centred and symmetric: for each of 1, 2 and 3 bars, the bars'
  y positions average 50, and the three-bar stack's outermost bar, including
  half the underlay stroke and its round cap, stays inside the target ring's
  inner edge (radius 32 less half the 6-unit stroke). This is the automated
  half of the manual check in Step 5 — the arithmetic it is asserting is worked
  out in D5.
- The bar count follows the cost rather than a fixed maximum: a mark at a cost
  of 4 (constructed directly in the test — the rules do not produce one today)
  draws four bars (S6).

Depends on: Step 3 (the mark must already carry a cost).

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
green, with the new drawing cases present.

### Step 5 — The owner looks at the board

Status: pending

No code. The owner runs the app and checks the story's "done when" list by eye.

The implementer's job in this step is to hand the owner the instructions below,
run `npm run dev`, and record the owner's findings in `Notes:`.

What to do and what to look for:

1. **Start a game with Combat ON.** On the start screen, set the Combat group
   to on (the app preselects off, and with combat off no target ring is drawn
   at all). Everything else can stay as preselected.
2. **A full-power ship.** Ships start at full power on their planets. Select
   one near the middle of a side (arrow keys and Enter, or a click) and confirm
   the fan: a small solid disc on each of its four orthogonal neighbours; one
   bar on each diagonal neighbour; two bars on each two-orthogonal square and
   each L square; three bars on each three-orthogonal, two-diagonal and
   long-knight square. The bars should read as the same bar the ship's own hull
   gauge draws, in the same blue as the discs.
3. **The selected ship's own square.** No brackets, and the ship's artwork
   unobstructed.
4. **A ship at 2 power.** Make a 3-cost move (three squares in a line) and then
   a 1-cost move (one diagonal step) with the same ship: 6 → 3 → 2. Select it
   again and confirm no square shows three bars.
5. **A ship at 0 power.** Spend the rest (two more 1-cost moves). Select it and
   confirm only discs are shown.
6. **A target ring with bars, at the smallest square size.** Manoeuvre a green
   ship and a red ship — neither on a planet, neither on a node — until the red
   one stands an L away from the green one, select the green one, and confirm
   the red one's square carries the ring **and** two bars inside it. Then
   shrink the browser window until the board hits its floor (the square stops
   shrinking at 40px; a window narrower or shorter than about 600px of board
   area reaches it) and confirm the bars still sit clear of the ring and clear
   of each other, and are still readable over the enemy ship's artwork. If a
   three-bar target is reachable in the same position (a three-orthogonal,
   two-diagonal or long-knight lane to an enemy), check that one too — it is
   the tightest case the board can draw and the one the story singles out.
7. **A pinned ship.** If a pinned ship is available (dampened hull, hollow bar
   at the bottom edge), select it and confirm the board lights nothing — the
   knowingly accepted edge case (S4). Do not treat this as a defect.

Depends on: Step 4 (there is nothing to look at before the bars are drawn).

Verification (manual): the owner confirms points 2–7 above. Anything that looks
wrong is recorded in `Notes:` and fixed before the step is committed; anything
the owner decides to accept is recorded in `Notes:` as accepted.

### Step 6 — `README.md`

Status: pending

Check `README.md` against what this story changed, and update it only if it
describes something that is now wrong. The `/update-readme` command does this
against the branch diff and is the intended route.

What to look at, from planning: the README describes §6's shapes and prices in
its own words ("turns a corner, cost 2; and three squares in a line, two
squares diagonally, …"), which this story does not change, and it contains no
description of the selection markings — no mention of brackets, discs or
rings — so the likely correct outcome is **no change**. If the README is
updated anyway, the update stays in the player's vocabulary: the marks show
what a move costs in **fuel**, drawn as the same bar a ship's own gauge shows.

Record the outcome in `Notes:` either way, including "no change needed" if that
is the finding.

Depends on: Steps 1–5 (the README is checked against the finished change).

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
green, and `npx prettier --check .` reporting no warnings beyond the two
pre-existing ones listed under "Baseline on this branch".
