const express = require("express");
const { performLogin } = require("../controllers/auth.js");

const authRoutes = express.Router();

/**
 * perform login
 */
authRoutes.post("/basic", performLogin);

module.exports = authRoutes;
