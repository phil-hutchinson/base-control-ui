// An integration test: plays whole games through the public rules API and
// proves the property the seeded generator design exists for — the same
// opening seed and the same sequence of moves and attacks produce the same
// game, fights and planet draws included, and a different seed produces a
// different one. The ply policy below is deterministic, local to this file, and
// draws no randomness of its own: it attacks before it moves, so it produces
// plenty of fights, unlike `fullGame.test.ts`'s greedy policy, which only
// attacks when no ship has a legal move at all.
//
// Since 0.18 the stream starts even earlier than green's first turn: the
// opening board itself is dealt from the same seed (`dealOpeningBoard`,
// §8.1). `startingGameState` is what a recorded game would call to
// reproduce that deal, so the property under test covers it too: the same
// seed deals the same opening board, and a different seed deals a different
// one. Since 0.27 the deal's charged squares are dealt at baseline, with no
// countdown to draw, so the deal consumes `chargedNodeCount + 4` steps —
// nine at the app's default five charged (0.30), eight at four — rather
// than the 24 it once did: one square draw per charged node, plus four more
// for the inactive trio's refill.
//
// 0.26 replaced the board's own end-of-turn charge draw (§8.2) with the
// queue: charging itself draws nothing, but the queue's own refill —
// drawing three new inactive nodes, spread apart by a distance weighting,
// whenever a charge sweeps the surviving ones — is the stream's biggest
// consumer. 0.27 removed the last of the other node draws too: a charged
// node's countdown starts and runs down deterministically once a ship steps
// on it (§8.3), and a depleted node's countdown does the same, so nothing
// about how long a node lives, charged or depleted, draws from the seed any
// more. The sequence of `queue-refilled` effects a game produces — the
// squares discarded and the trio drawn to replace them, in order — is
// recorded and compared below, for the same reason: it is drawn from the
// same stream, and a recorded game must replay it exactly too. A retiring
// node's own square (`node-retired`) is recorded alongside it, though
// retirement itself draws nothing — nothing appears in a retiring node's
// place any more.
//
// 0.36 added node rotation as a pre-play choice (§8.2). At the app's
// default (continuous) and at planet nothing new is drawn from the stream —
// rotation itself has never consumed a seed step, and `placeRotators` is
// only ever called under dedicated — so every recorded figure below stands
// exactly as it did before 0.36. Only dedicated adds steps, up to eight at
// the opening deal and up to eight after every queue refill, which is
// asserted directly below rather than assumed.
//
// 0.38 added planet bonuses (§3.4). At the app's default (off) nothing new
// is drawn — the bonus deal only runs when the setting is on, and it runs
// last, after the opening deal and the rotator draw — so every recorded
// figure below stands exactly as it did before 0.38. Only an ON game adds
// steps, exactly six at the opening deal, which `gameState.test.ts` asserts
// directly.
//
// 0.39 added steal, a fourth node playstyle with node rules of its own
// (steal.md) and a seed usage that has nothing to do with the queue above:
// the opening deal draws `2 * chargedNodeCount` steps, one per prospective
// square (steal.md §7); every claim and every abandon a game plays draws
// exactly one more, for its fresh prospective square (steal.md §§3, 4, 6);
// and the end of a turn draws nothing at all, since only power and energy
// run (steal.md §8). The sequence of `node-claimed` and `node-abandoned`
// effects a steal game produces is recorded and compared below, the same
// way the queue's refills are above.
//
// Planet resources, offered only under steal (steal.md §10), adds draws of
// its own: the opening deal draws four more steps for the two
// bonuses' planets and kinds, and every claim draws its own effect's steps
// (none for a points kind or Fuel, one per node for Additional nodes or
// Node scramble), then one for the survivor's new kind, one for the new
// bonus's planet and one for its kind — under stable, the same without the
// survivor's draw. A separate harness below plays a steal game under stable
// and under race with a bonus-seeking policy and compares its sequence of
// `activity-bonus-claimed` effects the same way.

import { describe, expect, it } from "vitest";
import {
  chebyshevDistance,
  type Square,
  squareFromName,
  squareName,
} from "./board";
import { legalTargets } from "./combat";
import type { ShipId } from "./fleet";
import { isGameOver } from "./gameLength";
import { type GameState, nodeStateAt, startingGameState } from "./gameState";
import { legalDestinations } from "./movement";
import {
  type AttackEffect,
  type EndOfPlyEffect,
  type MoveEffect,
  applyAttack,
  applyMove,
  applyPassGuard,
} from "./ply";

