#!/usr/bin/env node
// Measures replaying a full-length game through the built core (story.md
// "Replay measurement"): for each node playstyle, plays one 90-round game
// (the longest the start screen offers) with a simple deterministic policy,
// then times rebuilding it from scratch the way the server rebuilds a game
// on every ply — a fresh seededRandom from the seed, startGame, and every
// applyPly from parsed ply text. Run with `node scripts/measure-core-replay.mjs`
// against a package already built by `npm run build:core`.

import os from "node:os";
import {
  applyPly,
  formatPly,
  parsePly,
  result,
  seededRandom,
  startGame,
  toMove,
} from "../dist-core/package/index.js";

const ARTWORK = [3, 1, 14, 7, 2, 9, 5, 13, 4, 10, 6, 8];
const ROUNDS = 90;
const FLEET_SIZE = 5;
const CHARGED_NODES = 5;

const CONFIGS = [
  {
    name: "continuous",
    seed: 1_042_001,
    setup: {
      playstyle: "continuous",
      rounds: ROUNDS,
      fleetSize: FLEET_SIZE,
      chargedNodes: CHARGED_NODES,
      combat: false,
      scoring: "bonus",
      planetBonus: "three",
      planetActivity: "off",
      playerMatching: "off",
      artwork: ARTWORK,
    },
  },
  {
    name: "planet",
    seed: 1_042_002,
    setup: {
      playstyle: "planet",
      rounds: ROUNDS,
      fleetSize: FLEET_SIZE,
      chargedNodes: CHARGED_NODES,
      combat: false,
      scoring: "bonus",
      planetBonus: "three",
      planetActivity: "off",
      playerMatching: "off",
      artwork: ARTWORK,
    },
  },
  {
    name: "dedicated",
    seed: 1_042_003,
    setup: {
      playstyle: "dedicated",
      rounds: ROUNDS,
      fleetSize: FLEET_SIZE,
      chargedNodes: CHARGED_NODES,
      combat: false,
      scoring: "bonus",
      planetBonus: "three",
      planetActivity: "off",
      playerMatching: "off",
      artwork: ARTWORK,
    },
  },
  {
    name: "steal",
    seed: 1_042_004,
    setup: {
      playstyle: "steal",
      rounds: ROUNDS,
      fleetSize: FLEET_SIZE,
      chargedNodes: CHARGED_NODES,
      combat: false,
      scoring: "bonus",
      planetBonus: "off",
      planetActivity: "race",
      playerMatching: "required",
      artwork: ARTWORK,
    },
  },
];

const COLUMN_LETTERS = "ABCDEFGHIJKLMNO";

function columnIndex(column) {
  return COLUMN_LETTERS.indexOf(column);
}

function chebyshevDistance(a, b) {
  return Math.max(
    Math.abs(columnIndex(a.column) - columnIndex(b.column)),
    Math.abs(a.row - b.row),
  );
}

/**
 * Every square on the board other than `origin`, nearest first. A move's
 * reach never exceeds 3 squares (rules.md §6), so trying the nearest
 * squares first finds a legal move in very few attempts almost every time;
 * the full board is still scanned as a fallback since `applyPly` is the
 * only source of truth for what is legal, never this script's own guess.
 * Cached per square name, since the same origin recurs across a game.
 */
const candidateCache = new Map();
function candidateSquares(origin) {
  const key = `${origin.column}${origin.row}`;
  const cached = candidateCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const squares = [];
  for (let row = 1; row <= 15; row++) {
    for (const column of COLUMN_LETTERS) {
      if (column === origin.column && row === origin.row) {
        continue;
      }
      squares.push({ column, row });
    }
  }
  squares.sort(
    (a, b) => chebyshevDistance(origin, a) - chebyshevDistance(origin, b),
  );
  candidateCache.set(key, squares);
  return squares;
}

/**
 * Plays one full-length game with a simple deterministic policy: the side
 * to move tries its ships in state order, and for each, the nearest
 * destination squares first, applying the first move `applyPly` accepts.
 * Combat is off in every config, so a legal move is guaranteed to exist
 * whenever it is a side's turn — a refused attempt draws nothing and
 * leaves the shared random source untouched (story.md's own guarantee),
 * so trying candidates this way costs nothing but time. Returns the ply
 * texts played, in order, and the draws the whole game made.
 */
function playGame(setup, seed) {
  const random = seededRandom(seed);
  let state = startGame(setup, random).state;
  const plyTexts = [];

  for (;;) {
    const toMoveInfo = toMove(state);
    if (toMoveInfo === null) {
      break;
    }
    const { side, plyNumber } = toMoveInfo;
    const ships = state.ships.filter((ship) => ship.side === side);

    let applied = null;
    for (const ship of ships) {
      for (const destination of candidateSquares(ship.square)) {
        const ply = { type: "move", from: ship.square, to: destination };
        const attempt = applyPly(state, plyNumber, ply, random);
        if (attempt.outcome === "applied") {
          applied = { ply, attempt };
          break;
        }
      }
      if (applied !== null) {
        break;
      }
    }

    if (applied === null) {
      throw new Error(
        `no legal move found for ${side} at ply ${plyNumber} (setup ${setup.playstyle})`,
      );
    }

    plyTexts.push(formatPly(plyNumber, applied.ply));
    state = applied.attempt.state;
  }

  return { plyTexts, draws: random.draws().length, finalState: state };
}

/**
 * Rebuilds a game from its seed and ply texts the way the server does on
 * every ply: a fresh `seededRandom`, `startGame`, then `applyPly` from
 * `parsePly`'d text for every ply played.
 */
function rebuildGame(setup, seed, plyTexts) {
  const random = seededRandom(seed);
  let state = startGame(setup, random).state;
  for (const text of plyTexts) {
    const parsed = parsePly(text);
    const applied = applyPly(state, parsed.plyNumber, parsed.ply, random);
    state = applied.state;
  }
  return state;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

const WARMUP_REPETITIONS = 5;
const TIMED_REPETITIONS = 30;

function timeRebuild(setup, seed, plyTexts) {
  for (let i = 0; i < WARMUP_REPETITIONS; i++) {
    rebuildGame(setup, seed, plyTexts);
  }
  const durationsMs = [];
  for (let i = 0; i < TIMED_REPETITIONS; i++) {
    const start = process.hrtime.bigint();
    rebuildGame(setup, seed, plyTexts);
    const end = process.hrtime.bigint();
    durationsMs.push(Number(end - start) / 1_000_000);
  }
  return {
    medianMs: median(durationsMs),
    worstMs: Math.max(...durationsMs),
  };
}

function main() {
  console.log(`Node ${process.version}`);
  console.log(`CPU: ${os.cpus()[0]?.model ?? "unknown"}`);
  console.log("");

  for (const config of CONFIGS) {
    const { plyTexts, draws, finalState } = playGame(config.setup, config.seed);
    if (result(finalState) === null) {
      throw new Error(`${config.name} did not reach game over`);
    }

    const rebuilt = rebuildGame(config.setup, config.seed, plyTexts);
    if (result(rebuilt) === null) {
      throw new Error(`${config.name}'s rebuild did not reach game over`);
    }

    const { medianMs, worstMs } = timeRebuild(
      config.setup,
      config.seed,
      plyTexts,
    );

    console.log(
      `${config.name}: ${plyTexts.length} plies, ${draws} draws — ` +
        `median ${medianMs.toFixed(3)} ms, worst ${worstMs.toFixed(3)} ms ` +
        `(${TIMED_REPETITIONS} repetitions after ${WARMUP_REPETITIONS} warm-up)`,
    );
  }
}

main();
