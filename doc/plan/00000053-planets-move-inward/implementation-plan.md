# Implementation plan — 00000053 Planets move inward

This plan implements [`story.md`](story.md): the fourteen edge **bays** become
twelve **planets** in the board's interior, the word "bay" disappears from the
rules, the app and the code, fleets become five or six a side, the artwork
catalogue drops to twelve drawings dealt at random across the twelve squares
every game, the node draw learns to keep away from planets, and the board
carries twelve nodes instead of fifteen.

Each step below is implemented, verified and committed on its own, in order.
Every step is written for an implementer with a fresh context who has read
only `story.md`, this plan and their own step.

---

## How to work in this repository

- All commands run **inside the dev container**. Never install anything on the
  host.
- The four checks every step must leave green, in this order:
  `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`.
  A single test file can be run with `npx vitest run <path>`.
- `doc/ruleset/rules.md` is the single source of truth for how the game is
  played. Code implements it; it never reinterprets it. If a step finds the
  document and this plan disagreeing, the document wins and the disagreement
  is escalated to the owner rather than patched over.
- Vocabulary (`CLAUDE.md`): planning documents and code say **ply**; the
  rules, the UI and `README.md` say **turn**. A ship is **on** a planet, never
  "in" one — every sentence that said "in a bay" is rewritten rather than
  find-and-replaced.
- Comments describe what a module does. No design history, no story numbers,
  no plan references in code (`CONTRIBUTING.md`). That material belongs here.
- Accessibility (`CLAUDE.md`): do **not** add steps or tests for
  accessibility. Update an existing automated test where the path is
  straightforward. If a step knowingly costs an accessible behaviour, record a
  note in `doc/plan/00000021-accessibility-tech-debt/known-issues.md` instead
  of paying for the repair now. Nothing in this story is expected to cost one.
- Do not add review fixtures or manual test scripts; the owner drives manual
  testing himself.
- When a step is done, set its `Status:` to `implemented` and add a one- or
  two-sentence `Notes:` line, including any deviation and why. Then commit and
  set it to `committed`.

---

## Facts established while planning (do not re-derive)

These were computed and verified during planning. They are stated here so no
step has to rediscover them.

**The twelve planet squares** are six base squares plus their 180-degree
rotations (a rotation maps column _c_ to the column the same distance from the
other end, and row _r_ to `16 - r`):

| Base     | E3  | D7  | F5  | I4  | J8  | L5  |
| -------- | --- | --- | --- | --- | --- | --- |
| Rotation | K13 | L9  | J11 | G12 | F8  | D11 |

- The set is closed under the half-turn rotation (each base square's rotation
  is also in the set), and it is **not** mirror-symmetric.
- No two of the twelve are adjacent, orthogonally or diagonally.
- All twelve lie inside **C3–M13**, the 11 x 11 interior the node draw uses.

**The node pool after the new constraint.** The interior C3–M13 is 121
squares. Removing the twelve planets and every square orthogonally or
diagonally adjacent to one leaves exactly **29** legal squares:

```
C3 C4 C5 C9 C13 D5 D9 D13 E13 F10 G3 G10 H6 H7 H8 H9 H10
I6 I13 J6 K3 L3 L7 L11 M3 M7 M11 M12 M13
```

At most **17** of those 29 are mutually non-adjacent, so twelve non-adjacent
nodes fit with room to spare. Dealing nodes one at a time from a shrinking
pool nevertheless exhausts it sometimes; measured over 4,000 dealt games:

| Nodes dealt        | 11  | 12   | 13   | 14  | 15  |
| ------------------ | --- | ---- | ---- | --- | --- |
| Deals falling back | 0%  | 0.2% | 2.0% | 12% | 37% |

Mid-game replacements against a full board of twelve fall back on well under
1% of draws. This is why `NODE_COUNT` goes to twelve — the owner's decision,
already taken, not a choice any step may revisit.

**Quadrant balance of the pool.** Of the 29 legal squares, 24 sit in a
quadrant (the rest are on the centre file/rank the existing tests exclude),
split 5 / 7 / 7 / 5 — shares of 0.208 and 0.292, against a current window of
`0.15 < share < 0.3` that has almost no headroom at the top.

**Owner decision (plan-approval gate): the quadrant-share assertion is
deleted, not widened.** The pool is now a fixed 29 squares whose balance is
settled by the planet geometry itself, and Step 7 tests that geometry
directly (half-turn symmetry, mutual non-adjacency). A statistical window on
draws from a fixed, already-tested pool adds nothing and would only be a
tripwire on a re-measured constant.

---

## Design decisions, and what was rejected

**D1 — `openingSeed` goes on `GameState`; the artwork arrangement is derived
in the board layer.** The story recommends this shape; this plan confirms it.
`GameState.randomSeed` is the _next_ seed the game will draw from, and the
opening seed is consumed by `dealOpeningBoard` before ply 1, so today nothing
keeps it. Adding `openingSeed` — the seed the deal started from — gives the
board layer a stable, per-game value to derive the planet arrangement from,
and is a fact a game record wants anyway.

Rejected: **drawing the shuffle as part of the opening deal and storing the
permutation on the state.** It is a legitimate design, but it puts a purely
decorative fact (which picture is where) into the rules layer, which
`rules.md` deliberately says nothing about; it lengthens the deal's seed
consumption, so every seeded expectation would move for a cosmetic reason as
well as for the node count; and it grows `GameState` with data no rule reads.
Deriving in the board layer keeps the rules stream untouched.

Also rejected: **threading the seed from `App`/`useAppScreen` to `Board` as a
prop.** The app draws a fresh seed and hands it to the `new-game` intent,
which does not retain it; retaining it in component state would give two
sources of truth for the same game's identity and would not survive a future
replay path.

**D2 — `openingSeed` is a required field, not optional.** A `GameState`
always came from a deal, so it always has one. Making it optional would let
hand-built test states silently fall back to some default arrangement and hide
a missing value. The cost is a line added to each hand-built `GameState`
literal in tests; that cost is paid once, in Step 5.

