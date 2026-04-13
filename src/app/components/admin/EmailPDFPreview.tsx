import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import {
  Email,
  PictureAsPdf,
  Download,
  Visibility,
  CheckCircle,
} from '@mui/icons-material';

/**
 * EmailPDFPreview Component
 * 
 * Visual preview of the enhanced email templates and PDF report structure
 * for Prodculator
 */

export function EmailPDFPreview() {
  const [activeTab, setActiveTab] = useState(0);
  const [emailPreview, setEmailPreview] = useState('report-ready');

  return (
    <Box sx={{ bgcolor: '#000000', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37', mb: 1 }}>
            Email & PDF Report Preview
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
            Enhanced templates for Prodculator
          </Typography>
        </Box>

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_e, newValue) => setActiveTab(newValue)}
          sx={{
            mb: 3,
            '& .MuiTab-root': {
              color: '#a0a0a0',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
            },
            '& .Mui-selected': {
              color: '#D4AF37 !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#D4AF37',
            },
          }}
        >
          <Tab icon={<Email />} iconPosition="start" label="Email Templates" />
          <Tab icon={<PictureAsPdf />} iconPosition="start" label="PDF Report Structure" />
        </Tabs>

        {/* Email Templates Tab */}
        {activeTab === 0 && (
          <Box>
            {/* Email Type Selector */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ color: '#D4AF37', mb: 2 }}>
                Select Email Type:
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {[
                  { id: 'report-ready', label: 'Report Ready', icon: '' },
                  { id: 'welcome', label: 'Welcome Email', icon: '' },
                  { id: 'payment', label: 'Payment Confirmation', icon: '' },
                  { id: 'processing', label: 'Processing Started', icon: '' },
                ].map((type) => (
                  <Chip
                    key={type.id}
                    label={`${type.label}`}
                    onClick={() => setEmailPreview(type.id)}
                    sx={{
                      bgcolor: emailPreview === type.id ? '#D4AF37' : 'rgba(212, 175, 55, 0.1)',
                      color: emailPreview === type.id ? '#000000' : '#D4AF37',
                      fontWeight: 600,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: emailPreview === type.id ? '#D4AF37' : 'rgba(212, 175, 55, 0.2)',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Email Preview */}
            {emailPreview === 'report-ready' && (
              <Paper
                sx={{
                  bgcolor: '#f5f5f5',
                  p: 4,
                  maxWidth: 600,
                  mx: 'auto',
                  border: '1px solid #e0e0e0',
                }}
              >
                {/* Email Header */}
                <Box
                  sx={{
                    bgcolor: '#000000',
                    p: 3,
                    textAlign: 'center',
                    borderBottom: '3px solid #D4AF37',
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{ color: '#ffffff', fontWeight: 700, letterSpacing: 2 }}
                  >
                    PRODCULATOR
                  </Typography>
                </Box>

                {/* Email Body */}
                <Box sx={{ bgcolor: '#ffffff', p: 3 }}>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: '#000000', mb: 2 }}
                  >
                    Your Report is Ready
                  </Typography>

                  <Typography variant="body1" sx={{ color: '#666666', mb: 3 }}>
                    Hi <strong>John Smith</strong>, we've completed the comprehensive analysis of{' '}
                    <strong>"The Last Stand"</strong>
                  </Typography>

                  {/* Highlight Box */}
                  <Box
                    sx={{
                      bgcolor: '#FFFEF7',
                      borderLeft: '4px solid #D4AF37',
                      p: 2.5,
                      mb: 3,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#D4AF37',
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        display: 'block',
                        mb: 1,
                      }}
                    >
                      TOP RECOMMENDATION
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, color: '#000000', mb: 1 }}
                    >
                      British Columbia, Canada
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666666' }}>
                      Estimated Incentive: <strong>$450,000 - $650,000</strong>
                    </Typography>
                  </Box>

                  {/* CTA Button */}
                  <Box sx={{ textAlign: 'center', my: 3 }}>
                    <Button
                      variant="contained"
                      size="large"
                      sx={{
                        bgcolor: '#D4AF37',
                        color: '#000000',
                        fontWeight: 700,
                        px: 4,
                        py: 1.5,
                        '&:hover': {
                          bgcolor: '#D4AF37',
                        },
                      }}
                    >
                      View Full Report
                    </Button>
                    <Typography
                      variant="body2"
                      sx={{ color: '#D4AF37', mt: 1.5, cursor: 'pointer' }}
                    >
                      ↓ Download PDF
                    </Typography>
                  </Box>

                  {/* Report Sections */}
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                    Your Report Includes:
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    {[
                      'Production Location Strategy (5 territories)',
                      'Tax Incentive Analysis (UK, Canada, US, Malta, South Africa)',
                      'Crew Cost Estimates by Territory',
                      'Comparable Productions Analysis',
                      'Regional Film Fund Opportunities',
                      'Production Economics Summary',
                      'Script Breakdown Insights',
                      'Next Steps & Recommendations',
                    ].map((item, index) => (
                      <Box
                        key={index}
                        sx={{
                          py: 1.5,
                          borderBottom: '1px solid #eeeeee',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <CheckCircle sx={{ color: '#D4AF37', fontSize: 18 }} />
                        <Typography variant="body2" sx={{ color: '#333333' }}>
                          {item}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Disclaimer */}
                  <Box
                    sx={{
                      bgcolor: '#f9f9f9',
                      p: 2,
                      borderRadius: 1,
                      mb: 3,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#666666' }}>
                      <strong>Important:</strong> This report uses indicative data from
                      third-party APIs and internally curated datasets.{' '}
                      <Chip
                        label="Data verified: January 2026"
                        size="small"
                        sx={{
                          bgcolor: '#e0e0e0',
                          height: 20,
                          fontSize: '0.7rem',
                          ml: 0.5,
                        }}
                      />
                    </Typography>
                  </Box>
                </Box>

                {/* Email Footer */}
                <Box sx={{ bgcolor: '#1a1a1a', p: 3, textAlign: 'center' }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: '#D4AF37', fontWeight: 700, mb: 2 }}
                  >
                    PRODCULATOR
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666666', display: 'block' }}>
                    © 2026 Prodculator. All rights reserved.
                    <br />
                    Professional production intelligence for film producers worldwide.
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* Other email previews would be similar */}
            {emailPreview !== 'report-ready' && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" sx={{ color: '#D4AF37', mb: 2 }}>
                  {emailPreview === 'welcome' && 'Welcome Email Preview'}
                  {emailPreview === 'payment' && 'Payment Confirmation Preview'}
                  {emailPreview === 'processing' && 'Processing Started Preview'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                  Similar professional design with black and gold branding
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* PDF Report Tab */}
        {activeTab === 1 && (
          <Box>
            <Card
              sx={{
                bgcolor: '#0a0a0a',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                mb: 3,
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ color: '#D4AF37', fontWeight: 600, mb: 3 }}>
                  PDF Report Structure (15-25 pages)
                </Typography>

                {/* Report Sections */}
                {[
                  {
                    page: '1',
                    section: 'Cover Page',
                    description: 'Black background, gold title, professional branding',
                    icon: '',
                  },
                  {
                    page: '2',
                    section: 'Table of Contents',
                    description: 'Easy navigation with page numbers',
                    icon: '',
                  },
                  {
                    page: '3',
                    section: 'Executive Summary',
                    description: 'Key findings, top recommendation, estimated savings',
                    icon: '',
                  },
                  {
                    page: '4-5',
                    section: '1. Script Analysis',
                    description: 'Scenes, locations, characters, production scale',
                    icon: '',
                  },
                  {
                    page: '6-8',
                    section: '2. Location Strategy',
                    description: 'Top 5 territories with detailed scoring',
                    icon: '',
                  },
                  {
                    page: '9-11',
                    section: '3. Tax Incentives',
                    description: 'Detailed incentive breakdown, eligibility, application',
                    icon: '',
                  },
                  {
                    page: '12-13',
                    section: '4. Crew Costs',
                    description: 'Department rates across territories',
                    icon: '',
                  },
                  {
                    page: '14-15',
                    section: '5. Comparable Productions',
                    description: 'Similar films and their strategies',
                    icon: '',
                  },
                  {
                    page: '16-17',
                    section: '6. Film Fund Opportunities',
                    description: 'Regional grants and funding sources',
                    icon: '',
                  },
                  {
                    page: '18-19',
                    section: '7. Production Economics',
                    description: 'Financial comparison, ROI analysis',
                    icon: '',
                  },
                  {
                    page: '20',
                    section: '8. Next Steps',
                    description: 'Action items, resources, contacts',
                    icon: '',
                  },
                  {
                    page: '21-22',
                    section: 'Appendix',
                    description: 'Data sources, disclaimers, version info',
                    icon: '',
                  },
                ].map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: 'rgba(212, 175, 55, 0.05)',
                      borderLeft: '4px solid #D4AF37',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: '#D4AF37', fontWeight: 700 }}>
                        {item.icon} {item.section}
                      </Typography>
                      <Chip
                        label={`Page ${item.page}`}
                        size="small"
                        sx={{
                          bgcolor: '#D4AF37',
                          color: '#000000',
                          fontWeight: 600,
                          height: 24,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                      {item.description}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>

            {/* Design Specs */}
            <Card
              sx={{
                bgcolor: '#0a0a0a',
                border: '1px solid rgba(212, 175, 55, 0.2)',
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ color: '#D4AF37', fontWeight: 600, mb: 3 }}>
                  Design Specifications
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                  {/* Colors */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}
                    >
                      Color Palette
                    </Typography>
                    {[
                      { name: 'Primary', color: '#000000', label: 'Black' },
                      { name: 'Accent', color: '#D4AF37', label: 'Gold' },
                      { name: 'Text', color: '#1a1a1a', label: 'Dark Gray' },
                      { name: 'Secondary', color: '#666666', label: 'Medium Gray' },
                    ].map((item) => (
                      <Box
                        key={item.name}
                        sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: item.color,
                            border: '1px solid #333',
                            borderRadius: 1,
                          }}
                        />
                        <Box>
                          <Typography variant="caption" sx={{ color: '#D4AF37' }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block' }}>
                            {item.label} ({item.color})
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  {/* Typography */}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}
                    >
                      Typography
                    </Typography>
                    <Box sx={{ color: '#a0a0a0' }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        • Headers: Helvetica Bold
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        • Body: Helvetica Regular
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        • H1: 32pt (Section titles)
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        • H2: 24pt (Subsections)
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        • Body: 11pt (Standard text)
                      </Typography>
                      <Typography variant="body2">• Caption: 9pt (Data badges)</Typography>
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ my: 3, borderColor: 'rgba(212, 175, 55, 0.2)' }} />

                {/* Key Features */}
                <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600, mb: 2 }}>
                  Key Features
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {[
                    'Data Source Badges',
                    'Verification Dates',
                    'Interactive Charts',
                    'Professional Tables',
                    'Warning Boxes',
                    'Highlight Sections',
                    'Page Numbers',
                    'Clickable TOC',
                  ].map((feature) => (
                    <Chip
                      key={feature}
                      label={feature}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(212, 175, 55, 0.1)',
                        color: '#D4AF37',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Visibility />}
            sx={{
              borderColor: '#D4AF37',
              color: '#D4AF37',
              '&:hover': {
                borderColor: '#D4AF37',
                bgcolor: 'rgba(212, 175, 55, 0.08)',
              },
            }}
          >
            View Implementation Guide
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#D4AF37',
              },
            }}
          >
            Download Templates
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
