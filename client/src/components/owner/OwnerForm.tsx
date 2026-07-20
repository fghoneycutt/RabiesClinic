import { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import type { OwnerDraft } from '../../types/intake';

import { STATES_AND_PROVINCES } from '../../constants/states';

import {
  formatPhoneNumber,
  isValidEmail,
  isValidPhone,
  isValidZipCode
} from '../../utils/ownerValidation';


interface Props {
  owner: OwnerDraft;
  setOwner: React.Dispatch<React.SetStateAction<OwnerDraft>>;
}

export default function OwnerForm({
  owner,
  setOwner,
}: Props) {
  // Local state to track which fields have lost focus (blurred)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const update = (
    field: keyof OwnerDraft,
    value: any
  ) => {
    setOwner(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  const handleZipChange = (
    value: string
  ) => {
    const numbersOnly = value
      .replace(/\D/g, '')
      .slice(0, 5);

    update('zip_code', numbersOnly);
  };

  return (
    <Form>

      {/* FIRST + LAST NAME */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              First Name{' '}
              <span className="text-danger">*</span>
            </Form.Label>

            <Form.Control
              required
              type="text"
              value={owner.first_name || ''}
              onChange={(e) =>
                update(
                  'first_name',
                  e.target.value
                )
              }
              onBlur={() => handleBlur('first_name')}
              isInvalid={touched.first_name && !owner.first_name?.trim()}
            />
            <Form.Control.Feedback type="invalid">
              First name is required.
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group>
            <Form.Label>
              Last Name{' '}
              <span className="text-danger">*</span>
            </Form.Label>

            <Form.Control
              required
              type="text"
              value={owner.last_name || ''}
              onChange={(e) =>
                update(
                  'last_name',
                  e.target.value
                )
              }
              onBlur={() => handleBlur('last_name')}
              isInvalid={touched.last_name && !owner.last_name?.trim()}
            />
            <Form.Control.Feedback type="invalid">
              Last name is required.
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      {/* EMAIL + PHONE */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group className="mb-2">
            <Form.Label>
              Email <span className="text-danger">*</span>
            </Form.Label>

            <Form.Control
              required
              type="email"
              value={owner.email || ''}
              onChange={(e) =>
                update('email', e.target.value)
              }
              onBlur={() => handleBlur('email')}
              isInvalid={
                touched.email &&
                !isValidEmail(owner.email)
              }
            />

            <Form.Control.Feedback type="invalid">
              A valid email address is required.
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={6} className="d-flex flex-column justify-content-start mt-3 mt-md-0">
          <Form.Group>
            <Form.Label>
              Phone Number{' '}
              <span className="text-danger">*</span>
            </Form.Label>

            <Form.Control  
              inputMode="numeric" 
              pattern="[0-9]*"
              required
              type="tel"
              value={owner.phone || ''}
              onChange={(e) =>
                update(
                  'phone',
                  formatPhoneNumber(e.target.value)
                )
              }
              onBlur={() => handleBlur('phone')}
              isInvalid={
                touched.phone &&
                !isValidPhone(owner.phone)
              }
            />
            <Form.Control.Feedback type="invalid">
              A valid 10-digit phone number is required.
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      {/* ADDRESS */}
      <Form.Group className="mb-3">
        <Form.Label>
          Address{' '}
          <span className="text-danger">*</span>
        </Form.Label>

        <Form.Control
          required
          type="text"
          value={owner.address || ''}
          onChange={(e) =>
            update(
              'address',
              e.target.value
            )
          }
          onBlur={() => handleBlur('address')}
          isInvalid={touched.address && !owner.address?.trim()}
        />
        <Form.Control.Feedback type="invalid">
          Street address is required.
        </Form.Control.Feedback>
      </Form.Group>

      {/* CITY + COUNTY */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              City{' '}
              <span className="text-danger">*</span>
            </Form.Label>

            <Form.Control
              required
              type="text"
              value={owner.city || ''}
              onChange={(e) =>
                update(
                  'city',
                  e.target.value
                )
              }
              onBlur={() => handleBlur('city')}
              isInvalid={touched.city && !owner.city?.trim()}
            />
            <Form.Control.Feedback type="invalid">
              City is required.
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group>
            <Form.Label>
              County{' '}
              <span className="text-danger">*</span>
            </Form.Label>

            <Form.Control
              required
              type="text"
              value={owner.county || ''}
              onChange={(e) =>
                update(
                  'county',
                  e.target.value
                )
              }
              onBlur={() => handleBlur('county')}
              isInvalid={touched.county && !owner.county?.trim()}
            />
            <Form.Control.Feedback type="invalid">
              County is required.
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      {/* STATE + ZIP */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>
              State / Province{' '}
              <span className="text-danger">*</span>
            </Form.Label>

            <Form.Select
              required
              value={owner.state || ''}
              onChange={(e) =>
                update(
                  'state',
                  e.target.value
                )
              }
              onBlur={() => handleBlur('state')}
              isInvalid={touched.state && !owner.state?.trim()}
            >
              {STATES_AND_PROVINCES.map(
                (state) => (
                  <option
                    key={state}
                    value={state}
                  >
                    {state}
                  </option>
                )
              )}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              State selection is required.
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group>
            <Form.Label>
              Zip Code{' '}
              <span className="text-danger">*</span>
            </Form.Label>

            <Form.Control
              pattern="[0-9]*"
              required
              type="text"
              inputMode="numeric"
              value={owner.zip_code || ''}
              onChange={(e) =>
                handleZipChange(
                  e.target.value
                )
              }
              onBlur={() => handleBlur('zip_code')}
              isInvalid={
                touched.zip_code &&
                !isValidZipCode(owner.zip_code)
              }
            />
            <Form.Control.Feedback type="invalid">
              A valid 5-digit zip code is required.
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

    </Form>
  );
}