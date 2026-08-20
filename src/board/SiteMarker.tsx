// Decorative site-state artwork: one small circle at the square's centre,
// drawn behind any ship on the same square, with one appearance per
// rules.md §8.1 state. Depleted, dormant and active are the same shape in a
// different colour, each bordered like a bay square; charged additionally
// glows outward to fill most of the square. Purely decorative - a screen
// reader gets the site and its state from the occupying square's accessible
// name (see squareLabel.ts), so the SVG carries no title or description and
// is hidden from the accessibility tree.

import type { SiteState } from "../rules/sites";
import "./SiteMarker.css";

interface SiteMarkerProps {
  readonly state: SiteState;
}

// A 100 x 100 viewBox centred at (50, 50), matching ShipIcon's. Radius 12 is
// roughly a quarter of the square across, small enough to read as a marker
// rather than as the square's main content.
const MARKER_RADIUS = 12;

export function SiteMarker({ state }: SiteMarkerProps) {
  return (
    <svg
      className={`site-marker site-marker--${state}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle cx={50} cy={50} r={MARKER_RADIUS} fill="currentColor" />
    </svg>
  );
}
