# Story 00000122 — Core package and release

## Summary

Online play needs the game's rules on a server as well as in the browser,
and both ends must play by exactly the same code. This story packages the
rules as the **core**: a small, self-contained module with no screen, built
from this repository, stamped with the commit it came from, and published
as a GitHub release the server repository can download and vendor.

This is the first half of "Story A" in the online play design doc
(<https://claude.ai/code/artifact/027047ce-826d-4a1c-80b7-00f857ea0b9f>,
"Decided: the core boundary" under "Core sharing and build versioning").
The doc settled the contract this story delivers, agreed between this
repository, the server repository and the owner. This story copies the
settled points below, so planning does not depend on reading the doc. The
other half of Story A, stamping the commit hash into the app's own build
and refusing to deploy a dirty working tree, is a later story.

Nothing changes for a player. A local game plays exactly as it does today.

## What changes

### Randomness comes from a source the caller hands in

Today the rules carry a seed in the game state and thread it through every
random draw. Instead, every random event draws from a **random source**
passed in by whoever applies the ply, and the seed leaves the state.

- **Every random event is one draw**: an index into a list the rules build,
  such as the squares a new node may appear on. A ply's random results are
  those indices, in draw order (for example `[14, 2]`).
- **`seededRandom(seed)`** draws from a seed, using the same generator as
  today, and records each draw. The server uses it, and so does the local
  game in the app.
- **`recordedRandom(draws)`** replays a list of draws. A client uses it to
  apply a ply the server has already drawn for. It throws a **`DesyncError`**
  if the draws run out, if an index is out of range for its list, or if
  any are left over once the ply is done. That is a bug, never a player
  error.
- **`freshSeed()`** gives a 32-bit seed from `globalThis.crypto`, which
  exists both in a browser and in Node. It replaces the app's current fresh
  seed.
- What the draws meant ("a node appeared on F7") is reported in the ply's
  **effects**, for animation, so a client never has to interpret indices.

The game's randomness still comes from one seeded generator per game, so a
game still replays exactly from its seed. Under "no backwards
compatibility", a given seed need not deal the same board it dealt before
this story.

### The core's entry point

A new entry point, `src/core/index.ts`, over the rules. Everything else in
the rules stays internal. Ship selection and other on-screen state stay
out. The agreed exports:

```ts
// Constants
CORE_BUILD: string     // "9e722d6": the UI commit, stamped at build
RULES_VERSION: string  // "0.45": informational; the build hash is the compatibility check

// Setup
parseSetup(input: unknown): { ok: true; setup: Setup } | { ok: false; problems: SetupProblem[] }
startGame(setup: Setup, random: RandomSource): { state: GameState; draws: number[] }

// Randomness
freshSeed(): number                                    // a 32-bit seed from globalThis.crypto
seededRandom(seed: number): RandomSource               // server: draws from the seed, records each draw
recordedRandom(draws: readonly number[]): RandomSource // client: replays the server's draws

// Plies
parsePly(text: string): { ok: true; plyNumber: number; ply: Ply } | { ok: false; reason: "malformed" }
formatPly(plyNumber: number, ply: Ply): string
applyPly(state: GameState, plyNumber: number, ply: Ply, random: RandomSource):
  | { outcome: "applied"; state: GameState; draws: number[]; effects: PlyEffect[] }
  | { outcome: "refused"; reason: PlyRefusal }

// Read-outs
toMove(state: GameState): { side: Side; plyNumber: number } | null  // null once the game is over
result(state: GameState): GameResult | null  // { outcome: "green-won" | "red-won" | "draw"; energy }
stateHash(state: GameState): string          // 16 hex digits
canonicalState(state: GameState): string     // what the hash is taken over, for diffing a desync
```

Types exported alongside: `Setup`, `SetupProblem`, `Ply`, `PlyRefusal`,
`PlyEffect`, `GameState`, `GameResult`, `Side`, `RandomSource`. The server
treats `GameState` as opaque and never stores it. The two parsers never
throw.

#### Setup

Plain JSON, **every field required**, so a change to an app default never
silently changes an online game:

```json
{
  "playstyle": "steal",
  "rounds": 30,
  "fleetSize": 5,
  "chargedNodes": 4,
  "combat": false,
  "scoring": "bonus",
  "planetBonus": "off",
  "planetActivity": "race",
  "playerMatching": "required",
  "artwork": [3, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6, 8]
}
```