type PlyChoice =
  | {
      readonly kind: "attack";
      readonly shipId: ShipId;
      readonly target: Square;
    }
  | {
      readonly kind: "move";
      readonly shipId: ShipId;
      readonly destination: Square;
    };

/**
 * An attack-first policy: the first ship, in fleet order, with a legal
 * attack takes it; failing that, the first ship, in fleet-then-destination
 * order, with a legal move onto a charged node takes it — a countdown only
 * ever starts this way (rules.md §8.3), and a ship that then holds the node
 * to the end leaves it, so this is also what drives the departures that
 * turn a charged node into an exit; failing that, the first ship with any
 * legal move takes it; failing that, there is nothing to do and the pass
 * guard handles it.
 */
function choosePly(state: GameState): PlyChoice | undefined {
  for (const ship of state.ships) {
    const targets = legalTargets(state, ship.id);
    if (targets.length > 0) {
      return { kind: "attack", shipId: ship.id, target: targets[0] };
    }
  }

  for (const ship of state.ships) {
    for (const destination of legalDestinations(state, ship.id)) {
      if (nodeStateAt(state, destination) === "charged") {
        return { kind: "move", shipId: ship.id, destination };
      }
    }
  }

  for (const ship of state.ships) {
    const destinations = legalDestinations(state, ship.id);
    if (destinations.length > 0) {
      return { kind: "move", shipId: ship.id, destination: destinations[0] };
    }
  }

  return undefined;
}

/** The square name of every `node-charged` effect nested inside an end-of-ply effect, if any. */
function chargedSquares(
  effects: readonly (MoveEffect | AttackEffect | EndOfPlyEffect)[],
): readonly string[] {
  const squares: string[] = [];
  for (const effect of effects) {
    if (effect.type === "ply-ended" || effect.type === "ply-passed") {
      for (const sub of effect.endOfTurn) {
        if (sub.type === "node-charged") {
          squares.push(squareName(sub.square));
        }
      }
    }
  }
  return squares;
}

/** The square name of every `node-retired` effect nested inside an end-of-ply effect, if any. */
function retiredNodes(
  effects: readonly (MoveEffect | AttackEffect | EndOfPlyEffect)[],
): readonly string[] {
  const squares: string[] = [];
  for (const effect of effects) {
    if (effect.type === "ply-ended" || effect.type === "ply-passed") {
      for (const sub of effect.endOfTurn) {
        if (sub.type === "node-retired") {
          squares.push(squareName(sub.square));
        }
      }
    }
  }
  return squares;
}

/**
 * Every `queue-refilled` effect nested inside an end-of-ply effect, if
 * any, as one string per sweep: the discarded squares, then the trio drawn
 * to replace them with the priority each was dealt, e.g.
 * `"D8,K5=>F3:2,H9:3,C11:1"`.
 */
function queueRefills(
  effects: readonly (MoveEffect | AttackEffect | EndOfPlyEffect)[],
): readonly string[] {
  const refills: string[] = [];
  for (const effect of effects) {
    if (effect.type === "ply-ended" || effect.type === "ply-passed") {
      for (const sub of effect.endOfTurn) {
        if (sub.type === "queue-refilled") {
          const discarded = sub.discardedSquares.map(squareName).join(",");
          const drawn = sub.newNodes
            .map((node) => `${squareName(node.square)}:${node.priority}`)
            .join(",");
          refills.push(`${discarded}=>${drawn}`);
        }
      }
    }
  }
  return refills;
}

/**
 * D9's first long-run invariant: a charged node carrying a countdown always
 * has a ship standing on it. A countdown starts only when a ship moves onto
 * the node and ends the instant it either leaves (§8.3) or the node
 * depletes (§8.6 step 3), so this must hold after every ply in a real,
 * ship-driven game — unlike `nodePool.test.ts`'s synthetic driver, which
 * gives a charged node a countdown with no ship to back it.
 */
function assertChargedCountdownHasShip(state: GameState): void {
  const shipSquareNames = new Set(
    state.ships.map((ship) => squareName(ship.square)),
  );
  for (const [name, status] of Object.entries(state.nodes)) {
    if (status.state === "charged" && status.level > 0) {
      expect(shipSquareNames.has(name)).toBe(true);
    }
  }
}

/** A hard ceiling on plies applied, so a regression fails an assertion, not the test runner. */
const MAX_PLIES = 10_000;

