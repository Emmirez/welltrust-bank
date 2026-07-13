import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, default: "United States" },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    ssnLast4: { type: String, required: true, select: false },
    ssnHash: { type: String, required: true, select: false },
    address: { type: addressSchema, required: true },

    password: { type: String, required: true, select: false },
    transactionPin: { type: String, required: true, select: false },

    // Banking details
    accountNumber: { type: String, unique: true },
    routingNumber: { type: String, default: "021000021" },
    accountType: {
      type: String,
      enum: ["checking", "savings", "business", "money_market"],
      required: true,
    },
    currency: {
      type: String,
      enum: ["USD", "AUD", "EUR", "CAD", "JPY", "GBP", "CHF"],
      default: "USD",
    },
    balance: { type: Number, default: 0 },

    // Status / role
    role: { type: String, enum: ["user", "admin"], default: "user" },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "rejected", "frozen"],
      default: "pending",
    },

    // Verification
    isEmailVerified: { type: Boolean, default: false },
    emailOtp: { type: String, select: false },
    emailOtpExpires: { type: Date, select: false },
    
    // KYC verification
    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },
    // Documents
    kycDocumentType: {
      type: String,
      enum: ["drivers_license", "passport", "national_id", "state_id"],
    },
    kycDocumentNumber: { type: String },
    kycFrontIdUrl: { type: String },
    kycBackIdUrl: { type: String },
    kycSelfieUrl: { type: String },
    // Personal info
    kycFullName: { type: String },
    kycDateOfBirth: { type: Date },
    kycNationality: { type: String },
    kycGender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },
    // Address
    kycAddress: { type: addressSchema },
    // Employment
    kycEmploymentStatus: {
      type: String,
      enum: ["employed", "self_employed", "unemployed", "student", "retired"],
    },
    kycOccupation: { type: String },
    kycEmployerName: { type: String },
    kycAnnualIncome: { type: Number },
    kycSourceOfFunds: { type: String },
    // Review
    kycSubmittedAt: { type: Date },
    kycReviewedAt: { type: Date },
    kycNote: { type: String },

    // Preferences
    notificationPrefs: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
    },

    avatarUrl: { type: String, default: "" },
    lastLoginAt: { type: Date },

    limits: {
      dailyLimit: { type: Number, default: 500000 },
      weeklyLimit: { type: Number, default: 1000000 },
      monthlyLimit: { type: Number, default: 5000000 },
      perTransactionLimit: { type: Number, default: 250000 },
    },

    // Two-factor authentication (TOTP / authenticator app)
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    twoFactorTempSecret: { type: String, select: false },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified("transactionPin")) {
    this.transactionPin = await bcrypt.hash(this.transactionPin, 10);
  }
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.comparePin = function (candidate) {
  return bcrypt.compare(candidate, this.transactionPin);
};

userSchema.methods.fullName = function () {
  return `${this.firstName} ${this.lastName}`;
};

export default mongoose.model("User", userSchema);
