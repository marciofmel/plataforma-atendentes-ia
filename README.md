# Plataforma de Atendentes de IA

Plataforma SaaS multi-tenant de agentes de IA (WhatsApp + Telefonia/Vapi) com RAG.

## Stack
- Next.js 14 (App Router) + TypeScript
- PostgreSQL (Render) + Prisma
- NextAuth (email/senha)
- OpenAI / Groq (adapter LLM)
- RAG com pdf-parse + embeddings

## Desenvolvimento local
```powershell
$env:PORT="3011"; npm run dev
```
Acesse: `http://localhost:3011/login`

> Local: use `DATABASE_URL` apontando para um PostgreSQL local ou Render Postgres. O projeto migra o schema com `npx prisma db push`.

## Produção (Render)
- Serviço: `plataforma-atendentes-ia`
- Banco: `plataforma-atendentes-db` (Postgres free)
- Build: `npm install && npx prisma generate && npx prisma db push --skip-generate && npm run build`
- Start: `npm run start`

## Variáveis de ambiente
- `DATABASE_URL` (automática via Render Postgres)
- `NEXTAUTH_SECRET` (gerada)
- `NEXTAUTH_URL` (URL pública)
- `OPENAI_API_KEY`, `GROQ_API_KEY`, `VAPI_API_KEY` — **opcionais**, configuráveis no painel visual `/admin/settings`

## WhatsApp
O painel `/admin/whatsapp` conecta o número por **QR Code** com Evolution API ou Z-API
(sem portfólio da Meta) ou pelo WhatsApp Cloud API oficial.
Veja o guia completo em [`docs/whatsapp-sem-portfolio.md`](docs/whatsapp-sem-portfolio.md).

Webhooks:
- `/api/v1/webhooks/whatsapp` (Meta)
- `/api/v1/webhooks/evolution` (Evolution API)
- `/api/v1/webhooks/zapi` (Z-API)
- `/api/v1/webhooks/vapi` (voz)

