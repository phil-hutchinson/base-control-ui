# Implementation Plan — Story 00000122, Core package and release

## What this story does

The rules become the **core**: an entry point, `src/core/index.ts`, over
`src/rules/`, built by `npm run build:core` into a dependency-free ES module
plus type declarations, packed as `base-control-core`, smoke-tested in plain
Node 22, and published by a hand-run GitHub workflow as a `core-<hash>`
prerelease the online-play server vendors. To get there, the rules stop
carrying a seed in `GameState`: every random event draws from a
**`RandomSource`** handed in by the caller, so a client can replay the
server's recorded draws. Nothing a player sees changes, and the ruleset is
untouched (no rules-version bump, no changelog entry).

`story.md` in this folder is the owner's statement of the change. Its
export list, setup format, ply notation, refusal reasons, state-hash
definition, packaging and workflow details are a cross-repository contract
agreed in the online-play design doc; this plan implements them as written
and records below the few places it had to decide something the story left
open.

## Where things stand today (for a cold reader)

- `src/rules/random.ts` holds `mulberry32` and two pure, seed-in/seed-out
  draws: `drawIndex(seed, count)` and `drawWeightedIndex(seed, weights)`.
  Each consumes exactly one `mulberry32` step and returns
  `[index, nextSeed]`.
- `GameState` (`src/rules/gameState.ts`) carries `randomSeed` (the seed the
  next draw uses) and `openingSeed` (the seed the opening deal started
  from). Every draw site threads `state.randomSeed` through and writes the
  advanced seed back. The draw sites are: `nodes.ts` (`dealOpeningBoard`),
  `nodePlacement.ts` (`drawNodeSquare`, `drawWeightedNodeSquare`,
  `drawStealProspectiveSquare`, `drawStealOpeningProspectiveSquare`),
  `nodeQueue.ts` (`refillQueue`), `rotators.ts` (`placeRotators`),
  `bonusPlanets.ts` (`dealBonusPlanets`), `activityBonus.ts`
  (`drawActivityBonusKind`, `drawActivityBonusPlanet`,
  `dealActivityBonuses`, `resolveActivityBonusClaim`), `steal.ts`
  (`dealStealOpeningBoard`, `claimNode`, `abandonNode` and the shuffles
  behind them), `combat.ts` (`drawReturnPlanet(state)`), and whatever in
  `charging.ts`, `relief.ts` and `endOfTurn.ts` threads a seed between
  those. `grep -n "seed\|Seed" src/rules/*.ts` lists every site.
- The top-level rule entry points are `startingGameState(seed, options)`
  (`gameState.ts`), `runEndOfTurn(state, …)` (`endOfTurn.ts`), and in
  `ply.ts`: `applyMove(state, shipId, destination)`,
  `applyAttack(state, shipId, target)`, `applyPassGuard(state)` and
  `applyOutOfTimePass(state)`. `applyMove`/`applyAttack` end in `endPly`,
  which runs the end-of-turn sequence and then the pass guard once.
- `openingSeed` is read outside the rules in three places:
  `src/board/planetPlacement.ts` (`planetArrangement(openingSeed)` — the
  planet pictures' shuffle, run on its own copy of `mulberry32`),
  `src/board/Board.tsx` and `src/bonus/PlanetBonusPanel.tsx` (both call
  `planetArrangement`), and `src/bonus/useBonusHoverGlow.ts` (uses it as
  "which game is this" to forget a stale hover).
- `src/game/seed.ts` has `freshSeed()` (from `crypto.getRandomValues`).
  `src/App.tsx` (`createStartingSession`) and `src/useAppScreen.ts`
  (`handlePlay`, which dispatches `new-game` with `randomSeed: freshSeed()`)
  use it.
- `src/game/session.ts` is a pure reducer: `createSession(state)` runs the
  pass guard; `sessionReducer` handles `activate`, `dismiss`, `new-game`,
  `clock-expired` and `pass-out-of-time`. `src/main.tsx` renders the app in
  React `StrictMode`, which invokes reducers twice in development.
- About 38 test files mention `randomSeed`, `openingSeed` or `nextSeed`
  (hand-built `GameState` literals, seed-pinned expectations, seed-step
  counts). `src/rules/seededReplay.test.ts` and `fullGame.test.ts` are the
  whole-game integration tests.
- There is no `.github/workflows/` directory. Node is 22 in the dev
  container. `tsconfig.json` references `tsconfig.app.json` (DOM lib, JSX,
  `include: ["src"]`) and `tsconfig.node.json`; `npm run typecheck` is
  `tsc -b`. ESLint lints `**/*.{ts,tsx}`; `node:*` imports are banned
  outside tests and `Math.random` is banned outright. Prettier checks
  everything not in `.prettierignore`.

## Decisions

### Randomness

- **`RandomSource` lives in `src/rules/random.ts`.** The rules need the type
  and both sources are deterministic, so they belong with `mulberry32`, not
  in `src/core/`. A `RandomSource` offers: a **uniform draw** of an index
  below a count, a **weighted draw** of an index into a list of weights, a
  read-out of **every draw made through it so far** (the indices, in order),
  and a **completion check** the core calls when a call is done. Every
  draw, uniform or weighted, is exactly one recorded index, so "a ply's
  random results are those indices, in draw order" holds for both kinds.
- **`seededRandom(seed)` reproduces today's stream exactly.** Each draw is
  one `mulberry32` step; the uniform index is `floor(value × count)` and the
  weighted index is today's cumulative walk, including the
  floating-point fallback to the last index and today's `RangeError`s for a
  bad count or bad weights (those are caller bugs, not desyncs). Its
  completion check does nothing. Keeping the stream identical is not
  required by the story (a seed may deal a different board), but it is the
  cheapest, strongest regression check this refactor can have: every
  seed-pinned expectation in the existing suite keeps passing unchanged,
  so any test that changes its *outcome* during Steps 2–3 points at a real
  slip in draw order.
- **The seeded source exposes its generator's current seed** (the seed its
  next draw would use) as an internal read-out, beyond the `RandomSource`
  members, so `seededRandom(thatSeed)` continues the same stream. This is
  what lets the app keep a plain number in its session (below), and what
  lets Step 2 keep `GameState.randomSeed` working while the draw sites are
  converted. It is not part of the agreed contract; the core re-exports
  `seededRandom` as returning a `RandomSource`.
- **`recordedRandom(draws)` is made per call, not per game.** The story has
  it throw if draws are "left over once the ply is done", so one recorded
  source covers exactly one `startGame` or one `applyPly`, built from the
  draws the server returned for that call. It throws `DesyncError` when a
  draw is requested after the list is exhausted, when a recorded index is
  not below the count (uniform) or not a valid index into the weights
  (weighted), when a recorded weighted index points at a weight of 0 (a
  seeded source can never draw one, so this can only be a desync), and from
  its completion check when draws remain. A non-integer or negative
  recorded entry is likewise a `DesyncError`. A seeded source, by contrast,
  is made once per game and passed to `startGame` and every `applyPly` in
  turn; the core slices that call's draws out of the source's running
  list.
- **`DesyncError` is exported from the core** (the story's first open
  point). It is a named `Error` subclass, so the server can recognise it
  with `instanceof` or by `name`. The owner should relay this addition to
  the design doc.
