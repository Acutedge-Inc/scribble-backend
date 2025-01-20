#!/usr/bin/env node

// Set time zone to UTC
process.env.TZ = "UTC";

const http = require("http");
const nconf = require("nconf");
require("dotenv").config();
const mongoose = require("mongoose");
const db = require("./src/models");
const serverless = require("serverless-http");

nconf
  .use("memory")
  .env({ parseValues: true })
  .file({ file: "./src/config.json" });

async function connectToDatabase() {
  try {
    await db.init(process.env.MONGO_URI,{
      useNewUrlParser: true,
      useUnifiedTopology: true,
      poolSize: 10, 
    }); // Initialize the database connection
    console.log("Database connected successfully.");
  } catch (err) {
    console.error("Error on MongoDB Connection ::", err);
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
    console.info(`Server listening on ${bind}`);
  });

  server.listen(port); // Start listening on the specified port

  const shutdown = () => {
    console.error("Received kill signal, shutting down gracefully");
    server.close(() => {
      console.error("Closed out remaining connections");
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
