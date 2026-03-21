import { betterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

if (!betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET is not set");
}

const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
  "http://localhost:3000";

export const auth = betterAuth({
  database: new Pool({
    connectionString: databaseUrl,
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },

  secret: betterAuthSecret,
  baseURL,

  trustedOrigins: [
    baseURL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
});