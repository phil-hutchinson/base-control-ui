# Story 00000011 — Combat

## Summary

Ships can fight. Until now the two fleets have shared a board without ever
touching: a ship could be blocked, out-manoeuvred or beaten to a node, but
never driven off one. This story implements §7 in full — an attack as the
second kind of action, the fight decided by shield count, the shields the
winner burns, and the losing ship's journey back to a bay under §7.1's
rotating return position.

That last piece finally fills **step 6** of the end-of-turn sequence, which
story 00000009 left as a documented empty slot, and pays off the debt that
story recorded in its own dampening rule: a ship that has already moved may
still have an attack available, and must stop reading as spent.

Combat is what makes the node economy a contest. It is also the first thing
in the game that happens to a player's ship against their will, so the board
has to say clearly what a fight would cost before it is committed to, and
where a beaten ship would land.

Influence is still not collected and no score is kept — §8.4 keeps its own
story, and step 2 of the end-of-turn sequence stays empty.

### A note on words

This is a planning document, so it says **ply** for what the rules and the UI
call a **turn**, and **hub** for what the player sees as a **node** (CLAUDE.md,
Vocabulary). Player-facing text in the app says "turn" and "node". **Move**
means one ship changing squares and never means a ply — which matters more in
this story than in any so far, because an **action** is now genuinely either a
move or an attack, and the two must not be conflated in code or in wording.

## Background & references

The rules are owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.5**.
This story begins with a rules edit that takes it to **0.6** (see In scope
item 1). The sections it implements are:

- **§5 Turns and actions** — an action is a move _or_ an attack; a ship may be
  moved at most once per ply and there is no other restriction; a player must
  take both actions if two are available; the pass when nothing is legal.
- **§7 Combat** — adjacency, the bay exclusion, who wins, what the winner
  pays, the draw, and the fact that neither ship moves.
- **§7.1 Returning to a bay** — the return position, its clockwise numbering,
  its counter-clockwise drift, and the first-empty-bay rule.
- **§7.2 Returning by choice** — already implemented as an ordinary move; named
  here only because §7 cross-references it.
- **§3.1 Bays** — a ship in a bay cannot attack and cannot be attacked.
- **§4.1 Shields** — the arithmetic that spends them.
- **§8.7 End-of-turn order** — step 6, the return position's drift.

### What is already in place

- `src/rules/bays.ts` holds the fourteen `BAYS` in the **table order of §3.1**
  (top, right, bottom, left), and `isBay`. That order is _not_ the clockwise
  ring §7.1 numbers around — see In scope item 4.
- `src/rules/gameState.ts` carries the ships, site statuses, side to move,
  actions remaining, `movedThisPly`, the ply number and the random seed. There
  is no return position.
- `src/rules/ply.ts` applies a move, spends an action, runs the end-of-turn
  sequence when the second is spent, and finishes with `applyPassGuard`. It is
  the only thing that has ever spent an action.
- `src/rules/movement.ts` exposes `moveRefusalReason`, `legalDestinations` and
  `sideToMoveHasLegalMove`. The last of these is the §5 pass guard, and it is
  move-only.
- `src/rules/stranded.ts` derives §8.5's obligation and whether it binds.
- `src/rules/endOfTurn.ts` runs §8.7's six steps, with step 2 (influence) and
  step 6 (the return position) as documented empty slots.
- `src/game/session.ts` turns an activation into a selection, a move, or a
  structured rejection. Activating an occupied square with a ship selected
  either re-selects a friendly ship or attempts a move that will be refused.
- `src/board/Board.tsx` derives each ship's `ShipCondition` and each square's
  `SquareMark`; `src/board/BoardSquare.tsx` draws them; `squareLabel.ts` speaks
  them; `announcements.ts` turns session events into sentences.

### The fight, worked through

§7 gives the winner's remaining shields as `winner − (loser + 1)`. Because the
winner is by definition the ship with **more** shields, `winner ≥ loser + 1`,
so the result is never negative and always a valid `ShieldCount`. That is an
invariant worth asserting rather than a case worth clamping.

