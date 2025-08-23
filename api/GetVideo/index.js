const { container } = require('../shared/db');
const { generateReadSas } = require('../shared/storage');

module.exports = async function (context, req) {
  try {
    const id = context.bindingData.id;
    if (!id) {
      context.res = { status: 400, body: { error: 'Missing id' } };
      return;
    }

    const videos = container('COSMOS_CONTAINER_VIDEOS');

    // Query by id so we don't need to know the partition key
    const { resources } = await videos.items
      .query({
        query: 'SELECT * FROM c WHERE c.id = @id',
        parameters: [{ name: '@id', value: id }],
      })
      .fetchAll();

    if (!resources || resources.length === 0) {
      context.res = { status: 404, body: { error: 'Not found' } };
      return;
    }

    const video = resources[0];

    // Attach a short-lived read SAS for playback (e.g., 60 minutes)
    if (video.blobName) {
      video.playbackUrl = generateReadSas(video.blobName, 60);
    }

    context.res = { status: 200, body: video };
  } catch (err) {
    context.log.error('GetVideo error:', err);
    context.res = { status: 500, body: { error: 'Internal Server Error' } };
  }
};