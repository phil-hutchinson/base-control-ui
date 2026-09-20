// What, if anything, is animating on the board right now: a pure function
// from a session's last event to a map of square name to animation. No
// React and no timers - the same shape `EnergyOverlay.tsx` already uses for
// the settlement overlay, and this module walks the same event structure it
// does (`endOfPlySettlements`/`settlementsForEvent`).

import { squareName } from "../rules/board";
import type { EndOfTurnEffect } from "../rules/endOfTurn";
import type { NodePriority } from "../rules/nodeQueue";
import type {
  AttackEffect,
  MoveEffect,
  PassEffect,
  PlyEndedEffect,
  QueueRotatedEffect,
} from "../rules/ply";
import type { Session, SessionEvent } from "../game/session";

/**
 * A node's waiting rings dissolving into its newly charged artwork
 * (`node-charged`). `priority` is the priority the node held - one, two or
 * three rings - the instant before it charged, exactly what the effect
 * reports; it is not re-derived from the state, which no longer carries it.
 */
export interface NodeChargeAnimation {
  readonly type: "node-charge";
  readonly priority: NodePriority;
  readonly runId: number;
}

/** A charged node's colours travelling to their depleted values (`node-ran-out`). */
export interface NodeBurnoutAnimation {
  readonly type: "node-burnout";
  readonly runId: number;
}

/**
 * A rotator turning a third of a circle because another rotator on the
 * board was just landed on and spent (`queue-rotated`, `trigger: "rotator"`).
 */
export interface RotatorTurnAnimation {
  readonly type: "rotator-turn";
  readonly runId: number;
}

/**
 * Everything that can be animating on one square. `runId` is
 * `session.state.plyNumber`, used as a React key so a fresh animation on the
 * same square restarts rather than continuing an old one.
 */
export type SquareAnimation =
  NodeChargeAnimation | NodeBurnoutAnimation | RotatorTurnAnimation;

/**
 * The `ply-ended` and `ply-passed` end-of-turn lists out of a move's or an
 * attack's effect list. A move or an attack always ends the ply, and the
 * pass guard firing for the other side can nest a second list immediately
 * after, so both are returned when present.
 */
function endOfTurnListsIn(
  effects: readonly (MoveEffect | AttackEffect)[],
): readonly (readonly EndOfTurnEffect[])[] {
  const plyEnded = effects.find(
    (effect): effect is PlyEndedEffect => effect.type === "ply-ended",
  );
  const passed = effects.find(
    (effect): effect is PassEffect => effect.type === "ply-passed",
  );
  return [
    ...(plyEnded ? [plyEnded.endOfTurn] : []),
    ...(passed ? [passed.endOfTurn] : []),
  ];
}

/** Every end-of-turn list the session's last event reported, however it is nested. */
function endOfTurnListsForEvent(
  event: SessionEvent | undefined,
): readonly (readonly EndOfTurnEffect[])[] {
  if (event === undefined) {
    return [];
  }
  if (event.type === "ply-passed") {
    return [event.endOfTurn];
  }
  if (event.type === "moved" || event.type === "attacked") {
    return endOfTurnListsIn(event.effects);
  }
  return [];
}

/**
 * The event's own top-level `queue-rotated` effect with `trigger:
 * "rotator"`, if it carries one. Only a `moved` or an `attacked` event can
 * carry a landing's rotation; `trigger: "planet"` is not this animation's
 * concern - there are no rotators on the board under that setting.
 */
function rotatorTriggerIn(
  event: SessionEvent | undefined,
): QueueRotatedEffect | undefined {
  if (
    event === undefined ||
    (event.type !== "moved" && event.type !== "attacked")
  ) {
    return undefined;
  }
  return event.effects.find(
    (effect): effect is QueueRotatedEffect =>
      effect.type === "queue-rotated" && effect.trigger === "rotator",
  );
}

/**
 * Given a session, what - if anything - is animating right now, and on
 * which squares. Derived entirely from `session.lastEvent`; a new event
 * replaces whatever was animating rather than queuing behind it, so an
 * animation already running can be cut short by the next event.
 */
export function boardAnimations(
  session: Session,
): ReadonlyMap<string, SquareAnimation> {
  const animations = new Map<string, SquareAnimation>();
  const runId = session.state.plyNumber;
  const endOfTurnLists = endOfTurnListsForEvent(session.lastEvent);

  let rotatorSetReplaced = false;
  for (const list of endOfTurnLists) {
    for (const effect of list) {
      if (effect.type === "node-charged") {
        animations.set(squareName(effect.square), {
          type: "node-charge",
          priority: effect.priority,
          runId,
        });
      } else if (effect.type === "node-ran-out") {
        animations.set(squareName(effect.square), {
          type: "node-burnout",
          runId,
        });
      } else if (
        effect.type === "queue-refilled" &&
        effect.newRotators.length > 0
      ) {
        rotatorSetReplaced = true;
      }
    }
  }

  // When the same ply also refilled the rotator set, the marks standing on
  // screen by the time anything is drawn are the fresh set, never the ones
  // that turned - so nothing turns at all.
  const rotatorTrigger = rotatorTriggerIn(session.lastEvent);
  if (rotatorTrigger !== undefined && !rotatorSetReplaced) {
    const spentSquareName = squareName(rotatorTrigger.square);
    for (const rotator of session.state.rotators) {
      const name = squareName(rotator);
      if (name !== spentSquareName) {
        animations.set(name, { type: "rotator-turn", runId });
      }
    }
  }

  return animations;
}
