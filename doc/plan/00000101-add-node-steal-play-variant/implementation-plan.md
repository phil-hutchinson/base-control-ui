# Implementation Plan — Story 00000101, Steal: a fourth node playstyle

## What this story does

The start screen's **Inactive node rotation** group (rules.md §8.2) is
renamed **Node playstyle**, and gains a fourth choice, **STEAL**, rightmost.
The three existing choices — CONTINUOUS, PLANET, DEDICATED — keep their
labels and play exactly as they do today. The app's preselected choice stays
**PLANET**.

STEAL is not a fourth way to rotate priorities; it is a different game of
nodes, and its node rules live in a **new companion ruleset file,
`doc/ruleset/steal.md`**, beside `rules.md`. Under STEAL:

- The **Charged nodes** choice (five, four, three) sets how many **nodes**
  the game has. Each node carries a **signal** of its own and always
  occupies exactly **two squares**: either one **charged** square and one
  **prospective** square (**Held**), or two prospective squares (**Open**).
  Every node is dealt Open, so the opening board has no charged square at
  all.
- **Landing on a prospective square** of any node — unheld, the opponent's,
  or your own — makes that square the node's charged square with the ship
  on it; the node's previous charged square (if any) becomes ordinary board
  on the spot, leaving whatever ship stood there on an ordinary square; the
  node's other square is discarded; and one fresh prospective square is
  drawn, anchored on the square just charged.
- **Moving off a charged square** (without landing on that node's own
  prospective) makes the vacated square ordinary and draws the node a second
  prospective square, anchored on the one it already has. The node is Open.
- When one move does both, **leaving comes first**, then the claim.
- There is no countdown, no depletion, no trap, no relief, no priority, no
  rotation, no queue, no refill and no rotator. The end of a turn only pays
  power (§8.6 step 1) and energy (§8.6 step 2).
- Prospective squares are drawn from §3.2's **widened** pool with a weighted
  draw, `w(s) = d(s, a) + min over x in S of d(s, x)`, halved on the outer
  edge (full definition in story.md and in Step 3 below).

