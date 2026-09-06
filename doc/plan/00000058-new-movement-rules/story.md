# Story 00000058 — Power becomes a fuel tank, and movement is priced

## Summary

Movement stops being a set of options that power unlocks and becomes a set of
options that power **buys**. A ship carries a reserve, spends it to move, and
refills it on planets — nowhere else.

**The tank is bigger and it is spent, not unlocked.**

- A ship carries **0 to 6** power, up from 0 to 4, and every ship still starts
  full.
- Each move shape has a **price**, and a ship pays it out of its reserve:

  | Move                                                         | Cost |
  | ------------------------------------------------------------ | ---- |
  | one square orthogonally                                      | 0    |
  | one square diagonally                                        | 1    |
  | two squares orthogonally                                     | 2    |
  | the **L** — one orthogonal and one diagonal, in either order | 2    |

- A ship may take any shape it can afford, and is free to take a cheaper one
  and spend less. The one-square orthogonal move costs nothing, so **no ship
  is ever stuck**, however empty its tank.
- **Two squares diagonally and three squares orthogonally are gone.** The
  longest move on the board is now two squares, and the dearest costs 2.
- The **L is new**, and it is the only move that is not a straight line. §6's
  opening sentence has to stop saying every move is one.

**Only opponents block.**

- A ship's own side's ships no longer stop it. Friendly ships are flown over
  freely, by a move and by an attack alike; only an **enemy** ship in the way
  blocks either.
- A ship still cannot **land** on an occupied square, friendly or enemy.
  Flying over is what changes; sharing a square is still impossible.
- The **L is blocked from either corner**. Both of its one-step decompositions
  count: for the L to J9 from H8, an enemy on **I8** (the orthogonal step) or
  on **I9** (the diagonal step) blocks it. Only one of the two need be
  occupied.

**Attacks are priced the same way.**

- Attack range is still exactly movement range (§7), so it becomes the shapes
  the attacker can currently **afford** — including the L, with the same
  either-corner blocking.
- An attack now **spends** the cost of the shape it strikes down, out of the
  attacker's reserve, at the moment it is made. Striking down an L or two
  squares orthogonally costs 2; a diagonal jab costs 1; an orthogonal jab is
  free.
- The **defender's** power is untouched, as it is today. A fight still never
  strips either ship.

**Planets are the only source of power.**

- A **charged node no longer drains** the ship holding it, and a **depleted
  node no longer gives power back**. Neither state touches a ship's reserve.
  A depleted node is now purely a penalty: it costs energy and offers nothing
  in exchange.
- A ship standing on a **planet** at the end of its owner's turn gains **one**
  power — or **two** if it is the only one of that player's ships charging.
- **"Charging" means standing on a planet with room to gain.** A ship already
  at 6 is not charging: it counts for nothing, and it does not deny a lone
  shipmate elsewhere the double rate. So a player with one ship at 5 power on
  one planet and a full ship on another gives the first ship **two**, not one.

**The gauge becomes six lines.**

- Six slots, not four, drawn as **two rows of three** across the top of the
  square. The little overhead ship icon goes; each slot is now just its line.
- The line is a little longer than today's, and the black halo that keeps it
  readable against the board is **two to three times** as thick.
- The rows sit fairly close to the top, so the middle of the square stays
  clear for the node marker underneath.

### What this does to the game

Power stops being a property of where a ship is and becomes a **budget it
carries**. The old loop — hold a node, drain, crawl away, refill on a depleted
node — is replaced by: fill up on a planet, spend the tank getting somewhere
and fighting, go back for more.

Two consequences are deliberate and should not be treated as gaps:

- **Holding a charged node costs a ship nothing now.** The pressure to leave
  one was its drain; that is gone, and what remains is the opportunity cost
  and the fact that a holder cannot attack. A node held from the front is held
  until its capacity runs out.
- **A depleted node is now all cost.** It pays nothing, gives nothing back and
  charges energy every turn, so leaving one is straightforwardly right rather
  than a trade.

