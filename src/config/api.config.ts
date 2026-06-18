/**
 * API Configuration
 * Central configuration for all API endpoints and keys
 */

export const API_CONFIG = {
  // Stripe
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    prices: {
      proMonthlyUSD: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY_USD || '',
      proMonthlyGBP: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY_GBP || '',
      producerAnnualUSD: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_ANNUAL_USD || '',
      producerAnnualGBP: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_ANNUAL_GBP || '',
      studioUSD: import.meta.env.VITE_STRIPE_PRICE_STUDIO_USD || '',
      studioGBP: import.meta.env.VITE_STRIPE_PRICE_STUDIO_GBP || '',
    },
  },

  // Google Maps
  googleMaps: {
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    baseURL: 'https://maps.googleapis.com/maps/api',
  },

  // TMDB
  tmdb: {
    apiKey: import.meta.env.VITE_TMDB_API_KEY || '',
    baseURL: import.meta.env.TMDB_API_BASE_URL || 'https://api.themoviedb.org/3',
  },

  // Exchange Rate
  exchangeRate: {
    apiKey: import.meta.env.VITE_EXCHANGE_RATE_API_KEY || '',
    baseURL: import.meta.env.EXCHANGE_RATE_API_BASE_URL || 'https://api.exchangerate-api.com/v4',
  },

  // BLS (Bureau of Labor Statistics)
  bls: {
    apiKey: import.meta.env.BLS_API_KEY || '',
    baseURL: 'https://api.bls.gov/publicAPI/v2',
  },

  // Grantify
  grantify: {
    apiKey: import.meta.env.GRANTIFY_API_KEY || '',
    affiliateId: import.meta.env.GRANTIFY_AFFILIATE_ID || '',
  },

  // reCAPTCHA
  recaptcha: {
    siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
  },

  // Analytics
  analytics: {
    ga4MeasurementId: import.meta.env.VITE_GA4_MEASUREMENT_ID || '',
    mixpanelToken: import.meta.env.VITE_MIXPANEL_TOKEN || '',
  },

  // International Data Sources
  international: {
    ons: {
      apiKey: import.meta.env.ONS_API_KEY || '',
      baseURL: 'https://api.ons.gov.uk/v1',
    },
    statsCan: {
      apiKey: import.meta.env.STATCAN_API_KEY || '',
      baseURL: 'https://www150.statcan.gc.ca/t1/wds/rest',
    },
    abs: {
      apiKey: import.meta.env.ABS_API_KEY || '',
      baseURL: 'https://api.data.abs.gov.au',
    },
    statsNZ: {
      apiKey: import.meta.env.STATSNZ_API_KEY || '',
      baseURL: 'https://api.stats.govt.nz/v1',
    },
  },

  // Feature Flags
  features: {
    stripePayments: import.meta.env.VITE_ENABLE_STRIPE_PAYMENTS === 'true',
    pdfGeneration: import.meta.env.VITE_ENABLE_PDF_GENERATION === 'true',
    emailNotifications: import.meta.env.VITE_ENABLE_EMAIL_NOTIFICATIONS === 'true',
    grantifyIntegration: import.meta.env.VITE_ENABLE_GRANTIFY_INTEGRATION === 'true',
    festivalTracking: import.meta.env.VITE_ENABLE_FESTIVAL_TRACKING === 'true',
  },

  // App Configuration
  app: {
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    apiBaseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    environment: import.meta.env.NODE_ENV || 'development',
  },
};

/**
 * Get API status for admin dashboard
 */
export function getAPIStatus() {
  return {
    backend: { active: !!API_CONFIG.app.apiBaseURL, name: 'Prodculator Backend API' },
    aiAnalysis: { active: !!API_CONFIG.app.apiBaseURL, name: 'Backend AI Analysis' },
    googleMaps: { active: !!API_CONFIG.googleMaps.apiKey, name: 'Google Maps Platform' },
    tmdb: { active: !!API_CONFIG.tmdb.apiKey, name: 'TMDB API' },
    exchangeRate: { active: !!API_CONFIG.exchangeRate.apiKey, name: 'ExchangeRate API' },
    bls: { active: !!API_CONFIG.bls.apiKey || true, name: 'U.S. Bureau of Labor Statistics' },
    stripe: { active: !!API_CONFIG.stripe.publishableKey, name: 'Stripe' },
    grantify: { active: !!API_CONFIG.grantify.apiKey, name: 'Grantify' },
  };
}
