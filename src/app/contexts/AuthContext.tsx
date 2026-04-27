import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '@/services/auth.service';
import { isAdminSession } from '@/services/api';

// Admin permission levels
export type AdminRole = 'master_admin' | 'senior_admin' | 'data_admin' | 'support_admin';

export interface AdminPermissions {
  canManageAdmins: boolean;
  canViewBusinessMetrics: boolean;
  canEditIncentiveData: boolean;
  canEditCrewCosts: boolean;
  canEditComparables: boolean;
  canManageDataSources: boolean;
  canManageEmailGating: boolean;
  canManagePDFReports: boolean;
  canViewPlatformEconomics: boolean;
}

type PlanType = 'free' | 'single' | 'professional' | 'producer' | 'studio';

/** Normalize legacy 'single' plan name to 'professional'. */
function normalizePlan(plan: string | undefined): PlanType {
  if (plan === 'single') return 'professional';
  return (plan as PlanType) || 'free';
}

interface User {
  email: string;
  plan: PlanType;
  reportsUsed: number;
  reportsLimit: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: AdminPermissions;
  createdAt: string;
  lastLogin?: string;
}

interface SignupData {
  email: string;
  password: string;
  name?: string;
  company?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  hasUsedFreeReport: (email: string) => boolean;
  markFreeReportUsed: (email: string) => void;

  // User auth
  userLogin: (email: string, password: string) => Promise<boolean>;
  userSignup: (userData: SignupData) => Promise<boolean>;
  googleLogin: () => Promise<boolean>;
  userLogout: () => void;

  // Admin auth
  adminUser: AdminUser | null;
  isAdminAuthenticated: boolean;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  adminLogout: () => Promise<{ error: string | null }>;
  hasAdminPermission: (permission: keyof AdminPermissions) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Permission presets for each role
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermissions> = {
  master_admin: {
    canManageAdmins: true,
    canViewBusinessMetrics: true,
    canEditIncentiveData: true,
    canEditCrewCosts: true,
    canEditComparables: true,
    canManageDataSources: true,
    canManageEmailGating: true,
    canManagePDFReports: true,
    canViewPlatformEconomics: true,
  },
  senior_admin: {
    canManageAdmins: false,
    canViewBusinessMetrics: true,
    canEditIncentiveData: true,
    canEditCrewCosts: true,
    canEditComparables: true,
    canManageDataSources: true,
    canManageEmailGating: true,
    canManagePDFReports: true,
    canViewPlatformEconomics: true,
  },
  data_admin: {
    canManageAdmins: false,
    canViewBusinessMetrics: false,
    canEditIncentiveData: true,
    canEditCrewCosts: true,
    canEditComparables: true,
    canManageDataSources: false,
    canManageEmailGating: false,
    canManagePDFReports: false,
    canViewPlatformEconomics: false,
  },
  support_admin: {
    canManageAdmins: false,
    canViewBusinessMetrics: false,
    canEditIncentiveData: false,
    canEditCrewCosts: false,
    canEditComparables: false,
    canManageDataSources: false,
    canManageEmailGating: true,
    canManagePDFReports: true,
    canViewPlatformEconomics: false,
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usedEmails, setUsedEmails] = useState<Set<string>>(new Set());
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      // Skip the regular-user check when an admin token is in storage —
      // /api/auth/me rejects admin tokens with 401.
      if (isAdminSession()) return;
      const currentUser = await authService.getCurrentUser();
      if (currentUser && currentUser.user_type !== 'admin') {
        setUser({
          email: currentUser.email,
          plan: normalizePlan(currentUser.plan),
          reportsUsed: 0,
          reportsLimit: currentUser.credits_remaining || 0,
        });
      }
    };

    const checkAdminSession = async () => {
      const adminProfile = await authService.getAdminUser();
      if (adminProfile) {
        const role = (adminProfile.role as AdminRole) || 'support_admin';
        setAdminUser({
          id: adminProfile.id,
          email: adminProfile.email,
          name: adminProfile.name || adminProfile.email,
          role,
          permissions: ROLE_PERMISSIONS[role],
          createdAt: '',
        });
      }
    };

    checkSession();
    checkAdminSession();

    // Subscribe to auth state changes
    const { data: authListener } = authService.onAuthStateChange((user) => {
      if (user) {
        setUser({
          email: user.email,
          plan: normalizePlan(user.plan),
          reportsUsed: 0,
          reportsLimit: user.credits_remaining || 0,
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const hasUsedFreeReport = (email: string): boolean => {
    return usedEmails.has(email.toLowerCase());
  };

  const markFreeReportUsed = (email: string): void => {
    setUsedEmails(prev => new Set(prev).add(email.toLowerCase()));
  };

  const userLogin = async (email: string, password: string): Promise<boolean> => {
    const { user: authUser, error } = await authService.signIn(email, password);

    if (error || !authUser) {
      console.error('Login error:', error);
      return false;
    }

    setUser({
      email: authUser.email,
      plan: normalizePlan(authUser.plan),
      reportsUsed: 0,
      reportsLimit: authUser.credits_remaining || 0,
    });

    return true;
  };

  const googleLogin = async (): Promise<boolean> => {
    const { user: authUser, error } = await authService.signInWithGoogle();

    if (error || !authUser) {
      console.error('Google login error:', error);
      return false;
    }

    setUser({
      email: authUser.email,
      plan: normalizePlan(authUser.plan),
      reportsUsed: 0,
      reportsLimit: authUser.credits_remaining || 0,
    });

    return true;
  };

  const userSignup = async (userData: SignupData): Promise<boolean> => {
    const { user: authUser, error } = await authService.signUp(
      userData.email,
      userData.password,
      {
        name: userData.name,
        company: userData.company,
        role: userData.role,
      }
    );

    if (error || !authUser) {
      console.error('Signup error:', error);
      return false;
    }

    setUser({
      email: authUser.email,
      plan: normalizePlan(authUser.plan),
      reportsUsed: 0,
      reportsLimit: authUser.credits_remaining || 0,
    });

    return true;
  };

  const userLogout = async () => {
    await authService.signOut();
    setUser(null);
  };

  const adminLogin = async (email: string, password: string): Promise<boolean> => {
    const { user: authUser, error } = await authService.adminSignIn(email, password);

    if (error || !authUser) {
      console.error('Admin login error:', error);
      return false;
    }

    const role = (authUser.role as AdminRole) || 'support_admin';

    setAdminUser({
      id: authUser.id,
      email: authUser.email,
      name: authUser.name || authUser.email,
      role,
      permissions: ROLE_PERMISSIONS[role],
      createdAt: '',
      lastLogin: new Date().toISOString(),
    });

    return true;
  };

  const adminLogout = async (): Promise<{ error: string | null }> => {
    const result = await authService.adminSignOut();
    if (!result.error) {
      setAdminUser(null);
    }
    return result;
  };

  const hasAdminPermission = (permission: keyof AdminPermissions): boolean => {
    if (!adminUser) return false;
    return adminUser.permissions[permission] === true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user,
        hasUsedFreeReport,
        markFreeReportUsed,
        userLogin,
        userSignup,
        googleLogin,
        userLogout,
        adminUser,
        isAdminAuthenticated: !!adminUser,
        adminLogin,
        adminLogout,
        hasAdminPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
