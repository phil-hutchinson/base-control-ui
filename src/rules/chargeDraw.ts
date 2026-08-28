// §8.2's charge draw, run as step 4 of the end-of-turn sequence (§8.6): as
// many active sites as it takes to bring the charged count back to
// `TARGET_CHARGED_SITES` are charged, one at a time and at random, each
// equally likely. The shortfall is computed here, not handed in by the
// caller — it can exceed the number of nodes that ran out this very ply, if
// the board was already short from an earlier ply that could not fill it.
// Running short is a legal outcome: with no active site left to draw from,
// this simply stops and leaves the board below its target until a future
// ply's draw can close the gap.

import { type Square, squareName } from "./board";
import { type GameState, siteStateAt } from "./gameState";
import { drawIndex } from "./random";
import { SITES, TARGET_CHARGED_SITES } from "./sites";

/** A site went from active to charged because the board's end-of-turn draw picked it (rules.md §8.2). */
export interface SiteChargedEffect {
  readonly type: "site-charged";
  readonly square: Square;
}

/** The state resulting from the charge draw, and the effects it produced. */
export interface ChargeDrawResult {
  readonly state: GameState;
  readonly effects: readonly SiteChargedEffect[];
}

/**
 * Draws sites to charge from the active pool until the charged count reaches
 * `TARGET_CHARGED_SITES` or the pool runs out, whichever comes first
 * (rules.md §8.2, §8.6 step 4). The pool is every site currently `active`,
 * collected by walking `SITES` in its declared order; occupied active sites
 * are drawn like any other. Each draw removes its site from the pool and
 * advances `state.randomSeed` before the next one, exactly as the 0.10
 * replacement draw did — so a recorded game still replays exactly. The seed
 * does not move at all if nothing is drawn.
 */
export function runChargeDraw(state: GameState): ChargeDrawResult {
  const chargedCount = SITES.filter(
    (square) => siteStateAt(state, square) === "charged",
  ).length;
  let shortfall = TARGET_CHARGED_SITES - chargedCount;

  let pool = SITES.filter((square) => siteStateAt(state, square) === "active");

  let workingState = state;
  const effects: SiteChargedEffect[] = [];

  while (shortfall > 0 && pool.length > 0) {
    const [index, nextSeed] = drawIndex(workingState.randomSeed, pool.length);
    const drawn = pool[index];
    const name = squareName(drawn);

    workingState = {
      ...workingState,
      siteStates: {
        ...workingState.siteStates,
        [name]: { state: "charged", enteredOnPly: workingState.plyNumber },
      },
      randomSeed: nextSeed,
    };
    effects.push({ type: "site-charged", square: drawn });

    pool = pool.filter((_, poolIndex) => poolIndex !== index);
    shortfall -= 1;
  }

  return { state: workingState, effects };
}
