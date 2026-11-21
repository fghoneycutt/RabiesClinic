import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import Container from 'react-bootstrap/Container';

import './App.css';


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

import SurrenderForms from './pages/Forms/SurrenderForms/SurrenderForms';
import FormBuilder from './pages/Forms/FormBuilder';
import PublicSurrenderForm from './pages/Forms/PublicForms/PublicSurrenderForm';
import FormSubmissionReview from './pages/Forms/FormSubmissionReview';

import RescueApplications from './pages/Forms/RescueGroupApplications/RescueApplications';
import PublicRescueApplication from './pages/Forms/PublicForms/PublicRescueApplication';

import LobbySlides from './pages/LobbySlides/LobbySlides';

import PlatformAdminPage from './pages/PlatformAdmin/PlatformAdminPage';
import RoleProtectedRoute from './auth/RoleProtectedRoute';
// -----------------------------------
// APP LAYOUT
// -----------------------------------
function AppLayout() {
  const location = useLocation();

  const hideNavbar =
  location.pathname === '/register/next-clinic' ||
  /^\/clinics\/[^/]+\/register$/.test(location.pathname) ||
  location.pathname.startsWith('/surrender/') ||
  location.pathname.startsWith('/rescue/');

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
          <Route
            path="/rescue/:slug"
            element={<PublicRescueApplication />}
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
            {/* Surrender Forms */}
            <Route
              path="/surrender-forms"
              element={<SurrenderForms />}
            />

            <Route
              path="/forms/:id/edit"
              element={<FormBuilder/>}
            />

            <Route
              path="/surrender-submissions/:id"
              element={<FormSubmissionReview />}
            />

            <Route
              path="/rescue-submissions/:id"
              element={<FormSubmissionReview />}
            />
            {/* Rescue Group Applications */}
            <Route
              path="/rescue-applications"
              element={<RescueApplications/>}
            />

            <Route
              path="/lobby-slides"
              element={<LobbySlides />}
            />
            <Route element={<RoleProtectedRoute requirePlatformAdmin />}>
              <Route
                path="/platform-admin"
                element={<PlatformAdminPage />}
              />
            </Route>

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