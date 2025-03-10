const jwt = require("jsonwebtoken");
const AdminUser = require("../model/scribble-admin/adminUser.js");
const Tenant = require("../model/scribble-admin/tenants.js");
const adminDetails = require("../model/default/admin.js");
const fs = require("fs");
const validator = require("validator");
const { isEmpty } = require("lodash");

const { getTenantDB } = require("../lib/dbManager.js");
const { getFilterQuery, generateHashedPassword } = require("../lib/utils.js");

const {
  sendAccountVerificationEmail,
  sendPasswordResetEmail,
} = require("../lib/emails.js");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const tenantModels = require("../model/tenant/index.js");
const User = require("../model/tenant/user.js");
const Role = require("../model/tenant/role.js");
const Clinician_Info = require("../model/tenant/clinicianInfo.js");
const Admin_Info = require("../model/tenant/adminInfo.js");

const { createFolder } = require("../lib/aws.js");
require("dotenv").config();
const {
  responses: { SuccessResponse, HTTPError, ERROR_CODES },
  logger,
  tokens,
  session,
} = require("../lib/index.js");
const { ErrorResponse } = require("../lib/responses.js");
const clinicianInfo = require("../model/tenant/clinicianInfo.js");

async function getScope(userId, tenantId) {}

// Function to create admin user if it doesn't exist
async function createAdminUser(adminDbUrl) {
  try {
    const adminDbConnection = await mongoose.createConnection(adminDbUrl, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    const existingAdmin = await AdminUser.findOne({
      email: "sandeepb@acutedge.com",
    });

    if (!existingAdmin) {
      const salt = bcrypt.genSaltSync(10);
      adminDetails.password = bcrypt.hashSync(adminDetails.password, salt);

      const newAdmin = new AdminUser(adminDetails);

      await newAdmin.save();
      logger.info("Admin user created successfully.");
    } else {
      logger.info("Admin user already exists.");
    }
  } catch (error) {
    logger.error("Error creating admin user:", error);
  }
}

async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    const adminUser = await AdminUser.findOne({ email });
    if (!adminUser)
      return res.status(404).json(new ErrorResponse("Admin not found"));

    const isPasswordValid = bcrypt.compareSync(password, adminUser.password);

    if (!isPasswordValid)
      return res.status(401).json(new ErrorResponse("Invalid credentials"));

    await AdminUser.updateOne(
      { _id: adminUser._id },
      { $set: { lastLoginTime: new Date() } }
    );

    const accessTokenTtl = "600000";
    const refreshTokenttl = "3600000";

    const roles = "scribble_admin";
    const scopes = adminUser.scope;
    const accessToken = await tokens.createTokenV2(
      {
        user_id: adminUser._id,
        roles,
        scopes,
      },
      accessTokenTtl
    );

    const refreshToken = await tokens.createRefreshToken(
      adminUser._id,
      refreshTokenttl
    );
    await session.storeAccessToken(adminUser._id, accessToken, accessTokenTtl);
    await session.storeRefreshToken(
      adminUser._id,
      refreshToken,
      refreshTokenttl
    );
    const responseInst = {
      email: adminUser.email,
      userId: adminUser._id,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      isFirstLogin: adminUser?.isFirstLogin,
      lastLoginTime: new Date(),
      roles,
      scopes,
      accessToken,
      refreshToken,
      created: adminUser.createdAt,
      updated: adminUser.updatedAt,
    };
    return res.json(new SuccessResponse(responseInst));
  } catch (err) {
    logger.error(`Error on Admin Login ${err}`);
    return res.json(new ErrorResponse(err?.message || err));
  }
}

async function userLogin(req, res) {
  try {
    const { "x-tenant-id": tenantId } = req.headers;
    const { email = "", password = "" } = req.body;

    const tenant = await Tenant.findById(tenantId);

    // If tenant not found, return an error
    if (!tenant) {
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Tenant not found" }));
    }

    const connection = await getTenantDB(tenant.databaseName);
    const UserModel = User(connection);
    const RoleModel = Role(connection);

    const user = await UserModel.findOne({ email }).populate({
      path: "roleId",
      select: "roleName scope",
    });

    if (!user) return res.status(404).json(new ErrorResponse("User not found"));
    const { roleName, scope } = user.roleId;

    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      await UserModel.updateOne(
        { _id: user._id }, // Filter: find the user by ID
        { $inc: { loginAttempts: 1 } } // Increment loginAttempts by 1
      );

      if (user.loginAttempts > 3) {
        return res
          .status(401)
          .json(
            new ErrorResponse(
              `${user.loginAttempts + 1} times entered wrong password`
            )
          );
      }

      return res.status(401).json(new ErrorResponse("Invalid credentials"));
    }

    await UserModel.updateOne(
      { _id: user._id }, // Filter: find the user by ID
      { $set: { lastLoginTime: new Date() } }
    );

    const accessTokenTtl = "600000";
    const refreshTokenttl = "3600000";

    const roles = [roleName];
    const scopes = scope;
    const accessToken = await tokens.createTokenV2(
      {
        user_id: user._id,
        roles,
        scopes,
      },
      accessTokenTtl
    );

    const refreshToken = await tokens.createRefreshToken(
      user._id,
      refreshTokenttl
    );

    await session.storeAccessToken(user._id, accessToken, accessTokenTtl);
    await session.storeRefreshToken(user._id, refreshToken, refreshTokenttl);

    const responseInst = {
      email: user.email,
      userId: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      tenantId: user.tenantId,
      isFirstLogin: user?.isFirstLogin,
      lastLoginTime: user?.lastLoginTime || new Date(),
      roles,
      scopes,
      accessToken,
      refreshToken,
      created: user.createdAt,
      updated: user.updatedAt,
    };
    return res.json(new SuccessResponse(responseInst));
  } catch (err) {
    return res.json(new ErrorResponse(err?.message || err));
  }
}

