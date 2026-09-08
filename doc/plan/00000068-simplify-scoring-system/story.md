# Story 00000068 — One point per node, per turn

## Summary

Today a node's payout depends on how many nodes you hold at that moment: one
node pays 1, two pay 3, three pay 6 and four pay 10 (section 8.4's table). A
second node is worth twice a first, a third three times, a fourth four times.

This story throws the table away. **Each charged node you are standing on
pays one energy at the end of your turn** — hold three nodes, collect three.
Nothing else about collection changes: the node must be charged, one of your
ships must be standing on it when your turn ends, and nothing ever subtracts
energy.

The table was there to make spreading across the board worth the risk. It
does that too bluntly: it makes the difference between three nodes and four
worth four whole turns of holding one, so a single lucky fourth node can
outweigh a long stretch of solid play, and it makes a score hard to read
back — 10 energy could be one turn of four nodes or ten turns of one. A flat
rate makes the scoreboard mean what it says: **your score is the number of
node-turns you have held**, and every node is worth exactly what it costs to
sit on.

## What changes

- **Section 8.4's table goes.** Energy collected equals the number of charged
  nodes that player is standing on, with no upper bound written into the
  arithmetic — four is the most the board can offer (sections 8.1, 8.2), but
  that is the board's limit, not the scoring rule's.
- Everything downstream of the number stays as it is: the same collection
  moment (step 2 of the end-of-turn order), the same zero-is-not-an-event
  behaviour, the same `+N` overlay on the board, the same announcement
  sentence, the same running totals in the HUD.

## What does not change

- **Which nodes count.** Charged only, standing on it only, at the end of
  your own turn only. Flying over a node still collects nothing.
- **Nothing subtracts energy.** A total only ever rises.
- **The end-of-turn order.** Collection stays at step 2, still before
  depletion at step 3, so a node held to the very end of its countdown still
  pays on the same turn it traps its holder — it now pays 1 there rather
  than its share of the table.
- Nodes, movement, combat, power, planets, the trap and its relief, rounds
  and the clock are all untouched.

## Effect on the game

Scores get smaller and much flatter. A 30-round game in which a player holds
two nodes throughout now scores 60 rather than 90, and the gap between a
player holding four and a player holding one is 3 energy a turn rather
than 9. Holding more nodes is still strictly better — it is just no longer
worth abandoning a safe node to chase a fourth.

Nothing in the game is sized against the old numbers: game length is counted
in rounds, not points, and there is no target score to reach, so no other
setting needs rebalancing alongside this.

## Code

- **`src/rules/energy.ts`** — `ENERGY_BY_NODES_HELD` and
  `energyForNodesHeld` exist only to price the table. With the table gone
  the payout is the count itself, so **both should go** rather than being
  reduced to a function that returns its argument. `chargedNodesHeldBy` is
  the module's remaining reason to exist and is unchanged.
- **`src/rules/endOfTurn.ts`** — step 2 awards `heldSquares.length` directly.
  The `amount > 0` guard stays: a zero payout is still not an event.
- **`src/rules/energy.test.ts`** — the `energyForNodesHeld` describe block,
  including its three `RangeError` cases, goes with the function. The
  `chargedNodesHeldBy` tests stay.
- Anywhere else in the suite that asserts a settled amount off the old table
  (end-of-turn, full-game and session tests, and any announcement or overlay
  test naming a figure) needs its expected numbers redone. The
  `RangeError` above four disappears with the function, so nothing tests it.

## Notes

- This is a gameplay change: `doc/ruleset/rules.md` needs a version bump to
  0.29, a `changelog.md` entry, `RULES_VERSION` in
  `src/rules/rulesVersion.ts` updated to match, and section 8.4 rewritten
  from a table to a sentence. Section 8.3's worked example and section 8.6's
  step 2 refer to collection but quote no figure, so they need no change
  beyond checking.
- `README.md`'s rules summary says a node "pays energy at the end of each
  turn to the player sitting on it, and holding several at once pays far
  more than holding them one at a time would" — the second half is now
  false and should become the flat rate.
- Per the project's pre-release stance, no accessibility work is owed by this
  story; anything lost is recorded in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.
