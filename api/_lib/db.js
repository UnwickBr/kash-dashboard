import { neon } from "@neondatabase/serverless";

const requiredEnvMessage = "DATABASE_URL não configurada. Defina essa variável no Vercel e no ambiente local.";

let sqlInstance = null;
let schemaReadyPromise = null;

export const ENTITY_NAMES = ["User", "Transaction", "Budget", "Savings", "PaymentReminder", "ShoppingItem", "PaidList"];

export const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error(requiredEnvMessage);
  }
  if (!sqlInstance) {
    sqlInstance = neon(process.env.DATABASE_URL);
  }
  return sqlInstance;
};

export const ensureSchema = async () => {
  if (!schemaReadyPromise) {
    const sql = getSql();
    schemaReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL DEFAULT 'user',
          subscription_status TEXT NOT NULL DEFAULT 'inactive',
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS entity_records (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          entity_name TEXT NOT NULL,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS entity_records_user_entity_idx
        ON entity_records (user_id, entity_name)
      `;
    })();
  }

  return schemaReadyPromise;
};
