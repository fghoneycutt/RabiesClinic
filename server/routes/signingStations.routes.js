
const express = require('express');

const router = express.Router();

const {
  authenticate,
  resolveOrganizationContext
} = require('../middleware/auth.middleware');

const {
  authenticateSigningStation
} = require('../middleware/signingStation.middleware');

const controller = require('../controllers/signingStations.controller');

// ==========================================
// IPAD PAIRING
// ==========================================

router.post('/pair', controller.pairStation);

// ==========================================
// IPAD AUTHENTICATED ROUTES
// ==========================================

router.get(
  '/station/me',
  authenticateSigningStation,
  controller.getStationIdentity
);

// ==========================================
// STAFF MANAGEMENT ROUTES
// ==========================================

router.use(authenticate);
router.use(resolveOrganizationContext);

router.get('/', controller.getStations);
router.post('/', controller.createStation);

router.post('/:id/pairing-code', controller.createPairingCode);

router.patch('/:id/deactivate', controller.deactivateStation);
router.patch('/:id/activate', controller.activateStation);

module.exports = router;
