const {
  get,
  toLower,
  reduce,
  has,
  isEmpty,
  size,
  join,
  isArray,
  differenceBy,
} = require("lodash");
const { ErrorResponse, ERROR_CODES } = require("../lib/responses.js");
const mandatoryInputs = require("../repositories/mandatory-inputs.js");

module.exports = (req, res, next) => {
  const mandatoryInputsForThisRoute = get(
    mandatoryInputs,
    toLower(`${req.method}${req.originalUrl}`),
    [],
  );

  const requestInputs = req.method === "GET" ? req.query : req.body;

  const missingInputs = reduce(
    mandatoryInputsForThisRoute,
    (result, input) => {
      if (isArray(input)) {
        return differenceBy(input, Object.keys(requestInputs)).length ===
          input.length
          ? [...result, `(${input.join(" or ")})`]
          : result;
      }
      return !has(requestInputs, input) ? [...result, input] : result;
    },
    [],
  );

  if (!isEmpty(missingInputs))
    return res
      .status(400)
      .json(
        new ErrorResponse(
          `Missing input${size(missingInputs) > 1 ? "s" : ""} - ${join(
            missingInputs,
            ", ",
          )}`,
          req?.apiId,
          ERROR_CODES.WRONG_INPUT,
        ),
      );

  return next();
};
