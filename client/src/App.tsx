import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import Container from 'react-bootstrap/Container';

import AppNavbar from './components/Navbar';

import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';

import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import AdminCreateUserPage from './pages/AdminCreateUserPage';
import AdminUserListPage from './pages/AdminUserListPage';
import NotFoundPage from './pages/NotFoundPage';

import WalkinIntake from './pages/WalkinIntake';
import PublicRegistrationPage from './pages/PublicRegistrationPage';

import CreateClinic from './pages/CreateClinic';
import EditClinic from './pages/EditClinic';
import ClinicPage from './pages/ClinicPage';
import OwnerProfilePage from './pages/OwnerProfilePage';

// -----------------------------------
// APP LAYOUT
// -----------------------------------
function AppLayout() {
  const location = useLocation();

  const hideNavbar =
    /^\/clinics\/[^/]+\/register$/.test(
      location.pathname
    );

  return (
    <>
      {!hideNavbar && <AppNavbar />}

      <Container className="py-4">
        <Routes>

          {/* -------------------- */}
          {/* PUBLIC ROUTES */}
          {/* -------------------- */}

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/clinics/:id/register"
            element={<PublicRegistrationPage />}
          />

          {/* -------------------- */}
          {/* PROTECTED ROUTES */}
          {/* -------------------- */}

          <Route element={<ProtectedRoute />}>

            <Route
              path="/"
              element={<Home />}
            />

            <Route
              path="/clinics/new"
              element={<CreateClinic />}
            />

            <Route
              path="/clinics/:id/edit"
              element={<EditClinic />}
            />

            <Route
              path="/clinics/:id"
              element={<ClinicPage />}
            />

            <Route
              path="/clinics/:id/intake"
              element={<WalkinIntake />}
            />

            <Route
              path="/clinics/:clinicId/owners/:ownerId"
              element={<OwnerProfilePage />}
            />

            <Route
              path="/admin/create-users"
              element={<AdminCreateUserPage />}
            />

            <Route
              path="/admin/users"
              element={<AdminUserListPage />}
            />

            {/* Logged-in users get actual 404 page */}
            <Route
              path="*"
              element={<NotFoundPage />}
            />

          </Route>

          {/* Unauthenticated users get redirected to login */}
          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />

        </Routes>
      </Container>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}