interface PlayedGame {
  readonly finalState: GameState;
  readonly openingBoard: Readonly<Record<string, GameState["nodes"][string]>>;
  readonly planetReturns: readonly string[];
  readonly chargedNodes: readonly string[];
  readonly retiredNodes: readonly string[];
  readonly queueRefills: readonly string[];
  readonly fightCount: number;
}

/**
 * Plays a whole game from `seed` at `lengthInRounds` using the attack-first
 * policy above, and records the opening board the seed dealt (§8.1) before
 * play began, the square name of every planet a `fight-resolved` effect
 * returned a ship to, in the order the fights happened, how many fights
 * happened, the square name of every node the queue charged, in the order it
 * charged them, the square name of every node the end-of-turn sequence
 * retired, in order, and every sweep the queue's refill produced, in order
 * (§3.2, §8.2).
 */
function playSeededGame(seed: number, lengthInRounds: number): PlayedGame {
  let state = startingGameState(seed, {
    lengthInRounds,
    combatEnabled: true,
    // Pinned, not left to the app's default: every figure this file checks
    // — fight counts, planet returns, queue refills — was measured under
    // five a side, five charged nodes, simple scoring and continuous
    // rotation, and the comments above record them as such.
    fleetSize: 5,
    chargedNodeCount: 5,
    scoring: "simple",
    nodePlaystyle: "continuous",
  });
  const openingBoard = state.nodes;
  const planetReturns: string[] = [];
  const chargedNodes: string[] = [];
  const retiredNodeSquares: string[] = [];
  const queueRefillSweeps: string[] = [];
  let fightCount = 0;

  let pliesApplied = 0;
  while (!isGameOver(state)) {
    if (pliesApplied >= MAX_PLIES) {
      throw new Error(
        `seeded replay game exceeded ${MAX_PLIES} plies without ending — likely a regression`,
      );
    }
    pliesApplied += 1;

    const choice = choosePly(state);

    if (choice === undefined) {
      const { state: nextState, effect } = applyPassGuard(state);
      state = nextState;
      assertChargedCountdownHasShip(state);
      if (effect !== undefined) {
        chargedNodes.push(...chargedSquares([effect]));
        retiredNodeSquares.push(...retiredNodes([effect]));
        queueRefillSweeps.push(...queueRefills([effect]));
      }
      continue;
    }

    if (choice.kind === "attack") {
      const result = applyAttack(state, choice.shipId, choice.target);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal attack: ${result.reason} for ${choice.shipId} on ${squareName(choice.target)}`,
        );
      }
      state = result.state;
      assertChargedCountdownHasShip(state);
      for (const effect of result.effects) {
        if (effect.type === "fight-resolved") {
          fightCount += 1;
          for (const fightReturn of effect.returns) {
            planetReturns.push(squareName(fightReturn.to));
          }
        }
      }
      chargedNodes.push(...chargedSquares(result.effects));
      retiredNodeSquares.push(...retiredNodes(result.effects));
      queueRefillSweeps.push(...queueRefills(result.effects));
    } else {
      const result = applyMove(state, choice.shipId, choice.destination);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal move: ${result.reason} for ${choice.shipId} to ${squareName(choice.destination)}`,
        );
      }
      state = result.state;
      assertChargedCountdownHasShip(state);
      chargedNodes.push(...chargedSquares(result.effects));
      retiredNodeSquares.push(...retiredNodes(result.effects));
      queueRefillSweeps.push(...queueRefills(result.effects));
    }
  }

  return {
    finalState: state,
    openingBoard,
    planetReturns,
    chargedNodes,
    retiredNodes: retiredNodeSquares,
    queueRefills: queueRefillSweeps,
    fightCount,
  };
}

/** Every node's `level` at the end of a game, keyed by square name — the part of the state a countdown ply spends. */
function nodeLevels(state: GameState): Readonly<Record<string, number>> {
  const levels: Record<string, number> = {};
  for (const [name, status] of Object.entries(state.nodes)) {
    levels[name] = status.level;
  }
  return levels;
}

