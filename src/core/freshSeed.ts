// Where the app's opening random seed comes from. Deliberately outside
// `src/rules/`: the rules layer is a pure function of the state it is
// given, and nothing under it may import this — a future engine, a replay,
// or a test must be able to drive it deterministically instead. Lives in
// the core, rather than the app, so the server can draw a fresh seed the
// same way the app does.

/**
 * The slice of `globalThis` this needs — a `crypto.getRandomValues`,
 * present in both a browser and Node 22 — reached through a narrow typed
 * view rather than the DOM or Node type libraries, neither of which the
 * core's own build configuration carries.
 */
interface CryptoGlobal {
  readonly crypto: {
    getRandomValues<T extends ArrayBufferView>(array: T): T;
  };
}

/**
 * A fresh 32-bit unsigned seed for `startGame`, drawn from the platform's
 * `crypto` source. `Math.random` is banned by lint precisely so this
 * decision — where the game's one seed of randomness comes from — is made
 * once, deliberately, here.
 */
export function freshSeed(): number {
  const { crypto } = globalThis as unknown as CryptoGlobal;
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return bytes[0];
}
