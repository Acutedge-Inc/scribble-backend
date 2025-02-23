const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
  {
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assessmentFormId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment_Form",
      required: true,
    },
    assessmentAnswer: {
      type: String,
      required: true,
      unique: true,
    },
    s3Path: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);
assessmentSchema.pre("save", async function (next) {
  this.updatedAt = new Date();

  next();
});
module.exports = (connection) =>
  connection.model("Assessment", assessmentSchema);
