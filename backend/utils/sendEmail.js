// Sends transactional email via Brevo (Sendinblue) HTTP API
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export const sendEmail = async ({ to, toName, subject, html }) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not configured — cannot send email.");
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

const formatMoney = (amount, currency) => {
  const num = Number(amount) || 0;
  return `${currency} ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const transactionEmailTemplate = ({ name, action, amount, currency, balance, reference, date }) => emailShell(`
  <p style="margin:0 0 12px 0; color:#111827;">Dear ${name},</p>
  <p style="margin:0 0 16px 0; color:#111827;">Your Well Trust Bank account has been <strong>${action}</strong> in the amount of <strong>${formatMoney(amount, currency)}</strong>.</p>
  <table style="width:100%; font-size: 14px; color:#374151; border-collapse:collapse;">
    <tr><td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">Transaction Reference</td><td style="padding:8px 0; border-bottom:1px solid #f1f5f9; text-align:right;">${reference}</td></tr>
    <tr><td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">Date &amp; Time</td><td style="padding:8px 0; border-bottom:1px solid #f1f5f9; text-align:right;">${date}</td></tr>
    <tr><td style="padding:8px 0;">Current Balance</td><td style="padding:8px 0; text-align:right; font-weight:bold; color:${NAVY};">${formatMoney(balance, currency)}</td></tr>
  </table>
  <p style="margin:16px 0 0 0; color:${SLATE}; font-size: 12px;">If you did not authorize this transaction, please contact support immediately.</p>
  <p style="margin:8px 0 0 0; color:${SLATE}; font-size: 11px;">Well Trust Bank, Member FDIC. Deposits insured up to $250,000.</p>
`);

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
