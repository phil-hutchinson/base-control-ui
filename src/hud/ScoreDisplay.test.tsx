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
import type { ScoringSetting } from "../rules/scoring";
import type { NodeSignal } from "../rules/steal";
import type { PlayerMatchingSetting } from "../rules/playerMatching";
import { PLAYER_NODE_COLORS, SIGNAL_COLORS } from "../board/squareArt";
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
  scoring?: ScoringSetting;
}): GameState {
  return {
    ships: config.ships ?? [],
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: "green",
    plyNumber: 1,
    randomSeed: 1,
    openingSeed: 1,
    nodePlaystyle: "continuous",
    rotators: [],
    planetBonus: "off",
    bonusPlanets: { green: [], red: [] },
    energy: config.energy ?? { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: config.chargedNodeCount ?? DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
    combatEnabled: true,
    scoring: config.scoring ?? "simple",
    playerMatching: "off",
  };
}

/** A five-node steal state (steal.md §2), with red's own node at signal 3
 * and green's at signal 4 — `matchedSignalForSide`'s own mapping for a
 * five-node board — for the player-matching pip tests below. */
function stealNodeStatuses(
  signalBySquare: Readonly<Record<string, NodeSignal>>,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(signalBySquare).map(([name, signal]) => [
      name,
      { state: "charged" as const, level: 0, signal },
    ]),
  );
}

function buildStealState(config: {
  ships?: readonly Ship[];
  signalBySquare?: Readonly<Record<string, NodeSignal>>;
  scoring?: ScoringSetting;
  playerMatching: PlayerMatchingSetting;
}): GameState {
  return {
    ships: config.ships ?? [],
    nodes: stealNodeStatuses(config.signalBySquare ?? {}),
    sideToMove: "green",
    plyNumber: 1,
    randomSeed: 1,
    openingSeed: 1,
    nodePlaystyle: "steal",
    rotators: [],
    planetBonus: "off",
    bonusPlanets: { green: [], red: [] },
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: 5,
    outOfTime: { green: false, red: false },
    combatEnabled: true,
    scoring: config.scoring ?? "bonus",
    playerMatching: config.playerMatching,
  };
}

/** Each lit pip's fill colour, in row order — empty for a pip left to the
 * stylesheet's gold. */