/**
 *
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
const performLogin = async (req, res) => {
  try {
    const { "x-tenant-id": tenantId } = req.headers;

    if (!tenantId) {
      await adminLogin(req, res);
    } else {
      await userLogin(req, res);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createTenant = async (req, res) => {
  const { tenantName } = req.body;
  const uniqueName = tenantName.toLowerCase().replace(/ /g, "");

  try {
    const existingTenant = await Tenant.findOne({ uniqueName });
    if (existingTenant) {
      return res.status(400).json(new ErrorResponse("Tenant already exists"));
    }

    await tenantModels.init(uniqueName);

    // Save tenant details in adminDB
    const tenant = new Tenant({
      tenantName: tenantName,
      uniqueName: uniqueName,
      databaseName: uniqueName,
      createdBy: req.user,
    });
    await tenant.save();
    createFolder(uniqueName);

    return res.status(201).json(new SuccessResponse(tenant));
  } catch (error) {
    console.error("Tenant creation error:", error);
    res.status(500).json(new ErrorResponse(error));
  }
};

const getTenant = async (req, res) => {
  try {
    const { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);
    const existingTenants = await Tenant.find(query)
      .limit(parsedLimit)
      .skip(parsedOffset);

    const totalCount = await Tenant.countDocuments(query);
    return res
      .status(201)
      .json(new SuccessResponse(existingTenants, totalCount));
  } catch (error) {
    console.error("Error on getting tenants:", error);
    res.status(500).json(new ErrorResponse(error));
  }
};

const getRoles = async (req, res) => {
  try {
    const { tenantId } = req;
    const tenant = await Tenant.findById(tenantId);

    // If tenant not found, return an error
    if (!tenant) {
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Tenant not found" }));
    }

    const connection = await getTenantDB(tenant.databaseName);

    const RoleModel = Role(connection);

    const { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);
    const role = await RoleModel.find(query)
      .limit(parsedLimit)
      .skip(parsedOffset);

    if (!role) {
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Role not found" }));
    }
    const totalCount = await RoleModel.countDocuments(query);
    return res.status(201).json(new SuccessResponse(role, totalCount));
  } catch (error) {
    console.error("Error on getting roles:", error);
    res.status(500).json(new ErrorResponse(error));
  }
};

/**
 * Creates a record in the appropriate UserInfo table.
 */
async function createUserInfo({ userId, roleName, req, connection, session }) {
  const {
    employeeId,
    firstName,
    lastName,
    status,
    discipline,
    jobTitle,
    age,
    dob,
    gender,
    address1,
    address2,
    city,
    state,
    zip,
    country,
    primaryPhone,
  } = req.body;
  try {
    if (roleName === "user") {
      const ClinicianModel = Clinician_Info(connection);
      return await ClinicianModel.create(
        [
          {
            userId,
            clinicianNo: employeeId,
            firstName,
            lastName,
            status,
            discipline,
            jobTitle,
            age,
            dob,
            gender,
            address1,
            address2,
            city,
            state,
            zip,
            country,
            primaryPhone,
          },
        ],
        { session }
      );
    }

    if (roleName === "userAdmin") {
      const AdminModel = Admin_Info(connection);
      return await AdminModel.create(
        [
          {
            userId,
            adminNo: employeeId,
            firstName,
            lastName,
            status,
            discipline,
            jobTitle,
            age,
            dob,
            gender,
            address1,
            address2,
            city,
            state,
            zip,
            country,
            primaryPhone,
          },
        ],
        { session }
      );
    }
  } catch (err) {
    logger.error(`Error creating user info: ${err}`);
    throw err;
  }
}

