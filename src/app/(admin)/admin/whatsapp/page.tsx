"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, XCircle, Loader2, Copy, QrCode, ShieldCheck, Smartphone,
  Zap, MessageSquare, ExternalLink, AlertTriangle, RefreshCw, LogOut,
} from "lucide-react";

type Provider = "meta" | "evolution" | "zapi";

const PROVIDERS: {
  id: Provider;
  name: string;
  tag: string;
  desc: string;
  icon: typeof ShieldCheck;
  accent: string;
  needsPortfolio: boolean;
}[] = [
  {
    id: "meta",
    name: "Meta WhatsApp Cloud API",
    tag: "Oficial",
    desc: "API oficial do WhatsApp. Exige portfólio empresarial verificado na Meta.",
    icon: ShieldCheck,
    accent: "emerald",
    needsPortfolio: true,
  },
  {
    id: "evolution",
    name: "Evolution API",
    tag: "Sem portfólio",
    desc: "Open source, conexão por QR Code. Não exige portfólio da Meta.",
    icon: Zap,
    accent: "purple",
    needsPortfolio: false,
  },
  {
    id: "zapi",
    name: "Z-API",
    tag: "Sem portfólio",
    desc: "Serviço gerenciado com teste grátis. Conexão por QR Code, sem portfólio.",
    icon: Smartphone,
    accent: "blue",
    needsPortfolio: false,
  },
];

const FIELDS: Record<Provider, { key: string; label: string; placeholder: string; secret?: boolean; hint?: string }[]> = {
  meta: [
    { key: "meta_whatsapp_token", label: "Access Token", placeholder: "EAAG...", secret: true },
    { key: "meta_whatsapp_phone_number_id", label: "Phone Number ID", placeholder: "123456789012345" },
    { key: "meta_whatsapp_verify_token", label: "Verify Token (você inventa)", placeholder: "meu-verify-token-2026" },
    { key: "meta_graph_version", label: "Versão da Graph API", placeholder: "v21.0", hint: "Opcional. Padrão: v21.0" },
  ],
  evolution: [
    { key: "evolution_base_url", label: "URL da Evolution API", placeholder: "https://evolution.seudominio.com", hint: "Endereço do servidor, começando com https://. Não é e-mail nem nome de usuário." },
    { key: "evolution_api_key", label: "API Key (AUTHENTICATION_API_KEY)", placeholder: "sua-chave-global", secret: true },
    { key: "evolution_instance", label: "Nome da instância", placeholder: "atendentes-ia", hint: "Sem espaços. Apenas letras, números e hífen." },
  ],
  zapi: [
    { key: "zapi_instance_id", label: "Instance ID", placeholder: "3A1B2C..." },
    { key: "zapi_token", label: "Token", placeholder: "ABC123...", secret: true },
    { key: "zapi_client_token", label: "Client-Token (Security Token)", placeholder: "F123...", secret: true, hint: "Opcional, mas recomendado." },
    { key: "zapi_base_url", label: "Base URL", placeholder: "https://api.z-api.io", hint: "Opcional." },
  ],
};

