
import { useEffect } from 'react';

import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Spinner
} from 'react-bootstrap';

import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

type ModuleDefinition = {
  key: string;
  title: string;
  description: string;
  path: string;
  button: string;
  icon: string;
};

const availableModules: ModuleDefinition[] = [
  {
    key: 'rabies_clinics',
    title: 'Rabies Clinics',
    description: 'Manage rabies clinics, vaccinations, and certificates.',
    path: '/clinic-list',
    button: 'Open Rabies Clinics',
    icon: 'bi bi-shield-plus'
  },
  {
    key: 'surrender_forms',
    title: 'Surrender Forms',
    description: 'Create surrender forms and review submitted applications.',
    path: '/surrender-forms',
    button: 'Open Surrender Forms',
    icon: 'bi bi-file-earmark-text'
  },
  {
    key: 'rescue_applications',
    title: 'Rescue Group Applications',
    description:
      'Manage rescue group applications and review organizations requesting to work with the shelter.',
    path: '/rescue-applications',
    button: 'Open Rescue Applications',
    icon: 'bi bi-heart'
  },
  {
    key: 'lobby_slides',
    title: 'Lobby Slide Manager',
    description: 'Upload and manage slides for the lobby slideshow.',
    path: '/lobby-slides',
    button: 'Open Lobby Slides',
    icon: 'bi bi-display'
  }
];

function Home() {
  const {
    user,
    isPlatformAdmin,
    enabledModules,
    selectedOrganizationId,
    selectedOrganization,
    organizationsLoading,
    organizationsError
  } = useAuth();

  useEffect(() => {
    document.title = 'Home';
  }, []);

  // Platform-wide landing page.
  if (isPlatformAdmin && !selectedOrganizationId) {
    return (
      <Container className="py-5">
        <div className="text-center mb-5">
          <i className="bi bi-building-gear display-4 text-primary" />

          <h1 className="mt-3 mb-2">Platform Overview</h1>

          <p className="text-muted">
            You are viewing ShelterHelper at the platform level.
            Select an organization from the navbar to access its workspace.
          </p>

          <Link to="/platform-admin" className="btn btn-primary mt-3">
            <i className="bi bi-gear me-2" />
            Open Platform Administration
          </Link>
        </div>
      </Container>
    );
  }

  if (isPlatformAdmin && organizationsLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="text-muted mt-3">
          Loading organization settings...
        </p>
      </Container>
    );
  }

  if (isPlatformAdmin && organizationsError) {
    return (
      <Container className="py-5">
        <div className="alert alert-danger">
          Unable to load the selected organization's module settings.
          Please refresh the page or select the organization again.
        </div>
      </Container>
    );
  }

  if (isPlatformAdmin && !selectedOrganization) {
    return (
      <Container className="py-5">
        <div className="alert alert-warning">
          The selected organization could not be found. Please choose
          an organization again using the navbar.
        </div>
      </Container>
    );
  }

  const visibleModules = isPlatformAdmin
    ? availableModules
    : availableModules.filter(module =>
        enabledModules.includes(module.key)
      );

  return (
    <Container className="py-5">
      <div className="text-center mb-5">
        <h1 className="mb-2">Welcome to ShelterHelper</h1>

        {isPlatformAdmin && selectedOrganization ? (
          <p className="text-muted">
            Managing modules for{' '}
            <strong>{selectedOrganization.name}</strong>
          </p>
        ) : (
          <p>Select a module below to get started.</p>
        )}
      </div>

      {visibleModules.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-grid fs-1 text-muted" />

          <h5 className="mt-3">
            No modules are currently available
          </h5>

          <p className="text-muted">
            Contact your organization administrator for assistance.
          </p>
        </div>
      ) : (
        <Row className="justify-content-center g-4">
          {visibleModules.map(module => {
            const isEnabled = enabledModules.includes(module.key);

            return (
              <Col key={module.key} xs={12} md={6} lg={5}>
                <Card
                  className="h-100 shadow-sm position-relative"
                >
                  {isPlatformAdmin && !isEnabled && (
                    <Badge
                      bg="warning"
                      text="dark"
                      className="position-absolute top-0 end-0 m-3"
                    >
                      <i className="bi bi-exclamation-triangle-fill me-1" />
                      Not enabled
                    </Badge>
                  )}

                  <Card.Body className="text-center p-4 d-flex flex-column">
                    <div className="mb-3">
                      <i className={`${module.icon} fs-1 text-primary`} />
                    </div>

                    <Card.Title>{module.title}</Card.Title>

                    <Card.Text>{module.description}</Card.Text>

                    <div className="mt-auto">
                      <Link
                        to={module.path}
                        className="btn btn-primary"
                      >
                        {module.button}
                      </Link>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );
}

export default Home;