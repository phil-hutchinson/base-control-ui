// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { useReducer } from "react";
import { squareAt, squareName, type Square } from "../rules/board";
import { BAYS, isBay, STARTING_RETURN_POSITION_INDEX } from "../rules/bays";
import { STARTING_FLEET, type FleetEntry } from "../rules/fleet";
import {
  CHARGED_LIFE_PLIES,
  DEPLETED_COOLDOWN_PLIES,
  SITES,
  startingSiteState,
} from "../rules/sites";
import { startingGameState, type GameState } from "../rules/gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "../rules/gameLength";
import { legalDestinations } from "../rules/movement";
import { legalTargets, resolveFight } from "../rules/combat";
import type { ShieldCount } from "../rules/shields";
import {
  createSession,
  sessionReducer,
  type MovedEvent,
  type Session,
} from "../game/session";
import { Board } from "./Board";
import { squareLabel } from "./squareLabel";

afterEach(cleanup);

const noop = () => {};

/** A square-name-keyed lookup of `STARTING_FLEET`, for building expected
 * accessible names — nothing in production looks up a starting ship by
 * square any more, so these tests build their own local index. */
const STARTING_ENTRY_BY_SQUARE: ReadonlyMap<string, FleetEntry> = new Map(
  STARTING_FLEET.map((entry) => [squareName(entry.square), entry]),
);
function startingShipAt(square: Square): FleetEntry | undefined {
  return STARTING_ENTRY_BY_SQUARE.get(squareName(square));
}

const TEST_SEED = 1;

