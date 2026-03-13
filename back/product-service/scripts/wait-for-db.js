const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[auth-service] DATABASE_URL is not set');
  process.exit(1);
}

const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT_MS || 60000);
const intervalMs = Number(process.env.DB_WAIT_INTERVAL_MS || 2000);
const deadline = Date.now() + timeoutMs;

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function canConnect() {
  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 3000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } finally {
    try {
      await client.end();
    } catch (_) {
      // ignore
    }
  }
}

(async () => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      if (await canConnect()) {
        console.log('[auth-service] database is reachable');
        process.exit(0);
      }
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      console.log(`[auth-service] db not ready yet: ${msg}`);
    }

    if (Date.now() > deadline) {
      console.error('[auth-service] timed out waiting for database');
      process.exit(1);
    }
    await sleep(intervalMs);
  }
})();

