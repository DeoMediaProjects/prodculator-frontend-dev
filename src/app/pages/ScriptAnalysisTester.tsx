import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircle,
  ExpandMore,
  PlayArrow,
  Error as ErrorIcon,
} from '@mui/icons-material';
import scriptAnalysisService, { ScriptAnalysisResult } from '@/services/script-analysis.service';

export function ScriptAnalysisTester() {
  const [scriptText, setScriptText] = useState('');
  const [scriptTitle, setScriptTitle] = useState('Test Script');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ScriptAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestSample = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const analysis = await scriptAnalysisService.testAnalysis();
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!scriptText.trim()) {
      setError('Please enter a script');
      return;
    }

    setAnalyzing(true);
    setError(null);
    try {
      const analysis = await scriptAnalysisService.analyzeScript(
        scriptText,
        scriptTitle,
        { userProvidedGenre: 'Action' }
      );
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#000000', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">
        <Typography variant="h4" sx={{ color: '#D4AF37', fontWeight: 700, mb: 1 }}>
          🧪 Script Analysis Service Tester
        </Typography>
        <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 4 }}>
          Test the OpenAI GPT-4 integration for script analysis
        </Typography>

        {/* Test Controls */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#0a0a0a' }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handleTestSample}
              disabled={analyzing}
            >
              Test with Sample Script
            </Button>
            {analyzing && <CircularProgress size={24} sx={{ color: '#D4AF37' }} />}
          </Box>

          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
            Or paste your own script:
          </Typography>

          <TextField
            fullWidth
            label="Script Title"
            value={scriptTitle}
            onChange={(e) => setScriptTitle(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={10}
            label="Script Text"
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            placeholder="Paste script here..."
            sx={{ mb: 2 }}
          />

          <Button
            variant="outlined"
            onClick={handleAnalyze}
            disabled={analyzing || !scriptText.trim()}
          >
            Analyze My Script
          </Button>
        </Paper>

        {/* Error Display */}
        {error && (
          <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Results Display */}
        {result && (
          <Box>
            <Typography variant="h5" sx={{ color: '#D4AF37', fontWeight: 700, mb: 3 }}>
              Analysis Results
            </Typography>

            {/* Budget Estimate */}
            <Accordion defaultExpanded sx={{ bgcolor: '#0a0a0a', mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#D4AF37' }} />}>
                <Typography sx={{ color: '#D4AF37', fontWeight: 600 }}>
                  Budget Estimate
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ bgcolor: '#1a1a1a' }}>
                      <CardContent>
                        <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1 }}>
                          Estimated Range
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#ffffff', textTransform: 'capitalize' }}>
                          {result.budgetEstimate.range}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#a0a0a0', mt: 0.5 }}>
                          ${result.budgetEstimate.minUSD.toLocaleString()} – ${result.budgetEstimate.maxUSD.toLocaleString()}
                        </Typography>
                        <Chip
                          label={`${Math.round(result.budgetEstimate.confidence * 100)}% confidence`}
                          size="small"
                          sx={{ mt: 1, bgcolor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37' }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1 }}>
                      Indicators:
                    </Typography>
                    {result.budgetEstimate.indicators.map((indicator, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <CheckCircle sx={{ color: '#4caf50', fontSize: 16, mr: 1 }} />
                        <Typography variant="body2" sx={{ color: '#ffffff' }}>
                          {indicator}
                        </Typography>
                      </Box>
                    ))}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Locations */}
            <Accordion sx={{ bgcolor: '#0a0a0a', mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#D4AF37' }} />}>
                <Typography sx={{ color: '#D4AF37', fontWeight: 600 }}>
                  Locations ({result.locations.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {result.locations.map((location, idx) => (
                  <Card key={idx} sx={{ bgcolor: '#1a1a1a', mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: '#ffffff', mb: 1 }}>
                        {location.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        <Chip label={location.country} size="small" />
                        <Chip label={`${location.frequency} scenes`} size="small" />
                        {location.isMainLocation && (
                          <Chip
                            label="Main location"
                            size="small"
                            sx={{ bgcolor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37' }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                        Territory: {location.territory || 'TBD'}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </AccordionDetails>
            </Accordion>

            {/* Production Scale */}
            <Accordion sx={{ bgcolor: '#0a0a0a', mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#D4AF37' }} />}>
                <Typography sx={{ color: '#D4AF37', fontWeight: 600 }}>
                  Production Scale
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Crew Size</Typography>
                    <Typography variant="h6" sx={{ color: '#ffffff', textTransform: 'capitalize' }}>
                      {result.productionScale.crewSize.replace('_', ' ')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Shooting Days</Typography>
                    <Typography variant="h6" sx={{ color: '#ffffff' }}>
                      {result.productionScale.estimatedShootingDays} days
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Principal Cast</Typography>
                    <Typography variant="h6" sx={{ color: '#ffffff', textTransform: 'capitalize' }}>
                      {result.productionScale.principalCast.replace('_', ' ')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Supporting Cast</Typography>
                    <Typography variant="h6" sx={{ color: '#ffffff', textTransform: 'capitalize' }}>
                      {result.productionScale.supportingCast.replace('_', ' ')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Background Extras</Typography>
                    <Typography variant="h6" sx={{ color: '#ffffff', textTransform: 'capitalize' }}>
                      {result.productionScale.backgroundExtras.replace('_', ' ')}
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Equipment */}
            <Accordion sx={{ bgcolor: '#0a0a0a', mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#D4AF37' }} />}>
                <Typography sx={{ color: '#D4AF37', fontWeight: 600 }}>
                  Equipment Recommendations
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={result.equipment.cameraEquipment.toUpperCase()}
                    sx={{ mr: 1, mb: 1, bgcolor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37' }}
                  />
                  <Chip
                    label={`VFX: ${result.equipment.vfxRequirements}`}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
                {result.equipment.specialEquipment.length > 0 && (
                  <>
                    <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1 }}>
                      Special Equipment:
                    </Typography>
                    {result.equipment.specialEquipment.map((eq, idx) => (
                      <Chip key={idx} label={eq} size="small" sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Metadata */}
            <Accordion sx={{ bgcolor: '#0a0a0a', mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#D4AF37' }} />}>
                <Typography sx={{ color: '#D4AF37', fontWeight: 600 }}>
                  Metadata
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Format</Typography>
                    <Typography variant="h6" sx={{ color: '#ffffff', textTransform: 'capitalize' }}>
                      {result.metadata.format.replace('_', ' ')}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Tone</Typography>
                    <Typography variant="h6" sx={{ color: '#ffffff' }}>
                      {result.metadata.tone}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0a0' }}>Target Audience</Typography>
                    <Typography variant="h6" sx={{ color: '#ffffff' }}>
                      {result.metadata.targetAudience}
                    </Typography>
                  </Grid>
                </Grid>
                {result.metadata.genres.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1 }}>
                      Genres:
                    </Typography>
                    {result.metadata.genres.map((genre, idx) => (
                      <Chip key={idx} label={genre} size="small" sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Production Challenges */}
            <Accordion sx={{ bgcolor: '#0a0a0a', mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#D4AF37' }} />}>
                <Typography sx={{ color: '#D4AF37', fontWeight: 600 }}>
                  Production Challenges
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {([
                    ['Weather dependent', result.challenges.weatherDependent],
                    ['Historical period', result.challenges.historicalPeriod],
                    ['Special permits', result.challenges.specialPermits],
                    ['Stunts', result.challenges.stunts],
                    ['Animal wrangling', result.challenges.animalWrangling],
                    ['Water work', result.challenges.waterWork],
                    ['Night shooting', result.challenges.nightShooting],
                  ] as const).map(([label, active]) => (
                    <Chip
                      key={label}
                      label={label}
                      size="small"
                      icon={active ? <CheckCircle /> : undefined}
                      sx={{
                        bgcolor: active ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: active ? '#4caf50' : '#666',
                      }}
                    />
                  ))}
                </Box>
                {result.challenges.notes.map((note, idx) => (
                  <Typography key={idx} variant="body2" sx={{ color: '#a0a0a0' }}>
                    • {note}
                  </Typography>
                ))}
              </AccordionDetails>
            </Accordion>

            {/* Raw Analysis */}
            <Accordion sx={{ bgcolor: '#0a0a0a' }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#D4AF37' }} />}>
                <Typography sx={{ color: '#D4AF37', fontWeight: 600 }}>
                  Raw Analysis (Debug)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  value={result.rawResponse || 'No raw response provided.'}
                  InputProps={{ readOnly: true }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    },
                  }}
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </Container>
    </Box>
  );
}