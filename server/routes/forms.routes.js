
const express = require('express');
const multer = require('multer');

const router = express.Router();

const formsController = require('../controllers/forms.controllers');

const {
  authenticate,
  resolveOrganizationContext
} = require('../middleware/auth.middleware');

const {
  requireFormModuleFromBody,
  requireFormModuleFromFormId,
  requireFormModuleFromSubmissionId,
  requirePublicFormModuleFromSlug
} = require('../middleware/module.middleware');

// ==========================================
// FILE UPLOAD CONFIGURATION
// ==========================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
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

// ==========================================
// REVIEW PDF UPLOAD CONFIGURATION
// ==========================================

const reviewPdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
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
// UPLOAD ERROR HANDLING
// ==========================================

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

const handleReviewPdfUpload = (req, res, next) => {
  reviewPdfUpload.single('reviewPdf')(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.code === 'LIMIT_FILE_SIZE'
          ? 'The review PDF must be 20 MB or smaller.'
          : error.code === 'LIMIT_FILE_COUNT'
            ? 'Only one review PDF may be uploaded.'
            : error.message || 'Review PDF upload failed.'
      });
    }

    next();
  });
};

// ==========================================
// STAFF AUTHENTICATION AND ORGANIZATION
// ==========================================

const staffAccess = [
  authenticate,
  resolveOrganizationContext
];

// ==========================================
// FORM MANAGEMENT
// ==========================================

// Create a form.
router.post(
  '/',
  ...staffAccess,
  requireFormModuleFromBody,
  formsController.createForm
);

// List forms.
router.get(
  '/',
  ...staffAccess,
  formsController.getForms
);

// ==========================================
// SUBMISSION MANAGEMENT
// Keep these routes ABOVE /:id.
// ==========================================

// List submissions.
router.get(
  '/submissions',
  ...staffAccess,
  formsController.getSubmissions
);

// Retrieve an individual submission.
router.get(
  '/submissions/:id',
  ...staffAccess,
  requireFormModuleFromSubmissionId,
  formsController.getSubmissionById
);

// Generate a combined review PDF.
router.post(
  '/submissions/:id/combined-pdf',
  ...staffAccess,
  requireFormModuleFromSubmissionId,
  handleReviewPdfUpload,
  formsController.generateCombinedSubmissionPdf
);

// Update submission status.
router.patch(
  '/submissions/:id/status',
  ...staffAccess,
  requireFormModuleFromSubmissionId,
  formsController.updateSubmissionStatus
);

// Delete a submission and associated uploaded documents.
router.delete(
  '/submissions/:id',
  ...staffAccess,
  requireFormModuleFromSubmissionId,
  formsController.deleteSubmission
);

// ==========================================
// STAFF REVIEW NOTES
// ==========================================

router.get(
  '/submissions/:id/notes',
  ...staffAccess,
  requireFormModuleFromSubmissionId,
  formsController.getSubmissionNotes
);

router.post(
  '/submissions/:id/notes',
  ...staffAccess,
  requireFormModuleFromSubmissionId,
  formsController.addSubmissionNote
);

router.patch(
  '/submissions/:id/notes/:noteId',
  ...staffAccess,
  requireFormModuleFromSubmissionId,
  formsController.updateSubmissionNote
);

router.delete(
  '/submissions/:id/notes/:noteId',
  ...staffAccess,
  requireFormModuleFromSubmissionId,
  formsController.deleteSubmissionNote
);

// ==========================================
// PUBLIC FORM ROUTES
// ==========================================

// Public endpoints remain unauthenticated.
// Middleware verifies the form's organization and module.
router.get(
  '/public/:slug',
  requirePublicFormModuleFromSlug,
  formsController.getPublicForm
);

router.post(
  '/public/:slug/submit',
  requirePublicFormModuleFromSlug,
  handleUpload,
  formsController.submitForm
);

// ==========================================
// INDIVIDUAL FORM ROUTES
// Keep these AFTER /submissions.
// ==========================================

// Retrieve a specific form.
router.get(
  '/:id',
  ...staffAccess,
  requireFormModuleFromFormId,
  formsController.getFormById
);

// Update a specific form.
router.put(
  '/:id',
  ...staffAccess,
  requireFormModuleFromFormId,
  formsController.updateForm
);

module.exports = router;