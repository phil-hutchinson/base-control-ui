import { describe, expect, it } from "vitest";
import { BAYS } from "./bays";
import { COLUMN_LETTERS, squareAt, squareName, type Square } from "./board";
import {
  CHARGED_LIFE_PLIES,
  DEPLETED_COOLDOWN_PLIES,
  SITES,
  STARTING_ACTIVE_SITES,
  hasChargedNodeFinished,
  hasDepletedSiteFinishedCooling,
  siteCyclePosition,
  startingSiteState,
} from "./sites";

const COLUMN_INDEX = new Map(
  COLUMN_LETTERS.map((letter, index) => [letter, index]),
);
const COLUMN_AT = new Map(
  COLUMN_LETTERS.map((letter, index) => [index, letter]),
);

/** The square that mirrors the given one across column H. */
function mirrorAcrossColumnH(square: Square): Square {
  const index = COLUMN_INDEX.get(square.column);
  if (index === undefined) {
    throw new Error(`unknown column ${square.column}`);
  }
  const mirroredColumn = COLUMN_AT.get(14 - index);
  if (mirroredColumn === undefined) {
    throw new Error("mirror across column H left the board");
  }
  return squareAt(mirroredColumn, square.row);
}

/** The square that mirrors the given one across row 8. */
function mirrorAcrossRow8(square: Square): Square {
  return squareAt(square.column, 16 - square.row);
}

