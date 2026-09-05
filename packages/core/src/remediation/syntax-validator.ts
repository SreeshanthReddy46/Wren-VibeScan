import ts from "typescript";

export interface SyntaxValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateCodeSyntax(
  code: string,
  filePath: string = "file.tsx"
): SyntaxValidationResult {
  try {
    const isJsx =
      filePath.endsWith(".tsx") ||
      filePath.endsWith(".jsx") ||
      filePath.endsWith(".js");
    const scriptKind = isJsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;

    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
       true,
      scriptKind
    );

    const diagnostics = (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] })
      .parseDiagnostics;

    if (diagnostics && diagnostics.length > 0) {
      const firstError = diagnostics[0];
      const message =
        typeof firstError.messageText === "string"
          ? firstError.messageText
          : firstError.messageText.messageText;
      return {
        isValid: false,
        error: `Syntax error at character ${firstError.start}: ${message}`,
      };
    }

    return { isValid: true };
  } catch (err) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
