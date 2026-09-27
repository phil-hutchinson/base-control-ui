# Implementation Plan — Story 00000105, Advanced planet bonuses

## What this story does

Today's planet bonus (rules.md §3.4) is a private errand: three planets a
side, each paying its owner once, with nothing to race for. This story adds
a fourth planet bonus setting, **ADVANCED**, offered only under the steal
playstyle. Under it there are no per-player planets: **two bonuses** always
stand on two empty planets, of two different **kinds**, and **either**
player claims one by landing a ship on it. The claimed bonus is replaced by
a new one on another empty planet, and the bonus left standing changes kind.
There are six kinds, dealt by weight: Small, Medium and Large points, Fuel,
Additional nodes (every node gains one extra prospective square) and Node
scramble (every node's ordinary prospective squares are redrawn).

To guarantee a free planet for a new bonus, the story also **retires the
six-a-side fleet under every playstyle**: fleets are now three, four or five
a side.

The player sees ADVANCED in the start screen's Planet bonus group (only
while STEAL is chosen), a reworked bonus panel showing the two current
bonus planets with a symbol for each kind, a live-region sentence per
claim, a new Quick Guide section, and `README.md` updated. A final step
rebalances the point amounts table.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions and rejected alternatives, because code in this
repository deliberately carries no design history (`CONTRIBUTING.md`,
"Comments").

## Baseline on this branch

Branch `feat/105-advanced-planet-bonuses`, clean at the start of planning
(`story.md` already committed).

- `npm test` — **81 test files, 1719 tests, all green**.
- `npm run typecheck`, `npm run lint` and `npm run format:check` — clean.
  Every step must leave them that way; if a step's own edit trips
  `format:check`, run `npx prettier --write` on the files that step touched
  (including this plan file, if an edit to it flags).

The test count may **fall** in Step 2 (tests that only exist for the
six-a-side fleet are deleted or folded into the five-a-side cases) and
rises from Step 3 on. Step 2's Notes must record the count it leaves.

## How this plan is run

The owner runs this pipeline unattended. **Every step up to Step 9 is
verified automatically**; the only manual gate is **Step 10**, where the
owner plays the finished feature, reviews the Quick Guide copy and the
panel's look, and accepts the balanced table. Anything a step would
normally have paused on for the owner's eye (panel symbols, guide copy) is
collected into Step 10's checklist instead. A step that cannot be made
green automatically is marked `blocked` with the reason in its Notes, per
the pipeline's escalation rule — never pushed through with a weakened test.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what the ruleset, the
  UI, the live region and `README.md` say (`CLAUDE.md`, Vocabulary).
- **Move** is the movement action specifically — one ship changing squares —
  never a synonym for a turn or a ply.
- **Node**, **prospective node** and **signal** are used as `CLAUDE.md`
  defines them. Under steal a node is a signal whose squares carry that
  signal (`NodeSignal`, 0–4, `src/rules/steal.ts`); the app shows a signal as
  a colour.
- **Extra prospective square** (code and planning word: *extra*) — the one
  additional prospective square an Additional nodes bonus gives a node. A
  node's other prospective squares are its **ordinary** prospective squares.
- **Bonus** (under ADVANCED) — one of the two things standing on a planet
  waiting to be claimed. Its **kind** is one of the six. The two bonuses
  occupy two **slots** in the panel (left and right).
- The six kinds' player-facing names, used in `steal.md`, the live region
  and the guide: **Small points**, **Medium points**, **Large points**,
  **Fuel**, **Additional nodes**, **Node scramble**. Code names are the
  kebab-case equivalents (`"small-points"`, `"medium-points"`,
  `"large-points"`, `"fuel"`, `"additional-nodes"`, `"node-scramble"`).
- The setting's code value is `"advanced"`; its start-screen label is
  **ADVANCED** (start-screen chrome, in `StartScreen.tsx`).
- The ruleset and the live region say **energy** and **power**. The Quick
  Guide has its own knowing exception: it says **points**, **fuel** and
  **spaceships** (`src/guide/guideCopy.ts` header). Copy follows the words of
  the surface it is on.
- `rules.md` and `steal.md` **name no default** and never say "standard
  game". Which setting the app preselects is purely an app matter.

## Settled decisions — from the story, do not reopen

A step that finds one of these inconvenient marks itself `blocked` and
escalates rather than re-deciding.

- **S1.** Planet bonus is **off, 2 points, 3 points or advanced**; advanced
  only under steal. Off, 2 points and 3 points play and look exactly as
  today under every playstyle.
- **S2.** Under advanced: exactly two bonuses, on two different planets, of
  two different kinds, each on an empty planet; any landing on a bonus
  planet claims it, so a bonus planet is always empty.
- **S3.** Kinds and weights: Small points 30, Medium points 40, Large points
  20, Fuel 16, Additional nodes 10, Node scramble 10. Weights are not
  retuned by this story.
- **S4.** Opening deal: after everything the opening board already deals,
  two different planets uniformly at random; first bonus's kind by weight
  from the available kinds; second's by weight from the kinds left over.
- **S5.** Claim order: (1) the bonus takes effect; (2) the other bonus
  stays and is redrawn by weight from available kinds excluding the kind it
  was; (3) a new bonus appears on a planet drawn uniformly from planets
  empty at that moment and not carrying the other bonus, kind by weight
  from available kinds excluding the other bonus's new kind. Availability
  is checked at each draw.
- **S6.** Landing means a move ending there, a deliberate return (§7.2), or
  placement by a fight (§7.1). Flying over does not count. In a fight the
  attacker is placed and its claim resolves in full before the defender's
  planet is drawn; the defender may land on either bonus, including a
  just-appeared one.
- **S7.** A claim is instant, outside the end-of-turn order. A bonus planet
  is otherwise an ordinary planet (protection, end-of-turn recovery). Fuel
  does not change end-of-turn recovery.
- **S8.** Point bonuses pay at once, by the table (nodes × player-matching ×
  scoring → S/M/L). Bonuses pay regardless of REQUIRED.
- **S9.** Fuel: +1 power to each of the claiming side's ships below 6,
  anywhere on the board, claiming ship included.
- **S10.** Additional nodes: one extra prospective square to every node
  lacking one, drawn one node at a time in signal order by steal.md §6's
  weighted rule; not available while every node has its extra. A node never
  has more than one extra.
- **S11.** A node with an extra: Held = 1 charged + 2 prospective; Open = 3
  prospective. Landing on any of its prospective squares claims it; all its
  other squares go (extra included), one fresh prospective square is drawn.
  Leaving works as today, and the extra survives, so the node is Open with
  three prospective squares.
- **S12.** Node scramble: clears every node's **ordinary** prospective
  squares and redraws them; charged squares, their ships and extras are
  untouched; one node at a time in signal order; an Open node with nothing
  left draws its first square uniformly from §6's widened pool and its
  second by the weighted rule; each draw sees the ones before it.
- **S13.** Every draw uses the game's seeded stream.
- **S14.** Fleets are 3, 4 or 5 a side under every playstyle; A2, A14, O2
  and O14 are no longer starting squares. Five stays the app's default.
- **S15.** Start screen: ADVANCED offered only while STEAL is chosen;
  switching away from STEAL while ADVANCED is selected resets the group to
  OFF, and it does **not** jump back to ADVANCED when STEAL is chosen again.
  Otherwise the choice survives a return to the start screen. Ships group
  offers 3, 4, 5, with 5 preselected.
- **S16.** Panel: same place (above the clocks); under ADVANCED shows the
  two bonus planets side by side in the board's own planet artwork, with a
  symbol below each: `+N` for points; the power gauge's fuel bar for Fuel;
  a node's three rings each in a different colour for Additional nodes; the
  rotator's rotation symbol in three colours for Node scramble. Colours:
  gold, red, green when player-matching is DOUBLE or REQUIRED; gold, silver,
  blue otherwise. On a claim the panel changes straight to the new pair: the
  survivor keeps its slot with its new symbol, the new planet takes the
  claimed one's slot. No animation.
- **S17.** The board does not mark bonus planets. It shows extras as
  ordinary prospective rings in their node's colour, and shows a scramble's
  new squares.
- **S18.** Live region: one sentence per claim — which side claimed which
  kind and what it gave them.
- **S19.** Quick Guide gets its own ADVANCED PLANET BONUSES section with a
  diagram of the panel showing two bonuses. `README.md` adds ADVANCED and
  drops six ships.
- **S20.** One rules-version bump on this branch: `rules.md` 0.40 → **0.41**,
  one changelog entry, its own commit ahead of the code. The balancing
  step's table edits fold into 0.41 — no second bump, no second entry. Do
  not tag.

## Design decisions — made by this plan

### D1. Game state: an ordered pair of bonuses

`GameState` gains one field, `advancedBonuses`: an ordered list holding
exactly **two** entries under advanced (slot 0 and slot 1) and **none**
otherwise. Each entry is a planet square plus a kind. Slot order is
meaningful: at the opening deal, slot 0 is the first drawn planet and slot
1 the second; on a claim, the survivor keeps its slot and the new bonus
takes the claimed bonus's slot. That is exactly what S16 asks the panel to
show, so the panel reads slots straight off the state with no component
state.

Under advanced, the existing `bonusPlanets` field (classic per-side planets)
stays empty for both sides, just as it is under off. Under off / two /
three, `advancedBonuses` is empty.

*Rejected:* reusing `bonusPlanets` — its per-side lists and `claimedOnPly`
mean something else entirely, and overloading them would make every classic
reader branch on the setting. *Rejected:* storing the pair unordered and
letting the panel sort by board order — the story explicitly wants the
survivor to stay in place and the new planet to take the other slot.

