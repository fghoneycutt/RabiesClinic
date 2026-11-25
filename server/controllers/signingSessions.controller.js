
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const signingSessionsService = require('../services/signingSessions.service');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SIGNATURE_BUCKET = 'signing-signatures';

// ==========================================
// HELPERS
// ==========================================

function handleError(res, error) {
  console.error('Signing sessions error:', error);

  return res.status(error.statusCode || 500).json({
    message:
      error.statusCode
        ? error.message
        : 'An error occurred while processing the signing session.'
  });
}

// ==========================================
// CREATE SIGNING SESSION
// POST /api/signing-sessions
// ==========================================

exports.createSigningSession = async (req, res) => {
  try {
    const {
      stationId,
      sessionType,
      sourceModule,
      sourceRecordType,
      sourceRecordId,
      expiresAt,
      documents,
      signers,
      metadata
    } = req.body;

    const result =
      await signingSessionsService.createSigningSession({
        organizationId: req.organizationId,
        createdBy: req.user?.id,
        stationId,
        sessionType,
        sourceModule,
        sourceRecordType,
        sourceRecordId,
        expiresAt,
        documents,
        signers,
        metadata
      });

    return res.status(201).json({
      message: 'Signing session created successfully.',
      ...result
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// CLAIM NEXT SIGNING SESSION
// GET /api/signing-sessions/station/next
// ==========================================

exports.claimNextSigningSession = async (req, res) => {
  try {
    const result =
      await signingSessionsService.claimNextSigningSession({
        stationId: req.signingStation.id,
        organizationId: req.signingStation.organizationId
      });

    if (!result) {
      return res.status(200).json({
        session: null,
        message: 'No signing session is currently queued.'
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// RECOVER ACTIVE SIGNING SESSION
// GET /api/signing-sessions/station/recover
// ==========================================

exports.recoverActiveSigningSession = async (req, res) => {
  try {
    const result =
      await signingSessionsService.recoverActiveSigningSession({
        stationId: req.signingStation.id,
        organizationId: req.signingStation.organizationId
      });

    if (!result) {
      return res.status(200).json({
        session: null,
        message: 'No active signing session was found.'
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// START CUSTOMER SIGNING SESSION
// POST /api/signing-sessions/customer/start
// ==========================================

exports.startCustomerSigningSession = async (req, res) => {
  try {
    const result =
      await signingSessionsService.startCustomerSigningSession({
        sessionId: req.signingCustomer.sessionId,
        organizationId: req.signingCustomer.organizationId
      });

    return res.status(200).json({
      message: 'Signing session started successfully.',
      ...result
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// ==========================================
// SUBMIT SIGNATURE
// POST /api/signing-sessions/customer/signature
// ==========================================

exports.submitSigningSignature = async (req, res) => {
  let uploadedPath = null;

  try {
    const {
      documentId,
      signatureMethod,
      signatureText
    } = req.body;

    const { sessionId, organizationId } = req.signingCustomer;

    let signatureStoragePath = null;

    if (signatureMethod === 'drawn') {
      if (!req.file) {
        const error = new Error(
          'A signature image is required for a drawn signature.'
        );
        error.statusCode = 400;
        throw error;
      }

      uploadedPath =
        `${organizationId}/${sessionId}/${crypto.randomUUID()}.png`;

      const { error: uploadError } = await supabase.storage
        .from(SIGNATURE_BUCKET)
        .upload(uploadedPath, req.file.buffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error('Signature upload error:', uploadError);

        const error = new Error('Unable to upload the signature image.');
        error.statusCode = 500;
        throw error;
      }

      signatureStoragePath = uploadedPath;
    } else if (signatureMethod === 'typed') {
      if (req.file) {
        const error = new Error(
          'A file should not be included with a typed signature.'
        );
        error.statusCode = 400;
        throw error;
      }
    } else {
      const error = new Error('Invalid signature method.');
      error.statusCode = 400;
      throw error;
    }

    const result =
      await signingSessionsService.submitSigningSignature({
        sessionId,
        organizationId,
        documentId,
        signatureMethod,
        signatureText,
        signatureStoragePath,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

    return res.status(200).json({
      message: 'Signature submitted successfully.',
      ...result
    });
  } catch (error) {
    // Remove an uploaded image if the database operation failed.
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage
        .from(SIGNATURE_BUCKET)
        .remove([uploadedPath]);

      if (cleanupError) {
        console.error(
          'Unable to clean up failed signature upload:',
          cleanupError
        );
      }
    }

    return handleError(res, error);
  }
};


// ==========================================
// LIST SIGNING SESSIONS
// GET /api/signing-sessions
// ==========================================

exports.listSigningSessions = async (req, res) => {
  try {
    const sessions =
      await signingSessionsService.listSigningSessions({
        organizationId: req.organizationId,
        status: req.query.status,
        stationId: req.query.stationId
      });

    return res.status(200).json({
      sessions
    });
  } catch (error) {
    return handleError(res, error);
  }
};


// ==========================================
// CANCEL SIGNING SESSION
// PATCH /api/signing-sessions/:id/cancel
// ==========================================

exports.cancelSigningSession = async (req, res) => {
  try {
    const session =
      await signingSessionsService.cancelSigningSession({
        organizationId: req.organizationId,
        sessionId: req.params.id,
        cancelledBy: req.user?.id
      });

    return res.status(200).json({
      message: 'Signing session cancelled successfully.',
      session
    });
  } catch (error) {
    return handleError(res, error);
  }
};
