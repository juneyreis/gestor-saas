# Gestor CRM Landing

Landing page institucional do Gestor CRM, construída com React + Vite + TypeScript, com backend inicial para integração de pagamentos via Mercado Pago.

## Stack

- React 19
- Vite 6
- TypeScript
- Express
- Recharts
- Lucide React
- Framer Motion
- Tailwind (via CDN no `index.html`)

## Como rodar localmente

Pré-requisito: Node.js 18+

1. Instale as dependências:
   `npm install`
2. Crie seu arquivo de ambiente a partir do exemplo:
   `cp .env.example .env.local` (Windows PowerShell: `Copy-Item .env.example .env.local`)
3. Preencha no `.env.local`:
   - `MP_ACCESS_TOKEN`
   - `MP_WEBHOOK_SECRET`
   - `APP_BASE_URL`
   - `INTERNAL_AUTH_SECRET`
   - `INTERNAL_AUTH_USERS_JSON`
   - `SUPABASE_URL` (recomendado em produção)
   - `SUPABASE_SERVICE_ROLE_KEY` (recomendado em produção)
   - `CRM_SYNC_URL` (opcional, recomendado)
   - `CRM_SYNC_TOKEN` (opcional)
4. Inicie frontend + backend:
   `npm run dev:full`
5. Acesse no navegador:
   `http://localhost:3000`

## Scripts

- `npm run dev` — inicia servidor de desenvolvimento
- `npm run dev:server` — inicia backend de pagamentos/webhooks na porta 4000
- `npm run dev:full` — inicia frontend e backend juntos
- `npm run build` — gera build de produção
- `npm run preview` — serve build localmente

## Endpoints Mercado Pago (backend)

- `POST /api/mercadopago/create-preference`
  - Cria preferência de checkout e retorna `checkoutUrl`.
- `POST /api/mercadopago/webhooks`
  - Recebe notificações Webhook e valida `x-signature` (HMAC SHA256).
- `POST /api/internal/auth/login`
   - Login do painel interno (sessão com cookie HttpOnly).
- `POST /api/internal/auth/logout`
   - Logout do painel interno.
- `GET /api/internal/auth/me`
   - Dados do usuário autenticado.
- `GET /api/public/plans`
   - Lista planos ativos para exibição no SaaS.
- `GET /api/internal/plans`
   - Lista catálogo completo de planos (somente admin).
- `POST /api/internal/plans`
   - Cria plano no catálogo (somente admin).
- `PUT /api/internal/plans/:id`
   - Atualiza plano no catálogo (somente admin).
- `DELETE /api/internal/plans/:id`
   - Remove plano do catálogo (somente admin).
- `GET /api/internal/payments`
   - Retorna snapshot JSON dos pagamentos/eventos (acesso protegido por perfil).
- `GET /internal/login`
   - Tela de login do painel interno.
- `GET /internal/payments`
   - Painel interno HTML de status dos pagamentos (acesso protegido por sessão).
- `GET /internal/plans`
   - Tela interna de CRUD de planos e valores (somente admin).
- `GET /api/health`
  - Healthcheck simples do backend.

## Catálogo de planos (admin)

- O checkout usa nome/valor oficiais do backend por `planId`.
- O frontend não define mais o valor final de cobrança no Mercado Pago.
- Alterações de nome/valor podem ser feitas em `/internal/plans` por usuário `admin`.

## Persistência de planos na Vercel (importante)

Em runtime serverless, memória/arquivo local não são persistentes entre deploys e reinicializações. Para manter alterações de planos:

1. Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` nas variáveis da Vercel.
2. Execute o script SQL [supabase/001_saas_plan_catalog.sql](supabase/001_saas_plan_catalog.sql) no SQL Editor do Supabase.
3. (Opcional) Defina `SUPABASE_PLAN_TABLE` caso use outro nome de tabela.

Sem Supabase configurado, o catálogo volta ao padrão após deploy/cold start no ambiente serverless.

## Validação de webhook implementada

O backend valida a assinatura usando o template:

`id:[data.id];request-id:[x-request-id];ts:[ts];`

com HMAC SHA256 e `MP_WEBHOOK_SECRET`, incluindo:

- comparação com `timingSafeEqual`
- tolerância de tempo configurável (`MP_WEBHOOK_TOLERANCE_SECONDS`)
- fallback para `data.id` vindo de query/body

## Painel interno de pagamentos

- URL local de login: `http://localhost:4000/internal/login`
- URL local: `http://localhost:4000/internal/payments`
- Proteção atual: login próprio com sessão (`cookie` HttpOnly)
- Perfis suportados: `admin`, `financeiro`, `suporte`
- Persistência atual: arquivo `data/payments-status.json`

## Sincronização com CRM (SaaS -> CRM)

Se `CRM_SYNC_URL` estiver configurado, cada evento de pagamento processado dispara um `POST` para o seu CRM com payload contendo:

- `syncKey` idempotente
- `paymentId`, `status`, `statusDetail`, `amount`
- `externalReference` e `planId` (extraído de `plan-<id>-<timestamp>`)
- `topic`, `action`, `notificationId`, `raw`

Use `CRM_SYNC_TOKEN` para autenticar essa chamada no CRM.

## Observações

- O tema e tokens de cor Tailwind estão definidos diretamente em `index.html`.
- Em desenvolvimento, o Vite faz proxy de `/api` para `http://localhost:4000`.
- Para produção, publique frontend e backend com URL HTTPS pública para receber webhooks.

## Deploy na Vercel

Este projeto está preparado para deploy único (frontend + API) na Vercel:

- Frontend estático via build do Vite (`dist`)
- API via função serverless em `api/index.js` (Express app em `server/index.js`)
- Rotas de API e painel interno definidas em `vercel.json`

### Variáveis de ambiente (produção)

Configure no painel da Vercel:

- `APP_BASE_URL=https://SEU_DOMINIO_VERCEL`
- `MP_ACCESS_TOKEN=APP_USR-...` (produção)
- `MP_WEBHOOK_SECRET=...` (assinatura secreta de produção)
- `MP_WEBHOOK_TOLERANCE_SECONDS=300`
- `MP_WEBHOOK_SKIP_SIGNATURE_VALIDATION=false`
- `INTERNAL_AUTH_SECRET=...` (segredo forte)
- `INTERNAL_AUTH_USERS_JSON=[{"username":"admin","password":"...","role":"admin"}]`
- `SUPABASE_URL=https://SEU_PROJETO.supabase.co` (recomendado)
- `SUPABASE_SERVICE_ROLE_KEY=...` (recomendado)
- `SUPABASE_PLAN_TABLE=saas_plan_catalog` (opcional)
- `CRM_SYNC_URL=https://SEU_CRM.vercel.app/api/...` (se aplicável)
- `CRM_SYNC_TOKEN=...` (se aplicável)

### Quando ativar credenciais de produção do Mercado Pago

Ative somente após:

1. Deploy concluído e estável na Vercel.
2. Login interno e painel funcionando em produção (`/internal/login`, `/internal/payments`).
3. Webhook configurado em **Suas integrações** com URL de produção:
   - `https://SEU_DOMINIO_VERCEL/api/mercadopago/webhooks?source_news=webhooks`
4. Simulação de webhook validada no painel do Mercado Pago.
5. Teste de pagamento real de baixo valor validando:
   - criação de checkout
   - recebimento de webhook
   - atualização no painel interno
   - sincronização com CRM (quando configurada)
