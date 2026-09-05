export interface EmbeddingOptions {
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  timeoutMs?: number;
  client?: {
    embeddings: {
      create: (params: { model: string; input: string }) => Promise<{
        data: Array<{ embedding: number[] }>;
      }>;
    };
  };
}

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_TIMEOUT_MS = 2500;

/**
 * Generates vector embeddings for a code snippet using OpenAI text-embedding-3-small (1536 dims).
 * Implements a strict circuit breaker: if no API key is set, or if the request times out
 * or fails, it returns null without throwing or interrupting the scan.
 */
export async function generateCodeEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<number[] | null> {
  if (!text || !text.trim()) {
    return null;
  }

  // 1. If mock/injected client provided (e.g. for unit testing or custom wrappers)
  if (options.client) {
    try {
      const response = await options.client.embeddings.create({
        model: options.model || DEFAULT_EMBEDDING_MODEL,
        input: text,
      });
      return response.data?.[0]?.embedding || null;
    } catch {
      return null;
    }
  }

  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Circuit breaker: unconfigured embedding API
    return null;
  }

  const apiUrl = options.apiUrl || "https://api.openai.com/v1/embeddings";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || DEFAULT_EMBEDDING_MODEL,
        input: text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const json: any = await response.json();
    return json.data?.[0]?.embedding || null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