Both are the owner's intent for this story; if either proves wrong it is a
balance story of its own.

### The reach arithmetic

The four shapes give 4 + 4 + 4 + 8 = **20** destinations, which is what a ship
at 2 power or more can reach where the board allows. A ship at 1 power reaches
**8**; a ship at 0 power reaches **4**. §6's existing sentence — twenty squares
at full power, four at empty — happens to survive the change word for word,
because the old table's twenty came out the same way.

A full tank of 6 buys **three** of the dearest moves, or six diagonals, or an
unlimited number of orthogonal steps.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.23**.
This story takes it to **0.24**, in one version bump with one changelog entry
covering the whole story — the movement table, the blocking rule, the attack
cost, the power range and the planet rate land together and the document
cannot sensibly describe one without the others. It is a gameplay change;
tagging remains on hold per `CLAUDE.md`. Later rules edits on this branch fold
into that same bump rather than adding a second one.

Planning documents say **ply** for the rules' and the UI's **turn**
(`CLAUDE.md`, Vocabulary).

What exists today:

- **`doc/ruleset/rules.md`** — §1's overview paragraph on what power is and
  what holding a node does to it; §2's "Power" entry; §3.1's planet rule ("gains
  one power, to the maximum of 4"); §4's closing "Every ship starts at full
  power (4)"; §4.1 in full; §6 in full — the straight-line sentence, the
  unlock table, the twenty/four sentence and the clear-path paragraph; §7's
  range extremes, its clear-path sentence and its "a trade: position, not
  power" paragraph; §8.1's charged and depleted state descriptions; §8.5's
  comparison of the three states; §8.6 step 1.
- **`src/rules/power.ts`** — `PowerLevel` as `0 | 1 | 2 | 3 | 4`, `MIN_POWER`,
  `MAX_POWER`, `isPowerLevel`. The whole module is §4.1's range.
- **`src/rules/movement.ts`** — `REACH_OPTIONS` transcribed from §6's unlock
  table, `ReachOption.unlockedAtPower`, `reachFrom(origin, power)` and its
  `ReachEntry { destination, passedOver }`, `MoveRefusalReason`,
  `moveRefusalReason`, `legalDestinations`, `sideToMoveHasLegalMove`. This is
  the only implementation of §6.
- **`src/rules/combat.ts`** — `attackReach`, which reads `reachFrom` rather
  than carrying a second copy of the table, `AttackRefusalReason`,
  `attackRefusalReason`, `legalTargets`, `drawReturnPlanet`.
- **`src/rules/ply.ts`** — `applyMove`, `applyAttack`, `FightShip.power`,
  and `assertFightInvariants`, which currently throws if a **returned** ship's
  power changed at all.
- **`src/rules/endOfTurn.ts`** — step 1's single pass over the moving side's
  fleet, with `PowerGainedEffect` and `PowerLostEffect`.
- **`src/rules/fleet.ts`**, **`gameState.ts`** — `Ship.power`, the starting
  fleet built at `MAX_POWER`.
- **`src/board/announcements.ts`** — `powerGainedClause`, `powerLostClause`,
  `endOfTurnClauses`' grouping of both, `moveSentence`, and the
  `target-out-of-range` rejection wording that explains reach in terms of
  power.
- **`src/board/squareLabel.ts`** — the occupant segment, `power 3 of 4`.
- **`src/board/Board.tsx`**, **`BoardSquare.tsx`** — the occupant descriptor
  and the `ShipModel` prop it feeds.
- **`src/ships/shipArt.ts`** — `GAUGE_SLOT_COUNT`, `GAUGE_SLOT_X`,
  `GAUGE_SLOT_Y`, the separator and icon stroke widths, the bar geometry
  (`GAUGE_BAR_Y`, `GAUGE_BAR_X1`, `GAUGE_BAR_X2`, and the two stroke widths),
  `GAUGE_PALETTE`, and `ShipSideArt.gaugeIconId`.
- **`src/ships/powerGauge.ts`**, **`ShipModel.tsx`** — `gaugeSlots`, and the
  per-slot group that draws the icon twice and the bar twice.
- **`README.md`** — the power paragraph in the overview and the two quoted
  passages, both of which say a node drains a ship and a depleted node gives
  power back.

Four facts shape the work and should not be rediscovered:

- **A move's cost and its geometry are one table.** `REACH_OPTIONS` already
  pairs a shape with a number; the number changes meaning from "the power that
  unlocks this" to "the power this costs", and the filter changes from
  `unlockedAtPower <= power` to `cost <= power`. The L is a new kind of option
  alongside `orthogonal` and `diagonal`, not a new mechanism.
- **`passedOver` already carries exactly what blocking needs.** The two-square
  orthogonal move puts one square in it; the L puts **both** of its corners in
  it, and the existing "blocked if any of these is occupied" test then gives
  the either-corner rule for free. What changes is that the test looks at
  whose ship it is.
- **Nothing else reads `reachFrom`'s costs.** Combat reads it for range and
  now also for the price of an attack; the board reads `legalDestinations` and
  `legalTargets`, which do their own filtering. There is one table and every
  section reads it.
- **Recorded games will move.** `seededReplay.test.ts`'s expectations
  legitimately change, and the record format may too. A game record is a
  development artifact (`CLAUDE.md`); the same-seed, same-actions, same-game
  premise must still hold.

## In scope

### 1. The rules edit, first and on its own

Version 0.23 → 0.24, with one changelog entry covering the whole story, in its
own commit ahead of the code.

**§2's "Power" entry** stops describing what a node takes and starts
describing a reserve: what a ship carries and spends to move, refilled on
planets.

**§4's closing line becomes "Every ship starts at full power (6)."**

**§4.1 is rewritten.** A ship carries between 0 and 6 power. Power is what it
spends to move: every move has a price in §6's table, and a ship may take any
move it can afford. A ship **gains** power at the end of its owner's turn
standing on a **planet** — one, or two if it is the only one of that player's
ships charging (§3.1) — up to the maximum of 6. **Nothing else changes a
ship's power**: a charged node does not drain it, a depleted node does not
refill it, an inactive node does neither, and a fight leaves the defender's
alone (§7). A ship at 0 power is not destroyed and is not stuck: the
one-square orthogonal move is free, and a planet will refill it.

**§3.1's planet rule** gains the rate: a ship standing on a planet at the end
of its owner's turn gains one power, or **two** when it is the only one of
that player's ships charging, to the maximum of 6. A ship already at 6 is not
charging — it gains nothing and does not stop another ship taking the double
rate. Flying over a planet still does nothing, and arriving on one still does
nothing by itself.

**§6 is rewritten around cost.** The straight-line sentence goes: a ship moves
one or two squares, orthogonally, diagonally or in an L, and what it may do
depends on what it can pay. The table becomes the cost table above. The
twenty/eight/four sentence follows. The clear-path paragraph becomes: every
square a move passes over must be free of **enemy** ships — a ship flies over
its own side freely — and the square it lands on must be empty of any ship, of
either side. The **L's two corners** are both squares it passes over, and an
enemy on either one blocks it; the L is described plainly enough that a player
can see which two squares those are.

**§7 follows §6.** Attack range is still movement range, so it is now what the
attacker can afford, and the attack **costs** that price — the attacker pays
it as the attack resolves, and arrives on its planet already having paid. The
defender pays nothing. §7's two extremes are restated (a ship at 0 power
strikes one square orthogonally and nothing else; a ship with 2 or more
strikes anywhere in the twenty). §7's clear-path sentence takes §6's new
blocking rule. The **trade paragraph changes**: an attack now spends the
attacker's position **and** the power the shot cost, to take away the
opponent's position — the sentence that says it does not cost power is no
longer true.

