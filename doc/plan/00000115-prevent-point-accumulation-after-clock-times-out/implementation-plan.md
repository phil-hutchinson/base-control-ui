# Implementation plan — Story 00000115: No energy after the clock runs out

## Overview

A player whose clock has run out is already modelled: `state.outOfTime`
(`src/rules/gameState.ts`, set by `markOutOfTime` when the session receives
a `clock-expired` intent), and every turn they have left is passed by
`applyOutOfTimePass` in `src/rules/ply.ts`, which runs the ordinary
end-of-turn sequence (`runEndOfTurn` in `src/rules/endOfTurn.ts`) through
the shared `passPly`. That sequence's step 2 pays the side that just
played whatever `turnCollection` (`src/rules/energy.ts`) reckons. So today a
player who is out of time goes on scoring for the nodes they stand on.

This story freezes their total: from the moment their clock reaches zero
they gain no energy from any source. Three steps:

1. The ruleset change, in its own commit (version 0.44 → 0.45).
2. The rule logic and its on-screen consequences: the end-of-turn
   collection, the two landing bonuses, the score pips and the score cell's
   hidden sentence.
3. The option tip for the clock, `README.md`, and the owner's play-through.

## Design decisions

### Where the freeze lives: `turnCollection`, not `runEndOfTurn`

`turnCollection` is, by its own file comment, "the one place that reckons a
side's whole end-of-turn collection, so the payout, the pips and the live
region cannot drift apart". It already has a `withheld` concept for the
player-matching nodes setting REQUIRED (steal.md §9): holding nodes but
paying nothing, with `countedNodes` 0 and `amount` 0, which `ScoreDisplay`
draws as crossed pips and `scoreSentence` words as a clause. Being out of
time is the same shape — held, not paying — so it is added as a second way
for the collection to be withheld. The end-of-turn payout, the pips and the
hidden score sentence then all follow from one place.

Rejected: skipping step 2 in `runEndOfTurn` when the side is out of time.
It would stop the payment but leave the pips lit (the HUD reads
`turnCollection`, not the end-of-turn sequence), which is exactly the drift
the single-reckoning design exists to prevent. Rejected too: guarding the
energy total itself (a helper every energy addition goes through). There
are only three places energy is ever added (end-of-turn step 2,
`claimPlanetBonus`, `claimActivityBonus`), and a central guard would still
leave the pips wrong.

### Out of time takes precedence and needs its own reason

When `state.outOfTime[side]` is true the collection is withheld whatever the
player-matching setting says: `countedNodes` 0, `amount` 0, and `withheld`
true exactly when the side holds at least one charged node (mirroring
REQUIRED, where holding nothing is not "withheld" — there is nothing to
cross). `heldSquares`, `standingOnOwnNode` and `ownNodeSquare` still report
the truth about the board, because the story is explicit that a held node
stays an ordinary held node.

