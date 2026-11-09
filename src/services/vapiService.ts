// Serviço Vapi (Telefonia / Voz)
const VAPI_BASE = "https://api.vapi.ai";

export async function createVapiCall(payload: Record<string, unknown>) {
  const res = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Vapi call failed: ${res.status}`);
  return res.json();
}

export function buildVoiceAssistantConfig(agent: { name: string; system_prompt: string; voice_settings?: Record<string, unknown>; temperature?: number }) {
  return {
    name: agent.name,
    model: {
      provider: "openai",
      model: "gpt-4o",
      systemPrompt: agent.system_prompt,
      temperature: agent.temperature ?? 0.7,
    },
    voice: agent.voice_settings ?? { provider: "11labs", voiceId: "rachel" },
    firstMessage: "Olá! Como posso ajudar?",
  };
}
