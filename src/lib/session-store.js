const Redis = require("ioredis");
const nconf = require("nconf");
const logger = require("./logger");

const redisHost = nconf.get("REDIS_ENDPOINT_ADDRESS") || "127.0.0.1";
const redisPort = Number(nconf.get("REDIS_ENDPOINT_PORT") || 6379);

const client = ""
// new Redis({
//   host: nconf.get("NODE_ENV") !== "local" ? redisHost : nconf.get("REDIS_IP"),
//   port: redisPort,
//   options: { db: 0 },
//   ...(nconf.get("NODE_ENV") !== "local" ? { tls: {} } : {}),
// });

// // Listen for the 'connect' event
// client.on("connect", () => {
//   logger.info("Connected to Redis successfully");
// });

// // Optionally, listen for other events like 'error'
// client.on("error", (err) => {
//   logger.error("Redis connection error:", err);
// });

module.exports.redisClient = client;

const accessKeyPrefix = "userAccessToken";
const refreshKeyPrefix = "userRefreshToken";
const meApiResponseKeyPrefix = "meApiResponse";

/**
 * Created new method to save access and refresh tokens in redis session.
 * 'userAccessToken' namespace is used to store access tokens.
 * 'userRefreshToken' namespace is used to store access tokens.
 * A user can able to create single session only.
 * If user logout will destroy remove tokens from redis session.
 */

module.exports.storeAccessToken = async (userId, accessKey, ttl) => {
  await client.set(`${accessKeyPrefix}:${userId}`, accessKey, "EX", ttl);
};

module.exports.storeRefreshToken = async (userId, refreshKey, ttl) => {
  await client.set(`${refreshKeyPrefix}:${userId}`, refreshKey, "EX", ttl);
};

module.exports.checkIfAccessTokenExists = async (userId) =>
  client.get(`${accessKeyPrefix}:${userId}`);

module.exports.checkIfRefreshTokenExists = async (userId) =>
  client.get(`${refreshKeyPrefix}:${userId}`);

module.exports.removeAccessToken = async (userId) => {
  await client.del(`${accessKeyPrefix}:${userId}`);
};

module.exports.removeRefreshToken = async (userId) => {
  await client.del(`${refreshKeyPrefix}:${userId}`);
};

module.exports.removeResponseFromMeApi = async (userId) => {
  await client.del(`${meApiResponseKeyPrefix}:${userId}`);
};

//  Changes on 14/09/2023
//  Commented to handled single session per user.

/**
 * refresh : This namespace indicates unique session/refreshToken
 * user: This namespace indicates user id
 * refreshToken is stored with its specific accessToken as value
 * all refreshToken is also stored in hset of USER ID
 */

// module.exports.storeSessionKeyPair = async (refreshKey, accessKey, ttl) => {
//     await client.set(`refresh:${refreshKey}`, accessKey, "EX", ttl);
// };

// module.exports.updateSessionKeyPair = async (refreshKey, accessKey) => {
//     const ttl = await client.ttl(`refresh:${refreshKey}`);
//     await client.set(`refresh:${refreshKey}`, accessKey, "EX", ttl);
// };

// module.exports.checkIfExists = async (refreshKey) => {
//     return client.get(`refresh:${refreshKey}`);
// };

// module.exports.storeSessionPerUser = async (user, refreshToken) => {
//     await client.sadd(`user:${user}`, `refresh:${refreshToken}`);
// };

// module.exports.removeSessionPerUser = async (user, refreshToken) => {
//     await client.srem(`user:${user}`, `refresh:${refreshToken}`);
// };

// module.exports.removeSessionKeyPair = async (refreshToken) => {
//     await client.del(`refresh:${refreshToken}`);
// };

// Changes on 14/09/2023
// Update new keys to handle session for user tokens. So commented existing code here

// /**
//  * Used to listen to redis & on expiry of a key it deletes related keys
//  * Listening/Subscribing can only done with new redis connection
//  */
// module.exports.handleSessionExpiry = async () => {
//     try {
//         const expiryHandler = new Redis({
//             host: nconf.get("REDIS_IP"),
//             port: nconf.get("REDIS_PORT"),
//             options: { db: 0 },
//         });
//         expiryHandler.config("set", "notify-keyspace-events", "KEA");
//         await expiryHandler.subscribe("__keyevent@0__:expired");
//         expiryHandler.on("message", async (channel, message) => {
//             const data = JSON.parse(
//                 Buffer.from(message.split(":")[1].split(".")[1], "base64").toString("ascii")
//             );
//             logger.info(
//                 await client.srem(`user:${data.user}`, message),
//                 "Deleting refreshtoken from user session"
//             );
//         });
//     } catch (err) {
//         logger.info(err);
//     }
// };

/**
 * Used to listen to redis & on expiry of a key it deletes accesstoken keys
 * Listening/Subscribing can only done with new redis connection
 *
 * REASON TO HANDLED SESSION EXPIRY:
 * On some edge cases, refresh token session key might get expired before access token session key.
 * So on that time should remove access token session key as well.
 */
module.exports.handleSessionExpiry = async () => {
  try {
    const expiryHandler = new Redis({
      host:
        nconf.get("NODE_ENV") !== "local" ? redisHost : nconf.get("REDIS_IP"),
      port: redisPort,
      options: { db: 0, notify_keyspace_events: "KEA" },
      ...(nconf.get("NODE_ENV") !== "local" ? { tls: {} } : {}),
    });
    // expiryHandler.config("set", "notify-keyspace-events", "KEA");
    await expiryHandler.subscribe("__keyevent@0__:expired");
    expiryHandler.on("message", async (channel, message) => {
      if (message.indexOf(refreshKeyPrefix) >= 0) {
        const userId = message.split(":")[1] || "";
        this.removeAccessToken(userId);
      }
      logger.info("Deleting user accesstoken from session");
    });
  } catch (err) {
    logger.error("Error on handle session expiry", err);
  }
};

// This 'revokeUserSession' method not called anywhere, so didn't done any changes here

// To revoke a users session from background
module.exports.revokeUserSession = async (user) => {
  try {
    const refreshTokens = await client.smembers(`user:${user}`);
    logger.info(await client.srem(`user:${user}`, refreshTokens));
    logger.info(await client.del(refreshTokens));
  } catch (err) {
    logger.error("Error on revoking user session", err);
  }
};
