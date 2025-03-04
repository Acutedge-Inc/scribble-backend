const { tmpdir } = require("os");
const multer = require("multer");
const {
  allowedMimes,
  maxFileSize,
  mimeExtentionMapping,
} = require("../repositories/constants/misc");
const { HTTPError } = require("./responses");
const logger = require("./logger");

const appDetailVideoMimes = allowedMimes.appDetailVideo;

const appDetailImageMimes = allowedMimes.appDetailImage;

const iconMimes = allowedMimes.icon;

const validationReportAttachmentMimes = allowedMimes.validationReport;

const appCertificateMimes = allowedMimes.appCertificate;

/**
 * Common file filter based on field name
 * @param {*} req
 * @param {*} file
 * @param {*} cb
 */
const fileFilter = (req, file, cb) => {
  // Content-Type and extension should match
  if (mimeExtentionMapping[file.mimetype]) {
    const splitFileName = file.originalname.split(".");
    const ext = splitFileName[splitFileName.length - 1];
    if (!mimeExtentionMapping[file.mimetype].includes(ext.toLowerCase()))
      cb(new HTTPError(400, "Invalid Content-Type"));
  }

  switch (file.fieldname) {
    case "icon":
      if (iconMimes.includes(file.mimetype)) {
        // Max size check
        if (req.rawHeaders[1] > maxFileSize.appDetailIcon)
          cb(new HTTPError(400, "File too large"));
        else cb(null, true);
      } else {
        cb(new HTTPError(400, "Only .png, .jpg and .jpeg format is allowed"));
      }
      break;
    case "screenshots":
      if (appDetailImageMimes.includes(file.mimetype)) {
        // Max size check
        if (req.rawHeaders[1] > maxFileSize.appDetailScreenshot)
          cb(new HTTPError(400, "File too large"));
        else cb(null, true);
      } else {
        cb(new HTTPError(400, "Only .png, .jpg and .jpeg format are allowed"));
      }
      break;
    case "videos":
      if (appDetailVideoMimes.includes(file.mimetype)) {
        // Max size check
        if (req.rawHeaders[1] > maxFileSize.appDetailVideo)
          cb(new Error("File too large"));
        else cb(null, true);
      } else {
        cb(
          new HTTPError(
            400,
            `Only ${JSON.stringify(appDetailVideoMimes)} format videos are allowed`
          )
        );
      }
      break;
    case "attachments":
      if (validationReportAttachmentMimes.includes(file.mimetype)) {
        // Size check - For video files max file size can be 500MB, 20MB for other types
        if (
          file.mimetype === "video/mp4" &&
          req.rawHeaders[31] > maxFileSize.validationReportVideo
        )
          cb(new HTTPError(400, "File too large"));
        else if (
          file.mimetype !== "video/mp4" &&
          req.rawHeaders[31] > maxFileSize.validationReportNonVideo
        )
          cb(new HTTPError(400, "File too large"));
        else cb(null, true);
      } else {
        cb(
          new HTTPError(
            400,
            "Only JPG/JPEG/PNG/MP4/PDF/DOC/DOCX/TXT format are allowed"
          )
        );
      }
      break;
    case "certificate":
      if (file.filename === null) {
        throw new HTTPError(400, "Certificate is required");
      }
      if (appCertificateMimes.includes(file.mimetype)) {
        // Max size check
        if (req.rawHeaders[1] > maxFileSize.appCertificate)
          cb(new HTTPError(400, "Certificate file should be less than 2MB"));
        else cb(null, true);
      } else {
        cb(
          new HTTPError(
            400,
            "Only .crt, .cert, .der, .rsa and .pem format are allowed"
          )
        );
      }
      break;
    default:
      logger.error("Invalid field name", file.fieldname);
      cb(new HTTPError(400, "Invalid field name"));
      break;
  }
};

const commonFileUpload = multer({
  dest: tmpdir(),
});

const validationReportUpload = multer({
  dest: tmpdir(),
  fileFilter,
  limits: { fileSize: maxFileSize.validationReportVideo },
});

const apkUpload = multer({
  dest: tmpdir(),
  limits: { fileSize: 524288000 },
});

const appDetailUpload = multer({
  dest: tmpdir(),
  fileFilter,
});

const apkCertificateUpload = multer({
  dest: tmpdir(),
  fileFilter,
});

module.exports = {
  commonFileUpload,
  apkUpload,
  appDetailUpload,
  validationReportUpload,
  apkCertificateUpload,
};
