// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { squareFromName } from "../rules/board";
import type { ShipId } from "../rules/fleet";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import type {
  EnergyTotals,
  GameState,
  Ship,
  NodeStatus,
} from "../rules/gameState";
import type { PowerLevel } from "../rules/power";
import type { ChargedNodeCount, NodeState } from "../rules/nodes";
import { DEFAULT_CHARGED_NODE_COUNT } from "../rules/nodes";
import { ScoreDisplay } from "./ScoreDisplay";

afterEach(cleanup);

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

const UNUSED_SQUARES = ["A1", "B1", "C1", "D1", "E1", "F1"] as const;

/** `count` ships for `side`, at squares no test node uses. */
function shipsFor(side: "green" | "red", count: number): readonly Ship[] {
  return UNUSED_SQUARES.slice(0, count).map((square, index) =>
    ship(`${side}-${index + 1}`, side, square),
  );
}

function nodeStatuses(
  states: Readonly<Record<string, NodeState>>,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, state]) => [name, { state, level: 0 }]),
  );
}

function buildState(config: {
  energy?: EnergyTotals;
  ships?: readonly Ship[];
  nodes?: Readonly<Record<string, NodeState>>;
  chargedNodeCount?: ChargedNodeCount;
}): GameState {
  return {
    ships: config.ships ?? [],
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: "green",
    actionsRemaining: 1,
    actedThisPly: [],
    plyNumber: 1,
    randomSeed: 1,
    openingSeed: 1,
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: config.chargedNodeCount ?? DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
  };
}

describe("ScoreDisplay", () => {
  it("carries the true total and node count as a hidden sentence", () => {
    const state = buildState({ energy: { green: 24, red: 9 } });

    render(
      <ScoreDisplay
        state={state}
        side="green"
        displayedTotal={state.energy.green}
      />,
    );

    expect(
      screen.getByText("Green: 24 energy, no nodes held."),
    ).toBeInTheDocument();
  });

  it("shows both sides' totals as decorative digits, zero-padded", () => {
    const state = buildState({ energy: { green: 24, red: 9 } });

    const { container } = render(
      <div>
        <ScoreDisplay
          state={state}
          side="green"
          displayedTotal={state.energy.green}
        />
        <ScoreDisplay
          state={state}
          side="red"
          displayedTotal={state.energy.red}
        />
      </div>,
    );

    expect(container).toHaveTextContent("0024");
    expect(container).toHaveTextContent("0009");
    expect(
      screen.getByText("Red: 9 energy, no nodes held."),
    ).toBeInTheDocument();
  });

  it("draws a row as long as the smaller of the side's ship count and the board's charged-node count, none lit when the side holds none", () => {
    const sixShipsFiveNodes = buildState({
      ships: shipsFor("green", 6),
      chargedNodeCount: 5,
    });
    const sixShipsFourNodes = buildState({
      ships: shipsFor("green", 6),
      chargedNodeCount: 4,
    });
    const threeShips = buildState({
      ships: shipsFor("green", 3),
      chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
    });

    const rendered = [sixShipsFiveNodes, sixShipsFourNodes, threeShips].map(
      (state) =>
        render(<ScoreDisplay state={state} side="green" displayedTotal={0} />),
    );

    expect(
      rendered[0].container.querySelectorAll(".score-display__pip"),
    ).toHaveLength(5);
    expect(
      rendered[1].container.querySelectorAll(".score-display__pip"),
    ).toHaveLength(4);
    expect(
      rendered[2].container.querySelectorAll(".score-display__pip"),
    ).toHaveLength(3);
    for (const { container } of rendered) {
      expect(
        container.querySelectorAll(".score-display__pip--lit"),
      ).toHaveLength(0);
    }
  });

  it("lights a pip per charged node the side is standing on", () => {
    const state = buildState({
      nodes: { H8: "charged", E5: "charged", K5: "inactive" },
      ships: [
        ship("green-1", "green", "H8"),
        ship("green-2", "green", "E5"),
        ship("red-1", "red", "K5"),
      ],
    });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(container.querySelectorAll(".score-display__pip--lit")).toHaveLength(
      2,
    );
    expect(
      screen.getByText("Green: 0 energy, 2 nodes held."),
    ).toBeInTheDocument();
  });

  it("does not light a pip for a node the opposing side holds", () => {
    const state = buildState({
      nodes: { K5: "charged" },
      ships: [ship("red-1", "red", "K5"), ship("green-1", "green", "E5")],
    });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(container.querySelectorAll(".score-display__pip--lit")).toHaveLength(
      0,
    );
  });

  it("has no static accessibility violations", async () => {
    const state = buildState({});

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });

  it("draws the digits from the displayed total, not the state's true total", () => {
    const state = buildState({ energy: { green: 24, red: 9 } });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={15} />,
    );

    expect(container).toHaveTextContent("0015");
  });

  it("carries the state's true total in the hidden sentence even while the displayed total is still rolling", () => {
    const state = buildState({ energy: { green: 6, red: 0 } });

    render(<ScoreDisplay state={state} side="green" displayedTotal={0} />);

    expect(
      screen.getByText("Green: 6 energy, no nodes held."),
    ).toBeInTheDocument();
  });
});
