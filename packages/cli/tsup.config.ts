
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
  noExternal: [
    "ora",
    "chalk",
    "boxen",
    "cli-table3",
    "@wren/core",
    "@wren/shared-types",
  ],
});