// migration.js
const migrateMongo = require("migrate-mongo");

async function runMigrations() {
  try {
    // Connect to MongoDB using migrate-mongo's configuration
    const mongoConfig = require("./migrate-mongo-config");

    const db = await migrateMongo.connect(mongoConfig.mongodb);
    // Run all pending migrations
    const result = await migrateMongo.up(db);

    console.log("Migrations executed successfully:", result);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await migrateMongo.disconnect();
  }
}

runMigrations();
