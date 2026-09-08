# Story 00000067 — Three- and four-ship fleets

## Summary

Today a player chooses **five or six** ships before a game begins. This
story adds **four** and **three**, so the choice becomes **6, 5, 4 or 3** —
four options, like Rounds and Clock already have. **Six remains the standard
game** and stays the leftmost, default choice.

Smaller fleets make a different game rather than a shorter one. The board
still wants four nodes lit at once, so a three-ship side can never cover it:
every ship is committed somewhere, nothing is spare, and a ship pushed back
to a planet is a bigger loss than it is at six. Games get sparser, ships meet
each other more deliberately, and a single trapped ship matters far more.

What changes:

- **Two new fleet sizes**, three and four a side, with a starting layout
  each.
- **Four new starting squares** — C1, C15, M1 and M15 — used only by the
  four-a-side layout, taking the board's fixed starting squares from
  fourteen to eighteen.
- **The start screen's Ships group grows to four choices**: 6, 5, 4, 3.

## The layouts

Both new layouts follow the rule the existing ones already do: **each
player's fleet is the exact half-turn rotation of the other's**, so neither
side begins with better ground, and **the colours alternate around the
perimeter** as far as the geometry allows.

**Three a side (6 ships).**

| Edge   | Left to right / top to bottom |
| ------ | ----------------------------- |
| Top    | H15 green                     |
| Right  | O10 red, O6 green             |
| Bottom | H1 red                        |
| Left   | A10 red, A6 green             |

Green: H15, O6, A6. Red: O10, H1, A10.

Six ships around a ring of six starting squares alternate **perfectly** —
walking the perimeter, no two ships of the same colour ever stand next to
each other. Each side ends up with **one isolated ship and two facing the
opponent**: green's A6 sits four squares from red's A10 on the left edge and
green's O6 four from red's O10 on the right, while green's H15 stands alone
at the top with its nearest enemy seven squares away, and red's H1 alone at
the bottom.

```
     A B C D E F G H I J K L M N O
 15  . . . . . . . G . . . . . . .
 14  . . . . . P . . . . . . . . .
 13  . . . . . . . . . . . . . P .
 12  . P . . . . . . P . . . . . .
 11  . . . . . . . . . . . . . . .
 10  R . . . P . . . . . . P . . R
  9  . . . . . . . . . . . . . . .
  8  . . . . . . . . . . . . . . .
  7  . . . . . . . . . . . . . . .
  6  G . . P . . . . . . P . . . G
  5  . . . . . . . . . . . . . . .
  4  . . . . . . P . . . . . . P .
  3  . P . . . . . . . . . . . . .
  2  . . . . . . . . . P . . . . .
  1  . . . . . . . R . . . . . . .

G  green ship     R  red ship     P  planet
```

**Four a side (8 ships).**

| Edge   | Left to right / top to bottom |
| ------ | ----------------------------- |
| Top    | C15 green, M15 green          |
| Right  | O10 red, O6 green             |
| Bottom | C1 red, M1 red                |
| Left   | A10 red, A6 green             |

Green: C15, M15, O6, A6. Red: O10, M1, C1, A10.

Eight ships cannot alternate perfectly: with an even ring, the half-turn
rotation maps every square to one of the same parity, so a perfectly
alternating assignment would send each side onto itself rather than onto its
opponent. Four a side therefore alternates with **two breaks**, and it puts
them exactly where the current six-a-side layout puts its own — on the top
and bottom edges. **Green holds the whole top edge, red the whole bottom**,
and each side edge is split one apiece.

That leaves the same shape the three-a-side layout has, with the lone ship
at each end of the board replaced by a pair: green's A6 and O6 face red's
A10 and O10 four squares away down the side edges, while the four corner
ships — green's C15 and M15, red's C1 and M1 — start five squares from
their nearest enemy.

```
     A B C D E F G H I J K L M N O
 15  . . G . . . . . . . . . G . .
 14  . . . . . P . . . . . . . . .
 13  . . . . . . . . . . . . . P .
 12  . P . . . . . . P . . . . . .
 11  . . . . . . . . . . . . . . .
 10  R . . . P . . . . . . P . . R
  9  . . . . . . . . . . . . . . .
  8  . . . . . . . . . . . . . . .
  7  . . . . . . . . . . . . . . .
  6  G . . P . . . . . . P . . . G
  5  . . . . . . . . . . . . . . .
  4  . . . . . . P . . . . . . P .
  3  . P . . . . . . . . . . . . .
  2  . . . . . . . . . P . . . . .
  1  . . R . . . . . . . . . R . .

G  green ship     R  red ship     P  planet
```

Both diagrams show **twelve** planets, including `I12` — see the note at the
end of this story about the copy in section 3.1, which is missing it.

## New starting squares

The four-a-side layout uses **C1, C15, M1 and M15**, which are not among
today's fourteen starting squares. They are ordinary board squares — nothing
about them is special beyond a ship starting there — but they mean:

- Section 3.1's count becomes **eighteen** starting squares, not fourteen.
- Section 3.1's board diagram gains four `S` marks, on rows 1 and 15.
- The parenthetical "fleet size decides which of the fourteen are used"
  becomes eighteen.

They sit two columns further out than the existing D1/L1/D15/L15 squares,
which is what pushes the four-a-side start into the corners rather than
massing it in the middle of the top and bottom edges. No planet is affected,
and no node can ever appear on the outer edge (section 3.2, constraint 3),
so nothing else in the ruleset is disturbed by them.

## What does not change

- **Six is still the standard game** and still the default.
- **Five and six a side are untouched** — same squares, same colours.
- Everything else in the ruleset: nodes, energy, combat, movement, power,
  planets, the trap and its relief, rounds and the clock. A small fleet
  simply runs the same rules with less to spend.
- The most ships a side can ever have is still six, so nothing sized against
  that bound changes.

Two existing rules bite harder at three and four a side without needing any
change of their own: the relief that frees a side whose **every** ship is
trapped becomes reachable, and the double refuelling rate for a player's
**only** ship topping up on a planet becomes common. Both are working as
written; they are noted here only so they are not mistaken for bugs.

## Notes

- This is a gameplay change: `doc/ruleset/rules.md` needs a version bump, a
  `changelog.md` entry, and edits to section 1 ("a fleet of five or six
  ships"), section 3.1 (the count, the diagram and the caption) and section
  4 (the "five or six" opening sentence and two new layout tables).
- `README.md` says "or six ships" and lists the start-screen options as "six
  or five, six to start"; both need updating.
- **Fold in a fix to section 3.1's board diagram**, which is missing the
  planet at `I12` — it shows eleven `P` marks where the surrounding text says
  twelve and `src/rules/planets.ts` has twelve (`I12` is the half-turn
  rotation of `G4`). The code is right and the diagram is a transcription
  slip. This story edits that diagram anyway to add the four new `S` marks,
  so the missing planet goes in at the same time. It is a documentation
  correction, not a rules change, and needs no bump of its own beyond the
  one this story already makes.
- Per the project's pre-release stance, no accessibility work is owed by this
  story; anything lost is recorded in
  `doc/plan/00000021-accessibility-tech-debt/known-issues.md`.
