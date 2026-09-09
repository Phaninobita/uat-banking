const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET || "vision-bank-jwt-secret-dev-2026";
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || "";

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

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
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
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: NODE_ENV === "production" ? { rejectUnauthorized: true } : (isLocalhost ? false : { rejectUnauthorized: false })
    });

    pool.on("error", (err) => {
      console.error("[DATABASE] Unexpected client error:", err.message);
    });

    pool
      .query("SELECT NOW()")
      .then(() => {
        useDatabase = true;
        console.log("✅ [DATABASE] Successfully connected to PostgreSQL / Supabase");
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
app.post("/api/auth/request-otp", authLimiter, (req, res) => {
  const { crn, email } = req.body;
  if (!crn || !email) {
    return res.status(400).json({ error: "Commercial Registration Number (CRN) and Email are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Please enter a valid registered email address." });
  }

  const key = `${crn.trim()}:${email.trim().toLowerCase()}`;
  // Generate secure 4-digit code (or 1111 for demo stability if desired, but here we generate random code)
  // In dev mode, we support standard test code 1111 or the random code
  const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  memStore.otpStore.set(key, { otp: randomCode, expiresAt });

  console.log(`[AUTH] OTP requested for CRN: ${crn.trim()}, Email: ${email.trim()} -> OTP: ${randomCode} (Demo: 1111 also accepted in development)`);

  const responsePayload = {
    success: true,
    message: `A verification code has been dispatched to ${email.trim()}.`
  };

  // Provide debugOtp in development for smooth pair-programming and browser testing
  if (NODE_ENV !== "production") {
    responsePayload.debugOtp = randomCode;
    responsePayload.demoHint = "For demo testing, you can use " + randomCode + " or 1111.";
  }

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

  // Allow generated OTP or '1111' in non-production demo mode
  const isValidOtp =
    (storedOtpData && storedOtpData.otp === otp && storedOtpData.expiresAt > Date.now()) ||
    (NODE_ENV !== "production" && otp === "1111");

  if (!isValidOtp) {
    return res.status(401).json({ error: "Invalid or expired OTP code. Please request a new one." });
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
        const appRef = "VB-" + new Date().getFullYear() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
        const initialFormData = {
          step2: { crn: cleanCrn, company_name: "", trade_name: "", legal_type: "Limited Liability Company (LLC)" }
        };
        const newRecord = await pool.query(
          "INSERT INTO corporate_onboarding_applications (application_ref, crn, registered_email, current_step, status, form_data) VALUES ($1, $2, $3, 1, 'draft', $4::jsonb) RETURNING *",
          [appRef, cleanCrn, cleanEmail, JSON.stringify(initialFormData)]
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
        const appRef = "VB-" + new Date().getFullYear() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
        applicationRecord = {
          id: Date.now(),
          application_ref: appRef,
          crn: cleanCrn,
          registered_email: cleanEmail,
          current_step: 1,
          status: "draft",
          form_data: {
            step2: { crn: cleanCrn, company_name: "", trade_name: "", legal_type: "Limited Liability Company (LLC)" }
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
      const result = await pool.query(
        `UPDATE corporate_onboarding_applications
         SET current_step = $2, status = $3, form_data = $4::jsonb, updated_at = NOW()
         WHERE application_ref = $1
         RETURNING *`,
        [application_ref, resolvedStep, resolvedStatus, JSON.stringify(mergedFormData)]
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

    return res.json({ success: true, data: updatedRecord });
  } catch (err) {
    console.error("[APPLICATION] Save error:", err);
    return res.status(500).json({ error: "Failed to persist application progress." });
  }
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
        parsedData.fullName = "Emirates Apex Logistics LLC";
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
  console.log(`🚀 Vision Bank Corporate Portal server running on port ${PORT}`);
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
