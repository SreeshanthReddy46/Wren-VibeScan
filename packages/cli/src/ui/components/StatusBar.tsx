import React from "react";
import { Box, Text } from "ink";

export interface StatusBarProps {
  ignoreActive: boolean;
  feedback: string | null;
}

export function StatusBar({ ignoreActive, feedback }: StatusBarProps): React.ReactElement {
  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
      marginTop={1}
    >
      {ignoreActive ? (
        <Box>
          <Text bold color="yellow">
            Ignore finding?{" "}
          </Text>
          <Text bold color="green">
            [s] Session only
          </Text>
          <Text> · </Text>
          <Text bold color="cyan">
            [p] Persist to .wrenignore
          </Text>
          <Text> · </Text>
          <Text color="gray">
            [Esc] Cancel
          </Text>
        </Box>
      ) : (
        <Box>
          <Text dimColor>[↑/↓] Navigate</Text>
          <Text dimColor> · </Text>
          <Text dimColor>[e] Explain</Text>
          <Text dimColor> · </Text>
          <Text dimColor>[f] Fix</Text>
          <Text dimColor> · </Text>
          <Text dimColor>[i] Ignore</Text>
          <Text dimColor> · </Text>
          <Text dimColor>[q] Quit</Text>
        </Box>
      )}

      {feedback ? (
        <Box>
          <Text bold color="green">
            {feedback}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
