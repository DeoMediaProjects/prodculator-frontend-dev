import { PointerEvent, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ChatBubbleOutline, Close, Send } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { supportFaqItems, SupportFaqItem } from '@/app/data/supportFaq';
import {
  submitSupportInquiry,
  SupportInquiryCategory,
} from '@/services/support.service';

interface WidgetPosition {
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  moved: boolean;
}

const VIEWPORT_PADDING = 12;
const BUTTON_SIZE = 56;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 520;

const CATEGORY_OPTIONS: Array<{ value: SupportInquiryCategory; label: string }> = [
  { value: 'general', label: 'General question' },
  { value: 'account', label: 'Account' },
  { value: 'billing', label: 'Billing' },
  { value: 'technical', label: 'Technical issue' },
  { value: 'report', label: 'Report question' },
  { value: 'complaint', label: 'Complaint' },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getInitialPosition(): WidgetPosition {
  if (typeof window === 'undefined') return { x: 24, y: 420 };
  return {
    x: Math.max(VIEWPORT_PADDING, window.innerWidth - BUTTON_SIZE - 24),
    y: Math.max(VIEWPORT_PADDING, window.innerHeight - BUTTON_SIZE - 24),
  };
}

function clampPosition(position: WidgetPosition): WidgetPosition {
  if (typeof window === 'undefined') return position;
  return {
    x: clamp(position.x, VIEWPORT_PADDING, window.innerWidth - BUTTON_SIZE - VIEWPORT_PADDING),
    y: clamp(position.y, VIEWPORT_PADDING, window.innerHeight - BUTTON_SIZE - VIEWPORT_PADDING),
  };
}

function getPanelSx(position: WidgetPosition) {
  if (typeof window === 'undefined') {
    return { left: position.x, top: position.y, width: PANEL_WIDTH, maxHeight: PANEL_HEIGHT };
  }

  const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);
  const height = Math.min(PANEL_HEIGHT, window.innerHeight - VIEWPORT_PADDING * 2);
  const opensLeft = position.x + BUTTON_SIZE / 2 > window.innerWidth / 2;
  const opensAbove = position.y + BUTTON_SIZE / 2 > window.innerHeight / 2;
  const preferredLeft = opensLeft ? position.x + BUTTON_SIZE - width : position.x;
  const preferredTop = opensAbove ? position.y - height - 12 : position.y + BUTTON_SIZE + 12;

  return {
    left: clamp(preferredLeft, VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING),
    top: clamp(preferredTop, VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING),
    width,
    maxHeight: height,
  };
}

