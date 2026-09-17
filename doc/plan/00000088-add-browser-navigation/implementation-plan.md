# Implementation Plan — Story 00000088, Back goes back

## What this story does

The app swaps three screens in and out of one page — the main menu, the Quick
Guide, a game in progress — and the browser knows nothing about any of it.
`useAppScreen` holds `screen: "start" | "game" | "guide"` in React state, and
that state is the only thing that decides what is on screen. So **Back** does
not leave the Quick Guide, it leaves the app; and **Back** during a game does
the same, silently, mid-turn.

This story gives each screen an address in the page's hash, makes **the hash
the one answer to what is on screen**, and makes backing out of a live game
ask first. Nothing about how the game is played changes: `rules.md` is not
edited and `RULES_VERSION` is not bumped.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions and the rejected alternatives, because code in this
repository deliberately carries no design history (`CONTRIBUTING.md`,
"Comments").

## Baseline on this branch

Branch `feat/88-add-browser-navigation`, clean at the start of planning
(`story.md` already committed).

- `npm test` — **66 test files, 1293 tests, all green**.
- `npm run typecheck` and `npm run lint` — clean.
- `npm run format:check` — **two pre-existing warnings**:
  `doc/plan/00000069-retire-actions/story.md` and `src/board/planetArt.ts`.
  Neither is this story's to fix and neither must be "tidied" in passing.
  (This story's own `story.md` and this `implementation-plan.md` were formatted
  by the orchestrator before Step 1, so both are clean and must stay that way.)

The test count will **rise** over this story. No step may lower it.

## What exists today (established during planning — do not rediscover)

- `src/useAppScreen.ts` — the app's front door. Holds `screen` plus the six
  start-screen options, and three actions: `handlePlay` (dispatches `new-game`
  with a fresh seed, then `setScreen("game")`), `handleReturnToStart`
  (`setScreen("start")`), `handleOpenGuide` (`setScreen("guide")`). It also
  defines and exports `export type Screen = "start" | "game" | "guide"`, which
  **nothing else in `src/` imports**.
- `src/App.tsx` — renders on `screen`: `StartScreen`, else `GuideScreen`, else
  the `GameOverPanel` when `gameOver`, else the three in-game regions. It
  computes `const gameOver = isGameOver(session.state) && settled;` where
  `settled` comes from `useDisplayedEnergy`. The current hook order is
  `useReducer` → `useAppScreen(dispatch)` → `useDisplayedEnergy`.
- `src/guide/GuideScreen.tsx` takes `onBack`, `src/hud/GameOverPanel.tsx` takes
  `onReturnToStart`, `src/start/StartScreen.tsx` takes `onPlay` and
  `onOpenGuide`. All three are wired to the `useAppScreen` actions above. **No
  component's props change in this story.**
- There is **no router and no history use at all**: no `pushState`, `popstate`,
  `hashchange` or `location` anywhere in `src/`.
- Nothing is persisted — no `localStorage`, `sessionStorage`, cookie or
  IndexedDB.
- `src/clock/useGameClock.ts` keeps each side's **spent time in refs**
  (`spentRef`, `startedAtRef`) and is called from `ClockRegion`, which lives
  **inside the game screen's subtree**. Unmounting the game screen therefore
  resets both clocks to full. This fact drives decision **D5** below and must
  not be forgotten.
- Tests: `src/useAppScreen.test.tsx` (jsdom `renderHook`) and
  `src/App.test.tsx` (jsdom, Testing Library + `user-event` + axe). Component
  tests opt into jsdom per file with a `// @vitest-environment jsdom` docblock
  on the **first** line and call `afterEach(cleanup)` (`CONTRIBUTING.md`).
- Lint has no `no-alert` rule and no restriction on `window`, `history`,
  `location` or `confirm`; `globals.browser` is configured, so all four are
  known globals.

## Vocabulary for this plan

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say (`CLAUDE.md`). No ply logic is touched here.
- **Screen** — one of the three things the app shows: `"start"` (the main
  menu), `"guide"` (the Quick Guide), `"game"`.
- **Address** — the page's hash: `""` for the main menu, `"#how-to-play"` for
  the Quick Guide, `"#game"` for a game.
- **A game to show** — PLAY has dealt a game and the player has not left it.
  Tracked by the plan's `hasGame` flag (D4).
- **A game in progress** — a game to show that is not over: `hasGame &&
!gameOver`, where `gameOver` is exactly the condition `App.tsx` already
  computes to swap in the game-over panel (`isGameOver(session.state) &&
settled`). **Both prompts in this story guard a game in progress, never the
  `#game` address.**
- **Traversal** — the player moving through session history: Back, Forward, a
  history menu jump, or editing the hash in the address bar. Reaches the app as
  a `popstate` and/or `hashchange` event.

## Settled decisions — do not reopen

These come from `story.md` and the owner's decisions around it. A step that
finds one inconvenient escalates to the owner rather than re-deciding.

- **S1. A hash, not a path.** Main menu = the page's own URL (no hash), Quick
  Guide = `#how-to-play`, game = `#game`. Builds are handed out from per-version
  subfolders with Vite `base: "./"` (story 51), so nothing may assume it is
  served from the site root; a hash needs no host configuration at any depth.
  Do not introduce path-based routing, and do not build a root-absolute URL
  anywhere (`CONTRIBUTING.md`, "Architecture constraints").
- **S2. The hash is the single source of truth for which screen shows** — not a
  second copy of that decision kept alongside React state. In-app navigation
  drives the browser and lets the screen follow: the Quick Guide button adds a
  history entry, the guide's own Back button goes back **through the browser**,
  PLAY adds an entry. The URL and the screen cannot disagree, whichever of the
  two the player used.