**§8.1, §8.5 and §8.6 step 1 lose their power clauses.** A charged node pays
energy and protects the holder, and takes nothing. A depleted node costs
energy and gives nothing back. §8.6 step 1 becomes the planet gain alone —
one or two power for each of the moving player's ships on a planet, by §3.1's
rate.

**§1's overview follows.** Power is a reserve a ship spends to move and
refills on planets; holding a node no longer wears a ship down, and a depleted
node is a straight cost. The sentences saying a node drains the ship holding
it, that the longer it holds one the harder it is to leave, and that a
depleted node is where a ship pays energy for recovery, all go.

After this edit no sentence in `rules.md` says a node changes a ship's power,
that power unlocks a move rather than buying it, that a friendly ship blocks,
or that a ship's maximum is 4.

### 2. The movement table

`power.ts` widens: `PowerLevel` becomes `0 | 1 | 2 | 3 | 4 | 5 | 6` and
`MAX_POWER` becomes 6. `MIN_POWER` and `isPowerLevel` keep their shape.

`movement.ts`'s `REACH_OPTIONS` is re-transcribed from the new §6 table as
cost-carrying options: `cost` replaces `unlockedAtPower`, the two-diagonal and
three-orthogonal rows go, and an `"L"` kind is added alongside the two
existing kinds. `reachFrom(origin, power)` keeps its signature and returns the
affordable entries; `ReachEntry` gains the **cost** of the move that reaches
that destination, since every caller that applies a move or an attack now
needs it. The L contributes eight destinations, each with **both** corner
squares in `passedOver`.

