const {
    toNumber,
    isString,
    isNumber,
    isUndefined,
    isArray,
    find,
    unionBy,
    has,
} = require("lodash");
const moment = require("moment");
const validator = require("validator");
const { validate: validateUuuidV4 } = require("uuid");
const { MINIMUM_ALLOWED_YEAR } = require("./constants/misc");

module.exports = {
    "post/api/v1/auth/login": [
        {
            input: "username",
            isInvalid: (input) => typeof input !== "string",
            messageOnValidationFail: "username is invalid",
        },
        {
            input: "password",
            isInvalid: (input) => typeof input !== "string",
            messageOnValidationFail: "password is invalid",
        },
    ],
};
