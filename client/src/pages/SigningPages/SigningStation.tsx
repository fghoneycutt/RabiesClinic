
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Form,
  Spinner
} from 'react-bootstrap';
import {
  FaTabletAlt,
  FaFileSignature,
  FaCheckCircle,
  FaSync,
  FaSignOutAlt
} from 'react-icons/fa';

import SignatureInput, {
  type SignatureValue
} from '../../components/input/SignatureInput';

// ==========================================
// TYPES
// ==========================================

interface StationIdentity {
  id: string;
  organizationId: string;
  name: string;
}

interface SigningDocument {
  id: string;
  title: string;
  document_type: string;
  content_format: 'plain_text' | 'html' | 'pdf';
  content_text: string | null;
  storage_path: string | null;
  requires_signature: boolean;
  sort_order: number;
}

interface SigningSession {
  id: string;
  session_type: string;
  status: string;
  expires_at: string;
}

interface ActiveSigningSession {
  session: SigningSession;
  documents: SigningDocument[];
  signers: Array<{
    id: string;
    display_name: string;
    signer_role: string;
    status: string;
  }>;
  customerToken: string;
}

// ==========================================
// API
// ==========================================

const API_URL = (
  import.meta.env.VITE_API_URL || ''
).replace(/\/$/, '');

const stationApi = axios.create({
  baseURL: `${API_URL}/api`
});

const STATION_TOKEN_KEY = 'shelterhelper_signing_station_token';
const STATION_IDENTITY_KEY = 'shelterhelper_signing_station_identity';

const customerApi = (token: string) =>
  axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

const stationApiWithToken = (token: string) =>
  axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

// ==========================================
// COMPONENT
// ==========================================

