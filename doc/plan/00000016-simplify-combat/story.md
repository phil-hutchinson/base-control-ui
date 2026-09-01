# Story 00000016 — Simplify combat

## Summary

Combat stops being a special case. Today §7 gives every ship the same fixed
attack range — the eight surrounding squares — regardless of shields, and
ends a fight with the winner standing exactly where it started. Both of those
are rules the player has to hold separately from everything else they know
about how a ship moves. This story removes them.

Two changes do it:

- **A ship attacks with its movement range.** §6's per-shield table now
  governs attacks as well as moves, path and all. A 4-shield ship strikes one
  square orthogonally; an unshielded one strikes three.
- **A winner takes the ground.** An attacker that wins advances onto the
  square its victim left, instead of holding its own.

A third change falls out of the second and was settled with the owner while
this story was being written: **a ship may take at most one action per turn**.
§5 currently lets a ship attack twice, or move and then attack; once winning a
fight also relocates the winner, that permission lets a single ship do far too
much in one turn. One action per ship is both the simpler rule and the one
that keeps the turn readable.

The effect on play is that shields stop being a purely defensive investment
with a free offensive rider. A heavily shielded ship is now slow **and**
short-ranged, and it can no longer strike diagonally at all. A stripped-down
ship is fast, long-ranged, and — because a winner advances — able to convert a
fight straight into a node. That is the tension §4.1 always claimed to create,
finally applied to both halves of what a ship does.

### A note on words

This is a planning document, so it says **ply** for what the rules and the UI
call a **turn**, and **hub** for what the player sees as a **node**
(CLAUDE.md, Vocabulary). **Action** and **round** are the same word
everywhere. **Move** means one ship changing squares under §6 and never means
a ply — which matters more than usual here, because this story introduces a
second way for a ship to change squares that is deliberately _not_ a move.
That one is called the **advance** throughout.

## Background & references

The rules are owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.7**.
This story begins with a rules edit that takes it to **0.8** (see In scope
item 1). The sections it changes are **§5** (turns and actions), **§7**
(combat) and **§8.2** (waking a node); the sections it depends on and does not
change are **§6** (movement), **§3.1** (bays), **§7.1** (returning to a bay)
and **§8.5** (depleted and dormant sites).

### What §7 says today

Three sentences of it are about to go:

- "A ship may attack an enemy ship standing next to it — any of the eight
  surrounding squares, diagonals included."
- "An attack reaches further than a heavily shielded ship can move. A ship
  with 4 shields can only step one square orthogonally, but it can still
  strike any of the eight squares around it."
- "**Neither ship moves.** The winner holds its ground — it does not advance
  onto the square the loser has left, and that square is simply empty
  afterwards. Winning a fight clears ground; it does not take it."

And the closing paragraph — "because the winner stays put, driving an enemy
off a hub does not put you on it. Claiming the square takes a second
action" — becomes exactly wrong and has to be rewritten to say the opposite.

What §7 keeps, untouched: the ship with more shields wins; the winner pays
`loser + 1` shields; the loser goes to a bay at 0 shields under §7.1; equal
shields send **both** ships to bays and leave both squares empty; neither ship
may be in a bay.

### What is already in place

Everything this story needs to attach to exists, and most of it needs only to
be pointed at a different function:

- `src/rules/moveLegality.ts` owns §6. `reachFrom(origin, shields)` returns
  the §6 table as `ReachEntry` values — a `destination` and the `passedOver`
  squares in order, excluding origin and destination. That is precisely the
  shape an attack now needs, and it already returns the lane rather than just
  the endpoint, which is what makes the winner's advance cheap to implement.
- `src/rules/combat.ts` owns §7. Its `ADJACENT_OFFSETS` / `adjacentSquares`
  pair is the fixed eight-neighbour range, and its own header comment says
  the range is "deliberately written out rather than derived from
  `reachFrom`". This story inverts that comment: the coupling it warns
  against is now the rule.
