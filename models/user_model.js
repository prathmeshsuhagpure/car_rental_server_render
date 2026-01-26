/* const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true, 
      sparse: true, 
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true, 
    },
    driverLicenseNumber: {
      type: String,
    },
    driverLicenseUrl: { 
      type: String 
    },
    aadharCardNumber: { 
      type: String 
    },
    aadharCardUrl: { 
      type: String 
    },
    dateOfBirth: { 
      type: Date 
    },
    gender: { 
      type: String, enum: ["Male", "Female", "Other"] 
    },
    role: {
      type: String,
      enum: ["user", "host"],
    },
    profilePicture: {
      type: String, 
      default: "", 
    },
    fcmToken: {
      type: String,
      default: "", 
    },

    // OTP fields
    otp: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    otpBlockedUntil: {
      type: Date,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ✅ Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ Generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  this.otpAttempts = 0;

  console.log(`OTP for user ${this.phoneNumber || this.email}: ${otp}`);

  return otp;
};

// ✅ Verify OTP
userSchema.methods.verifyOTP = function (enteredOTP) {
  if (this.otpBlockedUntil && this.otpBlockedUntil > new Date()) {
    throw new Error(
      "Account temporarily blocked due to too many failed attempts"
    );
  }

  if (!this.otpExpiresAt || this.otpExpiresAt < new Date()) {
    throw new Error("OTP has expired");
  }

  if (this.otp !== enteredOTP) {
    this.otpAttempts += 1;

    if (this.otpAttempts >= 5) {
      this.otpBlockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      throw new Error(
        "Too many failed attempts. Account blocked for 15 minutes."
      );
    }

    throw new Error("Invalid OTP");
  }

  this.otp = undefined;
  this.otpExpiresAt = undefined;
  this.otpAttempts = 0;
  this.otpBlockedUntil = undefined;
  this.isVerified = true;

  return true;
};

// ✅ Cleanup expired OTPs
userSchema.statics.clearExpiredOTPs = function () {
  return this.updateMany(
    { otpExpiresAt: { $lt: new Date() } },
    {
      $unset: { otp: "", otpExpiresAt: "" },
      $set: { otpAttempts: 0 },
    }
  );
};

const User = mongoose.model("User", userSchema);
module.exports = User;
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true, 
      sparse: true, // Allows null values while maintaining uniqueness
    },
    phoneNumber: {
      type: String,
      unique: true, 
      sparse: true, // Changed: Now allows null/undefined for email-only users
    },
    password: {
      type: String,
      select: false, // Don't include password in queries by default
      minlength: 6,
    },
    driverLicenseNumber: {
      type: String,
    },
    driverLicenseUrl: { 
      type: String 
    },
    aadharCardNumber: { 
      type: String 
    },
    aadharCardUrl: { 
      type: String 
    },
    dateOfBirth: { 
      type: Date 
    },
    gender: { 
      type: String, 
      enum: ["Male", "Female", "Other"] 
    },
    role: {
      type: String,
      enum: ["user", "host"],
      default: "user",
    },
    profilePicture: {
      type: String, 
      default: "", 
    },
    fcmToken: {
      type: String,
      default: "", 
    },

    // OTP fields
    otp: {
      type: String,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    otpBlockedUntil: {
      type: Date,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    // New: Track authentication method
    authMethod: {
      type: String,
      enum: ["phone", "email", "both"],
      default: "phone",
    },
  },
  { timestamps: true }
);

// ✅ Validation: Ensure at least email OR phone exists
userSchema.pre("validate", function (next) {
  if (!this.email && !this.phoneNumber) {
    next(new Error("Either email or phone number is required"));
  }
  next();
});

// ✅ Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  // Only hash if password exists (for email auth users)
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  next();
});

// ✅ Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) {
    throw new Error("User does not have a password set");
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ Generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  this.otpAttempts = 0;

  console.log(`OTP for user ${this.phoneNumber || this.email}: ${otp}`);

  return otp;
};

// ✅ Verify OTP
userSchema.methods.verifyOTP = function (enteredOTP) {
  if (this.otpBlockedUntil && this.otpBlockedUntil > new Date()) {
    throw new Error(
      "Account temporarily blocked due to too many failed attempts"
    );
  }

  if (!this.otpExpiresAt || this.otpExpiresAt < new Date()) {
    throw new Error("OTP has expired");
  }

  if (this.otp !== enteredOTP) {
    this.otpAttempts += 1;

    if (this.otpAttempts >= 5) {
      this.otpBlockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      throw new Error(
        "Too many failed attempts. Account blocked for 15 minutes."
      );
    }

    throw new Error("Invalid OTP");
  }

  this.otp = undefined;
  this.otpExpiresAt = undefined;
  this.otpAttempts = 0;
  this.otpBlockedUntil = undefined;
  this.isVerified = true;

  return true;
};

// ✅ Cleanup expired OTPs
userSchema.statics.clearExpiredOTPs = function () {
  return this.updateMany(
    { otpExpiresAt: { $lt: new Date() } },
    {
      $unset: { otp: "", otpExpiresAt: "" },
      $set: { otpAttempts: 0 },
    }
  );
};

const User = mongoose.model("User", userSchema);
module.exports = User;