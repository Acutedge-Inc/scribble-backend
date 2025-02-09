const mongoose = require("mongoose");

const adminInfoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    dob: {
      type: String,
    },
    address: {
      type: String,
    },
    contact: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

adminInfoSchema.pre("save", async function (next) {
  this.updatedAt = new Date();

  next();
});

module.exports = (connection) =>
  connection.model("Admin_Info", adminInfoSchema);
