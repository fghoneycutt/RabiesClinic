import {
  Card,
  Col,
  Row
} from 'react-bootstrap';
import {
  FaBuilding,
  FaPaw
} from 'react-icons/fa';

export default function ShelterVisualTab() {
  return (
    <div>
      <div className="mb-3">
        <h4 className="fw-bold mb-1">Visual Shelter</h4>
        <div className="text-muted">
          View and manage animals throughout your shelter.
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="py-5 text-center">
          <FaBuilding
            size={48}
            className="text-muted mb-3"
          />

          <h5 className="fw-bold">Your Visual Shelter</h5>

          <p className="text-muted mx-auto mb-0" style={{ maxWidth: '500px' }}>
            This space will eventually provide a visual layout of your shelter,
            including kennels, rooms, cages, and other animal housing locations.
            You'll be able to see which spaces are occupied and which are available.
          </p>

          <div className="mt-4">
            <Row className="justify-content-center">
              <Col xs={12} md={6} lg={4}>
                <div className="border rounded p-4">
                  <FaPaw size={24} className="text-muted mb-2" />
                  <div className="fw-semibold">Housing management</div>
                  <small className="text-muted">
                    Coming in a future update
                  </small>
                </div>
              </Col>
            </Row>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}