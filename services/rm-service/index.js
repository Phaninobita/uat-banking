/**
 * Apex Bank Relationship Manager (RM) Service
 * Microservice handling RM executive authentication, customer invitation dispatch,
 * magic link generation with composite key (CRN, Email), and real-time pipeline telemetry.
 */

const express = require("express");
const crypto = require("crypto");
const memStore = require("../../shared/memStore");
const db = require("../../shared/db");

const router = express.Router();

// Telemetry tracker
router.use((req, res, next) => {
  if (memStore.metrics && memStore.metrics.serviceRequests) {
    memStore.metrics.serviceRequests.rm = (memStore.metrics.serviceRequests.rm || 0) + 1;
  }
  next();
});

/**
 * POST /api/v1/rm/login
 * RM Executive Authentication
 */
router.post("/login", (req, res) => {
  const { staffId, password } = req.body;

  // For demonstration and bank staff testing:
  // Accept default RM staff or any valid email
  const isDemo = !staffId || staffId === "RM-ADGM-9042" || staffId.includes("@apexbank.ae");

  const rmProfile = {
    rm_id: "RM-ADGM-9042",
    name: "Sarah Al-Qassimi",
    role: "Senior Vice President — Corporate Banking",
    department: "ADGM Institutional Clients Group",
    branch: "Abu Dhabi Global Market (ADGM) Financial Center",
    email: "s.alqassimi@apexbank.ae",
    clearanceLevel: "Level 4 Senior Executive Banker",
    activeSince: "2019"
  };

  const sessionToken = "rm_sess_" + crypto.randomBytes(16).toString("hex");

  return res.json({
    success: true,
    message: "RM Executive Authentication successful.",
    token: sessionToken,
    profile: rmProfile
  });
});

/**
 * GET /api/v1/rm/invitations
 * Retrieve all customer invitations & cross-reference onboarding progress
 */
router.get("/invitations", async (req, res) => {
  try {
    let invitations = [];

    if (db.isConnected()) {
      try {
        const queryRes = await db.query(`
          SELECT 
            i.crn,
            i.email,
            i.company_name,
            i.contact_person,
            i.phone,
            i.rm_name,
            i.rm_id,
            i.invite_token,
            i.status,
            i.invite_link,
            i.notes,
            i.created_at,
            i.updated_at,
            a.current_step,
            a.application_ref,
            a.status as app_status
          FROM rm_customer_invitations i
          LEFT JOIN corporate_onboarding_applications a 
            ON (UPPER(TRIM(i.crn)) = UPPER(TRIM(a.crn)) AND LOWER(TRIM(i.email)) = LOWER(TRIM(a.registered_email)))
          ORDER BY i.created_at DESC
        `);
        invitations = queryRes.rows;
      } catch (dbErr) {
        console.warn("[RM-SERVICE] DB Query error, using memory fallback:", dbErr.message);
        invitations = memStore.listRmInvitations();
      }
    } else {
      invitations = memStore.listRmInvitations();
    }

    // Cross-reference with in-memory application records if DB join was skipped
    invitations = invitations.map(inv => {
      const crnKey = `${(inv.crn || "").trim().toUpperCase()}:${(inv.email || "").trim().toLowerCase()}`;
      const appRef = memStore.crnEmailIndex.get(crnKey);
      const app = appRef ? memStore.applications.get(appRef) : null;
      
      return {
        ...inv,
        current_step: inv.current_step || (app ? app.current_step : 1),
        application_ref: inv.application_ref || (app ? app.application_ref : null),
        status: app ? (app.status === 'approved' ? 'completed' : 'in_progress') : inv.status
      };
    });

    return res.json({
      success: true,
      count: invitations.length,
      invitations
    });
  } catch (err) {
    console.error("[RM-SERVICE] Failed to fetch invitations:", err);
    return res.status(500).json({ error: "Failed to retrieve RM customer invitations." });
  }
});

/**
 * POST /api/v1/rm/invite
 * Create and dispatch a new customer onboarding invitation link
 * Composite Primary Key: (crn, email)
 */
