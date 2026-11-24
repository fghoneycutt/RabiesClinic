
const express = require('express');
const router = express.Router();

const {
  authenticate,
  resolveOrganizationContext
} = require('../middleware/auth.middleware');

const { requireModule } = require('../middleware/module.middleware');

const vaccinationsController = require('../controllers/vaccinations.controller');

// All vaccination routes require authentication,
// organization context, and Rabies Clinics module access.
router.use(
  authenticate,
  resolveOrganizationContext,
  requireModule('rabies_clinics')
);

// CREATE VACCINATION FOR AN ANIMAL
router.post('/:animalId', vaccinationsController.createVaccination);

// UPDATE VACCINATION
router.put('/:id', vaccinationsController.updateVaccination);

// DELETE VACCINATION
router.delete('/:id', vaccinationsController.deleteVaccination);

// GENERATE ALL RABIES CERTIFICATES FOR OWNER
router.get(
  '/owner/:ownerId/clinic/:clinicId/certificates',
  vaccinationsController.generateOwnerRabiesCertificates
);

// GENERATE SINGLE RABIES CERTIFICATE
router.get('/:id/certificate', vaccinationsController.generateRabiesCertificate);

module.exports = router;
