# Story 00000080 — A third unit of fuel buys a longer move

## Summary

Version 0.28 made power a tank a ship spends rather than a ladder it climbs,
and priced four shapes at 0, 1, 2 and 2. The tank holds six. Nothing has ever
cost more than 2, so the top of the tank has only ever bought **repeats** — a
full ship is a ship with three medium moves banked, never a ship that can do
something a half-empty one cannot.

This story spends the third unit. Three new shapes join §6's table, all
priced at **3**:

| Move                                                                    | Cost |
| ----------------------------------------------------------------------- | ---- |
| three squares orthogonally                                              | 3    |
| two squares diagonally                                                  | 3    |
| the **long knight** — three squares orthogonally and one to either side | 3    |

Two of the three are returning: two squares diagonally and three squares
orthogonally were both in the game before 0.28 and were dropped when the
table was written. They come back at a price. The long knight is new.

The reach goes from **twenty** squares to **thirty-six**, and the furthest a
ship can land goes from two squares away to three.

## What changes

### The three shapes

- **Three squares orthogonally** reaches (±3, 0) and (0, ±3) — four squares.
- **Two squares diagonally** reaches (±2, ±2) — four squares.
- **The long knight** reaches (±3, ±1) and (±1, ±3) — eight squares. The run
  is always along the long axis: three squares in one orthogonal direction,
  then one square to either side.

Sixteen new destinations in all, each costing 3. Nothing about the existing
four shapes changes: the free orthogonal step, the diagonal at 1, two
orthogonally at 2 and the L at 2 all keep their prices, and a ship is still
free to take a cheaper shape and spend less.

### What blocks each one

**Only enemy ships block**, exactly as now, and the destination must still be
empty of any ship and must not hold an uncharged node. What is new is which
squares each new shape passes over.

- **Three squares orthogonally** passes over the **two** squares between
  origin and destination.
- **Two squares diagonally** passes over the **one** square between.
- **The long knight** passes over **five**. It is blocked from any of them,
  in the same spirit as the L, which is blocked from either of its two
  corners. For the long knight from H8 to K9, those five are **I8, J8, K8,
  I9 and J9**:

  ```
        I9 J9
     H8 I8 J8 K8 K9
  ```

  The five are the union of every way of walking the shape out of single
  steps whose **first step is along the long axis**:

  | Route                                      | Passes over |
  | ------------------------------------------ | ----------- |
  | three orthogonal, then one across          | I8, J8, K8  |
  | two orthogonal, then a diagonal            | I8, J8      |
  | one orthogonal, a diagonal, one orthogonal | I8, J9      |
  | a diagonal, then two orthogonal            | I9, J9      |

  **H9 is not one of them.** Stepping across before starting the run is not
  a way of walking this shape — the shape is three forward with a one-square
  offset, so every route begins by going forward.

### Attacks reach further too

§7 gives an attack **the same shapes at the same price**, so the three new
shapes extend attack range without §7 needing a new rule. A ship carrying 3
power or more can now strike anywhere in the thirty-six, paying 3 for a shot
at long range, and the attack's path must be clear of enemy ships by exactly
the rules above. §7's two worked extremes — "a ship at 0 power strikes only
one square orthogonally" and "a ship with 2 power or more strikes anywhere
in the twenty" — are restated for the new table.

This is the part of the change with the widest reach. A ship that was safe
because no enemy stood within two squares may now be reachable from three,
and a full ship that spends 3 on a shot still has 3 left for another.

## Effect on the game

A 15 x 15 board crossed in two-square steps takes a while; at three squares
a turn it opens up. A full tank now buys two long moves rather than
three medium ones, which is a real choice rather than an arithmetic one:
arrive sooner and arrive empty, or arrive later with fuel to fight or
retreat. Racing for a node that has just gone charged should get sharper,
since a ship three squares out is now in the race.

Blocking matters more than it did. The long knight crossing five squares is
easy to stand in the way of, and a line of three is easier to interrupt than
a line of two, so a ship placed between an enemy and a node does more work
than before.

