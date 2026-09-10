# Story 00000069 — Retire the action

## Summary

A turn used to be two actions. It has been one action for many releases now,
and it is not going back. What is left of the idea is a layer of machinery
that counts to one: a constant `ACTIONS_PER_PLY = 1`, a counter
`actionsRemaining` that is always 1 or 0, a list `actedThisPly` that is
always empty or holding the single ship that just ended the turn, a refusal
reason no player can ever provoke, a board marking no player can ever see,
and a sentence the live region can never speak.

This story **removes the concept entirely**. A turn is a move or an attack.
There is no unit smaller than a turn, nothing to count, and nothing to carry
between one player's turn and the next.

Two pieces of cleanup ride along with it:

- **"Standard game" language goes** from `rules.md`. The document lists the
  choices a player makes before play begins and stops declaring one of each
  set to be the real game.
- **The appendices leave `rules.md`** for a new `doc/ruleset/tech-notes.md`.

## What changes

### The action goes

- **Section 2 loses its *Action* entry.** Nothing replaces it: a turn is a
  move or an attack, and both words are already defined by their own
  sections.
- **Section 5 becomes "Turns"** and says the thing plainly: Green takes the
  first turn, the players alternate, and on a turn a player either moves one
  ship or attacks with one ship. The sentence about taking "as many of their
  turn's actions as are available" goes — with one thing to do there is no
  *as many as*. The pass rule stays and is reworded: if a player can neither
  move nor attack, their turn passes.
- **Everywhere else in the rules that says "action" is reworded** to say
  move, attack, or both — sections 7.1, 8.3, 8.6 and the appendices.

### "Standard game" goes

Sections 4, 8.1, 9 and 10 each name a choice made before play begins — fleet
size, charged-node count, rounds, clock — and each currently declares one
option "the standard game". That framing makes the other options read as
variants of a proper game, which is not how they are meant to be played.
The rules will list the choices and name **no default at all**.

Which option the splash screen preselects is unchanged and becomes purely an
app matter. The `DEFAULT_*` constants keep their names and values; only the
comments that call them "§4's standard game" change to say the app's
default.

### The appendices move

A new **`doc/ruleset/tech-notes.md`** takes both appendices as sections of
its own — Appendix A's open items (there are none at present, and the
section carries across saying so) and Appendix B's queue sizing. It is a
development document, not part of the ruleset a player reads: it holds
measured figures, the arguments behind the queue's size, and what the app's
long-run tests guard.

`rules.md`'s three "(Appendix B)" cross-references become links to it, and
`nodePool.test.ts`'s comments follow the move. `README.md` gains a pointer
to it alongside the rulebook and change log.

## What does not change

- **The game plays identically.** No legal move changes, no cost changes, no
  countdown changes, no scoring changes. Every rule this touches is already
  a rule about a turn; only the words change.
- **A recorded game replays the same.** Nothing in the random sequence moves.
- **The pass rule stays**, both reasons for it, and section 8.6 step 7's
  relief that exists to prevent one of them.
- **The "no legal move or attack" marking on the board stays** — the faded
  ship and its bottom-edge hollow bar. It marks a pinned ship, a state a
  player really can reach, and is a separate fact from the already-acted bar
  being retired above.

## Code

### `src/rules/`

- **`gameState.ts`** — `ACTIONS_PER_PLY`, `actionsRemaining` and
  `actedThisPly` all go from `GameState` and from `startingGameState`.
- **`ply.ts`** — `applyEndOfActionTail` loses its counting: every move and
  every attack ends the ply, so it runs the end-of-turn sequence, advances
  the ply number and swaps sides unconditionally. Its `actedShipId`
  parameter goes with `actedThisPly`. Rename it to `endPly`, and
  `EndOfActionEffect` to `PlyEndEffect` — it is the union of `ply-ended` and
  `ply-passed`, which are both facts about a ply ending. `passPly` stops
  resetting the two removed fields.
- **`actions.ts`** — the module survives (it is still the only place that
  asks a question neither §6 nor §7 owns, and keeping it avoids a cycle
  between movement and combat), but it is renamed with the concept it was
  named for. Proposed: **`canMoveOrAttack.ts`**, exporting
  `sideToMoveCanMoveOrAttack` and `shipCanMoveOrAttack`. The names are long
  but coin nothing — the alternative is inventing a fresh collective noun
  for "a move or an attack", which is the thing this story is trying to
  stop doing.
- **`movement.ts`, `combat.ts`** — the `ship-already-acted` refusal reason
  goes from both `MoveRefusalReason` and `AttackRefusalReason`, along with
  the `actedThisPly` checks in `moveRefusalReason`, `attackRefusalReason`,
  `legalDestinations` and `legalTargets`. `eligibleShips` in `movement.ts`
  is then just "the side to move's ships" and should fold into its caller.
- **`relief.ts`, `trap.ts`** — the probe state in `relief.ts` no longer
  needs to empty `actedThisPly`, and `trap.ts`'s comment about not
  consulting it goes.
