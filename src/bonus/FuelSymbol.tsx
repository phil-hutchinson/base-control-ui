// The Fuel symbol an advanced Fuel bonus draws beneath its planet (steal.md
// §10): a single power-gauge bar — the story asks for one bar, not the
// ship's full six-slot gauge, since Fuel gives "one power" — in the same
// double-stroke shape a ship's own gauge bar draws (`ShipModel.tsx`,
// `powerGauge.ts`, `shipArt.ts`), scaled up to fill this symbol's own box
// since it stands alone here rather than sharing room with five other slots
// and a hull.

import { SIGNAL_COLORS } from "../board/squareArt";
import {
  GAUGE_BAR_LENGTH,
  GAUGE_BAR_STROKE_WIDTH,
  GAUGE_BAR_UNDERLAY_STROKE_WIDTH,
  GAUGE_UNDERLAY_COLOR,
} from "../ships/shipArt";
import "./FuelSymbol.css";

/** The lit bar's colour — gold, since this symbol belongs to neither side. */
const FUEL_BAR_COLOR = SIGNAL_COLORS[0].core;

/**
 * Scales the gauge's own single-bar geometry up so it reads at a glance
 * standing alone, rather than at the small size it draws at beside five
 * other slots on a ship's hull. Applied uniformly to the bar's length and
 * both its stroke widths, so the enlarged bar keeps the gauge's own
 * proportions exactly.
 */
const SCALE = 2.6;
const BAR_LENGTH = GAUGE_BAR_LENGTH * SCALE;
const UNDERLAY_STROKE_WIDTH = GAUGE_BAR_UNDERLAY_STROKE_WIDTH * SCALE;
const BAR_STROKE_WIDTH = GAUGE_BAR_STROKE_WIDTH * SCALE;

export function FuelSymbol() {
  return (
    <svg
      className="fuel-symbol"
      viewBox="0 0 100 100"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <g strokeLinecap="round" data-fuel-bar>
        <line
          x1={50 - BAR_LENGTH / 2}
          y1={50}
          x2={50 + BAR_LENGTH / 2}
          y2={50}
          stroke={GAUGE_UNDERLAY_COLOR}
          strokeWidth={UNDERLAY_STROKE_WIDTH}
        />
        <line
          x1={50 - BAR_LENGTH / 2}
          y1={50}
          x2={50 + BAR_LENGTH / 2}
          y2={50}
          stroke={FUEL_BAR_COLOR}
          strokeWidth={BAR_STROKE_WIDTH}
        />
      </g>
    </svg>
  );
}
