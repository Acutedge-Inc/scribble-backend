const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const { getConnection } = require("../../lib/dbManager");
const seedTenantData = require("../seedTenantData");

const tenantdb = {};

tenantdb.init = async (dbName) => {
  try {
    console.info("Connecting to MongoDB...");

    // Connect to MongoDB
    let connect = await mongoose.createConnection(
      `${process.env.MONGO_URI}/${dbName}`,
    );
    console.info("MongoDB connected successfully");

    // Model loader
    const models = [
      "role.js",
      "user.js",
      "userSetting.js",
      "clinicianInfo.js",
      "adminInfo.js",
      "patientInfo.js",
      "notificationType.js",
      "notification.js",
      "assessmentType.js",
      "assessmentFormTemplate.js",
      "assessmentForm.js",
      "assessment.js",
      "assessmentHistory.js",
    ];

    models.forEach((file) => {
      const model = require(path.join(__dirname, file));
      connect[model.modelName] = model; // Store the model in the db object
    });

    await seedTenantData(connect);
    return connect;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Export the db object for use in other parts of the application
module.exports = tenantdb;
