# Story 00000083 — Combat off or on

## Summary

Combat (`rules.md` §7) has been part of every game since the rules began: a
ship may strike an enemy ship within its movement range, and both ships are
pushed back to planets. This story makes combat **a choice the players make
before play begins**, like the fleet size, the charged-node count, the number
of rounds and the clock already are: **off or on**. As with every other
choice, `rules.md` names no default — which one the app preselects is an app
matter (version 0.32) — and **the app preselects OFF**.

The start screen gains a fifth option group, **COMBAT**, sitting **after
Charged nodes and before Rounds**, offering **OFF** and **ON** with **OFF**
preselected — leftmost is what the app preselects, exactly as in the other
four groups.

With combat off, **no ship may attack**. Nothing else changes: the same
board, the same fleets, the same movement and power, the same nodes, the same
energy, the same ending. A game with combat off is the same game with one
kind of turn removed, not a different game.

Because the app preselects OFF, this story **changes the game a player gets
without touching anything**: the game that has always allowed attacks now
does not, unless a player asks for it. Combat is one click away.

## What changes

- **Combat is chosen before play**, off or on, and is **fixed for that
  game's lifetime**, exactly as the length in rounds and the charged-node
  count are.
- **Off is what the app preselects**, and the default everywhere in the code
  a default is reached for. `rules.md` states the choice and names no
  default, exactly as it does for the other four.
- **With combat off, no attack is legal, for either side, ever** — not out
  of range, not unaffordable, not blocked: simply not a thing this game
  offers. A player who activates an enemy ship is refused, and no square is
  ever shown as a target.
- **A turn with combat off is one move.** §5's other kind of turn is not
  available, and the pass rule is unaffected: a player who cannot move
  passes, exactly as a player who could neither move nor attack does today.
- **The start screen gains a fifth group**, `COMBAT`, between Charged nodes
  and Rounds.

## What does not change

- **Combat itself, when it is on.** §7 and §7.1 are untouched: the same
  range and pricing, the same protections for a ship on a planet or on a
  charged or depleted node, the same two ships returned to randomly drawn
  empty planets, the same absence of a winner.
- **Movement, power and recovery.** A ship moves the same shapes at the same
  prices, spends the same power, and recovers on planets at the §3.1 rate.
  **§7.2, returning to a planet by choice, is unaffected** — it is an
  ordinary move that happens to end on a planet, and belongs to §6 in
  everything but where it is written down. It stays available with combat
  off, and is the only way a ship reaches a planet then.
- **Nodes.** Every state, countdown, priority, sweep, refill, placement
  constraint and retirement is exactly as it is. §8.2's argument that at
  most one countdown can start per turn is unaffected: it rests on a turn
  being **one action**, which is as true of a game of moves alone.
- **Energy, scoring, the round counter, the clock, the game's ending.**
  None of them consult this choice.
- **The trap** (§8.5) and its relief (§8.6 step 7). A ship on a depleted
  node is still stuck until the node retires; a side whose ships are all
  trapped is still relieved. Neither ever depended on attacking.
- **Fleet size, charged nodes, rounds and clock**, their defaults and their
  order among themselves.
- **The Quick Guide.** It teaches the board, movement and nodes and never
  mentions combat, so it is correct at both settings and is not touched.
- **The off and on games use the same rules.** This is one game with a dial
  on it, not two variants.

## Effect on the game

Combat is the game's only way to remove an enemy ship from a square it has
reached, and the only reason to keep a power reserve for anything but
travelling. With it off, a node is contested purely by arriving first and by
outlasting — a holder cannot be driven off, only waited out — and a ship
parked in the way stays in the way. Power becomes a pure movement budget, and
planets become somewhere you choose to go rather than somewhere you are sent.

One of the game's three random elements also goes quiet: the planet a beaten
ship returns to (§7.1) is never drawn, so a game with combat off takes its
randomness from the opening board and the node refills alone. The seeded
stream is unaffected — a draw that never happens consumes nothing — but the
same seed will diverge between an off game and an on game the moment a fight
happens in the latter, exactly as it diverges between any two different
sequences of play.

Whether the game is better without the fights is what the option exists to
find out. Nothing else is retuned against it: not the power table, not the
countdown lengths, not the node economy, not the game lengths.

## In scope

### 1. The rules edit, first and on its own

`doc/ruleset/rules.md` goes from **0.33** to **0.34**, with a changelog
entry, in its own commit ahead of the code. This is a gameplay change — a
whole kind of turn becomes optional — so it would be a tag candidate;
tagging stays on hold (`CLAUDE.md`).

The document states attacking as a fact about every game in a dozen places.
Each becomes conditional on the choice, phrased the way §9 and §10 already
phrase a choice — named where the choice is defined, referred back to
elsewhere.

