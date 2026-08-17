# Implementation Plan — 00000003 Set the site positions

This plan turns [`story.md`](./story.md) into an ordered sequence of steps. Each
step is implemented, verified and committed on its own, by an agent that has
read only `story.md`, this plan, and its own step. Everything a step needs is
stated here.

## What this story builds

Seventeen fixed site positions, settled and written into the rules, held as data
in `src/rules/`, and drawn on the board with a distinct appearance for each of
the four states a site can be in. The board's accessible names grow a segment
saying that a square is a site and what state it is in.

Nothing changes state. There is no waking, no clock, no influence, no cooldown
and no random replacement — all of that is §8 machinery for a later story. There
is therefore no seeded random source in this story either.

This **is** a rules change: `doc/ruleset/rules.md` goes from **0.1 to 0.2**.

## Sources of truth

- **The rules.** [`doc/ruleset/rules.md`](../../ruleset/rules.md). It starts
  this story at **0.1** and Step 1 takes it to **0.2**. Every step after Step 1
  implements version 0.2. Rule content in `src/` implements that document and
  never restates or extends it; where the two disagree, the document is right.
- **The conventions.** [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) — in
  particular the **DOM test recipe** in its "Testing" section (jsdom docblock on
  line 1, per-file `@testing-library/jest-dom/vitest` import,
  `afterEach(cleanup)`, axe run with the `color-contrast` rule disabled), the
  "keep logic out of components" preference, and **"Comments"**: comments say
  what the code does; **no story numbers, no plan-step or plan-decision
  references, no design history in code**. All of that material belongs in this
  document.
