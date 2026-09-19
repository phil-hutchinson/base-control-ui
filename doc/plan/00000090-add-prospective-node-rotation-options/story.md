# Story 00000090 — How the waiting nodes rotate

## Summary

The three inactive nodes carry priorities 1, 2 and 3, and the one holding 3
is the one that charges next (section 8.2). Those priorities **rotate at the
end of every turn on which nothing charged** — 1 becomes 2, 2 becomes 3, 3
becomes 1 — and they have done since the queue was introduced. Rotation is
therefore free, automatic, and entirely outside either player's control: a
player who does not like what is about to charge waits a turn and the answer
changes by itself.

This story makes rotation **a choice the players make before play begins**,
like the fleet size, the charged-node count, scoring, combat, the number of
rounds and the clock already are — and, in two of its three settings, makes
rotation something a player **does** rather than something the clock does for
them:

- **CONTINUOUS** — today's rule, unchanged: the priorities rotate at the end
  of every turn on which nothing charged.
- **PLANET** — the priorities never rotate by themselves. They rotate one
  step each time a ship **lands on a planet**.
- **DEDICATED** — the priorities never rotate by themselves. They rotate one
  step each time a ship lands on a **rotator**: a new piece of temporary
  board furniture, six of them at a time, each **consumed** by the ship that
  uses it.

As with every other choice, `rules.md` names no default; the app preselects
**CONTINUOUS**, so the game a player gets without touching anything is the
game they get today.

The start screen gains a seventh option group, **Inactive node rotation**,
sitting **after Scoring and before Combat**, with CONTINUOUS leftmost and
checked.

Under PLANET and DEDICATED, a rotation a player triggers happens **the moment
the ship lands**, in the middle of that player's turn — so it is already done
by the time the end-of-turn sequence decides what charges. A player who walks
a ship off a charged node and onto a planet has, in the same turn, created
the shortfall and chosen which node fills it: the node that showed **two**
rings while they were moving is the node that charges.

## What changes

- **Node rotation is chosen before play**, continuous, planet or dedicated,
  the same for both players, and **fixed for that game's lifetime**, exactly
  as the charged-node count, scoring and combat are.
- **Continuous is what the app preselects**, and the default everywhere in
  the code a default is reached for. `rules.md` states the choice and names
  no default, exactly as it does for the other six.
- **Under PLANET and DEDICATED, section 8.6 step 5 no longer rotates
  anything.** A turn on which nothing charged leaves the three priorities
  exactly as they were. Rotation has one cause and one only: a ship landing.
- **A rotation happens as the landing resolves**, not at the end of the turn
  — the second knowing exception to "a node's state changes only in the
  end-of-turn sequence", alongside a charged node depleting the instant its
  holder leaves it (section 8.3). It is what puts the rotation **before**
  step 4's charge rather than after it.
- **Two landings in one turn rotate twice.** Under PLANET with combat on, a
  fight returns **both** ships to planets (section 7), so an attack rotates
  the priorities two steps: the node that showed **one** ring is the one that
  charges if the board needs a node that turn.
- **The board gains rotators** under DEDICATED: six squares, one per 5 × 5
  section — the four corner sections always, plus two more drawn from the
  remaining five — redrawn from scratch every time the queue is refilled,
  and each one consumed by the ship that lands on it.
- **The start screen gains a seventh group**, `Inactive node rotation`,
  between Scoring and Combat.

## What does not change

- **What the priorities mean, and what they look like.** One, two and three
  rings; the three-ring node charges next; the trio is swept and redrawn
  whenever anything charges. Only what makes the rings move changes.
- **The direction of a rotation.** One step, always the same way: 1 → 2,
  2 → 3, 3 → 1. There is no reverse rotation and no jump.
- **The rest of section 8.6's order.** Charging is still step 4 and the
  refill still step 5; nothing is inserted between them. A rotation a player
  triggered has already happened by the time step 1 runs.
