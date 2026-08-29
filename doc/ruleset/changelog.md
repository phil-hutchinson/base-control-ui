# Rules changelog

Every change to [rules.md](rules.md) bumps its version and gets an entry here,
newest first. A version bump is its own commit. Once merged to `main`, a
version that changes how the game is played is a candidate to be tagged
`rules-<version>` — so checking out `rules-0.1` would get you an app that
plays exactly the rules described by version 0.1 — but tagging is on hold
until the game plays (see the project's contribution notes).

## 0.14 — dormant sites cost energy and a shield

- **Section 4.1 gains the mirror of the shield gain.** A ship standing on a
  node still gains a shield at the end of its owner's turn; a ship standing
  on a **dormant** site now **loses** one, down to the minimum of 0. An
  active site does neither.
- **Section 8.4 becomes collection and penalty.** The section keeps its
  table (0, 1, 3, 6, 10, 15) and its number, but now prices both directions:
  a player collects for the charged nodes they hold and then pays for the
  dormant sites they occupy, in that order and **not netted** — three
  charged nodes and two dormant sites pay 6 and cost 3, for +3, not the +1 a
  net count of one node would have paid.
- **The dormant count is capped at five.** Unlike charged nodes, which the
  board never lets exceed five, dormant sites have no such ceiling; the
  penalty counts at most five of them, so six or seven cost the same 15
  that five do, and the most a turn can cost is exactly the most it can
  pay.
- **A player's energy never falls below zero.** Where a turn's penalty
  exceeds the energy the player has, their total lands on 0.
- **Section 8.1's dormant state stops being merely inert.** It now costs
  the player whose ship stands on it, in energy (section 8.4) and a shield
  (section 4.1); active is unchanged — eligible to be charged, producing
  nothing, and costing nothing.
- **Section 8.5 stops saying dormancy is free.** An active site pays
  nothing and costs nothing; a dormant site pays nothing and now costs. A
  node that falls quiet under its holder starts costing the holder from the
  end of their next turn unless they leave.
- **Section 8.6's steps 1 and 2 take the new work.** Step 1 also loses a
  shield from each of the moving player's ships on a dormant site; step 2
  also pays the penalty after the collection. No step is added and no step
  moves.
- **Section 8.6's step 3 states the consequence.** A ship left standing on a
  node that runs out keeps standing there and collecting nothing, as
  before, and now also pays for it from the end of its owner's next turn
  (section 8.4).

## 0.13 — ships may stay on any site

- **A move may end anywhere a ship can reach.** Section 6's closing
  restriction — a ship may not end a move on a site that is not charged — is
  deleted outright. Reach, a clear path and an empty destination square are
  now the whole of the restriction on where a move ends.
- **Stranding is deleted, and the word leaves the document.** A ship left
  standing on a site that is not charged used to owe its owner an action, on
  pain of every other action being refused until it moved clear. That
  obligation, and the "stranded" state it created, is gone: a ship may stand
  on an active or a dormant site for as long as its owner likes, and its
  owner is free to take any action at all on a later turn.
- **A site can charge underneath a ship.** Section 8.2 says plainly what was
  already true of the draw and newly reachable now that a ship may camp on
  an active site: the charge draw does not look at occupancy, so a site with
  a ship standing on it can be charged, and that ship is holding a node from
  that moment — it collects and starts gaining shields at the end of its
  owner's next turn, exactly as if it had moved onto a node.
- **A winning attacker's advance is limited by ships alone.** Section 7's
  advance used to skip a candidate square whose site was not charged; that
  exclusion is deleted, so the attacker takes the loser's square — the
  ordinary case — even when that square is not charged. An occupied square,
  including the beaten ship's own return bay landing on the lane, still
  stops the advance exactly as before.
- **Section 8.5 keeps its number but changes its subject.** It no longer
  forbids standing on a site that is not charged or describes the
  obligation that followed; it now states plainly that standing on such a
  site is allowed, ordinary, pays nothing, and that a node running out under
  its holder simply stops paying rather than costing the holder a later
  action.
- **Section 8.1's three site states stop describing where a ship may
  stop.** Active, charged and dormant now differ only in what they produce
  and whether they are eligible for the charge draw.
- **Section 8.3 and section 8.6's step 3 drop their stranding clauses.** A
  node that reaches capacity still goes dormant; a ship standing on it
  simply stays there, collecting nothing.

## 0.12 — variable node durations

- **A node's fixed nine-turn life is replaced by capacity and drain.** A
  charged node now has a **capacity** of 60 units and a **drain** that starts
  at 0 and rises at the end of every turn by an amount drawn at random: 1
  (20%), 2 (50%) or 3 (30%) while the node stands empty, and 3 (10%), 4
  (40%), 5 (30%) or 6 (20%) while a ship — either side's — is standing on it.
  When drain reaches or passes capacity the node is spent and goes dormant,
  stranding any ship left on it exactly as the nine-turn clock did (section
  8.3).
- **A dormant site's fixed nine-turn cooldown is replaced by recovery.** It
  goes dormant carrying whatever drain it had, and at the end of every turn
  subtracts an amount drawn at random — 4 (10%), 5 (25%), 6 (30%), 7 (25%) or
  8 (10%) — going active at 1 pressure once it reaches zero or below. A node
  ended early comes back sooner, in proportion to how much of it was left
  (section 8.2).
- **Active sites now carry pressure**, and the end-of-turn charge draw is
  weighted by it instead of uniform. A site goes active at 1 pressure and
  gains 1 for every turn it stays active, capped at 50; each active site's
  chance of being drawn is its pressure as a share of the total pressure of
  all active sites, so a site that has waited a long time is likelier to be
  picked than one that has just cycled, and pressure never below 1 means no
  site can ever be excluded outright (section 8.2).
- **The opening five nodes lose their stagger.** The lockstep the stagger
  guarded against can no longer form, because the five now drain at
  independently drawn rates, are reached by ships at different turns, and
  can be ended early — so all five now start at drain 0, and the staggered
  table and the paragraphs justifying it are deleted (section 8.1).
- **Leaving a node ends it (new section 8.7).** A charged node that is
  occupied goes dormant the moment it becomes unoccupied — immediately, as
  part of resolving the action, not at the end of the turn — and carries its
  drain into dormancy. A ship that moves off a node, is pushed off one after
  losing a fight it started, or is on either side of a drawn fight, ends the
  node it was standing on. An attacker whose advance is blocked by the
  beaten ship's own return bay does the same to the node it was attacking
  into.
- **Taking a node in a fight does not end it.** A beaten defender is
  replaced by the advancing attacker in the same resolution, so the node is
  never unoccupied and keeps its drain untouched — a node changes hands
  intact (section 7, section 8.7).
- **Section 8.6's end-of-turn order grows from five steps to six**, to make
  room for the drain draw and pressure: (1) shields, (2) energy, (3) drain,
  now with the capacity check, (4) the charge draw, now weighted by
  pressure, (5) pressure gained by every site still active, (6) recovery,
  now with the random amount, for sites dormant before the turn began. Step
  6 stays last so a recovered site is active for the whole of the following
  turn before it is first eligible in a draw; step 5 sits after the draw so
  a site is drawn at the pressure it held all turn.
- **Section 8.5's "nodes charged together run out together" is withdrawn.**
  Nodes now drain at independently drawn rates, so a player holding several
  of them pays for them one at a time as each runs out under its own ship,
  rather than all at once.
- **Section 1's random elements go from two to three**: which site is
  charged next, which bay a beaten ship is pushed back to, and now how fast
  a node burns. Section 2 gains **capacity**, **drain** and **pressure** as
  words used in these rules.
- **Appendix B is redone around the pressure cap.** With a mixed life of
  roughly twenty turns, the board charges a site about every four turns,
  dormancy runs about ten turns, and about nine or ten of the seventeen
  sites are active at any moment. What is now worth checking when these
  numbers are retuned is the pressure cap against the average wait between
  cycles, not the raw pool size.
- Every number in this version — the capacity of 60, the pressure cap of 50,
  and all three distributions — is a first guess to be play-tested and
  retuned.
- Section 8.3 drops the assurance that a node appears at the same moment for
  both players and neither is closer to it in time than the other; it is
  redundant with the symmetry the rest of section 8 already states.

This changes how the game is played — a node's life is now variable instead
of fixed, leaving a node ends it, and the charge draw is weighted instead of
uniform — so it would ordinarily be a tagging candidate, but tagging is on
hold until the game plays (see the project's contribution notes), so no tag
is made for this version.

## 0.11 — three node states

- **A site now has three states instead of four**, and the mapping is not a
  simple rename: **depleted** is renamed **dormant**; today's **dormant**
  ("not in play") and **active** ("in play, but nothing has reached it yet")
  merge into a single new **active**, since waking on touch no longer exists
  to tell them apart; **charged** keeps its name and its meaning. The cycle
  becomes active → charged → dormant → active.
- **Waking a node is deleted outright (old section 8.2).** Nothing a ship
  does — landing on a site, flying over it, or a winning attacker advancing
  across it — changes that site's state any more. Every cross-reference to
  waking is removed with it, including section 7's note that a winner's
  advance counts its crossed squares as touched.
- **A site is charged by the board, not by a ship.** At the end of every
  turn, as many active sites as it takes to bring the charged count back to
  **five** are chosen at random, one at a time, each equally likely (the new
  section 8.2, "Charging a site", replacing old section 8.6's replacement
  draw). If there are not enough active sites, fewer are charged and the
  board runs below five until the next turn.
- **"Exactly five sites are active or charged" becomes a target, not an
  invariant.** The board aims for five charged sites and may fall short;
  charged nodes keep running out on schedule regardless of whether the board
  is at its target.
- **A node's clock now starts when the board charges it, not when a ship
  wakes it.** Section 8.3 is rewritten around the new start: a site charged
  at the end of turn N is charged for turns N+1 to N+9. Both players are now
  the same distance from a new node in time, so the paragraph about the
  clock belonging to whoever woke the node is deleted along with it.
- **The opening five nodes are staggered.** The game still starts with H8,
  E5, K5, E11 and K11 charged and the other twelve active, but their clocks
  are no longer aligned: they run out at the ends of turns 2, 4, 5, 7 and 9
  respectively, so the board's replacements spread out from the first turn
  instead of all arriving in lockstep.
- **Section 8.5's "a site that wakes underneath a ship becomes charged
  immediately" is deleted.** Charging no longer needs a waker, so an
  occupied active site is charged exactly like any other, and a stranded
  ship that finds its site charged under it is simply lucky.
- **The empty-pool safety net is deleted**, along with Appendix B's
  reference to it. The old rule that the longest-depleted site goes back to
  dormant first existed to guarantee a replacement was always available;
  that guarantee is withdrawn, so running short is now a legal outcome
  rather than a failure the app must prevent.
- **Section 3.2's spacing property is recorded as withdrawn, not removed.**
  "No single legal move touches two or more sites" existed so that one move
  could never charge two nodes at once; nothing charges on touch any more,
  so the property no longer binds. The seventeen site positions are
  unchanged and still happen to satisfy it.
- **Section 8's sections are renumbered to close the gap left by deleting
  old section 8.2.** The rewritten "Charging a site" (old section 8.6) moves
  up into the vacated 8.2 slot, and old section 8.7 ("End-of-turn order")
  becomes section 8.6. Sections 8.3, 8.4 and 8.5 keep their numbers.

This changes how the game is played — nodes now appear on their own instead
of being triggered by ships, and the five-active-or-charged invariant becomes
a target the board can fall short of — so it would ordinarily be a tagging
candidate, but tagging is on hold until the game plays (see the project's
contribution notes), so no tag is made for this version.

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
