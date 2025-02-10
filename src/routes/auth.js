const express = require("express");
const {
  performLogin,
  register,
  health,
  getAccessToken,
  changePassword,
  sendRecoverPasswordEmail,
  recoverPassword,
  createTenant,
} = require("../controllers/auth.js");
const { checkMissingInputs, validateInputs } = require("../middlewares");
const { auth } = require("../lib/index.js");
const jwt = require("jsonwebtoken");
const { ErrorResponse } = require("../lib/responses.js");
const authRoutes = express.Router();

//Login of all the users in scribble
authRoutes.post("/login", checkMissingInputs, validateInputs, performLogin);

//Scribble admin to create new tenant
authRoutes.post(
  "/tenant",
  auth.protect(["sso.write"]),
  checkMissingInputs,
  validateInputs,
  createTenant,
);

// Register a user under a tenant's database
authRoutes.post(
  "/register",
  auth.protect(["sso.write"]),
  checkMissingInputs,
  validateInputs,
  register,
);

// Registration route
// authRoutes.post("/register", checkMissingInputs, validateInputs, register);
authRoutes.get("/health", health);

// Get new accesstoken,based on valid refresh token
authRoutes.post("/refresh", checkMissingInputs, validateInputs, getAccessToken);

authRoutes.put(
  "/change-password",
  auth.protect(["sso.write"]),
  checkMissingInputs,
  validateInputs,
  changePassword,
);

// Send Email with link to recover password [AG-839]
authRoutes.post(
  "/recover-password-email",
  checkMissingInputs,
  validateInputs,
  sendRecoverPasswordEmail,
);

// Reset the new password (Triggered from the link mailed on above route) [AG-839]
authRoutes.post(
  "/recover-password",
  auth.protect(["sso.self.write"]),
  checkMissingInputs,
  validateInputs,
  recoverPassword,
);
module.exports = authRoutes;