describe("a seeded game replays its opening board, its fights, its planets, its charges and its queue refills exactly", () => {
  it("produces plenty of fights, charges and queue refills, over a forty-round game — the run is not vacuous", () => {
    const {
      planetReturns,
      chargedNodes,
      retiredNodes,
      queueRefills,
      fightCount,
    } = playSeededGame(20260819, 40);

    // Ships start on ordinary edge squares and are attackable from the
    // first turn — a ship only becomes unattackable by flying onto a
    // planet, away from the board's outer edge — so this attack-first
    // policy keeps finding fights across the run rather than stalling
    // early, even though its second preference, moving onto a charged
    // node, competes with attacking for a ship's ply. At five a side this
    // seed over forty rounds measures 3 fights and the 6 planet returns they
    // send ships back on. The floors below sit well beneath that: the
    // figures are this run's own, and any rule that changes the course
    // of a ply moves them.
    expect(fightCount).toBeGreaterThanOrEqual(1);
    expect(planetReturns.length).toBeGreaterThanOrEqual(2);
    // The same run measures 19 charges, 17 retirements and 19 refills.
    // These are this run's own numbers and move with any rule that
    // changes the course of a ply, so the floors below leave margin.
    expect(chargedNodes.length).toBeGreaterThanOrEqual(4);
    expect(retiredNodes.length).toBeGreaterThanOrEqual(4);
    expect(queueRefills.length).toBeGreaterThanOrEqual(4);
  });

  it("replays the same opening board, the same planet sequence, the same charged-node sequence, the same retirement and refill sequences and the same final state from the same seed", () => {
    const first = playSeededGame(20260819, 40);
    const second = playSeededGame(20260819, 40);

    expect(second.openingBoard).toEqual(first.openingBoard);
    expect(second.planetReturns).toEqual(first.planetReturns);
    expect(second.chargedNodes).toEqual(first.chargedNodes);
    expect(second.retiredNodes).toEqual(first.retiredNodes);
    expect(second.queueRefills).toEqual(first.queueRefills);
    expect(second.finalState).toEqual(first.finalState);
    // The final state's equality above already covers this, but it is
    // worth naming directly: the queue's refill draw (§8.2) writes to
    // every node's `level`, not only to which nodes get charged, and the
    // countdown's own deterministic per-ply spend (§8.3) does too.
    expect(nodeLevels(second.finalState)).toEqual(nodeLevels(first.finalState));
  });

  it("deals a different opening board, and produces a different planet sequence, a different charged-node sequence and a different refill sequence, from a different seed", () => {
    // Any pair of distinct seeds is expected to diverge; these two are
    // confirmed to by running this test. If a future change to the game
    // happens to make this pair coincide, pick another pair.
    const first = playSeededGame(20260819, 40);
    const second = playSeededGame(20260820, 40);

    expect(second.openingBoard).not.toEqual(first.openingBoard);
    expect(second.planetReturns).not.toEqual(first.planetReturns);
    expect(second.chargedNodes).not.toEqual(first.chargedNodes);
    expect(second.queueRefills).not.toEqual(first.queueRefills);
  });
});

describe("node rotation (rules.md §8.2, 0.36) leaves the pre-0.36 seeded stream untouched at continuous", () => {
  it("deals the same opening board and leaves the same randomSeed behind, at continuous and at planet", () => {
    const seed = 20260819;
    const continuousState = startingGameState(seed, {
      lengthInRounds: 40,
      combatEnabled: true,
      nodePlaystyle: "continuous",
    });
    const planetState = startingGameState(seed, {
      lengthInRounds: 40,
      combatEnabled: true,
      nodePlaystyle: "planet",
    });

    // Planet deals the identical board and consumes the identical seed —
    // only a landing rotates the queue under planet, and the deal itself
    // never lands a ship anywhere.
    expect(planetState.nodes).toEqual(continuousState.nodes);
    expect(planetState.ships).toEqual(continuousState.ships);
    expect(planetState.randomSeed).toBe(continuousState.randomSeed);
    expect(planetState.rotators).toEqual([]);
    expect(continuousState.rotators).toEqual([]);
  });

  it("deals the same board but spends more of the seed under dedicated, placing rotators no continuous or planet game carries", () => {
    const seed = 20260819;
    const continuousState = startingGameState(seed, {
      lengthInRounds: 40,
      combatEnabled: true,
      nodePlaystyle: "continuous",
    });
    const dedicatedState = startingGameState(seed, {
      lengthInRounds: 40,
      combatEnabled: true,
      nodePlaystyle: "dedicated",
    });

    // The board itself — nodes and ships — is dealt identically; only the
    // rotators are drawn afterwards (rules.md §3.3), so only the seed the
    // deal leaves behind differs.
    expect(dedicatedState.nodes).toEqual(continuousState.nodes);
    expect(dedicatedState.ships).toEqual(continuousState.ships);
    expect(dedicatedState.randomSeed).not.toBe(continuousState.randomSeed);
    expect(dedicatedState.rotators.length).toBeGreaterThan(0);
  });
});