**Signal** is the internal name — rules, code, tests and planning documents
say signal. The app **presents** a signal as a **colour**: a palette mapping
signal to colour lives in the board view. On the board a prospective square
is drawn as three rings in its signal's colour, and a charged square under
STEAL is today's own starting ball — the same size, radius 70 in the
marker's 100-unit box — in its signal's colour rather than gold (settled at
Step 8, superseding an earlier smaller radius-48 ball; see Step 8's Notes).
Claiming a node plays the same charge animation a node charging under the
other three playstyles already plays, with the outgoing rings in the
signal's colour (also Step 8). No words — ruleset, labels, live region —
ever name a colour. The other three playstyles look exactly as they do
today.

`story.md` in this folder is the owner's full statement of the change and
the source of every number in this plan. This plan does not restate its
argument; it says how to get there, in what order, and records the decisions
and rejected alternatives, because code in this repository carries no design
history (`CONTRIBUTING.md`, "Comments").

## Baseline on this branch

Branch `feat/101-add-node-steal-play-variant`, clean at the start of
planning (`story.md` already committed in `ea99b18`). During planning the
orchestrator updated `CLAUDE.md` (the ruleset as `rules.md` plus companion
files; the words **prospective node** and **signal**) and this plan
corrected `story.md` in place to the owner's decisions; both are
uncommitted and are committed ahead of Step 1 by the orchestrator.

- `npm test` — **78 test files, 1523 tests, all green**.
- `npm run typecheck`, `npm run lint` and `npm run format:check` — all
  clean, with no pre-existing warnings. Every step must leave all four that
  way. If a step's own edit trips `format:check`, run `npx prettier --write`
  on the files that step touched (this plan file included).
- `doc/ruleset/rules.md` and `RULES_VERSION` (`src/rules/rulesVersion.ts`)
  both read **0.38**. `doc/ruleset/steal.md` does not exist yet.

The test count will rise over this story. No step may lower it; Step 2
renames test files but must not delete a test case.

Every step's automated verification means: `npm run typecheck`,
`npm run lint`, `npm run format:check` and the **full** `npm test`, all
green — never a subset scoped to the files the step touched
(`doc/guidelines/implementation-plan-guide.md`). A step's own verification
below lists what it must additionally prove.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what the ruleset, the
  UI, the live region, the Quick Guide and `README.md` say. **Move** is only
  ever the movement action (one ship changing squares), never a ply or a
  turn (`CLAUDE.md`, Vocabulary).
- **Node playstyle** is the player-facing name of the choice. Its code word
  is `nodePlaystyle` (type `NodePlaystyle`); its values are the lowercase
  strings `"continuous"`, `"planet"`, `"dedicated"` and `"steal"`. The
  uppercase labels CONTINUOUS / PLANET / DEDICATED / STEAL are start-screen
  chrome and live on the start screen only.
- **Node**, under STEAL, is the two-square entity identified by its signal;
  a **charged node** and a **prospective node** are its squares. In code,
  `state.nodes` stays keyed by square: each entry is one node **square**,
  and the squares sharing a `signal` value are one STEAL node. **Open** (two
  prospective squares) and **Held** (one charged, one prospective) are
  derived from those squares, never stored.
- **Signal** is what ties a STEAL node's squares together and tells one node
  from another. It is the word in the ruleset, code (`NodeSignal`, a
  `signal` field), tests and planning documents. **Colour** is only the
  view's presentation of a signal and appears only in the board view's
  palette and in visual descriptions. Do not write `color`/`colour` for a
  signal anywhere in `src/rules/`.
- **Prospective node** is a rules word meaning STEAL's waiting square only.
  It is **not** a synonym for the other playstyles' **inactive** node, which
  keeps its meaning and its code (`"inactive"` state, priorities,
  `nodeQueue.ts`). Do not rename anything inactive to prospective.
- **Claim** (landing on a prospective square) and **abandon** (moving off a
  charged square) are the planning and code words for STEAL's two events.
  The player-facing words are "take" / "steal" and "walk off" / "give up",
  as `story.md` uses them.
- **The ruleset** is `rules.md` plus its companion `steal.md`. Rules
  references in code comments cite whichever file states the rule (for
  example "steal.md, claiming a node" or "rules.md §8.6").
- The Quick Guide says **points** and **fuel** where the rest of the app
  says energy and power (`src/guide/guideCopy.ts` header). Copy added to the
  guide follows the guide's words; copy anywhere else follows the app's.
- The ruleset names **no default** and calls nothing standard. Which
  playstyle the app preselects is an app matter only.
- Presentation code uses the existing American spelling `color`
  (`INACTIVE_RING_COLOR`, `NodeCountdown`'s `color` prop). Prose — ruleset,
  guide, README, comments — says **colour**.

## Settled decisions — do not reopen

These come from `story.md` and the owner's answers during planning. A step
that finds one inconvenient escalates to the owner rather than re-deciding
it.

- **S1.** The group is renamed **Node playstyle**, keeps its place in the
  start screen's order, and offers CONTINUOUS, PLANET, DEDICATED, STEAL in
  that order. PLANET stays preselected.
- **S2.** The three existing playstyles are unchanged in behaviour and in
  appearance — rotators, countdowns, depletion, artwork and all.
- **S3.** The rename lands as its **own commit** with no behaviour change,
  before any STEAL code exists.
- **S4.** The ruleset edit is **one commit, ahead of the code**, 0.38 →
  0.39, with **one** changelog entry covering both `rules.md` and the new
  `steal.md`. The version number lives only in `rules.md`; `steal.md`
  carries a header line saying it is part of the ruleset versioned by
  `rules.md`. `rulesVersion.test.ts` stays as it is. Any later ruleset edit
  on this branch folds into the same 0.39 entry; there is no second bump.
  No tag.
- **S5.** **Steal's node rules live in `doc/ruleset/steal.md`.** `rules.md`
  keeps everything the playstyles share; its §8 says up front that it
  describes Continuous, Planet and Dedicated and that Steal's nodes follow
  `steal.md`. Shared sections that would be false under Steal get one-line
  "except under Steal — see steal.md" pointers. The steal draw is stated in
  `steal.md`, not in §3.2.
- **S6.** A STEAL node is two squares, always: Open (0 charged, 2
  prospective) or Held (1 charged, 1 prospective). Every node is dealt Open.
  More than one prospective while Held is out of scope.
- **S7.** The claim rule and the abandon rule exactly as `story.md`, "Two
  events, and only two, move a node", states them. **When one move does
  both, leaving is the first event**: leaving node A for node B's
  prospective is abandon A, then claim B — two draws. A holder landing on
  its own node's prospective is claim-only — one draw.
- **S8.** The prospective draw: §3.2's legality with constraints 3 and 4
  lifted (the widened pool, fallback included); weight
  `w(s) = d(s, a) + min over x in S of d(s, x)` with Chebyshev `d`, anchor
  `a` = the node's charged square if it has one, else its remaining
  prospective; `S` = every square of every **other** node, charged or
  prospective; the second term is 0 when `S` is empty; the weight is
  **halved** on the outer edge (row 1 or 15, column A or O). No positivity
  floor. No distance cap.
- **S9.** The opening deal: each node's first prospective drawn uniformly
  from the **strict** pool, one at a time, each seeing the squares already
  placed; then each node's second prospective by the weighted draw of S8.
  The order is fixed.
- **S10.** STEAL switches off priorities, rotation, the queue, refills,
  rotators, countdowns, depletion, traps, relief, and end-of-turn charging.
  Only §8.6 steps 1 and 2 run.
- **S11.** **Signal, not colour.** Each node has its own signal. The
  ruleset says so, with a short note that the app shows signals as colours.
  The board view maps signal to colour through an ordered five-colour
  palette — gold, silver (bright and polished, not the depleted grey), mid
  blue, purple, off white — the first N used for N nodes. No colour, and no
  signal, is named in any words: ruleset, square labels, live region. Exact
  colour values, and the charged ball's size under STEAL (starting at about
  48 against today's 70), are settled with the owner looking at a running
  board, in their own step.
- **S12.** Signals are presented by colour alone: no shapes, numbers or
  letters, no pairing highlight. This is recorded as accessibility debt in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.
- **S13.** Movement, combat (including the rule that a ship on a charged
  node can neither attack nor be attacked), planets, energy and scoring,
  rounds, the clock and seeded replay are unchanged. The only movement
  change is that a prospective square is a legal place to land, under STEAL
  only.
- **S14.** The Quick Guide gains a headed section **STEALING NODES** with a
  diagram; NODE LIFECYCLE and NEW CHARGED NODE SELECTION each gain a clause
  saying they describe the other three playstyles; the latter's closing
  sentence says **Node playstyle**. The STEALING NODES copy is drafted here
  and settled by the owner at that step's gate. Its diagram shows a red
  ship, the one exception to the guide's green-only diagrams.
- **S15.** Measurements use the app's **default fleet of five a side** for
  typical figures, and the **largest or smallest fleet** where a worst case
  is being checked (for example the largest fleet, six a side, when checking
  that enough legal squares always exist to place every node).
- **S16.** No STEAL animations in this story (D7) — **superseded at Step 8**:
  the owner asked for the existing charge animation to play on a claim once
  the palette was in front of them; see D7 for what changed. The
  start-screen group "Charged nodes" and the `chargedNodeCount` field keep
  their names (D3).

## Decisions this plan makes

Each of these is a choice the story leaves open, or the reasoning behind a
settled one. The reasoning and the rejected alternatives are recorded here
because this is the only place they will be written down.

### D1. How a STEAL node lives in the game state

**Decision.** `state.nodes` stays the single square-keyed map every consumer
already reads. Three additions:

1. `NodeState` (`src/rules/nodes.ts`) gains a fourth member,
   `"prospective"`, which only ever appears in a STEAL game.
2. `NodeStatus` (`src/rules/gameState.ts`) gains an optional `signal` field
   of a new type `NodeSignal` — an identity from 0 to 4, one per node.
   Every node square of a STEAL game carries it; no node square of any
   other playstyle does.
3. Every STEAL node square's `level` is `0`, always.

Open versus Held, a node's anchor, and "the squares of node k" are derived
by walking `nodeSquares(state)` (board order) and filtering on `signal`.
They are never stored.

**Why.** Every rule that STEAL leaves unchanged already reads `state.nodes`
by square: energy (`chargedNodesHeldBy` in `energy.ts`), combat's
protection of a ship on a charged node (`combat.ts`), movement's landing
check (`movement.ts`), the board and its square labels. Putting STEAL's
charged squares into the same map, with the same `"charged"` state, means
all of those work unchanged, and a STEAL charged square with `level` 0 reads
everywhere as "charged, no countdown" — so no countdown number is ever drawn
(`countdownNumber` in `countdown.ts` returns nothing for level 0). Adding
`"prospective"` to the union makes the compiler find every place that
switches on node state.

**Rejected alternatives.**

- *Carry the signal in `level`*, as an inactive node carries its priority.
  Rejected: on a charged square `level` means "plies left in the countdown"
  and the board, `countdown.ts` and `endOfTurn.ts` step 3 all read it that
  way; a charged STEAL square with `level` 2 would draw a countdown number
  and tick down. Overloading it a third way is a trap for every future
  reader.
- *A separate `stealNodes` structure* (a list of `{ signal, charged?,
  prospective[] }`) beside `state.nodes`. Rejected: every rule STEAL leaves
  unchanged would need a second source to consult, and the board and labels
  a second path to draw from. The square-keyed map is how everything finds a
  node today.
- *Storing Open/Held on the node.* Rejected: it is derivable from the
  squares, and a stored copy can drift from them.
- *Colours in the rules layer* (a `color` field, or colour names such as
  `"gold"`). Rejected by the owner's decision (S11): the rules need only an
  identity per node — the signal — and how a signal is presented is the
  view's business, free to change at the colour gate (Step 8) or later
  without touching `src/rules/`.

### D2. Code names for the choice

`src/rules/nodeRotation.ts` becomes `src/rules/nodePlaystyle.ts`:
`NodeRotationSetting` → `NodePlaystyle`, `NODE_ROTATION_SETTINGS` →
`NODE_PLAYSTYLES`, `DEFAULT_NODE_ROTATION` → `DEFAULT_NODE_PLAYSTYLE`,
`isNodeRotationSetting` → `isNodePlaystyle`; `GameState.nodeRotation` and
the `nodeRotation` option / intent field → `nodePlaystyle`;
`useAppScreen`'s `nodeRotation` / `setNodeRotation` → `nodePlaystyle` /
`setNodePlaystyle`; `StartScreen`'s `nodeRotation` / `onNodeRotationChange`
props → `nodePlaystyle` / `onNodePlaystyleChange`;
`NODE_ROTATION_SETTING_LABELS` → `NODE_PLAYSTYLE_LABELS`. The test file
`nodeRotation.test.ts` becomes `nodePlaystyle.test.ts`.

Names that genuinely mean the **rotation itself** keep "rotate":
`rotateQueue`, `rotatePriority`, `rotateForLanding`, `QueueRotatedEffect`,
the `queue-rotated` effect type. Those describe what the continuous, planet
and dedicated playstyles do, not the choice.

Historical planning documents (`doc/plan/*` other than this story's folder,
including the existing entries of `known-issues.md`) and existing
`changelog.md` entries are **not** edited (`CONTRIBUTING.md`, "Historical
planning documents are not rewritten").

### D3. `chargedNodeCount` keeps its name

Under STEAL, `GameState.chargedNodeCount` means "how many nodes the game
has", not "how many are charged". The field, the start-screen group
("Charged nodes") and the option keep their names; the field's doc comment
says what it means under STEAL. Renaming it would touch every playstyle for
the sake of one, and the story keeps the group's label. (Accepted by the
owner.)

### D4. When one move both abandons one node and claims another

A ship standing on node A's charged square may move onto node B's
prospective square (B ≠ A). Each event draws from the seeded stream, and the
first draw's pool and `S` see the board as the other event leaves it, so
the order matters.

**Decision (confirmed by the owner, S7).** Abandon first, then claim — the
ship leaves, then arrives. Node A's second prospective is drawn against the
board with the moving ship already at its destination (so the destination
is excluded as a ship square) and with node B still as it was before the
claim; then node B's claim is resolved and its fresh prospective drawn
against the board as the abandon left it. Two seed steps.

**Why.** It is the physical order of a move, and it matches how `applyMove`
already orders the effects of leaving a square before the effects of
arriving (`node-spent` is raised first today). **Rejected:** claim first —
equally deterministic, but it reads backwards.

A ship moving from A's charged square onto **A's own** prospective is a
relocation: the claim rule alone applies (the story's exit rule excludes
it), one seed step.

### D5. Where the STEAL logic lives

- The weighted draw is a new function beside the existing draws in
  `src/rules/nodePlacement.ts` (Step 3): it is a placement rule, and that
  module already owns the pools, `distanceFromEdge` and the other two
  draws. Its doc comment cites `steal.md` as the rule it implements.
- Everything else about STEAL — the signal type and count, reading a node's
  squares and anchor, the opening deal, the claim and the abandon — lives in
  a new leaf module `src/rules/steal.ts`, mirroring how `nodeQueue.ts` owns
  the queue and `rotators.ts` owns rotators. It imports `board.ts`,
  `nodePlacement.ts`, `random.ts` and types from `gameState.ts`/`nodes.ts`
  only. `gameState.ts` (the deal) and `ply.ts` (the events) call into it.
- `NodeSignal` is defined in `steal.ts` and imported by `gameState.ts` as a
  type, the way `gameState.ts` already imports types from `nodes.ts`. If the
  type-only import produces a cycle lint objects to, define `NodeSignal` in
  `nodes.ts` instead (it already holds `NodeState`) and note the deviation.

### D6. The effects a STEAL move raises

Two new effect types join `MoveEffect` in `ply.ts`:

- **`node-claimed`**: the claiming ship (`shipId`, `side`); the node's
  `signal`; `square`, the square just charged; `releasedSquare`, the node's
  previous charged square, present only when the node was Held (including a
  relocation); `strandedShip` (`shipId`, `side`), present only when
  `releasedSquare` still has a ship standing on it after the move — the
  previous holder, which may be of either side; `discardedSquare`, the
  other prospective square, present only when the node was Open; and
  `newProspective`, the square drawn.
- **`node-abandoned`**: the node's `signal`; `square`, the square vacated;
  `newProspective`, the square drawn.

Order in a move's effect list: `node-abandoned` (if any), then
`node-claimed` (if any), then `ply-ended` and any pass. `node-spent` is
never raised under STEAL, and neither is `queue-rotated` or
`planet-bonus-claimed` alongside a claim (a prospective square is never a
planet). An attack raises neither new effect: under STEAL an attack can
never vacate a charged square (the attacker cannot be on one) or land on a
prospective one (returns land on planets, which are never node squares).

**Rejected:** reusing `node-spent` / `node-charged`. Their meaning (a node
depleting; a queue node charging at the end of a turn) is wrong for STEAL,
and every listener of them — announcements, animations — would need to
branch on the playstyle to read them correctly.

### D7. STEAL plays the existing charge animation on a claim

**Superseded at Step 8.** As first implemented (Steps 5–7), the existing
charge and burnout animations (`boardAnimations.ts`) were keyed to
`node-charged`, `node-ran-out` and `node-spent`, none of which a STEAL game
raises, so a STEAL board simply redrew on each claim and abandon; the plan
reasoned that designing STEAL animations before the colours were settled
would be wasted work. At Step 8, once the palette was in front of the owner,
the owner asked for the existing charge ("explosion") animation to play on
`node-claimed` too: `NodeChargeAnimation` (`boardAnimations.ts`) gained an
optional `signal`, alongside its existing optional `priority`, exactly one of
which is ever given; `boardAnimations` now also raises one for the square a
`node-claimed` effect names, carrying that node's `signal`; and
`NodeMarker`'s charging branch draws its outgoing rings as the prospective
node's own three, in the signal's colour, when `chargeAnimation.signal` is
given, instead of `chargeAnimation.priority`'s ring count in gold — revealing
the signal-coloured charged artwork beneath exactly as the existing animation
already did for the other three playstyles. Nothing is raised for
`node-abandoned` or for the square a claim released. No animation is retired
or changed for continuous, planet or dedicated.

### D8. How the board knows a charged square is a STEAL one

`Board` looks up the square's `signal` and, when there is one, passes the
**presentation** down: `BoardSquare` and `NodeMarker` receive the signal,
and `NodeMarker` resolves it to colours through the board view's palette.
A charged marker **with** a signal draws today's starting charged shape
(Step 8: radius 70, fixed at its start-of-cycle offset) in the signal's
colours; a charged marker **without** one draws today's artwork byte for
byte. A prospective marker always has a signal. This keeps the other three
playstyles' markup provably unchanged: nothing they render passes a signal.

**Rejected:** resolving colours in `Board` and passing raw colour values
down. It would work, but the palette lookup belongs with the artwork that
uses it, and a signal prop reads the same in the guide's diagrams (Step 10)
as on the board.

### D9. Neither signals nor colours appear in words

No words name a colour, and none name a signal: not the ruleset, not the
square labels, not the live region, not the Quick Guide. The one exception
(owner's decision): the Quick Guide may say that a node's squares share a
**colour**, since that is what the player sees — but it names no particular
colour, because the palette may change. The ruleset says
each node has a signal of its own, with a short note that the app shows
signals as colours; the palette's names and values are the view's, and may
change at Step 8 or later without a ruleset edit or a wording change.
Square labels say "prospective node" and "charged node" and nothing about
which node — exactly the accessibility cost S12 accepts, and Step 7 records
it.

### D10. The measured figures and the fleets they use

`story.md` gives placement figures measured over 20,000 simulated deals.
Per S15, Step 6 re-measures them against the default fleet of five a side
with an improvised 20,000-deal script, records the re-measured figures in
`doc/ruleset/tech-notes.md`, and adds a long-run test that guards them to
within a neighbourhood over a smaller sample, the way `nodePool.test.ts`
guards the existing refill figures. The worst-case check — that §3.2's
fallback never fires, so there is always room to place every node — runs at
the **largest fleet (six a side) and five nodes**, where the most squares
are blocked.

### D11. The STEALING NODES guide copy is drafted here, settled by the owner

The Quick Guide's copy has always been the owner's own wording. The story
gives no copy for STEALING NODES, so Step 10 carries a draft, which the
owner edits or approves at that step's manual gate. The draft describes
what a player sees — rings and balls — without naming any colour or saying
"signal" (D9). (Accepted by the owner.)

### D12. Where the ruleset's pointers go

`rules.md`'s opening says the ruleset is this document together with its
companion `steal.md`. The only player-facing link to the rulebook is
`README.md`'s "The rules" section, which Step 11 extends to link `steal.md`
too; the app and the Quick Guide link to no ruleset file. `CONTRIBUTING.md`'s
"Architecture constraints" paragraph that names `rules.md` as the ruleset is
a developer document and is brought in line in Step 1, alongside the
`CLAUDE.md` wording the orchestrator already changed. The pipeline's own
command files under `.claude/commands/` also name `rules.md` (for example
`update-readme.md`); they are process files owned by the owner and are not
edited by this plan.

## Step sequence at a glance

| Step | Title                                                              | Verification |
| ---- | ------------------------------------------------------------------ | ------------ |
| 1    | The ruleset goes to 0.39: node playstyle, and `steal.md`           | automated    |
| 2    | Rename node rotation to node playstyle (no behaviour change)       | automated    |
| 3    | The prospective-square draw                                        | automated    |
| 4    | The STEAL setting, node signals and the opening deal               | automated    |
| 5    | Claiming and abandoning a node                                     | automated    |
| 6    | Whole STEAL games, replay, and the placement figures               | automated    |
| 7    | The board presents signals as colours                              | automated    |
| 8    | The colour and size gate                                           | manual       |
| 9    | The live region says a node was taken or given up                  | automated    |
| 10   | The Quick Guide's STEALING NODES section                           | manual       |
| 11   | `README.md`                                                        | automated    |
| 12   | The opening deal keeps second squares off the outer two rings      | automated    |
| 13   | The owner plays STEAL                                              | manual       |

---

### Step 1 — The ruleset goes to 0.39: node playstyle, and `steal.md`

Status: committed

Notes: Wrote `doc/ruleset/steal.md` with its eight numbered sections and the
"versioned by rules.md" header line; bumped `rules.md`'s version line and
`RULES_VERSION` to 0.39; renamed section 8.2's choice to "the node
playstyle" (continuous, planet, dedicated or steal), keeping the three
existing bullets word for word; added the "except under steal" pointers to
§1 (both paragraphs), §2 (new Prospective node and Signal entries, plus
notes on Node, Priority, Rotator, Countdown and Trapped), §3.2, §3.3, §4.1,
§5, §6, §7, §8.4 and §8.6, and an opening paragraph on §8 itself; renamed
every "the dedicated/planet/continuous rotation setting" phrase to "the …
playstyle" throughout, including in §8.6's prose paragraphs; updated §10's
list. Added one 0.39 changelog entry covering both files, and brought
`CONTRIBUTING.md`'s ruleset paragraph in line with the companion-file
wording `CLAUDE.md` already uses. Read-through checks all pass: `steal.md`
has all eight sections and the header line; every named `rules.md` section
carries its pointer; `grep -n "rotation setting" doc/ruleset/rules.md` finds
nothing; `grep -n -i "default\|standard"` finds nothing new in either file;
`grep -n -i "gold\|silver\|blue\|purple\|white\|colour" doc/ruleset/steal.md`
finds only the two colour-presentation notes; `steal.md`'s claim and leaving
rules match `story.md`'s. No deviation from the plan. `npm run typecheck`,
`npm run lint`, `npm run format:check` (after `prettier --write` reflowed
`steal.md`'s prose) and the full `npm test` (78 files, 1523 tests) are all
green, matching the baseline exactly since this step touches no code.

Write the new companion file `doc/ruleset/steal.md`, edit
`doc/ruleset/rules.md` to point to it, bump `rules.md`'s version line to
**0.39**, bump `RULES_VERSION` in `src/rules/rulesVersion.ts` to `"0.39"`,
add one **0.39** entry at the top of `doc/ruleset/changelog.md` covering
both files, and bring `CONTRIBUTING.md`'s description of the ruleset in
line. This is one commit, ahead of any code (S4). Write the ruleset for a
non-technical player (`CLAUDE.md`, Intended audience); say **turn**, never
ply. Name no default. Name no colour, and no particular signal (D9).

**`doc/ruleset/steal.md`** (new). Title `# Base Control — Steal`, then a
header line in bold or italics saying it is part of the Base Control
ruleset, versioned by [rules.md](rules.md) — it carries **no** version
number of its own (the version test reads only `rules.md`) — and that it
holds the node rules of the steal playstyle, everything else being
`rules.md`'s. Then, in this order, numbered sections so code comments can
cite them:

1. **What steal is**: one of the four node playstyles (rules.md §8.2); it
   replaces rules.md §8's node rules and nothing else. The charged-node
   choice (rules.md §8.1) sets how many nodes the game has.
2. **A node is a signal with two squares.** Each node is dealt a signal of
   its own; its squares carry that signal, which is the only thing tying
   them together. A short note: the app shows each signal as a colour. The
   Open/Held table from `story.md`. Every node is dealt Open.
3. **Claiming a node** — the story's three numbered sub-steps, in
   substance word for word — and that it covers claiming an unheld node,
   taking the opponent's, and relocating one's own. A ship left standing on
   a square that has just become ordinary is an ordinary ship on an
   ordinary square, free to move next turn.
4. **Leaving a node** — the story's two numbered sub-steps.
5. **When one move does both** (S7, D4): leaving comes first — the node
   left behind draws its second prospective node — and then the node landed
   on is claimed and draws its fresh one. Landing on one's own node's
   prospective node is a relocation, not a leaving: the claim alone
   applies.
6. **Where a prospective node is drawn** (S5, S8): legal squares are those
   of rules.md §3.2 with constraints 3 and 4 both lifted, the fallback in
   force, and "node" meaning every charged and prospective node, the
   drawing node's own included. The weight
   `w(s) = d(s, a) + min over x in S of d(s, x)` in a code block formatted
   like rules.md §3.2's, with `a` the node's anchor (its charged node if it
   has one, otherwise its remaining prospective node), `S` every square of
   every other node, charged or prospective, the second term 0 when `S` is
   empty, and `d` Chebyshev distance as rules.md §3.2 defines it. An
   outer-edge square's weight is halved (row 1 or 15, column A or O).
   `d(s, a)` is never below 2, so no positivity floor is needed. Include the
   story's explanation of why the first term dominates (a steal is a real
   relocation, not a shuffle) and the second is a prop-up for an empty
   region.
7. **The opening deal**: the opening board carries no charged node; each
   node's first prospective node is drawn at random from rules.md §3.2's
   strict pool, every legal square equally likely, one at a time, each
   seeing those already placed; then each node's second by the weighted
   draw of section 6, in the same node order. No rotators are laid down.
8. **What rules.md §8 does not do under steal**: priorities, rotation, the
   queue and refills (§8.2); rotators — planets and rotators rotate
   nothing (§3.3); countdowns and their numbers (§8.3); the depleted state,
   traps and relief (§8.1, §8.3, §8.5, §8.6 step 7); end-of-turn charging
   and the shortfall (§8.1, §8.6 steps 3–5). Of the end-of-turn order
   (§8.6), only step 1 (power) and step 2 (energy) run. Energy (§8.4) is
   unchanged and is priced by the charged nodes a player stands on when
   their turn ends. Nothing else in rules.md changes.

**`doc/ruleset/rules.md`** edits:

- **Opening paragraph**: the ruleset is this document together with its
  companion [steal.md](steal.md), which holds the steal playstyle's node
  rules; this document's version covers both; where the app and the ruleset
  disagree, the ruleset is right.
- **§8** gains an opening paragraph before §8.1: this section describes the
  continuous, planet and dedicated playstyles; under steal, a node's rules
  are [steal.md](steal.md)'s instead. §8.1, §8.3, §8.5 and §8.6 need no
  further pointers of their own beyond what this paragraph gives, except
  that **§8.4** (energy) gains a sentence that it applies under steal too,
  and **§8.6** gains that under steal only steps 1 and 2 run.
- **§8.2.** "How the priorities rotate is chosen before play begins"
  becomes the **node playstyle**: continuous, planet, dedicated or steal,
  the same for both players and fixed for the game's lifetime. The three
  rotation bullets keep their text **word for word**. Add a sentence: steal
  is not a way of rotating anything but a different game of nodes, set out
  in steal.md.
- **One-line "except under steal — see steal.md" pointers** (S5) in each
  shared section that would be false under steal:
  - **§1 Overview** — the paragraph saying nodes are born, run out and
    leave; and the list of random elements (under steal, where each
    prospective node is drawn, in place of the refill and the priority
    deal).
  - **§2 Words** — **Node** (under steal a node is a signal with two
    squares and never ends); a new entry **Prospective node** (under steal
    only, a node's waiting square; landing on one claims the node; distinct
    from an inactive node); and a new entry **Signal** (under steal only,
    what tells one node from another; the app shows it as a colour).
    **Priority**, **Rotator**, **Countdown** and **Trapped** each gain, or
    are covered by, a note that they do not arise under steal.
  - **§3.2** — prospective nodes are drawn by steal.md's own rule, which
    borrows this section's constraints.
  - **§3.3** — no rotators under steal.
  - **§4.1** — a prospective node does nothing to power either.
  - **§5** — under steal no node square is closed and no ship is ever
    trapped.
  - **§6** — under steal a prospective node is a legal place to land, and
    landing on one claims it; no square is closed to landing.
  - **§7** — "Two things follow about nodes": under steal a holder *can*
    lose its node to an opponent landing on its prospective node, and a
    holder who walks off does not give it up still lit — it returns to two
    prospective nodes. The protection rule itself (a ship on a charged node
    can neither attack nor be attacked) is unchanged.
- **§10**'s list of what is chosen before play says "the node playstyle
  (section 8.2)" where it now says "how the priorities rotate". §9
  enumerates nothing else; read it and change it only if something is
  false.
- **Terminology.** Where the text names a particular setting as "the
  dedicated rotation setting" or "the planet rotation setting", make it
  "the dedicated playstyle" / "the planet playstyle", so the document uses
  one name for the choice. The three bullets in §8.2 are the exception and
  stay word for word.

**`doc/ruleset/changelog.md`**: heading
`## 0.39 — steal, a fourth node playstyle`, opening with the same
"gameplay change … would be a tag candidate; tagging stays on hold" sentence
the 0.38 entry uses, then: that the ruleset gains a companion file,
steal.md, holding the steal playstyle's node rules, versioned by rules.md;
one bullet summarising steal.md's contents; one bullet per rules.md section
touched, in the style of the 0.38 entry; and a closing "nothing else
changes" bullet naming what steal leaves alone (S13).

**`CONTRIBUTING.md`** ("Architecture constraints", the paragraph beginning
"The ruleset lives in this repository at"): the ruleset is `rules.md` plus
companion files beside it (`steal.md`), versioned by the single number in
`rules.md`. Match the wording `CLAUDE.md` already uses. Do **not** edit
`CLAUDE.md`.

Depends on: nothing. Every later step implements this ruleset, so it comes
first (S4).

Verification (automated): the full suite is green — in particular
`src/rules/rulesVersion.test.ts` passes, unchanged, with the document and
the constant both at 0.39 and the changelog carrying a 0.39 entry. Then a
read-through check by the implementer, recorded in Notes: `steal.md` exists
with the "part of the ruleset versioned by rules.md" header line and all
eight sections; every rules.md section named above carries its pointer;
`grep -n "rotation setting" doc/ruleset/rules.md` finds only text that is
genuinely about rotation; `grep -n -i "default\|standard"
doc/ruleset/steal.md` finds nothing, and the same grep on rules.md finds
nothing new; `grep -n -i "gold\|silver\|blue\|purple\|white\|colour"
doc/ruleset/steal.md` finds only the one note that the app shows signals as
colours; steal.md's claim and leaving rules match `story.md`'s.

---

### Step 2 — Rename node rotation to node playstyle (no behaviour change)

Status: committed

Notes: Renamed `src/rules/nodeRotation.ts`/`.test.ts` to
`nodePlaystyle.ts`/`.test.ts` via `git mv`, applied the D2 identifier renames
(`NodeRotationSetting`→`NodePlaystyle`, `NODE_ROTATION_SETTINGS`→
`NODE_PLAYSTYLES`, `DEFAULT_NODE_ROTATION`→`DEFAULT_NODE_PLAYSTYLE`,
`isNodeRotationSetting`→`isNodePlaystyle`, the `nodeRotation` field/prop/state
→ `nodePlaystyle` throughout) across every importer
(`gameState.ts`, `ply.ts`, `endOfTurn.ts`, `planetBonus.ts`, `session.ts`,
`useAppScreen.ts`, `App.tsx`, `StartScreen.tsx`) and every test file the
initial grep found. Reworded the start screen's legend and label map to
"Node playstyle"/`NODE_PLAYSTYLE_LABELS`, `guideCopy.ts`'s NEW CHARGED NODE
SELECTION closing sentence to "the Node playstyle selected" (leaving its
header's historical reference to "the inactive node rotation options" alone,
as the plan allows), and every live doc comment/test description that named
"node rotation" as the choice (`guideCopy.ts`'s `GuideSettingLine` comment,
`GuideScreen.test.tsx`, `gameState.ts`'s seed-accounting comment, and several
test titles in `gameState.test.ts`, `fullGame.test.ts`, `session.test.ts`,
`useAppScreen.test.tsx`, `App.test.tsx`). Left two comments in
`seededReplay.test.ts` (lines narrating "0.36 added node rotation as a
pre-play choice") untouched: they document what rules.md 0.36 literally
introduced under that name at the time (confirmed against
`changelog.md`'s "0.36 — inactive node rotation becomes a choice" heading),
so renaming them would misstate history rather than rename a live concept —
this is a judgment call the plan didn't spell out, flagged here rather than
silently made. No fourth setting was added and no behaviour changed.
`npm run typecheck`, `npm run lint`, `npm run format:check` and the full
`npm test` (78 files, 1523 tests — the same count as the Step 1 baseline)
are all green; `grep -rn "nodeRotation\|NodeRotation\|NODE_ROTATION\|Inactive
node rotation" src` returns nothing, and `StartScreen.test.tsx` finds the
group as "Node playstyle" with CONTINUOUS/PLANET/DEDICATED and PLANET
checked.

Rename every code and test name that says node rotation to say node
playstyle, per D2. This step adds no fourth setting and changes no
behaviour: after it, the app plays and looks exactly as before, except that
the start screen's legend reads **Node playstyle**.

What changes:

- `src/rules/nodeRotation.ts` → `src/rules/nodePlaystyle.ts` (use
  `git mv`), with the D2 renames, and its header and doc comments reworded
  to "node playstyle" (rules.md §8.2). Keep its three values and PLANET as
  the default.
- `src/rules/nodeRotation.test.ts` → `src/rules/nodePlaystyle.test.ts`
  (`git mv`), updated to the new names.
- Every importer: at least `src/rules/gameState.ts`, `ply.ts`,
  `endOfTurn.ts`, `planetBonus.ts` (comments), `src/game/session.ts`,
  `src/useAppScreen.ts`, `src/App.tsx`, `src/start/StartScreen.tsx`, and
  the tests listed by `grep -rln "nodeRotation\|NodeRotation\|NODE_ROTATION"
  src`. The `GameState` field, the `startingGameState` option, the
  `new-game` intent field, the hook's pair and the start screen's props all
  take the D2 names; the `RangeError` message in `startingGameState` names
  `nodePlaystyle`.
- `src/start/StartScreen.tsx`: the legend text becomes `Node playstyle`;
  the label map becomes `NODE_PLAYSTYLE_LABELS` with its doc comment
  reworded. Tests that find the group by its accessible name (the legend)
  are updated to the new name.
- `src/guide/guideCopy.ts`: NEW CHARGED NODE SELECTION's paragraph's
  closing words "depending on the Inactive node rotation selected" become
  "depending on the Node playstyle selected" (S14); update
  `guideCopy.test.ts` if it pins the sentence. The file header's reference
  to "the inactive node rotation options" is history about where the copy
  came from and may stay.
- Comments that say "node rotation setting" meaning the choice become
  "node playstyle". Comments that describe the rotation itself stay.

Do not touch historical documents (D2). Do not rename anything in the
queue's rotation machinery (D2).

Depends on: Step 1 (the ruleset names the choice "node playstyle", which
this step implements). Steps 3 onward build on the new names (S3).

Verification (automated): the full suite is green with **the same number
of tests as before this step**; `grep -rn "nodeRotation\|NodeRotation\|NODE_ROTATION\|Inactive
node rotation" src` returns nothing; the start screen test that locates the
group by name finds it as "Node playstyle" with the three existing radios
and PLANET checked.

---

### Step 3 — The prospective-square draw

Status: committed

Notes: Added `drawStealProspectiveSquare` and its private weight function
`stealProspectiveWeight` to `src/rules/nodePlacement.ts`, drawing from
`legalNodePool(..., "widened")` and weighting each candidate
`d(s, anchor) + min over x in S of d(s, x)` (0 when `S` is empty), halved on
the outer edge via the module's existing `distanceFromEdge`, drawn with
`drawWeightedIndex` for exactly one seed step. Doc comment cites steal.md §6
and mirrors the module's existing two draws' style; the module header now
also names `steal.ts` as a caller. Added five tests to
`nodePlacement.test.ts`: pool-membership plus an observed outer-edge draw
over 500 seeds; single seed-step advancement; determinism; two exact
formula-match tests (one with `S` empty proving edge halving and the
anchor-only term, one with `S` non-empty proving the added
nearest-other-node term), each checked against `drawWeightedIndex` directly
computed weights across four seeds; nothing calls the function yet, per the
step. No deviation from the plan. `npm run typecheck`, `npm run lint`,
`npm run format:check` and the full `npm test` (78 files, 1528 tests, up
from the 1523-test baseline by exactly the 5 new tests) are all green.

Add STEAL's weighted draw (steal.md section 6) to
`src/rules/nodePlacement.ts` as a pure function, with unit tests. Nothing
calls it yet.

The function takes: the squares that currently hold any node (every
signal, charged and prospective, the drawing node's own included); the
drawing node's anchor square; the squares of every **other** node (`S`);
the squares ships occupy; and a seed. It returns the drawn square and the
next seed. It:

1. Builds the pool with the existing `legalNodePool(…, "widened")` — the
   widened pool with its fallback, so it can never fail (S8).
2. Weights each candidate `s` as `d(s, anchor) + min over x in S of d(s,
   x)`, using `chebyshevDistance` from `board.ts`, with the second term 0
   when `S` is empty, and halves the weight when `s` is on the outer edge
   (the module's existing `distanceFromEdge(s) === 0`).
3. Draws one index with `drawWeightedIndex` from `random.ts` (which accepts
   fractional weights) — **exactly one seed step**.

Doc-comment it the way the module's two existing draws are documented,
citing steal.md section 6: the formula, what `a` and `S` are, why the first
term dominates, that the edge halving keeps the rim available without
making it the likeliest place, and that `d(s, a) ≥ 2` in the ordinary pool
(adjacency is illegal) so the weight is always positive and needs no floor;
in the fallback `d(s, a) ≥ 1`, still positive. Update the module header,
which today names two callers, to name this draw and its use.

Tests, in `src/rules/nodePlacement.test.ts`:

- Every drawn square is in `legalNodePool(…, "widened")` for the inputs
  (never on a node, beside a node, on a ship, on or beside a planet), and an
  outer-edge square **can** be drawn.
- It advances the seed exactly once (compare to one `drawWeightedIndex`
  step).
- The weights: on a case where the pool is tiny and the weights are known
  (for example, fill the board with ships so only two or three candidates
  remain, one of them on the outer edge), the observed frequencies over a
  few thousand seeds are within a tolerance of the computed weight ratio,
  the edge candidate's weight halved.
- `S` empty makes the second term vanish (the draw depends only on the
  anchor).
- The same inputs and seed give the same square (determinism).

Depends on: Step 2 (clean names; nothing else). Steps 4 and 5 call this for
the deal and for both events.

Verification (automated): the full suite is green, with the new cases in
`nodePlacement.test.ts` passing.

---

### Step 4 — The STEAL setting, node signals and the opening deal

Status: committed

Notes: Added `"steal"` to `NodePlaystyle`/`NODE_PLAYSTYLES` (last, PLANET
still default) and `"prospective"` to `NodeState`; added the optional
`signal` field (new type `NodeSignal`, defined in the new `src/rules/steal.ts`
per D5) to `NodeStatus`, with a doc-table row and a note that only steal
carries it. `steal.ts` holds `NodeSignal`/`NODE_SIGNALS`, the pure helpers
`squaresForSignal`/`isNodeHeld`/`nodeAnchor`, and `dealStealOpeningBoard`
(steal.md §7: N first squares from the strict pool, then N second squares by
Step 3's weighted draw, 2N seed steps, verified against `mulberry32` directly
as `nodeQueue.test.ts` does for its own refill). `startingGameState` branches
to it under `"steal"` (rotators stay empty automatically, since
`placeRotators` already only runs under `"dedicated"`); `runEndOfTurn` returns
right after step 2 (power, energy) for a steal state. `movement.ts` refuses a
`"prospective"` destination with `destination-uncharged-node`, matching
inactive and depleted, to be lifted in Step 5. `NodeMarker.tsx` draws a
prospective square as three rings in `INACTIVE_RING_COLOR` (steal.md: always
three, no priority) so the widened `NodeState` type-checks through
`BoardSquare`/`Board.tsx` unchanged. `StartScreen.tsx` gained the STEAL radio
last. Test updates: `nodePlaystyle.test.ts`, `StartScreen.test.tsx` (four
radios, STEAL label) and one new `App.test.tsx` case (choosing STEAL starts a
game and survives a return to start) cover the setting; new
`src/rules/steal.test.ts` covers the helpers and the deal directly; new cases
in `gameState.test.ts` cover the deal through `startingGameState` (shape, seed
count, determinism, the bonus deal still running after); one new
`endOfTurn.test.ts` case covers the steal early-return; two new
`movement.test.ts` cases cover flying over versus landing on a prospective
square; `NodeMarker.test.tsx` gained `"prospective"` to its shared `STATES`
list plus a dedicated "always three rings" case; `fullGame.test.ts`'s
`describe.each(NODE_PLAYSTYLES)` now branches its per-ply assertion, since the
existing queue invariant (exactly priorities {1,2,3}) is meaningless for
steal — a `assertNoInactiveOrDepletedNodes` check stands in for it, matching
the plan's instruction to scope queue/inactive-node assertions to the other
three playstyles. No claim or abandon exists yet, so a steal game in that test
still plays to its end on ordinary squares only, collecting nothing, exactly
as the step describes. No deviation from the plan otherwise. `npm run
typecheck`, `npm run lint`, `npm run format:check` (after `prettier --write`
on the two new/touched test files it flagged) and the full `npm test` (79
files, 1558 tests, up from the 1528-test baseline by 30) are all green; the
other three playstyles' pre-existing tests pass unmodified.

Make STEAL a real, selectable playstyle that deals its opening board and
runs a STEAL end of turn. Landing on a prospective square is **refused**
in this step and opened in Step 5, so no intermediate commit has a ship
standing on a prospective square with nothing happening.

What to implement:

- **The setting.** `"steal"` joins `NodePlaystyle` and `NODE_PLAYSTYLES`
  in `src/rules/nodePlaystyle.ts`, **last**. `DEFAULT_NODE_PLAYSTYLE` stays
  `"planet"`. Update the module's doc comment (steal's rules are
  steal.md's) and `nodePlaystyle.test.ts`.
- **The state shape** (D1). `NodeState` in `nodes.ts` gains
  `"prospective"`, with its doc comment saying it appears only under steal
  (steal.md). `NodeStatus` in `gameState.ts` gains the optional
  `signal: NodeSignal`, and its doc table gains a Prospective row (level
  always 0) and a note that under steal every node square carries `signal`
  and `level` 0. `GameState.chargedNodeCount`'s doc comment says what it
  means under steal (D3).
- **`src/rules/steal.ts`** (new, D5) with a header comment in the style of
  `nodeQueue.ts`'s, citing steal.md and stating the seed steps. It holds:
  - `NodeSignal` (the identity type, 0–4) and the ordered list of the five
    signals, so a game of N nodes uses the first N.
  - Helpers to read, from a node map, one signal's squares in board order,
    whether that node is Held or Open, and its anchor (charged square if
    Held, else — only meaningful when one prospective remains — that
    prospective). Keep these pure and exported for Step 5 and the tests.
  - The opening deal (steal.md section 7): given the ships' squares, the
    node count and a seed, it draws the first prospective square for signal
    0, 1, … N−1 in turn with the existing uniform strict-pool
    `drawNodeSquare`, each against the squares already placed; then, for
    signal 0, 1, … N−1 in turn, draws the second prospective square with
    Step 3's draw, anchor = that signal's first square, occupied =
    everything placed so far, `S` = every placed square of the other
    signals. Every entry is `{ state: "prospective", level: 0, signal }`,
    written in board order (the way `dealOpeningBoard` builds its map).
    **2N seed steps**, nothing else.
- **`startingGameState`** in `gameState.ts` deals with the steal deal when
  `nodePlaystyle` is `"steal"` and with `dealOpeningBoard` otherwise; it
  already lays rotators only under `"dedicated"`, so a steal game has none;
  the planet-bonus deal still runs last. Update its doc comment's seed
  accounting (2N steps under steal, then the bonus deal if on).
- **End of turn** (`endOfTurn.ts`): when `state.nodePlaystyle` is
  `"steal"`, `runEndOfTurn` runs steps 1 and 2 exactly as today and then
  returns, skipping steps 3 to 7 (S10). Say so in the header comment,
  citing steal.md section 8.
- **Movement** (`movement.ts`): `moveRefusalReason` refuses a
  `"prospective"` destination with the existing
  `destination-uncharged-node` reason, **temporarily** — say nothing about
  it being temporary in the code; this plan records it, and Step 5 removes
  it.
- **Just enough view to compile and run**, finished in Step 7:
  - `src/start/StartScreen.tsx`'s `NODE_PLAYSTYLE_LABELS` gains `steal:
    "STEAL"`; the start screen now shows four radios. Update
    `StartScreen.test.tsx` (four choices in order, PLANET checked, choosing
    STEAL starts a steal game) and any session / `useAppScreen` / `App`
    tests that enumerate the playstyles.
  - `src/board/NodeMarker.tsx` draws a `"prospective"` marker as all three
    rings in the existing `INACTIVE_RING_COLOR`, so the type checks and a
    steal board is visible. `squareLabel.ts` already says
    `"<state> node"`, which reads "prospective node" with no change.
  - Anything else the widened `NodeState` makes the compiler flag gets the
    minimal correct handling (a prospective square has no countdown and no
    cycle position; `Board.tsx` passes a priority only for inactive).
- **Tests that iterate `NODE_PLAYSTYLES`** now include `"steal"`. In
  particular `fullGame.test.ts`'s `describe.each` over the playstyles plays
  a whole game at each; with prospective squares closed in this step a steal
  game there plays to its end on ordinary squares collecting nothing, and
  any assertion that assumes a queue or inactive nodes must be scoped to
  the other three playstyles. Review every such test, keep what is true for
  steal, and scope the rest explicitly.

New tests (in a new `src/rules/steal.test.ts`, plus `gameState.test.ts`
and `endOfTurn.test.ts` cases):

- A steal game at each node count opens with exactly 2N node squares, all
  `"prospective"`, level 0, each signal 0…N−1 appearing exactly twice, no
  `"charged"` / `"inactive"` / `"depleted"` square, no rotators, and every
  first square in the strict pool (interior C3–M13).
- The two squares of each signal are never adjacent; no square is on or
  beside a planet or under a ship.
- The deal consumes exactly 2N seed steps (compare `randomSeed` with the
  seed advanced 2N times), and the bonus deal follows unchanged when on.
- The same seed deals the same steal board.
- The other three playstyles' starting states are **identical** to what
  they were before this step for a handful of fixed seeds (snapshot `nodes`
  and `randomSeed` before editing, and assert equality after) — the S2
  guard.
- `runEndOfTurn` on a steal state pays power and energy exactly as today,
  raises no other effect, and leaves `nodes`, `rotators` and `randomSeed`
  untouched.
- A move onto a prospective square is refused (for now).

Depends on: Step 3 (the deal's second squares use the draw). Step 5 builds
the two events on this state shape and these helpers.

Verification (automated): the full suite is green with the new cases, and
with every pre-existing test for the other three playstyles passing
unmodified except where it enumerates the playstyles.

---

### Step 5 — Claiming and abandoning a node

Status: committed

Notes: `steal.ts` gained `claimNode` and `abandonNode` (steal.md §§3-4), each
pure, taking the node map as it stood immediately before the event, the
signal, the square claimed or vacated, the board's ship squares once the move
has resolved, and a seed; each returns the updated node map, the next seed
and the squares the event changed (`releasedSquare`/`discardedSquare` for a
claim, nothing extra for an abandon beyond `newProspective`) — one
`drawStealProspectiveSquare` call each, so one seed step. `ply.ts`'s
`applyMove` branches on `state.nodePlaystyle === "steal"` in place of the
exit-depletion/countdown-start block: it abandons the left node when the
ship left a charged square and the destination is not that same node's own
prospective, then claims the destination's node when it is a prospective
square of any signal — abandon first, per D4 — threading `randomSeed`
through both and building the `NodeClaimedEffect` (`shipId`, `side`,
`signal`, `square`, `releasedSquare`?, `strandedShip`?, `discardedSquare`?,
`newProspective`) and `NodeAbandonedEffect` (`signal`, `square`,
`newProspective`) added to `MoveEffect` in `ply.ts`, with `strandedShip`
computed from the post-move ship list rather than by `steal.ts`, which knows
nothing about ships beyond their squares. `assertFightInvariants` now also
throws if a node's `signal` changes across a fight. `movement.ts` no longer
refuses a `"prospective"` destination; its doc comment says why. Everything
that switches on `MoveEffect` does so by `.find`/`.filter`, not an exhaustive
switch, so `boardAnimations.ts` and `announcements.ts` needed no change;
`EnergyOverlay.tsx`'s one explicit effect union did, and gained the two new
members. Tests: ten new cases in `ply.test.ts` (a new describe block) cover
claiming Open and Held nodes, relocating a holder's own node, abandoning,
the combined abandon-then-claim ordering (recomputed independently against
`steal.ts`'s own functions, per the step's own suggested approach), a
friendly ship stranding a different friendly ship, a Held node never
carrying a countdown over 20 rounds of a shuttling holder, that none of the
other three playstyles' node effects are ever raised and a planet landing
rotates nothing, that a fight changes no node's signal, and that a ship on a
steal charged square is refused an attack exactly as under the other
playstyles; `buildState` gained an optional `rawNodes` escape hatch since its
existing `nodes` config has no way to carry a `signal`. Eight new cases in
`steal.test.ts` test `claimNode` and `abandonNode` directly (Open vs Held,
the weighted draw's own inputs, seed-step count, determinism), mirroring how
`nodePlacement.test.ts` tests the draw itself. One pre-existing
`movement.test.ts` case ("refuses landing on a prospective node") was
rewritten to "permits landing on a prospective node, which claims it under
steal" now that Step 5 opens that destination — this is exactly the update
Step 4's plan text flagged as its own to make. No other deviation from the
plan. `npm run typecheck`, `npm run lint`, `npm run format:check` and the
full `npm test` (79 files, 1576 tests, up from the 1558-test baseline by 18)
are all green.

Implement STEAL's two events as a move resolves (steal.md sections 3–5;
S7, D4, D6), and open prospective squares to landing.

What to implement:

- **`steal.ts`** gains the two transitions, each pure, taking the game
  state after the ship has been moved (so ship squares are current) and
  returning the new node map, the next seed and the effect:
  - **Claim** of signal k at square P by the moving ship: P becomes `{
    state: "charged", level: 0, signal: k }`; if node k had a charged
    square C, remove C from the map (it becomes ordinary board; any ship on
    it stays where it is); remove node k's other prospective square if
    there was one (the Open case); then draw one fresh prospective with
    Step 3's draw — anchor P, occupied = every node square now in the map,
    `S` = every square of the other signals, ships = current ship squares —
    and add it as `{ state: "prospective", level: 0, signal: k }`. One seed
    step. Effect `node-claimed` per D6, including `strandedShip` when C
    still has a ship on it.
  - **Abandon** of node k's charged square C: remove C from the map; draw
    a second prospective — anchor = node k's remaining prospective,
    occupied / `S` / ships as above — and add it. One seed step. Effect
    `node-abandoned` per D6.
- **`ply.ts` `applyMove`**: when `state.nodePlaystyle` is `"steal"`, after
  building the moved ships, and in place of today's two node checks (exit
  depletion and countdown start, which must not run under steal):
  1. If the ship left a charged square of signal A **and** the destination
     is not a prospective square of signal A, run the abandon for A.
  2. If the destination is a prospective square (of any signal, A
     included), run the claim for its signal.
  Thread the seed through both, set `randomSeed` on the state, and push the
  effects in D6's order ahead of the planet-bonus claim (which cannot fire
  on the same square) and the end of the ply. Under the other three
  playstyles `applyMove` behaves exactly as today. Update the module header
  and `applyMove`'s doc comment to describe the steal branch, and add the
  two effect interfaces with doc comments in the style of `NodeSpentEffect`.
- **`movement.ts`**: remove Step 4's refusal; a `"prospective"` destination
  is legal. Update `moveRefusalReason`'s doc comment (inactive and depleted
  are refused; prospective, which only exists under steal, is not). The
  movement hints and `legalMoves` follow automatically.
- **`assertFightInvariants`** in `ply.ts` additionally checks that no
  node's `signal` changes in a fight. `applyAttack` needs no steal branch:
  an attack can neither vacate a charged square nor land on a prospective
  one (D6); `rotateForLanding` already does nothing unless the playstyle is
  planet or dedicated.
- Make sure `boardAnimations.ts`, `announcements.ts` and anything else that
  walks a move's effects compiles and ignores the two new effect types for
  now (Step 9 gives them words; D7 gives them no animation).

Tests (in `steal.test.ts` and `ply.test.ts`), each on a hand-built steal
state so the squares are known:

- **Claiming an Open node**: the landed square is charged, carrying the
  node's signal, with the ship on it; the node's other prospective is gone;
  exactly one new prospective with that signal exists, legal (widened pool)
  and not adjacent to any node; the node now has one charged and one
  prospective square; one seed step; `node-claimed` carries
  `discardedSquare` and no `releasedSquare`.
- **Stealing a Held node**: red lands on the prospective of a node green
  holds. The old charged square is no longer in `state.nodes`; green's ship
  still stands there; on green's next ply that ship has legal moves and is
  not trapped; `node-claimed` carries `releasedSquare` and `strandedShip`
  (green's ship).
- **Relocating one's own node**: the holder moves onto its own node's
  prospective; the old square is ordinary; the node is still Held (one
  charged, one prospective); no `node-abandoned` is raised; one seed step.
- **Abandoning**: the holder walks onto an ordinary square; the vacated
  square is ordinary; the node now has two prospective squares, the new one
  anchored on the survivor; one seed step; `node-abandoned` raised.
- **Abandon and claim in one move** (D4): the holder of node A moves onto
  node B's prospective; effects are `node-abandoned` (A) then
  `node-claimed` (B); two seed steps; A's new prospective is not the
  destination and was drawn before B changed (assert by recomputing A's
  draw independently against the pre-claim board with the first seed).
- A friendly ship landing on the prospective of a node its own side holds
  strands its own ship, per the rule's "held by anyone".
- A held charged square under steal never carries a countdown: over many
  plies of the holder staying put, `level` stays 0, the node never
  depletes, and the holder collects every turn.
- No `node-spent`, `node-ran-out`, `node-charged`, `queue-refilled`,
  `queue-rotated`, `node-retired`, `ship-trapped` or `node-relief` effect is
  ever raised in a steal game; landing on a planet rotates nothing.
- Combat on: a ship on a steal charged square can neither attack nor be
  attacked (unchanged); a fight changes no node.
- The other three playstyles: existing `applyMove` tests pass unchanged.

Depends on: Step 4 (state shape, helpers, deal). Step 6 plays whole games
on these rules; Step 9 words the effects.

Verification (automated): the full suite is green with the new cases.

---

### Step 6 — Whole STEAL games, replay, and the placement figures

Status: committed

Notes: `fullGame.test.ts` — extended `choosePly`'s node-seeking step and
`distanceToNearestChargedOrInactive` to treat a `"prospective"` square as a
landable/target node (harmless to the other three playstyles, since that
state only ever appears under steal); added an `onEffects` hook to
`PlayFullGameOptions`; added `assertStealNodeInvariants` (each of the game's
signals always has exactly two squares, charged+prospective or two
prospective, level always 0, no rotator ever laid down) and a new
`describe.each(CHARGED_NODE_COUNTS)` × `it.each([true, false])` block playing
hundred-round steal games at both combat settings, proving the invariant
holds at every ply, at least one claim and one steal happened (not vacuous),
no `ship-trapped` effect was ever raised, and each side's energy total only
ever rose. Reworded `assertNoInactiveOrDepletedNodes`'s comment, stale since
Step 5 (it still said claiming was refused). `seededReplay.test.ts` — added
the 0.39 seed-stream paragraph; a local `chooseStealPly` (attack first, then
the nearest prospective square) and `playSeededStealGame`, recording the
opening board and the ordered sequence of `node-claimed`/`node-abandoned`
events; a new describe block proving a forty-round steal game is not vacuous
(≥10 claims, ≥5 steals, ≥5 abandons, ≥1 fight, this run's own measured
40/22/15/8), replays identically from the same seed and diverges from a
different one. `stealPlacement.test.ts` (new) re-measures the mean distance
between a node's two squares and the outer-edge share at each node count
over 2,000 deals a count at the default fleet (five a side), banded around
figures re-measured by an improvised, uncommitted 20,000-deals-per-count
script in the scratchpad; separately proves the fallback never fires at the
worst case (six a side, five nodes) — 2,000 opening deals, and a handful of
whole games (3 seeds, up to 2,000 plies each) checking every claim's and
abandon's fresh prospective square, 287 events checked, fallback never
fired — using an ordinary-constraint check reimplemented independently of
`legalNodePool`, mirroring `nodePool.test.ts`'s own argument. The typical and
worst-case sections use many independently seeded single-shot deals rather
than `nodePool.test.ts`'s small fixed `SEEDS` array run long — a deliberate
difference, not an oversight: steal's opening-deal geometry has no long-run
economy to drive, so many independent deals are the natural way to get a
stable mean, where the queue's figures need sustained play instead. The
re-measured figures differ from `story.md`'s pre-implementation estimates by
more than rounding, especially the edge-share figures (off by 5–7 points,
since the story's idealised measurement did not account for the app's own
five-ship fleet blocking part of the rim): `story.md`'s table is corrected in
place to the re-measured figures, and both the story's and code's numbers,
plus the argument and the worst-case finding, are recorded in
`doc/ruleset/tech-notes.md`'s new "Placing prospective nodes under steal"
section. No other deviation from the plan. `npm run typecheck`,
`npm run lint`, `npm run format:check` and the full `npm test` (80 files,
1590 tests, up from the 1576-test baseline by 14: 6 in `fullGame.test.ts`, 3
in `seededReplay.test.ts`, 5 in `stealPlacement.test.ts`) are all green.

Prove STEAL end to end at the rules level and record the placement figures.

- **`fullGame.test.ts`**: now that claims work, the steal game in the
  playstyle `describe.each` really takes and loses nodes. Assert, for a
  steal game played to its last round (combat off and combat on) at each
  node count: it ends normally at the chosen round count; at every ply
  every signal has exactly two squares, one charged and one prospective or
  two prospective; no square is ever `"inactive"` or `"depleted"`; no ship
  is ever trapped; no charged square ever has `level` above 0; `rotators`
  is always empty; at least one claim and one steal (a claim with a
  `releasedSquare`) happened, so the test is not vacuous; energy only ever
  rises. If the file's deterministic policy never lands on prospective
  squares, extend it minimally (for example, prefer a legal move onto a
  prospective square when one exists) for steal games only.
- **`seededReplay.test.ts`**: add a steal game, played twice from the same
  seed with the same policy, producing identical states and identical
  sequences of `node-claimed` / `node-abandoned` effects (squares and
  `newProspective`), and a different seed producing a different game —
  exactly the property the file already proves for the other playstyles.
  Update the header comment's seed-stream narrative with a short paragraph
  for 0.39: under steal the deal draws 2N steps, each claim and each
  abandon one, and the end of a turn none.
- **Placement figures** (S15, D10): a new long-run test,
  `src/rules/stealPlacement.test.ts`, in the style of `nodePool.test.ts`:
  - **Typical figures, default fleet (five a side)**: deal steal boards
    across enough seeds to be stable while keeping the file under about ten
    seconds (around 2,000 deals per node count) and, at each count, assert
    that the mean Chebyshev distance between a node's two squares, and the
    share of second squares on the outer edge, each lie in a band around
    the re-measured figures below (for example ±1.0 on the distance and ±8
    percentage points on the edge share); and that every first square is in
    the strict interior.
  - **Worst case, largest fleet (six a side), five nodes**: across the same
    number of deals, every dealt square satisfies §3.2's ordinary
    constraints with 3 and 4 lifted (recomputed independently, so the
    fallback demonstrably never fired). Also run a sample of whole steal
    games at six a side and five nodes and check every claim's and
    abandon's new prospective the same way, recording in Notes whether the
    fallback ever fired mid-game.
- **Re-measure, then record** (S15): before writing the bands, run an
  improvised 20,000-deal measurement at the default fleet of five a side (a
  throwaway script in the scratchpad, not committed) against the real code,
  with and without the edge halving (the "without" run by a local tweak in
  the throwaway script only). Then add a section to
  `doc/ruleset/tech-notes.md`, "Placing prospective nodes under steal",
  after "Sizing the queue": the re-measured table (deals needing the
  fallback, mean distance between a node's two squares, second square on
  the outer edge, at three, four and five nodes), the unhalved comparison
  and what it shows, the fleet the measurement ran against, the worst-case
  finding at six a side, and a line naming the test that guards the
  neighbourhood. If the re-measured figures differ from `story.md`'s by
  more than rounding, say so in the section and in this step's Notes, and
  correct `story.md`'s table in place to the re-measured figures (the story
  records what was built).

Depends on: Step 5 (claims and abandons must exist for whole games and
replay to mean anything).

Verification (automated): the full suite is green with the new and
extended cases; the improvised measurement's output is summarised in this
step's Notes.

---

### Step 7 — The board presents signals as colours

Status: committed

Notes: Added `SignalColors` (`core`/`rim`) and the ordered `SIGNAL_COLORS`
palette (gold, silver, mid blue, purple, off white, at the plan's starting
values) plus a `signalColors` accessor to `src/board/squareArt.ts`.
`NodeMarker.tsx` gained an optional `signal` prop: a prospective marker draws
its three rings in the signal's core colour when given one, falling back to
`INACTIVE_RING_COLOR` when not (so the pre-existing state-iteration tests that
render a prospective marker with no signal stay green unmodified); `charged`
now resolves through `nodeArtwork`'s widened signature (state, cyclePosition,
optional signal), which special-cases a charged square carrying a signal to
the new `STEAL_CHARGED_BALL_RADIUS` (48) and the signal's core/rim gradient
stops before falling through to today's gold artwork when no signal is given
— today's charged/depleted rendering is provably untouched, since neither
gains a code path that can run without a `NodeSignal` being passed in, and no
existing caller passes one. `BoardSquareProps` gained the same optional
`signal`, threaded straight to `NodeMarker`; `Board.tsx` reads
`nodeStatus?.signal` and passes it down alongside the existing `nodeState` and
`priority`, the same way `priority` is already read from the square's
`NodeStatus`. Added a "From story 101" section to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` (appended after
the story-97 section, matching the file's append-in-implementation-order
convention rather than numeric story order) recording the colour-alone gap
per D9/S12. Test additions: `NodeMarker.test.tsx` gained a per-signal
prospective-ring-colour case and a per-signal charged-ball case (radius 48,
core/rim stops) plus one case confirming a signal-less charged marker still
draws today's radius; `BoardSquare.test.tsx` gained one case that a signal
passed to `BoardSquare` reaches its marker's rings; `Board.test.tsx` gained a
`stateWithStealNodes` helper (mirroring the existing `stateWithNode` /
`stateWithRotators` pattern) and a new describe block covering a prospective
node's per-signal ring colour, a charged steal node's radius-48 ball with no
countdown number rendered, and that a steal square's accessible name states
only "prospective node" / "charged node" with no colour or signal in words.
No deviation from the plan. `npm run typecheck`, `npm run lint`,
`npm run format:check` (after `prettier --write` on the two touched test
files it flagged) and the full `npm test` (80 files, 1609 tests, up from the
1590-test baseline by 19: 11 in `NodeMarker.test.tsx`, 1 in
`BoardSquare.test.tsx`, 7 in `Board.test.tsx`) are all green; every
pre-existing `NodeMarker` / `BoardSquare` / `Board` expectation for the other
three playstyles passed unmodified.

Give STEAL its look, using starting values that Step 8 settles with the
owner. The other three playstyles' markup must not change (D8).

- **The palette** (S11). Add to `src/board/squareArt.ts` (which already
  holds the board's square-level colours) the board view's mapping from
  `NodeSignal` to colour: an ordered list of five entries, one per signal —
  gold, silver, mid blue, purple, off white — each carrying what the
  charged ball's radial gradient needs (a core colour and a rim colour,
  mirroring today's gold `#DAA520` core and `#F5DEB3` rim) and the colour
  its prospective rings are drawn in. Starting values, for the owner's eye:
  gold as today's charged artwork; silver bright and polished (core around
  `#D8DCE3`, rim `#FFFFFF` — not the depleted `#808080`); mid blue (core
  around `#3F7FE0`, rim around `#B5CFF5`); purple (core around `#8E55D6`,
  rim around `#D6C2F2`); off white (core around `#EEE8D0`, rim `#FFFFFF`).
  Ring colour = core colour. Comment it as how the board presents each
  steal signal; say nothing about how the values were chosen.
- **`NodeMarker.tsx`** takes an optional `signal` (the `NodeSignal`) and
  resolves it through the palette (D8):
  - `"prospective"`: all three rings (`INACTIVE_RING_RADII`, same stroke
    width) in the signal's ring colour, replacing Step 4's stub.
  - `"charged"` **with** a signal: the same gradient structure as today's
    charged artwork, with the signal's core and rim colours, and a radius
    of **48** (a named constant for the steal ball's radius, beside the
    existing ring constants, described as a starting value for the owner's
    eye).
  - `"charged"` without a signal, `"inactive"` and `"depleted"`: exactly as
    today.
  - Update the header comment to describe the steal markers.
- **`Board.tsx` / `BoardSquare.tsx`**: read `signal` off the square's
  `NodeStatus` and pass it through `BoardSquare`'s props to `NodeMarker`.
  `BoardSquareProps` gains the optional signal, documented as present only
  under steal.
- **Accessibility note.** Add a section to
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`, "From story
  101 — Steal", following the existing sections' format (Sources line, a
  numbered heading, prose, a Where line): under steal, signals are
  presented by colour alone, so which prospective square belongs to which
  node is carried by colour alone — no non-colour distinction on the board,
  and nothing in the accessible grid's square labels tying a prospective
  square to its node (labels say only "prospective node" or "charged
  node"). Where: `src/board/NodeMarker.tsx`, `src/board/squareArt.ts`,
  `src/board/squareLabel.ts`. Do not add an accessibility test step
  (`CLAUDE.md`).

Tests (in `NodeMarker.test.tsx`, `BoardSquare.test.tsx`, `Board.test.tsx`):

- A prospective marker draws three rings, stroked in its signal's palette
  colour, for each of the five signals.
- A charged marker with a signal draws radius 48 with that signal's
  gradient stops; a charged marker without one draws radius 70 and today's
  stops exactly (the existing tests already pin this — keep them green,
  unmodified).
- On a steal board the square holding a prospective node renders the
  coloured rings, and after a claim the charged square renders the coloured
  ball; square labels read "prospective node" / "charged node" and name no
  colour.
- No countdown number is rendered anywhere on a steal board.

Depends on: Step 5 (claims produce charged steal squares to draw). Step 8
tunes these values.

Verification (automated): the full suite is green with the new cases, and
every pre-existing `NodeMarker` / `BoardSquare` / `Board` expectation for
the other three playstyles passes unmodified.

---

### Step 8 — The colour and size gate

Status: committed

Notes: **Pass 1**, in response to the owner's feedback on Step 7's starting
artwork. Three changes in kind, all accepted from the owner rather than
re-decided here:

1. **The charged ball's size is dropped from this gate.** The owner rejected
   Step 7's smaller radius-48 ball outright: a steal charged node now draws
   **exactly** the other three playstyles' own starting charged shape —
   radius 70, overflowing and cropped to the square, its middle gradient
   stop fixed at `CHARGED_START_OFFSET_PERCENT` (25) — in the signal's core
   and rim colours, and it never travels with `cyclePosition`, since a steal
   node has no countdown to travel towards. `STEAL_CHARGED_BALL_RADIUS` is
   gone. `NodeMarker.tsx`'s `nodeArtwork` now builds both the gold shape and
   a signal's shape through one shared `chargedShape(core, rim,
   middleOffsetPercent)` helper, so the two are one shape with different
   colours and offsets rather than two typed-out balls. `story.md`'s "about
   48" ball-size passages are corrected in place to say a steal charged node
   uses the same starting ball as the other three playstyles, in the
   signal's colours, and never grows.
2. **A steal claim now plays the existing charge ("explosion") animation**
   (superseding D7 — see D7, corrected above with what the owner asked for
   at this step). `NodeChargeAnimation` (`boardAnimations.ts`) gained an
   optional `signal` alongside its existing optional `priority`; a
   `node-claimed` effect now produces one for the claimed square, carrying
   the node's signal; `NodeMarker`'s charging branch draws all three
   outgoing rings in the signal's colour when given one, instead of
   `priority`'s ring count in gold, revealing the signal-coloured charged
   artwork beneath. Nothing is raised for `node-abandoned` or for the
   square a claim released, as the owner asked. `story.md` carried no "no
   animations under steal" statement to correct — that reasoning lived only
   in the plan's D7.
3. **The palette.** Off white is replaced by a tan-coloured brown (core
   `#A87A4C`, rim `#DEC4A0`), clearly distinct from gold; silver is darkened
   from a near-white `#D8DCE3` core / `#FFFFFF` rim to `#A9B0BB` core /
   `#E4E8EE` rim, so it no longer reads as white. `squareArt.ts`'s palette
   comment now lists gold, silver, mid blue, purple, brown.
   `story.md`'s colour list is corrected in place from "off white" to
   "brown", and its "Silver and off white are the pair most at risk of
   reading alike" sentence — which no longer names a real pair now that off
   white is gone — is corrected to name silver against the other
   playstyles' depleted grey instead, matching this step's own verification.

Rejected in this pass: the radius-48 ball (too small, per point 1 above);
off white `#EEE8D0` core / `#FFFFFF` rim (too close to white); silver
`#D8DCE3` core / `#FFFFFF` rim (also read as white). The owner asked for all
three changes above by direct instruction rather than by approving a
document first, so there is no separate "what the owner said" to quote
beyond the changes themselves.

Pass 2: the owner judged the pass-1 brown (core `#A87A4C`, rim `#DEC4A0`)
too close to gold, and asked for it a little darker while still showing up
well against the board's dark background. Brown is now core `#94602F`, rim
`#D0A77C`; the other four colours, the ball and the animation were
accepted.

Step 7's tests are updated to the new values throughout (`NodeMarker.test.tsx`,
`boardAnimations.test.ts`, `Board.test.tsx`): the steal-ball cases now assert
radius 70 and a fixed middle-stop offset, with a new case proving
`cyclePosition` never moves it; a new `boardAnimations.test.ts` case proves a
`node-claimed` effect produces a `node-charge` animation carrying the
signal, and a companion case proves `node-abandoned` produces none; a new
`NodeMarker.test.tsx` case proves the charging branch draws all three
outgoing rings in the signal's colour and reveals that signal's charged
artwork. `SIGNAL_COLORS` itself is imported by the colour-bearing tests
rather than pinned as literals, so the palette edit needed no further test
changes beyond the ball-size and animation cases above. Every pre-existing
test for the other three playstyles passes unmodified. `npm run typecheck`,
`npm run lint`, `npm run format:check` and the full `npm test` (80 files,
1619 tests, up from the 1609-test baseline by 10) are all green.

Not yet done: the owner's own visual re-check of this pass, which is why
this step's Status is `implemented` and not `committed` — a further pass may
follow if the re-check finds something to change.

Settle the five colours and the steal ball's radius with the owner, looking
at a running board (S11). Expect more than one pass. Only the palette
values in `squareArt.ts` and the steal ball's radius constant in
`NodeMarker.tsx` change here; if the owner asks for a change in kind (a
different gradient structure, a stroke, a different ring treatment), make
it, keep the other playstyles' artwork untouched, and record it in Notes.

After each pass, update Step 7's tests to the new values and keep the full
suite green before handing back. In Notes, record the final values and a
line on each rejected pass (what was tried, what the owner said), because
this plan is the only place that history will live. If the final palette
no longer matches `story.md`'s list of five colours or its "about 48"
figure, correct `story.md` in place to what was built.

Depends on: Step 7 (the artwork to tune).

Verification (manual): the owner runs `npm run dev`, starts a game with
Node playstyle STEAL and **Charged nodes 5**, and confirms:

- all five colours can be told apart at board scale — silver against the
  other playstyles' depleted grey judged specifically (start a PLANET game
  in another tab to compare);
- a prospective square is tellable from a charged one at a glance, for
  every colour;
- the charged ball, at the same size the other three playstyles use, reads
  clearly in each signal's colour, and a ship on it remains clearly
  visible;
- claiming a node plays the charge animation — the outgoing rings dissolve
  in the signal's colour into the charged ball — and nothing animates on
  the square a claim released or an abandon vacated;
- at four and three nodes, the first four and first three colours are
  used;
- a CONTINUOUS, PLANET or DEDICATED game looks exactly as it does on
  `main` (gold ball, gold rings, grey depleted, countdown numbers, the
  existing charge animation only on a queue node charging).

---

### Step 9 — The live region says a node was taken or given up

Status: committed

Notes: Added `nodeAbandonedClause` and `nodeClaimedClause` to
`src/board/announcements.ts`, plus their `…ClauseText` wrappers that pull the
effect (if any) out of a move's effect list, and wired both into
`moveSentence` between the existing `node-spent` clause and the planet-bonus
clause — abandon before claim, matching D6's effect order (they never
co-occur with `node-spent`, since that effect never fires under steal). The
claim clause reads its shape off which optional fields the effect carries:
no `releasedSquare` (an Open node) says only the square taken; a
`releasedSquare` with no `strandedShip` (a holder relocating its own node,
the only way a released square ends up empty) says "moves its node from …
to …"; a `releasedSquare` with a `strandedShip` names the square as no
longer a node and the stranded side's ship left standing there, adding
"from {side}" only when the stranded side differs from the claiming side —
covering the friendly-ship-stranding case Step 5 introduced, which the
story's own four suggested shapes did not name a wording for. No colour or
signal is named anywhere, per D9. Six new cases added to
`announcements.test.ts` matching the four suggested shapes (unheld claim,
steal, relocation, abandon) plus the combined abandon-then-claim move and the
same-side strand naming the right side; all pre-existing announcement tests
for the other three playstyles pass unmodified. No deviation from the plan.
`npm run typecheck`, `npm run lint`, `npm run format:check` and the full
`npm test` (80 files, 1625 tests, up from the 1619-test baseline by 6) are
all green.

Give `node-claimed` and `node-abandoned` player-facing sentences in
`src/board/announcements.ts`, spoken as part of the move's announcement in
the same way the `node-spent` sentence is spoken today, and in effect
order (abandon, then claim). The player's words: "turn", "node", "ship";
no colour and no signal is named (D9). The story asks for a sentence naming
the square taken, the square given up and, where there was one, the ship
left standing. Suggested shapes, which the implementer may refine for flow:

- claim of an unheld node: "Green takes the node at F9."
- steal: "Red takes the node at F9 from green. F4 is no longer a node;
  green's ship there is on an ordinary square."
- relocation: "Green moves its node from F4 to K11."
- abandon: "Green gives up the node at F4."

A new prospective square is not announced separately (it is part of the
event, and there is no name to say it by).

Tests in `announcements.test.ts`: one case per shape above, the
abandon-and-claim move producing both sentences in order, and a same-side
strand naming the right side. Existing announcement tests for the other
playstyles pass unmodified.

Depends on: Step 5 (the effects exist).

Verification (automated): the full suite is green with the new cases. (No
manual check of live-region wording — the owner does not test
announcements by hand.)

---

### Step 10 — The Quick Guide's STEALING NODES section

Status: committed

Notes: Added `"stealingNodes"` to `GuideSectionId`, inserted the section into
`GUIDE_SECTIONS` between NEW CHARGED NODE SELECTION and PLANET BONUS with the
draft paragraph from this step verbatim, and gave NODE LIFECYCLE and NEW
CHARGED NODE SELECTION's paragraphs an opening "Under the Continuous, Planet
and Dedicated playstyles, …" clause (folded into each paragraph's first
sentence rather than a separate sentence). Updated the module's doc comments
and provenance line ("five" → "six" sections; a line noting STEALING NODES's
paragraph was drafted for story 101, step 10). Added `StealingNodesDiagram`
to `guideDiagrams.tsx`, built from `BoardSquare` cells exactly as its
neighbours are: signal 0 throughout (steal.md's first signal) — a charged
square holding green's ship, that node's prospective square, and an ordinary
square holding red's ship poised beside it; an arrow; then green's ship left
on the now-ordinary square and red's ship on the newly charged square, in
the same signal's colours (radius 70, per Step 8's settled artwork, since
Step 8 dropped the smaller radius-48 ball this task's briefing anticipated
correcting for). Updated the module header to name this diagram as the one
exception showing a red ship. Wired `stealingNodes: StealingNodesDiagram`
into `GuideScreen.tsx`'s `SECTION_DIAGRAMS` and updated its "five" → "six"
doc comments. Updated existing tests for the new section/paragraph counts
(`guideCopy.test.ts`: six headings, the two clauses reworded, a new case for
the stealing-nodes paragraph verbatim with no "signal" in it; `GuideScreen.test.tsx`:
six headings, seven paragraphs, eight diagrams, a new case placing STEALING
NODES right after NEW CHARGED NODE SELECTION and asserting its diagram's
marker/ship counts; `guideDiagrams.test.tsx`: a new case asserting the
diagram's two charged balls and one prospective ring draw in signal 0's
palette colours, drawing directly on `SIGNAL_COLORS` rather than a literal,
and that the before/after ships sit on the right squares). No deviation from
the plan otherwise. `npm run typecheck`, `npm run lint`, `npm run format:check`
(after `prettier --write` on `guideDiagrams.test.tsx`, which it flagged) and
the full `npm test` (80 files, 1628 tests, up from the 1625-test Step 9
baseline by 3: one each in `guideCopy.test.ts`, `GuideScreen.test.tsx` and
`guideDiagrams.test.tsx`) are all green. This step's verification is manual
(the owner reviewing the draft paragraph and diagram); that gate is the
orchestrator's to arrange, not this task's.

Add a sixth headed section, **STEALING NODES**, with its own diagram, and
the two clauses on the existing node sections (S14, D11).

- **`src/guide/guideCopy.ts`**: `GuideSectionId` gains `"stealingNodes"`;
  `GUIDE_SECTIONS` gains the section **after** NEW CHARGED NODE SELECTION
  and before PLANET BONUS, so the node sections read together; the doc
  comments that say "five headed sections" say six. NODE LIFECYCLE's
  paragraph gains an opening clause such as "Under the Continuous, Planet
  and Dedicated playstyles, …"; NEW CHARGED NODE SELECTION's paragraph
  gains the same clause (its closing sentence already says Node playstyle
  from Step 2). Draft paragraph for STEALING NODES, in the guide's own
  vocabulary, not saying "signal" and naming no particular colour (D9 — the
  guide may say "colour"), for the owner to edit or approve at this step's
  gate:

  > Under the Steal playstyle, every node always shows two squares, and a
  > node's two squares are the same colour. A node nobody holds shows two sets
  > of rings. Land a spaceship on either set to charge the node there: the
  > other set disappears, and a new set appears elsewhere on the board. You
  > gain points every turn you stay, and the node never runs out. But your
  > opponent can take it by landing on its rings — your spaceship is left
  > on an ordinary square. If you leave the node yourself, it goes back to
  > two sets of rings, for whoever reaches one first.

  Update the header comment's provenance line to say the STEALING NODES
  copy was written for the steal playstyle (story 101's plan) — keep the
  existing provenance lines.
- **`src/guide/guideDiagrams.tsx`**: a new `StealingNodesDiagram`, built
  from real `BoardSquare` cells like its neighbours, using the first signal
  (so it shows in the palette's first colour): before — a green ship on a
  charged square, and a prospective square of the same signal beside it
  with a red ship next to it; an arrow; after — the green ship on a bare,
  ordinary square, and the red ship on the now charged square. Use the
  existing cell kinds (`square`, `arrow`, `empty`); lay it out in as few
  rows as reads clearly. This diagram shows a red ship, which the module
  header says no diagram does — update the header to name this one as the
  exception, because a steal needs both sides to make sense (accepted by
  the owner).
- **`src/guide/GuideScreen.tsx`**: `SECTION_DIAGRAMS` gains
  `stealingNodes: StealingNodesDiagram`; update its "remaining five
  sections" comment.
- Tests: `guideCopy.test.ts` (six sections, order, the new heading, the two
  clauses), `guideDiagrams.test.tsx` (the new diagram renders coloured
  rings and a coloured ball, and a red ship), `GuideScreen.test.tsx` (six
  `h2` headings, STEALING NODES among them in the right place).

Depends on: Step 8 (the diagram draws the settled colours), Step 2 (the
closing sentence already renamed).

Verification (manual): the owner runs `npm run dev`, opens the Quick Guide
from the start screen, and confirms: there are six headed sections with
STEALING NODES after NEW CHARGED NODE SELECTION; its paragraph reads as they
want it (editing the draft here if not — record the final wording's
provenance in Notes); the diagram reads as a steal at a glance; NODE
LIFECYCLE and NEW CHARGED NODE SELECTION each say they describe the other
three playstyles; NEW CHARGED NODE SELECTION ends "depending on the Node
playstyle selected".


Owner's gate: approved the draft paragraph as written, and the diagram —
judged a little confusing, but accepted for want of a clearer way to show a
steal.

---

### Step 11 — `README.md`

Status: committed

Notes: Done inline by the orchestrator through `/update-readme`. The
start-screen list names the node playstyle with steal among its four
settings; the opening node paragraph and the status block's playstyle
passage each gain a short steal description (no colour named); the rules
section links `doc/ruleset/steal.md`.

Run the `/update-readme` command, which reviews the branch diff and updates
`README.md` if warranted. Expected at minimum:

- the start-screen list of choices (which today says "how the waiting
  nodes' rings move (continuous, planet or dedicated…") names the **node
  playstyle** and adds steal;
- the node paragraphs that say a node cannot be handed back or inherited,
  and that walking away ends it, gain a sentence that the steal playstyle
  plays nodes differently — held for as long as you can keep them, taken by
  landing on their rings — with no colour named;
- **"The rules"** section, which links only `doc/ruleset/rules.md` as the
  full rulebook, also links `doc/ruleset/steal.md` as the steal
  playstyle's node rules (D12).

Player-facing language; say "turn"; name no default beyond what the README
already says about what the app preselects.

Depends on: Steps 1–10 (the README describes the finished behaviour and
ruleset).

Verification (automated): `npm run format:check` and the full suite green;
`grep -n -i "rotation\|steal\|playstyle" README.md` shows the choice named
as node playstyle with steal among its settings, and
`grep -n "steal.md" README.md` shows the rules section linking it.

---

### Step 12 — The opening deal keeps second squares off the outer two rings

Status: committed

Notes: `steal.md` §7 now says the opening deal's second square is drawn by
§6's weighted rule over rules.md §3.2's **strict** pool, falling back to §6's
widened pool (and from there to §3.2's own fallback) only where the board
leaves no strict square; §6 gained a one-line pointer to this exception. No
new version: folded into the existing 0.39 `changelog.md` entry's `steal.md`
summary bullet, per the one-bump-per-branch rule; `RULES_VERSION` and
`rulesVersion.test.ts` untouched. Code: `nodePlacement.ts`'s `legalNodePool`
was split into two private helpers, `constrainedNodePool` (the six-constraint
filter at a given ring exclusion, no fallback) and `universalFallbackPool`
(§3.2's own fallback), which `legalNodePool` now composes exactly as before —
no behaviour change to any existing caller. A new
`drawStealOpeningProspectiveSquare` tries `constrainedNodePool` at the strict
exclusion first and only calls `legalNodePool(..., "widened")` (which itself
falls to the universal fallback) when that is empty, weighting either pool by
the unchanged `stealProspectiveWeight`; `steal.ts`'s `dealStealOpeningBoard`
calls it in place of `drawStealProspectiveSquare` for every signal's second
square, leaving the first-square draw, `claimNode` and `abandonNode`
untouched (they keep drawing from the widened pool, unaffected). Re-measured
against the real code (an improvised, uncommitted script in the scratchpad,
20,000 deals per node count at the default fleet, plus 20,000 more at the
largest fleet and five nodes for the worst case, plus ten seeded games up to
2,000 plies each for the mid-game figures): the opening deal's mean distance
between a node's two squares is now 5.47 / 5.52 / 5.53 at three, four and
five nodes (down from 6.73 / 6.82 / 6.91 when the second square drew from the
widened pool), the second square never once landed in the outer two rings at
any node count or fleet size — including the worst case — and mid-game draws
(a claim's or an abandon's fresh square, still widened-pool, still
edge-halved) average a distance of 7.88 from their anchor with 27% landing on
the outer edge. Recorded in `doc/ruleset/tech-notes.md`'s "Placing
prospective nodes under steal" section, split into an opening-deal table and
a new mid-game table, and `story.md`'s placement-figures table and opening
deal prose corrected in place to the same figures, with a short note on why
the change was made (rings on the rim while the middle sat empty).
`stealPlacement.test.ts` was restructured to match: the per-node-count
distance-band test now checks only the opening deal's mean distance (the
edge-share figure it used to check no longer means anything once it is zero
by construction) and asserts both opening squares sit in the strict interior
at the default fleet; a new `describe.each` block asserts no opening square,
first or second, ever lands in the outer two rings, at every node count
**and every fleet size** (3–6 a side, not just the default and the largest,
since the check is cheap) over 300 deals per combination; a new "claim and
abandon draws' placement figures" block measures the mid-game distance and
edge-share bands directly, reusing the existing greedy policy; the two
existing worst-case "fallback never fires" blocks are untouched and still
pass. `nodePlacement.test.ts` gained five cases for
`drawStealOpeningProspectiveSquare`: draws from the strict pool and never the
outer two rings when it has room; falls back to the widened pool when the
entire strict pool is occupied (forced by occupying all 51 strict-pool
squares as nodes, since `legalNodePool`'s own automatic fallback makes
`shipSquares` alone unable to demonstrate an empty strict tier from outside
the module — recorded here as the reason the test occupies nodes rather than
ships); seed-step count; determinism; and an exact weight-formula match over
the strict pool with four seeds, mirroring the widened draw's own test. No
existing opening-deal test was pinned to an exact square for a seed, so
nothing needed to move; the full suite's other steal tests (`steal.test.ts`,
`gameState.test.ts`, `fullGame.test.ts`, `seededReplay.test.ts`) passed
unmodified since none of them asserted exact squares either — a deviation
from the plan's expectation that pinned tests would need updating, recorded
because the plan called it out explicitly. No other deviation.
`npm run typecheck`, `npm run lint`, `npm run format:check` (after
`prettier --write` on `tech-notes.md`, which it flagged) and the full
`npm test` (80 files, 1646 tests, up from the 1628-test Step 11 baseline by
18: 5 in `nodePlacement.test.ts`, 13 in `stealPlacement.test.ts`) are all
green.

Added at Step 12's original play-through gate (now Step 13), from the
owner's own play: in a STEAL opening, rings turned up out on the board's
edge and corners even while plenty of the middle stood empty. Each node's
**first** opening square is already drawn from rules.md §3.2's strict pool
(steal.md §7), so the stray rings are the **second** squares, which §7
draws by §6's weighted rule over §6's widened pool — constraints 3 and 4
lifted, the outer edge and the ring one in from it both allowed. The owner
wants the opening deal's rings kept out of the outer two rings (rows 1, 2,
14, 15 and columns A, B, N, O) except as a last resort.

The decision (owner's): **only the opening deal changes.** A node's second
opening square is drawn by §6's weighted rule — the same two-term weight,
the same anchor, the same other-node term — but over rules.md §3.2's
**strict** pool (all six constraints). Only when the strict pool is empty
does it fall back to §6's widened pool, weighted exactly as today (outer
edge halved), and only when that too is empty to §3.2's own fallback, as
§6 already provides. Every prospective square drawn **during play** — the
fresh square of a claim, the second square of an abandon — is unchanged:
widened pool, edge halved. The edge halving therefore never matters in the
opening deal except in the fallback; say nothing more about it.

**Rejected:** applying the strict pool to every prospective draw. The owner
asked about the opening only, and the mid-game widened pool is what lets a
stolen node relocate a long way — §6's first term needs room to act.

- **Ruleset.** `doc/ruleset/steal.md` §7: the second opening square is
  drawn by §6's weighted rule over rules.md §3.2's strict pool, falling back
  to §6's widened pool (and from there §3.2's fallback) only when no strict
  square is legal. If §6's opening sentence reads as covering every draw,
  make it clear the opening deal's second square is §7's exception. This
  branch already bumped the ruleset to 0.39 (Step 1), and the project's rule
  is one version bump per branch: **no new version**, no `RULES_VERSION`
  change — fold the change into `changelog.md`'s existing 0.39 entry, in
  its `steal.md` summary bullet, as though it had always been so.
- **Code.** The steal opening deal (Step 4's work; find it from the
  prospective draw introduced in Step 3 and the opening deal in Step 4 —
  `src/rules/steal*.ts`) draws each node's second square from the strict
  pool first, weighted by the existing §6 weight, with the fallbacks above.
  Keep every draw on the game's seeded generator, and keep the draw order
  (every first square, then every second square, in node order). Reuse the
  existing strict-pool and weighting functions rather than duplicating
  them. Comments cite steal.md §7, and say nothing about how the rule came
  about.
- **Tests.** An opening-deal test at every node count and fleet size that
  no opening prospective square (first or second) lies in the outer two
  rings, across a batch of seeds; a unit test that, with the strict pool
  forced empty, the second square still falls back to the widened pool.
  Existing opening-deal tests pinned to exact squares for a seed will move
  (the draw now sees a different pool) — update them to the new squares;
  that is expected, not a regression. Replay tests must stay green.
- **Placement figures.** `doc/ruleset/tech-notes.md`'s "Placing prospective
  nodes under steal" section measures the second square's distance and
  outer-edge share **over opening deals**, which now puts the edge share at
  (or near) zero by construction. Re-measure with an improvised script over
  simulated opening deals as before (not committed): the mean distance
  between a node's two opening squares, and how often the strict pool was
  empty for a second square (expected: never, at the largest fleet and
  five nodes). Then measure the outer-edge share and mean distance of the
  **mid-game** draws — every claim's and abandon's fresh square across a
  batch of whole games at the default fleet — since that is now where the
  widened pool and the edge halving actually act. Rewrite the section's
  table and prose to those figures, keeping it in the same voice; drop the
  claim that the opening second square lands on the rim about a quarter of
  the time. Update `src/rules/stealPlacement.test.ts`'s guarded bands to
  match (opening: distance band, and no square in the outer two rings;
  mid-game: distance and edge-share bands), keeping the fallback checks.
- **`story.md`.** Correct its description of the opening deal and its
  placement-figures table in place to what is now built.

Record the new figures and any pinned squares that moved in Notes.

Depends on: Steps 3–6 (the draw, the opening deal, the placement figures
and their tests) — everything this step changes.

Verification (automated): `npm run typecheck`, `npm run lint`,
`npm run format:check` and the full `npm test` green, including the new
outer-two-rings opening test at every node count and fleet size, and the
rules-version test unchanged at 0.39. The owner sees the result on the
board at Step 13.

---

### Step 13 — The owner plays STEAL

Status: pending

No code, unless the play-through finds a bug — in which case fix it, add a
test that would have caught it, and record it in Notes.

Depends on: every earlier step.

Verification (manual): the owner runs `npm run dev` and confirms:

- The start screen's Node playstyle group offers CONTINUOUS, PLANET,
  DEDICATED, STEAL, with PLANET checked.
- A CONTINUOUS, a PLANET and a DEDICATED game each play and look exactly as
  they do on `main`.
- A STEAL game opens with no charged node and twice the chosen node count
  in prospective squares, each node's two squares in one colour, each
  showing three rings.
- Moving a ship onto a prospective square charges it in that colour, the
  node's other square disappears, and a fresh prospective of that colour
  appears elsewhere.
- A ship holding a node collects every turn, never depletes and shows no
  countdown number, over a full game length.
- Moving an opponent's ship onto that node's prospective square takes it:
  the old square is bare, and the ship that held it stands on an ordinary
  square and can move next turn.
- Walking a holder off its node leaves the square bare and puts a second
  prospective of that colour on the board.
- Moving a holder onto its own node's prospective relocates the node, which
  is still held afterwards.
- Moving a holder off its node straight onto another node's prospective
  gives up the first node (two prospectives of its colour appear) and takes
  the second.
- No node is ever depleted, no ship is ever trapped, no rotators appear, and
  landing on a planet rotates nothing.
- With combat on, a ship holding a node can neither attack nor be attacked,
  and a ship standing beside a prospective square to guard it can be.
- A STEAL game plays to its last round and ends normally.
- The story's open questions, as impressions to record in Notes rather than
  pass/fail: whether a held node paying indefinitely makes a 90-round STEAL
  game a foregone conclusion by round 20; and whether the opening land grab
  leaves a fleet that refuels first too far behind to recover.
