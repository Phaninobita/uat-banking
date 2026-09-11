/**
 * First National Bank Platform — High-Fidelity In-Memory Repository & Event Store
 * Provides instant persistence, zero-downtime development, and fallback support.
 */

const crypto = require("crypto");

class MemoryStore {
  constructor() {
    this.applications = new Map();
    this.crnEmailIndex = new Map(); // `${crn}:${email}` -> application_ref
    this.otpStore = new Map(); // `${crn}:${email}` -> { otp, expiresAt }
    
    // Base64 Document Vault: docId -> document record
    this.documents = new Map();
    this.nextDocId = 1;

    // Live Core Banking Accounts
    this.accounts = new Map();
    
    // Transaction Ledger
    this.transactions = [];

    // Real-Time Simulated Email Buffer
    this.simulatedEmails = [];

    // Corporate Audit Logs Store (Web and Mobile Events)
    this.auditLogs = [];

    // Company UID to Application Ref Index
    this.companyUidIndex = new Map();

    // Strict 1:1 CRN to Company UID Index
    this.crnToCompanyUid = new Map();

    // Relationship Manager (RM) Customer Invitations Repository
    // Key: `${crn.trim().toUpperCase()}:${email.trim().toLowerCase()}` -> invitation record
    this.rmInvitations = new Map();

    // Relationship Manager (RM) Authorized Users & Executives
    // Key: username (lowercase) -> user record
    this.rmUsers = new Map();

    // ── 7-Stage Domain Stores (Primary Key / Foreign Key: company_uid) ──
    this.companyProfiles = new Map();        // Stage 2: Corporate Profile
    this.ubosSignatories = new Map();        // Stage 3: UBO & Signatory Registry
    this.ownershipStructures = new Map();    // Stage 4: Shareholding & Hierarchy
    this.governanceMandates = new Map();     // Stage 5: Governance & Signing Mandates
    this.taxCompliance = new Map();          // Stage 6: FATCA / CRS Tax & Regulatory
    this.declarationsSignatures = new Map(); // Stage 7: Legal Declarations & E-Signatures


    // Microservice Telemetry & Health metrics
    this.metrics = {
      startTime: Date.now(),
      requestsCount: 0,
      serviceRequests: {
        gateway: 0,
        auth: 0,
        documents: 0,
        applications: 0,
        banking: 0,
        notifications: 0,
        rm: 0
      }
    };

    this._seedInitialData();
  }

  _seedInitialData() {
    // Seed primary Relationship Manager user (Phanee)
    this.saveRmUser({
      username: "phanee",
      password_hash: "Visionbank@324",
      full_name: "Phanee",
      email: "phanee@fnb-us.com",
      role: "Senior Relationship Manager · Corporate Banking",
      branch: "New York Financial Center",
      status: "active"
    });
    // Note: No demo accounts, transactions, or customer invitations are pre-seeded.
    // Database and in-memory stores start completely fresh.
  }

  getRmUser(usernameOrEmail) {
    if (!usernameOrEmail) return null;
    const clean = usernameOrEmail.trim().toLowerCase();
    if (this.rmUsers.has(clean)) return this.rmUsers.get(clean);
    for (const u of this.rmUsers.values()) {
      if (u.email && u.email.toLowerCase() === clean) return u;
    }
    return null;
  }

