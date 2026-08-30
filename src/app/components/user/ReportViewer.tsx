import { useState, useEffect, Fragment } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  List,
  ListItem,
  Card,
  CardContent,
  Divider,
  Grid,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Download,
  Visibility,
  ArrowBack,
  Public,
  AttachMoney,
  Movie,
  WbSunny,
  TrendingUp,
  Info,
  InfoOutlined,
  Lock,
  Warning,
  CheckCircle,
  AccessTime,
  BarChart,
  PictureAsPdf,
  GridOn,
  Share,
  ContentCopy,
  Check,
  LinkOff,
  LightModeOutlined,
  DarkModeOutlined,
  MoreHoriz,
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
} from '@mui/material';
import { useScript, mapReportToAnalysis } from '@/app/contexts/ScriptContext';
import { generateReportPDF, downloadReportPDF, viewReportPDF } from '@/services/report-pdf.service';
import { apiClient, ApiError, ProjectDetails } from '@/services/api';
import { useSnackbar } from 'notistack';
// The canonical transparent mark, same asset and same inversion rule as
// PageHeader. The previous hashed asset carried a solid background and was
// inverted the wrong way round, so it read as a box floating on the header.
import logoMark from '@/assets/prodculator-logo-white.png';
import { usePlanGate } from '@/app/hooks/usePlanGate';
import { isExplorerSectionLocked, type GatedSection } from '@/app/hooks/explorerSections';
import { InfoTip, TOOLTIP_TEXTS } from '@/app/components/common/InfoTip';
import ProjectDetailsPanel from './ProjectDetailsPanel';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return <div hidden={value !== index} style={{ height: '100%' }}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>;
}

const DIMENSION_TOOLTIP_KEYS = {
  'Cost Efficiency': 'costEfficiency',
  'Crew Depth': 'crewDepth',
  Infrastructure: 'infrastructure',
  'Incentive Strength': 'incentiveStrength',
  'Currency Advantage': 'currencyAdvantage',
  'Incentive Reliability': 'incentiveReliability',
} as const satisfies Record<string, keyof typeof TOOLTIP_TEXTS>;

/** Strip third-party data-provider attributions we can't surface for legal reasons
 * (e.g. TMDB) from a "Source" string, keeping any remaining provenance. */
export function cleanSource(source?: string | null): string {
  if (!source) return 'Industry sources';
  const cleaned = source
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part && !/tmdb|the movie database/i.test(part))
    .join(' / ');
  return cleaned || 'Industry sources';
}

/** Render the backend's markdown-lite narrative text: `**text**` becomes bold,
 * single newlines become line breaks. Used for executive-summary paragraphs. */
export function renderNarrative(text: string) {
  return text.split('\n').map((line, li) => (
    <Fragment key={li}>
      {li > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((seg, si) =>
        seg.startsWith('**') && seg.endsWith('**') ? (
          <strong key={si} style={{ color: 'inherit' }}>{seg.slice(2, -2)}</strong>
        ) : (
          <Fragment key={si}>{seg}</Fragment>
        )
      )}
    </Fragment>
  ));
}

