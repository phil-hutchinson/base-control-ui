# Implementation Plan — 00000013 A planet in every bay

This plan turns [`story.md`](./story.md) into an ordered sequence of steps. Each
step is implemented, verified and committed on its own, by an agent that has
read only `story.md`, this plan, and its own step. Everything a step needs is
stated here — including the reasoning behind every decision, because the code
does not carry design history (CONTRIBUTING.md, "Comments").

## What this story builds

Each of the fourteen **bays** gets a **planet**: still, decorative SVG artwork
in the same 100 x 100 viewBox `ShipModel` and `SiteMarker` already use, so it
scales with the square. The bay tile loses both its distinct fill and its
heavier cyan border, leaving the planet as the only thing that marks a bay. A
planet is drawn whether or not a ship stands on it.

**Nothing about the game changes.** No rule reads a planet, nothing moves,
nothing is announced, and no square's accessible name gains a word.

**The ruleset is not touched.** No rule is added, changed or reworded, so there
is **no** version bump, **no** `changelog.md` entry and **no** tag. If a step
turns up something that looks like a rules question, **stop and raise it with
the owner**; do not settle it in code and do not edit `doc/ruleset/`.

## This is a port, not a design exercise

The fourteen planets are **already drawn**, in `.local/eg_planets.html`. This
plan moves them into the app essentially unchanged. That single fact shapes
everything below:

- There is no staging of artwork across gates for the owner to redraw between.
  The planets are ported, then looked at once.
- A planet that renders differently from its source is a **bug**, not a design
  variation. The fidelity check (Step 7) is the story's substantive gate.
- `.local/` is gitignored, so this artwork is currently **not in the repository
  at all**. Step 1 fixes that before anything else happens.

### The precedent to follow: story 00000040

Story 00000040 did exactly this for the ship models, and this plan deliberately
mirrors it rather than inventing a second way to do the same thing. Read those
three files before starting — they are the working example of every convention
below:

- **`src/ships/shipArt.ts`** — one module owning every id string and every
  number, so "a rename cannot half-happen between the sprite and the ships that
  use it".
- **`src/ships/ShipDefs.tsx`** — a single hidden `<svg><defs>` sprite, mounted
  once, holding the whole of the ported artwork. Its header comment records
  where the art came from and that the port is otherwise verbatim. Copy that
  comment's spirit exactly.
- **`src/ships/ShipModel.tsx`** — the per-square component, which is almost
  nothing: a 100 x 100 `<svg aria-hidden>` containing a `<use href="#…">` into
  the sprite.

## Sources of truth

| For                                  | Look at                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| The artwork                          | `.local/eg_planets.html`, and after Step 1 its committed copy                                            |
| Which squares are bays               | `src/rules/bays.ts` (`BAYS`, `isBay`) — rules.md §3.1                                                    |
| How square artwork is drawn          | `src/ships/ShipDefs.tsx`, `src/ships/ShipModel.tsx`, `src/board/SiteMarker.tsx`                          |
| Where artwork is mounted in a square | `src/board/BoardSquare.tsx`, `src/board/BoardSquare.css`                                                 |
| Bay tile styling to remove           | `src/board/BoardSquare.css` (`.board-square--bay`), `src/board/Board.css` (`--bay-fill`, `--bay-border`) |

## What is already in place

- `src/rules/bays.ts` holds `BAYS` (the fourteen squares in §3.1 order) and
  `isBay`. `Board.tsx` already passes `isBay` down to each `BoardSquare`, which
  already puts a `board-square--bay` class on the square's `<div>`.
- `.board-square` is a **single-cell grid**: every child takes
  `grid-area: 1 / 1` and they stack in DOM order. A ship already sits over a
  site marker's circular artwork today without either becoming unreadable.
  This is the mechanism a planet uses, and the evidence that it will work.
