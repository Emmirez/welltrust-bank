import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, invalid or expired token" });
  }
};

export const requireActive = (req, res, next) => {
  // Frozen accounts can still view their dashboard/history — only pending,
  // rejected, and suspended accounts are locked out of everything.
  if (req.user.status !== "active" && req.user.status !== "frozen") {
    return res.status(403).json({
      message: `Your account is currently ${req.user.status}. Please contact support.`,
    });
  }
  next();
};

export const requireNotFrozen = (req, res, next) => {
  if (req.user.status === "frozen") {
    return res.status(403).json({
      message: "Your account is frozen and cannot send money, request funds, or open new applications. Contact support to resolve this.",
    });
  }
  if (req.user.status !== "active") {
    return res.status(403).json({
      message: `Your account is currently ${req.user.status}. Please contact support.`,
    });
  }
  next();
};

export const requireKycApproved = (req, res, next) => {
  if (req.user.kycStatus !== "approved") {
    return res.status(403).json({
      message: "Please complete identity verification before sending or requesting money. Go to Profile → KYC Verification to get started.",
      needsKyc: true,
    });
  }
  next();
};

export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};
