import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, createTheme, responsiveFontSizes, Box, CircularProgress } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { Toast } from '@/app/components/common/Toast';
import { HelmetProvider } from 'react-helmet-async';
import { lazy, Suspense } from 'react';

// Contexts (eager — always mounted)
import { AuthProvider } from '../app/contexts/AuthContext';
import { ScriptProvider } from '../app/contexts/ScriptContext';

// Route-protection wrapper — tiny, kept eager so it can wrap lazy children.
import { ProtectedRoute } from '../app/components/common/ProtectedRoute';

// LandingPage is the most common first paint — keep it eager to avoid a flash.
import { LandingPage } from '../app/components/user/LandingPage';

// Every other route component is lazy-loaded so the initial bundle stays small;
// the admin tooling, chart-heavy pages, and PDF/preview code split into their own
// chunks fetched on demand. These are named exports, so map them to the `default`
// shape React.lazy expects.
const UserLogin = lazy(() => import('../app/components/auth/UserLogin').then(m => ({ default: m.UserLogin })));
const UserSignup = lazy(() => import('../app/components/auth/UserSignup').then(m => ({ default: m.UserSignup })));
const ScriptUpload = lazy(() => import('../app/components/user/ScriptUpload').then(m => ({ default: m.ScriptUpload })));
const ReportViewer = lazy(() => import('../app/components/user/ReportViewer').then(m => ({ default: m.ReportViewer })));
const Pricing = lazy(() => import('../app/components/user/Pricing').then(m => ({ default: m.Pricing })));
const SampleReport = lazy(() => import('../app/components/user/SampleReport').then(m => ({ default: m.SampleReport })));
const UserDashboard = lazy(() => import('../app/components/user/UserDashboard').then(m => ({ default: m.UserDashboard })));
const TerritoryComparison = lazy(() => import('../app/components/user/TerritoryComparison').then(m => ({ default: m.TerritoryComparison })));
const WhatIfCalculator = lazy(() => import('../app/components/user/WhatIfCalculator').then(m => ({ default: m.WhatIfCalculator })));
const PublicWhatIfCalculator = lazy(() => import('../app/components/user/PublicWhatIfCalculator').then(m => ({ default: m.PublicWhatIfCalculator })));
const SharedReportViewer = lazy(() => import('../app/components/user/SharedReportViewer').then(m => ({ default: m.SharedReportViewer })));

