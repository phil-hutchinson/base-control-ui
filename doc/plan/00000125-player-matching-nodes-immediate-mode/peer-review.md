# Peer Review — Story 00000125, Player-matching nodes: Immediate

## Summary

The branch adds a fourth player-matching setting, **immediate**, under steal.
It does this in eight committed steps: ruleset 0.46 (`rules.md`, `steal.md`,
changelog and `RULES_VERSION` all moved together in their own commit, ahead of
the code), the rules layer (signal count, opening deal, Additional nodes, Node
scramble, the point-table rows, setup validation), landing resolution and its
payment, the start screen (Player-matching above Charged nodes, 5 disabled and
resolved to 4 without losing what the player picked), the board/HUD/announcement
wiring, the Quick Guide section and diagram, and `README.md`. The rule logic
matches steal.md §9 "Immediate" and the §1/§6/§7/§10 exceptions as written:
leave before land, paying from the post-leave board, ×3 simple / ×2 bonus via
`energyForNodesHeld`, one draw anchored on the landed square or none when an
extra is used up, out of time paying 0. The story, plan and ruleset agree with
one another. The owner decisions given for this review are carried through as
recorded: out of time still crosses held pips, 5 is greyed out rather than
hidden, and immediate borrows the required point-table rows. No correctness
problems were found. The findings are small wording, test-title and
validation-noise items.

Tooling at review time: `npm run typecheck` passed with no errors, `npm run lint`
passed with no findings, and `npm test` passed (98 files, 2263 tests).
`npm run format:check` is also clean. The plan includes a README step (Step 7),
and it was carried out. Source comments follow the comment convention: no story
numbers, plan-step citations or rejected-approach narration were added. The one
provenance note added to `guideCopy.ts` ("approved as drafted by the owner")
follows that file's established pattern. The new `immediate-node-landed` effect
and the `not-allowed-with-player-matching` setup problem kind add to the core's
public contract. D8 records this, and the online-play server will need a new
core release to see them. That is a hand-off item, not a defect.

## Comments

### Minor

