const jwt = require("jsonwebtoken");
const AdminUser = require("../model/scribble-admin/adminUser.js");
const Tenant = require("../model/scribble-admin/tenants.js");
const fs = require("fs");
const path = require("path");

const { getTenantDB } = require("../lib/dbManager.js");
const {
  generateRandomPassword,
  generateHashedPassword,
} = require("../lib/utils.js");
const { sendAccountVerificationEmail } = require("../lib/emails.js");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const tenantModels = require("../model/tenant/index.js");
const Clinician_Info = require("../model/tenant/clinicianInfo.js");
const Client_Info = require("../model/tenant/clientInfo.js");
const Episode = require("../model/tenant/episode.js");
const Form_Type = require("../model/tenant/formType.js");
const Form = require("../model/tenant/form.js");
const Assessment = require("../model/tenant/assessment.js");

const { createFolder } = require("../lib/aws.js");
require("dotenv").config();
const {
  responses: { SuccessResponse, HTTPError, ERROR_CODES },
  logger,
  tokens,
} = require("../lib/index.js");
const { ErrorResponse } = require("../lib/responses.js");
const clinicianInfo = require("../model/tenant/clinicianInfo.js");
const assessment = require("../model/tenant/assessment.js");

const listEpisode = async (req, res) => {
  return res.status(404).json(new SuccessResponse("Needs to be developed"));
};

const listClient = async (req, res) => {
  try {
    const connection = await getTenantDB(req.tenantDb);
    const Client_InfoModel = Client_Info(connection);
    let client = await Client_InfoModel.find({});
    return res.status(201).json(new SuccessResponse(client));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

module.exports = {
  listClient,
};
