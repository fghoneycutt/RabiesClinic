const pool = require('../db');

// ==========================================
// HELPERS
// ==========================================

const slugify = (value) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const isValidId = (id) => {
  return Number.isInteger(Number(id)) && Number(id) > 0;
};

const isPlainObject = (value) => {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);
};

const sendServerError = (res, error, message) => {
  console.error(message, error);

  return res.status(500).json({
    message: 'An unexpected server error occurred.',
  });
};

const allowedStatuses = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'denied',
  'withdrawn',
];

const isEmptyAnswer = (value) => {
  return value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);
};

const getOptionValue = (option) => {
  if (typeof option === 'string') {
    return option;
  }

  if (isPlainObject(option)) {
    return option.value ?? option.label;
  }

  return undefined;
};

// ==========================================
// PUBLIC FORM DEFINITION HELPERS
// ==========================================

// Remove staff-only questions before sending a form
// to the public applicant.

const getPublicDefinition = (definition) => {
  if (!isPlainObject(definition)) {
    return {
      schemaVersion: 1,
      sections: [],
    };
  }

  const sections = Array.isArray(definition.sections)
    ? definition.sections
    : [];

  // Collect IDs of all questions that applicants can see.
  const publicQuestionIds = new Set();

  sections.forEach((section) => {
    const questions = Array.isArray(section.questions)
      ? section.questions
      : [];

    questions.forEach((question) => {
      if (
        question &&
        question.id &&
        !question.staffOnly
      ) {
        publicQuestionIds.add(question.id);
      }
    });
  });

  const cleanCondition = (condition) => {
    if (!condition) {
      return undefined;
    }

    // Never allow public branching to depend on a
    // staff-only or nonexistent question.
    if (!publicQuestionIds.has(condition.questionId)) {
      return undefined;
    }

    return condition;
  };

  return {
    ...definition,

    sections: sections.map((section) => {
      const questions = Array.isArray(section.questions)
        ? section.questions
        : [];

      return {
        ...section,
        condition: cleanCondition(section.condition),

        questions: questions
          .filter((question) => !question.staffOnly)
          .map((question) => {
            const {
              staffOnly,
              ...publicQuestion
            } = question;

            return {
              ...publicQuestion,
              condition: cleanCondition(question.condition),
            };
          }),
      };
    }),
  };
};

// ==========================================
// BRANCHING / CONDITION HELPERS
// ==========================================

const conditionsMatch = (condition, responses) => {
  if (!condition) {
    return true;
  }

  const answer = responses[condition.questionId];

  // An unanswered source question never activates a condition,
  // including not_equals.
  if (isEmptyAnswer(answer)) {
    return false;
  }

  // Support both the current values array and older
  // saved conditions using a single value.
  const values = Array.isArray(condition.values)
    ? condition.values.map(value =>
        String(value).trim().toLowerCase()
      )
    : condition.value !== undefined
      ? [String(condition.value).trim().toLowerCase()]
      : [];

  if (values.length === 0) {
    return false;
  }

  const answerValues = Array.isArray(answer)
    ? answer.map(value =>
        String(value).trim().toLowerCase()
      )
    : [String(answer).trim().toLowerCase()];

  const matches = answerValues.some(value =>
    values.includes(value)
  );

  if (condition.operator === 'not_equals') {
    return !matches;
  }

  return matches;
};

// ==========================================
// OWNER INFORMATION VALIDATION
// ==========================================

const validateOwnerInformation = (owner) => {
  if (!isPlainObject(owner)) {
    return false;
  }

  const requiredFields = [
    'first_name',
    'last_name',
    'email',
    'phone',
    'address',
    'city',
    'county',
    'state',
    'zip_code',
  ];

  for (const field of requiredFields) {
    if (
      typeof owner[field] !== 'string' ||
      !owner[field].trim()
    ) {
      return false;
    }
  }

  // Email
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      owner.email.trim()
    )
  ) {
    return false;
  }

  // Phone must contain exactly 10 digits.
  const phoneDigits = owner.phone.replace(/\D/g, '');

  if (phoneDigits.length !== 10) {
    return false;
  }

  // ZIP code
  if (!/^\d{5}$/.test(owner.zip_code.trim())) {
    return false;
  }

  // Optional secondary address must still be text if provided.
  if (
    owner.secondary_address !== undefined &&
    owner.secondary_address !== null &&
    typeof owner.secondary_address !== 'string'
  ) {
    return false;
  }

  return true;
};

// ==========================================
// ANIMAL INFORMATION VALIDATION
// ==========================================

