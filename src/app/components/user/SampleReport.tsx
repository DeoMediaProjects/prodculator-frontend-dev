import { useNavigate } from 'react-router';
import { Box, Container, Typography, Button, Alert } from '@mui/material';
import { CloudUpload, Info, Download } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { PageHeader } from '@/app/components/common/PageHeader';
import { SiteFooter } from '@/app/components/common/SiteFooter';

// The published sample: a real PRO report on a fictional screenplay, served as a
// static PDF from /public.
//
// This replaced an iframe onto GET /api/reports/sample/html, which rendered the
// live template against a canned dataset and so could never drift from real
// output. That property is genuinely lost here — if the report template changes,
// this file does not, and someone has to re-export it. The trade is deliberate:
// this is the document the client wants prospects to read, it is the same artefact
// a paying customer receives, and a PDF is what a producer forwards to a financier.
// The endpoint is untouched and still serves the live template, so restoring the
// old behaviour is a one-line change to SAMPLE_SRC.
const SAMPLE_PDF = '/the-carrick-line-sample-report.pdf';

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

      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Alert
          severity="info"
          icon={<Info />}
          action={
            // Not a second copy of the file: the same asset the viewer is reading,
            // offered for download because the point of a report is that it leaves
            // with you. `download` names it sensibly rather than by URL slug.
            <Button
              component="a"
              href={SAMPLE_PDF}
              download="Prodculator - The Carrick Line (Sample Report).pdf"
              size="small"
              variant="outlined"
              startIcon={<Download sx={{ fontSize: 18 }} />}
            >
              Download PDF
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            THE CARRICK LINE, a full PRO report on a fictional screenplay, created for
            demonstration purposes. Upload your own script for a real analysis.
          </Typography>
        </Alert>
      </Container>

      {/* The browser's own PDF viewer. An <object> rather than a bare <iframe> so
          there is somewhere to put a fallback: iOS Safari and some in-app browsers
          decline to render an embedded PDF at all, and would otherwise show a blank
          panel with no way forward. */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box
          component="object"
          data={SAMPLE_PDF}
          type="application/pdf"
          aria-label="Sample production analysis report: The Carrick Line"
          sx={{
            width: '100%',
            height: { xs: 'calc(100dvh - 220px)', md: 'calc(100dvh - 160px)' },
            minHeight: 480,
            border: `1px solid ${t.border}`,
            borderRadius: 2,
            bgcolor: t.cardBg,
            display: 'block',
          }}
        >
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: t.textSecondary, mb: 2 }}>
              Your browser cannot display the report inline.
            </Typography>
            <Button
              component="a"
              href={SAMPLE_PDF}
              target="_blank"
              rel="noopener"
              variant="contained"
              startIcon={<Download sx={{ fontSize: 18 }} />}
            >
              Open the sample report
            </Button>
          </Box>
        </Box>
      </Container>

      <SiteFooter />
    </Box>
  );
}
