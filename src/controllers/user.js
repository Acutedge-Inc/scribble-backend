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

const listClinician = async (req, res) => {
  try {
    const connection = await getTenantDB(req.tenantDb);
    const Clinician_InfoModel = Clinician_Info(connection);

    let { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);

    const clinicians = await Clinician_InfoModel.aggregate([
      { $match: query }, // Apply filters to Clinician_Info
      {
        $lookup: {
          from: "users", // Users collection name
          localField: "userId", // Field in Clinician_Info
          foreignField: "_id", // Field in Users
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          clinicianId: 1,
          staffId: "$clinicianNo",
          firstName: 1,
          lastName: 1,
          email: 1,
          phone: 1,
          discipline: 1,
          dob: 1,
          address1: 1,
          address2: 1,
          city: 1,
          state: 1,
          zip: 1,
          primaryPhone: 1,
          gender: 1,
          status: 1,
          jobTitle: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: 1,
          lastLoginTime: "$userDetails.lastLoginTime",
          email: "$userDetails.email",
        },
      },
      { $skip: parsedOffset },
      { $limit: parsedLimit },
    ]);

    const totalCount = await Clinician_InfoModel.countDocuments(query);

    return res.status(200).json(new SuccessResponse(clinicians, totalCount));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const listClient = async (req, res) => {
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
  listClient,
  listClinician,
};
