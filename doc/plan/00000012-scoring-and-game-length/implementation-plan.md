# Implementation Plan — 00000012 Scoring and game length

This plan turns [`story.md`](./story.md) into an ordered sequence of steps. Each
step is implemented, verified and committed on its own, by an agent that has
read only `story.md`, this plan, and its own step. Everything a step needs is
stated here — including the reasoning behind every decision, because the code
does not carry design history (CONTRIBUTING.md, "Comments").

## What this story builds

The game keeps score, counts its rounds, and ends.

- **§8.4 energy** fills step 2 of the end-of-turn sequence, which
  `src/rules/endOfTurn.ts` has carried as a documented empty slot since story 00000009. At the end of a player's turn that player collects energy for the
  charged hubs their ships are standing on, on a fixed six-value table.
- **§9's hundred rounds** become real. The game's length is carried **in
  `GameState`**, defaulting to §9's hundred, and every piece of round
  arithmetic reads it from the state it was handed. Once the last ply is
  played, nothing further is legal and the game has a result.
- **The chrome gets a look.** A new `src/hud/` folder holds an arcade strip
  between the title and the board — both scores, a pip row per side showing
  how many hubs that side holds, the round counter, and the turn indicator —
  plus the game-over panel with its play-again button. The board itself keeps
  the look settled in stories 1, 3 and 9; the only thing that crosses onto it
  is a decorative overlay drawing the `+N` a collection paid.

**One rules edit** (Step 1) lands first, in its own commit: version **0.7**,
renaming influence to **energy** throughout and replacing §8.4's payout table
with 0, 1, 3, 6, 10, 15. The payout change alters how the game is played, so
the version would be a tagging candidate — but tagging is on hold until the
game plays (CLAUDE.md), so no tag is made.

Out of scope, per `story.md`: restyling the board, letting a player choose the
game's length (the plumbing is built; the choice is not offered), changing §9's
number or adding a tie-break, recording or replaying a game, a score history,
sound, any engine, and any start screen or seed entry.

## Sources of truth

- **The rules.** [`doc/ruleset/rules.md`](../../ruleset/rules.md), at **version
  0.6** when this plan was written and **0.7** from Step 1 onwards. The sections
  implemented here are **§8.4** (energy and its table), **§8.7 step 2** (where
  the collection sits in the end-of-turn order), **§9** (the game ends after 100
  rounds; most energy wins; equal energy is a draw), and **§5** (the pass, which
  this story must stop firing past the end). Where the app and the document
  disagree, the document is right.
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
  - **`Math.random` is banned by lint**; nothing added by this story is random;
  - **comment style**: a short module header saying what the module is for, and
    inline comments only where the code is not self-evident. **No story
    numbers, no plan-step references, no design history in code** — a peer
    review treats that as a finding when it leaks into `src/`.
- **The vocabulary** (CLAUDE.md). Code, tests and this plan say **ply** and
  **hub**; player-facing text — accessible names, live-region sentences, the
  HUD, `README.md`, `rules.md` — says **turn** and **node**. **Round** is the
  same word everywhere. **Energy** is the same word everywhere: rules, code and
  UI. **Move** means one ship changing squares and never means a ply.

## What is already in place

- `src/rules/board.ts` — `Square` (`{ column, row }`), `squareAt`,
  `squareName`, `COLUMN_LETTERS`, `BOARD_SIZE` (15).
- `src/rules/fleet.ts` — `Side` (`"green" | "red"`), `ShipId`,
  `STARTING_FLEET`.
- `src/rules/sites.ts` — `SITES` (seventeen squares), `SiteState`
  (`"dormant" | "active" | "charged" | "depleted"`), `startingSiteState`, the
  two nine-ply clocks.
- `src/rules/gameState.ts` — `Ship`, `SiteStatus`, `GameState` (`ships`,
  `siteStates`, `sideToMove`, `actionsRemaining`, `movedThisPly`, `plyNumber`,
  `randomSeed`, `returnPositionIndex`), `ACTIONS_PER_PLY` (2),
  `startingGameState(randomSeed)`, `shipsBySquare`, `siteStateAt`,
  `siteStatusAt`. Plain readonly data; **nothing derived is stored**.
- `src/rules/moveLegality.ts` — §6 alone: `reachFrom`, `MoveRefusalReason`,
  `findShip`, `sixOnlyMoveRefusalReason`, `sixOnlyLegalDestinations`.
- `src/rules/movement.ts` — the public §6 API layered with §8.5:
  `moveRefusalReason`, `legalDestinations`, `sideToMoveHasLegalMove`.
- `src/rules/combat.ts` — §7: `AttackRefusalReason`,
  `sevenOnlyAttackRefusalReason`, `sevenOnlyLegalTargets`,
  `attackRefusalReason`, `legalTargets`, `resolveFight`, `receptacleBay`,
  `returnPositionSquare`.
- `src/rules/actions.ts` — `sideToMoveHasLegalAction` (built on the six-only
  and seven-only layers, for the §5 pass guard) and `shipHasLegalAction` (built
  on the public layers, for the board and the session).
- `src/rules/endOfTurn.ts` — §8.7's six steps in order, `EndOfTurnEffect`, and
  the comment `Step 2: influence (§8.4) — awaits its own story. No total is
kept.` — this story's entry point.
- `src/rules/ply.ts` — `applyMove`, `applyAttack`, the shared
  `applyEndOfActionTail` (spends an action; on the ply's second action runs
  `runEndOfTurn`, advances `plyNumber`, swaps `sideToMove`, clears
  `movedThisPly`; then runs the pass guard), and `applyPassGuard`.
- `src/game/session.ts` — `Session` (`state`, `selectedShipId`, `lastEvent`),
  `SessionIntent` (`activate` / `dismiss`), `SessionEvent`, `RejectionReason`
  (`MoveRefusalReason | AttackRefusalReason | "nothing-to-select"`),
  `createSession(state)` (runs the pass guard once), `sessionReducer`.
- `src/game/seed.ts` — `freshSeed()`, deliberately outside `src/rules/`.
- `src/board/announcements.ts` — **all** player-facing wording:
  `announcementFor(event)` for the live region and `turnIndicatorText(state)`
  for the indicator. 35 direct call sites in `announcements.test.ts`.
- `src/board/Board.tsx` — builds 225 cell descriptors from the session and
  renders `.board-frame` → row labels, `AccessibleGrid` (`role="grid"`), a
  corner spacer and column labels. The labels sit **outside** the grid element
  and are `aria-hidden`, because a `role="grid"` element may only own rows.
- `src/board/Board.css` — `.board-frame` is a 16 x 16 CSS grid whose track size
  `--square` is `max(40px, 6.25cqmin)`, measured against `.app__board`'s size
  container. `.board` occupies `grid-column: 2 / 17; grid-row: 1 / 16`.
- `src/board/BoardSquare.css` — the `prefers-reduced-motion: reduce` pattern
  this story follows (`animation: none` plus a static end state).
- `src/board/TurnIndicator.tsx` / `.css` / `.test.tsx` — moves to `src/hud/` in
  Step 12, unchanged in behaviour.
- `src/App.tsx` — title, `TurnIndicator`, `.app__board` (a size container)
  wrapping `Board`; the opening seed drawn once by `freshSeed()`.
- `src/index.css` — the deep-space palette custom properties, including
  `--color-green`, `--color-red`, `--color-text-bright`, `--color-text-dim`.

Nothing in the codebase currently accumulates a total, ends a game, or refuses
an action for any reason other than legality under §5–§8.

## Where the code goes

| Path                                   | Change                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `doc/ruleset/rules.md`                 | influence → energy; §8.4's table; version → 0.7 (Step 1 only)                                             |
| `doc/ruleset/changelog.md`             | the 0.7 entry (Step 1 only)                                                                               |
| `src/rules/rulesVersion.ts`            | `RULES_VERSION` → `"0.7"` (Step 1 only)                                                                   |
| `src/rules/energy.ts`                  | **new** — §8.4's table, its lookup, and the hubs a side holds                                             |
| `src/rules/gameLength.ts`              | **new** — §9's default, the round arithmetic, game-over, the result                                       |
| `src/rules/gameState.ts`               | `energy` and `lengthInRounds` on `GameState`; `startingGameState`'s new argument                          |
| `src/rules/endOfTurn.ts`               | step 2 fills its slot; `EnergyCollectedEffect`                                                            |
| `src/rules/movement.ts`                | `moveRefusalReason` and `legalDestinations` refuse once the game is over                                  |
| `src/rules/combat.ts`                  | `attackRefusalReason` and `legalTargets` likewise                                                         |
| `src/rules/moveLegality.ts`            | `"game-over"` added to `MoveRefusalReason`                                                                |
| `src/rules/ply.ts`                     | `applyPassGuard` returns untouched once the game is over                                                  |
| `src/game/session.ts`                  | activation refused once the game is over; a `new-game` intent                                             |
| `src/board/announcements.ts`           | the energy clause, the result sentence, the HUD's words, `announcementForSession`                         |
| `src/board/Board.tsx` / `.css`         | the decorative energy overlay, as a sibling of the grid                                                   |
| `src/board/boardView.ts`               | the centroid of a set of squares, in continuous grid coordinates                                          |
| `src/board/EnergyOverlay.tsx` / `.css` | **new** — the floating `+N` and the pulse rings                                                           |
| `src/hud/`                             | **new** — `Hud`, `ScoreDisplay`, `RoundCounter`, `GameOverPanel`, `countUp`, and `TurnIndicator` moved in |
| `src/game/reviewFixture.ts`            | **new, temporary** — a short game for the manual gates (Step 11, deleted Step 19)                         |
| `src/App.tsx` / `.css`                 | the HUD strip, the result panel, play again, the arcade chrome                                            |
| `src/index.css`                        | the arcade custom properties alongside the deep-space palette                                             |
| `README.md`, `CLAUDE.md`               | influence → energy (Step 1); README status paragraph (Step 20)                                            |