### D2. A new leaf module for the advanced bonus rules

Create `src/rules/advancedBonus.ts` holding: the kind type and the six
kinds in the table's fixed order; the weights; the point amounts table and
a lookup by `(chargedNodeCount, playerMatching, scoring, size)`;
availability (Additional nodes unavailable while every node has its extra);
the weighted kind draw; the uniform planet draw; the opening deal of the
pair; and the claim resolution (S5) as a pure function from a state, a side
and a planet to the new state, the seed left behind and a description of
what happened. The effects of Additional nodes and Node scramble on the
node map are **not** written here: they are pure functions in `steal.ts`
(Step 3), which this module calls. `ply.ts` only detects the landing and
calls in (Step 5), keeping `ply.ts` thin.

`planetBonus.ts` stays the leaf module for the setting itself (D3).

### D3. The setting value and where it is validated

`PlanetBonusSetting` gains `"advanced"`, and `PLANET_BONUS_SETTINGS` (the
guard's list) gains it last. A helper in `planetBonus.ts` returns the
settings **offered** for a given node playstyle — the classic three, plus
`"advanced"` under steal only — and the start screen renders from that
helper instead of the raw list. `startingGameState` throws a `RangeError`
for `"advanced"` paired with a non-steal playstyle, mirroring how it
already rejects player-matching outside steal: a non-steal advanced game is
a state the rules do not allow. `planetBonusPoints` (the classic payout)
has its parameter narrowed to the classic settings (the implementer picks
the type name); nothing calls it for advanced.

The start screen's reset (S15) is **state**, not resolution: when the node
playstyle changes away from steal while the remembered planet bonus is
`"advanced"`, `useAppScreen` sets it to `"off"`. This differs deliberately
from player-matching, which is remembered and resolved at PLAY
(`resolvePlayerMatching`): the story explicitly wants the group to show OFF
and not jump back. *Rejected:* a `resolvePlanetBonus` in the style of
`resolvePlayerMatching` — it would leave ADVANCED selected in hidden state
and reappear on returning to STEAL, which S15 forbids.

### D4. Seed order — opening deal

Under steal with advanced, `startingGameState` draws, **after** the steal
opening deal (steal.md §7; there are no rotators under steal and the
classic bonus deal does not run), exactly **four** seed steps in this fixed
order: slot 0's planet, slot 1's planet (each uniform, without replacement,
over `PLANETS` in its fixed order — every planet is empty at the start,
since no starting square is a planet), slot 0's kind, slot 1's kind. An
off, two or three game's seed consumption is unchanged.

### D5. Seed order — a claim

A claim consumes, in this fixed order: (1) the effect's own draws — none for
points and Fuel; one per node lacking an extra, in signal order, for
Additional nodes; for Node scramble, one per ordinary square redrawn, node
by node in signal order, each node's draws completed before the next
node's; (2) one step for the survivor's new kind; (3) one step for the new
bonus's planet; (4) one step for the new bonus's kind.

### D6. How a kind is drawn

Every kind draw is a single `drawWeightedIndex` call over **all six kinds
in their fixed table order**, with weight 0 for any kind that is excluded
or unavailable at that moment. This keeps every kind draw at exactly one
seed step and makes the index-to-kind mapping independent of which kinds
are excluded. (At most two kinds are ever excluded and at most one more is
unavailable, so at least three kinds always carry weight.)

### D7. Representing an extra prospective square

`NodeStatus` gains an optional boolean flag marking a prospective square as
its node's **extra**. Only a prospective square ever carries it, a signal
has at most one square carrying it, and no node square outside an advanced
steal game ever carries it. The board needs no new art: an extra renders
exactly as an ordinary prospective square (S17), because `BoardSquare`
draws from `state` and `signal`, not from the flag.

`NodeClaimedEffect.discardedSquare` (single, optional) becomes a list,
`discardedSquares` (empty when the node was Held and had no extra), because
claiming an Open node with an extra discards two squares and claiming a
Held node with an extra discards the extra alongside releasing the charged
square. Every reader of the old field (currently the effect itself in
`ply.ts`, and tests) is updated; the live region's claim clause does not
mention discarded squares today and need not start.

### D8. The anchor when a node has an extra (a gap the story leaves)

steal.md §6 defines a node's anchor as "its charged square when it has one,
and its remaining prospective square when it does not" — which assumes a
node has at most one other square. With extras that is no longer
unambiguous, in three places the story's rules reach:

- **Leaving a Held node with an extra** — after the charged square goes,
  the node has its ordinary prospective square *and* its extra.
- **Additional nodes on an Open node** — the node has two ordinary
  prospective squares and no charged one.
- **Node scramble's second draw on an Open node with an extra** — the node
  has its extra and the first square just drawn.

This plan settles one rule, written into steal.md's new section in Step 1:
**a node's anchor is its charged square if it is Held; otherwise its extra,
if it has one; otherwise its ordinary prospective square — and when it has
two ordinary prospective squares and no extra (only Additional nodes on an
Open node reaches this), the anchor term of the weight is the distance to
the nearer of the two.**

Why this rule: it reproduces the story's explicit scramble sentence ("a
held node, or an Open node with an extra, uses its charged square or its
extra as its anchor") for both of that node's draws; it is identical to
today's §6 for every node without an extra; and it gives each of the three
new cases one answer. *Rejected:* anchoring on the ordinary square when
leaving (it treats the extra as invisible, but then contradicts the scramble
sentence's treatment of the extra as an anchor); *rejected:* summing or
averaging distances to all of a node's squares (changes the weight's scale
for no stated reason). This is listed as a concern for the owner in the
report; if the owner overrules it at plan approval, Step 1's text and Step
3's implementation change together and nothing else does.

The **other-node term** (`S` in §6) is unchanged: every square of every
**other** node, extras included.

### D9. Leaving a node and landing on a bonus planet in one move

A planet is never a node square, so one move can at most **leave** a
charged square and **land** on a bonus planet. The leave (steal.md §4)
resolves first, then the claim — matching steal.md §5's "leaving comes
first". So a Node scramble claimed on that move sees the left node already
Open. Stated in steal.md's new section (Step 1).

### D10. Fight order, and the defender's square during the attacker's claim

`applyAttack` today draws **both** return planets before any claim. It is
reordered to: draw the attacker's planet and place it; attacker's claim
(classic or advanced) and its landing rotation; **then** draw the
defender's planet from planets still empty and place it; defender's claim
and rotation. Classic claims and rotations draw nothing from the stream, so
under every existing setting this reorder changes neither the seed stream
nor the result — the existing fight tests must stay green untouched, and
are the proof.

While the attacker's claim resolves, the defender is **still standing on
the square it was attacked on** (it has not been placed yet), so an
Additional nodes or Node scramble draw made by the attacker's claim treats
that square as occupied. This is the literal reading of S6's order; it is
stated in steal.md's new section so a recorded game replays exactly.

`assertFightInvariants` currently insists a fight leaves every node, and
both fighters' power apart from the attacker's cost, untouched. Under
advanced a claim legitimately changes powers (Fuel) and node squares
(Additional nodes, Node scramble). The check must keep guarding everything
it guards today for off / two / three, and under advanced must still guard
the placements (planets, distinct, previously empty, fleet counts). The
simplest honest way: check the fight's placements against a snapshot taken
**before** any advanced claim is applied (the implementer chooses exactly
how, e.g. passing a pre-claim state or skipping the power/node clauses when
the state carries advanced bonuses) — recorded in the step's Notes.

### D11. A new effect for an advanced claim

`ply.ts` gains an `AdvancedBonusClaimedEffect` (type
`"advanced-bonus-claimed"`), raised in the same position a
`PlanetBonusClaimedEffect` takes today (after node effects, before any
rotation — none happen under steal — and in a fight after the
`FightResolvedEffect`, attacker's claim before defender's). It carries at
least: the claiming side, the planet, the kind; the energy paid (points);
which ships gained power (Fuel); the squares added (Additional nodes); the
squares removed and added (Node scramble); the survivor's square, old kind
and new kind; the new bonus's square and kind. Enough for the live region,
for tests, and for the seeded-replay comparison. The classic
`PlanetBonusClaimedEffect` is unchanged.

### D12. The point table is mirrored and guarded

The table lives once in code (`advancedBonus.ts`) and once in steal.md's new
section. A test reads steal.md, parses that table and asserts it equals the
code's, in the style of `rulesVersion.test.ts` (which reads `rules.md`), so
the balancing step cannot update one without the other. The changelog
entry does **not** copy the numbers: it points to steal.md §10, so the
balancing step never needs to edit the changelog.

### D13. The panel

`PlanetBonusPanel` keeps rendering the classic two rows unchanged for
two / three and nothing for off. Under advanced it renders a single row of
two cells, slot 0 left and slot 1 right, each the board's planet artwork
for that square (`planetArrangement(state.openingSeed)` +
`planetForSquare`, as today) with the kind's symbol **below** it (not
overlaid). Symbols are small presentational components in `src/bonus/`,
built from what the app already draws so they match: the `+N` text in the
panel's existing badge typography; a fully lit fuel bar from the ship's
power gauge (`src/ships/powerGauge.ts` / `ShipModel.tsx`); three concentric
rings in the node marker's ring geometry (`NodeMarker.tsx`), one ring per
colour; and the rotator's three-arc mark (`RotatorMarker.tsx`), one arc per
colour. The three colours come from `src/board/squareArt.ts`: the gold,
silver and mid-blue signal cores, or — when player-matching is DOUBLE or
REQUIRED — gold plus the two player cores (`PLAYER_NODE_COLORS`). Colour
choice is a pure helper with a unit test. Whether the row carries a text
label, and exact sizes, are the implementer's call, checked by the owner in
Step 10. The panel stays `aria-hidden`, as today.

