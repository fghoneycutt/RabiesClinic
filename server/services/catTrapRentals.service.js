
const crypto = require('crypto');
const pool = require('../db');

const {
  FORM_UPLOADS_BUCKET
} = require('../utils/forms/forms.constants');

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ==========================================
// HELPERS
// ==========================================

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(`${fieldName} must be a positive whole number.`);
  }

  return parsed;
};

const parseNonNegativeInteger = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createError(`${fieldName} must be a whole number of zero or greater.`);
  }

  return parsed;
};

const parseMoney = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createError(`${fieldName} must be zero or greater.`);
  }

  return Math.round(parsed * 100) / 100;
};

const parseBoolean = (value, fieldName) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;

  throw createError(`${fieldName} must be true or false.`);
};

const validateDate = (value, fieldName) => {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw createError(`${fieldName} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw createError(`${fieldName} is not a valid date.`);
  }

  return value;
};

const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

const getToday = () => new Date().toISOString().slice(0, 10);

const getSettingsRow = async (db, organizationId, lock = false) => {
  await db.query(
    `INSERT INTO cat_trap_rental_settings (organization_id)
     VALUES ($1)
     ON CONFLICT (organization_id) DO NOTHING`,
    [organizationId]
  );

  const result = await db.query(
    `SELECT *
     FROM cat_trap_rental_settings
     WHERE organization_id = $1
     ${lock ? 'FOR UPDATE' : ''}`,
    [organizationId]
  );

  return result.rows[0];
};

const parseRenterInformation = (value) => {
  let information = value;

  if (typeof information === 'string') {
    try {
      information = JSON.parse(information);
    } catch {
      throw createError('Renter information must be valid JSON.');
    }
  }

  if (
    !information ||
    typeof information !== 'object' ||
    Array.isArray(information)
  ) {
    throw createError('Valid renter information is required.');
  }

  const requiredFields = [
    'first_name',
    'last_name',
    'phone',
    'address',
    'city',
    'county',
    'state',
    'zip_code'
  ];

  for (const field of requiredFields) {
    if (!String(information[field] || '').trim()) {
      throw createError(
        `Renter ${field.replace(/_/g, ' ')} is required.`
      );
    }
  }

  const email = String(information.email || '').trim();

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw createError('Renter email address is invalid.');
  }

  return {
    first_name: String(information.first_name).trim(),
    last_name: String(information.last_name).trim(),
    email,
    phone: String(information.phone).trim(),
    address: String(information.address).trim(),
    secondary_address: String(information.secondary_address || '').trim(),
    city: String(information.city).trim(),
    county: String(information.county).trim(),
    state: String(information.state).trim(),
    zip_code: String(information.zip_code).trim()
  };
};

// The return workflow still uses its existing direct signature upload.
// Rental checkout signatures are now handled by the generic signing engine.

const getSignatureDetails = (signatureEnabled, body, file) => {
  if (!signatureEnabled) {
    return {
      method: null,
      text: null,
      file: null
    };
  }

  const method = body.signatureMethod;

  if (!['drawn', 'typed'].includes(method)) {
    throw createError(
      'A valid digital signature is required. Choose drawn or typed.'
    );
  }

  if (method === 'drawn') {
    if (!file) {
      throw createError('Please provide the drawn signature image.');
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) {
      throw createError('The signature must be a PNG, JPG, or WebP image.');
    }

    return {
      method: 'drawn',
      text: null,
      file
    };
  }

  const text = String(body.signatureText || '').trim();

  if (!text) {
    throw createError('Please enter the typed signature.');
  }

  if (text.length > 255) {
    throw createError('The typed signature is too long.');
  }

  return {
    method: 'typed',
    text,
    file: null
  };
};

const uploadSignature = async (organizationId, rentalId, type, file) => {
  if (!file) return null;

  const extensionByMimeType = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp'
  };

  const extension = extensionByMimeType[file.mimetype];

  if (!extension) {
    throw createError('Unsupported signature image type.');
  }

  const filePath = [
    'cat-trap-rentals',
    organizationId,
    String(rentalId),
    `${type}-${crypto.randomUUID()}.${extension}`
  ].join('/');

  const { error } = await supabase.storage
    .from(FORM_UPLOADS_BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    console.error('Cat trap signature upload error:', error);
    throw new Error('Unable to upload the signature.');
  }

  return filePath;
};

const removeUploadedFile = async (filePath) => {
  if (!filePath) return;

  try {
    await supabase.storage
      .from(FORM_UPLOADS_BUCKET)
      .remove([filePath]);
  } catch (error) {
    console.error('Unable to clean up signature upload:', error);
  }
};

// ==========================================
// SETTINGS
// ==========================================

exports.getSettings = async (organizationId) => {
  return getSettingsRow(pool, organizationId);
};

exports.updateSettings = async (organizationId, body = {}) => {
  const current = await getSettingsRow(pool, organizationId);

  const totalTraps = body.totalTraps !== undefined
    ? parseNonNegativeInteger(body.totalTraps, 'Total traps')
    : current.total_traps;

  const defaultRentalDays = body.defaultRentalDays !== undefined
    ? parsePositiveInteger(body.defaultRentalDays, 'Default rental period')
    : current.default_rental_days;

  const depositAmount = body.depositAmount !== undefined
    ? parseMoney(body.depositAmount, 'Deposit amount')
    : Number(current.deposit_amount);

  const rentalContractEnabled = body.rentalContractEnabled !== undefined
    ? parseBoolean(body.rentalContractEnabled, 'Rental contract enabled')
    : current.rental_contract_enabled;

  const returnContractEnabled = body.returnContractEnabled !== undefined
    ? parseBoolean(body.returnContractEnabled, 'Return contract enabled')
    : current.return_contract_enabled;

  const rentalContract = body.rentalContract !== undefined
    ? String(body.rentalContract || '').trim()
    : current.rental_contract;

  const returnContract = body.returnContract !== undefined
    ? String(body.returnContract || '').trim()
    : current.return_contract;

  if (rentalContractEnabled && !rentalContract) {
    throw createError(
      'A rental contract template is required when the rental contract is enabled.'
    );
  }

  if (returnContractEnabled && !returnContract) {
    throw createError(
      'A return contract template is required when the return contract is enabled.'
    );
  }

  const result = await pool.query(
    `UPDATE cat_trap_rental_settings
     SET
       total_traps = $2,
       default_rental_days = $3,
       deposit_amount = $4,
       rental_contract_enabled = $5,
       rental_contract = $6,
       return_contract_enabled = $7,
       return_contract = $8,
       updated_at = NOW()
     WHERE organization_id = $1
     RETURNING *`,
    [
      organizationId,
      totalTraps,
      defaultRentalDays,
      depositAmount,
      rentalContractEnabled,
      rentalContract || null,
      returnContractEnabled,
      returnContract || null
    ]
  );

  return result.rows[0];
};

// ==========================================
// DASHBOARD
// ==========================================

exports.getDashboard = async (organizationId) => {
  const settings = await getSettingsRow(pool, organizationId);

  const totalsResult = await pool.query(
    `SELECT
       COALESCE(
         SUM(quantity) FILTER (
           WHERE status IN ('active', 'pending_signature')
         ),
         0
       )::INTEGER AS reserved,

       COALESCE(
         SUM(quantity) FILTER (
           WHERE status = 'active'
         ),
         0
       )::INTEGER AS rented,

       COALESCE(
         SUM(quantity) FILTER (
           WHERE status = 'active'
             AND expected_return_date < CURRENT_DATE
         ),
         0
       )::INTEGER AS overdue,

       COUNT(*) FILTER (
         WHERE status = 'active'
       )::INTEGER AS active_rentals,

       COUNT(*) FILTER (
         WHERE status = 'pending_signature'
       )::INTEGER AS pending_rentals,

       COUNT(*) FILTER (
         WHERE status = 'active'
           AND expected_return_date < CURRENT_DATE
       )::INTEGER AS overdue_rentals

     FROM cat_trap_rentals
     WHERE organization_id = $1`,
    [organizationId]
  );

  const totals = totalsResult.rows[0];

  const recentResult = await pool.query(
    `SELECT *
     FROM cat_trap_rentals
     WHERE organization_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [organizationId]
  );

  const totalTraps = Number(settings.total_traps);
  const reserved = Number(totals.reserved);

  return {
    settings,
    inventory: {
      total: totalTraps,
      rented: Number(totals.rented),
      reserved,
      available: Math.max(0, totalTraps - reserved),
      overdue: Number(totals.overdue)
    },
    rentalCounts: {
      active: Number(totals.active_rentals),
      pendingSignature: Number(totals.pending_rentals),
      overdue: Number(totals.overdue_rentals)
    },
    recentRentals: recentResult.rows
  };
};

