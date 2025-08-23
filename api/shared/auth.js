const { verifyToken } = require('./token');

const ALLOWED_ROLES = new Set(['creator', 'consumer', 'admin']);

function parseClientPrincipal(req) {
  // 1) Bearer JWT
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();
    try {
      const payload = verifyToken(token);
      if (payload && payload.email) {
        const role = (payload.role || '').toLowerCase();
        return {
          userId: String(payload.email).toLowerCase(),
          email: String(payload.email).toLowerCase(),
          name: payload.email,
          provider: 'token',
          claims: [],
          isAuthenticated: true,
          role: ALLOWED_ROLES.has(role) ? role : undefined,
        };
      }
    } catch (_) {
      // invalid token -> unauthenticated
    }
  }

  // 2) Dev fallback headers (for local testing ONLY)
  const devEmail = req.headers['x-user-email'];
  if (devEmail) {
    const devRole = String(req.headers['x-user-role'] || '').toLowerCase();
    return {
      userId: String(devEmail).toLowerCase(),
      email: String(devEmail).toLowerCase(),
      name: devEmail,
      provider: 'dev',
      claims: [],
      isAuthenticated: true,
      role: ALLOWED_ROLES.has(devRole) ? devRole : undefined,
    };
  }

  return null;
}

function unauthorized(ctx, message = 'Unauthorized') {
  ctx.res = {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
    body: { error: message },
  };
}

function forbidden(ctx, message = 'Forbidden') {
  ctx.res = {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
    body: { error: message },
  };
}

function requireAuth(ctx) {
  const principal = parseClientPrincipal(ctx.req);
  if (!principal || !principal.isAuthenticated) {
    unauthorized(ctx);
    return null;
  }
  return principal;
}

function requireRole(ctx, role) {
  const principal = requireAuth(ctx);
  if (!principal) return null;
  const r = (principal.role || '').toLowerCase();
  if (r === 'admin' || r === role) return principal;
  forbidden(ctx, `Requires role: ${role}`);
  return null;
}

function requireAnyRole(ctx, roles) {
  const principal = requireAuth(ctx);
  if (!principal) return null;
  const r = (principal.role || '').toLowerCase();
  const allowed = roles.map(String).map(s => s.toLowerCase());
  if (r === 'admin' || allowed.includes(r)) return principal;
  forbidden(ctx, `Requires one of roles: ${roles.join(', ')}`);
  return null;
}

module.exports = {
  parseClientPrincipal,
  requireAuth,
  requireRole,
  requireAnyRole,
};