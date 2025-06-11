import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/ponder.schema.ts"],
  platform: "neutral",
  format: ["esm"],
  target: "es2022",
  bundle: true,
  splitting: false,
  sourcemap: true,
  dts: false,
  clean: true,
  treeshake: true,
  outDir: "./dist",
});
