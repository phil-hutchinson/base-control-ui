// One bay's planet: a `<use>` of the given planet's whole body, drawn from
// the shared sprite (PlanetDefs). Purely decorative - a bay's accessible
// name (squareLabel.ts) never mentions a planet - so the SVG carries no
// title or description and is hidden from the accessibility tree.
//
// Drawn whether or not the bay is occupied: there is no occupancy condition
// here or in whatever mounts this component. A ship standing on the bay
// simply draws over it, exactly as it already does over a site marker.

import type { PlanetArt } from "./planetArt";
import "./Planet.css";

interface PlanetProps {
  readonly planet: PlanetArt;
}

export function Planet({ planet }: PlanetProps) {
  return (
    <svg className="planet" viewBox="0 0 100 100" aria-hidden="true">
      <use href={`#${planet.ids.body}`} />
    </svg>
  );
}
