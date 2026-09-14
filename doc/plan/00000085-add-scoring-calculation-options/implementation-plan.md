# Implementation Plan — Story 00000085, Simple or bonus scoring

## What this story does

Since rules version 0.29 a turn has paid **one energy for each charged node
held** and nothing else. This story makes scoring **a choice the players make
before play begins** — **SIMPLE** or **BONUS** — in the shape the fleet size,
the charged-node count, combat, the rounds and the clock already are, and the
app preselects **SIMPLE**, so the game a player gets without touching anything
is the game they get today.

Under bonus, each node held is worth one more than the one before it, so a
whole turn pays **1, 3, 6, 10 or 15** — the triangular total of the nodes
held. It is the whole turn's payout, not a per-node rate: under bonus there is
no meaningful "which node paid the 3".

Because a bonus turn's payout can no longer be read off the pip row, the HUD's
pip row gains **a number under each pip** — what a turn pays when that many
nodes are held — with exactly the number at the current count drawn in the
side's colour and the rest grey. The numbers are drawn at both settings.

`story.md` in this folder is the owner's full statement of the change. This
plan does not restate its argument; it says how to get there, in what order,
and records the decisions, because code in this repository deliberately
carries no design history (`CONTRIBUTING.md`, "Comments").

## Baseline on this branch

Branch `feat/85-add-scoring-calculation-options`, clean at the start of
planning (`story.md` already committed).

- `npm test` — **65 test files, 1237 tests, all green**.
- `npm run typecheck` and `npm run lint` — clean.
- `npm run format:check` — **three pre-existing warnings**:
  `doc/plan/00000069-retire-actions/story.md`,
  `doc/plan/00000085-add-scoring-calculation-options/story.md` and
  `src/board/planetArt.ts`. None of the three is this story's to fix and none
  must be "tidied" in passing — in particular, do not reformat this story's
  own `story.md`. (This `implementation-plan.md` may itself want formatting;
  run `npx prettier --write` on **it** only if it is flagged.)

The test count will **rise** over this story. No step may lower it.

## Vocabulary reminder for the implementer

- **Ply** is the code and planning word; **turn** is what `rules.md`, the UI
  and `README.md` say (`CLAUDE.md`, Vocabulary). Do not mix them.
- **Move** is the movement action specifically, never a synonym for a turn.
- **Node** is the word everywhere.
- The player-facing words for the setting are **SIMPLE** and **BONUS**; those
  two uppercase strings are start-screen chrome and live on the start screen.
  The code word is `scoring`, whose values are the lowercase `"simple"` and
  `"bonus"` (D1).
- Since rules version 0.32 `rules.md` **names no default and no "standard
  game"** for any option: each section lists the options and says the choice is
  the same for both players and fixed for the game's lifetime. Which option
  the app preselects is purely an app matter. Do not reintroduce "default" or
  "standard game" language into `rules.md`.

## Settled decisions — do not reopen

These come from `story.md` and the discussion around it. A step that finds one
inconvenient escalates to the owner rather than re-deciding.

- **S1. Two settings, simple or bonus, and nothing between or beyond.** No
  third mode, no per-node bonus depending on which node or how long it has
  been held, and nothing is built to make a third mode easy later.
- **S2. Chosen before play and fixed for the game's lifetime.** No mid-game
  toggle. The only thing the HUD says about the setting is the row of numbers
  under the pips — no badge, no legend, nothing in the game-over panel.
- **S3. The app preselects SIMPLE**, and simple is the default everywhere in
  the code a default is reached for. `rules.md` states the choice and names no
  default.
- **S4. Bonus pays the triangular total of the nodes held** — 1, 3, 6, 10, 15
  for one through five — as one payout for the whole turn.
- **S5. Nothing downstream of the payout changes.** The collection is still
  one `energy-collected` effect carrying one amount and the squares it came
  from, so `EnergyOverlay`'s single `+N` at the centroid and
  `announcements.ts`'s "collected N energy from 3 nodes at …" are already
  correct under bonus. Verified during planning: `energyCollectedClause` reads
  `effect.amount` and `effect.squares.length` as separate things, and
  `EnergyOverlay` reads `effect.amount` and `effect.squares` separately. **No
  change is planned to either file**; if a step finds one is needed, record it
  in `Notes:` and escalate.
- **S6. Which nodes count, and when, does not change.** Charged only,
  standing on it only, at the end of your own turn only (§8.4). Collection
  stays at step 2 of §8.6, before depletion at step 3. `chargedNodesHeldBy` is
  untouched.
- **S7. Nothing subtracts energy at either setting**, and a total only ever
  rises.
- **S8. How many pips are drawn does not change** — still the smaller of the
  side's ship count and the board's charged-node count, still lit by the nodes
  held. The row is not re-scaled, re-spaced or re-coloured beyond making room
  for the numbers beneath it.
- **S9. Nothing is retuned against bonus**: the countdown lengths, the node
  economy, the fleet sizes, the game lengths and the clock all keep their
  values.
- **S10. The rules edit is its own commit, ahead of the code.** `rules.md`
  0.34 → 0.35, `RULES_VERSION` to match, one `changelog.md` entry. **One
  version bump for the whole branch**: if a later step finds more wording to
  correct in `rules.md`, it folds into 0.35's entry and does not add a second
  bump.
- **S11. Tagging stays on hold** even though this is a gameplay change
  (`CLAUDE.md`). Bump the version, write the changelog entry, do not tag.
- **S12. No accessibility repair steps, no review fixtures, no manual test
  scripts** (`CLAUDE.md`, pre-release stance). Where an existing automated
  test has a straightforward path to being updated, update it. One accessible
  behaviour is knowingly given up and recorded rather than repaired (D11).
  Manual verification never asks the owner to check live-region wording — the
  automated suite covers that.
- **S13. Restyling the start screen is out of scope.** The legends are
  centred (Step 8); nothing else about the screen's spacing, sizing or order
  is opened.
- **S14. The Quick Guide's scoring diagram is corrected** (Step 12). The
  owner reversed `story.md`'s original "the diagrams are untouched" during
  plan approval: diagram 1's `+3` note asserts the simple rate beside copy
  that now says scoring is one of two, and a picture contradicting the
  paragraph above it is not residue worth keeping. **Step 12 is a deliberate
  placeholder** — the owner supplies what the diagram should show when the
  step is reached. The guide's other four diagrams stay untouched.
- **S15. No backwards compatibility** for games recorded under 0.34
  (`CLAUDE.md`).

## Decisions this plan makes

### D1. The state carries `scoring: ScoringSetting`, a two-string union

The same name at every layer:

| Layer              | Where                                                       |
| ------------------ | ----------------------------------------------------------- |
| Game state         | `GameState.scoring` (required, `ScoringSetting`)            |
| Starting options   | `StartingGameStateOptions.scoring` (optional, `string`, D3) |
| Session intent     | the `new-game` intent's `scoring` (required)                |
| App screen state   | `AppScreen.scoring` / `setScoring`                          |
| Start screen props | `scoring` / `onScoringChange`                               |

Rejected: a boolean, in `combatEnabled`'s shape. Combat earns a boolean
because every point of use asks a yes/no question; scoring's points of use ask
_which rate_, and a boolean would put `bonusScoring ? triangular : flat` at
each of them and force the reader to remember which way round `false` means.
The union also gives `energyForNodesHeld(nodesHeld, scoring)` a self-reading
second argument, and it is the shape `ClockSetting` already uses for §10's
choice. It is **not** an invitation to a third mode (S1): a two-member union
is simply the honest type for two named settings.

Also rejected, and not available anyway: deriving the setting from a board. A
board carries no record of what its turns paid, and a total of 6 is three
turns at simple or one at bonus. That is the same reason `lengthInRounds`,
`chargedNodeCount` and `combatEnabled` are stored on the state, and the reason
this must be state rather than an app-level flag passed around beside it.

### D2. The option's constants live in a new leaf module, `src/rules/scoring.ts`

