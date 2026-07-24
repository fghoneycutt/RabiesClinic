const express = require('express');
const router = express.Router();
const multer = require('multer');

const controller = require('../controllers/users.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB
  }
});

// ADMIN ONLY
router.post('/', authenticate, requireRole('admin'), controller.createUser);

router.put('/:id', authenticate, requireRole('admin'), controller.editUser);

router.put(
  '/:id/password',
  authenticate,
  requireRole('admin'),
  controller.resetPassword
);

router.post(
  '/:id/signature',
  authenticate,
  requireRole('admin'),
  upload.single('signature'),
  controller.uploadSignature
);

router.get(
  '/:id/signature',
  authenticate,
  controller.getSignature
);

router.get(
  '/',
  authenticate,
  requireRole('admin'),
  controller.listUsers
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  controller.deleteUser
);

module.exports = router;