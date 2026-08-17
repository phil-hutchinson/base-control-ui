# Rules changelog

Every change to [rules.md](rules.md) bumps its version and gets an entry here,
newest first. A version bump is its own commit, and once merged to `main` that
commit is tagged `rules-<version>` — so checking out `rules-0.1` gets you an
app that plays exactly the rules described by version 0.1.

## 0.3 — fixed two cross-references in section 4.1

- **Section 4.1's cross-references were inverted.** It cited "section 6" for
  who wins a fight and "section 5" for movement; the correct sections are 7
  (Combat) and 6 (Movement). Both citations are corrected. This changes
  nothing about how the game is played.

## 0.2 — site positions settled

Closes Appendix A item 1.

- **The seventeen site positions are fixed**, listed in section 3.2 along with
  a board diagram showing bays and sites together. The layout is a mirror
  image across column H and across row 8 (so a 180° rotation also maps it onto
  itself), but deliberately not symmetric across the diagonals, for the same
  reason the fourteen bays cannot be either.
- **The four site states are renamed**: sleeping → dormant, awake → active,
  live → charged, spent → depleted. The rename is applied everywhere the old
  words named a state; verb forms such as "wakes" are unchanged.
- **The starting position is stated for the first time**: five sites are
  active at the start of the game — H8, E5, K5, E11 and K11 — and the other
  twelve are dormant. Nothing is charged or depleted at the start.
- **The spacing constraint in section 3.2 is relaxed.** It previously required
  a gap of at least 4 squares orthogonally and 3 diagonally, one square
  stricter than its own stated purpose on both axes, because it counted the
  square a move starts from — a square a ship can only ever be standing on
  when it is already charged or depleted, and so can never be woken by that
  move. The constraint is restated as the property it exists to guarantee (no
  single legal move may touch two sites), with the numbers — now 3 and 2 —
  kept only as a derived note tied to section 6's current movement ranges.
- **Appendix A item 1 (site positions) is closed and removed.** The remaining
  item, starting shields, is renumbered from 2 to 1.
- **Appendix B's arithmetic is refreshed** for a pool of seventeen sites,
  leaving about seven dormant at any moment, and no longer claims a guard test
  that does not yet exist.

## 0.1 — first written ruleset

The initial ruleset: 15 x 15 board, fourteen bays, five live nodes drawn from a
fixed pool of sites, seven ships a side, two actions per turn, shields trading
strength against speed, and a 100-round game decided on influence.

Two items are deliberately left open (rules.md, Appendix A): site positions and
starting shields. Both wait on having a board on screen to judge them against.
