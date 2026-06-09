import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Alert,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Grid,
} from '@mui/material';
import {
  ExpandMore,
  WbSunny,
  Groups,
  Business,
  CheckCircle,
  Warning as WarningIcon,
  WaterDrop,
  Thermostat,
  CalendarMonth,
} from '@mui/icons-material';

interface TerritoryDetailCardProps {
  territory: {
    id: string;
    name: string;
    country: string;
    baseRate: number;
    postProductionBonus: number;
    minSpend: number;
    currency: string;
    currencySymbol: string;
    qualifies: boolean;
    rebateAmount: number;
    totalRate: number;
    weather: {
      climate: string;
      avgTemp: string;
      bestMonths: string;
      rainRisk: 'Low' | 'Medium' | 'High';
    };
    crewAvailability: {
      overall: 'Excellent' | 'Good' | 'Moderate' | 'Limited';
      specialties: string[];
      unionStrength: 'Strong' | 'Moderate' | 'Weak';
    };
    infrastructure: {
      studios: string;
      equipment: 'Excellent' | 'Good' | 'Limited';
      transport: 'Excellent' | 'Good' | 'Moderate';
    };
    benefits: string[];
    considerations: string[];
  };
  isBestValue: boolean;
  formatCurrency: (amount: number, currency: string, symbol: string) => string;
  includePostProduction: boolean;
  budgetAfterRebate: (rebate: number) => number;
}

