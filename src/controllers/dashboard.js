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
const Visit = require("../model/tenant/visit.js");
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

const adminKpis = async (req, res) => {
  try {
    const connection = await getTenantDB(req.tenantDb);
    const Client_InfoModel = Client_Info(connection);
    const Clinician_InfoModel = Clinician_Info(connection);
    const FormModel = Form(connection);
    const VisitModel = Visit(connection);
    const EpisodeModel = Episode(connection);

    const result = {
      client: await Client_InfoModel.countDocuments(),
      activeClinician: await Clinician_InfoModel.countDocuments({
        status: "Active",
      }),
      inActiveClinician: await Clinician_InfoModel.countDocuments({
        status: "Inactive",
      }),
      clinician: await Clinician_InfoModel.countDocuments(),
      form: await FormModel.countDocuments(),
      visit: await VisitModel.countDocuments(),
      visit: await EpisodeModel.countDocuments(),
    };

    return res.status(201).json(new SuccessResponse(result));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

module.exports = {
  adminKpis,
};