- **S3. Backing out of a live game asks for confirmation, once.** Cancelling
  leaves the game untouched, on the same turn, with nothing moved and the clock
  where it was. Confirming abandons the game: there is no second copy and no
  route back in. PLAY is the only way back into play.
- **S4. One unifying rule, not three special cases.** `#game` shows a game only
  while there is a game to show, and otherwise **quietly means the main menu,
  correcting the address bar on its way**. That single rule covers a Forward
  press after abandoning, a mid-game reload, and a cold load of `#game`. Keep
  the unification; do not solve the three separately, and do not try to delete
  or truncate history entries to "clean up" (the History API cannot do that
  anyway).
- **S5. Closing or reloading the tab during a game prompts through the standard
  browser "leave this page" mechanism.** The two prompts will not read
  identically, because the platform will not let a page word the close/reload
  one. That mismatch is accepted by the story. The platform also shows no such
  prompt at all until the player has interacted with the page — a game in
  progress has been interacted with by definition.
- **S6. A finished game prompts for nothing.** Back from the game-over panel
  and the panel's own return-to-menu button both go straight to the main menu,
  and closing the tab on it is silent.
- **S7. No rules change.** `rules.md` is not edited, `RULES_VERSION` is not
  bumped, no `changelog.md` entry. There is therefore **no rules step in this
  plan**, which is a deliberate reading of the story, not an omission.
- **S8. Nothing visible changes.** No new control, no banner, no styled dialog
  — the in-app confirmation is a plain `window.confirm`. No CSS in this story.
- **S9. Nothing is persisted.** A reload still starts from nothing; this story
  adds no storage. That is the condition S4 is honest about rather than the one
  it fixes.
- **S10. No new dependency.** No router package (D12 records why), no history
  library.
- **S11. Focus and announcement on a Back/Forward-driven screen change are out
  of scope.** Per `CLAUDE.md`'s pre-release accessibility stance that cost is
  accepted and recorded in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md` (Step 4). **Add
  no accessibility test steps.**
- **S12. No review fixtures and no manual test scripts.** The owner drives the
  manual testing himself; the one manual step says what to look at in
  `npm run dev`. Manual verification never asks the owner to check live-region
  wording — the automated suite covers that.
- **S13. The options survive the trip**, exactly as today: fleet size, charged
  nodes, combat, scoring, length and the clock are still held across a visit to
  the guide and across a finished game.

## Decisions this plan makes

### D1. A new `src/nav/` folder with three modules, and `useAppScreen` composes them

| Module                            | Kind             | Responsibility                                                                                                                             |
| --------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/nav/screenAddress.ts`        | pure, no DOM     | The address vocabulary: the `Screen` type, the two hash constants, both mappings, and the in-app prompt sentence.                          |
| `src/nav/browserAddress.ts`       | platform wrapper | The only place in `src/` that touches `window.location` and `window.history`: read the hash, push, replace, go back, subscribe to changes. |
| `src/nav/useScreenAddress.ts`     | React hook       | Which screen is showing, the three navigation actions, `hasGame`, the address correction, and the abandon prompt.                          |
| `src/nav/useLeaveConfirmation.ts` | React hook       | The `beforeunload` guard, enabled while a game is in progress.                                                                             |

`useAppScreen` keeps the options and the three action **names** the components
already take (`handlePlay`, `handleOpenGuide`, `handleReturnToStart`), and
delegates the navigation to `useScreenAddress`. No component's props change.

Why the split rather than putting it all in `useAppScreen`: the mapping is pure
and deserves plain unit tests (`CONTRIBUTING.md` prefers logic out of
components); the platform calls want one wrapper so that tests, and any future
reader, have a single place where the History API is used; and the folder
matches the repository's feature-folder layout (`board`, `clock`, `game`,
`guide`, `hud`, `rules`, `ships`, `start`).

### D2. The address vocabulary, and how an address that names nothing is read

`""` → `"start"`, `"#how-to-play"` → `"guide"`, `"#game"` → `"game"`, and
**anything else → `"start"`**. Matching is exact (`#Game` is not `#game`); an
unrecognised hash is not an error and produces no message — it quietly means
the main menu, the same way S4 has `#game` quietly mean the main menu when
there is nothing to show.

The mapping back (`hashForScreen`) is total and is what the correction rule in
D3 compares against, so the address bar is corrected for an unknown hash by the
same code path that corrects `#game`. That generality is the point: one rule,
"the address always ends up naming the screen that is showing", satisfies the
story's "the address bar matches the screen after every one of those" without a
list of cases.

### D3. The screen is derived from the address on every render, never stored

`useScreenAddress` reads the live hash with React's `useSyncExternalStore`:
`subscribe` is the wrapper's subscription (D6), the snapshot is
`window.location.hash` (a string, so React's snapshot comparison is by value
and needs no caching). The screen is then:

