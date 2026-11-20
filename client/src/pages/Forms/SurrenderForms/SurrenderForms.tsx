
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
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

import { api } from '../../../api/api';

interface SurrenderForm {
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
  species?: string | null;
  surrender_type?: string | null;
  status?: string;
  created_at?: string;
  submitted_at?: string;
}

const submissionStatuses = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

function SurrenderForms() {
  const navigate = useNavigate();

  const [form, setForm] = useState<SurrenderForm | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeStatus, setActiveStatus] = useState('submitted');

  document.title = 'Surrender Forms';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const formsRes = await api.get('/forms?form_type=surrender');

      const fetchedForms = formsRes.data.forms ?? formsRes.data;

      // There should only ever be one surrender application.
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
      setError('Unable to load surrender form information.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = async () => {
    try {
      setCreating(true);
      setError('');

      const res = await api.post('/forms', {
        name: 'Animal Surrender Application',
        slug: 'animal-surrender-application',
        description: 'Online animal surrender application.',
        form_type: 'surrender',
      });

      const newForm = res.data.form ?? res.data;

      navigate(`/forms/${newForm.id}/edit`);
    } catch (err: any) {
      console.error(err);

      if (err.response?.status === 409) {
        // The form may already exist. Reload it and open the editor.
        await fetchData();

        const formsRes = await api.get('/forms?form_type=surrender');
        const fetchedForms = formsRes.data.forms ?? formsRes.data;

        const existingForm = Array.isArray(fetchedForms)
          ? fetchedForms[0] ?? null
          : null;

        if (existingForm) {
          navigate(`/forms/${existingForm.id}/edit`);
        } else {
          setError(
            'The surrender form already exists, but could not be retrieved.'
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

  const handleEditForm = () => {
    if (form) {
      navigate(`/forms/${form.id}/edit`);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return '—';

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

  const getSubmissionsByStatus = (status: string) => {
    return sortedSubmissions.filter(
      (submission) => normalizeStatus(submission.status) === status
    );
  };

  const getStatusCount = (status: string) => {
    return getSubmissionsByStatus(status).length;
  };

  return (
    <>
      <Row className="align-items-center mb-4">
        <Col>
          <h2 className="mb-1">Animal Surrender</h2>
          <p className="text-muted mb-0">
            Manage your surrender application and review submissions.
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
            Loading surrender information...
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
                        <strong>Submissions:</strong>{' '}
                        {submissions.length}
                      </div>

                      <div className="mt-1">
                        <strong>Public URL:</strong>{' '}
                        <a
                          href={`/surrender/${form.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          /surrender/{form.slug}
                        </a>
                      </div>
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
                  <h5>No Surrender Form Found</h5>
                  <p className="text-muted">
                    Create your surrender application to get started.
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
                      'Create Surrender Form'
                    )}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* SUBMISSIONS */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h4 className="mb-1">Surrender Submissions</h4>
            </div>

            <Badge bg="secondary" className="fs-6">
              {submissions.length} Total
            </Badge>
          </div>

          <Card className="shadow-sm">
            <Card.Body>
              <Tabs
                activeKey={activeStatus}
                onSelect={(key) => {
                  if (key) setActiveStatus(key);
                }}
                className="mb-3"
              >
                {submissionStatuses.map((status) => {
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
                          <Badge bg="secondary">
                            {statusSubmissions.length}
                          </Badge>
                        </span>
                      }
                    >
                      {statusSubmissions.length === 0 ? (
                        <div className="text-center py-5">
                          <h5>No {status.label} Submissions</h5>
                          <p className="text-muted mb-0">
                            Surrender applications with this status will
                            appear here.
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
                              <th>Submission</th>
                              <th>Date Submitted</th>
                              <th>Animal</th>
                              <th>Surrender Type</th>
                              <th>Status</th>
                              <th className="text-end">Action</th>
                            </tr>
                          </thead>

                          <tbody>
                            {statusSubmissions.map((submission) => (
                              <tr key={submission.id}>
                                <td>
                                  <strong>#{submission.id}</strong>
                                </td>

                                <td>
                                  {formatDate(
                                    submission.submitted_at ||
                                    submission.created_at
                                  )}
                                </td>

                                <td>
                                  {submission.species
                                    ? submission.species.charAt(0).toUpperCase() +
                                      submission.species.slice(1)
                                    : '—'}
                                </td>

                                <td>
                                  {submission.surrender_type || '—'}
                                </td>

                                <td>
                                  {formatStatus(submission.status)}
                                </td>

                                <td className="text-end">
                                  <Button
                                    as={Link as any}
                                    to={`/surrender-submissions/${submission.id}`}
                                    variant="outline-primary"
                                    size="sm"
                                  >
                                    Review
                                  </Button>
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
          </Card>
        </>
      )}
    </>
  );
}

export default SurrenderForms;