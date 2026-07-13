import Transaction from "../models/Transaction.js";

const DEBIT_TYPES = [
  "transfer_internal", "transfer_external", "transfer_international",
  "transfer_zelle", "transfer_paypal",
];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const startOfWeek = (d) => { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);

export const getLimitUsage = async (userId) => {
  const now = new Date();

  const sumSince = async (since) => {
    const result = await Transaction.aggregate([
      { $match: { sender: userId, type: { $in: DEBIT_TYPES }, status: "completed", createdAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total || 0;
  };

  const [daily, weekly, monthly] = await Promise.all([
    sumSince(startOfDay(now)),
    sumSince(startOfWeek(now)),
    sumSince(startOfMonth(now)),
  ]);

  return { daily, weekly, monthly };
};

/**
 * Checks a proposed transfer amount against the user's per-transaction,
 * daily, weekly, and monthly limits. Returns null if allowed, or a
 * human-readable error message if it would exceed a limit.
 */
export const checkTransferLimits = async (user, amount) => {
  const limits = user.limits || {};
  const perTx = limits.perTransactionLimit ?? 250000;
  const dailyLimit = limits.dailyLimit ?? 500000;
  const weeklyLimit = limits.weeklyLimit ?? 1000000;
  const monthlyLimit = limits.monthlyLimit ?? 5000000;

  if (amount > perTx) {
    return `This transfer exceeds your per-transaction limit of ${perTx.toLocaleString()}.`;
  }

  const usage = await getLimitUsage(user._id);

  if (usage.daily + amount > dailyLimit) {
    return `This transfer would exceed your daily limit. You have ${(dailyLimit - usage.daily).toLocaleString()} remaining today.`;
  }
  if (usage.weekly + amount > weeklyLimit) {
    return `This transfer would exceed your weekly limit. You have ${(weeklyLimit - usage.weekly).toLocaleString()} remaining this week.`;
  }
  if (usage.monthly + amount > monthlyLimit) {
    return `This transfer would exceed your monthly limit. You have ${(monthlyLimit - usage.monthly).toLocaleString()} remaining this month.`;
  }

  return null;
};