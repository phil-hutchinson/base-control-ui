# Story 00000009 — Nodes: waking, charging, depleting

## Summary

The board comes alive on its own. Until now every site has sat in the state it
started in and nothing has ever happened that a player did not directly do.
This story implements the node cycle from §8: a ship touching an active site
**charges** it, a ship sitting on a charged node **gains a shield** each turn,
a charged node **runs out** after nine turns and goes depleted, a fresh site
**wakes at random** to replace it, and a ship left standing on the site
underneath is **stranded** and must spend an action getting clear.

To do any of that, the game needs three things it does not have: an end-of-turn
sequence (§8.7) rather than a bare side-swap, a turn counter, and a **seeded**
random generator so a game can be replayed exactly.

Influence is not collected and no score is kept — that is §8.4 and it has its
own story. Combat does not exist yet, so nodes cannot be contested: this story
delivers the whole node economy, and the fight over it comes later.

### A note on words

This is a planning document, so it says **ply** for what the rules and the UI
call a **turn**, and **hub** for what the player sees as a **node** (CLAUDE.md,
Vocabulary). Player-facing text in the app says "turn" and "node". **Move**
means one ship changing squares and never means a ply.

## Background & references

The rules are owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), **version 0.3**. The sections
this story implements are:

- **§4.1 Shields** — the gain of one shield for standing on a node, and the
  cap of 4.
- **§8.1 The four states of a site** — the dormant → active → charged →
  depleted → dormant cycle, and the invariant that exactly five sites are
  active or charged at any moment.
- **§8.2 Waking a node** — an active site becomes charged the moment any
  ship touches it, landing on it or flying over it.
- **§8.3 How long a node lives** — nine turns, counting the turn it was woken.
- **§8.5 Depleted and dormant sites** — the stranded ship and the action it
  owes.
- **§8.6 Waking a replacement** — the random draw from the dormant pool, and
  the nine-turn cooldown that returns a depleted site to it.
- **§8.7 End-of-turn order** — the six steps, in order, two of which stay
  empty for now.
- **Appendix B** — the guard test the document asks for: the dormant pool
  must never run dry.

### What is already in place

Story 00000003 fixed the site positions and 00000004 gave the game plies,
actions and movement, so a good deal of the groundwork exists:

- `src/rules/sites.ts` holds the seventeen `SITES`, the `SiteState` union of
  all four states, and the five `STARTING_ACTIVE_SITES`. No site has ever
  changed state.
- `src/rules/gameState.ts` carries `siteStates` as a square-name-keyed record,
  alongside the ships, the side to move, the actions remaining and the ships
  moved this ply. There is no turn counter and no randomness.
- `src/rules/movement.ts` already implements §6 in full, including the ban on
  **ending** a move on a dormant or depleted site, and `reachFrom` already
  reports the squares a move **passes over** — which is exactly what §8.2's
  fly-over wake needs.
- `src/rules/ply.ts` applies a move and swaps sides when the second action is
  spent. That side-swap is the only thing that happens at the end of a ply
  today; §8.7's sequence has no home yet.
- `src/board/SiteMarker.tsx` already draws all four states distinguishably —
  dashed, solid, double and dotted rings, so they read in greyscale — and
  `src/board/squareLabel.ts` already speaks a site's state in its accessible
  name. Both were built against states nothing could reach; this story makes
  them mean something.
- `src/board/announcements.ts` turns a structured session event into the
  sentence the live region speaks.

There is **no random generator of any kind** in the repository, and
`Math.random` is banned by lint (CONTRIBUTING.md) precisely so that this story
has to introduce a seeded one.

### The clock, worked through

§8.3 states nine turns and then states the properties that number was chosen
for. Both properties are the real specification, and both are tests:

Number the plies 1, 2, 3, … Green takes the odd ones. Suppose green wakes a
site during ply _N_. That ply is the first of the node's nine, so the node is
charged for plies _N_ … _N+8_ and becomes depleted at the end of ply _N+8_.

- _N_, _N+2_, _N+4_, _N+6_ and _N+8_ are all green's, so the player who woke
  the node and then sits on it collects from it **five times** — the figure
  §8.3 names.
- _N+8_ is green's ply, so the replacement wakes at the end of it and **red
  moves next** and sees the new site first — the second property §8.3 names.

The cooldown continues the same count. The site is depleted for plies _N+9_ …
_N+17_, returning to dormant at step 3 of the end of ply _N+17_ — and so it is
back in the pool in time for that same ply's step 5 draw, which is the ordering
§8.7 calls out deliberately. That is eighteen plies unavailable from the moment
of waking, the figure Appendix B's sizing arithmetic rests on.

