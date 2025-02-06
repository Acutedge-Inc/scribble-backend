const nconf = require("nconf");
const axios = require("axios");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const util = require("util");
const moment = require("moment");

const logger = require("./logger");
const { ErrorResponse, HTTPError, ERROR_CODES } = require("./responses");
const session = require("./redis");

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
    const data = await jwtVerify(
      token,
      nconf.get("NODE_ENV") === "local"
        ? nconf.get("jwtConfig").accessTokenSecret
        : nconf.get("backendConfig").jwt_accessTokenSecret,
    );
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
      ERROR_CODES.MISSING_REQUIRED_SCOPES,
    );
  }
};

// eslint-disable-next-line no-unused-vars
function protect(requiredScopes = [], ignoreExpiration = false) {
  return async (req, res, next) => {
    // verify header
    const rawToken = extractTokenFromRequest(req);
    if (!rawToken) {
      return res
        .status(401)
        .json(
          new ErrorResponse("No authorization token was found", req?.apiId),
        );
    }

    // verify token
    try {
      // verify token
      const tokenData = await verifyToken(rawToken);

      // query account
      const identity = tokenData.v === 3 ? tokenData.sub : tokenData.id;

      const response = await session.checkIfAccessTokenExists(identity);
      if (!response || response !== rawToken) {
        throw new HTTPError(403, "Token invalid", ERROR_CODES.INVALID_TOKEN);
      }

      const meApiResponseFromCache =
        await session.getResponseFromMeApi(identity);

      if (meApiResponseFromCache) {
        // add in req and return from here
        req.user = { ...meApiResponseFromCache, token: rawToken };
        throwErrorIfMissingRequiredScopes(
          requiredScopes,
          meApiResponseFromCache.scopes,
        );
        return next();
      }

      const userResponse = await axios({
        method: "get",
        url: `${nconf.get("SSO_API_BASE")}/auth/v1/me`,
        headers: {
          authorization: `Bearer ${rawToken}`,
          "content-type": req.headers["content-type"] || "application/json",
        },
      });

      if (!userResponse?.data?.data) {
        throw new HTTPError(401, "Invalid SSO data", ERROR_CODES.INVALID_DATA);
      }

      // const user = await User.findOne({ where: { sso_id: userResponse.data.data.userId } });

      logger.info(
        `Received token on endpoint ${req.method} ${req.originalUrl} for user ${userResponse.data.data.userId}`,
      );

      throwErrorIfMissingRequiredScopes(
        requiredScopes,
        userResponse.data.data.scopes,
      );
      // store user model in request
      userResponse.data.data.token = rawToken;

      req.user = userResponse.data.data;
      const { token, ...userDataWithoutToken } = userResponse.data.data;
      logger.info(`Tokeen: ${token}`);
      await session.setResponseFromMeApi(
        identity,
        userDataWithoutToken,
        +nconf.get("JWT_VALIDITY"),
      );
      return next();
    } catch (err) {
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
              "INVALID_TOKEN",
            ),
          );
      return res
        .status(401)
        .json(new ErrorResponse("Invalid token", req?.apiId, "INVALID_TOKEN"));
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
          new ErrorResponse("No authorization token was found", req?.apiId),
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
          },
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
              "INVALID_TOKEN",
            ),
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
