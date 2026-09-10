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
    `);

    useDatabase = true;
    console.log("✅ [DATABASE] Successfully connected & synchronized schema (Base64 vault active) with PostgreSQL / Supabase");

    // Check if corporate_accounts is empty and auto-seed initial demo data
    try {
      const accCountRes = await pool.query("SELECT COUNT(*) FROM corporate_accounts");
      if (parseInt(accCountRes.rows[0].count, 10) === 0) {
        console.log("🌱 [DATABASE] Empty tables detected. Auto-seeding initial banking records...");
        const fs = require("fs");
        const path = require("path");
        const seedSqlPath = path.join(__dirname, "../db/seed.sql");
        if (fs.existsSync(seedSqlPath)) {
          const seedSql = fs.readFileSync(seedSqlPath, "utf8");
          await pool.query(seedSql);
          console.log("✅ [DATABASE] Initial banking data seeded successfully.");
        }
      }
    } catch (seedErr) {
      console.warn("⚠️  [DATABASE] Auto-seeding check notice:", seedErr.message);
    }
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
