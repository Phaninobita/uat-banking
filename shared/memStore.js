/**
 * Apex Bank Platform — High-Fidelity In-Memory Repository & Event Store
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

    // Relationship Manager (RM) Customer Invitations Repository
    // Key: `${crn.trim().toUpperCase()}:${email.trim().toLowerCase()}` -> invitation record
    this.rmInvitations = new Map();

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
    // Seed initial live corporate accounts
    const initialAccounts = [
      {
        id: 101,
        account_number: "7029841001",
        iban: "AE29033000007029841001",
        currency: "AED",
        account_name: "Apex Global Holdings — Operating Account",
        account_type: "Corporate Checking",
        balance: 2450890.50,
        available_balance: 2435890.50,
        status: "active",
        application_ref: "AB-2026-DEMO01"
      },
      {
        id: 102,
        account_number: "7029841002",
        iban: "AE44033000007029841002",
        currency: "USD",
        account_name: "Apex Global Holdings — Global Escrow & Treasury",
        account_type: "Multi-Currency Escrow",
        balance: 850200.00,
        available_balance: 850200.00,
        status: "active",
        application_ref: "AB-2026-DEMO01"
      },
      {
        id: 103,
        account_number: "7029841003",
        iban: "AE88033000007029841003",
        currency: "EUR",
        account_name: "Apex Global Holdings — Trade Settlement EUR",
        account_type: "Corporate Settlement",
        balance: 412750.80,
        available_balance: 412750.80,
        status: "active",
        application_ref: "AB-2026-DEMO01"
      }
    ];

    initialAccounts.forEach(acc => this.accounts.set(acc.account_number, acc));

    // Seed realistic ledger transactions
    this.transactions = [
      {
        id: 1,
        transaction_ref: "TX-SWIFT-" + crypto.randomBytes(3).toString("hex").toUpperCase(),
        account_number: "7029841001",
        type: "credit",
        amount: 250000.00,
        currency: "AED",
        counterparty_name: "Al Futtaim Capital LLC",
        counterparty_iban: "AE08033000001234567890",
        description: "Commercial Lease & Treasury Advance",
        category: "Corporate Inflow",
        status: "settled",
        channel: "swift_gpi",
        timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString()
      },
      {
        id: 2,
        transaction_ref: "TX-CB-" + crypto.randomBytes(3).toString("hex").toUpperCase(),
        account_number: "7029841001",
        type: "debit",
        amount: 45200.00,
        currency: "AED",
        counterparty_name: "ADGM Licensing & Registration Authority",
        counterparty_iban: "AE55033000009876543210",
        description: "Commercial Trade Licence Renewal Fee",
        category: "Government Fees",
        status: "settled",
        channel: "portal",
        timestamp: new Date(Date.now() - 3600 * 1000 * 18).toISOString()
      },
      {
        id: 3,
        transaction_ref: "TX-FX-" + crypto.randomBytes(3).toString("hex").toUpperCase(),
        account_number: "7029841002",
        type: "credit",
        amount: 120000.00,
        currency: "USD",
        counterparty_name: "Standard Chartered London",
        counterparty_iban: "GB29SCBL000012345678",
        description: "Cross-border Corporate Inflow FX",
        category: "International Wire",
        status: "settled",
        channel: "swift_gpi",
        timestamp: new Date(Date.now() - 3600 * 1000 * 28).toISOString()
      }
    ];

    // Seed initial RM invitations
    const initialInvites = [
      {
        crn: "509077205",
        email: "sarah.director@innovateholding.ae",
        company_name: "Innovate Holding Global PJSC",
        contact_person: "Sarah Jenkins",
        phone: "+971 50 123 4567",
        rm_name: "Sarah Al-Qassimi (VP Corporate Banking)",
        rm_id: "RM-ADGM-9042",
        invite_token: "inv_tok_demo_509077205",
        status: "in_progress",
        invite_link: "http://localhost:3000/?crn=509077205&email=sarah.director%40innovateholding.ae",
        notes: "Strategic ADGM multinational corporate client. Accelerated VIP onboarding.",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 5).toISOString()
      },
      {
        crn: "10029481",
        email: "client@apex.ae",
        company_name: "Al-Futtaim Global Holdings LLC",
        contact_person: "Tariq Al-Mansoor",
        phone: "+971 4 800 9000",
        rm_name: "Sarah Al-Qassimi (VP Corporate Banking)",
        rm_id: "RM-ADGM-9042",
        invite_token: "inv_tok_demo_10029481",
        status: "invited",
        invite_link: "http://localhost:3000/?crn=10029481&email=client%40apex.ae",
        notes: "Tier 1 Conglomerate. Multi-currency treasury and trade finance facilities required.",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    initialInvites.forEach(inv => {
      const key = `${inv.crn.trim().toUpperCase()}:${inv.email.trim().toLowerCase()}`;
      this.rmInvitations.set(key, inv);
    });
  }

  saveRmInvitation(invite) {
    const crn = (invite.crn || "").trim().toUpperCase();
    const email = (invite.email || "").trim().toLowerCase();
    const key = `${crn}:${email}`;
    const existing = this.rmInvitations.get(key) || {};
    const record = {
      ...existing,
      ...invite,
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

  recordSimulatedEmail({ to, from, subject, html, text, code, type, metadata }) {
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

    this.simulatedEmails.unshift(emailItem);
    if (this.simulatedEmails.length > 50) {
      this.simulatedEmails.pop();
    }
    return emailItem;
  }
}

const memStore = new MemoryStore();
module.exports = memStore;
