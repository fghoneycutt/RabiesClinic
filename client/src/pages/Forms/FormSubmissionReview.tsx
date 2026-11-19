
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Row,
  Spinner
} from 'react-bootstrap';

import { api } from '../../api/api';
import './SurrenderForms/SurrenderSubmissionReview.css';

type Condition = {
  questionId: string;
  operator?: 'equals' | 'not_equals';
  values?: string[];
  value?: string;
};

type Question = {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  staffOnly?: boolean;
  options?: any;
  condition?: Condition;
};

type Section = {
  id: string;
  title: string;
  description?: string;
  condition?: Condition;
  questions: Question[];
};

type FormDefinition = {
  schemaVersion?: number;
  sections: Section[];
};

type SubmissionFile = {
  id: number | string;
  question_id: string;
  original_name: string;
  mime_type?: string;
  size_bytes?: number;
  download_url?: string;
};

type Submission = {
  id: number | string;
  form_id: number;
  form_name?: string;
  form_slug?: string;
  species?: string | null;
  surrender_type?: string | null;
  status: string;
  submitted_at?: string;
  updated_at?: string;
  responses: Record<string, any>;
  files?: SubmissionFile[];
  form_definition?: FormDefinition;
};

const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined || value === '') return true;

  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isEmpty);
  }

  if (typeof value === 'object') {
    return Object.values(value).every(isEmpty);
  }

  return false;
};

const conditionsMatch = (
  condition: Condition | undefined,
  responses: Record<string, any>
): boolean => {
  if (!condition) return true;

  const answer = responses[condition.questionId];

  if (isEmpty(answer)) return false;

  const conditionValues = Array.isArray(condition.values)
    ? condition.values
    : condition.value !== undefined
      ? [condition.value]
      : [];

  if (conditionValues.length === 0) return false;

  const expected = conditionValues.map(value =>
    String(value).trim().toLowerCase()
  );

  const actual = (Array.isArray(answer) ? answer : [answer]).map(value =>
    String(value).trim().toLowerCase()
  );

  const matches = actual.some(value => expected.includes(value));

  return condition.operator === 'not_equals' ? !matches : matches;
};

const formatDate = (value?: string) => {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
};

const humanize = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());

const ownerFieldLabels: Record<string, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  address: 'Street Address',
  secondary_address: 'Address Line 2',
  city: 'City',
  county: 'County',
  state: 'State',
  zip_code: 'ZIP Code'
};

const animalFieldLabels: Record<string, string> = {
  name: 'Animal Name',
  species: 'Species',
  sex: 'Sex',
  altered_status: 'Spayed / Neutered',
  primary_breed: 'Primary Breed',
  secondary_breed: 'Secondary Breed',
  age_years: 'Age (Years)',
  age_months: 'Age (Months)',
  approximate_weight: 'Approximate Weight',
  primary_color: 'Primary Color',
  secondary_color: 'Secondary Color',
  pattern: 'Pattern / Markings',
  rabies_tag_number: 'Rabies Tag Number',
  microchip_number: 'Microchip Number',
  microchip_issuer: 'Microchip Issuer'
};

const formatScalar = (value: any): string => {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  if (Array.isArray(value)) {
    return value.map(formatScalar).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, nestedValue]) => !isEmpty(nestedValue))
      .map(([key, nestedValue]) => {
        return `${humanize(key)}: ${formatScalar(nestedValue)}`;
      })
      .join('\n');
  }

  return String(value);
};

const formatAnimalValue = (key: string, value: any): string => {
  if (key === 'altered_status') {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return 'Unknown';
  }

  if (key === 'species' || key === 'sex') {
    return String(value).replace(/\b\w/g, character =>
      character.toUpperCase()
    );
  }

  return formatScalar(value);
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'submitted':
      return 'primary';
    case 'under_review':
      return 'warning';
    case 'approved':
      return 'success';
    case 'denied':
      return 'danger';
    case 'withdrawn':
      return 'secondary';
    default:
      return 'secondary';
  }
};

const formatStatus = (status: string) =>
  humanize(status || 'Unknown');