- **§7** is where the choice is defined, since it is the section the choice
  governs. It opens by stating it, in the shape §4 and §8.1 state theirs —
  **combat is off or on, the same for both players, chosen before play
  begins and fixed for the game's lifetime**, naming no default — and says
  that with it off **no attack is legal for either player** and the rest of
  §7 and §7.1 simply do not apply. The body of §7 then reads as it does
  today, as the description of an on game.
- **§7.2** is stated as unaffected, since it is a move and not an attack.
- **§2, the Turn entry** — a turn is one move, or one attack when combat is
  on.
- **§5** — the two kinds of turn become one kind plus the other when combat
  is on. The passing rule and its reasoning are re-stated so they hold at
  both settings: a player who cannot move passes, and with combat off that
  is the only way a turn can pass other than being out of time (§10). The
  paragraph's existing argument that the game can never deadlock must still
  read true with no attacks in it.
- **§1, the Overview** — the fights paragraph becomes conditional, and the
  list of three random elements says the third arises only when combat is
  on.
- **§9 and §10** — where they list what is chosen before play, combat joins
  the fleet size, the charged-node count, the rounds and the clock. §10's
  opening sentence is the natural place to say the full set.
- **The remaining "cannot be attacked" statements** (§3.1's planet bullet,
  §2's Trapped entry, §8.1, §8.5) are protections that are simply never
  tested with combat off. They stay as written unless a sentence claims
  attacking happens rather than describing what happens when it does; this
  is a check of each, not a rewrite of any.

### 2. The setting becomes part of the game

The choice must be **a property of the game state**, set once when the game
starts and read from there by everything that needs it — the same treatment
`lengthInRounds` and `chargedNodeCount` get, and for the same reason: it
cannot be derived from a board.

- The offered settings, the default (**off**) and a type guard live in
  `src/rules/combat.ts`, which is already §7's module, in the shape
  `clock.ts`, `fleet.ts` and `nodes.ts` use for their own options.
- The state carries a **boolean**, `combatEnabled`: every point of use asks
  a yes/no question, and the OFF/ON wording is start-screen chrome, held in
  a label record the way `CLOCK_SETTING_LABELS` holds `UNLIMITED`.
- `StartingGameStateOptions` gains the field, optional, defaulting to off,
  with **no runtime validation** — unlike `lengthInRounds`, `fleetSize` and
  `chargedNodeCount`, which are typed `number` and so admit values the game
  does not offer, a `boolean` admits only the two settings that exist, so
  there is nothing for a `RangeError` to catch. The type guard is still
  exported and unit-tested, unused for now in `isClockSetting`'s precedent,
  for the boundary a game record or a saved-options load will need.
- The `new-game` intent carries the choice, alongside the seed, the length,
  the fleet size and the charged-node count; the reducer uses what it is
  handed and reaches for no default of its own.
- `useAppScreen` holds it with the other four options, so a game returns to
  the start screen with the setting it was played with still chosen.

### 3. One place refuses the attack

`attackRefusalReason` is the single gate every attack already passes
through — `legalTargets` filters by it, `applyAttack` refuses by it, the
session rejects by it, the board marks targets from it, and
`canMoveOrAttack.ts` asks it on both its questions. **A new refusal reason,
`"combat-is-off"`, is added there and everything else follows for free.**

- The check sits **immediately after the game-over check** and ahead of
  everything else, so an ended game still refuses as `"game-over"` and every
  other activation in an off game refuses as `"combat-is-off"` rather than
  as an out-of-range or unaffordable square.
- `legalTargets` returns nothing with combat off, which is what empties the
  board's target marks, zeroes a selection's `targetCount`, and reduces
  `sideToMoveCanMoveOrAttack` and `shipCanMoveOrAttack` to their movement
  halves — including the §5 pass guard, which then passes a side that cannot
  move.
- `attackReach` is **not** touched: it is pure geometry with no opinion about
  the state it is handed, and it stays that way.
- No second gate is added anywhere. If a place turns out to need its own
  check, that is a finding worth a note in the plan — it means something
  reaches §7 without going through this function.

### 4. What the player sees

- **The start screen shows five groups** in the order **Ships, Charged
  nodes, Combat, Rounds, Clock**, the new one legended `Combat` (the
  stylesheet uppercases the legend) and offering **OFF** and **ON** with OFF
  checked at first — rendered by the same `OptionChoice` the other four use,
  with no new styling.
- **Activating an enemy ship in an off game is refused with a sentence**,
  added to `announcements.ts` alongside the other §7 refusals, in its plain
  player voice: combat is off in this game, so ships cannot attack. It is
  reachable — a player with a ship selected can click an enemy ship — so it
  is written, not left to a fallback.
- **No square is ever marked as a target** in an off game, and a selected
  ship's announcement reports its moves alone, which the existing wording
  already handles when there are no targets.
- **`README.md`** describes combat as a choice in the player's words: a game
  has no fighting unless you turn combat on, and with it on §7 works as the
  README already describes. Run `/update-readme` for the rest of the diff.

### 5. The tests

Adding a required field to `GameState` reaches every test that builds a state
literal — around two dozen files with their own local builders. That sweep is
mechanical: each builder sets the field, **on** where the file is about
fighting and **off** nowhere else matters, and the plan should do it in one
pass rather than file by file as failures appear.

The tests that need real thought:

- **`combat.test.ts`** — with combat off, `attackRefusalReason` gives
  `"combat-is-off"` for a target that would otherwise be perfectly legal,
  `"game-over"` still wins over it in an ended game, and `legalTargets` is
  empty for every ship. With combat on, every existing expectation stands
  unchanged.
- **`ply.test.ts`** — `applyAttack` refuses with `"combat-is-off"` and
  changes nothing: no ship moves, no power is spent, no seed advances, the
  ply does not end.
- **`canMoveOrAttack.test.ts`** — a ship with no legal move but an enemy in
  range can act with combat on and cannot with it off, on both the ship
  question and the side question.
- **`session.test.ts`** — activating an enemy square with a ship selected is
  rejected as `"combat-is-off"`, the selection survives the rejection exactly
  as it does for any other refusal, and a `selected` event reports
  `targetCount` 0.
- **`announcements.test.ts`** — the new sentence.
- **`Board.test.tsx`** — no square carries the `target` mark in an off game,
  and a ship that could only attack shows the `cannot-move-or-attack`
  condition.
- **`gameState.test.ts`** — the new field is set from the option, defaults
  to off, and is fixed for the game's lifetime. There is no invalid value to
  reject — see the option's shape above.
- **`StartScreen.test.tsx`** — the fifth group, its position among the
  other four, its two labels, its default, and that choosing ON calls the
  handler.
- **`useAppScreen.test.tsx`**, **`App.test.tsx`** — the option reaches
  `new-game`, the default is off, and a chosen ON produces a game whose
  ships can attack.
- **`fullGame.test.ts`**, **`seededReplay.test.ts`**, **`camping.test.ts`**,
  **`recovery.test.ts`** — whatever they exercise that involves a fight is
  run with combat **on**, explicitly, rather than relying on a default.
  `seededReplay.test.ts`'s recorded expectations are **unchanged**: the
  opening deal draws exactly what it drew before, because this story adds no
  step to the stream.

Per `CLAUDE.md`'s pre-release stance: **no plan steps for testing
accessibility**, and no review fixtures or manual test scripts. Existing
automated tests are updated where the path is straightforward. Anything
knowingly lost is recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Out of scope

- **Any mid-game change.** Combat is chosen before play and fixed, like every
  other option. There is no in-game toggle.
- **Showing the setting during a game.** The HUD gains nothing: no badge, no
  legend, no note in the game-over panel. A player who chose it knows.
- **Rewording "cannot move or attack".** The square label, the ship
  condition and the passed-turn announcement keep their current wording at
  both settings — each is still literally true in an off game — and this
  story does not open a pass over them.
- **A softer refusal.** Activating an enemy ship with combat off is a
  rejection with a sentence, not a silent no-op and not a move attempt.
- **Any other partial combat**: no "attacks cost more", no "attacks only in
  your own half", no disabling the return draw while keeping the fight.
  Combat is off or it is on.
- **Re-tuning anything against an off game**: power, the movement table, the
  countdown lengths, the node economy, the fleet sizes and the game lengths
  all keep their values.
- **The Quick Guide**, which never mentions combat.
- **Backwards compatibility** for games recorded under 0.33 (`CLAUDE.md`).

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.34**, and the changelog has
  one entry for it.
- No section of `rules.md` states attacking as something every game has;
  every mention refers to the choice made before play, and §7 says plainly
  what an off game means.
- The start screen shows five option groups in the order **Ships, Charged
  nodes, Combat, Rounds, Clock**, with **OFF** checked in the new group.
- In a game started with combat off: no enemy ship is ever marked as a
  target, activating one is refused with the new sentence, and a ship with no
  legal move shows the cannot-move-or-attack condition rather than being
  offered a fight.
- In a game started with combat off, a full game plays through to its last
  round with nothing but moves, and a side that cannot move passes.
- In a game started with combat on, every §7 behaviour is exactly as it is
  today: range, cost, path, the two protections, both ships returned to empty
  planets drawn at random.
- The choice survives a return to the start screen, and a second game starts
  from it.
- `seededReplay.test.ts` passes with its expectations **as recorded** — the
  opening deal is unchanged at both settings.
- `README.md` describes combat as a choice and no longer describes a game
  that always has it.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- The rules edit is one commit, ahead of the code, and there is **one**
  version bump on this branch however many later rules edits it turns out to
  need.
- Manual check worth making once it runs: the start screen with **five**
  option groups on a short landscape window — four already fill it, and this
  is the first story to add a fifth — and a whole off game played through to
  confirm it never deadlocks and never offers a fight.
