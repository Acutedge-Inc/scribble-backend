const express = require("express");
const {
  createForm,
  createVisit,
  formTypes,
} = require("../controllers/visit.js");
const {
  checkMissingInputs,
  validateInputs,
} = require("../middlewares/index.js");
const { auth } = require("../lib/index.js");
const jwt = require("jsonwebtoken");
const { ErrorResponse } = require("../lib/responses.js");
const visitRoutes = express.Router();

visitRoutes.post(
  "/form",
  auth.protect(["form.create"]),
  checkMissingInputs,
  validateInputs,
  createForm
);

visitRoutes.post(
  "/",
  auth.protect(["form.create"]),
  checkMissingInputs,
  validateInputs,
  createVisit
);

visitRoutes.get(
  "/types",
  auth.protect(["form.read"]),
  checkMissingInputs,
  validateInputs,
  formTypes
);

module.exports = visitRoutes;
