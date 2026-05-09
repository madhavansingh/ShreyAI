/**
 * Global error handler middleware.
 * Must be the LAST middleware registered in index.js (after all routes).
 */
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Log in development
  if (isDev) {
    console.error(`❌ [${statusCode}] ${req.method} ${req.url}`);
    console.error(err.stack || err.message);
  } else {
    // In production, only log 5xx errors
    if (statusCode >= 500) {
      console.error(`❌ Server Error: ${err.message}`);
    }
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    code: statusCode,
    ...(isDev && { stack: err.stack }), // only include stack in dev
  });
};

module.exports = errorHandler;
