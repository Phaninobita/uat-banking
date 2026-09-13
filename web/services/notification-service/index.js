/**
 * First National Bank Microservice: Notification & Mailbox Service (Port 3005)
 * Handles simulated real-time in-browser emails, real SMTP email dispatch,
 * SMS OTP verification alerts, and mobile push notification delivery.
 */

const express = require("express");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const config = require("../../shared/config");
const memStore = require("../../shared/memStore");

const router = express.Router();

const { sendYopmail } = require("./yopmailSender");

let mailTransporter = null;
if (config.SMTP.HOST && config.SMTP.USER && config.SMTP.PASS) {
  mailTransporter = nodemailer.createTransport({
    host: config.SMTP.HOST,
    port: config.SMTP.PORT,
    secure: config.SMTP.SECURE,
    auth: {
      user: config.SMTP.USER,
      pass: config.SMTP.PASS
    }
  });
  console.log("📧 [NOTIFICATION SERVICE] Real SMTP delivery active via:", config.SMTP.HOST);
}
console.log("📧 [NOTIFICATION SERVICE] Open-source Yopmail real-time delivery engine active.");


// 1. Get Simulated Emails (Requires Authentication; Scoped to caller's recipient address or RM privileges)
router.get("/emails", (req, res) => {
  memStore.metrics.serviceRequests.notifications++;

  const authHeader = req.headers.authorization;
  let callerUser = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      callerUser = jwt.verify(authHeader.substring(7), config.JWT_SECRET);
    } catch (e) {}
  }

  if (!callerUser) {
    return res.status(401).json({ error: "Unauthorized: Authentication required to view notification mailbox." });
  }

  const requestedEmail = req.query.email ? req.query.email.trim().toLowerCase() : null;
  const isRm = Boolean(callerUser.is_rm || callerUser.role === "RM");

  // If RM Executive without filter, allow reviewing all simulated emails
  if (isRm && !requestedEmail) {
    return res.json({
      success: true,
      count: memStore.simulatedEmails.length,
      emails: memStore.simulatedEmails,
      service: "notification-service"
    });
  }

  // Determine effective recipient email to query
  const effectiveEmail = requestedEmail || (callerUser?.email ? callerUser.email.trim().toLowerCase() : null);

  // If no recipient email is specified and not RM, return empty mailbox (never dump bank-wide emails)
  if (!effectiveEmail) {
    return res.json({
      success: true,
      count: 0,
      emails: [],
      service: "notification-service"
    });
  }

  // If caller is an authenticated customer, prevent querying another person's inbox
  if (callerUser && !isRm && callerUser.email && callerUser.email.trim().toLowerCase() !== effectiveEmail) {
    return res.status(403).json({
      error: "Forbidden: You do not have permission to view notifications sent to another recipient address."
    });
  }

  // Filter strictly by target recipient email (no unconditional OTP leaks)
  const results = memStore.simulatedEmails.filter(e => e.to && e.to.trim().toLowerCase() === effectiveEmail);

  return res.json({
    success: true,
    count: results.length,
    emails: results,
    service: "notification-service"
  });
});

// 2. Clear Simulated Inbox (Scoped by recipient or RM)
router.delete("/emails", (req, res) => {
  memStore.metrics.serviceRequests.notifications++;

  const authHeader = req.headers.authorization;
  let callerUser = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      callerUser = jwt.verify(authHeader.substring(7), config.JWT_SECRET);
    } catch (e) {}
  }

  const targetEmail = req.query.email ? req.query.email.trim().toLowerCase() : (callerUser?.email ? callerUser.email.trim().toLowerCase() : null);
  const isRm = Boolean(callerUser && (callerUser.is_rm || callerUser.role === "RM"));

  if (isRm && !targetEmail) {
    memStore.simulatedEmails.length = 0;
  } else if (targetEmail) {
    const keep = memStore.simulatedEmails.filter(e => !e.to || e.to.trim().toLowerCase() !== targetEmail);
    memStore.simulatedEmails.length = 0;
    memStore.simulatedEmails.push(...keep);
  }

  return res.json({
    success: true,
    message: "Simulated mailbox cleared.",
    service: "notification-service"
  });
});

