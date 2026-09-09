const express = require('express');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/auth/login', async (req, res) => {
  const { crn, email } = req.body;
  if (!crn || !email) {
    return res.status(400).json({ error: 'CRN and Email are required.' });
  }

  try {
    const existing = await pool.query(
      `SELECT * FROM corporate_onboarding_applications WHERE crn = $1 AND registered_email = $2 LIMIT 1`,
      [crn, email]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, isNew: false, data: existing.rows[0] });
    }

    const appRef = `VB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const newRecord = await pool.query(
      `INSERT INTO corporate_onboarding_applications (application_ref, crn, registered_email)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [appRef, crn, email]
    );

    return res.status(201).json({ success: true, isNew: true, data: newRecord.rows[0] });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/application/save', async (req, res) => {
  const {
    application_ref,
    status,
    company_name,
    trade_name,
    legal_type,
    licence_issue_date,
    licence_expiry_date,
    licence_issued_by,
    address,
    operations,
    vat_trn,
    entities,
    ownership_structure,
    roles,
    tax_compliance,
    documents
  } = req.body;

  if (!application_ref) {
    return res.status(400).json({ error: 'Application reference is required.' });
  }

  const query = `
    UPDATE corporate_onboarding_applications SET
      status = COALESCE($2, status),
      company_name = $3,
      trade_name = $4,
      legal_type = $5,
      licence_issue_date = $6,
      licence_expiry_date = $7,
      licence_issued_by = $8,
      address = $9,
      operations = $10,
      vat_trn = $11,
      entities = $12,
      ownership_structure = $13,
      roles = $14,
      tax_compliance = $15,
      documents = $16,
      updated_at = NOW()
    WHERE application_ref = $1
    RETURNING *;
  `;

  const values = [
    application_ref,
    status || 'draft',
    company_name || null,
    trade_name || null,
    legal_type || null,
    licence_issue_date || null,
    licence_expiry_date || null,
    licence_issued_by || null,
    JSON.stringify(address || {}),
    JSON.stringify(operations || []),
    vat_trn || null,
    JSON.stringify(entities || []),
    JSON.stringify(ownership_structure || []),
    JSON.stringify(roles || {}),
    JSON.stringify(tax_compliance || {}),
    JSON.stringify(documents || [])
  ];

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application reference not found.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: 'Failed to update application data.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});