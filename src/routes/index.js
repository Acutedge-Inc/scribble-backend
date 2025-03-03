const nconf = require("nconf");

const authRoutes = require("./auth.js");
const visitRoutes = require("./visit.js");
const settingRoutes = require("./settings.js");
const userRoutes = require("./user.js");
const dashboardRoutes = require("./dashboard.js");
module.exports = (app) => {
  const baseVersion = nconf.get("BASE_VERSION");
  app.use(`/health`, (req, res) => {
    res.status(200).json({ message: "OK" });
  });
  app.use(`/api/${baseVersion}/auth`, authRoutes);
  app.use(`/api/${baseVersion}/visit`, visitRoutes);
  app.use(`/api/${baseVersion}/setting`, settingRoutes);
  app.use(`/api/${baseVersion}/user`, userRoutes);
  app.use(`/api/${baseVersion}/dashboard`, dashboardRoutes);
};
