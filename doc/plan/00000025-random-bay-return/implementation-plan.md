# Implementation plan — 00000025 Random bay return

## What this story is

A ship that loses a fight, or that draws one, goes back to a bay **chosen at
random from the bays that are empty at that moment**, instead of walking a
numbered ring whose starting point advances one bay at the end of every turn.

This is a **gameplay change**, so `doc/ruleset/rules.md` goes from version
**0.9** to **0.10**, with a `doc/ruleset/changelog.md` entry and a matching
`RULES_VERSION` bump, in its own commit ahead of the code (step 1). Tagging
stays on hold, per `CLAUDE.md`.

Three things happen in the code:

1. The bay a returning ship lands in is **drawn** from the game's existing
   seeded generator (`drawIndex` in `src/rules/random.ts`) against the same
   `randomSeed` on the game state that the site-replacement draw uses.
2. The whole ring mechanism is **deleted** — the clockwise bay ordering, the
   stored return-position index, the end-of-turn drift, and the two derived
   helpers built on them.
3. The board **stops marking** the next return bay. There is no replacement
   cue: the destination is unknowable until the fight happens, so there is
   nothing to show.

Vocabulary reminder for a cold reader (`CLAUDE.md`): planning documents and
code say **ply** where the rules and the UI say **turn**; **bay**, **site**
and **action** are the same word everywhere.

## Where the work lands

| File                                                                      | What happens to it                                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `doc/ruleset/rules.md`                                                    | §1, §7.1 and §8.7 rewritten; version 0.9 → 0.10 (step 1)                                                            |
| `doc/ruleset/changelog.md`                                                | New 0.10 entry at the top (step 1)                                                                                  |
| `src/rules/rulesVersion.ts`                                               | `RULES_VERSION` → `"0.10"` (step 1)                                                                                 |
| `src/board/Board.tsx`                                                     | Loses the return-cue computation and the `returnCue` props it passed (step 2)                                       |
| `src/board/BoardSquare.tsx`                                               | Loses the two cue components, their geometry helpers and the `returnCue` prop (step 2)                              |
| `src/board/BoardSquare.css`                                               | Loses the cue colour rule and its comment (step 2)                                                                  |
| `src/board/squareLabel.ts`                                                | Loses the `ReturnCue` type, its wording table and the `returnCue` field (step 2)                                    |
| `src/board/Board.test.tsx`, `BoardSquare.test.tsx`, `squareLabel.test.ts` | Cue tests removed, affected accessible names updated (step 2)                                                       |
| `src/rules/combat.ts`                                                     | `returnPositionSquare` and `receptacleBay` go; a seeded draw replaces them (step 3)                                 |
| `src/rules/ply.ts`                                                        | `applyAttack` threads the advanced seed through both return paths (step 3)                                          |
| `src/rules/combat.test.ts`, `ply.test.ts`                                 | Ring-based expectations replaced with draw-based ones (step 3)                                                      |
| `src/rules/bays.ts`                                                       | `CLOCKWISE_BAYS`, `STARTING_RETURN_POSITION_INDEX`, `driftReturnPositionIndex`, `bayNumberingFrom` deleted (step 4) |
| `src/rules/gameState.ts`                                                  | `returnPositionIndex` comes off `GameState` and off the starting state (step 4)                                     |
| `src/rules/endOfTurn.ts`                                                  | §8.7 step 6 (the drift) deleted; six steps become five (step 4)                                                     |
| ~15 test files with a hand-built `GameState`                              | Drop `returnPositionIndex` from their state builders (step 4)                                                       |
| `src/rules/seededReplay.test.ts` (new)                                    | Integration test: same seed replays the same fights and the same bays (step 5)                                      |
| `README.md`, `CLAUDE.md`                                                  | The "how it plays" wording and the one-random-element line (step 6)                                                 |

Deliberately **not** touched:

