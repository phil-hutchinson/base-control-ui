# Implementation plan — 00000044 A randomized opening board

## What this story is

Today every game opens on the same board: **H8, E5, K5, E11 and K11** charged
at drain 0, and the other twelve sites active at pressure 1. It is the one part
of the game with no randomness in it, and it makes the opening moves identical
every time.

This story **deals** the opening board from the game's own seeded generator,
before green's first turn:

1. **Which five sites are charged** — drawn uniformly, without replacement,
   from the seventeen. No site is privileged; the centre is not guaranteed.
2. **Each dealt node's opening drain** — drawn from a new table weighted
   towards the start, capped at 40 (two-thirds of the capacity of 60).
3. **Each other site's opening pressure** — drawn from a new table weighted
   towards the low end, with a thin tail up to the cap of 50.

Nothing starts dormant. Everything else about the opening — the site layout,
the fleets, the bays, starting power, both energy totals at 0 — is untouched.

This is a **gameplay change**, so `doc/ruleset/rules.md` goes from **0.17** to
**0.18** with a `doc/ruleset/changelog.md` entry and a matching `RULES_VERSION`
bump, in its own commit ahead of any code (Step 1). **Tagging stays on hold**
per `CLAUDE.md` — no step tags anything.

The bulk of the work is not the deal. It is the **test sweep**: about fifty
tests call `startingGameState`, and the ones that leaned on the fixed opening
have to state the board they want instead of inheriting it.

### Vocabulary reminder for a cold reader (`CLAUDE.md`)

Planning documents and code say **ply**; `rules.md`, the UI and `README.md` say
**turn**. They are the same thing: everything one player does before play
passes, which in this game is one action. A **site** is one of the seventeen
fixed positions, always in exactly one of the states `active`, `charged` or
`dormant`; a **node** is precisely a site that is charged (code and plans say
**hub** only where a word for "a charged site" is needed as an identifier —
this story needs no such identifier). **Site**, **bay**, **action**, **round**
and **move** are the same word everywhere; **move** means the movement action
specifically and is never a synonym for a turn.

A site's single `level` field means different things per state (see
`SiteStatus` in `src/rules/gameState.ts`): pressure while active, drain while
charged, drain-left-to-recover while dormant.

### Settled decisions that are not to be re-opened

Fixed by the story before planning began. A step that finds one of these
inconvenient should still implement it, and say so in its Notes.

1. The rules edit goes first, in its own commit, ahead of any code — 0.17 →
   0.18, one changelog entry, `RULES_VERSION` bumped in the same commit. No
   tagging.
