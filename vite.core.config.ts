import { defineConfig } from "vite";

// Bundles src/core/index.ts into the one ES module the core package ships
// (story.md "Packaging"): no React plugin, ES format only, unminified, so
// the published source stays readable, and CORE_BUILD_HASH substituted for
// every reference to __CORE_BUILD__ - set by scripts/build-core.mjs to the
// commit the package is built from, left unset everywhere else, where
// src/core/coreBuild.ts falls back to "unstamped". The entry is given as a
// plain string, relative to Vite's root (the repository root, since
// scripts/build-core.mjs invokes this from there), so resolving it needs no
// Node path module.
export default defineConfig({
  define: {
    __CORE_BUILD__: JSON.stringify(process.env.CORE_BUILD_HASH ?? "unstamped"),
  },
  build: {
    outDir: "dist-core/package",
    // The declarations already emitted into dist-core/package/types/ by
    // the build script must survive this step.
    emptyOutDir: false,
    target: "es2022",
    minify: false,
    lib: {
      entry: "src/core/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
  },
});
