// packages/cli/tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["cjs"], // or ["esm"]
  dts: true,
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  noExternal: ["@wren/core", "@wren/shared-types"], // inlines internal workspace code
});