// ==========================================
// RENTAL LIST AND DETAILS
// ==========================================

exports.getRentals = async (organizationId, query = {}) => {
  const allowedStatuses = [
    'pending_signature',
    'active',
    'returned',
    'cancelled'
  ];

  let status = null;

  if (query.status && query.status !== 'all') {
    if (!allowedStatuses.includes(query.status)) {
      throw createError('Invalid rental status filter.');
    }

    status = query.status;
  }

  const search = String(query.search || '').trim();
  const limitValue = Number(query.limit || 100);
  const limit = Number.isInteger(limitValue)
    ? Math.min(Math.max(limitValue, 1), 200)
    : 100;

  const result = await pool.query(
    `SELECT *
     FROM cat_trap_rentals
     WHERE organization_id = $1
       AND ($2::VARCHAR IS NULL OR status = $2)
       AND (
         $3 = ''
         OR renter_information->>'first_name' ILIKE '%' || $3 || '%'
         OR renter_information->>'last_name' ILIKE '%' || $3 || '%'
         OR renter_information->>'phone' ILIKE '%' || $3 || '%'
         OR (
           COALESCE(renter_information->>'first_name', '') || ' ' ||
           COALESCE(renter_information->>'last_name', '')
         ) ILIKE '%' || $3 || '%'
       )
     ORDER BY
       CASE
         WHEN status = 'pending_signature' THEN 0
         WHEN status = 'active' THEN 1
         ELSE 2
       END,
       created_at DESC
     LIMIT $4`,
    [organizationId, status, search, limit]
  );

  return result.rows;
};

