const { verifyToken } = require('./token'); // ok if you don't use it; try/catch below
const { getUserByEmail, ensureUser } = require('./db');

const ALLOWED_ROLES = new Set(['creator', 'consumer', 'admin']);

// ----- Identity extractors -----

function parseBearerJwt(req) {
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length).trim();
  try {
    const payload = verifyToken ? verifyToken(token) : null;
    if (payload?.email) {
      const role = String(payload.role || '').toLowerCase();
      return {
        email: String(payload.email).toLowerCase(),
        provider: 'token',
        role: ALLOWED_ROLES.has(role) ? role : undefined,
      };
    }
  } catch (_) {
    // invalid token
  }
  return null;
}

function parseSwaPrincipal(req) {
  // Azure Static Web Apps
  const b64 = req.headers['x-ms-client-principal'];
  if (!b64) return null;
  try {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const p = JSON.parse(json);
    const email = String(p.userDetails || '').toLowerCase();
    if (!email) return null;

    // SWA can also carry roles, but we prefer DB as source of truth.
    // Still, keep it if present and valid.
    let role;
    const roles = Array.isArray(p.userRoles) ? p.userRoles.map(r => String(r).toLowerCase()) : [];
    if (roles.length) {
      const hit = roles.find(r => ALLOWED_ROLES.has(r));
      if (hit) role = hit;
    }
    return { email, provider: p.identityProvider || 'swa', role };
  } catch {
    return null;
  }
}

function parseDevHeaders(req) {
  // Local/dev override from SPA
  const email = (req.headers['x-user-email'] || req.headers['x-user'])?.toString().toLowerCase().trim();
  if (!email) return null;
  const hdrRole = String(req.headers['x-user-role'] || '').toLowerCase().trim();
  const role = ALLOWED_ROLES.has(hdrRole) ? hdrRole : undefined;
  return { email, provider: 'dev', role };
}

// Unified principal: { email, provider, role? }
function getPrincipal(req) {
  return parseBearerJwt(req) || parseSwaPrincipal(req) || parseDevHeaders(req) || null;
}

// ----- Role resolution via Cosmos -----

async function getRoleFromDb(email) {
  // ensure user exists; admin endpoint may have promoted role earlier
  let user = await getUserByEmail(email);
  if (!user) user = await ensureUser({ email, userId: email });
  return String(user.role || 'consumer').toLowerCase();
}

// ----- Helpers for Functions handlers -----

function writeRes(ctx, status, body) {
  ctx.res = {
    status,
    headers: { 'Content-Type': 'application/json' },
    body,
  };
}

async function requireAuth(ctx) {
  const req = ctx.req || ctx.bindingData?.req; // ctx.req in Node v4 model
  const principal = getPrincipal(req);
  if (!principal) {
    writeRes(ctx, 401, { error: 'Unauthorized' });
    return null;
  }
  // Attach resolved role if missing (from DB)
  if (!principal.role) {
    try {
      principal.role = await getRoleFromDb(principal.email);
    } catch (e) {
      ctx.log?.error?.('User lookup failed', e?.message || e);
      writeRes(ctx, 500, { error: 'User lookup failed' });
      return null;
    }
  }
  return principal;
}

async function requireRole(ctx, roleNeeded) {
  const principal = await requireAuth(ctx);
  if (!principal) return null;

  const r = String(principal.role || '').toLowerCase();
  if (r === 'admin' || r === String(roleNeeded).toLowerCase()) return principal;

  writeRes(ctx, 403, { error: `${roleNeeded} role required` });
  return null;
}

async function requireAnyRole(ctx, roles) {
  const principal = await requireAuth(ctx);
  if (!principal) return null;

  const r = String(principal.role || '').toLowerCase();
  const allowed = roles.map(x => String(x).toLowerCase());
  if (r === 'admin' || allowed.includes(r)) return principal;

  writeRes(ctx, 403, { error: `Requires one of roles: ${allowed.join(', ')}` });
  return null;
}

module.exports = {
  getPrincipal,
  requireAuth,
  requireRole,
  requireAnyRole,
};
