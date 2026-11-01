// ============================================================
// src/middleware/errorHandler.js - Centralized Error Handler
// ============================================================

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        return res.status(409).json({
          success: false,
          message: 'Duplicate entry: ' + (err.detail || 'Record already exists')
        });
      case '23503': // foreign_key_violation
        return res.status(400).json({
          success: false,
          message: 'Referenced record does not exist'
        });
      case '23514': // check_violation
        return res.status(400).json({
          success: false,
          message: 'Data validation failed: ' + (err.detail || err.message)
        });
      case 'P0001': // raise_exception from PL/pgSQL
        return res.status(400).json({
          success: false,
          message: err.message
        });
      default:
        break;
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Default
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
