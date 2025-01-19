const express = require("express");
const { performLogin, register, health } = require("../controllers/auth.js");

const authRoutes = express.Router();

/**
 * perform login
 */
authRoutes.post("/basic", performLogin);
// Registration route
authRoutes.post("/register", register);
authRoutes.get("/health", health);

module.exports = authRoutes;
