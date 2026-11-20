
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react';

import './AppNavbar.css';

export default function AppNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Rabies Clinics', path: '/clinic-list' },
    { label: 'Surrender Forms', path: '/surrender-forms' },
    { label: 'Rescue Applications', path: '/rescue-applications' },
    { label: 'Lobby Slides', path: '/lobby-slides' },
  ];

  return (
    <Navbar
      bg="dark"
      variant="dark"
      expand="lg"
      sticky="top"
      expanded={expanded}
      onToggle={(nextExpanded) => setExpanded(nextExpanded)}
      className="shelter-navbar"
    >
      <Container fluid="lg">

        {/* Brand */}
        <Navbar.Brand as={Link} to="/" className="shelter-brand">
          <span className="brand-icon">
            <i className="bi bi-house-heart-fill" />
          </span>

          <span className="brand-name">
            Shelter<span>Helper</span>
          </span>
        </Navbar.Brand>

        {/* Only show navigation and user controls when logged in */}
        {user && (
          <>
            <Navbar.Toggle aria-controls="shelter-navbar-collapse" />

            <Navbar.Collapse id="shelter-navbar-collapse">

              {/* Navigation */}
              <Nav className="shelter-nav mx-lg-auto">
                {navItems.map((item) => (
                  <Nav.Link
                    key={item.path}
                    as={Link}
                    to={item.path}
                    className={`shelter-nav-link ${
                      isActive(item.path) ? 'active' : ''
                    }`}
                  >
                    {item.label}
                  </Nav.Link>
                ))}

                {user.role === 'admin' && (
                  <Nav.Link
                    as={Link}
                    to="/admin/users"
                    className={`shelter-nav-link ${
                      isActive('/admin/users') ? 'active' : ''
                    }`}
                  >
                    User Management
                  </Nav.Link>
                )}
              </Nav>

              {/* User actions */}
              <div className="navbar-actions">
                <Button
                  variant="outline-light"
                  className="navbar-logout"
                  onClick={handleLogout}
                >
                  <i className="bi bi-box-arrow-right me-2" />
                  Logout
                </Button>
              </div>

            </Navbar.Collapse>
          </>
        )}
      </Container>
    </Navbar>
  );
}