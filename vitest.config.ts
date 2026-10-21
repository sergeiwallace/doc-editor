import { defineConfig } from "vitest/config";

// Vitest runs the repository-level checks in test/*.spec.ts under Node. The mod's own tests,
// plugins/*/**/*.test.ts, run under `claude plugin test`, which `npm test` runs next.
export default defineConfig({
  test: {
    include: ["test/**/*.spec.ts"],
  },
});
