# Implementation Plan — Story 00000069, Retire the action

## What this story does

A turn has been **one action** since story 00000018. What survives is the
machinery of a count that can only ever reach one: `ACTIONS_PER_PLY = 1`, a
`GameState.actionsRemaining` that is always 1, a `GameState.actedThisPly`
that is always empty everywhere a caller can observe it, a refusal reason
(`ship-already-acted`) no player can provoke, a board marking (the solid bar
at a square's top edge) no player can see, and an announcement branch
("Green has 1 action left.") the live region can never speak.

This story deletes the concept. After it, a turn **is** a move or an attack;
there is no smaller unit, nothing to count, and nothing carried from one
player's turn into the next. Two pieces of cleanup ride along: `rules.md`
stops naming a "standard game" among the four pre-game choices, and both
appendices leave `rules.md` for a new `doc/ruleset/tech-notes.md`.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions, because code in this repository deliberately
carries no design history (`CONTRIBUTING.md`, "Comments").

**The game plays identically afterwards.** No legal move, cost, countdown,
draw or score changes, and no recorded game's random sequence moves. Every
rule touched is already a rule about a turn; only words change.

## Baseline on this branch

Branch `69-retire-actions`, clean at the start. `npm test` gives **64 test
files, 1216 tests, all green**; `npm run typecheck` and `npm run lint` are
clean. `npm run format:check` reports **two pre-existing warnings** —
`src/board/planetArt.ts` and this folder's `story.md` — which are not this
story's to fix and must not be "tidied" in passing. The test count will
**fall** over this story as unreachable cases are deleted; that is expected
and is not a regression.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say. Do not mix them (`CLAUDE.md`, Vocabulary).
- **Move** is the movement action specifically and is never a synonym for a
  turn or a ply.
- **Action** is the word this story retires. After Step 7 the codebase should
  not use it for a game concept at all — say "a move or an attack", or name
  the one you mean. Ordinary English uses unrelated to the game ("the default
  action for a focused element" in `AccessibleGrid.tsx`, "the actions that
  move between screens" in `useAppScreen.ts`) are **not** in scope.
- **Node** is the word everywhere.

## Settled decisions — do not reopen

These come from `story.md` and the discussion while it was written. A step
that finds one inconvenient should escalate to the owner, not re-decide.

- **S1. The concept goes entirely**, not "goes but stays available":
  `ACTIONS_PER_PLY`, `actionsRemaining`, `actedThisPly`, the
  `ship-already-acted` refusal, the already-acted board marking and its label
  segment, and the "N actions left" announcement branch are all deleted.
  Nothing is left behind "in case a turn becomes two actions again".
- **S2. The pass rule stays**, both its reasons (nothing legal to do, and out
  of time), and §8.6 step 7's relief that exists to prevent the first.
- **S3. The "cannot move or attack" board marking stays** — the faded ship
  and the hollow bar at the square's **bottom** edge. It marks a pinned ship,
  a state a player really can reach. Only the **solid top-edge** bar, which
  marked a ship that had already acted, is retired.
- **S4. `rules.md` names no default at all** for the four pre-game choices —
  fleet size (§4), charged-node count (§8.1), rounds (§9) and clock (§10). It
  lists the options and stops. It does **not** gain replacement wording such
  as "we suggest" or "usually".
- **S5. The app's preselected options are unchanged.** `DEFAULT_FLEET_SIZE`
  (6), `DEFAULT_CHARGED_NODE_COUNT` (5), `DEFAULT_GAME_LENGTH_ROUNDS` (30)
  and `DEFAULT_CLOCK_SETTING` ("none") keep their names and their values; the
  start screen preselects exactly what it does today. Only the **comments**
  that call them "§4's standard game", "§8.1's standard game" and "§10's
  standard game" change, to say they are the app's default.
- **S6. Both appendices move to `doc/ruleset/tech-notes.md`** as sections of
  its own — Appendix A's open items (there are none at present, and the
  section carries across saying so) and Appendix B's queue sizing. It is a
  development document, not part of the ruleset a player reads.
- **S7. This is a rules change but not a gameplay change.** `rules.md` goes
  to **0.32**, `RULES_VERSION` in `src/rules/rulesVersion.ts` follows, and
  `doc/ruleset/changelog.md` gains **one** 0.32 entry saying in as many words
  that the game plays exactly as it did under 0.31. **One version bump for
  the whole branch** — no later step bumps again. **Tagging stays on hold**
  (`CLAUDE.md`): bump and write the entry, do not run `/tag-rules`.
- **S8. `ply.ts`'s `applyEndOfActionTail` becomes `endPly`**, unconditional:
  every move and every attack ends the ply, so it runs the end-of-turn
  sequence, advances the ply number and swaps sides every time, then runs the
  pass guard as it does today. Its `actedShipId` parameter goes.
  `EndOfActionEffect` becomes **`EndOfPlyEffect`** (owner's ruling, see O1).
- **S9. `PassReason`'s `"no-legal-action"` becomes `"cannot-move-or-attack"`.**
- **S10. Per `CLAUDE.md`'s pre-release stance: no plan steps for testing
  accessibility, and no review fixtures or manual test scripts** — the owner
  drives manual testing himself. Where an existing automated test has a
  straightforward path to being updated, update it. The accessible name loses
  its "already acted this turn" segment, but that segment could never appear
  on a real board, so nothing is lost and
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md` needs **no**
  entry for this story. Live-region wording stays out of the manual step —
  the automated suite covers it.

## Owner rulings taken at the plan-approval gate

These were put to the owner when the plan was presented and answered. They
are settled — do not reopen them.

- **O1. The effect union is `EndOfPlyEffect`, not `PlyEndEffect`.**
  `story.md` proposed `PlyEndEffect`; the owner rejected it because
  `PlyEndedEffect` already exists, stays, and means a different thing — the
  single `ply-ended` effect, which is one member of the union. Two names two
  letters apart for different concepts is a reading hazard. `EndOfPlyEffect`
  keeps the shape of the name it replaces (`EndOfActionEffect`). This
  overrides `story.md` where the two disagree.
- **O2. Editing `CLAUDE.md`'s Vocabulary section is approved.** Drop the
  **Action** entry and restate **Ply** as one move or one attack. The owner
  gave this its own go-ahead because `CLAUDE.md` is pipeline configuration
  rather than product code.

## Decisions this plan makes

- **D1. `src/rules/actions.ts` becomes `src/rules/canMoveOrAttack.ts`**,
  exporting `sideToMoveCanMoveOrAttack` and `shipCanMoveOrAttack` (today
  `sideToMoveHasLegalAction` and `shipHasLegalAction`), with
  `actions.test.ts` renamed to `canMoveOrAttack.test.ts` alongside it. The
  module itself **survives**: it is still the only place that asks a question
  neither §6 nor §7 owns, and keeping it is what stops `movement.ts` and
  `combat.ts` importing each other. The names are long but coin nothing.
  _Rejected:_ inventing a fresh collective noun ("deed", "play", "act") for
  "a move or an attack" — that is exactly the habit this story is ending.
  _Rejected:_ folding the two functions into `ply.ts` — it would put a
  legality question in the module that applies results, and `Board.tsx`
  (which needs `shipCanMoveOrAttack` for the square condition) would then
  import from `ply.ts`, widening what the board layer depends on.
- **D2. `ShipCondition`'s member `"no-action"` becomes
  `"cannot-move-or-attack"`,** its wording "no action available this turn"
  becomes "cannot move or attack this turn", and the machinery that draws it
  is renamed to match: the `NoActionMark` component becomes
  `CannotMoveOrAttackMark` and the CSS class
  `.board-square__mark--no-action` becomes
  `.board-square__mark--cannot-move-or-attack`. `story.md` names only the
  type member and the wording, but leaving a component and a class named for
  a retired concept would re-create exactly the drift this story removes, and
  both are internal names with no player-visible effect. The value string
  `"cannot-move-or-attack"` deliberately matches `PassReason`'s new member
  (S9); they are different types describing the same fact about a ship or a
  side, and the echo is a feature, not a collision.
- **D3. `turnEndingClauses` throws rather than returning nothing** when a
  `moved` or `attacked` event carries neither a `ply-ended` nor a
  `ply-passed` effect. That combination is unreachable once a move or an
  attack always ends the ply, and `announcements.ts` already throws a
  `RangeError` for the equivalent impossible shape in `fightSentence` ("an
  attacked event always carries a fight-resolved effect"). Following that
  precedent keeps the impossible loud instead of producing a sentence with a
  trailing space. No test is owed for it — the file's existing throws have
  none either. _Rejected:_ returning an empty clause list, which would let a
  future regression pass silently.
- **D4. The board layer is cleared before the rules layer.** Steps 2 to 4
  strip the already-acted marking, the refusal and the announcement counting
  **before** Step 6 removes the two `GameState` fields. Working the other way
  round would break the same test cases twice: once when the fields vanish
  and again when the marking and refusal they were built to exercise vanish.
  Every step in this order is independently green, and each test case is
  edited once.
- **D5. The two fields leave `GameState` in a single step (Step 6).** Around
  twenty-five test files build a `GameState` (usually through a local
  `buildState` helper) carrying `actionsRemaining` and `actedThisPly`. Both
  are **required** fields, so the moment they leave the interface every one
  of those literals is a compile error under TypeScript's excess-property
  check — the removal cannot be staged file by file and still leave a green
  step. _Rejected:_ making the fields optional first and removing them later.
  It would edit the same twenty-five files twice, and would commit an interim
  type that lies about a state the code no longer maintains. What Steps 2 to
  5 **do** achieve is shrinking Step 6 to the mechanical edit: by the time it
  runs, no production module outside `gameState.ts`, `ply.ts` and `relief.ts`
  reads either field, so the step is one real change plus a sweep the
  compiler enumerates exactly.
- **D6. Tests that exist only to prove the retired rule are deleted, not
  adapted.** A case whose subject is "a second attempt by the same ship this
  ply is refused", "the ply continues with one action left", or "the
  already-acted bar is drawn" is testing a rule that no longer exists.
  Deleting it is the point of the story, and the falling test count is the
  evidence.
- **D7. Tests that used `actedThisPly` as a convenient way to pin a ship are
  rebuilt, not deleted.** Four cases (named in Step 3) set `actedThisPly` not
  to test the acted rule but to manufacture a side with nothing to do, so the
  pass guard would fire. Their subject — that a passed turn still runs §8.6
  in full — is live rules and worth keeping, so each is rebuilt with a
  genuinely pinned position. Step 3 gives the recipe.
- **D8. The retired word is swept out of code comments and one private
  helper name (Step 7).** `story.md` lists the files it knows about;
  `src/board/EnergyOverlay.tsx`'s private `endOfActionSettlements` and
  `src/rules/endOfTurn.ts`'s comments about "the ply's own action" are the
  ones it does not, and they are in the spirit of S1. This is a comment and
  private-name sweep only: no exported name changes in Step 7.

## Step sequence at a glance

1. `rules.md` 0.31 → 0.32, `tech-notes.md`, and the comments that quote the
   removed wording (docs, own commit, ahead of the code).
2. Retire the already-acted marking and label segment; rename the condition
   that stays.
3. Retire the `ship-already-acted` refusal.
4. The announcement layer stops counting actions.
5. Rename the concept in the rules layer: `canMoveOrAttack.ts` and
   `PassReason`.
6. `actionsRemaining`, `actedThisPly` and `ACTIONS_PER_PLY` leave the game
   state; `applyEndOfActionTail` becomes `endPly`.
7. `README.md`, `CLAUDE.md` and the sweep for the retired word.
8. The owner plays a game and reads the new documents (manual gate).

---

### Step 1 — `rules.md` 0.31 → 0.32, and the appendices move to `tech-notes.md`

Status: committed

Notes: Removed §2's Action entry and reworded Turn; retitled §5 to "Turns" and
reworded its body without "action", keeping the pass rule and §8.6 step 7's
relief; reworded §7.2, §8.3, §8.6's remaining "action" mentions; removed
"standard game" from §2, §4, §8.1, §9 and §10, naming no default. Created
`doc/ruleset/tech-notes.md` with the "Open items" and "Sizing the queue"
sections (Appendix A and B verbatim in substance, references to `rules.md`
made explicit), deleted both appendices from `rules.md`, and turned its three
"(Appendix B)" cross-references into links to `tech-notes.md`. Bumped
`rules.md` to 0.32, `RULES_VERSION` to match, and added one changelog entry.
Updated the "standard game" and "Appendix B" comments in `fleet.ts`,
`nodes.ts`, `clock.ts`, `gameState.ts`, `seededReplay.test.ts`,
`gameState.test.ts`, `nodes.test.ts` and `nodePool.test.ts` (`gameLength.ts`
already said "default game length" and needed no change, as anticipated).
One deviation: prettier's markdown formatter rewrapped one paragraph in
§8.6 (a "(section 5)" line break was ambiguous with an ordered-list marker)
and one changelog line (`*Action*` → `_Action_` emphasis style); both were
accepted as the pre-existing prettier style, not a content change. All
checks green: typecheck, lint, and `npm test` (64 files, 1216 tests, same
count as baseline) all pass; `format:check` reports only the two
pre-existing warnings (`planetArt.ts`, this folder's `story.md`); grepping
`doc/ruleset/` and `src/` for "standard game" and "Appendix" finds hits only
in `changelog.md`'s historical entries.

Update `doc/ruleset/rules.md` so it no longer speaks of an **action** and no
longer names a **standard game**, move both appendices into a new
`doc/ruleset/tech-notes.md`, bump the document to **0.32**, bump
`RULES_VERSION` in `src/rules/rulesVersion.ts` to match, and add **one**
`doc/ruleset/changelog.md` entry for 0.32, newest first, in the shape the
0.31 entry uses. This step is **its own commit, ahead of all code changes** —
the document is what the later steps implement.

**In `rules.md`, the action goes:**

- **§2, "Words used in these rules"** — delete the **Action** entry outright;
  nothing replaces it, since move and attack each have their own section. The
  **Turn** entry's second sentence, "A turn is one action", becomes a plain
  statement that a turn is one move or one attack.
- **§5** — retitle from "Turns and actions" to **"Turns"** and rewrite the
  body: Green takes the first turn, the players alternate, and on a turn a
  player either moves one ship or attacks with one ship. The sentence "A
  player must take as many of their turn's actions as are available" **goes** —
  with one thing to do there is no "as many as". The pass rule **stays**,
  reworded: if a player can neither move nor attack, their turn passes; the
  paragraph's reasoning (an attack reaches only as far as the attacker's
  power allows, a ship holding a node has no attack, a trapped ship can do
  neither, §8.6 step 7 exists to prevent the all-trapped case) stays, worded
  without "action". The out-of-time paragraph stays as it is.
- **§7.2** — "This is not a special action — it is an ordinary move…"
  becomes wording that does not use the word. (`story.md` says §7.1; the
  sentence is in fact in §7.2, "Returning by choice". Read both.)
- **§8.3** — "Because a move is one action and a turn is one action, **at
  most one countdown can start per turn**" becomes the same claim from the
  same premise, worded as a turn being one move or one attack. The bolded
  conclusion is load-bearing for the queue-sizing argument and must survive
  intact.
- **§8.6** — the paragraph beginning "A turn that passes because no legal
  action was available (section 5)…" and the two later sentences about a
  node's state never changing "as part of resolving an action" all lose the
  word without losing their meaning.

**In `rules.md`, the standard game goes** (S4) — four places, each of which
lists options and then declares one of them the real game:

- **§2's Round entry** — "and 30 is the standard game (section 9)".
- **§4** — "**six is the standard game**".
- **§8.1** — "with **five the standard game**".
- **§9** — "with **30** the standard game".
- **§10** — "with no clock the standard game".

Each becomes a list of the options and nothing more. Do not replace the
phrase with a softer recommendation.

**The appendices move (S6).** Create `doc/ruleset/tech-notes.md`:

- Open with a short statement of what the document is: development notes for
  Base Control, not part of the ruleset a player reads — measured figures,
  the argument behind the queue's size, and what the app's long-run tests
  guard. Point back to `rules.md` for the rules themselves.
- **"Open items"** — carries across as it stands: nothing is currently
  outstanding, and the section will list items again when there are any.
- **"Sizing the queue"** — the whole of Appendix B, verbatim except that its
  "a move is one action and a turn is one action" premise is reworded like
  §8.3's, and its section references to `rules.md` still read correctly from
  a separate file (a reference to "section 3.2" should say which document it
  means, or link to it).
- Delete both appendices from `rules.md`, along with the `---` separators
  they brought with them.
- The three "(Appendix B)" cross-references in `rules.md` (§8.1's "never left
  short", §8.2's queue-size sentence, §8.3's one-countdown-per-turn sentence)
  become **links** to `tech-notes.md`, in the style `rules.md` already uses
  for links.

**Comments in `src/` that quote the removed wording** — comment-only edits,
no behaviour, no renames (S5):

- `src/rules/fleet.ts` — "§4's standard game: six ships a side."
- `src/rules/nodes.ts` — "§8.1's standard game: five charged nodes."
- `src/rules/clock.ts` — "§10's standard game: no clock", and
  `CLOCK_SETTINGS`' comment "leftmost is the standard game".
- `src/rules/gameState.ts` — `StartingGameStateOptions`' "fall back to the
  standard game's defaults".
- `src/rules/gameLength.ts` — already says "§9's default game length"; check
  it and leave it if it is still true.
- `src/rules/seededReplay.test.ts` — the header comment's "at the standard
  game's five charged (0.30)".
- `src/rules/gameState.test.ts` and `src/rules/nodes.test.ts` — two test
  titles say "§8.1's standard game"; reword to the app's default.
- `src/rules/nodePool.test.ts` — every "Appendix B" reference in its comments
  and its `describe` title now points at a document that no longer has
  appendices; retarget them at `tech-notes.md`'s "Sizing the queue". Its
  comment "the same restraint a real game is under, since a turn is one
  action" is reworded too.

Everything the comments describe keeps its current name and value.

**Changelog.** One `## 0.32` entry, newest first, that says: the word
_action_ leaves the document; §5 becomes "Turns" and states a turn as one
move or one attack; the pass rule is unchanged in substance; no choice is
called a standard game any more; both appendices move to `tech-notes.md`.
State plainly that **this is not a gameplay change — the game plays exactly
as it did under 0.31** — and that tagging stays on hold (`CLAUDE.md`).

Depends on: nothing. It is the first step because it is the document the rest
of the story implements.

Verification (automated): `npm test` — `src/rules/rulesVersion.test.ts`
asserts `RULES_VERSION` equals the version in `rules.md` and that
`changelog.md` has an entry for it, so a mismatched bump fails here. Then
`npm run typecheck` and `npm run lint` (comment-only edits must not have
broken either) and `npm run format:check`, which must report only the two
pre-existing warnings noted in the baseline. Finally, grep `doc/ruleset/` and
`src/` for "standard game" and for "Appendix": the only remaining hits should
be in `changelog.md`'s historical entries, which are never rewritten.

---

### Step 2 — Retire the already-acted marking, and rename the condition that stays

Status: committed

Notes: Removed the top-edge already-acted bar in full — `BoardSquare.tsx`'s
`hasActed` prop, `AlreadyActedMark` component and `ALREADY_ACTED_BAR_TOP_INSET`
constant, `BoardSquare.css`'s `.board-square__mark--already-acted` selector
line, `squareLabel.ts`'s `hasActed` field and `ALREADY_ACTED_WORDING`, and
`Board.tsx`'s `hasActed` computation and both call sites — and renamed the
surviving marking per D2: `NoActionMark` → `CannotMoveOrAttackMark` and its
CSS class, `ShipCondition`'s `"no-action"` → `"cannot-move-or-attack"` and its
wording to "cannot move or attack this turn". Reworded the module-header and
inline comments in all four files plus `guideDiagrams.tsx`'s header comment.
Deleted the `BoardSquare.test.tsx`, `squareLabel.test.ts` and `Board.test.tsx`
cases whose subject was the already-acted bar or its label segment, renamed
the surviving condition cases' wording, and collapsed the `hasActedValues`
combinatorial loop in `BoardSquare.test.tsx` down to iterating conditions
only. Left untouched, per the step's own instruction, the `Board.test.tsx`
cases that build `actedThisPly` states to check destinations/targets and the
`ship-already-acted` rejection case — those are Step 3's. No deviations.
Verification: `npm run typecheck`, `npm run lint` and `npm test` all green
(64 files, 1205 tests, down from the 1216 baseline as expected). The
specified grep for `hasActed`, `already-acted`, `AlreadyActed` and "already
acted" finds hits only in `src/game/session.ts`, `src/board/announcements.ts`,
`src/rules/movement.ts`, `src/rules/combat.ts`, `src/rules/actions.ts` and
`src/rules/gameState.ts` (all the `ship-already-acted` refusal, Step 3's) and
in test files covering that refusal.

The board draws **two** short bars in the same accent: a **solid** bar at a
square's **top** edge for a ship that has already acted, and a **hollow** bar
at the **bottom** edge for a ship that can neither move nor attack. The first
can never be seen in a real game (a move or an attack ends the turn
immediately) and is retired; the second marks a pinned ship, a state a player
really reaches, and **stays** (S3), renamed to say what it means (D2).

**`src/board/BoardSquare.tsx`** — delete the `hasActed` prop from
`BoardSquareProps`, the `AlreadyActedMark` component, the
`ALREADY_ACTED_BAR_TOP_INSET` constant and the `{hasActed && …}` render.
`CONDITION_BAR_WIDTH`, `CONDITION_BAR_HEIGHT`, `CONDITION_BAR_BOTTOM_INSET`
and `CONDITION_BAR_STROKE_WIDTH` are **shared with the surviving mark and
stay** — only the top inset belonged to the retired bar. Rename `NoActionMark`
to `CannotMoveOrAttackMark` and its class (D2), and rewrite the module header
comment: it currently explains that having moved and the condition are
independent facts and that having moved never dampens a ship by itself. With
the bar gone, a dampened square is a pinned ship and nothing else.

**`src/board/BoardSquare.css`** — the retired bar's colour rule is the
**first half of a comma selector it shares with the surviving mark**:

```
.board-square__mark--already-acted,
.board-square__mark--no-action {
  color: var(--color-text-dim);
}
```

Delete **only** the first selector line and rename the second (D2); the rule
itself must survive, or the pinned-ship bar loses its dimmed colour. Two
comments in the file also name the retired bar: the `.board-square__mark`
header lists "having moved" among the interaction markings, and the
dampened-ship comment says a ship is faded "because it has moved and has no
target left" and that "Having moved is drawn separately, at the square's top
edge, and never dampens a ship by itself". Both are reworded to describe a
pinned ship only.

**`src/board/squareLabel.ts`** — delete the `hasActed` field from
`SquareLabelDescriptor`, the `ALREADY_ACTED_WORDING` constant and the segment
it pushes. Rename `ShipCondition`'s member and its `CONDITION_WORDING` entry
(D2). Rewrite the module header comment, which currently describes the label
as having three independently optional fields and explains how having acted
relates to the condition.

**`src/board/Board.tsx`** — delete the `hasActed` computation (the only
reader of `state.actedThisPly` outside `src/rules/`) and both places it is
passed down, to `BoardSquare` and to `squareLabel`. The comment above
`shipCondition` loses its paragraph about how having acted relates to the
condition; what remains is that the condition is computed for the side to
move only, and means the ship can neither move nor attack. Follow D2's rename
through the `"no-action"` literal here.

**`src/guide/guideDiagrams.tsx`** — its header comment says no square carries
"a selection mark, an already-acted bar or a condition bar"; drop the retired
bar from the list. No diagram changes.

**Tests.** In `src/board/BoardSquare.test.tsx`, the cases "renders the
already-acted bar from hasActed alone…", "renders both the already-acted bar
and the no-action bar together…" and "distinguishes the already-acted bar
from the no-action bar by fill…" all go (D6); "renders the hollow bar and the
dampened class for no-action…" **stays**, with its class name and condition
value renamed and its comparison against the retired bar dropped. The file
also loops over a `hasActedValues` array in a combinatorial case near the end
— collapse the loop rather than deleting the case. In
`src/board/squareLabel.test.ts`, the cases asserting the "already acted this
turn" segment go; the cases covering the condition segment stay with the new
wording. In `src/board/Board.test.tsx`, the cases "marks a ship that has
already acted this ply as also carrying no-action", "reads a ship that has
already acted as such…", "reads a moved ship as both acted and out of
actions…" and "reads a moved ship with no legal move and no legal target as
both moved and out of actions" go; the pinned-ship and trapped-ship condition
cases stay with the new wording. Cases in `Board.test.tsx` that build
`actedThisPly` states to check **destinations and targets** are Step 3's, not
this step's — leave them alone here.

Do **not** touch `GameState` in this step: `actedThisPly` still exists and is
still maintained; nothing reads it in the board layer any more.

Depends on: Step 1 (the rules document no longer describes the marking's
subject). Later steps depend on this one only in that it removes board-layer
readers of `actedThisPly` ahead of Step 6 (D4).

Verification (automated): `npm run typecheck`, `npm run lint` and `npm test`
all green, with a lower test count than the baseline. Then grep `src/` for
`hasActed`, `already-acted`, `AlreadyActed` and "already acted": the only
remaining hits should be in `src/game/session.ts` and
`src/board/announcements.ts` (the `ship-already-acted` refusal, Step 3) and
in test files covering that refusal. The visual check — that a real board
never draws a top-edge bar and still fades a pinned ship — is Step 8's.

---

### Step 3 — Retire the `ship-already-acted` refusal

Status: committed

Notes: Dropped `"ship-already-acted"` from `MoveRefusalReason` and
`AttackRefusalReason` and the matching checks in `moveRefusalReason`,
`legalDestinations`, `attackRefusalReason` and `legalTargets`; folded the
retired `eligibleShips` into its only caller, `sideToMoveHasLegalMove`.
Reworded the doc comments in `movement.ts`, `combat.ts` and `actions.ts`.
Deleted `isSelectable` and both `ship-already-acted` rejection sites in
`session.ts`, and the matching `rejectionSentence` case and sentence in
`announcements.ts`. Deleted the already-acted-testing cases in
`movement.test.ts`, `combat.test.ts`, `actions.test.ts`, `ply.test.ts`,
`session.test.ts`, `announcements.test.ts` and `Board.test.tsx` per D6,
keeping the surviving `not-your-ship` half of `movement.test.ts`'s combined
case as its own case, and trimming a `moved`-then-refused test in `ply.test.ts`
down to just its still-live subject (the ply-ended effect on a self-returning
attacker). Rebuilt the four D7 cases with genuinely pinned positions rather
than deleting them: `ply.test.ts`'s two `applyPassGuard` cases and
`endOfTurn.test.ts`'s "pays the side that passes while standing on a charged
node" case now pin the ship with a charged node it holds (attacker-on-charged-
node) or, for the "runs the end-of-turn sequence" case, boxed in for movement
by enemies on its affordable orthogonal neighbours; `endOfTurn.test.ts`'s
depleted-node case simply lost its `actedThisPly` line, as the plan's recipe
anticipated, since the trap already pins it. All four keep their original
assertions (the `ply-passed`/`ply-ended` effect and the end-of-turn
collection) unweakened. Also removed now-dead `actedThisPly` plumbing left
over from Step 2 in `Board.test.tsx`'s `attackState`, `rangeState` and
"selection markings" fixtures, since no case exercises it any more and it
carried no visible effect after Step 2's marking removal — not explicitly
named by the plan, but in the spirit of D6/D8 and flagged here as the one
notable deviation. Verification: `npm run typecheck`, `npm run lint` and
`npm test` all green (64 files, 1189 tests, down from 1205 after Step 2, as
expected); `npm run format:check` reports only the two pre-existing warnings
after running prettier on the two files it flagged post-edit; `grep -rn
"ship-already-acted" src/` finds no hits.

With `actedThisPly` unread by the board, remove the rule that a ship which
has already acted may not act again. It cannot fire: a move or an attack ends
the ply, so the acting side never gets a second attempt.

**`src/rules/movement.ts`** — drop `"ship-already-acted"` from
`MoveRefusalReason`, drop the corresponding check in `moveRefusalReason` and
the `state.actedThisPly.includes(shipId)` term in `legalDestinations`. The
private `eligibleShips` then means nothing more than "the side to move's
ships": fold it into its only caller, `sideToMoveHasLegalMove`, and delete
it. Update the doc comments that enumerate the checks in order, and check
whether the `Ship` type import is still used.

**`src/rules/combat.ts`** — drop `"ship-already-acted"` from
`AttackRefusalReason`, and the matching checks in `attackRefusalReason` and
`legalTargets`, with the same comment updates.

**`src/rules/actions.ts`** — comments only in this step (its rename is Step
5): both doc comments explain the functions in terms of ships that have not
yet acted. Reword to say the side's ships, and a ship's own legal move or
attack target.

**`src/game/session.ts`** — `isSelectable` is now always true, so delete it
along with both `rejected(session, "ship-already-acted", …)` sites (one in
`activateWithNoSelection`, one in `activateWithSelection`) and the doc
comment explaining it. `RejectionReason` is the union of the two refusal
types, so the member disappears from it automatically.

**`src/board/announcements.ts`** — `rejectionSentence`'s switch is exhaustive
over `RejectionReason`, so its `case "ship-already-acted"` becomes a
compile error the moment the member goes; delete the case and its sentence
("That ship has already acted this turn. Choose another.").

**Tests to delete** (D6): `src/rules/movement.test.ts`'s already-acted cases
(including the one asserting `ship-already-acted` alongside `not-your-ship`,
whose surviving half must be kept as its own case);
`src/rules/combat.test.ts`'s "refuses a ship that has already acted this ply,
leaving it with no targets"; `src/rules/actions.test.ts`'s two "is false for
a ship that has moved…" cases; `src/rules/ply.test.ts`'s five cases refusing
a second move or attack by a ship that has already acted;
`src/game/session.test.ts`'s two `ship-already-acted` rejection cases;
`src/board/announcements.test.ts`'s case for that rejection sentence;
`src/board/Board.test.tsx`'s "shows neither targets nor destinations for a
ship that has already acted", "offers no highlight for a target beyond the
eight neighbours when the attacking ship has already acted", and "rejects
activating an own ship that has already acted this turn".

**Tests to rebuild, not delete** (D7). Four cases set `actedThisPly` only to
manufacture a side with nothing to do, so the pass guard would fire. Their
subject is live rules — a passed turn still runs §8.6 in full — so each keeps
its assertions and gets a genuinely pinned position instead:

- `src/rules/ply.test.ts` — the pass-guard case built on a ship at A1 with
  enemies at B1 and A2, and the case "runs the end-of-turn sequence for the
  passing side, so a ship that has moved and has no attack left still pays
  the node's energy…".
- `src/rules/endOfTurn.test.ts` — "pays the side that passes while standing
  on a charged node, through applyPassGuard" and "costs the side that passes
  nothing while standing on a depleted node, through applyPassGuard".

Recipe for a genuinely pinned ship: give it power such that only the free
orthogonal step and the 1-cost diagonal are affordable (power 0 or 1), and
bar every square within that reach — an **inactive or depleted node** on a
square bars landing on it (§6), and an **enemy ship** both blocks a path and
occupies its square. Two-square and L shapes cost 2, so a ship on power 1 or
less cannot reach past its eight neighbours at all. For the ship to have no
attack either, keep every enemy out of its affordable reach, or leave it
standing on a charged node (a node's holder cannot attack, §7) or trapped on
a depleted one. The depleted-node case above already pins itself through the
trap rule and may simply lose its `actedThisPly` line.

Depends on: Step 2 (the board no longer labels or draws having acted, so no
board test is left asserting a state this step makes unreachable).

Verification (automated): `npm run typecheck`, `npm run lint` and `npm test`
all green. Grep `src/` for `ship-already-acted` — no hits should remain. The
four rebuilt cases must still assert what they asserted before (a
`ply-passed` effect, and the end-of-turn collection or its absence); if any
of them can only be made to pass by weakening an assertion, stop and
escalate, because that would mean the pass guard's behaviour changed, which
this story must not do.

---

### Step 4 — The announcement layer stops counting actions

Status: pending

The live region still counts to one. This step takes the count out of the
wording and out of the events that carried it.

**`src/board/announcements.ts`:**

- Delete `actionsPhrase`.
- `turnPhrase` loses its `actionsRemaining` parameter and becomes just
  "Green's turn" (its call sites append the full stop today, so
  "Green's turn." is what a listener hears).
- `actionEndingClauses` becomes `turnEndingClauses`, loses its
  `actionsRemaining` parameter, and loses its final `return` — the
  "Green has 1 action left." branch. With that branch gone its `side`
  parameter has no reader; drop it too and update the call sites. Per D3,
  reaching the end of the function without a `ply-ended` or `ply-passed`
  effect throws a `RangeError` saying a move or an attack always ends the
  turn. Rename the single-clause wrapper `actionEndingClause` to match.
- `selectionCountsPhrase`'s "No actions available." becomes "No moves or
  attacks available."
- `passOpeningClause`'s "Green has no legal action, so the turn passes."
  becomes "Green cannot move or attack, so the turn passes." (The
  `PassReason` value it switches on is renamed in Step 5; this step changes
  only the sentence.)
- The `ACTIONS_PER_PLY` import goes with the last call that used it.
- `announcementForSession`'s doc comment gives "Green's turn — 2 actions
  left" as its example; update it.

**`src/game/session.ts`** — delete `actionsRemaining` from `MovedEvent` and
from `AttackedEvent`, and stop populating them in `activateWithSelection`.
`GameState.actionsRemaining` still exists at this point; the session simply
stops copying it out.

**Tests.** In `src/board/announcements.test.ts`: every expected sentence
loses its action count ("Red's turn, 1 action left." becomes "Red's turn.");
every case whose subject is a **mid-ply** announcement — a `moved` or
`attacked` event with no `ply-ended` and no `ply-passed` effect, asserting
"Green has 1 action left." — is deleted with the branch (D6); the remaining
event literals drop their `actionsRemaining` field. The file's `GameState`
literals still carry `actionsRemaining: ACTIONS_PER_PLY` and keep it until
Step 6. In `src/game/session.test.ts`, assertions on `event.actionsRemaining`
go; the case "passes the turn after one action, and the moved event says so"
keeps its subject (the turn passes) minus the count.

Doing the wording and the event fields in one step is deliberate: both edit
`announcements.test.ts`'s event literals, and splitting them would mean two
passes over the same forty-odd cases for no extra safety.

Depends on: Step 3 (the `ship-already-acted` rejection sentence is already
gone, so this step's pass over `announcements.ts` finds no stale case).

Verification (automated): `npm run typecheck`, `npm run lint` and `npm test`
all green. Grep `src/board/announcements.ts` and `src/game/session.ts` for
"action" — the only acceptable remaining hits are ordinary English unrelated
to the game concept. The suite's announcement coverage is what proves the new
sentences; no manual listening is asked for (S10).

---

### Step 5 — Rename the concept in the rules layer

Status: pending

Two names in `src/rules/` still carry the retired word even though what they
describe is live.

- **`src/rules/actions.ts` becomes `src/rules/canMoveOrAttack.ts`** (D1),
  exporting `sideToMoveCanMoveOrAttack` (was `sideToMoveHasLegalAction`) and
  `shipCanMoveOrAttack` (was `shipHasLegalAction`). Rewrite the module header
  comment: it opens "Actions at the §5 level (rules.md §5): an action is a
  move or an attack" and must now say what the module is for without the
  word — it is the only place that asks whether a side, or a ship, can move
  or attack at all, a question neither §6 nor §7 owns, and keeping it
  separate is what stops `movement.ts` and `combat.ts` importing each other.
  Rename `src/rules/actions.test.ts` to `canMoveOrAttack.test.ts` and update
  its `describe` titles. Callers to update: `src/rules/ply.ts` and
  `src/board/Board.tsx`.
- **`PassReason`'s `"no-legal-action"` becomes `"cannot-move-or-attack"`**
  (S9), in `src/rules/ply.ts` where the type and the `passPly` call site
  live, and in every test asserting the value: `src/rules/ply.test.ts`,
  `src/board/EnergyOverlay.test.tsx`, `src/board/announcements.test.ts` and
  `src/game/session.test.ts`. `announcements.ts` compares only against
  `"out-of-time"`, so its wording is untouched here (it changed in Step 4).
  Update `applyPassGuard`'s doc comment, which explains the guard in terms of
  "no legal action at all".

Use `git mv` for both file renames so the history follows.

Depends on: Step 4 (the announcement wording that quotes these concepts is
already settled, so this step is a pure rename with no wording decisions in
it).

Verification (automated): `npm run typecheck`, `npm run lint` and `npm test`
all green, with the **same** test count as after Step 4 — a rename must not
delete or add a case. Grep `src/` for `no-legal-action`, `hasLegalAction` and
`rules/actions`: no hits should remain.

---

### Step 6 — The two fields leave `GameState`

Status: pending

The state stops carrying a count that is always one and a list that is always
empty, and the ply tail stops pretending it might not end the ply.

**`src/rules/gameState.ts`** — delete `ACTIONS_PER_PLY`, the
`actionsRemaining` and `actedThisPly` fields from `GameState`, and both
entries in the object `startingGameState` returns. Update the module header
and any comment that describes the fields.

**`src/rules/ply.ts`:**

- `applyEndOfActionTail` becomes **`endPly`** (S8): no counting, no
  `actedShipId` parameter. It runs `runEndOfTurn`, advances `plyNumber`,
  swaps `sideToMove`, records the `ply-ended` effect and then runs
  `applyPassGuard` exactly as it does today. Both call sites (`applyMove` and
  `applyAttack`) drop their ship-id argument.
- `EndOfActionEffect` becomes **`EndOfPlyEffect`** (S8, O1) — the union of
  `PlyEndedEffect` and `PassEffect`. **Not `PlyEndEffect`**: the owner ruled
  against it because it sits two letters from `PlyEndedEffect`, which stays
  and means something different (the single `ply-ended` effect, one member of
  this union). `EndOfPlyEffect` keeps the shape of the old name and reads
  distinctly at every use site. Update the importer
  `src/rules/seededReplay.test.ts`.
- `passPly` stops resetting the two removed fields.
- The module header comment is largely about actions and the ply's actions
  being spent; rewrite it. `applyMove`'s and `applyAttack`'s doc comments
  each describe the ship being marked as having acted and one action being
  spent; those sentences go.

**`src/rules/relief.ts`** — the hypothetical state in
`wouldHaveLegalMoveIfFreed` no longer needs to empty `actedThisPly`; remove
the field and the half of the comment that explains why it was emptied. The
`sideToMove` override and its explanation stay — that part is still needed.

**`src/rules/trap.ts`** — delete the comment about not consulting
`actedThisPly`.

**Tests.** Around twenty-five files build a `GameState`, usually through a
local `buildState` helper, and each drops the two fields; `npm run typecheck`
enumerates them exactly. Beyond that mechanical sweep, `src/rules/ply.test.ts`
still holds cases whose subject is the count itself — a ply that continues
with actions remaining, assertions on `result.state.actionsRemaining` or
`actedThisPly` after a move or attack, and the `ACTIONS_PER_PLY` import.
Delete those cases (D6); keep every case whose subject is that the ply ended,
the side swapped or the pass guard fired. `src/board/announcements.test.ts`,
`src/rules/camping.test.ts` and `src/rules/recovery.test.ts` import
`ACTIONS_PER_PLY` for their state literals and lose the import with the
field.

Why this is one step and not several: both fields are required members of
`GameState`, so every literal in the suite fails to compile the instant they
go — the change cannot be staged and still leave a green step (D5). Steps 2
to 5 shrank it to this: one real behavioural simplification in `ply.ts` plus
a sweep the compiler lists for you.

Depends on: Steps 2 to 5 (the board layer, the refusal, the announcements and
the names are all clear of the fields, so no reader outside `gameState.ts`,
`ply.ts` and `relief.ts` remains).

Verification (automated): `npm run typecheck`, `npm run lint` and `npm test`
all green. Grep `src/` for `actionsRemaining`, `actedThisPly`,
`ACTIONS_PER_PLY`, `applyEndOfActionTail` and `EndOfActionEffect` — **no hits
at all** should remain. `src/rules/seededReplay.test.ts` and
`src/rules/fullGame.test.ts` are the load-bearing checks that the game still
plays and replays identically: they must pass **exactly as recorded**, with
no expectation re-recorded. If a recorded expectation moves, stop and
escalate — it would mean the random sequence changed, which this story
forbids.

---

### Step 7 — `README.md`, `CLAUDE.md`, and the sweep for the retired word

Status: pending

**`README.md`** — two places, both player-facing prose:

- Line 5's "you choose the size before play begins, with six the standard
  game" — the README may still say what the app preselects (S5), but not that
  one size is the real game. Simplest is to drop the clause.
- The long paragraph that says each player "takes one action a turn — a move
  or an attack". It can simply say each player moves one ship or attacks with
  one.
- Add a pointer to `doc/ruleset/tech-notes.md` alongside the rulebook and
  change log, in the paragraph near the end that links both, describing it as
  development notes rather than rules.
- Read the rest of the README against this story's changes and correct
  anything else it now misstates. The `/update-readme` command reviews the
  branch diff and can do this pass.

**`CLAUDE.md`** — its Vocabulary section is stale twice over: it defines
**Action**, and defines **Ply** as "two actions". Delete the **Action**
entry, and reword **Ply** as one move or one attack (keeping the note that
"ply" is preferred in code because it is unambiguous). `story.md` asks for
this explicitly, and **the owner has given an explicit go-ahead for this
edit** (O2) — make it without pausing. It is the one file in this story that
the pipeline itself reads, which is why it was put to the owner separately;
that question is now settled and should not be reopened.

**The sweep (D8)** — grep `src/` for "action" and settle every remaining
game-concept use:

- `src/board/EnergyOverlay.tsx` — the private helper `endOfActionSettlements`
  and the comment above it ("An action that ends a ply can be immediately
  followed by…"). Rename the helper for what it now describes (the
  settlements a ply's end produced) and reword the comment. Private to the
  module; no export changes.
- `src/rules/endOfTurn.ts` — several comments about "the ply's own action"
  having already resolved, and one about a trapped ship having "no action at
  all". Reword; the sequence itself does not change.
- Any comment left in a file this story touched that still explains the
  retired machinery.
- Leave alone: ordinary English uses that are not the game concept
  (`useAppScreen.ts`, `AccessibleGrid.tsx`), CSS comments about "fraction",
  and `changelog.md`'s historical entries.

Depends on: Step 6 (the code is in its final shape, so the sweep is over what
actually ships).

Verification (automated): `npm run typecheck`, `npm run lint`, `npm test` and
`npm run format:check` (only the two pre-existing warnings). Then grep `src/`
for "action" case-insensitively and confirm every remaining hit is ordinary
English unrelated to the game, and grep `README.md` for "standard game" and
"action" and confirm neither describes the game any more.

---

### Step 8 — The owner plays a game and reads the new documents

Status: pending

The final gate: the owner runs the app and reads the two documents this
story rewrote. Nothing in the app should look or behave differently except
that a marking a player could never see is gone.

Depends on: Step 7 (the whole story is implemented).

Verification (manual): run `npm run dev` in the dev container and open the
app.

1. **The start screen is unchanged.** Ships preselects 6, Charged nodes 5,
   Rounds 30, Clock none — exactly as before this story (S5). Every other
   option is still offered and still selectable.
2. **A turn is one move or one attack.** Start a game, move a ship: play
   passes to the opponent immediately, and the turn indicator follows. Do the
   same with an attack. There is never a moment when the same player is asked
   to act again.
3. **No bar at the top edge of any square, ever** — not on a ship that has
   just moved, not on the opponent's ships, not at any point in the game.
4. **The pinned-ship marking still works.** A ship trapped on a depleted node
   (stand on a charged node until its countdown runs out) draws faded, with
   the hollow bar at the **bottom** edge of its square, and the rest of the
   fleet is unaffected.
5. **A turn with nothing to do still passes**, and the game carries on
   normally afterwards.
6. **The Quick Guide screen is unchanged.**
7. **Read `doc/ruleset/rules.md`** — §2, §5, §4, §8.1, §9 and §10 — and
   confirm it reads as a rulebook that never knew the word "action" and names
   no standard game. Then read `doc/ruleset/tech-notes.md` and confirm it
   stands on its own as a development document, with `rules.md`'s three
   cross-references linking to it correctly.

If anything here fails, stop and report rather than adjusting the game to fit
— the game must play exactly as it did before this story.