The plan should decide how the L's geometry is generated — the eight offsets
with their two corners each, or the two-step composition that produces them —
and say why. Whichever it is, the property that matters is that no two shapes
ever produce the same destination, so a destination has exactly one price.

`moveRefusalReason` and `legalDestinations` follow:

- **Only enemy ships block.** The `passedOver` test consults the ship on the
  square and ignores it when it is the moving ship's own side.
- **The destination must be empty of any ship**, unchanged.
- A new refusal reason distinguishes **"you cannot afford this"** from
  **"that square is not a shape at all"**. A knight's-corner square that the
  ship has no power for should not be reported as out of range.

### 3. Attacks pay

`combat.ts` reads the same `reachFrom`, so range follows automatically. What
is added: the attack's cost is the reach entry's cost, the attacker must be
able to afford it, and a new refusal reason covers the case where it cannot.
The path test takes §6's new blocking rule — only enemy ships block, and the
target square's own occupant is of course not treated as blocking itself.

`ply.ts`'s `applyAttack` deducts the cost from the attacker before or as it is
placed, and `assertFightInvariants` changes from "a returned ship's power is
unchanged" to the two facts that are now true: the **defender's** power is
unchanged, and the **attacker's** is exactly its power before the fight less
the cost of the shape it struck down. `FightShip.power` stays the
before-the-fight snapshot for both ships, and whatever the announcement needs
to say what the attack cost should come from the effect rather than be
recomputed.

`applyMove` deducts the move's cost the same way. A ship that ends a move on a
planet still gains nothing on arrival.

### 4. The end-of-turn step

`endOfTurn.ts`'s step 1 keeps its single pass over the moving side's fleet and
its fleet-order effects, and loses everything but the planet case:

- `PowerLostEffect` and the charged-node branch go entirely — no end-of-turn
  step loses power any more.
- The depleted-node gain branch goes.
- The planet branch gains the **rate**: the pass first works out how many of
  the moving side's ships are standing on a planet **below maximum power**; if
  exactly one, that ship gains 2 (capped at 6), otherwise each gains 1.
- `PowerGainedEffect` carries the **amount** gained, so the announcement can
  say which happened.

The count is taken once, from the state as step 1 begins, not recomputed per
ship — a ship reaching maximum partway through the pass must not change the
rate for the ships after it.

### 5. What the player sees and hears

