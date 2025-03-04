const AWS = require("aws-sdk");
const dotenv = require("dotenv");

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
const bucketName = "scribble2-data";

const createFolder = async (folderName) => {
  try {
    const params = {
      Bucket: bucketName,
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
      Bucket: bucketName,
      Key: folderName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const data = await s3.upload(params).promise();
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

const pushToQueue = async (queueUrl, message) => {
  const params = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message),
  };

  const data = await sqs.sendMessage(params).promise();
  return data;
};

module.exports = {
  createFolder,
  uploadFile,
  pushToQueue,
};
