import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  IconButton,
  LinearProgress,
  CircularProgress,
  Divider,
  Grid,
} from '@mui/material';

import {
  Download,
  Settings,
  FileDownload,
  Visibility,
  Delete,
  Movie,
  Home,
  Compare,
  Calculate,
  Timeline,
  Visibility as VisibilityIcon,
  BarChart,
  CreditCard,
  Logout,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { downloadReportPDF } from '@/services/report-pdf.service';
import { WhatIfCalculator } from '@/app/components/user/WhatIfCalculator';
import { TerritoryComparison } from '@/app/components/user/TerritoryComparison';
import { ProductionTimeline } from '@/app/components/user/ProductionTimeline';

interface ReportSummary {
  id: string;
  title: string;
  createdAt: string;
  reportType: string;
  topTerritory: string;
  status: 'Completed' | 'Failed' | 'Pending';
  pdfUrl?: string | null;
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return <div role="tabpanel" hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>;
}

type AnalysisPayload = {
  error?: string;
  topRecommendation?: string;
  executiveSummary?: {
    recommendedTerritories?: string[];
  };
  locationRankings?: Array<{
    name?: string;
    country?: string;
  }>;
};

type ReportApiResponse = {
  id: string;
  title?: string;
  script_title?: string;
  createdAt?: string;
  created_at?: string;
  reportType?: string;
  report_type?: string;
  analysis?: AnalysisPayload | null;
  report_data?: AnalysisPayload | null;
  pdfUrl?: string | null;
  pdf_url?: string | null;
};

function normalizeDate(value: string): string {
  if (!value) return 'N/A';
  const isoLikeValue = value.includes(' ') ? value.replace(' ', 'T') : value;
  const parsed = new Date(isoLikeValue);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

const tableChipBaseSx = {
  height: 28,
  borderRadius: '999px',
  borderWidth: 1,
  borderStyle: 'solid',
  fontWeight: 700,
  fontSize: '0.78rem',
  letterSpacing: '0.01em',
  '& .MuiChip-label': {
    px: 1.2,
  },
} as const;

const neutralTableChipSx = {
  ...tableChipBaseSx,
  bgcolor: 'rgba(212, 175, 55, 0.16)',
  color: '#D4AF37',
  borderColor: 'rgba(212, 175, 55, 0.32)',
} as const;

function getStatusChipSx(status: ReportSummary['status']) {
  const statusChipBase = {
    ...tableChipBaseSx,
    minWidth: 104,
    justifyContent: 'center',
    '& .MuiChip-label': {
      px: 1.2,
      width: '100%',
      textAlign: 'center',
    },
  };

  if (status === 'Completed') {
    return {
      ...statusChipBase,
      bgcolor: 'rgba(76, 175, 80, 0.14)',
      color: '#57d35f',
      borderColor: 'rgba(76, 175, 80, 0.55)',
    };
  }
  if (status === 'Failed') {
    return {
      ...statusChipBase,
      bgcolor: 'rgba(244, 67, 54, 0.14)',
      color: '#ff5f57',
      borderColor: 'rgba(244, 67, 54, 0.55)',
    };
  }
  return {
    ...statusChipBase,
    bgcolor: 'rgba(255, 193, 7, 0.14)',
    color: '#ffc247',
    borderColor: 'rgba(255, 193, 7, 0.55)',
  };
}

export function UserDashboard() {
  const navigate = useNavigate();
  const { user, userLogout } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await userLogout();
    navigate('/');
  };
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await apiClient.get<ReportApiResponse[]>('/api/reports', { auth: true });
        const mapped: ReportSummary[] = data.map((report) => {
          const analysis = report.analysis || report.report_data;
          const errorMessage = analysis?.error;
          const status: ReportSummary['status'] = errorMessage
            ? 'Failed'
            : analysis
              ? 'Completed'
              : 'Pending';

          return {
            id: report.id,
            title: report.title || report.script_title || 'Untitled',
            createdAt: report.createdAt || report.created_at || '',
            reportType: (report.reportType || report.report_type || 'unknown').toUpperCase(),
            topTerritory:
              analysis?.locationRankings?.[0]?.name ||
              analysis?.locationRankings?.[0]?.country ||
              analysis?.executiveSummary?.recommendedTerritories?.[0] ||
              analysis?.topRecommendation ||
              'N/A',
            status,
            pdfUrl: report.pdfUrl || report.pdf_url || null,
          };
        });
        setReports(mapped);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000000' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#0a0a0a', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', py: { xs: 2, sm: 3 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 3 } }}>
              <Avatar sx={{ width: { xs: 44, sm: 64 }, height: { xs: 44, sm: 64 }, bgcolor: '#D4AF37', color: '#000', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {user?.email?.substring(0, 2).toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700, color: '#D4AF37', mb: 0.5, fontSize: { xs: '1.1rem', sm: '1.5rem', md: '2rem' } }}>Producer Dashboard</Typography>
                <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1, display: { xs: 'none', sm: 'block' } }}>{user?.email}</Typography>
                <Chip label={user?.plan?.toUpperCase() || 'FREE'} size="small" sx={{ bgcolor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37', fontWeight: 600 }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button startIcon={<Home />} onClick={() => navigate('/')} sx={{ color: '#a0a0a0', display: { xs: 'none', sm: 'flex' } }}>Back to Home</Button>
              <Button variant="contained" startIcon={<Movie />} onClick={() => navigate('/upload')} sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>New Analysis</Button>
              <Button
                startIcon={loggingOut ? <CircularProgress size={14} sx={{ color: '#a0a0a0' }} /> : <Logout />}
                onClick={handleLogout}
                disabled={loggingOut}
                sx={{ color: '#a0a0a0', display: { xs: 'none', sm: 'flex' }, '&:hover': { color: '#ffffff' } }}
              >
                Logout
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, mt: { xs: 2, sm: 4 } }}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}><BarChart sx={{ color: '#D4AF37' }} /><Typography variant="h6">Reports Generated</Typography></Box>
                <Typography variant="h3" sx={{ color: '#D4AF37', fontWeight: 700 }}>{reports.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}><CreditCard sx={{ color: '#D4AF37' }} /><Typography variant="h6">Credits Remaining</Typography></Box>
                <Typography variant="h3" sx={{ color: '#D4AF37', fontWeight: 700 }}>{user?.reportsLimit || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}><VisibilityIcon sx={{ color: '#D4AF37' }} /><Typography variant="h6">Active Projects</Typography></Box>
                <Typography variant="h3" sx={{ color: '#D4AF37', fontWeight: 700 }}>{reports.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ borderBottom: 1, borderColor: 'rgba(212, 175, 55, 0.2)' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTab-root': { color: '#a0a0a0', minWidth: { xs: 'auto', sm: 120 }, px: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } },
              '& .Mui-selected': { color: '#D4AF37 !important' },
              '& .MuiTabs-indicator': { bgcolor: '#D4AF37' },
              '& .MuiTabScrollButton-root': { color: '#a0a0a0' },
            }}
          >
            <Tab icon={<Download />} iconPosition="start" label="Reports" sx={{ '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'block' } } }} />
            <Tab icon={<Compare />} iconPosition="start" label="Territories" sx={{ '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'block' } } }} />
            <Tab icon={<Calculate />} iconPosition="start" label="What-If" sx={{ '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'block' } } }} />
            <Tab icon={<Timeline />} iconPosition="start" label="Timeline" sx={{ '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'block' } } }} />
            <Tab icon={<Settings />} iconPosition="start" label="Account" sx={{ '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'block' } } }} />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          {loading ? <LinearProgress sx={{ mt: 2, bgcolor: 'rgba(212, 175, 55, 0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#D4AF37' } }} /> : (
            <Paper sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)', mt: 2 }}>
              {reports.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 2 }}>No reports found. Start by uploading a script.</Typography>
                  <Button variant="outlined" onClick={() => navigate('/upload')}>Upload First Script</Button>
                </Box>
              ) : (
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 600 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap' }}>Project Title</TableCell>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>Type</TableCell>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap' }}>Date</TableCell>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>Top Territory</TableCell>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap' }}>Status</TableCell>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id} sx={{ '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' } }}>
                          <TableCell sx={{ color: '#fff', fontWeight: 600, maxWidth: { xs: 120, sm: 'none' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.title}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Chip
                              label={report.reportType}
                              size="small"
                              sx={neutralTableChipSx}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#a0a0a0', whiteSpace: 'nowrap' }}>{normalizeDate(report.createdAt)}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Chip
                              label={report.topTerritory}
                              size="small"
                              sx={neutralTableChipSx}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={report.status}
                              size="small"
                              sx={getStatusChipSx(report.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton size="small" sx={{ color: '#D4AF37' }} onClick={() => navigate(`/report/${report.id}`)}><Visibility fontSize="small" /></IconButton>
                              <IconButton
                                size="small"
                                sx={{ color: report.pdfUrl ? '#D4AF37' : '#666' }}
                                disabled={!report.pdfUrl || downloadingId === report.id}
                                onClick={async () => {
                                  if (!report.pdfUrl) return;
                                  setDownloadingId(report.id);
                                  try {
                                    await downloadReportPDF(report.id, report.title);
                                  } catch (error) {
                                    console.error('PDF download failed:', error);
                                  } finally {
                                    setDownloadingId(null);
                                  }
                                }}
                              >
                                {downloadingId === report.id ? (
                                  <CircularProgress size={18} sx={{ color: '#D4AF37' }} />
                                ) : (
                                  <FileDownload fontSize="small" />
                                )}
                              </IconButton>
                              <IconButton size="small" sx={{ color: '#666' }}><Delete fontSize="small" /></IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}><TerritoryComparison /></TabPanel>
        <TabPanel value={currentTab} index={2}><WhatIfCalculator /></TabPanel>
        <TabPanel value={currentTab} index={3}>
          <ProductionTimeline
            userPlan={(user?.plan as 'free' | 'professional' | 'studio') || 'free'}
            reports={reports.filter((r) => r.status === 'Completed').map((r) => ({ id: r.id, title: r.title }))}
          />
        </TabPanel>
        <TabPanel value={currentTab} index={4}>
          <Paper sx={{ p: 4, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)', mt: 2 }}>
            <Typography variant="h6" sx={{ color: '#D4AF37', mb: 3 }}>Account Settings</Typography>
            <Divider sx={{ mb: 3, borderColor: '#222' }} />
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="caption" sx={{ color: '#666' }}>Email Address</Typography>
                <Typography variant="body1" sx={{ color: '#fff' }}>{user?.email}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="caption" sx={{ color: '#666' }}>Active Subscription</Typography>
                <Typography variant="body1" sx={{ color: '#fff' }}>{user?.plan?.toUpperCase() || 'FREE'}</Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 4, borderColor: '#222' }} />
            <Box>
              <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1.5 }}>Session</Typography>
              <Button
                variant="outlined"
                startIcon={loggingOut ? <CircularProgress size={14} sx={{ color: '#f44336' }} /> : <Logout />}
                onClick={handleLogout}
                disabled={loggingOut}
                sx={{
                  borderColor: 'rgba(244, 67, 54, 0.4)',
                  color: '#f44336',
                  '&:hover': { borderColor: '#f44336', bgcolor: 'rgba(244, 67, 54, 0.08)' },
                  '&:disabled': { borderColor: '#333', color: '#666' },
                }}
              >
                {loggingOut ? 'Signing out…' : 'Sign Out'}
              </Button>
              <Typography variant="caption" sx={{ color: '#555', display: 'block', mt: 1 }}>
                This will revoke your session token immediately.
              </Typography>
            </Box>
          </Paper>
        </TabPanel>
      </Box>
    </Box>
  );
}
