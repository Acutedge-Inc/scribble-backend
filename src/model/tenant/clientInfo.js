const mongoose = require("mongoose");

const clientInfoSchema = new mongoose.Schema(
  {
    clientNo: {
      type: String,
      required: true,
      unique: true,
    },
    clientGroupId: {
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
    age: {
      type: String,
    },
    dob: {
      type: String,
    },
    email: {
      type: String,
    },
    gender: {
      type: String,
    },
    address1: {
      type: String,
    },
    address2: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    zip: {
      type: String,
    },
    country: {
      type: String,
    },
    primaryPhone: {
      type: String,
    },
    emergencyContact: {
      type: String,
    },
    emergencyContactNo: {
      type: String,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

clientInfoSchema.pre("save", async function (next) {
  next();
});

module.exports = (connection) =>
  connection.model("Client_Info", clientInfoSchema);
