# Story 00000097 — Planet bonuses

## Summary

A planet is where a ship goes to recover. That is the whole of what a planet
does today: stand on one at the end of your turn and the ship gains a point
of power, or two if it is the only one charging. All twelve are alike, none
is worth more than any other, and a player choosing where to send a tired
ship picks whichever is nearest.

This story gives three of the twelve, for each player, something else: a
**one-time payment**, made the first time one of that player's ships lands
there. The three are dealt at random when the game starts, and the two
players' sets are drawn independently, so a planet may belong to one player,
to both, or to neither.

Like every other dial on this game, it is **a choice made before play
begins** — **OFF**, **2 POINTS** or **3 POINTS** — the same for both players
and fixed for that game's lifetime. The app preselects OFF, so the game a
player gets without touching anything is the game they get today.

The payment is made **immediately**, the instant the ship arrives, not at
the end of the turn with the node collection. A player who lands on one of
their bonus planets watches their score climb in the middle of their own
turn.

Both players' sets are **visible to both players**, in a new panel above the
clocks: three planet drawings a side, each showing whether it has been
claimed. When one is claimed, a player-coloured **+2** or **+3** fades in
over its drawing and stays there for one ply — so green's claim is on screen
through red's reply — and then settles into a player-coloured checkmark for
the rest of the game.

## What changes

- **Each player is dealt three bonus planets** at the start of a game,
  drawn at random from the twelve, three distinct planets a side. The two
  sets are drawn independently and may overlap in any number from none to
  all three.
- **A planet bonus pays once, per player, per planet.** The first time one
  of that player's ships lands on one of that player's three, the player is
  paid. That planet never pays that player again, however many times their
  ships come back to it.
- **The two players' claims on a shared planet are independent.** If a
  planet is in both sets, both players can claim it, in either order, and
  neither claim takes anything from the other. There is nothing to race for
  and nothing to deny.
- **Landing is landing, however the ship got there** — a move that ends on
  the planet, including a deliberate return (section 7.2), and a ship pushed
  back to a planet by a fight (section 7.1), whether it was the attacker or
  the ship attacked. Flying over is not landing, and a bonus is never
  claimed by a ship that is merely near.
- **The payment is immediate**, made as part of the landing, before anything
  else in the turn happens. It is not part of the end-of-turn order.
- **The amount is the chosen one**, 2 or 3, the same for both players and
  every planet.
- **The start screen gains an eighth option group, `Planet bonus`**, sitting
  after **Scoring** and before **Inactive node rotation**, with OFF leftmost
  and checked.
- **The clock region gains a panel above the clocks**, showing both sides'
  three planets and what has been claimed — and showing nothing at all when
  the setting is OFF.

## What does not change

- **What a planet does otherwise.** Power recovery at the section 3.1 rate,
  the protection from attack, the fact that planets are not owned and either
  player's ships may use any of them: all unchanged, on a bonus planet as on
  any other. A bonus planet is an ordinary planet that also pays once.
- **Which squares are planets.** Still the twelve of section 3.1, still
  symmetric under a half-turn.
- **The rotation settings.** Under the **planet** setting a landing rotates
  the priorities, and it still does — exactly once, whether or not a bonus
  was claimed by that landing. A claim is not a rotation trigger, and it
  never suppresses one.
- **The end-of-turn order.** All seven steps, in the same order, doing the
  same things. A bonus is paid mid-turn and has nothing to add here.
- **Node collection.** Which nodes count, when they count and what they pay,
  at simple or at bonus scoring. The two kinds of payment do not interact,
  and nothing about scoring's own setting changes what a planet bonus pays.
- **Nothing subtracts energy.** A total still only ever rises.
- **Where a node can appear.** A bonus planet is a planet, and section 3.2's
  planet and planet-adjacency constraints already hold for it.
- **Combat.** What may attack what, what a fight costs, and where the two
  ships land. A fight can now pay one or both players, but it is the same
  fight.
