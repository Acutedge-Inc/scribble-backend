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

const processAudio = async (req, res) => {
  try {
    const AWS = require("aws-sdk");
    const S3 = new AWS.S3();
    const SQS = new AWS.SQS();
    const { assessmentId } = req.body;

    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json(new ErrorResponse("No audio file uploaded"));
    }

    if (audioFile.size > 50 * 1024 * 1024) {
      // 50 MB limit
      return res
        .status(400)
        .json(new ErrorResponse("Audio file exceeds 50 MB limit"));
    }

    if (!assessmentId) {
      return res
        .status(400)
        .json(new ErrorResponse("Assessment ID is required"));
    }

    const connection = await getTenantDB(req.tenantDb);
    const AssessmentModel = Assessment(connection);
    const Clinician_InfoModel = Clinician_Info(connection);
    const Client_InfoModel = Client_Info(connection);
    const VisitModel = Visit(connection);
    const UserModel = User(connection);
    const FormModel = Form(connection);
    const assessment = await AssessmentModel.findById(assessmentId).populate({
      path: "formId",
      model: FormModel,
    });

    if (!assessment) {
      return res.status(404).json(new ErrorResponse("Assessment not found"));
    }
    const form = assessment.formId.questionForm;
    const formBuffer = Buffer.from(JSON.stringify(form));
    if (!(formBuffer instanceof Buffer)) {
      return res
        .status(500)
        .json(new ErrorResponse("Error converting form to buffer"));
    }

    const params = {
      Bucket: "scribble2-data",
      Key: `${req.tenantDb}/${assessmentId}/input/questionForm.json`,
      Body: formBuffer,
      ContentType: "application/json",
    };

    const s3 = new AWS.S3();
    const formUploadData = await s3.upload(params).promise();

    const data = await uploadFile(
      audioFile,
      `${req.tenantDb}/${assessmentId}/input/${audioFile.originalname}`
    );

    const visit = assessment.visitId;
    if (!visit) {
      return res.status(404).json(new ErrorResponse("Visit not found"));
    }

    // Update status as submitted in visits table
    await VisitModel.findByIdAndUpdate(visit._id, { status: "Submitted" });

    // Update status as submitted in assessments table
    await AssessmentModel.findByIdAndUpdate(assessmentId, {
      status: "Submitted",
    });

    const message = {
      audioFilePath: `${req.tenantDb}/${assessmentId}/input/${audioFile.originalname}`,
      questionFormPath: `${req.tenantDb}/${assessmentId}/input/questionForm.json`,
      assessmentId,
    };

    const queueUrl = process.env.SQS_QUEUE_URL;
    const queueMessage = await pushToQueue(queueUrl, message);

    return res
      .status(200)
      .json(new SuccessResponse("Audio file uploaded and message sent to SQS"));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

module.exports = {
  processAudio,
};
