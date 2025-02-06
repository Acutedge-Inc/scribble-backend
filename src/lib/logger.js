const nconf = require("nconf");
const winston = require("winston");

const { format } = winston;

const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  http: 5,
  sql: 6,
};

// const filter = (level) =>
//     format((formatObject) => {
//         if (formatObject.level === level) {
//             return formatObject;
//         }
//         return null;
//     })();

const formatLogger = [
  format.splat(),
  format.colorize(),
  format.printf(({ level, message, apiId, ...additionalInfo }) => {
    const apiRequestId = apiId ? ` API Request Id: ${apiId} ::` : "";

    if (message instanceof Error) {
      // If the message is an error, log the stack trace
      return `${level}:${apiRequestId} ${message} ${message.stack} ${
        Object.keys(additionalInfo).length
          ? JSON.stringify(additionalInfo, null, 2)
          : ""
      }`;
    }
    return `${level}:${apiRequestId} ${message} ${
      Object.keys(additionalInfo).length
        ? JSON.stringify(additionalInfo, null, 2)
        : ""
    }`;
  }),
];

const transports = [
  new winston.transports.Console({
    level: "debug",
    format: format.combine(...formatLogger),
  }),
];

const logger = winston.createLogger({
  levels,
  transports,
  exitOnError: false,
});

logger.stream = {
  write: (msg) => {
    const debug = nconf.get("ENABLE_DEBUG_LOG") || false;

    if (msg.indexOf("Error message") >= 0) {
      logger.error(msg);
    } else if (debug) {
      logger.debug(msg);
    } else {
      logger.info(msg);
    }
  },
};

module.exports = logger;