function AnswerValue({
  question,
  value,
  files
}: {
  question: Question;
  value: any;
  files: SubmissionFile[];
}) {
  if (question.type === 'file_upload') {
    return (
      <div className="review-answer">
        {files.length === 0 ? (
          <span>No files uploaded.</span>
        ) : (
          <ul className="mb-0">
            {files.map(file => (
              <li key={file.id}>
                {file.download_url ? (
                  <a
                    href={file.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {file.original_name}
                  </a>
                ) : (
                  file.original_name
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (question.type === 'owner_information') {
    if (!value || typeof value !== 'object') return null;

    const fields = Object.entries(ownerFieldLabels)
      .filter(([key]) => !isEmpty(value[key]));

    return (
      <div className="review-special-block">
        <Row>
          {fields.map(([key, label]) => (
            <Col md={6} key={key} className="review-detail-field">
              <div className="review-field-label">{label}</div>
              <div className="review-field-value">
                {formatScalar(value[key])}
              </div>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  if (question.type === 'animal_information') {
    const animals = Array.isArray(value) ? value : [value];

    return (
      <div className="review-special-block">
        {animals.filter(animal => !isEmpty(animal)).map((animal, index) => (
          <div className="review-animal-block" key={animal.id ?? index}>
            {animals.length > 1 && (
              <h5 className="review-animal-heading">
                Animal {index + 1}
              </h5>
            )}

            <Row>
              {Object.entries(animalFieldLabels)
                .filter(([key]) => !isEmpty(animal?.[key]))
                .map(([key, label]) => (
                  <Col md={6} key={key} className="review-detail-field">
                    <div className="review-field-label">{label}</div>
                    <div className="review-field-value">
                      {formatAnimalValue(key, animal[key])}
                    </div>
                  </Col>
                ))}
            </Row>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="review-answer">
      {formatScalar(value)}
    </div>
  );
}

export default function FormSubmissionReview() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const isRescue = location.pathname.startsWith('/rescue-submissions/');

  const backPath = isRescue
    ? '/rescue-applications'
    : '/surrender-forms';

  const defaultTitle = isRescue
    ? 'Rescue Group Application'
    : 'Animal Surrender Application';

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get(`/forms/submissions/${id}`);
        setSubmission(response.data);
      } catch (err: any) {
        console.error('Failed to load form submission:', err);
        setError(
          err.response?.data?.message ||
          'Unable to load this submission.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadSubmission();
    }
  }, [id]);

  const visibleSections = useMemo(() => {
    if (!submission?.form_definition?.sections) return [];

    const responses = submission.responses ?? {};
    const files = submission.files ?? [];

    return submission.form_definition.sections
      .filter(section => conditionsMatch(section.condition, responses))
      .map(section => ({
        ...section,
        questions: (section.questions ?? []).filter(question => {
          if (question.staffOnly) return false;
          if (question.type === 'content') return false;
          if (!conditionsMatch(question.condition, responses)) return false;

          if (question.type === 'file_upload') {
            return files.some(file => file.question_id === question.id);
          }

          return !isEmpty(responses[question.id]);
        })
      }))
      .filter(section => section.questions.length > 0);
  }, [submission]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <div className="mt-3">Loading submission...</div>
      </Container>
    );
  }

  if (error || !submission) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          {error || 'Submission not found.'}
        </Alert>

        <Button
          variant="outline-secondary"
          onClick={() => navigate(backPath)}
        >
          Back to Submissions
        </Button>
      </Container>
    );
  }

  const submissionTitle = submission.form_name || defaultTitle;

  return (
    <Container className="py-4 surrender-review-page">
      <div className="review-toolbar">
        <Button
          variant="outline-secondary"
          onClick={() => navigate(backPath)}
        >
          &larr; Back to Submissions
        </Button>

        <Button variant="primary" onClick={handlePrint}>
          <i className="bi bi-file-earmark-pdf me-2" />
          Print / Save PDF
        </Button>
      </div>

      <div className="review-document">
        <div className="review-document-header">
          <div>
            <h1>{submissionTitle}</h1>
            <p className="review-document-subtitle">
              Submission #{submission.id}
            </p>
          </div>

          <Badge
            bg={getStatusVariant(submission.status)}
            className="review-status"
          >
            {formatStatus(submission.status)}
          </Badge>
        </div>

        <Card className="review-summary-card mb-4">
          <Card.Body>
            <Row>
              <Col
                md={isRescue ? 12 : 4}
                className="review-summary-item"
              >
                <div className="review-field-label">Date Submitted</div>
                <div className="review-field-value">
                  {formatDate(submission.submitted_at)}
                </div>
              </Col>

              {!isRescue && (
                <>
                  <Col md={4} className="review-summary-item">
                    <div className="review-field-label">Animal Species</div>
                    <div className="review-field-value">
                      {submission.species || 'Not provided'}
                    </div>
                  </Col>

                  <Col md={4} className="review-summary-item">
                    <div className="review-field-label">Surrender Type</div>
                    <div className="review-field-value">
                      {submission.surrender_type || 'Not provided'}
                    </div>
                  </Col>
                </>
              )}
            </Row>
          </Card.Body>
        </Card>

        {visibleSections.length === 0 ? (
          <Alert variant="info">
            No answered questions were found for this submission.
          </Alert>
        ) : (
          visibleSections.map((section, sectionIndex) => (
            <Card className="review-section-card mb-4" key={section.id}>
              <Card.Header>
                <span className="review-section-number">
                  Section {sectionIndex + 1}
                </span>

                <h2>{section.title}</h2>

                {section.description && <p>{section.description}</p>}
              </Card.Header>

              <Card.Body>
                {section.questions.map(question => (
                  <div className="review-question" key={question.id}>
                    <div className="review-question-label">
                      {question.label}
                    </div>

                    <AnswerValue
                      question={question}
                      value={submission.responses?.[question.id]}
                      files={(submission.files ?? []).filter(
                        file => file.question_id === question.id
                      )}
                    />
                  </div>
                ))}
              </Card.Body>
            </Card>
          ))
        )}

        <div className="review-document-footer">
          <div>{submissionTitle}</div>
          <div>Submission #{submission.id}</div>
        </div>
      </div>
    </Container>
  );
}
