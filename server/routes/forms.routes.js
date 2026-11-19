
const express = require('express');
const multer = require('multer');

const router = express.Router();

const formsController = require('../controllers/forms.controllers');

// ==========================================
// FILE UPLOAD CONFIGURATION
// ==========================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 20
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          'Only PDF, JPG, PNG, WebP, DOC, and DOCX files are allowed.'
        )
      );
    }

    cb(null, true);
  }
});

// Convert Multer errors into readable responses.
const handleUpload = (req, res, next) => {
  upload.any()(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.code === 'LIMIT_FILE_SIZE'
          ? 'Each uploaded file must be 10 MB or smaller.'
          : error.code === 'LIMIT_FILE_COUNT'
            ? 'You may upload no more than 20 files.'
            : error.message || 'File upload failed.'
      });
    }

    next();
  });
};

// ==========================================
// FORM MANAGEMENT
// ==========================================

// Create a new form (including its form_type)
router.post('/', formsController.createForm);

// List forms, optionally filtered by form_type
router.get('/', formsController.getForms);

// ==========================================
// PUBLIC FORM ROUTES
// ==========================================

// Retrieve the current form definition for public use
router.get('/public/:slug', formsController.getPublicForm);

// Submit an application, including any uploaded documents
router.post(
  '/public/:slug/submit',
  handleUpload,
  formsController.submitForm
);

// ==========================================
// SUBMISSION MANAGEMENT
// ==========================================

// List submissions
router.get('/submissions', formsController.getSubmissions);

// Retrieve an individual submission and its document links
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