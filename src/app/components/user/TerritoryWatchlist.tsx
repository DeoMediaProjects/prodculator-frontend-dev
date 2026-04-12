import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Delete,
  Add,
  TrendingUp,
  Info,
  Notifications,
  NotificationsActive,
} from '@mui/icons-material';

interface Territory {
  id: string;
  country: string;
  state?: string;
  displayName: string;
  taxCredit: string;
  lastUpdated: string;
  hasRecentChange?: boolean;
  changeDetails?: string;
  flag: string;
}

interface TerritoryWatchlistProps {
  userPlan: 'free' | 'professional' | 'studio';
}

export function TerritoryWatchlist({ userPlan }: TerritoryWatchlistProps) {
  const [watchlist, setWatchlist] = useState<Territory[]>([
    {
      id: '1',
      country: 'Canada',
      state: 'British Columbia',
      displayName: 'British Columbia, Canada',
      taxCredit: '36%',
      lastUpdated: 'Jan 15, 2026',
      hasRecentChange: true,
      changeDetails: 'Rate increased from 35% to 36%',
      flag: '🇨🇦',
    },
    {
      id: '2',
      country: 'UK',
      state: 'England',
      displayName: 'UK (England)',
      taxCredit: '25%',
      lastUpdated: 'Jan 10, 2026',
      flag: '🇬���',
    },
    {
      id: '3',
      country: 'USA',
      state: 'Georgia',
      displayName: 'Georgia, USA',
      taxCredit: '30%',
      lastUpdated: 'Jan 20, 2026',
      flag: '🇺🇸',
    },
  ]);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [alertsEnabled, setAlertsEnabled] = useState<{ [key: string]: boolean }>({
    '1': true,
    '2': true,
    '3': false,
  });

  const maxSlots = userPlan === 'free' ? 3 : userPlan === 'professional' ? 10 : 999;

  const availableTerritories = [
    { country: 'USA', states: ['California', 'New York', 'Georgia', 'Louisiana', 'New Mexico', 'Texas', 'North Carolina', 'Massachusetts', 'Pennsylvania', 'Illinois', 'Florida', 'Connecticut'] },
    { country: 'Canada', states: ['British Columbia', 'Ontario', 'Quebec'] },
    { country: 'UK', states: ['England', 'Scotland', 'Wales'] },
    { country: 'Malta', states: [] },
    { country: 'South Africa', states: [] },
  ];

  const handleRemoveTerritory = (id: string) => {
    setWatchlist(watchlist.filter(t => t.id !== id));
  };

  const handleAddTerritory = () => {
    // In real implementation, this would fetch actual data
    const newTerritory: Territory = {
      id: Date.now().toString(),
      country: selectedCountry,
      state: selectedState,
      displayName: selectedState ? `${selectedState}, ${selectedCountry}` : selectedCountry,
      taxCredit: '25%', // Would be fetched from database
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      flag: selectedCountry === 'USA' ? '🇺🇸' : selectedCountry === 'Canada' ? '🇨🇦' : selectedCountry === 'UK' ? '🇬🇧' : selectedCountry === 'Malta' ? '🇲🇹' : '🇿🇦',
    };

    setWatchlist([...watchlist, newTerritory]);
    setAddDialogOpen(false);
    setSelectedCountry('');
    setSelectedState('');
  };

  const toggleAlert = (id: string) => {
    setAlertsEnabled({ ...alertsEnabled, [id]: !alertsEnabled[id] });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.5 }}>
            Territory Watchlist
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
            Track tax incentive changes in territories you're considering
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAddDialogOpen(true)}
          disabled={watchlist.length >= maxSlots}
          sx={{
            bgcolor: '#D4AF37',
            color: '#000000',
            fontWeight: 600,
            '&:hover': {
              bgcolor: '#D4AF37',
            },
            '&:disabled': {
              bgcolor: 'rgba(212, 175, 55, 0.3)',
              color: 'rgba(0, 0, 0, 0.5)',
            },
          }}
        >
          Add Territory
        </Button>
      </Box>

      {/* Watchlist Limit Info */}
      <Alert 
        severity="info" 
        sx={{ 
          mb: 3,
          bgcolor: 'rgba(33, 150, 243, 0.1)',
          color: '#2196F3',
          '& .MuiAlert-icon': { color: '#2196F3' },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2">
            You're using <strong>{watchlist.length} of {maxSlots}</strong> watchlist slots
            {userPlan === 'free' && ' (upgrade to Professional for 10 slots)'}
          </Typography>
          {userPlan === 'free' && (
            <Button 
              size="small" 
              sx={{ 
                color: '#D4AF37',
                fontWeight: 600,
                ml: 2,
              }}
              onClick={() => window.location.href = '/pricing'}
            >
              Upgrade
            </Button>
          )}
        </Box>
      </Alert>

      {/* Watchlist Grid */}
      <Grid container spacing={2}>
        {watchlist.map((territory) => (
          <Grid size={{ xs: 12 }} key={territory.id}>
            <Card
              sx={{
                bgcolor: '#0a0a0a',
                border: territory.hasRecentChange 
                  ? '2px solid #D4AF37' 
                  : '1px solid rgba(212, 175, 55, 0.2)',
                position: 'relative',
                overflow: 'visible',
              }}
            >
              {territory.hasRecentChange && (
                <Chip
                  label="RATE CHANGED"
                  size="small"
                  icon={<TrendingUp />}
                  sx={{
                    position: 'absolute',
                    top: -12,
                    right: 16,
                    bgcolor: '#D4AF37',
                    color: '#000000',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                  }}
                />
              )}
              
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  {/* Territory Info */}
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h4" sx={{ fontSize: '2rem' }}>
                        {territory.flag}
                      </Typography>
                      <Box>
                        <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
                          {territory.displayName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                          Last updated: {territory.lastUpdated}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {/* Tax Credit */}
                  <Grid size={{ xs: 6, sm: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block' }}>
                        Tax Credit
                      </Typography>
                      <Typography variant="h5" sx={{ color: '#D4AF37', fontWeight: 700 }}>
                        {territory.taxCredit}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* Change Alert */}
                  <Grid size={{ xs: 6, sm: 3 }}>
                    {territory.hasRecentChange ? (
                      <Alert 
                        severity="warning" 
                        sx={{ 
                          py: 0.5,
                          bgcolor: 'rgba(212, 175, 55, 0.15)',
                          '& .MuiAlert-icon': { color: '#D4AF37' },
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#D4AF37', fontWeight: 600 }}>
                          {territory.changeDetails}
                        </Typography>
                      </Alert>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                        No recent changes
                      </Typography>
                    )}
                  </Grid>

                  {/* Actions */}
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Tooltip title={alertsEnabled[territory.id] ? 'Alerts enabled' : 'Enable alerts'}>
                        <IconButton
                          size="small"
                          onClick={() => toggleAlert(territory.id)}
                          sx={{
                            color: alertsEnabled[territory.id] ? '#D4AF37' : '#666666',
                            '&:hover': {
                              bgcolor: 'rgba(212, 175, 55, 0.1)',
                            },
                          }}
                        >
                          {alertsEnabled[territory.id] ? <NotificationsActive /> : <Notifications />}
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="View full details">
                        <IconButton
                          size="small"
                          sx={{
                            color: '#D4AF37',
                            '&:hover': {
                              bgcolor: 'rgba(212, 175, 55, 0.1)',
                            },
                          }}
                        >
                          <Info />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Remove from watchlist">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveTerritory(territory.id)}
                          sx={{
                            color: '#ff6b6b',
                            '&:hover': {
                              bgcolor: 'rgba(255, 107, 107, 0.1)',
                            },
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {watchlist.length === 0 && (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: '#0a0a0a',
            border: '1px dashed rgba(212, 175, 55, 0.3)',
          }}
        >
          <Typography variant="h6" sx={{ color: '#a0a0a0', mb: 1 }}>
            No territories in your watchlist
          </Typography>
          <Typography variant="body2" sx={{ color: '#666666', mb: 3 }}>
            Add territories to track tax incentive changes and stay informed
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setAddDialogOpen(true)}
            sx={{
              borderColor: '#D4AF37',
              color: '#D4AF37',
              '&:hover': {
                borderColor: '#D4AF37',
                bgcolor: 'rgba(212, 175, 55, 0.1)',
              },
            }}
          >
            Add Your First Territory
          </Button>
        </Paper>
      )}

      {/* Add Territory Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            minWidth: '400px',
          },
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
          Add Territory to Watchlist
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#a0a0a0' }}>Country</InputLabel>
            <Select
              value={selectedCountry}
              label="Country"
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedState('');
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    bgcolor: '#1a1a1a',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    '& .MuiMenuItem-root': {
                      color: '#ffffff',
                      '&:hover': {
                        bgcolor: 'rgba(212, 175, 55, 0.1)',
                      },
                      '&.Mui-selected': {
                        bgcolor: 'rgba(212, 175, 55, 0.2)',
                        '&:hover': {
                          bgcolor: 'rgba(212, 175, 55, 0.3)',
                        },
                      },
                    },
                  },
                },
              }}
              sx={{
                color: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(212, 175, 55, 0.2)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#D4AF37',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#D4AF37',
                },
              }}
            >
              {availableTerritories.map((t) => (
                <MenuItem key={t.country} value={t.country}>{t.country}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedCountry && availableTerritories.find(t => t.country === selectedCountry)?.states.length! > 0 && (
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#a0a0a0' }}>State / Province</InputLabel>
              <Select
                value={selectedState}
                label="State / Province"
                onChange={(e) => setSelectedState(e.target.value)}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: '#1a1a1a',
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      '& .MuiMenuItem-root': {
                        color: '#ffffff',
                        '&:hover': {
                          bgcolor: 'rgba(212, 175, 55, 0.1)',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'rgba(212, 175, 55, 0.2)',
                          '&:hover': {
                            bgcolor: 'rgba(212, 175, 55, 0.3)',
                          },
                        },
                      },
                    },
                  },
                }}
                sx={{
                  color: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(212, 175, 55, 0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#D4AF37',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#D4AF37',
                  },
                }}
              >
                {availableTerritories
                  .find(t => t.country === selectedCountry)
                  ?.states.map((state) => (
                    <MenuItem key={state} value={state}>{state}</MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
          <Button
            onClick={() => setAddDialogOpen(false)}
            sx={{ color: '#a0a0a0' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddTerritory}
            disabled={!selectedCountry || (availableTerritories.find(t => t.country === selectedCountry)?.states.length! > 0 && !selectedState)}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#D4AF37',
              },
              '&:disabled': {
                bgcolor: 'rgba(212, 175, 55, 0.3)',
                color: 'rgba(0, 0, 0, 0.5)',
              },
            }}
          >
            Add to Watchlist
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}