describe("sites", () => {
  it("has exactly seventeen sites, no duplicates", () => {
    expect(SITES).toHaveLength(17);
    const names = new Set(SITES.map(squareName));
    expect(names.size).toBe(17);
  });

  it("lies entirely in the interior of the board", () => {
    for (const site of SITES) {
      expect(site.column).not.toBe("A");
      expect(site.column).not.toBe("O");
      expect(site.row).not.toBe(1);
      expect(site.row).not.toBe(15);
    }
  });

  it("is unchanged by a mirror across column H", () => {
    const names = new Set(SITES.map(squareName));

    for (const site of SITES) {
      const mirrored = mirrorAcrossColumnH(site);
      expect(names.has(squareName(mirrored))).toBe(true);
    }
  });

  it("is unchanged by a mirror across row 8", () => {
    const names = new Set(SITES.map(squareName));

    for (const site of SITES) {
      const mirrored = mirrorAcrossRow8(site);
      expect(names.has(squareName(mirrored))).toBe(true);
    }
  });

  it("shares no square with a bay", () => {
    const bayNames = new Set(BAYS.map(squareName));
    for (const site of SITES) {
      expect(bayNames.has(squareName(site))).toBe(false);
    }
  });

  it("matches §3.2's table row by row", () => {
    const expected = [
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

    expect(SITES.map(squareName)).toEqual(expected);
  });
});

describe("starting site state", () => {
  it("has exactly five sites starting active: H8, E5, K5, E11, K11", () => {
    expect(STARTING_ACTIVE_SITES.map(squareName)).toEqual([
      "H8",
      "E5",
      "K5",
      "E11",
      "K11",
    ]);
  });

  it("has the other twelve sites starting dormant", () => {
    const activeNames = new Set(STARTING_ACTIVE_SITES.map(squareName));
    const dormantSites = SITES.filter(
      (site) => !activeNames.has(squareName(site)),
    );

    expect(dormantSites).toHaveLength(12);
    for (const site of dormantSites) {
      expect(startingSiteState(site)).toBe("dormant");
    }
  });

  it("has no site starting charged or depleted", () => {
    for (const site of SITES) {
      expect(startingSiteState(site)).not.toBe("charged");
      expect(startingSiteState(site)).not.toBe("depleted");
    }
  });

  it("has every starting-active square in the site list", () => {
    const siteNames = new Set(SITES.map(squareName));
    for (const square of STARTING_ACTIVE_SITES) {
      expect(siteNames.has(squareName(square))).toBe(true);
    }
  });

  it("has no site state for a square that is not a site", () => {
    expect(startingSiteState(squareAt("G", 7))).toBeUndefined();
    expect(startingSiteState(squareAt("D", 15))).toBeUndefined();
  });

  it("is itself symmetric about column H and row 8", () => {
    const names = new Set(STARTING_ACTIVE_SITES.map(squareName));

    for (const site of STARTING_ACTIVE_SITES) {
      expect(names.has(squareName(mirrorAcrossColumnH(site)))).toBe(true);
      expect(names.has(squareName(mirrorAcrossRow8(site)))).toBe(true);
    }
  });
});

describe("the site clocks (rules.md §8.3, §8.6)", () => {
  it("has both clocks at nine turns", () => {
    expect(CHARGED_LIFE_PLIES).toBe(9);
    expect(DEPLETED_COOLDOWN_PLIES).toBe(9);
  });

  it("has a charged node finish on its ninth turn, counting the turn it was woken on", () => {
    const wokenOnPly = 1;

    for (let ply = wokenOnPly; ply <= wokenOnPly + 7; ply++) {
      expect(hasChargedNodeFinished(wokenOnPly, ply)).toBe(false);
    }
    expect(hasChargedNodeFinished(wokenOnPly, wokenOnPly + 8)).toBe(true);
    expect(hasChargedNodeFinished(wokenOnPly, wokenOnPly + 20)).toBe(true);
  });

  it("has a depleted site finish cooling on its ninth turn, not counting the turn it depleted on", () => {
    const depletedOnPly = 9;

    for (let ply = depletedOnPly; ply <= depletedOnPly + 8; ply++) {
      expect(hasDepletedSiteFinishedCooling(depletedOnPly, ply)).toBe(false);
    }
    expect(
      hasDepletedSiteFinishedCooling(depletedOnPly, depletedOnPly + 9),
    ).toBe(true);
    expect(
      hasDepletedSiteFinishedCooling(depletedOnPly, depletedOnPly + 20),
    ).toBe(true);
  });

  it("works the eighteen-ply round trip: woken on ply 1, depletes at the end of ply 9, dormant again at ply 18", () => {
    const wokenOnPly = 1;

    // Charged for plies 1 through 9; finished as of ply 9.
    expect(hasChargedNodeFinished(wokenOnPly, 8)).toBe(false);
    expect(hasChargedNodeFinished(wokenOnPly, 9)).toBe(true);

    // Depleted with enteredOnPly 9; finished cooling as of ply 18.
    const depletedOnPly = 9;
    expect(hasDepletedSiteFinishedCooling(depletedOnPly, 17)).toBe(false);
    expect(hasDepletedSiteFinishedCooling(depletedOnPly, 18)).toBe(true);
  });
});

describe("the site cycle position (rules.md §8.3, §8.6)", () => {
  /** The last ply a node charged on `enteredOnPly` is still displayed charged. */
  function lastChargedPly(enteredOnPly: number): number {
    let ply = enteredOnPly;
    while (!hasChargedNodeFinished(enteredOnPly, ply)) {
      ply++;
    }
    return ply;
  }

  /** The last ply a site depleted on `enteredOnPly` is still displayed depleted. */
  function lastDepletedPly(enteredOnPly: number): number {
    let ply = enteredOnPly + 1;
    while (!hasDepletedSiteFinishedCooling(enteredOnPly, ply)) {
      ply++;
    }
    return ply;
  }

  it("has charged report 0 on the ply it was charged", () => {
    const enteredOnPly = 5;
    expect(siteCyclePosition("charged", enteredOnPly, enteredOnPly)).toBe(0);
  });

  it("has charged report 1 on the last ply hasChargedNodeFinished says it is still running", () => {
    const enteredOnPly = 5;
    const lastPly = lastChargedPly(enteredOnPly);
    expect(siteCyclePosition("charged", enteredOnPly, lastPly)).toBe(1);
  });

  it("has charged travel nine distinct, strictly increasing positions", () => {
    const enteredOnPly = 5;
    const lastPly = lastChargedPly(enteredOnPly);

    const positions: number[] = [];
    for (let ply = enteredOnPly; ply <= lastPly; ply++) {
      positions.push(siteCyclePosition("charged", enteredOnPly, ply) as number);
    }

    expect(positions).toHaveLength(9);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it("has depleted report 0 on the ply after it depleted", () => {
    const enteredOnPly = 9;
    expect(siteCyclePosition("depleted", enteredOnPly, enteredOnPly + 1)).toBe(
      0,
    );
  });

  it("has depleted report 1 on the last ply hasDepletedSiteFinishedCooling says it is still cooling", () => {
    const enteredOnPly = 9;
    const lastPly = lastDepletedPly(enteredOnPly);
    expect(siteCyclePosition("depleted", enteredOnPly, lastPly)).toBe(1);
  });

  it("has depleted travel nine distinct, strictly increasing positions", () => {
    const enteredOnPly = 9;
    const lastPly = lastDepletedPly(enteredOnPly);

    const positions: number[] = [];
    for (let ply = enteredOnPly + 1; ply <= lastPly; ply++) {
      positions.push(
        siteCyclePosition("depleted", enteredOnPly, ply) as number,
      );
    }

    expect(positions).toHaveLength(9);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it("clamps values outside the window to 0 or 1", () => {
    expect(siteCyclePosition("charged", 5, 1)).toBe(0);
    expect(siteCyclePosition("charged", 5, 100)).toBe(1);
    expect(siteCyclePosition("depleted", 9, 1)).toBe(0);
    expect(siteCyclePosition("depleted", 9, 100)).toBe(1);
  });

  it("reports nothing for dormant and active, which have no clock", () => {
    expect(siteCyclePosition("dormant", 5, 5)).toBeUndefined();
    expect(siteCyclePosition("active", 5, 5)).toBeUndefined();
  });
});
