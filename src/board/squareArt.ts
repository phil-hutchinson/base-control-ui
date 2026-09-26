// Colours used by square-level board art: a node's priority rings
// (NodeMarker.tsx), a rotator's mark (RotatorMarker.tsx) and, under steal, a
// node's signal (steal.md §2), each drawn in its own colour.

import type { NodeSignal } from "../rules/steal";

/** The colour an inactive node's priority rings are drawn in (rules.md §8.2). */
export const INACTIVE_RING_COLOR = "#DAA520";

/** The colour a rotator's mark is drawn in (rules.md §3.3). */
export const ROTATOR_COLOR = "#C0C0C0";

/**
 * The two colours a steal node's charged ball needs for its radial gradient
 * — a core and a rim, in the same roles as the charged artwork's own gold
 * core and wheat rim (`NodeMarker.tsx`). A signal's prospective rings are
 * drawn in its core colour.
 */
export interface SignalColors {
  readonly core: string;
  readonly rim: string;
}

/**
 * How the board presents each steal signal (steal.md §2), indexed by
 * `NodeSignal`: gold, silver, mid blue, purple, off white, in the order a
 * game of N nodes uses its first N signals.
 */
export const SIGNAL_COLORS: readonly SignalColors[] = [
  { core: "#DAA520", rim: "#F5DEB3" }, // gold
  { core: "#D8DCE3", rim: "#FFFFFF" }, // silver
  { core: "#3F7FE0", rim: "#B5CFF5" }, // mid blue
  { core: "#8E55D6", rim: "#D6C2F2" }, // purple
  { core: "#EEE8D0", rim: "#FFFFFF" }, // off white
];

/** The colours signal `s` draws in, for anywhere the board needs both. */
export function signalColors(signal: NodeSignal): SignalColors {
  return SIGNAL_COLORS[signal];
}
