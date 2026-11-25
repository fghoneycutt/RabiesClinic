
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Col,
  Form,
  Modal,
  Row,
  Spinner
} from 'react-bootstrap';
import {
  FaCheckCircle,
  FaFileContract,
  FaPaperPlane,
  FaUser,
  FaWarehouse
} from 'react-icons/fa';

import {
  createCatTrapRental,
  createSigningSession,
  getCatTrapRentalSettings,
  getSigningStations,
  type CatTrapRental,
  type CatTrapRenterInformation,
  type CatTrapRentalSettings,
  type SigningStation
} from '../../api/catTrapRentals.api';

// ==========================================
// TYPES
// ==========================================

interface NewCatTrapRentalModalProps {
  show: boolean;
  onHide: () => void;
  onCreated: () => void | Promise<void>;
}

type RentalStep = 'details' | 'review' | 'sending';

type StationWithPairing = SigningStation & {
  is_paired?: boolean;
  last_seen_at?: string | null;
};

// ==========================================
// HELPERS
// ==========================================

const getLocalDate = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const addDaysToDate = (dateString: string, days: number) => {
  if (!dateString) return '';

  const [year, month, day] = dateString.split('-').map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const resultYear = date.getFullYear();
  const resultMonth = String(date.getMonth() + 1).padStart(2, '0');
  const resultDay = String(date.getDate()).padStart(2, '0');

  return `${resultYear}-${resultMonth}-${resultDay}`;
};

