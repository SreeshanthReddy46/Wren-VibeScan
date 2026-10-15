import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import type { Finding } from "@wren/shared-types";
import { Header } from "./components/Header";
import { FindingsList } from "./components/FindingsList";
import { FindingDetail } from "./components/FindingDetail";
import { StatusBar } from "./components/StatusBar";
import { sortFindingsBySeverity } from "./model";
import { appendIgnoreRule } from "./ignore-handler";

export interface AppProps {
  targetPath: string;
  initialFindings: Finding[];
  onExit: (exitCode: number) => void;
}

export function App({ targetPath, initialFindings, onExit }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [findings, setFindings] = useState<Finding[]>(() => sortFindingsBySeverity(initialFindings));
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"overview" | "fix">("overview");
  const [ignoreActive, setIgnoreActive] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [windowOffset, setWindowOffset] = useState<number>(0);

  const maxVisible = 10;
  const currentFinding = findings[selectedIndex] || null;

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useInput((input, key) => {
    if (ignoreActive) {
      if (input === "s") {
        if (currentFinding) {
          const updated = findings.filter((_, i) => i !== selectedIndex);
          setFindings(updated);
          if (selectedIndex >= updated.length && updated.length > 0) {
            setSelectedIndex(updated.length - 1);
          }
          setFeedback(`Ignored for session: ${currentFinding.title}`);
        }
        setIgnoreActive(false);
      } else if (input === "p") {
        if (currentFinding) {
          appendIgnoreRule(targetPath, currentFinding.location.filePath, currentFinding.ruleId);
          const updated = findings.filter((_, i) => i !== selectedIndex);
          setFindings(updated);
          if (selectedIndex >= updated.length && updated.length > 0) {
            setSelectedIndex(updated.length - 1);
          }
          setFeedback(`Saved to .wrenignore: ${currentFinding.title}`);
        }
        setIgnoreActive(false);
      } else if (key.escape) {
        setIgnoreActive(false);
      }
      return;
    }

    if (key.upArrow || input === "k") {
      if (selectedIndex > 0) {
        const nextIndex = selectedIndex - 1;
        setSelectedIndex(nextIndex);
        if (nextIndex < windowOffset) {
          setWindowOffset(nextIndex);
        }
      }
    } else if (key.downArrow || input === "j") {
      if (selectedIndex < findings.length - 1) {
        const nextIndex = selectedIndex + 1;
        setSelectedIndex(nextIndex);
        if (nextIndex >= windowOffset + maxVisible) {
          setWindowOffset(nextIndex - maxVisible + 1);
        }
      }
    } else if (input === "e") {
      setActiveTab("overview");
    } else if (input === "f") {
      setActiveTab("fix");
    } else if (input === "i") {
      if (findings.length > 0) {
        setIgnoreActive(true);
      }
    } else if (input === "q" || (key.ctrl && input === "c")) {
      const hasCritical = findings.some((f) => f.severity === "critical");
      const exitCode = hasCritical ? 1 : 0;
      exit();
      onExit(exitCode);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header findings={findings} targetPath={targetPath} />
      <Box flexDirection="row" flexGrow={1}>
        <FindingsList
          findings={findings}
          selectedIndex={selectedIndex}
          windowOffset={windowOffset}
          maxVisible={maxVisible}
        />
        <FindingDetail finding={currentFinding} activeTab={activeTab} />
      </Box>
      <StatusBar ignoreActive={ignoreActive} feedback={feedback} />
    </Box>
  );
}
