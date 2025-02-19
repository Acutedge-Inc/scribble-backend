// migrate-mongo-config.js
require("dotenv").config();

module.exports = {
  mongodb: {
    url: process.env.MONGO_URI, // Ensure this is set in your .env file
    databaseName: "scribble_dev", // Change this to your database name
    options: {},
  },
  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js",
};
