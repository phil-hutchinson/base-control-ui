// The trap (rules.md §7, §8.1, §8.5): a ship is trapped exactly when it
// stands on a node whose state is `depleted`. There is no fourth node state
// and nothing is stored on the node or the ship to record it — "trapped" is
// a fact derived, on demand, from where a ship is and what that square's
// node is doing. A ship can only ever come to be there by a node burning out
// underneath it (rules.md §6 bars landing on any node that isn't charged),
// never by walking into one.
//
// This module is a leaf: it imports only `board.ts`, `fleet.ts` and
// `gameState.ts`. `movement.ts` and `combat.ts` import it to ask whether a
// ship is trapped; the relief's choice (`relief.ts`) needs `movement.ts` as
// well, which would make a cycle if it lived here too — that is why the
// relief is its own module.

import { type Square, squareName } from "./board";
import type { Side, ShipId } from "./fleet";
import {
  type GameState,
  type Ship,
  nodeSquares,
  nodeStateAt,
  shipsBySquare,
} from "./gameState";

/**
 * Whether `shipId` is trapped: its square carries a node whose state is
 * `depleted` (rules.md §8.1, §8.5). A direct status lookup at the ship's own
 * square, not a walk of the node set.
 */
export function isShipTrapped(state: GameState, shipId: ShipId): boolean {
  const ship = state.ships.find((candidate) => candidate.id === shipId);
  if (ship === undefined) {
    throw new RangeError(`no ship with id "${shipId}" in this state`);
  }
  return nodeStateAt(state, ship.square) === "depleted";
}

/**
 * The depleted nodes `side`'s ships are standing on right now, in board
 * order — which nodes are trapping a ship of this side, not an energy
 * question, since a depleted node no longer costs anything. The order is not
 * load-bearing for any rule: `relief.ts`'s tie-break (rules.md §8.6 step 7)
 * is a random draw, not decided by which candidate comes first. It still
 * must be deterministic, because `relief.ts` builds its candidate list by
 * walking this order before drawing among any that tie — the same board
 * must list its candidates the same way every time, or a recorded game
 * could not replay its own draw.
 */
export function trappingNodesFor(
  state: GameState,
  side: Side,
): readonly Square[] {
  const ships = shipsBySquare(state);
  return nodeSquares(state).filter((node) => {
    if (nodeStateAt(state, node) !== "depleted") {
      return false;
    }
    const ship = ships.get(squareName(node));
    return ship !== undefined && ship.side === side;
  });
}

/**
 * `side`'s trapped ships, in the same order as `trappingNodesFor` — see
 * that function's comment for why the order is deterministic but not
 * load-bearing for any rule.
 */
export function trappedShips(state: GameState, side: Side): readonly Ship[] {
  const ships = shipsBySquare(state);
  return trappingNodesFor(state, side).map((node) =>
    ships.get(squareName(node))!,
  );
}

/**
 * Whether every one of `side`'s ships is trapped. Every ship of that side,
 * full stop — `actedThisPly` is not consulted, because the question §8.6
 * step 7 asks is about the side's next turn, not the ply that just ended.
 *
 * A ship on a planet is never trapped, since the node draw excludes planets
 * and their neighbours (§3.2) — so "every ship trapped" also means "none
 * refuelling".
 */
export function isSideAllTrapped(state: GameState, side: Side): boolean {
  const sideShipCount = state.ships.filter((ship) => ship.side === side).length;
  return (
    sideShipCount > 0 && trappedShips(state, side).length === sideShipCount
  );
}
