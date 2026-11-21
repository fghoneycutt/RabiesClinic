
import { useEffect, useState } from 'react';

import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';

import { api, ACTIVE_ORGANIZATION_STORAGE_KEY } from '../api/api';

interface Organization {
  id: string;
  name: string;
}

interface OrganizationSwitcherProps {
  onOrganizationChange?: (organizationId: string | null) => void;
}

export default function OrganizationSwitcher({
  onOrganizationChange,
}: OrganizationSwitcherProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    () => localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY) || ''
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadOrganizations() {
      try {
        setLoading(true);
        setError('');

        const response = await api.get('/admin/organizations');

        const data = response.data;

        const organizationList: Organization[] = Array.isArray(data)
          ? data
          : data.organizations || [];

        if (!cancelled) {
          setOrganizations(organizationList);
        }
      } catch (err) {
        console.error('Unable to load organizations:', err);

        if (!cancelled) {
          setError('Unable to load organizations.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleOrganizationChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const organizationId = event.target.value;

    setSelectedOrganizationId(organizationId);

    if (organizationId) {
      localStorage.setItem(
        ACTIVE_ORGANIZATION_STORAGE_KEY,
        organizationId
      );
    } else {
      localStorage.removeItem(
        ACTIVE_ORGANIZATION_STORAGE_KEY
      );
    }

    onOrganizationChange?.(organizationId || null);

    // Reload the application so all organization-scoped data
    // is fetched again using the newly selected context.
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" />
        <small>Loading organizations...</small>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mb-0 py-1 px-2">
        <small>{error}</small>
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

        {organizations.map((organization) => (
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