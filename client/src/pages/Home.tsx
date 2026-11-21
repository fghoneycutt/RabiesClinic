
import { useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

type ModuleDefinition = {
  key: string;
  title: string;
  description: string;
  path: string;
  button: string;
};

const availableModules: ModuleDefinition[] = [
  {
    key: 'rabies_clinics',
    title: 'Rabies Clinics',
    description: 'Manage rabies clinics, vaccinations, and certificates.',
    path: '/clinic-list',
    button: 'Open Rabies Clinics'
  },
  {
    key: 'surrender_forms',
    title: 'Surrender Forms',
    description: 'Create surrender forms and review submitted applications.',
    path: '/surrender-forms',
    button: 'Open Surrender Forms'
  },
  {
    key: 'rescue_applications',
    title: 'Rescue Group Applications',
    description:
      'Manage rescue group applications and review organizations requesting to work with the shelter.',
    path: '/rescue-applications',
    button: 'Open Rescue Applications'
  },
  {
    key: 'lobby_slides',
    title: 'Lobby Slide Manager',
    description: 'Upload and manage slides for the lobby slideshow.',
    path: '/lobby-slides',
    button: 'Open Lobby Slides'
  }
];

function Home() {
  const { user, isPlatformAdmin } = useAuth();

  useEffect(() => {
    document.title = 'Home';
  }, []);

  const enabledModules = user?.enabled_modules || [];

  const visibleModules = isPlatformAdmin
    ? availableModules
    : availableModules.filter((module) =>
        enabledModules.includes(module.key)
      );

  return (
    <Container className="py-5">
      <div className="text-center mb-5">
        <h1 className="mb-2">Welcome to ShelterHelper</h1>
        <p>Select a module below to get started.</p>
      </div>

      {visibleModules.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-grid fs-1 text-muted" />

          <h5 className="mt-3">No modules are currently available</h5>

          <p className="text-muted">
            Contact your organization administrator for assistance.
          </p>
        </div>
      ) : (
        <Row className="justify-content-center g-4">
          {visibleModules.map((module) => (
            <Col key={module.key} xs={12} md={5}>
              <Card className="h-100 shadow-sm">
                <Card.Body className="text-center p-4 d-flex flex-column">
                  <Card.Title>{module.title}</Card.Title>

                  <Card.Text>{module.description}</Card.Text>

                  <div className="mt-auto">
                    <Link to={module.path} className="btn btn-primary">
                      {module.button}
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

export default Home;
