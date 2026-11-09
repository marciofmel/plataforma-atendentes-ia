import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";
import { chatCompletion } from "@/services/llmAdapter";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const org = await getOrCreateDefaultOrg();

  const type = body?.type ?? body?.message?.type;
  const callId = body?.call?.id ?? body?.message?.call?.id;
  const transcript = body?.message?.transcript ?? body?.transcript ?? "";

  const agents = await prisma.agent.findMany({ where: { organizationId: org.id }, take: 1 });
  const agent = agents[0];
  if (!agent) return NextResponse.json({ ok: true });

  if (type === "assistant-request" || type === "function-call" || transcript) {
    const chunks = await prisma.knowledgeChunk.findMany({ where: { organizationId: org.id }, take: 5 });
    const context = chunks.map((c) => c.content).join("\n---\n");

    const reply = await chatCompletion(
      [
        { role: "system", content: `${agent.systemPrompt}\n\nContexto:\n${context}` },
        { role: "user", content: transcript || "Olá" },
      ],
      { temperature: agent.temperature ?? 0.7 }
    );

    let conv = await prisma.conversation.findFirst({ where: { organizationId: org.id, externalId: callId ?? undefined } });
    if (!conv) {
      conv = await prisma.conversation.create({ data: { organizationId: org.id, agentId: agent.id, channel: "voice", externalId: callId ?? null } });
    }
    await prisma.message.create({ data: { conversationId: conv.id, organizationId: org.id, role: "user", content: transcript || "" } });
    await prisma.message.create({ data: { conversationId: conv.id, organizationId: org.id, role: "assistant", content: reply } });

    return NextResponse.json({ result: reply });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "vapi-webhook" });
}
