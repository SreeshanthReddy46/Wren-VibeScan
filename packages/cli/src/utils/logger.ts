import pc from "picocolors";

export const logger = {
  info: (msg: string) => console.log(pc.cyan("ℹ ") + msg),
  success: (msg: string) => console.log(pc.green("✔ ") + msg),
  warn: (msg: string) => console.warn(pc.yellow("⚠ ") + msg),
  error: (msg: string) => console.error(pc.red("✖ ") + msg),
  bold: (msg: string) => pc.bold(msg),
  dim: (msg: string) => pc.dim(msg),
};
