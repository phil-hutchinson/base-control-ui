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
// unchanged from the plain artwork below. A steal claim (steal.md §3) plays
// the same animation: the outgoing rings are the prospective node's own
// three rings, in its signal's colour, revealing the signal-coloured charged
// artwork beneath — `chargeAnimation.signal` selects this instead of
// `chargeAnimation.priority`'s ring count and gold.
//
// A charged node running out plays a burnout animation instead of the
// ordinary depleted artwork: each gradient stop's colour travels from its
// charged value to its own depleted value over one duration (shared with
// NodeCountdown - see BoardSquare.css). Offsets, opacities and the radius
// do not animate, since they already agree at this transition. It is drawn
// only while `burnoutAnimation` is given; without it, a depleted node's
// markup is unchanged from the plain artwork below.
//
// A prospective square a Node scramble moved to another signal (steal.md
// §10) plays a recolour sweep: its rings are drawn in the old signal's
// colour, and the new colour's rings are painted over them along their own
// circumference, from 12 o'clock clockwise, all three together. Each swept
// ring is dashed to exactly its own length, so animating the dash offset
// from that length to zero reveals it from the path's start; a circle's
// path starts at 3 o'clock and runs clockwise on screen, so the swept rings
// are turned a quarter back to start at 12. It is drawn only while
// `recolorAnimation` is given; without it, a prospective node's markup is
// unchanged from the plain artwork below.

import type { CSSProperties } from "react";
import type { NodeState } from "../rules/nodes";
import type { NodePriority } from "../rules/nodeQueue";
import type { NodeSignal } from "../rules/steal";
import type { Side } from "../rules/fleet";
import type {
  NodeBurnoutAnimation,
  NodeChargeAnimation,
  NodeRecolorAnimation,
} from "./boardAnimations";
import {
  INACTIVE_RING_RADII,
  INACTIVE_RING_STROKE_WIDTH,
} from "./nodeMarkerGeometry";
import { INACTIVE_RING_COLOR, colorsForSignal } from "./squareArt";
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
   * The signal a steal node carries (steal.md §2), present only under steal.
   * A prospective marker always has one, drawn as its rings' colour; a
   * charged marker with one draws the same starting ball the other three
   * playstyles use for a freshly charged node, in its signal's colours
   * instead of gold, and never travels with `cyclePosition` — a steal node
   * has no countdown to travel towards. Ignored for an inactive or depleted
   * marker, and for a prospective marker falls back to the ordinary ring
   * colour when absent.
   */
  readonly signal?: NodeSignal;
  /**
   * The side `signal` is matched to under player-matching nodes (steal.md
   * §9), if any. When given, every colour this marker would otherwise draw
   * from `signal` — the charged ball, the prospective rings, and the charge
   * animation's outgoing rings — is drawn in this side's own colour instead
   * (`colorsForSignal` in `squareArt.ts`). Ignored when `signal` is absent.
   */
  readonly matchedSide?: Side;
  /**
   * Present while this square's node is playing its inactive-to-charged
   * animation (`boardAnimations.ts`). Ignored unless `state` is `"charged"`.
   */
  readonly chargeAnimation?: NodeChargeAnimation;
  /**
   * Present while this square's node is playing its charged-to-depleted
   * burnout animation (`boardAnimations.ts`). Ignored unless `state` is
   * `"depleted"`.
   */
  readonly burnoutAnimation?: NodeBurnoutAnimation;
  /**
   * Present while this square's rings are sweeping from an old signal's
   * colour to `signal`'s, because a Node scramble recoloured it
   * (`boardAnimations.ts`). Ignored unless `state` is `"prospective"`.
   */
  readonly recolorAnimation?: NodeRecolorAnimation;
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

// Ring radii and stroke width live in `nodeMarkerGeometry.ts`, shared with
// the planet effects panel's Additional nodes symbol.

// The charge animation's round mask, at its smallest, in the marker's own
// 0-100 units - about the size of the charged gradient's gold core. A
// starting value for the owner's eye, not a measured result.
const CHARGE_MASK_START_RADIUS = 20;

/**
 * The charged shape every charged node shares - a radius-70 ball with a core
 * colour, the same core faded at the middle stop, and a rim colour - so a
 * steal charged node (fixed at its start-of-cycle offset) and today's gold
 * one (travelling with `cyclePosition`) are one shape with different colours
 * and a different offset, never two separately typed-out balls.
 */
function chargedShape(
  core: string,
  rim: string,
  middleOffsetPercent: number,
): NodeStateArtwork {
  return {
    radius: 70,
    stops: [
      { offsetPercent: 0, color: core, opacity: 1 },
      { offsetPercent: middleOffsetPercent, color: core, opacity: 0.7 },
      { offsetPercent: 100, color: rim, opacity: 1 },
    ],
  };
}

/** Radii, gradient stops, colours and opacities for the two clocked states, taken from
 * doc/plan/00000023-update-node-visual/node-artwork.md exactly as specified
 * there, except that a charged node carrying a steal signal (steal.md §2)
 * draws the same shape in its signal's colours instead of gold — or, when
 * that signal is matched to a side (steal.md §9), that side's own colours —
 * fixed at its start-of-cycle offset regardless of `cyclePosition` — a steal
 * node has no countdown for a middle stop to travel towards (steal.md §2). One artwork
 * per clocked state; the exhaustive switch has no default, so a new clocked
 * state is a compile error rather than a silent gap. Inactive and
 * prospective are drawn separately, as rings, by `NodeMarker` itself.
 */
