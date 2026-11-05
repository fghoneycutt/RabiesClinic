import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function Home() {
  document.title = 'Home';
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
            <Card.Body className="text-center p-4">
              <Card.Title>Rabies Clinics</Card.Title>
              <Card.Text>
                Manage rabies clinics, vaccinations, and certificates.
              </Card.Text>
              <Link to="/clinic-list" className="btn btn-primary">
                Open Rabies Clinics
              </Link>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={5}>
          <Card className="h-100 shadow-sm">
            <Card.Body className="text-center p-4">
              <Card.Title>Surrender Forms</Card.Title>
              <Card.Text>
                Create surrender forms and review submitted applications.
              </Card.Text>
              <Link to="/surrender-forms" className="btn btn-primary">
                Open Surrender Forms
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Home;