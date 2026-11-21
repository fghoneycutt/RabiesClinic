
const express = require('express');
const router = express.Router();

const controller = require('../controllers/auth.controller');

const {
  authenticate,
  requireOrganizationAdmin
} = require('../middleware/auth.middleware');

// -----------------------------
// LOGIN
// -----------------------------
router.post('/login', controller.login);

// -----------------------------
// REGISTER USER
// Organization administrator only
// -----------------------------
router.post(
  '/register',
  authenticate,
  requireOrganizationAdmin,
  controller.register
);

// -----------------------------
// CURRENT USER
// -----------------------------
router.get(
  '/me',
  authenticate,
  controller.me
);

module.exports = router;