Nothing is retuned against any of this: countdown lengths, node counts, the
tank's size, the charge rate, game lengths and the clock all keep their
values. Whether the game wants a shorter tank or a longer countdown at this
reach is for a later story to find out, on evidence.

## In scope

### 1. The rules edit, first and on its own

`doc/ruleset/rules.md` goes from **0.32** to **0.33**, with a changelog
entry, in its own commit ahead of the code. This is a gameplay change (moves
that were illegal are now legal), so it would be a tag candidate; tagging
stays on hold (`CLAUDE.md`).

- **§6's opening sentence** no longer says a ship moves one or two squares.
  It moves one, two or three, in the shapes the table gives — the sentence
  counts where the ship ends up, not the length of the walk, so the long
  knight's four-step walk still counts as three.
- **§6's table** gains the three rows above.
- **§6's power walkthrough** is rewritten: 0 power reaches the four free
  orthogonal steps, 1 power the eight single steps, 2 power the twenty, and
  **3 power or more all thirty-six**.
- **§6's path paragraph** gains the new shapes' passed-over squares,
  including the long knight's five with the H8–K9 example worked the way the
  L's corners are worked today.
- **§7** restates its two extremes against the new table, and its "the L
  included" aside widens to the new shapes.
- **§2** — check the _Move_ and _Power_ entries for anything that names two
  squares as the limit.
- **§4.1** — check the paragraph explaining what power is for; it names
  §6's table rather than numbers, so it may need nothing.
- **§8.5 and §5** — check for wording that assumes a two-square reach.

### 2. The shapes themselves

- **`movement.ts` is the only place the geometry lives**, and stays that
  way. `REACH_OPTIONS` gains the three rows; the straight option's
  `distance` widens past 2; the L's fixed pair of corners generalises to a
  list, so the long knight can carry five while the L carries its two.
- **The offsets are written down as data, not derived**, matching how
  `L_OFFSETS` is written today and for the same reason: they can be read
  against §6 at a glance, with a test pinning the sign rule that generates
  them.
- **Everything downstream is expected to need no change**: `reachFrom`,
  `shapeReaching`, `moveRefusalReason`, `legalDestinations`, `combat.ts`,
  `canMoveOrAttack.ts` and `ply.ts` all read the shape table rather than
  restating it. Anything that turns out to need a change is worth a note in
  the plan — it means a shape assumption leaked.
- **No new refusal reason.** A shape a ship cannot pay for is still
  `cannot-afford`; a square no shape reaches is still `out-of-range`.

### 3. What the player sees

- **The movement diagram grows from 5 x 5 to 7 x 7.** It is still built from
  `movementCostOffsets()`, so the costs are derived and cannot drift from
  §6. Twelve of the forty-eight surrounding squares stay blank — (±2, ±3),
  (±3, ±2) and (±3, ±3) — because no shape reaches them.
- **The guide's MOVEMENT paragraph is unchanged.** "For longer moves, fuel
  is required, as follows:" still reads true, and the guide is a first read,
  not a rules reference; it does not explain blocking today and does not
  start here.
- **`GuideDiagram` needs no change.** Seven columns are already the widest
  diagram (node selection), and the stylesheet already shrinks squares to
  fit a narrow window. The guide page gets taller and scrolls, which it
  already does.
- **The three movement and attack refusal announcements in
  `announcements.ts`** name the old table verbatim — "two squares or an L
  cost 2", "an orthogonal or diagonal step, two squares orthogonally, or an
  L". All three are rewritten against the new table, staying full recitals
  of it. They **describe** the long knight rather than naming it — "three and
  one across" — so a player who has not read the rules is not sent to look a
  term up.
- **`README.md`**'s movement sentence names the four old shapes and their
  prices; it gains the three new ones. Run `/update-readme` for the rest of
  the diff.

### 4. The tests

