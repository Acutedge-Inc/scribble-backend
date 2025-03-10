const mongoose = require("mongoose");
const Role = require("../model/tenant/role");
const Form_Type = require("./tenant/formType");
const Grid = require("../model/tenant/grid");
const View_Setting = require("../model/tenant/viewSetting");
const NotificationType = require("../model/tenant/notificationType");
const FormTemplate = require("../model/tenant/assessmentFormTemplate");
const RoleData = require("./default/role");
const FormTypeData = require("./default/formType");
let GridSettingData = require("./default/grid");
const NotificationTypeData = require("./default/notificationType");
const FormTemplateData = require("./default/formTemplate");
const { logger } = require("../lib");

const connections = {}; // Store tenant connections

const seedTenantData = async (connection) => {
  try {
    logger.info("Seeding tenant data...");

    // Get model instances from the provided connection
    const RoleModel = Role(connection);
    const FormTypeModel = Form_Type(connection);
    const GridModel = Grid(connection);
    const ViewSettingModel = View_Setting(connection);
    const NotificationTypeModel = NotificationType(connection);
    const FormTemplateModel = FormTemplate(connection);
    await RoleModel.create(RoleData);
    await FormTypeModel.create(FormTypeData);
    const grid = await GridModel.create(GridSettingData);

    GridSettingData = await Promise.all(
      GridSettingData.map(async (element) => {
        element.viewJson = JSON.stringify(element.viewJson);
        element.gridId =
          grid.find((item) => item.gridName === element.gridName)?.id || null;
        return element;
      })
    );

    await ViewSettingModel.create(GridSettingData);
    await NotificationTypeModel.create(NotificationTypeData);
    for (const formTemplate of FormTemplateData) {
      formTemplate.formTemplate = JSON.stringify(formTemplate.formTemplate);
      await FormTemplateModel.create(formTemplate);
    }

    logger.info("Seeding completed successfully!");
    return true;
  } catch (error) {
    logger.error("Seeding failed:" + error.message);
    throw error;
  }
};

module.exports = seedTenantData;
