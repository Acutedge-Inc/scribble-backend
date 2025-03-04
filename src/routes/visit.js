const express = require("express");
const {
  createForm,
  createVisit,
  formTypes,
  listVisit,
  listEpisode,
  listAssessment,
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
  "/",
  auth.protect(["form.create"]),
  checkMissingInputs,
  validateInputs,
  listVisit
);

visitRoutes.get(
  "/episode",
  auth.protect(["form.create"]),
  checkMissingInputs,
  validateInputs,
  listEpisode
);

visitRoutes.get(
  "/formtypes",
  auth.protect(["form.read"]),
  checkMissingInputs,
  validateInputs,
  formTypes
);

visitRoutes.get(
  "/assessment",
  auth.protect(["form.create"]),
  checkMissingInputs,
  validateInputs,
  listAssessment
);

module.exports = visitRoutes;