const formatCurrency = (amount: number | string | null | undefined) => {
  return Number(amount ?? 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
};

const formatDate = (date: string | null | undefined) => {
  if (!date) return '—';

  const [year, month, day] = date.slice(0, 10).split('-').map(Number);

  if (!year || !month || !day) return '—';

  return new Date(year, month - 1, day).toLocaleDateString();
};

// ==========================================
// COMPONENT
// ==========================================

const NewCatTrapRentalModal = ({
  show,
  onHide,
  onCreated
}: NewCatTrapRentalModalProps) => {
  // ----------------------------------------
  // STATE
  // ----------------------------------------

  const [step, setStep] = useState<RentalStep>('details');

  const [settings, setSettings] =
    useState<CatTrapRentalSettings | null>(null);

  const [stations, setStations] = useState<StationWithPairing[]>([]);

  const [rental, setRental] = useState<CatTrapRental | null>(null);

  const [selectedStationId, setSelectedStationId] = useState('');

  const [renterInformation, setRenterInformation] =
    useState<CatTrapRenterInformation>({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      secondary_address: '',
      city: '',
      county: '',
      state: 'NC',
      zip_code: ''
    });

  const [quantity, setQuantity] = useState(1);
  const [rentalDate, setRentalDate] = useState(getLocalDate());
  const [expectedReturnDate, setExpectedReturnDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ----------------------------------------
  // LOAD SETTINGS AND STATIONS
  // ----------------------------------------

  useEffect(() => {
    if (!show) return;

    let cancelled = false;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError('');

        const [settingsResult, stationsResult] = await Promise.all([
          getCatTrapRentalSettings(),
          getSigningStations()
        ]);

        if (cancelled) return;

        setSettings(settingsResult);
        setStations(stationsResult as StationWithPairing[]);

        const today = getLocalDate();

        setRentalDate(today);

        setExpectedReturnDate(
          addDaysToDate(
            today,
            Number(settingsResult.default_rental_days || 7)
          )
        );

        setQuantity(1);

        setRenterInformation({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          address: '',
          secondary_address: '',
          city: '',
          county: '',
          state: 'NC',
          zip_code: ''
        });

        setRental(null);
        setSelectedStationId('');
        setStep('details');
        setSuccess('');
      } catch (err: any) {
        console.error('Unable to initialize rental form:', err);

        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
            'Unable to load rental settings and signing stations.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [show]);

  // ----------------------------------------
  // AVAILABLE STATIONS
  // ----------------------------------------

  const availableStations = useMemo(() => {
    return stations.filter(
      (station) =>
        station.is_active &&
        station.is_paired === true
    );
  }, [stations]);

  // ----------------------------------------
  // FORM VALIDATION
  // ----------------------------------------

  const availableTraps = Number(settings?.total_traps ?? 0);

  const canCreateRental =
    Boolean(settings?.rental_contract_enabled) &&
    Boolean(settings?.rental_contract?.trim()) &&
    availableTraps > 0 &&
    quantity > 0 &&
    quantity <= availableTraps &&
    Boolean(renterInformation.first_name.trim()) &&
    Boolean(renterInformation.last_name.trim()) &&
    Boolean(renterInformation.phone.trim()) &&
    Boolean(renterInformation.address.trim()) &&
    Boolean(renterInformation.city.trim()) &&
    Boolean(renterInformation.state.trim()) &&
    /^\d{5}$/.test(renterInformation.zip_code.trim()) &&
    Boolean(rentalDate) &&
    Boolean(expectedReturnDate) &&
    expectedReturnDate >= rentalDate;

  // ----------------------------------------
  // RENTER FIELD HANDLER
  // ----------------------------------------

  const updateRenterField = (
    field: keyof CatTrapRenterInformation,
    value: string
  ) => {
    setRenterInformation((current) => ({
      ...current,
      [field]: value
    }));
  };

  // ----------------------------------------
  // CREATE PENDING RENTAL
  // ----------------------------------------

  const handleCreateRental = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!canCreateRental) {
      setError('Please complete all required fields and check your rental details.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await createCatTrapRental({
        renterInformation,
        quantity,
        rentalDate,
        expectedReturnDate
      });

      if (!response.rental) {
        throw new Error('The rental was created, but no rental record was returned.');
      }

      setRental(response.rental);
      setStep('review');

      setSuccess(
        'Rental created and inventory reserved. Review the contract before sending it to the signing station.'
      );
    } catch (err: any) {
      console.error('Unable to create cat trap rental:', err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Unable to create the rental.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------
  // SEND CONTRACT TO SIGNING STATION
  // ----------------------------------------

  const handleSendToStation = async () => {
    if (!rental) {
      setError('No rental record is available.');
      return;
    }

    if (!selectedStationId) {
      setError('Select a signing station first.');
      return;
    }

    if (!rental.rental_contract_snapshot?.trim()) {
      setError('The rental does not have a saved contract snapshot.');
      return;
    }

    try {
      setSending(true);
      setError('');

      const renterName = [
        renterInformation.first_name,
        renterInformation.last_name
      ].filter(Boolean).join(' ');

      const expiresAt = new Date(
        Date.now() + 30 * 60 * 1000
      ).toISOString();

      await createSigningSession({
        stationId: selectedStationId,
        sessionType: 'cat_trap_rental',
        sourceModule: 'cat_trap_rentals',
        sourceRecordType: 'rental',
        sourceRecordId: String(rental.id),
        expiresAt,
        documents: [
          {
            title: `Cat Trap Rental Agreement #${rental.id}`,
            documentType: 'rental_contract',
            contentFormat: 'html',
            contentText: rental.rental_contract_snapshot,
            requiresSignature: true,
            sortOrder: 0
          }
        ],
        signers: [
          {
            signerOrder: 1,
            signerRole: 'customer',
            displayName: renterName,
            email: renterInformation.email?.trim() || undefined
          }
        ]
      });

      setStep('sending');

      setSuccess(
        'The rental contract has been sent to the signing station.'
      );

      await onCreated();
      onHide();
    } catch (err: any) {
      console.error('Unable to send rental contract:', err);

      setError(
        err?.response?.data?.message ||
        'Unable to send the contract to the signing station. The pending rental has been retained so you can try again.'
      );
    } finally {
      setSending(false);
    }
  };

  // ----------------------------------------
  // CLOSE HANDLER
  // ----------------------------------------

  const handleClose = () => {
    if (saving || sending) return;

    onHide();
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="xl"
      centered
      backdrop={saving || sending ? 'static' : true}
      keyboard={!saving && !sending}
      scrollable
    >
      <Modal.Header closeButton={!saving && !sending}>
        <Modal.Title className="fw-bold">
          <FaFileContract className="me-2 text-primary" />

          {step === 'details' && 'New Cat Trap Rental'}
          {step === 'review' && 'Review Rental Contract'}
          {step === 'sending' && 'Rental Contract Sent'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        {/* LOADING */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <div className="text-muted mt-3">
              Loading rental information...
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* ERROR */}
            {error && (
              <Alert
                variant="danger"
                dismissible
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}

            {/* SUCCESS */}
            {success && (
              <Alert variant="success">
                <FaCheckCircle className="me-2" />
                {success}
              </Alert>
            )}

            {/* STEP INDICATOR */}
            <div className="d-flex align-items-center gap-2 mb-4">
              <Badge bg={step === 'details' ? 'primary' : 'success'}>
                1. Rental Details
              </Badge>

              <span className="text-muted">→</span>

              <Badge bg={step === 'review' ? 'primary' : step === 'sending' ? 'success' : 'secondary'}>
                2. Review Contract
              </Badge>

              <span className="text-muted">→</span>

              <Badge bg={step === 'sending' ? 'success' : 'secondary'}>
                3. Send to iPad
              </Badge>
            </div>

            {/* ================================== */}
            {/* STEP 1: RENTAL DETAILS */}
            {/* ================================== */}

            {step === 'details' && (
              <Form onSubmit={handleCreateRental}>
                {/* INVENTORY SUMMARY */}
                <Alert variant="info">
                  <div className="d-flex align-items-center gap-2">
                    <FaWarehouse />
                    <strong>Available inventory: {availableTraps} trap(s)</strong>
                  </div>

                  <div className="small mt-1">
                    The requested traps will be reserved when the rental
                    is created. They will not become an active rental
                    until the customer signs.
                  </div>
                </Alert>

                {/* CONTRACT CONFIGURATION */}
                {!settings?.rental_contract_enabled ||
                  !settings?.rental_contract?.trim() ? (
                  <Alert variant="danger">
                    <strong>Rental contract not configured.</strong>
                    <div className="small mt-1">
                      Enable and configure the rental contract in Cat Trap
                      Rental Settings before creating a rental.
                    </div>
                  </Alert>
                ) : null}

                {/* RENTER INFORMATION */}
                <h5 className="fw-bold mb-3">
                  <FaUser className="me-2 text-muted" />
                  Renter Information
                </h5>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>
                        First Name <span className="text-danger">*</span>
                      </Form.Label>

                      <Form.Control
                        required
                        value={renterInformation.first_name}
                        onChange={(e) =>
                          updateRenterField('first_name', e.target.value)
                        }
                        autoComplete="given-name"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>
                        Last Name <span className="text-danger">*</span>
                      </Form.Label>

                      <Form.Control
                        required
                        value={renterInformation.last_name}
                        onChange={(e) =>
                          updateRenterField('last_name', e.target.value)
                        }
                        autoComplete="family-name"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>
                        Phone Number <span className="text-danger">*</span>
                      </Form.Label>

                      <Form.Control
                        required
                        type="tel"
                        value={renterInformation.phone}
                        onChange={(e) =>
                          updateRenterField('phone', e.target.value)
                        }
                        autoComplete="tel"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Email Address</Form.Label>

                      <Form.Control
                        type="email"
                        value={renterInformation.email || ''}
                        onChange={(e) =>
                          updateRenterField('email', e.target.value)
                        }
                        autoComplete="email"
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>
                        Street Address <span className="text-danger">*</span>
                      </Form.Label>

                      <Form.Control
                        required
                        value={renterInformation.address}
                        onChange={(e) =>
                          updateRenterField('address', e.target.value)
                        }
                        autoComplete="address-line1"
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Apartment, Suite, etc.</Form.Label>

                      <Form.Control
                        value={renterInformation.secondary_address || ''}
                        onChange={(e) =>
                          updateRenterField('secondary_address', e.target.value)
                        }
                        autoComplete="address-line2"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={5}>
                    <Form.Group>
                      <Form.Label>
                        City <span className="text-danger">*</span>
                      </Form.Label>

                      <Form.Control
                        required
                        value={renterInformation.city}
                        onChange={(e) =>
                          updateRenterField('city', e.target.value)
                        }
                        autoComplete="address-level2"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>County</Form.Label>

                      <Form.Control
                        value={renterInformation.county || ''}
                        onChange={(e) =>
                          updateRenterField('county', e.target.value)
                        }
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>
                        State <span className="text-danger">*</span>
                      </Form.Label>

                      <Form.Control
                        required
                        value={renterInformation.state}
                        onChange={(e) =>
                          updateRenterField('state', e.target.value)
                        }
                        autoComplete="address-level1"
                      />
                    </Form.Group>
                  </Col>

                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>
                        ZIP <span className="text-danger">*</span>
                      </Form.Label>

                      <Form.Control
                        required
                        inputMode="numeric"
                        maxLength={5}
                        value={renterInformation.zip_code}
                        onChange={(e) =>
                          updateRenterField(
                            'zip_code',
                            e.target.value.replace(/\D/g, '').slice(0, 5)
                          )
                        }
                        autoComplete="postal-code"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <hr className="my-4" />

                {/* RENTAL DETAILS */}
                <h5 className="fw-bold mb-3">
                  <FaWarehouse className="me-2 text-muted" />
                  Rental Details
                </h5>

                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>
                        Number of Traps <span className="text-danger">*</span>
                      </Form.Label>

                      <Form.Control
                        required
                        type="number"
                        min={1}
                        max={availableTraps}
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(Math.max(1, Number(e.target.value) || 1))
                        }
                      />

                      <Form.Text className="text-muted">
                        {availableTraps} currently available
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>
                        Rental Date <span className="text-danger">*</span>
                      </Form.Label>

                      <Form.Control
                        required
                        type="date"
                        value={rentalDate}
                        onChange={(e) => {
                          setRentalDate(e.target.value);

                          if (
                            e.target.value &&
                            expectedReturnDate < e.target.value
                          ) {
                            setExpectedReturnDate(e.target.value);
                          }
                        }}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>
                        Expected Return Date <span className="text-danger">*</span>
                      </Form.Label>

                      <Form.Control
                        required
                        type="date"
                        min={rentalDate}
                        value={expectedReturnDate}
                        onChange={(e) =>
                          setExpectedReturnDate(e.target.value)
                        }
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Alert variant="light" className="border mt-4 mb-0">
                  <Row className="g-2">
                    <Col xs={6}>
                      <div className="text-muted small">Deposit per rental</div>
                      <div className="fw-bold">
                        {formatCurrency(settings?.deposit_amount)}
                      </div>
                    </Col>

                    <Col xs={6}>
                      <div className="text-muted small">Total deposit</div>
                      <div className="fw-bold">
                        {formatCurrency(
                          Number(settings?.deposit_amount ?? 0) * quantity
                        )}
                      </div>
                    </Col>
                  </Row>

                  <div className="text-muted small mt-2">
                    Deposit information is shown for reference. No payment
                    is collected through this signing workflow.
                  </div>
                </Alert>

                <div className="d-flex justify-content-end mt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!canCreateRental || saving}
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Creating Rental...
                      </>
                    ) : (
                      <>
                        <FaFileContract className="me-2" />
                        Create Rental & Review Contract
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            )}

            {/* ================================== */}
            {/* STEP 2: CONTRACT REVIEW */}
            {/* ================================== */}

            {step === 'review' && rental && (
              <>
                <Alert variant="info">
                  <strong>Review the contract before sending it.</strong>
                  <div className="small mt-1">
                    This is the saved contract snapshot attached to rental
                    #{rental.id}. The customer will see this document on
                    the signing station.
                  </div>
                </Alert>

                {/* RENTAL SUMMARY */}
                <div className="border rounded p-3 mb-4">
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="text-muted small">Renter</div>
                      <div className="fw-semibold">
                        {renterInformation.first_name}{' '}
                        {renterInformation.last_name}
                      </div>
                    </Col>

                    <Col md={6}>
                      <div className="text-muted small">Phone</div>
                      <div className="fw-semibold">
                        {renterInformation.phone}
                      </div>
                    </Col>

                    <Col md={4}>
                      <div className="text-muted small">Quantity</div>
                      <div className="fw-semibold">
                        {rental.quantity} trap(s)
                      </div>
                    </Col>

                    <Col md={4}>
                      <div className="text-muted small">Rental Date</div>
                      <div className="fw-semibold">
                        {formatDate(rental.rental_date)}
                      </div>
                    </Col>

                    <Col md={4}>
                      <div className="text-muted small">Expected Return</div>
                      <div className="fw-semibold">
                        {formatDate(rental.expected_return_date)}
                      </div>
                    </Col>
                  </Row>

                  <div className="mt-3">
                    <Badge bg="warning" text="dark">
                      Pending Signature
                    </Badge>
                    <span className="text-muted small ms-2">
                      Rental #{rental.id}
                    </span>
                  </div>
                </div>

                {/* CONTRACT SNAPSHOT */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0">
                      <FaFileContract className="me-2 text-muted" />
                      Rental Contract
                    </h6>
                    <Badge bg="secondary">Saved Snapshot</Badge>
                  </div>

                  <div
                    className="border rounded p-3 bg-white"
                    style={{
                      maxHeight: '420px',
                      overflowY: 'auto'
                    }}
                  >
                    <div
                      className="rental-contract-preview"
                      dangerouslySetInnerHTML={{
                        __html: rental.rental_contract_snapshot || ''
                      }}
                    />
                  </div>
                </div>

                {/* STATION SELECTOR */}
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    <FaWarehouse className="me-2 text-muted" />
                    Signing Station
                  </Form.Label>

                  {availableStations.length === 0 ? (
                    <Alert variant="warning" className="mb-0">
                      No active, paired signing stations are available.
                      Pair and activate an iPad before sending this contract.
                    </Alert>
                  ) : (
                    <>
                      <Form.Select
                        value={selectedStationId}
                        onChange={(e) =>
                          setSelectedStationId(e.target.value)
                        }
                      >
                        <option value="">Select a signing station...</option>

                        {availableStations.map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.name}
                          </option>
                        ))}
                      </Form.Select>

                      <Form.Text className="text-muted">
                        The selected iPad will receive this rental contract.
                        The customer will review and sign it there.
                      </Form.Text>
                    </>
                  )}
                </Form.Group>

                <Alert variant="light" className="border mt-4 mb-0">
                  <div className="fw-semibold mb-1">
                    What happens next?
                  </div>
                  <ol className="small mb-0 ps-3">
                    <li>The contract is sent to the selected iPad.</li>
                    <li>The customer reviews the contract.</li>
                    <li>The customer signs on the iPad.</li>
                    <li>The rental becomes active after successful signing.</li>
                  </ol>
                </Alert>

                <div className="d-flex flex-wrap justify-content-between gap-2 mt-4">
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      setError('');
                      setSuccess('');
                      setRental(null);
                      setStep('details');
                    }}
                  >
                    Back
                  </Button>

                  <Button
                    variant="primary"
                    onClick={handleSendToStation}
                    disabled={
                      !selectedStationId ||
                      availableStations.length === 0 ||
                      sending
                    }
                  >
                    {sending ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane className="me-2" />
                        Send Contract to iPad
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-muted small mt-3">
                  If you leave this screen without sending the contract,
                  the rental will remain pending signature and its traps
                  will remain reserved.
                </div>
              </>
            )}

            {/* ================================== */}
            {/* STEP 3: SENT */}
            {/* ================================== */}

            {step === 'sending' && (
              <div className="text-center py-5">
                <FaCheckCircle
                  size={56}
                  className="text-success mb-3"
                />

                <h4 className="fw-bold">Contract Sent</h4>

                <p className="text-muted mb-0">
                  The rental contract has been sent to the signing station.
                  The rental will become active after the customer signs.
                </p>
              </div>
            )}
          </>
        )}
      </Modal.Body>

      {step === 'details' && !loading && (
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Close
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default NewCatTrapRentalModal;