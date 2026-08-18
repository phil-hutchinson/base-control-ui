// Where the app's opening random seed comes from. Deliberately outside
// `src/rules/`: the rules layer is a pure function of the state it is
// given, and nothing under it may import this — a future engine, a replay,
// or a test must be able to drive it deterministically instead.

/**
 * A fresh 32-bit unsigned seed for `startingGameState`, drawn from the
 * platform's `crypto` source. `Math.random` is banned by lint precisely so
 * this decision — where the game's one seed of randomness comes from — is
 * made once, deliberately, here.
 */
export function freshSeed(): number {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return bytes[0];
}
