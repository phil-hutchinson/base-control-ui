// The Fuel symbol an advanced Fuel bonus draws beneath its planet (steal.md
// §10): a fully lit power gauge, in the same geometry a ship's own gauge
// draws (`ShipModel.tsx`, `powerGauge.ts`) but standing alone with no hull
// beneath it and no side to colour it — the bonus belongs to neither side
// until claimed.

import { SIGNAL_COLORS } from "../board/squareArt";
import { MAX_POWER } from "../rules/power";
import { gaugeSlots } from "../ships/powerGauge";
import {
  GAUGE_BAR_LENGTH,
  GAUGE_BAR_STROKE_WIDTH,
  GAUGE_BAR_UNDERLAY_STROKE_WIDTH,
  GAUGE_SLOT_POSITIONS,
  GAUGE_UNDERLAY_COLOR,
} from "../ships/shipArt";
import "./FuelSymbol.css";

/** The lit bar's colour — gold, since this symbol belongs to neither side. */
const FUEL_BAR_COLOR = SIGNAL_COLORS[0].core;

export function FuelSymbol() {
  return (
    <svg
      className="fuel-symbol"
      viewBox="0 0 100 100"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <g strokeLinecap="round">
        {gaugeSlots(MAX_POWER).map((slot) => {
          const position = GAUGE_SLOT_POSITIONS[slot.index];
          const x1 = position.x;
          const x2 = position.x + GAUGE_BAR_LENGTH;
          return (
            <g key={slot.index}>
              <line
                x1={x1}
                y1={position.y}
                x2={x2}
                y2={position.y}
                stroke={GAUGE_UNDERLAY_COLOR}
                strokeWidth={GAUGE_BAR_UNDERLAY_STROKE_WIDTH}
              />
              <line
                x1={x1}
                y1={position.y}
                x2={x2}
                y2={position.y}
                stroke={FUEL_BAR_COLOR}
                strokeWidth={GAUGE_BAR_STROKE_WIDTH}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
