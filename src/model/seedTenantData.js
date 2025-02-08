const mongoose = require("mongoose");
const Role = require("../model/tenant/role");
const Assessment_Type = require("../model/tenant/assessmentType");
const RoleData = require("./default/role");
const AssessmentTypeData = require("./default/assessmentType");

const connections = {}; // Store tenant connections

const seedTenantData = async (connection) => {
  try {
    console.info("Seeding tenant data...");

    // Get model instances from the provided connection
    const RoleModel = Role(connection);
    const AssessmentTypeModel = Assessment_Type(connection);

    await RoleModel.create(RoleData);
    await AssessmentTypeModel.create(AssessmentTypeData);

    console.info("Seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error.message);
  }
};

module.exports = seedTenantData;
