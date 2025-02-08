const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const assessmentFormTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    assessmentForm: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
);

assessmentFormTemplateSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) =>
  connection.model("Assessment_Form_Template", assessmentFormTemplateSchema);