/**
 * The Chebyshev distance from `square` to the nearest prospective node right
 * now — under steal a prospective node is the only landable node square
 * (steal.md §2), so this is what a ship heads for once no attack and no
 * direct landing is available.
 */
function distanceToNearestProspective(
  state: GameState,
  square: Square,
): number {
  let nearest = Infinity;
  for (const [name, status] of Object.entries(state.nodes)) {
    if (status.state !== "prospective") {
      continue;
    }
    const distance = chebyshevDistance(square, squareFromName(name));
    if (distance < nearest) {
      nearest = distance;
    }
  }
  return nearest;
}

/**
 * An attack-first policy for a steal game: the first ship, in fleet order,
 * with a legal attack takes it; failing that, the first ship, in
 * fleet-then-destination order, with a legal move onto a prospective node
 * takes it — claiming or stealing it (steal.md §3) is the only way onto a
 * steal node at all; failing that, the move that most closes the distance to
 * the nearest prospective node; failing that, the first ship with any legal
 * move; failing that, there is nothing to do and the pass guard handles it.
 */
function chooseStealPly(state: GameState): PlyChoice | undefined {
  for (const ship of state.ships) {
    const targets = legalTargets(state, ship.id);
    if (targets.length > 0) {
      return { kind: "attack", shipId: ship.id, target: targets[0] };
    }
  }

  for (const ship of state.ships) {
    for (const destination of legalDestinations(state, ship.id)) {
      if (nodeStateAt(state, destination) === "prospective") {
        return { kind: "move", shipId: ship.id, destination };
      }
    }
  }

  let best:
    { shipId: ShipId; destination: Square; improvement: number } | undefined;
  for (const ship of state.ships) {
    const destinations = legalDestinations(state, ship.id);
    if (destinations.length === 0) {
      continue;
    }
    const fromDistance = distanceToNearestProspective(state, ship.square);
    for (const destination of destinations) {
      const toDistance = distanceToNearestProspective(state, destination);
      const improvement = fromDistance - toDistance;
      if (best === undefined || improvement > best.improvement) {
        best = { shipId: ship.id, destination, improvement };
      }
    }
  }
  if (best !== undefined) {
    return { kind: "move", shipId: best.shipId, destination: best.destination };
  }

  for (const ship of state.ships) {
    const destinations = legalDestinations(state, ship.id);
    if (destinations.length > 0) {
      return { kind: "move", shipId: ship.id, destination: destinations[0] };
    }
  }

  return undefined;
}

/**
 * One `node-claimed` or `node-abandoned` effect, reduced to the fields worth
 * comparing across a replay: the signal, the square the event happened at,
 * whether a claim released a square (a steal, or a relocation), and the
 * fresh prospective square drawn.
 */
type StealNodeEvent =
  | {
      readonly kind: "claimed";
      readonly signal: number;
      readonly square: string;
      readonly releasedSquare: string | undefined;
      readonly newProspective: string;
    }
  | {
      readonly kind: "abandoned";
      readonly signal: number;
      readonly square: string;
      readonly newProspective: string;
    };

/** Every steal node event nested inside a ply's own effects, in order (steal.md §§3-5). */
function stealNodeEvents(
  effects: readonly (MoveEffect | AttackEffect)[],
): readonly StealNodeEvent[] {
  const events: StealNodeEvent[] = [];
  for (const effect of effects) {
    if (effect.type === "node-abandoned") {
      events.push({
        kind: "abandoned",
        signal: effect.signal,
        square: squareName(effect.square),
        newProspective: squareName(effect.newProspective),
      });
    } else if (effect.type === "node-claimed") {
      events.push({
        kind: "claimed",
        signal: effect.signal,
        square: squareName(effect.square),
        releasedSquare:
          effect.releasedSquare === undefined
            ? undefined
            : squareName(effect.releasedSquare),
        newProspective: squareName(effect.newProspective),
      });
    }
  }
  return events;
}

interface PlayedStealGame {
  readonly finalState: GameState;
  readonly openingBoard: Readonly<Record<string, GameState["nodes"][string]>>;
  readonly events: readonly StealNodeEvent[];
  readonly fightCount: number;
}

