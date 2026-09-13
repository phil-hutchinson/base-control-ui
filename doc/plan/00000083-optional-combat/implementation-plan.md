# Implementation Plan — Story 00000083, Combat off or on

## What this story does

Combat (`rules.md` §7) has been part of every game since the rules began.
This story makes it **a choice the players make before play begins**, off or
on, in the shape the fleet size, the charged-node count, the rounds and the
clock already are — and **the app preselects OFF**, so the game a player gets
without touching anything no longer has fights in it.

With combat off, no attack is legal for either side, ever. Nothing else
changes: the same board, the same fleets, the same movement and power, the
same nodes, the same energy, the same ending. A turn is then one move, and
the §5 pass rule is untouched.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions, because code in this repository deliberately
carries no design history (`CONTRIBUTING.md`, "Comments").

## Baseline on this branch

Branch `feat/83-optional-combat`, clean at the start of planning (`story.md`
committed as `4d46ee2`).

- `npm test` — **64 test files, 1208 tests, all green**.
- `npm run typecheck` and `npm run lint` — clean.
- `npm run format:check` — **two pre-existing warnings**:
  `doc/plan/00000069-retire-actions/story.md` and `src/board/planetArt.ts`.
  These are not this story's to fix and must not be "tidied" in passing.
  (This `implementation-plan.md` may itself want formatting; run
  `npx prettier --write` on **it** only if it is flagged, and leave the other
  two alone.)

The test count will **rise** over this story. No step may lower it.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say (`CLAUDE.md`, Vocabulary). Do not mix them.
- **Move** is the movement action specifically, never a synonym for a turn.
- **Node** is the word everywhere.
- The player-facing words for the setting are **OFF** and **ON**. The code
  word is a boolean named `combatEnabled` (D1).
- Since rules version 0.32 the document **names no default and no "standard
  game"** for any option: each section lists the options and says the choice
  is the same for both players and fixed for the game's lifetime. Which
  option the app preselects is purely an app matter. Do not reintroduce
  "default" or "standard game" language into `rules.md` for combat or for
  anything else.

## Settled decisions — do not reopen

These come from `story.md` and the discussion around it. A step that finds one
inconvenient escalates to the owner rather than re-deciding.

- **S1. Off or on, nothing in between.** No "attacks cost more", no "attacks
  only in your own half", no disabling the §7.1 return draw while keeping the
  fight.
- **S2. Chosen before play and fixed for the game's lifetime.** There is no
  mid-game toggle and no in-game display of the setting — no HUD badge, no
  legend, nothing in the game-over panel.
- **S3. The app preselects OFF**, and off is the default everywhere in the
  code a default is reached for. `rules.md` states the choice and names no
  default.
- **S4. §7.2, returning to a planet by choice, stays available with combat
  off.** It is an ordinary move that happens to end on a planet, and with
  combat off it is the only way a ship reaches a planet.
- **S5. Nothing is retuned against an off game**: power, the movement table,
  the countdown lengths, the node economy, the fleet sizes, the rounds and the
  clock all keep their values.
- **S6. The rules edit is its own commit, ahead of the code.** `rules.md`
  0.33 → 0.34, `RULES_VERSION` to match, one `changelog.md` entry. **One
  version bump for the whole branch**: if a later step finds more wording to
  correct in `rules.md`, it folds into 0.34's entry and does not add a second
  bump.
- **S7. Tagging stays on hold** even though this is a gameplay change
  (`CLAUDE.md`). Bump the version, write the changelog entry, do not tag.
