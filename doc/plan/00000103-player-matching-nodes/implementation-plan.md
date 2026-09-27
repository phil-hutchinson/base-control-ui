# Implementation Plan — Story 00000103, Player-matching nodes

## What this story does

Under the steal playstyle (`doc/ruleset/steal.md`) every node is worth the
same to both players. This story adds a pre-play choice, offered only under
steal, called **Player-matching nodes**: **OFF**, **DOUBLE** or **REQUIRED**.
With DOUBLE or REQUIRED, two of the game's nodes are matched to the players —
one to green, one to red, for the whole game — and drawn in the players' own
green and red.

- **DOUBLE** — at the end of a player's turn, their own node, if one of their
  ships stands on it, counts as **two** nodes held; the whole turn is then
  priced by the chosen scoring on that count.
- **REQUIRED** — a player collects node energy at the end of their turn only
  if one of their ships stands on their own node; when one does, the
  collection is priced exactly as today.

The start screen is reordered (Node playstyle moves to the top) and gains
the new group just below Charged nodes, shown only while STEAL is chosen.
The score display's pip row shows what DOUBLE and REQUIRED do to a turn's
count; the Quick Guide gains a headed section with a diagram; `README.md`
and the live region follow.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions and the rejected alternatives, because code in this
repository deliberately carries no design history (`CONTRIBUTING.md`,
"Comments").

## Baseline on this branch

Branch `feat/103-player-matching-nodes`, clean at the start of planning
(`story.md` already committed).

- `npm test` — **80 test files, 1644 tests, all green**.
- `npm run typecheck`, `npm run lint` and `npm run format:check` — all
  clean, with no pre-existing warnings. Every step must leave them that way;
  if a step's own edit trips `format:check`, run `npx prettier --write` on
  the files that step touched (including this plan file, if an edit to it
  flags).

The test count will **rise** over this story. No step may lower it.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what the ruleset, the
  UI, the live region and `README.md` say (`CLAUDE.md`, Vocabulary).
- **Move** is the movement action specifically — one ship changing squares —
  never a synonym for a turn or a ply.
- **Node**, **prospective node** and **signal** are used as `CLAUDE.md`
  defines them. Under steal a node is a signal with two squares; the
  **signal** is the internal identity (`NodeSignal`, 0–4, in
  `src/rules/steal.ts`), and the app shows it as a colour.
- A **matched node** (code and planning word) is one of the two nodes
  matched to a player. The player-facing phrase is "their own node" (or in
  the start screen, the group name **Player-matching nodes**). A player's
  **own** node is the one matched to them; the **opponent's** node is the
  one matched to the other side.
- The player-facing setting words are **OFF**, **DOUBLE** and **REQUIRED**
  (start-screen chrome, living in `StartScreen.tsx`). The code word is
  `playerMatching`, whose values are the lowercase `"off"`, `"double"` and
  `"required"`.
- The Quick Guide has its own knowing vocabulary exception: it says
  **points**, **fuel** and **spaceships** where the rest of the app says
  energy, power and ships (`src/guide/guideCopy.ts` header). Copy added to
  the guide follows the guide's words; copy added anywhere else follows the
  app's.
- `rules.md` and `steal.md` **name no default** and never say "standard
  game". Which setting the app preselects is purely an app matter.

## Settled decisions — do not reopen

These come from `story.md` and the owner's discussion around it. A step that
finds one inconvenient escalates to the owner rather than re-deciding.

- **S1. One choice, three settings**: OFF, DOUBLE, REQUIRED, the same for
  both players, chosen before play begins, fixed for the game's lifetime.
- **S2. Only under steal.** Under continuous, planet and dedicated the group
  is not shown, and a game started under any of them has **no matched
  nodes**, whatever the group was last left at.
- **S3. The choice is remembered** while the player switches playstyles back
  and forth on the start screen, and is still set when a finished game
  returns to the start screen, like every other choice.
- **S4. The app preselects OFF**, rendered leftmost. The ruleset names no
  default.
- **S5. The match is fixed for the whole game.** It does not follow whoever
  holds the node. A matched node is claimed, left, stolen, relocated and
  drawn exactly as any other node (steal.md §§3–7). **Either player may take
  either matched node** — taking the opponent's is a legitimate way to deny
  it to them.
- **S6. DOUBLE**: the player's own node, if held at the end of their turn,
  counts as **two** nodes held; the **opponent's** matched node counts as
  one, like any other. The count is priced by the chosen scoring
  (rules.md §8.4) unchanged: red holding red and silver counts three and
  collects **6** under bonus, **3** under simple.
- **S7. REQUIRED**: if none of the player's ships stands on their own node at
  the end of their turn, they collect **no node energy** that turn, however
  many other nodes they hold. If one does, they collect exactly what they
  would today — their own node counts once.
- **S8. Planet bonuses are untouched** (rules.md §3.4). REQUIRED withholds
  node energy only; a bonus planet pays on landing regardless.
- **S9. Nothing subtracts energy.** REQUIRED withholds; it never takes away.
- **S10. The colours.** With DOUBLE or REQUIRED the two matched nodes are
  drawn in the players' own red and green — the colours the ships and the
  score display use — in place of the **last two** colours of the order
  gold, silver, blue, purple, brown that the game would otherwise use. Five
  nodes: gold, silver, blue, red, green. Four: gold, silver, red, green.
  Three: gold, red, green. With OFF the colours are today's. **No marking
  beyond colour** — no badge, ring or label. A red node under a red ship is
  by design.
- **S11. The colour substitution is app presentation, not rules text.** The
  ruleset says the app shows the matched nodes in the players' colours (as
  steal.md §2 already says the app shows signals as colours); it names no
  palette.
