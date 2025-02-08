const mongoose = require("mongoose");

const patientInfoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientId: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    dob: {
      type: String,
      required: true,
    },
    address1: {
      type: String,
      required: true,
    },
    address2: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zip: {
      type: String,
      required: true,
    },
    primaryPhone: {
      type: String,
      required: true,
    },
    homePhone: {
      type: String,
      required: true,
    },
    workPhone: {
      type: String,
      required: true,
    },
    cellPhone: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

patientInfoSchema.pre("save", async function (next) {
  next();
});

module.exports = (connection) =>
  connection.model("Patient_Info", patientInfoSchema);
