
import { useEffect, useMemo, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Table,
  Badge,
  Tabs,
  Tab,
  Modal,
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

import { api } from '../../../api/api';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCopy,
  faCheck,
  faMagnifyingGlass,
  faTrash
} from '@fortawesome/free-solid-svg-icons';

interface RescueForm {
  id: number;
  name: string;
  slug: string;
  description?: string;
  form_type?: string;
  created_at?: string;
  updated_at?: string;
  submission_count?: number;
}

interface Submission {
  id: number;
  form_id?: number;
  status?: string;
  created_at?: string;
  submitted_at?: string;
  responses?: Record<string, any>;
}

const submissionStatuses = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

function RescueApplications() {
  const navigate = useNavigate();

  const [form, setForm] = useState<RescueForm | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeStatus, setActiveStatus] = useState('submitted');

  const [linkCopied, setLinkCopied] = useState(false);

  const [submissionToDelete, setSubmissionToDelete] =
    useState<Submission | null>(null);

  const [deletingSubmission, setDeletingSubmission] = useState(false);

  document.title = 'Rescue Group Applications';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const formsRes = await api.get('/forms?form_type=rescue');

      const fetchedForms = formsRes.data.forms ?? formsRes.data;

      // There should only ever be one rescue group application.
      const currentForm = Array.isArray(fetchedForms)
        ? fetchedForms[0] ?? null
        : null;

      setForm(currentForm);

      if (currentForm) {
        const submissionsRes = await api.get(
          `/forms/submissions?form_id=${currentForm.id}`
        );

        const fetchedSubmissions =
          submissionsRes.data.submissions ?? submissionsRes.data;

        setSubmissions(
          Array.isArray(fetchedSubmissions)
            ? fetchedSubmissions
            : []
        );
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load rescue group application information.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = async () => {
    try {
      setCreating(true);
      setError('');

      const res = await api.post('/forms', {
        name: 'Rescue Group Application',
        slug: 'rescue-group-application',
        description: 'Online rescue group application.',
        form_type: 'rescue',
      });

      const newForm = res.data.form ?? res.data;

      navigate(`/forms/${newForm.id}/edit`);
    } catch (err: any) {
      console.error(err);

      if (err.response?.status === 409) {
        // The form may already exist. Reload it and open the editor.
        await fetchData();

        const formsRes = await api.get('/forms?form_type=rescue');
        const fetchedForms = formsRes.data.forms ?? formsRes.data;

        const existingForm = Array.isArray(fetchedForms)
          ? fetchedForms[0] ?? null
          : null;

        if (existingForm) {
          navigate(`/forms/${existingForm.id}/edit`);
        } else {
          setError(
            'The rescue group application already exists, but could not be retrieved.'
          );
        }
      } else {
        setError(
          err.response?.data?.message || 'Unable to create form.'
        );
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(
        'https://shelterhelper.vercel.app/rescue/rescue-group-application'
      );

      setLinkCopied(true);

      setTimeout(() => {
        setLinkCopied(false);
      }, 1500);
    } catch (err) {
      console.error('Unable to copy public link:', err);
      setError('Unable to copy the public link.');
    }
  };

  const handleEditForm = () => {
    if (form) {
      navigate(`/forms/${form.id}/edit`);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete || deletingSubmission) return;

    try {
      setDeletingSubmission(true);
      setError('');

      await api.delete(
        `/forms/submissions/${submissionToDelete.id}`
      );

      setSubmissions(prev =>
        prev.filter(
          submission => submission.id !== submissionToDelete.id
        )
      );

      setSubmissionToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete rescue application:', err);

      setError(
        err.response?.data?.message ||
        'Unable to delete this application. Please try again.'
      );
    } finally {
      setDeletingSubmission(false);
    }
  };

  // Display dates without seconds.
  const formatDate = (date?: string) => {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return date;

    return parsedDate.toLocaleString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const normalizeStatus = (status?: string) => {
    const normalized = (status || 'submitted').toLowerCase();

    // Support older status values if any already exist.
    if (normalized === 'rejected') return 'denied';
    if (normalized === 'completed') return 'approved';

    return normalized;
  };

  const formatStatus = (status?: string) => {
    const normalized = normalizeStatus(status);

    const variants: Record<string, string> = {
      submitted: 'primary',
      under_review: 'warning',
      approved: 'success',
      denied: 'danger',
      withdrawn: 'secondary',
    };

    const labels: Record<string, string> = {
      submitted: 'Submitted',
      under_review: 'Under Review',
      approved: 'Approved',
      denied: 'Denied',
      withdrawn: 'Withdrawn',
    };

    return (
      <Badge bg={variants[normalized] || 'secondary'}>
        {labels[normalized] || normalized.replace(/_/g, ' ')}
      </Badge>
    );
  };

  // Sort submissions oldest first.
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      const dateA = new Date(
        a.submitted_at || a.created_at || 0
      ).getTime();

      const dateB = new Date(
        b.submitted_at || b.created_at || 0
      ).getTime();

      const safeDateA = Number.isNaN(dateA) ? 0 : dateA;
      const safeDateB = Number.isNaN(dateB) ? 0 : dateB;

      return safeDateA - safeDateB;
    });
  }, [submissions]);

  // Group submissions by status.
  const getSubmissionsByStatus = (status: string) => {
    return sortedSubmissions.filter(
      submission => normalizeStatus(submission.status) === status
    );
  };

  const getRescueGroupName = (submission: Submission) => {
    return (
      submission.responses?.['1793977460689-z0hmyg0'] ||
      'Unnamed Rescue Group'
    );
  };

  return (
    <>
      <Row className="align-items-center mb-4">
        <Col>
          <h2 className="mb-1">Rescue Groups</h2>
          <p className="text-muted mb-0">
            Manage the rescue group application and review submissions.
          </p>
        </Col>
      </Row>

      {error && (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" role="status" />
          <p className="text-muted mt-2">
            Loading rescue group information...
          </p>
        </div>
      ) : (
        <>
          {/* FORM MANAGEMENT */}
          <Card className="shadow-sm mb-4">
            <Card.Body>
              {form ? (
                <Row className="align-items-center">
                  <Col>
                    <h5 className="mb-1">{form.name}</h5>

                    <p className="text-muted mb-2">
                      {form.description || 'No description provided.'}
                    </p>

                    <div className="small text-muted">
                      <div>
                        <strong>Copy Application Link:</strong>
                      </div>
                      <span>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={handleCopyPublicLink}
                          title={linkCopied ? 'Copied!' : 'Copy public link'}
                          aria-label={linkCopied ? 'Link copied' : 'Copy public link'}
                        >
                          <FontAwesomeIcon icon={linkCopied ? faCheck : faCopy} />
                        </Button>
                      </span>
                    </div>
                  </Col>

                  <Col xs="auto">
                    <Button
                      variant="primary"
                      onClick={handleEditForm}
                    >
                      Edit Form
                    </Button>
                  </Col>
                </Row>
              ) : (
                <div className="text-center py-4">
                  <h5>No Rescue Group Application Found</h5>
                  <p className="text-muted">
                    Create your rescue group application to get started.
                  </p>

                  <Button
                    variant="primary"
                    onClick={handleCreateForm}
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Creating...
                      </>
                    ) : (
                      'Create Rescue Group Application'
                    )}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* SUBMISSIONS */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-1">Rescue Group Submissions</h4>
            </div>

            <Badge bg="secondary" className="fs-6">
              {submissions.length} Total
            </Badge>
          </div>

          <Card className="shadow-sm">
            {submissions.length === 0 ? (
              <Card.Body className="text-center py-5">
                <h5>No Submissions Yet</h5>
                <p className="text-muted mb-0">
                  Submitted rescue group applications will appear here.
                </p>
              </Card.Body>
            ) : (
              <Card.Body>
                <Tabs
                  activeKey={activeStatus}
                  onSelect={key => {
                    if (key) setActiveStatus(key);
                  }}
                  className="mb-3"
                >
                  {submissionStatuses.map(status => {
                    const statusSubmissions = getSubmissionsByStatus(
                      status.value
                    );

                    return (
                      <Tab
                        key={status.value}
                        eventKey={status.value}
                        title={
                          <span>
                            {status.label}{' '}
                            <Badge
                              bg={
                                activeStatus === status.value
                                  ? 'primary'
                                  : 'secondary'
                              }
                            >
                              {statusSubmissions.length}
                            </Badge>
                          </span>
                        }
                      >
                        {statusSubmissions.length === 0 ? (
                          <div className="text-center py-5">
                            <h5>No {status.label} Applications</h5>
                            <p className="text-muted mb-0">
                              Applications with this status will appear here.
                            </p>
                          </div>
                        ) : (
                          <Table
                            responsive
                            hover
                            className="mb-0 align-middle"
                          >
                            <thead className="table-light">
                              <tr>
                                <th>Rescue Group</th>
                                <th>Date Submitted</th>
                                <th>Status</th>
                                <th className="text-end">Action</th>
                              </tr>
                            </thead>

                            <tbody>
                              {statusSubmissions.map(submission => (
                                <tr key={submission.id}>
                                  <td>
                                    <strong>{getRescueGroupName(submission)}</strong>
                                  </td>

                                  <td>
                                    {formatDate(
                                      submission.submitted_at ||
                                      submission.created_at
                                    )}
                                  </td>

                                  <td>
                                    {formatStatus(submission.status)}
                                  </td>

                                  <td className="text-end">
                                    <div className="d-flex flex-column align-items-end gap-2">
                                      <Button
                                        as={Link as any}
                                        to={`/rescue-submissions/${submission.id}`}
                                        variant="outline-primary"
                                        size="sm"
                                      >
                                        <FontAwesomeIcon
                                          icon={faMagnifyingGlass}
                                          className="me-2"
                                        />
                                        Review
                                      </Button>

                                      <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => setSubmissionToDelete(submission)}
                                      >
                                        <FontAwesomeIcon
                                          icon={faTrash}
                                          className="me-2"
                                        />
                                        Delete
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        )}
                      </Tab>
                    );
                  })}
                </Tabs>
              </Card.Body>
            )}
          </Card>
        </>
      )}
      <Modal
        show={!!submissionToDelete}
        onHide={() => {
          if (!deletingSubmission) {
            setSubmissionToDelete(null);
          }
        }}
        centered
        size="sm"
      >
        <Modal.Header closeButton={!deletingSubmission}>
          <Modal.Title>Delete Application?</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          Are you sure you want to delete this application?

          <p className="text-danger mb-0 mt-2">
            All data from this application will be permanently lost.
          </p>

          {submissionToDelete && (
            <div className="fw-semibold mt-3">
              {getRescueGroupName(submissionToDelete)}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setSubmissionToDelete(null)}
            disabled={deletingSubmission}
          >
            Cancel
          </Button>

          <Button
            variant="danger"
            onClick={handleDeleteSubmission}
            disabled={deletingSubmission}
          >
            {deletingSubmission ? (
              <>
                <Spinner
                  animation="border"
                  size="sm"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              <>
                <FontAwesomeIcon
                  icon={faTrash}
                  className="me-2"
                />
                Delete Application
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default RescueApplications;