
import { useEffect, useState } from 'react';
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
  FaCalendarAlt,
  FaCheckCircle,
  FaEdit,
  FaFileSignature,
  FaHistory,
  FaPrint,
  FaUndo
} from 'react-icons/fa';

import {
  createSigningSession,
  getCatTrapRentalSettings,
  getSigningStations,
  getCatTrapRentalPrintData,
  updateCatTrapRentalReturnDetails,
  type CatTrapRental,
  type SigningStation
} from '../../api/catTrapRentals.api';

import { api } from '../../api/api';

// ==========================================
// PROPS
// ==========================================

interface ManageCatTrapRentalModalProps {
  show: boolean;
  rental: CatTrapRental | null;
  onHide: () => void;
  onUpdated: () => Promise<void> | void;
}

// ==========================================
// HELPERS
// ==========================================

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString();
};

const formatCurrency = (value: number | string | null | undefined) => {
  return Number(value ?? 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
};

const getRenterName = (rental: CatTrapRental) => {
  return [
    rental.renter_information?.first_name,
    rental.renter_information?.last_name
  ].filter(Boolean).join(' ') || 'Unknown renter';
};

const getStatus = (rental: CatTrapRental) => {
  if (rental.status === 'pending_signature') {
    return <Badge bg="warning" text="dark">Pending Signature</Badge>;
  }

  if (rental.status === 'returned') {
    return <Badge bg="success">Returned</Badge>;
  }

  if (rental.status === 'cancelled') {
    return <Badge bg="secondary">Cancelled</Badge>;
  }

  if (rental.expected_return_date < today()) {
    return <Badge bg="danger">Overdue</Badge>;
  }

  return <Badge bg="primary">Active</Badge>;
};

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ==========================================
// COMPONENT
// ==========================================

const ManageCatTrapRentalModal = ({
  show,
  rental,
  onHide,
  onUpdated
}: ManageCatTrapRentalModalProps) => {
  const [stations, setStations] = useState<SigningStation[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);

  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [returnDate, setReturnDate] = useState(today());
  const [stationId, setStationId] = useState('');
  const [depositReturned, setDepositReturned] = useState(false);
  const [returnNotes, setReturnNotes] = useState('');

  const [savingDueDate, setSavingDueDate] = useState(false);
  const [sendingReturn, setSendingReturn] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Completed return editing
  const [editingReturn, setEditingReturn] = useState(false);
  const [editReturnDate, setEditReturnDate] = useState('');
  const [editDepositReturned, setEditDepositReturned] = useState(false);
  const [editReturnNotes, setEditReturnNotes] = useState('');
  const [savingReturnDetails, setSavingReturnDetails] = useState(false);

  // Contract printing
  const [printingContract, setPrintingContract] = useState(false);

  // ==========================================
  // LOAD STATIONS AND DEFAULT VALUES
  // ==========================================

  useEffect(() => {
    if (!show || !rental) return;

    setError('');
    setSuccess('');

    setExpectedReturnDate(
      rental.expected_return_date?.slice(0, 10) || ''
    );

    setReturnDate(today());
    setStationId('');
    setDepositReturned(false);
    setReturnNotes('');

    setEditingReturn(false);
    setEditReturnDate(rental.return_date?.slice(0, 10) || today());
    setEditDepositReturned(Boolean(rental.deposit_returned));
    setEditReturnNotes(rental.return_notes || '');

    let cancelled = false;

    const loadStations = async () => {
      try {
        setLoadingStations(true);

        const result = await getSigningStations();

        if (cancelled) return;

        const availableStations = result.filter(
          station => station.is_active && station.is_paired
        );

        setStations(availableStations);

        if (availableStations.length === 1) {
          setStationId(availableStations[0].id);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Unable to load signing stations:', err);

          setError(
            err?.response?.data?.message ||
            'Unable to load signing stations.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingStations(false);
        }
      }
    };

    loadStations();

    return () => {
      cancelled = true;
    };
  }, [show, rental]);

  if (!rental) {
    return null;
  }

  const isActive = rental.status === 'active';
  const isReturned = rental.status === 'returned';

  // ==========================================
  // EXTEND DUE DATE
  // ==========================================

  const handleExtendDueDate = async (newDate: string) => {
    if (
      !newDate ||
      newDate === rental.expected_return_date.slice(0, 10)
    ) {
      return;
    }

    try {
      setSavingDueDate(true);
      setError('');
      setSuccess('');

      await api.patch(
        `/cat-trap-rentals/rentals/${rental.id}/extend`,
        {
          expectedReturnDate: newDate
        }
      );

      setSuccess('Due date saved successfully.');

      await onUpdated();
    } catch (err: any) {
      console.error('Unable to update rental due date:', err);

      setError(
        err?.response?.data?.message ||
        'Unable to save the new due date.'
      );

      setExpectedReturnDate(
        rental.expected_return_date.slice(0, 10)
      );
    } finally {
      setSavingDueDate(false);
    }
  };

  // ==========================================
  // SEND RETURN CONTRACT TO SIGNING STATION
  // ==========================================

  const handleSendReturnForSignature = async () => {
    if (!stationId) {
      setError('Please select a signing station.');
      return;
    }

    if (!returnDate) {
      setError('Please select the return date.');
      return;
    }

    if (returnDate > today()) {
      setError('The return date cannot be in the future.');
      return;
    }

    const selectedStation = stations.find(
      station => station.id === stationId
    );

    if (!selectedStation) {
      setError('The selected signing station is unavailable.');
      return;
    }

    try {
      setSendingReturn(true);
      setError('');
      setSuccess('');

      const settings = await getCatTrapRentalSettings();

      const renterName = getRenterName(rental);

      const contractText =
        settings.return_contract_enabled &&
        settings.return_contract?.trim()
          ? settings.return_contract.trim()
          : `CAT TRAP RETURN ACKNOWLEDGMENT

Renter: ${renterName}
Rental ID: ${rental.id}
Number of traps returned: ${rental.quantity}
Original rental date: ${formatDate(rental.rental_date)}
Expected return date: ${formatDate(rental.expected_return_date)}

The renter acknowledges the return of the cat trap equipment listed above.`;

      const returnDetails = `

RETURN DETAILS

Actual return date: ${formatDate(returnDate)}
Deposit refunded: ${depositReturned ? 'Yes' : 'No'}
Deposit amount: ${formatCurrency(rental.deposit_amount)}
${returnNotes.trim() ? `Return notes: ${returnNotes.trim()}` : ''}`;

      const expiresAt = new Date(
        Date.now() + 30 * 60 * 1000
      ).toISOString();

      const sessionData = {
        stationId,
        sessionType: 'cat_trap_rental_return',
        sourceModule: 'cat_trap_rentals',
        sourceRecordType: 'rental_return',
        sourceRecordId: String(rental.id),
        expiresAt,

        metadata: {
          returnDate,
          depositReturned,
          notes: returnNotes.trim() || null
        },

        documents: [
          {
            title: `Cat Trap Return - Rental #${rental.id}`,
            documentType: 'cat_trap_rental_return',
            contentFormat: 'plain_text' as const,
            contentText: `${contractText}${returnDetails}`,
            requiresSignature: true,
            sortOrder: 0
          }
        ],

        signers: [
          {
            signerOrder: 1,
            displayName: renterName,
            signerRole: 'customer',
            email: rental.renter_information?.email || undefined
          }
        ]
      };

      await createSigningSession(
        sessionData as Parameters<typeof createSigningSession>[0]
      );

      setSuccess(
        `The return contract has been queued for ${selectedStation.name}. ` +
        'The rental will remain active until the customer signs.'
      );

      await onUpdated();
    } catch (err: any) {
      console.error('Unable to create return signing session:', err);

      setError(
        err?.response?.data?.message ||
        'Unable to send the return contract to the signing station.'
      );
    } finally {
      setSendingReturn(false);
    }
  };

  // ==========================================
  // PRINT SIGNED CONTRACT
  // ==========================================

  const handlePrintContract = async (
    contractType: 'rental' | 'returned'
  ) => {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      setError(
        'Your browser blocked the print window. Please allow pop-ups for this site and try again.'
      );
      return;
    }

    try {
      setPrintingContract(true);
      setError('');
      setSuccess('');

      const printData = await getCatTrapRentalPrintData(rental.id);

      const contract =
        contractType === 'rental'
          ? printData.rental.rental_contract_snapshot
          : printData.rental.return_contract_snapshot;

      const signaturePath =
        contractType === 'rental'
          ? printData.signatures.rental
          : printData.signatures.returned;

      const signatureText =
        contractType === 'rental'
          ? printData.rental.rental_signature_text
          : printData.rental.return_signature_text;

      const signatureMethod =
        contractType === 'rental'
          ? printData.rental.rental_signature_method
          : printData.rental.return_signature_method;

      if (!contract?.trim()) {
        printWindow.close();
        setError(
          `No saved ${contractType === 'rental' ? 'rental' : 'return'} contract was found for this rental.`
        );
        return;
      }

      const title =
        contractType === 'rental'
          ? `Cat Trap Rental Agreement #${rental.id}`
          : `Cat Trap Return Agreement #${rental.id}`;

      let signatureMarkup = '';

      if (signaturePath) {
        signatureMarkup = `
          <div class="signature">
            <img src="${escapeHtml(signaturePath)}" alt="Customer signature" />
          </div>
        `;
      } else if (signatureText) {
        signatureMarkup = `
          <div class="typed-signature">
            ${escapeHtml(signatureText)}
          </div>
        `;
      } else {
        signatureMarkup = `
          <p class="signature-missing">Signature image unavailable.</p>
        `;
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${escapeHtml(title)}</title>
            <meta charset="UTF-8" />
            <style>
              body {
                font-family: Arial, sans-serif;
                color: #222;
                margin: 0;
                padding: 40px;
                font-size: 12pt;
              }

              h1 {
                font-size: 18pt;
                margin-bottom: 24px;
              }

              .contract {
                white-space: pre-wrap;
                line-height: 1.5;
                overflow-wrap: anywhere;
              }

              .signature-section {
                margin-top: 40px;
                page-break-inside: avoid;
              }

              .signature-section h2 {
                font-size: 12pt;
                margin-bottom: 12px;
              }

              .signature {
                margin-top: 12px;
              }

              .signature img {
                max-width: 300px;
                max-height: 120px;
                object-fit: contain;
              }

              .typed-signature {
                font-family: cursive;
                font-size: 24pt;
                margin-top: 12px;
              }

              .signature-missing {
                color: #777;
                font-style: italic;
              }

              @media print {
                body {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <h1>${escapeHtml(title)}</h1>

            <div class="contract">${escapeHtml(contract)}</div>

            <div class="signature-section">
              <h2>Customer Signature</h2>
              ${signatureMarkup}
              <p>
                Signature method:
                ${escapeHtml(signatureMethod || 'Unavailable')}
              </p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };

      // Fallback in case the browser does not fire the load event
      // after document.write().
      window.setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.focus();
          printWindow.print();
        }
      }, 750);

      setSuccess(
        `${contractType === 'rental' ? 'Rental' : 'Return'} contract opened for printing.`
      );
    } catch (err: any) {
      console.error('Unable to print rental contract:', err);

      if (!printWindow.closed) {
        printWindow.close();
      }

      setError(
        err?.response?.data?.message ||
        'Unable to retrieve the signed contract for printing.'
      );
    } finally {
      setPrintingContract(false);
    }
  };

  // ==========================================
  // EDIT COMPLETED RETURN DETAILS
  // ==========================================

  const handleSaveReturnDetails = async () => {
    if (!editReturnDate) {
      setError('Please select the actual return date.');
      return;
    }

    if (editReturnDate > today()) {
      setError('The return date cannot be in the future.');
      return;
    }

    if (editReturnDate < rental.rental_date.slice(0, 10)) {
      setError('The return date cannot be before the original rental date.');
      return;
    }

    if (editReturnNotes.length > 5000) {
      setError('Return notes cannot exceed 5,000 characters.');
      return;
    }

    try {
      setSavingReturnDetails(true);
      setError('');
      setSuccess('');

      await updateCatTrapRentalReturnDetails(rental.id, {
        returnDate: editReturnDate,
        depositReturned: editDepositReturned,
        returnNotes: editReturnNotes.trim()
      });

      setEditingReturn(false);

      setSuccess('Return details updated successfully.');

      await onUpdated();
    } catch (err: any) {
      console.error('Unable to update return details:', err);

      setError(
        err?.response?.data?.message ||
        'Unable to update the return details.'
      );
    } finally {
      setSavingReturnDetails(false);
    }
  };

  const handleCancelReturnEdit = () => {
    setEditReturnDate(rental.return_date?.slice(0, 10) || today());
    setEditDepositReturned(Boolean(rental.deposit_returned));
    setEditReturnNotes(rental.return_notes || '');
    setEditingReturn(false);
    setError('');
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">
          <FaHistory className="me-2 text-muted" />
          Rental #{rental.id}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
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

        {/* RENTAL INFORMATION */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0">Rental Information</h5>
          {getStatus(rental)}
        </div>

        <div className="border rounded p-3 mb-4">
          <Row className="g-3">
            <Col md={6}>
              <div className="text-muted small">Renter</div>
              <div className="fw-semibold">{getRenterName(rental)}</div>
            </Col>

            <Col md={6}>
              <div className="text-muted small">Phone</div>
              <div>{rental.renter_information?.phone || '—'}</div>
            </Col>

            <Col md={6}>
              <div className="text-muted small">Email</div>
              <div>{rental.renter_information?.email || '—'}</div>
            </Col>

            <Col md={6}>
              <div className="text-muted small">Quantity</div>
              <div>{rental.quantity} trap(s)</div>
            </Col>

            <Col md={6}>
              <div className="text-muted small">Rental Date</div>
              <div>{formatDate(rental.rental_date)}</div>
            </Col>

            <Col md={6}>
              <div className="text-muted small">Expected Return</div>
              <div className="fw-semibold">
                {formatDate(rental.expected_return_date)}
              </div>
            </Col>

            <Col md={6}>
              <div className="text-muted small">Deposit</div>
              <div>{formatCurrency(rental.deposit_amount)}</div>
            </Col>

            <Col md={6}>
              <div className="text-muted small">Deposit Refunded</div>
              <div>
                {isReturned
                  ? editDepositReturned
                    ? <Badge bg="success">Yes</Badge>
                    : <Badge bg="secondary">No</Badge>
                  : 'Not yet recorded'}
              </div>
            </Col>

            {isReturned && (
              <>
                <Col md={6}>
                  <div className="text-muted small">Actual Return Date</div>
                  <div>{formatDate(editReturnDate)}</div>
                </Col>

                <Col md={6}>
                  <div className="text-muted small">Return Signature</div>
                  <div>
                    {rental.return_signature_method
                      ? <Badge bg="success">{rental.return_signature_method}</Badge>
                      : '—'}
                  </div>
                </Col>
              </>
            )}
          </Row>

          {rental.notes && (
            <div className="mt-3 pt-3 border-top">
              <div className="text-muted small">Rental Notes</div>
              <div>{rental.notes}</div>
            </div>
          )}

          {/* PRINT CONTRACTS */}
          {(isActive || isReturned) && (
            <div className="mt-3 pt-3 border-top">
              <div className="d-flex flex-wrap gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handlePrintContract('rental')}
                  disabled={printingContract}
                >
                  {printingContract ? (
                    <Spinner size="sm" className="me-2" />
                  ) : (
                    <FaPrint className="me-2" />
                  )}
                  Print Rental Contract
                </Button>

                {isReturned && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handlePrintContract('returned')}
                    disabled={printingContract}
                  >
                    {printingContract ? (
                      <Spinner size="sm" className="me-2" />
                    ) : (
                      <FaPrint className="me-2" />
                    )}
                    Print Return Contract
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* EXTEND DUE DATE */}
        {isActive && (
          <>
            <h5 className="fw-bold mb-3">
              <FaCalendarAlt className="me-2 text-muted" />
              Extend Due Date
            </h5>

            <div className="border rounded p-3 mb-4">
              <p className="text-muted small mb-3">
                Current due date:{' '}
                <strong>
                  {formatDate(rental.expected_return_date)}
                </strong>
              </p>

              <Row className="align-items-end g-2">
                <Col sm={8}>
                  <Form.Group>
                    <Form.Label>Expected Return Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={expectedReturnDate}
                      disabled={savingDueDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setExpectedReturnDate(newDate);
                        handleExtendDueDate(newDate);
                      }}
                    />
                  </Form.Group>
                </Col>

                <Col sm={4}>
                  {savingDueDate ? (
                    <div className="text-primary small pb-2">
                      <Spinner size="sm" className="me-2" />
                      Saving date...
                    </div>
                  ) : success ? (
                    <div className="text-success small pb-2">
                      <FaCheckCircle className="me-2" />
                      Saved
                    </div>
                  ) : (
                    <div className="text-muted small pb-2">
                      Changes save automatically
                    </div>
                  )}
                </Col>
              </Row>
            </div>

            {/* PROCESS RETURN */}
            <h5 className="fw-bold mb-3">
              <FaUndo className="me-2 text-muted" />
              Process Return
            </h5>

            <div className="border rounded p-3">
              <Alert variant="info" className="small">
                The return contract will be sent to the selected iPad.
                This rental will remain active until the customer signs
                the return contract.
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label>Return Date</Form.Label>
                <Form.Control
                  type="date"
                  value={returnDate}
                  max={today()}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Deposit has been refunded to the renter"
                  checked={depositReturned}
                  onChange={(e) => setDepositReturned(e.target.checked)}
                />
                <Form.Text className="text-muted">
                  This records the refund confirmation only. No payment
                  is processed or tracked in the app.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Return Notes (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Any notes about the returned traps..."
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Signing Station</Form.Label>

                {loadingStations ? (
                  <div className="text-muted small">
                    <Spinner size="sm" className="me-2" />
                    Loading signing stations...
                  </div>
                ) : stations.length === 0 ? (
                  <Alert variant="warning" className="mb-0">
                    No active, paired signing stations are available.
                    Pair an iPad in Signing Sessions before processing
                    this return.
                  </Alert>
                ) : (
                  <Form.Select
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                  >
                    <option value="">Select a signing station...</option>
                    {stations.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name}
                      </option>
                    ))}
                  </Form.Select>
                )}
              </Form.Group>

              <Button
                variant="primary"
                className="w-100"
                onClick={handleSendReturnForSignature}
                disabled={
                  sendingReturn ||
                  loadingStations ||
                  stations.length === 0 ||
                  !stationId
                }
              >
                {sendingReturn ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Sending to Signing Station...
                  </>
                ) : (
                  <>
                    <FaFileSignature className="me-2" />
                    Send Return Contract for Signature
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* PENDING SIGNATURE */}
        {rental.status === 'pending_signature' && (
          <Alert variant="warning" className="mb-0">
            This rental is waiting for the customer to sign its original
            rental contract. It cannot be extended or returned until
            checkout signing is complete.
          </Alert>
        )}

        {/* RETURNED */}
        {isReturned && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Return Details</h5>

              {!editingReturn && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => {
                    setEditingReturn(true);
                    setError('');
                    setSuccess('');
                  }}
                >
                  <FaEdit className="me-2" />
                  Edit Return Details
                </Button>
              )}
            </div>

            <div className="border rounded p-3 mb-3">
              {editingReturn ? (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Actual Return Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={editReturnDate}
                      min={rental.rental_date.slice(0, 10)}
                      max={today()}
                      disabled={savingReturnDetails}
                      onChange={(e) => setEditReturnDate(e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Deposit has been refunded to the renter"
                      checked={editDepositReturned}
                      disabled={savingReturnDetails}
                      onChange={(e) =>
                        setEditDepositReturned(e.target.checked)
                      }
                    />
                    <Form.Text className="text-muted">
                      This only updates the refund record. It does not
                      process a payment.
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Return Notes</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      maxLength={5000}
                      value={editReturnNotes}
                      disabled={savingReturnDetails}
                      onChange={(e) => setEditReturnNotes(e.target.value)}
                      placeholder="Notes about the returned traps..."
                    />
                    <Form.Text className="text-muted">
                      {editReturnNotes.length}/5000 characters
                    </Form.Text>
                  </Form.Group>

                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={handleCancelReturnEdit}
                      disabled={savingReturnDetails}
                    >
                      Cancel
                    </Button>

                    <Button
                      variant="primary"
                      onClick={handleSaveReturnDetails}
                      disabled={savingReturnDetails}
                    >
                      {savingReturnDetails ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle className="me-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Row className="g-3">
                    <Col md={6}>
                      <div className="text-muted small">Actual Return Date</div>
                      <div className="fw-semibold">
                        {formatDate(editReturnDate)}
                      </div>
                    </Col>

                    <Col md={6}>
                      <div className="text-muted small">Deposit Refunded</div>
                      <div>
                        {editDepositReturned
                          ? <Badge bg="success">Yes</Badge>
                          : <Badge bg="secondary">No</Badge>}
                      </div>
                    </Col>
                  </Row>

                  {editReturnNotes && (
                    <div className="mt-3 pt-3 border-top">
                      <div className="text-muted small">Return Notes</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {editReturnNotes}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!editingReturn && (
              <Alert variant="success" className="mb-0">
                <FaCheckCircle className="me-2" />
                This rental has been returned and its return signing process
                is complete.
              </Alert>
            )}
          </>
        )}

        {/* CANCELLED */}
        {rental.status === 'cancelled' && (
          <Alert variant="secondary" className="mb-0">
            This rental was cancelled.
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ManageCatTrapRentalModal;