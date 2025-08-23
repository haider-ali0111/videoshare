const { getUserByEmail } = require('../shared/db');
const { verifyPassword } = require('../shared/password');
const { signToken } = require('../shared/token');

const DELAY_MS = parseInt(process.env.AUTH_LOGIN_DELAY_MS || '0', 10);

module.exports = async function (context, req) {
  // Optional preflight support (mostly unnecessary behind Vite proxy)
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
    return;
  }

  const body = req.body || {};
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');

  if (!email || !password) {
    await delay();
    context.res = {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Email and password are required.' },
    };
    return;
  }

  const user = await getUserByEmail(email);

  // Guard on missing user or hash (e.g., very old seed user)
  if (!user || !user.passwordHash) {
    await delay();
    context.res = {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Account not found. Please sign up.' },
    };
    return;
  }

  // bcrypt or legacy sha256 supported by verifyPassword()
  const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!ok) {
    await delay();
    context.res = {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Invalid credentials.' },
    };
    return;
  }

  const role = String(user.role || '').toLowerCase();
  const token = signToken({ email, role }); // exp from env/default

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { token, user: { email, role } },
  };
};

function delay() {
  return DELAY_MS > 0 ? new Promise((r) => setTimeout(r, DELAY_MS)) : Promise.resolve();
}