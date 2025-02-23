const { unlinkSync, readFileSync } = require("fs");

const { ErrorResponse, ERROR_CODES } = require("../lib/responses.js");
const logger = require("../lib/logger.js");
const {
  getValidationMessageForAllowedMimes,
} = require("../utils/validation.js");

/**
 * @summary Checks if the file is a plain text file by analyzing its content
 * @param filePath {string} File path
 * @returns {boolean} True if the file is a text file, false otherwise
 */
const isTextFile = (filePath) => {
  try {
    const content = readFileSync(filePath, { encoding: "utf8" });

    // Check if the content is readable text
    const isText = /^[\x20-\x7E\r\n\t]*$/.test(content);

    // Additional checks to reject script files
    const isScriptFile =
      /#!|<\?php|<script|function\s+\w+\(|import|export|console\.log/.test(
        content,
      );

    return isText && !isScriptFile;
  } catch (error) {
    logger.info(error);
    return false;
  }
};

/**
 * @summary Validates the file type using magic bytes [AG-741]
 * @param {object} settings # Will contain file paths and allowed mime types
 */
module.exports = async (req, res, next, settings = {}) => {
  try {
    const { filePaths, allowedMimes } = settings;
    // Nothing to verify
    if (!filePaths || !allowedMimes) next();

    // Imported inside middleware as the package supports only ESM import and await import syntax can be written in async context only
    const { fileTypeFromFile } = await import("file-type");

    let allFileTypesValid = true;

    for (const filePath of filePaths) {
      let type = await fileTypeFromFile(filePath);

      if (!type) {
        // Fallback: Determine if the file is plain text
        if (isTextFile(filePath)) {
          type = { mime: "text/plain" };
        }
      }

      if (!type || (type && !allowedMimes.includes(type?.mime))) {
        allFileTypesValid = false;
        unlinkSync(filePath);
        logger.info(
          "Deleted file from Node server as it did not pass file type check",
        );
        break;
      }
    }

    if (!allFileTypesValid) {
      const validationMessage =
        getValidationMessageForAllowedMimes(allowedMimes);
      throw new Error(validationMessage);
    }

    return next();
  } catch (e) {
    return res
      .status(400)
      .json(new ErrorResponse(e, req?.apiId, ERROR_CODES.WRONG_INPUT));
  }
};
