# Story 00000006 — Shields

## Summary

Ships carry shields, and you can see how many. A ship gets a shield count in
the game state, drawn on the board as quarter-circle arcs around its hull and
spoken as part of the square's accessible name.

Nothing gains or loses a shield yet. Every ship still starts the game on 0, and
there is still no movement, no combat and no node to sit on. This story puts
the number on the ship and shows it; the rules that make it move up and down
come later.

The arcs need room, so the board is resized: squares get a larger minimum, lose
their maximum entirely, and are sized from the space the board is actually
given rather than from the viewport.

## Background & references

Story 00000001 drew the static starting board and deliberately left shields
out: "no shield count is displayed and no shield logic exists; the board's
design should simply leave room for one later." This is that story.

The rules are owned by this repository:
[`doc/ruleset/rules.md`](../../ruleset/rules.md), **version 0.1**. The section
this story implements is:

- **§4.1 Shields** — a ship carries between 0 and 4 shields.

Shields appear in four other places in the rules, and **all four are out of
scope** because each depends on machinery that does not exist yet: §4.1's
gain-a-shield-on-a-node (needs nodes), §6's movement table (needs movement),
§7's combat arithmetic (needs combat), and §3.1's bay reset (needs movement).
Each gets its own story.

**This story does not add or change any rule.** The one exception is a small
cross-reference fix the owner directed at peer review: §4.1 cited the wrong
section numbers for combat and movement, and correcting that bumped
`RULES_VERSION` and added a changelog entry. Nothing about how the game is
played changed, so it earns no `/tag-rules` run.

### Why every ship starts on 0

