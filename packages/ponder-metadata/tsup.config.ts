import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  platform: "node",
  format: ["esm"],
  target: "node16",
  bundle: true,
  splitting: false,
  sourcemap: true,
  dts: true,
  clean: true,
  treeshake: true,
  outDir: "./dist",
});
