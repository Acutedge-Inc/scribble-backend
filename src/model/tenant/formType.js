const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const formTypeSchema = new mongoose.Schema(
  {
    formName: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

formTypeSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) => connection.model("Form_Type", formTypeSchema);
