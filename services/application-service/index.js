/**
 * Apex Bank Microservice: Corporate Onboarding Service (Port 3003)
 * Manages the 7-step corporate onboarding lifecycle, auto-save state machine,
 * validation, and compliance verification submission.
 */

const express = require("express");
const config = require("../../shared/config");
const memStore = require("../../shared/memStore");
const db = require("../../shared/db");
const { requireAuth } = require("../auth-service");

const router = express.Router();

// 1. Get Current User Application
router.get("/current", requireAuth, async (req, res) => {
  memStore.metrics.serviceRequests.applications++;
  const { application_ref } = req.user;

  try {
    let applicationRecord = null;
    if (db.isConnected()) {
      const result = await db.query(
        "SELECT * FROM corporate_onboarding_applications WHERE application_ref = $1 LIMIT 1",
        [application_ref]
      );
      if (result.rows.length > 0) {
        applicationRecord = result.rows[0];
      }
    } else {
      applicationRecord = memStore.applications.get(application_ref) || null;
    }

    if (!applicationRecord) {
      return res.status(404).json({ error: "Application profile not found." });
    }

    // Ensure company_name reflects the RM invitation record if available
    const rmInv = memStore.getRmInvitation(applicationRecord.crn, applicationRecord.registered_email);
    if (rmInv && rmInv.company_name) {
      if (!applicationRecord.company_name || applicationRecord.company_name === "Apex Global Holdings Ltd") {
        applicationRecord.company_name = rmInv.company_name;
        applicationRecord.trade_name = rmInv.company_name;
      }
    }

    return res.json({
      success: true,
      data: applicationRecord,
      service: "application-service"
    });
  } catch (err) {
    console.error("[APPLICATION SERVICE] Fetch error:", err);
    return res.status(500).json({ error: "Failed to load application data." });
  }
});

// 2. Save Application Progress (IDOR Protected via JWT application_ref)
router.post("/save", requireAuth, async (req, res) => {
  memStore.metrics.serviceRequests.applications++;
  const application_ref = req.user.application_ref;
  const { current_step, status, form_data } = req.body;

  try {
    let existingRecord = null;
    if (db.isConnected()) {
      const fetchRes = await db.query(
        "SELECT * FROM corporate_onboarding_applications WHERE application_ref = $1 LIMIT 1",
        [application_ref]
      );
      if (fetchRes.rows.length === 0) {
        return res.status(404).json({ error: "Application record not found." });
      }
      existingRecord = fetchRes.rows[0];
    } else {
      existingRecord = memStore.applications.get(application_ref);
      if (!existingRecord) {
        return res.status(404).json({ error: "Application record not found." });
      }
    }

    let resolvedStatus = existingRecord.status;
    if (status && typeof status === "string" && status.trim() !== "") {
      resolvedStatus = status.trim();
    }

    const resolvedStep = typeof current_step === "number" ? current_step : existingRecord.current_step;

    const existingFormData = existingRecord.form_data || {};
    const incomingFormData = form_data || {};
    const mergedFormData = {
      ...existingFormData,
      ...incomingFormData
    };

    let updatedRecord = null;
    if (db.isConnected()) {
      const s2 = mergedFormData.step2 || {};
      const companyName = s2.company_name || null;
      const tradeName = s2.trade_name || null;
      const legalType = s2.legal_type || null;
      const issueDate = s2.issue_date || null;
      const expiryDate = s2.expiry_date || null;
      const issuedBy = s2.issued_by || null;
      const vatTrn = s2.vat_trn || null;

      const result = await db.query(
        `UPDATE corporate_onboarding_applications
         SET current_step = $2, status = $3, form_data = $4::jsonb,
             company_name = COALESCE($5, company_name),
             trade_name = COALESCE($6, trade_name),
             legal_type = COALESCE($7, legal_type),
             licence_issue_date = COALESCE($8, licence_issue_date),
             licence_expiry_date = COALESCE($9, licence_expiry_date),
             licence_issued_by = COALESCE($10, licence_issued_by),
             vat_trn = COALESCE($11, vat_trn),
             updated_at = NOW()
         WHERE application_ref = $1
         RETURNING *`,
        [
          application_ref, resolvedStep, resolvedStatus, JSON.stringify(mergedFormData),
          companyName, tradeName, legalType, issueDate, expiryDate, issuedBy, vatTrn
        ]
      );
      updatedRecord = result.rows[0];
    } else {
      existingRecord.current_step = resolvedStep;
      existingRecord.status = resolvedStatus;
      existingRecord.form_data = mergedFormData;
      existingRecord.updated_at = new Date().toISOString();
      updatedRecord = existingRecord;
      memStore.applications.set(application_ref, existingRecord);
    }

    if (resolvedStatus === "submitted") {
      const recipientEmail = (existingRecord && existingRecord.registered_email) || (req.user && req.user.email) || "admin@apexholdings.ae";
      memStore.recordSimulatedEmail({
        to: recipientEmail,
        from: '"Apex Bank Corporate Onboarding" <onboarding@apexbank.ae>',
        subject: `Apex Bank — Corporate Application Received (${application_ref})`,
        type: "application_submitted",
        metadata: { application_ref },
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #10b981, #0ea5e9); color: #ffffff; font-weight: 800; font-size: 18px; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">AB</div>
              <h2 style="color: #0f172a; margin: 12px 0 2px; font-size: 20px; font-weight: 700;">Apex Bank Corporate Portal</h2>
              <p style="color: #64748b; font-size: 13px; margin: 0;">Application Submission Confirmation</p>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.5;">Dear Corporate Customer,</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.5;">Your corporate account application has been received and logged into our compliance verification queue.</p>
            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 16px; margin: 18px 0; text-align: center;">
              <span style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px;">Application Reference</span><br>
              <span style="font-size: 24px; font-weight: 800; color: #15803d; letter-spacing: 1px; font-family: monospace;">${application_ref}</span>
            </div>
            <p style="color: #475569; font-size: 13px; line-height: 1.5;">Our compliance and onboarding desk will complete the verification within 1–2 business days. Your assigned Relationship Manager is <strong>Sarah Al-Qassimi</strong> (s.alqassimi@apexbank.ae &bull; +971 2 555 1234).</p>
          </div>
        `,
        text: `Apex Bank: Application ${application_ref} received successfully.`
      });
    }

    return res.json({
      success: true,
      data: updatedRecord,
      service: "application-service"
    });
  } catch (err) {
    console.error("[APPLICATION SERVICE] Save error:", err);
    return res.status(500).json({ error: "Failed to persist application progress." });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "application-service",
    port: config.MICROSERVICES.APPLICATIONS.port,
    uptime: process.uptime()
  });
});

module.exports = { router };
