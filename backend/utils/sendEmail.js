// Sends transactional email via Brevo (Sendinblue) HTTP API
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export const sendEmail = async ({ to, toName, subject, html }) => {
  // if (!process.env.BREVO_API_KEY) {
  //   console.warn("BREVO_API_KEY not set — skipping email send. Would have sent:", subject, "to", to);
  //   return { skipped: true };
  // }

  if (!process.env.BREVO_API_KEY) {
    console.warn("BREVO_API_KEY not set — skipping email send.");
    console.warn(`   To: ${to}`);
    console.warn(`   Subject: ${subject}`);
    console.warn(`   Content: ${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`);
    return { skipped: true };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || "Well Trust Bank",
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Brevo email send failed:", errText);
      return { success: false, error: errText };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error.message);
    return { success: false, error: error.message };
  }
};

// --- Email templates ---

export const otpEmailTemplate = (name, otp) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
    <h2 style="color:#0B2545;">Well Trust Bank</h2>
    <p>Hi ${name},</p>
    <p>Your verification code is:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color:#0B2545;">${otp}</p>
    <p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    <p style="color:#6b7280; font-size: 12px;">Well Trust Bank never asks for your password or PIN by email.</p>
  </div>
`;

export const transactionEmailTemplate = ({ name, action, amount, currency, balance, reference, date }) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
    <h2 style="color:#0B2545;">Well Trust Bank</h2>
    <p>Hi ${name},</p>
    <p>Your account was just <strong>${action}</strong> <strong>${currency} ${amount}</strong>.</p>
    <table style="width:100%; margin-top:16px; font-size: 14px; color:#374151;">
      <tr><td style="padding:4px 0;">Reference</td><td style="text-align:right;">${reference}</td></tr>
      <tr><td style="padding:4px 0;">Date</td><td style="text-align:right;">${date}</td></tr>
      <tr><td style="padding:4px 0;">New Balance</td><td style="text-align:right; font-weight:bold;">${currency} ${balance}</td></tr>
    </table>
    <p style="margin-top:16px; color:#6b7280; font-size: 12px;">If you don't recognize this activity, contact support immediately.</p>
  </div>
`;

export const approvalEmailTemplate = (name, status) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
    <h2 style="color:#0B2545;">Well Trust Bank</h2>
    <p>Hi ${name},</p>
    ${
      status === "active"
        ? `<p>Great news — your Well Trust Bank account has been <strong>approved</strong> and is now active. You can log in and start banking.</p>`
        : `<p>We were unable to approve your account application at this time. Please contact support for more information.</p>`
    }
  </div>
`;