const FAQ = lazy(() => import('../app/pages/FAQ').then(m => ({ default: m.FAQ })));
const TermsOfService = lazy(() => import('../app/pages/TermsOfService').then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import('../app/pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const AcceptableUse = lazy(() => import('../app/pages/AcceptableUse').then(m => ({ default: m.AcceptableUse })));
const Contact = lazy(() => import('../app/pages/Contact').then(m => ({ default: m.Contact })));

const B2BSolutions = lazy(() => import('../app/components/B2BSolutions').then(m => ({ default: m.B2BSolutions })));

const AdminLogin = lazy(() => import('../app/components/admin/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminLayout = lazy(() => import('../app/components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminOverview = lazy(() => import('../app/components/admin/AdminOverview').then(m => ({ default: m.AdminOverview })));
const IncentiveDataManager = lazy(() => import('../app/components/admin/IncentiveDataManager').then(m => ({ default: m.IncentiveDataManager })));
const GrantsManager = lazy(() => import('../app/components/admin/GrantsManager').then(m => ({ default: m.GrantsManager })));
const FestivalsManager = lazy(() => import('../app/components/admin/FestivalsManager').then(m => ({ default: m.FestivalsManager })));
const CrewDepthBankabilityManager = lazy(() => import('../app/components/admin/CrewDepthBankabilityManager').then(m => ({ default: m.CrewDepthBankabilityManager })));
const ComparableProductionsManager = lazy(() => import('../app/components/admin/ComparableProductionsManager').then(m => ({ default: m.ComparableProductionsManager })));
const DataSourcesManager = lazy(() => import('../app/components/admin/DataSourcesManager').then(m => ({ default: m.DataSourcesManager })));
const AdminUsersManager = lazy(() => import('../app/components/admin/AdminUsersManager').then(m => ({ default: m.AdminUsersManager })));
const B2BClientManager = lazy(() => import('../app/components/admin/B2BClientManager').then(m => ({ default: m.B2BClientManager })));
const EmailGatingManager = lazy(() => import('../app/components/admin/EmailGatingManager').then(m => ({ default: m.EmailGatingManager })));
const PDFReportsManager = lazy(() => import('../app/components/admin/PDFReportsManager').then(m => ({ default: m.PDFReportsManager })));
const BusinessMetrics = lazy(() => import('../app/components/admin/BusinessMetrics').then(m => ({ default: m.BusinessMetrics })));
const ScriptAIOverview = lazy(() => import('../app/components/admin/ScriptAIOverview').then(m => ({ default: m.ScriptAIOverview })));
const ProductionIntelligence = lazy(() => import('../app/components/admin/ProductionIntelligence').then(m => ({ default: m.ProductionIntelligence })));

const VerifyEmail = lazy(() => import('../app/pages/VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const EmailVerifyCallback = lazy(() => import('../app/pages/EmailVerifyCallback').then(m => ({ default: m.EmailVerifyCallback })));
const ResetPassword = lazy(() => import('../app/pages/ResetPassword').then(m => ({ default: m.ResetPassword })));

// Test/preview pages (dev-only routes) — also lazy so they never enter the prod bundle.
const ScriptAnalysisTester = lazy(() => import('../app/pages/ScriptAnalysisTester').then(m => ({ default: m.ScriptAnalysisTester })));
const PDFReportPreview = lazy(() => import('../app/pages/PDFReportPreview').then(m => ({ default: m.PDFReportPreview })));
const EmailPreview = lazy(() => import('../app/pages/EmailPreview').then(m => ({ default: m.EmailPreview })));
const APIConnectionTester = lazy(() => import('../app/pages/APIConnectionTester').then(m => ({ default: m.APIConnectionTester })));

// MUI Theme Configuration
let theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D4AF37', // Gold
      light: '#E6C968',
      dark: '#B8941F',
      contrastText: '#000000',
    },
    secondary: {
      main: '#D4AF37', // Bright gold
      light: '#FFE55C',
      dark: '#CCAC00',
      contrastText: '#000000',
    },
    background: {
      default: '#000000',
      paper: '#1A1A1A',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#D4AF37',
    },
  },
  typography: {
    fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: {
      fontSize: '3.5rem',
      fontWeight: 700,
      color: '#FFFFFF',
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#FFFFFF',
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      color: '#FFFFFF',
    },
    body1: {
      fontSize: '1rem',
      color: '#FFFFFF',
    },
    body2: {
      fontSize: '0.875rem',
      color: '#CCCCCC',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    // Global safety net for mobile: prevent any single element from forcing
    // horizontal page scroll. `clip` (not `hidden`) avoids creating a scroll
    // container, so it won't break `position: sticky` ancestors.
    MuiCssBaseline: {
      styleOverrides: {
        html: { overflowX: 'clip' },
        body: { overflowX: 'clip' },
        'img, video': { maxWidth: '100%' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '10px 24px',
        },
        contained: {
          backgroundColor: '#D4AF37',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#B8941F',
          },
        },
        outlined: {
          borderColor: '#D4AF37',
          color: '#D4AF37',
          '&:hover': {
            borderColor: '#D4AF37',
            backgroundColor: 'rgba(212, 175, 55, 0.08)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#1A1A1A',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#333333',
            },
            '&:hover fieldset': {
              borderColor: '#D4AF37',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#D4AF37',
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#1A1A1A',
          borderRadius: '12px',
        },
      },
    },
  },
});

// Scale down the large desktop heading/body sizes on smaller breakpoints so
// bare <Typography variant="hN"> no longer overflows on phones. Desktop sizes
// are unchanged (they are the largest in the generated range).
theme = responsiveFontSizes(theme);

// Shown while a lazy route chunk is being fetched.
function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress sx={{ color: '#D4AF37' }} />
    </Box>
  );
}

function AppContent() {
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          Components={{ default: Toast, error: Toast, success: Toast, info: Toast, warning: Toast }}
        >
          <AuthProvider>
            <ScriptProvider>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<UserLogin />} />
                  <Route path="/signup" element={<UserSignup />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/auth/callback" element={<EmailVerifyCallback />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/upload" element={<ScriptUpload />} />
                  <Route path="/report/shared/:shareToken" element={<SharedReportViewer />} />
                  <Route path="/report/preview" element={<ReportViewer />} />
                  <Route path="/report/:reportId" element={<ReportViewer />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/sample" element={<SampleReport />} />
                  <Route path="/dashboard" element={<UserDashboard />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/acceptable-use" element={<AcceptableUse />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/b2b" element={<B2BSolutions />} />
                  <Route path="/tools/comparison" element={<TerritoryComparison />} />
                  <Route path="/tools/what-if" element={<ProtectedRoute plan="professional"><WhatIfCalculator /></ProtectedRoute>} />
                  <Route path="/what-if" element={<PublicWhatIfCalculator />} />

                  {/* Admin Routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="/admin/overview" replace />} />
                    <Route path="overview" element={<AdminOverview />} />
                    <Route path="incentives" element={<IncentiveDataManager />} />
                    <Route path="grants" element={<GrantsManager />} />
                    <Route path="festivals" element={<FestivalsManager />} />
                    <Route path="crew-depth" element={<CrewDepthBankabilityManager />} />
                    <Route path="comparables" element={<ComparableProductionsManager />} />
                    <Route path="data-sources" element={<DataSourcesManager />} />
                    <Route path="users" element={<AdminUsersManager />} />
                    <Route path="b2b-clients" element={<B2BClientManager />} />
                    <Route path="email-gating" element={<EmailGatingManager />} />
                    <Route path="pdf-reports" element={<PDFReportsManager />} />
                    <Route path="metrics" element={<BusinessMetrics />} />
                    <Route path="script-ai" element={<ScriptAIOverview />} />
                    <Route path="production-intel" element={<ProductionIntelligence />} />
                  </Route>

                  {/* Test/Preview Routes — DEV ONLY. These expose internal tooling
                      (raw-HTML email preview, API connection details) and must never
                      be reachable in a production build. */}
                  {import.meta.env.DEV && (
                    <>
                      <Route path="/test/script-analysis" element={<ScriptAnalysisTester />} />
                      <Route path="/test/pdf-preview" element={<PDFReportPreview />} />
                      <Route path="/test/email-preview" element={<EmailPreview />} />
                      <Route path="/test/api-connection" element={<APIConnectionTester />} />
                    </>
                  )}

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
              </BrowserRouter>
            </ScriptProvider>
          </AuthProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default function App() {
  return <AppContent />;
}
