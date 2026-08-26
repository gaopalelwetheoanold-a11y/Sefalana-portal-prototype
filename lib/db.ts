// Type-safe Postgres client with pool management and parameterized query helper
import { Pool, PoolClient, QueryResult } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create a singleton pool to avoid exhausting connections on Vercel serverless warm-ups
let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      // ssl: { rejectUnauthorized: false } // Uncomment if your DB requires SSL with self-signed certs
      // Additional pool tuning could be added here.
    });

    // Optional: log errors
    pool.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Unexpected idle client error', err);
    });
  }
  return pool;
}

export async function query<T = any>(text: string, params: unknown[] = []): Promise<QueryResult<T>> {
  const p = getPool();
  const start = Date.now();
  try {
    const res = await p.query<T>(text, params);
    const duration = Date.now() - start;
    // eslint-disable-next-line no-console
    console.debug('db-query', { text: text.split('\n')[0], duration, rows: res.rowCount });
    return res;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Database query error', { text, params, err });
    throw err;
  }
}

export async function getClient(): Promise<PoolClient> {
  const p = getPool();
  return p.connect();
}

export default { query, getClient };
