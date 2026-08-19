# Story 00000012 — Scoring and game length

## Summary

The game keeps score, counts its rounds, and ends. Until now Base Control has
been a board that could be played but never won: nodes woke and ran out, ships
fought and returned to bays, but step 2 of the end-of-turn sequence was a
documented empty slot and §9's hundred rounds existed only on paper. This
story fills both, and puts them on screen.

Three things arrive together because none of them is worth having alone. A
score nobody can see is a variable; a round counter with nothing riding on it
is trivia; an ending with no score to compare is an abrupt stop. Together they
are the first version of the app in which a game of Base Control can actually
be won.

The story also renames **influence** to **energy** throughout, and replaces
§8.4's payout table with a steeper one, so the difference between holding two
nodes and holding four is worth fighting over.

Finally, the app gets the beginnings of a look: an **arcade** treatment for
the score, the round counter and the result. That is a deliberate choice of
where visual character enters this project — the chrome around the board
first, the board itself later.

### A note on words

This is a planning document, so it says **ply** for what the rules and the UI
call a **turn**, and **hub** for what the player sees as a **node**
(CLAUDE.md, Vocabulary). **Round** is the same word everywhere: one ply for
each player. **Move** means one ship changing squares and never means a ply.

The word this story is chiefly about — **energy** — is the same in the rules,
the code and the UI. There is no split to maintain, and after this story the
word "influence" should not appear anywhere in the repository.

## Background & references

The rules are owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.6**.
This story begins with a rules edit that takes it to **0.7** (see In scope
item 1). The sections it implements are:

- **§8.4 Energy** — at the end of each player's turn, that player collects
  energy for the charged nodes they are standing on, on a fixed table. A node
  counts only if one of that player's ships is on it at that moment.
- **§8.7 End-of-turn order, step 2** — the collection's place in the
  sequence: after shields are gained (step 1), before any clock ticks
  (steps 3–5).
- **§9 Ending the game** — the game ends after 100 rounds, 100 turns each.
  The player with the most energy wins; equal energy is a draw.

### What is already in place

Every piece this story needs to attach to exists:

- `src/rules/gameState.ts` holds `GameState`: ships, site states, the side to
  move, actions remaining, `movedThisPly`, `plyNumber`, the random seed and
  the return-position index. It is plain readonly data with no derived facts
  stored — occupancy is rebuilt at the point of use by `shipsBySquare`, never
  kept. A score is the first genuinely cumulative fact the state will hold.
- `src/rules/endOfTurn.ts` runs §8.7's six steps in order, and carries a
  comment reading `Step 2: influence (§8.4) — awaits its own story. No total
is kept.` That line is this story's entry point.
- `src/rules/ply.ts` owns `applyMove`, `applyAttack`, the shared
  `applyEndOfActionTail` that spends an action and closes out a ply, and
  `applyPassGuard` for §5's no-legal-action case. `plyNumber` already
  advances on every ply, passed or played, so round arithmetic has an honest
  input from day one.
- `src/game/session.ts` is the pure reducer between player input and the
  rules layer, turning an intent into a new session plus a structured event.
- `src/board/announcements.ts` owns every player-facing sentence, including
  `turnIndicatorText`, and is unit-tested away from the DOM.
- `src/App.tsx` is a thin shell: a title, a `TurnIndicator`, and the board.
  It draws the opening seed once via `freshSeed()` so a re-render never
  re-seeds a game in progress.

Nothing in the codebase currently accumulates a total, ends a game, or refuses
an action for any reason other than legality under §5–§8.

### The new payout curve

§8.4's table becomes:

| Charged nodes held | Energy |
| ------------------ | ------ |
| 0                  | 0      |
| 1                  | 1      |
| 2                  | 3      |
| 3                  | 6      |
| 4                  | 10     |
| 5                  | 15     |

The old table paid 0, 1, 3, 5, 7, 9 — a flat two per extra node after the
first. The new one pays a marginal 1, 2, 3, 4, 5, so the fifth node a player
holds is worth five times the first. Holding all five nodes at once now pays
fifteen, against nine before, and a player who can be pushed from three nodes
to two loses three energy a turn rather than two.

