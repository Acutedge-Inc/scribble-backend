const bcrypt = require("bcryptjs");
const saltRounds = 10;
const { createCipheriv, randomBytes } = require("crypto");
const ENCRYPTION_KEY = "B374A26A71490437AA024E4FADD5B497";
const IV_LENGTH = 16;
const ALGORITHM = "aes-256-cbc";
const accountVerificationTemplate = require("../views/emailer-account-verification.js");
const axios = require("axios");
const { HTTPError } = require("../lib/responses.js");
const qs = require("qs");

const key = Buffer.from(ENCRYPTION_KEY);
module.exports = {
  generateRandomPassword: (length = 12) => {
    try {
      const charset =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@!#";
      let password = "";

      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
      }

      return password;
    } catch (e) {
      console.error(`Error in generateRandomPassword: ${e}`);
      throw e;
    }
  },

  generateHashedPassword: (password) => {
    try {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      return hash;
    } catch (e) {
      console.error(`Error in generating hash: ${e}`);
      throw e;
    }
  },

  getFilterQuery: (reqQuery) => {
    const { limit = 10, page = 0, ...filters } = reqQuery;
    delete filters["x-tenant-id"];

    const parsedLimit = Math.max(parseInt(limit, 10) || 10, 1); // Default 10, minimum 1
    const parsedPage = Math.max(parseInt(page, 10) - 1 || 0, 0); // Default 0, minimum 0
    const parsedOffset = parsedPage * parsedLimit; // Offset calculation

    const orConditions = [];

    for (const key in filters) {
      if (filters[key]) {
        // Use regex for string fields (case-insensitive), otherwise direct match
        const condition =
          typeof filters[key] === "string"
            ? { [key]: { $regex: filters[key], $options: "i" } }
            : { [key]: filters[key] };

        orConditions.push(condition);
      }
    }

    // If no filters provided, return an empty query (matches all)
    const query = orConditions.length > 0 ? { $or: orConditions } : {};

    return { query, parsedLimit, parsedOffset };
  },

  /**
   * Restricts operations if there is an external authority for the domain name
   * of the specified email, by throwing an error with the relevant authority
   * as data property.
   *
   * @param {string} email
   * @throws {HTTPError}
   */
  restrictIfExternalAuthority: (email) => {
    let authority = null;
    Object.keys(nconf.get("ACCOUNT_DOMAIN_AUTHORITIES")).forEach((domain) => {
      if (validator.contains(email, `@${domain}`)) {
        authority = nconf.get("ACCOUNT_DOMAIN_AUTHORITIES")[domain];
      }
    });

    if (authority !== null) {
      const error = new HTTPError(
        400,
        `Unsupported operation for federated account with authority ${authority.TYPE}`,
        ERROR_CODES.FEDERATED_ACCOUNT
      );

      error.data = authority;

      throw error;
    }
  },
  transformDataToNestedObject: (inputArray) => {
    return inputArray.reduce((acc, item) => {
      item.value = item.answer_code;
      const keys = item.question_code.split("."); // Split into multiple levels
      let currentLevel = acc;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!currentLevel[keys[i]]) {
          currentLevel[keys[i]] = {};
        }
        currentLevel = currentLevel[keys[i]];
      }

      currentLevel[keys[keys.length - 1]] = { ...item };
      return acc;
    }, {});
  },
  transformData: (inputArray) => {
    return inputArray.reduce((acc, item) => {
      item.value = item.answer_code;
      item.questionCode = item.question_code;
      item.questionType = item.question_type;

      const [mainCode, subCode] = item.question_code.split(".");
      if (!acc[mainCode]) {
        acc[mainCode] = {};
      }
      acc[mainCode][subCode] = { ...item };
      return acc;
    }, {});
  },

  sendMessageToUIPath: async (message) => {
    try {
      // Get orchestrator config from environment
      const orchestratorUrl = process.env.UIPATH_ORCHESTRATOR_URL;
      const queueName = process.env.UIPATH_QUEUE_NAME;
      const tenantName = process.env.UIPATH_TENANT_NAME;
      const personalAccessToken = process.env.UIPATH_PAT;
      const folderId = process.env.UIPATH_FOLDER_ID;

      const folderResponse = await axios.get(
        `${orchestratorUrl}/odata/Folders?$select=Id,DisplayName`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-UIPATH-TenantName": tenantName,
            Authorization: `Bearer ${personalAccessToken}`,
          },
          timeout: 1000 * 30, // Wait for 30 seconds
        }
      );
      const flattenedMessage = {};
      for (const key in message) {
        if (typeof message[key] === "object") {
          flattenedMessage[key] = JSON.stringify(message[key]);
        } else {
          flattenedMessage[key] = message[key];
        }
      }

      const queueResponse = await axios.post(
        `${orchestratorUrl}/odata/Queues/UiPathODataSvc.AddQueueItem`,
        {
          itemData: {
            Name: queueName,
            SpecificContent: flattenedMessage, // Use flattened object
          },
        },
        {
          headers: {
            Authorization: `Bearer ${personalAccessToken}`,
            "Content-Type": "application/json",
            "X-UIPATH-TenantName": tenantName,
            "X-UIPATH-OrganizationUnitId": folderId, // Folder ID
          },
        }
      );
      console.log("Message sent to UiPath queue", queueResponse.data);
      return queueResponse.data;
    } catch (error) {
      console.error(
        "Failed to send message to UiPath queue",
        error.response?.data || error.message
      );
      throw new Error("Failed to send message to UiPath queue");
    }
  },
};
