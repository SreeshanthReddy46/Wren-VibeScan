import * as fs from "fs";
import * as path from "path";

export function appendIgnoreRule(targetDir: string, filePath: string, ruleId: string): void {
  const ignoreFilePath = path.join(targetDir, ".wrenignore");
  const normalizedPath = filePath.replace(/\\/g, "/");
  const lineToAppend = `${normalizedPath}\n`;

  if (fs.existsSync(ignoreFilePath)) {
    const existing = fs.readFileSync(ignoreFilePath, "utf8");
    if (!existing.includes(normalizedPath)) {
      fs.appendFileSync(ignoreFilePath, lineToAppend, "utf8");
    }
  } else {
    fs.writeFileSync(ignoreFilePath, lineToAppend, "utf8");
  }
}
