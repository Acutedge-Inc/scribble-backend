// models/index.js
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();
const { logger } = require("../../lib");

const db = {};

db.init = async (uri) => {
  try {
    logger.info("Connecting to Admin MongoDB..." + uri);

    // Connect to MongoDB
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Limits open connections
    });
    logger.info("MongoDB connected successfully");

    // Model loader
    const models = ["adminUser.js", "tenants.js", "subscriptions.js"];

    models.forEach((file) => {
      const model = require(path.join(__dirname, file));
      db[model.modelName] = model; // Store the model in the db object
    });
  } catch (error) {
    logger.error(`MongoDB admin connection failed: ${error.message}`);
    process.exit(1);
  }
};

// Export the db object for use in other parts of the application
module.exports = db;
