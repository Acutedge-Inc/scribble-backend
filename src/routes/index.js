const nconf = require("nconf");

const authRoutes = require("./auth.js");
module.exports = (app) => {
  const baseVersion = nconf.get("BASE_VERSION");

  app.use(`/api/${baseVersion}/auth`, authRoutes);
};