const register = async (req, res) => {
  let session;
  try {
    let { email, roleId, "x-tenant-id": tenantId } = req.body;
    tenantId = tenantId || req.tenantId;

    if (!tenantId) {
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Tenant ID is required" }));
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error("Tenant not found");

    const connection = await getTenantDB(tenant.databaseName);
    session = await connection.startSession();
    session.startTransaction();

    const RoleModel = Role(connection);
    const role = await RoleModel.findById(roleId).session(session);
    if (!role) throw new Error("Role not found");

    const UserModel = User(connection);
    const existingUser = await UserModel.findOne({ email }).session(session);
    if (existingUser) throw new Error("User already exists");

    const password = "Admin@123";
    const hashedPassword = await generateHashedPassword(password);

    const newUser = await UserModel.create(
      [
        {
          email,
          password: hashedPassword,
          roleId,
          tenantId,
          isFirstLogin: true,
        },
      ],
      { session }
    );

    await createUserInfo({
      userId: newUser[0]._id,
      roleName: role.roleName,
      req,
      connection,
      session,
    });

    await sendAccountVerificationEmail(email, password);
    await session.commitTransaction();

    res.status(201).json(new SuccessResponse(newUser[0]));
  } catch (err) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    res.status(500).json(new ErrorResponse(err.message));
  } finally {
    if (session) await session.endSession();
  }
};

const health = async (req, res) => {
  try {
    return res.json({ message: "health" });
  } catch (err) {
    return res.send({ err });
  }
};

/**
 * GET new access token based on refresh token
 * @param {String} req.body.refreshToken
 * @param {*} res
 */
const getAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const tokenDetails = await tokens.verifyRefreshToken(refreshToken);

    const accessTokenTtl = "600000";

    const response = await session.checkIfRefreshTokenExists(req.user.id);

    if (!response || response !== refreshToken) {
      throw new HTTPError(
        401,
        "Session expired! Login again",
        ERROR_CODES.EXPIRED_TOKEN
      );
    }
    const accessToken = await tokens.createTokenV2(
      {
        user_id: req.user.id,
        roles: req.user?.roleId?.roleName || "scribble_admin",
        scopes: req.user,
      },
      accessTokenTtl
    );

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: true,
      sameStrict: "strict",
    });
    // Update redis with new accesstoken for particular refreshtoken
    await session.storeAccessToken(req.user.id, accessToken, accessTokenTtl);

    res.json(new SuccessResponse({ accessToken }));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ErrorResponse(err, err.errorCode, req?.apiId, err.data));
  }
};

/**
 * PUT /change-password
 * Update the password for the authenticated account [AG-904]
 * @param {Object} req
 * @param {Object} req.body
 * @param {String} req.user.id (from token)
 * @param {String} req.body.newPassword
 * @param {String} req.body.oldPassword
 * @returns Response stating the password update status
 */
const changePassword = async (req, res) => {
  try {
    const { newPassword, oldPassword } = req.body;

    // Current password entered by user should be correct to be allowed to change it
    if (!bcrypt.compareSync(oldPassword, req.user.password))
      throw new HTTPError(
        400,
        "Current password entered is incorrect",
        "INCORRECT_CURRENT_PASSWORD"
      );

    // New password can not be the same as the current password
    if (bcrypt.compareSync(newPassword, req.user.password))
      throw new HTTPError(
        403,
        "Your new password cannot be the same as your current password.",
        "SAME_AS_CURRENT_PASSWORD"
      );

    // Commenting below as this has already been taken care of in validateInputs middleware. Still keeping the commented line below in case we might want to reuse this controller somewhere else and would want below logic to run in that case.
    // validatePassword(newPassword);

    // Update password
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);
    req.user.password = hash;

    const connection = await getTenantDB(req.tenantDb);

    const UserModel = User(connection);

    await UserModel.updateOne(
      { email: req.user?.email }, // Filter: Find user by email
      { $set: { password: hash, isFirstLogin: false } } // Update password field
    );

    res.json(new SuccessResponse({ message: "Password updated." }));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ErrorResponse(err, err.errorCode, req?.apiId, err.data));
  }
};

/**
 * POST /auth/v1/recover-password-email
 * @description Send password recovery email containing a link to reset the password
 * @param {String} req.body.email The email of the user who wants to reset their password
 * @returns {Object} Returns JSON response saying email has been sent / not sent
 */
