import { Navigate } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePlanGate } from '@/app/hooks/usePlanGate';

interface ProtectedRouteProps {
  plan?: 'professional' | 'studio';
  requireAuth?: boolean;
  children: React.ReactNode;
}

export function ProtectedRoute({
  plan,
  requireAuth = true,
  children,
}: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const { hasAccess } = usePlanGate(plan || 'free');

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (plan && !hasAccess) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
}
