const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const { getConnection } = require("../../lib/dbManager");
const { logger } = require("../../lib");
const seedTenantData = require("../seedTenantData");

const tenantdb = {};

tenantdb.init = async (dbName) => {
  try {
    let db_url = process.env.MONGO_URI.replace("ADMIN_DB", dbName);
    db_url = db_url.replace("<PUBLIC_IP>", process.env.IP);

    logger.info("Connecting to MongoDB..." + db_url);

    // Connect to MongoDB
    const connect = await mongoose.createConnection(db_url);
    logger.info("MongoDB connected successfully");

    // Model loader
    const models = [
      "role.js",
      "user.js",
      "userSetting.js",
      "clinicianInfo.js",
      "adminInfo.js",
      "clientInfo.js",
      "notificationType.js",
      "notification.js",
      "assessmentType.js",
      "assessmentFormTemplate.js",
      "assessmentForm.js",
      "assessment.js",
      "assessmentHistory.js",
      "grid.js",
      "viewSetting.js",
    ];

    models.forEach((file) => {
      const model = require(path.join(__dirname, file));
      connect[model.modelName] = model; // Store the model in the db object
    });
    await seedTenantData(connect);
    return connect;
  } catch (error) {
    logger.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

// Export the db object for use in other parts of the application
module.exports = tenantdb;
