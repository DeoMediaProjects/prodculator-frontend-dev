import { useNavigate } from 'react-router';
import { Box, Container, Typography, Button, Alert } from '@mui/material';
import { CloudUpload, Info, Download } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { PageHeader } from '@/app/components/common/PageHeader';
import { SiteFooter } from '@/app/components/common/SiteFooter';
import { PdfViewer } from '@/app/components/common/PdfViewer';

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
// Rendered by PdfViewer (pdf.js drawing to canvas), not by an <object> or <iframe>.
//
// Both of those were tried and both showed a placeholder instead of the report.
// Handing a PDF to the browser means depending on a viewer plugin: no mobile
// browser has one, and on desktop the embed is additionally subject to
// `X-Frame-Options` and `object-src` on the PDF's own response, because Chrome
// renders an embedded PDF inside an internal frame. The header rules in vercel.json
// that fixed the second problem are still right and worth keeping — but they could
// not fix the first, and this page is the one that has to prove the product's
// output. Drawing the pages ourselves depends on none of it.
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

      {/* Drawn by pdf.js, not handed to the browser's viewer — see the note on
          SAMPLE_PDF. The report is simply on the page, on every device, with no
          button standing between the visitor and it. */}
      <Container maxWidth="md" sx={{ py: 3 }}>
        <PdfViewer src={SAMPLE_PDF} label="Sample production analysis report: The Carrick Line" />
      </Container>

      <SiteFooter />
    </Box>
  );
}
