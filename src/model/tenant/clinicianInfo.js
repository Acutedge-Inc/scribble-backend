const mongoose = require("mongoose");

const clinitianInfoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clinicianNo: {
      type: String,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
    },
    status: {
      type: String,
    },
    discipline: {
      type: String,
    },
    jobTitle: {
      type: String,
    },
    age: {
      type: String,
    },
    dob: {
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
    county: {
      type: String,
    },
    officialMailId: {
      type: String,
    },
    ssn: {
      type: String,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

clinitianInfoSchema.pre("save", async function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) =>
  connection.model("Clinician_Info", clinitianInfoSchema);
