import crypto from "crypto";
import User from "../models/User.js";
import { generateAccountNumber, generateOtp } from "../utils/generateIds.js";
import { generateToken } from "../utils/generateToken.js";
import { sendEmail, otpEmailTemplate } from "../utils/sendEmail.js";
import { verifyTwoFactorToken } from "../utils/twoFactor.js";
import { notifyGeneral } from "../utils/notify.js";

const hashSsn = (ssn) => crypto.createHash("sha256").update(ssn).digest("hex");

// @route POST /api/auth/register
export const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      ssn,
      address,
      password,
      transactionPin,
      accountType,
      currency,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !dateOfBirth ||
      !ssn ||
      !address ||
      !password ||
      !transactionPin ||
      !accountType
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided" });
    }

    if (!/^\d{4}$/.test(transactionPin)) {
      return res
        .status(400)
        .json({ message: "Transaction PIN must be exactly 4 digits" });
    }

    if (!/^\d{9}$/.test(ssn)) {
      return res.status(400).json({ message: "SSN must be 9 digits" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });
    }

    let accountNumber = generateAccountNumber();
    // ensure uniqueness (extremely unlikely to collide, but check anyway)
    while (await User.findOne({ accountNumber })) {
      accountNumber = generateAccountNumber();
    }

    const emailOtp = generateOtp();
    const phoneOtp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      dateOfBirth,
      ssnLast4: ssn.slice(-4),
      ssnHash: hashSsn(ssn),
      address,
      password,
      transactionPin,
      accountType,
      currency: currency || "USD",
      accountNumber,
      status: "pending",
      emailOtp,
      emailOtpExpires: otpExpires,
      phoneOtp,
      phoneOtpExpires: otpExpires,
    });

    await sendEmail({
      to: user.email,
      toName: user.firstName,
      subject: "Verify your Well Trust Bank account",
      html: otpEmailTemplate(user.firstName, emailOtp),
    });

    await sendSms({
      to: user.phone,
      body: `Well Trust Bank: your verification code is ${phoneOtp}. It expires in 10 minutes.`,
    });

    return res.status(201).json({
      message:
        "Registration successful. Please verify your email and phone number.",
      userId: user._id,
      email: user.email,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong during registration" });
  }
};

// @route POST /api/auth/verify-email
export const verifyEmail = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId).select(
      "+emailOtp +emailOtpExpires",
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.emailOtp !== otp || user.emailOtpExpires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.isEmailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    await user.save();

    return res.json({
      message: "Email verified successfully",
      isEmailVerified: true,
    });
  } catch (error) {
    return res.status(500).json({ message: "Verification failed" });
  }
};

// @route POST /api/auth/verify-phone
// export const verifyPhone = async (req, res) => {
//   try {
//     const { userId, otp } = req.body;
//     const user = await User.findById(userId).select(
//       "+phoneOtp +phoneOtpExpires",
//     );
//     if (!user) return res.status(404).json({ message: "User not found" });

//     if (user.phoneOtp !== otp || user.phoneOtpExpires < new Date()) {
//       return res.status(400).json({ message: "Invalid or expired code" });
//     }

//     user.isPhoneVerified = true;
//     user.phoneOtp = undefined;
//     user.phoneOtpExpires = undefined;
//     await user.save();

//     // Once both verifications are done, notify admins a new application is ready for review
//     if (user.isEmailVerified) {
//       await notifyGeneral(user, {
//         title: "Application under review",
//         message:
//           "Your identity has been verified. Our team is now reviewing your account application.",
//         type: "account",
//       });
//     }

//     return res.json({
//       message: "Phone verified successfully",
//       isPhoneVerified: true,
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Verification failed" });
//   }
// };

// @route POST /api/auth/resend-otp
export const resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    user.emailOtp = otp;
    user.emailOtpExpires = expires;
    await user.save();
    await sendEmail({
      to: user.email,
      toName: user.firstName,
      subject: "Your new Well Trust Bank verification code",
      html: otpEmailTemplate(user.firstName, otp),
    });

    return res.json({ message: "Verification code resent" });
  } catch (error) {
    return res.status(500).json({ message: "Could not resend code" });
  }
};

// @route POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
        userId: user._id,
        needsVerification: true,
      });
    }

    if (user.status === "pending") {
      return res
        .status(403)
        .json({ message: "Your account is pending admin approval" });
    }
    if (user.status === "rejected") {
      return res
        .status(403)
        .json({
          message:
            "Your account application was not approved. Contact support.",
        });
    }
   if (user.status === "suspended") {
      return res.status(403).json({ message: "Your account is currently suspended. Contact support." });
    }

    if (user.twoFactorEnabled) {
      return res.json({
        needsTwoFactor: true,
        userId: user._id,
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id);

    return res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountType: user.accountType,
        accountNumber: user.accountNumber,
        currency: user.currency,
        balance: user.balance,
        status: user.status,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed" });
  }
};

// @route POST /api/auth/verify-2fa-login
export const verifyTwoFactorLogin = async (req, res) => {
  try {
    const { userId, token } = req.body;
    const user = await User.findById(userId).select("+twoFactorSecret");
    if (!user || !user.twoFactorEnabled) {
      return res
        .status(400)
        .json({
          message: "Two-factor authentication is not enabled for this account",
        });
    }

    const isValid = verifyTwoFactorToken(token, user.twoFactorSecret);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid authentication code" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const jwtToken = generateToken(user._id);

    return res.json({
      token: jwtToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        accountType: user.accountType,
        accountNumber: user.accountNumber,
        currency: user.currency,
        balance: user.balance,
        status: user.status,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Verification failed" });
  }
};

// @route GET /api/auth/me
export const getMe = async (req, res) => {
  return res.json({ user: req.user });
};


// @route POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    // Always return the same response whether or not the email exists,
    // so this endpoint can't be used to check which emails are registered.
    if (!user) {
      return res.json({ message: "If an account exists with that email, a reset code has been sent." });
    }

    const otp = generateOtp();
    user.emailOtp = otp;
    user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: user.email,
      toName: user.firstName,
      subject: "Reset your Well Trust Bank password",
      html: otpEmailTemplate(user.firstName, otp),
    });

    return res.json({ message: "If an account exists with that email, a reset code has been sent.", userId: user._id });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Could not process request" });
  }
};

// @route POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;
    if (!userId || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(userId).select("+emailOtp +emailOtpExpires");
    if (!user) return res.status(404).json({ message: "Invalid request" });

    if (user.emailOtp !== otp || user.emailOtpExpires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.password = newPassword; // pre-save hook re-hashes it
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    await user.save();

    await notifyGeneral(user, {
      title: "Password reset",
      message: "Your account password was just reset. If this wasn't you, contact support immediately.",
      type: "security",
      email: true,
    });

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Could not reset password" });
  }
};
