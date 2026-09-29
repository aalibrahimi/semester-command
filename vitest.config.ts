import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests for the pure logic the study features and course pages rest on:
// drill generators, answer grading, assignment sorting. Tests run in Node
// (no DOM needed) in the Pacific time zone, because date bugs only show up
// in a zone with daylight saving time.
process.env.TZ = "America/Los_Angeles";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
