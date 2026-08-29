# Story 00000031 — Ships may stay on any site

## Summary

A ship is no longer forced off a site that is not charged, and no longer
forbidden from stopping on one. Both halves of that go together:

- **A move may end anywhere a ship can reach.** Active, charged, dormant — the
  destination's site state stops mattering. Reach, a clear path and an empty
  square are the whole of the restriction.
- **A ship on a site that is not charged owes nobody anything.** It may stay
  for the rest of the game if its owner likes. The obligation that made its
  owner spend the next turn moving it clear is deleted outright, along with
  the word **stranded**.

Three things follow, and the story is mostly about getting them right:

- **A site can charge underneath a ship.** The charge draw does not look at
  occupancy, and a ship parked on an active site is standing there when it
  lights: it starts collecting immediately, without ever having travelled to
  it. This is deliberate — camping on a site that has built up pressure
  becomes a real thing to try.
- **Leaving a node still ends it (§8.7, unchanged).** What changes is the
  alternative: staying put is now always available, so spending a node by
  walking away is a genuine choice rather than the only way out of one.
- **A winning attacker's advance is limited by ships alone.** It stops for an
  occupied square and nothing else, so the ordinary case — taking the square
  the loser has left — now holds even when that square is not charged.

## Background & references

The ruleset is owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), currently **version 0.12**.
This story takes it to **0.13** — a gameplay change, so it earns a changelog
entry and a version bump (tagging remains on hold, per `CLAUDE.md`).

Planning documents say **ply** for the rules' and the UI's **turn**
(`CLAUDE.md`, Vocabulary).

What exists today:

- **`doc/ruleset/rules.md`** — §6's closing "may not **end** a move on a site
  that is not charged", §8.1's three state descriptions (two of which repeat
  it), §8.5 in full, §8.6 step 3's stranding, and §7's exclusion of
  non-charged squares from the winner's advance.
- **`src/rules/stranded.ts`** — `strandedShipIds`, `strandedObligationBinds`.
  The whole module is §8.5.
- **`src/rules/moveLegality.ts`** — the "§6-only" layer: `reachFrom`,
  `sixOnlyMoveRefusalReason`, `sixOnlyLegalDestinations`, and
  `MoveRefusalReason` with its `destination-active-site`,
  `destination-dormant-site` and `another-ship-stranded` members.
- **`src/rules/movement.ts`** — the public layer that adds the game-over check
  and §8.5's obligation on top of the §6-only one, plus
  `sideToMoveHasLegalMove` for the §5 pass guard.
- **`src/rules/combat.ts`** — the same two-layer split for §7
  (`sevenOnlyLegalTargets` against the public `legalTargets`), and
  `winnerAdvance`, which skips active and dormant candidates.
- **`src/rules/endOfTurn.ts`** — `ShipStrandedEffect`, raised in step 3
  alongside `node-ran-out`.
- **`src/board/`** — `Board.tsx`'s `owes-action` condition,
  `squareLabel.ts`'s `ShipCondition` and its "stranded, must move this turn"
  wording, and `announcements.ts`'s stranding announcement and its three
  refusal sentences.

The two-layer split in `movement.ts`/`moveLegality.ts` and in `combat.ts`
exists **because of** §8.5: `stranded.ts` needs to ask "does this ship have a
legal move" without the obligation answering its own question, and the §5
pass guard needs the same. With §8.5 gone, the only difference left between
the layers is the game-over check, so the split has lost its reason to
exist and should collapse rather than be left standing as scaffolding around
nothing.

## In scope

### 1. The rules edit, first and on its own

Version 0.12 → 0.13, with a changelog entry, in its own commit ahead of the
code.

**§6 loses its last paragraph.** "A ship may not **end** a move on a site that
is not charged. It may fly over one freely." is deleted. What remains is the
line, the range table, and the clear-path rule: a ship may end a move on any
square within reach that no ship occupies.

**§8.1's three states stop describing where a ship may stop.** Active,
charged and dormant now differ in what they produce and whether they are
eligible for the draw, and in nothing else:

- **Active** — eligible to be charged, but producing nothing.
- **Charged** — producing energy: a ship standing on it collects (§8.4) and
  gains shields (§4.1).
