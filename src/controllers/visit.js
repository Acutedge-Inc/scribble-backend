const jwt = require("jsonwebtoken");
const AdminUser = require("../model/scribble-admin/adminUser.js");
const Tenant = require("../model/scribble-admin/tenants.js");
const fs = require("fs");
const path = require("path");

const { getTenantDB } = require("../lib/dbManager.js");
const { getFilterQuery, sendMessageToUIPath } = require("../lib/utils.js");

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
const Notification = require("../model/tenant/notification.js");
const NotificationType = require("../model/tenant/notificationType.js");
const FormTemplate = require("../model/tenant/assessmentFormTemplate.js");

const {
  pushToQueue,
  deleteMessageFromQueue,
  downloadFile,
} = require("../lib/aws.js");
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
  const { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);

  const assessmentTypes = await Form_TypeModel.find(query)
    .limit(parsedLimit)
    .skip(parsedOffset);

  const totalCount = await Form_TypeModel.countDocuments(query);

  return res.status(201).json(new SuccessResponse(assessmentTypes, totalCount));
};

const listEpisode = async (req, res) => {
  try {
    const connection = await getTenantDB(req.tenantDb);
    const EpisodeModel = Episode(connection);
    const { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);
    const episode = await EpisodeModel.find(query)
      .limit(parsedLimit)
      .skip(parsedOffset);
    const totalCount = await EpisodeModel.countDocuments(query);
    return res.status(201).json(new SuccessResponse(episode, totalCount));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const listVisit = async (req, res) => {
  try {
    const connection = await getTenantDB(req.tenantDb);
    const VisitModel = Visit(connection);
    const clinicianId = req.user.id;
    const { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);
    query.clinicianId = new mongoose.Types.ObjectId(clinicianId);

    const visit = await VisitModel.aggregate([
      { $match: query },

      // 🔹 Join with episodes table
      {
        $lookup: {
          from: "episodes",
          localField: "episodeId",
          foreignField: "_id",
          as: "episode",
        },
      },
      { $unwind: { path: "$episode", preserveNullAndEmptyArrays: true } },

      // 🔹 Join with client_infos table
      {
        $lookup: {
          from: "client_infos",
          localField: "clientId",
          foreignField: "_id",
          as: "client",
        },
      },
      { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },

      // 🔹 Join with users table to get clinician details
      {
        $lookup: {
          from: "users",
          localField: "clinicianId",
          foreignField: "_id",
          as: "clinician",
        },
      },
      { $unwind: { path: "$clinician", preserveNullAndEmptyArrays: true } },

      // 🔹 Join with clinician_infos table to get clinician name
      {
        $lookup: {
          from: "clinician_infos",
          localField: "clinician._id",
          foreignField: "userId",
          as: "clinicianInfo",
        },
      },
      { $unwind: { path: "$clinicianInfo", preserveNullAndEmptyArrays: true } },

      // 🔹 Project only necessary fields
      {
        $project: {
          _id: 1,
          visitNo: 1,
          visitDate: 1,
          week: 1,
          visitType: 1,
          service: 1,
          serviceCode: 1,
          status: "InProgress",
          createdAt: 1,
          updatedAt: 1,
          episodeId: "$episode._id",
          episodeNo: "$episode.episodeNo",
          episodeStartDate: "$episode.startDate",
          episodeEndDate: "$episode.endDate",
          episodeDuration: "$episode.episodeDuration",
          clientId: "$client._id",
          clientFirstName: "$client.firstName",
          clientLastName: "$client.lastName",
          clientStaffNo: "$client.clientNo",
          clientDob: "$client.dob",
          clientAge: "$client.age",
          clinicianId: "$clinician._id",
          clinicianEmail: "$clinician.email",
          clinicianFirstName: "$clinicianInfo.firstName",
          clinicianLastName: "$clinicianInfo.lastName",
        },
      },

      { $skip: parsedOffset },
      { $limit: parsedLimit },
    ]);

    const totalCount = await VisitModel.countDocuments(query);
    return res.status(201).json(new SuccessResponse(visit, totalCount));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const listAssessment = async (req, res) => {
  try {
    const connection = await getTenantDB(req.tenantDb);
    const { visitId, ...restQuery } = req.query;
    const AssessmentModel = Assessment(connection);
    const { query, parsedLimit, parsedOffset } = getFilterQuery(restQuery);
    query.visitId = new mongoose.Types.ObjectId(visitId);

    const assessment = await AssessmentModel.find(query)
      .limit(parsedLimit)
      .skip(parsedOffset);
    const totalCount = await AssessmentModel.countDocuments(query);
    return res.status(201).json(new SuccessResponse(assessment, totalCount));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { connection, session } = await startDatabaseSession(req.tenantDb);
    const AssessmentModel = Assessment(connection);
    const assessment = await AssessmentModel.findById(id);
    return res.status(200).json(new SuccessResponse(assessment));
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
    await createNotification(
      clinician.userId,
      `New visit created for client ${client.firstName} ${client.lastName}`,
      "Visit Created",
      connection,
      session
    );
    await session.commitTransaction();
    return res.status(201).json(new SuccessResponse(visit));
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json(new ErrorResponse(error.message));
  } finally {
    session.endSession();
  }
};

const createVisitFromRPA = async (err, data) => {
  let msg;

  try {
    if (err) {
      logger.error(`message container error: ${err.toString()}`);
      return {
        msgStatus: false,
        reason: `message contains error: ${err.toString()}`,
      };
    }
    if (data) {
      msg = JSON.parse(data.Body);
      logger.debug(`Create Visit message body: ${data.Body}`);
      if (!msg) {
        logger.debug(
          "Something wrong happened during verification. Most probably object does not exist."
        );
        throw new Error(
          "Something wrong happened during verification. Most probably object does not exist."
        );
      }
    }
    const { connection, session } = await startDatabaseSession(msg.tenantDb);

    try {
      const requestData = extractRequestData(msg.body);

      const clinician = await getOrUpdateClinician(
        requestData,
        connection,
        session
      );
      if (!clinician) throw new Error("Clinician not found");

      const episode = await getOrCreateEpisode(
        requestData,
        connection,
        session
      );
      const client = await getOrUpdateClient(requestData, connection, session);

      const visit = await createVisitRecord(
        requestData,
        clinician.userId,
        episode._id,
        client._id,
        connection,
        session
      );
      if (!visit) throw new Error("Visit already exists");

      const form = await getOrCreateForm(connection, session);
      await createAssessment(form.id, visit.id, connection, session);
      await createNotification(
        clinician.userId,
        `New visit created for client ${client.firstName} ${client.lastName}`,
        "New Visits",
        connection,
        session
      );
      await session.commitTransaction();
      return { msgStatus: true, reason: "Visit created successfully" };
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error(`message container error: ${error.toString()}`);
    await pushToQueue(process.env.RPA_DATA_QUEUE_DLQ, {
      msgStatus: false,
      reason: error.message,
      tenantDb: msg.tenantDb,
      body: msg.body,
    });
    await deleteMessageFromQueue(process.env.RPA_DATA_QUEUE, data);
    return { msgStatus: false, reason: error.message };
  } finally {
    await deleteMessageFromQueue(process.env.RPA_DATA_QUEUE, data);
  }
};

const createNotification = async (
  clinicianId,
  content,
  type,
  connection,
  session
) => {
  const NotificationTypeModel = NotificationType(connection);
  const notificationType = await NotificationTypeModel.findOne({
    name: type,
  });
  const NotificationModel = Notification(connection);
  await NotificationModel.create(
    [
      {
        userId: clinicianId,
        notificationTypeId: notificationType._id,
        notificationContent: content,
      },
    ],
    { session }
  );
};

/** Extract request data from req.body */
const extractRequestData = (body) => ({
  clinicianNo: body["Clinician ID"],
  clinicianFirstName: body["Clinician First Name"],
  clinicianLastName: body["Clinician Last Name"],
  clinicianDOB: body["Clinician Date of Birth"],
  clinicianDiscipline: body["Clinician Discipline"],
  clinicianAge: body["Clinician Age"],
  clinicianGender: body["Clinician Gender"],
  clinicianStatus: body["Clinician Status"],
  clinicianState: body["Clinician State"],
  clinicianCity: body["Clinician City"],
  clinicianCounty: body["Clinician County"],
  clinicianAddress1: body["Clinician Address 1"],
  clinicianAddress2: body["Clinician Address 2"],
  clinicianZip: body["Clinician Zip"],
  clinicianPrimaryPhone: body["Clinician Cell"],
  clinicianOfficialMailId: body["Clinician Official Email ID"],
  clinicianSSN: body["Clinician SSN"],
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
  emergencyContact: body["Client Emergency Contact"],
  emergencyContactNo: body["Client Emergency Contact #"],
  visitNo: body["Visit ID"],
  visitDate: body["Visit Date"],
  week: body.Week,
  visitType: body["Visit Type"],
  service: body.Service,
  serviceCode: body["Service Code"],
});

/** Get or update the clinician record */
const getOrUpdateClinician = async (data, connection, session) => {
  const Clinician_InfoModel = Clinician_Info(connection);
  const query = Clinician_InfoModel.findOne({
    clinicianNo: data.clinicianNo.toString(),
  }).session(session);
  console.log("Executing Query:", query.getFilter()); // Print the query

  const clinician = await query;
  if (!clinician) return null;

  return await Clinician_InfoModel.findOneAndUpdate(
    { clinicianNo: data.clinicianNo.toString() },
    {
      firstName: data.clinicianFirstName,
      lastName: data.clinicianLastName,
      status: data.clinicianStatus,
      discipline: data.clinicianDiscipline,
      age: data.clinicianAge,
      gender: data.clinicianGender,
      dob: data.clinicianDOB,
      address1: data.clinicianAddress1,
      address2: data.clinicianAddress2,
      city: data.clinicianCity,
      state: data.clinicianState,
      zip: data.clinicianZip,
      primaryPhone: data.clinicianPrimaryPhone,
      secondaryPhone: data.clinicianSecondaryPhone,
      county: data.clinicianCounty,
      ssn: data.clinicianSSN,
      officialMailId: data.clinicianOfficialMailId,
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
          emergencyContact: data.emergencyContact,
          emergencyContactNo: data.emergencyContactNo,
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
      emergencyContact: data.emergencyContact,
      emergencyContactNo: data.emergencyContactNo,
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

  const visit = await VisitModel.create(
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

  const formType = await Form_TypeModel.findOne({
    formName: "Start of Care",
  }).session(session);
  if (!formType) throw new Error("Form type not found");

  const FormTemplateModel = FormTemplate(connection);
  const formTemplate = await FormTemplateModel.findOne({
    name: "Start of Care",
  }).session(session);
  if (!formTemplate) throw new Error("Form template not found");

  let form = await FormModel.findOne({ formId: formType.id }).session(session);
  if (!form) {
    form = await FormModel.create(
      [{ formTypeId: formType.id, questionForm: formTemplate.formTemplate }],
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

const updateVisit = async (req, res) => {
  const { connection, session } = await startDatabaseSession(req.tenantDb);
  const VisitModel = Visit(connection);
  const visit = await VisitModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  return res.status(200).json(new SuccessResponse(visit));
};

const updateAssessment = async (req, res) => {
  const { connection, session } = await startDatabaseSession(req.tenantDb);
  const AssessmentModel = Assessment(connection);

  if (req.body.answer) {
    await sendMessageToUIPath(req.body);
    req.body.status = "Submitted to EMR";
  }
  const assessment = await AssessmentModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
    }
  );
  return res.status(200).json(new SuccessResponse(assessment));
};

const processAIOutput = async (err, data) => {
  let msg;

  try {
    if (err) {
      logger.error(`message container error: ${err.toString()}`);
      return {
        msgStatus: false,
        reason: `message contains error: ${err.toString()}`,
      };
    }
    if (data) {
      msg = JSON.parse(data.Body);
      logger.debug(`AI Output message body: ${data.Body}`);
    }

    const { connection, session } = await startDatabaseSession(msg.company_id);
    let jsonContent;
    try {
      const s3Response = await downloadFile(msg.bucketName, msg.answerPath);
      // Convert S3 response buffer to string and store JSON content
      const responseBuffer = s3Response.Body;
      if (!(responseBuffer instanceof Buffer)) {
        throw new Error("S3 response body is not a buffer");
      }
      jsonContent = responseBuffer.toString("utf-8");
      msg.aiOutput = JSON.parse(jsonContent);
    } catch (error) {
      logger.error(`Error downloading from S3: ${error.toString()}`);
      throw error;
    }

    const AssessmentModel = Assessment(connection);
    const VisitModel = Visit(connection);
    const assessment = await AssessmentModel.findByIdAndUpdate(
      msg.assessmentId,
      {
        $set: {
          assessmentAnswer: jsonContent,
          status: "Validation",
        },
      }
    );
  } catch (error) {
    logger.error(`message container error: ${error.toString()}`);
    await pushToQueue(process.env.AI_OUTPUT_DLQ_QUEUE_URL, {
      msgStatus: false,
      reason: error.message,
      body: data.Body,
    });
    return { msgStatus: false, reason: error.message };
  } finally {
    await deleteMessageFromQueue(process.env.AI_OUTPUT_QUEUE_URL, data);
  }
};

const updateAssessmentFromRPA = async (err, data) => {
  let msg;

  try {
    if (err) {
      logger.error(`message container error: ${err.toString()}`);
      return {
        msgStatus: false,
        reason: `message contains error: ${err.toString()}`,
      };
    }
    if (data) {
      msg = JSON.parse(data.Body);
      logger.debug(`Update Assessment message body: ${data.Body}`);
    }

    const { connection, session } = await startDatabaseSession(msg.tenantDb);
    const AssessmentModel = Assessment(connection);
    const assessment = await AssessmentModel.findByIdAndUpdate(
      msg.assessmentId,
      { status: "Completed" },
      {
        new: true,
      }
    );
    const assessments = await AssessmentModel.find({ visitId: msg.visitId });
    const allSubmittedToEMR = assessments.every(
      (a) => a.status === "Submitted to EMR"
    );
    const allCompleted = assessments.every((a) => a.status === "Completed");

    logger.debug(`allSubmittedToEMR: ${allSubmittedToEMR}`);
    logger.debug(`allCompleted: ${allCompleted}`);

    if (allCompleted) {
      await VisitModel.findByIdAndUpdate(msg.visitId, {
        status: "Completed",
      });
    } else if (allSubmittedToEMR) {
      await VisitModel.findByIdAndUpdate(msg.visitId, {
        status: "Submitted",
      });
    }

    return res.status(200).json(new SuccessResponse(assessment));
  } catch (error) {
    logger.error(`message container error: ${error.toString()}`);
    await pushToQueue(process.env.RPA_UPDATE_DLQ_QUEUE_URL, {
      msgStatus: false,
      reason: error.message,
      body: data.Body,
    });
    return { msgStatus: false, reason: error.message };
  } finally {
    await deleteMessageFromQueue(process.env.RPA_UPDATE_QUEUE_URL, data);
  }
};

const getForm = async (req, res) => {
  const { connection, session } = await startDatabaseSession(req.tenantDb);
  const FormModel = Form(connection);
  const form = await FormModel.findById(req.params.id).populate({
    path: "formTypeId",
    model: Form_Type,
  });
  if (!form) return res.status(404).json(new ErrorResponse("Form not found"));
  form.formName = form.formTypeId.formName;
  form.questionForm = JSON.parse(form.questionForm);
  return res.status(200).json(new SuccessResponse(form));
};

const updateForm = async (req, res) => {
  const { connection, session } = await startDatabaseSession(req.tenantDb);
  const FormModel = Form(connection);
  const form = await FormModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  return res.status(200).json(new SuccessResponse(form));
};
module.exports = {
  createForm,
  createVisit,
  formTypes,
  listVisit,
  listEpisode,
  listAssessment,
  createVisitFromRPA,
  updateVisit,
  updateAssessment,
  getAssessmentById,
  processAIOutput,
  updateAssessmentFromRPA,
  getForm,
  updateForm,
};
