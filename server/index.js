import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 4000);
const MP_API_BASE = 'https://api.mercadopago.com';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';
const MP_NOTIFICATION_URL = process.env.MP_NOTIFICATION_URL || `${APP_BASE_URL}/api/mercadopago/webhooks?source_news=webhooks`;
const WEBHOOK_TOLERANCE_SECONDS = Number(process.env.MP_WEBHOOK_TOLERANCE_SECONDS || 300);
const SKIP_SIGNATURE_VALIDATION = process.env.MP_WEBHOOK_SKIP_SIGNATURE_VALIDATION === 'true';
const INTERNAL_DASHBOARD_USER = process.env.INTERNAL_DASHBOARD_USER || '';
const INTERNAL_DASHBOARD_PASSWORD = process.env.INTERNAL_DASHBOARD_PASSWORD || '';
const INTERNAL_AUTH_USERS_JSON = process.env.INTERNAL_AUTH_USERS_JSON || '';
const INTERNAL_AUTH_SECRET = process.env.INTERNAL_AUTH_SECRET || '';
const INTERNAL_AUTH_SESSION_HOURS = Number(process.env.INTERNAL_AUTH_SESSION_HOURS || 12);
const CRM_SYNC_URL = process.env.CRM_SYNC_URL || '';
const CRM_SYNC_TOKEN = process.env.CRM_SYNC_TOKEN || '';
const CRM_SYNC_TIMEOUT_MS = Number(process.env.CRM_SYNC_TIMEOUT_MS || 8000);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_PLAN_TABLE = process.env.SUPABASE_PLAN_TABLE || 'saas_plan_catalog';
const IS_SUPABASE_PLAN_PERSISTENCE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const SAAS_PUBLIC_URL = APP_BASE_URL;

const DEFAULT_PLAN_CATALOG = {
  'b2c-hunter': {
    id: 'b2c-hunter',
    name: 'Hunter Pro',
    unitPrice: 49,
    currency: 'BRL',
    active: true,
    buttonText: 'Assinar Pro',
  },
  'b2c-elite': {
    id: 'b2c-elite',
    name: 'Elite',
    unitPrice: 99,
    currency: 'BRL',
    active: true,
    buttonText: 'Assinar Elite',
  },
  'b2b-squad': {
    id: 'b2b-squad',
    name: 'Squad',
    unitPrice: 490,
    currency: 'BRL',
    active: true,
    buttonText: 'Teste Grátis',
  },
  'b2b-field': {
    id: 'b2b-field',
    name: 'Field Ops',
    unitPrice: 1200,
    currency: 'BRL',
    active: true,
    buttonText: 'Falar com Vendas',
  },
};

const INTERNAL_SESSION_COOKIE = 'saas_internal_session';

const parseInternalUsers = () => {
  if (INTERNAL_AUTH_USERS_JSON) {
    try {
      const parsed = JSON.parse(INTERNAL_AUTH_USERS_JSON);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && item.username && item.password)
          .map((item) => ({
            username: item.username,
            password: item.password,
            role: item.role || 'financeiro',
          }));
      }
    } catch {
      console.warn('[Internal auth] INTERNAL_AUTH_USERS_JSON inválido.');
    }
  }

  if (INTERNAL_DASHBOARD_USER && INTERNAL_DASHBOARD_PASSWORD) {
    return [
      {
        username: INTERNAL_DASHBOARD_USER,
        password: INTERNAL_DASHBOARD_PASSWORD,
        role: 'admin',
      },
    ];
  }

  return [];
};

const INTERNAL_USERS = parseInternalUsers();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'payments-status.json');
const IS_SERVERLESS_RUNTIME = process.env.VERCEL === '1';

const createEmptyDatabase = () => ({
  checkouts: [],
  payments: {},
  webhooks: [],
  crmSyncHistory: [],
  planCatalog: DEFAULT_PLAN_CATALOG,
  updatedAt: new Date().toISOString(),
});

let inMemoryDatabase = createEmptyDatabase();

const ensureDataFile = async () => {
  if (IS_SERVERLESS_RUNTIME) {
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(createEmptyDatabase(), null, 2), 'utf-8');
  }
};

