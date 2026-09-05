import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { executeScanFunction } from "../../../inngest/functions/execute-scan";
import { executeRemediationFunction } from "../../../inngest/functions/execute-remediation";
import { executeRuntimeAuditFunction } from "../../../inngest/functions/execute-runtime-audit";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeScanFunction,
    executeRemediationFunction,
    executeRuntimeAuditFunction,
  ],
});

