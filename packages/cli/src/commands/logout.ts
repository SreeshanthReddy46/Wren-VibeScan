import { clearUserConfig } from "../auth/token-storage";
import { logger } from "../utils/logger";

export function runLogoutCommand(): void {
  clearUserConfig();
  logger.success("Logged out successfully. Removed stored credentials from ~/.wren/config.json");
}
