const Redis = require("ioredis");
const nconf = require("nconf");
const logger = require("./logger.js");

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = Number(process.env.REDIS_PORT) || 6379;

const client = new Redis({
  host: redisHost,
  port: redisPort,
  db: 0, // Default database 0
  retryStrategy: (times) => Math.min(times * 50, 2000), // Retry logic
});

client.on("connect", () =>
  console.log(`✅ Connected to Redis at ${redisHost}:${redisPort}`)
);
client.on("error", (err) => console.error("❌ Redis connection error:", err));

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

module.exports.handleSessionExpiry = async () => {
  try {
    const expiryHandler = new Redis({
      host: redisHost,
      port: redisPort,
      options: { db: 0, notify_keyspace_events: "KEA" },
      ...(process.env.NODE_ENV !== "local" ? { tls: {} } : {}),
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
