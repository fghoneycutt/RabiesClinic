const express = require('express');
const router = express.Router();
const clinicsController = require('../controllers/clinics.controller');

// CREATE CLINIC
router.post('/', clinicsController.createClinic);

// GET ALL CLINICS
router.get('/', clinicsController.getClinics);

// SEARCH 
router.get(
  '/:id/search',
  clinicsController.searchClinicOwners
);

// EXPORT CLINIC DATA
router.get('/:id/export', clinicsController.exportClinicData);

// GET PAGINATED CLINIC REGISTRATIONS SORTED BY RECENT
router.get('/:id/registrations', clinicsController.getClinicRegistrations);

// GET SINGLE CLINIC
router.get('/:id', clinicsController.getClinicById);

// UPDATE CLINIC
router.put('/:id', clinicsController.updateClinic);

// DELETE CLINIC
router.delete('/:id', clinicsController.deleteClinic);

module.exports = router;