## Decisions taken at plan time

### 1. The rules edit comes first, and it is the only one

`rules.md` is what the code implements, so the document changes before anything
implements it (implementation-plan-guide.md, "Check the rules document").
Step 1 is therefore the rename, the new table, the version bump, the changelog
entry and `RULES_VERSION`, in one commit.

`README.md` and `CLAUDE.md` are renamed in that same commit, because the story
asks for the word "influence" to leave the repository in one move rather than
trailing behind the rules. This is deliberately narrower than Step 20's README
work: Step 1 changes the **word**, Step 20 rewrites the **status paragraph**
once every consequence of the story is known.

**Where "influence" legitimately survives.** Historical `changelog.md` entries
(0.1's "a 100-round game decided on influence") are a record of what those
versions said and are **not** rewritten — rewriting history would make the
changelog lie about itself. The 0.7 entry names the old word once, to say what
was renamed. Earlier documents under `doc/plan/` are equally historical and are
left alone. Everywhere else — `rules.md`, `src/`, `README.md`, `CLAUDE.md` —
the word goes.

### 2. The payout table is data, not arithmetic

§8.4 states six values. The code holds those six values as a table and looks
them up. The fact that 0, 1, 3, 6, 10, 15 are the triangular numbers is a
property of today's six numbers, not a rule about future ones: a later ruleset
paying 1, 3, 6, 10, 20 must be a one-line table edit, not a discovery that a
formula was load-bearing. **Do not write `n * (n + 1) / 2`.** This is the one
place a reviewer is most likely to propose a "simplification" that the story is
deliberately refusing.

The lookup **throws a `RangeError`** for a count outside 0–5 rather than
returning a default. Exactly five sites are active or charged at any moment
(§8.1), so a sixth held hub is a bug in the caller, and the rules layer's
habit is to throw on impossible input (`squareForGridPosition`, `findShip`,
`receptacleBay` all do).

### 3. `energy.ts` answers with squares, not a bare count

The end-of-turn effect needs the squares that paid (the board draws a pulse on
them and positions the `+N` at their centroid), and the HUD needs the count.
One function returning the squares serves both — the count is its length — so
there is no second walk of the state that could disagree with the first.

### 4. Energy totals live in `GameState`, not in the session

A running total is a rule fact under §8.4: a future engine will read it, and a
recorded game has to replay it exactly from its seed. The session holds only
what is about a player's interaction with the game — the selection and the last
event. This is also the first genuinely cumulative fact `GameState` carries,
which is fine: it is a fact the rules produce, not a derived one.

### 5. The game's length lives in `GameState` too

§9's hundred is the default, named in exactly one place
(`DEFAULT_GAME_LENGTH_ROUNDS` in `gameLength.ts`), and `startingGameState`
takes the length as a **defaulted** argument. Every other piece of code —
the round arithmetic, the refusal checks, the pass guard, the HUD, the result
panel — reads the length from the state it was handed and never from the
constant.

Two reasons, both from the story. First, a later story will let players choose
the length before starting; the alternative — a module constant consulted at
each point of use — puts the number in five places that would each need
reopening, the last of them a React component, which is the worst place to
discover a hardcoded rule. Carrying it in the state makes that future story a
start screen and nothing else. Second, a recorded game must replay exactly: a
record of a fifty-round game must not depend on what the app's default happened
to be on the day it is replayed. That is the same argument that already puts
the seed in the state.

The argument is **defaulted** so that every existing `startingGameState(seed)`
call across the test suite keeps working untouched. Churning dozens of call
sites to thread a value none of them cares about would bury the story's real
diff in noise.

`startingGameState` rejects a length that is not a positive whole number, with
a `RangeError`, on the same "impossible input is a caller bug" habit.

**§9 is not changed by this.** The document still says 100 rounds, because it
does. That a future story may make it configurable is an app fact, not a rule.

### 6. `gameLength.ts` and `gameState.ts` import in one direction only

`gameState.ts` imports the **value** `DEFAULT_GAME_LENGTH_ROUNDS` from
`gameLength.ts`; `gameLength.ts` imports only the **type** `GameState` (and
`Side`) with `import type`, which is erased at build time
(`verbatimModuleSyntax` is on). There is therefore no runtime import cycle. A
cold implementer who reaches for a value import in the other direction will
create one — do not.

### 7. Nothing derived is stored

No round counter and no game-over flag go into `GameState`. The round is
`ceil(plyNumber / 2)`; the game is over when `plyNumber` exceeds twice the
state's length in rounds. The state already refuses to store occupancy for the
same reason: a second copy of a fact is a second thing that can be wrong.

**The displayed round is clamped in the rules layer, not in the HUD.** After
the last ply the ply counter stands at 201 in a hundred-round game, so a naive
round reads 101. `currentRound(state)` returns `min(round, lengthInRounds)`, so
the counter holds at 100/100. Putting the clamp in `gameLength.ts` keeps the
arithmetic out of a component and gets it a plain unit test.

### 8. Game-over sits **above** the six-only / seven-only legality layers

This is the story's one genuine correctness trap, and Step 7 is written around
it.

Once the game is over, no action is legal — which is exactly the condition
`applyPassGuard` fires on. Left alone it would run an end-of-turn sequence for
ply 201, tick every clock, collect energy for a turn that does not exist, and
advance to 202, once per call, unboundedly.

So:

- `applyPassGuard` checks **game-over first**, before
  `sideToMoveHasLegalAction`, and returns the state untouched with no effect.
- The game-over refusal goes in `moveRefusalReason` and `attackRefusalReason`
  — the full, §8.5-aware public layers — checked **first**, ahead of ownership.
  **Owner decision (taken at the plan gate):** keeping this guard in the public
  list functions was confirmed, along with its visible consequence — the
  side-to-move's ships draw dampened once the game is over, behind the result
  panel. The reasoning accepted was that a list of legal destinations must not
  disagree with the function that judges legality.

- It goes in `legalDestinations` and `legalTargets` too, so the public layers
  keep agreeing with their own refusal functions (`sixOnlyLegalDestinations` is
  literally built from `sixOnlyMoveRefusalReason`; a public list that offered a
  square every refusal rejects would be an inconsistency).
- It **must not** go in `sixOnlyMoveRefusalReason`, `sixOnlyLegalDestinations`,
  `sevenOnlyAttackRefusalReason` or `sevenOnlyLegalTargets`. Those exist
  precisely so the pass guard can ask "is any action legal here" without §8.5
  answering the question; putting game-over into them would make the pass guard
  see a player with no legal action and pass on their behalf — the exact
  unbounded loop above.

One accepted consequence: `shipHasLegalAction` is built on the public layers,
so once the game is over the board draws the side to move's ships with the
`no-action` condition (dampened). That reads as the board going quiet, the
result panel covers it anyway, and it is preferable to a board that still
advertises moves nobody may make.

### 9. A zero collection is not an event

A player holding no hub has not had something happen to them. No effect is
emitted, so there is no "collected 0 energy" clause in the live region on most
turns of the opening, and no float on the board. The totals are unchanged, and
the HUD keeps showing them as text regardless.

### 10. The end of the game is a derived fact, not an effect (open item)

`story.md` leaves open whether the end of the game reaches the app as an
effect, a derived fact, or both. **Decision: a derived fact only.**

- It is not something a step _does_. Every other end-of-turn effect reports an
  action the sequence took (a shield gained, a node run out, a site woken); the
  game ending is a threshold `plyNumber` crossed, computable from the state at
  any time by anyone holding it.
- An effect would have to be emitted exactly once, from either
  `applyEndOfActionTail` or `applyPassGuard`, and a state loaded mid-way — a
  replayed record, a future engine's search node, this story's own review
  fixture — would never have seen it. A derived fact is correct for every state
  however it was reached.
- It matches the codebase's standing rule that nothing derived is stored
  (decision 7).

Consequence for wording: the live region needs the resulting **state**, not
just the event, to know the game has ended. `announcements.ts` therefore gains
a second entry point, `announcementForSession(session)`, which `Board` calls in
place of `announcementFor(session.lastEvent)`. The split is deliberate:
`announcementFor(event)` stays the unit that words an event (35 existing tests
call it directly and none of them needs a state), and
`announcementForSession` is the one that words _the game_. It substitutes the
result sentence for the "whose turn is next" clause when the game is over,
rather than appending it — otherwise a screen reader would hear "Green's turn —
2 actions left" immediately followed by "the game is over".

### 11. The full-game test's policy lives in the test (open item)

`story.md` leaves open how the end-to-end test chooses its actions. **Decision:
a small deterministic greedy policy written inside the test file
(`src/rules/fullGame.test.ts`), never in `src/rules/`.** The rules layer
implements the rules; it does not know how to play.

The policy, evaluated fresh for each action:

1. Among the side to move's ships in fleet order, and each ship's
   `legalDestinations` in the order that function returns them, take the first
   destination that is a **charged** hub. (This is what makes the game score.)
2. Otherwise take the destination that most reduces the Chebyshev distance to
   the nearest charged or active site, first ship and first destination in the
   same enumeration order winning ties. (This is what makes ships converge on
   hubs instead of wandering, so the totals are non-trivial.)
3. Otherwise, if there is no legal move at all, take the first legal attack in
   ship-then-target enumeration order.
4. If neither exists, apply nothing and let the pass guard do its work.

It is deterministic without any randomness of its own, so it never touches
`state.randomSeed` and never perturbs §8.6's draws — the game's one random
element stays the seeded one. `Math.random` is banned by lint in any case.

### 12. The score's count-up animates towards its prop and never owns the total (open item)

`story.md` leaves open where the roll lives. **Decision: in the HUD, split into
a pure module and a thin hook, with the prop remaining the only source of
truth.**

- `src/hud/countUp.ts` holds a pure function of `(from, to, elapsedMs)` →
  the integer to display, plus the duration constant. It is unit-tested in the
  `node` environment: it never overshoots, it returns exactly `to` once the
  duration has elapsed, and it handles a target that goes down as well as up.
- `src/hud/useCountUp.ts` is a hook taking the authoritative total and
  returning the number to draw. It **animates towards the current prop and
  always settles exactly on it**; it never adds a delta to its own previous
  value, so it cannot drift into being a second total. If the prop changes
  mid-roll it re-targets from wherever it currently is. On first render it
  returns the prop unchanged — a fresh render never rolls up from zero, which
  also keeps component tests deterministic.
- Under `prefers-reduced-motion: reduce` (read with `window.matchMedia`) it
  returns the prop directly, per the story and the pattern `BoardSquare.css`
  already establishes. jsdom implements `matchMedia` and reports
  `matches: false`, so tests take the animated path; because a fresh render
  starts at the target, they still see the true number.
- **The animation is never the only channel.** The rolling digits are
  `aria-hidden` decoration; each score cell also carries a visually hidden
  sentence from `announcements.ts` ("Green: 24 energy, 3 nodes held.") holding
  the true total and the true pip count. Component tests assert that sentence,
  so no test is ever racing an animation frame.

The `requestAnimationFrame` loop itself is not automated — jsdom has no clock a
DOM test can meaningfully drive here — and is covered by the manual gate in
Step 18. The pure function underneath it is fully tested.

### 13. The floating gain reuses the board's own geometry (open item)

`story.md` leaves open how the overlay learns the grid's geometry. **Decision:
it does not measure anything. It is a grid item in the board's own grid,
occupying the same area as the grid element, and positions its children in
percentages.**

`.board-frame` is already a CSS grid whose track size is derived from
`.app__board`'s size container, and `.board` occupies
`grid-column: 2 / 17; grid-row: 1 / 16`. The overlay is a sibling placed in
that identical area, so it is exactly the grid's box by construction, at every
viewport size, with no `ResizeObserver`, no `getBoundingClientRect`, and no
second source of geometry that could disagree with the first. A float at
continuous grid coordinates `(row, column)` sits at
`left: (column + 0.5) / 15 * 100%`, `top: (row + 0.5) / 15 * 100%`, with
`translate(-50%, -50%)`.

The coordinate arithmetic is **not** in the component: `boardView.ts` — which
already owns the mapping between rule-space squares and screen-space grid
positions — gains a pure function from a set of squares to that percentage
pair, unit-tested alongside the existing mapping tests.

**One payout, one number.** §8.4 pays for the _count_ of hubs held, so a player
holding three collects six, not 1 + 2 + 3 attributed to three squares. The `+N`
therefore sits at the **centroid** of the held hubs in continuous coordinates:
with one hub held that is exactly on it (the common case, and it reads
correctly); with several it sits between them, which reads as the group paying
together, which is what happened.

### 14. The overlay is a pure function of the session, with no timers

The overlay renders whatever collections the session's **last event** reported,
and nothing else. No `useState`, no `useEffect`, no `setTimeout`: the float and
the pulse are CSS animations that end at `opacity: 0` and stay there until the
next event replaces them. An element that has finished animating is invisible,
`aria-hidden` and `pointer-events: none`, so leaving it mounted costs nothing
and is far simpler than a timer whose lifetime has to be reconciled with React.

Two collections can arrive in one event: an action that ends a ply
(`ply-ended`, the moving side collects) can be followed immediately by the pass
guard firing for the other side (`ply-passed`, which runs §8.7 in full and so
collects too). The overlay therefore renders a list, not a single float.

Each float is keyed by `` `${side}-${state.plyNumber}` ``, which is unique per
collection — a CSS animation only restarts when React gives it a new element,
and a key of just the side would be reused between two consecutive
collections by the same side and silently fail to re-run.

### 15. The pulse is drawn in the overlay, not on the square

`BoardSquare.tsx` and `BoardSquare.css` are **not touched by this story**. The
pulse on a paying hub is a ring drawn in the same overlay layer at that
square's own position, which keeps the board's squares exactly as stories 1, 3
and 9 left them, avoids threading a transient "just paid" flag through 225 cell
descriptors, and solves the same animation-restart problem the same way
(decision 14).

**The overlay must be a sibling of the grid, never a child of it.** A
`role="grid"` element may only own rows — this is already why the board's
visible row and column labels sit outside it and are `aria-hidden`. The overlay
follows that established pattern: inside `.board-frame`, outside
`AccessibleGrid`, `aria-hidden="true"`, `pointer-events: none` so it never eats
a click meant for a square.

### 16. `src/hud/` holds the chrome; `announcements.ts` stays where it is

The HUD is chrome around the board, not part of it, so `src/hud/` gets the
score, the pips, the round counter, the result panel and — moved unchanged —
the turn indicator. Leaving `TurnIndicator` in `src/board/` would split the
strip across two folders for no reason.

`announcements.ts` stays in `src/board/`. Every other consumer of it is there,
its 900-line test file is there, and moving it would add churn this story does
not need. The HUD imports it across the folder boundary, which is the same
direction `Board` already imports from `src/game/`.

### 17. Wording lives in `announcements.ts`, including the HUD's

Components render wording; they never compose it. That covers the energy
clause, the result sentence, the game-over rejection, the turn indicator's
game-over text, and each score cell's hidden sentence. It also covers the round
counter's two forms — the visible `35/100` and the spoken "Round 35 of 100" —
because a slash between two numbers is still a decision about what the player
reads, and putting it in `announcements.ts` costs one tested function and ends
the argument.

The one formatting decision left in the HUD is the **zero-padding width** of
the score digits, which is layout, not wording: a hundred-round game pays at
most 15 x 100 = 1500, so four digits is the width that never reflows, and the
constant lives beside the component that lays it out.

### 18. The result panel: a labelled dialog that takes focus, not a focus trap

The panel is `role="dialog"`, named by its own "Game over" heading via
`aria-labelledby`, given `tabIndex={-1}` and focused when it appears — the game
has ended and the one useful control is inside it. It is **not**
`aria-modal="true"` and it does not trap focus: this story implements no focus
trap, and claiming modality the code does not enforce would be a lie to
assistive technology. The board behind it refuses every activation anyway
(decision 8), and the result already reaches a screen reader as words through
the live region.

The heading text is written "Game over" and uppercased in CSS
(`text-transform`), the way `.app__title` already handles "Base Control", so a
screen reader says the words rather than spelling out letters.

**Play again keeps the reducer pure.** The button's handler draws a fresh seed
with `freshSeed()` and dispatches a `new-game` intent carrying it **and the
finished game's length**; the reducer receives both rather than reaching for
either. `freshSeed` lives in
`src/game/` and outside `src/rules/`, and this story does not disturb that.

The intent carries **no length** today. Every game is §9's hundred rounds, so
an optional length field would be untested dead code that a peer review would
rightly flag. When choosing a length ships, the intent gains the field and play
again passes the finished game's own length — that is the one line this
decision defers, and it is recorded here so the future story knows to add it.

### 19. No web font

Arcade type comes from a monospace system stack with letter-spacing, weight and
glow, defined as a custom property in `index.css` beside the existing
deep-space palette. The app must deploy from any static file host and make no
network requests, and adding a font file is a dependency decision that belongs
in its own commit if it is ever wanted.

The HUD (Step 12) introduces the custom properties it needs; the chrome step
(Step 17) applies the same tokens to the title and the frame. The two side
colours stay the single source of side identity — the HUD's green and red come
from `--color-green` and `--color-red`, never from new literals.

Contrast is a **manual** gate: axe's `color-contrast` rule is disabled in jsdom
(no layout, no canvas — CONTRIBUTING.md), so glow-on-dark text passing contrast
is something a person checks by eye and by tool in the browser.

### 20. A temporary short game for the manual gates

Reaching ply 200 by hand is not possible, and reaching a scoring position from
the opening takes many minutes of clicking, repeated after every reload. Step
11 therefore adds `src/game/reviewFixture.ts`: a hand-built state at **three
rounds**, part-played, with ships already standing on charged hubs and both
totals non-zero. `App.tsx` builds its opening session from it until Step 19
deletes it and restores `startingGameState(freshSeed())`. Story 00000009 and
story 00000011 used the same device for the same reason.

It doubles as a manual check of decision 5: a three-round game's counter must
read `2/3`, not `2/100`, with no component touched.

**No automated test may depend on it.** Every test builds its own position, so
Step 19 can delete the fixture without taking any coverage with it.

### 21. What is deliberately not done

- **No `n * (n + 1) / 2`** (decision 2).
- **No round counter or game-over flag in the state** (decision 7).
- **No game-over check in the six-only or seven-only layers** (decision 8).
- **No effect for the end of the game** (decision 10).
- **No change to `BoardSquare.tsx` / `.css`, the grid, the ships or the site
  markers** (decision 15, and the story's "Out of scope").
- **No start screen, settings, seed entry or length picker** — the plumbing
  only.
- **No sound, no score history, no record format, no engine.**

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
- **Artwork stays decorative**: every added SVG or overlay element is
  `aria-hidden`. All meaning reaches assistive technology through accessible
  names, the live region, and the HUD's hidden sentences.
- **jsdom has no layout.** Nothing about legibility, greyscale, overlap,
  contrast or animation timing can be asserted in a DOM test — those are the
  manual gates (Steps 13 and 18).
- **Existing tests may need new positions, not weaker assertions.** Where this
  story changes behaviour, rewrite the position under test so it still tests
  what it meant to; never delete an assertion to make it pass.
- **Every step starts at `Status: pending`** and is updated by the
  implementation pipeline, with a `Notes:` line recording what was done and any
  deviation and why.

---

## Step 1 — Rules: influence becomes energy, and §8.4 pays a steeper curve (version 0.7)

Status: committed

Notes: Renamed influence to energy throughout `rules.md` (§1, §8.1, §8.3,
§8.4's heading/table, §8.7 step 2, §9), replaced §8.4's table with 0, 1, 3, 6,
10, 15, and bumped the version to 0.7. Added the 0.7 changelog entry, bumped
`RULES_VERSION`, and renamed the word in `README.md` and `CLAUDE.md`. Left
`src/rules/endOfTurn.ts`'s step-2 comment and `src/rules/endOfTurn.test.ts`'s
test name untouched, per the plan (Step 6's job) — both still say
"influence", which is expected and matches the plan's own description of
that test in Step 6. `grep -ril influence` over the repo (excluding
node_modules/.git) turns up only `doc/plan/*` (historical),
`doc/ruleset/changelog.md` (pre-0.7 entries plus the 0.7 entry's own mention
of the rename), and the two `src/rules/endOfTurn.*` files awaiting Step 6 —
exactly the expected set.

Edit `doc/ruleset/rules.md` to version **0.7**:

- **Rename influence to energy**, every occurrence: §1's overview (twice),
  §8.1's description of a charged site ("in play and producing influence"),
  §8.3's rationale for the nine-turn clock ("collects influence from it five
  times"), §8.4's heading and its table's column header, §8.7's step 2, and §9
  (twice). The word "influence" must not remain anywhere in the document.
- **Replace §8.4's table** with:

  | Charged nodes held | Energy |
  | ------------------ | ------ |
  | 0                  | 0      |
  | 1                  | 1      |
  | 2                  | 3      |
  | 3                  | 6      |
  | 4                  | 10     |
  | 5                  | 15     |

  §8.4's surrounding prose is unchanged: a node counts only if one of that
  player's ships is on it at that moment, and flying across collects nothing.
  Do not add a formula, a derivation, or a note about triangular numbers — the
  document states a table.

- **§9 is unchanged beyond the rename.** The game still ends after 100 rounds,
  the most energy still wins, equal energy is still a draw. Neither the length
  of the game nor a tie-break is open in this story.

Add a **0.7 entry** to `doc/ruleset/changelog.md`, newest first, in the voice
the existing entries use. It says two things: the rename (a wording change that
does not alter how the game is played), and the new payout curve (which does).
The old table paid 0, 1, 3, 5, 7, 9 — a flat two per extra node after the
first; the new one pays a marginal 1, 2, 3, 4, 5, so the fifth node a player
holds is worth five times the first, holding all five pays fifteen against nine
before, and a player pushed from three nodes to two loses three energy a turn
rather than two. The intended consequence, worth stating: concentration beats
spread, and driving an enemy off a node and taking it with the turn's second
action now moves the score by more than the shields it burned. Close the entry
the way 0.5 and 0.6 do — this version **would** be a tagging candidate because
it changes how the game is played, but tagging is on hold until the game plays,
so no tag is made.

Set `RULES_VERSION` in `src/rules/rulesVersion.ts` to `"0.7"` in the same
commit; `src/rules/rulesVersion.test.ts` checks it against the document and
checks that a changelog entry exists.

Rename the word in `README.md` (two occurrences, in the opening paragraph) and
`CLAUDE.md` (two occurrences: the project summary, and the Vocabulary entry for
"Hub"). Nothing else in either file changes here — the README's status
paragraph is Step 20's job, once the whole story's fallout is known.

Do **not** touch `src/rules/endOfTurn.ts`'s step-2 comment yet; Step 6 replaces
it with the implementation.

Depends on: nothing.

Verification (automated): `npm test` — `src/rules/rulesVersion.test.ts` passes
(the constant matches the document and the changelog has a 0.7 entry) and the
whole suite is green. Then confirm by `grep -ri influence` over the repository
that the only remaining hits are `doc/plan/` (historical), the pre-0.7
changelog entries, the 0.7 entry's own description of the rename, and
`src/rules/endOfTurn.ts`'s documented empty-slot comment (Step 6 removes that
one).

---

## Step 2 — `src/rules/energy.ts`: §8.4's table, and what a side is standing on

Status: committed

Notes: Added `src/rules/energy.ts` with `energyForNodesHeld` (the six-value
table, throwing `RangeError` outside 0–5) and `chargedNodesHeldBy` (returns
the held squares in `SITES` order, using `shipsBySquare` and `siteStateAt`).
Added `src/rules/energy.test.ts` covering the table's six payouts, the three
out-of-range throws, and each of the "standing on" cases from the step's
verification list. No deviation from the plan: the module imports nothing
beyond `board`, `gameState`, `sites` and `fleet`, and does not touch effects
or totals. `npm run typecheck`, `npm run lint`, `npm test` (482 passed),
`npm run format:check` and `npm run build` all pass.

Add `src/rules/energy.ts`, owning exactly two things:

- **§8.4's table, as data**, and a lookup from a count of charged hubs held to
  the energy it pays. The table is the six values 0, 1, 3, 6, 10, 15 written
  out; the lookup throws a `RangeError` for anything that is not a whole number
  in 0–5 (decision 2). Five sites are active or charged at any moment (§8.1),
  so a sixth is a caller bug, and the rules layer throws on impossible input
  rather than absorbing it.
- **The charged hubs a side is standing on**, for a given state and side,
  returned as squares in `SITES` order (decision 3). "Standing on" means a ship
  of that side occupies the square **and** the square's site state is
  `charged`. An active, depleted or dormant site pays nothing; so does a hub a
  ship merely flew over, which is already true because this reads the state at
  the moment it is asked.

Use the existing `shipsBySquare` and `siteStateAt` helpers from `gameState.ts`
rather than walking `state.ships` by hand. Nothing else belongs in this module:
it does not know about the end-of-turn sequence, effects, or totals.

Depends on: Step 1 (the table this transcribes is the 0.7 one).

Verification (automated): `npm test` with a new `src/rules/energy.test.ts`
covering:

- the table pays 0, 1, 3, 6, 10, 15 for 0, 1, 2, 3, 4, 5 hubs held;
- the lookup throws for -1, 6 and a fractional count;
- a ship on a charged hub counts;
- a ship on an active, depleted or dormant site does not;
- an enemy ship on a charged hub does not count for this side;
- two ships of the same side on two charged hubs count as two, in `SITES`
  order;
- a side with no ships on any hub gets an empty list.

---

## Step 3 — `src/rules/gameLength.ts`: §9's length and the round arithmetic

Status: committed

Notes: Added `src/rules/gameLength.ts` with `DEFAULT_GAME_LENGTH_ROUNDS`
(100), `isGameLengthRounds` (positive whole number predicate, mirroring
`isShieldCount`'s shape), `pliesForGameLength` (length × 2), and
`roundForPly` (`ceil(plyNumber / 2)`, throwing `RangeError` on a non-positive
or fractional ply, deliberately unclamped to any length — Step 5 adds the
clamped form). The module imports nothing from `gameState.ts`, per the step.
Added `src/rules/gameLength.test.ts` covering the default, both example game
lengths, the seven ply→round cases from the step's verification list
including the deliberately-unclamped 201→101, the three round throws, and
the length predicate's accept/reject cases. No deviation from the plan.
`npm run typecheck`, `npm run lint`, `npm test` (500 passed), `npm run
format:check` and `npm run build` all pass.

Add `src/rules/gameLength.ts`, named for §9's subject rather than for the
moment of ending, because the arithmetic it owns is consulted on every turn and
not only at the last one. This step adds the part that needs no game state:

- **§9's default length in rounds — 100 — as the one named place that number
  lives** in the codebase (decision 5). Nothing but `startingGameState` (Step 4) may read it; every other caller takes the length from the state it was
  handed.
- **The plies a game of a given length runs to**: twice the length in rounds. A
  round is one ply for each player (CLAUDE.md, Vocabulary), so a hundred-round
  game is 200 plies.
- **The round a ply belongs to**: `ceil(plyNumber / 2)`, so plies 1 and 2 are
  round 1, plies 199 and 200 are round 100. This is the one piece of arithmetic
  that does not need the length at all. It throws a `RangeError` on a ply
  number that is not a positive whole number.
- **A predicate for a valid game length**: a positive whole number. This exists
  here, next to the default, so the rule about what a length may be is stated
  once; Step 4's `startingGameState` calls it and throws. `isShieldCount` in
  `shields.ts` is the precedent for the shape.

The module header says what it is for and cites §9. It imports nothing from
`gameState.ts` in this step.

Depends on: Step 1 (§9 as worded at 0.7).

Verification (automated): `npm test` with a new `src/rules/gameLength.test.ts`
covering: the default is 100; a hundred-round game runs to 200 plies and a
three-round game to 6; plies 1 and 2 are round 1, 3 and 4 are round 2, 199 and
200 are round 100, 201 is round 101 (the raw arithmetic is deliberately
unclamped — Step 5 adds the clamped, state-aware form); the round throws on 0,
-1 and 1.5; and the length predicate accepts 1 and 100 and rejects 0, -3 and
2.5.

---

## Step 4 — `GameState` carries each side's energy and the game's length

Status: committed

Notes: Added `EnergyTotals` (`Readonly<Record<Side, number>>`, exported) and
the `energy` / `lengthInRounds` fields to `GameState`, with doc comments
noting both are fixed at start / derived elsewhere as appropriate.
`startingGameState` gained a defaulted `lengthInRounds` parameter (default
`DEFAULT_GAME_LENGTH_ROUNDS` from `gameLength.ts`, a value import in that
one direction only, matching decision 6), validated with `isGameLengthRounds`
and throwing a `RangeError` naming the offending value otherwise. Updated
every hand-built `GameState` literal across the dozen test files the plan
named (plus their `buildState` helpers' imports) to carry
`energy: { green: 0, red: 0 }` and `lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS`;
`sitePool.test.ts` needed no change since it only builds state via
`startingGameState`. Added the four new cases to `gameState.test.ts` per the
step's verification list. No deviation from the plan.
`npm run typecheck`, `npm run lint`, `npm test` (506 passed), `npm run
format:check` and `npm run build` all pass.

Add two fields to `GameState` in `src/rules/gameState.ts`:

- **A per-side energy total**, both starting at 0. Give the pair a named type
  (a readonly record keyed by `Side`) and export it, because the result type in
  Step 5, the collection effect in Step 6 and the HUD in Step 12 all want to
  name it. It belongs in the state rather than the session: it is a rule fact
  under §8.4, a future engine will read it, and a recorded game must replay it
  exactly (decision 4).
- **The game's length in rounds**, set once at the start and never changed
  afterwards (decision 5).

`startingGameState` gains a second parameter, the length in rounds,
**defaulting** to `DEFAULT_GAME_LENGTH_ROUNDS` from `gameLength.ts` — a value
import in that direction only; `gameLength.ts` must not import a value back
(decision 6). It throws a `RangeError`, naming the offending value, when the
length is not a positive whole number, using the predicate Step 3 added.

Update the doc comment on `GameState` and on `startingGameState` to describe
both fields, including that the length is fixed for the game's lifetime and
that no round counter or game-over flag is stored because both are derived.

**Expect test churn.** A dozen test files hand-build a full `GameState`
literal, usually in a single local `buildState` helper at the top of the file
(`endOfTurn.test.ts`, `session.test.ts`, `actions.test.ts`, `combat.test.ts`,
`movement.test.ts`, `nodes.test.ts`, `sitePool.test.ts`, `stranded.test.ts`,
`ply.test.ts`, `announcements.test.ts`, `Board.test.tsx`, `gameState.test.ts`
— check for others). Each needs the two new fields added to its literal:
energy at 0 for both sides, and the default length, unless the test has a
reason to differ. Add the fields; do not weaken any assertion.

Depends on: Step 3 (the default and the validity predicate).

Verification (automated): `npm test` with new cases in
`src/rules/gameState.test.ts`:

- a starting state has 0 energy for both sides;
- given no length, a starting state's length is 100;
- given 3, its length is 3 and nothing else about the state differs from the
  default-length one except that field;
- `startingGameState(seed, 0)`, `(seed, -1)` and `(seed, 2.5)` each throw a
  `RangeError`.

The whole suite must be green with every existing assertion intact.

---

## Step 5 — `gameLength.ts`: whether the game is over, and who won

Status: committed

Notes: Added `isGameOver` (`plyNumber > pliesForGameLength(state.lengthInRounds)`),
`currentRound` (`min(roundForPly(plyNumber), lengthInRounds)`), the `GameResult`
type (`outcome` discriminator plus optional `winner`, mirroring
`FightResolvedEffect`'s shape, plus both sides' final `energy`), and `gameResult`
(throws `RangeError` if the game is not yet over) to `src/rules/gameLength.ts`.
`GameState`, `EnergyTotals` and `Side` are imported with `import type` only, per
decision 6. Added the step's cases to `gameLength.test.ts`: not-over/over at
plies 200/201 of a default-length game and 6/7 of a three-round game; the
clamped round at plies 199/200/201 (default length) and 6/7 (three-round);
green-won/red-won/draw results each carrying both totals; and the throw on an
unfinished game. No deviation from the plan. `npm run typecheck`, `npm run
lint`, `npm test` (519 passed), `npm run format:check` and `npm run build` all
pass.

Extend `src/rules/gameLength.ts` with the state-aware half, now that the state
carries what it needs. `GameState` and `Side` are imported **as types only**
(decision 6).

- **Whether a state's game is over**, judged against **that state's** length:
  the game is over when `plyNumber` exceeds the plies its length runs to. This
  falls out of how the ply counter already works — the second action of the
  last ply runs §8.7 in full for it (red's hundredth turn, energy collected)
  and then advances `plyNumber` past the end. From that moment nothing further
  is legal.
- **The round to display**, clamped to the game's length (decision 7), so a
  hundred-round game reads 100 while its last ply is played and holds at 100
  afterwards rather than reading 101.
- **The result of a finished game**: which side won, or a draw, carrying both
  final totals. Follow the shape `FightResolvedEffect` already established in
  `ply.ts` — an `outcome` discriminator plus an optional winning side — so the
  panel can colour the winner without re-deriving it from the outcome string.
  Asking for the result of a game still in progress is a caller bug and throws
  a `RangeError`.

Nothing here reaches for the default length. A function handed a state uses the
state's length; a function handed a length uses that. That rule is what keeps
the future start screen to one story.

Depends on: Step 4 (the state's `energy` and `lengthInRounds`).

Verification (automated): `npm test` with new cases in
`src/rules/gameLength.test.ts`:

- a default-length state is not over at ply 200 and is over at ply 201;
- a **three-round** state is not over at ply 6 and is over at ply 7 — the check
  that nothing is hardcoded to 100 or 200;
- the displayed round is 100 at ply 199, 100 at ply 200 and still 100 at ply
  201; for a three-round game it is 3 at ply 6 and 3 at ply 7;
- the result names green when green's total is higher, red when red's is, and a
  draw when they are equal, carrying both totals in every case;
- asking for the result of a state that is not over throws.

---

## Step 6 — §8.7 step 2: the moving player collects

Status: pending

Fill `runEndOfTurn`'s documented empty slot in `src/rules/endOfTurn.ts`.

For the side that just played (`state.sideToMove`, which `runEndOfTurn` already
reads as the player whose ply is ending): count the charged hubs that side is
standing on with Step 2's function, look the payout up in §8.4's table, and add
it to that side's total in the working state.

Add an **energy-collected effect** to the `EndOfTurnEffect` union carrying: the
side, how many hubs were held, the amount paid, the side's new total, and the
squares that paid. The squares are there because the board draws a visual on
them (Step 15) and because the announcement names them (Step 10).

**No effect is emitted when the payout is zero** (decision 9) — a player
holding no hub has not had something happen to them, and an effect for it would
put a "collected 0 energy" clause into the live region on most turns of the
opening. The totals are still correct: adding zero changes nothing.

**Ordering is not negotiable**, and the slot is already in the right place:
step 1 (shields) runs first, because a ship that gains its fourth shield still
collects; steps 3–5 (the clocks) run after, because a node that runs out at the
end of this turn pays for this turn first. Replace the `Step 2: influence
(§8.4) — awaits its own story. No total is kept.` comment with one describing
what the step now does, and update the function's doc comment, which currently
says step 2 is a deliberately empty slot.

`src/rules/endOfTurn.test.ts` has a test named "keeps influence out of scope:
no effect and no other state change when nothing is due" — it must be rewritten
to assert the new behaviour, not deleted.

Announcements are **not** touched in this step; the live region simply does not
mention the collection yet. Step 10 words it.

Depends on: Steps 2 (the table and the count) and 4 (the totals on the state).

Verification (automated): `npm test` with new cases in
`src/rules/endOfTurn.test.ts`:

- the side that just played is paid and the other side's total is untouched;
- three hubs held pays 6 and the effect carries the count, the amount, the new
  total and the three squares;
- a hub whose clock runs out at the end of this very turn still pays for it —
  the collection happens before steps 3–5 tick;
- a ship that gains its fourth shield in step 1 still collects, so the payout
  is unaffected by the shield step running first;
- nothing held emits no effect and leaves both totals unchanged;
- a hub held by the opponent pays this side nothing;
- through `applyPassGuard`, a **passed** ply still collects: §8.7 runs in full
  for a passed turn, so a player who passes while standing on hubs is paid.

---

## Step 7 — Refusing to play past the end, and the pass-guard trap

Status: pending

**This is the story's one genuine correctness trap. Read decision 8 above
before writing any code.**

Once the game is over, no action is legal — which is exactly the condition the
§5 pass guard fires on. Left alone, `applyPassGuard` would run an end-of-turn
sequence for ply 201, tick every clock, collect energy for a turn that does not
exist, and advance to ply 202, once per call, unboundedly.

What changes:

- Add a **`"game-over"` reason** to `MoveRefusalReason` (declared in
  `src/rules/moveLegality.ts`) and to `AttackRefusalReason` (declared in
  `src/rules/combat.ts`).
- `moveRefusalReason` (in `movement.ts`) and `attackRefusalReason` (in
  `combat.ts`) check it **first**, ahead of ownership — so a move that would
  have been illegal anyway still refuses with `"game-over"` once the game has
  ended.
- `legalDestinations` and `legalTargets` — the public layers — return empty
  once the game is over, so they keep agreeing with their own refusal
  functions.
- `applyPassGuard` (in `ply.ts`) returns the state **untouched, with no
  effect**, when the game is over, checked **before**
  `sideToMoveHasLegalAction`.

What must **not** change: `sixOnlyMoveRefusalReason`,
`sixOnlyLegalDestinations`, `sevenOnlyAttackRefusalReason` and
`sevenOnlyLegalTargets` stay exactly as they are, and `sideToMoveHasLegalAction`
keeps being built on them. Those two layers exist precisely so the pass guard
can ask "is any action legal here" without §8.5 answering the question; putting
game-over into them would make the pass guard see a player with no legal action
and pass on their behalf — the loop above. Say so in a short comment where the
guard's early return lives, in terms of what the code does, not of this plan.

One knock-on: `rejectionSentence` in `src/board/announcements.ts` switches
exhaustively over every refusal reason with no `default`, so adding
`"game-over"` to the unions will fail the typecheck until it is worded. Word it
here, minimally and finally: **"The game is over. Nothing further can be
played."** Step 10 does not revisit it.

Note that `shipHasLegalAction` (public layers) now answers false for the side
to move once the game is over, so the board draws those ships with the
`no-action` condition. That is intended (decision 8) — do not add a special
case to prevent it.

Depends on: Step 5 (the game-over predicate).

Verification (automated): `npm test`, with the trap tested directly:

- in `src/rules/ply.test.ts`: from a state at ply 201 of a hundred-round game,
  `applyPassGuard` returns **the same state** and **no effect** — it does not
  pass, does not run an end-of-turn sequence, does not tick a clock, does not
  collect energy and does not advance the ply;
- the same from a state at ply 7 of a **three-round** game, so the guard is
  judging against the state's own length;
- a state one action from the end, driven through that action, ends at ply 201
  with the guard having fired nothing and both totals final;
- in `src/rules/movement.test.ts` and `src/rules/combat.test.ts`: every move
  and every attack refuses once the game is over, with `"game-over"` and ahead
  of any other reason — including for a move that would have been illegal
  anyway (out of range, wrong side's ship) and an attack that would have been
  illegal anyway;
- `legalDestinations` and `legalTargets` are empty once the game is over, while
  `sixOnlyLegalDestinations` and `sevenOnlyLegalTargets` for the same state and
  ship are **unchanged** — the assertion that pins the layering.

---

## Step 8 — A full game, end to end

Status: pending

Add `src/rules/fullGame.test.ts`: an integration test that plays a whole game
through the public rules API and proves the three pieces — the collection, the
round arithmetic and the ending — work as one. This is a test-only step; no
`src/` module changes.

The test drives `applyMove` / `applyAttack` with the deterministic greedy
policy described in decision 11, written inside the test file and nowhere else.
Restated for a cold reader, evaluated fresh for each action:

1. among the side to move's ships in fleet order, and each ship's
   `legalDestinations` in the order returned, take the first destination that
   is a charged hub;
2. otherwise take the destination that most reduces the Chebyshev distance to
   the nearest charged or active site, ties broken by that same enumeration
   order;
3. otherwise, if there is no legal move at all, take the first legal attack in
   ship-then-target order;
4. otherwise apply nothing and let the pass guard act.

It uses no randomness of its own — `Math.random` is banned by lint, and any
random draw of its own would perturb §8.6's seeded replacement draws.

The test asserts, from a fixed seed at the default length:

- the game ends **exactly** at ply 201 — the loop runs until the game is over
  and the ply count is checked, with a hard iteration ceiling so a regression
  hangs the assertion rather than the test runner;
- each side's final total equals the sum of that side's energy-collected
  effects observed along the way;
- the result names the higher total as the winner (or a draw if they are
  equal), matching the state's own totals;
- no further action is accepted afterwards: a move and an attack that were
  legal a moment earlier both refuse with `"game-over"`, and the pass guard
  leaves the state untouched;
- the totals are non-trivial — both sides collected something — so a policy
  that silently stopped scoring would fail rather than pass quietly.

Then the same policy at a **three-round** length, asserting it ends at ply 7 by
the same route and with the same consistency between effects, totals and
result. The game's length must be the only thing that differs.

Depends on: Steps 6 and 7 (there is nothing to play to the end before both).

Verification (automated): `npm test` — the new file passes and the whole suite
is green. Note the file's runtime in the step's Notes; if it exceeds a couple
of seconds, say so rather than silently trimming the assertions.

---

## Step 9 — The session at the end of a game: refuse, and play again

Status: pending

Two changes to `src/game/session.ts`, both about what happens once the game is
over:

- **An activation is refused outright.** At the top of the activate path —
  before anything looks for a ship, and therefore before the "nothing to
  select" case — the reducer returns a rejected event with the `"game-over"`
  reason Step 7 added, so the board can say why rather than silently ignoring a
  click. `RejectionReason` already includes the new reason through the two
  refusal unions, so no new type is needed. A `dismiss` intent keeps working:
  clearing a selection is not playing.
- **A `new-game` intent**, carrying a **seed and a length in rounds**
  (decision 18). The reducer builds a starting state from both and returns a
  fresh session through `createSession`, so the §5 pass guard runs once on the
  new position exactly as it does today. The reducer stays pure: it never
  calls `freshSeed()` and never reaches for the default length — it uses what
  it is handed.

  **Owner decision (taken at the plan gate):** the intent carries the length,
  rather than always starting §9's hundred. The caller passes the finished
  game's length forward, so playing again after a game replays a game of the
  same shape. The cost now is one field; the payoff is that the future
  length-picker story changes the start screen and nothing in the session at
  all. It also means Step 11's temporary short game survives a play-again,
  which is what makes the Step 18 manual gate usable — a tester who ends a
  short game and presses play again gets another short game, not a
  hundred-round one they cannot finish.

Depends on: Steps 5 and 7 (the predicate and the reason).

Verification (automated): `npm test` with new cases in
`src/game/session.test.ts`:

- activating a friendly ship, an enemy ship, an empty square and a legal
  destination all produce a rejected event with `"game-over"` once the game is
  over, and the state is unchanged in every case;
- `dismiss` still clears a selection at game over;
- a `new-game` intent returns a session at ply 1, both totals 0, no selection,
  and the given seed and length on the state;
- a `new-game` intent carrying a non-default length produces a state of
  **that** length — the reducer uses what it is handed rather than the
  default;
- two `new-game` intents with different seeds produce states with different
  seeds — again, what it is handed rather than drawing its own.

---

## Step 10 — The words: energy collected, the game's result, and the HUD's labels

Status: pending

All new player-facing wording, in `src/board/announcements.ts`, composed and
unit-tested away from the DOM as every other sentence in the app already is.
Components render these strings; they never build their own. Player vocabulary
throughout: **turn** and **node**, never "ply" or "hub".

Add:

- **An energy clause** inside the end-of-turn clause list, in the order the
  sequence produced it (after the shield clause, before the node-ran-out
  clauses). One node held reads "Green collected 1 energy from the node at H8,
  and now has 7."; several read "Green collected 6 energy from 3 nodes at D8,
  H8 and K11, and now has 24." Reuse the existing `joinWithAnd` helper for the
  square list — a plain list, never an Oxford comma. There is no clause for a
  zero collection, because no effect is emitted for one.
- **A result sentence** for a finished game, from Step 5's result: "Green wins,
  42 energy to 37." and "The game is a draw, 37 energy each." Both totals are
  named in both forms.
- **`announcementForSession(session)`** (decision 10): the sentence the live
  region speaks, given the whole session rather than the event alone. When the
  game is not over it is exactly what `announcementFor(session.lastEvent)`
  returns today. When it is over, the clause naming whose turn is next is
  **replaced** by "The game is over after 100 rounds." followed by the result
  sentence — never appended after it, which would have a screen reader hear
  "Green's turn — 2 actions left" and "the game is over" in the same breath.
  `announcementFor(event)` keeps its current signature and all 35 of its
  existing tests.
- **The turn indicator** reads "Game over" once the game is over, instead of
  naming a side's turn.
- **The HUD's words** (decision 17), so Step 12 renders and never composes:
  - a score sentence per side for the visually hidden text: "Green: 24 energy,
    3 nodes held." — singular "1 node held", and "no nodes held" at zero;
  - the round counter's visible form, "35/100", and its spoken form, "Round 35
    of 100.", both built from the state's clamped round and its own length so
    neither ever names a hundred;
  - the result panel's heading text, "Game over", written in sentence case and
    uppercased by CSS.

`rejectionSentence`'s `"game-over"` case was written in Step 7 and is not
revisited.

Then point `src/board/Board.tsx` at `announcementForSession(session)` in place
of `announcementFor(session.lastEvent)` — a one-line change, since `Board`
already has the session.

Depends on: Steps 5, 6, 7 and 9 (the result, the effect, the reason, the
session).

Verification (automated): `npm test` with new cases in
`src/board/announcements.test.ts` covering every string above: the one-node and
several-node clauses; that a zero collection produces no clause; both result
sentences; that a passed turn's sentence carries its collection clause; that
`announcementForSession` substitutes the result for the next-turn clause at
game over and leaves the sentence untouched before then; the turn indicator's
game-over text; and each HUD string in its singular, plural and zero forms.
`src/board/Board.test.tsx` must still pass unchanged apart from anything that
asserted the live region's exact text mid-game (which should not change).

---

## Step 11 — A temporary short game for the manual gates

Status: pending

Add `src/game/reviewFixture.ts`, a **temporary** module holding a hand-built
position, and have `src/App.tsx` build its initial session from it instead of
from `startingGameState(freshSeed())` — a change of one import and one call.
**Step 19 deletes it.**

Why (decision 20): scoring, the round counter running out and the game ending
cannot be reached by hand from the opening position. Every ship starts in a bay
with no shields, nodes take turns to reach, and a hundred-round game cannot be
played by a person checking a look. Stories 00000009 and 00000011 used the same
device.

The module header must say plainly that this is **not a position reachable by
play** and that it exists only so the app can be checked by eye. It must not
mention this plan, its steps, or the story.

### The position

Build it from `startingGameState(<fixed literal seed>, 3)` and override, rather
than hand-writing all seventeen site entries — fewer places to get it wrong:

- **Three rounds** (so the whole game is 6 plies), at **ply 3**, **green to
  move**, two actions remaining, nothing moved. Green takes odd plies, so ply 3
  is green's second turn and the counter must read **2/3**.
- **Sites**: H8, E5 and K5 **charged**, each entered on ply 1 (so no clock
  fires during the remaining plies — a charged node lasts nine); E11 and K11
  **active**; the other twelve dormant. That is five active or charged, as §8.1
  requires.
- **Ships**: green-1 on **H8** with 2 shields, green-2 on **E5** with 1
  shield, red-1 on **K5** with 1 shield; the remaining eleven ships stay in
  their starting bays with no shields.
- **Energy so far**: green 4, red 1 — non-zero, unequal, and small enough to
  read at a glance.
- **The return position index** drifted forward from the starting index by the
  two plies already played, computed with `driftReturnPositionIndex` rather
  than written as a literal.

The return-position index must be drifted, and `plyNumber`, `sideToMove` and
`actionsRemaining` must agree, or the board's own cues will look wrong for
reasons that have nothing to do with this story.

### What the position is for

- Green ends this turn holding **two** charged nodes and collects **3**, taking
  green to 7 — a visible roll, a `+3` floating from the centroid **between H8
  and E5**, and two pips lit for green against one for red.
- Red then collects **1** from K5.
- The counter reads **2/3** and moves to **3/3**; after ply 6 the game is over,
  the panel appears, and the counter holds at 3/3 rather than reading 4/3.
- The whole game is four plies away, so the ending can be reached in under a
  minute and re-reached after every reload.

### Constraints, all load-bearing

- It lives in `src/game/`, **never** `src/rules/`.
- **No automated test anywhere may depend on it.** Every test builds its own
  position; `src/App.test.tsx` in particular must keep asserting only the
  shell. Note that `App.test.tsx` asserts "Green's turn — 2 actions left",
  which this position still satisfies — that is a coincidence worth preserving,
  not a dependency to add to.
- Keep it a plain data module: no route, no query parameter, no
  `import.meta.env` branch.

Depends on: Steps 4 and 6 (the state's new fields, and something to collect).

Verification (automated): `npm run typecheck`, `npm run lint`, `npm test`,
`npm run format:check` and `npm run build` all pass **with no test changed to
accommodate the fixture**. Confirm by inspection that nothing outside
`src/game/reviewFixture.ts` and the one call site in `src/App.tsx` mentions it.
Verify the position's own arithmetic with a throwaway test file, deleted before
finishing: exactly five sites are active or charged, the three named ships
stand on charged sites, no ship is stranded, green has legal moves, and the
state is not yet over. Record in the Notes anything that had to move.

---

## Step 12 — The arcade HUD: `src/hud/`, the scores, the pips and the round counter

Status: pending

Create `src/hud/` and move `TurnIndicator.tsx`, `TurnIndicator.css` and
`TurnIndicator.test.tsx` into it from `src/board/`, **unchanged in behaviour**
(its import of `announcements` becomes a `../board/` import). It is chrome
around the board, not part of it, and leaving it behind would split the strip
across two folders (decision 16).

Add the HUD strip, taking the game state and rendering, in one row:

- **Each side's score**, in that side's colour, as arcade digits: zero-padded
  to a fixed four-character width (a hundred-round game pays at most 1500) so
  the layout never reflows as the number grows, with the side's name above it.
  The digits are `aria-hidden` decoration; a visually hidden element carries
  Step 10's score sentence, which is what conveys the number and the pip count
  to assistive technology and what component tests assert.
- **How many nodes that side holds right now**, as a row of five pips, lit for
  held and unlit for not, from Step 2's function. Decorative and `aria-hidden`
  — the same hidden sentence already says it in words. Five is §8.1's count of
  nodes in play, so the row is a fixed five and does not need to know the site
  pool's size.
- **The round counter**, centred between the two scores, reading Step 10's
  `35/100` visibly with its spoken form as the accessible text. Both halves
  come from the state — the round from `plyNumber`, the total from the game's
  own length — so **no component ever names a hundred**, and a three-round game
  reads `2/3` with the HUD untouched.
- **The turn indicator**, restyled to sit in the strip.

`src/App.tsx` renders the strip between the title and the board, in place of
its current direct `TurnIndicator`.

Introduce in `src/index.css` the custom properties the arcade look needs — a
monospace system font stack and a glow colour — alongside the existing
deep-space palette (decision 19). **No web font, no downloaded face, no network
request.** The side colours come from `--color-green` and `--color-red`; do not
introduce new literals for them. Step 17 applies the same tokens to the title
and the frame.

**The score does not roll yet.** Step 14 adds that. This step renders the total
directly, so the strip can be judged as a layout before any animation is
involved.

Depends on: Steps 2, 5, 10 and 11 (the pip count, the clamped round, the words,
and a position worth looking at).

Verification (automated): `npm test` with a new jsdom test file for the HUD
(CONTRIBUTING.md's recipe) and updates to `src/App.test.tsx`:

- both totals appear as text through their hidden sentences, for a state with
  unequal totals;
- five pips render per side, with the lit count matching the hubs that side
  holds;
- the round counter reads `35/100` for a default-length state at ply 69, and
  `100/100` — not `101/100` — for one at ply 201;
- rendered from a **three-round** state at ply 3 it reads `2/3`, the check that
  no component has baked in a hundred;
- the turn indicator still reads "Green's turn — 2 actions left" and its moved
  test file passes unchanged;
- axe finds no violations on the app with the HUD present (`color-contrast`
  disabled, per CONTRIBUTING.md).

---

## Step 13 — Manual gate: the HUD reads right

Status: pending

The first look at this story's visual direction, before the float, the panel
and the chrome are built on top of it. The app opens on Step 11's three-round
fixture.

Run `npm run dev` and open `http://localhost:5273`.

Verification (manual): the owner confirms:

- the strip reads as one deliberate thing between the title and the board, not
  as three widgets pushed together;
- each score is legible at a glance, in its side's colour, and the zero-padding
  reads as arcade convention rather than as a bug;
- the pips say plainly how many nodes each side holds, and change when a ship
  moves on or off a node;
- the round counter reads **2/3** — the game's own length, not a hundred — and
  advances a round every two turns;
- the turn indicator still says whose turn it is and how many actions are left,
  and sits comfortably in the strip;
- playing to the end of the fixture's third round leaves the counter at **3/3**
  and the board refusing every click, with the live region saying the game is
  over and who won (the panel itself arrives in Step 16);
- nothing about the arcade type is illegible against the deep-space background
  — a first impression only; the contrast check proper is Step 18.

If the direction is wrong, this is the cheap place to say so: only Step 12's
markup and CSS would be reworked.

---

## Step 14 — The score counts up

Status: pending

Make each score **count up** to its new total rather than jumping — the arcade
convention, and the thing that makes a payout feel like a payout.

Two pieces, per decision 12:

- **A pure module** in `src/hud/` holding the animation's arithmetic: given a
  starting value, a target and the elapsed time, the integer to display, plus
  the duration constant. Unit-tested in the default `node` environment. It
  never overshoots, returns exactly the target once the duration has elapsed,
  and handles a target below the start as well as above (nothing in this story
  lowers a score, but a function that only works upwards is a trap for the
  story that adds an undo).
- **A hook** wrapping it with `requestAnimationFrame`, taking the authoritative
  total as its argument and returning the number to draw. It animates
  **towards its prop and always settles exactly on it**, never accumulating its
  own total; a target that changes mid-roll re-targets from wherever the
  display currently is; on first render it returns the prop unchanged, so a
  fresh render never rolls up from zero. It cancels its frame on unmount.
  Under `prefers-reduced-motion: reduce`, read with `window.matchMedia`, it
  returns the prop directly and schedules nothing.

Only the `aria-hidden` digits use the hook. The visually hidden sentence keeps
carrying the true total from the state, so the number a screen reader hears and
the number a test asserts are never mid-roll.

Depends on: Step 12 (the digits to animate).

Verification (automated): `npm test` — new unit tests for the pure function
(midpoint, exact settle at the duration, past the duration, a downward target,
a zero-length change) and a HUD component test asserting that a fresh render
shows the true total in the visible digits and that the hidden sentence carries
the true total immediately after a state change. The rAF loop itself is left to
Step 18's manual gate; say so in the Notes rather than adding a fake-timer test
that asserts jsdom's scheduler instead of the behaviour.

---

## Step 15 — The floating gain and the node pulse

Status: pending

When a side collects, a `+N` floats up off the board and fades in that side's
colour, and each node that paid pulses briefly.

**Geometry (decision 13).** Add to `src/board/boardView.ts` — which already
owns the mapping between rule-space squares and screen-space grid positions — a
pure function from a non-empty set of squares to the position of their
**centroid**, expressed as a percentage pair across the 15 x 15 grid (the
centre of a single square being at `(index + 0.5) / 15`). It throws on an empty
list. One payout is one number: §8.4 pays for the count of nodes held, so a
player holding three collects six, not 1 + 2 + 3 split across three squares.
With one node held the centroid is exactly on it; with several it sits between
them, which reads as the group paying together.

**The overlay.** Add an overlay component in `src/board/`, rendered by
`Board.tsx` inside `.board-frame` as a **sibling** of `AccessibleGrid`, placed
in the same grid area as `.board` (`grid-column: 2 / 17; grid-row: 1 / 16`) so
it is exactly the grid's box with no measurement of its own. It is
`aria-hidden="true"` and `pointer-events: none` so it never eats a click meant
for a square. A `role="grid"` element may only own rows — this is the same
reason the board's visible labels already sit outside it.

It draws, for each collection the session's last event reported:

- one `+N` at the centroid of that collection's squares, in the collecting
  side's colour;
- one pulse ring at each square that paid.

**Both are decorative.** A screen reader learns about the collection from the
live region's sentence and the HUD carries the total as text; nothing about the
score is available only as an animation.

**No timers and no state** (decision 14): the overlay is a pure function of the
session, and the animations end at `opacity: 0` and stay there until the next
event replaces them. Extract "which collections did this event report" into a
small pure helper beside the overlay rather than putting the effect-walking in
the component — an event can carry **two** collections when an action ends a
ply and the pass guard then fires for the other side. Key each float and each
pulse by side and ply number, so a second collection by the same side re-runs
its animation instead of silently reusing the element.

**`BoardSquare.tsx` and `BoardSquare.css` are not touched.**

Under `prefers-reduced-motion: reduce`, following the pattern already in
`BoardSquare.css`: the number appears and fades in place without travel, and
the pulse becomes a static change or nothing at all.

Depends on: Steps 6 and 10 (the effect and its squares; the live region already
saying it in words).

Verification (automated): `npm test`:

- unit tests for the centroid: a single square lands on that square's centre;
  two squares land midway between them; a diagonal pair lands at the centre of
  their rectangle; an empty list throws;
- component tests on the board: after an action that pays, the overlay renders
  one `+N` carrying the right number and one pulse per paying square; after an
  action that pays nothing, it renders neither; the overlay element is
  `aria-hidden` and is a sibling of the `role="grid"` element, not a
  descendant;
- axe finds no violations with the overlay present (`color-contrast` disabled).

Layout, motion and legibility are Step 18's manual gate — jsdom has no layout.

---

## Step 16 — The result panel and play again

Status: pending

Once the game is over, a result panel appears over the board: "GAME OVER" in
arcade type, both final scores, and the outcome — a side wins, or a draw — in
words from `announcements.ts`.

- The panel lives in `src/hud/` and is rendered by `src/App.tsx` over the board
  area, appearing only when the game is over (Step 5's predicate) and never
  before.
- It is `role="dialog"`, named by its own heading through `aria-labelledby`,
  focusable with `tabIndex={-1}` and **focused when it appears**. It is not
  `aria-modal` and does not trap focus, because this story implements no trap
  and claiming modality the code does not enforce would mislead assistive
  technology (decision 18). The board behind it already refuses every
  activation.
- It carries a **play again** button — the app's first new-game path. The
  handler draws a fresh seed with `freshSeed()` and dispatches Step 9's
  `new-game` intent carrying that seed **and the length of the game that just
  ended**, read from the finished state, so the reducer receives both rather
  than reaching for either. `freshSeed` stays in `src/game/`, outside
  `src/rules/`. Playing again therefore starts a game of the same length —
  which is what lets the Step 18 manual gate end a short game and immediately
  start another.
- The heading is written "Game over" and uppercased in CSS, so a screen reader
  says the words rather than spelling them.

Note that the fixture from Step 11 still supplies the app's opening position,
so the panel can be reached in four plies while this step is being built.

Depends on: Steps 5, 9, 10 and 12 (the predicate, the intent, the words, the
HUD it sits with).

Verification (automated): `npm test` with new jsdom tests:

- the panel is absent while the game is in progress and present once it is
  over;
- it names the winner, or the draw, in words, and shows both final totals;
- it receives focus when it appears;
- its button is reachable and operable by keyboard (`Tab` then `Enter`, and
  `Space`), driven with `@testing-library/user-event`;
- pressing play again starts a fresh game — ply 1, both scores 0, the panel
  gone, the board accepting clicks again;
- pressing play again after a game of a non-default length starts another game
  of **that** length, not §9's hundred;
- the live region announces the end of the game with the result;
- axe finds no violations with the panel open (`color-contrast` disabled).

---

## Step 17 — The arcade chrome: the title, the cabinet and the bezel

Status: pending

Give the page frame the same treatment the HUD already has: a cabinet face
around the board, glow on the title, a bezel around the playing area. Uses the
custom properties Step 12 added to `src/index.css`, extended there if the frame
needs more; the two side colours stay the single source of side identity.

**The board grid, the squares, the ships and the site markers are not
touched.** Their look was settled in stories 1, 3 and 9, and reopening it here
would triple the story and the review. The arcade pass stops at the bezel.

**No web font** (decision 19). Arcade type is a monospace system stack with
letter-spacing, weight and glow — the app must deploy from any static file host
and make no network requests, and a font file is a dependency decision that
belongs in its own commit if it is ever wanted.

Keep the board's sizing behaviour intact: `.app__board` is a size container and
`.board-frame` measures `--square` against it, so any padding, border or bezel
added around the board changes the room the board has and must be checked to
still let it grow and shrink. Do not remove `container-type: size` or the
`flex: 1; min-height: 0` that gives it a resolved height.

Depends on: Steps 12, 15 and 16 (everything the frame surrounds exists).

Verification (automated): `npm test` and `npm run build` — every existing
component test passes untouched, and axe finds no violations on the app
(`color-contrast` disabled). The look itself is Step 18.

---

## Step 18 — Manual gate: the whole look, the motion, and the ending

Status: pending

The story's manual gates, run against Step 11's three-round fixture so a whole
game — collections, the counter running out, the ending, and play again — takes
under a minute.

Run `npm run dev` and open `http://localhost:5273`.

Verification (manual): the owner confirms:

- **The chrome and the HUD read as one deliberate thing.** The scores, the
  round counter, the title and the bezel look designed together, not like a
  strip bolted above a board.
- **A payout reads at speed.** The score counts up rather than jumping, the
  `+N` floats off the nodes that paid in the collecting side's colour, the
  paying nodes pulse, and the pips light and go dark as nodes change hands.
  With one node held the `+N` sits on that node; with two it sits between them.
- **Contrast is genuinely legible**, checked in the browser by eye and with a
  contrast tool — axe's `color-contrast` rule is disabled in jsdom, so this
  check exists nowhere else.
- **Reduced motion loses nothing.** With `prefers-reduced-motion: reduce` set
  in the browser or the OS, nothing rolls, floats or travels: the score sets
  its new value directly, the `+N` appears and fades in place, the pulse is
  static or absent — and every number is still on screen as text.
- **The ending feels like an ending.** The board goes quiet, the panel lands
  and takes focus, the result is right, and play again starts a visibly
  different game (a new seed, a new opening) with both scores back to 0.
- **Keyboard only.** The panel can be reached and the play-again button
  operated without a mouse.
- **The board is unchanged.** Squares, ships, shield arcs and site markers look
  exactly as they did before this story.

Anything wrong here is fixed before Step 19, in the step that owns it.

---

## Step 19 — Remove the temporary fixture

Status: pending

Delete `src/game/reviewFixture.ts` and restore `src/App.tsx` to building its
opening session from `startingGameState(freshSeed())` — the inverse of Step
11's one-import, one-call change. Every game the app starts is again a fresh
seed at §9's hundred rounds.

Depends on: Step 18 (the gates it existed for are done).

Verification (automated): `npm run typecheck`, `npm run lint`, `npm test`,
`npm run format:check` and `npm run build` all pass **with no test changed**,
which is the proof that nothing came to depend on the fixture. Confirm by
`grep -r reviewFixture src` that no reference remains, and by opening the app
once that it starts from the true opening position with both scores at 0 and
the counter at 1/100.

---

## Step 20 — README check

Status: pending

`README.md` currently tells the player, in as many words, that "Nothing is
scored yet and the game does not end". **That is now false.** Update it — the
`/update-readme` command reviews the branch diff and does this — so the status
paragraph says what the app now does:

- holding a node **pays energy** at the end of each of that player's turns, on
  a table that pays much more for holding several at once than for holding one;
- the app **keeps score and shows it**, along with how many nodes each player
  holds and which round the game is in;
- the game **ends after 100 rounds**, the player with the most energy wins, an
  equal score is a draw, and there is a **play again** button.

Keep it truthful about what is still missing — no saved or recorded games, no
computer opponent, no way to choose the length of a game.

The word "influence" was already replaced by "energy" in Step 1; check it has
not crept back. The README carries no rules version number, so the 0.7 bump
itself needs no change there — check that this is still true rather than
assuming it.

**Owner's decision, carried over from story 00000011: the README's status
paragraph is updated only here, at the end.** It is a player-facing document,
not a working document for this pipeline, and it is written once the final
fallout of every decision is known — not patched step by step to keep an
unshipped branch tidy.

Player-facing text: "turn" and "node", written for a non-technical reader;
never "ply" or "hub".

Depends on: Steps 1–19 (everything the README would describe is built and the
fixture is gone).

Verification (automated): `npm run format:check` passes (prettier formats
markdown), and `npm run typecheck`, `npm run lint`, `npm test` and
`npm run build` are all green. Confirm by reading that the status paragraph
describes the app as it now behaves, claims nothing the app does not do, and
that no sentence still says the game cannot be won.
