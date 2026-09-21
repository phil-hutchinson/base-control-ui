# Implementation Plan — Story 00000097, Planet bonuses

## What this story does

Today all twelve planets (rules.md §3.1) are alike: a ship standing on one at
the end of its owner's turn recovers power, and that is the whole of what a
planet gives. A player sending a tired ship to recover picks whichever planet
is nearest, and there is nothing else to weigh.

This story adds an eighth pre-play choice, **`Planet bonus`** — **OFF**,
**2 POINTS** or **3 POINTS** — and, when it is on, deals **each player three
of the twelve planets at random**. The first time one of that player's ships
**lands** on one of that player's three, the player is paid the chosen amount
**immediately**, as the landing resolves, not at the end of the turn with the
node collection. Each planet pays each player at most once; the two players'
sets are drawn independently and may overlap, and a shared planet pays both
players independently, in either order.

Both sets are visible to both players from the start, in a **new panel above
the clocks**: three planet drawings a side, each drawn with the same artwork
the board carries on that square. A claim puts a player-coloured `+2` or `+3`
over its drawing for one ply — so green's claim is on screen through red's
reply — and then settles into a player-coloured checkmark for the rest of the
game. With the setting OFF the panel is not rendered at all.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions and the rejected alternatives, because code in this
repository deliberately carries no design history (`CONTRIBUTING.md`,
"Comments").

## Baseline on this branch

Branch `feat/97-planet-bonuses`, clean at the start of planning (`story.md`
already committed).

- `npm test` — **73 test files, 1455 tests, all green**.
- `npm run typecheck`, `npm run lint` and `npm run format:check` — all clean,
  with **no** pre-existing warnings. Every step must leave them that way; if a
  step's own edit trips `format:check`, run `npx prettier --write` on the files
  that step touched (including this plan file, if an edit to it flags).

The test count will **rise** over this story. No step may lower it.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI,
  the live region and `README.md` say (`CLAUDE.md`, Vocabulary). Do not mix
  them.
- **Move** is the movement action specifically — one ship changing squares —
  never a synonym for a turn or a ply.
- **Landing** is a ship arriving on a square and staying there: the end of a
  move (including a deliberate return to a planet, §7.2) and each of the two
  placements a fight makes (§7.1). Flying over is not landing.
- The player-facing words for the new setting are **OFF**, **2 POINTS** and
  **3 POINTS**. Those three uppercase strings are start-screen chrome and live
  on the start screen. The code word is `planetBonus`, whose values are the
  lowercase `"off"`, `"two"` and `"three"`.
- A **bonus planet** is an ordinary planet that also pays once. It is not
  owned, not marked on the board, and not named anywhere.
- The Quick Guide has its own knowing vocabulary exception: it says **points**
  and **fuel** where the rest of the app says energy and power
  (`src/guide/guideCopy.ts` header). Copy added to the guide follows the
  guide's words; copy added anywhere else follows the app's.
- Since rules version 0.32 `rules.md` **names no default and no "standard
  game"** for any option. Which setting the app preselects is purely an app
  matter. Do not reintroduce "default" language into `rules.md`.

## Settled decisions — do not reopen

These come from `story.md` and the owner's discussion around it. A step that
finds one inconvenient escalates to the owner rather than re-deciding.

- **S1. One choice, three settings**: OFF, 2 POINTS, 3 POINTS, the same for
  both players, chosen before play and fixed for the game's lifetime. No
  per-player amount, no mid-game toggle, no fourth setting.
- **S2. The app preselects OFF**, so the game a player gets without touching
  anything is the game they get today. `rules.md` names no default.
- **S3. Three planets a side, drawn at random from the twelve**, distinct
  within a side, the two sides drawn **independently** so the sets may overlap
  in any number from none to all three. **No balancing** — no constraint that
  a side's three sit in its own half, or spread across the board. The
  asymmetry that follows is the asymmetry the option has.
- **S4. A bonus pays once per player per planet**, the first time one of that
  player's ships lands there, and never again however often that player's
  ships return.
- **S5. Landing is landing, however the ship got there** — the end of a move,
  a deliberate return (§7.2), and a ship placed on a planet by a fight (§7.1),
  attacker or defender alike. Flying over is not landing, and being near is
  not landing.
- **S6. The payment is immediate**, made as part of the landing, before
  anything else in the turn. It takes no step in the end-of-turn order
  (§8.6), and `endOfTurn.ts` does not change.
- **S7. Nothing else about a planet changes**: recovery at the §3.1 rate, the
  protection from attack, planets not being owned, which twelve squares are
  planets, and §3.2's placement constraints. Nothing about node collection or
  the scoring setting changes, and nothing subtracts energy.
- **S8. A claim is not a rotation trigger and never suppresses one.** Under
  the planet rotation setting a landing rotates the priorities exactly once,
  whether or not that landing also claimed a bonus.
- **S9. No marking on the board of any kind** — no tint, no badge, no `+N` at
  the planet square, nothing in the accessible grid. The panel is this story's
  whole visualisation.
- **S10. A panel planet is identified by its drawing alone** — no square name,
  no label, no number. Nothing else in the app names an individual planet, and
  this story is not the place to start.
- **S11. The panel is not rendered at all when the setting is OFF** — no empty
  row, no greyed placeholder, no reserved space. With OFF the game screen is
  what it is today.
- **S12. The board must not get smaller.** The clock region stays held to
  `--region-extent` and stays the mirror of the info region; the panel fits
  inside that extent alongside the clocks.
- **S13. When a claim's `+N` gives way to the checkmark, the planet drawing
  stays put.** Only the badge changes; the drawing never moves or disappears.
- **S14. The rules edit is its own commit, ahead of the code**: `rules.md`
  0.37 → 0.38, `RULES_VERSION` to match, **one** `changelog.md` entry. **One
  version bump for the whole branch** — if a later step finds more wording to
  correct in `rules.md`, it folds into 0.38's entry and does not add a second
  bump or a second version.
- **S15. Tagging stays on hold** even though this is a gameplay change
  (`CLAUDE.md`). Bump the version, write the changelog entry, **do not tag**
  and do not run `/tag-rules`.
