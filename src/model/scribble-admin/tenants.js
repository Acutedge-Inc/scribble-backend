const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema({
    organization_name: {
      type: String,
      required: true,
    },
    database_name: {
      type: String,
      required: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  }, { timestamps: true });
  
  const Tenant = mongoose.model("Tenant", tenantSchema);
  module.exports = Tenant;
  
  