const startingSession = createSession(startingGameState(TEST_SEED));

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

    // H8 is the centre square and an active site at the start.
    expect(
      screen.getByRole("gridcell", { name: "H8, active site" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "A1" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "O15" })).toBeInTheDocument();
  });

  it("names every bay with 'bay' and no other square", () => {
    render(<Board session={startingSession} onIntent={noop} />);

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

    // A representative sample of the remaining bays — one on each of the
    // other two sides not already covered above — built the production way
    // rather than as a literal, so a change to `squareLabel` is still caught.
    for (const square of [squareAt("O", 10), squareAt("H", 1)]) {
      const label = squareLabel({
        square,
        isBay: true,
        siteState: startingSiteState(square),
        occupant: startingShipAt(square),
      });
      expect(screen.getByRole("gridcell", { name: label })).toBeInTheDocument();
    }

    // A non-bay square must never be named "bay".
    const nonBaySquare = squareAt("H", 8);
    expect(isBay(nonBaySquare)).toBe(false);
    expect(
      screen.getByRole("gridcell", {
        name: squareLabel({
          square: nonBaySquare,
          isBay: false,
          siteState: startingSiteState(nonBaySquare),
          occupant: startingShipAt(nonBaySquare),
        }),
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("gridcell", {
        name: /, bay(, .+ ship, \d+ shields?)?$/,
      }),
    ).toHaveLength(BAYS.length);
  });

  it("marks the fourteen bay cells distinctly and draws different silhouettes per side", () => {
    const { container } = render(
      <Board session={startingSession} onIntent={noop} />,
    );

    expect(container.querySelectorAll(".board-square--bay")).toHaveLength(
      BAYS.length,
    );

    const greenPath = container.querySelector(".ship-icon--green path");
    const redPath = container.querySelector(".ship-icon--red path");
    expect(greenPath).toHaveAttribute("d");
    expect(redPath).toHaveAttribute("d");
    expect(greenPath?.getAttribute("d")).not.toBe(redPath?.getAttribute("d"));
  });

  it("draws exactly as many lit shield arcs as the starting fleet carries, four arcs per ship", () => {
    const { container } = render(
      <Board session={startingSession} onIntent={noop} />,
    );

    const expectedLitArcs = STARTING_FLEET.reduce(
      (total, entry) => total + entry.shields,
      0,
    );
    expect(container.querySelectorAll("[data-arc-position]")).toHaveLength(
      STARTING_FLEET.length * 4,
    );
    expect(container.querySelectorAll(".ship-icon__arc--lit")).toHaveLength(
      expectedLitArcs,
    );
  });

  it("names each starting ship's square with its side, and no other square", () => {
    render(<Board session={startingSession} onIntent={noop} />);

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
    render(<Board session={startingSession} onIntent={noop} />);

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

  it("draws no row or column labels, leaving a plain 15 x 15 grid", () => {
    const { container } = render(
      <Board session={startingSession} onIntent={noop} />,
    );

    // `.board-frame` holds nothing but the grid and the energy overlay -
    // neither label element is in the DOM at all any more.
    const frame = container.querySelector(".board-frame");
    expect(frame?.children).toHaveLength(2);
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
      const { container } = render(
        <Board session={startingSession} onIntent={noop} />,
      );

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

    it("gives every site marker's gradient its own document-unique id", () => {
      const { container } = render(
        <Board session={startingSession} onIntent={noop} />,
      );

      const gradientIds = Array.from(
        container.querySelectorAll("radialGradient"),
      ).map((gradient) => gradient.getAttribute("id"));

      expect(gradientIds).toHaveLength(SITES.length);
      expect(new Set(gradientIds).size).toBe(SITES.length);
    });

    it("names exactly five sites active and twelve dormant, none charged or depleted", () => {
      render(<Board session={startingSession} onIntent={noop} />);

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
      render(<Board session={startingSession} onIntent={noop} />);

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
      const { container } = render(
        <Board session={startingSession} onIntent={noop} />,
      );

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
      ...startingGameState(TEST_SEED),
      ships: startingGameState(TEST_SEED).ships.map((ship) =>
        ship.id === "green-1" ? { ...ship, square: squareAt("H", 8) } : ship,
      ),
    };
    const session = createSession(state);

    const { container } = render(<Board session={session} onIntent={noop} />);

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

  describe("the site cycle position reaching the marker", () => {
    // A minimal hand-built state with a single site square, isolating the
    // wiring from Board.tsx's ply number and the site's enteredOnPly through
    // to the marker's middle gradient stop.
    function stateWithSite(
      square: Square,
      state: "charged" | "depleted",
      enteredOnPly: number,
      plyNumber: number,
    ): GameState {
      return {
        ships: [],
        siteStates: {
          [squareName(square)]: { state, enteredOnPly },
        },
        sideToMove: "green",
        actionsRemaining: 1,
        actedThisPly: [],
        plyNumber,
        randomSeed: 1,
        returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      };
    }

    function middleStopOffset(container: HTMLElement, state: string) {
      const marker = container.querySelector(`.site-marker--${state}`);
      const stops = marker?.querySelectorAll("stop");
      return stops?.[1]?.getAttribute("offset");
    }

    it("shows a charged site at its start-of-cycle offset on the ply it woke", () => {
      const enteredOnPly = 5;
      const session: Session = {
        state: stateWithSite(
          squareAt("H", 8),
          "charged",
          enteredOnPly,
          enteredOnPly,
        ),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(middleStopOffset(container, "charged")).toBe("25%");
    });

    it("shows a charged site at its end-of-cycle offset on its last charged ply", () => {
      const enteredOnPly = 5;
      const lastPly = enteredOnPly + CHARGED_LIFE_PLIES - 1;
      const session: Session = {
        state: stateWithSite(
          squareAt("H", 8),
          "charged",
          enteredOnPly,
          lastPly,
        ),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(middleStopOffset(container, "charged")).toBe("50%");
    });

    it("shows a depleted site at its start-of-cycle offset on its first cooling ply", () => {
      // The depleted window starts the ply after enteredOnPly: the site
      // was still charged for the whole of the ply it depleted on.
      const enteredOnPly = 5;
      const firstCoolingPly = enteredOnPly + 1;
      const session: Session = {
        state: stateWithSite(
          squareAt("H", 8),
          "depleted",
          enteredOnPly,
          firstCoolingPly,
        ),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(middleStopOffset(container, "depleted")).toBe("50%");
    });

    it("shows a depleted site at its end-of-cycle offset on its last cooling ply", () => {
      const enteredOnPly = 5;
      const lastPly = enteredOnPly + DEPLETED_COOLDOWN_PLIES;
      const session: Session = {
        state: stateWithSite(
          squareAt("H", 8),
          "depleted",
          enteredOnPly,
          lastPly,
        ),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      const { container } = render(<Board session={session} onIntent={noop} />);

      expect(middleStopOffset(container, "depleted")).toBe("25%");
    });
  });

  describe("selection markings", () => {
    // A hand-built session with green-1 selected on H8, and green-2 (still
    // in its starting bay) already marked as moved this ply. Built directly
    // rather than through the fixture.
    const state: GameState = {
      ...startingGameState(TEST_SEED),
      ships: startingGameState(TEST_SEED).ships.map((ship) =>
        ship.id === "green-1"
          ? { ...ship, square: squareAt("H", 8), shields: 2 }
          : ship,
      ),
      actedThisPly: ["green-2"],
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

    it("marks a ship that has already acted this ply — here, still in a bay, so also carrying no-action", () => {
      render(<Board session={session} onIntent={noop} />);

      const movedShip = state.ships.find((ship) => ship.id === "green-2");
      expect(movedShip).toBeDefined();
      // Still in its bay, so §3.1 forbids it any attack, and it has already
      // used its one move: "already acted" and "no-action" both apply, in
      // that order.
      expect(
        screen.getByRole("gridcell", {
          name: new RegExp(
            `^${squareName(movedShip!.square)},.*already acted this turn, no action available this turn$`,
          ),
        }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("gridcell", {
          name: /already acted this turn/,
        }),
      ).toHaveLength(1);
    });

    it("marks no square when nothing is selected", () => {
      render(<Board session={startingSession} onIntent={noop} />);

      expect(
        screen.queryByRole("gridcell", {
          name: /, selected$|can move here$|already acted this turn$|can attack here/,
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
      attackerShields?: ShieldCount;
      defenderShields?: ShieldCount;
      actedThisPly?: string[];
    }): GameState {
      return {
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 8),
            shields: overrides?.attackerShields ?? 2,
          },
          {
            id: "red-1",
            side: "red",
            square: squareAt("H", 9),
            shields: overrides?.defenderShields ?? 0,
          },
        ],
        siteStates: {},
        sideToMove: "green",
        actionsRemaining: overrides?.actedThisPly ? 1 : 2,
        actedThisPly: overrides?.actedThisPly ?? [],
        plyNumber: 1,
        randomSeed: 1,
        returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      };
    }

    it("marks legal targets distinctly from legal destinations, naming the predicted outcome", () => {
      const state = attackState();
      const session: Session = {
        state,
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      // Attacker 2 shields vs defender 0: the attacker wins.
      expect(
        screen.getByRole("gridcell", {
          name: "H9, red ship, 0 shields, can attack here, your ship would win",
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

    it("shows neither targets nor destinations for a ship that has already acted: one action per ship (rules.md §5)", () => {
      const state = attackState({ actedThisPly: ["green-1"] });
      const session: Session = {
        state,
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.queryByRole("gridcell", { name: /can attack here/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("gridcell", { name: /can move here$/ }),
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

    it("produces the right predicted outcome for every combination of 0-4 against 0-4", () => {
      const shieldCounts: readonly ShieldCount[] = [0, 1, 2, 3, 4];
      for (const attackerShields of shieldCounts) {
        for (const defenderShields of shieldCounts) {
          const state = attackState({ attackerShields, defenderShields });
          const session: Session = {
            state,
            selectedShipId: "green-1",
            lastEvent: undefined,
          };
          render(<Board session={session} onIntent={noop} />);

          const outcome = resolveFight(attackerShields, defenderShields).result;
          const wording =
            outcome === "attacker-won"
              ? "can attack here, your ship would win"
              : outcome === "defender-won"
                ? "can attack here, your ship would lose"
                : "can attack here, both ships would return to bays";
          const unit = defenderShields === 1 ? "shield" : "shields";

          expect(
            screen.getByRole("gridcell", {
              name: `H9, red ship, ${defenderShields} ${unit}, ${wording}`,
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
      attackerShields: ShieldCount;
      defenderSquare: Square;
      defenderShields: ShieldCount;
      blockerSquare?: Square;
      actedThisPly?: string[];
    }): GameState {
      const ships = [
        {
          id: "green-1",
          side: "green" as const,
          square: config.attackerSquare,
          shields: config.attackerShields,
        },
        {
          id: "red-1",
          side: "red" as const,
          square: config.defenderSquare,
          shields: config.defenderShields,
        },
      ];
      if (config.blockerSquare) {
        ships.push({
          id: "green-2",
          side: "green" as const,
          square: config.blockerSquare,
          shields: 0,
        });
      }
      return {
        ships,
        siteStates: {},
        sideToMove: "green",
        actionsRemaining: 1,
        actedThisPly: config.actedThisPly ?? [],
        plyNumber: 1,
        randomSeed: 1,
        returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      };
    }

    it("highlights a target two squares away for a 1-shield ship, with the predicted outcome", () => {
      const state = rangeState({
        attackerSquare: squareAt("H", 8),
        attackerShields: 1,
        defenderSquare: squareAt("H", 10),
        defenderShields: 0,
      });
      const session: Session = {
        state,
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      // Two squares away is outside the old fixed eight-neighbour range but
      // within a 1-shield ship's true reach (rules.md §6, §7).
      expect(
        screen.getByRole("gridcell", {
          name: "H10, red ship, 0 shields, can attack here, your ship would win",
        }),
      ).toBeInTheDocument();
    });

    it("shows no target on a diagonal neighbour for a 4-shield ship, which can only strike orthogonally", () => {
      const state = rangeState({
        attackerSquare: squareAt("H", 8),
        attackerShields: 4,
        defenderSquare: squareAt("I", 9),
        defenderShields: 0,
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
        screen.getByRole("gridcell", { name: "I9, red ship, 0 shields" }),
      ).toBeInTheDocument();
    });

    it("does not highlight a target beyond a blocking ship, of either side, as attackable", () => {
      const state = rangeState({
        attackerSquare: squareAt("H", 8),
        attackerShields: 1,
        defenderSquare: squareAt("H", 10),
        defenderShields: 0,
        blockerSquare: squareAt("H", 9),
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

    it("offers no highlight for a target beyond the eight neighbours when the attacking ship has already acted", () => {
      const state = rangeState({
        attackerSquare: squareAt("H", 8),
        attackerShields: 1,
        defenderSquare: squareAt("H", 10),
        defenderShields: 0,
        actedThisPly: ["green-1"],
      });
      const session: Session = {
        state,
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.queryByRole("gridcell", { name: /can attack here/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("gridcell", { name: /can move here$/ }),
      ).not.toBeInTheDocument();
    });

    it("has no static accessibility violations with a long-range target highlighted", async () => {
      const state = rangeState({
        attackerSquare: squareAt("H", 8),
        attackerShields: 1,
        defenderSquare: squareAt("H", 10),
        defenderShields: 0,
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

  it("marks no bay with a return cue and names no square after a return position or a receptacle", () => {
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
    // A minimal, hand-built state: green-1 owes an action on a depleted
    // site, green-2 and green-3 are ordinary green ships elsewhere with a
    // normal move available (until the obligation binds), and red-1 is the
    // opponent, present to confirm it never carries a condition.
    function strandedState(actionsRemaining: number): GameState {
      return {
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 4),
            shields: 0,
          },
          {
            id: "green-2",
            side: "green",
            square: squareAt("A", 1),
            shields: 0,
          },
          {
            id: "green-3",
            side: "green",
            square: squareAt("B", 2),
            shields: 0,
          },
          { id: "red-1", side: "red", square: squareAt("O", 15), shields: 0 },
        ],
        siteStates: {
          [squareName(squareAt("H", 4))]: {
            state: "depleted",
            enteredOnPly: 1,
          },
        },
        sideToMove: "green",
        actionsRemaining,
        actedThisPly: [],
        plyNumber: 1,
        randomSeed: 1,
        returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      };
    }

    it("names the stranded ship's square, and dampens the rest of the fleet from the same moment", () => {
      const session: Session = {
        state: strandedState(1),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", {
          name: "H4, depleted site, green ship, 0 shields, stranded, must move this turn",
        }),
      ).toBeInTheDocument();
      // The obligation binds the turn's action, so green-2 and green-3 read
      // as having no action available even though neither has acted yet.
      expect(
        screen.getByRole("gridcell", {
          name: "A1, green ship, 0 shields, no action available this turn",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("gridcell", {
          name: "B2, green ship, 0 shields, no action available this turn",
        }),
      ).toBeInTheDocument();
    });

    it("combines a condition and a selection mark, condition first", () => {
      const session: Session = {
        state: strandedState(1),
        selectedShipId: "green-1",
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", {
          name: "H4, depleted site, green ship, 0 shields, stranded, must move this turn, selected",
        }),
      ).toBeInTheDocument();
    });

    it("dampens the rest of the moving side once the obligation binds, but not the owed ship", () => {
      const state: GameState = {
        ...strandedState(1),
        actedThisPly: ["green-2"],
      };
      const session: Session = {
        state,
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", {
          name: "H4, depleted site, green ship, 0 shields, stranded, must move this turn",
        }),
      ).toBeInTheDocument();
      // Green-2 has already acted this ply moving elsewhere, has no enemy
      // adjacent to attack, and the obligation would refuse the attack
      // anyway — so it reads as both "already acted" and "no action
      // available", dampened.
      expect(
        screen.getByRole("gridcell", {
          name: "A1, green ship, 0 shields, already acted this turn, no action available this turn",
        }),
      ).toBeInTheDocument();
      // Green-3 has not moved and would have a normal move under §6 alone,
      // but the obligation now binds every action, so it reads as having no
      // action available — not as "already acted".
      expect(
        screen.getByRole("gridcell", {
          name: "B2, green ship, 0 shields, no action available this turn",
        }),
      ).toBeInTheDocument();
    });

    it("never gives the opponent's ship a condition, whatever the moving side's ships owe", () => {
      const session: Session = {
        state: strandedState(1),
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", { name: "O15, red ship, 0 shields" }),
      ).toBeInTheDocument();
    });

    it("names a pinned ship 'no action available', with nothing stranded anywhere", () => {
      // green-1 sits at H8 with 4 shields, so its only reach is the four
      // orthogonal neighbours (rules.md §6) — all four occupied by *friendly*
      // ships, leaving it with no legal destination. Blocking with green
      // rather than red ships also denies it any attack target: an enemy on
      // any of those squares would give it a legal attack under §7 even
      // though it could not step there, since attack range is all eight
      // neighbours regardless of shields.
      const state: GameState = {
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 8),
            shields: 4,
          },
          {
            id: "green-2",
            side: "green",
            square: squareAt("H", 9),
            shields: 0,
          },
          {
            id: "green-3",
            side: "green",
            square: squareAt("H", 7),
            shields: 0,
          },
          {
            id: "green-4",
            side: "green",
            square: squareAt("G", 8),
            shields: 0,
          },
          {
            id: "green-5",
            side: "green",
            square: squareAt("I", 8),
            shields: 0,
          },
        ],
        siteStates: {},
        sideToMove: "green",
        actionsRemaining: 1,
        actedThisPly: [],
        plyNumber: 1,
        randomSeed: 1,
        returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      };
      const session: Session = {
        state,
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", {
          name: "H8, green ship, 4 shields, no action available this turn",
        }),
      ).toBeInTheDocument();
    });

    it("reads a moved ship as both acted and out of actions, even with an enemy adjacent: one action per ship (rules.md §5)", () => {
      // green-1 has already acted this ply. red-1 sits adjacent to it, but
      // an acted ship has no legal attack left either, so it carries the
      // no-action condition alongside having acted.
      const state: GameState = {
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 8),
            shields: 2,
          },
          { id: "red-1", side: "red", square: squareAt("H", 9), shields: 0 },
        ],
        siteStates: {},
        sideToMove: "green",
        actionsRemaining: 1,
        actedThisPly: ["green-1"],
        plyNumber: 1,
        randomSeed: 1,
        returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      };
      const session: Session = {
        state,
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", {
          name: "H8, green ship, 2 shields, already acted this turn, no action available this turn",
        }),
      ).toBeInTheDocument();
    });

    it("reads a moved ship with no legal move and no legal target as both moved and out of actions", () => {
      // green-1 has already acted this ply and has no adjacent enemy, so it
      // has no legal move (its one move is spent) and no legal target.
      const state: GameState = {
        ships: [
          {
            id: "green-1",
            side: "green",
            square: squareAt("H", 8),
            shields: 2,
          },
        ],
        siteStates: {},
        sideToMove: "green",
        actionsRemaining: 1,
        actedThisPly: ["green-1"],
        plyNumber: 1,
        randomSeed: 1,
        returnPositionIndex: STARTING_RETURN_POSITION_INDEX,
        energy: { green: 0, red: 0 },
        lengthInRounds: DEFAULT_GAME_LENGTH_ROUNDS,
      };
      const session: Session = {
        state,
        selectedShipId: undefined,
        lastEvent: undefined,
      };
      render(<Board session={session} onIntent={noop} />);

      expect(
        screen.getByRole("gridcell", {
          name: "H8, green ship, 2 shields, already acted this turn, no action available this turn",
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

    // green-1 moved off its starting bay onto the empty interior square H8,
    // with two shields, so it has an obstruction-free reach to check
    // destinations against. Every other ship stays in its starting bay.
    function baseState(): GameState {
      return {
        ...startingGameState(TEST_SEED),
        ships: startingGameState(TEST_SEED).ships.map((ship) =>
          ship.id === "green-1"
            ? { ...ship, square: squareAt("H", 8), shields: 2 }
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
      it("selects an own unmoved ship, marks its destinations, and announces it", async () => {
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

      it("switches the selection to a different own unmoved ship", async () => {
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

      it("rejects activating an own ship that has already acted this turn", async () => {
        const user = userEvent.setup();
        const state = { ...baseState(), actedThisPly: ["green-2"] };
        render(<Harness initial={state} />);

        const movedEntry = STARTING_FLEET.find(
          (entry) => entry.id === "green-2",
        );
        expect(movedEntry).toBeDefined();
        const movedName = squareName(movedEntry!.square);

        await activate(user, mode, cell(new RegExp(`^${movedName},`)));

        expect(liveRegion()).toHaveTextContent(
          "That ship has already acted this turn. Choose another.",
        );
        expect(
          screen.queryByRole("gridcell", { name: /selected$/ }),
        ).not.toBeInTheDocument();
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

    it("keeps focus on the attacked square, which now shows the winner having taken it", async () => {
      const user = userEvent.setup();
      const state: GameState = {
        ...startingGameState(TEST_SEED),
        ships: startingGameState(TEST_SEED).ships.map((ship) => {
          if (ship.id === "green-1") {
            return { ...ship, square: squareAt("H", 8), shields: 4 };
          }
          if (ship.id === "red-1") {
            return { ...ship, square: squareAt("H", 9), shields: 0 };
          }
          return ship;
        }),
      };
      render(<Harness initial={state} />);

      await activate(user, "keyboard", cell(/^H8,/));
      await activate(user, "keyboard", cell(/^H9,.*red ship/));

      const attackedCell = cell(/^H9,.*green ship/);
      expect(document.activeElement).toBe(attackedCell);
      expect(screen.getByRole("grid")).toContainElement(
        document.activeElement as HTMLElement,
      );
      expect(liveRegion()).toHaveTextContent(
        /^Green ship at H8 attacked the red ship at H9 and won\./,
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
      actionsRemaining: 1,
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
    expect(overlay?.querySelector(".energy-overlay__gain")).toHaveTextContent(
      "+1",
    );

    // The grid itself is unaffected by the overlay's presence.
    expect(screen.getAllByRole("gridcell")).toHaveLength(225);
  });
});
