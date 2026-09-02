import type { ScanResult, Severity } from "@wren/shared-types";

function mapSeverityToSarifLevel(severity: Severity): "error" | "warning" | "note" {
  switch (severity) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warning";
    default:
      return "note";
  }
}

export function formatSarifReport(result: ScanResult): string {
  const sarif = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "Wren",
            semanticVersion: result.engineVersion,
            informationUri: "https://wren.dev",
            rules: Array.from(new Set(result.findings.map((f) => f.ruleId))).map((ruleId) => {
              const sample = result.findings.find((f) => f.ruleId === ruleId)!;
              return {
                id: ruleId,
                name: sample.title,
                shortDescription: { text: sample.title },
                fullDescription: { text: sample.plainEnglishExplanation },
                help: { text: sample.fix?.description || sample.message },
                properties: {
                  tags: ["security", sample.category],
                  precision: "high",
                },
              };
            }),
          },
        },
        results: result.findings.map((f) => ({
          ruleId: f.ruleId,
          level: mapSeverityToSarifLevel(f.severity),
          message: {
            text: `${f.title}: ${f.message}`,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: {
                  uri: f.location.filePath,
                  uriBaseId: "%SRCROOT%",
                },
                region: {
                  startLine: f.location.startLine,
                  startColumn: f.location.startColumn || 1,
                  endLine: f.location.endLine,
                  endColumn: f.location.endColumn,
                  snippet: f.location.snippet ? { text: f.location.snippet } : undefined,
                },
              },
            },
          ],
        })),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
