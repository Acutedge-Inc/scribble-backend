const jwt = require("jsonwebtoken");
const AdminUser = require("../model/scribble-admin/adminUser.js");
const Tenant = require("../model/scribble-admin/tenants.js");
const fs = require("fs");
const path = require("path");

const { getTenantDB } = require("../lib/dbManager.js");
const { transformAssessmentForAI } = require("../lib/utils.js");
const { sendAccountVerificationEmail } = require("../lib/emails.js");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const tenantModels = require("../model/tenant/index.js");
const Clinician_Info = require("../model/tenant/clinicianInfo.js");
const Client_Info = require("../model/tenant/clientInfo.js");
const Episode = require("../model/tenant/episode.js");
const User = require("../model/tenant/user.js");
const Form = require("../model/tenant/form.js");
const Assessment = require("../model/tenant/assessment.js");
const Visit = require("../model/tenant/visit.js");
const { createFolder } = require("../lib/aws.js");
require("dotenv").config();
const {
  responses: { SuccessResponse, HTTPError, ERROR_CODES },
  logger,
  tokens,
} = require("../lib/index.js");
const { ErrorResponse } = require("../lib/responses.js");
const { uploadFile, pushToQueue } = require("../lib/aws.js");
const nconf = require("nconf");

const processAudio = async (req, res) => {
  try {
    logger.debug("Starting audio processing");
    const AWS = require("aws-sdk");
    const S3 = new AWS.S3();
    const SQS = new AWS.SQS();
    const { assessmentId } = req.body;

    logger.debug(`Processing audio for assessment ID: ${assessmentId}`);

    const audioFile = req.file;
    if (!audioFile) {
      logger.error("No audio file found in request");
      return res.status(400).json(new ErrorResponse("No audio file uploaded"));
    }

    logger.debug(
      `Received audio file: ${audioFile.originalname} (${audioFile.size} bytes)`
    );

    if (audioFile.size > 50 * 1024 * 1024) {
      // 50 MB limit
      logger.error(`File size ${audioFile.size} exceeds 50MB limit`);
      return res
        .status(400)
        .json(new ErrorResponse("Audio file exceeds 50 MB limit"));
    }

    if (!assessmentId) {
      logger.error("Missing required assessment ID");
      return res
        .status(400)
        .json(new ErrorResponse("Assessment ID is required"));
    }

    logger.debug(`Connecting to tenant database: ${req.tenantDb}`);
    const connection = await getTenantDB(req.tenantDb);
    const AssessmentModel = Assessment(connection);
    const Clinician_InfoModel = Clinician_Info(connection);
    const Client_InfoModel = Client_Info(connection);
    const VisitModel = Visit(connection);
    const UserModel = User(connection);
    const FormModel = Form(connection);

    logger.debug(`Fetching assessment details for ID: ${assessmentId}`);
    const assessment = await AssessmentModel.findById(assessmentId).populate({
      path: "formId",
      model: FormModel,
    });

    if (!assessment) {
      logger.error(`Assessment not found with ID: ${assessmentId}`);
      return res.status(404).json(new ErrorResponse("Assessment not found"));
    }

    logger.debug("Preparing form data for upload");
    const form = assessment.formId.assessmentForm;
    const aiFormatForm = transformAssessmentForAI(form);
    const formBuffer = Buffer.from(JSON.stringify(aiFormatForm));
    if (!(formBuffer instanceof Buffer)) {
      logger.error("Failed to convert form to buffer");
      return res
        .status(500)
        .json(new ErrorResponse("Error converting form to buffer"));
    }

    const visit = assessment.visitId;
    if (!visit) {
      logger.error(`Visit not found for assessment: ${assessmentId}`);
      return res.status(404).json(new ErrorResponse("Visit not found"));
    }

    logger.debug(`Preparing to upload form to S3 for visit: ${visit._id}`);
    const params = {
      Bucket: nconf.get("S3_BUCKET"),
      Key: `${req.tenantDb}/${visit._id}/${assessmentId}/input/questionForm.json`,
      Body: formBuffer,
      ContentType: "application/json",
    };

    const s3 = new AWS.S3();
    logger.debug("Uploading form to S3");
    const formUploadData = await s3.upload(params).promise();
    logger.debug(`Form uploaded successfully to: ${formUploadData.Location}`);

    logger.debug("Uploading audio file to S3");
    await uploadFile(
      audioFile,
      `${req.tenantDb}/${visit._id}/${assessmentId}/input/${audioFile.originalname}`
    );

    logger.debug(`Updating visit status for visit: ${visit._id}`);
    await VisitModel.findByIdAndUpdate(visit._id, { status: "In Progress" });

    logger.debug(`Updating assessment status for assessment: ${assessmentId}`);
    await AssessmentModel.findByIdAndUpdate(assessmentId, {
      status: "Submitted to AI",
    });

    const visitDetails = await VisitModel.findById(visit._id);

    logger.debug("Preparing message for AI processing queue");
    const message = {
      audioFilePath: `${req.tenantDb}/${visit._id}/${assessmentId}/input/${audioFile.originalname}`,
      questionFormPath: `${req.tenantDb}/${visit._id}/${assessmentId}/input/questionForm.json`,
      user_id: req.user.email,
      client_id: visitDetails.clientId,
      visit_id: visit._id,
      id: visit._id,
      assessment_id: assessmentId,
      company_id: req.tenantDb,
      transcribe_type: "deepgram",
      audio_files: [audioFile.originalname],
      question_files: ["questionForm.json"],
    };

    const queueUrl = process.env.AI_INPUT_QUEUE_URL;
    logger.debug(`Sending message to AI queue: ${queueUrl}`);
    logger.debug(`Message: ${JSON.stringify(message)}`);
    const queueMessage = await pushToQueue(queueUrl, message);
    logger.debug("Message successfully sent to AI queue");

    logger.debug("Audio processing completed successfully");
    return res
      .status(200)
      .json(new SuccessResponse("Audio file uploaded and message sent to SQS"));
  } catch (error) {
    logger.error(`Error processing audio: ${error.message}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

module.exports = {
  processAudio,
};