- **The previous story's plan.**
  [`doc/plan/00000001-draw-starting-board/implementation-plan.md`](../00000001-draw-starting-board/implementation-plan.md)
  records the decisions this story builds on: the `src/rules/` / `src/board/`
  split, the accessible-name wording, the "list rule data literally, then test
  the properties the document claims" pattern, and the decorative-artwork
  convention (`aria-hidden` SVG, no `title`/`desc`, meaning carried only by the
  square's accessible name).

## What already exists

| Path                                | Holds                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/rules/rulesVersion.ts`         | `RULES_VERSION` (`"0.1"`), pinned to `rules.md` by `rulesVersion.test.ts`                                                       |
| `src/rules/board.ts`                | `BOARD_SIZE`, `COLUMN_LETTERS`, `ROW_NUMBERS`, `Square`, `squareAt`, `squareName`, `squareFromName`, `isOnBoard`, `ALL_SQUARES` |
| `src/rules/bays.ts`                 | `BAYS`, `isBay` (§3.1)                                                                                                          |
| `src/rules/fleet.ts`                | `Side`, `FleetEntry`, `STARTING_FLEET`, `startingSideAt` (§4)                                                                   |
| `src/board/boardView.ts`            | square ↔ grid index mapping (row 15 is grid row 0)                                                                              |
| `src/board/squareLabel.ts`          | `squareLabel(square, isBay, occupant)` — the accessible-name wording                                                            |
| `src/board/Board.tsx` / `Board.css` | the 15 x 15 board, bay styling, edge labels; builds `BOARD_ROWS` once at module load                                            |
| `src/board/ShipIcon.tsx` / `.css`   | the two decorative ship silhouettes                                                                                             |
| `src/board/grid/`                   | the generic WAI-ARIA `AccessibleGrid` and its navigation math                                                                   |

New files this story adds:

| Path                                | Holds                                                                 |
| ----------------------------------- | --------------------------------------------------------------------- |
| `src/rules/sites.ts`                | the seventeen sites, the four-state type, the starting state          |
| `src/rules/sites.test.ts`           | count, interior, symmetry, bay-disjointness, starting state           |
| `src/rules/siteSpacing.test.ts`     | the exhaustive "no move touches two sites" sweep                      |
| `src/board/SiteMarker.tsx` / `.css` | the decorative site artwork, one appearance per state                 |
| `src/board/SiteMarker.test.tsx`     | the artwork's four appearances                                        |
| `src/board/reviewFixture.ts`        | **temporary** review scaffolding, added in Step 8, deleted in Step 11 |

## The seventeen sites

Fixed by the owner. Six seed squares in the A–H, 1–8 quarter (`F2`, `B4`, `E5`,
`H4`, `D8`, `H8`) expand under a mirror across **column H** and a mirror across
**row 8** into seventeen sites. Written out by row, bottom to top and left to
right within a row — **this is the canonical order** used by both `rules.md`
§3.2's table and `src/rules/sites.ts`, so the two can be compared line by line:

| Row | Sites         |
| --- | ------------- |
| 2   | F2, J2        |
| 4   | B4, H4, N4    |
| 5   | E5, K5        |
| 8   | D8, H8, L8    |
| 11  | E11, K11      |
| 12  | B12, H12, N12 |
| 14  | F14, J14      |

```
     A B C D E F G H I J K L M N O
 15  . . . # . . . # . . . # . . .
 14  # . . . . O . . . O . . . . #
 13  . . . . . . . . . . . . . . .
 12  . O . . . . . O . . . . . O .
 11  . . . . O . . . . . O . . . .
 10  # . . . . . . . . . . . . . #
  9  . . . . . . . . . . . . . . .
  8  . . . O . . . O . . . O . . .
  7  . . . . . . . . . . . . . . .
  6  # . . . . . . . . . . . . . #
  5  . . . . O . . . . . O . . . .
  4  . O . . . . . O . . . . . O .
  3  . . . . . . . . . . . . . . .
  2  # . . . . O . . . O . . . . #
  1  . . . # . . . # . . . # . . .

#  bay      O  site
```

Five sites start **active**: `H8`, `E5`, `K5`, `E11`, `K11`. The other twelve
start **dormant**. Nothing starts charged or depleted.

All seventeen were checked before this plan was written: seventeen distinct
squares, all interior, the set is closed under both mirrors (and therefore under
a 180° rotation), none is a bay, and an exhaustive sweep of every legal move
from every square on the board found **zero** moves that touch two sites. Under
§3.2's _written_ thresholds (gap ≥ 4 orthogonal, ≥ 3 diagonal) the layout has
exactly four failures — the `F2`–`H4` diagonal pair at gap 2 and its three
mirror images — which is what motivates the threshold relaxation in Step 1.

## The state rename

`rules.md` 0.1 names the four states `sleeping`, `awake`, `live`, `spent`.
Version 0.2 renames them throughout:

| 0.1      | 0.2      |
| -------- | -------- |
| sleeping | dormant  |
| awake    | active   |
| live     | charged  |
| spent    | depleted |

The **verbs** do not change: a site still _wakes_ (it becomes active), and a
node's _clock_ still runs. Only the state nouns/adjectives are renamed.

## Decisions taken at plan time

The story left four questions open. All four are settled here, with the
reasoning, because the code will not carry it.

### 1. How a site is drawn: a ring behind the ship — round for sites, square for bays

**Decision.** A site is drawn as a decorative SVG **ring** (a circle inscribed
close to the square's edge) plus an optional background fill, rendered _behind_
any ship on the same square. The four states differ by **ring line treatment and
weight** first and colour second:

| State    | Ring                                   | Fill behind it         |
| -------- | -------------------------------------- | ---------------------- |
| dormant  | medium, **dashed**, dim                | darker than ordinary   |
| active   | medium, **solid**, accent colour       | faint accent tint      |
| charged  | heavy **double** ring (two concentric) | strongest accent tint  |
| depleted | thin, **dotted**, dim                  | none (ordinary square) |

**Amended at the Step 9 gate.** The dormant and depleted rows above are the
other way round from how this decision was first written: dormant was the thin
dotted ring with no fill, and depleted the dashed ring over a darker fill. The
owner asked at the gate for the two appearances to be swapped outright, fill
included, and Step 9a does that. The consequence was put to the owner before the
swap and accepted: twelve of the seventeen sites are dormant at the start of a
real game, so the darker fill — previously a rare marking, since nothing is
depleted at the start — now appears twelve times on the opening board, while the
faintest treatment is the one reserved for a spent node.

Reasoning:

- **Round vs. square is the cue that separates sites from bays.** A bay is
  already a square fill inside a heavy square border (`.board-square--bay`,
  cyan). If a site were also a square treatment the two would compete at a
  glance. A circular motif reads as a different _kind_ of thing instantly, at
  the board's 24–42px square size, with no legend to learn. (Sites and bays can
  never share a square — every site is interior, every bay is on the outer edge
  — so this is about visual vocabulary, not about resolving an overlap.)
- **A ring survives a ship sitting on it.** The ship silhouettes are centred and
  bounded within roughly 70% of the square. Measured from the square's centre,
  the green dart reaches a maximum radius of about **45.5%** of the square (its
  rear points) and the red hexagon about **35%**. A ring drawn at radius ~47%
  therefore clears both silhouettes almost everywhere and is crossed, at worst,
  at two tangent points. That is the whole budget the implementer has: if the
  ring has to move inward for any reason, the ship artwork must shrink to match,
  and the manual gate in Step 9 is the judge.
- **Four states need four non-colour cues.** `src/index.css` records that colour
  must always be paired with a non-colour cue. Dotted / solid / double / dashed
  are four line treatments that survive greyscale, which hue alone would not for
  four values.
- **No new meaning is attached to an existing hue.** The site accent must not be
  the two side colours (`--color-green`, `--color-red` — those mean "whose ship
  is this"), must not be the bay cyan (`--bay-border`), and must not be the
  amber `--focus-ring` (a heavy amber square border drawn on `:focus-visible` by
  `AccessibleGrid.css`; an amber site marker would read as "this square is
  focused"). A violet/purple accent is the recommendation; the exact value is
  the implementer's, judged at Step 9.
- **The artwork is decorative.** Like `ShipIcon`, the marker SVG is
  `aria-hidden="true"` with no `title` or `desc`. All meaning reaches assistive
  technology through the square's accessible name (decision 4).

**Rejected:** marking a site the way a bay is marked (a different square fill
plus a border). It competes directly with the bay marker, and a ship covers most
of a square fill, so the state would be unreadable exactly when it matters.
**Rejected:** four corner brackets. The corners read well and the ship leaves
them clear, but a later story puts a shield count in a corner of the ship, and a
four-cornered marker would collide with it. **Rejected:** a letter or digit in
the square (D/A/C/X). It reads as a label rather than as board furniture, and
would be the second glyph competing with the ship for the same square.

### 2. The review fixture is a committed constant, not a dev-only route or flag

**Decision.** The temporary four-state arrangement lives in a plain committed
module, `src/board/reviewFixture.ts`, which `Board.tsx` imports in place of the
real lookups for exactly three steps (added in Step 8, removed in Step 11).
There is **no** route, no query parameter, no `import.meta.env.DEV` branch.

Reasoning:

- The fixture exists for two manual gates and is then deleted. Building a
  dev-only mechanism — a route, a flag, its own conditional rendering path —
  would be infrastructure with a longer life than the thing it serves, and the
  guide explicitly warns against shipping infrastructure and behaviour together.
- A dev-only branch is _harder_ to be sure of, not easier: it ships in the
  static bundle either way (the app has no server to strip it), and it makes the
  board's data source conditional, which is precisely the sort of thing that
  survives a story by accident.
- A committed constant is loud. It is visible in the diff, the board plainly
  shows an illegal position while it is in place, and its removal is a file
  deletion plus two import lines.
- The safety net against forgetting it is not the mechanism, it is the
  sequencing: Step 11 removes it, Step 12 is a manual gate that confirms the
  real starting board, and the rules-layer tests added in Step 4 pin the true
  starting state throughout, so nothing rule-level is unguarded during the
  fixture window.

The fixture module must **never** live in `src/rules/`, and no test in
`src/rules/` may reference it. The arrangement it holds is not a legal game
state.

### 3. §3.2 states the property as the rule and the numbers as a derived note

**Decision.** §3.2's binding statement becomes the property itself:

> No single legal move may touch two sites. The square a move starts from does
> not count, because a ship can only ever be standing on a site that is already
> charged or depleted.

The numeric thresholds stay in the document, but demoted to a **derived
consequence** of §6's current movement ranges — "under the movement ranges in
§6 this works out as a gap of at least 3 along an orthogonal line and at least 2
along a diagonal" — carrying an explicit warning that they must be recomputed if
§6 ever changes, in the same spirit as Appendix B's existing warning about the
nine-turn figures.

Reasoning:

- Making the numbers normative is exactly what went wrong in 0.1. They were one
  square stricter than their stated purpose on both axes (they counted the
  square the ship departs from, which can never be woken by that move), and the
  chosen layout was measured against the wrong test. If the property is the rule
  and the numbers are commentary, a future §6 change invalidates a _note_, not a
  rule.
- **Dropping the numbers entirely was rejected.** `rules.md` is written for a
  player, and a reader wanting to check a layout by eye needs something they can
  measure with a finger on a diagram. "No move can touch two of these seventeen"
  is not humanly checkable; "at least three apart" is.
- The app tests the property, not the numbers (see the note on Step 3), so the
  code implements the normative sentence and the numbers are never load-bearing
  in `src/`.
- §3.2 also gains the seventeen positions and the symmetry statement, so the
  constraint is now mostly a design constraint on any _future_ layout rather
  than a live rule. §3.2 should say so.

### 4. Accessible-name wording: `<square>, <state> site[, <side> ship]`

**Decision.** The site segment occupies the same slot as the existing `bay`
segment — second, between the square name and the ship — and reads as an
adjective plus the noun:

| Square                         | Accessible name                |
| ------------------------------ | ------------------------------ |
| ordinary empty square          | `G7`                           |
| dormant site                   | `B4, dormant site`             |
| active site                    | `E5, active site`              |
| charged site with a green ship | `H8, charged site, green ship` |
| depleted site                  | `H4, depleted site`            |
| empty bay (unchanged)          | `D15, bay`                     |
| occupied bay (unchanged)       | `H15, bay, green ship`         |

Reasoning:

- **Position stays first.** A keyboard user arrowing across the board hears the
  whole name on every focus change; the first word has to orient them. That was
  decided in story 00000001 and does not change.
- **Bay and site share the slot** because they are mutually exclusive (every bay
  is on the outer edge, every site is interior), so no name ever carries both.
  An occupied site is three segments, exactly like an occupied bay today.
- **Dormant sites are announced, not silent.** Story 00000001 deliberately says
  nothing about an ordinary empty square, on the grounds that "empty" adds
  nothing. A dormant site is different: §6 forbids _ending_ a move on a dormant
  or depleted site, so its presence changes what a player may do and must be
  audible.
- **Adjective before noun** (`active site`, not `site, active`) because it reads
  as English at screen-reader speed and keeps the segment to one comma.
- **The state words are the rules' own words** — dormant, active, charged,
  depleted — so nothing is translated between document and UI and there is no
  second vocabulary to keep in sync. Note the word is **"site"**, which
  `rules.md`, the UI and the code all use identically; the code word "hub" and
  the player-facing word "node" (see CLAUDE.md's Vocabulary section) do not
  appear in the accessible name, because what is being named here is the fixed
  position, not the thing in play on it.

## Other design notes that apply across steps

- **Rule data is written literally and checked structurally.** `bays.ts` and
  `fleet.ts` transcribe their lists from the document in the document's own
  order, and the tests then assert the _properties_ the document claims. The
  sites follow that pattern exactly. Generating the seventeen from the six seed
  squares was **rejected**: it would make the symmetry true by construction and
  therefore untestable, and a mistyped seed would still produce a perfectly
  symmetric, perfectly wrong layout. An explicit list checked against the mirror
  properties catches both a typo and a wrong seed.
- **Movement logic is out of scope and stays out of `src/`.** Step 3 needs §6's
  movement ranges to sweep every legal move, but movement is explicitly out of
  scope for this story. Those ranges are therefore encoded in the **test file**,
  clearly marked as a local helper, not in a production module. Step 3's step
  text says so.
- **`Math.random` is banned by lint**, and nothing in this story is random.
- **`src/rules/` holds only what `rules.md` states.** The review fixture, the
  artwork and the wording all belong in `src/board/`.
- **Every step is finished with** `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run format:check` (run `npm run format` to fix) and, for any
  step touching `src/`, `npm run build` — plus the step's own verification.
- **The dev server** runs on `http://localhost:5273` (`npm run dev`). Note the
  repository memory: file-watch events do not reach Vite in the dev container,
  so a code change needs the dev server restarted, not just a browser refresh.

---

## Step 1 — Rules 0.2: the sites, the state rename, and the relaxed constraint

Status: committed

Notes: Rewrote `rules.md` §2, §3.2, §6, §8.1–8.7 and Appendices A/B per the
plan; added the `## 0.2` changelog entry; bumped `RULES_VERSION` to `"0.2"`.
The case-insensitive review-sweep grep for `sleeping|awake|live|spent` left
exactly two hits, both verb forms as anticipated: "spent by winning fights"
(§1) and the §8.3 heading "How long a node lives" — neither is a state name.
No deviation from the plan; `src/` was touched only in `rulesVersion.ts` as
the step specifies.

This is the rules change, and it comes first because every later step
implements it. Do it as one coherent pass over
[`doc/ruleset/rules.md`](../../ruleset/rules.md), plus a changelog entry and the
`RULES_VERSION` bump, all in the same commit.

**1. The version line.** `**Rules version: 0.1**` becomes `**Rules version:
0.2**`.

**2. §3.2 Sites** — rewrite. It must now say:

- There are **seventeen** sites (replacing "Between 12 and 15"), all in the
  interior of the board, fixed for the whole game and the same in every game.
- The seventeen positions, as a table in the canonical row order given in this
  plan's "The seventeen sites" section (row 2: F2, J2; row 4: B4, H4, N4; row 5:
  E5, K5; row 8: D8, H8, L8; row 11: E11, K11; row 12: B12, H12, N12; row 14:
  F14, J14).
