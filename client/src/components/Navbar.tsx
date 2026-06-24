import { Link, useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

import { useAuth } from '../auth/AuthContext';

export default function AppNavbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>

        {/* Brand */}
        <Navbar.Brand as={Link} to="/">
          Rabies Clinic
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />

        <Navbar.Collapse id="basic-navbar-nav">

          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">
              Home
            </Nav.Link>

            {user?.role === 'admin' && (
              <Nav.Link as={Link} to="/admin/users">
                User Management
              </Nav.Link>
            )}
          </Nav>

          {/* Right side */}
          {user && (
            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-light"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          )}

        </Navbar.Collapse>

      </Container>
    </Navbar>
  );
}