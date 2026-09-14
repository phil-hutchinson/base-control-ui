# Story 00000085 — Simple or bonus scoring

## Summary

Version 0.29 threw away section 8.4's payout table — one node paid 1, two
paid 3, three paid 6, four paid 10 — and replaced it with a flat rate: each
charged node you hold pays one energy. The flat rate makes a score mean
exactly what it says, and it has been the only scoring the game has since.

This story makes scoring **a choice the players make before play begins**,
like the fleet size, the charged-node count, combat, the number of rounds
and the clock already are: **SIMPLE or BONUS**. Simple is today's flat rate.
Bonus brings the old table back and extends it to the five-node board it
never saw — each node held pays one more than the node before it, so a turn
pays **1, 3, 6, 10 or 15**. As with every other choice, `rules.md` names no
default; the app preselects **SIMPLE**, so the game a player gets without
touching anything is the game they get today.

The start screen gains a sixth option group, **SCORING**, sitting **after
Charged nodes and before Combat**, with SIMPLE leftmost and checked —
leftmost is what the app preselects, exactly as in the other five.

Because a bonus turn's payout is no longer readable off the pip row — three
lit pips pay 6, not 3 — the HUD's pip row gains **a number under each pip**:
what a turn pays when that many nodes are held. Only the number matching the
count right now is drawn in the side's colour; the rest are grey, so a side
holding nothing has an entirely grey row. The numbers are drawn in both
scoring modes, where simple reads `1 2 3 4 5` and bonus reads `1 3 6 10 15`.

## What changes

- **Scoring is chosen before play**, simple or bonus, the same for both
  players, and **fixed for that game's lifetime**, exactly as the
  charged-node count and the combat setting are.
- **Simple is what the app preselects**, and the default everywhere in the
  code a default is reached for. `rules.md` states the choice and names no
  default, exactly as it does for the other five.
- **Under bonus, a turn's collection is the triangular total of the nodes
  held** — 1, 3, 6, 10, 15 — because each node held is worth one more than
  the one before it. It is the whole turn's payout, not a per-node rate:
  there is no meaningful "which node paid the 3".
- **The start screen gains a sixth group**, `Scoring`, between Charged nodes
  and Combat.
- **The HUD's pip row gains a row of numbers beneath it**, one per pip, in
  both modes.

## What does not change

- **Which nodes count, and when.** Charged only, standing on it only, at the
  end of your own turn only (section 8.4). Flying over a node still collects
  nothing, and a node held to the last turn of its countdown still pays on
  the turn it traps its holder.
- **Nothing subtracts energy.** A total only ever rises, at either setting.
- **The end-of-turn order.** Collection stays at step 2, before depletion at
  step 3. Only the amount step 2 hands over changes.
- **The collection is still one event.** A turn's whole payout is one
  `energy-collected` effect carrying one amount and the squares it came
  from — which is what already lets the board draw a single `+N` at the
  squares' centroid and the live region say it in one sentence. Neither has
  to learn anything about per-node shares, because under bonus there are
  none.
- **How many pips are drawn.** The row is still the smaller of the side's
  ship count and the board's charged-node count; the numbers simply follow
  it.
- **Nodes, movement, combat, power, planets, the trap and its relief,
  rounds and the clock.** None of them consult this choice.
- **Fleet size, charged nodes, combat, rounds and clock**, their defaults
  and their order among themselves.
- **The simple and bonus games use the same rules.** This is one game with a
  dial on it, not two variants.

## Effect on the game

Bonus scoring is the argument version 0.29 rejected, offered back as a
choice rather than as the only scoring there is. It makes spreading across
the board worth the risk: a fourth node is worth four turns of holding one,
so a lucky spread can outweigh a long stretch of solid play, and a score
stops being readable back as node-turns held — 10 energy is one turn of four
nodes or ten turns of one. Whether that makes the better game is exactly
what the option exists to find out; 0.29's reasoning stands as the argument
for why simple is what the app preselects.

Bonus also sharpens what leaving a node costs. Under simple, walking off one
of three nodes costs 1 that turn. Under bonus it costs 3 — the drop from 6
to 3 — so the choice section 8.3 puts to a holder, stay and be trapped or
leave and lose the node, is priced steeply against leaving, and a fight that
knocks a ship off a node takes more from its side than the node's own rate.

The five-node board never played the old table: it capped at four when the
table was written. Fifteen a turn is a number this game has not seen, and
a five-node, six-ship, bonus game is the loudest the scoreboard can get.

