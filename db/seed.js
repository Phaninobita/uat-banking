/**
 * First National Bank Database Seeder
 * Executes db/seed.sql against the configured Supabase / PostgreSQL database.
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === "") {
    console.error("âŒ Error: DATABASE_URL is not set in .env file.");
    process.exit(1);
  }

  console.log("ðŸ”Œ Connecting to PostgreSQL / Supabase...");
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
  });

  try {
    await pool.query("SELECT NOW()");
    console.log("âœ… Database connection established.");

    const seedSqlPath = path.join(__dirname, "seed.sql");
    const sql = fs.readFileSync(seedSqlPath, "utf8");

    console.log("ðŸŒ± Executing seed script (db/seed.sql)...");
    await pool.query(sql);

    // Verify row counts
    const accountsCount = await pool.query("SELECT count(*) FROM corporate_accounts");
    const txCount = await pool.query("SELECT count(*) FROM account_transactions");
    const appsCount = await pool.query("SELECT count(*) FROM corporate_onboarding_applications");
    const docsCount = await pool.query("SELECT count(*) FROM application_documents");

    console.log("\n========================================================");
    console.log("ðŸŽ‰ SEEDING COMPLETED SUCCESSFULLY!");
    console.log("========================================================");
    console.log(`ðŸ¦ corporate_accounts:               ${accountsCount.rows[0].count} records`);
    console.log(`ðŸ’³ account_transactions:             ${txCount.rows[0].count} records`);
    console.log(`ðŸ“‹ corporate_onboarding_applications: ${appsCount.rows[0].count} records`);
    console.log(`ðŸ“ application_documents:            ${docsCount.rows[0].count} records`);
    console.log("========================================================\n");
  } catch (err) {
    console.error("\nâŒ Seeding failed:", err.message);
    if (err.message.includes("password authentication failed")) {
      console.error("\nðŸ’¡ Tip: Your database password in .env may be incorrect.");
      console.error("   Click 'Connect' in your Supabase dashboard and verify your connection string & password.");
    }
  } finally {
    await pool.end();
  }
}

seed();

