const url = require("url");
const NodeCache = require("node-cache");

const myCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 600,
});

module.exports = (req, res, next) => {
  if (req.method !== "GET" && req.statusCode !== 200) {
    return next();
  }

  /* Remove query parameters */
  const key = url.parse(req.originalUrl).pathname;

  const cachedReponse = myCache.get(key);
  if (cachedReponse) {
    res.header(cachedReponse.headers);
    res.header("X-Proxy-Cache", "HIT");

    return res.send(cachedReponse.body);
  }
  res.originalSend = res.send;

  res.send = (body) => {
    myCache.set(key, {
      headers: res.getHeaders(),
      body,
    });

    res.header("X-Proxy-Cache", "MISS");
    res.originalSend(body);
  };

  return next();
};
