const validator = require('validator');
const { container, getUserByEmail } = require('../shared/db');
const { hashPassword } = require('../shared/password');
const { signToken } = require('../shared/token');

const ALLOWED_ROLES = new Set(['creator', 'consumer']);

module.exports = async function (context, req) {
  // Preflight for local/dev; SWA often handles CORS, but this avoids surprises.
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    };
    return;
  }

  const body = req.body || {};
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');
  const role = String(body.role || '').toLowerCase().trim();

  // Input validation (why: reduce bad data & auth bypass)
  if (!validator.isEmail(email)) {
    context.res = badRequest('Valid email is required.');
    return;
  }
  if (!ALLOWED_ROLES.has(role)) {
    context.res = badRequest('Role must be either "creator" or "consumer".');
    return;
  }
  if (!validPassword(password)) {
    context.res = badRequest('Password must be at least 8 characters and contain a letter and a number.');
    return;
  }

  // Enforce uniqueness
  const existing = await getUserByEmail(email);
  if (existing) {
    context.res = {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Email already registered. Please log in.' }
    };
    return;
  }

  // Persist user
  const users = container('COSMOS_CONTAINER_USERS');
  const { hash } = hashPassword(password);
  const now = new Date().toISOString();
  const doc = {
    id: email,
    type: 'user',
    email,
    role,
    passwordHash: hash,     // bcrypt hash (salt embedded)
    passwordSalt: null,     // kept for legacy compatibility
    createdAt: now,
    updatedAt: now
  };

  await users.items.create(doc);

  // Issue JWT
  const token = signToken({ email, role });

  context.res = {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: {
      token,
      user: { email, role }
    }
  };
};

// helpers
function badRequest(message) {
  return {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
    body: { error: message }
  };
}

function validPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  return hasLetter && hasNumber;
}