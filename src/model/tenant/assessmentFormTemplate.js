const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const assessmentFormTemplateSchema = new mongoose.Schema(
  {
    formName: {
      type: String,
      required: true,
      unique: true,
    },
    assessmentForm: {
      type: Array,
      required: true,
    },
    disciplineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discipline",
    },
    formTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form_Type",
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
