import { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Box, Typography, Button } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { usePlanGate } from '@/app/hooks/usePlanGate';

interface ResultsGateProps {
  plan?: 'professional' | 'producer' | 'studio';
  featureName?: string;
  children: ReactNode;
}

export function ResultsGate({ plan = 'professional', featureName, children }: ResultsGateProps) {
  const navigate = useNavigate();
  const { hasAccess } = usePlanGate(plan);

  if (hasAccess) return null;

  const label = featureName || (plan === 'studio' ? 'Studio' : plan === 'producer' ? 'Producer' : 'Professional');

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
      <Box sx={{ filter: 'blur(6px)', opacity: 0.25, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 4,
          zIndex: 10,
        }}
      >
        <Lock sx={{ fontSize: 40, color: '#D4AF37', mb: 1.5 }} />
        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700, mb: 0.5 }}>
          {label} Results
        </Typography>
        <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 3, maxWidth: 360 }}>
          Upgrade to {label} to see your personalised scenario results.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/pricing')}
          sx={{ bgcolor: '#D4AF37', color: '#000000', fontWeight: 600, px: 4, '&:hover': { bgcolor: '#B8941F' } }}
        >
          Upgrade Now
        </Button>
      </Box>
    </Box>
  );
}

interface PlanGateProps {
  plan?: 'professional' | 'producer' | 'studio';
  children: ReactNode;
  fallback?: ReactNode;
  blurred?: boolean;
  featureName?: string;
}

export function PlanGate({
  plan = 'professional',
  children,
  fallback,
  blurred = true,
  featureName,
}: PlanGateProps) {
  const navigate = useNavigate();
  const { hasAccess } = usePlanGate(plan);

  if (hasAccess) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  const label = featureName || (plan === 'studio' ? 'Studio' : plan === 'producer' ? 'Producer' : 'Professional');

  return (
    <Box sx={{ position: 'relative', minHeight: 300, overflow: 'hidden' }}>
      {blurred && (
        <Box
          sx={{
            filter: 'blur(8px)',
            opacity: 0.3,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {children}
        </Box>
      )}
      <Box
        sx={{
          position: blurred ? 'absolute' : 'relative',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 4,
          zIndex: 10,
        }}
      >
        <Lock sx={{ fontSize: 64, color: '#D4AF37', mb: 2 }} />
        <Typography variant="h5" sx={{ color: '#ffffff', mb: 1, fontWeight: 700 }}>
          {label} Feature
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: '#a0a0a0', mb: 4, maxWidth: 400 }}
        >
          Upgrade to {label} to unlock this feature.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/pricing')}
          sx={{
            bgcolor: '#D4AF37',
            color: '#000000',
            fontWeight: 600,
            px: 6,
            '&:hover': { bgcolor: '#B8941F' },
          }}
        >
          Upgrade Now
        </Button>
      </Box>
    </Box>
  );
}
