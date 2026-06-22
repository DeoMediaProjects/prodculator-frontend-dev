import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  MenuItem,
  Stack,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';
import {
  submitContactMessage,
  type ContactInquiryCategory,
} from '@/services/contact.service';

const GOLD = '#D4AF37';

const CATEGORY_OPTIONS: { value: ContactInquiryCategory; label: string }[] = [
  { value: 'general', label: 'General enquiry' },
  { value: 'sales', label: 'Sales & Enterprise' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'support', label: 'Support' },
  { value: 'billing', label: 'Billing' },
];

const VALID_CATEGORIES = CATEGORY_OPTIONS.map((option) => option.value);

interface ContactFormState {
  name: string;
  email: string;
  company: string;
  category: ContactInquiryCategory;
  subject: string;
  message: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Contact() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();

  const requestedType = searchParams.get('type') as ContactInquiryCategory | null;
  const initialCategory: ContactInquiryCategory =
    requestedType && VALID_CATEGORIES.includes(requestedType) ? requestedType : 'general';

  const [form, setForm] = useState<ContactFormState>({
    name: '',
    email: '',
    company: '',
    category: initialCategory,
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateField =
    (field: keyof ContactFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return 'Please enter your name';
    if (!EMAIL_PATTERN.test(form.email.trim())) return 'Please enter a valid email address';
    if (form.subject.trim().length < 3) return 'Please enter a subject (at least 3 characters)';
    if (form.message.trim().length < 10) return 'Please enter a message (at least 10 characters)';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      enqueueSnackbar(validationError, { variant: 'error' });
      return;
    }

    setLoading(true);
    try {
      await submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || undefined,
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
        page_url: typeof window !== 'undefined' ? window.location.href : undefined,
      });
      enqueueSnackbar("Message sent — we'll be in touch shortly.", { variant: 'success' });
      setSubmitted(true);
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Failed to send your message. Please try again.',
        { variant: 'error' },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#000000', minHeight: '100dvh', color: '#ffffff' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.1)', py: 2.5 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <img
              src={exampleLogo}
              alt="Prodculator"
              style={{ height: '32px', width: 'auto', cursor: 'pointer' }}
              onClick={() => navigate('/')}
            />
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/')}
              sx={{ color: '#000000', fontWeight: 500, textTransform: 'none', '&:hover': { bgcolor: 'transparent' } }}
            >
              Back to Home
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 6, md: 9 } }}>
        <Typography variant="h3" sx={{ fontWeight: 700, color: GOLD, mb: 1.5, fontSize: { xs: '2rem', md: '2.75rem' } }}>
          Contact Us
        </Typography>
        <Typography sx={{ color: '#d1d5db', mb: 5, maxWidth: 640, lineHeight: 1.7 }}>
          Questions about Prodculator, enterprise intelligence, partnerships, or your account? Send us a
          message and our team will respond within 24 hours.
        </Typography>

        {submitted ? (
          <Box
            sx={{
              bgcolor: '#111111',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: 2,
              p: { xs: 4, md: 6 },
              textAlign: 'center',
            }}
          >
            <CheckCircle sx={{ fontSize: 56, color: GOLD, mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff', mb: 1 }}>
              Thanks for reaching out
            </Typography>
            <Typography sx={{ color: '#d1d5db', mb: 4 }}>
              We've received your message and sent a confirmation to {form.email}. Our team will be in
              touch shortly.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={() => navigate('/')}
                sx={{ bgcolor: GOLD, color: '#000', fontWeight: 600, '&:hover': { bgcolor: '#F4CF67' } }}
              >
                Back to Home
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setForm((prev) => ({ ...prev, subject: '', message: '' }));
                  setSubmitted(false);
                }}
                sx={{ borderColor: GOLD, color: GOLD, fontWeight: 600, '&:hover': { borderColor: '#F4CF67', bgcolor: 'rgba(212,175,55,0.08)' } }}
              >
                Send another message
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              bgcolor: '#111111',
              border: '1px solid #272727',
              borderRadius: 2,
              p: { xs: 3, md: 5 },
            }}
          >
            <Stack spacing={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <TextField
                  label="Name"
                  required
                  fullWidth
                  value={form.name}
                  onChange={updateField('name')}
                />
                <TextField
                  label="Email"
                  type="email"
                  required
                  fullWidth
                  value={form.email}
                  onChange={updateField('email')}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <TextField
                  label="Company (optional)"
                  fullWidth
                  value={form.company}
                  onChange={updateField('company')}
                />
                <TextField
                  select
                  label="What's this about?"
                  fullWidth
                  value={form.category}
                  onChange={updateField('category')}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <TextField
                label="Subject"
                required
                fullWidth
                value={form.subject}
                onChange={updateField('subject')}
              />
              <TextField
                label="Message"
                required
                fullWidth
                multiline
                minRows={5}
                value={form.message}
                onChange={updateField('message')}
              />
              <Box>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    bgcolor: GOLD,
                    color: '#000',
                    fontWeight: 600,
                    px: 4,
                    py: 1.25,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#F4CF67' },
                  }}
                >
                  {loading ? <CircularProgress size={22} sx={{ color: '#000' }} /> : 'Send message'}
                </Button>
              </Box>
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  );
}
