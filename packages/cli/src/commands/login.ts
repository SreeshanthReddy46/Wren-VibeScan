import { runLoginFlow } from "../auth/login-flow";

export async function runLoginCommand(token?: string): Promise<void> {
  await runLoginFlow(token);
}