The three outcomes, stated as the code must distinguish them:

| Attacker vs defender | Outcome                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| more shields         | Attacker wins. Defender returns to a bay at 0. Attacker keeps `a − d − 1`.     |
| fewer shields        | **Defender** wins. Attacker returns to a bay at 0. Defender keeps `d − a − 1`. |
| equal                | Both return to bays at 0, attacker placed first.                               |

The middle row is the one most easily implemented backwards. §7 explicitly
permits attacking an enemy stronger than yourself, so a player can spend an
action to strip an opponent's shields at the cost of sending their own ship
home — a real tactic, not an error case.

Neither ship ever moves. The loser's square is simply empty afterwards, and
if it was a charged node the node stays charged with its clock running.

### The return position, worked through

§7.1 numbers the bays fresh each ply. Return position 1 is **H15 on ply 1**,
and at the end of every ply it moves **one bay counter-clockwise**. There are
fourteen bays, so it returns to H15 every fourteen plies — the "every seven
rounds" §7.1 states. The remaining bays are numbered 2, 3, 4 … **clockwise**
from position 1, and a returning ship takes the **first empty** bay in that
order.

The clockwise ring is the order §4 uses for the starting fleet: H15, L15, O14,
O10, O6, O2, L1, H1, D1, A2, A6, A10, A14, D15. `BAYS` in `bays.ts` is in
§3.1's table order and is not this ring, so the ring is a second ordering the
code needs.

Two consequences the implementation must respect:

- **Position 1 is state; the receptacle is derived.** Which bay a beaten ship
  would actually land in depends on which bays are occupied _right now_, and
  that changes within a ply — a ship moving out of a bay as the first action
  changes the answer for the second. It is recomputed at the point of use and
  never stored.
- **Both actions of a ply use the same position 1.** The drift is step 6 of the
  end-of-turn sequence, so it happens between plies, never between actions —
  including on a ply that passed, since §8.7 runs in full for a passed ply.

There is always somewhere to go. A returning ship was by definition not in a
bay, so at most thirteen bays are occupied; when two ships return from one
fight, both were off-bay, so at most twelve are.

## In scope

1. **A rules edit, in its own commit, ahead of the code** (CLAUDE.md, Rules
   versioning). Version **0.6**, with a `changelog.md` entry and a matching
   `RULES_VERSION` bump. Two changes, neither of which alters how the game is
   played, so neither is a tagging candidate — and tagging is on hold in any
   case:

   - **Appendix A item 1 (starting shields) is closed: every ship starts with
     0 shields.** This is the owner's decision. §4's "Every ship starts with
     **0 shields (TBD)**" loses its TBD, the appendix's table and item go, and
     the introduction's sentence about undecided details goes with them. The
     **Appendix A heading stays**, carrying a single line saying nothing is
     currently outstanding: the rules are expected to change often and the
     appendix will fill again, and deleting it outright would mean renumbering
     Appendix B, breaking its cross-reference in §8.7 and in every planning
     document that cites it.
   - **§7.1's "there is always somewhere to go" is extended to cover the
     mutual return.** Its argument today justifies one empty bay for one
     returning ship; the same reasoning gives two empty bays when two ships
     return from one fight, and the paragraph should say so, since the case
     immediately above it is exactly that one.