/**
 * Plays a whole steal game from `seed` at `lengthInRounds` using
 * `chooseStealPly`, and records the opening board the seed dealt (steal.md
 * §7) before play began, every `node-claimed` and `node-abandoned` event the
 * game raised, in order, and how many fights happened.
 */
function playSeededStealGame(
  seed: number,
  lengthInRounds: number,
): PlayedStealGame {
  let state = startingGameState(seed, {
    lengthInRounds,
    combatEnabled: true,
    fleetSize: 5,
    chargedNodeCount: 5,
    scoring: "simple",
    nodePlaystyle: "steal",
  });
  const openingBoard = state.nodes;
  const events: StealNodeEvent[] = [];
  let fightCount = 0;

  let pliesApplied = 0;
  while (!isGameOver(state)) {
    if (pliesApplied >= MAX_PLIES) {
      throw new Error(
        `seeded steal replay game exceeded ${MAX_PLIES} plies without ending — likely a regression`,
      );
    }
    pliesApplied += 1;

    const choice = chooseStealPly(state);

    if (choice === undefined) {
      const { state: nextState } = applyPassGuard(state);
      state = nextState;
      continue;
    }

    if (choice.kind === "attack") {
      const result = applyAttack(state, choice.shipId, choice.target);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal attack: ${result.reason} for ${choice.shipId} on ${squareName(choice.target)}`,
        );
      }
      state = result.state;
      for (const effect of result.effects) {
        if (effect.type === "fight-resolved") {
          fightCount += 1;
        }
      }
      events.push(...stealNodeEvents(result.effects));
    } else {
      const result = applyMove(state, choice.shipId, choice.destination);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal move: ${result.reason} for ${choice.shipId} to ${squareName(choice.destination)}`,
        );
      }
      state = result.state;
      events.push(...stealNodeEvents(result.effects));
    }
  }

  return { finalState: state, openingBoard, events, fightCount };
}

describe("a seeded steal game replays its opening board and its claim and abandon sequence exactly (steal.md)", () => {
  it("produces plenty of claims, steals and abandons over a forty-round game — the run is not vacuous", () => {
    const { events, fightCount } = playSeededStealGame(20260819, 40);

    const claimed = events.filter((event) => event.kind === "claimed");
    const stolen = claimed.filter(
      (event) => event.releasedSquare !== undefined,
    );
    const abandoned = events.filter((event) => event.kind === "abandoned");

    // At five a side this seed over forty rounds measures 53 claims, 31 of
    // them steals, 18 abandons and 5 fights. These are this run's own
    // numbers and move with any rule that changes the course of a ply, so
    // the floors below leave margin.
    expect(claimed.length).toBeGreaterThanOrEqual(10);
    expect(stolen.length).toBeGreaterThanOrEqual(5);
    expect(abandoned.length).toBeGreaterThanOrEqual(5);
    expect(fightCount).toBeGreaterThanOrEqual(1);
  });

  it("replays the same opening board, the same claim-and-abandon sequence and the same final state from the same seed", () => {
    const first = playSeededStealGame(20260819, 40);
    const second = playSeededStealGame(20260819, 40);

    expect(second.openingBoard).toEqual(first.openingBoard);
    expect(second.events).toEqual(first.events);
    expect(second.finalState).toEqual(first.finalState);
  });

  it("deals a different opening board and produces a different claim-and-abandon sequence from a different seed", () => {
    // Any pair of distinct seeds is expected to diverge; this pair is
    // confirmed to by running this test. If a future change to the game
    // happens to make it coincide, pick another pair.
    const first = playSeededStealGame(20260819, 40);
    const second = playSeededStealGame(20260820, 40);

    expect(second.openingBoard).not.toEqual(first.openingBoard);
    expect(second.events).not.toEqual(first.events);
  });
});

/** Whether `square` is one of the two current planet resources bonuses' planets (steal.md §10). */
function isActivityBonusPlanet(state: GameState, square: Square): boolean {
  return state.activityBonuses.some(
    (bonus) => squareName(bonus.square) === squareName(square),
  );
}

/**
 * An attack-first, bonus-seeking policy for a steal game under planet
 * resources (steal.md §10): the first ship, in fleet order, with a
 * legal attack takes it; failing that, the first ship, in
 * fleet-then-destination order, with a legal move onto one of the two
 * current bonus planets takes it; failing that, the same for a move onto a
 * prospective node; failing that, the move that most closes the distance to
 * the nearest prospective node; failing that, the first ship with any legal
 * move; failing that, there is nothing to do and the pass guard handles it.
 */
