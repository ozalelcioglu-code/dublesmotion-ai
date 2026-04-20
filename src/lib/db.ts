import { Pool } from "pg";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

// 🔥 tek pool instance
let pool: Pool;

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

if (!global.__pgPool) {
  global.__pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
}

pool = global.__pgPool;

// 🔥 neon sql (serverless)
const sql = neon(databaseUrl);

export { pool, sql };