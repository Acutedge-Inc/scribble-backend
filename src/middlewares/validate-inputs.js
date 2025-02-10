const { get, toLower, forEach } = require("lodash");
const { ErrorResponse, ERROR_CODES } = require("../lib/responses.js");
const validationChecks = require("../repositories/validation-checks.js");

module.exports = (req, res, next) => {
  const validationChecksForThisRoute = get(
    validationChecks,
    toLower(`${req.method}${req.originalUrl.split("?")[0]}`),
    [],
  );

  let validationFailed = false;
  let messageOnValidationFail = "";

  forEach(validationChecksForThisRoute, (validationCheck) => {
    if (
      validationCheck.isInvalid(
        req.method === "GET"
          ? req.query[validationCheck.input]
          : req.body[validationCheck.input],
      )
    ) {
      validationFailed = true;
      messageOnValidationFail = validationCheck.messageOnValidationFail;
      return false;
    }
    return true;
  });

  if (validationFailed)
    return res
      .status(400)
      .json(
        new ErrorResponse(
          messageOnValidationFail,
          req?.apiId,
          ERROR_CODES.WRONG_INPUT,
        ),
      );

  return next();
};
