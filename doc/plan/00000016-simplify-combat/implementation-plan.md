# Implementation Plan — 00000016 Simplify combat

This plan turns [`story.md`](./story.md) into an ordered sequence of steps. Each
step is implemented, verified and committed on its own, by an agent that has
read only `story.md`, this plan, and its own step. Everything a step needs is
stated here — including the reasoning behind every decision, because the code
does not carry design history (CONTRIBUTING.md, "Comments").

## What this story builds

Combat stops being a special case. Three changes, all of them rules changes:

- **A ship attacks with its movement range.** §6's per-shield table governs
  attacks as well as moves — the same distances, the same straight lines, the
  same requirement that the path be clear. A 4-shield ship strikes one square
  orthogonally and cannot strike a diagonal at all; an unshielded one strikes
  three squares up, down, left or right.
- **A winning attacker takes the ground.** It advances along the line it
  attacked down, to the furthest square it may legally end on, working back
  from the square the loser has left. The squares it crosses wake nodes under
  §8.2 exactly as a move's would.
- **A ship may take at most one action per turn.** `GameState.movedThisPly`
  becomes `actedThisPly`, and attacks start recording into it. A player's two
  actions therefore always involve two different ships.

**One rules edit** (Step 1) lands first, in its own commit: version **0.8**,
touching §4.1, §5, §6, §7, §8.2 and §8.5. All three changes alter how the game
is played, so the version would be a tagging candidate — but tagging is on hold
until the game plays (CLAUDE.md), so no tag is made.

Out of scope, per `story.md`: changing §8.5 so an attack can discharge the
stranded obligation; a defending winner advancing; changing §6's movement
table; changing the shield cost of winning, the draw, or §7.1's return; new
board visuals for combat (an attack animation, a lane highlight, a distinct
treatment for a long-range target); rebalancing §8.4's payouts; recording or
replaying a game; any AI or engine.

## Sources of truth

- **The rules.** [`doc/ruleset/rules.md`](../../ruleset/rules.md), at **version
  0.7** when this plan was written and **0.8** from Step 1 onwards. The sections
  this story changes are **§5** (turns and actions), **§7** (combat) and
  **§8.2** (waking a node), with consequential sentence-level corrections in
  **§4.1**, **§6** and **§8.5** (see Decision 2). The sections it depends on and
  does not change are **§3.1** (bays), **§3.2** (site positions), **§6**'s range
  table itself, **§7.1** (returning to a bay), **§8.4** (energy) and **§8.5**'s
  actual rule. Where the app and the document disagree, the document is right.
- **This story changes the rules exactly once** — Step 1. No other step may
  touch `doc/ruleset/rules.md`, `doc/ruleset/changelog.md` or `RULES_VERSION`.
  If a later step turns up what looks like another rules ambiguity, **stop and
  raise it with the owner**; do not settle it in code.
- **No rules tag.** Tagging is on hold until the game plays (CLAUDE.md). Bump
  the version and write the changelog entry; do not run `/tag-rules`.
- **The conventions.** [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) — in
  particular:
  - the **DOM test recipe**: `// @vitest-environment jsdom` as the file's first
    line, a per-file `import "@testing-library/jest-dom/vitest";`, `cleanup` in
    an `afterEach`, and axe run with the `color-contrast` rule disabled (jsdom
    has no layout or canvas);
  - **keep logic out of components** — every rule, every derived predicate and
    every piece of player-facing wording belongs in a plain module with plain
    unit tests;
  - **comment style**: a short module header saying what the module is for, and
    inline comments only where the code is not self-evident. **No story
    numbers, no plan-step references, no design history in code** — a peer
    review treats that as a finding when it leaks into `src/`.
- **The vocabulary** (CLAUDE.md). Code, tests and this plan say **ply** and
  **hub**; player-facing text — accessible names, live-region sentences, the
  HUD, `README.md`, `rules.md` — says **turn** and **node**. **Round**,
  **action** and **energy** are the same word everywhere. **Move** means one
  ship changing squares under §6 and never means a ply; the new way a ship
  changes squares after winning a fight is called the **advance**, never a
  move, in code, comments, tests and this plan.

## What is already in place

Every function this story needs to attach to exists today.

- `src/rules/board.ts` — `Square` (`{ column, row }`), `squareAt`,
  `squareName`, `squareFromName`, `COLUMN_LETTERS`, `BOARD_SIZE` (15),
  `isOnBoard`.
- `src/rules/bays.ts` — `BAYS` (fourteen squares, all on the board's outer
  ring), `isBay`, `CLOCKWISE_BAYS`, `STARTING_RETURN_POSITION_INDEX`,
  `driftReturnPositionIndex`, `bayNumberingFrom`.
- `src/rules/sites.ts` — `SITES` (seventeen squares, all in columns B–N and
  rows 2–14, i.e. strictly inside the outer ring), `SiteState`
  (`"dormant" | "active" | "charged" | "depleted"`).
- `src/rules/gameState.ts` — `Ship`, `SiteStatus`, `GameState` (`ships`,
  `siteStates`, `sideToMove`, `actionsRemaining`, **`movedThisPly`**,
  `plyNumber`, `randomSeed`, `returnPositionIndex`, `energy`,
  `lengthInRounds`), `ACTIONS_PER_PLY` (2), `startingGameState`,
  `shipsBySquare`, `siteStateAt`, `siteStatusAt`.
- `src/rules/moveLegality.ts` — §6 alone: `REACH_OPTIONS` (§6's table
  transcribed), **`reachFrom(origin, shields)`** returning `ReachEntry`
  values (`destination` plus `passedOver`, in order, excluding origin and
  destination), `ReachEntry`, `MoveRefusalReason`, `findShip`,
  `sixOnlyMoveRefusalReason`, `sixOnlyLegalDestinations`.
- `src/rules/movement.ts` — the public §6 API with §8.5 and §9 layered on:
  `moveRefusalReason`, `legalDestinations`, `sideToMoveHasLegalMove`; also
  re-exports `reachFrom` and `ReachEntry`.
- `src/rules/combat.ts` — §7: `ADJACENT_OFFSETS`/`adjacentSquares` (the fixed
  eight-neighbour range this story deletes), `AttackRefusalReason`,
  `sevenOnlyAttackRefusalReason`, `sevenOnlyLegalTargets`,
  `attackRefusalReason`, `legalTargets`, `resolveFight`, `returnPositionSquare`,
  `receptacleBay`. Its module header currently explains at length why the range
  is **not** derived from `reachFrom`.
- `src/rules/actions.ts` — `sideToMoveHasLegalAction` (built on the six-only
  and seven-only layers, for the §5 pass guard) and `shipHasLegalAction` (built
  on the public layers, for the board and the session).
- `src/rules/stranded.ts` — `strandedShipIds`, `strandedObligationBinds`
  (§8.5), both reading `movedThisPly`.
- `src/rules/nodes.ts` — `wakeTouchedSites(state, ship, path)` (§8.2), which
  takes a `ReachEntry` and charges every **active** site among
  `passedOver` (reported as `"flown-over"`) and `destination` (reported as
  `"landed-on"`), returning `SiteChargedEffect`s; plus §8.6's replacement draw.
