import { useAuth } from '@/app/contexts/AuthContext';

type PlanLevel = 'free' | 'single' | 'professional' | 'producer' | 'studio';

const PLAN_HIERARCHY: Record<PlanLevel, number> = {
  free: 0,
  single: 1, // legacy alias for professional
  professional: 1,
  producer: 2,
  studio: 3,
};

export function usePlanGate(requiredPlan: PlanLevel = 'professional') {
  const { user, isAuthenticated } = useAuth();
  const userPlan = (user?.plan || 'free') as PlanLevel;
  const userLevel = PLAN_HIERARCHY[userPlan] ?? 0;
  const requiredLevel = PLAN_HIERARCHY[requiredPlan] ?? 0;

  return {
    hasAccess: userLevel >= requiredLevel,
    userPlan,
    isAuthenticated,
    isProfessional: userLevel >= 1,
    isProducer: userLevel >= 2,
    isStudio: userLevel >= 3,
    isFree: userLevel === 0,
  };
}
