import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/config/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// Transaction pooler connection options
const isTransactionPooler = env.DATABASE_URL.includes(".pooler.supabase.com");

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL, {
  prepare: false, // Required for transaction pooler
  ssl: isTransactionPooler ? "require" : undefined,
  max: isTransactionPooler ? 1 : 10, // Transaction pooler works best with single connection
});
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
