const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const notificationTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
);

notificationTypeSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) =>
  connection.model("Notification_Type", notificationTypeSchema);
