
import { Link, useNavigate, useLocation } from 'react-router-dom';

import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';

import { useAuth } from '../auth/AuthContext';
import { useState, useEffect } from 'react';

import OrganizationSwitcher from './OrganizationSwitcher';

import './AppNavbar.css';

export default function AppNavbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    logout,
    isPlatformAdmin,
    isOrganizationAdmin,
    enabledModules,
    selectedOrganizationId
  } = useAuth();

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
    {
      label: 'Rabies Clinics',
      path: '/clinic-list',
      moduleKey: 'rabies_clinics',
      icon: 'bi bi-shield-plus'
    },
    {
      label: 'Surrender Forms',
      path: '/surrender-forms',
      moduleKey: 'surrender_forms',
      icon: 'bi bi-file-earmark-text'
    },
    {
      label: 'Rescue Applications',
      path: '/rescue-applications',
      moduleKey: 'rescue_applications',
      icon: 'bi bi-heart'
    },
    {
      label: 'Lobby Slides',
      path: '/lobby-slides',
      moduleKey: 'lobby_slides',
      icon: 'bi bi-display'
    },
    {
      label: 'Cat Trap Rentals',
      path: '/cat-trap-rentals',
      moduleKey: 'cat_trap_rentals',
      icon: 'bi bi-box-seam'
    }
  ];

  // Platform admins see all modules when operating within
  // an organization. Organization users only see enabled modules.
  const showModuleMenu = isPlatformAdmin
    ? !!selectedOrganizationId
    : enabledModules.length > 0;

  const visibleNavItems = isPlatformAdmin
    ? navItems
    : navItems.filter(item =>
        enabledModules.includes(item.moduleKey)
      );

  return (
    <Navbar
      bg="dark"
      variant="dark"
      expand="lg"
      sticky="top"
      expanded={expanded}
      onToggle={nextExpanded => setExpanded(nextExpanded)}
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

        {user && (
          <>
            <Navbar.Toggle aria-controls="shelter-navbar-collapse" />

            <Navbar.Collapse id="shelter-navbar-collapse">

              {/* Navigation */}
              <Nav className="shelter-nav mx-lg-auto">

                {/* Modules dropdown */}
                {showModuleMenu && (
                  <NavDropdown
                    title="Modules"
                    id="shelter-modules-dropdown"
                    className="shelter-nav-link"
                  >
                    {visibleNavItems.map(item => {
                      const isEnabled = enabledModules.includes(
                        item.moduleKey
                      );

                      return (
                        <NavDropdown.Item
                          key={item.path}
                          as={Link}
                          to={item.path}
                          active={isActive(item.path)}
                          className={`module-dropdown-item ${
                            isPlatformAdmin && !isEnabled
                              ? 'disabled-module'
                              : ''
                          }`}
                        >
                          <span>
                            <i className={`${item.icon} me-2`} />
                            {item.label}
                          </span>

                          {isPlatformAdmin && (
                            <Badge
                              bg={isEnabled ? 'success' : 'warning'}
                              text={isEnabled ? undefined : 'dark'}
                              className="ms-3"
                            >
                              {isEnabled ? (
                                <>
                                  <i className="bi bi-check-circle-fill me-1" />
                                  Enabled
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-exclamation-triangle-fill me-1" />
                                  Not enabled
                                </>
                              )}
                            </Badge>
                          )}
                        </NavDropdown.Item>
                      );
                    })}
                  </NavDropdown>
                )}

                {/* Organization administration */}
                {isOrganizationAdmin && (
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

                {/* Platform administration */}
                {isPlatformAdmin && (
                  <Nav.Link
                    as={Link}
                    to="/platform-admin"
                    className={`shelter-nav-link ${
                      isActive('/platform-admin') ? 'active' : ''
                    }`}
                  >
                    Platform Administration
                  </Nav.Link>
                )}
              </Nav>

              {/* User actions */}
              <div className="navbar-actions">

                {isPlatformAdmin && (
                  <div className="navbar-organization-switcher">
                    <OrganizationSwitcher />
                  </div>
                )}

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