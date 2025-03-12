const express = require("express");
const {
  listClient,
  listClinician,
  updateClinician,
  listClinicianVisitDetails,
  listUserNotification,
} = require("../controllers/user.js");
const {
  checkMissingInputs,
  validateInputs,
} = require("../middlewares/index.js");
const { auth } = require("../lib/index.js");
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

userRoutes.put(
  "/clinician/:id",
  auth.protect(["user.update"]),
  checkMissingInputs,
  validateInputs,
  updateClinician
);

userRoutes.get(
  "/clinician/visitDetails",
  auth.protect(["visit.read"]),
  checkMissingInputs,
  validateInputs,
  listClinicianVisitDetails
);

userRoutes.get(
  "/notification",
  auth.protect(["visit.read"]),
  checkMissingInputs,
  validateInputs,
  listUserNotification
);
module.exports = userRoutes;