**The gauge (`shipArt.ts`, `powerGauge.ts`, `ShipModel.tsx`).** Six slots in
two rows of three, lines only.

- `GAUGE_SLOT_COUNT` becomes 6, and slot positions become a three-column,
  two-row grid rather than a single row of x offsets. Slots light in reading
  order: the top row left to right, then the bottom row.
- The per-slot **icon disappears**: `ShipSideArt.gaugeIconId`, the two `<use>`
  elements and the icon stroke width go, and with them the `<defs>` geometry
  they referenced if nothing else uses it. A slot is its black underlay line
  plus its own line on top.
- The line grows from 11 units long to roughly **18**, and the black halo
  round it from 1 unit a side to **2–3** — that is, the underlay stroke goes
  from 8 to about **10–12** against an unchanged bar stroke of 6. (The halo is
  what the owner asked to thicken 2–3x, not the whole underlay: a stroke of 20
  would be a black slab.)
- The rows sit near the top — the first around y=10, the second around y=26 in
  the 0–100 viewBox — so the gauge's lower edge lands about where today's
  single row does and the middle of the square stays clear for the node marker
  beneath.
- An **unlit** slot still reads as a slot: it keeps its black underlay and
  draws a thin line in the side's colour (today's `unlitOutline`), so a player
  can count six positions and see three of them lit. `GAUGE_PALETTE` keeps its
  per-side colours; the `unlitFill` entry may no longer have a use.

These numbers are a concrete starting point, not a specification the owner has
approved by eye — the visual is expected to be adjusted at the manual
verification gate.

**Announcements.** The power-lost clause goes with the effect that produced
it. The power-gained clause says how much was gained, and names the maximum as 6. The move and attack sentences say what the action cost and what the ship
has left — an orthogonal step costs nothing and should not claim to. The
`target-out-of-range` wording is rewritten for the new range, and the new
"cannot afford it" refusals get wording of their own, distinct from being out
of range.

**The square label** reads `power 3 of 6`.

Per `CLAUDE.md`, accessibility repair is not this story's work; anything this
change knowingly costs goes as a note in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, and no test is
added for accessibility.

### 6. `README.md`, tests and the version

`README.md` is player-facing (`CLAUDE.md`, Intended audience). Its overview
and both quoted passages currently say a node drains a ship and a depleted
node hands power back; they follow the new rules — power is a reserve spent on
moves and refilled only on planets, at one a turn or two for a ship charging
alone, up to six.

Tests follow the change:

- `power.test.ts` — the range is 0–6.
- `movement.test.ts` — the new table, the L's eight destinations and two
  corners, affordability at each power level, friendly ships not blocking,
  enemy ships blocking, and the destination still barred to both.
- `combat.test.ts` — attack range by affordability, the L as an attack lane
  blocked from either corner, friendly ships not blocking a shot, and the new
  refusal for an unaffordable target.
- `ply.test.ts` — a move deducts its cost and a free move deducts nothing; an
  attack deducts the attacker's cost and leaves the defender's power alone;
  the fight invariants assert the new facts.
- `endOfTurn.test.ts` — a lone charging ship gains 2, two charging ships gain
  1 each, a full ship neither gains nor denies a lone shipmate the double
  rate, the cap holds at 6, and neither a charged nor a depleted node touches
  power any more.
- `fleet.test.ts`, `gameState.test.ts`, `announcements.test.ts`,
  `squareLabel.test.ts`, `ShipModel.test.tsx`, `powerGauge.test.ts`,
  `Board.test.tsx`, `BoardSquare.test.tsx`, `camping.test.ts`,
  `fullGame.test.ts` — follow the new numbers and the new gauge.
- `seededReplay.test.ts` — re-recorded from a run, with the same-seed,
  same-actions, same-game premise intact.
- `rulesVersion.test.ts` — `RULES_VERSION` is `0.24` and the changelog has an
  entry for it.

## Out of scope

