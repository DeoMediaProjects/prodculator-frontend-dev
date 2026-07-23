import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Checkbox,
  ListItemText,
  FormHelperText,
  FormControlLabel,
  Link,
  Skeleton,
} from '@mui/material';

// Caps long dropdown menus so they scroll inside a fixed container instead of
// covering the page (e.g. the 20-item Genre list).
// Shared menu props for every dropdown. The key fix for the "floating menu"
// bug is `variant: 'menu'` — MUI's default Select variant is 'selectedMenu',
// which runs its own positioning logic (aligning the selected row over the
// anchor) and IGNORES anchorOrigin/transformOrigin, so the popover lands in
// the wrong place and drifts on scroll. 'menu' uses plain anchor-based
// positioning: the list opens directly below the field, capped in height so
// long lists scroll inside the menu rather than pushing the page.
const SCROLLABLE_MENU = {
  variant: 'menu',
  PaperProps: { sx: { maxHeight: 320 } },
  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
  transformOrigin: { vertical: 'top', horizontal: 'left' },
} as const;
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
import { databaseService } from '@/services/database.service';
import { InfoTip, TOOLTIP_TEXTS } from '@/app/components/common/InfoTip';
import { useToast } from '@/app/hooks/useToast';
import { useTerritories } from '@/app/hooks/useTerritories';
import { usePlanGate } from '@/app/hooks/usePlanGate';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';

// Territory picker grouping: continent → country, with sub-regions (e.g.
// California) nested under their parent country via Territory.parent.
const CONTINENT_ORDER = ['Europe', 'North America', 'Africa', 'Asia', 'Oceania', 'South America', 'Other'] as const;
const CONTINENT_BY_COUNTRY: Record<string, string> = {
  'United Kingdom': 'Europe', 'Ireland': 'Europe', 'France': 'Europe', 'Germany': 'Europe',
  'Spain': 'Europe', 'Italy': 'Europe', 'Malta': 'Europe', 'Czech Republic': 'Europe',
  'Hungary': 'Europe', 'Belgium': 'Europe', 'Netherlands': 'Europe', 'Portugal': 'Europe',
  'Romania': 'Europe', 'Serbia': 'Europe', 'Iceland': 'Europe',
  'United States': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
  'South Africa': 'Africa', 'Morocco': 'Africa', 'Nigeria': 'Africa',
  'India': 'Asia', 'Japan': 'Asia', 'South Korea': 'Asia', 'Singapore': 'Asia',
  'Australia': 'Oceania', 'New Zealand': 'Oceania',
  'Brazil': 'South America',
};

// Suggested budget currency by production country. Every country in the picker
// maps to a value in the backend's accepted currency set (see budget_currency
// Literal in reports/schemas.py). Countries whose local currency has no backend
// FX rate (INR, MXN, BRL) map to 'OTHER' rather than an unsupported code.
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  'United Kingdom': 'GBP',
  'Ireland': 'EUR', 'France': 'EUR', 'Germany': 'EUR', 'Spain': 'EUR', 'Italy': 'EUR',
  'Malta': 'EUR', 'Belgium': 'EUR', 'Netherlands': 'EUR', 'Portugal': 'EUR',
  'United States': 'USD', 'Canada': 'CAD', 'Australia': 'AUD', 'New Zealand': 'NZD',
  'Nigeria': 'NGN', 'South Africa': 'ZAR', 'Hungary': 'HUF', 'Czech Republic': 'CZK',
  'Morocco': 'MAD', 'Romania': 'RON', 'Serbia': 'RSD', 'Iceland': 'ISK',
  'Japan': 'JPY', 'South Korea': 'KRW', 'Singapore': 'SGD',
  'India': 'INR', 'Mexico': 'MXN', 'Brazil': 'BRL',
};

