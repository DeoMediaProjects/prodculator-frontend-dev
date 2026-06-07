import { useNavigate } from 'react-router';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { ArrowBack, PictureAsPdf, Download } from '@mui/icons-material';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';

export function PDFReportPreview() {
  const navigate = useNavigate();

  const sampleData = {
    reportId: 'RPT-2026-001234',
    generatedDate: 'January 23, 2026',
    scriptTitle: 'THE LAST FRONTIER',
    genre: 'Action/Thriller',
    userName: 'Sarah Mitchell',
    pageCount: 110,
    estimatedRuntime: '100-110 minutes',
    sceneCount: 87,
    locationCount: 32,
    characterCount: 8,
    productionScale: 'Mid Budget' as const,
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000000', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/dashboard')}
              sx={{
                color: '#D4AF37',
                '&:hover': {
                  bgcolor: 'rgba(212, 175, 55, 0.1)',
                },
              }}
            >
              Back to Dashboard
            </Button>
          </Box>
          <Button
            startIcon={<Download />}
            variant="contained"
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              fontWeight: 700,
              '&:hover': {
                bgcolor: '#D4AF37',
              },
            }}
          >
            Download PDF
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <PictureAsPdf sx={{ color: '#D4AF37', fontSize: 32 }} />
          <Typography variant="h4" sx={{ color: '#D4AF37', fontWeight: 700 }}>
            PDF Report Structure Preview
          </Typography>
        </Box>

        <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 4 }}>
          Investor-ready PDF report with comprehensive production intelligence, tax incentive analysis, and location strategy.
        </Typography>

        {/* PDF Preview */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: '#ffffff',
            p: 0,
            border: '2px solid rgba(212, 175, 55, 0.3)',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(212, 175, 55, 0.2)',
          }}
        >
          {/* COVER PAGE */}
          <Box
            sx={{
              bgcolor: '#000000',
              p: 6,
              minHeight: '900px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              borderBottom: '4px solid #D4AF37',
            }}
          >
            {/* Logo */}
            <Box sx={{ mb: 6 }}>
              <img src={exampleLogo} alt="Prodculator" style={{ height: '60px', width: 'auto' }} />
            </Box>

            {/* Main Title */}
            <Typography
              sx={{
                fontSize: 48,
                fontWeight: 700,
                color: '#D4AF37',
                textAlign: 'center',
                mb: 3,
                letterSpacing: '2px',
              }}
            >
              SCRIPTELIGENCE REPORT
            </Typography>

            {/* Script Title */}
            <Box
              sx={{
                border: '3px solid #D4AF37',
                borderRadius: 2,
                p: 4,
                mb: 4,
                maxWidth: '600px',
                width: '100%',
              }}
            >
              <Typography
                sx={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}
              >
                {sampleData.scriptTitle}
              </Typography>
            </Box>

            {/* Subtitle */}
            <Typography
              sx={{
                fontSize: 18,
                color: '#CCCCCC',
                textAlign: 'center',
                mb: 6,
              }}
            >
              Production Location Strategy & Financial Intelligence
            </Typography>

            {/* Metadata */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 40,
                left: 0,
                right: 0,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontSize: 13, color: '#888888', mb: 1 }}>
                Report ID: {sampleData.reportId}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#888888', mb: 1 }}>
                Generated: {sampleData.generatedDate}
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#888888' }}>
                Prodculator
              </Typography>
            </Box>
          </Box>

          {/* TABLE OF CONTENTS */}
          <Box sx={{ p: 6, bgcolor: '#ffffff' }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#000000',
                mb: 4,
                pb: 2,
                borderBottom: '3px solid #D4AF37',
              }}
            >
              CONTENTS
            </Typography>

            <Box sx={{ ml: 2 }}>
              {[
                { name: 'Executive Summary', page: 3 },
                { name: '1. Script Analysis Overview', page: 4 },
                { name: '2. Production Location Strategy', page: 6 },
                { name: '3. Tax Incentive Analysis', page: 9 },
                { name: '4. Crew Cost Estimates', page: 12 },
                { name: '5. Comparable Productions', page: 14 },
                { name: '6. Regional Film Fund Opportunities', page: 16 },
                { name: '7. Production Economics Summary', page: 18 },
                { name: '8. Next Steps & Recommendations', page: 20 },
                { name: 'Appendix: Data Sources & Disclaimers', page: 21 },
              ].map((section, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 2,
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <Typography sx={{ fontSize: 16, color: '#333333' }}>
                    {section.name}
                  </Typography>
                  <Typography sx={{ fontSize: 16, color: '#D4AF37', fontWeight: 700 }}>
                    {section.page}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* EXECUTIVE SUMMARY */}
          <Box sx={{ p: 6, bgcolor: '#fafafa' }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#000000',
                mb: 1,
              }}
            >
              EXECUTIVE SUMMARY
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: '#666666',
                mb: 4,
                pb: 2,
                borderBottom: '3px solid #D4AF37',
              }}
            >
              Key Findings & Recommendations
            </Typography>

            {/* Highlight Box */}
            <Paper
              elevation={0}
              sx={{
                bgcolor: '#FFFEF7',
                border: '3px solid #D4AF37',
                borderRadius: 2,
                p: 4,
                mb: 4,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Typography sx={{ fontSize: 32 }}></Typography>
                <Box>
                  <Typography sx={{ fontSize: 12, color: '#D4AF37', fontWeight: 700, mb: 0.5 }}>
                    TOP RECOMMENDED LOCATION
                  </Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#000000' }}>
                    British Columbia, Canada
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, color: '#666666', mb: 0.5 }}>
                    Estimated Tax Incentive
                  </Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#D4AF37' }}>
                    $450K - $650K
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: '#666666', mb: 0.5 }}>
                    Projected Net Savings
                  </Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#D4AF37' }}>
                    35% cost reduction
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Key Metrics Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3, mb: 4 }}>
              {[
                { label: 'Production Scale', value: 'Mid Budget Feature', icon: '' },
                { label: 'Territories Analyzed', value: '30+ locations', icon: '' },
                { label: 'Processing Time', value: '2m 34s', icon: '' },
              ].map((metric, idx) => (
                <Paper
                  key={idx}
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: '#ffffff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                  }}
                >
                  <Typography sx={{ fontSize: 24, mb: 1 }}>{metric.icon}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#666666', mb: 0.5 }}>
                    {metric.label}
                  </Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#000000' }}>
                    {metric.value}
                  </Typography>
                </Paper>
              ))}
            </Box>

            {/* Key Insights */}
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#000000', mb: 2 }}>
              Key Insights
            </Typography>
            <Box component="ul" sx={{ pl: 3, color: '#333333', lineHeight: 1.8 }}>
              <li>British Columbia offers optimal combination of 36% tax credit and experienced crew base</li>
              <li>Urban contemporary setting matches Vancouver infrastructure capabilities</li>
              <li>Mid-budget action/thriller aligns with BC's production history (comparable: "Example Films")</li>
              <li>Estimated net cost after incentives: $1.2M vs. $1.85M gross production budget</li>
            </Box>

            {/* Data Badge */}
            <Box
              sx={{
                mt: 4,
                p: 2,
                bgcolor: '#f5f5f5',
                borderLeft: '4px solid #D4AF37',
                borderRadius: 1,
              }}
            >
              <Typography sx={{ fontSize: 11, color: '#666666' }}>
                <strong>Data Sources:</strong> AI Analysis, Film Commission Data, KFTV, ProductionHUB | <strong>Verified:</strong> January 2026
              </Typography>
            </Box>
          </Box>

          {/* SECTION 1: SCRIPT ANALYSIS */}
          <Box sx={{ p: 6, bgcolor: '#ffffff' }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#000000',
                mb: 1,
              }}
            >
              1. SCRIPT ANALYSIS OVERVIEW
            </Typography>
            <Divider sx={{ mb: 4, borderColor: '#D4AF37', borderWidth: 2 }} />

            {/* Script Metadata */}
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#000000', mb: 2 }}>
              Script Metadata
            </Typography>

            <TableContainer sx={{ mb: 4 }}>
              <Table>
                <TableBody>
                  {[
                    { label: 'Title', value: sampleData.scriptTitle },
                    { label: 'Genre', value: sampleData.genre },
                    { label: 'Page Count', value: `${sampleData.pageCount} pages` },
                    { label: 'Estimated Runtime', value: sampleData.estimatedRuntime },
                  ].map((row, idx) => (
                    <TableRow key={idx} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 700, color: '#666666', width: '40%' }}>
                        {row.label}
                      </TableCell>
                      <TableCell sx={{ color: '#000000', fontSize: 16 }}>
                        {row.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Production Breakdown */}
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#000000', mb: 2 }}>
              Production Breakdown
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, mb: 4 }}>
              {[
                { label: 'Total Scenes', value: `${sampleData.sceneCount} scenes` },
                { label: 'Unique Locations', value: `${sampleData.locationCount} locations` },
                { label: 'Principal Characters', value: `${sampleData.characterCount} characters` },
                { label: 'INT/EXT Split', value: '60% INT / 40% EXT' },
                { label: 'Day/Night Split', value: '70% DAY / 30% NIGHT' },
                { label: 'Production Scale', value: sampleData.productionScale },
              ].map((item, idx) => (
                <Paper
                  key={idx}
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: '#fafafa',
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 11, color: '#666666', mb: 0.5 }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#000000' }}>
                    {item.value}
                  </Typography>
                </Paper>
              ))}
            </Box>

            {/* Location Requirements */}
            <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#000000', mb: 2 }}>
              Top Location Types
            </Typography>

            <Box component="ul" sx={{ pl: 3, color: '#333333', lineHeight: 2 }}>
              <li>Urban Apartment (15 scenes)</li>
              <li>Office Building (12 scenes)</li>
              <li>City Streets (10 scenes)</li>
              <li>Restaurant/Bar (8 scenes)</li>
              <li>Airport (6 scenes)</li>
            </Box>

            {/* Data Badge */}
            <Box
              sx={{
                mt: 4,
                p: 2,
                bgcolor: '#f5f5f5',
                borderLeft: '4px solid #D4AF37',
                borderRadius: 1,
              }}
            >
              <Typography sx={{ fontSize: 11, color: '#666666' }}>
                <strong>Data Source:</strong> AI Script Analysis Engine | <strong>Last Verified:</strong> January 2026
              </Typography>
            </Box>
          </Box>

          {/* SECTION 2: LOCATION STRATEGY (Preview) */}
          <Box sx={{ p: 6, bgcolor: '#fafafa' }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: '#000000',
                mb: 1,
              }}
            >
              2. PRODUCTION LOCATION STRATEGY
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: '#666666',
                mb: 4,
                pb: 2,
                borderBottom: '3px solid #D4AF37',
              }}
            >
              Top 5 Recommended Territories
            </Typography>

            {/* Territory Ranking Table */}
            <TableContainer component={Paper} elevation={0} sx={{ mb: 4 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#000000' }}>
                    <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Rank</TableCell>
                    <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Territory</TableCell>
                    <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Incentive %</TableCell>
                    <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Est. Rebate</TableCell>
                    <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Overall Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { rank: 1, territory: 'British Columbia, Canada', incentive: '36%', rebate: '$450K-$650K', score: 94 },
                    { rank: 2, territory: 'UK (England)', incentive: '25%', rebate: '$380K-$520K', score: 89 },
                    { rank: 3, territory: 'Georgia, USA', incentive: '30%', rebate: '$420K-$580K', score: 87 },
                    { rank: 4, territory: 'Malta', incentive: '40%', rebate: '$320K-$480K', score: 84 },
                    { rank: 5, territory: 'South Africa (Cape Town)', incentive: '35%', rebate: '$280K-$420K', score: 82 },
                  ].map((row) => (
                    <TableRow key={row.rank} sx={{ '&:nth-of-type(odd)': { bgcolor: '#fafafa' } }}>
                      <TableCell>
                        <Chip
                          label={`#${row.rank}`}
                          size="small"
                          sx={{
                            bgcolor: row.rank === 1 ? '#D4AF37' : '#e0e0e0',
                            color: row.rank === 1 ? '#000000' : '#666666',
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{row.territory}</TableCell>
                      <TableCell>{row.incentive}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#D4AF37' }}>{row.rebate}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, color: row.score >= 90 ? '#2e7d32' : '#333333' }}>
                          {row.score}/100
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Detailed Territory Profile (BC) */}
            <Paper
              elevation={0}
              sx={{
                p: 4,
                border: '2px solid #D4AF37',
                borderRadius: 2,
                bgcolor: '#ffffff',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#000000' }}>
                  #1 British Columbia, Canada
                </Typography>
                <Chip
                  label="Overall Score: 94/100"
                  sx={{
                    bgcolor: '#D4AF37',
                    color: '#000000',
                    fontWeight: 700,
                    fontSize: 16,
                    height: 40,
                  }}
                />
              </Box>

              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#000000', mb: 2 }}>
                Key Benefits
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: '#333333', lineHeight: 2, mb: 3 }}>
                <li>Up to 36% tax credit on eligible BC labor (35% base + 6% regional bonus)</li>
                <li>Established film infrastructure with world-class studios and equipment</li>
                <li>Skilled crew base with competitive rates and deep experience</li>
                <li>Diverse locations (urban Vancouver, mountains, coastal)</li>
                <li>Favorable USD/CAD exchange rate adds ~25% additional savings</li>
              </Box>

              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#000000', mb: 2 }}>
                Considerations
              </Typography>
              <Box component="ul" sx={{ pl: 3, color: '#333333', lineHeight: 2 }}>
                <li>Weather can be unpredictable (frequent rain, especially Nov-Mar)</li>
                <li>Application timeline: 6-8 weeks before principal photography</li>
                <li>Must meet BC labor expenditure requirements (75% minimum)</li>
              </Box>
            </Paper>

            {/* Data Badge */}
            <Box
              sx={{
                mt: 4,
                p: 2,
                bgcolor: '#f5f5f5',
                borderLeft: '4px solid #D4AF37',
                borderRadius: 1,
              }}
            >
              <Typography sx={{ fontSize: 11, color: '#666666' }}>
                <strong>Data Sources:</strong> Film Commissions, KFTV, ProductionHUB | <strong>Last Verified:</strong> January 2026
              </Typography>
            </Box>
          </Box>

          {/* PAGE INDICATOR */}
          <Box sx={{ p: 4, bgcolor: '#000000', textAlign: 'center' }}>
            <Typography sx={{ color: '#666666', fontSize: 13, mb: 2 }}>
              Full report continues for 15-22 pages with detailed sections on:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              {[
                'Tax Incentive Analysis',
                'Crew Cost Estimates',
                'Comparable Productions',
                'Film Fund Opportunities',
                'Production Economics',
                'Next Steps',
                'Data Sources & Disclaimers',
              ].map((section) => (
                <Chip
                  key={section}
                  label={section}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(212, 175, 55, 0.2)',
                    color: '#D4AF37',
                    borderColor: '#D4AF37',
                    border: '1px solid',
                  }}
                />
              ))}
            </Box>

            <Divider sx={{ my: 3, borderColor: 'rgba(212, 175, 55, 0.3)' }} />

            <Typography sx={{ color: '#888888', fontSize: 12 }}>
              © 2026 Prodculator. All rights reserved.
            </Typography>
          </Box>
        </Paper>

        {/* Implementation Notes */}
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 3,
            bgcolor: '#0a0a0a',
            border: '2px solid rgba(212, 175, 55, 0.3)',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
            <strong style={{ color: '#D4AF37' }}>PDF Generation Implementation:</strong>
          </Typography>
          <Box component="ul" sx={{ color: '#a0a0a0', fontSize: '0.875rem', lineHeight: 1.8, pl: 3 }}>
            <li><strong>Library Options:</strong> jsPDF, PDFKit, Puppeteer, or react-pdf</li>
            <li><strong>Total Length:</strong> 15-22 pages depending on script complexity</li>
            <li><strong>File Size:</strong> Optimized to 2-5 MB for easy download and sharing</li>
            <li><strong>Branding:</strong> Consistent black (#000000) and gold (#D4AF37) throughout</li>
            <li><strong>Data Attribution:</strong> Every data-driven section includes source badges and verification dates</li>
            <li><strong>Professional Quality:</strong> Investor-ready formatting with charts, tables, and visual hierarchy</li>
            <li><strong>Disclaimers:</strong> Comprehensive legal disclaimers in appendix covering data accuracy, tax advice, estimates</li>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}