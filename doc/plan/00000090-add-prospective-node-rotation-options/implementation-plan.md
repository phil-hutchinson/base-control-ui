# Implementation Plan — Story 00000090, How the waiting nodes rotate

## What this story does

The board always carries three **inactive** nodes holding priorities 1, 2 and
3, and the one holding 3 is the one that charges next (rules.md §8.2). Since
the queue was introduced those priorities have rotated **at the end of every
turn on which nothing charged** — 1 → 2, 2 → 3, 3 → 1 — automatically, for
free, and outside either player's control.

This story makes rotation **a choice the players make before play begins**, in
the shape the fleet size, the charged-node count, scoring, combat, the rounds
and the clock already are:

- **CONTINUOUS** — today's rule, unchanged.
- **PLANET** — the priorities never rotate at the end of a turn. They rotate
  one step each time a ship **lands on a planet**, the moment it lands.
- **DEDICATED** — the same, except the trigger is a **rotator**: a new piece
  of temporary board furniture, up to nine at a time (one per 5 × 5 section),
  each spent by the ship that lands on it, the whole set redrawn every time
  the three inactive nodes are refilled.

The app preselects **CONTINUOUS**, so the game a player gets without touching
anything is the game they get today. `rules.md` names no default, exactly as
it names none for the other six choices.

A rotation a player triggers happens **as the landing resolves**, in the
middle of that player's turn, so it is already done when the end-of-turn
sequence decides what charges: the node showing **two** rings while the player
was moving is the node that charges at the end of that turn. That is the
second knowing exception to "a node's state changes only in the end-of-turn
sequence", alongside a charged node depleting the instant its holder leaves
it.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions and the rejected alternatives, because code in this
repository deliberately carries no design history (`CONTRIBUTING.md`,
"Comments").

## Baseline on this branch

Branch `feat/90-add-prospective-node-rotation-options`, clean at the start of
planning (`story.md` already committed).

