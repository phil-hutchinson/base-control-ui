# Story 00000003 — Set the site positions

## Summary

Settle where the sites are and draw them on the board. Seventeen sites, fixed
for every game, laid out symmetrically about the board's two centre lines.

This is a **rules change**: it closes [Appendix A](../../ruleset/rules.md#appendix-a--open-items)
item 1, renames the four states a site can be in, says which sites are in play
when the game starts, and relaxes the site-spacing constraint to match what it
was actually there to guarantee. `rules.md` goes from **0.1 to 0.2**, and the
merge commit is tagged `rules-0.2` via `/tag-rules`.

No site changes state during this story. Waking, clocks, influence and the
random replacement are all §8 machinery that a later story builds.

## Background & references

Story 00000001 drew the board, its fourteen bays and the fourteen ships. It
left `src/rules/` holding `board.ts` (squares and names), `bays.ts`, `fleet.ts`
and `rulesVersion.ts`, with the view in `src/board/`. This story adds sites
alongside them and follows the patterns already set there.

Appendix A item 1 was deliberately deferred until there was a board on screen
to judge against. There now is, and the owner has settled the layout on paper.

## The decision (fixed by the owner)

**Symmetry.** The layout is a mirror image across **column H** and across
**row 8**. A 180° rotation therefore also maps it onto itself. It is
deliberately **not** symmetric across the diagonals.

That last point is not a compromise. The bays cannot be diagonally symmetric
either: fourteen bays spaced every fourth square around a 56-square perimeter
put **three on each horizontal edge and four on each vertical**, which no
reflection can even out. Since the sites are placed partly by reference to the
bays, requiring diagonal symmetry would fight the thing they are keyed to.

**The layout.** Six seed squares in the A–H, 1–8 quarter — `F2`, `B4`, `E5`,
`H4`, `D8`, `H8` — expand under the two mirrors to seventeen sites. How many
copies a seed produces depends on where it sits: off both centre lines gives
four, on one of them gives two, and the centre square gives one.

| Seed | Copies | Sites            |
| ---- | ------ | ---------------- |
| F2   | 4      | F2, J2, F14, J14 |
| B4   | 4      | B4, N4, B12, N12 |
| E5   | 4      | E5, K5, E11, K11 |
| H4   | 2      | H4, H12          |
| D8   | 2      | D8, L8           |
| H8   | 1      | H8               |

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

**Seventeen, not the 12–15 §3.2 currently allows.** The binding constraint in
[Appendix B](../../ruleset/rules.md#appendix-b--sizing-the-site-pool) is not
safety but randomness: about ten sites stay committed at any moment (five in
play, roughly five cooling down), so a pool of 12 leaves only two dormant and
the "random" replacement is very nearly forced. Seventeen leaves about seven
dormant, which is what keeps §8.6 honest.

**The four states are renamed.** §8.1's `sleeping → awake → live → spent`
becomes:

> **dormant → active → charged → depleted → dormant**

**The game starts with five active sites: `H8`, `E5`, `K5`, `E11`, `K11`.** The
other twelve start dormant. `rules.md` does not currently say which sites are
in play at the start — only that exactly five are active or charged at any
moment — so this closes a real gap rather than restating one.

Nothing is charged or depleted at turn zero, and that is deliberate: §8.2 makes
a site charged only when a ship touches it, and §8.3 starts its nine-turn clock
on the turn it was woken. A charged site at turn zero would have no waker and
no clock start.

## The spacing constraint is stricter than its purpose

§3.2 requires sites at least **4 apart** on an orthogonal line and **3 apart**
on a diagonal, "so that a single move can never wake more than one site".

That is one square stricter than the stated purpose needs, on both axes,
because it counts the square the ship starts on. It should not. A ship standing
on a site is standing on one that is already charged or depleted, never one
that is active and waiting to be touched — §6 forbids ending a move on a
dormant or depleted site, and §8.5 says a site that wakes underneath a ship
"becomes live immediately". So the square a move departs from can never be
woken by that move.

Excluding the origin, the longest reaches in §6 (three orthogonal, two
diagonal, at 0 shields) can touch two squares at most **2 apart** orthogonally
or **1 apart** diagonally. The true thresholds are therefore:

| Line       | §3.2 as written | Actually required |
| ---------- | --------------- | ----------------- |
| Orthogonal | gap ≥ 4         | gap ≥ 3           |
| Diagonal   | gap ≥ 3         | gap ≥ 2           |

**§3.2 is relaxed to `≥ 3` orthogonal and `≥ 2` diagonal.** Under the written
thresholds the chosen layout has four failures, all the `F2`–`H4` diagonal pair
and its mirror images; under the real requirement it has none. An exhaustive
sweep of every legal move from every square on the board confirms no move
anywhere can touch two of the seventeen.

The relaxed thresholds sit exactly on the limit, so they are now tightly
coupled to §6. If movement ranges ever change, this has to be redone —
`rules.md` should say so, in the same spirit as Appendix B's existing warning
about the nine-turn figures.

## In scope

1. **The rules change**, as one coherent pass over `rules.md`:
   - §3.2: seventeen named sites, the symmetry, and the relaxed thresholds
     with a note on their coupling to §6.
   - §8.1: the four states renamed.
   - §8: which five sites start active, and that nothing starts charged or
     depleted.
   - The rename applied everywhere else the old words appear — §6, §8.2–8.7 and
     Appendix B all use them.
   - Appendix A item 1 struck; Appendix B's arithmetic refreshed for a pool
     of 17.
   - A changelog entry, the version at 0.2, and `RULES_VERSION` bumped in the
     same commit.
2. **Site data in `src/rules/`** — the seventeen positions and the five that
   start active, following `bays.ts`'s shape.
3. **The four-state type in the rules layer.** §8.1 defines the states, so the
   type belongs there. The transitions between them do not — those are §8.2–8.7
   and a later story.
4. **Sites drawn on the board**, with a distinct appearance for each of the
   four states.
5. **A temporary fixture for reviewing the four appearances**, and a late step
   that removes it (see below).
6. **The board's accessible names** extended to say that a square is a site and
   what state it is in.

## Design decisions & constraints

- **List the seventeen explicitly, then test the symmetry.** `bays.ts` lists
  all fourteen bays plainly and this should match it. Generating the list from
  the six seeds would make symmetry true by construction and therefore
  untestable — a mistyped seed would still produce a perfectly symmetric,
  perfectly wrong layout. An explicit list checked against the mirror
  properties catches both a typo and a wrong seed.
- **Test the real requirement, not the numbers.** The spacing test should
  enumerate every legal move from every square using §6's ranges and assert
  that none touches two sites, rather than asserting gaps of 3 and 2. That is
  what §3.2 exists to guarantee, it stays honest if the thresholds are ever
  revisited, and it is the check that showed the written thresholds were
  stricter than needed.
- **The scaffolding stays out of `src/rules/`.** For the visual review the
  board needs a site in each state — the plan should put `H4`/`H12` in
  `depleted` and `H8` in `charged`, alongside the four active `E5` sites and the
  rest dormant. That arrangement is **not** a legal game state and must never
  be asserted by the rules layer. A late step replaces it with the true
  starting state derived from the rules, and the final manual gate confirms the
  board shows five active and twelve dormant sites and nothing else.
- **Colour is never the only cue.** `src/index.css` records that the two side
  colours must stay distinguishable to a colour-blind viewer and always be
  paired with a non-colour cue. Four states are a harder case than two sides:
  they need to differ by more than hue, stay distinct from a bay marker, and
  not compete with the ship sitting on top of them.
- **Logic stays out of components,** per CONTRIBUTING.md — the site set, state
  type, and accessible-name wording belong in plain modules with plain unit
  tests.
- **No square is both a bay and a site.** Every site is interior and every bay
  is on the outer edge, so this is already true; it is worth a test so it stays
  true.

## Out of scope

- **Every §8 transition** — waking on touch, the nine-turn clock, influence
  scoring, the random replacement, and the cooldown. No site changes state
  during this story, so no seeded generator is needed yet either.
- **Starting shields** — Appendix A item 2, still open, and best judged once
  ships can move.
- **Movement, attacks, turns and rounds.**

## Verification

Automated (green before sign-off): `npm run typecheck`, `npm run lint`,
`npm test`, `npm run format:check`, `npm run build`.

Tests should cover: seventeen sites, all interior; the layout is unchanged by a
mirror across column H and by a mirror across row 8 (the 180° rotation then
follows); no single legal move can touch two sites; the five that start active
are exactly `H8`, `E5`, `K5`, `E11`, `K11` with the other twelve dormant; no
site is a bay; and `RULES_VERSION` matches `rules.md`.

**Manual gates:**

1. **The four appearances**, with the temporary fixture in place. Each state is
   tellable from the other three, from a bay, and from an empty square; a ship
   standing on a site does not hide which state it is in; and the four remain
   distinguishable without relying on colour alone.
2. **The real starting board**, after the fixture is removed. Sites are where
   the diagram above says. `H8`, `E5`, `K5`, `E11` and `K11` are active,
   the other twelve dormant, nothing charged or depleted.
3. **Screen reader.** Moving across the board announces that a square is a
   site and what state it is in, in wording that makes sense read aloud.

## Open items to resolve at plan time

- How a site is drawn so it reads clearly under a ship and does not compete
  with the bay marker.
- Whether the temporary fixture is a dev-only route or flag, or simply a
  committed constant that a later step swaps out.
- Whether §3.2 should state numeric thresholds at all, now that the app tests
  the property they were standing in for.
- How the accessible name words a site and its state, alongside the position
  and bay information story 00000001 already established.
