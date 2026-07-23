import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePlanGate } from '@/app/hooks/usePlanGate';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';

interface ProtectedRouteProps {
  plan?: 'professional' | 'producer' | 'studio';
  requireAuth?: boolean;
  children: React.ReactNode;
}

export function ProtectedRoute({
  plan,
  requireAuth = true,
  children,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isUserAuthLoading } = useAuth();
  const { hasAccess } = usePlanGate(plan || 'free');

  // The session check on page load is async — user starts out null until it
  // resolves. Redirecting before it settles would bounce a real logged-in
  // user to /login on every refresh, so wait for it first.
  if (requireAuth && isUserAuthLoading) {
    return <LoadingSpinner overlay message="Loading your session..." />;
  }

  if (requireAuth && !isAuthenticated) {
    // Carry the intended destination so login/signup can send the user back
    // here instead of always dropping them on /dashboard.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (plan && !hasAccess) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
}
