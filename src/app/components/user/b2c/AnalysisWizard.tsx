import { Fragment, useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, TextField, MenuItem, FormControl, InputLabel, Select,
  OutlinedInput, Chip, Checkbox, ListItemText, FormHelperText, FormControlLabel, Link,
  CircularProgress, useMediaQuery, useTheme, Drawer, Tooltip, Alert,
} from '@mui/material';
import {
  ArrowBack, CloudUpload, CheckCircle, LightModeOutlined, DarkModeOutlined,
  Menu as MenuIcon, Check,
} from '@mui/icons-material';
import { useScript, ReportTimeoutError, type ScriptMetadata } from '@/app/contexts/ScriptContext';
import { databaseService } from '@/services/database.service';
import { useToast } from '@/app/hooks/useToast';
import { useTerritories } from '@/app/hooks/useTerritories';
import { usePlanGate } from '@/app/hooks/usePlanGate';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { Sidebar, SIDEBAR_W, SIDEBAR_COLLAPSED_W, useSidebarCollapsed } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import { SegmentedToggle } from './SegmentedToggle';
import { WizardTour } from './WizardTour';
import { usePrefersReducedMotion } from './tourStyles';

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

const GENRE_OPTIONS = ['Drama', 'Thriller', 'Sci Fi', 'Horror', 'Comedy', 'Romance', 'Action', 'Adventure', 'Fantasy', 'Mystery', 'Documentary', 'Biopic', 'Period', 'History', 'Western', 'Animation', 'Musical', 'Music', 'Crime', 'War', 'Sports', 'Family', 'Superhero', 'Coming-of-Age', 'Psychological', 'Disaster', 'Spy', 'Noir'];
const FORMAT_OPTIONS = ['Feature Film', 'TV Series', 'TV Pilot', 'Limited Series', 'Short', 'Documentary', 'Animated Feature'];

/** Formats whose real-world incentive eligibility differs materially from a
 *  feature's, used ONLY as the fallback when the backend does not return
 *  per-programme eligibility.
 *
 *  The warning is normally driven by the programme records (see
 *  `formatNeedsCheck` below), so it names the actual programmes in question and
 *  retires itself once they are verified. This list exists so an older backend,
 *  or a failed territories request, degrades to the previous blanket protection
 *  rather than to silence. Short-form work is frequently excluded from
 *  production tax credits and served instead by separate grant schemes, so
 *  modelling a feature-scale rebate against a short overstates what the
 *  production can claim. */
const FORMATS_WITH_DIVERGENT_ELIGIBILITY = ['short', 'short film'];