const SigningStation = () => {
  const [stationToken, setStationToken] = useState(
    () => localStorage.getItem(STATION_TOKEN_KEY) || ''
  );

  const [station, setStation] = useState<StationIdentity | null>(() => {
    const saved = localStorage.getItem(STATION_IDENTITY_KEY);

    if (!saved) return null;

    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const [pairingCode, setPairingCode] = useState('');

  const [activeSession, setActiveSession] =
    useState<ActiveSigningSession | null>(null);

  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [signature, setSignature] = useState<SignatureValue | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [screen, setScreen] = useState<
    'pairing' | 'waiting' | 'signing' | 'complete'
  >('waiting');

  const currentDocument =
    activeSession?.documents[currentDocumentIndex];

  const requiredDocuments =
    activeSession?.documents.filter(
      document => document.requires_signature
    ) || [];

  const currentRequiredDocumentIndex = activeSession
    ? requiredDocuments.findIndex(
        document => document.id === currentDocument?.id
      )
    : -1;

  const isPdf = currentDocument?.content_format === 'pdf';

  // ==========================================
  // ERROR HANDLING
  // ==========================================

  const getErrorMessage = (err: any, fallback: string) => {
    return (
      err.response?.data?.message ||
      err.message ||
      fallback
    );
  };

  // ==========================================
  // CUSTOMER SESSION START
  // ==========================================

  const startCustomerSession = useCallback(
    async (sessionData: ActiveSigningSession) => {
      if (!sessionData?.customerToken) {
        throw new Error('The signing session did not provide a customer token.');
      }

      await customerApi(
        sessionData.customerToken
      ).post('/signing-sessions/customer/start', {
        sessionId: sessionData.session.id
      });
    },
    []
  );

  // ==========================================
  // PAIR STATION
  // ==========================================

  const pairStation = async () => {
    if (!pairingCode.trim()) {
      setError('Enter the pairing code provided by staff.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await stationApi.post(
        '/signing-stations/pair',
        {
          pairingCode: pairingCode.trim().toUpperCase()
        }
      );

      const token =
        response.data.stationToken ||
        response.data.token;

      if (!token) {
        throw new Error('The server did not return a station token.');
      }

      const identity: StationIdentity =
        response.data.station || response.data;

      localStorage.setItem(STATION_TOKEN_KEY, token);

      localStorage.setItem(
        STATION_IDENTITY_KEY,
        JSON.stringify(identity)
      );

      setStationToken(token);
      setStation(identity);
      setPairingCode('');
      setScreen('waiting');
      setSuccess('This iPad has been paired successfully.');
    } catch (err: any) {
      setError(
        getErrorMessage(
          err,
          'Unable to pair this signing station.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // VERIFY STATION
  // ==========================================

  const verifyStation = useCallback(async () => {
    if (!stationToken) {
      setScreen('pairing');
      return false;
    }

    try {
      const response = await stationApiWithToken(
        stationToken
      ).get('/signing-stations/station/me');

      const identity: StationIdentity =
        response.data.station || response.data;

      setStation(identity);

      localStorage.setItem(
        STATION_IDENTITY_KEY,
        JSON.stringify(identity)
      );

      return true;
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem(STATION_TOKEN_KEY);
        localStorage.removeItem(STATION_IDENTITY_KEY);

        setStationToken('');
        setStation(null);
        setScreen('pairing');
      } else {
        setError(
          getErrorMessage(
            err,
            'Unable to connect to this station.'
          )
        );
      }

      return false;
    }
  }, [stationToken]);

  // ==========================================
  // RECOVER ACTIVE SESSION
  // ==========================================

  const recoverSession = useCallback(async () => {
    if (!stationToken) return false;

    try {
      const response = await stationApiWithToken(
        stationToken
      ).get('/signing-sessions/station/recover');

      if (!response.data.session) return false;

      const sessionData: ActiveSigningSession = response.data;

      await startCustomerSession(sessionData);

      setActiveSession(sessionData);
      setCurrentDocumentIndex(0);
      setSignature(null);
      setScreen('signing');

      return true;
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError(
          getErrorMessage(
            err,
            'Unable to recover the active session.'
          )
        );
      }

      return false;
    }
  }, [stationToken, startCustomerSession]);

  // ==========================================
  // CLAIM NEXT SESSION
  // ==========================================

  const checkForSession = async () => {
    if (!stationToken) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await stationApiWithToken(
        stationToken
      ).get('/signing-sessions/station/next');

      if (!response.data.session) {
        setActiveSession(null);
        setScreen('waiting');
        return;
      }

      const sessionData: ActiveSigningSession = response.data;

      await startCustomerSession(sessionData);

      setActiveSession(sessionData);
      setCurrentDocumentIndex(0);
      setSignature(null);
      setScreen('signing');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setActiveSession(null);
        setScreen('waiting');
      } else {
        setError(
          getErrorMessage(
            err,
            'Unable to retrieve a signing session.'
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INITIALIZE STATION
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!stationToken) {
        setScreen('pairing');
        return;
      }

      setLoading(true);
      setError('');

      const valid = await verifyStation();

      if (cancelled || !valid) {
        if (!cancelled) setLoading(false);
        return;
      }

      const recovered = await recoverSession();

      if (!cancelled && !recovered) {
        setScreen('waiting');
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [stationToken, verifyStation, recoverSession]);

  // ==========================================
  // ADVANCE DOCUMENT
  // ==========================================

  const advanceDocument = () => {
    if (!activeSession) return;

    const nextIndex = currentDocumentIndex + 1;

    if (nextIndex >= activeSession.documents.length) {
      setActiveSession(null);
      setSignature(null);
      setCurrentDocumentIndex(0);
      setScreen('complete');
      return;
    }

    setCurrentDocumentIndex(nextIndex);
    setSignature(null);
    setError('');
    setSuccess('');
  };

  // ==========================================
  // SUBMIT SIGNATURE
  // ==========================================

  const submitSignature = async () => {
    if (!activeSession || !currentDocument || !signature) {
      setError('Please provide your signature before continuing.');
      return;
    }

    if (!currentDocument.requires_signature) {
      advanceDocument();
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const formData = new FormData();

      formData.append('sessionId', activeSession.session.id);
      formData.append('documentId', currentDocument.id);
      formData.append('signatureMethod', signature.method);

      if (signature.method === 'typed') {
        formData.append('signatureText', signature.value);
      } else {
        formData.append(
          'signature',
          signature.file,
          signature.file.name
        );
      }

      await customerApi(
        activeSession.customerToken
      ).post(
        '/signing-sessions/customer/signature',
        formData
      );

      setSuccess('Signature saved successfully.');

      advanceDocument();
    } catch (err: any) {
      setError(
        getErrorMessage(
          err,
          'Unable to submit your signature.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // RESET / DISCONNECT
  // ==========================================

  const returnToWaiting = () => {
    setActiveSession(null);
    setSignature(null);
    setCurrentDocumentIndex(0);
    setError('');
    setSuccess('');
    setScreen('waiting');
  };

  const disconnectStation = () => {
    const confirmed = window.confirm(
      'Remove this iPad pairing? Staff will need to generate a new pairing code before it can be used again.'
    );

    if (!confirmed) return;

    localStorage.removeItem(STATION_TOKEN_KEY);
    localStorage.removeItem(STATION_IDENTITY_KEY);

    setStationToken('');
    setStation(null);
    setActiveSession(null);
    setSignature(null);
    setScreen('pairing');
  };

  // ==========================================
  // SHARED KIOSK HEADER
  // ==========================================

  const kioskHeader = (
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <div className="d-flex align-items-center gap-2">
          <FaTabletAlt className="text-primary" />
          <h5 className="mb-0">ShelterHelper Signing</h5>
        </div>

        <small className="text-muted">
          {station?.name || 'Signing Station'}
        </small>
      </div>

      <Button
        size="sm"
        variant="outline-secondary"
        onClick={disconnectStation}
      >
        <FaSignOutAlt className="me-1" />
        Unpair
      </Button>
    </div>
  );

  // ==========================================
  // RENDER: PAIRING
  // ==========================================

  if (screen === 'pairing') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light py-4">
        <Container style={{ maxWidth: '520px' }}>
          <Card className="shadow border-0">
            <Card.Body className="p-4 p-md-5 text-center">
              <FaTabletAlt
                size={48}
                className="text-primary mb-3"
              />

              <h2 className="mb-2">Signing Station</h2>

              <p className="text-muted mb-4">
                Enter the pairing code provided by your staff member
                to connect this iPad.
              </p>

              {error && (
                <Alert variant="danger">{error}</Alert>
              )}

              <Form.Group className="mb-4">
                <Form.Control
                  size="lg"
                  className="text-center fw-bold"
                  style={{
                    letterSpacing: '5px',
                    fontSize: '1.5rem'
                  }}
                  value={pairingCode}
                  onChange={event =>
                    setPairingCode(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="PAIRING CODE"
                  autoComplete="off"
                  maxLength={12}
                />
              </Form.Group>

              <Button
                size="lg"
                className="w-100"
                onClick={pairStation}
                disabled={loading || !pairingCode.trim()}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Pairing...
                  </>
                ) : (
                  'Pair This iPad'
                )}
              </Button>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  // ==========================================
  // RENDER: LOADING
  // ==========================================

  if (loading && !station) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <Spinner animation="border" />
      </div>
    );
  }

  // ==========================================
  // RENDER: WAITING
  // ==========================================

  if (screen === 'waiting') {
    return (
      <div className="min-vh-100 bg-light py-4">
        <Container style={{ maxWidth: '760px' }}>
          {kioskHeader}

          <Card className="shadow-sm border-0 text-center">
            <Card.Body className="p-5">
              <FaFileSignature
                size={64}
                className="text-primary mb-4"
              />

              <h2 className="mb-3">Ready for Signing</h2>

              <p className="text-muted mb-4">
                When a staff member sends a document to this iPad,
                it will appear here.
              </p>

              {error && (
                <Alert variant="danger">{error}</Alert>
              )}

              {success && (
                <Alert variant="success">{success}</Alert>
              )}

              <Button
                size="lg"
                onClick={checkForSession}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Checking...
                  </>
                ) : (
                  <>
                    <FaSync className="me-2" />
                    Check for Documents
                  </>
                )}
              </Button>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  // ==========================================
  // RENDER: COMPLETE
  // ==========================================

  if (screen === 'complete') {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center py-4">
        <Container style={{ maxWidth: '760px' }}>
          {kioskHeader}

          <Card className="shadow-sm border-0 text-center">
            <Card.Body className="p-5">
              <FaCheckCircle
                size={72}
                className="text-success mb-4"
              />

              <h2 className="mb-3">Thank You!</h2>

              <p className="text-muted mb-4">
                Your documents have been signed successfully.
                You may now return the iPad to the staff member.
              </p>

              <Badge bg="success" className="p-2 mb-4">
                Signing Complete
              </Badge>

              <div>
                <Button
                  size="lg"
                  onClick={returnToWaiting}
                >
                  Return to Ready Screen
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  // ==========================================
  // RENDER: SIGNING
  // ==========================================

  if (!activeSession || !currentDocument) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light py-4">
      <Container style={{ maxWidth: '900px' }}>
        {kioskHeader}

        <Card className="shadow-sm border-0 mb-4">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <Badge bg="primary" className="mb-2">
                  Document {currentDocumentIndex + 1} of{' '}
                  {activeSession.documents.length}
                </Badge>

                <h3 className="mb-0">
                  {currentDocument.title}
                </h3>
              </div>

              <Badge
                bg={currentDocument.requires_signature ? 'warning' : 'info'}
                text="dark"
              >
                {currentDocument.requires_signature
                  ? 'Signature Required'
                  : 'Review Document'}
              </Badge>
            </div>

            {error && (
              <Alert variant="danger">{error}</Alert>
            )}

            {success && (
              <Alert variant="success">{success}</Alert>
            )}

            <div
              className="border rounded bg-white p-4 mb-4"
              style={{
                minHeight: '220px',
                maxHeight: '400px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6
              }}
            >
              {isPdf ? (
                <Alert variant="warning" className="mb-0">
                  PDF document display has not been connected yet.
                  This document cannot be signed from this screen
                  until PDF delivery is implemented.
                </Alert>
              ) : currentDocument.content_format === 'html' ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: currentDocument.content_text || ''
                  }}
                />
              ) : (
                currentDocument.content_text || ''
              )}
            </div>

            {currentDocument.requires_signature && (
              <>
                <hr />

                <h5 className="mb-2">Customer Signature</h5>

                <p className="text-muted">
                  Please review the document above and sign below.
                </p>

                <SignatureInput
                  value={signature}
                  onChange={setSignature}
                  disabled={submitting || isPdf}
                  label="Your Signature"
                />
              </>
            )}

            <div className="d-flex justify-content-between align-items-center mt-4 flex-wrap gap-2">
              <small className="text-muted">
                {currentDocument.requires_signature
                  ? `Required signatures: ${currentRequiredDocumentIndex + 1} of ${requiredDocuments.length}`
                  : 'Please review this document before continuing.'}
              </small>

              <Button
                size="lg"
                onClick={submitSignature}
                disabled={
                  submitting ||
                  (currentDocument.requires_signature &&
                    (!signature || isPdf))
                }
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Submitting...
                  </>
                ) : currentDocumentIndex + 1 <
                  activeSession.documents.length ? (
                  currentDocument.requires_signature
                    ? 'Sign & Continue'
                    : 'Continue'
                ) : (
                  currentDocument.requires_signature
                    ? 'Submit Signature'
                    : 'Finish'
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default SigningStation;