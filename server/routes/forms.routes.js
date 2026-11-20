
const express = require('express');
const multer = require('multer');

const router = express.Router();

const formsController = require('../controllers/forms.controllers');
const { authenticate } = require('../middleware/auth.middleware');

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
// REVIEW PDF UPLOAD CONFIGURATION
// ==========================================

const reviewPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('The review document must be a PDF.'));
    }

    cb(null, true);
  }
});

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

// Generate a combined PDF containing the review and uploaded documents
router.post(
  '/submissions/:id/combined-pdf',
  reviewPdfUpload.single('reviewPdf'),
  formsController.generateCombinedSubmissionPdf
);

// Update submission status
router.patch(
  '/submissions/:id/status',
  formsController.updateSubmissionStatus
);

// Delete a submission and all associated uploaded documents
router.delete(
  '/submissions/:id',
  authenticate,
  formsController.deleteSubmission
);

// ==========================================
// INDIVIDUAL FORM MANAGEMENT
// ==========================================

// Retrieve a specific form and its current definition
router.get('/:id', formsController.getFormById);

// Update the current form definition
router.put('/:id', formsController.updateForm);

// ==========================================
// STAFF REVIEW NOTES
// ==========================================

// Authentication ensures req.user is populated
// so created_by and updated_by can be recorded.

router.get(
  '/submissions/:id/notes',
  authenticate,
  formsController.getSubmissionNotes
);

router.post(
  '/submissions/:id/notes',
  authenticate,
  formsController.addSubmissionNote
);

router.patch(
  '/submissions/:id/notes/:noteId',
  authenticate,
  formsController.updateSubmissionNote
);

router.delete(
  '/submissions/:id/notes/:noteId',
  authenticate,
  formsController.deleteSubmissionNote
);

module.exports = router;