- **The board.** No marker, no tint, no badge: a bonus planet is drawn
  exactly like any other planet. The panel is the only place a player reads
  this.
- **The other seven options**, their defaults, and their order among
  themselves.

## Effect on the game

Today a tired ship goes to the nearest planet, and that is the end of the
decision. With bonuses on, three of the twelve are worth a detour, and a
player is repeatedly weighing a longer flight against the points at the end
of it — most sharply in the opening, when ships are low on power anyway and
a bonus planet doubles as the refuelling stop they were going to make.

**Three planets at 3 points is 9 energy**, which is a large number in this
game: a side holding one node collects 1 a turn under simple scoring, so a
full sweep of bonuses is worth nine turns of solid play. At 2 points it is
6. Both are big enough to decide a close game, which is the point of the
option — whether that is a good thing to have decide a game is exactly what
turning it on is for.

The deal is random and **not symmetric**: one player's three may sit deep in
their own half while the other's are scattered across the enemy's. That is a
real imbalance, deliberately accepted, in a game that is already not a pure
contest of skill — which site charges next and which bay a beaten ship is
pushed back to are both random already.

Combat gets a strange new outcome. A fight pushes both ships to random
planets, and either of those landings may now pay. A player can be paid for
losing position, and an attacker can pay their opponent by attacking them.
Nobody can aim it — the planet is drawn at random — so it is luck landing on
a fight rather than a reason to fight or not to fight.

Nothing else is retuned against it. The countdowns, the node economy, the
game lengths and the clock all stand as they are; there is no target score
for the extra energy to arrive at sooner.

## In scope

### 1. The rules edit, first and on its own

`doc/ruleset/rules.md` goes from **0.37** to **0.38**, with a changelog
entry, in its own commit ahead of the code. This is a gameplay change — a
new way to earn energy — so it would be a tag candidate; tagging stays on
hold (`CLAUDE.md`).

- **A new section 3.4, `Planet bonuses`**, after 3.3 Rotators, is where the
  rule is defined. Placing it there rather than inside 3.1 keeps 3.1's
  existing text — which is about what every planet does — intact, and
  renumbers nothing. It states, in the shape sections 8.1 and 10 state
  theirs: the choice is off, 2 or 3 points, the same for both players,
  chosen before play begins and fixed for the game's lifetime, and **names
  no default**. Then: each player is dealt three planets at random from the
  twelve, three distinct planets a side, the two sets drawn independently so
  they may overlap; a player is paid the chosen amount the first time one of
  their ships lands on one of their three; each planet pays each player at
  most once; a shared planet pays both players independently, in either
  order; landing includes a ship returned to a planet by a fight (section
  7.1) and a deliberate return (section 7.2); the payment is made the
  instant the ship arrives, not at the end of the turn; and both sets are
  known to both players from the start.
- **Section 3.1** gains one sentence pointing at 3.4, and is otherwise
  untouched — in particular "Planets are not owned" stays exactly as it is,
  because it is still true: a bonus is a payment to one player, not a claim
  on a square.
- **Section 8.4** gains a sentence saying energy also comes from planet
  bonuses (section 3.4), so no reader takes node collection to be the only
  source. The "nothing subtracts energy" paragraph stays and still holds.
- **Section 8.6** is checked and gains a sentence saying a planet bonus is
  paid when the ship lands and takes no step in this order.
- **Section 7.1** gains a sentence: a ship placed there may claim a bonus on
  arrival, for its own side.
- **Section 2's `Planet` entry** is checked and points at 3.4.
- **Section 10's opening sentence** and **section 9** list what is chosen
  before play; both add the planet bonus alongside the other seven.
- **Section 1's overview** is checked: "collecting energy for every turn
  they hold one" is no longer the only way energy arrives.

### 2. The setting and the deal become part of the game

