const { container } = require('../shared/db');

module.exports = async function (context, req) {
  const videoId = context.bindingData.id;
  if (!videoId) {
    context.res = {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Missing video id' },
    };
    return;
  }

  const limit = clampInt(req.query?.limit, 1, 100, 20);
  const continuationToken =
    req.query?.continuationToken || req.query?.ct || undefined;

  const ratings = container('COSMOS_CONTAINER_RATINGS');

  const querySpec = {
    query:
      'SELECT r.id, r.userEmail, r.stars, r.createdAt ' +
      'FROM r WHERE r.videoId=@id ORDER BY r._ts DESC',
    parameters: [{ name: '@id', value: String(videoId) }],
  };

  const iterator = ratings.items.query(querySpec, {
    maxItemCount: limit,
    continuationToken,
  });

  const { resources = [], continuationToken: next } = await iterator.fetchNext();

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { items: resources, continuationToken: next || null },
  };
};

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}