- **What charges, and how many.** The shortfall against the chosen
  charged-node count is still filled highest-priority-first, with no draw and
  no weighting. This story changes which node is holding which priority when
  that happens, never the procedure itself.
- **Where a node may appear** (section 3.2): the six constraints, the pool
  that widens once, the weighting, the fallback. A rotator is not a node and
  does not enter that calculation at all.
- **What a planet does.** Power at the end of the turn, no attacking in
  either direction, ships not owning it. Landing on a planet under PLANET
  rotates the queue **in addition to** all of that, and takes nothing away
  from it.
- **Movement, combat, power, scoring, the trap and its relief, rounds and the
  clock.** None of them consult this choice. A rotator square is an ordinary
  square to move to, to move through, and to stand on.
- **Fleet size, charged nodes, scoring, combat, rounds and clock**, their
  defaults and their order among themselves.
- **The three settings are the same game.** One dial, not three variants.

## Effect on the game

Today the queue rotates on its own, which means a player never has to think
about it: the thing they want charged comes round on a timetable nobody
controls. PLANET and DEDICATED take the timetable away. The priorities sit
still, so the node showing three rings goes on being the node that charges
next for as long as neither player does anything about it — and a player who
wants a different one has to spend a turn landing somewhere specific to get
it. Rotation stops being weather and becomes a move.

Under **PLANET** that cost is paid in a currency the game already charges in.
A planet is where ships go to refuel, and it is not usually where the nodes
are. A turn spent flying to a planet is a turn not spent racing for a node,
so a player who wants the rings to move has to want it enough to give up the
tempo — and a player refuelling anyway now moves the rings as a side effect,
whether or not that suits them. That last part cuts both ways, and is the
most interesting thing about this setting: the opponent's refuelling is now
part of your plan, because it changes what charges next.

With **combat** on, PLANET goes further still. A fight ends with both ships
on planets, so an attack rotates twice and skips a node past the front of the
queue. Attacking is already the way to knock a ship off its line; under this
setting it is also the way to redraw what the board is about to offer, which
gives the attack a second reason to exist on a board where nobody is in
immediate danger.

**DEDICATED** separates the two ideas. Refuelling stops moving the rings, and
the board instead carries six squares whose only purpose is to move them.
They are spread one to a 5 × 5 section — always the four corner sections,
plus two more — so there is nearly always one somewhere near,
but each is spent once and the set only comes back when something charges —
so a stretch of play with no charges is a stretch in which the rotators run
down and rotation gets harder to buy. That is the setting's whole character:
rotation is a limited resource on the board, visible to both players, and
either player may take any of them.

The clarification about ordering — the rotation lands **before** the charge —
is what makes any of this playable. If the rotation happened after the
charge, a player triggering one would be choosing what charges on their
opponent's next turn rather than on this one, which is a much weaker and much
harder-to-read thing to be choosing.

Nothing is retuned against these settings: not the countdown lengths, not the
node economy, not the game lengths, not the clock. Whether a board whose
priorities can sit still for ten turns plays better than one that shuffles
every turn is exactly what the option exists to find out.

## In scope

### 1. The rules edit, first and on its own

`doc/ruleset/rules.md` goes from **0.35** to **0.36**, with a changelog
entry, in its own commit ahead of the code. This is a gameplay change — the
same board charges a different node — so it would be a tag candidate;
tagging stays on hold (`CLAUDE.md`).

