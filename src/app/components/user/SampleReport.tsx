import { useNavigate } from 'react-router';
import { Box, Container, Typography, Button, Alert } from '@mui/material';
import { ArrowBack, CloudUpload, Info } from '@mui/icons-material';
import { apiClient } from '@/services/api';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';

// The sample is the REAL report template rendered server-side with a canned
// dataset (GET /api/reports/sample/html). Embedding it in an iframe guarantees
// the marketing sample always matches live report output — no separate mock to
// drift out of sync when the report design changes.
const SAMPLE_SRC = `${apiClient.baseUrl}/api/reports/sample/html`;

export function SampleReport() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100dvh' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider', py: 2, position: 'sticky', top: 0, zIndex: 1000 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <img
              src={exampleLogo}
              alt="Prodculator"
              style={{ height: '32px', width: 'auto', cursor: 'pointer' }}
              onClick={() => navigate('/')}
            />
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ color: '#000' }}>
              Back to Home
            </Button>
          </Box>
        </Container>
      </Box>

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
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: '#EBE8E2',
            display: 'block',
          }}
        />
      </Container>

      {/* CTA Section */}
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', py: 6, mt: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
            Ready to Analyze Your Script?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Get a customized intelligence report with real data for your production
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" size="large" startIcon={<CloudUpload />} onClick={() => navigate('/upload')} sx={{ px: 6, py: 1.5 }}>
              Upload Your Script
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/pricing')} sx={{ px: 6, py: 1.5 }}>
              View Pricing
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