  saveRmUser(user) {
    const clean = (user.username || "").trim().toLowerCase();
    if (!clean) return null;
    const record = {
      username: clean,
      password_hash: user.password_hash || user.password || "Visionbank@324",
      full_name: user.full_name || user.name || clean,
      email: (user.email || `${clean}@fnb-us.com`).trim().toLowerCase(),
      role: user.role || "Senior Relationship Manager · Corporate Banking",
      branch: user.branch || "New York Financial Center",
      status: user.status || "active",
      created_at: user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.rmUsers.set(clean, record);
    return record;
  }

  listRmUsers() {
    return Array.from(this.rmUsers.values());
  }

  getCompanyUidForCrn(crn) {
    if (!crn) return null;
    const clean = crn.trim().toUpperCase();
    if (this.crnToCompanyUid.has(clean)) {
      return this.crnToCompanyUid.get(clean);
    }
    // Check existing applications
    for (const app of this.applications.values()) {
      if (app.crn && app.crn.trim().toUpperCase() === clean && app.company_uid) {
        this.crnToCompanyUid.set(clean, app.company_uid);
        return app.company_uid;
      }
    }
    // Check existing invitations
    for (const inv of this.rmInvitations.values()) {
      if (inv.crn && inv.crn.trim().toUpperCase() === clean && inv.company_uid) {
        this.crnToCompanyUid.set(clean, inv.company_uid);
        return inv.company_uid;
      }
    }
    return null;
  }

  setCompanyUidForCrn(crn, uid) {
    if (!crn || !uid) return;
    this.crnToCompanyUid.set(crn.trim().toUpperCase(), uid.trim().toUpperCase());
  }

  getApplicationByUidAndId(companyUid, id) {
    if (!companyUid) return null;
    const cleanUid = companyUid.trim().toUpperCase();
    const cleanId = id ? id.toString() : null;
    for (const app of this.applications.values()) {
      const matchUid = app.company_uid && app.company_uid.trim().toUpperCase() === cleanUid;
      if (matchUid) {
        if (!cleanId) return app;
        if (app.id && app.id.toString() === cleanId) return app;
        if (app.application_ref && app.application_ref === cleanId) return app;
      }
    }
    return null;
  }

  getApplicationByUid(companyUid) {
    return this.getApplicationByUidAndId(companyUid, null);
  }

  saveRmInvitation(invite) {
    const crn = (invite.crn || "").trim().toUpperCase();
    const email = (invite.email || "").trim().toLowerCase();
    const key = `${crn}:${email}`;
    const existing = this.rmInvitations.get(key) || {};
    
    // Strict 1:1 CRN-to-UID resolution
    let company_uid = invite.company_uid || existing.company_uid || this.getCompanyUidForCrn(crn);
    if (!company_uid) {
      company_uid = "CUID-" + crn.replace(/[^A-Z0-9]/g, "");
    }
    company_uid = company_uid.toUpperCase();
    this.setCompanyUidForCrn(crn, company_uid);

    const record = {
      ...existing,
      ...invite,
      company_uid,
      crn,
      email,
      updated_at: new Date().toISOString()
    };
    if (!record.created_at) {
      record.created_at = new Date().toISOString();
    }
    this.rmInvitations.set(key, record);
    return record;
  }

  getRmInvitation(crn, email) {
    if (!crn || !email) return null;
    const key = `${crn.trim().toUpperCase()}:${email.trim().toLowerCase()}`;
    return this.rmInvitations.get(key) || null;
  }

  listRmInvitations() {
    return Array.from(this.rmInvitations.values()).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }

  deleteRmInvitation(crn, email) {
    const key = `${crn.trim().toUpperCase()}:${email.trim().toLowerCase()}`;
    return this.rmInvitations.delete(key);
  }

  recordAuditLog(log) {
    const record = {
      id: log.id || ("aud_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7)),
      company_uid: log.company_uid || null,
      action_type: (log.action_type || "ACTION").toUpperCase(),
      actor_id: (log.actor_id || "corporate_user").toString(),
      actor_name: log.actor_name || "Authorized Signatory",
      actor_role: log.actor_role || "Corporate User",
      target_crn: log.target_crn ? log.target_crn.toString().trim() : null,
      target_email: log.target_email ? log.target_email.toString().trim().toLowerCase() : null,
      target_company: log.target_company || null,
      details: log.details || "",
      status: log.status || "SUCCESS",
      device_info: log.device_info || "Web Portal",
      ip_address: log.ip_address || "127.0.0.1",
      channel: log.channel || "web",
      created_at: log.created_at || new Date().toISOString()
    };
    this.auditLogs.unshift(record);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    return record;
  }

  getAuditLogs(companyUid, crn, limit = 100) {
    let filtered = this.auditLogs;
    if (companyUid) {
      const cleanUid = companyUid.trim().toUpperCase();
      filtered = filtered.filter(l => (l.company_uid && l.company_uid.toUpperCase() === cleanUid) || (crn && l.target_crn === crn));
    } else if (crn) {
      filtered = filtered.filter(l => l.target_crn === crn);
    }
    return filtered.slice(0, limit);
  }

  recordSimulatedEmail({ to, from, subject, html, text, code, type, metadata }) {
    const emailItem = {
      id: "eml_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      to: to || "applicant@corporate.com",
      from: from || '"First National Bank" <onboarding@fnb-us.com>',
      subject: subject || "First National Bank Notification",
      html: html || "",
      text: text || "",
      code: code || null,
      type: type || "general",
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    this.simulatedEmails.unshift(emailItem);
    if (this.simulatedEmails.length > 50) {
      this.simulatedEmails.pop();
    }
    return emailItem;
  }

  // ── 7-Stage Domain Methods (Keyed on company_uid) ──
  saveCompanyProfile(companyUid, data) {
    if (!companyUid) return null;
    const uid = companyUid.trim().toUpperCase();
    const existing = this.companyProfiles.get(uid) || {};
    const updated = { ...existing, ...data, company_uid: uid, updated_at: new Date().toISOString() };
    this.companyProfiles.set(uid, updated);
    return updated;
  }
  getCompanyProfile(companyUid) {
    if (!companyUid) return null;
    return this.companyProfiles.get(companyUid.trim().toUpperCase()) || null;
  }

  saveUbosSignatories(companyUid, ubos) {
    if (!companyUid) return [];
    const uid = companyUid.trim().toUpperCase();
    const list = Array.isArray(ubos) ? ubos : (ubos ? [ubos] : []);
    const normalized = list.map((u, i) => ({
      id: u.id || `ubo_${Date.now()}_${i}`,
      company_uid: uid,
      ...u,
      updated_at: new Date().toISOString()
    }));
    this.ubosSignatories.set(uid, normalized);
    return normalized;
  }
  getUbosSignatories(companyUid) {
    if (!companyUid) return [];
    return this.ubosSignatories.get(companyUid.trim().toUpperCase()) || [];
  }

  saveOwnershipStructure(companyUid, data) {
    if (!companyUid) return null;
    const uid = companyUid.trim().toUpperCase();
    const existing = this.ownershipStructures.get(uid) || {};
    const updated = { ...existing, ...data, company_uid: uid, updated_at: new Date().toISOString() };
    this.ownershipStructures.set(uid, updated);
    return updated;
  }
  getOwnershipStructure(companyUid) {
    if (!companyUid) return null;
    return this.ownershipStructures.get(companyUid.trim().toUpperCase()) || null;
  }

  saveGovernanceMandates(companyUid, data) {
    if (!companyUid) return null;
    const uid = companyUid.trim().toUpperCase();
    const existing = this.governanceMandates.get(uid) || {};
    const updated = { ...existing, ...data, company_uid: uid, updated_at: new Date().toISOString() };
    this.governanceMandates.set(uid, updated);
    return updated;
  }
  getGovernanceMandates(companyUid) {
    if (!companyUid) return null;
    return this.governanceMandates.get(companyUid.trim().toUpperCase()) || null;
  }

  saveTaxCompliance(companyUid, data) {
    if (!companyUid) return null;
    const uid = companyUid.trim().toUpperCase();
    const existing = this.taxCompliance.get(uid) || {};
    const updated = { ...existing, ...data, company_uid: uid, updated_at: new Date().toISOString() };
    this.taxCompliance.set(uid, updated);
    return updated;
  }
  getTaxCompliance(companyUid) {
    if (!companyUid) return null;
    return this.taxCompliance.get(companyUid.trim().toUpperCase()) || null;
  }

  saveDeclarationsSignatures(companyUid, data) {
    if (!companyUid) return null;
    const uid = companyUid.trim().toUpperCase();
    const existing = this.declarationsSignatures.get(uid) || {};
    const updated = { ...existing, ...data, company_uid: uid, updated_at: new Date().toISOString() };
    this.declarationsSignatures.set(uid, updated);
    return updated;
  }
  getDeclarationsSignatures(companyUid) {
    if (!companyUid) return null;
    return this.declarationsSignatures.get(companyUid.trim().toUpperCase()) || null;
  }
}

const memStore = new MemoryStore();
module.exports = memStore;

