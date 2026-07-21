import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, TextField, MenuItem, FormControl, InputLabel, Select,
  OutlinedInput, Chip, Checkbox, ListItemText, FormHelperText, FormControlLabel, Link,
  CircularProgress, useMediaQuery, useTheme, Drawer, Badge,
} from '@mui/material';
import {
  ArrowBack, CloudUpload, CheckCircle, Close, LightModeOutlined, DarkModeOutlined,
  NotificationsNoneOutlined, Menu as MenuIcon, Check,
} from '@mui/icons-material';
import { useScript, ReportTimeoutError, type ScriptMetadata } from '@/app/contexts/ScriptContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { databaseService } from '@/services/database.service';
import { useToast } from '@/app/hooks/useToast';
import { useTerritories } from '@/app/hooks/useTerritories';
import { usePlanGate } from '@/app/hooks/usePlanGate';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { Sidebar, SIDEBAR_W } from './Sidebar';

// Continent grouping for the territory picker — identical mapping to ScriptUpload
// so the wizard yields the same intake payload the engine already understands.
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

const GENRE_OPTIONS = ['Drama', 'Thriller', 'Sci Fi', 'Horror', 'Comedy', 'Romance', 'Action', 'Adventure', 'Fantasy', 'Mystery', 'Documentary', 'Biopic', 'Period', 'Western', 'Animation', 'Musical', 'Crime', 'War', 'Sports', 'Family'];
const FORMAT_OPTIONS = ['Feature Film', 'TV Series', 'TV Pilot', 'Limited Series', 'Short', 'Documentary', 'Animated Feature'];
const CAMERA_OPTIONS = ['ARRI Alexa 35', 'RED VRAPTOR', 'Sony VENICE 2', 'Film 35mm', 'Blackmagic Cinema', 'Canon C70', 'Sony FX9', 'Panavision', 'IMAX', 'DJI Drone', 'GoPro', 'iPhone', 'Sony Alpha', 'Sony A7S III', 'Canon EOS R5', 'Phantom High Speed', 'Kinefinity Terra', 'Other'];
const USA_STATES = ['California', 'New York', 'Georgia', 'Louisiana', 'New Mexico', 'Texas', 'North Carolina', 'Massachusetts', 'Illinois', 'Pennsylvania', 'Florida', 'Oregon', 'Washington', 'Nevada', 'Utah', 'Colorado', 'Other'];
const CANADA_PROVINCES = ['British Columbia', 'Ontario', 'Quebec', 'Alberta', 'Manitoba', 'Nova Scotia', 'Saskatchewan', 'New Brunswick', 'Other'];
const AUSTRALIA_STATES = ['New South Wales', 'Victoria', 'Queensland', 'South Australia', 'Western Australia', 'Tasmania', 'Other'];
const CURRENCY_OPTIONS = [
  { value: 'GBP', label: '£ GBP' }, { value: 'USD', label: '$ USD' }, { value: 'EUR', label: '€ EUR' },
  { value: 'ZAR', label: 'R ZAR' }, { value: 'CAD', label: '$ CAD' }, { value: 'AUD', label: '$ AUD' },
  { value: 'NGN', label: '₦ NGN' }, { value: 'HUF', label: 'Ft HUF' }, { value: 'CZK', label: 'Kč CZK' },
  { value: 'MAD', label: 'MAD' }, { value: 'NZD', label: '$ NZD' }, { value: 'RON', label: 'lei RON' },
  { value: 'RSD', label: 'din RSD' }, { value: 'ISK', label: 'kr ISK' }, { value: 'JPY', label: '¥ JPY' },
  { value: 'KRW', label: '₩ KRW' }, { value: 'SGD', label: '$ SGD' }, { value: 'INR', label: '₹ INR' },
  { value: 'MXN', label: 'Mex$ MXN' }, { value: 'BRL', label: 'R$ BRL' }, { value: 'OTHER', label: 'Other' },
];
const PRIORITY_OPTIONS = [
  { value: 'incentive', label: 'Maximise incentive return' },
  { value: 'full', label: 'Full picture — financial, creative and quality', badge: 'DEFAULT' },
  { value: 'location', label: 'Location and creative fit first' },
];
const AUDIENCE_OPTIONS = [
  { v: 'kids_family', l: 'Kids & Family' },
  { v: 'under_25', l: 'Under 25' },
  { v: 'adults_25_plus', l: 'Adults 25+' },
];

