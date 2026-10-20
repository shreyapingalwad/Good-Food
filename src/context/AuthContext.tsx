import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole } from '../types';
import { apiClient, ApiUser, ApiError } from '../services/apiClient';

interface AuthContextType {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  currentRole: UserRole;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchDevRole: (role: UserRole) => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Verified institutional demo seed credentials
export const DEMO_ROLE_CREDENTIALS: Record<UserRole, { identifier: string; pass: string; label: string }> = {
  student: {
    identifier: 'student_shreya',
    pass: 'DevStudentPass123!',
    label: 'Student (Shreya Pingalwad)',
  },
  kitchen: {
    identifier: 'chef_rajesh',
    pass: 'DevKitchenPass123!',
    label: 'Kitchen Head (Chef Rajesh)',
  },
  manager: {
    identifier: 'dr_anita_roy',
    pass: 'DevManagerPass123!',
    label: 'Dining Manager (Dr. Anita Roy)',
  },
  ngo: {
    identifier: 'rha_arunav',
    pass: 'DevNgoPass123!',
    label: 'NGO Partner (Arunav Sharma)',
  },
  admin: {
    identifier: 'sys_admin',
    pass: 'DevAdminPass123!',
    label: 'System Admin (Campus Dining Gov)',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('student');

  // Restore authenticated session from backend on mount
  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const currentUser = await apiClient.auth.me();
      setUser(currentUser);
      setCurrentRole(currentUser.role as UserRole);
    } catch (err: any) {
      // If unauthenticated (401), session is simply empty
      setUser(null);
      if (err instanceof ApiError && err.status !== 401) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.auth.login(identifier, password);
      setUser(res.user);
      setCurrentRole(res.user.role as UserRole);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Login failed. Please verify credentials.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiClient.auth.logout();
    } catch (err) {
      // Continue client cleanup even if network fails
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const switchDevRole = async (targetRole: UserRole) => {
    const creds = DEMO_ROLE_CREDENTIALS[targetRole];
    if (!creds) return;
    await login(creds.identifier, creds.pass);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        currentRole,
        login,
        logout,
        switchDevRole,
        clearError,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