function normalizeQr(qr: string | null): string | null {
  if (!qr) return null;
  if (qr.startsWith("data:image")) return qr;
  if (qr.startsWith("http")) return qr;
  return `data:image/png;base64,${qr}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validação local dos campos da Evolution API, para avisar antes de chamar o servidor. */
function validateEvolution(s: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  const url = (s.evolution_base_url ?? "").trim();
  if (!url) {
    errors.evolution_base_url = "Informe a URL do seu servidor Evolution API.";
  } else if (EMAIL_RE.test(url)) {
    errors.evolution_base_url =
      "Isso é um e-mail. Aqui vai o endereço do servidor, ex.: https://evolution.seudominio.com";
  } else if (!/^https?:\/\//i.test(url)) {
    errors.evolution_base_url = "A URL precisa começar com https:// (ou http://).";
  } else {
    try {
      new URL(url);
    } catch {
      errors.evolution_base_url = "URL inválida. Exemplo correto: https://evolution.seudominio.com";
    }
  }

  if (!(s.evolution_api_key ?? "").trim()) {
    errors.evolution_api_key = "Informe a API Key global (AUTHENTICATION_API_KEY) do seu servidor.";
  }

  const inst = (s.evolution_instance ?? "").trim();
  if (!inst) errors.evolution_instance = "Informe o nome da instância.";
  else if (inst.length < 2) errors.evolution_instance = "Nome muito curto.";

  return errors;
}

/** Mesma normalização do backend: sem espaços, minúsculas. */
function normalizeInstance(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9._-]/g, "");
}


export default function WhatsAppPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [provider, setProvider] = useState<Provider>("evolution");
  const [status, setStatus] = useState<{ connected?: boolean; state?: string; provider?: string | null } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [testNumber, setTestNumber] = useState("");
  const [testing, setTesting] = useState(false);
  const [origin, setOrigin] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch("/api/v1/settings").then((r) => r.json()),
        fetch("/api/v1/whatsapp/connect").then((r) => r.json()),
      ]);
      const s = sRes?.settings ?? {};
      setSettings(s);
      const p = (s.whatsapp_provider as Provider) || (cRes?.provider as Provider) || "evolution";
      setProvider(p);
      setStatus(cRes);
    } catch {
      setFeedback({ kind: "err", text: "Não foi possível carregar as configurações." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Enquanto o QR estiver na tela, verifica a conexão a cada 4s.
  useEffect(() => {
    if (!qr) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/v1/whatsapp/connect", { cache: "no-store" }).then((r) => r.json());
        setStatus(res);
        if (res?.connected) {
          setQr(null);
          setFeedback({ kind: "ok", text: "WhatsApp conectado com sucesso!" });
        }
      } catch {
        /* silencioso */
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [qr]);

  function update(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function save(then?: () => Promise<void>) {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, whatsapp_provider: provider }),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      if (then) await then();
      else setFeedback({ kind: "ok", text: "Configurações salvas." });
    } catch (err) {
      setFeedback({ kind: "err", text: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    // Validação local: evita mandar lixo para a API e devolver erro técnico.
    if (provider === "evolution") {
      const errs = validateEvolution(settings);
      setErrors(errs);
      if (Object.keys(errs).length > 0) {
        setFeedback({
          kind: "err",
          text: "Corrija os campos destacados em vermelho antes de conectar.",
        });
        return;
      }
    }

    await save(async () => {
      setQr(null);
      const res = await fetch("/api/v1/whatsapp/connect", { method: "POST" });
      const data = await res.json();
      if (data?.qr) {
        setQr(normalizeQr(data.qr));
        setFeedback({ kind: "ok", text: "Escaneie o QR Code com o WhatsApp do seu celular." });
      } else if (data?.connected) {
        setFeedback({ kind: "ok", text: data.message ?? "WhatsApp já está conectado." });
      } else {
        setFeedback({ kind: "err", text: data?.error ?? "Não foi possível gerar o QR Code." });
      }
      const st = await fetch("/api/v1/whatsapp/connect", { cache: "no-store" }).then((r) => r.json());
      setStatus(st);
    });
  }

  async function refreshStatus() {
    const res = await fetch("/api/v1/whatsapp/connect", { cache: "no-store" }).then((r) => r.json());
    setStatus(res);
  }

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/v1/whatsapp/connect", { method: "DELETE" });
      setQr(null);
      setFeedback({ kind: "ok", text: "Sessão do WhatsApp encerrada." });
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setFeedback(null);
    try {
      await save(async () => {
        const res = await fetch("/api/v1/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: testNumber }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Falha no envio.");
        setFeedback({ kind: "ok", text: `Mensagem enviada via ${data.provider}. Confira seu celular!` });
      });
    } catch (err) {
      setFeedback({ kind: "err", text: err instanceof Error ? err.message : "Falha no envio." });
    } finally {
      setTesting(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setFeedback({ kind: "ok", text: "URL copiada!" });
  }

  const webhookUrl = origin ? `${origin}/api/v1/webhooks/${provider === "meta" ? "whatsapp" : provider}` : "";
  const selected = PROVIDERS.find((p) => p.id === provider)!;
  const connected = Boolean(status?.connected);

  return (
    <main className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="text-purple-400" size={22} />
            Conexão do WhatsApp
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Conecte seu número ao atendente de IA. Sem portfólio da Meta você pode usar Evolution API ou Z-API.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs rounded-full px-3 py-1.5 border border-slate-700 bg-slate-900">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
          <span className={connected ? "text-emerald-300" : "text-slate-400"}>
            {loading ? "Verificando..." : connected ? "Conectado" : "Desconectado"}
          </span>
          <button onClick={refreshStatus} className="text-slate-400 hover:text-white ml-1" title="Atualizar">
            <RefreshCw size={12} />
          </button>
        </div>
      </header>

      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm border ${
            feedback.kind === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Escolha do provedor */}
      <section className="glass-panel rounded-xl p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">1. Escolha o provedor</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {PROVIDERS.map((p) => {
            const Icon = p.icon;
            const active = provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setProvider(p.id);
                  setQr(null);
                }}
                className={`text-left rounded-lg p-3 border transition ${
                  active
                    ? "border-purple-500/60 bg-purple-500/10"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} className={active ? "text-purple-300" : "text-slate-400"} />
                  <span className="text-sm font-semibold text-slate-100">{p.name}</span>
                </div>
                <span
                  className={`inline-block text-[10px] px-1.5 py-0.5 rounded mb-2 ${
                    p.needsPortfolio
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  {p.tag}
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Credenciais */}
      <section className="glass-panel rounded-xl p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-1">2. Credenciais do {selected.name}</h2>
        {selected.needsPortfolio && (
          <div className="flex items-start gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 my-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              A Meta exige portfólio empresarial verificado. Se sua conta está bloqueada para criar portfólio,
              use a opção <strong>Evolution API</strong> ou <strong>Z-API</strong> acima — funcionam por QR Code e não
              dependem da Meta.
            </span>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          {FIELDS[provider].map((f) => {
            const err = errors[f.key];
            return (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-300 mb-1">{f.label}</label>
                <input
                  type={f.secret ? "password" : "text"}
                  value={settings[f.key] ?? ""}
                  onChange={(e) => {
                    update(f.key, e.target.value);
                    if (errors[f.key]) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next[f.key];
                        return next;
                      });
                    }
                  }}
                  onBlur={(e) => {
                    if (f.key === "evolution_instance") {
                      const normalized = normalizeInstance(e.target.value);
                      if (normalized !== e.target.value) update(f.key, normalized);
                    }
                  }}
                  placeholder={f.placeholder}
                  className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none ${
                    err ? "border-red-500/70 focus:border-red-400" : "border-slate-700 focus:border-purple-500"
                  }`}
                />
                {err ? (
                  <p className="text-[10px] text-red-400 mt-1 flex items-start gap-1">
                    <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </p>
                ) : (
                  f.hint && <p className="text-[10px] text-slate-500 mt-1">{f.hint}</p>
                )}
              </div>
            );
          })}
        </div>

        {provider === "evolution" && (
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 leading-relaxed">
            <p className="text-slate-200 font-semibold mb-1">Ainda não tem um servidor Evolution API?</p>
            A Evolution API não é um site que você se cadastra — ela precisa estar <strong>hospedada</strong> (VPS, Docker,
            Railway, seu próprio servidor). Sem esse endereço não existe QR Code para gerar. Se preferir algo pronto,
            escolha <strong>Z-API</strong> acima: você cria a instância no painel deles e copia Instance ID + Token.
          </div>
        )}


        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => save()}
            disabled={busy}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 text-sm px-4 py-2 rounded-lg border border-slate-700"
          >
            {busy ? "Salvando..." : "Salvar credenciais"}
          </button>
          {provider !== "meta" && (
            <button
              onClick={connect}
              disabled={busy}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
              {connected ? "Reconectar / novo QR" : "Conectar com QR Code"}
            </button>
          )}
          {connected && (
            <button
              onClick={disconnect}
              disabled={busy}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm px-4 py-2 rounded-lg border border-red-500/30"
            >
              <LogOut size={15} /> Desconectar
            </button>
          )}
        </div>
      </section>

      {/* QR Code */}
      {qr && (
        <section className="glass-panel rounded-xl p-5 text-center">
          <h2 className="text-sm font-semibold text-slate-200 mb-1">Escaneie com o WhatsApp</h2>
          <p className="text-xs text-slate-400 mb-4">
            WhatsApp → Aparelhos conectados → Conectar um aparelho
          </p>
          <div className="inline-block bg-white p-3 rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR Code do WhatsApp" width={240} height={240} />
          </div>
          <p className="text-[11px] text-slate-500 mt-3 flex items-center justify-center gap-1">
            <Loader2 size={11} className="animate-spin" /> Aguardando leitura do QR Code...
          </p>
        </section>
      )}

      {/* Webhook */}
      <section className="glass-panel rounded-xl p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-1">3. URL do webhook</h2>
        <p className="text-[11px] text-slate-400 mb-3">
          {provider === "meta"
            ? "Cole esta URL em Meta → WhatsApp → Configuration → Webhook e informe o mesmo Verify Token."
            : provider === "evolution"
              ? "Na Evolution, configure o webhook da instância apontando para esta URL (evento MESSAGES_UPSERT)."
              : "No painel da Z-API, em Webhooks, cole esta URL e ative “Ao receber”."}
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-emerald-300">
            {webhookUrl || "carregando..."}
          </code>
          <button
            onClick={() => copy(webhookUrl)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Copiar"
          >
            <Copy size={14} />
          </button>
        </div>
      </section>

      {/* Teste */}
      <section className="glass-panel rounded-xl p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-1">4. Enviar mensagem de teste</h2>
        <p className="text-[11px] text-slate-400 mb-3">
          Envie uma mensagem real para validar a conexão. Use DDI + DDD, só números (ex.: 5511999999999).
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
            placeholder="5511999999999"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={sendTest}
            disabled={testing || !testNumber.trim()}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-medium"
          >
            {testing ? <Loader2 size={15} className="animate-spin" /> : connected ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            Enviar teste
          </button>
        </div>
      </section>

      {/* Passo a passo */}
      <section className="rounded-xl p-4 md:p-5 border border-slate-800 bg-slate-900/40">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">Como funciona cada opção</h2>
        <div className="grid md:grid-cols-2 gap-4 text-[11px] text-slate-400 leading-relaxed">
          <div>
            <p className="text-slate-200 font-semibold mb-1">Evolution API (grátis, open source)</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Instale/hospede a Evolution API (Docker ou VPS).</li>
              <li>Pegue a URL pública e a AUTHENTICATION_API_KEY.</li>
              <li>Preencha os campos acima e clique em Salvar.</li>
              <li>Clique em “Conectar com QR Code” e escaneie.</li>
              <li>Configure o webhook na instância com a URL acima.</li>
            </ol>
          </div>
          <div>
            <p className="text-slate-200 font-semibold mb-1">Z-API (teste grátis, gerenciado)</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Crie uma conta em z-api.io e uma instância.</li>
              <li>Copie Instance ID, Token e Client-Token.</li>
              <li>Cole nos campos acima e clique em Salvar.</li>
              <li>Clique em “Conectar com QR Code” e escaneie.</li>
              <li>Cadastre a URL do webhook no painel da Z-API.</li>
            </ol>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-3">
          Precisa da chave de IA (OpenAI ou Groq) para o agente responder?{" "}
          <Link href="/admin/settings" className="text-purple-400 hover:underline inline-flex items-center gap-1">
            Configurações <ExternalLink size={10} />
          </Link>
        </p>
      </section>
    </main>
  );
}
