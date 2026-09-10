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

    // Relationship Manager (RM) Customer Invitations Repository
    // Key: `${crn.trim().toUpperCase()}:${email.trim().toLowerCase()}` -> invitation record
    this.rmInvitations = new Map();

    // Relationship Manager (RM) Authorized Users & Executives
    // Key: username (lowercase) -> user record
    this.rmUsers = new Map();

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

  saveRmInvitation(invite) {
    const crn = (invite.crn || "").trim().toUpperCase();
    const email = (invite.email || "").trim().toLowerCase();
    const key = `${crn}:${email}`;
    const existing = this.rmInvitations.get(key) || {};
    const company_uid = (invite.company_uid || existing.company_uid || ("CUID-" + crn.replace(/[^A-Z0-9]/g, ""))).toUpperCase();
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
}

const memStore = new MemoryStore();
module.exports = memStore;
