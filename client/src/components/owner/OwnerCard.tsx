import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import type { Owner } from '../../types/intake';

type Props = {
  owner: Owner;
  editing: boolean;
  setEditing: (v: boolean) => void;
  updateOwnerField: (field: keyof Owner, value: any) => void;
  saveOwner: () => Promise<void>;
};

const STATES_AND_PROVINCES = [
  '', 'AA', 'AB', 'AE', 'AL', 'AK', 'AP', 'AZ', 'AR', 'BC', 'CA',
  'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'GU', 'HI', 'ID', 'IL', 'IN',
  'IA', 'KS', 'KY', 'LA', 'MB', 'ME', 'MD', 'MA', 'MI', 'MN', 'MP',
  'MS', 'MO', 'MT', 'NB', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NL', 'NM',
  'NS', 'NT', 'NU', 'NV', 'NY', 'OH', 'OK', 'ON', 'OR', 'PA', 'PE',
  'PR', 'QC', 'RI', 'SC', 'SD', 'SK', 'TN', 'TX', 'UT', 'VI', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'YT'
];

const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/\D/g, '').slice(0, 10);

  if (numbers.length < 4) return numbers;

  if (numbers.length < 7) {
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  }

  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
};

export default function OwnerCard({
  owner,
  editing,
  setEditing,
  updateOwnerField,
  saveOwner
}: Props) {
  const handleEditToggle = () => {
    if (editing) {
      saveOwner();
    }

    setEditing(!editing);
  };

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Body>

        <div className="d-flex justify-content-between align-items-center pb-2 mb-3 border-bottom">
          <h5 className="mb-0 text-primary d-flex align-items-center gap-2">
            <i className="fas fa-user-circle"></i>
            {owner.first_name} {owner.last_name}
          </h5>

          <Button
            size="sm"
            variant={editing ? 'success' : 'outline-primary'}
            onClick={handleEditToggle}
            className="d-inline-flex align-items-center gap-1"
          >
            <i className={`fas ${editing ? 'fa-save' : 'fa-edit'}`}></i>
            {editing ? 'Save Profile' : 'Edit Profile'}
          </Button>
        </div>

        {editing ? (
          <div className="row g-3">

            <div className="col-md-6">
              <Form.Label className="small fw-bold">
                First Name <span className="text-danger">*</span>
              </Form.Label>

              <Form.Control
                required
                size="sm"
                value={owner.first_name}
                onChange={e =>
                  updateOwnerField('first_name', e.target.value)
                }
              />
            </div>

            <div className="col-md-6">
              <Form.Label className="small fw-bold">
                Last Name <span className="text-danger">*</span>
              </Form.Label>

              <Form.Control
                required
                size="sm"
                value={owner.last_name}
                onChange={e =>
                  updateOwnerField('last_name', e.target.value)
                }
              />
            </div>

            <div className="col-md-6">
              <Form.Label className="small fw-bold">
                Email Address <span className="text-danger">*</span>
              </Form.Label>

              <Form.Control
                required
                size="sm"
                type="email"
                value={owner.email}
                onChange={e =>
                  updateOwnerField('email', e.target.value)
                }
              />
            </div>

            <div className="col-md-6">
              <Form.Label className="small fw-bold">
                Phone Number <span className="text-danger">*</span>
              </Form.Label>

              <Form.Control
                required
                size="sm"
                type="tel"
                inputMode="numeric"
                value={owner.phone}
                onChange={e =>
                  updateOwnerField(
                    'phone',
                    formatPhoneNumber(e.target.value)
                  )
                }
              />
            </div>

            <div className="col-12">
              <Form.Label className="small fw-bold">
                Street Address <span className="text-danger">*</span>
              </Form.Label>

              <Form.Control
                required
                size="sm"
                value={owner.address}
                onChange={e =>
                  updateOwnerField('address', e.target.value)
                }
              />
            </div>

            <div className="col-md-4">
              <Form.Label className="small fw-bold">
                City <span className="text-danger">*</span>
              </Form.Label>

              <Form.Control
                required
                size="sm"
                value={owner.city}
                onChange={e =>
                  updateOwnerField('city', e.target.value)
                }
              />
            </div>

            <div className="col-md-4">
              <Form.Label className="small fw-bold">
                County <span className="text-danger">*</span>
              </Form.Label>

              <Form.Control
                required
                size="sm"
                value={owner.county}
                onChange={e =>
                  updateOwnerField('county', e.target.value)
                }
              />
            </div>

            <div className="col-md-2">
              <Form.Label className="small fw-bold">
                State <span className="text-danger">*</span>
              </Form.Label>

              <Form.Select
                required
                size="sm"
                value={owner.state}
                onChange={e =>
                  updateOwnerField('state', e.target.value)
                }
              >
                {STATES_AND_PROVINCES.map(state => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Form.Select>
            </div>

            <div className="col-md-2">
              <Form.Label className="small fw-bold">
                Zip Code <span className="text-danger">*</span>
              </Form.Label>

              <Form.Control
                required
                size="sm"
                inputMode="numeric"
                value={owner.zip_code}
                onChange={e =>
                  updateOwnerField(
                    'zip_code',
                    e.target.value.replace(/\D/g, '').slice(0, 5)
                  )
                }
              />
            </div>

          </div>
        ) : (
          <div className="row g-3 text-secondary">

            <div className="col-md-4 d-flex align-items-center gap-2">
              <i className="fas fa-envelope text-muted"></i>
              <div>
                <span className="d-block small text-muted fw-bold">
                  Email
                </span>
                {owner.email}
              </div>
            </div>

            <div className="col-md-4 d-flex align-items-center gap-2">
              <i className="fas fa-phone text-muted"></i>
              <div>
                <span className="d-block small text-muted fw-bold">
                  Phone
                </span>
                {owner.phone}
              </div>
            </div>

            <div className="col-md-4 d-flex align-items-center gap-2">
              <i className="fas fa-map-marked-alt text-muted"></i>

              <div>
                <span className="d-block small text-muted fw-bold">
                  Address
                </span>

                {owner.address}, {owner.city}, {owner.state} {owner.zip_code}

                <span className="d-block text-muted small">
                  ({owner.county} County)
                </span>
              </div>
            </div>

          </div>
        )}

      </Card.Body>
    </Card>
  );
}