function chooseStealBonusPly(state: GameState): PlyChoice | undefined {
  for (const ship of state.ships) {
    const targets = legalTargets(state, ship.id);
    if (targets.length > 0) {
      return { kind: "attack", shipId: ship.id, target: targets[0] };
    }
  }

  for (const ship of state.ships) {
    for (const destination of legalDestinations(state, ship.id)) {
      if (isActivityBonusPlanet(state, destination)) {
        return { kind: "move", shipId: ship.id, destination };
      }
    }
  }

  for (const ship of state.ships) {
    for (const destination of legalDestinations(state, ship.id)) {
      if (nodeStateAt(state, destination) === "prospective") {
        return { kind: "move", shipId: ship.id, destination };
      }
    }
  }

  let best:
    { shipId: ShipId; destination: Square; improvement: number } | undefined;
  for (const ship of state.ships) {
    const destinations = legalDestinations(state, ship.id);
    if (destinations.length === 0) {
      continue;
    }
    const fromDistance = distanceToNearestProspective(state, ship.square);
    for (const destination of destinations) {
      const toDistance = distanceToNearestProspective(state, destination);
      const improvement = fromDistance - toDistance;
      if (best === undefined || improvement > best.improvement) {
        best = { shipId: ship.id, destination, improvement };
      }
    }
  }
  if (best !== undefined) {
    return { kind: "move", shipId: best.shipId, destination: best.destination };
  }

  for (const ship of state.ships) {
    const destinations = legalDestinations(state, ship.id);
    if (destinations.length > 0) {
      return { kind: "move", shipId: ship.id, destination: destinations[0] };
    }
  }

  return undefined;
}

/**
 * One `activity-bonus-claimed` effect, reduced to the fields worth comparing
 * across a replay: the claiming side, the kind claimed, the planet it was
 * claimed on, and the survivor's kind after the claim and the new bonus's
 * kind — enough to prove
 * a replay reproduces every draw the claim made, without repeating the
 * effect's own square-list fields.
 */
interface ActivityBonusEvent {
  readonly side: string;
  readonly kind: string;
  readonly square: string;
  readonly survivorOldKind: string;
  readonly survivorNewKind: string;
  readonly newBonusKind: string;
}

/** Every `activity-bonus-claimed` effect nested inside a ply's own effects, in order (steal.md §10). */
function activityBonusEvents(
  effects: readonly (MoveEffect | AttackEffect)[],
): readonly ActivityBonusEvent[] {
  const events: ActivityBonusEvent[] = [];
  for (const effect of effects) {
    if (effect.type === "activity-bonus-claimed") {
      events.push({
        side: effect.side,
        kind: effect.kind,
        square: squareName(effect.square),
        survivorOldKind: effect.survivor.oldKind,
        survivorNewKind: effect.survivor.newKind,
        newBonusKind: effect.newBonus.kind,
      });
    }
  }
  return events;
}

interface PlayedStealActivityGame {
  readonly finalState: GameState;
  readonly openingBoard: Readonly<Record<string, GameState["nodes"][string]>>;
  readonly events: readonly StealNodeEvent[];
  readonly bonusEvents: readonly ActivityBonusEvent[];
  readonly fightCount: number;
}

/**
 * Plays a whole steal game under `planetActivity` from `seed` at
 * `lengthInRounds` using `chooseStealBonusPly`, and records the opening
 * board the seed dealt (steal.md §7, §10) before play began, every
 * `node-claimed` and `node-abandoned` event and every `activity-bonus-claimed`
 * event the game raised, in order, and how many fights happened.
 */
