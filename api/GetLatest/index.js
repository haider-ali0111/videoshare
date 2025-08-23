const { container } = require('../shared/db');

module.exports = async function (context, req) {
  const videos = container('COSMOS_CONTAINER_VIDEOS');
  const { resources } = await videos.items
    .query({ query: 'SELECT TOP 12 * FROM c ORDER BY c.createdAt DESC' })
    .fetchAll();
  context.res = { status: 200, body: resources || [] };
};