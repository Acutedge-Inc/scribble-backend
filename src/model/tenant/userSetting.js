const mongoose = require("mongoose");

const userSettingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isNotificationEnabled: {
      type: String,
      required: true,
    },
    isPopupEnabled: {
      type: String,
      required: true,
    },
    isMailEnabled: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

userSettingSchema.pre("save", async function (next) {
  next();
});

module.exports = (connection) =>
  connection.model("User_Setting", userSettingSchema);
