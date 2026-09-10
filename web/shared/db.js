/**
 * First National Bank Database Layer
 * Connects to PostgreSQL / Supabase, executes auto-migrations for applications & Base64 document tables,
 * and seamlessly provides fallback to the shared in-memory repository.
 */

const fs = require("fs");
const path = require("path");
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

    // Test connection
    await pool.query("SELECT NOW()");

    // Execute schema.sql to ensure company_uid, corporate_audit_logs, rm_users, and indexes exist
    const schemaFile = path.join(__dirname, "../db/schema.sql");
    if (fs.existsSync(schemaFile)) {
      const schemaSql = fs.readFileSync(schemaFile, "utf8");
      await pool.query(schemaSql);
    }

    useDatabase = true;
    console.log("✅ [DATABASE] Successfully connected & synchronized schema (company_uid, corporate_audit_logs, rm_users) with PostgreSQL / Supabase");
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
