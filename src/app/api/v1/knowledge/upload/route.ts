import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";
import OpenAI from "openai";
import pdfParse from "pdf-parse";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function chunkText(text: string, size = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
    if (i < 0) i = 0;
  }
  return chunks.filter((c) => c.trim().length > 0);
}

export async function POST(request: Request) {
  const org = await getOrCreateDefaultOrg();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string) || "Documento";

  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await pdfParse(buffer);
  const text = parsed.text || "";

  const doc = await prisma.knowledgeDocument.create({
    data: { organizationId: org.id, title, sourceUrl: file.name },
  });

  const chunks = chunkText(text);
  for (const chunk of chunks) {
    const emb = await openai.embeddings.create({ model: "text-embedding-3-small", input: chunk });
    const vector = emb.data[0].embedding;
    await prisma.knowledgeChunk.create({
      data: {
        organizationId: org.id,
        documentId: doc.id,
        content: chunk,
        embedding: JSON.stringify(vector),
        metadata: JSON.stringify({ source: file.name }),
      },
    });
  }

  return NextResponse.json({ document: doc, chunks: chunks.length });
}
