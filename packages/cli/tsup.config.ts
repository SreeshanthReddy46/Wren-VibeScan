
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts", "src/index.ts"],
  format: ["cjs"],
  dts: true,
  clean: true,
  banner: ({ format }) => {
    if (format === "cjs") {
      return {
        js: "#!/usr/bin/env node",
      };
    }
  },
  noExternal: ["@wren/core", "@wren/shared-types"],
});