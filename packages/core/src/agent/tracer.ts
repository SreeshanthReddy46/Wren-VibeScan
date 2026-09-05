import * as fs from "fs";
import * as path from "path";
import type { AgentTraceRecord, AgentTraceStep, CriticRubric } from "@wren/shared-types";

export interface AgentSpan {
  id: string;
  step: AgentTraceStep;
  findingId?: string;
  input: Record<string, unknown> | string;
  startTime: number;
}

export class AgentTracer {
  private traces: AgentTraceRecord[] = [];
  public readonly scanId: string;

  constructor(scanId: string) {
    this.scanId = scanId;
  }

  public startSpan(
    step: AgentTraceStep,
    findingId?: string,
    input: Record<string, unknown> | string = {}
  ): AgentSpan {
    return {
      id: `span-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      step,
      findingId,
      input,
      startTime: Date.now(),
    };
  }

  public finishSpan(
    span: AgentSpan,
    output: Record<string, unknown> | string,
    reasoning: string = "",
    confidenceScore?: number,
    rubric?: CriticRubric
  ): AgentTraceRecord {
    const durationMs = Math.max(0, Date.now() - span.startTime);
    const record: AgentTraceRecord = {
      id: span.id,
      scanId: this.scanId,
      findingId: span.findingId,
      step: span.step,
      input: span.input,
      output,
      reasoning,
      confidenceScore,
      rubric,
      durationMs,
      timestamp: new Date().toISOString(),
    };

    this.traces.push(record);
    return record;
  }

  public getTraces(): AgentTraceRecord[] {
    return [...this.traces];
  }

  public flushToDisk(targetPath: string = "."): string {
    const tracesDir = path.resolve(targetPath, ".wren", "traces");
    fs.mkdirSync(tracesDir, { recursive: true });

    const traceFilePath = path.join(tracesDir, `${this.scanId}.json`);
    const payload = {
      scanId: this.scanId,
      exportedAt: new Date().toISOString(),
      traces: this.traces,
    };

    fs.writeFileSync(traceFilePath, JSON.stringify(payload, null, 2), "utf-8");
    return traceFilePath;
  }
}