exports.getRentalById = async (organizationId, rentalId) => {
  const result = await pool.query(
    `SELECT *
     FROM cat_trap_rentals
     WHERE organization_id = $1
       AND id = $2`,
    [organizationId, rentalId]
  );

  return result.rows[0] || null;
};

// ==========================================
// CREATE PENDING RENTAL
// ==========================================

exports.createRental = async (
  organizationId,
  userId,
  body = {}
) => {
  const quantity = parsePositiveInteger(
    body.quantity,
    'Trap quantity'
  );

  const renterInformation = parseRenterInformation(
    body.renterInformation
  );

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Serialize rental reservations for this organization.
    const settings = await getSettingsRow(
      client,
      organizationId,
      true
    );

    if (
      settings.rental_contract_enabled &&
      !String(settings.rental_contract || '').trim()
    ) {
      throw createError(
        'The rental contract is enabled but no contract template is configured.',
        409
      );
    }

    const rentalDate = body.rentalDate
      ? validateDate(body.rentalDate, 'Rental date')
      : getToday();

    const expectedReturnDate = body.expectedReturnDate
      ? validateDate(body.expectedReturnDate, 'Expected return date')
      : addDays(rentalDate, settings.default_rental_days);

    if (expectedReturnDate < rentalDate) {
      throw createError(
        'Expected return date cannot be before the rental date.'
      );
    }

    const reservedResult = await client.query(
      `SELECT COALESCE(SUM(quantity), 0)::INTEGER AS reserved
       FROM cat_trap_rentals
       WHERE organization_id = $1
         AND status IN ('active', 'pending_signature')`,
      [organizationId]
    );

    const currentlyReserved = Number(
      reservedResult.rows[0].reserved
    );

    const available = Number(settings.total_traps) - currentlyReserved;

    if (quantity > available) {
      throw createError(
        `Only ${Math.max(0, available)} trap(s) are currently available.`,
        409
      );
    }

    const rentalContractSnapshot =
      settings.rental_contract_enabled
        ? settings.rental_contract
        : null;

    const insertResult = await client.query(
      `INSERT INTO cat_trap_rentals (
         organization_id,
         renter_information,
         quantity,
         rental_date,
         expected_return_date,
         deposit_amount,
         rental_contract_snapshot,
         status,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_signature', $8)
       RETURNING *`,
      [
        organizationId,
        JSON.stringify(renterInformation),
        quantity,
        rentalDate,
        expectedReturnDate,
        settings.deposit_amount,
        rentalContractSnapshot,
        userId || null
      ]
    );

    await client.query('COMMIT');

    return insertResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ==========================================
// SIGNING ENGINE CALLBACKS
// These functions must be called using the signing
// session's existing database transaction/client.
// ==========================================

exports.completeRentalSigning = async (
  client,
  organizationId,
  rentalId,
  signingSessionId
) => {
  const rentalResult = await client.query(
    `SELECT *
     FROM cat_trap_rentals
     WHERE organization_id = $1
       AND id = $2
     FOR UPDATE`,
    [organizationId, rentalId]
  );

  const rental = rentalResult.rows[0];

  if (!rental) {
    throw createError('The cat trap rental associated with this signing session was not found.', 404);
  }

  if (rental.status === 'active') {
    return rental;
  }

  if (rental.status !== 'pending_signature') {
    throw createError(
      'This rental is no longer awaiting a signature.',
      409
    );
  }

  const signatureResult = await client.query(
    `SELECT
       sig.signature_method,
       sig.signature_text,
       sig.signature_storage_path
     FROM signing_session_signatures sig
     INNER JOIN signing_session_documents doc
       ON doc.id = sig.document_id
      AND doc.session_id = sig.session_id
      AND doc.organization_id = sig.organization_id
     WHERE sig.session_id = $1
       AND sig.organization_id = $2
       AND doc.requires_signature = TRUE
     ORDER BY doc.sort_order ASC, sig.signed_at ASC
     LIMIT 1`,
    [signingSessionId, organizationId]
  );

  const signature = signatureResult.rows[0];

  if (!signature) {
    throw createError(
      'The completed signing session does not contain a rental signature.',
      409
    );
  }

  const updateResult = await client.query(
    `UPDATE cat_trap_rentals
     SET
       status = 'active',
       rental_signature_method = $3,
       rental_signature_text = $4,
       rental_signature_path = $5,
       updated_at = NOW()
     WHERE organization_id = $1
       AND id = $2
       AND status = 'pending_signature'
     RETURNING *`,
    [
      organizationId,
      rentalId,
      signature.signature_method,
      signature.signature_text,
      signature.signature_storage_path
    ]
  );

  if (!updateResult.rows[0]) {
    throw createError(
      'The rental could not be activated.',
      409
    );
  }

  return updateResult.rows[0];
};

exports.cancelPendingRentalSigning = async (
  client,
  organizationId,
  rentalId
) => {
  const result = await client.query(
    `UPDATE cat_trap_rentals
     SET
       status = 'cancelled',
       updated_at = NOW()
     WHERE organization_id = $1
       AND id = $2
       AND status = 'pending_signature'
     RETURNING *`,
    [organizationId, rentalId]
  );

  return result.rows[0] || null;
};

// ==========================================
// RETURN RENTAL
// Existing return workflow retained for now.
// We will move return signatures to signing
// stations in the next integration step.
// ==========================================

exports.returnRental = async (
  organizationId,
  rentalId,
  userId,
  body = {},
  signatureFile = null
) => {
  const client = await pool.connect();

  let uploadedFilePath = null;

  try {
    await client.query('BEGIN');

    const rentalResult = await client.query(
      `SELECT *
       FROM cat_trap_rentals
       WHERE organization_id = $1
         AND id = $2
       FOR UPDATE`,
      [organizationId, rentalId]
    );

    const rental = rentalResult.rows[0];

    if (!rental) {
      throw createError('Rental not found.', 404);
    }

    if (rental.status !== 'active') {
      throw createError('This rental is not currently active.', 409);
    }

    const settings = await getSettingsRow(
      client,
      organizationId,
      true
    );

    const returnDate = body.returnDate
      ? validateDate(body.returnDate, 'Return date')
      : getToday();

    const rentalDate = String(rental.rental_date).slice(0, 10);

    if (returnDate < rentalDate) {
      throw createError(
        'Return date cannot be before the rental date.'
      );
    }

    const depositReturned = body.depositReturned !== undefined
      ? parseBoolean(body.depositReturned, 'Deposit returned')
      : false;

    const signature = getSignatureDetails(
      settings.return_contract_enabled,
      body,
      signatureFile
    );

    const returnContractSnapshot = settings.return_contract_enabled
      ? settings.return_contract
      : null;

    const returnNotes = String(body.notes || '').trim();

    if (returnNotes.length > 5000) {
      throw createError('Return notes cannot exceed 5,000 characters.');
    }

    let updatedNotes = rental.notes;

    if (returnNotes) {
      updatedNotes = updatedNotes
        ? `${updatedNotes}\n\nReturn notes: ${returnNotes}`
        : `Return notes: ${returnNotes}`;
    }

    if (signature.file) {
      uploadedFilePath = await uploadSignature(
        organizationId,
        rentalId,
        'return-signature',
        signature.file
      );
    }

    const updateResult = await client.query(
      `UPDATE cat_trap_rentals
       SET
         return_date = $3,
         return_contract_snapshot = $4,
         return_signature_path = $5,
         return_signature_method = $6,
         return_signature_text = $7,
         deposit_returned = $8,
         deposit_returned_at = CASE
           WHEN $8 = TRUE THEN NOW()
           ELSE NULL
         END,
         status = 'returned',
         notes = $9,
         returned_by = $10,
         updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [
        organizationId,
        rentalId,
        returnDate,
        returnContractSnapshot,
        uploadedFilePath,
        signature.method,
        signature.text,
        depositReturned,
        updatedNotes,
        userId || null
      ]
    );

    await client.query('COMMIT');

    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');

    if (uploadedFilePath) {
      await removeUploadedFile(uploadedFilePath);
    }

    throw error;
  } finally {
    client.release();
  }
};