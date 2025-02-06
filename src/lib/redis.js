const Redis = require("ioredis");
const nconf = require("nconf");
const logger = require("./logger");

const redisHost = nconf.get("REDIS_ENDPOINT_ADDRESS") || "127.0.0.1";
const redisPort = Number(nconf.get("REDIS_ENDPOINT_PORT") || 6379);

const accessKeyPrefix = "userAccessToken";
const meApiResponseKeyPrefix = "meApiResponse";

const client = new Redis({
    host: nconf.get("NODE_ENV") !== "local" ? redisHost : nconf.get("REDIS_IP"),
    port: redisPort,
    db: 0,
    tls: nconf.get("NODE_ENV") !== "local" ? {} : undefined, // Only use TLS outside local env
    retryStrategy(times) {
        // Reconnect after exponential backoff (times in ms)
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis reconnecting in ${delay}ms...`);
        return delay;
    },
});

// Redis Event Listeners
client.on("connect", () => {
    logger.info("Connected to Redis successfully");
});

client.on("error", (err) => {
    logger.error("Redis connection error:", err);
});

client.on("end", () => {
    logger.warn("Redis connection closed");
});

module.exports.checkIfAccessTokenExists = async (userId) => {
    const data = await client.get(`${accessKeyPrefix}:${userId}`);
    return data;
};

module.exports.setResponseFromMeApi = async (userId, meApiResponse, ttl) => {
    const data = await client.set(
        `${meApiResponseKeyPrefix}:${userId}`,
        JSON.stringify(meApiResponse),
        "EX",
        ttl
    );
    return data;
};

module.exports.getResponseFromMeApi = async (userId) =>
    JSON.parse(await client.get(`${meApiResponseKeyPrefix}:${userId}`));

module.exports.removeResponseFromMeApi = async (userId) => {
    await client.del(`${meApiResponseKeyPrefix}:${userId}`);
};

module.exports.setFeatureToggleSettings = async (featureToggleSettings) => {
    await client.set("featureToggleSettings", JSON.stringify(featureToggleSettings));
};

module.exports.getFeatureToggleSettings = async () => {
    const cachedFeatureToggleSettings = await client.get("featureToggleSettings");
    return cachedFeatureToggleSettings ? JSON.parse(cachedFeatureToggleSettings) : null;
};

module.exports.removeFeatureToggleSettings = async () => {
    await client.del("featureToggleSettings");
};

module.exports.clearAllCache = async () => {
    // Flush all the cache
    client
        .flushall()
        .then(() => {
            logger.info("All cache cleared!");
            return true;
        })
        .catch((err) => {
            logger.error("Error while clearing cache:", err);
        });
};

module.exports.redisClient = client;
