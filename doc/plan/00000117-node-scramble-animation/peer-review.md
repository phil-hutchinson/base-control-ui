# Peer Review — A Node scramble animation

## Summary

The branch makes `shuffleProspectiveSignals` report the prospective squares whose signal changed. It carries that list through `ActivityBonusClaimOutcome` into `ActivityBonusClaimedEffect.recoloredSquares`. `boardAnimations` turns the list into a new `node-recolor` square animation, and `NodeMarker` draws it as an old-colour underlay with dash-offset-swept new-colour rings that start at 12 o'clock. What a scramble does is unchanged: no draws or seed steps were added, and no ruleset file changed. The implementation follows the plan closely and the tests are thorough.

`npm run typecheck`: pass. `npm run lint`: pass. `npm test`: pass (92 files, 2053 tests). `npm run format:check` also passes.

Step 3 (the owner's manual check) is still pending and was not reviewed. The implementation plan includes a README check (Step 4, committed; no change needed, which is correct because the README mentions neither animations nor Node scramble).

## Comments

### Major

| #   | Status | Resolution | Location | Comment | Suggested Change | Code Snippet |
| --- | ------ | ---------- | -------- | ------- | ---------------- | ------------ |
| 1   | Fixed  | `signalsBeforeScramble` walks the event's effects in order and skips any square an earlier `node-abandoned` or `node-claimed` `newProspective`, or an earlier claim's `addedSquares`, made prospective; such a square appears in its final colour. Two `boardAnimations` tests cover the abandon and the fight-with-Additional-nodes cases. | [src/board/boardAnimations.ts#L187-L210](../../../src/board/boardAnimations.ts#L187-L210) | The plan says the sweep "should start from what was on screen before the event". That fails when the same move abandons a node and then claims a Node scramble, a case steal.md §10 describes explicitly ("a move that leaves a charged square and lands on a bonus planet… resolves the leave first"). `abandonNode` draws a fresh prospective square from ordinary board before the scramble runs (ply.ts: `node-abandoned` is pushed before `claimActivityBonus`), and the shuffle can then recolour that fresh square. Its `oldSignal` is the signal the abandon gave it, which was never drawn on the board. So the player sees an empty square show up in one colour and sweep to another, and the story's "sweeps from its old colour" doesn't hold for a square that had no colour. The same applies to a `node-claimed` `newProspective` in any event that also carries a scramble claim. No test covers this. | In `signalsBeforeScramble` (or the loop that consumes it), skip squares that an earlier `node-abandoned` / `node-claimed` effect in the same event named as `newProspective`, so they appear in their final colour like any other newly drawn square. If the owner prefers the current behaviour, record that as a decision in the plan instead. Either way, add a `boardAnimations` test with a `node-abandoned` effect ahead of the scramble claim. | `for (const { square, oldSignal } of claim.recoloredSquares) { … before.set(name, oldSignal); }` |

### Minor

| #   | Status | Resolution | Location | Comment | Suggested Change | Code Snippet |
| --- | ------ | ---------- | -------- | ------- | ---------------- | ------------ |
| 2   | Fixed  | Paragraph rewrapped to 80 columns. | [src/rules/activityBonus.ts#L329-L331](../../../src/rules/activityBonus.ts#L329-L331) | The edited doc comment was not rewrapped. One line runs to about 115 columns while the rest of the block wraps at 80. Prettier does not reflow comments, so `format:check` doesn't catch it. | Rewrap the paragraph to the file's usual width. | `* listing a square the shuffle left on its own signal); and the surviving bonus's square with its old and new kind,` |
| 3   | Fixed  | Kept, with a one-line comment: `--charging` and `--burning-out` are the same kind of unstyled test hook, so the three stay consistent. | [src/board/NodeMarker.tsx#L286](../../../src/board/NodeMarker.tsx#L286) | The plan doesn't mention the `node-marker--recoloring` class, and no stylesheet reads it; only `NodeMarker.test.tsx` queries it. Elsewhere this codebase comments a class that exists only as a query hook (e.g. the planet class in `BoardSquare.tsx`). Here nothing says so, so a later reader may look for a CSS rule that doesn't exist. | Add a one-line comment saying the class is only a query hook, or drop it and have the test check for the `.node-marker__recolor-sweep` circles instead. | ``className={`node-marker node-marker--${state} node-marker--recoloring`}`` |
