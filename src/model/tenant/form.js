const mongoose = require("mongoose");

const formSchema = new mongoose.Schema(
  {
    formName: {
      type: String,
      required: true,
      unique: true,
    },
    assessmentForm: {
      type: Array,
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

formSchema.pre("save", async function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) => connection.model("Form", formSchema);
