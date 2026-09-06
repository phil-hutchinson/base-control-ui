import { describe, expect, it } from "vitest";
import { PLANETS, isPlanet } from "./planets";
import { type Square, squareAt, squareFromName, squareName } from "./board";
import {
  attackReach,
  attackRefusalReason,
  drawReturnPlanet,
  legalTargets,
} from "./combat";
import type { ShipId } from "./fleet";
import type { GameState, Ship, NodeStatus } from "./gameState";
import { DEFAULT_GAME_LENGTH_ROUNDS } from "./gameLength";
import { reachFrom } from "./movement";
import type { PowerLevel } from "./power";
import type { NodeState } from "./nodes";

function ship(
  id: ShipId,
  side: "green" | "red",
  square: string,
  power: PowerLevel = 4,
): Ship {
  return { id, side, square: squareFromName(square), power };
}

function nodeStatuses(
  states: Readonly<Record<string, NodeState>>,
): Record<string, NodeStatus> {
  return Object.fromEntries(
    Object.entries(states).map(([name, state]) => [name, { state, level: 0 }]),
  );
}

function buildState(config: {
  ships: readonly Ship[];
  sideToMove?: "green" | "red";
  actedThisPly?: readonly ShipId[];
  nodes?: Readonly<Record<string, NodeState>>;
  actionsRemaining?: number;
  plyNumber?: number;
  lengthInRounds?: number;
}): GameState {
  return {
    ships: config.ships,
    nodes: nodeStatuses(config.nodes ?? {}),
    sideToMove: config.sideToMove ?? "green",
    actionsRemaining: config.actionsRemaining ?? 2,
    actedThisPly: config.actedThisPly ?? [],
    plyNumber: config.plyNumber ?? 1,
    randomSeed: 1,
    openingSeed: 1,
    energy: { green: 0, red: 0 },
    lengthInRounds: config.lengthInRounds ?? DEFAULT_GAME_LENGTH_ROUNDS,
    outOfTime: { green: false, red: false },
  };
}

function squareNames(squares: readonly Square[]) {
  return squares.map((square) => squareName(square)).sort();
}

/**
 * An orthogonal neighbour of `square` that is not itself a planet — derived
 * rather than named, so the test using it survives the planet geometry
 * moving again.
 */
function orthogonalNonPlanetNeighbourOf(square: Square): Square {
  const candidates = [
    squareAt(square.column, square.row + 1),
    squareAt(square.column, square.row - 1),
  ];
  const neighbour = candidates.find((candidate) => !isPlanet(candidate));
  if (!neighbour) {
    throw new Error(
      `no non-planet orthogonal neighbour found for ${squareName(square)}`,
    );
  }
  return neighbour;
}

describe("attackReach", () => {
  it("returns the entry with the right passedOver for a two-square orthogonal attack", () => {
    const entry = attackReach(
      buildState({
        ships: [
          ship("green-1", "green", "H8", 2),
          ship("red-1", "red", "H10", 4),
        ],
      }),
      "green-1",
      squareFromName("H10"),
    );

    expect(entry).toBeDefined();
    expect(squareNames(entry?.passedOver ?? [])).toEqual(["H9"]);
  });

  it("returns the entry with both corners in passedOver for an L attack", () => {
    const entry = attackReach(
      buildState({
        ships: [
          ship("green-1", "green", "H8", 2),
          ship("red-1", "red", "J9", 4),
        ],
      }),
      "green-1",
      squareFromName("J9"),
    );

    expect(entry).toBeDefined();
    expect(entry?.passedOver.map((square) => squareName(square))).toEqual([
      "I8",
      "I9",
    ]);
  });

  it("returns undefined for a target beyond the attacker's reach", () => {
    const entry = attackReach(
      buildState({
        ships: [
          ship("green-1", "green", "H8", 0),
          ship("red-1", "red", "A1", 4),
        ],
      }),
      "green-1",
      squareFromName("A1"),
    );

    expect(entry).toBeUndefined();
  });
});