2. **Attacking as an action** — a new `src/rules/combat.ts`, holding §7 the way
   `moveLegality.ts`/`movement.ts` hold §6, and the only implementation of §7
   in the app:

   - **Adjacency**: the eight surrounding squares, diagonals included,
     **independent of shield count**. This is not §6's range table, and it must
     not be derived from `reachFrom` — a 4-shield ship strikes all eight
     neighbours while it can only step one square orthogonally.
   - **The bay exclusion** (§3.1, §7): neither the attacker nor the target may
     be in a bay, checked separately so the refusal can say which.
   - **The target must be an enemy ship**; the attacker must belong to the side
     to move.
   - **§8.5's obligation refuses an attack too.** While any ship owes an
     action, each action must free one, and an attack never frees anything —
     so the obligation blocks attacks exactly as it blocks other ships' moves,
     with the same reason.
   - **No attack limit of any kind.** A ship may attack twice in a ply, attack
     and then move, or move and then attack. Attacking does **not** add the
     ship to `movedThisPly`, which keeps its present name and its present
     meaning: moves only.
   - `legalTargets(state, shipId)` and `attackRefusalReason(state, shipId,
target)`, mirroring the shapes `movement.ts` already exposes, plus a
     structured `AttackRefusalReason` union — never a sentence.

3. **Resolving a fight** — `applyAttack` in `src/rules/ply.ts`, alongside
   `applyMove` and sharing its end-of-action tail (spend an action, run the
   end-of-turn sequence when the ply's second action is spent, then the pass
   guard). It implements the three outcomes above, returns structured effects,
   and asserts the invariants §7 guarantees: neither ship changes square, the
   winner's shields land in range, the fleet is still seven a side, and no site
   changes state — **a fight never charges anything**, because nobody moves.

4. **The clockwise bay ring, and §7.1's return position** —

   - A `CLOCKWISE_BAYS` ordering in `bays.ts`, with a test asserting it agrees
     with §4's starting-fleet listing, so the two orderings can never drift.
   - A return-position field in `GameState`, stored as an **index into the
     ring** rather than a square, so the drift is arithmetic. It starts at
     H15's index.
   - `returnBayFor(state)`: the first empty bay counting clockwise from
     position 1, recomputed from current occupancy every time it is asked. The
     mutual-return case takes the next one after the attacker is placed.

5. **§8.7 step 6, filled in** — the return position advances one bay
   counter-clockwise at the end of every ply, including a passed one. The step
   stops being an empty slot and the comment saying it awaits this story goes.

6. **Actions become moves-or-attacks everywhere the word "action" already
   appears** —

   - The §5 pass guard: `sideToMoveHasLegalMove` becomes a legal-**action**
     test, so a side with no legal move but a legal attack does not pass. §5's
     remark that this should never happen in practice depends on exactly this.
   - §8.5's waiver keeps its present shape: a stranded ship drops out of the
     obligation when it has no legal **move**, because only a move frees it.
     An available attack does not make a stranded ship's obligation binding
     again.

7. **The attack gesture in the session** — the owner's decision is that
   attacking should be as close to moving as possible: with a ship selected,
   you activate an enemy ship instead of an empty square.

   - Activating an **empty** square is a move, accepted or refused on move
     legality exactly as today. There is therefore no "no target here"
     refusal — that square is a move attempt, not a failed attack.
   - Activating a square holding an **enemy** ship is an attack, accepted or
     refused on attack legality.
   - Activating a square holding a **friendly** ship still re-selects it — but
     the eligibility test widens from "has not moved this ply" to "has a legal
     action", so a ship that has moved and can still attack becomes selectable.
   - New session events for the fight's outcome, and the new attack refusal
     reasons folded into `RejectionReason`.

8. **Attack cues on the board** — with a ship selected, its legal targets are
   marked, distinctly from its legal destinations, and the mark is in the
   accessible name as well as in the artwork.

   The accessible name of a target square also **names the outcome** — that
   attacking here would be a win, a loss, or a mutual return. This is the
   owner's decision, and it is not the outcome-first design that was set
   aside: the artwork stays a plain cue, and the spoken name only saves a
   listener arithmetic it could already do, since both ships' shield counts
   are spoken already. A sighted player reads the two shield rings and works
   it out; a listener would have to hold two numbers across two focus stops
   to do the same, which is the gap this closes.

