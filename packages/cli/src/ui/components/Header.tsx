import React from "react";
import { Box, Text } from "ink";
import type { Finding } from "@wren/shared-types";

export interface HeaderProps {
  findings: Finding[];
  targetPath: string;
}

export function Header({ findings, targetPath }: HeaderProps): React.ReactElement {
  const critical = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  const medium = findings.filter((f) => f.severity === "medium").length;
  const low = findings.filter((f) => f.severity === "low").length;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      marginBottom={1}
    >
      <Box justifyContent="space-between">
        <Text bold color="cyan">
          🦅 Wren Security — Interactive Dashboard
        </Text>
        <Text dimColor>Target: {targetPath}</Text>
      </Box>
      <Box marginTop={0}>
        <Text>
          Total: <Text bold>{findings.length}</Text> issues ·{" "}
          <Text color="red" bold>
            {critical} Critical
          </Text>{" "}
          ·{" "}
          <Text color="yellow">
            {high} High
          </Text>{" "}
          ·{" "}
          <Text color="blue">
            {medium} Medium
          </Text>{" "}
          ·{" "}
          <Text color="gray">
            {low} Low
          </Text>
        </Text>
      </Box>
    </Box>
  );
}
