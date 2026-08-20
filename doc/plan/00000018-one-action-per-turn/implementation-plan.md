# Implementation Plan — 00000018 One action per turn

This plan turns [`story.md`](./story.md) into an ordered sequence of steps. Each
step is implemented, verified and committed on its own, by an agent that has
read only `story.md`, this plan, and its own step. Everything a step needs is
stated here — including the reasoning behind every decision, because the code
does not carry design history (CONTRIBUTING.md, "Comments").

## What this story changes

A turn stops being two actions and becomes **one**. Nothing else about actions
changes: the concept stays, `ACTIONS_PER_PLY` stays, and the ply machinery
stays exactly as general as it is today. Alongside it, the turn indicator drops
its action count and becomes a plain statement of who is up, in that player's
colour.

Five steps:

1. The rules edit — `rules.md` 0.8 → 0.9, a `changelog.md` entry, and
   `RULES_VERSION`.
2. `ACTIONS_PER_PLY` goes to 2 → 1, with the code comments and tests that
   spell out "two" following it.
3. `turnIndicatorText` and the `TurnIndicator` component: `GREEN TO PLAY` /
   `RED TO PLAY`, coloured by side.
4. The owner play-tests the game.
5. `README.md`.

## Sources of truth

- **The rules.** [`doc/ruleset/rules.md`](../../ruleset/rules.md), at **0.8**
  when this plan was written and **0.9** from Step 1 onwards. The sections this
  story edits are **§2** (words used), **§5** (turns and actions), **§7.1**
  (returning to a bay), **§8.5** (depleted and dormant sites) and one sentence
  of **§8.7** (end-of-turn order). Where the app and the document disagree, the
  document is right.
- **The rules change exactly once** — Step 1. No other step may touch
  `doc/ruleset/rules.md`, `doc/ruleset/changelog.md` or `RULES_VERSION`. If a
  later step turns up what looks like another rules ambiguity, **stop and raise
  it with the owner**; do not settle it in code.
- **No rules tag.** Tagging is on hold until the game plays (CLAUDE.md). Bump
  the version and write the changelog entry; do not run `/tag-rules`.
- **Vocabulary** (CLAUDE.md). `rules.md`, the UI and `README.md` say **turn**
  and **node**; code, tests and this plan say **ply** and **hub**. **Action** is
  the same word everywhere. "Move" is the movement action only — never a
  synonym for a turn.
- **Conventions.** [`CONTRIBUTING.md`](../../../CONTRIBUTING.md): comments say
  what a module does and carry no design history; logic stays out of components;
  DOM tests use the jsdom recipe (`// @vitest-environment jsdom` first line,
  per-file `import "@testing-library/jest-dom/vitest";`, `cleanup` in
  `afterEach`, axe with `color-contrast` disabled).

## Explicitly out of scope

From `story.md`, and binding on every step:

- **Accessibility work of any kind.** `announcementForSession` and the
  sentences it composes ("Red's turn, 1 action left") are knowingly left
  untouched, even though they now read oddly; the accessible grid, the live
  region and focus handling are not to be touched either. Test expectations for
  those sentences are updated only to match what the code now emits — the
  wording itself is not redesigned.
- **A test fixture that adjusts the board** to make scenarios easier to reach.
- **Rebalancing** node lifetimes, energy payouts or game length for the slower
  pace. §8.3's nine turns, §8.4's payouts and §9's 100 rounds are counted in
  turns and are untouched.
- **Removing the action concept**, collapsing `ACTIONS_PER_PLY` away, or
  simplifying the ply machinery because the count is now 1.
- **Any other HUD change** — the indicator's wording and colour only.

## Decisions

**D1 — The rules stay generic in the number of actions, wherever they can.**
Where 0.8 spells out "two actions", "both actions" or "the second action",
0.9 does not simply substitute "one": it states the rule in a form that holds
for **any** number of actions per turn, so that a later story changing the
count is a constant change and not a rewrite. Two places must still name the
number, because they are where the number is defined: §2's definition of a turn
and §5's statement of how many actions a turn holds. Everywhere else — §5's
obligation to take the actions available, §7.1's "already in its bay before…",
§8.5's stranded obligation, §8.7's "a turn in which both actions were taken" —
becomes count-neutral prose.

