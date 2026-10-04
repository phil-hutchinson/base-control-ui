// Applying a ply through the core (story.md "Malformed versus refused"):
// `applyPly` finds the ship the ply names and runs it through the rules'
// own `applyMove` or `applyAttack`, reporting `PlyRefusal` for anything the
// game itself refuses — as opposed to `parsePly`'s "malformed", which never
// looks at a state at all — and `PlyEffect` for what happened.

import type { AttackRefusalReason } from "../rules/combat";
import { type GameState, shipsBySquare } from "../rules/gameState";
import { isGameOver } from "../rules/gameLength";
import type { Side, ShipId } from "../rules/fleet";
import type { MoveRefusalReason } from "../rules/movement";
import type { PowerLevel } from "../rules/power";
import {
  type AttackEffect,
  type MoveEffect,
  applyAttack,
  applyMove,
} from "../rules/ply";
import type { RandomSource } from "../rules/random";
import { type Square, squareName } from "../rules/board";
import type { Ply } from "./plyNotation";

/**
 * A move's first effect (story.md "The core's entry point"): the facts
 * `applyMove` returns beside its own effects — the ship, its side, where it
 * moved from and to, what the shape cost and the power it carries
 * afterwards — reported here rather than by the rules, so the app's own
 * effect lists stay untouched.
 */
export interface ShipMovedEffect {
  readonly type: "ship-moved";
  readonly shipId: ShipId;
  readonly side: Side;
  readonly from: Square;
  readonly to: Square;
  readonly cost: PowerLevel;
  readonly powerAfter: PowerLevel;
}

/** Everything a ply, move or attack, can raise (story.md "The core's entry point"). */
export type PlyEffect = ShipMovedEffect | MoveEffect | AttackEffect;

/**
 * Why a ply was refused, as opposed to malformed (story.md "Malformed versus
 * refused"): a wrong ply number, the game already over, no ship on the named
 * first square, or one of the rules' own reasons for refusing the move or
 * the attack it names (which includes `not-your-ship` and, for an attack,
 * `combat-is-off`).
 */
export type PlyRefusal =
  | "wrong-ply-number"
  | "game-over"
  | "no-ship-there"
  | MoveRefusalReason
  | AttackRefusalReason;

/**
 * Applies `ply`, given as `plyNumber`, to `state`, or refuses it. Checks run
 * most fundamental first: whether the game is already over, whether
 * `plyNumber` is the ply `state` is actually on, and — for an attack only —
 * whether combat is off, which refuses every attack unconditionally rather
 * than only some. Then the ship named by the ply's first square: if none
 * stands there, `no-ship-there`; otherwise the rules' own `applyMove` or
 * `applyAttack` decides the rest, including `not-your-ship`.
 *
 * A refused ply draws nothing from `random` and runs no completion check:
 * every refusal above is decided before any draw, so the source is left
 * exactly as it was. Applying succeeds, the returned `draws` are this
 * call's own, sliced from `random`'s running list by the position it was in
 * when this call began, and `random.checkComplete()` runs once, so a source
 * built for this call alone (`recordedRandom`) is proven to have had nothing
 * left over.
 */
export function applyPly(
  state: GameState,
  plyNumber: number,
  ply: Ply,
  random: RandomSource,
):
  | {
      readonly outcome: "applied";
      readonly state: GameState;
      readonly draws: readonly number[];
      readonly effects: readonly PlyEffect[];
    }
  | { readonly outcome: "refused"; readonly reason: PlyRefusal } {
  if (isGameOver(state)) {
    return { outcome: "refused", reason: "game-over" };
  }
  if (plyNumber !== state.plyNumber) {
    return { outcome: "refused", reason: "wrong-ply-number" };
  }
  if (ply.type === "attack" && !state.combatEnabled) {
    return { outcome: "refused", reason: "combat-is-off" };
  }

  const ship = shipsBySquare(state).get(squareName(ply.from));
  if (ship === undefined) {
    return { outcome: "refused", reason: "no-ship-there" };
  }

  const before = random.draws().length;

  if (ply.type === "move") {
    const result = applyMove(state, ship.id, ply.to, random);
    if (result.outcome === "refused") {
      return { outcome: "refused", reason: result.reason };
    }

    const shipMoved: ShipMovedEffect = {
      type: "ship-moved",
      shipId: ship.id,
      side: ship.side,
      from: ply.from,
      to: ply.to,
      cost: result.cost,
      powerAfter: result.powerAfter,
    };

    random.checkComplete();
    return {
      outcome: "applied",
      state: result.state,
      draws: random.draws().slice(before),
      effects: [shipMoved, ...result.effects],
    };
  }

  const result = applyAttack(state, ship.id, ply.target, random);
  if (result.outcome === "refused") {
    return { outcome: "refused", reason: result.reason };
  }

  random.checkComplete();
  return {
    outcome: "applied",
    state: result.state,
    draws: random.draws().slice(before),
    effects: result.effects,
  };
}
