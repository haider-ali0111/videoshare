const { requireRole } = require('../shared/auth');
const { container } = require('../shared/db');
const { v4: uuid } = require('uuid');

module.exports = async function (context, req) {
  const principal = requireRole(context, 'creator'); // sets 401/403 on failure
  if (!principal) return;

  const body = req.body || {};
  const required = ['title', 'publisher', 'producer', 'genre', 'ageRating', 'blobName'];

  for (const k of required) {
    const v = body[k];
    if (v == null || String(v).trim() === '') {
      return bad(context, `Missing field: ${k}`);
    }
  }

  const videos = container('COSMOS_CONTAINER_VIDEOS');
  const now = new Date().toISOString();

  const doc = {
    id: uuid(),
    ownerId: principal.email,          // email-as-id pattern
    ownerEmail: principal.email,
    title: String(body.title).trim(),
    publisher: String(body.publisher).trim(),
    producer: String(body.producer).trim(),
    genre: String(body.genre).trim(),
    ageRating: String(body.ageRating).trim(),
    blobName: String(body.blobName).trim(),
    createdAt: now,
    views: 0,
    type: 'video'
  };

  await videos.items.create(doc);

  context.res = {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
    body: doc
  };
};

function bad(context, msg) {
  context.res = {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
    body: { error: msg }
  };
}