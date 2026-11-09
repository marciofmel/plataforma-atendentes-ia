"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";

interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  temperature: number;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [agents, setAgents] = useState<Agent[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const tempRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/v1/agents");
    const d = await res.json();
    setAgents(d.agents ?? []);
  }

  useEffect(() => { load(); }, []);

  async function createAgent(e: React.FormEvent) {
    e.preventDefault();
    const name = nameRef.current?.value ?? "";
    const prompt = promptRef.current?.value ?? "";
    const temp = Number(tempRef.current?.value ?? 0.7);
    await fetch("/api/v1/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, system_prompt: prompt, temperature: temp }),
    });
    if (nameRef.current) nameRef.current.value = "";
    if (promptRef.current) promptRef.current.value = "";
    if (tempRef.current) tempRef.current.value = "0.7";
    load();
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Painel Master</h1>
        <div className="flex gap-3 items-center flex-wrap">
          <a href="/admin" className="text-blue-600 text-sm">Agentes</a>
          <a href="/admin/playground" className="text-blue-600 text-sm">Playground</a>
          <a href="/admin/dashboard" className="text-blue-600 text-sm">Dashboard</a>
          <a href="/admin/knowledge" className="text-blue-600 text-sm">Conhecimento</a>
          <a href="/admin/conversations" className="text-blue-600 text-sm">Conversas</a>
          <a href="/admin/appointments" className="text-blue-600 text-sm">Agendamentos</a>
          <a href="/admin/handovers" className="text-blue-600 text-sm">Handover</a>
          <a href="/admin/billing" className="text-blue-600 text-sm">Billing</a>
          <a href="/admin/settings" className="text-blue-600 text-sm">Configurações</a>
          <span className="text-sm text-gray-500">{session?.user?.email}</span>
          <button onClick={() => signOut()} className="text-sm text-red-500">Sair</button>
        </div>
      </div>

      <section className="mb-8 bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-3">Criar Atendente de IA</h2>
        <form onSubmit={createAgent} className="space-y-3">
          <input ref={nameRef} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500" placeholder="Nome do agente" required />
          <textarea ref={promptRef} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500" placeholder="System prompt" rows={4} />
          <div className="flex items-center gap-2">
            <label className="text-sm">Temperatura:</label>
            <input ref={tempRef} type="number" step="0.1" min="0" max="2" defaultValue="0.7" className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-20 text-slate-200" />
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Criar</button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Atendentes</h2>
        <ul className="space-y-2">
          {agents.map((a) => (
            <li key={a.id} className="border border-slate-700 rounded p-3 bg-slate-900">
              <strong className="text-white">{a.name}</strong>
              <span className="text-sm text-slate-400 ml-2">temp {a.temperature}</span>
              <p className="text-sm text-slate-300 mt-1 line-clamp-2">{a.systemPrompt}</p>
            </li>
          ))}
          {agents.length === 0 && <p className="text-gray-500">Nenhum agente criado ainda.</p>}
        </ul>
      </section>
    </main>
  );
}
