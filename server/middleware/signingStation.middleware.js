
const crypto = require('crypto');
const pool = require('../db');

const hashValue = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

async function authenticateSigningStation(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Signing station authentication required.'
      });
    }

    const token = authorization.slice(7).trim();

    if (!token.startsWith('sst_')) {
      return res.status(401).json({
        message: 'Invalid signing station credential.'
      });
    }

    const result = await pool.query(
      `UPDATE signing_stations
       SET last_seen_at = NOW()
       WHERE station_token_hash = $1
         AND is_active = TRUE
       RETURNING id, organization_id, name`,
      [hashValue(token)]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Signing station is not registered or is inactive.'
      });
    }

    const station = result.rows[0];

    req.signingStation = {
      id: station.id,
      organizationId: station.organization_id,
      name: station.name
    };

    next();
  } catch (error) {
    console.error('Signing station authentication error:', error);

    return res.status(500).json({
      message: 'Unable to authenticate signing station.'
    });
  }
}

module.exports = {
  authenticateSigningStation
};
