import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Container, Paper, Typography, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { ArrowBack, Email } from '@mui/icons-material';
import { reportReadyEmail, welcomeEmail, paymentConfirmationEmail, processingStartedEmail } from '@/app/templates/email-templates';

type EmailType = 'report-ready' | 'welcome' | 'payment' | 'processing';

export function EmailPreview() {
  const navigate = useNavigate();
  const [selectedEmail, setSelectedEmail] = useState<EmailType>('report-ready');

  const sampleData = {
    reportReady: {
      userName: 'Sarah Mitchell',
      scriptTitle: 'THE LAST FRONTIER',
      reportUrl: 'https://prodculator.com/reports/rpt-2026-001234',
      pdfUrl: 'https://prodculator.com/downloads/rpt-2026-001234.pdf',
      processingTime: '2 minutes 34 seconds',
      topRecommendation: 'British Columbia, Canada',
      estimatedIncentive: '$450,000 - $650,000',
    },
    welcome: {
      userName: 'Sarah Mitchell',
      loginUrl: 'https://prodculator.com/login',
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
    },
    processing: {
      userName: 'Sarah Mitchell',
      scriptTitle: 'THE LAST FRONTIER',
      estimatedTime: '3-5 minutes',
    },
  };

  const getEmailHTML = () => {
    switch (selectedEmail) {
      case 'report-ready':
        return reportReadyEmail(sampleData.reportReady);
      case 'welcome':
        return welcomeEmail(sampleData.welcome);
      case 'payment':
        return paymentConfirmationEmail(sampleData.payment);
      case 'processing':
        return processingStartedEmail(sampleData.processing);
      default:
        return '';
    }
  };

  const emailTitles: Record<EmailType, string> = {
    'report-ready': 'Report Ready Notification',
    'welcome': 'Welcome Email',
    'payment': 'Payment Confirmation',
    'processing': 'Processing Started',
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
          Preview of professional email templates sent to users during the Prodculator workflow.
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
          <Box
            sx={{
              maxWidth: '600px',
              margin: '0 auto',
              bgcolor: '#ffffff',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            }}
            dangerouslySetInnerHTML={{ __html: getEmailHTML() }}
          />
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
            <li>Emails are sent via server-side email service (SendGrid, AWS SES, etc.)</li>
            <li>All templates include black and gold branding consistent with platform design</li>
            <li>Mobile-responsive layouts ensure proper rendering across devices</li>
            <li>Data source badges and verification dates included where applicable</li>
            <li>Professional disclaimers included in all transactional emails</li>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}