- **`movement.test.ts`** — the new shapes' destinations and costs, the sign
  rule that generates the long knight's eight offsets, each new shape's
  passed-over squares, blocking from each of the long knight's five (and
  **not** from H9), friendly ships not blocking any of them, affordability
  at 2 versus 3, and the full count of thirty-six from a central square.
- **`combat.test.ts`** — a 3-power attack at long-knight range, the same
  attack refused at 2 power, and an attack blocked by an enemy on one of the
  five.
- **`movementCosts.test.ts`** — thirty-six offsets, the twelve unreachable
  ones absent, and the second central origin still agreeing.
- **`guideDiagrams.test.tsx`** — the movement diagram is 7 x 7, carries
  sixteen 3s, and leaves twelve cells blank.
- **`announcements.test.ts`** (wherever the three sentences are asserted) —
  the new wording.
- **`seededReplay.test.ts`** — expected to be the risk. If its recorded
  moves are scripted squares they stay legal and it passes untouched; if any
  expectation is derived from the set of legal moves, it is re-recorded, and
  the plan says so explicitly rather than quietly regenerating it.
- **`fullGame.test.ts`, `ply.test.ts`, `Board.test.tsx`,
  `session.test.ts`** — pass with the wider reach; anything that fails
  because it assumed a two-square world is fixed at the assumption, not
  papered over.

Per `CLAUDE.md`'s pre-release stance: no plan steps for testing
accessibility, no review fixtures, no manual test scripts. Anything
knowingly lost goes in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Out of scope

- **Any shape costing more than 3.** The tank holds six; nothing here plans
  for a 4-, 5- or 6-cost move, and nothing is built to make one easy later.
- **Changing the tank.** 0–6 stays, and the planet charge rate stays at one
  a turn, or two when charging alone.
- **Re-tuning anything against the longer reach**: countdown lengths, node
  counts, node spacing under §3.2, fleet sizes, rounds and the clock all
  keep their values.
- **Capping attack range below movement range.** Attacks follow movement,
  as §7 already says.
- **A separate price for an attack.** An attack costs what the shape costs,
  unchanged.
- **Teaching blocking in the Quick Guide.** The guide shows costs; it has
  never shown paths.
- **Any change to how a move is chosen on the board** — selection,
  highlighting and the gesture are all driven by `legalDestinations` and
  pick the new squares up for free.
- **Backwards compatibility** for games recorded under 0.32 (`CLAUDE.md`).

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.33**, and the changelog has
  one entry for it.
- No section of `rules.md` states a two-square limit, and §6's table has
  seven rows.
- From a central square on an empty board, a ship at 6 power has **thirty-six**
  legal destinations; at 2 power, twenty; at 1, eight; at 0, four.
- A ship at 3 power can move three squares orthogonally, two squares
  diagonally, and the long knight; the same ship at 2 power is refused all
  three with **cannot afford**, not out of range.
- The long knight from H8 to K9 is refused with **path blocked** when an
  enemy stands on I8, J8, K8, I9 or J9, and is legal when an enemy stands on
  H9 or when any of the five holds a **friendly** ship.
- A ship at 3 power can attack an enemy at long-knight range, paying the
  shot down to 0, then gains at the lone-charger rate in the same turn's
  end-of-turn step, ending at 2; at 2 power the same shot is refused.
- The Quick Guide's movement diagram is 7 x 7, with the ship at centre,
  sixteen squares reading 3, and the twelve corner-ish squares blank.
- A full game plays through with the wider reach and the suite is green.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- The rules edit is one commit, ahead of the code, and there is **one**
  version bump on this branch however many later rules edits it needs.
- "Long knight" is the story's and the rules' word for the shape. It is the
  standard name for the (3, 1) leap and needs no invention; the document
  introduces it once in §6 and then uses it. It stays out of the UI, which
  describes the shape instead.
- Manual check worth making once it runs: whether a node that goes charged
  mid-board is now contested by both sides rather than conceded, and
  whether the longer attack reach makes parking beside a node too dangerous
  to be worth it.
