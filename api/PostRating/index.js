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
  const stars = Number(body.stars);

  if (!videoId || !Number.isFinite(stars) || stars < 1 || stars > 5) {
    return bad(context, 'stars must be 1..5');
  }

  const ratings = container('COSMOS_CONTAINER_RATINGS');
  const doc = {
    id: uuid(),
    type: 'rating',
    videoId,
    userEmail: user.email,
    stars,
    createdAt: new Date().toISOString(),
  };

  await ratings.items.create(doc);

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