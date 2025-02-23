const express = require("express");
const {
  createForm,
  createAssessment,
  listTypes,
} = require("../controllers/assessment.js");
const {
  checkMissingInputs,
  validateInputs,
} = require("../middlewares/index.js");
const { auth } = require("../lib/index.js");
const jwt = require("jsonwebtoken");
const { ErrorResponse } = require("../lib/responses.js");
const assessmentRoutes = express.Router();

assessmentRoutes.post(
  "/form",
  auth.protect(["form.create"]),
  checkMissingInputs,
  validateInputs,
  createForm
);

assessmentRoutes.get(
  "/types",
  auth.protect(["form.read"]),
  checkMissingInputs,
  validateInputs,
  listTypes
);

module.exports = assessmentRoutes;
