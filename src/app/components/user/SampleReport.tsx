import { useNavigate } from 'react-router';
import { useState, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Alert,
  Paper,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack,
  CloudUpload,
  CheckCircle,
  Warning,
  LocationOn,
  Info,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';
import { sampleReportData } from '@/app/data/sample-report-data';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';

export function SampleReport() {
  const navigate = useNavigate();
  const data = sampleReportData;
  const [currentPage, setCurrentPage] = useState(0);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  // Calculate total pages
  const totalPages = 5 + data.territoryRankings.length; // Cover + Contents + Exec Summary + Location Strategy + Financial + Territory pages

  const scrollToTop = () => {
    if (reportContainerRef.current) {
      reportContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
      scrollToTop();
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      scrollToTop();
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    scrollToTop();
  };

  // Render different pages
  const renderPage = () => {
    // Page 0: Cover Page
    if (currentPage === 0) {
      return (
        <Box
          sx={{
            minHeight: '800px',
            bgcolor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 8,
            position: 'relative',
            border: '1px solid rgba(0,0,0,0.1)'
          }}
        >
          <Box sx={{ textAlign: 'center', maxWidth: '800px' }}>
            <img 
              src={exampleLogo} 
              alt="Prodculator" 
              style={{ height: '48px', width: 'auto', marginBottom: '80px' }}
            />
            
            <Box sx={{ mb: 8 }}>
              <Typography 
                variant="h2" 
                sx={{ 
                  color: '#D4AF37', 
                  fontWeight: 700, 
                  mb: 2,
                  letterSpacing: '0.05em',
                  fontSize: { xs: '2rem', md: '3rem' }
                }}
              >
                SCRIPTELIGENCE REPORT
              </Typography>
              <Box sx={{ height: '2px', bgcolor: '#D4AF37', width: '200px', mx: 'auto', mb: 6 }} />
            </Box>

            <Typography 
              variant="h3" 
              sx={{ 
                color: '#000', 
                fontWeight: 600, 
                mb: 4,
                fontSize: { xs: '1.75rem', md: '2.5rem' }
              }}
            >
              {data.metadata.scriptTitle}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 6 }}>
              <Chip 
                label={data.metadata.format} 
                sx={{ 
                  bgcolor: 'rgba(212, 175, 55, 0.15)', 
                  color: '#D4AF37', 
                  border: '1px solid #D4AF37',
                  fontWeight: 600
                }} 
              />
              {data.metadata.genres.map(genre => (
                <Chip 
                  key={genre} 
                  label={genre} 
                  sx={{ 
                    bgcolor: 'rgba(0, 0, 0, 0.05)', 
                    color: '#000', 
                    border: '1px solid rgba(0, 0, 0, 0.2)'
                  }} 
                />
              ))}
            </Box>

            <Box sx={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(0, 0, 0, 0.5)' }}>
                Generated: {data.metadata.generatedDate}
              </Typography>
            </Box>
          </Box>
        </Box>
      );
    }

    // Page 1: Contents
    if (currentPage === 1) {
      return (
        <Box sx={{ minHeight: '800px', bgcolor: '#fff', p: 8 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 6, color: '#000' }}>
            CONTENTS
          </Typography>
          
          <List sx={{ maxWidth: '600px' }}>
            <ListItem 
              component="button"
              onClick={() => goToPage(2)}
              sx={{ 
                py: 2, 
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' }
              }}
            >
              <ListItemText 
                primary="Executive Summary" 
                secondary="Key findings and recommendations"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
              <Typography sx={{ color: '#D4AF37', fontWeight: 700 }}>01</Typography>
            </ListItem>

            <ListItem 
              component="button"
              onClick={() => goToPage(3)}
              sx={{ 
                py: 2, 
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' }
              }}
            >
              <ListItemText 
                primary="Production Location Strategy" 
                secondary="Territory rankings and analysis"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
              <Typography sx={{ color: '#D4AF37', fontWeight: 700 }}>02</Typography>
            </ListItem>

            <ListItem 
              component="button"
              onClick={() => goToPage(4)}
              sx={{ 
                py: 2, 
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' }
              }}
            >
              <ListItemText 
                primary="Financial Breakdown" 
                secondary="Budget scenarios and ROI analysis"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
              <Typography sx={{ color: '#D4AF37', fontWeight: 700 }}>03</Typography>
            </ListItem>

            {data.territoryRankings.slice(0, 3).map((territory, index) => (
              <ListItem 
                key={territory.territory}
                component="button"
                onClick={() => goToPage(5 + index)}
                sx={{ 
                  py: 2, 
                  borderBottom: '1px solid rgba(0,0,0,0.1)',
                  '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' }
                }}
              >
                <ListItemText 
                  primary={`${territory.territory} Territory Analysis`}
                  secondary={`Detailed breakdown Rank #${territory.rank}`}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                <Typography sx={{ color: '#D4AF37', fontWeight: 700 }}>
                  {String(4 + index).padStart(2, '0')}
                </Typography>
              </ListItem>
            ))}

            <ListItem 
              component="button"
              onClick={() => goToPage(8)}
              sx={{ 
                py: 2, 
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' }
              }}
            >
              <ListItemText 
                primary="Grant & Funding Opportunities" 
                secondary="Available funding sources"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
              <Typography sx={{ color: '#D4AF37', fontWeight: 700 }}>07</Typography>
            </ListItem>

            <ListItem 
              component="button"
              onClick={() => goToPage(9)}
              sx={{ 
                py: 2,
                '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' }
              }}
            >
              <ListItemText 
                primary="Regional Film Festivals" 
                secondary="Strategic festival recommendations"
                primaryTypographyProps={{ fontWeight: 600 }}
              />
              <Typography sx={{ color: '#D4AF37', fontWeight: 700 }}>08</Typography>
            </ListItem>
          </List>
        </Box>
      );
    }

    // Page 2: Executive Summary
    if (currentPage === 2) {
      const topTerritory = data.territoryRankings[0];
      return (
        <Box sx={{ minHeight: '800px', bgcolor: '#fff', p: 8 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              <strong>Disclaimer:</strong> All estimates, recommendations, and data in this report are for informational purposes only and should not be considered legally binding advice. Actual costs, rebates, timelines, and incentives may vary. Please consult with legal and financial professionals before making production decisions.
            </Typography>
          </Alert>

          <Typography variant="overline" sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.9rem' }}>
            Executive Summary
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#000' }}>
            Key Findings & Recommendations
          </Typography>
          <Divider sx={{ mb: 4, borderColor: '#D4AF37', borderWidth: 2 }} />

          <Typography variant="h6" sx={{ fontStyle: 'italic', color: '#666', mb: 6, lineHeight: 1.6 }}>
            "{data.summary.logline}"
          </Typography>

          <Paper 
            sx={{ 
              p: 4, 
              mb: 4, 
              bgcolor: 'rgba(212, 175, 55, 0.08)', 
              border: '2px solid #D4AF37',
              boxShadow: 'none'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box 
                sx={{ 
                  width: 8, 
                  height: 60, 
                  bgcolor: '#D4AF37',
                  borderRadius: 1
                }} 
              />
              <Box>
                <Typography variant="overline" sx={{ color: '#666', fontSize: '0.75rem' }}>
                  RECOMMENDED TERRITORY
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#000' }}>
                  {topTerritory.territory}, {topTerritory.country}
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Overall Score
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37' }}>
                  {topTerritory.score}
                  <Typography component="span" variant="h6" sx={{ color: '#999' }}>/100</Typography>
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Tax Rebate
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                  {topTerritory.rebatePercentage}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  {topTerritory.estimatedRebate}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Infrastructure
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#000' }}>
                  {topTerritory.infrastructureScore}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Payment Speed
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#000' }}>
                  {topTerritory.paymentSpeed}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#000' }}>
            Key Insights
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: '#444', lineHeight: 1.8 }}>
            {data.recommendations.rationale}
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.1)', bgcolor: '#fff' }}>
                <CardContent>
                  <Typography variant="overline" sx={{ color: '#666', fontWeight: 700 }}>
                    Production Overview
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ color: '#666' }}>Estimated Shoot Days:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#000' }}>{data.summary.estimatedShootDays} days</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ color: '#666' }}>Estimated Budget:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#000' }}>{data.summary.estimatedBudget}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#666' }}>Budget Range:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#000' }}>{data.metadata.budgetRange}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid rgba(0,0,0,0.1)', bgcolor: '#fff' }}>
                <CardContent>
                  <Typography variant="overline" sx={{ color: '#666', fontWeight: 700 }}>
                    Primary Locations
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  {data.summary.primaryLocations.map((loc, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocationOn sx={{ fontSize: 18, color: '#D4AF37' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#000' }}>{loc}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      );
    }

    // Page 3: Production Location Strategy
    if (currentPage === 3) {
      return (
        <Box sx={{ minHeight: '800px', bgcolor: '#fff', p: 8 }}>
          <Typography variant="overline" sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.9rem' }}>
            Production Location Strategy
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#000' }}>
            Territory Rankings & Analysis
          </Typography>
          <Divider sx={{ mb: 4, borderColor: '#D4AF37', borderWidth: 2 }} />

          <Typography variant="body1" sx={{ mb: 4, color: '#444', lineHeight: 1.8 }}>
            Based on comprehensive analysis of tax incentives, infrastructure, crew availability, and cultural fit,
            we have ranked {data.territoryRankings.length} territories for your production.
          </Typography>

          {data.territoryRankings.slice(0, 5).map((territory, index) => (
            <Card 
              key={territory.territory}
              sx={{ 
                mb: 3,
                boxShadow: 'none',
                border: index === 0 ? '2px solid #D4AF37' : '1px solid rgba(0,0,0,0.1)',
                bgcolor: index === 0 ? 'rgba(212, 175, 55, 0.03)' : 'transparent',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 700,
                          color: index === 0 ? '#D4AF37' : '#000'
                        }}
                      >
                        #{territory.rank}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#000' }}>
                        {territory.territory}
                      </Typography>
                      {index === 0 && (
                        <Chip 
                          label="RECOMMENDED" 
                          size="small"
                          sx={{ 
                            bgcolor: '#D4AF37', 
                            color: '#000', 
                            fontWeight: 700,
                            fontSize: '0.7rem'
                          }} 
                        />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      {territory.country}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37' }}>
                      {territory.score}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Overall Score
                    </Typography>
                  </Box>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      Tax Rebate
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50' }}>
                      {territory.rebatePercentage}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      {territory.estimatedRebate}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      Cultural Test
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {territory.culturalTestLikelihood}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      Infrastructure
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {territory.infrastructureScore}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      Payment Speed
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {territory.paymentSpeed}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}

          <Alert severity="info" sx={{ mt: 4 }}>
            <Typography variant="body2">
              <strong>Alternative Strategy:</strong> {data.recommendations.alternateStrategy}
            </Typography>
          </Alert>
        </Box>
      );
    }

    // Page 4: Financial Breakdown
    if (currentPage === 4) {
      return (
        <Box sx={{ minHeight: '800px', bgcolor: '#fff', p: 8 }}>
          <Typography variant="overline" sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.9rem' }}>
            Financial Analysis
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#000' }}>
            Budget Scenarios & ROI Comparison
          </Typography>
          <Divider sx={{ mb: 4, borderColor: '#D4AF37', borderWidth: 2 }} />

          <Paper sx={{ p: 3, mb: 4, bgcolor: 'rgba(0,0,0,0.02)', boxShadow: 'none' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#000', mb: 1 }}>
              Total Production Budget: {data.financialBreakdown.totalBudget}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              The following scenarios show net budget after rebates for top territories
            </Typography>
          </Paper>

          {data.financialBreakdown.scenarios.map((scenario, index) => (
            <Card 
              key={scenario.territory}
              sx={{ 
                mb: 3,
                boxShadow: 'none',
                border: index === 0 ? '2px solid #D4AF37' : '1px solid rgba(0,0,0,0.1)',
                bgcolor: index === 0 ? 'rgba(212, 175, 55, 0.03)' : 'transparent',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#000' }}>
                    {scenario.territory}
                  </Typography>
                  <Chip 
                    label={`${scenario.roi} ROI`}
                    sx={{ 
                      bgcolor: index === 0 ? '#D4AF37' : 'rgba(76, 175, 80, 0.1)', 
                      color: index === 0 ? '#000' : '#4caf50',
                      fontWeight: 700,
                      fontSize: '0.9rem'
                    }}
                  />
                </Box>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      Local Spend
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {scenario.localSpend}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      Rebate Rate
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50' }}>
                      {scenario.rebateRate}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      Gross Rebate
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50' }}>
                      {scenario.grossRebate}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      Net Budget
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#D4AF37' }}>
                      {scenario.netBudget}
                    </Typography>
                  </Grid>
                </Grid>

                {scenario.notes && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="caption">{scenario.notes}</Typography>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}

        </Box>
      );
    }

    // Pages 5-7: Individual Territory Details (Top 3)
    if (currentPage >= 5 && currentPage <= 7) {
      const territoryIndex = currentPage - 5;
      const territory = data.territoryRankings[territoryIndex];
      
      return (
        <Box sx={{ minHeight: '800px', bgcolor: '#fff', p: 8 }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="overline" sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.9rem' }}>
              Territory Analysis #{territory.rank}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#000', mb: 2 }}>
              {territory.territory}
            </Typography>
            <Typography variant="h6" sx={{ color: '#666' }}>
              {territory.country}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: '#D4AF37', borderWidth: 2, mb: 4 }} />

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(212, 175, 55, 0.08)', border: '2px solid #D4AF37' }}>
                <Typography variant="caption" sx={{ color: '#D4AF37', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Overall Score
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#D4AF37', mt: 1 }}>
                  {territory.score}
                  <Typography component="span" variant="h6" sx={{ color: '#999' }}>/100</Typography>
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(76, 175, 80, 0.08)', border: '2px solid #4caf50', boxShadow: 'none' }}>
                <Typography variant="caption" sx={{ color: '#4caf50', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Tax Rebate
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#4caf50', mt: 1 }}>
                  {territory.rebatePercentage}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  {territory.estimatedRebate}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: 'none' }}>
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Infrastructure
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#000', mt: 1 }}>
                  {territory.infrastructureScore}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: 'none' }}>
                <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  Payment Speed
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#000', mt: 1 }}>
                  {territory.paymentSpeed}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 4, bgcolor: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.3)', height: '100%', boxShadow: 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <CheckCircle sx={{ color: '#4caf50', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50' }}>
                    Key Advantages
                  </Typography>
                </Box>
                <List>
                  {territory.keyAdvantages.map((adv, i) => (
                    <ListItem key={i} sx={{ py: 1, px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle sx={{ fontSize: 18, color: '#4caf50' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={adv} 
                        primaryTypographyProps={{ 
                          variant: 'body2', 
                          color: '#000',
                          fontWeight: 500
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 4, bgcolor: 'rgba(255, 152, 0, 0.05)', border: '1px solid rgba(255, 152, 0, 0.3)', height: '100%', boxShadow: 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Warning sx={{ color: '#ff9800', fontSize: 24 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#ff9800' }}>
                    Key Risks
                  </Typography>
                </Box>
                <List>
                  {territory.keyRisks.map((risk, i) => (
                    <ListItem key={i} sx={{ py: 1, px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Warning sx={{ fontSize: 18, color: '#ff9800' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={risk} 
                        primaryTypographyProps={{ 
                          variant: 'body2', 
                          color: '#000',
                          fontWeight: 500
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 4, mt: 4, bgcolor: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: 'none' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#000', mb: 2 }}>
              Additional Details
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 6, md: 4 }}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Cultural Test Likelihood
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#000' }}>
                  {territory.culturalTestLikelihood}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Admin Complexity
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#000' }}>
                  {territory.adminComplexity}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, md: 4 }}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Estimated Rebate
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: '#4caf50' }}>
                  {territory.estimatedRebate}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
    }

    // Page 8: Grants & Funding
    if (currentPage === 8) {
      return (
        <Box sx={{ minHeight: '800px', bgcolor: '#fff', p: 8 }}>
          <Typography variant="overline" sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.9rem' }}>
            Funding Opportunities
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#000' }}>
            Grant & Funding Opportunities
          </Typography>
          <Divider sx={{ mb: 4, borderColor: '#D4AF37', borderWidth: 2 }} />

          <Typography variant="body1" sx={{ mb: 4, color: '#444', lineHeight: 1.8 }}>
            Based on your production's profile, here are relevant funding opportunities across top territories:
          </Typography>

          {data.grantsAndFunding.map((grant, index) => (
            <Card 
              key={index}
              sx={{ 
                mb: 3,
                boxShadow: 'none',
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#000', mb: 0.5 }}>
                      {grant.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip label={grant.territory} size="small" sx={{ bgcolor: 'rgba(212, 175, 55, 0.1)', color: '#D4AF37' }} />
                      <Chip label={grant.type} size="small" variant="outlined" />
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50' }}>
                      {grant.amount}
                    </Typography>
                    <Chip 
                      label={`${grant.likelihood} Likelihood`}
                      size="small"
                      sx={{ 
                        mt: 1,
                        bgcolor: grant.likelihood === 'High' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                        color: grant.likelihood === 'High' ? '#4caf50' : '#ff9800'
                      }}
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase' }}>
                      Deadline
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {grant.deadline}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase' }}>
                      Eligibility
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {grant.eligibility}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}

          <Alert severity="info" sx={{ mt: 4 }}>
            <Typography variant="body2">
              <strong>Pro Tip:</strong> Applications for grants typically require 3 to 6 months lead time. Start preparation early and consider engaging a local producer familiar with the application process.
            </Typography>
          </Alert>
        </Box>
      );
    }

    // Page 9: Film Festivals
    if (currentPage === 9) {
      return (
        <Box sx={{ minHeight: '800px', bgcolor: '#fff', p: 8 }}>
          <Typography variant="overline" sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.9rem' }}>
            Festival Strategy
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#000' }}>
            Regional Film Festivals
          </Typography>
          <Divider sx={{ mb: 4, borderColor: '#D4AF37', borderWidth: 2 }} />

          <Typography variant="body1" sx={{ mb: 4, color: '#444', lineHeight: 1.8 }}>
            Strategic festival recommendations based on your production's genre, location, and co production territories:
          </Typography>

          {data.festivals.map((festival, index) => (
            <Card 
              key={index}
              sx={{ 
                mb: 3,
                boxShadow: 'none',
                border: festival.tier === 'A List' ? '2px solid #D4AF37' : '1px solid rgba(0,0,0,0.1)',
                bgcolor: festival.tier === 'A List' ? 'rgba(212, 175, 55, 0.03)' : 'transparent',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#000' }}>
                        {festival.name}
                      </Typography>
                      <Chip 
                        label={festival.tier}
                        size="small"
                        sx={{ 
                          bgcolor: festival.tier === 'A List' ? '#D4AF37' : 'rgba(0,0,0,0.1)',
                          color: festival.tier === 'A List' ? '#000' : '#666',
                          fontWeight: 700
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                      {festival.country}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#000' }}>
                      {festival.submissionFee}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Submission Fee
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ bgcolor: 'rgba(0,0,0,0.02)', p: 2, borderRadius: 1, mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                    Deadline
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#000' }}>
                    {festival.deadline}
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ color: '#444', lineHeight: 1.6 }}>
                  {festival.notes}
                </Typography>
              </CardContent>
            </Card>
          ))}

          <Paper sx={{ p: 3, mt: 4, bgcolor: 'rgba(212, 175, 55, 0.08)', boxShadow: 'none', border: '1px solid #D4AF37' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#000' }}>
              Comparable Productions
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
              Similar films that have successfully navigated the festival circuit:
            </Typography>
            {data.comparableProductions.map((comp, index) => (
              <Box key={index} sx={{ mb: 2, pb: 2, borderBottom: index < data.comparableProductions.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {comp.title} ({comp.year})
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                    {comp.budget}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                  Territory: {comp.territory}
                </Typography>
                <Typography variant="body2" sx={{ color: '#444', fontSize: '0.85rem' }}>
                  {comp.notes}
                </Typography>
              </Box>
            ))}
          </Paper>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100dvh' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider', py: 2, position: 'sticky', top: 0, zIndex: 1000 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <img 
                src={exampleLogo} 
                alt="Prodculator" 
                style={{ height: '32px', width: 'auto', cursor: 'pointer' }}
                onClick={() => navigate('/')}
              />
              {/* <Chip 
                label="SAMPLE REPORT" 
                color="warning" 
                size="small"
                sx={{ fontWeight: 700 }}
              /> */}
            </Box>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ color: '#000' }}>
              Back to Home
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Demo Notice */}
      <Container maxWidth="lg" sx={{ pt: 3 }}>
        <Alert 
          severity="info" 
          icon={<Info />}
          sx={{ mb: 0 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            This is a demonstration report with fictional data. Upload your own script to get a real analysis.
          </Typography>
        </Alert>
      </Container>

      {/* Report Container */}
      <Container maxWidth="lg" sx={{ py: 4 }} ref={reportContainerRef}>
        <Paper 
          elevation={3}
          sx={{ 
            minHeight: '800px',
            overflow: 'hidden',
            bgcolor: 'white'
          }}
        >
          {renderPage()}
        </Paper>

        {/* Navigation Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <Button
            startIcon={<NavigateBefore />}
            onClick={prevPage}
            disabled={currentPage === 0}
            variant="outlined"
            sx={{ minWidth: '120px' }}
          >
            Previous
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Page {currentPage + 1} of {totalPages}
            </Typography>
          </Box>

          <Button
            endIcon={<NavigateNext />}
            onClick={nextPage}
            disabled={currentPage === totalPages - 1}
            variant="contained"
            sx={{ minWidth: '120px' }}
          >
            Next
          </Button>
        </Box>

        {/* CTA Section */}
        <Box sx={{ textAlign: 'center', py: 6, mt: 4, bgcolor: 'white', borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
            Ready to Analyze Your Script?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Get a customized intelligence report with real data for your production
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CloudUpload />}
              onClick={() => navigate('/upload')}
              sx={{ px: 6, py: 1.5 }}
            >
              Upload Your Script
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/pricing')}
              sx={{ px: 6, py: 1.5 }}
            >
              View Pricing
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
