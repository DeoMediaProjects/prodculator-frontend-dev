import { Box, Typography } from '@mui/material';
import { AutoAwesomeOutlined } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

export function ComingSoon({ title }: { title: string }) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  return (
    <Box sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '16px', p: { xs: 4, md: 8 }, textAlign: 'center' }}>
      <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: t.goldDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <AutoAwesomeOutlined sx={{ color: t.gold, fontSize: 28 }} />
      </Box>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, mb: 1 }}>{title}</Typography>
      <Typography sx={{ color: t.textSecondary, maxWidth: 440, mx: 'auto' }}>
        This screen is being rebuilt to the new design in the next pass.
      </Typography>
    </Box>
  );
}
