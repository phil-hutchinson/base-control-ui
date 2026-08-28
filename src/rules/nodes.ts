// The replacement draw §8 puts on a site: waking a dormant site to replace
// one that ran out (§8.6 in rules.md 0.10). 0.11 removes both the state a
// ship touching a site used to cause and the draw's whole basis — the board
// charges sites on its own timer instead — so nothing here describes the
// current ruleset; it survives only until step 3 deletes it.

import { type Square, squareName } from "./board";
import { type GameState, shipsBySquare, siteStateAt } from "./gameState";
import { drawIndex } from "./random";
import { SITES } from "./sites";

/**
 * A dormant site woke to replace one that ran out (rules.md §8.6). It wakes
 * **active**, unless a ship is already standing on it, in which case it
 * wakes **charged** at once (§8.5's final paragraph).
 */
export interface SiteWokenEffect {
  readonly type: "site-woken";
  readonly square: Square;
  readonly wokeInto: "active" | "charged";
}

/**
 * A depleted site finished cooling down and returned to the dormant pool.
 * Reported both by the ordinary end-of-turn cooling (§8.7 step 3, declared
 * in `endOfTurn.ts`) and by the empty-pool safety net below, because the
 * same thing happened to the site either way.
 */
export interface SiteCooledEffect {
  readonly type: "site-cooled";
  readonly square: Square;
}

/** The state resulting from a replacement draw, and the effects it produced. */
export interface ReplacementDrawResult {
  readonly state: GameState;
  readonly effects: readonly (SiteWokenEffect | SiteCooledEffect)[];
}

/**
 * Returns the depleted site that has cooled the longest (the smallest
 * `enteredOnPly`, ties broken by `SITES` order) to dormant, reporting the
 * ordinary `site-cooled` effect. Used only by the empty-pool safety net
 * below; `undefined` if no site is depleted.
 */
function cooldownLongestDepletedSite(
  state: GameState,
):
  { readonly state: GameState; readonly effect: SiteCooledEffect } | undefined {
  let longest:
    { readonly square: Square; readonly enteredOnPly: number } | undefined;

  for (const square of SITES) {
    const status = state.siteStates[squareName(square)];
    if (status === undefined || status.state !== "depleted") {
      continue;
    }
    if (longest === undefined || status.enteredOnPly < longest.enteredOnPly) {
      longest = { square, enteredOnPly: status.enteredOnPly };
    }
  }

  if (longest === undefined) {
    return undefined;
  }

  return {
    state: {
      ...state,
      siteStates: {
        ...state.siteStates,
        [squareName(longest.square)]: {
          state: "dormant",
          enteredOnPly: state.plyNumber,
        },
      },
    },
    effect: { type: "site-cooled", square: longest.square },
  };
}

/**
 * Draws one replacement from the dormant pool. The pool is every dormant
 * site, collected in `SITES` order, so the draw is a function of the seed
 * alone. Should the pool be empty, the site depleted longest goes back to
 * dormant first (the empty-pool safety net, rules.md §8.7), and the draw
 * then proceeds; if no site is depleted either, the board is in an
 * impossible state and this throws rather than return a silently wrong one.
 */
function drawOneReplacement(state: GameState): ReplacementDrawResult {
  let workingState = state;
  const effects: (SiteWokenEffect | SiteCooledEffect)[] = [];

  let pool = SITES.filter(
    (square) => siteStateAt(workingState, square) === "dormant",
  );

  if (pool.length === 0) {
    const cooled = cooldownLongestDepletedSite(workingState);
    if (cooled === undefined) {
      throw new Error(
        "drawReplacements: no dormant or depleted site available to draw a replacement from",
      );
    }
    workingState = cooled.state;
    effects.push(cooled.effect);
    pool = SITES.filter(
      (square) => siteStateAt(workingState, square) === "dormant",
    );
  }

  const [index, nextSeed] = drawIndex(workingState.randomSeed, pool.length);
  const drawn = pool[index];
  const name = squareName(drawn);
  const isOccupied = shipsBySquare(workingState).has(name);
  const wokeInto = isOccupied ? "charged" : "active";

  effects.push({ type: "site-woken", square: drawn, wokeInto });

  return {
    state: {
      ...workingState,
      siteStates: {
        ...workingState.siteStates,
        [name]: { state: wokeInto, enteredOnPly: workingState.plyNumber },
      },
      randomSeed: nextSeed,
    },
    effects,
  };
}

/**
 * Draws `count` replacements from the dormant pool, one at a time and
 * without replacement — each drawn site leaves the pool, and the seed
 * advances, before the next draw. Called once per node that ran out at
 * §8.7 step 4 (rules.md §8.6).
 */
export function drawReplacements(
  state: GameState,
  count: number,
): ReplacementDrawResult {
  let workingState = state;
  const effects: (SiteWokenEffect | SiteCooledEffect)[] = [];

  for (let i = 0; i < count; i++) {
    const draw = drawOneReplacement(workingState);
    workingState = draw.state;
    effects.push(...draw.effects);
  }

  return { state: workingState, effects };
}
