const nconf = require("nconf");
const aws = require("../lib/aws.js");
const authRoutes = require("./auth.js");
const visitRoutes = require("./visit.js");
const settingRoutes = require("./settings.js");
const userRoutes = require("./user.js");
const dashboardRoutes = require("./dashboard.js");
const clinicianRoutes = require("./clinician.js");
const {
  createVisitFromRPA,
  processAIOutput,
  updateAssessmentFromRPA,
  markVisitPastDue,
} = require("../controllers/visit.js");
module.exports = (app) => {
  const baseVersion = nconf.get("BASE_VERSION");
  app.use(`/health`, (req, res) => {
    res.status(200).json({ message: "OK" });
  });

  aws.subscribeToQueue(process.env.RPA_DATA_QUEUE, createVisitFromRPA);
  aws.subscribeToQueue(process.env.AI_OUTPUT_QUEUE_URL, processAIOutput);
  aws.subscribeToQueue(
    process.env.RPA_UPDATE_QUEUE_URL,
    updateAssessmentFromRPA
  );

  const schedule = require("node-schedule");

  // Schedule a job to run every day at midnight
  schedule.scheduleJob("0 0 * * *", async () => {
    try {
      console.log("Daily task executed"), new Date();
      markVisitPastDue();
    } catch (error) {
      console.error(`Error executing daily task: ${error}`);
    }
  });

  app.use(`/api/${baseVersion}/auth`, authRoutes);
  app.use(`/api/${baseVersion}/visit`, visitRoutes);
  app.use(`/api/${baseVersion}/setting`, settingRoutes);
  app.use(`/api/${baseVersion}/user`, userRoutes);
  app.use(`/api/${baseVersion}/dashboard`, dashboardRoutes);
  app.use(`/api/${baseVersion}/clinician`, clinicianRoutes);
};