- **Dormant** — recovering after running out. Not eligible to be charged, and
  producing nothing.

**§8.2 says what happens when the draw picks an occupied site.** One
sentence, because it is now reachable and was not before: the draw does not
look at occupancy, so a site with a ship standing on it can be charged, and
that ship is holding a node from that moment — it collects at the end of its
owner's next turn and starts gaining shields, exactly as if it had moved onto
a node.

**§8.5 is rewritten, keeping its number.** The section keeps its place in the
numbering — renumbering §8.6 and §8.7 would churn the whole document and
every rule comment in `src/` for nothing — but its content is replaced. It
becomes the short statement of what standing on a site that is not charged
means: it is allowed, it is ordinary, it pays nothing and grants no shields,
and a ship may stay as long as its owner wishes. It states the one case that
used to be a penalty — a node running out under the ship holding it — as
what it now is: the node simply stops paying, and the ship stays or leaves as
its owner prefers. The tail-cost paragraph goes with the rest.

**§7 loses the site exclusion from the advance.** "May legally end on" was
already §6's restriction; §6's restriction is now occupancy alone, so the
parenthetical "not a site that is not charged (section 8.5)" is deleted and
the surrounding sentences simplified. The attacker takes the loser's square
unless a ship is in the way — which, as today, can be the beaten ship's own
return bay landing on the lane. §7's aside about attacking "a ship stranded
on a site that is not charged" is reworded: the site a target stands on has
never mattered, and now there is no such thing as a stranded ship.

**§8.6 step 3 stops stranding.** A node that reaches capacity goes dormant;
any ship standing on it keeps standing there, collecting nothing.

**§5 keeps its pass guard as written.** The obligation was never the reason a
player might have no legal action; removing it only makes "no legal action"
rarer.

Elsewhere: §3.1's bays, §4.1's shields, §8.3's drain tables, §8.4's energy
table, §8.7's vacating rule and Appendix B are all untouched. The word
"stranded" should not survive anywhere in the document.

### 2. Move legality loses its site check, and its second layer

`moveLegality.ts` drops the destination site-state check entirely, and with
it the `destination-active-site` and `destination-dormant-site` refusal
reasons. `another-ship-stranded` goes too. What is left of a refusal is: not
your ship, already acted, out of range, path blocked, destination occupied,
game over.

`stranded.ts` and `stranded.test.ts` are deleted.

The §6-only/public split then collapses. The end state should be **one**
module answering §6 — reach, refusal reason, legal destinations — with the
game-over check where it belongs and no "six-only" variant left over, and the
§5 pass guard reading whichever function that leaves. Whether the surviving
module is `movement.ts` with `moveLegality.ts` folded into it, or the reverse,
is the plan's call; what the story asks for is that no pair of near-identical
functions survives whose only difference is a rule that no longer exists. The
module comments explaining the split are rewritten rather than left describing
a shape that is gone.

`actions.ts`'s `sideToMoveHasLegalAction` and `shipHasLegalAction` keep their
jobs, reading whatever the collapse leaves them.

### 3. Combat follows

`combat.ts` gets the same treatment: `winnerAdvance` stops skipping active
and dormant candidates and considers only occupancy, and the `§7-only`/public
split collapses on the same terms as §6's, keeping the game-over check.
`another-ship-stranded` disappears from the attack refusal reasons.

The interesting case to get right and to test: an attacker that beats a
defender standing on a **dormant or active** site now advances onto that
square, where before it held its ground. And a fight over a charged node is
unaffected — §8.7's "changes hands intact" still holds, because the advance
still happens.

### 4. The board and the words on it

- `Board.tsx` drops the `owes-action` condition and its amber marker;
  `no-action` stays as it is.
- `squareLabel.ts` drops `owes-action` from `ShipCondition` and its "stranded,
  must move this turn" wording. `ShipCondition` becomes a single-member type;
  if that reads better as an optional boolean the plan may say so, but the
  wording table is the thing that must not keep a dead entry.
- `announcements.ts` drops the `ship-stranded` clause and the
  `another-ship-stranded`, `destination-active-site` and
  `destination-dormant-site` rejection sentences. The "node at X ran out"
  announcement stays exactly as it is — it is still the thing a player needs
  to hear, and it is now the whole of the news.
