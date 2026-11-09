"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    if (mode === "register") {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const d = await res.json();
        setMsg(d.error ?? "Erro ao registrar");
        setLoading(false);
        return;
      }
    }
    const r = await signIn("credentials", { email, password, redirect: false });
    if (r?.error) {
      setMsg("Credenciais inválidas");
    } else {
      router.push("/admin");
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-8 rounded shadow space-y-4">
        <h1 className="text-2xl font-bold text-center">Plataforma de Atendentes de IA</h1>
        <p className="text-sm text-gray-500 text-center">{mode === "login" ? "Entrar" : "Criar conta"}</p>
        {mode === "register" && (
          <input className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500" type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50">
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Registrar"}
        </button>
        {msg && <p className="text-sm text-red-500 text-center">{msg}</p>}
        <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="w-full text-sm text-blue-600">
          {mode === "login" ? "Criar conta" : "Já tenho conta"}
        </button>
      </form>
    </main>
  );
}
