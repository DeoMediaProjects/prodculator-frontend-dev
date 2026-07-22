import { forwardRef } from 'react';
import { CustomContentProps, useSnackbar } from 'notistack';
import { Box, IconButton, Typography } from '@mui/material';
import { Close, CheckCircleOutline, ErrorOutline, InfoOutlined, WarningAmberOutlined } from '@mui/icons-material';

const VARIANT_CONFIG = {
  success: {
    accent: '#4caf50',
    icon: CheckCircleOutline,
  },
  error: {
    accent: '#ef5350',
    icon: ErrorOutline,
  },
  warning: {
    accent: '#D4AF37',
    icon: WarningAmberOutlined,
  },
  info: {
    accent: '#9A9A9A',
    icon: InfoOutlined,
  },
  default: {
    accent: '#9A9A9A',
    icon: InfoOutlined,
  },
} as const;

export const Toast = forwardRef<HTMLDivElement, CustomContentProps>((props, ref) => {
  const { id, message, variant, action } = props;
  const { closeSnackbar } = useSnackbar();

  const config = VARIANT_CONFIG[variant as keyof typeof VARIANT_CONFIG] ?? VARIANT_CONFIG.default;
  const Icon = config.icon;

  return (
    <Box
      ref={ref}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minWidth: 320,
        maxWidth: 480,
        px: 2,
        py: 1.5,
        borderRadius: '8px',
        bgcolor: '#111111',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        color: '#ffffff',
      }}
    >
      <Icon sx={{ color: config.accent, fontSize: 20, flexShrink: 0 }} />

      <Typography
        variant="body2"
        sx={{ flex: 1, color: '#e0e0e0', fontSize: '0.875rem', lineHeight: 1.4 }}
      >
        {message}
      </Typography>

      {action && (
        <Box sx={{ flexShrink: 0 }}>
          {typeof action === 'function' ? action(id) : action}
        </Box>
      )}

      <IconButton
        size="small"
        onClick={() => closeSnackbar(id)}
        sx={{ color: '#666', flexShrink: 0, '&:hover': { color: '#aaa' }, ml: 0.5 }}
      >
        <Close sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
});

Toast.displayName = 'Toast';
