
const express = require('express');
const router = express.Router();

const {
  authenticate,
  resolveOrganizationContext
} = require('../middleware/auth.middleware');

const { requireModule } = require('../middleware/module.middleware');

const clinicsController = require('../controllers/clinics.controller');

// All clinic routes require authentication,
// organization context, and Rabies Clinics module access.
router.use(
  authenticate,
  resolveOrganizationContext,
  requireModule('rabies_clinics')
);

// CREATE CLINIC
router.post('/', clinicsController.createClinic);

// GET ALL CLINICS
router.get('/', clinicsController.getClinics);

// SEARCH CLINIC OWNERS
router.get('/:id/search', clinicsController.searchClinicOwners);

// EXPORT CLINIC DATA
router.get('/:id/export', clinicsController.exportClinicData);

// GET PAGINATED CLINIC REGISTRATIONS
router.get('/:id/registrations', clinicsController.getClinicRegistrations);

// GET SINGLE CLINIC
router.get('/:id', clinicsController.getClinicById);

// UPDATE CLINIC
router.put('/:id', clinicsController.updateClinic);

// DELETE CLINIC
router.delete('/:id', clinicsController.deleteClinic);

module.exports = router;