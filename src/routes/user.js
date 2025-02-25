const express = require("express");
const { listClient } = require("../controllers/user.js");
const {
  checkMissingInputs,
  validateInputs,
} = require("../middlewares/index.js");
const { auth } = require("../lib/index.js");
const jwt = require("jsonwebtoken");
const { ErrorResponse } = require("../lib/responses.js");
const visitRoutes = express.Router();

visitRoutes.get(
  "/client",
  auth.protect(["form.read"]),
  checkMissingInputs,
  validateInputs,
  listClient
);

module.exports = visitRoutes;
