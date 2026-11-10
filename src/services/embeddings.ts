import { getOpenAIClient } from "@/services/llmAdapter";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function parseEmbedding(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as number[]) : [];
  } catch {
    return [];
  }
}

/** Gera embeddings reais via OpenAI. Retorna [] se não houver chave válida. */
export async function embedTexts(texts: string[], apiKey: string | null): Promise<number[][]> {
  if (!apiKey || texts.length === 0) return [];
  const client = getOpenAIClient(apiKey);
  const res = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => d.embedding as number[]);
}
