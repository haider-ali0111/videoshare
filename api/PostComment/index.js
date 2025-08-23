const { requireAuth } = require('../shared/auth');
const { container, getUserByEmail } = require('../shared/db');
const { v4: uuid } = require('uuid');

module.exports = async function (context, req) {
  const principal = requireAuth(context); // sets 401 on failure
  if (!principal) return;

  const user = await getUserByEmail(principal.email);
  if (!user) {
    context.res = {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'User profile missing. Please sign up.' },
    };
    return;
  }

  const videoId = context.bindingData.id;
  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.trim() : '';

  if (!videoId || !text) return bad(context, 'Missing text or videoId');

  const comments = container('COSMOS_CONTAINER_COMMENTS');
  const doc = {
    id: uuid(),
    type: 'comment',
    videoId,
    userEmail: user.email,
    text: text.slice(0, 1000),
    createdAt: new Date().toISOString(),
  };

  await comments.items.create(doc);

  context.res = {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
    body: doc,
  };
};

function bad(context, msg) {
  context.res = {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
    body: { error: msg },
  };
}