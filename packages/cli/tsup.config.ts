import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts", "src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  outExtension: () => ({ js: ".js" }),
  banner: {
    js: `#!/usr/bin/env node\nimport { createRequire as __wrenCreateRequire } from "node:module";\nimport { fileURLToPath as __wrenFileURLToPath } from "node:url";\nimport { dirname as __wrenDirname } from "node:path";\nconst require = __wrenCreateRequire(import.meta.url);\nconst __filename = __wrenFileURLToPath(import.meta.url);\nconst __dirname = __wrenDirname(__filename);`,
  },
  noExternal: [
    "@wren/core",
    "@wren/shared-types",
  ],
});