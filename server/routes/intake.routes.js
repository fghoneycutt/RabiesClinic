
const express = require('express');
const router = express.Router();

const {
  authenticate,
  resolveOrganizationContext
} = require('../middleware/auth.middleware');

const intakeController = require('../controllers/intake.controller');

// All intake routes require authentication
// and an active organization context.
router.use(authenticate);
router.use(resolveOrganizationContext);

// CREATE INTAKE
router.post('/', intakeController.createIntake);

module.exports = router;