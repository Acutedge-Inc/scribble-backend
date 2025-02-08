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
    notification_content: {
      type: String,
      required: true,
    },
    isRead: {
      type: String,
      required: true,
    },
    isDelivered: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

notificationSchema.pre("save", async function (next) {
  this.updatedAt = new Date();

  next();
});

module.exports = (connection) =>
  connection.model("Notification", notificationSchema);
