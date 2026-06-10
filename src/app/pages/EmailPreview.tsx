import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Container, Paper, Typography, Button, ToggleButtonGroup, ToggleButton, CircularProgress, Alert, Chip, Divider, TextField } from '@mui/material';
import { ArrowBack, Email, Send, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { EmailTemplate, emailService } from '@/services/email.service';

type EmailType = 'report-ready' | 'welcome' | 'payment' | 'processing';

type SendResult = { template: string; success: boolean; error?: string };

export function EmailPreview() {
  const navigate = useNavigate();
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [sendResults, setSendResults] = useState<SendResult[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailType>('report-ready');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const isRecipientEmailValid = /\S+@\S+\.\S+/.test(recipientEmail.trim());

  const sampleData = {
    reportReady: {
      userName: 'Sarah Mitchell',
      scriptTitle: 'THE LAST FRONTIER',
      reportUrl: 'https://prodculator.com/reports/rpt-2026-001234',
      pdfUrl: 'https://prodculator.com/downloads/rpt-2026-001234.pdf',
      processingTime: '2 minutes 34 seconds',
      topRecommendation: 'British Columbia, Canada',
      estimatedIncentive: '$450,000 to $650,000',
    },
    welcome: {
      userName: 'Sarah Mitchell',
      dashboardUrl: 'https://prodculator.com/dashboard',
      freeCredits: 1,
    },
    payment: {
      userName: 'Sarah Mitchell',
      planName: 'Professional Plan',
      amount: '99.00',
      currency: 'USD',
      scriptsIncluded: 5,
      receiptUrl: 'https://prodculator.com/receipts/inv-2026-001',
      dashboardUrl: 'https://prodculator.com/dashboard',
      billingDate: '24 April 2026',
    },
    processing: {
      userName: 'Sarah Mitchell',
      scriptTitle: 'THE LAST FRONTIER',
      estimatedTime: '3 to 5 minutes',
      dashboardUrl: 'https://prodculator.com/dashboard',
    },
  };

  useEffect(() => {
    let active = true;

    const loadPreview = async () => {
      const request =
        selectedEmail === 'report-ready'
          ? { template: EmailTemplate.REPORT_READY, data: sampleData.reportReady }
          : selectedEmail === 'welcome'
            ? { template: EmailTemplate.WELCOME, data: sampleData.welcome }
            : selectedEmail === 'payment'
              ? { template: EmailTemplate.PAYMENT_CONFIRMATION, data: sampleData.payment }
              : { template: EmailTemplate.PROCESSING_STARTED, data: sampleData.processing };
      setPreviewLoading(true);
      setPreviewError('');

      try {
        const result = await emailService.previewTransactionalEmail(request.template, request.data);
        if (!active) return;
        setPreviewHtml(result.html);
      } catch (error) {
        if (!active) return;
        console.error('Failed to load backend email preview:', error);
        setPreviewHtml('');
        setPreviewError('Unable to load backend rendered preview. Check backend availability and template config.');
      } finally {
        if (active) setPreviewLoading(false);
      }
    };

    void loadPreview();
    return () => {
      active = false;
    };
  }, [selectedEmail]);

  const emailTitles: Record<EmailType, string> = {
    'report-ready': 'Report Ready Notification',
    'welcome': 'Welcome Email',
    'payment': 'Payment Confirmation',
    'processing': 'Processing Started',
  };

  const handleSendAll = async () => {
    if (!isRecipientEmailValid) return;

    const recipient = recipientEmail.trim();
    setSendStatus('sending');
    setSendResults([]);
    const results = await emailService.sendAllTestEmails(recipient);
    setSendResults(results);
    setSendStatus('done');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000000', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/dashboard')}
              sx={{
                color: '#D4AF37',
                '&:hover': {
                  bgcolor: 'rgba(212, 175, 55, 0.1)',
                },
              }}
            >
              Back to Dashboard
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Email sx={{ color: '#D4AF37', fontSize: 32 }} />
          <Typography variant="h4" sx={{ color: '#D4AF37', fontWeight: 700 }}>
            Email Template Preview
          </Typography>
        </Box>

        <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 4 }}>
          Preview rendered by backend email templates (same templates used for actual delivery).
        </Typography>

        {/* Email Type Selector */}
        <Box sx={{ mb: 4 }}>
          <ToggleButtonGroup
            value={selectedEmail}
            exclusive
            onChange={(_, newValue) => newValue && setSelectedEmail(newValue)}
            sx={{
              bgcolor: '#0a0a0a',
              '& .MuiToggleButton-root': {
                color: '#a0a0a0',
                borderColor: 'rgba(212, 175, 55, 0.3)',
                '&.Mui-selected': {
                  bgcolor: '#D4AF37',
                  color: '#000000',
                  fontWeight: 700,
                  '&:hover': {
                    bgcolor: '#D4AF37',
                  },
                },
                '&:hover': {
                  bgcolor: 'rgba(212, 175, 55, 0.1)',
                },
              },
            }}
          >
            <ToggleButton value="report-ready">Report Ready</ToggleButton>
            <ToggleButton value="welcome">Welcome</ToggleButton>
            <ToggleButton value="payment">Payment</ToggleButton>
            <ToggleButton value="processing">Processing</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Current Email Display */}
        <Typography variant="h6" sx={{ color: '#D4AF37', mb: 3 }}>
          {emailTitles[selectedEmail]}
        </Typography>

        {/* Email Preview Container */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: '#f5f5f5',
            p: 4,
            border: '2px solid rgba(212, 175, 55, 0.3)',
            borderRadius: 2,
            overflow: 'auto',
          }}
        >
          {previewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: '#D4AF37' }} />
            </Box>
          ) : previewError ? (
            <Alert severity="warning" sx={{ maxWidth: '600px', mx: 'auto' }}>
              {previewError}
            </Alert>
          ) : (
            <Box
              sx={{
                maxWidth: '600px',
                margin: '0 auto',
                bgcolor: '#ffffff',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </Paper>

        {/* Send Test Emails Panel */}
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 3,
            bgcolor: '#0a0a0a',
            border: '2px solid rgba(212, 175, 55, 0.3)',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 260 }}>
              <Typography variant="subtitle1" sx={{ color: '#D4AF37', fontWeight: 700, mb: 0.5 }}>
                Send Test Emails
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Enter a recipient email below to send all 4 templates.
              </Typography>
              <TextField
                size="small"
                type="email"
                label="Recipient email"
                placeholder="name@example.com"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                error={recipientEmail.length > 0 && !isRecipientEmailValid}
                helperText={recipientEmail.length > 0 && !isRecipientEmailValid ? 'Enter a valid email address' : ' '}
                sx={{
                  mt: 1.5,
                  minWidth: 280,
                  maxWidth: 420,
                  '& .MuiOutlinedInput-root': {
                    color: '#f5f5f5',
                    '& fieldset': { borderColor: 'rgba(212, 175, 55, 0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(212, 175, 55, 0.6)' },
                    '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                  },
                  '& .MuiInputLabel-root': { color: '#9e9e9e' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#D4AF37' },
                  '& .MuiFormHelperText-root': { color: '#f44336' },
                }}
              />
            </Box>
            <Button
              variant="contained"
              startIcon={sendStatus === 'sending' ? <CircularProgress size={16} sx={{ color: '#000' }} /> : <Send />}
              disabled={sendStatus === 'sending' || !isRecipientEmailValid}
              onClick={handleSendAll}
              sx={{
                bgcolor: '#D4AF37',
                color: '#000',
                fontWeight: 800,
                '&:hover': { bgcolor: '#c9a227' },
                '&:disabled': { bgcolor: 'rgba(212,175,55,0.4)', color: '#000' },
              }}
            >
              {sendStatus === 'sending' ? 'Sending…' : 'Send All Templates'}
            </Button>
          </Box>

          {sendStatus === 'done' && sendResults.length > 0 && (
            <>
              <Divider sx={{ borderColor: '#1f1f1f', my: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sendResults.map((r) => (
                  <Box key={r.template} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {r.success
                      ? <CheckCircle sx={{ color: '#4caf50', fontSize: 18 }} />
                      : <ErrorIcon sx={{ color: '#f44336', fontSize: 18 }} />}
                    <Chip
                      label={r.template.replace(/_/g, ' ')}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(212,175,55,0.1)',
                        color: '#D4AF37',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        border: '1px solid rgba(212,175,55,0.2)',
                      }}
                    />
                    <Typography variant="caption" sx={{ color: r.success ? '#4caf50' : '#f44336' }}>
                      {r.success ? 'Sent' : r.error ?? 'Failed'}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Alert
                severity={sendResults.every((r) => r.success) ? 'success' : 'warning'}
                sx={{ mt: 2, bgcolor: 'transparent', border: '1px solid', borderColor: sendResults.every((r) => r.success) ? '#4caf50' : '#ff9800', color: sendResults.every((r) => r.success) ? '#4caf50' : '#ff9800', '& .MuiAlert-icon': { color: 'inherit' } }}
              >
                {sendResults.every((r) => r.success)
                  ? `All ${sendResults.length} emails dispatched to ${recipientEmail.trim()}`
                  : `${sendResults.filter((r) => !r.success).length} of ${sendResults.length} emails failed`}
              </Alert>
            </>
          )}
        </Paper>

        {/* Info Box */}
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 3,
            bgcolor: '#0a0a0a',
            border: '2px solid rgba(212, 175, 55, 0.3)',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
            <strong style={{ color: '#D4AF37' }}>Implementation Notes:</strong>
          </Typography>
          <Box component="ul" sx={{ color: '#a0a0a0', fontSize: '0.875rem', lineHeight: 1.8, pl: 3 }}>
            <li>Emails are sent via server side email service (Brevo, AWS SES, etc.)</li>
            <li>All templates include black and gold branding consistent with platform design</li>
            <li>Mobile responsive layouts ensure proper rendering across devices</li>
            <li>Data source badges and verification dates included where applicable</li>
            <li>Professional disclaimers included in all transactional emails</li>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