**D2 — `ACTIONS_PER_PLY` and the whole ply machinery stay.** At a count of 1,
`GameState.actedThisPly` can never hold more than one id, and the
`ship-already-acted` refusal in `ply.ts` can never fire in ordinary play (a
ship that acts ends the ply, so the next attempt by the same ship is refused
`not-your-ship` instead). It is still kept, and still tested — from a
directly-built state rather than by sequencing two actions — because it is the
guard that makes §5's "a ship may take at most one action per turn" true at any
count, and because removing it is explicitly out of scope. Rejected: deleting
the guard and its refusal reason as dead code, which would make a future count
of 2 or 3 a behavioural regression rather than a constant change.

**D3 — The indicator's wording lives in `announcements.ts`, its capitals and
colour in CSS.** (Confirmed by the owner, who pointed at the existing shouting
text — `BASE CONTROL`, `GREEN`, `RED`, `ROUND` — as the pattern to follow;
every one of them is stored sentence-case and uppercased by CSS.) `turnIndicatorText` returns sentence-case `"Green to play"` /
`"Red to play"`, and `TurnIndicator.css` uppercases with `text-transform`,
following the existing precedent of `GameOverPanel`'s heading and
`ScoreDisplay`'s side name, both of which are stored in sentence case and
uppercased by CSS. The colour comes from a side modifier class on the paragraph
(`turn-indicator--green` / `turn-indicator--red`), exactly as
`ScoreDisplay`'s `score-display--green` / `--red` do, resolving to the existing
`--color-green` / `--color-red` custom properties in `src/index.css`. Rejected:
returning a literal `"GREEN TO PLAY"` string from `announcements.ts` — the
repository consistently keeps shouting in the stylesheet, and a literal-caps
string is the kind of thing screen readers spell out letter by letter, which
would drag an accessibility question into a story that has ruled them out.
Rejected: putting the side name and the colour together in the component by
composing the sentence there — `TurnIndicator` renders `announcements.ts`'s
wording verbatim and composes none of its own, which is the arrangement
CONTRIBUTING.md asks for.

**D4 — `announcementForSession`'s sentences are left wrong on purpose.** They
will now say "Red's turn, 1 action left" at the start of every ply. `story.md`
leaves them to the accessibility story; the only change here is that their test
expectations are corrected to the text the code emits, so the suite stays green
and the staleness is visible in one place rather than as a failing build.

**D5 — `fullGame.test.ts`'s three-round game loses its attack assertion.** Its
`assertRefusesEverything` helper proves that once the game is over, a move and
an attack that were legal a moment earlier are both refused `game-over`. Under
one action per turn a three-round game is six actions long, and no two ships
ever come within reach of one another, so the helper now finds no attack and
throws. The helper is changed to report whether it found one, the hundred-round
game asserts that it did (that game does produce fights, and is where the
game-over refusal of attacks is genuinely proven), and the three-round game
tolerates its absence. Rejected: nudging the greedy policy or the starting
position so a fight happens inside three rounds — that is a board fixture,
which `story.md` puts out of scope, and it would change what the hundred-round
game plays out as well.

---

### Step 1 — Rules 0.9: a turn is one action

Status: committed

Notes: Edited `rules.md` (front matter, §2, §5, §7.1, §8.5, §8.7) per D1,
keeping the action count named only in §2's and §5's definitions and making
every other affected sentence count-neutral; added the `## 0.9 — one action
per turn` changelog entry; bumped `RULES_VERSION` to `"0.9"`. No deviation
from the plan — `ACTIONS_PER_PLY` was left untouched as instructed, and the
grep for "two actions\|both actions\|second action" in `rules.md` returns
nothing.

Edit [`doc/ruleset/rules.md`](../../ruleset/rules.md) and nothing else about
the game. Follow D1: name the count only where the count is defined, and make
every other affected sentence count-neutral.