- **S12. The pips under DOUBLE**: the row is `min(ships, node count) + 1`
  long; standing on one's own node lights **two** pips; the highlighted
  value under the last lit pip is what the turn will pay.
- **S13. The pips under REQUIRED**: while a player holds nodes but not their
  own, each node held shows an **X** in place of a lit pip and **no** value
  is highlighted. Once they stand on their own node, the pips light as
  today. The row is its usual length.
- **S14. The start screen's order**: Node playstyle, Ships, Charged nodes,
  Player-matching nodes (only under STEAL), Scoring, Planet bonus, Combat,
  Rounds, Clock.
- **S15. The rules edit is its own commit, ahead of the code**: `rules.md`
  0.39 → 0.40, `RULES_VERSION` to match, **one** `changelog.md` entry.
  **One version bump for the whole branch** — a later rules wording fix
  folds into 0.40's entry. **Tagging stays on hold**: do not tag, do not run
  `/tag-rules`.
- **S16. Where the rule is written**: a **new section of `steal.md`**, with a
  pointer from `rules.md` §8.4 and from every list of pre-play choices
  (§10's in particular).
- **S17. A new player-facing feature gets its own headed Quick Guide
  section with a diagram**, never a sentence bolted onto STEALING NODES.
- **S18. No accessibility repair or testing steps, no review fixtures, no
  manual test scripts** (`CLAUDE.md`; the owner drives manual testing
  himself). Where an existing automated test has a straightforward path to
  being updated, update it. Manual verification never asks the owner to
  check live-region wording — the automated suite covers it. Accessibility
  costs knowingly accepted are recorded in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.
- **S19. Small visual states: presence, not degree.** The X is there or it
  is not; nothing is drawn for "matched node exists but is not held".
- **S20. Out of scope**: matched nodes under the other three playstyles,
  more than one matched node per player, any other payout, any retuning,
  restyling the start screen beyond reordering and adding the group.
- **S21. No backwards compatibility** (`CLAUDE.md`). A game recorded with
  OFF must still replay exactly as today; that is a property of the design
  (D2), not a compatibility layer.

## Decisions this plan makes

Each of these is a decision the story left to the plan, with the
alternatives considered and rejected.

### D1. A leaf option module, `src/rules/playerMatching.ts`

In the exact shape `scoring.ts`, `planetBonus.ts` and `nodePlaystyle.ts`
use: a `PlayerMatchingSetting` union of `"off" | "double" | "required"`, a
`PLAYER_MATCHING_SETTINGS` array in start-screen order (off, double,
required), `DEFAULT_PLAYER_MATCHING` of `"off"`, and an
`isPlayerMatchingSetting` guard. It also holds one small pure helper that
resolves the setting a game actually starts with from the node playstyle and
the remembered setting: the remembered setting under steal, `"off"` under
every other playstyle (S2). It may import the `NodePlaystyle` **type** from
`nodePlaystyle.ts` (another leaf); it imports nothing else and knows nothing
about a game state. The OFF / DOUBLE / REQUIRED wording is start-screen
chrome and lives in `StartScreen.tsx`.

- _Rejected: two booleans (matched on/off plus double/required)._ Two
  representable states for "off", and the story presents one group of
  three.
- _Rejected: putting the resolution helper in `useAppScreen`._ It is a rule
  ("only under steal"), and a rules-layer helper is unit-testable without
  React; the hook merely calls it.

### D2. Which nodes are matched: the last two signals, deterministically

In a game of N nodes (`state.chargedNodeCount`, which under steal means how
many nodes the game has), **signal N−2 is red's** and **signal N−1 is
green's**. Two small pure helpers go in `src/rules/steal.ts` (which owns
signals): one giving a side's matched signal for a node count, and its
inverse giving the side a signal is matched to (or none) for a node count.
Neither consults the setting; callers check `state.playerMatching !==
"off"` first.

**Why.** Signal i is presented as palette colour i (`SIGNAL_COLORS` in
`src/board/squareArt.ts`), and the story's colour table replaces exactly the
**last two** colours a game of N uses, in the order red then green — so the
matched nodes are the last two signals, red first. Every signal is already
dealt to random squares by the opening deal (steal.md §7), so choosing
*which* signals are matched adds nothing a random draw would: the matched
nodes' positions are already random. The assignment consumes **no seed
steps**, so a DOUBLE or REQUIRED game deals **exactly** the board an OFF game
deals from the same seed, and OFF games (and their recorded replays) are
untouched (S21).

**Known and accepted.** The opening deal draws the second prospective
squares in signal order, so red's second square (N−2) is drawn just before
green's (N−1), each weighted against the squares already placed. Both are
drawn by the same rule from the same pool; the difference is a slightly
different view of the board at draw time, not a bias either side can
exploit, and the owner has not asked for symmetry here.

- _Rejected: drawing which two nodes are matched from the seed._ Extra seed
  steps for no added randomness, and it would make matched games deal
  differently from OFF games on the same seed.
- _Rejected: storing a signal-to-side map on the game state._ Derivable from
  the node count; a stored copy can drift.
- _Rejected: green on N−2, red on N−1._ The story's table lists red before
  green; following it keeps the code, the table and the guide in the same
  order.

### D3. `GameState.playerMatching` is a required field; the rules layer rejects it outside steal

