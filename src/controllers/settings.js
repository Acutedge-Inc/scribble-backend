const jwt = require("jsonwebtoken");
const AdminUser = require("../model/scribble-admin/adminUser.js");
const Tenant = require("../model/scribble-admin/tenants.js");
const fs = require("fs");
const path = require("path");

const { getTenantDB } = require("../lib/dbManager.js");
const { getFilterQuery } = require("../lib/utils.js");

const { sendAccountVerificationEmail } = require("../lib/emails.js");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const tenantModels = require("../model/tenant/index.js");
const User = require("../model/tenant/user.js");
const Form = require("../model/tenant/form.js");
const View_Setting = require("../model/tenant/viewSetting.js");
const Grid = require("../model/tenant/grid.js");

const { createFolder } = require("../lib/aws.js");
require("dotenv").config();
const {
  responses: { SuccessResponse, HTTPError, ERROR_CODES },
  logger,
  tokens,
} = require("../lib/index.js");
const { ErrorResponse } = require("../lib/responses.js");
const clinicianInfo = require("../model/tenant/clinicianInfo.js");

const getUserSettings = async (req, res) => {
  logger.debug("Getting user settings");
  const connection = await getTenantDB(req.tenantDb);
  logger.debug(`Connected to tenant database: ${req.tenantDb}`);
  const FormModel = Form(connection);

  logger.debug("Fetching assessment types");
  const assessmentTypes = await FormModel.find();
  logger.debug(`Found ${assessmentTypes.length} assessment types`);

  return res.status(404).json(new SuccessResponse(assessmentTypes));
};

const updateUserSettings = async (req, res) => {
  logger.debug("Update user settings called - not yet implemented");
  return res.status(404).json(new SuccessResponse("Needs to be developed"));
};

const getGridViewSettings = async (req, res) => {
  logger.debug("Getting grid view settings");
  const { gridName } = req.query;
  logger.debug(`Grid name: ${gridName}`);

  try {
    const connection = await getTenantDB(req.tenantDb);
    logger.debug(`Connected to tenant database: ${req.tenantDb}`);
    const GridModel = Grid(connection);
    const View_SettingModel = View_Setting(connection);

    logger.debug(`Looking up grid with name: ${gridName}`);
    const grid = await GridModel.findOne({ gridName });
    if (!grid) {
      logger.debug("Grid not found");
      return res.status(500).json(new ErrorResponse("Grid not found"));
    }
    logger.debug(`Found grid with ID: ${grid._id}`);

    logger.debug(`Looking up view settings for grid: ${grid._id}`);
    const viewSetting = await View_SettingModel.findOne({
      gridId: grid._id,
    }).select("viewJson");
    if (!viewSetting) {
      logger.debug("View setting not found");
      throw new Error("View setting not found");
    }
    logger.debug("Found view settings");

    return res
      .status(202)
      .json(new SuccessResponse(JSON.parse(viewSetting.viewJson)));
  } catch (error) {
    logger.error(`Error getting grid view settings: ${error.message}`);
    return res.status(500).json(new ErrorResponse(error));
  }
};

const updateGridViewSettings = async (req, res) => {
  logger.debug("Updating grid view settings");
  try {
    const { gridName, viewJson } = req.body;
    logger.debug(`Grid name: ${gridName}`);

    const connection = await getTenantDB(req.tenantDb);
    logger.debug(`Connected to tenant database: ${req.tenantDb}`);
    const GridModel = Grid(connection);
    const View_SettingModel = View_Setting(connection);

    logger.debug(`Looking up grid with name: ${gridName}`);
    const grid = await GridModel.findOne({ gridName });
    if (!grid) {
      logger.debug("Grid not found");
      return res.status(500).json(new ErrorResponse("Grid not found"));
    }
    logger.debug(`Found grid with ID: ${grid._id}`);

    logger.debug(`Looking up view settings for grid: ${grid._id}`);
    const viewSetting = await View_SettingModel.findOne({
      gridId: grid._id,
    });
    if (!viewSetting) {
      logger.debug("View setting not found");
      return res.status(500).json(new ErrorResponse("View setting not found"));
    }
    logger.debug(`Found view setting with ID: ${viewSetting._id}`);

    logger.debug("Updating view settings");
    await View_SettingModel.updateOne(
      { _id: viewSetting._id },
      { $set: { viewJson: JSON.stringify(viewJson) } }
    );
    logger.debug("View settings updated successfully");

    return res.status(200).json(new SuccessResponse("View setting updated"));
  } catch (error) {
    logger.error(`Error updating grid view settings: ${error.message}`);
    return res.status(500).json(new ErrorResponse(error));
  }
};

module.exports = {
  getUserSettings,
  updateUserSettings,
  getGridViewSettings,
  updateGridViewSettings,
};
