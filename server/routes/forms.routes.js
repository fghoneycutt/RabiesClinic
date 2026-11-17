
const express = require('express');
const router = express.Router();

const formsController = require('../controllers/forms.controllers');

// ==========================================
// FORM MANAGEMENT
// ==========================================

// Create a new form (including its form_type)
router.post('/', formsController.createForm);

// List forms, optionally filtered by form_type
// Examples:
// GET /forms
// GET /forms?form_type=surrender
// GET /forms?form_type=rescue
router.get('/', formsController.getForms);

// ==========================================
// PUBLIC FORM ROUTES
// ==========================================

// Retrieve the current form definition for public use
router.get('/public/:slug', formsController.getPublicForm);

// Submit an application
router.post('/public/:slug/submit', formsController.submitForm);

// ==========================================
// SUBMISSION MANAGEMENT
// ==========================================

// List submissions
router.get('/submissions', formsController.getSubmissions);

// Retrieve an individual submission
router.get('/submissions/:id', formsController.getSubmissionById);

// Update submission status
router.patch(
  '/submissions/:id/status',
  formsController.updateSubmissionStatus
);

// ==========================================
// INDIVIDUAL FORM MANAGEMENT
// ==========================================

// Retrieve a specific form and its current definition
router.get('/:id', formsController.getFormById);

// Update the current form definition
router.put('/:id', formsController.updateForm);

module.exports = router;