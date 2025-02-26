const nconf = require("nconf");
const axios = require("axios");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const util = require("util");
const moment = require("moment");
const { getTenantDB } = require("../lib/dbManager.js");
const AdminUser = require("../model/scribble-admin/adminUser.js");
const Tenant = require("../model/scribble-admin/tenants.js");
const Role = require("../model/tenant/role.js");
const User = require("../model/tenant/user.js");

const logger = require("./logger.js");
const session = require("./session-store.js");
const { ErrorResponse, HTTPError, ERROR_CODES } = require("./responses.js");
// const session = require("./redis");

const SCOPES = {
  APPLICATIONS_SUBMIT: "applications.submit",
  APPLICATIONS_LIST_SELF: "applications.list.self",
  APPLICATIONS_WRITE_SELF: "applications.write.self",
  APPLICATIONS_REMOVE_SELF: "applications.remove.self",

  APPLICATIONS_LIST: "applications.list",
  APPLICATIONS_WRITE: "applications.write",
  APPLICATIONS_REMOVE: "applications.remove",

  CATEGORIES_LIST: "categories.list",
  CATEGORIES_WRITE: "categories.write",
  CATEGORIES_REMOVE: "categories.remove",

  REGIONS_LIST: "regions.list",
  REGIONS_WRITE: "regions.write",
  REGIONS_REMOVE: "regions.remove",

  LIST_LIST: "list.list",
  LIST_APPLICATION: "list.application",
  SEARCH_LIST: "search.list",

  HEALTH_LIST: "health.list",
  STATS_LIST: "stats.list",

  SETTINGS_LIST: "settings.list",
  SETTINGS_WRITE: "settings.write",
  SETTINGS_REMOVE: "settings.remove",
};

function extractTokenFromRequest(req) {
  if (
    req.headers.authorization &&
    req.headers.authorization.split(" ")[0] === "Bearer"
  ) {
    return req.headers.authorization.split(" ")[1];
  }

  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}

const jwtVerify = util.promisify(jwt.verify);

/**
 * Perform token verification and decoding
 * @param {String} token
 * @returns {Promise<Object>}
 */
async function verifyToken(token) {
  try {
    const data = await jwtVerify(token, process.env.JWT_SECRET);
    return _.has(data, "value") ? JSON.parse(data.value) : data;
  } catch (err) {
    switch (err.name) {
      case "TokenExpiredError":
        if (
          moment(err.expiredAt).unix() >
          moment().subtract(+nconf.get("JWT_VALIDITY"), "seconds").unix()
        ) {
          throw new HTTPError(401, "Token expired", ERROR_CODES.EXPIRED_TOKEN);
        } else {
          throw new HTTPError(403, "Token invalid", ERROR_CODES.INVALID_TOKEN);
        }

      case "JsonWebTokenError":
        throw new HTTPError(401, "Token invalid", ERROR_CODES.INVALID_TOKEN);
      case "NotBeforeError":
        throw new HTTPError(403, "Token invalid", ERROR_CODES.INVALID_TOKEN);

      default:
        throw new HTTPError(500, err.message, ERROR_CODES.GENERAL);
    }
  }
}

const throwErrorIfMissingRequiredScopes = (requiredScopes, userScopes) => {
  const missingScopes = _.difference(requiredScopes, userScopes);
  if (missingScopes.length !== 0) {
    throw new HTTPError(
      401,
      `Missing required scopes ${missingScopes.join(", ")}`,
      ERROR_CODES.MISSING_REQUIRED_SCOPES
    );
  }
};

