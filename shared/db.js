/**
 * Apex Bank Database Layer
 * Connects to PostgreSQL / Supabase, executes auto-migrations for applications & Base64 document tables,
 * and seamlessly provides fallback to the shared in-memory repository.
 */

const { Pool } = require("pg");
const config = require("./config");
const memStore = require("./memStore");

let pool = null;
let useDatabase = false;

async function initDb() {
  if (!config.DATABASE_URL || config.DATABASE_URL.trim() === "") {
    console.log("ℹ️  [DATABASE] No DATABASE_URL configured. Running with in-memory application & Base64 document vault.");
    useDatabase = false;
    return;
  }

  try {
    const isLocalhost = config.DATABASE_URL.includes("localhost") || config.DATABASE_URL.includes("127.0.0.1");
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: isLocalhost ? false : { rejectUnauthorized: false }
    });

    pool.on("error", (err) => {
      console.error("[DATABASE] Unexpected client error:", err.message);
    });

    // Test connection and execute auto-migration for Base64 documents and corporate tables
    await pool.query("SELECT NOW()");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS corporate_onboarding_applications (
          id BIGSERIAL PRIMARY KEY,
          application_ref VARCHAR(64) UNIQUE NOT NULL,
          crn VARCHAR(64) NOT NULL,
          registered_email VARCHAR(255) NOT NULL,
          current_step INT NOT NULL DEFAULT 1,
          status VARCHAR(32) NOT NULL DEFAULT 'draft',
          company_name TEXT,
          trade_name TEXT,
          legal_type TEXT,
          licence_issue_date TEXT,
          licence_expiry_date TEXT,
          licence_issued_by TEXT,
          vat_trn TEXT,
          form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS application_documents (
          id BIGSERIAL PRIMARY KEY,
          application_ref VARCHAR(64) NOT NULL,
          document_type VARCHAR(64) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_type VARCHAR(64) NOT NULL,
          file_size INT NOT NULL,
          file_data_base64 TEXT NOT NULL,
          ocr_status VARCHAR(32) DEFAULT 'completed',
          extracted_metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_app_docs_ref ON application_documents (application_ref);

      CREATE TABLE IF NOT EXISTS corporate_accounts (
          id BIGSERIAL PRIMARY KEY,
          account_number VARCHAR(32) UNIQUE NOT NULL,
          iban VARCHAR(64) UNIQUE NOT NULL,
          currency VARCHAR(8) NOT NULL DEFAULT 'AED',
          account_name VARCHAR(255) NOT NULL,
          account_type VARCHAR(64) NOT NULL DEFAULT 'Corporate Checking',
          balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
          available_balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
          status VARCHAR(32) NOT NULL DEFAULT 'active',
          application_ref VARCHAR(64),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS account_transactions (
          id BIGSERIAL PRIMARY KEY,
          transaction_ref VARCHAR(64) UNIQUE NOT NULL,
          account_id BIGINT,
          account_number VARCHAR(32) NOT NULL,
          type VARCHAR(32) NOT NULL,
          amount NUMERIC(18, 2) NOT NULL,
          currency VARCHAR(8) NOT NULL DEFAULT 'AED',
          counterparty_name VARCHAR(255),
          counterparty_iban VARCHAR(64),
          description TEXT,
          category VARCHAR(64),
          status VARCHAR(32) NOT NULL DEFAULT 'settled',
          channel VARCHAR(32) NOT NULL DEFAULT 'portal',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rm_customer_invitations (
          crn VARCHAR(64) NOT NULL,
          email VARCHAR(255) NOT NULL,
          company_name TEXT NOT NULL,
          contact_person VARCHAR(255),
          phone VARCHAR(64),
          rm_name VARCHAR(128) NOT NULL DEFAULT 'Sarah Al-Qassimi (VP Corporate Banking)',
          rm_id VARCHAR(64) NOT NULL DEFAULT 'RM-ADGM-9042',
          invite_token VARCHAR(128) UNIQUE NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'invited',
          invite_link TEXT NOT NULL,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (crn, email)
      );

      CREATE TABLE IF NOT EXISTS rm_users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(64) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(128) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          role VARCHAR(128) NOT NULL DEFAULT 'Senior Relationship Manager · Corporate Banking',
          branch VARCHAR(128) DEFAULT 'ADGM Financial Center',
          status VARCHAR(32) NOT NULL DEFAULT 'active',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_rm_users_username ON rm_users (LOWER(username));

      -- Seed primary RM Executive (Phanee / Visionbank@324)
      INSERT INTO rm_users (username, password_hash, full_name, email, role, branch, status)
      VALUES (
          'phanee',
          'Visionbank@324',
          'Phanee',
          'phanee@apexbank.ae',
          'Senior Relationship Manager · Corporate Banking',
          'ADGM Financial Center',
          'active'
      )
      ON CONFLICT (username) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email;

      -- Ensure fresh start: clear mock / demo customer records
      TRUNCATE TABLE rm_customer_invitations CASCADE;
      TRUNCATE TABLE application_documents CASCADE;
      TRUNCATE TABLE corporate_onboarding_applications CASCADE;
      TRUNCATE TABLE account_transactions CASCADE;
      TRUNCATE TABLE corporate_accounts CASCADE;
    `);

    useDatabase = true;
    console.log("✅ [DATABASE] Successfully connected & synchronized schema (rm_users active, data clean & fresh) with PostgreSQL / Supabase");
  } catch (err) {
    console.warn("⚠️  [DATABASE] PostgreSQL connection inactive (" + err.message + ").");
    console.log("ℹ️  [DATABASE] Active fallback: High-speed in-memory repository with full Base64 document persistence enabled.");
    useDatabase = false;
    if (pool) {
      try {
        pool.end().catch(() => {});
      } catch (e) {}
      pool = null;
    }
  }
}


// Fire and forget or await
initDb();

module.exports = {
  get pool() {
    return pool;
  },
  isConnected() {
    return useDatabase;
  },
  async query(text, params) {
    if (useDatabase && pool) {
      return pool.query(text, params);
    }
    throw new Error("Database not connected, use memory store fallback");
  }
};
