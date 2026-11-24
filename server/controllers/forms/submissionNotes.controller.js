
const pool = require('../../db');

const {
  isValidId,
  sendServerError
} = require('../../utils/forms/forms.helpers');

// ==========================================
// GET SUBMISSION NOTES
// GET /api/forms/submissions/:id/notes
// ==========================================

exports.getSubmissionNotes = async (req, res) => {
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
    const submission = await pool.query(
      `SELECT id
       FROM form_submissions
       WHERE id = $1
         AND organization_id = $2`,
      [
        id,
        req.organizationId
      ]
    );

    if (submission.rows.length === 0) {
      return res.status(404).json({
        message: 'Submission not found.'
      });
    }

    const result = await pool.query(
      `SELECT
        n.id,
        n.submission_id,
        n.organization_id,
        n.note,
        n.created_by,
        n.created_at,
        n.updated_by,
        n.updated_at,
        creator.name AS created_by_name,
        editor.name AS updated_by_name
      FROM form_submission_notes n
      LEFT JOIN users creator
        ON creator.id = n.created_by
      LEFT JOIN users editor
        ON editor.id = n.updated_by
      WHERE n.submission_id = $1
        AND n.organization_id = $2
      ORDER BY n.created_at ASC, n.id ASC`,
      [
        id,
        req.organizationId
      ]
    );

    return res.status(200).json({
      notes: result.rows
    });

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error retrieving submission notes:'
    );
  }
};

// ==========================================
// ADD SUBMISSION NOTE
// POST /api/forms/submissions/:id/notes
// ==========================================

exports.addSubmissionNote = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body || {};

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

  if (typeof note !== 'string' || !note.trim()) {
    return res.status(400).json({
      message: 'A note is required.'
    });
  }

  try {
    const submission = await pool.query(
      `SELECT id
       FROM form_submissions
       WHERE id = $1
         AND organization_id = $2`,
      [
        id,
        req.organizationId
      ]
    );

    if (submission.rows.length === 0) {
      return res.status(404).json({
        message: 'Submission not found.'
      });
    }

    const result = await pool.query(
      `WITH inserted AS (
        INSERT INTO form_submission_notes (
          organization_id,
          submission_id,
          note,
          created_by
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      )
      SELECT
        inserted.*,
        creator.name AS created_by_name,
        NULL::text AS updated_by_name
      FROM inserted
      LEFT JOIN public.users creator
        ON creator.id = inserted.created_by`,
      [
        req.organizationId,
        id,
        note.trim(),
        req.user?.id || null
      ]
    );

    return res.status(201).json({
      message: 'Note added successfully.',
      note: result.rows[0]
    });

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error adding submission note:'
    );
  }
};

// ==========================================
// UPDATE SUBMISSION NOTE
// PUT /api/forms/submissions/:id/notes/:noteId
// ==========================================

exports.updateSubmissionNote = async (req, res) => {
  const { id, noteId } = req.params;
  const { note } = req.body || {};

  if (!isValidId(id) || !isValidId(noteId)) {
    return res.status(400).json({
      message: 'Invalid submission or note ID.'
    });
  }

  if (!req.organizationId) {
    return res.status(400).json({
      message: 'An organization must be selected.'
    });
  }

  if (typeof note !== 'string' || !note.trim()) {
    return res.status(400).json({
      message: 'A note is required.'
    });
  }

  try {
    const result = await pool.query(
      `WITH updated AS (
        UPDATE form_submission_notes
        SET
          note = $1,
          updated_by = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
          AND submission_id = $4
          AND organization_id = $5
        RETURNING *
      )
      SELECT
        updated.*,
        creator.name AS created_by_name,
        editor.name AS updated_by_name
      FROM updated
      LEFT JOIN public.users creator
        ON creator.id = updated.created_by
      LEFT JOIN public.users editor
        ON editor.id = updated.updated_by`,
      [
        note.trim(),
        req.user?.id || null,
        noteId,
        id,
        req.organizationId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Note not found.'
      });
    }

    return res.status(200).json({
      message: 'Note updated successfully.',
      note: result.rows[0]
    });

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error updating submission note:'
    );
  }
};

// ==========================================
// DELETE SUBMISSION NOTE
// DELETE /api/forms/submissions/:id/notes/:noteId
// ==========================================

exports.deleteSubmissionNote = async (req, res) => {
  const { id, noteId } = req.params;

  if (!isValidId(id) || !isValidId(noteId)) {
    return res.status(400).json({
      message: 'Invalid submission or note ID.'
    });
  }

  if (!req.organizationId) {
    return res.status(400).json({
      message: 'An organization must be selected.'
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM form_submission_notes
       WHERE id = $1
         AND submission_id = $2
         AND organization_id = $3
       RETURNING id`,
      [
        noteId,
        id,
        req.organizationId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Note not found.'
      });
    }

    return res.status(200).json({
      message: 'Note deleted successfully.'
    });

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error deleting submission note:'
    );
  }
};