- **S16. No accessibility repair steps, no review fixtures, no manual test
  scripts** (`CLAUDE.md`, pre-release stance; the owner drives manual testing
  himself). Where an existing automated test has a straightforward path to
  being updated, update it. What is knowingly given up is recorded in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md` (D13). Manual
  verification never asks the owner to check live-region wording — the
  automated suite covers that.
- **S17. Restyling the start screen is out of scope.** The eighth group is
  added in the existing shape, with the existing `OptionChoice` and no new
  styling. If eight groups do not fit a short landscape window, that is a
  **finding for the owner**, not a layout pass this story takes on.
- **S18. Nothing is retuned** against the extra energy: node rates, node
  lifetimes, countdowns, fleet sizes, game lengths and the clock all stand.
- **S19. No other kind of planet bonus** — no recurring payment, no power
  bonus, no first-to-arrive-takes-it. One payment, once, per player, per
  planet.
- **S20. No backwards compatibility** for games recorded under 0.37
  (`CLAUDE.md`).

## Decisions this plan makes

Each of these is a decision the story left to the plan, with the alternatives
that were considered and rejected. They are recorded here because the code
carries no design history.

**D1. `src/rules/planetBonus.ts` is a leaf option module**, in the exact shape
`scoring.ts`, `nodeRotation.ts`, `combatSetting.ts` and `clock.ts` already
use: a `PlanetBonusSetting` union of the three lowercase strings, a
`PLANET_BONUS_SETTINGS` array in start-screen order (off first, so leftmost is
what the app preselects), `DEFAULT_PLANET_BONUS` of `"off"`, an
`isPlanetBonusSetting` guard, and `planetBonusPoints(setting)` returning 0, 2
or 3. It imports nothing from `src/rules`, knows nothing about a game state,
and does not hold the OFF / 2 POINTS / 3 POINTS wording — that is start-screen
chrome.

- _Rejected: a numeric setting (`0 | 2 | 3`)._ It conflates the choice with
  the payout, makes "off" a magic zero on the start screen, and breaks the
  validation path every other string-valued option uses.
- _Rejected: a boolean "on" plus a separate amount option._ Two option groups
  where the story asks for one.

**D2. The deal lives in its own rules module, `src/rules/bonusPlanets.ts`.**
It exports one function that draws both sides' three planets from a seed and
returns them with the seed it left behind. It may import `board.ts`,
`planets.ts`, `fleet.ts` and `random.ts`; it must **not** import
`gameState.ts` — its caller reads what it needs off its own state, exactly the
arrangement `rotators.ts`/`placeRotators` has.

- _Rejected: putting the deal in `planetBonus.ts`._ That module is a leaf
  holding pure data about a choice; a seeded draw over board squares is a
  different responsibility and would drag `random.ts` and `planets.ts` into
  the option module every other option module keeps clear of.
- _Rejected: dealing inline inside `startingGameState`._ The distinctness rule
  and the fixed draw order deserve their own unit tests, and `placeRotators`
  is the precedent for keeping a seeded draw out of the state constructor.

**D3. The draw order is fixed: green's three, then red's.** Within a side each
of the three draws is uniform over the planets that side has not already
drawn, so a side never draws the same planet twice; across sides the pools are
independent, so the sets may overlap. Exactly **six** seed steps are consumed
when the setting is on. The stored triples are in **board order**
(`ALL_SQUARES` order), sorted after the draw — sorting consumes nothing, and
board order is what the panel reads, whereas draw order is a fact nobody
wants. Fixing the order is what lets a recorded game deal identically, the
same reason §7.1 fixes which fighting ship is placed first.

**D4. Nothing is drawn when the setting is off, and the deal happens last.**
In `startingGameState` the bonus deal runs **after** the opening board deal
and after the rotator draw, and **only** when the setting is on. An OFF game
therefore consumes exactly the randomness it consumes today, its opening
position is bit-for-bit what it is now, and `seededReplay.test.ts` keeps its
recorded expectations untouched.

**D5. `GameState` carries two new required fields.**

- `planetBonus` — the setting, because it cannot be derived from a board,
  exactly as `scoring` and `combatEnabled` cannot.
- `bonusPlanets` — the deal: a record keyed by side, each holding that side's
  three entries; an entry is a square plus **the ply it was claimed on**,
  absent/undefined until claimed. Both lists are empty when the setting is
  off.

Storing the **ply**, not a boolean, is what makes the panel's one-ply `+N`
window a pure function of the state: no timer, no component state, no
event-diffing hook, and a game replayed from its seed shows the same badge at
the same moment.

- _Rejected: a boolean plus a "just claimed" flag held in the UI._ It needs a
  timer or a hook that watches the session's last event, and it does not
  replay.
- _Rejected: making the two fields optional to spare the test churn._ Every
  other pre-play setting is a required field, and an absent deal would be
  ambiguous between "the setting is off" and "nobody dealt yet". Adding them
  as required means every hand-built `GameState` literal in the suite (about
  two dozen files, most with a single builder helper) gains two lines; the
  typechecker lists them all, and the churn is mechanical.

**D6. One helper in `src/rules/ply.ts` pays the bonus**, modelled exactly on
the existing `rotateForLanding`: a state, a side and the square a ship has
just landed on go in; a new state and an optional effect come out, and the
helper does nothing at all when the setting is off, when the square is not one
of that side's three, or when that side has already claimed it. `applyMove`
calls it once, with the move's destination. `applyAttack` calls it twice —
attacker's return planet first, then the defender's — threading the state from
the first call into the second. One helper, so the two roads cannot drift.
Nothing in `endOfTurn.ts` changes (S6).

**D7. Effect order at a landing: the claim comes before that landing's
rotation, and a fight's landings stay grouped.** A move's effect list reads:
`node-spent` (if any), `planet-bonus-claimed` (if any), `queue-rotated` (if
any), then the end-of-ply effects. A fight's reads: `fight-resolved`, then the
attacker's claim and the attacker's rotation, then the defender's claim and
the defender's rotation, then the end-of-ply effects. The payment is part of
the arrival and the rotation is that arrival's consequence for the board, so
the claim leads; keeping each landing's own consequences together is also how
the code threads its state, and it satisfies the story's requirement that a
fight raises the attacker's claim before the defender's.

**D8. `planet-bonus-claimed` carries the side, the square and the amount, and
nothing else** — in particular no running total, unlike `energy-collected`.
The effect is raised mid-ply, so a total carried on it would be a total a
player never sees quoted anywhere; the end-of-turn collection lands on top of
it moments later. The live region's sentence therefore names the amount and
not a total.

**D9. The `new-game` intent's new field is required**, like every other field
on it — the reducer "uses what it is handed and never reaches for a default
itself" (`src/game/session.ts`). The existing `new-game` constructions in the
test suite each gain `planetBonus: "off"`.

**D10. The panel is a new feature folder, `src/bonus/`**, holding the panel
component, its stylesheet, its test, and a small pure module deciding which of
the three badge states to draw from an entry's claim ply and the current ply
number. The timing rule is unit-tested outside React, per `CONTRIBUTING.md`
("prefer to keep logic out of components").

- _Rejected: `src/clock/`._ The panel is not a clock, and the folder is named
  for what is in it.
- _Rejected: `src/hud/`._ That folder is the info region's own strip.
- _Rejected: `src/board/`._ The story forbids anything on the board (S9), and
  putting the panel there invites exactly that.

**D11. `App` mounts the panel inside `.app__clocks`, above `<ClockRegion>`,**
and `.app__clocks` becomes a column in both orientations. The region keeps
`flex: 0 0 var(--region-extent)` in portrait and `width: var(--region-extent)`
in landscape, exactly as today, so it stays the mirror of `.app__info` and the
board keeps its size and its centring. Every size inside the panel is a
fraction of `--region-extent`, following the precedent `ClockRegion.css` sets
for landscape. If the panel and the clocks do not both fit, **the panel
shrinks** — never `--region-extent`, and never the board.

- _Rejected: growing `--region-extent` when the panel is on._ `P` is charged
  twice in the play-size formula (`App.css`), so it costs the board its size
  directly, which S12 forbids.
- _Rejected: putting the panel in the info region._ The two side regions
  mirror each other; a panel on one side alone unbalances the board's
  centring.
- _Rejected: having `ClockRegion` render the panel itself._ The clock
  component exists to draw a ticking clock and calls `useGameClock`; the panel
  must be renderable and testable with no clock in sight.

**D12. The `+N` window is `plyNumber - claimedOnPly <= 1`; after that, the
checkmark.** A claim made on ply N leaves the session at ply N+1 with the
opponent to move, so the `+N` is on screen for the whole of the opponent's
reply and becomes a checkmark once that reply is played (ply N+2). Known and
accepted: if the pass guard fires and the ply number advances twice in one
event, the `+N` is skipped — a pure-state consequence, and a reply the
opponent never got to make.

**D13. The panel is decorative and hidden from the accessibility tree**, as
the clocks are; a claim reaches a screen-reader user through the live region's
sentence. The gap this leaves — a screen-reader user is never told which three
planets are theirs, nor which have been claimed — is a knowingly accepted
pre-release cost and is recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` by Step 7 (S16).