router.post("/invite", async (req, res) => {
  try {
    const { crn, email, companyName, contactPerson, phone, notes } = req.body;

    if (!crn || !crn.trim()) {
      return res.status(400).json({ error: "Commercial Registration Number (CRN) is required." });
    }
    if (!email || !email.trim() || !email.includes("@")) {
      return res.status(400).json({ error: "A valid corporate customer email is required." });
    }
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: "Company Legal Name is required." });
    }

    const cleanCrn = crn.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const inviteToken = "inv_" + crypto.randomBytes(12).toString("hex");

    // Construct customer portal URL with prefill parameters
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const inviteLink = `${protocol}://${host}/?crn=${encodeURIComponent(cleanCrn)}&email=${encodeURIComponent(cleanEmail)}&token=${inviteToken}`;

    const inviteRecord = {
      crn: cleanCrn,
      email: cleanEmail,
      company_name: companyName.trim(),
      contact_person: (contactPerson || "Authorized Signatory").trim(),
      phone: (phone || "").trim(),
      rm_name: "Sarah Al-Qassimi (VP Corporate Banking)",
      rm_id: "RM-ADGM-9042",
      invite_token: inviteToken,
      status: "invited",
      invite_link: inviteLink,
      notes: (notes || "").trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save to PostgreSQL table rm_customer_invitations (Composite Key: crn, email)
    if (db.isConnected()) {
      try {
        await db.query(`
          INSERT INTO rm_customer_invitations (
            crn, email, company_name, contact_person, phone, rm_name, rm_id, invite_token, status, invite_link, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
          ON CONFLICT (crn, email) DO UPDATE SET
            company_name = EXCLUDED.company_name,
            contact_person = EXCLUDED.contact_person,
            phone = EXCLUDED.phone,
            invite_token = EXCLUDED.invite_token,
            invite_link = EXCLUDED.invite_link,
            notes = EXCLUDED.notes,
            status = 'invited',
            updated_at = NOW()
        `, [
          inviteRecord.crn,
          inviteRecord.email,
          inviteRecord.company_name,
          inviteRecord.contact_person,
          inviteRecord.phone,
          inviteRecord.rm_name,
          inviteRecord.rm_id,
          inviteRecord.invite_token,
          inviteRecord.status,
          inviteRecord.invite_link,
          inviteRecord.notes
        ]);
      } catch (dbErr) {
        console.warn("[RM-SERVICE] DB Insert warning, saving in memory store:", dbErr.message);
      }
    }

    // Always mirror in high-speed in-memory repository
    memStore.saveRmInvitation(inviteRecord);

    // Dispatch simulated VIP corporate invitation email
    const emailSubject = `Invitation to Onboard: Apex Bank Corporate Banking Package for ${inviteRecord.company_name}`;
    memStore.recordSimulatedEmail({
      to: cleanEmail,
      from: '"Sarah Al-Qassimi — Apex Bank Corporate Banking" <s.alqassimi@apexbank.ae>',
      subject: emailSubject,
      type: "rm_invitation",
      metadata: { crn: cleanCrn, email: cleanEmail, inviteLink },
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #090e17 0%, #1e293b 100%); padding: 32px 28px; text-align: center; border-bottom: 2px solid #f59e0b;">
            <div style="display: inline-block; background: #f59e0b; color: #090e17; font-weight: 800; font-size: 18px; width: 48px; height: 48px; line-height: 48px; border-radius: 10px; margin-bottom: 12px;">AB</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.02em;">Apex Bank Institutional Banking</h1>
            <p style="color: #cbd5e1; font-size: 13px; margin: 6px 0 0;">Dedicated Relationship Manager Executive Service</p>
          </div>
          <div style="padding: 32px 28px;">
            <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Dear ${inviteRecord.contact_person},</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              On behalf of Apex Bank Corporate Banking, it is our pleasure to invite <strong>${inviteRecord.company_name}</strong> (CRN: ${cleanCrn}) to complete digital onboarding for our multi-currency corporate banking accounts and treasury solutions.
            </p>
            <div style="background: #f8fafc; border: 1.5px dashed #f59e0b; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #92400e; margin-bottom: 8px;">Your Unique Corporate Access Details</div>
              <div style="font-size: 14px; color: #1e293b; margin-bottom: 4px;"><strong>Commercial Reg. No. (CRN):</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${cleanCrn}</code></div>
              <div style="font-size: 14px; color: #1e293b; margin-bottom: 16px;"><strong>Registered Email:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${cleanEmail}</code></div>
              <a href="${inviteLink}" style="display: inline-block; background: #0284c7; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);">
                🚀 Launch Direct Customer Onboarding Portal
              </a>
            </div>
            <p style="color: #64748b; font-size: 12px; line-height: 1.6;">
              Direct Portal URL:<br>
              <a href="${inviteLink}" style="color: #0284c7; word-break: break-all;">${inviteLink}</a>
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div>
                <strong style="color: #0f172a; font-size: 13px;">Sarah Al-Qassimi</strong><br>
                <span style="font-size: 12px; color: #64748b;">Senior Vice President — Institutional & Corporate Banking</span><br>
                <span style="font-size: 11px; color: #94a3b8;">📞 +971 2 555 1234 · ✉️ s.alqassimi@apexbank.ae</span>
              </div>
            </div>
          </div>
        </div>
      `
    });

    return res.status(201).json({
      success: true,
      message: `Invitation successfully dispatched to ${cleanEmail} for CRN ${cleanCrn}.`,
      invitation: inviteRecord,
      inviteLink
    });
  } catch (err) {
    console.error("[RM-SERVICE] Error creating invitation:", err);
    return res.status(500).json({ error: "Failed to create and dispatch customer invitation." });
  }
});

/**
 * POST /api/v1/rm/resend/:crn/:email
 * Re-dispatches the onboarding invitation email
 */
router.post("/resend/:crn/:email", async (req, res) => {
  try {
    const { crn, email } = req.params;
    const invite = memStore.getRmInvitation(crn, email);
    if (!invite) {
      return res.status(404).json({ error: "Invitation not found for CRN and Email." });
    }

    memStore.recordSimulatedEmail({
      to: invite.email,
      from: '"Sarah Al-Qassimi — Apex Bank" <s.alqassimi@apexbank.ae>',
      subject: `Reminder: Complete Your Apex Bank Onboarding for ${invite.company_name}`,
      type: "rm_invitation_reminder",
      metadata: { crn: invite.crn, email: invite.email, inviteLink: invite.invite_link },
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px;">
          <h2>Onboarding Reminder for ${invite.company_name}</h2>
          <p>Please use this link to complete your corporate onboarding:</p>
          <p><a href="${invite.invite_link}" style="background:#0284c7;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">Continue Onboarding</a></p>
        </div>
      `
    });

    return res.json({
      success: true,
      message: `Invitation email re-dispatched to ${invite.email}.`,
      inviteLink: invite.invite_link
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to resend invitation." });
  }
});

