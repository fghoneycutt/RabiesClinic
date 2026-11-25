
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table
} from 'react-bootstrap';
import {
  FaPlus,
  FaSync,
  FaTabletAlt,
  FaFileSignature,
  FaBan,
  FaKey,
  FaClipboard
} from 'react-icons/fa';

import { api } from '../../api/api';

// ==========================================
// TYPES
// ==========================================

interface SigningStation {
  id: string;
  name: string;
  is_active: boolean;
  is_paired: boolean;
  last_seen_at: string | null;
  created_at: string;
}

interface SigningSession {
  id: string;
  station_id: string;
  station_name: string;
  session_type: string;
  source_module: string | null;
  source_record_type: string | null;
  source_record_id: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  signer_id: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signer_status: string | null;
  document_count: number;
}

// ==========================================
// HELPERS
// ==========================================

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'primary';
    case 'displayed':
      return 'info';
    case 'queued':
      return 'warning';
    case 'cancelled':
      return 'secondary';
    case 'expired':
      return 'danger';
    default:
      return 'secondary';
  }
};

const formatStatus = (status: string) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

const formatDate = (value: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

// ==========================================
// COMPONENT
// ==========================================

const SigningSessions = () => {
  const [stations, setStations] = useState<SigningStation[]>([]);
  const [sessions, setSessions] = useState<SigningSession[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [statusFilter, setStatusFilter] = useState('');

  // Station modal
  const [showStationModal, setShowStationModal] = useState(false);
  const [stationName, setStationName] = useState('');

  // Pairing code modal
  const [pairingCode, setPairingCode] = useState('');
  const [pairingStationName, setPairingStationName] = useState('');
  const [pairingExpiresAt, setPairingExpiresAt] = useState<string | null>(null);
  const [showPairingModal, setShowPairingModal] = useState(false);

  // Create session modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [stationId, setStationId] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [expirationMinutes, setExpirationMinutes] = useState('30');

  // ==========================================
  // LOAD DATA
  // ==========================================

  const loadData = useCallback(async () => {
    try {
      setError('');

      const [stationResponse, sessionResponse] = await Promise.all([
        api.get('/signing-stations'),
        api.get('/signing-sessions', {
          params: statusFilter ? { status: statusFilter } : {}
        })
      ]);

      // GET /signing-stations returns the station array directly.
      setStations(
        Array.isArray(stationResponse.data)
          ? stationResponse.data
          : []
      );

      // Signing sessions endpoint returns { sessions: [...] }.
      setSessions(sessionResponse.data.sessions || []);
    } catch (err: any) {
      console.error('Unable to load signing data:', err);
      setError(
        err.response?.data?.message ||
        'Unable to load signing stations and sessions.'
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================
  // CREATE STATION
  // ==========================================

  const createStation = async () => {
    if (!stationName.trim()) {
      setError('Enter a name for the signing station.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await api.post('/signing-stations', {
        name: stationName.trim()
      });

      // POST /signing-stations returns the station directly.
      const newStation: SigningStation = response.data;

      setStations(previous => [
        newStation,
        ...previous.filter(station => station.id !== newStation.id)
      ]);

      setStationName('');
      setShowStationModal(false);

      setSuccess(
        'Signing station created. Generate a pairing code to connect the iPad.'
      );

      await loadData();
    } catch (err: any) {
      console.error('Unable to create signing station:', err);
      setError(
        err.response?.data?.message ||
        'Unable to create signing station.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // GENERATE PAIRING CODE
  // ==========================================

  const generatePairingCode = async (station: SigningStation) => {
    try {
      setError('');
      setSuccess('');
      setSaving(true);

      const response = await api.post(
        `/signing-stations/${station.id}/pairing-code`
      );

      setPairingCode(response.data.pairingCode);
      setPairingStationName(station.name);
      setPairingExpiresAt(response.data.expiresAt || null);
      setShowPairingModal(true);

      await loadData();
    } catch (err: any) {
      console.error('Unable to generate pairing code:', err);
      setError(
        err.response?.data?.message ||
        'Unable to generate a pairing code.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // CREATE SIGNING SESSION
  // ==========================================

  const createSession = async () => {
    if (
      !stationId ||
      !signerName.trim() ||
      !documentTitle.trim() ||
      !documentContent.trim()
    ) {
      setError('Complete all required signing session fields.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const expiresAt = new Date(
        Date.now() + Number(expirationMinutes) * 60 * 1000
      ).toISOString();

      await api.post('/signing-sessions', {
        stationId,
        sessionType: 'document_signing',
        expiresAt,
        documents: [
          {
            title: documentTitle.trim(),
            documentType: 'contract',
            contentFormat: 'plain_text',
            contentText: documentContent,
            requiresSignature: true,
            sortOrder: 0
          }
        ],
        signers: [
          {
            signerOrder: 1,
            signerRole: 'customer',
            displayName: signerName.trim(),
            email: signerEmail.trim() || null
          }
        ]
      });

      setShowSessionModal(false);
      resetSessionForm();

      setSuccess('Signing session sent to the selected iPad.');
      await loadData();
    } catch (err: any) {
      console.error('Unable to create signing session:', err);
      setError(
        err.response?.data?.message ||
        'Unable to create signing session.'
      );
    } finally {
      setSaving(false);
    }
  };

  const resetSessionForm = () => {
    setStationId('');
    setSignerName('');
    setSignerEmail('');
    setDocumentTitle('');
    setDocumentContent('');
    setExpirationMinutes('30');
  };

  // ==========================================
  // CANCEL SESSION
  // ==========================================

  const cancelSession = async (session: SigningSession) => {
    const confirmed = window.confirm(
      `Cancel the signing session for ${session.signer_name || 'this customer'}?`
    );

    if (!confirmed) return;

    try {
      setError('');
      setSaving(true);

      await api.patch(`/signing-sessions/${session.id}/cancel`);

      setSuccess('Signing session cancelled.');
      await loadData();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Unable to cancel signing session.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  const activeStations = stations.filter(
    station => station.is_active
  );

  const pairedStations = activeStations.filter(
    station => station.is_paired
  );

  const activeSessions = sessions.filter(session =>
    ['queued', 'displayed', 'in_progress'].includes(session.status)
  );

  return (
    <div className="container-fluid py-4">

      {/* HEADER */}

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="mb-1">
            <FaFileSignature className="me-2" />
            Signing Sessions
          </h2>
          <p className="text-muted mb-0">
            Manage signing stations and customer documents.
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={loadData}
            disabled={loading || saving}
          >
            <FaSync className="me-2" />
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={() => setShowSessionModal(true)}
            disabled={pairedStations.length === 0}
          >
            <FaPlus className="me-2" />
            New Signing Session
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      {/* SUMMARY */}

      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <div className="text-muted mb-1">
                Registered Stations
              </div>
              <h3 className="mb-0">{stations.length}</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <div className="text-muted mb-1">
                Active Stations
              </div>
              <h3 className="mb-0">{activeStations.length}</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <div className="text-muted mb-1">
                Active Signing Sessions
              </div>
              <h3 className="mb-0">{activeSessions.length}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* SIGNING STATIONS */}

      <Card className="shadow-sm mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaTabletAlt className="me-2" />
            Signing Stations
          </h5>

          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => setShowStationModal(true)}
          >
            <FaPlus className="me-1" />
            Add Station
          </Button>
        </Card.Header>

        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : stations.length === 0 ? (
            <div className="text-center text-muted py-4">
              <FaTabletAlt size={32} className="mb-2" />
              <p className="mb-0">
                No signing stations have been registered.
              </p>
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Status</th>
                  <th>Last Seen</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>
                {stations.map(station => (
                  <tr key={station.id}>
                    <td className="fw-semibold">
                      {station.name}
                    </td>

                    <td>
                      {!station.is_active ? (
                        <Badge bg="secondary">Inactive</Badge>
                      ) : station.is_paired ? (
                        <Badge bg="success">Paired</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">
                          Awaiting Pairing
                        </Badge>
                      )}
                    </td>

                    <td>
                      {formatDate(station.last_seen_at)}
                    </td>

                    <td className="text-end">
                      {station.is_active && (
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => generatePairingCode(station)}
                          disabled={saving}
                        >
                          <FaKey className="me-1" />
                          Pair / Re-pair
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* SIGNING SESSIONS */}

      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h5 className="mb-0">
            <FaFileSignature className="me-2" />
            Signing History
          </h5>

          <Form.Select
            size="sm"
            style={{ maxWidth: '200px' }}
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="queued">Queued</option>
            <option value="displayed">Displayed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </Form.Select>
        </Card.Header>

        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-muted py-4">
              No signing sessions found.
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Station</th>
                  <th>Documents</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>
                {sessions.map(session => (
                  <tr key={session.id}>
                    <td>
                      <div className="fw-semibold">
                        {session.signer_name || 'Unknown'}
                      </div>
                      <small className="text-muted">
                        {session.signer_email || 'No email provided'}
                      </small>
                    </td>

                    <td>{session.station_name}</td>

                    <td>{session.document_count}</td>

                    <td>
                      <Badge bg={getStatusVariant(session.status)}>
                        {formatStatus(session.status)}
                      </Badge>
                    </td>

                    <td>{formatDate(session.created_at)}</td>

                    <td>{formatDate(session.expires_at)}</td>

                    <td className="text-end">
                      {['queued', 'displayed', 'in_progress'].includes(
                        session.status
                      ) && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => cancelSession(session)}
                          disabled={saving}
                        >
                          <FaBan className="me-1" />
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* CREATE STATION MODAL */}

      <Modal
        show={showStationModal}
        onHide={() => setShowStationModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Signing Station</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group>
            <Form.Label>Station Name</Form.Label>
            <Form.Control
              value={stationName}
              onChange={event => setStationName(event.target.value)}
              placeholder="e.g. Front Desk iPad"
              maxLength={100}
            />
            <Form.Text className="text-muted">
              Give each iPad a unique name.
            </Form.Text>
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowStationModal(false)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            onClick={createStation}
            disabled={saving || !stationName.trim()}
          >
            {saving ? 'Creating...' : 'Create Station'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* PAIRING CODE MODAL */}

      <Modal
        show={showPairingModal}
        onHide={() => setShowPairingModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Pair Signing Station</Modal.Title>
        </Modal.Header>

        <Modal.Body className="text-center">
          <p className="text-muted">
            Enter this code on the iPad to pair:
          </p>

          <h2 className="fw-bold my-4" style={{ letterSpacing: '5px' }}>
            {pairingCode}
          </h2>

          <div className="fw-semibold mb-3">
            {pairingStationName}
          </div>

          {pairingExpiresAt && (
            <p className="small text-muted">
              Expires: {formatDate(pairingExpiresAt)}
            </p>
          )}

          <Alert variant="warning">
            This code expires after 10 minutes and can only be used once.
            Keep it private.
          </Alert>

          <Button
            variant="outline-primary"
            onClick={() => {
              navigator.clipboard.writeText(pairingCode);
              setSuccess('Pairing code copied.');
            }}
          >
            <FaClipboard className="me-2" />
            Copy Pairing Code
          </Button>
        </Modal.Body>
      </Modal>

      {/* CREATE SIGNING SESSION MODAL */}

      <Modal
        show={showSessionModal}
        onHide={() => {
          setShowSessionModal(false);
          resetSessionForm();
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>New Signing Session</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Signing Station *</Form.Label>
              <Form.Select
                value={stationId}
                onChange={event => setStationId(event.target.value)}
              >
                <option value="">Select an iPad</option>
                {pairedStations.map(station => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Customer Name *</Form.Label>
                  <Form.Control
                    value={signerName}
                    onChange={event => setSignerName(event.target.value)}
                    placeholder="Customer's full name"
                    maxLength={200}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    value={signerEmail}
                    onChange={event => setSignerEmail(event.target.value)}
                    placeholder="Optional"
                    maxLength={255}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Document Title *</Form.Label>
              <Form.Control
                value={documentTitle}
                onChange={event => setDocumentTitle(event.target.value)}
                placeholder="e.g. Cat Trap Rental Agreement"
                maxLength={200}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Document Content *</Form.Label>
              <Form.Control
                as="textarea"
                rows={8}
                value={documentContent}
                onChange={event => setDocumentContent(event.target.value)}
                placeholder="Enter the document text the customer will review and sign..."
              />
              <Form.Text className="text-muted">
                This is a basic text-document entry. We'll connect
                configurable contracts and module-generated documents
                as part of the integrations.
              </Form.Text>
            </Form.Group>

            <Form.Group>
              <Form.Label>Session Expiration</Form.Label>
              <Form.Select
                value={expirationMinutes}
                onChange={event => setExpirationMinutes(event.target.value)}
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowSessionModal(false);
              resetSessionForm();
            }}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            onClick={createSession}
            disabled={
              saving ||
              !stationId ||
              !signerName.trim() ||
              !documentTitle.trim() ||
              !documentContent.trim()
            }
          >
            {saving ? 'Sending...' : 'Send to iPad'}
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default SigningSessions;