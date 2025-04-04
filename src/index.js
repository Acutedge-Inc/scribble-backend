const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const useragent = require("express-useragent");
const helmet = require("helmet");
const methodOverride = require("method-override");
const { randomUUID } = require("crypto");

const routes = require("./routes/index.js");
const { session } = require("./lib");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  cors({
    maxAge: 86400,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(useragent.express());
// Sets "X-Content-Type-Options: nosniff"
app.use(helmet.noSniff());

// Sets "X-Frame-Options: SAMEORIGIN"
app.use(
  helmet.frameguard({
    action: "sameorigin",
  })
);

session.handleSessionExpiry();

// Sets "X-XSS-Protection: 1; mode=block"
app.use((req, res, next) => {
  req.apiId = randomUUID();
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  next();
});

const swaggerDocument = require("./swagger/swagger.json");
const swaggerUrl =
  process.env.NODE_ENV === "local"
    ? `http://localhost:3000/api/`
    : `${process.env.API_URL}/api/`;
swaggerDocument.servers.push({
  url: swaggerUrl,
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [
        "'none'",
        "https://fonts.gstatic.com",
        "https://fonts.googleapis.com",
      ],
      imgSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      mediaSrc: ["'self'"],
      requireTrustedTypesFor: ["'script'"],
    },
  })
);

// setup routers
routes(app);

app.use(methodOverride());

// catch 404 and forward it to error handler
app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.statusCode = 404;
  next(err);
});

// error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // AG-741 (If we get "Invalid Content-Type" error from multer fileFilter)
  if (err.message === "Invalid Content-Type")
    return res.status(err?.statusCode || 400).json({
      status: "error",
      errorMessage: "Content-Type and Extension dont match!",
      errorCode: "WRONG_INPUT",
      data: null,
    });

  return res.status(err?.statusCode || err?.errorCode || 500).json({
    status: "error",
    errorMessage: err?.message ? err?.message : "Some unexpected error found!",
    data: {},
  });
});

module.exports = app;
