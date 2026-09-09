# Implementation Plan — Story 00000072, A chosen number of charged nodes

## What this story does

Today the board keeps **four** nodes charged, and that four is a fact about
the game: `rules.md` states it in a dozen places and `src/rules/nodes.ts`
states it once, as `TARGET_CHARGED_NODES`. This story turns it into a
**choice made before play begins** — **five or four, five the standard
game** — carried on the game state the way the length in rounds already is,
chosen in a fourth option group on the start screen sitting between Ships
and Rounds.

Because five becomes the default, the standard game changes: a board that
has dealt four charged nodes since version 0.21 now deals five, so the
opening board is **eight** nodes (five charged, three inactive) at five and
**seven** at four. Nothing else about a node changes — the same three
inactive nodes with priorities 1, 2 and 3, the same placement constraints,
the same countdown lengths, the same energy rule.

Two smaller things ride along:

- The HUD's **score pips** are re-cut to the **smaller of a side's ship
  count and the game's charged-node count** — the most that side could ever
  hold at once. This is a display change only; no rule describes the pips.
- The Clock group's **`Unlimited`** label becomes **`UNLIMITED`**. Nothing
  else on the start screen changes typographically.

`story.md` in this folder is the owner's full statement of the change and of
why the number is becoming a choice. This plan does not repeat that
argument; it says how to get there, in what order, and records the decisions
this plan makes, because code in this repository deliberately carries no
design history (`CONTRIBUTING.md`, "Comments").

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say. Do not mix them (`CLAUDE.md`, Vocabulary).
- **Node** is the word everywhere — code, tests and player-facing text — for
  a board position running `inactive` → `charged` → `depleted` → ends.
- **Move** means the movement action specifically, one ship changing
  squares. It is never a synonym for a ply or a turn.
- **Charged-node count** is this story's subject: how many nodes the board
  keeps charged. `README.md`'s player voice says "lit"; the rules and the
  code say "charged".

## Settled decisions — do not reopen

These come from `story.md` and from the owner's discussion while it was
written. A step that finds one inconvenient should escalate, not re-decide.

- **S1.** The offered counts are **5 and 4 only**, in that order (largest
  first, leftmost the default, exactly as Ships does). Three, six and a free
  number are out of scope, and nothing is built to make them easy later.
- **S2.** **Five is the default** everywhere a default is reached for: the
  rules document's standard game, the start screen's initial selection, and
  the count `startingGameState` falls back to.
- **S3.** The count is **fixed for a game's lifetime**, set once when the
  game starts, exactly as `lengthInRounds` is.
- **S4.** `TARGET_CHARGED_NODES` is **deleted**. No module-level constant
  may state the target any more, because there is no longer one answer to
  state.
- **S5.** The **three inactive nodes stay three** at both counts, with the
  same priorities, rotation, sweep and refill. Appendix B's argument for
  three never depended on the target: at most one countdown starts per turn,
  so at most one node expires, plus at most one a player walks off — never
  more than two.
- **S6.** Nothing else is retuned against five: not the countdown lengths,
  not the placement weighting or constraints, not the game lengths, not the
  fleet sizes. Appendix B is **re-measured, not re-fitted**.
- **S7.** The **pip row** is `min(the side's ship count, the game's
charged-node count)`. Derived **per side** from the state `ScoreDisplay`
  already receives — both sides always have the same fleet size (§4), so the
  rows match, but the fact lives on the side. Nothing is drawn in the space a
  shorter row leaves: a row of three is three pips and nothing else.
- **S8.** `--region-extent` is **not re-derived** for the wider five-pip
  row. Only the comments that reason from a four-pip row are corrected. If
  the wider row actually breaks the landscape layout at the floor end of the
  clamp, that is a **finding to raise with the owner**, not a silent retune.
- **S9.** Only `Unlimited` → `UNLIMITED` changes on the start screen. The
  `6s` / `4s` / `2s` labels keep their lowercase `s` — the owner's decision,
  confirmed while the story was written. This is not a typographic pass.
- **S10.** This is a **gameplay change**: `doc/ruleset/rules.md` bumps
  **0.29 → 0.30**, with a `doc/ruleset/changelog.md` entry and
  `RULES_VERSION` in `src/rules/rulesVersion.ts` updated to match, in its
  own commit ahead of the code. There is **one** version bump on this
  branch: the later rules edit this plan schedules (Appendix B's re-measured
  figures, Step 9) folds into the same 0.30 entry, never a second bump.
  **Tagging stays on hold** (`CLAUDE.md`) — bump and write the entry, do not
  run `/tag-rules`.
- **S11.** **No backwards compatibility** for games recorded under 0.29
  (`CLAUDE.md`). At five charged the opening deal consumes one more seed
  step, so a given seed deals a different board; that is expected and is not
  worked around.
