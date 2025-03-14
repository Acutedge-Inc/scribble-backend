const mongoose = require("mongoose");

const formSchema = new mongoose.Schema(
  {
    formTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form_Type",
      required: true,
    },
    questionForm: {
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
