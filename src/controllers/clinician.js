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

const processRecording = async (req, res) => {
  try {
    const connection = await getTenantDB(req.tenantDb);
    const Client_InfoModel = Client_Info(connection);
    let { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);
    let client = await Client_InfoModel.find(query)
      .limit(parsedLimit)
      .skip(parsedOffset);
    const totalCount = await Client_InfoModel.countDocuments(query);

    return res.status(201).json(new SuccessResponse(client, totalCount));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

module.exports = {
  processRecording,
};
