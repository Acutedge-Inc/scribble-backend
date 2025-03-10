const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notificationTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification_Type",
      required: true,
    },
    notificationContent: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

notificationSchema.pre("save", async function (next) {
  this.updatedAt = new Date();

  next();
});

module.exports = (connection) =>
  connection.model("Notification", notificationSchema);
