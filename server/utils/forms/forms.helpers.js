
const {
  FILE_TYPES
} = require('./forms.constants');

// ==========================================
// GENERAL HELPERS
// ==========================================

const slugify = (value) => {
  return String(value || '')
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
    message: 'An unexpected server error occurred.'
  });
};

// ==========================================
// ANSWER HELPERS
// ==========================================

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
// FILE HELPERS
// ==========================================

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
// EXPORTS
// ==========================================

module.exports = {
  slugify,
  isValidId,
  isPlainObject,
  sendServerError,
  isEmptyAnswer,
  getOptionValue,
  getUploadedFilesByQuestion,
  fileMatchesAccept,
  getFileExtension
};