- The board diagram from this plan's "The seventeen sites" section, showing bays
  and sites together. It is worth carrying into the document: with §3.1's bay
  table it lets a reader reconstruct the whole board.
- The **symmetry**: the layout is a mirror image across column H and across row
  8, so a 180° rotation maps it onto itself. It is deliberately **not**
  symmetric across the diagonals — say why in a sentence, because a reader will
  otherwise read it as an oversight: the fourteen bays cannot be diagonally
  symmetric either (spacing fourteen bays every fourth square around a 56-square
  perimeter puts three on each horizontal edge and four on each vertical), and
  the sites are placed partly by reference to the bays.
- The **spacing constraint**, restated per this plan's decision 3: the binding
  requirement is that no single legal move may touch two sites, with the square
  the move starts from excluded — a ship can only ever be standing on a site
  that is already charged or depleted, since §6 forbids ending a move on a
  dormant or depleted site and §8.5 makes a site that wakes underneath a ship
  charged immediately, so a move can never wake the square it departs from. Then
  give the derived numbers under §6's current ranges (at least 3 apart on an
  orthogonal line, at least 2 on a diagonal) explicitly as a _consequence_, with
  a warning that they must be recomputed if the movement ranges in §6 ever
  change. Make clear this constrains any future layout; the seventeen listed
  above already satisfy it.

**3. §8.1** — rename the four states to **dormant → active → charged →
depleted → dormant**, keeping the same one-line descriptions, and keep the
sentence that exactly five sites are active or charged at any moment.

Then add, at the end of §8.1, **which sites start in which state**: five sites
are active at the start of the game — `H8`, `E5`, `K5`, `E11` and `K11` — and
the other twelve are dormant. Nothing is charged or depleted at the start, and
say why: §8.2 makes a site charged only when a ship touches it, and §8.3 starts
its nine-turn clock on the turn it was woken, so a charged site at turn zero
would have no waker and no clock start.

(Putting the starting state at the end of §8.1 rather than in a new subsection
is deliberate: a new §8.2 would renumber §8.2–§8.7, and those numbers are cited
from Appendix B, from this plan and from `story.md`. The cost of renumbering
outweighs the tidiness.)

**4. The rename everywhere else.** The old words appear in §1, §2, §6, §8
(heading and §8.2–§8.7) and Appendix B. Apply the mapping — sleeping→dormant,
awake→active, live→charged, spent→depleted — and then **reread each changed
sentence** and reword any that now reads oddly. Specific places to check:

- §1: "which node site wakes up next" — still fine, verbs are unchanged.
- §2: the **Node** definition currently reads "an awake site. Exactly five sites
  are awake at any moment." A node is now a site that is in play: one that is
  active or charged. Reword accordingly. The **Site** definition's "which of
  them is awake changes during the game" needs the same treatment.
- §6: "may not **end** a move on a sleeping or spent site" → dormant or
  depleted.
- §8's heading and §8.2–§8.7: "live node" → "charged node", "spent site" →
  "depleted site", "sleeping pool" → "dormant pool", §8.4's table header "Live
  nodes held" → "Charged nodes held", §8.5's heading and its "dead site"
  phrasing, §8.7's ordered list.
- Appendix B: "A live node lasts nine turns and a spent one cools down…".

**5. Appendix A.** Remove item 1 (site positions) entirely — it is now settled.
Starting shields becomes the sole remaining open item; renumber it to **1** and
fix the appendix's closing sentence, which currently says "Both are best
settled…". Because this renumbers what older documents call "Appendix A item 2",
say so in the changelog entry.

**6. Appendix B.** Refresh the arithmetic for a pool of seventeen: about ten
sites are committed at any moment (five active or charged, roughly five cooling
down), so seventeen leaves about **seven** dormant — which is what keeps §8.6's
random replacement genuinely unpredictable. Keep the existing warning that the
arithmetic must be redone if the nine-turn figures or the number of nodes
change. Appendix B currently claims the app enforces the pool size with a test
that plays out adversarial waking patterns; no such test exists and none is in
scope here, because no site changes state in this story — reword that sentence
so the document does not claim a guard the app does not have (for example, state
it as a requirement on the app rather than as an accomplished fact).