`TurnCollection` gains a way to say **why** it is withheld (a reason field
distinguishing "own node missing" under REQUIRED from "out of time"; the
exact shape is the implementer's choice). This is needed because
`scoreSentence` in `src/board/announcements.ts` currently words every
withheld collection as ", none paying without its own node", which would be
false for an out-of-time player. Keeping `withheld` itself true in both
cases means `ScoreDisplay`'s lit/crossed pip logic works unchanged.

### Pip fills under DOUBLE while out of time

`pipFills` in `src/hud/ScoreDisplay.tsx` lists the own matched node twice
under DOUBLE, because DOUBLE counts it twice. When the collection is
withheld for being out of time, the crossed row is `heldSquares.length`
long — one cross per node held (the story: "each node they hold shows as a
crossed pip") — so the own node must appear once, not twice, or the row
would repeat one colour and drop the last node's. The own node is doubled in
the fill order only when the collection is not withheld. (Under REQUIRED
the own node is only ever listed once already, so this changes nothing
there.)

### Landing bonuses: no energy, and what still happens

A player who is out of time never moves or attacks, so the only way one of
their ships lands on a planet is being returned there by a fight the
opponent started (rules.md §7.1). Combat is not offered on the start
screen, so this path is unreachable from the app today, but the rule is "no
energy from any source" and the rule logic must implement it.

- **Classic planet bonus** (rules.md §3.4, `claimPlanetBonus` in
  `src/rules/ply.ts`): when the landing side is out of time, nothing happens
  — no energy, no `claimedOnPly` recorded, no `planet-bonus-claimed`
  effect. The classic bonus is nothing but a once-per-planet payment to one
  player; with the payment gone there is nothing left to claim. Rejected:
  recording the claim with an amount of 0 — the bonus panel would then show
  the planet as claimed, implying the player was paid, and the announcement
  would read "0 energy". Since an out-of-time player never lands anywhere
  by choice again, whether the planet is marked used has no further game
  consequence.
- **Planet effects** (steal.md §10, `claimActivityBonus` in
  `src/rules/ply.ts`): the claim **resolves in full** — the bonus is taken,
  the survivor is redrawn under race, a new bonus is dealt, Fuel powers
  ships, Additional nodes and Node scramble act — and only a points kind's
  energy is withheld: the side's energy is not raised, and the effect's
  `pointsAwarded` is 0. This cannot be a no-op like the classic case: a
  bonus planet is always empty (steal.md §10), so a ship standing on an
  unresolved bonus would break that invariant, and the story says bonuses
  that are not energy are unchanged. `resolveActivityBonusClaim` itself
  (`src/rules/activityBonus.ts`) is not changed — it keeps computing the
  kind's points and drawing from the seed exactly as before, so the random
  stream is identical whether or not the claimer is out of time; the
  withholding is applied in `claimActivityBonus` where the energy is added.
  The existing announcement wording for a points claim then reads "0
  energy.", which is true; it is not reworded.

### The turn in which the clock runs out

The clock runs out during the out-of-time side's own turn: the session
marks `outOfTime` first (`clock-expired`) and only then passes the turn
(`pass-out-of-time` → `applyOutOfTimePass` → `passPly` → `runEndOfTurn`).
So by the time that turn's end-of-turn sequence runs, `outOfTime` is
already set and the collection is withheld — the story's "this includes
the turn in which the clock runs out" falls out with no special handling.
A `cannot-move-or-attack` pass by an out-of-time side (via
`applyPassGuard`) goes through the same `runEndOfTurn`, so it is covered
too. A side with time left that passes because it cannot move or attack is
not out of time and collects as before.

Conversely, a turn completed before the buzzer counts in full. The clock
ticks only for the side to move and hands over the instant a move is
made, so `outOfTime` can only be set on a turn in which the side has not
acted — never on a turn whose move was made in time. Such a move's landing
bonus and its end-of-turn collection are paid as normal; no change is
needed for this, but the ruleset wording (Step 1) must not read as
withholding the player's last played turn, and Step 2's tests include a
case confirming that the move made just before the clock runs out still
pays.

### What is deliberately untouched

- `runEndOfTurn`'s other steps (power recovery, countdowns, depletion,
  traps, refill, retirement, relief) — the story requires they still run.
- `isGameOver`, the clock, `markOutOfTime`, the pass mechanics.
- `useDisplayedEnergy` / the count-up: the total simply stops changing.
- The Quick Guide (`src/guide/guideCopy.ts`) does not describe the clock,
  so it needs no change.

## Steps

### Step 1 — Ruleset: an out-of-time player gains no energy (0.45)

Status: committed

Notes: Implemented as planned. Added the new rule to rules.md §10 (with a
dedicated paragraph making explicit that a turn made before the clock
reaches zero pays in full, per the owner's clarification), corrected §8.4's
"only ever rises" to "never falls" and added the out-of-time exception
sentence, added the out-of-time exception to §8.6's step 2 and its passing
paragraph, added the "unless out of time" pointer to §3.4, added the
claiming pointer to steal.md §10, bumped RULES_VERSION to 0.45 and added the
changelog entry. `npm test`, `npm run typecheck` and `npm run lint` all
pass (2055 tests, including `rulesVersion.test.ts`). No deviations from the
plan.

Update the ruleset so it states the new rule, then bump the version. This
step touches only documents and the version constant, and is committed on
its own.

- `doc/ruleset/rules.md` §10 ("The clock"): after the paragraph "A player
  whose clock reaches zero passes every remaining turn…", state the new
  rule in player-facing language, following story.md's "The rules" list:
  from the moment a player's clock reaches zero — including the turn in
  which it does — they gain no energy from any source: nothing for the
  nodes they hold at the end of a turn, and no bonus pays them energy. Their
  total is frozen, not reduced. The rest of the end-of-turn order (§8.6)
  still runs for their passed turns — ships on planets recover power, and
  countdowns, depletion and traps go on as usual. Their ships stay where
  they are and keep their nodes; a node held by a player who is out of time
  pays nothing but is otherwise an ordinary held node (under steal the
  opponent can take it in the usual way). A landing that returns one of
  their ships to a planet after a fight pays them nothing: under the planet
  bonus it pays and uses up nothing; under planet effects the bonus is
  still claimed and replaced as usual and every bonus that is not energy
  (Fuel, Additional nodes, Node scramble) takes effect as usual, but a
  points bonus pays nothing. The opponent goes on playing and scoring
  normally. Keep the existing sentences that the game ends when both clocks
  have run out and that running out is not a loss.
- §8.4 ("Energy"): add the exception — a player who is out of time collects
  nothing (section 10). The sentence "Nothing in the game subtracts
  energy. A player's total only ever rises." should become consistent with a
  frozen total (e.g. "never falls").
- §8.6 ("End-of-turn order"): the paragraph on a turn that passes because
  the player could neither move nor attack ends "the passing player still
  collects exactly as they would otherwise" — correct it so it excepts a
  player who is out of time (section 10). Step 2's wording in the numbered
  list may carry the same short pointer.
- §3.4: the bullet "A player is paid the chosen amount of energy the first
  time one of their ships lands on one of their three planets" gains a
  short "unless they are out of time (section 10)" pointer, so the section
  does not contradict §10.
- `doc/ruleset/steal.md` §10: in "Claiming", add a one-sentence pointer that
  a player who is out of time still claims a bonus they land on, but a
  points bonus pays them nothing (rules.md §10). Leave the kinds table
  unchanged.
- Bump `**Rules version: 0.44**` in `rules.md` to **0.45**, and
  `RULES_VERSION` in `src/rules/rulesVersion.ts` to `"0.45"`.
- Add a `## 0.45 — …` entry at the top of `doc/ruleset/changelog.md`,
  newest first, in the style of the existing entries: say it is a gameplay
  change and so a tag candidate, with tagging on hold until the game plays;
  list what changed section by section.

Ruleset prose conventions: the player-facing word is "turn", never "ply";
"move" means only the movement action; the setting under steal is
"planet effects". Do not name any default. Write for a non-technical
reader.

Depends on: nothing. It comes first because the ruleset is what steps 2
and 3 implement.

Verification (automated): `npm test` passes, including
`src/rules/rulesVersion.test.ts`, which asserts `RULES_VERSION` matches
`rules.md` and that `changelog.md` has an entry for it; `npm run typecheck`
and `npm run lint` pass. Read the changed sections of `rules.md` and
`steal.md` once more and confirm none of them still says an out-of-time
player collects or is paid.

### Step 2 — Rule logic and HUD: withhold all energy once out of time

Status: committed

Notes: Implemented as planned, in `src/rules/energy.ts` (`TurnCollection` gains
`withheldReason: "out-of-time" | "required"`, present exactly when `withheld`
is true; being out of time takes precedence over player-matching nodes),
`src/rules/endOfTurn.ts` (comment only — step 2's existing `collection.amount
> 0` guard already covers the new case), `src/rules/ply.ts`
(`claimPlanetBonus` is a no-op when the landing side is out of time;
`claimActivityBonus` resolves the claim in full but reports `pointsAwarded`
as 0 and does not raise the side's energy when it is out of time),
`src/board/announcements.ts` (`scoreSentence` adds ", none paying, out of
time" ahead of REQUIRED's clause) and `src/hud/ScoreDisplay.tsx` (`pipFills`
only doubles the own node under DOUBLE when the collection is not withheld,
so an out-of-time DOUBLE row still crosses one pip per held node). Updated
the existing `applyOutOfTimePass` test in `src/rules/ply.test.ts` that
asserted the old (pre-story) behaviour of an out-of-time side still
collecting energy — that assertion was the very thing this story overturns —
and added the tests the plan names, including one confirming the opponent's
own forced pass still collects normally. Also added a session-level test in
`src/game/session.test.ts` (`sessionReducer — a turn made before the clock
runs out pays in full`) driving intents end to end: a move made with time
left ends its ply with an `energy-collected` effect and raises the mover's
total, and that total is then left untouched when a `clock-expired` intent
and a `pass-out-of-time` intent run on that same side's *next* turn — closing
the gap the first pass at this step left, per the coordinator's follow-up.
`npm test` (2069 tests), `npm run typecheck` and `npm run lint` all pass. No
deviations beyond the necessarily corrected pre-existing test.

Implement the freeze in the rule logic, and make the score pips and the
score cell's hidden sentence show it. See "Design decisions" above for the
reasoning behind each choice.

- `src/rules/energy.ts`, `turnCollection` and `TurnCollection`: when
  `state.outOfTime[side]` is true, the collection is withheld regardless of
  the player-matching setting — `countedNodes` 0, `amount` 0, `withheld`
  true exactly when `heldSquares` is non-empty; `heldSquares`,
  `standingOnOwnNode` and `ownNodeSquare` are reported as usual. Add a
  field saying why the collection is withheld, distinguishing REQUIRED's
  "own node missing" from "out of time". Update the doc comments on the
  interface, the function and the file header to describe the new case.
  `energyForNodesHeld` is unchanged.
- `src/rules/endOfTurn.ts`: no logic change is expected — step 2 already
  pays `collection.amount` and raises no effect for 0. Update its step 2
  comment to mention being out of time alongside REQUIRED.
- `src/rules/ply.ts`, `claimPlanetBonus`: when the landing side is out of
  time, return the state unchanged with no effect. `claimActivityBonus`:
  when the claiming side is out of time, resolve the claim exactly as now
  but do not raise the side's energy, and report `pointsAwarded` as 0 in
  the `activity-bonus-claimed` effect. Do not change
  `resolveActivityBonusClaim`. Update the doc comments of both functions
  (and the `applyMove` / `applyAttack` comments where they describe bonus
  payment) to state the exception.
- `src/board/announcements.ts`, `scoreSentence`: word the out-of-time
  withholding with its own clause (not REQUIRED's ", none paying without
  its own node"); the exact wording is the implementer's, short and
  player-facing, in the style of the existing clauses. Update its doc
  comment.
- `src/hud/ScoreDisplay.tsx`: the lit/crossed pip counts already follow
  `withheld`, so a withheld out-of-time collection draws one crossed pip per
  held node and none lit, with no value highlighted. In `pipFills`, list the
  own matched node twice under DOUBLE only when the collection is not
  withheld, so the crossed row carries each held node's colour once. Update
  the REQUIRED comment above the pip counts to cover being out of time.

Tests (add to the existing files, following their fixtures):

- `src/rules/energy.test.ts`: out of time while holding charged nodes →
  withheld, `countedNodes` 0, `amount` 0, reason out of time, held squares
  still reported; out of time holding nothing → not withheld, 0; out of time
  under DOUBLE standing on the own node and under REQUIRED standing on the
  own node → still withheld for being out of time; the other side, with
  time left, is unaffected.
- `src/rules/ply.test.ts`: `applyOutOfTimePass` for a side holding charged
  nodes leaves that side's energy unchanged, while the end-of-turn sequence
  still runs (for example a charged node's countdown still spends a turn,
  or a ship on a planet still gains power); no `energy-collected` effect is
  raised for that side. A `cannot-move-or-attack` pass by a side with time
  left still collects, as before. The opponent's following ply still
  collects normally.
- Bonus landings via `applyAttack` with the defender out of time (the
  existing planet-bonus and activity-bonus claim tests —
  `src/rules/planetBonusClaim.test.ts`, `src/rules/activityBonusClaim.test.ts`
  — show how fights onto bonus planets are set up): a classic bonus planet
  of the defender's is neither paid nor marked claimed and raises no effect;
  a points activity bonus is claimed and replaced as usual, the defender's
  energy is unchanged and the effect reports 0 points; a non-points
  activity bonus (for example Fuel) still takes effect.
- `src/hud/ScoreDisplay.test.tsx`: a side that is out of time and holds
  nodes renders crossed pips for each held node and no lit pip; under
  DOUBLE the crossed pips carry each held node's fill once.
- `src/board/announcements.test.ts`: `scoreSentence` for an out-of-time
  side holding nodes uses the new clause; REQUIRED's existing test still
  passes unchanged.

Depends on: Step 1 (the ruleset this implements).

Verification (automated): `npm test`, `npm run typecheck` and
`npm run lint` all pass, including the new tests above and every existing
energy, end-of-turn, ply, bonus, HUD and announcement test.

### Step 3 — Option tip, README, and the play-through

Status: pending

- `src/start/optionTips.ts`, `clockSetting`: add a sentence to the intro
  saying that a player who runs out of time passes every remaining turn and
  collects no more energy. Keep the capitalised choice-name convention the
  existing text uses (e.g. "UNLIMITED"). If a test asserts the tip's text,
  update it.
- `README.md`, the clock passage (around "A player who runs out passes
  every turn from then on…"): say that from then on they collect no more
  energy, so their total is frozen. Run `/update-readme` (or review the
  branch diff by hand) to confirm nothing else the README describes has
  changed.

Depends on: Step 2 (the tip and README describe behaviour that step makes
true).

Verification (manual): with `npm test`, `npm run typecheck` and
`npm run lint` passing, run the app with `npm run dev` and check:

1. On the start screen, open the clock option's question mark: the tip
   includes the new sentence.
2. Start a timed game at the shortest clock and fewest rounds (steal
   playstyle makes holding nodes easy). Play one side quickly and let the
   other side's clock run out while that side's ships hold charged nodes.
   Its score stops rising from that turn on, and each node it holds shows
   as a crossed pip with none lit. The opponent's score goes on rising as
   usual as it holds nodes.
3. Let the opponent's clock run out too: the game ends at once, and the
   result is decided on the frozen totals.
4. In a game where neither clock runs out, a player holding nodes scores
   exactly as before, and their pips light as before.