- **`freshSeed()` moves to `src/core/freshSeed.ts`** and reads
  `globalThis.crypto.getRandomValues`, which exists in both a browser and
  Node 22. It is not in `src/rules/` because the rules stay a pure function
  of their arguments. The core's TypeScript configuration has no DOM
  library, so `crypto` has no ambient type there; the implementation reaches
  it through a narrowly typed view of `globalThis` rather than by adding
  DOM or Node type libraries. `src/game/seed.ts` is deleted and the app
  imports the new one.

### The app keeps a seed in its session, not a source

- **`Session` gains two numbers: `openingSeed` and the generator's next
  seed.** Each reducer call that may draw (`new-game`, a move or attack via
  `activate`, `pass-out-of-time`) builds a fresh `seededRandom` from the
  session's next seed, applies the rules with it, and stores the source's
  advanced seed in the new session. The rejected alternative — keeping the
  live `RandomSource` object in the session or a ref — breaks the reducer's
  purity: `StrictMode` runs reducers twice, and a stateful source would
  draw twice and desynchronise. Building the source from a number inside
  the reducer keeps "same session and intent in, same session out".
- **`openingSeed` moves from `GameState` to `Session`.** The planet
  pictures (`planetArrangement`) and the hover glow's "same game" check read
  it from the session. The picture shuffle itself is unchanged, so the app
  looks exactly as before. (The core's `Setup.artwork` is for online play;
  the local app does not need to route through it in this story.)

### The core's entry point

- **Files.** `src/core/` holds the entry point `index.ts` and small modules
  behind it — suggested: `setup.ts` (`Setup`, `SetupProblem`,
  `parseSetup`, `startGame`), `plyNotation.ts` (`Ply`, `parsePly`,
  `formatPly`), `applyPly.ts` (`applyPly`, `PlyRefusal`, `PlyEffect`),
  `readOuts.ts` (`toMove`, `result`, `GameResult`), `stateHash.ts`
  (`canonicalState`, `stateHash`), `coreBuild.ts` (`CORE_BUILD`),
  `freshSeed.ts` — each with a test file beside it. `index.ts` re-exports
  only the agreed list plus `DesyncError`; nothing else in the rules is
  exported. The core imports only from `src/rules/` and `src/core/`.
- **`startGame` = deal + opening pass guard.** It maps the setup onto
  `startingGameState` (`playstyle` → node playstyle, `rounds` → length in
  rounds, `chargedNodes` → charged-node count, `combat` → combat enabled,
  the rest by name; every field passed explicitly, never left to an app
  default), then runs the pass guard once, exactly as `createSession` does,
  so the core and the app start from the same position. Its draws are the
  deal's plus any the guard made. The starting fleet can always move, so
  the guard never actually fires at the start; `startGame` reports no
  effects, as the agreed signature says.
- **`Ply`** is a discriminated union: a move (from square, to square) and an
  attack (from square, target square), using the rules' existing `Square`
  objects so effects and plies speak the same type. The core does not add
  `Square` to the export list; it is reachable through `Ply`'s own type.
