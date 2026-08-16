import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    // Listen beyond localhost so the dev server is reachable from the host
    // browser when running inside the dev container.
    host: true,
    // Not Vite's default 5173, which is in use by another project on this
    // developer's host. strictPort makes a clash fail loudly rather than
    // silently drifting to another port, which would leave the container's
    // forwarded port pointing at nothing.
    port: 5273,
    strictPort: true,
  },
  test: {
    // Tests live beside the code they cover, so the suite is exactly the
    // tests under `src` - matching tsconfig.app.json's `include`. Without
    // this, vitest also collects the other project's tests out of the
    // machine-local snapshot in `.local/reference/`.
    include: ["src/**/*.test.{ts,tsx}"],
    // Most tests are pure logic and need no DOM. Component tests opt in
    // per-file with a `// @vitest-environment jsdom` docblock at the top of
    // the file; see CONTRIBUTING.md.
    environment: "node",
  },
});
