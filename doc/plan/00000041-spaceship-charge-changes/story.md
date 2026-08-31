# Story 00000041 — Power replaces shields, and bays recharge over time

## Summary

Three changes to the number a ship carries. The first turns it inside out
without changing how the game plays; the second and third change how the game
plays.

**Shields become power, and the polarity reverses.**

- A ship no longer carries 0–4 **shields** that slow it down. It carries 0–4
  **power**, and power is what lets it move: a ship at full power has the
  whole of §6's range, a ship at 0 power has one square orthogonally.
- Ships start at **4** — full power, full movement — instead of at 0.
- Standing on a charged node **drains** a ship: it collects energy and loses
  one power per turn, down to 0. Standing on a dormant site **restores** it:
  it loses energy and gains one power per turn, up to 4.
- **This is a reskin, not a rules change.** Every number, every threshold and
  every reachable square is exactly what it is today; `power` is `4 - shields`
  throughout. It is worth doing because the old presentation was upside down:
  a shield sounded like protection while doing nothing but harm, and a full
  gauge meant a crippled ship. Full now means good, empty means bad, and the
  gauge reads the way a player expects a gauge to read.

**A fight no longer changes a ship's power.**

- Both ships are still returned to bays chosen at random, exactly as §7.1
  says. What goes is the stripping: each ship arrives carrying the power it
  had when the fight started. A drained ship stays drained; a ship at full
  power stays at full power.

**A bay restores power one per turn instead of all at once.**

- Ending a move in a bay no longer refills a ship instantly. A ship standing
  in a bay at the end of its owner's turn gains **one** power, to the maximum
  of 4 — the same rate, and the same end-of-turn step, as a dormant site,
  and without a dormant site's energy penalty.

### How the three fit together

The second change alone would leave a hole. Today a fight is the fast way to
shed weight: both ships come back empty, so a heavily loaded ship gains
something from being beaten. Stopping that is the point of the second change —
a fight should cost the ship's position, not hand its owner a refuelled ship —
but it means a beaten ship arrives in a bay drained and, with nothing else
changed, would sit there drained forever, because arriving in a bay would no
longer be what refills it either.

The third change is what fills the hole. A bay becomes the place a ship goes
to recover, at a turn per point: park a drained ship for four turns and it
comes out at full power, or leave after one and go slowly. That gives the
player a real decision where before there was none, and it makes the bays —
which have been little more than a spawn point — worth using deliberately.

Together, the three mean **the only ways to recover power are time in a bay
and time on a dormant site**, one costing turns and the other costing energy.
Neither is free, and a fight is no longer a shortcut around both.

### Why "power" and not "charge"

The change was first described as reversing the polarity of a ship's
"charges". The word is taken: `rules.md` already has **charged** sites, the
**charge draw**, and a node that is charged, so §4.1 would have read "a ship
on a charged node loses a charge" one sentence after describing the charge
draw. **Power** carries the same meaning with no collision, and it reads
cleanly against **energy**, which stays what it is — the score a player
banks, not a property of a ship.

`power` is the word **everywhere**: player-facing text, the rules document,
the code and the tests. Unlike hub/node (CLAUDE.md, Vocabulary) there is no
reason to split it.

### Why the code is renamed rather than inverted at the edge

The cheaper option was to leave `shields` in place and display `4 - shields`.
It was considered and rejected by the owner: `rules.md` is the source of truth
and the code implements it, so a permanent sign flip between the two — the
document saying a fresh ship is at 4 while `fleet.ts` says 0 — is a trap on
every future rules change, and the second and third changes in this very story
are edits to exactly that machinery. The stored value becomes the
player-facing one. The diff is wide but mechanical.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.16**.
This story takes it to **0.17**, in one version bump with one changelog entry
covering all three changes — they land together and the document cannot
sensibly describe one without the others. It is a gameplay change (the second
and third are), so tagging would eventually apply; tagging remains on hold per
`CLAUDE.md`.

