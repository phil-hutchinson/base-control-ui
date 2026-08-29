# Story 00000033 — Dormant sites cost energy and shields

## Summary

Standing on a dormant site stops being free. From this story a ship parked on
a site that has burned out costs its owner two things at the end of every one
of their turns:

- **Energy.** The dormant sites a player's ships occupy are counted and priced
  off the same rising table that pays for charged nodes — 1, 3, 6, 10, 15 —
  and, like that table, it stops at five. The player's score goes **up** for
  the charged nodes they hold and then **down** for the dormant sites they sit
  on. It is not a net count: three charged nodes and two dormant sites pay 6
  and cost 3, for +3 — not the 1 that a net "one node" would have paid.
- **A shield.** A ship on a dormant site loses one shield, the mirror image of
  the shield a ship on a charged node gains. It cannot go below 0.

A score can never fall below zero. Where a turn's penalty is larger than the
energy a player has, their total lands on 0 rather than going negative.

Nothing else about dormancy changes. A ship may still stand on a dormant site
for as long as its owner likes (§8.5), the site still recovers on schedule
underneath it, and the ship is under no obligation to move. It is now simply a
bad place to be.

The point of the change is to close the hole story 31 opened. Since version
0.13 a ship may camp anywhere, and camping on a spent site costs nothing at
all — story 31 named that as a play-testing question and left it deliberately
open. This is the answer: camping on an **active** site, waiting for the draw,
stays free and is still a real tactic; camping on a **dormant** one is
punished, so a ship whose node burns out under it now has a reason to leave.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.13**.
This story takes it to **0.14** — a gameplay change, so it earns a changelog
entry and a version bump (tagging remains on hold, per `CLAUDE.md`).

Planning documents say **ply** for the rules' and the UI's **turn**, and
**hub** is not used here: the rules and the UI both call a charged site a
**node**, and everything below follows the document's own words —
**site**, **charged**, **dormant**, **active** (`CLAUDE.md`, Vocabulary).

What exists today:

- **`doc/ruleset/rules.md`** — §4.1's shield gain, §8.1's three site states,
  §8.4's energy table and its "standing on" rule, §8.5's "It pays nothing",
  and §8.6's steps 1 and 2.
- **`src/rules/energy.ts`** — `ENERGY_BY_NODES_HELD`, `energyForNodesHeld`
  (throws outside 0–5) and `chargedNodesHeldBy`. The whole module is §8.4.
- **`src/rules/endOfTurn.ts`** — step 1's shield gain with
  `ShieldGainedEffect`, step 2's collection with `EnergyCollectedEffect`,
  and the `EndOfTurnEffect` union.
- **`src/rules/shields.ts`** — `ShieldCount`, `MIN_SHIELDS`, `MAX_SHIELDS`.
- **`src/board/announcements.ts`** — `shieldGainedClause`,
  `energyCollectedClause` and the end-of-turn sequence that orders them.
- **`src/board/EnergyOverlay.tsx`** — the "+N" and its pulse rings, driven
  off the `EnergyCollectedEffect`s carried by the session's last event.
- **`src/hud/`** — `ScoreDisplay` (digits and node pips), `useCountUp` and
  `countUp.ts`, which already handle a target that falls: `countUpValue`
  returns `to` when it is below `from`, and `useCountUp` does not animate a
  fall. No new animation work is needed for a score that drops.

Two facts shape the design and should not be rediscovered by the
implementer:

- **The charged table stops at 5 because the board does.** At most five sites
  are charged at once (§8.1, §8.2), which is why `energyForNodesHeld` treats
  6 as a caller bug. **Dormant sites have no such cap** — ten or more can be
  dormant at once, and a side has seven ships — so the penalty is capped
  instead: **only the five worst count**, and a side standing on six or seven
  dormant sites pays the same 15 as one standing on five. This is a deliberate
  choice rather than an arithmetic accident: the most a turn can pay is 15,
  and now the most a turn can cost is 15 too, so neither side of §8.4 can
  outrun the other.
- **The two tables are therefore the same table.** 0, 1, 3, 6, 10, 15 prices
  both directions; the collection reads it with a count that cannot exceed
  five, and the penalty reads it with a count clamped to five. The code should
  carry one table, not two, and the rules should say the price is the same
  either way.

## In scope

### 1. The rules edit, first and on its own

Version 0.13 → 0.14, with a changelog entry, in its own commit ahead of the
code.

**§4.1 gains the loss.** Alongside "a ship gains one shield at the end of its
owner's turn if it is standing on a node", a ship **loses** one shield at the
end of its owner's turn if it is standing on a **dormant** site, to the
minimum of 0. An active site does neither. The section's existing point — that
shields and speed pull against each other — is unchanged; what is added is
that a spent site actively erodes a ship's strength while it sits there.

**§8.1's dormant state stops being merely inert.** Dormant becomes: recovering
after running out, not eligible to be charged, producing nothing — and costing
the player whose ship stands on it, in energy (§8.4) and in a shield (§4.1).
Active is untouched: eligible to be charged, producing nothing, costing
nothing.