describe("attackRefusalReason / legalTargets", () => {
  it("a 0-power ship's targets are its four orthogonal neighbours, and never a diagonal one", () => {
    const orthogonalNeighbours = ["G8", "I8", "H7", "H9"];
    const diagonalNeighbours = ["G7", "G9", "I7", "I9"];
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ...orthogonalNeighbours.map((square, index) =>
          ship(`red-o-${index}`, "red", square, 4),
        ),
        ...diagonalNeighbours.map((square, index) =>
          ship(`red-d-${index}`, "red", square, 4),
        ),
      ],
    });

    expect(squareNames(legalTargets(state, "green-1"))).toEqual(
      squareNames(orthogonalNeighbours.map(squareFromName)),
    );
    expect(attackRefusalReason(state, "green-1", squareFromName("G7"))).toBe(
      "cannot-afford-target",
    );
  });

  it("a 1-power ship's targets are exactly the eight neighbours around it", () => {
    const neighbours = ["G7", "G8", "G9", "H7", "H9", "I7", "I8", "I9"];
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 1),
        ...neighbours.map((square, index) =>
          ship(`red-${index}`, "red", square, 4),
        ),
      ],
    });

    expect(squareNames(legalTargets(state, "green-1"))).toEqual(
      squareNames(neighbours.map(squareFromName)),
    );
  });

  it("a ship with enough power can attack two squares orthogonally and in an L", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("red-orthogonal", "red", "H10", 4),
        ship("red-l", "red", "J9", 4),
      ],
    });

    expect(
      attackRefusalReason(state, "green-1", squareFromName("H10")),
    ).toBeUndefined();
    expect(
      attackRefusalReason(state, "green-1", squareFromName("J9")),
    ).toBeUndefined();
  });

  it("a friendly ship between attacker and target does not block the shot, but an enemy one does", () => {
    const withFriendlyBlocker = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "H9", 4),
        ship("red-1", "red", "H10", 4),
      ],
    });
    const withEnemyBlocker = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("red-blocker", "red", "H9", 4),
        ship("red-1", "red", "H10", 4),
      ],
    });
    const cleared = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("red-1", "red", "H10", 4),
      ],
    });

    expect(
      attackRefusalReason(
        withFriendlyBlocker,
        "green-1",
        squareFromName("H10"),
      ),
    ).toBeUndefined();
    expect(
      attackRefusalReason(withEnemyBlocker, "green-1", squareFromName("H10")),
    ).toBe("attack-path-blocked");
    expect(
      attackRefusalReason(cleared, "green-1", squareFromName("H10")),
    ).toBeUndefined();
  });

  it("blocks an L attack from either corner independently, and lets it through once both are clear", () => {
    const blockedByOrthogonalCorner = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("red-corner", "red", "I8", 4),
        ship("red-target", "red", "J9", 4),
      ],
    });
    const blockedByDiagonalCorner = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("red-corner", "red", "I9", 4),
        ship("red-target", "red", "J9", 4),
      ],
    });
    const friendlyOnBothCorners = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "I8", 4),
        ship("green-3", "green", "I9", 4),
        ship("red-target", "red", "J9", 4),
      ],
    });

    expect(
      attackRefusalReason(
        blockedByOrthogonalCorner,
        "green-1",
        squareFromName("J9"),
      ),
    ).toBe("attack-path-blocked");
    expect(
      attackRefusalReason(
        blockedByDiagonalCorner,
        "green-1",
        squareFromName("J9"),
      ),
    ).toBe("attack-path-blocked");
    expect(
      attackRefusalReason(
        friendlyOnBothCorners,
        "green-1",
        squareFromName("J9"),
      ),
    ).toBeUndefined();
  });

  it("refuses cannot-afford-target for a real shape the attacker cannot pay for", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 1), ship("red-1", "red", "J9", 4)],
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("J9"))).toBe(
      "cannot-afford-target",
    );
    expect(legalTargets(state, "green-1")).not.toContainEqual(
      squareFromName("J9"),
    );
  });

  it("refuses target-out-of-range for a target beyond the reach", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 0),
        ship("red-1", "red", "H11", 4),
      ],
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H11"))).toBe(
      "target-out-of-range",
    );
  });

  it("refuses an attacker standing on a planet", () => {
    const planet = PLANETS[0];
    const neighbour = orthogonalNonPlanetNeighbourOf(planet);
    const state = buildState({
      ships: [
        ship("green-1", "green", squareName(planet), 2),
        ship("red-1", "red", squareName(neighbour), 4),
      ],
    });

    expect(attackRefusalReason(state, "green-1", neighbour)).toBe(
      "attacker-on-planet",
    );
    expect(legalTargets(state, "green-1")).toEqual([]);
  });

  it("refuses a target standing on a planet, distinguishably from the attacker's own", () => {
    const planet = PLANETS[0];
    const neighbour = orthogonalNonPlanetNeighbourOf(planet);
    const state = buildState({
      ships: [
        ship("green-1", "green", squareName(neighbour), 2),
        ship("red-1", "red", squareName(planet), 4),
      ],
    });

    expect(attackRefusalReason(state, "green-1", planet)).toBe(
      "target-on-planet",
    );
  });

  it("refuses an empty target square, and a friendly target", () => {
    const state = buildState({
      ships: [
        ship("green-1", "green", "H8", 2),
        ship("green-2", "green", "H9", 4),
      ],
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H7"))).toBe(
      "no-target-there",
    );
    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "target-is-friendly",
    );
  });

  it("refuses an enemy ship attempting to attack", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      sideToMove: "green",
    });

    expect(attackRefusalReason(state, "red-1", squareFromName("H8"))).toBe(
      "not-your-ship",
    );
  });

  it("matches movement reach exactly at every power level: a lone enemy at any reach destination is a legal target", () => {
    const origin = "H8";
    for (const power of [0, 1, 2, 3, 4, 5, 6] as const) {
      const destinations = reachFrom(squareFromName(origin), power).map(
        (entry) => entry.destination,
      );

      for (const destination of destinations) {
        const state = buildState({
          ships: [
            ship("green-1", "green", origin, power),
            ship("red-1", "red", squareName(destination), 4),
          ],
        });
        expect(
          attackRefusalReason(state, "green-1", destination),
        ).toBeUndefined();
      }

      expect(squareNames(destinations)).toHaveLength(
        power === 0 ? 4 : power === 1 ? 8 : 20,
      );
    }
  });

  it("refuses a ship that has already acted this ply, leaving it with no targets", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      actedThisPly: ["green-1"],
      actionsRemaining: 1,
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "ship-already-acted",
    );
    expect(legalTargets(state, "green-1")).toEqual([]);
  });
});

