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

const STATES = ['NC', 'SC', 'VA', 'TN', 'GA', 'AL', 'FL'];

export default function OwnerCard({
  owner,
  editing,
  setEditing,
  updateOwnerField,
  saveOwner
}: Props) {
  
  const handleEditToggle = () => {
    if (editing) saveOwner();
    setEditing(!editing);
  };

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Body>
        {/* HEADER SECTION */}
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

        {/* CONDITIONALLY SWITCH ENTIRE LAYOUT BLOCK */}
        {editing ? (
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Label className="small fw-bold">First Name</Form.Label>
              <Form.Control size="sm" value={owner.first_name} onChange={e => updateOwnerField('first_name', e.target.value)} />
            </div>
            <div className="col-md-6">
              <Form.Label className="small fw-bold">Last Name</Form.Label>
              <Form.Control size="sm" value={owner.last_name} onChange={e => updateOwnerField('last_name', e.target.value)} />
            </div>
            <div className="col-md-6">
              <Form.Label className="small fw-bold">Email Address</Form.Label>
              <Form.Control size="sm" type="email" value={owner.email ?? ''} onChange={e => updateOwnerField('email', e.target.value)} />
            </div>
            <div className="col-md-6">
              <Form.Label className="small fw-bold">Phone Number</Form.Label>
<Form.Control
  size="sm"
  type="tel"
  inputMode="numeric"
  pattern="[0-9]*"
  maxLength={10}
  value={owner.phone ?? ''}
  onChange={e =>
    updateOwnerField(
      'phone',
      e.target.value.replace(/\D/g, '').slice(0, 10)
    )
  }
/>            </div>
            <div className="col-12">
              <Form.Label className="small fw-bold">Street Address</Form.Label>
              <Form.Control size="sm" value={owner.address ?? ''} onChange={e => updateOwnerField('address', e.target.value)} />
            </div>
            <div className="col-md-4">
              <Form.Label className="small fw-bold">City</Form.Label>
              <Form.Control size="sm" value={owner.city ?? ''} onChange={e => updateOwnerField('city', e.target.value)} />
            </div>
            <div className="col-md-4">
              <Form.Label className="small fw-bold">County</Form.Label>
              <Form.Control size="sm" value={owner.county ?? ''} onChange={e => updateOwnerField('county', e.target.value)} />
            </div>
            <div className="col-md-2">
              <Form.Label className="small fw-bold">State</Form.Label>
              <Form.Select size="sm" value={owner.state ?? ''} onChange={e => updateOwnerField('state', e.target.value)}>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-2">
              <Form.Label className="small fw-bold">Zip Code</Form.Label>
              <Form.Control
                size="sm"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                value={owner.zip_code ?? ''}
                onChange={e =>
                  updateOwnerField(
                    'zip_code',
                    e.target.value.replace(/\D/g, '').slice(0, 5)
                  )
                }
              />            </div>
          </div>
        ) : (
          /* READ-ONLY VIEW (Clean, high-density row format) */
          <div className="row g-3 text-secondary">
            <div className="col-md-4 d-flex align-items-center gap-2">
              <i className="fas fa-envelope text-muted"></i>
              <div><span className="d-block small text-muted fw-bold">Email</span>{owner.email || '—'}</div>
            </div>
            <div className="col-md-4 d-flex align-items-center gap-2">
              <i className="fas fa-phone text-muted"></i>
              <div><span className="d-block small text-muted fw-bold">Phone</span>{owner.phone || '—'}</div>
            </div>
            <div className="col-md-4 d-flex align-items-center gap-2">
              <i className="fas fa-map-marked-alt text-muted"></i>
              <div>
                <span className="d-block small text-muted fw-bold">Address</span>
                {owner.address ? `${owner.address}, ${owner.city}, ${owner.state} ${owner.zip_code}` : '—'}
                {owner.county && <span className="d-block text-muted small italic">({owner.county} County)</span>}
              </div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}