Planning documents say **ply** for the rules' and the UI's **turn**
(`CLAUDE.md`, Vocabulary).

What exists today:

- **`doc/ruleset/rules.md`** — §1's overview of what a shield is and what a
  fight does; §2's word list; §3.1's bay rule ("a ship that ends a move in a
  bay loses all its shields"); §4's closing "Every ship starts with 0
  shields"; §4.1 in full; §6's range table, keyed by shields descending, and
  its "a ship with 4 shields … a ship with none" sentence; §7's range extremes
  and its "stripped of every shield they carried" and "a trade: position and
  shields"; §7.2's "loses all its shields on arrival"; §8.1's charged and
  dormant states; §8.5; §8.6 step 1.
- **`src/rules/shields.ts`** and **`shields.test.ts`** — `ShieldCount`,
  `MIN_SHIELDS`, `MAX_SHIELDS`, `isShieldCount`. The whole module is §4.1's
  range.
- **`src/rules/movement.ts`** — `ReachOption.unlockedAtShields`,
  `REACH_OPTIONS` transcribed from §6's table, and `reachFrom(origin,
shields)`'s `option.unlockedAtShields < shields` skip.
- **`src/rules/fleet.ts`** — `Ship.shields`, and the starting fleet built at
  `shields: 0`.
- **`src/rules/gameState.ts`** — `Ship.shields` on the state's ship entries
  and `shipsFrom`'s record entry.
- **`src/rules/endOfTurn.ts`** — step 1: `ShieldGainedEffect`,
  `ShieldLostEffect`, and the single pass over the moving side's fleet that
  adds on a charged site and subtracts on a dormant one.
- **`src/rules/ply.ts`** — `applyMove`'s `endsInBay ? 0 : ship.shields` and
  the `shields-reset` effect it pushes; `placeInBay`, which resets to 0;
  `FightShip.shields` and `toFightShip`; `applyAttack`'s doc comment
  ("placed at 0 shields in a bay").
- **`src/rules/combat.ts`** — `reachFrom(attacker.square, attacker.shields)`
  in `attackReach` and `legalTargets`.
- **`src/board/announcements.ts`** — `shieldGainedClause`,
  `shieldLostClause`, `moveSentence`'s "lost its shields" branch keyed on the
  `shields-reset` effect, `fightSentence`'s "both with no shields", and the
  `target-out-of-range` rejection wording that explains shields shorten reach.
- **`src/board/squareLabel.ts`** — the occupant segment, "2 shields".
- **`src/board/Board.tsx`**, **`BoardSquare.tsx`** — the occupant descriptor
  and the `ShipModel` prop it feeds.
- **`src/ships/shieldGauge.ts`**, **`ShipModel.tsx`**, **`shipArt.ts`** —
  `gaugeSlots`, `GAUGE_SLOT_COUNT`, and the optional gauge prop.
- **`README.md`** — the shield paragraphs in the overview and the two
  quoted-flavour passages.

Three facts shape the work and should not be rediscovered:

- **The reskin is arithmetic, not logic.** Every existing rule keeps its
  shape; only the sign flips. A charged node's step-1 branch becomes a
  subtraction with a floor, the dormant branch an addition with a cap, the
  reach table is read from the other end, and the starting value becomes the
  maximum. Nothing gains or loses a case.
- **The gauge component needs no visual change.** `gaugeSlots` lights the
  first `n` of four slots; feeding it `power` instead of `shields` is the
  whole of the reversal on screen — a full ship shows four lit slots, a
  drained one none.
- **Recorded games will move.** The bay and combat changes alter what ships
  can do from one turn to the next, so `seededReplay.test.ts`'s recorded
  expectations legitimately change, and the record format itself carries a
  ship's number and will change name. Both are fine: a game record is a
  development artifact (`CLAUDE.md`). The test's premise — same seed, same
  actions, same game — must still hold.

## In scope

### 1. The rules edit, first and on its own

Version 0.16 → 0.17, with a changelog entry covering all three changes, in its
own commit ahead of the code.

**§2 gains "Power".** A ship's power: how far it can move, and what a node
takes from it while it stands there. The list keeps its alphabet-free,
plain-language style.

**§4.1 is rewritten as "Power".** A ship carries between 0 and 4 power. Power
is what lets it move: each point unlocks a further option in §6's table, and
with it a further option for its attack range (§7). It does nothing in a
fight. A ship **loses one power** at the end of its owner's turn standing on
a **charged node** — the node is drawing on the ship as it pays out — down to
the minimum of 0. It **gains one power** at the end of its owner's turn
standing on a **dormant** site or in a **bay**, up to the maximum of 4. An
**active** site does neither. A fight never changes a ship's power (§7). A
ship at 0 power is not destroyed and is not stuck: it still has one square
orthogonally, and a bay will refill it.

**§4's closing line becomes "Every ship starts at full power (4)."**

**§6's table is re-keyed to power**, read from the other end, with the
options accumulating as power rises:

| Power | Movement                                   |
| ----- | ------------------------------------------ |
| 0     | one square orthogonally                    |
| 1     | the above, plus one square diagonally      |
| 2     | the above, plus two squares orthogonally   |
| 3     | the above, plus two squares diagonally     |
| 4     | the above, plus three squares orthogonally |

The sentence that follows flips with it: a ship at full power has twenty
squares it can reach, a ship at 0 power has four.

**§3.1's bay rule changes.** A bay is still an ordinary square except that a
ship in one cannot attack and cannot be attacked. What replaces the
shield-stripping bullet: a ship standing in a bay at the end of its owner's
turn **gains one power**, to the maximum of 4 (§4.1). It is where a ship goes
to recover, at a point per turn. Flying over a bay still does nothing — only
standing in one at the end of the turn counts — and arriving in one does
nothing by itself either; the first point comes at the end of that turn like
any other.

**§7 stops stripping.** Both ships are still returned to bays (§7.1) and both
squares are still left empty, but each ship arrives carrying **the power it
had**. The "stripped of every shield they carried" sentence goes, and so does
the one that says a 4-shield ship and an unshielded one come out of a fight
identically — they no longer do. The trade paragraph is reworded: an attack
spends the attacker's own **position**, not its power, to take away the
opponent's. §7's two range extremes flip to match §6's table (a ship at 0
power reaches one square orthogonally and cannot strike a diagonal at all; a
ship at full power reaches three squares orthogonally).

**§7.2 stops stripping too.** A ship may still return to a bay deliberately as
an ordinary move; what it gets there is recovery at a point per turn, not an
instant refill.

**§8.1 and §8.5 follow.** A charged node takes power from the ship holding it
as it pays out; a dormant site gives power back and costs energy. §8.5's
comparison of the three states says which way each moves a ship's power.

**§8.6 step 1 is reworded**: each of the moving player's ships standing on a
charged node loses a point of power, and each standing on a dormant site **or
in a bay** gains one (§4.1).

**§1's overview follows.** A ship carries power, which is what lets it move.
Holding a node pays energy and drains the ship, so the longer a ship holds a
node the slower it becomes and the harder it is to leave — the same tension
as before, said the right way up. A fight pushes both ships back to bays
without changing what they carry, and a bay is where a drained ship recovers,
a point per turn.

The document must not leave the old framing standing anywhere: after this
edit no sentence in `rules.md` calls the number a shield, or says a fight
strips it, or says a bay refills it at once.

### 2. The rename, bottom-up through the rules modules

`src/rules/shields.ts` becomes `power.ts`: `PowerLevel`, `MIN_POWER`,
`MAX_POWER`, `isPowerLevel`, with the same 0–4 range and the same guard, and
its test file moves with it. `Ship.shields` becomes `Ship.power` in
`fleet.ts` and `gameState.ts`, and the starting fleet is built at `MAX_POWER`
rather than 0.

`movement.ts`'s `REACH_OPTIONS` is re-transcribed from the new §6 table:
`unlockedAtPower` ascending, and the skip inverts — an option is available
when the figure it unlocks at is at or **below** the ship's power.
`reachFrom(origin, power)` keeps its signature shape and every caller
(`combat.ts`, `ply.ts`, `Board.tsx`) follows the field rename. No geometry
changes: a ship's reachable set for a given mobility is identical to today's.

This step is the sign flip. It is worth checking explicitly that the movement
tests, once their inputs are converted, assert the same reachable squares as
before for the same mobility — the reskin must be provably a reskin.

### 3. The end-of-turn step

`endOfTurn.ts`'s step 1 keeps its single pass over the moving side's fleet
and its fleet-order effects. The branches become:

- on a **charged** site, and above `MIN_POWER`: lose one;
- on a **dormant** site, or **in a bay**, and below `MAX_POWER`: gain one;
- otherwise nothing.

`ShieldGainedEffect` / `ShieldLostEffect` become the power effects with the
sense reversed — the effect raised on a charged node is now the losing one.
The bay case is a new condition on an existing step, not a new step, and it
uses the same `isBay` check `ply.ts` and `combat.ts` already use. A bay and a
site can never be the same square (§3.2: every site is interior), so the two
branches cannot both apply.

The plan should decide whether a bay's gain and a dormant site's gain are one
effect type or two. One is sufficient — the square is on the effect and the
sentence can name it — but the announcement wording must be true of both.

### 4. Bays and combat stop resetting

`ply.ts`'s `applyMove` no longer zeroes a ship that ends in a bay, and the
`shields-reset` effect disappears along with the branch that pushed it.
`placeInBay` places a ship without touching what it carries, so both ships in
a fight keep their power; `applyAttack`'s doc comment and `FightShip`'s
snapshot field follow the rename. Any fight invariant that asserts a returned
ship's number was reset is now asserting the opposite: it must assert the
number is **unchanged**.

### 5. What the player sees and hears

- **The gauge** is fed `power`, so a full ship shows four lit slots and a
  drained one shows none. `shieldGauge.ts` becomes `powerGauge.ts` and the
  `ShipModel` prop renames; the drawing itself does not change.
- **The end-of-turn clauses** flip: the clause for a ship on a charged node
  says it lost power (and names the ones that reached 0), and the clause for
  a ship on a dormant site or in a bay says it gained power (and names the
  ones that reached full power, 4). The wording must work for a bay as well
  as a dormant site.
- **The move sentence** loses its "and lost its shields" branch: moving into
  a bay is now an ordinary move, and what the bay does is reported by the
  end-of-turn clause that follows in the same announcement.
- **The fight sentence** stops saying both ships arrived with no shields. It
  should say what is now true — both ships were pushed back to bays with what
  they were carrying — without becoming a paragraph.
- **The out-of-range rejection** explains reach the right way up: an attack
  travels as far as a move, so a drained ship strikes barely at all — a ship
  at 0 power can only strike one square up, down, left or right.
- **The square label's** occupant segment names power, in a form that reads
  as a level rather than a count of objects.

### 6. `README.md`, tests and the ledger

`README.md` is player-facing (`CLAUDE.md`, Intended audience) and describes
shields in its overview and in both quoted passages. It follows the new
rules: power is what lets a ship move, a node drains the ship holding it, a
fight leaves what a ship carries alone, and a bay is where a ship recovers.

Every test that names a shield follows the rename, and the ones that assert
behaviour follow the change:

- `shields.test.ts` → `power.test.ts`, unchanged in substance.
- `movement.test.ts` — same reachable squares, inputs converted.
- `endOfTurn.test.ts` — the charged/dormant cases invert, and a ship standing
  in a bay at the end of its owner's turn gains a point, capped at 4, with no
  energy penalty.
- `ply.test.ts` — a move into a bay leaves the ship's power alone, and a
  fight returns both ships with theirs unchanged; the `shields-reset`
  expectations go.
- `combat.test.ts`, `fleet.test.ts`, `gameState.test.ts`, `fullGame.test.ts`,
  `announcements.test.ts`, `squareLabel.test.ts`, `ShipModel.test.tsx`,
  `Board.test.tsx`, `BoardSquare.test.tsx`, the HUD tests — rename, and the
  starting value becomes 4.
- `seededReplay.test.ts` — re-recorded from a run, with the same-seed,
  same-actions, same-game premise intact.
- `rulesVersion.test.ts` — `RULES_VERSION` is `0.17` and the changelog has an
  entry for it.

Per `CLAUDE.md`, accessibility repair is not this story's work; anything this
change knowingly costs goes as a note in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, and no test is
added for accessibility.

## Out of scope

- **Energy, drains, capacities and the charge draw** are untouched. What a
  node pays, what a dormant site costs, how fast a node burns and how sites
  are picked all stay exactly as they are.
- **Movement geometry and combat legality** are untouched. The same lines,
  the same clear-path rule, the same protections for a bay and a charged
  node, the same one action per turn.
- **No redesign of the gauge**, beyond feeding it the reversed number. How
  ships look is story 40's work, just landed.
- **No new cost or limit on parking in a bay.** A bay both protects and
  restores, so a drained ship can sit there for four turns and come out
  full. That is intended: the price is the turns, and the bays are on the
  edge of the board, far from the nodes. If it proves too safe, that is a
  balance story of its own.
- **No rule against a ship at 0 power**, and no special handling for one. It
  moves one square orthogonally like any other ship at 0 power.

## Verification

Rules and rename:

- `RULES_VERSION` agrees with `rules.md` at 0.17 and the changelog has an
  entry; no wording in `rules.md`, `README.md` or `src/` still calls a ship's
  number a shield, says a fight strips it, or says a bay refills it at once.
- A fresh game starts every ship at 4 power, and every ship's reachable set
  from its bay is §6's full twenty-square range where the board allows.
- For every mobility, the squares a ship can reach and attack are the same as
  before this story, with power `4 - shields`.

The reskin, end to end:

- A ship that sits on a charged node collects energy and loses a point of
  power per turn, reaching 0 after four turns and staying there.
- A ship that sits on a dormant site pays energy and gains a point of power
  per turn, reaching 4 and staying there.
- A ship on an active site neither gains nor loses.
- The gauge shows four lit slots for a ship at full power and none for a
  drained one; the announcement says power lost on a node and power gained on
  a dormant site, naming the ships that hit 0 and 4.

Bays:

- A ship that moves into a bay keeps the power it had at the moment it
  arrived; nothing about the move announcement claims otherwise.
- That ship gains one point at the end of that same turn, and one at the end
  of each of its owner's turns after it, to 4 — never more, and never while
  it is the other side's turn.
- No energy is collected or paid for a ship in a bay.
- A ship that leaves a bay before it is full leaves with what it has
  recovered so far.

Combat:

- Two ships that fight are both returned to bays carrying exactly the power
  each had before the fight — 4 against 0, 2 against 2 — and neither is
  reset.
- Both fought-from squares are still left empty, the attacker's bay is still
  drawn first and the defender's from the bays still empty, and the same seed
  with the same actions still produces the same game.
- A ship beaten while drained recovers in its bay at a point per turn, like
  any other ship in a bay.

Whole build:

- `fullGame.test.ts` plays a complete game and `sitePool.test.ts` still finds
  the pool comfortable over a long run.
- Typecheck, lint, `format:check` and the full test suite pass, with no dead
  exports or files left behind by the rename.
