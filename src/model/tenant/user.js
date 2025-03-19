const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    tenantId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isFirstLogin: {
      type: Boolean,
      required: true,
      default: true,
    },
    isVerified: {
      type: String,
      required: true,
      default: false,
    },
    isDeleted: {
      type: String,
      required: true,
      default: false,
    },
    loginAttempts: {
      type: mongoose.Schema.Types.Int32,
      required: true,
      default: 0,
    },
    lastLoginTime: {
      type: Date,
      default: null,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// Method to compare passwords
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// Pre-save hook to hash the password
userSchema.pre("save", async function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) => connection.model("User", userSchema);