- **Section 8.2 is where the choice is defined**, since it is the section
  that owns rotation. The paragraph beginning "Priorities rotate at the end
  of every turn on which nothing charged" is replaced by the choice, stated
  in the shape sections 8.1, 8.4 and 7 state theirs — **how the priorities
  rotate is chosen before play begins, the same for both players and fixed
  for the game's lifetime**, naming no default — followed by the three
  settings:
  - **Continuous**: the priorities rotate at the end of every turn on which
    nothing charged, 1 → 2, 2 → 3, 3 → 1.
  - **Planet**: the priorities do not rotate at the end of a turn at all.
    They rotate one step, in the same direction, each time a ship lands on a
    planet — the moment it lands, in the middle of that player's turn.
    Leaving a planet does nothing; standing on one does nothing; flying over
    one does nothing.
  - **Dedicated**: the same, except that the trigger is a **rotator**
    (section 3.3) rather than a planet, and the rotator is spent by the
    landing.
  - **Timing, stated once and explicitly**: a rotation triggered by a landing
    is complete before the end-of-turn sequence begins, so section 8.6 step
    4 charges from the priorities **as the rotation left them**. Two landings
    in one turn rotate two steps. The sentence a player needs is the one
    about rings: the node showing two rings during a turn with one landing is
    the node that charges at the end of it, and the node showing one ring is
    the one that charges when there were two landings — or the second of two
    nodes charging after one landing.
  - The existing sentence "A freshly refilled trio is never rotated in the
    same turn it was dealt" is **kept and checked**: under all three settings
    a refill is the last thing that touches the queue in a turn, so it still
    holds without qualification.
- **A new section 3.3, "Rotators"**, sits after 3.2, since a rotator is a
  fact about the board and section 3 is where the board's furniture is
  described. It states: rotators exist only under the dedicated setting; the
  board is divided into nine 5 × 5 sections (A–E, F–J, K–O by columns; 1–5,
  6–10, 11–15 by rows), of which **six** carry a rotator — the four corner
  sections, always, and two more drawn from the remaining five; a section
  that carries a rotator carries **one**, on a square that holds no planet,
  no ship and no node in any state; if a section has no such square, that
  section simply has none, so the board can carry fewer than six; the whole
  set is **replaced** — every rotator removed and a fresh set drawn —
  immediately after each refill of the three inactive nodes (section 8.6
  step 5), and at the opening deal; and a rotator is **spent** by the ship
  that lands on it and leaves the board at once. Section 3.2's constraints
  do not apply to a rotator: it may sit on the outer edge, and it may sit
  beside a planet or a node. A rotator is an ordinary square in every other
  way — a ship may land on it, fly over it (which spends nothing) and stand
  on it.
- **Section 2 gains a Rotator entry** and its Priority entry is checked: the
  sentence "The inactive node with the highest priority is the one that
  charges next" is true at all three settings and needs no change.
- **Section 8.6 step 5** is restated: if step 4 charged anything the trio is
  replaced as it is today, and — under the dedicated setting — the rotators
  are replaced immediately afterwards. Otherwise the priorities rotate **only
  under the continuous setting**; under the other two, nothing happens here.
- **Section 8.6's closing notes**: the paragraph beginning "A node's state
  changes only in this sequence, and never as part of resolving a move or an
  attack — **except**…" gains the second exception, in the same voice as the
  first. The paragraph explaining why charging reads from the priorities
  already on the board is checked and extended: under two of the three
  settings the arrangement a player reads is also an arrangement that player
  can change, which is the point rather than a wrinkle.
- **Section 7** gains the consequence in one sentence: with combat on and the
  planet setting chosen, a fight returns two ships to planets and therefore
  rotates the priorities twice. It belongs in 7 rather than only in 8.2
  because that is where a reader learns the fight's outcome.
- **Section 6** is checked: moving onto a rotator is refused by nothing, and
  the list of what a square can refuse a landing for is unchanged.
- **Section 1's overview** — the paragraph about the board redrawing itself,
  and the paragraph listing the game's random elements, which under dedicated
  gains one more (where the rotators fall). Both need a sentence, not a
  rewrite.
- **Section 10's opening sentence**, which lists what is chosen before play,
  adds rotation alongside the other six. **Section 9** is checked for the
  same.

### 2. The setting becomes part of the game

- The offered settings, the default and a type guard live in
  `src/rules/nodeRotation.ts`, in the shape `clock.ts`, `combatSetting.ts`,
  `fleet.ts`, `nodes.ts` and `scoring.ts` use: a `NodeRotationSetting` union
  of `"continuous" | "planet" | "dedicated"`, a `NODE_ROTATION_SETTINGS`
  array in start-screen order (continuous first), `DEFAULT_NODE_ROTATION` of
  `"continuous"`, and `isNodeRotationSetting`. The CONTINUOUS/PLANET/DEDICATED
  wording is start-screen chrome and stays on the start screen.
