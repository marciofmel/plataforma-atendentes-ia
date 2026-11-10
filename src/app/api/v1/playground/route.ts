import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";
import { getSettings } from "@/lib/settings";
import { chatCompletion } from "@/services/llmAdapter";
import { retrieveContext } from "@/services/agentEngine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const org = await getOrCreateDefaultOrg();
  const settings = await getSettings();
  const body = await request.json().catch(() => ({}));
  const { agentId, message, history } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Mensagem obrigatória." }, { status: 400 });
  }

  const agents = await prisma.agent.findMany({ where: { organizationId: org.id } });
  const agent = agentId ? agents.find((a) => a.id === agentId) : agents[0];
  if (!agent) return NextResponse.json({ error: "Nenhum agente encontrado" }, { status: 404 });

  const contextChunks = await retrieveContext(org.id, message, settings);
  const context = contextChunks.join("\n---\n");

  const messages = [
    { role: "system" as const, content: `${agent.systemPrompt}\n\nContexto:\n${context}` },
    ...(history ?? []).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  let reply: string;
  try {
    reply = await chatCompletion(messages, { temperature: agent.temperature ?? 0.7, settings });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Falha ao chamar a IA. Configure sua chave em Configurações.",
      },
      { status: 502 }
    );
  }

  let sentiment = "neutro";
  try {
    const raw = await chatCompletion(
      [
        {
          role: "system",
          content: "Analise o sentimento da mensagem do usuário. Responda apenas: positivo, negativo ou neutro.",
        },
        { role: "user", content: message },
      ],
      { temperature: 0, settings }
    );
    const cleaned = raw.trim().toLowerCase();
    if (["positivo", "negativo", "neutro"].includes(cleaned)) sentiment = cleaned;
  } catch {
    /* sentimento é opcional */
  }

  return NextResponse.json({
    reply,
    sentiment,
    agent: agent.name,
    usedContext: contextChunks.length > 0,
  });
}
