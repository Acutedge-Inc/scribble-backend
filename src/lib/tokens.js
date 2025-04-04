const util = require("util");
const nconf = require("nconf");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const _ = require("lodash");

const logger = require("./logger.js");
const responses = require("./responses.js");

const { ErrorResponseNew, HTTPError, ERROR_CODES } = responses;

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
          throw new HTTPError(419, "Token expired", ERROR_CODES.EXPIRED_TOKEN);
        } else {
          throw new HTTPError(419, "Token invalid", ERROR_CODES.INVALID_TOKEN);
        }

      case "JsonWebTokenError":
        throw new HTTPError(419, "Token invalid", ERROR_CODES.INVALID_TOKEN);
      case "NotBeforeError":
        throw new HTTPError(419, "Token invalid", ERROR_CODES.INVALID_TOKEN);

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
        throw new HTTPError(419, "Token expired", ERROR_CODES.EXPIRED_TOKEN);
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

module.exports = {
  createToken,
  createTokenV2,
  createTokenV3,
  verifyToken,
  createRefreshToken,
  verifyRefreshToken,
};
