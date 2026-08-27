# Rules changelog

Every change to [rules.md](rules.md) bumps its version and gets an entry here,
newest first. A version bump is its own commit. Once merged to `main`, a
version that changes how the game is played is a candidate to be tagged
`rules-<version>` — so checking out `rules-0.1` would get you an app that
plays exactly the rules described by version 0.1 — but tagging is on hold
until the game plays (see the project's contribution notes).

## 0.10 — random bay return

- **A returning ship's bay is now drawn at random from the bays that are
  empty at that moment**, every empty bay equally likely, instead of walking
  a numbered ring that advanced one bay at the end of every turn. Section
  7.1 is rewritten accordingly.
- **Return position 1, its H15 starting point and the counter-clockwise
  drift are all removed.** There is no longer a numbered "next" bay to point
  to; the destination is unknowable until the fight happens.
- **Section 8.7's end-of-turn sequence drops from six steps to five.** Step
  6, which moved the return position one bay counter-clockwise, is deleted;
  steps 1 through 5 are unchanged.
- **Section 1's "one random element" becomes two**: which node site wakes up
  next, and which bay a beaten ship is pushed back to.
- **On a mutual return the attacker is still placed first, then the defender
  is drawn from the bays still empty.** This order makes no difference to
  the odds, but is kept deliberately, because fixing it is what lets a
  recorded game replay exactly.
- **Section 7 now spells out that the winner's advance cannot cross an
  occupied square.** If the beaten ship's random bay lands on the lane, it
  blocks the advance there and the winner stops short of it. The rule was
  always implied — bays block movement like any other square (section 3.1)
  — but it is worth stating plainly now that the random draw makes the case
  materially likelier than the old, predictable return position did.

This changes how the game is played — a beaten ship can no longer be tracked
to a predictable bay — so it would ordinarily be a tagging candidate, but
tagging is on hold until the game plays (see the project's contribution
notes), so no tag is made for this version.

## 0.9 — one action per turn

- **A turn is now one action, not two.** Section 2's definition of a turn and
  section 5's statement of the count both drop from two to one; a player
  still moves a ship or attacks with a ship, just once per turn instead of
  twice.
- **Section 5's two sentences about one action per ship are removed as
  redundant.** "A ship may take at most one action per turn" and "a turn's
  two actions therefore always involve two different ships" were both true
  and useful when a turn held two actions; with one action per turn they say
  nothing, so they are deleted rather than kept as dead text. The obligation
  to take the turn's action where one is available, and the passing rule for
  when none is, are otherwise unchanged.
- **Section 7.1's returning ship is placed "before anything else happens"**
  rather than "before the attacking player's second action" — the old
  wording no longer describes anything now that a turn has no second action.
  The placement itself, and the attacker-then-defender order on a mutual
  return, are unchanged.
- **Section 8.5's stranded obligation is restated generically.** The
  principle is unchanged — while any ship still owes an action, each action
  of the turn must free one — but the worked examples for two and three or more
  stranded ships are gone: a player frees as many stranded ships as their
  turn has actions, and the rest wait for a later turn. The waiver for a
  stranded ship with no legal move, and the tail-cost note, are unchanged.
- **Section 8.7's end-of-turn sequence** now says it runs in full for "a turn
  in which an action was taken", rather than "both actions were taken" — a
  wording fix to match the new count, not a change to the sequence itself.

This changes how the game is played, halving what a player can do in a turn,
so it would ordinarily be a tagging candidate — but tagging is on hold until
the game plays (see the project's contribution notes), so no tag is made for
this version.

## 0.8 — attack range, the winner's advance, and one action per ship

- **Section 7's attack range is now section 6's movement range.** A ship
  attacks exactly as far as it moves, over the same straight lines, with the
  same requirement that the path be clear. The old fixed range — any of the
  eight surrounding squares, diagonals included — is gone. At the two sharp
  ends: a 4-shield ship now reaches only its four orthogonal neighbours and
  cannot strike a diagonal at all, where before it struck all eight; a ship
  carrying no shields reaches three squares orthogonally and two diagonally,
  where before it reached only the eight adjacent squares. A 3-shield ship's
  range is unchanged either way — it is the fulcrum the old fixed range
  happened to match.
- **A winning attacker now advances onto the ground it won.** It moves along
  the line it attacked down, to the furthest square, working back from the
  square the loser has left, that it may legally end on under section 6's
  restriction (not a dormant site, not a depleted one) — ordinarily the
  loser's own square. If no square on the lane qualifies, the winner holds
  its ground, exactly as every winner did before this version. Only an
  **attacking** winner advances; a winning defender still holds its ground.
  A won fight can now take a node outright, in a single action, where it
  previously took a fight and a separate move.
- **Section 8.2 widens to cover the advance.** A site wakes when a ship
  touches it during a move or during a winning attacker's advance — the two
  are not distinguished, and a site the winner merely crosses on its way
  wakes just as one it lands on does.
- **A ship may take at most one action per turn.** Section 5 previously let a
  ship move and then attack, or attack twice, in the same turn. Once a won
  fight can also relocate the winner, either of those would let a single ship
  do far too much in one turn; a turn's two actions now always involve two
  different ships.
- **Three sentences elsewhere in the document are corrected to stay
  consistent with the above, without changing any rule of their own:**
  section 6's claim that a ship "never moves as a result of attacking" is
  replaced by a pointer to the advance; section 8.5's example of what a
  player may do with a ship it has just freed no longer names attacking with
  that same ship, since one action per ship rules it out; and section 4.1
  now says a shield takes away part of a ship's attack range as well as its
  movement, since the two are now the same number.

All three changes alter how the game is played, so this version would
ordinarily be a tagging candidate — but tagging is on hold until the game
plays (see the project's contribution notes), so no tag is made for this
version.

## 0.7 — energy, and a steeper payout curve

- **"Influence" is renamed "energy" throughout.** Every occurrence in section
  1's overview, section 8.1's description of a charged site, section 8.3's
  rationale for the nine-turn clock, section 8.4's heading and table, section
  8.7's step 2, and section 9. This is a wording change; it does not alter how
  the game is played.
- **Section 8.4's table now pays 0, 1, 3, 6, 10, 15 for 0 to 5 charged nodes
  held**, replacing the old 0, 1, 3, 5, 7, 9. The old table paid a flat two
  energy for every node held after the first; the new one pays a marginal 1,
  2, 3, 4, 5, so the fifth node a player holds is worth five times the first.
  Holding all five nodes at once now pays fifteen, against nine before, and a
  player pushed from three nodes to two loses three energy a turn rather than
  two. The intended consequence: concentration beats spread, and driving an
  enemy off a node and taking it with the turn's second action now moves the
  score by more than the shields it burned.

The table change alters how the game is played, so this version would
ordinarily be a tagging candidate — but tagging is on hold until the game
plays (see the project's contribution notes), so no tag is made for this
version.

## 0.6 — starting shields settled, and two ships always have somewhere to go

- **Appendix A item 1 is closed: every ship starts with 0 shields.** This is
  the owner's decision. The number in section 4 was already 0; only the
  "(TBD)" marking, the appendix's table and item, and the introduction's
  sentence pointing at undecided details are removed. Nothing about how the
  game is played changes — the starting shield count is unchanged. Appendix A
  keeps its heading, now carrying a single line saying nothing is currently
  outstanding, so Appendix B keeps its number and every cross-reference to it
  (section 8.7, and earlier planning documents) still resolves.
- **Section 7.1's "there is always somewhere to go" now covers the mutual
  return too.** The paragraph already argued that a single returning ship
  always finds an empty bay, because it was by definition on the board and
  not in a bay. The case immediately above it in the document — two ships
  returning from one fight — is the same argument applied twice: both were
  off-bay, so at least two bays are empty. This is a restatement of an
  argument the section already made, not a new rule, and changes nothing
  about how the game is played.

Neither change here is a tagging candidate — nothing about how the game is
played is different before and after this version — and tagging is on hold
until the game plays in any case (see the project's contribution notes).

## 0.5 — the freeing move is the first action, and a passed turn is still a turn

- **Section 8.5 now says which action clears a stranded ship: the first.**
  While any ship still owes an action, each action in turn must free one, and
  only once none remain does the rest of the turn belong to the player. The
  previous wording said only that an action was owed, which left open a
  reading where the obligation could be put off to the turn's last action —
  a turn that stays free right up until it suddenly is not. The consequences
  are unchanged: one stranded ship frees the rest of the turn, two claim both
  actions, and three or more mean the player clears two of their choice and
  the rest wait. This changes how the game is played, so it would ordinarily
  be a tagging candidate, but tagging is on hold until the game plays (see the
  project's contribution notes), so no tag is made for this version.
- **Section 8.7 now says plainly that a passed turn still runs the full
  end-of-turn sequence.** A turn that passes because no legal action was
  available (section 5) is followed by the clocks ticking and, for a ship of
  the passing player standing on a charged node, its shield. The end-of-turn
  sequence arrived with this same version and was written this way from the
  start, but section 8.7 described only the order of its steps and never said
  which turns it runs for. This bullet states that in writing; it does not
  change how the game is played.

## 0.4 — a ship on a dormant site is stranded too

- **Section 8.5 now strands a ship on a dormant site on the same terms as one
  on a depleted site.** A node that runs out under a ship goes depleted, and
  nine turns later — if the ship still has not moved — cools down to dormant
  underneath it. Section 6 forbids ending a move on either state, so the ship
  is equally stuck in both, and now owes an action in both. This changes how
  the game is played, so it would ordinarily be a tagging candidate, but
  tagging is on hold until the game plays (see the project's contribution
  notes), so no tag is made for this version.

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
