import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config([
  // Build output, and the machine-local scratchpad. Neither is tracked, but
  // eslint walks dot-directories, so without this it lints the read-only
  // snapshot of another project sitting in `.local/reference/`.
  globalIgnores(["dist", "dist-core", ".local"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
      // Last, so it disables any stylistic rules that would fight prettier.
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // This app is front-end only (no backend, static hosting - see
      // CLAUDE.md). `@types/node` is a dev dependency and `tsconfig.app.json`
      // has no `types` restriction, so a `node:*` import would typecheck from
      // anywhere in `src`. This rule is the actual guard: `node:*` imports are
      // banned everywhere except test files, where reading fixtures off disk
      // is legitimate.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*"],
              message:
                "This app is front-end only - Node built-ins may only be imported from test files.",
            },
          ],
        },
      ],
      // Game randomness must come from the seeded generator in the rules
      // layer, never from `Math.random` - recorded games have to replay
      // exactly. See doc/ruleset/rules.md.
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message:
            "Use the seeded random source in the rules layer - recorded games must replay exactly.",
        },
      ],
    },
  },
  {
    // Accessibility linting for JSX markup only. Kept as its own block,
    // scoped to `**/*.tsx`, rather than folded into the `**/*.{ts,tsx}`
    // block's `extends` above, so it never applies to plain `.ts` files.
    files: ["**/*.tsx"],
    extends: [jsxA11y.flatConfigs.recommended],
  },
  {
    // The core's boundary (story.md "The core's entry point"): src/core and
    // src/rules only ever import from each other, never anything
    // screen-related. This replaces the base block's `no-restricted-imports`
    // entirely rather than adding to it, so the `node:*` pattern is restated
    // here too.
    files: ["src/core/**/*.ts", "src/rules/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["node:*"],
              message:
                "The core runs in a browser too - Node built-ins may only be imported from test files.",
            },
            {
              // Every other top-level folder and file under src/, named
              // explicitly rather than as "everything but core and rules":
              // gitignore-style negation cannot re-include a path once a
              // broader pattern has excluded its parent, so an "allow-list"
              // written as negation does not work here.
              group: [
                "../board/**",
                "../bonus/**",
                "../clock/**",
                "../game/**",
                "../guide/**",
                "../hud/**",
                "../nav/**",
                "../ships/**",
                "../spelling/**",
                "../start/**",
                "../App",
                "../useAppScreen",
                "../gameName",
                "../main",
              ],
              message:
                "src/core and src/rules only import from each other - nothing screen-related may reach in.",
            },
          ],
          paths: [
            {
              name: "react",
              message:
                "src/core and src/rules have no screen and no dependencies.",
            },
            {
              name: "react-dom",
              message:
                "src/core and src/rules have no screen and no dependencies.",
            },
          ],
        },
      ],
    },
  },
  {
    // The build and packaging scripts (story.md "Packaging"): plain Node
    // ES modules, run directly by `node`, never bundled or type-checked as
    // part of `src`.
    files: ["scripts/**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);
