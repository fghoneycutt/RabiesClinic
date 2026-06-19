const express = require('express');
const router = express.Router();

const vaccinationsController = require('../controllers/vaccinations.controller');

// CREATE vaccination for an animal
router.post('/:animalId', vaccinationsController.createVaccination);

// UPDATE vaccination
router.put('/:id', vaccinationsController.updateVaccination);

// DELETE vaccination
router.delete('/:id', vaccinationsController.deleteVaccination);

// GENERATE RABIES CERTIFICATE
router.get(
  '/:id/certificate',
  vaccinationsController.generateRabiesCertificate
);

module.exports = router;