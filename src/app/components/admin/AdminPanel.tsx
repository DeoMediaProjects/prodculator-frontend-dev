import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

interface AdminPanelProps {
  title?: string;
  /** One line on what this section is for. Not a repeat of the page description. */
  description?: string;
  /** Buttons for this section, aligned right of the title. */
  actions?: ReactNode;
  children: ReactNode;
  /** Removes the inner padding, for a panel whose child owns its own edges. */
  flush?: boolean;
}

/**
 * The one section surface in the admin console.
 *
 * Every screen previously declared its own `<Paper sx={{ p: 3, bgcolor: ..., border: ... }}>`,
 * which is how the same panel ended up with three different paddings, two
 * radii and a hardcoded background that had no light mode. Section headings had
 * a gold icon beside gold text on every panel, so the accent marked nothing.
 *
 * Here the heading is plain text at one weight, the accent is reserved for
 * actions and state, and the geometry matches the B2C dashboard card exactly.
 */
export function AdminPanel({ title, description, actions, children, flush = false }: AdminPanelProps) {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  return (
    <Box
      sx={{
        bgcolor: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: '16px',
        p: flush ? 0 : 2.75,
        mb: 2,
      }}
    >
      {(title || actions) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1.5}
          sx={{ mb: description ? 0.5 : 2, ...(flush ? { px: 2.75, pt: 2.75 } : {}) }}
        >
          {title && (
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: t.textPrimary }}>
              {title}
            </Typography>
          )}
          {actions && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {actions}
            </Stack>
          )}
        </Stack>
      )}
      {description && (
        <Typography
          sx={{
            color: t.textSecondary, fontSize: 12.5, lineHeight: 1.6, mb: 2,
            maxWidth: '78ch',
            ...(flush ? { px: 2.75 } : {}),
          }}
        >
          {description}
        </Typography>
      )}
      {children}
    </Box>
  );
}