- `GameState` gains `nodeRotation: NodeRotationSetting`.
  `StartingGameStateOptions` gains it as an optional `string` field
  defaulting to continuous, **validated** with a `RangeError` naming the
  offered settings, exactly as `scoring` is and for the same reason.
- `GameState` also gains **`rotators: readonly Square[]`**, in board order,
  empty under continuous and planet. It is deliberately **not** part of
  `state.nodes`: a rotator has no state, no countdown and no priority, and
  putting it there would reach every caller of `nodeSquares`,
  `nodeStateAt` and `legalNodePool` for no gain. It cannot be derived from
  the board either — a free square and a free square carrying a rotator look
  the same.
- The `new-game` intent carries the choice alongside the other six; the
  reducer uses what it is handed and reaches for no default of its own.
- `useAppScreen` holds it with the other six options, so a game returns to
  the start screen with the setting it was played with still chosen.

### 3. Rotators: where they fall, and when

A new leaf module `src/rules/rotators.ts` owns section 3.3:

- **The nine sections**, derived from `BOARD_SIZE` rather than written out,
  in a fixed order — board order, the same order `ALL_SQUARES` walks — so a
  recorded game replays exactly.
- **`placeRotators(nodeSquares, shipSquares, seed)`**, which draws one
  rotator in each of the four corner sections, then draws two more of the
  remaining five sections and one rotator in each of those, drawing **one
  square uniformly** from a chosen section's free squares (no planet, no
  ship, no node in any state), skipping a section with none and **consuming
  no seed step for it**. Returns the squares in board order and the seed it
  left behind. Up to eight seed steps — two section draws plus at most six
  square draws; exactly zero under continuous and planet, because it is
  never called.
- **It is called in exactly two places**: at the end of the opening deal, and
  in `endOfTurn.ts` step 5's refill branch, immediately after `refillQueue`
  has placed the new trio — so the rotators see the new nodes and avoid them.
  Because a node is only ever created by a refill, and a regeneration follows
  every refill, a node can never afterwards appear on a square holding a
  rotator; no collision rule is needed in the other direction, and
  `legalNodePool` is not touched.
- **Spending one** is `ply.ts`'s business (below): the square is removed from
  `state.rotators` as the move resolves.

The seed consequence is worth stating plainly, because it is what keeps the
existing recorded games honest: **under continuous and planet the seeded
stream is untouched**, step for step, so `seededReplay.test.ts` keeps its
expectations exactly as recorded. Only dedicated adds steps.

### 4. One place rotates the queue

- `nodeQueue.ts` gains **`rotateQueue(nodes)`** — or the plan's equivalent —
  applying `rotatePriority` to every inactive node in a state's node map and
  returning the new map. Step 5's continuous branch and the new landing
  trigger both go through it, so there is exactly one implementation of "the
  priorities move one step" in the app.
- **`endOfTurn.ts` step 5** applies the rotation branch **only when
  `state.nodeRotation === "continuous"`**, and, in the refill branch, calls
  `placeRotators` after `refillQueue` when the setting is dedicated.
- **`ply.ts` is where a landing rotates.** `applyMove` already makes two
  node changes as a move resolves; this is the third. After the ship is
  placed on its destination:
  - under **planet**, if the destination is a planet, rotate once;
  - under **dedicated**, if the destination holds a rotator, remove it and
    rotate once;
  - under **continuous**, nothing.

  `applyAttack` does the same for **both** returned ships, attacker first, in
  the order `returns` already reports them — so a fight under planet rotates
  twice, deterministically, and under dedicated rotates not at all, since a
  fight only ever returns ships to planets.
