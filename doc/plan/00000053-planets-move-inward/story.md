# Story 00000053 — Planets move inward

## Summary

The fourteen **bays** around the board's edge become twelve **planets** in
the board's interior. The word "bay" goes with them: a planet is what a
recovering ship stands on, in the rules, in the UI and in the code, and the
planet artwork stops being decoration painted onto a bay and starts being
the thing itself.

Ships still start where they start — the same fourteen edge squares, the
same colours, the same layouts — but those squares are now **ordinary
squares**. They give nothing, protect nothing, and are named nothing. A ship
that wants to recover has to fly inward for it.

What changes:

- **Twelve planets, in the interior**, at fixed squares (below). The
  fourteen edge bays are gone.
- **"Bay" is renamed "planet" everywhere** — rules, UI wording, accessible
  names, module and symbol names.
- **Fleet sizes become five or six a side.** Seven is removed, and **six is
  the standard game**. Twelve ships against twelve planets is the tight
  case §7.1's return draw is sized for; fourteen ships would break it.
- **Two planets are dropped from the catalogue** — the crater planet (11 →
  see below) and the Jupiter-like storm planet — taking it from fourteen
  drawings to twelve, one per square.
- **The twelve drawings are dealt at random across the twelve squares** at
  the start of every game, from the game's own seed, so no two games look
  alike and a recorded game still redraws identically.
- **A node never appears on a planet, or next to one.** Some planets sit
  inside the square the node draw uses and some do not (Step 9a moved the
  geometry after this was first written), but either way §3.2 gains a sixth
  constraint to guarantee it.
- **The board carries twelve nodes, not fifteen.** This falls directly out
  of the constraint above and is explained under "The thing that follows"
  below. It is not a free choice.
- **Ship starting squares keep their positions and lose their properties.**

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version
0.21**. This story takes it to **0.23** — a gameplay change, so it earns a
changelog entry and a version bump (tagging remains on hold, per
`CLAUDE.md`).

Planning documents say **ply** for the rules' and the UI's **turn**
(`CLAUDE.md`, Vocabulary). Planets are named in the players' words
throughout: a ship is **on** a planet, never "in" one — the preposition
changes with the noun, and every sentence that said "in a bay" is rewritten,
not find-and-replaced.

### The twelve squares

Six squares, plus the 180° rotation of those six:

| Base     | B3  | D6  | G4  | J2  | K6  | N4  |
| -------- | --- | --- | --- | --- | --- | --- |
| Rotation | N13 | L10 | I12 | F14 | E10 | B12 |

```
     A B C D E F G H I J K L M N O
 15  . . . S . . . S . . . S . . .
 14  S . . . . P . . . . . . . . S
 13  . . . . . . . . . . . . . P .
 12  . P . . . . . . . . . . . . .
 11  . . . . . . . . . . . . . . .
 10  S . . . P . . . . . . P . . S
  9  . . . . . . . . . . . . . . .
  8  . . . . . . . . . . . . . . .
  7  . . . . . . . . . . . . . . .
  6  S . . P . . . . . . P . . . S
  5  . . . . . . . . . . . . . . .
  4  . . . . . . P . . . . . . P .
  3  . P . . . . . . . . . . . . .
  2  S . . . . . . . . P . . . . S
  1  . . . S . . . S . . . S . . .

P  planet          S  a starting square (fleet size decides which are used)
```

Two properties of this arrangement, both verified:

- **It is symmetric under a half-turn, and not under a mirror.** Each
  player's half of the board is exactly the rotation of the other's, which
  is the same fairness the starting layouts already have (§4) — so neither
  side begins nearer better ground.
- **No two planets are adjacent**, orthogonally or diagonally, and none sits
  on a starting square.

A third property held for the geometry this story was first written against
and does **not** hold here: **six of the twelve sit outside C3–M13** (B3, J2,
N4, N13, F14 and B12), in the two excluded edge rings where a node can never
appear regardless. Only the other six — D6, G4, K6, L10, I12, E10 — are ones
§3.2's planet constraint actually bites on. That is why the arithmetic in the
next section was re-measured rather than carried over.

