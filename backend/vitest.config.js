import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["pruebas/**/*.test.js"],
    setupFiles: ["pruebas/preparar.js"],
    // Las pruebas comparten la base local: se ejecutan en serie.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