- `ShipModel` draws its hull **low** in the viewBox (roughly y 63–100) with the
  power gauge across the top, deliberately leaving "the clear band between them
  … [that] keeps a site marker, drawn beneath the ship in the same square,
  readable through the middle of the square". A planet centred at (50, 50) sits
  largely in that band. This is why hiding the planet under a ship is
  unnecessary.
- `--color-space-raised` is `#151c31` — the same literal the gallery hardcodes
  behind its semi-transparent planets, and the ordinary square background a bay
  falls back to once its own fill is gone.
- The §7.1 return-position cues the earlier draft of this story worked around
  **no longer exist**: story 00000025 made bay return random and removed them.
  `Board.test.tsx` asserts their absence. Nothing reserves any part of a bay
  square.

## Where the code goes

Four new files in `src/board/`, mirroring `src/ships/` one for one:

| File                 | Role                                                                    | Mirrors           |
| -------------------- | ----------------------------------------------------------------------- | ----------------- |
| `planetArt.ts`       | Every id string, the fourteen planets' identities and traits            | `shipArt.ts`      |
| `planetPlacement.ts` | The bay → planet arrangement and the ring ordering it is judged against | (new; see Step 4) |
| `PlanetDefs.tsx`     | The ported artwork: one hidden sprite holding all fourteen              | `ShipDefs.tsx`    |
| `Planet.tsx`         | One square's planet: an `<svg>` with a single `<use>`                   | `ShipModel.tsx`   |

`planetPlacement.ts` is separate from `planetArt.ts` on purpose. The artwork
catalogue is a fact about fourteen drawings; the arrangement is a decision
about where they go, carries its own invariants, and is the part the owner is
most likely to reorder at the gate. Keeping them apart means a reordering
touches one small module and its test, not the catalogue.

## Decisions taken at plan time

### The sprite, and why planets use one at all

`ShipDefs` exists because fourteen ships share two hulls. Planets share
nothing — each of the fourteen appears exactly once. So the sharing argument
does not apply, and a reader may reasonably ask why the sprite is used anyway.
Three reasons, all of which do apply:

1. **Id uniqueness.** All fourteen planets are in one document at once. Their
   gradients, filters and clip paths are referenced by `url(#…)`, which resolves
   document-wide. The gallery's ids (`p1`, `p12blur`, `p6b-sheen`) were never
   written to coexist — and one of them, `p1moon-sheen`, is already **defined
   twice within planet 1 alone**. A single sprite forces every id to be written
   down in one place where a collision is obvious and testable.
2. **The board square stays trivial.** Each square carries a `<use>` and
   nothing else, so `BoardSquare`'s DOM does not grow by fourteen `<defs>`
   blocks' worth of gradients.
3. **It is the convention already set.** A second pattern for the same job
   would be the more surprising choice.

Mount `PlanetDefs` in **`Board.tsx`**, not `App.tsx`. `ShipDefs` is at the app
root because ships appear on the start screen as well as the board; planets
appear only on the board, so the sprite belongs with it.

### The id scheme

Every id is `planet-<nn>-<part>`:

- `<nn>` is the planet's number **from the gallery**, zero-padded (`01`…`14`).
- `<part>` is a kebab-case name for what it is: `body`, `surface`, `sheen`,
  `blur`, `clip`, `moon-sheen`, `moon-clip`, `ring`, `ring-sheen`, `ring-whole`,
  `ring-back`, `ring-front`.

The gallery's numbering is kept rather than replaced with descriptive slugs
(`planet-water-world`) for one reason: **the port must be checkable against its
source**. A reviewer holding `eg_planets.html` open beside `PlanetDefs.tsx`
should be able to match every id to the thing it came from without a lookup
table. The descriptive name lives in `planetArt.ts` as data, where humans read
it, and the number stays as the identity.

`planet-` prefixes everything for the same reason `ship-` does: it cannot
collide with `SiteMarker`'s `site-<square>-fill` ids or with whatever a later
story adds.

### What "cleaned up" means, and what it must not touch

The port fixes exactly these, and nothing else:

