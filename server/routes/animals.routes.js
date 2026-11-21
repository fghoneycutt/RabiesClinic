
const express = require('express');
const router = express.Router();

const {
  authenticate,
  resolveOrganizationContext
} = require('../middleware/auth.middleware');

const animalsController = require('../controllers/animals.controller');

// All animal routes require authentication and organization context.
router.use(authenticate);
router.use(resolveOrganizationContext);

// CREATE ANIMAL (legacy / general)
router.post(
  '/',
  animalsController.createAnimal
);

// GET ANIMALS BY OWNER (?owner_id=)
router.get(
  '/',
  animalsController.getAnimalsByOwner
);

// UPDATE ANIMAL (partial update)
router.put(
  '/:id',
  animalsController.updateAnimal
);

// CREATE ANIMAL FOR OWNER (new modal flow)
router.post(
  '/owner/:ownerId',
  animalsController.createAnimalForOwner
);

// DELETE ANIMAL
router.delete(
  '/:id',
  animalsController.deleteAnimal
);

module.exports = router;