- **Front matter** — `**Rules version: 0.8**` becomes `**Rules version: 0.9**`.
- **§2 "Words used in these rules"** — "A turn is two actions" becomes one
  action. The definition of **Action** currently reads "one of the two things a
  player does on their turn"; drop the count from it, keeping the two kinds
  (move a ship, or attack with a ship).
- **§5 "Turns and actions"** — "On a turn a player takes **two actions**"
  becomes one action. Delete the paragraph beginning "A ship may take **at most
  one action per turn**…", including its closing sentence "A turn's two actions
  therefore always involve two different ships": with one action per turn both
  sentences are true but say nothing, and `story.md` asks for them gone rather
  than left as dead text. Replace "A player must take both actions if two are
  available, and one if only one is" with a count-neutral statement of the same
  obligation — a player must take the turn's action(s) where available. Keep
  the passing rule and the reason it exists (an attack reaches only as far as
  the attacker's shields allow, so the game can never deadlock).
- **§7.1 "Returning to a bay"** — "so it is already in its bay before the
  attacking player's second action" no longer describes anything. Say instead
  that the placement happens immediately, as part of resolving the fight,
  before anything else happens. Keep the rest of the paragraph (the order of
  attacker then defender on a mutual return) unchanged.
- **§8.5 "Depleted and dormant sites"** — rewrite the obligation paragraph
  generically. The principle is unchanged and must be stated: **while any ship
  still owes an action, the turn's action must free one**. Delete the two-action
  worked examples — "the **first action** of the turn", "With one ship
  stranded, the first action frees it and the rest of the turn is the
  player's…", "With two ships stranded, both actions go to clearing them", "With
  three or more, the player clears two of their choice" — and say plainly that
  a player frees one stranded ship per turn and any others wait for later
  turns. Keep unchanged: that this is a restriction on what an action may be
  and not a penalty on top of one; the waiver when a stranded ship has no legal
  move at all; the closing note about the tail cost of holding several nodes.
- **§8.7 "End-of-turn order"** — "just as it would for a turn in which both
  actions were taken" becomes count-neutral (a turn in which an action was
  taken).
- **Leave alone**: §8.3's nine-turn life, §8.4's payouts, §9's 100 rounds,
  Appendix B's arithmetic — all counted in turns, not actions, so all still
  correct.

Then add a `doc/ruleset/changelog.md` entry at the **top** of the file (newest
first), headed exactly `## 0.9 — one action per turn` — the heading must match
`^## 0.9 ` for `rulesVersion.test.ts` to find it. Cover: the count itself; the
two §5 sentences removed as redundant; §7.1's and §8.7's corrected sentences;
§8.5's obligation restated for one action; and the note that this changes how
the game is played, so it would ordinarily be a tagging candidate, but tagging
is on hold until the game plays. Finally set `RULES_VERSION` in
`src/rules/rulesVersion.ts` to `"0.9"`.

Note for the implementer: this step deliberately leaves `ACTIONS_PER_PLY` at 2,
so between this commit and Step 2's the code plays a ruleset one version behind
the document. That is the ordering the plan guide asks for — the document is
what the next step implements — and it is corrected in the very next commit.

Depends on: nothing.

Verification (automated): `npm run test -- src/rules/rulesVersion.test.ts`
passes (the constant matches the document at 0.9 and the changelog has a 0.9
entry). Then `npm run typecheck`, `npm run lint`, `npm run format:check` and
`npm test` all pass — the full suite is expected to be green here, because no
behaviour has changed yet. Additionally, `grep -n "two actions\|both actions\|second action" doc/ruleset/rules.md`
returns nothing.

---

### Step 2 — `ACTIONS_PER_PLY` goes to 1

Status: pending

Change `ACTIONS_PER_PLY` in `src/rules/gameState.ts` from 2 to 1, and follow it
through the code comments and tests that hard-code "two". No structural change
to the ply machinery is expected or wanted (D2): `applyEndOfActionTail` and
`applyPassGuard` in `src/rules/ply.ts` already spend one action and end the ply
when none remain, `src/rules/stranded.ts` already binds while _any_ ship owes an
action, and `src/game/session.ts` reads the count from the state — all of them
are correct at 1 with no edit beyond comments.