const validateAnimalInformation = (animals) => {
  if (
    !Array.isArray(animals) ||
    animals.length === 0 ||
    animals.length > 20
  ) {
    return false;
  }

  return animals.every((animal) => {
    if (!isPlainObject(animal)) {
      return false;
    }

    // Name
    if (
      typeof animal.name !== 'string' ||
      !animal.name.trim()
    ) {
      return false;
    }

    // Species
    if (!['dog', 'cat'].includes(animal.species)) {
      return false;
    }

    // Sex
    if (!['male', 'female'].includes(animal.sex)) {
      return false;
    }

    // Altered status may be true, false, or null (unknown).
    if (
      animal.altered_status !== true &&
      animal.altered_status !== false &&
      animal.altered_status !== null
    ) {
      return false;
    }

    // Primary breed
    if (
      typeof animal.primary_breed !== 'string' ||
      !animal.primary_breed.trim()
    ) {
      return false;
    }

    // Secondary breed is optional.
    if (
      animal.secondary_breed !== null &&
      animal.secondary_breed !== undefined &&
      typeof animal.secondary_breed !== 'string'
    ) {
      return false;
    }

    // At least one age field must be provided.
    const hasAge =
      animal.age_years !== null ||
      animal.age_months !== null;

    if (!hasAge) {
      return false;
    }

    if (
      animal.age_years !== null &&
      (
        !Number.isInteger(animal.age_years) ||
        animal.age_years < 0
      )
    ) {
      return false;
    }

    if (
      animal.age_months !== null &&
      (
        !Number.isInteger(animal.age_months) ||
        animal.age_months < 0 ||
        animal.age_months > 11
      )
    ) {
      return false;
    }

    // Approximate weight is optional.
    if (
      animal.approximate_weight !== null &&
      animal.approximate_weight !== undefined &&
      (
        typeof animal.approximate_weight !== 'number' ||
        !Number.isFinite(animal.approximate_weight) ||
        animal.approximate_weight < 0
      )
    ) {
      return false;
    }

    // Primary color
    if (
      typeof animal.primary_color !== 'string' ||
      !animal.primary_color.trim()
    ) {
      return false;
    }

    // Optional color and pattern fields.
    const optionalTextFields = [
      'secondary_color',
      'pattern',
      'microchip_number',
      'microchip_issuer',
      'rabies_tag_number',
    ];

    for (const field of optionalTextFields) {
      if (
        animal[field] !== null &&
        animal[field] !== undefined &&
        typeof animal[field] !== 'string'
      ) {
        return false;
      }
    }

    // A microchip number requires an issuer.
    if (
      animal.microchip_number &&
      animal.microchip_number.trim() &&
      (
        typeof animal.microchip_issuer !== 'string' ||
        !animal.microchip_issuer.trim()
      )
    ) {
      return false;
    }

    return true;
  });
};

// ==========================================
// SUBMISSION ANSWER VALIDATION
// ==========================================

const validateAnswer = (question, answer) => {
  const options = Array.isArray(question.options)
    ? question.options.map(getOptionValue).filter(
        value => value !== undefined
      )
    : [];

  switch (question.type) {
    case 'short_text':
    case 'long_text':
      return typeof answer === 'string';

    case 'number':
      return typeof answer === 'number' &&
        Number.isFinite(answer) &&
        answer >= 0;

    case 'radio':
    case 'dropdown':
      return typeof answer === 'string' &&
        options.includes(answer);

    case 'checkbox':
      return Array.isArray(answer) &&
        answer.every(
          value =>
            typeof value === 'string' &&
            options.includes(value)
        );

    case 'yes_no':
      return typeof answer === 'boolean' ||
        (
          typeof answer === 'string' &&
          ['yes', 'no'].includes(answer.toLowerCase())
        );

    case 'date': {
      if (
        typeof answer !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(answer)
      ) {
        return false;
      }

      const parsed = new Date(`${answer}T00:00:00Z`);

      if (Number.isNaN(parsed.getTime())) {
        return false;
      }

      // Ensure the date is a real calendar date.
      return parsed.toISOString().slice(0, 10) === answer;
    }

    case 'owner_information':
      return validateOwnerInformation(answer);

    case 'animal_information':
      return validateAnimalInformation(answer);

    case 'content':
      return false;

    default:
      return false;
  }
};

// ==========================================
// COMPLETE SUBMISSION VALIDATION
// ==========================================