const readDatabase = async () => {
  if (IS_SERVERLESS_RUNTIME) {
    return {
      checkouts: Array.isArray(inMemoryDatabase.checkouts) ? inMemoryDatabase.checkouts : [],
      payments: inMemoryDatabase.payments && typeof inMemoryDatabase.payments === 'object' ? inMemoryDatabase.payments : {},
      webhooks: Array.isArray(inMemoryDatabase.webhooks) ? inMemoryDatabase.webhooks : [],
      crmSyncHistory: Array.isArray(inMemoryDatabase.crmSyncHistory) ? inMemoryDatabase.crmSyncHistory : [],
      planCatalog: inMemoryDatabase.planCatalog && typeof inMemoryDatabase.planCatalog === 'object' ? inMemoryDatabase.planCatalog : DEFAULT_PLAN_CATALOG,
      updatedAt: inMemoryDatabase.updatedAt || new Date().toISOString(),
    };
  }

  await ensureDataFile();
  const raw = await fs.readFile(DB_PATH, 'utf-8');

  try {
    const parsed = JSON.parse(raw);
    return {
      checkouts: Array.isArray(parsed.checkouts) ? parsed.checkouts : [],
      payments: parsed.payments && typeof parsed.payments === 'object' ? parsed.payments : {},
      webhooks: Array.isArray(parsed.webhooks) ? parsed.webhooks : [],
      crmSyncHistory: Array.isArray(parsed.crmSyncHistory) ? parsed.crmSyncHistory : [],
      planCatalog: parsed.planCatalog && typeof parsed.planCatalog === 'object' ? parsed.planCatalog : DEFAULT_PLAN_CATALOG,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return createEmptyDatabase();
  }
};

const writeDatabase = async (db) => {
  const payload = {
    ...db,
    updatedAt: new Date().toISOString(),
  };

  if (IS_SERVERLESS_RUNTIME) {
    inMemoryDatabase = payload;
    return payload;
  }

  await fs.writeFile(DB_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  return payload;
};

const trimArray = (items, max) => {
  if (!Array.isArray(items)) return [];
  if (items.length <= max) return items;
  return items.slice(items.length - max);
};

const saveCheckoutRecord = async (record) => {
  const db = await readDatabase();
  db.checkouts.push(record);
  db.checkouts = trimArray(db.checkouts, 300);
  await writeDatabase(db);
};

const saveWebhookEvent = async (eventData) => {
  const db = await readDatabase();
  db.webhooks.push(eventData);
  db.webhooks = trimArray(db.webhooks, 500);
  await writeDatabase(db);
};

const upsertPaymentStatus = async ({ paymentId, data }) => {
  if (!paymentId) return;
  const db = await readDatabase();

  db.payments[paymentId] = {
    ...(db.payments[paymentId] || {}),
    ...data,
    paymentId,
    updatedAt: new Date().toISOString(),
  };

  const paymentEntries = Object.entries(db.payments)
    .sort(([, a], [, b]) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 500);

  db.payments = Object.fromEntries(paymentEntries);

  await writeDatabase(db);
};

const saveCrmSyncHistory = async (historyEntry) => {
  const db = await readDatabase();
  db.crmSyncHistory.push(historyEntry);
  db.crmSyncHistory = trimArray(db.crmSyncHistory, 1000);
  await writeDatabase(db);
};

const hasProcessedSyncKey = async (syncKey) => {
  if (!syncKey) return false;
  const db = await readDatabase();
  return db.crmSyncHistory.some((item) => item.syncKey === syncKey && item.status === 'success');
};

const getSupabaseBaseUrl = () => {
  if (!SUPABASE_URL) return '';
  return SUPABASE_URL.replace(/\/$/, '');
};

const buildSupabaseHeaders = () => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
});

const mapPlanRowToCatalogItem = (row) => ({
  id: row.id,
  name: row.name,
  unitPrice: Number(row.unit_price),
  currency: row.currency || 'BRL',
  active: row.active !== false,
  buttonText: row.button_text || 'Assinar',
  updatedAt: row.updated_at || new Date().toISOString(),
});

const fetchPlanCatalogFromSupabase = async () => {
  if (!IS_SUPABASE_PLAN_PERSISTENCE_ENABLED) {
    return { ok: false, reason: 'supabase-disabled', plans: [] };
  }

  try {
    const query = `select=id,name,unit_price,currency,active,button_text,updated_at`;
    const response = await fetch(`${getSupabaseBaseUrl()}/rest/v1/${SUPABASE_PLAN_TABLE}?${query}`, {
      method: 'GET',
      headers: buildSupabaseHeaders(),
    });

    const rows = await response.json().catch(() => []);

    if (!response.ok) {
      return { ok: false, reason: 'supabase-read-error', plans: [] };
    }

    if (!Array.isArray(rows)) {
      return { ok: true, plans: [] };
    }

    return {
      ok: true,
      plans: rows.map(mapPlanRowToCatalogItem),
    };
  } catch {
    return { ok: false, reason: 'supabase-read-exception', plans: [] };
  }
};