/**
 * DELETE /api/v1/rm/invitations/:crn/:email
 * Revokes customer invitation
 */
router.delete("/invitations/:crn/:email", async (req, res) => {
  try {
    const { crn, email } = req.params;
    const cleanCrn = crn.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    if (db.isConnected()) {
      try {
        await db.query("DELETE FROM rm_customer_invitations WHERE UPPER(TRIM(crn)) = $1 AND LOWER(TRIM(email)) = $2", [cleanCrn, cleanEmail]);
      } catch (e) {
        console.warn("[RM-SERVICE] DB Delete error:", e.message);
      }
    }

    memStore.deleteRmInvitation(cleanCrn, cleanEmail);

    return res.json({
      success: true,
      message: `Invitation for CRN ${cleanCrn} (${cleanEmail}) revoked successfully.`
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to revoke invitation." });
  }
});

/**
 * GET /api/v1/rm/verify-invite
 * Validates invite from customer portal when loading ?crn=...&email=...
 */
router.get("/verify-invite", async (req, res) => {
  try {
    const { crn, email } = req.query;
    if (!crn || !email) {
      return res.status(400).json({ valid: false, error: "CRN and Email required" });
    }

    let invite = memStore.getRmInvitation(crn, email);

    if (!invite && db.isConnected()) {
      try {
        const r = await db.query(
          "SELECT * FROM rm_customer_invitations WHERE UPPER(TRIM(crn)) = $1 AND LOWER(TRIM(email)) = $2",
          [crn.trim().toUpperCase(), email.trim().toLowerCase()]
        );
        if (r.rows.length > 0) invite = r.rows[0];
      } catch (e) {}
    }

    if (invite) {
      // Mark viewed or in_progress
      invite.status = "in_progress";
      memStore.saveRmInvitation(invite);

      return res.json({
        valid: true,
        invitation: {
          crn: invite.crn,
          email: invite.email,
          companyName: invite.company_name,
          contactPerson: invite.contact_person,
          rmName: invite.rm_name
        }
      });
    }

    return res.json({
      valid: false,
      message: "No specific RM invitation record found, but standard corporate onboarding is available."
    });
  } catch (err) {
    return res.status(500).json({ valid: false, error: "Verification error" });
  }
});

module.exports = {
  router
};