- Each value must be one the rules offer. A setting the playstyle does not
  offer must be `"off"`: planet bonus under steal, and planet effects and
  player matching outside it. Unknown fields are refused, so a typo is never
  ignored.
- `artwork` is the twelve planet pictures, by number, in the order of the
  planet squares. It is not a rule and is left out of the state hash, but
  `parseSetup` checks it is a permutation, so the server needs no list of
  pictures.
- There is no clock field and no "who goes first" field. The first online
  release has no clock, and green always moves first, so who goes first is
  just which seat plays green.
- A refusal lists **every** problem as `{ field, problem }`, with `problem`
  one of `missing`, `unknown-field`, `not-offered`,
  `not-allowed-with-playstyle` or `not-a-permutation`.

#### Ply notation

A ply is `<ply number>: <action>`, exactly as `formatPly` writes it:

```
ply     = number ": " action
action  = square square        ; move: the ship on the first square moves to the second
        | square "x" square    ; attack: the ship on the first square attacks the second
square  = column row           ; column A to O, row 1 to 15
number, row: no leading zero
```

Examples: `57: H2H4`, `58: C12C9`, `59: H4xJ6`.

- Squares name the ship: the ship on the first square, belonging to the side
  to move. No ship IDs travel.
- **One spelling per ply.** Lower case, extra spaces and leading zeros are
  malformed, so an identical retry can be recognised by comparing strings.
  Text over 16 characters is refused before parsing.
- **There is no pass action.** When the side to move can neither move nor
  attack, `applyPly` plays the pass itself, reports it in `effects`, and the
  ply number skips one. After `57: H2H4` and a pass by red, green's next ply
  is 59. Any draws an automatic pass makes, including at the end of its
  turn, go in the draws of the ply that triggered it, after that ply's own.
  Replaying the stored plies with their draws therefore reproduces the
  passes. (This holds only while online play has no clock.)

#### Malformed versus refused

`parsePly` looks only at the text and answers `malformed`. `applyPly` looks
at the game and answers `refused` with a reason: `wrong-ply-number`,
`game-over`, `no-ship-there`, the move reasons the rules already give
(`not-your-ship`, `ship-trapped`, `out-of-range`, `cannot-afford`,
`path-blocked`, `destination-occupied`, `destination-uncharged-node`), or the
attack reasons, including `combat-is-off`. With combat off, an attack ply
parses and is then refused as `combat-is-off`. Combat stays in the
notation and the core, so allowing it online later changes neither.

#### State hash

`stateHash` is a 64-bit FNV-1a hash, written as 16 hex digits, of
`canonicalState`. That is a JSON string with a fixed field order and no
optional fields, holding what both ends know: the ships (side, square,
power), the nodes sorted by square, the side to move, the ply number,
energy, the bonus planets and activity bonuses, the rotators (board state
both ends hold under the dedicated playstyle), and the setup's rule fields.
It leaves out the seed, which the client never has, and the artwork. It
detects a desync; it is not a security check.

### Guarantees the server relies on

- `startGame` and `applyPly` **never change the state passed in**; they
  return a new one.
- Their results **depend only on their arguments**: no clock, no
  `Math.random`, and no module-level state carried between calls. The only
  module-level values are constant lookup tables. So one long-lived process
  can run many games side by side.
- The one stateful object is the `RandomSource`, which advances as it draws.
  It is made per game and passed in, never shared.

Tests pin these down:

- **Frozen state**: applying a ply twice to a deeply frozen state gives
  identical results, and neither call throws.
- **Pinned hash**: one fixed game, from a fixed setup and seed, has a pinned
  state hash. Any change to the hash, or to what feeds it, is then a
  deliberate edit to that test.
- **Draws round-trip**: a game played with `seededRandom` and replayed with
  `recordedRandom` from its recorded draws reaches the same state hash, and
  a tampered draw list throws `DesyncError`.

### Replay measurement

On every ply the server rebuilds the game by replaying its whole log from
the seed. The story **measures** replaying a full-length game: the longest
the start screen offers, every ply applied through the core. The figure is
recorded in `doc/ruleset/tech-notes.md`, with the machine it was taken on.
The owner relays it to the design doc. The design expects milliseconds.
This is a measurement, not a pass/fail gate, unless it turns out to be
slow enough to matter.

### Packaging