**Comments to make count-neutral** (wording, not behaviour):
`src/rules/gameState.ts` — "How many of the ply's two actions remain", "never
more than two" on `actedThisPly`, and `startingGameState`'s "two actions
remaining"; `src/rules/ply.ts` — the module header's "When the ply's two
actions are spent", `PlyEndedEffect`'s "because its second action was spent",
and the two doc comments further down that name the second action;
`src/rules/stranded.ts` — the `strandedObligationBinds` comment describing one
stranded ship binding the first action and leaving the second free, which
becomes the generic statement that the obligation binds every action while any
ship owes one; `src/rules/combat.ts`'s aside about "a ship moving out of a bay
as the first action".

**Tests.** Running the suite with the constant at 1 fails in nine files. Most
are literal counts inside expected sentences and need nothing but the new
number; three need real restructuring:

- `src/rules/ply.test.ts` (15 failures) — the substantive work. Tests that
  sequenced two actions inside one ply ("spends two actions before passing the
  turn…", "leaves the return position unchanged between a ply's two actions…",
  "lets two different ships each attack as the ply's two actions", "refuses a
  move by a ship that attacked as the ply's first action", the fight-resolution
  tests that took a second action to observe the result, and the rest) must be
  restructured. Two patterns cover them: where the test wants to watch a ply
  end, take **one** action and assert the ply ended and the side flipped; where
  the test wants a mid-ply state that one action per turn can no longer reach
  (a ship marked in `actedThisPly` with an action still remaining), build the
  state directly with the file's existing `buildState` helper, which already
  accepts `actionsRemaining` and `actedThisPly`. Keep coverage of the
  `ship-already-acted` refusal alive by the second pattern (D2), and say in a
  short comment that the state is built rather than played into. Where a
  sequence of green actions was used only to reach a later position, alternate
  the sides instead — after green's single action it is red's turn.
- `src/game/session.test.ts` — "passes the turn after two actions, and the moved
  event says so" becomes a single action ending the ply, with the following
  action taken by red.
- `src/rules/fullGame.test.ts` — apply D5: `assertRefusesEverything` reports
  whether it found an attack that was legal a moment earlier instead of
  throwing when it finds none; the hundred-round game asserts one was found and
  refused, the three-round game does not. Both games must still run to the end
  and end where §9 says.

Mechanical count updates only: `src/board/announcements.test.ts` (24
failures — "Red's turn, 2 actions left" becomes "1 action left"; see D4, the
sentences themselves are not redesigned), `src/rules/gameState.test.ts`,
`src/hud/Hud.test.tsx`, `src/hud/GameOverPanel.test.tsx`, `src/App.test.tsx`
and `src/hud/TurnIndicator.test.tsx` (the last four assert the old indicator
sentence, which Step 3 replaces outright — here, just make them pass).

