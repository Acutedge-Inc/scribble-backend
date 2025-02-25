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
  try {
    const connection = await getTenantDB(req.tenantDb);
    const EpisodeModel = Episode(connection);
    let episode = await EpisodeModel.find({});
    return res.status(201).json(new SuccessResponse(episode));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const listVisit = async (req, res) => {
  try {
    const connection = await getTenantDB(req.tenantDb);
    const VisitModel = Visit(connection);
    let visit = await VisitModel.find({});
    return res.status(201).json(new SuccessResponse(visit));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const createVisit = async (req, res) => {
  const { connection, session } = await startDatabaseSession(req.tenantDb);

  try {
    const requestData = extractRequestData(req.body);

    const clinician = await getOrUpdateClinician(
      requestData,
      connection,
      session
    );
    if (!clinician)
      return res.status(404).json(new ErrorResponse("Clinician not found"));

    const episode = await getOrCreateEpisode(requestData, connection, session);
    const client = await getOrUpdateClient(requestData, connection, session);

    const visit = await createVisitRecord(
      requestData,
      clinician.userId,
      episode._id,
      client._id,
      connection,
      session
    );
    if (!visit)
      return res.status(400).json(new ErrorResponse("Visit already exists"));

    const form = await getOrCreateForm(connection, session);
    await createAssessment(form.id, visit.id, connection, session);

    await session.commitTransaction();
    return res.status(201).json(new SuccessResponse(visit));
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json(new ErrorResponse(error.message));
  } finally {
    session.endSession();
  }
};

/** Extract request data from req.body */
const extractRequestData = (body) => ({
  clinicianNo: body["Clinician ID"],
  clinicianFirstName: body["Clinician First Name"],
  clinicianLastName: body["Clinician Last Name"],
  clinicianDOB: body["Clinician Date of Birth"],
  clinicianDiscipline: body["Clinician Discipline"],
  clinicianAge: body["Clinician Age"],
  clinicianStatus: body["Clinician Status"],
  clinicianState: body["Clinician State"],
  clinicianCity: body["Clinician City"],
  clinicianAddress1: body["Clinician Address 1"],
  clinicianAddress2: body["Clinician Address 2"],
  clinicianZip: body["Clinician Zip"],
  clinicianPrimaryPhone: body["Clinician Cell"],
  episodeNo: body["Episode Number"],
  episodeDuration: body["Episode Duration"],
  startDate: body["Episode Start Date"],
  endDate: body["Episode End Date"],
  clientNo: body["Client ID"],
  clientGroupId: body["Client Group ID"],
  firstName: body["Client First Name"],
  lastName: body["Client Last Name"],
  dob: body["Client DOB"],
  age: body["Client Age"],
  state: body["Client State"],
  city: body["Client City"],
  address1: body["Client Address 1"],
  address2: body["Client Address 2"],
  primaryPhone: body["Client Phone"],
  visitNo: body["Visit ID"],
  visitDate: body["Visit Date"],
  week: body["Week"],
  visitType: body["Visit Type"],
  service: body["Service"],
  serviceCode: body["Service Code"],
});

/** Get or update the clinician record */
const getOrUpdateClinician = async (data, connection, session) => {
  const Clinician_InfoModel = Clinician_Info(connection);

  let clinician = await Clinician_InfoModel.findOne({
    clinicianNo: data.clinicianNo,
  }).session(session);
  if (!clinician) return null;

  return await Clinician_InfoModel.findOneAndUpdate(
    { clinicianNo: data.clinicianNo },
    {
      firstName: data.clinicianFirstName,
      lastName: data.clinicianLastName,
      status: data.clinicianStatus,
      discipline: data.clinicianDiscipline,
      age: data.clinicianAge,
      dob: data.clinicianDOB,
      address1: data.clinicianAddress1,
      address2: data.clinicianAddress2,
      city: data.clinicianCity,
      state: data.clinicianState,
      zip: data.clinicianZip,
      primaryPhone: data.clinicianPrimaryPhone,
    },
    { new: true, runValidators: true, session }
  );
};

/** Get or create an episode */
const getOrCreateEpisode = async (data, connection, session) => {
  const EpisodeModel = Episode(connection);

  let episode = await EpisodeModel.findOne({
    episodeNo: data.episodeNo,
  }).session(session);
  if (!episode) {
    episode = await EpisodeModel.create(
      [
        {
          episodeNo: data.episodeNo,
          episodeDuration: data.episodeDuration,
          startDate: data.startDate,
          endDate: data.endDate,
        },
      ],
      { session }
    );
    episode = episode[0];
  }

  return episode;
};

/** Get or update the client record */
const getOrUpdateClient = async (data, connection, session) => {
  const Client_InfoModel = Client_Info(connection);

  let client = await Client_InfoModel.findOne({
    clientNo: data.clientNo,
  }).session(session);
  if (!client) {
    client = await Client_InfoModel.create(
      [
        {
          clientNo: data.clientNo,
          clientGroupId: data.clientGroupId,
          firstName: data.firstName,
          lastName: data.lastName,
          dob: data.dob,
          age: data.age,
          state: data.state,
          city: data.city,
          address1: data.address1,
          address2: data.address2,
          primaryPhone: data.primaryPhone,
        },
      ],
      { session }
    );
    return client[0];
  }

  return await Client_InfoModel.findOneAndUpdate(
    { clientNo: data.clientNo },
    {
      clientGroupId: data.clientGroupId,
      firstName: data.firstName,
      lastName: data.lastName,
      dob: data.dob,
      age: data.age,
      state: data.state,
      city: data.city,
      address1: data.address1,
      address2: data.address2,
      primaryPhone: data.primaryPhone,
    },
    { new: true, runValidators: true, session }
  );
};

/** Create a new visit record */
const createVisitRecord = async (
  data,
  clinicianId,
  episodeId,
  clientId,
  connection,
  session
) => {
  const VisitModel = Visit(connection);

  const existingVisit = await VisitModel.findOne({
    visitNo: data.visitNo,
  }).session(session);
  if (existingVisit) return existingVisit;

  let visit = await VisitModel.create(
    [
      {
        episodeId,
        clinicianId,
        clientId,
        visitNo: data.visitNo,
        visitDate: data.visitDate,
        week: data.week,
        visitType: data.visitType,
        service: data.service,
        serviceCode: data.serviceCode,
      },
    ],
    { session }
  );
  return visit[0];
};

/** Get or create a form */
const getOrCreateForm = async (connection, session) => {
  const Form_TypeModel = Form_Type(connection);
  const FormModel = Form(connection);

  let formType = await Form_TypeModel.findOne({
    formName: "Start of Care",
  }).session(session);
  if (!formType) throw new Error("Form type not found");

  let form = await FormModel.findOne({ formId: formType.id }).session(session);
  if (!form) {
    form = await FormModel.create(
      [{ formTypeId: formType.id, questionForm: "hello" }],
      { session }
    );
    form = form[0];
  }

  return form;
};

/** Create an assessment record */
const createAssessment = async (formId, visitId, connection, session) => {
  const AssessmentModel = Assessment(connection);

  await AssessmentModel.create([{ formId, visitId }], { session });
};

/** Start a database session and return connection + session */
const startDatabaseSession = async (tenantDb) => {
  const connection = await getTenantDB(tenantDb);
  const session = await connection.startSession();
  session.startTransaction();
  return { connection, session };
};

module.exports = {
  createForm,
  createVisit,
  formTypes,
  listVisit,
  listEpisode,
};
