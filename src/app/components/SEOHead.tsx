import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  structuredData?: object;
}

export function SEOHead({
  title = 'Prodculator Film Tax Credit Calculator & Production Intelligence',
  description = 'Professional film production intelligence platform for US & UK producers. Get instant tax credit estimates, location recommendations, crew costs, and production budgets from your screenplay. Trusted by producers, investors, and film commissions.',
  keywords = [
    'film tax credits',
    'film production incentives',
    'film tax rebates',
    'screenplay analysis',
    'production budget calculator',
    'film location scouting',
    'crew cost estimator',
    'film financing tools',
    'state film tax credits',
    'UK film tax relief',
    'production tax incentives',
    'film commission tools',
    'script breakdown software',
    'independent film budgeting',
    'film production software',
    'California film tax credit',
    'Georgia film tax credit',
    'UK film tax relief calculator',
    'Canadian film tax credits',
    'production cost estimator',
  ],
  canonicalUrl,
  ogType = 'website',
  ogImage = 'https://prodculator.com/og-image.png',
  structuredData,
}: SEOHeadProps) {
  const fullTitle = title.includes('Prodculator') ? title : `${title} | Prodculator`;
  const siteUrl = 'https://prodculator.com';
  const canonical = canonicalUrl || siteUrl;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Prodculator" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content="Deo Media Limited" />
      
      {/* Geographic Targeting */}
      <meta name="geo.region" content="US;GB" />
      <meta name="geo.placename" content="United States;United Kingdom" />
      
      {/* Industry Specific */}
      <meta name="industry" content="Film Production, Entertainment, Media" />
      <meta name="audience" content="Film Producers, Investors, Production Companies" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
