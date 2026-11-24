
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

const {
  FILE_TYPES
} = require('../../utils/forms/forms.constants');

const {
  downloadStoredFile
} = require('./formFiles.service');

const execFileAsync = promisify(execFile);

// ==========================================
// OFFICE DOCUMENT CONVERSION
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

// ==========================================
// PDF PAGE APPENDING
// ==========================================

const appendPdfBuffer = async (targetPdf, buffer) => {
  const sourcePdf = await PDFDocument.load(buffer);

  const pages = await targetPdf.copyPages(
    sourcePdf,
    sourcePdf.getPageIndices()
  );

  pages.forEach(page => targetPdf.addPage(page));
};

// ==========================================
// IMAGE PAGE APPENDING
// ==========================================

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

// ==========================================
// ATTACHMENT APPENDING
// ==========================================

const appendAttachmentToPdf = async (targetPdf, file) => {
  const { data, error } = await downloadStoredFile(
    file.storage_path
  );

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

// ==========================================
// QUESTION ORDER
// ==========================================

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

module.exports = {
  convertOfficeDocumentToPdf,
  appendPdfBuffer,
  appendImageBuffer,
  appendAttachmentToPdf,
  getQuestionOrder
};