- **`PassReason`** — `"no-legal-action"` becomes `"cannot-move-or-attack"`.

### `src/game/session.ts`

- `isSelectable` is always true once `actedThisPly` is gone, so it goes, and
  with it both `ship-already-acted` rejections and the reason itself.
- `MovedEvent.actionsRemaining` and `AttackedEvent.actionsRemaining` go.

### `src/board/`

- **`announcements.ts`** — `actionsPhrase` goes. `turnPhrase` becomes
  "Green's turn." with nothing counted. `actionEndingClauses` becomes
  `turnEndingClauses` and loses both its `actionsRemaining` parameter and
  its final `return` — the "Green has 1 action left." branch, which is
  already unreachable, since a move or an attack always ends the ply.
  `selectionCountsPhrase`'s "No actions available." becomes "No moves or
  attacks available."; the pass clause's "has no legal action" becomes
  "cannot move or attack"; and the `ship-already-acted` rejection sentence
  goes.
- **`squareLabel.ts`** — the `hasActed` field and `ALREADY_ACTED_WORDING` go.
  `ShipCondition`'s single member `"no-action"` and its wording "no action
  available this turn" are renamed for the same reason as the module above —
  proposed `"cannot-move-or-attack"` and "cannot move or attack this turn".

#### The already-acted marking

The bar drawn at a square's top edge to say "this ship has already gone this
turn" is retired outright — with one action a turn there is no moment at
which a player could ever see it. It is **three separate things**, and the
condition marking that shares its machinery **stays**:

- **`BoardSquare.tsx`** — the `hasActed` prop, the `AlreadyActedMark`
  component, the `ALREADY_ACTED_BAR_TOP_INSET` constant and the
  `{hasActed && <AlreadyActedMark />}` render all go. `CONDITION_BAR_WIDTH`
  and `CONDITION_BAR_HEIGHT` are shared with `NoActionMark` and **stay**;
  only the top inset was the bar's own.
- **`BoardSquare.css`** — `.board-square__mark--already-acted` is the first
  half of a **comma selector** it shares with `.board-square__mark--no-action`
  (line 30). Delete the one selector line, **not the rule** — the condition
  marking still needs its dimmed colour. Two comments in the file also name
  the bar and need reworking: the `.board-square__mark` header lists "having
  moved" among the interaction markings, and the dampened-ship comment
  explains a ship is faded "because it has moved and has no target left" and
  that "Having moved is drawn separately, at the square's top edge, and never
  dampens a ship by itself" — with the bar gone, a dampened ship is a pinned
  ship and nothing else.
- **`Board.tsx`** — the `hasActed` computation and both places it is passed
  down go, and the comment above `shipCondition` loses the paragraph
  explaining how having acted relates to the condition.

What stays: `NoActionMark`, the bottom-edge hollow bar, and the dampened
ship. Those mark a pinned ship — a state a player really can reach — and are
only renamed, per the bullet above.

- **`guideDiagrams.tsx`** — the guide never draws the bar, but its header
  comment names it among the marks its diagrams omit; update the comment.

### Tests

Roughly forty test files build a `GameState` literal and will need the two
removed fields taken out; most are mechanical. The ones with real work:

- **`ply.test.ts`, `actions.test.ts`, `movement.test.ts`,
  `combat.test.ts`** — every case that sets `actedThisPly` to prove a
  second attempt by the same ship is refused is testing a rule that no
  longer exists, and goes rather than being adapted.
- **`session.test.ts`** — the `ship-already-acted` rejection cases go.
- **`announcements.test.ts`** — expected sentences lose their action counts;
  any case asserting the "1 action left" wording goes with the branch.
- **`Board.test.tsx`, `squareLabel.test.ts`, `BoardSquare.test.tsx`** — every
  case covering the already-acted bar or its label segment goes. The cases
  covering the no-action marking stay, with renamed wording.
- **`rulesVersion.test.ts`** — unchanged, but it pins the version bump below.

## Notes

- This is a **rules change but not a gameplay change**: `rules.md` goes to
  **0.32**, `RULES_VERSION` follows, and `changelog.md` gains an entry
  saying in as many words that the game plays exactly as it did under 0.31.
  Tagging stays on hold either way.
- **`CLAUDE.md`'s Vocabulary section** defines *Action*, and defines *Ply* as
  "two actions" — stale twice over. The *Action* entry goes and *Ply* becomes
  one move or one attack.
- **`README.md`** — line 5 says "six the standard game"; the paragraph at
  line 77 says each player "takes one action a turn — a move or an attack".
  Both need the wording; the second can simply say each player moves one
  ship or attacks with one.
- The guide screen (`src/guide/guideCopy.ts`) already avoids the word and
  needs no change.
- Per the project's pre-release stance, no accessibility work is owed. The
  accessible name loses its "already acted this turn" segment, but that
  segment could never appear on a real board, so nothing is lost and
  `known-issues.md` needs no entry.