Nothing else is retuned against it: not the countdown lengths, not the node
economy, not the game lengths, not the clock. Game length is counted in
rounds and there is no target score, so nothing is sized against the numbers
this changes.

## In scope

### 1. The rules edit, first and on its own

`doc/ruleset/rules.md` goes from **0.34** to **0.35**, with a changelog
entry, in its own commit ahead of the code. This is a gameplay change — the
same board can now pay two different amounts — so it would be a tag
candidate; tagging stays on hold (`CLAUDE.md`).

- **Section 8.4 is where the choice is defined**, since it is the section
  the choice governs. It opens by stating it in the shape sections 8.1 and 7
  state theirs — **scoring is simple or bonus, the same for both players,
  chosen before play begins and fixed for the game's lifetime**, naming no
  default — and then gives the two rates. Simple: one energy for each
  charged node held, hold three collect three. Bonus: each node held is
  worth one more than the one before it, so a turn pays 1, 3, 6, 10 or 15.
  The paragraph saying the board's charged-node count is a fact about the
  board rather than a cap on collecting stays, and the "nothing subtracts
  energy" paragraph stays and holds at both settings.
- **Section 2's Node entry** — the Charged bullet says a ship standing on a
  charged node collects; it names no figure and needs checking, not
  rewriting.
- **Section 8.3** — "Leaving also forfeits that turn's energy from it, since
  energy counts the nodes a player is standing on when their turn ends"
  attributes a share of the collection to one node, which bonus has no way
  to do. It is restated so it holds at both settings: leaving drops that
  turn's collection to what the remaining nodes pay.
- **Section 8.6 step 2** already says "collects energy for the charged nodes
  they hold (section 8.4)" and quotes no figure; check, do not rewrite.
- **Section 1's overview** — "collecting energy for every turn they hold
  one" is true at both settings and needs checking only.
- **Section 10's opening sentence**, which lists what is chosen before play,
  adds scoring alongside the fleet size, the rounds, the charged-node count
  and combat. **Section 9** is checked for the same.

### 2. The setting becomes part of the game

The choice must be **a property of the game state**, set once when the game
starts and read from there by everything that needs it — the same treatment
`chargedNodeCount` and `combatEnabled` get, and for the same reason: it
cannot be derived from a board.

- The offered settings, the default and a type guard live in
  `src/rules/scoring.ts`, in the shape `clock.ts`, `combatSetting.ts`,
  `fleet.ts` and `nodes.ts` use for their own options: a
  `ScoringSetting` union of `"simple" | "bonus"`, a `SCORING_SETTINGS` array
  in start-screen order (simple first), `DEFAULT_SCORING` of `"simple"`, and
  `isScoringSetting`. The SIMPLE/BONUS wording is start-screen chrome and
  stays on the start screen.
- **The payout arithmetic lives in `src/rules/energy.ts`**, next to
  `chargedNodesHeldBy`, because that module is where section 8.4 lives.
  `energyForNodesHeld(nodesHeld, scoring)` returns the count under simple
  and the triangular total `n × (n + 1) / 2` under bonus. It is written as
  the formula, not as a lookup table: a table would need a bound to
  maintain, and the largest count the board can produce has already changed
  once. The name is deliberately the one 0.29 deleted — it is the same
  function coming back, generalised.
- `GameState` gains `scoring: ScoringSetting`.
  `StartingGameStateOptions` gains it as an optional field defaulting to
  simple, **validated** with a `RangeError` naming the offered settings, the
  way `fleetSize` and `chargedNodeCount` are: unlike `combatEnabled`'s
  boolean, a setting arriving from outside the type system can be any
  string. This gives `isScoringSetting` a real caller from the start, unlike
  `isClockSetting` and `isCombatSetting`.
- The `new-game` intent carries the choice, alongside the seed, the length,
  the fleet size, the charged-node count and the combat setting; the reducer
  uses what it is handed and reaches for no default of its own.
- `useAppScreen` holds it with the other five options, so a game returns to
  the start screen with the setting it was played with still chosen.

### 3. One place prices the turn

`endOfTurn.ts` step 2 currently awards `heldSquares.length` directly. It
becomes `energyForNodesHeld(heldSquares.length, state.scoring)`, and that is
**the only place in the app that prices a collection**. The `amount > 0`
guard stays: a zero payout is still not an event, and both settings pay zero
for zero nodes.

Nothing downstream is touched. The effect still carries an amount and the
squares it came from, so `EnergyOverlay`'s single `+N` at the centroid and
`announcements.ts`'s "collected N energy from 3 nodes at …" are both already
correct under bonus — each keeps amount and node count separate, which is
exactly the distinction bonus introduces.

