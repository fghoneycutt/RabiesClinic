
const crypto = require('crypto');
const pool = require('../db');

exports.authenticateSigningCustomer = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ssn_')) {
      return res.status(401).json({
        message: 'Signing session authorization is required.'
      });
    }

    const token = authorization.slice(7);

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const result = await pool.query(
      `
        SELECT
          id,
          organization_id,
          station_id,
          status,
          expires_at
        FROM signing_sessions
        WHERE customer_token_hash = $1
          AND status IN ('displayed', 'in_progress')
          AND expires_at > NOW()
        LIMIT 1
      `,
      [tokenHash]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        message: 'This signing session is invalid, expired, or no longer active.'
      });
    }

    const session = result.rows[0];

    req.signingCustomer = {
      sessionId: session.id,
      organizationId: session.organization_id,
      stationId: session.station_id,
      status: session.status
    };

    return next();
  } catch (error) {
    console.error('Signing customer authentication error:', error);

    return res.status(500).json({
      message: 'Unable to authorize this signing session.'
    });
  }
};