describe("attackRefusalReason / legalTargets on an inactive node (§7)", () => {
  it("neither blocks an attack nor blocks the attacker's ship from being attacked", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7", 0), ship("red-1", "red", "E8", 4)],
      nodes: { E7: "inactive", E8: "inactive" },
    });

    expect(
      attackRefusalReason(state, "green-1", squareFromName("E8")),
    ).toBeUndefined();
    expect(legalTargets(state, "green-1")).toContainEqual(squareFromName("E8"));
  });

  it("lets a ship on an inactive node attack another, the roles swapped", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "E7", 0), ship("red-1", "red", "E8", 4)],
      sideToMove: "red",
      nodes: { E7: "inactive", E8: "inactive" },
    });

    expect(
      attackRefusalReason(state, "red-1", squareFromName("E7")),
    ).toBeUndefined();
    expect(legalTargets(state, "red-1")).toContainEqual(squareFromName("E7"));
  });
});

describe("attackRefusalReason / legalTargets on a depleted node (§7)", () => {
  it("refuses an attacker trapped on a depleted node, leaving it with no targets", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      nodes: { H8: "depleted" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "attacker-on-depleted-node",
    );
    expect(legalTargets(state, "green-1")).toEqual([]);
  });

  it("refuses a target trapped on a depleted node, and it is absent from legalTargets", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      nodes: { H9: "depleted" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "target-on-depleted-node",
    );
    expect(legalTargets(state, "green-1")).not.toContainEqual(
      squareFromName("H9"),
    );
  });

  it("refuses a trapped target within reach as protected, not as out of range", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "H9", 4)],
      nodes: { H9: "depleted" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "target-on-depleted-node",
    );
  });

  it("reports the attacker's own reason ahead of the target's when both are trapped", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      nodes: { H8: "depleted", H9: "depleted" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "attacker-on-depleted-node",
    );
  });

  it("refuses a trapped enemy ship as a target even from a square that reaches it and can afford the shot", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 4)],
      nodes: { H9: "depleted" },
    });

    expect(legalTargets(state, "green-1")).not.toContainEqual(
      squareFromName("H9"),
    );
  });
});