export function SupportContactWidget() {
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<WidgetPosition>(() => getInitialPosition());
  const [category, setCategory] = useState<SupportInquiryCategory>('general');
  const [selectedFaq, setSelectedFaq] = useState<SupportFaqItem | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dragState = useRef<DragState | null>(null);

  useEffect(() => {
    const handleResize = () => setPosition((current) => clampPosition(current));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const moved = Math.abs(event.clientX - drag.startX) > 4 || Math.abs(event.clientY - drag.startY) > 4;
    drag.moved = drag.moved || moved;
    setPosition(clampPosition({ x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY }));
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    dragState.current = null;
    if (!drag.moved) setOpen((current) => !current);
  };

  const handleFaqSelect = (item: SupportFaqItem) => {
    if (selectedFaq?.id === item.id) {
      setSelectedFaq(null);
      if (message.trim() === `I need help with: ${item.question}`) {
        setMessage('');
      }
      return;
    }
    setSelectedFaq(item);
    setCategory(item.category);
    if (!message.trim()) {
      setMessage(`I need help with: ${item.question}`);
    }
  };

  const handleSubmit = async () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 10) {
      enqueueSnackbar('Please enter at least 10 characters.', { variant: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await submitSupportInquiry({
        category,
        message: trimmedMessage,
        selected_faq_question: selectedFaq?.question,
        selected_faq_answer: selectedFaq?.answer,
        page_url: typeof window === 'undefined' ? undefined : window.location.href,
      });
      enqueueSnackbar('Your inquiry has been sent. A confirmation email is on the way.', { variant: 'success' });
      setMessage('');
      setSelectedFaq(null);
      setCategory('general');
      setOpen(false);
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to send your inquiry.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const panelSx = getPanelSx(position);

  return (
    <>
      {open && (
        <Paper
          elevation={10}
          sx={{
            position: 'fixed',
            zIndex: 1301,
            ...panelSx,
            overflow: 'hidden',
            bgcolor: '#0f0f0f',
            border: '1px solid rgba(212, 175, 55, 0.28)',
            borderRadius: '8px',
            boxShadow: '0 18px 48px rgba(0,0,0,0.65)',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(212, 175, 55, 0.18)',
              bgcolor: '#0a0a0a',
            }}
          >
            <Box>
              <Typography sx={{ color: '#D4AF37', fontWeight: 800, fontSize: '0.95rem' }}>
                Contact support
              </Typography>
              {/* <Typography sx={{ color: '#8a8a8a', fontSize: '0.75rem' }}>
                {selectedFaq ? 'FAQ context attached' : 'Dashboard inquiry'}
              </Typography> */}
            </Box>
            <Tooltip title="Close">
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#a0a0a0' }}>
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Stack
            spacing={1.5}
            sx={{
              p: 2,
              maxHeight: `calc(${panelSx.maxHeight}px - 72px)`,
              overflowY: 'auto',
            }}
          >
            <Box>
              {/* <Typography sx={{ color: '#f4f4f4', fontWeight: 700, fontSize: '0.82rem', mb: 1 }}>
                Common questions
              </Typography> */}
              <Stack spacing={0.75}>
                {supportFaqItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={selectedFaq?.id === item.id ? 'contained' : 'outlined'}
                    onClick={() => handleFaqSelect(item)}
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      borderColor: 'rgba(212, 175, 55, 0.35)',
                      color: selectedFaq?.id === item.id ? '#000' : '#D4AF37',
                      bgcolor: selectedFaq?.id === item.id ? '#D4AF37' : 'transparent',
                      fontSize: '0.74rem',
                      lineHeight: 1.3,
                      px: 1.2,
                      py: 0.8,
                      '&:hover': {
                        borderColor: '#D4AF37',
                        bgcolor: selectedFaq?.id === item.id ? '#B8941F' : 'rgba(212, 175, 55, 0.08)',
                      },
                    }}
                  >
                    {item.question}
                  </Button>
                ))}
              </Stack>
            </Box>

            {selectedFaq && (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: 'rgba(212, 175, 55, 0.08)',
                  border: '1px solid rgba(212, 175, 55, 0.22)',
                  borderRadius: '8px',
                }}
              >
                <Typography sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.78rem', mb: 0.75 }}>
                  {selectedFaq.question}
                </Typography>
                <Typography sx={{ color: '#d0d0d0', fontSize: '0.78rem', lineHeight: 1.55 }}>
                  {selectedFaq.answer}
                </Typography>
              </Box>
            )}

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

            <TextField
              select
              size="small"
              label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value as SupportInquiryCategory)}
              slotProps={{
                select: {
                  MenuProps: {
                    sx: { zIndex: 1400 },
                    PaperProps: {
                      sx: {
                        bgcolor: '#0f0f0f',
                        border: '1px solid rgba(212, 175, 55, 0.28)',
                        '& .MuiMenuItem-root': { color: '#fff' },
                      },
                    },
                  },
                },
              }}
              sx={{
                '& .MuiInputLabel-root': { color: '#8a8a8a' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              multiline
              minRows={4}
              maxRows={7}
              label="Question or complaint"
              placeholder="Type your message..."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              sx={{
                '& .MuiInputLabel-root': { color: '#8a8a8a' },
                '& .MuiInputBase-input': { color: '#fff', fontSize: '0.86rem', lineHeight: 1.5 },
              }}
            />

            <Button
              variant="contained"
              endIcon={submitting ? <CircularProgress size={16} sx={{ color: '#000' }} /> : <Send />}
              onClick={handleSubmit}
              disabled={submitting}
              sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 800, '&:hover': { bgcolor: '#B8941F' } }}
            >
              {submitting ? 'Sending' : 'Send inquiry'}
            </Button>
          </Stack>
        </Paper>
      )}

      <Tooltip title={open ? 'Close support' : 'Contact support'}>
        <IconButton
          aria-label="Contact support"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          sx={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            zIndex: 1302,
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            touchAction: 'none',
            cursor: 'grab',
            bgcolor: '#D4AF37',
            color: '#000',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 10px 28px rgba(0,0,0,0.55)',
            '&:hover': { bgcolor: '#B8941F' },
            '&:active': { cursor: 'grabbing' },
          }}
        >
          {open ? <Close /> : <ChatBubbleOutline />}
        </IconButton>
      </Tooltip>
    </>
  );
}