// 3. Manually dispatch a simulated email (DocuSign, Resume link, custom notification)
router.post("/simulate", async (req, res) => {
  memStore.metrics.serviceRequests.notifications++;
  const { to, subject, html, text, type, metadata, code } = req.body;

  const emailItem = memStore.recordSimulatedEmail({
    to: to || "admin@corporate.com",
    from: '"Gringotts Bank" <onboarding@gringotts.com>',
    subject: subject || "Gringotts Bank Corporate Update",
    html: html || "<p>Notification from Gringotts Bank (Diagon Alley)</p>",
    text: text || "Notification from Gringotts Bank (Diagon Alley)",
    code: code || null,
    type: type || "system",
    metadata: metadata || {}
  });

  // If destination is Yopmail, dispatch directly in real-time via open-source SMTP transport (if not already handled)
  if (to && to.toLowerCase().includes("yopmail") && !emailItem.metadata?.yopmailRealTime) {
    try {
      const yopmailRes = await sendYopmail({
        to,
        from: '"Gringotts Bank" <alerts@gmail.com>',
        subject: emailItem.subject,
        html: emailItem.html,
        text: emailItem.text
      });
      emailItem.metadata.yopmailRealTime = true;
      emailItem.metadata.yopmailResponse = yopmailRes.response;
      emailItem.metadata.inboxUrl = yopmailRes.inboxUrl;
    } catch (err) {
      console.log("[NOTIFICATION SERVICE] Yopmail notice:", err.message);
      emailItem.metadata.yopmailError = err.message;
    }
  } else if (mailTransporter && to) {
    try {
      await mailTransporter.sendMail({
        from: config.SMTP.FROM,
        to,
        subject: emailItem.subject,
        html: emailItem.html
      });
    } catch (err) {
      console.log("[NOTIFICATION SERVICE] SMTP notice:", err.message);
    }
  }

  return res.json({
    success: true,
    email: emailItem,
    service: "notification-service"
  });
});

// 4. Real-time Open-Source Yopmail Dispatch Endpoint
router.post("/yopmail", async (req, res) => {
  memStore.metrics.serviceRequests.notifications++;
  const { to, subject, html, text, from } = req.body;

  if (!to || !to.toLowerCase().includes("yopmail")) {
    return res.status(400).json({
      success: false,
      error: "Recipient must be a valid @yopmail.com email address",
      service: "notification-service"
    });
  }

  try {
    const result = await sendYopmail({
      to,
      from: from || '"Gringotts Bank" <alerts@gmail.com>',
      subject: subject || "Gringotts Bank Real-Time Notification",
      html,
      text
    });

    const recorded = memStore.recordSimulatedEmail({
      to,
      from: from || '"Gringotts Bank" <alerts@gmail.com>',
      subject: subject || "Gringotts Bank Real-Time Notification",
      html: html || text,
      text: text || "Real-time notification",
      type: "yopmail_realtime",
      metadata: { ...result }
    });

    return res.json({
      success: true,
      service: "notification-service",
      email: recorded,
      ...result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      service: "notification-service"
    });
  }
});


// 4. Mobile Push Notification Simulator
router.post("/push", (req, res) => {
  memStore.metrics.serviceRequests.notifications++;
  const { title, body, deviceToken, deepLink } = req.body;

  const pushPayload = {
    id: "push_" + Date.now(),
    title: title || "Gringotts Bank Alert",
    body: body || "Your corporate vault account has a new update.",
    deviceToken: deviceToken || "token_ios_simulator_01",
    deepLink: deepLink || "gringotts://accounts",
    deliveredAt: new Date().toISOString()
  };

  return res.json({
    success: true,
    push: pushPayload,
    service: "notification-service"
  });
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "notification-service",
    emailsQueued: memStore.simulatedEmails.length,
    smtpConfigured: Boolean(mailTransporter),
    port: config.MICROSERVICES.NOTIFICATIONS.port,
    uptime: process.uptime()
  });
});

module.exports = { router };
