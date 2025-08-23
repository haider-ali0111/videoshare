const { CosmosClient } = require('@azure/cosmos');

// Support both naming schemes to avoid config mismatches.
const COSMOS_ENDPOINT =
  process.env.COSMOS_ENDPOINT || process.env.COSMOS_DB_ENDPOINT;
const COSMOS_KEY =
  process.env.COSMOS_KEY || process.env.COSMOS_DB_KEY;
const COSMOS_DB_NAME =
  process.env.COSMOS_DB_NAME || process.env.COSMOS_DB_DATABASE;

if (!COSMOS_ENDPOINT || !COSMOS_KEY || !COSMOS_DB_NAME) {
  throw new Error(
    'Cosmos configuration missing. Ensure COSMOS_ENDPOINT/COSMOS_KEY/COSMOS_DB_NAME (or COSMOS_DB_ENDPOINT/COSMOS_DB_KEY/COSMOS_DB_DATABASE) are set.'
  );
}

const client = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY });
const db = client.database(COSMOS_DB_NAME);

function container(nameEnv) {
  const containerName = process.env[nameEnv];
  if (!containerName) {
    throw new Error(`Missing container env var: ${nameEnv}`);
  }
  return db.container(containerName);
}

async function getUserByEmail(email) {
  const users = container('COSMOS_CONTAINER_USERS');
  const id = String(email || '').toLowerCase();
  if (!id) return null;

  try {
    const { resource } = await users.item(id, id).read();
    return resource ?? null;
  } catch (e) {
    if (e.code === 404) return null;
    throw e;
  }
}

const AUTOPROVISION_DEFAULT =
  (process.env.AUTH_AUTOPROVISION_DEFAULT || 'false').toLowerCase() === 'true';

async function ensureUser(principal, opts = {}) {
  const autoCreate = opts.autoCreate ?? AUTOPROVISION_DEFAULT;
  const email = (principal?.email || '').toLowerCase();
  if (!email) return null;

  const existing = await getUserByEmail(email);
  if (existing) return existing;

  if (!autoCreate) return null; // explicit registration required

  // Legacy/dev convenience: create a minimal consumer record.
  const users = container('COSMOS_CONTAINER_USERS');
  const now = new Date().toISOString();
  const doc = {
    id: email,
    type: 'user',
    email,
    role: 'consumer',
    createdAt: now,
    updatedAt: now,
  };
  const { resource: created } = await users.items.create(doc);
  return created;
}

module.exports = { container, ensureUser, getUserByEmail };