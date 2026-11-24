
const pool = require('../../db');

const {
  ALLOWED_SUBMISSION_STATUSES
} = require('../../utils/forms/forms.constants');

const {
  isValidId,
  sendServerError
} = require('../../utils/forms/forms.helpers');

const {
  createSignedFileUrl,
  removeStorageFiles
} = require('../../services/forms/formFiles.service');

// ==========================================
// GET ALL SUBMISSIONS
// GET /api/forms/submissions
//
// Optional query parameters:
// ?status=submitted
// ?form_id=1
// ==========================================

exports.getSubmissions = async (req, res) => {
  const { status, form_id } = req.query;

  if (!req.organizationId) {
    return res.status(400).json({
      message: 'An organization must be selected.'
    });
  }

  if (form_id && !isValidId(form_id)) {
    return res.status(400).json({
      message: 'Invalid form ID.'
    });
  }

  if (
    status &&
    !ALLOWED_SUBMISSION_STATUSES.includes(status)
  ) {
    return res.status(400).json({
      message: 'Invalid submission status.'
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         fs.id,
         fs.form_id,
         fs.species,
         fs.surrender_type,
         fs.responses,
         fs.status,
         fs.submitted_at,
         fs.updated_at,
         f.name AS form_name,
         f.slug AS form_slug
       FROM form_submissions fs
       JOIN forms f
         ON f.id = fs.form_id
        AND f.organization_id = fs.organization_id
       WHERE fs.organization_id = $1
         AND ($2::varchar IS NULL OR fs.status = $2)
         AND ($3::bigint IS NULL OR fs.form_id = $3)
       ORDER BY fs.submitted_at DESC`,
      [
        req.organizationId,
        status || null,
        form_id || null
      ]
    );

    return res.status(200).json(result.rows);

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error retrieving submissions:'
    );
  }
};

// ==========================================
// GET SUBMISSION BY ID
// GET /api/forms/submissions/:id
// ==========================================

exports.getSubmissionById = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      message: 'Invalid submission ID.'
    });
  }

  if (!req.organizationId) {
    return res.status(400).json({
      message: 'An organization must be selected.'
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         fs.*,
         f.name AS form_name,
         f.slug AS form_slug,
         fs.form_snapshot AS form_definition
       FROM form_submissions fs
       JOIN forms f
         ON f.id = fs.form_id
        AND f.organization_id = fs.organization_id
       WHERE fs.id = $1
         AND fs.organization_id = $2`,
      [
        id,
        req.organizationId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Submission not found.'
      });
    }

    const submission = result.rows[0];

    const filesResult = await pool.query(
      `SELECT
         id,
         submission_id,
         question_id,
         storage_path,
         original_name,
         mime_type,
         size_bytes,
         uploaded_at
       FROM form_submission_files
       WHERE submission_id = $1
         AND organization_id = $2
       ORDER BY uploaded_at ASC`,
      [
        id,
        req.organizationId
      ]
    );

    const files = [];

    for (const file of filesResult.rows) {
      const { data, error } = await createSignedFileUrl(
        file.storage_path,
        60 * 60
      );

      if (error) {
        console.error(
          'Could not create signed form document URL:',
          error
        );

        files.push({
          ...file,
          download_url: null
        });

        continue;
      }

      files.push({
        ...file,
        download_url: data.signedUrl
      });
    }

    return res.status(200).json({
      ...submission,
      files
    });

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error retrieving submission:'
    );
  }
};

// ==========================================
// UPDATE SUBMISSION STATUS
// PATCH /api/forms/submissions/:id/status
// ==========================================

exports.updateSubmissionStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!isValidId(id)) {
    return res.status(400).json({
      message: 'Invalid submission ID.'
    });
  }

  if (!req.organizationId) {
    return res.status(400).json({
      message: 'An organization must be selected.'
    });
  }

  if (!ALLOWED_SUBMISSION_STATUSES.includes(status)) {
    return res.status(400).json({
      message: 'Invalid submission status.'
    });
  }

  try {
    const result = await pool.query(
      `UPDATE form_submissions
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND organization_id = $3
       RETURNING *`,
      [
        status,
        id,
        req.organizationId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Submission not found.'
      });
    }

    return res.status(200).json({
      message: 'Submission status updated successfully.',
      submission: result.rows[0]
    });

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error updating submission status:'
    );
  }
};

// ==========================================
// DELETE SUBMISSION
// DELETE /api/forms/submissions/:id
//
// Deletes the submission, its uploaded documents,
// and its staff review notes.
// ==========================================

exports.deleteSubmission = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      message: 'Invalid submission ID.'
    });
  }

  if (!req.organizationId) {
    return res.status(400).json({
      message: 'An organization must be selected.'
    });
  }

  let client;

  try {
    // --------------------------------------
    // CONFIRM SUBMISSION EXISTS
    // --------------------------------------

    const submissionResult = await pool.query(
      `SELECT id
       FROM form_submissions
       WHERE id = $1
         AND organization_id = $2`,
      [
        id,
        req.organizationId
      ]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Submission not found.'
      });
    }

    // --------------------------------------
    // RETRIEVE ATTACHMENT PATHS
    // --------------------------------------

    const filesResult = await pool.query(
      `SELECT storage_path
       FROM form_submission_files
       WHERE submission_id = $1
         AND organization_id = $2`,
      [
        id,
        req.organizationId
      ]
    );

    const storagePaths = filesResult.rows
      .map(file => file.storage_path)
      .filter(Boolean);

    // --------------------------------------
    // REMOVE FILES FROM STORAGE
    // --------------------------------------

    if (storagePaths.length > 0) {
      const { error: storageError } =
        await removeStorageFiles(storagePaths);

      if (storageError) {
        console.error(
          'Could not delete submission documents from Supabase:',
          storageError
        );

        return res.status(500).json({
          message: 'The uploaded documents could not be deleted. The application was not deleted.'
        });
      }
    }

    // --------------------------------------
    // DELETE DATABASE RECORDS
    // --------------------------------------

    client = await pool.connect();

    await client.query('BEGIN');

    await client.query(
      `DELETE FROM form_submission_notes
       WHERE submission_id = $1
         AND organization_id = $2`,
      [
        id,
        req.organizationId
      ]
    );

    await client.query(
      `DELETE FROM form_submission_files
       WHERE submission_id = $1
         AND organization_id = $2`,
      [
        id,
        req.organizationId
      ]
    );

    const deleteResult = await client.query(
      `DELETE FROM form_submissions
       WHERE id = $1
         AND organization_id = $2
       RETURNING id`,
      [
        id,
        req.organizationId
      ]
    );

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'Submission not found.'
      });
    }

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Application and associated documents deleted successfully.',
      id: deleteResult.rows[0].id
    });

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error(
          'Error rolling back submission deletion:',
          rollbackError
        );
      }
    }

    return sendServerError(
      res,
      error,
      'Error deleting submission:'
    );

  } finally {
    if (client) {
      client.release();
    }
  }
};