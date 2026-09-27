# Story 00000105 — Advanced planet bonuses

## Summary

Today's planet bonus is a private errand. Each player has three planets of
their own, each pays them once, and nothing the opponent does can stop them
collecting. There is nothing to race for and nothing to deny (rules.md §3.4).

This story adds a fourth planet bonus setting, **ADVANCED**, offered only
under the steal playstyle, and it turns planet bonuses into a race. There
are no per-player planets any more. At any moment **two bonuses** stand on
the board, each on an empty planet, and **either player** claims one by
landing a ship on it. A claimed bonus is gone at once and a new one appears
on another planet, while the bonus that was not claimed changes to a
different kind. Each pair is a race: the player who gets there first takes
the prize, and the prize left behind turns into something else.

The bonuses are no longer just points. There are six kinds, dealt at random
by weight:

| Bonus            | Weight | What it does                                                  |
| ---------------- | -----: | ------------------------------------------------------------- |
| Small points     |     30 | Pays energy — the smallest of the three amounts               |
| Medium points    |     40 | Pays energy — the middle amount                               |
| Large points     |     20 | Pays energy — the largest amount                              |
| Fuel             |     16 | One power to every one of the claimer's ships that is not full |
| Additional nodes |     10 | Every node gains one extra prospective square                 |
| Node scramble    |     10 | Every node's ordinary prospective squares are cleared and redrawn |

This needs room on the planets, so the story also **retires the six-a-side
fleet** under every playstyle. The largest fleet is now five a side, which
always leaves a planet free for a new bonus (see _Why five is the limit_).

## What changes

### The rules

**The setting.** Planet bonus becomes **off, 2 points, 3 points or
advanced**. Advanced is offered only under steal. As before, the setting is
the same for both players, chosen before play begins and fixed for the whole
game, and the ruleset names no default. Off, 2 points and 3 points play
exactly as they do today.

**The two bonuses.** Under advanced, the board always carries exactly **two
bonuses**, on two different planets, and they are always of **two different
kinds**. A bonus is only ever placed on an **empty** planet. Any ship that
lands on a bonus planet claims its bonus, so a bonus planet is always
empty.

**The opening deal.** At the start of the game, two different planets are
drawn at random, every planet equally likely. The first bonus's kind is then
drawn by weight from the kinds available, and the second's is drawn the same
way from the kinds left over. This comes after everything the opening board
already deals.

**Claiming.** A ship that **lands** on a bonus planet claims that bonus for
its own side. Landing means the same as it does today: a move that ends
there, a deliberate return (§7.2), or a ship placed there by a fight (§7.1).
Flying over the planet does not count. A claim resolves at once, in this
order:

1. **The bonus takes effect** for the claiming side (below).
2. **The other bonus stays on its planet but changes kind.** It is redrawn
   by weight from the kinds available, excluding the kind it was.
3. **A new bonus appears** on a planet drawn at random from the planets that
   are empty at that moment and do not carry the other bonus, every such
   planet equally likely. Its kind is drawn by weight from the kinds
   available, excluding the other bonus's new kind.

"Available" is checked at the moment of each draw, so it reflects what step
1 has just done (see Additional nodes).

In a fight, the attacker is placed first and its claim, if any, resolves in
full. The defender's planet is then drawn from the planets still empty. It
may land on either bonus, including the one that has only just appeared, and
if so it claims that bonus for the defender's side.

A claim is instant. It is not part of the end-of-turn order (§8.6), exactly
like today's planet bonus. A bonus planet is otherwise an ordinary planet:
it protects its ship and recharges it at the end of the turn as §3.1 says.
Claiming a Fuel bonus does not change that end-of-turn recovery.

**Point bonuses** pay the claiming side energy at once. The amount depends
on the game's node count, its scoring and its player-matching setting, so
that a bonus stays in proportion to how fast nodes pay in that game. The
table below was balanced by measurement (see _Balancing_ and
`doc/ruleset/tech-notes.md`, "Sizing advanced planet bonus points"):