- A leaf option module `src/rules/planetBonus.ts`, in the shape
  `scoring.ts`, `nodeRotation.ts`, `clock.ts` and `combatSetting.ts`
  already use: a `PlanetBonusSetting` union of `"off" | "two" | "three"`, a
  `PLANET_BONUS_SETTINGS` array in start-screen order (off first),
  `DEFAULT_PLANET_BONUS` of `"off"`, `isPlanetBonusSetting`, and a
  `planetBonusPoints(setting)` returning 0, 2 or 3. The OFF / 2 POINTS / 3
  POINTS wording is start-screen chrome and stays on the start screen.
- **`GameState` carries the setting and the deal.** The setting because it
  cannot be derived from a board, exactly as `scoring` and `combatEnabled`
  cannot; the deal because it is drawn once and consulted for the rest of
  the game. Each side's entry holds its three squares and, for each, the
  **ply it was claimed on** — not a boolean — because the panel's one-ply
  window is then a pure function of the state, and a game replayed from its
  seed shows the same thing at the same moment. Both sides' lists are empty
  when the setting is off.
- **The deal happens in `startingGameState`, last**, after the opening board
  and the rotator draw, and **only when the setting is on**, so an OFF game
  consumes exactly the randomness it consumes today and its opening position
  is bit-for-bit what it is now. Green's three are drawn, then red's, from
  the game's own seeded stream, so a recorded game deals identically.

### 3. One place pays the bonus

- The claim belongs in `src/rules/ply.ts`, at the two points a ship arrives
  on a square: the end of a move, and each of the two placements a fight
  makes (`src/rules/combat.ts` feeding `ply.ts`). One shared helper decides
  it, so the two roads cannot drift: given a state, a side and the square a
  ship has just landed on, it either pays or does nothing.
- Paying means two things at once: the side's energy rises by the chosen
  amount, and that planet's entry records the current ply number.
- A new **`planet-bonus-claimed` effect** — side, square, amount — is raised
  at the landing, a member of both `MoveEffect` and `AttackEffect`, sitting
  with the other effects the landing raises. A fight raises the attacker's
  before the defender's, matching the placement order section 7.1 fixes.
- Nothing in `endOfTurn.ts` changes.

### 4. What the player sees

- **The start screen's eighth group, `Planet bonus`**, after Scoring and
  before Inactive node rotation, labelled OFF / 2 POINTS / 3 POINTS, OFF
  checked. It rides the same plumbing as the other seven: held in
  `useAppScreen`, passed through PLAY into `startingGameState`, and still
  set when a finished game returns to the start screen.
- **The panel sits in the clock region, above the clocks** — the right-hand
  column in landscape, the bottom band in portrait. Green's row above red's,
  matching the clocks' own order. Each row is that side's three planets in
  board order, drawn with **the same artwork the board draws on those
  squares**, from the arrangement `planetPlacement.ts` already deals from
  the opening seed, so a player matches the panel to the board by sight.
  **The drawing alone identifies a planet** — no square name, no label:
  nothing else in the app names an individual planet, and this story is not
  the place to start.
- **The badge over each drawing has three states.** Unclaimed: nothing at
  all. Just claimed: a player-coloured `+2` or `+3` fading in, from the
  instant of the landing through to the end of the **next** ply — so a claim
  green makes on its own turn is on screen for the whole of red's reply.
  From then on: a player-coloured checkmark, for the rest of the game. **The
  drawing stays put in all three** — the badge changes, the planet does not
  go anywhere.
- **With the setting OFF the panel is not rendered at all.** No empty row,
  no greyed placeholder, no reserved space, and the clock region is laid out
  exactly as it is today.
- **The board is not allowed to get smaller.** The clock region is held to
  `--region-extent` and mirrors the info region, which is what keeps the
  board centred and sized; the panel fits inside that extent alongside the
  clocks, and does not push the region wider or taller.
- **`PlanetDefs` moves up to `App`**, mounted once beside `ShipDefs`, so the
  panel and the board reference one sprite. `Board` and `GuideScreen` drop
  their own mounts.