[Appendix A](../../ruleset/rules.md#appendix-a--open-items) item 1 leaves
starting shields open, noting they are "likely to vary by starting bay". The
owner explored that during this story's discussion and **rejected it for now**.
The item stays open; the reasoning is recorded here so it does not have to be
re-derived.

A varying assignment was drafted and works geometrically. Seven values per
fleet, mirrored across the board's centre file and rotated a half-turn for the
opposing fleet:

| Shields | Red      | Green    |
| ------- | -------- | -------- |
| 4       | H1       | H15      |
| 2       | A10, O10 | O6, A6   |
| 1       | D15, L15 | L1, D1   |
| 0       | A2, O2   | O14, A14 |

Walking either fleet's bays around the edge gives `1, 2, 0, 4, 0, 2, 1` — a
palindrome centred on the 4, so each fleet is mirror-symmetric about the H file
as well as being the half-turn rotation of its opponent, satisfying Appendix A's
constraint that bays a half-turn apart must match.

It was rejected on rules grounds, not aesthetic ones. §3.1 strips every shield
from a ship that ends a move in a bay, and §4.1 grants shields only for
standing on a node. A ship that starts with shields can therefore never get
those starting shields back — the value is not a starting _level_ but a
one-time endowment sitting outside the game's economy from the first turn, and
distinguishable from an earned shield only by history.

A "flagship" variant was also considered: remove the two central bays and start
those two ships on the board at full shields. This founders on §7.1. Fourteen
ships would share twelve bays, so the guarantee that a returning ship always
finds an empty bay fails as soon as twelve ships are parked and a thirteenth
loses a fight. Restoring it would need a new rule for displacing ships from
bays — a large amount of machinery bought for one opening flourish.

### What is already in place

- `src/rules/fleet.ts` holds `FleetEntry` (`square` + `side`) and the starting
  fleet. It has no notion of a ship's state.
- `src/board/ShipIcon.tsx` draws a side-coloured silhouette filling roughly 70%
  of its 100 x 100 viewBox, with a comment reserving **the corners** for a
  future shield count. The arcs are a ring, not corners, so that reservation
  and the 70% figure are both superseded by this story.
- `src/board/squareLabel.ts` builds accessible names as comma-separated
  segments: square name, `bay`, then `green ship` / `red ship`.
- `src/board/Board.css` sizes every square with `clamp(24px, 4vmin, 42px)`.

## In scope

1. **Shields in the game state.** A ship carries a shield count, constrained to
   the 0–4 range §4.1 states. The starting fleet sets every ship to 0.
2. **The arc visual.** A ship's shields are drawn as **90° arcs in a ring
   around the hull**, filled in a fixed order, clockwise from the top right:

   | Shields | Arcs drawn                                     |
   | ------- | ---------------------------------------------- |
   | 0       | none                                           |
   | 1       | top-right                                      |
   | 2       | top-right, bottom-right                        |
   | 3       | top-right, bottom-right, bottom-left           |
   | 4       | top-right, bottom-right, bottom-left, top-left |

   The arcs are the same colour as the ship, and there is a **visible gap
   between adjacent arcs**, so that even a full set of four reads as four
   separate quarter-circles and never closes into a solid ring.

   **Unlit positions are not drawn.** A 3-shield ship shows three arcs and a
   space, not three arcs and a faint fourth. The squares are busy enough
   already, and reading the count is a mechanic a player picks up quickly.

3. **Shields in the accessible name.** Every occupied square's accessible name
   states the occupant's shield count, with correct singular and plural, and
   states it **even when the count is zero** — a screen-reader user hears one
   square at a time and cannot tell a silent zero apart from an app that does
   not report shields at all. This is why the visual and the spoken name differ
   here: the eye takes in the whole board at once, the ear does not.
4. **Room for the arcs.** The ship silhouette shrinks so the arc ring fits
   inside the square without touching its neighbours, and the board's squares
   get a **larger minimum size** so the arcs stay legible at the smallest
   supported board.
5. **A board that fills the space it is given.** The square-size **maximum is
   removed**, and the size is derived from the board's own container rather
   than from viewport units: the board stays square and grows until it runs out
   of room horizontally or vertically, whichever comes first.
6. **A temporary fixture for manual verification.** Because every ship starts
   on 0, nothing on screen would exercise counts 1–4. The implementation
   temporarily assigns varying shield counts to the starting fleet so the
   visual can be checked by eye, and **the final step of the plan removes
   them**, returning every ship to 0.

## Design decisions & constraints

- **The rules are not touched, beyond a peer-review cross-reference fix.**
  Nothing here changes what §4.1 means; the one edit `rules.md` receives is
  correcting its two wrong section citations, directed by the owner at peer
  review. Appendix A item 1 stays open, deliberately.
- **The count is carried by position, not colour.** The arcs are ship-coloured,
  so colour still distinguishes the two sides (alongside hull shape) and never
  has to carry the count as well. Which arcs are lit is what says how many —
  legible in greyscale, consistent with `src/index.css`'s standing note that
  the sides must stay tellable apart to a colour-blind viewer.
- **Which arcs light for a given count is logic, not markup.** Per
  CONTRIBUTING.md, that mapping belongs in a plain, unit-tested module, not in
  conditionals inside `ShipIcon`. It is a pure function of one small integer
  and should be tested as one.
- **Coverage must survive the fixture's removal.** Automated tests exercise
  counts 0 through 4 by rendering a ship at each count directly. Nothing that
  matters should be asserted against the doctored starting fleet, because that
  fixture is deleted in the last step and would take the coverage with it.
- **The board is sized from its container, not the viewport.** `4vmin` cannot
  know what else is on screen, so it will be wrong the moment a score tracker
  or move counter appears beside the board. Sizing from the container is
  correct now and stays correct then, and it needs no JavaScript.
- **No speculative layout.** The board fills the space available today. This
  story does not add slots, panels or placeholders for chrome that has not been
  designed — a future story that introduces a score tracker decides its own
  layout.
- **Manual verification comes before the revert.** The plan must schedule the
  "does it look right" gate while the temporary shield counts are still in
  place. A revert step scheduled earlier leaves nothing to look at.
- **Node visuals are somebody else's problem.** How arcs sit against awake,
  live or spent sites is explicitly not considered: no site is drawn today, and
  the owner intends to redesign node visuals in a later story.

## Out of scope

- **Gaining and losing shields.** §4.1's shield-per-turn-on-a-node, §8.7's
  end-of-turn order, §3.1's bay reset, and §7's combat costs. No shield count
  ever changes during play in this story.
- **Movement by shield count.** §6's table, where each shield shed unlocks a
  further movement option. Nothing moves yet.
- **Combat.** §7 entirely — who wins, what a win costs, the equal-shields
  double return, and the §7.1 bay return order.
- **Starting shields.** Appendix A item 1 stays open. Every ship starts on 0,
  and the flagship variant is set aside, not adopted.
- **Sites and nodes.** No site positions (Appendix A item 1), no node state, no
  node visuals.
- **Turns, rounds and influence.** §§5, 8.4 and 9.
- **Any other chrome.** Score tracker, move counter, turn indicator and the
  like. The layout work here is confined to how the board sizes itself.
- **Any backend.** The app stays a static, front-end-only SPA.

## Verification

Automated (must be green before sign-off): `npm run typecheck`, `npm run lint`,
`npm test`, `npm run format:check`, `npm run build`.

Automated tests should cover, at minimum:

- the shields-to-arcs mapping for every count from 0 to 4, including that the
  fill order is the one tabled above;
- that a ship rendered at each count from 0 to 4 draws the expected arcs;
- the accessible-name wording, including the singular form at 1 and the
  explicit zero case;
- that the starting fleet is entirely on 0 shields **after** the final step.

**Manual gates** — the plan should schedule these; anything about how the board
looks is checked by hand:

1. **The arcs look right** — with the temporary counts in place, and therefore
   scheduled before the step that removes them. `npm run dev`, open
   `localhost:5273`. Arcs appear in the tabled positions and order, the gaps
   between them are clearly visible, a full set of four does not read as a
   closed ring, and the arcs are unmistakably the ship's colour. Ships and arcs
   are legible at the smallest supported square size and never overlap a
   neighbouring square.
2. **The board sizes properly.** Resizing the window grows and shrinks the
   board; it stays square, has no upper limit, hits whichever edge comes first,
   and produces no scrollbars or clipping at ordinary desktop sizes.
3. **Screen reader.** Moving across squares announces the shield count in
   wording that makes sense read aloud, including on a ship with none.
4. **After the revert.** The board is back to fourteen ships with no arcs at
   all, and nothing else about it has changed.

## Open items to resolve at plan time

- **Arc geometry** — radius, stroke thickness, the gap angle between arcs, and
  how far the hull has to shrink to make room. These are interdependent and
  best settled together against a running board.
- **The new minimum square size**, and what should happen on a viewport too
  small to honour it — scroll, or accept illegibility.
- **Exact accessible-name wording** for the shield count, including the zero
  case, and where it sits among the existing segments.
- **Whether the ship model grows into a proper `Ship` type** or shields ride on
  the existing `FleetEntry`, given nothing yet mutates a ship.
- **Whether the arcs live inside `ShipIcon`'s viewBox** or are drawn by a
  sibling element, and what becomes of `ShipIcon`'s corner-reservation comment
  and its 70% sizing.
- **How the temporary fixture is expressed** so that removing it is a clean,
  self-contained final step rather than an unpicking exercise.