So both clocks are nine, both tick once at the end of **every** ply regardless
of side, and the charged clock counts the ply it was woken on while the
depleted clock does not count the ply on which it depleted. The eighteen-turn
total is what makes the two consistent.

## In scope

1. **A seeded random generator.** A small, pure `mulberry32` in `src/rules/`:
   a seed in, a `[value, nextSeed]` pair out, so it is a plain function and the
   generator's state can live in `GameState` as one number. The seed is part of
   the game state from the first ply, so that a recorded game can be replayed
   exactly (CLAUDE.md). Nothing displays it and nothing records a game yet.

2. **A ply counter in `GameState`.** Needed by both clocks, and later by §9's
   hundred rounds.

3. **Site clocks in `GameState`.** Each charged site carries how many turns it
   has left, and each depleted site how much cooldown it has left. Both are
   set and decremented as worked through above.

4. **Waking (§8.2).** Applying a move charges any **active** site the ship
   lands on _or_ passes over, immediately, mid-move — not at the end of the
   ply. Either player's ship wakes a site, and the ship need not stop. The
   clock starts on the ply of the wake, which means a ship that lands on an
   active site charges it and gains its first shield from it that same turn.

5. **The §8.7 end-of-turn sequence**, in its stated order, run once when a
   ply's second action is spent (and when a ply passes):

   1. Each of the **moving player's** ships standing on a charged node gains
      one shield, capped at 4. Note the emphasis: only the moving side gains,
      so a ship parked on a node gains one shield per **round**, not per ply.
      An active site grants nothing — only a charged one does.
   2. _Influence — deliberately empty, see Out of scope._
   3. Depleted sites that have finished cooling go dormant.
   4. Charged nodes that have finished their nine turns go depleted.
   5. One dormant site wakes at random for each node that just ran out.
   6. _Bay return position — deliberately empty, see Out of scope._

   Steps 3 and 5 must be in that order, for the reason §8.7 gives.

6. **The random replacement (§8.6).** A uniform draw from the dormant pool,
   from the seeded generator, made once per node that ran out and without
   replacement when several run out at once. A drawn site becomes **active** —
   unless a ship is standing on it, in which case §8.5's final paragraph
   applies and it becomes **charged** immediately with its clock started.

7. **The empty-pool safety net (§8.7).** Should the dormant pool be empty when
   a replacement is needed, the site depleted longest goes back to dormant
   first. Plus the guard **Appendix B explicitly asks the app for**: a test
   that plays adversarial waking patterns and asserts the pool never runs dry,
   and that exactly five sites are active or charged at every moment of it.

8. **Stranded ships (§8.5).** A ship left standing on a site that has gone out
   underneath it owes its owner an action. §8.5 describes this as a restriction
   on what an action may be, so it is implemented as one, in the rules layer,
   and reaches the player through the same refusal machinery every other
   illegal move uses:

   - At each action, count the moving side's ships that are standing on a
     dormant or depleted site, have not yet moved this ply, and have at least
     one legal move. If that count is **at least** the number of actions
     remaining, the action must be a move of one of those ships; otherwise the
     player is free. This yields §8.5's stated cases exactly: one stranded ship
     leaves the first action free and forces the second, two force both, three
     or more mean the player clears two of their choice and the rest wait.
   - A stranded ship with no legal move at all drops out of the count — §8.5
     waives the requirement rather than obliging the player to shuffle
     blockers aside.
   - A new refusal reason and its player-facing wording, so that a player who
     tries to move something else is told why, rather than silently refused.
   - The existing §5 pass guard keeps working: a side with nothing legal at
     all still passes.

