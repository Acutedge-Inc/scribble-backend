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
const User = require("../model/tenant/user.js");
const Role = require("../model/tenant/role.js");
const Clinitian_Info = require("../model/tenant/clinicianInfo.js");
const Admin_Info = require("../model/tenant/adminInfo.js");

require("dotenv").config();
const {
  responses: { SuccessResponse, HTTPError, ERROR_CODES },
  logger,
  tokens,
} = require("../lib/index.js");
const { ErrorResponse } = require("../lib/responses.js");
const clinicianInfo = require("../model/tenant/clinicianInfo.js");

async function getScope(userId, tenantId) {}

// Function to create admin user if it doesn't exist
async function createAdminUser(adminDbUrl) {
  try {
    const adminDbConnection = await mongoose.createConnection(adminDbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const existingAdmin = await AdminUser.findOne({
      email: "admin@gmail.com",
    });

    if (!existingAdmin) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync("adminpassword", salt);

      const newAdmin = new AdminUser({
        email: "admin@gmail.com",
        password: hash,
        scope: ["sso.write"],
      });

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
    if (!adminUser) return res.status(404).json({ error: "Admin not found" });

    const isPasswordValid = bcrypt.compareSync(password, adminUser.password);

    if (!isPasswordValid)
      return res.status(401).json(new ErrorResponse("Invalid credentials"));

    let accessTokenTtl = "6000";

    const roles = "scribble_admin";
    const scopes = ["sso.write"];
    const accessToken = await tokens.createTokenV2(
      {
        user_id: adminUser._id,
        roles,
        scopes,
      },
      accessTokenTtl,
    );

    const refreshToken = await tokens.createRefreshToken(
      adminUser._id,
      accessTokenTtl,
    );

    const responseInst = {
      email: adminUser.email,
      userId: adminUser._id,
      firstname: adminUser.firstname,
      lastname: adminUser.lastname,
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
    return res.json(new ErrorResponse(err));
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
    const { roleName, scope } = user.roleId;

    if (!user) return res.status(404).json(new ErrorResponse("User not found"));
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      await UserModel.updateOne(
        { _id: user._id }, // Filter: find the user by ID
        { $inc: { loginAttempts: 1 } }, // Increment loginAttempts by 1
      );
      if (user.loginAttempts > 3) {
        return res
          .status(401)
          .json(
            new ErrorResponse(
              `${user.loginAttempts + 1} times entered wrong password`,
            ),
          );
      }

      return res.status(401).json(new ErrorResponse("Invalid credentials"));
    }

    let accessTokenTtl = "6000";

    const roles = [roleName];
    const scopes = scope;
    const accessToken = await tokens.createTokenV2(
      {
        user_id: user._id,
        roles,
        scopes,
      },
      accessTokenTtl,
    );

    const refreshToken = await tokens.createRefreshToken(
      user._id,
      accessTokenTtl,
    );

    const responseInst = {
      email: user.email,
      userId: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      tenantId: user.tenantId,
      roles,
      scopes,
      accessToken,
      refreshToken,
      created: user.createdAt,
      updated: user.updatedAt,
    };
    return res.json(new SuccessResponse(responseInst));
  } catch (err) {
    return res.json(new ErrorResponse(err));
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

  try {
    const existingTenant = await Tenant.findOne({ tenantName });
    if (existingTenant) {
      return res.status(400).json(new ErrorResponse("Tenant already exists"));
    }

    // Save tenant details in adminDB
    const tenant = new Tenant({
      tenantName: tenantName,
      databaseName: tenantName,
      createdBy: req.user,
    });
    await tenant.save();

    await tenantModels.init(tenantName);

    return res
      .status(201)
      .json(
        new SuccessResponse({ message: "Tenant created successfully", tenant }),
      );
  } catch (error) {
    console.error("Tenant creation error:", error);
    res.status(500).json(new ErrorResponse(error));
  }
};



const getTenant = async (req, res) => {

  try {
    const existingTenants = await Tenant.find({});

    return res
      .status(201)
      .json(
        new SuccessResponse({ data: existingTenants }),
      );
  } catch (error) {
    console.error("Error on getting tenants:", error);
    res.status(500).json(new ErrorResponse(error));
  }
};

const getRoles = async (req, res) => {

  try {
    const { "x-tenant-id": tenantId } = req.query;

    const tenant = await Tenant.findById(tenantId);

    // If tenant not found, return an error
    if (!tenant) {
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Tenant not found" }));
    }

    const connection = await getTenantDB(tenant.databaseName);
    
           const RoleModel = Role(connection);
   
    const role = await RoleModel.find();

    if (!role) {
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Role not found" }));
    }
    return res
    .status(201)
    .json(
      new SuccessResponse({ data: role }),
    );
  } catch (error) {
    console.error("Error on getting roles:", error);
    res.status(500).json(new ErrorResponse(error));
  }
};

/**
This function creates record in UserInfo table
*/
async function createUserInfo(req, userId, roleName, connection) {
  const { email, name, firstname, lastname, contact, company, transaction } =
    req.body;

  switch (roleName) {
    case "user": {
      const clinicianModel = Clinitian_Info(connection);
      return await clinicianModel.create({ userId, name, contact });
    }
    case "userAdmin": {
      const adminModel = Admin_Info(connection);
      return await adminModel.create({ userId, name, contact });
    }
  }
}

const register = async (req, res) => {
  try {
    const { email, roleId, "x-tenant-id": tenantId } = req.body;

    if (!tenantId) {
      return res
        .status(400)
        .json(
          new ErrorResponse({ message: "Tenant ID is required in headers" }),
        );
    }
    const tenant = await Tenant.findById(tenantId);

    // If tenant not found, return an error
    if (!tenant) {
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Tenant not found" }));
    }

    const connection = await getTenantDB(tenant.databaseName);

    const RoleModel = Role(connection);
    const role = await RoleModel.findById(roleId);

    if (!role) {
      return res
        .status(400)
        .json(new ErrorResponse({ message: "Role not found" }));
    }

    const UserModel = User(connection);

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json(new ErrorResponse("User already exists"));
    }
    const password = generateRandomPassword();
    const hashedPassword = generateHashedPassword(password);

    const newUser = await UserModel.create({
      email,
      password: hashedPassword,
      roleId,
      tenantId,
    });

    await createUserInfo(req, newUser.id, role.roleName, connection);
    await sendAccountVerificationEmail(email, password);

    res.status(201).json(new SuccessResponse(newUser));
  } catch (err) {
    console.error(err);
    res.status(500).json(new ErrorResponse(err.message));
  }
};

/**
This function is to reset the login attempts in UserAccount Table
*/
const resetLoginAttemptsIfNeeded = async (account) => {
  if (account.login_attempts !== 0) {
    await UserAccount.update(
      { login_attempts: 0 },
      { where: { user_id: account.user_id } },
    );
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
    const account = await UserAccount.findOne({
      where: {
        user_id: tokenDetails.user,
      },
      include: [
        {
          model: LoginType,
          attributes: ["name"],
        },
        {
          model: UserRole,
          attributes: ["role_id"],
          include: [
            {
              model: Role,
              attributes: ["name"],
              include: [
                {
                  model: Scope,
                  attributes: ["name"],
                  through: { attributes: [] },
                },
              ],
            },
          ],
          distinct: true,
        },
      ],
    });

    if (!account) {
      throw new HTTPError(400, "Invalid identity", ERROR_CODES.NOT_FOUND);
    }
    const accessTokenTtl =
      account.LoginType.name === "VIN"
        ? nconf.get("JWT_VIN_VALIDITY")
        : nconf.get("JWT_VALIDITY");

    const response = await session.checkIfRefreshTokenExists(account.user_id);
    logger.info("checkIfRefreshTokenExists response: ", {
      response,
    }); // Validate if it exists in session store
    if (!response || response !== refreshToken) {
      throw new HTTPError(
        401,
        "Session expired! Login again",
        ERROR_CODES.EXPIRED_TOKEN,
      );
    }
    const accessToken = await tokens.createTokenV2(
      {
        user_id: account.user_id,
        roles: account.UserRoles.map((r) => r.Role.name),
        scopes: utils.getScopeNamesFromRoles(account.UserRoles),
      },
      false,
      accessTokenTtl,
    );

    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: true,
      sameStrict: "strict",
    });
    // Update redis with new accesstoken for particular refreshtoken
    await session.storeAccessToken(
      account.user_id,
      accessToken,
      accessTokenTtl,
    );

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
        "INCORRECT_CURRENT_PASSWORD",
      );

    // New password can not be the same as the current password
    if (bcrypt.compareSync(newPassword, req.user.password))
      throw new HTTPError(
        403,
        "Your new password cannot be the same as your current password.",
        "SAME_AS_CURRENT_PASSWORD",
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
      { $set: { password: hash } }, // Update password field
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
    const email = get(req, ["body", "email"], "");

    // Get isPortalUser from the request body; default to false if not provided
    const isPortalUser = get(req, ["body", "isPortalUser"], false);

    // Email should not be empty / missing
    if (isEmpty(email))
      throw new HTTPError(400, "Email is required", ERROR_CODES.MISSING_DATA);

    // Restrict if there is external authority for domain
    restrictIfExternalAuthority(email);

    // Fetch the account by email
    const account = await UserEmailLoginInfo.findByPk(email);
    let username;
    if (account) {
      const userInfo = await UserInfo.findOne({
        where: { email_address: account.email_address },
        attributes: ["firstname"],
      });
      username = userInfo.firstname;
    }

    const { canResend, canResendIn } = await canResendEmailNow(
      email,
      RECOVER_PASSWORD_EMAIL,
    );
    if (!canResend)
      throw new HTTPError(
        400,
        `Email was recently sent. Can only be resent after ${Math.ceil(
          canResendIn / 60000,
        )} mins`,
        ERROR_CODES.FIVE_MINUTES_DELAY_ERROR,
      );

    // Verify if user is registered
    if (!account)
      throw new HTTPError(400, "Account does not exist", ERROR_CODES.NOT_FOUND);

    const token = await tokens.createTokenV2(
      {
        user_id: account.user_id,
        roles: ["user"],
        scopes: ["sso.self.write"],
      },
      false,
      +nconf.get("JWT_VALIDITY_PASSWORD_RECOVERY_LINK"),
      "recover-password",
    );

    let passwordRecoveryLink;
    if (isPortalUser) {
      passwordRecoveryLink = `${nconf.get("WEB_BASE_URL")}/forgot-password/${
        account.email_address
      }/${token}/`;
    } else {
      passwordRecoveryLink = `${nconf.get("WEB_BASE_URL")}/recover-password/${
        account.email_address
      }/${token}/`;
    }

    // Send the Email containing password recovery link to the user's email
    //   emails
    //       .sendPasswordResetEmail(
    //           account.email_address,
    //           passwordRecoveryLink,
    //           isPortalUser,
    //           username
    //       )
    //       .then(async (data) => {
    //           logger.info(data.MessageId);
    //           // Add a new password recovery request [AG-892]
    //           const userRequest = await UserRequest.findOne({
    //               where: {
    //                   request_type: RECOVER_PASSWORD_EMAIL,
    //               },
    //               include: [
    //                   {
    //                       model: UserAccount,
    //                       required: true,
    //                       include: [
    //                           {
    //                               model: UserEmailLoginInfo,
    //                               required: true,
    //                               where: {
    //                                   email_address: email,
    //                               },
    //                           },
    //                       ],
    //                   },
    //               ],
    //           });

    //           // eslint-disable-next-line promise/always-return
    //           if (userRequest) await userRequest.destroy();
    //           await UserRequest.create({
    //               user_id: account.user_id,
    //               status: "PENDING",
    //               request_type: RECOVER_PASSWORD_EMAIL,
    //           });
    //           res.status(200).json(new SuccessResponse(`RECOVER_PASSWORD`));
    //       })
    //       .catch((err) => {
    //           logger.error("Error on sending password reset email", {
    //               error: err,
    //               apiId: req?.apiId,
    //           });
    //           res.status(500).json("Could not send password recovery link.");
    //       });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ErrorResponse(err, err.errorCode, req?.apiId, err.data));
  }
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
    const email = get(req, ["body", "email"], "");
    if (isEmpty(email))
      throw new HTTPError(
        400,
        "Missing Mandatory fields - Email",
        ERROR_CODES.MISSING_DATA,
      );

    // Fetch the account by email
    const account = await UserEmailLoginInfo.findByPk(email);

    // Verify if user is registered
    if (!account)
      throw new HTTPError(400, "Account does not exist", ERROR_CODES.NOT_FOUND);

    // If password already reset using the one time link then terminate the request [AG-892]
    const userRequest = await UserRequest.findOne({
      where: { user_id: account.user_id, request_type: RECOVER_PASSWORD_EMAIL },
    });
    if (!userRequest)
      throw new HTTPError(500, "Email not sent yet!", ERROR_CODES.GENERAL);
    if (userRequest.status === "COMPLETE")
      throw new HTTPError(
        500,
        "Password already updated! Generate another one time link if you want to reset again.",
        ERROR_CODES.GENERAL,
      );

    // Fetch the new password
    const newPassword = get(req, ["body", "newPassword"], "");
    if (isEmpty(newPassword))
      throw new HTTPError(
        400,
        "Missing Mandatory fields - Password",
        ERROR_CODES.MISSING_DATA,
      );

    // Do not persist in DB if doNotPersist is true
    // Will be triggered by FE (Before rendering the form to reset password) to check things like -
    // - If the One Time Link has already been used
    // - If the token has expired
    const doNotPersist = get(req, ["body", "doNotPersist"], false);
    if (doNotPersist)
      return res.json(
        "DO NOT PERSIST Request ran successfully without any issue",
      );

    // Validate the new password
    await validatePassword(newPassword);

    // New password can not be same as existing password [AG-892]
    if (bcrypt.compareSync(newPassword, account.password))
      throw new HTTPError(
        500,
        "Your new password cannot be the same as your current password.",
        ERROR_CODES.GENERAL,
      );

    // Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    // Update the password
    account.password = hashedPassword;
    await account.save();

    // Mark the request as COMPLETE [AG-892]
    userRequest.status = "COMPLETE";
    await userRequest.save();

    // Send response
    return res.json("Password updated successfully");
  } catch (err) {
    return res
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
  getRoles
};
