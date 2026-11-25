
const signingStationsService = require('../services/signingStations.service');

const handleError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);

  return res.status(error.statusCode || 500).json({
    message: error.message || fallbackMessage
  });
};

exports.getStations = async (req, res) => {
  try {
    const stations = await signingStationsService.getStations(
      req.organizationId
    );

    return res.json(stations);
  } catch (error) {
    return handleError(res, error, 'Unable to load signing stations.');
  }
};

exports.createStation = async (req, res) => {
  try {
    const result = await signingStationsService.createStation(
      req.organizationId,
      req.user?.id,
      req.body.name
    );

    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error, 'Unable to create signing station.');
  }
};

exports.createPairingCode = async (req, res) => {
  try {
    const result = await signingStationsService.createPairingCode(
      req.organizationId,
      req.params.id
    );

    return res.json(result);
  } catch (error) {
    return handleError(res, error, 'Unable to create pairing code.');
  }
};

exports.pairStation = async (req, res) => {
  try {
    const result = await signingStationsService.pairStation(
      req.body.pairingCode
    );

    return res.json(result);
  } catch (error) {
    return handleError(res, error, 'Unable to pair signing station.');
  }
};

exports.getStationIdentity = async (req, res) => {
  return res.json({
    station: req.signingStation
  });
};

exports.deactivateStation = async (req, res) => {
  try {
    const station = await signingStationsService.deactivateStation(
      req.organizationId,
      req.params.id
    );

    return res.json({
      message: 'Signing station deactivated.',
      station
    });
  } catch (error) {
    return handleError(res, error, 'Unable to deactivate signing station.');
  }
};

exports.activateStation = async (req, res) => {
  try {
    const station = await signingStationsService.activateStation(
      req.organizationId,
      req.params.id
    );

    return res.json({
      message: 'Signing station reactivated. Generate a new pairing code to connect it.',
      station
    });
  } catch (error) {
    return handleError(res, error, 'Unable to reactivate signing station.');
  }
};
