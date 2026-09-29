# Peer Review — Story 00000095, Tips on the start screen

## Summary

The branch adds a question-mark tip to every start-screen option group
(`OptionGroup`, `optionTips.ts`, `useTipDismissal.ts`), renames Scoring to
Node scoring, Planet resources to Planet effects and "time per move" to "time
per turn" across the start screen, Quick Guide, `README.md`, `CLAUDE.md` and
the ruleset (bumped to 0.44 with one changelog entry and `RULES_VERSION`
moved with it), and adds a browser-language spelling choice (`src/spelling/`)
applied to the Quick Guide, the tips and the board's announcement and square
names. The work matches the story and the plan closely. The plan's
deviations are recorded in the step Notes (the context module as a `.ts`
file with no separate provider; the renamed comments in the guide diagrams
and bonus cells). The plan includes a README step (Step 4), and it was
carried out.

Checks run from the repository root: `npm run typecheck` passes;
`npm run lint` passes with no findings; `npm test` passes (92 files, 2042
tests); `npm run format:check` passes.

Rules check: this story changes no rule logic. The ruleset edits are wording
only, and the version, `RULES_VERSION` and the changelog moved together in
one bump (0.43 to 0.44). No other file in `CLAUDE.md`, `CONTRIBUTING.md`,
`README.md` or the ruleset still says "planet resources" or "time per move".
None of the new source files cites a story, plan step or rejected approach.

## Comments

### Minor

| #   | Status | Resolution | Location | Comment | Suggested Change | Code Snippet |
| --- | ------ | ---------- | -------- | ------- | ---------------- | ------------ |
| 1   | Resolved | Replaced every "planet resources" in `src/` comments, test names and the two error messages (`gameState.ts`, `activityBonus.ts`) with "planet effects"; identifiers unchanged. No test asserted on the error text. | [src/rules/planetActivity.ts#L1](../../../src/rules/planetActivity.ts#L1) | About 40 source comments still call the setting "planet resources". Examples: `src/rules/planetActivity.ts`, `activityBonus.ts`, `gameState.ts`, `ply.ts`, `steal.ts`, `planetBonus.ts`, `src/useAppScreen.ts`, `src/bonus/PlanetBonusPanel.tsx`/`.css`, `bonusPanelSquares.ts`, `src/board/NodeMarker.tsx`, `RotatorMarker.tsx`, `nodeMarkerGeometry.ts`, `rotatorMarkerGeometry.ts` and `src/guide/GuideDiagram.tsx`. So do many test names (`activityBonusClaim.test.ts`, `fullGame.test.ts`, `seededReplay.test.ts`, `useAppScreen.test.tsx` and others) and two thrown error messages (`gameState.ts` about L505, `activityBonus.ts` about L397). CLAUDE.md's vocabulary split does not protect these comments. The split lets code use **activity** where players see the player-facing name; it does not let code keep a player-facing name that has been retired. After 0.44 the ruleset no longer contains "planet resources", so a comment such as "planet resources (steal.md §10)" points at a section now headed "Planet effects", and a reader who greps the ruleset for the term finds nothing. Nothing player-visible is affected: the error messages are developer-facing invariant errors. Step 3's Notes record leaving these alone deliberately, so this is drift, not an unrecorded deviation. | As a separate tidy-up commit on this branch, or as a recorded follow-up, replace "planet resources" in comments, test names and the two error strings. Use "planet effects" where the text cites the ruleset by its section name, and "the activity setting" elsewhere, in line with CLAUDE.md. Leave identifiers (`planetActivity` and similar) unchanged, as the story requires. If the owner would rather accept the drift, record that decision in the Resolution column. | `// The planet resources setting's own rules (steal.md §10): the six` |
| 2   | Resolved | Rewrapped the `StartScreen` doc comment. | [src/start/StartScreen.tsx#L133-L137](../../../src/start/StartScreen.tsx#L133-L137) | The component doc comment was edited in place without being rewrapped: the line ends early at "game. The" and the next sentence continues on the line below. | Rewrap the paragraph (Prettier does not rewrap comments). | `* only calls the matching handler — it dispatches nothing and starts no`<br>`* game. The`<br>`* Player-matching nodes group renders only while the node playstyle is` |
| 3   | Resolved | (b) Owner rewrote the Clock tip to "Each player has a total time for the whole game: the chosen time per turn, multiplied by the number of rounds. UNLIMITED means no clock."; `optionTips.ts`, `optionTips.test.ts` and `story.md` updated together. (a) Owner kept the CONTINUOUS tip as is: the simplified wording is intended; no change. | [src/start/optionTips.ts#L37](../../../src/start/optionTips.ts#L37) | Two tips, copied word for word from the owner-approved story, are looser than the ruleset and the UI. (a) CONTINUOUS says the next node to charge "rotates at the end of every turn", but rules.md §8.2 rotates the priorities only "at the end of every turn on which nothing charged"; when a node charges, the whole trio is replaced instead. (b) The Clock tip begins "When on", but the Clock group has no off choice: its choices are UNLIMITED, 6s, 4s and 2s. Neither is a code defect: the tips are explanatory copy, not rule logic, and they match `story.md` as required. The owner may still want to know before release. | Ask the owner whether to keep the simplified wording. If it changes, update `story.md` in place, `optionTips.ts` and `optionTips.test.ts` together. For example: "rotates at the end of every turn on which no node charges", and "Unless UNLIMITED, each player has a total time…". | `text: "The next node to charge rotates at the end of every turn.",` |