1. `addressScreen = screenFromHash(hash)`;
2. if `addressScreen === "game"` and there is no game to show, the screen is
   `"start"` instead (S4's degrade).

There is **no `useState` holding the screen**. Rejected: keeping the screen in
React state and mirroring it into the hash — that is exactly the "second copy
of that decision" S2 rules out, and it is the version that can disagree with
the address bar. Rejected: storing the screen in `history.state` — the hash is
already the address the story specifies, and a second record of the same fact
in `history.state` could survive a reload while contradicting the hash.

The degrade in point 2 is a **pure function of the address and whether a game
exists**, computed during render, so the menu is on screen from the first paint
in the reload/cold-load/Forward cases; correcting the address bar is a separate
effect (D4) and never something the player waits for.

### D4. `hasGame` lives in the nav hook, and the address correction is an effect

`useScreenAddress` owns one piece of state: `hasGame` — "there is a game to
show". It is set when PLAY deals a game, and cleared by an effect as soon as the
derived screen is no longer `"game"` — which is the same moment for an abandoned
game and for a finished one the player has left. Once cleared, S4 does the rest:
a later `#game` address shows the menu.

That effect does two idempotent things after every render:

1. if there is a game to show but the derived screen is not `"game"`, clear
   `hasGame`;
2. if the current hash is not `hashForScreen(screen)`, **replace** it (never
   push) so the address names the screen showing.

`replaceState` only, never `pushState`, in any effect: React's `StrictMode`
runs effects twice in development, and a push there would double an entry.
Replaces are idempotent, so the double run is invisible.

Why `hasGame` is app state and not derived from the session: `App` builds a real
starting session at mount (`createStartingSession`) that is never shown, so
"there is a game" is not readable from `session.state`. Rejected: adding a
"dealt" flag to `GameState` or the session reducer — that is a rules-layer
change for an app-level concern, and it would touch the 20-odd test files that
build game-state literals. Rejected: treating "the hash says `#game`" as
sufficient — that is precisely the bug S4 exists to prevent.

Why `hasGame` lives in the nav hook rather than in `useAppScreen`: the flag only
exists to give `#game` its meaning, and the actions that change it (PLAY,
leaving) are navigation actions. Keeping it beside them means the whole
"which screen, and is `#game` honest" decision is in one module.

### D5. The abandon prompt runs inside the traversal handler, not in a render effect

A traversal cannot be cancelled: by the time `popstate` fires, the address has
already changed. So the guard has to run **inside the event handler**, ask, and
put the address back if the player says no.

It must not be done as "render the menu, then ask, then go back if refused".
`ClockRegion` lives inside the game screen's subtree and its `useGameClock`
keeps each side's spent time in **refs** (see "What exists today"), so
unmounting the game screen for even one commit resets both clocks to full and
loses the board's selection. S3 requires the cancelled game to be "on the same
turn … with the clock where it was", so the player must never see the menu at
all.

This works because JavaScript is single-threaded: `window.confirm` blocks the
task it is called in, React cannot render in the middle of an event dispatch,
and the decline path puts the address back **synchronously** (D7). Even if
`useSyncExternalStore`'s own listener is notified first, React re-reads the
snapshot when it renders, by which time the hash is `#game` again — so the
screen never changes and nothing unmounts. Note the corollary: the decline path
must stay synchronous. Do not make it `await` anything.

The handler listens to **both** `popstate` and `hashchange`, through one
function, because a fragment navigation and a traversal do not fire the same
pair of events in every browser (jsdom fires both when `location.hash` is
assigned; browsers vary). The handler is idempotent — it re-reads the live hash
— so being called twice for one change is harmless.

The listener is registered by an effect whose dependency is "a game is in
progress", so it exists exactly while it can fire (S6: nothing is registered
once the game is over).

### D6. The wrapper notifies its own subscribers, because `pushState` fires nothing

`history.pushState` and `history.replaceState` fire **no** event — confirmed in
jsdom during planning, and it is what the HTML specification says. So
`browserAddress.ts` keeps its own set of listeners: `subscribeToAddress` adds
one (and attaches `popstate`/`hashchange` listeners), and `pushHash`/
`replaceHash` notify them after changing the address. That is what lets
`useSyncExternalStore` see an in-app navigation.

Rejected: dispatching a synthetic `popstate` after a push. It would also reach
the abandon guard (D5), which is listening for exactly that event, and a guard
that can be tripped by the app's own navigation is a trap for the next reader.

### D7. Declining restores the address with a push, not with `history.forward()`

On decline, the guard calls `pushHash("#game")`. Two reasons, both load-bearing:

- **It is synchronous**, which is what D5 needs. `history.back()` and
  `history.forward()` are asynchronous — measured in jsdom during planning, the
  `popstate` from a `back()` landed two macrotask ticks later — so a
  `forward()` here would let React render the menu in between, unmount the game
  screen, and reset the clocks.
- **It leaves history in exactly the shape it had before the Back press.**
  Pushing while there is a forward entry discards that entry, so `[menu,
#game]` → Back → `[menu*, #game]` → push → `[menu, #game*]`. No duplicate
  `#game` entry is left behind, so the next Back press prompts again instead of
  appearing to do nothing.

Rejected: `history.forward()` (asynchronous, and it only moves one entry, so a
multi-entry history-menu jump would land somewhere unintended). Rejected:
prompting on `beforeunload` only and letting Back through silently — the story
requires the in-app prompt.

### D8. Leaving a screen by an in-app button always goes back

S2 says the guide's Back button _is_ the browser's. So `leaveToStart()` calls
`history.back()`, with no exception and no branch.

**Owner's decision, taken at the plan gate.** Planning proposed an exception for
the link the story asks for — `#how-to-play` handed to a play-tester and opened
in a fresh tab, where the guide is the session's first entry, so `history.back()`
either leaves the site or, in a brand new tab, does nothing at all. That
exception needed a marker written into each pushed entry's `history.state` plus a
predicate for reading it, so the button could replace rather than traverse when
the current entry was not the app's. **The owner chose not to have it**: the
machinery is not worth a case a tester can resolve by editing the URL, and its
absence keeps the wrapper down to push, replace, back and subscribe.

The consequence, accepted knowingly and not a defect to be "fixed" by a later
step: **on a cold-loaded `#how-to-play`, the guide's own Back button does
nothing** (or leaves the site, depending on how the tab was opened). Every
in-app route to the guide is unaffected, because there the menu entry is really
behind it. Step 5's manual pass still looks at a cold-loaded link, but it is
confirming the guide _opens_, not that its Back button leads anywhere.