export function ScriptUpload() {
  const navigate = useNavigate();
  const { generateAnalysis, generatePreview } = useScript();
  const { isAuthenticated, hasUsedFreeReport, markFreeReportUsed } = useAuth();
  const { showError } = useToast();
  const { countries: countryOptions, territories: allTerritories, loading: territoriesLoading } = useTerritories();
  const { isFree, isProducer } = usePlanGate();
  const maxTerritories = isFree ? 3 : !isProducer ? 5 : null; // null = unlimited (Producer+)

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [budgetAmount, setBudgetAmount] = useState<number | ''>('');
  // No hardcoded default — the currency is suggested from the Production
  // Country (see effect below) and must be explicitly present before submit.
  const [budgetCurrency, setBudgetCurrency] = useState('');
  const [format, setFormat] = useState('');
  const [country, setCountry] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [cameraEquipment, setCameraEquipment] = useState<string[]>([]);
  const [crewSize, setCrewSize] = useState('');
  const [principalCast, setPrincipalCast] = useState('');
  const [supportingCast, setSupportingCast] = useState('');
  const [filmingStart, setFilmingStart] = useState('');
  const [filmingDuration, setFilmingDuration] = useState('');
  // Intake contract fields (intake_schema.json)
  const [completionDate, setCompletionDate] = useState('');
  const [mustFilmIn, setMustFilmIn] = useState('');
  const [coProductionInterest, setCoProductionInterest] = useState('');
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  // The skew dropdown includes "LGBTQ+ audience" which is a SEGMENT, not a skew —
  // routed into audience_segments at submit, never into audience_skew.
  const [audienceSkewChoice, setAudienceSkewChoice] = useState('');
  const [representationGender, setRepresentationGender] = useState('');
  const [representationMinority, setRepresentationMinority] = useState<string[]>([]);
  
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  // Synchronous in-flight guard against double-submit (see handleGenerateReport).
  const submittingRef = useRef(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Business Intelligence consent — OPTIONAL opt-in, separate from the required
  // terms acceptance. Never blocks report generation.
  const [biConsent, setBiConsent] = useState(false);
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    databaseService.canGenerateReport('').then(({ canGenerate }) => {
      if (!canGenerate) setQuotaBlocked(true);
    });
  }, [isAuthenticated]);

  // Prefill Expected Completion from Filming Start + Duration using the same
  // formula as the festival-matching engine: shoot end + 20 weeks post-
  // production. Only overwrites values we suggested ourselves, so a date the
  // user typed manually is never clobbered.
  const lastSuggestedCompletion = useRef('');
  useEffect(() => {
    if (!filmingStart || !filmingDuration) return;
    const weeks = Number(filmingDuration);
    if (!Number.isFinite(weeks) || weeks <= 0) return;
    const start = new Date(filmingStart);
    if (Number.isNaN(start.getTime())) return;
    const POST_PRODUCTION_WEEKS = 20;
    const completion = new Date(start.getTime() + (weeks + POST_PRODUCTION_WEEKS) * 7 * 86400_000);
    const suggested = completion.toISOString().slice(0, 10);
    if (completionDate === '' || completionDate === lastSuggestedCompletion.current) {
      setCompletionDate(suggested);
      lastSuggestedCompletion.current = suggested;
    }
  }, [filmingStart, filmingDuration]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suggest the budget currency from the selected Production Country (the script
  // itself isn't analysed until after Generate, so country is the signal we have
  // at form time). Only overwrites a value we suggested — a manual choice stays.
  const lastAutoCurrency = useRef('');
  useEffect(() => {
    if (!country) return;
    const suggested = CURRENCY_BY_COUNTRY[country];
    if (!suggested) return;
    if (budgetCurrency === '' || budgetCurrency === lastAutoCurrency.current) {
      setBudgetCurrency(suggested);
      lastAutoCurrency.current = suggested;
    }
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timeout modal — shown when report generation is still running after the polling window
  const [timeoutModalOpen, setTimeoutModalOpen] = useState(false);
  const [_timedOutReportId, setTimedOutReportId] = useState<string | null>(null);

  // Primary languages: free-text entries per the contract (max 5), captured
  // comma-separated and split at submit.
  const [languagesInput, setLanguagesInput] = useState('');
  const primaryLanguages = languagesInput
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5);

  // Production strategy fields
  // Location strategy removed — it was redundant with "Territories considering"
  // (the engine already treats an absent strategy as "open").
  const [territoriesConsidering, setTerritoriesConsidering] = useState<string[]>([]);
  const [productionPriority, setProductionPriority] = useState('full');

  // ✅ SECTION 2a: Genre options - expanded list (no pre-selection)
  const genreOptions = [
    'Drama', 'Thriller', 'Sci Fi', 'Horror', 'Comedy', 'Romance', 'Action',
    'Adventure', 'Fantasy', 'Mystery', 'Documentary', 'Biopic', 'Period',
    'Western', 'Animation', 'Musical', 'Crime', 'War', 'Sports', 'Family'
  ];

  // Format options per the intake contract (intake_schema.json) — 7 options,
  // each mapping to a canonical value the matchers' hard gates support.
  // (Legacy options Commercial/Music Video/Interactive/VR etc. removed per
  // contract; backend still accepts them on old reports.)
  const formatOptions = [
    'Feature Film', 'TV Series', 'TV Pilot', 'Limited Series', 'Short',
    'Documentary', 'Animated Feature',
  ];

  // ✅ SECTION 2e: Camera equipment - full expanded list
  // ANNOTATION: Multi-select up to 3 cameras. Reflects real production practice.
  // Camera flags: Film (35mm/16mm) → lab processing costs; IMAX → certified facility availability; 
  // DJI Drone → permit requirements; multiple selections → combined transport & insurance costs
  const cameraOptions = [
    'ARRI Alexa 35', 'RED VRAPTOR', 'Sony VENICE 2', 'Film 35mm',
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
        showError('Please upload a PDF, DOCX, or TXT file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        showError('File size must be under 10MB');
        return;
      }
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const validateForm = (requireFile = true) => {
    if (requireFile && !file) return 'Please upload a script file';
    if (!title) return 'Project title is required';
    if (genres.length === 0) return 'Please select at least one genre';
    if (!budgetAmount || Number(budgetAmount) <= 0) return 'Please enter a budget amount greater than 0';
    if (!format) return 'Format is required';
    if (!country) return 'Primary production country is required';
    if (!completionDate) return 'Expected completion date is required';
    if (!budgetCurrency) return 'Please select a currency';
    return null;
  };

  // Mandatory-field completeness — drives the Generate button's disabled state
  // and the "missing" hint. Mirrors validateForm(), which stays as the
  // belt-and-braces check at submit time.
  const missingFields: string[] = [
    ...(isAuthenticated && !file ? ['Script file'] : []),
    ...(!title ? ['Project title'] : []),
    ...(genres.length === 0 ? ['Genre(s)'] : []),
    ...(!budgetAmount || Number(budgetAmount) <= 0 ? ['Budget amount'] : []),
    ...(!format ? ['Format'] : []),
    ...(!country ? ['Production country'] : []),
    ...(!budgetCurrency ? ['Currency'] : []),
    ...(!completionDate ? ['Expected completion'] : []),
  ];
  const formComplete = missingFields.length === 0;

  // Group territories continent → country, nesting sub-regions under their parent.
  const territoryGroups = useMemo(() => {
    const countries = allTerritories.filter((t) => !t.isSubTerritory);
    const subs = allTerritories.filter((t) => t.isSubTerritory);
    const byContinent = new Map<string, { country: typeof countries[number]; regions: typeof subs }[]>();
    for (const c of countries) {
      const cont = CONTINENT_BY_COUNTRY[c.label] || 'Other';
      if (!byContinent.has(cont)) byContinent.set(cont, []);
      byContinent.get(cont)!.push({ country: c, regions: subs.filter((s) => s.parent === c.label) });
    }
    return CONTINENT_ORDER
      .filter((cont) => (byContinent.get(cont)?.length ?? 0) > 0)
      .map((cont) => ({
        continent: cont as string,
        countries: byContinent.get(cont)!.sort((a, b) => a.country.label.localeCompare(b.country.label)),
      }));
  }, [allTerritories]);

  const openToAll = territoriesConsidering.includes('Open to all');
  const atTerritoryLimit = maxTerritories !== null && territoriesConsidering.length >= maxTerritories;
  const toggleTerritory = (label: string) => {
    if (openToAll && label !== 'Open to all') return; // locked while "Open to all"
    if (label === 'Open to all') {
      setTerritoriesConsidering(openToAll ? [] : ['Open to all']);
      return;
    }
    if (territoriesConsidering.includes(label)) {
      setTerritoriesConsidering(territoriesConsidering.filter((t) => t !== label));
    } else if (!atTerritoryLimit) {
      setTerritoriesConsidering([...territoriesConsidering.filter((t) => t !== 'Open to all'), label]);
    }
  };

  // Shared intake-contract fields for both the full-report and preview flows.
  // Skew routing rule: "LGBTQ+ audience" is a segment, never a skew value.
  const contractFields = () => ({
    completionDate,
    mustFilmIn: mustFilmIn || undefined,
    coProductionInterest: (coProductionInterest || undefined) as 'yes' | 'no' | 'undecided' | undefined,
    targetAudience: targetAudience.length ? targetAudience : undefined,
    audienceSegments: audienceSkewChoice === 'lgbtq_audience' ? ['lgbtq_audience'] : undefined,
    audienceSkew: audienceSkewChoice && audienceSkewChoice !== 'lgbtq_audience' ? audienceSkewChoice : undefined,
    representationGender: representationGender || undefined,
    representationMinority: representationMinority.length ? representationMinority : undefined,
    primaryLanguages: primaryLanguages.length ? primaryLanguages : undefined,
  });

  const handleGenerateReport = async () => {
    // Synchronous re-entry guard: React state updates are async, so two rapid
    // clicks could both pass a state-based check before a re-render. A ref
    // blocks the second click immediately and prevents a double-submit.
    if (submittingRef.current) return;

    if (!isAuthenticated) {
      // Preview — file not required
      const validationError = validateForm(false);
      if (validationError) {
        showError(validationError);
        return;
      }
      setEmailModalOpen(true);
      return;
    }

    // Full report — file required
    const validationError = validateForm(true);
    if (validationError) {
      showError(validationError);
      return;
    }

    submittingRef.current = true;
    // Flip into the processing state immediately — before the async quota
    // check — so the form (and its button) is instantly replaced by the
    // "Analyzing…" panel and the user gets feedback that the click worked.
    setProcessing(true);
    try {
      const { canGenerate, reason } = await databaseService.canGenerateReport('');
      if (!canGenerate) {
        setProcessing(false);
        showError(reason || 'Please upgrade your plan to generate more reports.', {
          action: (
            <Button size="small" sx={{ color: '#fff', fontWeight: 600 }} onClick={() => navigate('/pricing')}>
              View Plans
            </Button>
          ),
          duration: 10000,
        });
        return;
      }
      await runFullAnalysis();
    } finally {
      submittingRef.current = false;
    }
  };

  const runFullAnalysis = async () => {
    setProcessing(true);

    try {
      const metadata: ScriptMetadata = {
        title,
        genre: genres,
        budgetAmount: Number(budgetAmount),
        budgetCurrency,
        format,
        country,
        productionPriority,
        stateProvince: stateProvince || undefined,
        territoriesConsidering: territoriesConsidering.length ? territoriesConsidering : undefined,
        filmingStart: filmingStart || undefined,
        filmingDuration: filmingDuration || undefined,
        cameraEquipment: cameraEquipment.length ? cameraEquipment : undefined,
        crewSize: crewSize ? Number(crewSize) : undefined,
        principalCast: principalCast ? Number(principalCast) : undefined,
        supportingCast: supportingCast ? Number(supportingCast) : undefined,
        ...contractFields(),
        biConsent,
      };

      const generated = await generateAnalysis(file!, metadata);
      if (!generated.id) {
        throw new Error('Report completed but did not return a report ID.');
      }
      // Reset consent so each upload is its own explicit processing/consent event.
      setAcceptedTerms(false);
      setBiConsent(false);
      navigate(`/report/${generated.id}`);
    } catch (err: any) {
      if (err instanceof ReportTimeoutError) {
        setTimedOutReportId(err.reportId);
        setTimeoutModalOpen(true);
      } else {
        const msg: string = err.message || 'Failed to generate report. Please try again.';
        const isLimit =
          msg.toLowerCase().includes('upgrade') ||
          msg.toLowerCase().includes('limit reached') ||
          msg.toLowerCase().includes('free report already used');
        showError(msg, isLimit ? {
          action: (
            <Button size="small" sx={{ color: '#fff', fontWeight: 600 }} onClick={() => navigate('/pricing')}>
              View Plans
            </Button>
          ),
          duration: 10000,
        } : undefined);
      }
      setProcessing(false);
    }
  };

  const handleFreePreview = async () => {
    if (submittingRef.current) return;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('Please enter a valid email address');
      return;
    }

    if (!acceptedTerms) {
      showError('Please accept the Terms of Service and Privacy Policy to continue');
      return;
    }

    if (hasUsedFreeReport(email)) {
      showError('This email has already been used for a free preview. Please sign up to continue.');
      return;
    }

    submittingRef.current = true;
    setEmailModalOpen(false);
    setProcessing(true);

    try {
      const metadata: ScriptMetadata = {
        title,
        genre: genres,
        budgetAmount: Number(budgetAmount),
        budgetCurrency,
        format,
        country,
        productionPriority,
        stateProvince: stateProvince || undefined,
        territoriesConsidering: territoriesConsidering.length ? territoriesConsidering : undefined,
        filmingStart: filmingStart || undefined,
        filmingDuration: filmingDuration || undefined,
        cameraEquipment: cameraEquipment.length ? cameraEquipment : undefined,
        crewSize: crewSize ? Number(crewSize) : undefined,
        principalCast: principalCast ? Number(principalCast) : undefined,
        supportingCast: supportingCast ? Number(supportingCast) : undefined,
        ...contractFields(),
        email,
        biConsent,
      };

      await generatePreview(metadata);
      markFreeReportUsed(email);
      navigate('/report/preview');
    } catch (err: any) {
      console.error('Preview generation failed:', err);
      showError(err.message || 'Failed to generate preview. Please try again.');
      setProcessing(false);
      submittingRef.current = false;
    }
  };

  return (
    <Box sx={{ bgcolor: '#000000', minHeight: '100dvh' }}>
      {/* Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          bgcolor: 'rgba(255, 255, 255, 0.98)',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          py: 2,
        }}
      >
        <Container maxWidth="xl">
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

      <Container maxWidth="xl" sx={{ py: 6 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 1, color: '#ffffff', textAlign: 'center' }}>
          Production Analysis Engine
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: '#a0a0a0', textAlign: 'center' }}>
          Upload your script to receive investor ready intelligence reports on locations, incentives, and costs.
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
              {/* File Upload Section */}
              <Paper sx={{ p: { xs: 2, sm: 4 }, mb: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
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
              <Paper sx={{ p: { xs: 2, sm: 4 }, mb: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <Typography variant="h6" sx={{ color: '#ffffff', mb: 3, fontWeight: 600 }}>Production Intelligence Inputs</Typography>
                
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      required
                      label="Project Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required>
                      <InputLabel>Genre(s)</InputLabel>
                      <Select<string[]>
                        multiple
                        value={genres}
                        onChange={(e) => setGenres(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        input={<OutlinedInput label="Genre(s)" />}
                        MenuProps={SCROLLABLE_MENU}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => <Chip key={value} label={value} size="small" sx={{ bgcolor: '#D4AF37', color: '#000' }} />)}
                          </Box>
                        )}
                      >
                        {genreOptions.map(g => (
                          <MenuItem key={g} value={g}>
                            <Checkbox checked={genres.includes(g)} size="small" sx={{ color: '#D4AF37', '&.Mui-checked': { color: '#D4AF37' }, py: 0.25 }} />
                            <ListItemText primary={g} />
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText sx={{ color: '#8a8a8a' }}>Select one or more</FormHelperText>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required>
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
                    <FormControl fullWidth required>
                      <InputLabel>Production Country<InfoTip text="Where you or your production company is based" /></InputLabel>
                      <Select
                        value={country}
                        label={<>Production Country<InfoTip text="Where you or your production company is based" /></>}
                        onChange={(e) => setCountry(e.target.value)}
                        MenuProps={SCROLLABLE_MENU}
                      >
                        {countryOptions.map((t) => (
                          <MenuItem key={t.iso} value={t.label}>{t.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        value={budgetCurrency}
                        label="Currency"
                        onChange={(e) => setBudgetCurrency(e.target.value)}
                        MenuProps={SCROLLABLE_MENU}
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
                          { value: 'ISK', label: 'kr ISK' },
                          { value: 'JPY', label: '¥ JPY' },
                          { value: 'KRW', label: '₩ KRW' },
                          { value: 'SGD', label: '$ SGD' },
                          { value: 'INR', label: '₹ INR' },
                          { value: 'MXN', label: 'Mex$ MXN' },
                          { value: 'BRL', label: 'R$ BRL' },
                          { value: 'OTHER', label: 'Other' },
                        ].map((c) => (
                          <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      required
                      label={
                        <>
                          Budget Amount
                          <InfoTip text="The actual total production budget figure, what you expect to spend making the film or series from first day of pre production to picture lock. Not distribution or marketing." />
                        </>
                      }
                      value={budgetAmount === '' ? '' : Number(budgetAmount).toLocaleString()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, '');
                        if (raw === '') { setBudgetAmount(''); return; }
                        const n = Number(raw);
                        if (!isNaN(n)) setBudgetAmount(n);
                      }}
                      placeholder="e.g. 3,000,000"
                    />
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

                  {/* Territories Considering */}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="body2" sx={{ color: '#a0a0a0', fontWeight: 600 }}>
                          Territories considering
                          <InfoTip text={TOOLTIP_TEXTS.territoriesConsidering} />
                        </Typography>
                        {maxTerritories !== null && !territoriesConsidering.includes('Open to all') && (
                          <Typography variant="caption" sx={{ color: territoriesConsidering.length >= maxTerritories ? '#D4AF37' : '#666' }}>
                            {territoriesConsidering.length}/{maxTerritories} selected
                          </Typography>
                        )}
                      </Box>
                      {/* Producer+ shortcut */}
                      {maxTerritories === null && (
                        <Chip
                          label={openToAll ? '✓ Open to all territories' : 'Open to all territories'}
                          onClick={() => toggleTerritory('Open to all')}
                          sx={{
                            mb: 2, px: 1.5, height: 34, fontWeight: 600, cursor: 'pointer',
                            ...(openToAll
                              ? { bgcolor: '#D4AF37', color: '#000', '&:hover': { bgcolor: '#D4AF37' } }
                              : { bgcolor: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.5)', '&:hover': { bgcolor: 'rgba(212,175,55,0.2)' } }),
                          }}
                        />
                      )}

                      {territoriesLoading ? (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {Array.from({ length: 10 }).map((_, i) => (
                            <Skeleton key={i} variant="rounded" width={80 + (i % 3) * 24} height={32}
                              sx={{ bgcolor: 'rgba(212, 175, 55, 0.08)', borderRadius: '16px' }} />
                          ))}
                        </Box>
                      ) : (
                        territoryGroups.map((group) => (
                          <Box key={group.continent} sx={{ mb: 2 }}>
                            <Typography variant="overline" sx={{ color: '#8a7a3a', letterSpacing: 1.2, display: 'block', mb: 1, borderBottom: '1px solid rgba(212,175,55,0.15)', pb: 0.5 }}>
                              {group.continent}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                              {group.countries.map(({ country: c }) => {
                                const selected = territoriesConsidering.includes(c.label);
                                const disabled = !selected && (openToAll || atTerritoryLimit);
                                return (
                                  <Chip
                                    key={c.iso}
                                    label={c.label}
                                    size="medium"
                                    onClick={() => { if (!disabled) toggleTerritory(c.label); }}
                                    sx={{
                                      height: 32,
                                      fontSize: '0.875rem',
                                      fontWeight: 500,
                                      cursor: disabled ? 'not-allowed' : 'pointer',
                                      transition: 'opacity 0.15s',
                                      ...(selected
                                        ? { bgcolor: '#D4AF37', color: '#000', '&:hover': { bgcolor: '#D4AF37' } }
                                        : {
                                            bgcolor: 'rgba(212,175,55,0.1)',
                                            color: '#D4AF37',
                                            border: '1px solid rgba(212,175,55,0.5)',
                                            opacity: disabled ? 0.3 : 1,
                                            '&:hover': disabled ? {} : { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.2)' },
                                          }),
                                    }}
                                  />
                                );
                              })}
                            </Box>
                            {/* Dynamic reveal: a country's regions only appear once
                                that country is selected, so the picker starts clean
                                and shows sub-territories in context. */}
                            {group.countries.map(({ country: c, regions }) => {
                              const anyRegionSelected = regions.some((r) => territoriesConsidering.includes(r.label));
                              const show = regions.length > 0 && (territoriesConsidering.includes(c.label) || anyRegionSelected);
                              if (!show) return null;
                              return (
                                <Box key={`${c.iso}-regions`} sx={{ mt: 1, ml: 1.5, pl: 1.5, borderLeft: '2px solid rgba(212,175,55,0.25)' }}>
                                  <Typography variant="caption" sx={{ color: '#8a8a8a', display: 'block', mb: 0.75 }}>
                                    Regions in {c.label} <span style={{ opacity: 0.7 }}>(optional — narrows the analysis)</span>
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                                    {regions.map((r) => {
                                      const rSelected = territoriesConsidering.includes(r.label);
                                      const rDisabled = !rSelected && (openToAll || atTerritoryLimit);
                                      return (
                                        <Chip
                                          key={r.iso}
                                          label={r.label}
                                          size="small"
                                          onClick={() => { if (!rDisabled) toggleTerritory(r.label); }}
                                          sx={{
                                            height: 26,
                                            fontSize: '0.75rem',
                                            fontWeight: 400,
                                            cursor: rDisabled ? 'not-allowed' : 'pointer',
                                            transition: 'opacity 0.15s',
                                            ...(rSelected
                                              ? { bgcolor: '#D4AF37', color: '#000', '&:hover': { bgcolor: '#D4AF37' } }
                                              : {
                                                  bgcolor: 'transparent',
                                                  color: '#D4AF37',
                                                  border: '1px solid rgba(212,175,55,0.3)',
                                                  opacity: rDisabled ? 0.3 : 1,
                                                  '&:hover': rDisabled ? {} : { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.2)' },
                                                }),
                                          }}
                                        />
                                      );
                                    })}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        ))
                      )}
                      {openToAll && (
                        <Typography variant="caption" sx={{ color: '#4caf50', display: 'block', mt: 1 }}>
                          We'll rank all available territories and recommend the best fit.
                        </Typography>
                      )}
                      {atTerritoryLimit && !openToAll && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                          <Typography variant="caption" sx={{ color: '#D4AF37' }}>
                            {isFree ? 'Explorer plan is limited to 3 territories.' : 'Professional plan is limited to 5 territories.'}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: '#D4AF37', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => navigate('/pricing')}
                          >
                            Upgrade for more
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>

                  {/* Production Priority */}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: '#a0a0a0', fontWeight: 600, mb: 1.5 }}>
                        Production priority<InfoTip text={TOOLTIP_TEXTS.productionPriority} />
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {[
                          { value: 'incentive', label: 'Maximise incentive return' },
                          { value: 'full', label: 'Full picture, financial, creative and quality', badge: 'DEFAULT' },
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
                      slotProps={{ inputLabel: { shrink: true } }}
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
                        MenuProps={SCROLLABLE_MENU}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => <Chip key={value} label={value} size="small" sx={{ bgcolor: '#D4AF37', color: '#000' }} />)}
                          </Box>
                        )}
                      >
                        {cameraOptions.map(c => (
                          <MenuItem key={c} value={c}>
                            <Checkbox checked={cameraEquipment.includes(c)} size="small" sx={{ color: '#D4AF37', '&.Mui-checked': { color: '#D4AF37' }, py: 0.25 }} />
                            <ListItemText primary={c} />
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText sx={{ color: '#8a8a8a' }}>Optional · select any that apply</FormHelperText>
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
                      type="date"
                      label={<>Expected Completion<InfoTip text="When you expect the finished film — drives festival submission-window matching." /></>}
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={completionDate}
                      onChange={(e) => setCompletionDate(e.target.value)}
                      required
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label={<>Primary Language(s)<InfoTip text="The primary spoken language(s) in your script. Separate with commas, up to 5." /></>}
                      placeholder="e.g. English, Yoruba"
                      value={languagesInput}
                      onChange={(e) => setLanguagesInput(e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label={<>Must Film In<InfoTip text="A territory you are contractually or creatively locked to, if any." /></>}
                      placeholder="e.g. Scotland"
                      value={mustFilmIn}
                      onChange={(e) => setMustFilmIn(e.target.value)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Open to Official Co-Production?</InputLabel>
                      <Select
                        value={coProductionInterest}
                        label="Open to Official Co-Production?"
                        onChange={(e) => setCoProductionInterest(e.target.value)}
                      >
                        <MenuItem value="">Not specified</MenuItem>
                        <MenuItem value="yes">Yes</MenuItem>
                        <MenuItem value="no">No</MenuItem>
                        <MenuItem value="undecided">Undecided</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Target Audience<InfoTip text="Who the film is for. Declared only — never guessed from genre." /></InputLabel>
                      <Select<string[]>
                        multiple
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        input={<OutlinedInput label="Target Audience" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip
                                key={value}
                                label={{ kids_family: 'Kids & Family', under_25: 'Under 25', adults_25_plus: 'Adults 25+' }[value] || value}
                                size="small"
                                sx={{ bgcolor: '#D4AF37', color: '#000' }}
                              />
                            ))}
                          </Box>
                        )}
                      >
                        {[
                          { v: 'kids_family', l: 'Kids & Family' },
                          { v: 'under_25', l: 'Under 25' },
                          { v: 'adults_25_plus', l: 'Adults 25+' },
                        ].map((o) => (
                          <MenuItem key={o.v} value={o.v}>
                            <Checkbox checked={targetAudience.includes(o.v)} size="small" sx={{ color: '#D4AF37', '&.Mui-checked': { color: '#D4AF37' }, py: 0.25 }} />
                            <ListItemText primary={o.l} />
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText sx={{ color: '#8a8a8a' }}>Optional · select any that apply</FormHelperText>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Audience Skew</InputLabel>
                      <Select
                        value={audienceSkewChoice}
                        label="Audience Skew"
                        onChange={(e) => setAudienceSkewChoice(e.target.value)}
                      >
                        <MenuItem value="">Not specified</MenuItem>
                        <MenuItem value="female_leaning">Female-leaning</MenuItem>
                        <MenuItem value="male_leaning">Male-leaning</MenuItem>
                        <MenuItem value="balanced">Balanced</MenuItem>
                        <MenuItem value="lgbtq_audience">LGBTQ+ audience</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Representation — strictly opt-in (who made the film, not who it is for).
                      Leaving these blank never affects matching. */}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ mt: 2, p: 2, border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '8px' }}>
                      <Typography variant="body2" sx={{ color: '#a0a0a0', fontWeight: 600, mb: 0.5 }}>
                        Representation (optional)
                        <InfoTip text="Who made the film. Strictly opt-in: only used to surface representation-focused festivals and distributors when you choose to share it. Leaving it blank changes nothing else." />
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 2 }}>
                        Share only if you want representation-focused festival and distributor matches.
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Director/Lead Creator Gender</InputLabel>
                            <Select
                              value={representationGender}
                              label="Director/Lead Creator Gender"
                              onChange={(e) => setRepresentationGender(e.target.value)}
                            >
                              <MenuItem value="">Prefer not to say</MenuItem>
                              <MenuItem value="Woman">Woman</MenuItem>
                              <MenuItem value="Man">Man</MenuItem>
                              <MenuItem value="Non-binary">Non-binary</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth>
                            <InputLabel>Creator Communities</InputLabel>
                            <Select<string[]>
                              multiple
                              value={representationMinority}
                              onChange={(e) => setRepresentationMinority(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                              input={<OutlinedInput label="Creator Communities" />}
                              MenuProps={SCROLLABLE_MENU}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {selected.map((value) => <Chip key={value} label={value} size="small" sx={{ bgcolor: '#D4AF37', color: '#000' }} />)}
                                </Box>
                              )}
                            >
                              {['LGBTQ+', 'Racial/Ethnic minority', 'Disability'].map((o) => (
                                <MenuItem key={o} value={o}>
                                  <Checkbox checked={representationMinority.includes(o)} size="small" sx={{ color: '#D4AF37', '&.Mui-checked': { color: '#D4AF37' }, py: 0.25 }} />
                                  <ListItemText primary={o} />
                                </MenuItem>
                              ))}
                            </Select>
                            <FormHelperText sx={{ color: '#8a8a8a' }}>Optional · select any that apply</FormHelperText>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Generate Report Button */}
              <Paper sx={{ p: { xs: 2, sm: 4 }, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                {isAuthenticated && quotaBlocked && (
                  <Alert
                    severity="warning"
                    sx={{ mb: 2, bgcolor: 'rgba(212,175,55,0.08)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', '& .MuiAlert-icon': { color: '#D4AF37' } }}
                    action={
                      <Button size="small" sx={{ color: '#D4AF37', fontWeight: 700, whiteSpace: 'nowrap' }} onClick={() => navigate('/pricing')}>
                        View Plans
                      </Button>
                    }
                  >
                    You've used your report limit. Upgrade to generate more.
                  </Alert>
                )}
                {isAuthenticated && (
                  <FormControlLabel
                    sx={{ mb: 2, alignItems: 'flex-start' }}
                    control={
                      <Checkbox
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        sx={{ color: '#D4AF37', mt: '-2px' }}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ color: '#a0a0a0', lineHeight: 1.6 }}>
                        By generating this report, I agree to the{' '}
                        <Link href="/terms" target="_blank" sx={{ color: '#D4AF37', textDecorationColor: '#D4AF37' }}>
                          Terms of Service
                        </Link>
                        ,{' '}
                        <Link href="/privacy" target="_blank" sx={{ color: '#D4AF37', textDecorationColor: '#D4AF37' }}>
                          Privacy Policy
                        </Link>
                        {' '}and{' '}
                        <Link href="/acceptable-use" target="_blank" sx={{ color: '#D4AF37', textDecorationColor: '#D4AF37' }}>
                          Acceptable Use Policy
                        </Link>
                        . This includes use of anonymised production metadata in aggregate market intelligence reports{' '}
                        <Link href="/terms#section-6-3" target="_blank" sx={{ color: '#D4AF37', textDecorationColor: '#D4AF37', fontSize: '0.7rem' }}>
                          (see §6.3)
                        </Link>
                        .
                      </Typography>
                    }
                  />
                )}
                {isAuthenticated && (
                  <FormControlLabel
                    sx={{ mb: 2, alignItems: 'flex-start' }}
                    control={
                      <Checkbox
                        checked={biConsent}
                        onChange={(e) => setBiConsent(e.target.checked)}
                        sx={{ color: '#D4AF37', mt: '-2px' }}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ color: '#a0a0a0', lineHeight: 1.6 }}>
                        {/* PLACEHOLDER consent copy — replace with solicitor wording when supplied. */}
                        Optional: I consent to Prodculator including this production's anonymised,
                        aggregated details (never the script itself) in Business Intelligence market
                        reports. You can withdraw consent by re-running the report with this box
                        unticked.
                      </Typography>
                    }
                  />
                )}
                {!formComplete && (
                  <Typography variant="caption" sx={{ color: '#D4AF37', display: 'block', mb: 1.5 }}>
                    Required to continue: {missingFields.join(', ')}
                  </Typography>
                )}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handleGenerateReport}
                  disabled={!formComplete || (isAuthenticated && quotaBlocked) || (isAuthenticated && !acceptedTerms)}
                  sx={{
                    py: 2,
                    fontSize: '1.1rem',
                    bgcolor: '#D4AF37',
                    color: '#000000',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#D4AF37' },
                    '&.Mui-disabled': { bgcolor: 'rgba(212,175,55,0.3)', color: 'rgba(0,0,0,0.4)' },
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
      <Dialog open={emailModalOpen} onClose={() => setEmailModalOpen(false)} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { bgcolor: '#1a1a1a', border: '1px solid #D4AF37', mx: { xs: 2, sm: 'auto' } } } }}>
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
            sx={{ alignItems: 'flex-start' }}
            control={<Checkbox checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} sx={{ color: '#D4AF37', mt: '-2px' }} />}
            label={
              <Typography variant="caption" sx={{ color: '#a0a0a0', lineHeight: 1.6 }}>
                By continuing, I agree to the{' '}
                <Link href="/terms" target="_blank" sx={{ color: '#D4AF37', textDecorationColor: '#D4AF37' }}>
                  Terms of Service
                </Link>
                ,{' '}
                <Link href="/privacy" target="_blank" sx={{ color: '#D4AF37', textDecorationColor: '#D4AF37' }}>
                  Privacy Policy
                </Link>
                {' '}and{' '}
                <Link href="/acceptable-use" target="_blank" sx={{ color: '#D4AF37', textDecorationColor: '#D4AF37' }}>
                  Acceptable Use Policy
                </Link>
                . This includes use of anonymised production metadata in aggregate market intelligence reports{' '}
                <Link href="/terms#section-6-3" target="_blank" sx={{ color: '#D4AF37', textDecorationColor: '#D4AF37', fontSize: '0.7rem' }}>
                  (see §6.3)
                </Link>
                .
              </Typography>
            }
          />
          <FormControlLabel
            sx={{ alignItems: 'flex-start', mt: 1 }}
            control={<Checkbox checked={biConsent} onChange={(e) => setBiConsent(e.target.checked)} sx={{ color: '#D4AF37', mt: '-2px' }} size="small" />}
            label={
              <Typography variant="caption" sx={{ color: '#a0a0a0', lineHeight: 1.6 }}>
                {/* PLACEHOLDER consent copy — replace with solicitor wording when supplied. */}
                Optional: I consent to Prodculator including this production's anonymised,
                aggregated details (never the script itself) in Business Intelligence market
                reports.
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
        slotProps={{ paper: {
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            borderRadius: 2,
          },
        } }}
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
              data across multiple territories, this can occasionally take longer than expected
              depending on script complexity and server load.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
            <Email sx={{ color: '#D4AF37', mt: 0.25, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: '#cccccc', lineHeight: 1.7 }}>
              <strong style={{ color: '#ffffff' }}>You'll receive an email</strong> as soon as
              your report is ready. No action is needed, just check your inbox.
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
              '&:hover': { bgcolor: '#D4AF37' },
            }}
          >
            Go to Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
