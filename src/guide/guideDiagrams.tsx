// The guide's five diagrams: each a thin component handing `GuideDiagram` a
// fixed list of cells built from real `BoardSquare`s, so a future restyle of
// ship or node art redraws these for free. Every ship is green; no square
// carries a selection mark or a condition bar. Countdown numbers and cycle
// positions are derived from `../rules/countdown`, exactly as `Board` derives
// them, rather than typed in by hand.

import { countdownNumber, nodeCyclePosition } from "../rules/countdown";
import type { NodePriority } from "../rules/nodeQueue";
import type { PowerLevel } from "../rules/power";
import { MAX_POWER } from "../rules/power";
import { PLANET_ART } from "../board/planetArt";
import type { GuideDiagramCell } from "./GuideDiagram";
import { GuideDiagram } from "./GuideDiagram";
import { movementCostOffsets } from "./movementCosts";

/**
 * A charged node holding a ship, showing the given plies-remaining as its
 * countdown and gauge. `power` excludes zero: a ship at zero fuel draws no
 * gauge marks, so it would be indistinguishable from one with no level at
 * all — never a state this guide shows.
 */
function chargedNodeCell(
  squareName: string,
  pliesRemaining: number,
  power: Exclude<PowerLevel, 0>,
): GuideDiagramCell {
  return {
    kind: "square",
    square: {
      isPlanet: false,
      squareName,
      nodeState: "charged",
      cyclePosition: nodeCyclePosition("charged", pliesRemaining, true),
      countdownNumber: countdownNumber("charged", pliesRemaining, true),
      occupant: { side: "green", power },
    },
  };
}

/** Diagram 1: three charged nodes reading 3, 1 and 2, three ships at three different fuel levels, an arrow, then a "+3" note. */
export function ScoringDiagram() {
  const cells: readonly GuideDiagramCell[] = [
    chargedNodeCell("guide-scoring-1", 6, 5),
    chargedNodeCell("guide-scoring-2", 2, 3),
    chargedNodeCell("guide-scoring-3", 4, 1),
    { kind: "arrow" },
    { kind: "note", text: "+3" },
  ];
  return <GuideDiagram columns={5} cells={cells} />;
}

const MOVEMENT_GRID_OFFSETS = [-2, -1, 0, 1, 2];

/** Diagram 2: a 5 x 5 grid, a fully-fuelled ship at centre, and each reachable square's move cost. */
export function MovementDiagram() {
  const offsets = movementCostOffsets();
  const cells: GuideDiagramCell[] = [];

  for (const deltaRow of MOVEMENT_GRID_OFFSETS) {
    for (const deltaColumn of MOVEMENT_GRID_OFFSETS) {
      const squareName = `guide-movement-${deltaColumn}-${deltaRow}`;
      if (deltaColumn === 0 && deltaRow === 0) {
        cells.push({
          kind: "square",
          square: {
            isPlanet: false,
            squareName,
            occupant: { side: "green", power: MAX_POWER },
          },
        });
        continue;
      }

      const offset = offsets.find(
        (candidate) =>
          candidate.deltaColumn === deltaColumn &&
          candidate.deltaRow === deltaRow,
      );
      if (offset === undefined) {
        cells.push({ kind: "empty" });
        continue;
      }

      cells.push({
        kind: "number",
        square: { isPlanet: false, squareName },
        value: offset.cost,
      });
    }
  }

  return <GuideDiagram columns={MOVEMENT_GRID_OFFSETS.length} cells={cells} />;
}

const REFUELLING_PLANET = PLANET_ART[0];

/** Diagram 3: a ship on a planet at four fuel, an arrow, then the same ship on the same planet at six. */
export function RefuellingDiagram() {
  const cells: readonly GuideDiagramCell[] = [
    {
      kind: "square",
      square: {
        isPlanet: true,
        planet: REFUELLING_PLANET,
        squareName: "guide-refuelling-1",
        occupant: { side: "green", power: 4 },
      },
    },
    { kind: "arrow" },
    {
      kind: "square",
      square: {
        isPlanet: true,
        planet: REFUELLING_PLANET,
        squareName: "guide-refuelling-2",
        occupant: { side: "green", power: 6 },
      },
    },
  ];
  return <GuideDiagram columns={3} cells={cells} />;
}

/** Diagram 4: a charged node at 1 becoming a depleted node at 5, the same ship trapped inside throughout. */
export function NodeLifecycleDiagram() {
  const power = 4;
  const cells: readonly GuideDiagramCell[] = [
    chargedNodeCell("guide-lifecycle-1", 2, power),
    { kind: "arrow" },
    {
      kind: "square",
      square: {
        isPlanet: false,
        squareName: "guide-lifecycle-2",
        nodeState: "depleted",
        cyclePosition: nodeCyclePosition("depleted", 11, true),
        countdownNumber: countdownNumber("depleted", 11, true),
        occupant: { side: "green", power },
      },
    },
  ];
  return <GuideDiagram columns={3} cells={cells} />;
}

/** One inactive node cell, drawing as many rings as its priority. */
function inactiveNodeCell(
  squareName: string,
  priority: NodePriority,
): GuideDiagramCell {
  return {
    kind: "square",
    square: {
      isPlanet: false,
      squareName,
      nodeState: "inactive",
      priority,
    },
  };
}

/** Diagram 5: one indicator through a full rotation, three rings to one to two to three. */
export function NodeSelectionDiagram() {
  const cells: readonly GuideDiagramCell[] = [
    inactiveNodeCell("guide-selection-1", 3),
    { kind: "arrow" },
    inactiveNodeCell("guide-selection-2", 1),
    { kind: "arrow" },
    inactiveNodeCell("guide-selection-3", 2),
    { kind: "arrow" },
    inactiveNodeCell("guide-selection-4", 3),
  ];
  return <GuideDiagram columns={7} cells={cells} />;
}
