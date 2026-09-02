# Story 00000048 — An optional clock

## Summary

The start screen gains a third option — a **clock** — and the game gains the
region to show it in. The reserved region on the right (or the bottom, in
portrait) stops saying `RESERVED` and starts holding both players' clocks.

- **Timer — None, 6s, 4s or 2s a turn, default None.** The number is
  **seconds a turn**, and each player's clock is that many seconds
  multiplied by the number of turns the chosen game length gives them. A
  thirty-round game at 6s a turn starts both players on **3:00**; the same
  game at 2s starts them on 1:00; a ninety-round game at 6s starts them on
  9:00. With **None** there is no clock: both readings say **INF** and
  nothing counts down.
- **Only the player to move is counting.** Green's clock starts the moment
  the board appears — there is no free first turn — and it runs until green's
  turn ends, at which point red's starts. Both stop when the game ends.
- **A player out of time passes, every turn, for the rest of the game.**
  Their clock sits at zero and flashes. The other player carries on taking
  ordinary turns, and the end-of-turn sequence runs for the passed turns
  exactly as section 8.6 already says it does for a turn that passes for want
  of a legal action.
- **When both players are out of time the game ends immediately**, on the
  spot, and the result is decided by energy the way it always is.

The two options that already exist are re-ordered and re-valued, on one
principle: **the leftmost choice is the simplest game, and it is the
default.**

- **Ships — 7, 6, 5**, largest first, default 7 (was 5, 6, 7).
- **Rounds — 30, 45, 60, 90**, default 30 (was 30, 50, 75, 100).
- **Timer — None, 6s, 4s, 2s**, default None.

So a player who presses PLAY without touching anything gets seven ships,
thirty rounds and no clock — the same game they get today.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.18**.
This story takes it to **0.19**: the clock changes how the game is played,
and the offered game lengths change, so it earns a changelog entry and a
version bump. Tagging remains on hold, per `CLAUDE.md`.

Planning documents say **ply** for the rules' and the UI's **turn**
(`CLAUDE.md`, Vocabulary). The player-facing option is labelled **Timer**;
the rules and this document call the thing itself a **clock**.

What exists today:

- **`doc/ruleset/rules.md`** — §2's word list (its **Round** entry names the
  offered lengths), §5 "Turns and actions" (one action a turn; a turn with no
  legal action passes), §8.6's note that a passed turn is still a turn and
  runs the whole end-of-turn sequence, and §9 "Ending the game" (the chosen
  number of rounds, most energy wins, equal energy is a draw).
- **`src/rules/gameLength.ts`** — `DEFAULT_GAME_LENGTH_ROUNDS` (30),
  `GAME_LENGTH_OPTIONS_ROUNDS` (`[30, 50, 75, 100]`, documented as what the
  start screen renders rather than as a restriction on what a state may
  hold), `isGameLengthRounds`, `isGameOver(state)`, `currentRound`, and
  `gameResult`.
