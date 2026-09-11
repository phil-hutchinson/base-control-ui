// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { useReducer } from "react";
import { squareAt, squareName, type Square } from "../rules/board";
import { PLANETS, isPlanet } from "../rules/planets";
import {
  DEFAULT_FLEET_SIZE,
  startingFleet,
  type FleetEntry,
} from "../rules/fleet";
import {
  startingGameState,
  type GameState,
  type NodeStatus,
} from "../rules/gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import { DEFAULT_CHARGED_NODE_COUNT } from "../rules/nodes";
import { legalDestinations } from "../rules/movement";
import { legalTargets } from "../rules/combat";
import type { PowerLevel } from "../rules/power";
import {
  createSession,
  sessionReducer,
  type MovedEvent,
  type Session,
} from "../game/session";
import { Board } from "./Board";
import { squareLabel } from "./squareLabel";
import { planetArrangement } from "./planetPlacement";

afterEach(cleanup);

const noop = () => {};

const STARTING_FLEET = startingFleet(DEFAULT_FLEET_SIZE);

/** A square-name-keyed lookup of the default-size starting fleet, for
 * building expected accessible names — nothing in production looks up a
 * starting ship by square any more, so these tests build their own local
 * index. */
const STARTING_ENTRY_BY_SQUARE: ReadonlyMap<string, FleetEntry> = new Map(
  STARTING_FLEET.map((entry) => [squareName(entry.square), entry]),
);
function startingShipAt(square: Square): FleetEntry | undefined {
  return STARTING_ENTRY_BY_SQUARE.get(squareName(square));
}

const TEST_SEED = 1;

/**
 * The board this file has always been rendered against: H8, E5, K5, E11 and
 * K11 charged at baseline (no countdown), the other 12 squares inactive, all
 * at level 1 — an arbitrary fixed board, not the opening rules.md §8.1 deals since 0.18. Node
 * positions are drawn rather than fixed since 0.20, so this board is no
 * longer any table in `rules.md` either — it is simply a board this file
 * states for itself, not built by calling any of `nodes.ts`'s production
 * functions, so a change to how the opening is dealt cannot quietly change
 * what this file expects.
 */
const STATED_NODE_STATES: Readonly<Record<string, NodeStatus>> = {
  F2: { state: "inactive", level: 1 },
  J3: { state: "inactive", level: 1 },
  B4: { state: "inactive", level: 1 },
  H4: { state: "inactive", level: 1 },
  N5: { state: "inactive", level: 1 },
  E5: { state: "charged", level: 0 },
  K5: { state: "charged", level: 0 },
  D8: { state: "inactive", level: 1 },
  H8: { state: "charged", level: 0 },
  L8: { state: "inactive", level: 1 },
  E11: { state: "charged", level: 0 },
  K11: { state: "charged", level: 0 },
  B11: { state: "inactive", level: 1 },
  H12: { state: "inactive", level: 1 },
  N12: { state: "inactive", level: 1 },
  F13: { state: "inactive", level: 1 },
  J14: { state: "inactive", level: 1 },
};

/** `startingGameState(TEST_SEED)`, with its nodes replaced by the board this
 * file states (`STATED_NODE_STATES`) rather than whatever it happens to
 * deal. Ships, seed, ply and length still come from `startingGameState`. */
function statedOpeningState(): GameState {
  return {
    ...startingGameState(TEST_SEED),
    nodes: STATED_NODE_STATES,
  };
}

const startingSession = createSession(statedOpeningState());

/** A minimal hand-built state with a single node square, isolating the
 * wiring from Board.tsx through the node's countdown to the marker's
 * middle gradient stop and to the countdown number. `hasShip` places a
 * green ship on the node square, since a depleted node's cycle position
 * and number both depend on whether a ship is standing there (a trap) or
 * not (an exit, `../rules/countdown`). */
function stateWithNode(
  square: Square,
  state: "charged" | "depleted",
  level: number,
  hasShip = false,
): GameState {
  return {
    ships: hasShip ? [{ id: "green-1", side: "green", square, power: 4 }] : [],
    nodes: {
      [squareName(square)]: { state, level },
    },
    sideToMove: "green",
    plyNumber: 1,
    randomSeed: 1,
    openingSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
    chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
    outOfTime: { green: false, red: false },
  };
}

