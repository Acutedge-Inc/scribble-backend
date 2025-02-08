const https = require("https");
const fs = require("fs");
const path = require("path");
const nconf = require("nconf");
const AWS = require("aws-sdk");
const nodemailer = require("nodemailer");
// const mimemessage = require("mimemessage");
const { replace } = require("lodash");
const logger = require("./logger");

const EMAIL_PROVIDER = "SMTP";
const ENABLE_EMAILS = EMAIL_PROVIDER === "SES" || EMAIL_PROVIDER === "SMTP";
const accountVerificationTemplate = require("../views/emailer-account-verification");
const { milisecondsToTime } = require("./utils");

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
              "ZscalerRootCertificate-2048-SHA256.crt",
            ),
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

async function sendEmailSESWithAttachment(destination, subject, htmlBody) {
  const mailContent = mimemessage.factory({
    contentType: "multipart/mixed",
    body: [],
  });
  const domainPrefix = `${nconf.get("AWS_ENV")}.${nconf.get("OEM")}.${
    nconf.get("AWS_DEFAULT_REGION").split("-")[0]
  }`;
  mailContent.header("From", `admin@${domainPrefix}.appstore.visteoncloud.com`);
  mailContent.header("To", destination);
  mailContent.header("Subject", subject);

  const alternateEntity = mimemessage.factory({
    contentType: "multipart/alternate",
    body: [],
  });

  const htmlEntity = mimemessage.factory({
    contentType: "text/html;charset=utf-8",
    body: htmlBody,
  });
  const plainEntity = mimemessage.factory({
    body: "Please see the attached file for a list of    customers to contact.",
  });
  alternateEntity.body.push(htmlEntity);
  alternateEntity.body.push(plainEntity);

  mailContent.body.push(alternateEntity);

  const data = fs.readFileSync(
    `${replace(__dirname, /\\/g, "/")}/allgo-logo.png`,
  );
  const attachmentEntity = mimemessage.factory({
    contentType: "image/png",
    contentTransferEncoding: "base64",
    body: data.toString("base64").replace(/([^\0]{76})/g, "$1\n"),
    cid: "logo",
  });
  attachmentEntity.header(
    "Content-Disposition",
    "attachment ;filename='allgo-logo.png'",
  );
  attachmentEntity.header("Content-ID", "logo");
  mailContent.body.push(attachmentEntity);

  return ses
    .sendRawEmail({ RawMessage: { Data: mailContent.toString() } })
    .promise();
}

/**
 * Generate password reseet email
 * @param {string} email recepient
 * @param {string} url url to include in the body
 */
