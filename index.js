#!/usr/bin/env node

// Set time zone to UTC
process.env.TZ = "UTC";

const http = require("http");
const nconf = require("nconf");
require("dotenv").config();
const mongoose = require("mongoose");
const db = require("./src/model/scribble-admin/index.js");
const serverless = require("serverless-http");
let adminDbUrl = process.env.MONGO_URI.replace(
  "ADMIN_DB",
  process.env.ADMIN_DB
);
adminDbUrl = adminDbUrl.replace(/<PUBLIC_IP>/g, process.env.IP);
const { createAdminUser } = require("./src/controllers/auth.js");
nconf
  .use("memory")
  .env({ parseValues: true })
  .file({ file: "./src/config.json" });
const { logger } = require("./src/lib/index.js");

// Connect to MongoDB and initialize admin user
async function connectToDatabase() {
  try {
    logger.info(`Connecting to ${adminDbUrl}`);
    await db.init(adminDbUrl, {
      poolSize: 10,
    });
    logger.info("Database connected successfully.");

    // Create admin user if it doesn't exist
    await createAdminUser(adminDbUrl);
  } catch (err) {
    logger.error("Error on MongoDB Connection ::", err);
    process.exit(1);
  }
}

// Start server locally
async function startServer() {
  await connectToDatabase();

  const port = process.env.PORT || 3000;
  const app = require("./src/index");
  const server = http.createServer(app);

  server.on("error", (e) => {
    switch (e.code) {
      case "EADDRINUSE":
        console.warn("Address in use, retrying...");
        setTimeout(() => {
          server.close();
          server.listen(port);
        }, 1000);
        break;

      case "EACCES":
        console.warn("Elevated privileges required");
        break;

      default:
        throw e;
    }
  });

  server.on("listening", () => {
    const addr = server.address();
    const bind =
      typeof addr === "string" ? `pipe ${addr}` : `port ${addr.port}`;
    logger.warn(`Server listening on ${bind}`);
  });

  server.listen(port); // Start listening on the specified port

  const shutdown = () => {
    logger.error("Received kill signal, shutting down gracefully");
    server.close(() => {
      logger.error("Closed out remaining connections");
      process.exit(0);
    });
  };

  process.on("uncaughtException", (err) => {
    console.error("There was an uncaught error", err);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  });

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer(); // Start the server locally