describe("Board", () => {
  it("renders 225 gridcells in 15 rows", () => {
    render(<Board session={startingSession} onIntent={noop} />);

    expect(screen.getAllByRole("row")).toHaveLength(15);
    expect(screen.getAllByRole("gridcell")).toHaveLength(225);
  });

  it("draws A15 first and O1 last in DOM order", () => {
    render(<Board session={startingSession} onIntent={noop} />);

    const cells = screen.getAllByRole("gridcell");
    expect(cells[0]).toHaveAccessibleName("A15");
    expect(cells[cells.length - 1]).toHaveAccessibleName("O1");
  });

  it("names the centre and the far corners correctly", () => {
    render(<Board session={startingSession} onIntent={noop} />);

    // H8 is the centre square, and this file states it charged
    // (STATED_NODE_STATES above).
    expect(
      screen.getByRole("gridcell", { name: "H8, charged node" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "A1" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "O15" })).toBeInTheDocument();
  });

  it("names every planet with 'planet' and no other square", () => {
    render(<Board session={startingSession} onIntent={noop} />);

    // A handful of literal expected names, independent of the production
    // label-building functions the completeness loop below re-uses to build
    // its own expectations. No ship starts on a planet (rules.md §3.1, §4),
    // so every planet's name here is bare.
    expect(
      screen.getByRole("gridcell", { name: "B3, planet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "D6, planet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "G4, planet" }),
    ).toBeInTheDocument();

    // A representative sample of the remaining planets, built the production
    // way rather than as a literal, so a change to `squareLabel` is still
    // caught.
    for (const square of [squareAt("J", 2), squareAt("K", 6)]) {
      const label = squareLabel({
        square,
        isPlanet: true,
        nodeState: STATED_NODE_STATES[squareName(square)]?.state,
        occupant: startingShipAt(square),
      });
      expect(screen.getByRole("gridcell", { name: label })).toBeInTheDocument();
    }

    // A non-planet square must never be named "planet".
    const nonPlanetSquare = squareAt("H", 8);
    expect(isPlanet(nonPlanetSquare)).toBe(false);
    expect(
      screen.getByRole("gridcell", {
        name: squareLabel({
          square: nonPlanetSquare,
          isPlanet: false,
          nodeState: STATED_NODE_STATES[squareName(nonPlanetSquare)]?.state,
          occupant: startingShipAt(nonPlanetSquare),
        }),
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("gridcell", {
        name: /, planet(, .+ ship, power \d of 6)?$/,
      }),
    ).toHaveLength(PLANETS.length);
  });

  it("marks the twelve planet cells distinctly and draws different silhouettes per side", () => {
    const { container } = render(
      <Board session={startingSession} onIntent={noop} />,
    );

    expect(container.querySelectorAll(".board-square--planet")).toHaveLength(
      PLANETS.length,
    );

    const greenUse = container.querySelector(".ship-model--green > use");
    const redUse = container.querySelector(".ship-model--red > use");
    expect(greenUse).toHaveAttribute("href");
    expect(redUse).toHaveAttribute("href");
    expect(greenUse?.getAttribute("href")).not.toBe(
      redUse?.getAttribute("href"),
    );
  });

  it("draws a planet's drawing on each of the twelve planet squares, and nowhere else", () => {
    const { container } = render(
      <Board session={startingSession} onIntent={noop} />,
    );

    // No ship starts on a planet, so each planet square's name here is bare
    // (STATED_NODE_STATES and STARTING_FLEET never touch the twelve).
    const arrangement = planetArrangement(startingSession.state.openingSeed);
    for (const square of PLANETS) {
      const name = squareName(square);
      const cell = screen.getByRole("gridcell", { name: `${name}, planet` });
      const use = cell.querySelector(".planet > use");
      expect(use).toHaveAttribute(
        "href",
        `#${arrangement.get(name)?.ids.body}`,
      );
    }

    expect(container.querySelectorAll(".planet")).toHaveLength(PLANETS.length);
  });

  it("draws every gauge slot lit for the starting fleet, since every ship starts at full power", () => {
    const { container } = render(
      <Board session={startingSession} onIntent={noop} />,
    );

    expect(container.querySelectorAll("[data-gauge-slot]")).toHaveLength(
      STARTING_FLEET.length * 6,
    );
    expect(container.querySelectorAll('[data-gauge-lit="true"]')).toHaveLength(
      STARTING_FLEET.length * 6,
    );
  });

  it("names each starting ship's square with its side, and no other square", () => {
    render(<Board session={startingSession} onIntent={noop} />);

    for (const entry of STARTING_FLEET) {
      const cell = screen.getByRole("gridcell", {
        name: squareLabel({
          square: entry.square,
          isPlanet: isPlanet(entry.square),
          nodeState: STATED_NODE_STATES[squareName(entry.square)]?.state,
          occupant: entry,
        }),
      });
      expect(cell).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("gridcell", { name: /ship, power \d of 6$/ }),
    ).toHaveLength(STARTING_FLEET.length);
  });

  it("hides the ship artwork from the accessibility tree", () => {
    render(<Board session={startingSession} onIntent={noop} />);

    // A starting ship's square, guaranteed occupied at the default fleet
    // size, so the square carries an <svg> to check the hiding of.
    const square = STARTING_FLEET[0].square;
    const label = squareLabel({
      square,
      isPlanet: isPlanet(square),
      nodeState: STATED_NODE_STATES[squareName(square)]?.state,
      occupant: startingShipAt(square),
    });
    const cell = screen.getByRole("gridcell", { name: label });
    expect(cell).toHaveAccessibleName(label);
    const svg = cell.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.querySelector("title, desc")).toBeNull();
  });

  it("draws no row or column labels, leaving a plain 15 x 15 grid", () => {
    const { container } = render(
      <Board session={startingSession} onIntent={noop} />,
    );

    // `.board-frame` holds nothing but the planet sprite, the grid and the
    // energy overlay - neither label element is in the DOM at all any more.
    const frame = container.querySelector(".board-frame");
    expect(frame?.children).toHaveLength(3);
    expect(frame?.querySelector(".planet-defs")).toBeInTheDocument();
    expect(frame?.querySelector(".board")).toBeInTheDocument();
    expect(frame?.querySelector(".energy-overlay")).toBeInTheDocument();

    // The grid itself is unaffected: still 225 cells, none of them labels.
    expect(screen.getAllByRole("row")).toHaveLength(15);
    expect(screen.getAllByRole("gridcell")).toHaveLength(225);
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expect(screen.queryByRole("rowheader")).not.toBeInTheDocument();

    // Square names are unaffected: a square's accessible name still carries
    // its coordinates, even though they are no longer drawn on screen.
    expect(screen.getByRole("gridcell", { name: "A1" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "O15" })).toBeInTheDocument();
  });

  describe("nodes the board is told to draw", () => {
    // The board this file states for itself (`STATED_NODE_STATES` above),
    // not derived by calling the same production lookups the component
    // uses. Node positions are drawn rather than fixed since 0.20, so there
    // is no longer a rules.md table this could be transcribed from.
    const NODE_SQUARES = Object.keys(STATED_NODE_STATES);
    const CHARGED_NODE_SQUARES = NODE_SQUARES.filter(
      (square) => STATED_NODE_STATES[square].state === "charged",
    );
    const INACTIVE_NODE_SQUARES = NODE_SQUARES.filter(
      (square) => STATED_NODE_STATES[square].state === "inactive",
    );

    it("draws a node marker on exactly the nodes this board states", () => {
      const { container } = render(
        <Board session={startingSession} onIntent={noop} />,
      );

      expect(container.querySelectorAll(".node-marker")).toHaveLength(
        NODE_SQUARES.length,
      );
      for (const square of CHARGED_NODE_SQUARES) {
        const cell = screen.getByRole("gridcell", {
          name: `${square}, charged node`,
        });
        expect(cell.querySelector(".node-marker")).toBeInTheDocument();
      }
      for (const square of INACTIVE_NODE_SQUARES) {
        const cell = screen.getByRole("gridcell", {
          name: `${square}, inactive node`,
        });
        expect(cell.querySelector(".node-marker")).toBeInTheDocument();
      }
    });

    it("gives every charged or depleted node marker's gradient its own document-unique id", () => {
      const { container } = render(
        <Board session={startingSession} onIntent={noop} />,
      );

      // Counted within the node markers themselves, since the board now also
      // mounts the planet sprite's own radial gradients as a sibling. An
      // inactive marker carries no gradient at all - it is a stack of
      // stroked rings - so only the charged and depleted squares count here.
      const gradientIds = Array.from(
        container.querySelectorAll(".node-marker radialGradient"),
      ).map((gradient) => gradient.getAttribute("id"));

      expect(gradientIds).toHaveLength(CHARGED_NODE_SQUARES.length);
      expect(new Set(gradientIds).size).toBe(CHARGED_NODE_SQUARES.length);

      // Document-unique, not merely unique among node markers: every id the
      // whole board renders is distinct, so a node gradient can never be
      // shadowed by the planet sprite's ids (or any later artwork's). SVG
      // resolves `url(#...)` document-wide, so a collision would silently
      // paint one element with another's gradient.
      const allIds = Array.from(container.querySelectorAll("[id]"), (el) =>
        el.getAttribute("id"),
      );
      expect(new Set(allIds).size).toBe(allIds.length);
    });

    // This board is hand-stated for rendering, not dealt by the game rules,
    // so its five charged nodes are not a legal game position.
    it("names exactly the five charged and twelve inactive nodes this board states, none depleted", () => {
      render(<Board session={startingSession} onIntent={noop} />);

      expect(
        screen.getAllByRole("gridcell", { name: /, charged node$/ }),
      ).toHaveLength(5);
      expect(
        screen.getAllByRole("gridcell", { name: /, inactive node$/ }),
      ).toHaveLength(12);
      expect(
        screen.queryByRole("gridcell", { name: /depleted node/ }),
      ).not.toBeInTheDocument();
    });

    it("spot-checks a few nodes' literal accessible names", () => {
      render(<Board session={startingSession} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", { name: "E5, charged node" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "H8, charged node" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "B4, inactive node" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "F2, inactive node" }),
      ).toBeInTheDocument();
    });

    it("never draws a node marker on a planet, and never names a planet a node", () => {
      const { container } = render(
        <Board session={startingSession} onIntent={noop} />,
      );

      const planetElements = container.querySelectorAll(
        ".board-square--planet",
      );
      expect(planetElements).toHaveLength(PLANETS.length);
      for (const planetElement of planetElements) {
        expect(planetElement.querySelector(".node-marker")).toBeNull();
      }
      expect(
        screen.queryByRole("gridcell", { name: /planet.*node|node.*planet/ }),
      ).not.toBeInTheDocument();
    });
  });

  it("has no static accessibility violations", async () => {
    const { container } = render(
      <Board session={startingSession} onIntent={noop} />,
    );

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });

  it("renders from the game state it is given, not the starting position", () => {
    const state: GameState = {
      ...statedOpeningState(),
      ships: statedOpeningState().ships.map((ship) =>
        ship.id === "green-1" ? { ...ship, square: squareAt("H", 8) } : ship,
      ),
    };
    const session = createSession(state);

    const { container } = render(<Board session={session} onIntent={noop} />);

    // H8 is a node as well as this ship's new square; both are named. This
    // file states H8 charged.
    const cell = screen.getByRole("gridcell", {
      name: "H8, charged node, green ship, power 6 of 6",
    });
    expect(cell).toBeInTheDocument();
    expect(cell.querySelector(".ship-model--green")).toBeInTheDocument();
    // The starting square green-1 began on is empty now, and ordinary.
    expect(screen.getByRole("gridcell", { name: "O14" })).toBeInTheDocument();
    expect(container.querySelectorAll(".ship-model--green")).toHaveLength(6);
  });

  describe("the node countdown reaching the marker", () => {
    function middleStopOffset(container: HTMLElement, state: string) {
      const marker = container.querySelector(`.node-marker--${state}`);
      const stops = marker?.querySelectorAll("stop");
      return stops?.[1]?.getAttribute("offset");
    }

    it("shows a charged node with no countdown at its start-of-cycle offset", () => {
      const session: Session = {
        state: stateWithNode(squareAt("H", 8), "charged", 0),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(middleStopOffset(container, "charged")).toBe("25%");
    });

    it("shows a charged node at its start-of-cycle offset the ply its countdown starts", () => {
      const session: Session = {
        state: stateWithNode(squareAt("H", 8), "charged", 11, true),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(middleStopOffset(container, "charged")).toBe("25%");
    });

    it("shows a charged node at its end-of-cycle offset with one ply left", () => {
      const session: Session = {
        state: stateWithNode(squareAt("H", 8), "charged", 1, true),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(middleStopOffset(container, "charged")).toBe("50%");
    });

    it("shows a trap (a depleted node with a ship) at its start-of-cycle offset the ply it traps", () => {
      const session: Session = {
        state: stateWithNode(squareAt("H", 8), "depleted", 11, true),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(middleStopOffset(container, "depleted")).toBe("50%");
    });

    it("shows a trap at its end-of-cycle offset with one ply left", () => {
      const session: Session = {
        state: stateWithNode(squareAt("H", 8), "depleted", 1, true),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(middleStopOffset(container, "depleted")).toBe("25%");
    });

    it("shows an exit node (a depleted node with no ship) at its start-of-cycle offset, whatever its plies left", () => {
      const session: Session = {
        state: stateWithNode(squareAt("H", 8), "depleted", 2),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(middleStopOffset(container, "depleted")).toBe("50%");
    });
  });

  describe("the countdown number reaching the board", () => {
    // Reuses stateWithNode from the block above, isolating the wiring from
    // Board.tsx through countdown.ts's countdownNumber to NodeCountdown.
    it("shows the black number a charged node's countdown gives", () => {
      const session: Session = {
        state: stateWithNode(squareAt("H", 8), "charged", 11, true),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(container.querySelector(".node-countdown")?.textContent).toBe("6");
      expect(container.querySelector(".node-countdown text")).toHaveAttribute(
        "fill",
        "black",
      );
    });

    it("draws no number on a charged node with no countdown", () => {
      const session: Session = {
        state: stateWithNode(squareAt("H", 8), "charged", 0),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(container.querySelector(".node-countdown")).toBeNull();
    });

    it("shows the white number a trap's countdown gives", () => {
      const session: Session = {
        state: stateWithNode(squareAt("H", 8), "depleted", 5, true),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(container.querySelector(".node-countdown")?.textContent).toBe("2");
      expect(container.querySelector(".node-countdown text")).toHaveAttribute(
        "fill",
        "white",
      );
    });

    it("draws no number on an exit node (a depleted node with no ship)", () => {
      const session: Session = {
        state: stateWithNode(squareAt("H", 8), "depleted", 2),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(container.querySelector(".node-countdown")).toBeNull();
    });
  });

  describe("an inactive node's priority reaching the marker", () => {
    it("shows two inactive nodes at different priorities with visibly different markers", () => {
      const state: GameState = {
        ships: [],
        nodes: {
          [squareName(squareAt("H", 8))]: { state: "inactive", level: 1 },
          [squareName(squareAt("E", 5))]: { state: "inactive", level: 3 },
        },
        sideToMove: "green",
        plyNumber: 1,
        randomSeed: 1,
        openingSeed: 1,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
        outOfTime: { green: false, red: false },
      };
      const session: Session = {
        state,
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      const markers = container.querySelectorAll(".node-marker--inactive");
      expect(markers).toHaveLength(2);

      const ringCounts = Array.from(
        markers,
        (marker) => marker.querySelectorAll("circle").length,
      ).sort();
      expect(ringCounts).toEqual([1, 3]);
    });
  });

  describe("selection markings", () => {
    // A hand-built session with green-1 selected on H8. Built directly
    // rather than through the fixture.
    const state: GameState = {
      ...startingGameState(TEST_SEED),
      ships: startingGameState(TEST_SEED).ships.map((ship) =>
        ship.id === "green-1"
          ? { ...ship, square: squareAt("H", 8), power: 2 }
          : ship,
      ),
    };
    const session: Session = {
      state,
      selectedShipId: "green-1",
      lastEvent: undefined,
    };

    it("marks the selected ship's own square", () => {
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", { name: /^H8,.*, selected$/ }),
      ).toBeInTheDocument();
    });

    it("marks exactly the squares legalDestinations calls legal", () => {
      render(<Board session={session} onIntent={noop} />);

      const destinations = legalDestinations(state, "green-1");
      expect(destinations.length).toBeGreaterThan(0);
      for (const destination of destinations) {
        expect(
          screen.getByRole("gridcell", {
            name: new RegExp(`^${squareName(destination)},.*can move here$`),
          }),
        ).toBeInTheDocument();
      }
      expect(
        screen.getAllByRole("gridcell", { name: /can move here$/ }),
      ).toHaveLength(destinations.length);
    });

    it("marks no square when nothing is selected", () => {
      render(<Board session={startingSession} onIntent={noop} />);

      expect(
        screen.queryByRole("gridcell", {
          name: /, selected$|can move here$|can attack here/,
        }),
      ).not.toBeInTheDocument();
    });

    it("has no static accessibility violations mid-selection", async () => {
      const { container } = render(<Board session={session} onIntent={noop} />);

      const results = await axe.run(container, {
        rules: {
          "color-contrast": { enabled: false },
        },
      });

      expect(results.violations).toEqual([]);
    });
  });

  describe("attack targets", () => {
    // green-1 selected on H8 with an adjacent enemy on H9, so it carries
    // both destinations (empty neighbours) and one target.
    function attackState(overrides?: {
      attackerPower?: PowerLevel;
      defenderPower?: PowerLevel;
    }): GameState {
      return {
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 8),
            power: overrides?.attackerPower ?? 2,
          },
          {
            id: "red-1",
            side: "red",
            square: squareAt("H", 9),
            power: overrides?.defenderPower ?? 4,
          },
        ],
        nodes: {},
        sideToMove: "green",
        plyNumber: 1,
        randomSeed: 1,
        openingSeed: 1,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
        outOfTime: { green: false, red: false },
      };
    }

    it("marks legal targets distinctly from legal destinations, naming what attacking does", () => {
      const state = attackState();
      const session: Session = {
        state,
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", {
          name: "H9, red ship, power 4 of 6, can attack here, both ships would return to planets",
        }),
      ).toBeInTheDocument();

      const destinations = legalDestinations(state, "green-1");
      expect(destinations.length).toBeGreaterThan(0);
      for (const destination of destinations) {
        expect(
          screen.getByRole("gridcell", {
            name: new RegExp(`^${squareName(destination)},.*can move here$`),
          }),
        ).toBeInTheDocument();
      }
      // The target square never also carries the destination wording.
      expect(
        screen.queryByRole("gridcell", {
          name: /^H9,.*can move here$/,
        }),
      ).not.toBeInTheDocument();
    });

    it("marks no square as a target when nothing is selected", () => {
      const state = attackState();
      const session: Session = {
        state,
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.queryByRole("gridcell", { name: /can attack here/ }),
      ).not.toBeInTheDocument();
    });

    it("reads a legal target the same one way whatever power either ship carries", () => {
      const powerLevels: readonly PowerLevel[] = [0, 1, 2, 3, 4];
      for (const attackerPower of powerLevels) {
        for (const defenderPower of powerLevels) {
          const state = attackState({ attackerPower, defenderPower });
          const session: Session = {
            state,
            selectedShipId: "green-1",
            lastEvent: undefined,
          };
          render(<Board session={session} onIntent={noop} />);

          expect(
            screen.getByRole("gridcell", {
              name: `H9, red ship, power ${defenderPower} of 6, can attack here, both ships would return to planets`,
            }),
          ).toBeInTheDocument();

          cleanup();
        }
      }
    });

    it("never marks a square with more than one of selected, destination and target", () => {
      const state = attackState();
      const session: Session = {
        state,
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      const targets = legalTargets(state, "green-1");
      expect(targets.length).toBeGreaterThan(0);

      for (const cell of screen.getAllByRole("gridcell")) {
        const name = cell.getAttribute("aria-label") ?? "";
        const matches = [
          ", selected",
          "can move here",
          "can attack here",
        ].filter((marker) => name.includes(marker));
        expect(matches.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("attack range", () => {
    // A minimal three-ship state (an attacker, a defender, and an optional
    // third ship to block the lane between them), for exercising highlights
    // at a range of more than one square.
    function rangeState(config: {
      attackerSquare: Square;
      attackerPower: PowerLevel;
      defenderSquare: Square;
      defenderPower: PowerLevel;
      blockerSquare?: Square;
      blockerSide?: "green" | "red";
    }): GameState {
      const ships = [
        {
          id: "green-1",
          side: "green" as const,
          square: config.attackerSquare,
          power: config.attackerPower,
        },
        {
          id: "red-1",
          side: "red" as const,
          square: config.defenderSquare,
          power: config.defenderPower,
        },
      ];
      if (config.blockerSquare) {
        ships.push({
          id: "blocker",
          side: config.blockerSide ?? "red",
          square: config.blockerSquare,
          power: 4,
        });
      }
      return {
        ships,
        nodes: {},
        sideToMove: "green",
        plyNumber: 1,
        randomSeed: 1,
        openingSeed: 1,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
        outOfTime: { green: false, red: false },
      };
    }

    it("highlights a target two squares away for a 3-power ship, naming what attacking does", () => {
      const state = rangeState({
        attackerSquare: squareAt("H", 8),
        attackerPower: 3,
        defenderSquare: squareAt("H", 10),
        defenderPower: 4,
      });
      const session: Session = {
        state,
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      // Two squares away is outside the old fixed eight-neighbour range but
      // within a 3-power ship's true reach (rules.md §6, §7).
      expect(
        screen.getByRole("gridcell", {
          name: "H10, red ship, power 4 of 6, can attack here, both ships would return to planets",
        }),
      ).toBeInTheDocument();
    });

    it("shows no target on a diagonal neighbour for a 0-power ship, which can only strike orthogonally", () => {
      const state = rangeState({
        attackerSquare: squareAt("H", 8),
        attackerPower: 0,
        defenderSquare: squareAt("I", 9),
        defenderPower: 4,
      });
      const session: Session = {
        state,
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.queryByRole("gridcell", { name: /^I9,.*can attack here/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "I9, red ship, power 4 of 6" }),
      ).toBeInTheDocument();
    });

    it("does not highlight a target beyond an enemy ship blocking the lane", () => {
      const state = rangeState({
        attackerSquare: squareAt("H", 8),
        attackerPower: 3,
        defenderSquare: squareAt("H", 10),
        defenderPower: 4,
        blockerSquare: squareAt("H", 9),
        blockerSide: "red",
      });
      const session: Session = {
        state,
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.queryByRole("gridcell", { name: /^H10,.*can attack here/ }),
      ).not.toBeInTheDocument();
    });

    it("still highlights a target beyond a friendly ship in the lane, which does not block a shot", () => {
      const state = rangeState({
        attackerSquare: squareAt("H", 8),
        attackerPower: 3,
        defenderSquare: squareAt("H", 10),
        defenderPower: 4,
        blockerSquare: squareAt("H", 9),
        blockerSide: "green",
      });
      const session: Session = {
        state,
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", {
          name: "H10, red ship, power 4 of 6, can attack here, both ships would return to planets",
        }),
      ).toBeInTheDocument();
    });

    it("has no static accessibility violations with a long-range target highlighted", async () => {
      const state = rangeState({
        attackerSquare: squareAt("H", 8),
        attackerPower: 3,
        defenderSquare: squareAt("H", 10),
        defenderPower: 4,
      });
      const session: Session = {
        state,
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      const results = await axe.run(container, {
        rules: {
          "color-contrast": { enabled: false },
        },
      });

      expect(results.violations).toEqual([]);
    });
  });

  it("marks no planet with a return cue and names no square after a return position or a receptacle", () => {
    const { container } = render(
      <Board session={startingSession} onIntent={noop} />,
    );

    expect(
      container.querySelector(".board-square__mark--receptacle"),
    ).toBeNull();
    expect(
      container.querySelector(".board-square__mark--return-position"),
    ).toBeNull();
    expect(
      screen.queryByRole("gridcell", { name: /return position|beaten ship/ }),
    ).not.toBeInTheDocument();
  });

  describe("ship conditions", () => {
    // A minimal, hand-built state: green-1 stands on a depleted node,
    // green-2 and green-3 are ordinary green ships elsewhere with a normal
    // move available, and red-1 is the opponent, present to confirm it
    // never carries a condition.
    function depletedNodeState(): GameState {
      return {
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 4),
            power: 4,
          },
          {
            id: "green-2",
            side: "green",
            square: squareAt("A", 1),
            power: 4,
          },
          {
            id: "green-3",
            side: "green",
            square: squareAt("B", 2),
            power: 4,
          },
          { id: "red-1", side: "red", square: squareAt("O", 15), power: 4 },
        ],
        nodes: {
          [squareName(squareAt("H", 4))]: {
            state: "depleted",
            level: 1,
          },
        },
        sideToMove: "green",
        plyNumber: 1,
        randomSeed: 1,
        openingSeed: 1,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
        outOfTime: { green: false, red: false },
      };
    }

    it("names a ship trapped on a depleted node with the existing cannot-move-or-attack condition, and leaves the rest of the fleet ordinary", () => {
      const session: Session = {
        state: depletedNodeState(),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      // A trapped ship can neither move nor attack (rules.md §8.5), so
      // shipCanMoveOrAttack is false for it and it carries the existing
      // cannot-move-or-attack condition — no new mark is added for the trap
      // itself.
      expect(
        screen.getByRole("gridcell", {
          name: "H4, depleted node, green ship, power 4 of 6, cannot move or attack this turn",
        }),
      ).toBeInTheDocument();
      // Nothing holds the rest of the fleet back: green-2 and green-3 both
      // have an ordinary move available and carry no condition.
      expect(
        screen.getByRole("gridcell", { name: "A1, green ship, power 4 of 6" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "B2, green ship, power 4 of 6" }),
      ).toBeInTheDocument();
    });

    it("combines the selected mark with the cannot-move-or-attack condition for a ship trapped on a depleted node", () => {
      const session: Session = {
        state: depletedNodeState(),
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", {
          name: "H4, depleted node, green ship, power 4 of 6, cannot move or attack this turn, selected",
        }),
      ).toBeInTheDocument();
    });

    it("never gives the opponent's ship a condition", () => {
      const session: Session = {
        state: depletedNodeState(),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", { name: "O15, red ship, power 4 of 6" }),
      ).toBeInTheDocument();
    });

    it("names a pinned ship 'cannot move or attack'", () => {
      // green-1 sits at H8 with 0 power, so its only reach is the four
      // orthogonal neighbours (rules.md §6) — all four occupied by *friendly*
      // ships, leaving it with no legal destination. Blocking with green
      // rather than red ships also denies it any attack target: an enemy on
      // any of those squares would give it a legal attack under §7 even
      // though it could not step there, since attack range is all eight
      // neighbours regardless of power.
      const state: GameState = {
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 8),
            power: 0,
          },
          {
            id: "green-2",
            side: "green",
            square: squareAt("H", 9),
            power: 4,
          },
          {
            id: "green-3",
            side: "green",
            square: squareAt("H", 7),
            power: 4,
          },
          {
            id: "green-4",
            side: "green",
            square: squareAt("G", 8),
            power: 4,
          },
          {
            id: "green-5",
            side: "green",
            square: squareAt("I", 8),
            power: 4,
          },
        ],
        nodes: {},
        sideToMove: "green",
        plyNumber: 1,
        randomSeed: 1,
        openingSeed: 1,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
        chargedNodeCount: DEFAULT_CHARGED_NODE_COUNT,
        outOfTime: { green: false, red: false },
      };
      const session: Session = {
        state,
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", {
          name: "H8, green ship, power 0 of 6, cannot move or attack this turn",
        }),
      ).toBeInTheDocument();
    });
  });

  describe("playing a turn", () => {
    // A small stand-in for App.tsx's own useReducer wiring, so these tests
    // exercise the real session reducer rather than a hand-built session.
    function Harness({ initial }: { initial: GameState }) {
      const [session, dispatch] = useReducer(
        sessionReducer,
        initial,
        createSession,
      );
      return <Board session={session} onIntent={dispatch} />;
    }

    // green-1 moved off its starting square onto the empty interior square
    // H8, with 2 power, so it has an obstruction-free reach to check
    // destinations against. Every other ship stays on its starting square.
    function baseState(): GameState {
      return {
        ...statedOpeningState(),
        ships: statedOpeningState().ships.map((ship) =>
          ship.id === "green-1"
            ? { ...ship, square: squareAt("H", 8), power: 2 }
            : ship,
        ),
      };
    }

    function cell(name: string | RegExp): HTMLElement {
      return screen.getByRole("gridcell", { name });
    }

    function liveRegion(): HTMLElement {
      return screen.getByRole("status");
    }

    type InputMode = "keyboard" | "pointer";

    async function activate(
      user: ReturnType<typeof userEvent.setup>,
      mode: InputMode,
      target: HTMLElement,
    ) {
      if (mode === "pointer") {
        await user.click(target);
      } else {
        target.focus();
        await user.keyboard("[Enter]");
      }
    }

    describe.each<InputMode>(["keyboard", "pointer"])("via %s", (mode) => {
      it("selects an own ship, marks its destinations, and announces it", async () => {
        const user = userEvent.setup();
        render(<Harness initial={baseState()} />);

        await activate(user, mode, cell(/^H8,/));

        expect(cell(/^H8,.*selected$/)).toBeInTheDocument();
        const destinations = legalDestinations(baseState(), "green-1");
        expect(destinations.length).toBeGreaterThan(0);
        for (const destination of destinations) {
          expect(
            cell(new RegExp(`^${squareName(destination)},.*can move here$`)),
          ).toBeInTheDocument();
        }
        expect(
          screen.getAllByRole("gridcell", { name: /can move here$/ }),
        ).toHaveLength(destinations.length);
        expect(liveRegion()).toHaveTextContent(
          new RegExp(
            `^Green ship at H8 selected\\. ${destinations.length} moves? available\\.$`,
          ),
        );
      });

      it("cancels the selection when the selected ship's square is activated again", async () => {
        const user = userEvent.setup();
        render(<Harness initial={baseState()} />);

        await activate(user, mode, cell(/^H8,/));
        await activate(user, mode, cell(/^H8,.*selected$/));

        expect(cell(/^H8,/)).not.toHaveAccessibleName(/selected$/);
        expect(
          screen.queryByRole("gridcell", { name: /can move here$/ }),
        ).not.toBeInTheDocument();
        expect(liveRegion()).toHaveTextContent("Selection cleared.");
      });

      it("switches the selection to a different own ship", async () => {
        const user = userEvent.setup();
        render(<Harness initial={baseState()} />);

        await activate(user, mode, cell(/^H8,/));

        const otherShip = STARTING_FLEET.find(
          (entry) => entry.side === "green" && entry.id !== "green-1",
        );
        expect(otherShip).toBeDefined();
        const otherName = squareName(otherShip!.square);

        await activate(user, mode, cell(new RegExp(`^${otherName},`)));

        expect(
          cell(new RegExp(`^${otherName},.*selected$`)),
        ).toBeInTheDocument();
        expect(cell(/^H8,/)).not.toHaveAccessibleName(/selected$/);
      });

      it("moves the ship onto an activated legal destination and announces it", async () => {
        const user = userEvent.setup();
        render(<Harness initial={baseState()} />);

        await activate(user, mode, cell(/^H8,/));
        const [destination] = legalDestinations(baseState(), "green-1");
        const destinationName = squareName(destination);

        const destinationCell = cell(
          new RegExp(`^${destinationName},.*can move here$`),
        );
        await activate(user, mode, destinationCell);

        expect(
          cell(new RegExp(`^${destinationName},.*green ship`)),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("gridcell", { name: /^H8,.*green ship/ }),
        ).not.toBeInTheDocument();
        expect(liveRegion()).toHaveTextContent(
          new RegExp(`^Green ship moved from H8 to ${destinationName}\\.`),
        );

        if (mode === "keyboard") {
          expect(document.activeElement).toBe(
            cell(new RegExp(`^${destinationName},.*green ship`)),
          );
          expect(screen.getByRole("grid")).toContainElement(
            document.activeElement as HTMLElement,
          );
        }
      });

      it("rejects activating an opponent's ship and leaves the board unchanged", async () => {
        const user = userEvent.setup();
        render(<Harness initial={baseState()} />);

        const redEntry = STARTING_FLEET.find((entry) => entry.side === "red");
        expect(redEntry).toBeDefined();
        const redName = squareName(redEntry!.square);

        await activate(user, mode, cell(new RegExp(`^${redName},`)));

        expect(liveRegion()).toHaveTextContent(
          "That is your opponent's ship. Choose one of your own.",
        );
        expect(
          screen.queryByRole("gridcell", { name: /selected$/ }),
        ).not.toBeInTheDocument();
        expect(cell(/^H8,.*green ship/)).toBeInTheDocument();
      });

      it("rejects an out-of-range destination and keeps the selection", async () => {
        const user = userEvent.setup();
        render(<Harness initial={baseState()} />);

        await activate(user, mode, cell(/^H8,/));
        await activate(user, mode, cell("A1"));

        expect(liveRegion()).toHaveTextContent(
          "A1 is out of range for the selected ship.",
        );
        expect(cell(/^H8,.*selected$/)).toBeInTheDocument();
      });
    });

    it("keeps focus on the attacked square, which is now empty: both ships return to planets", async () => {
      const user = userEvent.setup();
      const state: GameState = {
        ...statedOpeningState(),
        ships: statedOpeningState().ships.map((ship) => {
          if (ship.id === "green-1") {
            return { ...ship, square: squareAt("H", 8), power: 0 };
          }
          if (ship.id === "red-1") {
            return { ...ship, square: squareAt("H", 9), power: 4 };
          }
          return ship;
        }),
        // This file states H8 charged, and a ship on a charged node can
        // neither attack nor be attacked (rules.md §7); the attacker needs
        // an ordinary square to stand on.
        nodes: {
          ...STATED_NODE_STATES,
          H8: { state: "inactive", level: 1 },
        },
      };
      render(<Harness initial={state} />);

      await activate(user, "keyboard", cell(/^H8,/));
      await activate(user, "keyboard", cell(/^H9,.*red ship/));

      const attackedCell = cell(/^H9(,|$)/);
      expect(document.activeElement).toBe(attackedCell);
      expect(screen.getByRole("grid")).toContainElement(
        document.activeElement as HTMLElement,
      );
      expect(liveRegion()).toHaveTextContent(
        /^Green ship at H8 attacked the red ship at H9 and both were beaten\./,
      );
    });

    it("cancels the selection on Escape from anywhere in the grid", async () => {
      const user = userEvent.setup();
      render(<Harness initial={baseState()} />);

      await activate(user, "keyboard", cell(/^H8,/));
      await user.keyboard("[Escape]");

      expect(cell(/^H8,/)).not.toHaveAccessibleName(/selected$/);
      expect(
        screen.queryByRole("gridcell", { name: /can move here$/ }),
      ).not.toBeInTheDocument();
      expect(liveRegion()).toHaveTextContent("Selection cleared.");
    });

    it("has no static accessibility violations at rest", async () => {
      const { container } = render(<Harness initial={baseState()} />);

      const results = await axe.run(container, {
        rules: {
          "color-contrast": { enabled: false },
        },
      });

      expect(results.violations).toEqual([]);
    });

    it("has no static accessibility violations mid-selection", async () => {
      const user = userEvent.setup();
      const { container } = render(<Harness initial={baseState()} />);

      await user.click(cell(/^H8,/));

      const results = await axe.run(container, {
        rules: {
          "color-contrast": { enabled: false },
        },
      });

      expect(results.violations).toEqual([]);
    });
  });
});

describe("energy overlay composition", () => {
  it("draws it as a sibling of the grid, hidden from the accessibility tree", () => {
    const state: GameState = {
      ...startingGameState(TEST_SEED),
    };
    const event: MovedEvent = {
      type: "moved",
      shipId: "green-1",
      side: "green",
      from: squareAt("C", 7),
      to: squareAt("C", 6),
      effects: [
        {
          type: "ply-ended",
          side: "green",
          sideToMove: "red",
          endOfTurn: [
            {
              type: "energy-collected",
              side: "green",
              amount: 1,
              newTotal: 1,
              squares: [squareAt("H", 8)],
            },
          ],
        },
      ],
      cost: 0,
      powerAfter: 6,
    };
    const session: Session = {
      state,
      selectedShipId: undefined,
      lastEvent: event,
    };

    const { container } = render(<Board session={session} onIntent={noop} />);

    const overlay = container.querySelector(".energy-overlay");
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("grid")).not.toContainElement(
      overlay as HTMLElement,
    );
    expect(overlay?.querySelector(".energy-overlay__amount")).toHaveTextContent(
      "+1",
    );

    // The grid itself is unaffected by the overlay's presence.
    expect(screen.getAllByRole("gridcell")).toHaveLength(225);
  });
});
