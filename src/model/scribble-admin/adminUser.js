const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    scoper: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
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
