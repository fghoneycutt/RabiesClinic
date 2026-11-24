
const crypto = require('crypto');

const pool = require('../../db');

const {
  FORM_UPLOADS_BUCKET
} = require('../../utils/forms/forms.constants');

const {
  getFileExtension
} = require('../../utils/forms/forms.helpers');

const {
  createClient
} = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ==========================================
// UPLOAD SUBMISSION FILES
// ==========================================

const uploadSubmissionFiles = async ({
  organizationId,
  submissionId,
  uploadedFilesByQuestion,
  uploadedStoragePaths = []
}) => {
  for (const [questionId, questionFiles] of Object.entries(
    uploadedFilesByQuestion
  )) {
    for (const file of questionFiles) {
      const extension = getFileExtension(file);

      if (!extension) {
        throw new Error(
          `Unsupported uploaded file format: ${file.originalname}`
        );
      }

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
        console.error(
          'Supabase form document upload error:',
          uploadError
        );

        throw new Error(
          `A document could not be uploaded: ${file.originalname}`
        );
      }

      // Track the uploaded object immediately so the caller
      // can clean it up if a later operation fails.
      uploadedStoragePaths.push(storagePath);

      // Save uploaded document metadata.
      await pool.query(
        `INSERT INTO form_submission_files (
          organization_id,
          submission_id,
          question_id,
          storage_path,
          original_name,
          mime_type,
          size_bytes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          organizationId,
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

  return uploadedStoragePaths;
};

// ==========================================
// REMOVE STORED FILES
// ==========================================

const removeStorageFiles = async (storagePaths = []) => {
  const paths = storagePaths.filter(Boolean);

  if (paths.length === 0) {
    return {
      error: null
    };
  }

  return supabase.storage
    .from(FORM_UPLOADS_BUCKET)
    .remove(paths);
};

// ==========================================
// DOWNLOAD STORED FILE
// ==========================================

const downloadStoredFile = async (storagePath) => {
  return supabase.storage
    .from(FORM_UPLOADS_BUCKET)
    .download(storagePath);
};


const createSignedFileUrl = async (storagePath, expiresIn = 60 * 60) => {
  return supabase.storage
    .from(FORM_UPLOADS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
};


module.exports = {
  uploadSubmissionFiles,
  removeStorageFiles,
  downloadStoredFile,
  createSignedFileUrl
};
