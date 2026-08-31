// One ship, drawn from the shared sprite (ShipDefs): a `<use>` of the
// side's hull, plus, only when a power level is given, a power gauge — a
// row of four small overhead ship icons across the top of the square, one
// per point the ship could carry (power runs 0-4, rules.md §4.1,
// src/rules/power.ts). A lit icon is filled in the side's colour and
// carries a thick bar just below it; an unlit one is left as a hollow
// outline with no bar. Icons light left to right (powerGauge.ts).
//
// The gauge sits across the top of the viewBox and the hull low within it:
// the clear band between them is what keeps a site marker, drawn beneath
// the ship in the same square, readable through the middle of the square.
// The power level is optional: a gauge is drawn only when one is given, so
// a ship with no power to show can be drawn without one, keeping "a gauge
// with no level" and "a level with no gauge" both unrepresentable.
//
// Purely decorative - a screen reader gets the ship, and its power level,
// from the occupying square's accessible name (squareLabel.ts) - so the SVG
// carries no title or description and is hidden from the accessibility
// tree.

import type { Side } from "../rules/fleet";
import type { PowerLevel } from "../rules/power";
import { gaugeSlots } from "./powerGauge";
import {
  GAUGE_BAR_STROKE_WIDTH,
  GAUGE_BAR_UNDERLAY_STROKE_WIDTH,
  GAUGE_BAR_X1,
  GAUGE_BAR_X2,
  GAUGE_BAR_Y,
  GAUGE_ICON_STROKE_WIDTH,
  GAUGE_PALETTE,
  GAUGE_SEPARATOR_COLOR,
  GAUGE_SEPARATOR_STROKE_WIDTH,
  GAUGE_SLOT_X,
  GAUGE_SLOT_Y,
  SHIP_ART,
} from "./shipArt";
import "./ShipModel.css";

interface ShipModelProps {
  readonly side: Side;
  readonly power?: PowerLevel;
}

export function ShipModel({ side, power }: ShipModelProps) {
  const art = SHIP_ART[side];
  const palette = GAUGE_PALETTE[side];

  return (
    <svg
      className={`ship-model ship-model--${side}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <use href={`#${art.hullId}`} />
      {power !== undefined && (
        <g strokeLinejoin="round">
          {gaugeSlots(power).map((slot) => {
            const fill = slot.lit ? palette.litFill : palette.unlitFill;
            const stroke = slot.lit ? palette.litOutline : palette.unlitOutline;
            return (
              <g
                key={slot.index}
                data-gauge-slot={slot.index}
                data-gauge-lit={slot.lit}
                transform={`translate(${GAUGE_SLOT_X[slot.index]}, ${GAUGE_SLOT_Y})`}
              >
                <use
                  href={`#${art.gaugeIconId}`}
                  fill={GAUGE_SEPARATOR_COLOR}
                  stroke={GAUGE_SEPARATOR_COLOR}
                  strokeWidth={GAUGE_SEPARATOR_STROKE_WIDTH}
                />
                <use
                  href={`#${art.gaugeIconId}`}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={GAUGE_ICON_STROKE_WIDTH}
                />
                {slot.lit && (
                  <>
                    <line
                      x1={GAUGE_BAR_X1}
                      y1={GAUGE_BAR_Y}
                      x2={GAUGE_BAR_X2}
                      y2={GAUGE_BAR_Y}
                      stroke={GAUGE_SEPARATOR_COLOR}
                      strokeWidth={GAUGE_BAR_UNDERLAY_STROKE_WIDTH}
                      strokeLinecap="round"
                    />
                    <line
                      x1={GAUGE_BAR_X1}
                      y1={GAUGE_BAR_Y}
                      x2={GAUGE_BAR_X2}
                      y2={GAUGE_BAR_Y}
                      stroke={palette.barColor}
                      strokeWidth={GAUGE_BAR_STROKE_WIDTH}
                      strokeLinecap="round"
                    />
                  </>
                )}
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
