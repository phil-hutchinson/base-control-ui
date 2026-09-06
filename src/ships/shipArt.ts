// The names and numbers behind a ship's artwork: the ids `ShipDefs` gives
// its shared `<defs>` content and `ShipModel` reads back with `<use>`, plus
// the power gauge's geometry and per-side palette. Everything here is
// lifted verbatim from `.local/eg_spaceship.html` - this module is the
// single place an id or a colour is written down, so a rename cannot
// half-happen between the sprite and the ships that use it.
//
// Every id carries a `ship-` prefix so it cannot collide with NodeMarker's
// `node-<square>-fill` ids or with anything a later story adds.

import type { Side } from "../rules/fleet";

/** The id `ShipModel` `<use>`s directly: a side's whole hull. */
export interface ShipSideArt {
  readonly hullId: string;
}

export const SHIP_ART: Record<Side, ShipSideArt> = {
  green: {
    hullId: "ship-green-hull",
  },
  red: {
    hullId: "ship-red-hull",
  },
};

/**
 * Ids used only inside `ShipDefs` itself, to wire the hull group's own
 * internal references (gradients, and the green hull's turbojet group).
 */
export const SHIP_DEFS_IDS = {
  green: {
    gradFront: "ship-green-grad-front",
    gradDeck: "ship-green-grad-deck",
    gradWing: "ship-green-grad-wing",
    gradRim: "ship-green-grad-rim",
    gradPod: "ship-green-grad-pod",
    gradBore: "ship-green-grad-bore",
    gradGlow: "ship-green-grad-glow",
    gradNav: "ship-green-grad-nav",
    jet: "ship-green-jet",
  },
  red: {
    gradFace: "ship-red-grad-face",
    gradRim: "ship-red-grad-rim",
    gradNacelle: "ship-red-grad-nacelle",
    gradBore: "ship-red-grad-bore",
    gradEglow: "ship-red-grad-eglow",
    gradNav: "ship-red-grad-nav",
    gradPod: "ship-red-grad-pod",
  },
} as const;

/** How many slots the power gauge draws - power runs 0-6 (rules.md §4.1, src/rules/power.ts). */
export const GAUGE_SLOT_COUNT = 6;

/**
 * Every slot's (x, y) position in the 0-100 viewBox, in reading order - the
 * top row left to right, then the bottom row - so index N is always "the
 * Nth slot to light" (powerGauge.ts).
 */
export const GAUGE_SLOT_POSITIONS = [
  { x: 8, y: 10 },
  { x: 41, y: 10 },
  { x: 74, y: 10 },
  { x: 8, y: 26 },
  { x: 41, y: 26 },
  { x: 74, y: 26 },
] as const;

/** The black underlay drawn beneath a lit slot's line. An unlit slot draws neither this nor a line - see GaugePalette. */
export const GAUGE_UNDERLAY_COLOR = "#151c31";

/** The lit bar's geometry - drawn twice, coincident, a black underlay then the side's colour on top. */
export const GAUGE_BAR_LENGTH = 18;
export const GAUGE_BAR_UNDERLAY_STROKE_WIDTH = 11;
export const GAUGE_BAR_STROKE_WIDTH = 6;

/**
 * A side's gauge colour: the lit bar's colour. There is deliberately no
 * unlit colour - an unlit slot renders nothing at all.
 */
export interface GaugePalette {
  readonly barColor: string;
}

export const GAUGE_PALETTE: Record<Side, GaugePalette> = {
  green: {
    barColor: "#4fbf72",
  },
  red: {
    barColor: "#e00000",
  },
};
