const express = require("express");
const { listClient, listClinician } = require("../controllers/user.js");
const {
  checkMissingInputs,
  validateInputs,
} = require("../middlewares/index.js");
const { auth } = require("../lib/index.js");
const jwt = require("jsonwebtoken");
const { ErrorResponse } = require("../lib/responses.js");
const userRoutes = express.Router();

userRoutes.get(
  "/client",
  auth.protect(["user.read"]),
  checkMissingInputs,
  validateInputs,
  listClient
);

userRoutes.get(
  "/clinician",
  auth.protect(["user.read"]),
  checkMissingInputs,
  validateInputs,
  listClinician
);

module.exports = userRoutes;
