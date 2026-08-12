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
// Embedding this depends on two header rules in vercel.json, and the explanation
// lives here because vercel.json is schema-validated and rejects comment keys:
//
//   Chrome renders an embedded PDF inside an internal frame. The blanket
//   `X-Frame-Options: DENY` on `/(.*)` therefore landed on the PDF itself and the
//   viewer refused to load it, so this page fell through to its fallback on every
//   browser, desktop included. PDFs get SAMEORIGIN instead — other sites still
//   cannot frame the file, our own page can — plus `frame-ancestors 'self'`, and
//   the site CSP gets `object-src 'self'`. Without those last two the block
//   returns the day the policy stops being report-only.
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
          // On a narrow screen the action sat beside the text and squeezed it into
          // a four-word column. Letting the row wrap drops the button underneath
          // instead, which is the only sensible place for it at that width.
          sx={{
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            '& .MuiAlert-message': { flex: { xs: '1 1 100%', sm: '1 1 auto' }, minWidth: 0 },
            '& .MuiAlert-action': {
              ml: { xs: 0, sm: 2 },
              mr: 0,
              pt: { xs: 1, sm: 0 },
              alignItems: 'center',
            },
          }}
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
          {/* Reached on any browser without a built-in PDF viewer, which is most
              phones. Worded as an alternative rather than a failure, because for
              those visitors it is the only route and "cannot display" reads as
              something being broken. */}
          <Box sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
            <Typography sx={{ color: t.textPrimary, fontWeight: 700, fontSize: 18, mb: 1 }}>
              THE CARRICK LINE
            </Typography>
            <Typography sx={{ color: t.textSecondary, mb: 3, maxWidth: '46ch', mx: 'auto', lineHeight: 1.7 }}>
              A full 16-page PRO report on a fictional screenplay. Open it in your
              PDF reader to see exactly what a finished analysis looks like.
            </Typography>
            <Button
              component="a"
              href={SAMPLE_PDF}
              target="_blank"
              rel="noopener"
              variant="contained"
              size="large"
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
