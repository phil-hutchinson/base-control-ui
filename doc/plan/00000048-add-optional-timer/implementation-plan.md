# Implementation plan — 00000048 An optional clock

## What this story is

Today the start screen offers two options (Ships, Rounds), and the in-game
screen's third region says `RESERVED`. This story adds a **third option — a
clock — and fills that region with both players' clocks.**

- **Timer — None, 6s, 4s, 2s a turn, default None.** The number is seconds a
  turn; each player's whole-game budget is that many seconds multiplied by the
  number of turns the chosen length gives them (one turn per round per player).
  Thirty rounds at 6s a turn is **3:00** each; thirty at 2s is 1:00; ninety at
  6s is 9:00. **None** means no clock at all: both readings say **INF**,
  nothing counts down, nothing expires.
- **Only the side to move counts.** Green's clock starts the instant the board
  appears; the clock changes hands when the turn does; both stop when the game
  ends.
- **A player out of time passes, every turn, for the rest of the game**, using
  the pass machinery that already exists (§8.6's full end-of-turn sequence runs
  for a passed turn). The passes are **paced** — about a second apart — so each
  one reads as a turn happening.
- **When both players are out of time the game ends immediately**, and energy
  decides it exactly as it always does.

The two existing options are re-ordered and re-valued on one principle: **the
leftmost choice is the simplest game, and it is the default.** Ships become
**7, 6, 5** (default 7); Rounds become **30, 45, 60, 90** (default 30); Timer
is **None, 6s, 4s, 2s** (default None). Pressing PLAY without touching anything
gives exactly the game it gives today.

This is a **gameplay change**, so `doc/ruleset/rules.md` goes from **0.18** to
**0.19** with a `doc/ruleset/changelog.md` entry and a matching `RULES_VERSION`
bump, in its own commit ahead of any code (Step 1). **Tagging stays on hold**
per `CLAUDE.md` — no step tags anything.

### Vocabulary reminder for a cold reader (`CLAUDE.md`)

Planning documents and code say **ply**; `rules.md`, the UI and `README.md` say
**turn**. They are the same thing: everything one player does before play
passes, which in this game is one action. **Round** is one turn each, and is
the same word everywhere. A **site** is one of the seventeen fixed positions; a
**node** is a site that is charged (code says **hub** where an identifier for
that is needed — this story needs none). **Move** means the movement action
specifically and is never a synonym for a turn.

The player-facing start-screen option is labelled **Timer**. The rules
document, this plan and the code call the thing itself a **clock**.

### Settled decisions that are not to be re-opened

Fixed by the story before planning began. A step that finds one of these
inconvenient should still implement it, and say so in its Notes.

1. The rules edit goes first, in its own commit, ahead of any code — 0.18 →
   0.19, one changelog entry, `RULES_VERSION` bumped in the same commit. No
   tagging.
2. **No pass button.** The out-of-time pass is refused for a side that still
   has time. Nothing in this story gives a player a way to pass voluntarily.
3. **No losing on time.** Energy decides the game however it ends. No
   flag-fall result; the game-over panel's own wording does not change.
4. **No increments, delays, per-turn limits, or a pausable clock.** One pool
   per player for the whole game.
5. **The clock does not stop when the tab is hidden or loses focus.** It runs
   on wall time, like a real one.
6. **No sound**, for the clock or anything else.
7. **The start screen does not preview the resulting total.** The Timer option
   shows seconds a turn and nothing else.
8. **No retuning.** 6/4/2 seconds a turn and 30/45/60/90 rounds are first
   guesses, to be play-tested like every other number in the ruleset.
9. **Nothing is built for recording or replaying a timed game.** Recording does
   not exist yet; see "Follow-on work" at the foot of this plan.
10. **Wall-clock time never enters `src/rules/`.** No module under `src/rules/`
    may read `performance.now`, `Date.now` or any other ambient clock. What the
    rules layer holds is the _fact_ that a side has run out of time, set by an
    intent the app dispatches.
11. **No `Math.random`** anywhere (lint enforces it in game code). The clock
    consumes **no seed steps at all**, so `seededReplay.test.ts`'s expectations
    must not move.

### Accessibility (per `CLAUDE.md`)

No step tests accessibility, and no step spends work repairing it. Existing
automated tests are updated where the path is straightforward. Three costs are
knowingly accepted and recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` in Step 15 — see
**D18**.

---

## Where the work lands

| File                                                        | What happens to it                                                                                         | Step  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----- |
| `doc/ruleset/rules.md`                                      | §2's Round entry, §5, §9 edited; new §10 "The clock"; version 0.18 → 0.19                                  | 1     |
| `doc/ruleset/changelog.md`                                  | One new `## 0.19` entry at the top                                                                         | 1     |
| `src/rules/rulesVersion.ts`                                 | `RULES_VERSION` → `"0.19"`                                                                                 | 1     |
| `src/rules/fleet.ts`                                        | `FLEET_SIZES` → `[7, 6, 5]`; its comment stops saying "smallest first"                                     | 2     |
| `src/rules/gameLength.ts`                                   | `GAME_LENGTH_OPTIONS_ROUNDS` → `[30, 45, 60, 90]` (Step 2); `isGameOver` gains the clock's ending (Step 5) | 2, 5  |
| `src/rules/clock.ts` (new)                                  | The offered clock settings, the default, the validity check, the budget function                           | 3     |
| `src/start/StartScreen.tsx`                                 | `OptionChoice` gains a label; third `fieldset`, legend "Timer"                                             | 4     |
| `src/useAppScreen.ts`                                       | Holds the clock setting alongside the other two options                                                    | 4     |
| `src/App.tsx`                                               | Passes the clock setting to `StartScreen` (Step 4); renders the clock region (Step 11)                     | 4, 11 |
| `src/rules/gameState.ts`                                    | `GameState.outOfTime`; `startingGameState` sets both false; `markOutOfTime`                                | 5     |
| `src/rules/ply.ts`                                          | `PassEffect.reason`; the pass body extracted; `applyOutOfTimePass`                                         | 6     |
| `src/board/announcements.ts`                                | The out-of-time pass sentence; the game-over clause when the game ends on time                             | 7     |
| `src/game/session.ts`                                       | Two new intents: `clock-expired`, `pass-out-of-time`                                                       | 8     |
| `src/clock/clockReading.ts` (new)                           | The pure reading formatter                                                                                 | 9     |
| `src/clock/useGameClock.ts` (new)                           | The ticking clock: remaining time, expiry, the paced pass                                                  | 10    |
| `src/clock/ClockRegion.tsx` / `.css` (new)                  | Both clocks on screen                                                                                      | 11    |
| `src/App.css`                                               | `.app__reserved` → `.app__clocks` (same box, same extent)                                                  | 11    |
| `README.md`                                                 | The status paragraph picks up the third option and the new lengths                                         | 14    |
| `doc/plan/00000021-accessibility-tech-debt/known-issues.md` | Three accepted costs                                                                                       | 14    |

Tests touched, and by which step:

| Test file                                                          | Step(s)  | Why                                                                        |
| ------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------- |
| `src/rules/rulesVersion.test.ts`                                   | 1        | Passes unchanged once the document and the constant agree at 0.19          |
| `src/rules/gameLength.test.ts`                                     | 2, 5     | The offered lengths; `isGameOver` on the clock's ending                    |
| `src/rules/fleet.test.ts`                                          | 2        | `FLEET_SIZES`' order                                                       |
| `src/start/StartScreen.test.tsx`                                   | 2, 4     | Values it names (75 → 60 etc.); the third group                            |
| `src/useAppScreen.test.tsx`                                        | 2, 4     | Values it sets; the clock setting                                          |
| `src/App.test.tsx`                                                 | 2, 4, 11 | Radio names; the third region's class and content; the board-repaint check |
| `src/rules/clock.test.ts` (new)                                    | 3        | The budget arithmetic and the option list                                  |
| Every test file that hand-builds a `GameState` literal (~15 files) | 5        | The new `outOfTime` field                                                  |
| `src/rules/ply.test.ts`                                            | 6        | The pass reason and `applyOutOfTimePass`                                   |
| `src/board/announcements.test.ts`                                  | 7        | The two new sentences; existing pass cases gain a reason                   |
| `src/game/session.test.ts`                                         | 8        | The two new intents                                                        |
| `src/clock/clockReading.test.ts` (new)                             | 9        | The rounding rule and its boundaries                                       |
| `src/clock/useGameClock.test.tsx` (new)                            | 10       | Ticking, handover, expiry, paced passing                                   |
| `src/clock/ClockRegion.test.tsx` (new)                             | 11       | Both readings, order, running marker, INF                                  |