| Nodes | Player-matching | Simple scoring (S / M / L) | Bonus scoring (S / M / L) |
| ----: | --------------- | -------------------------- | ------------------------- |
|     3 | off             | 2 / 3 / 5                  | 3 / 5 / 8                 |
|     3 | double          | 2 / 4 / 6                  | 5 / 8 / 12                |
|     3 | required        | 1 / 2 / 4                  | 2 / 4 / 6                 |
|     4 | off             | 2 / 4 / 6                  | 4 / 6 / 10                |
|     4 | double          | 3 / 5 / 8                  | 6 / 10 / 15               |
|     4 | required        | 2 / 3 / 5                  | 3 / 5 / 8                 |
|     5 | off             | 3 / 5 / 8                  | 5 / 8 / 12                |
|     5 | double          | 3 / 6 / 10                 | 6 / 10 / 15               |
|     5 | required        | 2 / 4 / 6                  | 4 / 6 / 10                |

The table mostly follows a simple pattern: DOUBLE plays like one node more,
since a player's own node counts as two, and REQUIRED plays like one node
fewer, since income stops whenever the player loses their own node.
Measurement bore this out only loosely — DOUBLE under bonus scoring pays
considerably more than "one node more" once the own node's double count
compounds with bonus scoring's triangular payout, which is why the DOUBLE
column under bonus scoring differs from a first estimate built on the
pattern alone; every other cell held within a rounding step of what the
pattern predicted.

**Fuel** gives one power to each of the claiming side's ships below the
maximum of 6, wherever those ships are. The claiming ship is included, and
it still recovers on the planet at the end of the turn as usual. A ship
already at 6 gains nothing.

**Additional nodes** gives **one extra prospective square** to every node
that does not already have one. Nodes that already have an extra get
nothing, so a node never has more than one extra. Each new square is drawn
by steal.md §6's weighted rule, one node at a time in the order the nodes
were dealt. This kind is **not available**, and so never dealt, while every
node already has its extra.

A node with an extra square behaves as follows:

- **Held**, it has one charged square and two prospective squares. **Open**,
  it has three prospective squares.
- **Landing on any of its prospective squares claims it** (steal.md §3). All
  of the node's other squares go: the old charged square if there was one,
  and every other prospective square, extra included. Then **one** fresh
  prospective square is drawn, as usual. The extra is used up, and the node
  goes back to the usual two squares.
- **Leaving it** (steal.md §4) works as it does today. The charged square
  becomes ordinary board and the node draws its usual second prospective
  square. The extra **survives**, so the node is now Open with three
  prospective squares. The extra lasts until the node is next claimed.

**Node scramble** clears every node's ordinary prospective squares and draws
replacements. Charged squares, and the ships on them, are not touched, and
**extra prospective squares survive** the scramble where they stand. The
replacements are drawn one node at a time in the order the nodes were dealt,
each by steal.md §6's weighted rule. A held node, or an Open node with an
extra, uses its charged square or its extra as its anchor as usual. An Open
node with nothing left draws its first square at random from §6's widened
pool, every square equally likely, and its second by the weighted rule. Each
draw takes account of the squares already drawn before it.

**Every draw uses the game's seeded random stream**, so a recorded game
replays exactly: the opening planets and kinds, every redraw of the other
bonus's kind, every new bonus's planet and kind, and every square that
Additional nodes or Node scramble places.

**The fleet.** Each player now has **three, four or five** ships under every
playstyle. The six-a-side layout is gone. The four starting squares that
only it used (A2, A14, O2, O14) are no longer starting squares.

### Why five is the limit

With five ships a side there are at most ten ships on twelve planets. When a
ship claims a bonus, it stands on one planet and the other bonus holds a
second. That leaves ten planets for at most nine other ships, so a free
planet always exists for the new bonus. The same holds in a fight: once the
attacker's claim has resolved, the defender still finds an empty planet,
and so does any bonus the defender's landing then places. Six a side has no
such guarantee.

### What the player sees

