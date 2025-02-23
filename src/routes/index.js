const nconf = require("nconf");

const authRoutes = require("./auth.js");
const assessmentRoutes = require("./assessment.js");
const settingRoutes = require("./settings.js");
module.exports = (app) => {
  const baseVersion = nconf.get("BASE_VERSION");

  app.use(`/api/${baseVersion}/auth`, authRoutes);
  app.use(`/api/${baseVersion}/assessment`, assessmentRoutes);
  app.use(`/api/${baseVersion}/setting`, settingRoutes);
};
