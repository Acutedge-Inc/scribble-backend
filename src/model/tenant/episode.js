const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const episodeSchema = new mongoose.Schema(
  {
    episodeNo: {
      type: String,
      required: true,
      unique: true,
    },
    episodeDuration: {
      type: String,
    },
    startDate: {
      type: String,
    },
    endDate: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

episodeSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) => connection.model("Episode", episodeSchema);
