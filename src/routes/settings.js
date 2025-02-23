const express = require("express");
const {
  getUserSettings,
  updateUserSettings,
  getGridViewSettings,
  updateGridViewSettings,
} = require("../controllers/settings.js");
const {
  checkMissingInputs,
  validateInputs,
} = require("../middlewares/index.js");
const { auth } = require("../lib/index.js");
const jwt = require("jsonwebtoken");
const { ErrorResponse } = require("../lib/responses.js");
const assessmentRoutes = express.Router();

//Scribble admin to create new tenant
assessmentRoutes.get(
  "/users",
  auth.protect(["self.read"]),
  checkMissingInputs,
  validateInputs,
  getUserSettings
);

//Scribble admin to create new tenant
assessmentRoutes.put(
  "/users",
  auth.protect(["self.update"]),
  checkMissingInputs,
  validateInputs,
  updateUserSettings
);

assessmentRoutes.get(
  "/gridView",
  auth.protect(["grid.read"]),
  checkMissingInputs,
  validateInputs,
  getGridViewSettings
);

assessmentRoutes.put(
  "/gridView",
  auth.protect(["grid.update"]),
  checkMissingInputs,
  validateInputs,
  updateGridViewSettings
);

module.exports = assessmentRoutes;
