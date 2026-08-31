// The names and numbers behind a ship's artwork: the ids `ShipDefs` gives
// its shared `<defs>` content and `ShipModel` reads back with `<use>`, plus
// the shield gauge's geometry and per-side palette. Everything here is
// lifted verbatim from `.local/eg_spaceship.html` - this module is the
// single place an id or a colour is written down, so a rename cannot
// half-happen between the sprite and the ships that use it.
//
// Every id carries a `ship-` prefix so it cannot collide with SiteMarker's
// `site-<square>-fill` ids or with anything a later story adds.

import type { Side } from "../rules/fleet";

/** The ids `ShipModel` `<use>`s directly: a side's whole hull, and its bare gauge-icon geometry. */
export interface ShipSideArt {
  readonly hullId: string;
  readonly gaugeIconId: string;
}

export const SHIP_ART: Record<Side, ShipSideArt> = {
  green: {
    hullId: "ship-green-hull",
    gaugeIconId: "ship-green-gauge-icon",
  },
  red: {
    hullId: "ship-red-hull",
    gaugeIconId: "ship-red-gauge-icon",
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

/** How many slots the shield gauge draws - shields run 0-4 (rules.md §4.1, src/rules/shields.ts). */
export const GAUGE_SLOT_COUNT = 4;

/** Each slot's x offset in the 0-100 viewBox, left to right, a 23-unit pitch. */
export const GAUGE_SLOT_X = [10, 33, 56, 79] as const;

/** Every slot's y offset. */
export const GAUGE_SLOT_Y = 3;

/** The separator underlay drawn beneath every icon, lit or not, so neighbouring icons stay visually apart. */
export const GAUGE_SEPARATOR_COLOR = "#151c31";
export const GAUGE_SEPARATOR_STROKE_WIDTH = 3.4;

/** The icon's own stroke width, drawn over the separator. */
export const GAUGE_ICON_STROKE_WIDTH = 1.5;

/** The lit bar's geometry - drawn twice, coincident, an underlay then the side's colour on top. */
export const GAUGE_BAR_Y = 25;
export const GAUGE_BAR_X1 = 2.5;
export const GAUGE_BAR_X2 = 13.5;
export const GAUGE_BAR_UNDERLAY_STROKE_WIDTH = 8;
export const GAUGE_BAR_STROKE_WIDTH = 6;

/** A side's gauge colours: lit and unlit fill/outline, and the lit bar colour. */
export interface GaugePalette {
  readonly litFill: string;
  readonly litOutline: string;
  readonly barColor: string;
  readonly unlitFill: string;
  readonly unlitOutline: string;
}

export const GAUGE_PALETTE: Record<Side, GaugePalette> = {
  green: {
    litFill: "#4fbf72",
    litOutline: "#7dffab",
    barColor: "#4fbf72",
    unlitFill: "#151c31",
    unlitOutline: "#4fbf72",
  },
  red: {
    litFill: "#e00000",
    litOutline: "#ff8f8f",
    barColor: "#e00000",
    unlitFill: "#151c31",
    unlitOutline: "#e00000",
  },
};
