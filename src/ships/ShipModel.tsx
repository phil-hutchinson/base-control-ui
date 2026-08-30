// One ship, drawn from the shared sprite (ShipDefs): a `<use>` of the
// side's hull, plus, only when a shield count is given, a shield gauge — a
// row of four small overhead ship icons across the top of the square, one
// per shield the ship could carry (shields run 0-4, rules.md §4.1,
// src/rules/shields.ts). A lit icon is filled in the side's colour and
// carries a thick bar just below it; an unlit one is left as a hollow
// outline with no bar. Icons light left to right (shieldGauge.ts).
//
// The gauge sits across the top of the viewBox and the hull low within it
// (implementation-plan.md D9): the clear band between them is what keeps a
// site marker, drawn beneath the ship in the same square, readable through
// the middle of the square. Making the gauge appear only when a shield
// count is given - rather than a separate boolean flag - keeps "a gauge
// with no count" and "a count with no gauge" both unrepresentable: the
// start screen's decorative ships (no game, no shields) simply omit the
// prop.
//
// Purely decorative - a screen reader gets the ship, and its shield count,
// from the occupying square's accessible name (squareLabel.ts) - so the SVG
// carries no title or description and is hidden from the accessibility
// tree.

import type { Side } from "../rules/fleet";
import type { ShieldCount } from "../rules/shields";
import { gaugeSlots } from "./shieldGauge";
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
  readonly shields?: ShieldCount;
}

export function ShipModel({ side, shields }: ShipModelProps) {
  const art = SHIP_ART[side];
  const palette = GAUGE_PALETTE[side];

  return (
    <svg
      className={`ship-model ship-model--${side}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <use href={`#${art.hullId}`} />
      {shields !== undefined && (
        <g strokeLinejoin="round">
          {gaugeSlots(shields).map((slot) => {
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
