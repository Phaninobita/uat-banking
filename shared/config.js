/**
 * First National Bank Platform Configuration
 */
require("dotenv").config();

module.exports = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "fnb-jwt-secret-dev-2026",
  DATABASE_URL: process.env.DATABASE_URL || "",
  GOOGLE_VISION_API_KEY: process.env.GOOGLE_VISION_API_KEY || "",
  SMTP: {
    HOST: process.env.SMTP_HOST || "",
    PORT: parseInt(process.env.SMTP_PORT || "587", 10),
    SECURE: process.env.SMTP_SECURE === "true",
    USER: process.env.SMTP_USER || "",
    PASS: process.env.SMTP_PASS || "",
    FROM: process.env.EMAIL_FROM || '"First National Bank" <onboarding@fnb-us.com>'
  },
  MICROSERVICES: {
    GATEWAY: { port: 3000, name: "API Gateway" },
    AUTH: { port: 3001, name: "Auth & Identity Service" },
    DOCUMENTS: { port: 3002, name: "Document & Base64 Vault Service" },
    APPLICATIONS: { port: 3003, name: "Corporate Onboarding Service" },
    BANKING: { port: 3004, name: "Live Core Banking & FX Service" },
    NOTIFICATIONS: { port: 3005, name: "Notification & Mailbox Service" }
  }
};
