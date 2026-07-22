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
import { apiClient, ProjectDetails } from '@/services/api';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';
import { usePlanGate } from '@/app/hooks/usePlanGate';
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
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [isRevokingShare, setIsRevokingShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
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
        if (report.userPlan) setReportUserPlan(report.userPlan);

        // Capture share token if one exists (only Studio users will see it non-null)
        setShareToken(report.shareToken ?? null);

        // Always capture the pdf url
        setPdfUrl(report.pdf_url || report.pdfUrl || null);

        // Capture any previously saved project details
        if (report.projectDetails) setProjectDetails(report.projectDetails);

        // If analysis is already in context (same-session), don't overwrite it
        if (analysis) return;

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
          setFetchError('This report is still processing or contains no data yet.');
        }
      })
      .catch(() => {
        setFetchError('Failed to load report. Please try again.');
      })
      .finally(() => {
        setIsFetchingReport(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const handleDownloadPDF = async () => {
    if (!reportId) return;
    setIsDownloadingPDF(true);
    try {
      await downloadReportPDF(reportId, analysis?.scriptTitle);
    } catch (error) {
      console.error('PDF download failed:', error);
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

  if (isFetchingReport || (!analysis && !fetchError)) {
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
            <Button variant="contained" onClick={() => navigate('/upload')}>New Analysis</Button>
          </Box>
        </Container>
      </Box>
    );
  }

  const tabs = [
    { label: 'Script Summary', icon: <Info /> },
    { label: 'Location Rankings', icon: <Public /> },
    { label: 'Tax Incentives', icon: <AttachMoney /> },
    { label: 'Financial Analysis', icon: <BarChart />, locked: isPreview },
    { label: 'Festivals & Distributors', icon: <TrendingUp />, locked: isPreview },
    { label: 'Comparables', icon: <Movie />, locked: isPreview },
    { label: 'Weather & Logistics', icon: <WbSunny />, locked: isPreview },
    { label: 'Funding & Festivals', icon: <TrendingUp />, locked: isPreview },
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

  const renderLockedHeaderAction = (
    label: string,
    requiredPlan: 'producer' | 'studio'
  ) => (
    <Button
      size="small"
      variant="outlined"
      startIcon={<Lock sx={{ fontSize: 14 }} />}
      onClick={() => navigate('/pricing')}
      sx={{
        color: t.gold,
        borderColor: 'rgba(212,175,55,0.45)',
        fontSize: '0.75rem',
        textTransform: 'none',
        fontWeight: 700,
        borderRadius: '10px',
        '&:hover': { borderColor: t.gold, bgcolor: 'rgba(212,175,55,0.08)' },
      }}
    >
      {`${label} (${requiredPlan === 'studio' ? 'Studio' : 'Producer'})`}
    </Button>
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
      {/* Header */}
      <Box sx={{ bgcolor: t.cardBg, borderBottom: `1px solid ${t.border}`, py: 2, flexShrink: 0 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
            {/* Left: Back + logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <Button
                size="small"
                startIcon={<ArrowBack />}
                onClick={() => navigate(isPreview ? '/upload' : '/dashboard')}
                sx={{ color: t.textSecondary, textTransform: 'none', fontWeight: 600, flexShrink: 0, '&:hover': { color: t.textPrimary, bgcolor: t.goldDim } }}
              >
                Back
              </Button>
              <img src={exampleLogo} alt="Prodculator" style={{ height: '30px', cursor: 'pointer', flexShrink: 0, filter: mode === 'dark' ? 'invert(1)' : 'none' }} onClick={() => navigate('/')} />
            </Box>
            {/* Center: title, centered in the space between logo and actions */}
            <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: t.textPrimary, fontSize: { xs: '1.05rem', sm: '1.35rem' }, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{analysis.scriptTitle}</Typography>
              <Typography variant="caption" sx={{ color: t.textSecondary, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isPreview ? 'Free Intelligence Preview' : 'Professional Intelligence Report'} • {new Date(analysis.generatedAt).toLocaleDateString()}
              </Typography>
            </Box>
            {/* Right: actions section (theme switch + buttons) */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
              {/* Theme switcher */}
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
                    sx={outlinedGold}
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

              {/* Investor Summary — Producer+ */}
              {!isPreview && (
                isProducer ? (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PictureAsPdf />}
                    sx={outlinedGold}
                    onClick={() => setInvestorModalOpen(true)}
                  >
                    Investor Summary
                  </Button>
                ) : (
                  renderLockedHeaderAction('Investor Summary', 'producer')
                )
              )}

              {/* Excel Export — Producer+ */}
              {!isPreview && (
                isProducer ? (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={isExportingExcel ? <CircularProgress size={14} /> : <GridOn />}
                    onClick={handleExportExcel}
                    disabled={isExportingExcel}
                    sx={outlinedGold}
                  >
                    {isExportingExcel ? 'Exporting...' : 'Export Excel'}
                  </Button>
                ) : (
                  renderLockedHeaderAction('Export Excel', 'producer')
                )
              )}

              {/* Share Link — Studio */}
              {!isPreview && (
                isStudio ? (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Share />}
                    onClick={() => setShareModalOpen(true)}
                    sx={outlinedGold}
                  >
                    {shareToken ? 'Manage Share' : 'Share Report'}
                  </Button>
                ) : (
                  renderLockedHeaderAction('Share Report', 'studio')
                )
              )}
            </Box>
          </Box>
        </Container>
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
                      const metricValue = Number(metric.value ?? 0);
                      return (
                        <Grid size={{ xs: 6, sm: 4, md: 2 }} key={metric.label}>
                          <Typography variant="caption" sx={{ color: t.textFaint, display: 'flex', alignItems: 'center' }}>
                            {metric.label}
                            {'tier' in metric && metric.tier ? ` (${metric.tier})` : ''}
                            <InfoTip text={TOOLTIP_TEXTS[tooltipKey]} placement="top" />
                          </Typography>
                          <LinearProgress variant="determinate" value={metricValue} sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: t.cardBgAlt, '& .MuiLinearProgress-bar': { bgcolor: metricValue >= 80 ? t.success : metricValue >= 60 ? '#2196f3' : metricValue >= 40 ? t.gold : t.warning } }} />
                          {isPreview ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4 }}>
                              <Lock sx={{ fontSize: '0.7rem', color: t.gold }} />
                              <Typography variant="caption" sx={{ color: t.gold, fontSize: '0.7rem' }}>Upgrade</Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" sx={{ color: t.textFaint, fontSize: '0.7rem' }}>{metricValue}/100</Typography>
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
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Tax Incentive Estimates</Typography>
              {analysis.sectionExplainers?.incentiveEstimates && (
                <Typography variant="body2" sx={{ color: t.textFaint, mb: 3 }}>{analysis.sectionExplainers.incentiveEstimates}</Typography>
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
                          <Typography variant="body2">Estimated Rebate:</Typography>
                          <Typography variant="h6" sx={{ color: t.success }}>{inc.estimatedRebate}</Typography>
                        </Box>
                        <Divider sx={{ my: 2, borderColor: t.border }} />
                        <Typography variant="subtitle2" sx={{ mb: 1, color: t.gold }}>Requirements:</Typography>
                        <List dense>{Array.isArray(inc.requirements) ? inc.requirements.map((r, ri) => <ListItem key={ri} sx={{ color: t.textSecondary, py: 0.25 }}>• {r}</ListItem>) : null}</List>
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

                              {hasV3Fields ? (
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
              {isPreview ? (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Festival & Distributor Strategy</Typography>
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
                      Unlock Festival & Distributor Strategy
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
                            <Typography variant="h6" sx={{ color: t.gold }}>{fest.name}</Typography>
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

                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Who Could Buy Your Film</Typography>
                  <Typography variant="body2" sx={{ color: t.textSecondary, mb: 3 }}>
                    Distributors are ranked partly on whether they actively scout the festivals recommended above.
                  </Typography>
                  <Grid container spacing={3}>
                    {((analysis as any).distributorRecommendations || []).map((dist: any, i: number) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, height: '100%' }}>
                          {dist.scoutsRecommendedFestivals?.length > 0 && (
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
                </>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={5}>
              {isPreview ? (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Comparable Productions</Typography>
                  <TableContainer component={Paper} sx={{ bgcolor: t.cardBgAlt }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          {['Title', 'Genre', 'Budget', 'Location', 'Year', 'Source'].map((col) => (
                            <TableCell key={col} sx={{ color: t.gold, fontWeight: 600 }}>{col}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[70, 55, 80, 60].map((w, i) => (
                          <TableRow key={i}>
                            {[w, 50, 55, 60, 30, 45].map((cw, j) => (
                              <TableCell key={j} sx={{ borderBottom: `1px solid ${t.border}` }}>
                                <Box sx={{ height: 12, width: cw, bgcolor: skeleton, borderRadius: 1 }} />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Button variant="contained" onClick={() => navigate('/pricing')} sx={{ bgcolor: t.gold, color: onGold, fontWeight: 600, px: 5, '&:hover': { bgcolor: t.goldBright } }}>
                      Unlock Comparable Productions
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Comparable Productions</Typography>
                  <TableContainer component={Paper} sx={{ bgcolor: t.cardBgAlt }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: t.gold, fontWeight: 600 }}>Title</TableCell>
                          <TableCell sx={{ color: t.gold, fontWeight: 600 }}>Genre</TableCell>
                          <TableCell sx={{ color: t.gold, fontWeight: 600 }}>Budget</TableCell>
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
                            <TableCell sx={{ color: t.textSecondary }}>{comp.budgetRange}</TableCell>
                            <TableCell sx={{ color: t.textSecondary }}>{comp.location}</TableCell>
                            <TableCell sx={{ color: t.textSecondary }}>{comp.year}</TableCell>
                            <TableCell sx={{ color: t.textSecondary }}>{cleanSource(comp.source)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </TabPanel>

            {/* Tab 7: Weather & Logistics */}
            <TabPanel value={tabValue} index={6}>
              {isPreview ? (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Weather & Logistics</Typography>
                  <Grid container spacing={3}>
                    {analysis.locationRankings.map((loc, i) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, height: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: t.gold }}>{loc.name}</Typography>
                            <Box sx={{ height: 24, width: 80, bgcolor: skeleton, borderRadius: 1 }} />
                          </Box>
                          <Typography variant="subtitle2" sx={{ color: t.gold, mb: 0.5 }}>Best Months:</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                            {[44, 44, 44].map((w, j) => (
                              <Box key={j} sx={{ height: 22, width: w, bgcolor: skeleton, borderRadius: 1 }} />
                            ))}
                          </Box>
                          {['Temp Range:', 'Daylight:'].map((label) => (
                            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ color: t.textSecondary }}>{label}</Typography>
                              <LockedBadge />
                            </Box>
                          ))}
                          <Divider sx={{ my: 1.5, borderColor: t.border }} />
                          <Box sx={{ height: 12, width: '85%', bgcolor: skeleton, borderRadius: 1, mb: 1 }} />
                          <Box sx={{ height: 12, width: '70%', bgcolor: skeleton, borderRadius: 1 }} />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Button variant="contained" onClick={() => navigate('/pricing')} sx={{ bgcolor: t.gold, color: onGold, fontWeight: 600, px: 5, '&:hover': { bgcolor: t.goldBright } }}>
                      Unlock Weather & Logistics
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Weather & Logistics</Typography>
                  <Grid container spacing={3}>
                    {analysis.weatherLogistics.map((weather, i) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, height: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: t.gold }}>{weather.territory}</Typography>
                            <Chip
                              label={`Risk: ${weather.weatherRisk}`}
                              size="small"
                              sx={{
                                bgcolor: weather.weatherRisk === 'Low' ? 'rgba(76, 175, 80, 0.2)' : weather.weatherRisk === 'Medium' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                color: weather.weatherRisk === 'Low' ? t.success : weather.weatherRisk === 'Medium' ? t.gold : t.error,
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: t.gold, mb: 0.5 }}>Best Months:</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {weather.bestMonths.map((m, mi) => (
                                <Chip key={mi} label={m} size="small" sx={{ bgcolor: t.cardBgAlt, color: t.textSecondary }} />
                              ))}
                            </Box>
                          </Box>
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
                          <Typography variant="body2" sx={{ color: t.textSecondary, mb: 0.5 }}>{weather.infrastructure}</Typography>
                          <Typography variant="body2" sx={{ color: t.textFaint }}>{weather.travelVisa}</Typography>
                          {weather.seasonalConsiderations && (
                            <Typography variant="body2" sx={{ color: t.textFaint, mt: 0.5, fontStyle: 'italic' }}>{weather.seasonalConsiderations}</Typography>
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </TabPanel>

            {/* Tab 8: Funding & Festivals */}
            <TabPanel value={tabValue} index={7}>
              {isPreview ? (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Funding & Festival Opportunities</Typography>
                  <Grid container spacing={3}>
                    {[
                      { type: 'Fund', color: t.success, bg: 'rgba(76,175,80,0.2)' },
                      { type: 'Festival', color: '#2196f3', bg: 'rgba(33,150,243,0.2)' },
                      { type: 'Fund', color: t.success, bg: 'rgba(76,175,80,0.2)' },
                      { type: 'Festival', color: '#2196f3', bg: 'rgba(33,150,243,0.2)' },
                    ].map((item, i) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: t.cardBgAlt, border: `1px solid ${t.border}`, height: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ height: 14, width: '55%', bgcolor: skeleton, borderRadius: 1 }} />
                            <Chip label={item.type} size="small" sx={{ bgcolor: item.bg, color: item.color, fontWeight: 600 }} />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                            {[55, 48].map((w, j) => (
                              <Box key={j} sx={{ height: 20, width: w, bgcolor: 'rgba(212,175,55,0.08)', borderRadius: 1 }} />
                            ))}
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" sx={{ color: t.textSecondary }}>Deadline:</Typography>
                            <LockedBadge />
                          </Box>
                          <Box sx={{ height: 12, width: '90%', bgcolor: skeleton, borderRadius: 1, mb: 0.5 }} />
                          <Box sx={{ height: 12, width: '70%', bgcolor: skeleton, borderRadius: 1 }} />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Button variant="contained" onClick={() => navigate('/pricing')} sx={{ bgcolor: t.gold, color: onGold, fontWeight: 600, px: 5, '&:hover': { bgcolor: t.goldBright } }}>
                      Unlock Funding & Festival Intelligence
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Funding & Festival Opportunities</Typography>
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
              )}
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
