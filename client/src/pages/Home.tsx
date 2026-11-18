
import { useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function Home() {
  useEffect(() => {
    document.title = 'Home';
  }, []);

  return (
    <Container className="py-5">
      <div className="text-center mb-5">
        <h1 className="mb-2">Welcome to ShelterHelper</h1>
        <p>
          Select a module below to get started.
        </p>
      </div>

      <Row className="justify-content-center g-4">
        <Col xs={12} md={5}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center p-4 d-flex flex-column">
              <Card.Title>Rabies Clinics</Card.Title>
              <Card.Text>
                Manage rabies clinics, vaccinations, and certificates.
              </Card.Text>
              <div className="mt-auto">
                <Link to="/clinic-list" className="btn btn-primary">
                  Open Rabies Clinics
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={5}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center p-4 d-flex flex-column">
              <Card.Title>Surrender Forms</Card.Title>
              <Card.Text>
                Create surrender forms and review submitted applications.
              </Card.Text>
              <div className="mt-auto">
                <Link to="/surrender-forms" className="btn btn-primary">
                  Open Surrender Forms
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={5}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center p-4 d-flex flex-column">
              <Card.Title>Rescue Group Applications</Card.Title>
              <Card.Text>
                Manage rescue group applications and review organizations
                requesting to work with the shelter.
              </Card.Text>
              <div className="mt-auto">
                <Link to="/rescue-applications" className="btn btn-primary">
                  Open Rescue Applications
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={5}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center p-4 d-flex flex-column">
              <Card.Title>Lobby Slide Manager</Card.Title>
              <Card.Text>
                Upload and manage slides for the lobby slideshow. 
              </Card.Text>
              <div className="mt-auto">
                <Link to="/lobby-slides" className="btn btn-primary">
                  Open Lobby Slides
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Home;