function formatDivergesFromFeature(format: string): boolean {
  return FORMATS_WITH_DIVERGENT_ELIGIBILITY.includes(format.trim().toLowerCase());
}
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
  { value: 'full', label: 'Full picture: financial, creative and quality', badge: 'DEFAULT' },
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
  const { collapsed, toggle: toggleCollapsed } = useSidebarCollapsed();
  const reducedMotion = usePrefersReducedMotion();

  const { generateAnalysis } = useScript();
  const { showError } = useToast();
  const { isFree, isProducer } = usePlanGate();
  const maxTerritories = isFree ? 3 : !isProducer ? 5 : null;

  // Anonymous users are redirected to sign in at the route level (see
  // ProtectedRoute wrapping /upload and /analysis/new in App.tsx) — no
  // internal check needed here, and this avoids the flash-then-redirect
  // that a post-render effect would cause.

  const [step, setStep] = useState(0);

  // ----- Intake state (mirrors ScriptUpload so the payload is unchanged) -----
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [budgetAmount, setBudgetAmount] = useState<number | ''>('');
  const [budgetCurrency, setBudgetCurrency] = useState('');
  const [format, setFormat] = useState('');

  // include_all: the intake picker asks where a production is being
  // considered, which is not the same question as where a rebate can be
  // modelled. Territories without an active incentive are flagged, not hidden.
  // The format is passed through so each territory comes back with the best
  // eligibility verdict its programmes can offer it. That is what makes the
  // warning below specific and self-retiring instead of permanent.
  const { territories: allTerritories } = useTerritories(true, format || undefined);
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
  // Confirmation that the producer understands incentive eligibility is not
  // verified for their format. Required to generate, and reset if they change
  // format, so a stale tick cannot carry over from a different selection.
  const [acceptedFormatEligibility, setAcceptedFormatEligibility] = useState(false);
  const [biConsent, setBiConsent] = useState(false);
  const [processing, setProcessing] = useState(false);
  const submittingRef = useRef(false);
  // Set when the user chooses to leave the wizard while a report is still
  // generating — suppresses the auto-navigate to the report when it finishes.
  const leftDuringProcessing = useRef(false);

  const primaryLanguages = languagesInput.split(',').map((l) => l.trim()).filter(Boolean).slice(0, 5);

  // Keep filming start, duration (weeks) and expected completion in sync:
  // completion = start + duration weeks. Whichever of duration/completion the
  // user leaves blank is auto-calculated from the other two. We only ever
  // overwrite a field that is empty or that we last auto-filled ourselves, so
  // a value the user typed is never clobbered.
  const MS_PER_WEEK = 7 * 86400_000;
  const autoCompletion = useRef('');
  const autoDuration = useRef('');
  useEffect(() => {
    if (!filmingStart) return;
    const start = new Date(filmingStart);
    if (Number.isNaN(start.getTime())) return;

    // start + duration -> completion
    const weeks = Number(filmingDuration);
    if (filmingDuration && Number.isFinite(weeks) && weeks > 0) {
      const completion = new Date(start.getTime() + weeks * MS_PER_WEEK).toISOString().slice(0, 10);
      if (completionDate === '' || completionDate === autoCompletion.current) {
        if (completion !== completionDate) setCompletionDate(completion);
        autoCompletion.current = completion;
        return;
      }
    }

    // start + completion -> duration
    if (completionDate) {
      const end = new Date(completionDate);
      if (!Number.isNaN(end.getTime()) && end.getTime() > start.getTime()) {
        const wks = String(Math.round((end.getTime() - start.getTime()) / MS_PER_WEEK));
        if (filmingDuration === '' || filmingDuration === autoDuration.current) {
          if (wks !== filmingDuration) setFilmingDuration(wks);
          autoDuration.current = wks;
        }
      }
    }
  }, [filmingStart, filmingDuration, completionDate]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // Production Details: every field required except the two optional
  // Representation fields at the bottom.
  const detailsValid =
    !!filmingStart && !!filmingDuration && !!completionDate &&
    cameraEquipment.length > 0 && !!crewSize && !!principalCast && !!supportingCast &&
    primaryLanguages.length > 0 && !!mustFilmIn && !!coProductionInterest &&
    targetAudience.length > 0 && !!audienceSkewChoice;
  // Which programmes this warning is actually about: the territories the
  // producer has chosen, or every territory while the choice is still open,
  // since the report will rank across all of them.
  // Deselecting a territory that was named as the committed one would otherwise
  // leave the wizard submitting a territory the analysis is not considering.
  useEffect(() => {
    if (
      mustFilmIn
      && mustFilmIn !== 'Undecided'
      && !territoriesConsidering.includes(mustFilmIn)
    ) {
      setMustFilmIn('');
    }
  }, [territoriesConsidering, mustFilmIn]);

  const relevantTerritories = useMemo(() => {
    const chosen = allTerritories.filter((x) => territoriesConsidering.includes(x.label));
    return chosen.length > 0 ? chosen : allTerritories.filter((x) => !x.isSubTerritory);
  }, [allTerritories, territoriesConsidering]);

  const unverifiedTerritories = useMemo(
    () => relevantTerritories.filter(
      (x) => x.formatEligibility?.status === 'unverified'
        || x.formatEligibility?.status === 'needs_confirmation',
    ),
    [relevantTerritories],
  );

  // Data-driven: raised only while at least one relevant programme cannot confirm
  // it accepts this format. Not keyed on the format alone, so it disappears by
  // itself as the programme records are verified rather than needing a code change.
  //
  // The fallback keeps the previous protection when no eligibility data came back
  // at all (older backend, or the request failed). Absent data is not a clean
  // bill of health, and silence is the one outcome this must never degrade to.
  //
  // Scoped to formats whose eligibility materially diverges from what these
  // programmes are written for. The data-driven part is retained inside that
  // scope, so the warning still disappears once the short-form eligibility
  // research is populated. Without the scope it fired on every format including
  // features, where "no one has recorded that this programme accepts features" is
  // true of every programme and tells the producer nothing.
  const eligibilityDataAvailable = relevantTerritories.some((x) => x.formatEligibility);
  const formatNeedsCheck = formatDivergesFromFeature(format)
    && (eligibilityDataAvailable ? unverifiedTerritories.length > 0 : true);

  const stepValid = [
    !!file && !!title && genres.length > 0 && !!format,
    !!country && !!budgetCurrency && !!budgetAmount && Number(budgetAmount) > 0,
    detailsValid,
    acceptedTerms && (!formatNeedsCheck || acceptedFormatEligibility),
  ];
  const missingForStep = (i: number): string[] => {
    if (i === 0) return [...(!file ? ['script file'] : []), ...(!title ? ['project title'] : []), ...(genres.length === 0 ? ['genre'] : []), ...(!format ? ['format'] : [])];
    if (i === 1) return [...(!country ? ['production country'] : []), ...(!budgetCurrency ? ['currency'] : []), ...(!budgetAmount || Number(budgetAmount) <= 0 ? ['budget amount'] : [])];
    if (i === 2) return [
      ...(!filmingStart ? ['filming start'] : []), ...(!filmingDuration ? ['filming duration'] : []), ...(!completionDate ? ['expected completion'] : []),
      ...(cameraEquipment.length === 0 ? ['camera equipment'] : []), ...(!crewSize ? ['crew size'] : []), ...(!principalCast ? ['principal cast'] : []), ...(!supportingCast ? ['supporting cast'] : []),
      ...(primaryLanguages.length === 0 ? ['primary language(s)'] : []), ...(!mustFilmIn ? ['must film in'] : []), ...(!coProductionInterest ? ['co-production'] : []),
      ...(targetAudience.length === 0 ? ['target audience'] : []), ...(!audienceSkewChoice ? ['audience skew'] : []),
    ];
    return [
      ...(!acceptedTerms ? ['terms acceptance'] : []),
      ...(formatNeedsCheck && !acceptedFormatEligibility
        ? ['confirmation that incentive eligibility is unverified for this format']
        : []),
    ];
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
        // Recorded with the request: the report states the caveat, so it should
        // also be provable that the producer was asked to confirm it.
        formatEligibilityAcknowledged: formatNeedsCheck ? acceptedFormatEligibility : undefined,
      };
      const generated = await generateAnalysis(file!, metadata);
      if (!generated.id) throw new Error('Report completed but did not return a report ID.');
      // If the user chose to keep browsing while this generated, don't yank
      // them onto the report — the "Report ready" notification will link them.
      if (!leftDuringProcessing.current) navigate(`/report/${generated.id}`);
    } catch (err: any) {
      if (leftDuringProcessing.current) return; // user already navigated away
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
  // Native <input type="date"> renders a browser calendar picker whose icon is
  // dark by default and therefore invisible on the dark input background — which
  // made it look like there was no picker and forced manual typing. color-scheme
  // themes the picker (and its popup) correctly, and inverting the indicator
  // guarantees the calendar button is visible and clickable in dark mode.
  const dateFieldSx = {
    ...fieldSx,
    '& input': { color: t.textPrimary, colorScheme: mode === 'dark' ? 'dark' : 'light' },
    '& input::-webkit-calendar-picker-indicator': {
      filter: mode === 'dark' ? 'invert(1) brightness(1.8)' : 'none',
      cursor: 'pointer',
      opacity: 1,
    },
  } as const;
  // disableScrollLock stops MUI from removing the body scrollbar when a menu
  // opens — that width change was shifting the sticky sidebar.
  const menuProps = { disableScrollLock: true, PaperProps: { sx: { maxHeight: 320, bgcolor: t.cardBg, color: t.textPrimary } } } as const;
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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Upload */}
        <Box data-tour="wizard-upload" sx={{ ...card, p: 3 }}>
          {sectionLabel("Script")}
          <Box
            component="label"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              setFileValidated(e.dataTransfer.files?.[0]);
            }}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              p: 5,
              borderRadius: "14px",
              cursor: "pointer",
              textAlign: "center",
              border: `2px dashed ${dragOver ? t.gold : file ? t.gold : t.border}`,
              bgcolor: dragOver ? t.goldDim : t.inputBg,
              transition: "all .15s",
            }}
          >
            <input
              hidden
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFileValidated(e.target.files?.[0])}
            />
            {file ? (
              <CheckCircle sx={{ fontSize: 42, color: t.gold }} />
            ) : (
              <CloudUpload sx={{ fontSize: 42, color: t.textSecondary }} />
            )}
            <Typography sx={{ color: t.textPrimary, fontWeight: 700 }}>
              {file ? file.name : "Drag & drop your script, or click to browse"}
            </Typography>
            <Typography sx={{ color: t.textSecondary, fontSize: 13 }}>
              {file
                ? `${(file.size / 1024 / 1024).toFixed(1)} MB · click to replace`
                : "PDF, DOCX or TXT · up to 10MB"}
            </Typography>
          </Box>
        </Box>

        {/* Project */}
        <Box
          sx={{
            ...card,
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          {sectionLabel("Project")}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2.5,
            }}
          >
            <TextField
              fullWidth
              required
              label="Project Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={fieldSx}
            />
            <FormControl fullWidth required sx={fieldSx}>
              <InputLabel>Format</InputLabel>
              <Select
                value={format}
                label="Format"
                onChange={(e) => {
                  setFormat(e.target.value);
                  setAcceptedFormatEligibility(false);
                }}
                MenuProps={menuProps}
              >
                {FORMAT_OPTIONS.map((f) => (
                  <MenuItem key={f} value={f}>
                    {f}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Shown where the choice is made, not only at the end, so it informs
                the decision instead of arriving as a surprise on the last step. */}
            {formatNeedsCheck && (
              <Alert
                severity="warning"
                sx={{
                  // Spans both columns of the parent grid. As a plain child it
                  // occupied one cell and left the other empty, so a block of
                  // prose sat in a half-width column beside dead space.
                  gridColumn: '1 / -1',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>
                  {eligibilityDataAvailable
                    ? `Eligibility for a ${format.toLowerCase()} is unverified in ${unverifiedTerritories.length === 1 ? '1 territory' : `${unverifiedTerritories.length} territories`}`
                    : `Eligibility for a ${format.toLowerCase()} varies by programme`}
                </Typography>

                <Typography sx={{ fontSize: 13, lineHeight: 1.6, mb: 1 }}>
                  Incentive eligibility is set by each programme, not by the
                  territory, and two programmes in the same country routinely
                  differ. Requirements commonly turn on format, running time,
                  production spend or distribution plans.
                </Typography>

                {/* Naming the territories is the difference between a caveat the
                    producer can act on and one they learn to scroll past. */}
                {eligibilityDataAvailable ? (
                  <Typography sx={{ fontSize: 13, lineHeight: 1.6, mb: 1 }}>
                    We have not established whether the programmes in{' '}
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {unverifiedTerritories.slice(0, 6).map((x) => x.label).join(', ')}
                      {unverifiedTerritories.length > 6
                        ? ` and ${unverifiedTerritories.length - 6} more`
                        : ''}
                    </Box>{' '}
                    accept this format. Their rebates appear in your report
                    labelled as unconfirmed, and may overstate what is available.
                    Programmes we have verified are marked as such.
                  </Typography>
                ) : (
                  <Typography sx={{ fontSize: 13, lineHeight: 1.6, mb: 1 }}>
                    We could not load per-programme eligibility for this request,
                    so treat every incentive estimate in your report as assuming
                    the programme accepts this format.
                  </Typography>
                )}

                <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
                  Confirm eligibility with the programme administrator or film
                  commission before relying on any figure marked unconfirmed.
                </Typography>
              </Alert>
            )}
          </Box>
          <Box>
            <Typography sx={{ color: t.textSecondary, fontSize: 13.5, mb: 1 }}>
              Genre(s){" "}
              <Box component="span" sx={{ color: t.textFaint }}>
                · select all that apply
              </Box>
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {GENRE_OPTIONS.map((g) => {
                const on = genres.includes(g);
                return (
                  <Chip
                    key={g}
                    label={g}
                    onClick={() =>
                      setGenres(
                        on ? genres.filter((x) => x !== g) : [...genres, g],
                      )
                    }
                    sx={{
                      cursor: "pointer",
                      fontWeight: 600,
                      borderRadius: "9px",
                      bgcolor: on ? t.gold : "transparent",
                      color: on
                        ? mode === "dark"
                          ? "#000"
                          : "#fff"
                        : t.textSecondary,
                      border: `1px solid ${on ? t.gold : t.border}`,
                      "&:hover": {
                        borderColor: t.gold,
                        bgcolor: on ? t.gold : t.goldDim,
                      },
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
              inputProps={{ inputMode: 'numeric' }}
              // Format grouping with a FIXED locale and strip ALL non-digits on
              // input. The previous code formatted with the browser locale but
              // only stripped commas, so in a locale that groups with '.' or a
              // space (e.g. de/fr) the separator inserted at 1,000 couldn't be
              // removed — corrupting the value and capping the budget at 1000.
              value={budgetAmount === '' ? '' : Number(budgetAmount).toLocaleString('en-US')}
              onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); if (raw === '') { setBudgetAmount(''); return; } const n = Number(raw); if (!isNaN(n)) setBudgetAmount(n); }}
            />
          </Box>
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

        <Box sx={{ ...card, p: 3 }}>
          {sectionLabel('Territories considering')}
          <Typography sx={{ color: t.textSecondary, fontSize: 13, mb: 2 }}>
            {maxTerritories === null
              ? `Select any territories you are considering (${territoriesConsidering.length} chosen).`
              : `Your plan lets you select up to ${maxTerritories} territories (${territoriesConsidering.length}/${maxTerritories} chosen).`}
          </Typography>
          {/* The legend names both marks. One sentence covering both read as if
              a suspended programme and no programme were the same thing. */}
          {allTerritories.some((x) => !x.isSubTerritory && x.incentiveStatus !== 'active') && (
            <Typography sx={{ color: t.textFaint, fontSize: 12, mb: 2, maxWidth: '86ch', lineHeight: 1.6 }}>
              An <Box component="span" sx={{ color: t.warning, fontWeight: 700 }}>amber outline</Box> means the
              territory has a tax incentive programme whose bankability cannot be confirmed today, so no rebate is
              modelled for it. A dashed outline means there is no incentive programme on record at all. Either way you
              can still select it for location, crew or currency reasons.
            </Typography>
          )}
          {territoryGroups.map((group) => (
            <Box key={group.continent} sx={{ mb: 2 }}>
              <Typography sx={{ color: t.textFaint, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', mb: 1 }}>{group.continent.toUpperCase()}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {group.countries.map(({ country: c, regions }) => {
                  const on = territoriesConsidering.includes(c.label);
                  const disabled = !on && atTerritoryLimit;
                  // Three states, because "no programme at all" and "a
                  // programme we cannot vouch for" are different facts and a
                  // single dashed outline said the same thing about both.
                  // Nigeria has no programme. South Africa's is suspended and
                  // Brazil's is pending verification, so both hold a real
                  // incentive record whose bankability is unconfirmed. Every one
                  // of them stays selectable: their location, crew and currency
                  // advantages are real, and we simply never imply a bankable
                  // rebate we cannot stand behind.
                  const status = c.incentiveStatus
                    ?? (c.hasActiveIncentive === false ? 'none' : 'active');
                  const unconfirmed = status === 'unconfirmed';
                  const noIncentive = status === 'none';
                  const flagged = unconfirmed || noIncentive;
                  const chip = (
                    <Chip
                      key={c.label}
                      label={regions.length > 0 ? `${c.label} ${on ? '▾' : '▸'}` : c.label}
                      onClick={() => !disabled && toggleTerritory(c.label)}
                      sx={{
                        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
                        fontWeight: 600, borderRadius: '9px',
                        bgcolor: on ? t.gold : 'transparent',
                        color: on ? (mode === 'dark' ? '#000' : '#fff') : t.textSecondary,
                        // Dashed for no programme, solid amber for a programme
                        // whose bankability is unconfirmed: a different fact
                        // deserves a different mark, not the same one.
                        border: `1px ${noIncentive && !on ? 'dashed' : 'solid'} ${
                          on ? t.gold : unconfirmed ? t.warning : t.border
                        }`,
                        '&:hover': { borderColor: t.gold },
                      }}
                    />
                  );
                  return flagged ? (
                    <Tooltip
                      key={c.label}
                      title={unconfirmed
                        ? 'Has a tax incentive programme, but its bankability cannot be confirmed today, so no rebate is modelled for it. Still selectable for location, crew and currency reasons.'
                        : 'No active incentive to model right now. Still selectable for location, crew and currency reasons.'}
                    >
                      <span style={{ display: 'inline-flex' }}>{chip}</span>
                    </Tooltip>
                  ) : chip;
                })}
              </Box>
              {/* Sub-territories (e.g. US states, Canadian provinces) reveal once
                  their parent country is selected. */}
              {group.countries.filter(({ country: c, regions }) => regions.length > 0 && territoriesConsidering.includes(c.label)).map(({ country: c, regions }) => (
                <Box key={`${c.label}-regions`} sx={{ mt: 1.25, ml: 0.5, pl: 1.75, borderLeft: `2px solid ${t.goldDim}` }}>
                  <Typography sx={{ color: t.textFaint, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', mb: 0.75 }}>{c.label.toUpperCase()} · REGIONS</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {regions.map((r) => {
                      const ron = territoriesConsidering.includes(r.label);
                      const rdisabled = !ron && atTerritoryLimit;
                      return (
                        <Chip
                          key={r.label} label={r.label} size="small" onClick={() => !rdisabled && toggleTerritory(r.label)}
                          sx={{ cursor: rdisabled ? 'not-allowed' : 'pointer', opacity: rdisabled ? 0.4 : 1, fontWeight: 600, borderRadius: '8px', bgcolor: ron ? t.gold : 'transparent', color: ron ? (mode === 'dark' ? '#000' : '#fff') : t.textSecondary, border: `1px solid ${ron ? t.gold : t.border}`, '&:hover': { borderColor: t.gold } }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    );

    if (step === 2) return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ ...card, p: 3 }}>
          {sectionLabel('Schedule')}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2.5 }}>
            <TextField fullWidth required type="date" label="Filming Start" slotProps={{ inputLabel: { shrink: true } }} value={filmingStart} onChange={(e) => setFilmingStart(e.target.value)} sx={dateFieldSx} />
            <TextField fullWidth required type="number" label="Filming Duration (weeks)" value={filmingDuration} onChange={(e) => setFilmingDuration(e.target.value)} sx={fieldSx} />
            <TextField fullWidth required type="date" label="Expected Completion" slotProps={{ inputLabel: { shrink: true } }} value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} sx={dateFieldSx} />
          </Box>
        </Box>

        <Box sx={{ ...card, p: 3 }}>
          {sectionLabel('Crew & cast')}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <FormControl fullWidth required sx={fieldSx}>
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
            <TextField fullWidth required type="number" label="Crew Size" value={crewSize} onChange={(e) => setCrewSize(e.target.value)} sx={fieldSx} />
            <TextField fullWidth required type="number" label="Principal Cast" value={principalCast} onChange={(e) => setPrincipalCast(e.target.value)} sx={fieldSx} />
            <TextField fullWidth required type="number" label="Supporting Cast" value={supportingCast} onChange={(e) => setSupportingCast(e.target.value)} sx={fieldSx} />
          </Box>
        </Box>

        <Box sx={{ ...card, p: 3 }}>
          {sectionLabel('Creative context')}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
            <TextField fullWidth required label="Primary Language(s)" placeholder="e.g. English, French" helperText="Separate with commas, up to 5" value={languagesInput} onChange={(e) => setLanguagesInput(e.target.value)} sx={fieldSx} />
            {/* Chosen from the territories already selected, not typed. Free text
                meant a producer could name a territory the analysis had never been
                asked to consider, and the answer silently went nowhere. */}
            <TextField
              select
              fullWidth
              required
              label="Must Film In"
              value={mustFilmIn}
              onChange={(e) => setMustFilmIn(e.target.value)}
              sx={fieldSx}
              helperText={
                territoriesConsidering.length === 0
                  ? 'Select your territories in the previous step first.'
                  : 'The territory this production is committed to. It leads the ranking in your report.'
              }
            >
              {territoriesConsidering.length === 0 ? (
                <MenuItem value="" disabled>No territories selected yet</MenuItem>
              ) : (
                [
                  <MenuItem key="__undecided" value="Undecided">Not decided yet</MenuItem>,
                  ...territoriesConsidering.map((tname) => (
                    <MenuItem key={tname} value={tname}>{tname}</MenuItem>
                  )),
                ]
              )}
            </TextField>
            <FormControl fullWidth required sx={fieldSx}>
              <InputLabel>Open to Official Co-Production?</InputLabel>
              <Select value={coProductionInterest} label="Open to Official Co-Production?" onChange={(e) => setCoProductionInterest(e.target.value)} MenuProps={menuProps}>
                <MenuItem value="">Not specified</MenuItem>
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="undecided">Undecided</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required sx={fieldSx}>
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
            <FormControl fullWidth required sx={fieldSx}>
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
          {/* Transparency notice, not a consent mechanism: deliberately has no
              checkbox, and sits above the consent block so the core AI
              processing is not confused with the optional Production
              Intelligence tick box below it. The no-training sentence is
              omitted on purpose, see the TODO in TermsOfService.tsx section 8.2:
              neither provider's training terms are verified anywhere in this
              repository, so asserting it here would be a claim we cannot stand
              behind. Add it only once those terms are confirmed. */}
          <Box sx={{ ...card, p: 3, borderColor: t.gold }}>
            {sectionLabel('How your script is handled')}
            <Typography sx={{ color: t.textSecondary, fontSize: 13, lineHeight: 1.75 }}>
              Your script is processed only to produce your report. To analyse it we transmit it over an encrypted
              connection to our AI service providers (Anthropic, with OpenAI as failover), which process it solely to
              generate that report. We do not store the uploaded file itself, and we do not sell your script or
              disclose it to anyone for their own purposes. Full detail is in our{' '}
              <Link href="/privacy" target="_blank" sx={{ color: t.gold }}>Privacy Policy</Link>.
            </Typography>
          </Box>

          <Box sx={{ ...card, p: 3 }}>
            {sectionLabel('Confirm & consent')}
            <FormControlLabel
              sx={{ alignItems: 'flex-start', m: 0, mb: 1.5 }}
              control={<Checkbox checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} sx={{ ...cbSx, pt: 0 }} />}
              label={<Typography sx={{ color: t.textSecondary, fontSize: 13 }}>I accept the <Link href="/terms" target="_blank" sx={{ color: t.gold }}>Terms of Service</Link>, <Link href="/privacy" target="_blank" sx={{ color: t.gold }}>Privacy Policy</Link> and Acceptable Use Policy.</Typography>}
            />
            {/* Required only for the formats whose eligibility is unverified, so
                the consent screen does not grow a checkbox for producers it does
                not apply to. */}
            {formatNeedsCheck && (
              <FormControlLabel
                sx={{ alignItems: 'flex-start', m: 0, mb: 1.5 }}
                control={(
                  <Checkbox
                    checked={acceptedFormatEligibility}
                    onChange={(e) => setAcceptedFormatEligibility(e.target.checked)}
                    sx={{ ...cbSx, pt: 0 }}
                  />
                )}
                label={(
                  <Typography sx={{ color: t.textSecondary, fontSize: 13 }}>
                    I understand that eligibility for {format.toLowerCase()} projects is set by each individual
                    programme, that any rebate marked unconfirmed in my report is modelled as though the programme
                    accepts this format without that having been established, and that I must confirm eligibility with
                    the programme or film commission before relying on those figures.
                  </Typography>
                )}
              />
            )}
            <FormControlLabel
              sx={{ alignItems: 'flex-start', m: 0 }}
              control={<Checkbox checked={biConsent} onChange={(e) => setBiConsent(e.target.checked)} sx={{ ...cbSx, pt: 0 }} />}
              label={<Typography sx={{ color: t.textSecondary, fontSize: 13 }}>Optionally contribute pseudonymised production metadata to Business Intelligence benchmarks. <Box component="span" sx={{ color: t.textFaint }}>(Optional — never affects your report.)</Box></Typography>}
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

  const isLast = step === STEPS.length - 1;

  // Tell the tour when the Generate button finally exists. The tour starts on
  // arrival, when only the first step's anchors are in the DOM, so it cannot
  // point at Generate until the user has actually reached the review step.
  useEffect(() => {
    if (isLast) window.dispatchEvent(new Event('pc:wizard-final-step'));
  }, [isLast]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: t.pageBg }}>
      {isDesktop ? (
        <Box sx={{ width: collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W, flexShrink: 0, position: 'sticky', top: 0, height: '100vh', transition: 'width .22s ease' }}>
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </Box>
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
            <SegmentedToggle
              radius={12}
              value={mode}
              onChange={(v) => v !== mode && toggle()}
              options={[
                { value: 'light', icon: <LightModeOutlined sx={{ fontSize: 18 }} /> },
                { value: 'dark', icon: <DarkModeOutlined sx={{ fontSize: 18 }} /> },
              ]}
            />
            {isLast ? (
              <Button data-tour="wizard-generate" onClick={handleGenerate} variant="contained" disabled={processing} startIcon={processing ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : undefined} sx={{ whiteSpace: 'nowrap' }}>{processing ? 'Generating…' : 'Generate report'}</Button>
            ) : (
              <Button data-tour="wizard-continue" onClick={handleContinue} variant="contained" sx={{ whiteSpace: 'nowrap' }}>Continue</Button>
            )}
            <Box sx={{ display: { xs: 'none', sm: 'inline-flex' } }}><NotificationBell /></Box>
          </Box>
        </Box>

        {/* Stepper — connected nodes; the link between two nodes fills gold as a
            step completes, so it visibly "flows" the user toward the next one. */}
        {!processing && (
        <Box data-tour="wizard-steps" sx={{ px: { xs: 2, md: 5 }, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              const clickable = i <= step || stepValid.slice(0, i).every(Boolean);
              return (
                <Fragment key={s.key}>
                  <Box
                    onClick={() => clickable && setStep(i)}
                    sx={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                      flexShrink: 0, width: { xs: 42, md: 132 }, textAlign: 'center',
                      cursor: clickable ? 'pointer' : 'default', opacity: clickable ? 1 : 0.5,
                      '&:hover .pc-node': clickable && !done && !active ? { borderColor: t.gold, color: t.textPrimary } : {},
                    }}
                  >
                    <Box
                      className="pc-node"
                      sx={{
                        width: 34, height: 34, flexShrink: 0, borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 13,
                        bgcolor: done || active ? t.gold : 'transparent',
                        color: done || active ? (mode === 'dark' ? '#000' : '#fff') : t.textSecondary,
                        border: done || active ? 'none' : `1px solid ${t.border}`,
                        boxShadow: active ? `0 0 0 4px ${t.goldDim}` : 'none',
                        transition: reducedMotion ? 'none' : 'background-color .3s ease, box-shadow .3s ease, color .3s ease',
                      }}
                    >
                      {done ? <Check sx={{ fontSize: 18 }} /> : String(i + 1).padStart(2, '0')}
                    </Box>
                    <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: 12.5, fontWeight: active || done ? 700 : 600, lineHeight: 1.3, color: active || done ? t.textPrimary : t.textSecondary }}>
                      {s.title}
                    </Typography>
                  </Box>
                  {i < STEPS.length - 1 && (
                    <Box sx={{ flex: 1, height: 3, mt: '15.5px', mx: { xs: 0.5, md: 1 }, borderRadius: 3, bgcolor: t.border, position: 'relative', overflow: 'hidden' }}>
                      {/* Fill via transform (not width) so it stays on the GPU and
                          never triggers layout — origin-left makes it flow rightward. */}
                      <Box
                        sx={{
                          position: 'absolute', inset: 0, borderRadius: 3, bgcolor: t.gold,
                          transformOrigin: 'left',
                          transform: done ? 'scaleX(1)' : 'scaleX(0)',
                          transition: reducedMotion ? 'none' : 'transform .5s cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      />
                    </Box>
                  )}
                </Fragment>
              );
            })}
          </Box>
        </Box>
        )}

        {/* Step content — spans the full width of the main column */}
        <Box sx={{ flex: 1, px: { xs: 2, md: 5 }, pb: 6, width: '100%' }}>
          {processing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 3, py: { xs: 6, md: 10 }, px: 3, maxWidth: 520, mx: 'auto' }}>
              <CircularProgress sx={{ color: t.gold }} size={48} />
              <Box>
                <Typography sx={{ color: t.textPrimary, fontSize: 22, fontWeight: 800, mb: 1 }}>Analysing “{title}”…</Typography>
                <Typography sx={{ color: t.textSecondary }}>Cross-referencing incentives, festivals and distribution data. This usually takes 2–4 minutes.</Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={() => { leftDuringProcessing.current = true; navigate('/dashboard'); }}
                sx={{ mt: 1 }}
              >
                Continue in background
              </Button>
              <Typography sx={{ color: t.textSecondary, fontSize: 12.5 }}>
                You can keep using Prodculator, we'll notify you when the report is ready.
              </Typography>
            </Box>
          ) : (
            // key={step} remounts on each step change so the content glides in
            // rather than snapping — a small motion cue that the flow advanced.
            <Box
              key={step}
              sx={reducedMotion ? undefined : {
                animation: 'pcStepIn .34s cubic-bezier(0.22, 1, 0.36, 1)',
                '@keyframes pcStepIn': {
                  from: { opacity: 0, transform: 'translateY(10px)' },
                  to: { opacity: 1, transform: 'none' },
                },
              }}
            >
              {renderStep()}
            </Box>
          )}
        </Box>
      </Box>

      {/* First-visit guided tour of the analysis flow */}
      <WizardTour />
    </Box>
  );
}

export default AnalysisWizard;
