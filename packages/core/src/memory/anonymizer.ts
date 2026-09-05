export interface SanitizedPattern {
  sanitizedSnippet: string;
  sanitizedRationale: string;
}

/**
 * Sanitizes code snippets and rationales before persisting to the cross-user
 * global pattern library (is_global = true). Strips proprietary secrets,
 * tokens, emails, IPs, and internal absolute paths.
 */
export function sanitizePatternForGlobalMemory(
  snippet: string,
  rationale: string = ""
): SanitizedPattern {
  function scrub(text: string): string {
    if (!text) return "";

    let result = text;

    // 1. Scrub common API key and secret formats
    result = result.replace(/sk_live_[a-zA-Z0-9_]+/g, "<REDACTED_SECRET>");
    result = result.replace(/sk_test_[a-zA-Z0-9_]+/g, "<REDACTED_SECRET>");
    result = result.replace(/ghp_[a-zA-Z0-9_]+/g, "<REDACTED_SECRET>");
    result = result.replace(/sbp_[a-zA-Z0-9_]+/g, "<REDACTED_SECRET>");
    result = result.replace(/eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+/g, "<REDACTED_TOKEN>");

    // 2. Scrub emails
    result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "<USER_EMAIL>");

    // 3. Scrub IPv4 addresses (excluding 127.0.0.1 and 0.0.0.0)
    result = result.replace(
      /\b(?!127\.0\.0\.1|0\.0\.0\.0)(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      "<IP_ADDR>"
    );

    // 4. Scrub absolute filesystem paths
    // Windows paths: C:\Users\... or D:\...
    result = result.replace(/[a-zA-Z]:\\(?:Users|Documents and Settings|home)[^\s"';,)\]]+/gi, "<LOCAL_PATH>");
    // Unix paths: /Users/... or /home/...
    result = result.replace(/\/(?:Users|home|private|tmp)[^\s"';,)\]]+/g, "<LOCAL_PATH>");

    return result;
  }

  return {
    sanitizedSnippet: scrub(snippet),
    sanitizedRationale: scrub(rationale),
  };
}