- **S12.** Per `CLAUDE.md`'s pre-release stance: **no plan steps for testing
  accessibility**, and no review fixtures or manual test scripts — the owner
  drives manual testing himself. Where an existing automated test has a
  straightforward path to being updated, update it. Anything knowingly lost
  goes as a note in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`; none is
  expected here.

## Decisions this plan makes

The story explicitly leaves some of these open; the rest are choices a cold
reader would otherwise have to make twice.

- **D1. The offered counts live in `src/rules/nodes.ts`,** alongside
  `NodeState` and `dealOpeningBoard`, exactly where `TARGET_CHARGED_NODES`
  lives today. The names mirror `fleet.ts`: type `ChargedNodeCount`,
  `CHARGED_NODE_COUNTS`, `DEFAULT_CHARGED_NODE_COUNT`, `isChargedNodeCount`.
  _Rejected:_ a new `chargedNodeCount.ts` module mirroring `gameLength.ts`.
  `gameLength.ts` exists because it also owns round arithmetic
  (`roundForPly`, `isGameOver`, `gameResult`); a module holding three
  constants and a type guard and nothing else would be thinner than anything
  else in `src/rules/`, and `nodes.ts` is the node module the way `fleet.ts`
  is the fleet module. The start screen importing an option list from
  `rules/nodes` is the same shape as it importing `FLEET_SIZES` from
  `rules/fleet`, which also exports far more than that list.

- **D2. `ChargedNodeCount` is the literal union `4 | 5`,** with a type guard
  in `isFleetSize`'s shape — **not** `gameLength.ts`'s looser "any positive
  whole number" treatment. `isGameLengthRounds` is loose because the rules
  layer must keep accepting the three-round games the test suite builds;
  nothing needs a board charged to seven, and S1 puts other counts out of
  scope, so the narrow type is free and catches a bad literal at compile
  time.

- **D3. `startingGameState` takes an options object** —
  `startingGameState(randomSeed, options?)` with `lengthInRounds`,
  `fleetSize` and (from Step 4) `chargedNodeCount` all optional inside it —
  rather than growing a fourth optional positional parameter. The story
  asked for a moment's thought here, and the deciding argument is a real
  hazard rather than taste: with four positional parameters, three of them
  bare `number`s, `startingGameState(seed, 30, 5, 4)` and
  `startingGameState(seed, 30, 4, 5)` both typecheck and both pass
  validation — 4 and 5 are legal fleet sizes _and_ legal charged-node counts
  — and the transposed one silently deals a different game. There is no
  compiler or runtime check that can catch it; a named field is the only
  thing that can. The seed stays positional: it is required, it is the
  subject of the call, and every one of the ~72 call sites passes it.
  _Cost, accepted:_ the ~40 call sites that pass more than a seed change
  shape. That churn is isolated in its own step (Step 3) so it never mixes
  with a behaviour change.
  _Rejected:_ moving the seed into the options object too (it is required,
  and making it optional-looking would be worse); and keeping positional
  parameters with a comment warning about the order (a comment is not a
  guard).

- **D4. `dealOpeningBoard` takes the count as a required third positional
  parameter.** It has exactly one production caller and a handful of test
  callers, and a required parameter means the compiler names every one of
  them. It is not given a default: a deal that quietly falls back to five
  would hide a plumbing mistake.

- **D5. The `new-game` intent carries the count as a required field,** like
  `fleetSize` and `lengthInRounds`. The reducer uses what it is handed and
  reaches for no default of its own, so the app's chosen options are the
  only thing that can start a game.

- **D6. The default flips to five in the same step that plumbs the count
  through (Step 4),** with all the fallout — regenerated long-run
  measurements, corrected seed-step comments — in that step.
  _Rejected:_ introducing `DEFAULT_CHARGED_NODE_COUNT` as 4 first so the
  plumbing step is behaviour-preserving, then flipping it to 5 in a step of
  its own. That would isolate the risky flip nicely, but it would put a
  constant in the code that contradicts the ruleset committed one step
  earlier, for two commits, with a comment that would have to be wrong to be
  consistent. A short-lived lie in the code is worse than a large-ish step.

- **D7. `ScoreDisplay` gains no new prop.** It already receives the whole
  `GameState`, which carries both the ships and (from Step 4) the count, so
  the pip row is derived where it is drawn. This keeps `Hud.tsx` out of the
  change entirely.

- **D8. Appendix B is written in two passes on one version bump.** Step 1
  cannot state figures measured at five charged, because no code deals five
  charged until Step 4. So Step 1 rewrites all of Appendix B's prose and
  attributes its existing measured figures to a four-charged board — true,
  and not a claim about a board the app no longer produces — and Step 9
  replaces them with figures measured at both counts once Step 8 has
  measured them. One entry in `changelog.md`, one version, two commits
  (S10).

- **D9. The long-run economy test runs at both counts.** `nodePool.test.ts`
  is the app's only instrument for Appendix B's figures, so it is the thing
  that gets parameterised, and its tuned floors and bands are re-checked at
  five. The whole suite currently runs in about 58 seconds and those long-run
  files account for about 8 of them, so doubling their work is affordable;
  if a doubled run proves slower than that suggests, the four-charged pass
  may use a shorter seed list, with the reason recorded in the step's Notes.

## Where "four" is written down

The implementer does not have to go looking. This is the complete inventory,
taken from the branch as it stands.

**Documents**

- `doc/ruleset/rules.md` — the version line (line 3); §2's **Node** entry
  ("always carries **four** charged nodes"); §8.1 (the "keeps four nodes
  charged" paragraph and the whole "opening board is dealt" list, which says
  **seven** nodes and **four** charged); §8.2's opening shortfall sentence;
  §8.3's "exactly like any other shortfall against four charged"; §8.4's
  "never charges more than four nodes at once"; §8.6 step 4; §10's
  "Alongside the fleet size and the number of rounds"; Appendix B's opening
  sentence, its "never short of four charged" paragraph, and its "What the
  app guards" paragraph ("the opening deal's seven").
- `README.md` — the start-screen description (a choice of ships, rounds and
  clock), the opening-board paragraph ("it opens with seven nodes — four
  already lit and three still waiting… all four are exactly as fresh as each
  other"), and "back to four lit nodes by the time your turn begins".
- `doc/ruleset/changelog.md` — historical entries mention four. Those are a
  **record** and are never rewritten (`CONTRIBUTING.md`); only the new 0.30
  entry is added.

**Production code**

- `src/rules/nodes.ts` — `TARGET_CHARGED_NODES`, the module header, and
  `dealOpeningBoard`'s doc comment (draw order, "4 + 4 = 8 seed steps",
  "seven node statuses").
- `src/rules/charging.ts` — the import, the module header, `runCharging`'s
  doc comment and the shortfall arithmetic.
- `src/rules/gameState.ts` — `GameState`, `startingGameState`'s signature,
  validation and doc comment (which also carries a **stale** claim that "the
  deal consumes 12 steps"; it is 8 today and becomes 9 at five charged).
- `src/rules/endOfTurn.ts` — the step 4 comment ("shortfall against four
  charged").
- `src/rules/nodePlacement.ts` — a doc comment mentioning "the opening deal
  for its four charged squares".
- `src/hud/ScoreDisplay.tsx` — the `TARGET_CHARGED_NODES` import, the pip
  row's length, and `SCORE_DIGITS`' comment.
- `src/App.css` — the landscape sizing comment ("A four-pip row draws about
  `0.61P`… so the widest things in the column are now the title and the turn
  indicator, at roughly `0.72P`").
- `src/hud/ScoreDisplay.css` — the landscape pip-row comment, which points
  at `App.css` "for what is now the widest thing in the column".
- `src/game/session.ts` — `SessionIntent`'s `new-game` and its doc comment.
- `src/useAppScreen.ts` — the "three options" header and state.
- `src/start/StartScreen.tsx` — the three groups, the "three options"
  comment, and `CLOCK_SETTING_LABELS.none`.

**Tests naming the count or building a `GameState` by hand**

- Import `TARGET_CHARGED_NODES`: `src/rules/nodes.test.ts`,
  `src/rules/charging.test.ts`, `src/rules/endOfTurn.test.ts`,
  `src/rules/nodePool.test.ts`, `src/rules/openingBoard.test.ts`.
- Assert eight seed steps: `src/rules/nodes.test.ts` ("advances the seed by
  exactly 8 steps"), and `src/rules/seededReplay.test.ts`'s header comment.
- Build a `GameState` literal (58 sites across 23 files, almost always
  inside a single `buildState`-style helper per file — the compiler will
  name every one once the new field is required):
  `src/board/Board.test.tsx`, `src/board/EnergyOverlay.test.tsx`,
  `src/board/announcements.test.ts`, `src/clock/ClockRegion.test.tsx`,
  `src/clock/useGameClock.test.tsx`, `src/game/session.test.ts`,
  `src/hud/GameOverPanel.test.tsx`, `src/hud/ScoreDisplay.test.tsx`,
  `src/hud/TurnIndicator.test.tsx`, `src/rules/actions.test.ts`,
  `src/rules/camping.test.ts`, `src/rules/charging.test.ts`,
  `src/rules/combat.test.ts`, `src/rules/endOfTurn.test.ts`,
  `src/rules/energy.test.ts`, `src/rules/fullGame.test.ts`,
  `src/rules/gameLength.test.ts`, `src/rules/movement.test.ts`,
  `src/rules/openingBoard.test.ts`, `src/rules/ply.test.ts`,
  `src/rules/recovery.test.ts`, `src/rules/relief.test.ts`,
  `src/rules/trap.test.ts`.
- Query a start-screen radio by an ambiguous accessible name (see Step 7):
  `src/start/StartScreen.test.tsx` and `src/App.test.tsx` both use
  `getByRole("radio", { name: "5" })` and `{ name: "4" }` for **fleet
  sizes**. Once the Charged nodes group exists, those names match two radios
  each and the queries throw.

## Steps

### Step 1 — `rules.md` 0.29 → 0.30: the count becomes a choice

Status: committed

Rewrite `doc/ruleset/rules.md` so that no section states a charged-node
count as a fact about the board, bump its version line to **0.30**, set
`RULES_VERSION` in `src/rules/rulesVersion.ts` to `"0.30"`, and add one
`doc/ruleset/changelog.md` entry at the top (newest first). This is the
whole of the commit: no `src/` change beyond the version constant.

Phrase the count the way §4 and §9 already phrase a choice — defined once,
referred back to everywhere else:

- **§2, the Node entry.** The board carries the **chosen number** of charged
  nodes — five or four — and three inactive ones, plus however many happen
  to be depleted.
- **§8.1** is where the choice is **defined**, since this is where a node's
  states and the opening board live: **five or four charged nodes, chosen
  before play begins, five the standard game**. The "keeps four nodes
  charged at all times" paragraph and the shortfall sentence both state
  themselves against that number. The opening board is **eight nodes at
  five, seven at four**: the charged ones drawn under §3.2 at random, each
  at baseline with no countdown, the other three inactive by the refill
  procedure with priorities 1, 2 and 3 dealt at random, nothing depleted.
- **§8.2.** The shortfall is against the chosen number. The three inactive
  nodes, their priorities, the rotation, the sweep-and-refill and the refill
  procedure are all unchanged — and the section should now say plainly that
  the **queue's size is unrelated to the target**: three covers the largest
  shortfall a single turn can produce, which is two, at either count
  (Appendix B).
- **§8.3.** "exactly like any other shortfall against four charged" becomes
  the chosen number.
- **§8.4.** "The board never charges more than four nodes at once" becomes
  the chosen number. The collection rule itself — one energy per charged
  node held, nothing subtracted — is untouched.
- **§8.6 step 4.** The shortfall is against the chosen number.
- **§9 and §10.** Where they list what is chosen before play, the
  charged-node count joins the fleet size, the rounds and the clock. §10's
  opening sentence ("Alongside the fleet size and the number of rounds…") is
  the natural place to name the full set. §9 states the rounds choice for
  its own purposes; add the count only if the sentence genuinely enumerates
  the pre-play choices, and leave it alone if it does not.
- **Appendix B.** Its opening sentence becomes the chosen number and three
  inactive; the **"never short"** argument stands as written (it never
  depended on the target) restated against the chosen number; "the opening
  deal's seven" in "What the app guards" becomes eight or seven, and "back
  at four charged by the end of every turn" becomes the chosen number.
  Its **measured** figures — the node count breathing between seven and
  eleven, the pool sizes 25/38/34, the trio's mean smallest gap of 4.78
  against 3.78 unweighted, the mean turns between refills — are quoted from
  the app's own long-run test **at four charged**, and no code deals five
  charged yet, so in this step they are left at their current values and
  **attributed explicitly to a four-charged board**. Step 9 replaces them
  with figures measured at both counts. Do not guess a five-charged figure
  here (D8).

The changelog entry is titled for the change (for example
`## 0.30 — a chosen number of charged nodes`), says it is a gameplay change
and that tagging stays on hold, and covers: the choice and its two values,
five as the standard game (a change from four since 0.21), the opening deal
at eight and seven, the shortfall now measured against the chosen number,
the queue staying at three at both counts and why, and Appendix B being
re-measured. Step 9 will extend this same entry rather than adding another
(S10).

