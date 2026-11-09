"use client";

import { useEffect, useState } from "react";

const FIELDS = [
  { key: "openai_api_key", label: "OpenAI API Key", secret: true },
  { key: "groq_api_key", label: "Groq API Key (opcional)", secret: true },
  { key: "meta_whatsapp_token", label: "Meta WhatsApp Token", secret: true },
  { key: "meta_whatsapp_phone_number_id", label: "Meta Phone Number ID", secret: false },
  { key: "meta_whatsapp_verify_token", label: "Meta Verify Token", secret: false },
  { key: "vapi_api_key", label: "Vapi API Key", secret: true },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/v1/settings")
      .then((r) => r.json())
      .then((d) => setValues(d.settings ?? {}))
      .catch(() => {});
  }, []);

  async function save() {
    const res = await fetch("/api/v1/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setMsg(res.ok ? "Salvo com sucesso!" : "Erro ao salvar");
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configurações da Plataforma</h1>
      <div className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1">{f.label}</label>
            <input
              type={f.secret ? "password" : "text"}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500"
            />
          </div>
        ))}
      </div>
      <button onClick={save} className="mt-6 bg-blue-600 text-white px-4 py-2 rounded">
        Salvar
      </button>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </main>
  );
}