export function TerritoryDetailCard({
  territory,
  isBestValue,
  formatCurrency,
  includePostProduction,
  budgetAfterRebate,
}: TerritoryDetailCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getRainRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low':
        return '#4CAF50';
      case 'Medium':
        return '#ff9800';
      case 'High':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'Excellent':
        return '#4CAF50';
      case 'Good':
        return '#2196F3';
      case 'Moderate':
      case 'Limited':
        return '#ff9800';
      default:
        return '#666';
    }
  };

  return (
    <Paper
      sx={{
        p: 3,
        bgcolor: isBestValue ? 'rgba(212, 175, 55, 0.1)' : '#0f0f0f',
        border: isBestValue ? '2px solid #D4AF37' : '1px solid #333',
        position: 'relative',
      }}
    >
      {isBestValue && (
        <Chip
          label="BEST VALUE"
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: '#D4AF37',
            color: '#000000',
            fontWeight: 700,
          }}
        />
      )}

      <Typography variant="h6" sx={{ color: '#D4AF37', fontWeight: 700, mb: 0.5 }}>
        {territory.name}
      </Typography>
      <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 2 }}>
        {territory.country}
      </Typography>

      {territory.qualifies ? (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block' }}>
              Total Rebate
            </Typography>
            <Typography variant="h4" sx={{ color: '#4CAF50', fontWeight: 700 }}>
              {formatCurrency(territory.rebateAmount, territory.currency, territory.currencySymbol)}
            </Typography>
            <Typography variant="body2" sx={{ color: '#4CAF50' }}>
              ({(territory.totalRate * 100).toFixed(1)}% of budget)
            </Typography>
          </Box>

          <Divider sx={{ borderColor: '#333', my: 2 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                Base Rate:
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                {(territory.baseRate * 100)}%
              </Typography>
            </Box>

            {includePostProduction && territory.postProductionBonus > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                  Post Production Bonus:
                </Typography>
                <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 600 }}>
                  +{(territory.postProductionBonus * 100)}%
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                Net Production Cost:
              </Typography>
              <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                {formatCurrency(budgetAfterRebate(territory.rebateAmount), territory.currency, territory.currencySymbol)}
              </Typography>
            </Box>
          </Box>

          {/* Expandable Territory Details */}
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderTop: '1px solid #333',
                pt: 2,
                mt: 2,
              }}
              onClick={() => setExpanded(!expanded)}
            >
              <Typography variant="body2" sx={{ color: '#D4AF37', fontWeight: 600, mr: 1 }}>
                {expanded ? 'Hide' : 'View'} Territory Details
              </Typography>
              <IconButton
                size="small"
                sx={{
                  color: '#D4AF37',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.3s',
                }}
              >
                <ExpandMore />
              </IconButton>
            </Box>

            <Collapse in={expanded}>
              <Box sx={{ mt: 2 }}>
                {/* Weather Section */}
                <Paper sx={{ p: 2, bgcolor: '#0a0a0a', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <WbSunny sx={{ color: '#FFA726', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ color: '#FFA726', fontWeight: 700 }}>
                      Weather & Climate
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Thermostat sx={{ color: '#666', fontSize: 16 }} />
                        <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                          Climate:
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                        {territory.weather.climate}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Thermostat sx={{ color: '#666', fontSize: 16 }} />
                        <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                          Avg Temp:
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                        {territory.weather.avgTemp}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CalendarMonth sx={{ color: '#666', fontSize: 16 }} />
                        <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                          Best Months:
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                        {territory.weather.bestMonths}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <WaterDrop sx={{ color: '#666', fontSize: 16 }} />
                        <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                          Rain Risk:
                        </Typography>
                      </Box>
                      <Chip
                        label={territory.weather.rainRisk}
                        size="small"
                        sx={{
                          bgcolor: `${getRainRiskColor(territory.weather.rainRisk)}33`,
                          color: getRainRiskColor(territory.weather.rainRisk),
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>

                {/* Crew Availability Section */}
                <Paper sx={{ p: 2, bgcolor: '#0a0a0a', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Groups sx={{ color: '#2196F3', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ color: '#2196F3', fontWeight: 700 }}>
                      Crew Availability
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 1 }}>
                        Overall Availability:
                      </Typography>
                      <Chip
                        label={territory.crewAvailability.overall}
                        size="small"
                        sx={{
                          bgcolor: `${getQualityColor(territory.crewAvailability.overall)}33`,
                          color: getQualityColor(territory.crewAvailability.overall),
                          fontWeight: 600,
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 1 }}>
                        Union Strength:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                        {territory.crewAvailability.unionStrength}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 1 }}>
                        Key Specialties Available:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {territory.crewAvailability.specialties.map((specialty, idx) => (
                          <Chip
                            key={idx}
                            label={specialty}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(33, 150, 243, 0.2)',
                              color: '#2196F3',
                              fontSize: '0.75rem',
                            }}
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Infrastructure Section */}
                <Paper sx={{ p: 2, bgcolor: '#0a0a0a', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Business sx={{ color: '#9C27B0', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ color: '#9C27B0', fontWeight: 700 }}>
                      Infrastructure
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 1 }}>
                        Studios:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                        {territory.infrastructure.studios}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 1 }}>
                        Equipment:
                      </Typography>
                      <Chip
                        label={territory.infrastructure.equipment}
                        size="small"
                        sx={{
                          bgcolor: `${getQualityColor(territory.infrastructure.equipment)}33`,
                          color: getQualityColor(territory.infrastructure.equipment),
                          fontWeight: 600,
                        }}
                      />
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 1 }}>
                        Transport:
                      </Typography>
                      <Chip
                        label={territory.infrastructure.transport}
                        size="small"
                        sx={{
                          bgcolor: `${getQualityColor(territory.infrastructure.transport)}33`,
                          color: getQualityColor(territory.infrastructure.transport),
                          fontWeight: 600,
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>

                {/* Benefits */}
                {territory.benefits.length > 0 && (
                  <Paper sx={{ p: 2, bgcolor: '#0a0a0a', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#4CAF50', fontWeight: 700, mb: 1 }}>
                      Key Benefits
                    </Typography>
                    <List dense>
                      {territory.benefits.map((benefit, idx) => (
                        <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <CheckCircle sx={{ color: '#4CAF50', fontSize: 16 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                                {benefit}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                {/* Considerations */}
                {territory.considerations.length > 0 && (
                  <Paper sx={{ p: 2, bgcolor: '#0a0a0a' }}>
                    <Typography variant="subtitle2" sx={{ color: '#ff9800', fontWeight: 700, mb: 1 }}>
                      Considerations
                    </Typography>
                    <List dense>
                      {territory.considerations.map((consideration, idx) => (
                        <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <WarningIcon sx={{ color: '#ff9800', fontSize: 16 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                                {consideration}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Box>
            </Collapse>
          </Box>
        </>
      ) : (
        <Alert
          severity="warning"
          sx={{
            bgcolor: 'rgba(255, 152, 0, 0.1)',
            color: '#ff9800',
            border: '1px solid rgba(255, 152, 0, 0.3)',
          }}
        >
          <Typography variant="body2">
            Does not qualify. Minimum spend: {formatCurrency(territory.minSpend, territory.currency, territory.currencySymbol)}
          </Typography>
        </Alert>
      )}
    </Paper>
  );
}
