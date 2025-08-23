const { container, getUserByEmail, ensureUser } = require('../shared/db');

module.exports = async function (context, req) {
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    context.res = { status: 403, body: { error: 'Forbidden' } };
    return;
  }
  const email = (req.body?.email || '').toLowerCase();
  const role = (req.body?.role || '').toLowerCase();
  if (!email || !['consumer','creator'].includes(role)) {
    context.res = { status: 400, body: { error: 'Invalid email or role' } };
    return;
  }

  const users = container('COSMOS_CONTAINER_USERS');
  let user = await getUserByEmail(email);
  if (!user) user = await ensureUser({ email, userId: email });

  user.role = role;
  await users.item(user.id, user.id).replace(user);

  context.res = { status: 200, body: { ok: true, email, role } };
};