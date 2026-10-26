
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const requestedStatus = Number(err.statusCode);

  const statusCode =
    Number.isInteger(requestedStatus) &&
    requestedStatus >= 400 &&
    requestedStatus <= 599
      ? requestedStatus
      : 500;

  if (statusCode >= 500) {
    console.error("API error:", err);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "Internal server error"
        : err.message || "Request failed",
  });
}