`GameState` gains `playerMatching: PlayerMatchingSetting`, fixed for the
game's lifetime, because it cannot be derived from a board (an OFF game and
a REQUIRED game look identical in `state.nodes`). `StartingGameStateOptions`
gains an optional `playerMatching` typed `string` (for the same reason
`scoring`, `nodePlaystyle` and `planetBonus` are: a setting arriving from
outside the type system can be any string), defaulting to
`DEFAULT_PLAYER_MATCHING`, validated with the guard (a `RangeError` naming
the offered settings, like its neighbours). **`startingGameState` also
throws a `RangeError` when the setting is anything but `"off"` and the node
playstyle is not steal** — a non-steal game with matched nodes is a state
the rules do not allow, and a caller asking for one is a bug. The session's
`new-game` intent gains a **required** `playerMatching` field ("the reducer
uses what it is handed and never reaches for a default itself",
`src/game/session.ts`), and `useAppScreen` resolves the remembered setting
through D1's helper before dispatching.

- _Rejected: `startingGameState` silently coercing to `"off"` outside
  steal._ It would hide a caller bug, and the resolution is an app concern
  (the start screen remembers a choice that does not apply); making the app
  resolve it keeps the rules layer honest about what state it holds.
- _Rejected: an optional field on `GameState`._ Every other pre-play setting
  is required; the typechecker then lists every hand-built `GameState`
  literal in the suite (about 33 files, most through a single builder
  helper), and each gains one line, `playerMatching: "off"`. The churn is
  mechanical.

### D4. One function prices a side's turn, and everything reads it

`src/rules/energy.ts` gains one function that, for a state and a side,
returns the whole of what that side's end-of-turn collection is right now:

- the **held squares** (what `chargedNodesHeldBy` returns today, in board
  order);
- whether the side is **standing on its own node** (always false when the
  setting is off);
- the **counted nodes** — the number the scoring prices: under DOUBLE, the
  held squares plus one when the own node is held; under REQUIRED, the held
  squares when the own node is held and **0** when it is not; under OFF, the
  held squares;
- whether the collection is **withheld** — true exactly when the setting is
  REQUIRED, the side holds at least one node, and not its own;
- the **amount**, `energyForNodesHeld(counted nodes, state.scoring)`.

`endOfTurn.ts` step 2, `ScoreDisplay.tsx` and `announcements.ts` all read
this one function rather than `chargedNodesHeldBy` plus their own
arithmetic, so the payout, the pips and the words cannot drift.
`energyForNodesHeld` is **unchanged** — DOUBLE changes the count, not the
price (story, "What does not change"). `chargedNodesHeldBy` stays (the new
function uses it). `energy.ts` importing D2's helpers from `steal.ts` is
fine: `steal.ts` imports only types from `gameState.ts`, so no cycle forms.

- _Rejected: pricing DOUBLE as `amount + something` after the fact._ Under
  bonus the whole turn is a triangular total of the count, so "red and
  silver with red doubled" is the price of **three**, 6 — not 3 plus a
  bonus. Changing the count is the only formulation that prices both
  scoring settings correctly.
- _Rejected: computing the count separately in the HUD._ Two copies of a
  rule are how the pips come to disagree with the payout.

### D5. The `energy-collected` effect gains one optional field; REQUIRED's withholding raises no effect

`EnergyCollectedEffect` (`src/rules/endOfTurn.ts`) gains an optional field
naming the square of the side's own node, present **only** under DOUBLE
when that node was held and counted twice. `amount` and `newTotal` already
carry what was actually paid. No new effect type is added.

Under REQUIRED, a turn that pays nothing because the own node is not held
raises **no effect**, exactly as a zero payout does today ("a zero payout is
not an event", `endOfTurn.ts` step 2). The live region therefore says
nothing about collection that turn — which is what was paid — and the HUD's
standing score sentence (D6) says that the nodes held are not paying.

- _Rejected: an `energy-withheld` effect._ It is an event about nothing
  happening; every effect consumer (`EnergyOverlay`, the announcements,
  `useDisplayedEnergy`) would need to learn to skip it, and the HUD sentence
  already carries the standing fact.

### D6. Live-region and HUD wording

Drafts; the implementer may polish, and the tests pin whatever is chosen.
None of this is manually verified (S18).

- **Collection clause, DOUBLE with own node held** — today's sentence plus a
  phrase that the own node counted twice, e.g. "Red collected 6 energy from
  2 nodes at D4 and K11, its own node counting twice, and now has 30." With
  only the own node held: "Red collected 3 energy from its own node at D4,
  counted twice, and now has 27." (bonus scoring.)
- **Collection clause otherwise** — unchanged.
- **HUD score sentence** (`scoreSentence`), today "Green: 24 energy, 3
  nodes held.":
  - DOUBLE with own node held: "Green: 24 energy, 2 nodes held, counting as
    3."
  - REQUIRED, withheld: "Green: 24 energy, 2 nodes held, none paying
    without its own node."
  - everything else: unchanged.

### D7. Colours: a `matchedSide` presentation prop, resolved in `squareArt.ts`

`src/board/squareArt.ts` gains the two player node colour pairs (core and
rim, in the same roles as `SignalColors`), keyed by side, with cores taken
from the app's player colours (`--color-green` `#3fa66b` and `--color-red`
`#c8503f` in `src/index.css`) and lighter rims chosen to play the role the
wheat rim plays for gold; and one helper that returns the colours for a
signal, given an optional matched side — the side's pair when a side is
given, `SIGNAL_COLORS[signal]` otherwise. `NodeMarker.tsx` routes **every**
place it reads `SIGNAL_COLORS` today — the charged ball, the prospective
rings, and the claim's charge-animation rings — through that helper.

`Board.tsx` computes each node square's matched side (D2's inverse helper,
only when `state.playerMatching !== "off"`) and passes it down as an
optional `matchedSide` prop on `BoardSquare` and `NodeMarker`, beside the
existing `signal` prop. A square with no matched side renders byte for byte
as today, so OFF games and the other three playstyles are provably
unchanged. The guide's diagrams set the same prop on their cells.