**Where these came from.** Steps 1–8 were written and implemented against a
tighter ring — base squares E3, D7, F5, I4, J8, L5 with rotations K13, L9,
J11, G12, F8, D11. Having seen it on the running board the owner moved the
planets twice and settled here, and Step 9a re-sited them. The original set
is recorded because the node-count arithmetic below was decided against it,
and because Steps 6 and 7's commit messages quote its figures.

### The thing that follows, and is not bookkeeping

**Twelve planets with a one-square buffer cost the node pool three nodes.**
_(Figures below are as originally measured, against the original geometry
above — superseded by Step 9a's re-measurement, which follows.)_ The interior
C3–M13 is 121 squares. Removing the twelve planets and their eight
neighbours each leaves **29** legal squares, of which at most seventeen are
mutually non-adjacent. Fifteen non-adjacent nodes technically fit, but the
deal draws them one at a time from a shrinking pool and, in simulation,
exhausts it and drops into §3.2's fallback on **about 36% of games**. The
fallback places nodes on the board's edge and beside one another; making it
the common case would be a worse outcome than any rule this story adds.

Fallback rate against node count, 4,000 dealt games each:

| Nodes              | 11  | 12   | 13   | 14  | 15  |
| ------------------ | --- | ---- | ---- | --- | --- |
| Deals falling back | 0%  | 0.3% | 1.7% | 11% | 36% |

**So `NODE_COUNT` goes from fifteen to twelve.** The owner's decision, taken
knowing the alternatives (a graded relaxation of §3.2, or dropping the
buffer and excluding only the planet square itself).

**Re-measured against the settled geometry (Step 9a).** Six of the twelve
planets now sit outside the node interior, so the buffer costs less: the
legal pool grows to **51** squares, of which up to **eighteen** are mutually
non-adjacent — up from 29 and seventeen. The pool is larger but more
scattered, so the owner's decision stands unchanged: fifteen nodes would
still fall back often, and `NODE_COUNT` stays at twelve. Fallback rate by
node count, 3,000 dealt games each, board otherwise empty: 12 → 0.00%,
13 → 0.13%, 14 → 3.20%, 15 → 21.47%; with all twelve ships scattered through
the interior: 12 → 0.00%, 13 → 1.13%, 14 → 8.03%, 15 → 32.27%. At twelve
nodes the fallback was not observed at all — a stronger guarantee than the
original geometry's "rare".

The pool arithmetic that follows, against the unchanged target of four
charged nodes: a node lives about 20 turns charged and about 10 depleted, so
twelve nodes settle at roughly **4 charged / 2 depleted / 6 inactive**, with
an average inactive wait of about **30 turns** and a node charging about
every five turns. That is the wait the pressure cap of 50 was originally set
against, so story 56's warning that the cap had drifted to sit at the
average wait no longer applies — Appendix B says so rather than leaving the
old warning standing. Running short of the target stays uncommon: six nodes
inactive against a target of four.

**The fallback becomes rare rather than unreachable, and the rules say so.**
At twelve nodes the opening deal falls back on about **0.2%** of games with
the board otherwise empty, and about **2%** in the worst case where all
twelve ships are scattered through the interior blocking squares of their
own; a replacement mid-game falls back on about 0.5% of draws. §3.2
currently says the fallback "is not expected to be needed given how much
room the interior leaves". That sentence is no longer true and is replaced
by an honest one.

### What exists today

- **`src/rules/bays.ts`** — `BAYS` (the fourteen edge squares) and `isBay`.
- **`src/board/planetPlacement.ts`** — `RING_SLOTS`, a fixed table pinning
  one planet drawing to each bay; `RING_ORDER`, the perimeter walk the
  spread of traits is judged around; and `planetForSquare`.
- **`src/board/planetArt.ts`** — `PLANETS`, the fourteen drawings, each with
  `PlanetTraits` (`ring`, `moon`, `craters`, `colorFamily`), a `surface`, an
  optional `ringOrientation`, and the ids `PlanetDefs` declares.
- **`src/board/PlanetDefs.tsx`** — the fourteen drawings themselves.
- **`src/rules/fleet.ts`** — `FleetSize` (5 | 6 | 7), `FLEET_SIZES`,
  `DEFAULT_FLEET_SIZE` (7), `MAX_SHIPS_PER_SIDE`, and the three layouts.
- **`src/rules/nodePlacement.ts`** — `legalNodePool`, whose fallback already
  excludes bays, and `drawNodeSquare`.
- **`src/rules/nodes.ts`** — `NODE_COUNT` (15), `TARGET_CHARGED_NODES` (4),
  `dealOpeningBoard`.
- **`src/board/squareLabel.ts`** — the accessible name, whose comment states
  that "a square is never both a bay and a node, so the two share one slot".
- **`src/board/announcements.ts`**, **`src/board/BoardSquare.tsx`**,
  **`src/board/Board.css`**, **`src/board/grid/AccessibleGrid.tsx`**,
  **`src/start/StartScreen.tsx`**, **`README.md`** — bay wording, the
  `board-square--bay` test hook, and the fleet-size control.

## In scope

### 1. The rules edit, first and on its own

Version 0.21 → 0.23, with a changelog entry, in its own commit ahead of the
code.

**§1, §2 — the overview and the vocabulary.** The fleet is "five or six
ships"; a beaten ship is pushed back "to a planet", not to a bay. The
random-elements list is unchanged in substance (the opening board, the
charge draw, where a new node appears, which planet a beaten ship returns
to, how fast a node burns) but names planets.

**§3.1 — "Bays" becomes "Planets".** Twelve squares, at the table and
diagram above, with the half-turn symmetry stated. A planet is an ordinary
square in every way except two, exactly as a bay was: a ship on a planet
cannot attack and cannot be attacked, and a ship on a planet at the end of
its owner's turn gains one power to the maximum of 4. Flying over one does
nothing; arriving on one does nothing by itself. Planets are not owned.

**§3.1 also gains what it did not need before:** the diagram must now
distinguish planets from starting squares, because they are no longer the
same squares, and it must say that a starting square is otherwise ordinary.

**§3.2 — a sixth constraint.** A square is a legal place for a new node when,
in addition to the five constraints it already lists, **it is not a planet
and is not orthogonally or diagonally adjacent to a planet.** The paragraph
about what constraints 3 and 4 leave is rewritten around the real figure:
the interior is 121 squares, the planets and their buffers take it to 29,
and twelve mutually non-adjacent nodes fit there with room to spare.

The fallback keeps its shape — the whole relaxation at once, not one
constraint dropped at a time — and keeps excluding planets, as it excluded
bays. Its "not expected to be needed" sentence is replaced by the honest
figures above: rare, not impossible.

**§4 — five or six ships, and starting squares that are only that.** Seven a
side is removed, **six is the standard game**, and the two remaining layouts
are stated **standalone**. Today the six-a-side layout is defined as "every
other bay holds exactly the ship and the colour it holds in the seven-ship
game" and the five-a-side one as the seven-ship game with two edges
reversed; with seven gone, both definitions dangle and both tables are
written out in full instead. The squares and colours themselves do not
change:

| Fleet       | Green                    | Red                        |
| ----------- | ------------------------ | -------------------------- |
| Six a side  | O14, O6, D1, L1, A14, A6 | D15, L15, O10, O2, A10, A2 |
| Five a side | H15, O10, A10, D1, L1    | D15, L15, O6, A6, H1       |

Both layouts remain exact half-turn rotations of one another; that paragraph
survives, restated without reference to a seven-ship game. The paragraph
about an empty bay being "an ordinary empty bay" is **deleted** — every edge
square is ordinary now, occupied or not, and there is nothing left to say.

**§4.1 — power.** A ship gains a point "standing on a **planet**", in place
of "in a bay". The reassurance that "a ship at 0 power is not destroyed and
is not stuck" now ends "and a planet will refill it" — worth a second look
when read aloud, because the planet is no longer a step away.

**§7 — combat.** "Neither ship may be in a bay" becomes "neither ship may be
on a planet", with the same two halves (a ship on a planet cannot attack and
cannot be attacked).

