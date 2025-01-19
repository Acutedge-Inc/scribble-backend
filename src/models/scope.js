// models/Scope.js
const mongoose = require("mongoose");

const scopeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Scope = mongoose.model("Scope", scopeSchema);
module.exports = Scope;