**§8.4 becomes collection _and_ penalty.** The section keeps its number and
its existing table, and gains the other half:

- The charged-node table is unchanged: 0 → 0, 1 → 1, 2 → 3, 3 → 6, 4 → 10,
  5 → 15.
- The **dormant sites the player's ships are standing on** are priced off
  that same table. Unlike charged nodes there is no limit on how many sites
  are dormant at once, so the count is **capped at five**: six or seven
  dormant sites cost the same 15 that five do. The most a turn can cost is
  therefore exactly the most it can pay.
- The two are applied in that order, **not netted**: the player collects for
  the charged nodes they hold, then pays for the dormant sites they occupy.
  The document should say plainly why this matters, with the worked example
  from the summary above — three charged and two dormant is +6 then −3, not
  the +1 that a net count of one node would have paid. Holding nodes and
  sitting on dead ones are separately priced, and both are priced steeply.
- **A score never goes below zero.** If the penalty is larger than the energy
  the player has, their total is 0.
- The "standing on at that moment" rule already in §8.4 governs both halves:
  a site counts only if one of that player's ships is on it when the count is
  taken, and flying across one costs nothing, exactly as flying across a node
  pays nothing.

**§8.5 stops saying dormancy is free.** Its "It pays nothing: no energy and no
shields while the site is not charged" is replaced by the two cases, now
different: an **active** site pays nothing and costs nothing, so waiting on
one for the draw is free; a **dormant** site pays nothing and **costs** — an
energy penalty (§8.4) and a shield (§4.1) at the end of each of the owner's
turns. The section keeps its main point: none of this obliges anyone to move.
A ship may sit on a dormant site all game if its owner is willing to pay for
it. The paragraph about a node falling quiet under its holder should say what
now follows — the holder starts paying from the next end of turn unless it
leaves.

**§8.6's steps 1 and 2 take the new work.** Step 1 becomes: each of the moving
player's ships on a charged node gains a shield, and each on a dormant site
loses one. Step 2 becomes: the moving player collects for their charged nodes
and then pays for their dormant sites (§8.4). No step is added, no step moves,
and steps 3 to 6 are untouched — the ordering reasoning in §8.6's tail is
about the drain, charge and recovery clocks and is unaffected.

**§1's overview** picks up one sentence: a site that has burned out is a bad
place to leave a ship. Elsewhere — §3, §5, §6, §7, §8.2, §8.3, §8.7, §9 and
both appendices — nothing changes.

### 2. The energy module carries both halves

`energy.ts` gains the dormant side of §8.4: the sites a side is standing on
that are dormant, and the penalty they cost, under whatever function names
read best beside the existing `energyForNodesHeld` and `chargedNodesHeldBy`.

`ENERGY_BY_NODES_HELD` prices both directions and stays a single table.
`energyForNodesHeld` keeps its name and its 0–5 range check — a sixth charged
node is still a caller bug, because the board cannot produce one. The penalty
function must **not** copy that check: six and seven dormant sites are ordinary
states of the game, so it clamps its count to five and prices that, and it
range-checks 0–7 only to catch a genuinely impossible count.

The module comment currently says "§8.4's payout table and what a side is
standing on"; it should say what the module is now.

### 3. The end-of-turn sequence

`endOfTurn.ts` step 1 loses a shield from each of the moving side's ships on a
dormant site, floored at 0, and step 2 subtracts the penalty after adding the
collection, flooring the side's total at 0.

Two new effects join the `EndOfTurnEffect` union — a shield loss beside
`ShieldGainedEffect`, and an energy penalty beside `EnergyCollectedEffect` —
so the board and the announcements can tell the two directions apart. The
existing convention holds for both: a ship already at 0 shields raises no
shield-loss effect, just as one at the cap raises no gain; and a zero penalty
raises no effect at all, just as a zero collection does not.

The penalty effect needs to carry the squares that caused it (for the
overlay), and a total that is what the side actually has afterwards. Where the
floor bites, the **amount reported is the energy actually deducted**, not the
table price — a player told they lost 6 while their score fell by 2 has been
told something false. This is expected to be rare and is worth a test of its
own.

Whether a turn produces both an `energy-collected` and an energy-penalty
effect, or one settlement effect carrying both directions, is the plan's call;
what the story requires is that a turn which both collects and pays reports
both, in that order, and that the two are distinguishable to the board.

### 4. What the player sees and hears

- **`EnergyOverlay.tsx`** draws the penalty the way it draws a collection:
  a pulse on each dormant square that cost something and a "−N" at their
  centroid, in the paying side's colour, visibly a loss rather than a gain.
  This reuses the existing overlay mechanism and its existing animation —
  no new animation design, no new component.
- **`announcements.ts`** gains a clause for each new effect, following the
  shape of the two it sits beside: the shield losses of a sequence grouped
  into one clause like the gains are, and a penalty sentence naming the
  squares and the resulting total. A turn that collects and then pays reads
  as two sentences in that order, which is the rule read aloud.
