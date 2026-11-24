
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';

import { useAuth } from '../auth/AuthContext';
import { ACTIVE_ORGANIZATION_STORAGE_KEY } from '../api/api';

export default function OrganizationSwitcher() {
  const {
    organizations,
    organizationsLoading,
    organizationsError,
    selectedOrganizationId
  } = useAuth();

  function handleOrganizationChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const organizationId = event.target.value;

    if (organizationId) {
      localStorage.setItem(
        ACTIVE_ORGANIZATION_STORAGE_KEY,
        organizationId
      );
    } else {
      localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
    }

    // Reload organization-scoped data using the new context.
    window.location.reload();
  }

  if (organizationsLoading) {
    return (
      <div className="d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" />
        <small>Loading organizations...</small>
      </div>
    );
  }

  if (organizationsError) {
    return (
      <Alert variant="danger" className="mb-0 py-1 px-2">
        <small>{organizationsError}</small>
      </Alert>
    );
  }

  return (
    <Form.Group className="mb-0">
      <Form.Select
        size="sm"
        value={selectedOrganizationId}
        onChange={handleOrganizationChange}
        aria-label="Select organization context"
        style={{ minWidth: '220px' }}
      >
        <option value="">Platform overview</option>

        {organizations.map(organization => (
          <option
            key={organization.id}
            value={organization.id}
          >
            {organization.name}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
}