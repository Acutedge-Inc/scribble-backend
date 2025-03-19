const fs = require("fs");

module.exports.removeReport = (req, res, next) => {
  res.on("finish", async () => {
    if (res.locals.fileToDelete) {
      fs.rmdirSync(res.locals.fileToDelete, { recursive: true });
      // fs.unlinkSync(`${res.locals.fileToDelete}.zip`);
    }
  });
  next();
};

module.exports.removeZip = (req, res, next) => {
  res.on("finish", async () => {
    if (res.locals.fileToDelete) {
      fs.unlinkSync(`${res.locals.fileToDelete}`);
    }
  });
  next();
};
