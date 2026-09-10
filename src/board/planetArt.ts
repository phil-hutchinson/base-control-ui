// The names, numbers and ids behind each planet's drawing, ported from
// `.local/eg_planets.html` (committed at
// doc/plan/00000013-spaceship-bay-visual/eg_planets.html). That folder is
// named for the story that introduced these drawings, and its name still
// carries the old word for a planet; the path is history and stays exactly
// as it is. This module is the single place a planet's id is written down,
// so a rename cannot half-happen between `PlanetDefs` (which declares the
// ids) and `Planet` (which references one).
//
// Every id is `planet-<nn>-<part>`, where `<nn>` is the planet's own number
// from the gallery (zero-padded, one of 01-10, 13, 14) and `<part>` is a
// kebab-case name for what it is. Most parts are drawn from a shared
// vocabulary - `body`, `surface`, `sheen`, `blur`, `clip`, `moon-sheen`,
// `moon-clip`, `ring`, `ring-sheen`, `ring-whole`, `ring-back`, `ring-front`
// - reused across whichever planets need them. Three planets need something
// outside that vocabulary and name it plainly instead of forcing a fit:
// planet 9's moon has its own base-colour gradient distinct from its sheen,
// so it gets `moon-surface`; planet 13 is built from three stacked wave
// bands, so it gets `band-1`, `band-2` and `band-3`. Planet 2 has four
// moons, each its own colour, so its gradients are numbered the same way -
// `moon-1` through `moon-4`, in the order they are drawn.
//
// `body` is the id every planet declares for its whole drawing - grouped
// under one id, ready for `Planet.tsx` to `<use>` - and every other id is
// wiring `PlanetDefs` needs internally (gradients, filters, clip paths)
// that nothing outside it ever references.
//
// `planet-` prefixes every id for the same reason `ship-` does on
// `shipArt.ts`'s ids: it cannot collide with `NodeMarker`'s
// `node-<square>-fill` ids or with anything a later story adds.

/** How a planet's body is drawn - never a rule, and never a colour. */
export type PlanetSurface =
  | "plain"
  | "banded"
  | "continents"
  | "banded-cratered-companion"
  | "lines"
  | "waves";

/** How a ringed planet's ring is tilted relative to the board. */
export type RingOrientation = "horizontal" | "vertical" | "tilted";

export interface PlanetArt {
  /** The planet's own number in the source gallery: one of 1-10, 13, 14. */
  readonly number: number;
  /** A short description for a human reading this table - never shown to a player. */
  readonly name: string;
  /**
   * The surface treatment and, for a ringed planet, the ring's orientation -
   * both genuinely visible, describing how a planet is drawn.
   */
  readonly surface: PlanetSurface;
  readonly ringOrientation?: RingOrientation;
  /** Every id this planet's artwork declares, keyed by part name. Always includes `body`. */
  readonly ids: Readonly<Record<string, string>> & { readonly body: string };
}

function planetId(number: number, part: string): string {
  return `planet-${String(number).padStart(2, "0")}-${part}`;
}

function idsFor(
  number: number,
  parts: readonly string[],
): Readonly<Record<string, string>> & { readonly body: string } {
  const ids: Record<string, string> = {};
  for (const part of parts) {
    ids[part] = planetId(number, part);
  }
  return { ...ids, body: planetId(number, "body") };
}

/**
 * The twelve planets, in the source gallery's own numbering. Planets 11 and
 * 12 were dropped from the gallery's fourteen, so the numbers present are
 * 1-10, 13 and 14 - the gaps are intentional, not an omission.
 */
export const PLANET_ART: readonly PlanetArt[] = [
  {
    number: 1,
    name: "Tan planet with a cratered moon",
    surface: "plain",
    ids: idsFor(1, ["body", "surface", "moon-sheen", "blur", "moon-clip"]),
  },
  {
    number: 2,
    name: "Peru-and-purple planet with four small, separately coloured moons",
    surface: "plain",
    ids: idsFor(2, [
      "body",
      "surface",
      "moon-1",
      "moon-2",
      "moon-3",
      "moon-4",
    ]),
  },
  {
    number: 3,
    name: "Banded chocolate-brown planet",
    surface: "banded",
    ids: idsFor(3, ["body", "surface", "sheen"]),
  },
  {
    number: 4,
    name: "Blue-green water world",
    surface: "continents",
    ids: idsFor(4, ["body", "surface", "blur", "sheen", "clip"]),
  },
  {
    number: 5,
    name: "Gold planet with a wide ring",
    surface: "plain",
    ringOrientation: "horizontal",
    ids: idsFor(5, [
      "body",
      "surface",
      "sheen",
      "ring",
      "ring-sheen",
      "ring-whole",
      "ring-back",
      "ring-front",
    ]),
  },
  {
    number: 6,
    name: "Double planet: banded brown with a cratered companion",
    surface: "banded-cratered-companion",
    ids: idsFor(6, [
      "body",
      "surface",
      "sheen",
      "moon-sheen",
      "blur",
      "moon-clip",
    ]),
  },
  {
    number: 7,
    name: "Brown-and-pink planet with a tilted grey ring",
    surface: "banded",
    ringOrientation: "tilted",
    ids: idsFor(7, [
      "body",
      "surface",
      "sheen",
      "ring",
      "ring-whole",
      "ring-back",
      "ring-front",
    ]),
  },
  {
    number: 8,
    name: "Turquoise planet with a vertical white ring",
    surface: "banded",
    ringOrientation: "vertical",
    ids: idsFor(8, [
      "body",
      "surface",
      "sheen",
      "ring",
      "ring-whole",
      "ring-back",
      "ring-front",
    ]),
  },
  {
    number: 9,
    name: "Banded brown planet with an earth-like moon",
    surface: "banded",
    ids: idsFor(9, [
      "body",
      "surface",
      "sheen",
      "moon-surface",
      "blur",
      "moon-clip",
    ]),
  },
  {
    number: 10,
    name: "Magenta planet with pale surface lines",
    surface: "lines",
    ids: idsFor(10, ["body", "sheen", "blur", "clip"]),
  },
  {
    number: 13,
    name: "Cyan-purple-pink wavy planet",
    surface: "waves",
    ids: idsFor(13, [
      "body",
      "band-1",
      "band-2",
      "band-3",
      "sheen",
      "blur",
      "clip",
    ]),
  },
  {
    number: 14,
    name: "Blue-teal ringed planet with a gold core",
    surface: "plain",
    ringOrientation: "tilted",
    ids: idsFor(14, [
      "body",
      "sheen",
      "ring",
      "ring-whole",
      "ring-back",
      "ring-front",
    ]),
  },
];
