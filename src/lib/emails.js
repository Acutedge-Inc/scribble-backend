const https = require("https");
const fs = require("fs");
const path = require("path");
const nconf = require("nconf");
const AWS = require("aws-sdk");
const nodemailer = require("nodemailer");
// const mimemessage = require("mimemessage");
const { replace } = require("lodash");
const logger = require("./logger.js");

const EMAIL_PROVIDER = "SMTP";
const ENABLE_EMAILS = EMAIL_PROVIDER === "SES" || EMAIL_PROVIDER === "SMTP";
const accountVerificationTemplate = require("../views/emailer-account-verification.js");
const { milisecondsToTime } = require("./utils.js");

let awsConfig = null;

if (nconf.get("NODE_ENV") === "local") {
  awsConfig = {
    region: nconf.get("AWS_DEFAULT_REGION"),
    accessKeyId: nconf.get("AWS_ACCESS_KEY_ID"),
    secretAccessKey: nconf.get("AWS_SECRET_ACCESS_KEY"),
    httpOptions: {
      agent: new https.Agent({
        rejectUnauthorized: true,
        ca: [
          fs.readFileSync(
            path.resolve(
              __dirname,
              "..",
              "..",
              "..",
              "..",
              "build-scripts",
              "ZscalerRootCertificate-2048-SHA256.crt"
            )
          ),
        ],
      }),
    },
  };
}

let provider = null;
let ses = null;

if (EMAIL_PROVIDER === "SES") {
  if (awsConfig) {
    AWS.config.update(awsConfig);
    // create SES provider
    ses = new AWS.SES(awsConfig);
  } else {
    ses = new AWS.SES();
  }
} else if (EMAIL_PROVIDER === "SMTP") {
  logger.info(`Creating SMTP transport using username: thillaimaharajang`);

  // create SMTP provider
  provider = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    requireTLS: true,
    // auth: {
    //   user: 'thillaimaharajan.g@gmail.com',
    //   pass: 'wwza lfjz ewxs akjc',
    // },
    auth: {
      user: "thillai@acutedge.com",
      pass: "gkve yboo smmj vxtb",
    },
  });

  // verify transport
  provider.verify((err) => {
    if (err) {
      logger.error(err);
    } else {
      logger.info("SMTP transport ready");
    }
  });
}

/**
 * Send an email using AWS SES
 * @param {string} destination recepient of the email
 * @param {string} subject subject of the email
 * @param {string} htmlBody html part of the body
 * @param {string} textBody text part of the body
 */
async function sendEmailSES(destination, subject, htmlBody) {
  const domainPrefix = `${nconf.get("AWS_ENV")}.${nconf.get("OEM")}.${
    nconf.get("AWS_DEFAULT_REGION").split("-")[0]
  }`;
  const params = {
    Source: `admin@${domainPrefix}.appstore.visteoncloud.com`,
    Destination: { ToAddresses: [destination] },
    Message: {
      Body: {
        Html: { Charset: "UTF-8", Data: htmlBody },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
  };

  return ses.sendEmail(params).promise();
}

async function sendEmailSMTP(destination, subject, htmlBody, textBody) {
  const domainPrefix = `scribble`;
  const params = {
    from: `admin@${domainPrefix}.com`,
    to: destination,
    subject,
    html: htmlBody,
    text: textBody,
  };
  return provider.sendMail(params);
}

/**
 * Generate account verification email
 * @param {string} email recepient
 * @param {string} url url to include in the body
 */
async function sendAccountVerificationEmail(email, code) {
  logger.info(`Sending verification email to ${email}`);

  const subject = `${"Account Sign up"}`;
  const htmlBody = accountVerificationTemplate(code, "developer");

  if (EMAIL_PROVIDER === "SES") {
    // send email using SES
    return sendEmailSES(email, subject, htmlBody);
  }
  // send email using SMTP
  return sendEmailSMTP(email, subject, htmlBody);
}

/**
 * Generate account verification email
 * @param {string} email recepient
 * @param {string} url url to include in the body
 */
async function sendAlertEmail(error, type) {
  try {
    logger.info(`Sending alert email`);

    const subject = `${process.env.NODE_ENV} Scribble Alert - ${type}`;
    const htmlBody = error;

    // send email using SMTP
    const alertEmails = JSON.parse(process.env.ALERT_EMAIL);
    alertEmails.forEach((email) => {
      sendEmailSMTP(email, subject, htmlBody);
    });
  } catch (error) {
    logger.error(`Error sending alert email: ${error}`);
  }
}

/**
 * Generate password reseet email
 * @param {string} email recepient
 * @param {string} url url to include in the body
 */
async function sendPasswordResetEmail(email, url) {
  logger.info(`Sending password reset email to ${email}`);
  const subject = "Scribble - Password Reset Request";
  const htmlBodyCustomer = `<html>
  <body style="text-align: center; border: 1px solid black; padding: 0; font-family: Roboto; color: #707070; font-size: 16px;">
  <div style="background-color: black;">
  <img src="cid:logo" style="margin-top: 13px; margin-bottom: 13px;"/>

  </div>
  <div style="margin: 46.2px auto 37.5px;">
    <p>
      <span style="font-family: Roboto; color: #707070; font-size: 16px;">"Dear Scribble User",</span><br />
      We have received a request to reset the password for your account. <br />
      To reset your password, click on the button below :
    </p>
  </div>
          <a 
              href="${url}" 
              style="margin-bottom: 32px;
              text-decoration: none; 
              color: white; 
              color: white; 
              color: white;
              font-weight: bold;
              background-color: #000;
              border: none;
              color: white;
              padding: 12px 32px;
              text-align: center;
              text-decoration: none;
              display: inline-block;
              font-size: 16px;
              cursor: pointer;
              border-radius: 16px;"
          >
              RESET PASSWORD
          </a>
    
    <p>This reset password link is only valid for the next 5 mins.</p>
    <p>If you have not requested for password request, you can ignore this mail.<br /> <span style="font-family: Roboto; color: #707070; font-size: 16px;">You can raise a support ticket to report the incident to AllGo App Store team.</span></p>
    <div style="background-color: black; color: white; padding: 6px;">
      <p>Sincerely,</p>
      <p>The Scribble Services Team.</p>
    </div>
  </body>
  </html>`;

  const textBody = `Paste the following link in the address bar of your browser to reset your password: ${url}`;

  return sendEmailSMTP(email, subject, htmlBodyCustomer, textBody);
}

module.exports = {
  sendAccountVerificationEmail,
  sendPasswordResetEmail,
  sendEmailSES,
  sendAlertEmail,
};