- `npm test` — **70 test files, 1339 tests, all green**.
- `npm run typecheck` and `npm run lint` — clean.
- `npm run format:check` — **three pre-existing warnings**:
  `doc/plan/00000069-retire-actions/story.md`,
  `doc/plan/00000090-add-prospective-node-rotation-options/story.md` and
  `src/board/planetArt.ts`. None is this story's to fix, and none must be
  "tidied" in passing — in particular, do not reformat this story's own
  `story.md`. (This `implementation-plan.md` is itself prettier-formatted; if
  a step's edit flags it, run `npx prettier --write` on **it** only.)

The test count will **rise** over this story. No step may lower it.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say (`CLAUDE.md`, Vocabulary). Do not mix them.
- **Move** is the movement action specifically — one ship changing squares —
  never a synonym for a turn or a ply.
- **Node** is the word everywhere. The story's title says "prospective node";
  the rules' word is an **inactive** node carrying a **priority**, and that is
  what the document, the code and this plan say.
- **Rotator** is a new word, introduced by rules.md §3.3. A rotator is **not a
  node**: it never enters the inactive → charged → depleted cycle, it is not
  counted among the board's nodes, and it does not live in `state.nodes`.
- The player-facing words for the settings are **CONTINUOUS**, **PLANET** and
  **DEDICATED**; those three uppercase strings are start-screen chrome and
  live on the start screen. The code word is `nodeRotation`, whose values are
  the lowercase `"continuous"`, `"planet"` and `"dedicated"`.
- Since rules version 0.32 `rules.md` **names no default and no "standard
  game"** for any option: each section lists the options and says the choice is
  the same for both players and fixed for the game's lifetime. Which option
  the app preselects is purely an app matter. Do not reintroduce "default" or
  "standard game" language into `rules.md`.

## Settled decisions — do not reopen

These come from `story.md` and the discussion around it. A step that finds one
inconvenient escalates to the owner rather than re-deciding.

- **S1. Three settings and nothing else.** No fourth trigger, no setting that
  combines two ("planets and rotators"), no rotation on leaving a node, on
  refuelling, on collecting or on a turn passing. Nothing is built to make a
  fourth setting easy later.
- **S2. Chosen before play and fixed for the game's lifetime.** No mid-game
  toggle. Nothing on the board or in the HUD says which setting is in play
  beyond the rotators being there or not — no badge, no legend, nothing in the
  game-over panel.
- **S3. The app preselects CONTINUOUS**, and continuous is the default
  everywhere in the code a default is reached for. `rules.md` states the
  choice and names no default.
- **S4. A landing is worth exactly one step**, always in the same direction
  (1 → 2, 2 → 3, 3 → 1). No reverse rotation, no jump, no choosing which
  priority to advance. Two landings in one turn rotate two steps.
- **S5. The rotation lands before the charge.** A rotation triggered by a
  landing is complete before the end-of-turn sequence begins, so §8.6 step 4
  charges from the priorities **as the rotation left them**. This is the whole
  point of the feature; if a step finds it inconvenient, escalate.
- **S6. Nothing else about the queue changes**: the rings and what they mean,
  the charge order (highest priority first, no draw, no weighting), the
  sweep-and-redraw on a charge, the random deal of 1, 2 and 3 to a fresh trio,
  and "a freshly refilled trio is never rotated in the turn it was dealt".
- **S7. A rotator is only a trigger.** It gives no power, no energy and no
  protection, blocks nothing, constrains no node placement (§3.2 is untouched),
  and never traps anything. It is an ordinary square to move to, to move
  through and to stand on. Flying over one spends nothing.
- **S8. No rotators under continuous or planet** in any form — none drawn,
  none stored, none drawn on the board, **no seed steps spent**.
- **S9. Nothing is retuned** against the new settings: the countdown lengths,
  the node economy, the fleet sizes, the game lengths and the clock all keep
  their values.
- **S10. The rules edit is its own commit, ahead of the code.** `rules.md`
  0.35 → 0.36, `RULES_VERSION` to match, **one** `changelog.md` entry. **One
  version bump for the whole branch**: if a later step finds more wording to
  correct in `rules.md`, it folds into 0.36's entry and does not add a second
  bump or a second version.
- **S11. Tagging stays on hold** even though this is a gameplay change
  (`CLAUDE.md`). Bump the version, write the changelog entry, **do not tag**
  and do not run `/tag-rules`.
- **S12. No accessibility repair steps, no review fixtures, no manual test
  scripts** (`CLAUDE.md`, pre-release stance; the owner drives manual testing
  himself). Where an existing automated test has a straightforward path to
  being updated, update it. What is knowingly given up is recorded in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md` (D14). Manual
  verification never asks the owner to check live-region wording — the
  automated suite covers that.
- **S13. Restyling the start screen is out of scope.** The seventh group is
  added in the existing shape, with the existing `OptionChoice` and no new
  styling. If seven groups do not fit a short landscape window, that is a
  **finding for the owner**, not a layout pass this story takes on.
- **S14. The Quick Guide's copy and diagram for NEW CHARGED NODE SELECTION are
  the owner's** and arrive when Step 13 is reached. The step is a deliberate
  placeholder. The guide's other sections and diagrams are untouched.
- **S15. No backwards compatibility** for games recorded under 0.35
  (`CLAUDE.md`).

## Decisions this plan makes

### D1. The state carries two new fields, `nodeRotation` and `rotators`

`GameState` gains both, and they travel under the same name at every layer:

| Layer              | Where                                                             |
| ------------------ | ----------------------------------------------------------------- |
| Game state         | `GameState.nodeRotation` (required, `NodeRotationSetting`)        |
| Game state         | `GameState.rotators` (required, `readonly Square[]`, board order) |
| Starting options   | `StartingGameStateOptions.nodeRotation` (optional, `string`, D3)  |
| Session intent     | the `new-game` intent's `nodeRotation` (required)                 |
| App screen state   | `AppScreen.nodeRotation` / `setNodeRotation`                      |
| Start screen props | `nodeRotation` / `onNodeRotationChange`                           |

`nodeRotation` is a **three-member string union**, not a pair of booleans and
not a number: every point of use asks _which scheme_, and the union reads at
the call site (`state.nodeRotation === "planet"`). It is the shape
`ScoringSetting` and `ClockSetting` already use. It cannot be derived from a
board — a board that has not rotated for ten turns is indistinguishable from
one whose players have not landed anywhere — which is the same reason
`chargedNodeCount`, `combatEnabled` and `scoring` are stored on the state.

`rotators` is a **plain list of squares**, deliberately **not** part of
`state.nodes`. A rotator has no state, no countdown and no priority; putting
it in the node map would reach every caller of `nodeSquares`, `nodeStateAt`,
`nodeStatusAt` and `legalNodePool` for no gain, and would make "a node" mean
two different things. It cannot be derived from the board either: a free
square and a free square carrying a rotator look identical. It is empty
(`[]`) under continuous and planet, always (S8).

**Board order** means the order `ALL_SQUARES` walks — row 1 first, column A
first within a row — the same order `nodeSquares` returns. Storing it in board
order rather than draw order means nothing downstream ever depends on the
order the sections were walked in.

### D2. The setting's constants live in a new leaf module, `src/rules/nodeRotation.ts`

Holding, in the shape `clock.ts`, `combatSetting.ts`, `fleet.ts`, `nodes.ts`
and `scoring.ts` use:

- `NodeRotationSetting` — the union `"continuous" | "planet" | "dedicated"`;
- `NODE_ROTATION_SETTINGS` — the offered settings in start-screen order,
  continuous first, so leftmost is what the app preselects;
- `DEFAULT_NODE_ROTATION` — `"continuous"`;
- `isNodeRotationSetting` — a guard over an `unknown` value, with a real
  caller from the start (D3).

The module must import **nothing** from `src/rules`: it is a leaf, and that is
what lets `gameState.ts`, `endOfTurn.ts`, `ply.ts` and the start screen all
read it without any of them importing each other.

Rejected: putting these in `nodeQueue.ts` beside `rotatePriority`. That module
is the queue's mechanics (how a priority moves), not the pre-play choice of
what moves it; and the house shape is one small leaf module per option, which
is what keeps `gameState.ts` free of cycles.

### D3. The starting option is typed `string`, so the guard really validates

`StartingGameStateOptions.nodeRotation` is typed **`string`**, not
`NodeRotationSetting`, and `startingGameState` validates it with
`isNodeRotationSetting`, throwing a `RangeError` naming the offered settings —
exactly as `scoring?: string` is validated with `isScoringSetting` and
`chargedNodeCount?: number` with `isChargedNodeCount`.

Typing the option as the union would make the guard dead code and the
`RangeError` unreachable. A setting arriving from outside the type system — a
saved options blob, a game record, a URL — is a string, and this is where it
is caught. Do **not** narrow the option's type to make the validation "look
unnecessary". `GameState.nodeRotation` itself stays the narrow union: by the
time it is on the state it has been validated.

`rotators` is **not** an option: it is produced by the deal, never supplied.

### D4. `src/rules/rotators.ts` owns §3.3, and owns its seed discipline

A new leaf module holding:

- **The nine sections.** Derived from `BOARD_SIZE` rather than written out:
  three equal bands per axis (`BOARD_SIZE / 3` = 5 squares each on the 15 × 15
  board), giving columns A–E, F–J, K–O and rows 1–5, 6–10, 11–15. Exported (at
  least for the test to walk) as an ordered list of sections, each able to say
  which squares it contains.
- **A fixed section order**, and it must never change, because it is the order
  seed steps are spent in: **row bands ascending, and within a row band,
  column bands ascending** — (A–E, 1–5), (F–J, 1–5), (K–O, 1–5), then the
  6–10 band, then the 11–15 band. This is the order `ALL_SQUARES` itself walks
  the board in, scaled up to sections.
- **`placeRotators(nodeSquares, shipSquares, seed)`** — walks the sections in
  that order and, for each, draws **one square uniformly** (`drawIndex`) from
  that section's **free** squares: no planet (`isPlanet`), no ship, and no node
  in any state. A section with no free square yields nothing and **consumes no
  seed step**. Returns the drawn squares **in board order** (filter
  `ALL_SQUARES`, the same trick `dealOpeningBoard` and `nodeSquares` use) and
  the seed it left behind. At most nine seed steps; exactly zero under
  continuous and planet, because it is never called (S8).

Note the two orders are different on purpose: squares are **drawn** in section
order (which fixes the seed) and **returned** in board order (which is what
the state stores). Both are stated in the module's own header comment.

Rejected alternatives:

- **Nine fixed squares.** The board has had no fixed positions since 0.24, and
  a fixed rotator set would hand both players a memorised map.
- **Nine draws from the whole board.** Nothing would stop all nine clumping
  into one corner, and the story's "there is always one somewhere near" is the
  point of the sections.
- **Topping the set up as they are spent.** The set is **replaced** wholesale
  after each refill and at no other time; a stretch of play with no charges is
  meant to be a stretch in which rotation gets harder to buy.
- **Excluding squares near planets or nodes (§3.2's constraints).** A rotator
  is not a node and §3.2 does not apply to it: it may sit on the outer edge and
  beside a planet or a node. Only "occupied right now" excludes a square.

### D5. The opening deal's rotators are placed by `startingGameState`, not inside `dealOpeningBoard`

`startingGameState` already owns the seed thread: it deals the board, then
keeps the seed the deal left behind. Under dedicated it calls `placeRotators`
**after** `dealOpeningBoard` returns, passing the dealt nodes' squares and the
fleet's squares, and stores both the resulting list and the seed.

Rejected: teaching `dealOpeningBoard` to place them. `nodes.ts` would have to
learn the rotation setting, a rotator would be returned from a function whose
name and doc comment are about nodes, and `openingBoard.test.ts`'s exact
seed-consumption arithmetic (`chargedNodeCount + 4`) would have to grow a
branch. Keeping it in `startingGameState` also mirrors `endOfTurn.ts`, where
the refill happens first and the regeneration immediately after it (D7).

Seed consequence, which must be written into `startingGameState`'s doc
comment: the deal consumes `chargedNodeCount + 4` steps as it does today, plus
**up to nine more under dedicated only**.

### D6. One implementation of "the priorities move one step": `rotateQueue` in `nodeQueue.ts`

`nodeQueue.ts` already owns `rotatePriority` (one priority, one step). It
gains **`rotateQueue`**, which takes a state's node map, applies
`rotatePriority` to every **inactive** entry, leaves charged and depleted
entries untouched, and returns the new map. Both callers — `endOfTurn.ts` step
5's continuous branch and `ply.ts`'s landing trigger — go through it, so there
is exactly one place in the app that knows what a rotation is.

It takes and returns `Readonly<Record<string, NodeStatus>>`, with a **type-only
import** of `NodeStatus` from `gameState.ts`. `verbatimModuleSyntax` is on in
`tsconfig.app.json`, so a type-only import is erased entirely and **no runtime
import cycle is created** — `gameState.ts` → `nodes.ts` → `nodeQueue.ts` stays
a one-way runtime graph. Update `nodeQueue.ts`'s header comment, which
currently claims the module knows nothing about `GameState`, to say it borrows
the status **type** and nothing else.

Rejected: a generic parameter structurally constrained to `{ state; level }`,
which cannot rebuild the value without a cast; and putting `rotateQueue` in
`endOfTurn.ts` (where `ply.ts` could import it cycle-free) — rotation is §8.2,
and burying it in the §8.6 module would put the rules' own division of labour
the wrong way round.

### D7. `endOfTurn.ts` step 5: rotate only under continuous, regenerate only under dedicated

Step 5 keeps its two branches and gains a condition in each:

- **Refill branch** (step 4 charged something): sweeps and refills exactly as
  today; then, **under dedicated only**, calls `placeRotators` against the
  board as the refill leaves it — so the new rotators see the new nodes and
  avoid them — replacing `state.rotators` wholesale and advancing the seed.
- **Rotation branch** (nothing charged): rotates the surviving inactive nodes
  through `rotateQueue` **only when `state.nodeRotation === "continuous"`**.
  Under planet and dedicated this branch does nothing at all — the priorities
  stay exactly as the turn left them.

Because a node is only ever created by a refill, and (under dedicated) a
regeneration follows every refill, a node can never later appear on a square
holding a rotator. No collision rule is needed in the other direction and
`legalNodePool` is **not** touched (S7).

The refill branch's existing `QueueRefilledEffect` gains **`newRotators:
readonly Square[]`** — the squares the regeneration placed, empty under
continuous and planet. A **required** field on the existing effect, not a
second effect beside it: the sweep and the regeneration are one event at one
instant, and a listener that hears "the queue was refilled" should hear what
the board looks like afterwards in the same breath.

### D8. `ply.ts` is where a landing rotates, and the effect it raises

`applyMove`, after the ship is placed on its destination and after the two
existing node changes (the charged node left behind depleting, the charged
node arrived on starting its countdown):

- under **planet**, if the destination is a planet, rotate once;
- under **dedicated**, if the destination holds a rotator, remove that square
  from `state.rotators` and rotate once;
- under **continuous**, nothing.

Ordering among the three node changes does not matter — a rotation touches
only inactive nodes and the other two touch only charged/depleted ones — but
fix it as stated so the code reads in one direction.

`applyAttack` does the same for **both returned ships, attacker first**, in the
order `returns` already reports them. Under planet that is two rotations (both
ships land on planets, §7); under dedicated it is none, because a fight only
ever returns ships to planets and a rotator never stands on a planet. The
rotations are applied **as part of resolving the fight**, before
`assertFightInvariants` runs (D9), because they genuinely are part of the
fight's result.

**A new effect, `QueueRotatedEffect`** (`type: "queue-rotated"`), defined in
`ply.ts` beside `NodeSpentEffect` and added to both the `MoveEffect` and
`AttackEffect` unions. It carries:

- `square` — the square landed on;
- `trigger` — `"planet"` or `"rotator"`.

**One effect per rotation**, so a fight under planet raises two, in
attacker-then-defender order. It sits **after** any `node-spent` effect and
**before** the `EndOfPlyEffect` that closes the ply out, so a listener hears
the node spent, then the rotation, then how the turn ended.

Rejected: carrying the square of the node that now holds priority 3. It would
make the announcement one clause richer, but it couples a ply-level effect to
the queue's contents at a moment the queue is about to be read again by the
end-of-turn sequence; when something charges, the existing "A new node charged
at …" clause already names the square.

### D9. `assertFightInvariants` is narrowed to the charged and depleted states

Today the node check is a plain identity comparison: **no** node's `state` or
`level` may differ across a fight. Under the planet setting a fight rotates all
three inactive nodes, changing each one's `level`, so as it stands the check
would turn a **legal attack into a thrown `RangeError`**. This is not optional
tidying and must not be deferred.

The narrowed contract, which the step implements and a test pins:

1. every node present before the fight is present after it, and vice versa — a
   fight never creates, charges or retires a node;
2. every node's `state` is identical before and after;
3. a **charged** or **depleted** node's `level` is identical before and after —
   a fight must not touch a node's life, which is what the check was actually
   guarding;
4. an **inactive** node's `level` (its priority) **may** differ, because under
   the planet setting the fight's two landings rotate the queue (§8.2, §7).

The comment above it says exactly that, and why the exemption exists.

Rejected: additionally asserting that the inactive priorities after a fight are
a permutation of the ones before. It is true in play, but
`assertFightInvariants` is exported precisely so a test can hand-build
otherwise-impossible before/after pairs, and a permutation check would fire on
hand-built states that simply do not carry three inactive nodes. The value of
the guard is in points 1–3; point 4 is the hole the rules put there.

### D10. The seeded stream is untouched at continuous, and that is asserted

Under continuous and planet nothing new is drawn: `placeRotators` is never
called, and rotation itself has never consumed a seed step. So
`seededReplay.test.ts` keeps its recorded expectations **exactly as they are**.

Treat that as a **check, not a re-recording**: if any recorded figure in that
file moves, **stop and escalate** — it means something has changed the stream
that should not have. Step 6 turns it into an explicit assertion rather than an
assumption.

Only dedicated adds steps (up to nine at the opening deal and up to nine after
each refill), and that is expected.

### D11. The test sweep sets continuous and an empty rotator list, in one pass

Adding two required fields to `GameState` breaks every test file that builds a
state literal — the same mechanical sweep stories 83 and 85 did, and this time
two fields. `npm run typecheck` finds them exhaustively. The **22 test files**
that contain a `GameState` literal (identified by `openingSeed:`):

```
src/board/Board.test.tsx          src/rules/camping.test.ts
src/board/EnergyOverlay.test.tsx  src/rules/canMoveOrAttack.test.ts
src/board/announcements.test.ts   src/rules/charging.test.ts
src/clock/ClockRegion.test.tsx    src/rules/combat.test.ts
src/clock/useGameClock.test.tsx   src/rules/endOfTurn.test.ts
src/game/session.test.ts          src/rules/energy.test.ts
src/hud/GameOverPanel.test.tsx    src/rules/fullGame.test.ts
src/hud/ScoreDisplay.test.tsx     src/rules/movement.test.ts
src/hud/TurnIndicator.test.tsx    src/rules/openingBoard.test.ts
                                  src/rules/ply.test.ts
                                  src/rules/recovery.test.ts
                                  src/rules/relief.test.ts
                                  src/rules/trap.test.ts
```

Most have a single local `buildState`-style helper, so most are a two-line
edit. Every one gets `nodeRotation: "continuous"` and `rotators: []` — exactly
the semantics every existing expectation was written under — so the sweep is
**behaviour-preserving by construction**: if the suite goes red during it, that
is a real mistake, not an intended change.

`startingGameState` callers need **no** change: the new default is the old
behaviour, so a test that says nothing about rotation keeps playing the game it
always played.

Do the sweep in **one pass** in Step 3, not file by file as failures appear in
later steps, so each later step's diff is about behaviour rather than about
builders.

### D12. The rotator's artwork, and where the shared colour lives

A new `RotatorMarker` component beside `NodeMarker`, drawn in the same
`0 0 100 100` viewBox, placed in the same stacking slot a node marker occupies
(beneath any ship), and `aria-hidden` like every other piece of board art.

The mark is a **round recycling symbol**: three arcs of about 90 degrees each,
with the three gaps between them equal, and an arrowhead at the leading end of
each arc so the mark reads as turning. "About 90" is the instruction, not a
measurement to hit — exact angles, stroke width and arrowhead shape are the
drawing's business, settled by the owner's eye at Step 9.

Its colour is **the inactive rings' colour**, `#DAA520`, today a private
constant `INACTIVE_RING_COLOR` inside `NodeMarker.tsx`. It moves to a new
plain-TypeScript module **`src/board/nodeArt.ts`**, which both markers import,
so the two can never drift apart: the mark says "this moves the rings" by being
the rings' colour. Only the colour moves; the ring radii and stroke width stay
in `NodeMarker.tsx`, which is the only thing that draws rings.

Rejected: exporting the constant from `NodeMarker.tsx` itself. The house
pattern for shared board/ship drawing constants is a plain `.ts` module
(`planetArt.ts`, `shipArt.ts`), and a `.tsx` file that exports both a component
and a constant is what `react-refresh/only-export-components` exists to
discourage.

A rotator and a ship never share a square in a settled position — the landing
spends the rotator — so the marker is never drawn under a ship in play. It is
drawn beneath one regardless, because that is what every other square-level
marker does, and a special case here would be a special case to maintain.

### D13. `BoardSquare` takes the rotator as an independent field; `squareLabel` shares the planet-or-node slot

`BoardSquare` gains one more optional, independent field alongside the node and
the planet (a boolean saying the square holds a rotator), and `Board` reads it
from `state.rotators` — build a name `Set` once per render, beside the ship
index, rather than scanning the array per square.

`squareLabel` names it in the **same slot** as the planet and the node state,
since a square can be at most one of the three (a rotator never stands on a
planet or a node): `"F7, rotator"`. A ship standing on a square that still
holds a rotator never arises, so no combined wording is needed.

### D14. The one accessibility cost, knowingly accepted

A rotator reads as the bare noun `rotator` with nothing saying what it does,
and a screen-reader user gets no summary of where the nine of them are — they
would have to walk the grid. Recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` as part of Step 9
rather than repaired (`CLAUDE.md`, pre-release stance, S12).

### D15. The announcement's wording

`announcements.ts` gains one clause per `queue-rotated` effect, in the
neighbouring wording's voice ("The node at E6 ended when the ship left it.").
The plan fixes the sentences so the step does not invent them:

- planet trigger: **"Landing on the F7 planet moved the waiting nodes on a
  step."**
- rotator trigger: **"The rotator at F7 was spent, moving the waiting nodes on
  a step."**

They go into the move's sentence after the `node-spent` clause, and into the
fight's sentence after the two returns are named — in both cases **before** the
turn-ending clauses, so a listener hears the rotation happen before hearing
what charged because of it. A fight under planet produces two of these clauses,
attacker's first.

Per `CLAUDE.md` and the owner's standing preference, live-region wording is
**never** part of a manual verification: `announcements.test.ts` covers it.

### D16. What is **not** touched

- `nodePlacement.ts` / `legalNodePool` and §3.2's six constraints (S7, D7).
- `charging.ts` — step 4 still charges highest-priority-first from the
  priorities on the board (S6).
- `movement.ts`, `canMoveOrAttack.ts`, `combat.ts`'s refusal reasons: landing
  on a rotator is refused by nothing, and nothing new can refuse a landing.
- `countdown.ts`, `energy.ts`, `power.ts`, `planets.ts`, `trap.ts`,
  `relief.ts`, `gameLength.ts`, `clock.ts`, `scoring.ts` — none consults this
  choice.
- The HUD, the game-over panel, the round counter, the clock region (S2).
- `EnergyOverlay`, `NodeCountdown`, `Planet`, `ShipModel` and the planet
  artwork.
- The Quick Guide's other sections and diagrams (S14).
- `seededReplay.test.ts`'s recorded expectations (D10).

## Step sequence at a glance

1. `rules.md` 0.35 → 0.36, `RULES_VERSION`, changelog — **its own commit,
   ahead of the code**. _Automated._
2. Two new leaf modules: `nodeRotation.ts` (the setting) and `rotators.ts`
   (the nine sections and where rotators fall). _Automated._
3. `GameState` gains `nodeRotation` and `rotators`; the opening deal places
   them; the one-pass test sweep. _Automated._
4. `rotateQueue`, and `endOfTurn.ts` step 5's two conditions. _Automated._
5. `ply.ts`: a landing rotates; the `queue-rotated` effect;
   `assertFightInvariants` narrowed. _Automated._
6. Whole games at all three settings, and the seeded stream proved unchanged.
   _Automated._
7. The choice reaches a new game: the intent, the hook, `App`. _Automated._
8. The start screen's seventh group. **Manual** (the layout risk).
9. The board shows a rotator, and the accessibility note. **Manual** (new
   artwork).
10. A quieter rotator: silver, shorter arcs, wider arrowheads. **Manual**
    (artwork again).
11. Six rotators, not nine: the four corner sections always, plus two drawn
    from the other five. A rules change, folded into 0.36. **Manual.**
12. The live region says the queue moved on. _Automated._
13. The Quick Guide's NEW CHARGED NODE SELECTION section and its diagram.
    **Manual — owner-supplied copy.**
14. `README.md`. _Automated._
15. The owner plays all three settings. **Manual.**

Steps 10 and 11 were added after Step 9's manual gate, where the owner found
the board too noisy and asked for a quieter, sparser rotator (see those steps
for the feedback in full). They are inserted here, rather than appended after
the steps that were already written, because that is the order they are
worked in: the guide (13), the README (14) and the owner's play-through (15)
all describe the rotator as it finally is, not as Step 9 first drew it.

---

### Step 1 — `rules.md` 0.35 → 0.36: rotation becomes a choice, and rotators arrive

Status: committed

Notes: Bumped `rules.md` to 0.36 and `RULES_VERSION` to match, and added the
0.36 changelog entry (one entry, gameplay change, no tag per S11). §8.2 now
opens with the pre-play choice (continuous/planet/dedicated) followed by the
three settings and the timing/rings paragraph, replacing the old
"priorities rotate at the end of every turn..." paragraph; the existing
"freshly refilled trio is never rotated" sentence was checked and needed no
change (it still holds unqualified under all three settings, since a landing
that rotates the queue always precedes that turn's refill in step 5). Added
new §3.3 "Rotators" after §3.2. Added a Rotator entry to §2, placed after
Priority (checked: the existing Priority entry's "highest priority charges
next" sentence needed no change). Restated §8.6 step 5 (rotate only under
continuous; regenerate rotators only under dedicated, right after a refill).
§8.6's closing notes gained the second knowing exception (a landing rotates
the priorities under planet/dedicated) and the "charging reads from the
priorities already on the board" paragraph gained the sentence about the
arrangement being changeable under two of the three settings. §7 gained one
sentence: a fight under the planet setting rotates the priorities twice.
§1's overview gained a sentence in the board-redrawing paragraph and a
sentence in the random-elements paragraph (a fourth random element under
dedicated: where the rotators fall). §8.1's opening-deal bullets gained a
cross-reference to §3.3 for the dedicated setting. §10's opening sentence
now lists rotation alongside the other five choices it already named.
Checked §6 (nothing to change: landing on a rotator is refused by nothing,
and the list of refusal reasons is unaffected) and §9 (it does not enumerate
the pre-play choices at all — only rounds — so nothing to change there
either). Checked `doc/ruleset/tech-notes.md`: its "an inactive node never
waits more than three turns" argument assumes automatic (continuous)
rotation and would be false under planet/dedicated, where a node can wait
indefinitely if nobody triggers a rotation; added a qualifying sentence
there rather than leaving a false claim standing, since the plan's "check,
do not rewrite" instruction allowed a word where one was needed and this
one was. No code changed in this step; `npm test` stayed at 70 files / 1339
tests, `npm run typecheck` and `npm run lint` are clean, and
`npm run format:check` shows only the three pre-existing baseline warnings.

Update `doc/ruleset/rules.md` so that no section states end-of-turn rotation as
the only rotation, bump the document to **0.36**, bump `RULES_VERSION` in
`src/rules/rulesVersion.ts` to match, and add **one**
`doc/ruleset/changelog.md` entry for 0.36, newest first, in the shape the 0.35
entry uses. This step is **its own commit, ahead of all code changes** — the
document is what every later step implements (S10, S11: no tag).

Phrase the choice the way §8.1, §8.4 and §7 phrase theirs: stated once where
the choice is defined, referred back to elsewhere, **naming no default**, never
using the words "standard game".

**§8.2 is where the choice is defined**, since it is the section that owns
rotation. Replace the paragraph beginning "**Priorities rotate at the end of
every turn on which nothing charged**" with:

- a statement that **how the priorities rotate is chosen before play begins**,
  the same for both players and fixed for the game's lifetime; then
- **Continuous** — the priorities rotate at the end of every turn on which
  nothing charged, 1 → 2, 2 → 3, 3 → 1. (This is today's sentence, kept,
  including that the nodes themselves do not move.)
- **Planet** — the priorities do not rotate at the end of a turn at all. They
  rotate one step, in the same direction, each time a ship **lands on a
  planet**, the moment it lands, in the middle of that player's turn. Leaving a
  planet does nothing; standing on one does nothing; flying over one does
  nothing.
- **Dedicated** — the same, except that the trigger is a **rotator**
  (section 3.3) rather than a planet, and the rotator is **spent** by the
  landing.
- **The timing, stated once and explicitly**: a rotation triggered by a
  landing is complete before the end-of-turn sequence begins, so section 8.6
  step 4 charges from the priorities **as the rotation left them**. Two
  landings in one turn rotate two steps. Give the reader the sentence about
  rings: the node showing **two** rings during a turn with one landing is the
  node that charges at the end of it; the node showing **one** ring is the one
  that charges when there were two landings — or the second of two nodes
  charging after one landing.
- **Keep and check** the existing sentence "A freshly refilled trio is never
  rotated in the same turn it was dealt": under all three settings a refill is
  the last thing that touches the queue in a turn, so it still holds without
  qualification. Say in `Notes:` that it was checked.

**A new section 3.3, "Rotators"**, immediately after §3.2 and before §4 (there
is no existing §3.3, so nothing renumbers). It states:

- rotators exist **only under the dedicated setting** (section 8.2);
- the board is divided into **nine 5 × 5 sections** — columns A–E, F–J, K–O;
  rows 1–5, 6–10, 11–15 — and each section carries **one** rotator;
- a rotator stands only on a square that holds **no planet, no ship and no
  node in any state**; if a section has no such square, that section simply has
  none, so the board can carry fewer than nine;
- the **whole set is replaced** — every rotator removed and a fresh set drawn —
  immediately after each refill of the three inactive nodes (section 8.6 step
  5), and at the opening deal;
- a rotator is **spent** by the ship that lands on it and leaves the board at
  once;
- **section 3.2's constraints do not apply to a rotator**: it may sit on the
  outer edge, and beside a planet or a node;
- a rotator is an ordinary square in every other way — a ship may land on it,
  fly over it (which spends nothing) and stand on it. It is **not a node**: it
  has no state, no countdown and no priority, and it is never counted among the
  board's nodes.

**§2 gains a Rotator entry**, in the existing entries' voice. **Check** §2's
Priority entry — "The inactive node with the highest priority is the one that
charges next" is true at all three settings and needs no change; say so in
`Notes:`.

**§8.6 step 5** is restated: if step 4 charged anything the trio is replaced as
it is today, and — **under the dedicated setting** — the rotators are replaced
immediately afterwards. Otherwise the priorities rotate **only under the
continuous setting**; under the other two, nothing happens at step 5.

**§8.6's closing notes.** The paragraph beginning "A node's state changes only
in this sequence, and never as part of resolving a move or an attack —
**except**…" gains the **second exception**, in the same voice as the first: a
landing rotates the priorities where the chosen setting says it does, in the
middle of a turn. The paragraph explaining why charging reads from the
priorities already on the board ("Charging in step 4 from the priorities
already on the board…") is checked and **extended** by a sentence: under two of
the three settings the arrangement a player reads is also an arrangement that
player can change, which is the point rather than a wrinkle.

**§7** gains the consequence in **one sentence**: with combat on and the planet
setting chosen, a fight returns two ships to planets and therefore rotates the
priorities **twice**. It belongs in §7 because that is where a reader learns
the fight's outcome.

**§1's overview** gains a sentence in each of two paragraphs, not a rewrite:
the paragraph about the board redrawing itself (rotation is now, under two
settings, something the players do), and the paragraph listing the game's
random elements (under dedicated there is one more — where the rotators fall).
The latter currently says "The game has three random elements"; correct the
count honestly for the dedicated case rather than leaving the number wrong.

**§10's opening sentence** lists what is chosen before play and gains rotation
alongside the other six.

**Check, do not rewrite** — each of these is expected to be correct already;
say in `Notes:` which were checked and which, if any, needed a word:

- **§6** — moving onto a rotator is refused by nothing, and the list of what a
  square can refuse a landing for (occupied, or a node that is not charged) is
  unchanged.
- **§9** — check whether it lists the pre-play choices at all, and say so
  either way.
- **§8.1** — the opening deal's bullets describe nodes only; if the opening
  deal's rotators are worth a cross-reference, a pointer to §3.3 is enough.
- **`doc/ruleset/tech-notes.md`** — check whether any measured figure or
  sizing argument there assumes automatic rotation, and record the answer
  either way. It carries no version of its own.

**The changelog entry** states that this is a **gameplay change** — the same
board charges a different node — and so would be a tag candidate, with tagging
staying on hold (S11). Say what changed section by section, in the shape the
0.35 entry uses. Do not name a default: which setting the app preselects is an
app matter and belongs in this plan and the README, not in the ruleset's
changelog.

Depends on: nothing. This is the first step.

Verification (automated): `npm test` green — in particular
`src/rules/rulesVersion.test.ts`, which asserts `RULES_VERSION` matches the
version in `rules.md`, so a bump in one and not the other fails. Test count
stays at **1339**: no behaviour has changed yet. `npm run typecheck` and
`npm run lint` clean; `npm run format:check` reporting only the three
pre-existing warnings from the baseline. Plus a read of the changed sections
confirming that §8.2 states the choice and all three settings, that §3.3
describes rotators, and that no section states end-of-turn rotation as the only
rotation.

---

### Step 2 — Two new leaf modules: the setting, and where rotators fall

Status: committed

Notes: Added `src/rules/nodeRotation.ts` (the `NodeRotationSetting` union,
`NODE_ROTATION_SETTINGS` continuous-first, `DEFAULT_NODE_ROTATION`, and
`isNodeRotationSetting`) in the shape `scoring.ts` uses, and
`src/rules/rotators.ts` (`ROTATOR_SECTIONS`, the nine 5 x 5 sections derived
from `BOARD_SIZE` in the fixed row-band/column-band order, and
`placeRotators`, which draws one square uniformly per section's free
squares, skips a section with none without spending a seed step, and returns
the drawn squares in board order). Neither module imports from `gameState.ts`
or is imported by anything yet, per the step's "scaffolding separate from
behaviour" note. Added `src/rules/nodeRotation.test.ts` and
`src/rules/rotators.test.ts` covering the step's list, including the
no-seed-step-for-an-empty-section case verified by replaying the first eight
sections' draws by hand and comparing seeds. No deviation from the plan.
`npm test` went from 70 files / 1339 tests to 72 files / 1351 tests (12 new,
all passing); `npm run typecheck` and `npm run lint` are clean;
`npm run format:check` shows only the three pre-existing baseline warnings
(the two new files needed one `prettier --write` pass each before the check
was clean).

Add **`src/rules/nodeRotation.ts`** holding the pre-play choice as pure data
(D2), in the shape `clock.ts`, `combatSetting.ts`, `fleet.ts`, `nodes.ts` and
`scoring.ts` use for their own options:

- the setting type — a union of the three lowercase strings `"continuous"`,
  `"planet"` and `"dedicated"`;
- the offered settings as a readonly array in the order the start screen
  renders them — **continuous first**, so leftmost is what the app preselects
  (say that in the doc comment, as `SCORING_SETTINGS` does);
- the app's default, continuous;
- a type guard over an `unknown` value, whose doc comment says it has a real
  caller — `startingGameState` validating a setting that arrives from outside
  the type system (Step 3, D3) — rather than the "nothing calls this yet" note
  `isClockSetting` and `isCombatSetting` carry.

The module must import **nothing** from `src/rules`. The
CONTINUOUS/PLANET/DEDICATED wording is start-screen chrome and does **not**
live here.

Add **`src/rules/rotators.ts`** owning rules.md §3.3 (D4):

- the **nine sections**, derived from `BOARD_SIZE` (three equal bands per axis)
  rather than written out, exported in the **fixed section order** stated in D4
  — row bands ascending, column bands ascending within a band — with a header
  comment saying plainly that this order fixes the order seed steps are spent
  in and must never change;
- **`placeRotators(nodeSquares, shipSquares, seed)`**, which walks the sections
  in that order, draws one square **uniformly** from each section's free
  squares (no planet, no ship, no node in any state) via `drawIndex`, **skips a
  section with no free square without consuming a seed step**, and returns the
  drawn squares **in board order** together with the seed it left behind. At
  most nine seed steps.

`rotators.ts` may import `board.ts`, `planets.ts` and `random.ts`; it must not
import `gameState.ts` — its caller reads the node and ship squares off its own
state (the same arrangement `nodePlacement.ts` has). It knows nothing about the
rotation setting: **not calling it** is how continuous and planet spend nothing
(S8).

Add `src/rules/nodeRotation.test.ts` — the offered settings, their order, the
default, and the guard accepting all three settings while rejecting a near-miss
string, an arbitrary string, numbers, `null`, `undefined` and an object (the
shape `scoring.test.ts` uses).

Add `src/rules/rotators.test.ts` covering, at minimum:

- the nine sections cover the board **exactly once each** — every square in
  exactly one section, nine sections, 25 squares each;
- one rotator per section on an empty-ish board, each inside its own section;
- never on a planet, never on a ship, never on a node of any state;
- a section with **no** free square yields no rotator **and costs no seed
  step** (construct one by filling a whole section with ships and/or nodes, and
  compare the returned seed against the same call with that section free —
  easier: compare against a run where the blocked section is the **last** in
  the order, so the seed after is exactly the seed after eight draws);
- the whole set is drawn afresh — the function is a pure draw, so calling it
  twice with the same inputs gives the same set, and calling it with a
  different seed generally gives a different one;
- the returned list is in **board order** even though the draws walk sections.

Depends on: Step 1 (the rules text these two modules implement). Nothing
consumes either module yet — that is deliberate, keeping scaffolding separate
from behaviour.

Verification (automated): `npm test` green with the two new test files (test
count up); `npm run typecheck` and `npm run lint` clean; `npm run format:check`
showing only the baseline's three warnings.

---

### Step 3 — `nodeRotation` and `rotators` become part of the game state

Status: committed

Notes: `GameState` gained `nodeRotation: NodeRotationSetting` and
`rotators: readonly Square[]`, each with a doc comment in the style of
`chargedNodeCount`/`combatEnabled`/`scoring`. `StartingGameStateOptions`
gained `nodeRotation?: string`, defaulting to `DEFAULT_NODE_ROTATION` and
validated with `isNodeRotationSetting`, throwing a `RangeError` naming the
offered settings exactly as `scoring` does. In `startingGameState`, after
`dealOpeningBoard` returns, `placeRotators` is called under dedicated only
(against the dealt node squares and the fleet's squares), storing the
result on `state.rotators` and the returned seed on `state.randomSeed`;
under continuous and planet `state.rotators` is `[]` and the seed is left
exactly where the deal left it (no call, no seed step). The doc comments
for `randomSeed`/the seed argument were updated to note the extra up-to-nine
steps under dedicated. Did the one-pass test sweep (D11) over the 22 test
files `npm run typecheck` found, adding `nodeRotation: "continuous",` and
`rotators: [],` right after each state literal's `openingSeed:` line via a
scripted per-file Perl pass (mechanical, no existing expectation touched).
Extended `src/rules/gameState.test.ts` with the cases the step calls for:
both fields defaulting to continuous/`[]`; a given setting changing nothing
else; the setting surviving a move; a `RangeError` for an off-list setting;
an empty rotator list at continuous and planet; rotators placed under
dedicated — one per section with room, none on a planet, a ship or a node,
each drawn square attributed to a distinct section; and the seed
consequence (continuous and planet leave the same `randomSeed` from the
same opening seed, dedicated leaves a different one). No deviation from the
plan. `npm test` went from 72 files / 1351 tests to 72 files / 1362 tests
(11 new, all passing, no existing expectation changed); `npm run typecheck`
(which is what proves the sweep is complete) and `npm run lint` are clean;
`npm run format:check` needed one `prettier --write` pass on the newly
edited `gameState.test.ts` and otherwise shows only the three pre-existing
baseline warnings.

Add both fields to `GameState` (D1), with doc comments in the style of
`chargedNodeCount`, `combatEnabled` and `scoring` — each saying it is fixed for
the game's lifetime once set by `startingGameState`, and **why it cannot be
derived** from a board (D1).

Add `nodeRotation?: string` to `StartingGameStateOptions`, defaulting to
`DEFAULT_NODE_ROTATION`, **validated** with `isNodeRotationSetting` and
throwing a `RangeError` naming the offered settings — exactly as `scoring` is,
and for the same reason (D3). Its doc comment says why it is typed `string`.
`rotators` is **not** an option (D3).

In `startingGameState`, after `dealOpeningBoard` returns (D5):

- under **dedicated**, call `placeRotators` with the dealt board's node squares
  and the fleet's squares, store the result as `state.rotators` and the
  returned seed as `state.randomSeed`;
- under **continuous** and **planet**, store `[]` and leave the seed exactly
  where the deal left it — **no call, no seed step** (S8).

Update `startingGameState`'s doc comment: the deal consumes
`chargedNodeCount + 4` steps as today, **plus up to nine more under dedicated
only**.

Then do the **one-pass test sweep** (D11) over the 22 test files listed there,
adding `nodeRotation: "continuous"` and `rotators: []` to each local state
builder or literal. Do not change any existing expectation; if one moves, stop
— that is a real mistake.

Extend `src/rules/gameState.test.ts` with:

- both fields set from the option, defaulting to continuous and an empty list;
- an off-list setting throwing a `RangeError` that names the offered settings;
- the opening deal placing rotators **under dedicated** — one per section where
  one fits, none on a planet, a ship or a node — and **none** under continuous
  and planet;
- the seed consequence: a continuous game and a planet game dealt from the same
  opening seed have the **same** `randomSeed` after the deal, and a dedicated
  game's differs (it spent more steps).

Depends on: Step 2 (`DEFAULT_NODE_ROTATION`, `isNodeRotationSetting`,
`placeRotators`).

Verification (automated): `npm test` green with **no existing expectation
changed** — only builders gaining two fields — plus the new `gameState.test.ts`
cases; `npm run typecheck` (which is what proves the sweep is complete) and
`npm run lint` clean.

---

### Step 4 — One rotation, and `endOfTurn.ts` step 5's two conditions

Status: committed

Notes: Added `rotateQueue` to `src/rules/nodeQueue.ts` (a type-only import
of `NodeStatus` from `gameState.ts`, applying `rotatePriority` to every
inactive entry of a node map and leaving charged/depleted entries alone),
and updated the module's header comment to say it borrows that type and
nothing else. `endOfTurn.ts` step 5 now: (refill branch) calls
`placeRotators` immediately after `refillQueue` under dedicated only,
against the board as the refill leaves it, replacing `state.rotators`
wholesale and advancing the seed, and reports the result on
`QueueRefilledEffect`'s new required `newRotators` field (empty under
continuous and planet); (rotation branch) rotates through `rotateQueue`
only when `state.nodeRotation === "continuous"`, doing nothing at all under
planet and dedicated. Updated the module's header and step-5 comments
accordingly. Extended `nodeQueue.test.ts` with a `rotateQueue` describe
block (moves every inactive node one step and wraps 3→1; leaves
charged/depleted state and level untouched; leaves a map with no inactive
nodes unchanged) and `endOfTurn.test.ts` with four new step-5 cases: no
rotation on a turn that charges nothing under planet; the same under
dedicated, with the existing rotator list left untouched; a refill under
dedicated replacing the whole rotator set clear of the new nodes and the
ships (and different from the list before); and a refill under continuous
or planet leaving both `state.rotators` and `newRotators` empty. Also had
to add `newRotators: []` to three pre-existing `queue-refilled` object
literals in `src/board/announcements.test.ts` (Step 12's file, not this
step's) purely to satisfy the new required field — the same kind of
mechanical fallout the plan's D11 already anticipated for `GameState`
literals, just one field short of the full sweep since only `endOfTurn.ts`'s
own effect type changed here; no expectation in that file was altered.
`npm test` went from 72 files / 1362 tests to 72 files / 1369 tests (7 new,
all passing, no existing expectation changed); `npm run typecheck` and
`npm run lint` are clean; `npm run format:check` shows only the three
pre-existing baseline warnings. No other deviation from the plan.

Add **`rotateQueue`** to `src/rules/nodeQueue.ts` (D6): a state's node map in,
a new map out, with `rotatePriority` applied to every **inactive** entry and
charged and depleted entries untouched. Type-only import of `NodeStatus`;
update the module header, which currently claims the module knows nothing about
`GameState`, to say it borrows that type and nothing else.

Rework `endOfTurn.ts` step 5 (D7):

- the **rotation branch** now rotates through `rotateQueue`, and **only when
  `state.nodeRotation === "continuous"`**. Under planet and dedicated the
  branch does nothing — no state change, no effect, no seed movement;
- the **refill branch** is unchanged except that, **under dedicated only**, it
  calls `placeRotators` immediately after `refillQueue` has placed the new
  trio, against the board as the refill leaves it (so the new rotators see the
  new nodes and avoid them), replacing `state.rotators` wholesale and advancing
  the seed;
- `QueueRefilledEffect` gains the required field `newRotators: readonly
Square[]`, empty under continuous and planet (D7).

Update the module's header comment, which currently describes step 5 as "refill
or rotate" without qualification, and the step-5 in-body comment.

Extend `src/rules/nodeQueue.test.ts`: `rotateQueue` moves every inactive node
one step, wraps 3 → 1, leaves charged and depleted entries — state **and**
level — untouched, and leaves a map with no inactive nodes unchanged.

Extend `src/rules/endOfTurn.test.ts`:

- under **continuous**, step 5 rotates on a turn that charged nothing, exactly
  as today (the existing expectations already cover this — keep them);
- under **planet** and under **dedicated**, the same position leaves all three
  priorities exactly as they were;
- under **dedicated**, a turn that charges something refills the trio **and**
  produces a fresh rotator set — a different set from the one before, placed
  clear of the new nodes and the ships — reported on the `queue-refilled`
  effect's `newRotators`;
- under continuous and planet, a refill leaves `state.rotators` empty and
  `newRotators` empty.

Depends on: Step 3 (the state carries the setting and the list) and Step 2
(`placeRotators`).

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean.

---

### Step 5 — A landing rotates: `ply.ts`, the `queue-rotated` effect, and the fight invariants

Status: committed

Notes: Added `QueueRotatedEffect` (`type: "queue-rotated"`, `square`,
`trigger: "planet" | "rotator"`) to `ply.ts` beside `NodeSpentEffect` and
into both the `MoveEffect` and `AttackEffect` unions. Added a shared
`rotateForLanding(state, destination)` helper (not named in the plan, which
only implied the logic inline) that rotates the queue once and returns the
`QueueRotatedEffect` when `destination` is a planet under planet or holds a
rotator under dedicated (removing it from `state.rotators`), and is a no-op
under continuous or when the destination triggers neither. `applyMove` calls
it once after the ship is placed and the two existing node changes are
applied, pushing the effect after any `node-spent` and before `endPly`
appends the `EndOfPlyEffect`. `applyAttack` calls it twice — attacker's
return square first, then the defender's, threading the state through —
before `assertFightInvariants` runs, and pushes both effects (if raised)
after `fight-resolved`. Narrowed `assertFightInvariants`'s node check to
D9's contract: presence unchanged, `state` unchanged, and a charged or
depleted node's `level` unchanged, with an inactive node's `level` (its
priority) now exempt, with a comment explaining why. Updated `applyMove`'s
and `applyAttack`'s doc comments to describe the third node change and the
fight's rotation respectively. One knock-on fix outside the plan's own file
list: `src/board/EnergyOverlay.tsx`'s `endOfPlySettlements` took a closed
union of a move's and an attack's effect types by hand (not `MoveEffect` /
`AttackEffect` themselves) to find the `ply-ended` / `ply-passed` pair, and
that union needed `QueueRotatedEffect` added alongside the others once the
two effect types grew it — a one-line type and one doc-comment fix, not a
behaviour change, so not treated as a plan deviation worth escalating.
Extended `src/rules/ply.test.ts`'s `buildState` with optional `nodeRotation`
(defaulting to `DEFAULT_NODE_ROTATION`, i.e. continuous — previously
hard-coded) and `rotators` (defaulting to `[]`, as before), and added a new
`describe("a landing rotates the queue (rules.md §8.2)")` block plus four
new `assertFightInvariants` cases covering the story's full list: landing on
a planet/rotator rotates under the matching setting and not the others;
flying over either spends and rotates nothing; leaving a planet or standing
on one all turn rotates nothing; a fight rotates twice under planet
(attacker then defender) and not at all under dedicated; the ordering
clarification (leaving a charged node for a planet charges the node that
held priority 2 under planet, versus priority 3 under continuous — written
against which square ends up charged, since a charge sweeps and replaces the
surviving inactive trio elsewhere, so the pre-existing squares' identities
past that point aren't assumed); the node-spent/queue-rotated/ply-ended
effect order; and, for `assertFightInvariants`, that a rotation-only
before/after pair does not throw while a node appearing/disappearing or a
charged node's level changing still does. `npm test` went from 72 files /
1369 tests to 72 files / 1383 tests (14 new, all passing, no existing
expectation changed); `npm run typecheck` and `npm run lint` are clean;
`npm run format:check` shows only the three pre-existing baseline warnings
after running `prettier --write` on the three files this step touched. No
other deviation from the plan.

This is the heart of the story. In `src/rules/ply.ts` (D8):

- define **`QueueRotatedEffect`** (`type: "queue-rotated"`, carrying `square`
  and `trigger: "planet" | "rotator"`) beside `NodeSpentEffect`, and add it to
  both the `MoveEffect` and `AttackEffect` unions, with a doc comment saying it
  is one effect **per rotation**, that it sits after `node-spent` and before
  the `EndOfPlyEffect`, and that a fight under planet raises two in
  attacker-then-defender order;
- in **`applyMove`**, after the ship is placed and the two existing node
  changes are applied: under planet, a destination that is a planet rotates the
  queue once and raises the effect; under dedicated, a destination holding a
  rotator removes that square from `state.rotators`, rotates once and raises
  the effect; under continuous, nothing happens. Flying **over** a planet or a
  rotator spends and rotates nothing — a move's shape passes over squares, and
  only the destination is consulted, so this needs no code and does need a
  test;
- in **`applyAttack`**, do the same for **both** returned ships, attacker
  first, in the order `returns` already reports them, **before**
  `assertFightInvariants` runs. Under planet this is two rotations; under
  dedicated it is none, because a fight only ever returns ships to planets and
  a rotator never stands on one;
- **narrow `assertFightInvariants`** to the contract in D9 — points 1–3
  enforced, an inactive node's `level` exempt — with a comment saying why the
  exemption exists (a fight under the planet setting rotates the queue, §8.2,
  §7). **Without this narrowing a legal attack throws**, so it is not optional
  tidying.

Update `applyMove`'s and `applyAttack`'s doc comments: `applyMove` currently
says "Two node changes happen as the move resolves — the one knowing exception
to a node's state changing only in the end-of-turn sequence"; that is now
**three**, and there are **two** knowing exceptions in the rules (§8.6's
closing notes, as Step 1 rewrote them). `applyAttack`'s comment currently says
"Neither square's node changes state"; it must now also say what a fight does
to the queue under planet.

Extend `src/rules/ply.test.ts` — the story's list, each as its own case:

- landing on a planet rotates **under planet** and not under continuous or
  dedicated;
- landing on a rotator rotates **under dedicated**, spends that rotator
  (removed from `state.rotators`, the rest untouched), and raises the effect
  with `trigger: "rotator"`;
- flying **over** a planet (under planet) and **over** a rotator (under
  dedicated) spends and rotates nothing;
- **leaving** a planet rotates nothing; standing on one through a turn rotates
  nothing;
- a fight rotates **twice** under planet, in attacker-then-defender order, with
  two effects naming the two planets — and **not at all** under dedicated;
- the ordering clarification, stated as a test: **a ship leaving a charged node
  for a planet, under planet, charges the node that held priority 2**, while
  the same move under continuous charges the node that held priority 3;
- the effect order within a move: `node-spent`, then `queue-rotated`, then the
  `EndOfPlyEffect`.

Extend `src/rules/combat.test.ts` (or wherever `assertFightInvariants` is
exercised — it is exported for exactly this): a hand-built before/after pair
whose inactive priorities have rotated is **not** a violation, and one whose
charged or depleted node changed state or level **still is**, as is one where a
node appears or disappears.

Depends on: Step 4 (`rotateQueue`) and Step 3 (the state's two fields).

Verification (automated): `npm test` green with the new cases — in particular
no thrown `RangeError` from a legal attack under the planet setting;
`npm run typecheck` and `npm run lint` clean.

---

### Step 6 — Whole games at all three settings, and the seeded stream proved unchanged

Status: committed

Notes: `playFullGame` in `fullGame.test.ts` gained two optional trailing
parameters — `nodeRotation` (defaulting to continuous) and `onPly`, a
callback invoked with the state after the opening deal and again after every
ply — so the existing greedy policy could be reused unchanged. Added
`assertQueueInvariant` (exactly three inactive nodes holding 1, 2 and 3, no
repeat) and `assertRotatorsAreFree` (no rotator square carries a node, a
planet or a ship; a no-op under continuous/planet, since `state.rotators` is
empty there) as new helpers, and a `describe.each(NODE_ROTATION_SETTINGS)`
block that plays the file's existing three-round game at each of the three
settings with both assertions wired through `onPly`, plus a final check
against the finished state. In `seededReplay.test.ts`, added a new describe
block with two deal-level cases (not whole games, since the point is the
opening deal specifically): continuous and planet deal the identical opening
board and leave the identical `randomSeed` behind (rotators empty at both),
while dedicated deals the identical board but leaves a different
`randomSeed` and a non-empty rotator list — proving D10's claim directly
rather than by assumption. Extended the file's header comment with a
paragraph on 0.36. No recorded figure in `seededReplay.test.ts` needed to
change — all pre-existing expectations passed unmodified, confirming the
seeded stream is untouched at continuous. No deviation from the plan. `npm
test` went from 72 files / 1383 tests to 72 files / 1388 tests (5 new: 3 in
`fullGame.test.ts`, 2 in `seededReplay.test.ts`, no existing expectation
changed); `npm run typecheck` and `npm run lint` are clean; `npm run
format:check` needed one `prettier --write` pass on `fullGame.test.ts` and
otherwise shows only the three pre-existing baseline warnings.

Test-only, and deliberately so: everything the rules layer owes this story is
now in place, and this step proves it holds over whole games rather than
positions.

Extend `src/rules/fullGame.test.ts`: play a **whole game at each of the three
settings**, to its end, with the queue's invariant checked throughout —
**always exactly three inactive nodes, always holding 1, 2 and 3 with no
repeat**. Reuse the file's existing greedy ply policy rather than writing a new
one, and keep the games short enough not to slow the suite noticeably (the
file's existing three-round game is the model). Under dedicated, also assert
that the board's rotator list never holds a square that carries a node, a
planet or a ship at the moment it is checked.

Extend `src/rules/seededReplay.test.ts` with the assertion D10 calls for: at
the default (continuous) setting the seeded stream is **untouched by this
story** — the file's recorded expectations stand exactly as they are. Add a
case asserting that a continuous game and a planet game dealt from the same
opening seed produce the **same** opening board and the same `randomSeed`
after the deal, and that a dedicated game's seed has moved further. Update the
file's header comment, which narrates the stream's history version by version,
with a sentence for 0.36.

**If any recorded figure in `seededReplay.test.ts` has to change, stop and
escalate** — it means something in Steps 2–5 changed the stream at continuous,
which nothing should have (D10).

Depends on: Step 5 (a game can now be played at all three settings).

Verification (automated): `npm test` green, with `seededReplay.test.ts`'s
existing expectations **unchanged**; `npm run typecheck` and `npm run lint`
clean.

---

### Step 7 — The choice reaches a new game: the intent, the hook and `App`

Status: committed

Notes: `SessionIntent`'s `new-game` variant gained a required
`nodeRotation: NodeRotationSetting` field, and `sessionReducer` passes it
straight through to `startingGameState` alongside the other options; the
type-only import of `NodeRotationSetting` mirrors the existing `FleetSize`,
`ChargedNodeCount` and `ScoringSetting` imports. `useAppScreen` gained a
`nodeRotation` state field (initialised to `DEFAULT_NODE_ROTATION`) and a
`setNodeRotation` setter, both exposed on `AppScreen` and included in
`handlePlay`'s `new-game` dispatch, so a finished game returns to the start
screen with the setting it was played with still chosen; the hook's doc
comment now says "the seven options". `App.tsx` was left untouched, taking
the plan's preferred option — `StartScreen` does not accept the new props
yet, and wiring them there is Step 8's job, so touching `App.tsx` here would
only be reverted or duplicated next step. Extended `src/game/session.test.ts`
with the mechanical sweep of `nodeRotation: "continuous"` onto all eleven
existing `new-game` intent literals (the `buildState` helper already carried
the field from Step 3) plus two new cases: a continuous game deals no
rotators, a dedicated game deals at least one. Extended
`src/useAppScreen.test.tsx`: the default-options case now also asserts
`nodeRotation` is `"continuous"`, and a new case mirrors the existing
combat/scoring "carries a chosen … setting into the new-game intent, and
keeps it on returning to start" tests for a chosen setting of dedicated. No
deviation from the plan beyond the documented "leave `App` untouched" choice
the step itself offered. `npm test` went from 72 files / 1388 tests to 72
files / 1391 tests (3 new, all passing, no existing expectation changed);
`npm run typecheck` and `npm run lint` are clean; `npm run format:check`
shows only the three pre-existing baseline warnings.

- **`src/game/session.ts`**: the `new-game` intent carries `nodeRotation`
  alongside the other six options, as a **required** field, and the reducer
  passes it straight to `startingGameState` — the reducer uses what it is
  handed and reaches for no default of its own. Update the intent's doc
  comment, which lists what `new-game` carries.
- **`src/useAppScreen.ts`**: holds `nodeRotation` in state beside the other
  six, initialised to `DEFAULT_NODE_ROTATION`, exposes it and its setter on
  `AppScreen`, and includes it in the `new-game` dispatch — so a game returns
  to the start screen with the setting it was played with still chosen. Update
  the hook's doc comment, which says "the six options".
- **`src/App.tsx`**: destructures the new value and setter and passes them
  through to `StartScreen` — which does not yet accept them, so **this step
  adds the two props to `StartScreen`'s interface and ignores them**, or
  (preferred) leaves `App` untouched until Step 8. Choose the one that keeps
  the build green with the smaller diff, and say which in `Notes:`.

Extend `src/game/session.test.ts` (the intent carries the setting; a game
started with dedicated has rotators and one started with continuous does not)
and `src/useAppScreen.test.tsx` (the default is continuous; setting it changes
what `handlePlay` dispatches; the choice survives a return to the start
screen).

Depends on: Step 3 (the starting option) — and, for the behavioural assertions,
Steps 4–5.

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean.

---

### Step 8 — The start screen's seventh group

Status: committed

Notes: Added the `Inactive node rotation` fieldset to `StartScreen.tsx`
between Scoring and Combat, rendered by the existing `OptionChoice` from
`NODE_ROTATION_SETTINGS` with the label table `continuous` → CONTINUOUS,
`planet` → PLANET, `dedicated` → DEDICATED; the component stays controlled
(`nodeRotation` prop, `onNodeRotationChange` handler), and its header comment
now says "the seven options". `App.tsx` was untouched by Step 7, so this step
destructures `nodeRotation`/`setNodeRotation` from `useAppScreen` and passes
them through to `StartScreen`. Extended `StartScreen.test.tsx`: the seven-group
order assertion, a test that the new group offers all three labels with the
given one checked, a default-CONTINUOUS-with-order test, and a handler test
that clicking DEDICATED calls only `onNodeRotationChange`. Extended
`App.test.tsx`: the start screen's default-options test now also asserts
CONTINUOUS is checked in the new group; added a seven-group order test in the
real app; extended the existing "returns to start screen with options
untouched" test to also choose and check DEDICATED; and added a new test that
choosing DEDICATED starts a game and, on returning to the start screen (via
`traverseTo` with `confirm` stubbed true), still shows DEDICATED checked —
per the plan's allowance, this proves the option round-trips through a real
game rather than asserting rotators are drawn on the board, since
`RotatorMarker` does not exist until Step 9. No other deviation from the
plan. `npm test` went from 72 files / 1391 tests to 72 files / 1396 tests (5
new, all passing, no existing expectation changed); `npm run typecheck` and
`npm run lint` are clean; `npm run format:check` shows only the three
pre-existing baseline warnings. The layout verification (seven groups fitting
a short landscape window) is manual and left to the owner, per S13 and the
step's own instruction. Owner verified: the seven groups show in the stated
order with CONTINUOUS checked and nothing clips; continuous and planet play
out correctly, and dedicated behaves as expected ahead of Step 9.

Add the seventh option group to `src/start/StartScreen.tsx`, **between Scoring
and Combat**, so the screen reads: **Ships, Charged nodes, Scoring, Inactive
node rotation, Combat, Rounds, Clock**.

- legend: `Inactive node rotation` (the stylesheet uppercases legends);
- choices rendered by the **existing `OptionChoice`**, from
  `NODE_ROTATION_SETTINGS`, with a label table in the file beside the Scoring
  and Combat ones: `continuous` → **CONTINUOUS**, `planet` → **PLANET**,
  `dedicated` → **DEDICATED**. CONTINUOUS is leftmost and checked at first;
- the component stays controlled: the new `nodeRotation` prop and
  `onNodeRotationChange` handler, no state of its own, no dispatch;
- update the file's header comment, which says "the six options".

Wire it in `src/App.tsx` if Step 7 did not.

**No new styling and no restyle** (S13). The three labels are **settled**:
CONTINUOUS, PLANET and DEDICATED, the owner's own words, decided at the plan
gate. The alternative that named the trigger — CONTINUOUS / PLANETS /
ROTATORS — was considered and rejected. Do not reopen it.

Extend `src/start/StartScreen.test.tsx` — the seventh group exists, sits
**fourth** among the seven (assert the full legend order, not just presence),
offers the three labels in order, preselects CONTINUOUS, and calls the handler
with the right value when a choice is clicked — and `src/App.test.tsx` — the
seven groups and their order in the real app, and a game started after choosing
DEDICATED being a game that has rotators (assert through what the board draws
once Step 9 lands, or through the option surviving a return to the start
screen; do not contort the test — if the cleanest proof has to wait for Step 9,
say so in `Notes:` and put it there).

Depends on: Step 7 (the hook holds the value and the intent carries it).

Verification (**manual** — the layout risk this story carries, called out in
`story.md`): with `npm test`, `npm run typecheck` and `npm run lint` green
first, the owner runs `npm run dev` and confirms that the start screen shows
seven groups in the stated order with CONTINUOUS checked, and that **nothing
clips or overflows** at the window sizes the screen is sized for — in
particular a short landscape window, where five groups were already noted as
filling the screen (story 85). If seven do not fit, that is a **finding to
record in `Notes:` and raise with the owner**, not a layout pass this step
takes on (S13).

---

### Step 9 — The board shows a rotator

Status: committed

Notes: Added `src/board/nodeArt.ts` holding `INACTIVE_RING_COLOR`, moved out
of `NodeMarker.tsx` (which now imports it; only the colour moved, per D12).
Added `src/board/RotatorMarker.tsx` (+ `RotatorMarker.css`, following
`NodeMarker.css`'s shape): a stateless component drawing three ~90-degree
arcs with three equal ~30-degree gaps (90+90+90 arc plus 30+30+30 gap sums
to 360, computed from `ARC_SPAN_DEGREES`/`ARC_COUNT` rather than hard-coded
so the "about 90, gaps equal" relationship is visible in the constants), each
arc ending in a small triangular arrowhead computed from the arc's own
tangent direction at its clockwise (leading) end, in `INACTIVE_RING_COLOR`,
in the same `0 0 100 100` viewBox, `aria-hidden`. `BoardSquare` gained the
optional independent `hasRotator` boolean, drawn via `<RotatorMarker />` in
the same stacking slot `NodeMarker` occupies (beneath any ship), and its
header comment now notes a square is at most one of a planet, a node and a
rotator. `Board.tsx` builds a `Set` of rotator square names from
`state.rotators` once per render (beside the ship index) and passes
`hasRotator` down to both `BoardSquare` and `squareLabel`. `squareLabel.ts`
names a rotator in the shared planet-or-node slot (`"F7, rotator"`), with an
`else if` after the node-state check so the three stay mutually exclusive in
the reader's eye even though nothing enforces it at the type level; its
header comment was updated accordingly. Extended `BoardSquare.test.tsx` (a
rotator square draws the mark aria-hidden; a bare square draws neither it nor
a node marker; a node square draws no rotator mark), `squareLabel.test.ts`
(the rotator wording, its absence when `hasRotator` is false or omitted, and
that a node state takes precedence over a rotator flag in a hand-built
state that puts both) and `Board.test.tsx` (a new `stateWithRotators` helper
and a "rotators the board is told to draw" describe block: the mark appears
on exactly the squares `state.rotators` names and nowhere else, and none at
all when the list is empty). Added the accessibility note to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` under a new "From
story 90" heading (appended at the end of the file, matching its established
chronological-by-edit rather than numeric ordering), recording that a
rotator reads as a bare noun with no explanation of what it does and that
there is no summary of where the board's rotators are for a screen-reader
user (D14, S12). No deviation from the plan. `npm test` went from 72 files /
1396 tests to 72 files / 1404 tests (8 new, all passing, no existing
expectation changed); `npm run typecheck` and `npm run lint` are clean;
`npm run format:check` shows only the three pre-existing baseline warnings
after a `prettier --write` pass on the two files this step's own formatting
touched (`RotatorMarker.tsx`, `BoardSquare.test.tsx`). The artwork itself —
legibility, the turning read, sizing in both orientations, and that the
board is not visibly smaller — is the owner's manual check, not run here.