**D14. `PlanetDefs` moves up to `App`, mounted once beside `ShipDefs`**, and
`Board` and `GuideScreen` drop their own mounts. The board and the panel then
reference one sprite rather than two copies of the same ids in the same
document. `App` already mounts `ShipDefs` above every screen, so the guide's
diagrams keep their drawings.

**D15. A planet in both sides' rows is drawn twice** — once in each row, each
copy carrying its own badge — because the two claims are independent and each
row is one player's own three.

**D16. The panel reads its drawings from the same arrangement the board
uses**, `planetArrangement(state.openingSeed)` in
`src/board/planetPlacement.ts`, so panel and board always agree by sight. The
arrangement is derived once per render pass with `useMemo` keyed on the
opening seed, as `Board` already does.

## Step sequence at a glance

| #   | Step                                                            | Verification |
| --- | --------------------------------------------------------------- | ------------ |
| 1   | `rules.md` 0.37 → 0.38: planet bonuses become a rule             | automated    |
| 2   | Two rules-layer modules: the setting, and the deal               | automated    |
| 3   | The state carries the setting and the deal                       | automated    |
| 4   | Landing pays: the claim in `ply.ts` and its effect               | automated    |
| 5   | The eighth option reaches a new game                             | automated    |
| 6   | The planet sprite moves up to `App`                              | automated    |
| 7   | The panel above the clocks                                       | **manual**   |
| 8   | The live region says a bonus was claimed                         | automated    |
| 9   | The Quick Guide and `README.md`                                  | automated    |
| 10  | The owner plays it                                               | **manual**   |

---

### Step 1 — `rules.md` 0.37 → 0.38: planet bonuses become a rule

Status: committed

