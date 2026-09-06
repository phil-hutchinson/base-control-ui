// One ship, drawn from the shared sprite (ShipDefs): a `<use>` of the
// side's hull, plus, only when a power level is given, a power gauge — six
// slots in two rows of three across the top of the square, one per point
// the ship could carry (power runs 0-6, rules.md §4.1, src/rules/power.ts).
// Every slot is a black underlay line with a line on top of it: a lit
// slot's top line is the side's colour at the full bar stroke, an unlit
// slot's is the same colour at a thin stroke, so an empty slot still reads
// as a slot. Slots light in reading order - the top row left to right, then
// the bottom row (powerGauge.ts).
//
// The gauge sits across the top of the viewBox and the hull low within it:
// the clear band between them is what keeps a node marker, drawn beneath
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
  GAUGE_BAR_LENGTH,
  GAUGE_BAR_STROKE_WIDTH,
  GAUGE_BAR_UNDERLAY_STROKE_WIDTH,
  GAUGE_PALETTE,
  GAUGE_SLOT_POSITIONS,
  GAUGE_UNDERLAY_COLOR,
  GAUGE_UNLIT_STROKE_WIDTH,
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
        <g strokeLinecap="round">
          {gaugeSlots(power).map((slot) => {
            const position = GAUGE_SLOT_POSITIONS[slot.index];
            const x1 = position.x;
            const x2 = position.x + GAUGE_BAR_LENGTH;
            return (
              <g
                key={slot.index}
                data-gauge-slot={slot.index}
                data-gauge-lit={slot.lit}
              >
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
                  stroke={slot.lit ? palette.barColor : palette.unlitOutline}
                  strokeWidth={
                    slot.lit ? GAUGE_BAR_STROKE_WIDTH : GAUGE_UNLIT_STROKE_WIDTH
                  }
                />
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
