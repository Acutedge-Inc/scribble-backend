const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    subscriptionType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionType",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
module.exports = Subscription;
