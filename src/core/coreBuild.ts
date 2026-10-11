// CORE_BUILD identifies which commit built this package: the 7-character
// hash the deploy also uses, so the server's compatibility check is "does
// this hash match", never a version number. `npm run build:core` substitutes
// the real hash into every reference to `__CORE_BUILD__` at bundle time
// (Vite's `define`); that substitution never runs for the test suite or the
// app's dev server, where `__CORE_BUILD__` stays an undeclared identifier
// and `CORE_BUILD` falls back to "unstamped". No file under `src/` is ever
// written to stamp this — doing so would dirty the tree the build refuses to
// run against.

declare const __CORE_BUILD__: string | undefined;

export const CORE_BUILD: string =
  typeof __CORE_BUILD__ === "string" ? __CORE_BUILD__ : "unstamped";
