# Implementation Plan — Story 00000109, Planet activity: a stable variant, and new defaults

## What this story does

Story 105 added a fourth planet bonus value, **advanced**, offered only
under steal: two contested bonuses stand on the board, and when one is
claimed the one left behind changes kind at once. This story:

1. **Splits the planet choice in two.** Under steal, a new setting,
   **planet activity** — **off, stable or race** — replaces the planet
   bonus group. Race is today's advanced, renamed, with identical rules.
   Under continuous, planet and dedicated, the planet bonus group keeps
   **off, 2 points, 3 points**. The classic 2/3-point bonuses are no longer
   offered under steal.
2. **Adds stable**: race with one step removed — when a bonus is claimed,
   the bonus left standing **keeps its kind** instead of being redrawn.
   Everything else (the opening deal, the kinds and weights, the point
   table, the new bonus's planet and kind draw, fights, seeding) is race's.
3. **Changes three app defaults**: node playstyle **steal** (was planet),
   player-matching **required** (was off), planet activity **race**. Planet
   bonus (seen under the other playstyles) stays off. Nothing else moves.

The ruleset goes 0.41 → **0.42**. The Quick Guide's ADVANCED PLANET BONUSES
section becomes PLANET ACTIVITY, and `README.md` follows.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions and rejected alternatives, because code in this
repository deliberately carries no design history (`CONTRIBUTING.md`,
"Comments").

## Baseline on this branch

Branch `feat/109-add-stable-planet-action-variant`, clean at the start of
planning (`story.md` already committed).

- `npm test` — **89 test files, 1876 tests, all green**.
- `npm run typecheck`, `npm run lint` and `npm run format:check` are
  expected clean. Every step must leave them that way; if a step's own edit
  trips `format:check`, run `npx prettier --write` on the files that step
  touched (including this plan file, if an edit to it flags).

## How this plan is run

Steps 1–4 and 6 are verified automatically. The one manual gate is
**Step 5**, where the owner reads the Quick Guide copy and plays the
finished feature against the story's Verification list; every check a
step would otherwise have paused for is collected there, so the owner
pauses once. A step that cannot be made green is marked `blocked` with the
reason in its Notes — never pushed through with a weakened test.

If a step ends up building something different from what `story.md` says,
correct `story.md` in place to what was actually built (and say so in the
step's Notes); do not leave a stale statement in it.

No accessibility work is planned (`CLAUDE.md`, "Accessibility during
pre-release"). None of these steps is expected to cost an accessible
behaviour; if one does, record it in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` and say so in
the step's Notes. Live-region wording is covered by the automated suite and
is kept out of the manual check.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what the ruleset, the
  UI, the Quick Guide and `README.md` say (`CLAUDE.md`, Vocabulary). **Move**
  means one ship changing squares, never a ply or a turn.
- **Planet bonus** — the classic setting (rules.md §3.4): **off, 2 points,
  3 points**; code values `"off" | "two" | "three"`; start-screen labels OFF,
  2 POINTS, 3 POINTS. Offered under continuous, planet and dedicated only.
- **Planet activity** — the new steal-only setting (steal.md §10): **off,
  stable, race**; code values `"off" | "stable" | "race"`; start-screen
  labels OFF, STABLE, RACE, rendered in that order; group legend
  **Planet activity**.
- **Activity bonus** — the code word for one of the two contested bonuses
  that stand on the board under stable or race (formerly "advanced bonus";
  see D2). The ruleset and the UI just say **bonus**. Its **kind** is one
  of the six; the two bonuses occupy two **slots** (left, right) in the
  panel.
- **Survivor** — the code word for the bonus left standing when the other
  is claimed. Under race it is redrawn to a different kind; under stable it
  keeps its kind.
- The six kinds' player-facing names — **Small points, Medium points, Large
  points, Fuel, Additional nodes, Node scramble** — and their kebab-case
  code values (`"small-points"` … `"node-scramble"`) are unchanged.
- The Quick Guide says **points**, **fuel** and **spaceships** where the
  rest of the app says energy, power and ships — a knowing exception
  recorded in `src/guide/guideCopy.ts`'s header.
- `rules.md` and `steal.md` **name no default** and never call a setting
  "standard" (story 99). Defaults are an app matter only.

## Settled decisions — from the story, do not reopen

A step that finds one of these inconvenient marks itself `blocked` and
escalates rather than re-deciding.

- **S1.** Two pre-play settings, each the same for both players and fixed
  for the game: **planet bonus** (off / 2 points / 3 points) under
  continuous, planet and dedicated; **planet activity** (off / stable /
  race) under steal only. Neither is offered under the other's playstyles.
  A steal game never has classic per-player bonus planets.
- **S2.** **Race** is exactly today's advanced, renamed: same bonuses,
  kinds, weights, opening deal, claiming, fights, point table, Fuel,
  Additional nodes and Node scramble. The same seed and moves give the same
  game as advanced did.
- **S3.** **Stable** claim order: (1) the bonus takes effect for the
  claiming side; (2) the other bonus stays on its planet **and keeps its
  kind** — nothing is drawn for it; (3) a new bonus appears on a planet
  drawn uniformly from the planets empty at that moment that do not carry
  the other bonus, its kind drawn by weight from the kinds available,
  excluding the other bonus's kind. A stable claim makes one fewer draw than
  a race claim. Everything else follows race.
- **S4.** **Off** under planet activity means no bonuses at all.
- **S5.** The point table is used unchanged by stable; retuning is out of
  scope.
- **S6.** Start screen: under STEAL a **Planet activity** group (OFF,
  STABLE, RACE) appears **in the Planet bonus group's position**, and there
  is no Planet bonus group; under every other playstyle the **Planet bonus**
  group (OFF, 2 POINTS, 3 POINTS) shows and there is no Planet activity
  group. Each group **remembers its own choice** across playstyle switches.
  The reset-to-OFF when leaving steal goes away.
- **S7.** Defaults: node playstyle **STEAL**, player-matching **REQUIRED**,
  planet activity **RACE**, planet bonus **OFF**. Ships 5, Charged nodes 4,
  Scoring BONUS, Combat OFF, Rounds 30, Clock UNLIMITED do not change. The
  defaults change is an app change: no ruleset file mentions it.
- **S8.** In play, stable and race look identical — same panel, symbols,
  captions, hover glow, claim announcement. No new visual tells them apart.
- **S9.** Quick Guide: ADVANCED PLANET BONUSES becomes **PLANET ACTIVITY**,
  describing both variants (a taken bonus is always replaced; under RACE the
  one left standing also changes); its diagram does not change. PLANET
  BONUS says it applies to the other playstyles.
- **S10.** `README.md`: new defaults, the two planet groups, the advanced
  paragraph rewritten for planet activity (stable and race), and "eighteen
  starting squares" → fourteen.
- **S11.** One rules-version bump on this branch, 0.41 → **0.42**, one
  changelog entry, its own commit ahead of the code. Any later ruleset edit
  on this branch folds into 0.42 — no second bump, no second entry. Do not
  tag.

## Design decisions — made by this plan

### D1. Two settings, two game-state fields

`GameState.planetBonus` narrows to the classic three values
(`PlanetBonusSetting = "off" | "two" | "three"`), and a new field
`GameState.planetActivity` (`PlanetActivitySetting`) holds the steal-only
setting. Invariants: under steal `planetBonus` is always `"off"`; under any
other playstyle `planetActivity` is always `"off"`. `startingGameState`
enforces both by throwing a `RangeError`, as it already does for
player-matching outside steal. (Classic 2/3 under steal was accepted until
now; it is newly rejected because the ruleset now forbids it.)

A new leaf module, `src/rules/planetActivity.ts`, mirrors `planetBonus.ts`
and `playerMatching.ts`: the type, `PLANET_ACTIVITY_SETTINGS` in render
order, `DEFAULT_PLANET_ACTIVITY`, `isPlanetActivitySetting` (the guard
`startingGameState` uses on its `string`-typed option) and
`resolvePlanetActivity(nodePlaystyle, remembered)` — the remembered value
under steal, `"off"` otherwise, exactly like `resolvePlayerMatching`.
`planetBonus.ts` gains the matching `resolvePlanetBonus` (remembered value
off steal, `"off"` under steal), loses `"advanced"`, loses
`ClassicPlanetBonusSetting` (it becomes identical to `PlanetBonusSetting`;
`planetBonusPoints` takes `PlanetBonusSetting`), and loses
`offeredPlanetBonusSettings` (a group is now either shown whole or hidden,
so there is nothing to filter).

Rejected:

- **Widen the one field to five values** (`off | two | three | stable |
  race`). It keeps the conflation the story removes: the start screen has to
  remember two independent choices anyway (S6), the rules now describe two
  settings, and every consumer would keep testing "is this a classic value
  or an activity value" instead of reading the field it cares about.
- **Keep `"advanced"` as a value and add a separate stable/race flag.** A
  setting split across two fields for one choice, with an invalid
  combination (flag set while not advanced) to guard.

### D2. The mechanism's code vocabulary: "advanced" becomes "activity"

The word "advanced" leaves the ruleset entirely, and `CLAUDE.md` asks for
one word everywhere; leaving a code word the rules no longer use is the
kind of split the vocabulary section warns against. The mechanism (two
contested bonuses) is shared by stable and race, so it is named after the
setting, **activity bonus**, not after either variant. Rename map (use
`git mv` for files so history follows):

- `src/rules/advancedBonus.ts` → `activityBonus.ts`;
  `advancedBonus.test.ts` → `activityBonus.test.ts`;
  `advancedBonusClaim.test.ts` → `activityBonusClaim.test.ts`.
- `AdvancedBonusKind`, `ADVANCED_BONUS_KINDS`, `ADVANCED_BONUS_WEIGHTS`,
  `ADVANCED_BONUS_POINTS`, `AdvancedBonusEntry`,
  `isAdvancedBonusKindAvailable`, `drawAdvancedBonusKind`,
  `drawAdvancedBonusPlanet`, `AdvancedBonusPointSize`,
  `advancedBonusPointSize`, `advancedBonusPoints`, `dealAdvancedBonuses`,
  `AdvancedBonusClaimOutcome`, `ResolveAdvancedBonusClaimResult`,
  `resolveAdvancedBonusClaim` → the same names with `Activity`/`activity`/
  `ACTIVITY` in place of `Advanced`/`advanced`/`ADVANCED`.
- `GameState.advancedBonuses` → `activityBonuses`.
- `src/rules/ply.ts`: `AdvancedBonusClaimedEffect` →
  `ActivityBonusClaimedEffect`, its `type` `"advanced-bonus-claimed"` →
  `"activity-bonus-claimed"`, `claimAdvancedBonus` → `claimActivityBonus`,
  the fight-invariant local `isAdvanced` → a name about planet activity
  being on.
- `src/bonus/`: `AdvancedBonusCell.tsx/.css` → `ActivityBonusCell`,
  `AdvancedBonusSymbol.tsx` → `ActivityBonusSymbol`,
  `advancedBonusCaption(.test).ts` → `activityBonusCaption`,
  `advancedBonusColors(.test).ts` → `activityBonusColors`
  (`advancedBonusSymbolColors` / `AdvancedBonusSymbolColors` likewise).
- CSS classes: `advanced-bonus-cell*` → `activity-bonus-cell*`,
  `planet-bonus-panel--advanced` → `planet-bonus-panel--activity`,
  `planet-bonus-panel__advanced-row` / `__advanced-cell*` →
  `__activity-row` / `__activity-cell*`,
  `guide-diagram__cell--advanced-bonus` →
  `guide-diagram__cell--activity-bonus`; `GuideDiagram`'s cell kind
  `"advancedBonus"` → `"activityBonus"`.
- Every comment that says "advanced planet bonus setting", "under
  advanced" and so on is reworded to "planet activity" / "under stable or
  race" / "under race" as the sentence actually means. Unrelated uses of the
  word — "the advanced seed" in `random.ts` and `combat.ts`, "has not yet
  advanced" in `relief.ts` and `ply.ts` — stay.
- The Quick Guide's section id, heading, copy and diagram component
  (`advancedPlanetBonus`, `AdvancedPlanetBonusDiagram`) are **left for
  Step 5**, which owns the guide; Step 2 only updates their imports of
  renamed modules.

Rejected: **keep "advanced" in code** (cheapest, but leaves a word no
ruleset or UI text uses — the stale-vocabulary trap `CLAUDE.md` describes);
**"race bonus"** (wrong under stable); **"contested bonus"** (descriptive,
but not a word the ruleset uses, so it would be a fresh code-only term).

### D3. The start screen and PLAY

`useAppScreen` holds both remembered values (`planetBonus`,
`planetActivity`) with their own setters, and `setNodePlaystyle` goes back
to being the plain state setter — the advanced→off reset is removed (S6).
`handlePlay` sends both, each resolved for the chosen playstyle
(`resolvePlanetBonus`, `resolvePlanetActivity`), exactly as player-matching
is resolved today, so a game never starts with a setting its playstyle does
not offer. The `new-game` `SessionIntent` gains `planetActivity`, passed
through to `startingGameState`.

`StartScreen` gains `planetActivity` / `onPlanetActivityChange` props and
renders, **in the Planet bonus group's current position** (after Scoring,
before Combat), either the Planet activity fieldset (under steal) or the
Planet bonus fieldset (otherwise), each with its own radio-group name and a
label table local to `StartScreen.tsx` (labels are start-screen chrome, not
a rules concern). The screen still shows eight groups, nine under steal.

### D4. Stable in the claim resolution

`resolveActivityBonusClaim` reads `planetActivity` from the state (add it to
the `Pick`) and, under stable, **skips the survivor's redraw**: the survivor
keeps its kind, and the new bonus's kind excludes that kept kind. Seed
order under stable: (1) the claimed kind's own draws; (2) one step for the
new bonus's planet; (3) one step for the new bonus's kind. Under race the
order stays as today (own draws, survivor's kind, new planet, new kind). The
module header's seed-order paragraph states both.

The outcome keeps its current shape: under stable `survivor.newKind` equals
`survivor.oldKind`. Rejected: an optional/absent `newKind` under stable
(every consumer would gain a branch for no benefit — the panel reads the
state, not the effect, and the announcement never mentions the survivor);
a separate stable resolver (would duplicate the effect application, which
is identical). `resolveActivityBonusClaim` may throw if called with
`planetActivity` off — it is only ever called when on.

No code guards "a kept bonus never becomes unavailable" (story, "Stable"):
only an Additional nodes claim can make a kind unavailable, and the
survivor of that claim is by construction a different kind. The full-game
invariant sweep (Step 3) confirms it holds in play.

### D5. Defaults resolve against the playstyle inside `startingGameState`

Step 4 changes `DEFAULT_NODE_PLAYSTYLE` to `"steal"`,
`DEFAULT_PLAYER_MATCHING` to `"required"` and `DEFAULT_PLANET_ACTIVITY` to
`"race"`. Left alone, `startingGameState(seed, { nodePlaystyle: "planet" })`
would then default player-matching to required and throw. So when an
option is **omitted**, `startingGameState` resolves its default for the
playstyle actually chosen: `resolvePlayerMatching(nodePlaystyle,
DEFAULT_PLAYER_MATCHING)`, `resolvePlanetActivity(nodePlaystyle,
DEFAULT_PLANET_ACTIVITY)`, `resolvePlanetBonus(nodePlaystyle,
DEFAULT_PLANET_BONUS)`. An option that **is** supplied is still validated
and rejected if the playstyle does not offer it. `startingGameState(seed)`
with no options therefore starts the same game the app's PLAY does with
nothing touched.

Rejected: **decouple the rules layer's defaults from the app's `DEFAULT_`
constants** (e.g. always `"off"`): the convention since story 99 is that
the omitted-option game is the app's default game, and breaking that would
leave two notions of "default". Rejected: **make every test pass every
option**: the measured blast radius is small (see Step 4).

Tests that were exercising a non-steal board through the old default are
**pinned** to `nodePlaystyle: "planet"` (the setting they were written
under), not re-expected; tests that assert "the default is X" are
re-expected; tests that became hollow (they choose what is now the default,
so the choice proves nothing) choose a non-default value instead.

### D6. Proving race is unchanged

Step 2 is a rename and a split with no behaviour change. The existing
`seededReplay.test.ts` harness only proves a game replays against itself,
not that it matches what the code produced before the step. Step 2
therefore uses an **improvised golden comparison** (described in the step):
a throwaway test captures a race game's trace before any edit and is re-run
after. It is not committed; pinning golden values permanently would make
every future deliberate rules change fight the test.

## Step sequence at a glance

1. The ruleset goes to 0.42 — automated
2. Planet activity replaces advanced (race only), and the code vocabulary
   follows — automated
3. Stable — automated
4. The new defaults — automated
5. The Quick Guide's PLANET ACTIVITY section, and the owner plays it —
   manual
6. `README.md` — automated

Steps 2 and 3 are kept apart deliberately: Step 2 is a large mechanical
rename whose correctness is "nothing changed", provable against the
existing suite and a golden trace; Step 3 adds behaviour and its own tests.
Merged, a behaviour slip in the rename would hide among the new stable
tests.

---

### Step 1 — The ruleset goes to 0.42

Status: committed

Notes: rules.md (§§1, 3.1, 3.4 retitled "Planet bonus and planet activity",
4.1, 7.1, 8.4, 8.6, 10) and steal.md (§§2, 3, 4, 9, 10 retitled "Planet
activity") updated, version 0.42 in rules.md and `RULES_VERSION`, one 0.42
changelog entry; point-table rows untouched. No deviations. Inspection: the
"advanced" grep over rules.md/steal.md returns nothing; `## 0.42` appears
once in changelog.md; the default/standard grep finds only steal.md §9's
existing "no default" line.

Edit `doc/ruleset/rules.md` and `doc/ruleset/steal.md`; bump the version
line in `rules.md` to **0.42** and `RULES_VERSION` in
`src/rules/rulesVersion.ts` to `"0.42"`; add **one** entry at the top of
`doc/ruleset/changelog.md`, `## 0.42 — planet activity: a stable variant,
and race replaces advanced` (or similar), in the shape of the 0.41 entry.

The ruleset names no default and never says "standard"; the app's default
changes (S7) appear nowhere in these files, including the changelog.

**rules.md:**

- **§3.4** retitled to cover both settings (e.g. "Planet bonus and planet
  activity"). Opening paragraph: there are two pre-play settings, each the
  same for both players and fixed for the game; **planet bonus** — off,
  2 points or 3 points — is offered under continuous, planet and dedicated;
  **planet activity** — off, stable or race — is offered only under steal,
  with its rules in steal.md §10; neither is offered under the other's
  playstyles, so a steal game never has per-player bonus planets. The
  existing bullets stay as the description of 2 points / 3 points. The
  closing paragraph's "Under advanced, a bonus planet is an ordinary
  planet…" becomes "Under planet activity…".
- **§1**: the energy sentence ("under the planet bonus setting") and the
  random-elements paragraph name both settings where both are meant; the
  "advanced planet bonus setting" sentence becomes planet activity, and the
  "what kind the bonus left behind turns into" clause is qualified as
  race-only.
- **§3.1** ("Under the planet bonus setting, a ship may also claim a
  bonus…"), **§8.4** ("under the planet bonus setting, landing on the right
  planet also pays") and **§8.6** ("Under the planet bonus setting, a bonus
  … takes effect at the instant a ship lands") name both settings.
- **§4.1**: "Under the advanced planet bonus setting, claiming a Fuel
  bonus…" → under planet activity (stable or race).
- **§7.1**: "Under the planet bonus setting, a ship placed here may claim a
  bonus … — under advanced, steal.md §10 states…" → names both settings and
  says "under planet activity".
- **§10 (clock)**: the list of pre-play choices names "the planet bonus
  (section 3.4)" — make it "the planet bonus or, under the steal playstyle,
  planet activity (section 3.4)" alongside player-matching.

**steal.md:**

- **§10** retitled **Planet activity**. Opening: planet activity is **off,
  stable or race** (rules.md §3.4), offered only under steal; off means no
  planet bonuses at all; under stable and race there are no per-player
  planets and the board carries exactly two bonuses (the existing
  description). Rename advanced → race throughout, and say that everything
  in the section applies to both stable and race except where it says
  otherwise.
- The **claim order**: keep the three steps; step 2 states the race rule
  (stays, changes kind, redrawn excluding the kind it was) and the stable
  rule (stays and keeps its kind; nothing is drawn for it); step 3's
  exclusion reads "excluding the other bonus's kind — under race, its new
  kind". Add a sentence that under stable a claim therefore makes one fewer
  draw than under race, and the story's note that a kept bonus never
  becomes unavailable while it stands (only claiming Additional nodes makes
  a kind unavailable, and the bonus left standing then is never Additional
  nodes itself, since the two are always different kinds).
- The fight paragraph's "including any redraw of the other bonus" is
  qualified "(under race)"; the seeded-stream paragraph's "every redraw of
  the other bonus's kind" likewise. "Why five is the limit" needs no change
  (it holds for both) beyond wording that says "advanced".
- **§§2, 3, 4**: each "Under the advanced planet bonus setting" → "Under
  planet activity (stable or race)" or equivalent.
- **§9**: "Planet bonuses (rules.md §3.4) are unaffected by either setting"
  is reworded for planet activity (a bonus planet pays on landing whether or
  not a player holds their own node); "Under the advanced planet bonus
  setting, this section's choice also sizes the point amounts" → applies
  under both stable and race.
- The **point table rows stay byte-for-byte** as they are:
  `src/rules/advancedBonus.test.ts` reads them from `steal.md` with a row
  regex and must keep passing.

**changelog.md 0.42 entry**, newest first: a gameplay change and so a tag
candidate, with tagging on hold (see the project's contribution notes).
Bullets: planet choice splits into planet bonus (off / 2 / 3, continuous,
planet and dedicated) and planet activity (off / stable / race, steal only);
advanced is renamed **race**, rules unchanged; **stable** added — the bonus
left standing keeps its kind, one fewer draw per claim, everything else as
race, point table unchanged; the classic 2/3-point bonuses are no longer
offered under steal; the sections touched (rules.md §§1, 3.1, 3.4, 4.1,
7.1, 8.4, 8.6, 10; steal.md §§2, 3, 4, 9, 10); nothing else changes.

Depends on: nothing. Comes first because the ruleset is what Steps 2–3
implement.

Verification (automated): full `npm test` green — in particular
`src/rules/rulesVersion.test.ts` (version agrees, changelog has a 0.42
entry) and the point-table mirror test in `src/rules/advancedBonus.test.ts`
(still reads 18 rows); `npm run typecheck`, `npm run lint`,
`npm run format:check` clean. By inspection, recorded in Notes:
`grep -n -i "advanced" doc/ruleset/rules.md doc/ruleset/steal.md` returns
nothing; `grep -n "## 0.42" doc/ruleset/changelog.md` returns exactly one
line; `grep -n -i "default\|standard" doc/ruleset/rules.md
doc/ruleset/steal.md` finds no new statement of a default.

---

### Step 2 — Planet activity replaces advanced (race only), and the code vocabulary follows

Status: committed

Notes: Split and rename done per D1–D3 (new `planetActivity.ts` + test,
`planetBonus.ts` narrowed with `resolvePlanetBonus`, `advanced*` →
`activity*` via `git mv`, `GameState.planetActivity`, the two new
`RangeError`s, start screen/`useAppScreen`/session wiring, panel, tests,
tech-notes heading). Golden trace: seeds 20260819, 12345 and 987654321 × 3/4/5
nodes × player-matching off/double/required × combat on/off × scoring
simple/bonus (108 games, 1440 claims), recording opening pair, every claim,
per-ply seeds, final energy/seed/ships/nodes/pair — before/after output
byte-identical; temp file deleted. Deviations: removed
`planetBonusClaim.test.ts`'s "classic bonus pays under REQUIRED" case, since
classic bonuses under steal are now a state the rules forbid (the activity
equivalent in `activityBonusClaim.test.ts` stays); dropped `"advanced"` from
the guards' rejection lists so the grep stays clean. `grep -rn -i advanced
src` leaves only the unrelated seed/"not yet advanced" uses plus the Quick
Guide's section id, heading, copy, header comment, diagram name and tests,
and two comments in `ActivityBonusCell.tsx`/`activityBonusColors.ts` naming
the guide's ADVANCED PLANET BONUSES heading — all for Step 5.

A behaviour-preserving split and rename. After it, the app offers under
steal a **Planet activity** group with **OFF** and **RACE** (STABLE comes
in Step 3), under other playstyles a **Planet bonus** group with OFF,
2 POINTS, 3 POINTS, and a race game plays exactly as an advanced game did.
Defaults are **not** changed here: `DEFAULT_PLANET_ACTIVITY` is `"off"` in
this step (Step 4 flips it).

**Before editing anything — capture the golden trace (improvised, D6).**
Add a temporary test file under `src/rules/` (vitest only collects from
`src/`; e.g. `raceGolden.tmp.test.ts`) that plays the same deterministic
steal + advanced game `src/rules/fullGame.test.ts` plays (reuse its policy
by copying it in) for seeds of your choice at 3, 4 and 5 charged nodes, with
player-matching off and required, and prints one JSON line per game: the
opening `advancedBonuses`, every `advanced-bonus-claimed` effect's
`side`/`square`/`kind`/`pointsAwarded`/`survivor`/`newBonus`, the final
energy and the final `randomSeed`. Save the output under the session
scratchpad. Do not commit this file.

Then, following D1, D2 and D3:

- **Rules layer.** New `src/rules/planetActivity.ts` (values `"off" |
  "race"` for now, `PLANET_ACTIVITY_SETTINGS` = off, race;
  `DEFAULT_PLANET_ACTIVITY = "off"`; guard; `resolvePlanetActivity`), with a
  `planetActivity.test.ts` in the style of `playerMatching.test.ts`.
  `planetBonus.ts` narrowed as D1 says, gaining `resolvePlanetBonus`; its
  tests updated. `advancedBonus.ts` → `activityBonus.ts` with all renames.
  `gameState.ts`: `planetActivity` field and option (typed `string`, like
  the others, validated with the guard); `advancedBonuses` →
  `activityBonuses`; the classic deal runs when `planetBonus` is two or
  three, the activity deal when `planetActivity` is not off — the draw
  order for race is exactly advanced's (the classic deal did not run under
  advanced, and does not run under steal now). Reject planet activity other
  than off outside steal and planet bonus other than off under steal, each
  with a `RangeError` naming the offending values. Update
  `startingGameState`'s doc comment (the seed-step accounting and the
  option docs). `ply.ts`: `claimPlanetBonus` returns early on
  `planetBonus === "off"`; `claimActivityBonus` returns early on
  `planetActivity === "off"`; the fight invariant's "is activity on" check
  reads `planetActivity`.
- **Session and app.** `SessionIntent`'s `new-game` gains `planetActivity`.
  `useAppScreen` per D3 (the header comment's paragraph on the advanced
  reset is removed). `App.tsx` passes the new props to `StartScreen`.
  `StartScreen.tsx` per D3; its header comment no longer mentions ADVANCED.
- **Panel and board.** `PlanetBonusPanel` and `bonusPanelSquares` read
  `planetActivity !== "off"` (activity pair) before `planetBonus === "off"`
  (nothing); `announcements.ts`, `EnergyOverlay.tsx`, `boardAnimations`
  and everything else that names the effect type or the renamed modules
  follow the rename.
- **Tests.** Every test building a `GameState` literal gains
  `planetActivity` and uses `activityBonuses`; every test that started a
  game with `planetBonus: "advanced"` uses `planetActivity: "race"` instead;
  test files renamed per D2. The existing start-screen tests for ADVANCED
  (offered only under steal; reset on leaving steal) are replaced by tests
  of the new behaviour:
  - `StartScreen.test.tsx`: under STEAL a "Planet activity" group with OFF,
    RACE in that order and no "Planet bonus" group; under each other
    playstyle a "Planet bonus" group with OFF, 2 POINTS, 3 POINTS and no
    "Planet activity" group; the group sits between Scoring and Combat.
  - `App.test.tsx` (or `useAppScreen.test.tsx`, whichever the existing
    player-matching memory test lives in — mirror it): choose RACE, switch
    to PLANET, choose 3 POINTS, switch back to STEAL → RACE is checked;
    switch to PLANET again → 3 POINTS is checked.
  - `useAppScreen.test.tsx`: PLAY under steal dispatches `planetBonus:
    "off"` with the remembered activity; PLAY under planet dispatches
    `planetActivity: "off"` with the remembered bonus.
  - `gameState.test.ts`: the two new `RangeError`s; race deals exactly the
    bonuses and leaves exactly the `randomSeed` the advanced deal did for a
    given seed (compare against `dealActivityBonuses` run on the same
    post-board seed, as the existing advanced test does).
- **tech-notes.md**: the "Sizing advanced planet bonus points" heading and
  prose say race / planet activity, and the file references follow the
  rename (`activityBonus.test.ts`, `activityBonusPoints`).

**After the edits — compare the golden trace.** Update the temporary file's
names (`activityBonuses`, `"activity-bonus-claimed"`, `planetActivity:
"race"`), re-run it, and diff its output against the saved one: they must be
identical. Then delete the temporary file.

Depends on: Step 1 (the ruleset this implements).

Verification (automated): the golden-trace diff above is empty (record in
Notes the seeds used and that the diff was empty); full `npm test`,
`npm run typecheck`, `npm run lint`, `npm run format:check` all green, with
the temporary file deleted. By inspection, recorded in Notes:
`grep -rn -i "advanced" src` returns only the unrelated uses (the advanced
seed, "has not yet advanced") and the Quick Guide's section id, heading,
copy, header comment and diagram name that Step 5 owns.

---

### Step 3 — Stable

Status: committed

Notes: `"stable"` added to `PlanetActivitySetting` (off, stable, race) and
the start screen; `resolveActivityBonusClaim` reads `planetActivity`, skips
the survivor's draw under stable and now throws when activity is off; the
header states both seed orders; ply.ts/PlanetBonusPanel comments and
tech-notes follow; all planned tests added (claim tests per kind with
one-step-fewer seed comparison against race and an exact draw check, fight
block parametrised over race/stable, fullGame and seededReplay sweeps under
both). Small deviations: `activityBonus.test.ts`'s `stateFor` had
`planetActivity: "off"` from Step 2 and now says `"race"` (off would throw),
the seeded-replay harness/policy were renamed from "race" to
activity/bonus names, and its two-hundred-round non-vacuous run stays
race-only (its floors were measured under race).

Add `"stable"` to `PlanetActivitySetting`; `PLANET_ACTIVITY_SETTINGS`
becomes off, stable, race (the start screen's order). Add STABLE to
`StartScreen.tsx`'s Planet activity labels. Implement D4 in
`resolveActivityBonusClaim` and its module header (both seed orders). The
opening deal is identical under stable and race (it is shared code — no
change). `gameState.ts` needs nothing beyond the type (`"stable"` is off
steal rejected by the same check as race); update comments that say "race"
where they mean "stable or race". Add a sentence to `tech-notes.md`'s
point-sizing section that stable uses the race-measured table unretuned.

Tests:

- `activityBonusClaim.test.ts`: under stable, for a points claim, a Fuel
  claim, an Additional nodes claim and a Node scramble claim — the survivor
  keeps its square **and kind**; the new bonus lands on an empty planet
  other than the survivor's, in the claimed slot, with a kind different
  from the survivor's; the seed consumed is exactly one step fewer than the
  same claim under race from the same state (compare the two
  `nextSeed`s against manual draws). The outcome's `survivor.newKind`
  equals `oldKind`.
- A fight under stable: the attacker's claim resolves before the
  defender's planet is drawn, and the defender may claim the just-appeared
  bonus — mirror the existing advanced/race fight test.
- `fullGame.test.ts`: run the existing full-game invariant sweep under
  stable as well as race (parametrise it); the invariants — two bonuses, on
  empty distinct planets, of different kinds, Additional nodes never
  standing while unavailable — hold at every ply. Add one stable-only
  assertion: across the game, whenever a claim happens, the survivor's kind
  after the claim equals its kind before.
- `seededReplay.test.ts`: the steal + race harness also runs under stable —
  the same seed and moves give the same sequence of claim effects twice.
- `gameState.test.ts`: stable accepted under steal; rejected off steal; the
  opening deal under stable equals race's for the same seed.
- `StartScreen.test.tsx`: the Planet activity radios read OFF, STABLE, RACE
  in that order.
- `PlanetBonusPanel.test.tsx`: a stable state renders the same two-cell
  activity panel as race (S8).

Depends on: Step 2 (the planet activity setting and the renamed claim
resolution).

Verification (automated): full `npm test` green with the tests above
present and passing; `npm run typecheck`, `npm run lint`,
`npm run format:check` clean.

---

### Step 4 — The new defaults

Status: pending

Change `DEFAULT_NODE_PLAYSTYLE` to `"steal"` (`src/rules/nodePlaystyle.ts`),
`DEFAULT_PLAYER_MATCHING` to `"required"` (`src/rules/playerMatching.ts`)
and `DEFAULT_PLANET_ACTIVITY` to `"race"` (`src/rules/planetActivity.ts`),
each with its one-line doc comment updated. Implement D5 in
`startingGameState`: omitted `playerMatching`, `planetActivity` and
`planetBonus` resolve against the chosen playstyle; the option docs say so.
Update every comment that names an old default (grep for "planet
rotation", "(planet)", "(off)" in the rules and app modules' default and
option docs, and `useAppScreen.ts` / `StartScreen.tsx` headers). No ruleset
file is touched (S7).

Before the step, a throwaway measurement of these defaults showed **about
49 failing tests across 11 files**, none a break in rule logic: `App.test`,
`StartScreen.test`, `useAppScreen.test`, `session.test`,
`nodePlaystyle.test`, `gameState.test`, `nodePool.test`,
`openingBoard.test`, `seededReplay.test`, `bonusPanelSquares.test`,
`PlanetBonusPanel.test`. Treat them per D5:

- **Pin to `nodePlaystyle: "planet"`** the tests that are about the
  non-steal board and relied on the old default — `nodePool.test.ts`'s
  economy harness, `openingBoard.test.ts`'s full-game runs,
  `seededReplay.test.ts`'s continuous/planet stream test, and the
  `gameState.test.ts` cases about `dealOpeningBoard`, inactive priorities
  and charged-node counts. Likewise pin any test that relied on
  player-matching or planet activity being off by default.
- **Re-expect** the tests that assert defaults: the start screen opens with
  STEAL, REQUIRED and RACE checked and Ships 5, Charged nodes 4, Scoring
  BONUS, Combat OFF, Rounds 30, Clock UNLIMITED; `useAppScreen` opens with
  the new defaults; `nodePlaystyle.test`'s default; `App.test`'s group
  list and order under the default steal screen (Node playstyle, Ships,
  Charged nodes, Player-matching nodes, Scoring, Planet activity, Combat,
  Rounds, Clock); `startingGameState(seed)` with no options gives steal,
  required, race, planet bonus off.
- **Add** to `gameState.test.ts`: `startingGameState(seed, { nodePlaystyle:
  "planet" })` succeeds with player-matching off, planet activity off and
  planet bonus off (the D5 resolution).
- **Unhollow** any test that chooses STEAL, REQUIRED or RACE to prove a
  choice took effect: have it choose a non-default value instead.
- `App.test` cases that press PLAY and inspect the board (e.g. "choosing 3
  charged nodes shows a three-charged board") may assume a non-steal board;
  either choose PLANET first or re-expect for steal, whichever keeps the
  test about what its name says.

Depends on: Step 3 (RACE must exist as a value; STABLE's presence keeps the
start-screen default test honest about the full group).

Verification (automated): full `npm test`, `npm run typecheck`,
`npm run lint`, `npm run format:check` green. By inspection, recorded in
Notes: `git diff --stat` for the step shows no file under `doc/ruleset/`;
the final failing-test count before fixes, for comparison with the
measurement above.

---

### Step 5 — The Quick Guide's PLANET ACTIVITY section, and the owner plays it

Status: pending

In `src/guide/guideCopy.ts`: the section id `advancedPlanetBonus` becomes
`planetActivity`, its heading **PLANET ACTIVITY**; it stays last, right
after PLANET BONUS. In `src/guide/guideDiagrams.tsx` / `GuideScreen.tsx`,
`AdvancedPlanetBonusDiagram` becomes `PlanetActivityDiagram` with **no
change to what it draws** (S9). Update `guideCopy.ts`'s header comment:
the PLANET ACTIVITY paragraph describes planet activity (steal.md §10),
drafted for this story and awaiting the owner's review.

Draft copy (for the owner to approve or rewrite in this step's check; it
keeps the guide's "points", "fuel", "spaceships" and "waiting square"
wording):

- **PLANET BONUS**: "Under the Continuous, Planet and Dedicated
  playstyles, when the planet bonus option is on, each player is given
  three planets that also pay them points — two or three, whichever was
  chosen — the first time one of their spaceships lands there. Each planet
  only pays a player once, however often their spaceships return to it."
- **PLANET ACTIVITY**: "Under the Steal playstyle, the planet activity
  option puts two bonuses on the board instead, on two planets shown above
  the clocks. Either player can claim one by landing a spaceship there. A
  bonus that is taken is always replaced by a new one on another planet.
  Under Stable, the bonus left standing stays as it is, so you can plan a
  route to it. Under Race, it changes into something else too, so a bonus
  is only worth heading for while nobody takes the other one first. A bonus
  can be points in three sizes, fuel for every one of your spaceships, an
  extra waiting square for every node, or every node's waiting squares
  redrawn."

Update `guideCopy.test.ts` (section list, the two paragraphs verbatim,
PLANET ACTIVITY last) and `GuideScreen.test.tsx` (PLANET ACTIVITY right
after PLANET BONUS, paired with a diagram of two `.activity-bonus-cell`s).
If the owner rewrites the copy during the check, the owner's text replaces
the draft verbatim, the tests follow it, and the header comment records the
copy as the owner's.

Depends on: Steps 2–4 (the section describes the finished feature, and the
play-through below needs it all in place).

Verification (manual — the pipeline pauses here). First run full
`npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`
(all green) and `grep -rn -i "advanced" src` (only the unrelated seed/
"has not yet advanced" uses remain). Then the owner runs `npm run dev` in
the Dev Container and checks:

- Opening the app: STEAL, Player-matching nodes REQUIRED and Planet
  activity RACE are preselected; Ships shows 5, Charged nodes 4, Scoring
  BONUS, Combat OFF, Rounds 30, Clock UNLIMITED.
- Under STEAL there is no Planet bonus group; Planet activity offers OFF,
  STABLE, RACE in that order, in the place Planet bonus used to be. Under
  CONTINUOUS, PLANET and DEDICATED there is no Planet activity group, and
  Planet bonus offers OFF, 2 POINTS, 3 POINTS.
- Choose STABLE, switch to PLANET, choose 3 POINTS, switch back to STEAL:
  STABLE is shown. Switch to PLANET again: 3 POINTS is shown.
- Under RACE, claiming a bonus works as ADVANCED did: the planet that was
  not claimed changes to a different kind, and a new bonus appears.
- Under STABLE, claiming a bonus takes effect and a new bonus appears on
  another empty planet, while the planet that was not claimed **keeps its
  symbol**. The two symbols on the panel are always different.
- Under planet activity OFF, the panel shows no bonus planets and no bonus
  is paid.
- A PLANET game with 2 POINTS or 3 POINTS plays and looks as before.
- The Quick Guide has a PLANET ACTIVITY section, after PLANET BONUS, with
  the unchanged two-bonus diagram; approve or rewrite both paragraphs.

(Seeded replay under stable and race, and the claim announcements, are
covered by the automated suite and are not part of this check.)

---

### Step 6 — `README.md`

Status: pending

Run `/update-readme` (or do its job by hand), making at least these edits
(S10), in plain words for a non-technical reader:

- The status blurb's start-screen list: node playstyle "steal to start"
  (was planet); player-matching nodes "required to start" (was off); the
  planet choice becomes two — under continuous, planet and dedicated,
  whether planets pay a bonus (off, two points or three points, off to
  start); under steal, planet activity (off, stable or race, race to
  start). Ships, nodes, scoring, combat, rounds and clock are unchanged.
- The quick-guide list: "the planet bonus and advanced planet bonuses" →
  "the planet bonus and planet activity".
- The "Under steal there is also an advanced option…" passage describes
  planet activity: two bonuses anyone can claim; a taken bonus is always
  replaced elsewhere; under stable the one left standing stays as it is,
  under race it changes too. Keep the "Whatever the planet bonus option,
  hovering…" sentence true for both settings.
- "the board's eighteen starting squares" → fourteen.
- Sweep for any other statement of a default or of which playstyle the app
  "starts on" (as story 99 did) and correct it; the intro's description of
  how nodes work under three of the four playstyles may stay as it is
  unless it claims the app starts there.

Depends on: Steps 2–5 (what is offered and the guide, as built).

Verification (automated): `npm run format:check` clean and full `npm test`
green (unaffected). By inspection, recorded in Notes:
`grep -n -i "advanced\|eighteen" README.md` returns nothing, and every
start-screen choice and default README lists matches `StartScreen.tsx` and
the `DEFAULT_` constants.
