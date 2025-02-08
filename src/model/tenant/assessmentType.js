const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const assessmentTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
);

assessmentTypeSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) =>
  connection.model("Assessment_Type", assessmentTypeSchema);
