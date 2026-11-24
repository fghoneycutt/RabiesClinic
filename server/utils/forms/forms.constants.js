
const FORM_MODULES = {
  surrender: 'surrender_forms',
  rescue: 'rescue_applications',
  foster: 'foster_forms',
  volunteer: 'volunteer_forms',
  adoption: 'adoption_forms',
  general: 'general_forms'
};

const ALLOWED_FORM_TYPES = Object.keys(FORM_MODULES);

const ALLOWED_SUBMISSION_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'denied',
  'withdrawn'
];

const FORM_UPLOADS_BUCKET = 'form-uploads';

const FILE_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const MAX_UPLOAD_FILES = 20;
const MAX_REVIEW_PDF_SIZE = 20 * 1024 * 1024;

module.exports = {
  FORM_MODULES,
  ALLOWED_FORM_TYPES,
  ALLOWED_SUBMISSION_STATUSES,
  FORM_UPLOADS_BUCKET,
  FILE_TYPES,
  MAX_UPLOAD_SIZE,
  MAX_UPLOAD_FILES,
  MAX_REVIEW_PDF_SIZE
};
