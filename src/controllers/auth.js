const jwt = require("jsonwebtoken");
const AdminUser = require("../model/scribble-admin/admin-user.js");
const UserSchema = require("../model/tenant/user.js");
const fs=require('fs');
const path=require('path');
const tenantModels = require("../model/tenant/index");

const { getConnection } = require('../lib/dbManager.js');
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');


const Tenant = require("../model/scribble-admin/tenants");
const getTenantDB = require("../lib/dbManager.js");
const User = require("../model/tenant/user");
const AssessmentForms = require("../model/tenant/assessment-forms.js");


require("dotenv").config();
const {
  responses: {
      SuccessResponse,
      HTTPError,
      ERROR_CODES,
  },

//   emails,
  logger,
  tokens, session
} = require("../lib");



async function adminLogin(req,res) {
    const { username, password } = req.body;


    const adminUser = await AdminUser.findOne({ username });
    if (!adminUser) return res.status(404).json({ error: 'Admin not found' });

    const isPasswordValid = await bcrypt.compare(password, adminUser.password);
    if (!isPasswordValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: adminUser._id, username: adminUser.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ token});
}


async function userLogin(req,res) {
    try {
        const { "x-tenant-id": tenantId } = req.headers;
        const { username = "", password = "" } = req.body;
    
    
        const adminConnection = await getConnection(tenantId);
        const AdminUser = adminConnection.model('AdminUser', new mongoose.Schema({
            username: String,
            password: String,
        }));
    
        const adminUser = await AdminUser.findOne({ username });
        if (!adminUser) return res.status(404).json({ error: 'Admin not found' });
    
        const isPasswordValid = await bcrypt.compare(password, adminUser.password);
        if (!isPasswordValid) return res.status(401).json({ error: 'Invalid credentials' });
    
        const token = jwt.sign({ userId: adminUser._id, username: adminUser.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        return res.status(200).json({ token});

        // const account = await fetchAccountDetails(username);
    
        // if (!account) {
        //     throw new HTTPError(
        //         401,
        //         "Invalid credentials, please try again.",
        //         ERROR_CODES.NOT_FOUND
        //     );
        // }
    
        // if (account.is_locked) {
        //     logger.error(
        //         `Account has been locked. [userId - ${account.user_id}, email - ${username}]`
        //     );
        //     throw new HTTPError(
        //         401,
        //         `Your account has been locked, please contact administrator. [email - ${username}]`,
        //         ERROR_CODES.INVALID_DATA
        //     );
        // }
    
        // if (account.is_deleted) {
        //     logger.error(
        //         `Account has been soft deleted. [userId - ${account.user_id}, email - ${username}]`
        //     );
        //     throw new HTTPError(
        //         401,
        //         `Your account has been soft deleted. [email - ${username}]`,
        //         ERROR_CODES.INVALID_DATA
        //     );
        // }
    
        // await validatePwd(account, password);
    
        // if (!account.is_verified) {
        //     throw new HTTPError(
        //         401,
        //         `This account has not been verified. [userId - ${account.user_id}, email - ${username}]`,
        //         ERROR_CODES.VERIFIED_ACCOUNT
        //     );
        // }
    
        // await resetLoginAttemptsIfNeeded(account);
    
        // return account;
    } catch (err) {
        if (err?.statusCode !== 401) {
            logger.error(`Error in basicAuthEmail function :`, {
                error: err,
                apiId: req?.apiId,
            });
        }
        throw new HTTPError(
            err.statusCode || 500,
            err.message || "Internal Server Error",
            ERROR_CODES[err.errorCode] || ERROR_CODES.INVALID_CODE
        );
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
            const admin = await adminLogin(req,res);

        }else{
            const user = await userLogin(req,res);

        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
    
   
};


const createTenant = async (req, res) => {
    const { name, dbName } = req.body;

    try {
        // Save tenant details in adminDB
        const tenant = new Tenant({ name, dbName });
        await tenant.save();

        // Create a new tenant database
        const tenantDB = await getTenantDB(dbName);

        // Initialize models in the new database
        const AssessmentFormsModel = AssessmentForms(tenantDB);
        const UserModel = User(tenantDB);
        const TenantModel = Tenant(tenantDB);

        // Create default role & admin user
        const adminRole = await AssessmentFormsModel.create({ name: "Admin", permissions: ["ALL"] });
        await UserModel.create({ name: "Admin User", email: "admin@example.com", role: adminRole._id });
        await TenantModel.create({ name: "Admin User", email: "admin@example.com", role: adminRole._id });

        return res.status(201).json({ message: "Tenant created successfully", tenant });
    } catch (error) {
        console.error("Tenant creation error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
This function finds the returns account data from UserAccount Table
*/
const fetchAccountDetails = async (username) => {
  const account = await UserAccount.findOne({
      attributes: [
          "user_id",
          "country_id",
          "status",
          "is_verified",
          "is_locked",
          "is_deleted",
          "login_attempts",
          "login_type_id",
          "created_at",
          "updated_at",
      ],
      include: [
          {
              model: UserInfo,
              attributes: [
                  [sequelize.fn("initcap", sequelize.col("firstname")), "firstname"],
                  [sequelize.fn("initcap", sequelize.col("lastname")), "lastname"],
                  [sequelize.fn("initcap", sequelize.col("org_name")), "org_name"],
                  "mobile",
                  "email_address",
              ],
              where: {
                  email_address: username,
              },
          },
          {
              model: UserEmailLoginInfo,
              attributes: ["password"],
          },
          { model: UserRequest, attributes: ["request_code"] },
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
  return account;
};

/**
This function Validates the account password given is correct or not
*/
const validatePwd = async (account, password) => {
  const bcryptStartDate = new Date().valueOf();
  const isPasswordValid = bcrypt.compareSync(password, account.UserEmailLoginInfo.password);

  logger.info(`bcrypt query completed in ${new Date().valueOf() - bcryptStartDate} ms`);

  if (!isPasswordValid) {
      throw new HTTPError(
          401,
          "Invalid credentials, please try again.",
          ERROR_CODES.INVALID_DATA
      );
  }
};

/**
This function is to reset the login attempts in UserAccount Table
*/
const resetLoginAttemptsIfNeeded = async (account) => {
  if (account.login_attempts !== 0) {
      await UserAccount.update({ login_attempts: 0 }, { where: { user_id: account.user_id } });
  }
};


const createTenant1 = async (req, res) => {
    try {
        const { tenantName } = req.body;
    
        if (!tenantName) {
          return res.status(400).json({ error: "Organisation name is required" });
        }
    
        const dbUri = `mongodb://localhost:27017/${tenantName}`;
        const conn = mongoose.createConnection(dbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    
        // Load models dynamically
        const models = {};
        const modelFiles = fs.readdirSync(path.join(__dirname, "..",'/model/tenant'));
        modelFiles.forEach((file) => {
            const modelFile = require(path.join(path.join(__dirname, "..",'/model/tenant'), file));
            const model = modelFile.default || modelFile; // Handle ES6 module exports
            if (typeof model === 'function') {
                const registeredModel = model(conn, mongoose);
                models[registeredModel.modelName] = registeredModel;
            } else {
                console.error(`Invalid model export in file: ${file}`);
            }
        });
    
        conn[tenantName] = { conn, models };
        console.log(`Tenant database ${tenantName} created successfully`);
    
  
        res.status(200).json({ message: `Tenant ${tenantName} created successfully` });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
      }
    
   
};

/**
This function send Verification mail to the user
*/
async function sendVerificationEmail(email, code, userId, roleScopes) {
  const queryParams = qs.stringify({ code, user_id: userId });
  const encrypted = encryptText(queryParams);
//   await emails.sendAccountVerificationEmail(email, encrypted, roleScopes[0].name);
}


/**
This function creates record in UserInfo table
*/
async function createUserInfo(
  email,
  firstname,
  lastname,
  mobileNumber,
  company,
  userId,
  transaction
) {
  return UserInfo.create(
      {
          user_info_id: uuidv4(),
          user_id: userId,
          email_address: email,
          firstname,
          lastname,
          mobile: mobileNumber,
          org_name: company,
      },
      { transaction }
  ).then((data) => data.toJSON());
}


const register = async (req, res) => {

  try {
    const {
        username,
        password,
        firstname,
        lastname,
        company,
        country_code: countryCode,
        country,
    } = req.body;

    const currentPath = req.get("X-Current-Path");

    const role = getRoleFromPath(currentPath);

    await validateEmail(username);

    const existingAccount = await UserEmailLoginInfo.findByPk(email);
    if (existingAccount) {
        throw new HTTPError(400, "Account already exists", ERROR_CODES.INVALID_DATA);
    }

    const [loginType, dbRoles] = await fetchLoginTypeAndRoles(roles);

    const userId = externalId || (UNIQUE_IDENTITIES ? uuidv4() : email.split("@")[0]);
    const { hash, code } = generateHashAndCode(password);

    const roleIds = [];
    const userRoles = createUserRoles(dbRoles, userId, roleIds);

    const transaction = await sequelize.transaction();
    try {
        const userAccount = await createUserAccount(
            transaction,
            loginType,
            userId,
            country,
            verified
        );
        const [userVinLoginInfo, userInfo, userRequest, roleScopes] = await Promise.all([
            createUserVinLoginInfo(email, hash, userId, transaction),
            createUserInfo(email, firstname, lastname, mobileNumber, company, userId, transaction),
            createUserRequest(userId, code, transaction),
            fetchRoleScopes(roleIds),
            createUserRolesInDB(userRoles, transaction),
        ]);
        await transaction.commit();

        if (!verified) {
            await sendVerificationEmail(email, code, userAccount.user_id, roleScopes);
        }

        return formatAccountResponse(
            userAccount,
            userInfo,
            userVinLoginInfo,
            userRequest,
            roleScopes
        );
    } catch (error) {
        logger.info(error);
        await transaction.rollback();
        throw error;
    }

    

    return res.json(new SuccessResponse(data.data));
} catch (err) {
    return handleAxiosErrorMessage(err, req, res);
}
  const { username, email, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await AdminUser.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Create a new user instance
    const newUser = new AdminUser({
      username,
      email,
      password, // The password will be hashed automatically in the pre-save hook
    });

    // Save the user to the database
    await newUser.save();

    res.status(201).json({
      message: "AdminUser registered successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
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
          throw new HTTPError(401, "Session expired! Login again", ERROR_CODES.EXPIRED_TOKEN);
      }
      const accessToken = await tokens.createTokenV2(
          {
              user_id: account.user_id,
              roles: account.UserRoles.map((r) => r.Role.name),
              scopes: utils.getScopeNamesFromRoles(account.UserRoles),
          },
          false,
          accessTokenTtl
      );

      res.cookie("token", accessToken, {
          httpOnly: true,
          secure: true,
          sameStrict: "strict",
      });
      // Update redis with new accesstoken for particular refreshtoken
      await session.storeAccessToken(account.user_id, accessToken, accessTokenTtl);

      res.json(new SuccessResponse({ accessToken }));
  } catch (err) {
      res.status(err.statusCode || 500).json(
          new ErrorResponse(err, err.errorCode, req?.apiId, err.data)
      );
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
      const { user: account } = req;
      const { newPassword, oldPassword } = req.body;

      restrictIfExternalAuthority(account.UserEmailLoginInfo?.email);

      // Current password entered by user should be correct to be allowed to change it
      if (!bcrypt.compareSync(oldPassword, account.UserEmailLoginInfo?.password))
          throw new HTTPError(
              400,
              "Current password entered is incorrect",
              "INCORRECT_CURRENT_PASSWORD"
          );

      // New password can not be the same as the current password
      if (bcrypt.compareSync(newPassword, account.UserEmailLoginInfo?.password))
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
      account.password = hash;
      await UserEmailLoginInfo.update(
          {
              password: hash,
          },
          {
              where: {
                  email_address: account.UserEmailLoginInfo?.email_address,
              },
          }
      );

      res.json(new SuccessResponse({ message: "Password updated." }));
  } catch (err) {
      res.status(err.statusCode || 500).json(
          new ErrorResponseNew(err, err.errorCode, req?.apiId, err.data)
      );
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
      if (isEmpty(email)) throw new HTTPError(400, "Email is required", ERROR_CODES.MISSING_DATA);

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

      const { canResend, canResendIn } = await canResendEmailNow(email, RECOVER_PASSWORD_EMAIL);
      if (!canResend)
          throw new HTTPError(
              400,
              `Email was recently sent. Can only be resent after ${Math.ceil(
                  canResendIn / 60000
              )} mins`,
              ERROR_CODES.FIVE_MINUTES_DELAY_ERROR
          );

      // Verify if user is registered
      if (!account) throw new HTTPError(400, "Account does not exist", ERROR_CODES.NOT_FOUND);

      const token = await tokens.createTokenV2(
          {
              user_id: account.user_id,
              roles: ["user"],
              scopes: ["sso.self.write"],
          },
          false,
          +nconf.get("JWT_VALIDITY_PASSWORD_RECOVERY_LINK"),
          "recover-password"
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
      res.status(err.statusCode || 500).json(
          new ErrorResponse(err, err.errorCode, req?.apiId, err.data)
      );
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
          throw new HTTPError(400, "Missing Mandatory fields - Email", ERROR_CODES.MISSING_DATA);

      // Fetch the account by email
      const account = await UserEmailLoginInfo.findByPk(email);

      // Verify if user is registered
      if (!account) throw new HTTPError(400, "Account does not exist", ERROR_CODES.NOT_FOUND);

      // If password already reset using the one time link then terminate the request [AG-892]
      const userRequest = await UserRequest.findOne({
          where: { user_id: account.user_id, request_type: RECOVER_PASSWORD_EMAIL },
      });
      if (!userRequest) throw new HTTPError(500, "Email not sent yet!", ERROR_CODES.GENERAL);
      if (userRequest.status === "COMPLETE")
          throw new HTTPError(
              500,
              "Password already updated! Generate another one time link if you want to reset again.",
              ERROR_CODES.GENERAL
          );

      // Fetch the new password
      const newPassword = get(req, ["body", "newPassword"], "");
      if (isEmpty(newPassword))
          throw new HTTPError(
              400,
              "Missing Mandatory fields - Password",
              ERROR_CODES.MISSING_DATA
          );

      // Do not persist in DB if doNotPersist is true
      // Will be triggered by FE (Before rendering the form to reset password) to check things like -
      // - If the One Time Link has already been used
      // - If the token has expired
      const doNotPersist = get(req, ["body", "doNotPersist"], false);
      if (doNotPersist)
          return res.json("DO NOT PERSIST Request ran successfully without any issue");

      // Validate the new password
      await validatePassword(newPassword);

      // New password can not be same as existing password [AG-892]
      if (bcrypt.compareSync(newPassword, account.password))
          throw new HTTPError(
              500,
              "Your new password cannot be the same as your current password.",
              ERROR_CODES.GENERAL
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
  createTenant
};
