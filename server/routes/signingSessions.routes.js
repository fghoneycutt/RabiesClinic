
const express = require('express');
const multer = require('multer');

const router = express.Router();

const {
  authenticate,
  resolveOrganizationContext
} = require('../middleware/auth.middleware');

const {
  authenticateSigningStation
} = require('../middleware/signingStation.middleware');

const {
  authenticateSigningCustomer
} = require('../middleware/signingCustomer.middleware');

const controller = require('../controllers/signingSessions.controller');

// ==========================================
// SIGNATURE UPLOAD CONFIGURATION
// ==========================================

const signatureUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (file.mimetype !== 'image/png') {
      const error = new Error('Only PNG signature images are accepted.');
      error.statusCode = 400;
      return callback(error);
    }

    callback(null, true);
  }
});

const handleSignatureUpload = (req, res, next) => {
  signatureUpload.single('signature')(req, res, (error) => {
    if (error) {
      const statusCode =
        error.code === 'LIMIT_FILE_SIZE'
          ? 413
          : error.statusCode || 400;

      return res.status(statusCode).json({
        message:
          statusCode === 413
            ? 'Signature image must be 2 MB or smaller.'
            : error.message || 'Invalid signature upload.'
      });
    }

    next();
  });
};

// ==========================================
// iPAD SIGNING STATION ROUTES
// ==========================================

router.get(
  '/station/next',
  authenticateSigningStation,
  controller.claimNextSigningSession
);

router.get(
  '/station/recover',
  authenticateSigningStation,
  controller.recoverActiveSigningSession
);

// ==========================================
// CUSTOMER SIGNING ROUTES
// ==========================================

router.post(
  '/customer/start',
  authenticateSigningCustomer,
  controller.startCustomerSigningSession
);

router.post(
  '/customer/signature',
  authenticateSigningCustomer,
  handleSignatureUpload,
  controller.submitSigningSignature
);

// ==========================================
// STAFF SIGNING SESSION ROUTES
// ==========================================

router.use(authenticate);
router.use(resolveOrganizationContext);

router.post(
  '/',
  controller.createSigningSession
);

// List signing sessions.
router.get(
  '/',
  controller.listSigningSessions
);

// Cancel a signing session.
router.patch(
  '/:id/cancel',
  controller.cancelSigningSession
);

module.exports = router;
