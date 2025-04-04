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
  getForm,
  updateForm,
} = require("../controllers/visit.js");
const {
  checkMissingInputs,
  validateInputs,
} = require("../middlewares/index.js");
const { auth } = require("../lib/index.js");
const visitRoutes = express.Router();

visitRoutes.post(
  "/form",
  auth.protect(["form.create"]),
  checkMissingInputs,
  validateInputs,
  createForm
);

visitRoutes.get(
  "/form",
  auth.protect(["form.read"]),
  checkMissingInputs,
  validateInputs,
  getForm
);

visitRoutes.put(
  "/form/:id",
  auth.protect(["form.update"]),
  checkMissingInputs,
  validateInputs,
  updateForm
);

visitRoutes.post(
  "/",
  auth.protect(["visit.create"]),
  checkMissingInputs,
  validateInputs,
  createVisit
);

visitRoutes.get(
  "/",
  auth.protect(["visit.read"]),
  checkMissingInputs,
  validateInputs,
  listVisit
);

visitRoutes.get(
  "/episode",
  auth.protect(["visit.read"]),
  checkMissingInputs,
  validateInputs,
  listEpisode
);

visitRoutes.get(
  "/formtypes",
  auth.protect(["visit.read"]),
  checkMissingInputs,
  validateInputs,
  formTypes
);

visitRoutes.get(
  "/assessment",
  auth.protect(["visit.read"]),
  checkMissingInputs,
  validateInputs,
  listAssessment
);

visitRoutes.get(
  "/assessment/:id",
  auth.protect(["visit.read"]),
  checkMissingInputs,
  validateInputs,
  getAssessmentById
);

visitRoutes.put(
  "/assessment/:id",
  auth.protect(["visit.update"]),
  checkMissingInputs,
  validateInputs,
  updateAssessment
);

visitRoutes.put(
  "/:id",
  auth.protect(["visit.update"]),
  checkMissingInputs,
  validateInputs,
  updateVisit
);

module.exports = visitRoutes;
