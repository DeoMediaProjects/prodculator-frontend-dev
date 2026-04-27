import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';

import {
  ChangeDirection,
  ChangePlanResponse,
  PreviewChangeResponse,
  changePlan,
  previewPlanChange,
} from '@/services/subscription.service';

interface ChangePlanModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: ChangePlanResponse) => void;
  currentPlan: string;
  targetPlan: string;
  targetPriceId: string;
  targetPlanLabel: string;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `change-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatMoney(cents: number, currency: string): string {
  const symbol = currency.toLowerCase() === 'gbp' ? '£' : '$';
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Explorer',
  professional: 'Professional',
  producer: 'Producer',
  studio: 'Studio',
};

export function ChangePlanModal({
  open,
  onClose,
  onSuccess,
  currentPlan,
  targetPlan,
  targetPriceId,
  targetPlanLabel,
}: ChangePlanModalProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [preview, setPreview] = useState<PreviewChangeResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState<string>(() => generateIdempotencyKey());

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    previewPlanChange(targetPriceId)
      .then((result) => {
        if (cancelled) return;
        setPreview(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setPreviewError(err instanceof Error ? err.message : 'Failed to load preview');
      })
      .finally(() => {
        if (cancelled) return;
        setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, targetPriceId]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const result = await changePlan(targetPriceId, idempotencyKey);
      const verb = result.status === 'applied' ? 'updated' : 'scheduled';
      enqueueSnackbar(`Plan ${verb} — ${PLAN_LABEL[result.target_plan] ?? result.target_plan}`, {
        variant: 'success',
      });
      onSuccess(result);
      onClose();
    } catch (err) {
      enqueueSnackbar(
        err instanceof Error ? err.message : 'Failed to change plan',
        { variant: 'error' },
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isUpgrade = preview?.direction === 'upgrade';
  const direction: ChangeDirection | null = preview?.direction ?? null;

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          minWidth: { xs: '90vw', sm: 480 },
          maxWidth: 560,
        },
      }}
    >
      <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        {isUpgrade ? 'Upgrade to ' : 'Switch to '}
        {targetPlanLabel}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {previewLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: '#D4AF37' }} />
          </Box>
        )}

        {previewError && !previewLoading && (
          <Alert severity="error" sx={{ bgcolor: 'rgba(244, 67, 54, 0.1)', color: '#f6c6c4' }}>
            {previewError}
          </Alert>
        )}

        {preview && !previewLoading && (
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
              {isUpgrade
                ? `You'll move from ${PLAN_LABEL[currentPlan] ?? currentPlan} to ${targetPlanLabel} immediately.`
                : `You'll keep ${PLAN_LABEL[currentPlan] ?? currentPlan} access until your next renewal, then switch to ${targetPlanLabel}.`}
            </Typography>

            <Divider sx={{ borderColor: 'rgba(212, 175, 55, 0.15)' }} />

            {direction === 'upgrade' && (
              <Stack spacing={1.25}>
                <Row
                  label="Charged today (prorated)"
                  value={formatMoney(preview.immediate_total, preview.currency)}
                  emphasis
                />
                {preview.proration_credit > 0 && (
                  <Row
                    label="Credit applied from current plan"
                    value={`−${formatMoney(preview.proration_credit, preview.currency)}`}
                  />
                )}
                <Row
                  label={`Next invoice${preview.effective_date ? ` (${formatDate(preview.effective_date)})` : ''}`}
                  value={formatMoney(preview.next_invoice_total, preview.currency)}
                />
              </Stack>
            )}

            {direction === 'downgrade' && (
              <Stack spacing={1.25}>
                <Row
                  label="Charged today"
                  value={formatMoney(0, preview.currency)}
                />
                <Row
                  label={`Effective from${preview.effective_date ? ` ${formatDate(preview.effective_date)}` : ' next renewal'}`}
                  value={formatMoney(preview.next_invoice_total, preview.currency)}
                  emphasis
                />
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <Button onClick={onClose} disabled={submitting} sx={{ color: '#a0a0a0' }}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={previewLoading || submitting || !preview || !!previewError}
          sx={{
            bgcolor: '#D4AF37',
            color: '#000000',
            fontWeight: 600,
            '&:hover': { bgcolor: '#D4AF37' },
            '&.Mui-disabled': { bgcolor: 'rgba(212, 175, 55, 0.3)', color: 'rgba(0,0,0,0.5)' },
          }}
        >
          {submitting ? <CircularProgress size={20} sx={{ color: '#000' }} /> : isUpgrade ? 'Confirm upgrade' : 'Schedule change'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Row({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
        {label}
      </Typography>
      <Typography
        variant={emphasis ? 'h6' : 'body2'}
        sx={{ color: emphasis ? '#D4AF37' : '#ffffff', fontWeight: emphasis ? 700 : 500 }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default ChangePlanModal;