**7. `doc/ruleset/changelog.md`** — a new `## 0.2` entry at the top (newest
first), covering: the seventeen site positions and their symmetry, the four
states renamed, the starting five, the relaxed spacing constraint and why it was
too strict, Appendix A item 1 closed and the remaining item renumbered, and
Appendix B refreshed for a pool of seventeen.

**8. `src/rules/rulesVersion.ts`** — `RULES_VERSION` becomes `"0.2"`. It is a
string on purpose (so `"0.10"` can never collapse into `"0.1"`), and
`src/rules/rulesVersion.test.ts` reads the version out of `rules.md` and asserts
the two agree — that test is the guard that makes this bump non-optional.

Do **not** touch anything else under `src/` in this step. No site data, no
component changes.

After this branch is merged, the owner tags the merge commit `rules-0.2` with
`/tag-rules`. That is not part of this step.

Depends on: nothing.

Verification (automated): `npm test` passes, including
`src/rules/rulesVersion.test.ts`, which now agrees on `0.2` (it would fail if
either the document or the constant were bumped alone). `npm run format:check`
passes over the changed markdown. Then, as a review sweep, run a case-insensitive
grep of `doc/ruleset/rules.md` for `sleeping`, `awake`, `live`, `spent` and
inspect **every** remaining hit: verb forms ("wakes", "waking", "lives" in
ordinary prose) are expected to survive, but no _state name_ may remain. Record
in the step's Notes which hits were left and why.

---

## Step 2 — The seventeen sites in the rules layer

Status: committed

Notes: Added `src/rules/sites.ts` with `SITES`, the seventeen squares
transcribed by hand from §3.2's table in canonical row order, built on
`squareAt`, and nothing else (no `isSite` predicate, per the step). Added
`src/rules/sites.test.ts` covering count/no-duplicates, interior-only, mirror
symmetry across column H and row 8, bay disjointness, and a literal
line-by-line match against §3.2's table. `npm run typecheck`, `npm run lint`,
`npm test` and `npm run format:check` all pass. No deviation from the plan.

Add `src/rules/sites.ts` holding the seventeen site squares from `rules.md`
§3.2, transcribed literally in the document's own order (the canonical row order
in this plan's "The seventeen sites" section), built on `squareAt` from
`src/rules/board.ts`. Follow the shape of `src/rules/bays.ts`: a module header
naming the section it implements, an exported readonly list, and nothing else it
does not need.

Write the list **by hand** — do not generate it from the six seed squares. That
is a deliberate choice: generating it would make the symmetry true by
construction and therefore untestable, and a mistyped seed would still produce a
perfectly symmetric, perfectly wrong layout. The explicit list plus the property
tests below catch both a typo and a wrong seed.

Do **not** add an `isSite` predicate in this step. `bays.ts` has `isBay` because
`Board.tsx` needs it, but the board will ask sites for their _state_ (Step 4),
and a state lookup that returns nothing for a non-site is the membership check
the view actually needs. Shipping an untested-by-a-consumer predicate for
symmetry's sake is the kind of unreachable code the previous story's review
pushed back on. (Recorded here so a reviewer noticing the asymmetry with
`bays.ts` finds the reason.)

`SITES` and, from Step 4, `STARTING_ACTIVE_SITES` **are** exported even though
neither has a production consumer beyond `startingSiteState` itself. That is
not the same situation as `isSite`: these two are the literal transcriptions
of §3.2's and §8.1's tables, and `sites.test.ts` needs them exported so it can
compare the transcription to the document line by line. A derived predicate
with no consumer is unreachable code; transcribed rule data with a test that
reads it is not.

Depends on: Step 1 (the document states the seventeen positions), and the
existing `src/rules/board.ts`.

Verification (automated): `npm test` — add `src/rules/sites.test.ts` asserting:

1. There are exactly **seventeen** sites and no duplicates.
2. Every site is **interior**: not on column A or O, not on row 1 or 15.
3. The set is unchanged by a **mirror across column H** (column index i ↦ 14−i,
   row unchanged): for every site, its mirror image is also a site.
4. The set is unchanged by a **mirror across row 8** (row r ↦ 16−r, column
   unchanged).
5. **No site is a bay** — the site set and `BAYS` from `src/rules/bays.ts` are
   disjoint.
6. A literal spot-check of the whole list against §3.2's table, as a line-by-line
   sanity check in the manner of `fleet.test.ts`.

Tests 3 and 4 together imply the 180° rotational symmetry; asserting it
separately is optional. These are pure logic, so the test file stays in the
default `node` environment — no jsdom docblock.

---

## Step 3 — Prove no single move can touch two sites

Status: committed

Notes: Added `src/rules/siteSpacing.test.ts` with a local `allMoves` helper
enumerating §6's 0-shield ranges (1–3 orthogonal, 1–2 diagonal) from all 225
squares, excluding the origin square and discarding off-board moves; the
sweep passes with zero touched-two-sites failures. Deliberate-failure check:
temporarily appended `squareAt("H", 6)` to `SITES` in `src/rules/sites.ts`,
re-ran the sweep, and it failed with four named moves (e.g. `H3 moving 0,1
for 3 touches sites H4, H6`), confirming the assertion bites; the edit was
then reverted and `git status` shows only the new test file. No deviation
from the plan.

Add `src/rules/siteSpacing.test.ts`: an exhaustive sweep asserting the property
`rules.md` §3.2 actually requires — that **no single legal move can touch two
sites**.

This step adds a test and no production code. It is separated from Step 2
because it is a different kind of check with its own reasoning, and because it
is the check that showed §3.2's written thresholds were stricter than their
stated purpose.

What the sweep must do:

- Enumerate, from **every one of the 225 squares**, every legal move under §6's
  ranges: 1, 2 or 3 squares in each of the four orthogonal directions, and 1 or 2
  squares in each of the four diagonal directions. That is the **0-shield** case,
  which is the worst case: §6's ranges accumulate as shields are shed, so every
  move available at 1–4 shields is also available at 0.
- For each such move, collect the squares the ship **passes over and lands on**,
  **excluding the square it starts from**. The origin is excluded because a ship
  can only ever be standing on a site that is already charged or depleted (§6
  forbids ending a move on a dormant or depleted site; §8.5 makes a site that
  wakes under a ship charged immediately), so a move can never wake the square
  it departs from. Getting this wrong is precisely the error §3.2 carried in
  version 0.1.
- Discard moves that run off the board.
- **Ignore blocking ships.** §6 requires a clear path, so ignoring blockers
  considers strictly more squares than any real move could reach — the
  conservative direction.
- Assert that **no** move touches two or more sites. On failure the message must
  name the origin square, the direction, the length and the sites touched, so a
  future layout change is diagnosable rather than just red.

Encode the movement ranges as a **local helper inside this test file**, with a
comment saying they are §6's ranges and that movement itself is out of scope for
this story. Do not add a movement module to `src/rules/` — this story implements
§3.2 and §8.1, not §6, and a half-built movement module would be rule logic with
no consumer.

Assert the numeric thresholds **only** as a secondary, clearly-labelled check if
you want them, never as the primary one: §3.2 version 0.2 makes the property
normative and the numbers a derived note, and the whole point is that the test
stays honest if the numbers are ever revisited.

Depends on: Step 2 (the site list).

Verification (automated): `npm test` — the sweep passes. Then confirm the sweep
actually bites: temporarily add one extra square to the site list that sits two
squares orthogonally from an existing site (for example `H6`, two below `H4`),
re-run, and see the test fail naming the offending move and both sites. **Revert
the temporary edit and do not commit it.** Record in the step's Notes that this
was done. A sweep that passes vacuously would be worse than no sweep at all.

