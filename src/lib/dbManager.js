const mongoose = require("mongoose");

const connections = {}; // Store tenant connections

const getTenantDB = async (dbName) => {
  if (!connections[dbName]) {
    let dbURI = process.env.MONGO_URI.replace("ADMIN_DB", dbName);
    dbURI = dbURI.replace("<PUBLIC_IP>", process.env.IP);

    connections[dbName] = mongoose.createConnection(dbURI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log(`Connected to TenantDB: ${dbName}`);
  }
  return connections[dbName];
};

module.exports = { getTenantDB };
