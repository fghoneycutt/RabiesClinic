
const crypto = require('crypto');
const pool = require('../db');
const catTrapRentalsService = require('./catTrapRentals.service');

// ==========================================
// HELPERS
// ==========================================

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isValidUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function validateString(value, field, maxLength, required = false) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw createError(`${field} is required.`);
    }

    return null;
  }

  if (typeof value !== 'string' || value.length > maxLength) {
    throw createError(
      `${field} must be a string no longer than ${maxLength} characters.`
    );
  }

  return value.trim() || null;
}

function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

function validateExpiration(value) {
  const expiresAt = new Date(value);

  if (!value || Number.isNaN(expiresAt.getTime())) {
    throw createError('A valid session expiration date is required.');
  }

  if (expiresAt <= new Date()) {
    throw createError('The session expiration must be in the future.');
  }

  return expiresAt;
}

// ==========================================
// SOURCE MODULE CALLBACKS
// ==========================================

async function handleSourceSessionExpiration(client, session) {
  if (
    session.source_module !== 'cat_trap_rentals' ||
    session.source_record_type !== 'rental'
  ) {
    return;
  }

  const rentalId = Number(session.source_record_id);

  if (!Number.isInteger(rentalId) || rentalId <= 0) {
    throw createError(
      'The signing session has an invalid cat trap rental reference.',
      409
    );
  }

  await catTrapRentalsService.cancelPendingRentalSigning(
    client,
    session.organization_id,
    rentalId
  );
}

async function handleSourceSessionCompletion(client, session) {
  if (session.source_module !== 'cat_trap_rentals') {
    return;
  }

  const rentalId = Number(session.source_record_id);

  if (!Number.isInteger(rentalId) || rentalId <= 0) {
    throw createError('Invalid cat trap rental ID.', 400);
  }

  if (session.source_record_type === 'rental') {
    await catTrapRentalsService.completeRentalSigning(
      client,
      session.organization_id,
      rentalId,
      session.id
    );

    return;
  }

  if (session.source_record_type === 'rental_return') {
    await catTrapRentalsService.completeRentalReturn(
      client,
      session.organization_id,
      rentalId,
      session.id,
      session.created_by
    );
  }
}

// ==========================================
// CREATE SIGNING SESSION
// ==========================================

