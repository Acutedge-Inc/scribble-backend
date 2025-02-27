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
const Role = require("../model/tenant/role.js");
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

//UserAdmin create a form
const createForm = async (req, res) => {
  const { formTypeId, form } = req.body;
  const connection = await getTenantDB(req.tenantDb);
  const FormModel = Form(connection);

  let assessmentForm = await FormModel.find({
    assessmentTypeId: formTypeId,
  });
  if (assessmentForm.length) {
    return res
      .status(401)
      .json(new ErrorResponse("Assessment Form already available"));
  }
  assessmentForm = await FormModel.create({
    assessmentTypeId: formTypeId,
    questionForm: JSON.stringify(form),
  });
  return res.status(404).json(new SuccessResponse(assessmentForm));
};

const getUserSettings = async (req, res) => {
  const connection = await getTenantDB(req.tenantDb);
  const Form_TypeModel = Form_Type(connection);

  const assessmentTypes = await Form_TypeModel.find();

  return res.status(404).json(new SuccessResponse(assessmentTypes));
};

const updateUserSettings = async (req, res) => {
  return res.status(404).json(new SuccessResponse("Needs to be developed"));
};

const getGridViewSettings = async (req, res) => {
  const { gridName } = req.query;
  try {
    const connection = await getTenantDB(req.tenantDb);
    const GridModel = Grid(connection);
    const View_SettingModel = View_Setting(connection);

    const grid = await GridModel.findOne({ gridName });
    if (!grid) {
      return res.status(500).json(new ErrorResponse("Grid not found"));
    }

    const viewSetting = await View_SettingModel.findOne({
      gridId: grid._id,
    }).select("viewJson");
    if (!viewSetting) {
      throw new Error("View setting not found");
    }

    return res
      .status(202)
      .json(new SuccessResponse(JSON.parse(viewSetting.viewJson)));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error));
  }
};

const updateGridViewSettings = async (req, res) => {
  try {
    const { gridName, viewJson } = req.body;
    const connection = await getTenantDB(req.tenantDb);
    const GridModel = Grid(connection);
    const View_SettingModel = View_Setting(connection);

    const grid = await GridModel.findOne({ gridName });
    if (!grid) {
      return res.status(500).json(new ErrorResponse("Grid not found"));
    }

    const viewSetting = await View_SettingModel.findOne({
      gridId: grid._id,
    });
    if (!viewSetting) {
      return res.status(500).json(new ErrorResponse("View setting not found"));
    }

    await View_SettingModel.updateOne(
      { _id: viewSetting._id },
      { $set: { viewJson: JSON.stringify(viewJson) } }
    );

    return res.status(200).json(new SuccessResponse("View setting updated"));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error));
  }
};

module.exports = {
  getUserSettings,
  updateUserSettings,
  getGridViewSettings,
  updateGridViewSettings,
};