describe("attackRefusalReason / legalTargets on a charged node (§7)", () => {
  it("refuses an attacker standing on a charged node, leaving it with no targets", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      nodes: { H8: "charged" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "attacker-on-charged-node",
    );
    expect(legalTargets(state, "green-1")).toEqual([]);
  });

  it("refuses a target standing on a charged node, and it is absent from legalTargets", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      nodes: { H9: "charged" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "target-on-charged-node",
    );
    expect(legalTargets(state, "green-1")).not.toContainEqual(
      squareFromName("H9"),
    );
  });

  it("refuses a protected target within reach as protected, not as out of range", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 0), ship("red-1", "red", "H9", 4)],
      nodes: { H9: "charged" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "target-on-charged-node",
    );
  });

  it("reports the attacker's own reason ahead of the target's when both stand on charged nodes", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 2), ship("red-1", "red", "H9", 4)],
      nodes: { H8: "charged", H9: "charged" },
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "attacker-on-charged-node",
    );
  });
});

describe("attackRefusalReason and legalTargets once the game is over", () => {
  it("refuses an attack that would otherwise be legal, with game-over ahead of any other reason", () => {
    const state = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 4)],
      plyNumber: 61,
    });

    expect(attackRefusalReason(state, "green-1", squareFromName("H9"))).toBe(
      "game-over",
    );
  });

  it("refuses an attack that would have been illegal anyway, still with game-over", () => {
    const notAdjacent = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "K5", 4)],
      plyNumber: 61,
    });
    const notYourShip = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 4)],
      sideToMove: "red",
      plyNumber: 61,
    });

    expect(
      attackRefusalReason(notAdjacent, "green-1", squareFromName("K5")),
    ).toBe("game-over");
    expect(
      attackRefusalReason(notYourShip, "green-1", squareFromName("H9")),
    ).toBe("game-over");
  });

  it("legalTargets contains a target legal before the game ends, and is empty in the same state once it has", () => {
    const beforeEnd = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 4)],
      plyNumber: 60,
    });
    const afterEnd: GameState = { ...beforeEnd, plyNumber: 61 };

    expect(legalTargets(beforeEnd, "green-1")).toContainEqual(
      squareFromName("H9"),
    );
    expect(legalTargets(afterEnd, "green-1")).toEqual([]);
  });

  it("judges game-over against the state's own length, not the default", () => {
    const notOver = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 4)],
      plyNumber: 6,
      lengthInRounds: 3,
    });
    const over = buildState({
      ships: [ship("green-1", "green", "H8", 4), ship("red-1", "red", "H9", 4)],
      plyNumber: 7,
      lengthInRounds: 3,
    });

    expect(
      attackRefusalReason(notOver, "green-1", squareFromName("H9")),
    ).toBeUndefined();
    expect(attackRefusalReason(over, "green-1", squareFromName("H9"))).toBe(
      "game-over",
    );
  });
});

