"use client";

import * as React from "react";

const GLYPHS = "!<>/[]{}*#_@%&+=~^?0123456789";

export function ScrambleText({
  text,
  className = "",
  hoverTrigger = true,
}: {
  text: string;
  className?: string;
  hoverTrigger?: boolean;
}) {
  const [displayText, setDisplayText] = React.useState(text);
  const [isScrambling, setIsScrambling] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const startScramble = React.useCallback(() => {
    if (isScrambling) return;
    setIsScrambling(true);

    let iteration = 0;
    const maxIterations = text.length;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration) {
              return text[index];
            }
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("")
      );

      if (iteration >= maxIterations) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text);
        setIsScrambling(false);
      }

      iteration += 1 / 3;
    }, 30);
  }, [text, isScrambling]);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <span
      onMouseEnter={hoverTrigger ? startScramble : undefined}
      className={`inline-block cursor-default select-none font-mono transition-colors duration-200 ${
        isScrambling
          ? "text-sky-600 drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]"
          : ""
      } ${className}`}
    >
      {displayText}
    </span>
  );
}

export function ScrambleWord({
  word,
  className = "",
}: {
  word: string;
  className?: string;
}) {
  const [displayWord, setDisplayWord] = React.useState(word);
  const [isScrambling, setIsScrambling] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const scramble = React.useCallback(() => {
    setIsScrambling(true);

    let step = 0;
    const totalSteps = word.length;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayWord(
        word
          .split("")
          .map((letter, idx) => {
            if (idx < step) return word[idx];
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("")
      );

      if (step >= totalSteps) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayWord(word);
        setIsScrambling(false);
      }

      step += 1 / 2;
    }, 35);
  }, [word]);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <span
      onMouseEnter={scramble}
      className={`demo-title-word inline-block cursor-pointer select-none transition-all duration-200 ${
        isScrambling
          ? "text-sky-600 scale-110 font-mono drop-shadow-[0_0_14px_rgba(56,189,248,0.8)]"
          : ""
      } ${className}`}
    >
      {displayWord}
    </span>
  );
}
