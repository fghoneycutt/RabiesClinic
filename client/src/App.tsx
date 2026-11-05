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

import WalkinIntake from './pages/RabiesClinics/WalkinIntake';
import PublicRegistrationPage from './pages/RabiesClinics/PublicRegistrationPage';
import NextClinicRegistrationPage from './pages/RabiesClinics/NextClinicRegistrationPage';

import CreateClinic from './pages/RabiesClinics/CreateClinic';
import EditClinic from './pages/RabiesClinics/EditClinic';
import ClinicPage from './pages/RabiesClinics/ClinicPage';
import ClinicList from './pages/RabiesClinics/ClinicList';
import OwnerProfilePage from './pages/RabiesClinics/OwnerProfilePage';

import SurrenderForms from './pages/Forms/SurrenderForms';
import SurrenderFormBuilder from './pages/Forms/SurrenderFormBuilder';
import PublicSurrenderForm from './pages/Forms/PublicSurrenderForm';
import SurrenderSubmissionReview from './pages/Forms/SurrenderSubmissionReview';

// -----------------------------------
// APP LAYOUT
// -----------------------------------
function AppLayout() {
  const location = useLocation();

  const hideNavbar =
    location.pathname === '/register/next-clinic' ||
    /^\/clinics\/[^/]+\/register$/.test(location.pathname) ||
    location.pathname.startsWith('/surrender/');

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
            path="/register/next-clinic"
            element={<NextClinicRegistrationPage />}
          />

          <Route
            path="/clinics/:id/register"
            element={<PublicRegistrationPage />}
          />

          <Route
            path="/surrender/:slug"
            element={<PublicSurrenderForm />}
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
              path="/clinic-list"
              element={<ClinicList />}
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
            {/* Forms */}
            <Route
              path="/surrender-forms"
              element={<SurrenderForms />}
            />

            <Route
              path="/surrender-forms/:id/edit"
              element={<SurrenderFormBuilder/>}
            />

            <Route
              path="/surrender-submissions/:id"
              element={<SurrenderSubmissionReview/>}
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