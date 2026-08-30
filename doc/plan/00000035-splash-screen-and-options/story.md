# Story 00000035 — A start screen, a new name, and two options

## Summary

The game stops opening straight onto a board. It opens on a **start screen**
— the same arcade cabinet, the same lit marquee — carrying the game's name,
two options and a **PLAY** button. Nothing about a game in progress changes
except the two things the options set.

- **The game is called GREED on screen.** The marquee over the start screen
  and the marquee over the board both say it. This is a working title and the
  change is deliberately shallow: the on-screen name and the browser tab, and
  nothing else. The repository, the package, `README.md` and
  `doc/ruleset/rules.md` all go on saying Base Control until a proper branding
  pass says otherwise.
- **Ships a side — 5, 6 or 7, default 7.** A smaller fleet starts from a
  smaller set of bays, laid out below. Everything else about ships is
  untouched.
- **Rounds — 30, 50, 75 or 100, default 30.** Exactly what it says: the
  game's length. The **default drops from 100 to 30**, which is a rules
  change in its own right — a hundred rounds is a long sit, and thirty is
  what a game should be unless a player asks for more.
- **The end of the game leads back to the start screen.** The game-over
  panel's button returns to the start screen rather than dealing a new game
  on the spot, and the options are still set the way the finished game was
  played — a player who wants the same game again presses PLAY twice and
  changes nothing.

The point of the story is to put the two numbers that most change how a game
feels — how many ships, how long — in the player's hands, and to give the app
the front door it has never had.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.14**.
This story takes it to **0.15** — a gameplay change (fleet size becomes a
choice, and the default length moves), so it earns a changelog entry and a
version bump. Tagging remains on hold, per `CLAUDE.md`.

Planning documents say **ply** for the rules' and the UI's **turn**, and
**site**, **bay**, **node** as the rules use them (`CLAUDE.md`, Vocabulary).

What exists today:

- **`doc/ruleset/rules.md`** — §1's "a fleet of seven ships", §2's "The game
  lasts 100 rounds", §3.1's fourteen bays, §4's "Each player has seven ships"
  and its clockwise-from-H15 starting list, and §9's "after 100 rounds".
- **`src/rules/fleet.ts`** — `STARTING_FLEET`, a flat constant of fourteen
  `FleetEntry` values in clockwise order, and the `Side`, `ShipId` and
  `FleetEntry` types.
- **`src/rules/bays.ts`** — `BAYS` and `isBay`. The fourteen bays are a
  property of the board and this story does not touch them.
- **`src/rules/gameLength.ts`** — `DEFAULT_GAME_LENGTH_ROUNDS` (100),
  `isGameLengthRounds`, and the round arithmetic that already reads a state's
  own `lengthInRounds` rather than the default.
- **`src/rules/gameState.ts`** — `startingGameState(randomSeed,
  lengthInRounds = DEFAULT_GAME_LENGTH_ROUNDS)`, which builds `state.ships`
  from `STARTING_FLEET` and stores `lengthInRounds` on the state.
- **`src/game/session.ts`** — the `new-game` intent, which **already** carries
  both the seed and the length and never reaches for a default itself.
- **`src/App.tsx`** — the cabinet: `<h1>` title, `Hud`, `Board`, and the
  swap to `GameOverPanel` once `isGameOver` and the score roll have settled.
  `handlePlayAgain` already dispatches `new-game` with a fresh seed and the
  finished game's own length.
- **`src/hud/GameOverPanel.tsx`** — the result panel and its "Play again"
  button.
- **`src/App.css`** — `.app` (the marquee glow), `.app__title` (the arcade
  face, `--font-arcade`, `--glow-text`) and `.app__cabinet` (the one framed
  box everything sits in).

Three facts shape the design and should not be rediscovered by the
implementer:

- **The session layer is already ready for this.** `new-game` carries its
  parameters rather than defaulting them, and every piece of round arithmetic
  already reads the state's own `lengthInRounds`. Game length needs **no new
  plumbing** — only a new default, and a screen that picks a number.
- **Fleet size does not need to be stored on `GameState`.** A game's ships
  are `state.ships`; how many a side has is derivable from them. The choice
  belongs to the app's start screen and to the `new-game` intent, not to a
  new state field. Contrast `lengthInRounds`, which *is* stored, because
  nothing else in the state records it.
