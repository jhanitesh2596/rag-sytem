import logger from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  logger.error({
    message: err.message,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "Internal Server Error"
        : err.message,
  });
}
