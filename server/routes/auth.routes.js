const express = require('express');
const router = express.Router();

const controller = require('../controllers/auth.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// public
router.post('/login', controller.login);

// TEMP: admin-only registration
router.post(
  '/register',
  controller.register,
);

router.get('/me', authenticate, controller.me);

module.exports = router;