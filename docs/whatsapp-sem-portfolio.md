# Como conectar o WhatsApp sem portfólio da Meta

Se sua conta do Facebook está com **acesso a anúncios restrito**, a Meta bloqueia a criação de
portfólio empresarial — e sem portfólio não é possível criar o app oficial do WhatsApp Cloud API.

A plataforma suporta **três provedores**. Os dois últimos não dependem da Meta.

| Provedor | Depende de portfólio? | Custo | Como conecta |
|---|---|---|---|
| Meta WhatsApp Cloud API | Sim | Pago por conversa | Token + webhook |
| **Evolution API** | **Não** | Grátis (open source, você hospeda) | QR Code |
| **Z-API** | **Não** | Teste grátis, depois plano pago | QR Code |

Acesse no painel: **/admin/whatsapp**

---

## Opção 1 — Z-API (mais rápido, sem instalar nada)

1. Crie uma conta em <https://z-api.io> e uma instância.
2. Copie **Instance ID**, **Token** e **Client-Token** (Security Token) no painel da Z-API.
3. Na plataforma, abra **WhatsApp → Z-API** e cole os três campos.
4. Clique em **Salvar credenciais** e depois em **Conectar com QR Code**.
5. Escaneie o QR no celular: WhatsApp → Aparelhos conectados → Conectar um aparelho.
6. No painel da Z-API, em **Webhooks**, cole a URL mostrada na plataforma:
   `https://SEU-DOMINIO/api/v1/webhooks/zapi` e ative **Ao receber**.
7. Use **Enviar teste** para validar.

## Opção 2 — Evolution API (100% grátis, self-hosted)

Pré-requisito: um servidor com Docker (VPS, ou o próprio Render com Docker + disco).

```bash
docker run -d --name evolution \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=sua-chave-global \
  -e DATABASE_ENABLED=true \
  -e DATABASE_PROVIDER=postgresql \
  -e DATABASE_CONNECTION_URI="postgresql://usuario:senha@host:5432/evolution" \
  -e DATABASE_SAVE_DATA_INSTANCE=true \
  -e CACHE_REDIS_ENABLED=false \
  -e RABBITMQ_ENABLED=false \
  -e SERVER_URL=https://evolution.seudominio.com \
  atendai/evolution-api:v2.1.1
```

Depois, na plataforma:

1. Abra **WhatsApp → Evolution API**.
2. Preencha **URL** (ex.: `https://evolution.seudominio.com`), **API Key** (o valor de
   `AUTHENTICATION_API_KEY`) e **Nome da instância** (ex.: `atendentes-ia`).
3. Clique em **Salvar credenciais** e em **Conectar com QR Code**.
4. Escaneie o QR Code.
5. Configure o webhook da instância para `https://SEU-DOMINIO/api/v1/webhooks/evolution`
   com o evento `MESSAGES_UPSERT`.
6. Use **Enviar teste** para validar.

## Opção 3 — Meta oficial (quando o portfólio for liberado)

1. Portfólio verificado em <https://business.facebook.com/create>.
2. App em <https://developers.facebook.com/apps> com o produto WhatsApp.
3. Copie **Access Token** e **Phone Number ID**.
4. Invente um **Verify Token**.
5. Na plataforma, abra **WhatsApp → Meta**, cole os campos e clique em **Salvar**.
6. Na Meta, em **WhatsApp → Configuration → Webhook**, use:
   - Callback URL: `https://SEU-DOMINIO/api/v1/webhooks/whatsapp`
   - Verify token: o mesmo que você inventou
   - Assine o evento `messages`

---

## Importante

- O agente só responde se houver **chave de IA** configurada em `/admin/settings`
  (OpenAI ou Groq). Sem ela, o webhook recebe a mensagem mas não gera resposta.
- A base de conhecimento (RAG) fica em `/admin/knowledge`: aceita PDF, TXT ou texto colado.
  Com chave da OpenAI os trechos são indexados com embeddings (busca semântica);
  sem chave, a busca por palavras-chave continua funcionando.
- Se você usar um número que já tem WhatsApp comum, a sessão é migrada para o
  dispositivo conectado (Baileys). É o comportamento esperado da API não oficial.
