# Implementation plan — 00000035 A start screen, a new name, and two options

## What this story is

The app stops opening onto a board. It opens on a **start screen** inside the
same arcade cabinet, carrying the game's on-screen name, two options and a
**PLAY** button:

- **Ships a side — 5, 6 or 7, default 7.** A smaller fleet starts from a
  smaller set of bays. All fourteen bays stay on the board; some simply start
  empty.
- **Rounds — 30, 50, 75 or 100, default 30.** The default drops from 100.
- **The game is called GREED on screen.** Deliberately shallow: the on-screen
  title, the board's accessible name and the browser tab. The repository, the
  package, `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `doc/ruleset/rules.md`
  and every identifier in the code go on saying Base Control.
- **Game over returns to the start screen** with the finished game's options
  still selected, instead of dealing a new game on the spot.

Both option changes are **gameplay changes**, so `doc/ruleset/rules.md` goes
from version **0.14** to **0.15** with a `doc/ruleset/changelog.md` entry and a
matching `RULES_VERSION` bump, in its own commit ahead of any code (step 1).
Tagging stays on hold, per `CLAUDE.md` — no step tags anything.

### Vocabulary reminder for a cold reader (`CLAUDE.md`)

Planning documents and code say **ply**; `rules.md`, the UI and `README.md` say
**turn**. They are the same thing: everything one player does before play
passes, which in this game is one action. **Site**, **bay** and **action** are
the same word everywhere. **Hub** is the code word for the player-facing
**node** (a site that is charged). A **bay** is one of the fourteen fixed edge
squares ships start in and are pushed back to; the bays themselves are a
property of the board (§3.1) and this story does not add, move or remove one.

Throughout this plan, "fleet size" means the number of ships **one side** has
(5, 6 or 7), never the total on the board (10, 12 or 14).

### Settled decisions that are not to be re-opened

Decided by the repository owner before planning began:

1. **The rules edit goes first, in its own commit, ahead of any code** — 0.14 →
   0.15, changelog entry, `RULES_VERSION` bump. No tagging.
2. **Fleet size is not a `GameState` field.** A game's ships are `state.ships`;
   how many a side has is derivable from them. The choice lives on the start
   screen and on the `new-game` intent only. Contrast `lengthInRounds`, which
   _is_ stored, because nothing else in the state records it.
3. **`src/rules/energy.ts`'s `SHIPS_PER_SIDE` must keep meaning the _maximum_
   ships a side can ever have — seven — not the current game's fleet size.**
   It is a range check on the dormant-site count (§8.4); pinned to a five-ship
   game's fleet it would throw on a legal position.
4. **The three layouts are exactly as transcribed in the story** (repeated in
   full in step 1 and step 2). They are not to be re-derived, re-coloured or
   "tidied".
5. **The rename is on-screen only.** Nothing in the repository, the package,
   the docs or the code is renamed.
6. **No review fixtures and no manual test scripts.** The owner drives manual
   testing by running the app; no step builds a harness for him.
7. **No plan step tests accessibility** (`CLAUDE.md`, accessibility during
   pre-release). Existing automated tests are updated where the path is
   straightforward.

---

## Where the work lands

| File                        | What happens to it                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `doc/ruleset/rules.md`      | §1, §2, §4, §5 (one aside), §9 edited; 0.14 → 0.15 (step 1)                            |
| `doc/ruleset/changelog.md`  | New 0.15 entry at the top (step 1)                                                     |
| `src/rules/rulesVersion.ts` | `RULES_VERSION` → `"0.15"` (step 1)                                                    |
| `src/rules/fleet.ts`        | Fleet-size type, valid values, default, max; three layouts; `startingFleet()` (step 2) |
| `src/rules/energy.ts`       | Its ships-per-side bound becomes the maximum, imported from `fleet.ts` (step 2)        |
| `src/rules/gameState.ts`    | `startingGameState` takes a validated fleet size (step 3)                              |
| `src/rules/gameLength.ts`   | Default becomes 30; the offered lengths get a named list (step 5)                      |
| `src/game/session.ts`       | `new-game` carries a fleet size (step 6)                                               |
| `src/gameName.ts`           | **New.** The one on-screen name constant (step 7)                                      |
| `src/App.tsx`               | Title reads the name (step 7); screen + options state, PLAY, return to start (step 9)  |
| `src/board/Board.tsx`       | The grid's accessible name reads the name (step 7)                                     |
| `index.html`                | `<title>` becomes GREED (step 7)                                                       |
| `src/start/StartScreen.tsx` | **New.** The start screen (step 8)                                                     |
| `src/start/StartScreen.css` | **New.** Its styling (step 8)                                                          |
| `src/hud/GameOverPanel.tsx` | The button returns to the start screen and is reworded (step 9)                        |
| `README.md`                 | Opening paragraphs and the Status note (step 10)                                       |

Tests touched, and by which step:

| Test file                                                                                                                                                     | Step(s) | Why                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| `src/rules/fleet.test.ts`                                                                                                                                     | 2       | The three layouts, ids, bays, shields, half-turn symmetry                |
| `src/rules/energy.test.ts`                                                                                                                                    | 2       | The dormant bound is the maximum fleet, not the current one              |
| `src/board/Board.test.tsx`                                                                                                                                    | 2, 7    | Builds fleets from `STARTING_FLEET`; the grid's accessible name          |
| `src/hud/GameOverPanel.test.tsx`                                                                                                                              | 2, 9    | Builds a fleet from `STARTING_FLEET`; the button's new job               |
| `src/rules/gameState.test.ts`                                                                                                                                 | 3       | The fleet-size argument and its validation                               |
| `src/rules/fullGame.test.ts`                                                                                                                                  | 4       | A five-ship game plays to its end; empty bays are ordinary               |
| `src/rules/gameLength.test.ts`                                                                                                                                | 5       | The new default, its boundaries, and the offered lengths                 |
| `src/rules/movement.test.ts`, `combat.test.ts`, `ply.test.ts`, `src/game/session.test.ts`, `src/hud/RoundCounter.test.tsx`, `src/board/announcements.test.ts` | 5       | Ply numbers anchored to the old 100-round default (see **D8**)           |
| `src/game/session.test.ts`                                                                                                                                    | 6       | `new-game` carrying a fleet size                                         |
| `src/App.test.tsx`                                                                                                                                            | 5, 7, 9 | The round counter, the heading text, the start screen and the route back |
| `src/start/StartScreen.test.tsx`                                                                                                                              | 8       | **New.** The screen's options and PLAY                                   |
| `src/rules/seededReplay.test.ts`                                                                                                                              | 4, 5    | Checked, not assumed — see **D9**                                        |

Deliberately **not** touched:

- **`src/rules/bays.ts`.** There are always fourteen bays in the same places.
  A bay that starts empty is an ordinary bay.
- **`src/rules/chargeDraw.ts`, `sites.ts`, `combat.ts`, `movement.ts`,
  `endOfTurn.ts`, `shields.ts`.** Nothing about nodes, drain, recovery,
  pressure, capacity, range, combat or shields is retuned for a smaller fleet.
  Whether a five-ship game wants different numbers is a play-testing question
  and a later story.
- **The HUD** — `Hud`, `RoundCounter`, `TurnIndicator`, `ScoreDisplay`,
  `useCountUp`, `useDisplayedEnergy`. They already read the state's own
  `lengthInRounds` and its own ships.
- **`CLAUDE.md`, `CONTRIBUTING.md`, `package.json`, the repository name.**
- **`doc/ruleset/rules.md`'s §3, §6, §7, §8 and both appendices** beyond the
  edits step 1 names. §8.4's "six or seven dormant sites" line stays: it
  describes the table's cap, and remains true (it is simply unreachable for a
  side with five ships).
- **This story's own `story.md`.** If `npm run format:check` reports a
  pre-existing warning on it, as it has on earlier stories' files, it is not
  this story's to fix.

---

## Design decisions and reasoning

This section is the design record. The code in this repository does not carry
design history (`CONTRIBUTING.md`, "Comments"), so anything a future reader
needs to know about **why** is written here and nowhere else.

### D1 — The rules change lands first, and the code is knowingly behind it

`CLAUDE.md` and `doc/guidelines/implementation-plan-guide.md` both require it:
`rules.md` is the single source of truth and the code implements it, so the
document is edited, the version bumped and the changelog written before any
behaviour changes. Stories 27, 29, 31 and 33 all did this.

Between step 1 and step 9 the code is knowingly behind the document. The
windows are deliberate; no step should paper over the one it sits in:

| After step | The app behaves like this                                                      |
| ---------- | ------------------------------------------------------------------------------ |
| 1          | 0.14 in full: seven ships a side always, 100 rounds by default                 |
| 2          | Unchanged to play; the three layouts exist and only the seven-ship one is used |
| 3          | Unchanged to play; a smaller game is constructible but nothing constructs one  |
| 4          | Unchanged to play; smaller games are proven to play correctly, in tests only   |
| 5          | A default-length game is now 30 rounds (half of 0.15 in the app)               |
| 6          | Unchanged to play; the session layer can be told a fleet size                  |
| 7          | The name on screen is GREED                                                    |
| 8          | Unchanged; the start screen exists but nothing renders it                      |
| 9          | 0.15 in full: the player chooses both numbers, and game over returns to start  |

### D2 — Fleet size is a rules-layer type, and it lives in `fleet.ts`

The story requires "a named type for the choice, with the valid values and the
default in one place, the way `gameLength.ts` holds the length's default and
its validity check". Two homes were considered:

- **A new `src/rules/fleetSize.ts`**, mirroring `gameLength.ts` exactly.
- **`src/rules/fleet.ts` itself** — chosen.

`gameLength.ts` is its own module because game length is not just a number: it
carries the round arithmetic, the game-over test and the result, none of which
belong in `gameState.ts`. Fleet size has no arithmetic of its own — it selects
a layout, and the layouts already live in `fleet.ts` beside `Side`, `ShipId`
and `FleetEntry`. A separate module would hold four lines and be imported by
`fleet.ts` on the next line anyway. Rejected for that reason; if a later story
grows fleet-size logic, splitting it out is a two-minute move.

`fleet.ts` therefore exports, in addition to the existing types:

- a **fleet-size type** (the union of 5, 6 and 7),
- the **valid values** as an ordered list, smallest first — this is what the
  start screen renders, so the screen never repeats `5 | 6 | 7`,
- the **default** (7),
- a **type guard** for an arbitrary number, used at the one boundary that takes
  a `number` (`startingGameState`),
- the **maximum ships a side can have**, derived from the list of valid values
  rather than written as a literal 7 (see **D4**),
- a **function from fleet size to starting fleet**.

### D3 — Three transcribed layouts, not one derived from another

`STARTING_FLEET` stops being a flat exported constant. In its place, `fleet.ts`
holds an internal table **per fleet size** — the occupied bays in clockwise
order from H15 with the side that occupies each — and `startingFleet(size)`
turns the chosen table into `FleetEntry` values: 0 shields, ids numbered per
side in that clockwise order.

Options considered:

- **Derive the smaller layouts from the seven-ship one by dropping bays.**
  Works for six (drop H15 and H1). Fails for five, which also **reverses** the
  colours on the two four-bay edges, so it needs a second, unrelated rule. A
  derivation that has to be special-cased is harder to check against §4 than a
  table.
- **One fourteen-row table with per-size occupancy and colour.** Compact, but
  reading "what does a five-ship game look like?" means scanning a column, and
  a mis-set cell is invisible.
- **Three explicit tables — chosen.** Each is a direct transcription of §4 and
  can be diffed against the document by eye. The layouts are ten to fourteen
  rows in total; there is nothing to save by being clever, and the half-turn
  symmetry test (below) catches a mis-set bay anyway.

**Alternation is not a property of all three.** The seven-ship and five-ship
rings alternate green/red all the way round, including the wraparound. The
six-ship ring does **not**: removing H15 leaves D15 red next to L15 red, and
removing H1 leaves L1 green next to D1 green. The existing
"alternates sides around the clockwise ring" test in `fleet.test.ts` must
therefore be scoped to the layouts where it holds, not blindly extended. What
holds for **all three** — and is the check worth having — is half-turn
symmetry: rotating the board 180° maps each side's fleet exactly onto the
other's.

Ship ids stay `green-N` / `red-N`, numbered 1..N per side with no gaps, in the
clockwise order the layout is listed in. So in a five-ship game `green-1` is
H15 and `red-1` is L15; in a six-ship game H15 is empty, so `green-1` is O14
and `red-1` is L15. Nothing outside `fleet.ts` depends on which bay a given id
starts in, other than tests, which look ids up from the layout they are given.

### D4 — `energy.ts` bounds itself by the largest fleet, not the current one

`energyForDormantSites` range-checks its count against the number of ships a
side has, and today derives that from `STARTING_FLEET`. §8.4's penalty count is
already **clamped** to five before pricing; the range check exists only to
catch a genuinely impossible count (negative, fractional, or more sites than a
side has ships).

With three fleet sizes, that bound must be the **maximum** a side can ever have
— seven. Pinning it to the current game's fleet size would mean either
threading the fleet size into a pure pricing function (it has no state to read
it from) or throwing on a legal five-ship position where a side happens to
occupy six or seven dormant sites — which cannot happen with five ships, but
the check would be lying about why. The bound stays a **constant**, imported
from `fleet.ts` as the largest of the valid fleet sizes, and its doc comment
changes from "the number of ships one side starts with" to "the most ships a
side can ever have".

Rejected: deleting the check. It is cheap and it has caught nothing only
because it works.

### D5 — `startingGameState` validates a `number`, exactly as it validates the length

`startingGameState(randomSeed, lengthInRounds?, fleetSize?)` gains a third
parameter, typed `number`, defaulting to the fleet-size default, validated by
the type guard and throwing a `RangeError` when it is not 5, 6 or 7 — the same
shape as the existing `lengthInRounds` check, and the story asks for exactly
that. Typing the parameter as the union instead would make the check dead code
in TypeScript and useless at the one place it matters (a value arriving from
outside typed code). The guard narrows, so the layout lookup after it is
type-safe with no cast.

Fleet size is **not** stored on the resulting state (settled decision 2).
`state.ships` records it: a side's fleet size is the count of its ships in the
opening position.

### D6 — The parameter order is seed, length, fleet size

Appending rather than inserting keeps every existing two-argument call site
working untouched, and both new-ish parameters stay optional with their own
defaults. `state.ships` order is unchanged in meaning: the starting fleet's
clockwise order. `gameState.ts`'s doc comments that say "the fourteen
`STARTING_FLEET` ships" and "in `STARTING_FLEET` order" are rewritten.

### D7 — The offered lengths are a list beside the default, and `isGameLengthRounds` does not change

`gameLength.ts` gains a named, ordered list of the lengths the **screen**
offers (30, 50, 75, 100). `isGameLengthRounds` keeps its existing meaning — any
positive whole number is a valid length for a state — because the rules layer
must go on accepting the short games the test suite builds (`lengthInRounds: 1`
and `3` appear throughout). The offered list constrains the **UI**, not the
state. This is the one place the two could have been confused, and they are
deliberately kept apart.

### D8 — Moving the default to 30 breaks tests that used 200 as "the last ply"

`DEFAULT_GAME_LENGTH_ROUNDS` becomes 30, so a default-length game runs to ply
60 and is over at ply 61. Several tests pair a builder that defaults to
`DEFAULT_GAME_LENGTH_ROUNDS` with ply numbers 200 and 201, meaning "the last
ply" and "one past the end". Those numbers are now both past the end, and a
test that asserts a move is _legal_ at ply 200 will fail.

The rule for step 5: **re-anchor, do not invent.** Where a test means "the last
ply of a default game", 200 becomes 60; where it means "one past the end", 201
becomes 61. Where the test's point is genuinely about a hundred-round game
(`gameLength.test.ts`'s `pliesForGameLength(100)`, the round-counter cases that
read "35/100"), either state the length explicitly as 100 or re-anchor the
expectation to the new default — whichever keeps the test saying what it was
written to say. Known sites are listed in step 5; the full suite is the
backstop.

### D9 — `seededReplay.test.ts` and `fullGame.test.ts` are checked, not assumed

Neither the fleet-size work nor the length change alters the seeded random
stream for a **seven-a-side game at an explicit length**: the same ships stand
in the same bays and the same draws happen in the same order. If a recorded
expectation in either file moves, that is a signal that something changed the
stream and it must be understood before it is updated — never re-recorded
blindly. A smaller fleet legitimately produces a different stream, because
§7.1's bay draw runs against a different set of empty bays; that is why step 4
adds new cases rather than re-parameterising the existing ones.

### D10 — The start screen is its own folder, with native radio groups

The screen lives in `src/start/` (`StartScreen.tsx`, `StartScreen.css`,
`StartScreen.test.tsx`) — a screen, not a HUD part, and not board code. It
renders inside the existing `.app__cabinet` frame and fills it the way
`GameOverPanel` does, so the app is one cabinet with different things on the
screen rather than two looks.

The title uses the same tokens as the in-game title (`--font-arcade`,
`--glow-text`, uppercase, letter-spacing, glow) through its **own** class
rather than borrowing `.app__title` from `App.css`. That follows the precedent
already set by `.game-over-panel__heading`, which duplicates the treatment for
the same reason: a component's CSS file owns its own classes, and reaching into
another block's class across files is what makes a change in one place break
another.

Each option group is a **native `fieldset` + `legend`** wrapping visually
hidden `input type="radio"` elements with styled `label`s — chosen over a
custom `role="radiogroup"` widget or a `select`. Native radios give the group
its accessible name from the `legend`, arrow-key selection and roving focus for
free, with no keyboard code to write, and the story wants a row of values
rather than a dropdown. The visible selected state and the focus ring both go
on the label (`:checked + label`, `:focus-visible + label`), using the existing
`--focus-ring` and palette tokens. The radio `name` attributes are scoped with
`useId` so two instances on one page cannot collide.

The screen is **controlled**: it receives the two current values and change
handlers from `App`, plus an `onPlay` callback. The alternative — the screen
owning local state and handing both values to `onPlay` — would also satisfy
"the options mean nothing until PLAY is pressed", but then the values would
have to be seeded from props and would have two homes. Controlled keeps one
source of truth in `App`, which is where they must live anyway so they survive
a finished game (story, section 5). Changing an option still dispatches
nothing: `App` only stores it.

### D11 — `App` holds a screen flag beside the session, and PLAY still goes through `new-game`

`App` gains `screen: "start" | "game"`, plus the two chosen options as state,
and keeps its existing `useReducer` over `sessionReducer`. PLAY dispatches the
existing `new-game` intent with a fresh seed, the chosen length and the chosen
fleet size, then switches the screen to `"game"`. The game-over panel's button
switches the screen back to `"start"` and leaves the finished session in place,
where it is invisible and is replaced by the next PLAY.

A consequence worth naming: the reducer's **initial** session is still a real
starting position dealt at mount and it is now never played — the start screen
is what is on screen until PLAY deals a fresh game. That is a small, contained
cost, and the alternatives were worse:

- **Widen the reducer to `Session | undefined`** so "no game yet" is
  representable. That pushes a screen-level concern into the session module and
  forces every intent but `new-game` to have an undefined case that can only
  throw. The story is explicit that the session reducer keeps its shape.
- **Move the game into a child component that builds its own starting state
  when PLAY mounts it.** Clean, but it orphans the `new-game` intent — the
  child would construct a session directly and nothing would ever dispatch
  `new-game`, contradicting the story's "PLAY starts a game through the
  existing `new-game` intent" and leaving dead code in the session layer.

So the placeholder session stays, with a doc comment saying plainly that it is
the reducer's initial value and is replaced by the first PLAY, never shown.

### D12 — The button's new wording

The game-over panel's button no longer deals a game, so "Play again" would be a
lie: it returns to the start screen, where PLAY deals one. It becomes **"Back
to start"**, and the prop is renamed from `onPlayAgain` to `onReturnToStart` so
the component's contract says what it now does. The hidden result sentence
beside it is unaffected. A player who wants the same game again presses "Back
to start" and then PLAY, with both options already set the way the finished
game was played.

### D13 — The name lives in one constant, and `index.html` keeps a literal

`src/gameName.ts` exports the single on-screen name. `App`'s `<h1>`, the start
screen's title and `Board`'s grid accessible name ("<name> board") read it, so
the three cannot drift and a future branding story has one place to change.
`index.html` is static markup outside the module graph and keeps the literal;
that duplication is accepted rather than pulling in a build-time template for
one word.

Nothing else is renamed. Module names, CSS classes (`.app__title`,
`.board-frame`, and the rest), types and the package all keep their existing
names, per the story's out-of-scope list.

---

## Step 1 — Rules 0.15: fleet size and game length become choices

Status: committed

Notes: Edited `doc/ruleset/rules.md` (§1, §2, §4, §5, §9) to 0.15, added a
`## 0.15` entry to `doc/ruleset/changelog.md`, and bumped `RULES_VERSION` in
`src/rules/rulesVersion.ts`. §4's six- and five-ship layouts are given as edge
tables (the plan's "table" option), each followed by the explicit green/red
bay lists so a later step can check the code against them by eye, plus the
owner-approved minimal reword of §5's aside. `npx prettier --write` was run on
`rules.md` after editing, since the new tables needed column padding; no
content changed as a result. `npm run typecheck`, `npm run lint`, `npm test`
(755 passed) and `npm run format:check` all pass; the only format warning is
the pre-existing one on this story's own `story.md`, noted in the plan as not
this story's to fix.

Edit `doc/ruleset/rules.md`, add a `doc/ruleset/changelog.md` entry and bump
`src/rules/rulesVersion.ts` to `"0.15"`. This is the whole of this step: no
other file changes, and no code implements any of it yet.

**The version line** at the top of `rules.md` becomes `**Rules version: 0.15**`.

**§1 Overview.** "commands a fleet of seven ships" becomes a fleet of **five,
six or seven** ships. Nothing else in §1 changes.

**§2 Words used in these rules.** Under **Round**, "The game lasts 100 rounds"
becomes the chosen length: a game lasts for the number of rounds chosen before
play begins — 30, 50, 75 or 100 — and 30 is the standard game (see §9).

**§4 Ships** is the substantial edit. It keeps its structure — who the players
are, where the fleets start, the symmetry claim, the 0-shields line — and gains
the choice:

- The opening sentence becomes: each player has **five, six or seven** ships —
  the same number for both players, chosen before play begins; **seven is the
  standard game**. Green and red, green takes the first turn, as today.
- The starting position is then given as three layouts. Bays never change
  (§3.1): there are always fourteen, in the same places. What changes is which
  of them hold a ship at the start, and — at five a side — the colours on the
  left and right edges.

  **Seven a side (14 ships).** Today's text, unchanged: every bay holds one
  ship and the two fleets alternate around the edge, clockwise from H15 —
  H15 green, L15 red, O14 green, O10 red, O6 green, O2 red, L1 green, H1 red,
  D1 green, A2 red, A6 green, A10 red, A14 green, D15 red.

  **Six a side (12 ships).** **H15 and H1** — the middle bay of the top edge
  and of the bottom edge — start **empty**. Every other bay holds exactly the
  ship and the colour it holds in the seven-ship game; nothing is recoloured.
  Green: O14, O6, D1, L1, A14, A6. Red: D15, L15, O10, O2, A10, A2.

  **Five a side (10 ships).** **O14, O2, A14 and A2** — the top and bottom bay
  of each four-bay edge — start **empty**, and the colours on those two edges
  are **reversed** from the seven-ship game. The three-bay edges are untouched,
  so the top still reads red-green-red and the bottom still reads
  green-red-green. Green: H15, O10, A10, D1, L1. Red: D15, L15, O6, A6, H1.

  Present each layout the way §4 presents the current one — a short sentence
  and a clockwise list or an edge table, matching the surrounding prose style.
  Both the "green" and "red" lists above must appear (or be unambiguously
  derivable from a table), because they are what the code and its tests are
  checked against.

- **A new, explicit paragraph about the empty bays.** A bay that starts empty
  is an ordinary empty bay in every way. It is not removed from the board and
  it is not reserved: either player may move into it, and **§7.1's random
  return may send a beaten ship to it**. This is the obvious question a reader
  will have and the rules must answer it here. §7.1 itself needs no edit — its
  "there is always somewhere to go" argument only gets stronger with fewer
  ships.
- **The symmetry paragraph stays and widens.** Today it explains the symmetry
  by the even spacing of fourteen bays. Rewrite it to claim the property for
  **all three** layouts: each player's starting fleet is exactly the half-turn
  rotation of the other's, so neither side begins with better ground.
- "Every ship starts with 0 shields" stays.

**§5 Turns and actions.** One aside only: "This should be uncommon — a player
always has seven ships —" becomes "a player always has at least five ships".
The story lists §5 as unchanged; this plan makes the minimal edit anyway,
because the sentence would otherwise state a number the rules no longer
guarantee, and `rules.md` is the source of truth. It is supporting prose, not a
rule: nothing about play changes. **Change nothing else in §5.**

**§9 Ending the game.** The game ends after the number of rounds chosen before
play begins — **30, 50, 75 or 100** rounds, that many turns each — with **30**
the standard game. The rest of §9 is unchanged: most energy wins, equal energy
is a draw.

**Nothing else changes.** §3 (including §3.1's fourteen bays), §6, §7, §8 and
both appendices are untouched. In particular §8.4's "six or seven dormant sites
cost the same 15 that five do" stays exactly as it is: it describes the table's
cap, and remains true.

**`doc/ruleset/changelog.md`** gains a `## 0.15 — …` entry at the top, newest
first, in the style of the existing entries: fleet size becomes a choice of
five, six or seven with seven standard; the three layouts and which bays start
empty; empty starting bays are ordinary bays and can receive a §7.1 return;
game length becomes a choice of 30, 50, 75 or 100 and **the default drops from
100 to 30**; §5's aside re-worded. Say plainly that this is a gameplay change
and that tagging remains on hold.

**`src/rules/rulesVersion.ts`** — `RULES_VERSION` becomes `"0.15"`.

Depends on: nothing. It is first because every later step implements this
document.

Verification (automated): `npm test` passes — `rulesVersion.test.ts` reads the
version out of `rules.md`, asserts it equals `RULES_VERSION`, and asserts the
changelog has an entry for it. Then `npm run format:check`, so the tables and
prose satisfy Prettier. Also re-read the three layouts against the lists in
this step, bay by bay, before committing: every later step is checked against
what the document now says.

---

## Step 2 — `fleet.ts`: the starting fleet becomes a function of fleet size

Status: committed

Notes: `fleet.ts` now exports `FleetSize`, `FLEET_SIZES` (`[5, 6, 7]`),
`DEFAULT_FLEET_SIZE` (7), `isFleetSize`, `MAX_SHIPS_PER_SIDE` (derived via
`Math.max(...FLEET_SIZES)`) and `startingFleet(fleetSize)`, backed by three
internal per-size layout tables transcribed from rules.md §4, in place of the
old flat `STARTING_FLEET`. `energy.ts`'s `SHIPS_PER_SIDE` now reads
`MAX_SHIPS_PER_SIDE` with a doc comment saying it is the maximum, not the
current game's fleet size; `gameState.ts`'s `startingGameState` calls
`startingFleet(DEFAULT_FLEET_SIZE)` as the like-for-like repoint the step
calls for (its two stale `STARTING_FLEET` doc comments are left for step 3,
which the plan explicitly assigns them to). `fleet.test.ts` was reworked
around `describe.each(FLEET_SIZES)` covering the transcription, counts,
one-ship-per-bay/empty-bays, shields, id numbering and half-turn symmetry for
all three sizes, plus a ring-alternation check scoped to seven and five only
(six is false by design per D3, noted in a test comment) — per the
orchestrator's note, since the six-a-side ring is not alternating (dropping
H15 leaves D15 red next to L15 red; dropping H1 leaves L1 green next to D1
green). `energy.test.ts` gained a case pinning the dormant bound to the
maximum fleet (seven prices the same as five, eight still throws). Deviation:
`Board.test.tsx`, `GameOverPanel.test.tsx` and `gameState.test.ts` (the
latter not named by this step, but its import of the removed `STARTING_FLEET`
would otherwise fail to compile) were repointed to a local
`startingFleet(7)`-derived constant rather than the story's named list,
keeping their existing assertions unchanged; `gameState.test.ts`'s fuller
rework to cover multiple fleet sizes is left to step 3 as the plan directs.
`npm run typecheck`, `npm run lint`, `npm test` (770 passed) and
`npm run format:check` all pass.

Rework `src/rules/fleet.ts` so it answers "the starting fleet for a five-, six-
or seven-ship game", and repoint everything that used the old flat constant.

**In `fleet.ts`:**

- Keep `Side`, `ShipId` and `FleetEntry` exactly as they are.
- Add the **fleet-size type** (the union of 5, 6 and 7), an ordered list of the
  **valid values** (smallest first — this is what the start screen will render
  in step 8), the **default** (7), a **type guard** over an arbitrary `number`,
  and the **maximum ships a side can have**, derived from the list of valid
  values rather than written as a literal. Name them in the house style;
  `gameLength.ts` is the module to imitate for tone and doc comments.
- Add an internal table **per fleet size** giving the occupied bays in
  clockwise order from H15 with the side occupying each. Transcribe them from
  §4 (repeated in step 1 above); do not derive one from another (**D3**).
- Export a function from fleet size to the starting fleet: `FleetEntry` values
  in the table's clockwise order, every ship on **0 shields**, ids `green-N` /
  `red-N` numbered 1..N per side with no gaps, in that same order. The
  parameter is the fleet-size union, so no runtime check is needed here.
- **Remove `STARTING_FLEET`.** Update the module header comment, which
  currently says "seven ships a side".

**In `src/rules/energy.ts`:** replace the local `SHIPS_PER_SIDE` derivation
from `STARTING_FLEET` with the maximum imported from `fleet.ts`, and rewrite
its doc comment to say it is the **most** ships a side can ever have, not the
number a side starts with (**D4**). The range check itself and every other line
of `energy.ts` are unchanged.

**In `src/rules/gameState.ts`:** `startingGameState` still builds a seven-ship
game — call the new function with the default fleet size. The fleet-size
parameter arrives in step 3; this step is a like-for-like repoint so the
build stays green.

**Test call sites** that imported `STARTING_FLEET` — `src/board/Board.test.tsx`
and `src/hud/GameOverPanel.test.tsx` — take the seven-ship fleet from the new
function instead. Their assertions do not otherwise change.

**`src/rules/fleet.test.ts`** is reworked to cover all three layouts:

- Each layout matches its transcription from §4, square by square and colour by
  colour, in clockwise order — the definitive test, and the one that catches a
  mis-set bay.
- Counts: 14 / 12 / 10 ships, evenly split between the sides.
- Every ship stands on a **bay** (checked against `BAYS`), one ship per bay,
  and no bay holds two.
- Every ship starts on **0 shields**, and each shield count is a valid
  `ShieldCount`.
- Ids are distinct, `green-N` / `red-N`, numbered 1..N per side with no gaps,
  ascending in fleet-list order — for **all three** sizes.
- **Half-turn symmetry for all three:** rotating each entry's square 180°
  (column index `14 - i`, row `16 - r`) lands on a ship of the **other** side.
- The existing "alternates sides around the clockwise ring" test is kept for
  the **seven-** and **five-**ship layouts only. It is false for six a side by
  design — see **D3** — and a short comment in the test should say so, so a
  later reader does not "fix" it.

**`src/rules/energy.test.ts`** gains a case pinning the bound to the maximum
fleet: pricing seven dormant sites returns the same value as five and does not
throw, and a count above seven still throws a `RangeError`.

Depends on: Step 1 (§4 now states the three layouts this step transcribes).

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
pass. The new `fleet.test.ts` cases fail if any bay, colour, id or shield count
in any of the three layouts is wrong, and the symmetry case fails if a layout
loses its half-turn property. No behaviour visible in the app changes at this
step.

---

## Step 3 — `startingGameState` takes a fleet size

Status: committed

Notes: `startingGameState` gained a third parameter, `fleetSize: number`,
defaulting to `DEFAULT_FLEET_SIZE` and validated with `isFleetSize`, throwing
a `RangeError` naming the bad value (mirroring the `lengthInRounds` check);
it is used to pick the starting fleet via `startingFleet(fleetSize)` and is
not stored on `GameState`. Rewrote the two stale doc comments — `GameState
.ships` no longer names the removed `STARTING_FLEET` and now points at
`startingFleet`'s clockwise order, and `startingGameState`'s comment
explains the fleet size is derived from `state.ships`, not stored, per the
orchestrator's note flagging both as leftover from step 2. `gameState.test.ts`
gained cases for five- and six-ship games (ships on the right layout's bays),
the seven-ship default re-expressed against `startingFleet(DEFAULT_FLEET_SIZE)`,
0-shields for all three sizes, and `RangeError` for 4, 8 and 6.5.
`npm run typecheck`, `npm run lint`, `npm test` (776 passed) and
`npm run format:check` all pass. No deviation from the plan.

Give `startingGameState` a third parameter, after the seed and the length: the
fleet size, typed `number`, defaulting to the fleet-size default from
`fleet.ts`, validated with the type guard and throwing a `RangeError` naming
the bad value when it is not 5, 6 or 7 — the same shape as the existing
`lengthInRounds` check (**D5**). Use it to pick the starting fleet.

Rewrite the two doc comments that are now wrong: the one on `startingGameState`
that says "the fourteen `STARTING_FLEET` ships", and the one on
`GameState.ships` that says "in `STARTING_FLEET` order" (it is now the starting
fleet's clockwise order). Say explicitly in the `startingGameState` comment
that the fleet size is **not** stored on the state — `state.ships` is the
record of it — and that, like the length, it is fixed for the game's lifetime.

**No new `GameState` field** (settled decision 2).

**`src/rules/gameState.test.ts`** gains: a five-ship game has ten ships on the
five-a-side bays with the right colours; a six-ship game has twelve on the
six-a-side bays; the default is still seven a side; every ship starts on 0
shields whatever the size; and 4, 8, 6.5 and a non-integer each throw a
`RangeError`. Its existing "fourteen ships matching `STARTING_FLEET` entry for
entry" test is re-expressed against the seven-ship fleet from step 2.

Depends on: Step 2 (the fleet-size type, the guard and the layout function).

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
pass, with the new `gameState.test.ts` cases present. Nothing in the app
constructs a smaller game yet, so nothing visible changes.

---

## Step 4 — Smaller fleets play, end to end

Status: committed

Notes: Widened `playFullGame` with an optional `fleetSize` parameter
(default `DEFAULT_FLEET_SIZE`), passed straight to `startingGameState`, and
added seven cases to `src/rules/fullGame.test.ts`: a five- and a six-a-side
game each playing thirty rounds to its end with the energy ledger balancing;
occupancy checks that a five-ship game's H15 is occupied and O14/O2/A14/A2
are empty (likewise L15 occupied and H15/H1 empty for six), each paired with
a `legalDestinations` check that a ship relocated within reach of one of the
empty bays can move into it; a fight built directly (via a new
`shipsFillingBaysExcept` helper filling every other bay with filler ships) in
which the loser's return, reached through `applyAttack`, is asserted to land
in one of the bays empty at the start, for both five- and six-ship games; and
a five-ship, five-dormant-site state run through `runEndOfTurn` directly,
asserting no throw, as the regression for D4. `seededReplay.test.ts` and the
existing seven-a-side `fullGame.test.ts` cases were checked, not assumed
(D9): both still pass unchanged, since the new cases are additive and
`playFullGame`'s default fleet size keeps the seven-a-side stream identical.
`npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test`
(783 passed) all pass. No deviation from the plan.

Prove a smaller game is a real game, not just a constructible one. This is the
step that guards the two things most likely to break quietly: `energy.ts`'s
dormant-site bound, and the assumption that every bay starts occupied.

In `src/rules/fullGame.test.ts`, whose `playFullGame(seed, lengthInRounds)`
helper already plays a whole game through the public rules API with a
deterministic policy, widen the helper to take a fleet size and add cases:

- **A five-a-side game plays from ply 1 to its end with no error**, at a short
  explicit length (keep it short enough to stay fast; the existing tests are the
  guide for how long is acceptable). The energy ledger it already checks must
  still balance.
- **A six-a-side game likewise.**
- **A bay that starts empty is an ordinary bay.** Assert directly that in a
  five-ship game H15 is occupied and O14, O2, A14, A2 are empty at ply 1; that a
  ship can legally move into one of the empty bays (via `legalDestinations`);
  and that §7.1's random return can place a beaten ship there — reach the
  return through the existing rules API by setting up a fight whose loser
  returns, and assert only that the chosen bay is drawn from the empty bays,
  since which one is a seeded draw. A six-ship game gets the same treatment for
  H15 and H1.
- **A five-ship game whose side occupies five dormant sites settles with no
  throw.** Build the position directly (a state with five dormant sites, each
  under one of that side's ships) and run the end-of-turn sequence. This is the
  regression test for **D4**; it must fail if `energy.ts`'s bound is ever
  re-pinned to the current game's fleet size.

Do **not** re-parameterise the existing seven-a-side cases or
`src/rules/seededReplay.test.ts`: a smaller fleet legitimately produces a
different seeded stream (§7.1 draws against a different set of empty bays), so
the smaller games get their own cases (**D9**).

Depends on: Step 3 (`startingGameState` can build a smaller game).

Verification (automated): `npm test` passes with the new cases. A regression in
the dormant bound, in the layouts, or in the treatment of empty bays fails at
least one of them.

---

## Step 5 — The default game length becomes 30, and the offered lengths get a name

Status: committed

Notes: `DEFAULT_GAME_LENGTH_ROUNDS` is now 30, and `gameLength.ts` gains
`GAME_LENGTH_OPTIONS_ROUNDS` (`[30, 50, 75, 100]`) with a doc comment saying
it constrains the screen, not `isGameLengthRounds`, which is unchanged.
Re-anchored the known 200/201 sites to 60/61 in `gameLength.test.ts`,
`movement.test.ts`, `combat.test.ts`, `ply.test.ts` and `session.test.ts`
(all built from a `buildState`/`stateWith` helper defaulting to
`DEFAULT_GAME_LENGTH_ROUNDS`); left the two 200-count loop bounds in
`combat.test.ts` and `ply.test.ts` untouched since they are iteration
counts, not plies. `RoundCounter.test.tsx`'s "35/100" cases were made
explicit hundred-round games (`atPly(69, 100)` etc.) rather than re-anchored,
keeping their wording; its "reads against a shorter game's own length"
case already covers "the counter reads the state's own length". Same
treatment for `announcements.test.ts`'s one default-length "35/100" case,
re-anchored instead to `20/30` at ply 39 since its point was specifically
"a default-length game's own length" rather than a fixed 100.
`App.test.tsx`'s opening round counter now reads `1/30`. Deviation: the full
suite additionally surfaced `src/hud/Hud.test.tsx`, not named in the plan's
known-sites list, whose "35/100" case also defaulted to
`DEFAULT_GAME_LENGTH_ROUNDS`; re-anchored the same way as `RoundCounter.test.tsx`
by making the length explicit (`startingGameState(1, 100)`), per the step's
own instruction to run the whole suite and fix what it surfaces.
`seededReplay.test.ts` and `fullGame.test.ts` were checked and needed no
change — both already build at explicit lengths. `npm run typecheck`,
`npm run lint`, `npm run format:check` and `npm test` (785 passed) all pass.
The `npm run dev` courtesy check was not run interactively; `App.test.tsx`'s
passing `1/30` assertion covers the same claim.

In `src/rules/gameLength.ts`:

- `DEFAULT_GAME_LENGTH_ROUNDS` becomes **30**, with its doc comment still
  pointing at §9.
- Add a named, ordered list of the lengths the start screen offers — **30, 50,
  75, 100** — beside the default, so the screen renders the rules' own numbers
  rather than its own copy. Its doc comment must say what it is _not_: a
  restriction on what a state may hold.
- `isGameLengthRounds` is **unchanged** (**D7**).

Then re-anchor the tests that used the old default's boundaries (**D8**). Known
sites, all of which must end up saying what they were written to say:

- `src/rules/gameLength.test.ts` — asserts the default's value (now 30); its
  `isGameOver` and `gameResult` cases built from `startingGameState(SEED)` at
  plies 200/201 become 60/61; `pliesForGameLength(100)` is about an explicit
  hundred-round game and stays.
- `src/rules/movement.test.ts`, `src/rules/combat.test.ts`,
  `src/rules/ply.test.ts`, `src/game/session.test.ts` — their state builders
  default to `DEFAULT_GAME_LENGTH_ROUNDS`, and their game-over cases use plies
  200/201; re-anchor to 60/61. Cases that set an explicit `lengthInRounds` are
  already correct and must not be touched.
- `src/hud/RoundCounter.test.tsx` and `src/board/announcements.test.ts` — the
  round-counter cases that read "35/100" and "Round 35 of 100." Either state
  the length explicitly as 100 and keep the wording, or re-anchor to a ply
  inside a thirty-round game; keep at least one case that proves the counter
  reads the state's **own** length rather than a constant.
- `src/App.test.tsx` — the opening round counter reads `1/30`.

Then run the whole suite and fix any other test the change surfaces the same
way. Check `src/rules/seededReplay.test.ts` and `src/rules/fullGame.test.ts`
rather than assuming: they play at explicit lengths and should be untouched by
this change. **If a recorded expectation in either moves, stop and understand
why before changing a number** (**D9**).

Depends on: Step 1 (§9 now offers these lengths and makes 30 standard).

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
pass. Then run the app (`npm run dev`) — this is a courtesy check, not the
step's gate — and see the round counter open at `1/30`.

---

## Step 6 — The `new-game` intent carries the fleet size

Status: committed

Notes: `SessionIntent`'s `new-game` variant gained a required `fleetSize:
FleetSize` field, and `sessionReducer` now passes it straight through to
`startingGameState`; the doc comments on both were updated to say it carries
all three. `App.tsx`'s `handlePlayAgain` dispatch was updated to pass the
finished game's own fleet size via a new local `fleetSizeOf(state)` helper
that counts green ships in `state.ships` and narrows with `isFleetSize`,
throwing if the count is somehow not 5/6/7 (it never is in real play).
`GameOverPanel.test.tsx`'s harness dispatch, however, could not use the same
derivation: its hand-built `nearEndState`/`scoringNearEndState` fixtures are
minimal stand-ins (one or two ships, all one side, zero green ships), not
real fleets, so counting green ships would throw. Its "play again" test
already asserts a full seven-ship game reappears afterwards, so the harness
passes `DEFAULT_FLEET_SIZE` instead — a deviation from the plan's literal
"derived from `state.ships`" wording for this one call site, needed because
that derivation is inapplicable to the test's deliberately minimal states.
`session.test.ts` gained `fleetSize: DEFAULT_FLEET_SIZE` on its three
existing `new-game` dispatches (now required by the type) and a new
`it.each([5, 6, 7])` case asserting the resulting session's ships match
`startingFleet(fleetSize)`'s squares and counts per side, while still
honouring the given seed and length. `npm run typecheck`, `npm run lint`,
`npm run format:check` and `npm test` (788 passed) all pass.

In `src/game/session.ts`, the `new-game` intent grows a **fleet-size** field
beside the `randomSeed` and `lengthInRounds` it already carries, typed as the
fleet-size union from `fleet.ts`. The reducer passes all three to
`startingGameState`. Update the intent's doc comment, which today says
`new-game` "carries both the seed and the length": it now carries all three and
still never draws a seed or reaches for a default itself.

The reducer keeps its shape: intent in, session out, pure, and it is **handed**
a fleet size — it never chooses one (settled decision, story section 5).

Update `src/App.tsx`'s existing `new-game` dispatch and
`src/hud/GameOverPanel.test.tsx`'s harness dispatch to pass a fleet size, so
the build stays green: both pass the finished game's own fleet size, derived
from `state.ships` (the count of one side's ships) — App's real wiring arrives
in step 9.

`src/game/session.test.ts` gains cases: `new-game` with each of 5, 6 and 7
produces a session whose state has that many ships a side on the right bays,
and still honours the seed and the length it is given.

Depends on: Step 3 (`startingGameState` accepts a fleet size), Step 2 (the
type).

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
pass with the new `session.test.ts` cases.

---

## Step 7 — The name on screen becomes GREED

Status: pending

Add `src/gameName.ts` exporting the single on-screen name constant, with a doc
comment saying it is the **on-screen** name only — a working title — and that
the repository, the package and the documents keep the name Base Control
(**D13**). Point three places at it:

- `src/App.tsx`'s `<h1>`.
- `src/board/Board.tsx`'s grid label, currently the literal `"Base Control
board"`, which is the board's accessible name and is player-facing.
- (The start screen's title, in step 8.)

`index.html`'s `<title>` becomes `GREED`, as a literal — it is outside the
module graph.

Update `src/App.test.tsx`'s heading assertion and any assertion in
`src/board/Board.test.tsx` (and elsewhere, if the full suite finds one) that
names the grid. Prefer asserting against the imported constant rather than
re-typing the string, so a future rename moves one line.

**Nothing else is renamed**: not the repository, the package, `README.md`,
`CONTRIBUTING.md`, `CLAUDE.md`, `doc/ruleset/rules.md`, any module, type or CSS
class (`.app__title` keeps its name).

Depends on: nothing in steps 2-6, but sequenced here so the start screen in
step 8 can read the constant rather than inventing its own literal.

Verification (automated): `npm test`, `npm run typecheck` and `npm run lint`
pass. Then confirm the name appears nowhere it should not: search the
repository for the on-screen name and check every hit is one of the four
above (`gameName.ts`, `App.tsx`, `Board.tsx`, `index.html`) or a test asserting
them, and that `README.md`, the rules and the package still say Base Control.

---

## Step 8 — The start screen component

Status: pending

Add `src/start/StartScreen.tsx` and `src/start/StartScreen.css`. Nothing
renders it yet — this step builds the screen, step 9 wires it (scaffolding
before behaviour).

**What it renders**, inside the cabinet frame `App` already provides:

- The game's name from `src/gameName.ts`, as the page's `<h1>`, in the marquee
  position and treatment the in-game title uses — same tokens, its own class
  (**D10**).
- **Two option groups**, each a `fieldset` with a `legend`: **"Ships"** with the
  values from `fleet.ts`'s valid-values list (5, 6, 7), and **"Rounds"** with
  the values from `gameLength.ts`'s offered-lengths list (30, 50, 75, 100). The
  screen must not hard-code either set of numbers. Each value is a visually
  hidden `input type="radio"` with a styled `label`; the selected one must be
  unmistakable at a glance (the loud, filled treatment — the unselected ones
  quiet), and the focus ring must be visible on the focused label using the
  existing `--focus-ring` token. Scope the radio `name` attributes with
  `useId`.
- **A PLAY button** (`type="button"`), visually the loudest thing on the
  screen: bigger and brighter than the option labels, in the arcade face.
  `GameOverPanel.css`'s play-again button is the nearest existing treatment to
  build up from.

**Its props** (controlled — **D10**): the currently selected fleet size, the
currently selected length, a change handler for each, and `onPlay`. It holds no
state of its own beyond the ids it generates, and it dispatches nothing:
changing an option calls a handler and starts no game.

**Styling** reuses the existing palette and tokens from `index.css` — no new
colours, no new font, no new visual language. The root element fills the
cabinet the way `.game-over-panel` does (`display: flex; flex: 1; min-height:
0; width: 100%`, centred column, gap), so the screen sits in the same box the
board sits in.

**`src/start/StartScreen.test.tsx`** (new, jsdom, following
`CONTRIBUTING.md`'s recipe — `// @vitest-environment jsdom` first line,
`@testing-library/jest-dom/vitest` imported, `afterEach(cleanup)`):

- Renders the name as a level-1 heading.
- Renders both groups with their three and four values, and marks the passed-in
  values as the checked ones.
- Choosing a different value calls the matching change handler with that value
  and **not** `onPlay`.
- Pressing PLAY calls `onPlay` once.

Do not add an accessibility-specific test (`CLAUDE.md`). If the axe check that
other component tests run is trivially added alongside, that is fine, but no
step owes one.

Depends on: Step 2 (the fleet-size values), Step 5 (the offered lengths), Step
7 (the name constant).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` pass with the new test file. The app itself is
unchanged — the screen is not yet rendered anywhere.

---

## Step 9 — Wiring: `App` owns the screen and the two options

Status: pending

Make the start screen the app's front door and the game-over panel the way back
to it.

**`src/App.tsx`:**

- Add state for which screen is showing (`"start"` or `"game"`, starting at
  `"start"`), the selected fleet size (starting at `fleet.ts`'s default, 7) and
  the selected length (starting at `DEFAULT_GAME_LENGTH_ROUNDS`, 30). The two
  options live here so they survive a finished game (**D11**).
- Keep the existing `useReducer` over `sessionReducer`. Update
  `createStartingSession`'s doc comment to say what it now is: the reducer's
  initial value, never shown, replaced by the first PLAY.
- **PLAY** dispatches `new-game` with a fresh seed (`freshSeed()`), the selected
  length and the selected fleet size, then switches the screen to `"game"`.
- `handlePlayAgain` becomes **`handleReturnToStart`**: it switches the screen
  back to `"start"` and does nothing else — no dispatch, no new seed, no
  option reset.
- Render: on `"start"`, the `StartScreen` inside `.app__cabinet` with the two
  values and their setters; on `"game"`, exactly what is rendered today (the
  title, HUD and board, swapped for `GameOverPanel` once the game is over and
  the score roll has settled).
- There is **no** route from a game in progress back to the start screen: no
  quit, no restart, no settings. The only two ways to the start screen are
  opening the app and finishing a game.

**`src/hud/GameOverPanel.tsx`:** the prop becomes `onReturnToStart` and the
button reads **"Back to start"** (**D12**). The heading, the scores and the
hidden result sentence are unchanged.

**Tests:**

- `src/App.test.tsx` is reworked around the new front door: opening the app
  shows the start screen — the name, both option groups with 7 and 30 selected,
  and a PLAY button — and **no board and no HUD**; pressing PLAY with the
  defaults shows the board with the round counter at `1/30` and fourteen ships;
  pressing PLAY after choosing 5 ships shows ten ships. Its existing
  in-progress assertions (turn indicator, score sentences, no result panel)
  move behind a PLAY press. Use `@testing-library/user-event`, as the other
  interaction tests do.
- `src/hud/GameOverPanel.test.tsx`: the button's accessible name is "Back to
  start", and pressing it calls the handler. Its "wired into the board" harness
  mirrors `App.tsx`, so update it to mirror the new wiring — the button returns
  to a start screen rather than dealing a game — or narrow it to what it is
  really testing if mirroring the whole app becomes unwieldy; say which was
  done in the step's Notes.
- A test that a finished game returned to the start screen still shows the
  options the game was played with (choose 5 and 50, play a one-round game to
  its end, press "Back to start", and see 5 and 50 still selected) is the
  clearest single proof of the story's central wiring claim; add it to
  `src/App.test.tsx` if it can be driven through the real app (a short game
  length makes it cheap), and record in the Notes if it could not.

If any of this costs an accessible behaviour that exists today — focus landing
somewhere sensible when a screen swaps, for instance — do not spend the story
repairing it; record it as a note in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, per `CLAUDE.md`.

Depends on: Step 8 (the screen), Step 6 (the intent carries the fleet size),
Step 5 (the default length and the offered lengths), Step 7 (the name).

Verification (automated): `npm test`, `npm run typecheck`, `npm run lint` and
`npm run format:check` pass, with the reworked `App.test.tsx` and
`GameOverPanel.test.tsx`. This is the step after which the story's behaviour is
complete; the owner's own check of it is step 11.

---

## Step 10 — `README.md`

Status: pending

`README.md` keeps the name **Base Control** (story, section 6) and updates what
it says about the game and the app:

- The opening paragraph's "a fleet of seven ships" becomes a fleet of **five,
  six or seven**, a choice made before play.
- The **Status** note currently says opening the app shows the board in its
  starting position "with all fourteen ships lined up in their bays". That is
  no longer what a player meets: the app opens on a **start screen** carrying
  the game's name, a choice of ships a side (5, 6 or 7, default 7), a choice of
  length (30, 50, 75 or 100 rounds, default 30) and a PLAY button; the board
  arrives when PLAY is pressed; and finishing a game leads back to that screen
  with the same choices still set. Say it in player-facing language, in the
  Status note's existing voice.
- Anywhere the README says a game is a hundred rounds, it is now thirty unless
  a player asks for more.

Run `/update-readme` for the rest of the branch diff and fold in what it
proposes. Do not rename the game in the README, and do not describe the
on-screen title change: the README is not the place for a working title
(section 6, out of scope).

Depends on: Steps 1-9 (the README describes the finished behaviour).

Verification (automated): `npm run format:check`, `npm run lint` and `npm test`
pass, and re-read the changed paragraphs against the app as built: every claim
in them is something a player can now see.

---

## Step 11 — Owner play-through

Status: pending

The owner runs the app (`npm run dev`) and confirms the story's own
verification list. This is the story's manual gate; nothing here is automated,
and no fixture or script is built for it (settled decision 6).

1. Opening the app shows the **start screen**, not a board: the name **GREED**,
   both option groups with **7** and **30** selected, and a PLAY button that is
   plainly the loudest thing on the screen.
2. Both option groups can be changed with the mouse and with the keyboard, and
   the selected value is unmistakable at a glance.
3. Changing an option starts nothing — the board does not appear until PLAY.
4. PLAY with the defaults deals a seven-a-side, thirty-round game: fourteen
   ships, one per bay, and the round counter reads **1/30**.
5. Choosing **5 ships** and pressing PLAY deals exactly the five-a-side layout:
   ten ships; **O14, O2, A14, A2 empty**; **green** on H15, O10, A10, D1, L1;
   **red** on D15, L15, O6, A6, H1.
6. Choosing **6 ships** deals exactly the six-a-side layout: twelve ships;
   **H15 and H1 empty**; every other bay holding the same colour it holds in a
   seven-ship game.
7. Choosing **50, 75 or 100 rounds** produces a game whose counter reads
   `N/50`, `N/75`, `N/100` throughout.
8. In a five- and a six-ship game, a bay that started empty can be moved into,
   and can receive a beaten ship from §7.1's draw.
9. A five-ship game plays to its end with no error, including a turn on which a
   side occupies dormant sites.
10. Finishing a game and pressing the panel's **Back to start** button returns
    to the start screen with the finished game's options still selected;
    pressing PLAY again deals a fresh game of the same shape from a different
    seed.
11. The name reads **GREED** on the start screen, on the game screen and in the
    browser tab — and the README, the rules document and the repository still
    say Base Control.
12. There is no way out of a game in progress: no quit, no restart, no settings.

Depends on: Step 10 (the whole story is built).

Verification (manual): the owner confirms each of the twelve observations above
in a running app and says so. Anything that fails comes back as a fix to the
step that owns it, not as a patch here.