- **A new effect**, `queue-rotated`, carrying the square landed on and
  whether the trigger was a planet or a rotator. It is one effect per
  rotation, so a fight under planet raises two, in attacker-then-defender
  order. It sits **after** `node-spent` and **before** the `EndOfPlyEffect`
  that closes the ply out, so a listener hears the node spent, then the
  rotation, then how the turn ended.
- **`assertFightInvariants` must be adjusted.** Its node check is a plain
  identity comparison — no node's state or `level` may differ across a fight
  — and a rotation triggered by a fight changes the `level` of all three
  inactive nodes. The check is narrowed to the charged and depleted states,
  which is what it was actually guarding (a fight must not touch a node's
  life), with a comment saying why the inactive ones are now exempt. Leaving
  it as it stands would turn a legal fight into a thrown `RangeError`, so
  this is not optional tidying.
- **`QueueRefilledEffect` gains `newRotators`**, the squares the regeneration
  placed, empty under continuous and planet. The sweep and the regeneration
  are one event, so this is a field on the existing effect rather than a
  second effect beside it.

### 5. What the player sees

- **The start screen shows seven groups** in the order **Ships, Charged
  nodes, Scoring, Inactive node rotation, Combat, Rounds, Clock**, the new
  one legended `Inactive node rotation` (the stylesheet uppercases the
  legend) and offering **CONTINUOUS**, **PLANET** and **DEDICATED** with
  CONTINUOUS checked at first — rendered by the same `OptionChoice` the other
  six use, with no new styling.
  - The three labels are the owner's words and are kept. If they should
    instead name the trigger rather than the scheme — CONTINUOUS / PLANETS /
    ROTATORS — that is the owner's call at the step, and changes nothing but
    the label table.
  - Seven groups on a short landscape window is the one layout risk this
    story carries; five were already noted as filling it (story 85). Nothing
    is restyled pre-emptively — it is a manual check.
- **The rotator's artwork**, a new `RotatorMarker` beside `NodeMarker`, drawn
  in the same 0–100 viewBox, beneath a ship the way a node marker is, and
  `aria-hidden` like every other piece of board art:
  - A round recycling mark: **three arcs of about 70 degrees each**, with the
    **three gaps between them equal**, and an **arrowhead at the leading end
    of each arc** so the mark reads as turning. Exact angles, stroke width
    and arrowhead shape are the drawing's business, not a rule — "about 70"
    is the instruction, not a measurement to hit.
  - **Its own colour**, `ROTATOR_COLOR` (`#C0C0C0`, silver), declared beside
    `INACTIVE_RING_COLOR` rather than sharing it, so a rotator reads as board
    furniture rather than as part of the queue it moves.
  - A rotator and a ship never share a square in a settled position — the
    landing spends it — so the marker is never drawn under a ship in play.
    It is drawn beneath one regardless, because that is what every other
    square-level marker does and a special case here would be a special case
    to maintain.
- **`BoardSquare` gains the rotator** as another optional, independent field
  alongside the node and the planet, and `Board` reads it from
  `state.rotators`.
- **`squareLabel` names it**: a rotator shares the planet-or-node slot, since
  a square can be at most one of the three, and reads as `rotator` in the
  same position — `"F7, rotator"`. A ship standing on a square that held one
  never arises, so no combined wording is needed.
- **The live region says a rotation happened**, in one clause in
  `announcements.ts`'s existing voice, naming the square and — because it is
  the whole point — that the queue has moved on. The exact sentence is the
  plan's, written to match the neighbouring wording rather than invented.
- **The Quick Guide's NEW CHARGED NODE SELECTION section** is rewritten: it
  describes the rotation first, then each of the three settings. **The copy
  is the owner's** and will be supplied when the work reaches that step; the
  plan should carry the step and leave the words open. Its diagram
  (`guideDiagrams.tsx`) is likely to need the same treatment, and that is the
  owner's call at the same moment. The guide's other sections and diagrams
  are untouched.
