// The decorative overlay drawing a settlement (rules.md §8.4): a "+N" and an
// expanding pulse ring on each paying square for a collection. Purely a
// function of the session's last event and its own state - no timers, no
// state of its own. A screen reader learns about the settlement from the
// live region's sentence (announcements.ts) and the HUD carries the totals
// as text, so nothing here is the only channel for anything.

import { squareName } from "../rules/board";
import type {
  EndOfTurnEffect,
  EnergyCollectedEffect,
} from "../rules/endOfTurn";
import type {
  FightResolvedEffect,
  PassEffect,
  PlyEndedEffect,
} from "../rules/ply";
import type { Session, SessionEvent } from "../game/session";
import { centroidPercentPosition } from "./boardView";
import "./EnergyOverlay.css";

interface Settlement {
  readonly side: EnergyCollectedEffect["side"];
  readonly amount: number;
  readonly squares: EnergyCollectedEffect["squares"];
}

function settlementsIn(effects: readonly EndOfTurnEffect[]): Settlement[] {
  const settlements: Settlement[] = [];
  for (const effect of effects) {
    if (effect.type === "energy-collected") {
      settlements.push({
        side: effect.side,
        amount: effect.amount,
        squares: effect.squares,
      });
    }
  }
  return settlements;
}

/**
 * The `ply-ended` and `ply-passed` settlements out of a move's or an
 * attack's effect list. Takes the two effect lists' common shape rather than
 * either one by name, since a move's effects and an attack's effects are
 * otherwise different types (an attack's can also carry a
 * `FightResolvedEffect`, which carries no settlement of its own).
 */
function endOfActionSettlements(
  effects: readonly (PassEffect | PlyEndedEffect | FightResolvedEffect)[],
): Settlement[] {
  const plyEnded = effects.find(
    (effect): effect is PlyEndedEffect => effect.type === "ply-ended",
  );
  const passed = effects.find(
    (effect): effect is PassEffect => effect.type === "ply-passed",
  );
  return [
    ...(plyEnded ? settlementsIn(plyEnded.endOfTurn) : []),
    ...(passed ? settlementsIn(passed.endOfTurn) : []),
  ];
}

/**
 * Every settlement (energy collected) the session's last event
 * reported. An action that ends a ply can be immediately followed by the
 * pass guard firing for the other side, so a `moved` or `attacked` event can
 * carry settlements from both - one from its `ply-ended` effect and one from
 * a nested `ply-passed` effect.
 */
function settlementsForEvent(
  event: SessionEvent | undefined,
): readonly Settlement[] {
  if (event === undefined) {
    return [];
  }

  if (event.type === "ply-passed") {
    return settlementsIn(event.endOfTurn);
  }

  if (event.type === "moved" || event.type === "attacked") {
    return endOfActionSettlements(event.effects);
  }

  return [];
}

export interface EnergyOverlayProps {
  /** The session whose last event, if any, reported a settlement to draw. */
  readonly session: Session;
}

/**
 * A sibling of the board's `role="grid"` element, occupying the same grid
 * area so it is exactly the grid's box with no measurement of its own. A
 * `role="grid"` element may only own rows, which is why this lives outside
 * it rather than inside.
 */
export function EnergyOverlay({ session }: EnergyOverlayProps) {
  const settlements = settlementsForEvent(session.lastEvent);

  return (
    <div className="energy-overlay" aria-hidden="true">
      {settlements.flatMap((settlement, index) => {
        const key = `${settlement.side}-${session.state.plyNumber}-${index}`;
        const position = centroidPercentPosition(settlement.squares);
        return [
          ...settlement.squares.map((square) => {
            const pulsePosition = centroidPercentPosition([square]);
            return (
              <span
                key={`${key}-pulse-${squareName(square)}`}
                className={`energy-overlay__pulse energy-overlay__pulse--${settlement.side}`}
                style={{
                  top: `${pulsePosition.top}%`,
                  left: `${pulsePosition.left}%`,
                }}
              />
            );
          }),
          <span
            key={`${key}-amount`}
            className={`energy-overlay__amount energy-overlay__amount--${settlement.side}`}
            style={{
              top: `${position.top}%`,
              left: `${position.left}%`,
            }}
          >
            +{settlement.amount}
          </span>,
        ];
      })}
    </div>
  );
}