Rejected, and still rejected: always pushing the menu address (an extra entry,
which the story's "no extra history entry left behind to press Back through
twice" forbids); always replacing (in the normal flow it leaves a second menu
entry, so the browser's Back then appears to do nothing); inferring from
`history.length` (unreliable — it counts entries from before the app loaded).

### D9. Where each of the story's flows is satisfied

Written out so no step has to re-derive it:

| Flow                                       | What happens                                                                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Quick Guide button                         | push `#how-to-play`; screen follows the hash.                                                                                    |
| Back on the guide                          | real `popstate`; hash `""`; screen follows. No prompt — no game.                                                                 |
| Forward from the menu to the guide         | real `popstate`; hash `#how-to-play`; screen follows.                                                                            |
| The guide's own Back button                | D8: `history.back()`, or replace when the guide was cold-loaded.                                                                 |
| PLAY                                       | dispatch `new-game`, set `hasGame`, push `#game`.                                                                                |
| Back during a game in progress             | D5 prompt. Decline → D7 push restores `#game`, nothing re-renders. Accept → screen follows to the menu, effect clears `hasGame`. |
| Forward after abandoning                   | hash `#game`, no game → screen is the menu (D3), effect replaces the hash with `""` (D4). No prompt: the guard is unregistered.  |
| Mid-game reload, or a cold load of `#game` | same as above, from a fresh mount.                                                                                               |
| Cold load of `#how-to-play`                | screen is the guide, address already correct.                                                                                    |
| Back from the game-over panel              | guard unregistered (game over), screen follows to the menu, `hasGame` cleared.                                                   |
| The panel's return-to-menu button          | D8, same as the guide's Back button.                                                                                             |
| Close or reload during a game in progress  | `beforeunload` is cancelled (D10) and the browser shows its own prompt.                                                          |
| Close or reload elsewhere                  | nothing registered, nothing prompts.                                                                                             |

### D10. The close/reload guard is its own hook, enabled by "a game in progress"

`useLeaveConfirmation(enabled)` registers a `beforeunload` listener while
`enabled`, and the listener calls `preventDefault()` on the event — the current
standard way to ask for the browser's own prompt. `useScreenAddress` calls it
with "a game in progress", so it is armed in exactly the same window as the
abandon prompt (S5, S6).

The wording cannot be set by the page and the prompt does not appear until the
player has interacted with the page; both are the platform's rules (S5). jsdom
shows no prompt either, so the automated test asserts the **event was
cancelled** (`dispatchEvent` returns `false`, `defaultPrevented` is `true`) and
the real prompt is the owner's eye in Step 5.

### D11. The in-app prompt's wording

One constant in `screenAddress.ts`, player-facing and plain (`CLAUDE.md`,
"Intended audience"):

> Leave this game? It will be lost.

A question, because the browser's confirm box offers OK and Cancel; short,
because the player is mid-turn. **This sentence is the owner's, chosen at the
plan gate** over planning's wordier draft ("Leave this game? The game in
progress will be lost.", which named the game twice). It may still be changed at
the Step 5 manual gate — if it is, update the constant and the test that asserts
it, and record it in that step's `Notes:`.

### D12. Considered and rejected: a router library

React Router is a major, well-maintained library and would be allowed by the
dependency policy. It is not used because this app has three addresses, no
nested routes, no route parameters, no data loading and no code splitting — the
whole mapping is one function over a hash — and because the part that is
actually hard here, prompting on a traversal the browser has already performed,
would still be hand-written: React Router's blocking APIs need its data router,
which would mean adopting the framework's shape for the whole app to gain
nothing this story needs. If the app later grows real routes (a game record
viewer, deep links into a position), this decision is worth revisiting; until
then the three small modules in D1 are the smaller, more legible thing (S10).

### D13. Test design against jsdom — read this before writing any test

All of the following was measured during planning, in this repository's jsdom
(v26) under Vitest. Getting these wrong produces confusing, order-dependent
failures.

1. **`history.back()`/`forward()` are asynchronous** and take more than one
   macrotask tick (the `popstate` landed on the second). Any test that presses
   an in-app Back must `await waitFor(...)` for the result. **This breaks an
   existing test**: `App.test.tsx`'s "opens the guide from Quick Guide, and
   returns to the start screen …" clicks Back and asserts synchronously; it
   must be updated (Step 3).
2. **Assigning `location.hash` fires both `popstate` and `hashchange`** in
   jsdom. The handler must be idempotent (it is — it re-reads the hash).
3. **`pushState`/`replaceState` fire nothing at all** (D6).
4. **`history.pushState(state, "", "")` does not clear the fragment** in jsdom —
   measured: `#game` survived. So the menu address must be built explicitly, as
   `location.pathname + location.search`, which was measured to work from a deep
   path with a query string. Never hard-code `"/"` (S1).
5. **`window.confirm` in jsdom is a stub** that logs "Not implemented" and
   returns `undefined` — i.e. cancel. Every test that crosses the abandon guard
   must `vi.spyOn(window, "confirm").mockReturnValue(true | false)` and assert
   on the spy.
6. **jsdom's `location` persists between tests in a file**, and the wrapper's
   listener set is module-level. Every test file that touches history must
   reset the address in `beforeEach` (and, to be kind to the next file,
   `afterEach`) with `history.replaceState(null, "", "/")`. Without this, a test
   that pushed `#how-to-play` makes the next test mount on the guide.
7. **Simulating a Back press deterministically**: prefer
   `history.replaceState(null, "", <target>)` followed by
   `window.dispatchEvent(new PopStateEvent("popstate"))`, inside `act(...)` —
   synchronous, no waiting. Use the **real** `history.back()` only where the
   traversal itself is the thing under test (the forward-entry truncation in
   Step 2), with `waitFor`.
8. **`beforeunload`**: `window.dispatchEvent(new Event("beforeunload", {
cancelable: true }))` returns `false` and the event's `defaultPrevented` is
   `true` when a listener prevents it. That is the assertion.
9. `history.length` is tracked by jsdom and is a usable assertion for "no extra
   entry was added".

### D14. What is **not** touched

- `doc/ruleset/rules.md`, `RULES_VERSION`, `doc/ruleset/changelog.md` (S7).
- The session reducer, `GameState`, the rules layer, the board, the HUD, the
  clock, the guide's copy and diagrams, the start screen — no file under
  `src/rules/`, `src/game/`, `src/board/`, `src/hud/`, `src/clock/`,
  `src/start/` changes. `GuideScreen.tsx` and `GameOverPanel.tsx` change only
  if their module header comments say something that has become untrue (both
  mention returning to the start screen; a header comment correction is in
  scope, their props are not).
- Any CSS, `index.html`, `vite.config.ts`, `package.json` (S8, S10).
- `seededReplay.test.ts` and every other rules-layer expectation: this story
  adds no draw to the seeded stream. If a recorded figure moves, **stop and
  escalate** — it means something changed the stream, which nothing here
  should.

## Step sequence at a glance

Planning produced nine steps; the owner asked for fewer, so the three pairs
that built and then immediately rewrote the same file — or that stood a
one-effect module up as a step of its own — are merged. Six steps, and the
manual gate is untouched: merging steps never merges a gate.

1. `src/nav/` — the pure address vocabulary and both mappings, plus the one
   wrapper over `location`/`history` with its own subscription.
2. `src/nav/useScreenAddress.ts` — the derived screen, the three navigation
   actions, `hasGame`, the address correction, and the abandon prompt.
3. `src/nav/useLeaveConfirmation.ts` — the close/reload guard — and the wiring:
   `useAppScreen` composes the nav hook, `App` passes `gameOver`, and the two
   existing test files are brought up to date.
4. End-to-end coverage of the story's flows, plus the accessibility ledger note.
5. The owner's manual pass, including a build served from a subfolder. **[gate]**
6. `README.md`.

---

### Step 1 — `src/nav/`: the address vocabulary and the History API wrapper

Status: committed

Notes: Done inline by the orchestrator rather than dispatched, per the owner's
direction that not every step needs an agent. Both modules and both test files
landed as specified. `Screen` moved out of `useAppScreen.ts` with no
re-export — nothing else imported it. 13 new tests; the suite went from 66
files / 1293 tests to 68 / 1306, typecheck and lint clean.

Depends on: nothing.

_Merged from planning's Steps 1 and 2 at the owner's direction: two small
modules, neither with any app behaviour of its own, arriving as one folder._

#### 1a — `screenAddress.ts`

Create `src/nav/screenAddress.ts`, a pure module that imports nothing from the
app (no DOM, no React):

- the `Screen` type — the union `"start" | "game" | "guide"` — **moved here**
  from `src/useAppScreen.ts`, which keeps working by importing the type instead
  of declaring it. Nothing else in `src/` imports `Screen` (checked during
  planning), so this is a two-line change to `useAppScreen.ts` and no
  behaviour change at all.
- the two hash constants, `"#how-to-play"` and `"#game"`, named so the call
  sites read as prose, plus a constant for the menu's empty hash.
- `screenFromHash` — exact matching, with **anything unrecognised reading as the
  main menu** (D2), including `""`, `"#"`, a wrong case and a hash the app has
  never issued.
- `hashForScreen` — total over the three screens, the inverse of the above on
  the three known addresses.
- the in-app confirmation sentence as a named constant, with D11's wording.

Write a module header comment saying what the module is for, in the style of
the existing modules (`CONTRIBUTING.md`, "Comments"): what the three addresses
are and that an unknown address reads as the main menu. **No design history in
the code** — the reasoning lives in this plan.

Verification (automated): a new `src/nav/screenAddress.test.ts` (no jsdom
docblock — the module has no DOM) covering: each of the three hashes mapping to
its screen; `""`, `"#"`, `"#nonsense"` and `"#GAME"` all mapping to `"start"`;
`hashForScreen` returning the exact three strings; and a round-trip over the
three screens. Then `npm test` (66+ files, all green, count risen),
`npm run typecheck` and `npm run lint` clean.

#### 1b — `browserAddress.ts`

Create `src/nav/browserAddress.ts` — the **only** module in `src/` that touches
`window.location` or `window.history`. It exposes, as plain functions (not a
class, not a hook):

- read the current hash;
- `subscribeToAddress(listener)`: registers the listener, attaching `popstate`
  and `hashchange` window listeners for the module's own use, and returns an
  unsubscribe function. All subscribers are notified on either event **and** on
  the module's own pushes and replaces (D6).
- push a hash, and replace a hash. Both take the hash form (`""`,
  `"#how-to-play"`, `"#game"`), build the URL as `location.pathname +
location.search` plus the hash when there is one (D13.4 — the empty-URL form
  does **not** clear a fragment, and a hard-coded `"/"` is forbidden by S1),
  write it with `pushState`/`replaceState`, and then notify subscribers. Neither
  writes anything into `history.state` — the app keeps no record there (D3, D8).
- go back — a thin `history.back()`.

This step adds **no app behaviour**: nothing imports the module yet. That is
deliberate (the plan guide separates scaffolding from behaviour).

Verification (automated): a new `src/nav/browserAddress.test.ts` with the
`// @vitest-environment jsdom` docblock on line 1, `afterEach(cleanup)` not
needed (no rendering) but the address reset of D13.6 **required** in
`beforeEach`/`afterEach`. Cover:

- pushing a hash changes `location.hash`, adds one entry (`history.length`
  rises by one) and notifies every subscriber;
- replacing a hash changes `location.hash` without changing `history.length`,
  and notifies;
- a real `popstate` and a real `hashchange` each notify (dispatch the events);
- unsubscribing stops the notifications;
- pushing the **menu** address from a deep path with a query — set the address
  to something like `/builds/v1/?x=1#game` first — leaves the pathname and the
  query intact and the hash empty (this is the subfolder guarantee of S1 in a
  test);
- going back eventually notifies (`await waitFor(...)`, per D13.1).

Then `npm test`, `npm run typecheck` and `npm run lint` clean.

---

### Step 2 — `src/nav/useScreenAddress.ts`: the screen follows the address, and backing out asks first

Status: pending

Depends on: Step 1 (the mapping and the wrapper).

_Merged from planning's Steps 3 and 4 at the owner's direction: the second
rewrote the hook the first had just written. The hook is built once, complete
with its guard. Build it in the order below — the derived screen working before
the prompt is added on top — but commit it as one step._

#### 2a — The hook: derived screen, actions, `hasGame`, address correction

Create `src/nav/useScreenAddress.ts`, the hook that owns navigation. In this
step it takes no arguments and returns the current `Screen` plus three actions.
**No prompt in part 2a** — part 2b adds the prompt, and with it the one
parameter the hook needs (the app's `gameOver` flag).

Behaviour to implement, all of it already argued in D3, D4 and D8:

- the live hash is read with `useSyncExternalStore`, subscribing through Step
  2's wrapper, with the snapshot being the hash string itself;
- the screen is `screenFromHash(hash)`, degraded to `"start"` when it says
  `"game"` but there is no game to show (D3);
- one piece of state, `hasGame`, set when the game action runs;
- an action for "a game has been dealt": sets `hasGame` and pushes `#game`.
  (It does **not** dispatch `new-game` — that stays in `useAppScreen`, which
  owns the options and the session dispatch.)
- an action for "open the guide": pushes `#how-to-play`;
- an action for "leave this screen for the menu": D8 — go back when the current
  entry was created by the app, otherwise replace the address with the menu's;
- one effect doing D4's two idempotent reconciliations: clear `hasGame` when the
  derived screen is no longer `"game"`, and **replace** the address whenever it
  does not name the screen showing. Replaces only — never a push in an effect
  (`StrictMode` runs effects twice).

Note for the implementer: do not add a `gameOver` parameter here just because
part 2b will need one — an unused parameter would fail lint, and the hook's only
caller until Step 3 is its own test file, so adding it in 2b costs one line
of churn.

Write the module header comment in the repository's style: the hash is the
single source of truth, `#game` means the menu when there is no game, and the
address is corrected rather than obeyed.

Verification (automated): a new `src/nav/useScreenAddress.test.tsx` (jsdom
docblock, `afterEach(cleanup)`, address reset per D13.6), using `renderHook`.
Cover:

- mounting at `""`, `"#how-to-play"` and `"#nonsense"` gives `"start"`,
  `"guide"` and `"start"`;
- mounting at `"#game"` with no game gives `"start"` **and** the address is
  corrected to no hash (S4's cold load and mid-game reload);
- the game action pushes `#game` and the screen becomes `"game"`;
- the guide action pushes `#how-to-play` and the screen becomes `"guide"`;
- a simulated traversal (D13.7) from `#how-to-play` to `""` makes the screen
  `"start"` with no correction needed;
- a simulated traversal from `#game` to `""` while a game is showing makes the
  screen `"start"` (nothing prompts yet); a subsequent simulated traversal
  **back to** `#game` gives `"start"` again and the address is corrected — the
  Forward-after-leaving case of S4. When part 2b adds the prompt, this case will
  need `gameOver` true or an accepting `confirm` stub, so write it in a shape
  that is cheap to adjust;
- leaving from an app-created entry goes back (`await waitFor`), and leaving
  from a cold-loaded `#how-to-play` replaces instead: the screen becomes
  `"start"`, the hash is empty, and `history.length` did not change.

Then `npm test`, `npm run typecheck`, `npm run lint` clean.

#### 2b — The abandon prompt, on the same hook

Add the abandon guard to `useScreenAddress`, exactly as D5 and D7 describe:

- an effect, keyed on "a game is in progress" (a game to show, not over),
  registering **one** handler on both `popstate` and `hashchange`, and removing
  both on cleanup;
- the handler re-reads the live hash; if it still says `#game` it does nothing;
- otherwise it calls `window.confirm` with Step 1's sentence. Accepted → it does
  nothing more, and the render that follows shows the menu while 2a's effect
  clears `hasGame`. Declined → it **pushes** `#game` back, synchronously, so no
  render ever shows the menu.

Nothing else changes. In particular the handler must stay synchronous (D5) and
must not consult React state directly — the effect's dependency is what keeps
it current.

Verification (automated): extend `src/nav/useScreenAddress.test.tsx`, stubbing
`window.confirm` per D13.5. Cover:

- a simulated traversal away from `#game` while a game is in progress calls
  `confirm` **once** with the story's sentence;
- **declined**: the screen is still `"game"`, the hash is `#game` again, and —
  using a **real** `history.back()` with `waitFor` (D13.7) — `history.length` is
  unchanged from before the Back press, proving the forward entry was replaced
  rather than duplicated (D7);
- **accepted**: the screen becomes `"start"`, and a subsequent simulated
  traversal to `#game` gives `"start"` with the address corrected and
  `confirm` **not** called again (the story's "it asks once");
- `gameOver` true: a traversal away from `#game` does not call `confirm` at all
  (S6);
- on the guide or the menu, a traversal never calls `confirm`.

Then `npm test`, `npm run typecheck`, `npm run lint` clean.

---

### Step 3 — The close/reload guard, and the app handed over to the browser

Status: pending

Depends on: Step 2 (the hook, complete).

_Merged from planning's Steps 5 and 6 at the owner's direction:
`useLeaveConfirmation` is a single effect, too small to stand as a step, so it
lands with the wiring that switches it on._

#### 3a — `src/nav/useLeaveConfirmation.ts`

Create `src/nav/useLeaveConfirmation.ts`: a hook taking one boolean, which
registers a `beforeunload` listener while it is true and removes it otherwise.
The listener calls `preventDefault()` on the event and does nothing else — no
message (the platform ignores one, S5), no state, no side effect.

Call it from `useScreenAddress` with the same "a game is in progress" condition
the abandon guard uses (D10), so the two prompts are armed and disarmed
together.

Verification (automated): a new `src/nav/useLeaveConfirmation.test.tsx` (jsdom
docblock) asserting, per D13.8, that a dispatched cancelable `beforeunload` is
cancelled while enabled and **not** cancelled when disabled or after unmount;
plus cases in `src/nav/useScreenAddress.test.tsx` showing the event is cancelled
while a game is in progress and not cancelled on the menu, on the guide, or
with `gameOver` true (S6). Then `npm test`, `npm run typecheck`,
`npm run lint` clean.

#### 3b — `useAppScreen` and `App` hand navigation to the browser

Wire the new hook into the app. Both files move together because the hook's
signature changes and `App` is its only caller.

`src/useAppScreen.ts`:

- drop the `screen` `useState` and the three `setScreen` calls;
- take a second parameter, the app's `gameOver` flag, and pass it to
  `useScreenAddress`;
- return `screen` from the nav hook, unchanged in name and type, so `App`'s
  destructuring is untouched;
- keep the three action names the components already take:
  `handlePlay` dispatches `new-game` exactly as it does today and then calls the
  nav hook's game action; `handleOpenGuide` calls the guide action;
  `handleReturnToStart` calls the leave action. The options and their setters
  are untouched (S13);
- update the module header comment: it currently says `handleReturnToStart`
  "switches back to the start screen", and the screen is no longer switched by
  this module. Say what is true now — the hash decides, and these actions move
  the browser — without writing design history into the code.

`src/App.tsx`:

- reorder the hook calls so `gameOver` exists before `useAppScreen` is called:
  `useReducer` → `useDisplayedEnergy` → `const gameOver = …` → `useAppScreen(
dispatch, gameOver)`. Nothing else about `App` changes; the JSX is untouched.

Then bring the two existing test files up to date — this is the churn D13
predicts, and it is expected work, not a sign something is wrong:

- **`src/useAppScreen.test.tsx`**: add the address reset of D13.6; pass the new
  `gameOver` argument at every `renderHook`; and fix the several tests that call
  `handlePlay` then `handleReturnToStart` to assert the options survived. Those
  now cross a real traversal: render the hook with `gameOver: true` (the only
  flow that actually reaches `handleReturnToStart` from a game in the app — the
  game-over panel's button) or stub `window.confirm` to accept, and `await
waitFor(...)` for the screen to become `"start"` (D13.1). Keep every existing
  assertion about the options; none of them should change value.
- **`src/App.test.tsx`**: add the address reset of D13.6 — without it, the guide
  test leaves `#how-to-play` behind and later tests mount on the guide — and fix
  the "opens the guide from Quick Guide, and returns to the start screen …" test
  to `await waitFor(...)` after clicking Back, since the guide's Back button is
  now `history.back()`.

No new behavioural coverage in this step; Step 4 adds that.

Verification (automated): `npm test` green with **no existing expectation
weakened or deleted** — in particular every "the options survive" assertion in
`useAppScreen.test.tsx` still asserts the same values, and `App.test.tsx`'s
guide round-trip still ends on the start screen with all four chosen options
still set. `npm run typecheck` and `npm run lint` clean. Record in `Notes:`
which tests needed a `waitFor` and which needed a `confirm` stub.

---

### Step 4 — The story's flows, proved through the whole app

Status: pending

Depends on: Step 3 (the app is wired).

Add coverage in `src/App.test.tsx` (the only place the real session, the real
clock and the real screens are assembled together), following that file's
existing conventions — `user-event` for clicks, roles and text for queries, the
address reset in `beforeEach`, a `confirm` spy where the guard is crossed.
Cover the story's "Done when" list:

- **PLAY addresses the game**: pressing PLAY leaves `location.hash` at
  `"#game"` with the board on screen.
- **The guide has an address**: pressing Quick Guide leaves the hash at
  `"#how-to-play"`; a simulated Back (D13.7) shows the start screen with the
  chosen options still set and an empty hash; a simulated Forward to
  `#how-to-play` shows the guide again.
- **A cold load of `#how-to-play` opens the guide** — set the address before
  `render(<App />)`.
- **A cold load of `#game` shows the menu and corrects the address** (S4),
  with no prompt of either kind.
- **Back during a game prompts, and cancelling changes nothing**: choose a
  clock (the `6s` group, as the existing clock test does), press PLAY, advance
  the fake timers a few seconds, then simulate Back with `confirm` returning
  false. Assert: the board is still on screen, the turn indicator still says
  the same side to play, the round is still `1/30`, the hash is `#game` again,
  and **the clock reading is still the advanced one, not the full budget** —
  which is the assertion that proves the game screen never unmounted (D5). Use
  the `vi.useFakeTimers({ shouldAdvanceTime: true })` pattern already in that
  file.
- **Confirming abandons the game**: the same setup with `confirm` returning
  true shows the start screen; a following simulated Forward to `#game` shows
  the start screen again with the address corrected and `confirm` not called a
  second time.
- **The game-over panel prompts for nothing**: reaching the panel through the
  real app is expensive, so prove the two halves that are actually this story's:
  a dispatched `beforeunload` is **not** cancelled on the start screen or the
  guide, and **is** cancelled while a game is in progress (D13.8). The
  panel-specific silence is already covered at the hook level in Step 3 via
  `gameOver`; note that split in `Notes:` rather than driving a full game to its
  end in a component test. If a cheap route to the panel exists (a very short
  game via the `Rounds` option is still 30+ plies — it does not), leave it to the
  manual step.

Then record the accepted accessibility cost (S11) in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, as a new
`## From story 88 — Back goes back` section in that file's established style:
a screen change driven by Back, Forward, or the app's own Back buttons (which
are now the browser's) moves focus nowhere and announces nothing, so a keyboard
or screen-reader user lands wherever focus already was — the same gap story 35
recorded for PLAY and the game-over button, now reachable by two more routes.
Name the files (`src/nav/useScreenAddress.ts`, `src/App.tsx`) and cite this
plan's S11 as the source. Do not turn it into an audit of anything else.

Verification (automated): `npm test` green with the new cases, the test count
risen, and every pre-existing `App.test.tsx` expectation intact;
`npm run typecheck` and `npm run lint` clean; plus a read of
`known-issues.md` confirming the new section is there and names this story.

---

### Step 5 — The owner drives it

Status: pending

Depends on: every previous step.

Nothing to implement. The story's manual checks, gathered in one place. The
owner runs the app and looks.

Verification (manual):

**In `npm run dev` (served at the root, as always):**

- **The guide.** From the menu, choose a few non-default options, press Quick
  Guide: the address gains `#how-to-play`. Press the browser's **Back**: the
  menu returns with every option still set. Press **Forward**: the guide again.
  Press the guide's **own Back button**: the same as the browser's Back, and the
  browser's Back afterwards does **not** bounce back into the guide.
- **The link.** Open `#how-to-play` in a **new tab** (paste the URL): the guide
  opens. Its own Back button does **nothing** there, which is the accepted
  consequence of the owner's plan-gate decision in D8 — it is not a defect, and
  nothing in this story is to "fix" it.
- **PLAY.** The address reads `#game` while a game is on screen.
- **Back during a game.** Make a couple of moves, let the clock run, then press
  **Back**: a prompt appears. **Cancel**: the same turn, nothing moved, the
  clock where it was, the address back to `#game`. Press **Back** again and
  **confirm**: the menu, with the options still set.
- **After abandoning.** Press **Forward**: the menu, and the address has no
  `#game` left on it. No prompt.
- **Reload mid-game.** Start a game, reload: the menu, and the address is
  corrected. (Nothing is persisted — S9 — so this is the honest behaviour, not a
  bug.)
- **Close/reload prompts.** Mid-game, reload or close the tab: the browser's own
  "leave this page" prompt appears. On the **menu** and on the **guide**: no
  prompt. Play a game to its end and, on the **game-over panel**: no prompt,
  its return-to-menu button goes straight to the menu, and the browser's Back
  from it does the same.
- **The address always matches.** After every one of the above, the address bar
  names the screen showing.

**A build served from a subfolder** (the check `story.md` asks for — the hash
must carry no assumption about the path above it). Stop the dev server first, so
the already-forwarded port is free, then from the repository root:

```bash
npm run build
mkdir -p /tmp/site/builds/v1 && cp -r dist/* /tmp/site/builds/v1/
python3 -m http.server 5273 --directory /tmp/site
```

Open `http://localhost:5273/builds/v1/` on the host and confirm the menu loads,
Quick Guide gives `…/builds/v1/#how-to-play`, PLAY gives `…/builds/v1/#game`,
and a reload at each of those two addresses behaves as it does in dev — the
guide opens, and `#game` falls back to the menu with the address corrected,
with the `/builds/v1/` prefix intact throughout.

If the in-app prompt's wording reads badly, say so: it is one constant
(`src/nav/screenAddress.ts`, D11) and changing it is a one-line edit plus its
test.

---

### Step 6 — `README.md`

Status: pending

Depends on: Steps 1 to 5 (the README describes finished behaviour).

`README.md` is player-facing and describes the app's screens. Two passages were
found during planning that this story touches:

- the **Status** block's description of the start screen, which says the quick
  guide has "a back button that returns you to the start screen" — still true,
  but the browser's Back now does the same thing, and that is worth a few words
  where the guide is introduced;
- anything the README says about what happens to a game in progress. It
  currently says nothing about leaving one, and now there is something to say:
  the browser's Back leaves a game after asking, and a reload starts over,
  because nothing is saved.

Keep it to the README's voice — a sentence or two for a non-technical reader,
not a second ruleset — and add nothing about hashes or history entries beyond
what a player needs: **the browser's Back and Forward move between the screens,
and the address bar says which screen is showing, so a link to the quick guide
can be shared.**

Then run `/update-readme`, which reviews the branch diff and updates anything
else the README describes that this story changed.

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
green; `npm run format:check` reporting only the two pre-existing warnings
from the baseline; and a read of `README.md` confirming it describes Back and
Forward moving between screens, the address bar naming the screen, that leaving
a game asks first, and that a reload starts over because nothing is saved — with
no mention of routers, hashes as a technique, or anything a player would not
recognise.

---

## Risks and things to escalate rather than improvise

- **A test suddenly mounting on the wrong screen.** Almost always the missing
  address reset of D13.6. Check that first.
- **The clock resetting on a cancelled Back.** That means the game screen
  unmounted, i.e. something moved the prompt out of the traversal handler or
  made the decline path asynchronous (D5, D7). Fix the cause; do not paper over
  it by moving the clock's state.
- **A second prompt appearing after confirming.** The `hasGame` clear in D4's
  effect is not running, or the guard's effect dependency is stale.
- **Needing to delete or rewrite history entries.** The History API cannot, and
  S4 exists precisely so nothing has to. If a step feels like it needs to,
  escalate.
- **Any change to `src/rules/`, `src/game/` or a recorded seeded expectation.**
  Nothing in this story should touch either (S7, D14). Stop and escalate.
