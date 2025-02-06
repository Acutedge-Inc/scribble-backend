const nconf = require("nconf");
const { logger } = require("../lib");

const baseApiUrl = nconf.get("API_BASE_URL");
const baseVersion = nconf.get("BASE_VERSION");

const { UserInfo } = require("../model/scribble-admin");

// const {
//   appValidationStatusTemplate,
// } = require("../repositories/render-template");
// const { sendEmail } = require("../lib/aws");

module.exports = (req, res, next) => {
  res.on("finish", async () => {
    if (res.locals.notification) {
      // trigger email
      // get email id of dev
      logger.debug("Email notification...", res?.locals);
      try {
        const userDetails = await UserInfo.findOne({
          where: { user_id: res?.locals?.dev_sso_id },
          attributes: ["email_address", "firstname", "lastname", "org_name"],
        });
        if (userDetails) {
          // const userDetails = userResponse.data?.data;
          // render valid template
          const iconUrl = `${baseApiUrl}/api/${baseVersion}/asset/allgo.png`;
          // const template = appValidationStatusTemplate(
          //   {
          //     ...res.locals.notification,
          //     ...{ iconUrl, company: res?.locals?.oem_name },
          //   },
          //   res.locals.app_status,
          // );
          // logger.debug("template generated", userDetails);

          // await sendEmail(userDetails?.email_address, template);
        } else {
          logger.debug(
            "User info not found for user_id",
            res.locals?.dev_sso_id,
          );
        }
      } catch (error) {
        logger.error("Error on Sending notifiation mail:: ", {
          error,
        });
        // retry que TO BE DONE
      }
    }
  });
  next();
};