Notes: Added section 3.4 (Planet bonuses) after 3.3 Rotators, defining the
whole rule; added one sentence each to 3.1 (pointing at 3.4, "Planets are
not owned" left untouched), 7.1 (a placed ship may claim a bonus), 8.4
(node collection is not the only source of energy), 8.6 (a bonus is paid at
landing and takes no step in this order), and the overview in section 1
(energy also comes from bonuses; the deal is a further random element).
Section 10's opening sentence gained the planet bonus alongside the other
choices. Checked section 9: it names only the rounds and does not enumerate
the other pre-play choices, so it is unchanged — nothing to add without
inventing a list. Checked section 2: there is no existing `Planet` entry to
point at 3.4 (the story's step text assumed one existed), so none was
added — this is a discrepancy from the plan's assumption, recorded here per
its own "say either way" hedge rather than reopened with the owner, since
the step already allowed for this outcome. Checked
`doc/ruleset/tech-notes.md`: its queue-sizing argument concerns node timing,
not energy amounts, so a second source of energy does not falsify anything
there and it was left unchanged. `RULES_VERSION` bumped to 0.38 in
`src/rules/rulesVersion.ts`, and one changelog entry added, newest first, in
the shape the 0.34/0.35/0.36/0.37 entries use, stating this is a gameplay
change and a tag candidate with tagging on hold. No tag was created. `npm
test` stayed at 73 files / 1455 tests, all green (no behaviour changed yet);
`npm run typecheck`, `npm run lint` and `npm run format:check` all clean.

Update `doc/ruleset/rules.md`, bump the document to **0.38**, bump
`RULES_VERSION` in `src/rules/rulesVersion.ts` to match, and add **one**
`doc/ruleset/changelog.md` entry for 0.38, newest first, in the shape the 0.37
entry uses. This step is **its own commit, ahead of all code changes** — the
document is what every later step implements (S14, S15: no tag).

Phrase the choice the way §8.1, §8.4 and §7 phrase theirs: stated once where
it is defined, referred back to elsewhere, **naming no default**, never using
the words "standard game" (S2).

**A new section 3.4, `Planet bonuses`**, immediately after §3.3 Rotators and
before §4. There is no existing §3.4, so nothing renumbers, and §3.1's own
text — which is about what every planet does — stays intact. It states:

- the choice is **off, 2 points or 3 points**, the same for both players,
  chosen before play begins and fixed for the game's lifetime;
- when it is on, **each player is dealt three planets at random from the
  twelve**, three distinct planets a side, the two sets drawn **independently**
  so they may overlap in any number from none to all three;
- a player is paid the chosen amount **the first time one of their ships lands
  on one of their three**;
- each planet pays each player **at most once**, however often that player's
  ships return to it;
- a **shared** planet pays both players, independently, in either order:
  neither claim takes anything from the other;
- **landing** includes a ship returned to a planet by a fight (§7.1) and a
  deliberate return (§7.2); flying over is not landing;
- the payment is made **the instant the ship arrives**, not at the end of the
  turn;
- **both sets are known to both players from the start of the game**;
- a bonus planet is **an ordinary planet that also pays once** — it is not
  owned, and everything §3.1 says about planets still applies to it.

**The other sections**, each a sentence or a check, not a rewrite:

- **§3.1** gains **one sentence** pointing at §3.4. Everything else there is
  untouched — in particular "Planets are not owned" stays exactly as it is,
  because it is still true: a bonus is a payment to one player, not a claim on
  a square.
- **§8.4** gains a sentence saying energy also comes from planet bonuses
  (§3.4), so no reader takes node collection to be the only source. The
  "Nothing in the game subtracts energy" paragraph stays and still holds.
- **§8.6** gains a sentence saying a planet bonus is paid when the ship lands
  and takes **no step in this order**. Check the rest of §8.6 and say in
  `Notes:` that it was checked.
- **§7.1** gains a sentence: a ship placed on a planet there may claim a bonus
  on arrival, for its own side.
- **§2's `Planet` entry** — check it, and point it at §3.4 if it needs it; say
  either way in `Notes:`.
- **§9** and **§10's opening sentence** both list what is chosen before play;
  each gains the planet bonus alongside the other seven. (§9's current text
  mentions only the rounds — check it, and if it does not enumerate the
  choices, say so in `Notes:` rather than inventing a list.)
- **§1's overview** — check "collecting **energy** for every turn they hold
  one": it is no longer the only way energy arrives. Correct it honestly with
  a clause or a sentence rather than a rewrite. Check also the "three random
  elements" paragraph — with the bonus on there is another random element (the
  deal of bonus planets), exactly as the dedicated rotation setting already
  adds a fourth; state it in the same voice that paragraph already uses.
- **`doc/ruleset/tech-notes.md`** — check whether anything there is falsified
  by a second source of energy (its queue-sizing argument is about nodes, not
  energy, so it most likely is not); record the answer either way in `Notes:`.

**The changelog entry** states that this is a **gameplay change** — a new way
to earn energy — and so would be a tag candidate, with tagging staying on hold
(S15). Say what changed section by section, in the shape the 0.37 entry uses.
Do not name a default: which setting the app preselects is an app matter and
belongs in this plan and the README, not in the ruleset's changelog.

Depends on: nothing. This is the first step.

Verification (automated): `npm test` green — in particular
`src/rules/rulesVersion.test.ts`, which asserts `RULES_VERSION` matches the
version in `rules.md` and that the changelog carries an entry for it, so a
bump in one and not the other fails. Test count stays at **1455**: no
behaviour has changed yet. `npm run typecheck`, `npm run lint` and
`npm run format:check` clean. Plus a read of the changed sections confirming
that §3.4 defines the choice and the whole rule, that §3.1 is otherwise
untouched, and that no section still presents node collection as the only
source of energy.

---

### Step 2 — Two rules-layer modules: the setting, and the deal

Status: committed

Notes: Added `src/rules/planetBonus.ts` exactly per D1 — `PlanetBonusSetting`,
`PLANET_BONUS_SETTINGS` (off first), `DEFAULT_PLANET_BONUS`,
`isPlanetBonusSetting` (doc comment names `startingGameState` as its real
caller, per the pattern `scoring.ts`/`nodeRotation.ts` use rather than the
"nothing calls this yet" note on `isClockSetting`/`isCombatSetting`), and
`planetBonusPoints`. Added `src/rules/bonusPlanets.ts` exactly per D2/D3 —
`dealBonusPlanets(seed)` draws green's three then red's three, each side's
draw uniform without replacement over the twelve via `drawIndex`, sorts each
side's three into board order after the draw, and returns both sides' lists
plus the seed after exactly six `mulberry32` steps; it imports only
`board.ts`, `fleet.ts` (for the `Side` type), `planets.ts` and `random.ts`,
and does not import `gameState.ts` or know about the setting. Neither module
is consumed anywhere yet (deliberate, per the step). Added
`src/rules/planetBonus.test.ts` and `src/rules/bonusPlanets.test.ts` covering
everything the step lists, including the independence check (scanning 50
seeds for at least one overlapping and one disjoint pair of sets) and the
six-seed-step check (compared against six direct `mulberry32` calls). No
deviations from the step as written. `npm test` now at 75 files / 1469 tests,
all green (up from 73/1455). `npm run typecheck`, `npm run lint` and
`npm run format:check` all clean.

Add **`src/rules/planetBonus.ts`** (D1), in the shape `scoring.ts`,
`nodeRotation.ts`, `combatSetting.ts` and `clock.ts` use:

- the setting type — a union of the three lowercase strings `"off"`, `"two"`
  and `"three"`;
- the offered settings as a readonly array in the order the start screen
  renders them — **off first**, so leftmost is what the app preselects (say
  that in the doc comment, as `SCORING_SETTINGS` does);
- the app's default, off;
- a type guard over an `unknown` value, whose doc comment says it has a real
  caller — `startingGameState` validating a setting that arrives from outside
  the type system (Step 3) — rather than the "nothing calls this yet" note
  `isClockSetting` and `isCombatSetting` carry;
- `planetBonusPoints(setting)`, returning 0 for off, 2 for two and 3 for
  three: the one place the words and the numbers are tied together.

The module must import **nothing** from `src/rules`. The OFF / 2 POINTS /
3 POINTS wording does **not** live here (S17's group labels are start-screen
chrome).

Add **`src/rules/bonusPlanets.ts`** owning the deal (D2, D3):

- one exported function taking a seed and returning **both sides' three
  planets** and the seed it left behind;
- green's three are drawn first, then red's; within a side each draw is
  uniform (`drawIndex`) over the planets that side has not already drawn, so
  the three are distinct; the two sides' pools are independent, so the sets may
  overlap;
- exactly **six** seed steps are consumed;
- each side's three are returned in **board order** (`ALL_SQUARES` order),
  sorted after the draw;
- the module header states plainly that the draw order (green, then red) is
  fixed and must never change, because a recorded game replays through it.

`bonusPlanets.ts` may import `board.ts`, `planets.ts`, `fleet.ts` and
`random.ts`; it must **not** import `gameState.ts`. It knows nothing about the
setting — **not calling it** is how an OFF game spends nothing (D4).

Add `src/rules/planetBonus.test.ts` — the offered settings and their order,
the default, the guard accepting all three settings while rejecting a
near-miss string, an arbitrary string, numbers, `null`, `undefined` and an
object (the shape `scoring.test.ts` uses), and `planetBonusPoints` returning 0,
2 and 3.

Add `src/rules/bonusPlanets.test.ts` covering, at minimum:

- each side gets **three** planets, all of them planet squares, all distinct
  within the side;
- the same seed deals the same six; scanning a range of seeds, different seeds
  generally deal differently;
- the two sides are drawn **independently**: over a scanned range of seeds
  there is at least one seed whose sets overlap and at least one whose sets are
  disjoint (assert both exist rather than asserting a property of one seed);
- each side's three come back in **board order**;
- the seed returned is the seed after **exactly six** `mulberry32` steps from
  the seed passed in.

Depends on: Step 1 (the rules text these two modules implement). Nothing
consumes either module yet — deliberately, keeping scaffolding separate from
behaviour.

Verification (automated): `npm test` green with the two new test files (test
count up); `npm run typecheck`, `npm run lint` and `npm run format:check`
clean.

---

### Step 3 — The state carries the setting and the deal

Status: committed

Notes: Added `planetBonus: PlanetBonusSetting` and
`bonusPlanets: Readonly<Record<Side, readonly BonusPlanetEntry[]>>` to
`GameState`, and the new `BonusPlanetEntry` interface (square plus optional
`claimedOnPly`), exported alongside `Ship` and `NodeStatus` exactly per D5.
Added `planetBonus?: string` to `StartingGameStateOptions`, validated with
`isPlanetBonusSetting` and throwing a `RangeError` naming
`PLANET_BONUS_SETTINGS` on a miss. In `startingGameState`, the bonus deal now
runs last — after the opening board deal and the rotator draw — and only
when the setting is not `"off"`; an OFF game's `bonusPlanets` is
`{ green: [], red: [] }` and consumes no extra seed step, matching D4. Worked
through the typechecker's list of about two dozen hand-built `GameState`
literals across the test suite (found via the `rotators:` field already
required in each) and added `planetBonus: "off"` and
`bonusPlanets: { green: [], red: [] }` to each, mechanically, changing no
existing assertion. Added six tests to `gameState.test.ts` covering the
default (off, empty lists, no extra seed step), the on-game's deal (three
distinct board-order planets a side, none claimed, exactly six
`mulberry32` steps beyond the off game's seed), that the amount setting does
not change the draw, the `RangeError` on an invalid string, that the setting
is exactly the one given, and that the deal runs after the rotator draw
(same `rotators` under dedicated whether the bonus is on or off). Added a
short paragraph to `seededReplay.test.ts`'s header, in the voice of the
existing version paragraphs, noting 0.38 and that an OFF game (the app's
default) draws nothing new. No deviation from the step as written. `npm
test` now at 75 files / 1478 tests, all green (up from 75/1469); in
particular `seededReplay.test.ts` and `fullGame.test.ts` passed with every
existing assertion untouched. `npm run typecheck`, `npm run lint` and
`npm run format:check` all clean.

Wire both new modules into `src/rules/gameState.ts` (D4, D5).

**The state shape.** Add to `GameState`:

- `planetBonus` — the setting, doc-commented the way `scoring` and
  `nodeRotation` are: fixed for the game's lifetime once set by
  `startingGameState`, and not derivable from a board;
- `bonusPlanets` — a record keyed by side, each side holding its three
  entries; an entry is its square plus the **ply it was claimed on**, absent
  until claimed. Say in the doc comment **why it is a ply and not a boolean**
  (D5): the panel's one-ply `+N` window is then a pure function of the state.

Both fields are **required** (D5). Export the entry type from `gameState.ts`
alongside `Ship` and `NodeStatus`, since it is a piece of state shape.

**The option.** Add `planetBonus?: string` to `StartingGameStateOptions`,
typed `string` for the same reason `scoring` and `nodeRotation` are — a
setting arriving from outside the type system can be any string — validated
with `isPlanetBonusSetting` and throwing a `RangeError` naming the offered
settings when it is not one.

**The deal.** In `startingGameState`, draw the bonus planets **last** — after
the opening board deal and after the rotator draw — and **only when the
setting is not off**. When it is off, both sides' lists are empty and **no
seed step is consumed**, so the resulting `randomSeed` is exactly what it is
today. `openingSeed` still records the seed the deal started from, unchanged.

**The existing suite.** Adding two required fields breaks every hand-built
`GameState` literal in the tests — roughly two dozen files, most with a single
builder helper (`buildState` and friends). Work through the typechecker's list
and add `planetBonus: "off"` and an empty deal to each. Do not change what any
of those tests assert.

Add to `src/rules/gameState.test.ts`:

- with no option given, the state is off, both lists are empty, and the
  resulting `randomSeed` is **identical** to the same call made before this
  change would have produced — assert it against a state built with
  `planetBonus: "off"` explicitly, and rely on `seededReplay.test.ts` (below)
  for the recorded figures;
- with the setting on, each side has three distinct planets in board order,
  none claimed, and the resulting `randomSeed` is six `mulberry32` steps
  beyond the OFF game's from the same seed;
- the amount setting does not change the deal: `"two"` and `"three"` from the
  same seed deal the same six planets;
- an invalid setting string throws a `RangeError`;
- **the deal runs after the rotator draw**: with `nodeRotation: "dedicated"`,
  a game with the bonus on has exactly the same `rotators` as a game with the
  bonus off from the same seed — proof the bonus draw did not shift the
  rotator stream.

`src/rules/seededReplay.test.ts` must pass **with its recorded expectations
exactly as they are**. Add a short paragraph to its header comment, in the
voice of the existing 0.18/0.26/0.27/0.36 paragraphs, saying that 0.38 added
planet bonuses and that at the app's default (off) nothing new is drawn, so
every recorded figure stands; only an ON game adds six steps, at the opening
deal, which `gameState.test.ts` asserts directly.

Depends on: Step 2 (both modules). Later steps read these fields.

Verification (automated): `npm test` green with **no existing expectation
edited** beyond adding the two fields to hand-built state literals — in
particular `src/rules/seededReplay.test.ts` and `src/rules/fullGame.test.ts`
pass untouched in their assertions. `npm run typecheck`, `npm run lint` and
`npm run format:check` clean.

---

### Step 4 — Landing pays: the claim in `ply.ts` and its effect

Status: committed

Notes: Added `PlanetBonusClaimedEffect` (side, square, amount — nothing else,
per D8) to `src/rules/ply.ts` as a member of both `MoveEffect` and
`AttackEffect`. Added the private `claimPlanetBonus` helper, modelled on
`rotateForLanding`: a no-op when the setting is off, the square is not one of
the landing side's three, or that side has already claimed it; otherwise it
raises the side's energy by `planetBonusPoints(state.planetBonus)` and
records `state.plyNumber` on that planet's entry, returning the new state and
the effect. `applyMove` calls it once, on the destination, after the node
bookkeeping and before `rotateForLanding`, pushing its effect ahead of any
`QueueRotatedEffect` (D7). `applyAttack` calls it twice, threading state
through all four calls in the order fight-resolved, attacker's claim,
attacker's rotation, defender's claim, defender's rotation (D7), each pushed
to the effects list only when raised. Updated both functions' doc comments
and the module's header comment to describe the claim. `assertFightInvariants`
needed no change, confirmed directly: it inspects `ships`, fleet counts and
`nodes` only, none of which `claimPlanetBonus` touches (energy and
`bonusPlanets` are outside its checks). `src/board/EnergyOverlay.tsx`'s
`endOfPlySettlements` helper takes the two effect lists' common shape by
listing each member type explicitly; `PlanetBonusClaimedEffect` is now one of
those members (it carries no settlement, so the function's own logic needed
no change, only its type union and doc comment). Tests went into a new
sibling file, `src/rules/planetBonusClaim.test.ts`, rather than the existing
2200-line `src/rules/ply.test.ts`, covering every case the step lists: a move
paid on landing with the right energy, entry and effect; the claim ordered
before `ply-ended`; no payment for the other side's planet; no repeat payment
for the same ship or a different ship of the same side; a shared planet paid
to each side independently, tested with green claiming first and with red
claiming first; nothing paid off; the amount tracking the setting; a fight
paying the attacker, the defender, and both (attacker's claim before the
defender's, using the same seed-pinning technique `ply.test.ts`'s own fight
tests use to fix the two return planets); nothing paid on a fight when off;
and exactly one rotation under the planet setting, sitting after the claim.
One deviation from the step's own list: the "shared planet, in either order"
requirement is covered by two separate scenarios (green claiming first;
red claiming first), each also asserting the other side's entry is left
untouched, rather than one scenario walking both claims through a full
back-and-forth move sequence — the latter added real-move reachability
complexity (ships can only reach a planet by an actual shape in
`movement.ts`) without adding coverage beyond what the two scenarios already
give. `npm test` now at 76 files / 1492 tests, all green (up from 75/1478);
`src/rules/fullGame.test.ts` and `src/rules/seededReplay.test.ts` pass
unchanged, both running at the default off setting where this step is inert.
`npm run typecheck`, `npm run lint` and `npm run format:check` all clean.

Add the claim to `src/rules/ply.ts` (D6, D7, D8). Nothing in
`src/rules/endOfTurn.ts` changes (S6).

**The effect.** A new `planet-bonus-claimed` effect carrying the **side**, the
**square** and the **amount** — and nothing else (D8) — added as a member of
both `MoveEffect` and `AttackEffect`, doc-commented in the voice the
neighbouring effect types use, including where it sits in the order (D7).

**The helper.** One private function in `ply.ts`, modelled on the existing
`rotateForLanding`: given a state, a side and the square a ship has just
landed on, it returns the state and an optional effect. It does nothing —
returning the state unchanged — when the game's setting is off, when the
square is not one of that side's three, or when that side has already claimed
that planet. Otherwise it does two things at once: the side's energy rises by
`planetBonusPoints(state.planetBonus)`, and that planet's entry records
`state.plyNumber` (the ply the landing happened on — `endPly` has not yet
advanced it).

**The two call sites.**

- `applyMove`: after the ship has been placed and the node bookkeeping done,
  and **before** `rotateForLanding`, with the move's destination. The existing
  `snapshotInactivePriorities` capture is unaffected — a claim touches no
  node.
- `applyAttack`: twice — the attacker's return planet, then the defender's —
  interleaved with the existing rotations so each landing's claim precedes its
  own rotation (D7), threading the state through all four calls. Both claims
  record the same ply number. `assertFightInvariants` needs **no change**: it
  checks ships, fleet sizes and node states, none of which a claim touches;
  confirm that in `Notes:`.

A claim must never suppress or duplicate a rotation (S8): under the planet
rotation setting a landing that claims still rotates exactly once.

Add tests, in `src/rules/ply.test.ts` or a new sibling test file if that file
is already large — the implementer's call, but say which in `Notes:`:

- paid on a move that ends on one of the moving side's three: energy rises by
  the chosen amount, the entry records the ply the move was made on, and the
  effect carries side, square and amount;
- the effect sits **before** the `ply-ended` effect in the list — the payment
  is part of the landing, not of the end-of-turn sequence;
- not paid when the planet is one of the **other** side's three;
- not paid a second time when the same ship, or another of that side's ships,
  lands there again;
- a **shared** planet pays each side once, independently, in either order
  (test both orders);
- **not paid when the setting is off**, and no effect raised;
- the amount follows the setting: 2 under `"two"`, 3 under `"three"`;
- a fight pays the **attacker** when its return planet is one of the
  attacker's three, pays the **defender** when its return planet is one of the
  defender's three, and pays both when both are — with the effects in
  placement order, attacker's first. (Constrain the random return draw the way
  `combat.test.ts` already does, by leaving only the planets the test wants
  empty.)
