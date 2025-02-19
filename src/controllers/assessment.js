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
const User = require("../model/tenant/user.js");
const Role = require("../model/tenant/role.js");
const Assessment_Type = require("../model/tenant/assessmentType.js");
const Assessment_Form = require("../model/tenant/assessmentForm.js");

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
  const Assessment_FormModel = Assessment_Form(connection);

  let assessmentForm = await Assessment_FormModel.find({
    assessmentTypeId: formTypeId,
  });
  if (assessmentForm.length) {
    return res
      .status(401)
      .json(new ErrorResponse("Assessment Form already available"));
  }
  assessmentForm = await Assessment_FormModel.create({
    assessmentTypeId: formTypeId,
    questionForm: JSON.stringify(form),
  });
  return res.status(404).json(new SuccessResponse(assessmentForm));
};

const listTypes = async (req, res) => {
  const connection = await getTenantDB(req.tenantDb);
  const Assessment_TypeModel = Assessment_Type(connection);

  const assessmentTypes = await Assessment_TypeModel.find();

  return res.status(404).json(new SuccessResponse(assessmentTypes));
};

const createAssessment = async (req, res) => {};
module.exports = {
  createForm,
  createAssessment,
  listTypes,
};
