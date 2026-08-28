// Decorative site-state artwork: one radial-gradient circle at the square's
// centre, drawn behind any ship on the same square, with one appearance per
// rules.md §8.1 state. Active is a small disc; charged and dormant are the
// same larger shape, wider than the square and cropped to it by the outer
// <svg>, one gold and one grey. Purely decorative - a screen reader gets the
// site and its state from the occupying square's accessible name (see
// squareLabel.ts), so the SVG carries no title or description and is hidden
// from the accessibility tree.

import type { SiteState } from "../rules/sites";
import "./SiteMarker.css";

interface SiteMarkerProps {
  readonly state: SiteState;
  readonly squareName: string;
  /**
   * How far the site is through its charged or dormant clock (0 to 1, see
   * `siteCyclePosition` in `../rules/sites`). Ignored for active, which has
   * no clock; falls back to the state's start-of-cycle offset when absent.
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

// Radii, gradient stops, colours and opacities, taken from
// doc/plan/00000023-update-node-visual/node-artwork.md exactly as specified
// there (that document's own, pre-0.11 headings: "Active" for the active
// state below, "Charged" for charged, and "Depleted" for dormant — the
// document's "Dormant" section, the small pale disc, has no state left to
// draw and is not used here). One artwork per site state; the exhaustive
// switch has no default, so a new state is a compile error rather than a
// silent gap.
function siteArtwork(
  state: SiteState,
  cyclePosition: number | undefined,
): SiteStateArtwork {
  switch (state) {
    case "active":
      return {
        radius: 24,
        stops: [
          { offsetPercent: 0, color: "#DAA520", opacity: 1 },
          { offsetPercent: 100, color: "#DAA520", opacity: 0.5 },
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