- under the **planet** node-rotation setting, a landing that claims raises
  exactly **one** `queue-rotated` effect, and it sits after the claim.

Depends on: Step 3 (the state fields). Steps 7 and 8 read this effect.

Verification (automated): `npm test` green with the new cases, and with
`src/rules/fullGame.test.ts` and `src/rules/seededReplay.test.ts` unchanged
(both run at the default OFF setting, where this step is inert).
`npm run typecheck`, `npm run lint` and `npm run format:check` clean.

---

### Step 5 — The eighth option reaches a new game

Status: committed

Notes: Added `planetBonus` to the `new-game` intent in `src/game/session.ts`
(required, typed `PlanetBonusSetting`, threaded straight into
`startingGameState`), updated its doc comment, and added `planetBonus: "off"`
to all thirteen `new-game` object literals in `src/game/session.test.ts`
(the fourteenth, `buildState`, already carried the state-shape fields from
Step 3). Added `planetBonus`/`setPlanetBonus` to `useAppScreen.ts` exactly
per the other six options (state at `DEFAULT_PLANET_BONUS`, exposed on
`AppScreen`, included in the `new-game` dispatch), and updated its module and
hook doc comments from "seven" to "eight". `App.tsx` takes the new value and
setter off the hook and passes them to `StartScreen`, placed next to the
`scoring` props (visual order) rather than at the end of the prop list.
`StartScreen.tsx` gained the eighth `fieldset`, legend `Planet bonus`, after
Scoring and before Inactive node rotation, with the local
`off → "OFF"`/`two → "2 POINTS"`/`three → "3 POINTS"` label map, its own
`useId` group name, and OFF checked by default via `PLANET_BONUS_SETTINGS`
through the existing `OptionChoice`; its module and component doc comments
also went from "seven" to "eight". No new styling. Updated
`StartScreen.test.tsx`'s group-order test to eight groups and added three new
tests for the Planet bonus group (all three labels with the given one
checked; OFF checked by default with the radios in order OFF, 2 POINTS,
3 POINTS; the change handler called with "three" and no other handler
called). Added a `planetBonus` default check to `useAppScreen.test.tsx`'s
opening test and a new test mirroring the existing node-rotation/scoring
"carries a chosen ... setting" test, for planet bonus set to "three". Added
two tests to `session.test.ts`'s `new-game` describe block: setting "three"
deals three bonus planets a side, and setting "off" leaves both lists empty.
Updated `App.test.tsx`'s two seven-groups tests to eight (with a
`planetBonusGroup()` helper and an OFF-checked assertion) and added a test
mirroring the DEDICATED "choosing before PLAY starts a game, and returning
to start still shows it chosen" test for 3 POINTS. No deviations from the
step as written. `npm test` now at 76 files / 1499 tests, all green (up from
76/1492); `npm run typecheck`, `npm run lint` and `npm run format:check` all
clean (prettier reformatted the `useState<PlanetBonusSetting>` declaration in
`useAppScreen.ts` onto two lines, run via `npx prettier --write`, consistent
with the plan's own formatting note). The app is still visually driven by the
same start screen shown before this step in every other respect — the panel
(Step 7) is what a player would need to see the setting reflected once a game
starts.

Carry the choice from the start screen to `startingGameState`, through the
same plumbing the other seven ride (D9).

- **`src/game/session.ts`** — the `new-game` intent gains a required
  `planetBonus` field, passed straight into `startingGameState`. Update the
  intent's doc comment, which enumerates what `new-game` carries. Every
  existing `new-game` construction in the suite (chiefly
  `src/game/session.test.ts`, about fifteen of them, and
  `src/useAppScreen.test.tsx`) gains `planetBonus: "off"`.
- **`src/useAppScreen.ts`** — holds the setting in state at
  `DEFAULT_PLANET_BONUS`, exposes it and its setter on `AppScreen`, and
  includes it in the `new-game` dispatch. The module header and the hook's doc
  comment say "seven options" today; make them eight.
- **`src/App.tsx`** — takes the new value and setter off the hook and passes
  them to `StartScreen`.
- **`src/start/StartScreen.tsx`** — an eighth `fieldset`, legend
  **`Planet bonus`**, placed **after Scoring and before Inactive node
  rotation**, rendering `PLANET_BONUS_SETTINGS` through the existing
  `OptionChoice` with a local label map `off → "OFF"`, `two → "2 POINTS"`,
  `three → "3 POINTS"` (start-screen chrome, exactly like the Scoring and
  Combat maps), its own `useId` group name, and OFF checked by default. No new
  styling (S17). The component header and its doc comment say "seven options";
  make them eight.

Tests:

- `src/start/StartScreen.test.tsx` — update the existing group-order test to
  assert **eight** groups in the order Ships, Charged nodes, Scoring, Planet
  bonus, Inactive node rotation, Combat, Rounds, Clock; add a test that the new
  group renders OFF / 2 POINTS / 3 POINTS in that order with the given one
  checked, that OFF is checked by default, and that choosing 3 POINTS calls
  the planet-bonus handler with `"three"` and calls no other handler.
- `src/useAppScreen.test.tsx` — the default is off, the setter changes it, and
  PLAY dispatches `new-game` carrying the chosen setting.
- `src/game/session.test.ts` — `new-game` with `"three"` starts a game whose
  state carries the setting and three bonus planets a side; with `"off"`, the
  setting is off and both lists are empty.
- `src/App.test.tsx` — update the two tests that assert seven option groups;
  add one that choosing 3 POINTS before PLAY starts a game and that returning
  to the start screen still shows 3 POINTS chosen (mirroring the existing
  DEDICATED test).

Depends on: Steps 2–4 (the setting, the state field and the behaviour behind
it). Step 7 needs the setting to be reachable from the start screen to be
worth looking at.

Verification (automated): `npm test` green with the new and updated cases;
`npm run typecheck`, `npm run lint` and `npm run format:check` clean. The
app is still visually unchanged in a game — the panel arrives in Step 7 — but
an ON game now deals bonus planets and pays them.

---

### Step 6 — The planet sprite moves up to `App`

Status: pending

Move `PlanetDefs` from the board to the app root (D14), so the board and the
panel reference one sprite.

- **`src/App.tsx`** — mount `<PlanetDefs />` beside `<ShipDefs />`, above the
  cabinet, so it exists on every screen.
- **`src/board/Board.tsx`** — drop its own `<PlanetDefs />` mount and the
  import.
- **`src/guide/GuideScreen.tsx`** — drop its own mount and the import.
- **`src/board/PlanetDefs.tsx`** — its header says "Mounted once, on the
  board, since planets appear only there"; correct it to say it is mounted
  once at the app root, above every screen, in the shape `ShipDefs`'s header
  already uses, and say why (the panel draws planets too).

Tests:

- `src/board/Board.test.tsx` — the "draws no row or column labels" test
  asserts `.board-frame` has three children, one of them `.planet-defs`.
  Update it: the frame now holds the grid and the energy overlay, two
  children, and no sprite.
- `src/App.test.tsx` — add a test mirroring the existing "mounts exactly one
  hidden ship sprite" one: exactly one `.planet-defs` in the document, on the
  start screen, on the guide screen and with a game in progress, hidden from
  the accessibility tree.
- Check `src/guide/GuideScreen.test.tsx` and `src/guide/GuideDiagram.test.tsx`
  for anything that depends on the guide mounting the sprite itself; none was
  found at planning time, so most likely nothing to do — say either way in
  `Notes:`.

Depends on: nothing in Steps 2–5, but it must land before Step 7, which draws
planets outside the board.

Verification (automated): `npm test` green with the two updated/added cases;
`npm run typecheck`, `npm run lint` and `npm run format:check` clean. This is
pure scaffolding: no behaviour and nothing a player sees changes, and the
board's planets must still be drawn (the existing board tests that assert a
planet square's `<use>` reference cover that).

---

### Step 7 — The panel above the clocks

Status: pending

Build the panel (D10, D11, D12, D13, D15, D16). This is the story's one
visible piece, and its verification is **manual**.

**`src/bonus/bonusBadge.ts`** — a pure function from an entry's claim ply (or
its absence) and the current ply number to which badge to draw: nothing,
the amount, or the claimed mark. The window is `plyNumber - claimedOnPly <= 1`
(D12); the doc comment explains why that is one ply of the opponent's reply
and notes the accepted pass-guard case.

