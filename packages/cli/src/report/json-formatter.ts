import type { ScanResult } from "@wren/shared-types";

export function formatJsonReport(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}