### D14. Balancing method (Step 8)

Point amounts should be in proportion to how fast nodes pay in each of the
18 combinations (3 node counts × 3 player-matching settings × 2 scorings).
Step 8 measures that by simulation, then rescales the story's table to the
measurements, keeping numbers round. Details are in Step 8. Measured
figures go in `doc/ruleset/tech-notes.md`, in a new section, following the
existing "Placing prospective nodes under steal" section's shape
(measurement described, script improvised and not committed, figures in a
table, what the app guards).

### D15. Accessibility costs recorded, not repaired

Per `CLAUDE.md`, costs are accepted and recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` under a new
"From story 105 — Advanced planet bonuses" heading (Step 6): the panel is
decorative, so which two planets carry bonuses, and of which kind, is shown
visually only (the claim sentence says what was claimed, not what now
stands); a scramble's or an Additional nodes' new squares are not listed in
the live region beyond what the sentence says. No accessibility test steps.

## Step sequence at a glance

| Step | Title                                                                 | Verification |
| ---- | --------------------------------------------------------------------- | ------------ |
| 1    | The ruleset goes to 0.41: advanced planet bonuses and five-ship limit | automated    |
| 2    | Retire the six-a-side fleet                                           | automated    |
| 3    | Extra prospective squares, Additional nodes and Node scramble in steal | automated    |
| 4    | The ADVANCED setting, the start screen and the opening deal           | automated    |
| 5    | Claiming a bonus: moves, returns and fights                           | automated    |
| 6    | The bonus panel under ADVANCED and the live-region sentence           | automated    |
| 7    | The Quick Guide's ADVANCED PLANET BONUSES section                     | automated    |
| 8    | Balancing the point table                                             | automated    |
| 9    | `README.md`                                                           | automated    |
| 10   | The owner plays it                                                    | manual       |

Every step's automated verification runs the **full** `npm test`, `npm run
typecheck`, `npm run lint` and `npm run format:check`, all green, in
addition to the step's own checks.

---

### Step 1 — The ruleset goes to 0.41: advanced planet bonuses and five-ship limit

Status: committed

Notes: Bumped `rules.md` to 0.41 and `RULES_VERSION` to match; added one
changelog entry (pointing to steal.md §10 for the point amounts, per D12,
not copying them). Added steal.md §10 "Advanced planet bonuses" covering
the setting, the six kinds and weights, the opening deal, the claim order
and availability, the leave-then-claim ordering (D9), the fight order and
the defender's occupied square during the attacker's claim (D10), the point
table verbatim with its pattern note, Fuel, Additional nodes and Node
scramble (including Held/Open/claim/leave behaviour), the anchor rule for a
node with an extra exactly as D8 settles it, the seeded-stream statement,
and "Why five is the limit". Added pointers to section 10 from steal.md §§2,
3, 4, 6 and 9. Edited rules.md §1 (fleet size, random elements), §3.1
(starting-square count and diagram — removed the S marks at A2, A14, O2 and
O14, reworded the planet-bonus sentence to stay true under advanced), §3.4
(advanced as a fourth value; existing bullets now describe 2 points/3
points specifically), §4 (three-to-five ships; removed the six-a-side
table; "each of the three layouts"), §4.1 (Fuel exception to "nothing else
changes a ship's power"), §7.1 (the "somewhere to go" argument re-derived
for at most ten ships, plus a pointer to steal.md §10 for the fight order),
and §8.6 (reworded "is paid" to "takes effect" so the sentence stays true
for advanced's non-payment kinds too). Ran `npx prettier --write` on the
three ruleset files touched, since the new steal.md table tripped
`format:check`. Verified by inspection: exactly one `## 0.41` changelog
entry with no point amounts copied into it; `grep -n -i "six\|eighteen"
doc/ruleset/rules.md` finds no remaining six-ship-fleet or
eighteen-starting-square statement (every other hit is unrelated: planet
count, node-placement constraints, rotator sections, node counts, power
cap, countdown numbers). No deviations from the plan.

Full `npm test` (81 files, 1719 tests, unchanged), `npm run typecheck`,
`npm run lint` and `npm run format:check` all pass.

Edit the ruleset; bump `rules.md` to **0.41** and `RULES_VERSION` in
`src/rules/rulesVersion.ts` to `"0.41"`; add **one**
`doc/ruleset/changelog.md` entry for 0.41, newest first, in the shape of the
0.40 entry, stating it is a gameplay change and a tag candidate with
tagging on hold. The entry summarises both changes (advanced planet
bonuses under steal; fleets now three to five, six-a-side retired) and, per
D12, **refers to steal.md §10 for the point amounts rather than copying
them**. This step is its own commit, ahead of every code change. Do not
tag. The ruleset is player-facing: plain words, "turn" not "ply", no code
names.

**`steal.md` gains section 10, "Advanced planet bonuses"**, after §9,
stating everything in story.md's "The rules" section:

- the setting value (rules.md §3.4 lists it; offered only under steal);
- two bonuses always, on two different empty planets, of two different
  kinds; landing on one claims it, so a bonus planet is always empty;
- the six kinds and weights (S3) as a table;
- the opening deal (S4), stating it comes after everything else the
  opening board deals;
- claiming (S5, S6), including: landing's three forms and that flying over
  does not count; the three-part claim order; that "available" is checked
  at each draw; the fight order (attacker placed and its claim resolved in
  full before the defender's planet is drawn from planets still empty; the
  defender may claim either bonus, including a new one); **that the
  defender still stands on the square it was attacked on while the
  attacker's claim resolves** (D10); **that a move which leaves a charged
  square and lands on a bonus planet resolves the leave (§4) first** (D9);
  that a claim is instant and not part of the end-of-turn order; that a
  bonus planet otherwise behaves as any planet, and Fuel does not change
  end-of-turn recovery;
- point bonuses and the story's point table **verbatim**, with its
  one-sentence pattern note (DOUBLE plays like one node more, REQUIRED like
  one fewer). Do **not** call the numbers provisional in the ruleset — the
  ruleset states the rule as it stands; Step 8 may change the numbers;
- Fuel (S9), Additional nodes (S10, S11 — including availability, signal
  order, "never more than one extra", and the Held/Open/claim/leave
  behaviour), Node scramble (S12);
- **the anchor rule for a node with an extra**, exactly as D8 settles it,
  and that the other-node term counts every square of every other node,
  extras included;
- that every draw uses the game's seeded stream (S13), listing them;
- "Why five is the limit": the story's argument, adapted to rules wording.

**Other `steal.md` edits, each a sentence or two, not a rewrite:**

- §2: the "exactly two squares" statement and its table gain a pointer:
  under advanced planet bonuses a node may carry one extra prospective
  square (section 10).
- §3 and §4: a pointer each to section 10 for a node with an extra (story
  "The ruleset" asks for these two).
- §6: a pointer to section 10 for the anchor of a node with an extra.
- §9's "Planet bonuses … are unaffected by either setting" paragraph: keep
  that required withholds node energy only and a bonus still pays on
  landing; add that under advanced the **point amounts** are sized by this
  setting (section 10).

**`rules.md` edits:**

- **§1**: "three to six" → "three to five"; the random-elements paragraph
  gains the advanced draws (where the two bonuses stand, their kinds, and
  the squares Additional nodes and Node scramble place — pointing to
  steal.md §10).
- **§3.1**: "eighteen starting squares" → **fourteen** (both mentions,
  prose and diagram legend); remove the `S` marks at A2, A14, O2 and O14
  from the diagram. The sentence "Under the planet bonus setting, landing
  on the right planet also pays a one-time bonus (section 3.4)" is adjusted
  so it stays true under advanced (for example "may also pay a bonus").
- **§3.4**: lists **off, 2 points, 3 points or advanced**; advanced is
  offered only under the steal playstyle and its rules are steal.md §10's;
  the existing bullets become the description of 2 points and 3 points
  ("With 2 points or 3 points:").
- **§4**: "three, four, five or six" → "three, four or five"; delete the
  six-a-side table and its Green/Red line; "In each of the four layouts" →
  "In each of the three layouts".
- **§4.1**: "Nothing else changes a ship's power" gains the exception: under
  advanced planet bonuses, claiming a Fuel bonus (steal.md §10).
- **§7.1**: the "always somewhere to go" argument reworked for at most ten
  ships (the two in the fight are not on planets, so at most eight planets
  are occupied and at least four are free); the planet-bonus sentence
  there gains a pointer to steal.md §10 for advanced's fight order.
- **§8.6**: the "Under the planet bonus setting, a bonus … takes no step in
  this order" sentence stays true for advanced; adjust wording only if it
  names the classic payment specifically.
- **§10** and any other list of pre-play choices: search both files for
  "before play", "six", "planet bonus" and "eighteen" and fix every
  statement the two changes make false. §5's "at least three ships" stays.

Depends on: nothing. Every later step implements this text.

Verification (automated): full `npm test` — `src/rules/rulesVersion.test.ts`
passes with both at 0.41 and finds the 0.41 changelog entry; test count
unchanged at 1719; typecheck, lint and format:check clean. By inspection
(the implementer, recorded in Notes): `changelog.md` has exactly one 0.41
entry and it copies no point amounts; `grep -n -i "six\|eighteen"
doc/ruleset/rules.md` finds nothing that describes a six-ship fleet or
eighteen starting squares; steal.md §10 names no default and states D8's
anchor rule, D9 and D10.

---

### Step 2 — Retire the six-a-side fleet

Status: committed