Between this step and Step 4 the code deals four while the document says
five is standard. That is the normal consequence of the rules document
leading the code and is resolved in Step 4.

Depends on: nothing. It comes first because the following steps implement
this document.

**Notes:** Rewrote §2's Node entry, §8.1 (definition of the choice, the
"keeps N charged" paragraph, and the opening-deal list, now eight nodes at
five / seven at four), §8.2 (shortfall sentence plus a new paragraph stating
plainly that the queue's size is unrelated to the target), §8.3's leaving
shortfall, §8.4's collection cap, §8.6 step 4, and §10's opening sentence
(added the charged-node count to the enumerated pre-play choices; left §9
alone since it only names the rounds choice and does not enumerate the
others). Appendix B's prose is restated against "the chosen number" per D8,
with every measured figure (node-count range, pool sizes 25/38/34, the 4.78
vs 3.78 spread) left at its current value and explicitly labelled "at four
charged" rather than guessed at for five; Step 9 will replace these once
Step 8 re-measures them. Bumped the version line to 0.30, set
`RULES_VERSION` to `"0.30"` in `src/rules/rulesVersion.ts`, and added one
`## 0.30` changelog entry at the top. No `src/` change beyond the version
constant. Verification: `npm test` (1040 tests, all green, including
`rulesVersion.test.ts`), `npm run format:check` (clean), `npm run typecheck`
(clean), `npm run lint` (clean), and the specified grep returns only
sentences naming the five-or-four choice, the opening deal's two sizes, or
Appendix B figures explicitly attributed to a four-charged board. No
deviation from the step as written.

Verification (automated): Run `npm test` — `src/rules/rulesVersion.test.ts`
asserts the constant and the document agree, so it fails if either half of
the bump is missed; the rest of the suite must stay green, since no
behaviour changed. Run `npm run format:check` (Prettier formats Markdown).
Then confirm by search that no remaining sentence states a count as a fact:
`grep -n "four charged\|four nodes\|five charged\|five nodes"
doc/ruleset/rules.md` should return only sentences that name the choice
("five or four"), the opening deal's two sizes, or Appendix B's figures
explicitly labelled as measured at four charged.

### Step 2 — The offered counts, the default and the guard

Status: committed

Add to `src/rules/nodes.ts`, in the shape `fleet.ts` uses for fleet sizes
(D1, D2):

- a `ChargedNodeCount` type: the literal union of the two offered counts;
- `CHARGED_NODE_COUNTS`, the offered counts **in start-screen order**:
  largest first, so the leftmost choice is the default game — the same
  convention `FLEET_SIZES` follows and for the same reason;
- `DEFAULT_CHARGED_NODE_COUNT`, **five**, §8.1's standard game;
- `isChargedNodeCount`, a type-guard predicate over `number`.

Nothing consumes them yet, and `TARGET_CHARGED_NODES` stays where it is —
Step 4 deletes it. Update the module header so it says what the module now
owns (the three node states, the offered charged-node counts, and the
opening deal) without carrying any design history (`CONTRIBUTING.md`).

Add a small describe block to `src/rules/nodes.test.ts` covering the three
exports: the list is exactly the two counts in that order, the default is
five and is a member of the list, and the guard accepts 4 and 5 and rejects
3, 6, 0, a non-integer and `NaN`.

Depends on: Step 1 (the document these constants implement).

Verification (automated): Run `npm test`, `npm run typecheck` and
`npm run lint` — all green, with the new block in `nodes.test.ts` passing.
No existing test's expectations change in this step; if one does, something
has been wired up early.

**Notes:** Added `ChargedNodeCount`, `CHARGED_NODE_COUNTS` (`[5, 4]`),
`DEFAULT_CHARGED_NODE_COUNT` (5) and `isChargedNodeCount` to `nodes.ts`, in
`fleet.ts`'s shape, immediately after `TARGET_CHARGED_NODES`, which is left
untouched (Step 4 deletes it). Updated the module header to mention the
offered counts alongside the node states and the opening deal. Added a
`describe("the offered charged-node counts (rules.md §8.1)")` block to
`nodes.test.ts` asserting the list order, the default and its membership,
and the guard's accept/reject cases (4, 5 accepted; 3, 6, 0, 4.5, `NaN`
rejected). Verification: `npm test` (59 files, 1049 tests, all green — up
from 1040 at Step 1's commit, with no existing expectation changed),
`npm run typecheck` (clean), `npm run lint` (clean), `npm run format:check`
(clean after `prettier --write` on the two touched files). No deviation from
the step as written.

### Step 3 — `startingGameState` takes an options object

Status: pending

A pure refactor with **no behaviour change** (D3). Change
`startingGameState`'s signature from
`(randomSeed, lengthInRounds?, fleetSize?)` to `(randomSeed, options?)`,
where the options object carries optional `lengthInRounds` and `fleetSize`
with today's defaults and today's `RangeError` messages. Export the options
interface from `src/rules/gameState.ts` so tests and future callers can name
it. Update its doc comment to describe the object rather than the trailing
parameters; leave the rest of the comment (what the seed means, why the
fleet is built before the deal) intact, and fix its stale claim that the
deal "consumes 12 steps" — it consumes 8 today.

Update every call site that passes more than a seed. As of this branch that
is about 40 sites, all in tests except `src/game/session.ts`'s `new-game`
branch; the ~32 sites that pass only a seed do not change. The compiler
finds all of them.

Depends on: Step 2 only for ordering (both touch the rules layer); nothing
in this step uses the new constants. It comes before Step 4 so that the
call-shape churn lands in a commit of its own, separate from the behaviour
change (implementation-plan guide: separate scaffolding from behaviour).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green with **no test
expectation edited**: the only test changes in this step are the shape of
`startingGameState` calls. `git diff` should show no change to any expected
value, count or seed.

### Step 4 — The count becomes part of the game state, and five becomes the standard game

Status: pending

The substantive change. In `src/rules/`:

- **`GameState` gains `chargedNodeCount`**, typed `ChargedNodeCount`, with a
  doc comment in `lengthInRounds`' style: fixed for the game's lifetime once
  set by `startingGameState`, and **stored rather than derived** — a board
  that is legitimately one node short in the middle of the end-of-turn
  sequence would derive the wrong answer, which is why this cannot follow
  the fleet-size precedent of being read back off the board.
- **`startingGameState`'s options gain `chargedNodeCount`**, defaulting to
  `DEFAULT_CHARGED_NODE_COUNT` (five), validated with `isChargedNodeCount`
  and throwing a `RangeError` naming the offered counts when it is anything
  else — exactly as the fleet-size check does. It is passed to the deal and
  stored on the returned state.
- **`dealOpeningBoard` takes the count as a required third parameter** (D4)
  and draws that many charged squares. Its documented draw order is
  otherwise unchanged: the charged squares one at a time by
  `drawNodeSquare`, then **one** `refillQueue` call for the three inactive
  ones. Correct the doc comment's arithmetic: the deal consumes
  `count + 4` seed steps — **nine** at five charged, eight at four — and it
  deals eight node statuses at five, seven at four.
- **`runCharging` measures its shortfall against `state.chargedNodeCount`**
  and the `TARGET_CHARGED_NODES` import goes. Its module header and doc
  comment stop naming a constant; the "shortfall can never exceed two"
  reasoning stays, because it never depended on the target (S5).
- **`TARGET_CHARGED_NODES` is deleted** from `nodes.ts` (S4).
- Correct the comments that state four as a fact: `endOfTurn.ts`'s step 4
  comment, `nodePlacement.ts`'s "the opening deal for its four charged
  squares", and `gameState.ts`'s deal description.

In `src/hud/ScoreDisplay.tsx`, replace the deleted constant with
`state.chargedNodeCount` so the file compiles. This is an **interim** state:
Step 5 re-cuts the row to `min(ship count, count)` and is where the pip
rule's own tests live. Do not implement the `min` here.

Test work, all of it in this step because the whole suite must be green
before the commit:

- Every hand-built `GameState` literal gains the new field (inventory
  above). Almost every file funnels through one helper, so this is usually
  one line per file; use `DEFAULT_CHARGED_NODE_COUNT` unless the test is
  about the count.
- `src/rules/nodes.test.ts`: drop the `expect(TARGET_CHARGED_NODES).toBe(4)`
  test (Step 2's block covers the offered counts); pass a count to
  `dealOpeningBoard` and assert the deal at **both** counts — five charged
  and three inactive, four charged and three inactive, nothing depleted, and
  every square legal under §3.2 in both cases. The "advances the seed by
  exactly 8 steps" test becomes **nine steps at five and eight at four**.
- `src/rules/charging.test.ts`: build states carrying their own
  `chargedNodeCount` and assert the shortfall is measured against it, at
  **both** counts — including the cases that today read
  `TARGET_CHARGED_NODES - 1`, and the "charges nothing when the board is
  already full" case at five.
- `src/rules/endOfTurn.test.ts` and `src/rules/openingBoard.test.ts`:
  replace `TARGET_CHARGED_NODES` with the state's own count. Their fixtures
  stay at the default; running them at both counts is Step 8.
- `src/rules/nodePool.test.ts`: replace `TARGET_CHARGED_NODES` with the
  state's own count so the file passes at five. Its **tuned** bounds —
  `MINIMUM_TOTAL_NODES` / `MAXIMUM_TOTAL_NODES`, `MINIMUM_MEAN_REFILL_GAP`,
  `MINIMUM_SPREAD_ADVANTAGE`, and the refill-cadence band — may now fail,
  because the board carries one more charged node. If one does, widen it to
  the newly **measured** range with margin, never to whatever makes it pass,
  and say in the comment what was measured and at which count. Record the
  measured numbers in this step's Notes: Step 8 re-measures properly and
  Step 9 writes them into Appendix B.
- `src/rules/seededReplay.test.ts`: its determinism assertions compare two
  runs of the same seed against each other, so they need no regeneration —
  but its **header comment** (the deal "consumes 8 steps") and its
  **not-vacuous floors** (fight count, planet returns, charges, retirements,
  refills, each with a comment quoting a measured figure) are stated from
  measurements at four charged. Re-measure them at five, update the
  comments to the new figures, and keep the floors below the measurement
  with margin as they are today.
- `src/rules/fullGame.test.ts` and `src/game/session.test.ts`: green at the
  new default; expectations that quote a node count adjust to what a
  five-charged board produces.

Depends on: Steps 2 and 3 (the constants and the options object this step
threads the count through).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green. Then confirm the
behaviour directly with a short improvised script (or a scratch test) that
calls `startingGameState` twice: with no count it deals **eight** nodes,
five `charged` at level 0 and three `inactive` at priorities 1, 2 and 3; with
`chargedNodeCount: 4` it deals **seven**, four charged and three inactive;
and with `chargedNodeCount: 3` it throws a `RangeError`. Delete the script
afterwards — it is a check, not an artifact.

### Step 5 — The pip row is re-cut, and the comments that reasoned from four

Status: pending

In `src/hud/ScoreDisplay.tsx`, draw as many pips as the side could ever hold
at once: the **smaller of that side's ship count and
`state.chargedNodeCount`** (S7, D7). The ship count comes from the state's
own ships, counted for this side. Nothing about a pip's size, colour,
spacing or lighting rule changes, and nothing is drawn in the space a
shorter row leaves.

Correct the comments that reason from four:

- `SCORE_DIGITS`' comment in the same file: a turn now pays at most the
  **chosen** number of charged nodes, so a long game's total still tops out
  in the hundreds and four digits stays for the fixed-width readout.
- `src/App.css`'s landscape sizing comment. Its arithmetic today: at
  `font-size: calc(var(--region-extent) * 0.175)`, a row of _n_ pips is
  `n × 0.6em + (n − 1) × 0.35em` wide, so four pips are `3.45em ≈ 0.61P` and
  the title and turn indicator, at roughly `0.72P`, are the widest things in
  the column. **Five pips are `4.4em ≈ 0.77P`**, which is wider than either,
  so the comment's conclusion is now false and must say so plainly: the pip
  row can be the widest thing in the column, and `--region-extent` is
  deliberately **not** re-derived for it (S8) — the column is back to
  roughly the content width it was sized for before version 0.21.
- `src/hud/ScoreDisplay.css`'s landscape comment, which points at `App.css`
  "for what is now the widest thing in the column", follows the same
  correction.

In `src/hud/ScoreDisplay.test.tsx`: the existing "renders four pips" test
becomes a set covering the rule — **five** pips at six ships and five nodes,
**four** at six ships and four nodes, **three** at three ships whichever
count the game was dealt with — and the lighting assertions keep their
current meaning. Note that the file's `buildState` helper defaults to **no
ships**, which now draws **zero** pips; every pip-counting test must supply
a fleet, and the tests that only check lighting or the hidden sentence need
enough ships for the pips they expect to be lit.

Depends on: Step 4 (`state.chargedNodeCount` must exist, and this step
replaces the interim row length left there).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green, with
`ScoreDisplay.test.tsx` proving the row length is the smaller of the two
numbers in each of the three cases and that a pip lights per charged node
held. The visual check of the wider row is Step 10's.

### Step 6 — The `new-game` intent and the app's screen state carry the count

Status: pending

- `src/game/session.ts`: `SessionIntent`'s `new-game` gains a required
  `chargedNodeCount` field of type `ChargedNodeCount` (D5), and
  `sessionReducer` hands it to `startingGameState` alongside the seed, the
  length and the fleet size. The reducer reaches for **no default of its
  own**. Update the intent's doc comment to name the fourth thing it
  carries.
- `src/useAppScreen.ts`: hold `chargedNodeCount` (initially
  `DEFAULT_CHARGED_NODE_COUNT`) and expose `setChargedNodeCount` alongside
  the existing options; include it in `handlePlay`'s dispatched intent;
  leave it untouched by `handleReturnToStart`, so a second game starts from
  the same choices. The module header and the hook's doc comment say
  **four** options now, not three.
- `src/App.tsx` does not change yet — it cannot pass the option to
  `StartScreen` until Step 7 gives it a prop.

Tests: `src/game/session.test.ts`'s `new-game` intents gain the field, plus
a case proving a chosen 4 produces a state with `chargedNodeCount` 4 and a
four-charged opening board; `src/useAppScreen.test.tsx` asserts the default
is 5, that PLAY dispatches whatever was chosen, and that returning to the
start screen leaves the choice set.

Depends on: Steps 2 and 4 (the type, and the state field the intent feeds).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green, with
`session.test.ts` and `useAppScreen.test.tsx` covering the default, a chosen
4 reaching the game state, and the choice surviving a return to the start
screen.

### Step 7 — The start screen's fourth group, and `UNLIMITED`

Status: pending

- `src/start/StartScreen.tsx` gains `chargedNodeCount` and
  `onChargedNodeCountChange` props and a fourth `fieldset`, **between Ships
  and Rounds**, with the legend **Charged nodes** (the stylesheet uppercases
  it), rendering `CHARGED_NODE_COUNTS` through the same `OptionChoice` the
  other three groups use, with its own `useId` group name and **no new
  styling**. Update the component's "three options" comments to four.
- In the same file, `CLOCK_SETTING_LABELS.none` becomes `UNLIMITED`. The
  `6s` / `4s` / `2s` labels are left exactly as they are (S9).
- `src/App.tsx` passes the new value and handler from `useAppScreen`
  straight through, as it does for the other three.

Tests:

- `src/start/StartScreen.test.tsx`: the new group renders its two values
  with 5 checked by default; the four groups appear in the order **Ships,
  Charged nodes, Rounds, Clock** (assert on the rendered order of the
  fieldsets/legends, not just their presence); choosing 4 calls the new
  handler once and none of the others; the clock group's label reads
  `UNLIMITED` (the file's own mirror of `CLOCK_SETTING_LABELS` updates too).
- **Ambiguous queries must be scoped.** `StartScreen.test.tsx` and
  `src/App.test.tsx` both select fleet-size radios by accessible name —
  `getByRole("radio", { name: "5" })` and `{ name: "4" }` — and both names
  now match two radios each (a fleet size and a charged-node count). Scope
  every such query to its group with `within(screen.getByRole("group", {
name: "Ships" }))` (or the Charged nodes group, as appropriate). This is a
  test-query fix, not a rename of the labels: both groups legitimately offer
  a "4" and a "5".
- `src/App.test.tsx`: the opening assertion becomes **four** option groups
  at their defaults — 6 ships, 5 charged nodes, 30 rounds, `UNLIMITED` — and
  a game started with the count set to 4 shows a board with four charged
  nodes.

Depends on: Step 6 (the app state and the intent the screen feeds) and
Step 2 (the offered counts).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green, with
`StartScreen.test.tsx` proving the group's position, options and default and
the `UNLIMITED` label, and `App.test.tsx` proving a chosen 4 reaches a real
game. The look of the screen is Step 10's.

### Step 8 — The long-run economy at both counts, and the figures re-measured

Status: pending

Make the long-run tests exercise both counts, and take the measurements
Appendix B needs (D9).

- `src/rules/nodePool.test.ts`: give `runEconomy` (and the helpers that
  build a starting state) a charged-node count, and run each of the file's
  suites at **five and four**. The invariants must hold at both: exactly
  three inactive nodes carrying 1, 2 and 3 at every ply; the board back at
  its own count after every turn and never above it; at most one node
  running out and at most two charging in a single turn; every placement
  legal under §3.2 from the right pool; and the weighted trio measurably
  more spread than an unweighted draw from the same pools.
- Re-check every tuned constant in that file at both counts —
  `MINIMUM_TOTAL_NODES` / `MAXIMUM_TOTAL_NODES`,
  `MINIMUM_MEAN_REFILL_GAP`, `MINIMUM_SPREAD_ADVANTAGE`,
  `MINIMUM_MEAN_PLIES_BETWEEN_REFILLS` / `MAXIMUM_MEAN_PLIES_BETWEEN_REFILLS`
  — and retune only where a measurement demands it, keeping the same margin
  philosophy the current comments describe (S6: re-measured, not re-fitted).
  Each comment states the figure it was measured against and at which count.
- `src/rules/openingBoard.test.ts` and `src/rules/fullGame.test.ts` run
  their games at both counts too, by threading a count through the helper
  each already has for the fleet size.
- **Take the measurements Appendix B quotes**, at both counts, with
  temporary instrumentation: the board's total node count (minimum, maximum
  and mean), the three refill draws' pool sizes (the file already computes
  the very pools it needs for its unweighted comparison), the weighted and
  unweighted mean smallest pairwise gap, the mean turns between refills, and
  whether §3.2's fallback ever fired. Log them, run the file, **record every
  number in this step's Notes**, then remove the logging before committing.
  Nothing temporary is committed.

If the doubled long-run work makes the suite noticeably slower than the ~58
seconds it takes today, the four-charged pass may run on a shorter seed
list; say so in the Notes.

Depends on: Steps 4 and 5 (a board that can be dealt at either count).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green, with the long-run
suites passing at both counts. The step is not done until the measured
figures listed above are written into its Notes, because Step 9 is written
from them.

### Step 9 — Appendix B re-stated at both counts

Status: pending

Replace Appendix B's measured figures with the numbers Step 8 recorded
(D8). Same version, same changelog entry — extend the 0.30 entry in place if
it needs a line about the re-measurement; **do not** bump the version again
or add a second entry (S10).

- State the figures **at five charged**, saying how four differs, or state
  both — whichever reads better for each figure. What matters is that **no
  figure claims a number the board no longer produces, and none is
  invented**: anything Step 8 could not measure from the existing test is
  re-stated as the approximation it is rather than guessed at.
- The figures in question: the node count's band and where in it the count
  usually sits; the three refill draws' pool sizes; the trio's mean smallest
  pairwise gap, weighted against unweighted; the mean turns between refills;
  the edge/corner figures, if Step 8 measured them (if it did not, say
  plainly that they were measured at four charged and are expected to move
  only slightly, rather than restating them as five-charged figures).
- The paragraph explaining that these are a **ceiling**, produced by a
  stand-in driver that starts a countdown every turn, stays and still
  applies at both counts.
- "What the app guards" now names both counts and the eight-or-seven opening
  deal, and says the guards run at both.
- The **"never short"** argument and the **queue-sizing** argument are
  already correct from Step 1; check them once more against the wording
  Step 8's work confirmed and leave them alone if they still read true.

Depends on: Step 8 (the measurements) and Step 1 (the rest of the appendix's
prose).

Verification (automated): Run `npm test` (`rulesVersion.test.ts` still
agrees at 0.30) and `npm run format:check`. Then confirm every figure in
Appendix B either appears in Step 8's Notes or is explicitly labelled as an
approximation measured at four charged, and that `doc/ruleset/changelog.md`
still has exactly **one** 0.30 entry.

### Step 10 — The owner plays it

Status: pending

The manual gate. The owner runs `npm run dev` and confirms:

1. The start screen shows **four** option groups in the order **Ships,
   Charged nodes, Rounds, Clock**, with **5** checked in the new group, and
   the Clock group reads **UNLIMITED** with `6s` / `4s` / `2s` unchanged.
2. On a **short landscape window**, the four groups still fit and nothing
   overflows or overlaps.
3. A game started at the defaults opens with **eight** nodes — five lit,
   three waiting with their one, two and three rings — and the HUD draws a
   row of **five** pips a side.
4. At the **narrow end of `--region-extent`** (a landscape window near the
   clamp's floor), the five-pip row does not overflow the info column, push
   the board below its floor, or collide with the title or turn indicator.
   If it does, that is a **finding to report**, not something to retune here
   (S8).
5. A game started with **Charged nodes 4** opens with **seven** nodes — four
   lit, three waiting — and draws **four** pips a side.
6. A game started with **Ships 3** draws **three** pips a side at either
   charged-node count, with nothing drawn in the space the shorter row
   leaves.
7. Playing on, the board is back at whichever count was chosen by the time
   the next turn begins, and a ship standing on a lit node still collects
   one energy per node held.
8. Finishing (or leaving) a game and returning to the start screen leaves
   the chosen count still selected, along with the other three options.

Depends on: Steps 1–9 (the whole change must be in place before it can be
played).

Verification (manual): The owner performs points 1–8 and confirms, or names
what to change. If something visual is knowingly given up here, record it as
a note in `doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather
than fixing it (`CLAUDE.md`, pre-release stance); no note is expected.

### Step 11 — `README.md`, the prose sweep, and the final check

Status: pending

- Update `README.md` in the player's voice: the start screen now offers a
  choice of charged nodes alongside ships, rounds and clock; a game opens
  with **five lit nodes, or four if you chose four** (eight nodes or seven,
  counting the three still waiting); and the board is kept topped up to
  whichever you chose, not to four. The paragraph that says "all four are
  exactly as fresh as each other" and the line about being "back to four lit
  nodes by the time your turn begins" both need re-stating. Running
  `/update-readme` is the intended route: it reviews the branch diff and
  rewrites what the change has made stale — check its output against the
  points above rather than trusting it blind.
- Sweep `src/` and `doc/` for prose the change has left stale. Search for
  `TARGET_CHARGED_NODES`, "four charged", "four lit", "seven nodes", "four
  pips", "0.61P", "8 seed steps" and "12 steps". Fix any comment that now
  describes the code wrongly. Do **not** edit `doc/ruleset/changelog.md`'s
  historical entries or other stories' folders under `doc/plan/` — both are
  a record of what was true then (`CONTRIBUTING.md`).
- Confirm `doc/plan/00000072-add-charged-node-count-option/story.md` still
  describes what was actually built; if a decision moved during
  implementation, correct it in place rather than leaving a stale statement.

Depends on: Steps 1–10 (the README describes finished behaviour, and the
sweep needs the code final).

Verification (automated): Run `npm test`, `npm run typecheck`,
`npm run lint` and `npm run format:check` — all green. Then confirm the
search terms above return no stale hit outside `doc/ruleset/changelog.md`
and other stories' plan folders, and that `README.md` describes the choice
and no longer describes a board that is always four.
