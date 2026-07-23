import { useNavigate } from 'react-router';
import { Box, Container, Typography, Button, Alert } from '@mui/material';
import { CloudUpload, Info } from '@mui/icons-material';
import { apiClient } from '@/services/api';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { PageHeader } from '@/app/components/common/PageHeader';
import { SiteFooter } from '@/app/components/common/SiteFooter';

// The sample is the REAL report template rendered server-side with a canned
// dataset (GET /api/reports/sample/html). Embedding it in an iframe guarantees
// the marketing sample always matches live report output — no separate mock to
// drift out of sync when the report design changes.
const SAMPLE_SRC = `${apiClient.baseUrl}/api/reports/sample/html`;

export function SampleReport() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);

  return (
    <Box sx={{ bgcolor: t.pageBg, minHeight: '100dvh' }}>
      <PageHeader
        actions={
          <>
            <Button variant="outlined" startIcon={<CloudUpload sx={{ fontSize: 18 }} />} onClick={() => navigate('/upload')} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              Upload Script
            </Button>
            <Button variant="text" onClick={() => navigate('/pricing')} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              View Pricing
            </Button>
          </>
        }
      />

      {/* Demo Notice */}
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Alert severity="info" icon={<Info />}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            This is a demonstration report with fictional data. Upload your own script to get a real analysis.
          </Typography>
        </Alert>
      </Container>

      {/* Live report preview — the actual report template, rendered server-side */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box
          component="iframe"
          src={SAMPLE_SRC}
          title="Sample production analysis report"
          sx={{
            width: '100%',
            height: 'calc(100dvh - 120px)',
            border: `1px solid ${t.border}`,
            borderRadius: 2,
            bgcolor: t.cardBg,
            display: 'block',
          }}
        />
      </Container>

      <SiteFooter />
    </Box>
  );
}
