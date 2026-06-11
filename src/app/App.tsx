import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { Toast } from '@/app/components/common/Toast';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';

// Contexts
import { AuthProvider } from '../app/contexts/AuthContext';
import { ScriptProvider } from '../app/contexts/ScriptContext';

// User Pages
import { LandingPage } from '../app/components/user/LandingPage';
import { UserLogin } from '../app/components/auth/UserLogin';
import { UserSignup } from '../app/components/auth/UserSignup';
import { ScriptUpload } from '../app/components/user/ScriptUpload';
import { ReportViewer } from '../app/components/user/ReportViewer';
import { Pricing } from '../app/components/user/Pricing';
import { SampleReport } from '../app/components/user/SampleReport';
import { UserDashboard } from '../app/components/user/UserDashboard';
import { TerritoryComparison } from '../app/components/user/TerritoryComparison';
import { WhatIfCalculator } from '../app/components/user/WhatIfCalculator';
import { PublicWhatIfCalculator } from '../app/components/user/PublicWhatIfCalculator';
import { SharedReportViewer } from '../app/components/user/SharedReportViewer';

// Static Pages
import { FAQ } from '../app/pages/FAQ';
import { TermsOfService } from '../app/pages/TermsOfService';
import { PrivacyPolicy } from '../app/pages/PrivacyPolicy';
import { AcceptableUse } from '../app/pages/AcceptableUse';

// B2B
import { B2BSolutions } from '../app/components/B2BSolutions';

// Admin Pages
import { AdminLogin } from '../app/components/admin/AdminLogin';
import { AdminLayout } from '../app/components/admin/AdminLayout';
import { AdminOverview } from '../app/components/admin/AdminOverview';
import { IncentiveDataManager } from '../app/components/admin/IncentiveDataManager';
import { GrantsManager } from '../app/components/admin/GrantsManager';
import { FestivalsManager } from '../app/components/admin/FestivalsManager';
import { CrewCostsManager } from '../app/components/admin/CrewCostsManager';
import { ComparableProductionsManager } from '../app/components/admin/ComparableProductionsManager';
import { DataSourcesManager } from '../app/components/admin/DataSourcesManager';
import { AdminUsersManager } from '../app/components/admin/AdminUsersManager';
import { B2BClientManager } from '../app/components/admin/B2BClientManager';
import { EmailGatingManager } from '../app/components/admin/EmailGatingManager';
import { PDFReportsManager } from '../app/components/admin/PDFReportsManager';
import { BusinessMetrics } from '../app/components/admin/BusinessMetrics';
import { ScriptAIOverview } from '../app/components/admin/ScriptAIOverview';
import { ProductionIntelligence } from '../app/components/admin/ProductionIntelligence';

// Route Protection
import { ProtectedRoute } from '../app/components/common/ProtectedRoute';

// Test Pages
import { ScriptAnalysisTester } from '../app/pages/ScriptAnalysisTester';
import { PDFReportPreview } from '../app/pages/PDFReportPreview';
import { EmailPreview } from '../app/pages/EmailPreview';
import { APIConnectionTester } from '../app/pages/APIConnectionTester';
import { VerifyEmail } from '../app/pages/VerifyEmail';
import { EmailVerifyCallback } from '../app/pages/EmailVerifyCallback';
import { ResetPassword } from '../app/pages/ResetPassword';

// MUI Theme Configuration
const theme = createTheme({
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

// Wrapper component to prevent Figma data attributes from reaching ThemeProvider
function SafeThemeProvider({ children }: { children: React.ReactNode }) {
  // Use React.createElement to ensure no extra props are passed
  return React.createElement(ThemeProvider, { theme }, children);
}

function AppContent() {
  return (
    <HelmetProvider>
      <SafeThemeProvider>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          Components={{ default: Toast, error: Toast, success: Toast, info: Toast, warning: Toast }}
        >
          <AuthProvider>
            <ScriptProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<UserLogin />} />
                  <Route path="/signup" element={<UserSignup />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/auth/callback" element={<EmailVerifyCallback />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/upload" element={<ScriptUpload />} />
                  <Route path="/report/:reportId" element={<ReportViewer />} />
                  <Route path="/report/shared/:shareToken" element={<SharedReportViewer />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/sample" element={<SampleReport />} />
                  <Route path="/dashboard" element={<UserDashboard />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/acceptable-use" element={<AcceptableUse />} />
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
                    <Route path="crew-costs" element={<CrewCostsManager />} />
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

                  {/* Test/Preview Routes */}
                  <Route path="/test/script-analysis" element={<ScriptAnalysisTester />} />
                  <Route path="/test/pdf-preview" element={<PDFReportPreview />} />
                  <Route path="/test/email-preview" element={<EmailPreview />} />
                  <Route path="/test/api-connection" element={<APIConnectionTester />} />

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </ScriptProvider>
          </AuthProvider>
        </SnackbarProvider>
      </SafeThemeProvider>
    </HelmetProvider>
  );
}

export default function App(_props: any) {
  // Explicitly ignore all props to prevent Figma data attributes from being passed down
  return <AppContent />;
}