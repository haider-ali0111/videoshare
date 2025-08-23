const jwt = require('jsonwebtoken');
const DEFAULT_EXPIRES = process.env.JWT_EXPIRES_IN || '2h'; // e.g., "3600s", "2h"
const ALG = 'HS256';
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail fast: misconfigured env should not silently produce weak tokens.
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

function signToken({ email, role }, opts = {}) {
  if (!email || typeof email !== 'string') {
    throw new Error('email is required');
  }
  if (!role || typeof role !== 'string') {
    throw new Error('role is required');
  }

  const payload = { email, role };
  const options = {
    algorithm: ALG,
    expiresIn: opts.expiresIn || DEFAULT_EXPIRES,
    // Optional hardening hooks if you later set them as envs:
    ...(process.env.JWT_ISSUER ? { issuer: process.env.JWT_ISSUER } : {}),
    ...(process.env.JWT_AUDIENCE ? { audience: process.env.JWT_AUDIENCE } : {}),
  };

  return jwt.sign(payload, getSecret(), options);
}

function verifyToken(token) {
  try {
    const payload = jwt.verify(token, getSecret(), {
      algorithms: [ALG],
      ...(process.env.JWT_ISSUER ? { issuer: process.env.JWT_ISSUER } : {}),
      ...(process.env.JWT_AUDIENCE ? { audience: process.env.JWT_AUDIENCE } : {}),
    });

    // Minimal shape check; detailed role validation happens elsewhere.
    if (!payload || !payload.email) return null;
    return payload; // { email, role, iat, exp, ... }
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyToken };