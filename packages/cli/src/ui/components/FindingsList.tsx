import React from "react";
import { Box, Text } from "ink";
import type { Finding, Severity } from "@wren/shared-types";

export interface FindingsListProps {
  findings: Finding[];
  selectedIndex: number;
  windowOffset: number;
  maxVisible?: number;
}

function getBadgeColor(severity: Severity): string {
  switch (severity) {
    case "critical":
      return "red";
    case "high":
      return "yellow";
    case "medium":
      return "blue";
    case "low":
      return "gray";
    default:
      return "white";
  }
}

export function FindingsList({
  findings,
  selectedIndex,
  windowOffset,
  maxVisible = 12,
}: FindingsListProps): React.ReactElement {
  const visibleFindings = findings.slice(windowOffset, windowOffset + maxVisible);

  if (findings.length === 0) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="green"
        padding={1}
        width="45%"
      >
        <Text color="green" bold>
          ✔ No vulnerabilities detected!
        </Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      padding={1}
      width="45%"
    >
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold underline>
          FINDINGS ({selectedIndex + 1}/{findings.length})
        </Text>
      </Box>

      {visibleFindings.map((finding, idx) => {
        const actualIndex = windowOffset + idx;
        const isSelected = actualIndex === selectedIndex;
        const badgeColor = getBadgeColor(finding.severity);

        return (
          <Box key={`${finding.ruleId}-${finding.location.filePath}-${finding.location.startLine}-${idx}`} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color="cyan">{isSelected ? "▶ " : "  "}</Text>
              <Text bold color={badgeColor}>
                [{finding.severity.toUpperCase()}]
              </Text>
              <Text> </Text>
              <Text bold={isSelected} wrap="truncate-end">
                {finding.title}
              </Text>
            </Box>
            <Box paddingLeft={4}>
              <Text dimColor>
                {finding.location.filePath}:{finding.location.startLine}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
