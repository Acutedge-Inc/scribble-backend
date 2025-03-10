const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: true,
      unique: true,
    },
    scope: {
      type: [String],
      required: true,
      unique: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

roleSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) => connection.model("Role", roleSchema);
