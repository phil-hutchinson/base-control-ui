# Story 00000111 — Planet resources: new weights, and an in-place Node scramble

## Summary

Two changes to planet resources under steal, applying to stable and race
alike.

**The weights change.** Fuel becomes **needs-based**: it is rare when the
fleets are full, and grows more likely the more fuel is missing across the
board. Additional nodes and Node scramble become a little more common.

**Node scramble shuffles in place.** Today a Node scramble clears every
node's ordinary waiting squares and draws new ones elsewhere on the board.
Instead, the waiting squares now **stay where they are**, and their
**colours are shuffled** between the nodes. A player sees the same squares
on the board, but with different signals on them, so the node they were
heading for may now be waiting somewhere else. The player-matched nodes, red
and green, are shuffled first, so they are the most likely to move.

## What changes

### The weights

| Bonus            | Weight today | New weight                          |
| ---------------- | -----------: | ----------------------------------- |
| Small points     |           30 | 30                                  |
| Medium points    |           40 | 40                                  |
| Large points     |           20 | 20                                  |
| Fuel             |           16 | **10**, plus missing fuel, up to 40 |
| Additional nodes |           10 | **15**                              |
| Node scramble    |           10 | **15**                              |

**Fuel's weight** is 10, plus one for every point of fuel missing across
**every ship on the board, of both players**, a ship's missing fuel being 6
minus its power. The addition is capped at 30, so Fuel's weight runs from 10
to 40.

Fuel's weight is measured **at the moment of each kind draw**, exactly as
whether a kind is available already is. Laid against the existing claim
order, that gives:

**A move that lands on a bonus planet:**

1. The ship pays for the move, and its power drops.
2. If the move left a charged square, the leave resolves (steal.md §5).
3. **The bonus takes effect.** A Fuel bonus gives one power to each of the
   claimer's ships below 6, the claiming ship included.
4. **Under race**, the other bonus's kind is redrawn. Fuel's weight is
   measured here, so it sees the ship's reduced power and any Fuel just
   paid in step 3.
5. **A new bonus appears.** Its planet is drawn, then its kind, with Fuel's
   weight measured again. Nothing changes power between steps 4 and 5, so
   the two measurements agree.
6. **The end of the turn** (rules.md §8.6): ships on planets recover power,
   then energy is collected. This recovery comes after the draws, and never
   counts towards them.

**A fight:** the attacker pays for the shot and is placed on a planet. If it
claims a bonus, steps 3 to 5 run, with the defender's power as it stands —
a fight does not change it. The defender is then placed, and if it claims a
bonus, steps 3 to 5 run again, seeing everything the attacker's claim has
already done, a Fuel bonus included.

**The opening deal:** every ship starts full, so Fuel's weight is 10.

### Node scramble

**Only waiting squares take part.** Charged squares, and the ships on them,
are not touched. Every prospective square takes part, extras included.

**Squares stay put; signals move.** No square is added, removed or drawn
anew. Each node keeps exactly as many prospective squares as it had, so a
Held node stays Held and an Open node stays Open; it is only which squares
are whose that changes.

**The shuffle.** Each prospective square's signal is taken off it, and the
signals are placed back onto the squares, one at a time:

1. **The player-matched signals first.** If player-matching is on, take the
   red and green signals. Draw one of them at random, weighted by how many
   of each are still unplaced. Place it on a square, drawn at random, among
   the squares still empty **whose signal before the shuffle was a
   different one**. If there is no such square, draw from every square
   still empty instead. Repeat until every red and green signal has been
   placed.
2. **The other signals.** Do the same with every other signal. With
   player-matching off, this is the only step, and it takes every signal.

**Every placement is drawn**, even when there is only one square to choose
from, or when every choice is bound to give the same result. Every draw
comes from the game's seeded stream, so a recorded game replays exactly.

