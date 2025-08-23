const { container } = require('../shared/db');

module.exports = async function (context, req) {
  const q = (req.query.q || '').toString().toLowerCase();
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
  const videos = container('COSMOS_CONTAINER_VIDEOS');

  const querySpec = q
    ? {
        query:
          'SELECT TOP @limit * FROM c WHERE CONTAINS(LOWER(c.title), @q) OR CONTAINS(LOWER(c.publisher), @q) OR CONTAINS(LOWER(c.genre), @q) ORDER BY c.createdAt DESC',
        parameters: [
          { name: '@q', value: q },
          { name: '@limit', value: limit }
        ]
      }
    : {
        query: 'SELECT TOP @limit * FROM c ORDER BY c.createdAt DESC',
        parameters: [{ name: '@limit', value: limit }]
      };

  const { resources } = await videos.items.query(querySpec).fetchAll();
  context.res = { status: 200, body: resources || [] };
};