- `endOfTurn.ts` drops `ShipStrandedEffect` and stops raising it.

Nothing about site or ship **artwork** changes. A ship standing on an active
or dormant site sits on that site's artwork, and that is enough to see what
it is standing on.

### 5. Tests, `README.md` and the ledger

`README.md` states the removed rules twice, and both go:

- "A ship can only stop on a site that is already lit." — deleted, and worth
  replacing with the fact that a ship may stop anywhere it can reach and may
  sit on a site waiting for it to light.
- "A ship still standing on a node that has just run out has to be moved
  clear, and that is what its owner's next turn is spent on." — deleted; the
  ship may stay as long as it likes.

Run `/update-readme` for the rest of the diff. `CLAUDE.md` needs nothing: no
vocabulary changes, and "stranded" was never in its glossary.

Tests: `stranded.test.ts` goes; `movement.test.ts`, `combat.test.ts`,
`ply.test.ts`, `actions.test.ts`, `endOfTurn.test.ts`, `announcements.test.ts`,
`Board.test.tsx`, `squareLabel.test.ts` and `fullGame.test.ts` are updated
where they assert the removed rules. `seededReplay.test.ts`'s recorded
expectations move only if the number of draws per ply moves — this story
draws no new randomness and removes none, so a changed expectation there is a
signal worth reading, not a number to update blindly.

Per the accessibility section of `CLAUDE.md`, existing automated tests are
updated where the path is straightforward and no plan step is added for
testing accessibility. Nothing is expected for
`doc/plan/00000021-accessibility-tech-debt/known-issues.md` here — the
announcement and the accessible-name wording that go away describe a state
that no longer exists — but if the implementation does cost an accessible
behaviour, record it there.

## Out of scope

- **Excluding occupied sites from the charge draw.** Considered and decided
  against: a site charges under whoever is standing on it.
- **Any penalty for camping**, and any balance retune of drain, recovery,
  pressure or energy. Sitting on a spent site all game is now legal and cheap;
  whether it is *good* is a play-testing question, and if it turns out to be
  too good that is a later story with numbers in it.
- **§8.7.** Leaving a charged node still ends it, on exactly today's terms.
- **Penalising a ship that fails to vacate** — anticipated by story 29's
  capacity leeway, and now clearly a separate decision rather than a
  follow-on, since this story removes the obligation it would have built on.
- **Movement ranges, combat maths, bays, shields, energy values, the site
  layout, game length** — untouched.
- **Artwork, animation and transitions** of any kind.

## Verification

- `RULES_VERSION` agrees with `rules.md` at 0.13, the changelog has an entry,
  and the word "stranded" appears nowhere in `rules.md`, `README.md` or
  `src/`.
- A ship may end a move on an active site, on a dormant site and on a charged
  site, given reach, a clear path and an empty destination — and the refusal
  reasons for the first two no longer exist.
- A ship standing on a site that is not charged collects no energy and gains
  no shields, and its owner may take any action they like on the following
  turn, including moving a different ship, attacking, or leaving it where it
  is indefinitely.
- A node that reaches capacity under a ship goes dormant, the ship stays put,
  and no obligation is raised — no announcement, no board marker, no refusal
  when the owner moves another ship next turn.
- A ship parked on an active site that the draw then charges is holding a
  node: it collects at the end of its owner's next turn and gains a shield,
  with no move of its own in between.
- A ship parked on a dormant site is still there when the site recovers to
  active, and still there if the draw then charges it.
- An attacker that beats a defender standing on an active or dormant site
  advances onto that square.
- A fight over a charged node still changes hands intact, a drawn fight
  still ends it, and an advance blocked by the beaten ship's return bay still
  leaves it empty and dormant (§8.7 regression cover).
- A ship that moves off a charged node onto a dormant site ends the node it
  left, and stands on the dormant site it arrived at.
- The §5 pass guard still works: a side with no legal move and no legal
  target passes, and the end-of-turn sequence runs for the passed turn in
  full.
- The same opening seed and the same sequence of actions produce the same
  game every time.
- `fullGame.test.ts` and `sitePool.test.ts` pass unchanged in premise —
  neither the pool arithmetic nor Appendix B moves.
- Typecheck, lint and the full test suite pass, with no dead exports left
  behind from the collapsed layers.
