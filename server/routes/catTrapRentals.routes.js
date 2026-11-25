
const express = require('express');
const multer = require('multer');

const router = express.Router();

const {
  authenticate,
  resolveOrganizationContext
} = require('../middleware/auth.middleware');

const { requireModule } = require('../middleware/module.middleware');

const catTrapRentalsController = require('../controllers/catTrapRentals.controller');

// In-memory signature uploads, limited to 10 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Signatures must be PNG, JPG, or WebP images.'));
    }

    cb(null, true);
  }
});

// All cat trap rental routes require authentication,
// organization context, and the Cat Trap Rentals module.
router.use(authenticate);
router.use(resolveOrganizationContext);
router.use(requireModule('cat_trap_rentals'));

// SETTINGS
router.get('/settings', catTrapRentalsController.getSettings);
router.put('/settings', catTrapRentalsController.updateSettings);

// DASHBOARD
router.get('/dashboard', catTrapRentalsController.getDashboard);

// RENTALS
router.get('/rentals', catTrapRentalsController.getRentals);
router.patch(
  '/rentals/:id/extend',
  catTrapRentalsController.extendRentalDueDate
);
router.get('/rentals/:id', catTrapRentalsController.getRentalById);

router.post(
  '/rentals',
  upload.single('signatureFile'),
  catTrapRentalsController.createRental
);

router.post(
  '/rentals/:id/return',
  upload.single('signatureFile'),
  catTrapRentalsController.returnRental
);

router.get(
  '/rentals/:id/print',
  catTrapRentalsController.getRentalPrintData
);

router.patch(
  '/rentals/:id/return-details',
  catTrapRentalsController.updateRentalReturnDetails
);

module.exports = router;