- **`README.md`**: the rules-summary paragraph states today's rotation as the
  only rotation — "On a turn when nothing lights, the rings shift round" — in
  the player's words, and becomes the choice. Run `/update-readme` for the
  rest of the diff.

### 6. The tests

Adding a required field to `GameState` reaches every test that builds a state
literal — the same mechanical sweep stories 83 and 85 did for
`combatEnabled` and `scoring`, and this time two fields, since `rotators`
joins it. Continuous and an empty rotator list everywhere except the files
that are about rotation. The plan should do it in one pass rather than file
by file as failures appear.

The tests that need real thought:

- **`nodeRotation.test.ts`** — the offered settings, their order, the default,
  and the guard over them.
- **`rotators.test.ts`** — nine sections covering the board exactly once
  each; one rotator per section; never on a planet, a ship or a node of any
  state; a section with no free square yields none and costs no seed step; the
  whole set is redrawn, not topped up; the same seed places the same set.
- **`nodeQueue.test.ts`** — `rotateQueue` moves every inactive node one step
  and touches nothing else.
- **`endOfTurn.test.ts`** — under continuous, step 5 rotates on a turn that
  charged nothing, as today; under planet and dedicated it does not; under
  dedicated, a refill is followed by a fresh rotator set, and under the other
  two the list stays empty.
- **`ply.test.ts`** — the heart of it: landing on a planet rotates under
  planet and not under the other two; landing on a rotator rotates under
  dedicated and spends that rotator; flying over either spends and rotates
  nothing; leaving a planet rotates nothing; a fight rotates twice under
  planet, in attacker-then-defender order, and not at all under dedicated;
  and, the clarification stated as a test, **a ship leaving a charged node
  for a planet charges the node that held priority 2**, while the same move
  under continuous charges the node that held priority 3.
- **`combat` / `assertFightInvariants`** — a fight that rotates the queue is
  not a violation, and a fight that changed a charged or depleted node still
  is.
- **`gameState.test.ts`** — both fields are set from the option, default to
  continuous and empty, are fixed for the game's lifetime, and an off-list
  setting throws a `RangeError`; the opening deal places rotators under
  dedicated and none otherwise.
- **`session.test.ts`**, **`useAppScreen.test.tsx`**, **`App.test.tsx`** —
  the option reaches `new-game`, the default is continuous, and a chosen
  setting produces a game that rotates the way that setting says.
- **`StartScreen.test.tsx`** — the seventh group, its position among the other
  six, its three labels, its default, and that choosing one calls the handler.
- **`BoardSquare.test.tsx`** / **`squareLabel.test.ts`** — a rotator square
  draws the mark and names it; a square holding nothing draws neither.
- **`announcements.test.ts`** — the rotation's clause, once per rotation.
- **`fullGame.test.ts`** — a whole game at each of the three settings runs to
  its end with the queue's invariant intact throughout: always exactly three
  inactive nodes, always holding 1, 2 and 3 with no repeat.
- **`seededReplay.test.ts`** — expectations **unchanged**, and that is worth
  asserting rather than assuming: continuous adds no step to the seeded
  stream.
- **`guideCopy.test.ts`** — the rewritten section, once its copy exists.
- **`rulesVersion.test.ts`** — 0.36, by the existing assertion.

Per `CLAUDE.md`'s pre-release stance: **no plan steps for testing
accessibility**, no review fixtures and no manual test scripts. Existing
automated tests are updated where the path is straightforward.