**§7.1 — returning to a planet.** A returning ship goes to a planet chosen at
random from the planets **empty at that moment**. The guarantee that there is
always somewhere to go is **restated with its new arithmetic**, because it is
now exactly tight and is the reason seven a side is gone: with twelve ships
and twelve planets, the two ships in a fight were by definition not on
planets, so at most ten planets are occupied and at least two are free —
enough for the attacker and then the defender. At fourteen ships this
argument fails outright, which is why the fleet sizes changed in the same
story.

**§7.2 — returning by choice** reads "ends on an empty planet".

**§8.6 step 1** — "on a depleted node or in a bay" → "or on a planet", in
both places the section says it.

**§8.1, §8.2, §8.4, Appendix B — twelve nodes.** The opening board is
**twelve** nodes: four charged, eight inactive, none depleted. §8.4's
paragraph about how many can be depleted at once becomes "up to eight of the
twelve". Appendix B is rewritten around the twelve-node pool and the ~30-turn
inactive wait, retiring story 56's note that the pressure cap had drifted
above the average wait, and stating the fallback's real rarity.

### 2. The rename

`bay` → `planet` in every name and every sentence, in one pass:

- **`src/rules/bays.ts` → `src/rules/planets.ts`**, exporting the twelve
  squares and `isPlanet`.
