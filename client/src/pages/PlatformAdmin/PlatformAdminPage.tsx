
import { useEffect, useState } from 'react';

import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';

import { api } from '../../api/api';

type PlatformOverview = {
  organizations: {
    total: number;
    active: number;
  };
  users: {
    total: number;
  };
  modules: {
    total: number;
  };
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  user_count: number;
  enabled_modules: string[];
};

type Module = {
  key: string;
  name: string;
  description: string | null;
};

export default function PlatformAdminPage() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [modules, setModules] = useState<Module[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  useEffect(() => {
    document.title = 'Platform Administration';
    loadData();
  }, []);

  // ==========================================
  // LOAD PLATFORM DATA
  // ==========================================

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        overviewRes,
        organizationsRes,
        modulesRes
      ] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/organizations'),
        api.get('/admin/modules')
      ]);

      setOverview(overviewRes.data);
      setOrganizations(organizationsRes.data);
      setModules(modulesRes.data);
    } catch (err: any) {
      console.error('Failed to load platform administration data:', err);

      setError(
        err?.response?.data?.message ||
        'Failed to load platform information.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ORGANIZATION MODAL
  // ==========================================

  const openCreateModal = () => {
    setEditingOrganization(null);
    setName('');
    setSlug('');
    setSelectedModules([]);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (organization: Organization) => {
    setEditingOrganization(organization);
    setName(organization.name);
    setSlug(organization.slug);
    setSelectedModules(organization.enabled_modules || []);
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
  };

  // ==========================================
  // FORM HANDLERS
  // ==========================================

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
    setSelectedModules((current) =>
      current.includes(moduleKey)
        ? current.filter((key) => key !== moduleKey)
        : [...current, moduleKey]
    );
  };

  // ==========================================
  // SAVE ORGANIZATION
  // ==========================================

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      setError('Organization name and slug are required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (editingOrganization) {
        await api.put(
          `/admin/organizations/${editingOrganization.id}`,
          {
            name: name.trim(),
            slug: slug.trim()
          }
        );

        await api.put(
          `/admin/organizations/${editingOrganization.id}/modules`,
          {
            module_keys: selectedModules
          }
        );

        setSuccess(`${name.trim()} was updated successfully.`);
      } else {
        await api.post('/admin/organizations', {
          name: name.trim(),
          slug: slug.trim(),
          module_keys: selectedModules
        });

        setSuccess(`${name.trim()} was created successfully.`);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Failed to save organization:', err);

      setError(
        err?.response?.data?.message ||
        'Failed to save organization.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ACTIVATE / DEACTIVATE ORGANIZATION
  // ==========================================

  const toggleOrganizationStatus = async (
    organization: Organization
  ) => {
    const action = organization.is_active ? 'deactivate' : 'activate';

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${organization.name}?`
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccess(null);

      await api.patch(
        `/admin/organizations/${organization.id}/status`,
        {
          is_active: !organization.is_active
        }
      );

      setSuccess(
        `${organization.name} was ${action}d successfully.`
      );

      await loadData();
    } catch (err: any) {
      console.error('Failed to update organization status:', err);

      setError(
        err?.response?.data?.message ||
        'Failed to update organization status.'
      );
    }
  };

  // ==========================================
  // HELPERS
  // ==========================================

  const getModuleName = (key: string) => {
    return modules.find((module) => module.key === key)?.name || key;
  };

  const stats = [
    {
      title: 'Organizations',
      value: overview?.organizations.total ?? 0,
      subtitle: `${overview?.organizations.active ?? 0} active`,
      icon: 'bi-building',
      color: 'primary'
    },
    {
      title: 'User Accounts',
      value: overview?.users.total ?? 0,
      subtitle: 'Across all organizations',
      icon: 'bi-people',
      color: 'success'
    },
    {
      title: 'Available Modules',
      value: overview?.modules.total ?? 0,
      subtitle: 'Platform-wide modules',
      icon: 'bi-grid',
      color: 'info'
    }
  ];

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <>
      {/* PAGE HEADER */}

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h2 className="mb-1">Platform Administration</h2>

          <p className="text-muted mb-0">
            Manage ShelterHelper organizations, modules, and accounts.
          </p>
        </div>

        <Button
          variant="outline-secondary"
          onClick={loadData}
          disabled={loading}
        >
          <i className="bi bi-arrow-clockwise me-2" />
          Refresh
        </Button>
      </div>

      {/* ALERTS */}

      {error && (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />

          <p className="text-muted mt-2 mb-0">
            Loading platform information...
          </p>
        </div>
      ) : (
        <>
          {/* PLATFORM STATISTICS */}

          <Row className="g-3 mb-4">
            {stats.map((stat) => (
              <Col key={stat.title} xs={12} md={4}>
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="text-muted mb-2">
                          {stat.title}
                        </div>

                        <h2 className="mb-1">
                          {stat.value}
                        </h2>

                        <small className="text-muted">
                          {stat.subtitle}
                        </small>
                      </div>

                      <div
                        className={`text-${stat.color}`}
                        style={{ fontSize: '2rem' }}
                      >
                        <i className={`bi ${stat.icon}`} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* ORGANIZATION MANAGEMENT */}

          <Card className="shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
                <div>
                  <h5 className="mb-1">Organizations</h5>

                  <p className="text-muted small mb-0">
                    Manage shelters and their access to ShelterHelper.
                  </p>
                </div>

                <Button onClick={openCreateModal}>
                  <i className="bi bi-plus-lg me-2" />
                  Add Organization
                </Button>
              </div>

              {organizations.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-building fs-1 text-muted" />

                  <h5 className="mt-3">
                    No organizations found
                  </h5>

                  <p className="text-muted">
                    Create your first organization to get started.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Organization</th>
                        <th>Status</th>
                        <th>Users</th>
                        <th>Enabled Modules</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {organizations.map((organization) => (
                        <tr key={organization.id}>
                          <td>
                            <div className="fw-semibold">
                              {organization.name}
                            </div>

                            <small className="text-muted">
                              {organization.slug}
                            </small>
                          </td>

                          <td>
                            {organization.is_active ? (
                              <Badge bg="success">
                                Active
                              </Badge>
                            ) : (
                              <Badge bg="secondary">
                                Inactive
                              </Badge>
                            )}
                          </td>

                          <td>
                            {organization.user_count}
                          </td>

                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {organization.enabled_modules?.length ? (
                                organization.enabled_modules.map((key) => (
                                  <Badge
                                    key={key}
                                    bg="light"
                                    text="dark"
                                    className="border"
                                  >
                                    {getModuleName(key)}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted small">
                                  No modules enabled
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="d-flex justify-content-end gap-2">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() =>
                                  openEditModal(organization)
                                }
                              >
                                <i className="bi bi-pencil me-1" />
                                Edit
                              </Button>

                              <Button
                                size="sm"
                                variant={
                                  organization.is_active
                                    ? 'outline-danger'
                                    : 'outline-success'
                                }
                                onClick={() =>
                                  toggleOrganizationStatus(organization)
                                }
                              >
                                {organization.is_active ? (
                                  <>
                                    <i className="bi bi-pause-circle me-1" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-play-circle me-1" />
                                    Activate
                                  </>
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* FUTURE PLATFORM MANAGEMENT */}

          <Row className="g-3 mt-1">
            <Col xs={12} md={6}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-people fs-4 me-2 text-success" />

                    <h6 className="mb-0">
                      Account Management
                    </h6>

                    <Badge bg="secondary" className="ms-auto">
                      Coming Soon
                    </Badge>
                  </div>

                  <p className="text-muted small mb-0">
                    Review accounts across organizations and manage
                    platform-wide account access.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={6}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-activity fs-4 me-2 text-info" />

                    <h6 className="mb-0">
                      Platform Activity
                    </h6>

                    <Badge bg="secondary" className="ms-auto">
                      Coming Soon
                    </Badge>
                  </div>

                  <p className="text-muted small mb-0">
                    Monitor platform activity and review important
                    administrative changes.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* CREATE / EDIT ORGANIZATION MODAL */}

      <Modal
        show={showModal}
        onHide={closeModal}
        size="lg"
        centered
      >
        <Modal.Header closeButton={!saving}>
          <Modal.Title>
            {editingOrganization
              ? 'Edit Organization'
              : 'Create Organization'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>
                Organization Name
              </Form.Label>

              <Form.Control
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Example: Person County Animal Services"
                required
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>
                Organization Slug
              </Form.Label>

              <Form.Control
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="person-county"
                required
              />

              <Form.Text className="text-muted">
                A unique identifier for this organization.
                Use lowercase letters, numbers, and hyphens.
              </Form.Text>
            </Form.Group>

            <hr className="my-4" />

            <h6 className="mb-1">
              Module Access
            </h6>

            <p className="text-muted small">
              Select the features this organization should have access to.
            </p>

            {modules.length === 0 ? (
              <p className="text-muted">
                No modules are currently available.
              </p>
            ) : (
              <div className="border rounded p-3">
                {modules.map((module) => (
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
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={closeModal}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !slug.trim()}
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
              editingOrganization
                ? 'Save Changes'
                : 'Create Organization'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}