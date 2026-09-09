const express = require("express");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/api/auth/login", async (req, res) => {
  const { crn, email } = req.body;
  if (!crn || !email) {
    return res.status(400).json({ error: "CRN and Email are required." });
  }

  try {
    const existing = await pool.query(
      "SELECT * FROM corporate_onboarding_applications WHERE crn = $1 AND registered_email = $2 LIMIT 1",
      [crn, email]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, isNew: false, data: existing.rows[0] });
    }

    const appRef = "VB-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
    const newRecord = await pool.query(
      "INSERT INTO corporate_onboarding_applications (application_ref, crn, registered_email, current_step, form_data) VALUES ($1, $2, $3, 1, $4::jsonb) RETURNING *",
      [appRef, crn, email, JSON.stringify({})]
    );

    return res.status(201).json({ success: true, isNew: true, data: newRecord.rows[0] });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/application/save", async (req, res) => {
  const { application_ref, current_step, status, form_data } = req.body;

  if (!application_ref) {
    return res.status(400).json({ error: "Application reference is required." });
  }

  try {
    const result = await pool.query(
      "UPDATE corporate_onboarding_applications SET current_step = COALESCE($2, current_step), status = COALESCE($3, status), form_data = $4, updated_at = NOW() WHERE application_ref = $1 RETURNING *",
      [application_ref, current_step, status || "draft", JSON.stringify(form_data || {})]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application reference not found." });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Save error:", err.message);
    return res.status(500).json({ error: "Failed to persist application progress." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