- **Ad-hoc ids** → the scheme above, updated at every reference.
- **The duplicate `p1moon-sheen`** (defined at two places in planet 1, with
  identical content) → one definition.
- **Commented-out material**: the orphaned block between planets 1 and 2, the
  commented-out crater group inside planet 6, the commented-out `<rect>` in
  planet 4, the disabled ring-sheen `<circle>` in planet 14, and the disabled
  moon-sheen `<circle>` in planet 9. All deleted. None of it renders today, so
  deleting it cannot change how anything looks — **verify that claim by eye at
  Step 7 rather than assuming it**.
- **`stop-color="777"`** in planet 7's ring gradient — a missing `#`, so the
  stop is an invalid colour today and falls back to black. Write it as an
  explicit `#000`. **This is settled, not a question for the gate**: the owner
  tried `#777` while drawing and prefers the black the typo produced, so `#000`
  is the intended appearance and the ring ends on it deliberately. Writing the
  literal makes that intent legible instead of leaving a typo that a future
  reader would "fix".
- **Hardcoded background literals**: planet 1 backs its translucent gradient
  with `fill="black"`, planet 2 with `fill="#151c31"`. Both exist to sit the
  planet on the board colour. Unify them to the `--color-space-raised` literal
  `#151c31` — **approved by the owner at plan time**. This _does_ change planet
  1 very slightly, and is the one deliberate visual deviation in the port: it
  is here because `black` was the wrong colour for the board even in the
  gallery, and because the alternative is a planet that stops matching its
  square if the board colour ever moves.
- **JSX conversion**: `stop-color` → `stopColor`, `clip-path` → `clipPath`,
  `stroke-width` → `strokeWidth`, and so on, as React requires. The
  `opacity="0.8 "` values in planet 9 carry a stray trailing space; trim it.

**Everything else is verbatim.** No re-tidying of coordinates, no rounding, no
"while I was in there" adjustments to gradients or radii. A port that also
improves things cannot be checked against its source.

### The arrangement, and the ring the spread is judged on

`BAYS` lists the bays in rules.md §3.1 order, which walks the bottom edge
left-to-right. That is **not** the order they appear around the board's
perimeter, so it is the wrong list to judge adjacency against. `planetPlacement.ts`
defines the **ring order** — the fourteen bays as a closed walk around the
board's edge — and the spread invariants are stated against it:

| Ring position | Bay | Planet                                | Traits                    |
| ------------- | --- | ------------------------------------- | ------------------------- |
| 0             | D15 | 08 — turquoise, vertical white ring   | ring, turquoise           |
| 1             | H15 | 11 — yellow/orange/green bands        | yellow-green              |
| 2             | L15 | 06 — double planet, banded + cratered | companion, craters, brown |
| 3             | O14 | 13 — cyan/purple/pink wave bands      | cyan-pink                 |
| 4             | O10 | 05 — gold, wide horizontal ring       | ring, gold                |
| 5             | O6  | 04 — blue/green water world           | blue-green                |
| 6             | O2  | 02 — peru/purple, four small moons    | moons, purple             |
| 7             | L1  | 07 — brown/pink, tilted grey ring     | ring, brown               |
| 8             | H1  | 10 — magenta with pale surface lines  | magenta                   |
| 9             | D1  | 01 — tan/blue with a cratered moon    | moon, craters, tan        |
| 10            | A2  | 03 — chocolate/burlywood bands        | brown                     |
| 11            | A6  | 14 — blue/teal ring, gold core        | ring, blue-teal           |
| 12            | A10 | 12 — cream/olive crater planet        | craters, cream            |
| 13            | A14 | 09 — banded brown, earth-like moon    | moon, brown               |

How it was built, so a later reordering keeps the properties that matter:

- **Rings** (05, 07, 08, 14) sit at positions 0, 4, 7, 11 — gaps of 4, 3, 4, 3
  around a ring of fourteen, which is as even as four items can be.
- **Moons and companions** (01, 02, 06, 09) sit at 2, 6, 9, 13 — the same
  4, 3, 4, 3 spacing, offset so a moon never lands beside a ring.
