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
const Visit = require("../model/tenant/visit.js");
const Form_Type = require("../model/tenant/formType.js");
const Form = require("../model/tenant/form.js");

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

const formTypes = async (req, res) => {
  const connection = await getTenantDB(req.tenantDb);
  const Form_TypeModel = Form_Type(connection);

  const assessmentTypes = await Form_TypeModel.find();

  return res.status(404).json(new SuccessResponse(assessmentTypes));
};

const listEpisode = async (req, res) => {
  return res.status(404).json(new SuccessResponse("Needs to be developed"));
};

const listVisit = async (req, res) => {
  return res.status(404).json(new SuccessResponse("Needs to be developed"));
};

const createVisit = async (req, res) => {
  try {
    const {
      "Clinician ID": clinicianNo,
      "Clinician First Name": clinicianFirstName,
      "Clinician Last Name": clinicianLastName,
      "Clinician Date of Birth": clinicianDOB,
      "Clinician Discipline": clinicianDiscipline,
      "Clinician Age": clinicianAge,
      "Clinician Status": clinicianStatus,
      "Clinician State": clinicianState,
      "Clinician City": clinicianCity,
      "Clinician Address 1": clinicianAddress1,
      "Clinician Address 2": clinicianAddress2,
      "Clinician Zip": clinicianZip,
      "Clinician Cell": clinicianPrimaryPhone,
      "Episode Number": episodeNo,
      "Episode Duration": episodeDuration,
      "Episode Start Date": startDate,
      "Episode End Date": endDate,
      "Client ID": clientNo,
      "Client Group ID": clientGroupId,
      "Client First Name": firstName,
      "Client Last Name": lastName,
      "Client DOB": dob,
      "Client Age": age,
      "Client State": state,
      "Client City": city,
      "Client Address 1": address1,
      "Client Address 2": address2,
      "Client Phone": primaryPhone,
      "Visit ID": visitNo,
      "Visit Date": visitDate,
      Week: week,
      "Visit Type": visitType,
      Service: service,
      "Service Code": serviceCode,
    } = req.body;

    const connection = await getTenantDB(req.tenantDb);
    const Form_TypeModel = Form_Type(connection);

    const Clinician_InfoModel = Clinician_Info(connection);
    const EpisodeModel = Episode(connection);
    const Client_InfoModel = Client_Info(connection);
    const VisitModel = Visit(connection);

    let clinician;

    // Check if clinician exists
    clinician = await Clinician_InfoModel.findOne({
      clinicianNo,
    });

    if (clinician) {
      clinician = await Clinician_InfoModel.findOneAndUpdate(
        { clinicianNo }, // Filter
        {
          firstName: clinicianFirstName,
          lastName: clinicianLastName,
          status: clinicianStatus,
          discipline: clinicianDiscipline,
          age: clinicianAge,
          dob: clinicianDOB,
          address1: clinicianAddress1,
          address2: clinicianAddress2,
          city: clinicianCity,
          state: clinicianState,
          zip: clinicianZip,
          primaryPhone: clinicianPrimaryPhone,
        },
        { new: true, runValidators: true } // Returns updated object
      );
    } else {
      return res.status(404).json(new ErrorResponse("Clinician not found"));
    }

    // Update clinician record (if needed) and get userId
    const clinicianId = clinician.userId;

    // Create episode
    let episode = await EpisodeModel.findOne({
      episodeNo,
    });
    if (!episode) {
      episode = await EpisodeModel.create({
        episodeNo,
        episodeDuration,
        startDate,
        endDate,
      });
    }

    // Create client info
    let client = await Client_InfoModel.findOne({
      clientNo,
    });
    if (client) {
      client = await Client_InfoModel.findOneAndUpdate(
        { clientNo }, // Filter
        {
          clientGroupId,
          firstName,
          lastName,
          dob,
          age,
          state,
          city,
          address1,
          address2,
          primaryPhone,
        },
        { new: true, runValidators: true } // Returns updated object
      );
    } else {
      client = await Client_InfoModel.create({
        clientNo,
        clientGroupId,
        firstName,
        lastName,
        dob,
        age,
        state,
        city,
        address1,
        address2,
        primaryPhone,
      });
    }

    // Create visit record
    let visit = await VisitModel.findOne({
      visitNo,
    });
    if (visit) {
      return res.status(404).json(new ErrorResponse("Visit already exist"));
    } else {
      visit = await VisitModel.create({
        episodeId: episode._id,
        clinicianId,
        clientId: client._id,
        visitNo,
        visitDate,
        week,
        visitType,
        service,
        serviceCode,
      });
    }

    return res.status(201).json(new SuccessResponse(visit));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

module.exports = {
  createForm,
  createVisit,
  formTypes,
};
