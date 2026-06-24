import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import type { OwnerDraft } from '../types/intake';

interface Props {
  owner: OwnerDraft;
  setOwner: React.Dispatch<React.SetStateAction<OwnerDraft>>;
}

const STATES_AND_PROVINCES = [
  '', 'AA', 'AB', 'AE', 'AL', 'AK', 'AP', 'AZ', 'AR', 'BC', 'CA',
  'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'GU', 'HI', 'ID', 'IL', 'IN',
  'IA', 'KS', 'KY', 'LA', 'MB', 'ME', 'MD', 'MA', 'MI', 'MN', 'MP',
  'MS', 'MO', 'MT', 'NB', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NL', 'NM',
  'NS', 'NT', 'NU', 'NV', 'NY', 'OH', 'OK', 'ON', 'OR', 'PA', 'PE',
  'PR', 'QC', 'RI', 'SC', 'SD', 'SK', 'TN', 'TX', 'UT', 'VI', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'YT'
];

export default function OwnerForm({ owner, setOwner }: Props) {

  const update = (field: keyof OwnerDraft, value: any) => {
    setOwner(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 10);

    if (numbers.length < 4) return numbers;

    if (numbers.length < 7) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    }

    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  };

  const handlePhoneChange = (value: string) => {
    update('phone', formatPhoneNumber(value));
  };

  const handleZipChange = (value: string) => {
    const numbersOnly = value.replace(/\D/g, '').slice(0, 5);
    update('zip_code', numbersOnly);
  };

  return (
    <Form>

      {/* FIRST + LAST NAME */}
      <Row className="mb-3">
        <Col>
          <Form.Group>
            <Form.Label>First Name</Form.Label>
            <Form.Control
              type="text"
              value={owner.first_name || ''}
              onChange={(e) => update('first_name', e.target.value)}
            />
          </Form.Group>
        </Col>

        <Col>
          <Form.Group>
            <Form.Label>Last Name</Form.Label>
            <Form.Control
              type="text"
              value={owner.last_name || ''}
              onChange={(e) => update('last_name', e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>

      {/* EMAIL + PHONE */}
      <Row className="mb-3">
        <Col>
          <Form.Group>
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={owner.email || ''}
              onChange={(e) => update('email', e.target.value)}
            />
          </Form.Group>
        </Col>

        <Col>
          <Form.Group>
            <Form.Label>Phone Number</Form.Label>
            <Form.Control
              type="tel"
              value={owner.phone || ''}
              onChange={(e) => handlePhoneChange(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>
      {/* ADDRESS */}
      <Form.Group className="mb-3">
        <Form.Label>Address</Form.Label>
        <Form.Control
          type="text"
          value={owner.address || ''}
          onChange={(e) => update('address', e.target.value)}
        />
      </Form.Group>

      {/* CITY + COUNTY */}
      <Row className="mb-3">
        <Col>
          <Form.Group>
            <Form.Label>City</Form.Label>
            <Form.Control
              type="text"
              value={owner.city || ''}
              onChange={(e) => update('city', e.target.value)}
            />
          </Form.Group>
        </Col>

        <Col>
          <Form.Group>
            <Form.Label>County</Form.Label>
            <Form.Control
              type="text"
              value={owner.county || ''}
              onChange={(e) => update('county', e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>

      {/* STATE + ZIP */}
      <Row className="mb-3">
        <Col>
          <Form.Group>
            <Form.Label>State / Province</Form.Label>

            <Form.Select
              value={owner.state || ''}
              onChange={(e) => update('state', e.target.value)}
            >
              {STATES_AND_PROVINCES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>

        <Col>
          <Form.Group>
            <Form.Label>Zip Code</Form.Label>
            <Form.Control
              type="text"
              inputMode="numeric"
              value={owner.zip_code || ''}
              onChange={(e) => handleZipChange(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>

    </Form>
  );
}