9. **The return position on the board** — the owner's design:

   - **Position 1 is always marked**, whether or not it is empty, with
     **triangles in all four corners** of the square — each drawn as a single
     new line, the square's existing border forming the triangle's other two
     sides.
   - **The current first receptacle** — the bay a beaten ship would actually
     land in — is marked the same way, and is **recomputed after every
     action**, since moving a ship out of a bay changes it.
   - **The receptacle's triangles are solid and position 1's are outline.** The
     owner revised this after seeing both on screen: the receptacle is the bay
     that will actually take the next beaten ship, so it is the more important
     of the two nearly all the time, and the heavier mark belongs on it.
     Position 1 is the rule behind the receptacle rather than the fact a player
     acts on. Where one square is both, it is solid; where no bay is empty at
     all, only position 1's outline is drawn, and the absence of a solid mark
     correctly says there is nowhere for a beaten ship to go.
   - **The secondary receptacle is not shown.** A player working out where the
     second of two mutually beaten ships would land can count on from the
     first.
   - Both marks read in the accessible name, so the cue is never artwork alone.

10. **"Already moved" stops meaning "spent".** Today a ship's board condition
    is one of three mutually exclusive values — `owes-action`, `already-moved`,
    `no-action` — derived in `Board.tsx`, drawn by `BoardSquare.tsx` as a fade
    plus a mark, and spoken by `squareLabel.ts`. Two of the three fade the
    ship, and `already-moved` is one of them, because when it was written a
    ship that had moved had nothing left to do. Under §5 that is no longer
    true: a ship that has moved is a perfectly valid choice for the second
    action **if and only if it has a legal attack target**. The rule is the
    specification; the board must match it:

    - **Selectable exactly when it has a legal action.** A ship that has moved
      and has a target selects normally and shows its targets and no
      destinations. A ship that has moved and has no target does not.
    - **The fade tracks legal actions and nothing else.** Dampening is driven
      solely by "no legal move **and** no legal target" — the `no-action`
      condition, which now considers both kinds of action. Having moved stops
      contributing to it.
    - **Having moved is still worth saying.** It is a real fact a player needs
      when planning the rest of the turn, so it stays in the artwork and in the
      accessible name; it simply stops being one of three exclusive conditions
      and becomes an independent fact that can accompany any of them. A ship
      that has moved and has no target reads as both moved and out of actions.

    The plan should expect this to change the shape of `ShipCondition` rather
    than just its derivation: "has moved this turn" is orthogonal to "has no
    action left", where the current union makes them alternatives.

11. **Telling the player what happened** — new wording in
    `announcements.ts`, driven by structured effects as always, in the players'
    vocabulary:

    - An attack won: who struck whom, where the beaten ship went, and what the
      fight cost the winner in shields.
    - An attack lost: the same sentence from the other side, saying plainly
      that the attacker was beaten and the defender paid shields for it.
    - A mutual return: both ships home, both at 0, naming both bays.
    - The refusals: attacking your own ship, attacking out of range, attacking
      from or into a bay, and attacking while a ship owes an action.

## Design decisions & constraints

- **§7 gets its own module.** `combat.ts` sits beside `movement.ts` as the
  single implementation of its section, for the same reason: a future engine
  must find one answer to "what are the legal actions", not two.
- **Attack range is written out, not derived.** Deriving the eight neighbours
  from `reachFrom` would silently tie §7's range to §6's table, which is the
  one thing §7's second paragraph exists to deny.
- **`movedThisPly` keeps its name and meaning.** Renaming it to something like
  `actedThisPly` would be actively wrong: §5 caps moves per ship per ply and
  caps nothing else. The list stays a list of moves.
- **The return position is an index; the receptacle is derived.** Storing the
  landing bay would be a cached derivation that goes stale inside a ply, which
  is precisely the case the owner called out.
- **Two bay orderings, one asserted against the other.** §3.1's table order and
  §7.1's clockwise ring are both in the document and both needed. A test ties
  the ring to §4's starting-fleet listing so neither can be quietly edited.
