
import { useEffect, useState } from 'react';

import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';

export type OrganizationFormData = {
  name: string;
  slug: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  physical_address: string;
  module_keys: string[];
};

export type OrganizationFormRecord = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  user_count: number;
  enabled_modules: string[];
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  physical_address: string | null;
};

type Module = {
  key: string;
  name: string;
  description: string | null;
};

type Props = {
  show: boolean;
  organization: OrganizationFormRecord | null;
  modules: Module[];
  saving: boolean;
  error: string | null;
  onHide: () => void;
  onSave: (data: OrganizationFormData) => void;
};

export default function OrganizationFormModal({
  show,
  organization,
  modules,
  saving,
  error,
  onHide,
  onSave
}: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactEmail, setPrimaryContactEmail] = useState('');
  const [primaryContactPhone, setPrimaryContactPhone] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  useEffect(() => {
    if (!show) return;

    setName(organization?.name || '');
    setSlug(organization?.slug || '');
    setPrimaryContactName(organization?.primary_contact_name || '');
    setPrimaryContactEmail(organization?.primary_contact_email || '');
    setPrimaryContactPhone(organization?.primary_contact_phone || '');
    setPhysicalAddress(organization?.physical_address || '');
    setSelectedModules(organization?.enabled_modules || []);
  }, [show, organization]);

  const handleSlugChange = (value: string) => {
    setSlug(
      value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    );
  };

  const toggleModule = (moduleKey: string) => {
    setSelectedModules(current =>
      current.includes(moduleKey)
        ? current.filter(key => key !== moduleKey)
        : [...current, moduleKey]
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onSave({
      name: name.trim(),
      slug: slug.trim(),
      primary_contact_name: primaryContactName.trim(),
      primary_contact_email: primaryContactEmail.trim(),
      primary_contact_phone: primaryContactPhone.trim(),
      physical_address: physicalAddress.trim(),
      module_keys: selectedModules
    });
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop={saving ? 'static' : true}
      keyboard={!saving}
    >
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton={!saving}>
          <Modal.Title>
            {organization ? 'Edit Organization' : 'Create Organization'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}

          <h6 className="mb-3">Organization Information</h6>

          <Form.Group className="mb-3">
            <Form.Label>Organization Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              required
              maxLength={255}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Organization Slug</Form.Label>
            <Form.Control
              type="text"
              value={slug}
              onChange={event => handleSlugChange(event.target.value)}
              required
            />
            <Form.Text className="text-muted">
              A unique identifier using lowercase letters, numbers, and hyphens.
            </Form.Text>
          </Form.Group>

          <hr />

          <h6 className="mb-3">Primary Contact</h6>

          <Form.Group className="mb-3">
            <Form.Label>Contact Name</Form.Label>
            <Form.Control
              type="text"
              value={primaryContactName}
              onChange={event => setPrimaryContactName(event.target.value)}
              required
              maxLength={255}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              value={primaryContactEmail}
              onChange={event => setPrimaryContactEmail(event.target.value)}
              required
              maxLength={255}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Phone Number</Form.Label>
            <Form.Control
              type="tel"
              value={primaryContactPhone}
              onChange={event => setPrimaryContactPhone(event.target.value)}
              required
              maxLength={50}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Physical Address</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={physicalAddress}
              onChange={event => setPhysicalAddress(event.target.value)}
              required
              maxLength={1000}
            />
          </Form.Group>

          <hr />

          <h6 className="mb-1">Module Access</h6>

          <p className="text-muted small">
            Select the features this organization should have access to.
          </p>

          {modules.length === 0 ? (
            <p className="text-muted">
              No modules are currently available.
            </p>
          ) : (
            <div className="border rounded p-3">
              {modules.map(module => (
                <Form.Check
                  key={module.key}
                  type="checkbox"
                  id={`module-${module.key}`}
                  className="mb-3"
                  checked={selectedModules.includes(module.key)}
                  onChange={() => toggleModule(module.key)}
                  label={
                    <div>
                      <div className="fw-semibold">
                        {module.name}
                      </div>

                      {module.description && (
                        <small className="text-muted">
                          {module.description}
                        </small>
                      )}
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={onHide}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={
              saving ||
              !name.trim() ||
              !slug.trim() ||
              !primaryContactName.trim() ||
              !primaryContactEmail.trim() ||
              !primaryContactPhone.trim() ||
              !physicalAddress.trim()
            }
          >
            {saving ? (
              <>
                <Spinner
                  size="sm"
                  animation="border"
                  className="me-2"
                />
                Saving...
              </>
            ) : (
              organization ? 'Save Changes' : 'Create Organization'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}