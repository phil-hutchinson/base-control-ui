// One ship, drawn from the shared sprite (ShipDefs): a `<use>` of the
// side's hull, plus, only when a power level is given, a power gauge — up
// to six slots in two rows of three across the top of the square, one per
// point the ship could carry (power runs 0-6, rules.md §4.1,
// src/rules/power.ts). Only a lit slot draws anything - a black underlay
// line with the side's colour on top of it, at the full bar stroke - and an
// unlit slot draws nothing at all, not a dimmer mark: at the gauge's real
// size a thin line and a thick one both read as "something is here" rather
// than as distinct states, so the rule is presence or absence, never one
// weight of line against another (owner's call at the Step 10 visual gate;
// see D11 in the implementation plan). A ship at 0 power therefore draws no
// gauge marks at all - indistinguishable from a ship drawn with no power
// level given, which is the intended reading. Slots light in reading order
// - the top row left to right, then the bottom row (powerGauge.ts).
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
          {gaugeSlots(power)
            .filter((slot) => slot.lit)
            .map((slot) => {
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
                    stroke={palette.barColor}
                    strokeWidth={GAUGE_BAR_STROKE_WIDTH}
                  />
                </g>
              );
            })}
        </g>
      )}
    </svg>
  );
}
