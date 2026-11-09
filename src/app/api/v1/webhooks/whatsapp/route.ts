import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-build-placeholder" });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.META_WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const openai = getOpenAI();
  const body = await request.json().catch(() => ({}));
  const org = await getOrCreateDefaultOrg();
  const entries = body?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const messages = value?.messages ?? [];
      for (const msg of messages) {
        const from = msg.from;
        const text = msg.text?.body ?? "";
        const phoneNumberId = value?.metadata?.phone_number_id;

        const agents = await prisma.agent.findMany({ where: { organizationId: org.id }, take: 1 });
        const agent = agents[0];
        if (!agent) continue;

        let conv = await prisma.conversation.findFirst({ where: { organizationId: org.id, externalId: from } });
        if (!conv) {
          conv = await prisma.conversation.create({
            data: { organizationId: org.id, agentId: agent.id, channel: "whatsapp", externalId: from },
          });
        }

        await prisma.message.create({ data: { conversationId: conv.id, organizationId: org.id, role: "user", content: text } });

        const chunks = await prisma.knowledgeChunk.findMany({ where: { organizationId: org.id }, take: 5 });
        const context = chunks.map((c) => c.content).join("\n---\n");

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: `${agent.systemPrompt}\n\nContexto:\n${context}` },
            { role: "user", content: text },
          ],
          temperature: agent.temperature ?? 0.7,
        });
        const reply = completion.choices[0]?.message?.content ?? "Desculpe, não consegui responder.";

        await prisma.message.create({ data: { conversationId: conv.id, organizationId: org.id, role: "assistant", content: reply } });

        await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messaging_product: "whatsapp", to: from, text: { body: reply } }),
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