The offered settings, the default and the guard go in `src/rules/scoring.ts`,
which imports **nothing** from `src/rules` — a leaf, exactly as `clock.ts`,
`fleet.ts`, `nodes.ts` and `combatSetting.ts` are.

They do **not** go in `energy.ts`, even though §8.4 lives there, for the same
reason story 83 moved combat's constants out of `combat.ts` mid-flight:
`gameState.ts` needs the default to build a state, and `energy.ts`
value-imports `gameState.ts` for `shipsBySquare`, `nodeSquares` and
`nodeStateAt`. Putting the default in `energy.ts` would create a runtime
import cycle in `src/rules`, which this package does not have and should not
acquire. `energy.ts` importing the **type** from `scoring.ts` is fine and is
what the arithmetic does (D4).

### D3. The starting option is typed `string` so the guard really validates

`StartingGameStateOptions.scoring` is typed **`string`**, not
`ScoringSetting`, and `startingGameState` validates it with
`isScoringSetting`, throwing a `RangeError` naming the offered settings —
exactly as `chargedNodeCount?: number` is validated with `isChargedNodeCount`
and `fleetSize?: number` with `isFleetSize`.

This is deliberate and is the point of the story's line that this "gives
`isScoringSetting` a real caller from the start, unlike `isClockSetting` and
`isCombatSetting`". Typing the option `ScoringSetting` would make the guard
dead code and the `RangeError` unreachable; a setting that arrives from
outside the type system — a saved options blob, a game record, a URL — is a
string, and this is where it is caught. Do **not** narrow the option's type to
make the validation "unnecessary".

`GameState.scoring` itself stays the narrow `ScoringSetting`: by the time it
is on the state it has been validated.

The guard's parameter is `unknown`, following `isClockSetting` and
`isCombatSetting`; it still narrows a `string`-typed value at the call site,
and `unknown` is what the eventual record-loading boundary will hand it.

### D4. One function prices a count, and it lives in `energy.ts`

`energyForNodesHeld(nodesHeld, scoring)` goes in `src/rules/energy.ts`, beside
`chargedNodesHeldBy`, because that module is where §8.4 lives. It returns
`nodesHeld` under simple and the triangular total `n × (n + 1) / 2` under
bonus.

It is written as **the formula, not a lookup table**. A table would need a
bound to maintain, and the largest count the board can produce has already
changed once (four to five). The name is deliberately the one version 0.29
deleted — the same function coming back, generalised.

**Two callers, and only one of them pays anybody.** `endOfTurn.ts` step 2 is
the only place in the app that prices a collection (Step 5). `ScoreDisplay`
also calls it (Step 9), but to ask what a _hypothetical_ count would pay so it
can draw the numbers under the pips — which is precisely why the arithmetic is
shared rather than copied into the component. If a **third** caller turns out
to be needed, that is a finding worth recording in the step's `Notes:` and
escalating: it means something computes a payout without going through §8.4.

Checked during planning: the other two readers of `chargedNodesHeldBy` —
`announcements.ts`'s `scoreSentence` and `ScoreDisplay`'s pip count — use the
**count** of nodes held and never a payout, so neither changes because of the
rate (S5, D11).

### D5. The test sweep sets `"simple"`, and is inert by construction

Adding a required field to `GameState` breaks every test file that builds a
state literal — **23 files**, each with its own local builder (listed in Step
4). Every one is set to `scoring: "simple"`, which is exactly the semantics
every existing expectation was written under, so the sweep is
behaviour-preserving by construction: if the suite goes red during it, that is
a real mistake, not an intended change.

**Unlike story 83's sweep, `startingGameState` callers need no change at all.**
That story's new default (combat off) differed from the behaviour existing
tests assumed (combat on), so every call had to be pinned. Here the new
default _is_ the old behaviour, so a test that says nothing about scoring
keeps playing the game it always played. Touch only the literal builders,
which `npm run typecheck` finds for you exhaustively.

Do the sweep in **one pass**, not file by file as failures appear in later
steps, so each later step's diff is about behaviour rather than about
builders.

### D6. The intent and the hook land in one step

Story 83 split "the `new-game` intent carries the choice" from "`useAppScreen`
holds the choice" and then committed the two together, because making the
intent field required forces a temporary literal into `useAppScreen.ts` that
the next step immediately replaces in the same file. This plan does the two in
one step (Step 6) and skips the temporary literal.

### D7. The pip row becomes a row of columns, each a pip over its number

`ScoreDisplay` today renders `.score-display__pips`, a flex row with a `0.35em`
gap, holding one `.score-display__pip` per pip; the landscape media query
re-sizes the whole row by setting its `font-size`, so the pip's `0.6em`
diameter and the row's `em` gap scale with `--region-extent`.

The numbers go **inside that row**: each pip is wrapped in a column that holds
the pip above its number. Consequences, all wanted:

- each number is centred under **its own** pip by construction, at every fleet
  size, charged-node count and orientation — there is no second row whose
  widths have to be made to agree with the first's;
- the landscape font-size rule keeps working untouched, because everything is
  still inside `.score-display__pips`;
- the score cell gains **only** the number row's height plus one small
  in-column gap — not a third `0.25rem` cell-level gap — which is the
  cheapest thing that can be done to `--region-extent` (D8);
- `aria-hidden` on `.score-display__pips` already covers everything inside it,
  so the numbers are decorative without any new attribute (S12, D11).

Rejected: a separate second flex row of numbers under the pip row. A `15` and
a `1` have different widths, so two independently laid out rows would drift
out of alignment at exactly the setting the numbers exist for. Rejected: a CSS
grid rebuild of the row — more change than the job needs, and the landscape
rule's font-size trick would have to be re-thought.

