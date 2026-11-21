
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

type RoleProtectedRouteProps = {
  requirePlatformAdmin?: boolean;
  requireOrganizationAdmin?: boolean;
};

export default function RoleProtectedRoute({
  requirePlatformAdmin = false,
  requireOrganizationAdmin = false,
}: RoleProtectedRouteProps) {
  const {
    user,
    loading,
    isPlatformAdmin,
    isOrganizationAdmin,
  } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireOrganizationAdmin && !isOrganizationAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}