- `src/rules/ply.ts` owns `applyAttack`, which resolves the fight, places the
  loser with `receptacleBay`, and calls `assertFightInvariants` — which
  currently asserts that no ship except a returning one changed square, and
  that no site state changed. Both assertions are about to become false.
- `applyMove` in the same module already does the thing `applyAttack` is
  about to need: it moves a ship along a path and calls `wakeTouchedSites`
  (§8.2) with that path.
- `src/rules/stranded.ts`, `src/rules/actions.ts`, `src/game/session.ts` and
  `src/board/Board.tsx` all read `state.movedThisPly`, which becomes
  `actedThisPly`.
- `src/board/announcements.ts` owns every player-facing sentence, including
  the fight sentence and the refusal wording, and is unit-tested away from
  the DOM.

### Change one: attack range comes from the movement table

§6's table, now governing attacks as well:

| Shields | Attack range                               |
| ------- | ------------------------------------------ |
| 4       | one square orthogonally                    |
| 3       | the above, plus one square diagonally      |
| 2       | the above, plus two squares orthogonally   |
| 1       | the above, plus two squares diagonally     |
| 0       | the above, plus three squares orthogonally |

**Three shields is the fulcrum.** A 3-shield ship reaches one square
orthogonally and one diagonally — exactly the eight squares every ship
reaches today. So a 3-shield ship's attack range is unchanged by this story;
everything above it loses range and everything below it gains.

The loss at the top is the sharp end. A 4-shield ship can attack only its four
orthogonal neighbours; it **cannot attack diagonally at all**. Today it
strikes all eight. The gain at the bottom is just as large: an unshielded ship
goes from eight squares to twenty, and can open a fight from three squares
away down a rank or file.

**The path must be clear**, on the same terms §6 sets for a move: every square
the attack passes over must be empty, of either side's ships. This is what
"the same movement ability" means taken literally, and it is also what
guarantees the winner has an empty lane to advance down. A ship two squares
away with a friendly ship between is out of reach, exactly as it would be for
a move.

Two things about the target square are **not** inherited from §6, because they
are about ending a move and an attack does not end there:

- The target square is of course occupied — by the enemy ship. §6's
  `destination-occupied` has no analogue.
- The target's site state is irrelevant. A ship stranded on a depleted site
  (§8.5) can still be attacked. What changes is where the winner ends up; see
  below.

Bays are unchanged: §3.1 still says a ship in a bay cannot attack and cannot
be attacked, and that check stays where it is.

### Change two: the winner advances

**Only an attacking winner advances.** This was the owner's decision, and it
is worth recording why, because the symmetric rule is the tempting one. If a
defending winner also advanced, a 4-shield ship that is attacked from three
squares away and wins would be dragged all three — a displacement it could
never have made itself, on a turn that was not its own. Keeping the advance
to the attacker makes it a reward for choosing the fight.

So:

- **Attacker won** — the attacker advances (below). This is the only new
  behaviour in the story.
- **Defender won** — nothing new. The defender holds its ground, the attacker
  goes to a bay at 0 shields. Unchanged from today.
- **Equal shields** — nothing new. Both ships go to bays under §7.1,
  attacker placed first, and both squares are left empty. Unchanged from
  today.

#### Where the winner lands

The **lane** is the straight line the attack travelled: the attacker's square,
the `passedOver` squares in order, and the target's square. It is the same
`ReachEntry` the attack's legality was judged against, which is why the plan
should carry that value forward rather than recompute it.