- **No confirmation step.** The owner's decision: attacking is one activation,
  like moving. The board carries the information a player needs _before_ they
  commit — the target's shield count is already in every square's accessible
  name, and the return cues say where a beaten ship lands.
- **A fight is inert with respect to nodes.** No site changes state during
  combat, because §8.2 wakes a site when a **ship touches it** and no ship
  moves in a fight. Asserted, not merely assumed.
- **A ship returned to a bay is not "moved".** It can still be moved as the
  ply's second action if it belongs to the side to move — which is what makes
  the mutual-loss opening survivable — and it is no longer stranded, since a
  bay is not a site.
- **This story implements the rules; the only rules changes are item 1**, and
  neither of those changes how the game is played. No tag.

## Out of scope

- **Influence and scoring.** §8.4 and any notion of a score. Step 2 of the
  end-of-turn sequence stays empty. Combat makes nodes contestable; counting
  what holding one is worth is still its own story.
- **The end of the game.** §9's hundred rounds. The ply counter exists and
  still nothing consumes it.
- **Recording and replaying a game.** The seed is in the state; no record is
  written or read.
- **Undo.** A fight is irreversible, as every action in the game is. Nothing
  here adds a way to take one back.
- **An engine, an opponent, or any move search.** Both sides are played by
  hand.
- **A node or ship visual redesign.** The shield arcs, the site markers and the
  existing mark layer are extended, not restyled. If watching real fights shows
  the cues do not carry, that is a finding for a later story.
- **Any backend.** The app stays a static, front-end-only SPA.

## Verification

Automated (must be green before sign-off): `npm run typecheck`, `npm run lint`,
`npm test`, `npm run format:check`, `npm run build`.

Automated tests should cover, at minimum:

- **The rules edit** — `RULES_VERSION` agrees with `rules.md`, as the existing
  test asserts, and the changelog has its 0.6 entry.
- **Adjacency** — all eight neighbours are targets; a ship two squares away is
  not; a 4-shield ship can strike diagonally though it cannot move that way; a
  0-shield ship's three-square reach grants it no extra range.
- **The bay exclusion** — a ship in a bay cannot attack; a ship in a bay cannot
  be attacked; both refusals are distinguishable.
- **Who wins, all three ways** — attacker stronger, attacker weaker (the
  defender wins and pays), and equal (both return). Every combination of 0-4
  against 0-4, asserted against `winner − (loser + 1)`.
- **What a fight costs** — beating a 0-shield ship costs one shield; the
  winner's result is never negative and is always a valid `ShieldCount`; a
  winner reduced to 0 standing on a charged node gains one back at the end of
  the ply.
- **Neither ship moves** — the winner stays put, the loser's square is empty,
  and driving an enemy off a charged node leaves the node charged and ticking.
- **A fight touches no site** — no site's state or clock changes as a result of
  an attack, in any of the three outcomes.
- **The fleet is constant** — seven ships a side after any sequence of fights.
- **Return placement** — the first empty bay clockwise from position 1; the
  next one when position 1 is occupied; the attacker placed first and the
  defender taking the following empty bay on a mutual return; both arriving at
  0 shields.
- **The return position's drift** — H15 on ply 1; one bay counter-clockwise at
  the end of every ply, including a passed one; back to H15 after fourteen
  plies; unchanged **between** the two actions of a single ply.
- **The receptacle is live** — moving a ship out of a bay as the first action
  changes where a ship beaten by the second action lands.
- **Action permissions** — attack twice with one ship (winning the first, so it
  survives to strike a second neighbour); attack then move with one ship; move
  then attack with one ship; attack with two different ships; and the move cap
  still holding at one per ship per ply.
- **The stranded obligation** — an attack is refused while a ship owes an
  action, with the same reason as a wrong move; an attack never satisfies the
  obligation; after the freeing move, attacking is legal, including with the
  ship just freed; a stranded ship whose obligation is waived may attack.