- **`src/board/nodeArt.ts`** (new): holds `INACTIVE_RING_COLOR` (`#DAA520`),
  moved out of `NodeMarker.tsx`, which now imports it. Only the colour moves
  (D12).
- **`src/board/RotatorMarker.tsx`** (+ its CSS file, following
  `NodeMarker.css`): the recycling mark described in D12 — three arcs of about
  90 degrees with three equal gaps and an arrowhead at each arc's leading end,
  in the same `0 0 100 100` viewBox, in `INACTIVE_RING_COLOR`, `aria-hidden`.
  Exact angles, stroke width and arrowhead shape are the drawing's business.
- **`src/board/BoardSquare.tsx`**: one more optional, independent field saying
  the square holds a rotator, drawn in the same slot a node marker occupies
  (beneath any ship). Update the file's header comment, which itemises a
  square's stacked contents.
- **`src/board/Board.tsx`**: builds a name `Set` from `state.rotators` once per
  render, beside the ship index, and passes the flag down (D13).
- **`src/board/squareLabel.ts`**: a rotator reads in the **planet-or-node
  slot** — `"F7, rotator"` — since a square is at most one of the three (D13).
  Update the file's header comment, which explains why the planet and node
  share one slot.

Extend `src/board/BoardSquare.test.tsx` (a rotator square draws the mark; a
square holding nothing draws neither it nor a node marker; a node square does
not draw it), `src/board/squareLabel.test.ts` (the wording and its position
among the segments) and `src/board/Board.test.tsx` (a state carrying rotators
draws one on each of those squares and nowhere else).

