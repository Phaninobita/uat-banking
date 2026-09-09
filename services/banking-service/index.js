/**
 * Apex Bank Microservice: Live Core Banking & FX Service (Port 3004)
 * Powers real-time corporate accounts, multi-currency balances, live FX rate feeds,
 * instant wire transfers (SWIFT GPI & UAE Central Bank FTS simulator),
 * and mobile banking APIs for the mobile bank application.
 */

const express = require("express");
const crypto = require("crypto");
const config = require("../../shared/config");
const memStore = require("../../shared/memStore");
const db = require("../../shared/db");

const router = express.Router();

// Live FX Rates with live jitter simulation
function getLiveFxRates() {
  const baseRates = {
    "USD/AED": 3.6725,
    "EUR/AED": 4.0210,
    "GBP/AED": 4.7180,
    "SAR/AED": 0.9790,
    "EUR/USD": 1.0945,
    "GBP/USD": 1.2842
  };

  // Add realistic micro-spread jitter
  const timestamp = new Date().toISOString();
  const rates = {};
  for (const [pair, base] of Object.entries(baseRates)) {
    const jitter = (Math.sin(Date.now() / 15000 + pair.length) * 0.0015);
    rates[pair] = {
      pair,
      rate: Number((base + jitter).toFixed(4)),
      change24h: ((jitter / base) * 100).toFixed(2) + "%",
      updatedAt: timestamp
    };
  }
  return rates;
}

// 1. Get Live Corporate Accounts
router.get("/accounts", async (req, res) => {
  memStore.metrics.serviceRequests.banking++;

  try {
    let accounts = [];

    if (db.isConnected()) {
      const result = await db.query(
        "SELECT * FROM corporate_accounts ORDER BY id ASC"
      );
      accounts = result.rows;
    }

    if (!accounts || accounts.length === 0) {
      accounts = Array.from(memStore.accounts.values());
    }

    // Calculate total liquidity in AED
    const totalLiquidityAED = accounts.reduce((sum, acc) => {
      let multiplier = 1;
      if (acc.currency === "USD") multiplier = 3.6725;
      if (acc.currency === "EUR") multiplier = 4.0210;
      return sum + (Number(acc.balance) * multiplier);
    }, 0);

    return res.json({
      success: true,
      count: accounts.length,
      accounts,
      totalLiquidityAED: totalLiquidityAED.toFixed(2),
      clearingNetwork: "CBUAE Instant Payment Platform (IPP) & SWIFT GPI",
      service: "banking-service"
    });
  } catch (err) {
    console.error("[BANKING SERVICE] Accounts fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch corporate accounts." });
  }
});

// 2. Get Live Transactions Ledger
router.get("/transactions", (req, res) => {
  memStore.metrics.serviceRequests.banking++;
  const limit = parseInt(req.query.limit || "20", 10);
  const txs = memStore.transactions.slice(0, limit);

  return res.json({
    success: true,
    count: txs.length,
    transactions: txs,
    service: "banking-service"
  });
});

// 3. Get Live FX Rates
router.get("/fx-rates", (req, res) => {
  memStore.metrics.serviceRequests.banking++;
  return res.json({
    success: true,
    rates: getLiveFxRates(),
    service: "banking-service"
  });
});