2. **The draw order is fixed and load-bearing**: five charged sites first
   (uniform, without replacement, pool walked in `SITES`' declared order), then
   one level draw per site walking `SITES` in declared order. **22 seed steps**
   before green's first turn. See **D4**.
3. **The two new tables carry the story's percentages unchanged.** They are
   first guesses to be play-tested; this story does not retune them, nor
   `NODE_CAPACITY`, `PRESSURE_CAP` or `TARGET_CHARGED_SITES`.
4. **The deal is unconstrained.** It may put four of the five nodes in one half
   of the board. A mirrored or balanced deal is explicitly out of scope.
5. **Nothing starts dormant.**
6. **No new UI.** `SiteMarker.tsx`, `Board.tsx` and the CSS are untouched: the
   marker already draws from `siteCyclePosition(state, level)`, so a dealt
   board renders correctly the moment it exists.
7. **No `Math.random`.** The deal draws from `state.randomSeed` and nowhere
   else (`CLAUDE.md`; lint enforces it in game code).
8. **No UI for choosing, showing or replaying a seed.** `src/game/seed.ts` is
   untouched.

---

## Where the work lands

| File                        | What happens to it                                                                                                                                    | Step    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `doc/ruleset/rules.md`      | §1, §8.1, §8.2, §8.3, Appendix B edited; version 0.17 → 0.18                                                                                          | 1       |
| `doc/ruleset/changelog.md`  | One new `## 0.18` entry at the top                                                                                                                    | 1       |
| `src/rules/rulesVersion.ts` | `RULES_VERSION` → `"0.18"`                                                                                                                            | 1       |
| `src/rules/sites.ts`        | Two new `WeightedAmount` tables (Step 2); new whole-board deal function (Step 3); `startingSiteStatus` and its two private constants deleted (Step 5) | 2, 3, 5 |
| `src/rules/gameState.ts`    | `startingGameState` calls the deal and stores the **advanced** seed; its documentation comment rewritten                                              | 5       |
| `README.md`                 | The status paragraph says every game deals a different opening board                                                                                  | 7       |

Tests touched, and by which step:

| Test file                        | Step(s) | Why                                                                                                                                           |
| -------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/rules/rulesVersion.test.ts` | 1       | Passes unchanged once version and changelog move together                                                                                     |
| `src/rules/sites.test.ts`        | 2, 3, 5 | The two new tables join the shared table `describe.each` (2); a new deal `describe` block (3); the `startingSiteStatus` block is deleted (5)  |
| `src/board/Board.test.tsx`       | 4       | Every board it inherits from `startingGameState` becomes a board it states; its four `startingSiteStatus` calls read the stated board instead |
| `src/rules/endOfTurn.test.ts`    | 4       | The "opening board does not fall into lockstep" case reads the charged squares from the state instead of a literal list                       |
| `src/game/session.test.ts`       | 4       | Two `randomSeed` literals become "the seed `startingGameState` produces for these arguments"                                                  |
| `src/rules/gameState.test.ts`    | 5       | The opening-position assertions are rewritten against the deal's guarantees                                                                   |
| `src/rules/seededReplay.test.ts` | 6       | Header comment; the dealt opening joins what a replay is proven to reproduce                                                                  |
| `src/rules/openingBoard.test.ts` | 6       | **New**: integration cover for a game played from a dealt board                                                                               |
| `src/rules/sitePool.test.ts`     | 6       | Comment only — its premise now varies per seed, and it already runs several seeds                                                             |
| `src/rules/fullGame.test.ts`     | —       | Must keep passing; no edit expected                                                                                                           |

Deliberately **not** touched:

- **`src/rules/chargeDraw.ts`, `endOfTurn.ts`, `energy.ts`, `random.ts`,
  `bays.ts`, `fleet.ts`, `board.ts`, `gameLength.ts`.** The deal changes the
  state the game starts in, not one rule about how it proceeds.
- **`src/game/seed.ts`, `src/game/session.ts`, `src/App.tsx`,
  `src/start/**`.** The seed still comes from `freshSeed()` and still reaches
  `startingGameState` the same way; the deal happens inside it.
- **Every rendering component and stylesheet** (decision 6 above).
- **`doc/plan/**` and pre-0.18 changelog entries.** Historical documents
  describe the game as it was.

### Accessibility (`CLAUDE.md`)

No plan step tests accessibility and no step spends work keeping an accessible
behaviour intact. Existing automated tests are updated where the path is
straightforward, which here it is (the tests state their board and their
literal expectations stand).

**No entry in `doc/plan/00000021-accessibility-tech-debt/known-issues.md` is
expected**, and the story says so explicitly: the deal introduces no new board
state, only new starting values for state that already exists, and the existing
note about pressure and cycle position not reaching assistive technology
already covers it. If an implementer nonetheless finds a real loss, record it
there in that document's existing per-story style and say so in the step's
Notes.

---

## Design decisions and reasoning

This section is the design record for the story. Code in this repository does
not carry design history (`CONTRIBUTING.md`, "Comments"), so everything a
future reader needs to know about **why** is written here and nowhere else.

### D1 — The rules change lands first, in one version bump

`CLAUDE.md` and `doc/guidelines/implementation-plan-guide.md` both require it:
`rules.md` is the single source of truth and the code implements it. Stories
27, 29, 31, 33, 37 and 41 all did this; it is the house pattern.

Between Step 1 and Step 5 the code is knowingly behind the document — the app
still opens on the fixed five while `rules.md` describes the deal. That window
is deliberate and no step should paper over it:

| After step | The app behaves like this                                                     |
| ---------- | ----------------------------------------------------------------------------- |
| 1          | 0.17 in full: the fixed opening                                               |
| 2–3        | Still the fixed opening; the tables and the deal exist and are tested, unused |
| 4          | Still the fixed opening; the tests no longer depend on it being fixed         |
| 5          | 0.18: every game deals its opening board                                      |

### D2 — `startingSiteStatus` becomes a whole-board deal

The current shape is `startingSiteStatus(square) -> {state, level} | undefined`:
one square in, no seed, an answer that does not depend on any other square. It
cannot express this story, for two independent reasons:

- **Without replacement.** Which five sites are charged is a joint draw. The
  fifth site's chance depends on the four already taken, so no per-square
  function can produce it.
- **No seed.** A per-square function with a seed argument would have to invent
  a per-square sub-stream, which is exactly the kind of parallel randomness the
  seeded-replay design exists to avoid.

So it is replaced by a function that deals the **whole board at once**: a seed
in; the seventeen statuses and the next seed out. It lives in
`src/rules/sites.ts`, next to the tables it draws from and the `SITES` list it
walks.

**Rejected: keeping `startingSiteStatus` alongside the deal** (for the tests
that use it as a convenience). It would leave two sources of truth for the
opening position, one of them a lie. The four call sites outside `sites.ts` are
all in `Board.test.tsx`, and all of them are better served by reading the board
the test itself states (**D9**).

**Rejected: putting the deal in `gameState.ts`.** `gameState.ts` assembles a
state out of parts other modules own — the fleet from `fleet.ts`, the length
from `gameLength.ts`. The tables, the cap, the capacity and the site list all
live in `sites.ts`, and so should the draw that reads them.

**Rejected: dealing above the rules layer** (in `src/game/session.ts` or
`App.tsx`). Then a state built by a test or a future engine would not be a
legal opening unless the caller remembered to deal one. `startingGameState`
stays the single entry point to a legal opening position.

### D3 — Shape of the deal's return value

The deal returns **the seventeen statuses keyed by square name, plus the next
seed** — the same key space as `GameState.siteStates`, so `startingGameState`
can use it directly.

The status value type is written structurally (`{ state: SiteState; level:
number }`), exactly as `startingSiteStatus` writes it today, **not** as
`SiteStatus`. This is a hard constraint, not a preference: `SiteStatus` is
declared in `gameState.ts`, which imports `sites.ts`. `sites.ts` importing
`SiteStatus` back would create an import cycle. The two shapes are structurally
identical, so the assignment in `startingGameState` needs no cast.

### D4 — The draw order, and why it is fixed

A recorded game replays by replaying the seed, so **every draw's position in
the stream is part of the ruleset**, not an implementation detail. The order
is:

1. **Five charged sites.** Start with a pool of all seventeen in `SITES`'
   declared order. Draw `TARGET_CHARGED_SITES` (5) times: each draw takes
   `drawIndex(seed, pool.length)` — uniform — removes the drawn site from the
   pool, and advances the seed. This is the shape `chargeDraw.ts` already uses
   for its pressure-weighted draw, with `drawIndex` in place of
   `drawWeightedIndex`.
2. **One level per site**, walking the seventeen in `SITES`' declared order.
   A site dealt charged draws its **drain** from the opening drain table; every
   other site draws its **pressure** from the opening pressure table. One
   `drawTableAmount` call each — seventeen calls, whatever the split.

Total: **5 + 17 = 22** seed steps, where today there are none.
`drawIndex` and `drawWeightedIndex` each advance the seed exactly once, so the
count is exact and is worth asserting directly (Step 3).

**Why uniform, not pressure-weighted, for the five.** Pressure means "how long
this site has been waiting to be charged" (§8.2). At the deal nothing has
waited for anything yet, and the sites that are dealt charged do not carry
pressure at all — they carry drain. Weighting the choice would require dealing
pressure first and then contradicting it by charging the sites with the most of
it, which reads backwards: a site that was just charged should have no pressure.

**Rejected: a Fisher–Yates shuffle of `SITES`, taking the first five.** It
consumes sixteen steps rather than five for the same information, and
introduces a shuffling idiom the codebase does not otherwise have.
`chargeDraw.ts`'s shrinking pool is the established pattern and should be the
one a reader recognises.

**Rejected: interleaving** (draw a site, immediately draw its drain, repeat).
Then which table the *n*th draw reads depends on the outcome of an earlier
draw, so the stream is far harder to reason about when a recorded game is being
diffed. Pool-first also matches the order §8.1 states the deal in.

### D5 — `startingGameState` stores the advanced seed

After dealing, the seed is 22 steps along. The new state carries **that** seed,
so the first turn of the game continues the stream rather than restarting it.

**Rejected: keeping the caller's seed on the state** and letting the deal run
on a copy. Two things would then read the same 22 values — the deal, and the
game's first draws — which is precisely the correlation the single-stream
design forbids. It would also make "the seed this game was played from"
ambiguous when game recording arrives.

The visible consequence is that `startingGameState(SEED).randomSeed !== SEED`.
Three existing assertions state the old identity and are updated (Steps 4 and
5). Nothing in the app reads `state.randomSeed` for anything but the next draw.

### D6 — The two tables, and where their numbers come from

Both are `WeightedAmount` tables in `sites.ts`, written with the same
whole-number percentages the rules tables show, so document and code can be
read side by side — the convention the three existing tables already follow.

**Opening drain** (a dealt node's starting drain, against a capacity of 60):

| Drain | 0   | 5   | 10  | 15  | 20  | 25  | 30  | 35  | 40  |
| ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Share | 20% | 18% | 15% | 12% | 10% | 8%  | 7%  | 6%  | 4%  |

Weights sum to 100; the weighted average is exactly **14**. The cap of 40 is
two-thirds of capacity, and it is there so that no dealt node is thrown away:
a ship needs two or three turns to get out of a bay and onto a site, and the
deepest dealt node still has 20 capacity left — about 9 empty turns, or 4 held
ones.

**Opening pressure** (every other site's starting pressure, against a cap of
50):

| Pressure | 1   | 5   | 10  | 15  | 20  | 25  | 30  | 40  | 50  |
| -------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Share    | 24% | 20% | 16% | 12% | 9%  | 7%  | 5%  | 4%  | 3%  |

Weights sum to 100; the weighted average is exactly **12.79**. The owner's
decision at the plan gate is that **rules.md prints 12.79**, not the rounded
12.8 the story drafted: §8's other tables print their averages exactly (2.1,
4.6, 6), and the document should stay literally true. So the rules table, this
plan and `sites.test.ts` all carry **12.79** — there is no rounded figure
anywhere, and `toBeCloseTo(…, 5)` compares against the same number the
document prints.

Both tables are first guesses (decision 3). Their job is to be one obvious
table each.

### D7 — What the deal does **not** change

`STARTING_PRESSURE` (1) stays: it is what a site goes active at **during**
play, when it finishes recovering (§8.2, §8.6 step 6). The deal is the one
exception to it, and the rules say so by pointing §8.2 at §8.1 rather than
repeating the table.

`TARGET_CHARGED_SITES` (5) is reused as the number of sites the deal charges —
they are the same five (§8.1), and having the deal invent its own constant
would let the two drift.

The deal does not depend on fleet size or game length, so
`startingGameState(SEED, anyLength, anyFleetSize)` deals the same seventeen
statuses for the same seed.

### D8 — Three kinds of test, and what happens to each

About fifty tests call `startingGameState`. They divide cleanly:

- **Tests that override `siteStates` wholesale** (most of `endOfTurn.test.ts`,
  `camping.test.ts`, `energy.test.ts`, `chargeDraw.test.ts`,
  `combat.test.ts`, `movement.test.ts`, `actions.test.ts`, the HUD tests…).
  **Unaffected** — they never saw the opening board.
- **Tests that assert the opening itself** — `sites.test.ts`'s
  `startingSiteStatus` block and `gameState.test.ts`'s opening block. These are
  rewritten against the properties the deal guarantees (Steps 3 and 5).
- **Tests that quietly relied on a particular site being charged or active
  while testing something else** — `Board.test.tsx` throughout,
  `endOfTurn.test.ts`'s lockstep case, `session.test.ts`'s two seed literals.
  Each is made to **state the board (or the seed) it wants** (Step 4).

Step 4 does that statement work **while the fixed opening is still in force**,
so it is a pure refactor with the whole suite green on both sides of it. Only
Step 5 changes behaviour, and by then nothing but the deliberate opening
assertions depends on the old board.

### D9 — `Board.test.tsx` states its board; no shared helper is added

`Board.test.tsx` is the only file with a real cluster of opening-dependent
expectations (literal accessible names like `"H8, charged site"` and
`"E5, charged site"`, the "five charged and twelve active" count, the
site-marker sweep). It gets **one local constant**: a hand-written record of
the seventeen sites with H8, E5, K5, E11 and K11 charged at drain 0 and the
other twelve active at pressure 1 — the board the file has always been written
against, now said out loud instead of inherited.

The story allows a shared helper "if the plan finds enough call sites to
justify one". It does not: one file needs it. A cross-file fixture module would
also quietly become a second definition of "the opening board", which is the
thing this story is removing. **Rejected.**

### D10 — Where the new tests live

- **`sites.test.ts`** — the two tables (they join the existing shared
  `describe.each` that checks outcomes, weight totals, averages and observed
  frequencies) and the deal's own properties, including the 22-step count.
- **`gameState.test.ts`** — that the state carries a dealt board and the
  advanced seed.
- **`openingBoard.test.ts`** (new) — the integration properties that need a
  board and a run: a game from a dealt board plays to completion, the first
  charge draw favours the sites dealt the most pressure, and a node dealt at
  drain 40 runs out sooner than one dealt at drain 0.
- **`seededReplay.test.ts`** — the dealt opening joins what a replay
  reproduces.

`sitePool.test.ts` needs no new test. It was measured against a prototype of
this deal while planning: across its three seeds and 500 plies, the board holds
at exactly five charged every ply, the active pool never drops below 7 (its
floor is 4), multi-expiry plies stay at or under 2% (its bound is 10%), no ply
expires more than 2 nodes (its bound is 4), every site is charged at least 3
times (its floor is 2) and the longest gap between charges is 261 plies (its
bound is 400). It should pass unchanged.

### D11 — Balance is out of scope, and that is a decision, not an oversight

The deal can put four of the five nodes in one half of the board. Accepted: the
fleets are symmetric and alternate around the whole edge, so neither player is
far from any region, and the board tops itself back up within a few turns of
any node running out. A constrained or mirrored deal is a possible later story.

---

## Step 1 — Rules 0.18: the opening board is dealt

Status: committed

Notes: Edited `doc/ruleset/rules.md` (version line, §1, §8.1's opening
paragraph replaced with the deal and both tables, §8.2 and §8.3 each gained a
pointer back to §8.1, Appendix B gained the steady-state line), added one
`## 0.18` changelog entry, and bumped `RULES_VERSION` to `"0.18"`. Per the
orchestrator's notes: the pressure table's average is printed as the exact
**12.79** throughout (no rounded 12.8), and the `story.md` prettier
reformatting was already done and committed in an earlier commit, so it was
not redone here — `git status --short` shows only the three files this step
was scoped to touch. `npm test` (779 passed), `npm run typecheck`,
`npm run lint` and `npm run format:check` all pass; the `grep` checks for
"H8**, **E5" and "E11" outside §3.2 return nothing.

Edit `doc/ruleset/rules.md`, add **one** `doc/ruleset/changelog.md` entry, and
bump `RULES_VERSION` in `src/rules/rulesVersion.ts` to `"0.18"`. **No
behaviour changes in this step** — no file under `src/` other than
`rulesVersion.ts` is touched. See **D1**. **Do not tag anything**
(`CLAUDE.md`: tagging is on hold until the game plays).

Read the whole of §8 before editing; its subsections cross-reference each
other. **No section is renumbered**, and nothing is added or removed at section
level.

### The version line

`**Rules version: 0.17**` becomes `**Rules version: 0.18**`.

### §1 Overview — three random elements become four

The sentence "The game has three random elements: which site is charged next,
which bays the two ships in a fight are pushed back to, and how fast a node
burns." gains the fourth: **the opening board itself**. Add a short sentence in
the overview's plain voice saying that no two games start the same board, and
that neither player has seen this one before. Keep the paragraph's length and
tone — it is a tour, not a rules summary.

### §8.1 — the opening position is dealt, not fixed

Replace the paragraph beginning "**At the start of the game**, five sites are
charged: **H8**, **E5**, **K5**, **E11** and **K11**, all at drain 0" with the
deal, stated in this order (which is also the order the code draws in, **D4**):

- **Five of the seventeen sites are charged**, chosen at random with every site
  equally likely and no two the same. No site is privileged; the centre is not
  guaranteed.
- **Each of the five starts part-drained**, at a drain drawn from the opening
  drain table below — never more than 40, two-thirds of the capacity of 60
  (§8.3), so every dealt node has enough life left to be worth racing for.
- **Every other site starts active**, at a pressure drawn from the opening
  pressure table below, rather than at 1 (§8.2).
- **Nothing is dormant at the start.** That sentence stays, unchanged in
  substance.

Then the two tables, in the same style as §8.2's and §8.3's:

| Drain | 0   | 5   | 10  | 15  | 20  | 25  | 30  | 35  | 40  | Average |
| ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- |
| Share | 20% | 18% | 15% | 12% | 10% | 8%  | 7%  | 6%  | 4%  | 14      |

| Pressure | 1   | 5   | 10  | 15  | 20  | 25  | 30  | 40  | 50  | Average |
| -------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- |
| Share    | 24% | 20% | 16% | 12% | 9%  | 7%  | 5%  | 4%  | 3%  | 12.79   |

Carry both tables through **exactly** as printed here (decision 3, **D6**). Say,
in a sentence each, what they are for: an average opening node has 46 of its
capacity left, about 22 turns empty or 10 held, and the most-used one has 20
left; and most sites have waited only a little, but the tail means a game can
open with one or two already close to the cap, which are the sites the first
charge draw will favour.

Keep the paragraph that follows today ("Nothing needs to spread their expiries
out by hand…") but **re-argue** it: the five now open at different ages as well
as draining at independently drawn rates, so they are spread apart from the
first turn rather than spreading within the first few.

"The board **aims** to keep five sites charged at all times…" is unchanged.

### §8.2 — stop contradicting the deal

§8.2 says an active site "goes active at **1**". That stays true of every site
that goes active **during** the game. Add a short clause or sentence noting the
one exception — the opening deal, which starts each active site at a pressure
drawn in §8.1 — and **point at §8.1 rather than repeating the table**.
Everything else in §8.2 (the pressure-weighted draw, the cap of 50, dormant
recovery) is unchanged.

### §8.3 — the same pointer for drain

"A charged node has a **capacity** of 60 units and a **drain** that starts at
0" gains the same exception: during play a node starts at 0; the nodes the
opening deal starts with are already part-drained (§8.1). Do not repeat the
table. Nothing else in §8.3 moves — the two drain distributions, the empty and
held lives, and the single way a node ends are all unchanged.

### Appendix B — one line about the opening

Appendix B's sizing argument is about the steady state and holds unchanged. Add
a line noting that the deal starts the board **closer to** that steady state
than the fixed opening did, so the first twenty turns are no longer an
unrepresentative settling-in period. Do not restate the tables and do not
change any of its numbers.

### §2, §3.2 and everything else

Check §2's "Drain" and "Pressure" entries read correctly against the deal —
they describe what the numbers mean, not what they start at, so they are
expected to need **no** edit; leave them alone unless one actually contradicts
§8.1. §3.2 (the site layout), §8.4, §8.5, §8.6 and §9 are unaffected: the deal
changes the state the game starts in, not a rule about how it proceeds.

### One piece of housekeeping that belongs in this commit

`npm run format:check` **already fails on `main`** for this branch's
`doc/plan/00000044-randomized-node-start/story.md`, which was committed
unformatted. Run `npx prettier --write doc/plan/00000044-randomized-node-start/`
as part of this step and include the reflowed `story.md` in the commit, saying
so in the Notes. It carries no rule content, so this is a formatting fix picked
up alongside the step, not a change to the story. Story 41's step 1 did exactly
the same thing. Without it, every later step's `format:check` verification
fails for a reason that has nothing to do with the step.

### The changelog

One new `## 0.18` entry at the top of `doc/ruleset/changelog.md`, in the style
of the existing entries: what changed, why (the opening was the one part of the
game with no randomness in it, and a fixed opening is not what the board looks
like at any other moment), and the note that tagging stays on hold. Say
explicitly that both tables are first guesses to be play-tested.

Depends on: nothing.

Verification (automated): `npm test` passes in full (779 tests today) —
`src/rules/rulesVersion.test.ts` reads the version out of `rules.md` and out of
the changelog and is what proves the three moved together. `npm run typecheck`,
`npm run lint` and `npm run format:check` pass. `grep -n "H8\*\*, \*\*E5"
doc/ruleset/rules.md` and `grep -n "E11" doc/ruleset/rules.md` return nothing
outside §3.2's site table and diagram — the fixed five are no longer named as
the opening anywhere. `git status --short` shows only the three intended files.

---

## Step 2 — The two opening tables in `sites.ts`

Status: committed

Notes: Added `OPENING_DRAIN_TABLE` and `OPENING_PRESSURE_TABLE` to
`src/rules/sites.ts`, placed directly above `EMPTY_NODE_DRAIN_TABLE` so all
five tables sit together, with the exact percentages from D6 (drain average
14, pressure average 12.79). Extended `sites.test.ts`'s shared
`describe.each` with both tables (outcomes, weight-sum-to-100, average,
20,000-draw frequency check) and added a small new `describe` block
asserting no opening drain outcome exceeds two-thirds of `NODE_CAPACITY` and
the largest still leaves 20 capacity. Nothing consumes the tables yet, as
specified. No deviation from the plan. `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` (788 passed, up from 779) all pass.

Add the **opening drain table** and the **opening pressure table** to
`src/rules/sites.ts` as exported `WeightedAmount` tables, beside the three that
are already there (`EMPTY_NODE_DRAIN_TABLE`, `HELD_NODE_DRAIN_TABLE`,
`DORMANT_RECOVERY_TABLE`) and in the same style: whole-number percentage
weights matching the rules tables exactly, a documentation comment naming the
rules section (§8.1) and stating the weighted average. Use the numbers in
**D6**. Nothing consumes them yet — this step is scaffolding, deliberately
separated from the deal that uses it.

Name them for what they are (the opening drain and the opening pressure of a
dealt site) and keep them adjacent to the existing three so a reader meets all
five tables in one place.

Extend `src/rules/sites.test.ts`'s existing shared `describe.each` — the one
that already checks each table's outcomes, that its weights sum to 100, that
its weighted average matches the rules table, and that 20,000 draws land only
on the listed outcomes at frequencies within ±0.03 of their weights — with the
two new tables:

- opening drain: outcomes `[0, 5, 10, 15, 20, 25, 30, 35, 40]`, average `14`;
- opening pressure: outcomes `[1, 5, 10, 15, 20, 25, 30, 40, 50]`, average
  **`12.79`** — see **D6**: the rules table prints 12.79 too, and the shared
  test compares to five decimal places.

Add one assertion (either in the shared block or beside it) that no opening
drain outcome exceeds two-thirds of `NODE_CAPACITY`, and that the largest
leaves at least 20 capacity — this is the story's "every dealt node is worth
reaching" guarantee, expressed where the number lives.

Depends on: Step 1 (the tables implement §8.1 as written there).

Verification (automated): `npm test` passes, with the two new tables' cases
green — the frequency case is the one that proves the weights are read the way
the document means them. `npm run typecheck`, `npm run lint`,
`npm run format:check` pass.

---

## Step 3 — The whole-board deal, in `sites.ts`

Status: committed

Notes: Added `dealOpeningBoard(seed)` to `src/rules/sites.ts`, returning a
tuple of `[siteStates, nextSeed]` (structural `{ state: SiteState; level:
number }` values, per D3 — no import from `gameState.ts`), placed just above
the existing `OPENING_CHARGED_SQUARES` constant. It draws five sites
uniformly without replacement via `drawIndex` over a pool seeded from `SITES`
in declared order, then walks `SITES` once more calling `drawTableAmount`
against the drain or pressure table per site — 22 seed steps total, exactly
as D4 specifies. Added a `describe("dealing the opening board …")` block to
`sites.test.ts` covering shape, table membership, the two-thirds cap,
determinism, a distinct-seed pair, the exact 22-step seed advance (checked
against 22 chained `mulberry32` calls), and a combined 20,000-deal loop
checking both the per-site charge share (±0.02 of 5/17) and the two tables'
draw frequencies (±0.03 of their weights). Nothing calls the deal outside
the new tests; `startingSiteStatus` and `startingGameState` are untouched.
`npm run typecheck`, `npm run lint` and `npm run format:check` all pass;
`npm test` rose from 788 to 795 (7 new cases), with no existing test
changed. No deviation from the plan.

Add to `src/rules/sites.ts` a function that deals a whole opening board: it
takes a seed and returns the seventeen site statuses keyed by square name
(`squareName`), plus the next seed. See **D2** for why this replaces a
per-square function and **D3** for the return shape — in particular, the status
value type is written structurally (`{ state: SiteState; level: number }`) and
`sites.ts` must **not** import `SiteStatus` from `gameState.ts`, which would
create an import cycle.

The draw order is **D4**, and it is fixed:

1. Draw `TARGET_CHARGED_SITES` sites, one at a time, from a pool that starts as
   all of `SITES` in declared order. Each draw is `drawIndex(seed,
pool.length)` — uniform, since at the deal no site has any pressure to
   weight by — removes the drawn site from the pool, and advances the seed.
   `chargeDraw.ts`'s `runChargeDraw` is the model for the shrinking pool.
2. Walk `SITES` in declared order. For each site, one `drawTableAmount` call:
   the opening drain table if it was drawn charged, the opening pressure table
   otherwise. The amount becomes that site's `level`; its state is `charged` or
   `active` accordingly.

Exactly 22 seed steps, and no site is dealt `dormant`.

Do **not** wire it into `startingGameState` yet — that is Step 5, and keeping
it separate is what lets this step be verified on its own with the app's
behaviour unchanged. `startingSiteStatus` stays where it is for now.

Give the function a documentation comment that states the draw order, the
22-step count and the reason the order must not change (a recorded game
replays by replaying the seed).

Add a `describe` block to `src/rules/sites.test.ts` covering:

- **Shape**: exactly the seventeen site names as keys, five `charged`, twelve
  `active`, none `dormant`.
- **Values**: every charged `level` is one of the opening drain table's
  amounts, every active `level` is one of the opening pressure table's amounts.
- **The cap**: no charged `level` exceeds two-thirds of `NODE_CAPACITY`, so
  every dealt node has at least 20 capacity left.
- **Determinism**: the same seed produces an equal record and an equal next
  seed; two different seeds produce different boards (pick a pair, confirm it
  by running, and note in a comment — as `seededReplay.test.ts` already does —
  that any other distinct pair is expected to work and this one is simply
  confirmed).
- **The seed advances by exactly 22 steps**: compare the returned next seed
  against 22 iterations of `mulberry32` from the input seed. This is the guard
  on the draw order's step count; if a later story changes the order it should
  fail here first.
- **Uniformity over many deals**: deal 20,000 boards, chaining each deal's next
  seed into the following one, and confirm every one of the seventeen sites is
  charged in a share close to 5/17 ≈ 0.294. A prototype of exactly this
  measured a minimum share of 0.2892 and a maximum of 0.2983, so a tolerance of
  ±0.02 is comfortable.
- **Distribution over many deals**: over the same run, the dealt drains and the
  dealt pressures land on their tables' amounts at frequencies within ±0.03 of
  their weights.

The 20,000-deal loops run in well under a second (measured); keep them in one
loop rather than three if that reads better.

Depends on: Step 2 (the tables it draws from).

Verification (automated): `npm test` passes, including the new `describe`
block; the rest of the suite is untouched because nothing calls the deal yet
(the test count rises, no existing test changes). `npm run typecheck`,
`npm run lint`, `npm run format:check` pass.

---

## Step 4 — The tests state the board they want (no behaviour change)

Status: committed

Notes: `Board.test.tsx` gained the hand-transcribed `STATED_SITE_STATES`
record and a `statedOpeningState()` helper (D9); the module-level
`startingSession`, the "renders from the game state it is given" case, the
`baseState()` helper and the "keeps focus on the attacked square" case all
build from it now, its four `startingSiteStatus` calls became lookups into
the record, and the `startingSiteStatus` import was dropped. The two named
comments plus the similarly-worded one in the "renders from the game state
it is given" case were reworded to say the file states the board rather than
inherits it. `endOfTurn.test.ts`'s lockstep case now reads its charged
squares from the state it starts from (`SITES.map(squareName).filter(...)`)
instead of a literal list. `session.test.ts`'s two seed-literal assertions
now compare against `startingGameState(...).randomSeed` for the same
arguments, per D5. Left untouched, as scoped: the "selection markings" state,
the attack-state helpers, and the "energy overlay composition" case, none of
which read any site's charged/active status. `npm test` (795, unchanged),
`npm run typecheck`, `npm run lint` and `npm run format:check` all pass
(prettier reformatted `endOfTurn.test.ts`'s edited block); `grep -rn
"startingSiteStatus" src/` returns hits only in `src/rules/sites.ts`,
`src/rules/sites.test.ts` and `src/rules/gameState.ts` (Step 5's territory,
untouched here). No deviation from the plan.

**Nothing about the game changes in this step.** The fixed opening is still in
force; every test still passes; the point is to remove the _assumption_ that it
is fixed, so Step 5 can change it without a wall of failures. See **D8**.

Three files quietly depend on the opening while testing something else:

### `src/board/Board.test.tsx`

Introduce one local constant (**D9**): a hand-written record of the seventeen
sites, with **H8, E5, K5, E11 and K11** `charged` at level 0 and the other
twelve `active` at level 1 — the board this file has always been written
against, now stated rather than inherited. Transcribe it literally from
`rules.md` §3.2's site table; do not build it by calling production code.

Then:

- Build the module-level `startingSession` from a state that uses this record
  for `siteStates` (the ships, seed, ply and length still come from
  `startingGameState(TEST_SEED)`). Every literal accessible-name expectation in
  the file — `"H8, charged site"`, `"E5, charged site"`, `"B4, active site"`,
  the "five charged and twelve active, none dormant" counts, the seventeen
  site markers — then keeps its current meaning.
- Do the same for every other `startingGameState(TEST_SEED)` in the file that
  is used as a board: the "renders from the game state it is given" case (which
  expects `"H8, charged site, green ship, power 4 of 4"`), the `baseState()`
  helper in the interaction block, and the attack case that already overrides
  H8 to `active` because a ship on a charged node can neither attack nor be
  attacked (§7). A small local helper returning the stated opening state is the
  tidiest way to avoid repeating the spread; keep it in this file.
- Replace the file's four `startingSiteStatus(square)` calls (used to build
  expected labels) with a lookup into the stated record. Delete the import once
  it is unused — `startingSiteStatus` itself is deleted in Step 5, and this
  file must not be the thing that keeps it alive.
- Update the two comments that assert the fixed opening as a fact — "H8 is the
  centre square and one of the five sites the opening board starts charged" and
  "H8 starts charged under this seed" — to say that this test states the board
  it renders.

### `src/rules/endOfTurn.test.ts`

The case "does not run all five opening nodes out on the same ply" hard-codes
`["H8", "E5", "K5", "E11", "K11"]`. Change it to read the charged squares out
of the state it starts from (walk `SITES` and keep those whose status is
`charged`), so it follows whatever board the opening produces. The rest of the
case — five seeds, 60 plies, first run-out ply per node, "not all on the same
ply" — is unchanged. Update its comment to say the opening nodes are whichever
ones the game opened with.

### `src/game/session.test.ts`

Two cases assert `result.state.randomSeed` is the literal seed the `new-game`
intent carried (42, and 9). After Step 5 the state carries the seed the deal
advanced to (**D5**). Rewrite both to assert the reducer produced the state
`startingGameState` produces for those same arguments — comparing against
`startingGameState(42, 100, DEFAULT_FLEET_SIZE).randomSeed` (and the 9/30 case
likewise) keeps the point of the test ("the reducer honours the seed it is
given rather than drawing its own") and passes both before and after Step 5.
The neighbouring case that asserts two different seeds give different states is
already correct and stays.

Do not touch any other test file: everything else either overrides `siteStates`
wholesale or does not look at the board at all.

Depends on: Step 3 only for ordering (this step could stand alone; it is
sequenced here so Step 5 is a small, readable diff).

Verification (automated): `npm test` passes with the **same number of tests as
before this step** and no test skipped — the whole point is that nothing about
behaviour moved. `npm run typecheck`, `npm run lint`, `npm run format:check`
pass. `grep -rn "startingSiteStatus" src/` returns hits only in
`src/rules/sites.ts` and `src/rules/sites.test.ts`.

---

## Step 5 — `startingGameState` deals the board

Status: committed

Notes: `gameState.ts`'s `startingGameState` now calls `dealOpeningBoard(randomSeed)`
after argument validation, storing the returned `siteStates` and the deal's
advanced seed as `state.randomSeed` (D5); its documentation comment was
rewritten to describe the dealt opening and to say the seed argument is what
the deal starts from, not what the first turn draws from. Deleted
`startingSiteStatus`, `OPENING_CHARGED_SQUARES`, `OPENING_CHARGED_SQUARE_NAMES`
and `SITE_NAMES` from `sites.ts`; deleted `sites.test.ts`'s "starting site
status" `describe` block and its now-unused import. Rewrote
`gameState.test.ts`'s opening assertions against `dealOpeningBoard`'s own
output for the same seed (exact `siteStates` equality, the advanced-seed
identity and its inequality with the input seed, the 5/12/0 state counts,
every level drawn from the matching table, same-seed/different-seed
determinism); left every non-site case in that file untouched. Confirmed
(not rewritten) that `sitePool.test.ts`, `fullGame.test.ts`,
`seededReplay.test.ts` and `endOfTurn.test.ts` all still pass unchanged — no
bound needed widening. `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` (793 passed, down from 795: sites.test.ts
lost 4 cases, gameState.test.ts gained 2) all pass. `grep -rn
"startingSiteStatus\|OPENING_CHARGED" src/` returns nothing. No deviation from
the plan.

The behaviour change. In `src/rules/gameState.ts`, `startingGameState` stops
walking `SITES` calling `startingSiteStatus` and instead calls the deal from
Step 3 once, with the seed it was given:

- the dealt record becomes `siteStates`;
- the deal's **next seed** becomes `state.randomSeed` (**D5**);
- argument validation (`lengthInRounds`, `fleetSize`) still runs **first**, so
  an invalid call throws before any draw happens;
- everything else about the state — ships, side to move, actions remaining,
  ply 1, both energies at 0, the length — is unchanged.

Rewrite `startingGameState`'s documentation comment: it currently describes
"five sites charged at drain 0, the rest active at pressure 1 — see
`startingSiteStatus`". It should describe the dealt opening, say that the seed
argument is the seed the **deal** starts from and that the state carries the
seed the deal left behind, and keep the existing notes about the seed being
required, the length being fixed for the game's lifetime, and the fleet size
not being stored.

Then delete the dead opening from `src/rules/sites.ts`: `startingSiteStatus`,
the private `OPENING_CHARGED_SQUARES`, `OPENING_CHARGED_SQUARE_NAMES` and
`SITE_NAMES` constants if nothing else uses them. Keep `STARTING_PRESSURE`,
`TARGET_CHARGED_SITES`, `NODE_CAPACITY`, `PRESSURE_CAP` and
`siteCyclePosition` (**D7**). Update `sites.ts`'s module header comment if it
still describes a fixed opening.

Delete `sites.test.ts`'s "starting site status (rules.md §8.1)" `describe`
block — all four of its cases are now either meaningless (the fixed five) or
covered by Step 3's deal block (five charged, twelve active at their drawn
levels, none dormant, exactly the seventeen sites and nothing else).

Rewrite `gameState.test.ts`'s opening assertions against the deal's guarantees:

- the state's `siteStates` is exactly what the deal returns for that seed, and
  `state.randomSeed` is the deal's advanced seed — and **not** the seed passed
  in;
- seventeen statuses: five `charged`, twelve `active`, none `dormant`;
- every charged `level` is one of the opening drain table's amounts and every
  active `level` one of the opening pressure table's amounts;
- the same seed produces the same board, and a chosen different seed produces a
  different one;
- a non-site square still has no state and no status;
- the dealt board does not depend on the length or the fleet size — the same
  seed with a different length or fleet size deals the same seventeen statuses
  (**D7**). The existing "takes a given length, changing nothing else about the
  state" case already asserts this indirectly and should keep passing
  unchanged.

Keep every non-site case in that file (ships, energy, defaults, `RangeError`s)
as it is.

Confirm — do not rewrite — that `sitePool.test.ts`, `fullGame.test.ts`,
`seededReplay.test.ts` and `endOfTurn.test.ts` still pass. A prototype of this
deal was run against `sitePool.test.ts`'s bounds while planning and cleared all
of them with wide margins (**D10**). If a bound does fail on a particular seed,
prefer widening the bound or changing that test's seed over changing the deal,
and record the choice in this step's Notes.

Depends on: Steps 3 (the deal) and 4 (the tests no longer assume the fixed
opening).

Verification (automated): `npm test` passes in full, including
`sitePool.test.ts`, `fullGame.test.ts` and `seededReplay.test.ts` unchanged.
`npm run typecheck`, `npm run lint`, `npm run format:check` pass.
`grep -rn "startingSiteStatus\|OPENING_CHARGED" src/` returns nothing.

---

## Step 6 — Integration cover: a game played from a dealt board

Status: pending

Cover the story's remaining verification points, which need a board and a run
rather than a single draw. Add `src/rules/openingBoard.test.ts` with a short
module comment saying what it exists for, and extend
`src/rules/seededReplay.test.ts`.

### `src/rules/openingBoard.test.ts` (new)

1. **A game from a dealt board runs to completion.** Over a handful of seeds,
   drive the end-of-turn sequence (as `sitePool.test.ts` does) for a few
   hundred plies from `startingGameState(seed, …)` and confirm the economy
   works from wherever the deal put it: every dealt node eventually runs out,
   dormant sites recover, the charge draw tops the board back up to five, and
   every one of the seventeen sites is charged at least once over the run.
2. **The first charge draw favours the sites dealt the most pressure.** Take a
   dealt board, make room for one draw (set one dealt node `dormant`, leaving
   four charged), and run the charge draw. Over many seeds, the site drawn is
   far more often from the half of the pool dealt the higher pressure than from
   the lower half, and **at least one** draw in the sample picks a site dealt
   pressure 1 — pressure is never below 1, so no active site is ever excluded
   outright (§8.2). Use `runChargeDraw` directly rather than playing turns, so
   the property is tested without a policy in the way.
3. **A node dealt at drain 40 runs out sooner than one dealt at drain 0.**
   Hand-state two boards that differ only in one node's dealt drain, run empty
   end-of-turns with no ship anywhere, and compare the ply the node runs out
   on, averaged over several seeds. The empty drain table averages 2.1 a turn,
   so expect about **29** plies from drain 0 and about **10** from drain 40;
   assert generous bounds around those (they are the margin the tables imply,
   not a target to tune to).

### `src/rules/seededReplay.test.ts`

- Update the module header comment: the seeded stream now starts **before**
  green's first turn — the opening deal consumes 22 steps (five site draws and
  seventeen level draws) ahead of ply 1 — so the recorded expectations of what
  a game produces from a given seed all sit 22 steps further along than they
  did under 0.17.
- Have the played-game record carry the **opening board** (each site's dealt
  state and level) alongside the bay returns and charged sites it already
  records, and assert that two runs from the same seed deal the same opening,
  and that the two different seeds already used deal different openings. This
  is the story's "a recorded game still replays exactly" property, now
  including the part of the game that happens before the first turn.
- Re-run the file and confirm its existing non-vacuity guards (at least ten
  fights, ten bay returns, ten charge draws in a forty-round game) still hold
  from a dealt opening. If a guard has become vacuous or a chosen seed pair has
  stopped diverging, re-record it against the new draw order — the property
  being guarded is that the same seed produces the same game, and that is
  exactly as true after this change. Record any re-recording in the Notes.

Depends on: Step 5 (the deal is live).

Verification (automated): `npm test` passes with the new file and the extended
replay cases green. `npm run typecheck`, `npm run lint`, `npm run format:check`
pass. The new cases are non-vacuous: the run-to-completion case observes at
least one expiry, one recovery and one charge per seed, and the pressure case's
sample includes at least one draw of a site dealt pressure 1.

---

## Step 7 — `README.md`, and a sweep for the fixed opening

Status: pending

`README.md` is player-facing (`CLAUDE.md`, Intended audience). Its status
paragraph describes how nodes behave but says nothing about how the board
opens; after this story, "every game deals a different board" is one of the
first things a player notices.

Run `/update-readme` (`.claude/commands/update-readme.md`) to review the branch
diff and update `README.md`. Whatever it produces, the result must say, in the
paragraph's existing voice and without lengthening it much:

- every game **deals a different opening board** — five of the seventeen sites
  are lit at the start, chosen at random, and where they are changes from game
  to game;
- the lit ones do not all start fresh: each opens part-way through its life, so
  some will run out sooner than others;
- the sites that are not lit have not all been waiting the same time either,
  which is why some of them look bigger and warmer than others from the very
  first turn.

Do **not** restate the tables or the percentages: the README is a tour, not a
rules summary.

Then sweep the repository for anything still claiming a fixed opening —
`grep -rn "E11\|K11" README.md src/ doc/ruleset/` and a read of any comment
mentioning "the opening board", "starts charged" or "the five opening sites" —
and fix what the sweep finds, in this commit. Do **not** edit `doc/plan/**` or
`doc/ruleset/changelog.md`'s pre-0.18 entries: those describe the game as it
was and stay as written.

Confirm, and state in the Notes, that no entry is needed in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` (see the
Accessibility note above) — or add one if the sweep turns up a real loss.

Depends on: Steps 1 to 6.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass. `grep -rn "E11" README.md src/` returns
nothing; `grep -rn "E11" doc/ruleset/rules.md` returns only §3.2's site table
and board diagram. A read-through of `README.md` confirms no sentence says the
board opens the same way every time.

---

## Step 8 — Owner play-through

Status: pending

The owner plays the app and confirms the story's player-facing verification
list. This is the story's manual gate and the only step the pipeline pauses for
a person on.

Run `npm run dev` in the dev container and open the app. Press PLAY at the
default settings (seven ships a side, thirty rounds), then return to the start
screen with "New Game" and press PLAY again, several times.

Confirm, in the app:

1. **Every game opens on a different board.** Across several fresh games, the
   five lit nodes are in different places; they are not H8, E5, K5, E11 and
   K11 every time, and the centre is not always lit.
2. **The opening always has exactly five lit nodes and twelve unlit sites**,
   seventeen markers in all, and **nothing dark/dormant at the start**.
3. **The lit nodes open at visibly different stages of burn** — their glow is
   not identical across the five, and some are visibly further through their
   life than others from turn 1.
4. **The unlit sites open at visibly different sizes and warmths** — one or two
   look close to lighting while others look freshly cycled.
5. **The first few turns feel different game to game** — which nodes are worth
   racing for changes, rather than being the same five squares every time.
6. **A game plays normally from a dealt board**: nodes run out (including,
   sometimes, quite early), sites go dark and recover, the board tops itself
   back up to five, energy accrues, and the announcements read correctly
   throughout.
7. **A whole game still finishes** — play or fast-forward to the end and
   confirm the result panel and the return to the start screen still work.
8. **Nothing on screen contradicts `doc/ruleset/rules.md` at 0.18.**

Depends on: Steps 1 to 7.

Verification (manual): the owner confirms each of the eight observations above
in the running app and reports anything that reads wrong, looks wrong, or
contradicts `doc/ruleset/rules.md` at 0.18.
