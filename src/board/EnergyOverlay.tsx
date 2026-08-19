// The decorative overlay drawing a collection (rules.md §8.4): a "+N" at the
// centroid of the nodes that paid, and a pulse ring on each of them. Purely a
// function of the session's last event and its own state - no timers, no
// state of its own. A screen reader learns about the collection from the
// live region's sentence (announcements.ts) and the HUD carries the total as
// text, so nothing here is the only channel for anything.

import { squareName } from "../rules/board";
import type {
  EndOfTurnEffect,
  EnergyCollectedEffect,
} from "../rules/endOfTurn";
import type { PassEffect, PlyEndedEffect } from "../rules/ply";
import type { Session, SessionEvent } from "../game/session";
import { centroidPercentPosition } from "./boardView";
import "./EnergyOverlay.css";

function energyCollectionsIn(
  effects: readonly EndOfTurnEffect[],
): EnergyCollectedEffect[] {
  return effects.filter(
    (effect): effect is EnergyCollectedEffect =>
      effect.type === "energy-collected",
  );
}

/**
 * Every collection the session's last event reported. An action that ends a
 * ply can be immediately followed by the pass guard firing for the other
 * side, so a `moved` or `attacked` event can carry two collections - one
 * from its `ply-ended` effect and one from a nested `ply-passed` effect.
 */
function collectionsForEvent(
  event: SessionEvent | undefined,
): readonly EnergyCollectedEffect[] {
  if (event === undefined) {
    return [];
  }

  if (event.type === "ply-passed") {
    return energyCollectionsIn(event.endOfTurn);
  }

  if (event.type === "moved" || event.type === "attacked") {
    const plyEnded = event.effects.find(
      (effect): effect is PlyEndedEffect => effect.type === "ply-ended",
    );
    const passed = event.effects.find(
      (effect): effect is PassEffect => effect.type === "ply-passed",
    );
    return [
      ...(plyEnded ? energyCollectionsIn(plyEnded.endOfTurn) : []),
      ...(passed ? energyCollectionsIn(passed.endOfTurn) : []),
    ];
  }

  return [];
}

export interface EnergyOverlayProps {
  /** The session whose last event, if any, reported a collection to draw. */
  readonly session: Session;
}

/**
 * A sibling of the board's `role="grid"` element, occupying the same grid
 * area so it is exactly the grid's box with no measurement of its own. A
 * `role="grid"` element may only own rows, which is why this lives outside
 * it rather than inside.
 */
export function EnergyOverlay({ session }: EnergyOverlayProps) {
  const collections = collectionsForEvent(session.lastEvent);

  return (
    <div className="energy-overlay" aria-hidden="true">
      {collections.flatMap((collection) => {
        const key = `${collection.side}-${session.state.plyNumber}`;
        const gainPosition = centroidPercentPosition(collection.squares);
        return [
          ...collection.squares.map((square) => {
            const pulsePosition = centroidPercentPosition([square]);
            return (
              <span
                key={`${key}-pulse-${squareName(square)}`}
                className={`energy-overlay__pulse energy-overlay__pulse--${collection.side}`}
                style={{
                  top: `${pulsePosition.top}%`,
                  left: `${pulsePosition.left}%`,
                }}
              />
            );
          }),
          <span
            key={`${key}-gain`}
            className={`energy-overlay__gain energy-overlay__gain--${collection.side}`}
            style={{
              top: `${gainPosition.top}%`,
              left: `${gainPosition.left}%`,
            }}
          >
            +{collection.amount}
          </span>,
        ];
      })}
    </div>
  );
}