9. **Telling the player what happened.** These are the first events in the
   game that happen _to_ a player rather than because of one, so they need
   words: a site charging (including by an opponent's fly-over), a node running
   out, a replacement waking somewhere new, a ship becoming stranded, and a
   shield gained. Wording lives in `src/board/announcements.ts` as usual, driven
   by structured effects — never sentences built in the rules layer.

10. **Showing the obligation on the board.** A refusal sentence arrives only
    after the player has already tried the wrong thing; the obligation has to
    be visible before that. Ships that cannot be moved are already drawn faded
    (`--spent-opacity`) with a bar in the mark layer, for the ship that has
    already moved this ply. This story extends that layer:

    - **The dampened shade generalises** from "has already moved this ply" to
      **"has no legal action available"** — which folds in the ship that has
      moved, every ship held back by an obligation elsewhere in the fleet, and
      a ship with no legal destination at all (pinned by other ships). The
      reason stays distinguishable in the mark layer and in the accessible
      name; the fade only ever says "not this one".

      The wording is deliberately **action**, not **move**. Today the two mean
      the same thing, because every action is a move (§7 does not exist yet),
      so nothing separates them in this story's code. They part company the
      moment combat arrives: a ship that has already moved may still have an
      attack available, and must _not_ be dampened — selecting it would then
      show attack cues and no destinations. Defining the shade this way now is
      what stops the combat story having to re-derive it.

    - **A ship that owes an action blinks** between the full and dampened
      shades, and carries a static mark of its own shape. It blinks from the
      **start of the ply**, not from the moment the obligation binds: with one
      stranded ship the first action is genuinely free, and warning the player
      before they spend it is the whole point.
    - **The rest of the fleet dampens only when the obligation actually
      binds** — with one stranded ship, when the second action comes up; with
      two or more, for the whole ply. Dampening them earlier would refuse
      moves that §8.5 permits.
    - **A third `SquareMark`** for the owed action, so the obligation is in the
      accessible name and not only in the artwork.

## Design decisions & constraints

- **`mulberry32`, written here, not depended on.** It is about ten lines, it
  is a well-known published generator, and it is quicker to unit-test than to
  justify a package for. The project has no runtime dependencies beyond React
  and this is not the thing to break that for. Its quality is far beyond what
  picking one of seven sites needs.
- **The generator is a pure function threaded through the state.** A stateful
  generator object would make `GameState` non-serialisable and would put a
  hidden mutable in the middle of a rules layer that is otherwise plain
  readonly data. Seed in, value and next seed out; the state carries the seed.
- **No countdown is displayed.** Neither charged nor depleted sites show how
  long they have left. The owner has ruled this out for now: a player can count
  turns, and the board is busy enough. This is a display decision only — the
  numbers are in the state, so showing them later is a small change.
- **Waking happens inside the move, not at the end of the ply.** §8.2 says "the
  moment a ship touches it". Deferring it to §8.7 would give a different game:
  a node woken by a fly-over would not be charged in time to pay its waker a
  shield on the same turn, and §8.3's five-collections figure would be wrong.
- **No state is ever carried by motion alone.** The blink is an
  attention-getter layered on top of a static mark, never the only thing that
  says a ship owes an action, and it is dropped entirely under
  `prefers-reduced-motion`. The app has no animation at all today, and this
  one persists until the player acts — well past the five seconds WCAG 2.2.2
  concerns itself with — so it needs both an alternative and an off switch.
  This is the same reasoning `BoardSquare.css` already applies to the spent
  ship, which is faded _and_ barred so the state is never a lightness accident.
- **The stranded rule belongs in the rules layer.** Enforcing it in the session
  or the UI would put a rule outside `src/rules/`, where a future engine would
  not see it. It is a constraint on legal actions, and that is where it goes.
- **§8.7's empty steps stay visibly empty.** The sequence is written with all
  six steps present and steps 2 and 6 documented as awaiting their stories,
  rather than a four-step sequence that later has to be re-derived. The order
  is load-bearing and the document is explicit about why.
- **A ship on a dormant site is stranded too — owner's decision.** §8.5 as
  written says a stranded ship is one on a **depleted** site, but its own final
  paragraph acknowledges a ship can still be standing on a site after that site
  has finished cooling down and gone dormant. The ship is equally stuck in both
  states, and §6 forbids ending a move on either, so the owed action attaches to
  both. This needs a small **rules edit** to §8.5, and so a `RULES_VERSION`
  bump and a changelog entry in their own commit, ahead of the code that
  depends on it.
- **This story implements the rules; it does not invent any**, beyond the §8.5
  clarification above. No tag: tagging stays on hold until the game plays.

## Out of scope

- **Influence and scoring.** §8.4 and the whole notion of a score. Step 2 of
  the end-of-turn sequence stays empty and no total is kept anywhere. This is
  the owner's explicit call; it gets its own story.
- **Combat.** §7 entirely — attacking, who wins, what a win costs, and the
  §7.1 return to a bay. That includes the attack half of the dampening rule in
  scope item 10: this story defines the shade as "no legal action available"
  but has only moves to test it against. It does not exist yet, which is why step 6 of the
  end-of-turn sequence (the bay return position) also stays empty. Until it
  arrives, a node cannot be taken from an opponent, only occupied first.
- **The end of the game.** §9's hundred rounds. The ply counter arrives here,
  but nothing consumes it.
- **Recording and replaying a game.** The seed lives in the state so that a
  record _can_ be exact, but no record is written, read or displayed.
- **A node-visual redesign.** `SiteMarker` already distinguishes the four
  states and this story does not restyle it. If watching real state changes
  shows the distinctions do not carry, that is a finding for a later story, not
  a licence to redesign here.
- **Any backend.** The app stays a static, front-end-only SPA.

## Verification

Automated (must be green before sign-off): `npm run typecheck`, `npm run lint`,
`npm test`, `npm run format:check`, `npm run build`.

Automated tests should cover, at minimum:

- **The generator** — deterministic for a given seed, uniform enough over a
  large sample, and a draw that is reproducible from a recorded seed.
- **Waking** — landing on an active site charges it; flying over one charges it
  without the ship stopping; either side's ship does it; an already-charged,
  depleted or dormant site is unaffected by being touched.
- **The clock, both properties of §8.3** — a player who wakes a node and sits
  on it gains a shield from it on exactly five of their turns, and the node
  depletes at the end of the waker's ply so the opponent sees the replacement
  first. Also the eighteen-ply round trip: woken, charged nine, depleted nine,
  dormant and drawable again.
- **The shield grant** — only the moving side's ships; only on charged sites;
  capped at 4; a ship on an active site gains nothing.
- **The end-of-turn order** — specifically that a site freed at step 3 is
  available to the draw at step 5 in the same ply, and that a ship on a node
  that runs out this ply still gains its shield at step 1 before being
  stranded at step 4.
- **The replacement draw** — always restores five active-or-charged sites;
  never draws a non-dormant site; draws without replacement when several nodes
  run out together; and wakes **charged** rather than active when a ship is
  standing on the drawn site.
- **The Appendix B guard** — adversarial waking patterns over a long game,
  asserting the dormant pool never runs dry and the five-site invariant holds
  at every ply.
- **Stranded ships** — one stranded ship leaves the first action free and
  forces the second; two force both; three let the player choose two and leave
  the rest; a stranded ship with no legal move waives the requirement; moving
  something else while an action is owed is refused with the right reason; and
  the §5 pass still fires when nothing at all is legal.
- **Wording** — a sentence for each new event, and the refusal wording for the
  owed action, in the players' vocabulary ("turn", "node").

**Manual gates** — the plan should schedule these:

1. **Watch a node cycle end to end.** `npm run dev`, open `localhost:5273`.
   Move a ship onto an active site and confirm it charges immediately; leave it
   there and confirm a shield arrives once per round up to four; count the
   turns and confirm it goes out on the ninth, that a new site wakes somewhere
   else at the same moment, and that it is the opponent who moves next.
2. **Fly over a site.** Confirm a ship passing over an active site charges it
   and collects nothing, and that this reads clearly when the opponent does it.
3. **Get stranded on purpose.** Sit on a node until it runs out, then confirm
   the ship must be moved clear, that trying to move a different ship explains
   itself, and that the rest of the turn is genuinely free.
4. **The obligation reads at a glance.** The owed ship blinks from the start of
   the ply, the rest of the fleet dampens only once the obligation binds, and
   the blink is legible without being punishing to sit with. Then set the
   system's reduce-motion preference and confirm the blink stops while the
   obligation is still obvious from the static mark.
5. **Screen reader.** The live region announces charging, running out, the
   replacement, stranding and shield gains in wording that makes sense read
   aloud, and each square's state is still correct in its accessible name.

## Open items to resolve at plan time

- **Where the initial seed comes from.** `Math.random` is banned in game code,
  so the app needs another source at startup — the clock, `crypto`, or a fixed
  seed — decided outside the rules layer, with tests always passing a seed
  explicitly.
- **How the site clocks are stored.** Per-site countdowns beside `siteStates`,
  or a ply number recorded on each site and the remaining life derived. The
  second is smaller state and no derived counters to keep in step; the first
  reads more directly.
- **Which structured effects the end-of-turn sequence reports**, and how they
  reach `announcements.ts` — the existing `MoveEffect` union grew for moves,
  and end-of-turn events are a different shape.
- **The blink's shape** — rate, easing and how far it travels between the two
  shades, settled against a running board rather than guessed. Fast enough to
  read as a summons, slow enough to live with for a whole ply.
- **The static mark's shape** for the owed action, and its precedence against
  the existing marks: `SquareMark` holds one mutually-exclusive slot today, and
  a ship that owes an action can also be the selected one.
- **Whether the dampened shade generalising costs anything on an ordinary
  turn.** A pinned ship now reads as unmovable all game, which is honest but
  new; it wants a look by eye before it is settled.
- **How much of `applyMove` moves aside.** The end-of-turn sequence is
  substantial and belongs in its own module rather than growing `ply.ts`
  further.
