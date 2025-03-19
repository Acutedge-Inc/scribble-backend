const mongoose = require("mongoose");

const gridSchema = new mongoose.Schema(
  {
    gridName: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  },
);

gridSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) => connection.model("Grid", gridSchema);
