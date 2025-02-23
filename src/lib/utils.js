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

  encryptText: (text) => {
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
  },

  getScopeNamesFromRoles: (Roles) => {
    const roleScopes = Roles.flatMap((role) =>
      role.Role.Scopes.map((scope) => scope.name)
    );
    return Array.from(new Set(roleScopes));
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
