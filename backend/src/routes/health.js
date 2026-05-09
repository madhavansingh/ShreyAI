const express = require('express');
const router = express.Router();

// GET /api/health — liveness probe
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SheryAI — AI Learning Companion API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;
