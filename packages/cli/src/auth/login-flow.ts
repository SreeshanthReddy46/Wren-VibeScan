import { saveUserConfig } from "./token-storage";
import { logger } from "../utils/logger";
import pc from "picocolors";
import * as readline from "readline";

export async function runLoginFlow(providedToken?: string): Promise<void> {
  if (providedToken) {
    saveUserConfig({ apiKey: providedToken });
    logger.success("API key stored securely in ~/.wren/config.json");
    return;
  }

  console.log(pc.bold("\n🦅 Wren Cloud Authentication"));
  console.log("To connect your local CLI to the Wren dashboard:");
  console.log(`1. Visit: ${pc.cyan("https://wren.dev/settings/api-keys")} (or your local dashboard)`);
  console.log("2. Copy your Wren API token and paste it below.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(pc.bold("Paste your Wren API Token: "), (token) => {
      rl.close();
      const cleaned = token.trim();
      if (!cleaned) {
        logger.error("No token provided. Login cancelled.");
        resolve();
        return;
      }
      saveUserConfig({ apiKey: cleaned });
      logger.success("Authentication successful! CLI connected to Wren Cloud.");
      resolve();
    });
  });
}
