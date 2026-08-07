import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  Videocam,
  People,
  TheaterComedy,
  GroupWork,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { ProductionIntelligenceManager } from '@/app/data/ProductionIntelligenceManager';
import { adminApi } from '@/services/admin.api';
import type { ProductionSignal } from '@/services/admin.types';
import { fetchTerritoryList } from '@/services/territory.service';
import { AdminAccessDenied } from './AdminAccessDenied';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function toIsoDateString(value: Date): string {
  return value.toISOString().split('T')[0];
}

export function ProductionIntelligence() {
  const { hasAdminPermission } = useAuth();

  if (!hasAdminPermission('canViewPlatformEconomics')) {
    return (
      <AdminAccessDenied
        requiredPermission="View Platform Economics"
        requiredRole="Master Admin or Senior Admin"
      />
    );
  }

  return <ProductionIntelligenceContent />;
}

function ProductionIntelligenceContent() {
  const [activeTab, setActiveTab] = useState(0);
  const [territory, setTerritory] = useState<string>('all');
  const [availableTerritories, setAvailableTerritories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return toIsoDateString(date);
  });
  const [endDate, setEndDate] = useState<string>(() => toIsoDateString(new Date()));
  const [signals, setSignals] = useState<ProductionSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [territoriesError, setTerritoriesError] = useState<string | null>(null);
  const didFetchTerritories = useRef(false);
  const territoryFilter = territory === 'all' ? undefined : territory;
  const hasDateError = Boolean(startDate && endDate && startDate > endDate);

  const fetchSignals = useCallback(async (abortSignal?: AbortSignal) => {
    setLoading(true);
    setFetchError(null);

    const { data, error } = await adminApi.getProductionSignals(
      territoryFilter,
      startDate || undefined,
      endDate || undefined,
      abortSignal,
    );

    if (abortSignal?.aborted) return;

    if (error) {
      setFetchError(error);
      setSignals([]);
    } else {
      setSignals(data?.items ?? []);
    }
    setLoading(false);
  }, [territoryFilter, startDate, endDate]);

  useEffect(() => {
    if (didFetchTerritories.current) return;
    didFetchTerritories.current = true;

    (async () => {
      const { data, error } = await fetchTerritoryList();
      if (error) {
        setTerritoriesError(error);
        return;
      }

      const labels = Array.from(
        new Set(
          (data?.territories ?? [])
            .map((item) => item.label)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b));
      setAvailableTerritories(labels);
    })();
  }, []);

  useEffect(() => {
    if (hasDateError) {
      setFetchError('Start date must be on or before end date.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void fetchSignals(controller.signal);
    return () => controller.abort();
  }, [fetchSignals, hasDateError]);

  const territoryOptions = useMemo(() => {
    if (territory === 'all' || availableTerritories.includes(territory)) {
      return availableTerritories;
    }
    return [...availableTerritories, territory].sort((a, b) => a.localeCompare(b));
  }, [availableTerritories, territory]);

  const manager = useMemo(() => {
    const nextManager = new ProductionIntelligenceManager();
    nextManager.setSignals(signals);
    return nextManager;
  }, [signals]);

  const summaryStats = manager.getSummaryStats();
  const cameraEquipmentTrends = manager.getCameraEquipmentTrends(territoryFilter, startDate, endDate);
  const crewSizeTrends = manager.getCrewSizeTrends(territoryFilter, startDate, endDate);
  const castDemandTrends = manager.getCastDemandTrends(territoryFilter, startDate, endDate);
  const scaleDistribution = manager.getProductionScaleDistribution(territoryFilter);
  const territoryForecasts = manager.getTerritoryDemandForecasts('Q2 2026');

  return (
    <Box sx={{ bgcolor: 'primary.contrastText', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Camera equipment, crew size, cast demand, and extras trend analytics
          </Typography>
          <Chip
            label={`Data from ${summaryStats.totalSignals} script submissions`}
            size="small"
            sx={{
              mt: 1,
              bgcolor: 'rgba(212, 175, 55, 0.2)',
              color: 'primary.main',
            }}
          />
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'text.secondary' }}>Territory</InputLabel>
                <Select
                  value={territory}
                  label="Territory"
                  onChange={(e) => setTerritory(e.target.value)}
                  sx={{
                    color: 'text.primary',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'divider',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <MenuItem value="all">All Territories</MenuItem>
                  {territoryOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {territoriesError && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Territory list unavailable: {territoriesError}
          </Alert>
        )}

        {fetchError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {fetchError}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <CircularProgress size={20} sx={{ color: 'primary.main' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Loading production signals, ...
            </Typography>
          </Box>
        )}

        {/* Summary Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Videocam sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Camera Data
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
                  {summaryStats.cameraDataCompleteness.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={summaryStats.cameraDataCompleteness}
                  sx={{
                    bgcolor: 'rgba(212, 175, 55, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'primary.main',
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <People sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Crew Data
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
                  {summaryStats.crewDataCompleteness.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={summaryStats.crewDataCompleteness}
                  sx={{
                    bgcolor: 'rgba(212, 175, 55, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'primary.main',
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TheaterComedy sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Cast Data
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
                  {summaryStats.castDataCompleteness.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={summaryStats.castDataCompleteness}
                  sx={{
                    bgcolor: 'rgba(212, 175, 55, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'primary.main',
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <GroupWork sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Extras Data
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
                  {summaryStats.extrasDataCompleteness.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={summaryStats.extrasDataCompleteness}
                  sx={{
                    bgcolor: 'rgba(212, 175, 55, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'primary.main',
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabbed Content */}
        <Paper sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
              '& .MuiTab-root': {
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              },
              '& .MuiTabs-indicator': {
                bgcolor: 'primary.main',
              },
            }}
          >
            <Tab label="Camera Equipment" />
            <Tab label="Crew Size" />
            <Tab label="Cast Demand" />
            <Tab label="Production Scale" />
            <Tab label="Territory Forecasts" />
          </Tabs>

          {/* Camera Equipment Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
                Camera Equipment Demand Trends
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Equipment</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Demand Count</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>% of Total</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Top Territories</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cameraEquipmentTrends.map((trend) => (
                      <TableRow key={trend.equipment}>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {trend.displayName}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {trend.demandCount}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {trend.percentageOfTotal.toFixed(1)}%
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {trend.topTerritories.map(t => t.territory).join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* Crew Size Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
                Crew Size Distribution Trends
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Crew Size</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Production Count</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>% of Total</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Visual</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {crewSizeTrends.map((trend) => (
                      <TableRow key={trend.sizeRange}>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {trend.displayName}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {trend.count}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {trend.percentageOfTotal.toFixed(1)}%
                        </TableCell>
                        <TableCell sx={{ borderColor: 'divider' }}>
                          <LinearProgress
                            variant="determinate"
                            value={trend.percentageOfTotal}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: 'rgba(212, 175, 55, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: 'primary.main',
                              },
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* Cast Demand Tab */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
                Cast Demand Analytics
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Category</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Production Count</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>% of Total</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Top Territories</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {castDemandTrends.map((trend, index) => (
                      <TableRow key={`${trend.category}-${index}`}>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {trend.displayName}
                            <Chip
                              label={trend.category}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(212, 175, 55, 0.2)',
                                color: 'primary.main',
                                textTransform: 'capitalize',
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {trend.count}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {trend.percentageOfTotal.toFixed(1)}%
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {trend.territories.map(t => t.territory).join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* Production Scale Tab */}
          <TabPanel value={activeTab} index={3}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
                Production Scale Distribution
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Budget Range</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Count</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Avg Crew</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Avg Cast</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Avg Extras</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Territories</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scaleDistribution.map((dist) => (
                      <TableRow key={dist.budgetRange}>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          <Chip
                            label={dist.budgetRange}
                            sx={{
                              bgcolor: 'rgba(212, 175, 55, 0.2)',
                              color: 'primary.main',
                              textTransform: 'capitalize',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {dist.count}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {dist.avgCrewSize}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {dist.avgCastSize}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {dist.avgExtras}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {dist.territories.join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>

          {/* Territory Forecasts Tab */}
          <TabPanel value={activeTab} index={4}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
                Territory Demand Forecasts (Q2 2026)
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Territory</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Projected Productions</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Avg Crew Size</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Avg Cast Size</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Avg Extras</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Total Headcount</TableCell>
                      <TableCell sx={{ color: 'text.secondary', borderColor: 'divider' }}>Top Cameras</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {territoryForecasts.map((forecast) => (
                      <TableRow key={forecast.territory}>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          <Chip
                            label={forecast.territory}
                            sx={{
                              bgcolor: 'rgba(212, 175, 55, 0.2)',
                              color: 'primary.main',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {forecast.totalProductions}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {forecast.avgCrewSize}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {forecast.avgCastSize}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {forecast.avgExtras}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider' }}>
                          {forecast.totalHeadcount}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', borderColor: 'divider', fontSize: '0.875rem' }}>
                          {forecast.topCameras.slice(0, 2).join(', ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </TabPanel>
        </Paper>

        {/* Data Source Footer */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(212, 175, 55, 0.05)', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            <strong>Data Source:</strong> Aggregated from anonymized script upload metadata. 
            All data is indicative and based on historical industry patterns. 
            Last updated: {summaryStats.lastUpdated}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
