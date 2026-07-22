import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box,
  RadioGroup, FormControlLabel, Radio, TextField,
} from '@mui/material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

interface Props {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  /** When provided, shows a reason picker. Include 'Other' to reveal a free-text field. */
  reasons?: string[];
  reasonLabel?: string;
  reasonRequired?: boolean;
  /** Called with the chosen reason (the typed text when 'Other' is selected). */
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}

const OTHER = 'Other';

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = false, loading = false, reasons, reasonLabel = 'Reason',
  reasonRequired = false, onConfirm, onClose,
}: Props) {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const [choice, setChoice] = useState('');
  const [otherText, setOtherText] = useState('');

  // Reset the picker each time the dialog opens.
  useEffect(() => {
    if (open) { setChoice(''); setOtherText(''); }
  }, [open]);

  const resolvedReason = useMemo(
    () => (choice === OTHER ? otherText.trim() : choice),
    [choice, otherText],
  );

  const hasReasons = Array.isArray(reasons) && reasons.length > 0;
  const confirmDisabled =
    loading || (hasReasons && reasonRequired && resolvedReason.length === 0);

  const accent = destructive ? t.error : t.gold;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      disableScrollLock
      sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      slotProps={{
        paper: { sx: { bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 2 } },
        // Cover the whole viewport (sidebar included) so the app clearly recedes behind the modal.
        backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(3px)' } },
      }}
    >
      <DialogTitle sx={{ color: t.textPrimary, fontWeight: 800, pb: message || hasReasons ? 0.5 : 2 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        {message && (
          <Typography sx={{ color: t.textSecondary, fontSize: 14, lineHeight: 1.6, mb: hasReasons ? 2 : 0 }}>
            {message}
          </Typography>
        )}

        {hasReasons && (
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.textSecondary, mb: 1 }}>
              {reasonLabel}{reasonRequired ? ' *' : ' (optional)'}
            </Typography>
            <RadioGroup value={choice} onChange={(e) => setChoice(e.target.value)}>
              {reasons!.map((r) => (
                <FormControlLabel
                  key={r}
                  value={r}
                  control={<Radio size="small" sx={{ color: t.textFaint, '&.Mui-checked': { color: accent } }} />}
                  label={<Typography sx={{ fontSize: 14, color: t.textPrimary }}>{r}</Typography>}
                />
              ))}
            </RadioGroup>
            {choice === OTHER && (
              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={2}
                placeholder="Tell us a bit more…"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: t.textSecondary, textTransform: 'none', fontWeight: 600 }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={() => onConfirm(hasReasons ? resolvedReason || undefined : undefined)}
          disabled={confirmDisabled}
          variant="contained"
          sx={{
            textTransform: 'none', fontWeight: 700,
            bgcolor: accent, color: destructive ? '#fff' : (mode === 'dark' ? '#000' : '#fff'),
            '&:hover': { bgcolor: accent, filter: 'brightness(1.08)' },
          }}
        >
          {loading ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
