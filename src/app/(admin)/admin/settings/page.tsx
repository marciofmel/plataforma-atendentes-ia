"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Save, Loader2, CheckCircle2, ExternalLink, Smartphone } from "lucide-react";

const FIELDS = [
  {
    key: "openai_api_key",
    label: "OpenAI API Key",
    secret: true,
    hint: "Usada para respostas (LLM) e embeddings da base de conhecimento.",
    link: "https://platform.openai.com/api-keys",
  },
  {
    key: "groq_api_key",
    label: "Groq API Key (opcional)",
    secret: true,
    hint: "Alternativa gratuita para respostas. Usada quando não há chave da OpenAI.",
    link: "https://console.groq.com/keys",
  },
  {
    key: "vapi_api_key",
    label: "Vapi API Key (voz)",
    secret: true,
    hint: "Para atendimento por telefone/voz.",
    link: "https://vapi.ai",
  },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/settings")
      .then((r) => r.json())
      .then((d) => setValues(d.settings ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setMsg({ kind: "ok", text: "Configurações salvas com sucesso!" });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="text-purple-400" size={22} />
          Chaves de API
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Cole suas chaves aqui. Elas ficam salvas no banco da sua organização — nunca no código nem no Git.
        </p>
      </header>

      {msg && (
        <div
          className={`rounded-lg px-4 py-3 text-sm border ${
            msg.kind === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      <section className="glass-panel rounded-xl p-4 md:p-5 space-y-4">
        {loading && <p className="text-sm text-slate-400">Carregando...</p>}
        {!loading &&
          FIELDS.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-medium text-slate-300">{f.label}</label>
                <a
                  href={f.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-purple-400 hover:underline inline-flex items-center gap-1"
                >
                  obter chave <ExternalLink size={9} />
                </a>
              </div>
              <input
                type={f.secret ? "password" : "text"}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                placeholder={f.secret ? "cole a chave aqui" : ""}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">{f.hint}</p>
            </div>
          ))}

        <button
          onClick={save}
          disabled={saving || loading}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Salvar configurações
        </button>
      </section>

      <section className="rounded-xl p-4 border border-slate-800 bg-slate-900/40">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-2">
          <Smartphone size={16} className="text-emerald-400" />
          WhatsApp
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          A conexão do WhatsApp (Meta, Evolution API ou Z-API) tem uma página própria com QR Code e teste de envio.
        </p>
        <Link
          href="/admin/whatsapp"
          className="inline-flex items-center gap-2 text-xs text-purple-300 hover:text-purple-200"
        >
          <CheckCircle2 size={13} /> Ir para Conexão do WhatsApp
        </Link>
      </section>
    </main>
  );
}
