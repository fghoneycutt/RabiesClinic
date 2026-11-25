
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

// Cat Trap Rentals
import CatTrapRentals from './pages/CatTrapRental/CatTrapRentals';
import CatTrapRentalSettings from './pages/CatTrapRental/CatTrapRentalSettings';

// Signing Station
import SigningSessions from './pages/SigningPages/SigningSessions';
import SigningStation from './pages/SigningPages/SigningStation';


import ShelterOperationsHome from './pages/ShelterOperations/ShelterOperationsHome';

// -----------------------------------
// APP LAYOUT
// -----------------------------------
function AppLayout() {
  const location = useLocation();

  const isSigningStation =
    location.pathname === '/signing-station';

  const hideNavbar =
    isSigningStation ||
    location.pathname === '/register/next-clinic' ||
    /^\/clinics\/[^/]+\/register$/.test(location.pathname) ||
    location.pathname.startsWith('/surrender/') ||
    location.pathname.startsWith('/rescue/');

  return (
    <>
      {!hideNavbar && <AppNavbar />}

      <Container
        fluid={isSigningStation}
        className={isSigningStation ? 'p-0' : 'py-4'}
      >
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

          {/* Dedicated iPad signing station */}
          <Route
            path="/signing-station"
            element={<SigningStation />}
          />

          {/* -------------------- */}
          {/* PROTECTED ROUTES */}
          {/* -------------------- */}

          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={<Home />}
            />

            {/* Rabies Clinics */}
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

            {/* User Administration */}
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
              element={<FormBuilder />}
            />

            <Route
              path="/surrender-submissions/:id"
              element={<FormSubmissionReview />}
            />

            {/* Rescue Group Applications */}
            <Route
              path="/rescue-applications"
              element={<RescueApplications />}
            />

            <Route
              path="/rescue-submissions/:id"
              element={<FormSubmissionReview />}
            />

            {/* Lobby Slides */}
            <Route
              path="/lobby-slides"
              element={<LobbySlides />}
            />

            {/* Shelter Management System*/}
            <Route
              path="/shelter-operations"
              element={<ShelterOperationsHome />}
            />

            {/* Cat Trap Rentals */}
            <Route
              path="/cat-trap-rentals"
              element={<CatTrapRentals />}
            />

            <Route
              path="/cat-trap-rentals/settings"
              element={<CatTrapRentalSettings />}
            />

            {/* Signing Session Management */}
            <Route
              path="/signing-sessions"
              element={<SigningSessions />}
            />

            {/* Platform Administration */}
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

// -----------------------------------
// APP
// -----------------------------------
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}