- **`npm run build:core`** builds the core into one ES module plus type
  declarations, ready to pack. It adds no new dependencies, and the package
  has **no runtime dependencies**.
- **Its own TypeScript configuration, with no DOM library and no JSX**, so
  a stray import of anything screen-related fails the build.
- **The stamp.** `CORE_BUILD` is the 7-character commit hash
  (`git rev-parse --short=7 HEAD`), the same one the deploy will use.
- **A generated `package.json`** for the package: name `base-control-core`,
  version `0.0.0-<hash>`, `"type": "module"`, `exports` with `types` and
  `import`, and `engines: { "node": ">=22" }`.
- **It refuses a dirty working tree**, so a package can never claim a commit
  it was not built from.
- **A smoke test** installs the packed tarball into an empty folder and plays
  a short scripted game in plain Node 22: no Vite and no test framework. It
  checks that the package loads, that `CORE_BUILD` matches the package
  version, and that a game replayed from its draws gives the same state hash.

### The release workflow

A new workflow, `.github/workflows/core-release.yml`, is the repository's
first. It publishes one GitHub release per commit:

1. **Run by hand** (`workflow_dispatch`) on any branch. A branch's core can
   be vendored for the server's dev stage.
2. Check out the commit, install, then **typecheck, lint and test**.
3. **Build and pack** the core, name the tarball `core-<hash>.tgz`, and run
   the **smoke test** on it.
4. Create a **prerelease** tagged `core-<hash>` on the full commit, with
   **exactly one asset**, `core-<hash>.tgz`. Its release notes' **first line
   is always `branch: <branch>`**, followed by the full commit. The server's
   fetch script reads that line to refuse a non-`main` core for live.
5. **If the tag already exists, stop** and leave that release untouched, so
   an asset is never replaced.

The workflow uses the built-in token with `contents: write` and nothing
else. Marking each release a prerelease keeps core releases from becoming
the repository's "latest". `core-<hash>` tags are a separate family from
`rules-<version>` and never mean a rules change.

### Documentation

- `CONTRIBUTING.md` covers `npm run build:core`, the smoke test, and how to
  run a core release.
- `CLAUDE.md`'s Vocabulary gains two entries, so the words stay apart from
  now on:
  - **Core**: the rules packaged for use outside the app. That is the entry
    point in `src/core/`, built into the `base-control-core` package and
    published as a `core-<hash>` release that the online-play server
    vendors. The core *applies* plies: it knows what is legal and what
    happens, and it never chooses a ply. It is not a player-facing word.
  - **Engine**: reserved for an AI player, something that *chooses* plies,
    by search or by a trained model, and plays them through the core. No
    engine exists yet. The core, the rules and the package are never called
    "the engine", even though "rules engine" is the usual phrase elsewhere.

  These entries were written while the story was drafted and arrive on the
  branch with it.

## What does not change

- **How the game plays.** The ruleset is untouched: no rules-version bump
  and no changelog entry. A local game in the app plays exactly as before,
  through every playstyle and option.
- **The app's screens.** Nothing a player sees changes. The app does not
  have to go through the core's entry point yet; network play is a later
  story.
- **Recorded games** still replay exactly from their seed.
- **The app's build and deploy.** Stamping the hash into the app and
  refusing a dirty deploy are the later half of Story A.

## Open points for the plan

- **`DesyncError` as an export.** The agreed list names `recordedRandom`'s
  `DesyncError` but not the class itself. Exporting it, so the server can
  recognise it, is a small addition the plan may make. The plan should
  record it so the owner can relay it to the design doc.
- **The shapes of `PlyEffect` and `GameResult`'s energy** are not settled by
  the design beyond what is above. The plan chooses them, keeping effects
  enough for a client to animate a ply without reading indices.

## After merging

Run the release workflow once from `main`, so the server repository can
vendor a `main` core.

## Verification

- `npm run build:core` builds on a clean tree, and refuses on a dirty one.
- The smoke test passes against the packed tarball in plain Node 22.
- The release workflow, run by hand on the story branch, creates one
  prerelease `core-<hash>` with exactly one asset, `core-<hash>.tgz`, and
  notes starting `branch: feat/122-core-package-and-release`. Run again on
  the same commit, it stops without touching that release.
- Downloading that asset with
  `gh release download core-<hash> --pattern 'core-*.tgz'` gives a tarball
  that installs and loads.
- A local game in the app, in each playstyle, plays as it did before.