- **The export name collides.** `planetArt.ts` already exports `PLANETS` for
  the drawings. The squares take `PLANETS` (they are the rules-level thing
  the rest of the code asks about) and the catalogue is renamed —
  `PLANET_ART` — with every importer updated. Whatever the plan picks, the
  two must not be distinguishable only by import path.
- `isBay` → `isPlanet` at every call site (`Board.tsx`,
  `nodePlacement.ts`, `announcements.ts`, `camping.test.ts`, and the rest).
- `BoardSquareProps.isBay` → `isPlanet`; `board-square--bay` →
  `board-square--planet`, still a test-only query hook.
- `squareLabel`'s "bay" segment becomes "planet". Its module comment's claim
  that a square is never both a bay and a node **stays true** under §3.2's
  new constraint, and the comment is updated to say why it is true now — the
  node draw excludes planets — rather than because planets are on the edge.
- `announcements.ts`: "moved from X into the Y bay" → "onto the Y planet";
  "The attacker returned to the X bay" → "to the X planet"; the two refusal
  sentences ("A ship in a bay cannot attack" / "cannot be attacked") become
  "on a planet". The refusal reason ids `attacker-in-bay` /`target-in-bay`
  are renamed with them.
- Comments and doc comments throughout `src/rules/` and `src/board/`.

### 3. The twelve squares, and what draws on them

- **`src/rules/planets.ts`** holds the twelve squares. The table is written
  as the six base squares plus their half-turn rotations, computed rather
  than typed twice, so the symmetry cannot be broken by a typo — and a test
  asserts both the symmetry and that no two planets are adjacent.
- **`planetPlacement.ts` is replaced, not edited.** `RING_SLOTS` and
  `RING_ORDER` go: there is no ring any more, and no fixed pairing of
  drawing to square to walk. In their place, a pure function producing a
  **random permutation** of the twelve drawings over the twelve squares.
- **The permutation comes from the game's own seed.** `Math.random` is
  banned in game code (`CLAUDE.md`) and a recorded game must redraw
  identically. The recommended shape, for the plan to confirm: add
  `openingSeed` to `GameState` — the seed the deal started from, which
  nothing keeps today and which a game record wants regardless — and derive
  the arrangement from it in the board layer with `random.ts`'s existing
  `mulberry32`, **without** consuming the rules' seed stream. Deriving it
  keeps a purely visual fact out of the rules layer and leaves every
  existing seeded expectation to move only because the node count moved.
  The alternative — drawing the shuffle as part of the opening deal and
  storing the permutation on the state — is legitimate and should be
  rejected explicitly in the plan rather than by omission.
- **`Board.tsx`** asks the arrangement, not a fixed table, which drawing a
  square carries.

### 4. The catalogue loses two

- **Planet 12** — the cream-and-olive crater planet — and **planet 11** — the
  rose-and-cream banded planet with a storm, the Jupiter-like one — are
  deleted from `planetArt.ts` and their `<defs>` from `PlanetDefs.tsx`.
