
const express = require('express');
const multer = require('multer');

const router = express.Router();

const {
  getLobbySlides,
  getDisplaySlides,
  createLobbySlide,
  updateLobbySlide,
  deleteLobbySlide
} = require('../controllers/lobbySlides.controller');

// Receive uploaded images in memory before sending them to Supabase.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WebP images are allowed.'));
    }

    cb(null, true);
  }
});

// Public endpoint for the Roku slideshow.
router.get('/display', getDisplaySlides);

// Staff management endpoints.
router.get('/', getLobbySlides);

router.post(
  '/',
  upload.single('image'),
  createLobbySlide
);

router.put('/:id', updateLobbySlide);

router.delete('/:id', deleteLobbySlide);

module.exports = router;
