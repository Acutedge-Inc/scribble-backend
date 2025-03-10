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
const Visit = require("../model/tenant/visit.js");
const Notification = require("../model/tenant/notification.js");
const NotificationType = require("../model/tenant/notificationType.js");

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
          name: { $concat: ["$firstName", " ", "$lastName"] },
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

const updateClinician = async (req, res) => {
  try {
    const connection = await getTenantDB(req.tenantDb);
    const Clinician_InfoModel = Clinician_Info(connection);
    const clinician = await Clinician_InfoModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (req.body.isDeleted) {
      const user = await UserModel.findByIdAndUpdate(
        clinician.userId,
        { isDeleted: true },
        { new: true }
      );
    }

    return res.status(200).json(new SuccessResponse(clinician));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const listClinicianVisitDetails = async (req, res) => {
  try {
    const connection = await getTenantDB(req.tenantDb);
    let clinicianId = req.user.id;
    const VisitModel = Visit(connection);

    const visitCounts = await VisitModel.aggregate([
      {
        $match: { clinicianId: new mongoose.Types.ObjectId(clinicianId) },
      },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          newVisits: {
            $sum: { $cond: [{ $eq: ["$status", "New"] }, 1, 0] },
          },
          inProgressVisits: {
            $sum: {
              $cond: [
                { $in: ["$status", ["In Progress", "Past Due", "Missed"]] },
                1,
                0,
              ],
            },
          },
          completedVisits: {
            $sum: {
              $cond: [{ $in: ["$status", ["Completed", "Submitted"]] }, 1, 0],
            },
          },
        },
      },
    ]);

    const counts = visitCounts[0] || {
      totalVisits: 0,
      newVisits: 0,
      inProgressVisits: 0,
      completedVisits: 0,
    };

    return res.status(200).json(
      new SuccessResponse({
        counts,
      })
    );
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const listUserNotification = async (req, res) => {
  try {
    const connection = await getTenantDB(req.tenantDb);
    const NotificationModel = Notification(connection);
    const notifications = await NotificationModel.find({
      userId: req.user.id,
    });
    return res.status(200).json(new SuccessResponse(notifications));
  } catch (error) {
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

module.exports = {
  listClient,
  listClinician,
  updateClinician,
  listClinicianVisitDetails,
  listUserNotification,
};
