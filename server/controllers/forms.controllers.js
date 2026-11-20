const pool = require('../db');

const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

const execFileAsync = promisify(execFile);

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FORM_UPLOADS_BUCKET = 'form-uploads';

const FILE_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};


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


const getUploadedFilesByQuestion = (files = []) => {
  const result = {};

  for (const file of files) {
    if (!file.fieldname.startsWith('file_')) {
      continue;
    }

    const questionId = file.fieldname.slice(5);

    if (!questionId) {
      continue;
    }

    if (!result[questionId]) {
      result[questionId] = [];
    }

    result[questionId].push(file);
  }

  return result;
};

const fileMatchesAccept = (file, question) => {
  const accept =
    question.fileAccept ??
    question.options?.fileAccept ??
    '';

  if (!accept || typeof accept !== 'string') {
    return true;
  }

  const acceptedTypes = accept
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  if (acceptedTypes.length === 0) {
    return true;
  }

  const filename = file.originalname.toLowerCase();

  return acceptedTypes.some(type => {
    if (type.startsWith('.')) {
      return filename.endsWith(type);
    }

    if (type.endsWith('/*')) {
      return file.mimetype.startsWith(type.slice(0, -1));
    }

    return file.mimetype.toLowerCase() === type;
  });
};

const getFileExtension = (file) => {
  return FILE_TYPES[file.mimetype] || null;
};

// ==========================================
// COMBINED SUBMISSION PDF HELPERS
// ==========================================

const convertOfficeDocumentToPdf = async (buffer, extension) => {
  const tempDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'shelterhelper-pdf-')
  );

  try {
    const inputPath = path.join(
      tempDirectory,
      `attachment.${extension}`
    );

    const outputPath = path.join(
      tempDirectory,
      'attachment.pdf'
    );

    await fs.writeFile(inputPath, buffer);

    await execFileAsync(
      'libreoffice',
      [
        '--headless',
        '--convert-to',
        'pdf',
        '--outdir',
        tempDirectory,
        inputPath
      ],
      {
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024
      }
    );

    return await fs.readFile(outputPath);

  } finally {
    await fs.rm(tempDirectory, {
      recursive: true,
      force: true
    });
  }
};


const appendPdfBuffer = async (targetPdf, buffer) => {
  const sourcePdf = await PDFDocument.load(buffer);

  const pages = await targetPdf.copyPages(
    sourcePdf,
    sourcePdf.getPageIndices()
  );

  pages.forEach(page => targetPdf.addPage(page));
};


const appendImageBuffer = async (targetPdf, buffer) => {
  // Normalize the image to PNG so WebP and other supported
  // image formats can be embedded consistently.
  const pngBuffer = await sharp(buffer)
    .rotate()
    .png()
    .toBuffer();

  const image = await targetPdf.embedPng(pngBuffer);

  const page = targetPdf.addPage([612, 792]);

  const margin = 36;
  const availableWidth = 612 - margin * 2;
  const availableHeight = 792 - margin * 2;

  const scale = Math.min(
    availableWidth / image.width,
    availableHeight / image.height
  );

  const width = image.width * scale;
  const height = image.height * scale;

  page.drawImage(image, {
    x: (612 - width) / 2,
    y: (792 - height) / 2,
    width,
    height
  });
};


const appendAttachmentToPdf = async (targetPdf, file) => {
  const { data, error } = await supabase.storage
    .from(FORM_UPLOADS_BUCKET)
    .download(file.storage_path);

  if (error || !data) {
    console.error(
      'Could not download submission attachment:',
      file.storage_path,
      error
    );

    throw new Error(
      `Could not retrieve uploaded document: ${file.original_name}`
    );
  }

  let buffer = Buffer.from(await data.arrayBuffer());

  const mimeType = file.mime_type?.toLowerCase();

  if (mimeType === 'application/pdf') {
    await appendPdfBuffer(targetPdf, buffer);
    return;
  }

  if (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/png' ||
    mimeType === 'image/webp'
  ) {
    await appendImageBuffer(targetPdf, buffer);
    return;
  }

  if (
    mimeType === 'application/msword' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const extension = FILE_TYPES[mimeType];

    buffer = await convertOfficeDocumentToPdf(
      buffer,
      extension
    );

    await appendPdfBuffer(targetPdf, buffer);
    return;
  }

  throw new Error(
    `Unsupported attachment format: ${file.original_name}`
  );
};


