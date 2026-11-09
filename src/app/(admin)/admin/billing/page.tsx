"use client";

import { useEffect, useState } from "react";

export default function BillingPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/v1/billing")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Billing & Consumo</h1>
      {data ? (
        <div className="bg-white rounded shadow p-4 space-y-2">
          <div>Mensagens: {data.usage.messages}</div>
          <div>Conversas: {data.usage.conversations}</div>
          <div>Custo estimado: ${data.estimatedCostUSD}</div>
          <div>Plano: {data.plan}</div>
        </div>
      ) : (
        <p className="text-gray-500">Carregando...</p>
      )}
    </main>
  );
}
