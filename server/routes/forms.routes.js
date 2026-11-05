
const express = require('express');
const router = express.Router();

const formsController = require('../controllers/forms.controllers');

// ==========================================
// FORM MANAGEMENT
// ==========================================

// Create a new form
router.post('/', formsController.createForm);

// List all forms
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