// eslint-disable-next-line no-unused-vars
function protect(requiredScopes = [], ignoreExpiration = false) {
  return async (req, res, next) => {
    const rawToken = extractTokenFromRequest(req);
    if (!rawToken) {
      return res
        .status(401)
        .json(
          new ErrorResponse("No authorization token was found", req?.apiId)
        );
    }

    try {
      const tokenData = await verifyToken(rawToken);

      const identity = tokenData.v === 3 ? tokenData.sub : tokenData.id;

      const response = await session.checkIfAccessTokenExists(identity);
      if (!response || response !== rawToken) {
        throw new HTTPError(403, "Token invalid", ERROR_CODES.INVALID_TOKEN);
      }

      let tenantId;

      // Superadmin Case
      if (tokenData.roles === "scribble_admin") {
        const { "x-tenant-id": tenantIdBody } = req.body;
        const { "x-tenant-id": tenantIdQuery } = req.query;
        tenantId = tenantIdBody || tenantIdQuery;
        req.tenantId = tenantId;

        req.user = await AdminUser.findById(identity);
        if (!req.user) {
          throw new HTTPError(403, "Admin not found", ERROR_CODES.INVALID_USER);
        }

        throwErrorIfMissingRequiredScopes(requiredScopes, req.user.scope);
      }

      // Tenant Admin Case
      else {
        const { "x-tenant-id": tenantId } = req.headers;

        if (!tenantId) {
          return res
            .status(400)
            .json(new ErrorResponse("Tenant ID is required in headers"));
        }
        req.tenantId = tenantId;
        // Fetch Tenant
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
          return res.status(404).json(new ErrorResponse("Tenant not found"));
        }

        // Attach Tenant Database Connection
        req.tenantDb = tenant.databaseName;
        const connection = await getTenantDB(tenant.databaseName);

        // Fetch User & Role
        const UserModel = User(connection);
        const RoleModel = Role(connection);

        const user = await UserModel.findById(identity).populate({
          path: "roleId",
          select: "roleName scope",
        });

        if (!user && tokenData.roles !== "scribble_admin") {
          return res
            .status(403)
            .json(new ErrorResponse("User not registered to this tenant"));
        }

        throwErrorIfMissingRequiredScopes(
          requiredScopes,
          user?.roleId?.scope || req.user.scope
        );
        req.user = user || req.user;
      }

      return next();
    } catch (err) {
      if (err.response) {
        const errorObj = {
          errorMessage: err?.response || "Invalid token",
          errorCode: "INVALID_TOKEN",
          ...err.response.data,
        };
        return res.status(err.response.status).json(errorObj);
      }
      if (err.message.startsWith("Missing required scopes"))
        return res
          .status(401)
          .json(
            new ErrorResponse(
              "Missing required scopes",
              req?.apiId,
              "INVALID_TOKEN"
            )
          );
      return res
        .status(401)
        .json(
          new ErrorResponse(
            err?.message || "Invalid token",
            req?.apiId,
            "INVALID_TOKEN"
          )
        );
    }
  };
}

/**
 *This function verify the token from the request whether it is generated with 
 our cognito pool or not and secure the APIs without login
 * 
 */
function verify() {
  return async (req, res, next) => {
    const rawToken = extractTokenFromRequest(req);
    if (!rawToken) {
      return res
        .status(401)
        .json(
          new ErrorResponse("No authorization token was found", req?.apiId)
        );
    }

    try {
      const region = nconf.get("AWS_DEFAULT_REGION");
      const { userPoolId } = nconf.get("backendConfig");

      const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
      logger.info(`Verifying Token with ${jwksUrl}`);
      const client = jwksClient({ jwksUri: jwksUrl });

      const getKey = (header, callback) => {
        client.getSigningKey(header.kid, (err, key) => {
          if (err) {
            callback(err);
          } else {
            const signingKey = key.publicKey || key.rsaPublicKey;
            callback(null, signingKey);
          }
        });
      };

      // Verify the token
      await new Promise((resolve, reject) => {
        jwt.verify(
          rawToken,
          getKey,
          {
            algorithms: ["RS256"],
            issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
          },
          (err, decoded) => {
            if (err) {
              reject(err);
            } else {
              resolve(decoded);
            }
          }
        );
      });

      return next();
    } catch (err) {
      logger.error(`Error Verifying Cognito Token: ${err}`);

      if (err.response) {
        const errorObj = {
          errorMessage: "Invalid token",
          errorCode: "INVALID_TOKEN",
          ...err.response.data,
        };
        return res.status(err.response.status).json(errorObj);
      }
      if (err.message.startsWith("Missing required scopes"))
        return res
          .status(401)
          .json(
            new ErrorResponse(
              "Missing required scopes",
              req?.apiId,
              "INVALID_TOKEN"
            )
          );
      return res
        .status(401)
        .json(new ErrorResponse("Invalid token", req?.apiId, "INVALID_TOKEN"));
    }
  };
}

module.exports = {
  protect,
  verify,
  SCOPES,
};