**`src/bonus/PlanetBonusPanel.tsx`** and its stylesheet:

- takes the game state (it needs the setting, the deal, the ply number and the
  opening seed);
- **renders nothing at all** when the setting is off (S11) — not an empty
  element, not a hidden one;
- otherwise draws **two rows, green above red** (matching the clocks' own
  order in both orientations), each row that side's three planets in board
  order, each drawn with `Planet` from the arrangement
  `planetArrangement(state.openingSeed)` gives that square (D16), memoised on
  the opening seed;
- over each drawing, a badge in the side's own colour (`--color-green` /
  `--color-red`, as `ClockRegion.css` and `EnergyOverlay.css` use them):
  nothing when unclaimed; `+2` or `+3` **fading in** on the claiming ply and
  the ply after it; a checkmark from then on. **The drawing stays put in all
  three states** (S13) — only the badge changes. Draw the checkmark as inline
  SVG rather than a text glyph, so it does not depend on a font;
- the whole panel is `aria-hidden` (D13), like the clocks;
- sizes come from `--region-extent`, never from `vw` (D11);
- a planet in both rows is drawn in both, each copy with its own badge (D15).

**`src/App.tsx` and `src/App.css`** — mount the panel inside `.app__clocks`,
above `<ClockRegion>`; make `.app__clocks` a column in both orientations, with
a gap, keeping its `flex: 0 0 var(--region-extent)` (portrait) and
`width: var(--region-extent)` (landscape) exactly as they are. Extend the
`.app__clocks` comment, which currently says the clock component owns
everything inside the box.