const STEPS = [
  { key: 'script', title: 'Script & Project', subtitle: 'Upload your script and name the project' },
  { key: 'budget', title: 'Budget & Territories', subtitle: 'Where and at what scale you plan to produce' },
  { key: 'details', title: 'Production Details', subtitle: 'Schedule, crew and creative context' },
  { key: 'review', title: 'Review & Generate', subtitle: 'Confirm details and generate your report' },
];

export function AnalysisWizard() {
  const navigate = useNavigate();
  const { mode, toggle } = useThemeMode();
  const t = tokens(mode);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const { generateAnalysis } = useScript();
  const { isAuthenticated } = useAuth();
  const { showError } = useToast();
  const { territories: allTerritories } = useTerritories();
  const { isFree, isProducer } = usePlanGate();
  const maxTerritories = isFree ? 3 : !isProducer ? 5 : null;

  // Redirect anonymous users to sign in — the wizard is the authenticated flow.
  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  const [step, setStep] = useState(0);

  // ----- Intake state (mirrors ScriptUpload so the payload is unchanged) -----
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [budgetAmount, setBudgetAmount] = useState<number | ''>('');
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
  const [completionDate, setCompletionDate] = useState('');
  const [mustFilmIn, setMustFilmIn] = useState('');
  const [coProductionInterest, setCoProductionInterest] = useState('');
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [audienceSkewChoice, setAudienceSkewChoice] = useState('');
  const [representationGender, setRepresentationGender] = useState('');
  const [representationMinority, setRepresentationMinority] = useState<string[]>([]);
  const [languagesInput, setLanguagesInput] = useState('');
  const [territoriesConsidering, setTerritoriesConsidering] = useState<string[]>([]);
  const [productionPriority, setProductionPriority] = useState('full');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [biConsent, setBiConsent] = useState(false);
  const [processing, setProcessing] = useState(false);
  const submittingRef = useRef(false);

  const primaryLanguages = languagesInput.split(',').map((l) => l.trim()).filter(Boolean).slice(0, 5);

  // Auto-suggest completion date from filming start + duration (+20wk post).
  const lastSuggestedCompletion = useRef('');
  useEffect(() => {
    if (!filmingStart || !filmingDuration) return;
    const weeks = Number(filmingDuration);
    if (!Number.isFinite(weeks) || weeks <= 0) return;
    const start = new Date(filmingStart);
    if (Number.isNaN(start.getTime())) return;
    const completion = new Date(start.getTime() + (weeks + 20) * 7 * 86400_000);
    const suggested = completion.toISOString().slice(0, 10);
    if (completionDate === '' || completionDate === lastSuggestedCompletion.current) {
      setCompletionDate(suggested);
      lastSuggestedCompletion.current = suggested;
    }
  }, [filmingStart, filmingDuration]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-suggest currency from production country.
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

  const stateProvinceOptions = country === 'United States' ? USA_STATES : country === 'Canada' ? CANADA_PROVINCES : country === 'Australia' ? AUSTRALIA_STATES : [];
  const showStateProvince = ['United States', 'Canada', 'Australia'].includes(country);
  const countryOptions = useMemo(() => allTerritories.filter((x) => !x.isSubTerritory).map((x) => x.label).sort(), [allTerritories]);

  const territoryGroups = useMemo(() => {
    const countries = allTerritories.filter((x) => !x.isSubTerritory);
    const subs = allTerritories.filter((x) => x.isSubTerritory);
    const byContinent = new Map<string, { country: typeof countries[number]; regions: typeof subs }[]>();
    for (const c of countries) {
      const cont = CONTINENT_BY_COUNTRY[c.label] || 'Other';
      if (!byContinent.has(cont)) byContinent.set(cont, []);
      byContinent.get(cont)!.push({ country: c, regions: subs.filter((s) => s.parent === c.label) });
    }
    return CONTINENT_ORDER
      .filter((cont) => (byContinent.get(cont)?.length ?? 0) > 0)
      .map((cont) => ({ continent: cont as string, countries: byContinent.get(cont)!.sort((a, b) => a.country.label.localeCompare(b.country.label)) }));
  }, [allTerritories]);

  const openToAll = territoriesConsidering.includes('Open to all');
  const atTerritoryLimit = maxTerritories !== null && territoriesConsidering.length >= maxTerritories;
  const toggleTerritory = (label: string) => {
    if (openToAll && label !== 'Open to all') return;
    if (label === 'Open to all') { setTerritoriesConsidering(openToAll ? [] : ['Open to all']); return; }
    if (territoriesConsidering.includes(label)) {
      setTerritoriesConsidering(territoriesConsidering.filter((x) => x !== label));
    } else if (!atTerritoryLimit) {
      setTerritoriesConsidering([...territoriesConsidering.filter((x) => x !== 'Open to all'), label]);
    }
  };

  const setFileValidated = (selected: File | undefined | null) => {
    if (!selected) return;
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(selected.type)) { showError('Please upload a PDF, DOCX, or TXT file'); return; }
    if (selected.size > 10 * 1024 * 1024) { showError('File size must be under 10MB'); return; }
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ''));
  };

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

  // ----- Per-step validity (drives Continue/Generate enablement) -----
  const stepValid = [
    !!file && !!title && genres.length > 0 && !!format,
    !!country && !!budgetCurrency && !!budgetAmount && Number(budgetAmount) > 0,
    !!completionDate,
    acceptedTerms,
  ];
  const missingForStep = (i: number): string[] => {
    if (i === 0) return [...(!file ? ['script file'] : []), ...(!title ? ['project title'] : []), ...(genres.length === 0 ? ['genre'] : []), ...(!format ? ['format'] : [])];
    if (i === 1) return [...(!country ? ['production country'] : []), ...(!budgetCurrency ? ['currency'] : []), ...(!budgetAmount || Number(budgetAmount) <= 0 ? ['budget amount'] : [])];
    if (i === 2) return [...(!completionDate ? ['expected completion'] : [])];
    return [...(!acceptedTerms ? ['terms acceptance'] : [])];
  };

  const handleContinue = () => {
    if (!stepValid[step]) {
      showError(`Please provide: ${missingForStep(step).join(', ')}`);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  };
  const handleBack = () => {
    if (step === 0) { navigate('/dashboard'); return; }
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleGenerate = async () => {
    if (submittingRef.current) return;
    for (let i = 0; i < STEPS.length; i++) {
      if (!stepValid[i]) { setStep(i); showError(`Please provide: ${missingForStep(i).join(', ')}`); return; }
    }
    submittingRef.current = true;
    setProcessing(true);
    try {
      const { canGenerate, reason } = await databaseService.canGenerateReport('');
      if (!canGenerate) {
        setProcessing(false);
        showError(reason || 'Please upgrade your plan to generate more reports.', {
          action: <Button size="small" sx={{ color: '#fff', fontWeight: 600 }} onClick={() => navigate('/pricing')}>View Plans</Button>,
          duration: 10000,
        });
        return;
      }
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
      if (!generated.id) throw new Error('Report completed but did not return a report ID.');
      navigate(`/report/${generated.id}`);
    } catch (err: any) {
      if (err instanceof ReportTimeoutError) {
        showError('Your report is taking longer than expected. It will appear in your reports shortly.');
        navigate('/dashboard');
      } else {
        const msg: string = err.message || 'Failed to generate report. Please try again.';
        const isLimit = /upgrade|limit reached|free report already used/i.test(msg);
        showError(msg, isLimit ? { action: <Button size="small" sx={{ color: '#fff', fontWeight: 600 }} onClick={() => navigate('/pricing')}>View Plans</Button>, duration: 10000 } : undefined);
      }
      setProcessing(false);
    } finally {
      submittingRef.current = false;
    }
  };

  // ----- Shared theming for form fields (works in both light/dark) -----
  const fieldSx = {
    '& .MuiOutlinedInput-root': { color: t.textPrimary, bgcolor: t.inputBg, borderRadius: '10px' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.gold },
    '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: `${t.gold} !important` },
    '& .MuiInputLabel-root': { color: t.textSecondary },
    '& .MuiInputLabel-root.Mui-focused': { color: t.gold },
    '& .MuiSvgIcon-root': { color: t.textSecondary },
    '& input': { color: t.textPrimary },
  } as const;
  const menuProps = { PaperProps: { sx: { maxHeight: 320, bgcolor: t.cardBg, color: t.textPrimary } } } as const;
  const card = { bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '16px' } as const;
  const goldChip = { bgcolor: t.gold, color: mode === 'dark' ? '#000' : '#fff' } as const;
  const cbSx = { color: t.textSecondary, '&.Mui-checked': { color: t.gold } } as const;
  const sectionLabel = (text: string) => (
    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: t.gold, mb: 1.5, textTransform: 'uppercase' }}>{text}</Typography>
  );

  const fmtBudget = budgetAmount === '' ? '—' : `${CURRENCY_OPTIONS.find((c) => c.value === budgetCurrency)?.label.split(' ')[0] || ''}${Number(budgetAmount).toLocaleString()} ${budgetCurrency}`;

  // ================= Step content =================
  const renderStep = (): ReactNode => {
    if (step === 0) return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Upload */}
        <Box sx={{ ...card, p: 3 }}>
          {sectionLabel('Script')}
          <Box
            component="label"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); setFileValidated(e.dataTransfer.files?.[0]); }}
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5,
              p: 5, borderRadius: '14px', cursor: 'pointer', textAlign: 'center',
              border: `2px dashed ${dragOver ? t.gold : file ? t.gold : t.border}`,
              bgcolor: dragOver ? t.goldDim : t.inputBg, transition: 'all .15s',
            }}
          >
            <input hidden type="file" accept=".pdf,.docx,.txt" onChange={(e) => setFileValidated(e.target.files?.[0])} />
            {file ? <CheckCircle sx={{ fontSize: 42, color: t.gold }} /> : <CloudUpload sx={{ fontSize: 42, color: t.textSecondary }} />}
            <Typography sx={{ color: t.textPrimary, fontWeight: 700 }}>{file ? file.name : 'Drag & drop your script, or click to browse'}</Typography>
            <Typography sx={{ color: t.textSecondary, fontSize: 13 }}>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · click to replace` : 'PDF, DOCX or TXT · up to 10MB'}</Typography>
          </Box>
        </Box>

        {/* Project */}
        <Box sx={{ ...card, p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {sectionLabel('Project')}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <TextField fullWidth required label="Project Title" value={title} onChange={(e) => setTitle(e.target.value)} sx={fieldSx} />
            <FormControl fullWidth required sx={fieldSx}>
              <InputLabel>Format</InputLabel>
              <Select value={format} label="Format" onChange={(e) => setFormat(e.target.value)} MenuProps={menuProps}>
                {FORMAT_OPTIONS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box>
            <Typography sx={{ color: t.textSecondary, fontSize: 13.5, mb: 1 }}>Genre(s) <Box component="span" sx={{ color: t.textFaint }}>· select all that apply</Box></Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {GENRE_OPTIONS.map((g) => {
                const on = genres.includes(g);
                return (
                  <Chip
                    key={g} label={g} onClick={() => setGenres(on ? genres.filter((x) => x !== g) : [...genres, g])}
                    sx={{
                      cursor: 'pointer', fontWeight: 600, borderRadius: '9px',
                      bgcolor: on ? t.gold : 'transparent', color: on ? (mode === 'dark' ? '#000' : '#fff') : t.textSecondary,
                      border: `1px solid ${on ? t.gold : t.border}`, '&:hover': { borderColor: t.gold, bgcolor: on ? t.gold : t.goldDim },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>
    );

    if (step === 1) return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ ...card, p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {sectionLabel('Budget')}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <FormControl fullWidth required sx={fieldSx}>
              <InputLabel>Production Country</InputLabel>
              <Select value={country} label="Production Country" onChange={(e) => setCountry(e.target.value)} MenuProps={menuProps}>
                {countryOptions.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            {showStateProvince && (
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel>State / Province</InputLabel>
                <Select value={stateProvince} label="State / Province" onChange={(e) => setStateProvince(e.target.value)} MenuProps={menuProps}>
                  {stateProvinceOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            )}
            <FormControl fullWidth required sx={fieldSx}>
              <InputLabel>Currency</InputLabel>
              <Select value={budgetCurrency} label="Currency" onChange={(e) => setBudgetCurrency(e.target.value)} MenuProps={menuProps}>
                {CURRENCY_OPTIONS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              fullWidth required label="Budget Amount" placeholder="e.g. 3,000,000" sx={fieldSx}
              value={budgetAmount === '' ? '' : Number(budgetAmount).toLocaleString()}
              onChange={(e) => { const raw = e.target.value.replace(/,/g, ''); if (raw === '') { setBudgetAmount(''); return; } const n = Number(raw); if (!isNaN(n)) setBudgetAmount(n); }}
            />
          </Box>
        </Box>

        <Box sx={{ ...card, p: 3 }}>
          {sectionLabel('Territories considering')}
          <Typography sx={{ color: t.textSecondary, fontSize: 13, mb: 2 }}>
            {openToAll ? 'Open to all territories.' : maxTerritories === null ? 'Select any territories you are considering.' : `Select up to ${maxTerritories} (${territoriesConsidering.length}/${maxTerritories} chosen).`}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip
              label="Open to all" onClick={() => toggleTerritory('Open to all')}
              sx={{ cursor: 'pointer', fontWeight: 700, borderRadius: '9px', bgcolor: openToAll ? t.gold : 'transparent', color: openToAll ? (mode === 'dark' ? '#000' : '#fff') : t.textSecondary, border: `1px solid ${openToAll ? t.gold : t.border}` }}
            />
          </Box>
          {!openToAll && territoryGroups.map((group) => (
            <Box key={group.continent} sx={{ mb: 2 }}>
              <Typography sx={{ color: t.textFaint, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', mb: 1 }}>{group.continent.toUpperCase()}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {group.countries.map(({ country: c }) => {
                  const on = territoriesConsidering.includes(c.label);
                  const disabled = !on && atTerritoryLimit;
                  return (
                    <Chip
                      key={c.label} label={c.label} onClick={() => !disabled && toggleTerritory(c.label)}
                      sx={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, fontWeight: 600, borderRadius: '9px', bgcolor: on ? t.gold : 'transparent', color: on ? (mode === 'dark' ? '#000' : '#fff') : t.textSecondary, border: `1px solid ${on ? t.gold : t.border}`, '&:hover': { borderColor: t.gold } }}
                    />
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ ...card, p: 3 }}>
          {sectionLabel('Production priority')}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {PRIORITY_OPTIONS.map((p) => {
              const on = productionPriority === p.value;
              return (
                <Box
                  key={p.value} onClick={() => setProductionPriority(p.value)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.75, p: 2, borderRadius: '12px', cursor: 'pointer', bgcolor: on ? t.goldDim : t.inputBg, border: `${on ? 2 : 1}px solid ${on ? t.gold : t.border}`, transition: 'all .15s', '&:hover': { borderColor: t.gold } }}
                >
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: on ? `6px solid ${t.gold}` : `2px solid ${t.textSecondary}` }} />
                  <Typography sx={{ flex: 1, fontWeight: 600, color: t.textPrimary }}>{p.label}</Typography>
                  {p.badge && <Chip label={p.badge} size="small" sx={{ ...goldChip, fontWeight: 700, height: 20, fontSize: 11 }} />}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    );

    if (step === 2) return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ ...card, p: 3 }}>
          {sectionLabel('Schedule')}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <TextField fullWidth type="date" label="Filming Start" slotProps={{ inputLabel: { shrink: true } }} value={filmingStart} onChange={(e) => setFilmingStart(e.target.value)} sx={fieldSx} />
            <TextField fullWidth type="number" label="Filming Duration (weeks)" value={filmingDuration} onChange={(e) => setFilmingDuration(e.target.value)} sx={fieldSx} />
            <TextField fullWidth required type="date" label="Expected Completion" slotProps={{ inputLabel: { shrink: true } }} value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} sx={fieldSx} />
          </Box>
        </Box>

        <Box sx={{ ...card, p: 3 }}>
          {sectionLabel('Crew & cast')}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Camera Equipment</InputLabel>
              <Select<string[]>
                multiple value={cameraEquipment} input={<OutlinedInput label="Camera Equipment" />} MenuProps={menuProps}
                onChange={(e) => setCameraEquipment(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                renderValue={(sel) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{sel.map((v) => <Chip key={v} label={v} size="small" sx={goldChip} />)}</Box>}
              >
                {CAMERA_OPTIONS.map((c) => (
                  <MenuItem key={c} value={c}><Checkbox checked={cameraEquipment.includes(c)} size="small" sx={cbSx} /><ListItemText primary={c} /></MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth type="number" label="Crew Size" value={crewSize} onChange={(e) => setCrewSize(e.target.value)} sx={fieldSx} />
            <TextField fullWidth type="number" label="Principal Cast" value={principalCast} onChange={(e) => setPrincipalCast(e.target.value)} sx={fieldSx} />
            <TextField fullWidth type="number" label="Supporting Cast" value={supportingCast} onChange={(e) => setSupportingCast(e.target.value)} sx={fieldSx} />
          </Box>
        </Box>

        <Box sx={{ ...card, p: 3 }}>
          {sectionLabel('Creative context')}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <TextField fullWidth label="Primary Language(s)" placeholder="e.g. English, French" helperText="Separate with commas, up to 5" value={languagesInput} onChange={(e) => setLanguagesInput(e.target.value)} sx={fieldSx} />
            <TextField fullWidth label="Must Film In" placeholder="A locked territory, if any" value={mustFilmIn} onChange={(e) => setMustFilmIn(e.target.value)} sx={fieldSx} />
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Open to Official Co-Production?</InputLabel>
              <Select value={coProductionInterest} label="Open to Official Co-Production?" onChange={(e) => setCoProductionInterest(e.target.value)} MenuProps={menuProps}>
                <MenuItem value="">Not specified</MenuItem>
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="undecided">Undecided</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Target Audience</InputLabel>
              <Select<string[]>
                multiple value={targetAudience} input={<OutlinedInput label="Target Audience" />} MenuProps={menuProps}
                onChange={(e) => setTargetAudience(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                renderValue={(sel) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{sel.map((v) => <Chip key={v} label={AUDIENCE_OPTIONS.find((o) => o.v === v)?.l || v} size="small" sx={goldChip} />)}</Box>}
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <MenuItem key={o.v} value={o.v}><Checkbox checked={targetAudience.includes(o.v)} size="small" sx={cbSx} /><ListItemText primary={o.l} /></MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Audience Skew</InputLabel>
              <Select value={audienceSkewChoice} label="Audience Skew" onChange={(e) => setAudienceSkewChoice(e.target.value)} MenuProps={menuProps}>
                <MenuItem value="">Not specified</MenuItem>
                <MenuItem value="female_leaning">Female-leaning</MenuItem>
                <MenuItem value="male_leaning">Male-leaning</MenuItem>
                <MenuItem value="balanced">Balanced</MenuItem>
                <MenuItem value="lgbtq_audience">LGBTQ+ audience</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Representation — strictly opt-in */}
          <Box sx={{ mt: 2.5, p: 2.5, borderRadius: '12px', border: `1px solid ${t.border}`, bgcolor: t.inputBg }}>
            <Typography sx={{ color: t.textPrimary, fontWeight: 700, mb: 0.5 }}>Representation (optional)</Typography>
            <Typography sx={{ color: t.textSecondary, fontSize: 12.5, mb: 2 }}>Share only if you want representation-focused festival and distributor matches. Leaving it blank changes nothing else.</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel>Director / Lead Creator Gender</InputLabel>
                <Select value={representationGender} label="Director / Lead Creator Gender" onChange={(e) => setRepresentationGender(e.target.value)} MenuProps={menuProps}>
                  <MenuItem value="">Prefer not to say</MenuItem>
                  <MenuItem value="Woman">Woman</MenuItem>
                  <MenuItem value="Man">Man</MenuItem>
                  <MenuItem value="Non-binary">Non-binary</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel>Creator Communities</InputLabel>
                <Select<string[]>
                  multiple value={representationMinority} input={<OutlinedInput label="Creator Communities" />} MenuProps={menuProps}
                  onChange={(e) => setRepresentationMinority(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  renderValue={(sel) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{sel.map((v) => <Chip key={v} label={v} size="small" sx={goldChip} />)}</Box>}
                >
                  {['LGBTQ+', 'Racial/Ethnic minority', 'Disability'].map((o) => (
                    <MenuItem key={o} value={o}><Checkbox checked={representationMinority.includes(o)} size="small" sx={cbSx} /><ListItemText primary={o} /></MenuItem>
                  ))}
                </Select>
                <FormHelperText sx={{ color: t.textSecondary }}>Optional · select any that apply</FormHelperText>
              </FormControl>
            </Box>
          </Box>
        </Box>
      </Box>
    );

    // Step 3 — Review & Generate
    const reviewRows: { label: string; value: string }[] = [
      { label: 'Script file', value: file?.name || '—' },
      { label: 'Project title', value: title || '—' },
      { label: 'Format', value: format || '—' },
      { label: 'Genre(s)', value: genres.join(', ') || '—' },
      { label: 'Budget', value: fmtBudget },
      { label: 'Production country', value: country + (stateProvince ? ` · ${stateProvince}` : '') || '—' },
      { label: 'Territories', value: openToAll ? 'Open to all' : (territoriesConsidering.join(', ') || 'Not specified') },
      { label: 'Production priority', value: PRIORITY_OPTIONS.find((p) => p.value === productionPriority)?.label || '—' },
      { label: 'Filming start', value: filmingStart || 'Not specified' },
      { label: 'Filming duration', value: filmingDuration ? `${filmingDuration} weeks` : 'Not specified' },
      { label: 'Expected completion', value: completionDate || '—' },
      { label: 'Camera equipment', value: cameraEquipment.join(', ') || 'Not specified' },
      { label: 'Primary language(s)', value: primaryLanguages.join(', ') || 'Not specified' },
    ];
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, gap: 3, alignItems: 'start' }}>
        <Box sx={{ ...card, p: 3 }}>
          {sectionLabel('Review your analysis')}
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {reviewRows.map((r, i) => (
              <Box key={r.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1.4, borderTop: i === 0 ? 'none' : `1px solid ${t.borderSoft}` }}>
                <Typography sx={{ color: t.textSecondary, fontSize: 13.5 }}>{r.label}</Typography>
                <Typography sx={{ color: t.textPrimary, fontSize: 13.5, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{r.value}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ ...card, p: 3 }}>
            {sectionLabel('Confirm & consent')}
            <FormControlLabel
              sx={{ alignItems: 'flex-start', m: 0, mb: 1.5 }}
              control={<Checkbox checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} sx={{ ...cbSx, pt: 0 }} />}
              label={<Typography sx={{ color: t.textSecondary, fontSize: 13 }}>I accept the <Link href="/terms" target="_blank" sx={{ color: t.gold }}>Terms of Service</Link>, <Link href="/privacy" target="_blank" sx={{ color: t.gold }}>Privacy Policy</Link> and Acceptable Use Policy.</Typography>}
            />
            <FormControlLabel
              sx={{ alignItems: 'flex-start', m: 0 }}
              control={<Checkbox checked={biConsent} onChange={(e) => setBiConsent(e.target.checked)} sx={{ ...cbSx, pt: 0 }} />}
              label={<Typography sx={{ color: t.textSecondary, fontSize: 13 }}>Optionally contribute anonymised metadata to improve Business Intelligence benchmarks. <Box component="span" sx={{ color: t.textFaint }}>(Optional — never affects your report.)</Box></Typography>}
            />
          </Box>
          <Box sx={{ ...card, p: 3 }}>
            {sectionLabel('What happens next')}
            <Typography sx={{ color: t.textSecondary, fontSize: 13.5, lineHeight: 1.7 }}>
              Your script is analysed and cross-referenced against live incentive, festival and distribution data. Estimated turnaround is <Box component="span" sx={{ color: t.textPrimary, fontWeight: 700 }}>2–4 minutes</Box>. You can leave this page — the finished report appears in your Reports.
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  // Processing overlay
  if (processing) return (
    <Box sx={{ minHeight: '100vh', bgcolor: t.pageBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, px: 3, textAlign: 'center' }}>
      <CircularProgress sx={{ color: t.gold }} size={54} />
      <Typography sx={{ color: t.textPrimary, fontSize: 22, fontWeight: 800 }}>Analysing “{title}”…</Typography>
      <Typography sx={{ color: t.textSecondary, maxWidth: 420 }}>Cross-referencing incentives, festivals and distribution data. This usually takes 2–4 minutes.</Typography>
    </Box>
  );

  const isLast = step === STEPS.length - 1;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: t.pageBg }}>
      {isDesktop ? (
        <Box sx={{ width: SIDEBAR_W, flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}><Sidebar /></Box>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ sx: { border: 'none' } }}>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, px: { xs: 2, md: 5 }, py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            {!isDesktop && <IconButton onClick={() => setMobileOpen(true)} sx={{ color: t.textPrimary }}><MenuIcon /></IconButton>}
            <IconButton onClick={handleBack} sx={{ border: `1px solid ${t.border}`, borderRadius: '10px', color: t.textPrimary }}><ArrowBack sx={{ fontSize: 20 }} /></IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: t.textSecondary }}>NEW ANALYSIS</Typography>
              <Typography sx={{ fontSize: { xs: 22, md: 30 }, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1 }}>{STEPS[step].title}</Typography>
              <Typography sx={{ fontSize: 13, color: t.textSecondary, mt: 0.5 }}>{STEPS[step].subtitle}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ display: 'flex', border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
              <IconButton onClick={() => mode !== 'light' && toggle()} sx={{ borderRadius: 0, bgcolor: mode === 'light' ? t.gold : 'transparent', color: mode === 'light' ? '#1C1A16' : t.textSecondary }}><LightModeOutlined sx={{ fontSize: 18 }} /></IconButton>
              <IconButton onClick={() => mode !== 'dark' && toggle()} sx={{ borderRadius: 0, bgcolor: mode === 'dark' ? t.gold : 'transparent', color: mode === 'dark' ? '#1C1A16' : t.textSecondary }}><DarkModeOutlined sx={{ fontSize: 18 }} /></IconButton>
            </Box>
            {isLast ? (
              <Button onClick={handleGenerate} variant="contained" sx={{ whiteSpace: 'nowrap' }}>Generate report</Button>
            ) : (
              <Button onClick={handleContinue} variant="contained" sx={{ whiteSpace: 'nowrap' }}>Continue</Button>
            )}
            <Badge badgeContent={0} color="primary" overlap="rectangular" sx={{ '& .MuiBadge-badge': { top: 5, right: 5 }, display: { xs: 'none', sm: 'inline-flex' } }}>
              <IconButton sx={{ border: `1px solid ${t.border}`, borderRadius: '10px', color: t.textSecondary }}><NotificationsNoneOutlined sx={{ fontSize: 20 }} /></IconButton>
            </Badge>
          </Box>
        </Box>

        {/* Stepper */}
        <Box sx={{ px: { xs: 2, md: 5 }, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: { xs: 1, md: 2 }, flexWrap: 'wrap' }}>
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              const clickable = i <= step || stepValid.slice(0, i).every(Boolean);
              return (
                <Box
                  key={s.key} onClick={() => clickable && setStep(i)}
                  sx={{ flex: { xs: '1 1 45%', md: 1 }, display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, borderRadius: '12px', cursor: clickable ? 'pointer' : 'default', bgcolor: active ? t.goldDim : t.cardBg, border: `1px solid ${active ? t.gold : t.border}`, opacity: clickable ? 1 : 0.55, transition: 'all .15s' }}
                >
                  <Box sx={{ width: 30, height: 30, flexShrink: 0, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, bgcolor: done || active ? t.gold : 'transparent', color: done || active ? (mode === 'dark' ? '#000' : '#fff') : t.textSecondary, border: done || active ? 'none' : `1px solid ${t.border}` }}>
                    {done ? <Check sx={{ fontSize: 18 }} /> : String(i + 1).padStart(2, '0')}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: active || done ? t.textPrimary : t.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Step content — spans the full width of the main column */}
        <Box sx={{ flex: 1, px: { xs: 2, md: 5 }, pb: 6, width: '100%' }}>
          {renderStep()}
        </Box>
      </Box>
    </Box>
  );
}

export default AnalysisWizard;