**D3 — the squares take the name `PLANETS`; the drawings become
`PLANET_ART`.** `src/board/planetArt.ts` currently exports `PLANETS` for the
fourteen drawings, and the rules-level module wants that name for the squares
the rest of the code asks about. The catalogue is the more specialised of the
two, so it takes the more specialised name. They must not end up
distinguishable only by import path.

**D4 — the arrangement is a seeded permutation computed in the board layer.**
`Math.random` is banned in game code and a recorded game must redraw
identically, so the shuffle uses `mulberry32` from `src/rules/random.ts` (a
pure seed-in/value-and-next-seed-out function) in a Fisher–Yates pass over
`PLANET_ART`, starting from `openingSeed`. It does **not** touch the game's
own seed stream: it starts from the same seed value the deal started from and
advances its own copy, so nothing about the deal or play changes.

**D5 — `src/board/planetPlacement.ts` keeps its path, and its contents are
replaced.** `RING_SLOTS`, `RING_ORDER` and the fixed `planetForSquare` table
all go; the module becomes the seeded arrangement. Keeping the path keeps the
test file's name meaningful and avoids a rename that buys nothing.

**D6 — the trait machinery is deleted, not kept.** `PlanetTraits`,
`PlanetColorFamily` and `planetPlacement.test.ts`'s `sharesATrait` exist only
to judge the spread of drawings around a fixed ring of bays. With a random
arrangement there is no spread to assert, and nothing else reads them. Unused
data with a plausible-looking name is worse than no data.

**D7 — fleet sizes change _before_ the planets move.** With twelve planets,
section 7.1's guarantee that a beaten ship always finds an empty planet is
exactly tight at twelve ships (the two ships in a fight are by definition not
on planets, so at most ten planets are occupied and at least two are free).
Fourteen ships break it outright: `drawReturnPlanet` would throw. So the fleet
step lands before the geometry step, and no commit in between can reach a
state where a return has nowhere to go.

**D8 — what is true of node placement, exactly.** After the new constraint, a
node is **never** placed on a planet: the ordinary pool excludes planets and
their neighbours, and the fallback — which relaxes everything at once —
still excludes planets, exactly as it excluded bays. A node **may**, in the
fallback, land adjacent to a planet or on the board's edge. Tests must assert
"never on a planet" unconditionally and assert non-adjacency only through
membership of `legalNodePool`'s result (which is what the existing long-run
test already does). An unconditional "never adjacent to a planet" assertion
over a long run would be asserting something the rules do not promise.

**D9 — the nominal rename comes before the geometry move.** Renaming
bay → planet while the squares are still the fourteen edge squares is a
mechanical change the whole existing suite proves; moving the squares
afterwards is a behaviour change whose fixtures need real thought. Doing both
at once would produce a single step large enough that a failure would be hard
to attribute. The cost is two intermediate commits in which the code lags
`rules.md` — accepted deliberately, and noted in the steps that carry it.

**D10 — the drawings keep their gallery numbers, gaps and all.** After
deleting planets 11 and 12 the catalogue is numbered 1–10, 13, 14. The number
is baked into every id (`planet-13-body`), so renumbering would churn
`PlanetDefs.tsx` for nothing.

**D11 — `src/ships/ShipDefs.tsx`'s "engine-bay panel lines" comment is
reworded.** It is a spaceship's engine bay, not the game's bay, but the
story's final check is that nothing under `src/` says "bay", and a sweep that
needs a memorised exception is a sweep that will fail later. Reword it (for
example "engine panel lines") so the sweep is a plain grep.

---

## Step-by-step interim states (read before implementing)

Some intermediate commits are deliberately inconsistent. They are listed here
so no implementer treats one as a defect:

- **After Step 1** the rules document is at 0.22 and the code still plays
  0.21. `RULES_VERSION` moves with the document, as `CLAUDE.md` requires; the
  code catches up over Steps 3–8.
- **After Step 3** everything says "planet", but the planets are still the
  fourteen edge squares.
- **After Step 7** the rules use the twelve interior squares while the board
  still paints its fourteen fixed drawings on the edge squares. Labels and the
  square class move with the rules; the pictures move in Step 8.

---

### Step 1 — Rules 0.22: planets in the interior

Status: committed

Notes: Rewrote `rules.md` §1, §3.1 (retitled "Planets"), §3.2 (sixth
constraint, rewritten fallback rarity), §4 (both layouts written out
standalone), §4.1, §7, §7.1 (retitled "Returning to a planet"), §7.2, §8.1,
§8.2, §8.4, §8.6 step 1, and Appendix B, bumped the version to 0.22, added a
changelog entry, and set `RULES_VERSION` to `"0.22"`. No deviation from the
plan; the code still plays 0.21 as documented under "Step-by-step interim
states". Ran `npx prettier --write` on `rules.md` after editing to fix table
column widths — a purely mechanical formatting pass, no wording changed.

Rewrite `doc/ruleset/rules.md` from version **0.21** to **0.22**, add a
`doc/ruleset/changelog.md` entry, and set `RULES_VERSION` in
`src/rules/rulesVersion.ts` to `"0.22"`. This step changes documentation and
that one constant only — no other code.

What the document must say when this step is done:

- **Version line** reads `**Rules version: 0.22**`.
- **§1 Overview** — a fleet of "five or six" ships; a beaten ship is pushed
  back "to a planet", not "to a bay on the edge of the board"; the sentence
  about a depleted node being where a ship pays energy for the recovery a bay
  gives free now says planet; the list of five random elements is unchanged in
  substance but names planets ("which planet the two ships in a fight are
  pushed back to").
- **§2 Words used in these rules** — check for and remove any residue of bay
  wording; the substance of the entries does not change.
- **§3.1 is retitled "Planets"** and describes **twelve** planets at E3, D7,
  F5, I4, J8, L5, K13, L9, J11, G12, F8, D11, presented as six base squares
  plus their half-turn rotations, with the half-turn symmetry stated. A planet
  is an ordinary square in every way except two: a ship on a planet cannot
  attack and cannot be attacked; a ship on a planet at the end of its owner's
  turn gains one power, to the maximum of 4. Flying over one does nothing;
  arriving on one does nothing by itself. Planets are not owned. The section's
  diagram must now distinguish planets from starting squares — they are no
  longer the same squares — using the story's diagram (`P` for planet, `S` for
  a starting square, with a line saying which starting squares are used
  depends on fleet size), and must say that a starting square is an ordinary
  square in every way.
