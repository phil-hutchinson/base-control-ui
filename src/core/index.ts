// Base Control's core: the rules, packaged for use outside the app — a
// server applies a ply exactly as the browser does, from the same
// commit. Everything reachable from here is the agreed contract between
// this repository and the online-play server; nothing else in `src/rules/`
// is exported.
//
// Three guarantees the server relies on:
// - `startGame` and `applyPly` never change the state passed in; they
//   return a new one.
// - Their results depend only on their arguments: no clock, no
//   `Math.random`, no module-level state carried between calls. One
//   long-lived process can run many games side by side.
// - The one stateful object is the `RandomSource` handed in. `seededRandom`
//   is made once per game and passed to `startGame` and every `applyPly` in
//   turn; `recordedRandom` is made fresh per call, since it must throw if
//   any of its draws are left over once that call is done.

import {
  seededRandom as seededRandomSource,
  type RandomSource,
} from "../rules/random";

export { CORE_BUILD } from "./coreBuild";
export { RULES_VERSION } from "../rules/rulesVersion";

export { parseSetup, startGame, type Setup, type SetupProblem } from "./setup";

export { freshSeed } from "./freshSeed";
export {
  recordedRandom,
  DesyncError,
  type RandomSource,
} from "../rules/random";

/**
 * Draws fresh from `seed`, recording each draw, for `startGame` and every
 * `applyPly` of one game in turn. Re-exported here as returning a plain
 * `RandomSource` rather than `seededRandom`'s own wider
 * `SeededRandomSource`: the extra `currentSeed()` read-out is how the app
 * keeps a plain number in its session between calls, which is not part of
 * this contract.
 */
export function seededRandom(seed: number): RandomSource {
  return seededRandomSource(seed);
}

export { parsePly, formatPly, type Ply } from "./plyNotation";
export { applyPly, type PlyRefusal, type PlyEffect } from "./applyPly";

export { toMove, result, type GameResult } from "./readOuts";
export { stateHash, canonicalState } from "./stateHash";

export type { GameState } from "../rules/gameState";
export type { Side } from "../rules/fleet";