function playSeededStealActivityGame(
  planetActivity: "stable" | "race",
  seed: number,
  lengthInRounds: number,
): PlayedStealActivityGame {
  let state = startingGameState(seed, {
    lengthInRounds,
    combatEnabled: true,
    fleetSize: 5,
    chargedNodeCount: 5,
    scoring: "simple",
    nodePlaystyle: "steal",
    planetActivity,
  });
  const openingBoard = state.nodes;
  const events: StealNodeEvent[] = [];
  const bonusEvents: ActivityBonusEvent[] = [];
  let fightCount = 0;

  let pliesApplied = 0;
  while (!isGameOver(state)) {
    if (pliesApplied >= MAX_PLIES) {
      throw new Error(
        `seeded steal + ${planetActivity} replay game exceeded ${MAX_PLIES} plies without ending — likely a regression`,
      );
    }
    pliesApplied += 1;

    const choice = chooseStealBonusPly(state);

    if (choice === undefined) {
      const { state: nextState } = applyPassGuard(state);
      state = nextState;
      continue;
    }

    if (choice.kind === "attack") {
      const result = applyAttack(state, choice.shipId, choice.target);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal attack: ${result.reason} for ${choice.shipId} on ${squareName(choice.target)}`,
        );
      }
      state = result.state;
      for (const effect of result.effects) {
        if (effect.type === "fight-resolved") {
          fightCount += 1;
        }
      }
      events.push(...stealNodeEvents(result.effects));
      bonusEvents.push(...activityBonusEvents(result.effects));
    } else {
      const result = applyMove(state, choice.shipId, choice.destination);
      if (result.outcome !== "applied") {
        throw new Error(
          `policy chose an illegal move: ${result.reason} for ${choice.shipId} to ${squareName(choice.destination)}`,
        );
      }
      state = result.state;
      events.push(...stealNodeEvents(result.effects));
      bonusEvents.push(...activityBonusEvents(result.effects));
    }
  }

  return { finalState: state, openingBoard, events, bonusEvents, fightCount };
}

describe("a seeded steal game under planet resources replays its opening board, its claim/abandon sequence and its bonus claims exactly (steal.md §10)", () => {
  it("produces plenty of claims and bonus claims of every kind, over a two-hundred-round game — the run is not vacuous", () => {
    const { events, bonusEvents, fightCount } = playSeededStealActivityGame(
      "race",
      20260819,
      200,
    );

    const claimed = events.filter((event) => event.kind === "claimed");
    const abandoned = events.filter((event) => event.kind === "abandoned");
    const claimedKinds = new Set(bonusEvents.map((event) => event.kind));

    // At five a side this seed over two hundred rounds measures 112 claims,
    // 73 abandons, 11 fights and 20 bonus claims, touching every one of the
    // six kinds. These are this run's own numbers and move with any rule
    // that changes the course of a ply, so the floors below leave margin.
    // The run needs this many rounds because a bonus claim's own draws (a
    // survivor kind, a new bonus planet and kind) compete for the same
    // stream as the node claims and abandons a bonus-racing policy also
    // produces, so every one of the six kinds appearing takes a while.
    expect(claimed.length).toBeGreaterThanOrEqual(30);
    expect(abandoned.length).toBeGreaterThanOrEqual(20);
    expect(fightCount).toBeGreaterThanOrEqual(3);
    expect(bonusEvents.length).toBeGreaterThanOrEqual(10);
    expect(claimedKinds.size).toBe(6);
  });

  it.each(["stable", "race"] as const)(
    "replays the same opening board, the same claim/abandon sequence, the same bonus-claim sequence and the same final state from the same seed, under %s",
    (planetActivity) => {
      const first = playSeededStealActivityGame(planetActivity, 20260819, 40);
      const second = playSeededStealActivityGame(planetActivity, 20260819, 40);

      expect(first.bonusEvents.length).toBeGreaterThan(0);

      expect(second.openingBoard).toEqual(first.openingBoard);
      expect(second.events).toEqual(first.events);
      expect(second.bonusEvents).toEqual(first.bonusEvents);
      expect(second.finalState).toEqual(first.finalState);
    },
  );

  it("keeps every survivor's kind under stable, where race changes it", () => {
    const stable = playSeededStealActivityGame("stable", 20260819, 40);
    for (const event of stable.bonusEvents) {
      expect(event.survivorNewKind).toBe(event.survivorOldKind);
    }
    const race = playSeededStealActivityGame("race", 20260819, 40);
    for (const event of race.bonusEvents) {
      expect(event.survivorNewKind).not.toBe(event.survivorOldKind);
    }
  });

  it("deals a different opening board and produces a different claim/abandon sequence and a different bonus-claim sequence from a different seed", () => {
    // Any pair of distinct seeds is expected to diverge; this pair is
    // confirmed to by running this test. If a future change to the game
    // happens to make it coincide, pick another pair.
    const first = playSeededStealActivityGame("race", 20260819, 40);
    const second = playSeededStealActivityGame("race", 20260820, 40);

    expect(second.openingBoard).not.toEqual(first.openingBoard);
    expect(second.events).not.toEqual(first.events);
    expect(second.bonusEvents).not.toEqual(first.bonusEvents);
  });
});
