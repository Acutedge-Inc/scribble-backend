const morgan = require("morgan");
const nconf = require("nconf");

const logger = require("./logger");

module.exports = (app) => {
  const originalSend = app.response.send;

  app.response.send = function sendOverWrite(body) {
    originalSend.call(this, body);
    this.custombody = body;
  };

  morgan.format("customFormat", (tokens, req, res) => {
    const debug = nconf.get("ENABLE_DEBUG_LOG") || false;

    const id = req.params?.id || req.params?.application_id || req.query?.appId;
    const userId = req?.user?.userId || null;

    const status = tokens.status(req, res);

    if (!status) {
      const appId =
        req.params?.id || req.params?.application_id || req.query?.appId;
      let requestBody = "";
      if (debug) {
        if (Object.keys(req.params).length > 0) requestBody = req.params;
        else if (Object.keys(req.body).length > 0) requestBody = req.body;
        else if (Object.keys(req.query).length > 0) requestBody = req.query;
        requestBody = !requestBody
          ? ""
          : `:: Request details: ${JSON.stringify(requestBody)}`;
      } else {
        requestBody = !appId ? "" : `:: for ID: ${appId}`;
      }

      const ipAddress =
        req.ip || (req.socket && req.socket.remoteAddress) || null;

      return `Request received in :: API Request ID: ${req.apiId}${userId ? ` :: User ID: ${userId}` : ""} :: ${ipAddress ? `Client IP: ${ipAddress} ::` : ""} Method: ${req.method.toUpperCase()} :: URL: ${req.originalUrl} ${requestBody}`;
    }
    let responseBody = "";
    if (status >= 400) {
      const responseError =
        res.custombody instanceof Error ? res.custombody : null;
      if (responseError) {
        responseBody = `Error message response: ${responseError.message} :: Stack: ${responseError.stack} ::`;
      } else {
        responseBody = `Error message response: ${JSON.stringify(res.custombody)} ::`;
      }
    } else if (debug) {
      responseBody = `Response details: ${JSON.stringify(res.custombody)} ::`;
    } else {
      responseBody = !id ? "" : `for ID: ${id} ::`;
    }

    return `Request processed ${status >= 400 ? "failing " : ""}in :: API Request ID: ${req.apiId}${userId ? ` :: User ID: ${userId}` : ""} :: Client IP: ${tokens["remote-addr"](req, res)} :: Method: ${tokens.method(req, res)} :: URL: ${tokens.url(req, res)} :: ${responseBody} Response Time: ${tokens["response-time"](req, res)}ms :: Status Code: ${status}`;
  });

  const requestMorganMiddleware = morgan("customFormat", {
    stream: logger.stream,
    immediate: true,
  });

  const responseMorganMiddleware = morgan("customFormat", {
    stream: logger.stream,
    immediate: false,
  });

  app.use(requestMorganMiddleware);
  app.use(responseMorganMiddleware);
};