- **The remaining numbers keep their gaps**: 1–10, 13, 14. The number is the
  source gallery's own and is baked into every id (`planet-13-body`), so
  renumbering would churn `PlanetDefs.tsx` for nothing. `planetArt.test.ts`'s
  "1–14 with no gaps or repeats" test becomes an assertion about the twelve
  numbers actually present, and the module comment's "zero-padded, 01–14" is
  corrected.
- **The trait machinery goes with the ring.** `PlanetTraits`,
  `PlanetColorFamily` and `planetPlacement.test.ts`'s `sharesATrait` exist
  solely to judge the spread of drawings around a fixed ring. With a random
  arrangement there is no spread to assert and nothing reads them; they are
  deleted rather than left as unused data.
- **`surface` and `ringOrientation` stay**, and so does the test that no two
  drawings share a signature — "every planet is distinguishable from every
  other" is still worth holding, and now holds for twelve.

### 5. Fleet size

- `FleetSize` becomes `5 | 6`; `FLEET_SIZES` becomes `[6, 5]`, largest
  first as now; `DEFAULT_FLEET_SIZE` becomes 6.
- `MAX_SHIPS_PER_SIDE` becomes 6 by the same derivation, which tightens
  `energyForDepletedNodes`' guard correctly: a side cannot stand on more
  depleted nodes than it has ships.
- `SEVEN_A_SIDE_LAYOUT` is deleted. `SIX_A_SIDE_LAYOUT` and
  `FIVE_A_SIDE_LAYOUT` keep their squares, colours and clockwise order
  exactly; their doc comments stop referring to the seven-ship game.
- `startingGameState`'s `RangeError` message says "must be 5 or 6".
- `StartScreen` renders two choices; nothing else about the control changes.

### 6. The node pool

- `NODE_COUNT` 15 → 12. `TARGET_CHARGED_NODES` stays 4.
- `dealOpeningBoard`'s doc comment: twelve nodes, four charged, eight
  inactive. The deal now takes 4 + 8 + 12 = **24** seed steps, not 30.
- `legalNodePool` gains the planet constraint in the ordinary pool, and
  keeps excluding planets in the fallback where it excluded bays. The
  `RangeError` message names planets.
- Nothing else about a node changes: capacity, the drain, recovery and
  pressure tables, and the three states are untouched.

### 7. What the player sees

- Twelve planets sit inside the board, in a different arrangement of
  drawings every game. The edge is bare.
- Ships start where they always did and are attackable from the first turn,
  because a starting square protects nothing.
- The start screen offers **6** and **5**, defaulting to 6.
- **`README.md`** describes planets in the interior, twelve nodes, five or
  six ships, and no bays. Run `/update-readme` for the rest of the diff.

Per the accessibility section of `CLAUDE.md`, existing automated tests are
updated where the path is straightforward and no plan step is added for
testing accessibility. Nothing here is expected to cost an accessible
behaviour — the square label keeps its one slot for "planet or node", and
the announcements keep their structure — but if the plan finds one, it is
recorded in `doc/plan/00000021-accessibility-tech-debt/known-issues.md`
rather than paid.

### 8. The tests

- **`bays.test.ts` → `planets.test.ts`** — twelve squares, the half-turn
  symmetry, no two adjacent, none on a starting square, and `isPlanet`. (Step
  9a's settled geometry has six of the twelve inside C3–M13 and six outside
  it, so "all inside C3–M13" no longer holds and is not asserted.)
- **`nodePlacement.test.ts`** — no legal square is a planet or adjacent to
  one; the pool is non-empty for a realistic board; the fallback still
  excludes planets; a long run of deals and replacements completes without
  error.
- **`planetPlacement.test.ts`** — rewritten: the arrangement is a
  permutation (every square gets exactly one drawing, every drawing is used
  exactly once), the same seed gives the same arrangement, and different
  seeds give different ones.
- **`planetArt.test.ts`** — twelve entries, numbers 1–10/13/14, ids still
  unique and still prefixed by their own number, signatures still distinct.
- **`fleet.test.ts`** — two sizes, default 6, `MAX_SHIPS_PER_SIDE` 6, both
  layouts' squares and colours unchanged, and the half-turn relationship
  between the two sides still holding for each.
