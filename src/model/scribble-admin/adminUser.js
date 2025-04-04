const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    lastLoginTime: {
      type: Date,
      default: null,
    },
    isFirstLogin: {
      type: Boolean,
      required: true,
      default: true,
    },
    scope: {
      type: [String],
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

// Method to compare passwords
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

// Pre-save hook to hash the password
userSchema.pre("save", async function (next) {
  // if (this.isModified("password")) {
  //   this.password = await bcrypt.hash(this.password, 10);
  // }
  this.updatedAt = new Date();

  next();
});

const AdminUser = mongoose.model("Admin_User", userSchema);
module.exports = AdminUser;
