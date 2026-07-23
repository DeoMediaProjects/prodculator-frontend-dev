import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Paper,
  List,
  ListItem,
  Divider,
  Grid,
} from '@mui/material';
import { ArrowBack, Public } from '@mui/icons-material';
import { apiClient } from '@/services/api';
import { renderNarrative } from './ReportViewer';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';

interface SharedReport {
  id: string;
  title: string;
  createdAt: string;
  analysis: any;
}

export function SharedReportViewer() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setError('Invalid share link.');
      setLoading(false);
      return;
    }

    apiClient
      .get<SharedReport>(`/api/reports/shared/${shareToken}`)
      .then((data) => setReport(data))
      .catch(() => setError('This share link is invalid or has been removed.'))
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) {
    return (
      <Box sx={{ bgcolor: '#000', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#D4AF37', mb: 2 }} />
          <Typography sx={{ color: '#a0a0a0' }}>Loading shared report…</Typography>
        </Box>
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box sx={{ bgcolor: '#000', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ color: '#fff', mb: 2 }}>{error || 'Report not found'}</Typography>
          <Button variant="outlined" onClick={() => navigate('/')} startIcon={<ArrowBack />}>
            Back to Prodculator
          </Button>
        </Container>
      </Box>
    );
  }

  const analysis = report.analysis;
  const locationRankings: any[] = analysis?.locationRankings || [];
  const incentiveEstimates: any[] = analysis?.incentiveEstimates || [];
  const executiveSummary = analysis?.executiveSummary;

  return (
    <Box sx={{ bgcolor: '#000', minHeight: '100dvh', pb: 8 }}>
      {/* Shared report banner + header — stacked as one sticky unit */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: (theme) => theme.zIndex.appBar }}>
        <Box sx={{ bgcolor: 'rgba(212,175,55,0.08)', borderBottom: '1px solid rgba(212,175,55,0.25)', py: 1, px: 2 }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Public sx={{ fontSize: 16, color: '#D4AF37' }} />
              <Typography variant="caption" sx={{ color: '#D4AF37', fontWeight: 600 }}>Shared Report powered by</Typography>
              <img src={exampleLogo} alt="Prodculator" style={{ height: '16px' }} />
              <Chip label="View only" size="small" sx={{ ml: 'auto', bgcolor: 'rgba(212,175,55,0.15)', color: '#D4AF37', fontSize: '0.65rem', height: 20 }} />
            </Box>
          </Container>
        </Box>

        {/* Report header */}
        <Box sx={{ bgcolor: 'rgba(255,255,255,0.98)', borderBottom: '1px solid rgba(0,0,0,0.1)', py: 2 }}>
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#000' }}>{report.title}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.6)' }}>
                  Production Intelligence Report • {new Date(report.createdAt).toLocaleDateString()}
                </Typography>
              </Box>
              <Button size="small" startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ color: '#000' }}>
                prodculator.com
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ pt: 4 }}>
        {/* Headline Net Budget */}
        {executiveSummary?.headlineNetBudget && (
          <Paper sx={{ p: 3, mb: 4, bgcolor: '#0d1a0d', border: '2px solid #4caf50', borderRadius: 2 }}>
            <Typography variant="overline" sx={{ color: '#4caf50', letterSpacing: 2 }}>Net Effective Budget After Incentives</Typography>
            <Typography variant="h3" sx={{ color: '#4caf50', fontWeight: 800 }}>{executiveSummary.headlineNetBudget}</Typography>
          </Paper>
        )}

        {/* Executive Summary */}
        {executiveSummary?.keyInsights && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ color: '#D4AF37', fontWeight: 700, mb: 2 }}>Executive Summary</Typography>
            <Paper sx={{ p: 3, bgcolor: '#0a0a0a', border: '1px solid #222' }}>
              {String(executiveSummary.keyInsights)
                .split(/\n\n+/)
                .map((p) => p.trim())
                .filter(Boolean)
                .map((paragraph, i, arr) => (
                  <Typography key={i} sx={{ color: '#a0a0a0', mb: i < arr.length - 1 ? 2 : 0 }}>
                    {renderNarrative(paragraph)}
                  </Typography>
                ))}
            </Paper>
          </Box>
        )}

        {/* Territory Rankings */}
        {locationRankings.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ color: '#D4AF37', fontWeight: 700, mb: 2 }}>Territory Rankings</Typography>
            {locationRankings.slice(0, 5).map((loc: any, i: number) => (
              <Paper key={i} sx={{ p: 3, mb: 2, bgcolor: '#0a0a0a', border: '1px solid #222' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" sx={{ color: '#D4AF37' }}>{i + 1}. {loc.name}, {loc.country}</Typography>
                    {loc.bankabilityLabel && (
                      <Chip
                        label={loc.bankabilityLabel}
                        size="small"
                        sx={{
                          mt: 0.5,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          ...(loc.bankabilityLabel === 'BANKABLE'
                            ? { bgcolor: 'rgba(76,175,80,0.2)', color: '#4caf50', border: '1px solid #4caf50' }
                            : { bgcolor: 'rgba(255,152,0,0.2)', color: '#ff9800', border: '1px solid #ff9800' }),
                        }}
                      />
                    )}
                  </Box>
                  <Chip label={`${loc.score}/100`} sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 700, fontSize: '1rem' }} />
                </Box>
                <Divider sx={{ my: 1.5, borderColor: '#222' }} />
                <List dense sx={{ p: 0 }}>
                  {(loc.reasoning || []).slice(0, 3).map((r: string, ri: number) => (
                    <ListItem key={ri} sx={{ color: '#a0a0a0', py: 0.25 }}>• {r}</ListItem>
                  ))}
                </List>
              </Paper>
            ))}
          </Box>
        )}

        {/* Incentive Estimates */}
        {incentiveEstimates.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ color: '#D4AF37', fontWeight: 700, mb: 2 }}>Tax Incentive Estimates</Typography>
            <Grid container spacing={2}>
              {incentiveEstimates.slice(0, 6).map((inc: any, i: number) => (
                <Grid size={{ xs: 12, md: 6 }} key={i}>
                  <Paper sx={{ p: 3, bgcolor: '#0a0a0a', border: '1px solid #222', height: '100%' }}>
                    <Typography variant="h6" sx={{ color: '#D4AF37', mb: 0.5 }}>{inc.territory}</Typography>
                    <Typography variant="body2" sx={{ color: '#666', mb: 1.5 }}>{inc.program}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Rate:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>{inc.rate}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Est. Rebate:</Typography>
                      <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700 }}>{inc.estimatedRebate}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* CTA */}
        <Paper sx={{ p: 4, bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.3)', textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#D4AF37', mb: 1 }}>Get your own production intelligence report</Typography>
          <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 3 }}>
            Upload your script and receive a full territory analysis, tax incentives, festival and distributor strategy, and funding opportunities.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/pricing')}
            sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 700, px: 4 }}
          >
            Start Free →
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
