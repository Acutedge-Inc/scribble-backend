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
    assessmentName: {
      type: String,
    },
    assessmentQuestion: {
      type: Array,
    },
    assessmentAnswer: {
      type: Array,
    },
    s3Path: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        "Not Started",
        "In Progress",
        "Draft Saved",
        "Submitted to AI",
        "Ready for Review",
        "Submitted to EMR",
        "Completed",
        "AI Processing Failed",
        "EMR Processing Failed",
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
