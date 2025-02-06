const logger = require("./logger");
const ERROR_CODES = {
  GENERAL_ERROR: "GENERAL_ERROR",
  WRONG_INPUT: "WRONG_INPUT",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  WRONG_CREDENTIALS: "WRONG_CREDENTIALS",
  MISSING_DATA: "MISSING_DATA",
  INVALID_DATA: "INVALID_DATA",
  MISSING_REQUIRED_SCOPES: "MISSING_REQUIRED_SCOPES",
  EXPIRED_TOKEN: "EXPIRED_TOKEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  INVALID_SIGNER: "INVALID_SIGNER",
  ACCOUNT_VERIFICATION_PENDING: "ACCOUNT_VERIFICATION_PENDING",
};

class SuccessResponse {
  constructor(data = {}, total = null, otherValues = null) {
    this.status = "ok";
    this.data = data;

    if (Array.isArray(data) || total) {
      this.total_records_available = total || data.length;
    }

    if (otherValues) {
      Object.keys(otherValues).forEach((key) => {
        this[key] = otherValues[key];
      });
    }
  }
}

class ErrorResponse {
  constructor(
    error = "",
    apiId = null,
    errorCode = ERROR_CODES.GENERAL_ERROR,
    data = null,
  ) {
    logger.error("Error on Processing Request ::", {
      error: error instanceof Error ? error?.stack : error,
      apiId,
    });
    let errorMessage = "";
    if (typeof error === "string") errorMessage = error;
    else if (error?.name === "ReferenceError" || error?.name === "TypeError") {
      errorMessage = "Some unexpected error found!";
    } else errorMessage = error.message;
    this.status = "error";
    this.errorMessage = errorMessage;
    this.errorCode = errorCode;
    this.data = data;
  }
}

class RoutingServerError {
  constructor(error = "", apiId = null, errorCode = ERROR_CODES.GENERAL_ERROR) {
    logger.error("Error on Processing Routing Server Request ::", {
      error: error instanceof Error ? error?.stack : error,
      apiId,
    });
    let errorMessage = "";
    if (typeof error === "string") errorMessage = error;
    else if (error?.name === "ReferenceError" || error?.name === "TypeError")
      errorMessage = "Some unexpected error found!";
    else errorMessage = error.message;
    this.errors = [
      {
        code: errorCode,
        message: error || errorMessage,
        field: "",
        title: "",
      },
    ];
  }
}

class HTTPError extends Error {
  constructor(
    errorCode = 500,
    message = null,
    fileName = null,
    lineNumber = null,
  ) {
    super(message, fileName, lineNumber);
    this.errorCode = errorCode;
  }
}

module.exports = {
  SuccessResponse,
  RoutingServerError,
  ErrorResponse,
  ERROR_CODES,
  HTTPError,
};