- **`nodes.test.ts`, `nodePool.test.ts`, `openingBoard.test.ts`** — twelve
  nodes, four charged, eight inactive; the long-run guards (the pool stays
  populated, expiries stay spread, no node waits unboundedly) retuned
  against twelve where a threshold was set against fifteen.
- **`recovery.test.ts`, `combat.test.ts`, `camping.test.ts`,
  `endOfTurn.test.ts`, `ply.test.ts`** — every fixture standing a ship "in a
  bay" now stands it on a planet, which is an interior square: fixtures that
  relied on a bay being unreachable from the middle of the board, or on
  edge-square geometry, are rebuilt rather than coordinate-swapped.
- **`fullGame.test.ts`** — runs to completion at both fleet sizes.
- **`seededReplay.test.ts`** — expectations **regenerated**, not worked
  around. The property guarded is unchanged; the numbers move because the
  node count and the deal's step count moved.
- **`rulesVersion.test.ts`** — holds `RULES_VERSION` at 0.22.
- **`Board.test.tsx`, `BoardSquare.test.tsx`, `squareLabel.test.ts`,
  `announcements.test.ts`, `StartScreen.test.tsx`** — planet wording, the
  renamed class hook, two fleet sizes.

## Out of scope

- **Balancing what the change does to play.** Recovery and combat immunity
  now sit in the middle of the board, a beaten ship returns to the centre
  rather than to the edge, and twelve ships against twelve planets can in
  principle all park somewhere safe. This is a step in a series, and the
  owner's direction is that how well the game plays is not this story's
  problem.
- **Retuning any node number other than the count.** `NODE_CAPACITY` (60),
  `TARGET_CHARGED_NODES` (4), `PRESSURE_CAP` (50), the drain, recovery and
  opening tables are untouched.
- **Re-shaping the energy table.** §8.4 already stops at four and stays
  there.
- **Changing where ships start.** The squares, the colours and the two
  layouts are exactly as they are today.
- **Moving, redrawing or re-scaling the planet artwork** beyond deleting
  two drawings. How a planet reads against an interior square rather than an
  edge one — size, contrast, how it sits under a ship — is a visual story.
- **Redrawing the board's edge** now that nothing lives there.
- **New planet drawings** to replace the two deleted. Twelve drawings for
  twelve squares is exactly enough.
- **A migration path for games recorded under 0.21.** There is no backwards
  compatibility (`CLAUDE.md`).

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.23 (0.22 for the rename and the
  move into the interior, 0.23 for Step 9a's re-siting), and the changelog
  has an entry for each. No section of `rules.md` uses the word "bay", and
  none describes a seven-ship fleet.
- The twelve planets are exactly B3, D6, G4, J2, K6, N4, N13, L10, I12, F14,
  E10, B12 (Step 9a's settled geometry, superseding the E3/D7/F5/I4/J8/L5 set
  above); the set is unchanged by a half-turn rotation; no two are adjacent;
  six of the twelve (D6, G4, K6, L10, I12, E10) are inside C3–M13, and six
  are not.
- A ship on a planet cannot attack and cannot be attacked, and gains one
  power at the end of its owner's turn to the maximum of 4 — as a bay did.
- A ship on a starting square has none of those properties.
- No square drawn for a node is a planet or adjacent to one, at the opening
  deal and at every replacement, over a long run and whatever the seed.
- A dealt board has twelve nodes: four charged, eight inactive, none
  depleted.
- A fight returns both ships to empty planets, at both fleet sizes, over a
  long run and without ever failing to find one.
- The start screen offers five and six ships and starts on six; a game can
  be played to its end at either size.
- The twelve drawings are dealt one per square, all twelve used; the same
  opening seed gives the same arrangement every time and different seeds
  give different arrangements.
- The same opening seed and the same sequence of actions produce the same
  game every time, with `seededReplay.test.ts`'s expectations regenerated.
- `fullGame.test.ts`, `openingBoard.test.ts` and `nodePool.test.ts` pass.
- Nothing under `src/`, and nothing in `README.md`, still says "bay" — in a
  name, a sentence or a comment. (`doc/plan/` keeps its history, including
  the folder named for the story that introduced them.)
