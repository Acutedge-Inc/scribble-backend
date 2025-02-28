const express = require("express");
const { adminKpis } = require("../controllers/dashboard.js");
const {
  checkMissingInputs,
  validateInputs,
} = require("../middlewares/index.js");
const { auth } = require("../lib/index.js");
const jwt = require("jsonwebtoken");
const { ErrorResponse } = require("../lib/responses.js");
const dashboardRoutes = express.Router();

dashboardRoutes.get(
  "/admin",
  auth.protect(["user.read"]),
  checkMissingInputs,
  validateInputs,
  adminKpis
);

module.exports = dashboardRoutes;