const upsertPlanCatalogInSupabase = async (plan) => {
  if (!IS_SUPABASE_PLAN_PERSISTENCE_ENABLED) {
    return { ok: false, reason: 'supabase-disabled' };
  }

  try {
    const payload = {
      id: plan.id,
      name: plan.name,
      unit_price: Number(plan.unitPrice),
      currency: plan.currency || 'BRL',
      active: plan.active !== false,
      button_text: plan.buttonText || 'Assinar',
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(`${getSupabaseBaseUrl()}/rest/v1/${SUPABASE_PLAN_TABLE}`, {
      method: 'POST',
      headers: {
        ...buildSupabaseHeaders(),
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    });

    const rows = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(rows) || !rows.length) {
      return { ok: false, reason: 'supabase-upsert-error' };
    }

    return { ok: true, plan: mapPlanRowToCatalogItem(rows[0]) };
  } catch {
    return { ok: false, reason: 'supabase-upsert-exception' };
  }
};

const deletePlanCatalogInSupabase = async (planId) => {
  if (!IS_SUPABASE_PLAN_PERSISTENCE_ENABLED) {
    return { ok: false, reason: 'supabase-disabled' };
  }

  try {
    const response = await fetch(`${getSupabaseBaseUrl()}/rest/v1/${SUPABASE_PLAN_TABLE}?id=eq.${encodeURIComponent(planId)}`, {
      method: 'DELETE',
      headers: {
        ...buildSupabaseHeaders(),
        Prefer: 'return=representation',
      },
    });

    const rows = await response.json().catch(() => []);
    if (!response.ok) {
      return { ok: false, reason: 'supabase-delete-error' };
    }

    if (!Array.isArray(rows) || !rows.length) {
      return { ok: false, reason: 'not-found' };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: 'supabase-delete-exception' };
  }
};

const sanitizePlanRecord = (input, fallbackId = '') => {
  const normalizedId = (input?.id || fallbackId || '').toString().trim().toLowerCase();
  const normalizedName = (input?.name || '').toString().trim();
  const parsedPrice = Number(input?.unitPrice);
  const normalizedButtonText = (input?.buttonText || '').toString().trim();

  if (!normalizedId || !normalizedName || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return null;
  }

  return {
    id: normalizedId,
    name: normalizedName,
    unitPrice: parsedPrice,
    currency: 'BRL',
    active: input?.active !== false,
    buttonText: normalizedButtonText || 'Assinar',
    updatedAt: new Date().toISOString(),
  };
};

const getPlanCatalog = async () => {
  if (IS_SUPABASE_PLAN_PERSISTENCE_ENABLED) {
    const supabaseResult = await fetchPlanCatalogFromSupabase();
    if (supabaseResult.ok && supabaseResult.plans.length) {
      return Object.fromEntries(supabaseResult.plans.map((plan) => [plan.id, plan]));
    }
  }

  const db = await readDatabase();
  return db.planCatalog || DEFAULT_PLAN_CATALOG;
};

const getPlanCatalogEntries = async ({ includeInactive = true } = {}) => {
  const catalog = await getPlanCatalog();
  const plans = Object.values(catalog || {});
  return includeInactive ? plans : plans.filter((plan) => plan.active !== false);
};

const getCatalogPlanById = async (planId) => {
  const catalog = await getPlanCatalog();
  return catalog?.[planId] || null;
};

const savePlanCatalogRecord = async (planInput, fallbackId = '') => {
  const normalized = sanitizePlanRecord(planInput, fallbackId);
  if (!normalized) {
    return { ok: false, reason: 'invalid-plan-payload' };
  }

  if (IS_SUPABASE_PLAN_PERSISTENCE_ENABLED) {
    const supabaseResult = await upsertPlanCatalogInSupabase(normalized);
    if (supabaseResult.ok) {
      return { ok: true, plan: supabaseResult.plan };
    }
  }

  const db = await readDatabase();
  db.planCatalog = db.planCatalog && typeof db.planCatalog === 'object' ? db.planCatalog : { ...DEFAULT_PLAN_CATALOG };
  db.planCatalog[normalized.id] = {
    ...(db.planCatalog[normalized.id] || {}),
    ...normalized,
  };

  await writeDatabase(db);
  return { ok: true, plan: db.planCatalog[normalized.id] };
};

const deletePlanCatalogRecord = async (planId) => {
  if (IS_SUPABASE_PLAN_PERSISTENCE_ENABLED) {
    const supabaseResult = await deletePlanCatalogInSupabase(planId);
    if (supabaseResult.ok || supabaseResult.reason === 'not-found') {
      return supabaseResult;
    }
  }

  const db = await readDatabase();
  if (!db.planCatalog || !db.planCatalog[planId]) {
    return { ok: false, reason: 'not-found' };
  }

  delete db.planCatalog[planId];
  await writeDatabase(db);
  return { ok: true };
};

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return {};

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) return acc;

      const key = part.slice(0, separatorIndex);
      const value = decodeURIComponent(part.slice(separatorIndex + 1));
      acc[key] = value;
      return acc;
    }, {});
};

const toBase64Url = (value) =>
  Buffer.from(value, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const withPadding = pad === 0 ? normalized : normalized + '='.repeat(4 - pad);
  return Buffer.from(withPadding, 'base64').toString('utf-8');
};

const signInternalSessionPayload = (payloadBase64Url) =>
  crypto.createHmac('sha256', INTERNAL_AUTH_SECRET).update(payloadBase64Url).digest('hex');

const createSignedSessionToken = ({ username, role, expiresAt }) => {
  const payload = toBase64Url(JSON.stringify({ username, role, expiresAt }));
  const signature = signInternalSessionPayload(payload);
  return `${payload}.${signature}`;
};

const verifySignedSessionToken = (token) => {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64Url, signature] = parts;
  const expectedSignature = signInternalSessionPayload(payloadBase64Url);

  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');

  if (!expectedBuffer.length || expectedBuffer.length !== signatureBuffer.length) return null;
  if (!crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  try {
    const decoded = fromBase64Url(payloadBase64Url);
    const parsed = JSON.parse(decoded);
    if (!parsed?.username || !parsed?.role || !parsed?.expiresAt) return null;
    if (Date.now() > Number(parsed.expiresAt)) return null;
    return {
      username: parsed.username,
      role: parsed.role,
      expiresAt: Number(parsed.expiresAt),
    };
  } catch {
    return null;
  }
};

