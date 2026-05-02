import { useState, useEffect } from 'react';
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
  ArrowBack,
  Public,
  AttachMoney,
  People,
  Movie,
  WbSunny,
  TrendingUp,
  Info,
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
import ProjectDetailsPanel from './ProjectDetailsPanel';

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return <div hidden={value !== index} style={{ height: '100%' }}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>;
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
      <Box sx={{ bgcolor: '#000000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#D4AF37', mb: 2 }} />
          <Typography variant="body1" sx={{ color: '#a0a0a0' }}>Loading report…</Typography>
        </Box>
      </Box>
    );
  }

  if (!analysis) {
    return (
      <Box sx={{ bgcolor: '#000000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#ffffff' }}>
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
    { label: 'Crew & Cost', icon: <People />, locked: isPreview },
    { label: 'Comparables', icon: <Movie />, locked: isPreview },
    { label: 'Weather & Logistics', icon: <WbSunny />, locked: isPreview },
    { label: 'Funding & Festivals', icon: <TrendingUp />, locked: isPreview },
  ];

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
        color: '#000',
        borderColor: '#000',
        fontSize: '0.75rem',
      }}
    >
      {`${label} (${requiredPlan === 'studio' ? 'Studio' : 'Producer'})`}
    </Button>
  );

  const BlurredContent = ({ title }: { title: string }) => (
    <Box sx={{ position: 'relative', minHeight: '400px', overflow: 'hidden' }}>
      <Box sx={{ filter: 'blur(8px)', opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
        <Typography variant="h5" gutterBottom>{title}</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map(i => (
            <Grid size={{ xs: 12 }} key={i}>
              <Paper sx={{ p: 3, bgcolor: '#1a1a1a' }}>
                <Box sx={{ height: 20, width: '40%', bgcolor: '#333', mb: 2 }} />
                <Box sx={{ height: 100, width: '100%', bgcolor: '#222' }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 0, left: 0, right: 0, bottom: 0, 
          display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', p: 4,
          zIndex: 10
        }}
      >
        <Lock sx={{ fontSize: 64, color: '#D4AF37', mb: 2 }} />
        <Typography variant="h5" sx={{ color: '#ffffff', mb: 1, fontWeight: 700 }}>
          {title} Locked
        </Typography>
        <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 4, maxWidth: '400px' }}>
          Detailed {title.toLowerCase()} analysis is exclusive to Pro and Studio members. Upgrade to unlock investor-ready intelligence.
        </Typography>
        <Button 
          variant="contained" 
          size="large"
          onClick={() => navigate('/pricing')}
          sx={{ px: 6 }}
        >
          Unlock Full Report
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#000000', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.98)', borderBottom: '1px solid rgba(0,0,0,0.1)', py: 2 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
              <img src={exampleLogo} alt="Prodculator" style={{ height: '32px', cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('/')} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#000000', fontSize: { xs: '0.9rem', sm: '1.25rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{analysis.scriptTitle}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.6)', display: { xs: 'none', sm: 'block' } }}>
                  {isPreview ? 'Free Intelligence Preview' : 'Professional Intelligence Report'} • {new Date(analysis.generatedAt).toLocaleDateString()}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {/* Free user: upgrade nudge + watermarked PDF download */}
              {isPreview && (
                <>
                  {pdfUrl && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={isDownloadingPDF ? <CircularProgress size={14} /> : <Download />}
                      sx={{ color: '#000', borderColor: '#000', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      onClick={handleDownloadPDF}
                      disabled={isDownloadingPDF}
                    >
                      {isDownloadingPDF ? 'Downloading...' : 'Download Trial PDF (Watermarked)'}
                    </Button>
                  )}
                  <Button size="small" variant="contained" onClick={() => navigate('/pricing')} sx={{ bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#222' }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
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
                    startIcon={isViewingPDF ? <CircularProgress size={14} /> : <Download />}
                    sx={{ color: '#000', borderColor: '#000' }}
                    onClick={handleViewPDF}
                    disabled={isViewingPDF}
                  >
                    {isViewingPDF ? 'Opening...' : 'View PDF'}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={isDownloadingPDF ? <CircularProgress size={14} sx={{ color: '#000' }} /> : <Download />}
                    sx={{ bgcolor: '#000', color: '#fff', '&:hover': { bgcolor: '#222' }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
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
                  sx={{ color: '#000', borderColor: '#000', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
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
                    sx={{ color: '#000', borderColor: '#000', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
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
                    sx={{ color: '#000', borderColor: '#000', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
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
                    sx={{ color: '#000', borderColor: '#000', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                  >
                    {shareToken ? 'Manage Share' : 'Share Report'}
                  </Button>
                ) : (
                  renderLockedHeaderAction('Share Report', 'studio')
                )
              )}

              <Button size="small" startIcon={<ArrowBack />} onClick={() => navigate(isPreview ? '/upload' : '/dashboard')} sx={{ color: '#000' }}>
                Back
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
        {isPreview && (
          <Alert severity="warning" sx={{ mb: 4, bgcolor: '#D4AF37', color: '#000', '& .MuiAlert-icon': { color: '#000' } }}>
            This is a <strong>Free Preview</strong>. Access to technical crew costs, comparable production data, and weather logistics is restricted.
          </Alert>
        )}

        <Paper sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'rgba(212, 175, 55, 0.2)' }}>
            <Tabs 
              value={tabValue} 
              onChange={(_e, v) => setTabValue(v)} 
              variant="scrollable" 
              sx={{
                '& .MuiTab-root': { color: '#a0a0a0', py: 2 },
                '& .Mui-selected': { color: '#D4AF37 !important' },
                '& .MuiTabs-indicator': { backgroundColor: '#D4AF37' }
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

          <Box sx={{ p: { xs: 2, sm: 4 } }}>
            {/* Tab 1: Script Summary */}
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Script Intelligence Summary</Typography>

              {/* Headline Net Budget */}
              {analysis.executiveSummary?.headlineNetBudget && (
                <Paper sx={{ p: 3, mb: 3, bgcolor: '#0d1a0d', border: '2px solid #4caf50', borderRadius: 2 }}>
                  <Typography variant="overline" sx={{ color: '#4caf50', letterSpacing: 2 }}>Net Effective Budget After Incentives</Typography>
                  <Typography variant="h3" sx={{ color: '#4caf50', fontWeight: 800, mt: 0.5 }}>
                    {analysis.executiveSummary.headlineNetBudget}
                  </Typography>
                </Paper>
              )}

              {/* Key Flags */}
              {analysis.executiveSummary?.keyFlags && analysis.executiveSummary.keyFlags.length > 0 && (
                <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {analysis.executiveSummary.keyFlags.slice(0, 3).map((flag, i) => (
                    <Alert
                      key={i}
                      icon={<Warning sx={{ color: '#D4AF37' }} />}
                      sx={{
                        bgcolor: 'rgba(212, 175, 55, 0.08)',
                        border: '1px solid rgba(212, 175, 55, 0.4)',
                        color: '#ffffff',
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
                <Grid size={{ xs: 12, md: 6 }}><Card sx={{ bgcolor: '#111' }}><CardContent><Typography variant="overline" color="primary">Genre</Typography><Typography variant="h6">{analysis.genre}</Typography></CardContent></Card></Grid>
                <Grid size={{ xs: 12, md: 6 }}><Card sx={{ bgcolor: '#111' }}><CardContent><Typography variant="overline" color="primary">Complexity</Typography><Typography variant="h6">{analysis.complexity}</Typography></CardContent></Card></Grid>
                <Grid size={{ xs: 12 }}><Card sx={{ bgcolor: '#111' }}><CardContent><Typography variant="overline" color="primary">Tone & Scale</Typography><Typography variant="body1">{analysis.tone}</Typography></CardContent></Card></Grid>
              </Grid>

              {/* Action Timeline */}
              {analysis.executiveSummary?.actionTimeline && analysis.executiveSummary.actionTimeline.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="h6" sx={{ color: '#D4AF37', mb: 2, fontWeight: 600 }}>
                    Action Timeline
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {analysis.executiveSummary.actionTimeline.map((item, i) => (
                      <Paper key={i} sx={{ p: 2, bgcolor: '#111', border: '1px solid #222', display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box sx={{ mt: 0.25, flexShrink: 0 }}>
                          <CheckCircle sx={{ color: '#D4AF37', fontSize: 20 }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 500 }}>{item.action}</Typography>
                          {item.deadline && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <AccessTime sx={{ fontSize: 14, color: '#a0a0a0' }} />
                              <Typography variant="caption" sx={{ color: '#a0a0a0' }}>{item.deadline}</Typography>
                            </Box>
                          )}
                          {item.note && (
                            <Typography variant="caption" sx={{ color: '#888', display: 'block', mt: 0.5, fontStyle: 'italic' }}>{item.note}</Typography>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}
            </TabPanel>

            {/* Tab 2: Location Rankings */}
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Global Territory Rankings</Typography>
              {analysis.sectionExplainers?.locationRankings && (
                <Typography variant="body2" sx={{ color: '#888', mb: 3 }}>{analysis.sectionExplainers.locationRankings}</Typography>
              )}
              {/* Free users see 3 territories — show 2 locked placeholders so they know more exist */}
              {isPreview && (
                <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(212,175,55,0.08)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', '& .MuiAlert-icon': { color: '#D4AF37' } }}>
                  Showing top 3 territories. Upgrade to Professional for up to 5, or buy a single report for all available territories.
                </Alert>
              )}
              {analysis.locationRankings.map((loc, i) => (
                <Paper key={i} sx={{ p: 3, mb: 2, bgcolor: '#111', border: '1px solid #222' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                      <Typography variant="h6" sx={{ color: '#D4AF37' }}>{loc.name}, {loc.country}</Typography>
                      {loc.isAssessmentOnly && (
                        <Chip label="Assessment Only" size="small" sx={{ bgcolor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37', border: '1px solid #D4AF37', fontSize: '0.7rem' }} />
                      )}
                      {loc.bankabilityLabel && (
                        <Chip
                          label={loc.bankabilityLabel}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            ...(loc.bankabilityLabel === 'BANKABLE'
                              ? { bgcolor: 'rgba(76,175,80,0.2)', color: '#4caf50', border: '1px solid #4caf50' }
                              : loc.bankabilityLabel === 'VERIFY FIRST'
                              ? { bgcolor: 'rgba(255,152,0,0.2)', color: '#ff9800', border: '1px solid #ff9800' }
                              : { bgcolor: 'rgba(244,67,54,0.2)', color: '#f44336', border: '1px solid #f44336' }),
                          }}
                        />
                      )}
                    </Box>
                    <Chip label={`Score: ${loc.score}/100`} sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 700 }} />
                  </Box>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {[
                      { label: 'Cost Efficiency', value: loc.costEfficiency },
                      { label: 'Crew Depth', value: loc.crewDepth },
                      { label: 'Infrastructure', value: loc.infrastructure },
                      { label: 'Incentive Strength', value: loc.incentiveStrength },
                      { label: 'Currency Advantage', value: loc.currencyAdvantage },
                      ...(loc.incentiveReliability != null ? [{ label: 'Incentive Reliability', value: loc.incentiveReliability }] : []),
                    ].map((metric) => (
                      <Grid size={{ xs: 6, sm: 4, md: 2 }} key={metric.label}>
                        <Typography variant="caption" sx={{ color: '#666' }}>{metric.label}</Typography>
                        <LinearProgress variant="determinate" value={metric.value} sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#222', '& .MuiLinearProgress-bar': { bgcolor: metric.value >= 80 ? '#4caf50' : metric.value >= 60 ? '#2196f3' : metric.value >= 40 ? '#D4AF37' : '#ff9800' } }} />
                        <Typography variant="caption" sx={{ color: '#888', fontSize: '0.7rem' }}>{metric.value}/100</Typography>
                      </Grid>
                    ))}
                  </Grid>
                  <Divider sx={{ my: 2, borderColor: '#333' }} />
                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#D4AF37' }}>Key Intelligence:</Typography>
                  <List dense>{loc.reasoning.map((r, ri) => <ListItem key={ri} sx={{ color: '#a0a0a0' }}>• {r}</ListItem>)}</List>
                </Paper>
              ))}
              {isPreview && [0, 1].map((i) => (
                <Box key={`locked-territory-${i}`} sx={{ position: 'relative', mb: 2 }}>
                  <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #222', filter: 'blur(4px)', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ color: '#D4AF37' }}>Territory #{i + 4}</Typography>
                      <Chip label="Score: —/100" sx={{ bgcolor: '#333', color: '#666', fontWeight: 700 }} />
                    </Box>
                    <LinearProgress variant="determinate" value={60} sx={{ height: 6, borderRadius: 3, bgcolor: '#222' }} />
                  </Paper>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <Lock sx={{ color: '#D4AF37', fontSize: '1.8rem' }} />
                    <Typography variant="body2" sx={{ color: '#D4AF37', fontWeight: 600 }}>Upgrade to unlock</Typography>
                  </Box>
                </Box>
              ))}
            </TabPanel>

            {/* Tab 3: Tax Incentives */}
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Tax Incentive Estimates</Typography>
              {analysis.sectionExplainers?.incentiveEstimates && (
                <Typography variant="body2" sx={{ color: '#888', mb: 3 }}>{analysis.sectionExplainers.incentiveEstimates}</Typography>
              )}
              {isPreview && (
                <Box sx={{ position: 'relative' }}>
                  <Box sx={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
                    <Grid container spacing={3}>
                      {analysis.incentiveEstimates.map((inc, i) => (
                        <Grid size={{ xs: 12, md: 6 }} key={i}>
                          <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #222', height: '100%' }}>
                            <Typography variant="h6" sx={{ color: '#D4AF37', mb: 1 }}>{inc.territory}</Typography>
                            <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>{inc.program}</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">Rate:</Typography>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>{inc.rate}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">Estimated Rebate:</Typography>
                              <Typography variant="h6" sx={{ color: '#4caf50' }}>{inc.estimatedRebate}</Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                  <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                    <Paper sx={{ p: 4, bgcolor: 'rgba(0,0,0,0.9)', border: '1px solid #D4AF37', textAlign: 'center' }}>
                      <Lock sx={{ fontSize: 40, color: '#D4AF37', mb: 1 }} />
                      <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>Upgrade for Full Details</Typography>
                      <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>Get detailed rebate calculations, eligibility requirements, and qualifying spend analysis.</Typography>
                      <Button variant="contained" onClick={() => navigate('/pricing')} sx={{ bgcolor: '#D4AF37', color: '#000', '&:hover': { bgcolor: '#D4AF37' } }}>Upgrade Now</Button>
                    </Paper>
                  </Box>
                </Box>
              )}
              {!isPreview && (
                <Grid container spacing={3}>
                  {analysis.incentiveEstimates.map((inc, i) => (
                    <Grid size={{ xs: 12, md: 6 }} key={i}>
                      <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #222', height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" sx={{ color: '#D4AF37' }}>{inc.territory}</Typography>
                          {inc.bankabilityLabel && (
                            <Chip
                              label={inc.bankabilityLabel}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                ...(inc.bankabilityLabel === 'BANKABLE'
                                  ? { bgcolor: 'rgba(76,175,80,0.2)', color: '#4caf50', border: '1px solid #4caf50' }
                                  : inc.bankabilityLabel === 'VERIFY FIRST'
                                  ? { bgcolor: 'rgba(255,152,0,0.2)', color: '#ff9800', border: '1px solid #ff9800' }
                                  : { bgcolor: 'rgba(244,67,54,0.2)', color: '#f44336', border: '1px solid #f44336' }),
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>{inc.program}</Typography>
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
                          <Typography variant="body2" sx={{ color: '#a0a0a0' }}>{inc.qualifyingSpend}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">Estimated Rebate:</Typography>
                          <Typography variant="h6" sx={{ color: '#4caf50' }}>{inc.estimatedRebate}</Typography>
                        </Box>
                        <Divider sx={{ my: 2, borderColor: '#333' }} />
                        <Typography variant="subtitle2" sx={{ mb: 1, color: '#D4AF37' }}>Requirements:</Typography>
                        <List dense>{Array.isArray(inc.requirements) ? inc.requirements.map((r, ri) => <ListItem key={ri} sx={{ color: '#a0a0a0', py: 0.25 }}>• {r}</ListItem>) : null}</List>
                        <Typography variant="caption" sx={{ color: '#555', display: 'block', mt: 1 }}>{inc.disclaimer}</Typography>
                        <Typography variant="caption" sx={{ color: '#444', display: 'block' }}>Source: {inc.dataSource} • Updated: {new Date(inc.lastUpdated).toLocaleDateString()}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </TabPanel>

            {/* Tab 4: Financial Analysis */}
            <TabPanel value={tabValue} index={3}>
              {isPreview ? <BlurredContent title="Financial Analysis" /> : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Financial Analysis</Typography>
                  {analysis.sectionExplainers?.financialAnalysis && (
                    <Typography variant="body2" sx={{ color: '#888', mb: 3 }}>{analysis.sectionExplainers.financialAnalysis}</Typography>
                  )}
                  {analysis.financialAnalysis?.budgetScenarios && analysis.financialAnalysis.budgetScenarios.length > 0 ? (
                    <Grid container spacing={3}>
                      {analysis.financialAnalysis.budgetScenarios.map((scenario, i) => {
                        const hasV3Fields = scenario.totalBudget || scenario.qualifyingSpend || scenario.netRebate;
                        return (
                          <Grid size={{ xs: 12 }} key={i}>
                            <Paper sx={{ p: 3, bgcolor: '#111', border: i === 0 ? '2px solid #D4AF37' : '1px solid #222' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={{ color: '#D4AF37' }}>{scenario.territory || `Scenario ${i + 1}`}</Typography>
                                {scenario.programme && (
                                  <Chip label={scenario.programme} size="small" sx={{ bgcolor: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.4)' }} />
                                )}
                              </Box>

                              {hasV3Fields ? (
                                /* 6-step calculation breakdown */
                                <Box>
                                  {[
                                    { label: 'Total Budget', value: scenario.totalBudget },
                                    { label: `Qualifying Spend (${scenario.qualifyingSpendPct || '—'})`, value: scenario.qualifyingSpend },
                                    { label: 'ATL Deduction', value: scenario.atlDeduction },
                                    { label: 'Net Qualifying Spend', value: scenario.netQualifyingSpend },
                                    { label: `Gross Rebate (${scenario.rateGross || scenario.rateNet || '—'})`, value: scenario.grossRebate },
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
                                        borderRadius: 1,
                                        bgcolor: step.bold ? 'rgba(76,175,80,0.08)' : step.highlight ? 'rgba(212,175,55,0.06)' : 'transparent',
                                        borderLeft: step.bold ? '3px solid #4caf50' : step.highlight ? '3px solid #D4AF37' : '3px solid transparent',
                                      }}
                                    >
                                      <Typography variant="body2" sx={{ color: step.bold ? '#ffffff' : '#a0a0a0', fontWeight: step.bold ? 600 : 400 }}>
                                        {`${si + 1}. ${step.label}`}
                                      </Typography>
                                      <Typography variant="body1" sx={{ fontWeight: step.bold ? 700 : 500, color: step.bold ? '#4caf50' : step.highlight ? '#D4AF37' : '#ffffff' }}>
                                        {step.value}
                                      </Typography>
                                    </Box>
                                  ) : null)}
                                  {scenario.notes && (
                                    <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1.5, fontStyle: 'italic' }}>
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
                                      <Typography variant="body2" sx={{ color: '#a0a0a0' }}>{row.label}</Typography>
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
                    <Paper sx={{ p: 4, bgcolor: '#111', border: '1px solid #222', textAlign: 'center' }}>
                      <Typography variant="body1" sx={{ color: '#666' }}>Financial scenario data will appear here once your report is generated.</Typography>
                    </Paper>
                  )}
                </>
              )}
            </TabPanel>

            {/* Tab 5: Crew & Cost */}
            <TabPanel value={tabValue} index={4}>
              {isPreview ? <BlurredContent title="Crew & Cost" /> : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Crew Insights by Territory</Typography>
                  <Grid container spacing={3}>
                    {analysis.crewInsights.map((crew, i) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #222', height: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: '#D4AF37' }}>{crew.territory}</Typography>
                            <Chip
                              label={crew.availability}
                              size="small"
                              sx={{
                                bgcolor: crew.availability === 'High' ? 'rgba(76, 175, 80, 0.2)' : crew.availability === 'Medium' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                color: crew.availability === 'High' ? '#4caf50' : crew.availability === 'Medium' ? '#D4AF37' : '#f44336',
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Crew Cost:</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>{crew.costVsUSD}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Quality Rating:</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>{crew.qualityRating.toFixed(1)}/5</Typography>
                          </Box>
                          <Typography variant="subtitle2" sx={{ color: '#D4AF37', mb: 1 }}>Specialties:</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                            {crew.specialties.map((s, si) => (
                              <Chip key={si} label={s} size="small" sx={{ bgcolor: '#222', color: '#a0a0a0', fontSize: '0.75rem' }} />
                            ))}
                          </Box>
                          <Divider sx={{ my: 1, borderColor: '#333' }} />
                          <Typography variant="body2" sx={{ color: '#888', fontStyle: 'italic' }}>{crew.tradeoff}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </TabPanel>

            {/* Tab 6: Comparables */}
            <TabPanel value={tabValue} index={5}>
              {isPreview ? <BlurredContent title="Comparables" /> : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Comparable Productions</Typography>
                  <TableContainer component={Paper} sx={{ bgcolor: '#111' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Title</TableCell>
                          <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Genre</TableCell>
                          <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Budget</TableCell>
                          <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Location</TableCell>
                          <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Year</TableCell>
                          <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Source</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analysis.comparables.map((comp, i) => (
                          <TableRow key={i}>
                            <TableCell sx={{ color: '#fff', fontWeight: 500 }}>{comp.title}</TableCell>
                            <TableCell sx={{ color: '#a0a0a0' }}>{comp.genre}</TableCell>
                            <TableCell sx={{ color: '#a0a0a0' }}>{comp.budgetRange}</TableCell>
                            <TableCell sx={{ color: '#a0a0a0' }}>{comp.location}</TableCell>
                            <TableCell sx={{ color: '#a0a0a0' }}>{comp.year}</TableCell>
                            <TableCell sx={{ color: '#666' }}>{comp.source}</TableCell>
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
              {isPreview ? <BlurredContent title="Weather & Logistics" /> : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Weather & Logistics</Typography>
                  <Grid container spacing={3}>
                    {analysis.weatherLogistics.map((weather, i) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #222', height: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: '#D4AF37' }}>{weather.territory}</Typography>
                            <Chip
                              label={`Risk: ${weather.weatherRisk}`}
                              size="small"
                              sx={{
                                bgcolor: weather.weatherRisk === 'Low' ? 'rgba(76, 175, 80, 0.2)' : weather.weatherRisk === 'Medium' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                color: weather.weatherRisk === 'Low' ? '#4caf50' : weather.weatherRisk === 'Medium' ? '#D4AF37' : '#f44336',
                                fontWeight: 600,
                              }}
                            />
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: '#D4AF37', mb: 0.5 }}>Best Months:</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {weather.bestMonths.map((m, mi) => (
                                <Chip key={mi} label={m} size="small" sx={{ bgcolor: '#222', color: '#a0a0a0' }} />
                              ))}
                            </Box>
                          </Box>
                          {weather.avgTempRange && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Temp Range:</Typography>
                              <Typography variant="body2">{weather.avgTempRange}</Typography>
                            </Box>
                          )}
                          {weather.daylightHours && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Daylight:</Typography>
                              <Typography variant="body2">{weather.daylightHours}</Typography>
                            </Box>
                          )}
                          <Divider sx={{ my: 1.5, borderColor: '#333' }} />
                          <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 0.5 }}>{weather.infrastructure}</Typography>
                          <Typography variant="body2" sx={{ color: '#888' }}>{weather.travelVisa}</Typography>
                          {weather.seasonalConsiderations && (
                            <Typography variant="body2" sx={{ color: '#888', mt: 0.5, fontStyle: 'italic' }}>{weather.seasonalConsiderations}</Typography>
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
              {isPreview ? <BlurredContent title="Funding & Festivals" /> : (
                <>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>Funding & Festival Opportunities</Typography>
                  <Grid container spacing={3}>
                    {Array.isArray(analysis.fundingOpportunities) ? analysis.fundingOpportunities.map((opp, i) => (
                      <Grid size={{ xs: 12, md: 6 }} key={i}>
                        <Paper sx={{ p: 3, bgcolor: '#111', border: '1px solid #222', height: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: '#D4AF37' }}>{opp.name}</Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Chip
                                label={opp.type}
                                size="small"
                                sx={{ bgcolor: opp.type === 'Fund' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(33, 150, 243, 0.2)', color: opp.type === 'Fund' ? '#4caf50' : '#2196f3', fontWeight: 600 }}
                              />
                              {opp.tier && (
                                <Chip label={opp.tier} size="small" sx={{ bgcolor: '#222', color: '#a0a0a0' }} />
                              )}
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                            {Array.isArray(opp.genre) ? opp.genre.map((g, gi) => (
                              <Chip key={gi} label={g} size="small" sx={{ bgcolor: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37', fontSize: '0.7rem' }} />
                            )) : null}
                          </Box>
                          {opp.deadline && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Deadline:</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>{opp.deadline}</Typography>
                            </Box>
                          )}
                          <Typography variant="body2" sx={{ color: '#888' }}>{opp.notes}</Typography>
                          {opp.website && (
                            <Button size="small" href={opp.website} target="_blank" sx={{ mt: 1, color: '#D4AF37', textTransform: 'none', p: 0 }}>
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
        slotProps={{ paper: { sx: { bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 700, pb: 0 }}>
          Investor Summary
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
            Fill in your project details to personalise the PDF — every field is optional.
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
          <Button onClick={() => setInvestorModalOpen(false)} sx={{ color: '#a0a0a0' }}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={isDownloadingInvestorSummary ? <CircularProgress size={14} sx={{ color: '#000' }} /> : <PictureAsPdf />}
            onClick={handleDownloadInvestorSummary}
            disabled={isDownloadingInvestorSummary}
            sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#c9a227' } }}
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
        slotProps={{ paper: { sx: { bgcolor: '#111', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 2 } } }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 700 }}>
          Share Report
        </DialogTitle>
        <DialogContent>
          {shareToken ? (
            <Box>
              <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
                Anyone with this link can view a read-only version of this report. No account required.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  value={shareUrl || ''}
                  slotProps={{ input: { readOnly: true, style: { color: '#fff', fontSize: '0.8rem' } } }}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#0a0a0a' } }}
                />
                <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={copied ? <Check /> : <ContentCopy />}
                    onClick={handleCopyShareUrl}
                    sx={{ borderColor: '#D4AF37', color: '#D4AF37', whiteSpace: 'nowrap', minWidth: 110 }}
                  >
                    {copied ? 'Copied' : 'Copy link'}
                  </Button>
                </Tooltip>
              </Box>
              <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #222' }}>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1.5 }}>
                  Want to make this report private again?
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={isRevokingShare ? <CircularProgress size={14} /> : <LinkOff />}
                  onClick={handleRevokeShare}
                  disabled={isRevokingShare}
                  sx={{ borderColor: 'rgba(244,67,54,0.5)', color: '#f44336' }}
                >
                  {isRevokingShare ? 'Revoking…' : 'Revoke link'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
                Generate a permanent shareable link. Anyone with the link can view the full report — no account needed.
              </Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>
                You can revoke the link at any time from this dialog.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setShareModalOpen(false)} sx={{ color: '#a0a0a0' }}>
            Close
          </Button>
          {!shareToken && (
            <Button
              variant="contained"
              startIcon={isCreatingShare ? <CircularProgress size={14} sx={{ color: '#000' }} /> : <Share />}
              onClick={handleCreateShare}
              disabled={isCreatingShare}
              sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 700 }}
            >
              {isCreatingShare ? 'Creating…' : 'Create share link'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
