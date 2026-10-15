import React from "react";
import { Box, Text } from "ink";
import type { Finding } from "@wren/shared-types";

export interface FindingDetailProps {
  finding: Finding | null;
  activeTab: "overview" | "fix";
}

export function FindingDetail({ finding, activeTab }: FindingDetailProps): React.ReactElement {
  if (!finding) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        padding={1}
        width="55%"
      >
        <Text dimColor>No finding selected.</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      padding={1}
      width="55%"
    >
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="cyan">
          {finding.ruleId}
          {finding.cwe ? ` (${finding.cwe})` : ""}
        </Text>
        <Box>
          <Text bold color={activeTab === "overview" ? "green" : "gray"}>
            [e] Overview
          </Text>
          <Text> </Text>
          <Text bold color={activeTab === "fix" ? "green" : "gray"}>
            [f] Fix Preview
          </Text>
        </Box>
      </Box>

      <Box marginBottom={1}>
        <Text bold>{finding.title}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>File: </Text>
        <Text underline>
          {finding.location.filePath}:{finding.location.startLine}
        </Text>
      </Box>

      {finding.location.snippet ? (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          marginBottom={1}
        >
          <Text dimColor>Code Context:</Text>
          <Text color="red">
            {finding.location.startLine} | {finding.location.snippet}
          </Text>
        </Box>
      ) : null}

      {activeTab === "overview" ? (
        <Box flexDirection="column">
          <Text bold color="yellow">
            Explanation & Impact:
          </Text>
          <Text>{finding.plainEnglishExplanation}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text bold color="green">
            Suggested Remediation:
          </Text>
          {finding.fix ? (
            <Box flexDirection="column" marginTop={1}>
              <Text italic>{finding.fix.description}</Text>
              {finding.fix.diff ? (
                <Box flexDirection="column" marginTop={1} paddingX={1} borderStyle="single" borderColor="gray">
                  {finding.fix.diff.split("\n").map((line, i) => {
                    const isAdd = line.startsWith("+");
                    const isDel = line.startsWith("-");
                    return (
                      <Text
                        key={i}
                        color={isAdd ? "green" : isDel ? "red" : undefined}
                      >
                        {line}
                      </Text>
                    );
                  })}
                </Box>
              ) : null}
            </Box>
          ) : (
            <Text dimColor>No automated fix patch available for this rule.</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