The loser is placed in its bay first, as §7.1 already requires ("placed
immediately, as part of resolving the fight"). Its square is now empty, and so
is every square between — the path was clear when the attack was judged, and
nothing has moved since. So the only thing that can stop the winner is a
square it may not stand on.

The rule, one sentence: **the winner advances to the furthest square along the
lane, working back from the loser's square, that it may legally end on; if
there is none, it holds its ground.**

"May legally end on" means §6's restriction and nothing else: not a dormant
site, not a depleted site. Worked through:

```
A = the attacker, and the winner    L = the ship it beat, already bay-bound
. = an empty square                 ^ = a dormant or depleted site

attacked from three squares away, the loser standing on a dead site
    A . . L    ->    . . A .
          ^                ^

... and the square in front of it is dead as well
    A . . L    ->    . A . .
        ^ ^            ^ ^

... attacked from next door: nowhere to go, so the winner holds its ground
    A L        ->    A .
      ^                ^
```

In the overwhelmingly common case — the loser's square is empty ground, or an
active or charged site — the winner simply lands on it, which is the whole
point of the change.

#### The winner can never land in a bay

Worth stating because it removes a case the plan would otherwise have to
handle. §3.1 costs a ship all its shields for ending a move in a bay, and it
would be genuinely unclear whether an advance should pay that. It never comes
up.

The winner stops short of the loser's square only when that square is a
**site**, and §3.2 puts every site in the interior of the board — never on the
outer edge, where every bay is. A straight lane whose far endpoint is off the
edge can meet the edge in at most one square, and that square is the lane's
near endpoint: the attacker's own. So no square the winner can stop short on
is ever a bay. And when the winner does not stop short it lands on the loser's
square, which is not a bay either, because §3.1 forbids attacking a ship in
one.

The plan should encode this as an assertion in `applyAttack`, in the same
spirit as `receptacleBay`'s "no empty bay" throw: a bug detector on a case the
rules say cannot happen, not a branch.

#### The advance wakes nodes

§8.2 currently reads: a site becomes charged "the moment a ship touches it —
either by landing on it or by flying over it **during a move**". The advance
is not a move, so the document has to say whether it counts.

It counts. §8.2's principle is physical contact — it goes out of its way to
say it does not matter whose ship, and that the ship need not stop. A ship
that slides two squares up a rank has touched what it slid over regardless of
which rule put it in motion, and an exception would be a fourth thing about
combat for the player to remember, in a story whose subject is removing three.
So §8.2's wording widens from "during a move" to cover both, and
`applyAttack` calls `wakeTouchedSites` with the advance's path exactly as
`applyMove` already does with a move's.

The whole path, not just its end: an active site the winner **passes over** on
its way to its final square wakes, exactly as it would under a move. So does
one it lands on. The two are not distinguished, because §8.2 does not
distinguish them.

Note what this makes possible, which is the change's real payoff: a winner
that advances onto an **active** site wakes it, is standing on a charged node
by the end of the action, and collects §8.4 energy and a §4.1 shield when the
turn ends. Taking a node used to cost a fight plus a move — the whole turn.
Now it costs one action.

**A fight the attacker does not win wakes nothing.** This needs no rule of its
own and no code: waking is a consequence of a ship travelling, and in the
other two outcomes no ship travels. On a defender win the defender holds its
ground and the attacker is _placed_ in a bay under §7.1 — placement is not
travel, it crosses no squares, and it has never woken anything. The mutual
return is the same twice over. So the advance is the single new way a site can
wake, and `wakeTouchedSites` is called from exactly one branch of
`applyAttack`.

**§3.2's spacing property is unaffected.** It requires that no single legal
move touch two sites, and derives "three apart orthogonally, two apart
diagonally" from §6's ranges. The advance travels a sub-segment of a lane with
exactly §6's geometry, so it touches no more sites than a move of the same
shape would. The ranges in §6 themselves do not change in this story, so the
derived numbers do not need recomputing and `siteSpacing.test.ts` keeps its
assertion.

### Change three: one action per ship

§5 today: "A ship may be moved **at most once per turn**. There is no other
restriction: a player may move two different ships, move a ship and attack
with it (in either order), attack with two different ships, or attack twice
with the same ship."

That becomes: **a ship may take at most one action per turn.** A player's two
actions therefore always involve two different ships.

This is a real gameplay change and not merely bookkeeping. Combined with the
advance it stops a single ship from winning a fight, relocating, and then
either moving again or fighting again — which under the new range table an
unshielded ship could otherwise do across half the board in one turn.

In the code this is a rename with teeth: `GameState.movedThisPly` becomes
`actedThisPly`, and — the part a rename alone would miss — **attacks start
recording into it**. `applyEndOfActionTail` currently takes the ship id only
for moves; it now takes it for both.

### Consequences worth naming

Three things fall out of the changes that a reader of the diff should not have
to rediscover.

**The pass guard's inputs get stricter.** `sevenOnlyAttackRefusalReason` has
no "already acted" check today, because it never needed one. It needs one now,
and it must go in the **seven-only** layer, not just the public one: that
layer is what `sideToMoveHasLegalAction` asks, and without the check the pass
guard would believe an action exists for a ship that has already spent its
turn. This is the same seven-only/public split story 12 leaned on for
game-over, used the other way round — game-over stays out of the seven-only
layer, already-acted goes in.

**`assertFightInvariants` has to be rewritten, not relaxed.** Both of its
current claims — that only returning ships change square, and that
`siteStates` is untouched — are now false by design, and its error messages
quote the rule that is being deleted. The plan should replace them with the
invariants that _are_ now true: the ships that may change square are the
loser (to a bay) and the attacking winner (to a square on its own lane), and
site states may change only by §8.2 firing along the advance. Deleting the
assertions rather than restating them would lose a genuine safety net over the
story's most intricate code.

**An attack could now free a stranded ship, and §8.5 still says it may
not.** §8.5 requires a stranded ship's owner to spend an action "moving it
clear", and `attackRefusalReason` accordingly refuses every attack while any
ship owes an action — on the stated grounds that "a move can free a stranded
ship, but an attack never does". Under this story an attack sometimes does:
a stranded ship that attacks and wins advances off the dead site. §8.5 is
**not being changed here** — its wording is explicit that the freeing action
is a move, the owner asked for combat changes and not for §8.5 changes, and
the interaction is worth living with for a while before it is legislated on.
But the comment in `combat.ts` that gives "an attack never does" as the reason
is now inaccurate and must be reworded to cite §8.5's requirement itself. See
Out of scope.

## In scope

### 1. The rules edit (first, before anything implements it)

`doc/ruleset/rules.md` goes to **version 0.8**:

- **§5** — "may be moved at most once per turn" becomes "may take at most one
  action per turn", and the sentence enumerating the permitted combinations
  is replaced by one saying the two actions always involve two different
  ships. The paragraph arguing a deadlock can never happen in practice should
  be softened rather than deleted: its grounds were that attacking is always
  available, and attacking is now range-limited, so it should stop claiming
  the case never arises while keeping the rule that covers it.
- **§7** — the opening sentence's "any of the eight surrounding squares"
  becomes the §6 range, with the table restated or cross-referenced and the
  clear-path requirement stated explicitly. The "an attack reaches further
  than a heavily shielded ship can move" paragraph is deleted. "Neither ship
  moves" is replaced by the winner's advance, including the stop-short rule
  and the fact that only an attacking winner advances. The closing paragraph
  about the winner staying put is rewritten to say what now follows instead:
  that a won fight can take a node outright, and that heavy shields buy
  strength at the cost of reach.
- **§8.2** — "by flying over it during a move" widens to cover the winner's
  advance.
- **§7.1, §7.2, §3.1, §6, §8.4, §8.5, §9 are unchanged.** In particular the
  draw is unchanged, the shield cost of winning is unchanged, and the loser's
  return is unchanged.

`doc/ruleset/changelog.md` gets a 0.8 entry. All three changes alter how the
game is played, so this version would be a tagging candidate — but tagging is
on hold until the game plays, so no tag is made, and the entry says so in the
form the earlier entries use. `RULES_VERSION` in `src/rules/rulesVersion.ts`
goes to `"0.8"` in the same commit, which its existing test checks against the
document.

`README.md`'s rules summary says "No ship moves twice in the same turn, though
a ship that has already moved can still attack" and describes the fight; both
become wrong at this commit and are updated in it, so the repository never
holds a README that contradicts the ruleset.

### 2. Attack range from the movement table

In `src/rules/combat.ts`:

- `ADJACENT_OFFSETS` and `adjacentSquares` are deleted. Nothing outside
  `combat.ts` and its test uses them.
- The range comes from `reachFrom(attacker.square, attacker.shields)`, and
  the module's header comment — which currently explains at length why the
  range is _not_ derived from `reachFrom` — is rewritten to explain that it
  now is.
- `sevenOnlyAttackRefusalReason` judges the target against that reach and its
  path. `"target-not-adjacent"` becomes `"target-out-of-range"`, and a new
  `"attack-path-blocked"` covers an occupied square in between. The existing
  order of checks — ownership, attacker's bay, then everything about the
  target — is kept, with range and path last.
- `sevenOnlyAttackRefusalReason` also gains the already-acted check described
  above, sharing `"ship-already-acted"` with moves.
- `sevenOnlyLegalTargets` enumerates the reach rather than the eight
  neighbours.

The lane the legality check found should be available to `applyAttack`
rather than recomputed there from scratch; the plan decides the shape (see
Open items).

### 3. The winner's advance

In `src/rules/ply.ts`'s `applyAttack`, in the `attacker-won` branch only:

- After the loser is placed in its bay, the attacker advances to the furthest
  legal square on the lane, or holds ground.
- The squares the advance touches are passed to `wakeTouchedSites`, and its
  effects are appended, exactly as `applyMove` does.
- The `fight-resolved` effect grows to carry where the winner ended up — the
  square, and whether it advanced at all — so `announcements.ts` can say so
  and the board can draw it. A winner that holds its ground must be
  distinguishable from one that advanced onto the loser's square, because
  those read as different events to a player.
- `assertFightInvariants` is rewritten per "Consequences worth naming",
  including the assertion that the winner's square is never a bay.

The `defender-won` and `mutual-return` branches are not touched.

### 4. One action per ship

- `GameState.movedThisPly` → `actedThisPly`, and `MoveRefusalReason`'s
  `"ship-already-moved"` → `"ship-already-acted"`.
- `applyEndOfActionTail` records the acting ship for an attack as well as a
  move; `applyAttack` passes the attacker's id. `applyMove` is unchanged
  beyond the rename.
- `src/rules/stranded.ts`, `src/rules/actions.ts`, `src/rules/movement.ts`
  and `src/rules/moveLegality.ts` follow the rename.
- `src/game/session.ts`'s `isSelectable` currently carries a comment saying
  it was "widened from 'has not moved this ply' so a ship that has moved and
  can still attack (rules.md §5) is selectable too". That widening is exactly
  what §5 no longer permits; the function and its comment simplify.
- `src/board/Board.tsx` follows the rename for whatever it draws from the
  field.

### 5. Wording

In `src/board/announcements.ts`:

- The refusal sentence for the old `"target-not-adjacent"` — "An attack
  reaches only the eight squares around a ship" — is replaced by one for
  `"target-out-of-range"` that tells the player the truth: attack range is
  the ship's movement range, and shields shorten it. A sentence for
  `"attack-path-blocked"` joins it.
- `"ship-already-acted"` gets wording covering both actions, since a player
  can now hit it by trying to move a ship that attacked.
- `fightSentence` reports the advance: where the winner ended up, and the
  fact that it took the square. A winner that held its ground says so. The
  existing sentences for the mutual return and the losing attacker are
  unchanged apart from anything the effect's new shape forces.

Every one of these is composed in `announcements.ts` and unit-tested there,
as all player-facing wording in this app already is.

### 6. What the board shows

The board already highlights legal targets from `legalTargets`, so a longer
range needs no new mechanism — the highlights simply appear further away.
Beyond following the rename, the board is expected to need no change. If the
plan finds that target highlighting reads ambiguously at range — a highlight
three squares off is less obviously "attack this" than one next door — that
is worth a note, but this story does not commit to new board visuals.

## Design decisions & constraints

- **Only an attacking winner advances.** Owner's decision; the symmetric rule
  would drag a defender further than it could ever move itself, on someone
  else's turn.
- **The advance is not a move.** It does not consult §6's legality beyond the
  dormant/depleted restriction, it is not subject to §3.1's bay penalty
  (which it can never trigger anyway), and it does not need its own entry in
  `actedThisPly` because the attack that caused it already spent the ship's
  action. Keeping the two words distinct is why this document calls it the
  advance throughout.
- **The stop-short rule is one rule, not three cases.** "The furthest square
  on the lane it may legally end on" covers the adjacent attack, the
  three-square attack, and a lane whose in-between square is itself dead,
  without enumerating any of them. The plan should implement it as the single
  backwards scan it is.
- **Attack range is derived from `reachFrom`, not transcribed.** §6's table
  now has exactly one implementation and both §6 and §7 read it. A second
  copy would be a second thing that can drift, and the whole point of the
  change is that the two ranges are the same range.
- **The clear-path requirement is part of the range, not an extra rule.**
  "The same movement ability" includes how movement treats what is in the
  way.
- **The already-acted check goes in the seven-only layer.** Unlike
  game-over, which story 12 deliberately kept out of it. The distinction is
  whether the pass guard needs the answer, and here it does.
- **`assertFightInvariants` is rewritten, not deleted.** The story's most
  intricate code is the one place worth keeping a runtime net over.
- **§8.5 is not reopened**, even though the advance now makes an attack
  capable of freeing a stranded ship. Only the stale comment explaining the
  old reason is corrected.
- **Wording stays in `announcements.ts`.** Components render wording; they
  never compose it.

## Out of scope

- **Changing §8.5** to let an attack discharge the stranded obligation. Named
  above as a real consequence of this story, and deliberately left for the
  owner to decide on after the new combat has been played. Nothing in this
  story should be built to anticipate it.
- **A defending winner advancing.** Settled the other way; not a variant to
  leave a hook for.
- **Changing §6's movement table.** The numbers this story now applies to
  attacks are §6's existing numbers, unaltered. If they turn out to make
  attacks too long-ranged, that is a movement story.
- **Changing the shield cost of winning, the draw, or §7.1's return.** All
  three keep exactly the behaviour they have.
- **New board visuals for combat** — an attack animation, a lane highlight, a
  distinct treatment for a long-range target. The board follows the range
  change through the existing highlight mechanism and nothing more.
- **Rebalancing §8.4's payouts** now that a node can be taken in one action
  rather than two. That is a scoring story, and it should be informed by
  games actually played under these rules.
- **Recording or replaying a game**, and **any AI or engine**.

## Verification

**Automated, in the rules layer:**

- Attack range matches `reachFrom` exactly, shield count by shield count: a
  4-shield ship's legal targets are its four orthogonal neighbours and never a
  diagonal one; a 3-shield ship's are the same eight squares the old
  implementation produced; an unshielded ship can attack three squares
  orthogonally and two diagonally.
- An attack is refused with `"attack-path-blocked"` when a ship of either
  side stands between attacker and target, and the same attack is legal once
  that square is empty.
- An attack on a target beyond the reach is refused with
  `"target-out-of-range"`, and range and path are checked after ownership and
  the bay checks, not before.
- The winner's advance: an attacker winning from one, two and three squares
  away ends on the loser's square in each case, with the squares between left
  empty.
- The stop-short rule, tested against each of the three diagrams above — a
  dead loser's square, a dead in-between square as well, and an adjacent
  attack onto a dead square where the winner holds ground.
- **The defender-won and mutual-return branches are unchanged**, asserted
  directly: on a defender win the defender's square is the same before and
  after; on a draw both squares are empty and both ships are in bays with 0
  shields, attacker placed first.
- The advance wakes an active site it lands on **and** one it merely passes
  over, the site's clock starts in both cases, and a winner that landed on one
  then collects §8.4 energy and a §4.1 shield at the end of that turn — the
  end-to-end payoff of the change, worth one test that walks the whole way
  through.
- **A defender win and a mutual return wake nothing**, asserted directly
  against a board with an active site on the attacker's own square, on the
  lane, and on the bay the loser is placed in: `siteStates` is identical
  before and after, and no `site-charged` effect is emitted.
- A winner's square is never a bay: the assertion holds across an exhaustive
  sweep of attacker squares, shield counts and lane directions.
- **One action per ship:** a ship that has moved cannot attack; a ship that
  has attacked cannot move; a ship that has attacked cannot attack again; and
  a player's two actions with two different ships still work normally.
- **The pass guard, tested directly:** a state in which the side to move has
  exactly one ship with a legal action, that ship having already acted,
  passes the ply rather than believing an action remains. This is the check
  that catches the already-acted test being put in the public layer instead
  of the seven-only one.
- §8.5's obligation still refuses every attack while any ship owes an action,
  including the owing ship's own — unchanged behaviour, re-asserted because
  the reasoning behind it has moved.
- `assertFightInvariants` still fires on a genuinely impossible outcome: a
  hand-constructed post-fight state in which an uninvolved ship changed
  square, or the winner landed off its lane, throws.
- The full-game test from story 12 still runs to completion under the new
  rules and still ends at the expected ply — the check that the three changes
  have not deadlocked the game or broken the deterministic policy.
- `RULES_VERSION` agrees with `rules.md` at 0.8 (existing test).
- `siteSpacing.test.ts` is unchanged and still passes.

**Automated, in the UI:**

- Selecting a ship highlights targets at its true range, and a ship that has
  already acted this turn offers none.
- The live region announces a fight including where the winner ended up, and
  distinguishes a winner that advanced from one that held its ground.
- The refusal sentences for `"target-out-of-range"`,
  `"attack-path-blocked"` and `"ship-already-acted"` are produced and read
  correctly.
- axe finds no violations (with `color-contrast` disabled, per
  CONTRIBUTING.md).

**Manual (the owner runs the app):**

- Attacking at range reads clearly: it is obvious which highlighted squares
  are attacks and which are moves, at two and three squares out.
- A winner advancing onto the square it just cleared reads as one event, not
  as two things that happened to the board.
- Taking a node by winning a fight on it feels like the payoff it is meant to
  be.
- A 4-shield ship being unable to strike a diagonal neighbour is discoverable
  rather than baffling — the refusal sentence has to carry this, since it is
  the single most surprising consequence of the story for anyone who has
  played the old rules.

## Open items to resolve at plan time

- **How the lane reaches `applyAttack`.** The legality check finds the
  `ReachEntry` that matches the target; the advance needs the same value. The
  plan should decide whether `combat.ts` exposes a function returning it
  (and what it returns for an illegal attack), or whether `applyAttack`
  recomputes — and should prefer the first, since a recomputation is a second
  place the lane can be got wrong.
- **The shape of the widened `fight-resolved` effect.** It has to say where
  the winner ended up without making the mutual-return and defender-won cases
  carry a field that means nothing to them. The plan should choose between
  adding an optional advance record and restructuring the union, and should
  check what `announcements.ts` and any board consumer actually need before
  choosing.
- **Whether `"ship-already-acted"` needs one sentence or two.** A player can
  now reach it by trying to move a ship that attacked, which the old wording
  never had to cover. One sentence naming actions rather than moves may be
  enough; the plan should decide and keep it in `announcements.ts` either
  way.
- **Whether the rename lands as its own step.** `movedThisPly` →
  `actedThisPly` touches eight files and no behaviour, while making attacks
  record into it touches one file and changes a rule. Splitting them would
  give the peer review a mechanical diff to skim and a small one to read
  closely; the plan should decide, and say which way round.
