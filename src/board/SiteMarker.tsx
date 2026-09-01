// Decorative site-state artwork: one radial-gradient circle at the square's
// centre, drawn behind any ship on the same square, with one appearance per
// rules.md §8.1 state. Active is a disc that grows and warms as the site's
// pressure builds; charged and dormant are the same larger shape, wider than
// the square and cropped to it by the outer <svg>, one gold and one grey.
// Purely decorative - a screen reader gets the site and its state from the
// occupying square's accessible name (see squareLabel.ts), so the SVG
// carries no title or description and is hidden from the accessibility
// tree.

import type { SiteState } from "../rules/sites";
import "./SiteMarker.css";

interface SiteMarkerProps {
  readonly state: SiteState;
  readonly squareName: string;
  /**
   * How far the site has travelled through its state's own cycle (0 to 1,
   * see `siteCyclePosition` in `../rules/sites`): drain for charged,
   * remaining drain for dormant, pressure for active. Falls back to the
   * state's start-of-cycle appearance when absent.
   */
  readonly cyclePosition?: number;
}

interface GradientStop {
  readonly offsetPercent: number;
  readonly color: string;
  readonly opacity: number;
}

interface SiteStateArtwork {
  readonly radius: number;
  readonly stops: readonly GradientStop[];
}

// The middle stop's offset at the start and end of each clocked state's
// cycle. Charged travels outward from its start value to its end value as
// the site nears the end of its life; dormant travels the same road in
// the opposite direction as the site cools. Each state's start value is its
// start-of-cycle appearance.
const CHARGED_START_OFFSET_PERCENT = 25;
const CHARGED_END_OFFSET_PERCENT = 50;
const DORMANT_START_OFFSET_PERCENT = 50;
const DORMANT_END_OFFSET_PERCENT = 25;

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

// Active's start-to-end travel, at a freshly-cycled site's pressure of 1 and
// at the pressure cap: the small pale disc from node-artwork.md's "Dormant"
// section growing and warming into the larger disc from that same document's
// "Active" section (see siteArtwork's comment for why those pre-0.11
// headings do not mean what they mean in the code).
const ACTIVE_START_RADIUS = 12;
const ACTIVE_END_RADIUS = 24;
const ACTIVE_START_INNER_COLOR = "#F1DBA5";
const ACTIVE_END_INNER_COLOR = "#DAA520";
const ACTIVE_OUTER_COLOR = "#DAA520";
const ACTIVE_START_OUTER_OPACITY = 0.75;
const ACTIVE_END_OUTER_OPACITY = 0.5;

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
// there (that document's own, pre-0.11 headings, which do not mean what the
// same words mean in the code: "Charged" for charged and "Depleted" for
// dormant below. Active now travels between two of that document's
// sections: its "Dormant" section — the small pale disc — at a freshly
// cycled site's pressure of 1, and its "Active" section — the larger gold
// disc, what the code has always drawn for this state — at the pressure
// cap). One artwork per site state; the exhaustive switch has no default,
// so a new state is a compile error rather than a silent gap.
function siteArtwork(
  state: SiteState,
  cyclePosition: number | undefined,
): SiteStateArtwork {
  switch (state) {
    case "active":
      return {
        radius: lerpNumber(
          ACTIVE_START_RADIUS,
          ACTIVE_END_RADIUS,
          cyclePosition,
        ),
        stops: [
          {
            offsetPercent: 0,
            color: hexLerp(
              ACTIVE_START_INNER_COLOR,
              ACTIVE_END_INNER_COLOR,
              cyclePosition,
            ),
            opacity: 1,
          },
          {
            offsetPercent: 100,
            color: ACTIVE_OUTER_COLOR,
            opacity: lerpNumber(
              ACTIVE_START_OUTER_OPACITY,
              ACTIVE_END_OUTER_OPACITY,
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
    case "dormant":
      return {
        radius: 70,
        stops: [
          { offsetPercent: 0, color: "#808080", opacity: 1 },
          {
            offsetPercent: middleStopOffsetPercent(
              DORMANT_START_OFFSET_PERCENT,
              DORMANT_END_OFFSET_PERCENT,
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

export function SiteMarker({
  state,
  squareName,
  cyclePosition,
}: SiteMarkerProps) {
  const { radius, stops } = siteArtwork(state, cyclePosition);
  // SVG ids are document-global, and seventeen sites are drawn into one
  // document at once, so the gradient id carries the square's own name.
  const gradientId = `site-${squareName}-fill`;

  return (
    <svg
      className={`site-marker site-marker--${state}`}
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
