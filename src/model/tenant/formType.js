const mongoose = require("mongoose");

const formTypeTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

formTypeTypeSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) =>
  connection.model("Form_Type", formTypeTypeSchema);
