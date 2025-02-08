const mongoose = require("mongoose");

const assessmentHistorySchema = new mongoose.Schema(
  {
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientId: {
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
assessmentHistorySchema.pre("save", async function (next) {
  this.updatedAt = new Date();

  next();
});
module.exports = (connection) =>
  connection.model("Assessment_History", assessmentHistorySchema);