- **`src/rules/fleet.ts`** — `FLEET_SIZES` (`[5, 6, 7]`, documented "smallest
  first — what the start screen renders"), `DEFAULT_FLEET_SIZE`,
  `isFleetSize`, and `MAX_SHIPS_PER_SIDE`, which is `Math.max(...FLEET_SIZES)`
  and must go on meaning "the most ships a side can ever have".
- **`src/start/StartScreen.tsx`** — the two `fieldset` radio groups, both
  rendered by mapping the option list, plus `OptionChoice`, whose `value` is
  typed `number` and is also its own label text.
- **`src/useAppScreen.ts`** — which screen is showing, the options chosen on
  the start screen, `handlePlay` (dispatches `new-game` with a fresh seed and
  the options) and `handleReturnToStart`.
- **`src/game/session.ts`** — the `Session` (state, selection, last event),
  the `SessionIntent` union (`activate`, `dismiss`, `new-game`) and the pure
  `sessionReducer`. `createSession` runs the §5 pass guard once so a starting
  position with no legal action is never sat on.
- **`src/rules/ply.ts`** — `applyPassGuard(state)`, which runs the end-of-turn
  sequence, advances the ply, swaps the side to move and reports a
  `PassEffect`; `applyMove` and `applyAttack` run it as their tail.
- **`src/board/announcements.ts`** — `passSentenceClauses`, which words a
  `PassEffect` as "Green has no legal action, so the turn passes."
- **`src/rules/gameState.ts`** — `GameState` and `startingGameState(seed,
lengthInRounds, fleetSize)`. `lengthInRounds` is stored on the state;
  fleet size is not, because `state.ships` records it.
- **`src/App.tsx`** — the three in-game regions, `app__info`, `app__play` and
  `app__reserved`, the last of which renders the word `RESERVED`.
- **`src/App.css`** — `.app__reserved`, held to `--region-extent` so it
  mirrors `.app__info` exactly and the board stays centred; the landscape
  media block turns the three regions into a row and re-keys type sizes to
  fractions of `--region-extent`.
- **`src/App.test.tsx`** — asserts the three regions, in DOM order, and that
  the third one's text is `RESERVED`.

Four facts shape the design and should not be rediscovered by the
implementer:

- **Wall-clock time must not enter `src/rules/`.** The rules layer is pure
  and its randomness is seeded so a game replays exactly (`CLAUDE.md`).
  Elapsed milliseconds are an app concern and belong outside it. But **"this
  player is out of time" is a fact about the game**, not about the app: it
  decides whether a turn passes and whether the game is over. That flag
  belongs on `GameState`, set by an intent the app dispatches when its clock
  reaches zero, exactly as an activation is an intent the app dispatches when
  a square is clicked. The rules layer never asks what time it is; it is
  told, once, that a clock has run out.
- **The pass machinery already exists and should be reused, not copied.**
  §8.6's guarantee that a passed turn still runs the full end-of-turn
  sequence is implemented once, in `applyPassGuard`. An out-of-time turn
  passes through the same path; what changes is that the pass has a second
  possible **reason**, which the announcement wording needs in order to say
  something true.
- **Remaining time is computed, not accumulated.** The clock reads a
  monotonic timestamp and subtracts; it never decrements a counter once per
  tick. A tick that is late, throttled by a background tab, or coalesced must
  not gain or lose the player any time.
- **The tick must not re-render the board.** Below fifteen seconds the
  reading changes ten times a second, and the board is the most expensive
  thing on screen. Whatever holds the ticking value must be scoped so that a
  tick repaints the clock region and nothing else.

## In scope

### 1. The rules edit, first and on its own

Version 0.18 → 0.19, with a changelog entry, in its own commit ahead of the
code.

**§2's Round entry** names the new lengths: 30, 45, 60 or 90, with 30 the
standard game.

**§9** names the same four lengths, and gains the clock's ending: the game
also ends the moment both players have run out of time, and the result is
decided by energy exactly as it is at the end of the last round.

**§5** gains one sentence: a turn also passes when the player to move is out
of time (pointing at the new section), and that is the second of the two
reasons a turn can pass.

**A new section 10, "The clock"**, after §9 and before the appendices,
stating the whole thing in a player's terms:

- The clock is chosen before play begins, along with the fleet size and the
  length: **no clock, or 6, 4 or 2 seconds a turn**. No clock is the
  standard game.
- Each player's clock starts at their seconds a turn multiplied by the number
  of turns the chosen length gives them — so the whole game is budgeted, and
  a player may spend it however they like across their turns. There is no
  per-turn limit and no increment.
- Green's clock starts when play begins. Only the player whose turn it is is
  counting; the clock changes hands when the turn does.
- A player whose clock reaches zero passes every remaining turn. Their turns
  are still turns — §8.6 runs in full for them — and their opponent goes on
  playing normally.
- When both players' clocks have reached zero the game ends immediately.
- Running out of time is **not** a loss. Energy decides the game however it
  ends.

Nothing else in the document changes.

### 2. The three options on the start screen

`FLEET_SIZES` is re-ordered to `[7, 6, 5]` and its comment stops saying
"smallest first". Nothing that derives from it may change meaning:
`MAX_SHIPS_PER_SIDE` still has to be the largest, and `startingFleet` still
has to answer for each size — a plain reversal of a list must not become a
reversal of a layout.

`GAME_LENGTH_OPTIONS_ROUNDS` becomes `[30, 45, 60, 90]`.
`isGameLengthRounds` is untouched: the rules layer goes on accepting any
positive whole number, because the test suite builds short games.

The clock's own numbers get a module beside `gameLength.ts` — the offered
values (no clock, 6, 4, 2), the default (no clock), a validity check, and the
one function that turns a length in rounds and a seconds-a-turn choice into a
starting budget. "No clock" is a value of that type, not the absence of one,
so the start screen and the app never special-case it in more than one place.

`StartScreen` renders a third `fieldset`, legend **Timer**, in the order
Ships, Rounds, Timer. Its choices read `None`, `6s`, `4s`, `2s`.
`OptionChoice` currently types its `value` as a `number` and uses it as its
own label; the third group needs a label that is not its value, which is the
one change that component needs.

`useAppScreen` holds the third option alongside the other two and passes it
to the game the same way, so a finished game returns to the start screen with
all three still set.

### 3. Out of time, in the game state

`GameState` gains a record of which sides have run out of time, both false at
the start. It is a fact about the game, so:

- `isGameOver` is true when both sides are out of time, as well as when the
  plies have run out. Everything already built on `isGameOver` — the session
  reducer refusing activations, `App` swapping in the game-over panel,
  `applyPassGuard`'s first check, `gameResult` — then behaves correctly with
  no further change, which is the point of putting the flag here.
- `startingGameState` sets both false. The deal is untouched and no seed
  steps are consumed, so `seededReplay.test.ts`'s expectations do not move.

Two new session intents, and no others:

- **A clock ran out**, naming the side. It records the flag. It is idempotent
  — the same side running out twice is not an error, it is a no-op.
- **The side to move passes because they are out of time.** It runs the same
  end-of-turn-and-advance path `applyPassGuard` runs. It is **refused unless
  the side to move is genuinely out of time**, so this cannot quietly become
  the pass button that is out of scope.

`PassEffect` gains the reason the turn passed — no legal action, or out of
time — and `announcements.ts` words the second one honestly ("Green is out of
time, so the turn passes."). Everything else about the sentence, including
the end-of-turn clauses and the whose-turn-is-next tail, is unchanged.

### 4. The clock itself

The clock lives in the app, above the session, and is rebuilt whenever a new
game starts. It holds, per side, how much of the budget is left, and which
side's clock is running.

- **Running** is exactly "the side to move, while a game is in progress".
  Not while the start screen or the game-over panel is up, and not once the
  game is over.
- **Remaining** is the side's budget minus the time already spent minus, for
  the running side, the elapsed time since it started running, measured on a
  monotonic clock. It never goes below zero.
- **Expiry** is noticed promptly — within about a tenth of a second of the
  budget being exhausted — and dispatches the clock-ran-out intent for that
  side.
- **The auto-pass is paced, not instantaneous.** When the side to move is out
  of time, the app leaves a short, fixed beat — on the order of a second —
  before dispatching the pass, so the passed turn reads as a turn happening:
  the round counter advances, the end-of-turn effects land, and the opponent
  can see why. Without it, a game where one player has run out would jump
  several rounds in a single repaint.
- **With no clock, none of this runs.** No ticking, no expiry, no passes.

### 5. The clock region

`.app__reserved` becomes the clock region: same place, same
`--region-extent`, same mirroring of the info region — the board must stay
exactly centred, and this region must not start sizing itself from its
contents. It holds both clocks, green's first, in the same green-left,
red-right order the HUD's scores already use: side by side in portrait,
stacked in landscape, matching what the info region does in each orientation.

The reading, for a player with a clock:

- **Above fifteen seconds**: minutes and seconds, `m:ss`, **rounded up**. The
  reading changes to 2:59 at the instant the remaining time reaches exactly
  2:59.000…, and not before — 2:59.4 still reads 3:00.
- **Fifteen seconds and below**: seconds and tenths, no minutes — `15.0`,
  `14.9`, … `0.1`, `0.0` — rounded up the same way. The handover is
  continuous: 0:16 covers the range down to fifteen seconds, then 15.0 takes
  over.
- **Zero** reads `0.0` and **flashes**, and goes on flashing for the rest of
  the game.
- **No clock** reads `INF`, for both players, all game.

The side whose clock is running is marked as such — the same treatment
whether it is counting down or reading `INF`.

Underneath, time is tracked to millisecond precision or better; the rounding
above is a display rule only, and expiry is judged against the real value,
not the rounded one. The formatting is a pure function of a remaining
duration, tested as one, with the boundaries above as its cases — that is
where the rounding rule is proved, not in a component test.

### 6. Documentation

`README.md` describes the game for players and should pick up the third
option and the new lengths; run `/update-readme` for the rest of the diff.

Per the accessibility section of `CLAUDE.md`, existing automated tests are
updated where the path is straightforward and no plan step is added for
testing accessibility. Two things are knowingly accepted and go in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`: the clock
readings are not announced (a value changing ten times a second cannot go
through a live region), and a player using a screen reader gets no warning
that they are running out of time. The out-of-time pass itself **is**
announced, because it goes through the existing pass sentence.

## Out of scope

- **A pass button.** A player who wants to pass still cannot, and passing is
  near-useless anyway. The out-of-time pass intent is deliberately refused
  for a player who has time left, so this story does not smuggle one in.
- **Losing on time.** Energy decides the game however it ends. There is no
  flag-fall result and the game-over panel keeps the wording it has.
- **Increments, delays, per-turn limits, or a clock a player can pause.**
  The budget is a single pool per player for the whole game.
- **Stopping the clock when the window is hidden or the tab loses focus.**
  The clock runs on wall time, like a real one.
- **Sound**, for the clock or for anything else.
- **Showing the resulting total on the start screen.** The Timer option shows
  seconds a turn; it does not preview "3:00" as the Rounds choice changes.
- **Recording or replaying a timed game.** Recording is not built yet. When
  it is, a timed game will need its clock events recorded to replay — this
  story notes that and builds nothing for it.
- **Retuning the offered numbers.** 6/4/2 seconds a turn and 30/45/60/90
  rounds are first guesses, to be play-tested like every other number in the
  ruleset.

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.19, and the changelog has an
  entry.
- The start screen shows three option groups in the order Ships, Rounds,
  Timer; Ships reads 7, 6, 5 and Rounds reads 30, 45, 60, 90; the leftmost
  choice in each group is the one selected when the screen first appears.
- Pressing PLAY without touching anything starts a seven-ship, thirty-round
  game with no clock, and both readings say INF for its whole length.
- A thirty-round game at 6s a turn starts both clocks at 3:00; at 2s, 1:00; a
  ninety-round game at 6s, 9:00.
- Green's clock starts counting the moment the board appears. Red's does not
  move until green's first turn ends, and green's stops at the same instant.
- The reading changes from 3:00 to 2:59 as the remaining time crosses exactly
  2:59, not at 2:59.5 and not at 2:58.
- The reading is `m:ss` above fifteen seconds and seconds-with-tenths at
  fifteen and below, with no gap or repeat across the handover, and 0.0 at
  the bottom.
- A clock at zero flashes, and goes on flashing for the rest of the game.
- A player out of time passes their turn: the round advances, the end-of-turn
  sequence runs in full for them (power, energy, drain, the charge draw,
  pressure, recovery), and the announcement says they are out of time rather
  than that they had no legal action.
- The passes are paced so each is visible as its own turn, rather than
  several rounds resolving in one repaint.
- A player out of time goes on passing every turn for the rest of the game,
  and their opponent goes on taking ordinary turns and scoring energy.
- When the second clock reaches zero the game ends immediately — the
  game-over panel appears at that round, not at the game's nominal last
  round — and the winner is whoever has the most energy, a draw being a draw.
- A game with no clock never passes for time and never ends early.
- Returning to the start screen after a game leaves all three options set the
  way that game was played, and pressing PLAY again starts fresh clocks at
  full.
- The board does not re-render on a clock tick.
- A backgrounded tab does not gain or lose a player time: the reading is
  correct when the tab comes back.
- The board stays exactly centred with the clock region in place, in both
  orientations, at the window sizes story 39's layout covers.
- Typecheck, lint, format check and the whole test suite pass, including
  `fullGame.test.ts` and `seededReplay.test.ts` — whose expectations must
  **not** move, since the clock consumes no seed steps.
