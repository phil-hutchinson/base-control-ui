# Peer Review — Story 00000080, A third unit of fuel buys a longer move

## Summary

The branch adds three shapes to `rules.md` §6 at cost 3 (three squares
orthogonally, two squares diagonally, and the long knight), bumps the ruleset
to 0.33 with a matching `RULES_VERSION` and one changelog entry, generalises
the L's corner pair into a list of passed-over offsets so the long knight can
carry five, derives the guide's movement diagram extent from the cost table,
reprices the three refusal announcements, and updates the README. The geometry
is correct: all eight long-knight offsets and all forty of their passed-over
entries match §6 and the plan's sign rule in every orientation, the straight
rows clip and collect their intermediate squares through the existing loop, and
no file outside `movement.ts` needed a behavioural change — confirming the
plan's claim that §6 lives in one place.

Verification from the repository root: `npm run typecheck` **clean**,
`npm run lint` **clean**, `npm test` **green (64 files, 1208 tests)**.
`npm run format:check` reports only the two pre-existing warnings
(`doc/plan/00000069-retire-actions/story.md`, `src/board/planetArt.ts`) — the
`src/rules/movement.test.ts` warning flagged in Step 9's Notes is no longer
present. No test was weakened: every invalidated assertion was repaired at the
assumption (the combat out-of-range target moved from a now-legal square to a
genuinely unreachable one, the reach test split 2-power from 3-power rather
than loosening its expectation, and `recovery.test.ts` gained a 3-power check
rather than just a reworded comment). All findings below are Minor.

## Comments

### Minor

