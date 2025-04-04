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
          throw new HTTPError(419, "Token expired", ERROR_CODES.EXPIRED_TOKEN);
        } else {
          throw new HTTPError(403, "Token invalid", ERROR_CODES.INVALID_TOKEN);
        }

      case "JsonWebTokenError":
        throw new HTTPError(419, "Token invalid", ERROR_CODES.INVALID_TOKEN);
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
      403,
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

      if (tokenData.type !== "recover-password") {
        const response = await session.checkIfAccessTokenExists(identity);
        if (!response || response !== rawToken) {
          throw new HTTPError(403, "Token invalid", ERROR_CODES.INVALID_TOKEN);
        }
      }

      let tenantId;

      // Superadmin Case
      if (tokenData.roles === "scribble_admin") {
        const { "x-tenant-id": tenantIdBody } = req.body;
        const { "x-tenant-id": tenantIdQuery } = req.query;
        tenantId = tenantIdBody || tenantIdQuery;
        req.tenantId = tenantId;

        if (tenantId) {
          const tenant = await Tenant.findById(tenantId);
          if (!tenant) {
            return res.status(404).json(new ErrorResponse("Tenant not found"));
          }
          req.tenantDb = tenant.databaseName;
        } else {
          const { "x-tenant-id": tenantIdHeader } = req.headers;

          if (tenantIdHeader) {
            const tenant = await Tenant.findById(tenantId);
            if (!tenant) {
              return res
                .status(404)
                .json(
                  new ErrorResponse(
                    "Tenant Id should not be in header for Super Admin"
                  )
                );
            }
            req.tenantDb = tenant.databaseName;
          }
        }

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
          .status(403)
          .json(
            new ErrorResponse(
              "Missing required scopes",
              req?.apiId,
              "INVALID_TOKEN"
            )
          );
      return res
        .status(419)
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

module.exports = {
  protect,
};