- **Energy, nodes and the charge draw are untouched.** What a node pays, what
  a depleted node costs, capacities, drains, pressure, the charge draw and
  node placement all stay exactly as they are. The only thing this story takes
  from nodes is their effect on a ship's power.
- **Combat's protections are untouched**: a planet and a charged node still
  shield a ship from attack and still stop it attacking, and a fight still
  returns both ships to random empty planets, attacker drawn first.
- **Fleet sizes, starting squares, rounds and the clock** are untouched.
- **No per-square cost display on the board.** A player reads their reserve
  off the gauge and sees which squares are highlighted; the board does not
  label what each destination would cost. If that turns out to be needed it is
  a story of its own.
- **No rebalancing of node capacity or the energy table** to compensate for a
  node-holder no longer being worn down. The consequence is known and accepted
  (see "What this does to the game").
- **No redesign of the hull artwork.** Only the gauge changes.
- **No move that costs more than 2**, and no way to spend power on anything
  other than a move or an attack.

## Verification

The rules and the version:

- `RULES_VERSION` agrees with `rules.md` at 0.24 and the changelog has one
  entry covering the story. No wording in `rules.md`, `README.md` or `src/`
  still says a node changes a ship's power, that power unlocks a move, that a
  friendly ship blocks, or that a ship's maximum is 4.

Movement:

- A ship at 6 power on an open board reaches twenty squares: four orthogonal
  steps, four diagonal steps, four two-square orthogonal moves and eight Ls.
- A ship at 1 power reaches eight — the orthogonal and diagonal steps only.
  A ship at 0 power reaches four, and can always take one of them.
- Each move deducts exactly its cost: an orthogonal step leaves the reserve
  where it was, a diagonal takes 1, a two-square orthogonal or an L takes 2.
- A ship at 1 power is refused the L and the two-square orthogonal move, with
  a reason that says it cannot afford them rather than that they are out of
  range.
- A full ship can make three L moves and then no more until it recharges,
  while still being able to step orthogonally for ever.

Blocking:

- A friendly ship sitting between a ship and its destination does not block
  it, for a two-square orthogonal move or for either corner of an L; an enemy
  ship in the same place does.
- Neither a friendly nor an enemy ship may be landed on.
- Both corners of an L block independently: an enemy on the orthogonal corner
  blocks it, an enemy on the diagonal corner blocks it, and with both corners
  clear it goes through.

Attacks:

- Attack range matches movement range at every power level, the L included.
- An attack deducts its shape's cost from the attacker and nothing from the
  defender; both ships still land on random empty planets, attacker drawn
  first, and the defender arrives with what it had.
- A ship at 0 power can still attack an orthogonally adjacent enemy, and
  nothing else.
- A ship with 1 power cannot strike down an L, and is told why.

Power and planets:

- A ship standing alone on a planet gains 2 a turn; two of that player's ships
  on planets gain 1 each; a ship already at 6 gains nothing and does not stop
  a lone shipmate gaining 2.
- The gain caps at 6, including when a ship at 5 takes the double rate.
- A ship holding a charged node loses no power however long it holds it, and a
  ship on a depleted node gains none while still paying the energy penalty.
- Ships start at 6.

What the player sees:

- The gauge shows six slots in two rows of three, lit in reading order, with
  no ship icon; three lit slots read unambiguously as three of six.
- The square label says `power 3 of 6`.
- The announcement for a move or an attack says what it cost and what the ship
  has left, and the end-of-turn announcement says a ship gained one or two
  power and names the maximum as 6.
- **Manual check by the owner**: the gauge's line length, halo thickness and
  row positions look right on the board, at both a full and a nearly empty
  reserve, and the node marker beneath a ship is still readable.

Whole build:

- `fullGame.test.ts` plays a complete game and `seededReplay.test.ts` replays
  the same seed to the same game.
- Typecheck, lint, `format:check` and the full test suite pass, with no dead
  exports or files left behind by the gauge's lost icon.
