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
      type: Array,
      required: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

assessmentFormTemplateSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) =>
  connection.model("Form_Template", assessmentFormTemplateSchema);
