// Decorative site-state artwork: one radial-gradient circle at the square's
// centre, drawn behind any ship on the same square, with one appearance per
// rules.md §8.1 state. Dormant and active are small discs that differ in
// size as well as hue; charged and depleted are the same larger shape,
// wider than the square and cropped to it by the outer <svg>, one gold and
// one grey. Purely decorative - a screen reader gets the site and its state
// from the occupying square's accessible name (see squareLabel.ts), so the
// SVG carries no title or description and is hidden from the accessibility
// tree.

import type { SiteState } from "../rules/sites";
import "./SiteMarker.css";

interface SiteMarkerProps {
  readonly state: SiteState;
  readonly squareName: string;
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

// Radii, gradient stops, colours and opacities, taken from
// node-artwork.md exactly as specified there. Keyed by SiteState, so a
// state that gains or loses artwork is a compile error rather than a
// silent gap, the same shape as ShipIcon.tsx's ARC_QUADRANT. Charged's and
// depleted's middle stop offset is fixed here at its start-of-cycle
// position (25% and 50% respectively); it moves once the cycle position is
// wired in.
const SITE_ARTWORK: Record<SiteState, SiteStateArtwork> = {
  dormant: {
    radius: 12,
    stops: [
      { offsetPercent: 0, color: "#F1DBA5", opacity: 1 },
      { offsetPercent: 100, color: "#DAA520", opacity: 0.75 },
    ],
  },
  active: {
    radius: 24,
    stops: [
      { offsetPercent: 0, color: "#DAA520", opacity: 1 },
      { offsetPercent: 100, color: "#DAA520", opacity: 0.5 },
    ],
  },
  charged: {
    radius: 70,
    stops: [
      { offsetPercent: 0, color: "#DAA520", opacity: 1 },
      { offsetPercent: 25, color: "#DAA520", opacity: 0.7 },
      { offsetPercent: 100, color: "#F5DEB3", opacity: 1 },
    ],
  },
  depleted: {
    radius: 70,
    stops: [
      { offsetPercent: 0, color: "#808080", opacity: 1 },
      { offsetPercent: 50, color: "#808080", opacity: 0.7 },
      { offsetPercent: 100, color: "#FFFFFF", opacity: 1 },
    ],
  },
};

export function SiteMarker({ state, squareName }: SiteMarkerProps) {
  const { radius, stops } = SITE_ARTWORK[state];
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
