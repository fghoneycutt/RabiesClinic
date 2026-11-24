const formsController = require('./forms.controller');
const publicFormsController = require('./publicForms.controller');
const submissionsController = require('./submissions.controller');
const submissionNotesController = require('./submissionNotes.controller');
const submissionPdfController = require('./submissionPdf.controller');

module.exports = {
  ...formsController,
  ...publicFormsController,
  ...submissionsController,
  ...submissionNotesController,
  ...submissionPdfController
};