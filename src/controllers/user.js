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
  logger.debug("Listing clinicians request received");
  try {
    const connection = await getTenantDB(req.tenantDb);
    logger.debug(`Connected to tenant database: ${req.tenantDb}`);
    const Clinician_InfoModel = Clinician_Info(connection);

    const { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);
    logger.debug(`Query filters: ${JSON.stringify(query)}`);
    logger.debug(`Pagination: limit=${parsedLimit}, offset=${parsedOffset}`);

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
    logger.debug(`Found ${clinicians.length} clinicians`);

    const totalCount = await Clinician_InfoModel.countDocuments(query);
    logger.debug(`Total clinician count: ${totalCount}`);

    return res.status(200).json(new SuccessResponse(clinicians, totalCount));
  } catch (error) {
    logger.error(`Error listing clinicians: ${error.message}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const listClient = async (req, res) => {
  logger.debug("Listing clients request received");
  try {
    const connection = await getTenantDB(req.tenantDb);
    logger.debug(`Connected to tenant database: ${req.tenantDb}`);
    const Client_InfoModel = Client_Info(connection);

    const { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);
    logger.debug(`Query filters: ${JSON.stringify(query)}`);
    logger.debug(`Pagination: limit=${parsedLimit}, offset=${parsedOffset}`);

    const client = await Client_InfoModel.find(query)
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .skip(parsedOffset);
    logger.debug(`Found ${client.length} clients`);

    const totalCount = await Client_InfoModel.countDocuments(query);
    logger.debug(`Total client count: ${totalCount}`);

    return res.status(201).json(new SuccessResponse(client, totalCount));
  } catch (error) {
    logger.error(`Error listing clients: ${error.message}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const isValidDate = (dateString) => {
  const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d\d$/;
  return regex.test(dateString);
};

const updateClinician = async (req, res) => {
  logger.debug(`Updating clinician with ID: ${req.params.id}`);
  try {
    const connection = await getTenantDB(req.tenantDb);
    logger.debug(`Connected to tenant database: ${req.tenantDb}`);
    const Clinician_InfoModel = Clinician_Info(connection);

    logger.debug(`Update data: ${JSON.stringify(req.body)}`);
    const clinician = await Clinician_InfoModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    logger.debug(`Successfully updated clinician: ${clinician._id}`);

    if (req.body.isDeleted) {
      logger.debug(
        `Marking associated user as deleted for clinician: ${clinician._id}`
      );
      const user = await UserModel.findByIdAndUpdate(
        clinician.userId,
        { isDeleted: true },
        { new: true }
      );
      logger.debug(`Successfully marked user as deleted: ${user._id}`);
    }

    return res.status(200).json(new SuccessResponse(clinician));
  } catch (error) {
    logger.error(`Error updating clinician: ${error.message}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const listClinicianVisitDetails = async (req, res) => {
  logger.debug(`Listing visit details for clinician: ${req.user.id}`);
  try {
    const connection = await getTenantDB(req.tenantDb);
    logger.debug(`Connected to tenant database: ${req.tenantDb}`);
    const clinicianId = req.user.id;
    const VisitModel = Visit(connection);

    logger.debug("Aggregating visit statistics");

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
              $cond: [{ $in: ["$status", ["In Progress", "Missed"]] }, 1, 0],
            },
          },
          pastDueVisits: {
            $sum: {
              $cond: [{ $in: ["$status", ["Past Due"]] }, 1, 0],
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

    const overallCounts = visitCounts[0] || {
      totalVisits: 0,
      newVisits: 0,
      inProgressVisits: 0,
      pastDueVisits: 0,
      completedVisits: 0,
    };
    logger.debug(`Visit statistics: ${JSON.stringify(overallCounts)}`);

    const { visitDate } = req.query;

    if (visitDate) {
      if (!isValidDate(visitDate)) {
        return res.status(400).json(new ErrorResponse("Invalid date format"));
      }
    }

    let today = new Date();
    if (visitDate) {
      today = new Date(visitDate);
    } else {
      today = new Date();
    }
    today.setHours(0, 0, 0, 0);
    const month = String(today.getMonth() + 1).padStart(2, "0"); // Ensure month is in MM format
    const day = String(today.getDate()).padStart(2, "0"); // Ensure day is in DD format
    const year = today.getFullYear();
    const todayStart = `${month}/${day}/${year}`; // Format as MM/DD/YYYY
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const todayEndString = `${month}/${day}/${year}`; // Format as MM/DD/YYYY

    const todayVisits = await VisitModel.aggregate([
      {
        $match: {
          clinicianId: new mongoose.Types.ObjectId(clinicianId),
          visitDate: todayStart, // Compare with string format
        },
      },
      {
        $group: {
          _id: null,
          totalVisits: { $sum: 1 },
          newVisits: {
            $sum: {
              $cond: [{ $in: ["$status", ["New"]] }, 1, 0],
            },
          },
          inProgressVisits: {
            $sum: {
              $cond: [{ $in: ["$status", ["In Progress", "Missed"]] }, 1, 0],
            },
          },
          pastDueVisits: {
            $sum: {
              $cond: [{ $in: ["$status", ["Past Due"]] }, 1, 0],
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

    return res.status(200).json(
      new SuccessResponse({
        overallCounts,
        todayVisits,
      })
    );
  } catch (error) {
    logger.error(`Error listing clinician visit details: ${error.message}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

const listUserNotification = async (req, res) => {
  logger.debug(`Listing notifications for user: ${req.user.id}`);
  try {
    const connection = await getTenantDB(req.tenantDb);
    logger.debug(`Connected to tenant database: ${req.tenantDb}`);
    const NotificationModel = Notification(connection);
    const NotificationTypeModel = NotificationType(connection);

    const notifications = await NotificationModel.find({
      userId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "notificationTypeId",
        select: "name",
        model: NotificationTypeModel,
      })
      .lean()
      .exec()
      .then((notifications) =>
        notifications.map((notification) => ({
          ...notification,
          notificationTypeName: notification.notificationTypeId.name,
        }))
      );

    logger.debug(`Found ${notifications.length} notifications`);

    return res.status(200).json(new SuccessResponse(notifications));
  } catch (error) {
    logger.error(`Error listing user notifications: ${error.message}`);
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