| #   | Status   | Resolution                                                                                                                                                                                                                                                                                                     | Location                                                                         | Comment                                                                                                                                                                                                                                                                                                                                           | Suggested Change                                                                                                                                                                                     | Code Snippet                                                                                                           |
| --- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Resolved | Dropped the `(D3)`, `(D6)` and `(D5)` parentheticals from the four test titles in `movement.test.ts` and the "the case D5 warns is easiest to get wrong" phrasing in `combat.test.ts`, keeping the behavioural description and the §6 citation in each.                                                        | [src/rules/movement.test.ts#L378](../../../src/rules/movement.test.ts#L378)      | Test titles and a comment cite the implementation plan's decision identifiers — `(D3)` at L378, `(D6)` at L385, `(D5)` at L594 and L638, and "the case D5 warns is easiest to get wrong" in `src/rules/combat.test.ts#L478`. `CONTRIBUTING.md` ("Comments") forbids references to plan steps or decisions in source; that belongs in `doc/plan/`. | Drop the parenthetical identifiers and keep the substance, which already stands on its own — the titles and comments describe the behaviour and cite `rules.md` §6, which is the durable reference.  | `it("...exactly as §6 names them (D3)", () => {`                                                                       |
| 2   | Resolved | Corrected the bullet in `story.md` to "one, two or three", with the one-line reason that the sentence counts where the ship ends up, not the length of the walk.                                                                                                                                               | [doc/plan/00000080-increased-movement/story.md#L118](story.md#L118)              | `story.md`'s In-scope bullet still says §6's opening sentence "moves one, two, three or four", but the shipped sentence says "one, two or three squares" (the settled decision to count where the ship lands). Step 1's Notes states the decision is "recorded in `story.md`" — it is not; the story was never corrected in place.                | Correct the bullet in `story.md` to "one, two or three", with the one-line reason (the sentence counts where the ship ends up, not the length of the walk), so the story matches what was built.     | `It moves one, two, three or four, in the shapes the table gives.`                                                     |
| 3   | Resolved | Updated the bullet in `story.md` to say the attacker pays 3 and lands empty, then gains at the lone-charger rate in the same turn's end-of-turn step, ending at 2, matching `combat.test.ts`.                                                                                                                  | [doc/plan/00000080-increased-movement/story.md#L242](story.md#L242)              | `story.md`'s Verification bullet says a 3-power long-knight attacker "arrives on a planet with 0 power". The implemented and now-pinned behaviour is that the same turn's end-of-turn charge (§8.6 step 1, lone-charger rate) lifts it to 2. Step 6's Notes records the deviation, but the story still asserts the old figure.                    | Update the bullet to say the attacker pays 3 and lands empty, then gains at the lone-charger rate in the same turn's end-of-turn step, ending at 2 — matching `combat.test.ts`'s assertion.          | `A ship at 3 power can attack an enemy at long-knight range and arrives on a planet with 0 power`                      |
| 4   | Resolved | Reworded the doc comment in `movementCosts.ts` to group the sixteen cost-3 destinations by price: four three squares orthogonally, four two squares diagonally, eight long knight.                                                                                                                             | [src/guide/movementCosts.ts#L25-L34](../../../src/guide/movementCosts.ts#L25)    | The doc comment calls the cost-3 group "the sixteen three-square shapes — four straight orthogonally, four straight diagonally, and eight long knight". Two squares diagonally is a two-square shape; the group is defined by price, not distance, so the sentence mis-describes four of its sixteen members.                                     | Reword to group by price: "the sixteen squares that cost 3 — four three squares orthogonally, four two squares diagonally, and eight long knight".                                                   | `the sixteen three-square shapes — four straight orthogonally, four straight diagonally, and eight long knight — at 3` |
| 5   | Resolved | Rebuilt `actual` from `allShapesFrom(origin)`'s cost-3 entries whose offset has one component of 1 and one of 3, rather than from the test file's own literal table; confirmed a flipped sign in `LONG_KNIGHT_OFFSETS` makes the test fail, then reverted the mutation and confirmed the suite is green again. | [src/rules/movement.test.ts#L344-L376](../../../src/rules/movement.test.ts#L344) | "has exactly the eight offsets (±3, ±1) and (±1, ±3)" builds `actual` from the test file's own `EXPECTED_LONG_KNIGHT_DESTINATIONS` and compares it with a literal list in the same file, so it exercises no production code and cannot fail on a change to `LONG_KNIGHT_OFFSETS`. (The geometry is pinned by the neighbouring tests.)             | Derive `actual` from production — e.g. the cost-3 entries of `allShapesFrom(origin)` whose offset has an absolute component of 3 — so the test fails if a ninth offset appears or a sign is flipped. | `const actual = new Set(EXPECTED_LONG_KNIGHT_DESTINATIONS.map(...))`                                                   |
| 6   | Resolved | Reworded both README sentences to name the 3-power threshold instead of "a full ship": "a ship carrying 3 or more can reach any of thirty-six squares" and "a ship with 3 to spend can strike from three squares away".                                                                                        | [README.md#L14-L22](../../../README.md#L14)                                      | The README attributes the new reach to "a full ship": "a full ship can reach any of thirty-six squares" and "a full ship can strike from three squares away". Three power is the threshold, not six, so a player may read a full tank as the requirement for the long shapes.                                                                     | Say the threshold instead — e.g. "a ship carrying 3 or more can reach any of thirty-six squares around it" and, for attacks, "a ship with 3 to spend can strike from three squares away".            | `a full ship can reach any of thirty-six squares around it in a single move`                                           |
| 7   | Resolved | Extended `ReachEntry`'s doc comment to describe the long knight's five passed-over squares (the run along the long axis, near to far, then the two offset squares) alongside the L's two corners.                                                                                                              | [src/rules/movement.ts#L258-L263](../../../src/rules/movement.ts#L258)           | `ReachEntry`'s doc comment still describes `passedOver` only in terms of the L ("The L's `passedOver` carries both of its corners, orthogonal corner first") now that a second leap shape carries five. It is not false, but it no longer describes the field's full contract.                                                                    | Add the long knight to the sentence: the L carries its two corners (orthogonal first), the long knight its five — the run along the long axis, near to far, then the two offset squares.             | `The L's `passedOver` carries both of its corners, orthogonal corner first.`                                           |

## Checks made that raised nothing

- **Geometry against `rules.md` §6.** All eight `LONG_KNIGHT_OFFSETS` entries
  and their five passed-over offsets match §6's sign rule in all four
  orientations; from H8 the destinations and passed-over squares work out to
  exactly the document's worked example (K9 over I8, J8, K8, I9, J9, with H9
  absent), and the mirrored cases resolve correctly (E9 over G8, F8, E8, G9,
  F9; I11 over H9, H10, H11, I9, I10; I5 over H7, H6, H5, I7, I6). Every
  passed-over offset lies inside the rectangle spanned by origin and
  destination, so the board-edge invariant guard cannot fire.
- **Rules bookkeeping.** `rules.md` 0.33, `RULES_VERSION` "0.33" and a single
  `## 0.33` changelog entry moved together in one commit ahead of the code; the
  changelog's description (three shapes at 3, twenty to thirty-six, the five
  blocking squares with H9 excluded, attack range following §6, nothing
  retuned) matches both the document and the implementation. No surviving
  "twenty" in `rules.md` claims anything but 2-power reach.
- **README step.** The plan includes one (Step 9), and it was carried out.
- **Announcements.** All three recitals match the seven-row table, describe the
  long knight rather than naming it, and their test assertions were updated to
  the same literal strings.
- **Plan adherence.** Every step is `committed` with Notes; the three
  deviations recorded (a prettier fix in Step 1, the post-attack charge value
  in Step 6, the extra long-range target-protection tests in Step 6) are each
  justified in place, and the `movement.test.ts` formatting warning flagged in
  Step 9 is no longer present.
