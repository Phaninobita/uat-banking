const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1); // Enable reverse-proxy support for Railway, Heroku, AWS
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET || "apex-bank-jwt-secret-dev-2026";
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || "";

// ── Real-Time Simulated Email Buffer ──
const simulatedEmails = [];

function recordSimulatedEmail({ to, from, subject, html, text, code, type, metadata }) {
  const emailItem = {
    id: "eml_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    to: to || "applicant@corporate.ae",
    from: from || '"Apex Bank" <onboarding@apexbank.ae>',
    subject: subject || "Apex Bank Notification",
    html: html || "",
    text: text || "",
    code: code || null,
    type: type || "general",
    metadata: metadata || {},
    timestamp: new Date().toISOString()
  };

  simulatedEmails.unshift(emailItem);
  if (simulatedEmails.length > 50) {
    simulatedEmails.pop();
  }
  return emailItem;
}

// ── Email Transporter Setup ──
let mailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log("📧 [EMAIL] Real-time email delivery active via SMTP:", process.env.SMTP_HOST);
} else {
  console.log("ℹ️  [EMAIL] SMTP not configured. Real-time emails will be delivered to in-browser Simulated Mailbox.");
}

async function sendOtpEmail(toEmail, otpCode, crn) {
  const fromAddress = process.env.EMAIL_FROM || '"Apex Bank" <onboarding@apexbank.ae>';
  const subjectLine = `Apex Bank — Your Access Code: ${otpCode}`;
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #0f172a;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="display: inline-block; background: #0284c7; color: #ffffff; font-weight: 800; font-size: 18px; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; box-shadow: 0 4px 12px rgba(2,132,199,0.25);">AB</div>
        <h2 style="color: #0f172a; margin: 12px 0 2px; font-size: 20px; font-weight: 700;">Apex Bank Corporate Portal</h2>
        <p style="color: #64748b; font-size: 13px; margin: 0;">Identity Verification Code</p>
      </div>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">Hello,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">Use the following verification code to access your corporate onboarding application for CRN <strong>${crn}</strong>:</p>
      <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
        <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0284c7; display: inline-block; font-family: monospace;">${otpCode}</span>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.4;">This code will expire in <strong>5 minutes</strong>. If you did not request this verification code, please disregard this email.</p>
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 11px;">
        Apex Bank Corporate Banking Group &bull; Al Maryah Island, Abu Dhabi, UAE
      </div>
    </div>
  `;

  // Always record into simulated email stream for in-browser real-time display
  const simulated = recordSimulatedEmail({
    to: toEmail,
    from: fromAddress,
    subject: subjectLine,
    html: htmlContent,
    text: `Apex Bank — Your Access Code for CRN ${crn} is: ${otpCode}`,
    code: otpCode,
    type: "otp",
    metadata: { crn, otp: otpCode }
  });

  if (!mailTransporter) {
    console.log(`📧 [SIMULATED EMAIL] Generated OTP email for ${toEmail} -> Code: ${otpCode}`);
    return { emailSent: false, simulatedEmail: simulated };
  }

  try {
    await mailTransporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: subjectLine,
      html: htmlContent
    });
    console.log(`📧 [EMAIL] Real-time OTP successfully emailed to ${toEmail}`);
    return { emailSent: true, simulatedEmail: simulated };
  } catch (err) {
    console.error(`❌ [EMAIL] Error sending email to ${toEmail}:`, err.message);
    return { emailSent: false, simulatedEmail: simulated };
  }
}

// ── Security Middlewares ──
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows inline SVG / canvas assets used in demo
    crossOriginEmbedderPolicy: false
  })
);
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Rate limiters (with trust proxy support enabled)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  message: { error: "Too many requests, please try again later." }
});
app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: false },
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." }
});

// ── Database Connection & Fallback Store ──
let pool = null;
let useDatabase = false;

// In-memory fallback store for local development without active DB
const memStore = {
  applications: new Map(), // application_ref -> record
  crnEmailIndex: new Map(), // `${crn}:${email}` -> application_ref
  otpStore: new Map() // `${crn}:${email}` -> { otp, expiresAt }
};

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
  try {
    const isLocalhost = process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("127.0.0.1");
    // Remote PostgreSQL (Supabase poolers, Railway, Neon) requires SSL without rejecting self-signed pooler certificates
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocalhost ? false : { rejectUnauthorized: false }
    });

    pool.on("error", (err) => {
      console.error("[DATABASE] Unexpected client error:", err.message);
    });

    pool
      .query(`
        SELECT NOW();
        ALTER TABLE corporate_onboarding_applications ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE corporate_onboarding_applications ADD COLUMN IF NOT EXISTS current_step INT DEFAULT 1;
        ALTER TABLE corporate_onboarding_applications ADD COLUMN IF NOT EXISTS company_name TEXT;
        ALTER TABLE corporate_onboarding_applications ADD COLUMN IF NOT EXISTS trade_name TEXT;
        ALTER TABLE corporate_onboarding_applications ADD COLUMN IF NOT EXISTS legal_type TEXT;
        ALTER TABLE corporate_onboarding_applications ADD COLUMN IF NOT EXISTS licence_issue_date TEXT;
        ALTER TABLE corporate_onboarding_applications ADD COLUMN IF NOT EXISTS licence_expiry_date TEXT;
        ALTER TABLE corporate_onboarding_applications ADD COLUMN IF NOT EXISTS licence_issued_by TEXT;
        ALTER TABLE corporate_onboarding_applications ADD COLUMN IF NOT EXISTS vat_trn TEXT;
      `)
      .then(() => {
        useDatabase = true;
        console.log("✅ [DATABASE] Successfully connected and synced schema with PostgreSQL / Supabase");
      })
      .catch((err) => {
        console.warn("⚠️  [DATABASE] Could not connect to PostgreSQL:", err.message);
        console.warn("ℹ️  [DATABASE] Falling back to secure in-memory application store for local development.");
        useDatabase = false;
      });
  } catch (err) {
    console.warn("⚠️  [DATABASE] Initialization error:", err.message);
    useDatabase = false;
  }
} else {
  console.log("ℹ️  [DATABASE] No DATABASE_URL configured. Running with in-memory application store for local testing.");
}

// ── Authentication Middleware ──
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing authentication token." });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { crn, email, application_ref }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired session token." });
  }
}

// ── Country Map for MRZ Parsing ──
const countryMap = {
  GBR: "British", IND: "Indian", ARE: "Emirati", USA: "American", CAN: "Canadian",
  AUS: "Australian", PAK: "Pakistani", BHR: "Bahraini", KWT: "Kuwaiti", OMN: "Omani",
  QAT: "Qatari", SAU: "Saudi", EGY: "Egyptian", LBN: "Lebanese", JOR: "Jordanian",
  IRQ: "Iraqi", SYR: "Syrian", YEM: "Yemeni", FRA: "French", DEU: "German",
  ITA: "Italian", ESP: "Spanish", NLD: "Dutch", BEL: "Belgian", CHE: "Swiss",
  SWE: "Swedish", NOR: "Norwegian", DNK: "Danish", FIN: "Finnish", RUS: "Russian",
  CHN: "Chinese", JPN: "Japanese", KOR: "South Korean", SGP: "Singaporean",
  MYS: "Malaysian", IDN: "Indonesian", PHL: "Filipino", THA: "Thai", VNM: "Vietnamese",
  ZAF: "South African", NGA: "Nigerian", KEN: "Kenyan", ETH: "Ethiopian"
};

// ── MRZ & Document Parser ──
function parseDocumentText(text) {
  const data = {};
  if (!text || typeof text !== "string") return data;

  const lines = text.split("\n").map((l) => l.trim());
  const mrzLines = lines.filter((l) => l.length > 28 && l.includes("<"));

  if (mrzLines.length >= 2) {
    const line1 = mrzLines[0].replace(/\s/g, "");
    const line2 = mrzLines[1].replace(/\s/g, "");

    const line1NoHeader = line1.replace(/^P<[A-Z]{3}/, "");
    const nameParts = line1NoHeader.split("<<");
    if (nameParts.length >= 2) {
      const surname = nameParts[0].replace(/</g, " ").trim();
      const givenNames = nameParts[1].replace(/</g, " ").trim();
      data.fullName = `${givenNames} ${surname}`.trim();
      data.surname = surname;
      data.givenNames = givenNames;
    }

    const natMatch = line1.match(/P<([A-Z]{3})/);
    if (natMatch) {
      const code = natMatch[1];
      data.nationality = countryMap[code] || code;
    }

    if (line2.length >= 9) {
      data.passportNumber = line2.substring(0, 9).replace(/</g, "");
    }

    if (line2.length >= 19) {
      const dobRaw = line2.substring(13, 19);
      if (/^\d{6}$/.test(dobRaw)) {
        const year = parseInt(dobRaw.substring(0, 2), 10);
        const month = dobRaw.substring(2, 4);
        const day = dobRaw.substring(4, 6);
        const fullYear = year < 70 ? 2000 + year : 1900 + year;
        data.dob = `${fullYear}-${month}-${day}`;
      }
    }

    if (line2.length >= 21) {
      const gender = line2.charAt(20);
      if (gender === "M" || gender === "F") {
        data.gender = gender === "M" ? "Male" : "Female";
      }
    }

    if (line2.length >= 27) {
      const expRaw = line2.substring(21, 27);
      if (/^\d{6}$/.test(expRaw)) {
        const year = parseInt(expRaw.substring(0, 2), 10);
        const month = expRaw.substring(2, 4);
        const day = expRaw.substring(4, 6);
        const fullYear = year < 70 ? 2000 + year : 1900 + year;
        data.expiry = `${fullYear}-${month}-${day}`;
      }
    }
    return data;
  }

  // Fallback: Corporate Trade License / Registration text extraction
  const nameMatch = text.match(/(?:Company Name|Trade Name|Business Name|Entity Name)\s*:?\s*([^\n\r]+)/i);
  if (nameMatch) {
    data.fullName = nameMatch[1].trim();
  }

  const licenceMatch = text.match(/(?:License No|Registration No|TRN|Licence No|License Number)\s*[:.]?\s*([A-Z0-9\s\-]{4,25})/i);
  if (licenceMatch) {
    data.registrationNumber = licenceMatch[1].replace(/\s/g, "").trim();
  }

  const authorityMatch = text.match(/(?:Government of|Free Zone Authority|Department of Economic Development|Ministry of Economy|ADGM|DIFC)\s*([A-Za-z\s]{2,40})/i);
  if (authorityMatch) {
    data.issuingAuthority = authorityMatch[0].trim();
  }

  return data;
}

// ── Static Assets ──
app.use(express.static(path.join(__dirname, "public")));

// ── AUTH ENDPOINTS ──

// 1. Request OTP (Server-generated, time-limited OTP)
app.post("/api/auth/request-otp", authLimiter, async (req, res) => {
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

  console.log(`[AUTH] OTP requested for CRN: ${cleanCrn}, Email: ${cleanEmail} -> OTP: ${randomCode} (Universal Demo Code: 1111 always active)`);

  // Attempt real email dispatch if SMTP is configured, and buffer in simulated inbox
  const emailResult = await sendOtpEmail(cleanEmail, randomCode, cleanCrn);

  const responsePayload = {
    success: true,
    message: `A verification code has been dispatched to ${cleanEmail}.`,
    emailSent: emailResult.emailSent,
    simulatedEmail: emailResult.simulatedEmail,
    // Always include debugOtp and demoCode so users and pair-programmers are never blocked:
    debugOtp: randomCode,
    demoCode: "1111",
    demoHint: `Use code ${randomCode} or 1111 to log in.`
  };

  return res.json(responsePayload);
});

// 2. Verify OTP & Issue Secure JWT Session Token
app.post("/api/auth/verify-otp", authLimiter, async (req, res) => {
  const { crn, email, otp } = req.body;
  if (!crn || !email || !otp) {
    return res.status(400).json({ error: "CRN, Email, and OTP code are required." });
  }

  const cleanCrn = crn.trim();
  const cleanEmail = email.trim().toLowerCase();
  const key = `${cleanCrn}:${cleanEmail}`;
  const storedOtpData = memStore.otpStore.get(key);

  // Accept generated OTP OR universal demo code '1111'
  const isValidOtp =
    (storedOtpData && storedOtpData.otp === otp && storedOtpData.expiresAt > Date.now()) ||
    otp === "1111";

  if (!isValidOtp) {
    return res.status(401).json({ error: "Invalid or expired OTP code. Please request a new one (or use demo code 1111)." });
  }

  // Clear OTP once verified
  memStore.otpStore.delete(key);

  try {
    let applicationRecord = null;
    let isNew = false;

    if (useDatabase) {
      const existing = await pool.query(
        "SELECT * FROM corporate_onboarding_applications WHERE crn = $1 AND registered_email = $2 LIMIT 1",
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
        const newRecord = await pool.query(
          `INSERT INTO corporate_onboarding_applications (
             application_ref, crn, registered_email, current_step, status, form_data, legal_type, company_name, trade_name
           ) VALUES ($1, $2, $3, 1, 'draft', $4::jsonb, $5, $6, $7) RETURNING *`,
          [appRef, cleanCrn, cleanEmail, JSON.stringify(initialFormData), "Limited Liability Company (LLC)", defaultCompany, defaultCompany]
        );
        applicationRecord = newRecord.rows[0];
        isNew = true;
      }
    } else {
      // In-Memory store
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

    // Issue signed JWT Session Token
    const token = jwt.sign(
      {
        crn: applicationRecord.crn,
        email: applicationRecord.registered_email,
        application_ref: applicationRecord.application_ref
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      isNew,
      token,
      data: applicationRecord
    });
  } catch (err) {
    console.error("[AUTH] Verification error:", err);
    return res.status(500).json({ error: "Internal Server Error during verification." });
  }
});

// ── APPLICATION ENDPOINTS (Protected by requireAuth) ──

// 3. Get Current User Application (Session Rehydration)
app.get("/api/application/current", requireAuth, async (req, res) => {
  const { application_ref } = req.user;

  try {
    let applicationRecord = null;
    if (useDatabase) {
      const result = await pool.query(
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

    return res.json({ success: true, data: applicationRecord });
  } catch (err) {
    console.error("[APPLICATION] Fetch error:", err);
    return res.status(500).json({ error: "Failed to load application data." });
  }
});

// 4. Save Application Progress (IDOR Protected via JWT application_ref)
app.post("/api/application/save", requireAuth, async (req, res) => {
  // Enforce session application_ref: user cannot overwrite other applicants
  const application_ref = req.user.application_ref;
  const { current_step, status, form_data } = req.body;

  try {
    let existingRecord = null;
    if (useDatabase) {
      const fetchRes = await pool.query(
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

    // Preserve 'submitted' status if an auto-save runs without explicit status
    let resolvedStatus = existingRecord.status;
    if (status && typeof status === "string" && status.trim() !== "") {
      resolvedStatus = status.trim();
    }

    const resolvedStep = typeof current_step === "number" ? current_step : existingRecord.current_step;

    // Merge form_data rather than blind full-wipe
    const existingFormData = existingRecord.form_data || {};
    const incomingFormData = form_data || {};
    const mergedFormData = {
      ...existingFormData,
      ...incomingFormData
    };

    let updatedRecord = null;
    if (useDatabase) {
      const s2 = mergedFormData.step2 || {};
      const companyName = s2.company_name || null;
      const tradeName = s2.trade_name || null;
      const legalType = s2.legal_type || null;
      const issueDate = s2.issue_date || null;
      const expiryDate = s2.expiry_date || null;
      const issuedBy = s2.issued_by || null;
      const vatTrn = s2.vat_trn || null;

      const result = await pool.query(
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
      recordSimulatedEmail({
        to: recipientEmail,
        from: '"Apex Bank Corporate Onboarding" <onboarding@apexbank.ae>',
        subject: `Apex Bank — Corporate Application Received (${application_ref})`,
        type: "application_submitted",
        metadata: { application_ref },
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="display: inline-block; background: #0284c7; color: #ffffff; font-weight: 800; font-size: 18px; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; box-shadow: 0 4px 12px rgba(2,132,199,0.25);">AB</div>
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
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 11px;">
              Apex Bank Corporate Banking Group &bull; Al Maryah Island, Abu Dhabi, UAE
            </div>
          </div>
        `,
        text: `Apex Bank: Application ${application_ref} received successfully.`
      });
    }

    return res.json({ success: true, data: updatedRecord });
  } catch (err) {
    console.error("[APPLICATION] Save error:", err);
    return res.status(500).json({ error: "Failed to persist application progress." });
  }
});

