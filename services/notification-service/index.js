/**
 * Apex Bank Microservice: Notification & Mailbox Service (Port 3005)
 * Handles simulated real-time in-browser emails, real SMTP email dispatch,
 * SMS OTP verification alerts, and mobile push notification delivery.
 */

const express = require("express");
const nodemailer = require("nodemailer");
const config = require("../../shared/config");
const memStore = require("../../shared/memStore");

const router = express.Router();

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

// 1. Get Simulated Emails
router.get("/emails", (req, res) => {
  memStore.metrics.serviceRequests.notifications++;
  const filterEmail = req.query.email ? req.query.email.trim().toLowerCase() : null;
  const emails = memStore.simulatedEmails;
  const results = filterEmail
    ? emails.filter(e => e.to.toLowerCase() === filterEmail || e.type === "otp")
    : emails;

  return res.json({
    success: true,
    count: results.length,
    emails: results,
    service: "notification-service"
  });
});

// 2. Clear Simulated Inbox
router.delete("/emails", (req, res) => {
  memStore.metrics.serviceRequests.notifications++;
  memStore.simulatedEmails.length = 0;
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
    to: to || "admin@apexholdings.ae",
    from: '"Apex Bank" <onboarding@apexbank.ae>',
    subject: subject || "Apex Bank Corporate Update",
    html: html || "<p>Notification from Apex Bank</p>",
    text: text || "Notification from Apex Bank",
    code: code || null,
    type: type || "system",
    metadata: metadata || {}
  });

  if (mailTransporter && to) {
    try {
      await mailTransporter.sendMail({
        from: config.SMTP.FROM,
        to,
        subject: emailItem.subject,
        html: emailItem.html
      });
    } catch (err) {
      console.warn("[NOTIFICATION SERVICE] SMTP dispatch error:", err.message);
    }
  }

  return res.json({
    success: true,
    email: emailItem,
    service: "notification-service"
  });
});

// 4. Mobile Push Notification Simulator
router.post("/push", (req, res) => {
  memStore.metrics.serviceRequests.notifications++;
  const { title, body, deviceToken, deepLink } = req.body;

  const pushPayload = {
    id: "push_" + Date.now(),
    title: title || "Apex Bank Alert",
    body: body || "Your corporate account has a new update.",
    deviceToken: deviceToken || "token_ios_simulator_01",
    deepLink: deepLink || "apexbank://accounts",
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
