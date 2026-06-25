import { useState, useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Select from 'react-select';
import Button from 'react-bootstrap/Button';

import type { AnimalDraft } from '../types/intake';

import {
  DOG_BREEDS,
  CAT_BREEDS,
  DOG_COLORS,
  CAT_COLORS,
  DOG_PATTERNS,
  CAT_PATTERNS
} from '../constants/animalOptions';

type BaseProps = {
  animal: AnimalDraft;
  updateAnimal: (field: keyof AnimalDraft, value: any) => void;
  showClinicFields?: boolean;
};

type MultiProps = BaseProps & {
  mode: 'multi';
  index: number;
  removeAnimal: (index: number) => void;
};

type SingleProps = BaseProps & {
  mode: 'single';
  index?: never;
  removeAnimal?: never;
};

type Props = MultiProps | SingleProps;

// -------------------------
// required label helper
// -------------------------
const Req = ({ children }: { children: React.ReactNode }) => (
  <>
    {children} <span className="text-danger">*</span>
  </>
);

export default function AnimalForm(props: Props) {
  const { animal, updateAnimal } = props;

  // Local state for tracking touched elements for visual validation
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Local state for the calculator field (stored as 'YYYY-MM-DD')
  const [approxBirthdate, setApproxBirthdate] = useState<string>('');

  const breedOptions =
    animal.species === 'dog'
      ? DOG_BREEDS
      : animal.species === 'cat'
      ? CAT_BREEDS
      : [];

  const colorOptions =
    animal.species === 'dog'
      ? DOG_COLORS
      : animal.species === 'cat'
      ? CAT_COLORS
      : [];

  const patternOptions =
    animal.species === 'dog'
      ? DOG_PATTERNS
      : animal.species === 'cat'
      ? CAT_PATTERNS
      : [];

  const showMultiHeader = 'mode' in props && props.mode === 'multi';

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // ----------------------------------------------------------------
  // Reciprocal Update Logic
  // ----------------------------------------------------------------

  // Automatically calculate the approximate birthdate string whenever age values change
  useEffect(() => {
    if (animal.age_years === null && animal.age_months === null) {
      setApproxBirthdate('');
      return;
    }

    let years = animal.age_years || 0;
    let months = animal.age_months || 0;

    // If months are 12 or higher, normalize them into years
    if (months >= 12) {
      years += Math.floor(months / 12);
      months = months % 12;
    }

    const today = new Date();
    today.setFullYear(today.getFullYear() - years);
    today.setMonth(today.getMonth() - months);

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const calculatedDateString = `${yyyy}-${mm}-${dd}`;

    // Update only if it differs from what is already typed to avoid loops
    if (approxBirthdate !== calculatedDateString) {
      setApproxBirthdate(calculatedDateString);
    }
  }, [animal.age_years, animal.age_months]);

  // When user modifies the date selection directly
  const handleBirthdateChange = (dateString: string) => {
    setApproxBirthdate(dateString);

    if (!dateString) {
      updateAnimal('age_years', null);
      updateAnimal('age_months', null);
      return;
    }

    const birthDate = new Date(dateString);
    const today = new Date();

    if (birthDate > today) {
      updateAnimal('age_years', 0);
      updateAnimal('age_months', 0);
      return;
    }

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    // Alignment corrections for exact calendar boundary days
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    if (today.getDate() < birthDate.getDate()) {
      months--;
    }

    const targetYears = years >= 0 ? years : 0;
    const targetMonths = months >= 0 ? months : 0;

    // Fire state updates only if values change to suppress downstream redraw loop
    if (animal.age_years !== targetYears) {
      updateAnimal('age_years', targetYears);
    }
    if (animal.age_months !== targetMonths) {
      updateAnimal('age_months', targetMonths);
    }
  };

  return (
    <Card className="mb-3">
      <Card.Body>

        {/* HEADER */}
        {showMultiHeader && (
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
              Animal {props.index + 1}
            </h5>

            {props.index > 0 && (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => props.removeAnimal(props.index)}
              >
                ✕ Remove
              </Button>
            )}
          </div>
        )}

        {/* NAME + SPECIES */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label><Req>Name</Req></Form.Label>
              <Form.Control
                required
                type="text"
                value={animal.name ?? ''}
                onChange={e => updateAnimal('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                isInvalid={touched.name && !animal.name?.trim()}
              />
              <Form.Control.Feedback type="invalid">
                Animal name is required.
              </Form.Control.Feedback>
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label><Req>Species</Req></Form.Label>
              <Form.Select
                required
                value={animal.species ?? ''}
                onChange={e =>
                  updateAnimal(
                    'species',
                    e.target.value as AnimalDraft['species']
                  )
                }
                onBlur={() => handleBlur('species')}
                isInvalid={touched.species && !animal.species}
              >
                <option value=""></option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                Species selection is required.
              </Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>

        {/* SEX + ALTERED */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label><Req>Sex</Req></Form.Label>
              <Form.Select
                required
                value={animal.sex ?? ''}
                onChange={e =>
                  updateAnimal(
                    'sex',
                    e.target.value as AnimalDraft['sex']
                  )
                }
                onBlur={() => handleBlur('sex')}
                isInvalid={touched.sex && !animal.sex}
              >
                <option value=""></option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                Sex selection is required.
              </Form.Control.Feedback>
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label><Req>Altered Status</Req></Form.Label>
              <Form.Select
                required
                value={
                  animal.altered_status === true
                    ? 'yes'
                    : animal.altered_status === false
                    ? 'no'
                    : 'unknown'
                }
                onChange={e => {
                  const val =
                    e.target.value === 'yes'
                      ? true
                      : e.target.value === 'no'
                      ? false
                      : null;

                  updateAnimal('altered_status', val);
                }}
                onBlur={() => handleBlur('altered_status')}
              >
                <option value="unknown">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* BREEDS */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label><Req>Primary Breed</Req></Form.Label>
              <Select
                isDisabled={!animal.species}
                options={breedOptions.map(b => ({
                  value: b,
                  label: b
                }))}
                value={
                  animal.primary_breed
                    ? { value: animal.primary_breed, label: animal.primary_breed }
                    : null
                }
                onChange={selected =>
                  updateAnimal('primary_breed', selected?.value || '')
                }
                onBlur={() => handleBlur('primary_breed')}
                className={touched.primary_breed && !animal.primary_breed ? 'is-invalid' : ''}
              />
              {touched.primary_breed && !animal.primary_breed && (
                <div className="text-danger mt-1" style={{ fontSize: '0.875em' }}>
                  Primary breed is required.
                </div>
              )}
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label>Secondary Breed</Form.Label>
              <Select
                isDisabled={!animal.species}
                options={breedOptions.map(b => ({
                  value: b,
                  label: b
                }))}
                value={
                  animal.secondary_breed
                    ? { value: animal.secondary_breed, label: animal.secondary_breed }
                    : null
                }
                onChange={selected =>
                  updateAnimal('secondary_breed', selected?.value || '')
                }
              />
            </Form.Group>
          </Col>
        </Row>

        {/* AGE */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Age (Years)</Form.Label>
              <Form.Control
                inputMode="numeric" 
                pattern="[0-9]*"
                type="number"
                value={animal.age_years ?? ''}
                onChange={e =>
                  updateAnimal(
                    'age_years',
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
              />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label>Age (Months)</Form.Label>
              <Form.Control
                inputMode="numeric" 
                pattern="[0-9]*"
                type="number"
                min="0"
                max="11"
                value={animal.age_months ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  
                  if (val === '') {
                    updateAnimal('age_months', null);
                    return;
                  }

                  const num = Number(val);

                  if (num < 0 || num > 11) {
                    return; 
                  }

                  updateAnimal('age_months', num);
                }}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* APPROXIMATE BIRTHDATE CALCULATOR */}
        <Row className="mb-3">
          <Col md={12}>
            <Form.Group>
              <Form.Label>Approximate Birthdate</Form.Label>
              <Form.Control
                type="date"
                value={approxBirthdate}
                onChange={e => handleBirthdateChange(e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* COLORS */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label><Req>Primary Color</Req></Form.Label>
              <Select
                isDisabled={!animal.species}
                options={colorOptions.map(c => ({
                  value: c,
                  label: c
                }))}
                value={
                  animal.primary_color
                    ? { value: animal.primary_color, label: animal.primary_color }
                    : null
                }
                onChange={selected =>
                  updateAnimal('primary_color', selected?.value || '')
                }
                onBlur={() => handleBlur('primary_color')}
              />
              {touched.primary_color && !animal.primary_color && (
                <div className="text-danger mt-1" style={{ fontSize: '0.875em' }}>
                  Primary color is required.
                </div>
              )}
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label>Secondary Color</Form.Label>
              <Select
                isDisabled={!animal.species}
                options={colorOptions.map(c => ({
                  value: c,
                  label: c
                }))}
                value={
                  animal.secondary_color
                    ? { value: animal.secondary_color, label: animal.secondary_color }
                    : null
                }
                onChange={selected =>
                  updateAnimal('secondary_color', selected?.value || '')
                }
              />
            </Form.Group>
          </Col>
        </Row>

        {/* PATTERN */}
        <Form.Group className="mb-3">
          <Form.Label>Pattern</Form.Label>
          <Select
            isDisabled={!animal.species}
            options={patternOptions.map(p => ({
              value: p,
              label: p
            }))}
            value={
              animal.pattern
                ? { value: animal.pattern, label: animal.pattern }
                : null
            }
            onChange={selected =>
              updateAnimal('pattern', selected?.value || '')
            }
          />
        </Form.Group>
      </Card.Body>
    </Card>
  );
}