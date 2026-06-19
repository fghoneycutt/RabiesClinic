const express = require('express');
const router = express.Router();

const controller = require('../controllers/users.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// ADMIN ONLY
router.post('/', authenticate, requireRole('admin'), controller.createUser);

router.put('/:id', authenticate, requireRole('admin'), controller.editUser);

router.get(
  '/',
  authenticate,
  requireRole('admin'),
  controller.listUsers
);

module.exports = router;