Notes: `FleetSize` is now `3 | 4 | 5`, `FLEET_SIZES` is `[5, 4, 3]`,
`MAX_SHIPS_PER_SIDE` follows as 5, and the six-a-side layout and its module
comments (eighteen starting squares, O14/O2/A14/A2) are gone from
`src/rules/fleet.ts`. Updated every test that pinned or exercised six ships:
`fleet.test.ts` (dropped the six-a-side table, shrank the starting-square
list to fourteen, updated the empty-square lists, `FLEET_SIZES`/
`MAX_SHIPS_PER_SIDE` expectations and the alternation comments);
`seededReplay.test.ts` (both harnesses now pin `fleetSize: 5`; re-measured
and updated the recorded figures — continuous: 3 fights/6 planet returns/19
charges/17 retirements/19 refills, was 11/22/22/19/19 at six a side; steal:
53 claims/31 steals/18 abandons/5 fights, was 40/22/15/8 — all comfortably
above the existing floors, so no floor was lowered); `fullGame.test.ts`
(removed the six-a-side and six-ship-relocation cases, reworded the
surviving five-ship "empty starting squares" case to say "ordinary squares"
rather than "ordinary starting squares", removed the six-ship tightest-
arithmetic fight case now that ten ships is the most the rules allow, and
reworded the surviving five-ship case's comment to state it directly as the
tightest §7.1 ever gets); `gameState.test.ts` (the fleet-size-dealing test
now compares five and four, not five and six); `App.test.tsx` and
`useAppScreen.test.tsx` (dropped the "6 ships" PLAY case and the ON+6-ships
attack-target case, for which no five-a-side equivalent exists — the
five-a-side layout starts no two opposing ships in range, confirmed by
inspection — noting the underlying attack-target behaviour stays covered by
`Board.test.tsx` and `squareLabel.test.ts`; retargeted the remaining
`setFleetSize(6)` calls at 4); `StartScreen.test.tsx` (retargeted the
`fleetSize: 6` fixtures at 4, and added a dedicated assertion that the Ships
group offers exactly 5, 4, 3 with 5 preselected); `stealPlacement.test.ts`
(the two "largest fleet" worst-case scenarios now use `fleetSize: 5`);
`planets.test.ts` (its starting-square check now iterates `FLEET_SIZES`
instead of hardcoding `startingFleet(6)`, which no longer typechecks). Also
reworded `doc/ruleset/tech-notes.md`'s "largest fleet, six ships a side"
sentence to say the measurement was made before six a side was retired and
that five is now an easier case, without re-measuring. `announcements.test.ts`
was left untouched — its use of A2 doesn't assume a starting ship there.
`session.test.ts` needed no change: it iterates `FLEET_SIZES` directly. No
deviations from the plan.

Full `npm test` — **81 test files, 1701 tests, all green** (down from 1719,
as the plan anticipated for the removed six-a-side cases); `npm run
typecheck`, `npm run lint` and `npm run format:check` all pass (prettier
reformatted `StartScreen.test.tsx` after the new assertion was added).
`grep -rn "fleetSize: 6\|SIX_A_SIDE" src` finds nothing.

In `src/rules/fleet.ts`: `FleetSize` becomes `3 | 4 | 5`; `FLEET_SIZES`
becomes `[5, 4, 3]` (still largest first, which is the start screen's
render order); delete the six-a-side layout; update the module header and
the layout comments that speak of "eighteen starting squares" (fourteen now)
and "O14, O2, A14 and A2 left empty" (they are no longer starting squares at
all). `MAX_SHIPS_PER_SIDE` follows automatically (5). The Ships group needs
no code change: it renders `FLEET_SIZES`, and five stays preselected via
`DEFAULT_FLEET_SIZE`.

Then update every test that relied on six ships. Known places (search for
`fleetSize: 6`, `FleetSize`, `SIX_A_SIDE`, `O14`, `A14`, `O2`, `A2`, "six a
side", "six-a-side", "6 ships", "eighteen", "twelve ships"):

- `src/rules/fleet.test.ts` — drop the six-a-side layout table and its
  cases; the "all starting squares" list shrinks to fourteen; the per-size
  empty-square lists lose A2/A14/O2/O14; `FLEET_SIZES` and
  `MAX_SHIPS_PER_SIDE` expectations become `[5, 4, 3]` and `5`; the
  neighbour/wraparound tests that were about the six-a-side layout are
  removed or re-pointed at five.
- `src/rules/seededReplay.test.ts` — both seeded harnesses pin `fleetSize:
  6`; change to **5** and update the comments that say the figures were
  measured at six a side. Its assertions are floors and self-comparisons:
  re-run, update the "this seed measures …" comments to the new run's
  figures, and keep the floors (lower one only if the new measurement is
  genuinely below it, and say so in Notes). If a "different seed diverges"
  pair now coincides, pick another pair, as the test's comment instructs.
- `src/rules/fullGame.test.ts` — the "plays a six-a-side game" case and the
  six-ship relocation case around line 860 move to five ships or are
  removed where five is already covered; the five-ship case about O14/O2/
  A14/A2 being empty starting squares is rewritten: those squares are now
  ordinary squares, not starting squares, so the test either goes or
  asserts they hold no ship; the "always somewhere to go" comment near line
  947 is re-derived for ten ships.
- `src/rules/gameState.test.ts` (around line 216), `src/App.test.tsx`
  (around lines 357 and 446 — the "choosing 6 ships" tests move to 5 or
  are removed where 5 is the default and already covered; the red-O2
  target test needs a five-a-side equivalent or goes), and
  `src/useAppScreen.test.tsx` (around line 57).
- `src/start/StartScreen.test.tsx` and `src/game/session.test.ts` — any
  expectation of a 6 option; add or update a start-screen assertion that
  the Ships group offers exactly 5, 4 and 3 with 5 checked.
- `src/board/announcements.test.ts` line ~815 uses A2 as an arbitrary
  square — leave it unless it assumed a starting ship there.

Also update `stealPlacement.test.ts` if it iterates `FLEET_SIZES` with a
six-specific expectation, and `doc/ruleset/tech-notes.md` sentences that
describe "the largest fleet, six ships a side" as a measured worst case:
rewrite them to say the measurement was made when six a side existed and
the largest fleet is now five (do not re-measure; the figure only gets
easier). No other production code references six ships (checked while
planning: `MAX_SHIPS_PER_SIDE` has no non-test reader).

Depends on: Step 1 (rules.md §4 is what this implements).

Verification (automated): full `npm test`, typecheck, lint and
format:check all green. `grep -rn "fleetSize: 6\|SIX_A_SIDE" src` finds
nothing. `StartScreen.test.tsx` asserts the Ships group offers exactly 5, 4,
3 with 5 preselected. Notes record the new test count and the seeded-replay
figures re-measured at five a side.

---

### Step 3 — Extra prospective squares, Additional nodes and Node scramble in steal

Status: committed

Notes: `NodeStatus` gained the optional `extra?: boolean` flag (`gameState.ts`).
`nodeAnchor` (`steal.ts`) now returns `readonly Square[]` per D8: `[charged]`
if Held, else `[extra]` if the node has one, else its remaining ordinary
prospective square(s) (one normally, two for the Additional-nodes-on-an-Open-
node case) — it no longer throws on two unheld squares, only on zero.
`stealProspectiveWeight`, `drawStealProspectiveSquare` and
`drawStealOpeningProspectiveSquare` (`nodePlacement.ts`) take `anchors:
readonly Square[]` and weight by the *minimum* distance to any anchor,
identical to before for a single anchor; every existing call site was updated
to pass an array. `claimNode`'s `ClaimNodeResult.discardedSquares` replaces
the old single optional `discardedSquare` (`ply.ts`'s
`NodeClaimedEffect.discardedSquares` follows, now a required — possibly
empty — list): it discards every one of the node's other squares (extra
included) besides the claimed and released ones. `abandonNode` anchors its
second draw on the node's extra when it has one (via the new `nodeAnchor`),
so the extra survives leaving and the node ends Open with three prospective
squares. Two new pure functions in `steal.ts`: `addExtraProspectiveSquares`
(Additional nodes — one square per signal lacking an extra, skipping
signals that already have one, one seed step each) and
`scrambleProspectiveSquares` (Node scramble — clears every ordinary
prospective square, keeping charged squares and extras in place, then
redraws one-at-a-time in signal order: 1 draw anchored on the charged square
or the extra, or 2 draws — first uniform over the widened pool, second
weighted — for an Open node left with nothing). A small helper
`everyNodeHasExtra` answers Step 4's availability check. `ply.ts`'s
`applyMove` construction of `node-claimed` now always sets
`discardedSquares` (no conditional spread).

Updated every reader of the renamed/changed fields:
`src/rules/steal.test.ts` (rewrote the `nodeAnchor` describe block for the
array return and the new two-anchor and extra-anchor cases; renamed
`discardedSquare` assertions to `discardedSquares`; added new cases for
claiming and leaving a node with an extra, `everyNodeHasExtra`,
`addExtraProspectiveSquares` and `scrambleProspectiveSquares`, including
determinism, one-seed-step-per-square and "no more than one extra per node"
checks); `src/rules/nodePlacement.test.ts` (every bare `anchor,` call
argument to `drawStealProspectiveSquare`/`drawStealOpeningProspectiveSquare`
wrapped as `[anchor],`, mechanically, no behaviour change since a
single-element array weights identically to before); `src/rules/ply.test.ts`
and `src/board/announcements.test.ts` and `src/board/boardAnimations.test.ts`
(literal `node-claimed` effect fixtures updated to the new field name and
shape, adding `discardedSquares: []` where nothing was discarded, since the
field is no longer optional); `src/rules/fullGame.test.ts`'s
`assertStealNodeInvariants` relaxed per the plan (two squares, or three with
exactly one extra; at most one charged; at most one extra; an extra is
always prospective) — nothing in play yet produces an extra, so it still
sees two squares everywhere, unchanged behaviour.

