
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
  Toast,
  ToastContainer
} from 'react-bootstrap';

import { api } from '../../api/api';
import './SurrenderForms/SurrenderSubmissionReview.css';
import html2pdf from 'html2pdf.js';

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

type SubmissionNote = {
  id: number;
  submission_id: number;
  note: string;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_by?: string | null;
  updated_by_name?: string | null;
  updated_at?: string | null;
};

const submissionStatuses = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'withdrawn', label: 'Withdrawn' }
];

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

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
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

function AnswerValue({
  question,
  value,
  files
}: {
  question: Question;
  value: any;
  files: SubmissionFile[];
}) {

  if (question.type === 'signature') {
    const signature = value;

    if (!signature || typeof signature !== 'object') {
      return (
        <div className="review-answer">
          No signature provided.
        </div>
      );
    }

    if (signature.method === 'typed') {
      return (
        <div className="review-answer">
          <div
            style={{
              fontFamily: 'cursive',
              fontSize: '1.8rem',
              fontStyle: 'italic',
              padding: '8px 0'
            }}
          >
            {signature.value}
          </div>
        </div>
      );
    }

    if (signature.method === 'drawn') {
      const signatureFile = files[0];

      if (!signatureFile) {
        return (
          <div className="review-answer">
            Signature image unavailable.
          </div>
        );
      }

      return (
        <div className="review-answer">
          {signatureFile.download_url ? (
            <div>
              <img
                src={signatureFile.download_url}
                alt="Submitted signature"
                crossOrigin="anonymous"
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '160px',
                  objectFit: 'contain',
                  objectPosition: 'left center',
                  margin: '8px 0'
                }}
              />
            </div>
          ) : (
            <span>
              Signature image unavailable.
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="review-answer">
        Unrecognized signature format.
      </div>
    );
  }

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

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const [selectedStatus, setSelectedStatus] = useState('submitted');
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusError, setStatusError] = useState('');

  const [notes, setNotes] = useState<SubmissionNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);

  const submissionTitle = submission?.form_name || defaultTitle;

  const rescueGroupName = isRescue
    ? (
        typeof submission?.responses?.['1793977460689-z0hmyg0'] === 'string'
          ? submission.responses['1793977460689-z0hmyg0'].trim()
          : ''
      ) || 'Rescue Group'
    : '';

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get(`/forms/submissions/${id}`);
        const fetchedSubmission = response.data.submission ?? response.data;

        setSubmission(fetchedSubmission);
        setSelectedStatus(fetchedSubmission.status || 'submitted');
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

  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoadingNotes(true);
        setNotesError('');

        const response = await api.get(
          `/forms/submissions/${id}/notes`
        );

        setNotes(response.data.notes ?? []);
      } catch (err: any) {
        console.error('Failed to load submission notes:', err);
        setNotesError(
          err.response?.data?.message ||
          'Unable to load staff notes.'
        );
      } finally {
        setLoadingNotes(false);
      }
    };

    if (id) {
      loadNotes();
    }
  }, [id]);

  const handleStatusChange = async (nextStatus: string) => {
    if (!id || !submission || savingStatus) return;

    const previousStatus = submission.status;

    setSelectedStatus(nextStatus);
    setStatusMessage('');
    setStatusError('');

    if (nextStatus === previousStatus) return;

    try {
      setSavingStatus(true);

      const response = await api.patch(
        `/forms/submissions/${id}/status`,
        { status: nextStatus }
      );

      const updatedSubmission =
        response.data.submission ?? response.data;

      const savedStatus = updatedSubmission.status || nextStatus;

      setSubmission(prev =>
        prev
          ? { ...prev, status: savedStatus }
          : prev
      );

      setSelectedStatus(savedStatus);
      setStatusMessage('Status saved.');
    } catch (err: any) {
      console.error('Failed to update submission status:', err);

      setSelectedStatus(previousStatus);

      setStatusError(
        err.response?.data?.message ||
        'Unable to update application status. Please try again.'
      );
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!id || !newNote.trim() || savingNote) return;

    try {
      setSavingNote(true);
      setNotesError('');

      const response = await api.post(
        `/forms/submissions/${id}/notes`,
        { note: newNote.trim() }
      );

      const savedNote = response.data.note;

      setNotes(prev => [...prev, savedNote]);
      setNewNote('');
    } catch (err: any) {
      console.error('Failed to add submission note:', err);

      setNotesError(
        err.response?.data?.message ||
        'Unable to save staff note.'
      );
    } finally {
      setSavingNote(false);
    }
  };
  const handleEditNote = async (noteId: number) => {
  if (!id || !editingNoteText.trim() || savingEdit) return;

  try {
    setSavingEdit(true);
    setNotesError('');

    const response = await api.patch(
      `/forms/submissions/${id}/notes/${noteId}`,
      { note: editingNoteText.trim() }
    );

    const updatedNote = response.data.note;

    setNotes(prev =>
      prev.map(note =>
        note.id === noteId ? updatedNote : note
      )
    );

    setEditingNoteId(null);
    setEditingNoteText('');
  } catch (err: any) {
    console.error('Failed to update submission note:', err);

    setNotesError(
      err.response?.data?.message ||
      'Unable to update staff note.'
    );
  } finally {
    setSavingEdit(false);
  }
};

  const handleDeleteNote = async (noteId: number) => {
    if (!id || deletingNoteId !== null) return;

    const confirmed = window.confirm(
      'Are you sure you want to permanently delete this staff note?'
    );

    if (!confirmed) return;

    try {
      setDeletingNoteId(noteId);
      setNotesError('');

      await api.delete(
        `/forms/submissions/${id}/notes/${noteId}`
      );

      setNotes(prev =>
        prev.filter(note => note.id !== noteId)
      );

      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setEditingNoteText('');
      }
    } catch (err: any) {
      console.error('Failed to delete submission note:', err);

      setNotesError(
        err.response?.data?.message ||
        'Unable to delete staff note.'
      );
    } finally {
      setDeletingNoteId(null);
    }
  };

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

          if (
            question.type === 'file_upload' ||
            question.type === 'signature'
          ) {
            return (
              !isEmpty(responses[question.id]) ||
              files.some(file => file.question_id === question.id)
            );
          }

          return !isEmpty(responses[question.id]);
        })
      }))
      .filter(section => section.questions.length > 0);
  }, [submission]);

  useEffect(() => {
    if (!submission) return;

    document.title = isRescue
      ? `${rescueGroupName} - Rescue Group Application`
      : submissionTitle;

    return () => {
      document.title = 'ShelterHelper';
    };
  }, [submission, isRescue, rescueGroupName, submissionTitle]);

  const handlePrint = async () => {
    if (!id || generatingPdf) return;

    const reviewElement = document.querySelector(
      '.review-document'
    ) as HTMLElement | null;

    if (!reviewElement) {
      setPdfError('Could not locate the submission review.');
      return;
    }

    const newWindow = window.open('', '_blank');

    if (!newWindow) {
      setPdfError(
        'Your browser blocked the PDF window. Please allow pop-ups for this site and try again.'
      );
      return;
    }

    try {
      setGeneratingPdf(true);
      setPdfError('');

      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Preparing PDF...</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                color: #444;
              }
            </style>
          </head>
          <body>
            Preparing submission PDF...
          </body>
        </html>
      `);
      newWindow.document.close();

      const options = {
        margin: 0.4,
        filename: isRescue
          ? `${rescueGroupName} - Rescue Group Application.pdf`
          : `submission-${id}-review.pdf`,
        image: {
          type: 'jpeg' as const,
          quality: 0.98
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0
        },
        jsPDF: {
          unit: 'in',
          format: 'letter',
          orientation: 'portrait' as const
        },
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: [
            '.review-section-card',
            '.review-summary-card',
            '.review-question',
            '.review-animal-block'
          ]
        }
      };

      const reviewPdf: Blob = await html2pdf()
        .set(options)
        .from(reviewElement)
        .outputPdf('blob');

      const formData = new FormData();

      formData.append(
        'reviewPdf',
        reviewPdf,
        isRescue
          ? `${rescueGroupName} - Rescue Group Application.pdf`
          : `submission-${id}-review.pdf`
      );

      const response = await api.post(
        `/forms/submissions/${id}/combined-pdf`,
        formData,
        {
          responseType: 'blob'
        }
      );

      const combinedPdf = new Blob(
        [response.data],
        { type: 'application/pdf' }
      );

      const pdfUrl = window.URL.createObjectURL(combinedPdf);

      newWindow.location.href = pdfUrl;

      window.setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl);
      }, 60000);

    } catch (err: any) {
      console.error('Failed to generate combined submission PDF:', err);

      if (!newWindow.closed) {
        newWindow.close();
      }

      setPdfError(
        'Unable to generate the combined PDF. Please try again.'
      );
    } finally {
      setGeneratingPdf(false);
    }
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

  return (
    <Container fluid className="py-4 surrender-review-page">
      <div className="review-toolbar mb-3">
        <Button
          variant="outline-secondary"
          onClick={() => navigate(backPath)}
        >
          &larr; Back to Submissions
        </Button>

        <Button
          variant="primary"
          onClick={handlePrint}
          disabled={generatingPdf}
        >
          {generatingPdf ? (
            <>
              <Spinner
                animation="border"
                size="sm"
                className="me-2"
              />
              Preparing PDF...
            </>
          ) : (
            <>
              <i className="bi bi-file-earmark-pdf me-2" />
              Print / Save PDF
            </>
          )}
        </Button>
      </div>

      {pdfError && (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setPdfError('')}
          className="mt-3"
        >
          {pdfError}
        </Alert>
      )}

      <Row className="g-4 align-items-start">
        {/* MAIN APPLICATION COLUMN */}
        <Col lg={8} xl={9}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Application Status
                </Form.Label>

                <Form.Select
                  value={selectedStatus}
                  onChange={event =>
                    handleStatusChange(event.target.value)
                  }
                  disabled={savingStatus}
                >
                  {submissionStatuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              {savingStatus && (
                <div className="text-muted small mt-2">
                  <Spinner
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  Saving status...
                </div>
              )}

              {statusError && (
                <Alert variant="danger" className="mt-3 mb-0">
                  {statusError}
                </Alert>
              )}
            </Card.Body>
          </Card>

          {/* APPLICATION DOCUMENT */}
          <div className="review-document">
            <div className="review-document-header">
              <div>
                <h1>
                  {isRescue
                    ? `${rescueGroupName} - Rescue Group Application`
                    : submissionTitle}
                </h1>
              </div>
            </div>

            <Card className="review-summary-card mb-4">
              <Card.Body>
                <Row>
                  <Col
                    md={isRescue ? 12 : 4}
                    className="review-summary-item"
                  >
                    <div className="review-field-label">
                      Date Submitted
                    </div>
                    <div className="review-field-value">
                      {formatDate(submission.submitted_at)}
                    </div>
                  </Col>

                  {!isRescue && (
                    <>
                      <Col md={4} className="review-summary-item">
                        <div className="review-field-label">
                          Animal Species
                        </div>
                        <div className="review-field-value">
                          {submission.species || 'Not provided'}
                        </div>
                      </Col>

                      <Col md={4} className="review-summary-item">
                        <div className="review-field-label">
                          Surrender Type
                        </div>
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
                <Card
                  className="review-section-card mb-4"
                  key={section.id}
                >
                  <Card.Header>
                    <span className="review-section-number">
                      Section {sectionIndex + 1}
                    </span>

                    <h2>{section.title}</h2>

                    {section.description && (
                      <p>{section.description}</p>
                    )}
                  </Card.Header>

                  <Card.Body>
                    {section.questions.map(question => (
                      <div
                        className="review-question"
                        key={question.id}
                      >
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
          </div>
        </Col>

        {/* STICKY STAFF NOTES SIDEBAR */}
        <Col lg={4} xl={3} className="staff-notes-column">
          <div className="staff-notes-sticky">
            <Card className="shadow-sm">
              <Card.Header className="bg-light">
                <h4 className="mb-0">Staff Review Notes</h4>
              </Card.Header>

              <Card.Body>
                {notesError && (
                  <Alert variant="danger">
                    {notesError}
                  </Alert>
                )}

                {loadingNotes ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" size="sm" />
                    <div className="text-muted mt-2">
                      Loading notes...
                    </div>
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-muted mb-3">
                    No staff notes have been added yet.
                  </p>
                ) : (
                  <div className="mb-4">
                    {notes.map(note => (
                      <div
                        key={note.id}
                        className="border rounded p-3 mb-3"
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <strong>
                              {note.created_by_name || 'Unknown Staff Member'}
                            </strong>

                            <div className="text-muted small">
                              {formatDate(note.created_at)}
                            </div>
                          </div>
                        </div>

                        {editingNoteId === note.id ? (
                          <>
                            <Form.Control
                              as="textarea"
                              rows={4}
                              value={editingNoteText}
                              onChange={event =>
                                setEditingNoteText(event.target.value)
                              }
                              disabled={savingEdit}
                              className="mb-3"
                            />

                            <div className="d-flex justify-content-end gap-2">
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingNoteText('');
                                }}
                                disabled={savingEdit}
                              >
                                Cancel
                              </Button>

                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleEditNote(note.id)}
                                disabled={savingEdit || !editingNoteText.trim()}
                              >
                                {savingEdit ? (
                                  <>
                                    <Spinner
                                      animation="border"
                                      size="sm"
                                      className="me-2"
                                    />
                                    Saving...
                                  </>
                                ) : (
                                  'Save Changes'
                                )}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                              {note.note}
                            </div>

                            <div className="d-flex justify-content-end gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditingNoteText(note.note);
                                }}
                                disabled={deletingNoteId !== null || editingNoteId !== null}
                              >
                                <i className="bi bi-pencil me-1" />
                                Edit
                              </Button>

                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDeleteNote(note.id)}
                                disabled={deletingNoteId !== null || editingNoteId !== null}
                              >
                                {deletingNoteId === note.id ? (
                                  <>
                                    <Spinner
                                      animation="border"
                                      size="sm"
                                      className="me-1"
                                    />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-trash me-1" />
                                    Delete
                                  </>
                                )}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Add a Note
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Enter internal notes about this application..."
                    value={newNote}
                    onChange={event => setNewNote(event.target.value)}
                    disabled={savingNote}
                  />
                </Form.Group>

                <div className="d-flex justify-content-end">
                  <Button
                    variant="primary"
                    onClick={handleAddNote}
                    disabled={
                      savingNote ||
                      !newNote.trim() ||
                      editingNoteId !== null ||
                      deletingNoteId !== null
                    }
                  >
                    {savingNote ? (
                      <>
                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Saving...
                      </>
                    ) : (
                      'Add Note'
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Col>
      </Row>
      <ToastContainer
        position="top-end"
        className="p-3"
        style={{ zIndex: 2000 }}
      >
        <Toast
          show={!!statusMessage}
          onClose={() => setStatusMessage('')}
          delay={2500}
          autohide
          bg="success"
        >
          <Toast.Header>
            <strong className="me-auto">Application Updated</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            Status saved successfully.
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
}