- **S8. No accessibility repair steps, no review fixtures, no manual test
  scripts** (`CLAUDE.md`, pre-release stance). Where an existing automated
  test has a straightforward path to being updated, update it. Nothing here is
  expected to cost an accessible behaviour; if a step knowingly does, it adds
  a note to
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md` rather than
  doing the repair. Manual verification never asks the owner to check
  live-region wording — the automated suite covers that.
- **S9. The Quick Guide is not touched.** `src/guide/guideCopy.ts` never
  mentions combat (checked during planning: no occurrence of "attack",
  "fight" or "combat" in it), so it is correct at both settings.
- **S10. "Cannot move or attack" keeps its wording** — the square label, the
  ship condition and the passed-turn announcement are each still literally
  true in an off game. This story does not open a pass over them.
- **S11. No backwards compatibility** for games recorded under 0.33
  (`CLAUDE.md`).

## Decisions this plan makes

### D1. The state carries a boolean, `combatEnabled`

`story.md` left the shape to this plan and leaned boolean. This plan settles
it: **a boolean**, named `combatEnabled`, and the same name at every layer:

| Layer              | Where                                               |
| ------------------ | --------------------------------------------------- |
| Game state         | `GameState.combatEnabled` (required)                |
| Starting options   | `StartingGameStateOptions.combatEnabled` (optional) |
| Session intent     | the `new-game` intent's `combatEnabled` (required)  |
| App screen state   | `AppScreen.combatEnabled` / `setCombatEnabled`      |
| Start screen props | `combatEnabled` / `onCombatEnabledChange`           |

Rejected: a two-valued `CombatSetting = "off" | "on"` in `ClockSetting`'s
shape. Every point of use asks a yes/no question, so that shape would force
`state.combat === "on"` at each of them and buy only the display strings —
which the start screen holds anyway, as chrome, exactly as it holds
`CLOCK_SETTING_LABELS`. `ClockSetting` earns its shape because `"none"`, 6, 4
and 2 are four genuinely different values; combat has two.

Also rejected, and not available anyway: deriving the setting from the board.
It cannot be — a board with no fights on it is indistinguishable from a board
whose players have not fought yet. That is the same reason `lengthInRounds`
and `chargedNodeCount` are stored, and the reason this must be state and not
an app-level flag passed around beside the state.

### D2. The option constants live beside §7, and there is nothing to validate

**Amended during Step 3, by the orchestrator.** This decision originally put
the option in `src/rules/combat.ts`, §7's own module. That turned out to
create the first **runtime import cycle** in `src/rules/`: `gameState.ts`
needs the default to build a state, and `combat.ts` value-imports
`gameState.ts` for `shipsBySquare` and `nodeStateAt`. Every other option
module is a leaf — `clock.ts`, `fleet.ts` and `nodes.ts` never import
`gameState.ts`, and `gameLength.ts`'s back-import is type-only and so erases.
The option therefore lives in **`src/rules/combatSetting.ts`**, a leaf module
holding the pre-play choice as pure data, with §7's state-reading logic
staying in `combat.ts`. Wherever this plan says the constants are in
`combat.ts`, read `combatSetting.ts`; the shape below is unchanged, and it is
still the shape `clock.ts`, `fleet.ts` and `nodes.ts` use for theirs:

- the offered settings, in the order the start screen renders them, **off
  first** — leftmost is what the app preselects;
- the default, **off**;
- a type guard, in `isClockSetting`'s spirit.

**Validation is where this departs from `story.md`, deliberately.**
`lengthInRounds`, `fleetSize` and `chargedNodeCount` are each typed `number`
on `StartingGameStateOptions` and validated at runtime with a `RangeError`,
because `number` admits values the game does not offer. A `boolean` admits
only the two values the game offers, so there is **no invalid value to
reject**: `startingGameState` adds no `RangeError` for combat, and
`gameState.test.ts` has no "rejected when invalid" case to write. Making the
invalid value unrepresentable is strictly better than catching it at runtime,
and `story.md`'s "validated the way the others are" was written before the
boolean shape was chosen. The guard is still exported — unused for now, like
`isClockSetting`, which carries a doc comment saying exactly that — for the
boundary a game record or a saved-options load will need, and it is covered
by a unit test so it is exercised rather than merely present.

### D3. One gate, and why no consumer gets a second one

`attackRefusalReason` in `src/rules/combat.ts` is the single function every
attack passes through. A new refusal reason, `"combat-is-off"`, is checked
there **immediately after the `isGameOver` check** and ahead of everything
else. Consequences, all intended:

- An ended game still refuses as `"game-over"`, even with combat off.
- Every other activation of an enemy ship in an off game refuses as
  `"combat-is-off"` — never as "that ship is on a planet", "out of range" or
  "cannot afford", which would be misleading answers in a game where
  attacking is not a thing that exists.
- `legalTargets` returns nothing, because its final filter keeps only squares
  `attackRefusalReason` approves. That empties the board's target marks,
  zeroes a selection's `targetCount`, and reduces `sideToMoveCanMoveOrAttack`
  and `shipCanMoveOrAttack` to their movement halves — including the §5 pass
  guard, which then passes a side that cannot move.
- `applyAttack` (`ply.ts`) refuses, and the session turns that refusal into a
  `rejected` event with the new reason.

`legalTargets` **does not** get a combat check of its own, even though it
locally mirrors `attackRefusalReason`'s attacker-side early returns (game
over, not your ship, on a planet, on a charged node, trapped). Those exist to
skip building a reach set that cannot contain anything; adding a sixth for
combat would be the second gate `story.md` forbids, and the only cost of not
adding it is computing a reach set that is then filtered to empty — a handful
of table lookups, in a function already called per ship.

`attackReach` is **not** touched: it is pure geometry with no opinion about
the state it is handed, and it stays that way.

Checked by inspection during planning, and the reason no other production
file is planned to change: `Board.tsx` reads `legalTargets` (target marks) and
`shipCanMoveOrAttack` (the `cannot-move-or-attack` condition); `session.ts`
reads `legalTargets` (`targetCount`) and `applyAttack`; `ply.ts` reads
`attackRefusalReason` and `sideToMoveCanMoveOrAttack`; `canMoveOrAttack.ts`
reads `legalTargets`. `relief.ts` (§8.6 step 7) reads only `legalDestinations`
and the trap, so it is unaffected. `squareLabel.ts` and `announcements.ts`
carry wording only.

**If a step finds a place that needs its own check, that is a finding, not a
licence.** Record it in the step's `Notes:` in as many words — it means
something reaches §7 without going through `attackRefusalReason` — and
escalate rather than quietly adding a second gate.

### D4. The test sweep sets `true` everywhere, and is inert by construction

Adding a required field to `GameState` reaches **24 test files** that build a
state literal, each with its own local `buildState`-style helper (the list is
in Step 3). A further group of test files gets its states from
`startingGameState`, whose combat option now defaults to **off**.

Every one of those builders and calls is set to **combat on** in the sweep,
because on is exactly the semantics every existing expectation was written
under. The sweep is therefore behaviour-preserving by construction: if the
suite goes red during it, that is a real mistake, not an intended change. The
later steps then set combat **off** deliberately, per test, in the files that
are about the off game.

Rejected: `story.md`'s literal "on where the file is about fighting and off
nowhere else matters". Judging file by file which tests can tolerate off mixes
a semantic change into a mechanical sweep, and it is wrong in at least two
places that are not obviously "about fighting" — `Board.test.tsx`'s
`cannot-move-or-attack` condition and `fullGame.test.ts`'s pass guard both
change answers when combat goes off. A uniform `true` costs nothing and makes
the sweep provable.

### D5. Off is the default at every layer that has one

- `startingGameState`'s option default: off.
- `useAppScreen`'s initial state: off.
- The start screen's preselection: OFF, leftmost.
- `App.tsx`'s `createStartingSession` — the never-shown starting position
  built at mount before PLAY is pressed — takes the default and is therefore
  off. Harmless: it is replaced by the first PLAY press and nothing reads it.

The `new-game` intent carries **no** default: the reducer uses what it is
handed, exactly as it does for the seed, the length, the fleet size and the
charged-node count.

### D6. The refusal sentence ships with the refusal reason

`rejectionSentence` in `src/board/announcements.ts` is an exhaustive switch
over `RejectionReason` with no `default` branch, and `RejectionReason`
includes `AttackRefusalReason`. Adding a union member therefore **breaks
typecheck** until the sentence is written. The wording lands in the same step
as the reason (Step 4) for that reason — splitting them would leave an
un-green step, which the guide forbids.

The plan's wording, which Step 4 may tighten (recording any change in its
`Notes:`):

> "Combat is off in this game, so ships cannot attack."

It sits with the other §7 refusals in the switch. It is genuinely reachable —
a player with a ship selected can click an enemy ship — so it is written, not
left to a fallback. The other §7 refusal sentences are untouched: they still
answer for an on game.

### D7. The start screen's fifth group

Order becomes **Ships, Charged nodes, Combat, Rounds, Clock** — the new group
after Charged nodes and before Rounds. It is rendered by the same
`OptionChoice` the other four use, inside the same `fieldset` /
`legend` / `start-screen__choices` markup, with **no new CSS**: the legend
reads `Combat` (the stylesheet uppercases it), and the two radios read **OFF**
and **ON**, off first and checked at first.

The labels are start-screen chrome and live in `StartScreen.tsx` beside
`CLOCK_SETTING_LABELS`. A literal `Record<boolean, string>` is not
expressible in TypeScript, so the exact expression is the implementer's call —
an object keyed by `"off"` / `"on"` indexed with a ternary, or a two-entry
tuple indexed by the boolean, or a small helper function. The requirement is
that **one place holds both words**, so the component and its test do not each
invent them. Radio `value` attributes are strings in the DOM; `"off"` and
`"on"` are the natural ones.

### D8. Where "combat on lets ships attack" is asserted end to end

`App.test.tsx` can demonstrate it, and this is worth writing down because it
looks like it should not be possible. In the **six-a-side** opening layout
(the default), green starts on **L1** and red on **O2**. That is the
long-knight shape — three columns and one row — priced at 3 in §6's table,
and ships start at the maximum of 6 power. Neither square is a planet (the
twelve planets are B3, D6, G4, J2, K6, N4 and their half-turn rotations), the
opening deal never places a node on an occupied square, and the squares the
shot passes over (M1, N1, O1, M2, N2) hold no ship in that layout. So the
attack is legal in **every** six-a-side opening deal, at every seed.

Step 9 therefore asserts, through the real app: with ON chosen, selecting the
green ship on L1 marks O2 as a target; with the default OFF, it does not. The
target mark is visible in the square's accessible label ("can attack here…",
`squareLabel.ts`), which `Board.test.tsx` already queries the same way.

If that assertion proves brittle in practice, the fallback is to assert the
group, its default and the choice surviving a return to the start screen in
`App.test.tsx`, and to leave "ON lets ships attack" to `useAppScreen.test.tsx`
(the intent carries `true`) and the rules-layer tests (Steps 4 and 5) — with
the reason recorded in `Notes:`.

### D9. What is **not** touched

- `attackReach`, and the whole of §7's behaviour when combat is on.
- `relief.ts`, `trap.ts`, `countdown.ts`, `charging.ts`, `energy.ts`,
  `gameLength.ts`, `clock.ts` — none of them consults this choice.
- The HUD, the game-over panel, the clock region (S2).
- The Quick Guide (S9).
- The wording of "cannot move or attack" anywhere (S10).
- `seededReplay.test.ts`'s recorded expectations. This story adds no step to
  the seeded stream — a §7.1 draw that never happens consumes nothing — so
  with combat explicitly **on** that test plays exactly the game it played
  before. If any of its recorded figures move, stop and escalate: it means
  something changed the stream, which nothing in this story should.

## Step sequence at a glance

1. `rules.md` 0.33 → 0.34, `RULES_VERSION`, changelog — **its own commit,
   ahead of the code**.
2. `combat.ts` gains the offered settings, the default and the guard — no
   consumer yet.
3. `GameState` and `StartingGameStateOptions` carry `combatEnabled`, plus the
   behaviour-preserving sweep of every test that builds a state.
4. The gate: `"combat-is-off"` in `attackRefusalReason`, and its sentence.
5. The rules-layer consumers follow for free — `ply.test.ts` and
   `canMoveOrAttack.test.ts`, test-only.
6. The board shows no fight — `Board.test.tsx`, test-only.
7. The `new-game` intent carries the choice.
8. `useAppScreen` holds the choice.
9. The start screen's fifth group, and `App` wires it.
10. `README.md`.
11. The owner plays an off game and an on game. **Manual.**

---

### Step 1 — `rules.md` 0.33 → 0.34: combat becomes a choice

Status: committed

Notes: Bumped `rules.md` to 0.34 and `RULES_VERSION` to match, and added one
changelog entry. §7 now opens with the off/or-on statement (naming no
default) and says the rest of §7/§7.1 do not apply with combat off; §7.2
gained a clause stating it is unaffected and is the only way a ship reaches
a planet with combat off; §2's Turn entry now reads "one move, or one attack
when combat is on"; §5 restates the two kinds of turn and rebuilds the
never-deadlock argument on the free one-square orthogonal move and the
§8.6 step 7 relief rather than on attack range; §1's fights paragraph and
its three-random-elements list are now conditional on the choice; §10's
opening sentence adds combat to the list of what is chosen before play. §9
needed no edit — it only ever named the number of rounds and never listed
the other options either, so there was nothing to make conditional there.
Checked and left unchanged, as protections that describe what happens when
combat is on rather than claiming it always happens: §3.1's planet bullet,
§2's Trapped entry, §8.1's charged/depleted bullets, §8.5, and §6's closing
sentence on moving vs. attacking. `tech-notes.md`'s §8.2 sizing sentence
("Because a turn is one move or one attack...") was also checked and left
as-is: it still holds with combat off, where a turn is the "one move" half
of that same disjunction, so it does not claim every game has attacks.
`npm run typecheck`, `npm run lint` and `npm test` (64 files, 1208 tests, all
green — unchanged from baseline) all clean; `npm run format:check` reports
only the two pre-existing warnings. No deviation from the plan. Orchestrator correction before committing: §5's rebuilt paragraph claimed that only a trapped ship can do nothing at all, which the game can violate — a ship hemmed in by other ships with nothing it can reach and afford also cannot move. Reworded so the pass rule stays a real possibility rather than a claim the app could contradict.

Update `doc/ruleset/rules.md` so no section states attacking as a fact about
every game, bump the document to **0.34**, bump `RULES_VERSION` in
`src/rules/rulesVersion.ts` to match, and add **one** `doc/ruleset/changelog.md`
entry for 0.34, newest first, in the shape the 0.33 entry uses. This step is
**its own commit, ahead of all code changes** — the document is what every
later step implements.

Phrase the choice the way §4 and §8.1 phrase theirs: named where the choice
is defined, referred back to elsewhere, **naming no default** and never using
the words "standard game" (see the Vocabulary reminder above).

**§7, "Combat" — where the choice is defined**, since it is the section the
choice governs. Open the section by stating it: combat is **off or on**, the
same for both players, chosen before play begins and fixed for the game's
lifetime; with it **off**, no attack is legal for either player, and the rest
of §7 and §7.1 simply do not apply. Say that with combat off a turn is a move
(pointing at §5). The body of §7 then reads as it does today, as the
description of an on game — the range and pricing, the two protections, the
"no winner" paragraph, the trade paragraph and the two consequences for nodes
all stay as written.

**§7.1, "Returning to a planet"** — reachable only through a fight, so it is
covered by §7's opening. No change beyond what §7's opening already says
unless a sentence there claims a fight happens in every game.

**§7.2, "Returning by choice"** — state that it is unaffected: it is a move
and not an attack, so it is available whether combat is off or on (S4). With
combat off it is the only way a ship reaches a planet, which is worth one
clause.

**§2, "Words used in these rules"** — the **Turn** entry becomes "a turn is
one move, or one attack when combat is on (section 7)". The **Trapped** entry
is a protection that is simply never tested with combat off; leave it as
written unless it claims attacking happens rather than describing what happens
when it does.

**§5, "Turns"** — the two kinds of turn become one kind plus the other when
combat is on. Then re-state the passing rule and its reasoning so both read
true at either setting: a player who cannot move passes; with combat off that
is the only way a turn can pass other than being out of time (§10). **The
paragraph's existing argument that the game can never deadlock must still read
true with no attacks in it** — today it reasons from "an attack reaches only
as far as the attacker's power allows, and a ship holding a node has no attack
available to it at all", which is an on-game argument. Rebuild it on what
holds at both settings: the free one-square orthogonal move means a ship with
an empty square beside it can always move, a trapped ship (§8.5) can do
nothing at all, and §8.6 step 7 exists to relieve a side whose ships are all
trapped.

**§1, "Overview"** — the fights paragraph ("Ships are never destroyed. A fight
has no winner…") becomes conditional on the choice, and the list of three
random elements says the third — which planet the two ships in a fight are
pushed back to — arises only when combat is on. Keep the paragraph's shape:
this is a conditional, not a deletion.

**§9 and §10** — where they list what is chosen before play, combat joins the
fleet size, the charged-node count, the rounds and the clock. **§10's opening
sentence** is the natural place to say the full set. §9 today names only "the
number of rounds chosen before play begins" and may well need nothing; check
it and say so in `Notes:` either way.

**The remaining "cannot be attacked" statements** — §3.1's planet bullet, §2's
Trapped entry, §8.1's charged and depleted bullets, §8.5 — are protections
that are simply never tested with combat off. **This is a check of each, not a
rewrite of any**: leave a sentence alone unless it claims attacking happens
rather than describing what happens when it does. List in `Notes:` which
sections were checked and which were left.

**`doc/ruleset/tech-notes.md`** — its §8.2 sizing argument opens "Because a
turn is one move or one attack, at most one countdown can start per turn".
That still holds with combat off, where a turn is one move. It is development
notes, not the ruleset, and carries no version of its own; adjust the clause
only if it reads as a claim that every game has attacks, and record either way
in `Notes:`.

**The changelog entry** states that this is a **gameplay change** — a whole
kind of turn becomes optional — and so would be a tag candidate, with tagging
staying on hold (S7). Say what changed section by section, in the shape the
0.33 entry uses. Do not name a default in the entry either; which setting the
app preselects is an app matter and belongs in this plan and the README, not
in the ruleset's changelog.

Depends on: nothing. This is the first step.

Verification (automated): `npm test` green — in particular
`src/rules/rulesVersion.test.ts`, which asserts `RULES_VERSION` matches the
version in `rules.md`, so a bump in one and not the other fails. Test count
stays at 1208: no behaviour has changed yet. `npm run typecheck` and
`npm run lint` clean; `npm run format:check` reporting only the two
pre-existing warnings from the baseline. Plus a read of the changed sections
confirming no section of `rules.md` now states attacking as something every
game has, and that §5's deadlock argument reads true with no attacks in it.

---

### Step 2 — `combat.ts` gains the offered settings, the default and the guard

Status: committed

Notes: Done inline by the orchestrator rather than dispatched — the step is a
constant, a default and a guard with no consumer. `COMBAT_SETTINGS`
(`[false, true]`, off first), `DEFAULT_COMBAT_ENABLED` (`false`) and
`isCombatSetting` were added to `combat.ts` here, then moved to the new leaf
module `combatSetting.ts` during Step 3 to avoid a runtime import cycle with
`gameState.ts` — see the amendment on D2. Their tests moved with them, to
`combatSetting.test.ts`. `combat.test.ts` pins the order, the
default, and that the guard accepts both booleans and rejects a string, a
number, `null`, `undefined` and an object. Nothing consumes any of it yet;
`attackRefusalReason`, `legalTargets` and `attackReach` are untouched.
Typecheck and lint clean; suite 1212 tests, up from 1208.

Add to `src/rules/combat.ts`, beside the existing §7 code and in the shape
`clock.ts`, `fleet.ts` and `nodes.ts` use for their own options:

- **the offered settings**, as a readonly array of the two booleans in the
  order the start screen renders them — **off first**, so leftmost is what the
  app preselects (say that in the doc comment, as `CLOCK_SETTINGS` and
  `FLEET_SIZES` do);
- **the app's default**, off;
- **a type guard** over an unknown value, with a doc comment in
  `isClockSetting`'s spirit: nothing in the app calls it yet, and it exists
  for the boundary a game record or a saved-options load will need.

Nothing consumes any of it in this step. Naming is the implementer's call
within one constraint: it must read as the sibling of `CLOCK_SETTINGS` /
`DEFAULT_CLOCK_SETTING` / `isClockSetting`, and the boolean the rest of the
app passes around is `combatEnabled` (D1).

Why it comes here: Steps 3, 8 and 9 all import the default and the offered
settings, and a constant with no consumer is the smallest thing that breaks
the cycle between "the state has a field" and "the app has a default to put
in it".

Do **not** touch `attackRefusalReason`, `legalTargets` or `attackReach` in
this step — the gate is Step 4.

Depends on: Step 1 (the rules document defines the choice these constants
offer).

Verification (automated): `npm test` green, with new cases in
`src/rules/combat.test.ts` pinning that the offered settings are exactly
`[false, true]` in that order, that the default is `false`, and that the guard
accepts both booleans and rejects a non-boolean (a string, a number, `null`,
`undefined`). `npm run typecheck` and `npm run lint` clean. Test count rises.

---

### Step 3 — `combatEnabled` becomes part of the game state

Status: committed

Notes: `GameState` gained the required `combatEnabled: boolean` and
`StartingGameStateOptions` the optional `combatEnabled?: boolean` (default
`DEFAULT_COMBAT_ENABLED` from Step 2, no runtime validation, per D2);
`startingGameState` destructures it with the default and writes it onto the
returned state, drawing no extra randomness. Swept 28 test files (the plan's
24 plus the four "further files" it names — `Hud.test.tsx`,
`RoundCounter.test.tsx`, `nodePool.test.ts`, `seededReplay.test.ts`), setting
`combatEnabled: true` in every local builder and at every `startingGameState`
call in a test, uniformly, per D4. Gave the optional `combatEnabled` config
knob (default `true`) to `Board.test.tsx`'s `attackState` and `rangeState`,
`session.test.ts`, `combat.test.ts`, `canMoveOrAttack.test.ts` and
`ply.test.ts`, as D4/Step 3 direct, for the config-object builders those
files' later steps will need to flip; other files' builders got a bare
literal `true`. `gameState.test.ts` got the two exception cases (defaults to
off; carries a given setting through, changing nothing else) plus a third
pinning the field survives an applied move — `applyMove`'s result carries
`combatEnabled: true` unchanged. `attackRefusalReason`, `legalTargets` and
`attackReach` are untouched, so combat still happens in every game at the end
of this step, exactly as intended. `npm run typecheck` (a missed builder
would have been a compile error — none were) and `npm run lint` clean;
`npm test` 64 files, 1215 tests, all green (up from 1212, the three new
`gameState.test.ts` cases); `npm run format:check` reports only the two
pre-existing baseline warnings. No test's existing expectation changed,
including `seededReplay.test.ts`'s recorded figures. No deviation from the
plan. Orchestrator follow-up before committing: moved the Step 2 constants out of `combat.ts` into the new leaf module `combatSetting.ts` (and their tests into `combatSetting.test.ts`), because `gameState.ts` importing them from `combat.ts` created the first runtime import cycle in `src/rules/`. See the amendment on D2. Suite 65 files, 1215 tests, green.

Add the field to the state and to the starting options, and sweep every test
that builds a state so the suite stays green and **unchanged in meaning**.

**Production changes, all in `src/rules/gameState.ts`:**

- `GameState` gains a **required** `combatEnabled: boolean`, documented in the
  shape `lengthInRounds` and `chargedNodeCount` are documented: fixed for the
  game's lifetime once set by `startingGameState`, read from here by
  everything that needs it, and **not derivable from a board** — a board with
  no fights on it is indistinguishable from one whose players have not fought
  yet (D1).
- `StartingGameStateOptions` gains an **optional** `combatEnabled?: boolean`,
  defaulting to the constant from Step 2 (off), with a doc comment that says
  plainly why it is **not** validated at runtime the way its three neighbours
  are: a boolean admits only the two offered values, so there is nothing to
  reject (D2). Do not add a `RangeError` for it.
- `startingGameState` destructures it with the default and writes it onto the
  returned state. It draws no randomness and changes no draw order: the
  opening deal is byte-for-byte what it was.

Nothing reads the field yet. `attackRefusalReason` is untouched, so **combat
still happens in every game** at the end of this step — that is deliberate,
and it is what makes the sweep provably inert.

**The sweep (D4).** Set `combatEnabled: true` in the local state builder of
each of these **24** files, and pass `combatEnabled: true` explicitly at every
`startingGameState` call in a test:

`src/board/Board.test.tsx`, `src/board/EnergyOverlay.test.tsx`,
`src/board/announcements.test.ts`, `src/clock/ClockRegion.test.tsx`,
`src/clock/useGameClock.test.tsx`, `src/game/session.test.ts`,
`src/hud/GameOverPanel.test.tsx`, `src/hud/ScoreDisplay.test.tsx`,
`src/hud/TurnIndicator.test.tsx`, `src/rules/camping.test.ts`,
`src/rules/canMoveOrAttack.test.ts`, `src/rules/charging.test.ts`,
`src/rules/combat.test.ts`, `src/rules/endOfTurn.test.ts`,
`src/rules/energy.test.ts`, `src/rules/fullGame.test.ts`,
`src/rules/gameLength.test.ts`, `src/rules/gameState.test.ts`,
`src/rules/movement.test.ts`, `src/rules/openingBoard.test.ts`,
`src/rules/ply.test.ts`, `src/rules/recovery.test.ts`,
`src/rules/relief.test.ts`, `src/rules/trap.test.ts`.

Further files call `startingGameState` without building a literal —
`src/hud/Hud.test.tsx`, `src/hud/RoundCounter.test.tsx`,
`src/rules/nodePool.test.ts`, `src/rules/seededReplay.test.ts` among them.
Pass `combatEnabled: true` there too. The rule is uniform: **every existing
test runs the game it was written against, which is a game with combat on.**

Two exceptions, both in `src/rules/gameState.test.ts`, which is where the
default is the subject:

- a case asserting a state built with no options carries `combatEnabled`
  **false**;
- a case asserting the option is carried through to the state when passed,
  both ways.

Where a local builder takes a config object, give it an optional
`combatEnabled` knob defaulting to `true` in the files later steps need to
flip (`combat.test.ts`, `ply.test.ts`, `canMoveOrAttack.test.ts`,
`Board.test.tsx`, `session.test.ts`); elsewhere a bare `combatEnabled: true`
in the literal is enough.

Also add to `gameState.test.ts` a case that the field survives play — apply a
move (or an end-of-turn sequence) and assert `combatEnabled` is unchanged, the
same way the lifetime of `lengthInRounds` and `chargedNodeCount` is pinned.

Why it comes here: the field must exist before anything can read it, and doing
the sweep in one pass — rather than file by file as failures appear in later
steps — keeps each later step's diff about behaviour instead of about
builders.

Depends on: Step 2 (the default constant).

Verification (automated): `npm test` green with **no existing expectation
changed** — every assertion in the 24 files and the `startingGameState`
callers still asserts exactly what it asserted before, including
`src/rules/seededReplay.test.ts`'s recorded figures (D9). `npm run typecheck`
clean, which is also the proof the sweep is complete: a missed builder is a
compile error, not a silent default. `npm run lint` clean. Test count rises by
the new `gameState.test.ts` cases.

---

### Step 4 — The gate: `"combat-is-off"`, and the sentence that answers it

Status: committed

Notes: Added `"combat-is-off"` to `AttackRefusalReason` in `src/rules/combat.ts`
and returned it from `attackRefusalReason` immediately after the
`isGameOver` check, ahead of every other check, per D3. Updated the
function's doc comment to describe the new first-class check and its
precedence (game-over still wins over it), and updated `legalTargets`'s doc
comment to say it is empty with combat off and that it carries no combat
check of its own — its existing final filter, which keeps only squares
`attackRefusalReason` approves, already empties it. `attackReach` untouched.
Added the case to `rejectionSentence` in `src/board/announcements.ts` with
the wording from D6, unchanged: "Combat is off in this game, so ships
cannot attack." Added four new cases to `combat.test.ts` (a perfectly legal
target refused as `"combat-is-off"`; `"game-over"` still winning over it in
an ended off game; `"combat-is-off"` answered rather than the specific
reason for a target that would have been refused anyway — out of range, on
a planet, friendly; `legalTargets` empty with combat off where the same
position has several targets with combat on) and one row to
`announcements.test.ts`'s parameterised rejection-sentence table. No
production file needed a second gate — `Board.tsx`, `session.ts`, `ply.ts`
and `canMoveOrAttack.ts` were not touched, as D3 predicted. `npm run
typecheck` and `npm run lint` clean; `npm test` 65 files, 1220 tests, all
green (up from 1215; every pre-existing test in every other file passed
untouched, with combat on from Step 3's sweep); `npm run format:check`
reports only the two pre-existing baseline warnings after running
`prettier --write` on the new test additions in `combat.test.ts`. No
deviation from the plan.

**`src/rules/combat.ts`:**

- Add `"combat-is-off"` to `AttackRefusalReason`.
- In `attackRefusalReason`, return it **immediately after the `isGameOver`
  check** and before every other check, so an ended game still refuses as
  `"game-over"` and every other activation in an off game refuses as
  `"combat-is-off"` rather than as a planet, range, affordability or path
  answer (D3).
- Update the function's doc comment — it currently walks its own check order —
  so the new first-class check is described, and update `legalTargets`'s doc
  comment to say it is empty with combat off. **Do not add a check to
  `legalTargets`**: its final filter already empties the list, and a second
  gate is exactly what this story forbids (D3).
- Leave `attackReach` alone.

**`src/board/announcements.ts`:** add the case to `rejectionSentence`,
alongside the other §7 refusals, with the plain player-voice wording from D6:
"Combat is off in this game, so ships cannot attack." This is required in the
same step because the switch is exhaustive over `RejectionReason` and will not
compile without it (D6).

**Tests in this step:**

- `src/rules/combat.test.ts` — with combat off, `attackRefusalReason` answers
  `"combat-is-off"` for a target that would otherwise be **perfectly legal**
  (in range, affordable, clear path, neither ship protected); `"game-over"`
  still wins over it in an ended game; and it answers `"combat-is-off"` rather
  than the specific reason for a target that would have been refused anyway
  (out of range, on a planet, friendly). `legalTargets` is empty for every
  ship with combat off, including one with several targets when combat is on.
  **With combat on, every existing expectation stands unchanged.**
- `src/board/announcements.test.ts` — the new sentence for a `rejected` event
  carrying the new reason.

Depends on: Step 3 (the state carries the field).

Verification (automated): `npm test` green, including the new
`combat.test.ts` and `announcements.test.ts` cases; `npm run typecheck` and
`npm run lint` clean. Every other test file must still pass **untouched** —
they all run with combat on after Step 3, so any failure elsewhere means the
check landed in the wrong place.

---

### Step 5 — The rules-layer consumers follow for free

Status: committed

Notes: Test-only, as planned. `src/rules/ply.test.ts` gained two cases:
`applyAttack` on an otherwise perfectly legal H8-to-H9 jab with combat off
refuses with `"combat-is-off"` and leaves the input state exactly as it went
in (compared whole, via `structuredClone`, the same pattern the file's other
"leaving the state exactly as it went in" case uses); and `applyPassGuard`,
reusing the existing "no legal move but a legal attack" fixture (green-1
boxed in at A1 with a legal attack at B1) with combat off instead of on,
passes the ply with reason `"cannot-move-or-attack"`. `src/rules/canMoveOrAttack.test.ts`
gained one case reusing the existing "eight neighbours, no legal move, every
neighbour a legal target" fixture: with combat on both `shipCanMoveOrAttack`
and `sideToMoveCanMoveOrAttack` answer true on it, and with combat off both
answer false, asserted side by side from the same ship configuration. No
production file changed — `attackRefusalReason`'s single gate (Step 4) was
sufficient for both `applyAttack` and the pass guard's use of
`sideToMoveCanMoveOrAttack`/`shipCanMoveOrAttack`, exactly as D3 predicted;
no second gate was needed. `npm run typecheck` and `npm run lint` clean;
`npm test` 65 files, 1223 tests, all green (up from 1220). No deviation from
the plan.

Test-only. This step exists to prove D3's claim — that one gate is enough —
at the rules layer, and to leave the proof behind as tests.

- **`src/rules/ply.test.ts`** — `applyAttack` with combat off returns the
  refused outcome carrying `"combat-is-off"`, and **changes nothing**: no ship
  moves, no power is spent, `randomSeed` does not advance, the ply number and
  side to move are untouched, and the state object is the one that went in
  (compare the whole state, not a field or two).
- **`src/rules/canMoveOrAttack.test.ts`** — reuse the existing fixture where a
  ship has a legal target and no legal move (a 1-power ship at H8 with all
  eight neighbours occupied by enemies): with combat **on** both
  `shipCanMoveOrAttack` and `sideToMoveCanMoveOrAttack` answer true, and with
  combat **off** both answer false.
- Pin the §5 pass guard's consequence: a side that can only attack passes its
  ply with combat off. `applyPassGuard` in `ply.ts` is the function to drive;
  a pass effect comes back where none did before. Put this case wherever the
  pass guard is already exercised (`ply.test.ts`), not in a new file.

**No production change is expected in this step.** If one turns out to be
needed, that is the finding D3 describes: record it in `Notes:` in as many
words and escalate to the owner before adding a second gate.

Depends on: Step 4 (the refusal reason exists).

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean. Test count rises.

---

### Step 6 — The board shows no fight

Status: committed

Notes: Test-only, as planned, both in `src/board/Board.test.tsx`. In the
existing "attack targets" describe block, added a case using the file's own
`attackState` builder (which already takes a `combatEnabled` override): with
combat off, no square anywhere is marked `can attack here` and H9 renders as
a plain occupant with no mark segment at all; the same `attackState()`
position with combat on marks H9 with the existing target wording — one test,
both settings, so it is about the setting and not the position. In "ship
conditions", added a case reusing the eight-neighbours fixture from
`canMoveOrAttack.test.ts` (a 1-power ship with every one of its eight
neighbours held by an enemy, so it has no legal move but, with combat on, a
legal attack at each of them): with combat off the ship carries the existing
`cannot-move-or-attack this turn` condition, and with combat on it carries no
condition at all. No production file changed — `Board.tsx`'s existing reads
of `legalTargets` and `shipCanMoveOrAttack` needed nothing of their own, as
D3 predicted. `npm run typecheck` and `npm run lint` clean; `npm test` 65
files, 1225 tests, all green (up from 1223); `npm run format:check` reports
only the two pre-existing baseline warnings. No deviation from the plan.

Test-only, in `src/board/Board.test.tsx`:

- In a session whose state has combat **off**, with a ship selected that has
  enemy ships within reach, **no square carries the `target` mark** — check it
  the way the file already checks marks (the square's accessible label, from
  `squareLabel.ts`, and/or the rendered mark), and check the same position
  with combat **on** does mark them, so the test is about the setting and not
  about the position.
- A ship that could only attack — no legal move, an enemy in range — carries
  the `cannot-move-or-attack` condition with combat off, and does not with
  combat on.

Again **no production change is expected**; `Board.tsx` reads `legalTargets`
and `shipCanMoveOrAttack` and needs nothing of its own (D3). If it does,
record and escalate.

Depends on: Step 4 (the refusal reason), Step 3 (the builder in this file
takes the field).

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean.

---

### Step 7 — The `new-game` intent carries the choice

Status: committed

Notes: `SessionIntent`'s `new-game` variant gained a required
`combatEnabled: boolean`, and `sessionReducer` passes `intent.combatEnabled`
straight into `startingGameState`'s options; the doc comment now names
combat among the fields the reducer uses without reaching for a default.
`useAppScreen.ts`'s single `new-game` dispatch passes
`DEFAULT_COMBAT_ENABLED` from `combatSetting.ts` as a literal, exactly the
stub the step describes — Step 8 replaces it with held state. In
`session.test.ts`, the seven existing `new-game` dispatches gained
`combatEnabled: true` (Step 3's sweep rule); added two cases asserting a
dispatch with `combatEnabled: false` and one with `true` each produce a
state carrying that value; added a case in "the attack gesture" asserting an
otherwise-legal H8→H9 attack is rejected as `"combat-is-off"` with the
selection surviving, using the file's existing `combatEnabled` knob on
`buildState`; and added a case asserting a `selected` event reports
`targetCount` 0 with combat off while `destinationCount` is unchanged from
the same position with combat on (H8 with a 3-power ship and a target at
H10, reusing the existing beyond-the-eight-neighbours fixture). No other
test file needed a change — `useAppScreen.test.tsx`'s and `App.test.tsx`'s
`new-game` assertions use `objectContaining`/have no exact-shape dispatch
that the new required field would break. `npm run typecheck` and
`npm run lint` clean; `npm test` 65 files, 1229 tests, all green (up from
1225). No deviation from the plan.

**`src/game/session.ts`:** the `new-game` intent gains a **required**
`combatEnabled: boolean`, alongside the seed, the length, the fleet size and
the charged-node count; `sessionReducer` passes it straight into
`startingGameState`'s options. Update the intent's doc comment, which already
says the reducer "uses what it is handed and never draws a seed or reaches for
a default itself" — that sentence now covers this field too.

**`src/useAppScreen.ts`:** making the intent field required breaks the one
place that dispatches `new-game`. Pass the **default constant from Step 2** as
a literal there for now, so this step compiles and stays green. Step 8 turns
that literal into held state. This is the minimal stub that breaks the cycle
between "the intent needs a value" and "the app needs somewhere to keep one";
say so in `Notes:` so the next implementer knows the literal is temporary.

**Tests in `src/game/session.test.ts`:**

- the existing `new-game` dispatches gain the field (Step 3's sweep rule:
  `true`, so they play the game they played before);
- a `new-game` dispatch with `combatEnabled: false` produces a session whose
  state carries it, and one with `true` likewise;
- with a ship selected in an off game, activating an enemy square is
  **rejected** with `"combat-is-off"` and the **selection survives** the
  rejection, exactly as it does for any other refusal (assert
  `selectedShipId` is still the selected ship);
- a `selected` event in an off game reports `targetCount` **0**, with
  `destinationCount` unchanged from the same position with combat on.

Depends on: Steps 2, 3 and 4.

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean.

---

### Step 8 — `useAppScreen` holds the choice

Status: committed

Notes: `AppScreen` gained `combatEnabled` and `setCombatEnabled`, held with
`useState(DEFAULT_COMBAT_ENABLED)` beside the other four options;
`handlePlay` now dispatches the held `combatEnabled` instead of Step 7's
literal. The hook's doc comment and the module header now say "five" instead
of "four" and list combat among what `new-game` carries. In
`useAppScreen.test.tsx`: the "opens on the start screen" case gained a
`combatEnabled` assertion of `false`; the "PLAY dispatches" case's
`objectContaining` gained `combatEnabled: false`; and a new case sets
`combatEnabled(true)`, asserts the dispatched intent carries `true`, that the
value survives `handleReturnToStart`, and that a second `handlePlay`
dispatches `true` again. `npm run typecheck` and `npm run lint` clean;
`npm test` 65 files, 1230 tests, all green (up from 1229). No deviation from
the plan. Committed together with Step 7: the two steps were implemented in one dispatch and Step 8 replaces Step 7's temporary literal in the same file, so there is no intermediate state worth a commit of its own.

**`src/useAppScreen.ts`:** replace Step 7's literal with held state.
`AppScreen` gains `combatEnabled` and `setCombatEnabled`, initialised from
Step 2's default (off), and `handlePlay` dispatches it with the other options.
Keep it beside the other four so a game returns to the start screen with the
setting it was played with still chosen — and update the hook's doc comment,
which today enumerates "the four options".

**Tests in `src/useAppScreen.test.tsx`:**

- the hook starts with combat **off**;
- pressing play dispatches `new-game` carrying `combatEnabled: false` by
  default, in the shape the file already asserts intents
  (`expect.objectContaining`);
- after `setCombatEnabled(true)`, pressing play dispatches
  `combatEnabled: true`;
- the setting survives `handleReturnToStart` — the hook still reports the
  chosen value after returning to the start screen, and a second
  `handlePlay` dispatches it again.

Depends on: Step 7 (the intent field exists).

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean.

---

### Step 9 — The start screen's fifth group, and `App` wires it

Status: committed

Notes: `StartScreen.tsx` gained the `Combat` fieldset between `Charged nodes`
and `Rounds`, rendered by the existing `OptionChoice` with `COMBAT_SETTINGS`
(off first) from `combatSetting.ts`; the two labels ("OFF"/"ON") live in a
new `COMBAT_SETTING_LABELS: Record<"off" | "on", string>` beside
`CLOCK_SETTING_LABELS`, keyed by a small `combatSettingValue` helper that
also supplies each radio's `value` attribute — the `Record<boolean, string>`
TypeScript cannot express, per D7. New `combatEnabled`/
`onCombatEnabledChange` props, controlled like the other four; no CSS
touched. The module header and the component's doc comment now say "five"
instead of "four". `App.tsx` threads `combatEnabled`/`setCombatEnabled` from
`useAppScreen` to `StartScreen`; nothing else in `App` changed, per S2.
`StartScreen.test.tsx` gained a render-overrides knob and helper labels for
combat, extended the four-group order test to five (Ships, Charged nodes,
Combat, Rounds, Clock), and added cases for both labels with the given one
checked, OFF checked by default with radios ordered OFF then ON, and the
change handler firing `true`/`false` on ON/OFF without touching the other
four handlers. `App.test.tsx` gained a `combatGroup()` helper; the
opening-screen test now asserts five groups with OFF preselected; the
existing guide-round-trip test (already the file's established way of
proving an option survives a return to the start screen, alongside
`useAppScreen.test.tsx`'s direct coverage of `handleReturnToStart`) now also
sets Combat to ON before opening the guide and asserts ON survives the
return; and two new PLAY-and-select cases exercise D8's L1/O2 shot directly
through the real app — the default OFF marks no square as a target, and
choosing ON before PLAY marks O2 with the exact "can attack here, both ships
would return to planets" wording — so the fallback in D8 was not needed.
`npm run typecheck` and `npm run lint` clean; `npm test` 65 files, 1236
tests, all green (up from 1230); `npm run format:check` reports only the two
pre-existing baseline warnings after running `prettier --write` on
`StartScreen.test.tsx` (whose new combat import needed wrapping) and
reordering that import alphabetically to match the production file's
convention. No deviation from the plan.

Layout note for the owner's manual check (Step 11): `.start-screen` is a
single `flex-direction: column` box with `justify-content: center` and no
`overflow` rule of its own; nothing in this step added height, but a fifth
fieldset is a fifth thing competing for the same fixed-height column on a
short landscape window, and there is no scroll affordance if it overflows.
Worth a specific look in Step 11 rather than assuming the existing layout
absorbs a fifth group for free.

**`src/start/StartScreen.tsx`:** add the fifth option group, **after Charged
nodes and before Rounds** (D7): legend `Combat`, two `OptionChoice` radios
from the offered settings in order — **OFF** then **ON** — with OFF checked at
first, its own `useId` group name, and the labels held in one lookup beside
`CLOCK_SETTING_LABELS`. Props `combatEnabled` and `onCombatEnabledChange`,
controlled like the other four. **No new CSS**, and no change to
`StartScreen.css`. Update the component's doc comment and the module header,
both of which say "the four options".

**`src/App.tsx`:** take `combatEnabled` and `setCombatEnabled` from
`useAppScreen` and pass them to `StartScreen`. Nothing else in `App` changes —
the setting is never shown during a game (S2).

**Tests in `src/start/StartScreen.test.tsx`:**

- the Combat group renders with both labels and the given one checked;
- the five groups render in order **Ships, Charged nodes, Combat, Rounds,
  Clock** (the file already has a test asserting the four-group order — extend
  it rather than adding a second);
- OFF is checked when the prop is off, and the radios are in the order OFF,
  ON;
- clicking ON calls `onCombatEnabledChange` with `true`, and clicking OFF from
  an ON state calls it with `false`.

**Tests in `src/App.test.tsx`:**

- the start screen's opening assertion, which today names "all four option
  groups at their defaults", becomes five with OFF preselected;
- pressing PLAY with the defaults starts a game in which selecting the green
  ship on **L1** marks **no** square as a target;
- choosing **ON** and pressing PLAY starts a game in which selecting the green
  ship on L1 **does** mark **O2** as a target — the long-knight shot described
  in D8, legal in every six-a-side opening deal;
- the choice survives a return to the start screen: after a game started with
  ON, returning shows ON still checked.

If the L1/O2 assertion proves brittle, take D8's fallback and record the
reason in `Notes:`.

Depends on: Step 8 (the hook holds the option).

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean; `npm run format:check`
reporting only the two pre-existing warnings from the baseline.

---

### Step 10 — `README.md`

Status: pending

`README.md` describes a game that always has fighting: "Each ship carries
power, a reserve it spends on every move and every attack", a paragraph on
what an attack costs and where the two ships go, and a further mention inside
the expandable detail. Rewrite what needs it so combat reads as **a choice**,
in the README's player-facing voice: a game has no fighting unless you turn
combat on, the app starts with it off, and with it on §7 works exactly as the
README already describes. Do not make the README a second ruleset — a sentence
where the choice is introduced and the existing prose held as the on game is
the whole job.

Then run `/update-readme`, which reviews the branch diff and updates anything
else the README describes that this story changed.

Also confirm, and say so in `Notes:` rather than silently leaving it, that
`src/guide/guideCopy.ts` needs **no** change: the Quick Guide teaches the
board, movement and nodes and never mentions combat (S9).

Depends on: Steps 1 to 9 (the README describes the finished behaviour).

Verification (automated): `npm test` and `npm run lint` green;
`npm run format:check` reporting only the two pre-existing warnings from the
baseline; and a read of `README.md` confirming it describes combat as a choice
made before play, says the app starts with it off, and no longer describes a
game that always has fighting.

---

### Step 11 — The owner plays an off game and an on game

Status: pending

The story's manual checks, gathered in one place. Nothing to implement; the
owner runs the app (`npm run dev`) and looks.

Depends on: every previous step.

Verification (manual):

- **The start screen.** Five option groups in the order **Ships, Charged
  nodes, Combat, Rounds, Clock**, with **OFF** checked in the new group and
  the other four at their usual preselections. Check the screen on a **short
  landscape window** — four groups already fill it and this is the first story
  to add a fifth. If the fifth group overflows or is cut off, **stop and
  report it**: restyling the start screen is out of scope for this story and
  is the owner's call, not a fix to improvise.
- **An off game.** Press PLAY with the defaults. Select a ship standing within
  reach of an enemy ship: no enemy square is highlighted as a target. Click
  the enemy ship anyway: the activation is refused and the ship stays
  selected. Play the game through to its last round with nothing but moves —
  it never deadlocks, it never offers a fight, a side that cannot move passes,
  and the game ends normally with the usual score.
- **An on game.** Return to the start screen, choose **ON**, press PLAY, and
  confirm §7 behaves exactly as it does today: an enemy in range is
  highlighted, the attack costs what the same move would cost, a ship on a
  planet or on a charged or depleted node can neither attack nor be attacked,
  and both ships in a fight end up on empty planets.
- **The choice sticks.** After that game, return to the start screen and
  confirm **ON** is still checked, and that pressing PLAY again deals a second
  game that still allows attacks.
