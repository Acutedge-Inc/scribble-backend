const mongoose = require("mongoose");

const adminInfoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminId: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
    },
    dob: {
      type: String,
    },
    address: {
      type: String,
    },
    primaryPhone: {
      type: String,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

adminInfoSchema.pre("save", async function (next) {
  this.updatedAt = new Date();

  next();
});

module.exports = (connection) =>
  connection.model("Admin_Info", adminInfoSchema);
