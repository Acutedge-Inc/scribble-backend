const jwt = require("jsonwebtoken");
const AdminUser = require("../model/scribble-admin/adminUser.js");
const Tenant = require("../model/scribble-admin/tenants.js");
const fs = require("fs");
const path = require("path");

const { getTenantDB } = require("../lib/dbManager.js");
const {
  getFilterQuery,
  sendMessageToUIPath,
  transformData,
} = require("../lib/utils.js");

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
const Notification = require("../model/tenant/notification.js");
const NotificationType = require("../model/tenant/notificationType.js");
const Form_Template = require("../model/tenant/assessmentFormTemplate.js");
const nconf = require("nconf");
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
  logger.debug(`Creating form with formTypeId: ${req.body.formTypeId}`);
  const { formName, assessmentForm } = req.body;
  const connection = await getTenantDB(req.tenantDb);
  const FormModel = Form(connection);

  let form = await FormModel.find({
    formName,
  });
  logger.debug(`Found existing assessment forms: ${form.length}`);
  if (form.length) {
    return res
      .status(401)
      .json(new ErrorResponse("Assessment Form already available"));
  }
  form = await FormModel.create({
    formName,
    assessmentForm,
  });
  logger.debug(`Created new assessment form with id: ${form._id}`);
  return res.status(404).json(new SuccessResponse(form));
};