**The columns must be equal width**, or a two-digit number would push its pip
out of an otherwise even row. Give the column a fixed `em`-based width or
min-width (so it scales with the row's font-size in landscape) that comfortably
holds two arcade digits at the number's own size.

**The number's font-size must be a fraction of the row's `em`, not `1em`.**
Arithmetic, which the implementer should re-check by measuring in the browser:
in landscape the row's font-size is `--region-extent × 0.175`, so a pip is
`0.105P` across, the gap `0.061P`, and a five-pip row `0.77P` — the figure
`App.css`'s landscape comment already quotes. Two arcade digits at `1em` are
roughly `1.2em ≈ 0.21P`, which would make a five-column row about `1.3P`:
**wider than the fixed-width info column itself**. At roughly `0.55em` the
column is about `0.115P` and the row about `0.82P`, which still fits. Pick the
fraction by eye and by measurement, keep the row at or under about `0.85P`,
and say in `Notes:` what was chosen and what the row measures.

**Colouring**: the number at the current count carries a modifier class drawn
in the side's own colour (`--color-green` / `--color-red`); every other number
is `--color-text-dim`. A side holding nothing has an entirely grey row. This
is deliberately **not** the lit-pip treatment repeated — the pips say how
many, the coloured number says what that is worth this turn.

### D8. `--region-extent` is re-derived, not padded

`App.css`'s `:root` comment itemises how `P` is arrived at, and the
ScoreDisplay cell is the taller of the two things it is derived from. Today:

- title: `1.5 × clamp(1.5rem, 4vw, 3.5rem)` + `1rem` margin → 3.25 .. 6.25rem;
- score cell: name `1.5 × clamp(0.75rem, 1.5vw, 1rem)` + digits
  `1.5 × clamp(1.5rem, 4vw, 2.5rem)` + one `0.6rem` pip row + two `0.25rem`
  gaps → 4.475 .. 6.35rem;
- HUD row gap `0.5rem` + turn indicator `1.5 × clamp(1rem, 2.5vw, 1.25rem)`
  → 2.0 .. 2.375rem;
- summed ≈ 9.7 .. 15.0rem, tracked by
  `--region-extent: clamp(9.85rem, 26.5vw, 15.2rem)`.

`P` is subtracted from the board's side **twice over** in `--play-size`, so an
over-generous `P` costs the board directly. The number row therefore has to be
carried into the sum honestly and the `clamp()` moved to track the new range —
the comment's arithmetic corrected, not annotated (Step 10). Keep the added
height as small as legibility allows; every extra `1rem` of `P` takes `2rem`
off the board in portrait.

The landscape comment's width claim ("a pip row … drawing about `4.4em ≈
0.77P` across … can be the widest thing in the column") is now wrong by
however much the number columns widen the row, and is corrected in the same
step.

### D9. The legend rule is settled against the running app, not guessed

`story.md` deliberately does not state the cause, and nobody has yet watched
the screen in a browser. What is known from the stylesheet:
`.start-screen__options` is a `fieldset` laid out as a flex column with
`align-items: center`, and `.start-screen` sets `text-align: center` for the
whole screen — yet the legends sit left of their choices.

The mechanism is that a `<legend>` is **not an ordinary flex item of its
fieldset**: browsers lay the rendered legend out specially, as a box at the
block-start edge of the fieldset's border box, so the fieldset's
`align-items` does not reach it; and the inherited `text-align: center` only
centres text _inside_ that box, which is already shrink-to-fit, so it has
nothing to do. The fieldset itself shrink-wraps to its widest child (the row
of choices), which is what makes the offset visible.

Step 8 confirms that in the running app and settles on **one rule in one
stylesheet** (`.start-screen__legend` or `.start-screen__options`). The
likeliest is `margin-inline: auto` on the legend, which is the documented way
to move a rendered legend along its inline axis; `width: 100%` plus
`text-align: center` on the legend is the fallback; `align-self: center` is
expected **not** to work and is listed only so nobody spends time on it twice.
The rule must hold for all six legends including the long "Clock (time per
move)", in both orientations, and must not change the groups' vertical
spacing.

This cannot be verified by the test suite — `StartScreen.test.tsx` asserts DOM
and accessible names, not layout — so the step's verification is the owner's
eye (S13 keeps its scope to the one rule).

### D10. Where "bonus reaches a real game" is proved end to end

`App.test.tsx` renders the whole app, so it can prove the choice travels from
the start screen into a dealt game — but it cannot easily _drive a
collection_, which would need a ship to reach a charged node at a square the
deal chose at random.

The numbers under the pips solve this: they are DOM text, they are drawn from
`state.scoring`, and they are on screen the instant a game starts. So Step 9
asserts through the real app that a game started with the default reads
`1 2 3 4 5` under its pips and a game started with BONUS reads `1 3 6 10 15`.
Step 7's `App.test.tsx` work is limited to the six groups, their order and
defaults, and the choice surviving a return to the start screen; the payout
arithmetic itself is proved at the rules layer (Steps 3 and 5).

### D11. The one accessibility cost, knowingly accepted

The score cell's hidden sentence stays `"Green: 24 energy, 3 nodes held."`.
Under bonus that no longer tells a screen-reader user what the turn pays: the
count is spoken, the rate the new numbers carry is not. The sentence remains
accurate — it is simply no longer the whole of what the cell shows. Recorded
in `doc/plan/00000021-accessibility-tech-debt/known-issues.md` as part of Step
9 rather than repaired (`CLAUDE.md`, pre-release stance).

### D12. What is **not** touched

- `chargedNodesHeldBy` and everything about which nodes count (S6).
- `EnergyOverlay.tsx` and `announcements.ts` (S5).
- The pip count, the pips' colours and the lit-pip treatment (S8).
- `combat.ts`, `movement.ts`, `power.ts`, `planets.ts`, `trap.ts`,
  `relief.ts`, `countdown.ts`, `charging.ts`, `gameLength.ts`, `clock.ts` —
  none of them consults this choice.
- The game-over panel, the round counter, the clock region (S2).
- The Quick Guide's other four diagrams — movement, refuelling, the node
  lifecycle, node selection. Only the scoring diagram changes (S14, Step 12).
- `seededReplay.test.ts`'s recorded expectations. This story adds **no** step
  to the seeded stream: scoring is arithmetic over a board that was dealt the
  same way, so the same seed deals the same board at both settings and a
  recorded game diverges only in its totals. If any recorded figure in that
  file moves, **stop and escalate** — it means something changed the stream,
  which nothing here should.

## Step sequence at a glance

1. `rules.md` 0.34 → 0.35, `RULES_VERSION`, changelog — **its own commit,
   ahead of the code**.
2. `src/rules/scoring.ts`: the offered settings, the default, the guard.
3. `energyForNodesHeld` in `src/rules/energy.ts` — no consumer yet.
4. `GameState.scoring` and the starting option, plus the one-pass test sweep.
5. `endOfTurn.ts` step 2 prices the turn.
6. The `new-game` intent carries the choice and `useAppScreen` holds it.
7. The start screen's sixth group, and `App` wires it.
8. The option legends are centred. **Manual.**
9. The numbers under the pips, and the accessibility note.
10. `--region-extent` is re-derived. **Manual.**
11. The Quick Guide's copy.
12. The Quick Guide's scoring diagram. **Placeholder — owner supplies the
    detail when the step is reached.**
13. `README.md`.
14. The owner plays a simple game and a bonus game. **Manual.**

---

### Step 1 — `rules.md` 0.34 → 0.35: scoring becomes a choice

Status: committed

Notes: `rules.md` bumped to 0.35; `RULES_VERSION` matched; one changelog entry
added, newest first, in the 0.34 entry's shape. §8.4 now opens by stating
scoring as simple-or-bonus, chosen before play and fixed for the game's
lifetime, naming no default, then gives both rates (simple: one per node
held; bonus: the triangular total, 1/3/6/10/15), keeping the "board never
charges more than the chosen number" and "nothing subtracts energy"
paragraphs as they were. §8.3's leaving paragraph is restated so it no longer
attributes a share of the collection to the individual node left behind.
§10's opening sentence adds scoring to the list of pre-play choices. Checked,
not rewritten (all already correct and figure-free): §2's Node entry, §8.1's
Charged bullet, §8.6 step 2, §1's overview, §8.3's worked table and the
paragraph under it, §8.5. §9 does not list the pre-play choices at all
(it only names the rounds), so nothing there needed scoring added.
`tech-notes.md` contains no mention of energy, scoring or payout figures, so
nothing there assumes the flat rate. `npm run typecheck`, `npm run lint` and
`npm test` all clean/green (65 files, 1237 tests — unchanged, as expected
since no behaviour changed yet); `npm run format:check` reports two
pre-existing warnings (`doc/plan/00000069-retire-actions/story.md` and
`src/board/planetArt.ts`), one fewer than the baseline's three because this
story's own `story.md` is no longer flagged — not touched by this step. No
deviation from the plan.

Update `doc/ruleset/rules.md` so no section states one energy per node as the
only rate, bump the document to **0.35**, bump `RULES_VERSION` in
`src/rules/rulesVersion.ts` to match, and add **one**
`doc/ruleset/changelog.md` entry for 0.35, newest first, in the shape the 0.34
entry uses. This step is **its own commit, ahead of all code changes** — the
document is what every later step implements.

Phrase the choice the way §8.1 and §7 phrase theirs: stated where the choice
is defined, referred back to elsewhere, **naming no default** and never using
the words "standard game".

**§8.4, "Energy" — where the choice is defined**, since it is the section the
choice governs. Open the section by stating it: scoring is **simple or
bonus**, the same for both players, chosen before play begins and fixed for
the game's lifetime. Then give the two rates:

- **Simple** — one energy for each charged node held; hold three, collect
  three.
- **Bonus** — each node held is worth one more than the node before it, so a
  turn pays **1, 3, 6, 10 or 15**. State it as the whole turn's payout, not as
  a per-node rate.

Keep, unchanged in substance: the sentence that a node counts only if one of
that player's ships is on it at that moment and that flying across collects
nothing; the paragraph saying the board never charges more than the chosen
number of nodes at once but that this is a fact about the board rather than a
cap on collecting; and the "nothing subtracts energy, a total only ever rises"
paragraph, which holds at both settings.

**§8.3** — the paragraph about a ship leaving a charged node currently says
"Leaving also forfeits that turn's energy from it, since energy counts the
nodes a player is standing on when their turn ends." That attributes a share
of the collection to one node, which bonus has no way to do. Restate it so it
holds at both settings: leaving drops that turn's collection to what the
remaining nodes pay. Keep the rest of the paragraph — that the square depletes
on the spot, that a node cannot be handed back or inherited, and that the
shortfall is filled at the end of the turn.

**Check, do not rewrite** — each of these is expected to be correct already;
say in `Notes:` which were checked and which, if any, actually needed a word:

- **§2's Node entry** and the **Charged** bullet of **§8.1**: a ship standing
  on a charged node collects (§8.4). Neither should quote a figure.
- **§8.6 step 2**: "The moving player collects energy for the charged nodes
  they hold (section 8.4)" — quotes no figure.
- **§1's overview**: "collecting **energy** for every turn they hold one" is
  true at both settings.
- **§8.3's worked table** of a node held to the end ("green collects a sixth
  time…") and the paragraph under it: these count **occasions** of collecting,
  not amounts, so they should still read true. If any sentence there reads as
  a claim about the amount, restate it in the same way §8.3's leaving
  paragraph is restated above.
- **§8.5's** "A **depleted** node pays nothing … a **charged** node pays
  energy to the ship holding it": no figure, expected fine.
- **§9**: names only the number of rounds; check whether it lists the pre-play
  choices at all and say so either way.

**§10's opening sentence** lists what is chosen before play — the fleet size,
the number of rounds, the charged-node count and whether combat is on — and
gains **scoring** alongside them.

**`doc/ruleset/tech-notes.md`** — check whether any measured figure or sizing
argument there assumes the flat rate, and record the answer in `Notes:` either
way. It carries no version of its own and is not part of the ruleset a player
reads.

**The changelog entry** states that this is a **gameplay change** — the same
board can now pay two different amounts — and so would be a tag candidate,
with tagging staying on hold (S11). Say what changed section by section, in
the shape the 0.34 entry uses. Do not name a default in the entry: which
setting the app preselects is an app matter and belongs in this plan and the
README, not in the ruleset's changelog.

Depends on: nothing. This is the first step.

Verification (automated): `npm test` green — in particular
`src/rules/rulesVersion.test.ts`, which asserts `RULES_VERSION` matches the
version in `rules.md`, so a bump in one and not the other fails. Test count
stays at 1237: no behaviour has changed yet. `npm run typecheck` and
`npm run lint` clean; `npm run format:check` reporting only the three
pre-existing warnings from the baseline. Plus a read of the changed sections
confirming that §8.4 states the choice and both rates, that no section states
one energy per node as the only rate, and that no section attributes a share
of a turn's collection to an individual node.

---

### Step 2 — `src/rules/scoring.ts`: the offered settings, the default, the guard

Status: committed

Notes: Added `src/rules/scoring.ts` as a leaf module (imports nothing from
`src/rules`) with `ScoringSetting`, `SCORING_SETTINGS` (`["simple", "bonus"]`),
`DEFAULT_SCORING` (`"simple"`) and `isScoringSetting`, in the shape
`combatSetting.ts` uses, with the guard's doc comment noting it has a real
caller from the start (D3) rather than the "nothing calls this yet" note
`isClockSetting`/`isCombatSetting` carry. Added `src/rules/scoring.test.ts`
covering the offered order, the default, acceptance of both settings and
rejection of a near-miss string, an arbitrary string, numbers, `null`,
`undefined` and an object. No consumer wired up yet, as the plan specifies.
`npm run typecheck` and `npm run lint` clean; `npm test` green at 66 files,
1241 tests (up from 65/1237 — the four new cases). No deviation from the
plan.

Add a **new leaf module** `src/rules/scoring.ts` holding the pre-play choice
as pure data, in the shape `clock.ts`, `combatSetting.ts`, `fleet.ts` and
`nodes.ts` use for their own options:

- **the setting type**, a union of the two lowercase strings `"simple"` and
  `"bonus"`;
- **the offered settings**, as a readonly array in the order the start screen
  renders them — **simple first**, so leftmost is what the app preselects (say
  that in the doc comment, as `CLOCK_SETTINGS` and `CHARGED_NODE_COUNTS` do);
- **the app's default**, simple;
- **a type guard** over an `unknown` value. Unlike `isClockSetting` and
  `isCombatSetting`, this one gets a real caller two steps from now (D3), so
  its doc comment should say what it guards — a setting arriving from outside
  the type system, which is where `startingGameState` validates it — rather
  than the "nothing calls this yet" note those two carry.

The module must import **nothing** from `src/rules`; it is a leaf, and that is
what keeps `gameState.ts` from acquiring a runtime import cycle through
`energy.ts` (D2). The SIMPLE/BONUS wording is start-screen chrome and does
**not** live here (Step 7).

Nothing consumes any of it in this step.

**Tests in a new `src/rules/scoring.test.ts`**: the offered settings are
exactly simple then bonus, in that order; the default is simple and is one of
the offered settings; the guard accepts both settings and rejects a
near-miss string (`"SIMPLE"` uppercase), an arbitrary string, a number,
`null`, `undefined` and an object.

Why it comes here: Steps 4, 6 and 7 all import the default and the offered
settings, and Step 3 imports the type. A constant with no consumer is the
smallest thing that breaks the cycle between "the state has a field" and "the
app has a default to put in it".

Depends on: Step 1 (the rules document defines the choice these constants
offer).

Verification (automated): `npm test` green with the new `scoring.test.ts`;
`npm run typecheck` and `npm run lint` clean. Test count rises.

---

### Step 3 — `energyForNodesHeld` in `src/rules/energy.ts`

Status: committed

Notes: Added `energyForNodesHeld(nodesHeld, scoring)` beside
`chargedNodesHeldBy` in `src/rules/energy.ts`, written as the formula (simple
returns the count, bonus returns the triangular total), with a doc comment
naming §8.4 and stating it is the whole turn's payout rather than a per-node
rate. Updated the module header, which previously stated the flat rate as the
only one. `chargedNodesHeldBy` and its tests are untouched. Added cases to
`src/rules/energy.test.ts` for simple (0–5), bonus (0–5, expecting
0/1/3/6/10/15), zero at both settings, and the uncapped formula at six and
seven (21, 28). No consumer wired up yet, as the plan specifies — `endOfTurn`
is Step 5. `npm run typecheck` and `npm run lint` clean; `npm test` green at
66 files, 1245 tests (up from 66/1241 — the four new cases); `npm run
format:check` reports only the two pre-existing warnings
(`doc/plan/00000069-retire-actions/story.md` and `src/board/planetArt.ts`). No
deviation from the plan.

Add `energyForNodesHeld(nodesHeld, scoring)` to `src/rules/energy.ts`, beside
`chargedNodesHeldBy`, because that module is where §8.4 lives (D4):

- under **simple** it returns the count it was given;
- under **bonus** it returns the triangular total of that count, because each
  node held is worth one more than the one before it — 1, 3, 6, 10, 15 for one
  through five;
- **zero nodes pays zero** at both settings.

Write it as **the formula, not a lookup table** (D4), and say why in the doc
comment: a table would need a bound to maintain, and the largest count the
board can produce has already changed once. The doc comment names §8.4 and
says plainly that the result is the **whole turn's** payout, not a per-node
rate.

Update `energy.ts`'s **module header**, which currently opens "§8.4: which
charged nodes a side is standing on. A player collects one energy for each
charged node they hold" — that rate is now one of two.

**Do not** touch `chargedNodesHeldBy`: which nodes count is not what this
story changes (S6). Nothing consumes the new function in this step —
`endOfTurn.ts` is Step 5.

**Tests in `src/rules/energy.test.ts`**, added beside the existing
`chargedNodesHeldBy` cases, which stay exactly as they are:

- simple returns its argument for zero through five;
- bonus returns 0, 1, 3, 6, 10, 15 for zero through five;
- both return 0 for zero;
- it is a formula and not a capped table — bonus at six is 21 and at seven is
  28, above anything the board can currently produce.

Depends on: Step 2 (the setting type).

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean. Test count rises.

---

### Step 4 — `scoring` becomes part of the game state

Status: committed

Notes: `GameState` gained a required `scoring: ScoringSetting`, and
`StartingGameStateOptions` an optional `scoring?: string` (D3), validated in
`startingGameState` with `isScoringSetting` and a `RangeError` naming the
offered settings, in the same shape and position as `chargedNodeCount`'s
guard. `endOfTurn.ts` is untouched, so every game still pays the flat rate
after this step. The sweep set `scoring: "simple"` in the local
state-literal builder of 22 files (`typecheck` found every one
exhaustively): `Board.test.tsx`, `EnergyOverlay.test.tsx`,
`announcements.test.ts`, `ClockRegion.test.tsx`, `useGameClock.test.tsx`,
`session.test.ts`, `GameOverPanel.test.tsx`, `ScoreDisplay.test.tsx`,
`TurnIndicator.test.tsx`, `camping.test.ts`, `canMoveOrAttack.test.ts`,
`charging.test.ts`, `combat.test.ts`, `endOfTurn.test.ts`, `energy.test.ts`,
`fullGame.test.ts`, `movement.test.ts`, `openingBoard.test.ts`,
`ply.test.ts`, `recovery.test.ts`, `relief.test.ts`, `trap.test.ts` — one
fewer than the plan's 23 because `gameLength.test.ts` builds its states
through `startingGameState` alone (confirmed by grep before starting) and so
needed no touch at all, exactly as D5 predicts for every `startingGameState`
caller. Gave the `scoring` knob (default `"simple"`) to the three builders
Step 9's plan calls for: `endOfTurn.test.ts`'s and `ScoreDisplay.test.tsx`'s
config-object builders, and `fullGame.test.ts`'s `playFullGame`, whose
positional-parameter shape took a new trailing `scoring: ScoringSetting =
"simple"` parameter passed through to `startingGameState`. Added the
`gameState.test.ts` cases from the plan: default is simple, a given setting
round-trips with nothing else about the state changed, the setting is one of
`SCORING_SETTINGS`, it survives a move unchanged, and an off-list string (a
near-miss, an unrelated word, and an empty string) throws a `RangeError`.
`npm run typecheck` and `npm run lint` clean; `npm test` green at 66 files,
1253 tests (up from 66/1245 — the 8 new `gameState.test.ts` cases);
`src/rules/seededReplay.test.ts`'s three recorded expectations unchanged.
`npm run format:check` reports only the two pre-existing warnings
(`doc/plan/00000069-retire-actions/story.md` and `src/board/planetArt.ts`).
No deviation from the plan.

Add the field to the state and to the starting options, and sweep every test
that builds a state literal so the suite stays green and **unchanged in
meaning**.

**Production changes, all in `src/rules/gameState.ts`:**

- `GameState` gains a **required** `scoring: ScoringSetting`, documented in the
  shape `lengthInRounds`, `chargedNodeCount` and `combatEnabled` are: fixed
  for the game's lifetime once set by `startingGameState`, read from here by
  everything that prices a collection, and **not derivable from a board** — a
  board carries no record of what its turns paid, and a total of 6 is three
  turns at simple or one at bonus (D1).
- `StartingGameStateOptions` gains an **optional** `scoring?: string` —
  deliberately typed `string`, not `ScoringSetting` (D3) — defaulting to the
  constant from Step 2, with a doc comment saying it must be one of the
  offered settings or this throws a `RangeError`, exactly as `chargedNodeCount`
  and `fleetSize` do. Contrast it with `combatEnabled` in a clause: a boolean
  admits only the two settings the game offers and so has nothing to reject,
  while a setting named by a string can be any string.
- `startingGameState` destructures it with the default, validates it with
  `isScoringSetting` and throws a `RangeError` **naming the offered
  settings**, in the wording and position its three neighbours use, then
  writes it onto the returned state. It draws no randomness and changes no
  draw order: the opening deal is byte-for-byte what it was.

Nothing reads the field yet. `endOfTurn.ts` is untouched, so **every game
still pays the flat rate** at the end of this step — that is deliberate, and it
is what makes the sweep provably inert.

**The sweep (D5).** Set `scoring: "simple"` in the local state-literal builder
of each of these **23** files:

`src/board/Board.test.tsx`, `src/board/EnergyOverlay.test.tsx`,
`src/board/announcements.test.ts`, `src/clock/ClockRegion.test.tsx`,
`src/clock/useGameClock.test.tsx`, `src/game/session.test.ts`,
`src/hud/GameOverPanel.test.tsx`, `src/hud/ScoreDisplay.test.tsx`,
`src/hud/TurnIndicator.test.tsx`, `src/rules/camping.test.ts`,
`src/rules/canMoveOrAttack.test.ts`, `src/rules/charging.test.ts`,
`src/rules/combat.test.ts`, `src/rules/endOfTurn.test.ts`,
`src/rules/energy.test.ts`, `src/rules/fullGame.test.ts`,
`src/rules/gameLength.test.ts`, `src/rules/movement.test.ts`,
`src/rules/openingBoard.test.ts`, `src/rules/ply.test.ts`,
`src/rules/recovery.test.ts`, `src/rules/relief.test.ts`,
`src/rules/trap.test.ts`.

`npm run typecheck` is the proof the sweep is complete: a missed builder is a
compile error, not a silent default. If it names a file this list does not,
sweep that one too and note it.

**Tests that call `startingGameState` need no change at all** (D5) — the new
default is simple, which is the behaviour every existing expectation was
written under. Do not pin `scoring` at those call sites; that would be noise.

Where a local builder takes a config object, give it an optional `scoring`
knob defaulting to `"simple"` in the three files later steps need to flip:
`endOfTurn.test.ts`, `fullGame.test.ts` and `ScoreDisplay.test.tsx`.
Elsewhere a bare `scoring: "simple"` in the literal is enough.

**Cases to add in `src/rules/gameState.test.ts`** (which builds its states
through `startingGameState`, so it is the file where the default is the
subject):

- a state built with no options carries `scoring` **simple**;
- the option is carried through to the state when passed, both ways;
- the field survives play — apply a move or an end-of-turn sequence and assert
  `scoring` is unchanged, the same way the lifetime of `lengthInRounds` and
  `chargedNodeCount` is pinned;
- an off-list value throws a `RangeError` whose message names the offered
  settings. Because the option is typed `string`, this case needs no cast —
  which is the point of D3.

Why it comes here: the field must exist before anything can read it, and doing
the sweep in one pass keeps each later step's diff about behaviour.

Depends on: Step 2 (the default and the guard).

Verification (automated): `npm test` green with **no existing expectation
changed** — every assertion in the 23 files still asserts exactly what it
asserted before, including `src/rules/seededReplay.test.ts`'s recorded figures
(D12). `npm run typecheck` clean, which is also the proof the sweep is
complete. `npm run lint` clean. Test count rises by the new
`gameState.test.ts` cases.

---

### Step 5 — `endOfTurn.ts` step 2 prices the turn

Status: committed

Notes: `endOfTurn.ts` step 2 now computes
`energyForNodesHeld(heldSquares.length, workingState.scoring)` (reading
`workingState`, the entry state carried through the sequence, rather than
the outer `state` binding, since `scoring` does not change mid-sequence
either way) and updated step 2's code comment to describe pricing rather
than the flat rate; the `amount > 0` guard, the squares on the effect and
the step's position before step 3 are all untouched. Added cases to
`endOfTurn.test.ts` (bonus pays 6 for the same three squares that pay 3
under simple; one node pays 1 at both settings; holding nothing is not an
event under bonus either) and to `fullGame.test.ts` (a hundred-round bonus
game collects at least as much as the same seed and options at simple, and
both sides' running totals only ever rise at either setting). No change was
needed to `EnergyOverlay.tsx` or `announcements.ts` (S5): both already read
`effect.amount` and `effect.squares` separately, so the single
`energy-collected` effect this step now sizes differently reaches both
unchanged. No second production caller needed the pricing. `npm run
typecheck` and `npm run lint` clean; `npm test` green at 66 files, 1257
tests (up from 66/1253 — 4 new `endOfTurn.test.ts` cases and 1 new
`fullGame.test.ts` case); `npm run format:check` reports only the two
pre-existing warnings (`doc/plan/00000069-retire-actions/story.md` and
`src/board/planetArt.ts`); `seededReplay.test.ts`'s three recorded
expectations unchanged. No deviation from the plan.

**`src/rules/endOfTurn.ts`:** step 2 currently awards `heldSquares.length`
directly. It becomes `energyForNodesHeld(heldSquares.length, state.scoring)`,
and that is **the only place in the app that prices a collection** (D4). Note
that the state to read the setting from is the one in scope at step 2 — the
working state carried through the sequence, which carries `scoring` unchanged
from entry.

Everything else about step 2 stays:

- the `amount > 0` guard — a zero payout is still not an event, no effect and
  no other state change, and both settings pay zero for zero nodes;
- the effect still carries the **squares** the collection came from, unchanged
  and in board order, so `EnergyOverlay` and `announcements.ts` keep working
  untouched (S5);
- `newTotal` is still the side's total plus the amount;
- the step's position in §8.6 — before depletion at step 3 (S6).

Update step 2's code comment, which today says "the moving side collects one
energy for each charged node it holds right now (§8.4)": it now collects what
§8.4 prices the nodes it holds at this game's setting.

**Tests in `src/rules/endOfTurn.test.ts`** (using the `scoring` knob Step 4
gave its builder):

- a turn holding three charged nodes settles **3** under simple and **6**
  under bonus, with the **same squares** on the effect either way, and the
  side's total rising by that amount;
- a turn holding one node pays 1 at both settings — the settings agree at one;
- a turn holding none is **not an event** at either setting: no
  `energy-collected` effect and no change to either total.

**Tests in `src/rules/fullGame.test.ts`:**

- a whole game played to its last round at **bonus** ends with a total no
  smaller than the same game — same seed, same options otherwise — at
  **simple**, and both sides' totals only ever rise (S7) at both settings.

**A finding to record if it happens** (D4): if a second production site turns
out to need the pricing, say so in `Notes:` in as many words and escalate
rather than quietly adding one — it means something computes a payout without
going through §8.4.

Depends on: Steps 3 and 4 (the arithmetic, and the state field it reads).

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean. **`src/rules/seededReplay.test.ts`
passes with its expectations exactly as recorded** — the deal is unchanged at
both settings, and the replay it records is a simple game. If any figure there
moves, stop and escalate (D12).

---

### Step 6 — The choice reaches a new game, and the app holds it

Status: committed

Notes: `SessionIntent`'s `new-game` variant gained a required
`scoring: ScoringSetting`, `sessionReducer` passes `intent.scoring` straight
into `startingGameState`'s options, and the intent's doc comment now lists
scoring among what `new-game` carries. `useAppScreen`'s `AppScreen` gained
`scoring` and `setScoring`, initialised from `DEFAULT_SCORING` and dispatched
in `handlePlay`, with the module header and hook doc comment updated from
"five options"/"four options" to six. Added the nine `new-game` intent
literals in `session.test.ts` a `scoring: "simple"` field (found by
`typecheck`, matching the plan's count) and two new tests asserting a
`new-game` dispatch with `scoring: "bonus"` and `scoring: "simple"` each
produce a state carrying that setting. Added a `scoring` assertion to
`useAppScreen.test.tsx`'s default-options test and its PLAY-dispatch test,
plus a new test mirroring the existing combat-setting one: setting bonus,
dispatching PLAY, returning to start, and dispatching PLAY again all carry
bonus. `npm run typecheck` and `npm run lint` clean; `npm test` green at 66
files, 1260 tests (up from 66/1257 — three new cases); `npm run format:check`
reports only the two pre-existing warnings
(`doc/plan/00000069-retire-actions/story.md` and `src/board/planetArt.ts`).
No deviation from the plan.

**`src/game/session.ts`:** the `new-game` intent gains a **required**
`scoring: ScoringSetting`, alongside the seed, the length, the fleet size, the
charged-node count and the combat setting; `sessionReducer` passes it straight
into `startingGameState`'s options. Update the intent's doc comment, which
lists what `new-game` carries and says the reducer "uses what it is handed and
never draws a seed or reaches for a default itself" — that now covers this
field too.

**`src/useAppScreen.ts`:** `AppScreen` gains `scoring` and `setScoring`, held
with the other five options and initialised from Step 2's default (simple);
`handlePlay` dispatches it. Keeping it beside the others is what makes a game
return to the start screen with the setting it was played with still chosen.
Update the module header and the hook's doc comment, both of which say "the
five options" — it is six now.

The two files land together deliberately (D6): making the intent field
required breaks `useAppScreen.ts`'s single dispatch, and a temporary literal
there would be replaced in the same file moments later.

**Tests in `src/game/session.test.ts`:**

- the existing `new-game` dispatches gain `scoring: "simple"`, so they play
  the game they played before;
- a `new-game` dispatch with bonus produces a session whose state carries
  bonus, and one with simple likewise.

**Tests in `src/useAppScreen.test.tsx`:**

- the hook starts at simple;
- pressing play dispatches `new-game` carrying simple by default, in the shape
  the file already asserts intents (`expect.objectContaining`);
- after setting bonus, pressing play dispatches bonus;
- the setting survives `handleReturnToStart` — the hook still reports bonus
  after returning to the start screen, and a second `handlePlay` dispatches it
  again.

Depends on: Steps 2 and 4.

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean.

---

### Step 7 — The start screen's sixth group, and `App` wires it

Status: pending

**`src/start/StartScreen.tsx`:** add the sixth option group, **after Charged
nodes and before Combat**, so the order reads **Ships, Charged nodes,
Scoring, Combat, Rounds, Clock**. It is rendered by the same `OptionChoice`
the other five use, inside the same `fieldset` / `legend` /
`start-screen__choices` markup, with **no new CSS**: the legend reads
`Scoring` (the stylesheet uppercases it), and the two radios read **SIMPLE**
and **BONUS**, simple first and checked at first. Give it its own `useId`
group name and new props `scoring` / `onScoringChange`, controlled like the
other five.

The labels are start-screen chrome and live in one lookup beside
`CLOCK_SETTING_LABELS` — a plain map keyed by the setting. Unlike combat's
boolean, the setting is already a string, so the radios' `value` attributes
are the settings themselves and no `combatSettingValue`-style helper is
needed.

Update the module header and the component's doc comment, both of which say
"the five options".

**`src/App.tsx`:** take `scoring` and `setScoring` from `useAppScreen` and
pass them to `StartScreen`. Nothing else in `App` changes — the setting is
never shown during a game beyond the HUD numbers Step 9 adds (S2).

**Tests in `src/start/StartScreen.test.tsx`:**

- the Scoring group renders with both labels and the given one checked;
- the **six** groups render in order Ships, Charged nodes, Scoring, Combat,
  Rounds, Clock (the file already has a test asserting the five-group order —
  extend it rather than adding a second);
- SIMPLE is checked when the prop is simple, and the radios are in the order
  SIMPLE, BONUS;
- clicking BONUS calls `onScoringChange` with bonus, and clicking SIMPLE from
  a bonus state calls it with simple, without touching the other five
  handlers.

Follow the file's existing convention of mirroring the component's label map
locally rather than importing it, as it already does for the clock's and
combat's labels.

**Tests in `src/App.test.tsx`:**

- the opening assertion, which today names "all five option groups at their
  defaults", becomes **six** with SIMPLE preselected;
- the choice survives a return to the start screen: set BONUS, use the file's
  existing round-trip pattern, and confirm BONUS is still checked on return.

The end-to-end proof that a bonus game actually pays the bonus rate is Step 9's
(D10), because it needs the numbers under the pips to be visible.

Depends on: Step 6 (the hook holds the option).

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean; `npm run format:check`
reporting only the three pre-existing warnings from the baseline.

---

### Step 8 — The option group legends are centred

Status: pending

Everything else on the start screen is centred and the six legends are not.
This step is the cleanup, and it is **one rule in one stylesheet** (S13):
nothing else about the screen's spacing, sizing or order is opened.

Read D9 before starting — it states the mechanism (a `<legend>` is not an
ordinary flex item of its `fieldset`, so `.start-screen__options`'s
`align-items: center` never reaches it, and the screen's inherited
`text-align: center` only centres text inside a box that is already
shrink-to-fit and already at the inline start).

**What to do:**

1. Run the app (`npm run dev`) and look at the start screen. Confirm what is
   actually happening before changing anything: where each legend sits
   relative to its row of choices, and whether the fieldset is shrink-wrapping
   to the choices' width.
2. Apply **one** rule, in `src/start/StartScreen.css`, on
   `.start-screen__legend` or `.start-screen__options`. Try in this order and
   stop at the first that works: `margin-inline: auto` on the legend; then
   `width: 100%` with `text-align: center` on the legend. `align-self: center`
   is expected **not** to work — it is listed so nobody tries it twice.
3. Check all six legends, including the long "Clock (time per move)", in both
   portrait and landscape, and confirm the groups' vertical spacing is
   unchanged.
4. Give the rule a short comment saying why a legend needs its own rule rather
   than inheriting the fieldset's centring — that is exactly the kind of
   non-obvious CSS fact a comment is for.

Record in `Notes:` which rule was used and what was observed, so the next
person does not have to rediscover it.

**No test.** `StartScreen.test.tsx` asserts DOM structure and accessible
names, not layout, and the suite cannot see a rendered box. Nothing about the
DOM changes here, so no existing test should move; if one does, that is a
finding worth escalating.

Depends on: Step 7 (there are six legends to centre, and the new one must be
centred with the rest).

Verification (manual): the owner runs `npm run dev` and confirms that every
option group's title is centred over its choices, on the start screen, at a
normal window and at a narrow one, and that nothing else about the screen's
layout moved. `npm test`, `npm run typecheck` and `npm run lint` must also be
green — they simply cannot be the evidence for this step.

---

### Step 9 — The numbers under the pips

Status: pending

**`src/hud/ScoreDisplay.tsx`:** the pip row gains **a number under each pip** —
what a turn pays when that many nodes are held, from
`energyForNodesHeld(k, state.scoring)` for pip `k` counting from one — so the
row reads `1 2 3 4 5` under simple and `1 3 6 10 15` under bonus, truncated to
however many pips the row draws. **How many pips are drawn does not change**
(S8): still the smaller of the side's ship count and the board's charged-node
count.

Structure, colour and sizing are settled in **D7 — read it before starting**.
In short:

- each pip is wrapped in a column holding the pip above its number, inside the
  existing `.score-display__pips` row, so a number is centred under its own
  pip by construction and the landscape font-size rule keeps working;
- the columns are equal width, in `em`, wide enough for two arcade digits, so
  a `15` does not push its pip out of an even row;
- the number's font-size is a **fraction** of the row's `em` — roughly
  `0.55em`, to be settled by measuring — because five two-digit numbers at
  `1em` would be wider than the whole landscape info column;
- **exactly one number** is in the side's colour: the one at the count held
  right now. Every other number is `--color-text-dim`, and a side holding no
  charged nodes shows an entirely grey row. This is not the lit-pip treatment
  repeated;
- the numbers are decorative and inherit the `aria-hidden` already on
  `.score-display__pips`, like the pips and the digits themselves;
- the numbers are drawn in **both** scoring modes, so the cell's height is the
  same in every game.

`ScoreDisplay.css` keeps the pip's own size, border and lit fill exactly as
they are, and its landscape block keeps re-sizing the row through the row's
`font-size` (S8). The stylesheet's opening comment — "This cell's portrait
size — name, digits and pip row — feeds the `--region-extent` derivation in
`App.css`" — must name the number row too, and Step 10 does the derivation.

**Record the accepted accessibility cost** (D11) in
`doc/plan/00000021-accessibility-tech-debt/known-issues.md`, as a new "From
story 85" section in the file's existing shape (what was given up, why it is
still accurate, and a `Where:` line pointing at
`src/hud/ScoreDisplay.tsx` and `src/board/announcements.ts`): the score cell's
hidden sentence stays "Green: 24 energy, 3 nodes held.", which under bonus no
longer tells a screen-reader user what the turn pays.

**Tests in `src/hud/ScoreDisplay.test.tsx`** (using the `scoring` knob Step 4
gave its builder):

- the numbers read `1 2 3 4 5` under simple and `1 3 6 10 15` under bonus at
  six ships and five charged nodes;
- the row is truncated with the pips at a smaller fleet size or charged-node
  count — three pips means three numbers, `1 2 3` under simple and `1 3 6`
  under bonus;
- exactly one number carries the current-count mark at a non-zero count, and
  it is the number at the count held — check both a simple and a bonus state;
- **no** number carries it when the side holds nothing;
- the existing pip, digit and hidden-sentence cases still pass untouched.

**Test in `src/App.test.tsx`** — the end-to-end proof the choice reaches a
real game (D10): pressing PLAY with the defaults starts a game whose green
score cell reads `1 2 3 4 5` under its pips, and choosing **BONUS** before
PLAY starts one that reads `1 3 6 10 15`.

Depends on: Steps 3, 4 and 7 (the arithmetic, the state field, and a start
screen that can choose bonus).

Verification (automated): `npm test` green with the new cases;
`npm run typecheck` and `npm run lint` clean; `npm run format:check`
reporting only the three pre-existing warnings. The layout of the new row is
**not** verified here — Step 10 and Step 13 are where a person looks at it.

---

### Step 10 — `--region-extent` is re-derived

Status: pending

**Read D8 before starting.** `App.css`'s `:root` comment itemises how the
side regions' extent `P` is arrived at, and the ScoreDisplay cell — now
taller by a number row — is the taller of the two things it is derived from.
`P` is subtracted from the board's side **twice over** in `--play-size`, so
this is the story's one real layout risk: the derivation is **redone, not
padded**.

**In `src/App.css`:**

- correct the comment's itemisation of the score cell. Today it reads "name +
  digits + one 0.6rem pip row + two 0.25rem internal gaps -> 4.475rem ..
  6.35rem". With D7's structure the pip row becomes a pip block — pip row +
  the column's internal gap + the number row — and the cell still has its two
  `0.25rem` gaps at the cell level. Work the new minimum and maximum out from
  the actual values in `ScoreDisplay.css` after Step 9, and write the
  arithmetic out, not a hand-wave;
- re-sum the three contributions (title, score cell, HUD gap plus turn
  indicator) and move `--region-extent`'s `clamp()` so it tracks the new range
  the same way it tracked the old one — the same viewport-width scale as the
  content itself, rounded up slightly for breathing room rather than padded
  generously;
- correct the **landscape** comment's width claim. It says a five-pip row
  draws "about `4.4em ≈ 0.77P` across … so the pip row can be the widest thing
  in the column". Measure what the row with numbers actually draws and state
  the new figure, and confirm it still fits inside the fixed-width info
  column. If it does not, the number's font-size from Step 9 is too large —
  reduce it there rather than growing `P` in landscape.

Nothing else in `App.css` changes: not `--play-size`, not `--region-gap`, not
the landscape `--region-extent` clamp unless the width check above forces it
(and if it does, say so in `Notes:` with the measurement).

Depends on: Step 9 (the row whose height is being accounted for).

Verification (manual): the owner runs `npm run dev` and confirms, in a game
with six ships and five charged nodes:

- the HUD does not clip, overlap or reflow, in **portrait** and in
  **landscape**, at the window sizes the info column is sized for;
- the board is **not visibly smaller** than it is today — compare against
  `main` if in doubt;
- the numbers sit directly under their pips and the row does not overflow the
  info column in landscape.

`npm test`, `npm run typecheck` and `npm run lint` must also be green.

---

### Step 11 — The Quick Guide's copy

Status: pending

**`src/guide/guideCopy.ts`**, in the guide's own plain voice and its own
vocabulary — **points**, not energy; **spaceship**, not ship; **fuel**, not
power (the module header explains why those words are a knowing exception):

- **The intro paragraph** says "At the end of each turn, gain one point for
  each spaceship you have in a charged node", which is only true under simple.
  It becomes the choice, in **one short sentence** — not an explanation of the
  option, not a table. Something in the shape of: points are gained at the end
  of each turn for the charged nodes your spaceships are in — one point each
  under simple scoring, or more and more for each extra node under bonus. The
  exact wording is the implementer's to tighten; record it in `Notes:` if it
  differs from this.
- **The NODE LIFECYCLE paragraph** says "The spaceship gains 6 points if it
  stays on the node until it becomes depleted", which quotes a figure that
  holds only under simple and only while nothing else is held. Restate it
  **without the figure** — a spaceship that stays on a node until it depletes
  collects from it every turn it is there — keeping the rest of the paragraph
  (the countdown, leaving depleting the node, the replacement node, the
  five-turn trap) as it is.

**The diagrams are not this step's business.** Diagram 1's `+3` note is the
simple rate and does need correcting, but that is **Step 12**, whose content
the owner supplies when it is reached. Leave `guideDiagrams.tsx` alone here,
and do not pre-empt Step 12 by adjusting the copy to describe a diagram that
has not been decided yet.

**`src/guide/guideCopy.test.ts`** pins both strings verbatim — update the two
cases to the new copy. The section headings, their order and the other two
paragraphs are unchanged.

Depends on: Step 1 (the rules the copy paraphrases).

Verification (automated): `npm test` green with the updated `guideCopy`
cases; `npm run typecheck` and `npm run lint` clean. Plus a read of the two
paragraphs confirming the guide no longer states a points rate that only holds
under simple, and that it still reads as plain player-facing copy rather than
a rules extract.

---

### Step 12 — The Quick Guide's scoring diagram

Status: pending

> **This step is a deliberate placeholder.** The owner decided during plan
> approval that the guide's scoring diagram must be fixed, and will supply
> what it should show when the pipeline reaches this step. **Do not implement
> it from this text** — the orchestrator pauses here, the owner fills in the
> "What to implement" section below, and only then is the step dispatched. If
> you are reading this and the section is still empty, stop and say so.

**The problem this step exists to fix.** `src/guide/guideDiagrams.tsx`
diagram 1 (the scoring diagram, paired with the guide's intro paragraph)
draws three charged nodes with three ships on them, an arrow, and a note
reading `+3`. That is the **simple** rate. After Step 11 the paragraph
directly above it says scoring is one of two rates, so the picture asserts one
of them as though it were the only one. `story.md` originally chose to leave
the diagrams alone and record the mismatch; the owner reversed that — a
diagram contradicting its own caption is not acceptable residue.

**What to implement.** _To be supplied by the owner when this step is
reached._

**What is known now**, for whoever fills that in:

- The diagram is built from `GuideDiagramCell`s handed to `GuideDiagram`:
  three `chargedNodeCell`s, an arrow, and a `{ kind: "note", text: "+3" }`,
  laid out in 5 columns. Changing the note's text is trivial; changing the
  cell kinds, the column count or the diagram's shape is more.
- The guide keeps its own vocabulary — **points**, **fuel**, **spaceship** —
  which anything drawn or written here must follow (`guideCopy.ts`'s header
  explains why).
- `guideDiagrams.test.tsx` asserts the diagram's cells; `GuideScreen.test.tsx`
  pairs diagrams with sections. Both will need updating to match whatever is
  decided.
- The guide's other four diagrams stay untouched (S14).
- S12 still holds: no accessibility repair steps, and manual verification
  never asks the owner to check live-region wording.

Depends on: Step 11 (the copy this diagram sits beside) and Step 3 (the
arithmetic, if the diagram ends up showing a bonus figure).

Verification: **to be decided with the step's content.** If the diagram's
change is structural — different cells, a different column count — it is
**manual**: the owner opens the Quick Guide (`npm run dev`, then the Quick
Guide button on the start screen) and confirms the diagram reads correctly
beside its paragraph at both orientations. If it is only a change of note
text, the updated `guideDiagrams.test.tsx` case is enough and it is
**automated**.

---

### Step 13 — `README.md`

Status: pending

`README.md` describes the flat rate as the only rate, in three places found
during planning:

- the opening paragraph's "Hold a node and it pays you energy every turn";
- the **Status** block's list of what the start screen offers — currently five
  choices, twice counted as "the five choices" — which gains scoring
  (simple or bonus, simple to start) in its start-screen position, between the
  charged-node count and combat;
- the rules-summary paragraph's "A node also pays energy at the end of each
  turn to the player sitting on it: one energy for each lit node held, so a
  player standing on several at once collects that many."

Rewrite what needs it so scoring reads as **a choice**, in the README's
player-facing voice: the app starts with simple, where each node held pays
one; with bonus each extra node held is worth more than the last, so a turn
pays 1, 3, 6, 10 or 15. Do not make the README a second ruleset — a sentence
where the choice is introduced, and the existing prose held as the simple
game, is the whole job. Mention the numbers under the pips only if the Status
block's description of what the app shows would otherwise be wrong.

Then run `/update-readme`, which reviews the branch diff and updates anything
else the README describes that this story changed.

Depends on: Steps 1 to 12 (the README describes the finished behaviour).

Verification (automated): `npm test` and `npm run lint` green;
`npm run format:check` reporting only the three pre-existing warnings from the
baseline; and a read of `README.md` confirming it describes scoring as a
choice made before play, says the app starts with simple, counts **six**
choices in both places that count them, and no longer states one energy per
node as the only rate.

---

### Step 14 — The owner plays a simple game and a bonus game

Status: pending

The story's manual checks, gathered in one place. Nothing to implement; the
owner runs the app (`npm run dev`) and looks.

Depends on: every previous step.

Verification (manual):

- **The start screen.** Six option groups in the order **Ships, Charged
  nodes, Scoring, Combat, Rounds, Clock**, with **SIMPLE** checked in the new
  group and the other five at their usual preselections, and **every group's
  title centred over its choices**. Check the screen on a **short landscape
  window** — five groups already fill it, and this is the second story in a
  row to add one. If the sixth group overflows or is cut off, **stop and
  report it**: restyling the start screen is out of scope for this story and
  is the owner's call, not a fix to improvise.
- **A simple game.** Press PLAY with the defaults. Get a side onto three
  charged nodes: at the end of its turn it collects **3**, the board draws
  `+3` at the nodes' centroid, and the numbers under that side's pips read
  `1 2 3 4 5` with the **3** in the side's colour and the rest grey.
- **A bonus game.** Return to the start screen, choose **BONUS**, press PLAY,
  and do the same: three nodes collect **6**, the board draws `+6`, and the
  numbers read `1 3 6 10 15` with the **6** in the side's colour.
- **Holding nothing.** A side holding no charged nodes collects nothing, no
  `+N` is drawn, and every number under its pips is grey.
- **Alignment.** The numbers stay directly under their pips at three ships and
  at six, at three charged nodes and at five, in **both orientations**.
- **The board's size.** The board is not visibly smaller than it is today, and
  the HUD does not clip or reflow, at the window sizes the info column is
  sized for.
- **The choice sticks.** After that game, return to the start screen and
  confirm **BONUS** is still checked, and that pressing PLAY again deals a
  second game that still pays the bonus rate.
- **The loudest game.** Play a **five-node, six-ship bonus** game for a while:
  15 a turn is a number this game has not seen. Worth judging both whether the
  taller score cell costs the board too much and whether the rate plays as
  wild as it reads — a finding either way is the owner's to report, not this
  story's to retune (S9).
