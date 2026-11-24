
import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import { api, ACTIVE_ORGANIZATION_STORAGE_KEY } from '../api/api';

type User = {
  id: string;
  email: string;
  name?: string;
  role?: 'staff' | 'admin';
  organization_id: string;
  platform_role?: 'platform_admin' | null;
  enabled_modules: string[];
};

export type Organization = {
  id: string;
  name: string;
  slug?: string;
  is_active?: boolean;
  enabled_modules: string[];
  user_count?: number;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  isOrganizationAdmin: boolean;

  organizations: Organization[];
  organizationsLoading: boolean;
  organizationsError: string;
  selectedOrganizationId: string;
  selectedOrganization: Organization | null;
  enabledModules: string[];
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [organizationsError, setOrganizationsError] = useState('');

  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    () => localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY) || ''
  );

  const isAuthenticated = !!user;
  const isPlatformAdmin = user?.platform_role === 'platform_admin';
  const isOrganizationAdmin = user?.role === 'admin';

  // -----------------------------
  // LOAD SESSION
  // -----------------------------
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const authenticatedUser: User = {
          ...res.data,
          enabled_modules: res.data.enabled_modules || []
        };

        // Regular users must never inherit a platform admin's
        // previously selected organization.
        if (authenticatedUser.platform_role !== 'platform_admin') {
          localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
          setSelectedOrganizationId('');
        }

        setUser(authenticatedUser);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
        setSelectedOrganizationId('');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // -----------------------------
  // LOAD ORGANIZATIONS FOR PLATFORM ADMIN
  // -----------------------------
  useEffect(() => {
    if (!isPlatformAdmin) {
      setOrganizations([]);
      setOrganizationsError('');
      setOrganizationsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOrganizations() {
      try {
        setOrganizationsLoading(true);
        setOrganizationsError('');

        const response = await api.get('/admin/organizations');

        const data = response.data;

        const organizationList: Organization[] = Array.isArray(data)
          ? data
          : data.organizations || [];

        if (!cancelled) {
          setOrganizations(organizationList);
        }
      } catch (err) {
        console.error('Unable to load organizations:', err);

        if (!cancelled) {
          setOrganizationsError('Unable to load organizations.');
        }
      } finally {
        if (!cancelled) {
          setOrganizationsLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, [isPlatformAdmin, user?.id]);

  // -----------------------------
  // LOGIN
  // -----------------------------
  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', {
      email,
      password
    });

    const { token, user: loggedInUser } = res.data;

    localStorage.setItem('token', token);

    if (loggedInUser.platform_role !== 'platform_admin') {
      localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
      setSelectedOrganizationId('');
    }

    setUser({
      ...loggedInUser,
      enabled_modules: loggedInUser.enabled_modules || []
    });
  };

  // -----------------------------
  // LOGOUT
  // -----------------------------
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);

    setSelectedOrganizationId('');
    setOrganizations([]);
    setUser(null);
  };

  // -----------------------------
  // SELECTED ORGANIZATION
  // -----------------------------
  const selectedOrganization =
    organizations.find(
      organization => organization.id === selectedOrganizationId
    ) || null;

  // Platform admins use the selected organization's modules.
  // Regular users continue using their own organization's modules.
  const enabledModules = isPlatformAdmin
    ? selectedOrganization?.enabled_modules || []
    : user?.enabled_modules || [];

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated,
        isPlatformAdmin,
        isOrganizationAdmin,

        organizations,
        organizationsLoading,
        organizationsError,
        selectedOrganizationId,
        selectedOrganization,
        enabledModules
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return ctx;
}