| #   | Status | Resolution | Location | Comment | Suggested Change | Code Snippet |
| --- | ------ | ---------- | -------- | ------- | ---------------- | ------------ |
| 1   | Resolved | Reworded the paragraph's last sentence in `src/guide/guideCopy.ts` to "Under IMMEDIATE, the Charged nodes choice counts only the other nodes, not the red and green ones." Updated `guideCopy.test.ts`'s matching assertion and the header comment's provenance note to record the owner's rewording. | [src/guide/guideCopy.ts#L172-L173](../../../src/guide/guideCopy.ts#L172-L173) | The IMMEDIATE NODES paragraph says the Charged nodes choice "counts only your other nodes". The nodes it counts are the ordinary nodes, which belong to neither player, so "your other nodes" reads as if they were the player's own. That contradicts the PLAYER-MATCHING NODES framing, where only the red and green nodes are "yours". The owner approved this copy, so this is raised only for a second look. | Something like "counts only the other nodes, not the red and green ones", which matches README's "leaves red's and green's out". Change it only if the owner agrees. | `"paying anyone. Under IMMEDIATE, the Charged nodes choice counts " + "only your other nodes."` |
| 2   | Won't fix | Owner chose to leave the Charged nodes tip as is; the greyed-out 5 and the IMMEDIATE NODES guide section already cover it. | [src/start/optionTips.ts#L60-L62](../../../src/start/optionTips.ts#L60-L62) | Under IMMEDIATE, the Charged nodes tip still says "The number of charged nodes on the board at any time." The 5 is greyed out and the number no longer includes red and green, but nothing near the control explains either. The story only asked for the Player-matching tip to change, so this is a gap in coverage, not a deviation. (The tip was already loose under steal before this story.) | Consider adding a sentence to the Charged nodes tip, e.g. "Under IMMEDIATE, this counts only the nodes that are not red or green, and 5 is not offered." Or leave it as is if the owner prefers the guide to carry this. | `chargedNodeCount: { intro: "The number of charged nodes on the board at any time." },` |
| 3   | Resolved | Reordered the `it.each` title template to `"under %s, holding %d nodes pays %d"`, matching the row order. | [src/rules/ply.test.ts#L1754-L1760](../../../src/rules/ply.test.ts#L1754-L1760) | The `it.each` rows are `[scoring, heldCount, expectedAmount]`, but the title template is "holding %s nodes under %s pays %d". The titles therefore come out as "holding simple nodes under 1 pays 3". | Change the template to `"under %s, holding %d nodes pays %d"`, or reorder the row tuples. | `it.each([["simple" as const, 1, 3], ...])("holding %s nodes under %s pays %d", (scoring, heldCount, expectedAmount) => {` |
| 4   | Resolved | Retitled to "IMMEDIATE: prices the held ordinary nodes exactly as OFF does — no own node, nothing withheld (steal.md §9)". | [src/rules/energy.test.ts#L447](../../../src/rules/energy.test.ts#L447) | The test title ends "so standing on nothing counts as its own", which does not describe what the test asserts. The test checks that there is no own node, nothing is withheld, and two held nodes are priced as OFF would price them. | Retitle, e.g. "IMMEDIATE: prices the held ordinary nodes exactly as OFF does — no own node, nothing withheld (steal.md §9)". | `it("IMMEDIATE: prices exactly the held ordinary count, like OFF — an immediate node is never charged, so standing on nothing counts as its own (steal.md §9)", ...` |
| 5   | Resolved | `src/core/setup.ts`'s `chargedNodes` cross-check now also skips when `playstyle` is an offered value other than `"steal"`, mirroring the playstyle cross-check's own skip; the doc comment above `parseSetup` was updated to match. Added the suggested `setup.test.ts` case (`{ playstyle: "planet", playerMatching: "immediate", chargedNodes: 5 }`, with `planetActivity: "off"` so only the one problem is reported) asserting only `not-allowed-with-playstyle` on `playerMatching`. | [src/core/setup.ts#L196-L213](../../../src/core/setup.ts#L196-L213) | The `chargedNodes` cross-check runs whenever the raw `playerMatching` value is an offered setting, even when `playstyle` is not steal. An input of `{ playstyle: "planet", playerMatching: "immediate", chargedNodes: 5 }` therefore reports two problems. One (`not-allowed-with-playstyle` on `playerMatching`) is the real problem. The other (`not-allowed-with-player-matching` on `chargedNodes`) only follows from it, because player-matching is not in force there. This matches the letter of D9, which only skips the check for a missing or unoffered setting. | Also skip the check when the peeked `playstyle` is offered and is not `"steal"`, mirroring how the playstyle cross-check is skipped. Add a `setup.test.ts` case for it. | `const peekedPlayerMatching = isPlayerMatchingSetting(record.playerMatching) ? record.playerMatching : undefined;` |
| 6   | Resolved | Reflowed both paragraphs by hand to the documents' usual width (line breaks only, no wording change, no version bump). The changelog's break was placed to avoid starting a continuation line with "20." — a number followed by a period at that indent reads to Prettier's markdown parser as a new ordered-list item, which it then rejoins into the original over-length line; confirmed `format:check` stays clean with the chosen break points. | [doc/ruleset/changelog.md#L41](../../../doc/ruleset/changelog.md#L41) | Two prose lines added to the ruleset run well past the 80-column wrap that the surrounding text keeps. Prettier accepts this because prose wrapping is preserved. Changelog line 41 is about 150 characters, and the same applies to [steal.md#L461](../../../doc/ruleset/steal.md#L461). This is cosmetic only, but it makes the source diff harder to read. | Reflow both paragraphs by hand to the documents' usual width. If this lands on the branch, it folds into the 0.46 entry with no version change. | `pays 3, 6, 9 or 12 for one through four nodes held, bonus pays 2, 6, 12 or 20. Holding no nodes pays nothing, but the node still moves. A player who` |
