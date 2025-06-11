import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  platform: "browser",
  format: ["esm"],
  target: "es2022",
  bundle: true,
  splitting: false,
  sourcemap: true,
  dts: true,
  clean: true,
  treeshake: true,
  outDir: "./dist",
  esbuildOptions(options) {
    options.mainFields = ["browser", "module", "main"];
  },
});
