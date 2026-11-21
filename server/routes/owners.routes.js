
const express = require('express');
const router = express.Router();

const {
  authenticate,
  resolveOrganizationContext,
  requireRole
} = require('../middleware/auth.middleware');

const ownersController = require('../controllers/owners.controller');

// All owner routes require authentication and organization context.
router.use(authenticate);
router.use(resolveOrganizationContext);

// CREATE OWNER
router.post(
  '/',
  ownersController.createOwner
);

// SEARCH OWNERS
router.get(
  '/',
  ownersController.searchOwners
);

// GET OWNER BY ID
router.get(
  '/:id',
  ownersController.getOwnerById
);

// UPDATE OWNER
router.put(
  '/:id',
  ownersController.updateOwner
);

// DELETE OWNER
router.delete(
  '/:id',
  requireRole('admin'),
  ownersController.deleteOwner
);

module.exports = router;