import { prisma } from "@/lib/prisma";
import type { AppSettings } from "@/lib/settings";
import { resolveOpenAIKey } from "@/lib/settings";
import { chatCompletion, type LLMMessage } from "@/services/llmAdapter";
import { cosineSimilarity, embedTexts, parseEmbedding } from "@/services/embeddings";

export interface EngineInput {
  organizationId: string;
  text: string;
  externalId?: string | null;
  channel: string;
  settings: AppSettings;
}

export interface EngineOutput {
  reply: string;
  conversationId: string | null;
  agentName: string | null;
  usedContext: boolean;
}

const MAX_HISTORY = 12;

/**
 * Busca os trechos mais relevantes da base de conhecimento.
 * Usa similaridade de embeddings quando há chave da OpenAI;
 * caso contrário cai para busca por palavras-chave.
 */
export async function retrieveContext(
  organizationId: string,
  query: string,
  settings: AppSettings,
  limit = 5
): Promise<string[]> {
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { organizationId },
    take: 300,
    orderBy: { createdAt: "desc" },
  });
  if (chunks.length === 0) return [];

  const apiKey = resolveOpenAIKey(settings);
  if (apiKey) {
    try {
      const vectors = await embedTexts([query], apiKey);
      const q = vectors[0];
      if (q?.length) {
        const scored = chunks
          .map((c) => ({ content: c.content, score: cosineSimilarity(q, parseEmbedding(c.embedding)) }))
          .filter((c) => c.score > 0.15)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        if (scored.length) return scored.map((s) => s.content);
      }
    } catch {
      // segue para o fallback por palavras-chave
    }
  }

  const terms = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 3);
  if (terms.length === 0) return chunks.slice(0, limit).map((c) => c.content);

  const scored = chunks
    .map((c) => {
      const haystack = c.content.toLowerCase();
      const score = terms.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
      return { content: c.content, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.length ? scored.map((s) => s.content) : chunks.slice(0, limit).map((c) => c.content);
}

/** Gera a resposta do agente para uma mensagem recebida em qualquer canal. */
export async function generateAgentReply(input: EngineInput): Promise<EngineOutput> {
  const { organizationId, text, externalId, channel, settings } = input;

  const agent =
    (await prisma.agent.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.agent.create({
      data: {
        organizationId,
        name: "Atendente Padrão",
        systemPrompt:
          "Você é um atendente virtual cordial, objetivo e prestativo. Responda sempre em português do Brasil, com mensagens curtas e claras. Se não souber a resposta, ofereça encaminhar para um atendente humano.",
        temperature: 0.7,
      },
    }));

  let conversation = externalId
    ? await prisma.conversation.findFirst({ where: { organizationId, channel, externalId } })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { organizationId, agentId: agent.id, channel, externalId: externalId ?? null },
    });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, organizationId, role: "user", content: text },
  });

  const recent = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY,
  });
  const ordered = recent.reverse();

  const contextChunks = await retrieveContext(organizationId, text, settings);
  const context = contextChunks.join("\n---\n");

  const systemPrompt = [
    agent.systemPrompt?.trim() ||
      "Você é um atendente virtual cordial, objetivo e prestativo. Responda sempre em português do Brasil.",
    context
      ? `Use a base de conhecimento abaixo para responder. Se a resposta não estiver nela, diga que vai verificar com a equipe.\n\nBASE DE CONHECIMENTO:\n${context}`
      : "Não há base de conhecimento cadastrada. Responda de forma útil e ofereça encaminhar para um humano quando não souber.",
  ].join("\n\n");

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...ordered.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    })),
  ];

  let reply: string;
  try {
    reply = await chatCompletion(messages, {
      settings,
      temperature: agent.temperature ?? 0.7,
    });
  } catch (err) {
    reply =
      "Desculpe, estou com uma instabilidade técnica no momento. Já avisei a equipe e retornaremos em breve.";
    console.error("[agentEngine] falha ao gerar resposta:", err);
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, organizationId, role: "assistant", content: reply },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return {
    reply: reply.trim(),
    conversationId: conversation.id,
    agentName: agent.name,
    usedContext: contextChunks.length > 0,
  };
}
