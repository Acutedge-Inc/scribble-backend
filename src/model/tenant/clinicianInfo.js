const mongoose = require("mongoose");

const clinitianInfoSchema = new mongoose.Schema(
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
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

clinitianInfoSchema.pre("save", async function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) =>
  connection.model("Clinitian_Info", clinitianInfoSchema);