**`doc/plan/00000021-accessibility-tech-debt/known-issues.md`** — add a
"From story 97 — planet bonuses" section recording D13: the panel is hidden
from the accessibility tree, so a screen-reader user is never told which three
planets are theirs or which have been claimed; the live region announces each
claim as it happens, and nothing else carries the standing picture. Name the
files (`src/bonus/PlanetBonusPanel.tsx`), in the shape the existing entries
use.

Tests (automated, behind the manual gate):

- `src/bonus/bonusBadge.test.ts` — unclaimed draws nothing; claimed on the
  current ply and on the previous ply draw the amount; two or more plies ago
  draws the claimed mark.
- `src/bonus/PlanetBonusPanel.test.tsx` — renders nothing when off; two rows,
  green first, when on; three drawings a row; each drawing is the one the
  board's arrangement gives that square; the three badge states appear at the
  right ply numbers; each side's badge carries that side's colour class; a
  shared planet appears in both rows with independent badges; the panel is
  hidden from the accessibility tree.
- `src/App.test.tsx` — with the default OFF, `.app__clocks` holds the clock
  region and nothing else; after choosing 3 POINTS and pressing PLAY, the
  panel is inside `.app__clocks`, before the clock region in DOM order. The
  existing axe checks must stay green.

Depends on: Step 5 (the setting is choosable and reaches the state), Step 6
(the sprite is mounted above the board), Step 4 (claims are recorded on the
state the panel reads).