- **Craters** (01, 06, 12) sit at 2, 9, 12 — minimum gap 3.
- **Cool colours** (04, 08, 10, 13, 14) sit at 0, 3, 5, 8, 11 — no two adjacent,
  which matters because only five of the fourteen are cool.
- **Brown**, the largest colour family (03, 06, 07, 09), sits at 2, 7, 10, 13 —
  minimum gap 3.

**An honest limit.** Nine of the fourteen planets are warm (tan, brown, gold,
cream, yellow-green, purple), so warm planets _must_ neighbour each other
somewhere — there is no arrangement that alternates warm and cool all the way
round. The arrangement above separates every _specific_ family cleanly and lets
the unavoidable adjacency fall between different warm families (purple beside
brown, cream beside brown) rather than between two of the same. Do not treat a
warm-beside-warm pair as a defect to solve; treat two planets of the _same
family_ adjacent as one.

**The owner approved this arrangement at plan time**, with the explicit
expectation of flipping individual planets at Step 7 once the board is in front
of them. So implement it exactly as tabulated — but write
`planetPlacement.ts` so that swapping two entries is a one-line change that
the step's own test immediately re-checks, because that is what it is for.

### Which invariants are tested, and which are not

Tested, because a later edit could silently undo them:

- Fourteen entries, one per square in `BAYS`, none for any other square.
- The arrangement is total and injective — every bay gets a planet, no planet
  is used twice.
- Every id `planetArt.ts` declares is unique, and every one of them appears in
  the rendered sprite exactly once.
- No two bays adjacent in ring order share a trait: not a ring, not a moon or
  companion, not craters, not a colour family.
- The artwork is `aria-hidden` and square accessible names are byte-identical
  to today's.
- A bay renders its planet whether or not a ship stands in it.

**Not tested, deliberately** (`story.md`, _Design decisions_): where a planet
sits within its square, how large it is, whether it crowds the grid lines,
whether it reads well under a ship. The story is explicit that no test, lint
rule or geometry helper may police any of this — it is settled by eye at
Step 8. A step that finds itself wanting to assert a radius has misread the
story.

### Why the bay class survives with no styling

Step 2 deletes `.board-square--bay`'s _declarations_ and both custom
properties, but `BoardSquare` keeps pushing the `board-square--bay` class onto
the square. That is intentional: three existing tests use it as their selector
(`BoardSquare.test.tsx`, `Board.test.tsx` twice), and it is how a bay is found.
It is a hook, not dead styling. What the story forbids is leaving `--bay-fill`,
`--bay-border` and a rule body that no longer means anything.

### No animation, and no randomness

Nothing rotates, orbits or pulses; the `transform` attributes in the source are
static and stay that way. The arrangement is a hand-written constant, so
`Math.random` never comes near it and two recordings of the same game look
identical.

## Conventions every step follows

- Verify with `npm run typecheck`, `npm run lint`, `npm test`,
  `npm run format:check` and `npm run build` before committing, on top of the
  step's own verification.
- Commit each step on its own, with the story number in the message.
- Every step starts `Status: pending` and gains a `Notes:` line when
  implemented, recording what was done and **any deviation from this plan with
  its reason** — the peer review checks for undocumented ones.
- The dev server needs its own port in this worktree, which runs alongside the
  main checkout: `npm run dev -- --port 5373`.

---

## Step 1 — Get the artwork into the repository

Status: committed

Copy `.local/eg_planets.html` into this story's folder as
`doc/plan/00000013-spaceship-bay-visual/eg_planets.html`, unmodified, and
commit it.

This comes first and alone because right now fourteen hand-drawn planets exist
only in a gitignored working directory. Every later step reads from this file;
none of them should be the first thing standing between the artwork and being
lost. Keeping the gallery permanently — not just the ported result — also gives
Step 7 something to hold the board up against, for as long as the planets
exist.

Change nothing in the file. It is a record of what was drawn, not a working
document.

