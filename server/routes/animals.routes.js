const express = require('express');
const router = express.Router();

const animalsController = require('../controllers/animals.controller');

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

router.delete('/:id', animalsController.deleteAnimal);

module.exports = router;