---

## Design decisions and reasoning

This is the only place these decisions are written down (`CONTRIBUTING.md`
forbids design history in code comments).

### D1 — The rules document is edited first, on its own

The clock changes how the game is played (a turn can pass for a second reason,
and the game can end early), and the offered lengths change. `rules.md` is the
single source of truth; the code implements it. So 0.18 → 0.19, changelog entry
and `RULES_VERSION` in one commit ahead of any code, per `CLAUDE.md` and the
implementation-plan guide.

### D2 — The budget is seconds a turn × rounds

Each player takes exactly one turn per round, so the turns a length gives a
player equals its rounds. Budget per side = `lengthInRounds × secondsPerTurn`
seconds. Checks against the story: 30 × 6 = 180 s = 3:00; 30 × 2 = 60 s = 1:00;
90 × 6 = 540 s = 9:00. Rejected: multiplying by plies (both players' turns),
which would double every budget; and any per-turn cap, which is out of scope.

### D3 — "No clock" is a value, and its budget is infinite

The clock setting is a small union whose members are `"none"`, `6`, `4` and
`2`. `"none"` is a value of that type, never the absence of one, so nothing has
to ask "is there a clock?" in more than one place. Its **budget is
`Number.POSITIVE_INFINITY`**, which makes the two consumers total rather than
conditional:

- the formatter maps an infinite remaining time to `INF` (one branch it needs
  anyway, since that is the reading the story asks for);
- remaining time is always positive, so **expiry can never fire** with no
  clock, without a special case.

Exactly one further special case exists, and it is required by the story
("with no clock, none of this runs"): the clock hook starts **no interval and
no timers** when the setting is `"none"`.

Rejected: an `undefined` budget or a separate `hasClock` boolean (special cases
spread through the hook, the region and the component); and `0` as a sentinel
for "no clock" (zero seconds a turn reads naturally as "already lost", which is
the opposite of what it would mean).

### D4 — "Out of time" is a fact about the game, so it lives on `GameState`

`GameState` gains `outOfTime`, a flag per side, both false at the start. The
rules layer never asks what time it is; it is _told_, once, by an intent the
app dispatches when a clock reaches zero — exactly as it is told that a square
was activated.

The payoff is that everything already built on `isGameOver` behaves correctly
with no further change once `isGameOver` also returns true when both sides are
out of time: the session reducer refuses activations, `App` swaps in the
game-over panel, `applyPassGuard`'s first check stops the guard running past
the end, and `gameResult` decides on energy.

Rejected: keeping "out of time" in app state only. Then the app would have to
teach the board to refuse input, the panel to appear, and the pass guard to
stop — three copies of a fact the rules layer is the natural home for.

### D5 — The pass machinery is reused, not copied

§8.6's guarantee that a passed turn runs the whole end-of-turn sequence is
implemented once, inside `applyPassGuard`. Step 6 extracts that body into a
private helper taking the pass's reason, and adds one exported function,
`applyOutOfTimePass`, that calls it. That function is **refused unless the side
to move is genuinely out of time and the game is not over**, which is what
keeps this from quietly becoming the pass button that is out of scope (settled
decision 2).

`applyOutOfTimePass` runs `applyPassGuard` on the state it produces, the way
`applyMove` and `applyAttack` do, so the side passed to never sits with no
legal action. It therefore returns a **list** of pass effects: the out-of-time
pass, and possibly a following no-legal-action pass.

### D6 — `PassEffect` gains a reason, rather than a second effect type

A pass is one fact with two possible causes, so the cause is a field
(`"no-legal-action" | "out-of-time"`), not a new effect type. A new type would
force every consumer switch — `announcements.ts` twice, `session.ts`,
`ply.ts`'s effect unions — to grow a parallel branch that does the same thing.

### D7 — When two passes chain, the session records the last one

`SessionEvent` already includes `PassEffect` directly. When `applyOutOfTimePass`
returns two effects (out of time, then the opponent having no legal action), the
session's `lastEvent` is the **last** one — the live region speaks the most
recent thing that happened, which is also the one that names whose turn it now
is. The earlier sentence goes unspoken in that rare case; the cost is recorded
in the accessibility ledger (D18) rather than paid, per `CLAUDE.md`.

Rejected: a wrapper event carrying a list of pass effects, which would churn
`createSession`, both switches in `announcements.ts` and their tests for a case
that needs green to be out of time _and_ red to be completely pinned.

### D8 — The ticking state lives below `App`, in the clock region's own subtree

Below fifteen seconds the reading changes ten times a second, and the board is
the most expensive thing on screen. React re-renders a component's whole
subtree when the component re-renders, so **the ticking value must never be
`App`'s state**.

The clock hook is therefore called inside `ClockRegion`, which `App` renders as
a sibling of the board and hands three props: the game state, the clock
setting, and `onIntent` — the same `(state-ish, onIntent)` shape `Board`
already takes. A tick sets state inside `ClockRegion` and repaints that region
alone. Expiry and the paced pass dispatch intents upward, which does re-render
everything — correctly, because those are genuine game-state changes and happen
at most once a second.

Rejected: calling the hook in `App` (every tick repaints the board); and an
external store read with `useSyncExternalStore` (correct, but more machinery
than this needs — keep it in mind if the clock ever has to be read _above_
`App`).

### D9 — Remaining time is computed from a monotonic timestamp, never accumulated

The hook stores, per side, the milliseconds already **spent**, plus which side
is running and the `performance.now()` reading at which it started. Remaining =
`budget − spent − (running ? now − startedAt : 0)`, clamped at zero. A tick only
triggers a repaint; it never decrements anything. A tick that is late,
throttled by a background tab, or coalesced therefore cannot gain or lose a
player time.

The tick is a **100 ms `setInterval`**. That is fast enough for a reading in
tenths and for the story's "expiry noticed within about a tenth of a second".
Rejected: `requestAnimationFrame` (60 repaints a second for a value that
changes 10 times a second, and it stops entirely in a background tab, so expiry
would not be noticed until the tab came back); and any accumulating counter.

`performance.now()` and not `Date.now()`: monotonic, unaffected by a system
clock change.

### D10 — The clock is reset by unmounting, not by an explicit reset

`ClockRegion` is rendered only on the game screen, and the only path to a new
game runs through the start screen (`useAppScreen.handlePlay`), which unmounts
it. A fresh game therefore always mounts a fresh region with fresh budgets and
zero spent. If a "new game" path that bypasses the start screen is ever added,
give the region a `key` that changes per game — say a counter incremented in
`handlePlay` — rather than adding a reset path.

### D11 — Handover happens in an effect, and the few milliseconds' lag is accepted

The side to move changes in a React state update; the hook notices in an effect
that runs after that render commits. The handful of milliseconds between the
two is charged to the player who just moved. It is two orders of magnitude
below the display's granularity and below the story's own tolerances, and
removing it would mean timestamping inside the reducer — that is, putting wall
time into game logic, which settled decision 10 forbids.

### D12 — The auto-pass is paced at a fixed ~1 second

When the side to move is out of time and the game is not over, the hook arms a
**one-second** timer and then dispatches the pass; it re-arms each ply. Without
the pacing, a game where one player has run out would advance many rounds in a
single repaint and the opponent would never see why. The delay is a named
constant, not a tuned curve.

The opponent loses no time during these passes: only the side to move counts,
and the side to move is the player who is out of time.

### D13 — The rounding rule is display-only, and rounds **up**

`formatClockReading` is a pure function of a remaining duration:

- infinite → `INF`;
- above 15 000 ms → `m:ss`, seconds rounded **up** (`ceil`), so 2:59.4 still
  reads `3:00` and the reading becomes `2:59` exactly when the remaining time
  reaches 179.000 s;
- 15 000 ms and below → seconds and tenths, no minutes, tenths rounded up
  (`15.0`, `14.9`, … `0.1`, `0.0`). The handover is continuous: `0:16` covers
  everything above fifteen seconds, `15.0` takes over at exactly fifteen;
- zero or below → `0.0`.

Expiry is judged against the underlying value, never the rounded one. Because
this is where the rule is proved, it gets its own pure test (Step 9) rather
than being asserted through a component.

### D14 — The region is renamed `.app__clocks`; `App` keeps owning the box

`.app__reserved` is renamed to `.app__clocks`: nothing is reserved any more,
and a class named for a placeholder would mislead the next reader. The **box
itself does not change**: same third position, same `flex: 0 0
var(--region-extent)` in portrait and same `width: var(--region-extent)`
alongside `.app__info` in landscape, so it goes on mirroring the info region
exactly and the board stays centred. It must never size itself from its
contents.

`App` owns the region box (a `div` with the region class, in `App.css`); the
clock component owns everything inside it and its own stylesheet — exactly the
`.app__info` + `Hud` arrangement that is already there.

Inside, the two clocks sit **green first** in the same orientation-dependent
arrangement the HUD's score cells use: side by side in portrait, stacked in
landscape.

**Each clock is labelled with its side's name** — `GREEN` and `RED` above the
reading, the way `ScoreDisplay` names its sides — so the readings are never
told apart by colour alone. This is the owner's decision, taken at the plan
gate; the alternative considered and rejected was colour and position only.
The label is small type keyed to `--region-extent` the same way everything
else in the region is, and the region must still not size itself from its
contents (see the box rules above).

### D15 — Reversing `FLEET_SIZES` is safe, and must stay safe

`FLEET_SIZES` becomes `[7, 6, 5]` because the start screen renders it in order
and the leftmost choice must be the simplest, default game. Everything derived
from it is order-independent by construction: `MAX_SHIPS_PER_SIDE` is
`Math.max(...)`, `isFleetSize` is a membership test, and `startingFleet` looks
the layout up in a record keyed by size. **A reversal of a list must not become
a reversal of a layout** — Step 2's verification pins each size's starting
layout explicitly.

`isGameLengthRounds` is untouched: the rules layer goes on accepting any
positive whole number, because the test suite builds short games. The offered
list constrains the UI only.

### D16 — `OptionChoice` gains a label

The Ships and Rounds groups use their value as their own label; the Timer group
cannot (`"none"` is not `None`, and `6` is not `6s`). `OptionChoice` therefore
takes both a `value` (string or number, used as the input's `value` attribute)
and a `label` (the text shown, and hence the radio's accessible name). All
three groups pass both explicitly — no defaulting, so a reader of the component
never has to work out where a label came from.

The label text lives beside the Timer fieldset in `StartScreen.tsx`, not in
`src/rules/clock.ts`: `None`/`6s`/`4s`/`2s` is start-screen chrome, and the
rules layer holds numbers, not player-facing strings.

### D17 — The budget is computed from `state.lengthInRounds`

The clock reads the length from the **game state**, not from the option the
start screen currently holds. The state is the authority on the game being
played (that is why `lengthInRounds` lives there), and reading it makes it
impossible for a mid-game option change — should one ever become possible — to
retune a running clock.

### D18 — Three accepted accessibility costs

Recorded in `doc/plan/00000021-accessibility-tech-debt/known-issues.md` in Step
14, per `CLAUDE.md`:

1. **The clock readings are not announced.** A value that changes ten times a
   second cannot go through a live region.
2. **No warning that a player is running out of time** reaches a screen-reader
   user; the flash is a visual cue only.
3. **A chained pass loses the first sentence** (D7).

The out-of-time pass itself **is** announced, because it goes through the
existing pass sentence.

### D19 — §8.6 already uses the word "clocks"

§8.6 says "The clocks still tick" about the drain and recovery clocks that a
passed turn does not skip. With a player's clock now in the document, that
sentence is ambiguous. Step 1 disambiguates it minimally (naming the site
clocks) and says so in the changelog entry as a clarification. Nothing else in
§8.6 changes.

---

## Step 1 — Rules 0.19: the clock

Status: committed

Notes: Bumped `rules.md` to 0.19, edited §2's Round entry, added the §5
pass-reason sentence, reworded §8.6's "The clocks still tick" to "The site
clocks still tick" (D19, noted as a clarification in the changelog), edited
§9's lengths and added its clock-ending sentence, and added new §10 "The
clock" before Appendix A. Set `RULES_VERSION` to `"0.19"` and added the
`## 0.19` changelog entry. No deviation from the plan; `npm run format`
reflowed the touched paragraphs' line wrapping, which is expected prettier
behaviour on markdown.

Edit `doc/ruleset/rules.md` and nothing else in `src/`, in this commit, ahead
of every code step (**D1**). Bump the version line to **0.19**, set
`RULES_VERSION` in `src/rules/rulesVersion.ts` to `"0.19"`, and add a
`## 0.19 — ...` entry at the top of `doc/ruleset/changelog.md`.

Write in the document's existing voice: player-facing, non-technical, "turn"
and "node", never "ply" or "hub", and no implementation detail (no `INF`, no
formatting rule, no mention of the app's regions).

**§2, the Round entry** — the offered lengths become **30, 45, 60 or 90**, with
**30** the standard game. Keep the cross-reference to section 9. Do not add a
new word-list entry for "clock"; section 10 defines it in place.

**§5** — one sentence added: a turn also passes when the player to move is out
of time (cross-referencing the new section 10), and that is the second of the
two reasons a turn can pass. Everything else in §5 stands.

**§8.6** — the sentence "The clocks still tick" is about a site's drain and
recovery, and now collides with the player's clock. Reword it minimally so it
plainly means the site clocks (**D19**). No other change to §8.6; its guarantee
that a passed turn runs the sequence in full is exactly what the new section
relies on.

**§9** — names the same four lengths (30, 45, 60, 90, 30 standard), and gains
the clock's ending: the game **also** ends the moment both players have run out
of time, and the result is then decided by energy exactly as it is at the end
of the last round.

**A new section 10, "The clock"**, after §9 and before Appendix A, stating:

- the clock is chosen before play begins alongside the fleet size and the
  length: **no clock, or 6, 4 or 2 seconds a turn**, with no clock the standard
  game;
- each player's clock starts at their seconds a turn multiplied by the number
  of turns the chosen length gives them, so the whole game is budgeted and a
  player may spend it however they like across their turns — **no per-turn
  limit and no increment**;
- green's clock starts when play begins; only the player whose turn it is is
  counting, and the clock changes hands when the turn does;
- a player whose clock reaches zero **passes every remaining turn**; those
  turns are still turns (section 8.6 runs in full for them) and their opponent
  goes on playing normally;
- when **both** players' clocks have reached zero the game ends immediately
  (section 9);
- running out of time is **not** a loss — energy decides the game however it
  ends.

The changelog entry says this is a gameplay change, that tagging stays on hold
per the project's contribution notes, and lists: the new clock, the changed
offered lengths, the second reason a turn passes, the new way a game can end,
and the §8.6 wording clarification. Say **why** the lengths changed (30/45/60/90
replaces 30/50/75/100 so the offered games ladder more evenly, and 90 rounds at
6s a turn is a nine-minute clock) and that the numbers are first guesses to be
play-tested.

Nothing else in the document changes. In particular, do not touch §1's
overview, §4, or the appendices.

Depends on: nothing.

Verification (automated): `npm test` passes, including
`src/rules/rulesVersion.test.ts`, which reads the version out of `rules.md` and
asserts both that `RULES_VERSION` matches it and that the changelog has a
`## 0.19` entry. `npm run format:check` passes (prettier formats markdown).
`grep -n "50, 75\|100 rounds" doc/ruleset/rules.md` returns nothing.

---

## Step 2 — The offered options change: ships 7/6/5, rounds 30/45/60/90

Status: committed

Notes: `FLEET_SIZES` reordered to `[7, 6, 5]` (comment updated to describe
largest-first, start-screen order) and `GAME_LENGTH_OPTIONS_ROUNDS` changed to
`[30, 45, 60, 90]`; `DEFAULT_FLEET_SIZE`, `DEFAULT_GAME_LENGTH_ROUNDS` and
`isGameLengthRounds` untouched, per plan. Swept `fleet.test.ts` (added an
explicit `FLEET_SIZES` order assertion and a `MAX_SHIPS_PER_SIDE === 7`
assertion per D15), `gameLength.test.ts`, `StartScreen.test.tsx`,
`useAppScreen.test.tsx` and `App.test.tsx` for the new values (50→45, 75→60).
One deviation beyond the plan's explicit file list: two unrelated test files
(`src/game/session.test.ts` and `src/rules/gameState.test.ts`) had literal
`[5, 6, 7]` fleet-size enumerations used only to parameterise per-size tests
(order-independent in behaviour); reordered them to `[7, 6, 5]` as well so the
step's own verification grep (`\[5, 6, 7\]` returns nothing) is satisfied
without weakening the check to exclude them. Typecheck, lint, format:check and
the full test suite (49 files, 819 tests) all pass.

Implement §2 and §9 as edited in Step 1, plus the ships re-ordering.

- `src/rules/fleet.ts`: `FLEET_SIZES` becomes `[7, 6, 5]`, and its comment
  stops saying "smallest first" — it is the order the start screen renders,
  largest first. `DEFAULT_FLEET_SIZE` stays 7. `MAX_SHIPS_PER_SIDE` and
  `isFleetSize` are untouched and must go on meaning what they mean (**D15**).
- `src/rules/gameLength.ts`: `GAME_LENGTH_OPTIONS_ROUNDS` becomes
  `[30, 45, 60, 90]`, and its comment stops saying "shortest first" if the new
  order makes that wrong (it does not — the list is still ascending — so keep
  the comment honest either way). `DEFAULT_GAME_LENGTH_ROUNDS` stays 30.
  **`isGameLengthRounds` is not touched**: the rules layer goes on accepting
  any positive whole number, because the suite builds short games.

Then sweep the tests that name the old values:

- `src/rules/fleet.test.ts` — assert the new order explicitly, and keep the
  per-size layout assertions passing; add an assertion, if one is not already
  there, that `MAX_SHIPS_PER_SIDE` is 7 and that each size still deals the
  layout it dealt before (this is the "a reversal of a list is not a reversal
  of a layout" guard from **D15**).
- `src/rules/gameLength.test.ts` — the offered list is `[30, 45, 60, 90]` and
  contains the default. Where 100 is used as an arbitrary length in unrelated
  arithmetic cases, leaving it is fine — it is a valid length, just not an
  offered one.
- `src/start/StartScreen.test.tsx`, `src/useAppScreen.test.tsx`,
  `src/App.test.tsx` — replace 50/75/100 with offered values (45/60/90). These
  files pick a non-default value to prove a choice takes effect; keep that
  intent, just with a value the screen now offers.

Depends on: Step 1 (these lists are what §2 and §9 now name).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass. `grep -rn "50, 75, 100\|\[5, 6, 7\]" src/`
returns nothing.

---

## Step 3 — `src/rules/clock.ts`: the clock's numbers

Status: committed

Notes: Added `src/rules/clock.ts` (`ClockSetting`, `CLOCK_SETTINGS`,
`DEFAULT_CLOCK_SETTING`, `isClockSetting`, `startingBudgetMs`) and
`src/rules/clock.test.ts` per the plan, with `isClockSetting` typed as an
`unknown`-accepting type guard (matching how the start screen will need to
validate a raw value) rather than `isFleetSize`'s `number`-only signature,
since a clock setting includes the non-numeric `"none"`. No other deviation;
nothing yet imports this module.

Add `src/rules/clock.ts`, beside `gameLength.ts`, holding only the clock's
numbers — no wall-clock reading of any kind (settled decision 10):

- the **clock setting** type: a union of `"none"` and the offered seconds a
  turn (6, 4, 2), with `"none"` a value of the type and not the absence of one
  (**D3**);
- the **offered settings**, in the order the start screen renders them:
  `"none"`, 6, 4, 2 — leftmost is the standard game;
- the **default**: `"none"`;
- a **validity check** in the shape of `isFleetSize`/`isGameLengthRounds`;
- one **budget function** turning a length in rounds and a setting into a
  starting budget in **milliseconds**: `Number.POSITIVE_INFINITY` for `"none"`,
  otherwise `lengthInRounds × seconds × 1000` (**D2**). It throws a
  `RangeError` on a length that is not a positive whole number, matching
  `startingGameState`'s guard.

Milliseconds, not seconds, because every consumer works in milliseconds; doing
the conversion once here keeps it out of the app.

Write a module header saying what the module is for and naming rules.md §10,
in the style of `gameLength.ts`.

Add `src/rules/clock.test.ts` covering: the offered list and its order; the
default is in the list and is "no clock"; the validity check accepts each
offered value and rejects others; the three budgets the story names
(30 rounds at 6s → 180 000 ms; 30 at 2s → 60 000; 90 at 6s → 540 000); `"none"`
→ infinite at every length; and the `RangeError` on a bad length.

Nothing consumes this module yet — that is deliberate scaffolding.

Depends on: Step 1 (§10 is what these numbers state).

Verification (automated): `npm test` passes with the new file's cases green;
`npm run typecheck`, `npm run lint`, `npm run format:check` pass.
`grep -n "performance\|Date\." src/rules/clock.ts` returns nothing.

---

## Step 4 — The Timer option on the start screen

Status: committed

Notes: `OptionChoice` now takes an explicit `label` alongside `value`
(`value` typed `string | number`); Ships and Rounds pass `String(value)` as
their label, and the third fieldset ("Timer") maps `CLOCK_SETTINGS` through a
local `CLOCK_SETTING_LABELS` record (`None`/`6s`/`4s`/`2s`) defined beside the
fieldset, per D16. `useAppScreen` holds `clockSetting` (default
`DEFAULT_CLOCK_SETTING`) and `setClockSetting`, not part of the `new-game`
intent; `handleReturnToStart` is unchanged so the value survives a return to
the start screen. `App.tsx` threads `clockSetting`/`setClockSetting` through
to `StartScreen`. Updated `StartScreen.test.tsx` (new Timer-group render and
click cases; existing click cases renamed/extended to assert the other two
handlers, including the new one, are not called), `useAppScreen.test.tsx`
(default is `"none"`; setter works; survives return-to-start), and
`App.test.tsx`'s opening-screen assertion to also check the `None` radio is
checked. No deviation from the plan.

Put the third option on the start screen and carry it in the app's screen
state. Nothing in the game consumes it yet; this step is about choosing it.

`src/start/StartScreen.tsx`:

- `OptionChoice` takes a `value` (string or number — the input's `value`
  attribute) **and** a `label` (the visible text, and so the radio's accessible
  name). All three groups pass both explicitly (**D16**).
- A third `fieldset` with legend **Timer**, rendered **after** Ships and
  Rounds, mapping the offered clock settings from `src/rules/clock.ts`. Its
  labels are `None`, `6s`, `4s`, `2s`, from a small map beside the fieldset —
  not from the rules module (**D16**).
- Two new props, in the shape of the existing pairs: the current clock setting
  and a change handler. The component stays controlled and holds no state.
- No new CSS. The third group reuses `.start-screen__options`,
  `.start-screen__legend`, `.start-screen__choices` and `.start-screen__label`
  exactly as the other two do.

`src/useAppScreen.ts`: hold the clock setting alongside the other two options,
defaulting to `src/rules/clock.ts`'s default, with a setter of the same shape.
**It is not part of the `new-game` intent** — the rules layer knows nothing
about time (settled decision 10) — so `handlePlay` is otherwise unchanged, and
`handleReturnToStart` goes on changing nothing, which is what leaves all three
options set when a finished game returns to the start screen.

`src/App.tsx`: pass the new option and its setter through to `StartScreen`.

Update `src/start/StartScreen.test.tsx` (the third group renders its four
choices with the right labels, the selected one is checked, clicking one calls
the handler with the matching setting, and the other two groups are unaffected)
and `src/useAppScreen.test.tsx` (the default is "no clock"; the setter works;
the value survives `handleReturnToStart`). Update `src/App.test.tsx`'s
start-screen assertions to expect the third group at its default.

Depends on: Steps 2 and 3 (the option lists it renders).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` pass, with the new component and hook cases green. The
start screen's look is checked by hand in Step 12, not here.

---

## Step 5 — `outOfTime` on the game state, and the clock's ending

Status: committed

Notes: Added `GameState.outOfTime` (a readonly `Record<Side, boolean>`),
`startingGameState` setting both false with no change to the deal or the
seed, and `markOutOfTime(state, side)` (idempotent, returns the same object
when already set) in `src/rules/gameState.ts`. `isGameOver` in
`src/rules/gameLength.ts` now also returns true once both sides carry the
flag, with its comment updated to explain why this is the one place the
clock's ending needs stating. Swept every hand-built `GameState` literal
(21 files: 18 test files plus the two rules source files, matching the
plan's "about fifteen") to add `outOfTime: { green: false, red: false }`;
files that build states by spreading `startingGameState(...)` or another
existing state needed no change. Added the required `gameLength.test.ts`
cases (mid-game with neither/one/both side out of time; `gameResult` on a
both-out-of-time state, including the draw) and, beyond the plan's explicit
list, a few `gameState.test.ts` cases for `startingGameState`'s new default
and for `markOutOfTime` itself (its own field deserved direct coverage
alongside the sweep). `seededReplay.test.ts` needed no edit at all and its
expectations did not move; `fullGame.test.ts` gained only the `outOfTime`
insertions, no expectation changes. `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` (50 files, 852 tests) all pass.

Implement §9's new ending and the fact §5 and §10 depend on (**D4**).

`src/rules/gameState.ts`:

- `GameState` gains a flag per side recording who has run out of time, in the
  same plain-readonly-data style as `energy` (a readonly record keyed by side).
  Document it as a fact about the game, set from outside the rules layer by an
  intent — the rules layer never reads a clock.
- `startingGameState` sets both false. **It consumes no seed steps and changes
  nothing about the deal**, so `seededReplay.test.ts`'s expectations must not
  move (settled decision 11).
- Add `markOutOfTime(state, side)`: returns a state with that side's flag set,
  and returns the **same object** if it is already set, so the operation is
  idempotent and a needless re-render is impossible. It lives here, next to the
  field, rather than in `clock.ts`, which stays purely about the offered
  numbers.

`src/rules/gameLength.ts`: `isGameOver` returns true when the plies have run
out **or** when both sides are out of time. Update its comment to say both, and
to say why this is the one place the clock's ending needs stating: everything
built on `isGameOver` — the session reducer's refusal, `App`'s game-over swap,
`applyPassGuard`'s first check, `gameResult` — then follows for free.

Then sweep every place that hand-builds a `GameState` **literal** so it carries
the new field. About fifteen test files do this, usually through a single local
builder helper (`src/board/announcements.test.ts`, `src/board/Board.test.tsx`,
`src/board/EnergyOverlay.test.tsx`, `src/game/session.test.ts`,
`src/hud/*.test.tsx`, and `src/rules/{actions,camping,chargeDraw,combat,
endOfTurn,energy,fullGame,gameState,movement,openingBoard,ply,recovery}.test.ts`).
States built by spreading an existing state need nothing.

Add cases to `src/rules/gameLength.test.ts`: a game inside its rounds with
neither side out of time is not over; with one side out of time it is **not**
over; with both it **is** over, at whatever ply it is on; and `gameResult` on a
both-out-of-time state decides on energy, including the draw.

Depends on: Step 1 (§9's new ending).

Verification (automated): `npm test` passes — in particular
`src/rules/seededReplay.test.ts` and `src/rules/fullGame.test.ts` pass with
**no change to their expected numbers**; if either needs its expectations
edited, stop: something has consumed a seed step that should not have.
`npm run typecheck`, `npm run lint`, `npm run format:check` pass.

---

## Step 6 — The out-of-time pass in `ply.ts`

Status: committed

Notes: `PassEffect` gained `reason: PassReason` (`"no-legal-action" |
"out-of-time"`); the shared pass body was extracted into a private `passPly`
helper taking the reason, `applyPassGuard` now calls it with
`"no-legal-action"`, and exported `applyOutOfTimePass` calls it with
`"out-of-time"` after checking the game is not over and the side to move is
out of time, then runs `applyPassGuard` on the result and returns both
effects in order. Added the plan's five `ply.test.ts` cases (full end-of-turn
sequence with a genuine legal action still available; refused with time
left; refused once the game is over; both effects in order) plus an
`outOfTime` option on the file's `buildState` helper to set it up. One
deviation beyond the plan's explicit file list: making `reason` required
broke every other hand-built `PassEffect` literal in the repo
(`src/board/announcements.test.ts`, `src/board/EnergyOverlay.test.tsx`,
`src/game/session.test.ts`), which construct pre-existing "no legal action"
fixtures — added `reason: "no-legal-action"` to each, mechanically, with no
change to any assertion's wording, since those files' own wording/behaviour
work is assigned to Steps 7 and 8. `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` (50 files, 856 tests) all pass, with
`fullGame.test.ts` and `seededReplay.test.ts` unmoved.

Implement §5's second reason for a turn to pass, reusing the machinery that is
already there (**D5**, **D6**).

In `src/rules/ply.ts`:

- `PassEffect` gains a **reason**: no legal action, or out of time. Every
  existing producer sets it to "no legal action"; nothing else about the effect
  changes.
- Extract the body of `applyPassGuard` — run the end-of-turn sequence, advance
  the ply, swap the side to move, reset the action count, clear
  `actedThisPly`, build the effect — into a private helper that takes the
  reason. `applyPassGuard` keeps its two guards (game over first, then "has a
  legal action") and calls the helper. Its behaviour is unchanged.
- Add exported `applyOutOfTimePass(state)`. It **refuses** — returning the state
  untouched and no effects — unless the game is not over **and** the side to
  move is out of time. Otherwise it passes the turn with reason "out of time",
  then runs `applyPassGuard` on the result exactly as `applyMove` and
  `applyAttack` do, so the side passed to never sits with no legal action. It
  returns the resulting state and the pass effects in order: the out-of-time
  pass, then a following no-legal-action pass if the guard fired.

Return the effects as a list, with an **empty list meaning nothing happened** —
the same "nothing to report" convention `applyPassGuard`'s `undefined` effect
uses.

Document on the function that the refusal is deliberate and load-bearing: it is
what stops this becoming a voluntary pass (settled decision 2).

Add cases to `src/rules/ply.test.ts`: a pass for no legal action carries the
"no legal action" reason; an out-of-time pass runs the whole end-of-turn
sequence (assert through the effects it reports — power, energy, drain, charge
draw, pressure, recovery — the way the existing pass cases do), advances the
ply, swaps the side to move and clears the acted marks; it is refused when the
side to move still has time; it is refused when the game is already over; and a
pass into a side with no legal action reports both effects, in order.

Depends on: Steps 1 (§5, §10) and 5 (the flag it reads).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` pass, with the new `ply.test.ts` cases green and every
existing pass case still green.

---

## Step 7 — The wording: an out-of-time pass, and a game that ends on time

Status: committed

Notes: Added a `passOpeningClause` helper in `src/board/announcements.ts`
that chooses "Green has no legal action, so the turn passes." or "Green is
out of time, so the turn passes." from `PassEffect.reason`, used by
`passSentenceClauses` in both places it already ran (the plain pass sentence
and the chained pass after an action). `gameOverClause` now words its ending
from whether the plies actually ran out (`state.plyNumber` vs.
`pliesForGameLength(state.lengthInRounds)`, imported from `gameLength.ts`),
substituting "The game is over: both players are out of time." when the game
ended early on the clock, per the owner's plan-gate approval; the result
sentence after it is unchanged. Added two `announcements.test.ts` cases: an
out-of-time pass sentence, and the game-over clause worded for a
both-out-of-time ending ahead of the last round (via a `stateAt` helper
extended with an optional `outOfTime` field, default both false, so existing
callers are unaffected). No deviation from the plan.

In `src/board/announcements.ts`:

- The pass sentence's first clause is chosen by the effect's reason: the
  existing "Green has no legal action, so the turn passes." for one, and an
  honest "Green is out of time, so the turn passes." for the other. **Nothing
  else about the sentence changes** — the end-of-turn clauses and the
  whose-turn-is-next tail (including the game-over substitution) are untouched.
- The game-over clause currently reads "The game is over after 30 rounds." —
  which is false for a game that ended early on time. When the game ended
  because both players are out of time (that is, the plies have **not** run
  out), word it for that instead — that the game is over with both players out
  of time — and keep the result sentence after it exactly as it is. This is a
  live-region clause, not the game-over panel: the panel's wording does not
  change (settled decision 3).

Player-facing vocabulary throughout: "turn", never "ply".

Update `src/board/announcements.test.ts`: existing pass cases keep their
wording with the no-legal-action reason; new cases cover the out-of-time
wording, and the game-over clause both ways (rounds run out, and both players
out of time).

Depends on: Step 6 (the reason field and the two-flag ending).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` pass, with the new announcement cases green.

---

## Step 8 — The two session intents

Status: committed

Notes: Added `clock-expired` (`{ side }`) and `pass-out-of-time` (no payload)
to `SessionIntent`, and two branches in `sessionReducer` ahead of the
`isGameOver` activation guard: `clock-expired` calls `markOutOfTime` and
returns the same session object when it is a no-op; `pass-out-of-time` calls
`applyOutOfTimePass`, returns the session unchanged when it reports no
effects, and otherwise clears the selection and records the **last** effect
as `lastEvent` (D7). Added a `outOfTime` option to `session.test.ts`'s
`buildState` helper and the five cases the plan lists (plus a sixth: the
expiry-marking case itself, split from the idempotence case for clarity). No
deviation from the plan.

In `src/game/session.ts`, add exactly two intents to `SessionIntent` and
nothing else (**D4**, **D5**):

- **A clock ran out**, naming the side. The reducer records the flag through
  `markOutOfTime`. It is **idempotent**: the same side running out twice is not
  an error, it is a no-op, and the reducer returns the **same session object**
  in that case so React's `useReducer` bails out of the render. It sets no
  `lastEvent`: nothing is announced when a clock expires (the pass that follows
  is what gets announced).
- **The side to move passes because they are out of time**, carrying no
  payload. The reducer calls `applyOutOfTimePass`. If it reports no effects —
  the side still has time, or the game is over — the reducer returns the
  session unchanged; a refused pass is a programming error the app never makes,
  not a player-facing rejection, so it produces no rejection event (a rejection
  event would need a square, and there is none). Otherwise the reducer takes the
  new state, clears any selection, and records the **last** pass effect as
  `lastEvent` (**D7**).

Neither intent goes anywhere near `startingGameState` or the seed.

Add cases to `src/game/session.test.ts`: the expiry intent sets the flag and is
idempotent (same object back the second time); both sides expiring makes the
session's game over, after which an activation is rejected with the existing
game-over reason; the pass intent advances the ply and records a pass event
with the out-of-time reason; the pass intent is a no-op for a side with time
left; and a selection is cleared by the pass.

Depends on: Steps 5, 6 and 7.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` pass, with the new session cases green.

---

## Step 9 — The clock reading formatter

Status: committed

Notes: Added `src/clock/clockReading.ts` exporting `formatClockReading` and
the named threshold `CLOCK_READING_TENTHS_THRESHOLD_MS` (15 000 ms), and
`src/clock/clockReading.test.ts` with the exact boundary cases from the plan
(including the 179 000/178 999 and 15 000/14 999 handovers) plus the story's
example budgets. Implemented with integer millisecond arithmetic throughout
(`Math.ceil` on whole seconds or on tenths counted as integers, never on a
divided float compared for equality) specifically to avoid floating-point
rounding noise at the boundaries the story is exact about. No deviation from
the plan.

Add `src/clock/clockReading.ts`: one exported pure function turning a remaining
duration in milliseconds into the text the region shows, plus the named
threshold it switches at. No React, no timers, no state (**D13**).

The rule, exactly:

- an infinite remaining time reads `INF`;
- above 15 000 ms: `m:ss`, total seconds rounded **up**, minutes unpadded and
  seconds two digits (`3:00`, `0:16`, `10:00`);
- 15 000 ms and below: seconds and tenths with no minutes, rounded **up** to
  the tenth (`15.0`, `14.9`, `0.1`);
- zero or below: `0.0`.

Add `src/clock/clockReading.test.ts` with the boundaries as its cases — this is
where the rounding rule is proved:

- `INF` for an infinite duration;
- 180 000 → `3:00`; 179 400 → `3:00`; **179 000 → `2:59`**; 178 999 → `2:59`;
- 15 001 → `0:16`; **15 000 → `15.0`** (the handover is continuous: no gap, no
  repeated reading);
- 14 999 → `15.0`; 14 900 → `14.9`; 100 → `0.1`; 1 → `0.1`; 0 → `0.0`; a
  negative value → `0.0`;
- a ninety-round 6s budget (540 000) → `9:00`, and a thirty-round 2s budget
  (60 000) → `1:00`.

Depends on: Step 1 (§10 is what is being displayed). Independent of every other
code step.

Verification (automated): `npm test` passes with the new file's cases green;
`npm run typecheck`, `npm run lint`, `npm run format:check` pass.

---

## Step 10 — `useGameClock`: ticking, expiry and the paced pass

Status: committed

Notes: Added `src/clock/useGameClock.ts` (`useGameClock`, `GameClockReading`)
exactly to the plan's shape: budget from `startingBudgetMs(state.lengthInRounds,
setting)` (D17); refs for spent-per-side, the running side and its start
timestamp; a handover effect keyed on the derived `runningSide` that commits
elapsed time only when the running side actually changes (guards itself
against a redundant re-invocation with the same value, so nothing is ever
committed from a cleanup — the double-charge StrictMode risk the step warns
about); a 100 ms tick interval that repaints via a local `useState` counter
and dispatches `clock-expired` once the real remaining time reaches zero and
the state does not already record it; and a pass effect that arms a
1000 ms timeout dispatching `pass-out-of-time` while the side to move is out
of time and the game is not over, re-arming on every state change and
clearing on cleanup. Remaining time itself is a pure function of the refs and
`performance.now()`, computed fresh on every render via a small
`remainingMsForSide` helper — never accumulated. With `setting === "none"`
`runningSide` is always `undefined`, so neither effect ever starts a timer,
matching the plan without a separate special case. Confirmed
`vi.useFakeTimers()` also fakes `performance.now()` in this Vitest version (it
is included in the default `toFake` list when present), so no injectable
"now" source was needed — no deviation there. Added
`src/clock/useGameClock.test.tsx` (jsdom, fake timers) covering all eight
listed cases: initial mount/idle side untouched, ticking reduces only the
running side, handover freezes/starts the two sides, expiry dispatched
exactly once at the budget's real boundary, the paced pass firing after (not
before) 1000 ms and not repeating, a game-over state running and dispatching
nothing, a `"none"` setting reporting `INF`/nobody running/no dispatches, and
a large single time jump landing on the correct remaining value rather than
one derived from tick count. One test beyond the plan's list was added as a
belt-and-braces check that `isGameOver`'s plies-exhausted branch (not just
the both-out-of-time branch) also stops the clock. No deviation from the
plan. `npm run typecheck`, `npm run lint`, `npm run format:check` and
`npm test` (52 files, 888 tests) all pass, with `fullGame.test.ts` and
`seededReplay.test.ts` unmoved.

Add `src/clock/useGameClock.ts`: the hook that owns the running clock. It is
called from the clock region in Step 11, never from `App` (**D8**).

**What it takes**: the current game state, the chosen clock setting, and an
`onIntent` callback of the session's intent type (the same shape `Board` takes).

**What it returns**: the remaining milliseconds for each side, and which side's
clock is running (or none).

**How it works** (**D9**):

- The budget per side comes from `src/rules/clock.ts`'s budget function, given
  `state.lengthInRounds` — the state is the authority on the game's length
  (**D17**).
- It keeps, in refs, the milliseconds already **spent** per side, which side is
  running, and the `performance.now()` reading at which that side started.
- The side that **should** be running is the side to move while the game is in
  progress: not once `isGameOver(state)` is true, and not at all when the
  setting is "no clock". An effect notices when that changes, commits the
  elapsed time to the side that was running, and starts the new one.
- Remaining = budget − spent − (running ? now − startedAt : 0), clamped at
  zero. It is **computed on every render, never accumulated**.
- A **100 ms interval** runs while a side is running, and only causes a
  repaint. In the same callback, if the running side's remaining time has
  reached zero and the state does not already say so, it dispatches the
  clock-ran-out intent for that side. Expiry is judged on the real value, never
  the rounded reading.
- A separate effect implements the **paced pass** (**D12**): when the game is
  not over and the side to move is out of time, it waits a fixed delay — a
  named constant, one second — and then dispatches the out-of-time pass intent.
  It re-arms per ply and clears its timer on cleanup, so it fires at most once
  per turn.
- With the setting at "no clock" the hook starts **no interval and no timers**,
  dispatches nothing, and reports both sides as infinite with nobody running.

Two things a cold reader must get right:

- **Do not commit elapsed time in an effect cleanup.** The app runs under
  `StrictMode`, which mounts, unmounts and remounts effects in development; a
  cleanup that banked time would double-charge a player on every mount. Time is
  committed **only** when the running side actually changes.
- **Do not put the ticking value in a parent's state.** The whole point of the
  hook living below `App` is that a tick repaints the clock region alone
  (**D8**).

Add `src/clock/useGameClock.test.tsx` (jsdom, per `CONTRIBUTING.md`'s recipe)
using Vitest's fake timers, driving the hook with hand-built game states:

- green's clock starts running the moment the hook mounts with a game in
  progress; red's remaining does not move;
- advancing time reduces the running side's remaining and leaves the idle
  side's exactly where it was;
- re-rendering with the other side to move hands the clock over: the first
  side's remaining freezes at the value it had, the second's starts falling;
- when the running side's budget is exhausted, the clock-ran-out intent is
  dispatched for that side, within about a tenth of a second of the real
  moment, and exactly once;
- with the state then saying that side is out of time and it is their turn, the
  out-of-time pass intent is dispatched after the pacing delay — not before —
  and once per ply, not repeatedly;
- with the game over, nothing runs and nothing is dispatched;
- with the setting at "no clock", both remainings are infinite, nobody is
  running, and no intent is ever dispatched;
- a long jump in time (standing in for a backgrounded tab) leaves the reading
  correct — remaining reflects the whole elapsed span, not the number of ticks
  that ran.

Note for the implementer: the tests need `performance.now()` to advance with
the fake timers. Vitest's `vi.useFakeTimers()` fakes `performance` by default;
if it turns out not to in this version, configure `toFake` explicitly rather
than reaching for real time. Only if neither works, give the hook an optional
injectable "now" source defaulting to `performance.now`, and record the
deviation in the step's Notes.

Depends on: Steps 3 (the budget), 5 (the flag it reads), 8 (the intents it
dispatches).

Verification (automated): `npm test` passes with the new hook cases green;
`npm run typecheck`, `npm run lint`, `npm run format:check` pass.

---

## Step 11 — The clock region on screen

Status: committed

Notes: Added `src/clock/ClockRegion.tsx` (+ `ClockRegion.css`) with a local
`SideClock` component, and wired it into `App.tsx`/`App.css` in place of the
`RESERVED` placeholder (`.app__reserved` → `.app__clocks`, box unchanged).
One deliberate deviation from a literal reading of the plan, called out
explicitly by the owner ahead of this step: the side marked as **running**
is derived directly from `state.sideToMove` and `isGameOver(state)` inside
`ClockRegion`, not from `useGameClock`'s own `runningSide`. The hook reports
`runningSide: undefined` whenever `clockSetting` is `"none"` (D3 — it starts
no timers at all in that case), but the story and D14 require the side to
move to get "the same treatment whether the reading is counting down or
says `INF`", so a no-clock game still needs a running mark. The hook is
used only for the two `remainingMs` numbers; the marking is computed
independently. Each clock also carries its side's name (`Green`/`Red`,
`text-transform: uppercase` in CSS, matching `ScoreDisplay`'s own name
treatment) above the reading, per D14. Added `src/clock/ClockRegion.test.tsx`
(five cases: DOM order and labels, running/idle marking and its swap, the
no-clock INF-with-running-mark case above, a zero reading's flashing class,
and neither side marked once the game is over) and extended `App.test.tsx`
(renamed the region assertions from `app__reserved`/`RESERVED` to
`app__clocks`/two `INF` readings, and added a board-repaint-on-tick case
per D8, mocking `Board` with `vi.fn(actual.Board)` to count renders). The
board-repaint test needed `vi.useFakeTimers({ shouldAdvanceTime: true })`
rather than plain `vi.useFakeTimers()`: without `shouldAdvanceTime`,
`userEvent.click` never settles under fake timers in this environment (a
plain radio click alone reproduces the hang, unrelated to the clock code),
and `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` — the
alternative the testing-library docs also suggest — did not fix it either;
`shouldAdvanceTime: true` did. `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` (53 files, 894 tests) all pass.

Put both clocks in the third region, replacing `RESERVED` (**D14**).

`src/clock/ClockRegion.tsx` (+ `ClockRegion.css`), with the single-clock
display as a local component in the same file, the way `StartScreen.tsx` keeps
`OptionChoice`:

- Props: the game state, the clock setting, and `onIntent` — the same shape
  `Board` takes. It calls `useGameClock` and renders the two readings through
  `formatClockReading`.
- **Green first**, then red, in the order and orientation the HUD's score cells
  already use: side by side in portrait, stacked in landscape.
- Each clock carries its side's name above the reading — `GREEN` and `RED`, in
  the arcade face, the way `ScoreDisplay` labels its sides (**D14**).
- Each reading is drawn in its side's colour (`--color-green` /
  `--color-red`, as `ScoreDisplay` does), in the arcade face, with tabular
  figures and a fixed minimum width so the region does not shift as digits
  change.
- The **running** side is marked — full-strength colour with the digits' glow —
  and the idle one is quietened; the same treatment whether the reading is
  counting down or says `INF`. When nobody is running (game over, or the
  game-over swap pending) neither is marked.
- A reading at zero **flashes**, and goes on flashing for the rest of the game:
  a CSS animation on the zero state, with a `prefers-reduced-motion: reduce`
  block that swaps the flash for a steady, unmistakable treatment (there is
  precedent in `EnergyOverlay.css`).
- The readings are decorative text; nothing here is announced (**D18**).

`src/App.tsx`: replace `<div className="app__reserved">RESERVED</div>` with the
renamed region box holding `ClockRegion`, passing `session.state`, the clock
setting from `useAppScreen`, and `dispatch`. The region stays the **third**
child of `.app__screen`, after info and play.

`src/App.css`: rename `.app__reserved` to `.app__clocks` — in the rule itself,
in the landscape block that pairs it with `.app__info`, and in the comment at
the top of `.app__screen`. **Keep its box exactly as it is**: `flex: 0 0
var(--region-extent)` and full width in portrait, `width: var(--region-extent)`
in landscape, contents centred. It must not begin sizing itself from its
contents; that is what keeps the board centred. Replace the placeholder's
type-size rule with whatever the clocks need, keyed to fractions of
`--region-extent` in the same way `ScoreDisplay.css` keys its digits (portrait:
a `clamp()` on the window's width like the score digits; landscape: a fraction
of `--region-extent`).

Tests:

- `src/clock/ClockRegion.test.tsx` (jsdom): both readings render, each under
  its side's name, green before red in DOM order; the side to move is marked as running and the other is not;
  with no clock both read `INF` and neither counts; a side at zero carries the
  flashing state; with the game over neither is marked running.
- `src/App.test.tsx`: the three regions in DOM order are info, play and clocks
  — update the class name and drop the `RESERVED` text assertions, asserting
  the region holds two readings instead. Update the "no in-game regions on the
  start screen" case for the renamed class.
- One case pinning **D8**: a clock tick must not re-render the board. Wrap
  `Board` with a render counter (a `vi.mock` of `src/board/Board` that
  delegates to the real component and counts calls), render `App`, start a game
  with a clock, advance the fake timers by about a second, and assert the clock
  reading changed while the board's render count did not. Configure
  `userEvent.setup({ advanceTimers: ... })` so clicking PLAY works under fake
  timers.

Depends on: Steps 4 (the option is chosen), 9 (the formatter) and 10 (the
hook).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` pass, with the new region cases and the board-repaint
case green. `grep -rn "app__reserved\|RESERVED" src/` returns nothing. The
region's appearance is checked by hand in Step 12.

---

## Step 12 — GATE: the owner looks at the options and the clocks

Status: committed

No code. The owner runs the app and confirms what the clock looks like and
reads. This is a pause point for the pipeline.

Run `npm run dev` in the dev container and open the app. Confirm:

1. **The start screen shows three option groups in the order Ships, Rounds,
   Timer.** Ships reads 7, 6, 5; Rounds reads 30, 45, 60, 90; Timer reads None,
   6s, 4s, 2s. In each group the **leftmost** choice is the one selected when
   the screen first appears.
2. **PLAY without touching anything** starts a seven-ship, thirty-round game
   with no clock, and both readings say **INF** for the whole game.
3. **The budgets are right**: a thirty-round game at 6s a turn starts both
   clocks at **3:00**; the same game at 2s starts them at **1:00**; a
   ninety-round game at 6s starts them at **9:00**.
4. **Green's clock starts counting the moment the board appears** — there is no
   free first turn. Red's does not move until green's first turn ends, and
   green's stops at the same instant.
5. **The running side is marked** and the idle one is not, and the marking
   swaps with the turn — including in a no-clock game, where both read `INF`.
6. **The reading changes from 3:00 to 2:59 as the remaining time crosses
   exactly 2:59** — not at 2:59.5, and not at 2:58.
7. **The format switches cleanly at fifteen seconds**: `m:ss` above it,
   seconds-and-tenths at and below it, with no gap or repeated reading across
   the handover, down to `0.0`.
8. **The board stays exactly centred** with the clock region in place, in both
   portrait and landscape, at the window sizes story 39's layout covers, and
   the region does not grow or shrink as the readings change width.
9. **The board does not repaint on a tick** — with React DevTools' "highlight
   updates" on, a ticking clock lights up the clock region and nothing else.
10. **A backgrounded tab neither gains nor loses time**: switch away for a
    minute and back, and the reading is what wall time says it should be.

Depends on: Steps 1 to 11.

Verification (manual): the owner confirms each of the ten observations in the
running app and reports anything that reads wrong or looks wrong. `npm test`,
`npm run typecheck`, `npm run lint` and `npm run format:check` are green before
the gate opens.

---

## Step 13 — The clock option's wording

Status: committed

Notes: Changed the third fieldset's legend from `Timer` to
`Clock (time per move)` and the `"none"` setting's label in
`CLOCK_SETTING_LABELS` from `None` to `Unlimited`, both inline in
`src/start/StartScreen.tsx`, per D16 (the rules module is untouched).
Updated `src/start/StartScreen.test.tsx` (its own mirrored
`CLOCK_SETTING_LABELS`, the group-name query, and the two test
descriptions naming "timer") and `src/App.test.tsx`'s opening-screen
assertion to query by the new accessible names rather than loosening the
queries. `rules.md` and `RULES_VERSION` were not touched, as the step
specifies. No deviation from the plan.

Owner feedback from the Step 12 gate, where the functionality was confirmed
correct. Two strings on the start screen, and nothing else:

- The third group's legend becomes **`Clock (time per move)`** instead of
  `Timer`. Sentence case, matching `Ships` and `Rounds` above it.
- The `"none"` setting's label becomes **`Unlimited`** instead of `None`.

Both live in `src/start/StartScreen.tsx` — the legend inline, the label in
`CLOCK_SETTING_LABELS` (**D16**: the labels are start-screen chrome and stay
out of `src/rules/clock.ts`, which holds numbers, not player-facing strings).
The setting's own value is still `"none"`; only what a player reads changes.

`rules.md` is **not** touched. Section 10 says "no clock, or 6, 4 or 2 seconds
a turn", which is true of the game however the start screen words the choice,
and the ruleset does not describe the app's chrome. No version bump.

Tests to update: `src/start/StartScreen.test.tsx` and `src/App.test.tsx` both
query the third group and its first choice by their accessible names, which
these two strings are. Update them to the new wording rather than loosening
the queries — naming the string is the point of the assertion.

Depends on: Step 4 (the option group) and Step 12 (the gate that asked for
this).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint`,
`npm run format:check` pass. `grep -rn "\"Timer\"\|>Timer<" src/` returns
nothing. The wording is confirmed by eye at the Step 14 gate.

---

## Step 14 — GATE: the owner plays a game out of time

Status: committed

No code. The owner exercises what happens when a clock runs out. A thirty-round
game at **2s a turn** gives each player a one-minute budget, which is the quick
way to reach every case here.

Confirm, in the running app:

1. **A clock that reaches zero reads `0.0` and flashes**, and goes on flashing
   for the rest of the game.
2. **A player out of time passes their turn**: the round counter advances, the
   end-of-turn sequence runs in full for them — power, energy, drain, the
   charge draw, pressure, recovery — and the announcement says they are **out
   of time**, not that they had no legal action.
3. **The passes are paced** so each reads as its own turn, rather than several
   rounds resolving in one repaint.
4. **The out-of-time player goes on passing every turn** for the rest of the
   game, and **their opponent goes on taking ordinary turns and scoring
   energy**, with their own clock still counting only on their own turns.
5. **When the second clock reaches zero the game ends immediately** — the
   game-over panel appears at that round, not at the game's nominal last round
   — and the winner is whoever has the most energy, a draw being a draw.
6. **A game with no clock never passes for time and never ends early.**
7. **Returning to the start screen after a game leaves all three options set
   the way that game was played**, and pressing PLAY again starts fresh clocks
   at full.
8. **Nothing on screen contradicts `doc/ruleset/rules.md` at 0.19.**

Depends on: Steps 1 to 13.

Verification (manual): the owner confirms each of the eight observations and
reports anything that reads wrong, looks wrong, or contradicts the ruleset at
0.19.

---

## Step 15 — `README.md`, the accessibility ledger, and a final sweep

Status: pending

`README.md` describes the game for players and now understates it: the status
paragraph names two options and the old lengths.

Run `/update-readme` (`.claude/commands/update-readme.md`) to review the branch
diff and update `README.md`. Whatever it produces, the result must say, in the
paragraph's existing voice and without lengthening it much:

- the start screen now offers **three** choices — how many ships a side (seven,
  six or five, seven to start), how many rounds (thirty, forty-five, sixty or
  ninety, thirty to start) and a **clock** (none, or six, four or two seconds a
  turn, none to start);
- each player's clock is their seconds a turn across the whole game — thirty
  rounds at six seconds a turn is three minutes each — spent however they like;
- a player who runs out of time passes every turn from then on, and the game
  ends the moment **both** players have run out; running out is not a loss,
  since energy still decides the game.

Do not restate section 10 in full: the README is a tour, not a rules summary.

Add a section for this story to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, in the file's
existing style (a heading naming the story, the source, then one numbered item
each with what was lost and where), recording the three costs from **D18**: the
clock readings are not announced; there is no warning that time is running
short; and when an out-of-time pass is immediately followed by a
no-legal-action pass, only the second is spoken. Note that the out-of-time pass
itself **is** announced.

Then sweep the repository for anything still describing the old state of
affairs: `grep -rn "RESERVED\|app__reserved" src/ README.md` should return
nothing, and `grep -rn "fifty\|seventy-five\|a hundred" README.md` should turn
up nothing about game lengths. Do **not** edit `doc/plan/**` or
`doc/ruleset/changelog.md`'s pre-0.19 entries: those describe the app as it
was.

Depends on: Steps 1 to 14.

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` all pass. The two greps above return nothing. A
read-through of `README.md` confirms the status paragraph names three options,
the new lengths and the clock, and that no sentence still says the game offers
two choices.

---

## Follow-on work (not this story)

- **Recording and replaying a timed game.** Recording is not built yet. When it
  is, a timed game will need its clock events — each side's expiry, and each
  out-of-time pass — recorded, because they change the game state without an
  action and cannot be re-derived from the seed. Nothing is built for that
  here.
- **The accessibility repairs** listed in Step 15 belong to the eventual
  accessibility story, not to this one.
- **Retuning the numbers.** 6/4/2 seconds a turn and 30/45/60/90 rounds are
  first guesses (settled decision 8), as is the one-second pacing delay
  (**D12**).
