import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { api } from '../api/api';
import DeleteClinicModal from '../components/clinics/DeleteClinicModal';

import { RABIES_PRODUCT_MANUFACTURER } from '../constants/animalOptions';

import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';

type ClinicForm = {
  name: string;
  location_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;

  clinic_date: string;
  start_time: string;
  end_time: string;

  rabies_1_year: boolean;
  rabies_3_year: boolean;
  microchip: boolean;

  rabies_1_year_dose_type: string;
  rabies_1_year_product: string;
  rabies_1_year_lot_number: string;
  rabies_1_year_product_expiration_date: string;

  rabies_3_year_dose_type: string;
  rabies_3_year_product: string;
  rabies_3_year_lot_number: string;
  rabies_3_year_product_expiration_date: string;

  default_veterinarian_id: string;
  notes: string;
};

type VetUser = {
  id: string;
  name: string;
};

// ------------------------------
// HELPERS
// ------------------------------
function extractProductName(full: string) {
  if (!full) return '';
  return full.split(' - ')[0]?.trim() || full.trim();
}

export default function EditClinic() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState<ClinicForm | null>(null);
  const [vets, setVets] = useState<VetUser[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    document.title = form?.name
        ? `Edit ${form.name}`
        : 'Edit Clinic';
    }, [form?.name]);

  useEffect(() => {
    api.get('/users?role=staff')
      .then(res => setVets(res.data))
      .catch(err =>
        console.error('Could not load veterinarian drop-down options:', err)
      );
  }, []);

  useEffect(() => {
    const fetchClinic = async () => {
      try {
        const res = await api.get(`/clinics/${id}`);
        const clinic = res.data;

        const offerings = clinic.offerings || {};

        const rabies1 = offerings.rabies_1_year || {};
        const rabies3 = offerings.rabies_3_year || {};
        const micro = offerings.microchip || {};

        setForm({
          name: clinic.name || '',
          location_name: clinic.location_name || '',
          address: clinic.address || '',
          city: clinic.city || '',
          state: clinic.state || 'NC',
          zip_code: clinic.zip_code || '',

          clinic_date: clinic.clinic_date || '',
          start_time: clinic.start_time || '',
          end_time: clinic.end_time || '',

          rabies_1_year: rabies1.enabled ?? false,
          rabies_3_year: rabies3.enabled ?? false,
          microchip: micro.enabled ?? false,

          rabies_1_year_dose_type: rabies1.dose_type ?? '1 Year',
          rabies_1_year_product: extractProductName(rabies1.default_product ?? ''),
          rabies_1_year_lot_number: rabies1.default_lot_number ?? '',
          rabies_1_year_product_expiration_date:
            rabies1.default_product_expiration_date ?? '',

          rabies_3_year_dose_type: rabies3.dose_type ?? '3 Year',
          rabies_3_year_product: extractProductName(rabies3.default_product ?? ''),
          rabies_3_year_lot_number: rabies3.default_lot_number ?? '',
          rabies_3_year_product_expiration_date:
            rabies3.default_product_expiration_date ?? '',

          default_veterinarian_id: clinic.default_veterinarian || '',
          notes: clinic.notes || ''
        });
      } catch (err) {
        console.error(err);
      }

    };

    fetchClinic();
  }, [id]);

  const update = (field: keyof ClinicForm, value: any) => {
    setForm(prev => (prev ? { ...prev, [field]: value } : prev));
  };

  const hasOfferings =
    form?.rabies_1_year ||
    form?.rabies_3_year ||
    form?.microchip;

  const rabies1YearValid =
    !form?.rabies_1_year ||
    (
      form.rabies_1_year_dose_type.trim() !== '' &&
      form.rabies_1_year_product.trim() !== '' &&
      form.rabies_1_year_lot_number.trim() !== '' &&
      form.rabies_1_year_product_expiration_date.trim() !== ''
    );

  const rabies3YearValid =
    !form?.rabies_3_year ||
    (
      form.rabies_3_year_dose_type.trim() !== '' &&
      form.rabies_3_year_product.trim() !== '' &&
      form.rabies_3_year_lot_number.trim() !== '' &&
      form.rabies_3_year_product_expiration_date.trim() !== ''
    );

  const requiredClinicFieldsValid =
    !!form &&
    form.name.trim() !== '' &&
    form.location_name.trim() !== '' &&
    form.address.trim() !== '' &&
    form.city.trim() !== '' &&
    form.state.trim() !== '' &&
    form.zip_code.trim() !== '' &&
    form.clinic_date.trim() !== '' &&
    form.start_time.trim() !== '' &&
    form.end_time.trim() !== '';

  const vaccineFieldsValid =
    rabies1YearValid &&
    rabies3YearValid;

  const canSubmit =
    requiredClinicFieldsValid &&
    !!hasOfferings &&
    vaccineFieldsValid;

  const deleteClinic = async () => {
    try {
      await api.delete(`/clinics/${id}`);
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Failed to delete clinic');
    }
  };

  const submit = async () => {
    if (!form) return;

    if (!hasOfferings) {
      alert(
        'A clinic must offer at least one service.'
      );
      return;
    }

    if (!vaccineFieldsValid) {
      alert(
        'Please complete all required vaccine fields before saving.'
      );
      return;
    }

    if (!requiredClinicFieldsValid) {
      alert(
        'Please complete all required clinic fields before saving.'
      );
      return;
    }

    try {
      const offerings = {
        rabies_1_year: {
          enabled: form.rabies_1_year,
          dose_type: form.rabies_1_year_dose_type,
          default_product: form.rabies_1_year_product,
          default_lot_number: form.rabies_1_year_lot_number,
          default_product_expiration_date:
            form.rabies_1_year_product_expiration_date
        },
        rabies_3_year: {
          enabled: form.rabies_3_year,
          dose_type: form.rabies_3_year_dose_type,
          default_product: form.rabies_3_year_product,
          default_lot_number: form.rabies_3_year_lot_number,
          default_product_expiration_date:
            form.rabies_3_year_product_expiration_date
        },
        microchip: {
          enabled: form.microchip
        }
      };
      const cleanedForm = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          typeof value === 'string'
            ? value.trim()
            : value
        ])
      ) as ClinicForm;

      await api.put(`/clinics/${id}`, {
        name: cleanedForm.name,
        location_name: cleanedForm.location_name,
        address: cleanedForm.address,
        city: cleanedForm.city,
        state: cleanedForm.state,
        zip_code: cleanedForm.zip_code,
        clinic_date: cleanedForm.clinic_date,
        start_time: cleanedForm.start_time,
        end_time: cleanedForm.end_time,
        offerings,
        default_veterinarian_id:
          cleanedForm.default_veterinarian_id,
        notes: cleanedForm.notes
      });

      navigate(`/clinics/${id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to update clinic');
    }
  };

  if (!form) {
    return (
      <div>
        <h2>Edit Clinic</h2>
        <p>Loading clinic...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Edit Clinic</h2>

        <Button
          variant="danger"
          onClick={() => setShowDeleteModal(true)}
        >
          <i className="fas fa-trash-alt me-1"></i>
          Delete Clinic
        </Button>
      </div>

      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Clinic Name <span className="text-danger">*</span></Form.Label>
          <Form.Control
            value={form.name}
            onChange={e => update('name', e.target.value)}
          />
        </Form.Group>

        <Row className="mb-3">
          <Col>
            <Form.Label>Location Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={form.location_name}
              onChange={e => update('location_name', e.target.value)}
            />
          </Col>

          <Col>
            <Form.Label>Address <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={form.address}
              onChange={e => update('address', e.target.value)}
            />
          </Col>
        </Row>

        <Row className="mb-3">
          <Col>
            <Form.Label>City <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={form.city}
              onChange={e => update('city', e.target.value)}
            />
          </Col>

          <Col>
            <Form.Label>State <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={form.state}
              onChange={e => update('state', e.target.value)}
            />
          </Col>

          <Col>
            <Form.Label>Zip <span className="text-danger">*</span></Form.Label>
            <Form.Control
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              value={form.zip_code}
              onChange={e =>
                update(
                  'zip_code',
                  e.target.value.replace(/\D/g, '').slice(0, 5)
                )
              }
            />
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Clinic Date <span className="text-danger">*</span></Form.Label>
          <Form.Control
            type="date"
            value={form.clinic_date}
            onChange={e => update('clinic_date', e.target.value)}
          />
        </Form.Group>

        <Row className="mb-4">
          <Col>
            <Form.Label>Start Time <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="time"
              value={form.start_time}
              onChange={e => update('start_time', e.target.value)}
            />
          </Col>

          <Col>
            <Form.Label>End Time <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="time"
              value={form.end_time}
              onChange={e => update('end_time', e.target.value)}
            />
          </Col>
        </Row>

        <Card className="mb-4">
          <Card.Body>
            <h5 className="mb-3">Offerings</h5>

            {/* Rabies 1-Year */}
            <Form.Check
              label="Rabies 1-Year"
              checked={form.rabies_1_year}
              onChange={e => {
                if (
                  !e.target.checked &&
                  !form.rabies_3_year &&
                  !form.microchip
                ) {
                  return;
                }

                update(
                  'rabies_1_year',
                  e.target.checked
                );
              }}
            />

            {form.rabies_1_year && (
              <Row className="g-3 mt-1">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>
                      Product <span className="text-danger">*</span>
                    </Form.Label>

                    <Form.Select
                      value={form.rabies_1_year_product}
                      onChange={e =>
                        update(
                          'rabies_1_year_product',
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select product
                      </option>

                      {RABIES_PRODUCT_MANUFACTURER.map(p => (
                        <option
                          key={`${p.product}-${p.manufacturer}`}
                          value={p.product}
                        >
                          {p.product}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label>
                      Lot Number <span className="text-danger">*</span>
                    </Form.Label>

                    <Form.Control
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.rabies_1_year_lot_number}
                      onChange={e =>
                        update(
                          'rabies_1_year_lot_number',
                          e.target.value
                        )
                      }
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label>
                      Product Expiration Date{' '}
                      <span className="text-danger">*</span>
                    </Form.Label>

                    <Form.Control
                      type="date"
                      value={
                        form.rabies_1_year_product_expiration_date
                      }
                      onChange={e =>
                        update(
                          'rabies_1_year_product_expiration_date',
                          e.target.value
                        )
                      }
                    />
                  </Form.Group>
                </Col>
                                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>
                      Dose Type <span className="text-danger">*</span>
                    </Form.Label>

                    <Form.Select
                      value={form.rabies_1_year_dose_type}
                      onChange={e =>
                        update(
                          'rabies_1_year_dose_type',
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select dose type
                      </option>
                      <option value="1 Year">
                        1 Year
                      </option>
                      <option value="3 Year">
                        3 Year
                      </option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            )}

            {/* Rabies 3-Year */}
            <Form.Check
              className="mt-4"
              label="Rabies 3-Year"
              checked={form.rabies_3_year}
              onChange={e => {
                if (
                  !e.target.checked &&
                  !form.rabies_1_year &&
                  !form.microchip
                ) {
                  return;
                }

                update(
                  'rabies_3_year',
                  e.target.checked
                );
              }}
            />

            {form.rabies_3_year && (
              <Row className="g-3 mt-1">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>
                      Product <span className="text-danger">*</span>
                    </Form.Label>

                    <Form.Select
                      value={form.rabies_3_year_product}
                      onChange={e =>
                        update(
                          'rabies_3_year_product',
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select product
                      </option>

                      {RABIES_PRODUCT_MANUFACTURER.map(p => (
                        <option
                          key={`${p.product}-${p.manufacturer}`}
                          value={p.product}
                        >
                          {p.product}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label>
                      Lot Number <span className="text-danger">*</span>
                    </Form.Label>

                    <Form.Control
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.rabies_3_year_lot_number}
                      onChange={e =>
                        update(
                          'rabies_3_year_lot_number',
                          e.target.value
                        )
                      }
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} md={6}>
                  <Form.Group>
                    <Form.Label>
                      Product Expiration Date{' '}
                      <span className="text-danger">*</span>
                    </Form.Label>

                    <Form.Control
                      type="date"
                      value={
                        form.rabies_3_year_product_expiration_date
                      }
                      onChange={e =>
                        update(
                          'rabies_3_year_product_expiration_date',
                          e.target.value
                        )
                      }
                    />
                  </Form.Group>
                </Col>
                                <Col xs={12}>
                  <Form.Group>
                    <Form.Label>
                      Dose Type <span className="text-danger">*</span>
                    </Form.Label>

                    <Form.Select
                      value={form.rabies_3_year_dose_type}
                      onChange={e =>
                        update(
                          'rabies_3_year_dose_type',
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Select dose type
                      </option>
                      <option value="1 Year">
                        1 Year
                      </option>
                      <option value="3 Year">
                        3 Year
                      </option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            )}

            {/* Microchip */}
            <Form.Check
              className="mt-4"
              label="Microchip"
              checked={form.microchip}
              onChange={e => {
                if (
                  !e.target.checked &&
                  !form.rabies_1_year &&
                  !form.rabies_3_year
                ) {
                  return;
                }

                update(
                  'microchip',
                  e.target.checked
                );
              }}
            />

            {!hasOfferings && (
              <div className="text-danger small mt-2">
                At least one offering must be selected.
              </div>
            )}
          </Card.Body>
        </Card>

        <Card className="mb-4">
          <Card.Body>
            <h5>Onsite Veterinarian</h5>

            <Form.Select
              value={form.default_veterinarian_id}
              onChange={e =>
                update('default_veterinarian_id', e.target.value)
              }
            >
              <option value="">Select Clinic Vet...</option>
              {vets.map(vet => (
                <option key={vet.id} value={vet.id}>
                  {vet.name}
                </option>
              ))}
            </Form.Select>
          </Card.Body>
        </Card>

        <Card className="mb-4">
          <Card.Body>
            <h5>Notes</h5>

            <Form.Control
              as="textarea"
              rows={3}
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
            />
          </Card.Body>
        </Card>

        <div className="d-flex flex-column flex-sm-row justify-content-sm-end gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate(`/clinics/${id}`)}
            className="order-1 order-sm-1"
          >
            Cancel
          </Button>

          <Button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              cursor: !canSubmit
                ? 'not-allowed'
                : 'pointer'
            }}
            className="order-2 order-sm-2"
          >
            <i className="fas fa-save me-1"></i>
            Save Changes
          </Button>
        </div>
      </Form>

      <DeleteClinicModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        clinicId={id || ''}
        clinicName={form.name}
        onDelete={deleteClinic}
      />
    </div>
  );
}