**The charge animation.** `NodeChargeAnimation.signal`
(`boardAnimations.ts`) is unchanged: the animated square is the square just
claimed, whose node status carries the same signal, so `Board` already
passes that square's `matchedSide` to its `NodeMarker`, and the animation's
rings pick up the player colour through the same helper.

- _Rejected: passing raw colours down from `Board`._ Story 101 (its D8)
  already rejected this: the palette lookup belongs with the artwork, and a
  semantic prop reads the same in the guide as on the board.
- _Rejected: re-ordering or re-indexing `SIGNAL_COLORS` per game._ It would
  change which colour an unmatched signal shows depending on the setting,
  and the story's table keeps the unmatched colours exactly as today.

### D8. The pips

`ScoreDisplay.tsx` reads D4's function:

- **Row length**: `min(side's ship count, state.chargedNodeCount)`, plus
  **one** under DOUBLE (S12). Under DOUBLE the largest count a turn can
  reach is the ships that can stand on nodes plus the doubled one, so the
  row still reaches it.
- **Lit pips**: the counted nodes (D4), so DOUBLE's own node lights two.
- **Highlighted value**: the value under the last lit pip, as today — equal
  to the turn's amount by construction.
- **REQUIRED, withheld**: the first *held squares* pips are drawn as an
  **X** instead of lit (a new pip modifier class, the X drawn in CSS or as a
  glyph — the implementer's choice, settled at Step 6's gate), and **no**
  value is highlighted. The pips' numbers still show, dim, as today.
- **Everything else**: exactly as today.

**Fit.** Under DOUBLE with a six-ship fleet and five nodes the row is
**six** long. `App.css` (landscape comment) sizes the info column for a
five-pip row, `5 × 0.66em + 4 × 0.35em = 4.7em ≈ 0.82P`; a six-pip row is
`5.71em ≈ 1.0P`, the whole column. **The pips shrink, never the region or
the board**: a six-long row carries a modifier that scales the row's
font-size so it occupies no more than the five-pip row's width (a factor of
about `4.7 / 5.71`), in both orientations. `--region-extent` is not
touched. Update the `App.css` comment that says a pip row "can now be as
long as five".

### D9. The start screen: reorder, and a conditional group

`StartScreen.tsx` renders the groups in S14's order, with the new group's
fieldset rendered **only** when `nodePlaystyle === "steal"` (not rendered at
all otherwise — no hidden or disabled placeholder), using the existing
`OptionChoice` and no new styling. It takes `playerMatching` and an
`onPlayerMatchingChange` callback like its neighbours. `useAppScreen` holds
the setting in its own state, independent of the playstyle (so it survives
switching away from STEAL and back, S3), exposes it and its setter, and
`handlePlay` dispatches D1's resolved value. `App.tsx` threads it through.
If nine groups do not fit a short landscape window, that is a **finding for
the owner** at Step 6's gate, not a layout pass this story takes on (S20).

### D10. The Quick Guide section: drafted here, settled by the owner

A new section, id `playerMatchingNodes`, heading **PLAYER-MATCHING NODES**,
placed **immediately after STEALING NODES** and before PLANET BONUS, with its
own diagram (S17). The guide's copy has always been the owner's own wording,
so Step 7 carries this **draft**, which the owner edits or approves at that
step's gate:

> Under the Steal playstyle, you can give each player a node of their own,
> shown in their colour — a red node and a green node. With DOUBLE, your own
> node counts as two nodes when you gain points at the end of your turn.
> With REQUIRED, you gain no points for any node unless one of your
> spaceships is on your own node. Either player can land on either node:
> taking your opponent's node is a way to shut them out.

**Draft diagram** (`PlayerMatchingNodesDiagram` in `guideDiagrams.tsx`):
two squares side by side — green's matched node **charged** with a green
spaceship on it, and red's matched node **open** (its prospective rings in
red), using D7's `matchedSide` prop — so a reader sees both colours and both
states. No pip row: a pip row in the guide would need a new diagram cell
kind for a detail the paragraph already explains.

### D11. Accessibility costs recorded, not repaired

