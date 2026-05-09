/**
 * middleware/authMiddleware.js
 * Demo mode — no Firebase token required.
 * Reads x-demo-role header: 'instructor' | 'student' (defaults to 'student').
 */

const authMiddleware = (req, res, next) => {
  // x-demo-role header (normal API calls) OR ?role= query param (<video> streaming)
  const role = req.headers['x-demo-role'] || req.query.role || 'student';
  req.user = {
    uid:   `demo-${role}`,
    email: `${role}@demo.kodr`,
    role,
  };
  next();
};

const requireInstructor = (req, res, next) => {
  if (req.user?.role !== 'instructor') {
    return res.status(403).json({
      success: false,
      error:   'Access denied. Instructor role required.',
      code:    403,
    });
  }
  next();
};

module.exports = { authMiddleware, requireInstructor };