Depends on: nothing.

Verification (manual): Open the committed copy in a browser and confirm it
shows fourteen planets on a dark background. Run `git show --stat HEAD` and
confirm the file is tracked.

Notes: Copied verbatim — `diff --strip-trailing-cr` against the source reports
no difference, and the file holds fourteen `<svg>` elements. The source was
CRLF and git normalised it to LF on commit, so the committed copy matches
line-for-line but not byte-for-byte; nothing about the markup changed.
Deviation from the plan: the file also had to be added to `.prettierignore`. `format:check` runs `prettier --check .` over
the whole repository, and `.local/` was the only thing keeping the gallery out
of its way — moving the file into `doc/` brought it into scope, and Prettier
reformats HTML. Letting it do so would have broken the byte-identity that makes
the file usable as a fidelity reference at Step 7, which is the entire reason
for keeping it. The ignore entry carries that reasoning as a comment.

## Step 2 — The bay tile loses its fill and its border

Status: committed

Delete the `.board-square--bay` rule from `BoardSquare.css` and the
`--bay-fill` and `--bay-border` custom properties from `Board.css`, so a bay
square renders with the ordinary `.board-square` background and thin grid
border. Update the `Board.css` header comment, which currently explains that
"bays get a different fill and a heavier, differently coloured border" — that
sentence stops being true here.

Leave `BoardSquare.tsx` alone: it keeps pushing the `board-square--bay` class,
which existing tests select on and later steps rely on.

This comes before any planet so the two changes can be judged separately. If
the board looked wrong afterwards it would otherwise be unclear whether the
planets or the missing tile colour caused it.

The board will look worse at the end of this step — bays are marked only by
their thin border, and on the opening board nothing distinguishes them at all.
That is expected and temporary; Step 6 is where the planets arrive and it comes
right.

Depends on: nothing.

Verification (automated): `npm test` stays green — the three tests selecting
`.board-square--bay` are unaffected because the class remains. `grep` for
`bay-fill` and `bay-border` across `src/` returns nothing.