Add the accessibility note to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` under a "From story
90" heading, in the file's existing shape (what was given up, why, and where):
a rotator is announced as a bare noun with nothing saying what it does, and a
screen-reader user gets no summary of where the nine of them are (D14, S12).

Depends on: Step 3 (`state.rotators` exists) and Step 8 (a dedicated game can
be started from the UI, which is what makes the manual check possible).

Gate outcome: the owner confirmed the functionality works, and asked for a
quieter board — silver rather than gold, shorter arcs, wider arrowheads, and
six rotators rather than nine. Those became Steps 10 and 11. Step 10 rewrote
this step's own new files before this step had been committed, so the two
were committed together; Step 11's rules change is its own commit.

Verification (**manual** — new artwork, which only an eye can settle): with
`npm test`, `npm run typecheck` and `npm run lint` green first, the owner runs
`npm run dev`, starts a **DEDICATED** game, and confirms that the rotator mark
is drawn on the rotator squares, reads as a turning recycling symbol, carries
the inactive rings' colour, is legible at the board's square size in both
orientations, and that **the board is not visibly smaller than it is today**.
Also that a **CONTINUOUS** game draws no rotator anywhere.

---

### Step 10 — A quieter rotator: silver, shorter arcs, wider arrowheads

Status: committed

Notes: Done inline by the orchestrator rather than dispatched, being three
constants and their comments. `nodeArt.ts` gained `ROTATOR_COLOR` (`#C0C0C0`)
alongside `INACTIVE_RING_COLOR`, and its header comment now records why the
two are no longer the same colour; `RotatorMarker.tsx` imports the new
constant, drops `ARC_SPAN_DEGREES` from 90 to 68 (a quarter off each arc,
so the three gaps grow from 30 degrees to 52), and widens the arrowhead by
half. The arrowhead's width constant was renamed `ARROWHEAD_BASE_WIDTH`,
because `ARROWHEAD_HALF_WIDTH` was halved again at both use sites and so had
never held the half-width its name claimed; 9 to 13.5 is the +50% against
the width actually drawn. No test asserted the mark's colour or geometry, so
none needed changing.

