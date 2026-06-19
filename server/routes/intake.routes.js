const express = require('express');
const router = express.Router();
const intakeController = require('../controllers/intake.controller');

// CREATE INTAKE
router.post('/', intakeController.createIntake);

module.exports = router;