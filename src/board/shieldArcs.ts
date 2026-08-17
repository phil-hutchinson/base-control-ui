// Maps a ship's shield count to which quarter-circle arc positions are lit.
// Presentation only: which positions exist and their fixed fill order, in
// increasing amount around the ring, clockwise from the top right.

import type { ShieldCount } from "../rules/shields";

/** One of the four quarter-circle positions arranged around a ship's hull. */
export type ArcPosition =
  "top-right" | "bottom-right" | "bottom-left" | "top-left";

/** The fixed fill order: clockwise from the top right. */
export const ARC_FILL_ORDER: readonly ArcPosition[] = [
  "top-right",
  "bottom-right",
  "bottom-left",
  "top-left",
];

/** The arc positions lit for a given shield count, in fill order. */
export function litArcPositions(shields: ShieldCount): readonly ArcPosition[] {
  return ARC_FILL_ORDER.slice(0, shields);
}
