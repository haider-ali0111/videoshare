const { requireRole } = require('../shared/auth');
const { newBlobName, generateWriteSas } = require('../shared/storage');

module.exports = async function (context, req) {
  const principal = requireRole(context, 'creator'); // sets 401/403 on failure
  if (!principal) return;

  const original = String(req.query.filename || 'video.mp4');
  const blobName = newBlobName(original);
  const uploadUrl = generateWriteSas(blobName, 20); // ~20 minutes

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { blobName, uploadUrl }
  };
};