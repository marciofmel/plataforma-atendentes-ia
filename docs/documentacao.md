# Documentação Técnica Oficial — SaaS Agents IA

(Extraído do PDF "Documentação Técnica Oficial SaaS Agents IA.pdf")

## Resumo
Plataforma SaaS de Atendentes de Inteligência Artificial Multimodal (WhatsApp + Telefonia IP).
Arquitetura: Next.js 14 (App Router) + Supabase (PostgreSQL + RLS + pgvector) + n8n + Vapi.

## Segmentos suportados
Clínicas, Imobiliárias, Hotéis, SaaS (configuráveis via Engines Metadados).

## Stack
- Frontend: Next.js 14, Tailwind, Shadcn/UI
- Backend: Node.js/TS Edge API Routes, Supabase
- Integrações: Meta WhatsApp Cloud API, Vapi Voice, OpenAI/Groq/Anthropic (adapter pattern anti-lock-in)
- Orquestração: n8n (filas, retries, cron, billing webhooks)

## Schema (PostgreSQL + pgvector)
Tabelas: organizations, agents, knowledge_chunks (+ index ivfflat coseno), conversations, messages, memberships, users, knowledge_documents.

## APIs REST
- POST /api/v1/agents
- POST /api/v1/knowledge/upload
- POST /api/v1/webhooks/whatsapp
- POST /api/v1/webhooks/vapi

## Roadmap (15 Fases)
- Fase 1-2: Infra, DB, RLS multi-tenant
- Fase 3-5: Dashboards & Construtor de Agentes
- Fase 6-7: Engine RAG & WhatsApp
- Fase 8-10: Voz/Telefonia (Vapi) & Multimodal áudio
- Fase 11-15: Agendamento, Handover Humano, Billing, Publicação
