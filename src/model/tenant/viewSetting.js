const mongoose = require("mongoose");

const viewSettingSchema = new mongoose.Schema(
  {
    gridId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grid",
      required: true,
    },
    viewJson: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

viewSettingSchema.pre("save", async function (next) {
  next();
});

module.exports = (connection) =>
  connection.model("View_Setting", viewSettingSchema);
