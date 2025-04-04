const mongoose = require("mongoose");

const formSchema = new mongoose.Schema(
  {
    formName: {
      type: String,
      required: true,
      unique: true,
    },
    disciplineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discipline",
    },
    formTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form_Type",
    },
    assessmentForm: {
      type: Array,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

formSchema.pre("save", async function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = (connection) => connection.model("Form", formSchema);
