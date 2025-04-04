const express = require("express");
const {
  createForm,
  createVisit,
  getFormbyId,
  listVisit,
  listEpisode,
  listAssessment,
  updateVisit,
  updateAssessment,
  getAssessmentById,
  getForm,
  getFormTemplate,
  updateForm,
  deleteForm,
  getFormTemplatebyId,
  formTypes,
  listDiscipline,
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

visitRoutes.get(
  "/template",
  auth.protect(["form.read"]),
  checkMissingInputs,
  validateInputs,
  getFormTemplate
);

visitRoutes.get(
  "/template/:id",
  auth.protect(["form.update"]),
  checkMissingInputs,
  validateInputs,
  getFormTemplatebyId
);

visitRoutes.put(
  "/form/:id",
  auth.protect(["form.update"]),
  checkMissingInputs,
  validateInputs,
  updateForm
);

visitRoutes.delete(
  "/form/:id",
  auth.protect(["form.update"]),
  checkMissingInputs,
  validateInputs,
  deleteForm
);

visitRoutes.get(
  "/form/:id",
  auth.protect(["form.update"]),
  checkMissingInputs,
  validateInputs,
  getFormbyId
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
  "/discipline",
  auth.protect(["visit.read"]),
  checkMissingInputs,
  validateInputs,
  listDiscipline
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
