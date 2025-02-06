const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const { getConnection } = require("../../lib/dbManager");


const tenantdb = {};

tenantdb.init = async (uri) => {
  try {
    console.info("Connecting to MongoDB...");

    // Connect to MongoDB
    console.log(uri)
    let connect = await mongoose.createConnection(uri);
    console.info("MongoDB connected successfully");

    // Model loader
    const models = [
      "user.js", 
      "assessment-forms.js",
    ];

    models.forEach((file) => {
      const model = require(path.join(__dirname, file));
      connect[model.modelName] = model; // Store the model in the db object
    });
    return connect;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Export the db object for use in other parts of the application
module.exports = tenantdb;

