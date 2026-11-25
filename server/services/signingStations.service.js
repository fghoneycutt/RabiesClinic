
const crypto = require('crypto');
const pool = require('../db');

// ==========================================
// HELPERS
// ==========================================

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

function generateStationToken() {
  return `sst_${crypto.randomBytes(32).toString('hex')}`;
}

function generatePairingCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function validateOrganizationId(organizationId) {
  if (!organizationId) {
    throw createError('Organization ID is required.', 400);
  }
}

// ==========================================
// LIST SIGNING STATIONS
// ==========================================

async function getStations(organizationId) {
  validateOrganizationId(organizationId);

  const result = await pool.query(
    `
      SELECT
        id,
        name,
        is_active,
        last_seen_at,
        pairing_expires_at,
        created_at,
        updated_at,
        CASE
          WHEN station_token_hash IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS is_paired
      FROM signing_stations
      WHERE organization_id = $1
      ORDER BY name ASC
    `,
    [organizationId]
  );

  return result.rows;
}

// ==========================================
// CREATE SIGNING STATION
// ==========================================

async function createStation(organizationId, userId, name) {
  validateOrganizationId(organizationId);

  const stationName = typeof name === 'string' ? name.trim() : '';

  if (!stationName) {
    throw createError('Station name is required.', 400);
  }

  if (stationName.length > 100) {
    throw createError('Station name cannot exceed 100 characters.', 400);
  }

  const result = await pool.query(
    `
      INSERT INTO signing_stations (
        organization_id,
        name,
        created_by,
        is_active
      )
      VALUES ($1, $2, $3, TRUE)
      RETURNING
        id,
        name,
        is_active,
        last_seen_at,
        pairing_expires_at,
        created_at,
        updated_at,
        FALSE AS is_paired
    `,
    [organizationId, stationName, userId || null]
  );

  return result.rows[0];
}

// ==========================================
// CREATE PAIRING CODE
// ==========================================

async function createPairingCode(organizationId, stationId) {
  validateOrganizationId(organizationId);

  if (!stationId) {
    throw createError('Station ID is required.', 400);
  }

  const pairingCode = generatePairingCode();
  const pairingCodeHash = hashToken(pairingCode);

  const result = await pool.query(
    `
      UPDATE signing_stations
      SET
        pairing_code_hash = $1,
        pairing_expires_at = NOW() + INTERVAL '10 minutes',
        station_token_hash = NULL,
        updated_at = NOW()
      WHERE id = $2
        AND organization_id = $3
        AND is_active = TRUE
      RETURNING id, name, pairing_expires_at
    `,
    [pairingCodeHash, stationId, organizationId]
  );

  if (result.rows.length === 0) {
    throw createError(
      'Signing station was not found or is inactive.',
      404
    );
  }

  return {
    pairingCode,
    expiresAt: result.rows[0].pairing_expires_at,
    station: {
      id: result.rows[0].id,
      name: result.rows[0].name
    }
  };
}

// ==========================================
// PAIR SIGNING STATION
// ==========================================

async function pairStation(pairingCode) {
  if (typeof pairingCode !== 'string' || !pairingCode.trim()) {
    throw createError('Pairing code is required.', 400);
  }

  const normalizedCode = pairingCode.trim().toUpperCase();
  const pairingCodeHash = hashToken(normalizedCode);

  const stationToken = generateStationToken();
  const stationTokenHash = hashToken(stationToken);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const stationResult = await client.query(
      `
        SELECT
          id,
          organization_id,
          name
        FROM signing_stations
        WHERE pairing_code_hash = $1
          AND pairing_expires_at > NOW()
          AND is_active = TRUE
        FOR UPDATE
      `,
      [pairingCodeHash]
    );

    if (stationResult.rows.length === 0) {
      throw createError(
        'Pairing code is invalid, expired, or already used.',
        400
      );
    }

    const station = stationResult.rows[0];

    const updateResult = await client.query(
      `
        UPDATE signing_stations
        SET
          station_token_hash = $1,
          pairing_code_hash = NULL,
          pairing_expires_at = NULL,
          last_seen_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `,
      [stationTokenHash, station.id]
    );

    if (updateResult.rows.length === 0) {
      throw createError('Unable to complete station pairing.', 500);
    }

    await client.query('COMMIT');

    return {
      stationToken,
      station: {
        id: station.id,
        organizationId: station.organization_id,
        name: station.name
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// DEACTIVATE SIGNING STATION
// ==========================================

async function deactivateStation(organizationId, stationId) {
  validateOrganizationId(organizationId);

  const result = await pool.query(
    `
      UPDATE signing_stations
      SET
        is_active = FALSE,
        station_token_hash = NULL,
        pairing_code_hash = NULL,
        pairing_expires_at = NULL,
        updated_at = NOW()
      WHERE id = $1
        AND organization_id = $2
      RETURNING
        id,
        name,
        is_active,
        last_seen_at,
        pairing_expires_at,
        created_at,
        updated_at,
        FALSE AS is_paired
    `,
    [stationId, organizationId]
  );

  if (result.rows.length === 0) {
    throw createError('Signing station not found.', 404);
  }

  return result.rows[0];
}

// ==========================================
// ACTIVATE SIGNING STATION
// ==========================================

async function activateStation(organizationId, stationId) {
  validateOrganizationId(organizationId);

  const result = await pool.query(
    `
      UPDATE signing_stations
      SET
        is_active = TRUE,
        station_token_hash = NULL,
        pairing_code_hash = NULL,
        pairing_expires_at = NULL,
        updated_at = NOW()
      WHERE id = $1
        AND organization_id = $2
      RETURNING
        id,
        name,
        is_active,
        last_seen_at,
        pairing_expires_at,
        created_at,
        updated_at,
        FALSE AS is_paired
    `,
    [stationId, organizationId]
  );

  if (result.rows.length === 0) {
    throw createError('Signing station not found.', 404);
  }

  return result.rows[0];
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getStations,
  createStation,
  createPairingCode,
  pairStation,
  deactivateStation,
  activateStation
};