- **The live region gets a sentence** for a claim, in `announcements.ts`,
  in the players' vocabulary — the panel itself is decorative and hidden
  from the accessibility tree, exactly as the clocks are.
- **The quick guide and `README.md`** gain the option: the guide's planet
  copy notes that planets may carry a one-time bonus when the option is on,
  and the README's list of pre-play choices gains it alongside the other
  seven.

### 5. The tests

- `RULES_VERSION` agrees with `rules.md`, as `rulesVersion.test.ts` already
  asserts.
- `planetBonus.ts`'s settings, default, guard and points.
- The deal: three distinct planets a side; both sides dealt; the same seed
  deals the same six; different seeds generally deal differently; nothing
  dealt when off; and `seededReplay.test.ts` passing **with its
  expectations as recorded**, because an OFF game's deal is untouched.
- The claim: paid on a move that ends on one of the side's planets; not paid
  for the other side's planet; not paid twice for the same planet; paid for
  a shared planet to each side independently, in either order; paid on a
  fight's placement for the attacker and for the ship attacked; not paid
  when the setting is off; the energy total rising at the landing rather
  than at the end of the turn; and the `planet-bonus-claimed` effect
  carrying the right side, square and amount, in placement order for a
  fight.
- The panel: absent when off; both rows present when on; the badge
  unclaimed, then `+N` on the claiming ply and the ply after it, then the
  checkmark; and a claim by each side drawn in that side's colour.
- The start screen: eight groups in the stated order, OFF checked, and the
  choice reaching `startingGameState`.
- The announcement's wording.

## Out of scope

- **Any marking on the board.** Bonus planets are drawn exactly like the
  other nine.
- **Naming a planet.** Not in the panel, not in the accessible grid, not in
  the announcement beyond the square it already names.
- **A `+N` drawn on the board** at the planet square, the way
  `EnergyOverlay` draws a collection. The panel is this story's whole
  visualisation.
- **Any other kind of planet bonus** — recurring payments, power bonuses,
  planets that pay the first player to reach them and nobody after.
- **Balancing the deal.** No constraint that a player's three sit in their
  own half, or one in each third of the board, or anywhere in particular.
  Three at random from twelve, and the asymmetry that follows is the
  asymmetry the option has.
- **Retuning anything else against the extra energy.** Node rates, node
  lifetimes, game lengths and the clock all stand.

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.38**, and the changelog has
  one entry for it.
- The start screen shows **eight** option groups in the order Ships, Charged
  nodes, Scoring, Planet bonus, Inactive node rotation, Combat, Rounds,
  Clock, with **OFF** checked in the new group.
- With OFF, the game screen is pixel-identical to today's: no panel, the
  clocks where they were, the board the same size.
- With 3 POINTS, the panel shows three planets a side above the clocks, and
  every drawing in it is the drawing the board carries on that square.
- Moving a ship onto one of green's bonus planets adds **3** to green's
  score immediately, mid-turn, and fades a green `+3` in over that planet in
  the panel.
- That `+3` is still on screen through red's whole reply, and is a green
  checkmark by the time green moves again.
- Landing on the same planet again pays nothing and changes nothing in the
  panel.
- A planet in both sides' rows pays each side once, independently.
- With combat on, a fight that pushes a ship onto one of its owner's bonus
  planets pays that owner at the moment of the fight.
- The board is no smaller than it is today with the panel on screen, in
  portrait and in landscape.
- The choice survives a return to the start screen, and a second game starts
  from it.
- `seededReplay.test.ts` passes with its expectations as recorded.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary).
- The rules edit is one commit, ahead of the code, and there is **one**
  version bump on this branch however many later rules edits it turns out to
  need.
- Manual checks worth making once it runs: eight option groups on a short
  landscape window, and a 3-point game to see whether 9 energy of bonuses
  swamps the nodes or sits alongside them.