async function sendPasswordResetEmail(email, url, isPortalUser, username) {
  if (!ENABLE_EMAILS) {
    logger.info(
      `Emails are disabled. Skipping sending password reset email to ${email}`,
    );
    return Promise.resolve();
  }

  logger.info(`Sending password reset email to ${email}`);
  const subject = "AllGo App Store - Password Reset Request";
  const htmlBodyCustomer = `<html>
    <body style="text-align: center; border: 1px solid black; padding: 0; font-family: Roboto; color: #707070; font-size: 16px;">
    <div style="background-color: black;">
    <img src="cid:logo" style="margin-top: 13px; margin-bottom: 13px;"/>

    </div>
    <div style="margin: 46.2px auto 37.5px;">
      <p>
        <span style="font-family: Roboto; color: #707070; font-size: 16px;">"Dear AllGo App Store Customer",</span><br />
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
      
      <p>This reset password link is only valid for the next ${milisecondsToTime(
        1000 * nconf.get("JWT_VALIDITY_PASSWORD_RECOVERY_LINK"),
      )}.</p>
      <p>If you have not requested for password request, you can ignore this mail.<br /> <span style="font-family: Roboto; color: #707070; font-size: 16px;">You can raise a support ticket to report the incident to AllGo App Store team.</span></p>
      <div style="background-color: black; color: white; padding: 6px;">
        <p>Sincerely,</p>
        <p>The AllGo App Store Services Team.</p>
      </div>
    </body>
    </html>`;

  const htmlBodyPortal = `<html>
    <body style="text-align: center; border: 1px solid black; padding: 0; font-family: Roboto; color: #707070; font-size: 16px;">
      <div style="background-color: black;">
        <img src="cid:logo" style="margin-top: 13px; margin-bottom: 13px;" />
      </div>
      <div style="text-align: left; margin: 20px;">
        <p>
          <span style="font-family: Roboto; color: #707070; font-size: 16px;">Dear ${username},</span><br />
          We have received a request to reset the password for your AllGo AppStore account.
          To proceed, click the link below:
        </p>
        <a 
          href="${url}" 
          style="margin: 24px 0;;
                 text-decoration: none; 
                 color: white;
                 font-weight: bold;
                 background-color: #000;
                 border: none;
                 padding: 12px 32px;
                 text-align: center;
                 display: inline-block;
                 font-size: 16px;
                 cursor: pointer;
                 border-radius: 16px;"
        >
          RESET PASSWORD
        </a>
        <p>Please note, this link expires 24 hours after your original password reset request.</p>
        <p>If you need help, simply reply to this email.<br />We’d love to help!</p>
      </div>
      <div style="background-color: black; color: white; padding: 6px;">
        <p>Sincerely,<br/>
        The AllGo App Store Services Team.</p>
      </div>
    </body>
  </html>`;

  const textBody = `Paste the following link in the address bar of your browser to reset your password: ${url}`;

  if (EMAIL_PROVIDER === "SES") {
    // send email using SES
    // return sendEmailSES(email, subject, htmlBody, textBody);
    if (isPortalUser) {
      return sendEmailSESWithAttachment(
        email,
        subject,
        htmlBodyPortal,
        textBody,
      );
    }
    return sendEmailSESWithAttachment(
      email,
      subject,
      htmlBodyCustomer,
      textBody,
    );
  }
  // send email using SMTP
  // eslint-disable-next-line no-undef
  return sendEmailSMTP(email, subject, htmlBody, textBody);
}

/**
 * Send Submit Feedback Link email
 * @param {string} email recepient
 * @param {string} url url to include in the body
 */
async function sendSubmitFeedbackLinkEmail(email, url) {
  if (!ENABLE_EMAILS) {
    logger.info(
      `Emails are disabled. Skipping sending submit feedback email to ${email}`,
    );
    return Promise.resolve();
  }

  logger.info(`Sending submit feedback email to ${email}`);
  const subject = "AllGo App Store - Submit Feedback";
  const htmlBody = `<html>
    <body style="text-align: center; border: 1px solid black; padding: 0; font-family: Roboto; color: #707070; font-size: 16px;">
    <div style="background-color: black;">
    <img src="cid:logo" style="margin-top: 13px; margin-bottom: 13px;"/>

    </div>
    <div style="margin: 46.2px auto 37.5px;">
      <p>
        <span style="font-family: Roboto; color: #707070; font-size: 16px;">Dear AllGo App Store Customer,</span><br />
        You can provide your detailed feedback, by clicking on the below button:
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
                border-radius: 14px;"
            >
                SUBMIT FEEDBACK
            </a>
      
      <p>This feedback link is only valid for the next ${milisecondsToTime(
        1000 * nconf.get("JWT_VALIDITY_SUBMIT_FEEDBACK_LINK"),
      )}.</p>
      <p>If you have not requested for feedback link, you can ignore this mail.<br />
      <span style="font-family: Roboto; color: #707070; font-size: 16px;">You can raise a <a href="#" style="color: #707070;">support ticket</a> to report the incident to AllGo App Store team.</span></p>
      <div style="background-color: black; color: white; padding: 6px;">
        <p>Sincerely,</p>
        <p>The AllGo App Store Services Team.</p>
      </div>
    </body>
    </html>`;
  const textBody = `Paste the following link in the address bar of your browser to submit your feedback: ${url}`;

  if (EMAIL_PROVIDER === "SES") {
    // send email using SES
    // return sendEmailSES(email, subject, htmlBody, textBody);
    return sendEmailSESWithAttachment(email, subject, htmlBody, textBody);
  }
  // send email using SMTP
  return sendEmailSMTP(email, subject, htmlBody, textBody);
}

module.exports = {
  sendAccountVerificationEmail,
  sendPasswordResetEmail,
  sendSubmitFeedbackLinkEmail,
  sendEmailSES,
};
