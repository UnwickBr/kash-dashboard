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
          birth_date DATE,
          auth_provider TEXT NOT NULL DEFAULT 'local',
          google_sub TEXT UNIQUE,
          email_verified BOOLEAN NOT NULL DEFAULT FALSE,
          email_verification_token TEXT,
          email_verification_sent_at TIMESTAMPTZ,
          email_verified_at TIMESTAMPTZ,
          role TEXT NOT NULL DEFAULT 'user',
          subscription_status TEXT NOT NULL DEFAULT 'inactive',
          subscription_started_at TIMESTAMPTZ,
          subscription_expires_at TIMESTAMPTZ,
          subscription_canceled_at TIMESTAMPTZ,
          asaas_customer_id TEXT,
          asaas_subscription_id TEXT,
          asaas_checkout_id TEXT,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'local'`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_canceled_at TIMESTAMPTZ`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS asaas_checkout_id TEXT`;

      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
        ON users (google_sub)
        WHERE google_sub IS NOT NULL
      `;

      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS users_email_verification_token_unique_idx
        ON users (email_verification_token)
        WHERE email_verification_token IS NOT NULL
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