- `src/board/announcements.ts`. The fight announcement already names the bay a
  beaten ship landed in ("The beaten ship returned to the O6 bay with no
  shields"), which is exactly right under the new rule and needs no change.
  Confirmed by the owner at the plan gate: no wording is added to signal that
  the bay was drawn.
- `src/game/seed.ts` and `src/rules/random.ts`. The generator and the opening
  seed are out of scope; this story only adds a second consumer of the stream.
- `doc/plan/00000021-accessibility-tech-debt/known-issues.md`. See **D12**.

## Design decisions and reasoning

This section is the design record for the story. The code does not carry design
history (`CONTRIBUTING.md`, "Comments"), so anything a future reader needs to
know about **why** is written here, not in a comment.

### D1 — The rules change lands first, in its own commit

`CLAUDE.md` and the implementation-plan guide both require it: `rules.md` is
the single source of truth and the code implements it, so the document is
edited, the version bumped and the changelog written before any behaviour
changes. Between step 1 and step 4 the code is knowingly behind the document —
it still drifts a return position that 0.10 no longer describes. That window is
expected and is closed by step 4; no step in between should try to paper over
it.

### D2 — The draw lives in `src/rules/combat.ts`, and returns a tuple

`receptacleBay` lives in `combat.ts` today because §7.1 is part of §7, and the
draw replaces it in place. The new function takes the game state (it needs both
the occupancy and the seed) and returns **a tuple of the drawn bay and the next
seed** — the same "seed in, value and next seed out" shape `drawIndex` and
`mulberry32` already use in `src/rules/random.ts`.

Rejected: returning a new `GameState` with the seed already advanced, the way
`drawReplacements` in `src/rules/nodes.ts` does. That shape suits `nodes.ts`
because a replacement draw genuinely changes several parts of the state at
once (site states, effects, seed). A bay draw changes nothing on its own — the
caller has to place a ship anyway — so handing back a state would mean
`combat.ts` starts assembling states, which it does not do anywhere else. Every
other function in `combat.ts` is a derivation from a state, and it stays that
way.

Rejected: putting the draw in `src/rules/bays.ts`. That module knows only about
squares and deliberately has no `GameState` import; occupancy is not its
business.

Rejected: inlining the draw in `applyAttack` (`src/rules/ply.ts`). It would be
untestable except through a whole attack, and §7.1's "somewhere to go"
guarantee would have no single home.

### D3 — One random stream, not two

The draw uses `state.randomSeed` — the same field §8.6's replacement draw
advances — and no second seed field is added. A recorded game carries one
opening seed, and every draw in the game comes off that one chain in the order
the game made them. Adding a separate seed for bay returns would double what a
record has to carry for no benefit.

`Math.random` is banned by lint in this repository (`eslint.config.js`,
`no-restricted-properties`); this must not become the exception.

### D4 — The pool is the empty bays, enumerated in `BAYS` order

The candidate pool is every bay with no ship on it right now, collected by
walking `BAYS` (the §3.1 table order: top, right, bottom, left) and keeping the
empty ones, then `drawIndex(seed, pool.length)` picks one. This mirrors
`drawOneReplacement` in `src/rules/nodes.ts`, which walks `SITES` in order so
that its draw is a function of the seed alone.

The **order does not affect fairness** — a uniform index over a set is uniform
whichever order the set is written in — but it must be **fixed and stable**,
because a recorded game replays by re-running the same draws against the same
pools, and a differently ordered pool would map the same index to a different
bay. `BAYS` order is chosen simply because it is the ordering the rules
document itself tabulates.

Occupancy is judged **at the moment of the draw** and never cached, exactly as
`receptacleBay` was: a bay vacated earlier in the game is an ordinary candidate.

### D5 — The mutual return advances the seed between its two draws

On a drawn fight §7.1 places the attacker first and then draws the defender's
bay from the bays still empty. In `applyAttack` that is two calls against
successive states, and **the state passed to the second call must carry both
the attacker's new position and the seed the first draw advanced to**.

Both halves matter, for different reasons:

- Carrying the attacker means the defender cannot be handed the bay the
  attacker just took. (This is already how the code works today and is why
  `receptacleBay` is called twice rather than having a "second receptacle"
  variant.)
- Carrying the **advanced seed** means the second draw is an independent draw.
  Drawing twice from the same seed would produce the same index into a pool
  that is one shorter — not a crash, and often not even a visibly wrong bay,
  which is precisely why it would be an easy bug to ship. It would also break
  replay, because the seed the rest of the game continues from would be one
  step behind.

So `applyAttack` writes the advanced seed into the state at each placement: on
a mutual return the seed advances **twice** over the action, and on a
single-loser return **once**.

### D6 — The empty-pool guard keeps its rules-quoting message

`drawIndex` throws a `RangeError` when asked for a count of zero, so a fully
occupied board would fail loudly anyway. The draw nonetheless keeps its own
explicit check first, with a message naming §7.1's guarantee that there is
always somewhere to go — the same bug-detector style `receptacleBay` uses today
and that `ply.ts`'s `assertFightInvariants` uses throughout. A developer who
trips it should read "the rules say this cannot happen", not "count must be a
positive integer".

### D7 — The board cues come off **before** the draw goes in

`src/board/Board.tsx` imports `returnPositionSquare` and `receptacleBay` from
`combat.ts`, so those two functions cannot be deleted while the cues still
exist. The alternative order (draw first, board second) would mean either
keeping dead functions alive for a step or breaking the build in between.
Removing the cues first is a self-contained, independently verifiable change
that leaves the app compiling and playable, and it leaves `combat.ts` with a
single consumer for step 3 to rewrite.

### D8 — No replacement cue, and the announcement is why that is enough

Nothing marks a bay after step 2. A player who wants to know where a beaten
ship went is told, in words, by the existing fight announcement in
`src/board/announcements.ts`, which already names the bay ("The beaten ship
returned to the O6 bay with no shields"), and can see the ship there. What is
lost is only foreknowledge, which is the point of the story.

### D9 — Delete, do not deprecate — and `CLOCKWISE_BAYS` costs nothing to lose

Everything the ring mechanism consisted of is deleted outright rather than left
in place unreferenced. `CLOCKWISE_BAYS` goes with it: its last non-test
consumer is the ring numbering, and `src/rules/fleet.ts` writes the starting
fleet's fourteen squares out in full rather than reading the ring.

The one test worth a thought is `bays.test.ts`'s "matches rules.md §4's
starting-fleet listing square for square", which pins `STARTING_FLEET` against
`CLOCKWISE_BAYS`. It can go, because `src/rules/fleet.test.ts` already contains
"matches §4's transcribed clockwise order from H15", which transcribes the
fourteen square/side pairs from the rules document independently. No coverage
is lost, and no test needs re-homing.

`BAYS` and `isBay` stay: they are the fourteen bays themselves, which this
story does not change.

### D10 — §8.7 loses a step rather than reordering

The drift is step 6, the last of the six, so removing it renumbers nothing.
Steps 1–5 keep their order and their reasoning (in particular the deliberate
"step 3 before step 5" note about the dormant pool stays exactly as it is).
`runEndOfTurn` keeps advancing the seed through step 5's replacement draws;
that is untouched.

### D11 — How the randomness is tested: coverage, not statistics

The story asks for evidence that the draw is "not a dressed-up first-empty-bay".
The test for that asserts **coverage**: from one fixed state with several empty
bays, drawing over many seeds hits every empty bay at least once, and never
hits an occupied square. It deliberately does not assert a distribution shape,
a chi-squared statistic or per-bay counts within a tolerance — those make a
test that fails on a good day.

Seeds for such a sweep should be **chained** (start from one seed and feed each
returned next seed into the following draw) rather than counted up 1, 2, 3…,
because chaining is what the game itself does and does not depend on how well
the generator mixes adjacent seeds.

### D12 — Accessibility

Per the "Accessibility during pre-release" section of `CLAUDE.md` and the
story's own out-of-scope list: **no step and no test in this plan is about
accessibility**. Existing automated tests that happen to assert an accessible
name are updated where the path is straightforward (step 2 does exactly that,
by dropping the segment that named a cue). Nothing is added to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`: the square's
accessible name loses a segment because the thing it described no longer
exists, which is a removal, not a regression, and that ledger only records
knowingly accepted losses.

### D13 — The replay test needs its own policy

`src/rules/fullGame.test.ts` already plays a whole game deterministically, but
its greedy policy only attacks when **no ship has a legal move at all**
(`chooseAction` step 3), so fights are rare or absent in it and it is the wrong
vehicle for proving that fights replay. A separate integration test with a
small attack-first policy is used instead (step 5). For scale: a naive
attack-first policy driven through the current rules produced 29 fights over a
100-round game, so a test of this shape has plenty of fights to look at.

### D14 — `assertFightInvariants` gains a returned-ship check (owner decision)

**The owner asked for this**, against the plan's original recommendation to
leave the invariants alone. It goes in step 3, alongside the draw it guards.

`assertFightInvariants` in `src/rules/ply.ts` today checks where ships that did
**not** return ended up — every non-returning, non-advancing ship is where it
was, and the advancing winner is on its own lane and not in a bay. It says
nothing about where the returning ships themselves landed, which was
unremarkable while the destination was a deterministic walk along a ring and is
worth pinning now that it is a draw.

Two properties are added, both over `returnedShipIds`, in the loop that already
walks `before.ships`:

- Every returned ship ends **on a bay square** (§7.1).
- Returned ships end in **distinct** bays, and each lands in a bay that held no
  ship in `before` — which together are what §7.1's "there is always somewhere
  to go" argument promises.

Note what this does and does not catch. It catches a draw that ignores
occupancy, and it catches the second draw of a mutual return being made against
a state that does not yet hold the attacker. It does **not** catch the
seed-threading bug of **D5** — drawing twice from the same seed yields a
perfectly legal bay, just not the one a replay expects — which is why step 3
also asserts the seed advances once per returning ship, and why this invariant
is an addition to that test rather than a substitute for it.

---

## Step 1 — Rules 0.10: the return bay is drawn at random

Status: committed

Notes: Rewrote §7.1, extended §1's random-elements sentence to two, dropped
§8.7 step 6, bumped the version line and `RULES_VERSION` to 0.10, and added
the 0.10 changelog entry above 0.9. Read the rest of the document for
stragglers as instructed; found none beyond the ones the plan already
expected (§3.1, §4's H15 listing, §7's "returned to a bay (section 7.1)",
Appendix A). No file under `src/` other than `rulesVersion.ts` was touched.
`npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
(688 tests, unchanged count) all pass.

Edit `doc/ruleset/rules.md`, add a `doc/ruleset/changelog.md` entry and bump
`RULES_VERSION` in `src/rules/rulesVersion.ts`. **No behaviour changes in this
step** — no other file in `src/` is touched. See **D1** for why this is its own
commit and why the code is knowingly behind the document until step 4.

In `rules.md`:

- **The version line** near the top: `**Rules version: 0.9**` becomes
  `**Rules version: 0.10**`.
- **§1 Overview.** "The game has one random element: which node site wakes up
  next." now names two: which node site wakes up next, and which bay a beaten
  ship is pushed back to.
- **§7.1 Returning to a bay** is rewritten. What it must say:
  - A returning ship goes to a bay chosen **at random** from the bays that are
    **empty at that moment**, every empty bay equally likely.
  - The choice is genuinely random and neither player can see it coming — the
    same assurance §8.6 gives for the replacement draw, and worth stating in
    the same spirit.
  - A returning ship is placed **immediately**, as part of resolving the fight,
    before anything else happens (this sentence survives unchanged).
  - When both ships return, the **attacker is placed first**, and the
    defender's bay is then drawn from the bays still empty. Say why the order
    is fixed: it makes no difference to the odds, but it is what lets a
    recorded game replay exactly.
  - **"There is always somewhere to go" survives**, simplified: a returning
    ship was by definition on the board and not in a bay, so at least one bay
    is empty; with two ships returning from one fight, at least two bays are
    empty, so the attacker's placement can never leave the defender without
    one.
  - Everything about the numbering goes: bays numbered fresh each turn, return
    position 1, "the first empty bay in that order", H15 as the first turn's
    position 1, and the counter-clockwise drift.
- **§8.7 End-of-turn order** loses step 6 ("The bay return position moves one
  bay counter-clockwise (section 7.1)."). The list goes from six steps to five;
  steps 1–5 are unchanged, and so are the paragraphs after the list, including
  the note about steps 3 and 5 being in that order deliberately. Check the
  section's own prose for any other count of the steps and fix it if present.
- **Read the rest of the document for stragglers.** Expected findings, so the
  implementer does not go hunting: §3.1 ("Bays are not owned") is unaffected;
  §4's "Starting clockwise from H15" is the starting-fleet listing and has
  nothing to do with the return position; §7's "The loser is returned to a bay
  (section 7.1)" is unaffected; Appendix A stays as it is. Change anything else
  that leans on the ring if it exists.

In `changelog.md`, add a `## 0.10 — random bay return` entry **above** the 0.9
entry, in the house style of the entries already there (bolded lead sentences,
one bullet per change, then a closing paragraph on tagging). It should record:
the random draw replacing the numbered ring; the removal of return position 1,
its H15 starting point and the counter-clockwise drift; §8.7 dropping to five
steps; §1 now naming two random elements; and that the attacker-first order on
a mutual return is kept deliberately, for replay. Close by noting that this
changes how the game is played and would ordinarily be a tagging candidate, but
tagging is on hold until the game plays — matching the wording the 0.9 entry
uses.

In `src/rules/rulesVersion.ts`, set `RULES_VERSION` to `"0.10"`. It is a string
precisely so that this bump cannot collapse to `0.1`; the file's own comment
says so.

Depends on: nothing.

Verification (automated): `npm test` passes, in particular
`src/rules/rulesVersion.test.ts`, which reads the version out of `rules.md`,
compares it to `RULES_VERSION`, and requires a `## 0.10 ` heading in
`changelog.md`. Also run `npm run typecheck`, `npm run lint` and
`npm run format:check`. The rest of the suite (688 tests before this story)
must be unchanged and green, since no behaviour changed.

---

## Step 2 — The board stops marking the next return bay

Status: committed

Notes: Removed both on-board cues and everything that fed them —
`ReceptacleMark`/`ReturnPositionMark`, `RETURN_CUE_CORNERS`,
`cornerTrianglePath`/`cornerDiagonal`, the two triangle constants, and the
`returnCue` prop in `BoardSquare.tsx`; the `.board-square__mark--return-position,
.board-square__mark--receptacle` rule in `BoardSquare.css`; the `ReturnCue`
type, `RETURN_CUE_WORDING` table and `returnCue` field in `squareLabel.ts`; and
the return-position/receptacle computation, the `returnCue` derivation and the
`returnPositionSquare`/`receptacleBay`/`ReturnCue`/`BAYS` imports in
`Board.tsx` (`isBay` and `legalTargets`/`resolveFight` kept). Updated module
header comments in `BoardSquare.tsx` and `squareLabel.ts` to drop the cue
descriptions. Removed the cue-specific test cases in `squareLabel.test.ts`,
`BoardSquare.test.tsx` and the `describe("return cues", ...)` block in
`Board.test.tsx`, updated the accessible-name expectations that lost the cue
segment (e.g. H15 now `"H15, bay, green ship, 0 shields"`), and added the
guard test asserting no `.board-square__mark--receptacle` /
`--return-position` element exists and no gridcell name matches
`/return position|beaten ship/`. `combat.ts` still exports
`returnPositionSquare` and `receptacleBay`, still called from `ply.ts`, as
expected — step 3 removes them. No deviation from the plan.
`npm run typecheck`, `npm run lint`, `npm run format:check` (after a Prettier
auto-fix on `squareLabel.test.ts`) and `npm test` (675 tests, down from 688 —
13 cue-specific tests removed, 1 guard test added) all pass.

Remove both on-board return cues and everything that exists only to feed them.
After this step a bay square looks like a bay and nothing more, and no square's
accessible name mentions a return position or a receptacle. Nothing replaces
them (**D8**). This step comes before the draw itself because `Board.tsx` is
what keeps `combat.ts`'s two ring functions alive (**D7**).

- **`src/board/Board.tsx`.** Delete the block that computes
  `returnPositionSquareName`, `anyBayEmpty` and `receptacleSquareName`,
  together with its explanatory comment, and the per-square block that derives
  `isReturnPosition`, `isReceptacle` and `returnCue` (with its comment). Stop
  passing `returnCue` to `BoardSquare` and to `squareLabel`. Drop the now-unused
  imports: `returnPositionSquare` and `receptacleBay` from `../rules/combat`
  (keep `legalTargets` and `resolveFight`), the `ReturnCue` type from
  `./squareLabel`, and `BAYS` from `../rules/bays` (keep `isBay`).
- **`src/board/BoardSquare.tsx`.** Delete the `ReceptacleMark` and
  `ReturnPositionMark` components, the `RETURN_CUE_CORNERS` table, the
  `cornerTrianglePath` and `cornerDiagonal` helpers, the
  `RETURN_CUE_TRIANGLE_LEG` and `RETURN_CUE_STROKE_WIDTH` constants, the
  `returnCue` prop (interface and destructuring), the two lines that render the
  marks, and the `ReturnCue` type import. **Keep** the `BracketCorner`
  interface, `BRACKET_CORNERS` and `bracketPath` — the selected-ship marking
  uses them. Rewrite the module header comment: the paragraph describing the
  corner triangles goes, and the first paragraph's list of what a square stacks
  should no longer mention them.
- **`src/board/BoardSquare.css`.** Delete the
  `.board-square__mark--return-position, .board-square__mark--receptacle` rule
  and the comment above it. Leave `--bay-border` alone — `.board-square--bay`
  still uses it — and leave every other marking rule untouched.
- **`src/board/squareLabel.ts`.** Delete the `ReturnCue` type, the
  `RETURN_CUE_WORDING` table, the `returnCue` field on
  `SquareLabelDescriptor`, and the segment it pushed. Update the module header:
  the first paragraph's ordering sentence should no longer list the return cues
  between the bay/site segment and the occupant, and the closing paragraph
  about cues being independent of the selection mark goes entirely.

Test updates (this is where most of the work is):

- **`src/board/squareLabel.test.ts`.** Remove the cases that pass a
  `returnCue`, including any that assert segment ordering around it.
- **`src/board/BoardSquare.test.tsx`.** Remove the cases that render with a
  `returnCue` prop or assert the `--receptacle` / `--return-position` mark
  elements.
- **`src/board/Board.test.tsx`.** Remove the whole return-cue describe block
  (the tests named around "marks H15 as return position 1…", "names both return
  cues on the same bay…", "moves the receptacle wording onto a bay vacated
  mid-ply…" and "shows no receptacle wording anywhere when every bay is
  occupied…"). Several tests elsewhere in the file assert accessible names that
  currently include a cue segment — for example H15's name on the starting
  board — and those expectations must lose the segment (H15 becomes
  `"H15, bay, green ship, 0 shields"`). Search the file for "return position",
  "receptacle" and "returnCue" and leave none behind.
- **Add one guard test** in `Board.test.tsx`: render the board and assert that
  no element matching `.board-square__mark--receptacle` or
  `.board-square__mark--return-position` exists anywhere, and that no gridcell
  name matches `/return position|beaten ship/`. This is the assertion that would
  catch a cue creeping back.

`src/rules/combat.ts` still exports `returnPositionSquare` and `receptacleBay`
after this step, still called from `src/rules/ply.ts`; that is expected and
step 3 deals with them. Do not touch the rules layer here.

Depends on: step 1 (the rules no longer describe what these cues showed).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass, with the new guard test among
them and no test in `src/board/` referring to a return cue. The owner's own look
at the running board is part of step 7.

---

## Step 3 — The bay is drawn from the seeded generator

Status: committed

Notes: `combat.ts`'s `returnPositionSquare`/`receptacleBay` replaced by
`drawReturnBay(state): [Square, number]`, pooling `BAYS` order filtered to
empty squares and calling `drawIndex` (D2/D4/D6). `applyAttack` in `ply.ts`
now writes the advanced seed into the intermediate state at each placement,
on both the mutual-return path (two draws, second against the state that
already holds the attacker and the first draw's seed) and the single-loser
path (one draw) — D5. `assertFightInvariants` gained the D14 checks
(returned ships end on a bay, in distinct bays, each empty in `before`), with
its own three new hand-built test cases. `combat.test.ts`'s ring-based
describe block was replaced with one for `drawReturnBay` covering: always an
empty bay; the one-empty-bay case for many seeds; same seed same bay; seed
always advances; live recomputation; the empty-pool throw; and the D11
chained-seed coverage sweep. `ply.test.ts`'s fight tests that pinned a
specific ring-derived bay were rewritten to assert bay membership and
liveness as properties instead, except one (the first attacker-win test),
which pins the exact bay `randomSeed: 1` draws, per the plan's "one pinned
test" instruction; added the two-seeds-per-draw, two/several-empty-bays and
seed-advance-once/twice tests the step calls for. Ran the D5 sanity check
(temporarily drew the mutual return's second bay from the un-advanced seed)
and confirmed the new "advances randomSeed once…twice" test fails, then
reverted. `state.returnPositionIndex` and `endOfTurn.ts`'s drift are left in
place, as instructed, for step 4. No deviation from the plan.
`npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
(682 tests, up from 675) all pass; `grep -rn "receptacleBay\|returnPositionSquare" src`
returns nothing.

Replace "the first empty bay from return position 1" with a seeded draw over
the empty bays, and thread the advanced seed through `applyAttack`. Read
decisions **D2**, **D3**, **D4**, **D5** and **D6** before starting; they fix
the shape of the function, the pool, the seed threading and the guard.

- **`src/rules/combat.ts`.** Delete `returnPositionSquare` and `receptacleBay`.
  Add one exported function in their place — suggested name `drawReturnBay` —
  that takes a `GameState` and returns the drawn bay together with the next
  seed, as a tuple in `random.ts`'s style (**D2**). It builds the pool by
  keeping the bays in `BAYS` order that no ship stands on (**D4**), throws a
  `RangeError` naming §7.1's guarantee if that pool is empty (**D6**), and
  otherwise calls `drawIndex(state.randomSeed, pool.length)`. Update the
  imports: `BAYS` and `isBay` from `./bays` (the ring symbols go), and
  `drawIndex` from `./random`. Give it a doc comment in the module's existing
  style: what it returns, that the pool is judged against current occupancy at
  the point of use and never stored, that the caller must store the returned
  seed, and the mutual-return instruction that currently sits on
  `receptacleBay` ("call it once to place the attacker, then again against the
  state that already holds the attacker **and the advanced seed**"). Do not
  write story numbers or rejected alternatives into the code
  (`CONTRIBUTING.md`, "Comments").
- **`src/rules/ply.ts`, `applyAttack`.** Both return paths change:
  - _Mutual return._ Draw against `state`; place the attacker in the drawn bay
    **and** set `randomSeed` to the returned seed on that intermediate state;
    draw again against that state; place the defender and set `randomSeed` to
    the second returned seed. The `returns` array keeps its current
    attacker-then-defender order, which is what the effect and the
    announcement read.
  - _Single loser._ Draw against `state`, and set `randomSeed` to the returned
    seed on the state that also carries the winner's new shield count and the
    loser's bay. The winner's advance and site-waking that follow are unchanged.
  - `placeInBay` itself need not change; the seed can be written in the same
    object spread that the branch already builds, whichever way reads more
    plainly.
  - `assertFightInvariants` does not compare `randomSeed`, so advancing it
    needs no change on that account.
- **`src/rules/ply.ts`, `assertFightInvariants`.** Add the returned-ship
  checks **D14** describes, in the loop that already walks `before.ships`:
  every ship in `returnedShipIds` ends on a bay square, those bays are
  distinct from each other, and each held no ship in `before`. Throw a
  `RangeError` naming §7.1 in the style of the messages already there. Extend
  the function's doc comment to say what the new checks cover, and add cases
  to the existing hand-constructed tests of it in `src/rules/ply.test.ts` —
  the function is exported precisely so a test can build an otherwise
  impossible before/after pair.
- Update `applyAttack`'s doc comment where it describes the loser being "placed
  in a bay" so it says the bay is drawn at random from the empty bays, and note
  that the action advances the seed once per returning ship.

Test updates:

- **`src/rules/combat.test.ts`.** Replace the
  `describe("returnPositionSquare / receptacleBay")` block with one for the new
  draw. Cover: the drawn square is always a bay and is always one that was
  empty in the state drawn against; when exactly one bay is empty, every seed
  produces that bay; the same seed always produces the same bay; the returned
  seed differs from the seed passed in; and the coverage sweep of **D11** —
  from a fixed state with several empty bays, chained seeds hit every empty bay
  at least once and never an occupied one. Remove the `CLOCKWISE_BAYS` and
  `STARTING_RETURN_POSITION_INDEX` imports if nothing else in the file needs
  them (the state builder's `returnPositionIndex` field survives until step 4).
- **`src/rules/ply.test.ts`.** Existing fight tests that expect a specific bay
  (H15, L15 and friends, chosen by the old ring) must be rewritten. Prefer
  asserting **properties** — the ship is in a bay, that bay was empty before
  the fight, the two ships in a mutual return are in two different bays, the
  attacker's return is the first entry in `returns` — plus, for one test,
  pinning the exact bay produced by one stated seed, so a change to the draw
  shows up as a failing expectation rather than silently. Add:
  - a mutual return whose fight leaves exactly **two** empty bays: both ships
    are placed, in the two different bays, whatever the seed;
  - a single-loser fight where exactly **one** bay is empty: the loser lands
    there, whatever the seed;
  - `randomSeed` advances once on a single-loser fight and twice on a mutual
    return (this is the assertion that catches the bug **D5** describes);
  - a sweep over many chained seeds of a mutual return with several empty bays,
    asserting the two ships never share a bay.
  - The existing test named around "recomputes the receptacle live" is about a
    bay vacated earlier becoming available again. Keep that idea rather than
    the wording: with the vacated bay the only empty one, a later fight's loser
    must land in it.

After this step `state.returnPositionIndex` is still on the state and
`endOfTurn.ts` still drifts it; nothing reads it any more. Step 4 removes it.
Do not remove it here — doing so would drag fifteen test files into this step
and blur what is being verified.

Depends on: step 2 (`Board.tsx` no longer imports the two deleted functions) and
step 1 (this is what 0.10 says).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass, including the new coverage
sweep, the seed-advance assertions and the two extreme cases (one empty bay;
two empty bays with two ships returning). `grep -rn "receptacleBay\|returnPositionSquare" src`
returns nothing.

---

## Step 4 — Delete the ring: the state field, the drift and the helpers

Status: committed

Notes: Deleted `CLOCKWISE_BAYS`, `STARTING_RETURN_POSITION_INDEX`,
`driftReturnPositionIndex` and `bayNumberingFrom` from `src/rules/bays.ts`
(`BAYS` and `isBay` untouched); removed `returnPositionIndex` from
`GameState` and `startingGameState` in `src/rules/gameState.ts`; removed
§8.7 step 6 and its import from `src/rules/endOfTurn.ts`, updating both the
module header and `runEndOfTurn`'s doc comment from "six steps" to "five
steps". Grepped for `returnPositionIndex` / `STARTING_RETURN_POSITION_INDEX`
and found the plan's sixteen listed files plus `src/rules/bays.test.ts`
(which the plan calls out separately, in the "tests that are about the
mechanism itself" bullet, not the generic list); dropped the field and its
import from each. Removed the `CLOCKWISE_BAYS` /
`driftReturnPositionIndex` / `bayNumberingFrom` describe blocks from
`src/rules/bays.test.ts` (confirmed first that `fleet.test.ts`'s "matches
§4's transcribed clockwise order from H15" still independently covers the
starting-fleet ordering, per **D9**), the step-6 drift describe block and
its `returnPositionIndex` expectation in `src/rules/endOfTurn.test.ts`
(simplified the "leaves both totals unchanged" assertion to
`expect(result.state).toEqual(state)`), the "names H15 as return position
1" test in `src/rules/gameState.test.ts`, and the three
now-mechanism-only "drifts the return position…" tests in
`src/rules/ply.test.ts` (on `applyMove`, `applyAttack` and
`applyPassGuard`). No new "no ship's square changes" assertion was added:
the existing "leaves both totals unchanged" test in `endOfTurn.test.ts` now
asserts the whole resulting state, ships included, equals the input
unchanged when nothing is held, and none of the five remaining steps ever
touch a ship's square, so the plan's "if the existing tests already say
that, no new test is needed" applied. No deviation from the plan otherwise.
`npm run typecheck`, `npm run lint`, `npm run format:check` (after a
Prettier auto-fix on `src/rules/bays.ts`) and `npm test` (665 tests, down
from 682 — 17 tests removed) all pass, including `src/rules/fullGame.test.ts`.
`grep -rn "returnPositionIndex\|CLOCKWISE_BAYS\|bayNumberingFrom\|driftReturnPositionIndex\|STARTING_RETURN_POSITION_INDEX" src`
returns nothing.

Remove what the mechanism was made of (**D9**). This is one step because the
pieces are mutually dependent: `endOfTurn.ts`'s drift is the only writer of
`returnPositionIndex`, and `driftReturnPositionIndex` is meaningless without
`CLOCKWISE_BAYS`, so the field cannot come off the state without all three
going at once.

- **`src/rules/bays.ts`.** Delete `CLOCKWISE_BAYS`,
  `STARTING_RETURN_POSITION_INDEX`, `driftReturnPositionIndex` and
  `bayNumberingFrom`, with their doc comments. `BAYS`, `BAY_NAMES` and `isBay`
  stay. The module's remaining job is exactly what its header already says.
- **`src/rules/gameState.ts`.** Remove `returnPositionIndex` from the
  `GameState` interface (and its long doc comment), remove it from the object
  `startingGameState` returns, and drop the now-unused
  `STARTING_RETURN_POSITION_INDEX` import from `./bays`.
- **`src/rules/endOfTurn.ts`.** Delete the step 6 block at the end of
  `runEndOfTurn` and the `driftReturnPositionIndex` import. Update the module
  header comment ("the six steps" → five) and `runEndOfTurn`'s doc comment
  ("Runs §8.7's six steps" → five). The function now returns the state produced
  by step 5 directly.
- **Test files.** Roughly fifteen test files hand-build a `GameState` and set
  `returnPositionIndex` in a builder; every one must drop the field and the
  `STARTING_RETURN_POSITION_INDEX` import. They are, at the time of writing:
  `src/board/announcements.test.ts`, `src/board/Board.test.tsx`,
  `src/board/EnergyOverlay.test.tsx`, `src/game/session.test.ts`,
  `src/hud/GameOverPanel.test.tsx`, `src/hud/ScoreDisplay.test.tsx`,
  `src/hud/TurnIndicator.test.tsx`, `src/rules/actions.test.ts`,
  `src/rules/combat.test.ts`, `src/rules/endOfTurn.test.ts`,
  `src/rules/energy.test.ts`, `src/rules/gameState.test.ts`,
  `src/rules/movement.test.ts`, `src/rules/nodes.test.ts`,
  `src/rules/ply.test.ts` and `src/rules/stranded.test.ts`. Verify the list by
  grep rather than trusting it. Most edits are mechanical deletions of one
  line plus one import.
- **Tests that are about the mechanism itself, and go:** the
  `CLOCKWISE_BAYS`, `driftReturnPositionIndex` and `bayNumberingFrom` describes
  in `src/rules/bays.test.ts` (see **D9** — the starting-fleet ordering is
  already covered by `src/rules/fleet.test.ts`, so nothing needs re-homing);
  the step-6 drift describe in `src/rules/endOfTurn.test.ts`, along with the
  `returnPositionIndex` term in its "everything else is unchanged" style
  expectation; and the `gameState.test.ts` assertion that the starting state's
  index names H15.
- **Add one assertion** in `src/rules/endOfTurn.test.ts` that `runEndOfTurn`
  leaves the state's bay-related nothing behind — practically, that the
  existing "runs its steps in order" coverage still holds with five steps and
  that a ply's end changes no ship's square. If the existing tests already say
  that, no new test is needed; do not invent one for its own sake.

Depends on: step 3 (nothing reads the field any more).

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` all pass, including
`src/rules/fullGame.test.ts`, which plays a hundred-round game end to end and is
the story's "still runs to completion" check. Then
`grep -rn "returnPositionIndex\|CLOCKWISE_BAYS\|bayNumberingFrom\|driftReturnPositionIndex\|STARTING_RETURN_POSITION_INDEX" src`
returns nothing.

---

## Step 5 — A seeded game replays its fights and its bays exactly

Status: committed

Notes: Added `src/rules/seededReplay.test.ts`, modelled on `fullGame.test.ts`'s
header and API usage per D13, with a local attack-first-then-move-else-pass
policy (no randomness of its own) and a `MAX_ACTIONS` ceiling. The runner
plays from a given seed for 40 rounds and records the square name of every
`fight-resolved` effect's `returns[].to`. With this policy and a 40-round
game, seed `20260819` produces 26 bay returns; test one asserts a floor of 10.
Test two replays seed `20260819` twice and asserts identical bay sequences and
identical final states. Test three compares seed `20260819` against
`20260820`, confirmed by running it to diverge — noted here per the step's
instruction in case a future change makes this pair coincide. Ran the D5
sanity check described in the step: temporarily made the mutual return's
second `drawReturnBay` call use the un-advanced `state` (both wrong occupancy
and wrong seed) instead of `afterAttackerReturned`, which made all three new
tests fail with `assertFightInvariants`'s "two returned ships both ended in
bay" error (rather than merely producing a different-but-still-self-consistent
result), then reverted — confirmed `git diff` on `src/rules/ply.ts` is clean
afterwards. No deviation from the plan.
`npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
(668 tests, up from 665) all pass.

One observation worth recording, since it looks like a failure of the draw and
is not. Under this attack-first policy the recorded bay sequence oscillates
between **H15 and L15 alone**, rather than spreading around the board. The
cause is the size of the pool, not the draw: the policy sends the same two
ships into each other repeatedly, so only those two ships are ever off their
bays, and only their two bays are ever empty. The orchestrator confirmed this
by instrumenting the same policy and counting the empty bays at each fight —
**exactly 2 at every one of them**, so the draw has two candidates and no room
to spread. Wider pools are covered by D11's chained-seed sweep in
`combat.test.ts`, which asserts every empty bay is hit. Nothing to fix.

Add one integration test proving the property the whole seeded-generator design
exists for: the same opening seed and the same sequence of actions produce the
same game, bays included, and a different seed produces a different one. See
**D13** for why `src/rules/fullGame.test.ts` cannot be reused for this — its
policy attacks only when no ship can move, so fights barely happen in it.

Add `src/rules/seededReplay.test.ts`, with a module header saying what it is
for (an integration test over the public rules API, proving replay determinism
across fights) in the style of `fullGame.test.ts`'s header. It contains:

- A small **deterministic, attack-first policy**, local to the file and drawing
  no randomness of its own: for each ship in fleet order, take the first legal
  attack if there is one, otherwise the first legal move, otherwise pass
  through `applyPassGuard`. Use `legalTargets` / `legalDestinations` and
  `applyAttack` / `applyMove` from the rules layer exactly as `fullGame.test.ts`
  does, and keep a hard action ceiling so a regression fails an assertion
  rather than hanging the runner.
- A runner that plays a game of a modest length (a few tens of rounds is
  plenty) from a given seed and records, in order, the square name of every
  bay a `fight-resolved` effect returned a ship to, alongside the final state.
- **Test one:** the run is not vacuous — the recorded list has a healthy number
  of returns (assert a floor, not an exact count). For scale, a naive
  attack-first policy produced 29 fights across a hundred-round game.
- **Test two:** two runs from the same seed produce identical recorded bay
  sequences and identical final states.
- **Test three:** a run from a different seed produces a different bay
  sequence. Choose the two seeds, run it, and if they happen to coincide pick
  another pair and note it in the step's Notes — the point is that the seed
  drives the game, not that any particular pair of numbers differ.

Depends on: step 4 (the state shape is final, so the test is written once).

Verification (automated): `npm test` passes with the new file included, and the
new tests fail if the seed threading is broken — worth confirming once by
temporarily reusing the same seed for both draws in a mutual return and
watching test two or three fail, then reverting. `npm run typecheck`,
`npm run lint` and `npm run format:check` also pass.

---

## Step 6 — `README.md` and `CLAUDE.md`

Status: committed

Notes: Replaced the "How it plays" paragraph's sentence about the return bay
travelling the ring and the board marking it with one saying a beaten ship's
bay is chosen at random from whichever bays stand empty, so neither player
can know it in advance; reflowed the surrounding blockquote paragraph to the
file's existing ~80-column wrapping so the new sentence didn't leave a
short line, per `prettier --check` (Markdown proseWrap is `preserve` here, so
Prettier does not do this itself). Extended `CLAUDE.md`'s project-description
sentence to name both random elements, matching rules.md §1's phrasing. Also
updated `CLAUDE.md`'s "Game records" section, which likewise said "the
game's **one** random element must come from a seeded generator" — a second,
independent instance of the same now-false count that the plan's given
wording didn't call out by name but that the step's brief ("bring CLAUDE.md's
project-facing description in line with 0.10") covers; reworded to "the
game's random elements must all come from the same seeded generator",
preserving the one-stream point (D3) the sentence exists to make. Grepped
both files for "ring", "return position", "receptacle", "cue" and
"clockwise" and found nothing else to fix. Ran the `/update-readme` review by
hand against `git diff main...HEAD --stat`: no other file in the diff touches
player-visible behaviour beyond the bay-return wording already handled, so no
further README changes were warranted.
`npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
(668 tests, unchanged from step 5) all pass;
`grep -n "travels around the edge" README.md` returns nothing. The orchestrator rewrapped the README paragraph before committing: the step had reflowed the whole blockquote at 81 characters where the file's convention is 76, which turned a one-sentence change into a thirty-three-line diff. Rewrapped at the original width, so only the changed sentence and the lines after it move.

Bring the two player-facing and project-facing descriptions in line with 0.10.

- **`README.md`, the "How it plays" paragraph.** It currently says: "The bay a
  beaten ship returns to travels around the edge of the board as the game goes
  on, and the board marks where it is." Neither half is true any more. Replace
  it with a sentence in the same voice saying a beaten ship is pushed back to a
  bay chosen at random from the bays standing empty, so nobody can know in
  advance where it will land. Keep the surrounding sentences (the winner's
  advance, the equal-shields case, the energy paragraph) as they are, and keep
  the paragraph written for a non-technical reader (`CLAUDE.md`, "Intended
  audience"). Then run `/update-readme`, which reviews the branch diff and
  catches anything else in the README this story has invalidated.
- **`CLAUDE.md`, the project description.** "It is not a pure-strategy game —
  which node site wakes up next is random." now understates the game: extend it
  in the same spirit as §1 of the rules, so it names both random elements —
  which site wakes next, and which bay a beaten ship is pushed back to. One
  sentence; do not restructure the section.
- Search both files for any other reference to the return position, the ring or
  the board cues, and fix anything found.

Depends on: steps 2–5 (the README describes finished behaviour, and
`/update-readme` reads the branch diff, which should by now be the whole story).

Verification (automated): `npm run format:check` passes (Prettier formats
Markdown in this repository), `npm test` still passes, and
`grep -n "travels around the edge" README.md` returns nothing. The wording
itself is reviewed by the owner at peer review and final sign-off.

---

## Step 7 — Manual verification in the running app

Status: pending

The owner runs the app and confirms the story's visible behaviour. Start it
with `npm run dev` inside the dev container (all development happens in the
container — nothing is installed on the host).

What to look for:

- **No bay carries a cue.** At the starting position, and at every point during
  a game, no bay square shows the stroked or solid corner triangles that used
  to mark return position 1 and the receptacle. A bay looks like a bay.
- **A fight sends the beaten ship to a bay that could not have been predicted.**
  Move ships out of their bays, engineer a fight, and watch where the loser
  lands. The announcement names the bay ("The beaten ship returned to the O6
  bay with no shields") and the ship is visibly there, with no shields.
- **A drawn fight returns both ships**, to two different bays, and the
  announcement reads attacker first.
- **A new game plays differently.** Start another game (the app draws a fresh
  opening seed) and provoke a comparable fight; the bay should not be reliably
  the same one, and across a few games returns should be spread around the
  board rather than clustering on H15 and its neighbours the way the old ring
  made them.
- **Nothing else regressed visually** — site artwork, ship icons, the selected
  and destination markings, the energy overlay and the HUD all behave as
  before.

Depends on: steps 2, 3, 4 and 6.

Verification (manual): the owner performs the checks above in the running app
and confirms each. If any check fails, record which one in this step's Notes
and stop rather than proceeding to sign-off.