// 4. Execute Instant Corporate Wire Transfer (SWIFT GPI / Central Bank FTS)
router.post("/transfer", async (req, res) => {
  memStore.metrics.serviceRequests.banking++;
  const {
    fromAccount,
    counterpartyName,
    counterpartyIban,
    amount,
    currency,
    description,
    channel
  } = req.body;

  const numAmount = parseFloat(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: "Invalid transfer amount." });
  }

  if (!counterpartyName || !counterpartyIban) {
    return res.status(400).json({ error: "Beneficiary Name and IBAN are required." });
  }

  const accountNum = fromAccount || "7029841001";
  const acc = memStore.accounts.get(accountNum);

  if (!acc) {
    return res.status(404).json({ error: "Source corporate account not found." });
  }

  if (acc.available_balance < numAmount) {
    return res.status(400).json({ error: "Insufficient available balance in corporate account." });
  }

  // Deduct balance
  acc.balance = Number((acc.balance - numAmount).toFixed(2));
  acc.available_balance = Number((acc.available_balance - numAmount).toFixed(2));
  memStore.accounts.set(accountNum, acc);

  // Generate SWIFT GPI Tracking reference
  const txRef = "TX-FTS-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const swiftUetr = crypto.randomUUID();

  const txRecord = {
    id: memStore.transactions.length + 1,
    transaction_ref: txRef,
    swift_uetr: swiftUetr,
    account_number: accountNum,
    type: "debit",
    amount: numAmount,
    currency: currency || acc.currency,
    counterparty_name: counterpartyName,
    counterparty_iban: counterpartyIban,
    description: description || "Corporate Wire Transfer",
    category: "Commercial Payment",
    status: "settled",
    channel: channel || "portal",
    clearing_channel: "CBUAE Funds Transfer System (FTS)",
    timestamp: new Date().toISOString()
  };

  memStore.transactions.unshift(txRecord);

  // Send simulated notification
  memStore.recordSimulatedEmail({
    to: "finance@apexholdings.ae",
    from: '"Apex Bank Operations Desk" <operations@apexbank.ae>',
    subject: `Transfer Executed: ${txRecord.currency} ${txRecord.amount.toLocaleString()} to ${counterpartyName}`,
    type: "transfer_executed",
    metadata: { txRef, amount: numAmount },
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h3 style="color: #0f172a; margin-top: 0;">⚡ Wire Transfer Executed Successfully</h3>
        <p style="color: #475569; font-size: 14px;">Your payment of <strong>${txRecord.currency} ${txRecord.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> has been cleared via the Central Bank FTS.</p>
        <div style="background: #f8fafc; padding: 14px; border-radius: 8px; font-size: 13px; line-height: 1.6;">
          <div><strong>Reference:</strong> <code>${txRef}</code></div>
          <div><strong>SWIFT UETR:</strong> <code>${swiftUetr}</code></div>
          <div><strong>Beneficiary:</strong> ${counterpartyName}</div>
          <div><strong>IBAN:</strong> ${counterpartyIban}</div>
        </div>
      </div>
    `,
    text: `Transfer of ${txRecord.currency} ${txRecord.amount} to ${counterpartyName} executed.`
  });

  return res.json({
    success: true,
    message: "Corporate wire transfer settled instantly.",
    transaction: txRecord,
    updatedAccount: acc,
    service: "banking-service"
  });
});

// 5. Mobile App Summary Feed (Tailored for the upcoming Mobile Bank App)
router.get(["/mobile/summary", "/summary"], (req, res) => {
  memStore.metrics.serviceRequests.banking++;
  const accounts = Array.from(memStore.accounts.values());
  const primaryAccount = accounts[0] || {};
  const recentTransactions = memStore.transactions.slice(0, 5);

  const virtualCards = [
    {
      cardId: "card_corp_01",
      cardNumber: "•••• •••• •••• 8842",
      cardholder: "ALEXANDER J VANCE",
      expiry: "09/29",
      type: "Mastercard World Elite Corporate",
      gradient: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #06b6d4 100%)",
      currency: "AED",
      limit: 100000.00,
      spentThisMonth: 18450.00
    },
    {
      cardId: "card_corp_02",
      cardNumber: "•••• •••• •••• 3129",
      cardholder: "APEX GLOBAL HOLDINGS",
      expiry: "11/30",
      type: "Visa Infinite Commercial",
      gradient: "linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)",
      currency: "USD",
      limit: 50000.00,
      spentThisMonth: 4210.00
    }
  ];

  return res.json({
    success: true,
    mobileAppVersion: "2.4.0 (Mobile Banking Suite)",
    client: {
      name: "Alexander J. Vance",
      company: "Apex Global Holdings Ltd",
      accountTier: "Corporate VIP"
    },
    primaryBalance: {
      currency: primaryAccount.currency || "AED",
      balance: primaryAccount.balance || 0,
      available: primaryAccount.available_balance || 0,
      accountNumber: primaryAccount.account_number || "7029841001",
      iban: primaryAccount.iban || "AE29033000007029841001"
    },
    allAccounts: accounts,
    virtualCards,
    recentTransactions,
    quickActions: [
      { id: "transfer", label: "Send Money", icon: "arrow-up-right", enabled: true },
      { id: "scan", label: "Scan & Pay", icon: "scan", enabled: true },
      { id: "docs", label: "KYC Vault", icon: "file-text", enabled: true },
      { id: "fx", label: "Live FX", icon: "trending-up", enabled: true }
    ],
    service: "banking-service"
  });
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "banking-service",
    activeAccounts: memStore.accounts.size,
    totalTransactions: memStore.transactions.length,
    port: config.MICROSERVICES.BANKING.port,
    uptime: process.uptime()
  });
});

module.exports = { router };
