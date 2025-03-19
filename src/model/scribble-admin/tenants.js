const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    tenantName: {
      type: String,
      required: true,
    },
    uniqueName: {
      type: String,
      required: true,
    },
    databaseName: {
      type: String,
      required: true,
    },
    subDomain: {
      type: String,
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
);
tenantSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});
const Tenant = mongoose.model("Tenant", tenantSchema);
module.exports = Tenant;