- **The start screen's Planet bonus group** offers OFF, 2 POINTS, 3 POINTS
  and, only while STEAL is chosen, **ADVANCED**. If ADVANCED is selected and
  the player switches to another playstyle, the group returns to OFF. It
  does not jump back to ADVANCED when STEAL is chosen again. Apart from
  that, the choice survives a return to the start screen, like every other.
- **The Ships group** offers 3, 4 and 5. Five stays preselected.
- **The bonus panel** sits where it does today, above the clocks. Under
  ADVANCED it shows **the two current bonus planets**, drawn with the same
  artwork the board uses on those squares, so a player can match each one to
  the board. In landscape each planet is drawn **at least as large as a
  planet on the board**; in portrait, where the panel shares its space with
  the clocks, the pair **shrinks to fit that space** instead, so a planet
  there may draw smaller than one on the board. The two sit **side by side
  where the space allows, and stack one above the other where it does not**,
  in portrait as well as landscape. **Below each planet is a symbol for its
  kind**, sized to be read at a glance, and **below the symbol a one-word
  caption**:

  | Kind             | Symbol                                                | Caption   |
  | ---------------- | ----------------------------------------------------- | --------- |
  | Points (any)     | `+N`, the amount the bonus would pay                  | BONUS     |
  | Fuel             | a **single** fuel bar, the one the power gauges use   | FUEL      |
  | Additional nodes | a node's three rings, each ring in a different colour | ADD NODES |
  | Node scramble    | the app's rotation symbol, in three colours           | SCRAMBLE  |

  The single fuel bar says "one power", which is what Fuel gives. ADD NODES
  stays plural even when only one node still lacks its extra square. The
  three colours are **gold, red and green** when player-matching is DOUBLE
  or REQUIRED, and **gold, silver and blue** otherwise. Blue is the node
  colour that comes after silver.
- **Hovering over a planet in the panel makes that planet glow on the
  board**, for as long as the pointer stays on it. This works for every
  planet the panel draws, under ADVANCED and under 2 or 3 points alike. It
  is a way to find a planet, not a marking: nothing on the board shows a
  bonus otherwise.
- **When a bonus is claimed**, the panel changes straight to the new pair.
  The planet that was not claimed shows its new symbol, and the new planet
  takes the other slot. The claiming side's score rises at the moment of
  the landing.
- **The board** does not mark bonus planets under ADVANCED, just as it
  marks none today; the panel is where players read them, and the hover
  glow is the only link between the two. The board does
  show extra prospective squares, as ordinary prospective rings in their
  node's colour, and it shows a scramble's new squares.
- **The live region** gets a sentence for each claim, saying which side
  claimed which kind of bonus and what it gave them.
- **The quick guide** gets its own ADVANCED PLANET BONUSES section, with a
  diagram of the panel showing two bonuses. **`README.md`** adds ADVANCED to
  its list of pre-play choices and drops six ships from the fleet sizes.

### The ruleset

This is a gameplay change. `rules.md` goes from **0.40** to **0.41**, with a
changelog entry, in its own commit ahead of the code. Tagging stays on hold
(`CLAUDE.md`).

- **`steal.md` gets a new section, Advanced planet bonuses**, stating
  everything in _The rules_ above: the two bonuses, the six kinds and their
  weights, the opening deal, the claim order, the point table, what Fuel,
  Additional nodes and Node scramble do, how a node with an extra behaves
  when it is claimed and left, and that every draw uses the seeded stream.
  Sections 3 and 4 each get a pointer to it for the extra square.
- **`rules.md` §3.4** lists advanced as a fourth value, offered only under
  steal, and points to steal.md for it. Its existing text becomes the
  description of 2 points and 3 points.
- **`rules.md` §1, §4 and §5** say three to five ships. §4 drops the
  six-a-side table and says "each of the three layouts".
- **`rules.md` §3.1** reduces the starting squares from eighteen to
  **fourteen** and removes A2, A14, O2 and O14 from the diagram.
- **`rules.md` §7.1** reworks its "there is always somewhere to go" argument
  for at most ten ships.