The intended consequence is that concentration beats spread. Under the old
curve, two players holding two and three nodes each scored 3 and 5 — close
enough that trading nodes barely mattered. Under the new one they score 3 and
6, and the gap widens with every node taken. That should make §7's combat
worth its cost: driving an enemy off a node and taking it with the turn's
second action now moves the score by more than the shields it burned.

**The table is a table, not a formula.** These numbers are the triangular
numbers, and it would be easy to write `n * (n + 1) / 2` in the code. Do not:
`rules.md` states a table of six values, and the code implements what the
document says. The arithmetic property is a fact about these six numbers
today, not a rule about future ones — a later ruleset that pays 1, 3, 6, 10,
20 must be a one-line table edit, not a discovery that the formula was load
bearing.

### Rounds, worked through

A round is one ply for each player (CLAUDE.md, Vocabulary). Green takes odd
plies, red even, so:

| Ply   | 1   | 2   | 3   | 4   | …   | 199 | 200 | 201 |
| ----- | --- | --- | --- | --- | --- | --- | --- | --- |
| Round | 1   | 1   | 2   | 2   | …   | 100 | 100 | —   |

(The last two columns assume §9's hundred rounds — see "The length is a
property of the game" below.)

The round is `ceil(plyNumber / 2)`, and a hundred-round game lasts 200
plies. The state already carries `plyNumber`; **no round counter is stored**,
and no game-over flag is stored either. Both are derived, which is consistent
with how the rest of `GameState` works and means there is no second number to
drift out of step with the first.

The game is over when `plyNumber` exceeds twice the game's length in rounds.
That falls out naturally: the second action of the last ply runs the
end-of-turn sequence for it — red's hundredth turn, energy collected in full
— and then advances `plyNumber` past the end. From that moment nothing
further is legal.

The score display's round counter therefore reads round 101 at game over if
asked naively. It must not: the counter shows the round the game is in while
it runs, and holds at **100/100** once the game is over.

### The length is a property of the game, not of the app

A hundred rounds is §9's number today, and a later story will let players
**choose the length before starting**. Nothing in this story offers that
choice — but everything in it is built so that adding it is a start screen
and nothing else.

So the length is carried **in `GameState`**, as a round count set once when
the game starts, and every piece of round arithmetic reads it from the state
it was handed. `startingGameState` takes the length as an argument defaulting
to §9's hundred, which is the only place the default is named.

Two reasons this is worth doing now rather than later. First, the alternative
— a module constant consulted directly by the round arithmetic, the refusal
checks, the HUD and the result panel — puts the number in five places that
would each need reopening, and the last of them is a React component, which
is the worst place to discover a hardcoded rule. Second, a game record has to
replay exactly, and a record of a fifty-round game must not depend on what
the app's default happened to be on the day it is replayed. Carrying the
length in the state makes the record self-describing, which is the same
argument that already puts the seed there.

`startingGameState` should reject a length that is not a positive whole
number, on the same "impossible input is a caller bug" habit the rest of the
rules layer follows.

**§9 is not changed by this.** The document still says the game lasts 100
rounds, because it does; that a future story may make it configurable is an
app fact, not yet a rule. When the choice actually ships, §9 gets edited then.

### The pass guard is a trap here

`applyPassGuard` implements §5's rule that a player with no legal action at
all passes their ply. It is called after every action and once when a session
is created.

Once the game is over, **no** action is legal — which is exactly the
condition the pass guard fires on. Left alone, it would run an end-of-turn
sequence for ply 201, tick every clock, collect energy for a turn that does
not exist, and advance to ply 202, in an unbounded loop of one pass per call.

So the game-over check must come **before** the pass guard's own test, and
the guard must return the state untouched. For the same reason, the
game-over check must sit in `moveRefusalReason` and `attackRefusalReason` —
the full, §8.5-aware layers — and **not** in `sixOnlyMoveRefusalReason` or
`sevenOnlyAttackRefusalReason`. Those two exist precisely so the pass guard
can ask "is any action legal here" without §8.5 answering the question, and
putting game-over into them would make the pass guard see a player with no
legal action and pass on their behalf. This is the single subtlest thing in
the story and the place a plan step should spend its verification.

## In scope

### 1. The rules edit (first, before anything implements it)

`doc/ruleset/rules.md` goes to **version 0.7**:

- **Rename influence to energy.** Every occurrence, in §1's overview, §8.1's
  description of a charged site, §8.3's rationale for the nine-turn clock,
  §8.4's heading and table, §8.7's step 2, and §9. The word "influence" leaves
  the document entirely.
- **Replace §8.4's table** with 0, 1, 3, 6, 10, 15 as set out above. §8.4's
  surrounding prose — that a node counts only if a ship of that player's is
  standing on it at that moment, and that flying across collects nothing — is
  unchanged.
- **§9 is unchanged** beyond the rename. The game still ends after 100
  rounds, the most energy still wins, equal energy is still a draw. Neither
  the length of the game nor a tie-break is open in this story.

`doc/ruleset/changelog.md` gets a 0.7 entry. The payout change **does** change
how the game is played, so this version would be a tagging candidate — but
tagging is on hold until the game plays, so no tag is made, and the entry says
so in the form the earlier entries use. `RULES_VERSION` in
`src/rules/rulesVersion.ts` goes to `"0.7"` in the same commit, which its
existing test checks against the document.

`README.md` and `CLAUDE.md` both say "influence" today and both become
"energy" in this step, so the word is gone from the repository in one commit
rather than trailing behind the rules.

### 2. The energy table and what a side holds

A new `src/rules/energy.ts` owning two things and no more:

- The §8.4 table, as data, and a lookup from a count of charged nodes held to
  the energy that pays. The lookup must reject a count outside 0–5 rather
  than returning a default: five sites are active or charged at any moment
  (§8.1), so a sixth is a bug in the caller, and the codebase's habit is to
  throw a `RangeError` on impossible input rather than absorb it.
- A count, for a given state and side, of the charged nodes that side is
  standing on. "Standing on" means a ship of that side occupies the square
  and the square's site state is `charged` — an active, depleted or dormant
  site pays nothing, and neither does a node a ship merely flew over.

### 3. Energy in the game state

`GameState` gains two things:

- A **per-side energy total**, starting at 0 for both sides. It is the first
  cumulative number the state carries, and it belongs there rather than in
  the session: it is game state under §8.4, a future engine will read it, and
  a game record has to replay it exactly.
- The game's **length in rounds**, set once at the start and never changed
  after. `startingGameState` takes it as an argument defaulting to §9's
  hundred, and rejects a value that is not a positive whole number. Nothing
  in this story varies it away from the default except tests — see "The
  length is a property of the game, not of the app" above for why it is
  carried here rather than read from a constant at each point of use.

The length must arrive as a **defaulted** argument, so that every existing
`startingGameState(seed)` call across the test suite keeps working untouched.
Churning dozens of call sites to thread a value none of them cares about
would bury this story's real diff in noise, and the peer review would have to
read all of it.

### 4. Step 2 of the end-of-turn sequence

`runEndOfTurn` fills its empty slot. For the side that just played, it counts
the charged nodes that side stands on, looks up the payout, adds it to that
side's total, and emits an effect describing the collection: the side, how
many nodes were held, the amount paid, the new total, and the squares
involved.

The squares matter because the board draws a visual on them (item 7). A
collection of zero — the common case early in a game — still needs deciding:
**no effect is emitted when nothing is collected.** A player who holds no
node has not had something happen to them, and an effect for it would put a
"collected 0 energy" clause into the live region on most turns of the opening.

Ordering is not negotiable: step 1 (shields) runs first, because a ship that
gains its fourth shield still collects; steps 3–5 (the clocks) run after,
because a node that runs out at the end of this turn pays for this turn
first. The existing step comment says exactly this and the code already has
the slot in the right place.

### 5. Round arithmetic and the end of the game

A new `src/rules/gameLength.ts`, named for §9's subject rather than for the
moment of ending, because the round arithmetic it owns is consulted on every
turn and not only at the last one. It holds:

- §9's default length, as the one named place the hundred lives. Every other
  module gets the length from the state.
- The plies a game of a given length runs to.
- The round a ply belongs to. This is the one piece of arithmetic that does
  not need the length at all — `ceil(plyNumber / 2)` regardless.
- Whether a state's game is over, judged against **that state's** length.
- The result of a finished game: which side won, or a draw, with both final
  totals. Asking for the result of a game still in progress is a caller bug
  and throws.

Nothing here reaches for the default except `startingGameState`. A function
handed a state uses the state's length; a function handed a length uses that.
That rule is what keeps the future start screen to one story.

### 6. Refusing to play past the end

- `moveRefusalReason` and `attackRefusalReason` gain a game-over reason,
  checked first, ahead of ownership. Both `sixOnly…` and `sevenOnly…` are
  left alone — see "The pass guard is a trap here" above.
- `applyPassGuard` returns its state untouched, with no effect, when the game
  is over.
- The session reducer refuses an activation once the game is over, with the
  same reason, so the board can say why rather than silently ignoring a click.

### 7. The arcade HUD

A new `src/hud/` folder. `TurnIndicator` moves into it from `src/board/`,
unchanged in behaviour: it is chrome around the board, not part of it, and
leaving it behind would split the HUD across two folders for no reason.

The HUD is a strip between the title and the board carrying, in one row:

- **Each side's score**, in the side's colour, as arcade digits — zero-padded
  to a fixed width so the layout never reflows as the number grows, with the
  side's name above it.
- **How many nodes that side holds right now**, as a row of five pips, lit
  for held and unlit for not. This is what makes the 1/3/6/10/15 curve
  legible: a player who can see they are on three pips and their opponent on
  two can see why the gap is widening.
- **The round counter**, centred between the two scores, reading `35/100`.
  Held at `100/100` once the game is over. Both halves come from the state —
  the round from `plyNumber`, the total from the game's own length — so the
  component never names a hundred, and a fifty-round game reads `35/50`
  without the HUD being touched again.
- **The turn indicator**, restyled to sit in the strip.

When a side collects, its score **counts up** to the new total rather than
jumping — the arcade convention, and the thing that makes a payout feel like
a payout.

### 8. The floating gain on the board

When a side collects, a `+N` floats up off the board and fades, in that
side's colour, and each node that paid pulses briefly.

**One payout, one number.** A player holding three nodes collects six energy,
not 1 + 2 + 3 from three squares: §8.4 pays for the _count_, and splitting the
number across squares would invent an attribution the rules do not make. So
the `+N` is positioned at the **centroid** of the held nodes, in continuous
board coordinates rather than snapped to a square. With one node held that
puts it exactly on that node, which is the common case and reads correctly;
with several it sits between them, which reads as the group paying together —
which is what happened.

**The overlay must be a sibling of the grid, not a child of it.** The board's
`role="grid"` element may only own rows; this is already why the board's
visible row and column labels sit outside it and are `aria-hidden`. The
floating layer follows the same pattern: absolutely positioned over the grid
inside `.board-frame`, `aria-hidden`, and `pointer-events: none` so it never
eats a click meant for a square.

Both the float and the pulse are decorative. A screen reader learns about the
collection from the live region's sentence, and the HUD carries the total as
text; nothing about the score is only available as an animation. Under
`prefers-reduced-motion: reduce` the number appears and fades in place
without travel, the pulse becomes a static change or nothing, and the score
counter sets its new value directly instead of rolling — the pattern
`BoardSquare.css` already establishes for its blink.

### 9. Game over

Once the game is over the board stops accepting actions (item 6 makes every
action refuse) and a result panel appears over it: `GAME OVER` in arcade
type, both final scores, and the outcome — a side wins, or a draw.

The panel carries a **play again** button, the app's first new-game path. The
session reducer stays pure: the button's handler draws a fresh seed with
`freshSeed()` and dispatches a new-game intent carrying it, so the reducer
receives the seed rather than reaching for one. `freshSeed` lives in
`src/game/` and outside `src/rules/` deliberately, and this story does not
disturb that.

The panel is a focus target when it appears — the game has ended and the one
useful control is the button. It must be reachable and operable by keyboard,
and the result must reach a screen reader as words.

### 10. The arcade chrome

The title and the page frame get an arcade treatment: the cabinet face around
the board, glow on the title, a bezel around the playing area. The board
grid, the squares, the ships and the site markers are **not** touched — their
look was settled in stories 1, 3 and 9 and reopening it here would triple the
story and the review.

**No web font.** Arcade type comes from a monospace system stack with
letter-spacing, weight and glow, not from a downloaded face. The app must
deploy from any static file host and make no network requests, and a font
file is a dependency decision that belongs in its own commit if it is ever
wanted. Anything the look needs from the palette goes into `index.css`'s
custom properties alongside the existing deep-space set, so the two side
colours stay the single source of side identity.

Contrast is a manual gate: axe's `color-contrast` rule is disabled in jsdom
(no layout, no canvas — see CONTRIBUTING.md), so glow-on-dark text passing
contrast is something a person checks by eye and by tool in the browser.

## Design decisions & constraints

- **Energy lives in `GameState`, not in the session.** It is a rule fact
  under §8.4, it must replay from a seed, and an engine will read it. The
  session holds only what is about a player's interaction with the game —
  selection, and the last event.
- **Nothing derived is stored.** The round, and whether the game is over, are
  both computed from `plyNumber` and the game's length. The state already
  refuses to store occupancy for the same reason: a second copy of a fact is
  a second thing that can be wrong.
- **The game's length is state, not a constant.** Set once at the start,
  carried in `GameState`, read from there by every piece of arithmetic and by
  the HUD. §9's hundred is the default and is named in exactly one place.
  This is deliberate groundwork: choosing the length before starting is a
  planned future story, and the point of doing it this way now is that the
  future story is a start screen and nothing else. It is also what lets a
  game record replay a fifty-round game without depending on today's default.
- **The payout table is data, not arithmetic.** Stated above; repeated here
  because it is the one place a reviewer is most likely to suggest a
  "simplification" that this story is deliberately refusing.
- **A zero collection is not an event.** No effect, no sentence, no float.
- **Game-over sits above the six-only/seven-only legality layers.** Stated
  above; this is the story's one genuine correctness trap.
- **The HUD is chrome, and chrome is not the board.** `src/hud/` for the
  score, the round, the turn indicator and the result panel; `src/board/`
  keeps the grid and the squares. The floating gain is the one thing that
  crosses, and it crosses as an overlay sibling rather than as a change to
  any square.
- **Wording stays in `announcements.ts`.** The energy sentence and the
  game-over sentence are composed there and unit-tested there, as every other
  player-facing sentence in the app already is. Components render wording;
  they never compose it.
- **Animation is never the only channel.** Every number the animations
  express is also present as text.

## Out of scope

- **Restyling the board itself.** Squares, ships, shield arcs and site
  markers keep the look they have. The arcade pass stops at the bezel.
- **Letting a player choose the game's length.** The length is carried in the
  state and defaults to §9's hundred, and the plumbing is built so a later
  story can vary it — but this story ships no way to set it, no start screen,
  and no rules change. Every game played after this story is a hundred
  rounds.
- **Changing §9's number, or adding a tie-break.** The document keeps its 100
  rounds and its draw. Both are the owner's to reopen in a later story.
- **Recording or replaying a game.** The seed is already carried and the
  score is now part of the state, which is what a record will need — but the
  record format, saving, and loading are their own story.
- **A running score history, a graph, or per-turn score breakdown.** The HUD
  shows the current totals and node counts, nothing cumulative over time.
- **Sound.** An arcade look invites arcade noise; it is not in this story.
- **Any AI or engine.** The game ends and declares a winner; nothing plays it.
- **A start screen, settings, or seed entry.** Play again starts a game with
  a fresh random seed, §9's default length, and no dialogue.

## Verification

**Automated, in the rules layer:**

- The §8.4 table pays 0, 1, 3, 6, 10, 15 for 0–5 nodes held, and throws
  outside that range.
- Counting held nodes: a ship on a charged node counts; a ship on an active,
  depleted or dormant site does not; an enemy ship on a charged node does not
  count for this side; two ships of the same side on two charged nodes count
  as two.
- End-of-turn step 2 pays the side that just played and not the other, pays
  before the clocks tick (a node running out at the end of this turn still
  pays for it), pays after shields are gained, and emits no effect when the
  payout is zero.
- A passed ply still collects: §8.7 runs in full for a passed turn, so a
  player who passes while standing on nodes is paid.
- The round arithmetic: plies 1 and 2 are round 1, 199 and 200 are round 100,
  the game is not over at ply 200 and is over at ply 201.
- **The length is honoured, not assumed.** A state started at a short length
  — three rounds, say — is over at ply 7 and not at ply 6, and every refusal,
  the pass guard's early return, and the result all fire against that length
  rather than against §9's hundred. This is the test that would catch a
  hardcoded 100 or 200 anywhere in the rules layer.
- `startingGameState` defaults to a hundred rounds when given no length, and
  throws on a length that is zero, negative, or fractional.
- **The trap, tested directly:** from a state at ply 201, `applyPassGuard`
  returns the same state and no effect — it does not pass, does not run an
  end-of-turn, and does not advance the ply. And a state one action from the
  end, driven through that action, ends at ply 201 with the guard having
  fired nothing.
- Every move and every attack refuses once the game is over, with the
  game-over reason and ahead of any other reason — including for a move that
  would have been illegal anyway.
- **A full game, end to end:** from a fixed seed, play all 200 plies of a
  default-length game with a deterministic action chooser, and assert the
  game ends exactly at ply 201, both totals are consistent with the sum of
  each turn's payouts, the result names the higher total as the winner, and
  no further action is accepted. This is the test that proves the three
  pieces work as one. Running the same policy at a short length should end
  the same way, proportionally — the game's length must be the only thing
  that differs.

**Automated, in the UI:**

- The HUD renders both totals as text, the node pips for each side, and the
  round counter as `n/100`; the counter reads `100/100` at game over and not
  `101/100`. Rendered from a state started at a different length, the counter
  reads against **that** length — the check that no component has baked in a
  hundred.
- The result panel appears only when the game is over, names the winner or
  the draw in words, and its play-again button starts a fresh game — a new
  ply 1, both scores back to 0, and the panel gone.
- The play-again button is reachable and operable by keyboard, and the panel
  takes focus when it appears.
- The live region announces a collection with the amount and the node count,
  and announces the end of the game with the result.
- axe finds no violations on the app with the HUD present, and none with the
  result panel open (with `color-contrast` disabled, per CONTRIBUTING.md).

**Manual (the owner runs the app):**

- The arcade HUD and chrome look right: the scores, the round counter, the
  title and the bezel read as one deliberate thing rather than as a strip
  bolted above a board.
- A score counting up, a `+N` floating off the nodes that paid, and the pips
  lighting and going dark all read clearly at speed and in the side's colour.
- Contrast of the glow-on-dark text is genuinely legible, checked in the
  browser.
- With reduced motion on, nothing rolls, floats or travels, and no
  information is lost.
- The game reaching its end feels like an ending: the board goes quiet, the
  panel lands, and play again starts a visibly different game.

## Open items to resolve at plan time

- **Where the score counter's roll lives.** It is animation state about a
  number the state already holds, so it belongs in the HUD component, not in
  the session — but the plan should say plainly how a component animates
  towards a prop without becoming a second source of truth for the total.
- **How the floating gain is positioned.** The centroid is specified in board
  coordinates; the plan must decide how the overlay learns the grid's
  geometry — the board already measures itself with a size container, and the
  answer should reuse that rather than introduce a second measurement.
- **How the end-of-game effect reaches the app.** A collection is an
  end-of-turn effect and has an obvious home. The end of the game is a
  transition the state makes rather than something a step does, and the plan
  should decide whether it is an effect, a derived fact the app reads, or
  both — and say why.
- **How the full-game test chooses its actions.** It needs a deterministic
  policy that produces a real game, not 200 passes. The plan should name the
  policy and keep it in the test, not in `src/rules/`.
