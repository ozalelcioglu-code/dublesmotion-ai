import { neon } from "@neondatabase/serverless";

let sqlInstance: any = null;

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!sqlInstance) {
    sqlInstance = neon(databaseUrl);
  }

  return sqlInstance;
}