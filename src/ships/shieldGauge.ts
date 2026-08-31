// Which of the shield gauge's four slots are lit for a given shield count.
// Presentation only: the fixed left-to-right slot order and which of them
// are lit, not the shield rule itself (rules.md §4.1, src/rules/shields.ts).

import type { ShieldCount } from "../rules/shields";
import { GAUGE_SLOT_COUNT } from "./shipArt";

/** One slot of the shield gauge, in its fixed left-to-right position. */
export interface GaugeSlot {
  readonly index: number;
  readonly lit: boolean;
}

/** The gauge's four slots, left to right, with the first `shields` of them lit. */
export function gaugeSlots(shields: ShieldCount): readonly GaugeSlot[] {
  return Array.from({ length: GAUGE_SLOT_COUNT }, (_, index) => ({
    index,
    lit: index < shields,
  }));
}