- **§3.2 gains a sixth constraint**: a square is legal for a new node only if,
  in addition to the five constraints already listed, it is not a planet and
  is not orthogonally or diagonally adjacent to a planet. The paragraph about
  what constraints 3 and 4 leave is rewritten around the real figures: the
  interior C3–M13 is 121 squares, the planets and their buffers take that to
  **29**, and twelve mutually non-adjacent nodes fit there with room to spare
  (at most seventeen fit at once). The fallback keeps its shape — the whole
  relaxation at once — and keeps excluding planets, as it excluded bays. Its
  sentence claiming the fallback "is not expected to be needed given how much
  room the interior leaves" is replaced by honest figures: the opening deal
  falls back on about 0.2% of games with the board otherwise empty and about
  2% in the worst case where all twelve ships are scattered through the
  interior; a mid-game replacement falls back on well under 1% of draws. Rare,
  not impossible.
- **§4** — each player has **five or six** ships, **six is the standard
  game**; seven is gone. The paragraph tying layouts to the bays is rewritten
  around **starting squares**, which are ordinary squares that happen to be
  where ships begin. Both layouts are written out **standalone** — today the
  six-a-side layout is defined as a modification of the seven-ship game and
  the five-a-side one as the seven-ship game with two edges reversed, and both
  definitions dangle once seven is gone. The squares and colours do not
  change:

  | Fleet       | Green                    | Red                        |
  | ----------- | ------------------------ | -------------------------- |
  | Six a side  | O14, O6, D1, L1, A14, A6 | D15, L15, O10, O2, A10, A2 |
  | Five a side | H15, O10, A10, D1, L1    | D15, L15, O6, A6, H1       |

  The paragraph saying both layouts are exact half-turn rotations of one
  another survives, restated without reference to a seven-ship game. The
  paragraph about an empty bay being "an ordinary empty bay" is **deleted** —
  every edge square is ordinary now, occupied or not.

- **§4.1** — a ship gains a point standing on a **planet**; the reassurance
  that a ship at 0 power is not stuck now ends "and a planet will refill it".
- **§7** — "Neither ship may be in a bay" becomes "Neither ship may be on a
  planet", with the same two halves.
- **§7.1 is retitled "Returning to a planet"**. A returning ship goes to a
  planet chosen at random from the planets **empty at that moment**. The
  guarantee that there is always somewhere to go is restated with its new
  arithmetic: with twelve ships and twelve planets, the two ships in a fight
  were by definition not on planets, so at most ten planets are occupied and
  at least two are free — enough for the attacker and then the defender.
- **§7.2** — "ends on an empty planet".
- **§8.1** — the opening board is **twelve** nodes: four charged, **eight**
  inactive, none depleted. Both the prose and the bullet list.
- **§8.2** — the sentence about running short says "with twelve nodes on the
  board and a target of four".
- **§8.4** — "up to **eight of the twelve**" nodes can be depleted at once;
  and since a side now has at most six ships, the sentence listing how many
  depleted nodes cost the same 10 reads "five or six", not "five, six or
  seven".
- **§8.6 step 1** — "on a depleted node or in a bay" becomes "on a depleted
  node or on a planet", in **both** places the section says it (step 1 itself,
  and the paragraph about a passing turn).
- **Appendix B** is rewritten around the twelve-node pool: a node lives about
  twenty turns charged and about ten depleted, so for four of twelve to be
  charged a whole life runs about 20 x 12 / 4 = **sixty** turns, of which
  about **thirty** are spent inactive — roughly **4 charged, 2 depleted, 6
  inactive**, with a node charging about every five turns. Running short of
  four charged stays the uncommon case (six inactive against a target of
  four). Story 56's warning that the pressure cap of 50 had drifted down to
  sit at the average inactive wait **no longer applies and is retired**: the
  wait is now about thirty turns, comfortably below the cap, which is the
  relationship the cap was originally set against. State the fallback's real
  rarity (the §3.2 figures above) rather than leaving a claim that it cannot
  happen.

