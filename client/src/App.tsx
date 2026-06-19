import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Container from 'react-bootstrap/Container';

import AppNavbar from './components/Navbar';

import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';

import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminCreateUserPage from './pages/AdminCreateUserPage';
import AdminUserListPage from './pages/AdminUserListPage';
import NotFoundPage from './pages/NotFoundPage';

import WalkinIntake from './pages/WalkinIntake';
import CreateClinic from './pages/CreateClinic';
import EditClinic from './pages/EditClinic';
import ClinicPage from './pages/ClinicPage';
import OwnerProfilePage from './pages/OwnerProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>

        <AppNavbar />

        <Container className="py-4">
          <Routes>

            {/* PUBLIC */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/clinics/:id/intake"
              element={<WalkinIntake />}
            />

            {/* PROTECTED */}
            <Route element={<ProtectedRoute />}>

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
                path="/clinics/:clinicId/owners/:ownerId"
                element={<OwnerProfilePage />}
              />

              {/* ADMIN ONLY (still protected for now) */}
              <Route
                path="/admin/create-users"
                element={<AdminCreateUserPage />}
              />
              <Route
                path="/admin/users"
                element={<AdminUserListPage />}
              />

            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />

          </Routes>
        </Container>

      </AuthProvider>
    </BrowserRouter>
  );
}