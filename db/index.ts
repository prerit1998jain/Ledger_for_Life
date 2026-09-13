import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(process.env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Every data access for a signed-in user must go through this wrapper.
 *
 * It opens a transaction and sets the Postgres session variable
 * `app.current_user_id`, which the RLS policies (db/migrations/*_rls.sql)
 * check against `user_id` on every owned table. This is the "session
 * variable" RLS pattern for non-Supabase Postgres described in PRD §9,
 * and it is defense-in-depth alongside the explicit `.where(eq(userId, ...))`
 * filters every query below still applies.
 */
export async function withUserContext<T>(
  userId: string,
  callback: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
    return callback(tx);
  });
}