function nodeArtwork(
  state: "charged" | "depleted",
  cyclePosition: number | undefined,
  signal?: NodeSignal,
  matchedSide?: Side,
): NodeStateArtwork {
  if (state === "charged" && signal !== undefined) {
    const { core, rim } = colorsForSignal(signal, matchedSide);
    return chargedShape(core, rim, CHARGED_START_OFFSET_PERCENT);
  }
  switch (state) {
    case "charged":
      return chargedShape(
        "#DAA520",
        "#F5DEB3",
        middleStopOffsetPercent(
          CHARGED_START_OFFSET_PERCENT,
          CHARGED_END_OFFSET_PERCENT,
          cyclePosition,
        ),
      );
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
  signal,
  matchedSide,
  chargeAnimation,
  burnoutAnimation,
  recolorAnimation,
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

  if (state === "prospective") {
    // A prospective node (steal.md §2) always shows all three rings — there
    // are no priorities under steal to distinguish — in its signal's colour.
    // A marker rendered without one (no real prospective node lacks a
    // signal) falls back to the ordinary ring colour rather than drawing
    // nothing.
    const ringColor =
      signal === undefined
        ? INACTIVE_RING_COLOR
        : colorsForSignal(signal, matchedSide).core;
    if (recolorAnimation) {
      const fromColor = colorsForSignal(
        recolorAnimation.fromSignal,
        recolorAnimation.fromMatchedSide,
      ).core;
      return (
        <svg
          key={recolorAnimation.runId}
          className={`node-marker node-marker--${state} node-marker--recoloring`}
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          {INACTIVE_RING_RADII.map((radius) => (
            <circle
              key={`from-${radius}`}
              className="node-marker__recolor-underlay"
              cx={50}
              cy={50}
              r={radius}
              fill="none"
              stroke={fromColor}
              strokeWidth={INACTIVE_RING_STROKE_WIDTH}
            />
          ))}
          {INACTIVE_RING_RADII.map((radius) => {
            const length = 2 * Math.PI * radius;
            return (
              <circle
                key={`to-${radius}`}
                className="node-marker__recolor-sweep"
                cx={50}
                cy={50}
                r={radius}
                fill="none"
                stroke={ringColor}
                strokeWidth={INACTIVE_RING_STROKE_WIDTH}
                strokeDasharray={length}
                transform="rotate(-90 50 50)"
                style={
                  { "--node-recolor-ring-length": length } as CSSProperties
                }
              />
            );
          })}
        </svg>
      );
    }
    return (
      <svg
        className={`node-marker node-marker--${state}`}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        {INACTIVE_RING_RADII.map((radius) => (
          <circle
            key={radius}
            cx={50}
            cy={50}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={INACTIVE_RING_STROKE_WIDTH}
          />
        ))}
      </svg>
    );
  }

  const { radius, stops } = nodeArtwork(
    state,
    cyclePosition,
    signal,
    matchedSide,
  );
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
    // A steal claim's outgoing rings are the prospective node's own three,
    // in its signal's colour (steal.md §3); the other three playstyles'
    // outgoing rings are the inactive node's own priority count, in gold.
    const outgoingRingRadii =
      chargeAnimation.signal === undefined
        ? INACTIVE_RING_RADII.slice(0, chargeAnimation.priority)
        : INACTIVE_RING_RADII;
    const outgoingRingColor =
      chargeAnimation.signal === undefined
        ? INACTIVE_RING_COLOR
        : colorsForSignal(chargeAnimation.signal, matchedSide).core;
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
        {outgoingRingRadii.map((ringRadius) => (
          <circle
            key={ringRadius}
            className="node-marker__outgoing-ring"
            cx={50}
            cy={50}
            r={ringRadius}
            fill="none"
            stroke={outgoingRingColor}
            strokeWidth={INACTIVE_RING_STROKE_WIDTH}
          />
        ))}
        <g className="node-marker__charge-reveal" mask={`url(#${maskId})`}>
          <circle cx={50} cy={50} r={radius} fill={`url(#${gradientId})`} />
        </g>
      </svg>
    );
  }

  if (state === "depleted" && burnoutAnimation) {
    // Each stop's "from" colour is the charged artwork's own colour at the
    // same position - never re-typed as a literal - letting the implicit
    // end keyframe resolve to this stop's ordinary depleted colour, set
    // here in `style` rather than as a `stop-color` attribute so the
    // animation has a base value to return to.
    const chargedStops = nodeArtwork("charged", undefined).stops;
    return (
      <svg
        key={burnoutAnimation.runId}
        className={`node-marker node-marker--${state} node-marker--burning-out`}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="60%">
            {stops.map((stop, index) => (
              <stop
                key={stop.offsetPercent}
                offset={`${stop.offsetPercent}%`}
                stopOpacity={stop.opacity}
                className="node-marker__burnout-stop"
                style={
                  {
                    stopColor: stop.color,
                    "--node-burnout-from": chargedStops[index].color,
                  } as CSSProperties
                }
              />
            ))}
          </radialGradient>
        </defs>
        <circle cx={50} cy={50} r={radius} fill={`url(#${gradientId})`} />
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
