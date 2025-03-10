const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
  {
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
      required: true,
    },
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },
    assessmentAnswer: {
      type: String,
    },
    s3Path: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        "Not Started",
        "In Progress",
        "Submitted to AI",
        "Validation",
        "Submitted to EMR",
        "Completed",
      ],
      default: "Not Started",
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);
assessmentSchema.pre("save", async function (next) {
  this.updatedAt = new Date();

  next();
});
module.exports = (connection) =>
  connection.model("Assessment", assessmentSchema);
