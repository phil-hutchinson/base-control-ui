// Colours used by square-level board art: a node's priority rings
// (NodeMarker.tsx), a rotator's mark (RotatorMarker.tsx) and, under steal, a
// node's signal (steal.md §2) or, when player-matching nodes (steal.md §9)
// matches it to a side, that side's own colour instead — each drawn in its
// own colour.

import type { Side } from "../rules/fleet";
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
 * `NodeSignal`: gold, silver, mid blue, purple, brown, in the order a game
 * of N nodes uses its first N signals. A signal matched to a side
 * (`PLAYER_NODE_COLORS`) is drawn in that side's pair instead — see
 * `colorsForSignal`.
 */
export const SIGNAL_COLORS: readonly SignalColors[] = [
  { core: "#DAA520", rim: "#F5DEB3" }, // gold
  { core: "#A9B0BB", rim: "#E4E8EE" }, // silver
  { core: "#3F7FE0", rim: "#B5CFF5" }, // mid blue
  { core: "#8E55D6", rim: "#D6C2F2" }, // purple
  { core: "#94602F", rim: "#D0A77C" }, // brown
];

/**
 * The two matched-node colour pairs (steal.md §9), keyed by side: with
 * player-matching nodes on, a player's own node is drawn in their colour
 * instead of its signal's. Cores are the app's own player colours
 * (`--color-green`, `--color-red` in `src/index.css`); rims are lighter
 * tints of the same cores, playing the role the wheat rim plays for gold.
 */
export const PLAYER_NODE_COLORS: Readonly<Record<Side, SignalColors>> = {
  green: { core: "#3FA66B", rim: "#C2E3D0" },
  red: { core: "#C8503F", rim: "#EDC7C2" },
};

/**
 * The colours to draw `signal` in: `matchedSide`'s own pair when given (the
 * signal is a matched node, steal.md §9), otherwise the signal's own entry
 * in `SIGNAL_COLORS`.
 */
export function colorsForSignal(
  signal: NodeSignal,
  matchedSide?: Side,
): SignalColors {
  return matchedSide === undefined
    ? SIGNAL_COLORS[signal]
    : PLAYER_NODE_COLORS[matchedSide];
}