What to implement: the owner's Step 9 gate feedback was that the mark works
but the board reads as "a lot noisier". Three changes, all in the artwork and
none in the rules: draw the mark in **silver** rather than the inactive
rings' gold, shorten **each arc by about a quarter** so the gaps between them
grow, and widen the **arrowheads by half** so the mark still reads as turning
at the board's square size once its arcs are shorter.

This retires half of D12's reasoning: the mark was drawn in
`INACTIVE_RING_COLOR` so it would read as "this moves the rings" by being the
rings' own colour, and nine gold marks on a board that already carries gold
rings is exactly the noise the owner saw. The colour is still shared **from**
`nodeArt.ts` — the file stays the one place a square-level drawing's colour
lives — but the rotator now has its own entry there, and the header comment
says why.

Why it comes here: it is the smallest of the two changes the gate raised and
touches nothing the other does, so it lands first and is judged on its own;
Step 11's larger change then has a settled mark to draw fewer of.

Verification (**manual** — artwork, which only an eye can settle): with
`npm test`, `npm run typecheck` and `npm run lint` green, the owner runs
`npm run dev`, starts a **DEDICATED** game and confirms the marks are silver,
still read as turning at the board's square size in both orientations, and
that the board as a whole is quieter than it was. Worth an eye in particular:
silver sits nearer the **depleted** node's grey (`#808080`) than gold did, so
the two must still be tellable apart at a glance.