// ── SIMULATED EMAILS ENDPOINTS ──

// Retrieve all recent simulated emails
app.get("/api/emails", (req, res) => {
  const filterEmail = req.query.email ? req.query.email.trim().toLowerCase() : null;
  const results = filterEmail
    ? simulatedEmails.filter(e => e.to.toLowerCase() === filterEmail || e.type === "otp")
    : simulatedEmails;
  res.json({ success: true, count: results.length, emails: results });
});

// Clear simulated email inbox
app.delete("/api/emails", (req, res) => {
  simulatedEmails.length = 0;
  res.json({ success: true, message: "Simulated inbox cleared." });
});

// Manually dispatch a simulated email (DocuSign, Resume link, custom notification)
app.post("/api/emails/simulate", (req, res) => {
  const { to, subject, html, text, type, metadata, code } = req.body;
  const emailItem = recordSimulatedEmail({
    to: to || "admin@apexholdings.ae",
    from: '"Apex Bank" <onboarding@apexbank.ae>',
    subject: subject || "Apex Bank Corporate Update",
    html: html || "<p>Notification from Apex Bank</p>",
    text: text || "Notification from Apex Bank",
    code: code || null,
    type: type || "system",
    metadata: metadata || {}
  });
  console.log(`📧 [SIMULATED EMAIL DISPATCHED] "${emailItem.subject}" -> ${emailItem.to}`);
  res.json({ success: true, email: emailItem });
});

