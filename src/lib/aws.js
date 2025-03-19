const AWS = require("aws-sdk");
const dotenv = require("dotenv");
const logger = require("../lib/logger.js");
const nconf = require("nconf");
const fs = require("fs");
dotenv.config();

const REGION = process.env.AWS_REGION;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;

AWS.config.update({
  region: REGION,
  accessKeyId: ACCESS_KEY,
  secretAccessKey: SECRET_KEY,
});

const s3 = new AWS.S3();
const sqs = new AWS.SQS();
const bucketName = nconf.get("S3_BUCKET");

const createFolder = async (folderName) => {
  try {
    const params = {
      Bucket: nconf.get("S3_BUCKET"),
      Key: folderName,
      ACL: "private", // Ensure it's a valid S3 object
    };

    await s3.putObject(params).promise();
    console.log(`Folder created successfully: ${folderName}`);
  } catch (error) {
    console.error("Error creating folder:", error);
  }
};

const uploadFile = async (file, folderName) => {
  try {
    const params = {
      Bucket: nconf.get("S3_BUCKET"),
      Key: folderName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const data = await s3.upload(params).promise();
    logger.debug(`Audio file uploaded successfully: ${data.Location}`);
    return data;
  } catch (error) {
    if (error.message.includes("Unsupported body payload object")) {
      console.error(
        "Error uploading file: Error: Unsupported body payload object"
      );
    } else {
      console.error("Error uploading file:", error);
    }
  }
};

const downloadFile = async (bucketName, key) => {
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  const data = await s3.getObject(params).promise();
  return data;
};

const pushToQueue = async (queueUrl, message) => {
  const params = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message),
  };

  const data = await sqs.sendMessage(params).promise();
  return data;
};

const deleteMessageFromQueue = async (queueUrl, message) => {
  const deleteParams = {
    QueueUrl: queueUrl,
    ReceiptHandle: message.ReceiptHandle,
  };
  await sqs.deleteMessage(deleteParams).promise();
  logger.debug(`Message deleted from queue: ${queueUrl}`);
};

const subscribeToQueue = (queueUrl, cb) => {
  const params = {
    QueueUrl: queueUrl,
    WaitTimeSeconds: 20,
  };

  setInterval(() => {
    sqs.receiveMessage(params, (err, data) => {
      if (err) {
        return cb(err);
      }
      if (data.Messages.length > 0) {
        data.Messages.forEach((m) => {
          logger.debug("------------------------------------");
          logger.debug("----------NEW SQS MESSAGE-------------", m);
          logger.debug("------------------------------------");
          cb(null, m);
        });
      } else {
        // logger.debug("No messages in RPA Data Queue");
      }
    });
  }, 2000);
};

module.exports = {
  createFolder,
  uploadFile,
  pushToQueue,
  subscribeToQueue,
  deleteMessageFromQueue,
  downloadFile,
};
