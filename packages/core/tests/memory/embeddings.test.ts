import test from "node:test";
import assert from "node:assert/strict";
import { generateCodeEmbedding } from "../../dist/index.js";

test("generateCodeEmbedding returns null gracefully when no API key is provided", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const result = await generateCodeEmbedding("const a = 1;");
  assert.equal(result, null);

  if (originalKey) process.env.OPENAI_API_KEY = originalKey;
});

test("generateCodeEmbedding produces 1536-dim vector with mock client", async () => {
  const mockVector = new Array(1536).fill(0.05);
  const mockClient = {
    embeddings: {
      create: async () => ({
        data: [{ embedding: mockVector }],
      }),
    },
  };

  const result = await generateCodeEmbedding("const a = 1;", { client: mockClient as any });
  assert.ok(result);
  assert.equal(result.length, 1536);
  assert.equal(result[0], 0.05);
});
