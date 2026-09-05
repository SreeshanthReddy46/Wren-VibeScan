import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { executeScanFunction } from "../../../inngest/functions/execute-scan";
import { executeRemediationFunction } from "../../../inngest/functions/execute-remediation";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [executeScanFunction, executeRemediationFunction],
});
