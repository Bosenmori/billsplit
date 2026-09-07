import { Pool } from 'pg';

const pool = globalThis.pgPool ||
  new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.pgPool = pool;
}

export default pool;


