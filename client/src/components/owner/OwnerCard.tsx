import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useEffect, useState } from 'react';

import type { Owner } from '../../types/intake';

import { isOwnerValid } from '../../utils/ownerValidation';
import PhoneNumberInput from '../input/PhoneNumberInput';
import DeleteOwnerModal from './DeleteOwnerModal';

import { STATES_AND_PROVINCES } from '../../constants/states';

type Props = {
  owner: Owner;
  editing: boolean;
  setEditing: (v: boolean) => void;
  saveOwner: (owner: Owner) => Promise<void>;
  onDeleteOwner: () => void;
};

export default function OwnerCard({
  owner,
  editing,
  setEditing,
  saveOwner,
  onDeleteOwner
}: Props) {
  const [draftOwner, setDraftOwner] = useState(owner);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    setDraftOwner(owner);
  }, [owner]);

  const updateDraftField = (
    field: keyof Owner,
    value: any
  ) => {
    setDraftOwner(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditToggle = async () => {
    if (!editing) {
      setDraftOwner(owner);
      setEditing(true);
      return;
    }

    if (!isOwnerValid(draftOwner)) {
      alert(
        'Please complete all required fields with valid information before saving.'
      );
      return;
    }

    await saveOwner(draftOwner);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraftOwner(owner);
    setEditing(false);
  };

  return (
    <Card className="mb-4 shadow-sm">
      <Card.Body>

        <div className="d-flex justify-content-between align-items-center pb-2 mb-3 border-bottom">
          <h5 className="mb-0 text-primary d-flex align-items-center gap-2">
            <i className="fas fa-user-circle"></i>
            {owner.first_name} {owner.last_name}
          </h5>

          <div className="d-flex gap-2">
            {editing && (
              <Button
                size="sm"
                variant="outline-danger"
                onClick={() => setShowDeleteModal(true)}
              >
                <i className="fas fa-trash-alt me-1"></i>
                Delete Profile
              </Button>
            )}
            {editing && (
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={handleCancel}
              >
                <i className="fas fa-times me-1"></i>
                Cancel
              </Button>
            )}

            <Button
              size="sm"
              variant={editing ? 'success' : 'outline-primary'}
              onClick={handleEditToggle}
              className="d-inline-flex align-items-center gap-1"
            >
              <i
                className={`fas ${
                  editing ? 'fa-save' : 'fa-edit'
                }`}
              ></i>
              {editing ? 'Save Profile' : 'Edit Profile'}
            </Button>
          </div>
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
                value={draftOwner.first_name}
                onChange={e =>
                  updateDraftField('first_name', e.target.value)
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
                value={draftOwner.last_name}
                onChange={e =>
                  updateDraftField('last_name', e.target.value)
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
                value={draftOwner.email}
                onChange={e =>
                  updateDraftField('email', e.target.value)
                }
              />
            </div>

            <div className="col-md-6">
              <Form.Label className="small fw-bold">
                Phone Number <span className="text-danger">*</span>
              </Form.Label>

              <PhoneNumberInput
                value={draftOwner.phone}
                onChange={(value) =>
                  updateDraftField('phone', value)
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
                value={draftOwner.address}
                onChange={e =>
                  updateDraftField('address', e.target.value)
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
                value={draftOwner.city}
                onChange={e =>
                  updateDraftField('city', e.target.value)
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
                value={draftOwner.county}
                onChange={e =>
                  updateDraftField('county', e.target.value)
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
                value={draftOwner.state}
                onChange={e =>
                  updateDraftField('state', e.target.value)
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
                value={draftOwner.zip_code}
                onChange={e =>
                  updateDraftField(
                    'zip_code',
                    e.target.value
                      .replace(/\D/g, '')
                      .slice(0, 5)
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

                {owner.address}, {owner.city}, {owner.state}{' '}
                {owner.zip_code}

                <span className="d-block text-muted small">
                  ({owner.county} County)
                </span>
              </div>
            </div>

          </div>
        )}
        <DeleteOwnerModal
          show={showDeleteModal}
          onHide={() => setShowDeleteModal(false)}
          owner={owner}
          onDeleted={onDeleteOwner}
        />
      </Card.Body>
    </Card>
  );
}