const getQuestionOrder = (definition) => {
  const order = new Map();
  let index = 0;

  const sections = Array.isArray(definition?.sections)
    ? definition.sections
    : [];

  for (const section of sections) {
    const questions = Array.isArray(section.questions)
      ? section.questions
      : [];

    for (const question of questions) {
      if (question?.id) {
        order.set(String(question.id), index++);
      }
    }
  }

  return order;
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


const validateSubmission = (
  definition,
  responses,
  uploadedFilesByQuestion = {}
) => {
  if (!Array.isArray(definition.sections)) {
    return 'The form definition is invalid.';
  }

  if (!isPlainObject(responses)) {
    return 'Form responses must be provided as an object.';
  }

  const visibleQuestionIds = new Set();
  const visibleResponses = {};

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

      const isSpecialBlock =
        question.type === 'owner_information' ||
        question.type === 'animal_information';

      const answerRequired =
        question.required || isSpecialBlock;

      // --------------------------------------
      // SIGNATURE QUESTIONS
      // --------------------------------------

      if (question.type === 'signature') {
        const uploadedFiles =
          uploadedFilesByQuestion[question.id] || [];

        if (answerRequired) {
          if (!isPlainObject(answer)) {
            return `Please provide a signature for "${question.label || question.id}".`;
          }

          if (answer.method === 'typed') {
            if (
              typeof answer.value !== 'string' ||
              !answer.value.trim()
            ) {
              return `Please provide a valid signature for "${question.label || question.id}".`;
            }
          } else if (answer.method === 'drawn') {
            if (uploadedFiles.length === 0) {
              return `Please provide a drawn signature for "${question.label || question.id}".`;
            }
          } else {
            return `The signature provided for "${question.label || question.id}" is invalid.`;
          }
        } else if (!isEmptyAnswer(answer)) {
          if (
            !isPlainObject(answer) ||
            !['typed', 'drawn'].includes(answer.method)
          ) {
            return `The signature provided for "${question.label || question.id}" is invalid.`;
          }

          if (
            answer.method === 'typed' &&
            (
              typeof answer.value !== 'string' ||
              !answer.value.trim()
            )
          ) {
            return `The signature provided for "${question.label || question.id}" is invalid.`;
          }

          if (
            answer.method === 'drawn' &&
            uploadedFiles.length === 0
          ) {
            return `The signature provided for "${question.label || question.id}" is invalid.`;
          }
        }

        if (uploadedFiles.length > 1) {
          return `Only one signature file may be uploaded for "${question.label || question.id}".`;
        }

        for (const file of uploadedFiles) {
          if (!getFileExtension(file)) {
            return `The signature file for "${question.label || question.id}" has an unsupported format.`;
          }

          if (!fileMatchesAccept(file, question)) {
            return `The signature file for "${question.label || question.id}" has an unsupported file type.`;
          }
        }

        if (!isEmptyAnswer(answer)) {
          visibleResponses[question.id] = answer;
        }

        continue;
      }

      // --------------------------------------
      // FILE UPLOAD QUESTIONS
      // --------------------------------------

      if (question.type === 'file_upload') {
        const uploadedFiles =
          uploadedFilesByQuestion[question.id] || [];

        if (answerRequired && uploadedFiles.length === 0) {
          return `Please upload the required document: ${question.label || question.id}`;
        }

        const allowMultiple =
          question.allowMultipleFiles === true ||
          question.options?.allowMultipleFiles === true;

        if (!allowMultiple && uploadedFiles.length > 1) {
          return `Only one file may be uploaded for "${question.label || question.id}".`;
        }

        for (const file of uploadedFiles) {
          if (!getFileExtension(file)) {
            return `The file uploaded for "${question.label || question.id}" has an unsupported format.`;
          }

          if (!fileMatchesAccept(file, question)) {
            return `The file uploaded for "${question.label || question.id}" has an unsupported file type.`;
          }
        }

        continue;
      }

      // --------------------------------------
      // NORMAL QUESTIONS
      // --------------------------------------

      if (answerRequired && isEmptyAnswer(answer)) {
        return `Please complete the required section: ${question.label || question.id}`;
      }

      if (!isEmptyAnswer(answer)) {
        if (!validateAnswer(question, answer)) {
          return `The answer provided for "${question.label || question.id}" is invalid.`;
        }

        visibleResponses[question.id] = answer;
      }
    }
  }

  // Reject answers to hidden or nonexistent questions.
  for (const questionId of Object.keys(responses)) {
    if (!visibleQuestionIds.has(questionId)) {
      return 'Your submission contains an answer to an unavailable question. Please refresh the form and try again.';
    }
  }

  // Reject files attached to hidden or nonexistent questions.
  for (const questionId of Object.keys(uploadedFilesByQuestion)) {
    if (!visibleQuestionIds.has(questionId)) {
      return 'Your submission contains a file for an unavailable question. Please refresh the form and try again.';
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

  let submissionId = null;
  const uploadedStoragePaths = [];

  try {
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

    const files = Array.isArray(req.files) ? req.files : [];

    // Every uploaded file must use the expected field naming convention.
    if (files.some(file => !file.fieldname.startsWith('file_'))) {
      return res.status(400).json({
        message: 'An uploaded file has an invalid question reference.'
      });
    }

    const uploadedFilesByQuestion =
      getUploadedFilesByQuestion(files);

    const formResult = await pool.query(
      `SELECT id, definition
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

    if (
      !isPlainObject(form.definition) ||
      !Array.isArray(form.definition.sections)
    ) {
      return res.status(409).json({
        message: 'This form has not been configured yet.'
      });
    }

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

    // Create the submission first so its ID can be used
    // to organize its documents in Supabase Storage.
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
        JSON.stringify(responses)
      ]
    );

    const submission = result.rows[0];
    submissionId = submission.id;

    // Upload each document and save its metadata.
    for (const [questionId, questionFiles] of Object.entries(
      uploadedFilesByQuestion
    )) {
      for (const file of questionFiles) {
        const extension = getFileExtension(file);

        const filename = `${crypto.randomUUID()}.${extension}`;

        const storagePath =
          `submissions/${submissionId}/${questionId}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from(FORM_UPLOADS_BUCKET)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (uploadError) {
          console.error('Supabase form document upload error:', uploadError);
          throw new Error('A document could not be uploaded.');
        }

        uploadedStoragePaths.push(storagePath);

        await pool.query(
          `INSERT INTO form_submission_files (
             submission_id,
             question_id,
             storage_path,
             original_name,
             mime_type,
             size_bytes
           )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            submissionId,
            questionId,
            storagePath,
            file.originalname,
            file.mimetype,
            file.size
          ]
        );
      }
    }

    return res.status(201).json({
      message: 'Form submitted successfully.',
      submission
    });

  } catch (error) {
    console.error('Error submitting form:', error);

    // Remove any files that were uploaded before the failure.
    if (uploadedStoragePaths.length > 0) {
      const { error: cleanupError } = await supabase.storage
        .from(FORM_UPLOADS_BUCKET)
        .remove(uploadedStoragePaths);

      if (cleanupError) {
        console.error(
          'Could not clean up uploaded form documents:',
          cleanupError
        );
      }
    }

    // Remove the incomplete submission and its metadata.
    if (submissionId !== null) {
      try {
        await pool.query(
          `DELETE FROM form_submissions WHERE id = $1`,
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
         fs.responses,
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
      message: 'Invalid submission ID.'
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
       ORDER BY uploaded_at ASC`,
      [id]
    );

    const files = [];

    for (const file of filesResult.rows) {
      const { data, error } = await supabase.storage
        .from(FORM_UPLOADS_BUCKET)
        .createSignedUrl(file.storage_path, 60 * 60);

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
      message: 'Invalid submission ID.',
    });
  }

  let client;

  try {
    // Confirm the submission exists and retrieve its uploaded files.
    const submissionResult = await pool.query(
      `SELECT id
       FROM form_submissions
       WHERE id = $1`,
      [id]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Submission not found.',
      });
    }

    const filesResult = await pool.query(
      `SELECT storage_path
       FROM form_submission_files
       WHERE submission_id = $1`,
      [id]
    );

    const storagePaths = filesResult.rows
      .map(file => file.storage_path)
      .filter(Boolean);

    // Remove the actual uploaded files from Supabase Storage.
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(FORM_UPLOADS_BUCKET)
        .remove(storagePaths);

      if (storageError) {
        console.error(
          'Could not delete submission documents from Supabase:',
          storageError
        );

        return res.status(500).json({
          message: 'The uploaded documents could not be deleted. The application was not deleted.',
        });
      }
    }

    // Delete the database records in a transaction.
    client = await pool.connect();

    await client.query('BEGIN');

    await client.query(
      `DELETE FROM form_submission_notes
       WHERE submission_id = $1`,
      [id]
    );

    await client.query(
      `DELETE FROM form_submission_files
       WHERE submission_id = $1`,
      [id]
    );

    const deleteResult = await client.query(
      `DELETE FROM form_submissions
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'Submission not found.',
      });
    }

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Application and associated documents deleted successfully.',
      id: deleteResult.rows[0].id,
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

// ==========================================
// GENERATE COMBINED SUBMISSION PDF
// POST /api/forms/submissions/:id/combined-pdf
//
// Receives:
// reviewPdf: PDF generated by the frontend
//
// Returns:
// One PDF containing the review followed by
// all uploaded submission documents.
// ==========================================


exports.generateCombinedSubmissionPdf = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      message: 'Invalid submission ID.'
    });
  }

  if (!req.file || !req.file.buffer) {
    return res.status(400).json({
      message: 'The submission review PDF is required.'
    });
  }

  try {
    // Validate the incoming review PDF.
    let combinedPdf;

    try {
      combinedPdf = await PDFDocument.load(req.file.buffer);
    } catch {
      return res.status(400).json({
        message: 'The submitted review document is not a valid PDF.'
      });
    }

    // Retrieve the submission and its saved form snapshot.
    const submissionResult = await pool.query(
      `SELECT
         fs.id,
         fs.form_snapshot,
         f.name AS form_name
       FROM form_submissions fs
       JOIN forms f ON f.id = fs.form_id
       WHERE fs.id = $1`,
      [id]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Submission not found.'
      });
    }

    const submission = submissionResult.rows[0];

    // Identify signature questions from the saved form definition.
    const signatureQuestionIds = new Set();

    const sections = submission.form_snapshot?.sections ?? [];

    for (const section of sections) {
      for (const question of section.questions ?? []) {
        if (question.type === 'signature') {
          signatureQuestionIds.add(String(question.id));
        }
      }
    }

    // Retrieve all uploaded document metadata.
    const filesResult = await pool.query(
      `SELECT
         id,
         question_id,
         storage_path,
         original_name,
         mime_type,
         uploaded_at
       FROM form_submission_files
       WHERE submission_id = $1
       ORDER BY uploaded_at ASC, id ASC`,
      [id]
    );

    // Exclude signature images from the appended documents.
    const documentFiles = filesResult.rows.filter(
      file => !signatureQuestionIds.has(String(file.question_id))
    );

    // Determine the original question order from the
    // form definition saved when the application was submitted.
    const questionOrder = getQuestionOrder(
      submission.form_snapshot
    );

    // Sort attachments by question order, then upload order.
    documentFiles.sort((a, b) => {
      const orderA =
        questionOrder.get(String(a.question_id)) ??
        Number.MAX_SAFE_INTEGER;

      const orderB =
        questionOrder.get(String(b.question_id)) ??
        Number.MAX_SAFE_INTEGER;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      const dateA = new Date(a.uploaded_at).getTime();
      const dateB = new Date(b.uploaded_at).getTime();

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      return Number(a.id) - Number(b.id);
    });

    // Append each uploaded document after the review.
    // Signature images are intentionally excluded.
    for (const file of documentFiles) {
      await appendAttachmentToPdf(combinedPdf, file);
    }

    // Generate the final PDF.
    const pdfBytes = await combinedPdf.save();

    const filename = `submission-${id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    res.setHeader(
      'Content-Length',
      pdfBytes.length
    );

    return res.status(200).send(Buffer.from(pdfBytes));

  } catch (error) {
    return sendServerError(
      res,
      error,
      'Error generating combined submission PDF:'
    );
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

exports.getSubmissionNotes = async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(400).json({
      message: 'Invalid submission ID.',
    });
  }

  try {
    const submission = await pool.query(
      'SELECT id FROM form_submissions WHERE id = $1',
      [id]
    );

    if (submission.rows.length === 0) {
      return res.status(404).json({
        message: 'Submission not found.',
      });
    }

    const result = await pool.query(
      `SELECT
        n.id,
        n.submission_id,
        n.note,
        n.created_by,
        n.created_at,
        n.updated_by,
        n.updated_at,
        creator.name AS created_by_name,
        editor.name AS updated_by_name
      FROM form_submission_notes n
      LEFT JOIN users creator ON creator.id = n.created_by
      LEFT JOIN users editor ON editor.id = n.updated_by
      WHERE n.submission_id = $1
      ORDER BY n.created_at ASC, n.id ASC`,
      [id]
    );

    return res.status(200).json({
      notes: result.rows,
    });
  } catch (error) {
    return sendServerError(res, error, 'Error retrieving submission notes:');
  }
};

