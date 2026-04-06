import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  ArrowBack,
  HourglassEmpty,
  Email,
  Dashboard,
} from '@mui/icons-material';
import { useScript, ScriptMetadata } from '@/app/contexts/ScriptContext';
import { ReportTimeoutError } from '@/app/contexts/ScriptContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { InfoTip, TOOLTIP_TEXTS } from '@/app/components/common/InfoTip';
import { useTerritories } from '@/app/hooks/useTerritories';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';

export function ScriptUpload() {
  const navigate = useNavigate();
  const { generateAnalysis, generatePreview } = useScript();
  const { isAuthenticated, user, hasUsedFreeReport, markFreeReportUsed } = useAuth();
  const { countries: countryOptions, territories: allTerritories } = useTerritories();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [budgetAmount, setBudgetAmount] = useState<number | ''>('');
  const [budgetCurrency, setBudgetCurrency] = useState('GBP');
  const [format, setFormat] = useState('');
  const [country, setCountry] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [cameraEquipment, setCameraEquipment] = useState<string[]>([]);
  const [crewSize, setCrewSize] = useState('');
  const [principalCast, setPrincipalCast] = useState('');
  const [supportingCast, setSupportingCast] = useState('');
  const [filmingStart, setFilmingStart] = useState('');
  const [filmingDuration, setFilmingDuration] = useState('');
  
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Timeout modal — shown when report generation is still running after the polling window
  const [timeoutModalOpen, setTimeoutModalOpen] = useState(false);
  const [_timedOutReportId, setTimedOutReportId] = useState<string | null>(null);

  const [targetAudience, setTargetAudience] = useState('');
  const [language, setLanguage] = useState('');

  // Production strategy fields
  const [locationStrategy, setLocationStrategy] = useState('open');
  const [territoriesConsidering, setTerritoriesConsidering] = useState<string[]>(['United Kingdom', 'Malta', 'Hungary']);
  const [productionPriority, setProductionPriority] = useState('full');

  // ✅ SECTION 2a: Genre options - expanded list (no pre-selection)
  const genreOptions = [
    'Drama', 'Thriller', 'Sci-Fi', 'Horror', 'Comedy', 'Romance', 'Action',
    'Adventure', 'Fantasy', 'Mystery', 'Documentary', 'Biopic', 'Period',
    'Western', 'Animation', 'Musical', 'Crime', 'War', 'Sports', 'Family'
  ];

  // ✅ SECTION 2c: Format options - expanded list
  const formatOptions = [
    'Feature Film', 'Short Film', 'TV Series', 'Limited Series', 'Mini-Series',
    'Documentary', 'Docuseries', 'Animation', 'Animated Feature', 'Animation Series',
    'Commercial', 'Music Video', 'Interactive', 'VR',
  ];

  // ✅ SECTION 2e: Camera equipment - full expanded list
  // ANNOTATION: Multi-select up to 3 cameras. Reflects real production practice.
  // Camera flags: Film (35mm/16mm) → lab processing costs; IMAX → certified facility availability; 
  // DJI Drone → permit requirements; multiple selections → combined transport & insurance costs
  const cameraOptions = [
    'ARRI Alexa 35', 'RED V-RAPTOR', 'Sony VENICE 2', 'Film 35mm',
    'Blackmagic Cinema', 'Canon C70', 'Sony FX9', 'Panavision', 'IMAX',
    'DJI Drone', 'GoPro', 'iPhone', 'Sony Alpha', 'Sony A7S III',
    'Canon EOS R5', 'Phantom High Speed', 'Kinefinity Terra', 'Other',
  ];

  // State/Province options based on country
  const usaStates = [
    'California', 'New York', 'Georgia', 'Louisiana', 'New Mexico', 'Texas',
    'North Carolina', 'Massachusetts', 'Illinois', 'Pennsylvania', 'Florida',
    'Oregon', 'Washington', 'Nevada', 'Utah', 'Colorado', 'Other'
  ];

  const canadaProvinces = [
    'British Columbia', 'Ontario', 'Quebec', 'Alberta', 'Manitoba',
    'Nova Scotia', 'Saskatchewan', 'New Brunswick', 'Other'
  ];

  const australiaStates = [
    'New South Wales', 'Victoria', 'Queensland', 'South Australia',
    'Western Australia', 'Tasmania', 'Other'
  ];

  // Get state/province options based on selected country
  const getStateProvinceOptions = () => {
    switch (country) {
      case 'United States': return usaStates;
      case 'Canada':        return canadaProvinces;
      case 'Australia':     return australiaStates;
      default: return [];
    }
  };

  // Show state/province field for countries with regional incentives
  const showStateProvince = ['United States', 'Canada', 'Australia'].includes(country);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF, DOCX, or TXT file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB');
        return;
      }
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      setError('');
    }
  };

  const validateForm = (requireFile = true) => {
    if (requireFile && !file) return 'Please upload a script file';
    if (!title) return 'Project title is required';
    if (genres.length === 0) return 'Please select at least one genre';
    if (!budgetAmount || Number(budgetAmount) <= 0) return 'Please enter a budget amount greater than 0';
    if (!format) return 'Format is required';
    if (!country) return 'Primary production country is required';
    return null;
  };

  const handleGenerateReport = () => {
    if (!isAuthenticated) {
      // Preview — file not required
      const validationError = validateForm(false);
      if (validationError) {
        setError(validationError);
        return;
      }
      setEmailModalOpen(true);
    } else {
      // Full report — file required
      const validationError = validateForm(true);
      if (validationError) {
        setError(validationError);
        return;
      }
      if (!user || (user.plan === 'free' && user.reportsUsed >= 1)) {
        setError('You have used your free report. Please upgrade to continue.');
        navigate('/pricing');
        return;
      }
      runFullAnalysis();
    }
  };

  const runFullAnalysis = async () => {
    setProcessing(true);
    setError('');

    try {
      const metadata: ScriptMetadata = {
        title,
        genre: genres,
        budgetAmount: Number(budgetAmount),
        budgetCurrency,
        format,
        country,
        locationStrategy,
        productionPriority,
        stateProvince: stateProvince || undefined,
        territoriesConsidering: territoriesConsidering.length ? territoriesConsidering : undefined,
        filmingStart: filmingStart || undefined,
        filmingDuration: filmingDuration || undefined,
        cameraEquipment: cameraEquipment.length ? cameraEquipment : undefined,
        crewSize: crewSize ? Number(crewSize) : undefined,
        principalCast: principalCast ? Number(principalCast) : undefined,
        supportingCast: supportingCast ? Number(supportingCast) : undefined,
        targetAudience: targetAudience || undefined,
        language: language || undefined,
      };

      await generateAnalysis(file!, metadata);
      navigate('/report/full');
    } catch (err: any) {
      if (err instanceof ReportTimeoutError) {
        setTimedOutReportId(err.reportId);
        setTimeoutModalOpen(true);
      } else {
        setError(err.message || 'Failed to generate report. Please try again.');
      }
      setProcessing(false);
    }
  };

  const handleFreePreview = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy to continue');
      return;
    }

    if (hasUsedFreeReport(email)) {
      setError('This email has already been used for a free preview. Please sign up to continue.');
      return;
    }

    setEmailModalOpen(false);
    setProcessing(true);
    setError('');

    try {
      const metadata: ScriptMetadata = {
        title,
        genre: genres,
        budgetAmount: Number(budgetAmount),
        budgetCurrency,
        format,
        country,
        locationStrategy,
        productionPriority,
        stateProvince: stateProvince || undefined,
        territoriesConsidering: territoriesConsidering.length ? territoriesConsidering : undefined,
        filmingStart: filmingStart || undefined,
        filmingDuration: filmingDuration || undefined,
        cameraEquipment: cameraEquipment.length ? cameraEquipment : undefined,
        crewSize: crewSize ? Number(crewSize) : undefined,
        principalCast: principalCast ? Number(principalCast) : undefined,
        supportingCast: supportingCast ? Number(supportingCast) : undefined,
        targetAudience: targetAudience || undefined,
        language: language || undefined,
      };

      await generatePreview(metadata);
      markFreeReportUsed(email);
      navigate('/report/preview');
    } catch (err: any) {
      console.error('Preview generation failed:', err);
      setError(err.message || 'Failed to generate preview. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#000000', minHeight: '100vh' }}>
      {/* Header */}
      <Box 
        sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.98)', 
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          py: 2,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <img 
                src={exampleLogo} 
                alt="Prodculator" 
                style={{ height: '32px', width: 'auto', cursor: 'pointer' }}
                onClick={() => navigate('/')}
              />
            </Box>
            <Button 
              startIcon={<ArrowBack />} 
              onClick={() => navigate('/')}
              sx={{
                color: '#000000',
                fontWeight: 500,
                '&:hover': { bgcolor: 'transparent' }
              }}
            >
              Back to Home
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1, color: '#ffffff' }}>
          Production Analysis Engine
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: '#a0a0a0' }}>
          Upload your script to receive investor-ready intelligence reports on locations, incentives, and costs.
        </Typography>

        {processing && (
          <Paper sx={{ p: 4, mb: 4, textAlign: 'center', bgcolor: '#0a0a0a', border: '1px solid #D4AF37' }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
              Analyzing script structure, production needs, and location efficiency…
            </Typography>
            <LinearProgress 
              sx={{ 
                my: 2,
                bgcolor: 'rgba(212, 175, 55, 0.2)',
                '& .MuiLinearProgress-bar': { bgcolor: '#D4AF37' }
              }} 
            />
            <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
            Scriptelligence is parsing your script for location cues and technical requirements. This will take a few minutes.     
            </Typography>
          </Paper>
        )}

        {!processing && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(212, 24, 61, 0.1)', color: '#ff5555' }}>
                  {error}
                </Alert>
              )}

              {/* File Upload Section */}
              <Paper sx={{ p: 4, mb: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <Box
                  sx={{
                    border: 2,
                    borderStyle: 'dashed',
                    borderColor: file ? '#4caf50' : 'rgba(212, 175, 55, 0.3)',
                    borderRadius: 1,
                    p: 4,
                    textAlign: 'center',
                    bgcolor: file ? 'rgba(76, 175, 80, 0.05)' : '#000000',
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#D4AF37' },
                  }}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input id="file-input" type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={handleFileSelect} />
                  {file ? (
                    <>
                      <CheckCircle sx={{ fontSize: 48, color: '#4caf50', mb: 2 }} />
                      <Typography variant="h6" sx={{ color: '#ffffff' }}>{file.name}</Typography>
                      <Button variant="outlined" sx={{ mt: 2, color: '#D4AF37', borderColor: '#D4AF37' }} onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove</Button>
                    </>
                  ) : (
                    <>
                      <CloudUpload sx={{ fontSize: 48, color: '#D4AF37', mb: 2 }} />
                      <Typography variant="h6" sx={{ color: '#ffffff' }}>Click to upload or drag and drop script</Typography>
                      <Typography variant="body2" sx={{ color: '#a0a0a0' }}>PDF, DOCX, or TXT (max 10MB)</Typography>
                    </>
                  )}
                </Box>
              </Paper>

              {/* Production Intelligence Inputs */}
              <Paper sx={{ p: 4, mb: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 3, fontWeight: 600 }}>Production Intelligence Inputs</Typography>
                
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField 
                      fullWidth 
                      label="Project Title" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Genre(s)</InputLabel>
                      <Select<string[]>
                        multiple
                        value={genres}
                        onChange={(e) => setGenres(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        input={<OutlinedInput label="Genre(s)" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => <Chip key={value} label={value} size="small" sx={{ bgcolor: '#D4AF37', color: '#000' }} />)}
                          </Box>
                        )}
                      >
                        {genreOptions.map(g => (
                          <MenuItem key={g} value={g}>{g}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        value={budgetCurrency}
                        label="Currency"
                        onChange={(e) => setBudgetCurrency(e.target.value)}
                      >
                        {[
                          { value: 'GBP', label: '£ GBP' },
                          { value: 'USD', label: '$ USD' },
                          { value: 'EUR', label: '€ EUR' },
                          { value: 'ZAR', label: 'R ZAR' },
                          { value: 'CAD', label: '$ CAD' },
                          { value: 'AUD', label: '$ AUD' },
                          { value: 'NGN', label: '₦ NGN' },
                          { value: 'HUF', label: 'Ft HUF' },
                          { value: 'CZK', label: 'Kč CZK' },
                          { value: 'MAD', label: 'MAD' },
                          { value: 'NZD', label: '$ NZD' },
                          { value: 'RON', label: 'lei RON' },
                          { value: 'RSD', label: 'din RSD' },
                          { value: 'OTHER', label: 'Other' },
                        ].map((c) => (
                          <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label={
                        <>
                          Budget Amount
                          <InfoTip text="The actual total production budget figure — what you expect to spend making the film or series from first day of pre-production to picture lock. Not distribution or marketing." />
                        </>
                      }
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      inputProps={{ min: 1, step: 1 }}
                      placeholder="e.g. 3000000"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Format</InputLabel>
                      <Select 
                        value={format} 
                        label="Format" 
                        onChange={(e) => setFormat(e.target.value)}
                      >
                        {formatOptions.map(f => (
                          <MenuItem key={f} value={f}>{f}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Production Country</InputLabel>
                      <Select 
                        value={country} 
                        label="Production Country" 
                        onChange={(e) => setCountry(e.target.value)}
                      >
                        {countryOptions.map((t) => (
                          <MenuItem key={t.iso} value={t.label}>{t.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {showStateProvince && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>State/Province</InputLabel>
                        <Select 
                          value={stateProvince} 
                          label="State/Province" 
                          onChange={(e) => setStateProvince(e.target.value)}
                        >
                          {getStateProvinceOptions().map(s => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}

                  {/* Location Strategy */}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: '#a0a0a0', fontWeight: 600, mb: 1.5 }}>
                        Location strategy
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {[
                          { value: 'domestic', label: 'Shooting domestically' },
                          { value: 'open', label: 'Open to international' },
                          { value: 'international', label: 'Specifically international' },
                        ].map((strategy) => (
                          <Button
                            key={strategy.value}
                            variant={locationStrategy === strategy.value ? 'contained' : 'outlined'}
                            onClick={() => setLocationStrategy(strategy.value)}
                            sx={{
                              px: 2.5,
                              py: 1,
                              borderRadius: '20px',
                              textTransform: 'none',
                              fontSize: '0.95rem',
                              fontWeight: 500,
                              ...(locationStrategy === strategy.value ? {
                                bgcolor: '#D4AF37',
                                color: '#000000',
                                border: 'none',
                                '&:hover': { bgcolor: '#E5C158' },
                              } : {
                                borderColor: 'rgba(212, 175, 55, 0.5)',
                                color: '#D4AF37',
                                '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212, 175, 55, 0.1)' },
                              }),
                            }}
                          >
                            {strategy.label}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                  </Grid>

                  {/* Territories Considering */}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: '#a0a0a0', fontWeight: 600, mb: 1.5 }}>
                        Territories considering
                        <InfoTip text={TOOLTIP_TEXTS.territoriesConsidering} />
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {/* All 41 territories from API (countries + sub-territories) + "Open to all" sentinel */}
                        {[...allTerritories, { label: 'Open to all', iso: 'ALL', parent: null, isSubTerritory: false }].map((territory) => (
                          <Chip
                            key={territory.iso}
                            label={territory.label}
                            onClick={() => {
                              if (territory.label === 'Open to all') {
                                setTerritoriesConsidering(['Open to all']);
                              } else if (territoriesConsidering.includes(territory.label)) {
                                setTerritoriesConsidering(territoriesConsidering.filter(t => t !== territory.label));
                              } else {
                                setTerritoriesConsidering([...territoriesConsidering.filter(t => t !== 'Open to all'), territory.label]);
                              }
                            }}
                            sx={{
                              px: 1.5,
                              height: 32,
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              ...(territoriesConsidering.includes(territory.label) ? {
                                bgcolor: '#D4AF37',
                                color: '#000000',
                                '&:hover': { bgcolor: '#E5C158' },
                              } : {
                                bgcolor: 'rgba(212, 175, 55, 0.1)',
                                color: '#D4AF37',
                                border: '1px solid rgba(212, 175, 55, 0.5)',
                                opacity: territoriesConsidering.includes('Open to all') ? 0.5 : 1,
                                '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212, 175, 55, 0.2)' },
                              }),
                            }}
                          />
                        ))}
                      </Box>
                      {territoriesConsidering.includes('Open to all') && (
                        <Typography variant="caption" sx={{ color: '#4caf50', display: 'block', mt: 1 }}>
                          We'll rank all 15 territories and recommend the best fit.
                        </Typography>
                      )}
                    </Box>
                  </Grid>

                  {/* Production Priority */}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: '#a0a0a0', fontWeight: 600, mb: 1.5 }}>
                        Production priority
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {[
                          { value: 'incentive', label: 'Maximise incentive return' },
                          { value: 'full', label: 'Full picture — financial, creative and quality', badge: 'DEFAULT' },
                          { value: 'location', label: 'Location and creative fit first' },
                        ].map((priority) => (
                          <Box
                            key={priority.value}
                            onClick={() => setProductionPriority(priority.value)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              p: 1.5,
                              bgcolor: 'rgba(212, 175, 55, 0.05)',
                              border: productionPriority === priority.value ? '2px solid #D4AF37' : '1px solid rgba(212, 175, 55, 0.3)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212, 175, 55, 0.1)' },
                            }}
                          >
                            <Box
                              sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                border: productionPriority === priority.value ? '6px solid #D4AF37' : '2px solid rgba(212, 175, 55, 0.5)',
                                flexShrink: 0,
                              }}
                            />
                            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: '0.95rem', color: '#ffffff' }}>
                              {priority.label}
                            </Typography>
                            {priority.badge && (
                              <Chip
                                label={priority.badge}
                                size="small"
                                sx={{
                                  bgcolor: '#D4AF37',
                                  color: '#000000',
                                  fontWeight: 600,
                                  fontSize: '0.65rem',
                                  height: 20,
                                }}
                              />
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField 
                      fullWidth 
                      type="date" 
                      label="Filming Start" 
                      InputLabelProps={{ shrink: true }} 
                      value={filmingStart} 
                      onChange={(e) => setFilmingStart(e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField 
                      fullWidth 
                      label="Filming Duration (Weeks)" 
                      type="number" 
                      value={filmingDuration} 
                      onChange={(e) => setFilmingDuration(e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Camera Equipment</InputLabel>
                      <Select<string[]>
                        multiple
                        value={cameraEquipment}
                        onChange={(e) => setCameraEquipment(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        input={<OutlinedInput label="Camera Equipment" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => <Chip key={value} label={value} size="small" sx={{ bgcolor: '#D4AF37', color: '#000' }} />)}
                          </Box>
                        )}
                      >
                        {cameraOptions.map(c => (
                          <MenuItem key={c} value={c}>{c}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField 
                      fullWidth 
                      label="Crew Size" 
                      type="number" 
                      value={crewSize} 
                      onChange={(e) => setCrewSize(e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField 
                      fullWidth 
                      label="Principal Cast" 
                      type="number" 
                      value={principalCast} 
                      onChange={(e) => setPrincipalCast(e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Supporting Cast"
                      type="number"
                      value={supportingCast}
                      onChange={(e) => setSupportingCast(e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Target Audience"
                      placeholder="e.g. 18-34, arthouse"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Primary Language"
                      placeholder="e.g. English"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Generate Report Button */}
              <Paper sx={{ p: 4, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  size="large"
                  onClick={handleGenerateReport}
                  sx={{ 
                    py: 2, 
                    fontSize: '1.1rem',
                    bgcolor: '#D4AF37',
                    color: '#000000',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#E5C158' }
                  }}
                >
                  {isAuthenticated ? 'Generate Intelligence Report' : 'See Free Preview Analysis'}
                </Button>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>

      {/* Email Modal for Free Preview */}
      <Dialog open={emailModalOpen} onClose={() => setEmailModalOpen(false)} PaperProps={{ sx: { bgcolor: '#1a1a1a', border: '1px solid #D4AF37' } }}>
        <DialogTitle sx={{ color: '#D4AF37' }}>Free Production Preview</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 3 }}>
            Get a teaser of your script's location ranking and tax incentive potential. Full reports require a professional account.
          </Typography>
          <TextField
            fullWidth
            label="Business Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={<Checkbox checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} sx={{ color: '#D4AF37' }} />}
            label={
              <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                I agree to the Terms of Service and Privacy Policy. I understand this is a preview and non-commercial data.
              </Typography>
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEmailModalOpen(false)} sx={{ color: '#a0a0a0' }}>Cancel</Button>
          <Button variant="contained" onClick={handleFreePreview}>Get Free Preview</Button>
        </DialogActions>
      </Dialog>

      {/* Report Generation Timeout Modal */}
      <Dialog
        open={timeoutModalOpen}
        onClose={() => {}} // intentionally non-dismissable — user must take action
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <HourglassEmpty sx={{ color: '#D4AF37', fontSize: 28 }} />
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600 }}>
              Report Generation In Progress
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Box
            sx={{
              p: 2,
              mb: 2.5,
              bgcolor: 'rgba(212, 175, 55, 0.07)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: '#a0a0a0', lineHeight: 1.7 }}>
              Your report is still being generated. Our AI engine is processing complex script
              data across multiple territories — this can occasionally take longer than expected
              depending on demand.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
            <Email sx={{ color: '#D4AF37', mt: 0.25, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: '#cccccc', lineHeight: 1.7 }}>
              <strong style={{ color: '#ffffff' }}>You'll receive an email</strong> as soon as
              your report is ready. No action is needed — just check your inbox.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <Dashboard sx={{ color: '#D4AF37', mt: 0.25, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: '#cccccc', lineHeight: 1.7 }}>
              You can also track the progress of this report from your{' '}
              <strong style={{ color: '#ffffff' }}>Dashboard</strong> at any time.
              {/* {timedOutReportId && (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ display: 'block', color: '#666', mt: 0.5, fontFamily: 'monospace' }}
                >
                  Report ID: {timedOutReportId}
                </Typography>
              )} */}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => {
              setTimeoutModalOpen(false);
              navigate('/dashboard');
            }}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              fontWeight: 700,
              py: 1.5,
              fontSize: '1rem',
              '&:hover': { bgcolor: '#E5C158' },
            }}
          >
            Go to Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}