const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const ownersController = require('../controllers/owners.controller');

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
  authenticate,
  requireRole('admin', 'staff'),
  ownersController.deleteOwner
);

module.exports = router;