---

## Step 4 — The four states and the starting state

Status: committed

Notes: Extended `src/rules/sites.ts` with the `SiteState` type (`dormant` |
`active` | `charged` | `depleted`), `STARTING_ACTIVE_SITES` (transcribed
literally from §8.1 in its order: H8, E5, K5, E11, K11), and
`startingSiteState`, mirroring `startingSideAt`'s shape from `fleet.ts`. Added
a `describe("starting site state", …)` block to `src/rules/sites.test.ts`
covering all six checks from this step's verification, including the
five/dormant-twelve counts, no charged/depleted at start, every active square
being a site, non-site squares returning `undefined`, and the mirror symmetry
of the starting-active set. No transition function, clock or cooldown added.
`npm run typecheck`, `npm run lint`, `npm test` and `npm run format:check` all
pass. No deviation from the plan.

Extend `src/rules/sites.ts` with the state vocabulary from `rules.md` §8.1 and
the starting state:

- A **site-state type** with exactly the four values `rules.md` §8.1 names:
  dormant, active, charged, depleted. §8.1 defines these, so the type belongs in
  the rules layer. The **transitions** between them do not — those are §8.2–§8.7
  and a later story. Do not add any transition function, clock, or cooldown.
- The five sites that start **active** — `H8`, `E5`, `K5`, `E11`, `K11` —
  transcribed literally from §8.1 in the document's order.
- A lookup that answers, for any square, what state it is in at the start of the
  game: the four/five actives return active, the other twelve sites return
  dormant, and a square that is not a site returns nothing. This mirrors
  `startingSideAt` in `src/rules/fleet.ts`, which is the shape the board already
  consumes.

Keep all of this in `sites.ts` rather than a separate `siteStates.ts`: it is one
cohesive subject (which squares are sites, what states a site can be in, and
where they start), and a two-line type module with no behaviour would be a file
for its own sake. When the §8 transitions arrive they will want their own module
and can import the type from here.

Depends on: Step 1 (the document names the states and the starting five), Step 2
(the site list).

Verification (automated): `npm test` — extend `src/rules/sites.test.ts` with:

1. Exactly **five** sites start active, and they are exactly `H8`, `E5`, `K5`,
   `E11`, `K11`.
2. The other **twelve** sites start dormant.
3. **No** site starts charged or depleted.
4. Every starting-active square is in the site list (a starting site that is not
   a site at all would be a transcription error).
5. A square that is not a site — an ordinary square such as `G7`, and a bay such
   as `D15` — has no site state.
6. The set of starting-active sites is itself symmetric about column H and row 8
   (`E5`/`K5`/`E11`/`K11` are one mirror family and `H8` is the centre), which is
   what makes the opening fair to both sides.

---

## Step 5 — The accessible name says a square is a site and what state it is in

Status: committed

Notes: Switched `squareLabel` to a single `SquareLabelDescriptor` object
argument (`square`, `isBay`, optional `siteState`, optional `occupant`) rather
than adding a fourth positional parameter, since two adjacent optional
values of similarly-shaped types (`SiteState | undefined` next to
`Side | undefined`) would have made the positional call site ambiguous — the
plan explicitly left this choice to the implementer. The bay/site mutual
exclusivity is expressed with `if (isBay) {…} else if (siteState) {…}`.
Updated both call sites (`Board.tsx`, `Board.test.tsx`) to the new object
form; `Board.tsx` does not yet pass `siteState` since wiring the real lookup
in is Step 7's job, so today it is always `undefined`, matching "ordinary
empty square" wording for every square until then. Extended
`squareLabel.test.ts` with the four state cases and one occupied case per
side. `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`
and `npm run build` all pass. No deviation from the plan's substance.

Extend `src/board/squareLabel.ts` so a square's accessible name can carry a site
segment, exactly as set out in this plan's decision 4:

- Segment order stays: square name, then `bay` **or** `<state> site`, then
  `<side> ship`.
- The state word is the rules' own word: `dormant site`, `active site`,
  `charged site`, `depleted site`.
- `bay` and the site segment are mutually exclusive in practice (every bay is on
  the outer edge, every site is interior), so no name carries both.
- An ordinary empty square is still named by its square name alone. A **dormant**
  site is still announced — unlike an ordinary empty square — because §6 forbids
  ending a move on one, so its presence changes what a player may do.

The function currently takes the square, a bay flag and an optional occupant. It
now also needs the square's site state (absent when the square is not a site).
If the positional argument list becomes hard to read at the call site, switch to
a single descriptor object; that is the implementer's call, but keep the change
confined to this module and `Board.tsx`.

Wording lives in a plain module with plain unit tests, not inside a component —
CONTRIBUTING.md asks for exactly that.

Depends on: Step 4 (the state type).

Verification (automated): `npm test` — extend `src/board/squareLabel.test.ts`
with literal expected strings for each new case, and confirm the existing cases
are unchanged:

- `B4, dormant site`, `E5, active site`, `H8, charged site`, `H4, depleted site`
- `H8, charged site, green ship` and one red equivalent
- unchanged: `H8`-style bare names for ordinary squares, `D15, bay`,
  `H15, bay, green ship`

---

## Step 6 — The site marker artwork

Status: committed

Notes: Added `SiteMarker.tsx`/`.css` per decision 1 — a 100x100 viewBox
matching `ShipIcon`'s, an outer fill circle at radius 47 behind one or two
stroke-only ring circles. Ring geometry (stroke width, dash pattern, ring
count) is set as SVG attributes from a per-state `RING_SPECS` table in the
component rather than in CSS, since jsdom in this project's test setup does
not apply imported CSS, and the geometry is exactly what the test needs to
assert; CSS carries only colour (a local `--site-accent` violet, kept off
the two side colours, bay cyan and focus amber) and fill opacity, per the
"colour lives where only one file needs it" convention. `SiteMarker.test.tsx`
follows the DOM test recipe and covers the four modifier classes, the
decorative contract (aria-hidden, no title/desc, no accessible text), that
ring count/stroke-width/dash pattern differ across all four states (not just
class names), and axe with `color-contrast` disabled. Not wired into
`Board.tsx` (that is Step 7). No deviation from the plan.

Add `src/board/SiteMarker.tsx` and `src/board/SiteMarker.css`: a decorative
component that draws one site in one of the four states, per this plan's
decision 1. Give it its own CSS file and import it from the component, as
`ShipIcon` does, so the artwork carries its own styling wherever it is rendered.

Requirements:

- An inline SVG, sized to fill its square, drawing a **ring** close to the
  square's edge (a circular motif — sites are round, bays are square-framed), on
  an optional background fill.
- Four visibly distinct appearances, differing in **line treatment and weight**
  before colour: dormant = thin dotted, dim, no fill; active = medium solid,
  accent, faint fill; charged = heavy double ring (two concentric), strongest
  fill; depleted = medium dashed, dim, darker-than-ordinary fill.
- The ring must sit at a radius that clears the ship silhouettes. Measured from
  the square's centre, the green dart reaches ~45.5% of the square and the red
  hexagon ~35%; a ring at ~47% therefore clears both except at tangent points.
  If the ring has to come inward, shrink the ship artwork to match.
- The accent colour must not be `--color-green`, `--color-red`, the bay cyan, or
  the amber `--focus-ring` (which `AccessibleGrid.css` draws as a heavy square
  border on `:focus-visible` — an amber marker would read as "focused"). A
  violet/purple accent is the recommendation. Follow the existing convention for
  where a colour lives: add it to the `:root` palette in `src/index.css` only if
  more than one file needs it, otherwise keep it in `SiteMarker.css`.