If a second place turns out to need the pricing, that is a finding worth a
note in the plan: it means something computes a payout without going through
section 8.4.

### 4. What the player sees

- **The start screen shows six groups** in the order **Ships, Charged nodes,
  Scoring, Combat, Rounds, Clock**, the new one legended `Scoring` (the
  stylesheet uppercases the legend) and offering **SIMPLE** and **BONUS**
  with SIMPLE checked at first — rendered by the same `OptionChoice` the
  other five use, with no new styling.
- **The option group legends are centred.** Everything else on the start
  screen is centred and the legends are not, which is the cleanup this story
  carries. A `<legend>` is laid out specially inside its `<fieldset>` — it is
  not an ordinary flex item, so `.start-screen__options`'s `align-items:
center` does not reach it — and the plan should confirm in the running app
  what actually moves it before writing the rule. Whatever it turns out to
  be, it belongs in `.start-screen__legend` or `.start-screen__options`, and
  it is one rule in one stylesheet, not a pass over the screen's layout.
- **The pip row gains a number under each pip**, in `ScoreDisplay`:
  - The number under pip `k` is what a turn pays when `k` nodes are held —
    `energyForNodesHeld(k, state.scoring)` — so it reads `1 2 3 4 5` under
    simple and `1 3 6 10 15` under bonus, truncated to however many pips the
    row draws.
  - **Exactly one number is in the side's colour**: the one at the count
    held right now. Every other number is grey, and a side holding no
    charged nodes shows an entirely grey row. This is deliberately not the
    lit-pip treatment repeated a second time — the pips say how many, the
    coloured number says what that is worth this turn.
  - The numbers are **decorative** (`aria-hidden`), like the pips and the
    digits, and are drawn in both scoring modes so the cell's height is the
    same in every game.
  - Each number sits **directly under its pip** at every fleet size,
    charged-node count and orientation. Pips are currently a flex row with
    an `em` gap that landscape re-sizes through the row's font-size; the
    numbers must share those columns rather than be laid out separately, so
    a two-digit `15` and a one-digit `1` stay aligned with their pips.
- **`App.css`'s `--region-extent` derivation must be redone.** Its comment
  itemises the score cell as "name + digits + one 0.6rem pip row + two
  0.25rem internal gaps", and that cell is the taller of the two things `P`
  is sized from. A number row and a third gap are added to the sum, the
  comment's arithmetic is corrected to match, and the `clamp()` is moved to
  track the new range. This is the story's one real layout risk: `P` is
  subtracted from the board twice over, so it is re-derived, not padded.
- **The Quick Guide's intro paragraph** says "gain one point for each
  spaceship you have in a charged node", which is only true under simple. It
  becomes the choice, in the guide's plain voice and its own vocabulary
  (points, not energy) — one short sentence, not an explanation of the
  option. The **NODE LIFECYCLE** paragraph's "gains 6 points if it stays on
  the node until it becomes depleted" quotes a figure that only holds under
  simple and only while nothing else is held; it is restated without the
  figure. **The guide's scoring diagram is corrected too**: it draws a `+3`
  note beside three held nodes, which is the simple rate, and a picture
  contradicting the paragraph above it is not residue worth keeping. What it
  should show instead is the owner's call, taken when the work reaches it. The
  guide's other four diagrams are untouched.
- **`README.md`** describes scoring as a choice in the player's words: the
  rules-summary sentence currently states the flat rate as the only rate.
  Run `/update-readme` for the rest of the diff.

### 5. The tests

Adding a required field to `GameState` reaches every test that builds a
state literal — around two dozen files with their own local builders, the
same sweep story 83 did for `combatEnabled`. It is mechanical: each builder
sets `scoring`, **simple** everywhere except the files that are about the
payout, and the plan should do it in one pass rather than file by file as
failures appear.

The tests that need real thought:

- **`scoring.test.ts`** — the offered settings, their order, the default,
  and the guard over them.
- **`energy.test.ts`** — `energyForNodesHeld` at both settings: simple
  returns its argument; bonus returns 1, 3, 6, 10, 15 for one through five;
  both return 0 for zero. The `chargedNodesHeldBy` tests are unchanged —
  which nodes count is not what this story touches.
- **`endOfTurn.test.ts`** — a turn holding three nodes settles 3 under
  simple and 6 under bonus, with the same squares on the effect either way;
  a turn holding none is still not an event at either setting.
- **`gameState.test.ts`** — the field is set from the option, defaults to
  simple, is fixed for the game's lifetime, and an off-list value throws a
  `RangeError`.
- **`session.test.ts`**, **`useAppScreen.test.tsx`**, **`App.test.tsx`** —
  the option reaches `new-game`, the default is simple, and a chosen bonus
  produces a game whose turns pay the bonus rate.
- **`StartScreen.test.tsx`** — the sixth group, its position among the other
  five, its two labels, its default, and that choosing BONUS calls the
  handler.
- **`ScoreDisplay.test.tsx`** — the numbers read `1 2 3 4 5` under simple and
  `1 3 6 10 15` under bonus; the row is truncated with the pips at a smaller
  fleet size or charged-node count; exactly one number carries the current
  mark at a non-zero count, it is the one at the count held, and none does at
  zero.
- **`fullGame.test.ts`** — a whole game at bonus ends with a total no
  smaller than the same game at simple, and both sides' totals only ever
  rise.
- **`guideCopy.test.ts`** — the corrected intro and NODE LIFECYCLE wording.
- **`seededReplay.test.ts`** — expectations **unchanged**. This story adds
  no step to the seeded stream: scoring is arithmetic over a board that was
  dealt the same way, so the same seed deals the same board at both
  settings, and a recorded game diverges only in its totals.

Per `CLAUDE.md`'s pre-release stance: **no plan steps for testing
accessibility**, and no review fixtures or manual test scripts. Existing
automated tests are updated where the path is straightforward.

**One thing is knowingly given up** and goes in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`: the score
cell's hidden sentence stays "Green: 24 energy, 3 nodes held.", which under
bonus no longer tells a screen-reader user what the turn pays — the count is
spoken but the rate the new numbers carry is not. The sentence remains
accurate; it is simply no longer the whole of what the cell shows.

