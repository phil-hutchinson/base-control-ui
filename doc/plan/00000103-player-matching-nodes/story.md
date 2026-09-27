# Story 00000103 — Player-matching nodes

## Summary

Under the steal playstyle every node looks alike apart from its colour, and
the colour only tells one node from another: a node is worth the same to
both players, and neither has any reason to prefer one over the rest.

This story gives each player **a node of their own**. Two of the game's
nodes are matched to the players, one each, and drawn in the players' own
colours — a **red** node and a **green** node. What that match is worth is
**a choice made before play begins**, offered only under steal:

- **OFF** — no node is matched. The game is exactly today's.
- **DOUBLE** — a player standing on their own node at the end of their turn
  collects for it as though it were **two** nodes.
- **REQUIRED** — a player collects node energy at the end of their turn
  **only if** one of their ships is standing on their own node. When they
  are, the collection is priced exactly as it is today.

The start screen is reordered around it: **Node playstyle** moves to the top,
because it now decides whether another group appears, and the new group,
**Player-matching nodes**, appears just below **Charged nodes** whenever
STEAL is chosen. As with every other choice, the ruleset names no default;
the app preselects OFF, so a player who touches nothing gets the game they
get today.

## What changes

### The rules

- **Two nodes are matched to the players.** With the setting DOUBLE or
  REQUIRED, one of the game's nodes belongs to green and one to red, for the
  whole game. The match is fixed: it does not follow whoever holds the node,
  and the node is claimed, stolen, relocated and abandoned exactly as any
  other node is (steal.md §§3–5). Either player may take either matched
  node — taking the opponent's is a legitimate way to deny it to them.
- **DOUBLE.** At the end of a player's turn, their own node, if one of their
  ships stands on it, counts as **two** nodes held. The opponent's node
  counts as one, like any other. The whole turn is then priced by the
  chosen scoring (rules.md §8.4) on that count:
  - red holding red and silver under **bonus** scoring counts three nodes
    held and collects **6**;
  - the same under **simple** scoring collects **3**.
- **REQUIRED.** At the end of a player's turn, if none of their ships stands
  on their own node, they collect **no node energy** that turn, however
  many other nodes they hold. If one does, they collect exactly what they
  would today — their own node counts once, like any other.
- **Planet bonuses are untouched** (rules.md §3.4). REQUIRED withholds node
  energy only; a bonus planet pays on landing whether or not the player
  holds their own node.
- **Only under steal.** Under the other three playstyles there is no such
  setting and no node is matched.

### What the player sees

- **The start screen's order** becomes: Node playstyle, Ships, Charged
  nodes, Player-matching nodes (only under STEAL), Scoring, Planet bonus,
  Combat, Rounds, Clock.
- **Player-matching nodes** offers OFF, DOUBLE and REQUIRED, OFF leftmost
  and preselected. It is not shown while any other playstyle is chosen, and
  a game started under any other playstyle has no matched nodes whatever
  the group was last left at. The choice is remembered while the player
  switches playstyles back and forth, and still set when a finished game
  returns to the start screen, like every other choice.
- **The red and green nodes.** With DOUBLE or REQUIRED, the two matched
  nodes are drawn in the players' own red and green — the same colours the
  ships and the score display use — in place of two of the usual node
  colours. The colours given up are taken from the end of the order brown,
  purple, blue, silver, so a game shows:

  | Nodes | Colours                        |
  | ----- | ------------------------------ |
  | 5     | gold, silver, blue, red, green |
  | 4     | gold, silver, red, green       |
  | 3     | gold, red, green               |

  With OFF the colours are today's.
- **The pips under DOUBLE** count a player's own node as two, both in how
  many pips there are and in how many are lit:
  - the row is **one pip longer** than it is today, so it still reaches the
    most a turn can count;
  - standing on their own node lights **two** pips, and the highlighted
    value under the last lit pip is what the turn will pay.
- **The pips under REQUIRED.** While a player holds nodes but not their own,
  each node they hold is marked with an **X** in place of a lit pip, and no
  value is highlighted: they can still see how many nodes they hold, and
  that none of them will pay. As soon as they stand on their own node, the
  pips light as they do today. The row is its usual length.
- **The quick guide** gains its own PLAYER-MATCHING NODES section, with a
  diagram, and **`README.md`**'s list of pre-play choices gains the option.
- **The live region's** score and collection wording reflects what is
  actually paid under both settings.

### The ruleset

A gameplay change: `rules.md` goes from **0.39** to **0.40**, with a
changelog entry, in its own commit ahead of the code. Tagging stays on hold
(`CLAUDE.md`).

- **`steal.md` gains a section** setting out the rule above: the choice is
  off, double or required, the same for both players, chosen before play
  begins and fixed for the game's lifetime, naming no default; two nodes are
  matched to the players, one each, for the whole game; what DOUBLE and
  REQUIRED do to a turn's collection; that planet bonuses are unaffected;
  and that the app shows the matched nodes in the players' colours.
- **`rules.md` §8.4** points at it, so a reader of the energy section knows
  steal can change what a turn pays.
- **`rules.md` §10's list** of what is chosen before play, and any other
  list of pre-play choices, gains the setting.

## What does not change

- **Everything under OFF**, and everything under the other three
  playstyles. A recorded game played with OFF replays exactly as it does
  today.
- **How a node is claimed, left, stolen, relocated or drawn** (steal.md
  §§3–7). A matched node behaves like any other node in every respect but
  what it pays.
- **The scoring settings themselves.** Simple and bonus price a count of
  nodes exactly as they do today; DOUBLE changes the count, not the price.
- **Planet bonuses**, combat, the clock and the game length.
- **Nothing subtracts energy.** REQUIRED withholds a turn's node energy; it
  never takes any away.

## Effect on the game

Under DOUBLE, a player's own node is the most valuable square on the board
for them and an ordinary one for the opponent — so taking it off them is
worth less to the taker than it costs the victim, and whether to spend a
turn on it is a real question.

Under REQUIRED, a player's own node is the whole game for them: without it,
every other node they hold is worth nothing. Stealing the opponent's node
shuts off all of their income for as long as it is held, which makes a
single steal far more decisive than it is today, and makes guarding one's
own node the first job of the fleet.

## Out of scope

- **Player-matching nodes under the other three playstyles.**
- **More than one matched node per player**, or matched nodes that pay
  anything other than what is described here.
- **Any marking of a matched node beyond its colour** — no badge, no ring,
  no label.
- **Retuning anything else** against the new setting.

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.40**, and the changelog has
  one entry for it.
- The start screen opens with Node playstyle at the top. Player-matching
  nodes appears below Charged nodes only while STEAL is chosen, with OFF
  preselected.
- With OFF, a steal game looks and plays exactly as it does today.
- With DOUBLE or REQUIRED, the board shows a red and a green node, and the
  colours they replace follow the table above for five, four and three
  nodes.
- Under DOUBLE with bonus scoring, red holding the red node and one other
  collects 6 at the end of the turn; the pip row is one longer than usual,
  and three pips are lit.
- Under DOUBLE, holding the opponent's node counts it as one.
- Under REQUIRED, a player holding nodes but not their own collects nothing
  for them, and their pips show an X for each node held. Once they stand on
  their own node, they collect as usual and the pips light as usual.
- Under REQUIRED, a bonus planet still pays on landing.
- A game started under another playstyle, after Player-matching nodes was
  set under STEAL, has no red or green node.
- The choice survives a return to the start screen.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- There is **one** rules-version bump on this branch however many later
  rules edits it turns out to need.
- A red node under a red ship, or a green node under a green ship, is by
  design — the colours were chosen to match.
