const express = require("express");
const { auth } = require("../lib/index.js");
const { ErrorResponse } = require("../lib/responses.js");
const { processAudio } = require("../controllers/clinician.js");
const multer = require("multer");

const clinicianRoutes = express.Router();

const upload = multer({
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB limit
  fileFilter(req, file, cb) {
    console.log("File details:", file);
    const validExtensions = /\.(mp3|wav|webm|mp4|mkv)$/;
    const validMimeTypes = [
      "audio/webm",
      "audio/mp3",
      "audio/wav",
      "video/mp4",
      "video/webm",
      "video/x-matroska",
    ];

    if (!validExtensions.test(file.originalname)) {
      return cb(
        new ErrorResponse(
          "Invalid file extension. Please upload mp3, wav, webm, mp4, or mkv."
        )
      );
    }

    if (!validMimeTypes.includes(file.mimetype)) {
      return cb(
        new ErrorResponse(
          "Invalid file type. Please upload a valid audio or video file."
        )
      );
    }

    cb(null, true);
  },
});

clinicianRoutes.post(
  "/upload-audio",
  auth.protect(["assessment.update"]),
  upload.single("audio"), // Accept only one audio file
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json(new ErrorResponse("No file uploaded."));
      }

      // Validate magic bytes (Optional, if you have `checkFileType`)
      // await checkFileType(req.file.path, allowedMimes.appDetailVideo);

      next();
    } catch (error) {
      return res.status(400).json(new ErrorResponse(error.message));
    }
  },
  processAudio
);

module.exports = clinicianRoutes;