- **`PlyEffect`** (the story's second open point) is the rules' existing
  effect vocabulary plus one new member:
  - For a **move**, the first effect is a new core-level **`ship-moved`**
    effect: ship id, side, from, to, cost and power after — the facts
    `applyMove` returns beside its effects today and the session's
    `moved` event already carries. Then the rules' `MoveEffect`s, in their
    existing order.
  - For an **attack**, the rules' `AttackEffect`s, which already open with
    `fight-resolved` (both ships before the fight, the cost, and both
    return planets).
  - Both end with the existing `ply-ended` effect (carrying the end-of-turn
    effects: power gained, energy collected, refills with their drawn
    squares, …) and, when the next side cannot move or attack, the
    existing `ply-passed` effect with reason `cannot-move-or-attack` —
    which is how an automatic pass is "reported in effects".
  So `PlyEffect` is `ship-moved` ∪ `MoveEffect` ∪ `AttackEffect`. Every
  random result is already reported as a concrete square or kind (new
  prospective squares, refilled nodes, return planets, new activity
  bonuses), so a client never interprets indices. Adding `ship-moved` in
  the core rather than in `applyMove` leaves the app's effect lists, and so
  its announcements and animations, untouched.
- **`GameResult`** (the open point's second half) is exactly
  `{ outcome, energy }`, where `energy` is both sides' final totals keyed
  `green` and `red`. The rules' own `GameResult` also carries an optional
  `winner`; the core builds its own type without it, because `outcome`
  already says it and the contract asks for no optional fields. `result`
  returns `null` while the game is not over.
- **`toMove`** returns the side to move and `state.plyNumber`, or `null`
  once the game is over. Because a pass already advances `plyNumber` in the
  rules, "after `57: H2H4` and a pass by red, green's next ply is 59"
  falls out with no extra bookkeeping.
- **Refusal order in `applyPly`:** `game-over`, then `wrong-ply-number`,
  then — for an attack only — `combat-is-off`, then `no-ship-there` (no ship
  on the first square), then the rules' own reason from
  `moveRefusalReason` / `attackRefusalReason` (which includes
  `not-your-ship`). Checking `combat-is-off` before `no-ship-there` makes
  the story's statement unconditional: with combat off, *every* attack ply
  is refused `combat-is-off`. `PlyRefusal` is the union of
  `wrong-ply-number`, `game-over`, `no-ship-there` and the rules'
  `MoveRefusalReason` and `AttackRefusalReason`.
- **A refused ply draws nothing and runs no completion check**: refusals
  are decided before any draw, and the source is left exactly as it was.
  (A client that is refused a ply the server accepted has a desync of its
  own to report; the core does not turn that into a throw.)
- **Only one automatic pass per ply**, exactly as the app's `endPly` does
  today (the pass guard never passes back). The core mirrors the app; it
  does not add a rule.
- **`parsePly`** accepts exactly the story's grammar: ply number `[1-9][0-9]*`
  (so `0` and leading zeros are malformed), `": "` with one space, upper-case
  column `A`–`O`, row `1`–`15` with no leading zero, and either nothing or a
  single `x` between the squares. Text longer than 16 characters, or not a
  string at all, is `malformed` without further parsing. `formatPly` writes
  the same spelling, so `formatPly ∘ parsePly` is the identity on valid
  text. A move to its own square (`H2H2`) parses; the rules refuse it.
- **`parseSetup`** checks fields in the story's listed order, then reports
  unknown fields in the input's key order, collecting every problem rather
  than stopping at the first:
  - A missing field is `missing`; an unknown field is `unknown-field`.
  - A value of the wrong type, or a value the rules do not offer, is
    `not-offered`. Offered values come from the rules' own lists:
    `NODE_PLAYSTYLES`, `GAME_LENGTH_OPTIONS_ROUNDS` (30/45/60/90 — not
    `isGameLengthRounds`, which accepts any positive integer),
    `FLEET_SIZES`, `CHARGED_NODE_COUNTS`, a boolean for `combat`,
    `SCORING_SETTINGS`, `PLANET_BONUS_SETTINGS`, `PLANET_ACTIVITY_SETTINGS`,
    `PLAYER_MATCHING_SETTINGS`.
  - An offered value other than `"off"` for a setting the playstyle does not
    offer (planet bonus under steal; planet effects or player matching
    outside steal) is `not-allowed-with-playstyle`. This check is skipped
    when the playstyle itself is missing or not offered, since there is
    nothing to check against.
  - `artwork` that is not an array of exactly the twelve planet picture
    numbers, each once, is `not-a-permutation`. The picture numbers
    (1–10, 13, 14) are a constant in `src/core/setup.ts`, because the core
    must not import `src/board/`; a test asserts the constant matches the
    numbers in `src/board/planetArt.ts`'s `PLANET_ART`, so the two cannot
    drift.
  - Input that is not a plain object (null, an array, a string, …) reports
    every field as `missing`.
  - It never throws, whatever it is given.
- **`canonicalState`** is a JSON string built with a fixed key order, every
  key always present (absent values written as `null`, never omitted), and
  ASCII content only (square names like `"F7"`, setting strings, numbers,
  booleans). It holds: the setup's rule fields under the setup's own names
  (`playstyle`, `rounds`, `fleetSize` — derived from the ship count per
  side, `chargedNodes`, `combat`, `scoring`, `planetBonus`,
  `planetActivity`, `playerMatching`); the side to move; the ply number;
  energy (green, red); the ships in state order, each as side, square name,
  power; the nodes sorted in board order, each as square name, state, level,
  signal (`null` outside steal); the bonus planets per side, each as square
  name and claimed-on ply (`null` until claimed); the activity bonuses in
  slot order, each as square name and kind; and **the rotators** (square
  names, board order). It leaves out the seed (no longer in the state),
  the artwork (not in the state), and `outOfTime` (the clock is app-only;
  online play has none).
  - *Rotators are an addition to the story's list.* Under the dedicated
    playstyle they are real board state both ends hold, and a desync in
    them would otherwise go unseen. The owner should relay this to the
    design doc.
- **`stateHash`** is 64-bit FNV-1a (offset basis `0xcbf29ce484222325`,
  prime `0x100000001b3`, arithmetic modulo 2⁶⁴, using `BigInt`) over the
  UTF-8 bytes of `canonicalState`, written as 16 lower-case hex digits,
  zero-padded. The canonical string is ASCII by construction, so its UTF-8
  bytes are its character codes; the implementation may hash those
  directly provided it asserts each is below 128 (no `TextEncoder`, which
  has no type without the DOM library).
- **`CORE_BUILD`** comes from a build-time constant substituted by the core
  build (Step 7) and falls back to the string `unstamped` when the code
  runs unbuilt (tests, the app's dev server). No file under `src/` is ever
  written by the build, since that would dirty the tree the build insists
  is clean. `RULES_VERSION` is re-exported from `src/rules/rulesVersion.ts`.

### Packaging

- **Outputs go to `dist-core/`** (gitignored, ESLint-ignored,
  Prettier-ignored), separate from the app's `dist/`, which `vite build`
  empties. The package folder is `dist-core/package/` and the tarball
  `dist-core/core-<hash>.tgz`.
- **`tsconfig.core.json`**: `lib` ES2022 only (no DOM), no `jsx`,
  `types: []` (so neither DOM nor Node globals leak in), strict like the
  others, `files: ["src/core/index.ts"]` so it type-checks exactly what the
  entry point reaches (tests are not reached). It is added to the root
  `tsconfig.json`'s references so `npm run typecheck` enforces the
  no-screen boundary on every run, not only at release time. The build uses
  it, with command-line overrides, to emit declarations.
- **One ES module** comes from Vite's library mode with its own config,
  `vite.core.config.ts` (no React plugin, ES format only, unminified,
  target ES2022, the `CORE_BUILD` substitution). Vite is already a
  dependency; no new package is added.
- **Declarations** are emitted by `tsc` from `tsconfig.core.json` into
  `dist-core/package/types/`, mirroring `src/` (`types/core/index.d.ts`,
  `types/rules/*.d.ts`). Bundling them into one file would need a new
  dependency, which the story rules out. The source's relative imports are
  extensionless, which a consumer compiling with Node ESM resolution
  (`nodenext`) cannot resolve inside declarations, so the build rewrites
  relative specifiers in the emitted `.d.ts` files to end in `.js`. The
  smoke test checks the result type-checks for such a consumer (below).
- **Scripts are plain `.mjs`** under `scripts/`, run with Node 22 directly:
  no TypeScript runner is a dependency, and the smoke test must be "plain
  Node". ESLint gets a block for `scripts/**/*.mjs` with Node globals and
  the recommended JS rules.
- **`npm run build:core`** (`scripts/build-core.mjs`): refuses, with a plain
  message and a non-zero exit, if `git status --porcelain` reports
  anything; reads the hash with `git rev-parse --short=7 HEAD`; clears
  `dist-core/`; emits declarations and rewrites their specifiers; bundles
  the module with the hash substituted; writes the generated
  `package.json` (name `base-control-core`, version `0.0.0-<hash>`,
  `"type": "module"`, `exports` with `types` and `import`,
  `engines: { "node": ">=22" }`, no dependencies of any kind).
- **`npm run pack:core`**: `npm pack` of `dist-core/package/` into
  `dist-core/`, renamed `core-<hash>.tgz`.
- **`npm run smoke:core`** (`scripts/smoke-core.mjs`, taking the tarball
  path): makes an empty temporary folder outside the repository, installs
  the tarball there with npm, and runs a plain Node ES module (no Vite, no
  test framework, `node:assert` only) that imports `base-control-core` by
  name and checks: it loads; `CORE_BUILD` equals the suffix of the
  installed package's version; and the **pinned game** (Step 6) played
  with `seededRandom` and replayed per ply with `recordedRandom` reaches
  the same state hash — which also equals the pinned hash the unit test
  asserts, so the bundled build is shown to behave exactly like the
  source. It then type-checks a one-line consumer `.ts` file in that folder
  with the repository's own `tsc` (`module`/`moduleResolution` `nodenext`,
  `strict`, `skipLibCheck` off), so a broken declaration fails the smoke
  test rather than the server's build. The pinned hash therefore lives in
  two places (the unit test and the smoke script); a deliberate change to
  it edits both.
- **Guarding the boundary in lint too.** An ESLint block for
  `src/core/**` and `src/rules/**` restricts imports to those two folders
  (no `src/board`, `src/game`, React, …). It must restate the `node:*`
  pattern, because a later block's `no-restricted-imports` replaces the
  earlier one rather than merging with it. The tsconfig catches DOM and
  JSX; this catches a plain `.ts` UI module that the tsconfig would accept.

### The release workflow

- `.github/workflows/core-release.yml`, `workflow_dispatch` only, refusing
  to run for a tag ref (only branches), `permissions: contents: write` and
  nothing else, a concurrency group per commit so two dispatches on one
  commit cannot race.
- Order: check out the commit; compute the 7-character hash; **if the tag
  `core-<hash>` or a release of that name already exists, stop
  successfully with a notice** and do nothing more (checked first, so a
  rerun does no work, and checked again by `gh release create` refusing an
  existing release); set up Node 22 with the npm cache; `npm ci`;
  `npm run typecheck`, `npm run lint`, `npm test`; `npm run build:core`,
  `npm run pack:core`, `npm run smoke:core`; then
  `gh release create core-<hash>` with the tarball as the only asset,
  `--prerelease`, `--latest=false`, `--target` the full commit SHA, title
  `core-<hash>`, and notes whose **first line is `branch: <branch>`** and
  second line `commit: <full SHA>`. The built-in token is passed as
  `GH_TOKEN`.

### What is not done here

- No ruleset change, so no rules-version bump and no changelog entry.
- The app does not go through `src/core/index.ts`; network play is later.
- No game-record format change; records still replay from their seed.
- Stamping the app's build and refusing a dirty deploy are a later story.
- No accessibility test steps; nothing in this story touches what a player
  sees.

### How the steps verify a clean-tree build

`npm run build:core` refuses a dirty working tree, and a step's work is
uncommitted while it is being verified. No temporary commits: the
implementing agent checks the dirty-tree refusal, and the clean-tree build
checks (Step 7's verification item 3) are run by the orchestrator right
after the step is committed. A failure there is fixed in a follow-up commit
on the branch. Step 8 starts from a clean tree, so it builds directly.

## Steps

### Step 1 — Random sources

Status: committed

Notes: Added `RandomSource`, `SeededRandomSource` (the seeded source's wider
type, carrying `currentSeed()` beyond the `RandomSource` members),
`seededRandom`, `recordedRandom` and `DesyncError` to `src/rules/random.ts`,
built on the existing `mulberry32`/`drawIndex`/`drawWeightedIndex`, which are
untouched. `draws()` on both sources returns a defensive copy of the
recorded list rather than the live array, so a caller cannot mutate a
source's internal state through its read-out; the plan did not specify this
either way. Added the described test cases to `random.test.ts`. No other
deviations. `npm run typecheck`, `npm run lint`, `npm run format:check` and
`npm test` all pass (92 files, 2083 tests).

In `src/rules/random.ts`, add the `RandomSource` type, `seededRandom`,
`recordedRandom` and `DesyncError`, exactly as described under
"Randomness" in Decisions: one recorded index per draw (uniform or
weighted), a read-out of all draws so far, a completion check, and — on the
seeded source only — a read-out of the generator's current seed. The
seeded source must produce exactly the indices today's `drawIndex` /
`drawWeightedIndex` produce for the same seed, one `mulberry32` step per
draw. Leave `mulberry32`, `drawIndex` and `drawWeightedIndex` in place;
nothing else changes yet. Update the module header comment to describe the
new contents (what, not history).

Tests in `src/rules/random.test.ts`: a seeded source's indices match
`drawIndex`/`drawWeightedIndex` stepped from the same seed over a mixed run
of uniform and weighted draws; its draw list records them in order; its
current-seed read-out continues the stream when used to make a new seeded
source; bad counts and weights still throw `RangeError`; a recorded source
replays a seeded source's draws to the same indices and passes its
completion check; it throws `DesyncError` (checked by `instanceof` and
`name`) when exhausted, for an out-of-range uniform index, for an
out-of-range or zero-weight weighted index, for a non-integer entry, and
from the completion check when draws are left over.

Depends on: nothing. Steps 2–6 use these sources.

Verification (automated): `npm run typecheck`, `npm run lint` and
`npm test` all pass, including the new `random.test.ts` cases.

### Step 2 — Rule draw functions take a RandomSource

Status: committed

Notes: Converted every draw site listed under "Where things stand today" —
`nodePlacement.ts` (`drawNodeSquare`, `drawWeightedNodeSquare`,
`drawStealProspectiveSquare`, `drawStealOpeningProspectiveSquare`),
`nodeQueue.ts` (`refillQueue`), `rotators.ts` (`placeRotators`),
`bonusPlanets.ts` (`dealBonusPlanets`, and the private
`drawThreeDistinctPlanets`), `activityBonus.ts` (`drawActivityBonusKind`,
`drawActivityBonusPlanet`, `dealActivityBonuses`,
`resolveActivityBonusClaim`), `steal.ts` (`dealStealOpeningBoard`,
`claimNode`, `abandonNode`, `addExtraProspectiveSquares`,
`shuffleProspectiveSignals`), `combat.ts` (`drawReturnPlanet`, now taking
`(state, random)`) and `nodes.ts` (`dealOpeningBoard`) — from "seed in,
`[result, nextSeed]` out" to "`RandomSource` in, result out", preserving
draw order exactly. `drawIndex` and `drawWeightedIndex` are gone from
`random.ts` entirely (not kept as internal helpers): `seededRandom`'s
`uniform`/`weighted` methods now inline the same math directly, since
nothing outside the file called the two functions once every draw site took
a source; `mulberry32` is untouched. `GameState.randomSeed` and
`openingSeed` stay on the state as planned; `startingGameState` (in
`gameState.ts`) and the refill/rotator branch of `runEndOfTurn` (in
`endOfTurn.ts`) each build a `seededRandom` from `state.randomSeed` at the
existing threading site, pass it to the converted functions, and write its
`currentSeed()` back — temporary adapters Step 3 removes. In `ply.ts`,
`applyMove`'s steal branch, `applyAttack`'s two `drawReturnPlanet` calls and
`claimActivityBonus` each build their own adapter the same way, one per
draw site, matching "every random result is one draw" exactly. Updated the
tests of every converted function, plus `combat.test.ts`,
`gameState.test.ts`, `planetBonusClaim.test.ts` and `ply.test.ts` (which
call converted functions directly or predict their draws), to build a
`seededRandom(seed)` and pass it through, expressing "consumes N seed
steps" as "makes N draws" via the source's `draws()`/`currentSeed()`.
`seededReplay.test.ts`, `fullGame.test.ts` and `nodePool.test.ts` needed no
changes — they only drive the unconverted top-level entry points. No
seed-pinned expected outcome changed; `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass (92 files, 2083 tests, the
same count as Step 1). No other deviations.

Convert every rules function that draws (the list under "Where things
stand today", confirmed by grepping `src/rules/*.ts` for `seed`) from
"seed in, `[result, nextSeed]` out" to "`RandomSource` in, result out",
drawing through the source's uniform and weighted draws in **exactly the
same order** as today. `drawReturnPlanet` takes a source instead of reading
`state.randomSeed`. Then delete `drawIndex` and `drawWeightedIndex` from
`random.ts` (keep `mulberry32`, which `seededRandom` and
`src/board/planetPlacement.ts` use).

`GameState.randomSeed` and `openingSeed` **stay** in this step. The
top-level functions keep their current signatures; at each place that today
reads `state.randomSeed` and writes back a next seed, build a
`seededRandom` from the seed, pass it down, and write back its current-seed
read-out. These adapters are temporary and Step 3 removes them; keep them
at the existing threading sites rather than restructuring.

Update the tests of the converted functions (`nodes`, `nodePlacement`,
`nodePool`, `nodeQueue`, `rotators`, `bonusPlanets`, `activityBonus`,
`activityBonusClaim`, `steal`, `stealPlacement`, `combat`, `random` and any
other that calls a converted function directly) to pass
`seededRandom(seed)` instead of a seed, and to express "consumes N seed
steps" assertions as "makes N draws" (the source's draw list). Seed-pinned
expected outcomes must not change; a changed outcome means draw order
slipped and must be fixed, not re-pinned. Update module and function
comments that describe seed threading so they describe the source instead.

Depends on: Step 1 (`seededRandom` and its current-seed read-out).
Step 3 relies on every draw site already taking a source.

Verification (automated): `npm run typecheck`, `npm run lint` and
`npm test` pass, with `seededReplay.test.ts`, `fullGame.test.ts`,
`gameState.test.ts`, `endOfTurn.test.ts` and `ply.test.ts` passing with
their expectations unchanged (only call-site edits, if any). `grep -n
"drawIndex\|drawWeightedIndex" src` finds no use outside `random.ts`'s
seeded source internals.

### Step 3 — The seed leaves GameState; the app keeps it in the session

Status: committed

Notes: Removed `randomSeed`/`openingSeed` from `GameState` and gave
`startingGameState`, `runEndOfTurn`, `applyMove`, `applyAttack`,
`applyPassGuard`, `applyOutOfTimePass` (and the internal `passPly`,
`endPly`, `claimActivityBonus`) a `RandomSource` parameter, removing Step
2's per-call adapters; `applyAttack` now threads one `random` through both
return-planet draws and both bonus claims instead of building
`attackerRandom`/`defenderRandom` separately. Moved `freshSeed` to
`src/core/freshSeed.ts` (reading `globalThis.crypto` through a narrow typed
view, as the no-DOM core build will need from Step 7 on) and deleted
`src/game/seed.ts`. `Session` gained `openingSeed` and `randomSeed` (the
generator's next seed); `createSession(state, openingSeed = 0, randomSeed =
0)` builds a `seededRandom` from `randomSeed` to run the pass guard and
stores its advanced seed, with both seeds defaulting to 0 for hand-built
test sessions that make no draw. `sessionReducer`'s `new-game` branch builds
one `seededRandom(intent.randomSeed)`, deals through it, and passes its
advanced seed into `createSession` so the guard continues the same stream;
`activateWithSelection`'s move/attack branches and `pass-out-of-time` each
build a fresh `seededRandom(session.randomSeed)` and store its
`currentSeed()` in the returned session. `Board.tsx`, `PlanetBonusPanel.tsx`
(gained an `openingSeed` prop) and `useBonusHoverGlow.ts` (gained an
`openingSeed` parameter) read it from the session instead of `state`;
`planetPlacement.ts` is unchanged. Added the three session tests the step
asked for (reducer purity including the stored seed; a move advances the
stored seed by exactly its draws, under a steal claim; a new game stores
its opening seed distinct from the seed its deal leaves behind) plus one
showing a draw-free move leaves the stored seed untouched.

Across roughly 30 test files, every hand-built `GameState` literal lost its
`randomSeed`/`openingSeed` fields, every top-level rule call gained a
`RandomSource` argument (mostly `seededRandom(1)` where a test did not
care which squares were drawn, or a shared source threaded through a loop
where a test chained plies), and every place that predicted a draw's
outcome by reading `state.randomSeed` was rewritten to read the seed off
the `RandomSource` object the test itself built and passed in. Two
rules-layer tests whose property no longer exists at this layer were
removed rather than reworked: `startingGameState`'s "remembers the seed the
deal started from, distinct from the seed it left behind" (opening seed is
now the session's business, covered by the new session tests above), and
`runCharging`'s "leaves the seed exactly as it found it" (charging takes no
`RandomSource` at all now, so there is no seed to leave alone — rewritten
to assert it changes nothing but `nodes`). `relief.test.ts`'s "regardless of
the seed" test lost its seed parameter entirely for the same reason
(`reliefSquare` draws nothing) and was reworded to a plain determinism
check. A few local test helpers had a now-dead `randomSeed` config field
removed outright (`activityBonusClaim.test.ts`'s `stateUnder`,
`endOfTurn.test.ts`'s and `ply.test.ts`'s `buildState`); one,
`activityBonus.test.ts`'s `stateFor`, used `randomSeed` as a local field
name on a `Pick<GameState, …>`-shaped helper object unrelated to the real
`GameState` field, and was renamed to `seed` purely so the grep below reads
cleanly, not because it was ever a type error itself.

No deviations from the plan's design. `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm test` (2086 tests, 92 files) and `npm run
build` all pass; `grep -rn "randomSeed\|openingSeed" src/rules` finds
nothing.

Rules: remove `randomSeed` and `openingSeed` from `GameState` and give the
top-level entry points a `RandomSource` argument: `startingGameState`
(deals from the source; options as today), `runEndOfTurn`, `applyMove`,
`applyAttack`, `applyPassGuard`, `applyOutOfTimePass` (and the internal
`passPly`, `endPly`, landing and claim helpers that draw). Remove Step 2's
adapters. Rewrite the `startingGameState` and `GameState` comments that
describe seeds (the step counts become draw counts; no history).

App, per "The app keeps a seed in its session" in Decisions:
- Move `freshSeed` to `src/core/freshSeed.ts` (reading
  `globalThis.crypto` through a narrow typed view), delete
  `src/game/seed.ts`, and update `App.tsx` and `useAppScreen.ts`.
- `Session` gains `openingSeed` and the generator's next seed. Starting a
  session (from `new-game`, and `App`'s initial session) deals and runs the
  pass guard from `seededRandom(seed)` and stores both seeds; tests that
  build a session from a hand-made state pass the seeds explicitly.
  Every reducer branch that may draw builds a fresh `seededRandom` from the
  session's next seed and stores the advanced seed in the session it
  returns; branches that do not draw leave it untouched.
- `Board.tsx`, `PlanetBonusPanel.tsx` and `useBonusHoverGlow.ts` read the
  opening seed from the session (pass it as a prop or argument where they
  only receive `state` today). `planetPlacement.ts` is unchanged.

Tests: remove `randomSeed`/`openingSeed` from every hand-built `GameState`
literal (Board, EnergyOverlay, announcements, boardAnimations,
PlanetBonusPanel, useBonusHoverGlow, ClockRegion, useGameClock,
GameOverPanel, ScoreDisplay, TurnIndicator and the rules tests); pass a
`seededRandom` to the top-level rule calls; add session tests showing that
two identical intents on the same session give identical sessions (reducer
purity, including the stored seed), that a move advances the stored seed by
exactly the draws it made, and that a new game stores its opening seed.
`seededReplay.test.ts` keeps proving same seed + same plies ⇒ same game,
now with one `seededRandom` per game. Expected outcomes stay as pinned.

Depends on: Step 2 (every draw site already takes a source). Steps 4–6
build the core on these signatures.

Verification (automated): `npm run typecheck`, `npm run lint` and
`npm test` pass; `grep -rn "randomSeed\|openingSeed" src/rules` finds
nothing.

Verification (manual): run `npm run dev` and play part of a game in each
playstyle — continuous, planet, dedicated (with planet bonus on for one of
these three) and steal (with planet effects on race, then stable, and with
player matching on). Confirm: the board deals, nodes appear and refill,
steal claims draw new prospective squares, bonuses are dealt and replaced
when claimed, the planet pictures are arranged differently from game to
game, hovering a bonus planet lights it on the board and in the panel, and
starting a second game deals a different board. With a clock on, let one
side run out and confirm its turns pass and play continues to the end.
Nothing should look or behave differently from before.

### Step 4 — Core setup: parseSetup and startGame

Status: committed

Notes: Added `src/core/setup.ts` exactly as planned: `Setup`, `SetupProblemKind`/
`SetupProblem`, `PLANET_PICTURE_NUMBERS` (the twelve gallery numbers,
duplicated rather than imported since the core must not import
`src/board/`), `parseSetup` and `startGame`. `parseSetup` checks the ten
known fields in `Setup`'s own order, folding each playstyle cross-check
(`not-allowed-with-playstyle`) into the check of the field it applies to
(`planetBonus`, `planetActivity`, `playerMatching`) immediately after
confirming that field's own value is offered, rather than as a separate
pass — `playstyle` is always the first field checked, so its resolved value
is already in hand; this reads the same as "checks fields in the story's
listed order" but keeps the per-field logic together instead of splitting
one field's checks across two passes. Unknown fields are appended last, in
the input's own key order. `startGame` builds on `startingGameState` and
`applyPassGuard` exactly as the app's `createSession` does, slicing its
reported draws from `random.draws()` by position rather than assuming the
source is fresh, and running `random.checkComplete()` once done, so it
composes correctly whether given a fresh `seededRandom` or one already
partway through a game. Tests in `src/core/setup.test.ts` cover every item
the step lists, including the picture-number constant against
`src/board/planetArt.ts`'s `PLANET_ART`, `startGame` matching
`startingGameState` for the same seed and settings, a `recordedRandom`
replay reaching an equal state, and a shortened or lengthened draw list
throwing. No deviations from the plan. `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass (93 files, 2106 tests, up
from 92/2086 before this step).

Create `src/core/setup.ts` with the `Setup` and `SetupProblem` types, the
planet picture numbers constant, `parseSetup` and `startGame`, following
"`parseSetup`" and "`startGame` = deal + opening pass guard" in Decisions.
`startGame` returns the new state and the draws this call made (sliced from
the source's draw list) and runs the source's completion check at the end.

Tests in `src/core/setup.test.ts`: the story's example setup parses; each
problem kind is reported with its field; several problems at once are all
reported, in the documented order; wrong types are `not-offered`; `rounds`
outside 30/45/60/90 is `not-offered`; the playstyle cross-checks in both
directions, and their skip when the playstyle is invalid; artwork that is
short, long, repeated, contains a non-picture number or is not an array is
`not-a-permutation`; non-object inputs report every field missing; a
handful of hostile inputs (null, numbers, nested junk, huge arrays) never
throw; the picture-number constant matches `PLANET_ART`'s numbers;
`startGame` with a seeded source gives the same state as
`startingGameState` with the same settings and seed, and its draws replayed
through `recordedRandom` give an equal state; a recorded list with a draw
removed or added throws `DesyncError`.

Depends on: Step 3 (`startingGameState` takes a source; no seed in the
state). Step 5 applies plies to the state `startGame` returns.

Verification (automated): `npm run typecheck`, `npm run lint` and
`npm test` pass, including `setup.test.ts`.

### Step 5 — Core plies: notation, applyPly and read-outs

Status: committed

Notes: Added `src/core/plyNotation.ts` (`Ply`, `parsePly`, `formatPly`,
matching `text: string` in the exported signature exactly as story.md's
table states it, with an internal `typeof` guard — rather than widening the
parameter to `unknown` as `parseSetup` does — since the story names that
signature explicitly, unlike `parseSetup`'s, and tests exercise non-string
input via a cast); `src/core/applyPly.ts` (`applyPly`, `PlyRefusal`,
`PlyEffect` with the new `ShipMovedEffect`); and `src/core/readOuts.ts`
(`toMove`, `result`, the core's own `GameResult` without `winner`), exactly
per the Decisions sections on `Ply`, `PlyEffect`, `GameResult`, `toMove`,
refusal order, refused plies and `parsePly`. The automatic-pass test builds
a hand-crafted board (one inactive node, a charged-node target the opening
promotion can't fully satisfy) so that both the triggering move's own
end-of-turn and the automatic pass's own end-of-turn each charge a node and
refill the queue, giving two genuinely distinct, non-empty draw batches to
prove the pass's draws land after the ply's own, rather than relying on one
of the two being vacuously empty. The frozen-state tests cover both
`applyPly` (via `startGame`) and `startGame` itself (per the step's text),
both placed in `applyPly.test.ts` since the step's text introduces them
there. No deviations from the plan's design beyond the signature note
above. `npm run typecheck`, `npm run lint`, `npm run format:check` and
`npm test` all pass (96 files, 2145 tests, up from 93/2106 before this
step).

Create `src/core/plyNotation.ts` (`Ply`, `parsePly`, `formatPly`),
`src/core/applyPly.ts` (`applyPly`, `PlyRefusal`, `PlyEffect` with the new
`ship-moved` effect) and `src/core/readOuts.ts` (`toMove`, `result`, the
core's `GameResult`), following the Decisions sections on `Ply`,
`PlyEffect`, `GameResult`, `toMove`, refusal order, refused plies and
`parsePly`. `applyPly` finds the ship on the first square, calls
`applyMove` or `applyAttack` with the source, returns the new state, the
draws this call made and the effects, and runs the completion check only
when the ply was applied.

Tests: `parsePly` accepts the story's examples and round-trips through
`formatPly`; it answers `malformed` for lower case, extra or missing
spaces, leading zeros in the number or the row, ply number 0, column P,
row 16 or 0, a missing separator, trailing text, over 16 characters, and
non-string input, never throwing. `applyPly` applies a legal move and a
legal attack (combat on) with effects in the documented order, the move's
first effect being `ship-moved`; refuses with each of `game-over`,
`wrong-ply-number`, `no-ship-there`, `not-your-ship`, at least one other
move reason, and `combat-is-off` for an attack with combat off, including
from an empty square; a refused ply leaves the source's draw list
unchanged; a ply that triggers an automatic pass reports `ply-passed` in
its effects, its draws include the pass's end-of-turn draws after the
ply's own, and `toMove` then reports the same side again with the ply
number skipped by one (use a hand-built hemmed-in position, as the existing
pass-guard tests in `ply.test.ts` do). `toMove` and `result` return `null`
at the right times, and `result` reports `green-won`, `red-won` and
`draw` with both totals. **Frozen state:** deep-freeze a started state,
apply the same ply twice with two seeded sources from the same seed, and
check both calls succeed and return equal results (state, draws,
effects); the same for `startGame` with a frozen setup.

Depends on: Step 4 (`startGame` provides the states the tests play on).
Step 6 hashes the states this step produces.

Verification (automated): `npm run typecheck`, `npm run lint` and
`npm test` pass, including the new core tests.

### Step 6 — State hash, CORE_BUILD and the entry point

Status: committed

Notes: Added `src/core/stateHash.ts` (`canonicalState`, `fnv1a64`, `stateHash`),
`src/core/coreBuild.ts` (`CORE_BUILD`, reading a build-substituted
`__CORE_BUILD__` identifier via `typeof` so it falls back to `"unstamped"`
unbuilt without throwing) and `src/core/index.ts`, exporting exactly the
agreed list plus `DesyncError`. `seededRandom` is re-exported through a
one-line local wrapper that narrows `SeededRandomSource` to `RandomSource`,
per the Decisions note that the core hides `currentSeed()`. `canonicalState`
builds a plain object in the documented key order and lets `JSON.stringify`
do the rest; node order comes from `nodeSquares` (board order), never from
`state.nodes`'s own key order, so insertion order cannot affect the hash.
`fnv1a64` is exported from `stateHash.ts` (not from the core's `index.ts`)
so its own test can check it against published reference values on
arbitrary text, independent of `canonicalState`'s always-ASCII output.

The pinned game is the story's example setup under a fixed seed (20240614),
with eight plies found once by a scratch script driving `legalDestinations`
(deleted before this commit) and written into `stateHash.test.ts` as literal
notation; pinned hash `92eca44a0af5bd46`. The draws-round-trip test plays
two longer (40-ply-capped) policy-driven games — steal with planet effects,
dedicated with planet bonus on — with one `seededRandom`, then replays every
call with a fresh `recordedRandom` built from that call's own recorded
draws, checking the hash after each ply; the four tampering cases (dropped,
extra, out-of-range, and an in-range-but-changed draw caught only by a
differing hash) are checked once, on the steal game, since `recordedRandom`'s
behaviour is not playstyle-specific. No deviations from the plan's design.
`npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
all pass (98 files, 2159 tests, up from 96/2145 before this step).

Create `src/core/stateHash.ts` (`canonicalState`, `stateHash`, per the
Decisions sections), `src/core/coreBuild.ts` (`CORE_BUILD` with the
`unstamped` fallback; the build substitution arrives in Step 7) and
`src/core/index.ts`, which exports exactly: `CORE_BUILD`, `RULES_VERSION`,
`parseSetup`, `startGame`, `freshSeed`, `seededRandom`, `recordedRandom`,
`DesyncError`, `parsePly`, `formatPly`, `applyPly`, `toMove`, `result`,
`stateHash`, `canonicalState`, and the types `Setup`, `SetupProblem`,
`Ply`, `PlyRefusal`, `PlyEffect`, `GameState`, `GameResult`, `Side`,
`RandomSource`. Give `index.ts` a header comment stating what the core is
and its guarantees (no mutation of inputs, results depend only on
arguments, the source is the one stateful object, `recordedRandom` is one
per call).

Tests:
- `canonicalState` of a small hand-built state equals a hand-written
  expected string (pins key order, `null`s, node sort order, rotators);
  two states differing only in node insertion order hash the same; a
  change to any one included field changes the hash; FNV-1a of a couple of
  fixed strings (including the empty string, `cbf29ce484222325`) matches
  the published reference values.
- **Pinned hash:** the pinned game — the story's example setup, a fixed
  seed, and a short fixed list of plies (about eight, found once with the
  rules' `legalDestinations` and then written out as notation) — reaches a
  pinned 16-digit hash. The test's comment says a change to it is a
  deliberate edit, mirrored in the smoke script (Step 7).
- **Draws round-trip:** a longer policy-driven game (a deterministic
  policy in the test file, using the rules' legal-move listing, under steal
  with planet effects and under dedicated with planet bonus on) played with
  one `seededRandom`, then replayed with one `recordedRandom` per call from
  the recorded draws, matches the hash after every ply. Tampering: a
  dropped draw, an extra draw and an out-of-range draw each throw
  `DesyncError`; a changed but in-range draw is caught by the hash
  differing instead (it cannot be a `DesyncError`, and the test says so).
- `index.ts` exports exactly the listed runtime names (compare
  `Object.keys` of the module namespace with the list).

Depends on: Step 5 (states and plies to hash). Step 7 packages
`index.ts`.

Verification (automated): `npm run typecheck`, `npm run lint` and
`npm test` pass, including the pinned-hash and round-trip tests.

### Step 7 — Core build, package and smoke test

Status: committed

Notes: Added `tsconfig.core.json` (`lib: ["ES2022"]`, `types: []`, `files:
["src/core/index.ts"]`), referenced from `tsconfig.json`; `vite.core.config.ts`
(library mode, ES format, unminified, target ES2022, `__CORE_BUILD__`
substituted from a `CORE_BUILD_HASH` environment variable the build script
sets, falling back to `"unstamped"`; the entry is the plain string
`"src/core/index.ts"`, relative to Vite's root, so the config needs no Node
path/URL module and stays inside the no-`node:*`-outside-tests rule without
an exemption); `scripts/build-core.mjs` (refuses on `git status --porcelain`;
hashes with `git rev-parse --short=7 HEAD`; clears `dist-core/`; emits
declarations via `tsc --project tsconfig.core.json` with CLI overrides into
`dist-core/package/types/`, then rewrites every extensionless relative
`from "..."` specifier in the emitted `.d.ts` files to end in `.js`; bundles
with Vite's JS `build()` API against `vite.core.config.ts`; writes the
generated `package.json`); `scripts/pack-core.mjs` (`npm pack --json` of
`dist-core/package/`, renamed to `core-<hash>.tgz` using the hash parsed
back out of the built package's own `version`, rather than recomputing it
from git, so the tarball name always matches what was actually built);
`scripts/smoke-core.mjs` (installs the tarball into a temporary folder
outside the repository with plain `npm install`, writes and runs a plain
Node ES module there that imports `base-control-core` by name, plays the
pinned game from `stateHash.test.ts` once with `seededRandom` and once
replayed per call with `recordedRandom`, checks both reach the pinned hash
`92eca44a0af5bd46`, and checks `CORE_BUILD` against the installed package's
own `version`; then writes a one-line consumer `.ts` file and a `nodenext`/
`strict`/`skipLibCheck:false` `tsconfig.json` next to it and type-checks it
with the repository's own `node_modules/.bin/tsc`); the three npm scripts;
`dist-core/` in `.gitignore`, `.prettierignore` and ESLint's `globalIgnores`;
an ESLint block for `scripts/**/*.mjs` (`js.configs.recommended`, Node
globals, module source type); and an ESLint block for `src/core/**/*.ts` and
`src/rules/**/*.ts` restating the `node:*` pattern and adding one that lists
every other top-level folder and file under `src/` by name
(`../board/**`, `../bonus/**`, `../clock/**`, `../game/**`, `../guide/**`,
`../hud/**`, `../nav/**`, `../ships/**`, `../spelling/**`, `../start/**`,
`../App`, `../useAppScreen`, `../gameName`, `../main`) plus `paths` entries
for `react` and `react-dom`.

Deviation: the plan's "restricts imports to those two folders" reads most
naturally as an allow-list, which an `ignore`-style pattern would normally
write as `["../**", "!../rules/**", "!../core/**"]`. That does not work:
ESLint's `no-restricted-imports` "group" matcher is the `ignore` npm
package, which implements real gitignore semantics, including "a negated
pattern cannot re-include a path once a broader pattern has excluded its
parent" — so a single `"../**"` deny-all made every negation a no-op
(verified directly against the `ignore` package before writing the config).
The block instead denies every sibling folder and the top-level app files by
name, which is what "no src/board, src/game, React, …" in Decisions shows
as an example list anyway. A new top-level folder under `src/` would need
adding here to stay covered; this is recorded so a future change notices.

Verification: `npm run typecheck`, `npm run lint`, `npm run format:check`
and `npm test` all pass (98 files, 2159 tests, unchanged from Step 6, since
this step adds no `src/**/*.test.ts`). Item 2: on the still-dirty tree,
`npm run build:core` exited 1 with the dirty-tree message and wrote no
`dist-core/`. Item 4: a temporary `import { PLANET_ART } from
"../board/planetArt"` added to `src/rules/board.ts` made `npm run lint` fail
with the new rule; a temporary `console.log(document.title)` added to
`src/core/freshSeed.ts` made `npm run typecheck` fail (on both `console` and
`document`, there being no DOM *or* Node lib in `tsconfig.core.json`); both
were reverted and the tree confirmed clean of them. Item 1 (a full
clean-tree `build:core`/`pack:core`/`smoke:core` run) is for the orchestrator
to run after this step is committed, per "How the steps verify a clean-tree
build" — but every piece was sanity-checked directly against a scratch
directory outside the repo without touching the dirty-tree refusal: `tsc
--project tsconfig.core.json` with the build's own CLI overrides correctly
mirrors `core/` and `rules/` into `.d.ts` files; the rewrite step turns their
extensionless specifiers into `.js`-suffixed ones; Vite's `build()` API
against `vite.core.config.ts` (output redirected to the scratch dir) bundles
a working ES module with `__CORE_BUILD__` substituted; the bundled module,
loaded directly by plain Node, plays the pinned game to hash
`92eca44a0af5bd46`; a hand-written `package.json` plus a symlinked
`node_modules/base-control-core` let a one-line consumer `.ts` file
type-check under `nodenext`/`strict`/`skipLibCheck:false`; and `npm pack` on
the scratch package directory produces a tarball whose `tar -tzf` listing is
exactly `package.json`, `index.js` and the `types/` declarations. The
orchestrator still needs to run the real `npm run build:core`, `npm run
pack:core` and `npm run smoke:core -- dist-core/core-<hash>.tgz` on the
committed, clean tree to close out verification item 3 for real (the exact
commands are in this step's Notes above and in the handback report).

Add, per "Packaging" in Decisions: `tsconfig.core.json` (and its reference
from `tsconfig.json`), `vite.core.config.ts`, `scripts/build-core.mjs`,
`scripts/smoke-core.mjs` (and whatever small consumer files it writes into
its temporary folder), the npm scripts `build:core`, `pack:core` and
`smoke:core`, the `CORE_BUILD` substitution, `dist-core/` in
`.gitignore`, `.prettierignore` and ESLint's ignores, the ESLint block for
`scripts/**/*.mjs`, and the ESLint import boundary for `src/core/**` and
`src/rules/**`. The smoke script plays the same pinned game as Step 6's
test and asserts the same pinned hash. If anything the rules or core
import fails under the no-DOM configuration, fix the import rather than
widening the configuration.

Depends on: Step 6 (`src/core/index.ts` and the pinned game). Steps 8 and 9
run these scripts.

Verification (automated):
1. `npm run typecheck`, `npm run lint`, `npm run format:check` and
   `npm test` pass.
2. On the dirty working tree, `npm run build:core` exits non-zero with its
   dirty-tree message and writes nothing.
3. Run by the orchestrator after the step commit (see "How the steps
   verify a clean-tree build"): `npm run build:core`, `npm run pack:core` and
   `npm run smoke:core -- dist-core/core-<hash>.tgz` succeed; the smoke
   output reports the loaded `CORE_BUILD`, the matching version and the
   pinned hash; `dist-core/package/package.json` has the agreed fields and
   no dependencies; `tar -tzf` on the tarball lists only `package.json`,
   `index.js` and the declarations.
4. Improvised boundary check: temporarily add an `import` of a `src/board`
   module to a `src/rules` file and confirm `npm run lint` fails, and a
   reference to `document` in a `src/core` file and confirm
   `npm run typecheck` fails; revert both.

### Step 8 — Replay measurement

Status: pending

At the start of this step the tree is clean (Step 7 is committed), so run
`npm run build:core` first. Then add `scripts/measure-core-replay.mjs`,
which imports the built `dist-core/package/index.js` and, for each of the
four playstyles at 90 rounds (the longest the start screen offers) with
five ships, the largest charged-node count, and planet bonus or planet
effects on where offered: generates one full-length game with a simple
deterministic policy (it may read the ships out of the state — this script
is the one place outside the core that peeks inside it), recording the
setup, seed and ply texts; then times the server's rebuild — `seededRandom`
from the seed, `startGame`, and every `applyPly` from parsed text — over
enough repetitions to report a stable median and worst case after a
warm-up. It prints the figures, the ply and draw counts, the Node version
and the CPU model.

Record the figures in `doc/ruleset/tech-notes.md` in a new section
("Replaying a game through the core"): what was measured, the settings,
the machine (CPU model, the dev container, Node version), the median and
worst figures per playstyle, and how to reproduce it
(`npm run build:core` on a clean tree, then
`node scripts/measure-core-replay.mjs`). If a figure is far from
milliseconds, say so plainly there and raise it with the owner; it is a
measurement, not a gate.

Depends on: Step 7 (the built package).

Verification (automated, improvised): the script runs to completion and
every game it generates reaches game over with all plies applied; the
tech-notes section holds its output. `npm run lint`, `npm run format:check`
and `npm test` pass.

### Step 9 — Release workflow

Status: pending

Add `.github/workflows/core-release.yml` exactly as described under "The
release workflow" in Decisions.

Depends on: Step 7 (`build:core`, `pack:core`, `smoke:core`).

Verification (automated): `npm run format:check` passes on the YAML, and a
read-through confirms each item of story.md's workflow list maps to a
workflow step.

Verification (manual, by the owner, after the branch is pushed):
1. On GitHub, run "core-release" by hand on
   `feat/122-core-package-and-release`. It passes and creates one
   prerelease `core-<hash>` (the branch head's 7-character hash) on the full
   commit, with exactly one asset `core-<hash>.tgz`, release notes whose
   first line is `branch: feat/122-core-package-and-release` followed by
   the full commit, and it is not marked the repository's latest release.
2. Run it again on the same commit: it stops early, reporting the release
   exists, and the existing release and asset are unchanged.
3. In an empty folder, `gh release download core-<hash> --pattern
   'core-*.tgz'`, `npm install ./core-<hash>.tgz`, and
   `node -e "import('base-control-core').then(m => console.log(m.CORE_BUILD))"`
   prints the hash.

### Step 10 — Documentation and README check

Status: pending

- `CONTRIBUTING.md`: add `build:core`, `pack:core` and `smoke:core` to the
  toolchain list; a "The core" section covering what it is (pointing at
  `CLAUDE.md`'s vocabulary), the clean-tree rule and why, the no-DOM
  configuration and lint boundary, the smoke test, the measurement script,
  and how to run a core release (dispatch the workflow on a branch; a
  `main` release is what the server vendors for live; reruns on the same
  commit stop; `core-<hash>` tags are unrelated to `rules-<version>`).
  Update the randomness paragraph under "Architecture constraints" and the
  `Math.random` note so they describe the injected `RandomSource` and
  `seededRandom` rather than a seed in the state.
- `CLAUDE.md`: confirm the **Core** and **Engine** vocabulary entries
  (added with the story) match what was built; adjust only if something
  built differs.
- `story.md`: if anything decided here changes a statement in the story,
  correct the story in place (owner preference).
- Run `/update-readme` (or review the branch diff by hand) to confirm
  `README.md` needs no change — nothing a player sees changed — and update
  it only if it describes something this story altered.

Depends on: Steps 1–9 (documents what they built).

Verification (automated): `npm run format:check`, `npm run lint` and
`npm test` pass; every command named in `CONTRIBUTING.md` exists in
`package.json`.

## After merging

The owner runs the release workflow once from `main`, so the server
repository can vendor a `main` core, and relays to the design doc: the
replay figure, the `DesyncError` export, `recordedRandom` being one per
call, the refusal order, the `PlyEffect`/`GameResult` shapes, and rotators
in the canonical state.