- **`ScoreDisplay` gains a second pip row.** The existing row counts the
  charged nodes a side holds and goes on doing exactly that, unchanged. Below
  or beside it sits a **separate** row counting the dormant sites that side's
  ships are standing on — separate, not merged into the first row and not
  netted against it, for the same reason the two halves of §8.4 are separate:
  a player needs to read what they are earning and what they are paying as two
  numbers.

  Five pips again, because the penalty counts at most five; a side on six or
  seven dormant sites lights all five, which is the truth about what they are
  paying. The row reads as a cost, not a holding — the plan picks the
  treatment, but a dormant pip must not look like a lit node pip of the same
  colour, and a side standing on nothing dormant should not have a row that
  draws the eye.

  The score digits already roll downwards correctly and need nothing.

- **`scoreSentence`** — the hidden text behind the score cell, currently
  "Green: 24 energy, 3 nodes held." — carries the dormant count too, since the
  pips are `aria-hidden` and this sentence is the only channel for them.

### 5. `README.md` and the ledger

`README.md` currently tells the player that a ship left on a node that has run
out "simply stays there — it is never forced to move, and its owner is free to
spend their next turn however they like". That is still true and should stay,
but it is no longer the whole story: sitting on a dark site now costs energy
and eats a shield every turn, so leaving is usually worth an action. The
opening paragraphs, which describe what shields are for and how scoring works,
should pick up the penalty too — a player reading only the top of the file
should learn that dead sites are dangerous ground.

Run `/update-readme` for the rest of the diff. `CLAUDE.md` needs nothing: no
vocabulary changes.

Tests: `energy.test.ts`, `endOfTurn.test.ts`, `announcements.test.ts`,
`EnergyOverlay.test.tsx`, `ScoreDisplay.test.tsx`, `Hud.test.tsx`,
`camping.test.ts`, `ply.test.ts` and `fullGame.test.ts` are the ones expected
to move. `camping.test.ts` is the
integration cover for a ship that stays put and is where the new cost belongs
end to end. `seededReplay.test.ts`'s recorded expectations move only if the
number of random draws per ply moves — this story draws no randomness and
removes none, so a changed expectation there is a signal worth reading, not a
number to update blindly.

Per the accessibility section of `CLAUDE.md`, existing automated tests are
updated where the path is straightforward and no plan step is added for
testing accessibility. If the implementation costs an accessible behaviour,
record it in `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Out of scope

- **Any penalty on an active site.** Waiting on an unlit site for the draw
  stays free; that tactic was the point of story 31 and this story does not
  touch it.
- **Charging the non-moving player.** The penalty is settled at the end of the
  paying player's own turn, exactly like the collection, so each player pays
  once per round for what their own ships are doing.
- **Any other cost of dormancy** — no forced move, no obligation, no
  restriction on ending a move on a dormant site. §8.5's permission stands.
- **Retuning drain, recovery, pressure, capacity, the charged-node energy
  table or game length.** Whether the new penalty is too harsh is a
  play-testing question and a later story with numbers in it.
- **Any other new HUD element** — the round counter, the turn indicator and
  the game-over panel are untouched, and the two pip rows are the whole of the
  HUD change.
- **Site or ship artwork.** A dormant site already looks dormant and a ship
  already shows its shields; nothing is redrawn to mark that a ship is paying.
- **§8.7, combat, movement, bays and the charge draw** — all untouched.

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.14 and the changelog has an
  entry.
- A player standing on one dormant site loses 1 energy at the end of their
  turn; two costs 3, three costs 6, four costs 10, five costs 15 — and six and
  seven also cost 15, with no error raised for either.
- A player holding three charged nodes while standing on two dormant sites
  ends the turn +3: the collection and the penalty are applied separately, and
  both are reported.
- A player with 2 energy who incurs a penalty of 6 ends on 0, never below, and
  what they are told they lost is 2.
- A ship standing on a dormant site at the end of its owner's turn loses one
  shield; a ship already on 0 stays on 0 and no effect is raised for it.
- A ship on an **active** site loses nothing and pays nothing, however long it
  stays; a ship that flies across a dormant site on its way somewhere else
  pays nothing.
- A ship standing on a charged node that runs out under it starts paying from
  the end of its owner's next turn, and stops the moment it leaves.
- The **opponent's** ships on dormant sites cost nothing at the end of the
  moving player's turn — each side pays on its own turn only.
- A turn that only pays, with no collection, is announced and drawn as a loss;
  a turn that does both is announced as both, collection first.
- The score digits roll down to the new total, and the overlay shows a "−N"
  over the dormant squares that caused it.
- The HUD shows a side's charged nodes held and its dormant sites occupied as
  two separate counts, both of them right as ships move on and off sites, and
  the hidden score sentence names both.
- A passed turn (§5) still settles both directions in full, exactly as it
  settles the collection today.
- The same opening seed and the same sequence of actions produce the same game
  every time.
- Typecheck, lint and the full test suite pass.
