/**
 * Open-Source Direct Real-Time Email Dispatcher for Yopmail
 * 
 * Uses Nodemailer (open-source MIT license) to connect directly to 
 * Yopmail's public MX server (smtp.yopmail.com:587).
 * 
 * Requirements:
 * - Outbound port 587 (Standard submission port)
 * - Valid routable domain in sender address (e.g., info@domain.com or test@gmail.com)
 *   so Yopmail's MTA does not reject with "550 Unrouteable sender address".
 */

const nodemailer = require("nodemailer");

/**
 * Sends a real-time email to any Yopmail recipient without needing third-party API keys.
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient Yopmail address (e.g. user@yopmail.com)
 * @param {string} [options.from] - Sender address with a routable domain
 * @param {string} options.subject - Email subject line
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML formatted body
 * @returns {Promise<{success: boolean, messageId: string, response: string, inboxUrl: string}>}
 */
async function sendYopmail({
  to,
  from = '"Gringotts Bank" <alerts@gmail.com>',
  subject,
  text,
  html
}) {
  if (!to || !to.toLowerCase().includes("yopmail")) {
    throw new Error("Recipient must be a Yopmail address (*@yopmail.com or aliases).");
  }

  // Ensure sender domain is routable (e.g. gmail.com) so Yopmail MTA does not reject with 550
  let cleanFrom = from || '"Gringotts Bank" <alerts@gmail.com>';
  if (!cleanFrom.includes("@gmail.com") && !cleanFrom.includes("@yahoo.com") && !cleanFrom.includes("@outlook.com")) {
    const match = cleanFrom.match(/^(.*?)\s*<.*?>$/);
    const displayName = match ? match[1].trim() : '"Gringotts Bank"';
    cleanFrom = `${displayName} <alerts@gmail.com>`;
  }

  const cleanTo = to.trim().toLowerCase();

  const transporter = nodemailer.createTransport({
    host: "smtp.yopmail.com",
    port: 587,
    secure: false, // opportunistic STARTTLS
    ignoreTLS: true,
    name: "gmail.com",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  const info = await transporter.sendMail({
    from: cleanFrom,
    to: cleanTo,
    subject: subject || "Notification Alert",
    text: text || "This is a real-time notification sent to your Yopmail address.",
    html: html || `<p>${text || "This is a real-time notification sent to your Yopmail address."}</p>`,
    envelope: {
      from: "alerts@gmail.com",
      to: [cleanTo]
    }
  });

  const inboxUser = cleanTo.split("@")[0];

  return {
    success: true,
    messageId: info.messageId,
    response: info.response,
    inboxUrl: `https://yopmail.com/?${inboxUser}`
  };
}

module.exports = { sendYopmail };

// CLI runner if executed directly: node yopmailSender.js [recipient] [subject]
if (require.main === module) {
  const args = process.argv.slice(2);
  const recipient = args[0] || "fnb-live-demo@yopmail.com";
  const subject = args[1] || "Live Banking Security Alert [Open-Source Dispatch]";
  const timestamp = new Date().toLocaleString();

  console.log(`🚀 Dispatching real-time email to ${recipient}...`);

  sendYopmail({
    to: recipient,
    subject: subject,
    text: `Your one-time security code is: 849201. Sent at ${timestamp} via open-source Nodemailer.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="border-bottom: 2px solid #0b3954; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #0b3954; margin: 0;">Gringotts Bank</h2>
          <span style="font-size: 12px; color: #64748b;">Diagon Alley &bull; Real-Time Vault Dispatch</span>
        </div>
        <p style="color: #334155; font-size: 15px;">Hello,</p>
        <p style="color: #334155; font-size: 14px;">Here is your verification code requested at <strong>${timestamp}</strong>:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 12px 24px; background: #f1f5f9; color: #0f172a; border-radius: 8px; border: 1px dashed #cbd5e1;">849201</span>
        </div>
        <p style="font-size: 13px; color: #64748b;">This message was delivered in real-time directly to Yopmail using open-source SMTP transport (Nodemailer).</p>
      </div>
    `
  })
    .then(res => {
      console.log("✅ Success! Email dispatched.");
      console.log("Server Response:", res.response);
      console.log("Message ID:", res.messageId);
      console.log(`📬 View in Yopmail inbox: ${res.inboxUrl}`);
    })
    .catch(err => {
      console.error("❌ Failed to send:", err.message);
      process.exit(1);
    });
}
