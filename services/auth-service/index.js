/**
 * Apex Bank Microservice: Auth & Identity Service (Port 3001)
 * Handles Commercial Registration Number (CRN) validation, OTP issuance, JWT token signing,
 * and Mobile Biometric FaceID/Fingerprint authentication for the upcoming mobile bank app.
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../../shared/config");
const memStore = require("../../shared/memStore");
const db = require("../../shared/db");

const router = express.Router();

// Middleware: Verify JWT Session
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing authentication token." });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded; // { crn, email, application_ref }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired session token." });
  }
}

// 1. Request OTP (4-digit verification code)
router.post("/request-otp", async (req, res) => {
  memStore.metrics.serviceRequests.auth++;
  const { crn, email } = req.body;

  if (!crn || !email) {
    return res.status(400).json({ error: "Commercial Registration Number (CRN) and Email are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Please enter a valid registered email address." });
  }

  const cleanCrn = crn.trim();
  const cleanEmail = email.trim().toLowerCase();
  const key = `${cleanCrn}:${cleanEmail}`;
  const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  memStore.otpStore.set(key, { otp: randomCode, expiresAt });

  // Record into simulated email buffer
  const emailItem = memStore.recordSimulatedEmail({
    to: cleanEmail,
    from: '"Apex Bank Auth Service" <onboarding@apexbank.ae>',
    subject: `Apex Bank — Your Verification Code: ${randomCode}`,
    text: `Your verification code for CRN ${cleanCrn} is: ${randomCode}`,
    code: randomCode,
    type: "otp",
    metadata: { crn: cleanCrn, otp: randomCode },
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #0f172a;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #4f46e5); color: #ffffff; font-weight: 800; font-size: 18px; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; box-shadow: 0 4px 12px rgba(14,165,233,0.3);">AB</div>
          <h2 style="color: #0f172a; margin: 12px 0 2px; font-size: 20px; font-weight: 700;">Apex Bank Authentication Mesh</h2>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Identity Verification Code</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">Hello,</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">Use the following verification code to access your corporate onboarding application for CRN <strong>${cleanCrn}</strong>:</p>
        <div style="background: #f0fdf4; border: 2px dashed #10b981; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #059669; display: inline-block; font-family: monospace;">${randomCode}</span>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.4;">This code will expire in <strong>5 minutes</strong>. Demo code <strong>1111</strong> is also active for immediate login.</p>
      </div>
    `
  });

  return res.json({
    success: true,
    message: `A verification code has been dispatched to ${cleanEmail}.`,
    simulatedEmail: emailItem,
    debugOtp: randomCode,
    demoCode: "1111",
    service: "auth-service"
  });
});

// 2. Verify OTP & Issue JWT
router.post("/verify-otp", async (req, res) => {
  memStore.metrics.serviceRequests.auth++;
  const { crn, email, otp } = req.body;
  if (!crn || !email || !otp) {
    return res.status(400).json({ error: "CRN, Email, and OTP code are required." });
  }

  const cleanCrn = crn.trim();
  const cleanEmail = email.trim().toLowerCase();
  const key = `${cleanCrn}:${cleanEmail}`;
  const storedOtpData = memStore.otpStore.get(key);

  const isValidOtp =
    (storedOtpData && storedOtpData.otp === otp && storedOtpData.expiresAt > Date.now()) ||
    otp === "1111";

  if (!isValidOtp) {
    return res.status(401).json({ error: "Invalid or expired OTP code (Use demo code 1111)." });
  }

  memStore.otpStore.delete(key);

  try {
    let applicationRecord = null;
    let isNew = false;

    if (db.isConnected()) {
      const existing = await db.query(
        "SELECT * FROM corporate_onboarding_applications WHERE crn = $1 AND LOWER(registered_email) = LOWER($2) LIMIT 1",
        [cleanCrn, cleanEmail]
      );
      if (existing.rows.length > 0) {
        applicationRecord = existing.rows[0];
      } else {
        const appRef = "AB-" + new Date().getFullYear() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
        const defaultCompany = "Apex Global Holdings Ltd";
        const initialFormData = {
          step2: {
            crn: cleanCrn,
            company_name: defaultCompany,
            trade_name: defaultCompany,
            legal_type: "Limited Liability Company (LLC)",
            issued_by: "Abu Dhabi Global Market (ADGM)"
          }
        };
        const newRecord = await db.query(
          `INSERT INTO corporate_onboarding_applications (
             application_ref, crn, registered_email, current_step, status, form_data, legal_type, company_name, trade_name
           ) VALUES ($1, $2, $3, 1, 'draft', $4::jsonb, $5, $6, $7) RETURNING *`,
          [appRef, cleanCrn, cleanEmail, JSON.stringify(initialFormData), "Limited Liability Company (LLC)", defaultCompany, defaultCompany]
        );
        applicationRecord = newRecord.rows[0];
        isNew = true;
      }
    } else {
      const existingRef = memStore.crnEmailIndex.get(key);
      if (existingRef && memStore.applications.has(existingRef)) {
        applicationRecord = memStore.applications.get(existingRef);
      } else {
        const appRef = "AB-" + new Date().getFullYear() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
        const defaultCompany = "Apex Global Holdings Ltd";
        applicationRecord = {
          id: Date.now(),
          application_ref: appRef,
          crn: cleanCrn,
          registered_email: cleanEmail,
          current_step: 1,
          status: "draft",
          company_name: defaultCompany,
          trade_name: defaultCompany,
          legal_type: "Limited Liability Company (LLC)",
          form_data: {
            step2: {
              crn: cleanCrn,
              company_name: defaultCompany,
              trade_name: defaultCompany,
              legal_type: "Limited Liability Company (LLC)",
              issued_by: "Abu Dhabi Global Market (ADGM)"
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        memStore.applications.set(appRef, applicationRecord);
        memStore.crnEmailIndex.set(key, appRef);
        isNew = true;
      }
    }

    const token = jwt.sign(
      {
        crn: applicationRecord.crn,
        email: applicationRecord.registered_email,
        application_ref: applicationRecord.application_ref
      },
      config.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      isNew,
      token,
      data: applicationRecord,
      service: "auth-service"
    });
  } catch (err) {
    console.error("[AUTH SERVICE] Error:", err);
    return res.status(500).json({ error: "Internal Auth Service Error." });
  }
});

// 3. Mobile Biometric Login Endpoint (FaceID / TouchID for Mobile App)
router.post("/mobile/biometric", async (req, res) => {
  memStore.metrics.serviceRequests.auth++;
  const { biometricSignature, deviceId, crn } = req.body;
  const activeCrn = crn ? crn.trim() : "509077205";
  const activeEmail = "admin@apexholdings.ae";
  const appRef = "AB-2026-DEMO01";

  const token = jwt.sign(
    {
      crn: activeCrn,
      email: activeEmail,
      application_ref: appRef,
      channel: "mobile_biometric"
    },
    config.JWT_SECRET,
    { expiresIn: "30d" }
  );

  return res.json({
    success: true,
    authenticated: true,
    channel: "mobile_biometric",
    deviceId: deviceId || "iPhone-16-Pro-Simulator",
    token,
    user: {
      name: "Alexander J. Vance",
      company: "Apex Global Holdings Ltd",
      crn: activeCrn,
      email: activeEmail,
      application_ref: appRef,
      tier: "Apex Corporate Gold"
    },
    service: "auth-service"
  });
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "auth-service",
    port: config.MICROSERVICES.AUTH.port,
    uptime: process.uptime()
  });
});

module.exports = {
  router,
  requireAuth
};
