# Story 00000125 — Player-matching nodes: Immediate

## Summary

Player-matching nodes, a steal-only setting, gains a fourth choice:
**IMMEDIATE**. Red and green still each have a node of their own, but it is
never charged and never held. It is a single waiting square in the player's
colour. When the player reaches it, it **pays them at once** and moves
somewhere else. How much it pays depends on how many nodes they hold at
that moment, so the red and green nodes reward holding the board first and
then stepping out to cash in.

Because red and green can no longer be charged, the Charged nodes choice
counts only the ordinary nodes under Immediate. Choosing 3 gives three
ordinary nodes plus red and green, five in all. Immediate offers only 3 and
4. To make that dependency easier to see, the start screen shows
Player-matching nodes above Charged nodes.

Everything here applies only under the **steal** node playstyle, which is
the only playstyle that offers player-matching nodes.

## What changes

### The rules

**A fourth setting.** Player-matching nodes (steal.md §9) becomes **off,
double, required or immediate**. It is still the same for both players,
fixed for the game, and offered only under steal. The ruleset still names no
default.

**How many nodes there are.** Under immediate, the charged-node choice
(rules.md §8.1) is **four or three**, and it counts the **ordinary** nodes
only. Red's node and green's node come on top of them, so a game has six or
five nodes in all. Five is not offered under immediate. Under off, double
and required, the choice and what it counts do not change.

**An immediate node.** Red's node and green's node are dealt as the
second-to-last and last nodes, as today. Under immediate, each is a node of
a single kind:

- **It has one prospective square**, in its player's colour, or **two**
  while it carries an extra from Additional nodes (steal.md §10). It never
  has a charged square, so it is never held, never pays at the end of a
  turn, and never counts as a node held.
- **Landing on one of its squares** with a ship, from either side, resolves
  at once:
  1. **If the node is the landing side's own**, that side is paid at once
     (see below). If it is the opponent's, nothing is paid.
  2. **The square landed on is removed.**
  3. **If the node had only that one square**, a fresh prospective square
     is drawn for it by steal.md §6's weighted rule. The **anchor** is the
     square just landed on, so the node moves well away from where it was.
     **If the node had two squares** (it carried an extra), nothing is
     drawn. The extra is used up, and the node is left with its other
     square.
- **Leaving comes first** (steal.md §5). A ship that steps off a charged
  square and lands on an immediate node's square resolves the leave first.
  The node it left is no longer held when the payment is counted.
- **Only landing counts**: a move that ends on the square. Flying over it
  does nothing. Ships returned by a fight land only on planets, so a fight
  never lands on an immediate node.

**What it pays.** The payment is counted from the ordinary charged nodes the
landing side's ships are standing on **at the moment of landing**, after any
leave has resolved. It is what those nodes would pay at the end of a turn
(rules.md §8.4), multiplied:

- **Simple scoring**: **three times** one turn's collection. Holding 1, 2, 3
  or 4 nodes pays 3, 6, 9 or 12.
- **Bonus scoring**: **twice** one turn's collection. Holding 1, 2, 3 or 4
  nodes pays 2, 6, 12 or 20.

Holding no nodes pays nothing, but the node still moves. A player who is out
of time (rules.md §10) is paid nothing, and the node still moves or is used
up as usual.

**The end of the turn.** Ordinary nodes pay at the end of a turn exactly as
rules.md §8.4 describes, with no doubling and nothing withheld. Immediate
nodes never take part in it.

**The opening deal** (steal.md §7). Every node's first square is drawn as
today, uniformly from the strict pool, in deal order, with red's and green's
last. Red and green get no second square. Only the ordinary nodes then draw
their second squares by the weighted rule, and those draws see red's and
green's squares as other nodes' squares.

**Planet effects** (steal.md §10) work as they do under the other settings,
with the following details:

- **Additional nodes** gives red's node and green's node an extra square
  too, if they do not already carry one. The kind is unavailable only while
  every node, red and green included, carries an extra. The extra square is
  drawn by the weighted rule, anchored on the node's remaining square.
- **Node scramble** treats red's and green's squares like any other
  prospective square. The player-matched signals are still placed first.
  The red or green colour can move onto a square that belonged to an
  ordinary node, and the reverse. Each signal keeps its number of squares.
- **Point bonuses** gain rows for immediate. Until it has been measured,
  immediate uses **the required rows' amounts** for the same node count:

  | Nodes | Player-matching | Simple scoring (S / M / L) | Bonus scoring (S / M / L) |
  | ----: | --------------- | -------------------------- | ------------------------- |
  |     3 | immediate       | 1 / 2 / 4                  | 2 / 4 / 6                 |
  |     4 | immediate       | 2 / 3 / 5                  | 3 / 5 / 8                 |

**The weighted rule** (steal.md §6) is unchanged for every other node.
Red's and green's squares count among the other nodes' squares (`S`) for
every draw.

### The ruleset

This is a gameplay change. `rules.md` goes from **0.45** to **0.46**, with a
changelog entry, in its own commit ahead of the code. Tagging stays on hold
(`CLAUDE.md`).