export function ReportViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reportId } = useParams<{ reportId: string }>();
  const { analysis, setAnalysis } = useScript();
  const [tabValue, setTabValue] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isViewingPDF, setIsViewingPDF] = useState(false);
  const [isDownloadingInvestorSummary, setIsDownloadingInvestorSummary] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [investorModalOpen, setInvestorModalOpen] = useState(false);
  // Anchor for the header's overflow actions menu.
  const [actionsAnchor, setActionsAnchor] = useState<null | HTMLElement>(null);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [isRevokingShare, setIsRevokingShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // Which :reportId the state below actually describes. Navigating between two
  // reports reuses this component, so on the first render after the URL changes
  // every piece of state still belongs to the report just left.
  const [loadedReportId, setLoadedReportId] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  // userPlan returned by the report endpoint — promoted to "producer" for pay-per-report buyers
  // whose account plan remains "free". Use this as the source of truth for access decisions.
  const [reportUserPlan, setReportUserPlan] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);

  const { isFree, isProducer, isStudio } = usePlanGate();
  const { mode, toggle } = useThemeMode();
  const t = tokens(mode);
  // Text on a gold surface: black in dark mode, white in light mode.
  const onGold = mode === 'dark' ? '#000' : '#fff';
  // Neutral fill for skeleton/placeholder blocks, per mode.
  const skeleton = mode === 'dark' ? '#1e1e1e' : '#E7E2D8';
  // After the report loads, prefer the plan the backend embedded in the report response.
  // This correctly handles pay-per-report (credit) buyers who have plan="free" on their
  // account but purchased a full report — the API promotes their effective plan to "producer".
  const effectiveIsFree = reportUserPlan !== null ? reportUserPlan === 'free' : isFree;
  const isPreview = effectiveIsFree || location.pathname.includes('preview');

  // Explorer (free) carries 8 of the 13 sections; five stay paid. The list and
  // the rule live in ./explorerSections so they can be tested and kept in step
  // with the server's _EXPLORER_SECTIONS.
  const isSectionLocked = (section: GatedSection) =>
    isExplorerSectionLocked(section, isPreview);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!reportId) return;

    setIsFetchingReport(true);
    setFetchError(null);

    apiClient
      .get<any>(`/api/reports/${reportId}`, { auth: true })
      .then((report) => {
        // Capture the effective plan for this specific report.
        // Pay-per-report buyers have account plan "free" but the API returns "producer" here.
        // Reset rather than only-set-when-present: this component is reused
        // across reports, so a report that omits the field would otherwise
        // inherit the previously viewed report's plan and unlock sections it
        // was never paid for.
        setReportUserPlan(report.userPlan ?? null);

        // Capture share token if one exists (only Studio users will see it non-null)
        setShareToken(report.shareToken ?? null);

        // Always capture the pdf url
        setPdfUrl(report.pdf_url || report.pdfUrl || null);

        // Capture any previously saved project details
        setProjectDetails(report.projectDetails ?? null);

        setLoadedReportId(reportId);

        // Only the report actually asked for may be rendered from context.
        // The guard here used to be `if (analysis) return`, which kept whatever
        // was generated or viewed earlier in the session — so opening an older
        // report from the list showed the newest one's content under the older
        // one's URL, while its PDF and share links (which read reportId) were
        // correct. Context is a cache for one report, not for any report.
        const isSameReport =
          analysis?.id != null
          && report?.id != null
          && String(analysis.id) === String(report.id);
        if (isSameReport) return;

        // Try to use the pre-shaped analysis field first (backend may already return it)
        const analysisData = report.analysis || report.report_data;
        if (analysisData?.locationRankings) {
          setAnalysis({
            ...analysisData,
            id: report.id,
            scriptTitle: analysisData.scriptTitle || report.script_title || report.title || 'Untitled',
            generatedAt: analysisData.generatedAt || report.completed_at || report.created_at || new Date().toISOString(),
          });
        } else if (analysisData) {
          // Raw backend shape — run through the mapper with minimal metadata derived from the report
          const metadata = {
            title: report.script_title || report.title || 'Untitled',
            genre: report.genre ? (Array.isArray(report.genre) ? report.genre : [report.genre]) : [],
            budgetAmount: Number(report.budget_amount || 0),
            budgetCurrency: report.budget_currency || 'GBP',
            format: report.format || '',
            country: report.country || '',
            locationStrategy: report.location_strategy || '',
            productionPriority: report.production_priority || '',
          };
          setAnalysis(mapReportToAnalysis(report, metadata));
        } else {
          // Drop whatever the previous report left behind. Without this the
          // empty report would render the last one's figures beneath its own
          // title, which is worse than saying there is nothing to show yet.
          setAnalysis(null);
          setFetchError('This report is still processing or contains no data yet.');
        }
      })
      .catch(() => {
        setLoadedReportId(reportId);
        setAnalysis(null);
        setFetchError('Failed to load report. Please try again.');
      })
      .finally(() => {
        setIsFetchingReport(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  /** Turn a failed PDF request into something the user can act on.
   *
   *  These handlers used to only console.error, so a failure looked like the
   *  button doing nothing at all. Users responded the only way they could, by
   *  clicking again, which is why a single missing PDF produced a screenful of
   *  identical errors. A 404 in particular is permanent: the stored object is
   *  gone and no amount of retrying will bring it back, so say so.
   */
  const reportPdfError = (error: unknown, action: 'download' | 'open') => {
    const status = error instanceof ApiError ? error.status : undefined;
    if (status === 404) {
      return 'This report has no stored PDF. Regenerate the report to produce a new one.';
    }
    if (status === 403) {
      return 'You do not have access to this report PDF.';
    }
    if (status === 503) {
      return 'PDF generation is temporarily unavailable. Please try again shortly.';
    }
    if (status === undefined) {
      // No HTTP response at all: the request never completed. The usual cause is
      // not the server but something in the browser cancelling it — a download
      // manager or extension that intercepts PDF responses and fetches the file
      // itself, which is why the error can appear while the PDF still arrives.
      // Claiming it failed outright would contradict what the user just saw.
      return `The ${action} request was interrupted before it finished. If the PDF `
        + 'did not arrive, check whether a download manager or browser extension is '
        + 'intercepting it, then try again.';
    }
    return `Could not ${action} the PDF. Please try again.`;
  };

  const handleDownloadPDF = async () => {
    if (!reportId) return;
    setIsDownloadingPDF(true);
    try {
      await downloadReportPDF(reportId, analysis?.scriptTitle);
    } catch (error) {
      console.error('PDF download failed:', error);
      enqueueSnackbar(reportPdfError(error, 'download'), { variant: 'error' });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleViewPDF = async () => {
    if (!reportId) return;
    setIsViewingPDF(true);
    try {
      await viewReportPDF(reportId);
    } catch (error) {
      console.error('PDF view failed:', error);
      enqueueSnackbar(reportPdfError(error, 'open'), { variant: 'error' });
    } finally {
      setIsViewingPDF(false);
    }
  };

  const handleDownloadInvestorSummary = async () => {
    if (!reportId) return;
    setIsDownloadingInvestorSummary(true);
    try {
      const blob = await apiClient.get<Blob>(`/api/reports/${reportId}/investor-summary`, { auth: true, responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investor-summary-${reportId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Investor summary download failed:', error);
    } finally {
      setIsDownloadingInvestorSummary(false);
    }
  };

  const shareUrl = shareToken
    ? `${window.location.origin}/report/shared/${shareToken}`
    : null;

  const handleCreateShare = async () => {
    if (!reportId) return;
    setIsCreatingShare(true);
    try {
      const data = await apiClient.post<{ share_token: string; share_url: string }>(
        `/api/reports/${reportId}/share`,
        undefined,
        { auth: true },
      );
      setShareToken(data.share_token);
    } catch (error) {
      console.error('Share link creation failed:', error);
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!reportId) return;
    setIsRevokingShare(true);
    try {
      await apiClient.delete<void>(`/api/reports/${reportId}/share`, { auth: true });
      setShareToken(null);
    } catch (error) {
      console.error('Share link revoke failed:', error);
    } finally {
      setIsRevokingShare(false);
    }
  };

  const handleCopyShareUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportExcel = async () => {
    if (!reportId) return;
    setIsExportingExcel(true);
    try {
      const blob = await apiClient.get<Blob>(`/api/reports/${reportId}/export-excel`, {
        auth: true,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prodculator-export-${reportId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel export failed:', error);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    if (!analysis) return;

    setIsGeneratingPDF(true);
    try {
      await generateReportPDF(analysis);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Effects run after render, so the first render following a click on another
  // report still holds the previous one's analysis, plan and error. Showing it
  // for that frame is the whole complaint — an older report opening on the
  // newest one's figures — so hold the loader until this id's fetch settles.
  const showingAnotherReport = !!reportId && loadedReportId !== reportId;

  if (showingAnotherReport || isFetchingReport || (!analysis && !fetchError)) {
    return (
      <Box sx={{ bgcolor: t.pageBg, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: t.gold, mb: 2 }} />
          <Typography variant="body1" sx={{ color: t.textSecondary }}>Loading report…</Typography>
        </Box>
      </Box>
    );
  }

  if (!analysis) {
    return (
      <Box sx={{ bgcolor: t.pageBg, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom sx={{ color: t.textPrimary }}>
            {fetchError || 'No report data found'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            <Button variant="contained" onClick={() => navigate('/upload')}>Generate Report</Button>
          </Box>
        </Container>
      </Box>
    );
  }

  const tabs = [
    { label: 'Script Summary', icon: <Info /> },
    { label: 'Location Rankings', icon: <Public /> },
    { label: 'Tax Incentives', icon: <AttachMoney />, locked: isSectionLocked('taxIncentives') },
    { label: 'Financial Analysis', icon: <BarChart />, locked: isSectionLocked('financialAnalysis') },
    // Distributors are an Explorer section, festivals are not, so this tab is
    // reachable and the festival half is gated inside it.
    { label: 'Festivals & Distributors', icon: <TrendingUp /> },
    { label: 'Comparables', icon: <Movie /> },
    { label: 'Weather & Logistics', icon: <WbSunny /> },
    // Same split: funding is an Explorer section, festivals are not.
    { label: 'Funding & Festivals', icon: <TrendingUp /> },
  ];

  const previewUrgentCount = Number(
    (analysis as any).previewUrgentActionCount ??
    ((analysis as any).nextSteps || []).filter((step: any) => step?.priority === 'URGENT').length ??
    0
  );
  const previewComplexityCount = Number(
    (analysis as any).previewComplexityFactorCount ??
    (analysis as any).scriptIntelligence?.complexityDrivers?.length ??
    analysis.executiveSummary?.keyFlags?.length ??
    0
  );

  const LockedBadge = () => (
    <Box
      component="span"
      onClick={() => navigate('/pricing')}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5,
        bgcolor: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: 1, px: 1, py: 0.25, cursor: 'pointer',
        '&:hover': { bgcolor: 'rgba(212,175,55,0.18)' },
      }}
    >
      <Lock sx={{ fontSize: 11, color: t.gold }} />
      <Typography variant="caption" sx={{ color: t.gold, fontWeight: 600 }}>Upgrade</Typography>
    </Box>
  );


  // Theme-consistent header button styles (dark + gold, matching the dashboard).
  const outlinedGold = { color: t.gold, borderColor: 'rgba(212,175,55,0.45)', fontSize: { xs: '0.75rem', sm: '0.85rem' }, textTransform: 'none' as const, fontWeight: 700, borderRadius: '10px', '&:hover': { borderColor: t.gold, bgcolor: 'rgba(212,175,55,0.08)' } };
  const containedGold = { bgcolor: t.gold, color: onGold, fontSize: { xs: '0.75rem', sm: '0.85rem' }, textTransform: 'none' as const, fontWeight: 700, borderRadius: '10px', '&:hover': { bgcolor: t.goldBright } };

  return (
    <Box sx={{ bgcolor: t.pageBg, height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header: back and logo flush left, report title beside them, controls
          flush right. Edge-aligned rather than wrapped in a Container so the
          outer elements actually reach the edges, matching PageHeader. */}
      <Box sx={{ bgcolor: t.cardBg, borderBottom: `1px solid ${t.border}`, py: 1.75, px: { xs: 2, sm: 3 }, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 3 }, flexWrap: 'nowrap' }}>
            {/* Left: Back, then logo, then the report it belongs to */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexShrink: 0 }}>
              <Button
                size="small"
                startIcon={<ArrowBack sx={{ fontSize: 18 }} />}
                onClick={() => navigate(isPreview ? '/upload' : '/dashboard')}
                sx={{ color: t.textSecondary, textTransform: 'none', fontWeight: 600, flexShrink: 0, '&:hover': { color: t.gold, bgcolor: 'transparent' } }}
              >
                Back
              </Button>
              <Box
                component="img"
                src={logoMark}
                alt="Prodculator"
                onClick={() => navigate('/')}
                sx={{
                  height: 26, width: 'auto', cursor: 'pointer', flexShrink: 0,
                  display: { xs: 'none', sm: 'block' },
                  filter: mode === 'light' ? 'invert(1)' : 'none',
                }}
              />
            </Box>

            {/* Title: the report this header belongs to */}
            <Box sx={{ flex: 1, minWidth: 0, borderLeft: { md: `1px solid ${t.border}` }, pl: { md: 3 } }}>
              <Typography
                variant="h6"
                title={analysis.scriptTitle}
                sx={{ fontWeight: 800, color: t.textPrimary, fontSize: { xs: '0.98rem', sm: '1.15rem' }, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {analysis.scriptTitle}
              </Typography>
              <Typography variant="caption" sx={{ color: t.textSecondary, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isPreview ? 'Free Intelligence Preview' : 'Professional Intelligence Report'} · {new Date(analysis.generatedAt).toLocaleDateString()}
              </Typography>
            </Box>

            {/* Right: primary actions stay visible, the rest collapse into a menu
                so the header holds one row at any width. */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
              {/* Theme switcher. Hidden on the narrowest screens, where the
                  report actions matter more than the toggle. */}
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <SegmentedToggle
                  size="sm"
                  radius={10}
                  value={mode}
                  onChange={(v) => v !== mode && toggle()}
                  options={[
                    { value: 'light', icon: <LightModeOutlined sx={{ fontSize: 16 }} /> },
                    { value: 'dark', icon: <DarkModeOutlined sx={{ fontSize: 16 }} /> },
                  ]}
                />
              </Box>
              {/* Free user: upgrade nudge + watermarked PDF download */}
              {isPreview && (
                <>
                  {pdfUrl && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={isDownloadingPDF ? <CircularProgress size={14} /> : <Download />}
                      sx={outlinedGold}
                      onClick={handleDownloadPDF}
                      disabled={isDownloadingPDF}
                    >
                      {isDownloadingPDF ? 'Downloading...' : 'Download Trial PDF (Watermarked)'}
                    </Button>
                  )}
                  <Button size="small" variant="contained" onClick={() => navigate('/pricing')} sx={containedGold}>
                    Upgrade
                  </Button>
                </>
              )}

              {/* Paid user PDF buttons */}
              {!isPreview && pdfUrl && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={isViewingPDF ? <CircularProgress size={14} /> : <Visibility />}
                    sx={{ ...outlinedGold, display: { xs: 'none', md: 'inline-flex' } }}
                    onClick={handleViewPDF}
                    disabled={isViewingPDF}
                  >
                    {isViewingPDF ? 'Opening...' : 'View PDF'}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={isDownloadingPDF ? <CircularProgress size={14} sx={{ color: onGold }} /> : <Download />}
                    sx={containedGold}
                    onClick={handleDownloadPDF}
                    disabled={isDownloadingPDF}
                  >
                    {isDownloadingPDF ? 'Downloading...' : 'Download PDF'}
                  </Button>
                </>
              )}
              {!isPreview && !pdfUrl && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={isGeneratingPDF ? <CircularProgress size={14} /> : <Download />}
                  sx={outlinedGold}
                  onClick={handleExportPDF}
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? 'Preparing...' : 'Save PDF'}
                </Button>
              )}

              {/* Everything else lives behind one control, so the header never
                  becomes a wall of five competing buttons. Locked items stay
                  listed rather than hidden, so the upgrade path is still visible. */}
              {!isPreview && (
                <>
                  <Tooltip title="More actions">
                    <IconButton
                      size="small"
                      aria-label="More actions"
                      aria-haspopup="menu"
                      aria-expanded={Boolean(actionsAnchor)}
                      onClick={(e) => setActionsAnchor(e.currentTarget)}
                      sx={{
                        color: t.textSecondary, borderRadius: '10px',
                        border: `1px solid ${t.border}`,
                        '&:hover': { color: t.gold, borderColor: 'rgba(212,175,55,0.45)', bgcolor: 'transparent' },
                      }}
                    >
                      <MoreHoriz sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                  <Menu
                    anchorEl={actionsAnchor}
                    open={Boolean(actionsAnchor)}
                    onClose={() => setActionsAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 1, minWidth: 232, bgcolor: t.cardBg,
                          border: `1px solid ${t.border}`, borderRadius: '12px',
                        },
                      },
                    }}
                  >
                    {/* View PDF is a header button from md up; below that it
                        lives here so it stays reachable on a phone. */}
                    {pdfUrl && (
                      <MenuItem
                        sx={{ display: { xs: 'flex', md: 'none' } }}
                        disabled={isViewingPDF}
                        onClick={() => { setActionsAnchor(null); void handleViewPDF(); }}
                      >
                        <ListItemIcon><Visibility sx={{ fontSize: 19, color: t.gold }} /></ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}>
                          {isViewingPDF ? 'Opening…' : 'View PDF'}
                        </ListItemText>
                      </MenuItem>
                    )}
                    <MenuItem
                      disabled={!isProducer}
                      onClick={() => { setActionsAnchor(null); setInvestorModalOpen(true); }}
                    >
                      <ListItemIcon><PictureAsPdf sx={{ fontSize: 19, color: isProducer ? t.gold : t.textFaint }} /></ListItemIcon>
                      <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}>Investor Summary</ListItemText>
                      {!isProducer && <Lock sx={{ fontSize: 14, color: t.textFaint, ml: 1 }} />}
                    </MenuItem>
                    <MenuItem
                      disabled={!isProducer || isExportingExcel}
                      onClick={() => { setActionsAnchor(null); void handleExportExcel(); }}
                    >
                      <ListItemIcon><GridOn sx={{ fontSize: 19, color: isProducer ? t.gold : t.textFaint }} /></ListItemIcon>
                      <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}>
                        {isExportingExcel ? 'Exporting…' : 'Export Excel'}
                      </ListItemText>
                      {!isProducer && <Lock sx={{ fontSize: 14, color: t.textFaint, ml: 1 }} />}
                    </MenuItem>
                    <MenuItem
                      disabled={!isStudio}
                      onClick={() => { setActionsAnchor(null); setShareModalOpen(true); }}
                    >
                      <ListItemIcon><Share sx={{ fontSize: 19, color: isStudio ? t.gold : t.textFaint }} /></ListItemIcon>
                      <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}>
                        {shareToken ? 'Manage Share' : 'Share Report'}
                      </ListItemText>
                      {!isStudio && <Lock sx={{ fontSize: 14, color: t.textFaint, ml: 1 }} />}
                    </MenuItem>
                    {(!isProducer || !isStudio) && (
                      <MenuItem onClick={() => { setActionsAnchor(null); navigate('/pricing'); }}>
                        <ListItemIcon><Lock sx={{ fontSize: 19, color: t.gold }} /></ListItemIcon>
                        <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 700, color: t.gold }}>
                          Upgrade to unlock
                        </ListItemText>
                      </MenuItem>
                    )}
                  </Menu>
                </>
              )}
            </Box>
          </Box>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%' }}>
        {isPreview && (
          <Alert severity="warning" sx={{ mb: 4, bgcolor: t.gold, color: onGold, '& .MuiAlert-icon': { color: onGold } }}>
            This is a <strong>Free Preview</strong>. Access to comparable production data and weather logistics is restricted.
          </Alert>
        )}

        <Paper sx={{ bgcolor: t.cardBg, border: '1px solid rgba(212, 175, 55, 0.2)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'rgba(212, 175, 55, 0.2)', flexShrink: 0 }}>
            <Tabs 
              value={tabValue} 
              onChange={(_e, v) => setTabValue(v)} 
              variant="scrollable" 
              sx={{
                '& .MuiTab-root': { color: t.textSecondary, py: 2 },
                '& .Mui-selected': { color: `${t.gold} !important` },
                '& .MuiTabs-indicator': { backgroundColor: t.gold }
              }}
            >
              {tabs.map((tab, i) => (
                <Tab 
                  key={i} 
                  label={tab.label} 
                  icon={tab.locked ? <Lock sx={{ fontSize: '0.9rem' }} /> : tab.icon} 
                  iconPosition="start" 
                />
              ))}
            </Tabs>
          </Box>

          <Box
            sx={{
              p: { xs: 2, sm: 4 },
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              '&::-webkit-scrollbar': { width: 10 },
              '&::-webkit-scrollbar-thumb': { bgcolor: t.border, borderRadius: 8, border: `2px solid ${t.cardBg}` },
              '&::-webkit-scrollbar-thumb:hover': { bgcolor: t.gold },
              scrollbarWidth: 'thin',
              scrollbarColor: `${t.border} transparent`,
            }}
          >
            {/* Tab 1: Script Summary */}
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Script Intelligence Summary</Typography>

              {/* Headline Net Budget */}
              {!isPreview && analysis.executiveSummary?.headlineNetBudget && (
                <Paper sx={{ p: 3, mb: 3, bgcolor: mode === 'dark' ? '#0d1a0d' : '#EAF6ED', border: `2px solid ${t.success}`, borderRadius: 2 }}>
                  <Typography variant="overline" sx={{ color: t.success, letterSpacing: 2 }}>Net Effective Budget After Incentives</Typography>
                  <Typography variant="h3" sx={{ color: t.success, fontWeight: 800, mt: 0.5 }}>
                    {analysis.executiveSummary.headlineNetBudget}
                  </Typography>
                </Paper>
              )}

              {/* Executive Summary narrative */}
              {!!analysis.executiveSummary?.keyInsights && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ color: t.gold, mb: 1.5, fontWeight: 600 }}>
                    Executive Summary
                  </Typography>
                  <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, borderRadius: 2 }}>
                    {String(analysis.executiveSummary!.keyInsights)
                      .split(/\n\n+/)
                      .map(p => p.replace(/^\s*[-•*]\s+/, '').trim())
                      .filter(Boolean)
                      .map((paragraph, i, arr) => (
                        <Typography
                          key={i}
                          variant="body1"
                          sx={{
                            color: t.textSecondary,
                            lineHeight: 1.85,
                            mb: i < arr.length - 1 ? 2.5 : 0,
                            fontSize: '0.95rem',
                          }}
                        >
                          {renderNarrative(paragraph)}
                        </Typography>
                      ))}
                  </Paper>
                </Box>
              )}

              {/* Key Flags */}
              {!isPreview && analysis.executiveSummary?.keyFlags && analysis.executiveSummary.keyFlags.length > 0 && (
                <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {analysis.executiveSummary.keyFlags.slice(0, 3).map((flag, i) => (
                    <Alert
                      key={i}
                      icon={<Warning sx={{ color: t.gold }} />}
                      sx={{
                        bgcolor: 'rgba(212, 175, 55, 0.08)',
                        border: '1px solid rgba(212, 175, 55, 0.4)',
                        color: t.textPrimary,
                        '& .MuiAlert-icon': { alignItems: 'center' },
                      }}
                    >
                      {flag}
                    </Alert>
                  ))}
                </Box>
              )}

              {/* Core metadata cards */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}><Card sx={{ bgcolor: t.cardBgAlt }}><CardContent><Typography variant="overline" color="primary">Genre</Typography><Typography variant="h6">{analysis.genre}</Typography></CardContent></Card></Grid>
                <Grid size={{ xs: 12, md: 6 }}><Card sx={{ bgcolor: t.cardBgAlt }}><CardContent><Typography variant="overline" color="primary">Complexity</Typography><Typography variant="h6">{analysis.complexity}</Typography></CardContent></Card></Grid>
                <Grid size={{ xs: 12 }}><Card sx={{ bgcolor: t.cardBgAlt }}><CardContent><Typography variant="overline" color="primary">Tone & Scale</Typography><Typography variant="body1">{analysis.tone}</Typography></CardContent></Card></Grid>
              </Grid>

              {isPreview && (
                <Paper sx={{ p: 3, mb: 3, bgcolor: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ color: t.gold, mb: 1, fontWeight: 600 }}>
                    {previewComplexityCount > 0
                      ? `${previewComplexityCount} production factor${previewComplexityCount === 1 ? '' : 's'} identified`
                      : 'Production factors identified'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: t.textSecondary }}>
                    Upgrade to see the full script intelligence and complexity breakdown.
                  </Typography>
                </Paper>
              )}

              {/* Action Timeline */}
              {!isPreview && analysis.executiveSummary?.actionTimeline && analysis.executiveSummary.actionTimeline.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="h6" sx={{ color: t.gold, mb: 2, fontWeight: 600 }}>
                    Action Timeline
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {analysis.executiveSummary.actionTimeline.map((item, i) => (
                      <Paper key={i} sx={{ p: 2, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box sx={{ mt: 0.25, flexShrink: 0 }}>
                          <CheckCircle sx={{ color: t.gold, fontSize: 20 }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ color: t.textPrimary, fontWeight: 500 }}>{item.action}</Typography>
                          {item.deadline && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <AccessTime sx={{ fontSize: 14, color: t.textSecondary }} />
                              <Typography variant="caption" sx={{ color: t.textSecondary }}>{item.deadline}</Typography>
                            </Box>
                          )}
                          {item.note && (
                            <Typography variant="caption" sx={{ color: t.textFaint, display: 'block', mt: 0.5, fontStyle: 'italic' }}>{item.note}</Typography>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}
              {/* Next Steps */}
              {isPreview ? (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ color: t.gold, mb: 2, fontWeight: 600 }}>Next Steps</Typography>
                  <Paper sx={{ p: 3, bgcolor: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ color: t.gold, mb: 1 }}>
                      {previewUrgentCount > 0
                        ? `${previewUrgentCount} urgent action${previewUrgentCount === 1 ? '' : 's'} identified for this production`
                        : 'Actions identified for this production'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: t.textSecondary, mb: 2 }}>
                      {previewUrgentCount > 0
                        ? `Including ${previewUrgentCount} time-sensitive item${previewUrgentCount === 1 ? '' : 's'} that require attention before principal photography.`
                        : 'Upgrade to see your prioritised action plan.'}
                    </Typography>
                    <Button variant="contained" onClick={() => navigate('/pricing')} sx={{ bgcolor: t.gold, color: onGold, fontWeight: 600, '&:hover': { bgcolor: t.goldBright } }}>
                      Upgrade to Unlock
                    </Button>
                  </Paper>
                </Box>
              ) : (analysis as any).nextSteps && (analysis as any).nextSteps.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ color: t.gold, mb: 2, fontWeight: 600 }}>Next Steps</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {(analysis as any).nextSteps.map((step: any, i: number) => (
                      <Paper key={i} sx={{ p: 2, bgcolor: t.cardBgAlt, border: `1px solid ${step.priority === 'URGENT' ? 'rgba(244,67,54,0.4)' : step.priority === 'HIGH' ? 'rgba(255,152,0,0.3)' : t.cardBgAlt}`, display: 'flex', gap: 2 }}>
                        <Chip
                          label={step.priority}
                          size="small"
                          sx={{
                            fontWeight: 700, fontSize: '0.65rem', flexShrink: 0, height: 20,
                            bgcolor: step.priority === 'URGENT' ? 'rgba(244,67,54,0.15)' : step.priority === 'HIGH' ? 'rgba(255,152,0,0.15)' : 'rgba(76,175,80,0.15)',
                            color: step.priority === 'URGENT' ? t.error : step.priority === 'HIGH' ? t.warning : t.success,
                            border: '1px solid currentColor',
                          }}
                        />
                        <Box>
                          <Typography variant="body2" sx={{ color: t.textPrimary, fontWeight: 500 }}>{step.action}</Typography>
                          <Typography variant="caption" sx={{ color: t.textFaint, display: 'block', mt: 0.25 }}>{step.reason}</Typography>
                          {step.deadline && <Typography variant="caption" sx={{ color: t.gold, display: 'block', mt: 0.25 }}>⏱ {step.deadline}</Typography>}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Script Intelligence */}
              {!isPreview && (analysis as any).scriptIntelligence && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ color: t.gold, mb: 2, fontWeight: 600 }}>Script Intelligence</Typography>
                  {(analysis as any).scriptIntelligence.creativeRecognition && (
                    <Paper sx={{ p: 2, mb: 2, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}` }}>
                      <Typography variant="caption" sx={{ color: t.gold, fontWeight: 600, display: 'block', mb: 1 }}>Creative Recognition</Typography>
                      <Typography variant="body2" sx={{ color: t.textSecondary }}>{(analysis as any).scriptIntelligence.creativeRecognition}</Typography>
                    </Paper>
                  )}
                  {(analysis as any).scriptIntelligence.scheduleWeatherNotes && (
                    <Paper sx={{ p: 2, mb: 2, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}` }}>
                      <Typography variant="caption" sx={{ color: t.gold, fontWeight: 600, display: 'block', mb: 1 }}>Schedule & Weather Viability</Typography>
                      <Typography variant="body2" sx={{ color: t.textSecondary }}>{(analysis as any).scriptIntelligence.scheduleWeatherNotes}</Typography>
                    </Paper>
                  )}
                  {(analysis as any).scriptIntelligence.complexityDrivers?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: t.gold, fontWeight: 600, display: 'block', mb: 1 }}>Complexity Drivers</Typography>
                      {(analysis as any).scriptIntelligence.complexityDrivers.map((d: any, i: number) => (
                        <Paper key={i} sx={{ p: 1.5, mb: 1, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}` }}>
                          <Typography variant="caption" sx={{ color: t.textPrimary, fontWeight: 600 }}>{d.flag}</Typography>
                          <Typography variant="caption" sx={{ color: t.textFaint, display: 'block' }}>{d.detail}, {d.implication}</Typography>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </TabPanel>

            {/* Tab 2: Location Rankings */}
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Global Territory Rankings</Typography>
              {analysis.sectionExplainers?.locationRankings && (
                <Typography variant="body2" sx={{ color: t.textFaint, mb: 3 }}>{analysis.sectionExplainers.locationRankings}</Typography>
              )}
              {/* Free users see 3 territories — show 2 locked placeholders so they know more exist */}
              {isPreview && (
                <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(212,175,55,0.08)', color: t.gold, border: '1px solid rgba(212,175,55,0.3)', '& .MuiAlert-icon': { color: t.gold } }}>
                  Showing top 3 territories. Upgrade to Professional for up to 5, or buy a single report for all available territories.
                </Alert>
              )}
              {analysis.locationRankings.map((loc, i) => {
                const isLockedTerritory = isPreview && (loc as any).lockedPreview;
                if (isLockedTerritory) {
                  return (
                    <Paper key={i} sx={{ p: 3, mb: 2, bgcolor: t.cardBg, border: '1px solid rgba(212,175,55,0.25)', position: 'relative', overflow: 'hidden' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                        <Box>
                          <Typography variant="h6" sx={{ color: t.gold }}>{loc.name}</Typography>
                          <Typography variant="body2" sx={{ color: t.textFaint }}>Ranked comparison available in the full report</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Lock sx={{ color: t.gold }} />
                          <Button size="small" onClick={() => navigate('/pricing')} sx={{ color: t.gold, fontWeight: 700 }}>
                            Upgrade
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  );
                }
                return (
                <Paper key={i} sx={{ p: 3, mb: 2, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <Typography variant="h6" sx={{ color: t.gold }}>{loc.name}, {loc.country}</Typography>
                      {loc.isAssessmentOnly && (
                        <Chip label="Assessment Only" size="small" sx={{ bgcolor: 'rgba(212, 175, 55, 0.2)', color: t.gold, border: `1px solid ${t.gold}`, fontSize: '0.7rem' }} />
                      )}
                      {loc.bankabilityLabel && (
                        <Chip
                          label={loc.bankabilityLabel}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            ...(loc.bankabilityLabel === 'BANKABLE'
                              ? { bgcolor: 'rgba(76,175,80,0.2)', color: t.success, border: `1px solid ${t.success}` }
                              : loc.bankabilityLabel === 'VERIFY FIRST'
                              ? { bgcolor: 'rgba(255,152,0,0.2)', color: t.warning, border: `1px solid ${t.warning}` }
                              : { bgcolor: 'rgba(244,67,54,0.2)', color: t.error, border: `1px solid ${t.error}` }),
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {!isPreview && (loc as any).financialReturnScore != null && (
                        <Chip
                          label={`FRS: ${(loc as any).financialReturnScore}, ${(loc as any).financialReturnVerdict}`}
                          size="small"
                          sx={{
                            fontWeight: 700, fontSize: '0.75rem',
                            bgcolor: (loc as any).financialReturnVerdict === 'Bankable' ? 'rgba(26,140,78,0.15)' :
                                     (loc as any).financialReturnVerdict === 'Verify First' ? 'rgba(177,119,13,0.15)' :
                                     'rgba(192,57,43,0.15)',
                            color: (loc as any).financialReturnVerdict === 'Bankable' ? t.success :
                                   (loc as any).financialReturnVerdict === 'Verify First' ? t.warning : t.error,
                            border: '1px solid currentColor',
                          }}
                        />
                      )}
                      {loc.score != null && (
                        <Chip label={`Score: ${loc.score}/100`} sx={{ bgcolor: t.gold, color: onGold, fontWeight: 700 }} />
                      )}
                    </Box>
                  </Box>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {[
                      { label: 'Cost Efficiency', value: loc.costEfficiency },
                      { label: 'Crew Depth', value: loc.crewDepth, tier: loc.crewDepthTier },
                      { label: 'Infrastructure', value: loc.infrastructure, tier: loc.infrastructureTier },
                      { label: 'Incentive Strength', value: loc.incentiveStrength },
                      { label: 'Currency Advantage', value: loc.currencyAdvantage },
                      ...(loc.incentiveReliability != null ? [{ label: 'Incentive Reliability', value: loc.incentiveReliability }] : []),
                    ].map((metric) => {
                      const tooltipKey = DIMENSION_TOOLTIP_KEYS[metric.label as keyof typeof DIMENSION_TOOLTIP_KEYS];
                      // `Number(value ?? 0)` printed 0/100 with an empty bar for a
                      // dimension the backend deliberately left unscored, which is a
                      // different fact from a scored zero and reads as the worst
                      // possible result rather than as "no basis to score this". The
                      // PDF template has always branched on `is none` here; the
                      // platform did not, which is where "badge shows 0 while the
                      // weighted total implies ~50" came from — the weighted score
                      // treats an unscored dimension as a neutral 50.
                      const isScored = metric.value !== null && metric.value !== undefined;
                      const metricValue = isScored ? Number(metric.value) : 0;
                      return (
                        <Grid size={{ xs: 6, sm: 4, md: 2 }} key={metric.label}>
                          <Typography variant="caption" sx={{ color: t.textFaint, display: 'flex', alignItems: 'center' }}>
                            {metric.label}
                            {'tier' in metric && metric.tier ? ` (${metric.tier})` : ''}
                            <InfoTip text={TOOLTIP_TEXTS[tooltipKey]} placement="top" />
                          </Typography>
                          <LinearProgress variant="determinate" value={metricValue} sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: t.cardBgAlt, opacity: isScored ? 1 : 0.35, '& .MuiLinearProgress-bar': { bgcolor: !isScored ? t.textFaint : metricValue >= 80 ? t.success : metricValue >= 60 ? '#2196f3' : metricValue >= 40 ? t.gold : t.warning } }} />
                          {isPreview ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4 }}>
                              <Lock sx={{ fontSize: '0.7rem', color: t.gold }} />
                              <Typography variant="caption" sx={{ color: t.gold, fontSize: '0.7rem' }}>Upgrade</Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" sx={{ color: t.textFaint, fontSize: '0.7rem' }}>
                              {isScored ? `${metricValue}/100` : 'Not scored'}
                            </Typography>
                          )}
                        </Grid>
                      );
                    })}
                  </Grid>
                  {/* Dimension verdict info icons */}
                  {!isPreview && (analysis as any).dimensionVerdicts?.[loc.name] && (
                    <Box sx={{ mt: 1, mb: 1 }}>
                      {Object.entries((analysis as any).dimensionVerdicts[loc.name]).map(([dim, verdict]) => (
                        <Box key={dim} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                          <InfoOutlined sx={{ fontSize: '13px', color: t.gold, mt: '3px', flexShrink: 0 }} />
                          <Typography variant="caption" sx={{ color: t.textFaint, fontSize: '0.72rem' }}>
                            <span style={{ color: t.textSecondary, fontWeight: 600 }}>{dim}:</span> {String(verdict)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  {/* SVS badge */}
                  {(loc as any).scheduleViabilityScore != null && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip
                        size="small"
                        label={`SVS: ${(loc as any).scheduleViabilityScore}/100, ~${(loc as any).contingencyDaysEstimate}d contingency`}
                        sx={{
                          bgcolor: (loc as any).scheduleViabilityScore >= 75 ? 'rgba(76,175,80,0.12)' :
                                   (loc as any).scheduleViabilityScore >= 55 ? 'rgba(255,152,0,0.12)' :
                                   'rgba(244,67,54,0.12)',
                          color: (loc as any).scheduleViabilityScore >= 75 ? t.success :
                                 (loc as any).scheduleViabilityScore >= 55 ? t.warning : t.error,
                          border: '1px solid currentColor', fontSize: '0.7rem', fontWeight: 600,
                        }}
                      />
                    </Box>
                  )}
                  <Divider sx={{ my: 2, borderColor: t.border }} />
                  <Typography variant="subtitle2" sx={{ mb: 1, color: t.gold }}>Key Intelligence:</Typography>
                  {isPreview ? (
                    <Box sx={{ position: 'relative', mt: 0.5 }}>
                      <Box sx={{ filter: 'blur(4px)', opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
                        {[90, 75, 85].map((w, ri) => (
                          <Box key={ri} sx={{ height: 11, bgcolor: skeleton, borderRadius: 1, mb: 1, width: `${w}%` }} />
                        ))}
                      </Box>
                      <Box sx={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                      }}>
                        <Lock sx={{ color: t.gold, fontSize: '1.1rem' }} />
                        <Typography
                          variant="caption"
                          onClick={() => navigate('/pricing')}
                          sx={{ color: t.gold, fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        >
                          Upgrade to unlock
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <List dense>{loc.reasoning.map((r, ri) => <ListItem key={ri} sx={{ color: t.textSecondary }}>• {r}</ListItem>)}</List>
                  )}
                </Paper>
                );
              })}
            </TabPanel>

            {/* Tab 3: Tax Incentives */}
            <TabPanel value={tabValue} index={2}>
              {/* Placed above the incentive cards because it changes how they
                  should be read: these are shares of one production, so the
                  figures below belong to one structure rather than to competing
                  alternatives. Rendered here rather than as its own tab so the
                  existing tab indices stay put. */}
              {analysis.coProductionStructure && !isSectionLocked('taxIncentives') && (
                <Paper sx={{ p: 3, mb: 4, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Co-Production Structure
                      </Typography>
                      <Typography variant="body2" sx={{ color: t.textFaint, mt: 0.5 }}>
                        {analysis.coProductionStructure.partnerCount} partner
                        {analysis.coProductionStructure.partnerCount === 1 ? '' : 's'} in one production
                        {analysis.coProductionStructure.route ? ` · ${analysis.coProductionStructure.route}` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      label={analysis.coProductionStructure.reconciliationLabel}
                      size="small"
                      sx={{
                        fontWeight: 700, fontSize: '0.7rem',
                        ...(analysis.coProductionStructure.reconciliationStatus === 'reconciled'
                          ? { bgcolor: 'rgba(76,175,80,0.2)', color: t.success, border: `1px solid ${t.success}` }
                          : analysis.coProductionStructure.reconciliationStatus === 'over_allocated'
                          ? { bgcolor: 'rgba(244,67,54,0.2)', color: t.error, border: `1px solid ${t.error}` }
                          : { bgcolor: 'rgba(255,152,0,0.2)', color: t.warning, border: `1px solid ${t.warning}` }),
                      }}
                    />
                  </Box>
                  {/* Said plainly, because every other territory table in this
                      report ranks and a reader arrives expecting this one to. */}
                  <Typography variant="body2" sx={{ color: t.textSecondary, mb: 2, lineHeight: 1.7 }}>
                    These partners are not ranked against one another. Each holds a share of the same
                    production, so the shares are reconciled against the budget rather than ordered.
                  </Typography>
                  <Typography variant="body2" sx={{ color: t.textSecondary, mb: 2.5, lineHeight: 1.7 }}>
                    {analysis.coProductionStructure.reconciliationExplanation}
                    {analysis.coProductionStructure.reconciliationRemaining
                      ? ` Difference: ${Math.abs(analysis.coProductionStructure.reconciliationRemaining).toLocaleString('en-US')} ${analysis.coProductionStructure.currency ?? ''}.`
                      : ''}
                  </Typography>

                  <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <Box component="thead">
                        <Box component="tr">
                          {['Partner', 'Status', 'Allocated spend', 'Share', 'Programme', 'Incentive'].map((h) => (
                            <Box
                              component="th" key={h}
                              sx={{ textAlign: h === 'Allocated spend' || h === 'Share' ? 'right' : 'left', p: 1, borderBottom: `1px solid ${t.border}`, color: t.textFaint, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                            >
                              {h}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {analysis.coProductionStructure.partners.map((p, i) => (
                          <Box component="tr" key={p.territory ?? i}>
                            <Box component="td" sx={{ p: 1, borderBottom: `1px solid ${t.border}`, fontWeight: 600 }}>{p.territory}</Box>
                            <Box component="td" sx={{ p: 1, borderBottom: `1px solid ${t.border}`, color: t.textSecondary }}>
                              {p.partnerStatus === 'confirmed' ? 'Confirmed' : 'Candidate'}
                            </Box>
                            {/* "Not supplied" rather than a dash: a dash reads as
                                nil, and nil against a partner is a different
                                claim entirely. */}
                            <Box component="td" sx={{ p: 1, borderBottom: `1px solid ${t.border}`, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {p.allocatedSpend !== null ? p.allocatedSpend.toLocaleString('en-US') : 'Not supplied'}
                            </Box>
                            <Box component="td" sx={{ p: 1, borderBottom: `1px solid ${t.border}`, textAlign: 'right' }}>
                              {p.participationPercent !== null ? `${p.participationPercent}%` : '—'}
                            </Box>
                            <Box component="td" sx={{ p: 1, borderBottom: `1px solid ${t.border}`, color: t.textSecondary }}>
                              {p.programme ?? 'No programme recorded'}
                            </Box>
                            <Box component="td" sx={{ p: 1, borderBottom: `1px solid ${t.border}` }}>
                              {p.incentive ?? (
                                <Box component="span" sx={{ color: t.textFaint }}>
                                  {p.calculationStatusLabel ?? 'Not calculated'}
                                </Box>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>

                  {/* The sum is withheld deliberately and the reason is printed.
                      An omission with no explanation reads as an oversight a
                      reader might fill in themselves. */}
                  {analysis.coProductionStructure.combinedIncentiveWithheld && (
                    <Typography variant="body2" sx={{ mt: 2.5, pl: 1.5, borderLeft: `2px solid ${t.gold}`, color: t.textSecondary, lineHeight: 1.7 }}>
                      <Box component="span" sx={{ color: t.gold, fontWeight: 700 }}>Combined incentive not stated. </Box>
                      {analysis.coProductionStructure.combinedIncentiveReason}
                    </Typography>
                  )}

                  {analysis.coProductionStructure.structureNotes.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      {analysis.coProductionStructure.structureNotes.map((note, n) => (
                        <Typography key={n} variant="body2" sx={{ color: t.warning, lineHeight: 1.7 }}>
                          {note}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Paper>
              )}
              {/* Only for "undecided": these territories are shown as separate
                  scenarios below, not combined into one production — this just
                  points out where a co-production treaty route also exists, in
                  case that becomes the direction later. Never shown alongside
                  coProductionStructure above, since a chosen structure already
                  covers this. */}
              {analysis.coProductionOpportunities && analysis.coProductionOpportunities.length > 0 && !isSectionLocked('taxIncentives') && (
                <Alert severity="info" sx={{ mb: 3, fontSize: 13, lineHeight: 1.6 }}>
                  <Box component="span" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                    Co-production opportunities in this comparison
                  </Box>
                  These territories are shown below as separate scenarios, not as one combined
                  production. At least one programme in each also states an official co-production
                  treaty route, in case that becomes the direction later:
                  <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.5 }}>
                    {analysis.coProductionOpportunities.map((opp, i) => (
                      <Box component="li" key={i}>
                        <Box component="span" sx={{ fontWeight: 700 }}>{opp.territory}</Box>
                        {opp.program ? ` — ${opp.program}` : ''}
                      </Box>
                    ))}
                  </Box>
                </Alert>
              )}
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Tax Incentive Estimates</Typography>
              {analysis.sectionExplainers?.incentiveEstimates && (
                <Typography variant="body2" sx={{ color: t.textFaint, mb: 3 }}>{analysis.sectionExplainers.incentiveEstimates}</Typography>
              )}
              {/* Raised by the backend only while some programme below is still
                  unverified for this format, so it retires itself as the records
                  are filled in rather than becoming permanent furniture. */}
              {/* Availability first: it is the one that withdraws figures. Kept
                  separate from the format caveat because "does not take shorts" and
                  "your budget is below the floor" need different actions. */}
              {/* Placed with the figures it concerns. A disclaimer at the top or
                  bottom of a report does not travel with a number a producer copies
                  out of the middle of it. */}
              {analysis.shortFormatIncentiveNotice && (
                <Alert severity="warning" sx={{ mb: 2, fontSize: 13, lineHeight: 1.6 }}>
                  <Box component="span" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                    Short-film incentive eligibility
                  </Box>
                  {analysis.shortFormatIncentiveNotice}
                </Alert>
              )}
              {analysis.programmeAvailabilityCaveat && (
                <Alert severity="error" sx={{ mb: 2, fontSize: 13, lineHeight: 1.6 }}>
                  {analysis.programmeAvailabilityCaveat}
                </Alert>
              )}
              {analysis.formatEligibilityCaveat && (
                <Alert severity="warning" sx={{ mb: 3, fontSize: 13, lineHeight: 1.6 }}>
                  {analysis.formatEligibilityCaveat}
                </Alert>
              )}
              {isPreview && (
                <Grid container spacing={3}>
                  {analysis.incentiveEstimates.map((inc, i) => (
                    <Grid size={{ xs: 12, md: 6 }} key={i}>
                      <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, height: '100%' }}>
                        <Typography variant="h6" sx={{ color: t.gold, mb: 1 }}>{inc.territory}</Typography>
                        <Typography variant="body2" sx={{ color: t.textFaint, mb: 2 }}>{inc.program}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2">Rate:</Typography>
                          <LockedBadge />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body2">Estimated Rebate:</Typography>
                          <Box
                            component="span"
                            onClick={() => navigate('/pricing')}
                            sx={{
                              display: 'inline-flex', alignItems: 'center', gap: 0.5,
                              bgcolor: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)',
                              borderRadius: 1, px: 1, py: 0.25, cursor: 'pointer',
                              '&:hover': { bgcolor: 'rgba(212,175,55,0.18)' },
                            }}
                          >
                            <Lock sx={{ fontSize: 11, color: t.gold }} />
                            <Typography variant="caption" sx={{ color: t.gold, fontWeight: 600 }}>Upgrade to unlock</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
              {!isPreview && (
                <Grid container spacing={3}>
                  {analysis.incentiveEstimates.map((inc, i) => (
                    <Grid size={{ xs: 12, md: 6 }} key={i}>
                      <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" sx={{ color: t.gold }}>{inc.territory}</Typography>
                          {inc.bankabilityLabel && (
                            <Chip
                              label={inc.bankabilityLabel}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                ...(inc.bankabilityLabel === 'BANKABLE'
                                  ? { bgcolor: 'rgba(76,175,80,0.2)', color: t.success, border: `1px solid ${t.success}` }
                                  : inc.bankabilityLabel === 'VERIFY FIRST'
                                  ? { bgcolor: 'rgba(255,152,0,0.2)', color: t.warning, border: `1px solid ${t.warning}` }
                                  : { bgcolor: 'rgba(244,67,54,0.2)', color: t.error, border: `1px solid ${t.error}` }),
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ color: t.textFaint, mb: 2 }}>{inc.program}</Typography>
                        {/* Format eligibility, from the same object the PDF renders,
                            so the two surfaces cannot state different things about
                            the same programme. Only shown when it is not a plain
                            yes: badging the normal case trains people to ignore it. */}
                        {inc.programmeEligibility?.available === false && (
                          <Chip
                            label={inc.programmeEligibility.label}
                            size="small"
                            sx={{
                              mb: 2, mr: 1, fontWeight: 700, fontSize: '0.68rem',
                              ...(inc.programmeEligibility.verdict === 'unavailable'
                                ? { bgcolor: 'rgba(244,67,54,0.16)', color: t.error, border: `1px solid ${t.error}` }
                                : { bgcolor: 'rgba(255,152,0,0.16)', color: t.warning, border: `1px solid ${t.warning}` }),
                            }}
                          />
                        )}
                        {/* The conclusion, ahead of the individual verdicts that
                            produced it. Shown only when it qualifies the figure: a
                            "Calculated" chip on every card is decoration, and
                            decoration is what makes a real status invisible. */}
                        {inc.calculationStatus && inc.calculationStatus !== 'ESTIMATED' && (
                          <Chip
                            label={inc.calculationStatusLabel ?? inc.calculationStatus}
                            size="small"
                            sx={{
                              mb: 2, mr: 1, fontWeight: 700, fontSize: '0.68rem',
                              ...(inc.calculationCarriesFigure
                                ? { bgcolor: 'rgba(255,152,0,0.16)', color: t.warning, border: `1px solid ${t.warning}` }
                                : { bgcolor: 'transparent', color: t.textFaint, border: `1px solid ${t.border}` }),
                            }}
                          />
                        )}
                        {inc.formatEligibility && inc.formatEligibility.verdict !== 'eligible' && (
                          <Chip
                            label={inc.formatEligibility.label}
                            size="small"
                            sx={{
                              mb: 2, fontWeight: 700, fontSize: '0.68rem',
                              ...(inc.formatEligibility.verdict === 'ineligible'
                                ? { bgcolor: 'rgba(244,67,54,0.16)', color: t.error, border: `1px solid ${t.error}` }
                                : inc.formatEligibility.verdict === 'needs_confirmation'
                                ? { bgcolor: 'rgba(255,152,0,0.16)', color: t.warning, border: `1px solid ${t.warning}` }
                                : { bgcolor: 'transparent', color: t.textFaint, border: `1px solid ${t.border}` }),
                            }}
                          />
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Rate:</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>{inc.rate}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Cap:</Typography>
                          <Typography variant="body1">{inc.cap}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Qualifying Spend:</Typography>
                          <Typography variant="body2" sx={{ color: t.textSecondary }}>{inc.qualifyingSpend}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">
                            {inc.incentiveIsConfirmed === false ? 'Confirmed Incentive:' : 'Estimated Rebate:'}
                          </Typography>
                          <Box sx={{ textAlign: 'right' }}>
                            {/* A figure this production cannot claim is worse than no
                                figure: it gets copied into a budget document and the
                                caveat does not travel with it. */}
                            <Typography
                              variant="h6"
                              sx={{
                                color: inc.programmeEligibility?.available === false
                                  || inc.incentiveIsConfirmed === false
                                  ? t.textFaint
                                  : t.success,
                                fontSize: inc.programmeEligibility?.available === false
                                  ? '0.95rem'
                                  : undefined,
                              }}
                            >
                              {inc.calculationCarriesFigure === false
                                ? (inc.calculationStatusLabel ?? '—')
                                : inc.incentiveIsConfirmed === false ? '—' : inc.estimatedRebate}
                            </Typography>
                            {/* An unconfirmed figure stays visible but never reads as
                                an amount the production can count on. */}
                            {inc.rebateIsConfirmed === false && inc.incentiveIsConfirmed !== false && (
                              <Typography variant="caption" sx={{ color: t.warning, fontWeight: 700 }}>
                                eligibility unconfirmed
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        {/* Why there is no figure, and what would produce one. A
                            producer cannot act on "no figure"; they can act on
                            which figure is missing. */}
                        {inc.calculationCarriesFigure === false
                          && (inc.calculationStatusReasons?.length ?? 0) > 0 && (
                          <Box sx={{ mt: 1, pl: 1.25, borderLeft: `2px solid ${t.border}` }}>
                            {inc.calculationStatusReasons!.map((reason, r) => (
                              <Typography key={r} variant="caption" sx={{ color: t.textFaint, display: 'block', lineHeight: 1.6 }}>
                                {reason}
                              </Typography>
                            ))}
                          </Box>
                        )}
                        {inc.calculationStatusNextStep && (
                          <Typography variant="caption" sx={{ color: t.textSecondary, display: 'block', mt: 1, lineHeight: 1.6 }}>
                            <Box component="span" sx={{ color: t.gold, fontWeight: 700 }}>To firm this up: </Box>
                            {inc.calculationStatusNextStep}
                          </Typography>
                        )}
                        {/* Deliberately a different shape from the confirmed row
                            above: dashed, its own heading, its own colour. An
                            asterisk beside a number is not a distinction anyone
                            carries into a budget spreadsheet. */}
                        {inc.incentiveIsConfirmed === false && inc.potentialIncentive && (
                          <Box
                            sx={{
                              mt: 1.5, p: 1.5, borderRadius: 1.5,
                              border: `1px dashed ${t.warning}`,
                              bgcolor: 'rgba(255,152,0,0.06)',
                            }}
                          >
                            <Typography sx={{ color: t.warning, fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                              Potential incentive · eligibility unverified
                            </Typography>
                            <Typography variant="h6" sx={{ color: t.warning, mt: 0.25 }}>
                              {inc.potentialIncentive}
                            </Typography>
                            <Typography variant="caption" sx={{ color: t.textSecondary, display: 'block', mt: 0.5, lineHeight: 1.5 }}>
                              Illustrative calculation only. Not included in confirmed
                              savings or in the net production cost.
                            </Typography>
                          </Box>
                        )}
                        <Divider sx={{ my: 2, borderColor: t.border }} />
                        <Typography variant="subtitle2" sx={{ mb: 1, color: t.gold }}>Requirements:</Typography>
                        <List dense>{Array.isArray(inc.requirements) ? inc.requirements.map((r, ri) => <ListItem key={ri} sx={{ color: t.textSecondary, py: 0.25 }}>• {r}</ListItem>) : null}</List>
                        {/* Stated on the programme it applies to, rather than as a
                            blanket warning over the whole report. */}
                        {inc.programmeEligibility?.available === false
                          && inc.programmeEligibility.explanation && (
                          <Typography
                            variant="body2"
                            sx={{
                              mt: 2, color: t.textSecondary, fontSize: 13, lineHeight: 1.6,
                              borderLeft: `2px solid ${t.error}`, pl: 1.5,
                            }}
                          >
                            <Box component="span" sx={{ fontWeight: 700 }}>Availability: </Box>
                            {inc.programmeEligibility.explanation}
                          </Typography>
                        )}
                        {inc.formatEligibility
                          && (inc.formatEligibility.verdict === 'needs_confirmation'
                            || inc.formatEligibility.verdict === 'ineligible')
                          && inc.formatEligibility.explanation && (
                          <Typography
                            variant="body2"
                            sx={{
                              mt: 2, color: t.textSecondary, fontSize: 13, lineHeight: 1.6,
                              borderLeft: `2px solid ${t.warning}`, pl: 1.5,
                            }}
                          >
                            <Box component="span" sx={{ fontWeight: 700 }}>Format: </Box>
                            {inc.formatEligibility.explanation}
                          </Typography>
                        )}
                        {inc.formatEligibility?.verdict === 'unverified' && (
                          <Typography variant="body2" sx={{ mt: 2, color: t.textFaint, fontSize: 13, lineHeight: 1.6 }}>
                            Format eligibility for this programme has not been verified.
                          </Typography>
                        )}
                        {inc.formatEligibility?.verdict === 'eligible' && inc.formatEligibility.sourceUrl && (
                          <Typography variant="caption" sx={{ color: t.textFaint, display: 'block', mt: 2 }}>
                            Format eligibility confirmed
                            {inc.formatEligibility.verifiedAt ? ` ${inc.formatEligibility.verifiedAt}` : ''}
                            {' · '}{inc.formatEligibility.sourceUrl}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: t.textFaint, display: 'block', mt: 1 }}>{inc.disclaimer}</Typography>
                        <Typography variant="caption" sx={{ color: t.textSecondary, display: 'block' }}>Source: {cleanSource(inc.dataSource)} • Updated: {new Date(inc.lastUpdated).toLocaleDateString()}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </TabPanel>

            {/* Tab 4: Financial Analysis */}
            <TabPanel value={tabValue} index={3}>
              {isPreview ? (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Financial Analysis</Typography>
                  <Typography variant="body2" sx={{ color: t.textFaint, mb: 3 }}>
                    Per territory budget breakdowns, rebate calculations, and net cost projections.
                  </Typography>
                  <Grid container spacing={3}>
                    {((analysis.financialAnalysis?.budgetScenarios && analysis.financialAnalysis.budgetScenarios.length > 0)
                      ? analysis.financialAnalysis.budgetScenarios
                      : analysis.locationRankings
                    ).map((item: any, i: number) => (
                      <Grid size={{ xs: 12 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: i === 0 ? '2px solid rgba(212,175,55,0.3)' : `1px solid ${t.border}` }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                              <Typography variant="h6" sx={{ color: t.gold }}>{item.territory || item.name}</Typography>
                              {item.programme && <Typography variant="body2" sx={{ color: t.textFaint }}>{item.programme}</Typography>}
                            </Box>
                            <LockedBadge />
                          </Box>
                          {['Total Budget', 'Qualifying Spend', 'ATL Deduction', 'Net Qualifying Spend', 'Gross Rebate', 'Net Rebate', 'Net Budget After Rebate'].map((step, si) => (
                            <Box key={si} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, px: 1, mb: 0.5 }}>
                              <Typography variant="body2" sx={{ color: t.textSecondary }}>{`${si + 1}. ${step}`}</Typography>
                              <LockedBadge />
                            </Box>
                          ))}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Button variant="contained" onClick={() => navigate('/pricing')} sx={{ bgcolor: t.gold, color: onGold, fontWeight: 600, px: 5, '&:hover': { bgcolor: t.goldBright } }}>
                      Unlock Financial Analysis
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Financial Analysis</Typography>
                  {analysis.sectionExplainers?.financialAnalysis && (
                    <Typography variant="body2" sx={{ color: t.textFaint, mb: 3 }}>{analysis.sectionExplainers.financialAnalysis}</Typography>
                  )}
                  {analysis.financialAnalysis?.budgetScenarios && analysis.financialAnalysis.budgetScenarios.length > 0 ? (
                    <Grid container spacing={3}>
                      {analysis.financialAnalysis.budgetScenarios.map((scenario, i) => {
                        // A territory whose rebate cannot be computed still gets a
                        // card, stating why. Omitting it is how a producer who chose
                        // three territories saw two here with nothing explaining the
                        // third's absence.
                        const noFigures = (scenario as { noFinancialsReason?: string }).noFinancialsReason;
                        const hasV3Fields = scenario.totalBudget || scenario.qualifyingSpend || scenario.netRebate;
                        return (
                          <Grid size={{ xs: 12 }} key={i}>
                            <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: i === 0 ? `2px solid ${t.gold}` : `1px solid ${t.border}` }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={{ color: t.gold }}>{scenario.territory || `Scenario ${i + 1}`}</Typography>
                                {scenario.programme && (
                                  <Chip label={scenario.programme} size="small" sx={{ bgcolor: 'rgba(212,175,55,0.15)', color: t.gold, border: '1px solid rgba(212,175,55,0.4)' }} />
                                )}
                              </Box>

                              {noFigures ? (
                                <Typography variant="body2" sx={{ color: t.textSecondary, lineHeight: 1.7 }}>
                                  {noFigures}
                                </Typography>
                              ) : hasV3Fields ? (
                                /* 6-step calculation breakdown */
                                <Box>
                                  {[
                                    { label: 'Total Budget', value: scenario.totalBudget },
                                    { label: `Qualifying Spend (${scenario.qualifyingSpendPct || 'N/A'})`, value: scenario.qualifyingSpend },
                                    { label: 'ATL Deduction', value: scenario.atlDeduction },
                                    { label: 'Net Qualifying Spend', value: scenario.netQualifyingSpend },
                                    { label: `Gross Rebate (${scenario.rateGross || scenario.rateNet || 'N/A'})`, value: scenario.grossRebate },
                                    { label: 'Net Rebate', value: scenario.netRebate, highlight: true },
                                    { label: 'Net Budget After Rebate', value: scenario.netBudget, bold: true },
                                  ].map((step, si) => step.value ? (
                                    <Box
                                      key={si}
                                      sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        py: 1,
                                        px: 1.5,
                                        mb: 0.5,
                                      }}
                                    >
                                      <Typography variant="body2" sx={{ color: step.bold ? t.textPrimary : t.textSecondary, fontWeight: step.bold ? 600 : 400 }}>
                                        {`${si + 1}. ${step.label}`}
                                      </Typography>
                                      <Typography variant="body1" sx={{ fontWeight: step.bold ? 700 : 500, color: step.bold ? t.success : step.highlight ? t.gold : t.textPrimary }}>
                                        {step.value}
                                      </Typography>
                                    </Box>
                                  ) : null)}
                                  {scenario.notes && (
                                    <Typography variant="caption" sx={{ color: t.textFaint, display: 'block', mt: 1.5, fontStyle: 'italic' }}>
                                      {scenario.notes}
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                /* Legacy fallback */
                                <Box>
                                  {[
                                    { label: 'Local Spend', value: scenario.localSpend },
                                    { label: 'Rebate Rate', value: scenario.rebateRate },
                                  ].map((row, ri) => row.value ? (
                                    <Box key={ri} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75 }}>
                                      <Typography variant="body2" sx={{ color: t.textSecondary }}>{row.label}</Typography>
                                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{row.value}</Typography>
                                    </Box>
                                  ) : null)}
                                </Box>
                              )}
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <Paper sx={{ p: 4, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, textAlign: 'center' }}>
                      <Typography variant="body1" sx={{ color: t.textFaint }}>Financial scenario data will appear here once your report is generated.</Typography>
                    </Paper>
                  )}
                </>
              )}
            </TabPanel>

            {/* Tab 5: Crew & Cost */}
            <TabPanel value={tabValue} index={4}>
              {/* Festivals stay paid; distributors are an Explorer section. The two
                  used to share one isPreview gate, so opening distributors up meant
                  opening festivals too. Gated separately now. */}
              {isSectionLocked('festivals') ? (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Where Your Film Could Be Seen</Typography>
                  <Grid container spacing={3}>
                    {[0, 1, 2, 3].map((i) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, height: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ height: 24, width: 180, bgcolor: skeleton, borderRadius: 1 }} />
                            <LockedBadge />
                          </Box>
                          <Box sx={{ height: 12, width: '90%', bgcolor: skeleton, borderRadius: 1, mb: 1 }} />
                          <Box sx={{ height: 12, width: '70%', bgcolor: skeleton, borderRadius: 1 }} />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Button variant="contained" onClick={() => navigate('/pricing')} sx={{ bgcolor: t.gold, color: onGold, fontWeight: 600, px: 5, '&:hover': { bgcolor: t.goldBright } }}>
                      Unlock Where Your Film Could Be Seen
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Where Your Film Could Be Seen</Typography>
                  <Typography variant="body2" sx={{ color: t.textSecondary, mb: 3 }}>
                    Matched on format, timing, genre and your declared audience — never inferred.
                  </Typography>
                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    {((analysis as any).festivalRecommendations || []).map((fest: any, i: number) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, height: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            {/* The backend has always supplied sourceUrl and this
                                view dropped it, so every festival was a name the
                                reader had to go and search for themselves. */}
                            {fest.sourceUrl ? (
                              <Typography
                                variant="h6"
                                component="a"
                                href={fest.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  color: t.gold,
                                  textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                              >
                                {fest.name}
                              </Typography>
                            ) : (
                              <Typography variant="h6" sx={{ color: t.gold }}>{fest.name}</Typography>
                            )}
                            {fest.tier && (
                              <Chip label={fest.tier} size="small" sx={{ bgcolor: 'rgba(212, 175, 55, 0.2)', color: t.gold, fontWeight: 600 }} />
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ color: t.textSecondary, mb: 1 }}>
                            {fest.location}{fest.oscarQualifying ? ' · Oscar-qualifying' : ''}
                          </Typography>
                          {fest.deadlinePattern && (
                            <Typography variant="body2" sx={{ color: t.textFaint, mb: 1 }}>
                              Submissions: {fest.deadlinePattern}
                            </Typography>
                          )}
                          {fest.whyMatched && (
                            <Typography variant="body2" sx={{ color: t.textSecondary, fontStyle: 'italic', borderTop: `1px solid ${t.border}`, pt: 1 }}>
                              {fest.whyMatched}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    ))}
                    {((analysis as any).festivalRecommendations || []).length === 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Alert severity="info" sx={{ bgcolor: t.cardBgAlt, color: t.textSecondary }}>
                          No festival matches for this production's format and timing.
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </>
              )}


                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Who Could Buy Your Film</Typography>
                  <Typography variant="body2" sx={{ color: t.textSecondary, mb: 3 }}>
                    {isSectionLocked('festivals')
                      ? 'Distributors are ranked partly on whether they actively scout the festivals matched to this production.'
                      : 'Distributors are ranked partly on whether they actively scout the festivals recommended above.'}
                  </Typography>
                  <Grid container spacing={3}>
                    {((analysis as any).distributorRecommendations || []).map((dist: any, i: number) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, height: '100%' }}>
                          {/* Names a festival from the paid Festival Recommendations
                              section, so it is withheld while that section is locked. */}
                          {!isSectionLocked('festivals') && dist.scoutsRecommendedFestivals?.length > 0 && (
                            <Typography variant="caption" sx={{ color: t.gold, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                              ⟶ Scouts {dist.scoutsRecommendedFestivals[0]}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6" sx={{ color: t.gold }}>{dist.name}</Typography>
                            {dist.verified && (
                              <Chip label="Verified" size="small" sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: t.success, fontWeight: 600 }} />
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ color: t.textSecondary, mb: 1 }}>
                            {dist.primaryMarket}{dist.rightsType ? ` · ${String(dist.rightsType).replace(/_/g, ' ')}` : ''}
                          </Typography>
                          {dist.whyMatched && (
                            <Typography variant="body2" sx={{ color: t.textSecondary, fontStyle: 'italic', borderTop: `1px solid ${t.border}`, pt: 1 }}>
                              {dist.whyMatched}
                            </Typography>
                          )}
                          {dist.submissionProcess && (
                            <Typography variant="body2" sx={{ color: t.textFaint, mt: 1 }}>
                              {dist.submissionProcess}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={5}>
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Comparable Productions</Typography>
                  <TableContainer component={Paper} sx={{ bgcolor: t.cardBgAlt }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: t.gold, fontWeight: 600 }}>Title</TableCell>
                          <TableCell sx={{ color: t.gold, fontWeight: 600 }}>Genre</TableCell>
                          {/* Budget is the paid column: the API strips budgetRange
                              for Explorer, so rendering it would give an empty cell. */}
                          {!isPreview && (
                            <TableCell sx={{ color: t.gold, fontWeight: 600 }}>Budget</TableCell>
                          )}
                          <TableCell sx={{ color: t.gold, fontWeight: 600 }}>Location</TableCell>
                          <TableCell sx={{ color: t.gold, fontWeight: 600 }}>Year</TableCell>
                          <TableCell sx={{ color: t.gold, fontWeight: 600 }}>Source</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analysis.comparables.map((comp, i) => (
                          <TableRow key={i}>
                            <TableCell sx={{ color: t.textPrimary, fontWeight: 500 }}>{comp.title}</TableCell>
                            <TableCell sx={{ color: t.textSecondary }}>{comp.genre}</TableCell>
                            {!isPreview && (
                              <TableCell sx={{ color: t.textSecondary }}>{comp.budgetRange}</TableCell>
                            )}
                            <TableCell sx={{ color: t.textSecondary }}>{comp.location}</TableCell>
                            <TableCell sx={{ color: t.textSecondary }}>{comp.year}</TableCell>
                            <TableCell sx={{ color: t.textSecondary }}>{cleanSource(comp.source)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
            </TabPanel>

            {/* Tab 7: Weather & Logistics */}
            <TabPanel value={tabValue} index={6}>
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Weather & Logistics</Typography>
                  <Grid container spacing={3}>
                    {analysis.weatherLogistics.map((weather, i) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, height: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: t.gold }}>{weather.territory}</Typography>
                            {/* Absent when no weather record is held. Rendering it
                                anyway printed "Risk: null" in red, which reads as
                                high risk rather than as no data. */}
                            {weather.weatherRisk && (
                              <Chip
                                label={`Risk: ${weather.weatherRisk}`}
                                size="small"
                                sx={{
                                  bgcolor: weather.weatherRisk === 'Low' ? 'rgba(76, 175, 80, 0.2)' : weather.weatherRisk === 'Medium' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                  color: weather.weatherRisk === 'Low' ? t.success : weather.weatherRisk === 'Medium' ? t.gold : t.error,
                                  fontWeight: 600,
                                }}
                              />
                            )}
                          </Box>
                          {weather.bestMonths.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" sx={{ color: t.gold, mb: 0.5 }}>Best Months:</Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {weather.bestMonths.map((m, mi) => (
                                  <Chip key={mi} label={m} size="small" sx={{ bgcolor: t.cardBgAlt, color: t.textSecondary }} />
                                ))}
                              </Box>
                            </Box>
                          )}
                          {weather.avgTempRange && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ color: t.textSecondary }}>Temp Range:</Typography>
                              <Typography variant="body2">{weather.avgTempRange}</Typography>
                            </Box>
                          )}
                          {weather.daylightHours && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ color: t.textSecondary }}>Daylight:</Typography>
                              <Typography variant="body2">{weather.daylightHours}</Typography>
                            </Box>
                          )}
                          <Divider sx={{ my: 1.5, borderColor: t.border }} />
                          {weather.infrastructure && (
                            <Typography variant="body2" sx={{ color: t.textSecondary, mb: 0.5 }}>{weather.infrastructure}</Typography>
                          )}
                          {weather.travelVisa && (
                            <Typography variant="body2" sx={{ color: t.textFaint }}>{weather.travelVisa}</Typography>
                          )}
                          {weather.seasonalConsiderations && (
                            <Typography variant="body2" sx={{ color: t.textFaint, mt: 0.5, fontStyle: 'italic' }}>{weather.seasonalConsiderations}</Typography>
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </>
            </TabPanel>

            {/* Tab 8: Funding & Festivals */}
            <TabPanel value={tabValue} index={7}>
                <>
                  {/* The API drops festival-typed entries for Explorer, so the
                      heading must not promise festivals it will not show. */}
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                    {isSectionLocked('festivals')
                      ? 'Grant & Funding Opportunities'
                      : 'Funding & Festival Opportunities'}
                  </Typography>
                  <Grid container spacing={3}>
                    {Array.isArray(analysis.fundingOpportunities) ? analysis.fundingOpportunities.map((opp, i) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, height: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: t.gold }}>{opp.name}</Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Chip
                                label={opp.type}
                                size="small"
                                sx={{ bgcolor: opp.type === 'Fund' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(33, 150, 243, 0.2)', color: opp.type === 'Fund' ? t.success : '#2196f3', fontWeight: 600 }}
                              />
                              {opp.tier && (
                                <Chip label={opp.tier} size="small" sx={{ bgcolor: t.cardBgAlt, color: t.textSecondary }} />
                              )}
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                            {Array.isArray(opp.genre) ? opp.genre.map((g, gi) => (
                              <Chip key={gi} label={g} size="small" sx={{ bgcolor: 'rgba(212, 175, 55, 0.1)', color: t.gold, fontSize: '0.7rem' }} />
                            )) : null}
                          </Box>
                          {opp.deadline && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" sx={{ color: t.textSecondary }}>Deadline:</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{opp.deadline}</Typography>
                            </Box>
                          )}
                          <Typography variant="body2" sx={{ color: t.textFaint }}>{opp.notes}</Typography>
                          {opp.website && (
                            <Button size="small" href={opp.website} target="_blank" sx={{ mt: 1, color: t.gold, textTransform: 'none', p: 0 }}>
                              Visit Website
                            </Button>
                          )}
                        </Paper>
                      </Grid>
                    )) : null}
                  </Grid>
                </>
            </TabPanel>
          </Box>
        </Paper>
      </Container>

      {/* Investor Summary Modal */}
      <Dialog
        open={investorModalOpen}
        onClose={() => setInvestorModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: t.cardBg, border: '1px solid rgba(212,175,55,0.3)', borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ color: t.gold, fontWeight: 700, pb: 0 }}>
          Investor Summary
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: t.textFaint, mb: 1 }}>
            Fill in your project details to personalise the PDF, every field is optional.
          </Typography>
          {reportId && (
            <ProjectDetailsPanel
              reportId={reportId}
              initialData={projectDetails}
              onSaved={setProjectDetails}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setInvestorModalOpen(false)} sx={{ color: t.textSecondary }}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={isDownloadingInvestorSummary ? <CircularProgress size={14} sx={{ color: onGold }} /> : <PictureAsPdf />}
            onClick={handleDownloadInvestorSummary}
            disabled={isDownloadingInvestorSummary}
            sx={{ bgcolor: t.gold, color: onGold, fontWeight: 700, '&:hover': { bgcolor: t.goldBright } }}
          >
            {isDownloadingInvestorSummary ? 'Downloading…' : 'Download Investor Summary'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Report Modal */}
      <Dialog
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: t.cardBgAlt, border: '1px solid rgba(212,175,55,0.3)', borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ color: t.gold, fontWeight: 700 }}>
          Share Report
        </DialogTitle>
        <DialogContent>
          {shareToken ? (
            <Box>
              <Typography variant="body2" sx={{ color: t.textSecondary, mb: 2 }}>
                Anyone with this link can view a read only version of this report. No account required.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  value={shareUrl || ''}
                  slotProps={{ input: { readOnly: true, style: { color: t.textPrimary, fontSize: '0.8rem' } } }}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: t.cardBg } }}
                />
                <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={copied ? <Check /> : <ContentCopy />}
                    onClick={handleCopyShareUrl}
                    sx={{ borderColor: t.gold, color: t.gold, whiteSpace: 'nowrap', minWidth: 110 }}
                  >
                    {copied ? 'Copied' : 'Copy link'}
                  </Button>
                </Tooltip>
              </Box>
              <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${t.border}` }}>
                <Typography variant="caption" sx={{ color: t.textFaint, display: 'block', mb: 1.5 }}>
                  Want to make this report private again?
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={isRevokingShare ? <CircularProgress size={14} /> : <LinkOff />}
                  onClick={handleRevokeShare}
                  disabled={isRevokingShare}
                  sx={{ borderColor: 'rgba(244,67,54,0.5)', color: t.error }}
                >
                  {isRevokingShare ? 'Revoking…' : 'Revoke link'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ color: t.textSecondary, mb: 2 }}>
                Generate a permanent shareable link. Anyone with the link can view the full report, no account needed.
              </Typography>
              <Typography variant="caption" sx={{ color: t.textFaint }}>
                You can revoke the link at any time from this dialog.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setShareModalOpen(false)} sx={{ color: t.textSecondary }}>
            Close
          </Button>
          {!shareToken && (
            <Button
              variant="contained"
              startIcon={isCreatingShare ? <CircularProgress size={14} sx={{ color: onGold }} /> : <Share />}
              onClick={handleCreateShare}
              disabled={isCreatingShare}
              sx={{ bgcolor: t.gold, color: onGold, fontWeight: 700 }}
            >
              {isCreatingShare ? 'Creating…' : 'Create share link'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