const createCookieHeader = (token, options = {}) => {
  const attributes = [`${INTERNAL_SESSION_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];

  if (APP_BASE_URL.startsWith('https://')) {
    attributes.push('Secure');
  }

  if (typeof options.maxAge === 'number') {
    attributes.push(`Max-Age=${options.maxAge}`);
  }

  return attributes.join('; ');
};

const getInternalUserByCredentials = (username, password) =>
  INTERNAL_USERS.find((user) => user.username === username && user.password === password) || null;

const isApiRequest = (req) => req.path.startsWith('/api/');

const requireInternalAccess = (allowedRoles = []) => (req, res, next) => {
  if (!INTERNAL_AUTH_SECRET) {
    return res.status(503).json({
      ok: false,
      message: 'Configure INTERNAL_AUTH_SECRET no ambiente.',
    });
  }

  if (!INTERNAL_USERS.length) {
    return res.status(503).json({
      ok: false,
      message: 'Configure INTERNAL_AUTH_USERS_JSON (ou INTERNAL_DASHBOARD_USER/PASSWORD) no ambiente.',
    });
  }

  const cookies = parseCookies(req.get('cookie') || '');
  const sessionToken = cookies[INTERNAL_SESSION_COOKIE];

  if (!sessionToken) {
    if (isApiRequest(req)) {
      return res.status(401).json({ ok: false, message: 'Sessão inválida.' });
    }

    return res.redirect('/internal/login');
  }

  const session = verifySignedSessionToken(sessionToken);
  if (!session) {
    if (isApiRequest(req)) {
      return res.status(401).json({ ok: false, message: 'Sessão inválida.' });
    }
    return res.redirect('/internal/login');
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length && !allowedRoles.includes(session.role)) {
    return res.status(403).json({ ok: false, message: 'Acesso negado para este perfil.' });
  }

  req.internalUser = { username: session.username, role: session.role, sessionToken };
  return next();
};

const buildDashboardHtml = (snapshot, user) => {
  const paymentRows = snapshot.payments
    .map((payment) => `<tr>
      <td>${payment.paymentId || '-'}</td>
      <td>${payment.planId || '-'}</td>
      <td>${payment.topic || '-'}</td>
      <td>${payment.status || '-'}</td>
      <td>${payment.statusDetail || '-'}</td>
      <td>${payment.amount != null ? `R$ ${payment.amount}` : '-'}</td>
      <td>${payment.crmSyncStatus || '-'}</td>
      <td>${payment.updatedAt || '-'}</td>
    </tr>`)
    .join('');

  const webhookRows = snapshot.webhooks
    .map((event) => `<tr>
      <td>${event.receivedAt || '-'}</td>
      <td>${event.topic || '-'}</td>
      <td>${event.action || '-'}</td>
      <td>${event.resourceId || '-'}</td>
      <td>${event.verification || '-'}</td>
    </tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Painel Interno - Pagamentos</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; background: #0b1220; color: #e2e8f0; margin: 0; padding: 24px; }
    h1, h2 { margin: 0 0 12px 0; }
    .meta { color: #94a3b8; margin-bottom: 20px; }
    .card { background: #111827; border: 1px solid #334155; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #1e293b; padding: 10px; text-align: left; }
    th { color: #7dd3fc; font-weight: 600; }
    tr:hover { background: #0f172a; }
    .small { color: #94a3b8; font-size: 12px; }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .logout { border: 0; background: #0ea5e9; color: #082f49; border-radius: 8px; padding: 8px 12px; cursor: pointer; font-weight: 600; }
    .nav-btn { border: 1px solid #334155; background: transparent; color: #cbd5e1; border-radius: 8px; padding: 8px 12px; cursor: pointer; font-weight: 600; text-decoration: none; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Painel Interno de Pagamentos</h1>
    <div>
      <span class="small">Usuário: ${user?.username || '-'} (${user?.role || '-'})</span>
      ${user?.role === 'admin' ? '<a class="nav-btn" href="/internal/plans">Gerenciar planos</a>' : ''}
      <button class="logout" id="logout-btn" type="button">Sair</button>
    </div>
  </div>
  <div class="meta">Atualizado em: ${snapshot.updatedAt} · Total pagamentos: ${snapshot.payments.length} · Total webhooks: ${snapshot.webhooks.length}</div>

  <div class="card">
    <h2>Status de pagamentos</h2>
    <table>
      <thead>
        <tr>
          <th>Payment ID</th>
          <th>Plano</th>
          <th>Tópico</th>
          <th>Status</th>
          <th>Status detail</th>
          <th>Valor</th>
          <th>Sync CRM</th>
          <th>Atualizado</th>
        </tr>
      </thead>
      <tbody>
        ${paymentRows || '<tr><td colspan="8">Sem pagamentos registrados</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>Eventos de webhook</h2>
    <table>
      <thead>
        <tr>
          <th>Recebido em</th>
          <th>Tópico</th>
          <th>Ação</th>
          <th>Recurso</th>
          <th>Validação</th>
        </tr>
      </thead>
      <tbody>
        ${webhookRows || '<tr><td colspan="5">Sem webhooks registrados</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="small">Acesso por sessão HttpOnly e perfil interno. Próxima etapa: integrar SSO/JWT corporativo.</div>
  <script>
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await fetch('/api/internal/auth/logout', { method: 'POST' });
      window.location.href = '${SAAS_PUBLIC_URL}';
    });
  </script>
</body>
</html>`;
};

const buildInternalLoginHtml = () => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Login interno - Pagamentos</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #050b14; color: #e2e8f0; font-family: Inter, Arial, sans-serif; }
    .card { width: 100%; max-width: 380px; background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 24px; box-sizing: border-box; }
    h1 { margin: 0 0 8px 0; font-size: 22px; }
    p { color: #94a3b8; margin: 0 0 20px 0; font-size: 14px; }
    label { display: block; font-size: 13px; color: #cbd5e1; margin-bottom: 6px; }
    input { width: 100%; box-sizing: border-box; border-radius: 8px; border: 1px solid #334155; background: #020617; color: #e2e8f0; padding: 10px 12px; margin-bottom: 14px; }
    button { width: 100%; border: 0; border-radius: 8px; background: #00d4ff; color: #052033; font-weight: 700; padding: 10px 12px; cursor: pointer; }
    .btn-secondary { width: 100%; border: 1px solid #334155; border-radius: 8px; background: transparent; color: #e2e8f0; font-weight: 700; padding: 10px 12px; cursor: pointer; margin-top: 8px; }
    .error { margin-top: 10px; color: #fb7185; font-size: 13px; min-height: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Painel interno</h1>
    <p>Faça login para acessar o monitoramento de pagamentos.</p>
    <form id="login-form">
      <label for="username">Usuário</label>
      <input id="username" name="username" autocomplete="username" required />
      <label for="password">Senha</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <button type="submit">Entrar</button>
      <button type="button" id="leave-login" class="btn-secondary">Sair</button>
      <div class="error" id="error-message"></div>
    </form>
  </div>

  <script>
    const form = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorMessage.textContent = '';

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      const response = await fetch('/api/internal/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        errorMessage.textContent = data.message || 'Não foi possível autenticar.';
        return;
      }

      window.location.href = '/internal/payments';
    });

    document.getElementById('leave-login').addEventListener('click', async () => {
      await fetch('/api/internal/auth/logout', { method: 'POST' });
      window.location.href = '${SAAS_PUBLIC_URL}';
    });
  </script>
</body>
</html>`;

const buildPlansAdminHtml = (plans, user) => {
  const rows = plans
    .map(
      (plan) => `<tr>
        <td>${plan.id}</td>
        <td>${plan.name}</td>
        <td>R$ ${plan.unitPrice}</td>
        <td>${plan.buttonText || 'Assinar'}</td>
        <td>${plan.active === false ? 'Inativo' : 'Ativo'}</td>
        <td>
          <button type="button" class="btn" onclick="editPlan('${plan.id}')">Editar</button>
          <button type="button" class="btn danger" onclick="deletePlan('${plan.id}')">Excluir</button>
        </td>
      </tr>`
    )
    .join('');

  const plansJson = JSON.stringify(plans || []);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Admin - Planos</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; background: #0b1220; color: #e2e8f0; margin: 0; padding: 24px; }
    h1, h2 { margin: 0 0 12px 0; }
    .meta { color: #94a3b8; margin-bottom: 20px; }
    .header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; align-items: center; }
    .card { background: #111827; border: 1px solid #334155; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #1e293b; padding: 10px; text-align: left; }
    th { color: #7dd3fc; font-weight: 600; }
    input, select { width: 100%; box-sizing: border-box; border-radius: 8px; border: 1px solid #334155; background: #020617; color: #e2e8f0; padding: 10px; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .btn { border: 0; background: #0ea5e9; color: #082f49; border-radius: 8px; padding: 8px 12px; cursor: pointer; font-weight: 700; margin-right: 6px; }
    .btn.secondary { background: #334155; color: #e2e8f0; }
    .btn.danger { background: #ef4444; color: #fff; }
    .small { color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Gerenciar Planos do SaaS</h1>
      <div class="meta">Usuário: ${user?.username || '-'} (${user?.role || '-'})</div>
    </div>
    <div>
      <a class="btn secondary" href="/internal/payments">Voltar ao painel</a>
      <button class="btn" id="logout-btn" type="button">Sair</button>
    </div>
  </div>

  <div class="card">
    <h2>Criar / editar plano</h2>
    <form id="plan-form">
      <div class="grid">
        <div>
          <label>ID do plano</label>
          <input id="plan-id" placeholder="ex: b2c-hunter" required />
        </div>
        <div>
          <label>Nome</label>
          <input id="plan-name" placeholder="ex: Hunter Pro" required />
        </div>
        <div>
          <label>Valor (R$)</label>
          <input id="plan-price" type="number" min="1" step="0.01" required />
        </div>
        <div>
          <label>Texto do botão</label>
          <input id="plan-button" placeholder="ex: Assinar Pro" required />
        </div>
        <div>
          <label>Status</label>
          <select id="plan-active">
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
      </div>
      <button class="btn" type="submit">Salvar plano</button>
      <button class="btn secondary" type="button" id="reset-form">Limpar</button>
      <div class="small" id="form-message"></div>
    </form>
  </div>

  <div class="card">
    <h2>Planos cadastrados</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>Valor</th>
          <th>Botão</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="6">Nenhum plano cadastrado.</td></tr>'}
      </tbody>
    </table>
  </div>

  <script>
    const plans = ${plansJson};
    const form = document.getElementById('plan-form');
    const message = document.getElementById('form-message');

    const resetForm = () => {
      document.getElementById('plan-id').value = '';
      document.getElementById('plan-name').value = '';
      document.getElementById('plan-price').value = '';
      document.getElementById('plan-button').value = '';
      document.getElementById('plan-active').value = 'true';
    };

    const editPlan = (planId) => {
      const plan = plans.find((item) => item.id === planId);
      if (!plan) return;
      document.getElementById('plan-id').value = plan.id || '';
      document.getElementById('plan-name').value = plan.name || '';
      document.getElementById('plan-price').value = plan.unitPrice || '';
      document.getElementById('plan-button').value = plan.buttonText || '';
      document.getElementById('plan-active').value = plan.active === false ? 'false' : 'true';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deletePlan = async (planId) => {
      const confirmed = window.confirm('Deseja excluir o plano ' + planId + '?');
      if (!confirmed) return;

      const response = await fetch('/api/internal/plans/' + encodeURIComponent(planId), { method: 'DELETE' });
      if (!response.ok) {
        message.textContent = 'Falha ao excluir plano.';
        return;
      }

      window.location.reload();
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      message.textContent = '';

      const payload = {
        id: document.getElementById('plan-id').value,
        name: document.getElementById('plan-name').value,
        unitPrice: Number(document.getElementById('plan-price').value),
        buttonText: document.getElementById('plan-button').value,
        active: document.getElementById('plan-active').value === 'true',
      };

      const response = await fetch('/api/internal/plans/' + encodeURIComponent(payload.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        message.textContent = data.message || 'Falha ao salvar plano.';
        return;
      }

      message.textContent = 'Plano salvo com sucesso.';
      window.location.reload();
    });

    document.getElementById('reset-form').addEventListener('click', resetForm);
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await fetch('/api/internal/auth/logout', { method: 'POST' });
      window.location.href = '${SAAS_PUBLIC_URL}';
    });

    window.editPlan = editPlan;
    window.deletePlan = deletePlan;
  </script>
</body>
</html>`;
};

const getDashboardSnapshot = async () => {
  const db = await readDatabase();
  const payments = Object.values(db.payments)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 150);

  const webhooks = [...db.webhooks]
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 200);

  return {
    updatedAt: db.updatedAt,
    payments,
    webhooks,
  };
};

const toSingleValue = (value) => {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value ?? '';
};

const parseXSignature = (xSignatureHeader) => {
  const result = { ts: '', v1: '' };
  const parts = (xSignatureHeader || '').split(',');

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (!key || !value) continue;

    const normalizedKey = key.trim();
    const normalizedValue = value.trim();

    if (normalizedKey === 'ts') {
      result.ts = normalizedValue;
    }

    if (normalizedKey === 'v1') {
      result.v1 = normalizedValue;
    }
  }

  return result;
};

const normalizeResourceId = (id) => {
  if (!id) return '';
  if (/^[a-zA-Z0-9]+$/.test(id)) {
    return id.toLowerCase();
  }
  return id;
};

const buildManifest = ({ dataId, requestId, ts }) => {
  let manifest = '';
  if (dataId) manifest += `id:${dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  if (ts) manifest += `ts:${ts};`;
  return manifest;
};

const isTimestampWithinTolerance = (tsValue) => {
  const tsAsNumber = Number(tsValue);
  if (!Number.isFinite(tsAsNumber)) return false;

  const tsInSeconds = tsAsNumber > 1_000_000_000_000 ? Math.floor(tsAsNumber / 1000) : tsAsNumber;
  const nowInSeconds = Math.floor(Date.now() / 1000);

  return Math.abs(nowInSeconds - tsInSeconds) <= WEBHOOK_TOLERANCE_SECONDS;
};

const safeCompareHash = (expected, received) => {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');

  if (!expectedBuffer.length || expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const verifyWebhookSignature = (req) => {
  if (SKIP_SIGNATURE_VALIDATION) {
    return { valid: true, reason: 'skip-signature-validation' };
  }

  if (!WEBHOOK_SECRET) {
    return { valid: false, reason: 'missing-webhook-secret' };
  }

  const xSignature = req.get('x-signature') || '';
  const xRequestId = req.get('x-request-id') || '';
  const { ts, v1 } = parseXSignature(xSignature);

  if (!ts || !v1) {
    return { valid: false, reason: 'missing-ts-or-v1' };
  }

  if (!isTimestampWithinTolerance(ts)) {
    return { valid: false, reason: 'timestamp-out-of-tolerance' };
  }

  const queryDataId = toSingleValue(req.query['data.id']);
  const bodyDataId = req.body?.data?.id?.toString() || '';
  const dataId = normalizeResourceId(queryDataId || bodyDataId);
  const manifest = buildManifest({ dataId, requestId: xRequestId, ts });

  if (!manifest) {
    return { valid: false, reason: 'manifest-empty' };
  }

  const expectedHash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex');

  const valid = safeCompareHash(expectedHash, v1);
  return { valid, reason: valid ? 'ok' : 'hash-mismatch' };
};

const getResourceEndpoint = (topic, resourceId) => {
  if (topic === 'payment') {
    return `${MP_API_BASE}/v1/payments/${resourceId}`;
  }

  if (topic === 'order' || topic === 'orders') {
    return `${MP_API_BASE}/v1/orders/${resourceId}`;
  }

  return '';
};

const fetchMercadoPagoResource = async (topic, resourceId) => {
  const endpoint = getResourceEndpoint(topic, resourceId);
  if (!endpoint) {
    return { ok: false, reason: 'unsupported-topic' };
  }

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      reason: 'mercadopago-api-error',
      status: response.status,
      data,
    };
  }

  return { ok: true, data };
};

const extractPlanIdFromExternalReference = (externalReference) => {
  if (!externalReference || typeof externalReference !== 'string') return '';
  const match = externalReference.match(/^plan-([a-zA-Z0-9-]+)-\d+$/);
  return match ? match[1] : '';
};

const syncPaymentToCrm = async (payload) => {
  if (!CRM_SYNC_URL) {
    return { ok: false, skipped: true, reason: 'missing-crm-sync-url' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CRM_SYNC_TIMEOUT_MS);

  try {
    const response = await fetch(CRM_SYNC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CRM_SYNC_TOKEN ? { Authorization: `Bearer ${CRM_SYNC_TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        reason: 'crm-sync-http-error',
        status: response.status,
        data,
      };
    }

    return {
      ok: true,
      skipped: false,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason: error instanceof Error ? error.message : 'crm-sync-error',
    };
  } finally {
    clearTimeout(timeout);
  }
};

const processWebhook = async (payload, query) => {
  const topic = payload?.type || payload?.topic || '';
  const queryDataId = toSingleValue(query['data.id']);
  const bodyDataId = payload?.data?.id?.toString() || payload?.id?.toString() || '';
  const resourceId = queryDataId || bodyDataId;
  const syncKey = `${payload?.id || 'no-notification-id'}:${topic}:${payload?.action || 'unknown-action'}:${resourceId || 'no-resource'}`;

  await saveWebhookEvent({
    receivedAt: new Date().toISOString(),
    topic,
    action: payload?.action || '',
    resourceId,
    verification: 'ok',
    payload,
  });

  if (!topic || !resourceId) {
    console.warn('[MP webhook] ignored notification with missing topic/resourceId', {
      topic,
      resourceId,
    });
    return;
  }

  if (!ACCESS_TOKEN) {
    console.warn('[MP webhook] MP_ACCESS_TOKEN is not configured; notification received but details were not fetched');
    return;
  }

  const resource = await fetchMercadoPagoResource(topic, resourceId);

  if (!resource.ok) {
    console.warn('[MP webhook] failed to fetch resource details', {
      topic,
      resourceId,
      ...resource,
    });
    return;
  }

  console.info('[MP webhook] notification processed', {
    topic,
    action: payload?.action,
    resourceId,
    status: resource.data?.status,
    statusDetail: resource.data?.status_detail,
  });

  const paymentId = resource.data?.id?.toString() || resourceId?.toString() || '';
  const externalReference = resource.data?.external_reference || '';
  const planId = extractPlanIdFromExternalReference(externalReference);

  await upsertPaymentStatus({
    paymentId,
    data: {
      topic,
      action: payload?.action || '',
      resourceId,
      status: resource.data?.status || resource.data?.order_status || '',
      statusDetail: resource.data?.status_detail || resource.data?.status || '',
      amount: resource.data?.transaction_amount || resource.data?.total_amount || null,
      externalReference,
      planId,
      raw: resource.data,
    },
  });

  const alreadySynced = await hasProcessedSyncKey(syncKey);
  if (alreadySynced) {
    return;
  }

  const crmPayload = {
    source: 'gestor-saas-mercadopago',
    syncKey,
    topic,
    action: payload?.action || '',
    notificationId: payload?.id || null,
    paymentId,
    resourceId,
    status: resource.data?.status || resource.data?.order_status || '',
    statusDetail: resource.data?.status_detail || '',
    amount: resource.data?.transaction_amount || resource.data?.total_amount || null,
    externalReference,
    planId,
    payerEmail: resource.data?.payer?.email || '',
    occurredAt: payload?.date_created || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    raw: resource.data,
  };

  const syncResult = await syncPaymentToCrm(crmPayload);

  await saveCrmSyncHistory({
    syncKey,
    paymentId,
    topic,
    action: payload?.action || '',
    status: syncResult.ok ? 'success' : syncResult.skipped ? 'skipped' : 'failed',
    details: syncResult,
    syncedAt: new Date().toISOString(),
  });

  await upsertPaymentStatus({
    paymentId,
    data: {
      crmSyncStatus: syncResult.ok ? 'success' : syncResult.skipped ? 'skipped' : 'failed',
      crmSyncReason: syncResult.reason || '',
    },
  });
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'mercadopago-integration', timestamp: new Date().toISOString() });
});

app.get('/internal/login', (_req, res) => {
  return res.status(200).send(buildInternalLoginHtml());
});

app.post('/api/internal/auth/login', (req, res) => {
  if (!INTERNAL_AUTH_SECRET) {
    return res.status(503).json({ ok: false, message: 'INTERNAL_AUTH_SECRET não configurado.' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Informe usuário e senha.' });
  }

  const internalUser = getInternalUserByCredentials(username, password);
  if (!internalUser) {
    return res.status(401).json({ ok: false, message: 'Credenciais inválidas.' });
  }

  const sessionDurationSeconds = Math.max(1, Math.floor(INTERNAL_AUTH_SESSION_HOURS * 3600));
  const expiresAt = Date.now() + sessionDurationSeconds * 1000;

  const sessionToken = createSignedSessionToken({
    username: internalUser.username,
    role: internalUser.role,
    expiresAt,
  });

  res.setHeader('Set-Cookie', createCookieHeader(sessionToken, { maxAge: sessionDurationSeconds }));

  return res.status(200).json({
    ok: true,
    user: {
      username: internalUser.username,
      role: internalUser.role,
    },
  });
});

app.post('/api/internal/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', createCookieHeader('', { maxAge: 0 }));
  return res.status(200).json({ ok: true });
});

app.get('/api/internal/auth/me', requireInternalAccess(), (req, res) => {
  return res.status(200).json({ ok: true, user: req.internalUser });
});

app.get('/api/public/plans', async (_req, res) => {
  const plans = await getPlanCatalogEntries({ includeInactive: false });
  return res.status(200).json({ ok: true, plans });
});

app.get('/api/internal/plans', requireInternalAccess(['admin']), async (_req, res) => {
  const plans = await getPlanCatalogEntries({ includeInactive: true });
  return res.status(200).json({ ok: true, plans });
});

app.get('/internal/plans', requireInternalAccess(['admin']), async (req, res) => {
  const plans = await getPlanCatalogEntries({ includeInactive: true });
  return res.status(200).send(buildPlansAdminHtml(plans, req.internalUser));
});

app.post('/api/internal/plans', requireInternalAccess(['admin']), async (req, res) => {
  const result = await savePlanCatalogRecord(req.body || {});
  if (!result.ok) {
    return res.status(400).json({ ok: false, message: 'Payload de plano inválido.' });
  }
  return res.status(201).json({ ok: true, plan: result.plan });
});

app.put('/api/internal/plans/:id', requireInternalAccess(['admin']), async (req, res) => {
  const planId = (req.params.id || '').toString().trim().toLowerCase();
  const result = await savePlanCatalogRecord({ ...(req.body || {}), id: planId }, planId);
  if (!result.ok) {
    return res.status(400).json({ ok: false, message: 'Payload de plano inválido.' });
  }
  return res.status(200).json({ ok: true, plan: result.plan });
});

app.delete('/api/internal/plans/:id', requireInternalAccess(['admin']), async (req, res) => {
  const planId = (req.params.id || '').toString().trim().toLowerCase();
  const result = await deletePlanCatalogRecord(planId);
  if (!result.ok) {
    return res.status(404).json({ ok: false, message: 'Plano não encontrado.' });
  }
  return res.status(200).json({ ok: true });
});

app.post('/api/mercadopago/create-preference', async (req, res) => {
  try {
    if (!ACCESS_TOKEN) {
      return res.status(500).json({
        ok: false,
        message: 'MP_ACCESS_TOKEN não configurado no servidor.',
      });
    }

    const { planId, quantity = 1, payerEmail } = req.body || {};

    if (!planId) {
      return res.status(400).json({
        ok: false,
        message: 'Campo obrigatório: planId.',
      });
    }

    const catalogPlan = await getCatalogPlanById(planId);
    if (!catalogPlan || catalogPlan.active === false) {
      return res.status(400).json({
        ok: false,
        message: 'Plano inválido ou indisponível para checkout.',
      });
    }

    const parsedUnitPrice = Number(catalogPlan.unitPrice);
    const parsedQuantity = Number(quantity);

    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'unitPrice inválido.',
      });
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({
        ok: false,
        message: 'quantity inválido.',
      });
    }

    const preferencePayload = {
      items: [
        {
          id: planId,
          title: `${catalogPlan.name} - Gestor CRM`,
          quantity: parsedQuantity,
          currency_id: catalogPlan.currency || 'BRL',
          unit_price: parsedUnitPrice,
        },
      ],
      external_reference: `plan-${planId}-${Date.now()}`,
      notification_url: MP_NOTIFICATION_URL,
      back_urls: {
        success: `${APP_BASE_URL}/?payment=success`,
        pending: `${APP_BASE_URL}/?payment=pending`,
        failure: `${APP_BASE_URL}/?payment=failure`,
      },
      auto_return: 'approved',
    };

    if (payerEmail) {
      preferencePayload.payer = { email: payerEmail };
    }

    const response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        message: 'Falha ao criar preferência no Mercado Pago.',
        details: data,
      });
    }

    await saveCheckoutRecord({
      createdAt: new Date().toISOString(),
      planId,
      title: `${catalogPlan.name} - Gestor CRM`,
      quantity: parsedQuantity,
      unitPrice: parsedUnitPrice,
      preferenceId: data.id || '',
      checkoutUrl: data.init_point || '',
      sandboxCheckoutUrl: data.sandbox_init_point || '',
      externalReference: preferencePayload.external_reference,
      status: 'preference_created',
    });

    return res.status(201).json({
      ok: true,
      id: data.id,
      checkoutUrl: data.init_point,
      sandboxCheckoutUrl: data.sandbox_init_point,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: 'Erro inesperado ao criar preferência.',
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }
});

app.get('/api/internal/payments', requireInternalAccess(['admin', 'financeiro', 'suporte']), async (_req, res) => {
  const snapshot = await getDashboardSnapshot();
  return res.json({ ok: true, ...snapshot });
});

app.get('/internal/payments', requireInternalAccess(['admin', 'financeiro', 'suporte']), async (req, res) => {
  const snapshot = await getDashboardSnapshot();
  return res.status(200).send(buildDashboardHtml(snapshot, req.internalUser));
});

app.post('/api/mercadopago/webhooks', async (req, res) => {
  const verification = verifyWebhookSignature(req);

  if (!verification.valid) {
    await saveWebhookEvent({
      receivedAt: new Date().toISOString(),
      topic: req.body?.type || req.body?.topic || '',
      action: req.body?.action || '',
      resourceId: toSingleValue(req.query['data.id']) || req.body?.data?.id || '',
      verification: verification.reason,
      payload: req.body,
    });

    return res.status(401).json({
      ok: false,
      message: 'Webhook inválido.',
      reason: verification.reason,
    });
  }

  res.status(200).json({ ok: true });

  setImmediate(() => {
    processWebhook(req.body, req.query).catch((error) => {
      console.error('[MP webhook] processing error', error);
    });
  });
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.info(`Mercado Pago backend running at http://localhost:${PORT}`);
    console.info(`Internal login at http://localhost:${PORT}/internal/login`);
    console.info(`Internal dashboard at http://localhost:${PORT}/internal/payments`);
    console.info(`Plan catalog persistence: ${IS_SUPABASE_PLAN_PERSISTENCE_ENABLED ? `supabase (${SUPABASE_PLAN_TABLE})` : 'local/in-memory (não persistente na Vercel)'}`);
    console.info(`CRM sync ${CRM_SYNC_URL ? `enabled -> ${CRM_SYNC_URL}` : 'disabled (CRM_SYNC_URL not configured)'}`);
  });
}

export default app;
