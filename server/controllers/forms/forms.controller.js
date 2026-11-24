
const pool = require('../../db');

const {
  ALLOWED_FORM_TYPES
} = require('../../utils/forms/forms.constants');

const {
  slugify,
  isValidId,
  isPlainObject,
  sendServerError
} = require('../../utils/forms/forms.helpers');

// ==========================================
// CREATE FORM
// POST /api/forms
// ==========================================

exports.createForm = async (req, res) => {
  const {
    name,
    description,
    slug,
    form_type
  } = req.body || {};

  if (!req.organizationId) {
    return res.status(400).json({
      message: 'An organization must be selected.'
    });
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      message: 'A form name is required.'
    });
  }

  const formType = form_type || 'general';

  if (!ALLOWED_FORM_TYPES.includes(formType)) {
    return res.status(400).json({
      message: 'Invalid form type.'
    });
  }

  const formSlug = slugify(
    typeof slug === 'string' && slug.trim()
      ? slug
      : name
  );

  if (!formSlug) {
    return res.status(400).json({
      message: 'A valid form slug could not be generated.'
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== 'string'
  ) {
    return res.status(400).json({
      message: 'Form description must be text.'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO forms (
        organization_id,
        name,
        slug,
        description,
        form_type,
        definition
      )
      VALUES ($1, $2, $3, $4, $5, '{}'::jsonb)
      RETURNING *`,
      [
        req.organizationId,
        name.trim(),
        formSlug,
        description || null,
        formType
      ]
    );

    return res.status(201).json({
      message: 'Form created successfully.',
      form: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'A form with that slug already exists.'
      });
    }

    return sendServerError(
      res,
      error,
      'Error creating form:'
    );
  }
};

// ==========================================
// GET ALL FORMS
// GET /api/forms
// ==========================================

exports.getForms = async (req, res) => {
  const { form_type } = req.query;

  if (!req.organizationId) {
    return res.status(400).json({
      message: 'An organization must be selected.'
    });
  }

  if (
    form_type &&
    !ALLOWED_FORM_TYPES.includes(form_type)
  ) {
    return res.status(400).json({
      message: 'Invalid form type.'
    });
  }

  try {
    const values = [req.organizationId];

    let query = `
      SELECT
        f.*,
        (
          SELECT COUNT(*)
          FROM form_submissions fs
          WHERE fs.form_id = f.id
            AND fs.organization_id = f.organization_id
        ) AS submission_count
      FROM forms f
      WHERE f.organization_id = $1
    `;

    if (form_type) {
      values.push(form_type);
      query += ` AND f.form_type = $${values.length}`;
    }

    query += ` ORDER BY f.created_at DESC`;

    const result = await pool.query(query, values);

    return res.status(200).json(result.rows);

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error retrieving forms:'
    );
  }
};

// ==========================================
// GET FORM BY ID
// GET /api/forms/:id
// ==========================================

exports.getFormById = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      message: 'Invalid form ID.'
    });
  }

  if (!req.organizationId) {
    return res.status(400).json({
      message: 'An organization must be selected.'
    });
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM forms
       WHERE id = $1
         AND organization_id = $2`,
      [
        id,
        req.organizationId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Form not found.'
      });
    }

    return res.status(200).json({
      form: result.rows[0]
    });

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error retrieving form:'
    );
  }
};

// ==========================================
// UPDATE FORM
// PUT /api/forms/:id
// ==========================================

exports.updateForm = async (req, res) => {
  const { id } = req.params;
  const { definition } = req.body || {};

  if (!isValidId(id)) {
    return res.status(400).json({
      message: 'Invalid form ID.'
    });
  }

  if (!isPlainObject(definition)) {
    return res.status(400).json({
      message: 'A valid form definition object is required.'
    });
  }

  if (!req.organizationId) {
    return res.status(400).json({
      message: 'An organization must be selected.'
    });
  }

  try {
    const result = await pool.query(
      `UPDATE forms
       SET definition = $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
         AND organization_id = $3
       RETURNING *`,
      [
        JSON.stringify(definition),
        id,
        req.organizationId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Form not found.'
      });
    }

    return res.status(200).json({
      message: 'Form saved successfully.',
      form: result.rows[0]
    });

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error updating form:'
    );
  }
};
