"use client";

import { useEffect, useState } from "react";

interface Appt {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  status: string;
}

export default function AppointmentsPage() {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");

  async function load() {
    const res = await fetch("/api/v1/appointments");
    const d = await res.json();
    setAppts(d.appointments ?? []);
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/v1/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc, scheduledAt: date }),
    });
    setTitle(""); setDesc(""); setDate("");
    load();
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Agendamentos</h1>
      <form onSubmit={create} className="bg-white p-4 rounded shadow space-y-3 mb-6">
        <input className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500" placeholder="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <input type="datetime-local" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500" value={date} onChange={(e) => setDate(e.target.value)} required />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Agendar</button>
      </form>
      <ul className="space-y-2">
        {appts.map((a) => (
          <li key={a.id} className="border rounded p-3 bg-white">
            <strong>{a.title}</strong>
            <span className="text-sm text-gray-500 ml-2">{new Date(a.scheduledAt).toLocaleString()}</span>
            <div className="text-sm text-gray-600">{a.description}</div>
            <div className="text-xs text-gray-400">Status: {a.status}</div>
          </li>
        ))}
        {appts.length === 0 && <p className="text-gray-500">Nenhum agendamento.</p>}
      </ul>
    </main>
  );
}
