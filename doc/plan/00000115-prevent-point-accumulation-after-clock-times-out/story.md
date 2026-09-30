# Story 00000115 — No energy after the clock runs out

## Summary

A player whose clock has run out stops scoring. From that moment they
collect **no more energy**, from any source, for the rest of the game.

Today a player who runs out of time passes every remaining turn, but those
turns still pay them for the nodes their ships are standing on. Passing is
not allowed in the game, yet late in a timed game a player can sometimes
do better by sitting still than by moving. Letting the clock drain turns
their last turns into passes that still score. It is an edge case, likely
to matter only in the last turn or two, but it is a hole, and this story
closes it.

## What changes

### The rules

- **A player who is out of time gains no energy.** From the moment their
  clock reaches zero, they collect nothing for the nodes they hold at the
  end of a turn, and no bonus pays them energy. This includes the turn in
  which the clock runs out. It applies to every turn they pass from then
  on, including one that would have passed anyway because they could
  neither move nor attack.
- **Their total is frozen**, not reduced. Nothing in the game subtracts
  energy.
- **The rest of the end-of-turn order still runs** for their passed turns,
  as it does today (rules.md §8.6, §10). Countdowns tick, nodes deplete and
  trap, and ships on planets recover power. Only the payment stops.
- **Their ships stay where they are and keep their nodes.** A node held by
  a player who is out of time pays nothing, but it is otherwise an ordinary
  held node. It still counts down, depletes and traps under the other
  playstyles. Under steal, the opponent can take it in the usual way.
- **Bonuses that are not energy** (Fuel, Additional nodes, Node scramble
  under planet effects) are not changed. A player who is out of time cannot
  move, so they can only land on a bonus planet if a fight puts one of
  their ships there. Combat is not offered on the start screen.
- **The opponent is unaffected.** They go on playing and scoring normally.
  The game still ends when the rounds are up or when both clocks have run
  out, and energy still decides the winner. Running out of time is still
  not a loss.

`rules.md` §10 states the new rule. The other sections are corrected to
match it: §8.6, which says a passing player "still collects exactly as
they would otherwise", and §8.4, which describes collecting without this
exception.
This is a gameplay change, so the rules version goes from **0.44 to 0.45**,
with a changelog entry.

### The app

- **Energy stops.** A player's score no longer rises after their clock runs
  out.
- **The score pips show it.** Once a player is out of time, each node they
  hold shows as a **crossed** pip, the same one the Required option uses
  for a node that is held but not paying, and none of their pips light.
- **The option tip for the clock** gains a sentence saying that a player
  who runs out of time passes every remaining turn and collects no more
  energy.
- **`README.md`**, where it describes the clock, says the same.

## What does not change

- **When a clock runs out, and what happens to the turns.** A player who
  runs out still passes every remaining turn, and the game still ends when
  both have run out.
- **Passing for any other reason.** A player with time left who cannot
  move or attack still passes, and still collects, as they do today.
- **The clock choices and budgets.**

## Verification

- In a timed game, let one player's clock run out while they hold nodes.
  Their score stops rising and their pips show crossed. The opponent's
  score goes on rising as usual.
- Once both clocks have run out, the game ends. The winner is decided on
  the frozen totals.
- A player with time left who holds nodes scores exactly as before.
