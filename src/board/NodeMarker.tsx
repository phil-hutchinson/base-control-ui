// Decorative node-state artwork: one radial-gradient circle at the square's
// centre, drawn behind any ship on the same square, with one appearance per
// rules.md §8.1 state. Inactive is a disc that grows and warms as the node's
// pressure builds; charged and depleted are the same larger shape, wider than
// the square and cropped to it by the outer <svg>, one gold and one grey.
// Purely decorative - a screen reader gets the node and its state from the
// occupying square's accessible name (see squareLabel.ts), so the SVG
// carries no title or description and is hidden from the accessibility
// tree.

import type { NodeState } from "../rules/nodes";
import "./NodeMarker.css";

interface NodeMarkerProps {
  readonly state: NodeState;
  readonly squareName: string;
  /**
   * How far the node has travelled through its state's own cycle (0 to 1,
   * see `nodeCyclePosition` in `../rules/nodes`): drain for charged,
   * remaining drain for depleted, pressure for inactive. Falls back to the
   * state's start-of-cycle appearance when absent.
   */
  readonly cyclePosition?: number;
}

interface GradientStop {
  readonly offsetPercent: number;
  readonly color: string;
  readonly opacity: number;
}

interface NodeStateArtwork {
  readonly radius: number;
  readonly stops: readonly GradientStop[];
}

// The middle stop's offset at the start and end of each clocked state's
// cycle. Charged travels outward from its start value to its end value as
// the node nears the end of its life; depleted travels the same road in
// the opposite direction as the node cools. Each state's start value is its
// start-of-cycle appearance.
const CHARGED_START_OFFSET_PERCENT = 25;
const CHARGED_END_OFFSET_PERCENT = 50;
const DEPLETED_START_OFFSET_PERCENT = 50;
const DEPLETED_END_OFFSET_PERCENT = 25;

/** The middle stop's offset for a clocked state's start-to-end travel, at the given cycle position (or its start if none is given). */
function middleStopOffsetPercent(
  startOffsetPercent: number,
  endOffsetPercent: number,
  cyclePosition: number | undefined,
): number {
  if (cyclePosition === undefined) {
    return startOffsetPercent;
  }
  return (
    startOffsetPercent + (endOffsetPercent - startOffsetPercent) * cyclePosition
  );
}

// Inactive's start-to-end travel, at a freshly-cycled node's pressure of 1 and
// at the pressure cap: the small pale disc from node-artwork.md's "Dormant"
// section growing and warming into the larger disc from that same document's
// "Active" section (see nodeArtwork's comment for why those pre-0.11
// headings do not mean what they mean in the code).
const INACTIVE_START_RADIUS = 12;
const INACTIVE_END_RADIUS = 24;
const INACTIVE_START_INNER_COLOR = "#F1DBA5";
const INACTIVE_END_INNER_COLOR = "#DAA520";
const INACTIVE_OUTER_COLOR = "#DAA520";
const INACTIVE_START_OUTER_OPACITY = 0.75;
const INACTIVE_END_OUTER_OPACITY = 0.5;

/** Linear interpolation between two numbers, at a position clamped to [0, 1] (or the start if none is given). */
function lerpNumber(
  start: number,
  end: number,
  position: number | undefined,
): number {
  const clamped = Math.min(1, Math.max(0, position ?? 0));
  return start + (end - start) * clamped;
}

/** One colour channel, as a two-digit hex string. */
function hexChannel(value: number): string {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

/** The three 0–255 channels of a six-digit `#RRGGBB` colour. */
function hexChannels(color: string): readonly [number, number, number] {
  const digits = color.slice(1);
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ];
}

/**
 * Linear interpolation between two six-digit `#RRGGBB` colours, one channel
 * at a time, at a position clamped to [0, 1] (or the start if none is
 * given).
 */
function hexLerp(
  start: string,
  end: string,
  position: number | undefined,
): string {
  const clamped = Math.min(1, Math.max(0, position ?? 0));
  const startChannels = hexChannels(start);
  const endChannels = hexChannels(end);
  const mixed = startChannels.map((channel, index) =>
    Math.round(channel + (endChannels[index] - channel) * clamped),
  );
  return `#${mixed.map(hexChannel).join("")}`;
}

// Radii, gradient stops, colours and opacities, taken from
// doc/plan/00000023-update-node-visual/node-artwork.md exactly as specified
// there (that document's own, pre-0.11 headings: "Charged" and "Depleted"
// happen to match the code's own state names below, but "Dormant" and
// "Active" name neither — they are the two ends of what the code now calls
// the inactive state's travel. Inactive travels between two of that
// document's sections: its "Dormant" section — the small pale disc — at a
// freshly cycled node's pressure of 1, and its "Active" section — the
// larger gold disc, what the code has always drawn for this state — at the
// pressure cap). One artwork per node state; the exhaustive switch has no
// default, so a new state is a compile error rather than a silent gap.
function nodeArtwork(
  state: NodeState,
  cyclePosition: number | undefined,
): NodeStateArtwork {
  switch (state) {
    case "inactive":
      return {
        radius: lerpNumber(
          INACTIVE_START_RADIUS,
          INACTIVE_END_RADIUS,
          cyclePosition,
        ),
        stops: [
          {
            offsetPercent: 0,
            color: hexLerp(
              INACTIVE_START_INNER_COLOR,
              INACTIVE_END_INNER_COLOR,
              cyclePosition,
            ),
            opacity: 1,
          },
          {
            offsetPercent: 100,
            color: INACTIVE_OUTER_COLOR,
            opacity: lerpNumber(
              INACTIVE_START_OUTER_OPACITY,
              INACTIVE_END_OUTER_OPACITY,
              cyclePosition,
            ),
          },
        ],
      };
    case "charged":
      return {
        radius: 70,
        stops: [
          { offsetPercent: 0, color: "#DAA520", opacity: 1 },
          {
            offsetPercent: middleStopOffsetPercent(
              CHARGED_START_OFFSET_PERCENT,
              CHARGED_END_OFFSET_PERCENT,
              cyclePosition,
            ),
            color: "#DAA520",
            opacity: 0.7,
          },
          { offsetPercent: 100, color: "#F5DEB3", opacity: 1 },
        ],
      };
    case "depleted":
      return {
        radius: 70,
        stops: [
          { offsetPercent: 0, color: "#808080", opacity: 1 },
          {
            offsetPercent: middleStopOffsetPercent(
              DEPLETED_START_OFFSET_PERCENT,
              DEPLETED_END_OFFSET_PERCENT,
              cyclePosition,
            ),
            color: "#808080",
            opacity: 0.7,
          },
          { offsetPercent: 100, color: "#FFFFFF", opacity: 1 },
        ],
      };
  }
}

export function NodeMarker({
  state,
  squareName,
  cyclePosition,
}: NodeMarkerProps) {
  const { radius, stops } = nodeArtwork(state, cyclePosition);
  // SVG ids are document-global, and seventeen nodes are drawn into one
  // document at once, so the gradient id carries the square's own name.
  const gradientId = `node-${squareName}-fill`;

  return (
    <svg
      className={`node-marker node-marker--${state}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="60%">
          {stops.map((stop) => (
            <stop
              key={stop.offsetPercent}
              offset={`${stop.offsetPercent}%`}
              stopColor={stop.color}
              stopOpacity={stop.opacity}
            />
          ))}
        </radialGradient>
      </defs>
      <circle cx={50} cy={50} r={radius} fill={`url(#${gradientId})`} />
    </svg>
  );
}