const validateSubmission = (definition, responses) => {
  if (!Array.isArray(definition.sections)) {
    return 'The form definition is invalid.';
  }

  if (!isPlainObject(responses)) {
    return 'Form responses must be provided as an object.';
  }

  const visibleQuestionIds = new Set();

  // Only answers to previously encountered, visible questions
  // are allowed to activate conditions.
  //
  // This prevents someone from submitting an answer to a hidden
  // question in order to activate another conditional question.
  const visibleResponses = {};

  // Process sections and questions in their defined order.
  for (const section of definition.sections) {
    const sectionVisible = conditionsMatch(
      section.condition,
      visibleResponses
    );

    if (!sectionVisible) {
      continue;
    }

    const questions = Array.isArray(section.questions)
      ? section.questions
      : [];

    for (const question of questions) {
      if (!question.id || question.staffOnly) {
        continue;
      }

      const questionVisible = conditionsMatch(
        question.condition,
        visibleResponses
      );

      if (!questionVisible) {
        continue;
      }

      if (question.type === 'content') {
        continue;
      }

      visibleQuestionIds.add(question.id);

      const answer = responses[question.id];

      // Special information blocks contain their own required
      // fields and are always mandatory when present.
      const isSpecialBlock =
        question.type === 'owner_information' ||
        question.type === 'animal_information';

      const answerRequired =
        question.required || isSpecialBlock;

      if (answerRequired && isEmptyAnswer(answer)) {
        return `Please complete the required section: ${question.label || question.id}`;
      }

      // Validate any supplied answer.
      if (!isEmptyAnswer(answer)) {
        if (!validateAnswer(question, answer)) {
          return `The answer provided for "${question.label || question.id}" is invalid.`;
        }
      }

      // Only validated, visible answers may activate later
      // conditional questions or sections.
      if (!isEmptyAnswer(answer)) {
        visibleResponses[question.id] = answer;
      }
    }
  }

  // Reject answers to questions that are hidden by branching
  // or questions that do not exist in the public form.
  for (const questionId of Object.keys(responses)) {
    if (!visibleQuestionIds.has(questionId)) {
      return 'Your submission contains an answer to an unavailable question. Please refresh the form and try again.';
    }
  }

  return null;
};

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

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      message: 'A form name is required.',
    });
  }

  const allowedFormTypes = [
    'surrender',
    'rescue',
    'foster',
    'volunteer',
    'adoption',
    'general',
  ];

  const formType = form_type || 'general';

  if (!allowedFormTypes.includes(formType)) {
    return res.status(400).json({
      message: 'Invalid form type.',
    });
  }

  const formSlug = slugify(
    typeof slug === 'string' && slug.trim()
      ? slug
      : name
  );

  if (!formSlug) {
    return res.status(400).json({
      message: 'A valid form slug could not be generated.',
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== 'string'
  ) {
    return res.status(400).json({
      message: 'Form description must be text.',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO forms (
        name,
        slug,
        description,
        form_type,
        definition
      )
      VALUES ($1, $2, $3, $4, '{}'::jsonb)
      RETURNING *`,
      [
        name.trim(),
        formSlug,
        description || null,
        formType,
      ]
    );

    return res.status(201).json({
      message: 'Form created successfully.',
      form: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'A form with that slug already exists.',
      });
    }

    return sendServerError(res, error, 'Error creating form:');
  }
};

// ==========================================
// GET ALL FORMS
// GET /api/forms
// ==========================================

exports.getForms = async (req, res) => {
  const { form_type } = req.query;

  const allowedFormTypes = [
    'surrender',
    'rescue',
    'foster',
    'volunteer',
    'adoption',
    'general',
  ];

  if (form_type && !allowedFormTypes.includes(form_type)) {
    return res.status(400).json({
      message: 'Invalid form type.',
    });
  }

  try {
    const values = [];

    let query = `
      SELECT
        f.*,
        (
          SELECT COUNT(*)
          FROM form_submissions fs
          WHERE fs.form_id = f.id
        ) AS submission_count
      FROM forms f
    `;

    if (form_type) {
      values.push(form_type);
      query += ` WHERE f.form_type = $${values.length}`;
    }

    query += ` ORDER BY f.created_at DESC`;

    const result = await pool.query(query, values);

    return res.status(200).json(result.rows);
  } catch (error) {
    return sendServerError(res, error, 'Error retrieving forms:');
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
      message: 'Invalid form ID.',
    });
  }

  try {
    const result = await pool.query(
      `SELECT *
       FROM forms
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Form not found.',
      });
    }

    return res.status(200).json({
      form: result.rows[0],
    });
  } catch (error) {
    return sendServerError(res, error, 'Error retrieving form:');
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
      message: 'Invalid form ID.',
    });
  }

  if (!isPlainObject(definition)) {
    return res.status(400).json({
      message: 'A valid form definition object is required.',
    });
  }

  try {
    const result = await pool.query(
      `UPDATE forms
       SET definition = $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [
        JSON.stringify(definition),
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Form not found.',
      });
    }

    return res.status(200).json({
      message: 'Form saved successfully.',
      form: result.rows[0],
    });
  } catch (error) {
    return sendServerError(res, error, 'Error updating form:');
  }
};

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
        message: 'Form not found.',
      });
    }

    const form = result.rows[0];

    if (
      !isPlainObject(form.definition) ||
      !Array.isArray(form.definition.sections)
    ) {
      return res.status(409).json({
        message: 'This form has not been configured yet.',
      });
    }

    // Never send staff-only questions to applicants.
    const publicDefinition = getPublicDefinition(
      form.definition
    );

    return res.status(200).json({
      ...form,
      definition: publicDefinition,
    });
  } catch (error) {
    return sendServerError(res, error, 'Error retrieving public form:');
  }
};

// ==========================================
// SUBMIT PUBLIC FORM
// POST /api/forms/public/:slug/submit
//
// Body:
// {
//   "responses": { ... },
//   "species": "dog",
//   "surrender_type": "owned_pet"
// }
//
// The form snapshot is generated by the server.
// Applicants cannot provide or modify it.
// ==========================================

exports.submitForm = async (req, res) => {
  const { slug } = req.params;

  const {
    responses,
    species,
    surrender_type,
  } = req.body || {};

  if (!isPlainObject(responses)) {
    return res.status(400).json({
      message: 'Form responses must be provided as an object.',
    });
  }

  if (
    species !== undefined &&
    species !== null &&
    typeof species !== 'string'
  ) {
    return res.status(400).json({
      message: 'Invalid species value.',
    });
  }

  if (
    surrender_type !== undefined &&
    surrender_type !== null &&
    typeof surrender_type !== 'string'
  ) {
    return res.status(400).json({
      message: 'Invalid surrender type.',
    });
  }

  if (species && species.length > 50) {
    return res.status(400).json({
      message: 'Species value is too long.',
    });
  }

  if (surrender_type && surrender_type.length > 100) {
    return res.status(400).json({
      message: 'Surrender type value is too long.',
    });
  }

  try {
    const formResult = await pool.query(
      `SELECT id, definition
       FROM forms
       WHERE slug = $1
       LIMIT 1`,
      [slug]
    );

    if (formResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Form not found.',
      });
    }

    const form = formResult.rows[0];

    if (
      !isPlainObject(form.definition) ||
      !Array.isArray(form.definition.sections)
    ) {
      return res.status(409).json({
        message: 'This form has not been configured yet.',
      });
    }

    // Generate the exact public-facing definition that
    // applicants receive. Staff-only questions are excluded.
    const formSnapshot = getPublicDefinition(
      form.definition
    );

    const validationError = validateSubmission(
      formSnapshot,
      responses
    );

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const result = await pool.query(
      `INSERT INTO form_submissions (
         form_id,
         form_snapshot,
         species,
         surrender_type,
         responses,
         status
       )
       VALUES (
         $1,
         $2::jsonb,
         $3,
         $4,
         $5::jsonb,
         'submitted'
       )
       RETURNING id, form_id, status, submitted_at`,
      [
        form.id,
        JSON.stringify(formSnapshot),
        species || null,
        surrender_type || null,
        JSON.stringify(responses),
      ]
    );

    return res.status(201).json({
      message: 'Form submitted successfully.',
      submission: result.rows[0],
    });
  } catch (error) {
    return sendServerError(res, error, 'Error submitting form:');
  }
};

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

  if (form_id && !isValidId(form_id)) {
    return res.status(400).json({
      message: 'Invalid form ID.',
    });
  }

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: 'Invalid submission status.',
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         fs.id,
         fs.form_id,
         fs.species,
         fs.surrender_type,
         fs.status,
         fs.submitted_at,
         fs.updated_at,
         f.name AS form_name,
         f.slug AS form_slug
       FROM form_submissions fs
       JOIN forms f ON f.id = fs.form_id
       WHERE ($1::varchar IS NULL OR fs.status = $1)
         AND ($2::bigint IS NULL OR fs.form_id = $2)
       ORDER BY fs.submitted_at DESC`,
      [
        status || null,
        form_id || null,
      ]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    return sendServerError(res, error, 'Error retrieving submissions:');
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
      message: 'Invalid submission ID.',
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
       JOIN forms f ON f.id = fs.form_id
       WHERE fs.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Submission not found.',
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return sendServerError(res, error, 'Error retrieving submission:');
  }
};

// ==========================================
// UPDATE SUBMISSION STATUS
// PATCH /api/forms/submissions/:id/status
//
// Body:
// {
//   "status": "under_review"
// }
// ==========================================

exports.updateSubmissionStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!isValidId(id)) {
    return res.status(400).json({
      message: 'Invalid submission ID.',
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: 'Invalid submission status.',
    });
  }

  try {
    const result = await pool.query(
      `UPDATE form_submissions
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Submission not found.',
      });
    }

    return res.status(200).json({
      message: 'Submission status updated successfully.',
      submission: result.rows[0],
    });
  } catch (error) {
    return sendServerError(res, error, 'Error updating submission status:');
  }
};