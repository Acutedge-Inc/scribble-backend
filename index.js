#!/usr/bin/env node

// Set time zone to UTC
process.env.TZ = "UTC";

const http = require("http");
const nconf = require("nconf");
require("dotenv").config();
const mongoose = require("mongoose");
const db = require("./src/model/scribble-admin");
const AdminUser = require("./src/model/scribble-admin/admin-user");
const serverless = require("serverless-http");
const bcrypt = require("bcryptjs");
const adminDbUrl= `${process.env.MONGO_URI}/${process.env.ADMIN_DB}`
nconf
  .use("memory")
  .env({ parseValues: true })
  .file({ file: "./src/config.json" });

const {logger} = require("./src/lib")
// Connect to MongoDB and initialize admin user
async function connectToDatabase() {
  try {
    await db.init(adminDbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      poolSize: 10,
    }); 
    logger.info("Database connected successfully.");

    // Create admin user if it doesn't exist
    await createAdminUser();
  } catch (err) {
    logger.error("Error on MongoDB Connection ::", err);
    process.exit(1);
  }
}

// Function to create admin user if it doesn't exist
async function createAdminUser() {
  try {
    const adminDbConnection = await mongoose.createConnection(adminDbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const existingAdmin = await AdminUser.findOne({ username: "admin@gmail.com" });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("adminpassword", 10); // Set a default password
      const newAdmin = new AdminUser({
        username: "admin@gmail.com",
        password: hashedPassword,
      });

      await newAdmin.save();
      logger.info("Admin user created successfully.");
    } else {
      logger.info("Admin user already exists.");
    }
  } catch (error) {
    logger.error("Error creating admin user:", error);
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

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

if (process.env.NODE_ENV === "local") {
  startServer(); // Start the server locally
} else {
  const app = require("./src/index"); // Import your Express app
  connectToDatabase();
  module.exports.handler = serverless(app); // Wrap the express app with serverless-http
}
