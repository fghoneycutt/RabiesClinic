
const pool = require('../../db');

const {
  isPlainObject,
  sendServerError,
  getUploadedFilesByQuestion
} = require('../../utils/forms/forms.helpers');

const {
  getPublicDefinition,
  validateSubmission
} = require('../../services/forms/formValidation.service');

const {
  uploadSubmissionFiles,
  removeStorageFiles
} = require('../../services/forms/formFiles.service');

// ==========================================
// GET PUBLIC FORM BY SLUG
// GET /api/forms/public/:slug
// ==========================================

exports.getPublicForm = async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         id AS form_id,
         name,
         slug,
         description,
         definition
       FROM forms
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Form not found.'
      });
    }

    const form = result.rows[0];

    if (
      !isPlainObject(form.definition) ||
      !Array.isArray(form.definition.sections)
    ) {
      return res.status(409).json({
        message: 'This form has not been configured yet.'
      });
    }

    // Never send staff-only questions to applicants.
    const publicDefinition = getPublicDefinition(
      form.definition
    );

    return res.status(200).json({
      ...form,
      definition: publicDefinition
    });

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error retrieving public form:'
    );
  }
};

// ==========================================
// SUBMIT PUBLIC FORM
// POST /api/forms/public/:slug/submit
//
// Supports JSON and multipart/form-data.
// Organization is determined by the public form's slug.
// ==========================================

exports.submitForm = async (req, res) => {
  const { slug } = req.params;

  let submissionId = null;
  const uploadedStoragePaths = [];

  try {
    // --------------------------------------
    // PARSE RESPONSES
    // --------------------------------------

    let responses = req.body?.responses;

    // Multipart requests send JSON values as strings.
    if (typeof responses === 'string') {
      try {
        responses = JSON.parse(responses);
      } catch {
        return res.status(400).json({
          message: 'Form responses contain invalid JSON.'
        });
      }
    }

    const species = req.body?.species;
    const surrender_type = req.body?.surrender_type;

    if (!isPlainObject(responses)) {
      return res.status(400).json({
        message: 'Form responses must be provided as an object.'
      });
    }

    if (
      species !== undefined &&
      species !== null &&
      typeof species !== 'string'
    ) {
      return res.status(400).json({
        message: 'Invalid species value.'
      });
    }

    if (
      surrender_type !== undefined &&
      surrender_type !== null &&
      typeof surrender_type !== 'string'
    ) {
      return res.status(400).json({
        message: 'Invalid surrender type.'
      });
    }

    if (species && species.length > 50) {
      return res.status(400).json({
        message: 'Species value is too long.'
      });
    }

    if (surrender_type && surrender_type.length > 100) {
      return res.status(400).json({
        message: 'Surrender type value is too long.'
      });
    }

    // --------------------------------------
    // PROCESS UPLOADED FILES
    // --------------------------------------

    const files = Array.isArray(req.files)
      ? req.files
      : [];

    if (
      files.some(
        file => !file.fieldname.startsWith('file_')
      )
    ) {
      return res.status(400).json({
        message: 'An uploaded file has an invalid question reference.'
      });
    }

    const uploadedFilesByQuestion =
      getUploadedFilesByQuestion(files);

    // --------------------------------------
    // RETRIEVE FORM AND ORGANIZATION
    // --------------------------------------

    const formResult = await pool.query(
      `SELECT
         id,
         organization_id,
         definition
       FROM forms
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );

    if (formResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Form not found.'
      });
    }

    const form = formResult.rows[0];

    if (!form.organization_id) {
      console.error(
        'Public form has no organization ID:',
        form.id
      );

      return res.status(409).json({
        message: 'This form is not associated with an organization.'
      });
    }

    if (
      !isPlainObject(form.definition) ||
      !Array.isArray(form.definition.sections)
    ) {
      return res.status(409).json({
        message: 'This form has not been configured yet.'
      });
    }

    // --------------------------------------
    // VALIDATE SUBMISSION
    // --------------------------------------

    const formSnapshot = getPublicDefinition(
      form.definition
    );

    const validationError = validateSubmission(
      formSnapshot,
      responses,
      uploadedFilesByQuestion
    );

    if (validationError) {
      return res.status(400).json({
        message: validationError
      });
    }

    // --------------------------------------
    // CREATE SUBMISSION
    // --------------------------------------

    const result = await pool.query(
      `INSERT INTO form_submissions (
         organization_id,
         form_id,
         form_snapshot,
         species,
         surrender_type,
         responses,
         status
       )
       VALUES (
         $1,
         $2,
         $3::jsonb,
         $4,
         $5,
         $6::jsonb,
         'submitted'
       )
       RETURNING
         id,
         organization_id,
         form_id,
         status,
         submitted_at`,
      [
        form.organization_id,
        form.id,
        JSON.stringify(formSnapshot),
        species || null,
        surrender_type || null,
        JSON.stringify(responses)
      ]
    );

    const submission = result.rows[0];
    submissionId = submission.id;

    // --------------------------------------
    // UPLOAD DOCUMENTS
    // --------------------------------------

    await uploadSubmissionFiles({
      organizationId: form.organization_id,
      submissionId,
      uploadedFilesByQuestion,
      uploadedStoragePaths
    });

    // --------------------------------------
    // SUCCESS
    // --------------------------------------

    return res.status(201).json({
      message: 'Form submitted successfully.',
      submission
    });

  } catch (error) {
    console.error(
      'Error submitting form:',
      error
    );

    // --------------------------------------
    // CLEAN UP UPLOADED STORAGE FILES
    // --------------------------------------

    if (uploadedStoragePaths.length > 0) {
      try {
        const { error: cleanupError } =
          await removeStorageFiles(uploadedStoragePaths);

        if (cleanupError) {
          console.error(
            'Could not clean up uploaded form documents:',
            cleanupError
          );
        }

      } catch (cleanupError) {
        console.error(
          'Could not clean up uploaded form documents:',
          cleanupError
        );
      }
    }

    // --------------------------------------
    // CLEAN UP INCOMPLETE SUBMISSION
    // --------------------------------------

    if (submissionId !== null) {
      try {
        await pool.query(
          `DELETE FROM form_submissions
           WHERE id = $1`,
          [submissionId]
        );

      } catch (cleanupError) {
        console.error(
          'Could not clean up incomplete form submission:',
          cleanupError
        );
      }
    }

    return sendServerError(
      res,
      error,
      'Error submitting form:'
    );
  }
};