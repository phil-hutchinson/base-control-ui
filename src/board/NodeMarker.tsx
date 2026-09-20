// Decorative node-state artwork, drawn behind any ship on the same square,
// with one appearance per rules.md §8.1 state. Charged and depleted are a
// radial-gradient circle, wider than the square and cropped to it by the
// outer <svg>, one gold and one grey, that shifts its middle gradient stop
// as the node travels through its own cycle. Inactive is drawn differently:
// concentric gold rings, one per priority the node carries (rules.md §8.2)
// — a priority-3 node shows three rings, and nothing is drawn behind them.
// Purely decorative - a screen reader gets the node and its state from the
// occupying square's accessible name (see squareLabel.ts), so the SVG
// carries no title or description and is hidden from the accessibility
// tree.
//
// A node going inactive -> charged plays a charge animation instead of the
// ordinary charged artwork (see `boardAnimations.ts`): the outgoing rings
// cross-fade into the charged artwork, seen at first through a small round
// mask that then grows to reveal the whole thing. It is drawn only while
// `chargeAnimation` is given; without it, a charged node's markup is
// unchanged from the plain artwork below.

import type { CSSProperties } from "react";
import type { NodeState } from "../rules/nodes";
import type { NodePriority } from "../rules/nodeQueue";
import type { NodeChargeAnimation } from "./boardAnimations";
import { INACTIVE_RING_COLOR } from "./squareArt";
import "./NodeMarker.css";

interface NodeMarkerProps {
  readonly state: NodeState;
  readonly squareName: string;
  /**
   * How far the node has travelled through its state's own cycle (0 to 1,
   * see `nodeCyclePosition` in `../rules/countdown`): its countdown for a
   * charged node carrying one, and for a depleted node with a ship on it
   * (a trap); 0 always for a charged node with no countdown and for a
   * depleted node with no ship (an exit). Ignored for an inactive node.
   */
  readonly cyclePosition?: number;
  /**
   * The priority an inactive node carries (rules.md §8.2), 1 to 3, drawn as
   * that many concentric rings. Ignored for a charged or depleted node.
   */
  readonly priority?: NodePriority;
  /**
   * Present while this square's node is playing its inactive-to-charged
   * animation (`boardAnimations.ts`). Ignored unless `state` is `"charged"`.
   */
  readonly chargeAnimation?: NodeChargeAnimation;
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

// An inactive node's rings, innermost first, in the marker's 100-unit
// viewBox. Priority p draws the innermost p rings, so a priority-1 node is
// one small ring and a priority-3 node is three rings growing outward: the
// node visibly fills up as its turn approaches. Starting values for the
// owner's eye, not a measured result.
const INACTIVE_RING_RADII: readonly number[] = [18, 28, 38];
const INACTIVE_RING_STROKE_WIDTH = 5;

// The charge animation's round mask, at its smallest, in the marker's own
// 0-100 units - about the size of the charged gradient's gold core. A
// starting value for the owner's eye, not a measured result.
const CHARGE_MASK_START_RADIUS = 20;

/** Radii, gradient stops, colours and opacities for the two clocked states, taken from
 * doc/plan/00000023-update-node-visual/node-artwork.md exactly as specified
 * there. One artwork per clocked state; the exhaustive switch has no
 * default, so a new clocked state is a compile error rather than a silent
 * gap. Inactive is drawn separately, as rings, by `NodeMarker` itself.
 */
function nodeArtwork(
  state: "charged" | "depleted",
  cyclePosition: number | undefined,
): NodeStateArtwork {
  switch (state) {
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
  priority,
  chargeAnimation,
}: NodeMarkerProps) {
  if (state === "inactive") {
    // A priority is always given for a real inactive node (Board.tsx reads
    // one off its NodeStatus); the fallback of one ring only guards a marker
    // rendered without one, so it degrades rather than drawing nothing.
    const ringCount = priority ?? 1;
    return (
      <svg
        className={`node-marker node-marker--${state}`}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        {INACTIVE_RING_RADII.slice(0, ringCount).map((radius) => (
          <circle
            key={radius}
            cx={50}
            cy={50}
            r={radius}
            fill="none"
            stroke={INACTIVE_RING_COLOR}
            strokeWidth={INACTIVE_RING_STROKE_WIDTH}
          />
        ))}
      </svg>
    );
  }

  const { radius, stops } = nodeArtwork(state, cyclePosition);
  // SVG ids are document-global, and several node markers are drawn into
  // one document at once, so the gradient id carries the square's own name.
  const gradientId = `node-${squareName}-fill`;

  if (state === "charged" && chargeAnimation) {
    // Both the mask id and the mask's starting scale are document- or
    // marker-specific, so they are computed here rather than in CSS: ids for
    // the same reason as the gradient's, the scale because it depends on
    // this artwork's own radius (TS's, per NodeMarker.tsx's own numbers).
    const maskId = `node-${squareName}-charge-mask`;
    const maskStartScale = CHARGE_MASK_START_RADIUS / radius;
    return (
      <svg
        key={chargeAnimation.runId}
        className={`node-marker node-marker--${state} node-marker--charging`}
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
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={100}
            height={100}
          >
            <circle
              className="node-marker__charge-mask-circle"
              cx={50}
              cy={50}
              r={radius}
              fill="white"
              style={
                {
                  "--node-charge-mask-start-scale": maskStartScale,
                } as CSSProperties
              }
            />
          </mask>
        </defs>
        {INACTIVE_RING_RADII.slice(0, chargeAnimation.priority).map(
          (ringRadius) => (
            <circle
              key={ringRadius}
              className="node-marker__outgoing-ring"
              cx={50}
              cy={50}
              r={ringRadius}
              fill="none"
              stroke={INACTIVE_RING_COLOR}
              strokeWidth={INACTIVE_RING_STROKE_WIDTH}
            />
          ),
        )}
        <g className="node-marker__charge-reveal" mask={`url(#${maskId})`}>
          <circle cx={50} cy={50} r={radius} fill={`url(#${gradientId})`} />
        </g>
      </svg>
    );
  }

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