function litFills(container: HTMLElement): readonly string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(".score-display__pip--lit"),
  ).map((pip) => pip.style.getPropertyValue("--pip-fill"));
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

  it.each([
    { shipCount: 6, chargedNodeCount: 5 as const, pips: 5 },
    { shipCount: 6, chargedNodeCount: 4 as const, pips: 4 },
    { shipCount: 6, chargedNodeCount: 3 as const, pips: 3 },
    { shipCount: 3, chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT, pips: 3 },
    { shipCount: 3, chargedNodeCount: 4 as const, pips: 3 },
    { shipCount: 3, chargedNodeCount: 3 as const, pips: 3 },
  ])(
    "draws $pips pips — the smaller of the side's $shipCount ships and the board's $chargedNodeCount charged nodes — none lit when the side holds none",
    ({ shipCount, chargedNodeCount, pips }) => {
      const state = buildState({
        ships: shipsFor("green", shipCount),
        chargedNodeCount,
      });

      const { container } = render(
        <ScoreDisplay state={state} side="green" displayedTotal={0} />,
      );

      expect(container.querySelectorAll(".score-display__pip")).toHaveLength(
        pips,
      );
      expect(
        container.querySelectorAll(".score-display__pip--lit"),
      ).toHaveLength(0);
    },
  );

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

  it("leaves a lit pip to the stylesheet's gold when its node has no colour of its own", () => {
    const state = buildState({
      nodes: { H8: "charged" },
      ships: [ship("green-1", "green", "H8")],
    });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(litFills(container)).toEqual([""]);
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

  it.each([
    { scoring: "simple" as const, values: ["1", "2", "3", "4", "5"] },
    { scoring: "bonus" as const, values: ["1", "3", "6", "10", "15"] },
  ])(
    "draws what a turn pays under each pip's count under $scoring scoring",
    ({ scoring, values }) => {
      const state = buildState({
        ships: shipsFor("green", 6),
        chargedNodeCount: 5,
        scoring,
      });

      const { container } = render(
        <ScoreDisplay state={state} side="green" displayedTotal={0} />,
      );

      const numbers = Array.from(
        container.querySelectorAll(".score-display__pip-value"),
      ).map((node) => node.textContent);
      expect(numbers).toEqual(values);
    },
  );

  it.each([
    { scoring: "simple" as const, values: ["1", "2", "3"] },
    { scoring: "bonus" as const, values: ["1", "3", "6"] },
  ])(
    "truncates the number row with the pips under $scoring scoring",
    ({ scoring, values }) => {
      const state = buildState({
        ships: shipsFor("green", 3),
        chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
        scoring,
      });

      const { container } = render(
        <ScoreDisplay state={state} side="green" displayedTotal={0} />,
      );

      const numbers = Array.from(
        container.querySelectorAll(".score-display__pip-value"),
      ).map((node) => node.textContent);
      expect(numbers).toEqual(values);
    },
  );

  it.each(["simple" as const, "bonus" as const])(
    "marks exactly the number at the count held, in the side's colour, under %s scoring",
    (scoring) => {
      const state = buildState({
        nodes: { H8: "charged", E5: "charged", K5: "inactive" },
        ships: [
          ship("green-1", "green", "H8"),
          ship("green-2", "green", "E5"),
          ship("red-1", "red", "K5"),
        ],
        scoring,
      });

      const { container } = render(
        <ScoreDisplay state={state} side="green" displayedTotal={0} />,
      );

      const marked = container.querySelectorAll(
        ".score-display__pip-value--green",
      );
      expect(marked).toHaveLength(1);
      expect(marked[0]).toHaveTextContent(scoring === "simple" ? "2" : "3");
    },
  );

  it("marks no number when the side holds no charged nodes", () => {
    const state = buildState({ ships: shipsFor("green", 3) });

    const { container } = render(
      <ScoreDisplay state={state} side="green" displayedTotal={0} />,
    );

    expect(
      container.querySelectorAll(
        ".score-display__pip-value--green, .score-display__pip-value--red",
      ),
    ).toHaveLength(0);
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

  describe("player-matching nodes (steal.md §9)", () => {
    it("lengthens the row by one under DOUBLE, lighting two pips for the own node and one more for another, with the doubled amount highlighted", () => {
      const state = buildStealState({
        ships: [
          ...shipsFor("red", 4),
          ship("red-own", "red", "E11"),
          ship("red-other", "red", "H8"),
        ],
        signalBySquare: { E5: 0, H8: 1, K5: 2, E11: 3, K11: 4 },
        playerMatching: "double",
      });

      const { container } = render(
        <ScoreDisplay state={state} side="red" displayedTotal={0} />,
      );

      expect(container.querySelectorAll(".score-display__pip")).toHaveLength(6);
      expect(
        container.querySelectorAll(".score-display__pip--lit"),
      ).toHaveLength(3);
      const marked = container.querySelectorAll(
        ".score-display__pip-value--red",
      );
      expect(marked).toHaveLength(1);
      expect(marked[0]).toHaveTextContent("6");
    });

    it("still draws the lengthened row, with nothing lit, when DOUBLE holds nothing", () => {
      const state = buildStealState({
        ships: shipsFor("red", 6),
        signalBySquare: { E5: 0, H8: 1, K5: 2, E11: 3, K11: 4 },
        playerMatching: "double",
      });

      const { container } = render(
        <ScoreDisplay state={state} side="red" displayedTotal={0} />,
      );

      expect(container.querySelectorAll(".score-display__pip")).toHaveLength(6);
      expect(
        container.querySelectorAll(".score-display__pip--lit"),
      ).toHaveLength(0);
    });

    it("marks an X for each held node under REQUIRED while the own node is not held, lighting none and highlighting no value", () => {
      const state = buildStealState({
        ships: [
          ...shipsFor("red", 3),
          ship("red-a", "red", "H8"),
          ship("red-b", "red", "K5"),
        ],
        signalBySquare: { E5: 0, H8: 1, K5: 2, E11: 3, K11: 4 },
        playerMatching: "required",
      });

      const { container } = render(
        <ScoreDisplay state={state} side="red" displayedTotal={0} />,
      );

      expect(container.querySelectorAll(".score-display__pip")).toHaveLength(5);
      expect(container.querySelectorAll(".score-display__pip--x")).toHaveLength(
        2,
      );
      expect(
        container.querySelectorAll(".score-display__pip--lit"),
      ).toHaveLength(0);
      expect(
        container.querySelectorAll(".score-display__pip-value--red"),
      ).toHaveLength(0);
    });

    it("lights the pips and highlights the amount as usual under REQUIRED once the own node is held", () => {
      const state = buildStealState({
        ships: [
          ...shipsFor("red", 3),
          ship("red-own", "red", "E11"),
          ship("red-other", "red", "H8"),
        ],
        signalBySquare: { E5: 0, H8: 1, K5: 2, E11: 3, K11: 4 },
        playerMatching: "required",
      });

      const { container } = render(
        <ScoreDisplay state={state} side="red" displayedTotal={0} />,
      );

      expect(container.querySelectorAll(".score-display__pip")).toHaveLength(5);
      expect(container.querySelectorAll(".score-display__pip--x")).toHaveLength(
        0,
      );
      expect(
        container.querySelectorAll(".score-display__pip--lit"),
      ).toHaveLength(2);
      const marked = container.querySelectorAll(
        ".score-display__pip-value--red",
      );
      expect(marked).toHaveLength(1);
      expect(marked[0]).toHaveTextContent("3");
    });

    it("fills each lit pip in its node's colour, in board order, with player-matching nodes off", () => {
      const state = buildStealState({
        ships: [
          ...shipsFor("red", 3),
          ship("red-a", "red", "E5"),
          ship("red-b", "red", "K5"),
        ],
        signalBySquare: { E5: 0, H8: 1, K5: 2, E11: 3, K11: 4 },
        playerMatching: "off",
      });

      const { container } = render(
        <ScoreDisplay state={state} side="red" displayedTotal={0} />,
      );

      expect(litFills(container)).toEqual([
        SIGNAL_COLORS[0].core,
        SIGNAL_COLORS[2].core,
      ]);
    });

    it("orders DOUBLE's pips own node twice, then the opponent's, then the rest", () => {
      const state = buildStealState({
        ships: [
          ...shipsFor("red", 2),
          ship("red-other", "red", "E5"),
          ship("red-theirs", "red", "K11"),
          ship("red-own", "red", "E11"),
        ],
        signalBySquare: { E5: 0, H8: 1, K5: 2, E11: 3, K11: 4 },
        playerMatching: "double",
      });

      const { container } = render(
        <ScoreDisplay state={state} side="red" displayedTotal={0} />,
      );

      expect(litFills(container)).toEqual([
        PLAYER_NODE_COLORS.red.core,
        PLAYER_NODE_COLORS.red.core,
        PLAYER_NODE_COLORS.green.core,
        SIGNAL_COLORS[0].core,
      ]);
    });

    it("leads DOUBLE's row with the opponent's node when the own node is not held", () => {
      const state = buildStealState({
        ships: [
          ...shipsFor("red", 3),
          ship("red-other", "red", "E5"),
          ship("red-theirs", "red", "K11"),
        ],
        signalBySquare: { E5: 0, H8: 1, K5: 2, E11: 3, K11: 4 },
        playerMatching: "double",
      });

      const { container } = render(
        <ScoreDisplay state={state} side="red" displayedTotal={0} />,
      );

      expect(litFills(container)).toEqual([
        PLAYER_NODE_COLORS.green.core,
        SIGNAL_COLORS[0].core,
      ]);
    });

    it("orders REQUIRED's pips own node once, then the opponent's, then the rest", () => {
      const state = buildStealState({
        ships: [
          ...shipsFor("green", 2),
          ship("green-other", "green", "E5"),
          ship("green-theirs", "green", "E11"),
          ship("green-own", "green", "K11"),
        ],
        signalBySquare: { E5: 0, H8: 1, K5: 2, E11: 3, K11: 4 },
        playerMatching: "required",
      });

      const { container } = render(
        <ScoreDisplay state={state} side="green" displayedTotal={0} />,
      );

      expect(litFills(container)).toEqual([
        PLAYER_NODE_COLORS.green.core,
        PLAYER_NODE_COLORS.red.core,
        SIGNAL_COLORS[0].core,
      ]);
    });

    it("gives REQUIRED's X pips no fill colour", () => {
      const state = buildStealState({
        ships: [
          ...shipsFor("red", 3),
          ship("red-a", "red", "H8"),
          ship("red-b", "red", "K11"),
        ],
        signalBySquare: { E5: 0, H8: 1, K5: 2, E11: 3, K11: 4 },
        playerMatching: "required",
      });

      const { container } = render(
        <ScoreDisplay state={state} side="red" displayedTotal={0} />,
      );

      const xPips = Array.from(
        container.querySelectorAll<HTMLElement>(".score-display__pip--x"),
      );
      expect(xPips).toHaveLength(2);
      for (const pip of xPips) {
        expect(pip.style.getPropertyValue("--pip-fill")).toBe("");
      }
    });
  });
});
