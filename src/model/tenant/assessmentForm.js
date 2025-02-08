const mongoose = require("mongoose");

const assessmentFormSchema = new mongoose.Schema(
  {
    assessmentTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment_Type",
      required: true,
    },
    questionForm: {
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
assessmentFormSchema.pre("save", async function (next) {
  this.updatedAt = new Date();

  next();
});
module.exports = (connection) =>
  connection.model("Assessment_Form", assessmentFormSchema);
