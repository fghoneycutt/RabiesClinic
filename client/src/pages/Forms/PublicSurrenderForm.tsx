
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';

import { api } from '../../api/api';

// Adjust these two paths if your component folders differ.
import OwnerForm from '../../components/owner/OwnerForm';
import AnimalForm from '../../components/animals/AnimalForm';

import type {
  OwnerDraft,
  AnimalDraft
} from '../../types/intake';

type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'radio'
  | 'checkbox'
  | 'dropdown'
  | 'yes_no'
  | 'date'
  | 'content'
  | 'owner_information'
  | 'animal_information';

interface Condition {
  questionId: string;
  operator: 'equals' | 'not_equals';
  values?: string[];
  value?: string;
}

interface Question {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  staffOnly?: boolean;
  options?: string[];
  condition?: Condition;
  animalCountSource?: 'fixed' | 'question';
  animalCountQuestionId?: string;
}

interface Section {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  condition?: Condition;
}

interface FormDefinition {
  schemaVersion: number;
  sections: Section[];
}

interface PublicForm {
  form_id: string;
  name: string;
  slug: string;
  description?: string;
  definition: FormDefinition;
}

type Responses = Record<string, any>;

const emptyOwner: OwnerDraft = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  secondary_address: '',
  city: '',
  county: '',
  state: '',
  zip_code: ''
};

const createEmptyAnimal = (): AnimalDraft => ({
  name: '',
  species: '',
  sex: '',
  altered_status: null,
  primary_breed: '',
  secondary_breed: '',
  age_years: null,
  age_months: null,
  approximate_weight: null,
  primary_color: '',
  secondary_color: '',
  pattern: '',
  rabies_tag_number: null,
  microchip_number: null,
  microchip_issuer: null
});

const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const normalizeValues = (condition: Condition): string[] => {
  if (Array.isArray(condition.values)) {
    return condition.values.map(String);
  }

  if (condition.value !== undefined) {
    return [String(condition.value)];
  }

  return [];
};

const conditionMatches = (
  condition: Condition | undefined,
  responses: Responses
): boolean => {
  if (!condition) return true;

  const answer = responses[condition.questionId];

  // An unanswered source question never activates a condition,
  // including not_equals.
  if (isEmpty(answer)) return false;

  const values = normalizeValues(condition).map(value =>
    value.trim().toLowerCase()
  );

  if (values.length === 0) return false;

  const answerValues = Array.isArray(answer)
    ? answer.map((value: any) => String(value).trim().toLowerCase())
    : [String(answer).trim().toLowerCase()];

  const hasMatch = answerValues.some((answerValue: string) =>
    values.includes(answerValue)
  );

  return condition.operator === 'not_equals'
    ? !hasMatch
    : hasMatch;
};

const getVisibleSections = (
  sections: Section[],
  responses: Responses
): Section[] => {
  return sections.filter(section =>
    conditionMatches(section.condition, responses)
  );
};

const getVisibleQuestions = (
  section: Section,
  responses: Responses
): Question[] => {
  return (section.questions || []).filter(question => {
    if (question.staffOnly) return false;

    return conditionMatches(question.condition, responses);
  });
};

const replaceAnimalPlaceholder = (
  text: string,
  species: string
): string => {
  const animalWord =
    species === 'dog'
      ? 'dog'
      : species === 'cat'
      ? 'cat'
      : 'animal';

  return text
    .replace(/\[ANIMAL\]/gi, animalWord)
    .replace(/\{\{animal\}\}/gi, animalWord)
    .replace(/\{animal\}/gi, animalWord);
};

const validateOwner = (owner: OwnerDraft): string[] => {
  const errors: string[] = [];

  if (!owner.first_name.trim()) errors.push('Owner first name is required.');
  if (!owner.last_name.trim()) errors.push('Owner last name is required.');

  const email = owner.email.trim();
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.push('A valid email address is required.');
  }

  const phoneDigits = owner.phone.replace(/\D/g, '');
  if (phoneDigits.length !== 10) {
    errors.push('A valid 10-digit phone number is required.');
  }

  if (!owner.address.trim()) errors.push('Street address is required.');
  if (!owner.city.trim()) errors.push('City is required.');
  if (!owner.county.trim()) errors.push('County is required.');
  if (!owner.state.trim()) errors.push('State or province is required.');

  if (!/^\d{5}$/.test(owner.zip_code)) {
    errors.push('A valid 5-digit ZIP code is required.');
  }

  return errors;
};