Verification (**manual**, with the automated suite behind it): `npm test`,
`npm run typecheck`, `npm run lint` and `npm run format:check` all clean, then
`npm run dev` and, in the browser:

1. With **OFF** (the default), start a game: there is **no panel** — the
   clocks sit where they sit today and the board is the size it is today.
2. With **3 POINTS**, start a game: the panel shows **three planet drawings a
   side**, green's row above red's, above the clocks, and every drawing in it
   is the drawing the board carries on that square.
3. The board is **no smaller** than in check 1, in **portrait and in
   landscape**, and nothing in the clock region overflows its box.
4. Move a ship onto one of green's bonus planets: green's score climbs
   **immediately, mid-turn**, and a green `+3` fades in over that planet in the
   panel, with the drawing staying where it is.
5. That `+3` is still on screen through **red's whole reply**, and is a green
   checkmark by the time green moves again.
6. Landing on the same planet again pays nothing and changes nothing in the
   panel.

---

### Step 8 — The live region says a bonus was claimed

Status: pending

Give the claim a sentence in `src/board/announcements.ts`, in the players'
vocabulary ("turn", "energy", never "ply"), keeping wording out of components
as that module already does.

- One clause per `planet-bonus-claimed` effect, naming the **side**, the
  **square** and the **amount** paid. It does **not** quote a running total
  (D8) — the effect carries none, and the turn's collection lands moments
  later.
- In a **move's** sentence the clause sits after the node-spent clause and
  before the rotation clauses. In a **fight's** sentence it sits after the two
  returns and before the rotation clauses, one clause per claim in effect
  order (attacker's first). Follow the existing `queueRotatedClausesText`
  helper's shape: filter the effect list, map to clauses, join.
- A move or a fight that claims nothing reads exactly as it does today.

Tests in `src/board/announcements.test.ts`: a move that claims; a move that
claims nothing (unchanged wording); a fight that claims for one side; a fight
that claims for both, in placement order; and a claim alongside a rotation
under the planet setting, proving clause order.

Depends on: Step 4 (the effect).

Verification (automated): `npm test` green with the new cases;
`npm run typecheck`, `npm run lint` and `npm run format:check` clean. Per S16,
this wording is **not** put to the owner as a manual check — the suite is the
gate for it.

---

### Step 9 — The Quick Guide and `README.md`

Status: pending

Bring the two pieces of player-facing prose up to date.

**`src/guide/guideCopy.ts`** — the **REFUELING** section's paragraph gains a
sentence saying that, when the planet bonus option is on, three planets for
each player also pay a one-time bonus the first time one of that player's
ships lands there. Use the guide's own vocabulary — **points**, not energy
(the module header explains this knowing exception) — and keep the sentence in
the guide's plain voice. Update the exact-string expectation in
`src/guide/guideCopy.test.ts` to match. No new section, no new diagram, no
`settingLines` (those belong to node selection alone).

**`README.md`** — the status paragraph lists the pre-play choices and twice
says "seven choices". Add the planet bonus alongside the other seven, in the
same voice ("a choice of whether planets pay a one-time bonus (off, two points
or three points, off to start)"), placed where the start screen places it —
after scoring and before the waiting nodes' rings — and make both "seven
choices" read eight. Check the paragraph that describes what planets do and
add a clause there if it reads as complete without the bonus. Nothing else in
the README changes: there is no new screen, no new control beyond the option
group, and the board is unchanged. `/update-readme` may be used to draft this,
but the result must still be read against the story.

Depends on: Steps 5 and 7 (the option and the panel are what these documents
describe).

Verification (automated): `npm test` green with the updated guide-copy
expectation; `npm run typecheck`, `npm run lint` and `npm run format:check`
clean. Plus a read of both documents confirming that the option is described
where a player would look for it and that no count ("seven") is left stale.

---

### Step 10 — The owner plays it

Status: pending

Nothing to implement. The owner runs the finished app and confirms the story's
own verification list, plus the two checks `story.md` calls out as worth making
once it runs.

Depends on: every step above.

Verification (manual): `npm run dev`, and from the start screen:

1. The start screen shows **eight** option groups in the order Ships, Charged
   nodes, Scoring, Planet bonus, Inactive node rotation, Combat, Rounds,
   Clock, with **OFF** checked in the new group — including on a **short
   landscape window**, where eight groups is the layout risk this story
   carries (S17: if they do not fit, that is a finding, not a fix taken here).
2. With OFF, the game screen is as it is today: no panel, the clocks where
   they were, the board the same size.
3. With 3 POINTS: the panel shows three planets a side above the clocks, every
   drawing matching the board's own drawing on that square.
4. Moving onto one of green's bonus planets adds **3** to green's score
   immediately, mid-turn, and fades a green `+3` in over that planet; it is
   still there through red's whole reply and a green checkmark by green's next
   turn.
5. Landing there again pays nothing and changes nothing.
6. A planet in **both** rows pays each side once, independently.
7. With **combat on**, a fight that pushes a ship onto one of its owner's
   bonus planets pays that owner at the moment of the fight.
8. The board is no smaller than today with the panel on screen, in **portrait
   and landscape**.
9. The choice survives a return to the start screen, and a second game starts
   from it.
10. A judgement call for the owner, not a pass/fail: play a 3-point game and
    decide whether nine energy of bonuses swamps the node economy or sits
    alongside it. Anything it turns up is a finding for a later story — S18
    keeps this one from retuning anything.