const sendRecoverPasswordEmail = async (req, res) => {
  try {
    // Fetch the input Email
    const { email } = req.body;

    if (isEmpty(email))
      throw new HTTPError(400, "Email is required", ERROR_CODES.MISSING_DATA);

    const { "x-tenant-id": tenantId } = req.headers;
    const tenant = await Tenant.findById(tenantId);

    // If tenant not found, return an error
    if (!tenant) {
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Tenant not found" }));
    }

    const connection = await getTenantDB(tenant.databaseName);
    const UserModel = User(connection);
    const RoleModel = Role(connection);

    const user = await UserModel.findOne({ email }).populate({
      path: "roleId",
      select: "roleName scope",
    });

    // Verify if user is registered
    if (!user)
      throw new HTTPError(400, "User does not exist", ERROR_CODES.NOT_FOUND);
    const accessTokenTtl = "600000";
    const { roleName, scope } = user.roleId;

    const token = await tokens.createTokenV2(
      {
        user_id: user._id,
        roles: [roleName],
        scopes: scope,
      },
      accessTokenTtl,
      "recover-password"
    );

    const passwordRecoveryLink = `${process.env.WEB_URL}/recover-password/${user.email}/${token}/`;
    await sendPasswordResetEmail(email, passwordRecoveryLink);
    res.json(new SuccessResponse({ message: "Link sent to your email" }));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ErrorResponse(err, err.errorCode, req?.apiId, err.data));
  }
};

/**
 * Validate password. Throws if invalid.
 * @param {String} password
 * @returns {Boolean}
 */
const validatePassword = async (password) => {
  // const englishWords = wordlist.english;

  // Validate password min and max length
  if (!validator.isLength(password, { min: 8, max: 20 })) {
    throw new HTTPError(
      400,
      "Please, enter a valid password (min 8 and max 20 characters)",
      ERROR_CODES.INVALID_DATA
    );
  }

  // Validate password should contains atleast one lowercase, one uppercase, one number and any one of the special characters ! @ # / _ -.
  if (
    !/[!@#/_-]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password)
  ) {
    throw new HTTPError(
      400,
      "Password should contain atleast one lowercase, uppercase, number and special character",
      ERROR_CODES.INVALID_DATA
    );
  } else {
    const anyOtherCharacter = /[`~$₹%^&*()+=|}{;:'<>?/]/.test(password);

    if (anyOtherCharacter)
      throw new HTTPError(
        400,
        "Password shouldn't contain special character other than ! @ # / _ -",
        ERROR_CODES.INVALID_DATA
      );
  }

  return true;
};

/**
 * GET /auth/v1/recover-password
 * @description Update the old password with new
 * @param {String} req.headers.authorization Auth token
 * @param {String} req.body.email AdminUser's email
 * @param {String} req.body.newPassword The new password that the user wants to update
 * @returns {Object} Returns JSON response saying password has been updated / not updated
 */
const recoverPassword = async (req, res) => {
  try {
    // Fetch the email
    const { email, newPassword } = req.body;
    if (isEmpty(email))
      throw new HTTPError(
        400,
        "Missing Mandatory fields - Email",
        ERROR_CODES.MISSING_DATA
      );

    const { "x-tenant-id": tenantId } = req.headers;
    const tenant = await Tenant.findById(tenantId);

    // If tenant not found, return an error
    if (!tenant) {
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Tenant not found" }));
    }

    const connection = await getTenantDB(tenant.databaseName);
    const UserModel = User(connection);

    const user = await UserModel.findOne({ email });

    if (isEmpty(newPassword))
      throw new HTTPError(
        400,
        "Missing Mandatory fields - Password",
        ERROR_CODES.MISSING_DATA
      );

    // Validate the new password
    await validatePassword(newPassword);

    // New password can not be same as existing password [AG-892]
    if (bcrypt.compareSync(newPassword, user.password))
      throw new HTTPError(
        500,
        "Your new password cannot be the same as your current password.",
        ERROR_CODES.GENERAL
      );

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    await UserModel.updateOne(
      { email: req.user?.email }, // Filter: Find user by email
      { $set: { password: hashedPassword } } // Update password field
    );

    // Send response
    return res
      .status(200)
      .json(new SuccessResponse({ message: "Password updated successfully" }));
  } catch (err) {
    return res
      .status(err.statusCode || 500)
      .json(new ErrorResponse(err, err.errorCode, req?.apiId, err.data));
  }
};

const logout = async (req, res) => {
  logger.info("Logging out");
  try {
    const { id: identity } = req.user;
    const { refreshToken } = req.body;

    const response = await session.checkIfRefreshTokenExists(identity);
    // Validate if it exists in session store
    if (!response || response !== refreshToken) {
      throw new HTTPError(
        401,
        "Session expired! Login again",
        ERROR_CODES.EXPIRED_TOKEN
      );
    }

    await session.removeAccessToken(identity);
    await session.removeRefreshToken(identity);
    res.json(new SuccessResponse());
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ErrorResponse(err, err.errorCode, req?.apiId, err.data));
  }
};

module.exports = {
  performLogin,
  health,
  register,
  getAccessToken,
  changePassword,
  sendRecoverPasswordEmail,
  recoverPassword,
  createTenant,
  getTenant,
  createAdminUser,
  getRoles,
  logout,
};