Two costs are knowingly accepted and recorded in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` under a new
"From story 103" heading, at Step 5:

1. Which node is a player's own is carried by colour alone — the square
   labels still read "charged node" / "prospective node", and a red node
   under a red ship is by design.
2. The REQUIRED X pips are decorative (`aria-hidden`, like every pip); the
   standing fact reaches assistive technology only through the HUD's hidden
   score sentence (D6), and no live-region sentence is spoken on a turn
   whose collection is withheld (D5).

## Step sequence at a glance

| Step | Title                                                         | Verification |
| ---- | ------------------------------------------------------------- | ------------ |
| 1    | The ruleset goes to 0.40: player-matching nodes               | automated    |
| 2    | The setting reaches the game state                            | automated    |
| 3    | DOUBLE and REQUIRED price a turn                              | automated    |
| 4    | The start screen: reorder and the new group                   | automated    |
| 5    | The matched nodes' colours and the pips                       | automated    |
| 6    | The colour, pip and start-screen gate                         | manual       |
| 7    | The live region and the HUD sentence                          | automated    |
| 8    | The Quick Guide's PLAYER-MATCHING NODES section               | manual       |
| 9    | `README.md`                                                   | automated    |
| 10   | The owner plays it                                            | manual       |

Every step's automated verification runs the **full** `npm test`, `npm run
typecheck`, `npm run lint` and `npm run format:check`, all green, in
addition to the step's own checks.

---

### Step 1 — The ruleset goes to 0.40: player-matching nodes

Status: committed

Notes: Bumped `rules.md` to 0.40 and `RULES_VERSION` to match, added the
0.40 changelog entry ahead of 0.39, and added `steal.md` §9
"Player-matching nodes" stating the off/double/required choice, the fixed
match, double's and required's pricing (with the story's worked example),
the planet-bonus and no-subtraction notes, and the app's colour
presentation — plus the one-sentence pointers from `steal.md` §8's closing
paragraph, `rules.md` §8.4 and `rules.md` §10's pre-play list. No deviation
from the plan; `rules.md` §1 and §9 were checked per the step's instructions
and left unchanged, as the plan anticipated.

Edit the ruleset, bump `rules.md` to **0.40**, bump `RULES_VERSION` in
`src/rules/rulesVersion.ts` to `"0.40"`, and add **one**
`doc/ruleset/changelog.md` entry for 0.40, newest first, in the shape the
0.39 entry uses, stating it is a gameplay change and a tag candidate with
tagging on hold (S15). This step is **its own commit, ahead of every code
change**. Do not tag.

**`steal.md` gains a new section 9, "Player-matching nodes"**, after §8. It
states (S1–S9, S11):

- the choice is **off, double or required**, the same for both players,
  chosen before play begins and fixed for the game's lifetime — naming no
  default;
- with double or required, **two of the game's nodes are matched to the
  players, one each**, for the whole game; the match does not follow whoever
  holds the node, and a matched node is claimed, left, stolen, relocated and
  drawn exactly as any other (sections 3–7); either player may take either
  matched node;
- **double**: at the end of a player's turn, their own node, if one of their
  ships stands on it, counts as two nodes held; the opponent's matched node
  counts as one; the turn is priced by the chosen scoring (rules.md §8.4) on
  that count — give the story's worked example (red holding red and one
  other: three nodes, 6 under bonus, 3 under simple);
- **required**: if none of their ships stands on their own node, they
  collect no node energy that turn however many nodes they hold; if one
  does, they collect exactly what rules.md §8.4 gives, their own node
  counting once;
- planet bonuses (rules.md §3.4) are unaffected — required withholds node
  energy only — and nothing subtracts energy;
- the app shows the two matched nodes in the players' own colours (one
  sentence, in the manner of §2's note that the app shows signals as
  colours; no palette named).

**Other edits, each a sentence, not a rewrite:**

- `steal.md` §8's closing paragraph, which says energy "is unchanged under
  steal", gains "except as section 9 provides" (or equivalent).
- `rules.md` §8.4's paragraph beginning "This section applies under the
  steal playstyle too" gains a pointer: under steal, the player-matching
  nodes setting can change what a turn pays (steal.md §9).
- `rules.md` §10's opening list of pre-play choices gains "and, under the
  steal playstyle, the player-matching nodes setting (steal.md §9)".
- Search both files for any other list of pre-play choices (grep "before
  play") and add the setting where a list enumerates choices. §9 (Ending the
  game) names only the rounds and is not a list — leave it. §1's overview
  lists random elements; this setting adds none (D2), so it is unchanged.
- `steal.md`'s header already says it is versioned by `rules.md`; no version
  appears in it.

Depends on: nothing. Every later step implements this text.

Verification (automated): `npm test` — `src/rules/rulesVersion.test.ts`
passes with both at 0.40 (it asserts `RULES_VERSION` matches `rules.md`);
test count unchanged at 1644; typecheck, lint and format:check clean. By
inspection: `changelog.md` has exactly one 0.40 entry; `steal.md` §9 names no
default and no colour.

---

### Step 2 — The setting reaches the game state

Status: committed

Notes: Implemented as planned. Added `src/rules/playerMatching.ts` (type,
`PLAYER_MATCHING_SETTINGS`, `DEFAULT_PLAYER_MATCHING`, `isPlayerMatchingSetting`,
and `resolvePlayerMatching`) with unit tests; added `matchedSignalForSide` and
`sideMatchedToSignal` to `src/rules/steal.ts` with tests covering 5/4/3-node
games and the unmatched-signal case; added `GameState.playerMatching` and
`StartingGameStateOptions.playerMatching` to `gameState.ts`, validated via the
guard plus a `RangeError` for a non-off setting paired with a non-steal
playstyle, with `startingGameState` storing it and drawing nothing extra for
it; added `playerMatching: "off"` to every hand-built `GameState` literal the
typechecker flagged (26 test files); added the required `playerMatching`
field to the `new-game` session intent and updated every existing
construction; and gave `useAppScreen` its own `playerMatching` state and
setter, resolving it through `resolvePlayerMatching` in `handlePlay` (the
start screen does not expose it yet, so it is always `"off"` from the UI).
Added the tests Step 2 calls for in `playerMatching.test.ts`, `steal.test.ts`,
`gameState.test.ts` and `useAppScreen.test.tsx`. No deviation from the plan.
`npm test` (81 files, 1671 tests, up from 1644), `npm run typecheck`,
`npm run lint` and `npm run format:check` all clean.

Scaffolding only: after this step every game carries the setting, but no
turn pays differently and nothing looks different.

1. Create `src/rules/playerMatching.ts` per D1 (type, ordered list, default
   `"off"`, guard, and the helper resolving the effective setting from a
   node playstyle), with a header comment in the style of `scoring.ts` and
   `planetBonus.ts` citing steal.md §9. Unit tests in
   `src/rules/playerMatching.test.ts`: the order, the default, the guard
   accepting the three and rejecting others, and the helper returning the
   setting under steal and `"off"` under continuous, planet and dedicated
   for every setting.
2. In `src/rules/steal.ts`, add D2's two helpers (a side's matched signal for
   a node count; the side a signal is matched to, if any). Tests in
   `src/rules/steal.test.ts`: for 5, 4 and 3 nodes, red is signal N−2 and
   green N−1, and every other signal maps to no side.
3. In `src/rules/gameState.ts`, add `playerMatching` to `GameState` (doc
   comment in the style of its neighbours, saying it is always `"off"`
   outside steal) and to `StartingGameStateOptions` (typed `string`),
   validated per D3, including the `RangeError` for a non-off setting with a
   non-steal playstyle. `startingGameState` stores it. It draws **nothing**
   (D2); update the `startingGameState` doc comment's seed-step account to
   say so.
4. Add `playerMatching: "off"` to every hand-built `GameState` literal the
   typechecker flags (about 33 files, mostly single builder helpers).
5. `src/game/session.ts`: the `new-game` intent gains a **required**
   `playerMatching` field passed through to `startingGameState`; update its
   doc comment. Every existing `new-game` construction in the tests gains
   `playerMatching: "off"`. `useAppScreen.ts` gains the state (default
   `DEFAULT_PLAYER_MATCHING`), its setter on `AppScreen`, and dispatches the
   resolved value (D1's helper) in `handlePlay` — the start screen does not
   expose it yet, so it is always `"off"` from the UI in this step.
6. Tests in `src/rules/gameState.test.ts`: the default is `"off"`; each
   setting is stored under steal; an unknown string throws; `"double"` or
   `"required"` with each non-steal playstyle throws; and, for a few seeds
   and each node count, a steal game started with `"double"` or
   `"required"` has **identical** `nodes` and `randomSeed` to the same seed
   with `"off"` (D2 — no seed steps). In `useAppScreen.test.tsx`: the
   setting defaults to OFF; after setting it to DOUBLE with the playstyle
   STEAL, `handlePlay` dispatches `"double"`; with the playstyle PLANET it
   dispatches `"off"`, and switching back to STEAL still holds DOUBLE (S3).

Depends on: Step 1 (the rule being implemented).

Verification (automated): full `npm test` green with the new tests above;
`seededReplay.test.ts` and `fullGame.test.ts` unchanged and green (OFF
behaviour untouched); typecheck, lint, format:check clean.

---

### Step 3 — DOUBLE and REQUIRED price a turn

Status: committed

Notes: Added `turnCollection` to `src/rules/energy.ts` per D4, returning the
held squares, whether the side stands on its own matched node (via
`matchedSignalForSide`, only when `playerMatching !== "off"`), the own-node
square when it is held, the counted nodes, whether the turn is withheld, and
the amount (`energyForNodesHeld` unchanged). `endOfTurn.ts` step 2 now reads
`turnCollection` instead of `chargedNodesHeldBy` plus its own arithmetic, and
`EnergyCollectedEffect` gained the optional `ownNodeSquare` field, set only
under DOUBLE when the own node was held and counted twice; REQUIRED's
withholding raises no effect, exactly as a zero payout already did. Added
`turnCollection` unit tests in `energy.test.ts` (DOUBLE counting the own node
twice and naming it, the opponent's own node counting once, the own node
alone, REQUIRED withheld/not-withheld/holding-nothing, OFF unchanged, and one
case each for four- and three-node games), sequence tests in
`endOfTurn.test.ts` (DOUBLE's effect carrying `ownNodeSquare` and the correct
total, REQUIRED withheld raising no `energy-collected` effect, REQUIRED paid
once the own node is held), and a planet-bonus test in
`planetBonusClaim.test.ts` confirming a REQUIRED-withheld side's bonus planet
still pays on landing. No deviation from the plan. `npm test` (81 files, 1684
tests, up from 1671), `npm run typecheck`, `npm run lint` and
`npm run format:check` all clean.

1. In `src/rules/energy.ts`, add D4's function (doc comment citing rules.md
   §8.4 and steal.md §9). It reads the side's matched signal (Step 2's
   helper, using `state.chargedNodeCount`) only when `state.playerMatching`
   is not `"off"`, and checks whether any held square's node status carries
   that signal.
2. In `src/rules/endOfTurn.ts` step 2, replace the held-squares-and-price
   pair with D4's function; the effect is still raised only when the amount
   is above 0. Add D5's optional field to `EnergyCollectedEffect` (doc
   comment: present only under DOUBLE when the side's own node was held),
   set from D4's result. Update the step-2 comment to mention steal.md §9.
3. Tests, in `src/rules/energy.test.ts` (the function directly) and
   `src/rules/endOfTurn.test.ts` (through the sequence), building five-node
   steal states by hand (signals 0–4 on charged squares; red's own is
   signal 3, green's signal 4):
   - DOUBLE, bonus: red on signal 3 and signal 1 → counted 3, amount **6**,
     effect carries the own-node square; simple → **3**.
   - DOUBLE: red on green's node (signal 4) and signal 1 → counted 2 (the
     opponent's counts once), no own-node field.
   - DOUBLE: red on its own node alone → counted 2, amount 3 under bonus.
   - REQUIRED: red on signals 0 and 1 → withheld, amount 0, **no**
     `energy-collected` effect, energy total unchanged.
   - REQUIRED: red on signal 3 and signal 0 → not withheld, amount exactly
     what OFF pays for two nodes.
   - REQUIRED: red holding nothing → not withheld (nothing held), amount 0.
   - OFF: every case prices exactly as `energyForNodesHeld` of the held
     count, as today.
   - Four- and three-node games: the matched signals are 2/3 and 1/2
     respectively (one case each).
   - REQUIRED does not touch planet bonuses: in `src/rules/ply.test.ts` (or
     `planetBonusClaim.test.ts`, whichever holds the landing-pays tests), a
     steal game with REQUIRED and the planet bonus on, where a ship lands on
     its bonus planet while its side holds no own node, is still paid the
     bonus.

Depends on: Step 2 (the state field and the matched-signal helpers).

Verification (automated): full `npm test` green including the cases above;
the existing energy, end-of-turn, replay and full-game tests unchanged and
green; typecheck, lint, format:check clean.

---

### Step 4 — The start screen: reorder and the new group

Status: pending

Per D9:

1. `src/start/StartScreen.tsx`: reorder the groups to S14's order; add a
   `PLAYER_MATCHING_LABELS` map (`off` → `OFF`, `double` → `DOUBLE`,
   `required` → `REQUIRED`) and the **Player-matching nodes** fieldset
   directly after Charged nodes, rendered only when `nodePlaystyle ===
   "steal"`; new props `playerMatching` and `onPlayerMatchingChange`. Update
   the file's header comment (it says "eight options").
2. `src/App.tsx`: pass the setting and setter from `useAppScreen`. Update
   `useAppScreen.ts`'s doc comment ("eight options").
3. Tests in `src/start/StartScreen.test.tsx`: update the existing group-order
   test to the new order (under a non-steal playstyle: eight groups, Node
   playstyle first; under STEAL: nine, with Player-matching nodes between
   Charged nodes and Scoring); the group is absent under CONTINUOUS, PLANET
   and DEDICATED; under STEAL it offers OFF, DOUBLE, REQUIRED in that order
   with OFF checked when given `"off"`; choosing DOUBLE calls the callback.
   In `src/App.test.tsx`: choosing STEAL shows the group; choosing DOUBLE,
   switching to PLANET (group gone) and back to STEAL shows DOUBLE still
   checked; and a finished-or-abandoned game returning to the start screen
   (follow whatever pattern `App.test.tsx` already uses to check other
   options survive a return) still shows the choice.

Depends on: Step 2 (the setting on `useAppScreen` and the intent).

Verification (automated): full `npm test` green with the updated and new
tests; typecheck, lint, format:check clean. (The look of the reordered
screen is checked by hand at Step 6.)

---

### Step 5 — The matched nodes' colours and the pips

Status: pending

Two presentational changes, both driven by state Step 3 already computes.

**Colours (D7).**

1. `src/board/squareArt.ts`: the player node colour pairs and the colour
   helper; update the header and `SIGNAL_COLORS` doc comments.
2. `src/board/NodeMarker.tsx`: an optional `matchedSide` prop; every
   `SIGNAL_COLORS` read (charged ball, prospective rings, charge-animation
   rings) goes through the helper. `src/board/BoardSquare.tsx`: the same
   optional prop, passed through.
3. `src/board/Board.tsx`: compute each node square's matched side when
   `state.playerMatching !== "off"` and pass it.
4. Tests: in `NodeMarker.test.tsx`, a charged and a prospective marker with
   `matchedSide` draw the side's colours, and without it draw the signal's
   (today's markup unchanged). In `Board.test.tsx`, a five-node steal game
   started with DOUBLE shows exactly the story's table — nodes with signals
   0, 1, 2 in gold, silver, blue and signals 3, 4 in red, green (assert on
   the colour values the markup carries) — and four- and three-node games
   the corresponding rows; with OFF, today's five colours; a non-steal game
   has no matched side anywhere.

**Pips (D8).**

5. `src/hud/ScoreDisplay.tsx`: read D4's function; row length, lit count,
   highlighted value and the REQUIRED X per D8. `src/hud/ScoreDisplay.css`:
   the X modifier (drawn in the side's colour or the dim text colour — the
   implementer's choice, settled at Step 6) and the six-long row's shrink
   modifier. `src/App.css`: update the landscape comment about the longest
   pip row.
6. Tests in `src/hud/ScoreDisplay.test.tsx`: DOUBLE, bonus, six ships and
   five nodes, red on its own node and one other → six pips, three lit,
   the highlighted value is **6**; DOUBLE with nothing held → six pips,
   none lit; REQUIRED holding two nodes but not its own → five pips, two
   carry the X class, none lit, no value highlighted; REQUIRED holding its
   own and one other → two lit, value 3 highlighted, no X; OFF → exactly
   today's rendering.

**Accessibility ledger (D11).** Add the "From story 103" entry to
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, in the shape of
the story-101 entry, with both notes and their "Where" lines.

Depends on: Step 3 (D4's function and the state it reads).

Verification (automated): full `npm test` green with the tests above;
typecheck, lint, format:check clean.

---

### Step 6 — The colour, pip and start-screen gate

Status: pending

No new behaviour: this is the owner's look at Steps 4 and 5 in the running
app. Adjustments the owner asks for here (the player node colours' rims, the
X's look, the six-pip shrink, a start-screen fit finding) are made in this
step and recorded in its Notes.

Depends on: Steps 4 and 5.

Verification (manual): run `npm run dev` inside the Dev Container and open
the app.

- The start screen opens with **Node playstyle** at the top, then Ships and
  Charged nodes. **Player-matching nodes** appears just below Charged nodes
  only while STEAL is chosen, with OFF preselected; it disappears under the
  other three playstyles; choosing DOUBLE, switching away and back leaves
  DOUBLE chosen. All nine groups and PLAY fit (or are reachable) in a short
  landscape window — if not, report it as a finding.
- STEAL with OFF: the board and pips look exactly as before this story.
- STEAL with DOUBLE (and again with REQUIRED) at five, four and three
  nodes: the board shows a red and a green node, and the other colours are
  gold, silver, blue / gold, silver / gold respectively. Both the charged
  ball and the prospective rings of a matched node are in the player's
  colour, including during the claim animation. The red node reads as
  "red's" beside a red ship, and is distinguishable from the ship itself.
- DOUBLE, bonus scoring: red's pip row is one longer than usual; claiming
  red's own node lights two pips, adding one other lights three with **6**
  highlighted, and red then collects 6 at the end of the turn. Holding
  green's node lights only one pip for it. With six ships and five nodes
  the six-pip row fits its column in both portrait and landscape.
- REQUIRED: holding nodes but not one's own shows an X per node held and no
  highlighted value, and nothing is collected at the end of the turn;
  standing on one's own node lights the pips as usual and collects as
  usual.
- A game started under PLANET after choosing DOUBLE under STEAL shows no red
  or green node.

---

### Step 7 — The live region and the HUD sentence

Status: pending

`src/board/announcements.ts`, per D6:

1. The energy-collected clause says the own node counted twice when D5's
   field is present; otherwise unchanged.
2. `scoreSentence` reads D4's function and uses the DOUBLE and REQUIRED
   wordings; otherwise unchanged.

Tests in `src/board/announcements.test.ts`: each D6 wording (DOUBLE clause
with own node plus others, with own node alone; DOUBLE score sentence;
REQUIRED withheld score sentence), and that OFF wording is byte-for-byte
unchanged (the existing tests stay green untouched). Update any
`ScoreDisplay.test.tsx` or `Hud.test.tsx` expectation of the hidden
sentence that the new wording changes.

Depends on: Step 3 (D4's function and D5's field). Independent of Steps 4–6.

Verification (automated): full `npm test` green; typecheck, lint,
format:check clean.

---

### Step 8 — The Quick Guide's PLAYER-MATCHING NODES section

Status: pending

Per D10:

1. `src/guide/guideCopy.ts`: add `"playerMatchingNodes"` to
   `GuideSectionId` and the section (heading **PLAYER-MATCHING NODES**, the
   draft paragraph) immediately after STEALING NODES. Update the header and
   the doc comments that count the sections ("six headed sections", "five
   headed sections" — make them accurate).
2. `src/guide/guideDiagrams.tsx`: `PlayerMatchingNodesDiagram` per D10,
   using D7's `matchedSide` on its cells (a `BoardSquareProps` field after
   Step 5), with a doc comment in the style of the neighbouring diagrams.
   Update the module header if it enumerates which diagrams show a red
   ship.
3. `src/guide/GuideScreen.tsx`: pair the section with its diagram in
   `SECTION_DIAGRAMS`.
4. Tests: `guideCopy.test.ts`'s section-order test gains the section in its
   place; `guideDiagrams.test.tsx` gains a case that the diagram renders two
   squares, one charged with a green ship in green's colours and one
   prospective in red's; `GuideScreen.test.tsx`, if it counts sections or
   diagrams, is updated.

Depends on: Step 5 (the `matchedSide` prop and colours).

Verification (manual): `npm test`, typecheck, lint and format:check green
first. Then run `npm run dev`, open the Quick Guide from the start screen,
and confirm a headed **PLAYER-MATCHING NODES** section follows STEALING
NODES with its diagram showing a green node under a green spaceship and a
red node's rings in red. The owner reads the paragraph and edits or approves
it; record the final wording's provenance in the Notes and update
`guideCopy.ts`'s header comment to say the section's copy is the owner's.

---

### Step 9 — `README.md`

Status: pending

Run `/update-readme` (or do its job by hand): in the status paragraph's list
of start-screen choices, add the player-matching nodes choice (off, double
or required, shown only under steal, off to start) in the start screen's new
order (node playstyle first); correct "the eight choices" (twice) to reflect
the new count — the group is conditional, so word it so it stays true (for
example "the choices"); add "player-matching nodes" to the list of what the
quick guide explains; and, where the README describes steal (around its
"Steal sets all of that aside" passage), add one plain sentence on matched
nodes. Keep the wording for a non-technical reader and name no colour
palette beyond "red" and "green".

Depends on: Steps 4 and 8 (the start screen and the guide as built).

Verification (automated): `npm run format:check` clean and full `npm test`
green (unaffected). By inspection: every start-screen choice the README
lists exists in `StartScreen.tsx` in that order, and no count in the README
is false.

---

### Step 10 — The owner plays it

Status: pending

No code, unless the owner's play turns up a defect — fix it here, with a
test where the defect is in logic, and record it in the Notes. If a fix
needs a rules wording change, fold it into 0.40's entry (S15).

Depends on: every step above.

Verification (manual): the owner plays steal games in `npm run dev` and
walks the story's own Verification list:

- `RULES_VERSION` and `rules.md` both read 0.40, with one changelog entry
  (already asserted by the suite).
- Start screen order, the group appearing only under STEAL with OFF
  preselected.
- OFF: a steal game looks and plays exactly as before.
- DOUBLE/REQUIRED: a red and a green node, colours per the table at five,
  four and three nodes.
- DOUBLE, bonus: red on its own node and one other collects 6; the row is
  one longer; three pips lit. Holding the opponent's node counts it once.
- REQUIRED: holding nodes but not one's own collects nothing and shows an X
  per node; standing on one's own collects and lights as usual. A bonus
  planet still pays on landing (play with the planet bonus on).
- A game started under another playstyle after setting DOUBLE or REQUIRED
  under STEAL has no red or green node.
- The choice survives a return to the start screen.
- Taking the opponent's node under REQUIRED shuts off their income while it
  is held.
