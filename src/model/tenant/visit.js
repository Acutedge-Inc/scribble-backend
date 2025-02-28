const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
  {
    episodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Episode",
      required: true,
    },
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client_Info",
      required: true,
    },
    visitNo: {
      type: String,
      required: true,
      unique: true,
    },
    visitDate: {
      type: String,
    },
    week: {
      type: String,
    },
    visitType: {
      type: String,
    },
    service: {
      type: String,
    },
    serviceCode: {
      type: String,
    },
    status: {
      type: String,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

visitSchema.pre("save", async function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) => connection.model("Visit", visitSchema);
