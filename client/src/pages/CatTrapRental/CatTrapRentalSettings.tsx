
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Row,
  Spinner
} from 'react-bootstrap';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaFileContract,
  FaSave,
  FaWarehouse
} from 'react-icons/fa';

import {
  getCatTrapRentalSettings,
  updateCatTrapRentalSettings,
  type CatTrapRentalSettingsUpdate
} from '../../api/catTrapRentals.api';

const CatTrapRentalSettings = () => {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<CatTrapRentalSettingsUpdate>({
    totalTraps: 0,
    defaultRentalDays: 14,
    depositAmount: 0,
    rentalContractEnabled: false,
    rentalContract: '',
    returnContractEnabled: false,
    returnContract: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getCatTrapRentalSettings();

        setSettings({
          totalTraps: data.total_traps,
          defaultRentalDays: data.default_rental_days,
          depositAmount: Number(data.deposit_amount),
          rentalContractEnabled: data.rental_contract_enabled,
          rentalContract: data.rental_contract || '',
          returnContractEnabled: data.return_contract_enabled,
          returnContract: data.return_contract || ''
        });
      } catch (err: any) {
        console.error('Unable to load cat trap rental settings:', err);

        setError(
          err?.response?.data?.message ||
          'Unable to load rental settings.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateField = <K extends keyof CatTrapRentalSettingsUpdate>(
    field: K,
    value: CatTrapRentalSettingsUpdate[K]
  ) => {
    setSettings((previous) => ({
      ...previous,
      [field]: value
    }));

    setSuccess('');
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!Number.isInteger(settings.totalTraps) || settings.totalTraps < 0) {
      setError('Total trap inventory must be a whole number of zero or greater.');
      return;
    }

    if (
      !Number.isInteger(settings.defaultRentalDays) ||
      settings.defaultRentalDays <= 0
    ) {
      setError('Default rental period must be at least one day.');
      return;
    }

    if (!Number.isFinite(settings.depositAmount) || settings.depositAmount < 0) {
      setError('Deposit amount must be zero or greater.');
      return;
    }

    if (
      settings.rentalContractEnabled &&
      !(settings.rentalContract || '').trim()
    ) {
      setError('Enter a rental contract before enabling it.');
      return;
    }

    if (
      settings.returnContractEnabled &&
      !(settings.returnContract || '').trim()
    ) {
      setError('Enter a return contract before enabling it.');
      return;
    }

    try {
      setSaving(true);

      const response = await updateCatTrapRentalSettings(settings);

      setSettings({
        totalTraps: response.settings.total_traps,
        defaultRentalDays: response.settings.default_rental_days,
        depositAmount: Number(response.settings.deposit_amount),
        rentalContractEnabled: response.settings.rental_contract_enabled,
        rentalContract: response.settings.rental_contract || '',
        returnContractEnabled: response.settings.return_contract_enabled,
        returnContract: response.settings.return_contract || ''
      });

      setSuccess('Cat trap rental settings saved successfully.');
    } catch (err: any) {
      console.error('Unable to save cat trap rental settings:', err);

      setError(
        err?.response?.data?.message ||
        'Unable to save rental settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="text-muted mt-3 mb-0">
          Loading rental settings...
        </p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 px-lg-4">
      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <Button
          variant="outline-secondary"
          onClick={() => navigate('/cat-trap-rentals')}
        >
          <FaArrowLeft className="me-2" />
          Back
        </Button>

        <div>
          <h2 className="fw-bold mb-1">Cat Trap Rental Settings</h2>
          <p className="text-muted mb-0">
            Configure your organization's trap inventory and rental policies.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Form onSubmit={handleSave}>
        <Row className="g-4">
          {/* INVENTORY AND RENTAL POLICIES */}
          <Col xs={12} xl={6}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Header className="bg-white border-0 pt-3 px-4">
                <h5 className="fw-bold mb-1">
                  <FaWarehouse className="me-2 text-primary" />
                  Inventory & Rental Policies
                </h5>
                <p className="text-muted small mb-0">
                  Set your available trap inventory and default rental terms.
                </p>
              </Card.Header>

              <Card.Body className="p-4">
                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">
                    Total Trap Inventory
                  </Form.Label>

                  <InputGroup>
                    <Form.Control
                      type="number"
                      min="0"
                      step="1"
                      value={settings.totalTraps}
                      onChange={(e) =>
                        updateField('totalTraps', Number(e.target.value))
                      }
                      required
                    />
                    <InputGroup.Text>Traps</InputGroup.Text>
                  </InputGroup>

                  <Form.Text className="text-muted">
                    The total number of traps owned by your organization.
                    Currently rented traps are deducted automatically.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold">
                    Default Rental Period
                  </Form.Label>

                  <InputGroup>
                    <Form.Control
                      type="number"
                      min="1"
                      step="1"
                      value={settings.defaultRentalDays}
                      onChange={(e) =>
                        updateField(
                          'defaultRentalDays',
                          Number(e.target.value)
                        )
                      }
                      required
                    />
                    <InputGroup.Text>Days</InputGroup.Text>
                  </InputGroup>

                  <Form.Text className="text-muted">
                    Defaults to 14 days. Staff can set a different expected
                    return date for an individual rental.
                  </Form.Text>
                </Form.Group>

                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Deposit Amount
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.depositAmount}
                      onChange={(e) =>
                        updateField(
                          'depositAmount',
                          Number(e.target.value)
                        )
                      }
                      required
                    />
                  </InputGroup>

                  <Form.Text className="text-muted">
                    This amount is recorded on each new rental. Payments
                    are handled outside ShelterHelper.
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>

          {/* CONTRACT SETTINGS */}
          <Col xs={12} xl={6}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Header className="bg-white border-0 pt-3 px-4">
                <h5 className="fw-bold mb-1">
                  <FaFileContract className="me-2 text-primary" />
                  Contract Settings
                </h5>
                <p className="text-muted small mb-0">
                  Configure the documents used during rentals and returns.
                </p>
              </Card.Header>

              <Card.Body className="p-4">
                {/* RENTAL CONTRACT */}
                <div className="border rounded p-3 mb-4">
                  <Form.Check
                    type="switch"
                    id="rental-contract-enabled"
                    label="Require a Rental Contract"
                    checked={settings.rentalContractEnabled}
                    onChange={(e) =>
                      updateField(
                        'rentalContractEnabled',
                        e.target.checked
                      )
                    }
                    className="fw-semibold mb-3"
                  />

                  <Form.Group>
                    <Form.Label>Rental Contract Template</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={7}
                      value={settings.rentalContract || ''}
                      onChange={(e) =>
                        updateField('rentalContract', e.target.value)
                      }
                      placeholder="Enter your rental agreement here..."
                      disabled={!settings.rentalContractEnabled}
                    />

                    <Form.Text className="text-muted">
                      When enabled, the renter must digitally sign this
                      agreement before the rental can be created.
                    </Form.Text>
                  </Form.Group>
                </div>

                {/* RETURN CONTRACT */}
                <div className="border rounded p-3">
                  <Form.Check
                    type="switch"
                    id="return-contract-enabled"
                    label="Require a Return Contract"
                    checked={settings.returnContractEnabled}
                    onChange={(e) =>
                      updateField(
                        'returnContractEnabled',
                        e.target.checked
                      )
                    }
                    className="fw-semibold mb-3"
                  />

                  <Form.Group>
                    <Form.Label>Return Contract Template</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={7}
                      value={settings.returnContract || ''}
                      onChange={(e) =>
                        updateField('returnContract', e.target.value)
                      }
                      placeholder="Enter your return agreement here..."
                      disabled={!settings.returnContractEnabled}
                    />

                    <Form.Text className="text-muted">
                      When enabled, a digital signature will be required
                      when staff process a trap return.
                    </Form.Text>
                  </Form.Group>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* SAVE */}
        <div className="d-flex justify-content-end mt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </Form>

      <Alert variant="info" className="mt-4">
        <FaCalendarAlt className="me-2" />
        <strong>Historical records are preserved.</strong>
        {' '}Changes to your contract templates will apply to new rentals.
        Existing rentals retain the contract version saved when they were
        created.
      </Alert>
    </Container>
  );
};

export default CatTrapRentalSettings;