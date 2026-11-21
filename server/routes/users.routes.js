
const express = require('express');
const router = express.Router();
const multer = require('multer');

const controller = require('../controllers/users.controller');

const {
  authenticate,
  resolveOrganizationContext,
  requireRole
} = require('../middleware/auth.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB
  }
});

// All user routes require authentication
// and an active organization context.
router.use(authenticate);
router.use(resolveOrganizationContext);

// ADMIN ONLY
router.post('/', requireRole('admin'), controller.createUser);

router.put('/:id', requireRole('admin'), controller.editUser);

router.put(
  '/:id/password',
  requireRole('admin'),
  controller.resetPassword
);

router.post(
  '/:id/signature',
  requireRole('admin'),
  upload.single('signature'),
  controller.uploadSignature
);

// Any authenticated user can retrieve a signature.
// Controller must verify organization ownership.
router.get('/:id/signature', controller.getSignature);

// List users within the active organization.
router.get('/', controller.listUsers);

// ADMIN ONLY
router.delete('/:id', requireRole('admin'), controller.deleteUser);

module.exports = router;