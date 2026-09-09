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
        notifications: 0
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
