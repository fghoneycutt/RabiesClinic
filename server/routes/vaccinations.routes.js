
const express = require('express');
const router = express.Router();

const {
  authenticate,
  resolveOrganizationContext
} = require('../middleware/auth.middleware');

const vaccinationsController = require('../controllers/vaccinations.controller');

// All vaccination routes require authentication and organization context.
router.use(authenticate);
router.use(resolveOrganizationContext);

// CREATE vaccination for an animal
router.post(
  '/:animalId',
  vaccinationsController.createVaccination
);

// UPDATE vaccination
router.put(
  '/:id',
  vaccinationsController.updateVaccination
);

// DELETE vaccination
router.delete(
  '/:id',
  vaccinationsController.deleteVaccination
);

// GENERATE ALL RABIES CERTIFICATES FOR OWNER
router.get(
  '/owner/:ownerId/clinic/:clinicId/certificates',
  vaccinationsController.generateOwnerRabiesCertificates
);

// GENERATE SINGLE RABIES CERTIFICATE
router.get(
  '/:id/certificate',
  vaccinationsController.generateRabiesCertificate
);

module.exports = router;