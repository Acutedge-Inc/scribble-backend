const bcrypt = require("bcryptjs");
const saltRounds = 10;
const { createCipheriv, randomBytes } = require("crypto");
const ENCRYPTION_KEY = "B374A26A71490437AA024E4FADD5B497";
const IV_LENGTH = 16;
const ALGORITHM = "aes-256-cbc";
const accountVerificationTemplate = require("../views/emailer-account-verification.js");

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

    let orConditions = [];

    for (const key in filters) {
      if (filters[key]) {
        // Use regex for string fields (case-insensitive), otherwise direct match
        let condition =
          typeof filters[key] === "string"
            ? { [key]: { $regex: filters[key], $options: "i" } }
            : { [key]: filters[key] };

        orConditions.push(condition);
      }
    }

    // If no filters provided, return an empty query (matches all)
    let query = orConditions.length > 0 ? { $or: orConditions } : {};

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
};