No deviations from the plan.

Full `npm test` — **81 test files, 1721 tests, all green** (up from 1701,
the 20 new cases the plan's test list asked for); `npm run typecheck`, `npm
run lint` and `npm run format:check` all pass (prettier reformatted
`steal.test.ts` after the new cases were added).

Teach steal's node model (`src/rules/steal.ts`, `src/rules/gameState.ts`,
`src/rules/nodePlacement.ts`, `src/rules/ply.ts` for the effect's field) about
extra prospective squares, and add the two node-changing bonus effects as
pure, seed-threaded functions. Nothing in play reaches them yet; Step 5
wires them in.

- **Representation (D7):** `NodeStatus` gains the optional extra flag;
  update `NodeStatus`'s and `StealNodeStatus`'s doc comments.
- **Anchor (D8):** replace `nodeAnchor`'s "exactly one square" assumption
  with D8's rule. The weighted draw (`drawStealProspectiveSquare` and its
  weight in `nodePlacement.ts`) must accept the two-ordinary-squares case,
  where the anchor term is the distance to the nearer of two squares —
  extend it to take one or more anchor squares with the anchor term being
  the minimum distance, which is identical to today for one anchor.
- **Claim (S11):** `claimNode` discards **every** other square of the
  node — the old charged square if Held (still reported as
  `releasedSquare`), every other prospective square including an extra —
  and draws one fresh ordinary prospective square anchored on the claimed
  square. `ClaimNodeResult` and `NodeClaimedEffect` switch from a single
  `discardedSquare` to a `discardedSquares` list (D7); update `ply.ts`'s
  construction of the effect and every test that reads the old field.
- **Leave (S11):** `abandonNode` keeps the extra, removes the vacated
  square, and draws the usual second ordinary square anchored per D8 (on
  the extra when the node has one). The node ends Open with three
  prospective squares when it had an extra.
- **Additional nodes (S10):** a new pure function taking the node map, the
  game's node count, the ship squares and a seed; for each signal in order
  0…N−1 that has no extra, draws one square by §6's weighted rule over the
  widened pool (the same pool and fallback claims and leaves already use),
  anchored per D8, weighted against every other node's current squares
  (including extras just placed for earlier signals), and marks it as that
  node's extra. Returns the new map, the squares added in order, and the
  seed. One seed step per square added.
- **Node scramble (S12):** a new pure function with the same inputs; first
  removes every ordinary prospective square of every node (charged squares
  and extras stay), then for each signal in order 0…N−1 draws the node's
  replacements: one for a Held node (anchor: its charged square); two for
  an Open node with an extra (anchor: the extra, both draws); two for an
  Open node with nothing left (first uniformly from the widened pool — the
  same pool, including its fallback, via `legalNodePool` and `drawIndex`;
  second by the weighted rule anchored on the first). Each draw sees every
  square already placed. Returns the new map, the squares removed, the
  squares added in order, and the seed. One seed step per square added.
- Export a small helper answering "does every node already have its extra"
  for Step 4's availability check.
- The module header's seed-step paragraph gains the two new functions'
  step counts.

Tests (new cases in `src/rules/steal.test.ts` and, for the draws,
`src/rules/stealPlacement.test.ts`; hand-built node maps with a fixed seed):

- claiming each prospective square of an Open node with an extra leaves
  the node Held with exactly two squares and no extra; claiming a Held
  node with an extra releases the charged square and discards the extra;
  relocating onto one's own extra is a claim;
- leaving a Held node with an extra leaves it Open with three prospective
  squares, the extra still flagged, and the new square's draw anchored on
  the extra (assert via a weight or a constructed board where the two
  anchors give different outcomes, or by checking the anchor helper
  directly);
- Additional nodes adds exactly one extra to each node lacking one, none to
  a node that has one, in signal order, never adjacent to another node
  square (ordinary pool) and never on a ship or planet, and consumes one
  seed step per square added;
- Node scramble leaves charged squares and extras exactly where they were,
  gives each node back its correct count of ordinary squares (Held: 1;
  Open: 2), consumes one seed step per square added, and is deterministic
  for a seed;
- a node never carries more than one extra; the same seed and map give
  the same result.
- `fullGame.test.ts`'s `assertStealNodeInvariants` is relaxed to: each
  signal has two squares, or three when exactly one of them is an extra; at
  most one charged; at most one extra; an extra is always prospective.
  (Nothing produces extras in play yet, so it still sees two everywhere.)

Depends on: Step 2 only in the sense that the suite must be green on five
ships; no code dependency. Step 5 depends on this step.

Verification (automated): full `npm test` green including the new cases;
every existing steal test (claims, leaves, seeded steal replay) passes
unchanged apart from the `discardedSquare` → `discardedSquares` rename —
proving nodes without an extra behave exactly as before; typecheck, lint,
format:check clean.

---

### Step 4 — The ADVANCED setting, the start screen and the opening deal

Status: committed

Notes: `planetBonus.ts` gained `"advanced"` on `PlanetBonusSetting`, a
`ClassicPlanetBonusSetting` narrowing type for `planetBonusPoints` (D3), and
`offeredPlanetBonusSettings(nodePlaystyle)` — the classic three everywhere,
plus advanced last under steal — which `StartScreen.tsx`'s Planet bonus group
now renders from instead of the raw settings list. New leaf module
`src/rules/advancedBonus.ts` (D2) holds `AdvancedBonusKind`/
`ADVANCED_BONUS_KINDS` in table order, the six weights, `isAdvancedBonusKindAvailable`
(Additional nodes unavailable exactly when Step 3's `everyNodeHasExtra` is
true), `drawAdvancedBonusKind` (D6: one `drawWeightedIndex` call over all six
kinds, weight 0 for excluded/unavailable), `drawAdvancedBonusPlanet` (uniform),
the point table mirrored verbatim from steal.md §10 with `advancedBonusPoints`
as its lookup, and `dealAdvancedBonuses` (D4: slot 0 planet, slot 1 planet,
slot 0 kind, slot 1 kind — four seed steps). `gameState.ts` gained the
`advancedBonuses` field (D1, empty except under advanced, where it always
holds exactly two entries), a `RangeError` for `"advanced"` paired with a
non-steal playstyle (mirroring the existing `playerMatching` guard), and
`startingGameState` now runs `dealAdvancedBonuses` last, after the (skipped,
for advanced) classic bonus deal, leaving `bonusPlanets` empty for both sides
under advanced. `useAppScreen.ts`'s `setNodePlaystyle` now wraps the raw state
setter: leaving steal while the remembered planet bonus is `"advanced"` resets
it to `"off"` (S15) — deliberately not the `resolvePlayerMatching` pattern,
since the story wants OFF to show and stay showing rather than jumping back.
`PlanetBonusPanel.tsx` and `ply.ts`'s `claimPlanetBonus` both gained a
temporary `"advanced"` branch that behaves exactly as `"off"` (render
nothing; claim nothing, since `bonusPlanets` is empty anyway) — Step 5 and
Step 6 replace these.

Every test fixture across the suite that builds a `GameState` object literal
needed `advancedBonuses: []` added alongside its existing `bonusPlanets: {
green: [], red: [] }` (a required field addition); this was mechanical and
touched no assertions. New tests: `planetBonus.test.ts` (the fourth setting,
`offeredPlanetBonusSettings` by playstyle); `advancedBonus.test.ts` (kind
order, availability, the weighted draw's exclusions/frequency/one-seed-step,
the planet draw, point-table spot checks, the D12 steal.md mirror test
parsing section 10's table with `node:fs`, and the opening deal's
distinctness/seed-count/determinism); `gameState.test.ts` (the non-steal
`RangeError`, the two-bonus/two-planet/two-kind/empty-planets/empty-
`bonusPlanets` shape, the four-extra-seed-steps-with-identical-nodes-and-ships
check, and off/two/three leaving `advancedBonuses` empty); `useAppScreen.test.tsx`
and `App.test.tsx` (ADVANCED offered only under steal, the reset-to-OFF on
leaving steal and non-reappearance on returning, survival across a
return-to-start, and a classic setting being left untouched by the same
switch); `session.test.ts` (a `new-game` intent with steal + advanced deals a
state with two `advancedBonuses` and empty `bonusPlanets`). No deviations
from the plan.

Full `npm test` — **82 test files, 1753 tests, all green** (up from 1721,
Step 3's count); `npm run typecheck`, `npm run lint` and `npm run
format:check` all pass (prettier reformatted the four files the new tests and
`advancedBonus.ts` were added to/in).

**Rules layer.**

- `src/rules/planetBonus.ts` (D3): `"advanced"` added to the type and the
  guard's list; the offered-settings helper by node playstyle; the classic
  payout's parameter narrowed to the classic settings. Update the module's
  and type's doc comments.
- `src/rules/advancedBonus.ts` (D2): the kind type and six kinds in table
  order; weights (S3); the point amounts table (story's numbers verbatim)
  and its lookup; availability (Additional nodes unavailable while every
  node has its extra, via Step 3's helper); the weighted kind draw (D6);
  the uniform planet draw over a given set of eligible planets in `PLANETS`
  order; and the opening deal of the pair (D4). Module header documents the
  seed-step order (D4, D5) in the style of `steal.ts`'s header.
- `src/rules/gameState.ts`: the `advancedBonuses` field (D1) with a doc
  comment in the style of its neighbours; `startingGameState` validates
  advanced is steal-only (D3, `RangeError` naming the combination) and,
  under advanced, runs the opening deal last (D4); the long seed-count doc
  comment gains the four steps. `bonusPlanets` stays empty under advanced.
- `src/game/session.ts` needs no new intent field (planet bonus already
  flows through `new-game`); confirm its types accept `"advanced"`.

**Start screen (S15).**

- `StartScreen.tsx`: label `ADVANCED`; the Planet bonus group renders the
  offered-settings helper's list for the current node playstyle. Update the
  module header ("eight of them, nine under steal" wording) if it counts
  options.
- `useAppScreen.ts`: when the node playstyle changes away from steal while
  the planet bonus is `"advanced"`, set it to `"off"` (D3). Update the hook's
  doc comment.

**Panel guard.** `PlanetBonusPanel` must not break on an advanced state
before Step 6 builds the real panel: render nothing when the setting is
advanced (a temporary branch Step 6 replaces). The classic claim path in
`ply.ts` (`claimPlanetBonus`) must return unchanged for advanced — it
already keys on `state.bonusPlanets`, which is empty; just make sure it no
longer calls the narrowed classic payout with `"advanced"` (typecheck will
say).

Tests:

- `planetBonus` tests: the offered list is off/two/three under continuous,
  planet and dedicated, and off/two/three/advanced under steal; the guard
  accepts advanced.
- `advancedBonus` tests (new `src/rules/advancedBonus.test.ts`): the
  weights and order; availability; a kind draw never returns an excluded
  or unavailable kind (over many seeds) and consumes exactly one seed step;
  over a large seeded sample the kind frequencies are within a generous
  band of the weights; the point lookup returns the story's numbers for a
  few spot cells; **the steal.md mirror test (D12)** — read
  `doc/ruleset/steal.md` with `node:fs` (as `rulesVersion.test.ts` does
  for rules.md), parse the section-10 point table and assert it equals the
  code table for all 18 cells.
- `gameState` tests: advanced with a non-steal playstyle throws; under
  steal + advanced the state has exactly two bonuses on two distinct
  planets, of two distinct kinds, both empty, `bonusPlanets` empty; the
  deal consumes exactly four seed steps more than the same seed without
  advanced, and the nodes and ships are identical to that game's (the
  bonus deal runs last); under off/two/three `advancedBonuses` is empty and
  the seed consumption is unchanged.
- `StartScreen.test.tsx` / `useAppScreen.test.tsx` / `App.test.tsx`:
  ADVANCED shown only while STEAL is chosen; choosing ADVANCED then
  switching to another playstyle shows OFF checked; switching back to STEAL
  still shows OFF; ADVANCED under STEAL survives a return to the start
  screen; PLAY with STEAL + ADVANCED starts a game whose state carries
  `planetBonus: "advanced"`.

Depends on: Step 3 (availability reads the extra flag and its helper).

Verification (automated): full `npm test` green with the tests above
(including the steal.md mirror test passing against Step 1's table);
typecheck, lint, format:check clean.

---

### Step 5 — Claiming a bonus: moves, returns and fights

Status: committed

Notes: `advancedBonus.ts` gained `resolveAdvancedBonusClaim` (D2, D5): given a
state slice, a side and the landed planet, it applies the claimed kind's own
effect (points report `pointsAwarded` for the caller to add; Fuel raises each
of the claiming side's ships below `power.ts`'s maximum by one via
`gainPower`; Additional nodes / Node scramble call Step 3's
`addExtraProspectiveSquares` / `scrambleProspectiveSquares` with the ship
squares as they stand), then redraws the survivor's kind (excluding its old
kind), draws the new bonus's planet (from planets empty now and not the
survivor's — throwing a `RangeError`, a bug detector, if none exists), and
its kind (excluding the survivor's new kind), returning the new slot pair
(D1: survivor keeps its slot, new bonus takes the claimed one) and an
`AdvancedBonusClaimOutcome` describing what happened. `ply.ts` gained
`AdvancedBonusClaimedEffect` (D11) and a `claimAdvancedBonus` helper
mirroring `claimPlanetBonus`, wired into `applyMove` at the same point the
classic claim is (both are called unconditionally; each no-ops under the
other's setting, so exactly one ever fires). `applyAttack` is reordered
exactly per D10: attacker placed → attacker's claim (classic or advanced) →
attacker's rotation → defender's planet drawn (from planets empty at that
point) and placed → defender's claim → defender's rotation;
`assertFightInvariants` gates its power-equality and whole node-equality
checks behind `before.planetBonus !== "advanced"` (D10), since a claim can
legitimately change either under advanced, while every placement check
(planet, distinct, previously empty, fleet counts) still runs unconditionally.
The full pre-existing suite (fights, classic claims) passed unchanged after
the reorder, confirming it does not alter the seed stream or result for
off/two/three, exactly as D10 predicted.

New tests: `advancedBonus.test.ts` gained a `resolveAdvancedBonusClaim`
describe block (26 tests total in the file) covering each kind's own effect,
the survivor's and new bonus's exclusions over many seeds, slot assignment
both ways, the eligible-planet exclusions, the not-carrying-a-bonus throw and
determinism. New `src/rules/advancedBonusClaim.test.ts` (15 tests) covers the
`ply.ts` integration: a points claim's immediate payment (including under
REQUIRED withholding node energy only), Fuel's effect on a non-landing
fleet-mate (isolated from end-of-turn recovery) and on a full ship and the
opponent, Additional nodes and Node scramble through a move, the two-bonuses/
distinct-kinds/both-empty invariant, slot preservation both ways, flying over
a bonus planet claiming nothing, D9 (leaving a charged node and landing on a
Node scramble planet scrambles the already-Open node, discarding even the
leave's own fresh square), and, for fights: the attacker's claim before the
defender's, a seed-order test proving the defender's return planet is drawn
only after the attacker's claim's own draws have run (by comparing against
what a naive, un-reordered computation would have produced, over 40 seeds),
the defender claiming whichever of the survivor or the newly-appeared bonus
it lands on, and `assertFightInvariants`'s advanced exemptions plus its
continued placement checks.

Deviations from the plan: the fight test asking for a board where "the
defender can land only on the just-appeared bonus" is written instead as a
board where the defender's only two possible landings are the survivor's
bonus and the newly-appeared one, asserting whichever one it lands on is
correctly claimed — forcing literal exclusivity to the new bonus alone is
structurally impossible (the survivor's own bonus planet is, by the rule's
own invariant, always ship-free too, so it is always a legal alternative
landing for the defender); this still exercises S6's "including the one that
has only just appeared" sentence, without asserting something the rules
cannot guarantee. `resolveAdvancedBonusClaim`'s own behaviour (kind effects,
exclusions, slot logic) is unit-tested directly in `advancedBonus.test.ts`
rather than only through `ply.ts`, so the `ply.ts`-level tests in
`advancedBonusClaim.test.ts` could stay focused on wiring, ordering and the
fight reorder rather than re-deriving claim-resolution behaviour already
covered at the leaf level. `src/board/EnergyOverlay.tsx`'s
`endOfPlySettlements` helper needed `AdvancedBonusClaimedEffect` added to its
explicit effect-type union (mechanical — `MoveEffect`/`AttackEffect` widened
by this step's new member, and that function's parameter type is spelled out
rather than reusing the union types directly).

Full `npm test` — **83 test files, 1778 tests, all green** (up from 1753);
`npm run typecheck`, `npm run lint` and `npm run format:check` all pass
(prettier reformatted the two new/edited test files).

Wire claims into play.

- `advancedBonus.ts`: the claim resolution (S5, D5) as a pure function over
  a `GameState`: given the claiming side and the planet landed on (which
  must be one of the two bonus planets), apply the effect — points add the
  table amount to the side's energy; Fuel raises each of that side's ships
  below the maximum by one (use `power.ts`'s maximum, never a literal 6);
  Additional nodes and Node scramble call Step 3's functions with the ship
  squares as they stand at that moment — then redraw the survivor's kind
  (excluding its old kind, availability rechecked), then draw the new
  bonus's planet from planets that are empty now and are not the
  survivor's, then its kind (excluding the survivor's new kind). The new
  bonus takes the claimed slot (D1). If no eligible planet exists, throw a
  `RangeError` — the five-ship limit guarantees one, so this is a bug
  detector, not a case to handle.
- `ply.ts`, `applyMove`: after the steal node events (leave first, then any
  node claim — a planet is never a node square, D9), if the state is
  advanced and the destination is a bonus planet, resolve the claim and
  push an `AdvancedBonusClaimedEffect` (D11) where
  `PlanetBonusClaimedEffect` goes today. The classic path is untouched.
- `ply.ts`, `applyAttack` (D10): reorder to attacker-placed → attacker's
  claim (classic or advanced) and rotation → defender's planet drawn and
  placed → defender's claim and rotation. Adjust `assertFightInvariants` per
  D10 and update its doc comment and `applyAttack`'s. Effects keep today's
  order: `fight-resolved`, then attacker's claim, then defender's.
- Update the module header of `ply.ts` for the new claim and the new fight
  order.

Tests:

- New `src/rules/advancedBonusClaim.test.ts` (hand-built steal states, in
  the style of `planetBonusClaim.test.ts`):
  - landing on each points kind raises the side's energy by the table
    amount for that game's nodes/matching/scoring, immediately (before the
    ply's end-of-turn collection), including under REQUIRED with the
    side not holding its own node;
  - Fuel raises every not-full ship of the claimer by one, leaves full
    ships at the maximum, and does not touch the opponent's ships; the
    claiming ship's end-of-turn recovery on the planet still happens as
    usual afterwards;
  - Additional nodes gives every node an extra; landing on any square of
    such a node leaves it with two squares; leaving a Held node with an
    extra leaves it Open with three; a state where every node has its
    extra never deals Additional nodes (survivor redraw and new bonus);
  - Node scramble redraws every ordinary prospective square and leaves
    charged squares and extras;
  - after any claim: exactly two bonuses, distinct planets, distinct
    kinds, both planets empty; the survivor's kind differs from its old
    kind; the survivor keeps its slot and the new bonus takes the claimed
    slot; the move-then-claim seed order is D5's;
  - flying over a bonus planet claims nothing; a deliberate return (a
    move onto a bonus planet) claims;
  - a move that leaves a charged node and lands on a Node scramble planet
    scrambles the already-Open node (D9);
  - with combat on: a fight whose attacker is placed on a bonus planet
    claims for the attacker, and the defender's planet is drawn after the
    new bonus appears — construct a board where the defender can land only
    on the just-appeared bonus (all other planets occupied) and assert it
    claims it for the defender's side; the attacker's Additional/Scramble
    draws treat the defender's pre-fight square as occupied (D10).
- `planetBonusClaim.test.ts`, `combat.test.ts`, `ply.test.ts`: every
  existing classic and fight test passes **unchanged** (the reorder is
  invisible to classic settings); add one case asserting a classic two/
  three fight produces the same result and seed as before, if not already
  covered.
- `fullGame.test.ts`: run whole steal + advanced games at 3, 4 and 5 nodes,
  each player-matching setting, both scorings, combat on and off, with a
  policy that sometimes lands on bonus planets (e.g. the existing greedy
  policy plus "prefer a legal move onto a bonus planet"), asserting after
  every ply: two bonuses, distinct planets and kinds, both empty; while an
  Additional nodes bonus stands, at least one node lacks its extra; Step
  3's relaxed node invariants; energy never falls.
- `seededReplay.test.ts`: a seeded steal + advanced game (five ships,
  combat on) whose policy also takes bonus planets; record every
  `advanced-bonus-claimed` effect alongside the node events; assert the run
  is not vacuous (a floor on claims, and at least three distinct kinds
  claimed — measure and set floors with margin), that the same seed
  replays identically (events and final state), and that a different seed
  diverges. Add a paragraph to the file's header in the style of its
  0.36/0.38/0.39 paragraphs describing what advanced draws.

Depends on: Steps 3 and 4.

Verification (automated): full `npm test` green with the tests above;
typecheck, lint, format:check clean.

---

### Step 6 — The bonus panel under ADVANCED and the live-region sentence

Status: committed

Notes: Replaced Step 4's temporary render-nothing branch in
`PlanetBonusPanel.tsx` with the advanced layout: a single row of two cells,
slot 0 left and slot 1 right, read straight off `state.advancedBonuses`, each
an `AdvancedBonusCell` (new) stacking the planet's board artwork
(`planetForSquare`, as the classic rows already use) above the kind's symbol.
`AdvancedBonusSymbol` (new) dispatches by kind to four new presentational
components: `PointsSymbol` (a `+N` badge, sized from the point lookup for the
game's own node count/matching/scoring), `FuelSymbol` (the ship gauge's own
geometry and slot count, fully lit, in a neutral gold since the bonus belongs
to neither side), `AdditionalNodesSymbol` and `NodeScrambleSymbol` (three
rings / three rotator arcs, each in one of three colours from the new
`advancedBonusColors.ts` helper — gold/silver/blue, or gold/red/green under
DOUBLE or REQUIRED per S16). Since a component file may only export
components (`react-refresh/only-export-components`), the ring and arc
geometry `NodeMarker.tsx` and `RotatorMarker.tsx` already had was pulled out
into two new sibling modules, `nodeMarkerGeometry.ts` and
`rotatorMarkerGeometry.ts`, which both markers and the two new symbols now
import — a mechanical extraction with no behaviour change, confirmed by the
untouched `NodeMarker.test.tsx` suite staying green. Confirmed by reading
(and a new test) that the board's per-square rendering already copes with a
signal spanning three prospective squares with no change needed: `Board.tsx`
and `BoardSquare.tsx` draw each square from its own `NodeStatus` independent
of how many other squares share its signal, so a three-square signal was
already handled before this step. Added `advancedBonusClaimedClause(s)` to
`announcements.ts`, wired into `moveSentence` and `fightSentence` at the same
position the classic claim clause sits, with a kind-labelled sentence per
steal.md §10's six kinds (an "a"/"an" label table per kind, since "an
Additional nodes bonus" needs the vowel article). Added the story 105
accessibility-ledger entry (D15) to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, at the end of
the file per its append order, covering the panel being decorative and the
Additional-nodes/Node-scramble sentences not naming which squares changed.
No deviations from the plan.

Full `npm test` — **84 test files, 1793 tests, all green** (up from 1778,
Step 5's count: 3 new colour-helper tests, 5 new `PlanetBonusPanel` tests, 6
new `announcements.ts` tests, 1 new `Board.tsx` test); `npm run typecheck`,
`npm run lint` and `npm run format:check` all pass (prettier reformatted
`announcements.ts`, `AdvancedBonusSymbol.tsx` and both `PlanetBonusPanel`
files after they were edited/added).

**Panel (S16, D13).** In `src/bonus/`: replace Step 4's temporary
render-nothing branch with the advanced layout — two cells side by side,
slot 0 left, slot 1 right, each the planet's board artwork with the kind's
symbol beneath. Add the four symbol components and a pure colour helper
(three colours from player-matching). Keep them small and reusable: Step 7's
guide diagram draws the same cells. The `+N` amount comes from the point
lookup for the game's settings. Classic rendering (two/three) and off are
untouched. Update the panel's module header.

**Board.** No new board art (S17): extras and a scramble's new squares are
ordinary prospective squares in `state.nodes`. Confirm `Board.tsx`,
`BoardSquare.tsx` and `boardAnimations.ts` cope with a signal having three
squares and with many prospective squares changing in one ply (no throw, no
stale animation keyed on a single discarded square); fix anything that
assumed two squares per signal.

**Live region (S18).** In `src/board/announcements.ts`, one sentence per
`advanced-bonus-claimed` effect, placed where the classic claim clause goes
today for moves and fights, naming the side, the kind and what it gave:
e.g. points — "Green claimed a Large points bonus at the F14 planet: 8
energy."; Fuel — "… a Fuel bonus …: one power to 3 ships." (or "to no
ships" when all were full); Additional nodes — "… every node gained an
extra waiting square."; Node scramble — "… every node's waiting squares
were redrawn." Exact wording is the implementer's (announcements are not
manually tested; the suite covers them), in plain player words, "energy"
and "power" as elsewhere in the live region.

**Accessibility ledger (D15).** Add the "From story 105 — Advanced planet
bonuses" entry to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

Tests:

- `PlanetBonusPanel.test.tsx`: under advanced, exactly two cells in slot
  order showing the planets' art for those squares; each kind renders its
  symbol (`+N` text equals the table amount for the game's settings); after
  a claim (state with a changed pair) the survivor stays in its slot and
  the new planet takes the other; off renders nothing; two/three render
  exactly as before (existing tests unchanged).
- Colour helper unit test: gold/silver/blue with matching off; gold/red/
  green (the player cores) with DOUBLE and REQUIRED.
- `announcements.test.ts`: one sentence per kind, for a move and for a
  fight with both sides claiming (attacker's sentence first).
- `Board.test.tsx` (or `BoardSquare.test.tsx`): a signal with three
  prospective squares renders three rings in the node's colour.

Depends on: Step 5 (the effect and states with claims).

Verification (automated): full `npm test` green with the tests above;
typecheck, lint, format:check clean. The panel's look is checked by the
owner in Step 10, not here.

---

### Step 7 — The Quick Guide's ADVANCED PLANET BONUSES section

Status: committed

Notes: Added `"advancedPlanetBonus"` to `GuideSectionId` and a `GUIDE_SECTIONS`
entry in `src/guide/guideCopy.ts`, immediately after `planetBonus`, with a
drafted paragraph (guide vocabulary — points, fuel, spaceships) covering: only
under Steal; two bonuses always on two planets shown above the clocks; either
player claims one by landing there; the survivor changes kind and a new bonus
appears; the four effects in one sentence each. The module header notes the
paragraph was drafted for story 105 and awaits the owner's review (Step 10).
Added `AdvancedPlanetBonusDiagram` to `src/guide/guideDiagrams.tsx`: two
`"advancedBonus"` `GuideDiagramCell`s — a new cell kind added to
`GuideDiagram.tsx`, dispatching to the existing `AdvancedBonusCell` (D13, built
in Step 6 with this reuse already in mind, per its own header comment) — a
Large points bonus beside a Node scramble bonus, at the app's own default
settings (`DEFAULT_CHARGED_NODE_COUNT`, `DEFAULT_PLAYER_MATCHING`,
`DEFAULT_SCORING`) so the `+N` amount comes from the point lookup rather than
being typed in, and so gold/silver/blue since player-matching is off by
default. Registered the diagram in `GuideScreen.tsx`'s `SECTION_DIAGRAMS`.
Updated every "seven headed/sections" comment (`guideCopy.ts`, `GuideScreen.tsx`)
to "eight". Left the STEALING NODES paragraph's "always shows two squares"
untouched, as the plan directs, for the owner's Step 10 attention.

Updated tests: `guideCopy.test.ts` (the eight-heading list; the advanced
section's paragraph verbatim, checked to contain "Steal"); `GuideScreen.test.tsx`
(eight headings/paragraphs wording; ten diagrams, not nine; PLANET BONUS's
"last in the story's order" assertion moved to the new section, which also
checks it immediately follows PLANET BONUS and renders two
`.advanced-bonus-cell`s, one `.points-symbol` and one `.node-scramble-symbol`);
`guideDiagrams.test.tsx` (a new `AdvancedPlanetBonusDiagram` describe block
checking cell count, the `+N` text against `advancedBonusPoints` and the
scramble symbol's three stroke colours against `SIGNAL_COLORS`). No changes
were needed to `GuideDiagram.test.tsx`, `guideCopy.ts`'s "seven"→"eight" in
`GuideSectionId`'s doc comments, or `App.test.tsx` (it counts option groups on
the start screen, not guide sections). No deviations from the plan.

Full `npm test` — **84 test files, 1796 tests, all green** (up from 1793,
Step 6's count: one new case each in `guideCopy.test.ts`, `GuideScreen.test.tsx`
and `guideDiagrams.test.tsx`); `npm run typecheck`, `npm run lint` and `npm run
format:check` all pass (prettier reformatted `guideDiagrams.test.tsx` and
`GuideScreen.test.tsx` after the new cases were added).

Add a new headed section, **ADVANCED PLANET BONUSES**, to the Quick Guide,
immediately after PLANET BONUS: a `GuideSectionId`, a `GUIDE_SECTIONS`
entry in `src/guide/guideCopy.ts`, and a diagram in
`src/guide/guideDiagrams.tsx` registered in `GuideScreen.tsx`. Update the
"seven headed sections" counts in comments and any test that counts
sections.

**Paragraph** (drafted by the implementer; the owner reviews it in Step 10):
guide vocabulary (points, fuel, spaceships), for a non-technical reader,
covering — only under the Steal playstyle; two bonuses always on two
planets, shown above the clocks; either player takes one by landing a
spaceship on it; the one left behind changes into something else and a new
one appears; the six kinds in one line each or one sentence (points in
three sizes, fuel for all your spaceships, an extra waiting square for
every node, every node's waiting squares redrawn). Keep it to the length of
the neighbouring sections' paragraphs. Update `guideCopy.ts`'s header
comment to say this section's copy was drafted for story 105 and awaits the
owner's review (Step 10 replaces that with the outcome).

**Diagram:** the panel showing two bonuses, drawn with Step 6's cell and
symbol components (not a picture of them), with fixed planet art from
`PLANET_ART` — e.g. a Large points bonus (`+N` from the table at the app's
default settings, via the lookup, never typed in) beside a Node scramble
bonus, gold/silver/blue colours. Add a `GuideDiagramCell` kind if needed,
the way `bonusPlanet` was added for the classic diagram.

The existing STEALING NODES paragraph says "every node always shows two
squares"; do not rewrite owner-approved copy — the new section's
Additional nodes line makes the exception clear. Note it in Step 10's
checklist for the owner.

Tests: `guideCopy.test.ts` (the new section exists, after planetBonus, with
a heading and a non-empty paragraph that mentions Steal); `GuideScreen.test.tsx`
(the heading renders, in order); `guideDiagrams.test.tsx` (the diagram
renders two planet cells with the expected two symbols, and the `+N`
equals the lookup).

Depends on: Step 6 (the cell and symbol components).

Verification (automated): full `npm test` green with the tests above;
typecheck, lint, format:check clean.

---

### Step 8 — Balancing the point table

Status: pending

Revisit the point table (story "Balancing") so a point bonus stays in
proportion to how fast nodes typically pay in each combination, keeping the
numbers round. Only the point amounts may change — not the weights, not
anything else (story "Out of scope").

**Measure.** Write an **improvised, uncommitted** measurement script — a
temporary `*.test.ts` under `src/rules/` run with `npx vitest run <file>`,
deleted before commit, exactly as the tech-notes' steal placement figures
were produced. For each of the 18 combinations (node count 3/4/5 ×
player-matching off/double/required × scoring simple/bonus), play at least
**100 seeded games** per combination at the app's defaults otherwise (five
ships, 30 rounds), **planet bonus off** (node income only), under **both**
combat off and combat on, with a deterministic steal policy that is
**matching-aware** — it prefers claiming its own matched node, then any
prospective node, then closing distance to the nearest, as
`seededReplay.test.ts`'s steal policy does apart from the matching
preference. (A policy blind to matching makes REQUIRED's income an artefact
of luck.) Record per combination: mean node energy per player-turn, and its
spread across games.

**Rescale.** Treat the story's table as the prior:

1. For each combination, the story's Medium amount divided by the measured
   mean income per turn gives a ratio; take the **median** ratio across all
   18 as the common scale `k` (the story's own overall level is kept; only
   the proportions between combinations move).
2. Target Medium = `k` × measured income for each combination; Small and
   Large keep the story's own proportions to Medium (roughly 0.6 and 1.6).
3. Round: integers; Small at least 1; strictly Small < Medium < Large;
   prefer round values (multiples of 5 at 10 and above).
4. Where the rescaled value differs from the story's by no more than one
   rounding step, **keep the story's number** — avoid churn for noise.
5. Check the story's pattern (DOUBLE ≈ one node more, REQUIRED ≈ one fewer)
   against the measurements and say in tech-notes whether it held.

**Apply**, all in this one commit, within 0.41 (S20 — no version bump, no
new changelog entry; the changelog does not carry the numbers, D12):

- the code table in `src/rules/advancedBonus.ts`;
- the table in `doc/ruleset/steal.md` §10 (the mirror test from Step 4
  fails if the two disagree);
- `story.md`'s table in this folder, corrected in place to what was built,
  with its "provisional" wording adjusted to say the table was balanced by
  measurement (project rule: story.md records what was actually built);
- any test spot-checking a changed cell;
- a new `doc/ruleset/tech-notes.md` section, "Sizing advanced planet bonus
  points", following the "Placing prospective nodes under steal" section's
  shape: what was measured and how (policy, seeds, rounds, combat on/off,
  script improvised and not committed), the measured income table, `k`,
  the before/after point tables, whether the story's pattern held, the
  caveat that a scripted policy is not a human player so the proportions
  matter more than the absolute level, and what the app guards (the mirror
  test).

If the measurements show the story's table already in proportion (every
cell within one rounding step), change no numbers: write the tech-notes
section anyway, and record in Notes that the table was confirmed.

Depends on: Steps 4–5 (the table and the lookup exist; steal games run
with the matching setting). It does not need Steps 6–7 but runs after them
so the owner's single manual gate sees final numbers.

Verification (automated): the measurement script ran (its summary recorded
in tech-notes and Notes) and has been deleted (`git status` shows no stray
test file); full `npm test` green, including the steal.md mirror test and
the panel/guide tests that read amounts from the lookup; typecheck, lint,
format:check clean; `grep -n "0.42" doc/ruleset/rules.md
doc/ruleset/changelog.md` finds nothing.

---

### Step 9 — `README.md`

Status: pending

Run `/update-readme` (or do its job by hand): the fleet sizes become
"three, four or five" (line ~4 and the start-screen choices list around
line 59, which lists "six, five, four or three" — becomes "five, four or
three"); the planet bonus choice gains ADVANCED, offered only under steal
(and "off to start" stays); the planet-bonus passage around line 95 gains a
plain sentence or two on advanced (two bonuses anyone can race for, six
kinds, the one left behind changes) without restating the rules; add
"advanced planet bonuses" to the list of what the quick guide explains.
Plain words, for a non-technical reader.

Depends on: Steps 2, 4, 7 (what is offered, and the guide, as built).

Verification (automated): `npm run format:check` clean and full `npm test`
green (unaffected). By inspection (recorded in Notes): `grep -n -i "six"
README.md` finds no fleet size of six; every start-screen choice README
lists matches `StartScreen.tsx`.

---

### Step 10 — The owner plays it

Status: pending

No code, unless the owner's play turns up a defect — fix it here, with a
test where the defect is in logic, and record it in Notes. A rules wording
change folds into 0.41 (S20). Guide copy the owner rewrites replaces Step
7's draft verbatim, and `guideCopy.ts`'s header then records that the copy
is the owner's.

Depends on: every step above.

Verification (manual): the owner runs `npm run dev` in the Dev Container
and checks the story's Verification list plus the items this plan deferred
here:

- The Ships group offers 3, 4 and 5, with 5 preselected.
- The Planet bonus group shows ADVANCED only while STEAL is chosen;
  choosing ADVANCED then another playstyle resets it to OFF, and choosing
  STEAL again does not bring ADVANCED back; ADVANCED survives a return to
  the start screen.
- Under ADVANCED the panel shows two planets side by side in the board's
  artwork, matching the board's squares; two different symbols, neither
  planet occupied. The four symbols look right (`+N`, fuel bar, three
  coloured rings, three-coloured rotation mark), in gold/silver/blue with
  player-matching OFF and gold/red/green with DOUBLE or REQUIRED.
- Landing on a points bonus raises the score by the panel's `+N` at once;
  the other planet's symbol changes; a new bonus appears in the claimed
  slot.
- Claiming Fuel raises not-full ships by one power and leaves full ships at
  6.
- Claiming Additional nodes gives every node a third ring-square; landing
  on any of a node's squares leaves it with two; leaving a held node with
  an extra leaves three waiting squares.
- Claiming Node scramble redraws every waiting square and leaves charged
  squares and extras where they were.
- With combat on, a ship pushed onto a bonus planet claims it for its own
  side.
- Off, 2 points and 3 points look and play as before, with 3–5 ships.
- The Quick Guide's ADVANCED PLANET BONUSES section and diagram read well
  (approve or rewrite the drafted paragraph); note the STEALING NODES
  paragraph's "always shows two squares" and decide whether it needs a
  touch.
- The balanced point table (Step 8, tech-notes) is acceptable.

(Seeded replay and the live-region sentences are covered by the suite and
are not part of this check.)