Also tidy, without changing any assertion: `src/board/Board.test.tsx`'s
`strandedState(2)` callers and the comments around them ("even though both
actions remain", "green-2 already spent this ply's first action") describe a
state one action per turn cannot reach. Pass 1 instead and reword the comments.
These are accessible-name composition tests and pass either way — do not change
what they assert, and do not touch anything else in the accessible grid.

Depends on: Step 1 (the document these changes implement).

Verification (automated): `npm run typecheck`, `npm run lint` and `npm test`
all pass, with no test skipped or deleted to get there — the count of tests
should not fall. Specifically confirm `src/rules/fullGame.test.ts` still plays
both games to completion, and that `src/rules/ply.test.ts` still covers: a ply
ending after its single action with `actedThisPly` cleared and the side
swapped; the `ship-already-acted` refusal; and a passed ply running the full
§8.7 end-of-turn sequence.

---

### Step 3 — The turn indicator says who is up

Status: pending

Change `turnIndicatorText` in `src/board/announcements.ts` to return
`"Green to play"` / `"Red to play"` for the side to move, with no action count
and no possessive. The game-over branch is unchanged: once the game is over it
still returns `"Game over"`. This function is the story's **only** change to
`announcements.ts` — `announcementForSession` and every sentence it composes
stay exactly as they are (D4).

Then give the indicator its colour (D3), in `src/hud/TurnIndicator.tsx` and
`src/hud/TurnIndicator.css`:

- The component adds a side modifier class alongside `turn-indicator`, derived
  from `state.sideToMove`, in the style of `ScoreDisplay`'s
  `score-display--green` / `score-display--red`. It still renders
  `turnIndicatorText(state)` verbatim and composes no wording of its own, and
  it stays a plain paragraph — not a live region, which its existing test
  asserts and which must keep passing.
- The stylesheet uppercases the text with `text-transform: uppercase` (as
  `GameOverPanel`'s heading does) so the banner reads `GREEN TO PLAY` /
  `RED TO PLAY` on screen, and colours it with `--color-green` /
  `--color-red` from `src/index.css` under the matching modifier. The
  game-over text keeps the existing plain bright colour — there is no side to
  colour it for; the modifier class may still be present, so if that is
  awkward, omit the modifier when the game is over.

Update the tests that assert the old sentence: the `turnIndicatorText` describe
block in `src/board/announcements.test.ts`, `src/hud/TurnIndicator.test.tsx`
(including a check that the side modifier class is on the paragraph — jsdom
does not apply the imported stylesheet, so the class is what a test can see,
and the visible capitals and colour are Step 4's business),
`src/hud/Hud.test.tsx`, `src/App.test.tsx` and
`src/hud/GameOverPanel.test.tsx`.

Depends on: Step 2 (the indicator no longer has an action count to show, and
Step 2 left these same tests passing against the old sentence).

Verification (automated): `npm run typecheck`, `npm run lint` and `npm test`
pass, with `src/hud/TurnIndicator.test.tsx` asserting the text "Green to play"
and "Red to play", the side modifier class for each, "Game over" once the game
has ended, and no `aria-live`/`role="status"` on the element. Additionally
`grep -rn "actions left" src` returns hits only in `announcements.ts`'s
live-region wording and its tests — never in the indicator.

---

### Step 4 — Owner play-test

Status: pending

A manual gate. The pipeline stops here and hands the running app to the
repository owner. Build no fixture and script no sequence of actions: this is a
free play-test of the real game from its starting position.

Run `npm run dev` inside the dev container and open the app. Things to look
for:

- A turn ends after **one** action: green moves, and it is immediately red's
  turn, with the shields, energy and node changes for green's turn having
  already happened.
- The banner reads `GREEN TO PLAY` and `RED TO PLAY`, in each player's colour,
  and never mentions actions.
- A ship left standing on a node that has just run out must be moved clear by
  the next turn's single action; with two ships stranded, the second still owes
  on the following turn.
- The game still reaches its end and shows a result.

Depends on: Step 3 (the indicator is part of what is being looked at).

Verification (manual): the owner plays the game as above and confirms it
behaves correctly, or reports what does not.

---

### Step 5 — README

Status: pending

Run the `/update-readme` command (`.claude/commands/update-readme.md`), which
reviews the branch diff and updates `README.md` where a player or a new reader
would need to know. This story does change how the game is played, so an
update is expected rather than optional: the Status paragraph currently says
"each player takes two actions a turn", "No ship takes more than one action a
turn, so a turn's two actions always use two different ships", and describes a
stranded ship as having to be cleared "before its owner can do anything else
that turn". All three are wrong under 0.9 — the second says nothing at all now
and should go rather than be reworded. Keep the paragraph's tone and length;
the README never restates the rules, it links to them.

Depends on: Steps 1–3 (the diff `/update-readme` reads).

Verification (automated): `grep -n "two actions\|both actions\|second action" README.md`
returns nothing, and `npm run format:check`, `npm run lint` and `npm test` all
pass (`rulesVersion.test.ts` included, so the README commit cannot land against
a mismatched version).
