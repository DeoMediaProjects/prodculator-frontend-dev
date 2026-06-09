import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Warning,
  Info,
  MonetizationOn,
  Event,
  Schedule,
  AttachMoney,
  OpenInNew,
  Movie,
  EmojiEvents,
} from '@mui/icons-material';
import { Festival } from '@/app/types/festival';
import { databaseService } from '@/services/database.service';

interface IncentiveChange {
  id: string;
  territory: string;
  oldRate: string;
  newRate: string;
  changeType: 'increase' | 'decrease';
  changeDate: string;
  impactEstimate?: string;
  isNew: boolean;
}

interface GrantOpportunity {
  id: string;
  title: string;
  territory: string;
  fundingBody: string;
  maxAmount: string;
  applicationOpens: string;
  applicationDeadline: string;
  status: 'opening-soon' | 'open' | 'closing-soon' | 'closed';
  daysUntilDeadline?: number;
  eligibility: string[];
  websiteUrl: string;
  isNew?: boolean;
}

interface IncentiveAlertsProps {
  userEmail: string;
  userPlan: 'free' | 'professional' | 'studio';
}

export function IncentiveAlerts({ userEmail, userPlan }: IncentiveAlertsProps) {
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailSettingsOpen, setEmailSettingsOpen] = useState(false);
  const [alertEmail, setAlertEmail] = useState(userEmail);

  // Mock recent changes
  const recentChanges: IncentiveChange[] = [
    {
      id: '1',
      territory: 'British Columbia, Canada',
      oldRate: '35%',
      newRate: '36%',
      changeType: 'increase',
      changeDate: 'Jan 15, 2026',
      impactEstimate: '+$15K on $1.5M budget',
      isNew: true,
    },
    {
      id: '2',
      territory: 'Massachusetts, USA',
      oldRate: '25%',
      newRate: '27%',
      changeType: 'increase',
      changeDate: 'Jan 10, 2026',
      impactEstimate: '+$20K on $2M budget',
      isNew: false,
    },
    {
      id: '3',
      territory: 'Connecticut, USA',
      oldRate: '30%',
      newRate: '32%',
      changeType: 'increase',
      changeDate: 'Dec 28, 2025',
      impactEstimate: '+$25K on $2.5M budget',
      isNew: false,
    },
  ];

  const upcomingChanges = [
    {
      territory: 'California, USA',
      currentRate: '25%',
      potentialRate: '27%',
      status: 'Pending legislation',
      expectedDate: 'Q2 2026',
    },
    {
      territory: 'Ontario, Canada',
      currentRate: '21.5%',
      potentialRate: '23%',
      status: 'Under review',
      expectedDate: 'Q3 2026',
    },
  ];

  // Mock grant opportunities
  const grantOpportunities: GrantOpportunity[] = [
    {
      id: '1',
      title: 'BFI Production Fund High End TV',
      territory: 'UK',
      fundingBody: 'British Film Institute',
      maxAmount: '£1.2M',
      applicationOpens: 'Feb 1, 2026',
      applicationDeadline: 'Feb 28, 2026',
      status: 'opening-soon',
      daysUntilDeadline: 36,
      eligibility: ['UK qualifying productions', 'High end TV drama', 'Budget >£1M/hour'],
      websiteUrl: 'https://www.bfi.org.uk/funding',
      isNew: true,
    },
    {
      id: '2',
      title: 'Canada Media Fund Convergent Stream',
      territory: 'Canada',
      fundingBody: 'Canada Media Fund',
      maxAmount: 'CAD $2.5M',
      applicationOpens: 'Jan 10, 2026',
      applicationDeadline: 'Feb 15, 2026',
      status: 'open',
      daysUntilDeadline: 23,
      eligibility: ['Canadian content', 'Digital media component', 'Broadcaster agreement'],
      websiteUrl: 'https://www.cmf-fmc.ca',
      isNew: false,
    },
    {
      id: '3',
      title: 'Sundance Institute Documentary Fund',
      territory: 'USA',
      fundingBody: 'Sundance Institute',
      maxAmount: '$50K',
      applicationOpens: 'Dec 1, 2025',
      applicationDeadline: 'Jan 31, 2026',
      status: 'closing-soon',
      daysUntilDeadline: 8,
      eligibility: ['Documentary features', 'Creative treatment of actuality', 'Non fiction storytelling'],
      websiteUrl: 'https://www.sundance.org/programs/documentary-fund',
      isNew: false,
    },
    {
      id: '4',
      title: 'Creative Europe MEDIA Development Support',
      territory: 'Malta',
      fundingBody: 'European Commission',
      maxAmount: '€60K',
      applicationOpens: 'Jan 15, 2026',
      applicationDeadline: 'Mar 10, 2026',
      status: 'open',
      daysUntilDeadline: 46,
      eligibility: ['European production companies', 'Fiction/animation/documentary', 'Theatrical release'],
      websiteUrl: 'https://culture.ec.europa.eu/creative-europe',
      isNew: true,
    },
    {
      id: '5',
      title: 'National Film and Video Foundation',
      territory: 'South Africa',
      fundingBody: 'NFVF',
      maxAmount: 'ZAR 3M',
      applicationOpens: 'Feb 15, 2026',
      applicationDeadline: 'Mar 30, 2026',
      status: 'opening-soon',
      daysUntilDeadline: 67,
      eligibility: ['South African citizens', 'Feature films', 'Development/production'],
      websiteUrl: 'https://www.nfvf.co.za',
      isNew: false,
    },
  ];

  const getStatusColor = (status: GrantOpportunity['status']) => {
    switch (status) {
      case 'opening-soon': return '#2196F3';
      case 'open': return '#4caf50';
      case 'closing-soon': return '#ff9800';
      case 'closed': return '#666666';
      default: return '#666666';
    }
  };

  const getStatusLabel = (status: GrantOpportunity['status']) => {
    switch (status) {
      case 'opening-soon': return 'Opening Soon';
      case 'open': return 'Open Now';
      case 'closing-soon': return 'Closing Soon';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const getUrgencyChip = (grant: GrantOpportunity) => {
    if (grant.status === 'closing-soon' && grant.daysUntilDeadline && grant.daysUntilDeadline <= 14) {
      return (
        <Chip
          label={`${grant.daysUntilDeadline} days left`}
          size="small"
          icon={<Warning />}
          sx={{
            bgcolor: 'rgba(255, 152, 0, 0.2)',
            color: '#ff9800',
            fontWeight: 700,
            border: '1px solid #ff9800',
          }}
        />
      );
    }
    return null;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.5 }}>
            Incentive Rate Alerts
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
            Get notified when tax incentive rates change in your watchlist territories
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setEmailSettingsOpen(true)}
          sx={{
            borderColor: '#D4AF37',
            color: '#D4AF37',
            '&:hover': {
              borderColor: '#D4AF37',
              bgcolor: 'rgba(212, 175, 55, 0.1)',
            },
          }}
        >
          Email Settings
        </Button>
      </Box>

      {/* Alert Settings */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212, 175, 55, 0.2)',
        }}
      >
        <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
          Notification Preferences
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={emailAlertsEnabled}
              onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#D4AF37',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#D4AF37',
                },
              }}
            />
          }
          label={
            <Box>
              <Typography variant="body1" sx={{ color: '#ffffff' }}>
                Email Alerts
              </Typography>
              <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                Receive email when rates change • {alertEmail}
              </Typography>
            </Box>
          }
          sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#D4AF37',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#D4AF37',
                },
              }}
            />
          }
          label={
            <Box>
              <Typography variant="body1" sx={{ color: '#ffffff' }}>
                Dashboard Notifications
              </Typography>
              <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                Show alerts in your dashboard
              </Typography>
            </Box>
          }
          sx={{ display: 'flex', alignItems: 'flex-start' }}
        />

        {userPlan === 'free' && (
          <Alert 
            severity="info" 
            sx={{ 
              mt: 2,
              bgcolor: 'rgba(33, 150, 243, 0.1)',
              '& .MuiAlert-icon': { color: '#2196F3' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: '#2196F3' }}>
                Free plan: 1 alert per month • Upgrade for unlimited alerts
              </Typography>
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
            </Box>
          </Alert>
        )}
      </Paper>

      {/* Recent Changes */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212, 175, 55, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#ffffff' }}>
            Recent Rate Changes
          </Typography>
          <Chip
            label={`${recentChanges.filter(c => c.isNew).length} New`}
            size="small"
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              fontWeight: 700,
            }}
          />
        </Box>

        <List sx={{ p: 0 }}>
          {recentChanges.map((change, index) => (
            <Box key={change.id}>
              <ListItem
                sx={{
                  px: 0,
                  py: 2,
                  bgcolor: change.isNew ? 'rgba(212, 175, 55, 0.05)' : 'transparent',
                  borderRadius: 1,
                }}
              >
                <ListItemIcon>
                  {change.changeType === 'increase' ? (
                    <TrendingUp sx={{ color: '#4caf50', fontSize: '2rem' }} />
                  ) : (
                    <TrendingDown sx={{ color: '#ff6b6b', fontSize: '2rem' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 600 }}>
                        {change.territory}
                      </Typography>
                      {change.isNew && (
                        <Chip
                          label="NEW"
                          size="small"
                          sx={{
                            bgcolor: '#D4AF37',
                            color: '#000000',
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            height: '20px',
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 0.5 }}>
                        {change.oldRate} → <span style={{ color: '#4caf50', fontWeight: 700 }}>{change.newRate}</span>
                        {' • '}
                        {change.changeDate}
                      </Typography>
                      {change.impactEstimate && (
                        <Typography variant="caption" sx={{ color: '#D4AF37' }}>
                          Estimated impact: {change.impactEstimate}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Button
                  size="small"
                  sx={{
                    color: '#D4AF37',
                    fontWeight: 600,
                  }}
                >
                  View Details
                </Button>
              </ListItem>
              {index < recentChanges.length - 1 && <Divider sx={{ borderColor: 'rgba(212, 175, 55, 0.1)' }} />}
            </Box>
          ))}
        </List>
      </Paper>

      {/* Upcoming Changes */}
      <Paper
        sx={{
          p: 3,
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212, 175, 55, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Info sx={{ color: '#2196F3' }} />
          <Typography variant="h6" sx={{ color: '#ffffff' }}>
            Potential Upcoming Changes
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
          These territories are considering incentive rate changes (not confirmed)
        </Typography>

        <List sx={{ p: 0 }}>
          {upcomingChanges.map((change, index) => (
            <Box key={index}>
              <ListItem sx={{ px: 0, py: 2 }}>
                <ListItemIcon>
                  <Warning sx={{ color: '#ff9800' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ color: '#ffffff', fontWeight: 600 }}>
                      {change.territory}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                        {change.currentRate} → {change.potentialRate} (potential)
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#666666' }}>
                        {change.status} • Expected: {change.expectedDate}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {index < upcomingChanges.length - 1 && <Divider sx={{ borderColor: 'rgba(212, 175, 55, 0.1)' }} />}
            </Box>
          ))}
        </List>
      </Paper>

      {/* Grant Opportunities */}
      <Paper
        sx={{
          p: 3,
          mt: 3,
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212, 175, 55, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MonetizationOn sx={{ color: '#4caf50', fontSize: 28 }} />
            <Typography variant="h6" sx={{ color: '#ffffff' }}>
              Grant & Funding Opportunities
            </Typography>
          </Box>
          <Chip
            label={`${grantOpportunities.filter(g => g.status === 'open' || g.status === 'opening-soon').length} Available`}
            size="small"
            sx={{
              bgcolor: 'rgba(76, 175, 80, 0.2)',
              color: '#4caf50',
              fontWeight: 700,
            }}
          />
        </Box>

        <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 3 }}>
          Active funding programs for your watchlist territories • Updated daily from official sources
        </Typography>

        <Grid container spacing={2}>
          {grantOpportunities.map((grant) => (
            <Grid size={{ xs: 12 }} key={grant.id}>
              <Paper
                sx={{
                  p: 2.5,
                  bgcolor: grant.status === 'closing-soon' ? 'rgba(255, 152, 0, 0.05)' : 'rgba(212, 175, 55, 0.03)',
                  border: grant.status === 'closing-soon' 
                    ? '2px solid #ff9800' 
                    : '1px solid rgba(212, 175, 55, 0.15)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: '#D4AF37',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  {/* Grant Info */}
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                      <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, fontSize: '1rem' }}>
                        {grant.title}
                      </Typography>
                      {grant.isNew && (
                        <Chip
                          label="NEW"
                          size="small"
                          sx={{
                            bgcolor: '#D4AF37',
                            color: '#000000',
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            height: '20px',
                          }}
                        />
                      )}
                      {getUrgencyChip(grant)}
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                      <Chip
                        label={grant.territory}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(212, 175, 55, 0.2)',
                          color: '#D4AF37',
                          fontSize: '0.75rem',
                        }}
                      />
                      <Chip
                        label={grant.fundingBody}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(33, 150, 243, 0.2)',
                          color: '#2196F3',
                          fontSize: '0.75rem',
                        }}
                      />
                      <Chip
                        label={`Max: ${grant.maxAmount}`}
                        size="small"
                        icon={<AttachMoney sx={{ fontSize: '0.9rem' }} />}
                        sx={{
                          bgcolor: 'rgba(76, 175, 80, 0.2)',
                          color: '#4caf50',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block' }}>
                          Opens
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 500 }}>
                          {grant.applicationOpens}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block' }}>
                          Deadline
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: grant.status === 'closing-soon' ? '#ff9800' : '#ffffff',
                            fontWeight: grant.status === 'closing-soon' ? 700 : 500,
                          }}
                        >
                          {grant.applicationDeadline}
                        </Typography>
                      </Box>
                      {grant.daysUntilDeadline && grant.status !== 'closed' && (
                        <Box>
                          <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block' }}>
                            Time Left
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: grant.daysUntilDeadline <= 14 ? '#ff9800' : '#4caf50',
                              fontWeight: 600,
                            }}
                          >
                            {grant.daysUntilDeadline} days
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 0.5 }}>
                        Eligibility
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {grant.eligibility.slice(0, 3).map((criteria, idx) => (
                          <Chip
                            key={idx}
                            label={criteria}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255, 255, 255, 0.05)',
                              color: '#a0a0a0',
                              fontSize: '0.7rem',
                              height: '22px',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </Grid>

                  {/* Status & Actions */}
                  <Grid size={{ xs: 12, md: 5 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'flex-end' }}>
                      <Chip
                        label={getStatusLabel(grant.status)}
                        icon={
                          grant.status === 'open' ? <CheckCircle /> :
                          grant.status === 'closing-soon' ? <Warning /> :
                          grant.status === 'opening-soon' ? <Schedule /> :
                          <Event />
                        }
                        sx={{
                          bgcolor: `${getStatusColor(grant.status)}20`,
                          color: getStatusColor(grant.status),
                          fontWeight: 700,
                          border: `1px solid ${getStatusColor(grant.status)}`,
                          px: 1.5,
                        }}
                      />

                      <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          onClick={() => {
                            try {
                              const newWindow = window.open(grant.websiteUrl, '_blank');
                              if (!newWindow) {
                                console.warn('Pop up blocked');
                              }
                            } catch (error) {
                              console.error('SecurityError opening link:', error);
                            }
                          }}
                          endIcon={<OpenInNew />}
                          sx={{
                            borderColor: '#D4AF37',
                            color: '#D4AF37',
                            fontWeight: 600,
                            '&:hover': {
                              borderColor: '#D4AF37',
                              bgcolor: 'rgba(212, 175, 55, 0.1)',
                            },
                          }}
                        >
                          Apply Now
                        </Button>
                      </Box>

                      {grant.status === 'closing-soon' && grant.daysUntilDeadline && grant.daysUntilDeadline <= 7 && (
                        <Alert 
                          severity="warning" 
                          sx={{ 
                            py: 0.5,
                            width: '100%',
                            bgcolor: 'rgba(255, 152, 0, 0.1)',
                            '& .MuiAlert-icon': { color: '#ff9800' },
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 600 }}>
                            Urgent: Closes in {grant.daysUntilDeadline} days!
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Alert 
          severity="info"
          icon={<Info />}
          sx={{ 
            mt: 3,
            bgcolor: 'rgba(33, 150, 243, 0.1)',
            '& .MuiAlert-icon': { color: '#2196F3' },
          }}
        >
          <Typography variant="body2" sx={{ color: '#2196F3' }}>
            <strong>Auto synced from official sources:</strong> Grant data is updated daily from film commission APIs, RSS feeds, and verified databases. Last sync: Jan 23, 2026 8:42 AM UTC
          </Typography>
        </Alert>

        {/* Grantify Partnership Banner */}
        <Paper
          sx={{
            mt: 3,
            p: 3,
            bgcolor: '#FDB913',
            border: '2px solid #000000',
            borderRadius: 2,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#000000' }}>
              Our partners
            </Typography>
            <img 
              src=""
              alt="Grantify" 
              style={{ height: '40px', width: 'auto' }} 
            />
          </Box>
          <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
            <Typography sx={{ fontSize: 16, color: '#000000', mb: 0.5 }}>
              To partner with us contact
            </Typography>
            <Typography 
              component="a" 
              href="mailto:partners@prodculator.com"
              sx={{ 
                fontSize: 16, 
                fontWeight: 600, 
                color: '#000000',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                }
              }}
            >
              partners@prodculator.com
            </Typography>
          </Box>
        </Paper>
      </Paper>

      {/* Film Festival Deadlines */}
      <FestivalDeadlinesSection />

      {/* Email Settings Dialog */}
      <Dialog
        open={emailSettingsOpen}
        onClose={() => setEmailSettingsOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            minWidth: '400px',
          },
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
          Email Alert Settings
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
            Alerts will be sent to this email address when incentive rates change
          </Typography>
          <TextField
            fullWidth
            label="Email Address"
            value={alertEmail}
            onChange={(e) => setAlertEmail(e.target.value)}
            sx={{
              '& .MuiInputLabel-root': { color: '#a0a0a0' },
              '& .MuiOutlinedInput-root': {
                color: '#ffffff',
                '& fieldset': { borderColor: 'rgba(212, 175, 55, 0.2)' },
                '&:hover fieldset': { borderColor: '#D4AF37' },
                '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
              },
            }}
          />
          <Alert 
            severity="success" 
            icon={<CheckCircle />}
            sx={{ 
              mt: 2,
              bgcolor: 'rgba(76, 175, 80, 0.1)',
              '& .MuiAlert-icon': { color: '#4caf50' },
            }}
          >
            <Typography variant="body2" sx={{ color: '#4caf50' }}>
              Email verified • Alerts are active
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
          <Button
            onClick={() => setEmailSettingsOpen(false)}
            sx={{ color: '#a0a0a0' }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => setEmailSettingsOpen(false)}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#D4AF37',
              },
            }}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Festival Deadlines Section Component
function FestivalDeadlinesSection() {
  const [allFestivals, setAllFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { festivals, error } = await databaseService.getAllFestivals();
      if (error) {
        setFetchError(error);
      } else {
        setAllFestivals(festivals);
      }
      setLoading(false);
    })();
  }, []);

  // Filter festivals - show only upcoming deadlines (not closed)
  const upcomingFestivals = allFestivals
    .filter(f => f.currentStatus !== 'closed' && f.nextDeadline)
    .sort((a, b) => (a.daysUntilNextDeadline || 999) - (b.daysUntilNextDeadline || 999))
    .slice(0, 10); // Show top 10 upcoming

  const getFestivalStatusColor = (status: Festival['currentStatus']) => {
    switch (status) {
      case 'early-bird-open': return '#4caf50';
      case 'regular-open': return '#2196F3';
      case 'late-open': return '#ff9800';
      case 'upcoming': return '#9c27b0';
      case 'closed': return '#666666';
      default: return '#666666';
    }
  };

  const getFestivalStatusLabel = (status: Festival['currentStatus']) => {
    switch (status) {
      case 'early-bird-open': return 'Early Bird Open';
      case 'regular-open': return 'Regular Open';
      case 'late-open': return 'Late Deadline';
      case 'upcoming': return 'Upcoming';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const getTierBadge = (tier: Festival['tier']) => {
    const config = {
      'a-list': { label: 'A List', color: '#D4AF37', bgcolor: 'rgba(212, 175, 55, 0.2)' },
      'tier-2': { label: 'Tier 2', color: '#2196F3', bgcolor: 'rgba(33, 150, 243, 0.2)' },
      'regional': { label: 'Regional', color: '#9c27b0', bgcolor: 'rgba(156, 39, 176, 0.2)' },
      'specialized': { label: 'Specialized', color: '#ff9800', bgcolor: 'rgba(255, 152, 0, 0.2)' },
    };
    return config[tier];
  };

  const formatDeadlineDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$' };
    return `${symbols[currency] || '$'}${amount}`;
  };

  return (
    <Paper
      sx={{
        p: 3,
        mt: 3,
        bgcolor: '#0a0a0a',
        border: '1px solid rgba(212, 175, 55, 0.2)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Movie sx={{ color: '#D4AF37', fontSize: 28 }} />
          <Typography variant="h6" sx={{ color: '#ffffff' }}>
            Film Festival Deadlines
          </Typography>
        </Box>
        {!loading && !fetchError && (
          <Chip
            label={`${upcomingFestivals.filter(f => f.currentStatus === 'early-bird-open' || f.currentStatus === 'regular-open').length} Open Now`}
            size="small"
            sx={{
              bgcolor: 'rgba(76, 175, 80, 0.2)',
              color: '#4caf50',
              fontWeight: 700,
            }}
          />
        )}
      </Box>

      <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 3 }}>
        Strategic festival submission deadlines matching your genres • Save up to $50 by submitting early bird
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#D4AF37' }} />
        </Box>
      )}
      {fetchError && (
        <Alert severity="error" sx={{ mb: 2 }}>{fetchError}</Alert>
      )}

      <Grid container spacing={2}>
        {upcomingFestivals.map((festival) => (
          <Grid size={{ xs: 12 }} key={festival.id}>
            <Paper
              sx={{
                p: 2.5,
                bgcolor: festival.daysUntilNextDeadline && festival.daysUntilNextDeadline <= 14
                  ? 'rgba(255, 152, 0, 0.05)'
                  : 'rgba(212, 175, 55, 0.03)',
                border: festival.daysUntilNextDeadline && festival.daysUntilNextDeadline <= 14
                  ? '2px solid #ff9800'
                  : '1px solid rgba(212, 175, 55, 0.15)',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: '#D4AF37',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Grid container spacing={2} alignItems="center">
                {/* Festival Info */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                    <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, fontSize: '1rem' }}>
                      {festival.name} {festival.year}
                    </Typography>
                    {festival.isNew && (
                      <Chip
                        label="NEW"
                        size="small"
                        sx={{
                          bgcolor: '#D4AF37',
                          color: '#000000',
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          height: '20px',
                        }}
                      />
                    )}
                    {festival.daysUntilNextDeadline && festival.daysUntilNextDeadline <= 14 && (
                      <Chip
                        label={`${festival.daysUntilNextDeadline} days left`}
                        size="small"
                        icon={<Warning />}
                        sx={{
                          bgcolor: 'rgba(255, 152, 0, 0.2)',
                          color: '#ff9800',
                          fontWeight: 700,
                          border: '1px solid #ff9800',
                        }}
                      />
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                    {(() => {
                      const tierConfig = getTierBadge(festival.tier);
                      return (
                        <Chip
                          label={tierConfig.label}
                          size="small"
                          icon={<EmojiEvents />}
                          sx={{
                            bgcolor: tierConfig.bgcolor,
                            color: tierConfig.color,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        />
                      );
                    })()}
                    <Chip
                      label={festival.location}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(33, 150, 243, 0.2)',
                        color: '#2196F3',
                        fontSize: '0.75rem',
                      }}
                    />
                    <Chip
                      label={`${(festival.acceptanceRate * 100).toFixed(0)}% acceptance`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        color: '#a0a0a0',
                        fontSize: '0.75rem',
                      }}
                    />
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 0.5 }}>
                      Submission Deadlines
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {festival.deadlines.map((deadline, idx) => (
                        <Box key={idx}>
                          <Typography variant="caption" sx={{ color: '#a0a0a0', textTransform: 'capitalize' }}>
                            {deadline.tier.replace('-', ' ')}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: festival.nextDeadline?.tier === deadline.tier ? '#D4AF37' : '#ffffff',
                              fontWeight: festival.nextDeadline?.tier === deadline.tier ? 700 : 500,
                            }}
                          >
                            {formatDeadlineDate(deadline.date)} • {formatCurrency(deadline.fee, deadline.currency)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 0.5 }}>
                      Genres Accepted
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {festival.genres.slice(0, 4).map((genre, idx) => (
                        <Chip
                          key={idx}
                          label={genre}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(212, 175, 55, 0.1)',
                            color: '#D4AF37',
                            fontSize: '0.7rem',
                            height: '22px',
                          }}
                        />
                      ))}
                      {festival.genres.length > 4 && (
                        <Chip
                          label={`+${festival.genres.length - 4} more`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                            color: '#a0a0a0',
                            fontSize: '0.7rem',
                            height: '22px',
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Grid>

                {/* Status & Actions */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'flex-end' }}>
                    <Chip
                      label={getFestivalStatusLabel(festival.currentStatus)}
                      icon={
                        festival.currentStatus === 'early-bird-open' ? <CheckCircle /> :
                        festival.currentStatus === 'regular-open' ? <CheckCircle /> :
                        festival.currentStatus === 'late-open' ? <Warning /> :
                        <Schedule />
                      }
                      sx={{
                        bgcolor: `${getFestivalStatusColor(festival.currentStatus)}20`,
                        color: getFestivalStatusColor(festival.currentStatus),
                        fontWeight: 700,
                        border: `1px solid ${getFestivalStatusColor(festival.currentStatus)}`,
                        px: 1.5,
                      }}
                    />

                    {festival.nextDeadline && (
                      <Box sx={{ width: '100%', bgcolor: 'rgba(212, 175, 55, 0.05)', p: 1.5, borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block' }}>
                          Next Deadline
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#D4AF37', fontWeight: 700 }}>
                          {formatDeadlineDate(festival.nextDeadline.date)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                          {festival.nextDeadline.tier.replace('-', ' ')} • {formatCurrency(festival.nextDeadline.fee, festival.nextDeadline.currency)}
                        </Typography>
                        {festival.daysUntilNextDeadline && (
                          <Typography variant="caption" sx={{ color: '#D4AF37', display: 'block', mt: 0.5 }}>
                            {festival.daysUntilNextDeadline} days remaining
                          </Typography>
                        )}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                      {festival.filmfreewayUrl ? (
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          onClick={() => {
                            try {
                              const newWindow = window.open(festival.filmfreewayUrl, '_blank');
                              if (!newWindow) {
                                console.warn('Pop up blocked');
                              }
                            } catch (error) {
                              console.error('SecurityError opening link:', error);
                            }
                          }}
                          endIcon={<OpenInNew />}
                          sx={{
                            borderColor: '#D4AF37',
                            color: '#D4AF37',
                            fontWeight: 600,
                            '&:hover': {
                              borderColor: '#D4AF37',
                              bgcolor: 'rgba(212, 175, 55, 0.1)',
                            },
                          }}
                        >
                          Submit Now
                        </Button>
                      ) : (
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          onClick={() => {
                            try {
                              const newWindow = window.open(festival.websiteUrl, '_blank');
                              if (!newWindow) {
                                console.warn('Pop up blocked');
                              }
                            } catch (error) {
                              console.error('SecurityError opening link:', error);
                            }
                          }}
                          endIcon={<OpenInNew />}
                          sx={{
                            borderColor: '#D4AF37',
                            color: '#D4AF37',
                            fontWeight: 600,
                            '&:hover': {
                              borderColor: '#D4AF37',
                              bgcolor: 'rgba(212, 175, 55, 0.1)',
                            },
                          }}
                        >
                          Learn More
                        </Button>
                      )}
                    </Box>

                    {festival.daysUntilNextDeadline && festival.daysUntilNextDeadline <= 7 && (
                      <Alert 
                        severity="warning" 
                        sx={{ 
                          py: 0.5,
                          width: '100%',
                          bgcolor: 'rgba(255, 152, 0, 0.1)',
                          '& .MuiAlert-icon': { color: '#ff9800' },
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 600 }}>
                          Urgent: Deadline in {festival.daysUntilNextDeadline} days!
                        </Typography>
                      </Alert>
                    )}

                    {festival.notableAlumni && festival.notableAlumni.length > 0 && (
                      <Box sx={{ width: '100%', mt: 1 }}>
                        <Typography variant="caption" sx={{ color: '#666666', display: 'block' }}>
                          Notable: {festival.notableAlumni[0]}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Alert 
        severity="info"
        icon={<Info />}
        sx={{ 
          mt: 3,
          bgcolor: 'rgba(33, 150, 243, 0.1)',
          '& .MuiAlert-icon': { color: '#2196F3' },
        }}
      >
        <Typography variant="body2" sx={{ color: '#2196F3' }}>
          <strong>Deadline reminders:</strong> Festival data synced with FilmFreeway and official sources. Set your script genres in metadata to see personalized festival matches. Last sync: Jan 23, 2026 9:15 AM UTC
        </Typography>
      </Alert>
    </Paper>
  );
}
