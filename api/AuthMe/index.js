const { requireAuth } = require('../shared/auth');
const { getUserByEmail } = require('../shared/db');

module.exports = async function (context, req) {
  const principal = requireAuth(context);
  if (!principal) return;

  const user = await getUserByEmail(principal.email);
  if (!user) {
    context.res = {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'User not found' },
    };
    return;
  }

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { email: user.email, role: String(user.role || '').toLowerCase() },
  };
};