The shuffle does not promise that every square changes colour, or even that
every node moves: an early placement can take the only square a later
signal could have changed to. That is deliberate. A rule that forced as
many squares as possible to change would often leave only one or two
possible outcomes, making the scramble predictable; this one keeps it
unpredictable, while always moving at least one red or green square when
player-matching is on.

**A node's extra is a number, not a square.** No rule was ever meant to
single out which of a node's squares is its extra, and once signals move
that question has no answer at all. A node **carries an extra** when it has
one more prospective square than usual — three when Open, two when Held —
and nothing needs to track which square it is. What claiming, leaving and
Additional nodes do with a node's extra does not change: a claim still
leaves one fresh square, and Additional nodes still skips a node that
already has its extra.

**A node's anchor is simplified to match** (steal.md §6 and §10). It is the
node's charged square when the node is Held, and otherwise the **nearest**
of its prospective squares. Today, an Open node with an extra anchors on
the extra itself. The one place this plays differently is a Held node with
an extra being left: the second square it draws is now pushed away from the
nearer of its two remaining prospective squares, rather than from the extra
alone.

### The ruleset

This is a gameplay change. `rules.md` goes from **0.42** to **0.43**, with a
changelog entry, in its own commit ahead of the code. Tagging stays on hold
(`CLAUDE.md`).

- **steal.md §10**: the weight table, with Fuel's needs-based weight and
  when it is measured; Node scramble rewritten as above; "carries an extra"
  defined by count; the anchor paragraph simplified.
- **steal.md §6**: its anchor definition points to the simplified one.
- **steal.md §10, fighting for a bonus**: the note that squares drawn by
  the attacker's claim treat the defender's square as occupied now
  mentions Additional nodes only, since a Node scramble draws no squares.
- **steal.md §10, seeded draws**: the list names every draw of a Node
  scramble's shuffle in place of the squares it used to place.

### What the player sees

- **On the board**, a Node scramble no longer makes waiting squares vanish
  and reappear elsewhere: the same squares stay lit, and their colours
  change.
- **The Quick Guide.** The PLANET RESOURCES section's closing list says a
  scramble swaps the colours of every node's waiting squares, in place of
  "every node's waiting squares redrawn".
- **The claim announcement** for Node scramble says the waiting squares
  were shuffled between the nodes, not redrawn.
- **`README.md`** already calls it "a shuffle of every node's waiting
  squares", which stays accurate; it needs no change.

## What does not change

- **The point bonuses**, their weights and the point table.
- **What Fuel and Additional nodes do** when claimed.
- **The claim order**, stable and race, the opening deal and fights.
- **The bonus panel, its symbols and captions**, and the hover glow.
- **Every other steal rule.** Claiming and leaving nodes, player-matching
  and scoring are untouched.

## Effect on the game

Fuel now turns up when fleets are running low, which is when it is worth
the most, and is rarely offered when nobody needs it.

A scramble becomes a reshuffle of targets rather than a new board. A
player who has lined up a ship on a waiting square may find it now belongs
to a different node, which matters most for red and green. Since squares
no longer move, a held node's waiting square can now end up close to its
own charged square, where today's drawing rule would push it far away. That
is accepted as part of the scramble's disruption.

## Out of scope

- **Retuning the point table** or the point bonuses' weights.
- **Any new visual** marking a scramble as it happens.

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.43**, and the changelog has
  one entry for it.
- At the opening deal, Fuel is dealt at weight 10. As ships spend fuel,
  Fuel becomes more common, never above weight 40.
- A claim's draws see the claiming ship's power after its move, and after
  any Fuel just paid, but before the end-of-turn recovery.
- Claiming a Node scramble leaves every waiting square where it was, and
  every charged square and ship untouched; the waiting squares' colours
  change, and each node keeps the same number of waiting squares.
- With player-matching on, a scramble always puts red or green on at least
  one square that was a different colour before.
- The same seed and the same moves give the same game.
- The Quick Guide's PLANET RESOURCES section describes the new scramble.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- There is **one** rules-version bump on this branch, however many later
  rules edits it needs.
