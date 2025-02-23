const mongoose = require("mongoose");
const Role = require("../model/tenant/role");
const Assessment_Type = require("../model/tenant/assessmentType");
const Grid = require("../model/tenant/grid");
const View_Setting = require("../model/tenant/viewSetting");
const RoleData = require("./default/role");
const AssessmentTypeData = require("./default/assessmentType");
let GridSettingData = require("./default/grid");
const { indexOf } = require("lodash");
const { ErrorResponse } = require("../lib/responses");
const { logger } = require("../lib");

const connections = {}; // Store tenant connections

const seedTenantData = async (connection) => {
  try {
    logger.info("Seeding tenant data...");

    // Get model instances from the provided connection
    const RoleModel = Role(connection);
    const AssessmentTypeModel = Assessment_Type(connection);
    const GridModel = Grid(connection);
    const ViewSettingModel = View_Setting(connection);

    await RoleModel.create(RoleData);
    await AssessmentTypeModel.create(AssessmentTypeData);
    const grid = await GridModel.create(GridSettingData);

    GridSettingData = await Promise.all(
      GridSettingData.map(async (element) => {
        element.viewJson = JSON.stringify(element.viewJson);
        element.gridId =
          grid.find((item) => item.gridName === element.gridName)?.id || null;
        return element;
      }),
    );

    await ViewSettingModel.create(GridSettingData);

    logger.info("Seeding completed successfully!");
  } catch (error) {
    logger.error("Seeding failed:" + error.message);
    throw error;
  }
};

module.exports = seedTenantData;
