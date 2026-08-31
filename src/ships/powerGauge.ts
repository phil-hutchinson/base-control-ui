// Which of the power gauge's four slots are lit for a given power level.
// Presentation only: the fixed left-to-right slot order and which of them
// are lit, not the power rule itself (rules.md §4.1, src/rules/power.ts).

import type { PowerLevel } from "../rules/power";
import { GAUGE_SLOT_COUNT } from "./shipArt";

/** One slot of the power gauge, in its fixed left-to-right position. */
export interface GaugeSlot {
  readonly index: number;
  readonly lit: boolean;
}

/** The gauge's four slots, left to right, with the first `power` of them lit. */
export function gaugeSlots(power: PowerLevel): readonly GaugeSlot[] {
  return Array.from({ length: GAUGE_SLOT_COUNT }, (_, index) => ({
    index,
    lit: index < power,
  }));
}
