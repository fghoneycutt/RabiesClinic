import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api/api';
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

  rabies_1_year_enabled: boolean;
  rabies_3_year_enabled: boolean;
  microchip_enabled: boolean;

  rabies_1_year_product: string;
  rabies_1_year_manufacturer: string;
  rabies_1_year_lot_number: string;
  rabies_1_year_product_expiration_date: string;

  rabies_3_year_product: string;
  rabies_3_year_manufacturer: string;
  rabies_3_year_lot_number: string;
  rabies_3_year_product_expiration_date: string;

  default_veterinarian_id: string;
  notes: string;
};

type VetUser = {
  id: string;
  name: string;
};

export default function CreateClinic() {
  const navigate = useNavigate();
  document.title="Create Clinic"
  const [vets, setVets] = useState<VetUser[]>([]);

  const [form, setForm] = useState<ClinicForm>({
    name: '',
    location_name: '',
    address: '',
    city: '',
    state: 'NC',
    zip_code: '',

    clinic_date: '',
    start_time: '',
    end_time: '',

    rabies_1_year_enabled: true,
    rabies_3_year_enabled: true,
    microchip_enabled: true,

    rabies_1_year_product: '',
    rabies_1_year_manufacturer: '',
    rabies_1_year_lot_number: '',
    rabies_1_year_product_expiration_date: '',

    rabies_3_year_product: '',
    rabies_3_year_manufacturer: '',
    rabies_3_year_lot_number: '',
    rabies_3_year_product_expiration_date: '',

    default_veterinarian_id: '',
    notes: ''
  });

  useEffect(() => {
    api.get('/users?role=staff')
      .then(res => setVets(res.data))
      .catch(err =>
        console.error("Could not load veterinarian drop-down options:", err)
      );
  }, []);

  const update = (field: keyof ClinicForm, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const submit = async () => {
  try {
    // -----------------------------
    // REQUIRED FIELD VALIDATION
    // -----------------------------
    if (
      !form.name ||
      !form.location_name ||
      !form.address ||
      !form.city ||
      !form.state ||
      !form.zip_code ||
      !form.clinic_date ||
      !form.start_time ||
      !form.end_time
    ) {
      alert('Please fill out all required fields before submitting.');
      return;
    }

    // -----------------------------
    // CLEANER HELPER (prevents "")
    // -----------------------------
    const clean = (v: any) => (v === '' ? null : v);

    const offerings = {
      rabies_1_year: {
        enabled: form.rabies_1_year_enabled,
        default_product: clean(form.rabies_1_year_product),
        default_manufacturer: clean(form.rabies_1_year_manufacturer),
        default_lot_number: clean(form.rabies_1_year_lot_number),
        default_product_expiration_date: clean(
          form.rabies_1_year_product_expiration_date
        )
      },
      rabies_3_year: {
        enabled: form.rabies_3_year_enabled,
        default_product: clean(form.rabies_3_year_product),
        default_manufacturer: clean(form.rabies_3_year_manufacturer),
        default_lot_number: clean(form.rabies_3_year_lot_number),
        default_product_expiration_date: clean(
          form.rabies_3_year_product_expiration_date
        )
      },
      microchip: {
        enabled: form.microchip_enabled
      }
    };

    await api.post('/clinics', {
      name: form.name,
      location_name: form.location_name,
      address: form.address,
      city: form.city,
      state: form.state,
      zip_code: form.zip_code,

      clinic_date: clean(form.clinic_date),
      start_time: clean(form.start_time),
      end_time: clean(form.end_time),

      offerings,
      default_veterinarian_id: form.default_veterinarian_id || null,
      notes: form.notes || null
    });

    navigate('/');
  } catch (err) {
    console.error(err);
    alert('Failed to create clinic');
  }
};

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h2 className="mb-4">Create Clinic</h2>

      <Form>

        {/* BASIC INFO */}
        <Form.Group className="mb-3">
          <Form.Label>Clinic Name</Form.Label>
          <Form.Control
            value={form.name}
            onChange={e => update('name', e.target.value)}
          />
        </Form.Group>

        {/* LOCATION */}
        <Row className="mb-3">
          <Col>
            <Form.Group>
              <Form.Label>Location Name</Form.Label>
              <Form.Control
                value={form.location_name}
                onChange={e => update('location_name', e.target.value)}
              />
            </Form.Group>
          </Col>

          <Col>
            <Form.Group>
              <Form.Label>Address</Form.Label>
              <Form.Control
                value={form.address}
                onChange={e => update('address', e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col>
            <Form.Group>
              <Form.Label>City</Form.Label>
              <Form.Control
                value={form.city}
                onChange={e => update('city', e.target.value)}
              />
            </Form.Group>
          </Col>

          <Col>
            <Form.Group>
              <Form.Label>State</Form.Label>
              <Form.Control
                value={form.state}
                onChange={e => update('state', e.target.value)}
              />
            </Form.Group>
          </Col>

          <Col>
            <Form.Group>
              <Form.Label>Zip Code</Form.Label>
              <Form.Control
                inputMode="numeric" 
                pattern="[0-9]*"
                value={form.zip_code}
                onChange={e => update('zip_code', e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* SCHEDULING */}
        <Row className="mb-4">
          <Col>
            <Form.Group>
              <Form.Label>Clinic Date</Form.Label>
              <Form.Control
                type="date"
                value={form.clinic_date}
                onChange={e => update('clinic_date', e.target.value)}
              />
            </Form.Group>
          </Col>

          <Col>
            <Form.Group>
              <Form.Label>Start Time</Form.Label>
              <Form.Control
                type="time"
                value={form.start_time}
                onChange={e => update('start_time', e.target.value)}
              />
            </Form.Group>
          </Col>

          <Col>
            <Form.Group>
              <Form.Label>End Time</Form.Label>
              <Form.Control
                type="time"
                value={form.end_time}
                onChange={e => update('end_time', e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* OFFERINGS */}
        <Card className="mb-4">
          <Card.Body>
            <h5 className="mb-3">Offerings</h5>

            {/* 1 YEAR */}
            <Form.Check
              label="Rabies 1-Year"
              checked={form.rabies_1_year_enabled}
              onChange={e =>
                update('rabies_1_year_enabled', e.target.checked)
              }
            />

            {form.rabies_1_year_enabled && (
              <Row className="mt-3">
                <Col>
                  <Form.Group>
                    <Form.Label>Product</Form.Label>
                    <Form.Select
                      value={form.rabies_1_year_product}
                      onChange={e => {
                        const selected = RABIES_PRODUCT_MANUFACTURER.find(
                          item => item.product === e.target.value
                        );

                        update('rabies_1_year_product', selected?.product || '');
                        update('rabies_1_year_manufacturer', selected?.manufacturer || '');
                      }}
                    >
                      <option value="">Select product</option>
                      {RABIES_PRODUCT_MANUFACTURER.map(item => (
                        <option key={item.product} value={item.product}>
                          {item.product}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col>
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
                </Col>

                <Col>
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
                </Col>
              </Row>
            )}

            {/* 3 YEAR */}
            <div className="mt-4">
              <Form.Check
                label="Rabies 3-Year"
                checked={form.rabies_3_year_enabled}
                onChange={e =>
                  update('rabies_3_year_enabled', e.target.checked)
                }
              />

              {form.rabies_3_year_enabled && (
                <Row className="mt-3">
                  <Col>
                    <Form.Group>
                      <Form.Label>Product</Form.Label>
                      <Form.Select
                        value={form.rabies_3_year_product}
                        onChange={e => {
                          const selected = RABIES_PRODUCT_MANUFACTURER.find(
                            item => item.product === e.target.value
                          );

                          update('rabies_3_year_product', selected?.product || '');
                          update('rabies_3_year_manufacturer', selected?.manufacturer || '');
                        }}
                      >
                        <option value="">Select product</option>
                        {RABIES_PRODUCT_MANUFACTURER.map(item => (
                          <option key={item.product} value={item.product}>
                            {item.product}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col>
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
                  </Col>

                  <Col>
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
                  </Col>
                </Row>
              )}
            </div>

            {/* MICROCHIP */}
            <Form.Check
              className="mt-3"
              label="Microchip"
              checked={form.microchip_enabled}
              onChange={e =>
                update('microchip_enabled', e.target.checked)
              }
            />
          </Card.Body>
        </Card>

        {/* VET + NOTES */}
        <Card className="mb-4">
          <Card.Body>
            <Form.Group>
              <Form.Label>Default Veterinarian</Form.Label>
              <Form.Select
                value={form.default_veterinarian_id}
                onChange={e =>
                  update('default_veterinarian_id', e.target.value)
                }
              >
                <option value="">Select veterinarian</option>
                {vets.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
              />
            </Form.Group>
          </Card.Body>
        </Card>

        <Button onClick={submit}>Create Clinic</Button>
      </Form>
    </div>
  );
}