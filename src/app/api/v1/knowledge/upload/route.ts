import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";
import { getSettings, resolveOpenAIKey } from "@/lib/settings";
import { embedTexts } from "@/services/embeddings";
import pdfParse from "pdf-parse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function chunkText(text: string, size = 1000, overlap = 200): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const slice = clean.slice(i, i + size).trim();
    if (slice.length > 0) chunks.push(slice);
    i += size - overlap;
  }
  return chunks;
}

/**
 * Upload de documento para a base de conhecimento (RAG).
 * Aceita PDF, TXT ou texto puro (campo "text").
 * Gera embeddings reais quando há chave da OpenAI; caso contrário
 * salva os trechos e a busca por palavras-chave continua funcionando.
 */
export async function POST(request: Request) {
  const org = await getOrCreateDefaultOrg();
  const settings = await getSettings();
  const contentType = request.headers.get("content-type") ?? "";

  let title = "Documento";
  let sourceName = "colado";
  let text = "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    title = String(body?.title ?? "Documento");
    text = String(body?.text ?? "");
    sourceName = "texto-colado";
    if (!text.trim()) return NextResponse.json({ error: "Texto vazio." }, { status: 400 });
  } else {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    title = (formData.get("title") as string) || "Documento";
    if (!file) return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const parsed = await pdfParse(buffer);
      text = parsed.text || "";
    } else {
      text = buffer.toString("utf8");
    }
    sourceName = file.name;
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "Não foi possível extrair texto do documento (PDF pode ser digitalizado/imagem)." },
      { status: 422 }
    );
  }

  const doc = await prisma.knowledgeDocument.create({
    data: { organizationId: org.id, title, sourceUrl: sourceName },
  });

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "Nenhum conteúdo útil encontrado." }, { status: 422 });
  }

  const apiKey = resolveOpenAIKey(settings);
  let embeddings: number[][] = [];
  let embeddingsUsed = false;

  if (apiKey) {
    try {
      const batchSize = 40;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const vectors = await embedTexts(batch, apiKey);
        embeddings.push(...vectors);
      }
      embeddingsUsed = embeddings.length === chunks.length;
    } catch (err) {
      console.error("[knowledge:upload] falha ao gerar embeddings:", err);
      embeddings = [];
      embeddingsUsed = false;
    }
  }

  await prisma.knowledgeChunk.createMany({
    data: chunks.map((content, idx) => ({
      organizationId: org.id,
      documentId: doc.id,
      content,
      embedding: embeddingsUsed ? JSON.stringify(embeddings[idx]) : "[]",
      metadata: JSON.stringify({ source: sourceName }),
    })),
  });

  return NextResponse.json({
    document: doc,
    chunks: chunks.length,
    embeddings: embeddingsUsed,
    hint: embeddingsUsed
      ? "Documento indexado com embeddings (busca semântica ativa)."
      : "Documento salvo sem embeddings. A busca por palavras-chave está ativa; configure a OpenAI API Key para busca semântica.",
  });
}