async function createSigningSession({
  organizationId,
  createdBy,
  stationId,
  sessionType = 'document_signing',
  sourceModule,
  sourceRecordType,
  sourceRecordId,
  expiresAt,
  documents,
  signers,
  metadata
}) {
  if (!isValidUuid(organizationId)) {
    throw createError('A valid organization is required.');
  }

  if (!isValidUuid(stationId)) {
    throw createError('A valid signing station is required.');
  }

  sessionType = validateString(sessionType, 'Session type', 50, true);

  sourceModule = validateString(sourceModule, 'Source module', 100);
  sourceRecordType = validateString(sourceRecordType, 'Source record type', 100);

  if (
    sourceRecordId !== undefined &&
    sourceRecordId !== null &&
    typeof sourceRecordId !== 'string' &&
    typeof sourceRecordId !== 'number'
  ) {
    throw createError('Source record ID must be a string or number.');
  }

  const normalizedSourceRecordId =
    sourceRecordId === undefined || sourceRecordId === null
      ? null
      : String(sourceRecordId);

  const sessionExpiration = validateExpiration(expiresAt);

  if (!Array.isArray(documents) || documents.length === 0) {
    throw createError('At least one document is required.');
  }

  if (documents.length > 25) {
    throw createError('A signing session cannot contain more than 25 documents.');
  }

  if (!Array.isArray(signers) || signers.length !== 1) {
    throw createError(
      'A signing session must have exactly one customer signer.'
    );
  }

  const normalizedDocuments = documents.map((document, index) => {
    if (!document || typeof document !== 'object') {
      throw createError(`Document ${index + 1} is invalid.`);
    }

    const title = validateString(
      document.title,
      `Document ${index + 1} title`,
      200,
      true
    );

    const documentType = validateString(
      document.documentType || 'contract',
      `Document ${index + 1} type`,
      100,
      true
    );

    const contentFormat = document.contentFormat || 'html';

    if (!['html', 'plain_text', 'pdf'].includes(contentFormat)) {
      throw createError(
        `Document ${index + 1} has an unsupported content format.`
      );
    }

    const contentText =
      typeof document.contentText === 'string'
        ? document.contentText
        : null;

    const storagePath =
      typeof document.storagePath === 'string'
        ? document.storagePath.trim()
        : null;

    if (contentFormat === 'pdf' && !storagePath) {
      throw createError(
        `Document ${index + 1} must have a PDF storage path.`
      );
    }

    if (
      ['html', 'plain_text'].includes(contentFormat) &&
      !contentText
    ) {
      throw createError(
        `Document ${index + 1} must have document content.`
      );
    }

    return {
      title,
      documentType,
      contentFormat,
      contentText: contentFormat === 'pdf' ? null : contentText,
      storagePath: contentFormat === 'pdf' ? storagePath : null,
      contentHash: validateString(
        document.contentHash,
        `Document ${index + 1} content hash`,
        128
      ),
      requiresSignature: document.requiresSignature !== false,
      sortOrder: Number.isInteger(document.sortOrder)
        ? document.sortOrder
        : index
    };
  });

  if (!normalizedDocuments.some(document => document.requiresSignature)) {
    throw createError(
      'At least one document must require a signature.'
    );
  }

  const normalizedSigners = signers.map((signer, index) => {
    if (!signer || typeof signer !== 'object') {
      throw createError(`Signer ${index + 1} is invalid.`);
    }

    return {
      signerOrder: Number.isInteger(signer.signerOrder)
        ? signer.signerOrder
        : index + 1,
      signerRole: validateString(
        signer.signerRole || 'customer',
        `Signer ${index + 1} role`,
        100,
        true
      ),
      displayName: validateString(
        signer.displayName,
        `Signer ${index + 1} name`,
        200,
        true
      ),
      email: validateString(
        signer.email,
        `Signer ${index + 1} email`,
        255
      )
    };
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const stationResult = await client.query(
      `
        SELECT id
        FROM signing_stations
        WHERE id = $1
          AND organization_id = $2
          AND is_active = TRUE
          AND station_token_hash IS NOT NULL
        FOR UPDATE
      `,
      [stationId, organizationId]
    );

    if (stationResult.rowCount === 0) {
      throw createError(
        'The selected signing station is unavailable or has not been paired.',
        404
      );
    }

    const sessionResult = await client.query(
      `
        INSERT INTO signing_sessions (
          organization_id,
          station_id,
          session_type,
          source_module,
          source_record_type,
          source_record_id,
          status,
          expires_at,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'queued', $7, $8)
        RETURNING *
      `,
      [
        organizationId,
        stationId,
        sessionType,
        sourceModule,
        sourceRecordType,
        normalizedSourceRecordId,
        sessionExpiration,
        createdBy || null
      ]
    );

    const session = sessionResult.rows[0];

    const createdDocuments = [];

    for (const document of normalizedDocuments) {
      const result = await client.query(
        `
          INSERT INTO signing_session_documents (
            organization_id,
            session_id,
            title,
            document_type,
            content_format,
            content_text,
            storage_path,
            content_hash,
            requires_signature,
            sort_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `,
        [
          organizationId,
          session.id,
          document.title,
          document.documentType,
          document.contentFormat,
          document.contentText,
          document.storagePath,
          document.contentHash,
          document.requiresSignature,
          document.sortOrder
        ]
      );

      createdDocuments.push(result.rows[0]);
    }

    const createdSigners = [];

    for (const signer of normalizedSigners) {
      const result = await client.query(
        `
          INSERT INTO signing_session_signers (
            organization_id,
            session_id,
            signer_order,
            signer_role,
            display_name,
            email
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        [
          organizationId,
          session.id,
          signer.signerOrder,
          signer.signerRole,
          signer.displayName,
          signer.email
        ]
      );

      createdSigners.push(result.rows[0]);
    }

    await client.query(
      `
        INSERT INTO signing_session_events (
          organization_id,
          session_id,
          event_type,
          actor_type,
          actor_user_id,
          station_id,
          details
        )
        VALUES ($1, $2, 'session_created', 'staff', $3, $4, $5)
      `,
      [
        organizationId,
        session.id,
        createdBy || null,
        stationId,
        JSON.stringify({
          documentCount: createdDocuments.length,
          signerCount: createdSigners.length,
          sessionType,
          metadata: metadata || null
        })
      ]
    );

    await client.query('COMMIT');

    return {
      session,
      documents: createdDocuments,
      signers: createdSigners
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// CLAIM NEXT SIGNING SESSION
// ==========================================

async function claimNextSigningSession({ stationId, organizationId }) {
  if (!isValidUuid(stationId) || !isValidUuid(organizationId)) {
    throw createError('Invalid signing station.', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const stationResult = await client.query(
      `
        SELECT id
        FROM signing_stations
        WHERE id = $1
          AND organization_id = $2
          AND is_active = TRUE
          AND station_token_hash IS NOT NULL
        FOR UPDATE
      `,
      [stationId, organizationId]
    );

    if (stationResult.rowCount === 0) {
      throw createError('Signing station is unavailable.', 404);
    }

    const expiredQueuedResult = await client.query(
      `
        UPDATE signing_sessions
        SET status = 'expired',
            customer_token_hash = NULL,
            updated_at = NOW()
        WHERE station_id = $1
          AND organization_id = $2
          AND status = 'queued'
          AND expires_at <= NOW()
        RETURNING
          id,
          organization_id,
          source_module,
          source_record_type,
          source_record_id
      `,
      [stationId, organizationId]
    );

    for (const expiredSession of expiredQueuedResult.rows) {
      await handleSourceSessionExpiration(client, expiredSession);

      await client.query(
        `
          INSERT INTO signing_session_events (
            organization_id,
            session_id,
            event_type,
            actor_type,
            station_id,
            details
          )
          VALUES ($1, $2, 'session_expired', 'system', $3, $4)
        `,
        [
          organizationId,
          expiredSession.id,
          stationId,
          JSON.stringify({
            reason: 'Queued session expiration reached.'
          })
        ]
      );
    }

    const activeResult = await client.query(
      `
        SELECT id
        FROM signing_sessions
        WHERE station_id = $1
          AND organization_id = $2
          AND status IN ('displayed', 'in_progress')
          AND expires_at > NOW()
        LIMIT 1
        FOR UPDATE
      `,
      [stationId, organizationId]
    );

    if (activeResult.rowCount > 0) {
      throw createError(
        'This station already has an active signing session.',
        409
      );
    }

    const sessionResult = await client.query(
      `
        SELECT *
        FROM signing_sessions
        WHERE station_id = $1
          AND organization_id = $2
          AND status = 'queued'
          AND expires_at > NOW()
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `,
      [stationId, organizationId]
    );

    if (sessionResult.rowCount === 0) {
      await client.query('COMMIT');
      return null;
    }

    const session = sessionResult.rows[0];

    const customerToken =
      `ssn_${crypto.randomBytes(32).toString('base64url')}`;

    const customerTokenHash = hashToken(customerToken);

    const updatedResult = await client.query(
      `
        UPDATE signing_sessions
        SET status = 'displayed',
            started_at = NOW(),
            customer_token_hash = $1,
            updated_at = NOW()
        WHERE id = $2
          AND organization_id = $3
        RETURNING
          id,
          station_id,
          session_type,
          source_module,
          source_record_type,
          source_record_id,
          status,
          expires_at,
          started_at
      `,
      [
        customerTokenHash,
        session.id,
        organizationId
      ]
    );

    const documentsResult = await client.query(
      `
        SELECT
          id,
          title,
          document_type,
          content_format,
          content_text,
          storage_path,
          content_hash,
          requires_signature,
          sort_order
        FROM signing_session_documents
        WHERE session_id = $1
          AND organization_id = $2
        ORDER BY sort_order ASC, created_at ASC
      `,
      [session.id, organizationId]
    );

    const signersResult = await client.query(
      `
        SELECT
          id,
          signer_order,
          signer_role,
          display_name,
          email,
          status
        FROM signing_session_signers
        WHERE session_id = $1
          AND organization_id = $2
        ORDER BY signer_order ASC, created_at ASC
      `,
      [session.id, organizationId]
    );

    await client.query(
      `
        INSERT INTO signing_session_events (
          organization_id,
          session_id,
          event_type,
          actor_type,
          station_id,
          details
        )
        VALUES (
          $1,
          $2,
          'session_displayed',
          'station',
          $3,
          $4
        )
      `,
      [
        organizationId,
        session.id,
        stationId,
        JSON.stringify({
          stationClaimedSession: true
        })
      ]
    );

    await client.query('COMMIT');

    return {
      session: updatedResult.rows[0],
      documents: documentsResult.rows,
      signers: signersResult.rows,
      customerToken
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// RECOVER ACTIVE SIGNING SESSION
// ==========================================

async function recoverActiveSigningSession({ stationId, organizationId }) {
  if (!isValidUuid(stationId) || !isValidUuid(organizationId)) {
    throw createError('Invalid signing station.', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const stationResult = await client.query(
      `
        SELECT id
        FROM signing_stations
        WHERE id = $1
          AND organization_id = $2
          AND is_active = TRUE
          AND station_token_hash IS NOT NULL
        FOR UPDATE
      `,
      [stationId, organizationId]
    );

    if (stationResult.rowCount === 0) {
      throw createError('Signing station is unavailable.', 404);
    }

    const expiredResult = await client.query(
      `
        UPDATE signing_sessions
        SET status = 'expired',
            customer_token_hash = NULL,
            updated_at = NOW()
        WHERE station_id = $1
          AND organization_id = $2
          AND status IN ('displayed', 'in_progress')
          AND expires_at <= NOW()
        RETURNING
          id,
          organization_id,
          source_module,
          source_record_type,
          source_record_id
      `,
      [stationId, organizationId]
    );

    for (const expired of expiredResult.rows) {
      await handleSourceSessionExpiration(client, expired);

      await client.query(
        `
          INSERT INTO signing_session_events (
            organization_id,
            session_id,
            event_type,
            actor_type,
            station_id,
            details
          )
          VALUES ($1, $2, 'session_expired', 'system', $3, $4)
        `,
        [
          organizationId,
          expired.id,
          stationId,
          JSON.stringify({
            reason: 'Session expiration reached.'
          })
        ]
      );
    }

    const sessionResult = await client.query(
      `
        SELECT
          id,
          organization_id,
          station_id,
          session_type,
          source_module,
          source_record_type,
          source_record_id,
          status,
          expires_at,
          created_by,
          started_at,
          completed_at,
          cancelled_at,
          created_at,
          updated_at
        FROM signing_sessions
        WHERE station_id = $1
          AND organization_id = $2
          AND status IN ('displayed', 'in_progress')
          AND expires_at > NOW()
        ORDER BY started_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [stationId, organizationId]
    );

    if (sessionResult.rowCount === 0) {
      await client.query('COMMIT');
      return null;
    }

    const session = sessionResult.rows[0];

    const customerToken =
      `ssn_${crypto.randomBytes(32).toString('base64url')}`;

    await client.query(
      `
        UPDATE signing_sessions
        SET customer_token_hash = $1,
            updated_at = NOW()
        WHERE id = $2
          AND organization_id = $3
      `,
      [
        hashToken(customerToken),
        session.id,
        organizationId
      ]
    );

    const documentsResult = await client.query(
      `
        SELECT
          id,
          title,
          document_type,
          content_format,
          content_text,
          storage_path,
          content_hash,
          requires_signature,
          sort_order
        FROM signing_session_documents
        WHERE session_id = $1
          AND organization_id = $2
        ORDER BY sort_order ASC, created_at ASC
      `,
      [session.id, organizationId]
    );

    const signersResult = await client.query(
      `
        SELECT
          id,
          signer_order,
          signer_role,
          display_name,
          email,
          status
        FROM signing_session_signers
        WHERE session_id = $1
          AND organization_id = $2
        ORDER BY signer_order ASC, created_at ASC
      `,
      [session.id, organizationId]
    );

    await client.query(
      `
        INSERT INTO signing_session_events (
          organization_id,
          session_id,
          event_type,
          actor_type,
          station_id,
          details
        )
        VALUES ($1, $2, 'session_recovered', 'station', $3, $4)
      `,
      [
        organizationId,
        session.id,
        stationId,
        JSON.stringify({
          customerTokenRotated: true
        })
      ]
    );

    await client.query('COMMIT');

    return {
      session,
      documents: documentsResult.rows,
      signers: signersResult.rows,
      customerToken
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// START CUSTOMER SIGNING SESSION
// ==========================================

async function startCustomerSigningSession({
  sessionId,
  organizationId
}) {
  if (!isValidUuid(sessionId) || !isValidUuid(organizationId)) {
    throw createError('Invalid signing session.', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      `
        SELECT
          id,
          organization_id,
          station_id,
          session_type,
          status,
          expires_at,
          started_at
        FROM signing_sessions
        WHERE id = $1
          AND organization_id = $2
        FOR UPDATE
      `,
      [sessionId, organizationId]
    );

    if (sessionResult.rowCount === 0) {
      throw createError('Signing session not found.', 404);
    }

    let session = sessionResult.rows[0];

    if (
      !['displayed', 'in_progress'].includes(session.status) ||
      new Date(session.expires_at) <= new Date()
    ) {
      throw createError(
        'This signing session is no longer active.',
        410
      );
    }

    if (session.status === 'displayed') {
      const updatedResult = await client.query(
        `
          UPDATE signing_sessions
          SET status = 'in_progress',
              updated_at = NOW()
          WHERE id = $1
            AND organization_id = $2
          RETURNING
            id,
            organization_id,
            station_id,
            session_type,
            status,
            expires_at,
            started_at
        `,
        [sessionId, organizationId]
      );

      session = updatedResult.rows[0];

      await client.query(
        `
          INSERT INTO signing_session_events (
            organization_id,
            session_id,
            event_type,
            actor_type,
            station_id,
            details
          )
          VALUES ($1, $2, 'session_started', 'customer', $3, $4)
        `,
        [
          organizationId,
          sessionId,
          session.station_id,
          JSON.stringify({
            startedBy: 'customer'
          })
        ]
      );
    }

    const documentsResult = await client.query(
      `
        SELECT
          id,
          title,
          document_type,
          content_format,
          content_text,
          storage_path,
          content_hash,
          requires_signature,
          sort_order
        FROM signing_session_documents
        WHERE session_id = $1
          AND organization_id = $2
        ORDER BY sort_order ASC, created_at ASC
      `,
      [sessionId, organizationId]
    );

    const signersResult = await client.query(
      `
        SELECT
          id,
          signer_order,
          signer_role,
          display_name,
          email,
          status
        FROM signing_session_signers
        WHERE session_id = $1
          AND organization_id = $2
        ORDER BY signer_order ASC, created_at ASC
      `,
      [sessionId, organizationId]
    );

    await client.query('COMMIT');

    return {
      session,
      documents: documentsResult.rows,
      signers: signersResult.rows
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// SUBMIT SIGNING SIGNATURE
// ==========================================

async function submitSigningSignature({
  sessionId,
  organizationId,
  documentId,
  signatureMethod,
  signatureText,
  signatureStoragePath,
  ipAddress,
  userAgent
}) {
  if (
    !isValidUuid(sessionId) ||
    !isValidUuid(organizationId) ||
    !isValidUuid(documentId)
  ) {
    throw createError('Invalid signing session or document.');
  }

  if (!['drawn', 'typed'].includes(signatureMethod)) {
    throw createError('Invalid signature method.');
  }

  if (signatureMethod === 'typed') {
    signatureText = validateString(
      signatureText,
      'Typed signature',
      500,
      true
    );

    signatureStoragePath = null;
  } else {
    signatureStoragePath = validateString(
      signatureStoragePath,
      'Signature storage path',
      500,
      true
    );

    signatureText = null;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      `
        SELECT
          id,
          organization_id,
          station_id,
          source_module,
          source_record_type,
          source_record_id,
          status,
          expires_at
        FROM signing_sessions
        WHERE id = $1
          AND organization_id = $2
        FOR UPDATE
      `,
      [sessionId, organizationId]
    );

    if (sessionResult.rowCount === 0) {
      throw createError('Signing session not found.', 404);
    }

    const session = sessionResult.rows[0];

    if (
      session.status !== 'in_progress' ||
      new Date(session.expires_at) <= new Date()
    ) {
      throw createError(
        'This signing session is no longer accepting signatures.',
        410
      );
    }

    const signerResult = await client.query(
      `
        SELECT id, display_name, status
        FROM signing_session_signers
        WHERE session_id = $1
          AND organization_id = $2
        FOR UPDATE
      `,
      [sessionId, organizationId]
    );

    if (signerResult.rowCount !== 1) {
      throw createError(
        'This signing session does not have exactly one customer signer.',
        409
      );
    }

    const signer = signerResult.rows[0];
    const signerId = signer.id;

    if (signer.status !== 'pending') {
      throw createError(
        'This signer has already completed signing.',
        409
      );
    }

    const documentResult = await client.query(
      `
        SELECT id, title, requires_signature
        FROM signing_session_documents
        WHERE id = $1
          AND session_id = $2
          AND organization_id = $3
        FOR UPDATE
      `,
      [documentId, sessionId, organizationId]
    );

    if (documentResult.rowCount === 0) {
      throw createError('Document not found in this session.', 404);
    }

    const document = documentResult.rows[0];

    if (!document.requires_signature) {
      throw createError('This document does not require a signature.');
    }

    let signatureResult;

    try {
      signatureResult = await client.query(
        `
          INSERT INTO signing_session_signatures (
            organization_id,
            session_id,
            signer_id,
            document_id,
            signature_method,
            signature_text,
            signature_storage_path,
            signed_at,
            ip_address,
            user_agent
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
          RETURNING
            id,
            signer_id,
            document_id,
            signature_method,
            signed_at
        `,
        [
          organizationId,
          sessionId,
          signerId,
          documentId,
          signatureMethod,
          signatureText,
          signatureStoragePath,
          ipAddress || null,
          userAgent || null
        ]
      );
    } catch (error) {
      if (error.code === '23505') {
        throw createError(
          'This signer has already signed this document.',
          409
        );
      }

      throw error;
    }

    const signerCompletionResult = await client.query(
      `
        SELECT NOT EXISTS (
          SELECT 1
          FROM signing_session_documents d
          WHERE d.session_id = $1
            AND d.organization_id = $2
            AND d.requires_signature = TRUE
            AND NOT EXISTS (
              SELECT 1
              FROM signing_session_signatures s
              WHERE s.session_id = d.session_id
                AND s.organization_id = d.organization_id
                AND s.document_id = d.id
                AND s.signer_id = $3
            )
        ) AS complete
      `,
      [sessionId, organizationId, signerId]
    );

    const signerComplete = signerCompletionResult.rows[0].complete;

    if (signerComplete) {
      await client.query(
        `
          UPDATE signing_session_signers
          SET status = 'signed',
              signed_at = NOW()
          WHERE id = $1
            AND session_id = $2
            AND organization_id = $3
        `,
        [signerId, sessionId, organizationId]
      );
    }

    const sessionCompletionResult = await client.query(
      `
        SELECT NOT EXISTS (
          SELECT 1
          FROM signing_session_signers signer
          CROSS JOIN signing_session_documents document
          WHERE signer.session_id = $1
            AND signer.organization_id = $2
            AND document.session_id = signer.session_id
            AND document.organization_id = signer.organization_id
            AND document.requires_signature = TRUE
            AND NOT EXISTS (
              SELECT 1
              FROM signing_session_signatures signature
              WHERE signature.session_id = signer.session_id
                AND signature.organization_id = signer.organization_id
                AND signature.signer_id = signer.id
                AND signature.document_id = document.id
            )
        ) AS complete
      `,
      [sessionId, organizationId]
    );

    const sessionComplete = sessionCompletionResult.rows[0].complete;

    if (sessionComplete) {
      await client.query(
        `
          UPDATE signing_session_signers
          SET status = 'signed',
              signed_at = COALESCE(signed_at, NOW())
          WHERE session_id = $1
            AND organization_id = $2
            AND status = 'pending'
        `,
        [sessionId, organizationId]
      );

      await client.query(
        `
          UPDATE signing_sessions
          SET status = 'completed',
              completed_at = NOW(),
              customer_token_hash = NULL,
              updated_at = NOW()
          WHERE id = $1
            AND organization_id = $2
        `,
        [sessionId, organizationId]
      );
    }

    await client.query(
      `
        INSERT INTO signing_session_events (
          organization_id,
          session_id,
          event_type,
          actor_type,
          station_id,
          details
        )
        VALUES ($1, $2, 'signature_submitted', 'customer', $3, $4)
      `,
      [
        organizationId,
        sessionId,
        session.station_id,
        JSON.stringify({
          signerId,
          documentId,
          signatureMethod,
          signerComplete,
          sessionComplete
        })
      ]
    );

    if (sessionComplete) {
      await client.query(
        `
          INSERT INTO signing_session_events (
            organization_id,
            session_id,
            event_type,
            actor_type,
            station_id,
            details
          )
          VALUES ($1, $2, 'session_completed', 'system', $3, $4)
        `,
        [
          organizationId,
          sessionId,
          session.station_id,
          JSON.stringify({
            completedAutomatically: true
          })
        ]
      );

      // Activate the associated module record before committing.
      await handleSourceSessionCompletion(client, session);
    }

    await client.query('COMMIT');

    return {
      signature: signatureResult.rows[0],
      signerComplete,
      sessionComplete
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// LIST SIGNING SESSIONS
// ==========================================

async function listSigningSessions({
  organizationId,
  status,
  stationId
}) {
  if (!isValidUuid(organizationId)) {
    throw createError('A valid organization is required.');
  }

  if (status) {
    const allowedStatuses = [
      'queued',
      'displayed',
      'in_progress',
      'completed',
      'cancelled',
      'expired'
    ];

    if (!allowedStatuses.includes(status)) {
      throw createError('Invalid signing session status.');
    }
  }

  if (stationId && !isValidUuid(stationId)) {
    throw createError('Invalid signing station.');
  }

  const result = await pool.query(
    `
      SELECT
        s.id,
        s.station_id,
        st.name AS station_name,
        s.session_type,
        s.source_module,
        s.source_record_type,
        s.source_record_id,
        s.status,
        s.expires_at,
        s.created_by,
        s.started_at,
        s.completed_at,
        s.cancelled_at,
        s.created_at,
        s.updated_at,

        signer.id AS signer_id,
        signer.display_name AS signer_name,
        signer.email AS signer_email,
        signer.status AS signer_status,

        (
          SELECT COUNT(*)::INTEGER
          FROM signing_session_documents d
          WHERE d.session_id = s.id
            AND d.organization_id = s.organization_id
        ) AS document_count

      FROM signing_sessions s

      INNER JOIN signing_stations st
        ON st.id = s.station_id
        AND st.organization_id = s.organization_id

      LEFT JOIN signing_session_signers signer
        ON signer.session_id = s.id
        AND signer.organization_id = s.organization_id

      WHERE s.organization_id = $1
        AND ($2::VARCHAR IS NULL OR s.status = $2)
        AND ($3::UUID IS NULL OR s.station_id = $3)

      ORDER BY s.created_at DESC
      LIMIT 100
    `,
    [
      organizationId,
      status || null,
      stationId || null
    ]
  );

  return result.rows;
}

// ==========================================
// CANCEL SIGNING SESSION
// ==========================================

async function cancelSigningSession({
  organizationId,
  sessionId,
  cancelledBy
}) {
  if (!isValidUuid(organizationId) || !isValidUuid(sessionId)) {
    throw createError('Invalid organization or signing session.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      `
        SELECT
          id,
          organization_id,
          station_id,
          source_module,
          source_record_type,
          source_record_id,
          status
        FROM signing_sessions
        WHERE id = $1
          AND organization_id = $2
        FOR UPDATE
      `,
      [sessionId, organizationId]
    );

    if (sessionResult.rowCount === 0) {
      throw createError('Signing session not found.', 404);
    }

    const session = sessionResult.rows[0];

    if (!['queued', 'displayed', 'in_progress'].includes(session.status)) {
      throw createError(
        'Only queued or active signing sessions can be cancelled.',
        409
      );
    }

    const updateResult = await client.query(
      `
        UPDATE signing_sessions
        SET status = 'cancelled',
            cancelled_at = NOW(),
            customer_token_hash = NULL,
            updated_at = NOW()
        WHERE id = $1
          AND organization_id = $2
        RETURNING
          id,
          station_id,
          status,
          cancelled_at,
          updated_at
      `,
      [sessionId, organizationId]
    );

    await client.query(
      `
        INSERT INTO signing_session_events (
          organization_id,
          session_id,
          event_type,
          actor_type,
          actor_user_id,
          station_id,
          details
        )
        VALUES (
          $1,
          $2,
          'session_cancelled',
          'staff',
          $3,
          $4,
          $5
        )
      `,
      [
        organizationId,
        sessionId,
        cancelledBy || null,
        session.station_id,
        JSON.stringify({
          previousStatus: session.status
        })
      ]
    );

    // Release any pending inventory reservation associated with this session.
    await handleSourceSessionExpiration(client, session);

    await client.query('COMMIT');

    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  createSigningSession,
  claimNextSigningSession,
  recoverActiveSigningSession,
  startCustomerSigningSession,
  submitSigningSignature,
  listSigningSessions,
  cancelSigningSession
};