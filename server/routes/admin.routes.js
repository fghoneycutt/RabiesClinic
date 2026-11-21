
const express = require('express');
const router = express.Router();

const controller = require('../controllers/admin.controllers');

const {
  authenticate,
  requirePlatformAdmin
} = require('../middleware/auth.middleware');

// All routes in this file require platform administrator access.
router.use(authenticate, requirePlatformAdmin);

// Dashboard
router.get('/overview', controller.getPlatformOverview);

// Organizations
router.get('/organizations', controller.getOrganizations);
router.post('/organizations', controller.createOrganization);
router.put('/organizations/:id', controller.updateOrganization);
router.patch(
  '/organizations/:id/status',
  controller.updateOrganizationStatus
);

// Modules
router.get('/modules', controller.getModules);
router.put(
  '/organizations/:id/modules',
  controller.updateOrganizationModules
);

module.exports = router;
