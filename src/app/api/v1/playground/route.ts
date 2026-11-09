import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";
import { chatCompletion } from "@/services/llmAdapter";

export async function POST(request: Request) {
  const org = await getOrCreateDefaultOrg();
  const body = await request.json().catch(() => ({}));
  const { agentId, message, history } = body;

  const agents = await prisma.agent.findMany({ where: { organizationId: org.id } });
  const agent = agentId ? agents.find((a) => a.id === agentId) : agents[0];
  if (!agent) return NextResponse.json({ error: "Nenhum agente encontrado" }, { status: 404 });

  const chunks = await prisma.knowledgeChunk.findMany({ where: { organizationId: org.id }, take: 5 });
  const context = chunks.map((c) => c.content).join("\n---\n");

  const messages = [
    { role: "system" as const, content: `${agent.systemPrompt}\n\nContexto:\n${context}` },
    ...(history ?? []).map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  const reply = await chatCompletion(messages, { temperature: agent.temperature ?? 0.7 });

  // Análise de sentimento
  const sentiment = await chatCompletion(
    [
      { role: "system", content: "Analise o sentimento da mensagem do usuário. Responda apenas: positivo, negativo ou neutro." },
      { role: "user", content: message },
    ],
    { temperature: 0 }
  );

  return NextResponse.json({ reply, sentiment: sentiment.trim().toLowerCase(), agent: agent.name });
}
