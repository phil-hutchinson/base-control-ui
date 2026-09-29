// What, if anything, is animating on the board right now: a pure function
// from a session's last event to a map of square name to animation. No
// React and no timers - the same shape `EnergyOverlay.tsx` already uses for
// the settlement overlay, and this module walks the same event structure it
// does (`endOfPlySettlements`/`settlementsForEvent`).

import { squareName } from "../rules/board";
import type { EndOfTurnEffect } from "../rules/endOfTurn";
import type { Side } from "../rules/fleet";
import type { NodePriority } from "../rules/nodeQueue";
import type {
  ActivityBonusClaimedEffect,
  AttackEffect,
  MoveEffect,
  NodeClaimedEffect,
  NodeSpentEffect,
  PassEffect,
  PlyEndedEffect,
  QueueRotatedEffect,
} from "../rules/ply";
import { matchedSideForSignal, type NodeSignal } from "../rules/steal";
import type { Session, SessionEvent } from "../game/session";

/**
 * A node's waiting rings dissolving into its newly charged artwork. Under
 * the continuous, planet and dedicated playstyles this is `node-charged`,
 * and `priority` is the priority the node held - one, two or three rings -
 * the instant before it charged, exactly what the effect reports; it is not
 * re-derived from the state, which no longer carries it. Under steal
 * (steal.md §3) this is a claim, `node-claimed`, and `signal` is the node's
 * signal instead: the outgoing rings are the prospective node's own three
 * — there is no priority under steal — in this signal's colour, revealing
 * the signal-coloured charged artwork beneath. Exactly one of `priority` and
 * `signal` is ever given.
 */
export interface NodeChargeAnimation {
  readonly type: "node-charge";
  readonly priority?: NodePriority;
  readonly signal?: NodeSignal;
  readonly runId: number;
}

/**
 * A charged node's colours travelling to their depleted values, however it
 * reached depleted: its countdown ran out beneath a ship (`node-ran-out`) or
 * its holder left it, spending it on the way out (`node-spent`). The two are
 * one change as far as a player is concerned, so both roads produce this
 * same entry.
 */
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
 * A prospective square's rings sweeping from their old signal's colour to
 * their new one because a Node scramble moved the square to another signal
 * (steal.md §10). `fromSignal` is the signal the square showed before the
 * event, and `fromMatchedSide` the side that signal was matched to, if any —
 * the marker's own matched side belongs to the new signal.
 */
export interface NodeRecolorAnimation {
  readonly type: "node-recolor";
  readonly fromSignal: NodeSignal;
  readonly fromMatchedSide?: Side;
  readonly runId: number;
}

/**
 * Everything that can be animating on one square. `runId` is
 * `session.state.plyNumber`, used as a React key so a fresh animation on the
 * same square restarts rather than continuing an old one.
 */
export type SquareAnimation =
  | NodeChargeAnimation
  | NodeBurnoutAnimation
  | RotatorTurnAnimation
  | NodeRecolorAnimation;

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
 * The event's own top-level `node-spent` effect, if it carries one. Only a
 * `moved` event can carry it - leaving a charged node is what spends it
 * (rules.md §8.3), and an attack never moves a ship off one.
 */
function nodeSpentIn(
  event: SessionEvent | undefined,
): NodeSpentEffect | undefined {
  if (event === undefined || event.type !== "moved") {
    return undefined;
  }
  return event.effects.find(
    (effect): effect is NodeSpentEffect => effect.type === "node-spent",
  );
}

/**
 * The event's own top-level `node-claimed` effect, if it carries one
 * (steal.md §3). Only a `moved` event can carry it - claiming a node is
 * something only landing on its prospective square does, and an attack can
 * never land on one (`ply.ts`).
 */
function nodeClaimedIn(
  event: SessionEvent | undefined,
): NodeClaimedEffect | undefined {
  if (event === undefined || event.type !== "moved") {
    return undefined;
  }
  return event.effects.find(
    (effect): effect is NodeClaimedEffect => effect.type === "node-claimed",
  );
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
 * The signal each square showed before the event, for every square a Node
 * scramble claim in the event recoloured, keyed by square name. Only a
 * `moved` or an `attacked` event can carry a claim; a fight can carry two,
 * and a square recoloured by both keeps the first claim's old signal - what
 * was on screen before the event.
 */
function signalsBeforeScramble(
  event: SessionEvent | undefined,
): ReadonlyMap<string, NodeSignal> {
  const before = new Map<string, NodeSignal>();
  if (
    event === undefined ||
    (event.type !== "moved" && event.type !== "attacked")
  ) {
    return before;
  }
  const claims = event.effects.filter(
    (effect): effect is ActivityBonusClaimedEffect =>
      effect.type === "activity-bonus-claimed",
  );
  for (const claim of claims) {
    for (const { square, oldSignal } of claim.recoloredSquares) {
      const name = squareName(square);
      if (!before.has(name)) {
        before.set(name, oldSignal);
      }
    }
  }
  return before;
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

  const nodeSpent = nodeSpentIn(session.lastEvent);
  if (nodeSpent !== undefined) {
    animations.set(squareName(nodeSpent.square), {
      type: "node-burnout",
      runId,
    });
  }

  const nodeClaimed = nodeClaimedIn(session.lastEvent);
  if (nodeClaimed !== undefined) {
    animations.set(squareName(nodeClaimed.square), {
      type: "node-charge",
      signal: nodeClaimed.signal,
      runId,
    });
  }

  // A recoloured square animates only if the board now shows it on a
  // different signal, so the sweep always ends on what is drawn anyway.
  for (const [name, fromSignal] of signalsBeforeScramble(session.lastEvent)) {
    const status = session.state.nodes[name];
    if (
      status?.state === "prospective" &&
      status.signal !== undefined &&
      status.signal !== fromSignal &&
      !animations.has(name)
    ) {
      animations.set(name, {
        type: "node-recolor",
        fromSignal,
        fromMatchedSide: matchedSideForSignal(session.state, fromSignal),
        runId,
      });
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
