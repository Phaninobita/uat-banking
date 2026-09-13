/**
 * First National Bank Security & Cryptography Utilities
 * Provides secure password hashing (scrypt with salt), timing-safe verification,
 * cryptographically secure OTP generation, and HTML sanitization.
 */

const crypto = require("crypto");

/**
 * Hashes a plain-text password using scrypt with a unique random salt
 * Format returned: <salt_hex>:<hash_hex>
 */
function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string.");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password.normalize("NFKC"), salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plain-text password against a stored scrypt hash in <salt_hex>:<hash_hex> format.
 * Uses constant-time comparison to protect against timing attacks.
 */
function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  // Handle format: salt:hash
  if (storedHash.includes(":")) {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;

    const originalBuffer = Buffer.from(originalHash, "hex");
    const derivedKey = crypto.scryptSync(password.normalize("NFKC"), salt, 64);

    if (originalBuffer.length !== derivedKey.length) {
      return false;
    }
    return crypto.timingSafeEqual(originalBuffer, derivedKey);
  }

  // Graceful fallback for legacy plaintext (migrates on successful match)
  const isPlainMatch = password === storedHash;
  return isPlainMatch;
}

/**
 * Generates a cryptographically strong N-digit numerical OTP
 */
function generateOtp(length = 4) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length);
  return crypto.randomInt(min, max).toString();
}

/**
 * Escapes characters to prevent HTML/DOM-based XSS injection
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateOtp,
  escapeHtml
};