- **Decorative only**: `aria-hidden="true"` on the SVG, no `title`, no `desc`.
  All meaning reaches assistive technology through the square's accessible name
  (Step 5).
- Give the root element stable class names — a base class plus a per-state
  modifier — so tests and the board can query it without going through the
  accessibility tree.

Do not wire it into the board in this step; that is Step 7.

Depends on: Step 4 (the state type).

Verification (automated): `npm test` — add `src/board/SiteMarker.test.tsx` (a
jsdom test; follow CONTRIBUTING.md's DOM test recipe) asserting:

1. Rendering each of the four states produces the matching state modifier class.
2. The SVG is `aria-hidden` and contains no `title` or `desc` element, and the
   component contributes no accessible text.
3. The four states differ by more than colour: assert that the stroke geometry
   differs between them — for example that the dash pattern, stroke width and
   number of drawn ring elements are not identical across the four. A test that
   only compares CSS class names would pass even if all four rendered the same
   shape in four hues, which is the failure mode decision 1 exists to prevent.
4. `npm run build` succeeds.

---

## Step 7 — Draw the sites on the real starting board

Status: committed

Notes: Wired `startingSiteState` into `Board.tsx`, rendering a `SiteMarker`
before the `ShipIcon` inside `.board-square` and passing `siteState` into
`squareLabel`. Made `.board-square` a single-cell CSS grid
(`display: grid` plus `grid-area: 1 / 1` on both children) so the marker and
ship stack without absolute positioning, per the plan's suggested approach;
the pre-existing `.accessible-grid__cell::after` focus ring (z-index 2, a
sibling of `.board-square`) still paints over both, unchanged. Extended
`Board.test.tsx` with a new `describe` block covering the four verification
points as literal square/name lists independent of `startingSiteState`/
`SITES`. Two pre-existing tests from story 00000001 needed updating because
they now observe real behaviour change (H8 is both the centre square and,
from this story, an active site, so its bare accessible name `"H8"` became
`"H8, active site"`), and the "names every bay…" completeness loop now
passes `siteState: startingSiteState(square)` into its `squareLabel` calls
so its expected labels match the board's real output — this is the same
completeness-loop test pattern that already re-uses `isBay`/`startingSideAt`,
so extending it with `startingSiteState` is not a deviation from that
pattern, just keeping it accurate under the new behaviour it observes.
`npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check` and
`npm run build` all pass. No other deviation from the plan.

Wire sites into `src/board/Board.tsx` using the **real** starting state from
`src/rules/sites.ts` (Step 4):

- For each square, look up its starting site state. If it has one, render a
  `SiteMarker` for that state inside the square, **beneath** any ship.
- Stack them without absolute positioning if you can: making `.board-square` a
  single-cell CSS grid and placing both children in the same grid area
  (marker first in DOM order, ship second) keeps the layering declarative and
  leaves the existing `--square` sizing untouched. `.accessible-grid__cell` is
  already `position: relative` for the focus ring, and the focus ring is drawn
  at `z-index: 2`, so it must continue to paint over both marker and ship — check
  that it does.
- Pass the site state into `squareLabel` (Step 5) so every site square announces
  its state.
- Keep `BOARD_ROWS` built once at module load, as it is now.

At the end of this step the board shows seventeen sites: five active (`H8`,
`E5`, `K5`, `E11`, `K11`) and twelve dormant. Charged and depleted have no
on-screen representative yet — Step 8 arranges that for review.

Depends on: Step 4 (starting state), Step 5 (wording), Step 6 (the artwork).

Verification (automated): `npm test` — extend `src/board/Board.test.tsx` (jsdom)
with assertions written as **literals**, not derived by calling the same
production functions the component uses:

1. Exactly **seventeen** cells contain a site marker element, and their squares
   are the seventeen from `rules.md` §3.2.
2. Exactly **five** cells are named `… active site` and they are `E5`, `K5`,
   `E11`, `K11`, `H8`; exactly **twelve** are named `… dormant site`; **none**
   is named charged or depleted.
3. A literal spot-check of accessible names: `E5, active site`,
   `H8, active site`, `B4, dormant site`, `F2, dormant site`.
4. No bay cell contains a site marker, and no site cell is named `bay`.
5. The fourteen bay/ship assertions from story 00000001 still pass unchanged.
6. axe reports no violations (with `color-contrast` disabled per the recipe).

Also run `npm run build` and confirm it succeeds.

---

## Step 8 — Temporary review fixture: all four states on screen

Status: committed

Notes: Added `src/board/reviewFixture.ts` exporting `reviewSiteStateAt` and
`reviewOccupantAt`, matching `startingSiteState`/`startingSideAt`'s shape but
built from two `ReadonlyMap`s (site states, and the four extra ships) rather
than the rules layer's array-plus-lookup shape, since the fixture has no
document table to transcribe literally from and a map keyed by square name
was the simplest fit; `reviewOccupantAt` falls back from the fourteen bay
ships (`startingSideAt`) to the four review ships. The module header states
plainly that the arrangement is not a legal game state and nothing under
`src/rules/` references it (confirmed by a repo-wide grep). Switched
`Board.tsx`'s two lookups to the fixture functions at a single import site,
with a comment marking it temporary and naming the step that reverts it.
Replaced the `"sites on the starting board"` describe block in
`Board.test.tsx` with a `"the temporary review fixture"` block covering the
six verification points (one charged, two depleted, four active with one
ship each spot-checked, ten dormant, seventeen markers with all four state
classes present, no marker on a bay). Three other pre-existing tests in that
file assert site/occupant state that the fixture necessarily changes (the
centre-square check, the bay-completeness loop that builds expected labels
from the same lookups Board.tsx now uses, and the total ship-count check) and
were updated in place, each with a comment explaining the fixture is the
reason — a small, necessary deviation from "only the assertions inside the
new describe block change," since those three were written against the real
starting state in Step 7 and the fixture genuinely alters what they observe;
Step 11's revert restores them alongside the describe block.
`npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check` (after
running `npm run format` once to fix an unformatted line) and `npm run build`
all pass.

Add `src/board/reviewFixture.ts`, a **temporary** module that exists only so the
next two manual gates can judge all four appearances. Step 11 deletes it.

What it holds:

- A site-state arrangement covering all four states: `H8` **charged**; `H4` and
  `H12` **depleted**; `E5`, `K5`, `E11`, `K11` **active**; the remaining ten
  (`F2`, `J2`, `B4`, `N4`, `D8`, `L8`, `B12`, `N12`, `F14`, `J14`) **dormant**.
- Four extra review ships placed **on sites**, one per state and alternating
  sides, so the gate can judge whether a marker still reads under a ship: green
  on `H8` (charged), red on `H4` (depleted), green on `E5` (active), red on `B4`
  (dormant). These are in addition to the fourteen ships in their bays.

Then switch `Board.tsx` to read its site states and its occupants from this
module instead of `startingSiteState` / `startingSideAt`, at a single clearly
named place, with a short comment saying it is temporary review scaffolding.

Critical constraints:

- **This arrangement is not a legal game state.** Nothing may be charged or
  depleted at turn zero, and ships start in bays. The module header must say so
  plainly.
- **It lives in `src/board/`, never `src/rules/`.** No test under `src/rules/`
  may import it. The rules-layer tests from Steps 2–4 continue to pin the true
  seventeen sites and the true starting state throughout the fixture window, so
  nothing rule-level is unguarded.
- Keep it a plain data module — no route, no query parameter, no
  `import.meta.env` branch (see decision 2).

Depends on: Step 7 (sites are drawn from a swappable source).

Verification (automated): `npm test` — update the site-related assertions in
`src/board/Board.test.tsx` to the fixture arrangement, and put them in a
`describe` block whose name says plainly that it covers the temporary review
fixture, so Step 11 knows exactly what to delete. Assert:

1. One cell named `H8, charged site, green ship`.
2. Two cells named `… depleted site` (`H4` — with a red ship — and `H12`).
3. Four cells named `… active site`, one of them `E5, active site, green ship`.
4. Ten cells named `… dormant site`, one of them `B4, dormant site, red ship`.
5. Seventeen site markers in total, one per site, and all four state modifier
   classes appear at least once.
6. axe still reports no violations.

The bay/ship assertions from story 00000001 must still pass — the fixture adds
ships, it does not move the fourteen in their bays. Also run `npm run build`.

---

## Step 9 — Manual gate: the four appearances

Status: committed

Notes: Taken by the owner against the review fixture. All seven checks pass —
the four states are present and tellable apart from each other, from a bay and
from an ordinary square; a ship on a site does not hide its state; the states
survive greyscale; the focus ring is unmistakable on a site square; the board
still fits and stays square. The owner asked for one change: swap the dormant
and depleted appearances outright, fill included. Decision 1 above records the
amended table and the trade-off; Step 9a makes the change.

No code. The story's first manual gate; the pipeline pauses here for the owner.
It is taken now, while the review fixture is in place, because this is the only
moment at which all four states exist on the board.

Depends on: Step 8 (the fixture puts all four states on screen).

Verification (manual): run `npm run dev` and open `http://localhost:5273` (the
dev server does not pick up file changes in the container — restart it rather
than refreshing if anything looks stale). Confirm all of:

1. **All four states are on screen**: `H8` charged, `H4` and `H12` depleted,
   `E5`/`K5`/`E11`/`K11` active, the other ten dormant.
2. Each state is **tellable from the other three** at the board's normal
   on-screen size, without zooming and without a legend.
3. Each state is tellable from a **bay** (top D15/H15/L15, right O14/O10/O6/O2,
   bottom D1/H1/L1, left A2/A6/A10/A14) and from an **ordinary empty square**.
4. **A ship standing on a site does not hide which state it is in**: check all
   four ship-on-site squares — green on `H8` (charged), red on `H4` (depleted),
   green on `E5` (active), red on `B4` (dormant).
5. **Colour is not the only cue**: with colour removed (browser devtools
   greyscale emulation, or the OS colour filter) the four states are still
   tellable apart, and still tellable from a bay and from an empty square.
6. The **keyboard focus ring** (Tab to the board, then arrow onto a site) is
   still unmistakable on a site square, including one holding a ship, and is not
   confusable with any site marker.
7. The board still fits the window without scrolling and stays square.

If a gate fails, record what was seen in the step's Notes before any fix.

---

## Step 9a — Swap the dormant and depleted appearances

Status: committed

Notes: Swapped the two `RING_SPECS` entries in `SiteMarker.tsx` whole
(dormant now `{ radius: 47, strokeWidth: 3, dasharray: "8 5" }`, depleted now
`{ radius: 47, strokeWidth: 1.5, dasharray: "1 4" }`) and moved the
darker-fill rule in `SiteMarker.css` from `.site-marker--depleted
.site-marker__fill` to `.site-marker--dormant .site-marker__fill`, leaving
`.site-marker--depleted` with no fill override (falls back to the base
`.site-marker__fill { fill: none; }`). The `color: var(--color-text-dim)`
declarations on both state classes were left untouched since the value is
identical for both and swapping it would be a no-op. Updated
`SiteMarker.test.tsx`'s geometry test: the dash-pattern comment now reads
"dormant (dashed) and depleted (dotted)" and the "is visibly thinner" block
now asserts depleted's stroke width is the smallest, matching the swap.
`npm run typecheck`, `npm run lint`, `npm test` and `npm run format:check`
all pass. The manual half of verification (running `npm run dev` and
checking the fixture by eye) is left to the orchestrator/owner, per the
dispatch instructions. No other deviation from the plan.

Added after the Step 9 gate, at the owner's request. Swap the two appearances in
`SiteMarker` **whole**, line treatment and fill together, so they match
decision 1's amended table: **dormant** becomes the medium dashed dim ring over
a fill darker than an ordinary square, and **depleted** becomes the thin dotted
dim ring with no fill at all. Nothing else moves — active and charged are
untouched, the accent colour is unchanged, both rings stay at the radius that
clears the ship silhouettes, and no other module is involved: this is a change
of appearance only, so no rule, accessible name, or site-state lookup changes.

Update `SiteMarker`'s own tests to assert the swapped appearances rather than
editing them to fit whatever the component now emits — the point of the test is
that the four states are distinguishable and that each is the one decision 1
names.

Depends on: Step 6 (the artwork) and Step 9 (the gate that asked for the swap).
It comes before Step 11 deliberately, while the review fixture still puts a
depleted site on the board — after Step 11 there is no way to see a depleted
site at all, since nothing is depleted at the start of a real game.

Verification (manual): `npm test` first — the swapped appearances are asserted.
Then run `npm run dev` and open `http://localhost:5273` (restart the server
rather than refreshing; the container does not pick up file changes). Confirm
against the fixture that the four states are still tellable apart from one
another, from a bay and from an ordinary empty square, both in colour and in
greyscale, and that `H4`'s dotted depleted ring and `B4`'s dashed dormant ring
still read with a ship standing on them.

---

## Step 10 — Manual gate: screen reader

Status: committed

Notes: Taken by the owner against the review fixture, with the swapped
appearances from Step 9a in place. All five checks pass: the board still
announces as a grid named "Base Control board", sites announce their square,
that they are a site and their state (all four state words heard, with and
without a ship on the square), bays and ordinary squares are unchanged, the
wording is intelligible at speed with nothing extraneous from the artwork or
the edge labels, and the board is still a single tab stop with one-square
arrow movement clamping at the edges.

No code. Taken here, still with the fixture in place, for the same reason as
Step 9: after Step 11 only dormant and active sites exist, so this is the only
opportunity to hear all four state words announced from the real board.

Depends on: Step 8 (the fixture), Step 9 (the board looks right).

Verification (manual): with `npm run dev` running at `http://localhost:5273` and
a screen reader running (VoiceOver on macOS, NVDA on Windows, or Orca on Linux):

1. Entering the board still announces it as a grid named "Base Control board".
2. Arrowing onto a site announces the square, that it is a site, and its state —
   e.g. "E5, active site", "H8, charged site, green ship", "H4, depleted site,
   red ship", "B4, dormant site, red ship".
3. Bays and ordinary squares are unchanged: "D15, bay", "H15, bay, green ship",
   "G7".
4. The wording makes sense read aloud at speed. Nothing extraneous is announced
   from the site artwork, the ship artwork, or the visible edge labels.
5. The board is still a single tab stop and the arrow keys still move one square
   at a time, clamping at the edges.

The pass condition is intelligibility, not an exact string: each screen reader
adds its own role and position announcements around the name. If a gate fails,
record what was heard in the step's Notes before any fix.

---

## Step 11 — Remove the review fixture

Status: committed

Notes: Deleted `src/board/reviewFixture.ts`; `Board.tsx` now imports
`startingSideAt` from `../rules/fleet` and `startingSiteState` from
`../rules/sites` again, with the temporary-fixture comment removed. In
`Board.test.tsx`, restored the centre-square test (`H8, active site`), the
bay-completeness loop's `squareLabel` calls, and the ship-count assertion
(`STARTING_FLEET.length`, not `+ 4`) to the real starting state, and replaced
the `"the temporary review fixture"` describe block with the
`"sites on the starting board"` block from commit e79f35a, matching Step 7's
verification list. `grep -r reviewFixture` over the repository (excluding
`node_modules`, `.git`, and `doc/`, where the plan's own history still
mentions the deleted module by name) returns nothing. No deviation from the
plan.

Delete `src/board/reviewFixture.ts` and return `Board.tsx` to reading its site
states from `startingSiteState` and its occupants from `startingSideAt`. After
this step the board is back to exactly what Step 7 produced: seventeen sites,
five active (`H8`, `E5`, `K5`, `E11`, `K11`), twelve dormant, nothing charged or
depleted, and fourteen ships in their bays and nowhere else.

Delete the fixture's `describe` block from `src/board/Board.test.tsx` and
restore the starting-state assertions listed in Step 7's verification.

Confirm nothing references the fixture any more: a repository-wide grep for
`reviewFixture` (and for the module's exported names) must return nothing.

Depends on: Step 9 and Step 10 (both gates have used the fixture).

Verification (automated): `npm test` — the Board tests assert exactly Step 7's
list again:

1. Seventeen site markers; five cells named `… active site` (`E5`, `K5`, `E11`,
   `K11`, `H8`), twelve named `… dormant site`, **none** named charged or
   depleted.
2. Exactly fourteen cells name a ship, and they are the fourteen bays from §4 —
   no ship stands on a site.
3. axe reports no violations.

Also: `npm run build` succeeds, and `grep -r reviewFixture` over the repository
returns nothing.

---

## Step 12 — Manual gate: the real starting board

Status: committed

Notes: Taken by the owner against a dev server restarted on the fixture-free
build. All five checks pass: the seventeen sites sit where this plan's diagram
places them and read as mirrored about column H and row 8; H8, E5, K5, E11 and
K11 are active and the other twelve dormant; nothing is charged or depleted and
no ship stands on a site, the fourteen ships being in their bays as before this
story; sites and bays are not confusable and the board still fits without
scrolling; and a screen-reader pass announces only active and dormant sites.
`npm run build` also succeeds, so the app remains a static front-end-only
bundle.

No code. The story's remaining manual gate, confirming the board a player will
actually see.

Depends on: Step 11 (the fixture is gone).

Verification (manual): restart `npm run dev` (file-watch changes do not reach
Vite in the container) and open `http://localhost:5273`. Confirm all of:

1. **The sites are where the diagram in this plan says**, read off the visible
   edge labels: row 2 F2, J2; row 4 B4, H4, N4; row 5 E5, K5; row 8 D8, H8, L8;
   row 11 E11, K11; row 12 B12, H12, N12; row 14 F14, J14. Seventeen in total,
   none on the outer edge, and the picture is visibly a mirror image left-to-right
   about column H and top-to-bottom about row 8.
2. **`H8`, `E5`, `K5`, `E11` and `K11` are active**; the other twelve are
   dormant.
3. **Nothing is charged or depleted**, and no ship stands on a site — the
   fourteen ships are in their bays, exactly as before this story.
4. Sites and bays are not confusable, and the board still fits the window
   without scrolling.
5. A quick screen-reader re-check: arrowing across the board now announces only
   `… active site` and `… dormant site` — no charged or depleted square remains.

Also run `npm run build` and confirm it succeeds; the app must stay a static,
front-end-only bundle.

If a gate fails, record what was seen in the step's Notes before any fix.

---

## Step 13 — README check

Status: committed

Notes: Rewrote the status callout: it now says the board shows the seventeen
sites, five of them already nodes in play, and lists what still doesn't
happen ("Nothing wakes, runs down, or changes, there are no turns, and there
is no way to move or fight") instead of the old "no nodes" clause, using
player-facing vocabulary (node = a site in play, site = the fixed position)
per `rules.md` §2. Verified against Appendix A that only one open item
remains (starting shields, item 1) and changed the rules paragraph from "a
few details are deliberately left open" to "one detail is deliberately left
open" (singular verb/noun kept consistent). Reviewed the rest of the README
and the full `git diff main`: no other sentence describes site/node
behaviour, so nothing else needed a change. `npm run format:check`,
`npm run lint`, `npm run typecheck`, `npm test` (96 tests, 13 files) and
`npm run build` all pass; `git diff main --stat` shows the expected shape
(`rules.md`, `changelog.md`, `rulesVersion.ts` touched; `src/rules/sites.ts`
along with `siteSpacing.test.ts` and `sites.test.ts` added; `src/board/`
extended with `SiteMarker.tsx/.css/.test.tsx` and updated
`Board.tsx/.css/.test.tsx` and `squareLabel.ts/.test.ts`; no `reviewFixture`
file present, and a repo-wide grep for `reviewFixture` returns nothing). No
deviation from the plan.

Review `README.md` against what this story changed and update it if it is now
inaccurate. The `/update-readme` command does this from the branch diff.

The specific thing to look at: the README's status callout currently says
"Opening the app now shows the board in its starting position, with all fourteen
ships lined up in their bays — but the app does not play the game yet. There are
no turns, **no nodes**, and no way to move or fight." That is no longer quite
right — the board now shows the seventeen node sites and which five are in play
at the start, even though none of them does anything yet. Decide, in a sentence
or two written for a non-technical player, and either update the status note or
record in the step's Notes that no change was needed and why. Use the
player-facing vocabulary: **node** for a site in play and **site** for the fixed
position, matching `rules.md`.

Also check the README's rules paragraph, which says "a few details are
deliberately left open, and are listed at the end of the rulebook". After Step 1
only **one** open item remains (starting shields), so "a few" is now wrong.

Depends on: Step 12 (the story's behaviour is confirmed).

Verification (automated): `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm test` and `npm run build` all pass, and
`git diff main --stat` shows the expected shape of the change: `rules.md`,
`changelog.md` and `rulesVersion.ts` all touched (this story is a rules change),
`src/rules/sites.ts` and its tests added, `src/board/` extended, and **no**
`reviewFixture` file present.

---

## Deferred work

Raised at peer review and deliberately left for a later story rather than
folded into this one:

- **A guard on the site-marker/ship layering order.** The "a ship standing on
  a site does not hide which state it is in" requirement currently rests
  entirely on `SiteMarker` being placed before `ShipIcon` in JSX plus
  `grid-area: 1 / 1` in `Board.tsx`, with nothing automated checking it —
  after Step 11 no square on the starting board even holds both a site and a
  ship, so there is nothing for a test to exercise yet. This becomes a real,
  reachable state only once a ship can move onto a site, so the guard
  (whatever form it takes — a `BoardSquare` component with its own layering
  test is one option) belongs with the story that first makes that state
  possible.
- **A test guarding the dormant-site pool size.** Appendix B states that the
  app must guard the pool arithmetic — that the dormant pool cannot run dry
  under adversarial waking patterns — but no such test exists, because
  nothing in this story wakes, charges or depletes a site. That test belongs
  with the story that implements §8's state transitions, where there is
  behaviour to exercise.
