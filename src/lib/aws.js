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

module.exports = {
  createFolder,
};