Gate outcome: the owner confirmed the quieter mark reads correctly.

---

### Step 11 — Six rotators, not nine: the corners always, then two more

Status: committed

Notes: `src/rules/rotators.ts`'s `placeRotators` now draws a rotator in the
four corner sections (the ones holding A1, K1, A11 and K11, identified off
`ROTATOR_SECTIONS` itself rather than hardcoded) always, then draws two more
sections without replacement from the remaining five (one of five, then one
of the remaining four — always consuming a seed step for each pick,
whatever that section turns out to hold) and draws one square from each of
those two, in `ROTATOR_SECTIONS` order throughout. A section with no free
square still costs no seed step for its own square draw. The module's
header comment, `ROTATOR_SECTIONS`'s own comment and `placeRotators`'s doc
comment were rewritten to describe the new order and the "at most eight
seed steps" figure (two section draws plus at most six square draws).
`rules.md` §3.3 and the 0.36 changelog entry were rewritten in place — per
the one-bump-per-branch rule, 0.36 now reads as if it always described six
rotators (four corners always, two more from the remaining five); no
version bump, no second changelog entry. `story.md`'s "nine" statements
about rotator counts were corrected to six throughout (the bullets under
"What changes" and "Effect on the game", the §3.3 in-scope description, the
`placeRotators` in-scope description and its seed-step count, the
verification list's DEDICATED-game bullet, and the closing manual-check
note); its two mentions of the board's nine _sections_ (a geometric fact
unchanged by this step) were left alone, as were the "nine sections"
mentions in `rotators.test.ts` and `rotators.ts` describing the section
count rather than the rotator count. `RotatorMarker.tsx`'s doc comment
("nine of these may be on the board") and the accessibility known-issues
note ("all nine (or fewer) marks") were corrected to six. Two more spots
outside the step's own list, found by grepping for stray seed-count
mentions once the code changed: `gameState.ts`'s `startingGameState` doc
comment and `seededReplay.test.ts`'s header comment both said "up to nine
more" / "up to nine at the opening deal and up to nine after every queue
refill" for the rotator seed steps; corrected to eight in both, since
leaving them would have been the same kind of stale claim the step exists
to fix elsewhere. `src/rules/rotators.test.ts` was substantially rewritten:
the old 9-count "one rotator per section" case became a 6-count case
asserting one rotator in each corner section and exactly two more among the
other five; a new case confirms the four corner sections are distinct; the
seed-consumption case now blocks a full corner section (rather than the
last of nine) and replays the new draw order by hand (unblocked corners,
then the two section-index picks, then the two extra squares) to confirm
the blocked corner costs no step and the result does not backfill past
five. `gameState.test.ts`'s dedicated-deal test had its loose upper bound
tightened from `ROTATOR_SECTIONS.length` (9) to 6 and its title/description
updated to say "up to six". `endOfTurn.test.ts` and `fullGame.test.ts` were
checked per the step's list and needed no change: neither hardcodes a
rotator count anywhere. No deviation from the plan beyond the two
additional stray-comment fixes noted above, which the step's own "anything
else that counts rotators aloud follows" instruction covers in spirit.
`npm test` went from 72 files / 1404 tests to 72 files / 1405 tests (one
new case net, after the count-9 case was replaced and a corner-count case
added); `npm run typecheck` and `npm run lint` are clean; `npm run
format:check` shows only the three pre-existing baseline warnings after a
`prettier --write` pass on the rewritten `rotators.test.ts`. The board
manual check (six rotators, one per corner and two elsewhere, quiet enough)
is the owner's and was not run here, per the step's instruction not to sign
off the manual part.