Anything knowingly given up on the accessibility side — most likely that a
rotator is announced as a bare noun with nothing saying what it does, and
that a screen-reader user gets no summary of where the six of them are —
goes in `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.

## Out of scope

- **Any mid-game change.** Rotation is chosen before play and fixed, like
  every other option. There is no in-game toggle.
- **Any fourth trigger**, and any setting that combines two — no "planets and
  rotators", no rotation on leaving a node, on refuelling, on collecting, or
  on a turn passing. Three settings, and nothing is built to make a fourth
  easy later.
- **Rotating more than one step per landing**, rotating backwards, or
  choosing which priority to advance. A landing is worth exactly one step.
- **Changing what the priorities do or how they are drawn**: the rings, the
  charge order, the sweep-and-redraw on a charge, and the random deal of 1, 2
  and 3 to a fresh trio all stand.
- **Making a rotator anything other than a trigger.** It gives no power, no
  energy and no protection, it blocks nothing, it does not constrain where a
  node may appear, and it never traps anything.
- **Rotators under continuous or planet**, in any form — no set drawn, none
  stored, none drawn on the board, no seed steps spent.
- **Any indication on the board or in the HUD of which setting is in play**,
  beyond the rotators themselves being there or not: no badge, no legend, no
  note in the game-over panel.
- **Restyling the start screen** to fit seven groups. The seventh is added in
  the existing shape; if it does not fit, that is a finding for the owner,
  not a layout pass this story takes on.
- **Re-tuning anything against the new settings**: the countdown lengths, the
  node economy, the fleet sizes, the game lengths and the clock all keep
  their values.
- **Backwards compatibility** for games recorded under 0.35 (`CLAUDE.md`).

## Verification

- `RULES_VERSION` agrees with `rules.md` at **0.36**, and the changelog has
  one entry for it.
- No section of `rules.md` states end-of-turn rotation as the only rotation;
  section 8.2 states the choice and all three settings, and section 3.3
  describes rotators.
- The start screen shows seven option groups in the order **Ships, Charged
  nodes, Scoring, Inactive node rotation, Combat, Rounds, Clock**, with
  **CONTINUOUS** checked in the new group.
- In a CONTINUOUS game, the rings shift at the end of every turn on which
  nothing charged, exactly as they do today, and no rotator is drawn anywhere.
- In a PLANET game, the rings do not move on a turn that charges nothing and
  lands nowhere; they move one step on the turn a ship lands on a planet, and
  they do not move when a ship leaves one, flies over one, or stands on one
  through a turn.
- In a PLANET game with combat on, an attack moves the rings **two** steps.
- In a DEDICATED game, six rotators are on the board at the start, one in
  each corner 5 × 5 section and two more elsewhere, none on a planet, a ship
  or a node; landing on one removes it and moves the rings one step; landing
  on a planet moves nothing; and a fresh six appear the moment something
  charges.
- **The ordering clarification, checked by hand**: with a ship holding a
  charged node, note which node shows two rings, move that ship onto a planet
  (PLANET) or a rotator (DEDICATED), and confirm the node that charges at the
  end of that turn is the one that showed **two** rings — not three.
- A rotator square can be moved onto, moved through and stood on, and flying
  over one leaves it there.
- The board is not visibly smaller than it is today, and the start screen's
  seventh group does not clip or overflow at the window sizes the screen is
  sized for.
- The choice survives a return to the start screen, and a second game starts
  from it.
- `seededReplay.test.ts` passes with its expectations **as recorded** — the
  seeded stream is unchanged at continuous.
- The Quick Guide describes the rotation and its three settings, and
  `README.md` describes rotation as a choice.

## Notes

- Planning documents say **ply** for the rules' and the UI's **turn**
  (`CLAUDE.md`, Vocabulary). The story title's "prospective node" is the
  owner's phrase for what `rules.md` calls an **inactive node** carrying a
  **priority**; the rules' vocabulary is what the document and the code use.
- **A rotator is not a node.** It never enters the inactive → charged →
  depleted cycle, it is not counted among the board's nodes, and it does not
  live in `state.nodes`. The word is new to the ruleset and is introduced by
  section 3.3.
- The rules edit is one commit, ahead of the code, and there is **one**
  version bump on this branch however many later rules edits it turns out to
  need.
- The Quick Guide copy and its diagram are the owner's and arrive at that
  step; the plan carries the step with the words left open.
- Manual checks worth making once it runs: a DEDICATED game played until the
  rotators run low, to see whether six is generous or tight; and a PLANET
  game with combat on, to see whether the double rotation an attack buys is
  too strong a reason to attack.
