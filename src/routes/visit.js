const express = require("express");
const {
  createForm,
  createVisit,
  formTypes,
  listVisit,
  listEpisode,
  listAssessment,
  updateVisit,
  updateAssessment,
  getAssessmentById,
} = require("../controllers/visit.js");
const {
  checkMissingInputs,
  validateInputs,
} = require("../middlewares/index.js");
const { auth } = require("../lib/index.js");
const visitRoutes = express.Router();

visitRoutes.post(
  "/form",
  auth.protect(["self.read"]),
  checkMissingInputs,
  validateInputs,
  createForm
);

visitRoutes.post(
  "/",
  auth.protect(["self.read"]),
  checkMissingInputs,
  validateInputs,
  createVisit
);

visitRoutes.get(
  "/",
  auth.protect(["self.read"]),
  checkMissingInputs,
  validateInputs,
  listVisit
);

visitRoutes.get(
  "/episode",
  auth.protect(["self.read"]),
  checkMissingInputs,
  validateInputs,
  listEpisode
);

visitRoutes.get(
  "/formtypes",
  auth.protect(["self.read"]),
  checkMissingInputs,
  validateInputs,
  formTypes
);

visitRoutes.get(
  "/assessment",
  auth.protect(["self.read"]),
  checkMissingInputs,
  validateInputs,
  listAssessment
);

visitRoutes.get(
  "/assessment/:id",
  auth.protect(["self.update"]),
  checkMissingInputs,
  validateInputs,
  getAssessmentById
);

visitRoutes.put(
  "/assessment/:id",
  auth.protect(["self.update"]),
  checkMissingInputs,
  validateInputs,
  updateAssessment
);

visitRoutes.put(
  "/:id",
  auth.protect(["self.update"]),
  checkMissingInputs,
  validateInputs,
  updateVisit
);

module.exports = visitRoutes;