- **The pass guard** — a side with no legal move but a legal attack does not
  pass; a side with neither still passes and runs the full end-of-turn
  sequence.
- **Un-stranding by force** — a ship stranded on a depleted site that is beaten
  in a fight is in a bay and owes nothing on its owner's next turn.
- **The session gesture** — activating an empty square is still a move;
  activating an adjacent enemy attacks; activating a distant enemy is refused
  as out of attack range, not as a blocked move; activating a friendly ship
  re-selects it, including one that has moved and can still attack.
- **The dampened shade** — a ship that has moved but can still attack is not
  dampened and is selectable; a ship with neither a move nor a target is; and
  having moved is still stated in the accessible name in both cases.
- **The outcome in a target's accessible name** — a win, a loss and a mutual
  return each read correctly, for every combination of 0-4 against 0-4, and
  the wording appears only on a square that is actually a legal target.
- **Wording** — a sentence for each of the three outcomes and each new refusal,
  in the players' vocabulary ("turn", "node"), and the return cues present in
  the relevant squares' accessible names.

**Manual gates** — the plan should schedule these:

1. **Fight, all three ways.** `npm run dev`, open `localhost:5273`. Win a
   fight and confirm the winner holds its ground, the shield cost is right and
   the loser is in the expected bay. Attack a stronger ship deliberately and
   confirm the reversal reads clearly rather than looking like a bug. Fight an
   equal ship and confirm both go home.
2. **Take a node in two actions.** Drive an enemy off a charged node, then
   claim the empty square with a second action — including the case where the
   shields burned in the fight are what unlocks the diagonal step needed.
3. **The return cues.** Confirm position 1 is marked all game and drifts one
   bay counter-clockwise per turn, that the outline receptacle marker is
   somewhere different when position 1 is occupied, and that moving a ship out
   of a bay updates it immediately, mid-turn.
4. **Attack and move cues together.** Select a ship next to an enemy and
   confirm destinations and targets are told apart at a glance; select a ship
   that has already moved and confirm it still selects and shows targets only.
5. **Screen reader.** The live region reads all three outcomes, the bay a
   beaten ship went to, and the shield cost, in wording that makes sense read
   aloud; the return-position marks are audible in the bays' accessible names;
   the new refusals explain themselves. Then tab across a selected ship's
   targets and confirm the predicted outcome is genuinely useful spoken at the
   end of an already long square name, rather than something a listener has
   stopped waiting for.

## Open items to resolve at plan time

- **How the outcome is worded in a target's accessible name.** That it is said
  is settled (In scope item 8); the phrasing is not. It has to be short enough
  to sit at the end of an already long name, and unambiguous about who wins
  when read on its own.
- **Mark exclusivity.** `SquareMark` is one slot today, and the return cues are
  not exclusive with anything: a bay can be position 1, a legal destination and
  the receptacle at once. Either the slot becomes a set, or the bay cues become
  a field of their own.
- **The coincidence case for the two triangle marks** — when position 1 is
  empty it is also the receptacle. Whether the solid mark simply wins, or the
  two are drawn together, wants looking at on screen; the accessible name
  should say both regardless.
- **Where the shared end-of-action tail lives.** `applyMove` and `applyAttack`
  both spend an action, may end the ply, run the end-of-turn sequence and pass
  through the guard. `ply.ts` is already substantial and the tail should be
  extracted rather than duplicated.
- **The shape "has moved" takes** once it is no longer one of three exclusive
  conditions (In scope item 10) — a second field beside the condition, a set,
  or something else — and whether its existing bar mark still reads correctly
  next to an undampened ship, which it was never drawn against.
- **Focus behaviour after an attack.** The activated square usually becomes
  empty, and sometimes the attacker's does too. Where focus lands, and what the
  grid's roving tabindex does with it, needs deciding rather than inheriting.
- **How the fight's effects are shaped** so `announcements.ts` can group them
  the way it groups shield gains — one fight produces several facts (a loser, a
  bay, a shield cost) that belong in one sentence.