- `src/rules/ply.ts` — `applyMove`, `applyAttack`, `applyPassGuard`, the shared
  `applyEndOfActionTail` (spends an action, runs the end-of-turn sequence on the
  ply's second action, clears `movedThisPly`, then runs the pass guard),
  `FightShip`, `FightReturn`, `FightResolvedEffect`, `MoveEffect`,
  `AttackEffect`, and `assertFightInvariants` (which today asserts that no ship
  except a returning one changed square and that `siteStates` is untouched).
- `src/rules/endOfTurn.ts` — §8.7's six steps, including §8.4's energy
  collection and §4.1's shield gain.
- `src/rules/fullGame.test.ts` — plays a whole game through the public API with
  a deterministic greedy policy and asserts it reaches the expected final ply.
- `src/game/session.ts` — `Session`, `SessionIntent`, `SessionEvent`
  (`SelectedEvent`, `MovedEvent`, `AttackedEvent`, `RejectedEvent`, …),
  `RejectionReason` (`MoveRefusalReason | AttackRefusalReason |
"nothing-to-select"`), `isSelectable`, `sessionReducer`.
- `src/board/announcements.ts` — **all** player-facing wording:
  `announcementFor(event)`, `fightSentence`, `rejectionSentence` (an exhaustive
  `switch` over `RejectionReason`, so renaming a reason forces this file to
  change in the same step), `moveSentence` (which is where the "charged the
  node" and "flying over X and charging the node" phrasings already live),
  `turnIndicatorText`, `resultSentence`.
- `src/board/Board.tsx` — builds 225 cell descriptors, marking legal
  destinations, legal targets (with the predicted fight outcome from
  `resolveFight`), a ship's condition (`owes-action` / `no-action`) and whether
  it `hasMoved`.
- `src/board/BoardSquare.tsx` / `.css` — `AlreadyMovedMark`, the
  `.board-square__mark--already-moved` bar.
- `src/board/squareLabel.ts` — the accessible name, including
  `ALREADY_MOVED_WORDING = "already moved this turn"`.

## Where the code goes

| Path                                                                | Change                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `doc/ruleset/rules.md`                                              | §4.1, §5, §6, §7, §8.2, §8.5; version → 0.8 (Step 1 only)                                                                |
| `doc/ruleset/changelog.md`                                          | the 0.8 entry (Step 1 only)                                                                                              |
| `src/rules/rulesVersion.ts`                                         | `RULES_VERSION` → `"0.8"` (Step 1 only)                                                                                  |
| `src/rules/gameState.ts`                                            | `movedThisPly` → `actedThisPly` (Step 2)                                                                                 |
| `src/rules/moveLegality.ts`                                         | the rename; `"ship-already-moved"` → `"ship-already-acted"` (Step 2)                                                     |
| `src/rules/movement.ts`, `src/rules/stranded.ts`                    | the rename (Step 2)                                                                                                      |
| `src/rules/combat.ts`                                               | already-acted check (Step 3); range from `reachFrom`, `attackReach` (Step 4); `winnerAdvance` (Step 5)                   |
| `src/rules/ply.ts`                                                  | attacks record an action (Step 3); the advance, the widened effect, the rewritten invariants (Step 5)                    |
| `src/rules/nodes.ts`                                                | comments widen from "a move" to "a ship's path" (Step 5)                                                                 |
| `src/rules/actions.ts`                                              | nothing beyond the rename it inherits (Step 2)                                                                           |
| `src/game/session.ts`                                               | the rename (Step 2); `isSelectable` simplifies (Step 3); `AttackedEvent`'s comment (Step 5)                              |
| `src/board/announcements.ts`                                        | the rename (Step 2); already-acted and pass wording (Step 3); the two new refusals (Step 4); the fight sentence (Step 6) |
| `src/board/Board.tsx`, `BoardSquare.tsx` / `.css`, `squareLabel.ts` | `hasMoved` → `hasActed`, "already acted this turn" (Step 2)                                                              |
| `README.md`                                                         | the rules summary (Step 1); a final accuracy pass (Step 8)                                                               |

## Decisions taken at plan time

### 1. The rules edit comes first, and it is the only one

`rules.md` is what the code implements, so the document changes before anything
implements it (implementation-plan-guide.md, "Check the rules document").
Step 1 is the whole rules edit — document, changelog, `RULES_VERSION` and the
`README.md` sentences that would otherwise contradict it — in one commit.

Between Step 1 and Step 6 the **code trails the document**. That is expected
and is the normal shape of a rules-first branch: the suite is green at every
step because the tests are moved with the code, but the app on the branch does
not fully implement 0.8 until Step 6 lands. Nothing in Steps 2–6 may "fix" this
by editing `rules.md`.

### 2. Three sentences outside §5/§7/§8.2 are false after this story, and Step 1 fixes them

`story.md`'s In-scope list says "§7.1, §7.2, §3.1, §6, §8.4, §8.5, §9 are
unchanged". That is true of their **rules**, but three individual sentences
elsewhere in the document become factually wrong the moment §7 changes, and a
ruleset that contradicts itself is worse than either version of it. Step 1
therefore also corrects, minimally and without changing any rule:

- **§6**: "Moving and attacking are entirely separate. A ship never attacks by
  moving onto its target, and never moves as a result of attacking (section 7)."
  The second half is exactly what the advance does. The sentence keeps its
  point — an attack is its own action and is never performed by moving onto a
  target — and stops denying the advance.
- **§8.5**: "With one ship stranded, the first action frees it and the rest of
  the turn is the player's: they may **attack with the ship they have just
  freed**, move a different ship, or do anything else that is legal." Under
  one-action-per-ship the freed ship has spent its action. The example must
  name a different ship.
- **§4.1**: shields "decide who wins a fight (section 7), and each one a ship
  carries takes away part of its movement (section 6)". Movement now carries
  attack range with it, which is the whole point of the story, so the sentence
  says so in a clause.

These are corrections of consequence, not new rules; the changelog entry names
them as such.

### 3. `rules.md` keeps one range table, in §6, and §7 points at it

§7 could restate §6's five-row table. It does not: §6 owns the table and §7
cross-references it, naming the two extremes in prose (4 shields → one square
orthogonally, and no diagonal at all; 0 shields → three squares orthogonally).
A second copy of the table in the document is a second thing that can drift,
for exactly the reason the code derives the attack range from `reachFrom`
rather than transcribing it. The prose extremes are there because the 4-shield
loss of the diagonal is the single most surprising consequence of the story and
a player must not have to derive it from a cross-reference.

### 4. The lane reaches `applyAttack` through a function in `combat.ts` (story open item 1)

`combat.ts` gains one exported function — call it **`attackReach(state, shipId,
target)`** — which returns the `ReachEntry` from `reachFrom(attacker.square,
attacker.shields)` whose `destination` is `target`, or `undefined` when the
target is not in the attacker's reach at all. It answers a purely geometric
question: it says nothing about ownership, bays, occupancy, the stranded
obligation or whose ply it is.

Both callers use it, so the lane has exactly one implementation:

- `sevenOnlyAttackRefusalReason` calls it for its range check
  (`undefined` → `"target-out-of-range"`) and then reads its `passedOver` for
  the path check (`"attack-path-blocked"`).
- `applyAttack` calls it after `attackRefusalReason` has already returned
  `undefined`, and **throws a `RangeError`** if it comes back `undefined` —
  a bug detector on a case the legality check has already excluded, in the same
  spirit as `receptacleBay`'s "no empty bay" throw, not a branch a caller
  handles.

Rejected: having `applyAttack` recompute the lane from `reachFrom` itself (a
second place the lane can be got wrong — `story.md` says to prefer the
function), and having `sevenOnlyAttackRefusalReason` return a richer object
carrying the lane (it would change the shape of a function four other call
sites already depend on, to serve one caller).

### 5. The advance is computed by a second pure function in `combat.ts` (§7's owner)

`combat.ts` also gains **`winnerAdvance(state, reach)`**, taking the attack's
`ReachEntry` and returning the sub-lane the winner actually travels — itself a
`ReachEntry` (`destination` = the square the winner ends on, `passedOver` = the
lane squares before it, excluding the attacker's own square) — or `undefined`
when no square on the lane is legal to end on and the winner holds its ground.

Three reasons for that shape:

- The stop-short rule is **one backwards scan**, not three cases: walk the lane
  from the loser's square back towards the attacker and take the first square
  the winner may legally end on. "May legally end on" means §6's site
  restriction and nothing else — not a dormant site, not a depleted site.
- Returning a `ReachEntry` means `wakeTouchedSites` can be called with it
  unchanged, so §8.2 fires over the **whole** advance — passed-over squares
  included — with no new code in `nodes.ts`.
- `undefined` for "held its ground" makes the no-travel case impossible to
  confuse with a zero-length advance, and it is the case in which
  `wakeTouchedSites` must **not** be called at all.

It lives in `combat.ts` because §7 is `combat.ts`'s section, and because it is
pure and therefore testable on its own — which matters more than usual here
(see Decision 10). The occupancy of the lane is **not** re-checked: the path was
clear when the attack was judged, the loser has been placed in its bay first
(§7.1 requires that), and nothing else has moved. Step 5's rewritten
`assertFightInvariants` is the net under that reasoning.

Rejected: putting the scan inline in `applyAttack` (untestable except through a
whole fight, and it would put a §7 rule in the module that applies actions
rather than the module that owns §7); and consulting
`sixOnlyMoveRefusalReason` for "may legally end on" (it would also apply
occupancy, `movedThisPly` and ownership, none of which mean anything for an
advance, and it returns reasons no caller here wants).

### 6. The `fight-resolved` effect grows inside `winner` (story open item 2)

`FightResolvedEffect.winner` — already optional, already absent on a mutual
return — gains two fields: the **square** the winner stands on when the fight is
over, and whether it **advanced**. Nothing is added at the top level of the
effect, so the mutual-return case carries no field that means nothing to it, and
the defender-won case carries the truthful `advanced: false` beside a square
that is simply where it already stood.

`advanced` is deliberately not left to be derived by comparing the winner's
square with the pre-fight snapshot: the wording layer would then be re-deriving
a rules fact, and "advanced onto the square it cleared" and "held its ground"
read as different events to a player (`story.md` requires them to be
distinguishable).

`AttackEffect` also widens to include `SiteChargedEffect`, because an advance
can now wake a node and the announcement has to be able to say so.

Rejected: an optional `advance` record hanging off the effect's top level (an
optional inside an already-optional case, unwrapped twice by every consumer);
and restructuring `FightResolvedEffect` into a three-variant union keyed on
outcome (a larger, riskier refactor across `announcements.ts`, `session.ts` and
three test files, bought for one new fact).

### 7. `"ship-already-acted"` is one sentence, not two (story open item 3)

One sentence, naming actions rather than moves: the player already knows which
action they attempted, and the structured reason deliberately does not carry
that, so a second sentence would mean adding data to the refusal purely to
choose between two near-identical wordings. The reason string is shared by
`MoveRefusalReason` and `AttackRefusalReason`, and `rejectionSentence` handles
the union once.

### 8. The rename lands as its own step, and it lands first (story open item 4)

`movedThisPly` → `actedThisPly` (plus `"ship-already-moved"` →
`"ship-already-acted"`, `hasMoved` → `hasActed`, and the accessible-name
wording) touches nine source files and fifteen test files and changes **no
behaviour**. Making attacks record into it touches two source files and changes
a rule. Step 2 is the mechanical diff a reviewer skims; Step 3 is the small one
a reviewer reads closely. Splitting them the other way round — behaviour first,
rename after — would leave a commit in which a field called `movedThisPly`
records attacks, which is exactly the confusion the rename exists to remove.

Step 2 also changes the player-facing wording to "already acted this turn"
even though only moves record at that point. The sentence stays true (a ship
that moved has acted), it is simply less specific for one commit, and the
alternative is a second pass over the same four files and their tests.

### 9. Where the already-acted check goes, and in what order

**In the seven-only layer** — `sevenOnlyAttackRefusalReason` and
`sevenOnlyLegalTargets` — not only in the public one. That layer is what
`sideToMoveHasLegalAction` asks, and therefore what the §5 pass guard believes.
Without the check there, the guard would think an action exists for a ship that
has already spent its turn, and a side with nothing left to do would never
pass. This is the same seven-only/public split story 00000012 leaned on for
game-over, used the other way round: game-over stays **out** of the seven-only
layer (the guard must not read "the game is over" as "no action"), already-acted
goes **in** (the guard must read it).

The order of checks in `sevenOnlyAttackRefusalReason` becomes: whose ship it is
→ **has it already acted** → is the attacker in a bay → no ship on the target
square → the target is friendly → the target is in a bay → out of range → path
blocked. Ownership then already-acted mirrors `sixOnlyMoveRefusalReason`
exactly; range and path stay last, as `story.md` requires, so a bay target is
still refused as `"target-in-bay"` and not as an out-of-range square.

The public `attackRefusalReason` duplicates the ownership and already-acted
checks ahead of §8.5's stranded check, exactly as `moveRefusalReason` already
duplicates ownership and already-moved, so a player hears the same refusal in
the same priority whichever action they attempted. Without the duplication, a
ship that had already acted would be told "a stranded ship must be moved clear"
— true of the position, but not the reason that ship cannot act.

### 10. A three-square advance cannot happen in a real game, and the tests must say so

Winning a fight requires strictly more shields than the defender (§7), so an
attacker carrying **0 shields can never win** — 0 against 0 is a mutual return,
and 0 against anything higher is a defender win. §6 unlocks the three-square
orthogonal reach only at 0 shields. Therefore:

- **The longest advance reachable through `applyAttack` is two squares** (a
  1-shield attacker orthogonally or diagonally, or a 2-shield attacker
  orthogonally, beating a 0-shield defender).
- `story.md`'s verification asks for "an attacker winning from one, two and
  three squares away" and its worked diagrams show a three-square attack. The
  three-square case **cannot be constructed** through `applyAttack`; it is
  tested against `winnerAdvance` directly, which is pure and takes a lane
  rather than a fight. Step 5 says so where the tests are specified, and no
  test may fake a 0-shield win by hand-building a post-fight state.

This is worth knowing beyond the tests: a stripped-down ship's long reach lets
it open a fight it can only draw or lose. That is a real property of the
ruleset as this story leaves it, not a bug in the plan, and it is flagged to the
owner rather than designed around.

### 11. The winner can never land in a bay — asserted, not branched

Two independent facts guarantee it. The winner either lands on the loser's
square, which is never a bay because §3.1 forbids attacking a ship in one; or it
stops short, which happens only when the squares beyond are **sites**, and every
site is strictly inside the outer ring (`SITES` occupies columns B–N and rows
2–14) while every bay is on it. A straight lane whose squares beyond the
stopping square are all interior cannot have its stopping square on the ring
unless the attacker's own square is on the ring too and the whole lane runs
along it — and a lane along the ring passes through no sites at all, so nothing
would make the winner stop short on it.

So `applyAttack` asserts it and never branches on it, in the same spirit as
`receptacleBay`'s throw. §3.1's "ending a move in a bay costs all shields"
therefore never has to be reasoned about for an advance — which is fortunate,
because an advance is not a move and it would be genuinely unclear whether the
penalty applied.

### 12. `assertFightInvariants` is rewritten, not relaxed or deleted

Both of its current claims are false by design after Step 5, and its messages
quote the very sentence §7 loses. It is rewritten to assert what **is** true —
see Step 5 for the list — because this is the story's most intricate code and
the one place a runtime net earns its keep. Deleting the assertions to make a
test pass is a plan violation.

### 13. §8.5 is not reopened; only a stale comment is corrected

The advance means an attack can now free a stranded ship, and §8.5 still says
the freeing action is a move. `story.md` leaves that for the owner to decide
after the new combat has been played. The only change is `combat.ts`'s comment
justifying why §8.5 refuses every attack: "a move can free a stranded ship, but
an attack never does" is no longer true and is replaced by a statement of §8.5's
own requirement (the freeing action **is** a move, so while the obligation binds
it blocks every attack the same way). Note that the interaction is narrower
than it first looks: §8.5 refuses an attack by the owing ship itself, so the
only way an attack frees a stranded ship is when the obligation has been
**waived** for having no legal move at all.

### 14. The board gets no new visuals

Longer range needs no new mechanism: `Board.tsx` already highlights whatever
`legalTargets` returns, with the predicted fight outcome, so highlights simply
appear further away.

## Conventions every step follows

- **Every step is finished with** `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run format:check` (run `npm run format` to fix) and, for any
  step touching `src/`, `npm run build` — plus the step's own verification.
- **The dev server** runs at `http://localhost:5273` (`npm run dev`).
- **Tests live beside the code they cover**, and pure rules tests run in the
  default `node` environment. Only component tests opt into jsdom, using the
  recipe in CONTRIBUTING.md.
- **The rules layer never composes a sentence** and never imports from
  `src/board/` or `src/game/`.
- **Existing tests may need new positions, not weaker assertions.** This story
  inverts the meaning of a dozen existing tests. Where it does, rewrite the test
  so it still tests what it meant to test — never delete an assertion to make a
  suite green, and never soften `assertFightInvariants` to get a test to pass.
- **`src/rules/fullGame.test.ts` is the canary.** It plays a whole game through
  the public API. If it starts failing or hanging after a step, that is a real
  finding about the new rules (a deadlock, or a policy that can no longer act) —
  stop and escalate rather than raising `MAX_ACTIONS` or weakening its
  assertions.
- **`src/rules/siteSpacing.test.ts` is not touched.** §3.2's spacing property is
  derived from §6's ranges, which this story does not change; an advance travels
  a sub-segment of a lane with exactly §6's geometry, so it touches no more
  sites than a move of the same shape would.
- **Every step starts at `Status: pending`** and is updated by the
  implementation pipeline, with a `Notes:` line recording what was done and any
  deviation and why.

---

## Step 1 — Rules: attack range, the winner's advance, one action per ship (version 0.8)

Status: committed

Notes: Edited `doc/ruleset/rules.md` to version 0.8 (§4.1, §5, §6, §7, §8.2,
§8.5, and the version line), added the 0.8 entry to
`doc/ruleset/changelog.md`, bumped `RULES_VERSION` in
`src/rules/rulesVersion.ts`, and corrected the two now-wrong sentences in
`README.md`'s status blockquote, exactly as specified. No deviations from the
plan. `npm run format:check` still reports a pre-existing warning on this
`implementation-plan.md` file unrelated to this step (confirmed by running
`prettier --write` on it in isolation and reverting — the warning exists on
the file as committed before this step touched it, from formatting drift
outside this step's scope of `doc/ruleset/rules.md`,
`doc/ruleset/changelog.md`, `src/rules/rulesVersion.ts` and `README.md`);
`format:check` passes cleanly on all four files this step actually
modified.

Edit `doc/ruleset/rules.md` to version **0.8**. Nothing in `src/` changes in
this step except `RULES_VERSION`.

**The version line** at the top of the document becomes `**Rules version:
0.8**`.

**§5 (Turns and actions).**

- "A ship may be moved **at most once per turn**. There is no other
  restriction: a player may move two different ships, move a ship and attack
  with it (in either order), attack with two different ships, or attack twice
  with the same ship." becomes a statement that a ship may take **at most one
  action per turn**, followed by the consequence: a player's two actions
  therefore always involve two different ships.
- The paragraph that follows ("A player must take both actions if two are
  available… In practice this should never happen — a player always has seven
  ships, and attacking is legal even when it is a losing move — but the rule is
  here so the game can never deadlock.") keeps its **rule** — both actions if
  two are available, one if only one is, and the turn passes if there is no
  legal action at all — but its argument is **softened, not deleted**. The old
  grounds were that attacking is always available; attacking is now
  range-limited, so the document should stop claiming the case never arises and
  say instead that it is uncommon and that the rule covers it.

**§6 (Movement).** The range table, the clear-path paragraph and the
dormant/depleted restriction are **unchanged**. The one sentence that changes
is "Moving and attacking are entirely separate. A ship never attacks by moving
onto its target, and never moves as a result of attacking (section 7)": keep
the first half and the "never attacks by moving onto its target" half, and
replace the denial that a ship ever moves as a result of attacking with a
pointer to §7's advance and the fact that the advance is not a move (see
Decision 2).

**§7 (Combat).**

- The opening sentence's "any of the eight surrounding squares, diagonals
  included" becomes the §6 range: a ship may attack an enemy within its
  **movement range** — the same distances, the same straight lines — with a
  cross-reference to §6's table rather than a second copy of it (Decision 3),
  and the two extremes named in prose: a 4-shield ship reaches one square
  orthogonally and cannot strike a diagonal at all; an unshielded ship reaches
  three squares orthogonally.
- **The clear-path requirement is stated explicitly**: every square the attack
  passes over must be empty, of either side's ships, on the same terms §6 sets
  for a move. Say plainly that the target square itself is of course occupied —
  by the enemy ship — and that the site the target stands on does not matter (a
  ship stranded on a depleted site can still be attacked).
- **Delete** the paragraph "An attack reaches further than a heavily shielded
  ship can move. A ship with 4 shields can only step one square orthogonally,
  but it can still strike any of the eight squares around it."
- Keep, untouched: attacking is the attacker's choice; a ship may attack a
  stronger enemy; neither ship may be in a bay; the ship with more shields wins;
  the winner pays `loser + 1` shields with its worked example; equal shields
  return both ships, attacker placed first, both squares left empty.
- **Replace "Neither ship moves."** with the advance:
  - Only an **attacking** winner advances. A winning **defender** holds its
    ground, and so does everything about the drawn fight.
  - The attacker advances along the line it attacked down, to **the furthest
    square, working back from the square the loser has left, that it may
    legally end on**. "May legally end on" is §6's restriction and nothing
    else: not a dormant site, not a depleted site (§8.5). In the ordinary case
    that is the loser's own square.
  - If there is no such square, the winner **holds its ground**.
  - Worth one sentence: the squares the winner crosses count as touched for
    §8.2, exactly as a move's do.
- **Rewrite the closing paragraph** — "And because the winner stays put,
  driving an enemy off a hub does not put you on it. Claiming the square takes
  a second action…" — to say the opposite: a won fight can take a node
  outright, in a single action, which is what makes a fight worth picking; and
  heavy shields now buy strength at the cost of reach, so the ship most likely
  to win a fight is the one least able to start one at a distance.

**§8.2 (Waking a node).** "either by landing on it or by flying over it during
a move" widens to cover both a move and a winning attacker's advance
(section 7). The principle stated in the rest of the section — it does not
matter whose ship, and the ship need not stop — is unchanged.

**§8.5 (Depleted and dormant sites).** The rule is unchanged. The single
illustrative clause "they may attack with the ship they have just freed" is
now impossible under §5 and must name a different ship instead (see
Decision 2).

**§4.1 (Shields).** The sentence saying each shield "takes away part of its
movement (section 6)" gains a clause: and with it, part of the ship's attack
range (section 7).

**`doc/ruleset/changelog.md`** gets a **0.8 entry**, newest first, in the voice
the existing entries use. It covers, in this order: attack range becoming §6's
movement range including the clear path (naming the 4-shield ship's loss of the
diagonal and the unshielded ship's three-square reach as the two sharp ends);
the winning attacker's advance, the stop-short rule and the fact that only an
attacking winner advances; §8.2 widening to cover the advance; and one action
per ship, with the reason (a winner that relocates and can then act again does
far too much in one turn). It also names the three consequential sentence fixes
in §6, §8.5 and §4.1 as corrections that follow from the above rather than new
rules. Close the entry the way 0.5, 0.6 and 0.7 do: all three changes alter how
the game is played, so this version **would** be a tagging candidate, but
tagging is on hold until the game plays, so no tag is made.

**`src/rules/rulesVersion.ts`** goes to `"0.8"` in the same commit;
`src/rules/rulesVersion.test.ts` checks it against the document and checks that
a changelog entry exists.

**`README.md`.** Two claims in the status blockquote become wrong at this
commit and are corrected here, so the repository never holds a README that
contradicts the ruleset:

- "No ship moves twice in the same turn, though a ship that has already moved
  can still attack." → a ship takes at most one action a turn, so a turn's two
  actions always use two different ships.
- "…the winner holds its ground rather than advancing, so clearing a node and
  then taking it needs both of a turn's actions." → the winner advances onto
  the square it cleared, so a won fight can take a node in one action; and a
  sentence saying a ship attacks as far as it moves, so shields make a ship
  strong but short-ranged.

Keep the README's voice: a player is reading it, not a developer. Nothing else
in the README changes here — Step 11 does the final accuracy pass once the
whole story has landed.

Depends on: nothing.

Verification (automated): `npm test` — `src/rules/rulesVersion.test.ts` passes
(the constant matches the document, and a 0.8 changelog entry exists) and the
whole suite is still green, since no rule logic changed. Then confirm by
`grep -n "eight surrounding\|eight squares\|Neither ship moves\|attack twice
with the same ship\|never moves as a result of attacking"
doc/ruleset/rules.md` that none of the deleted claims survive, and by
`grep -n "moves twice in the same turn\|holds its ground rather than advancing"
README.md` that neither README sentence survives.

---

## Step 2 — `movedThisPly` becomes `actedThisPly` (mechanical, no behaviour)

Status: committed

Notes: Renamed `movedThisPly` → `actedThisPly`, `"ship-already-moved"` →
`"ship-already-acted"`, `hasMoved` → `hasActed` (and the CSS class,
`AlreadyMovedMark` → `AlreadyActedMark`, `ALREADY_MOVED_WORDING` →
`ALREADY_ACTED_WORDING`, `ALREADY_MOVED_BAR_TOP_INSET` →
`ALREADY_ACTED_BAR_TOP_INSET`), and `applyEndOfActionTail`'s `movedShipId` →
`actedShipId`, exactly as specified, across all listed source and test files.
Comments naming the renamed field/mechanism ("moved-this-ply marks", "has not
yet moved this ply", etc.) were reworded to "acted" alongside the rename;
left untouched, per the plan's explicit instruction, the two comments whose
behavioural claims Step 3 rewrites: `applyEndOfActionTail`'s note that an
attack's id is "omitted ... since only a move counts towards that" and
`isSelectable`'s "Widened from 'has not moved this ply' so a ship that has
moved and can still attack (rules.md §5) is selectable too." No behaviour
changed; the suite holds at 616 tests. `npm test`, `npm run typecheck`,
`npm run lint`, `npm run build` and `npm run format:check` all pass, and the
step's grep check
(`movedThisPly\|ship-already-moved\|hasMoved\|already moved this
turn\|already-moved` against `src/`) returns nothing. No deviations from the
plan.

A pure rename. **No behaviour changes in this step**: attacks still do not
record an action, and every test's expectations hold with new names. If a test
needs its expectation changed rather than its identifiers, the change belongs
in Step 3 and this step has gone wrong.

Rename, everywhere:

- `GameState.movedThisPly` → **`actedThisPly`**, in `src/rules/gameState.ts`
  (the field and its doc comment — "the ships that have already **acted** this
  ply"), `startingGameState`, `src/rules/moveLegality.ts`,
  `src/rules/movement.ts`, `src/rules/stranded.ts`, `src/rules/ply.ts`
  (`applyPassGuard`, `applyEndOfActionTail` — including its `movedShipId`
  parameter, which becomes `actedShipId` — and both apply functions' comments),
  `src/game/session.ts` and `src/board/Board.tsx`.
- `MoveRefusalReason`'s `"ship-already-moved"` → **`"ship-already-acted"`**, in
  `src/rules/moveLegality.ts`, `src/rules/movement.ts`, `src/game/session.ts`
  (two call sites) and `src/board/announcements.ts` (the `switch` case).
- The board's `hasMoved` fact → **`hasActed`**: `src/board/Board.tsx`,
  `src/board/BoardSquare.tsx` (the prop and `AlreadyMovedMark`, which becomes
  `AlreadyActedMark`), the CSS class
  `.board-square__mark--already-moved` → `--already-acted` in
  `src/board/BoardSquare.css` and everywhere it is queried, and
  `src/board/squareLabel.ts` (`ALREADY_MOVED_WORDING` → `ALREADY_ACTED_WORDING`,
  whose text becomes **"already acted this turn"**).
- `src/board/announcements.ts`'s sentence for the reason becomes **"That ship
  has already acted this turn. Choose another."** (Decision 7 — one sentence
  covering both actions; it is not yet reachable by attacking, which Step 3
  changes.)

Comments that say "moved" where they now mean "acted" are reworded in the same
pass — in particular `applyEndOfActionTail`'s doc, which explains that the id is
"omitted for an action — an attack, in particular — that does not count as a
move". That explanation is still true at this step and Step 3 replaces it; do
not pre-empt Step 3 by changing the behaviour it describes.

Fifteen test files reference the old names (`Board.test.tsx`,
`EnergyOverlay.test.tsx`, `announcements.test.ts`, `squareLabel.test.ts`,
`BoardSquare.test.tsx`, `session.test.ts`, `GameOverPanel.test.tsx`,
`ScoreDisplay.test.tsx`, `actions.test.ts`, `combat.test.ts`,
`endOfTurn.test.ts`, `energy.test.ts`, `gameState.test.ts`, `movement.test.ts`,
`nodes.test.ts`, `ply.test.ts`, `stranded.test.ts`). Rename in all of them,
including test names and the accessible-name strings they assert ("already
moved this turn" → "already acted this turn"). Expected assertions do not
change otherwise.

Depends on: Step 1 (the rules now say one action per ship, which is what the
new name means; renaming before the document said it would leave the code
ahead of the ruleset).

Verification (automated): `npm test` — the whole suite green with **the same
number of tests as before**, since nothing was added or removed. Then
`grep -rn "movedThisPly\|ship-already-moved\|hasMoved\|already moved this turn\|already-moved" src/` returns nothing.

---

## Step 3 — One action per ship: attacks spend the ship's turn

Status: committed

Notes: Implemented exactly as specified. `combat.ts` gained
`"ship-already-acted"` in `AttackRefusalReason`, checked second in
`sevenOnlyAttackRefusalReason`/`sevenOnlyLegalTargets` (after ownership,
before the attacker's bay check) and duplicated in the public
`attackRefusalReason` ahead of the §8.5 stranded check, with comments
explaining the duplication. `ply.ts`'s `applyAttack` now passes the
attacker's id to `applyEndOfActionTail` in every branch (including a mutual
return, where the attacker itself ends up in a bay); `applyEndOfActionTail`'s
`actedShipId` parameter was made non-optional rather than kept optional,
since every caller now supplies it — the plan left this choice open.
`session.ts`'s `isSelectable` simplified to "has not acted this ply" and its
now-unused `shipHasLegalAction` import was removed. `announcements.ts`'s pass
sentence changed from "no legal move" to "no legal action". Rewrote the
tests the plan named as inverting
(`ply.test.ts`'s attack-twice/attack-then-move/move-then-attack/mutual-return
tests, `combat.test.ts`'s already-acted-still-has-targets test,
`actions.test.ts`'s moved-ship-still-has-target test,
`session.test.ts`'s re-select/reject tests, `Board.test.tsx`'s
already-acted-shows-only-targets test) and added the new tests the step
requires, including the pass-guard trap test built directly against
`applyPassGuard` with a ship that has already acted but would otherwise
offer a legal target. One deviation, both necessary consequences of the rule
actually taking effect rather than gaps in the plan: (1) several existing
`ply.test.ts` fight-resolution and refusal tests used a single ship per
side, so after that ship's one action the pass guard now legitimately fires
mid-test (there being no second ship left to act) and either appends an
unexpected `ply-passed` effect or advances `sideToMove` before the test's
second action runs; fixed by adding an uninvolved second ship to each such
state (mirroring how `session.test.ts`'s existing states already do this),
never by weakening an assertion. (2) `combat.test.ts`'s
"attacks are legal again once the freeing move is made, including with the
ship just freed" and `Board.tsx`/`squareLabel.ts`'s header comments about a
moved ship still being selectable or still carrying a target were
pre-existing statements that the rule this step implements makes false;
rewrote the test to assert the new split (the ship that just acted stays
refused, the rest of the side is free again) and corrected the comments —
not files the plan's "Where the code goes" table lists for this step, but
leaving a comment asserting a behaviour this step deliberately removes would
violate the comment convention. `npm run typecheck`, `npm run lint`,
`npm test` (617/617, including `fullGame.test.ts` completing at the
expected ply), `npm run build` and `npm run format:check` all pass.

Make the rule real. This is the smallest diff in the story and the one that
changes the most about how a turn plays.

In `src/rules/combat.ts`:

- Add `"ship-already-acted"` to `AttackRefusalReason` (the same string
  `MoveRefusalReason` already uses, so the player hears one sentence whichever
  action they tried).
- `sevenOnlyAttackRefusalReason` gains the check, placed **second** — after
  "whose ship it is" and before the attacker's bay check, mirroring
  `sixOnlyMoveRefusalReason`'s order exactly. Update the function's doc comment,
  which currently lists the order of checks.
- `sevenOnlyLegalTargets` returns an empty list for a ship that has already
  acted, in its early return alongside the side-to-move and bay checks — again
  mirroring `sixOnlyLegalDestinations`.
- The public `attackRefusalReason` duplicates the already-acted check
  immediately after its own duplicated ownership check and **before** §8.5's
  stranded check, exactly as `moveRefusalReason` does (Decision 9). Explain in
  the comment why the duplication exists, in one line: so the refusal a player
  hears has the same priority for both kinds of action.

In `src/rules/ply.ts`:

- `applyAttack` passes the **attacker's** id to `applyEndOfActionTail`. It does
  so in **every** branch, including the mutual return in which the attacker
  ends the action in a bay — it took an action either way.
- `applyEndOfActionTail`'s parameter is no longer optional in practice; keep or
  drop the optionality as the code reads best, but its doc comment must stop
  saying that an attack does not count. The module header's claim that an
  attacking ship is "never marked as having moved, since only a move counts
  towards that" is rewritten to say every action records the ship that took it.

In `src/game/session.ts`:

- `isSelectable` simplifies. With one action per ship, a ship that has acted has
  no legal action at all, so the old widening — "a ship that has moved and can
  still attack (rules.md §5) is selectable too" — is exactly what §5 no longer
  permits. The predicate becomes "has not acted this ply", and its comment says
  why a ship with no legal action is still selectable (a pinned ship, or one
  held back by §8.5's obligation, is a legitimate if fruitless first choice).

In `src/board/announcements.ts`:

- The pass sentence currently reads "…has no legal move, so the turn passes."
  The guard has always been about **actions**, not moves, and passes get
  materially more likely under this rule, so the sentence says "no legal
  action". This is a one-line wording correction the story does not name; it is
  included here because this is the step that makes it matter, and its test in
  `announcements.test.ts` moves with it.

Existing tests that now assert the opposite of the rule, all of which must be
**rewritten to test the new rule**, not deleted:

- `src/rules/ply.test.ts`: "lets one ship attack twice…", "lets a ship attack,
  then move…", "lets a ship move, then attack…" (these three become refusals),
  "still refuses a second move of a ship that has already moved this ply, even
  though it can still attack", and "does not mark a ship returned to a bay by a
  mutual return as moved, so it may still be moved as the ply's second action"
  (the attacker is now marked; the ship the opponent lost is not the side to
  move's concern). "lets two different ships each attack as the ply's two
  actions" must keep passing unchanged — that is the case the rule preserves.
- `src/rules/combat.test.ts`: "a ship that has already moved this ply still has
  its targets" inverts.
- `src/rules/actions.test.ts`: "is true for a ship that has moved and still has
  a legal target" inverts; "is false for a ship that has moved and has no legal
  target" still holds.
- `src/game/session.test.ts`: "re-selects a friendly ship that has moved but can
  still attack" and "rejects a friendly ship that has moved and has no target as
  ship-already-acted" collapse into the single new behaviour.
- `src/board/Board.test.tsx`: "shows only targets, no destinations, for a ship
  that has already moved" inverts (it now shows neither), along with the two
  cases around a moved green ship with an adjacent enemy.

New tests this step must add:

- A ship that has moved cannot attack; a ship that has attacked cannot move; a
  ship that has attacked cannot attack again — each refused with
  `"ship-already-acted"`.
- A player's two actions with **two different ships** still work normally, in
  all four combinations (move/move, move/attack, attack/move, attack/attack).
- **The pass guard, directly** (the trap this step exists to avoid): build a
  state in which the side to move has exactly one ship with any legal action
  and that ship has already acted, and assert that `applyPassGuard` passes the
  ply — with a `ply-passed` effect — rather than believing an action remains.
  A test that only exercised the public layer would still pass if the check
  were put in the wrong layer, so this one must go through `applyPassGuard` or
  `sideToMoveHasLegalAction`.
- §8.5's obligation still refuses every attack while any ship owes an action,
  including the owing ship's own — unchanged behaviour, re-asserted because the
  reasoning around it has moved.

Depends on: Step 2 (the field and reason string already carry their new names).

Verification (automated): `npm test`. The new tests above pass; the rewritten
tests assert the new rule; `src/rules/fullGame.test.ts` still plays a hundred-
round game to completion and still ends at `pliesForGameLength(100) + 1`, with
both sides scoring above zero — the check that one action per ship has not
deadlocked the game or stalled the deterministic policy.

---

## Step 4 — Attack range comes from §6's movement table

Status: committed

Notes: Implemented exactly as specified. `combat.ts`'s `ADJACENT_OFFSETS`/
`adjacentSquares` were deleted and the module header rewritten to say range
is now derived from `reachFrom` rather than kept independent of it. Added
`attackReach(state, shipId, target)`, importing `reachFrom`/`ReachEntry` from
`./moveLegality` (not `./movement`), with a doc comment stating what it is
not (no ownership, no bays, no occupancy, no ply awareness). Renamed
`"target-not-adjacent"` to `"target-out-of-range"` and added
`"attack-path-blocked"` to `AttackRefusalReason`; `sevenOnlyAttackRefusalReason`
now checks `attackReach` and then `passedOver` occupancy last, after every
check about the target square, so a bay target within reach is still
refused `"target-in-bay"`. `sevenOnlyLegalTargets` now enumerates
`reachFrom`'s destinations. Reworded the §8.5 comment on `attackRefusalReason`
to cite §8.5's own requirement (the freeing action is a move) instead of the
now-inaccurate "an attack never does". `announcements.ts`'s exhaustive
`rejectionSentence` switch gained both new sentences, with the
`"target-out-of-range"` wording carrying the four-shield/diagonal fact per
the plan's recommendation. Rewrote `combat.test.ts`'s `adjacentSquares`
describe block into a new `attackReach` describe block, replaced the two
inverted range tests with shield-count-by-shield-count coverage (4-shield
orthogonal-only, 3-shield's unchanged eight-neighbour fulcrum, 0-shield's
three-orthogonal/two-diagonal reach), added `"attack-path-blocked"` coverage
for a blocker of either side and the cleared-path case, and added a
`"target-out-of-range"` test; the pre-existing bay/friendly/ownership/
already-acted tests already exercised checking those ahead of range and
path (their targets were already within reach), so no new "order" test was
needed beyond renaming the reason string. Updated the reason string in
`session.test.ts`, `ply.test.ts` and `announcements.test.ts`. No deviations
from the plan. `npm run typecheck`, `npm run lint`, `npm test` (621/621,
including `fullGame.test.ts` completing at the expected ply), `npm run
build` and `npm run format:check` all pass.

In `src/rules/combat.ts`:

- **Delete** `ADJACENT_OFFSETS` and `adjacentSquares`. Nothing outside
  `combat.ts` and `combat.test.ts` uses them.
- **Rewrite the module header.** It currently explains at length why §7's range
  is _not_ derived from `reachFrom` and must not be coupled to §6's table. That
  is now exactly backwards: §7's range **is** §6's range, there is one
  implementation of the table, and both sections read it.
- Add **`attackReach(state, shipId, target)`** returning the `ReachEntry` whose
  `destination` is `target`, from `reachFrom(attacker.square,
attacker.shields)`, or `undefined` when the target is out of the attacker's
  reach (Decision 4). Import `reachFrom` and `ReachEntry` from
  `./moveLegality`, which `combat.ts` already imports `findShip` from — not
  from `./movement`, whose §8.5 and §9 layers this has no business pulling in.
  Its doc comment states what it is _not_: no ownership, no bays, no occupancy,
  no ply awareness — pure geometry, shared by the legality check and (from
  Step 5) by the advance.
- In `AttackRefusalReason`, `"target-not-adjacent"` becomes
  **`"target-out-of-range"`**, and a new **`"attack-path-blocked"`** joins it.
- `sevenOnlyAttackRefusalReason` judges the target with `attackReach`:
  `undefined` → `"target-out-of-range"`; otherwise, if any square in the
  entry's `passedOver` is occupied by a ship of **either** side →
  `"attack-path-blocked"`. Both go **last**, after ownership, already-acted,
  the attacker's bay and every check about the target square, so a bay target
  is still refused as `"target-in-bay"` even though a bay can be within reach.
  Nothing about the target square is inherited from §6 beyond this: the target
  is of course occupied (there is no analogue of `"destination-occupied"`), and
  the target's own site state is irrelevant (a ship stranded on a depleted site
  can still be attacked).
- `sevenOnlyLegalTargets` enumerates `reachFrom(attacker.square,
attacker.shields)`'s destinations instead of the eight neighbours, filtering
  as it already does by `sevenOnlyAttackRefusalReason`.
- **Reword the §8.5 comment** on `attackRefusalReason`. "A move can free a
  stranded ship, but an attack never does" is no longer true once Step 5 lands
  and is inaccurate to write here now. Replace it with §8.5's own requirement:
  the freeing action is a move, so while the obligation binds it refuses every
  attack the same way, including the owing ship's own (Decision 13).

In `src/board/announcements.ts` — the `switch` in `rejectionSentence` is
exhaustive, so this file must change in the same step:

- `"target-out-of-range"` replaces the old sentence "An attack reaches only the
  eight squares around a ship", which is now false. The new one tells the
  player the truth and carries the story's most surprising consequence, because
  this sentence is the only place a player will discover it. Recommended
  wording, which the step may polish but must keep the facts of: `"<square> is
out of attack range. A ship attacks as far as it moves, so shields shorten
its reach — a ship with four shields can only strike one square up, down,
left or right."`
- `"attack-path-blocked"` gets its own sentence, distinct from a move's
  `"path-blocked"` so the player knows which action was refused. Recommended:
  `"Another ship stands in the way, so the attack cannot reach <square>."`

No change is needed in `src/board/Board.tsx`: it highlights whatever
`legalTargets` returns, so longer-range highlights simply appear.

Tests. In `src/rules/combat.test.ts` the `adjacentSquares` describe block goes,
and two existing tests invert outright — "a 4-shield ship can strike diagonally
though it cannot move that way" and "a 0-shield ship's three-square orthogonal
reach grants it no extra attack range". Replace them, and the rest of the range
coverage, with:

- **Range matches `reachFrom` shield count by shield count.** A 4-shield ship's
  legal targets are its four orthogonal neighbours and never a diagonal one; a
  3-shield ship's are exactly the eight squares the old implementation produced
  (the fulcrum — this is the one shield count the story does not change); an
  unshielded ship can attack three squares orthogonally and two diagonally.
- **`"attack-path-blocked"`** when a ship of **either** side stands between
  attacker and target, and the same attack legal once that square is empty.
- **`"target-out-of-range"`** for a target beyond the reach.
- **Order**: a bay target within reach is refused `"target-in-bay"`, an enemy
  ship's own square is refused `"not-your-ship"`, and an attacker in a bay is
  refused `"attacker-in-bay"` — all ahead of range and path.
- `attackReach` itself: returns the entry with the right `passedOver` for a
  two-square orthogonal and a two-square diagonal attack, and `undefined`
  beyond reach.

`src/game/session.test.ts`'s "rejects a distant enemy as out of attack range,
not as a blocked or occupied move" keeps its intent and moves to the new reason
string, and `src/board/announcements.test.ts` covers both new sentences.

Depends on: Step 3 (the already-acted check is already in
`sevenOnlyAttackRefusalReason`, so this step only reorders around it; and the
`AttackRefusalReason` union has settled).

Verification (automated): `npm test`, with the range assertions above as the
step's own proof. `src/rules/fullGame.test.ts` must still play a hundred-round
game to completion — the policy attacks only when no ship has a legal move, so
a changed range must not strand it.

---

## Step 5 — The winner advances

Status: committed

Notes: Implemented exactly as specified. `combat.ts` gained `winnerAdvance(state, reach)`, scanning `reach`'s lane backwards and consulting only `siteStateAt` (dormant/depleted) — no occupancy re-check, no `sixOnlyMoveRefusalReason`. `ply.ts`'s `applyAttack` attacker-won path now: places the loser in its bay first (unchanged), then — only when `winnerIsAttacker` — calls `attackReach` on the pre-fight `state` (throwing a `RangeError` if `undefined`, per Decision 4), computes the advance, and when defined moves the winner and calls `wakeTouchedSites` with the advance's `ReachEntry`, appending its `SiteChargedEffect`s between `fight-resolved` and the tail's effects. `FightResolvedEffect.winner` gained `square` and `advanced`; `AttackEffect` widened to include `SiteChargedEffect`. `assertFightInvariants` was rewritten (not relaxed) to the invariants the step lists — every ship except a returned one or the advancing winner unchanged, the winner's square on its own travelled lane and never a bay, and site-state changes confined to the travelled squares and always `active`→`charged` — and exported (along with the new `AdvancingWinner` type) so it could be pinned directly by two hand-constructed "impossible outcome" tests, since it has no other public seam. `nodes.ts` and `session.ts`'s `AttackedEvent` comment were widened from "a move" to cover the advance, per the plan.

Tests: added `winnerAdvance`'s own describe block in `combat.test.ts` (the three stop-short diagrams direct against the function, including the three-square lane per Decision 10, plus the exhaustive never-a-bay sweep), and a new "the winner's advance" describe block plus an `assertFightInvariants` describe block in `ply.test.ts` (the four reachable advance distances via `applyAttack`, the two reachable stop-short cases, wake-on-landed-on and wake-on-flown-over with clock checks, the effect-order/end-to-end payoff test, and defender-won/mutual-return-wake-nothing). Six pre-existing `ply.test.ts` tests that asserted "the winner stays put" were rewritten to the new rule (renamed/re-targeted, never weakened), and one `Board.test.tsx` test ("keeps focus on the attacked square, which now reads as empty") had its premise inverted by the rule change, so its title and cell lookup were corrected to match the winner now standing there — a necessary consequence of the behaviour change, not a widening of this step's scope.

One deviation from the plan's literal wording, found while writing the exhaustive never-a-bay sweep: the plan describes it as "every `reachFrom` entry from" a non-bay origin, but `winnerAdvance`'s "never lands in a bay" guarantee (Decision 11) depends on the lane's _destination_ itself not being a bay — a precondition normally enforced by `sevenOnlyAttackRefusalReason`'s `"target-in-bay"` refusal before `winnerAdvance` is ever called, not by `winnerAdvance` itself. A raw `reachFrom` entry whose destination is a bay (e.g. a ship one square from the board edge) is a real entry `reachFrom` produces and is not excluded by that phrase, and asserting it lands the sweep on a false failure. The sweep now skips lanes whose destination is a bay, with a comment explaining why, matching the property `winnerAdvance` actually has rather than the stronger one the sentence would otherwise imply. `FightResolvedEffect`'s widened `winner` shape also required updating five hand-built fixtures in `src/board/announcements.test.ts` (Step 6's file) to keep it compiling, since TypeScript now requires `square`/`advanced` on any literal typed as `FightResolvedEffect`; done as the minimal type-correctness fix, with values chosen to be internally consistent (attacker-won fixtures given the target square and `advanced: true`; the defender-won fixture given the defender's own square and `advanced: false`) and left for Step 6 to build on rather than pre-empting its wording work.

The story's most intricate change, and the only genuinely new behaviour.

In `src/rules/combat.ts`, add **`winnerAdvance(state, reach)`** (Decision 5):
given the attack's `ReachEntry`, scan the lane **backwards** from the loser's
square through `passedOver` and return the first square the winner may legally
end on, shaped as a `ReachEntry` of its own — `destination` = that square,
`passedOver` = the lane squares before it — or `undefined` when there is none
and the winner holds its ground. "May legally end on" is §6's site restriction
and nothing else: not a dormant site, not a depleted site. Do not re-check
occupancy (the path was clear when the attack was judged and the loser is placed
in its bay first), and do not consult `sixOnlyMoveRefusalReason` — an advance is
not a move.

In `src/rules/ply.ts`, in `applyAttack`'s **`attacker-won` branch only** (the
`defender-won` and `mutual-return` branches are not touched):

1. Take the lane from `attackReach`, throwing a `RangeError` if it is
   `undefined` — impossible, since `attackRefusalReason` has already passed
   (Decision 4).
2. Resolve the fight and place the loser in its bay exactly as today (§7.1
   requires the placement to happen as part of resolving the fight, and it is
   what empties the square the winner is about to take).
3. Compute the advance with `winnerAdvance`. When it is `undefined` the winner
   stays where it is and **nothing else in this list happens**.
4. Move the winner to the advance's destination. Its shields are the fight's
   result and are not touched again: the advance is not a move, so §3.1's bay
   penalty does not apply — and it can never be triggered anyway (Decision 11).
5. Call `wakeTouchedSites` with the advance's `ReachEntry` and the winning ship,
   exactly as `applyMove` does with a move's, and append its effects. §8.2
   fires over the **whole** advance: a site the winner passes over wakes just as
   one it lands on does, because §8.2 does not distinguish them.

Effects and types:

- `FightResolvedEffect.winner` gains the **square** the winner stands on after
  the fight and whether it **advanced** (Decision 6). On a defender win the
  square is the defender's own and `advanced` is false.
- `AttackEffect` widens to include `SiteChargedEffect`.
- Effect order in the returned list: the `fight-resolved` effect first (the
  fight is the headline fact), then any `site-charged` effects, then whatever
  `applyEndOfActionTail` appends. `applyMove` orders its effects the same way.
- `applyAttack`'s doc comment and the module header both currently assert that
  neither ship changes square; both are rewritten. So is
  `AttackedEvent`'s comment in `src/game/session.ts` ("Neither ship moves
  (rules.md §7), so `from` is the attacking ship's own square") — `from` is
  still the attacker's pre-fight square, but the reason given is now wrong.
- `src/rules/nodes.ts`'s header and `wakeTouchedSites`'s doc say "a move" and
  "the move that made it"; widen them to a ship's path, whether it came from a
  move or from a winning attacker's advance. No logic in `nodes.ts` changes.

**`assertFightInvariants` is rewritten** (Decision 12). It now takes what it
needs to judge the advance — the returned ships, and (when there was one) the
winner's id and the squares its lane offered. It asserts:

- No ship is missing, and each side's fleet size is unchanged (both kept as
  they are).
- Every ship except the returned ship or ships **and the attacking winner** is
  exactly where it was.
- The attacking winner is either on the square it started from or on a square
  of its own lane — never anywhere else.
- The winner's square is **not a bay** (Decision 11), with a message saying
  this is guaranteed by §3.1 and §3.2 and so indicates a bug.
- Site states changed only at squares the winner actually travelled over, and
  every such change is `active` → `charged`. The current identity check
  (`after.siteStates !== before.siteStates`) is replaced by this, and it still
  catches a fight that changes a site when nobody moved, because the travelled
  set is empty in that case.

Tests, in `src/rules/ply.test.ts` unless noted. Existing tests that assert the
winner stays put — "resolves an attacker's win: the attacker stays put…" and
"leaves neither ship moved: the winner stays put and the loser's square is
empty" — are rewritten to the new rule.

- **The advance lands on the loser's square** for an attack from one square
  orthogonally, one square diagonally, and two squares (orthogonal and
  diagonal), with every square in between left empty afterwards. **Not three
  squares** — a three-square attack requires a 0-shield attacker, which can
  never win (Decision 10). Note that constraint in the test file where it will
  be read, not as a story reference but as the rules fact it is.
- **The stop-short rule**, against `winnerAdvance` directly so all three of the
  story's diagrams can be tested including the three-square lane: the loser's
  square dead → the winner takes the square before it; that square dead too →
  it takes the one before that; an adjacent attack onto a dead square → no
  legal square at all, so `undefined` (hold ground). Then one `applyAttack`
  test for the reachable version of each: a two-square attack whose target
  stands on a depleted site, and an adjacent attack onto a dormant site.
- **The defender-won and mutual-return branches are unchanged**, asserted
  directly: on a defender win the defender's square is identical before and
  after; on a draw both squares are empty and both ships are in bays with 0
  shields, the attacker placed first.
- **The advance wakes nodes**: an active site the winner **lands on** charges
  (`reach: "landed-on"`), an active site it merely **passes over** charges
  (`reach: "flown-over"`), and the site's `enteredOnPly` clock starts in both
  cases.
- **The end-to-end payoff**, worth one test that walks the whole way through: a
  winner that advances onto an active site wakes it, is standing on a charged
  node when the action ends, and collects §8.4 energy and a §4.1 shield when
  the turn ends.
- **A defender win and a mutual return wake nothing**, asserted against a board
  with an active site on the attacker's own square, on the lane, and on the bay
  the loser is placed in: `siteStates` is identical before and after and no
  `site-charged` effect is emitted. (Placement in a bay is not travel; it has
  never woken anything and must not start now.)
- **The winner's square is never a bay**, as an exhaustive sweep over
  `winnerAdvance`: every non-bay origin square on the board × every shield
  count × every `reachFrom` entry from it, against two extreme site
  configurations — all sites depleted (so the winner stops as early as it ever
  can) and all sites active (so it always runs to the end of the lane) —
  asserting the resulting square is never a bay. This covers the three-square
  lanes `applyAttack` cannot reach.
- **`assertFightInvariants` still fires on a genuinely impossible outcome**:
  hand-construct a post-fight state in which an uninvolved ship changed square,
  and one in which the winner landed off its lane, and assert each throws.

Depends on: Step 4 (`attackReach` exists and the attack's legality already
guarantees a clear lane; without the clear-path rule the advance could pass
through an occupied square).

Verification (automated): `npm test`, with the tests above as the step's own
proof, and `src/rules/fullGame.test.ts` still completing — now the strongest
signal in the suite, since the policy fights often and every fight it wins
moves a ship.

---

## Step 6 — The fight's words: where the winner ended up

Status: committed

Notes: Added `winnerAdvanceClause` in `src/board/announcements.ts`, mirroring
`moveSentence`'s "charged the node" / "flying over `<square>` and charging the
node" wording exactly, and spliced it into `fightSentence`'s attacker-won
branch between "and won." and the beaten ship's bay clause. It reads the
`site-charged` effect from `event.effects` the same way `moveSentence` reads
it from a move's effects (via `Extract<AttackEffect, { type: "site-charged" }>`).
Held-ground reads as "It held its ground." with no square named, per the
step's requirement that the two shapes be distinguishable. Updated the four
existing `announcements.test.ts` fixtures that had `advanced: true` (added by
Step 5 for compile-correctness) to expect the new clause, and added four new
tests: an attacker holding its ground, an advance charging a node it landed
on, an advance charging a node it flew over, alongside the pre-existing
defender-won and mutual-return tests confirming those sentences are
unchanged. The mutual-return and losing-attacker sentences needed no edit at
all — the plan anticipated this ("adjusted only where the effect's new shape
forces it"), and neither branch reads `winner.square`/`advanced`, so nothing
forced a change. `Board.test.tsx`'s existing end-to-end live-region test for
an attack already asserted only a sentence prefix, so it kept passing
unchanged. No deviations from the plan. `npm run typecheck`, `npm run lint`,
`npm test` (642/642), `npm run build` and `npm run format:check` all pass.

In `src/board/announcements.ts`, `fightSentence` reports the advance. The
attacker-won sentence must carry four facts, and a player must be able to tell
the two shapes apart:

- The winner **advanced** to a named square and took it — or **held its
  ground**, which happens only when every square on the lane is one it may not
  end on.
- The beaten ship's bay and its zero shields (unchanged).
- The fight's cost and the winner's remaining shields (unchanged).
- **If a node was charged by the advance**, say so, in the vocabulary
  `moveSentence` already uses: "charged the node" when the winner landed on it,
  and "flying over `<square>` and charging the node" when it only passed over
  it. Read this from the `site-charged` effect now present in the attack's
  effects; without it a player would hear nothing about the single biggest
  payoff of the change.

The mutual-return and losing-attacker sentences keep their wording, adjusted
only where the effect's new shape forces it.

`src/board/announcements.test.ts` covers, at minimum: an attacker that advances
onto the loser's square; an attacker that advances and charges a node it landed
on; an attacker that advances and charges a node it flew over; an attacker that
held its ground; a defender win; and a mutual return.

Depends on: Step 5 (the effect carries the winner's square and whether it
advanced, and an attack can now carry `site-charged` effects).

Verification (automated): `npm test` — the announcement tests above pass, and
the live-region test in `src/board/Board.test.tsx` (or `App.test.tsx`, wherever
it currently exercises an attack end to end) still reads a whole fight sentence
correctly.

---

## Step 7 — The board and the session at range

Status: committed

Notes: Added a new "attack range" describe block to `Board.test.tsx` (after
"attack targets") with five tests: a 1-shield ship highlighting a target two
squares away with the predicted-outcome mark; a 4-shield ship showing no
target on a diagonal neighbour (asserting the enemy cell renders plainly,
with no "can attack here" wording); a blocked two-square lane showing no
target; a long-range target offering no highlight when the attacking ship
has already acted; and an axe check on a board carrying a long-range
highlight (`color-contrast` disabled). The already-acted-is-refused-with-the-
sentence half of that bullet was already covered end to end by Step 3's
existing "rejects activating an own ship that has already acted this turn"
test in the "playing a turn" describe block, so no new interactive test was
added for it — only the highlighting half was new. Added one test to
`session.test.ts` ("reports a target count that includes a target beyond the
eight neighbours") using a 1-shield attacker with an enemy two squares away.
No production code changed; no deviations from the plan beyond the
already-acted note above. `npm run typecheck`, `npm run lint`, `npm test`
(648/648, up from 642), `npm run build` and `npm run format:check` all pass.

By this step the suite is already green: every component test broken by
Steps 2–6 was fixed in the step that broke it. This step **adds** the UI-level
coverage the story asks for, and records the two legibility observations for
the manual gate.

In `src/board/Board.test.tsx`:

- Selecting a ship highlights targets at its **true** range: a 1-shield ship
  with an enemy two squares away shows that square as a target (with the
  predicted-outcome mark `resolveFight` supplies), and a 4-shield ship with an
  enemy on a diagonal neighbour shows it as **no** target at all.
- A ship that has **already acted** this turn offers no highlights of either
  kind, and activating it is refused with the already-acted sentence.
- A blocked lane: an enemy two squares away with a friendly ship between is not
  highlighted as a target.
- axe finds no violations on a board carrying long-range highlights (with
  `color-contrast` disabled, per CONTRIBUTING.md).

In `src/game/session.test.ts`: selecting a ship reports a target count that
includes targets beyond the eight neighbours.

Depends on: Step 6 (all rules and wording behaviour is final, so these tests
assert the story's end state rather than an intermediate one).

Verification (automated): `npm test` — the new component tests pass and axe
reports no violations.

---

## Step 8 — Manual gate: combat at range, and taking the ground

Status: committed

Notes: The owner ran the app and confirmed all seven criteria pass. No
findings, so no follow-up step or story.

The owner runs the app and looks. Nothing is implemented in this step; findings
either become a follow-up step here or a follow-up story, at the owner's
discretion.

Run `npm run dev` and open `http://localhost:5273` and verify these criteria:

1. **Attacking at range reads clearly.**
2. **A 4-shield ship cannot strike a diagonal.**
3. **A winner advancing reads as one event, not two things that happened to the board.**
4. **Taking a node by winning a fight feels like the payoff it is meant to be.**
5. **The stop-short case reads sensibly.**
6. **One action per ship reads correctly.**
7. Keyboard and screen reader: the whole sequence above is reachable by keyboard alone, and the live region reads each action once.

Depends on: Step 7 (all rules and wording behaviour is final).

Verification (manual): the owner confirms each of the criteria, or records
what needs changing. The pipeline pauses here.

---

## Step 9 — README check

Status: pending

Run `/update-readme`, which reviews the branch diff and updates `README.md` if
warranted. Step 1 already corrected the two sentences that contradicted the new
ruleset; this step is the final accuracy pass over everything the whole story changed.

Check in particular that the status blockquote:

- describes attack range as the ship's movement range, and says shields shorten
  it;
- says a winning attacker takes the square it cleared, and that a fight can
  therefore take a node in one action;
- says a ship takes one action a turn, so a turn's two actions use two
  different ships;
- no longer says anything about the winner holding its ground, about clearing a
  node needing both actions, or about a moved ship still being able to attack;
- keeps its player-facing voice and its honest list of what the app still
  cannot do (no saving or recording, no computer opponent, no choice of game
  length).

Depends on: Step 8 (the branch is complete and manual verification is done, so
the README describes the app as it actually ships).

Verification (automated): `npm test`, `npm run build` and `npm run
format:check` pass, and a read of `README.md` against `doc/ruleset/rules.md`
0.8 turns up no remaining contradiction. `grep -n "eight squares\|holds its
ground\|moves twice" README.md` returns nothing.