Notes: Deleted the `.board-square--bay` rule from `BoardSquare.css` and the
`--bay-fill`/`--bay-border` custom properties from `Board.css`, and reworded
the `Board.css` header comment (it previously said bays "get a different fill
and a heavier, differently coloured border") plus the trailing comment that
listed "bay fill/border" among what `BoardSquare.css` styles. `BoardSquare.tsx`
was left untouched, so the `board-square--bay` class still gets applied. `grep
-rn "bay-fill\|bay-border" src/` returns nothing (the only `bay-` hits left are
unrelated `bay-filler-*` ship ids in `ply.test.ts`). `npm run typecheck`, `npm
run lint`, `npm test` (799 tests, all green) and `npm run format:check` all
pass. No deviation from the plan.

Orchestrator follow-up: one further stale reference was left behind — the
comment above `.board-square__mark` in `BoardSquare.css` listed "the bay cyan"
among the colours the interaction accent is kept distinct from. That colour
left the board with the bay border, so the clause was dropped.

## Step 3 — The planet catalogue: `planetArt.ts`

Status: committed

Create `src/board/planetArt.ts`: the fourteen planets' identities, with no
rendering anywhere in it. For each planet — its gallery number, a short
descriptive name, and the traits the arrangement is judged on (whether it has a
ring, whether it has a moon or companion body, whether it is cratered, and its
colour family). Plus the id strings `PlanetDefs` will declare and `Planet` will
reference, following the `planet-<nn>-<part>` scheme in _Decisions_ above.

Take the traits and colour families from the table in _Decisions_ — they are
already settled there and should not be re-derived.

This is data only, so it lands before anything that renders. It is the module
`shipArt.ts` is the model for: the single place an id is written down.

Depends on: Step 1 (the artwork is in the repository to read the ids off).

Verification (automated): New unit tests in `planetArt.test.ts` — exactly
fourteen planets, gallery numbers 1–14 with no gaps or repeats, every declared
id unique across the whole catalogue, and every id carrying the `planet-`
prefix.

Notes: Read every one of the fourteen `<svg>` blocks in the committed gallery
to enumerate each planet's gradients, filters and clip paths, then declared
one id per part via a small `planetId`/`idsFor` helper so every id is built
from the `planet-<nn>-<part>` scheme rather than typed out by hand. Traits and
colour families are transcribed verbatim from the _Decisions_ table (cross-
checked against its own spread-summary bullets — rings at 05/07/08/14, moons
at 01/02/06/09, craters at 01/06/12, brown at 03/06/07/09 — all matched).
`PLANETS[i].ids.body` is the id `Planet.tsx` will `<use>`; every other id is
internal wiring for `PlanetDefs`. The disabled, commented-out `p9moonsheen`
and `p14ringsheen` gradients are dropped rather than given ids, since the
_Decisions_ cleanup list already calls for deleting the disabled circles that
were their only consumers, leaving them dead. Deviation: the fixed part
vocabulary listed in _Decisions_ (`body`, `surface`, `sheen`, `blur`, `clip`,
`moon-sheen`, `moon-clip`, `ring`, `ring-sheen`, `ring-whole`, `ring-back`,
`ring-front`) doesn't cover two things the artwork actually needs — planet 9's
moon has its own base-colour gradient distinct from its sheen (no `moon-`
variant of `surface` was listed), and planet 13 is built from three stacked
wave-band gradients with no single-gradient part to name. Added `moon-surface`
(planet 9 only) and `band-1`/`band-2`/`band-3` (planet 13 only), both plain
kebab-case names for what they are, consistent with the scheme's own stated
intent rather than a new convention. Also renamed what the source calls
`p1moon-blur`/`p6b-blur`/`p9moonblur` to the generic `blur` part rather than a
`moon-blur` variant: the vocabulary never lists one, and every planet that
needs a blur only ever needs one, so there is never a clash requiring
disambiguation. `npm run typecheck`, `npm run lint`, `npm test` (805 tests, all
green) and `npm run format:check` all pass.

## Step 4 — The arrangement: `planetPlacement.ts`

Status: pending

Create `src/board/planetPlacement.ts`: the ring order (the fourteen bays as a
closed walk around the board's perimeter) and the bay → planet arrangement,
both exactly as tabulated in _Decisions_ above. Provide the lookup a square
needs to find its planet.

The ring order is not `BAYS` order and must not be derived from it — §3.1 walks
the bottom edge left-to-right, so `BAYS` would give a false adjacency between
L1 and A2. State the ring explicitly.

This is separate from Step 3 because it is a different kind of fact — a
decision about placement rather than a catalogue of drawings — and because the
owner may reorder it at Step 8, which should touch this module alone.

Depends on: Step 3 (the planets it arranges).

Verification (automated): New unit tests in `planetPlacement.test.ts` — the
ring holds exactly the fourteen squares of `BAYS` with none missing or repeated;
every bay maps to a planet and every planet is used exactly once; a non-bay
square maps to nothing; and, for each of the fourteen adjacent pairs around the
ring (including the pair that closes it, A14 → D15), the two planets share no
trait: not a ring, not a moon or companion, not craters, not a colour family.

## Step 5 — The ported artwork: `PlanetDefs.tsx`

Status: pending

Create `src/board/PlanetDefs.tsx` and its stylesheet: one `<svg aria-hidden>`
containing a `<defs>` with all fourteen planets — each one's gradients, filters
and clip paths, plus its whole body as a group under that planet's `body` id,
ready to be `<use>`d. Hide it the way `ShipDefs.css` does: by zero size, **not**
by `display: none`, or `<use>` references into it stop resolving.

Port from the committed gallery, applying only the changes listed under _What
"cleaned up" means_ in _Decisions_ — ids, the duplicate definition, the
commented-out material, the two background literals, the invalid colour written
explicitly, and JSX attribute conversion. Nothing else changes.

Give the file a header comment in the manner of `ShipDefs.tsx`: where the
artwork came from, and that the port is otherwise verbatim.

Mount it in `Board.tsx`. It draws nothing itself.

This step is scaffolding and deliberately produces **no visible change** — the
sprite exists but nothing references it yet. Separating it from Step 6 keeps a
large, mechanical, easily-reviewed port apart from the small wiring change that
makes it appear.

Depends on: Step 3 (the ids it declares).

Verification (automated): A component test rendering `PlanetDefs` — every id in
`planetArt.ts` is present in the document exactly once, the root SVG is
`aria-hidden`, and it contributes no accessible content. `npm test` stays green,
and the board's appearance is unchanged from Step 2 (nothing uses the sprite
yet).

## Step 6 — `Planet.tsx`, and a planet in every bay

Status: pending

Create `src/board/Planet.tsx`: a 100 x 100 `<svg aria-hidden>` holding a single
`<use>` of the given planet's body id — the near-empty component `ShipModel` is
the model for. Then render it from `BoardSquare`, **first among the square's
children**, so it stacks beneath the site marker, the ship and every
interaction marking.

`BoardSquare` already knows it is a bay. It looks its planet up by square, and
draws it whether or not the square is occupied — there is no occupancy
condition anywhere in this step. A ship simply draws over it, as it already
does over a site marker.

Depends on: Step 4 (which planet a bay gets), Step 5 (the sprite to `<use>`).

Verification (automated): Component tests — every one of the fourteen bays
renders a planet and no other square does; a bay renders its planet with a ship
standing in it, identically to when it is empty; the planet element is
`aria-hidden`; and the existing `squareLabel` tests plus every square accessible
name in `Board.test.tsx` are unchanged, which the story requires be asserted
rather than assumed.

## Step 7 — Manual gate: the board, and the spread

Status: pending

The story's substantive gate. Run `npm run dev -- --port 5373` and, with
`doc/plan/00000013-spaceship-bay-visual/eg_planets.html` open beside the board:

1. **Fidelity.** Each of the fourteen matches its drawing. Look especially at
   the five where material was deleted or a literal changed — planets 1, 4, 6,
   9 and 14 — since those are where a port bug would hide.
2. **Planet 1's background**, the port's one deliberate visual change, now the
   board colour rather than `black`. The owner approved this at plan time
   sight-unseen, so it is the single thing here most worth a second look —
   confirm the planet still sits on its square the way it did in the gallery.
   Planet 7's ring ending on `#000` needs no check: that is already the
   appearance the owner chose.
3. **Ships and planets together.** Move ships out of bays and back. Both stay
   readable, and no pairing turns to mush.
4. **Bays read as bays** at the smallest board size, with the tile colour and
   border gone.
5. **The spread reads as spread.** Stand back from the whole board: no run of
   similar planets, no corner gone all one colour. **The arrangement is the
   owner's to reorder here** — a reordering changes `planetPlacement.ts` and
   its test and nothing else.

Expect this gate to send work back, and re-run it after any change it prompts.

Depends on: Step 6.

Verification (manual): The owner confirms all five, or lists what to change.

## Step 8 — Manual gate: the screen reader hears nothing new

Status: pending

Move across several bays, empty and occupied, with a screen reader running.
Each announces exactly what it announced before this story — "bay", its
coordinates, any occupant — with no mention of a planet, and no extra stop or
silent element in the traversal.

This is its own gate rather than a bullet in Step 7 because it is a different
tool and a different kind of failure: an `aria-hidden` that did not take, or a
stray focusable element, is invisible to the eye check.

Depends on: Step 6.

Verification (manual): The owner confirms bay announcements are unchanged.

## Step 9 — README check

Status: pending

Run `/update-readme` and confirm `README.md` is still accurate. The story
changes only how the board looks, so an update is likely unnecessary — but if
the README describes bays as coloured tiles, that sentence is now wrong.

Depends on: Step 6.

Verification (automated): `/update-readme` reports no change needed, or its
change is reviewed and committed.