const listEpisode = async (req, res) => {
  try {
    logger.debug("Listing episodes");
    const connection = await getTenantDB(req.tenantDb);
    const EpisodeModel = Episode(connection);
    const { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);
    logger.debug(
      `Query params: ${JSON.stringify(query)}, limit: ${parsedLimit}, offset: ${parsedOffset}`
    );

    const episode = await EpisodeModel.find(query)
      .limit(parsedLimit)
      .skip(parsedOffset);
    const totalCount = await EpisodeModel.countDocuments(query);
    logger.debug(`Found ${totalCount} episodes`);

    return res.status(201).json(new SuccessResponse(episode, totalCount));
  } catch (error) {
    logger.error(`Error listing episodes: ${error.message}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const listVisit = async (req, res) => {
  try {
    logger.debug("Listing visits");
    const connection = await getTenantDB(req.tenantDb);
    const VisitModel = Visit(connection);
    const clinicianId = req.user.id;
    if (req.query.status === "To be reviewed") {
      req.query.status = "In Progress";
    }
    if (req.query.status === "Completed") {
      req.query.status = {
        $in: ["Completed", "Submitted"],
      };
    }

    let clientId = "";
    if (req.query.clientId) {
      clientId = req.query.clientId;
      delete req.query.clientId;
    }
    let episodeId = "";
    if (req.query.episodeId) {
      episodeId = req.query.episodeId;
      delete req.query.episodeId;
    }

    const { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);

    if (clientId) {
      query.clientId = new mongoose.Types.ObjectId(clientId);
      query.status = {
        $nin: ["New"],
      };
    } else {
      query.clinicianId = new mongoose.Types.ObjectId(clinicianId);
    }

    if (episodeId) {
      query.episodeId = new mongoose.Types.ObjectId(episodeId);
    }

    logger.debug(
      `Query params: ${JSON.stringify(query)}, limit: ${parsedLimit}, offset: ${parsedOffset}`
    );

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
          status: 1,
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
          clientGender: "$client.gender",
          clientDob: "$client.dob",
          clientAge: "$client.age",
          clientAddress1: "$client.address1",
          clientAddress2: "$client.address2",
          clientCity: "$client.city",
          clientState: "$client.state",
          clientZip: "$client.zip",
          clientCounty: "$client.county",
          clinicianId: "$clinician._id",
          clinicianEmail: "$clinician.email",
          clinicianFirstName: "$clinicianInfo.firstName",
          clinicianLastName: "$clinicianInfo.lastName",
          clinicianGender: "$clinicianInfo.gender",
          clinicianAddress1: "$clinicianInfo.address1",
          clinicianAddress2: "$clinicianInfo.address2",
          clinicianCity: "$clinicianInfo.city",
          clinicianState: "$clinicianInfo.state",
          clinicianZip: "$clinicianInfo.zip",
          clinicianCounty: "$clinicianInfo.county",
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: parsedOffset },
      { $limit: parsedLimit },
    ]);

    const totalCount = await VisitModel.countDocuments(query);
    logger.debug(`Found ${totalCount} visits`);
    return res.status(201).json(new SuccessResponse(visit, totalCount));
  } catch (error) {
    logger.error(`Error listing visits: ${error.message}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const listAssessment = async (req, res) => {
  try {
    logger.debug("Listing assessments");
    const connection = await getTenantDB(req.tenantDb);
    const { visitId, ...restQuery } = req.query;
    const AssessmentModel = Assessment(connection);
    const { query, parsedLimit, parsedOffset } = getFilterQuery(restQuery);
    query.visitId = new mongoose.Types.ObjectId(visitId);
    logger.debug(
      `Query params: ${JSON.stringify(query)}, limit: ${parsedLimit}, offset: ${parsedOffset}`
    );

    const assessment = await AssessmentModel.find(query)
      .limit(parsedLimit)
      .skip(parsedOffset);

    const totalCount = await AssessmentModel.countDocuments(query);
    logger.debug(`Found ${totalCount} assessments`);
    return res.status(201).json(new SuccessResponse(assessment, totalCount));
  } catch (error) {
    logger.error(`Error listing assessments: ${error.message}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const getAssessmentById = async (req, res) => {
  try {
    if (!req.params.id) {
      return res
        .status(500)
        .json(new ErrorResponse("Please specify id in parameter"));
    }
    logger.debug(`Getting assessment by id: ${req.params.id}`);
    const { id } = req.params;
    const { connection, session } = await startDatabaseSession(req.tenantDb);
    const AssessmentModel = Assessment(connection);
    const assessment = await AssessmentModel.findById(id);
    logger.debug(`Found assessment: ${assessment ? "yes" : "no"}`);
    return res.status(200).json(new SuccessResponse(assessment));
  } catch (error) {
    logger.error(`Error getting assessment by id: ${error.message}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const createVisit = async (req, res) => {
  logger.debug("Creating visit");
  const { connection, session } = await startDatabaseSession(req.tenantDb);

  try {
    const requestData = extractRequestData(req.body);
    logger.debug(`Request data: ${JSON.stringify(requestData)}`);

    const clinician = await getOrUpdateClinician(
      requestData,
      connection,
      session
    );
    logger.debug(
      `Found/Updated clinician: ${clinician ? clinician._id : "not found"}`
    );
    if (!clinician)
      return res.status(404).json(new ErrorResponse("Clinician not found"));

    const episode = await getOrCreateEpisode(requestData, connection, session);
    logger.debug(`Found/Created episode: ${episode._id}`);

    const client = await getOrUpdateClient(requestData, connection, session);
    logger.debug(`Found/Updated client: ${client._id}`);

    const visit = await createVisitRecord(
      requestData,
      clinician.userId,
      episode._id,
      client._id,
      connection,
      session
    );
    logger.debug(`Created visit: ${visit ? visit._id : "failed"}`);
    if (!visit)
      return res.status(400).json(new ErrorResponse("Visit already exists"));

    const form = await getOrCreateForm(connection, session);
    logger.debug(`Found/Created form: ${form.id}`);

    await createAssessment(form, visit.id, connection, session);
    logger.debug("Created assessment");

    await createNotification(
      clinician.userId,
      `New visit created for client ${client.firstName} ${client.lastName}`,
      "New Visits",
      connection,
      session
    );
    logger.debug("Created notification");

    await session.commitTransaction();
    logger.debug("Transaction committed successfully");
    return res.status(201).json(new SuccessResponse(visit));
  } catch (error) {
    logger.error(`Error creating visit: ${error.message}`);
    await session.abortTransaction();
    return res.status(500).json(new ErrorResponse(error.message));
  } finally {
    session.endSession();
  }
};

const createVisitFromRPA = async (err, data) => {
  let msg;

  try {
    logger.debug("Creating visit from RPA");
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
      logger.debug(`Request data: ${JSON.stringify(requestData)}`);

      const clinician = await getOrUpdateClinician(
        requestData,
        connection,
        session
      );
      logger.debug(
        `Found/Updated clinician: ${clinician ? clinician._id : "not found"}`
      );
      if (!clinician) throw new Error("Clinician not found");

      const episode = await getOrCreateEpisode(
        requestData,
        connection,
        session
      );
      logger.debug(`Found/Created episode: ${episode._id}`);

      const client = await getOrUpdateClient(requestData, connection, session);
      logger.debug(`Found/Updated client: ${client._id}`);

      const visit = await createVisitRecord(
        requestData,
        clinician.userId,
        episode._id,
        client._id,
        connection,
        session
      );
      logger.debug(`Created visit: ${visit ? visit._id : "failed"}`);
      if (!visit) throw new Error("Visit already exists");

      const form = await getOrCreateForm(connection, session);
      logger.debug(`Found/Created form: ${form.id}`);

      await createAssessment(form, visit.id, connection, session);
      logger.debug("Created assessment");

      await createNotification(
        clinician.userId,
        `New visit created for client ${client.firstName} ${client.lastName}`,
        "New Visits",
        connection,
        session
      );
      logger.debug("Created notification");

      await session.commitTransaction();
      logger.debug("Transaction committed successfully");
      return { msgStatus: true, reason: "Visit created successfully" };
    } catch (error) {
      logger.error(`Error in transaction: ${error.message}`);
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
  logger.debug(
    `Creating notification for clinician ${clinicianId} of type ${type}`
  );
  const NotificationTypeModel = NotificationType(connection);
  const notificationType = await NotificationTypeModel.findOne({
    name: type,
  }).session(session);
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
  logger.debug("Notification created successfully");
};

/** Extract request data from req.body */
const extractRequestData = (body) => {
  logger.debug("Extracting request data from body");
  const data = {
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
  };
  logger.debug("Request data extracted successfully");
  return data;
};

/** Get or update the clinician record */
const getOrUpdateClinician = async (data, connection, session) => {
  logger.debug(`Getting/Updating clinician with number: ${data.clinicianNo}`);
  const Clinician_InfoModel = Clinician_Info(connection);
  const query = Clinician_InfoModel.findOne({
    clinicianNo: data.clinicianNo.toString(),
  }).session(session);
  console.log("Executing Query:", query.getFilter()); // Print the query

  const clinician = await query;
  logger.debug(`Found existing clinician: ${clinician ? "yes" : "no"}`);
  if (!clinician) return null;

  const updatedClinician = await Clinician_InfoModel.findOneAndUpdate(
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
  logger.debug(`Updated clinician: ${updatedClinician._id}`);
  return updatedClinician;
};

/** Get or create an episode */
const getOrCreateEpisode = async (data, connection, session) => {
  logger.debug(`Getting/Creating episode with number: ${data.episodeNo}`);
  const EpisodeModel = Episode(connection);

  let episode = await EpisodeModel.findOne({
    episodeNo: data.episodeNo,
  }).session(session);
  logger.debug(`Found existing episode: ${episode ? "yes" : "no"}`);

  if (!episode) {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
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
        break;
      } catch (error) {
        attempts++;
        logger.error(
          `Error creating episode (attempt ${attempts}): ${error.message}`
        );
        if (attempts >= maxAttempts) {
          throw new Error(
            "Error creating episode: Please retry your operation or multi-document transaction."
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before retrying
      }
    }
    episode = episode[0];
    logger.debug(`Created new episode: ${episode._id}`);
  }

  return episode;
};

/** Get or update the client record */
const getOrUpdateClient = async (data, connection, session) => {
  logger.debug(`Getting/Updating client with number: ${data.clientNo}`);
  const Client_InfoModel = Client_Info(connection);

  let client = await Client_InfoModel.findOne({
    clientNo: data.clientNo,
  }).session(session);
  logger.debug(`Found existing client: ${client ? "yes" : "no"}`);

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
    logger.debug(`Created new client: ${client[0]._id}`);
    return client[0];
  }

  const updatedClient = await Client_InfoModel.findOneAndUpdate(
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
  logger.debug(`Updated client: ${updatedClient._id}`);
  return updatedClient;
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
  logger.debug(`Creating visit record with number: ${data.visitNo}`);
  const VisitModel = Visit(connection);

  const existingVisit = await VisitModel.findOne({
    visitNo: data.visitNo,
  }).session(session);
  logger.debug(`Found existing visit: ${existingVisit ? "yes" : "no"}`);
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
  logger.debug(`Created new visit: ${visit[0]._id}`);
  return visit[0];
};

/** Get or create a form */
const getOrCreateForm = async (connection, session) => {
  logger.debug("Getting/Creating form");
  // const Form_TypeModel = Form_Type(connection);
  const FormModel = Form(connection);

  // const formType = await Form_TypeModel.findOne({
  //   formName: "Start of Care",
  // }).session(session);
  // logger.debug(`Found form type: ${formType ? formType._id : "not found"}`);
  // if (!formType) throw new Error("Form type not found");

  let form = await FormModel.findOne({ formName: "Start of Care" }).session(
    session
  );
  logger.debug(`Found form: ${form ? form._id : "not found"}`);
  if (!form) throw new Error("Form not found");

  return form;
};

/** Create an assessment record */
const createAssessment = async (form, visitId, connection, session) => {
  logger.debug(`Creating assessment for form ${form.id} and visit ${visitId}`);
  const AssessmentModel = Assessment(connection);

  const existingAssessment = await AssessmentModel.findOne({
    formId: form.id,
    visitId,
  }).session(session);
  if (existingAssessment) return existingAssessment;

  const assessment = await AssessmentModel.create(
    [{ formId: form.id, visitId, assessmentQuestion: form.assessmentForm }],
    {
      session,
    }
  );
  logger.debug(`Created assessment: ${assessment[0]._id}`);
  return assessment[0];
};

/** Start a database session and return connection + session */
const startDatabaseSession = async (tenantDb) => {
  logger.debug(`Starting database session for tenant: ${tenantDb}`);
  const connection = await getTenantDB(tenantDb);
  const session = await connection.startSession();
  session.startTransaction();
  logger.debug("Database session started successfully");
  return { connection, session };
};

const updateVisit = async (req, res) => {
  try {
    if (!req.params.id) {
      return res
        .status(500)
        .json(new ErrorResponse("Please specify id in parameter"));
    }
    logger.debug(`Updating visit with id: ${req.params.id}`);
    const { connection, session } = await startDatabaseSession(req.tenantDb);
    const VisitModel = Visit(connection);
    const visit = await VisitModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    logger.debug(`Updated visit: ${visit._id}`);
    return res.status(200).json(new SuccessResponse(visit));
  } catch (err) {
    res.status(404).json(new ErrorResponse(err));
  }
};

const updateAssessment = async (req, res) => {
  try {
    if (!req.params.id) {
      return res
        .status(500)
        .json(new ErrorResponse("Please specify id in parameter"));
    }
    logger.debug(`Updating assessment with id: ${req.params.id}`);
    const { connection, session } = await startDatabaseSession(req.tenantDb);
    const AssessmentModel = Assessment(connection);

    const assessment = await AssessmentModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    logger.debug(`Updated assessment: ${assessment._id}`);

    if (req.body.status === "Submitted to EMR") {
      const rpaInput = transformData(assessment.assessmentQuestion);
      const visitId = assessment.visitId;
      const VisitModel = Visit(connection);
      const visitRecord = await VisitModel.aggregate([
        {
          $match: { _id: visitId },
        },
        {
          $lookup: {
            from: "client_infos",
            localField: "clientId",
            foreignField: "_id",
            as: "clientInfo",
          },
        },
        {
          $unwind: "$clientInfo",
        },
      ]).exec();

      if (!visitRecord || visitRecord.length === 0) {
        logger.error(`Visit record not found for visitId: ${visitId}`);
        throw new Error(`Visit record not found for visitId: ${visitId}`);
      }

      const clientInfo = visitRecord[0].clientInfo; // Access the joined clientInfo

      if (!clientInfo) {
        logger.error(
          `Client info not found for clientId: ${visitRecord[0].clientId}`
        );
        throw new Error(
          `Client info not found for clientId: ${visitRecord[0].clientId}`
        );
      }
      logger.debug(`Found client info: ${JSON.stringify(clientInfo)}`);

      const message = {
        clientNo: clientInfo.clientNo,
        clientName: `${clientInfo.firstName} ${clientInfo.lastName}`,
        clientDob: clientInfo.dob,
        tenantDb: req.tenantDb,
        assessmentId: assessment.id,
        assessmentAnswer: rpaInput,
      };
      logger.info(`Publishing message to ${process.env.UIPATH_QUEUE_NAME}`);
      await sendMessageToUIPath(message);

      const allAssessments = await AssessmentModel.find({
        visitId: assessment.visitId,
      });
      const allSubmittedToEMR = allAssessments.every(
        (a) => a.status === "Submitted to EMR"
      );
      const allCompleted = allAssessments.every(
        (a) => a.status === "Completed"
      );

      logger.debug(`allSubmittedToEMR: ${allSubmittedToEMR}`);
      logger.debug(`allCompleted: ${allCompleted}`);

      if (allCompleted) {
        await VisitModel.findByIdAndUpdate(assessment.visitId, {
          status: "Completed",
        });
      } else if (allSubmittedToEMR) {
        await VisitModel.findByIdAndUpdate(assessment.visitId, {
          status: "Submitted",
        });
      }
    }
    return res.status(200).json(new SuccessResponse(assessment));
  } catch (err) {
    res.status(404).json(new ErrorResponse(err));
  }
};

const processAIOutput = async (err, data) => {
  // Sample message
  //  {
  //     "id":null,
  //     "user_id":"clinician@test.com",
  //     "client_id":"67d1c251cc8d031a8a070b2a",
  //     "assessment_id":"67d551267e49f4aed9a2d8eb",
  //     "company_id":"haggiehealth",
  //     "visit_id":"67d551267e49f4aed9a2d8e6",
  //     "transcribe_type":"deepgram",
  //     "status":"completed",
  //     "started":1742114503,
  //     "completed":1742114520,
  //     "answer_files":[
  //        "haggiehealth/67d551267e49f4aed9a2d8e6/67d551267e49f4aed9a2d8eb/output/answers.json"
  //     ],
  //     "transcription_files":[
  //        "haggiehealth/67d551267e49f4aed9a2d8e6/67d551267e49f4aed9a2d8eb/output/transcription.json"
  //     ],
  //     "conversation_files":[
  //        "haggiehealth/67d551267e49f4aed9a2d8e6/67d551267e49f4aed9a2d8eb/output/conversation.json"
  //     ]
  //  }

  let msg;

  try {
    logger.debug("Processing AI output");
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
      logger.debug(
        `Downloading file from S3: ${nconf.get("S3_BUCKET")}/${msg.answer_files[0]}`
      );
      const s3Response = await downloadFile(
        nconf.get("S3_BUCKET"),
        msg.answer_files[0]
      );
      // Convert S3 response buffer to string and store JSON content
      const responseBuffer = s3Response.Body;
      if (!(responseBuffer instanceof Buffer)) {
        throw new Error("S3 response body is not a buffer");
      }
      jsonContent = responseBuffer.toString("utf-8");
      msg.aiOutput = JSON.parse(jsonContent);
      logger.debug("Successfully parsed AI output");
    } catch (error) {
      logger.error(`Error downloading from S3: ${error.toString()}`);
      throw error;
    }

    const AssessmentModel = Assessment(connection);
    const VisitModel = Visit(connection);
    const assessment = await AssessmentModel.findById(
      msg.assessment_id
    ).populate({
      path: "visitId",
      model: VisitModel,
      select: "clinicianId visitNo",
    });

    if (!assessment) {
      logger.error(`Assessment not found: ${msg.assessment_id}`);
      throw new Error("Assessment not found");
    }

    let assessmentAnswer = msg.aiOutput.Responses;

    let processedAnswer = assessment.assessmentQuestion.map((question) => {
      question.answer_context =
        assessmentAnswer.find((a) => a.question_code === question.question_code)
          .answer_context || "Not Generated";
      question.answer_text =
        assessmentAnswer.find((a) => a.question_code === question.question_code)
          .answer_text || "Not Generated";
      question.answer_code =
        assessmentAnswer.find((a) => a.question_code === question.question_code)
          .answer_code || "Not Generated";
      return question;
    });

    logger.debug(`Processed answer: ${JSON.stringify(processedAnswer)}`);

    await AssessmentModel.updateOne(
      { _id: msg.assessment_id },
      {
        $set: {
          assessmentQuestion: processedAnswer,
          assessmentAnswer: assessmentAnswer,
          status: "Validation",
        },
      }
    );

    await createNotification(
      assessment.visitId.clinicianId,
      `AI Process Success for visit ${assessment.visitId.visitNo}`,
      "AI Process Success",
      connection,
      session
    );
    logger.debug("Created notification");
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
    logger.debug("Updating assessment from RPA");
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
    logger.debug(`Updated assessment status to Completed: ${assessment._id}`);

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
  try {
    const { connection, session } = await startDatabaseSession(req.tenantDb);
    const FormModel = Form(connection);
    const form = await FormModel.find();
    if (!form) return res.status(404).json(new ErrorResponse("Form not found"));

    return res.status(200).json(new SuccessResponse(form));
  } catch (error) {
    logger.error(`message container error: ${error.toString()}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const getFormTemplate = async (req, res) => {
  try {
    const { connection, session } = await startDatabaseSession(req.tenantDb);
    const Form_TemplateModel = Form_Template(connection);
    const formTemplate = await Form_TemplateModel.find();
    if (!formTemplate)
      return res
        .status(404)
        .json(new ErrorResponse("Form Templates not found"));

    return res.status(200).json(new SuccessResponse(formTemplate));
  } catch (error) {
    logger.error(`message container error: ${error.toString()}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const getFormbyId = async (req, res) => {
  if (!req.params.id) {
    return res
      .status(500)
      .json(new ErrorResponse("Please specify id in parameter"));
  }
  const { connection, session } = await startDatabaseSession(req.tenantDb);
  const FormModel = Form(connection);
  const form = await FormModel.findById(req.params.id);
  if (!form) return res.status(404).json(new ErrorResponse("Form not found"));

  return res.status(200).json(new SuccessResponse(form));
};

const updateForm = async (req, res) => {
  if (!req.params.id) {
    return res
      .status(500)
      .json(new ErrorResponse("Please specify id in parameter"));
  }
  const { connection, session } = await startDatabaseSession(req.tenantDb);
  const FormModel = Form(connection);
  const form = await FormModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  return res.status(200).json(new SuccessResponse(form));
};

const markVisitPastDue = async () => {
  const tenants = await Tenant.find();
  logger.debug(`Found ${tenants.length} tenants`);

  tenants.forEach(async (tenant) => {
    logger.debug(`Marking visits past due for tenant: ${tenant.databaseName}`);
    const connection = await getTenantDB(tenant.databaseName);
    const VisitModel = Visit(connection);
    const visits = await VisitModel.find({
      status: { $nin: ["Completed", "Submitted", "Past Due"] },
      visitDate: { $lt: new Date() },
    });
    logger.debug(
      `Found ${visits.length} visits to mark as past due in tenant ${tenant.databaseName}`
    );
    visits.forEach(async (visit) => {
      const visitDate = new Date(visit.visitDate);
      if (visitDate < new Date()) {
        logger.debug(`Marking visit ${visit._id} as past due`);
        await VisitModel.findByIdAndUpdate(visit._id, { status: "Past Due" });
        await createNotification(
          visit.clinicianId,
          `Visit ${visit.visitNo} is past due`,
          "Visit Past Due",
          connection
        );
      } else {
        logger.debug(
          `Visit ${visit._id} is of date ${visitDate} and is not past due`
        );
      }
    });
  });
};

module.exports = {
  createForm,
  createVisit,
  // formTypes,
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
  getFormTemplate,
  updateForm,
  markVisitPastDue,
  getFormbyId,
};
