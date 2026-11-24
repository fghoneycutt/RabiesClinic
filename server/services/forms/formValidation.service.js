const {
  isPlainObject,
  isEmptyAnswer,
  getOptionValue,
  fileMatchesAccept,
  getFileExtension
} = require('../../utils/forms/forms.helpers');

// ==========================================
// PUBLIC FORM DEFINITION
// ==========================================

const getPublicDefinition = (definition) => {
  if (!isPlainObject(definition)) {
    return {
      schemaVersion: 1,
      sections: []
    };
  }

  const sections = Array.isArray(definition.sections)
    ? definition.sections
    : [];

  // Collect IDs of all questions applicants can see.
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

    // Public branching cannot depend on staff-only
    // or nonexistent questions.
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
              condition: cleanCondition(question.condition)
            };
          })
      };
    })
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

  // Support both current values arrays and older saved
  // conditions that use a single value.
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
    'zip_code'
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
      'rabies_tag_number'
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
// INDIVIDUAL ANSWER VALIDATION
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

module.exports = {
  getPublicDefinition,
  conditionsMatch,
  validateOwnerInformation,
  validateAnimalInformation,
  validateAnswer,
  validateSubmission
};