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
  const { animal, updateAnimal} = props;

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
                value={animal.name ?? ''}
                onChange={e =>
                  updateAnimal('name', e.target.value)
                }
              />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label><Req>Species</Req></Form.Label>
              <Form.Select
                value={animal.species ?? ''}
                onChange={e =>
                  updateAnimal(
                    'species',
                    e.target.value as AnimalDraft['species']
                  )
                }
              >
                <option value=""></option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* SEX + ALTERED */}
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label><Req>Sex</Req></Form.Label>
              <Form.Select
                value={animal.sex ?? ''}
                onChange={e =>
                  updateAnimal(
                    'sex',
                    e.target.value as AnimalDraft['sex']
                  )
                }
              >
                <option value=""></option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group>
              <Form.Label><Req>Altered Status</Req></Form.Label>

              <Form.Select
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
              />
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
                value={animal.age_months ?? ''}
                onChange={e =>
                  updateAnimal(
                    'age_months',
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
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
              />
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