The changelog entry follows the existing format: `## 0.22 — <short title>`,
newest first, opening with "This is a gameplay change. Tagging stays on hold
until the game plays (see the project's contribution notes)." and then bullets
covering: planets replace bays and move into the interior; twelve planets at
fixed squares, half-turn symmetric; starting squares are ordinary; five or six
ships, six standard, seven removed; §3.2's sixth constraint; twelve nodes,
four charged and eight inactive at the deal; §8.4's depleted cap wording; the
§7.1 arithmetic. **Do not tag** (`CLAUDE.md`: tagging is on hold).

Depends on: nothing. It comes first because everything after it implements
this document (`CLAUDE.md`, and the implementation-plan guide's rules check).

Verification (automated): `npx vitest run src/rules/rulesVersion.test.ts`
passes (`RULES_VERSION` matches the document and the changelog has a 0.22
entry); `grep -in "bay" doc/ruleset/rules.md` returns nothing; `grep -in
"seven" doc/ruleset/rules.md` returns no reference to a seven-ship fleet;
`grep -in "fifteen\|eleven" doc/ruleset/rules.md` returns no stale node
counts. Then the four standard checks.

---

### Step 2 — The artwork catalogue becomes `PLANET_ART`

Status: committed

Notes: Renamed `planetArt.ts`'s `PLANETS` export to `PLANET_ART` and updated
every importer (`PlanetDefs.tsx`, `planetPlacement.ts`, `planetArt.test.ts`,
`PlanetDefs.test.tsx`, `BoardSquare.test.tsx`), plus `planetPlacement.test.ts`,
which also imports the catalogue but was not named in the plan's importer
list — included since the rename would not otherwise compile. No behaviour
change; `grep -rn "\bPLANETS\b" src/` returns nothing.

Rename the exported catalogue in `src/board/planetArt.ts` from `PLANETS` to
`PLANET_ART`, and update every importer: `src/board/PlanetDefs.tsx`,
`src/board/planetPlacement.ts`, `src/board/planetArt.test.ts`,
`src/board/PlanetDefs.test.tsx`, `src/board/BoardSquare.test.tsx`. Nothing
else changes — same fourteen drawings, same ids, same behaviour. The
`PlanetArt` type name is already correct and stays.

Depends on: nothing. It comes here to free the name `PLANETS` for the rules
module before Step 3 introduces it, so the two never coexist (D3).

Verification (automated): the four standard checks; plus
`grep -rn "\bPLANETS\b" src/` returns only occurrences that mean the
catalogue's replacement — i.e. nothing, at this point in the story.

---

### Step 3 — Rename bay to planet everywhere (squares unchanged)

Status: committed

Notes: Renamed `bays.ts`/`bays.test.ts` to `planets.ts`/`planets.test.ts`
(`BAYS`→`PLANETS`, `isBay`→`isPlanet`) and every call site, rewrote every
sentence that said "in a bay" as "on a planet" (announcements, refusal
reasons `attacker-in-bay`/`target-in-bay` → `attacker-on-planet`/
`target-on-planet`, `drawReturnBay`→`drawReturnPlanet`, `placeInBay`→
`placeOnPlanet`), and updated every affected test's wording and fixtures
without changing any square, count or outcome. Two header comments in `planetArt.ts` and
`PlanetDefs.tsx` quote the literal path
`doc/plan/00000013-spaceship-bay-visual/eg_planets.html`. The step first
truncated them to `doc/plan/00000013` to satisfy its own grep; the
orchestrator **restored the full path**, because a comment that points at a
folder which does not exist under that name is a worse outcome than a grep
that needs one exclusion. `planetArt.ts` now says in words that the folder
is named for the story that introduced the drawings, when a planet was still
called a bay, and that the path is history. The sweep for the word therefore
excludes that one path (see Step 9). All four checks pass.

A purely nominal pass: every name and every sentence goes from "bay" to
"planet", while the squares themselves stay the fourteen edge squares. No
behaviour changes, so the whole existing suite should still describe the same
game after the wording is updated.

- `src/rules/bays.ts` → **`src/rules/planets.ts`**, exporting `PLANETS` (still
  the fourteen edge squares for now) and `isPlanet`. `src/rules/bays.test.ts`
  → `src/rules/planets.test.ts`, same assertions reworded.
- `isBay` → `isPlanet` at every call site: `src/rules/nodePlacement.ts`,
  `src/rules/combat.ts`, `src/rules/ply.ts`, `src/rules/endOfTurn.ts`,
  `src/board/Board.tsx`, `src/board/announcements.ts`, and every test that
  imports it (`camping.test.ts`, `recovery.test.ts`, `nodePool.test.ts`,
  `combat.test.ts`, and the rest — `grep -rn "isBay\|BAYS" src/` finds them
  all).
- `src/rules/combat.ts`: `drawReturnBay` → `drawReturnPlanet`; refusal reason
  ids `attacker-in-bay` → `attacker-on-planet` and `target-in-bay` →
  `target-on-planet`; the `RangeError` message names planets.
- `src/rules/ply.ts`: `placeInBay` → `placeOnPlanet`; the returned-ship
  invariant checks and their messages; the journey/`returns` doc comments.
- `src/rules/endOfTurn.ts`: the recovery-effect doc comment and the inline
  comments.
- `src/board/BoardSquare.tsx`: `BoardSquareProps.isBay` → `isPlanet`; the
  class hook `board-square--bay` → `board-square--planet` (still test-only,
  with its comment saying so); module comment.
- `src/board/squareLabel.ts`: the `isBay` field becomes `isPlanet`; the "bay"
  segment becomes "planet"; the target mark wording "can attack here, both
  ships would return to bays" becomes "…would return to planets"; the module
  comment's claim that a square is never both a planet and a node stays, and
  is restated as being true because the node draw excludes planets (which
  Step 8 makes true of the interior squares) rather than because planets are
  on the edge.
- `src/board/announcements.ts`: "moved from X into the Y bay" → "moved from X
  onto the Y planet"; "The attacker returned to the X bay and the defender to
  the Y bay" → "…returned to the X planet and the defender to the Y planet";
  "A ship in a bay cannot attack. Move it out first." → "A ship on a planet
  cannot attack. Move it off first."; "A ship in a bay cannot be attacked." →
  "A ship on a planet cannot be attacked."; the refusal ids in its switch move
  with `combat.ts`.
- Comments and doc comments across `src/rules/` and `src/board/`, including
  `src/rules/board.ts`, `src/rules/fleet.ts`, `src/game/session.ts`,
  `src/board/Board.css`, `src/board/Planet.tsx`,
  `src/board/planetPlacement.ts`, `src/board/grid/AccessibleGrid.tsx`.
- `src/ships/ShipDefs.tsx`'s "engine-bay panel lines" comment is reworded so a
  plain grep sweep is clean (D11).
- Every affected test's expectations follow the new wording:
  `announcements.test.ts`, `squareLabel.test.ts`, `Board.test.tsx`,
  `BoardSquare.test.tsx`, `ShipModel.test.tsx`, `combat.test.ts`,
  `ply.test.ts`, `recovery.test.ts`, `camping.test.ts`, `endOfTurn.test.ts`,
  `fullGame.test.ts`, `seededReplay.test.ts`, `session.test.ts`,
  `gameState.test.ts`, `nodePool.test.ts`, `nodePlacement.test.ts`,
  `planetPlacement.test.ts`.

Do not change any square, any fixture geometry, any count or any expected
game outcome in this step. If a test fails for a reason other than wording,
stop and report it rather than adjusting a fixture.

Depends on: Step 2 (the name `PLANETS` is free).

Verification (automated): the four standard checks — the existing suite is
the proof, since behaviour is unchanged. Plus
`grep -rniI "bay" src/ | grep -v 00000013-spaceship-bay-visual` returns
nothing: the sole permitted occurrence is the historical `doc/plan/` path
quoted in `planetArt.ts`'s and `PlanetDefs.tsx`'s header comments, which
names a real folder and must stay resolvable.

---

### Step 4 — Fleets of five or six

Status: committed

Notes: Implemented as planned — `FleetSize` is `5 | 6`, `FLEET_SIZES` is
`[6, 5]`, `DEFAULT_FLEET_SIZE` is 6, `MAX_SHIPS_PER_SIDE` derives to 6,
`SEVEN_A_SIDE_LAYOUT` is gone and the two remaining layouts' doc comments
stand alone (rewritten to say "starting square" rather than "planet", matching
rules.md §4's own distinction between the two, introduced in Step 1). Fixed
every hard-coded `7`/"seven" left over from the old default across
`gameState.ts`/`.test.ts`, `energy.ts`/`.test.ts`, `endOfTurn.test.ts`,
`fleet.test.ts`, `fullGame.test.ts`, `Board.test.tsx`, `App.test.tsx`,
`session.test.ts`, `StartScreen.test.tsx` and `useAppScreen.test.tsx` — none of
these files were named in this step's own list, but each held a fleet-size-7
fixture, literal ship count, or `FleetSize` value that no longer typechecked
or no longer matched the new default, so leaving them would have broken the
four standard checks. One further, larger deviation:
`seededReplay.test.ts`'s "not vacuous" test (not listed for this step either)
pins seed 20260819 through the attack-first policy described in that file's
header comment; at the new default of six ships a side that policy settles
into a position with no further legal attacks after one fight, verified by
direct measurement (spot-checked at fleet sizes 5, 6 and 7, and over 1,000
seeds at fleet size 6, 40 and 200 rounds) rather than assumed — it is not a
regression in this step's own code, but a real consequence of the smaller
default fleet meeting that bot's specific greedy ordering. The floor for
`fightCount`/`planetReturns` is lowered from 10 to 1 (the measured value for
the pinned seed, with the reasoning recorded inline) since there is no margin
left to leave; `chargedNodes`/`replacedNodes`' floors are untouched, since
those come from the passive node cycle and were unaffected. Per the story's
"Out of scope" (balancing what the change does to play is not this story's
problem), the bot itself and the game's balance are left alone.

In `src/rules/fleet.ts`: `FleetSize` becomes `5 | 6`; `FLEET_SIZES` becomes
`[6, 5]` (largest first, as now, so the leftmost start-screen choice is the
standard game); `DEFAULT_FLEET_SIZE` becomes `6`; `MAX_SHIPS_PER_SIDE` keeps
its derivation from `FLEET_SIZES` and therefore becomes 6, which correctly
tightens `energyForDepletedNodes`' guard in `src/rules/energy.ts` (a side
cannot stand on more depleted nodes than it has ships). `SEVEN_A_SIDE_LAYOUT`
is deleted, together with its row in the layout lookup. `SIX_A_SIDE_LAYOUT`
and `FIVE_A_SIDE_LAYOUT` keep their squares, colours and clockwise order
**exactly**; their doc comments are rewritten to stand alone, without
reference to a seven-ship game and without the word bay (rules.md §4, as
rewritten in Step 1). `startingGameState`'s `RangeError` message in
`src/rules/gameState.ts` says "must be 5 or 6".

In the app: `src/start/StartScreen.tsx` renders whatever `FLEET_SIZES` holds,
so it needs no change beyond confirming two choices render and the default is
6; check `StartScreen.test.tsx`, `src/useAppScreen.test.tsx` (it asserts the
default is 7 today) and `App.test.tsx` for hard-coded sevens.

Tests to update: `fleet.test.ts` (two sizes; default 6; `MAX_SHIPS_PER_SIDE`
6; both layouts' squares and colours per the tables in rules.md §4; the
half-turn relationship between the two sides still holding for each layout),
`energy.test.ts` (the guard's upper bound), `gameState.test.ts` (its test that
finds a ship on each of the fourteen bay squares becomes twelve starting
squares under the default fleet), `session.test.ts` (its parameterised fleet
sizes), `fullGame.test.ts` (runs to completion at **both** sizes),
`StartScreen.test.tsx`, `useAppScreen.test.tsx`.

Depends on: Step 3 (planet wording is already in place, so the new doc
comments are written once). It must come **before** Step 7 (D7): once there
are only twelve planets, fourteen ships would break §7.1's guarantee and
`drawReturnPlanet` could throw.

Verification (automated): the four standard checks; and
`npx vitest run src/rules/fullGame.test.ts` demonstrates a complete game at
five and at six a side.

---

### Step 5 — `GameState` remembers the seed it was dealt from

Status: committed

Notes: Added `readonly openingSeed: number` to `GameState`, set by
`startingGameState` to the seed argument it received (before `dealOpeningBoard`
advances it into `randomSeed`), with a doc comment on both the field and the
function explaining the distinction. Added a `gameState.test.ts` case asserting
`openingSeed === SEED` and that it differs from `randomSeed`. Added the field to
every hand-built `GameState` literal across the test suite (21 files); every
site that builds a state by spreading an existing one needed no change, since
the field carries through automatically. For the two literals in
`openingBoard.test.ts` built mid-deal, `openingSeed` is set to the pre-deal
`seed` variable rather than to the already-advanced value assigned to
`randomSeed`, matching the field's real meaning. No deviation from the plan:
`seededReplay.test.ts` and all other tests pass unchanged, confirming no extra
randomness is consumed.

Add a required `readonly openingSeed: number` to `GameState` in
`src/rules/gameState.ts`, recorded by `startingGameState` as the seed
argument it was given — the seed the **deal** starts from, distinct from
`randomSeed`, which is the seed the deal left behind and the next draw will
use. Its doc comment says exactly that, and says it never changes for the
life of the game. `startingGameState` consumes no extra randomness: for a
given seed, the dealt board and `randomSeed` must be byte-for-byte what they
were before this step.

Every hand-built `GameState` literal in tests needs the new field; `grep -rn
"randomSeed:" src/` finds the candidates (the builders in `session.test.ts`,
`camping.test.ts`, `Board.test.tsx`, `chargeDraw.test.ts`,
`announcements.test.ts`, `EnergyOverlay.test.tsx`, `ClockRegion.test.tsx`,
`useGameClock.test.tsx`, the `hud/` tests, `actions.test.ts`,
`combat.test.ts`, `endOfTurn.test.ts`, `energy.test.ts`, `movement.test.ts`,
`ply.test.ts`, `recovery.test.ts`, `openingBoard.test.ts`, `fullGame.test.ts`
and others). Sites that spread an existing state (`{ ...state, randomSeed }`)
need nothing.

Nothing reads `openingSeed` yet; Step 8 does. This is scaffolding introduced
on its own, deliberately (D1, D2).

Depends on: Step 4 only for ordering convenience. Nothing in it depends on
Step 4's content.

Verification (automated): a test in `gameState.test.ts` asserting that
`startingGameState(seed, …).openingSeed === seed`, that it differs from the
resulting `randomSeed` (the deal advanced the stream), and that dealing twice
from one seed gives identical states. Plus the four standard checks — in
particular `seededReplay.test.ts` must still pass unchanged, proving no extra
randomness was consumed.

---

### Step 6 — The board carries twelve nodes

Status: committed

Notes: `NODE_COUNT` 15 → 12 in `src/rules/nodes.ts`, with the module header,
`OPENING_PRESSURE_TABLE`'s comment, and `dealOpeningBoard`'s doc comment
retuned to twelve nodes / four charged / eight inactive / 24 seed steps;
`gameState.ts`'s `startingGameState` doc comment likewise. Re-measured and
updated `nodes.test.ts`, `nodePool.test.ts` and `openingBoard.test.ts` per
the step's instructions — test titles, the 24-step assertion, and every
comment recording a figure measured against fifteen nodes (inactive floor,
expiry ceiling, wait-between-charges ceiling, total-charges floor, distinct-
squares-seen floor, and the steady-state depleted/inactive test, whose title
and bounds now read "six or seven inactive" against a re-measured ~6.51
mean, matching Appendix B's ~6). No threshold needed narrowing beyond what
re-measurement justified; margins stayed generous throughout. Two
deviations, both required to keep the four standard checks green rather than
scope creep: (1) `endOfTurn.test.ts`'s "keeps the node count at fifteen"
test and `gameState.test.ts`'s "four charged, eleven inactive" test were not
named in this step's list but hard-coded the old count and failed outright
once `NODE_COUNT` moved — trimmed the former's hand-built fixture from
fifteen to twelve node entries and retitled both tests; (2) two stray prose
references to the old count were also fixed for consistency with the
already-twelve-node reality: `energy.ts`'s doc comment ("eleven of the
fifteen" → "eight of the twelve", matching rules.md §8.4 as rewritten in
Step 1) and `seededReplay.test.ts`'s header comment (30 steps/fifteen draws
→ 24 steps/twelve draws). Node placement itself is untouched — the pool is
still the whole 121-square interior, as the step specifies; `NODE_CAPACITY`,
`PRESSURE_CAP` and the drain/recovery/opening tables are untouched. All four
standard checks and the step's own verification command pass.

In `src/rules/nodes.ts`, `NODE_COUNT` goes from 15 to **12**;
`TARGET_CHARGED_NODES` stays 4. Update the module header and
`dealOpeningBoard`'s doc comment: twelve nodes, four charged and **eight**
inactive, none depleted, and a deal of 4 + 8 + 12 = **24** seed steps rather
than 30. `OPENING_PRESSURE_TABLE`'s comment says eight nodes, not eleven.
`src/rules/gameState.ts`'s `startingGameState` doc comment says four of the
twelve, and 24 steps. Nothing else about a node changes: `NODE_CAPACITY`,
`PRESSURE_CAP`, the drain, recovery and opening tables and the three states
are untouched (story, "Out of scope").

Tests to retune. Where a bound was measured, re-measure it by running this
step's own tests and record the measured figure in the comment, exactly as
those files already do:

- `nodes.test.ts` — "deals exactly twelve nodes, four charged and eight
  inactive, none depleted".
- `nodePool.test.ts` — the per-ply node count follows `NODE_COUNT`
  automatically; `MINIMUM_INACTIVE_NODES` and the mean depleted/inactive
  windows were measured against fifteen nodes and roughly nine inactive, and
  must be re-measured against twelve nodes and roughly six inactive
  (Appendix B, as rewritten in Step 1). The comments at the top of the file
  explaining what was measured must be updated to match.
- `openingBoard.test.ts` — "the eleven dealt-inactive nodes" becomes eight;
  any count threshold measured against fifteen (for example the number of
  distinct squares ever charged over a run) re-measured. Note that Step 7
  replaces the distinct-square thresholds outright with "every one of the 29
  legal squares is seen"; here, before the pool shrinks, they only need to
  keep passing.

Do **not** change node placement in this step; the pool is still the whole
121-square interior.

Depends on: Step 1 (the document already says twelve). It comes before Step 7
so that the node-count retune and the node-pool retune are separately
attributable.

Verification (automated): `npx vitest run src/rules/nodes.test.ts
src/rules/nodePool.test.ts src/rules/openingBoard.test.ts
src/rules/seededReplay.test.ts` passes, plus the four standard checks.
`seededReplay.test.ts` compares a game against itself rather than against
stored numbers, so it needs no regenerated expectations — but it must still
pass, which is what proves the shorter deal replays.

---

### Step 7 — The planets move into the interior, and nodes keep away from them

Status: pending

This is the story's central step and the largest. Two things change together,
because neither is sound without the other: the twelve planets become interior
squares, and the node draw learns to avoid them.

**The squares.** `src/rules/planets.ts` now holds the twelve squares of the
story: the six base squares E3, D7, F5, I4, J8, L5 and their half-turn
rotations, **computed** from the base six rather than typed twice, so the
symmetry cannot be broken by a typo. `isPlanet` is unchanged in shape.
`src/rules/planets.test.ts` asserts: exactly twelve squares; exactly the named
set (E3, D7, F5, I4, J8, L5, K13, L9, J11, G12, F8, D11); the set is unchanged
by a half-turn rotation; no two are adjacent orthogonally or diagonally; all
twelve lie inside C3–M13; and `isPlanet` is true for each and false for a
sample of others (including a starting square such as A2, which is now
ordinary).

**The node draw.** `src/rules/nodePlacement.ts` gains rules.md §3.2's sixth
constraint in the ordinary pool: a square is legal only if it is not a planet
and is not orthogonally or diagonally adjacent to one. The fallback continues
to exclude planets (it already excluded the old bays) and its `RangeError`
message names planets. The doc comment lists six constraints and states
plainly what the fallback does and does not promise (D8).

**Everything that depended on a planet being an edge square.** Recovery,
combat immunity and returns now happen in the middle of the board, so fixtures
built around edge geometry must be **rebuilt**, not coordinate-swapped:

- `src/rules/recovery.test.ts` — a ship recovering on a planet; the "one
  square from a planet at 0 power, its only reach" fixture needs an interior
  neighbour of a planet.
- `src/rules/combat.test.ts` — refusals from and against a ship on a planet;
  `drawReturnPlanet`'s tests, including the "every planet occupied" throw case
  (twelve hand-placed ships now, not fourteen).
- `src/rules/camping.test.ts`, `src/rules/ply.test.ts`,
  `src/rules/endOfTurn.test.ts`, `src/rules/fullGame.test.ts` — every fixture
  that stood a ship "in a bay" now stands it on an interior planet; watch for
  fixtures that relied on a bay being unreachable from the middle of the
  board, or on a bay's reduced number of neighbours.
- `src/game/session.test.ts` — the pass-guard fixture puts green-1 on A2 and
  relies on the old rule that a ship in a bay cannot attack. A2 is now an
  ordinary square, so that ship would have legal attacks. Rebuild it around a
  planet: a green ship on a planet (which cannot attack) with all eight
  neighbouring squares occupied so that no move is legal either.
- `src/board/announcements.test.ts`, `src/board/Board.test.tsx`,
  `src/board/squareLabel.test.ts` — fixtures naming a planet square must name
  one of the twelve; `Board.test.tsx`'s count of `.board-square--planet`
  cells becomes twelve.
- `src/board/Board.test.tsx`'s case asserting a planet drawing appears on
  every planet square is **removed in this step** and reinstated in its final
  form in Step 8. Until Step 8 the drawings still sit on the old edge squares
  (see "interim states" above), so there is nothing honest for it to assert
  here. Record the removal in the step's Notes.
- `src/rules/nodePool.test.ts` — the per-ply assertion that no node sits on a
  planet is true again from this step (before it, planets were edge squares
  the pool never reached; after it, the new constraint keeps nodes off them).
  `MINIMUM_DISTINCT_SQUARES_SEEN` was measured against a 121-square interior;
  **owner decision: replace the threshold with an exact assertion** that a
  long run reaches **every one of the 29 legal squares**, and delete the
  constant. It is stronger than the old test and carries no arbitrary number.
  **The quadrant-share assertion is deleted outright** (owner decision, see
  "Quadrant balance of the pool" above) — not widened, not restated. Remove
  the helper and the comment that go with it.
- `src/rules/nodes.test.ts` — its assertion that a long run of deals touches
  more than 110 distinct squares is **replaced by the same exact assertion**:
  every one of the 29 legal squares is seen. Owner decision; do not simply
  lower the threshold.
- `src/rules/seededReplay.test.ts` — **re-measure the "not vacuous" test's
  fight floor** (orchestrator instruction, added after Step 4). Step 4 lowered
  `fightCount`/`planetReturns` from 10 to 1 because at six a side every ship
  starts **on** a planet, where rules.md §7 makes it neither able to attack
  nor attackable, so the file's attack-first policy stalls. This step removes
  that cause: ships start on ordinary edge squares and are attackable from the
  first turn. Measure the real figure at the new geometry and raise the floor
  back to a value with margin below it. If it genuinely stays at 1, say so in
  the comment with the measurement, and replace Step 4's now-wrong explanation
  — the current comment blames fleet size, which will no longer be the reason.
- `src/rules/nodePlacement.test.ts` — new coverage: no square in the ordinary
  pool is a planet or adjacent to one; the pool is non-empty for a realistic
  board; the fallback excludes planets and may legitimately include a
  planet-adjacent square (assert this explicitly, so the semantics are pinned,
  per D8); a long run of deals and replacements completes without throwing.

Depends on: Step 4 (fleets of at most six, so §7.1's return always finds an
empty planet — D7), Step 6 (twelve nodes, so the deal does not fall into the
fallback on a third of games — see the table in "Facts established while
planning"), Step 3 (the vocabulary is already in place).

Verification (automated): the four standard checks, plus specifically
`npx vitest run src/rules/planets.test.ts src/rules/nodePlacement.test.ts
src/rules/nodePool.test.ts src/rules/nodes.test.ts src/rules/combat.test.ts
src/rules/recovery.test.ts src/rules/camping.test.ts src/rules/ply.test.ts
src/rules/fullGame.test.ts src/rules/seededReplay.test.ts`. The properties
that must be demonstrated: a ship on a planet cannot attack and cannot be
attacked and gains a power at the end of its owner's turn; a ship on a
starting square has none of those properties; no node is ever placed on a
planet, at the deal and at every replacement, over a long run and whatever the
seed; a fight returns both ships to empty planets at both fleet sizes over a
long run without ever failing to find one.

---

### Step 8 — Twelve drawings, dealt across the twelve planets

Status: pending

The artwork catches up with the rules.

- **Trim the catalogue to twelve.** Delete planet **12** (the cream-and-olive
  crater planet) and planet **11** (the rose-and-cream banded planet with a
  storm, the Jupiter-like one) from `src/board/planetArt.ts`, and their
  `<defs>` from `src/board/PlanetDefs.tsx`. The remaining numbers keep their
  gaps — 1–10, 13, 14 (D10) — and the module comment's "zero-padded, 01-14" is
  corrected to the numbers actually present.
- **Delete the trait machinery** (D6): `PlanetTraits`, `PlanetColorFamily` and
  the `traits` field on `PlanetArt`, plus `planetPlacement.test.ts`'s
  `sharesATrait` helper and the spread test built on it. `surface` and
  `ringOrientation` stay, and so does the test that no two drawings share a
  signature.
- **Replace `src/board/planetPlacement.ts`.** `RING_SLOTS`, `RING_ORDER` and
  the fixed `planetForSquare` table go — there is no ring and no fixed pairing
  any more. In their place, a pure function that takes the game's opening seed
  and returns the arrangement: a permutation of the twelve drawings over the
  twelve squares of `src/rules/planets.ts`, keyed by square name, built with a
  Fisher–Yates shuffle driven by `mulberry32` from `src/rules/random.ts`
  (D4). It must throw if the number of drawings and the number of planet
  squares ever disagree, so a future catalogue edit cannot silently drop a
  square. The module keeps its path (D5).
- **`src/board/Board.tsx`** builds the arrangement once per game from
  `session.state.openingSeed` (memoised on that value, not rebuilt per square
  or per render) and asks it which drawing a square carries.
- Tests: `planetPlacement.test.ts` is rewritten — the arrangement is a
  permutation (every planet square gets exactly one drawing, every drawing is
  used exactly once), the same seed gives the same arrangement, and different
  seeds give different ones. `planetArt.test.ts` — twelve entries; the numbers
  present are exactly 1–10, 13, 14; ids still unique across the catalogue and
  still prefixed by their own number; signatures still distinct.
  `PlanetDefs.test.tsx` should stay green as written. `Board.test.tsx` regains
  its planet-drawing case in final form: a drawing appears on each of the
  twelve planet squares and nowhere else, whether or not a ship stands there.
  `BoardSquare.test.tsx`'s sample drawing comes from `PLANET_ART`.

Depends on: Step 5 (`openingSeed` exists), Step 7 (the twelve squares are the
planets, and no node is drawn on one).

Verification (manual): run `npm run dev` and open the app. Confirm:

1. A new game shows **twelve** planets, at E3, D7, F5, I4, J8, L5, K13, L9,
   J11, G12, F8, D11, and the board's edge is bare.
2. Each of the twelve drawings appears exactly once.
3. Starting a second new game produces a **different** arrangement of the same
   twelve drawings on the same twelve squares.
4. No node marker sits on a planet or next to one.
5. Playing a few turns: moving a ship onto a planet announces "… moved from X
   onto the Y planet"; that ship gains a point of power at the end of its
   owner's turn; attempting to attack from a planet is refused with "A ship on
   a planet cannot attack. Move it off first."; attacking a ship on a planet
   is refused with "A ship on a planet cannot be attacked."; and after a fight
   both ships are announced as returning to planets.
6. The start screen offers **6** and **5**, with 6 selected.

Then the four standard checks.

---

### Step 9 — README, and the last of the word "bay"

Status: pending

Bring `README.md` up to date and sweep the repository's living documents. The
README currently describes fourteen bays around the edge with a planet sitting
in each, fifteen nodes, and a choice of seven, six or five ships. It must
describe: twelve planets in the board's interior, a different arrangement of
drawings every game; twelve nodes, four charged and eight inactive at the
deal; five or six ships a side with six the standard game; ships starting on
ordinary edge squares that give nothing and protect nothing; and a beaten ship
returning to a planet. Run `/update-readme` to produce the diff from the
branch's changes, then read the result and correct it — the README is
player-facing prose for a non-technical reader (`CLAUDE.md`).

Then the final sweep: nothing under `src/` and nothing in `README.md` still
says "bay", in a name, a sentence or a comment. `doc/plan/` keeps its history,
including the folder named for the story that introduced bays, and
`doc/ruleset/changelog.md`'s older entries are a dated record that is never
rewritten (`CONTRIBUTING.md`).

Depends on: Steps 1–8 (everything the README describes is settled).

Verification (automated):
`grep -rniI "bay" src/ README.md doc/ruleset/ | grep -v 00000013-spaceship-bay-visual`
returns nothing outside `doc/ruleset/changelog.md`'s historical entries; the
four standard checks pass. The two permitted occurrences are that historical
`doc/plan/` path in `planetArt.ts` and `PlanetDefs.tsx` — a real folder,
named for the story that drew the planets, which must stay resolvable. The
owner reads the README at final sign-off.

---

## What this plan deliberately does not do

Carried from the story's "Out of scope", so no step wanders into it:

- **No balancing.** Recovery and combat immunity now sit in the middle of the
  board and a beaten ship returns to the centre. How well that plays is not
  this story's problem.
- **No retuning of any node number other than the count** — `NODE_CAPACITY`,
  `TARGET_CHARGED_NODES`, `PRESSURE_CAP` and the drain, recovery and opening
  tables are untouched.
- **No re-shaping of the energy table.**
- **No change to where ships start** — same squares, same colours, same two
  layouts.
- **No moving, redrawing or re-scaling of planet artwork** beyond deleting two
  drawings, and no redrawing of the board's edge now that nothing lives there.
- **No new drawings** to replace the two deleted.
- **No migration path** for games recorded under 0.21; there is no backwards
  compatibility (`CLAUDE.md`).