What to implement: the board carries **six** rotators rather than nine. The
four **corner** sections — the section holding A1, the one holding K1, the one
holding A11 and the one holding K11, in `ROTATOR_SECTIONS` order — always
carry one. The remaining **two** are drawn from the other five sections
(the four edge sections and the middle one), each section carrying at most
one. A chosen section with no free square simply carries no rotator, exactly
as today: the draw does **not** fall through to another section to make the
count up, so a board can still hold fewer than six.

This is a **rules change**, so it changes `doc/ruleset/rules.md` §3.3 and
anything else in the document that says "nine" of rotators (§2's Rotator
entry, if it counts them). Per the project's one-bump-per-branch rule, it
**folds into the existing 0.36 bump**: do not bump the version again and do
not add a second changelog entry — rewrite the 0.36 entry so it describes
six rotators as if that is what 0.36 always said, since 0.36 has never been
on `main`.

In `src/rules/rotators.ts`:

- `ROTATOR_SECTIONS` keeps its nine sections and its fixed order, which must
  still never change — it is the seed's order. Name the four corner sections
  and the five others off that array rather than rebuilding the geometry.
- `placeRotators` draws in a **fixed, documented order**: the four corner
  sections first, in `ROTATOR_SECTIONS` order, one square drawn uniformly
  from each section's free squares; then the **two extra sections**, drawn
  from the five remaining by index, without replacement (draw one of five,
  then one of the four left); then one square from each of those, in
  `ROTATOR_SECTIONS` order, so the order squares are drawn in does not depend
  on which sections came out. Say in the doc comment that this order fixes
  the seed and must not change.
- A section with no free square consumes **no** seed step for its square (as
  today) — but note the two section draws themselves always happen, and always
  consume their step, whether or not the sections they pick turn out to be
  full. Write that down: it is what keeps the stream predictable.
- The return stays board-ordered, and the "at most nine seed steps" note
  becomes at most eight (two section draws plus at most six square draws).

