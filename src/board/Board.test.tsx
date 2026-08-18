// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { ALL_SQUARES, squareAt, squareName, type Square } from "../rules/board";
import { BAYS, isBay } from "../rules/bays";
import { STARTING_FLEET, type FleetEntry } from "../rules/fleet";
import { startingSiteState } from "../rules/sites";
import { startingGameState, type GameState } from "../rules/gameState";
import { legalDestinations } from "../rules/movement";
import { createSession, type Session } from "../game/session";
import { Board } from "./Board";
import { squareLabel } from "./squareLabel";

afterEach(cleanup);

/** A square-name-keyed lookup of `STARTING_FLEET`, for building expected
 * accessible names — nothing in production looks up a starting ship by
 * square any more, so these tests build their own local index. */
const STARTING_ENTRY_BY_SQUARE: ReadonlyMap<string, FleetEntry> = new Map(
  STARTING_FLEET.map((entry) => [squareName(entry.square), entry]),
);
function startingShipAt(square: Square): FleetEntry | undefined {
  return STARTING_ENTRY_BY_SQUARE.get(squareName(square));
}

const startingSession = createSession(startingGameState());

describe("Board", () => {
  it("renders 225 gridcells in 15 rows", () => {
    render(<Board session={startingSession} />);

    expect(screen.getAllByRole("row")).toHaveLength(15);
    expect(screen.getAllByRole("gridcell")).toHaveLength(225);
  });

  it("draws A15 first and O1 last in DOM order", () => {
    render(<Board session={startingSession} />);

    const cells = screen.getAllByRole("gridcell");
    expect(cells[0]).toHaveAccessibleName("A15");
    expect(cells[cells.length - 1]).toHaveAccessibleName("O1");
  });

  it("names the centre and the far corners correctly", () => {
    render(<Board session={startingSession} />);

    // H8 is the centre square and an active site at the start.
    expect(
      screen.getByRole("gridcell", { name: "H8, active site" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "A1" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "O15" })).toBeInTheDocument();
  });

  it("names every bay with 'bay' and no other square", () => {
    render(<Board session={startingSession} />);

    // A handful of literal expected names, independent of the production
    // label-building functions the completeness loop below re-uses to build
    // its own expectations.
    expect(
      screen.getByRole("gridcell", { name: "D15, bay, red ship, 0 shields" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", {
        name: "H15, bay, green ship, 0 shields",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("gridcell", { name: "A10, bay, red ship, 0 shields" }),
    ).toBeInTheDocument();

    for (const square of ALL_SQUARES) {
      const label = squareLabel({
        square,
        isBay: isBay(square),
        siteState: startingSiteState(square),
        occupant: startingShipAt(square),
      });
      const cell = screen.getByRole("gridcell", { name: label });
      expect(cell).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("gridcell", {
        name: /, bay(, .+ ship, \d+ shields?)?$/,
      }),
    ).toHaveLength(BAYS.length);
  });

  it("marks the fourteen bay cells distinctly and draws different silhouettes per side", () => {
    const { container } = render(<Board session={startingSession} />);

    expect(container.querySelectorAll(".board-square--bay")).toHaveLength(
      BAYS.length,
    );

    const greenPath = container.querySelector(".ship-icon--green path");
    const redPath = container.querySelector(".ship-icon--red path");
    expect(greenPath).toHaveAttribute("d");
    expect(redPath).toHaveAttribute("d");
    expect(greenPath?.getAttribute("d")).not.toBe(redPath?.getAttribute("d"));
  });

  it("draws exactly as many shield arcs as the starting fleet carries", () => {
    const { container } = render(<Board session={startingSession} />);

    const expectedArcs = STARTING_FLEET.reduce(
      (total, entry) => total + entry.shields,
      0,
    );
    expect(container.querySelectorAll("[data-arc-position]")).toHaveLength(
      expectedArcs,
    );
  });

  it("names each starting ship's square with its side, and no other square", () => {
    render(<Board session={startingSession} />);

    for (const entry of STARTING_FLEET) {
      const cell = screen.getByRole("gridcell", {
        name: squareLabel({
          square: entry.square,
          isBay: isBay(entry.square),
          siteState: startingSiteState(entry.square),
          occupant: entry,
        }),
      });
      expect(cell).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("gridcell", { name: /ship, \d+ shields?$/ }),
    ).toHaveLength(STARTING_FLEET.length);
  });

  it("hides the ship artwork from the accessibility tree", () => {
    render(<Board session={startingSession} />);

    const square = squareAt("H", 15);
    const label = squareLabel({
      square,
      isBay: isBay(square),
      siteState: startingSiteState(square),
      occupant: startingShipAt(square),
    });
    const cell = screen.getByRole("gridcell", { name: label });
    expect(cell).toHaveAccessibleName(label);
    const svg = cell.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.querySelector("title, desc")).toBeNull();
  });

  it("draws visible column letters and row numbers, hidden from the accessibility tree", () => {
    const { container } = render(<Board session={startingSession} />);

    // The grid itself is unaffected: still 225 cells, none of them the labels.
    expect(screen.getAllByRole("row")).toHaveLength(15);
    expect(screen.getAllByRole("gridcell")).toHaveLength(225);
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expect(screen.queryByRole("rowheader")).not.toBeInTheDocument();

    const rowLabels = container.querySelector(".board-frame__row-labels");
    const columnLabels = container.querySelector(".board-frame__column-labels");
    expect(rowLabels).toHaveAttribute("aria-hidden", "true");
    expect(columnLabels).toHaveAttribute("aria-hidden", "true");

    // The letters and numbers are drawn in the DOM, in board order, but their
    // `aria-hidden` ancestor (asserted above) removes them from the
    // accessibility tree entirely.
    expect(rowLabels?.textContent).toBe(
      Array.from({ length: 15 }, (_, index) => 15 - index).join(""),
    );
    expect(columnLabels?.textContent).toBe("ABCDEFGHIJKLMNO");
  });

  describe("sites on the starting board", () => {
    // Literal, hand-transcribed from rules.md §3.2 and §8.1, not derived by
    // calling the same production lookups the component uses.
    const SITE_SQUARES = [
      "F2",
      "J2",
      "B4",
      "H4",
      "N4",
      "E5",
      "K5",
      "D8",
      "H8",
      "L8",
      "E11",
      "K11",
      "B12",
      "H12",
      "N12",
      "F14",
      "J14",
    ];
    const ACTIVE_SITE_SQUARES = ["H8", "E5", "K5", "E11", "K11"];
    const DORMANT_SITE_SQUARES = SITE_SQUARES.filter(
      (square) => !ACTIVE_SITE_SQUARES.includes(square),
    );

    it("draws a site marker on exactly the seventeen sites from rules.md §3.2", () => {
      const { container } = render(<Board session={startingSession} />);

      expect(container.querySelectorAll(".site-marker")).toHaveLength(17);
      for (const square of ACTIVE_SITE_SQUARES) {
        const cell = screen.getByRole("gridcell", {
          name: `${square}, active site`,
        });
        expect(cell.querySelector(".site-marker")).toBeInTheDocument();
      }
      for (const square of DORMANT_SITE_SQUARES) {
        const cell = screen.getByRole("gridcell", {
          name: `${square}, dormant site`,
        });
        expect(cell.querySelector(".site-marker")).toBeInTheDocument();
      }
    });

    it("names exactly five sites active and twelve dormant, none charged or depleted", () => {
      render(<Board session={startingSession} />);

      expect(
        screen.getAllByRole("gridcell", { name: /, active site$/ }),
      ).toHaveLength(5);
      expect(
        screen.getAllByRole("gridcell", { name: /, dormant site$/ }),
      ).toHaveLength(12);
      expect(
        screen.queryByRole("gridcell", { name: /charged site/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("gridcell", { name: /depleted site/ }),
      ).not.toBeInTheDocument();
    });

    it("spot-checks a few sites' literal accessible names", () => {
      render(<Board session={startingSession} />);

      expect(
        screen.getByRole("gridcell", { name: "E5, active site" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "H8, active site" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "B4, dormant site" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", { name: "F2, dormant site" }),
      ).toBeInTheDocument();
    });

    it("never draws a site marker on a bay, and never names a bay a site", () => {
      const { container } = render(<Board session={startingSession} />);

      const bayElements = container.querySelectorAll(".board-square--bay");
      expect(bayElements).toHaveLength(BAYS.length);
      for (const bayElement of bayElements) {
        expect(bayElement.querySelector(".site-marker")).toBeNull();
      }
      expect(
        screen.queryByRole("gridcell", { name: /bay.*site|site.*bay/ }),
      ).not.toBeInTheDocument();
    });
  });

  it("has no static accessibility violations", async () => {
    const { container } = render(<Board session={startingSession} />);

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });

  it("renders from the game state it is given, not the starting position", () => {
    const state: GameState = {
      ...startingGameState(),
      ships: startingGameState().ships.map((ship) =>
        ship.id === "green-1" ? { ...ship, square: squareAt("H", 8) } : ship,
      ),
    };
    const session = createSession(state);

    const { container } = render(<Board session={session} />);

    // H8 is a site as well as this ship's new square; both are named.
    const cell = screen.getByRole("gridcell", {
      name: "H8, active site, green ship, 0 shields",
    });
    expect(cell).toBeInTheDocument();
    expect(cell.querySelector(".ship-icon--green")).toBeInTheDocument();
    // The bay green-1 started in is empty now.
    expect(
      screen.getByRole("gridcell", { name: "H15, bay" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".ship-icon--green")).toHaveLength(7);
  });

  describe("selection markings", () => {
    // A hand-built session with green-1 selected on H8, and green-2 (still
    // in its starting bay) already marked as moved this ply. Never built via
    // the fixture, which the plan bans any test from depending on.
    const state: GameState = {
      ...startingGameState(),
      ships: startingGameState().ships.map((ship) =>
        ship.id === "green-1"
          ? { ...ship, square: squareAt("H", 8), shields: 2 }
          : ship,
      ),
      movedThisPly: ["green-2"],
    };
    const session: Session = {
      state,
      selectedShipId: "green-1",
      lastEvent: undefined,
    };

    it("marks the selected ship's own square", () => {
      render(<Board session={session} />);

      expect(
        screen.getByRole("gridcell", { name: /^H8,.*, selected$/ }),
      ).toBeInTheDocument();
    });

    it("marks exactly the squares Step 4's legalDestinations calls legal", () => {
      render(<Board session={session} />);

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

    it("marks a ship that has already moved this ply", () => {
      render(<Board session={session} />);

      const movedShip = state.ships.find((ship) => ship.id === "green-2");
      expect(movedShip).toBeDefined();
      expect(
        screen.getByRole("gridcell", {
          name: new RegExp(
            `^${squareName(movedShip!.square)},.*already moved this turn$`,
          ),
        }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("gridcell", {
          name: /already moved this turn$/,
        }),
      ).toHaveLength(1);
    });

    it("marks no square when nothing is selected", () => {
      render(<Board session={startingSession} />);

      expect(
        screen.queryByRole("gridcell", {
          name: /, selected$|can move here$|already moved this turn$/,
        }),
      ).not.toBeInTheDocument();
    });

    it("has no static accessibility violations mid-selection", async () => {
      const { container } = render(<Board session={session} />);

      const results = await axe.run(container, {
        rules: {
          "color-contrast": { enabled: false },
        },
      });

      expect(results.violations).toEqual([]);
    });
  });
});
