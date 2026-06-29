import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["test/**/*.test.js"],
  },
  resolve: {
    alias: {
      "@bar": path.resolve(__dirname, "src/public/js/bar"),
      "@public": path.resolve(__dirname, "src/public/js"),
    },
  },
});