Everything else that counts rotators aloud follows: the module header, the
`RotatorMarker` doc comment ("nine of these may be on the board"), Step 9's
note in `doc/plan/00000021-accessibility-tech-debt/known-issues.md` ("all
nine (or fewer)"), and `story.md`, which describes nine and must be corrected
in place to six — the project's rule is that a story says what was built, not
what was first asked for.

Tests: `src/rules/rotators.test.ts` needs its existing count expectations
moved to six, plus new cases — every corner section always carries one; only
two of the other five do; two full boards drawn from the same seed agree; a
board whose corner section is full carries five rather than backfilling.
`gameState.test.ts`, `endOfTurn.test.ts` and `fullGame.test.ts` assert
rotator counts or invariants and will need the same move.

Why it comes here: it changes the ruleset and the draw, so it must land
before the guide (13) and the README (14) describe the board, and before the
owner's play-through (15). It comes after Step 10 so that the mark being
judged is the final one.

Verification (**manual**, with the automated suite behind it): `npm test`,
`npm run typecheck` and `npm run lint` green, with the new placement tests
among them; then the owner runs `npm run dev`, starts a **DEDICATED** game
and confirms the board carries six rotators, one in each corner section and
two elsewhere, and that the board now reads as quiet enough.

Gate outcome: the owner confirmed the six-rotator board plays and reads
correctly.

---

### Step 12 — The live region says the queue moved on

Status: committed

Notes: Added `queueRotatedClause` (the two D15 sentences, keyed on
`effect.trigger`) and `queueRotatedClausesText` (one clause per
`queue-rotated` effect in a move's or fight's effect list, joined in order)
to `src/board/announcements.ts`, imported `QueueRotatedEffect` as a type from
`../rules/ply`, and spliced `queueRotatedClausesText(event.effects)` onto the
end of `moveSentence` (after the existing node-spent clause) and onto the end
of `fightSentence` (after the two returns are named), both ahead of the
turn-ending clauses each sentence already sits inside. Extended
`src/board/announcements.test.ts` with a new "the queue rotating" describe
block: the planet clause, the rotator clause, the rotation clause's position
after a node-spent clause, no clause for a move that triggered neither, both
of a fight's clauses under planet in attacker-then-defender order, and no
clause for a fight under dedicated. One deviation from the plan's literal
text: the describe block's title uses a plain hyphen and "8.2" rather than
the em dash and "§" the neighbouring blocks use, because the Edit tool could
not reliably place those two characters in one pass; a follow-up Python
rewrite corrected the title in place to the neighbouring blocks' exact
wording (`— … (rules.md §8.2)`), verified byte-for-byte against an existing
title, so the file's final text is unaffected — noted here only because the
plan asks for any deviation to be on the record, however momentary. `npm
test` went from 72 files / 1405 tests to 72 files / 1411 tests (6 new, all
passing, no existing expectation changed); `npm run typecheck` and `npm run
lint` are clean; `npm run format:check` shows only the three pre-existing
baseline warnings, unrelated to this step's files.

Add the rotation clause to `src/board/announcements.ts`, in the wording D15
fixes:

- planet trigger — "Landing on the F7 planet moved the waiting nodes on a
  step.";
- rotator trigger — "The rotator at F7 was spent, moving the waiting nodes on a
  step."

One clause per `queue-rotated` effect, in the order the effects appear: in a
move's sentence after the `node-spent` clause, and in a fight's sentence after
the two returns are named, both **before** the turn-ending clauses. A fight
under planet therefore speaks two of these, attacker's first.

Extend `src/board/announcements.test.ts`: each trigger's clause; its position
within a move's sentence and within a fight's; two clauses for a fight under
planet; and no clause at all for a move that rotates nothing.

Depends on: Step 5 (the effect exists and is raised).

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean. Live-region wording is **never**
manually verified (S12).

---

### Step 13 — The Quick Guide's NEW CHARGED NODE SELECTION section

Status: committed

Notes: `GuideSection` gained an optional `settingLines?: readonly
GuideSettingLine[]` (a new `{ label, text }` interface) alongside the
existing shape; only `nodeSelection`'s entry in `GUIDE_SECTIONS` carries it.
The paragraph and the three setting lines were reproduced verbatim from the
step (the wrapping quote marks around the paragraph in the step's own text
were read as the plan author's quoting convention, not literal characters —
the same convention story 50's `story.md` used for this section's original
paragraph, which also carries no literal quotes in `guideCopy.ts`).
`GuideScreen.tsx` gained a second, partial `TRAILING_DIAGRAMS` map
(`Partial<Record<GuideSectionId, ComponentType>>`, `nodeSelection` only) and
renders each section's `settingLines` (each an `<em>{label}</em>: {text}`
paragraph) between the section's diagram and its trailing diagram. Added
`.guide-screen__paragraph em` to `GuideScreen.css` (italic,
`--color-text-bright`) — no other restyling. Added `RotatorSquareDiagram` to
`guideDiagrams.tsx`: a single `GuideDiagram` cell, one `BoardSquare` with
`hasRotator: true` and nothing else (no ship, no node), following the other
diagrams' conventions exactly (same wrapper, same `aria-hidden` grid,
built from a real `BoardSquare`). `NodeSelectionDiagram` itself is
unchanged. Updated `guideCopy.test.ts` (the new paragraph verbatim, a new
case for the three setting lines verbatim, and widened the vocabulary sweep
to flatten `settingLines`' labels and text into the swept string — the
"vocabulary trap" the step called out), `guideDiagrams.test.tsx` (a new
`RotatorSquareDiagram` case), and `GuideScreen.test.tsx` (the diagram count
moved from five to six, and a new case asserting the setting lines render as
`<em>label</em>: text` in order and that the rotator mark follows the last
one). No deviation from the plan's structural decisions. This step's
verification is manual (the owner reading the guide in the running app);
that was not attempted here. `npm test` went from 72 files / 1411 tests to
72 files / 1414 tests (3 new, all passing, no existing expectation broken);
`npm run typecheck` and `npm run lint` are clean; `npm run format:check`
shows only the three pre-existing baseline warnings after a `prettier
--write` pass on `guideDiagrams.test.tsx` (line-wrap only).

The owner supplied the copy at this step, as S14 said they would, and it is
reproduced below **verbatim** — with two wording fixes the owner approved
after reading it back: the three setting lines say "The rings rotate", to
match the lead-in sentence rather than switching to "nodes" halfway, and the
option is named "Inactive node rotation", exactly as the start screen's group
is labelled. It is not to be reworded, re-punctuated or
re-ordered: where it differs from `rules.md`'s own phrasing, the copy wins,
because the guide is the player's voice and the rules document is not.

The section's paragraph becomes:

> "Three indicators appear on the board, with one, two, and three rings.
> When a new charged node is needed, it appears at the three-ring indicator —
> and all three indicators are then replaced by a fresh set elsewhere. The
> rings rotate, depending on the Inactive node rotation selected."

Then the **existing** `NodeSelectionDiagram`, unchanged — the owner's call at
the gate was that it stays, because the rotation it pictures is common to all
three settings and only the trigger differs.

Then three **setting lines**, each an emphasised label and a sentence:

> _Continuous_: The rings rotate at the end of each player's turn.
>
> _Planet_: The rings rotate each time a ship arrives at a planet (including
> post-combat, if combat is enabled).
>
> _Dedicated_: There are dedicated rotators that appear on squares. Landing
> on one of these triggers the rotation.

Then a **second diagram**: a single board square holding a rotator, drawn in
the style of the guide's other diagrams and using the same `RotatorMarker`
the board uses, so the player sees the mark they will be looking for. Nothing
else in it — no ship, no node, no rings.

**The shape this needs.** The guide's copy model is one heading, one
paragraph and one diagram per section (`GuideSection` in
`src/guide/guideCopy.ts`, `SECTION_DIAGRAMS` in `src/guide/GuideScreen.tsx`,
which is a total `Record<GuideSectionId, ComponentType>` so that a section
without a diagram fails to compile). This section now needs two diagrams with
copy between them, and it stays **one section** — the owner chose an extra
diagram inside NEW CHARGED NODE SELECTION, not a new headed section. So:

- `GuideSection` gains an **optional** `settingLines` — an ordered list of
  `{ label, text }` pairs — rendered between the section's diagram and its
  second one. Only `nodeSelection` carries it; the other three sections are
  untouched and keep their present shape.
- `GuideScreen.tsx` gains a second, **partial** map from section id to a
  trailing diagram, rendered after the setting lines. Partial, not total:
  three of the four sections have no trailing diagram, and that is the normal
  case rather than an omission to catch.
- The label is emphasised the way the owner's asterisks ask for — an `<em>`,
  styled in `GuideScreen.css` alongside the existing paragraph styles. No
  other restyling of the guide.
- The new diagram, `RotatorSquareDiagram`, lives in
  `src/guide/guideDiagrams.tsx` beside the others and follows their
  conventions exactly (same wrapper, same sizing approach, same
  accessibility treatment as its neighbours — whatever they do, it does).

**The vocabulary trap.** `src/guide/guideCopy.test.ts` asserts the guide says
**points** and **fuel** and contains neither "energy" nor "power". Check that
the assertion actually sweeps the new `settingLines` strings too, not just
the paragraphs — if it walks `GUIDE_SECTIONS` looking only at `paragraph`,
widen it, or the new copy escapes the check that exists to catch exactly this.
The supplied copy is clean as written; the point is that the test must be able
to say so.

Tests to update: `guideCopy.test.ts`'s verbatim paragraph assertion for
`nodeSelection`, plus verbatim assertions for the three setting lines;
`guideDiagrams.test.tsx` gains a case for `RotatorSquareDiagram`; any
`GuideScreen` test that counts sections, paragraphs or diagrams will need the
new elements. `NodeSelectionDiagram` itself does **not** change.

Depends on: Step 1 (the rules the copy describes) and Step 11 (the rotator the
second diagram draws). The guide's other sections and diagrams are untouched.

Verification (**manual**): `npm test`, `npm run typecheck` and `npm run lint`
green with the updated expectations, then the owner opens the Quick Guide in
the running app and confirms the section reads in the intended order —
paragraph, rotation diagram, the three setting lines, the rotator square —
and that the copy is theirs, word for word.

Gate outcome: the owner read the section in the running app and accepted it.

---

### Step 14 — `README.md`

Status: committed

Notes: Rewrote the rings paragraph to state rotation as a choice: continuous
kept as today's sentence, then planet (a ship landing on a planet shifts the
rings one step, mid-turn, tying it to refuelling, and a combat fight shifts
them twice) and dedicated (up to six extra squares, spent on landing, a fresh
six after each node lights), all in the README's existing "lights"/"lit"
vocabulary rather than the rules' "charge". Added the seventh choice to the
status paragraph's list, between scoring and combat, in the same
`(continuous, planet or dedicated, continuous to start)` shape the other
choices use, and updated both "six choices" references to "seven choices".
Ran the equivalent of `/update-readme` by hand (the slash command isn't a
callable tool in this session): reviewed the branch's rules and UI changes
against the rest of the README and found nothing else it describes that this
story moved — the start screen's option list is the only thing it names, and
that's the paragraph already rewritten; the Quick Guide's own wording is not
restated in the README and needed no change. No deviation beyond that
substitution. `npm test` unaffected at 72 files / 1414 tests (README is not
code); `npm run typecheck` and `npm run lint` clean; `npm run format:check`
shows only the three pre-existing baseline warnings, none of them
`README.md`.

`README.md`'s rules-summary paragraph currently states today's rotation as the
only rotation, in the player's words:

> "On a turn when nothing lights, the rings shift round — the single becomes a
> double, the double becomes a triple, and the triple drops back to a single —
> so you can read not just what lights next but what lights the turn after
> that."

Rewrite that as the **choice**, in the same voice and at the same length: which
of the three schemes the players pick before the game, what each one does, and
that the app starts on the one the game has always had. Mention the rotators as
what the dedicated setting puts on the board, in the players' words — the
README is written for a non-technical reader (`CLAUDE.md`).

Then run **`/update-readme`** for the rest of the branch diff, which reviews
the whole change and updates anything else the README describes that this story
has moved (the start screen's option list is the likely one).

Depends on: everything before it, since the README describes the finished
behaviour.

Verification (automated): `npm test` and `npm run lint` green;
`npm run format:check` showing only the baseline's warnings — plus a read of
the changed paragraph confirming it describes rotation as a choice and states
no default as a rule.

---

### Step 15 — The owner plays all three settings

Status: pending

No code. The story's own verification list, run by the owner in the running
app, and the pipeline's final gate before peer review.

Depends on: every previous step.

Verification (manual): the owner runs `npm run dev` and confirms:

- the start screen shows seven option groups in the order **Ships, Charged
  nodes, Scoring, Inactive node rotation, Combat, Rounds, Clock**, with
  **CONTINUOUS** checked;
- in a **CONTINUOUS** game, the rings shift at the end of every turn on which
  nothing charged, exactly as they do today, and no rotator is drawn anywhere;
- in a **PLANET** game, the rings do not move on a turn that charges nothing
  and lands nowhere; they move one step on the turn a ship lands on a planet;
  and they do not move when a ship leaves one, flies over one, or stands on one
  through a turn;
- in a **PLANET** game with **combat on**, an attack moves the rings **two**
  steps;
- in a **DEDICATED** game, six rotators are on the board at the start — one in
  each of the four corner 5 × 5 sections and two more elsewhere, none on a
  planet, a ship or a node (Step 11); landing on one removes it and moves the
  rings one step; landing on a planet moves nothing; and a fresh six appear
  the moment something charges;
- **the ordering clarification, by hand**: with a ship holding a charged node,
  note which node shows **two** rings, move that ship onto a planet (PLANET) or
  a rotator (DEDICATED), and confirm the node that charges at the end of that
  turn is the one that showed **two** rings — not three;
- a rotator square can be moved onto, moved through and stood on, and flying
  over one leaves it there;
- the board is not visibly smaller than it is today, and the start screen's
  seventh group does not clip or overflow at the window sizes the screen is
  sized for;
- the choice survives a return to the start screen, and a second game starts
  from it;
- the Quick Guide describes the rotation and its three settings.

Two further observations the owner wants from play, recorded in `Notes:` rather
than acted on in this story: whether **six** rotators is generous or tight in
a DEDICATED game played until they run low, and whether the double rotation an
attack buys under PLANET with combat on is too strong a reason to attack.