// 5. Server-Side Document OCR (Protects Google Vision API Key & Customer Documents)
app.post("/api/documents/ocr", requireAuth, async (req, res) => {
  const { imageBase64, docType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Image base64 content is required." });
  }

  try {
    let extractedText = "";

    // If server has GOOGLE_VISION_API_KEY configured, call Google Cloud Vision securely
    if (GOOGLE_VISION_API_KEY) {
      try {
        const gResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: imageBase64.replace(/^data:image\/\w+;base64,/, "") },
                features: [{ type: "TEXT_DETECTION" }]
              }
            ]
          })
        });

        const gData = await gResponse.json();
        if (gData.responses && gData.responses[0] && gData.responses[0].textAnnotations) {
          extractedText = gData.responses[0].textAnnotations[0].description || "";
        }
      } catch (gErr) {
        console.warn("[OCR] Google Vision call error:", gErr.message);
      }
    }

    const parsedData = parseDocumentText(extractedText);

    // Fallback: If OCR returns minimal data (or API key not configured), generate contextual demo entity
    if (!parsedData.fullName) {
      if (docType === "corporate") {
        parsedData.fullName = "Apex Global Holdings Ltd";
        parsedData.registrationNumber = "CRN-8849201";
        parsedData.issuingAuthority = "Dubai Economy & Tourism (DET)";
        parsedData.expiry = "2028-11-30";
      } else {
        parsedData.fullName = "Alexander James Vance";
        parsedData.passportNumber = "P98421054";
        parsedData.nationality = "British";
        parsedData.dob = "1984-06-15";
        parsedData.expiry = "2031-06-14";
        parsedData.gender = "Male";
      }
    }

    return res.json({
      success: true,
      extractedText,
      data: parsedData
    });
  } catch (err) {
    console.error("[OCR] Processing error:", err);
    return res.status(500).json({ error: "OCR processing failed." });
  }
});

// ── Start Server ──
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Apex Bank Corporate Portal server running on port ${PORT}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  server.close(() => {
    if (pool) pool.end();
    process.exit(0);
  });
});