exports.addSubmissionNote = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body || {};

  if (!isValidId(id)) {
    return res.status(400).json({
      message: 'Invalid submission ID.',
    });
  }

  if (typeof note !== 'string' || !note.trim()) {
    return res.status(400).json({
      message: 'A note is required.',
    });
  }

  try {
    const submission = await pool.query(
      'SELECT id FROM form_submissions WHERE id = $1',
      [id]
    );

    if (submission.rows.length === 0) {
      return res.status(404).json({
        message: 'Submission not found.',
      });
    }

    const result = await pool.query(
      `WITH inserted AS (
        INSERT INTO form_submission_notes (
          submission_id,
          note,
          created_by
        )
        VALUES ($1, $2, $3)
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
        id,
        note.trim(),
        req.user?.id || null,
      ]
    );

    return res.status(201).json({
      message: 'Note added successfully.',
      note: result.rows[0],
    });
  } catch (error) {
    return sendServerError(res, error, 'Error adding submission note:');
  }
};

exports.updateSubmissionNote = async (req, res) => {
  const { id, noteId } = req.params;
  const { note } = req.body || {};

  if (!isValidId(id) || !isValidId(noteId)) {
    return res.status(400).json({
      message: 'Invalid submission or note ID.',
    });
  }

  if (typeof note !== 'string' || !note.trim()) {
    return res.status(400).json({
      message: 'A note is required.',
    });
  }

  try {
    const result = await pool.query(
      `WITH updated AS (
        UPDATE form_submission_notes
        SET
          note = $1,
          updated_by = $2,
          updated_at = NOW()
        WHERE id = $3
          AND submission_id = $4
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
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Note not found.',
      });
    }

    return res.status(200).json({
      message: 'Note updated successfully.',
      note: result.rows[0],
    });
  } catch (error) {
    return sendServerError(res, error, 'Error updating submission note:');
  }
};

exports.deleteSubmissionNote = async (req, res) => {
  const { id, noteId } = req.params;

  if (!isValidId(id) || !isValidId(noteId)) {
    return res.status(400).json({
      message: 'Invalid submission or note ID.',
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM form_submission_notes
       WHERE id = $1
         AND submission_id = $2
       RETURNING id`,
      [noteId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Note not found.',
      });
    }

    return res.status(200).json({
      message: 'Note deleted successfully.',
    });
  } catch (error) {
    return sendServerError(res, error, 'Error deleting submission note:');
  }
};