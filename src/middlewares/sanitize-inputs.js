// const sanitize = require("sanitize")();
const validator = require("validator");
const { logger, responses } = require("../lib/index.js");

const { ErrorResponse, ERROR_CODES } = responses;

const validStringPattern = /^[a-zA-Z0-9\s_\-@.+&]*$/;
const validNameStringPattern = /[^a-zA-Z0-9]/g;
const regexForPasswords =
  /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$_-])[A-Za-z\d!@#$_-]{8,20}$/;

const validateURL = (url) =>
  validator.isURL(url, {
    require_protocol: true,
    protocols: ["http", "https"],
  });

module.exports = (req, res, next) => {
  const invalidFields = [];
  const noncheckFields = [
    "description",
    "short_description",
    "changelog",
    "comments",
    "comment",
    "secretKey",
    "cacheKey",
  ];

  const sanitizeAndValidateString = (key, value) => {
    // Sanitize the string
    const sanitizedValue = validator.trim(value);
    // Check if the string matches the regex pattern
    switch (key) {
      case "password":
        if (!regexForPasswords.test(sanitizedValue)) {
          invalidFields.push(key);
        }
        break;

      case "email":
        if (!validator.isEmail(sanitizedValue)) {
          invalidFields.push(key);
        }
        break;

      case "web_url":
        if (!validateURL(sanitizedValue)) {
          invalidFields.push(key);
        }
        break;
      case "support_url":
        if (
          !validateURL(sanitizedValue) &&
          !validator.isEmail(sanitizedValue)
        ) {
          invalidFields.push(key);
        }
        break;

      default:
        if (
          !noncheckFields.includes(key) &&
          !validStringPattern.test(sanitizedValue)
        ) {
          invalidFields.push(key);
        }
        break;
    }
  };

  // normalize name
  const sanitizeNameString = (key, value) => {
    req.body[key] = value.replace(validNameStringPattern, "");
  };

  // Sanitize and validate query parameters
  Object.keys(req.query).forEach((key) => {
    if (typeof req.query[key] === "string") {
      sanitizeAndValidateString(key, req.query[key]);
    }
  });

  // Sanitize and validate body parameters
  Object.keys(req.body).forEach((key) => {
    if (typeof req.body[key] === "string") {
      if (key === "name" && req.url.includes("/applications")) {
        sanitizeNameString(key, req.body[key]);
      } else {
        sanitizeAndValidateString(key, req.body[key]);
      }
    }
  });

  // If there are any invalid fields, return an error response
  if (invalidFields.length > 0) {
    logger.info(`Invalid input for [${invalidFields}]`);
    if (
      invalidFields.includes("username") ||
      invalidFields.includes("password")
    ) {
      return res
        .status(401)
        .json(
          new ErrorResponse(
            "Invalid credentials, please try again.",
            req?.apiId,
            ERROR_CODES.NOT_FOUND,
          ),
        );
    }
    // "Invalid credentials, please try again."
    return res
      .status(400)
      .json(
        new ErrorResponse(
          `Invalid input for [${invalidFields}]`,
          req?.apiId,
          ERROR_CODES.WRONG_INPUT,
        ),
      );
  }

  return next();
};