describe("drawReturnPlanet", () => {
  const [FIRST_PLANET_NAME, SECOND_PLANET_NAME, THIRD_PLANET_NAME] =
    PLANETS.map(squareName);

  it("always draws a planet that was empty in the state drawn against", () => {
    const state = buildState({
      ships: [
        ship("red-1", "red", FIRST_PLANET_NAME, 4),
        ship("red-2", "red", SECOND_PLANET_NAME, 4),
        ship("red-3", "red", THIRD_PLANET_NAME, 4),
      ],
    });
    const occupied = new Set([
      FIRST_PLANET_NAME,
      SECOND_PLANET_NAME,
      THIRD_PLANET_NAME,
    ]);

    for (let seed = 0; seed < 200; seed++) {
      const [planet] = drawReturnPlanet({ ...state, randomSeed: seed });
      expect(isPlanet(planet)).toBe(true);
      expect(occupied.has(squareName(planet))).toBe(false);
    }
  });

  it("gives the one empty planet for every seed when every other planet is occupied", () => {
    const occupiedPlanets = PLANETS.filter(
      (square) => squareName(square) !== FIRST_PLANET_NAME,
    );
    const state = buildState({
      ships: occupiedPlanets.map((square, index) =>
        ship(`red-${index}`, "red", squareName(square), 4),
      ),
    });

    for (let seed = 0; seed < 50; seed++) {
      const [planet] = drawReturnPlanet({ ...state, randomSeed: seed });
      expect(squareName(planet)).toBe(FIRST_PLANET_NAME);
    }
  });

  it("gives the same planet for the same seed", () => {
    const state = buildState({
      ships: [ship("red-1", "red", FIRST_PLANET_NAME, 4)],
    });

    const [firstPlanet, firstNextSeed] = drawReturnPlanet(state);
    const [secondPlanet, secondNextSeed] = drawReturnPlanet(state);

    expect(squareName(secondPlanet)).toBe(squareName(firstPlanet));
    expect(secondNextSeed).toBe(firstNextSeed);
  });

  it("advances the seed away from the one passed in", () => {
    const state = buildState({ ships: [] });

    for (let seed = 0; seed < 50; seed++) {
      const [, nextSeed] = drawReturnPlanet({ ...state, randomSeed: seed });
      expect(nextSeed).not.toBe(seed);
    }
  });

  it("is live: moving a ship off a planet changes the answer", () => {
    const occupiedState = buildState({
      ships: [ship("red-1", "red", FIRST_PLANET_NAME, 4)],
    });
    const [occupiedPlanet] = drawReturnPlanet(occupiedState);
    expect(squareName(occupiedPlanet)).not.toBe(FIRST_PLANET_NAME);

    const otherOccupiedPlanets = PLANETS.filter(
      (square) => squareName(square) !== FIRST_PLANET_NAME,
    );
    const fullyVacatedExceptOne: GameState = {
      ...occupiedState,
      ships: [
        ship("red-1", "red", "H8", 4),
        ...otherOccupiedPlanets.map((square, index) =>
          ship(`red-${index + 2}`, "red", squareName(square), 4),
        ),
      ],
    };
    const [vacatedPlanet] = drawReturnPlanet(fullyVacatedExceptOne);
    expect(squareName(vacatedPlanet)).toBe(FIRST_PLANET_NAME);
  });

  it("throws naming §7.1 when every planet is occupied", () => {
    const state = buildState({
      ships: PLANETS.map((square, index) =>
        ship(`red-${index}`, "red", squareName(square), 4),
      ),
    });

    expect(() => drawReturnPlanet(state)).toThrow(/§7\.1/);
  });

  it("spreads draws over chained seeds across every empty planet, never an occupied one", () => {
    const occupiedPlanets = new Set(PLANETS.slice(0, 5).map(squareName));
    const state = buildState({
      ships: [...occupiedPlanets].map((name, index) =>
        ship(`red-${index}`, "red", name, 4),
      ),
    });
    const emptyPlanetNames = new Set(
      PLANETS.map(squareName).filter((name) => !occupiedPlanets.has(name)),
    );

    const seenPlanetNames = new Set<string>();
    let seed = 12345;
    for (let draw = 0; draw < 500; draw++) {
      const [planet, nextSeed] = drawReturnPlanet({
        ...state,
        randomSeed: seed,
      });
      const name = squareName(planet);
      expect(occupiedPlanets.has(name)).toBe(false);
      seenPlanetNames.add(name);
      seed = nextSeed;
    }

    expect(seenPlanetNames).toEqual(emptyPlanetNames);
  });
});