## Out of scope

- **Any mid-game change.** Scoring is chosen before play and fixed, like
  every other option. There is no in-game toggle.
- **Showing the setting during a game**, beyond the numbers under the pips:
  no badge, no legend, no note in the game-over panel. The numbers are the
  whole of what the HUD says about it.
- **Any third scoring mode**, or a per-node bonus that depends on which node
  or how long it has been held. Simple or bonus, and nothing is built to
  make a third easy later.
- **Changing what the pips mean or how many are drawn.** The row is still
  the smaller of the ship count and the charged-node count, still lit by the
  nodes held, and is not re-scaled, re-spaced or re-coloured beyond making
  room for the numbers beneath it.
- **Restyling the start screen.** The legends are centred; nothing else
  about the screen's spacing, sizing or order is opened.
- **Re-tuning anything against bonus**: the countdown lengths, the node
  economy, the fleet sizes, the game lengths and the clock all keep their
  values.
- **Backwards compatibility** for games recorded under 0.34 (`CLAUDE.md`).

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.35**, and the changelog has
  one entry for it.
- No section of `rules.md` states one energy per node as the only rate;
  section 8.4 states the choice and both rates, and no section attributes a
  share of a turn's collection to an individual node.
- The start screen shows six option groups in the order **Ships, Charged
  nodes, Scoring, Combat, Rounds, Clock**, with **SIMPLE** checked in the
  new group, and every group's title is centred over its choices.
- In a game started with SIMPLE, a side holding three charged nodes collects
  **3** at the end of its turn, the board draws `+3`, and the numbers under
  the pips read `1 2 3 4 5` with the `3` in the side's colour.
- In a game started with BONUS, the same side collects **6**, the board
  draws `+6`, and the numbers read `1 3 6 10 15` with the `6` in the side's
  colour.
- A side holding no charged nodes collects nothing, no `+N` is drawn, and
  every number under its pips is grey.
- The numbers stay aligned under their pips at three ships and at six, at
  three charged nodes and at five, in both orientations.
- The board is not visibly smaller than it is today, and the HUD does not
  clip or reflow, at the window sizes the info column is sized for.
- The choice survives a return to the start screen, and a second game starts
  from it.
- `seededReplay.test.ts` passes with its expectations **as recorded** — the
  opening deal is unchanged at both settings.
- The Quick Guide no longer states a points rate that only holds under
  simple, and `README.md` describes scoring as a choice.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- The rules edit is one commit, ahead of the code, and there is **one**
  version bump on this branch however many later rules edits it turns out to
  need.
- Manual checks worth making once it runs: the start screen with **six**
  option groups on a short landscape window — five already fill it — and a
  five-node, six-ship bonus game, to see both whether the tall score cell
  costs the board too much and whether 15 a turn plays as wild as it reads.