const validateAnimal = (
  animal: AnimalDraft,
  index: number
): string[] => {
  const errors: string[] = [];
  const prefix = `Animal ${index + 1}`;

  if (!animal.name.trim()) {
    errors.push(`${prefix}: Name is required.`);
  }

  if (!animal.species) {
    errors.push(`${prefix}: Species is required.`);
  }

  if (!animal.sex) {
    errors.push(`${prefix}: Sex is required.`);
  }

  if (!animal.primary_breed) {
    errors.push(`${prefix}: Primary breed is required.`);
  }

  if (!animal.primary_color) {
    errors.push(`${prefix}: Primary color is required.`);
  }

  if (
    animal.age_years === null &&
    animal.age_months === null
  ) {
    errors.push(`${prefix}: Approximate age is required.`);
  }

  if (
    animal.microchip_number?.trim() &&
    !animal.microchip_issuer?.trim()
  ) {
    errors.push(`${prefix}: Microchip issuer is required when a microchip number is provided.`);
  }

  return errors;
};

export default function PublicSurrenderForm() {
  const { slug } = useParams<{ slug: string }>();

  const [form, setForm] = useState<PublicForm | null>(null);
  const [responses, setResponses] = useState<Responses>({});
  const [owner, setOwner] = useState<OwnerDraft>({ ...emptyOwner });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  document.title = 'Animal Surrender Application'

  useEffect(() => {
    const loadForm = async () => {
      if (!slug) {
        setLoadError('A form link was not provided.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError('');

        const response = await api.get(`/forms/public/${slug}`);

        setForm(response.data);

      } catch (error: any) {
        console.error('Unable to load public surrender form:', error);

        setLoadError(
          error.response?.data?.message ||
          'This surrender form could not be found or is not currently available.'
        );

      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [slug]);

  const sections = form?.definition?.sections || [];

  const visibleSections = useMemo(
    () => getVisibleSections(sections, responses),
    [sections, responses]
  );

  const visibleQuestionIds = useMemo(() => {
    const ids = new Set<string>();

    visibleSections.forEach(section => {
      getVisibleQuestions(section, responses).forEach(question => {
        ids.add(question.id);
      });
    });

    return ids;
  }, [visibleSections, responses]);

  // Remove answers belonging to questions that have become hidden.
  // The backend rejects answers to hidden or nonexistent questions.
  useEffect(() => {
    setResponses(previous => {
      let changed = false;
      const next = { ...previous };

      Object.keys(next).forEach(questionId => {
        if (!visibleQuestionIds.has(questionId)) {
          delete next[questionId];
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  }, [visibleQuestionIds]);

  const updateResponse = useCallback(
    (questionId: string, value: any) => {
      setResponses(previous => ({
        ...previous,
        [questionId]: value
      }));

      setSubmitError('');
      setValidationErrors([]);
    },
    []
  );

  const getAnimalCount = (question: Question): number => {
    if (question.animalCountSource !== 'question') {
      return 1;
    }

    const rawCount = responses[question.animalCountQuestionId || ''];

    if (isEmpty(rawCount)) return 0;

    const count = Number(rawCount);

    if (!Number.isFinite(count)) return 0;

    return Math.max(0, Math.min(20, Math.floor(count)));
  };

  const updateAnimal = (
    questionId: string,
    index: number,
    field: keyof AnimalDraft,
    value: any
  ) => {
    setResponses(previous => {
      const currentAnimals: AnimalDraft[] =
        Array.isArray(previous[questionId])
          ? [...previous[questionId]]
          : [];

      while (currentAnimals.length <= index) {
        currentAnimals.push(createEmptyAnimal());
      }

      currentAnimals[index] = {
        ...currentAnimals[index],
        [field]: value
      };

      return {
        ...previous,
        [questionId]: currentAnimals
      };
    });

    setSubmitError('');
    setValidationErrors([]);
  };

  const resizeAnimals = (
    questionId: string,
    count: number
  ) => {
    setResponses(previous => {
      const current: AnimalDraft[] =
        Array.isArray(previous[questionId])
          ? [...previous[questionId]]
          : [];

      const next = current.slice(0, count);

      while (next.length < count) {
        next.push(createEmptyAnimal());
      }

      return {
        ...previous,
        [questionId]: next
      };
    });
  };

  
    const removeAnimal = (question: Question, index: number) => {
    if (question.animalCountSource !== 'question') return;

    const countQuestionId = question.animalCountQuestionId;
    if (!countQuestionId) return;

    setResponses(previous => {
        const current: AnimalDraft[] = Array.isArray(previous[question.id])
        ? [...previous[question.id]]
        : [];

        current.splice(index, 1);

        const currentCount = Number(previous[countQuestionId] || 0);

        return {
        ...previous,
        [question.id]: current,
        [countQuestionId]: Math.max(0, currentCount - 1)
        };
    });
    };


  const renderQuestion = (question: Question) => {
    const value = responses[question.id];
    const label = replaceAnimalPlaceholder(
      question.label || '',
      getSelectedSpecies()
    );

    switch (question.type) {
      case 'content':
        return (
          <div className="mb-3">
            <div className="text-body" style={{ whiteSpace: 'pre-wrap' }}>
              {label}
            </div>
          </div>
        );

      case 'short_text':
        return (
          <Form.Group className="mb-3">
            <Form.Label>
              {label}
              {question.required && <span className="text-danger"> *</span>}
            </Form.Label>

            <Form.Control
              type="text"
              value={value ?? ''}
              required={question.required}
              onChange={e => updateResponse(question.id, e.target.value)}
            />
          </Form.Group>
        );

      case 'long_text':
        return (
          <Form.Group className="mb-3">
            <Form.Label>
              {label}
              {question.required && <span className="text-danger"> *</span>}
            </Form.Label>

            <Form.Control
              as="textarea"
              rows={4}
              value={value ?? ''}
              required={question.required}
              onChange={e => updateResponse(question.id, e.target.value)}
            />
          </Form.Group>
        );

      case 'number':
        return (
          <Form.Group className="mb-3">
            <Form.Label>
              {label}
              {question.required && <span className="text-danger"> *</span>}
            </Form.Label>

            <Form.Control
              type="number"
              min="0"
              step="1"
              value={value ?? ''}
              required={question.required}
              onChange={e => {
                const raw = e.target.value;
                updateResponse(
                  question.id,
                  raw === '' ? '' : Number(raw)
                );
              }}
            />
          </Form.Group>
        );

      case 'date':
        return (
          <Form.Group className="mb-3">
            <Form.Label>
              {label}
              {question.required && <span className="text-danger"> *</span>}
            </Form.Label>

            <Form.Control
              type="date"
              value={value ?? ''}
              required={question.required}
              onChange={e => updateResponse(question.id, e.target.value)}
            />
          </Form.Group>
        );

      case 'radio':
      case 'yes_no': {
        const options =
          question.type === 'yes_no'
            ? ['Yes', 'No']
            : question.options || [];

        return (
          <Form.Group className="mb-3">
            <Form.Label className="d-block">
              {label}
              {question.required && <span className="text-danger"> *</span>}
            </Form.Label>

            {options.map(option => (
              <Form.Check
                key={option}
                type="radio"
                name={question.id}
                id={`${question.id}-${option}`}
                label={option}
                value={option}
                checked={value === option}
                onChange={() => updateResponse(question.id, option)}
                className="mb-2"
              />
            ))}
          </Form.Group>
        );
      }

      case 'checkbox':
        return (
          <Form.Group className="mb-3">
            <Form.Label className="d-block">
              {label}
              {question.required && <span className="text-danger"> *</span>}
            </Form.Label>

            {(question.options || []).map(option => {
              const selected: string[] = Array.isArray(value) ? value : [];

              return (
                <Form.Check
                  key={option}
                  type="checkbox"
                  id={`${question.id}-${option}`}
                  label={option}
                  checked={selected.includes(option)}
                  onChange={e => {
                    const next = e.target.checked
                      ? [...selected, option]
                      : selected.filter(item => item !== option);

                    updateResponse(question.id, next);
                  }}
                  className="mb-2"
                />
              );
            })}
          </Form.Group>
        );

      case 'dropdown':
        return (
          <Form.Group className="mb-3">
            <Form.Label>
              {label}
              {question.required && <span className="text-danger"> *</span>}
            </Form.Label>

            <Form.Select
              value={value ?? ''}
              required={question.required}
              onChange={e => updateResponse(question.id, e.target.value)}
            >
              <option value="">Select an answer...</option>

              {(question.options || []).map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        );

      case 'owner_information':
        return (
          <div className="mb-3">
            <OwnerForm
              owner={owner}
              setOwner={setOwner}
            />
          </div>
        );

      case 'animal_information': {
        const count = getAnimalCount(question);

        const animals: AnimalDraft[] =
          Array.isArray(value) ? value : [];

        // Keep the response array aligned with the selected count.
        if (animals.length !== count) {
          // Resizing is performed after render to avoid changing state here.
          // The effect below handles this synchronization.
        }

        return (
          <div className="mb-3">
            {question.animalCountSource === 'question' && (
              <p className="text-muted">
                Please provide information for each animal.
              </p>
            )}

            {count === 0 && (
              <Alert variant="info">
                Enter the number of animals above to continue.
              </Alert>
            )}

            {Array.from({ length: count }).map((_, index) => {
              const animal = animals[index] || createEmptyAnimal();

              return (
                <AnimalForm
                  key={`${question.id}-${index}`}
                  mode="multi"
                  index={index}
                  animal={animal}
                  updateAnimal={(field, nextValue) =>
                    updateAnimal(question.id, index, field, nextValue)
                  }
                  removeAnimal={() => removeAnimal(question, index)}
                />
              );
            })}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const getSelectedSpecies = (): string => {
    for (const section of visibleSections) {
      for (const question of getVisibleQuestions(section, responses)) {
        if (question.type === 'animal_information') {
          const animals = responses[question.id];

          if (Array.isArray(animals) && animals[0]?.species) {
            return animals[0].species;
          }
        }
      }
    }

    return '';
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!form) return ['The form is not available.'];

    visibleSections.forEach(section => {
      getVisibleQuestions(section, responses).forEach(question => {
        if (question.type === 'content') return;

        if (question.type === 'owner_information') {
          errors.push(...validateOwner(owner));
          return;
        }

        if (question.type === 'animal_information') {
          const count = getAnimalCount(question);
          const animals: AnimalDraft[] = Array.isArray(responses[question.id])
            ? responses[question.id]
            : [];

          if (count < 1) {
            errors.push('Please enter a valid number of animals.');
            return;
          }

          if (animals.length < count) {
            errors.push('Please complete the information for each animal.');
            return;
          }

          animals.slice(0, count).forEach((animal, index) => {
            errors.push(...validateAnimal(animal, index));
          });

          return;
        }

        const answer = responses[question.id];

        if (question.required && isEmpty(answer)) {
          errors.push(`"${question.label}" is required.`);
          return;
        }

        if (question.type === 'number' && !isEmpty(answer)) {
          const number = Number(answer);

          if (!Number.isFinite(number) || number < 0) {
            errors.push(`"${question.label}" must be a valid non-negative number.`);
          }
        }

        if (
          question.type === 'radio' ||
          question.type === 'dropdown'
        ) {
          if (
            !isEmpty(answer) &&
            !(question.options || []).includes(answer)
          ) {
            errors.push(`"${question.label}" contains an invalid answer.`);
          }
        }

        if (question.type === 'checkbox' && !isEmpty(answer)) {
          const selected = Array.isArray(answer) ? answer : [];

          if (
            selected.some(
              (item: string) => !(question.options || []).includes(item)
            )
          ) {
            errors.push(`"${question.label}" contains an invalid answer.`);
          }
        }

        if (
          question.type === 'yes_no' &&
          !isEmpty(answer) &&
          !['Yes', 'No'].includes(answer)
        ) {
          errors.push(`"${question.label}" must be answered Yes or No.`);
        }
      });
    });

    return errors;
  };

  const handleSubmit = async () => {
    if (!form || submitting) return;

    setSubmitError('');
    setValidationErrors([]);

    const errors = validateForm();

    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Do not send staff-only, hidden, or unknown question answers.
    const publicResponses: Responses = {};

    visibleSections.forEach(section => {
      getVisibleQuestions(section, responses).forEach(question => {
        if (question.type === 'content') return;

        if (question.type === 'owner_information') {
          publicResponses[question.id] = owner;
          return;
        }

        if (question.type === 'animal_information') {
          const count = getAnimalCount(question);

          publicResponses[question.id] = (
            responses[question.id] || []
          ).slice(0, count);

          return;
        }

        if (Object.prototype.hasOwnProperty.call(responses, question.id)) {
          publicResponses[question.id] = responses[question.id];
        }
      });
    });

    const firstAnimal = Object.values(publicResponses).find(
      value => Array.isArray(value) && value.length > 0 &&
        value[0] && typeof value[0] === 'object' &&
        'species' in value[0]
    ) as AnimalDraft[] | undefined;

    const surrenderTypeQuestion = visibleSections
      .flatMap(section => getVisibleQuestions(section, responses))
      .find(question =>
        /surrender.*(type|situation)|best option.*describe/i.test(question.label)
      );

    const payload: Responses & {
      species?: string;
      surrender_type?: string;
    } = {
      responses: publicResponses
    };

    if (firstAnimal?.[0]?.species) {
      payload.species = firstAnimal[0].species;
    }

    if (
      surrenderTypeQuestion &&
      typeof responses[surrenderTypeQuestion.id] === 'string'
    ) {
      payload.surrender_type = responses[surrenderTypeQuestion.id];
    }

    try {
      setSubmitting(true);

      const response = await api.post(
        `/forms/public/${slug}/submit`,
        payload
      );

      setSubmissionId(
        response.data?.id || response.data?.submission_id || null
      );

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error: any) {
      console.error('Unable to submit surrender form:', error);

      setSubmitError(
        error.response?.data?.message ||
        'Your form could not be submitted. Please review your answers and try again.'
      );

    } finally {
      setSubmitting(false);
    }
  };

  // Synchronize the number of animal drafts with the selected count.
  useEffect(() => {
    if (!form) return;

    visibleSections.forEach(section => {
      getVisibleQuestions(section, responses).forEach(question => {
        if (question.type !== 'animal_information') return;

        const count = getAnimalCount(question);

        if (question.animalCountSource === 'question' && count === 0) {
          return;
        }

        const current: AnimalDraft[] = Array.isArray(responses[question.id])
          ? responses[question.id]
          : [];

        if (current.length !== count) {
          resizeAnimals(question.id, count);
        }
      });
    });
  }, [form, visibleSections, responses]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" />
        <p className="mt-3">Loading surrender form...</p>
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <Alert variant="danger" className="my-4">
        {loadError || 'This form is unavailable.'}
      </Alert>
    );
  }

  if (submitted) {
    return (
      <Card className="my-4">
        <Card.Body className="text-center py-5">
          <h2 className="text-success mb-3">
            Submission Received
          </h2>

          <p className="mb-2">
            Thank you. Your surrender form has been successfully submitted.
          </p>

          <p className="text-muted">
            A member of our staff will review your submission.
          </p>

          {submissionId && (
            <p className="small text-muted mb-0">
              Submission reference: {submissionId}
            </p>
          )}
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="public-surrender-form">
      <Card className="mb-4">
        <Card.Body>
          <h1 className="mb-2">{form.name}</h1>

          {form.description && (
            <p className="text-muted mb-0">
              {form.description}
            </p>
          )}
        </Card.Body>
      </Card>

      {validationErrors.length > 0 && (
        <Alert variant="danger">
          <Alert.Heading>Please correct the following:</Alert.Heading>

          <ul className="mb-0">
            {validationErrors.map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {submitError && (
        <Alert variant="danger">
          {submitError}
        </Alert>
      )}

      {visibleSections.map(section => {
        const questions = getVisibleQuestions(section, responses);

        if (questions.length === 0) return null;

        return (
          <Card key={section.id} className="mb-4">
            <Card.Body>
              <h3 className="mb-2">{section.title}</h3>

              {section.description && (
                <p className="text-muted mb-4">
                  {replaceAnimalPlaceholder(
                    section.description,
                    getSelectedSpecies()
                  )}
                </p>
              )}

              {questions.map(question => (
                <div key={question.id} className="public-surrender-question">
                  {renderQuestion(question)}
                </div>
              ))}
            </Card.Body>
          </Card>
        );
      })}

      <div className="d-grid mb-5">
        <Button
          variant="primary"
          size="lg"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                className="me-2"
              />
              Submitting...
            </>
          ) : (
            'Submit Surrender Form'
          )}
        </Button>
      </div>
    </div>
  );
}