- **`rules.md` §10** and any other list of pre-play choices are checked for
  the new value and the new fleet sizes.

## What does not change

- **Off, 2 points and 3 points**, under every playstyle: the same three
  planets a side, the same once-per-planet payment, the same panel.
- **The steal node rules** (steal.md §§2–9) for every node without an extra
  square. Additional nodes and Node scramble are the only things that
  change a node's squares outside a claim or a leave.
- **Energy from nodes.** Bonuses only ever add energy. Nothing subtracts it,
  and REQUIRED still withholds node energy only: a bonus pays whether or not
  the claiming player holds their own node.
- **Combat**, the clock, the game length and the other playstyles' node
  rules.
- **Three-, four- and five-a-side layouts**, and the default fleet of five.

## Effect on the game

Every bonus is now contested. A bonus near the opponent's fleet is one they
will probably take. Racing for it costs a move, and so does leaving it for
them. The survivor's re-roll adds some luck: a player heading for a Large
points bonus may find it has turned into Fuel just as they arrive, because
the opponent claimed the other bonus first.

The node bonuses change the board rather than the score. Additional nodes
makes every node easier to reach for a while, which helps whoever is behind
on nodes. Scramble undoes the opponent's plans for their next claims.
Neither one pays the claimer directly, which makes them the interesting
choices to weigh against a points bonus.

## Out of scope

- **Advanced under the continuous, planet or dedicated playstyles.**
- **Any animation** of a claim, a re-roll or a new bonus in the panel, and
  any lasting marking of bonus planets on the board. The hover glow is the
  only board effect.
- **More than two bonuses at once**, or bonus kinds beyond the six listed.
- **Retuning** the weights, or anything other than the point amounts (see
  _Balancing_).

## Balancing

The point table above was a first estimate, built from a stated pattern
rather than measurement. A later step in the plan measured how fast nodes
actually pay, under a matching-aware policy, at every combination of node
count, player-matching and scoring, and rescaled the table to match while
keeping the numbers round — changing two cells, both DOUBLE under bonus
scoring, and leaving the rest as first estimated. The table above is the
result; the measured figures, the rescale and what stayed unchanged are in
`doc/ruleset/tech-notes.md`, "Sizing advanced planet bonus points".

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.41**, and the changelog has
  one entry for it.
- The Ships group offers 3, 4 and 5 only, with 5 preselected.
- The Planet bonus group shows ADVANCED only while STEAL is chosen.
  Switching away from STEAL while ADVANCED is chosen resets it to OFF.
- Under ADVANCED, the panel shows two planets matching the board's
  artwork: side by side where there is room, stacked where there is not.
  In landscape each is at least as large as a planet on the board; in
  portrait the pair shrinks to fit the space above the clocks, without
  clipping. Their symbols are always two different kinds, each captioned
  BONUS, FUEL, ADD NODES or SCRAMBLE, and neither planet has a ship on it.
- Hovering over a planet in the panel, under any planet bonus setting,
  makes that planet glow on the board; moving off it ends the glow.
- Landing on a points bonus raises the claiming side's score by the table's
  amount, right away. The other planet's symbol changes to a different kind,
  and a new bonus appears on another empty planet.
- Claiming Fuel raises every not-full ship of the claiming side by one
  power, and leaves full ships at 6.
- Claiming Additional nodes gives every node one extra prospective square.
  Landing on any square of such a node leaves it with its usual two squares.
  Leaving a held node with an extra leaves it Open with three prospective
  squares. Additional nodes is never dealt while every node already has its
  extra.
- Claiming Node scramble redraws every ordinary prospective square. It
  leaves charged squares, and any extras, where they were.
- With combat on, a ship pushed onto a bonus planet claims it for its own
  side, and the attacker's claim resolves before the defender's placement.
- The same seed and the same moves produce the same bonuses, planets and
  squares.
- Off, 2 points and 3 points play and look exactly as they do today, with
  three to five ships.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- There is **one** rules-version bump on this branch, however many later
  rules edits it needs, including the balancing step's.
