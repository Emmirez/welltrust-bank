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

// --- Shared branded email shell ---

const NAVY = "#0B2545";
const GOLD = "#C9A227";
const SLATE = "#64748B";
const LOGO_URL = "https://welltrustapp.com/logo.png";

const emailShell = (bodyHtml) => `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; background:#ffffff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden;">

    <!-- Header -->
    <div style="background:${NAVY}; padding: 24px 28px;">
      <table style="width:100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align:middle;">
            <img src="${LOGO_URL}" alt="Well Trust Bank" width="36" height="36" style="display:block; border-radius:8px;" />
          </td>
          <td style="vertical-align:middle; padding-left:10px;">
            <span style="font-size:18px; font-weight:bold; color:#ffffff;">Well Trust</span>
            <span style="font-size:18px; font-weight:bold; color:${GOLD};"> Bank</span>
          </td>
        </tr>
      </table>
    </div>
    <div style="height:4px; background:${GOLD};"></div>

    <!-- Body -->
    <div style="padding: 28px;">
      ${bodyHtml}
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #e5e7eb; padding: 20px 28px; background:#f8fafc;">
      <p style="margin:0 0 4px 0; font-size:12px; font-weight:bold; color:${NAVY};">Well Trust Bank</p>
      <p style="margin:0 0 4px 0; font-size:11px; color:${SLATE};">387 Greenwich Street, New York, NY 10013</p>
      <p style="margin:0 0 12px 0; font-size:11px; color:${SLATE};">support@welltrustbank.com &nbsp;·&nbsp; +1 (863) 333-9415</p>
      <p style="margin:0; font-size:10px; color:${SLATE}; line-height:1.5;">
        This email is provided for informational purposes and is not a solicitation. Well Trust Bank is a design &amp; engineering portfolio project — balances shown are simulated and are not FDIC insured or backed by any government agency.
      </p>
    </div>
  </div>
`;

// --- Email templates ---

export const otpEmailTemplate = (name, otp) => emailShell(`
  <p style="margin:0 0 12px 0; color:#111827;">Hi ${name},</p>
  <p style="margin:0 0 16px 0; color:#111827;">Your verification code is:</p>
  <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color:${NAVY}; margin: 0 0 16px 0;">${otp}</p>
  <p style="margin:0 0 16px 0; color:#374151; font-size:14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
  <p style="color:${SLATE}; font-size: 12px; margin:0;">Well Trust Bank never asks for your password or PIN by email.</p>
`);

const formatMoney = (amount, currency) => {
  const num = Number(amount) || 0;
  return `${currency} ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const transactionEmailTemplate = ({ name, action, amount, currency, balance, reference, date }) => {
  const isCredit = action === "credited";
  const historyUrl = "https://welltrustapp.com/dashboard/transactions";

  return emailShell(`
    <p style="margin:0 0 16px 0; color:#111827;">Dear ${name},</p>

    <div style="background:${isCredit ? "#ecfdf5" : "#fef2f2"}; border:1px solid ${isCredit ? "#a7f3d0" : "#fecaca"}; border-radius:10px; padding:16px; margin-bottom:16px;">
      <p style="margin:0; font-weight:bold; color:${isCredit ? "#059669" : "#dc2626"}; font-size:15px;">
        ${isCredit ? "✓ Deposit Confirmed" : "Payment Sent"}
      </p>
      <p style="margin:4px 0 0 0; color:#111827; font-size:20px; font-weight:bold;">
        ${isCredit ? "+" : "-"}${formatMoney(amount, currency)}
      </p>
    </div>

    <p style="margin:0 0 16px 0; color:#111827;">Your Well Trust Bank account has been <strong>${action}</strong> in the amount of <strong>${formatMoney(amount, currency)}</strong>.</p>

    <table style="width:100%; font-size: 14px; color:#374151; border-collapse:collapse;">
      <tr><td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">Transaction Reference</td><td style="padding:8px 0; border-bottom:1px solid #f1f5f9; text-align:right;">${reference}</td></tr>
      <tr><td style="padding:8px 0; border-bottom:1px solid #f1f5f9;">Date &amp; Time</td><td style="padding:8px 0; border-bottom:1px solid #f1f5f9; text-align:right;">${date}</td></tr>
      <tr><td style="padding:8px 0;">Current Balance</td><td style="padding:8px 0; text-align:right; font-weight:bold; color:${NAVY};">${formatMoney(balance, currency)}</td></tr>
    </table>

    <table style="width:100%; border-collapse:collapse; margin-top:20px;">
      <tr>
        <td align="center">
          <a href="${historyUrl}" style="display:inline-block; background:${NAVY}; color:#ffffff; text-decoration:none; font-weight:bold; font-size:14px; padding:12px 28px; border-radius:10px;">
            View Transaction History
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0 0; color:${SLATE}; font-size: 12px;">If you did not authorize this transaction, please contact support immediately.</p>
    <p style="margin:8px 0 0 0; color:${SLATE}; font-size: 11px;">Well Trust Bank, Member FDIC. Deposits insured up to $250,000 per depositor, per ownership category.</p>
    <p style="margin:4px 0 0 0; color:${SLATE}; font-size: 11px;">This is an automated notification. Please do not reply to this email.</p>
  `);
};

export const approvalEmailTemplate = (name, status) => {
  const isApproved = status === "active";
  const loginUrl = "https://welltrustapp.com/login";

  return emailShell(`
    <p style="margin:0 0 16px 0; color:#111827;">Hi ${name},</p>

    <div style="background:${isApproved ? "#ecfdf5" : "#fef2f2"}; border:1px solid ${isApproved ? "#a7f3d0" : "#fecaca"}; border-radius:10px; padding:16px; margin-bottom:16px;">
      <p style="margin:0; font-weight:bold; color:${isApproved ? "#059669" : "#dc2626"}; font-size:15px;">
        ${isApproved ? "✓ Account Approved" : "Application Not Approved"}
      </p>
    </div>

    ${
      isApproved
        ? `<p style="margin:0 0 20px 0; color:#111827;">Great news — your Well Trust Bank account has been approved and is now active. You can log in and start banking right away.</p>`
        : `<p style="margin:0 0 20px 0; color:#111827;">We were unable to approve your account application at this time. Please contact our support team for more information.</p>`
    }

    ${
      isApproved
        ? `<table style="width:100%; border-collapse:collapse;">
             <tr>
               <td align="center">
                 <a href="${loginUrl}" style="display:inline-block; background:${NAVY}; color:#ffffff; text-decoration:none; font-weight:bold; font-size:14px; padding:12px 28px; border-radius:10px;">
                   Log In to Your Account
                 </a>
               </td>
             </tr>
           </table>`
        : `<table style="width:100%; border-collapse:collapse;">
             <tr>
               <td align="center">
                 <a href="https://welltrustapp.com/contact" style="display:inline-block; background:${NAVY}; color:#ffffff; text-decoration:none; font-weight:bold; font-size:14px; padding:12px 28px; border-radius:10px;">
                   Contact Support
                 </a>
               </td>
             </tr>
           </table>`
    }
  `);
};