- **`src/rules/energy.ts` derives `SHIPS_PER_SIDE` from `STARTING_FLEET`.**
  It is a range check on the dormant-site count (§8.4), and it wants the
  **maximum** a side can ever have — seven — not the current game's fleet
  size. When `STARTING_FLEET` stops being a flat constant, that derivation
  must keep meaning "the most ships a side can have", or the check will start
  throwing on a legal five-ship game.

## The three starting layouts

The bays never change: fourteen of them, in the same places (§3.1). What
changes is which of them hold a ship at the start, and — at five a side — the
colours on the left and right edges.

**Seven a side (14 ships, today's layout, unchanged).** Alternating clockwise
from H15.

| Edge   | Bays, left to right / top to bottom            |
| ------ | ---------------------------------------------- |
| Top    | D15 red, H15 green, L15 red                    |
| Right  | O14 green, O10 red, O6 green, O2 red           |
| Bottom | D1 green, H1 red, L1 green                     |
| Left   | A14 green, A10 red, A6 green, A2 red           |

**Six a side (12 ships).** The **middle bay of the top edge and of the bottom
edge** — H15 and H1, the two three-bay edges — start empty. Every other bay
holds exactly the ship and the colour it holds in a seven-ship game; nothing
is recoloured.

| Edge   | Bays                                           |
| ------ | ---------------------------------------------- |
| Top    | D15 red, **H15 empty**, L15 red                |
| Right  | O14 green, O10 red, O6 green, O2 red           |
| Bottom | D1 green, **H1 empty**, L1 green               |
| Left   | A14 green, A10 red, A6 green, A2 red           |

Green: O14, O6, D1, L1, A14, A6. Red: D15, L15, O10, O2, A10, A2.

**Five a side (10 ships).** The **top and bottom bay of each four-bay edge** —
O14, O2, A14, A2 — start empty, and the colours on those two edges are
**reversed** from the seven-ship game. The three-bay edges are untouched, so
the top still reads red-green-red and the bottom still reads green-red-green.

| Edge   | Bays                                                          |
| ------ | ------------------------------------------------------------- |
| Top    | D15 red, H15 green, L15 red                                   |
| Right  | **O14 empty**, O10 **green**, O6 **red**, **O2 empty**        |
| Bottom | D1 green, H1 red, L1 green                                    |
| Left   | **A14 empty**, A10 **green**, A6 **red**, **A2 empty**        |

Green: H15, O10, A10, D1, L1. Red: D15, L15, O6, A6, H1.

Read as halves, which is how it was designed: the top half is red-green-red
across the top with **green** just above centre on each side — where red sits
in a seven-ship game — and the bottom half is the exact inverse.

**All three layouts keep the board's half-turn symmetry.** Rotating the board
180° maps each side's fleet exactly onto the other's, the property §4 already
claims for the seven-ship layout ("neither side begins with better ground").
This is worth an automated test for all three: it is the one check that
catches a mis-set bay.

## In scope

### 1. The rules edit, first and on its own

Version 0.14 → 0.15, with a changelog entry, in its own commit ahead of the
code.

**§4 gains the fleet-size choice.** "Each player has seven ships" becomes:
each player has **five, six or seven** ships, the same number for both,
chosen before play begins; seven is the standard game. The clockwise list is
replaced by the three layouts above — the seven-ship one stated as it is
today, and the two smaller ones stated as which bays are empty and, at five,
which edges are recoloured. The section keeps its closing point about
half-turn symmetry and says plainly that it holds for all three.

**§9 gains the length choice, and a new default.** The game ends after the
number of rounds chosen before play begins: **30, 50, 75 or 100**, with
**30** the standard game. Everything else in §9 — most energy wins, equal
energy is a draw — is unchanged.

**§2's "The game lasts 100 rounds"** becomes the chosen length, defaulting
to 30.

**§1's overview** picks up the fleet size the same way: a fleet of five, six
or seven ships.

**§3.1 is untouched.** There are always fourteen bays, they are always
unowned, and a bay left empty at the start is an ordinary empty bay in every
way — in particular, **§7.1's random return may send a beaten ship to it**.
The rules should say this explicitly in §4 where the empty starting bays are
introduced, because it is the obvious question a reader will have: the empty
bays are not removed from the board, they are merely unoccupied when play
begins. §7.1's "there is always somewhere to go" argument only gets stronger
with fewer ships and needs no edit.

Nothing else changes: §3.2, §5, §6, §7, §8 in full and both appendices stay
as they are.

### 2. The starting fleet becomes a function of fleet size

`fleet.ts` stops exporting a single flat `STARTING_FLEET` and starts
answering "the starting fleet for a five-, six- or seven-ship game". The
shape is the plan's call — a function over a fleet-size type, backed by
whatever table reads most clearly — but three things are required:

- **A named type for the choice** (five, six or seven a side), with the valid
  values and the default in one place, the way `gameLength.ts` holds the
  length's default and its validity check. The rest of the app imports the
  choice from there rather than repeating `5 | 6 | 7`.
- **Ship ids stay `green-N` / `red-N`, numbered 1..N per side with no gaps**,
  in the same clockwise order the fleet is listed in. `fleet.test.ts` already
  asserts this for seven; it should assert it for all three.
- **Every ship still starts on 0 shields, one to a bay.**

`gameState.ts`'s `startingGameState` takes the fleet size alongside the seed
and the length, defaulting to seven a side, and validates it the way it
already validates `lengthInRounds` — an invalid size is a caller bug and
throws a `RangeError`. Its doc comment says "the fourteen `STARTING_FLEET`
ships" today and needs rewriting.

`energy.ts`'s `SHIPS_PER_SIDE` must keep meaning the **maximum** ships a
side can have (see Background). Whether that is a constant beside the
fleet-size type or a derivation from the largest layout is the plan's call.

### 3. The default game length moves to 30

`DEFAULT_GAME_LENGTH_ROUNDS` becomes 30, and `gameLength.ts` gains the
offered lengths — 30, 50, 75, 100 — as a named list beside it, so the start
screen renders the rules' own numbers rather than its own copy.
`isGameLengthRounds` keeps its existing meaning (any positive whole number is
a valid length for a state); the offered list is what the **screen** offers,
not a new restriction on what a state may hold. Tests that read
`DEFAULT_GAME_LENGTH_ROUNDS` as a stand-in length are unaffected by the
number changing; `gameLength.test.ts` asserts the value and moves.

### 4. The start screen

A new component under `src/` — its home is the plan's call, but it is a
screen, not a HUD part — rendered by `App` in place of the game whenever
there is no game being played.

- **It lives inside the existing cabinet.** The same `.app__cabinet` frame,
  the same marquee glow, the same `--font-arcade` title treatment as the
  in-game one. The start screen is the cabinet with a different thing on the
  screen, not a second look.
- **The name**, big, in the marquee position the `<h1>` occupies today.
- **Two option groups** — "Ships" (5, 6, 7) and "Rounds" (30, 50, 75, 100) —
  each showing its choices and which one is selected. The arcade treatment is
  the plan's call: a row of selectable values reads better here than a
  dropdown, and the selected value should be unmistakable at a glance. Each
  group needs a label a screen reader can reach, and the selection must be
  changeable from the keyboard; per `CLAUDE.md` this story does not owe
  polish beyond that, and no plan step is added for testing accessibility.
- **A PLAY button**, visually the loudest thing on the screen.
- **Defaults on first load: 7 ships, 30 rounds.**
- The options are the screen's own state and mean nothing until PLAY is
  pressed. Changing one mid-screen starts no game and dispatches nothing.

### 5. Wiring: the app owns the choices, the game gets them once

`App` gains a notion of what is on screen — the start screen or a game — and
holds the two selected options across both, so a finished game returns to the
start screen with them still set.

- **PLAY** starts a game: a fresh seed, the selected fleet size, the
  selected length, through the existing `new-game` intent, which grows a
  fleet-size field beside the seed and the length it already carries. It goes
  on carrying its parameters rather than defaulting them.
- **The game-over panel's button returns to the start screen.** It no longer
  deals a new game directly, so `App`'s `handlePlayAgain` becomes a return to
  the start screen and the button's wording follows what it now does — the
  plan picks the words, and the hidden result sentence beside it is
  unaffected. The selected options are exactly what the finished game was
  played with, because they never left `App`.
- **No mid-game option changes and no in-game route back.** The only ways to
  the start screen are opening the app and finishing a game; there is no
  quit, no restart button and no settings panel on the board screen.
- **The session reducer keeps its shape.** It is handed a fleet size and
  builds the state from it; it never chooses one.

### 6. The name on screen

`src/App.tsx`'s `<h1>`, the start screen's marquee, and `index.html`'s
`<title>` say **GREED**. `src/App.test.tsx` asserts the heading text and
moves with it. `Board.tsx`'s grid label ("Base Control board") is the
board's accessible name and is player-facing, so it moves too.

Nothing else is renamed: not the repository, the package name, `README.md`,
`CONTRIBUTING.md`, `CLAUDE.md`, `doc/ruleset/rules.md`, any module, type or
CSS class. A future branding story can do the rest deliberately.

### 7. `README.md` and the ledger

`README.md` opens with "a fleet of seven ships" and its Status paragraph
describes opening the app onto the board with "all fourteen ships lined up in
their bays". Both are now wrong: the app opens on a start screen, the fleet
is a choice, and the game is thirty rounds unless a player says otherwise.
The opening paragraphs and the Status note should say what a player now
meets. The README keeps the name Base Control, per section 6.

Run `/update-readme` for the rest of the diff. `CLAUDE.md` needs nothing —
no vocabulary changes, and the project description there is behind-the-scenes
text the rename does not touch.

Tests expected to move: `fleet.test.ts` (the three layouts, ids, symmetry),
`gameState.test.ts` (fleet size argument, the "fourteen ships" test),
`gameLength.test.ts` (the new default and the offered lengths),
`session.test.ts` (`new-game` carrying a fleet size), `App.test.tsx` (the
start screen, the name, and the route back from game over),
`GameOverPanel.test.tsx` (the button's new job), `Board.test.tsx` and
`energy.test.ts` where they build fleets from `STARTING_FLEET`, plus a new
test file for the start screen component. `seededReplay.test.ts` and
`fullGame.test.ts` play seven-a-side games at an explicit length and should
be checked rather than assumed: if a recorded expectation moves, that is a
signal worth reading, not a number to update blindly.

Per the accessibility section of `CLAUDE.md`, existing automated tests are
updated where the path is straightforward. If the implementation costs an
accessible behaviour, record it in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Out of scope

- **Renaming anything but the on-screen title and the tab.** Explicitly: the
  repository, the package, the rules document, the README, the docs and every
  identifier in the code keep the name Base Control.
- **Any other option.** No seed entry, no colour choice, no side choice, no
  difficulty, no board size, no rule toggles — two options and PLAY.
- **Retuning anything for a smaller fleet.** The energy table, the five-node
  cap, the site pool, drain, recovery, pressure and capacity are all
  unchanged, and whether a five-ship game wants different numbers is a
  play-testing question and a later story.
- **Removing bays, or reserving the empty ones.** All fourteen bays stay in
  play for movement and for §7.1's random return.
- **A quit, restart or settings route out of a game in progress.**
- **Persisting the chosen options** across a page reload. They survive a
  finished game because `App` holds them; a reload starts at the defaults.
- **A new visual language.** The start screen reuses the cabinet, the
  marquee glow, the arcade face and the existing palette.
- **Board, combat, movement, nodes and the HUD** — all untouched.

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.15 and the changelog has an
  entry.
- Opening the app shows the start screen, not a board: the name, both option
  groups with 7 and 30 selected, and a PLAY button.
- Pressing PLAY with the defaults starts a seven-a-side, thirty-round game,
  and the round counter reads `1/30`.
- Choosing 5 ships and pressing PLAY deals exactly the five-a-side layout
  above: ten ships, O14, O2, A14, A2 empty, green on H15, O10, A10, D1, L1
  and red on D15, L15, O6, A6, H1.
- Choosing 6 ships deals exactly the six-a-side layout: twelve ships, H15 and
  H1 empty, and every other bay holding the same colour it holds in a
  seven-ship game.
- All three layouts map onto themselves under a 180° rotation with the sides
  exchanged, and every ship starts on 0 shields with ids numbered from 1 per
  side with no gaps.
- Choosing 50, 75 or 100 rounds produces a game that ends on that round and
  reads `N/50`, `N/75`, `N/100` throughout.
- A bay left empty at the start can be moved into, and can receive a beaten
  ship from §7.1's draw, in a five- and a six-ship game.
- A five-ship game plays to its end with no error from the dormant-site count
  in `energy.ts`, including a turn on which a side occupies five dormant
  sites.
- Finishing a game and pressing the panel's button returns to the start
  screen with the finished game's options still selected; pressing PLAY again
  deals a fresh game of the same shape, from a different seed.
- The name reads GREED on the start screen, on the game screen and in the
  browser tab, and appears nowhere else.
- The same opening seed, fleet size, length and sequence of actions produce
  the same game every time.
- Typecheck, lint and the full test suite pass.
