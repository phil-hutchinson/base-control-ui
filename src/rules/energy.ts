// §8.4: which charged nodes a side is standing on, and what a turn's
// collection is worth under the game's chosen scoring setting. Nothing
// subtracts energy — depleted nodes are the trap's concern (`trap.ts`), not
// an energy one. Under steal, player-matching nodes (steal.md §9) can change
// what a turn's held squares are actually worth; `turnCollection` is the one
// place that reckons a side's whole end-of-turn collection, so the payout,
// the pips and the live region cannot drift apart. Nothing about the
// end-of-turn sequence, effects or running totals lives here.

import { type Square, squareName } from "./board";
import {
  type GameState,
  nodeSquares,
  shipsBySquare,
  nodeStateAt,
} from "./gameState";
import type { Side } from "./fleet";
import type { ScoringSetting } from "./scoring";
import { matchedSignalForSide } from "./steal";

/**
 * The charged nodes `side` is standing on right now, in board order. A node
 * counts only if one of that side's ships occupies its square **and** the
 * square's node state is `charged` (rules.md §8.4) — an inactive or depleted
 * node pays nothing, and neither does a node a ship merely flew over, which
 * this cannot see because it reads the state at the moment asked.
 */
export function chargedNodesHeldBy(
  state: GameState,
  side: Side,
): readonly Square[] {
  const ships = shipsBySquare(state);
  return nodeSquares(state).filter((node) => {
    if (nodeStateAt(state, node) !== "charged") {
      return false;
    }
    const ship = ships.get(squareName(node));
    return ship !== undefined && ship.side === side;
  });
}

/**
 * What a whole turn collects for holding `nodesHeld` charged nodes, under
 * `scoring` (rules.md §8.4). Under `"simple"` this is `nodesHeld` itself —
 * one energy per node. Under `"bonus"` it is the triangular total
 * `nodesHeld × (nodesHeld + 1) / 2`, because each node held is worth one
 * more than the node before it: 1, 3, 6, 10, 15 for one through five.
 *
 * This is the whole turn's payout, not a per-node rate — under bonus there
 * is no meaningful "which node paid the 3". It is written as the formula
 * rather than a lookup table: a table would need a bound to maintain, and
 * the largest count the board can produce has already changed once.
 */
export function energyForNodesHeld(
  nodesHeld: number,
  scoring: ScoringSetting,
): number {
  if (scoring === "simple") {
    return nodesHeld;
  }
  return (nodesHeld * (nodesHeld + 1)) / 2;
}

/** The whole of what `side`'s end-of-turn collection is right now — see `turnCollection`. */
export interface TurnCollection {
  /** The charged nodes `side` holds. */
  readonly heldSquares: readonly Square[];
  /** Whether `side` is standing on its own matched node. */
  readonly standingOnOwnNode: boolean;
  /** The held square that is the side's own matched node, present exactly when `standingOnOwnNode` is true. */
  readonly ownNodeSquare?: Square;
  /** How many nodes the collection prices, after player-matching nodes has adjusted `heldSquares.length`. */
  readonly countedNodes: number;
  /** Whether the collection is withheld outright (required, holding nodes but not the own one). */
  readonly withheld: boolean;
  /** The resulting amount, `energyForNodesHeld(countedNodes, state.scoring)`. */
  readonly amount: number;
}

/**
 * The whole of what `side`'s end-of-turn collection is right now (rules.md
 * §8.4, steal.md §9): the charged nodes it holds, whether it is standing on
 * its own matched node, how many nodes that prices to, whether the
 * collection is withheld outright, and the resulting amount.
 *
 * Under `"off"` — and under every playstyle but steal, which never carries
 * anything but `"off"` — `standingOnOwnNode` is always false and
 * `countedNodes` is `heldSquares.length`, so this is exactly today's
 * reckoning. Under `"double"`, the own node, if held, counts twice —
 * `heldSquares.length + 1` — while the opponent's matched node counts once,
 * like any other. Under `"required"`, holding at least one node without
 * holding the own one withholds the turn's collection entirely
 * (`countedNodes` 0, `withheld` true); holding the own node prices exactly
 * as `"off"` would, the own node counting once. `energyForNodesHeld` itself
 * is unchanged — this changes the count that function is asked to price,
 * never the price a count is worth.
 */
export function turnCollection(state: GameState, side: Side): TurnCollection {
  const heldSquares = chargedNodesHeldBy(state, side);
  const ownNodeSquare =
    state.playerMatching === "off"
      ? undefined
      : heldSquares.find(
          (square) =>
            state.nodes[squareName(square)]?.signal ===
            matchedSignalForSide(side, state.chargedNodeCount),
        );
  const standingOnOwnNode = ownNodeSquare !== undefined;

  let countedNodes: number;
  let withheld: boolean;
  if (state.playerMatching === "double") {
    countedNodes = heldSquares.length + (standingOnOwnNode ? 1 : 0);
    withheld = false;
  } else if (state.playerMatching === "required") {
    countedNodes = standingOnOwnNode ? heldSquares.length : 0;
    withheld = heldSquares.length > 0 && !standingOnOwnNode;
  } else {
    countedNodes = heldSquares.length;
    withheld = false;
  }

  return {
    heldSquares,
    standingOnOwnNode,
    ownNodeSquare,
    countedNodes,
    withheld,
    amount: energyForNodesHeld(countedNodes, state.scoring),
  };
}
