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
  logger.debug(`Creating admin user with URL: ${adminDbUrl}`);
  try {
    const adminDbConnection = await mongoose.createConnection(adminDbUrl, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    logger.debug("Connected to admin database");

    const existingAdmin = await AdminUser.findOne({
      email: "sandeepb@acutedge.com",
    });
    logger.debug(
      `Checked for existing admin: ${existingAdmin ? "found" : "not found"}`
    );

    if (!existingAdmin) {
      const salt = bcrypt.genSaltSync(10);
      adminDetails.password = bcrypt.hashSync(adminDetails.password, salt);
      logger.debug("Generated hashed password for new admin");

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
  logger.debug(`Admin login attempt for email: ${req.body.email}`);
  try {
    const { email, password } = req.body;

    const adminUser = await AdminUser.findOne({ email });
    logger.debug(
      `Admin user lookup result: ${adminUser ? "found" : "not found"}`
    );

    if (!adminUser) {
      logger.warn(`Login failed - admin not found for email: ${email}`);
      return res.status(404).json(new ErrorResponse("Admin not found"));
    }

    const isPasswordValid = bcrypt.compareSync(password, adminUser.password);
    logger.debug(`Password validation result: ${isPasswordValid}`);

    if (!isPasswordValid) {
      logger.warn("Login failed - invalid credentials for admin:", email);
      return res.status(401).json(new ErrorResponse("Invalid credentials"));
    }

    await AdminUser.updateOne(
      { _id: adminUser._id },
      { $set: { lastLoginTime: new Date() } }
    );
    logger.debug(`Updated last login time for admin: ${adminUser._id}`);

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
    logger.debug(`Generated access token for admin`);

    const refreshToken = await tokens.createRefreshToken(
      adminUser._id,
      refreshTokenttl
    );
    logger.debug(`Generated refresh token for admin`);

    await session.storeAccessToken(adminUser._id, accessToken, accessTokenTtl);
    await session.storeRefreshToken(
      adminUser._id,
      refreshToken,
      refreshTokenttl
    );
    logger.debug("Stored tokens in session");

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
    logger.info(`Admin login successful for: ${email}`);
    return res.json(new SuccessResponse(responseInst));
  } catch (err) {
    logger.error(`Error on Admin Login ${err}`);
    return res.json(new ErrorResponse(err?.message || err));
  }
}

async function userLogin(req, res) {
  const { "x-tenant-id": tenantId } = req.headers;
  const { email = "", password = "" } = req.body;
  logger.debug("User login attempt", { email, tenantId });

  try {
    const tenant = await Tenant.findById(tenantId);
    logger.debug(`Tenant lookup result: ${tenant ? "found" : "not found"}`);

    // If tenant not found, return an error
    if (!tenant) {
      logger.warn(`Login failed - tenant not found: ${tenantId}`);
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Tenant not found" }));
    }

    const connection = await getTenantDB(tenant.databaseName);
    logger.debug(`Connected to tenant database: ${tenant.databaseName}`);

    const UserModel = User(connection);
    const RoleModel = Role(connection);

    const user = await UserModel.findOne({ email }).populate({
      path: "roleId",
      select: "roleName scope",
    });
    logger.debug(`User lookup result: ${user ? "found" : "not found"}`);

    if (!user) {
      logger.warn(`Login failed - user not found: ${email}`);
      return res.status(404).json(new ErrorResponse("User not found"));
    }
    const { roleName, scope } = user.roleId;

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    logger.debug(`Password validation result: ${isPasswordValid}`);

    if (!isPasswordValid) {
      await UserModel.updateOne(
        { _id: user._id },
        { $inc: { loginAttempts: 1 } }
      );
      logger.warn(`Failed login attempt for user: ${email}`);

      if (user.loginAttempts > 3) {
        logger.warn(`User exceeded max login attempts: ${email}`);
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
      { _id: user._id },
      { $set: { lastLoginTime: new Date(), loginAttempts: 0 } }
    );
    logger.debug(`Updated last login time for user: ${user._id}`);

    let userDetails = {};

    if (roleName === "user") {
      const Clinician_InfoModel = Clinician_Info(connection);
      userDetails = await Clinician_InfoModel.findOne({ userId: user.id });
    } else {
      const Admin_InfoModel = Admin_Info(connection);
      userDetails = await Admin_InfoModel.findOne({ userId: user.id });
    }

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
    logger.debug("Generated access token for user");

    const refreshToken = await tokens.createRefreshToken(
      user._id,
      refreshTokenttl
    );
    logger.debug("Generated refresh token for user");

    await session.storeAccessToken(user._id, accessToken, accessTokenTtl);
    await session.storeRefreshToken(user._id, refreshToken, refreshTokenttl);
    logger.debug("Stored tokens in session");

    const responseInst = {
      email: user.email,
      userId: user._id,
      firstName: userDetails?.firstName,
      lastName: userDetails?.lastName,
      staffNo: userDetails?.clinicianNo,
      tenantId: user.tenantId,
      isFirstLogin: user?.isFirstLogin,
      lastLoginTime: user?.lastLoginTime || new Date(),
      address1: userDetails?.address1,
      address2: userDetails?.address2,
      city: userDetails?.city,
      county: userDetails?.county,
      country: userDetails?.country,
      state: userDetails?.state,
      zip: userDetails?.zip,
      gender: userDetails?.gender,
      age: userDetails?.age,
      jobTitle: userDetails?.jobTitle,
      primaryPhone: userDetails?.primaryPhone,
      disciplineId: userDetails?.disciplineId,
      roles,
      scopes,
      accessToken,
      refreshToken,
      created: user.createdAt,
      updated: user.updatedAt,
    };
    logger.info(`User login successful: ${email}`);
    return res.json(new SuccessResponse(responseInst));
  } catch (err) {
    logger.error(`User login error: ${err}`);
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
  logger.debug("Login request received", {
    tenantId: req.headers["x-tenant-id"],
    email: req.body.email,
  });

  try {
    const { "x-tenant-id": tenantId } = req.headers;

    if (!tenantId) {
      logger.debug("No tenant ID - proceeding with admin login");
      await adminLogin(req, res);
    } else {
      logger.debug("Tenant ID present - proceeding with user login");
      await userLogin(req, res);
    }
  } catch (err) {
    logger.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
};

const createTenant = async (req, res) => {
  const { tenantName } = req.body;
  const uniqueName = tenantName.toLowerCase().replace(/ /g, "");
  logger.debug("Creating new tenant", { tenantName, uniqueName });

  try {
    const existingTenant = await Tenant.findOne({ uniqueName });
    logger.debug(
      `Checked for existing tenant: ${existingTenant ? "found" : "not found"}`
    );

    if (existingTenant) {
      logger.warn("Tenant creation failed - already exists:", uniqueName);
      return res.status(400).json(new ErrorResponse("Tenant already exists"));
    }

    await tenantModels.init(uniqueName);
    logger.debug("Initialized tenant models");

    // Save tenant details in adminDB
    const tenant = new Tenant({
      tenantName: tenantName,
      uniqueName: uniqueName,
      databaseName: uniqueName,
      createdBy: req.user,
    });
    await tenant.save();
    logger.debug("Saved tenant details to database");

    createFolder(uniqueName);
    logger.debug("Created tenant folder");

    logger.info(`Successfully created new tenant: ${uniqueName}`);
    return res.status(201).json(new SuccessResponse(tenant));
  } catch (error) {
    logger.error("Tenant creation error:", error);
    res.status(500).json(new ErrorResponse(error));
  }
};

const getTenant = async (req, res) => {
  logger.debug("Getting tenants with query:", req.query);
  try {
    const { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);
    logger.debug("Parsed filter query:", { query, parsedLimit, parsedOffset });

    const existingTenants = await Tenant.find(query)
      .limit(parsedLimit)
      .skip(parsedOffset);
    logger.debug(`Found tenants count: ${existingTenants.length}`);

    const totalCount = await Tenant.countDocuments(query);
    logger.debug(`Total tenants count: ${totalCount}`);

    return res
      .status(201)
      .json(new SuccessResponse(existingTenants, totalCount));
  } catch (error) {
    logger.error(`Error on getting tenants: ${error}`);
    res.status(500).json(new ErrorResponse(error));
  }
};

const getRoles = async (req, res) => {
  logger.debug(`Getting roles for tenant: ${req.tenantId}`);
  try {
    const { tenantId } = req;
    const tenant = await Tenant.findById(tenantId);
    logger.debug(`Tenant lookup result: ${tenant ? "found" : "not found"}`);

    // If tenant not found, return an error
    if (!tenant) {
      logger.warn(`Get roles failed - tenant not found: ${tenantId}`);
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Tenant not found" }));
    }

    const connection = await getTenantDB(tenant.databaseName);
    logger.debug(`Connected to tenant database: ${tenant.databaseName}`);

    const RoleModel = Role(connection);

    const { query, parsedLimit, parsedOffset } = getFilterQuery(req.query);
    logger.debug("Parsed filter query:", { query, parsedLimit, parsedOffset });

    const role = await RoleModel.find(query)
      .limit(parsedLimit)
      .skip(parsedOffset);
    logger.debug(`Found roles count: ${role.length}`);

    if (!role) {
      logger.warn("No roles found for query");
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Role not found" }));
    }
    const totalCount = await RoleModel.countDocuments(query);
    logger.debug(`Total roles count: ${totalCount}`);

    return res.status(201).json(new SuccessResponse(role, totalCount));
  } catch (error) {
    logger.error(`Error on getting roles: ${error}`);
    res.status(500).json(new ErrorResponse(error));
  }
};

/**
 * Creates a record in the appropriate UserInfo table.
 */
async function createUserInfo({ userId, roleName, req, connection, session }) {
  logger.debug(`Creating user info: ${userId}, ${roleName}`);
  const {
    employeeId,
    firstName,
    lastName,
    status,
    disciplineId,
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
      logger.debug("Creating clinician info");
      const ClinicianModel = Clinician_Info(connection);
      return await ClinicianModel.create(
        [
          {
            userId,
            clinicianNo: employeeId,
            firstName,
            lastName,
            status,
            disciplineId,
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
      logger.debug("Creating admin info");
      const AdminModel = Admin_Info(connection);
      return await AdminModel.create(
        [
          {
            userId,
            adminNo: employeeId,
            firstName,
            lastName,
            status,
            disciplineId,
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
  logger.debug(
    `User registration request received: ${req.body.email} on tenant: ${req.body["x-tenant-id"] || req.tenantId}`
  );

  try {
    let { email, roleId, "x-tenant-id": tenantId } = req.body;
    tenantId = tenantId || req.tenantId;

    if (!tenantId) {
      logger.warn("Registration failed - missing tenant ID");
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Tenant ID is required" }));
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error("Tenant not found");
    logger.debug("Found tenant:", tenant.tenantName);

    const connection = await getTenantDB(tenant.databaseName);
    session = await connection.startSession();
    session.startTransaction();
    logger.debug("Started database transaction");

    const RoleModel = Role(connection);
    const role = await RoleModel.findById(roleId).session(session);
    if (!role) throw new Error("Role not found");
    logger.debug("Found role:", role.roleName);

    const UserModel = User(connection);
    const existingUser = await UserModel.findOne({ email }).session(session);
    if (existingUser) throw new Error("User already exists");

    const password = "Admin@123";
    const hashedPassword = await generateHashedPassword(password);
    logger.debug("Generated hashed password for new user");

    const newUser = await UserModel.create(
      [
        {
          email,
          password: hashedPassword,
          roleId,
          tenantId,
          isFirstLogin: true,
          createdBy: req.user.id,
          updatedBy: req.user.id,
        },
      ],
      { session }
    );
    logger.debug("Created new user");

    await createUserInfo({
      userId: newUser[0]._id,
      roleName: role.roleName,
      req,
      connection,
      session,
    });
    logger.debug("Created user info");

    await sendAccountVerificationEmail(email, password);
    logger.debug("Sent verification email");

    await session.commitTransaction();
    logger.info(`Successfully registered new user: ${email}`);

    res.status(201).json(new SuccessResponse(newUser[0]));
  } catch (err) {
    logger.error(`Registration error: ${err}`);
    if (session && session.inTransaction()) {
      await session.abortTransaction();
      logger.debug("Aborted database transaction");
    }
    res.status(500).json(new ErrorResponse(err?.message || err));
  } finally {
    if (session) {
      await session.endSession();
      logger.debug("Ended database session");
    }
  }
};

const health = async (req, res) => {
  logger.debug("Health check request received");
  try {
    return res.json({ message: "health" });
  } catch (err) {
    logger.error(`Health check error: ${err}`);
    return res.send({ err });
  }
};

/**
 * GET new access token based on refresh token
 * @param {String} req.body.refreshToken
 * @param {*} res
 */
const getAccessToken = async (req, res) => {
  logger.debug("Get access token request received");
  try {
    const { refreshToken } = req.body;
    const tokenDetails = await tokens.verifyRefreshToken(refreshToken);
    logger.debug("Verified refresh token");

    const accessTokenTtl = "600000";

    const response = await session.checkIfRefreshTokenExists(req.user.id);
    logger.debug(`Checked refresh token exists: ${response ? "yes" : "no"}`);

    if (!response || response !== refreshToken) {
      logger.warn(`Session expired for user: ${req.user.id}`);
      throw new HTTPError(
        419,
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
    logger.debug("Generated new access token");

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: true,
      sameStrict: "strict",
    });
    // Update redis with new accesstoken for particular refreshtoken
    await session.storeAccessToken(req.user.id, accessToken, accessTokenTtl);
    logger.debug("Stored new access token");

    res.json(new SuccessResponse({ accessToken }));
  } catch (err) {
    logger.error("Get access token error:", err);
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
  logger.debug(`Change password request received for user: ${req.user.id}`);
  try {
    const { newPassword, oldPassword } = req.body;

    // Current password entered by user should be correct to be allowed to change it
    if (!bcrypt.compareSync(oldPassword, req.user.password)) {
      logger.warn(
        `Change password failed - incorrect current password: ${oldPassword}`
      );
      throw new HTTPError(
        400,
        "Current password entered is incorrect",
        "INCORRECT_CURRENT_PASSWORD"
      );
    }

    // New password can not be the same as the current password
    if (bcrypt.compareSync(newPassword, req.user.password)) {
      logger.warn(
        `Change password failed - new password same as current: ${newPassword}`
      );
      throw new HTTPError(
        403,
        "Your new password cannot be the same as your current password.",
        "SAME_AS_CURRENT_PASSWORD"
      );
    }

    // Commenting below as this has already been taken care of in validateInputs middleware. Still keeping the commented line below in case we might want to reuse this controller somewhere else and would want below logic to run in that case.
    // validatePassword(newPassword);

    // Update password
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);
    req.user.password = hash;
    logger.debug(`Generated new hashed password: ${hash}`);

    const connection = await getTenantDB(req.tenantDb);

    const UserModel = User(connection);

    await UserModel.updateOne(
      { email: req.user?.email }, // Filter: Find user by email
      { $set: { password: hash, isFirstLogin: false } } // Update password field
    );
    logger.debug(`Updated password in database: ${req.user.email}`);

    logger.info(`Successfully changed password for user: ${req.user.email}`);
    res.json(new SuccessResponse({ message: "Password updated." }));
  } catch (err) {
    logger.error(`Change password error: ${err}`);
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
const updateProfile = async (req, res) => {
  logger.debug(`Update profile received for user: ${req.user.id}`);
  try {
    const connection = await getTenantDB(req.tenantDb);
    const { roleName, scope } = req.user.roleId;

    if (roleName === "user") {
      const Clinician_InfoModel = Clinician_Info(connection);
      await Clinician_InfoModel.updateOne(
        { userId: req.user?.id }, // Filter: Find user by email
        { $set: req.body } // Update password field
      );
    } else {
      const Admin_InfoModel = Admin_Info(connection);
      await Admin_InfoModel.updateOne(
        { userId: req.user?.id }, // Filter: Find user by email
        { $set: req.body } // Update password field
      );
    }

    logger.debug(`Updated profile in database: ${req.user.email}`);

    logger.info(`Successfully updated profile for user: ${req.user.email}`);
    res.json(new SuccessResponse({ message: "Password updated." }));
  } catch (err) {
    logger.error(`Update profile error: ${err}`);
    res
      .status(err.statusCode || 500)
      .json(new ErrorResponse(err, err.errorCode, req?.apiId, err.data));
  }
};

const updateUser = async (req, res) => {
  logger.debug(`Update user: ${req.user.id}`);
  try {
    if (!req.params.id) {
      return res
        .status(500)
        .json(new ErrorResponse("Please specify id in parameter"));
    }
    const connection = await getTenantDB(req.tenantDb);
    const UserModel = User(connection);
    req.body.updatedBy = req.user.id;
    const user = await UserModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    return res.status(200).json(new SuccessResponse(user));
  } catch (error) {
    logger.error(`Error on updating user: ${error.toString()}`);
    return res.status(500).json(new ErrorResponse(error.message));
  }
};

/**
 * POST /auth/v1/recover-password-email
 * @description Send password recovery email containing a link to reset the password
 * @param {String} req.body.email The email of the user who wants to reset their password
 * @returns {Object} Returns JSON response saying email has been sent / not sent
 */
const sendRecoverPasswordEmail = async (req, res) => {
  logger.debug("Password recovery email request received");
  try {
    // Fetch the input Email
    const { email } = req.body;

    if (isEmpty(email)) {
      logger.warn("Recovery email failed - missing email");
      throw new HTTPError(400, "Email is required", ERROR_CODES.MISSING_DATA);
    }

    const { "x-tenant-id": tenantId } = req.headers;
    const tenant = await Tenant.findById(tenantId);
    logger.debug(`Tenant lookup result: ${tenant ? "found" : "not found"}`);

    // If tenant not found, return an error
    if (!tenant) {
      logger.warn(`Recovery email failed - tenant not found: ${tenantId}`);
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
    logger.debug(`User lookup result: ${user ? "found" : "not found"}`);

    // Verify if user is registered
    if (!user) {
      logger.warn("Recovery email failed - user not found:", email);
      throw new HTTPError(400, "User does not exist", ERROR_CODES.NOT_FOUND);
    }
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
    logger.debug("Generated recovery token");

    const passwordRecoveryLink = `${process.env.WEB_URL}/recover-password/${user.email}/${token}/`;
    await sendPasswordResetEmail(email, passwordRecoveryLink);
    logger.info(`Sent password recovery email to: ${email}`);

    res.json(new SuccessResponse({ message: "Link sent to your email" }));
  } catch (err) {
    logger.error(`Password recovery email error: ${err}`);
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
  logger.debug("Validating password");
  // const englishWords = wordlist.english;

  // Validate password min and max length
  if (!validator.isLength(password, { min: 8, max: 20 })) {
    logger.warn("Password validation failed - invalid length");
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
    logger.warn("Password validation failed - missing required characters");
    throw new HTTPError(
      400,
      "Password should contain atleast one lowercase, uppercase, number and special character",
      ERROR_CODES.INVALID_DATA
    );
  } else {
    const anyOtherCharacter = /[`~$₹%^&*()+=|}{;:'<>?/]/.test(password);

    if (anyOtherCharacter) {
      logger.warn("Password validation failed - invalid special characters");
      throw new HTTPError(
        400,
        "Password shouldn't contain special character other than ! @ # / _ -",
        ERROR_CODES.INVALID_DATA
      );
    }
  }

  logger.debug("Password validation successful");
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
  logger.debug("Password recovery request received");
  try {
    // Fetch the email
    const { email, newPassword } = req.body;
    if (isEmpty(email)) {
      logger.warn("Password recovery failed - missing email");
      throw new HTTPError(
        400,
        "Missing Mandatory fields - Email",
        ERROR_CODES.MISSING_DATA
      );
    }

    const { "x-tenant-id": tenantId } = req.headers;
    const tenant = await Tenant.findById(tenantId);
    logger.debug(`Tenant lookup result: ${tenant ? "found" : "not found"}`);

    // If tenant not found, return an error
    if (!tenant) {
      logger.warn("Password recovery failed - tenant not found:", tenantId);
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Tenant not found" }));
    }

    const connection = await getTenantDB(tenant.databaseName);
    const UserModel = User(connection);

    const user = await UserModel.findOne({ email });
    logger.debug(`User lookup result: ${user ? "found" : "not found"}`);

    if (isEmpty(newPassword)) {
      logger.warn("Password recovery failed - missing new password");
      throw new HTTPError(
        400,
        "Missing Mandatory fields - Password",
        ERROR_CODES.MISSING_DATA
      );
    }

    // Validate the new password
    await validatePassword(newPassword);

    // New password can not be same as existing password [AG-892]
    if (bcrypt.compareSync(newPassword, user.password)) {
      logger.warn("Password recovery failed - new password same as current");
      throw new HTTPError(
        500,
        "Your new password cannot be the same as your current password.",
        ERROR_CODES.GENERAL
      );
    }

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);
    logger.debug("Generated new hashed password");

    await UserModel.updateOne(
      { email: req.user?.email }, // Filter: Find user by email
      { $set: { password: hashedPassword } } // Update password field
    );
    logger.debug("Updated password in database");

    logger.info("Successfully recovered password for user:", email);
    // Send response
    return res
      .status(200)
      .json(new SuccessResponse({ message: "Password updated successfully" }));
  } catch (err) {
    logger.error("Password recovery error:", err);
    return res
      .status(err.statusCode || 500)
      .json(new ErrorResponse(err, err.errorCode, req?.apiId, err.data));
  }
};

const logout = async (req, res) => {
  logger.info("Logging out user:", req.user.id);
  logger.info("Logging out");
  try {
    const { id: identity } = req.user;
    const { refreshToken } = req.body;

    const response = await session.checkIfRefreshTokenExists(identity);
    // Validate if it exists in session store
    if (!response || response !== refreshToken) {
      throw new HTTPError(
        419,
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
  updateProfile,
  updateUser,
};