- **steal.md §9** lists the fourth setting and gains an **Immediate** part
  covering everything above. Its opening statement about which nodes are
  matched, and its closing statement about off, still hold.
- **steal.md §1** notes that, under immediate, the charged-node choice
  counts ordinary nodes only and offers four or three.
- **steal.md §6, §7 and §10** state the immediate exceptions: the anchor
  when an immediate node moves, the single-square opening deal, Additional
  nodes and Node scramble, and the two new point-table rows.
- **steal.md §2, §3, §5 and §8** gain short pointers, so the document stays
  consistent: §2's "always occupies exactly two squares" and its
  configuration table hold for every node except an immediate node;
  §3's claim rule applies to an ordinary node's prospective square, with
  landing on an immediate node's square covered by §9 instead; §5's
  leave-first ordering covers landing on an immediate node too; §8's
  closing sentence about energy being priced at the end of the turn notes
  that an immediate node pays on landing instead.
- **rules.md §8.1** says the charged-node choice works differently under
  steal's immediate setting, pointing to steal.md. **rules.md §1 and §8.4**
  name an immediate node among the sources of energy.

### What the player sees

- **The start screen.** Under STEAL, the **Player-matching nodes** group
  now appears **above** Charged nodes, and offers **OFF, DOUBLE, REQUIRED,
  IMMEDIATE**, in that order. With IMMEDIATE chosen, the Charged nodes group
  shows **5 greyed out**, so it cannot be chosen. If 5 was selected when
  IMMEDIATE is chosen, Charged nodes drops to 4. Choosing another
  player-matching setting, or another playstyle, makes 5 available again,
  and **restores 5** if that drop is the only reason it changed. Under the
  other playstyles, the start screen is unchanged.
- **The option tip** for Player-matching nodes gains a sentence for
  IMMEDIATE.
- **On the board**, red's node and green's node are each a single set of
  prospective rings in the player's colour, or two while they carry an
  extra. They are never drawn charged.
- **A payment** shows the existing "+N" flash on the square landed on, and
  the existing announcement of energy gained. Landing on the opponent's node
  shows no "+N". The node is then seen to move, or to lose its extra square.
- **The pips** under each score show one pip for each **ordinary** node:
  three or four, capped at the number of ships as today. Red's and green's
  nodes never have a pip. Nothing about immediate crosses a pip, but a
  player who is out of time still has their held pips crossed, as under
  every other setting.
- **The Quick Guide** gains its own **IMMEDIATE NODES** section, with a
  diagram, explaining the single square, paying on landing, the payment
  scale, and that landing on the opponent's node moves it without paying.
  The PLAYER-MATCHING NODES section names the fourth choice and points to
  the new section.
- **`README.md`** mentions the new choice where it describes player-matching
  nodes.

## What does not change

- **Off, double and required**, including their node counts and the 5
  choice they offer.
- **The app's defaults.** Player-matching nodes stays REQUIRED and Charged
  nodes stays 4.
- **The steal rules for ordinary nodes**: claiming, leaving, relocating and
  the weighted draw.
- **The other playstyles**, which still offer no player-matching nodes.
- **Combat, the clock, game length and fleet sizes.**

## Effect on the game

Under double and required, a player's own node is something to sit on.
Under immediate, it is something to reach. It pays nothing while a player
stands still, and the most when they already hold a lot of the board. That
creates a tension between holding nodes and spending a ship's turn to cash
in. Landing on the opponent's node is a cheap way to move their payout out
of reach, but it earns nothing.

## Out of scope

- **Retuning the point-bonus amounts** for immediate. The required amounts
  stand in until immediate has been measured.
- **Five ordinary nodes** under immediate.
- **Any new visual** for an immediate payment beyond the existing "+N"
  flash.

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.46**, and the changelog has
  one entry for it.
- Under STEAL, Player-matching nodes sits above Charged nodes and offers
  OFF, DOUBLE, REQUIRED, IMMEDIATE.
- With IMMEDIATE, Charged nodes 5 is greyed out. Choosing IMMEDIATE while 5
  is selected drops it to 4, and choosing REQUIRED again restores 5.
- An IMMEDIATE game with 3 charged nodes opens with three ordinary nodes of
  two squares each, plus a single red square and a single green square.
- Landing on your own node while holding nothing pays nothing, and the node
  moves.
- Landing on your own node while holding two nodes pays 6 under SIMPLE and
  6 under BONUS. Holding one pays 3 under SIMPLE and 2 under BONUS.
- Stepping off a held node straight onto your own immediate node pays for
  the nodes still held, not the one just left.
- Landing on the opponent's node pays nothing and moves it.
- After Additional nodes, red and green each show two squares. Landing on
  either square removes only that square, and nothing new appears. Landing
  on your own pays as usual.
- Ordinary nodes still pay at the end of the turn. Red's and green's nodes
  never do, and never have a pip.
- The same seed and the same moves give the same game.
- The Quick Guide has an IMMEDIATE NODES section with a diagram.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- There is **one** rules-version bump on this branch, however many later
  rules edits it needs.
