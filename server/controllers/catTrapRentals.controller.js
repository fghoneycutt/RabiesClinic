
const catTrapRentalsService = require('../services/catTrapRentals.service');

// ==========================================
// HELPERS
// ==========================================

const sendServerError = (res, error) => {
  console.error('Cat Trap Rentals error:', error);

  return res.status(500).json({
    message: 'An error occurred while processing the cat trap rental request.'
  });
};

const getRentalId = (req) => {
  const id = Number(req.params.id);

  return Number.isInteger(id) && id > 0 ? id : null;
};

// ==========================================
// SETTINGS
// ==========================================

// GET /api/cat-trap-rentals/settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await catTrapRentalsService.getSettings(
      req.organizationId
    );

    return res.json(settings);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return sendServerError(res, error);
  }
};

// PUT /api/cat-trap-rentals/settings
exports.updateSettings = async (req, res) => {
  try {
    const settings = await catTrapRentalsService.updateSettings(
      req.organizationId,
      req.body
    );

    return res.json({
      message: 'Cat trap rental settings updated successfully.',
      settings
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return sendServerError(res, error);
  }
};

// ==========================================
// DASHBOARD
// ==========================================

// GET /api/cat-trap-rentals/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const dashboard = await catTrapRentalsService.getDashboard(
      req.organizationId
    );

    return res.json(dashboard);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return sendServerError(res, error);
  }
};

// ==========================================
// RENTALS
// ==========================================

// GET /api/cat-trap-rentals/rentals
exports.getRentals = async (req, res) => {
  try {
    const rentals = await catTrapRentalsService.getRentals(
      req.organizationId,
      req.query
    );

    return res.json(rentals);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return sendServerError(res, error);
  }
};

// GET /api/cat-trap-rentals/rentals/:id
exports.getRentalById = async (req, res) => {
  const rentalId = getRentalId(req);

  if (!rentalId) {
    return res.status(400).json({
      message: 'Invalid rental ID.'
    });
  }

  try {
    const rental = await catTrapRentalsService.getRentalById(
      req.organizationId,
      rentalId
    );

    if (!rental) {
      return res.status(404).json({
        message: 'Rental not found.'
      });
    }

    return res.json(rental);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return sendServerError(res, error);
  }
};

// ==========================================
// EXTEND RENTAL DUE DATE
// PATCH /api/cat-trap-rentals/rentals/:id/extend
// ==========================================

exports.extendRentalDueDate = async (req, res) => {
  const rentalId = getRentalId(req);

  if (!rentalId) {
    return res.status(400).json({
      message: 'Invalid rental ID.'
    });
  }

  const { expectedReturnDate } = req.body;

  if (
    typeof expectedReturnDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(expectedReturnDate) ||
    Number.isNaN(Date.parse(`${expectedReturnDate}T00:00:00`))
  ) {
    return res.status(400).json({
      message: 'A valid expected return date is required.'
    });
  }

  try {
    const rental = await catTrapRentalsService.extendRentalDueDate(
      req.organizationId,
      rentalId,
      expectedReturnDate
    );

    return res.json({
      message: 'Cat trap rental due date extended successfully.',
      rental
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return sendServerError(res, error);
  }
};

// ==========================================
// CREATE PENDING RENTAL
// POST /api/cat-trap-rentals/rentals
// ==========================================

exports.createRental = async (req, res) => {
  try {
    const rental = await catTrapRentalsService.createRental(
      req.organizationId,
      req.user?.id,
      req.body
    );

    return res.status(201).json({
      message: 'Rental created and inventory reserved. Contract review and signature are required.',
      rental
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return sendServerError(res, error);
  }
};

// ==========================================
// RETURN RENTAL
// POST /api/cat-trap-rentals/rentals/:id/return
// ==========================================

exports.returnRental = async (req, res) => {
  const rentalId = getRentalId(req);

  if (!rentalId) {
    return res.status(400).json({
      message: 'Invalid rental ID.'
    });
  }

  try {
    const rental = await catTrapRentalsService.returnRental(
      req.organizationId,
      rentalId,
      req.user?.id,
      req.body,
      req.file || null
    );

    return res.json({
      message: 'Cat trap rental returned successfully.',
      rental
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return sendServerError(res, error);
  }
};

// ==========================================
// GET RENTAL PRINT DATA
// GET /api/cat-trap-rentals/rentals/:id/print
// ==========================================

exports.getRentalPrintData = async (req, res) => {
  const rentalId = getRentalId(req);

  if (!rentalId) {
    return res.status(400).json({
      message: 'Invalid rental ID.'
    });
  }

  try {
    const data = await catTrapRentalsService.getRentalPrintData(
      req.organizationId,
      rentalId
    );

    if (!data) {
      return res.status(404).json({
        message: 'Rental not found.'
      });
    }

    return res.json(data);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return sendServerError(res, error);
  }
};

// ==========================================
// UPDATE COMPLETED RETURN DETAILS
// PATCH /api/cat-trap-rentals/rentals/:id/return-details
// ==========================================

exports.updateRentalReturnDetails = async (req, res) => {
  const rentalId = getRentalId(req);

  if (!rentalId) {
    return res.status(400).json({
      message: 'Invalid rental ID.'
    });
  }

  try {
    const rental = await catTrapRentalsService.updateRentalReturnDetails(
      req.organizationId,
      rentalId,
      req.body
    );

    return res.json({
      message: 'Return details updated successfully.',
      rental
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return sendServerError(res, error);
  }
};