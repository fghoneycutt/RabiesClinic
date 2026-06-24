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

  rabies_1_year_product: string;
  rabies_1_year_lot_number: string;
  rabies_1_year_product_expiration_date: string;

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

          rabies_1_year_product: extractProductName(rabies1.default_product ?? ''),
          rabies_1_year_lot_number: rabies1.default_lot_number ?? '',
          rabies_1_year_product_expiration_date:
            rabies1.default_product_expiration_date ?? '',

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

    try {
      const offerings = {
        rabies_1_year: {
          enabled: form.rabies_1_year,
          default_product: form.rabies_1_year_product,
          default_lot_number: form.rabies_1_year_lot_number,
          default_product_expiration_date:
            form.rabies_1_year_product_expiration_date
        },
        rabies_3_year: {
          enabled: form.rabies_3_year,
          default_product: form.rabies_3_year_product,
          default_lot_number: form.rabies_3_year_lot_number,
          default_product_expiration_date:
            form.rabies_3_year_product_expiration_date
        },
        microchip: {
          enabled: form.microchip
        }
      };

      await api.put(`/clinics/${id}`, {
        name: form.name,
        location_name: form.location_name,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        clinic_date: form.clinic_date,
        start_time: form.start_time,
        end_time: form.end_time,
        offerings,
        default_veterinarian_id: form.default_veterinarian_id,
        notes: form.notes
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

        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
          Delete Clinic
        </Button>
      </div>

      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Clinic Name</Form.Label>
          <Form.Control
            value={form.name}
            onChange={e => update('name', e.target.value)}
          />
        </Form.Group>

        <Row className="mb-3">
          <Col>
            <Form.Label>Location Name</Form.Label>
            <Form.Control
              value={form.location_name}
              onChange={e => update('location_name', e.target.value)}
            />
          </Col>

          <Col>
            <Form.Label>Address</Form.Label>
            <Form.Control
              value={form.address}
              onChange={e => update('address', e.target.value)}
            />
          </Col>
        </Row>

        <Row className="mb-3">
          <Col>
            <Form.Label>City</Form.Label>
            <Form.Control
              value={form.city}
              onChange={e => update('city', e.target.value)}
            />
          </Col>

          <Col>
            <Form.Label>State</Form.Label>
            <Form.Control
              value={form.state}
              onChange={e => update('state', e.target.value)}
            />
          </Col>

          <Col>
            <Form.Label>Zip</Form.Label>
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
          <Form.Label>Clinic Date</Form.Label>
          <Form.Control
            type="date"
            value={form.clinic_date}
            onChange={e => update('clinic_date', e.target.value)}
          />
        </Form.Group>

        <Row className="mb-4">
          <Col>
            <Form.Label>Start Time</Form.Label>
            <Form.Control
              type="time"
              value={form.start_time}
              onChange={e => update('start_time', e.target.value)}
            />
          </Col>

          <Col>
            <Form.Label>End Time</Form.Label>
            <Form.Control
              type="time"
              value={form.end_time}
              onChange={e => update('end_time', e.target.value)}
            />
          </Col>
        </Row>

        <Card className="mb-4">
          <Card.Body>
            <Form.Check
              label="Rabies 1-Year"
              checked={form.rabies_1_year}
              onChange={e => update('rabies_1_year', e.target.checked)}
            />

            <Form.Check
              label="Rabies 3-Year"
              checked={form.rabies_3_year}
              onChange={e => update('rabies_3_year', e.target.checked)}
            />

            <Form.Check
              label="Microchip"
              checked={form.microchip}
              onChange={e => update('microchip', e.target.checked)}
            />

            {form.rabies_1_year && (
              <Card className="mt-3">
                <Card.Body>
                  <h6>1-Year Rabies Defaults</h6>

                  <Form.Group>
                    <Form.Label>Product</Form.Label>
                    <Form.Select
                      value={form.rabies_1_year_product}
                      onChange={e =>
                        update('rabies_1_year_product', e.target.value)
                      }
                    >
                      <option value=""></option>
                      {RABIES_PRODUCT_MANUFACTURER.map(p => (
                        <option
                          key={`${p.product}-${p.manufacturer}`}
                          value={p.product}
                        >
                          {p.product} ({p.manufacturer})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group>
                    <Form.Label>Lot Number</Form.Label>
                    <Form.Control
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.rabies_1_year_lot_number}
                      onChange={e =>
                        update('rabies_1_year_lot_number', e.target.value)
                      }
                    />
                  </Form.Group>

                  <Form.Group>
                    <Form.Label>Expiration Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={form.rabies_1_year_product_expiration_date}
                      onChange={e =>
                        update(
                          'rabies_1_year_product_expiration_date',
                          e.target.value
                        )
                      }
                    />
                  </Form.Group>
                </Card.Body>
              </Card>
            )}

            {form.rabies_3_year && (
              <Card className="mt-3">
                <Card.Body>
                  <h6>3-Year Rabies Defaults</h6>

                  <Form.Group>
                    <Form.Label>Product</Form.Label>
                    <Form.Select
                      value={form.rabies_3_year_product}
                      onChange={e =>
                        update('rabies_3_year_product', e.target.value)
                      }
                    >
                      <option value=""></option>
                      {RABIES_PRODUCT_MANUFACTURER.map(p => (
                        <option
                          key={`${p.product}-${p.manufacturer}`}
                          value={p.product}
                        >
                          {p.product} ({p.manufacturer})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group>
                    <Form.Label>Lot Number</Form.Label>
                    <Form.Control
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.rabies_3_year_lot_number}
                      onChange={e =>
                        update('rabies_3_year_lot_number', e.target.value)
                      }
                    />
                  </Form.Group>

                  <Form.Group>
                    <Form.Label>Expiration Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={form.rabies_3_year_product_expiration_date}
                      onChange={e =>
                        update(
                          'rabies_3_year_product_expiration_date',
                          e.target.value
                        )
                      }
                    />
                  </Form.Group>
                </Card.Body>
              </Card>
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

        <div className="d-flex gap-2">
          <Button onClick={submit}>Save Changes</Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/clinics/${id}`)}
          >
            Cancel
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