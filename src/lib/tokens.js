const util = require("util");
const nconf = require("nconf");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const _ = require("lodash");

const logger = require("./logger.js");
const responses = require("./responses.js");
const session = require("./session-store.js");
const {
  UserAccount,
  UserInfo,
  Role,
  Scope,
  UserRole,
  UserVinLoginInfo,
  UserEmailLoginInfo,
} = require("../model/scribble-admin/index.js");

const { ErrorResponseNew, HTTPError, ERROR_CODES } = responses;
const { SCHEMAS } = require("./utils.js");

// const LEVELS = {
//     user: 10,
//     admin: 20,
// };

const verify = util.promisify(jwt.verify);

/**
 * Perform token verification and decoding
 * @param {String} token
 * @returns {Promise<Object>}
 */
async function verifyToken(token) {
  try {
    const data = await verify(token, nconf.get("jwtConfig").accessTokenSecret);
    return _.has(data, "value") ? JSON.parse(data.value) : data;
  } catch (err) {
    switch (err.name) {
      case "TokenExpiredError":
        if (
          moment(err.expiredAt).unix() >
          moment().subtract(nconf.get("JWT_VALIDITY"), "seconds").unix()
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

/**
 * Perform token verification and decoding for Refresh token
 * @param {String} token
 * @returns {Promise<Object>}
 */
async function verifyRefreshToken(token) {
  try {
    const data = await verify(token, process.env.JWT_SECRET);
    return _.has(data, "value") ? JSON.parse(data.value) : data;
  } catch (err) {
    switch (err.name) {
      case "TokenExpiredError":
        throw new HTTPError(401, "Token expired", ERROR_CODES.EXPIRED_TOKEN);
      case "JsonWebTokenError":
      case "NotBeforeError":
        throw new HTTPError(403, err.message, ERROR_CODES.INVALID_TOKEN);

      default:
        throw new HTTPError(500, err.message, ERROR_CODES.GENERAL);
    }
  }
}

/**
 * Create V1 Token
 * @param {String} identity
 * @returns {Promise<String>}
 */
async function createToken() {
  throw new HTTPError(
    400,
    "This version tokens are no longer supported",
    ERROR_CODES.INVALID_DATA
  );
}

/**
 * Create V2 Token
 * @param {String} identity
 * @returns {Promise<String>}
 */
async function createTokenV2(user, accessTokenTtl, type = "access") {
  logger.info(`Creating token V2 for user: ${user.user_id}`);

  const data = {
    v: 2,
    type,
    id: user.user_id,
    roles: user?.roles,
    scopes: user.scopes,
    issuer: "Scribble",
  };

  return jwt.sign(data, process.env.JWT_SECRET, {
    expiresIn: +accessTokenTtl,
  });
}

/**
 * Create V3 Token
 * @param {String} identity
 * @returns {Promise<String>}
 */
async function createTokenV3(user, ttl) {
  logger.info(`Creating token V3 for user: ${user.user_id}`);

  const tokenValue = {
    v: 3,
    roles: user.roles,
    scopes: user.scopes,
  };
  return jwt.sign(tokenValue, nconf.get("jwtConfig").accessTokenSecret, {
    expiresIn: +ttl,
    subject: user.user_id,
    issuer: nconf.get("JWT_ISSUER"),
  });
}

/**
 * Create a refresh token
 * @param {String} identity
 */
async function createRefreshToken(userId, ttl) {
  const value = {
    type: "refresh",
    user: userId,
  };
  return jwt.sign(value, process.env.JWT_SECRET, {
    expiresIn: +ttl,
    subject: userId.toString(),
    issuer: "Scribble",
  });
}

function handleTokenV3(tokenData, requiredScopes) {
  const diff = _.difference(requiredScopes, tokenData.scopes);
  if (diff.length !== 0) {
    throw new HTTPError(
      403,
      `Missing required scopes ${diff.join(", ")}`,
      ERROR_CODES.MISSING_REQUIRED_SCOPES
    );
  }
}

function authenticate(requiredScopes = [], requiredSchemas = [SCHEMAS.BEARER]) {
  return async (req, res, next) => {
    // return next()
    try {
      // verify header
      if (!req.headers.authorization) {
        throw new HTTPError(
          401,
          "No authorization header",
          ERROR_CODES.MISSING_DATA
        );
      }

      if (
        requiredSchemas.includes(SCHEMAS.BEARER) &&
        req.headers.authorization.startsWith(`${SCHEMAS.BEARER} `)
      ) {
        const parts = req.headers.authorization.split(" ");
        const rawToken = parts[1];

        // verify token
        const tokenData = await verifyToken(rawToken);

        // query account
        const identity = tokenData.v === 3 ? tokenData.sub : tokenData.id;
        logger.debug(
          `Received token V${tokenData.v} on endpoint ${req.method} ${req.originalUrl} for user ${identity}`
        );

        if (tokenData.type !== "recover-password") {
          const response = await session.checkIfAccessTokenExists(identity);
          if (!response || response !== rawToken) {
            throw new HTTPError(
              403,
              "Token invalid",
              ERROR_CODES.INVALID_TOKEN
            );
          }
        }

        const account = await UserAccount.findByPk(identity, {
          include: [
            { model: UserInfo },
            { model: UserVinLoginInfo },
            { model: UserEmailLoginInfo },
            {
              model: UserRole,
              attributes: ["role_id"],
              include: [
                {
                  model: Role,
                  attributes: ["name"],
                  include: [{ model: Scope, attributes: ["name"] }],
                },
              ],
              distinct: true,
            },
          ],
        });
        if (!account || account?.is_deleted) {
          throw new HTTPError(
            403,
            "Account does not exist",
            ERROR_CODES.NOT_FOUND
          );
        }

        switch (tokenData.v) {
          case 2:
            handleTokenV3(tokenData, requiredScopes);
            break;
          case 3:
            handleTokenV3(tokenData, requiredScopes);
            break;
          default:
            throw new HTTPError(
              403,
              `Unsupported token version: ${tokenData.v}`,
              ERROR_CODES.INVALID_TOKEN
            );
        }

        // TODO: store user information instead of account
        req.user = account;
      } else if (
        requiredSchemas.includes(SCHEMAS.KEY) &&
        req.headers.authorization.startsWith(`${SCHEMAS.KEY} `)
      ) {
        const parts = req.headers.authorization.split(" ");
        const key = parts[1];

        // verify key
        if (key !== "super-secret-vcs") {
          throw new HTTPError(403, "Invalid VCS Key", ERROR_CODES.INVALID_DATA);
        }

        req.user = null;
      } else {
        throw new HTTPError(
          401,
          `Unsupported authorization schema. Supported schemas: ${requiredSchemas.join(
            ", "
          )}`,
          ERROR_CODES.INVALID_DATA
        );
      }

      return next();
    } catch (err) {
      logger.error(`err: ${JSON.stringify(err)}`);
      res
        .status(err.statusCode || 403)
        .json(new ErrorResponseNew(err, err.errorCode, req?.apiId));
      return res.end();
    }
  };
}

module.exports = {
  createToken,
  createTokenV2,
  createTokenV3,
  verifyToken,
  authenticate,
  createRefreshToken,
  verifyRefreshToken,
};
